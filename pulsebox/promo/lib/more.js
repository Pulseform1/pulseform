/* More Pulsebox games, redrawn in 2D from their real screenshots (public/media/*-shot1.jpg). Each draws into 0..W, 0..H. */
function spaceColony(t, W, H) {
  let s = `<rect width="${W}" height="${H}" fill="#2a120e"/>` + stars(W, H * .3, 30, 31, t);
  s += P(`M0 ${H * .3} Q${W * .5} ${H * .26} ${W} ${H * .31} L${W} ${H} L0 ${H}Z`, '#c4552f', 6);
  const r = rng(12); for (let i = 0; i < 14; i++) s += E(r() * W, H * .35 + r() * H * .6, 20 + r() * 40, 8 + r() * 14, '#a8442a', 0);
  const dome = (x, y, k) => P(`M${x - 70 * k} ${y} A${70 * k} ${70 * k} 0 0 1 ${x + 70 * k} ${y}Z`, '#bfe9ff', 6, 'fill-opacity=".85"') + P(`M${x - 40 * k} ${y - 30 * k} Q${x - 30 * k} ${y - 52 * k} ${x - 5 * k} ${y - 60 * k}`, 'none', 0, `stroke="#fff" stroke-width="${8 * k}" stroke-linecap="round"`) + R(x - 74 * k, y - 4, 148 * k, 14 * k, 4, '#8a93a8', 5);
  const panel = (x, y, k) => L(x, y, x, y - 40 * k, 6) + G(`translate(${x} ${y - 40 * k}) rotate(-18)`, R(-45 * k, -18 * k, 90 * k, 36 * k, 4, '#2f5fd6', 5) + L(-45 * k, 0, 45 * k, 0, 3, '#9fc1ff') + L(0, -18 * k, 0, 18 * k, 3, '#9fc1ff'));
  const k = W / 700;
  s += dome(W * .3, H * .55, 1.3 * k) + dome(W * .62, H * .5, 1.0 * k) + dome(W * .5, H * .72, 1.5 * k) + dome(W * .82, H * .68, .9 * k);
  s += panel(W * .12, H * .48, k) + panel(W * .2, H * .62, k) + panel(W * .75, H * .42, k) + panel(W * .9, H * .55, k) + panel(W * .14, H * .82, k);
  // rocket lifting off now and then
  const lift = ((t * .25) % 1), ry = H * .42 - eIn(lift) * H * .5;
  s += G(`translate(${W * .86} ${ry}) scale(${k})`, P('M0 -80 C25 -55 25 0 22 30 L-22 30 C-25 0 -25 -55 0 -80Z', '#eef1ff', 6) + C(0, -30, 10, '#4fa3ff', 4) + P('M-22 10 L-40 40 L-22 30Z M22 10 L40 40 L22 30Z', '#e5484d', 5) +
    (lift > .05 ? P(`M-14 32 L0 ${70 + Math.sin(t * 40) * 12} L14 32Z`, ORANGE, 4) : ''));
  for (let i = 0; i < 4; i++) { const x = (W * (.2 + i * .2) + Math.sin(t + i) * 30), y = H * (.6 + (i % 2) * .15);
    s += G(`translate(${x} ${y}) scale(${k})`, R(-12, -10, 24, 30, 8, '#fff', 4) + C(0, -20, 14, '#fff', 4) + R(-8, -26, 16, 10, 4, ORANGE, 0)); }
  s += R(0, 0, W, H * .07, 0, 'rgba(10,6,6,.85)', 0);
  [['OXYGEN', 70], ['FOOD', 54], ['WATER', 77], ['PEOPLE', 9]].forEach(([n, v], i) => { s += T(W * (.13 + i * .25), H * .028, n, H * .018, '#9aa0b8', 'middle', 'Chakra') + T(W * (.13 + i * .25), H * .058, String(v), H * .03, '#fff', 'middle', 'Chakra'); });
  return s;
}
function hyperlane(t, W, H) {
  const hz = H * .42;
  let s = `<defs><linearGradient id="hlsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0b3a"/><stop offset="1" stop-color="#ff4fa3"/></linearGradient></defs>`;
  s += `<rect width="${W}" height="${hz}" fill="url(#hlsky)"/>` + stars(W, hz * .6, 30, 41, t);
  const sr = W * .26; s += `<clipPath id="sunc"><rect x="0" y="0" width="${W}" height="${hz}"/></clipPath><g clip-path="url(#sunc)">` + C(W / 2, hz, sr, '#ffcf5a', 0);
  for (let i = 0; i < 6; i++) s += R(W / 2 - sr, hz - sr * .15 - i * sr * .14, sr * 2, 6 + i * 2, 0, '#ff4fa3', 0); s += '</g>';
  for (let i = 0; i < 9; i++) { const bx = (i * W / 8.5), bh = hz * (.15 + (i * 37 % 10) / 30); if (Math.abs(bx - W / 2) < W * .22) continue;
    s += R(bx, hz - bh, W * .09, bh, 0, '#1b0f3d', 0); for (let j = 0; j < 4; j++) s += R(bx + 6, hz - bh + 10 + j * 22, 8, 8, 0, (i + j) % 3 ? '#4fe3ff' : '#ff4fa3', 0, 'opacity=".8"'); }
  s += R(0, hz, W, H - hz, 0, '#120626', 0);
  for (let i = 0; i < 14; i++) { const z = ((i / 14) + t * .9) % 1, y = hz + Math.pow(z, 2.2) * (H - hz); s += L(0, y, W, y, 2 + z * 4, '#ff4fa3', `opacity="${.25 + z * .6}"`); }
  for (let i = -8; i <= 8; i++) s += L(W / 2 + i * W * .02, hz, W / 2 + i * W * .35, H, 3, '#4fe3ff', 'opacity=".45"');
  s += P(`M${W * .45} ${hz} L${W * .55} ${hz} L${W * .95} ${H} L${W * .05} ${H}Z`, '#0b0618', 0) + P(`M${W * .45} ${hz} L${W * .05} ${H} M${W * .55} ${hz} L${W * .95} ${H}`, 'none', 0, `stroke="#4fe3ff" stroke-width="7"`);
  for (let i = 0; i < 6; i++) { const z = ((i / 6) + t * 1.4) % 1, y = hz + Math.pow(z, 2) * (H - hz), w = 4 + z * 14; s += R(W / 2 - w / 2, y, w, 12 + z * 60, 2, '#fff', 0, `opacity="${.3 + z * .6}"`); }
  const sway = Math.sin(t * 2.2) * W * .04, k = W / 560;
  s += G(`translate(${W / 2 + sway} ${H * .78}) scale(${k})`, P('M-110 40 L-90 -20 L-50 -45 L50 -45 L90 -20 L110 40 Z', '#dfe4ff', 7) + R(-60, -40, 120, 28, 8, '#3a3f6b', 5) + R(-100, 10, 50, 16, 6, '#ff2d55', 4) + R(50, 10, 50, 16, 6, '#ff2d55', 4) + R(-112, 38, 50, 28, 8, INK, 0) + R(62, 38, 50, 28, 8, INK, 0) +
    E(-75, 18, 40, 12, '#ff2d55', 0, 'opacity=".35"') + E(75, 18, 40, 12, '#ff2d55', 0, 'opacity=".35"'));
  s += G(`translate(${W / 2} ${H * .92})`, C(0, 0, W * .09, '#16112e', 6) + T(0, W * .025, '350', W * .07, '#fff', 'middle', 'Chakra'));
  if (Math.sin(t * 7) > -.6) s += TS(W / 2, H * .2, 'OVERDRIVE', W * .1, '#ff4fa3', 8, 'Chakra');
  return s;
}
function skyStack(t, W, H) {
  let s = `<defs><linearGradient id="sssky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1350"/><stop offset="1" stop-color="#7b2f86"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#sssky)"/>` + stars(W, H * .5, 30, 51, t);
  for (let i = 0; i < 4; i++) { const cx = ((i * W * .33 + t * 30) % (W * 1.3)) - W * .15, cy = H * (.12 + (i % 2) * .1); s += E(cx, cy, W * .14, H * .03, '#c7a6e6', 0, 'opacity=".7"') + E(cx + W * .07, cy - H * .015, W * .08, H * .03, '#d9c2f0', 0, 'opacity=".7"'); }
  const base = H * .82;
  for (let i = 0; i < 12; i++) { const bx = i * W / 11, bh = H * (.08 + (i * 53 % 9) / 50); s += R(bx, base - bh, W / 12, bh, 0, '#1b0f3d', 0); }
  s += R(0, base, W, H - base, 0, '#130a2e', 0);
  for (let i = 0; i < 8; i++) s += L(0, base + (i * i) * 4, W, base + (i * i) * 4, 2, '#ff4fa3', 'opacity=".5"');
  const cols = ['#3ddc84', '#a6e34f', '#ffd84d', '#ffb547', '#ff8a3d', '#4fe3ff', '#3ddc84'], bw = W * .36, bh = H * .045;
  const n = 6 + Math.floor((t * .8) % 3);
  for (let i = 0; i < n; i++) { const off = Math.sin(i * 2.3) * W * .015; s += R(W / 2 - bw / 2 + off, base - (i + 1) * bh, bw, bh, 4, cols[i % 7], 5); for (let j = 1; j < 6; j++) s += R(W / 2 - bw / 2 + off + j * bw / 6 - 5, base - (i + 1) * bh + bh * .3, 10, bh * .4, 2, 'rgba(255,255,255,.6)', 0); }
  const sx = W / 2 - bw / 2 + Math.sin(t * 2.4) * W * .3; s += R(sx, base - (n + 1) * bh - H * .03, bw, bh, 4, cols[n % 7], 5);
  s += TS(W / 2, H * .1, String(n), W * .1, '#fff', 8, 'Chakra');
  return s;
}
function fish(x, y, k, col, dir, t) { const w = Math.sin(t * 10) * 6;
  return G(`translate(${x} ${y}) scale(${dir * k} ${k})`, P(`M-40 0 L-62 ${-18 + w} L-62 ${18 + w}Z`, col, 5) + E(0, 0, 42, 26, col, 5) + P('M-8 -24 Q-2 0 -8 24', 'none', 0, `stroke="#fff" stroke-width="9"`) + P('M14 -22 Q20 0 14 22', 'none', 0, `stroke="#fff" stroke-width="7"`) + C(24, -6, 6, INK, 0)); }
function tinyAquarium(t, W, H) {
  let s = `<defs><linearGradient id="aq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3aa0d8"/><stop offset="1" stop-color="#145d9c"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#aq)"/>`;
  for (let i = 0; i < 5; i++) s += P(`M${W * (.1 + i * .2)} 0 L${W * (.18 + i * .2)} 0 L${W * (.05 + i * .22)} ${H * .8} L${W * (-.02 + i * .2)} ${H * .8}Z`, '#fff', 0, 'opacity=".06"');
  s += P(`M0 ${H * .82} Q${W * .3} ${H * .78} ${W * .6} ${H * .83} T${W} ${H * .81} L${W} ${H} L0 ${H}Z`, '#e8cf8f', 6);
  for (let i = 0; i < 7; i++) { const x = W * (.05 + i * .15), sw = Math.sin(t * 1.5 + i) * 18; s += P(`M${x} ${H * .84} Q${x + sw} ${H * .72} ${x - sw * .5} ${H * .6} Q${x + sw} ${H * .52} ${x} ${H * .46}`, 'none', 0, `stroke="${i % 2 ? '#2f9f5a' : '#58c26b'}" stroke-width="${W * .02}" stroke-linecap="round"`); }
  const k = W / 700;
  s += G(`translate(${W * .62} ${H * .8}) scale(${k})`, R(-90, -120, 180, 120, 0, '#9aa3b8', 6) + R(-110, -170, 50, 170, 0, '#9aa3b8', 6) + R(60, -170, 50, 170, 0, '#9aa3b8', 6) + R(-25, -60, 50, 60, 25, '#4a4f66', 5) +
    [-110, -95, -80, 60, 75, 90].map(x => R(x, -185, 14, 18, 0, '#9aa3b8', 5)).join(''));
  s += G(`translate(${W * .28} ${H * .82}) scale(${k})`, R(-50, -40, 100, 50, 8, '#a0662f', 6) + P('M-50 -40 Q0 -80 50 -40Z', '#b5763a', 6) + R(-8, -30, 16, 18, 3, '#ffd84d', 4));
  const fishes = [[ORANGE, .3, .35, 1], ['#ffd84d', .6, .25, -1], ['#ff8a3d', .5, .55, 1], ['#c9b0f2', .2, .6, -1], ['#ff4fa3', .8, .45, 1]];
  fishes.forEach(([c, u, v, d], i) => { const x = ((u + d * t * .06 + 1) % 1.2 - .1) * W, y = H * v + Math.sin(t * 2 + i) * 20; s += fish(x, y, k * 1.1, c, d, t + i); });
  for (let i = 0; i < 16; i++) { const r = rng(i + 90), x = r() * W, y = H - ((t * 80 * (0.6 + r()) + r() * H) % H); s += C(x + Math.sin(t * 3 + i) * 8, y, 4 + r() * 8, 'none', 0, 'stroke="#e6f6ff" stroke-width="3" opacity=".8"'); }
  s += R(W * .05, H * .03, W * .3, H * .05, 12, 'rgba(8,30,60,.7)', 0) + T(W * .2, H * .067, '16/32 FISH', H * .028, '#fff', 'middle', 'Chakra');
  return s;
}
function axeShape(k) { return R(-6 * k, -10 * k, 12 * k, 110 * k, 5 * k, '#8a5a2b', 5) + P(`M${-6 * k} ${-10 * k} L${-40 * k} ${-24 * k} Q${-48 * k} ${4 * k} ${-36 * k} ${26 * k} L${-6 * k} ${14 * k}Z`, '#cfd6e6', 5); }
function axeSpin(t, W, H) {
  let s = `<rect width="${W}" height="${H}" fill="#2a2638"/>` + C(W / 2, H * .38, W * .7, '#332e45', 0) + C(W / 2, H * .38, W * .5, '#3a3550', 0);
  const R0 = W * .22, cx = W / 2, cy = H * .36, rot = t * 140;
  let log = C(0, 0, R0, '#b5813f', 8); for (let i = 1; i < 5; i++) log += C(0, 0, R0 * i / 5, 'none', 4, 'opacity=".6"');
  const stuck = [0, 70, 150, 230, 300];
  stuck.forEach(a => { log += G(`rotate(${a}) translate(0 ${R0 + 40 * W / 560})`, axeShape(W / 560)); });
  s += G(`translate(${cx} ${cy}) rotate(${rot})`, log) + C(cx, cy - R0 - 30, 14, '#e5484d', 5);
  const ph = (t * 1.2) % 1, ay = lerp(H * .86, cy + R0 + 40, eIn(clamp(ph / .25)));
  if (ph < .25) s += G(`translate(${cx} ${ay})`, axeShape(W / 560));
  else s += G(`translate(${cx} ${H * .86}) scale(${eOut(clamp((ph - .3) / .2))})`, axeShape(W / 560));
  s += TS(W / 2, H * .08, String(15 + Math.floor(t * 1.2)), W * .1, '#fff', 8, 'Chakra') + T(W / 2, H * .12, 'STAGE 3', W * .04, '#c9c4dd', 'middle', 'Chakra');
  for (let i = 0; i < 6; i++) s += G(`translate(${W * .08} ${H * (.62 + i * .05)}) rotate(-90) scale(.35)`, axeShape(W / 560));
  return s;
}
function neonSerpent(t, W, H) {
  let s = `<rect width="${W}" height="${H}" fill="#07140d"/>`; const g = W / 12;
  for (let x = 0; x <= W; x += g) s += L(x, 0, x, H, 2, '#163a25'); for (let y = 0; y <= H; y += g) s += L(0, y, W, y, 2, '#163a25');
  const segs = 14; let pts = [];
  for (let i = 0; i < segs; i++) { const u = t * 1.4 - i * .12; pts.push([W / 2 + Math.sin(u) * W * .32, H * .5 + Math.sin(u * 1.7) * H * .28]); }
  const d = 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L');
  s += `<path d="${d}" fill="none" stroke="#3dffa0" stroke-width="${g * .9}" stroke-linecap="round" stroke-linejoin="round" filter="url(#blur8)" opacity=".7"/>` + `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${g * .8}" stroke-linecap="round" stroke-linejoin="round"/>` + `<path d="${d}" fill="none" stroke="#3dffa0" stroke-width="${g * .62}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const [hx, hy] = pts[0]; s += C(hx, hy, g * .1, INK, 0) ;
  const fx = W * (.3 + .4 * ((Math.floor(t * .7) * 37) % 10) / 10), fy = H * (.25 + .5 * ((Math.floor(t * .7) * 53) % 10) / 10);
  s += C(fx, fy, g * .5, '#4fe3ff', 0, 'filter="url(#blur8)"') + C(fx, fy, g * .25, '#bff6ff', 5);
  s += TS(W / 2, H * .08, String(2 + Math.floor(t)), W * .1, '#fff', 8, 'Chakra') + T(W * .06, H * .05, 'LENGTH ' + (6 + Math.floor(t)), W * .035, '#8affc1', 'start', 'Chakra');
  return s;
}
function noodle(x, y, k, jersey, t, ph) {   // floppy basketball player
  const sw = Math.sin(t * 6 + ph) * 18;
  return G(`translate(${x} ${y}) scale(${k})`, P(`M-14 60 Q${-20 + sw} 110 -12 160`, 'none', 0, `stroke="${INK}" stroke-width="22" stroke-linecap="round"`) + P(`M-14 60 Q${-20 + sw} 110 -12 160`, 'none', 0, `stroke="${SKIN}" stroke-width="12" stroke-linecap="round"`) +
    P(`M14 60 Q${20 - sw} 110 12 160`, 'none', 0, `stroke="${INK}" stroke-width="22" stroke-linecap="round"`) + P(`M14 60 Q${20 - sw} 110 12 160`, 'none', 0, `stroke="${SKIN}" stroke-width="12" stroke-linecap="round"`) +
    P(`M-20 -10 Q${-60 - sw} ${-50} ${-40 - sw} -90`, 'none', 0, `stroke="${INK}" stroke-width="22" stroke-linecap="round"`) + P(`M-20 -10 Q${-60 - sw} ${-50} ${-40 - sw} -90`, 'none', 0, `stroke="${SKIN}" stroke-width="12" stroke-linecap="round"`) +
    P(`M20 -10 Q${60 + sw} -50 ${40 + sw} -90`, 'none', 0, `stroke="${INK}" stroke-width="22" stroke-linecap="round"`) + P(`M20 -10 Q${60 + sw} -50 ${40 + sw} -90`, 'none', 0, `stroke="${SKIN}" stroke-width="12" stroke-linecap="round"`) +
    R(-28, -20, 56, 90, 14, jersey, 6) + C(0, -45, 26, SKIN, 6) + C(-8, -48, 4, INK, 0) + C(8, -48, 4, INK, 0) + P('M-8 -34 Q0 -28 8 -34', 'none', 4)); }
function flopHoops(t, W, H) {
  let s = `<rect width="${W}" height="${H}" fill="#2a3a8c"/>`; const r = rng(66);
  for (let i = 0; i < 260; i++) s += C(r() * W, H * .05 + r() * H * .3, 5 + r() * 3, ['#ff8a8a', '#ffd84d', '#8fd3ff', '#fff', '#c9b0f2'][i % 5], 0, `opacity="${.6 + .4 * Math.sin(t * 8 + i)}"`);
  s += R(0, H * .36, W, H * .06, 0, '#ff8a3d', 5) + T(W / 2, H * .405, 'PULSEBOX  ·  SLAM CITY  ·  HOOP DREAMS', H * .025, '#fff', 'middle', 'Chakra');
  s += P(`M0 ${H * .42} L${W} ${H * .42} L${W} ${H} L0 ${H}Z`, '#d9954f', 6);
  for (let i = 0; i < 10; i++) s += L(0, H * (.45 + i * .06), W, H * (.45 + i * .06), 3, '#c27f3d');
  s += E(W / 2, H * .82, W * .2, H * .06, 'none', 6) + L(W / 2, H * .42, W / 2, H, 6);
  const hoop = (x, d) => L(x, H * .42, x, H * .2, 10, '#ccd') + R(x - d * 10 - (d > 0 ? 0 : 60), H * .2, 70, 50, 4, '#fff', 5) + E(x + d * 50, H * .27, 34, 9, 'none', 0, `stroke="#ff4f2e" stroke-width="8"`) + P(`M${x + d * 50 - 30} ${H * .27} L${x + d * 50 - 18} ${H * .32} L${x + d * 50 + 18} ${H * .32} L${x + d * 50 + 30} ${H * .27}`, 'none', 4, 'opacity=".7"');
  s += hoop(W * .06, 1) + hoop(W * .94, -1);
  const k = W / 700;
  s += noodle(W * .3, H * .62, k * 1.2, '#ff8a3d', t, 0) + noodle(W * .42, H * .66, k * 1.2, '#ff8a3d', t, 1) + noodle(W * .6, H * .64, k * 1.2, '#4fa3ff', t, 2) + noodle(W * .72, H * .62, k * 1.2, '#4fa3ff', t, 3);
  const ph = (t * .6) % 1, bx = lerp(W * .42, W * .89, ph), by = H * .5 - Math.sin(ph * Math.PI) * H * .3;
  s += C(bx, by, 22 * k * 1.2, '#ff7a1a', 5) + L(bx - 20 * k, by, bx + 20 * k, by, 3);
  s += R(W * .3, H * .01, W * .4, H * .05, 10, '#111', 0) + T(W * .5, H * .047, `YOU ${Math.floor(t * .6)} - 0 CPU`, H * .03, '#fff', 'middle', 'Chakra');
  return s;
}
function safecracker(t, W, H) {
  let s = `<rect width="${W}" height="${H}" fill="#121318"/>` + R(W * .08, H * .15, W * .84, H * .62, 26, '#22242e', 7);
  s += T(W / 2, H * .22, 'THE TUMBLERS (2/3)', W * .05, '#ffcf5a', 'middle', 'Chakra') + T(W * .9, H * .08, `${134 - Math.floor(t)}s`, W * .06, '#fff', 'end', 'Chakra');
  const shear = H * .47; s += L(W * .12, shear, W * .88, shear, 5, '#3ddc84');
  for (let i = 0; i < 5; i++) { const x = W * (.18 + i * .16); s += R(x - W * .05, H * .27, W * .1, H * .44, 10, '#0c0d12', 5);
    const set = i < Math.floor(t * 1.2) % 6, y = set ? shear : shear - Math.sin(t * 4 + i * 1.7) * H * .12;
    s += R(x - W * .03, y - H * .12, W * .06, H * .12, 6, set ? '#ffcf5a' : '#c8ccd8', 5) + R(x - W * .03, y, W * .06, H * .08, 6, '#6b7080', 5); }
  s += R(W * .3, H * .82, W * .4, H * .08, 16, '#ffcf5a', 7) + T(W / 2, H * .875, 'SET PIN', W * .06, INK, 'middle', 'Chakra');
  return s;
}
function bumperBrawl(t, W, H) {
  let s = `<rect width="${W}" height="${H}" fill="#140a2e"/>`; const g = W / 10;
  for (let x = 0; x <= W; x += g) s += L(x, 0, x, H, 2, '#26174d'); for (let y = 0; y <= H; y += g) s += L(0, y, W, y, 2, '#26174d');
  const cx = W / 2, cy = H * .52, R0 = Math.min(W, H) * .42;
  s += C(cx, cy, R0, '#1d1140', 0) + C(cx, cy, R0, 'none', 0, `stroke="#b14fff" stroke-width="14" filter="url(#blur8)"`) + C(cx, cy, R0, 'none', 7) + C(cx, cy, R0 - 8, 'none', 0, `stroke="#d38bff" stroke-width="6"`);
  const cols = [['#ffd84d', 'ZAP'], ['#3ddc84', 'PIXEL'], ['#ff4f6e', 'BLIP'], ['#4fa3ff', 'YOU']];
  cols.forEach(([c, n], i) => { let a = t * (1 + i * .3) + i * 1.6, rr = R0 * (.35 + .25 * Math.sin(t * 1.3 + i));
    if (i === 2) { const ph = (t * .5) % 1; rr = R0 * (.3 + ph * 1.1); }
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr, k = W / 700;
    s += G(`translate(${x} ${y}) scale(${k})`, C(0, 0, 38, c, 6) + C(-12, -6, 7, INK, 0) + C(12, -6, 7, INK, 0) + P('M-12 12 Q0 22 12 12', 'none', 5)) + T(x, y - 50 * k, n === 'YOU' ? 'YOU' : 'BOT ' + n, 20 * k, '#fff', 'middle', 'Chakra'); });
  return s;
}
Object.assign(MINI, { 'space-colony': ['Space Colony', spaceColony], 'hyperlane': ['Hyperlane', hyperlane], 'sky-stack': ['Sky Stack', skyStack], 'tiny-aquarium': ['Tiny Aquarium', tinyAquarium],
  'axe-spin': ['Axe Spin', axeSpin], 'neon-serpent': ['Neon Serpent', neonSerpent], 'flop-hoops': ['Flop Hoops', flopHoops], 'safecracker': ['Safecracker', safecracker], 'bumper-brawl': ['Bumper Brawl', bumperBrawl] });
const GAMES = MINI;   // id -> [title, drawFn]

/* ---------- shared bits for the new videos ---------- */
function fullGame(id, t, title, col = LIME, tagY = 300, tagK = 1) {   // a game full-bleed with its name tag
  return GAMES[id][1](t, 1080, 1920) + (title !== false ? tag(540, tagY, title || GAMES[id][0].toUpperCase(), col, tagK, -4) : '');
}
function tag(x, y, txt, col = LIME, k = 1, rot = -4) { return G(`translate(${x} ${y}) rotate(${rot}) scale(${k})`, R(-txt.length * 24 - 40, -64, txt.length * 48 + 80, 100, 22, col, 8) + T(0, 8, txt, 64, INK, 'middle', 'Luckiest')); }
function urlPill(x, y, k = 1) { return G(`translate(${x} ${y}) scale(${k})`, R(-450, -80, 900, 140, 70, LIME, 9) + T(0, 26, 'box.pulseform.org', 78, INK, 'middle', 'Chakra')); }
function pulseboxLogo(x, y, k = 1) { return G(`translate(${x} ${y}) scale(${k})`, logoMark(-390, -60, 4.6) + `<text x="-250" y="40" font-family="Chakra" font-size="122" fill="#fff" stroke="${INK}" stroke-width="14" paint-order="stroke">PULSE<tspan fill="${LIME}">BOX</tspan></text>`); }
function endCard(t, lt, line2 = 'what should game #78 be?') {
  let s = R(-20, -20, 1120, 1960, 0, '#0b0d14', 0) + `<ellipse cx="540" cy="760" rx="800" ry="700" fill="url(#limeGlow)" opacity=".45"/>` + rays(540, 760, 24, 1600, LIME, .07, t * .2);
  const k = pop(lt, .05, .45), bob = Math.sin(t * 3) * 10;
  s += G(`translate(540 ${640 + bob}) scale(${k})`, logoMark(-120, -260, 10) + `<text x="0" y="110" text-anchor="middle" font-family="Chakra" font-size="170" fill="#fff" stroke="${INK}" stroke-width="14" paint-order="stroke">PULSE<tspan fill="${LIME}">BOX</tspan></text>`);
  s += urlPill(540, 960, pop(lt, .35, .35));
  if (line2) s += G(`translate(540 1160) scale(${pop(lt, 1.2, .35)})`, TS(0, 0, line2, 66, '#fff', 12));
  return s;
}
