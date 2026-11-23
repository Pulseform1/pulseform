/* Pulsebox's nine horror games, redrawn in 2D, for "Night Rules". Scenes draw in 1080 x 1920; GAMES entries fit any size. */
const HRED = '#ff2d55';
const wrapScene = fn => (t, W, H) => `<svg viewBox="0 0 1080 1920" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">${fn(t, {})}</svg>`;
function rain(t, n = 70, op = .35) { const r = rng(5); let s = ''; for (let i = 0; i < n; i++) { const x = r() * 1100, y = (r() * 1960 + t * 1400) % 1960; s += L(x, y, x - 14, y + 60, 3, '#9fb4d8', `opacity="${op}"`); } return s; }
function nightShiftScene(t, o = {}) {
  const fl = o.flick && Math.sin(t * 40) > .3;
  let s = R(-20, -20, 1120, 1960, 0, '#0b0f24', 0) + stars(1080, 700, 40, 91, t);
  s += R(-20, 1300, 1120, 660, 0, '#1b1d26', 0) + L(-20, 1300, 1100, 1300, 6, '#2a2d38');
  s += R(560, 700, 480, 600, 0, '#2a2433', 7) + R(600, 760, 400, 260, 6, fl ? '#3a3420' : '#ffe9a8', 6) + kidBack(800, 1120, .35, { t, noPhones: true, hoodie: '#2d6b4a' });
  s += P('M-40 560 L1120 560 L1080 640 L0 640Z', '#e8e0d0', 8) + R(-40, 640, 1160, 26, 0, HRED, 6);
  s += G('translate(540 520)', R(-230, -70, 460, 110, 18, '#1a0f24', 7) + T(0, 18, 'STARLITE', 80, fl ? '#552030' : '#ff4fa3', 'middle', 'Creepster', fl ? '' : 'filter="url(#blur8)" opacity=".6"') + T(0, 18, 'STARLITE', 80, fl ? '#552030' : '#ffd0e6', 'middle', 'Creepster'));
  [[140, 1], [380, 2], [620, 3], [860, 4]].forEach(([x, n]) => { const on = n !== 4 || o.pump4;
    s += R(x - 20, 660, 40, 640, 0, '#cfcfd8', 5) + R(x - 70, 1000, 140, 300, 14, n === 4 ? '#3a3f4a' : '#d94848', 7) + R(x - 50, 1030, 100, 70, 8, on ? (n === 4 ? '#ff2d55' : '#9fffb0') : '#111', 5) + T(x, 1200, String(n), 70, '#fff', 'middle', 'Luckiest', `stroke="${INK}" stroke-width="8" paint-order="stroke"`);
    if (n === 4 && o.pump4) s += C(x, 1060, 160, HRED, 0, 'opacity=".35" filter="url(#blur30)"'); });
  if (o.pump4) s += G('translate(990 1300)', P('M-40 0 L-30 -330 C-30 -400 30 -400 30 -330 L40 0Z', '#05050a', 0, 'opacity=".85"') + C(-10, -350, 5, HRED, 0) + C(12, -350, 5, HRED, 0));
  return s + (fl ? R(-20, -20, 1120, 1960, 0, '#000', 0, 'opacity=".55"') : '');
}
function motelScene(t, o = {}) {
  let s = R(-20, -20, 1120, 1960, 0, '#140e14', 0) + R(80, 260, 920, 1020, 16, '#0a1020', 9) + `<svg x="80" y="260" width="920" height="1020" viewBox="80 260 920 1020" overflow="hidden">` + rain(t, 80, .5);
  const eyes = o.eyes || 'normal', sk = eyes === 'wrong' ? '#c9c2b8' : '#e0a884';
  s += G(`translate(540 ${880 - (o.zoom || 0) * 120}) scale(${1.6 + (o.zoom || 0) * 1.6})`, P('M-175 260 C-180 90 -120 10 0 10 C120 10 180 90 175 260 Z', '#3a3f55') + G('translate(0 -110)', face(118, { t, skin: sk, hair: '#2a1a10', mouth: eyes === 'wrong' ? 'flat' : 'smile', lookX: 0 }) +
    (eyes === 'wrong' ? E(-45, 14, 26, 32, '#f6f6ff', 0) + E(45, 14, 26, 32, '#f6f6ff', 0) + E(-45, 14, 4, 26, INK, 0) + E(45, 14, 4, 26, INK, 0) + C(-45, 14, 40, '#e8ffe0', 0, 'opacity=".35" filter="url(#blur8)"') + C(45, 14, 40, '#e8ffe0', 0, 'opacity=".35" filter="url(#blur8)"') : '')));
  s += '</svg>' + R(80, 260, 920, 1020, 16, 'none', 9) + L(80, 770, 1000, 770, 6, '#2a3550', 'opacity=".5"');
  s += R(-20, 1280, 1120, 680, 0, '#5a3a24', 0) + L(-20, 1280, 1100, 1280, 8) + R(300, 1230, 480, 60, 10, '#2a2a2a', 6);
  s += G('translate(540 1420) rotate(-4)', R(-220, -120, 440, 250, 16, '#e8f0ff', 7) + T(-200, -70, 'ROUTE 9 STATE', 30, '#2d4a8a', 'start', 'Chakra') + R(-200, -40, 140, 150, 8, '#c9d8ee', 4) + [0, 1, 2, 3].map(i => L(-30, -40 + i * 40, 190, -40 + i * 40, 6, '#9aa8c4')).join(''));
  s += G('translate(820 180)', R(-170, -60, 340, 110, 16, '#1a0f14', 6) + T(0, 26, 'MOTEL', 70, Math.sin(t * 7) > -.7 ? '#ff4f6e' : '#3a1a20', 'middle', 'Creepster'));
  return s;
}
function cabinScene(t, o = {}) {
  const sh = o.shake ? Math.sin(t * 70) * 10 : 0;
  let s = R(-20, -20, 1120, 1960, 0, '#3a2516', 0);
  for (let i = 0; i < 16; i++) s += L(-20, 120 * i, 1100, 120 * i, 6, '#2a190e');
  s += R(-20, 1500, 1120, 460, 0, '#2a1a0e', 0) + L(-20, 1500, 1100, 1500, 8);
  s += G(`translate(${sh} 0)`, R(300, 560, 480, 940, 10, '#5c3a20', 9) + R(340, 600, 400, 860, 6, '#6b4428', 5) + C(700, 1040, 20, '#c9a24a', 5) +
    [700, 900, 1120].map((y, i) => G(`rotate(${i % 2 ? 6 : -6} 540 ${y})`, R(260, y - 40, 560, 80, 8, '#8a5a32', 7))).join(''));
  s += R(60, 520, 180, 260, 8, '#0a0f20', 7) + G('rotate(14 150 650)', R(30, 620, 240, 50, 6, '#8a5a32', 6)) + R(840, 520, 180, 260, 8, '#0a0f20', 7) + G('rotate(-12 930 650)', R(810, 620, 240, 50, 6, '#8a5a32', 6));
  s += lantern(170, 1420, 1.6, .9) + C(540, 1200, 700, '#ffb547', 0, 'opacity=".12" filter="url(#blur30)"');
  if (o.fingers) for (let i = 0; i < 4; i++) s += P(`M${430 + i * 70} 1500 q${10 + i * 4} ${-24 - (i % 2) * 10} ${-6} ${-70 - (i % 2) * 20}`, 'none', 0, `stroke="#0a0a0a" stroke-width="22" stroke-linecap="round"`);
  if (o.say) s += G(`translate(560 400) scale(${o.sayK || 1})`, P('M-300 -90 Q-300 -150 -240 -150 L240 -150 Q300 -150 300 -90 L300 40 Q300 100 240 100 L40 100 L-20 170 L-10 100 L-240 100 Q-300 100 -300 40Z', '#f3ead8', 8) + T(0, -10, o.say, 60, '#3a1a10', 'middle', 'Marker'));
  return s;
}
function endlessHallsScene(t, o = {}) {
  const loop = ((o.loop || 0) % 1), z = 1 + loop * .9, vx = 540, vy = 900;
  let s = R(-20, -20, 1120, 1960, 0, '#3a3216', 0);
  const hall = (k) => P(`M-20 1960 L${vx - 120} ${vy + 100} L${vx + 120} ${vy + 100} L1100 1960Z`, '#6b5a2e', 0) + P(`M-20 -20 L${vx - 120} ${vy - 110} L${vx + 120} ${vy - 110} L1100 -20Z`, '#d8cf9a', 0) +
    P(`M-20 -20 L${vx - 120} ${vy - 110} L${vx - 120} ${vy + 100} L-20 1960Z`, '#c9b25a', 0) + P(`M1100 -20 L${vx + 120} ${vy - 110} L${vx + 120} ${vy + 100} L1100 1960Z`, '#b9a24a', 0);
  s += G(`translate(${vx} ${vy}) scale(${z}) translate(${-vx} ${-vy})`, hall() + [.3, .6, .82].map(d => { const xl = lerp(-20, vx - 120, d), xr = lerp(1100, vx + 120, d), tp = lerp(-20, vy - 110, d) + lerp(560, 40, d), bt = lerp(1960, vy + 100, d), w = lerp(150, 16, d);
      return P(`M${xl} ${tp} L${xl + w} ${tp + w * .4} L${xl + w} ${bt - w * .3} L${xl} ${bt}Z`, '#4a3f1c', 4) + P(`M${xr} ${tp} L${xr - w} ${tp + w * .4} L${xr - w} ${bt - w * .3} L${xr} ${bt}Z`, '#4a3f1c', 4); }).join('') +
    [.2, .5, .75].map(d => { const w = lerp(300, 50, d), y = lerp(-20, vy - 110, d) + 14; return R(vx - w / 2, y, w, w * .14, 3, Math.sin(t * 30 + d * 9) > .95 ? '#8a8458' : '#fffbe0', 3); }).join('') +
    R(vx - 120, vy - 110, 240, 210, 0, '#2a240f', 0));
  if (o.man) s += G(`translate(540 ${o.manY || 1000}) scale(${o.manK || .5})`, P('M-60 0 L-40 -520 Q0 -600 40 -520 L60 0Z', '#e8e4d8', 8) + E(0, -600, 60, 80, '#e8e4d8', 8) + L(-40, -480, -110, -200, 22, '#e8e4d8') + L(40, -480, 110, -200, 22, '#e8e4d8'));
  s += G('translate(760 120)', R(0, 0, 280, 80, 14, 'rgba(10,8,2,.7)', 4) + T(140, 56, `FUSES ${o.fuses || 0}/3`, 46, '#fff', 'middle', 'Chakra'));
  return s + R(-20, -20, 1120, 1960, 0, '#d8c050', 0, 'opacity=".08"');
}
function nightwatchScene(t, o = {}) {
  let s = R(-20, -20, 1120, 1960, 0, '#0c0e12', 0) + R(60, 200, 960, 1160, 20, '#1a1d24', 9);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const x = 100 + c * 300, y = 240 + r * 270, idx = r * 3 + c, big = o.focus === idx;
    let cam = R(0, 0, 280, 250, 0, '#1d2b26', 0) + P('M0 250 L100 120 L180 120 L280 250Z', '#2a3a33', 0) + R(100, 40, 80, 80, 0, '#0f1714', 0) + staticFill(280, 250, idx, t).replace(/opacity=".7"/g, 'opacity=".08"');
    if (idx === 4 && o.elevator) cam = R(0, 0, 280, 250, 0, '#1d2b26', 0) + R(80, 40, 120, 190, 4, '#5a6a62', 5) + L(140, 40, 140, 230, 4) + R(110, 6, 60, 30, 4, '#000', 3) + T(140, 30, '3', 28, HRED, 'middle', 'Chakra');
    if (idx === 7 && o.chair) cam += G(`translate(${140 + Math.min(1, o.chair) * 50} 190)`, R(-30, -50, 60, 50, 6, '#3a3f4a', 4) + L(-25, 0, -25, 30, 5, '#3a3f4a') + L(25, 0, 25, 30, 5, '#3a3f4a'));
    if (idx === 4 && o.figure) cam += G('translate(220 250) scale(.45)', P('M-50 0 L-40 -420 Q0 -470 40 -420 L50 0Z', '#08080a', 0) + E(0, -470, 44, 56, '#08080a', 0) + R(-50, -490, 100, 30, 2, '#000', 0) + R(-56, -494, 112, 38, 2, 'none', 0, 'stroke="#fff" stroke-width="4" opacity=".6"'));
    s += nest(x, y, 280, 250, cam) + R(x, y, 280, 250, 8, 'none', 5) + T(x + 12, y + 30, 'CAM ' + (idx + 1), 22, '#9fdcc0', 'start', 'Chakra'); }
  s += T(540, 1430, o.clock || '4:09 AM', 70, '#9fdcc0', 'middle', 'DejaVu Sans Mono', 'font-weight="bold"');
  if (o.panel) s += G('translate(540 1640)', R(-260, -110, 520, 220, 20, '#2a2d35', 8) + ['1', '2', '4', '5'].map((n, i) => C(-180 + i * 120, 0, 40, '#c8ccd8', 5) + T(-180 + i * 120, 14, n, 40, INK, 'middle', 'Chakra')).join('') + T(0, 90, 'no floor 3', 30, '#9aa3b8', 'middle', 'Marker'));
  return s;
}
function deepSignalScene(t, o = {}) {
  let s = R(-20, -20, 1120, 1960, 0, '#06110c', 0) + R(60, 260, 960, 1260, 30, '#0b1d14', 8);
  const cx = 540, cy = 860, r = 400, sweep = t * 2;
  s += C(cx, cy, r, '#07140d', 8) + [1, 2, 3].map(i => C(cx, cy, r * i / 3, 'none', 0, 'stroke="#1f6b3f" stroke-width="3"')).join('') + L(cx - r, cy, cx + r, cy, 2, '#1f6b3f') + L(cx, cy - r, cx, cy + r, 2, '#1f6b3f');
  s += P(`M${cx} ${cy} L${cx + Math.cos(sweep) * r} ${cy + Math.sin(sweep) * r} A${r} ${r} 0 0 0 ${cx + Math.cos(sweep - .5) * r} ${cy + Math.sin(sweep - .5) * r}Z`, '#3dff8f', 0, 'opacity=".18"');
  s += P('M380 700 Q420 640 470 690 Q520 760 600 700 Q660 650 700 760', 'none', 0, 'stroke="#3dff8f" stroke-width="5" opacity=".6"') + P('M360 1000 Q440 1060 540 1010 Q640 960 730 1050', 'none', 0, 'stroke="#3dff8f" stroke-width="5" opacity=".6"');
  if (o.ping !== undefined && o.ping >= 0 && o.ping < 1) s += C(cx, cy, 30 + o.ping * r, 'none', 0, `stroke="#bfffd8" stroke-width="${10 * (1 - o.ping)}" opacity="${1 - o.ping}"`);
  if (o.stalker) { const d = lerp(r + 60, 140, o.stalker); s += G(`translate(${cx + d * .7} ${cy - d * .7}) rotate(-45)`, P('M-260 0 Q-180 -90 0 -80 Q200 -70 260 0 Q200 70 0 80 Q-180 90 -260 0Z', 'none', 0, 'stroke="#ff6b6b" stroke-width="8"') + C(180, -20, 14, '#ff6b6b', 0)); }
  s += C(cx, cy, 16, '#bfffd8', 0) + T(200, 360, '0558.7 m', 46, '#3dff8f', 'start', 'DejaVu Sans Mono') + G('translate(540 1400)', C(0, 0, 90, '#0f2a1c', 7) + T(0, 16, 'PING', 50, '#3dff8f', 'middle', 'Chakra'));
  return s;
}
function hollowLabScene(t, o = {}) {
  let s = corridor(t, { dark: true }).replace(/#8a5a3c/g, '#3a4a5c').replace(/#7a4e34/g, '#2f3d4e').replace(/#6b4a2e/g, '#2a2f38');
  for (let i = 0; i < 4; i++) s += R(20, 900 + i * 0, 1, 1, 0, 'none', 0);
  s += [0, 1, 2].map(i => R(-10 + i * 120, 980 - i * 40, 110, 520 - i * 60, 6, '#2f6fd8', 6)).join('') + hollow(620, 1180, .7, { t, pose: 'stand' });
  return s + flashlight(560, 900, 420, .88);
}
function deadAirScene(t, o = {}) {
  const dark = o.flick && (Math.sin(t * 36) > 0);
  let s = `<svg viewBox="0 0 1080 1920" width="1080" height="1920">${deadAir(t, 1080, 1920)}</svg>`;
  if (dark) s += R(-20, -20, 1120, 1960, 0, '#000', 0, 'opacity=".75"');
  if (o.ghost) s += G(`translate(540 ${1200 - o.ghost * 100}) scale(${2 + o.ghost * 4})`, ghost(0, 0, 1, .9)) + R(-20, -20, 1120, 1960, 0, HRED, 0, `opacity="${.15 * o.ghost}"`);
  return s;
}
Object.assign(GAMES, {
  'night-shift': ['Night Shift', wrapScene(t => nightShiftScene(t, { pump4: true }))], 'lights-out-motel': ['Lights Out Motel', wrapScene(t => motelScene(t, { eyes: 'wrong' }))],
  'one-more-night': ['One More Night', wrapScene(t => cabinScene(t, { fingers: true }))], 'endless-halls': ['The Endless Halls', wrapScene(t => endlessHallsScene(t, { man: true, manK: .5 }))],
  'nightwatch': ['Nightwatch', wrapScene(t => nightwatchScene(t, { figure: true, elevator: true }))], 'deep-signal': ['Deep Signal', wrapScene(t => deepSignalScene(t, { stalker: .4, ping: (t % 2) / 2 }))],
  'the-hollow': ['The Hollow', wrapScene(t => hollowLabScene(t))], 'dead-air-house': ['Dead Air', wrapScene(t => deadAirScene(t, { ghost: .3 }))] });
function rulesNote(t, k, o = {}) {   // the note: PULSEBOX NIGHT RULES, scribbled
  const lines = o.lines || [];
  let s = G('rotate(-3)', R(-330, -440, 660, 880, 8, '#f3e7b8', 7) + L(-260, -440, -260, 440, 3, '#e5484d', 'opacity=".7"') + Array.from({ length: 13 }, (_, i) => L(-330, -330 + i * 62, 330, -330 + i * 62, 2, '#9fb4d8', 'opacity=".6"')).join('') +
    T(0, -360, 'PULSEBOX', 54, '#2a1a10', 'middle', 'Marker') + T(0, -300, 'NIGHT RULES', 60, HRED, 'middle', 'Marker') +
    lines.map((l, i) => T(-240, -220 + i * 62, l, 34, '#2a1a10', 'start', 'Marker')).join('') + (o.last ? T(0, 380, o.last, 64, HRED, 'middle', 'Marker', `opacity="${o.lastK === undefined ? 1 : o.lastK}"`) : '') +
    R(-80, -470, 160, 60, 4, '#e8e2c8', 0, 'opacity=".8" transform="rotate(4)"'));
  return G(`scale(${k})`, s);
}
function ruleStrip(n, txt, k = 1) { return G(`translate(540 250) rotate(-2) scale(${k})`, R(-500, -90, 1000, 170, 6, '#f3e7b8', 7) + T(-460, -26, 'RULE ' + n, 46, HRED, 'start', 'Marker') + T(-460, 44, txt, 46, '#2a1a10', 'start', 'Marker') + R(-60, -110, 120, 44, 4, '#e8e2c8', 0, 'opacity=".8"')); }
