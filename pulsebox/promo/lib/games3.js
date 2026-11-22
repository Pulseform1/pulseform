/* Sixteen more Pulsebox games, redrawn in 2D from public/media/*-shot1.jpg. Each draws into 0..W, 0..H. */
const gk = W => W / 700;   // scale for sprites, so a game looks the same at any size
function paintWars(t, W, H) {
  let s = R(0, 0, W, H, 0, '#f3eee2', 0); const g = W / 12;
  for (let x = 0; x < W; x += g) for (let y = 0; y < H; y += g) if (((x + y) / g) % 2 < 1) s += R(x, y, g, g, 0, '#ebe4d4', 0);
  const teams = [['#ff4f6e', [[1, 1], [1, 3], [4, 3], [4, 6]]], ['#ffd84d', [[10, 1], [7, 1], [7, 4], [9, 4]]], ['#3ddc84', [[1, 10], [1, 13], [5, 13], [5, 9]]], ['#4fa3ff', [[10, 14], [10, 10], [7, 10], [7, 13]]]];
  const n = Math.floor(t * 9) + 6;
  teams.forEach(([c, pts]) => { const cells = []; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], st = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let k = 0; k < st; k++) cells.push([x0 + Math.sign(x1 - x0) * k, y0 + Math.sign(y1 - y0) * k]); }
    const vis = cells.slice(0, Math.min(cells.length, n)); vis.forEach(([x, y]) => { s += R(x * g, y * g * H / W * W / H, g, g, 4, c, 3); });
    const [hx, hy] = vis[vis.length - 1]; s += C(hx * g + g / 2, hy * g + g / 2, g * .62, c, 5) + C(hx * g + g * .35, hy * g + g * .42, g * .1, INK, 0) + C(hx * g + g * .65, hy * g + g * .42, g * .1, INK, 0) + P(`M${hx * g + g * .3} ${hy * g + g * .65} Q${hx * g + g / 2} ${hy * g + g * .82} ${hx * g + g * .7} ${hy * g + g * .65}`, 'none', 4); });
  s += R(W * .3, H * .015, W * .4, H * .05, 12, INK, 0) + T(W / 2, H * .052, `${1}:${String(12 - Math.floor(t) % 12).padStart(2, '0')}`, H * .035, '#fff', 'middle', 'Chakra');
  return s;
}
function seaBattle(t, W, H) {
  let s = R(0, 0, W, H, 0, '#0d2140', 0); const tall = H > W, gs = tall ? Math.min(W * .8, H * .4) : Math.min(W * .42, H * .75), c = gs / 8;
  const grids = tall ? [[W / 2 - gs / 2, H * .08], [W / 2 - gs / 2, H * .53]] : [[W * .05, H * .15], [W * .53, H * .15]];
  grids.forEach(([x, y], gi) => { s += R(x, y, gs, gs, 8, '#16386b', 6); for (let i = 1; i < 8; i++) s += L(x + i * c, y, x + i * c, y + gs, 2, '#2c5a9c') + L(x, y + i * c, x + gs, y + i * c, 2, '#2c5a9c');
    if (gi === 0) [[1, 1, 3, 0], [5, 2, 0, 3], [2, 5, 4, 0], [6, 6, 2, 0]].forEach(([a, b, dx, dy]) => { s += R(x + a * c + 4, y + b * c + 4, (dx || 1) * c - 8, (dy || 1) * c - 8, c / 2, '#9aa3b8', 5); });
    else { const shots = [[2, 3, 1], [5, 5, 0], [3, 3, 1], [6, 1, 0], [4, 3, 1], [1, 6, 0], [5, 3, 1]]; shots.slice(0, Math.floor(t * 2.5) % 8).forEach(([a, b, hit]) => {
      s += hit ? burst(x + a * c + c / 2, y + b * c + c / 2, c * .2, c * .45, 8, ORANGE, 0, 4) : C(x + a * c + c / 2, y + b * c + c / 2, c * .15, '#fff', 0); }); } });
  s += T(W / 2, tall ? H * .05 : H * .09, 'YOUR TURN: FIRE!', Math.min(W, H) * .055, '#ffd84d', 'middle', 'Chakra');
  return s;
}
function doodleGuess(t, W, H) {
  let s = R(0, 0, W, H, 0, '#f5f1e8', 0) + R(W * .06, H * .12, W * .88, H * .6, 10, '#fff', 6);
  const len = 1400, k = clamp((t % 4) / 2.6);
  s += G(`translate(${W / 2} ${H * .42}) scale(${Math.min(W, H) / 700})`, `<path d="M-120 60 C-160 -40 -60 -120 0 -60 C60 -120 160 -40 120 60 C80 130 -80 130 -120 60Z M-100 -60 L-120 -150 L-50 -95 M100 -60 L120 -150 L50 -95 M-40 0 L-38 4 M40 0 L42 4 M0 30 L-10 40 M0 30 L10 40 M-90 40 L-190 20 M-90 55 L-190 65 M90 40 L190 20 M90 55 L190 65" fill="none" stroke="#e0b100" stroke-width="12" stroke-linecap="round" stroke-dasharray="${len}" stroke-dashoffset="${len * (1 - k)}"/>`);
  s += T(W / 2, H * .08, '_ _ _', H * .05, INK, 'middle', 'Chakra');
  const chat = [['Ava', 'lamp?'], ['Ben', 'rocket'], ['You', 'CAT!']]; chat.slice(0, Math.floor((t % 4) * 1.2)).forEach(([n, m], i) => {
    s += R(W * .06, H * (.76 + i * .075), W * .6, H * .062, 12, i === 2 ? '#c6ff3d' : '#e8e2d4', 4) + T(W * .09, H * (.8 + i * .075), `${n}: ${m}`, H * .035, INK, 'start', 'Chakra'); });
  return s;
}
function comboCubes(t, W, H) {
  let s = R(0, 0, W, H, 0, '#1a1f5c', 0); const n = 8, bs = Math.min(W * .84, H * .6), c = bs / n, x0 = (W - bs) / 2, y0 = H * .18;
  s += R(x0 - 10, y0 - 10, bs + 20, bs + 20, 16, '#0f1240', 6);
  const r = rng(4), cols = ['#ff4f6e', '#ffd84d', '#ff8adf', '#ffb547', '#4fe3ff'], clearRow = 5, ph = (t * .7) % 1, flash = ph > .45 && ph < .7;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const on = y === clearRow ? ph < .7 : r() < (y > 4 ? .55 : .2);
    s += R(x0 + x * c + 3, y0 + y * c + 3, c - 6, c - 6, 6, on ? (y === clearRow && flash ? '#fff' : cols[(x + y * 3) % 5]) : '#232a6e', on ? 4 : 0); }
  if (ph > .5 && ph < .95) { const k = eBack(prog(ph, .5, .62)); s += G(`translate(${W / 2} ${y0 + clearRow * c}) scale(${k})`, TS(0, 0, 'GOOD!', Math.min(W, H) * .14, '#ffd84d', 10) + TS(0, Math.min(W, H) * .1, '+10', Math.min(W, H) * .07, '#fff', 8)); }
  s += TS(W / 2, H * .1, String(29 + Math.floor(t * .7) * 10), Math.min(W, H) * .1, '#fff', 8, 'Chakra');
  const py = y0 + bs + H * .06; s += R(W / 2 - c, py, c * .9, c * .9, 6, '#a78bfa', 5) + R(W / 2, py, c * .9, c * .9, 6, '#a78bfa', 5);
  return s;
}
function fruitFrenzy(t, W, H) {
  let s = R(0, 0, W, H, 0, '#9cc94a', 0); for (let x = 0; x < W; x += W / 9) s += R(x, 0, W / 18, H, 0, '#b4dc62', 0) + L(x, H * .3, x + W / 18, H * .3, 3, '#7aa83a') + L(x, H * .7, x + W / 18, H * .7, 3, '#7aa83a');
  const k = gk(W) * 1.3, fruits = [['#3ddc84', '#ff4f6e', 70], [ORANGE, '#ffd27a', 55], ['#e5484d', '#fff1d6', 50], ['#8a5cff', '#d9c2f0', 45]];
  fruits.forEach(([skin, flesh, r0], i) => { const ph = ((t * .55 + i * .27) % 1), x = W * (.2 + i * .2), y = H * .95 - Math.sin(ph * Math.PI) * H * .7, cut = ph > .5, rr = r0 * k;
    if (!cut) s += C(x, y, rr, skin, 6) + C(x - rr * .3, y - rr * .3, rr * .2, '#fff', 0, 'opacity=".5"');
    else { const sp = (ph - .5) * 300 * k; s += G(`translate(${x - sp} ${y}) rotate(${-sp})`, P(`M${-rr} 0 A${rr} ${rr} 0 0 1 ${rr} 0Z`, skin, 6) + P(`M${-rr * .8} 0 A${rr * .8} ${rr * .8} 0 0 1 ${rr * .8} 0Z`, flesh, 0)) +
      G(`translate(${x + sp} ${y + 10}) rotate(${sp + 180})`, P(`M${-rr} 0 A${rr} ${rr} 0 0 1 ${rr} 0Z`, skin, 6) + P(`M${-rr * .8} 0 A${rr * .8} ${rr * .8} 0 0 1 ${rr * .8} 0Z`, flesh, 0));
      for (let j = 0; j < 6; j++) s += C(x + Math.cos(j) * sp * 1.4, y + Math.sin(j * 2) * sp, 8 * k, flesh, 0, 'opacity=".8"'); } });
  const sl = (t * 1.1) % 1; if (sl < .35) s += P(`M${W * .1} ${H * .7} Q${W * .5} ${H * .4} ${W * (.1 + sl * 2.4)} ${H * (.7 - sl * .9)}`, 'none', 0, `stroke="#fff" stroke-width="${14 * k}" stroke-linecap="round" opacity=".9"`);
  s += TS(W / 2, H * .08, String(38 + Math.floor(t * 2)), Math.min(W, H) * .1, '#fff', 8, 'Chakra') + R(W * .78, H * .03, W * .18, H * .05, 10, '#ffd84d', 4) + T(W * .87, H * .066, 'FRENZY', H * .028, INK, 'middle', 'Chakra');
  return s;
}
function monster(x, y, k, col, lv) { return G(`translate(${x} ${y}) scale(${k})`, P('M-40 30 C-50 -30 -25 -50 0 -50 C25 -50 50 -30 40 30Z', col, 6) + P('M-22 -46 L-30 -70 L-10 -50 M22 -46 L30 -70 L10 -50', col, 5) + C(-14, -14, 10, '#fff', 4) + C(14, -14, 10, '#fff', 4) + C(-12, -12, 4, INK, 0) + C(16, -12, 4, INK, 0) + P('M-12 8 Q0 18 12 8', 'none', 5) + (lv ? T(0, 52, 'LV ' + lv, 22, '#fff', 'middle', 'Chakra', `stroke="${INK}" stroke-width="5" paint-order="stroke"`) : '')); }
function mergeMonsters(t, W, H) {
  let s = R(0, 0, W, H, 0, '#2b1f5c', 0); const n = 4, c = Math.min(W * .86, H * .55) / n, x0 = (W - c * n) / 2, y0 = H * .2, k = c / 120;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) s += R(x0 + x * c + 5, y0 + y * c + 5, c - 10, c - 10, 14, '#4caf50', 5);
  const cols = ['#ff8a3d', '#4fa3ff', '#ffd84d', '#ff4fa3', '#3ddc84'];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if ((x + y) % 3 !== 0 && !(y === 1 && (x === 1 || x === 2))) s += monster(x0 + x * c + c / 2, y0 + y * c + c / 2 + 8 * k, k * .9, cols[(x * 2 + y) % 5], 1 + (x + y) % 3);
  const ph = (t * .6) % 1, a = eIO(clamp(ph / .5)), cx = x0 + 1.5 * c + c / 2 - c / 2, cy = y0 + 1 * c + c / 2;
  if (ph < .5) s += monster(lerp(x0 + c * 1.5, cx, a), cy, k * .9, '#4fa3ff', 2) + monster(lerp(x0 + c * 2.5, cx + c, a) - a * c, cy, k * .9, '#4fa3ff', 2);
  else { const kk = eBack(prog(ph, .5, .65)); s += rays(cx + c / 2 - c / 2, cy, 12, c * 1.2, '#ffd84d', .3 * (1 - prog(ph, .7, 1)), t) + monster(cx, cy, k * 1.25 * kk, '#8a5cff', 3); }
  s += R(W * .05, H * .04, W * .4, H * .06, 14, '#1b1340', 0) + T(W * .25, H * .083, '18.4K', H * .035, '#ffd84d', 'middle', 'Chakra');
  return s;
}
function hueHop(t, W, H) {
  let s = R(0, 0, W, H, 0, '#1a1530', 0) + stars(W, H, 20, 61, t); const cols = ['#ffd84d', '#ff4fa3', '#4fe3ff', '#8a5cff'];
  const ring = (cy, r, rot) => { let g = ''; for (let i = 0; i < 4; i++) { const a0 = rot + i * Math.PI / 2, a1 = a0 + Math.PI / 2 - .06;
    g += `<path d="M${W / 2 + Math.cos(a0) * r} ${cy + Math.sin(a0) * r} A${r} ${r} 0 0 1 ${W / 2 + Math.cos(a1) * r} ${cy + Math.sin(a1) * r}" fill="none" stroke="${cols[i]}" stroke-width="${r * .18}" stroke-linecap="round"/>`; } return g; };
  const r = Math.min(W, H) * .22, scroll = (t * 120) % (H * .45);
  for (let j = -1; j < 3; j++) s += ring(H * .2 + j * H * .45 + scroll, r, t * (j % 2 ? -1.3 : 1.3));
  const by = H * .72 - Math.abs(Math.sin(t * 4.5)) * H * .12; s += C(W / 2, by, r * .12, cols[Math.floor(t * .7) % 4], 5);
  s += G(`translate(${W / 2} ${H * .2 + scroll - H * .45 + r * 0})`, P('M0 -20 L6 -6 L20 -6 L9 3 L13 18 L0 9 L-13 18 L-9 3 L-20 -6 L-6 -6Z', '#fff', 0));
  return s;
}
function chaosClimb(t, W, H) {
  let s = R(0, 0, W, H, 0, '#f6f1e4', 0); const g = W / 20; for (let x = 0; x < W; x += g) s += L(x, 0, x, H, 1, '#e1d8c3'); for (let y = 0; y < H; y += g) s += L(0, y, W, y, 1, '#e1d8c3');
  const blk = (x, y, w, h) => R(x, y, w, h, 4, '#f6a54a', 6) + `<clipPath id="cc${Math.round(x)}${Math.round(y)}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath><g clip-path="url(#cc${Math.round(x)}${Math.round(y)})">` + Array.from({ length: 20 }, (_, i) => L(x + i * 24 - h, y + h, x + i * 24, y, 3, '#e08a2e')).join('') + '</g>';
  s += blk(0, H * .72, W * .35, H * .3) + blk(W * .5, H * .58, W * .5, H * .45) + blk(W * .6, 0, W * .4, H * .25) + blk(W * .25, H * .45, W * .14, H * .04);
  for (let i = 0; i < W * .15; i += 20) s += P(`M${W * .35 + i} ${H} L${W * .35 + i + 10} ${H * .96} L${W * .35 + i + 20} ${H}Z`, '#9aa3b8', 4);
  const saw = (x, y, r) => G(`translate(${x} ${y}) rotate(${t * 400})`, burst(0, 0, r * .75, r, 10, '#c8ccd8', 0, 4) + C(0, 0, r * .25, '#6b7080', 4));
  const k = gk(W); s += saw(W * .22, H * .3, 40 * k * 1.4) + saw(W * .45, H * .62, 34 * k * 1.4) + saw(W * .8, H * .4, 30 * k * 1.4);
  const ph = (t * .5) % 1, px = lerp(W * .1, W * .45, ph), py = H * .72 - Math.sin(ph * Math.PI) * H * .3 - 30 * k;
  s += G(`translate(${px} ${py}) scale(${k * 1.4})`, C(0, 0, 26, '#4fa3ff', 6) + C(-8, -6, 5, INK, 0) + C(8, -6, 5, INK, 0) + L(0, -26, 0, -42, 5) + C(0, -46, 6, '#ff4f6e', 4));
  s += R(W * .04, H * .03, W * .2, H * .05, 12, '#fff', 5) + T(W * .14, H * .065, (5.08 + t).toFixed(2), H * .03, INK, 'middle', 'Chakra');
  return s;
}
function tank(x, y, a, col, k) { return G(`translate(${x} ${y}) rotate(${a}) scale(${k})`, R(-30, -24, 60, 48, 8, col, 5) + R(-34, -28, 68, 10, 4, '#555', 4) + R(-34, 18, 68, 10, 4, '#555', 4) + C(0, 0, 14, col, 5) + R(0, -5, 40, 10, 3, '#333', 4)); }
function tankTrouble(t, W, H) {
  let s = R(0, 0, W, H, 0, '#e8f2f8', 0); const k = gk(W) * 1.2;
  const walls = [[.1, .12, .8, 0], [.1, .12, 0, .76], [.9, .12, 0, .76], [.1, .88, .8, 0], [.3, .12, 0, .3], [.3, .6, .25, 0], [.55, .3, 0, .3], [.7, .12, 0, .18], [.75, .6, 0, .28], [.3, .75, 0, .13]];
  walls.forEach(([x, y, w, h]) => { s += L(x * W, y * H, (x + w) * W, (y + h) * H, 22 * k, INK) + L(x * W, y * H, (x + w) * W, (y + h) * H, 12 * k, '#fff'); });
  for (let i = 0; i < 6; i++) s += R(W * (.2 + (i * 37 % 60) / 100), H * (.2 + (i * 53 % 60) / 100), 30 * k, 30 * k, 4, '#9fd3ff', 4);
  s += tank(W * .2, H * .25, 30, '#5aa04a', k) + tank(W * .8, H * .78, 200, '#3a6fd8', k);
  const path = [[W * .24, H * .28], [W * .52, H * .55], [W * .3, H * .78], [W * .21, H * .3]], ph = (t * .6) % 1, seg = Math.min(2, Math.floor(ph * 3)), sk = ph * 3 - seg;
  s += P('M' + path.slice(0, seg + 2).map((p, i) => i === seg + 1 ? [lerp(path[seg][0], p[0], sk), lerp(path[seg][1], p[1], sk)] : p).map(p => p.join(' ')).join(' L'), 'none', 0, `stroke="#e5484d" stroke-width="4" stroke-dasharray="10 10" opacity=".7"`);
  const bp = [lerp(path[seg][0], path[seg + 1][0], sk), lerp(path[seg][1], path[seg + 1][1], sk)]; s += C(bp[0], bp[1], 9 * k, INK, 0);
  if (ph > .93) s += burst(W * .21, H * .3, 30 * k, 70 * k, 10, ORANGE, t, 5);
  s += R(W * .3, H * .02, W * .4, H * .06, 10, INK, 0) + T(W / 2, H * .062, 'ROUND 1', H * .032, '#fff', 'middle', 'Chakra');
  return s;
}
function penaltyShootout(t, W, H) {
  let s = R(0, 0, W, H, 0, '#2b3448', 0); const r = rng(8); for (let i = 0; i < 220; i++) s += C(r() * W, r() * H * .38, 5, ['#ff8a8a', '#ffd84d', '#fff', '#8fd3ff'][i % 4], 0, 'opacity=".75"');
  s += R(0, H * .38, W, H * .06, 0, '#4a3aa8', 0) + T(W / 2, H * .423, 'FLOP HOOPS   CLUCK LAUNCH   STRATA   DEAD AIR', H * .025, '#fff', 'middle', 'Chakra');
  for (let i = 0; i < 8; i++) s += R(0, H * (.44 + i * .07), W, H * .07, 0, i % 2 ? '#3f9a3a' : '#48a843', 0);
  const gx = W * .18, gy = H * .48, gw = W * .64, gh = H * .17;
  for (let i = 0; i < 12; i++) s += L(gx + i * gw / 11, gy, gx + i * gw / 11, gy + gh, 2, '#fff', 'opacity=".4"'); for (let i = 0; i < 5; i++) s += L(gx, gy + i * gh / 4, gx + gw, gy + i * gh / 4, 2, '#fff', 'opacity=".4"');
  s += P(`M${gx} ${gy + gh} L${gx} ${gy} L${gx + gw} ${gy} L${gx + gw} ${gy + gh}`, 'none', 0, `stroke="${INK}" stroke-width="16"`) + P(`M${gx} ${gy + gh} L${gx} ${gy} L${gx + gw} ${gy} L${gx + gw} ${gy + gh}`, 'none', 0, `stroke="#fff" stroke-width="9"`);
  const ph = (t * .55) % 1, dive = eOut(clamp((ph - .3) / .3)), dir = Math.floor(t * .55) % 2 ? 1 : -1, k = gk(W) * 1.3;
  s += G(`translate(${W / 2 + dir * dive * gw * .3} ${gy + gh * .6}) rotate(${dir * dive * 70}) scale(${k})`, R(-22, -30, 44, 60, 10, '#ffd84d', 5) + C(0, -46, 18, SKIN, 5) + P('M-22 -20 L-60 -50 M22 -20 L60 -50', 'none', 0, `stroke="${INK}" stroke-width="14" stroke-linecap="round"`) + R(-16, 28, 12, 34, 5, INK, 0) + R(4, 28, 12, 34, 5, INK, 0));
  const bx = lerp(W / 2, W / 2 + dir * gw * .35, eOut(clamp((ph - .25) / .35))), by = lerp(H * .9, gy + gh * .35, eOut(clamp((ph - .25) / .35))), bk = lerp(1.6, .7, clamp((ph - .25) / .35));
  s += C(bx, by, 24 * k * bk, '#fff', 5) + P(`M${bx - 8 * k * bk} ${by - 6 * k * bk} L${bx + 6 * k * bk} ${by - 9 * k * bk} L${bx + 4 * k * bk} ${by + 8 * k * bk}Z`, INK, 0);
  s += R(W * .04, H * .02, W * .5, H * .05, 8, INK, 0) + T(W * .06, H * .055, 'ROUND OF 16', H * .03, '#fff', 'start', 'Chakra');
  return s;
}
function chicken(k, t) { return G(`scale(${k})`, E(0, 0, 40, 32, '#fff', 6) + C(28, -26, 20, '#fff', 6) + P('M44 -26 L60 -20 L44 -16Z', ORANGE, 4) + C(32, -30, 4, INK, 0) + P('M22 -46 Q28 -60 34 -46 Q40 -58 42 -44', '#e5484d', 4) +
  R(-50, -10, 30, 34, 8, '#9aa3b8', 5) + P(`M-48 24 L-36 ${48 + Math.sin(t * 40) * 10} L-24 24Z`, ORANGE, 4) + P('M-6 -6 Q-30 -30 -20 6', 'none', 5)); }
function cluckLaunch(t, W, H) {
  let s = `<defs><linearGradient id="clsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a6fe0"/><stop offset="1" stop-color="#ffb3c7"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#clsky)"/>`;
  for (let i = 0; i < 5; i++) { const y = ((i * H * .25 + t * 260) % (H * 1.25)) - H * .15, x = W * ((i * 37 % 10) / 10); s += E(x, y, W * .14, H * .035, '#fff', 0, 'opacity=".85"') + E(x + W * .06, y - H * .02, W * .08, H * .03, '#fff', 0, 'opacity=".85"'); }
  for (let i = 0; i < 4; i++) { const y = ((i * H * .3 + t * 300) % (H * 1.2)) - H * .1; s += C(W * (.2 + i * .2), y, 16 * gk(W), '#ffd84d', 5); }
  const k = gk(W) * 1.6, cx = W * .55 + Math.sin(t * 2) * W * .05, cy = H * .5;
  s += P(`M${cx - 40 * k} ${cy + 40 * k} Q${cx - 60 * k} ${H * .75} ${cx - 120 * k} ${H}`, 'none', 0, `stroke="#fff" stroke-width="${36 * k}" stroke-linecap="round" opacity=".6"`);
  s += G(`translate(${cx} ${cy}) rotate(-50)`, chicken(k, t));
  s += R(W * .04, H * .02, W * .28, H * .07, 12, 'rgba(20,10,40,.6)', 0) + T(W * .18, H * .068, `${320 + Math.floor(t * 140)} m`, H * .04, '#fff', 'middle', 'Chakra');
  s += R(W * .25, H * .93, W * .5, H * .025, 8, '#fff', 4) + R(W * .25, H * .93, W * .5 * (1 - (t * .15) % 1), H * .025, 8, ORANGE, 0) + T(W * .2, H * .952, 'FUEL', H * .022, '#fff', 'end', 'Chakra');
  return s;
}
function pizzaEmpire(t, W, H) {
  let s = R(0, 0, W, H, 0, '#8fd3ff', 0) + C(W * .85, H * .1, W * .1, '#ffe14d', 6) + R(0, H * .8, W, H * .2, 0, '#7cc24a', 6);
  const k = gk(W) * 1.5, pz = G(`translate(${W / 2} ${H * .45}) rotate(${t * 40}) scale(${k})`, C(0, 0, 150, '#e8a94a', 7) + C(0, 0, 130, '#e5484d', 0) + C(0, 0, 130, '#ffd27a', 0, 'opacity=".55"') +
    Array.from({ length: 8 }, (_, i) => C(Math.cos(i * .8) * (40 + i * 9), Math.sin(i * .8) * (40 + i * 9), 18, '#b3262d', 4)).join('') + Array.from({ length: 4 }, (_, i) => L(-150 * Math.cos(i * Math.PI / 4), -150 * Math.sin(i * Math.PI / 4), 150 * Math.cos(i * Math.PI / 4), 150 * Math.sin(i * Math.PI / 4), 3, '#b5813f')).join(''));
  s += pz;
  for (let i = 0; i < 4; i++) { const ph = (t * .8 + i * .25) % 1; s += TS(W / 2 + (i - 1.5) * W * .15, H * .4 - ph * H * .2, '+100K', W * .06, '#ffd84d', 6, 'Chakra', `opacity="${1 - ph}"`); }
  s += G(`translate(${W * .18} ${H * .8}) scale(${k * .8})`, R(-70, -110, 140, 110, 6, '#fff3e0', 6) + P('M-80 -110 L0 -170 L80 -110Z', '#e5484d', 6) + R(-20, -50, 40, 50, 4, '#8a5a2b', 5) + T(0, -70, 'PIZZA', 22, '#e5484d', 'middle', 'Chakra'));
  s += R(W * .25, H * .02, W * .5, H * .07, 16, 'rgba(0,0,0,.35)', 0) + C(W * .3, H * .055, H * .025, '#ffd84d', 4) + T(W * .55, H * .07, (3.42 + t * .05).toFixed(2) + ' B', H * .045, '#fff', 'middle', 'Chakra');
  return s;
}
function tinyTee(t, W, H) {
  let s = R(0, 0, W, H, 0, '#1f5a2c', 0); const k = gk(W);
    s += `<path d="M${W * .15} ${H * .9} L${W * .15} ${H * .52} L${W * .55} ${H * .52} L${W * .55} ${H * .1} L${W * .9} ${H * .1} L${W * .9} ${H * .9}Z" fill="#b5813f" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`;
  s += `<path d="M${W * .19} ${H * .86} L${W * .19} ${H * .56} L${W * .59} ${H * .56} L${W * .59} ${H * .14} L${W * .86} ${H * .14} L${W * .86} ${H * .86}Z" fill="#58c26b"/>`;
  s += `<clipPath id="ttc"><path d="M${W * .19} ${H * .86} L${W * .19} ${H * .56} L${W * .59} ${H * .56} L${W * .59} ${H * .14} L${W * .86} ${H * .14} L${W * .86} ${H * .86}Z"/></clipPath><g clip-path="url(#ttc)">` +
    Array.from({ length: 9 }, (_, i) => R(W * .19 + i * W * .075, H * .14, W * .035, H * .72, 0, '#4fb562', 0, 'opacity=".6"')).join('') + '</g>';
  const hx = W * .72, hy = H * .25; s += E(hx, hy, 20 * k, 12 * k, INK, 0) + L(hx, hy, hx, hy - 90 * k, 5) + P(`M${hx} ${hy - 90 * k} L${hx + 50 * k} ${hy - 75 * k} L${hx} ${hy - 60 * k}Z`, '#ff4f6e', 4);
  const pts = [[W * .3, H * .75], [W * .78, H * .72], [W * .76, H * .4], [hx, hy]], ph = (t * .4) % 1, seg = Math.min(2, Math.floor(ph * 3)), sk = eOut(ph * 3 - seg);
  const bx = lerp(pts[seg][0], pts[seg + 1][0], sk), by = lerp(pts[seg][1], pts[seg + 1][1], sk); if (ph < .98) s += C(bx, by, 12 * k, '#fff', 5);
  s += T(W / 2, H * .06, String(150), H * .05, '#fff', 'middle', 'Chakra') + T(W / 2, H * .96, 'HOLE 2/12  ·  PAR 3', H * .028, '#cfe9c8', 'middle', 'Chakra');
  return s;
}
function baggagePanic(t, W, H) {
  let s = R(0, 0, W, H, 0, '#2f3b38', 0); const n = 7, c = Math.min(W * .8, H * .5) / n, x0 = (W - c * n) / 2, y0 = H * .14;
  s += R(x0 - 26, y0 - 26, c * n + 52, c * n + 52, 30, '#8a5a2b', 8) + R(x0 - 8, y0 - 8, c * n + 16, c * n + 16, 14, '#3a2a1e', 5) + R(x0 + c * 2.5, y0 - 60, c * 2, 40, 14, 'none', 0, `stroke="${INK}" stroke-width="18"`);
  const blocked = new Set(['0,0', '6,0', '0,6', '6,6', '3,3']);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const b = blocked.has(x + ',' + y); s += R(x0 + x * c + 3, y0 + y * c + 3, c - 6, c - 6, 5, b ? '#2a201a' : '#1c1916', 0) + (b ? L(x0 + x * c + 10, y0 + y * c + 10, x0 + x * c + c - 10, y0 + y * c + c - 10, 4, '#5a4636') + L(x0 + x * c + c - 10, y0 + y * c + 10, x0 + x * c + 10, y0 + y * c + c - 10, 4, '#5a4636') : ''); }
  const items = [[1, 1, 3, 1, '#4fa3ff', 'BOOK'], [4, 1, 2, 2, '#ff8adf', 'TOY'], [1, 2, 2, 2, '#ffd84d', 'CAM'], [1, 4, 1, 2, '#3ddc84', ''], [3, 4, 3, 1, '#ffb547', 'BOOTS'], [2, 5, 4, 1, '#c9b0f2', 'UMBRELLA']];
  const nPlaced = Math.floor(t * 1.4) % (items.length + 2);
  items.forEach(([x, y, w, h, col, lab], i) => { if (i > nPlaced) return; const drop = i === nPlaced ? 1 - eOut((t * 1.4) % 1) : 0;
    s += R(x0 + x * c + 4, y0 + (y - drop * 3) * c + 4, w * c - 8, h * c - 8, 10, col, 5, `opacity="${i === nPlaced ? .9 : 1}"`) + (lab ? T(x0 + (x + w / 2) * c, y0 + (y - drop * 3 + h / 2) * c + 8, lab, c * .24, INK, 'middle', 'Chakra') : ''); });
  s += R(W * .1, H * .72, W * .8, H * .2, 18, '#22302c', 5) + T(W / 2, H * .79, 'SUITCASE 9  ·  8x7', H * .03, '#cfe', 'middle', 'Chakra') + T(W / 2, H * .86, `${Math.min(nPlaced + 1, 6)}/6 PACKED`, H * .045, LIME, 'middle', 'Chakra');
  return s;
}
function stickman(x, y, k, col, pose, t, dir = 1) {
  const kick = pose === 'kick', a = Math.sin(t * 10) * 10;
  return G(`translate(${x} ${y}) scale(${k * dir} ${k})`, C(0, -120, 22, col, 6) + L(0, -98, 0, -30, 12, col) + L(0, -80, kick ? 50 : 30, kick ? -110 : -50 + a, 10, col) + L(0, -80, -30, -50 - a, 10, col) +
    L(0, -30, kick ? 80 : 25, kick ? -50 : 30, 10, col) + L(0, -30, -25, 30, 10, col) + C(-7, -124, 4, '#fff', 0) + C(7, -124, 4, '#fff', 0)); }
function stickBrawl(t, W, H) {
  let s = R(0, 0, W, H, 0, '#bfe0f5', 0);
  s += P(`M0 ${H * .6} L${W * .2} ${H * .25} L${W * .4} ${H * .55} L${W * .6} ${H * .2} L${W * .85} ${H * .5} L${W} ${H * .35} L${W} ${H * .7} L0 ${H * .7}Z`, '#8fb6d6', 6);
  s += P(`M${W * .2} ${H * .25} L${W * .25} ${H * .33} L${W * .15} ${H * .32}Z M${W * .6} ${H * .2} L${W * .66} ${H * .29} L${W * .54} ${H * .28}Z`, '#fff', 0);
  for (let i = 0; i < 6; i++) { const x = W * (.05 + i * .18), y = H * .76; s += P(`M${x} ${y - 90} L${x + 40} ${y} L${x - 40} ${y}Z`, '#2f6b4a', 5) + R(x - 6, y, 12, 20, 2, '#5c3820', 4); }
  s += R(0, H * .8, W, H * .2, 0, '#f4f8ff', 6);
  const k = gk(W) * 1.6, ph = (t * 1.2) % 2, kick = ph % 1 < .3;
  s += stickman(W * .38 + Math.sin(t * 3) * 10, H * .82, k, '#e5484d', kick && ph < 1 ? 'kick' : '', t) + stickman(W * .62, H * .82, k, '#2fae5a', kick && ph >= 1 ? 'kick' : '', t + 1, -1);
  if (kick) s += burst(W / 2, H * .7, 20 * k, 40 * k, 8, '#ffd84d', t * 9, 4);
  s += R(W * .04, H * .03, W * .38, H * .03, 8, '#fff', 4) + R(W * .04, H * .03, W * .38 * (.9 - (t * .05) % .5), H * .03, 8, '#3ddc84', 0) + R(W * .58, H * .03, W * .38, H * .03, 8, '#fff', 4) + R(W * .58, H * .03, W * .38 * (.8 - (t * .07) % .5), H * .03, 8, '#3ddc84', 0);
  s += T(W * .04, H * .09, 'PLAYER 1', H * .028, INK, 'start', 'Chakra') + T(W * .96, H * .09, 'PLAYER 2', H * .028, INK, 'end', 'Chakra');
  return s;
}
function cardboardCarWars(t, W, H) {
  let s = R(0, 0, W, H, 0, '#b59a78', 0) + R(0, 0, W, H * .55, 0, '#8f7a63', 0);
  for (let i = 0; i < 6; i++) s += L(W * (.1 + i * .15), H * .08, W * (.1 + i * .15), H * .25, 8, '#5a4a3a') + R(W * (.08 + i * .15), H * .2, W * .04, H * .07, 4, ['#e5484d', '#ffd84d', '#4fa3ff'][i % 3], 4);
  s += R(0, H * .55, W, H * .45, 0, '#9a9a9a', 6) + R(W * .55, H * .32, W * .3, H * .25, 6, '#c49a5c', 6) + T(W * .7, H * .46, 'FRAGILE', H * .03, '#b3262d', 'middle', 'Chakra');
  const k = gk(W) * 1.4, cx = W * .3, cy = H * .72;
  s += G(`translate(${cx} ${cy}) scale(${k})`, R(-90, -60, 180, 90, 6, '#c49a5c', 6) + L(-90, -20, 90, -20, 3, '#8a6a3c') + R(-20, -100, 70, 40, 6, '#c49a5c', 6) + R(40, -92, 80, 16, 5, '#555', 5) + C(-55, 35, 28, '#333', 6) + C(55, 35, 28, '#333', 6) + C(-55, 35, 10, '#999', 0) + C(55, 35, 10, '#999', 0) + T(0, 0, 'BOX', 26, '#8a6a3c', 'middle', 'Chakra'));
  for (let i = 0; i < 4; i++) { const ex = W * (.95 - ((t * .12 + i * .25) % 1) * .5), ey = cy + 10 * k; s += G(`translate(${ex} ${ey}) scale(${k})`, C(0, 0, 36, '#b8bcc6', 6) + C(0, 0, 14, '#8a8f9c', 4) + C(-10, -8, 5, INK, 0) + C(10, -8, 5, INK, 0) + P('M-10 14 L10 10', 'none', 4)); }
  const sh = (t * 3) % 1; s += C(lerp(cx + 120 * k, W * .9, sh), cy - 84 * k, 7 * k, '#ffd84d', 4);
  s += R(W * .04, H * .03, W * .5, H * .06, 10, 'rgba(0,0,0,.45)', 0) + T(W * .06, H * .07, 'WAVE 5/10', H * .035, '#fff', 'start', 'Chakra');
  return s;
}
Object.assign(GAMES, { 'paint-wars': ['Paint Wars', paintWars], 'sea-battle': ['Sea Battle', seaBattle], 'doodle-guess': ['Doodle Guess', doodleGuess], 'combo-cubes': ['Combo Cubes', comboCubes],
  'fruit-frenzy': ['Fruit Frenzy', fruitFrenzy], 'merge-monsters': ['Merge Monsters', mergeMonsters], 'hue-hop': ['Hue Hop', hueHop], 'chaos-climb': ['Chaos Climb', chaosClimb],
  'tank-trouble': ['Tank Trouble', tankTrouble], 'penalty-shootout': ['Penalty Shootout', penaltyShootout], 'cluck-launch': ['Cluck Launch', cluckLaunch], 'pizza-empire': ['Pizza Empire', pizzaEmpire],
  'tiny-tee': ['Tiny Tee', tinyTee], 'baggage-panic': ['Baggage Panic', baggagePanic], 'stick-brawl': ['Stick Brawl Arena', stickBrawl], 'cardboard-car-wars': ['Cardboard Car Wars', cardboardCarWars] });
