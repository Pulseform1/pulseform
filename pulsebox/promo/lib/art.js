/* Pulsebox promo art kit: hand-drawn 2D scenes as SVG. Loaded after timeline.js. */
(function mountStage() {
  const st = document.createElement('div'); st.id = 'stage';
  st.innerHTML = `<svg id="svg" viewBox="0 0 1080 1920" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg"><defs>
    <filter id="boil" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence id="turb" type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="1" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/>
      <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0"/></filter>
    <filter id="blur8"><feGaussianBlur stdDeviation="8"/></filter>
    <filter id="blur30"><feGaussianBlur stdDeviation="30"/></filter>
    <filter id="gray"><feColorMatrix type="saturate" values="0.15"/></filter>
    <radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".55"/></radialGradient>
    <radialGradient id="limeGlow"><stop offset="0%" stop-color="#c6ff3d" stop-opacity=".55"/><stop offset="100%" stop-color="#c6ff3d" stop-opacity="0"/></radialGradient>
    <radialGradient id="warmGlow"><stop offset="0%" stop-color="#ffb547" stop-opacity=".8"/><stop offset="100%" stop-color="#ffb547" stop-opacity="0"/></radialGradient>
    <radialGradient id="moonGlow"><stop offset="0%" stop-color="#dfe6ff" stop-opacity=".5"/><stop offset="100%" stop-color="#dfe6ff" stop-opacity="0"/></radialGradient>
    <linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#fff3b0" stop-opacity=".75"/><stop offset="100%" stop-color="#fff3b0" stop-opacity="0"/></linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0d1d3a"/><stop offset="100%" stop-color="#123f63"/></linearGradient>
    <linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0a0f2a"/><stop offset="100%" stop-color="#232a63"/></linearGradient>
    <pattern id="checker" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#fff"/><rect width="20" height="20" fill="#111"/><rect x="20" y="20" width="20" height="20" fill="#111"/></pattern>
  </defs>
  <g id="world" filter="url(#boil)" transform="translate(540 960) scale(1.012) translate(-540 -960)"></g>
  <rect width="1080" height="1920" fill="url(#vig)" pointer-events="none"/>
  <rect id="grainRect" width="1080" height="1920" filter="url(#grain)" opacity=".07"/>
  <rect id="flash" width="1080" height="1920" fill="#fff" opacity="0"/></svg><div id="cap"></div>`;
  document.body.appendChild(st);
})();
/* ============================ helpers ============================ */
const INK = '#0b0d1a', LIME = '#c6ff3d', PINK = '#ff4fa3', ORANGE = '#ffb547', SKIN = '#f2b38a', SKIN_D = '#d9916a';
const st = (w = 7) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const P = (d, f = 'none', w = 7, ex = '') => `<path d="${d}" fill="${f}" ${w ? st(w) : ''} ${ex}/>`;
const C = (x, y, r, f, w = 7, ex = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${w ? st(w) : ''} ${ex}/>`;
const E = (x, y, rx, ry, f, w = 7, ex = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" ${w ? st(w) : ''} ${ex}/>`;
const R = (x, y, w, h, rx, f, sw = 7, ex = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${sw ? st(sw) : ''} ${ex}/>`;
const L = (x1, y1, x2, y2, w = 7, c = INK, ex = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" ${ex}/>`;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const T = (x, y, s, size, f = '#fff', anchor = 'middle', font = 'Chakra', ex = '') =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" fill="${f}" text-anchor="${anchor}" ${ex}>${esc(s)}</text>`;
const TS = (x, y, s, size, f = '#fff', sw = 10, font = 'Luckiest', ex = '') =>  // stroked title text
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" fill="${f}" text-anchor="middle" stroke="${INK}" stroke-width="${sw}" paint-order="stroke" stroke-linejoin="round" ${ex}>${esc(s)}</text>`;
const G = (tr, inner, ex = '') => `<g transform="${tr}" ${ex}>${inner}</g>`;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eOut = k => 1 - Math.pow(1 - k, 3);
const eIn = k => k * k * k;
const eIO = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const eBack = k => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const pop = (t, a, d = .25) => eBack(prog(t, a, a + d));     // 0 -> 1 with overshoot
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const nest = (x, y, w, h, inner, ex = '') => `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden" ${ex}>${inner}</svg>`;
function burst(x, y, r1, r2, n, f, rot = 0, sw = 6) {   // comic impact star
  let d = ''; for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, r = i % 2 ? r1 : r2;
    d += (i ? 'L' : 'M') + (x + Math.cos(a) * r).toFixed(1) + ' ' + (y + Math.sin(a) * r).toFixed(1); }
  return P(d + 'Z', f, sw);
}
function rays(x, y, n, len, col, op, rot) { let s = ''; for (let i = 0; i < n; i++) { const a = rot + i * 2 * Math.PI / n, b = a + Math.PI / n * .55;
  s += `<path d="M${x} ${y}L${x + Math.cos(a) * len} ${y + Math.sin(a) * len}L${x + Math.cos(b) * len} ${y + Math.sin(b) * len}Z" fill="${col}" opacity="${op}"/>`; } return s; }
function stars(W, H, n, seed, t = 0) { const r = rng(seed); let s = ''; for (let i = 0; i < n; i++) { const x = r() * W, y = r() * H, z = r();
  s += C(x.toFixed(1), y.toFixed(1), (1.5 + z * 3).toFixed(1), '#fff', 0, `opacity="${(.35 + .5 * Math.abs(Math.sin(t * 2 + i))).toFixed(2)}"`); } return s; }
const TL = window.TIMELINE;
function wordT(line, re) { for (const c of TL.caps) if (c.line === line) for (const w of c.words) if (re.test(w.w)) return w.t; return null; }
const VO = TL.lines.map(l => l.at);

/* ============================ characters ============================ */
// headphones: lime band, the kid's signature
function phonesBand(r) { return P(`M${-r * 1.02} ${-r * .05} C${-r * 1.1} ${-r * 1.45} ${r * 1.1} ${-r * 1.45} ${r * 1.02} ${-r * .05}`, 'none', 22) +
  P(`M${-r * 1.02} ${-r * .05} C${-r * 1.1} ${-r * 1.45} ${r * 1.1} ${-r * 1.45} ${r * 1.02} ${-r * .05}`, 'none', 0, `stroke="${LIME}" stroke-width="10" stroke-linecap="round"`); }
function hairBack(r) { // messy hair seen from behind / top
  return P(`M${-r} ${r * .1} C${-r * 1.15} ${-r * .9} ${-r * .5} ${-r * 1.15} 0 ${-r * 1.12} C${r * .6} ${-r * 1.15} ${r * 1.15} ${-r * .8} ${r} ${r * .15}
   C${r * .7} ${r * .55} ${-r * .7} ${r * .55} ${-r} ${r * .1}Z`, '#3b2416') +
   P(`M${-r * .5} ${-r * 1.05} L${-r * .62} ${-r * 1.38} L${-r * .2} ${-r * 1.1} L${-r * .05} ${-r * 1.45} L${r * .25} ${-r * 1.08} L${r * .5} ${-r * 1.3} L${r * .55} ${-r * .95}`, '#3b2416');
}
function kidBack(x, y, k, o = {}) {  // seen from behind at the desk. o.t time, o.typing, o.facepalm(0..1), o.stretch(0..1), o.turn(0..1)
  const t = o.t || 0, bob = o.typing ? Math.sin(t * 22) * 6 : 0, bob2 = o.typing ? Math.sin(t * 22 + 2) * 6 : 0;
  const r = 105, hoodie = o.hoodie || '#7457ff';
  let s = '';
  // arms to the keyboard (behind torso edges)
  const st1 = o.stretch || 0;
  if (st1 > 0) {   // knuckle-crack stretch: arms up and out
    const ax = lerp(-120, -230, st1), ay = lerp(-150, -470, st1);
    s += P(`M-130 -140 Q${ax - 40} ${ay + 120} ${ax} ${ay}`, 'none', 64) + P(`M-130 -140 Q${ax - 40} ${ay + 120} ${ax} ${ay}`, 'none', 0, `stroke="${hoodie}" stroke-width="50" stroke-linecap="round"`) + C(ax, ay - 10, 34, SKIN);
    s += P(`M130 -140 Q${-ax + 40} ${ay + 120} ${-ax} ${ay}`, 'none', 64) + P(`M130 -140 Q${-ax + 40} ${ay + 120} ${-ax} ${ay}`, 'none', 0, `stroke="${hoodie}" stroke-width="50" stroke-linecap="round"`) + C(-ax, ay - 10, 34, SKIN);
  } else {
    s += P(`M-140 -130 Q-210 -250 -120 ${-330 + bob}`, 'none', 64) + P(`M-140 -130 Q-210 -250 -120 ${-330 + bob}`, 'none', 0, `stroke="${hoodie}" stroke-width="50" stroke-linecap="round"`);
    const fp = o.facepalm || 0;
    if (fp > 0) { const hx = lerp(120, 40, fp), hy = lerp(-330, -330, fp);
      s += P(`M140 -130 Q${lerp(210, 230, fp)} ${lerp(-250, -300, fp)} ${hx} ${hy}`, 'none', 64) + P(`M140 -130 Q${lerp(210, 230, fp)} ${lerp(-250, -300, fp)} ${hx} ${hy}`, 'none', 0, `stroke="${hoodie}" stroke-width="50" stroke-linecap="round"`);
    } else s += P(`M140 -130 Q210 -250 120 ${-330 + bob2}`, 'none', 64) + P(`M140 -130 Q210 -250 120 ${-330 + bob2}`, 'none', 0, `stroke="${hoodie}" stroke-width="50" stroke-linecap="round"`);
  }
  // torso
  s += P('M-185 40 C-190 -120 -130 -215 0 -215 C130 -215 190 -120 185 40 Z', hoodie);
  s += P('M-60 -150 C-40 -60 40 -60 60 -150', 'none', 5, `opacity=".5"`);      // hoodie fold
  s += P('M-110 -205 C-90 -245 90 -245 110 -205 C70 -175 -70 -175 -110 -205Z', '#5a41d6');  // hood bunch
  // head (back or turning)
  const turn = o.turn || 0;
  let head = C(0, 0, r, SKIN) + hairBack(r);
  if (turn > 0) {   // looking back over the shoulder: profile face on the right side
    head = C(0, 0, r, SKIN) +
      P(`M${r * .55} ${-r * .55} C${r * 1.15} ${-r * .4} ${r * 1.2} ${r * .1} ${r * .98} ${r * .3}`, 'none', 0) +
      P(`M${r * .9} ${-r * .05} L${r * 1.18} ${r * .12} L${r * .92} ${r * .22}`, SKIN, 6) +           // nose
      E(r * .55, -r * .12, 13, 17, '#fff', 5) + C(r * .62, -r * .1, 7, INK, 0) +                     // eye glancing at us
      P(`M${r * .4} ${-r * .42} L${r * .78} ${-r * .48}`, 'none', 8) +                                  // raised brow
      P(`M${r * .45} ${r * .45} Q${r * .7} ${r * .55} ${r * .85} ${r * .38}`, 'none', 6) +             // smirk
      P(`M${-r} ${r * .1} C${-r * 1.15} ${-r * .9} ${-r * .5} ${-r * 1.15} 0 ${-r * 1.12} C${r * .6} ${-r * 1.15} ${r * .95} ${-r * .8} ${r * .6} ${-r * .55} C${r * .2} ${-r * .3} ${-r * .3} ${r * .2} ${-r * .55} ${r * .55} Z`, '#3b2416') +
      P(`M${-r * .5} ${-r * 1.05} L${-r * .62} ${-r * 1.38} L${-r * .2} ${-r * 1.1} L${-r * .05} ${-r * 1.45} L${r * .25} ${-r * 1.08} L${r * .5} ${-r * 1.3} L${r * .55} ${-r * .95}`, '#3b2416');
  }
  s += G(`translate(0 -330) rotate(${(o.tilt || 0)})`, head + phonesBand(r) + R(-r * 1.15, -r * .25, 34, 70, 14, LIME, 6) + R(r * 1.15 - 34, -r * .25, 34, 70, 14, LIME, 6));
  // facepalm hand drawn over head
  if ((o.facepalm || 0) > .5) s += G('translate(40 -330)', E(0, 0, 40, 34, SKIN) + L(-20, -10, 25, -18, 5) + L(-18, 8, 28, 2, 5));
  // lime rim light from the screen
  s += P('M-120 -390 C-60 -450 60 -450 120 -390', 'none', 0, `stroke="${LIME}" stroke-width="6" opacity=".55" stroke-linecap="round"`);
  return G(`translate(${x} ${y}) scale(${k})`, s);
}
function face(r, o = {}) { // front face, centered on 0,0
  const t = o.t || 0, lookX = o.lookX || 0, lookY = o.lookY || 0, blink = (o.blink && (t % 3.1) < .09) ? 1 : 0;
  let s = C(0, 0, r, SKIN);
  s += E(-r * 1.0, r * .08, 18, 26, SKIN, 6) + E(r * 1.0, r * .08, 18, 26, SKIN, 6);    // ears
  s += C(0, 0, r, SKIN);
  // hair fringe
  s += P(`M${-r * 1.02} ${r * .05} C${-r * 1.15} ${-r * 1.0} ${r * 1.15} ${-r * 1.0} ${r * 1.02} ${r * .05}
   L${r * .8} ${-r * .3} L${r * .55} ${-r * .12} L${r * .35} ${-r * .42} L${r * .1} ${-r * .22} L${-r * .15} ${-r * .5} L${-r * .35} ${-r * .2} L${-r * .6} ${-r * .45} L${-r * .8} ${-r * .15} Z`, o.hair || '#3b2416');
  s += P(`M${-r * .2} ${-r * 1.0} L${-r * .3} ${-r * 1.3} L${r * .05} ${-r * 1.02} L${r * .2} ${-r * 1.28} L${r * .32} ${-r * .98}`, o.hair || '#3b2416');
  const ey = r * .12, ex = r * .38, eh = blink ? 3 : 30;
  for (const sx of [-1, 1]) {
    s += E(sx * ex, ey, 25, eh, '#fff', 6);
    if (!blink) s += C(sx * ex + lookX * 9, ey + lookY * 9, 13, INK, 0) + C(sx * ex + lookX * 9 + 5, ey + lookY * 9 - 6, 4.5, '#fff', 0);
    const by = o.brow === 'up' ? -r * .3 : o.brow === 'mad' ? -r * .12 : -r * .2;
    s += P(`M${sx * (ex - 26)} ${by + (o.brow === 'mad' ? sx * -0 : 0)} L${sx * (ex + 26)} ${by + (o.brow === 'mad' ? -8 : -6)}`, 'none', 9);
  }
  if (o.tired) for (const sx of [-1, 1]) {   // droopy lids, eye bags, red veins
    s += P(`M${sx * ex - 28} ${ey + 2} A28 ${30 * o.tired} 0 0 1 ${sx * ex + 28} ${ey + 2}Z`, SKIN, 6);
    s += P(`M${sx * ex - 26} ${ey + 34} Q${sx * ex} ${ey + 52} ${sx * ex + 26} ${ey + 34}`, 'none', 0, `stroke="#7b4a9e" stroke-width="7" stroke-linecap="round" opacity=".8"`);
    s += L(sx * ex - 20, ey + 10, sx * ex - 8, ey + 14, 2, '#e5484d') + L(sx * ex + 22, ey + 12, sx * ex + 10, ey + 15, 2, '#e5484d');
  }
  s += C(-r * .62, r * .45, 16, '#ff8a8a', 0, 'opacity=".55"') + C(r * .62, r * .45, 16, '#ff8a8a', 0, 'opacity=".55"');
  const m = o.mouth || 'smile';
  if (m === 'smile') s += P(`M${-r * .25} ${r * .48} Q0 ${r * .68} ${r * .25} ${r * .48}`, 'none', 7);
  if (m === 'grin') s += P(`M${-r * .32} ${r * .42} Q0 ${r * .85} ${r * .32} ${r * .42} Z`, '#7a1f2b', 7) + P(`M${-r * .24} ${r * .47} L${r * .24} ${r * .47}`, 'none', 0, `stroke="#fff" stroke-width="10"`);
  if (m === 'o') s += E(0, r * .55, 18 + (o.talk || 0) * 8, 22 + (o.talk || 0) * 10, '#7a1f2b', 6);
  if (m === 'whistle') s += C(r * .1, r * .55, 11, '#7a1f2b', 6);
  if (m === 'flat') s += L(-r * .2, r * .55, r * .2, r * .52, 7);
  return s;
}
function kidFront(x, y, k, o = {}) {  // o.armsUp, o.phone, o.controller, o.wave
  const hoodie = o.hoodie || '#7457ff', t = o.t || 0; let s = '';
  // body
  s += P('M-175 260 C-180 90 -120 10 0 10 C120 10 180 90 175 260 Z', hoodie);
  s += P('M-55 20 L0 90 L55 20', 'none', 6) + L(-30, 60, -38, 140, 5, '#fff') + L(30, 60, 38, 140, 5, '#fff');  // hood strings
  // headphones around neck
  s += P('M-95 20 C-80 70 80 70 95 20', 'none', 0, `stroke="${INK}" stroke-width="22" stroke-linecap="round"`) + P('M-95 20 C-80 70 80 70 95 20', 'none', 0, `stroke="${LIME}" stroke-width="11" stroke-linecap="round"`);
  s += R(-120, 0, 38, 54, 14, LIME, 6) + R(82, 0, 38, 54, 14, LIME, 6);
  // arms
  const arm = (d) => P(d, 'none', 62) + P(d, 'none', 0, `stroke="${hoodie}" stroke-width="48" stroke-linecap="round"`);
  if (o.armsUp) { const w = Math.sin(t * 14) * 14;
    s += arm(`M-140 90 Q-230 0 ${-200 + w} -140`) + C(-200 + w, -165, 32, SKIN) + arm(`M140 90 Q230 0 ${200 - w} -140`) + C(200 - w, -165, 32, SKIN);
  } else if (o.wave) { const w = Math.sin(t * 9) * 25;
    s += arm('M-140 90 Q-150 180 -60 200') + C(-50, 200, 30, SKIN) + arm(`M140 90 Q230 20 ${190 + w} -110`) + C(190 + w, -135, 34, SKIN);
  } else {
    s += arm('M-140 90 Q-160 190 -50 200') + arm('M140 90 Q160 190 50 200');
    if (o.phone) s += G('rotate(-4)', R(-55, 120, 110, 170, 18, '#20253d', 7) + R(-44, 132, 88, 146, 10, o.phoneScreen || LIME, 0, 'opacity=".9"'));
    if (o.controller) s += P('M-90 170 C-110 230 -60 250 -40 215 L40 215 C60 250 110 230 90 170 C80 140 -80 140 -90 170Z', '#2b2f45', 7) +
      C(-50, 180, 10, LIME, 4) + C(50, 172, 8, PINK, 4) + C(64, 190, 8, ORANGE, 4);
    s += C(-50, 200, 30, SKIN) + C(50, 200, 30, SKIN);
  }
  s += G(`translate(0 -110) rotate(${o.tilt || 0})`, face(118, o));
  return G(`translate(${x} ${y}) scale(${k})`, s);
}

/* ============================ props & sets ============================ */
function codeLine(txt, x, y, size) {
  const parts = []; let last = 0; const re = /(\b(?:const|function|return|let|for|if|else|new|this|true|false|of)\b|=>)|('[^']*'|"[^"]*")|(\b\d+\.?\d*\b)|(\/\/.*$)/g; let m;
  while ((m = re.exec(txt))) { if (m.index > last) parts.push(['#dfe4ff', txt.slice(last, m.index)]);
    parts.push([m[1] ? PINK : m[2] ? ORANGE : m[3] ? LIME : '#7d86b3', m[0]]); last = re.lastIndex; }
  if (last < txt.length) parts.push(['#dfe4ff', txt.slice(last)]);
  return `<text x="${x}" y="${y}" font-family="DejaVu Sans Mono, monospace" font-size="${size}" xml:space="preserve">` +
    parts.map(([c, s]) => `<tspan fill="${c}">${esc(s)}</tspan>`).join('') + '</text>';
}
function codeScreen(t, W, H, o = {}) {   // editor with code pouring in
  const size = o.size || 22, lh = size * 1.45, chars = Math.floor(t * (o.cps || 260));
  let s = R(0, 0, W, H, 0, '#0e1226', 0) + R(0, 0, W, 44, 0, '#171c38', 0) + C(24, 22, 8, '#ff5f57', 0) + C(50, 22, 8, '#febc2e', 0) + C(76, 22, 8, '#28c840', 0) +
    T(110, 30, o.file || 'turbo-laps.js', 20, '#aab3e6', 'start', 'DejaVu Sans Mono');
  let used = 0, rows = []; for (const ln of TL.code) { if (used >= chars) break; rows.push(ln.slice(0, Math.max(0, chars - used))); used += ln.length + 4; }
  const vis = Math.floor((H - 70) / lh), off = Math.max(0, rows.length - vis);
  rows.slice(off).forEach((ln, i) => { s += T(38, 70 + i * lh + size * .3, String(off + i + 1), size * .8, '#4a5288', 'end', 'DejaVu Sans Mono') + codeLine(ln, 52, 70 + i * lh + size * .3, size); });
  const cy = 70 + Math.min(rows.length - 1 - off, vis - 1) * lh, cl = rows.length ? rows[rows.length - 1].length : 0;
  if ((t * 2.5) % 1 < .6) s += R(52 + cl * size * .6, cy - size * .55, size * .55, size * 1.05, 0, LIME, 0);
  return s;
}
function laptopFront(x, y, w, h, screenInner) {  // big laptop screen seen over the shoulder
  const glow = `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w * .75}" ry="${h * .8}" fill="url(#limeGlow)" opacity=".55"/>`;
  return glow + R(x - 26, y - 26, w + 52, h + 52, 26, '#262b45') + nest(x, y, w, h, screenInner) + R(x, y, w, h, 6, 'none', 6) +
    P(`M${x - 70} ${y + h + 26} L${x + w + 70} ${y + h + 26} L${x + w + 140} ${y + h + 120} L${x - 140} ${y + h + 120} Z`, '#303656') +
    P(`M${x + w * .38} ${y + h + 95} L${x + w * .62} ${y + h + 95}`, 'none', 6);
}
function bedroom(t, o = {}) {   // wide shot of the room at night
  let s = R(0, 0, 1080, 1920, 0, '#1a1f4a', 0) + R(0, 1300, 1080, 620, 0, '#11143a', 0) + L(0, 1300, 1080, 1300, 8);
  // window + moon
  s += R(90, 260, 380, 440, 16, 'url(#night)') + nest(90, 260, 380, 440, stars(380, 440, 26, 4, t) + C(270, 140, 120, 'url(#moonGlow)', 0) + C(270, 140, 56, '#f4f1d6', 6) + C(250, 125, 10, '#dcd7b0', 0) + C(290, 160, 7, '#dcd7b0', 0));
  s += L(280, 260, 280, 700, 8) + L(90, 480, 470, 480, 8) + R(90, 260, 380, 440, 16, 'none');
  s += P('M60 230 Q110 470 70 730 L130 730 Q150 470 120 230Z', '#b2325a') + P('M500 230 Q450 470 490 730 L430 730 Q410 470 440 230Z', '#b2325a') + L(40, 232, 520, 232, 10);
  // poster + pinned sketches
  s += G('translate(620 330) rotate(4)', R(0, 0, 240, 320, 6, '#2a3170') + burst(120, 130, 50, 95, 9, ORANGE, 0, 5) + TS(120, 150, 'LVL 99', 48, LIME, 8) + TS(120, 280, 'GAME DEV', 32, '#fff', 7));
  // clock
  s += R(880, 560, 170, 90, 14, '#0c0f24') + T(965, 625, o.clock || '2:13', 52, '#ff4f6e', 'middle', 'DejaVu Sans Mono', 'font-weight="bold"');
  // bed (left)
  s += R(-40, 1120, 420, 260, 30, '#3546a8') + R(-40, 1060, 200, 100, 40, '#e6e9ff') + P('M-40 1200 Q170 1150 380 1210 L380 1380 L-40 1380Z', '#5b6fe0');
  // desk
  s += R(470, 1050, 600, 40, 8, '#7a4b2c') + R(500, 1090, 34, 330, 6, '#5c3820') + R(1000, 1090, 34, 330, 6, '#5c3820');
  s += G('translate(600 1050)', R(-14, -40, 70, 40, 8, '#ff4f6e', 6) + L(5, -40, 5, -70, 5) + R(-10, -110, 40, 40, 6, '#ffd84d', 6));  // energy can
  return s;
}
function doorLight(k) {  // light wedge + door on the right, k = how open
  if (k <= 0) return R(950, 700, 140, 620, 0, '#0f1230') + L(950, 700, 950, 1320, 8);
  const w = 140 * k;
  return R(950, 700, 140, 620, 0, '#ffe7a6') + P(`M950 1320 L${950 - 640 * k} 1920 L1080 1920 L1080 1320Z`, '#ffe7a6', 0, `opacity="${.35 * k}"`) +
    P(`M950 700 L${950 + w * .3} 680 L${950 + w * .3} 1340 L950 1320Z`, '#6b4a2e') + L(950, 700, 950, 1320, 8);
}
function parentShadow(k) {  // long shadow of a grown-up across the floor
  if (k <= 0) return '';
  return G(`translate(1000 1320) skewX(-38) scale(1 ${-1.2})`, P('M-60 0 L-70 -330 C-70 -420 70 -420 70 -330 L60 0Z M0 -400 m-55 0 a55 55 0 1 0 110 0 a55 55 0 1 0 -110 0', '#0b0d1a', 0, `opacity="${.6 * k}" transform="scale(1 -1) translate(0 0)"`));
}
function laptopSide(x, y, lid) {  // small laptop on the desk, side view, lid 0 (shut) .. 1 (open)
  const a = lerp(0, -105, lid) * Math.PI / 180, lx = Math.cos(a) * 170, ly = Math.sin(a) * 170;
  let s = '';
  if (lid > .2) s += P(`M${x} ${y} L${x + lx * 1.0} ${y + ly} L${x + lx + 260} ${y + ly + 120} L${x + 200} ${y + 60}Z`, LIME, 0, `opacity="${.18 * lid}"`);
  s += R(x - 10, y - 12, 190, 16, 6, '#3a4066', 6);
  s += P(`M${x} ${y - 8} L${x + lx} ${y - 8 + ly}`, 'none', 0, `stroke="${INK}" stroke-width="22" stroke-linecap="round"`) + P(`M${x} ${y - 8} L${x + lx} ${y - 8 + ly}`, 'none', 0, `stroke="#3a4066" stroke-width="11" stroke-linecap="round"`);
  return s;
}
function kidSide(x, y, k, o = {}) {   // sitting at the desk, facing right
  const hoodie = '#7457ff', r = 100; let s = '';
  s += R(-120, 40, 40, 300, 10, '#2b2f45') + R(-150, 160, 220, 34, 10, '#2b2f45');   // chair
  s += P('M-100 180 C-110 0 -60 -90 10 -90 C80 -90 110 0 100 180Z', hoodie);
  if (o.controller) s += P('M40 40 Q120 70 140 40', 'none', 58) + P('M40 40 Q120 70 140 40', 'none', 0, `stroke="${hoodie}" stroke-width="44" stroke-linecap="round"`) +
    P('M110 10 C95 60 140 70 150 50 L190 50 C200 70 245 60 230 10 C220 -10 120 -10 110 10Z', '#2b2f45', 6) + C(140, 20, 8, LIME, 3);
  else s += P('M40 20 Q150 60 220 40', 'none', 58) + P('M40 20 Q150 60 220 40', 'none', 0, `stroke="${hoodie}" stroke-width="44" stroke-linecap="round"`) + C(225, 40, 26, SKIN);
  // head profile
  let h = C(0, 0, r, SKIN) + P(`M${r * .85} ${-r * .05} L${r * 1.15} ${r * .15} L${r * .9} ${r * .25}`, SKIN, 6) +
    E(r * .5, -r * .08, 13, o.closed ? 3 : 18, '#fff', 5) + (o.closed ? '' : C(r * .58 + (o.lookBack ? -12 : 0), -r * .06, 7, INK, 0)) +
    P(`M${r * .3} ${-r * .4} L${r * .72} ${-r * .44}`, 'none', 8);
  h += o.whistle ? C(r * .7, r * .5, 10, '#7a1f2b', 5) + T(r * 1.4, -r * .2, '♪', 60, LIME, 'middle', 'DejaVu Sans') : P(`M${r * .4} ${r * .5} Q${r * .65} ${r * .62} ${r * .85} ${r * .45}`, 'none', 6);
  h += P(`M${-r} ${r * .1} C${-r * 1.15} ${-r * .9} ${-r * .5} ${-r * 1.15} 0 ${-r * 1.12} C${r * .6} ${-r * 1.15} ${r * .95} ${-r * .8} ${r * .6} ${-r * .55} C${r * .2} ${-r * .3} ${-r * .3} ${r * .2} ${-r * .55} ${r * .55} Z`, '#3b2416');
  h += P(`M${-r * .5} ${-r * 1.05} L${-r * .62} ${-r * 1.38} L${-r * .2} ${-r * 1.1} L${-r * .05} ${-r * 1.45} L${r * .25} ${-r * 1.08}`, '#3b2416');
  h += phonesBand(r) + R(-r * .2, -r * .3, 40, 74, 16, LIME, 6);
  s += G(`translate(0 -170) rotate(${o.tilt || 0})`, h);
  return G(`translate(${x} ${y}) scale(${k})`, s);
}

/* ============================ the games, redrawn in 2D ============================ */
function roundRectPt(x0, y0, w, h, r, u) {   // point on a rounded-rect loop, u 0..1 clockwise from top-left straight
  const sw = w - 2 * r, sh = h - 2 * r, q = Math.PI * r / 2, Ltot = 2 * sw + 2 * sh + 4 * q; let d = ((u % 1) + 1) % 1 * Ltot;
  const segs = [['l', x0 + r, y0, 1, 0, sw], ['a', x0 + w - r, y0 + r, -Math.PI / 2, q], ['l', x0 + w, y0 + r, 0, 1, sh], ['a', x0 + w - r, y0 + h - r, 0, q],
    ['l', x0 + w - r, y0 + h, -1, 0, sw], ['a', x0 + r, y0 + h - r, Math.PI / 2, q], ['l', x0, y0 + h - r, 0, -1, sh], ['a', x0 + r, y0 + r, Math.PI, q]];
  for (const sg of segs) { const len = sg[0] === 'l' ? sg[5] : sg[4]; if (d <= len) {
      if (sg[0] === 'l') return [sg[1] + sg[3] * d, sg[2] + sg[4] * d, Math.atan2(sg[4], sg[3])];
      const a = sg[3] + d / r; return [sg[1] + Math.cos(a) * r, sg[2] + Math.sin(a) * r, a + Math.PI / 2]; } d -= len; }
  return [x0 + r, y0, 0];
}
function car(x, y, ang, col, k = 1, label) {
  return G(`translate(${x} ${y}) rotate(${ang * 180 / Math.PI}) scale(${k})`, R(-30, -16, 60, 32, 10, col, 5) + R(4, -11, 14, 22, 4, '#bfe6ff', 3) + R(-24, -11, 10, 22, 3, 'rgba(0,0,0,.25)', 0)) +
    (label ? T(x, y - 30 * k, label, 15 * k, '#fff', 'middle', 'Chakra', `stroke="${INK}" stroke-width="4" paint-order="stroke"`) : '');
}
function palm(x, y, k) { let s = E(x + 8, y + 8, 30 * k, 12 * k, 'rgba(0,0,0,.18)', 0); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3;
  s += P(`M${x} ${y} Q${x + Math.cos(a) * 30 * k} ${y + Math.sin(a) * 30 * k - 10 * k} ${x + Math.cos(a) * 52 * k} ${y + Math.sin(a) * 52 * k}`, 'none', 0, `stroke="#2f8f3a" stroke-width="${14 * k}" stroke-linecap="round"`); }
  return s + C(x, y, 9 * k, '#8a5a2b', 4); }
function turbo(t, W, H, mode = 'race') {
  let s = R(0, 0, W, H, 0, '#e9cb8c', 0);
  for (let i = 0; i < 40; i++) { const r = rng(i + 3); s += R((r() * W).toFixed(0), (r() * H).toFixed(0), 30, 30, 4, '#ddb978', 0); }
  if (mode === 'wall') {
    const ry = H * .5, rh = Math.min(H * .3, 170), wx = W * .78;
    s += R(-20, ry - rh / 2, wx + 20, rh, 0, '#3b3f4f', 6) + L(0, ry, wx, ry, 6, '#fff', `stroke-dasharray="30 26"`);
    s += R(wx, ry - rh * .9, W * .12, rh * 1.8, 4, '#a3452b', 6);
    for (let j = 0; j < 7; j++) s += L(wx, ry - rh * .9 + j * rh * 1.8 / 7, wx + W * .12, ry - rh * .9 + j * rh * 1.8 / 7, 4);
    for (let j = 0; j < 7; j++) s += L(wx + W * .06 * (j % 2), ry - rh * .9 + j * rh * 1.8 / 7, wx + W * .06 * (j % 2), ry - rh * .9 + (j + 1) * rh * 1.8 / 7, 4);
    const P1 = 1.0, ph = (t % P1) / P1; let cx, sq = 1;
    if (ph < .55) cx = lerp(W * .08, wx - 34, eIn(ph / .55)); else if (ph < .7) { cx = wx - 34; sq = .75; } else cx = lerp(wx - 34, wx - 110, eOut((ph - .7) / .3));
    s += G(`translate(${cx} ${ry}) scale(${sq} ${2 - sq})`, car(0, 0, 0, '#ff4f6e', 1.4));
    if (ph >= .55 && ph < .9) { const k = pop(ph, .55, .12); s += G(`translate(${wx - 10} ${ry - rh * .55}) scale(${k})`, burst(0, 0, 40, 80, 9, '#ffe14d', ph * 2) + TS(0, 14, 'BONK!', 38, '#fff', 7)); }
    return s;
  }
  const x0 = W * .14, y0 = H * .16, w = W * .72, h = H * .68, r = Math.min(w, h) * .3, tw = Math.min(W, H) * .17;
  const d = `M${x0 + r} ${y0} H${x0 + w - r} A${r} ${r} 0 0 1 ${x0 + w} ${y0 + r} V${y0 + h - r} A${r} ${r} 0 0 1 ${x0 + w - r} ${y0 + h} H${x0 + r} A${r} ${r} 0 0 1 ${x0} ${y0 + h - r} V${y0 + r} A${r} ${r} 0 0 1 ${x0 + r} ${y0}Z`;
  s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${tw + 34}"/><path d="${d}" fill="none" stroke="#fff" stroke-width="${tw + 22}"/>` +
    `<path d="${d}" fill="none" stroke="#e5484d" stroke-width="${tw + 22}" stroke-dasharray="26 26"/><path d="${d}" fill="none" stroke="#3b3f4f" stroke-width="${tw}"/>` +
    `<path d="${d}" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="26 30" opacity=".8"/>`;
  s += `<rect x="${x0 + w * .55}" y="${y0 - tw / 2}" width="28" height="${tw}" fill="url(#checker)"/>`;
  s += palm(W * .5, H * .5, 1.4) + palm(W * .38, H * .42, 1.1) + palm(W * .62, H * .6, 1.2) + palm(W * .06, H * .08, 1.2) + palm(W * .94, H * .93, 1.3) + palm(W * .93, H * .1, 1);
  const cols = ['#ff4f6e', '#4fa3ff', '#ffd84d', '#8a5cff', '#3ddc84', '#ff8a3d'], names = ['YOU', 'Bot Zap', 'Bot Blip', 'Bot Turbo', 'Bot Pixel', 'Bot Mango'];
  for (let i = 0; i < 6; i++) { const u = t * (.16 + i * .006) + i * .035 + (i === 0 ? .03 : 0), lane = (i % 2 ? .22 : -.22) * tw;
    const [px, py, a] = roundRectPt(x0, y0, w, h, r, u); s += car(px + Math.cos(a + Math.PI / 2) * lane, py + Math.sin(a + Math.PI / 2) * lane, a, cols[i], Math.min(W, H) / 520, names[i]); }
  return s;
}
function ghost(x, y, k, op = 1) { return G(`translate(${x} ${y}) scale(${k})`, P('M-40 30 L-40 -10 C-40 -60 40 -60 40 -10 L40 30 L27 18 L14 30 L0 18 L-14 30 L-27 18Z', '#eef1ff', 6) + E(-14, -12, 7, 11, INK, 0) + E(14, -12, 7, 11, INK, 0) + E(0, 8, 6, 8, INK, 0), `opacity="${op}"`); }
function deadAir(t, W, H) {
  let s = R(0, 0, W, H, 0, 'url(#night)', 0) + stars(W, H * .5, 40, 11, t) + C(W * .25, H * .14, 140, 'url(#moonGlow)', 0) + C(W * .25, H * .14, 54, '#f4f1d6', 6);
  s += P(`M0 ${H * .72} Q${W * .5} ${H * .68} ${W} ${H * .73} L${W} ${H} L0 ${H}Z`, '#1c2b22');
  const hx = W * .12, hy = H * .36, hw = W * .76, hh = H * .37;
  s += P(`M${hx - 30} ${hy + 10} L${hx + hw / 2} ${hy - H * .12} L${hx + hw + 30} ${hy + 10}Z`, '#2b2140') + R(hx, hy, hw, hh, 0, '#3a2d52') + R(hx + hw * .72, hy - H * .1, 50, 90, 0, '#2b2140');
  const wins = [[.1, .12], [.42, .12], [.74, .12], [.1, .55], [.74, .55]];
  wins.forEach(([u, v], i) => { const lit = i === 1 && Math.sin(t * 9) > -.3; s += R(hx + hw * u, hy + hh * v, hw * .16, hh * .26, 4, lit ? '#ffd27a' : '#1a1830', 6) + L(hx + hw * (u + .08), hy + hh * v, hx + hw * (u + .08), hy + hh * (v + .26), 5); });
  s += R(hx + hw * .43, hy + hh * .55, hw * .14, hh * .45, 4, '#1a1226');
  const gp = (Math.sin(t * 3) + 1) / 2; s += ghost(hx + hw * .5, hy + hh * (.27 - gp * .06), Math.min(W, H) / 520, .5 + gp * .5);
  // flashlight beam sweeping from bottom right
  const ang = -2.1 + Math.sin(t * 1.6) * .25, bx = W * .84, by = H * .97, L1 = H * .8;
  s += `<path d="M${bx} ${by} L${bx + Math.cos(ang - .22) * L1} ${by + Math.sin(ang - .22) * L1} L${bx + Math.cos(ang + .22) * L1} ${by + Math.sin(ang + .22) * L1}Z" fill="url(#beam)" opacity=".55"/>`;
  s += G(`translate(${bx} ${by}) rotate(${ang * 180 / Math.PI + 90})`, R(-24, -10, 48, 130, 10, '#3a3f55') + R(-32, -30, 64, 40, 10, '#d8dce8') + E(0, -30, 26, 8, '#fff7c2', 4));
  return s;
}
function lantern(x, y, k, glowOp = 1) { return C(x, y, 70 * k, 'url(#warmGlow)', 0, `opacity="${glowOp}"`) + R(x - 22 * k, y - 30 * k, 44 * k, 60 * k, 10 * k, '#ffcf5a', 5) + L(x, y - 30 * k, x, y - 46 * k, 5) + R(x - 30 * k, y + 28 * k, 60 * k, 16 * k, 4, '#8b8fa8', 5) + R(x - 30 * k, y - 40 * k, 60 * k, 12 * k, 4, '#8b8fa8', 5); }
function lanternKeep(t, W, H) {
  let s = R(0, 0, W, H, 0, '#1e1512', 0);
  const r = rng(5); for (let i = 0; i < 50; i++) s += C(r() * W, (r() * H + t * 30 * (1 + r())) % H, 2 + r() * 3, '#ff9a3d', 0, `opacity="${.3 + r() * .5}"`);
  const pts = [[.1, -.05], [.1, .25], [.75, .25], [.75, .48], [.25, .48], [.25, .72], [.85, .72], [.85, 1.05]].map(([u, v]) => [u * W, v * H]);
  const d = 'M' + pts.map(p => p.join(' ')).join(' L');
  s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${W * .13}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#4a3a33" stroke-width="${W * .11}" stroke-linejoin="round"/>`;
  const segL = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segL.push(l); tot += l; }
  const at = u => { let d2 = u * tot; for (let i = 0; i < segL.length; i++) { if (d2 <= segL[i]) { const k = d2 / segL[i]; return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; } d2 -= segL[i]; } return pts[pts.length - 1]; };
  for (let i = 0; i < 9; i++) { const u = ((t * .07 + i * .11) % 1); const [mx, my] = at(u); s += G(`translate(${mx} ${my})`, C(0, 0, W * .022, '#8b5cf6', 5) + C(-5, -4, 3, '#fff', 0) + C(5, -4, 3, '#fff', 0)); }
  const towers = [[.3, .15], [.55, .36], [.45, .6], [.65, .6], [.12, .6], [.6, .83]];
  towers.forEach(([u, v], i) => { s += lantern(u * W, v * H, W / 600, .7 + .3 * Math.sin(t * 6 + i));
    const [mx, my] = at(((t * .07 + i * .11 + .02) % 1)); if (Math.sin(t * 8 + i * 2) > .4) s += L(u * W, v * H, mx, my, 5, '#ffe08a', 'opacity=".9"'); });
  s += R(W * .05, H * .02, W * .9, 64, 14, 'rgba(10,8,8,.7)', 5) + T(W * .5, H * .02 + 44, 'WAVE 6 / 25', 34, '#ffcf5a', 'middle', 'Chakra');
  return s;
}
function blackwater(t, W, H) {
  let s = R(0, 0, W, H, 0, 'url(#sea)', 0) + stars(W, H * .25, 30, 21, t) + C(W * .78, H * .1, 46, '#f4f1d6', 6);
  for (let j = 0; j < 9; j++) { const y = H * (.3 + j * .08); let d = `M-20 ${y}`; for (let x = -20; x <= W + 40; x += 40) d += ` Q${x + 20} ${y + Math.sin(t * 2 + x * .02 + j) * 14 - 10} ${x + 40} ${y + Math.sin(t * 2 + (x + 40) * .02 + j) * 8}`;
    s += P(d, 'none', 0, `stroke="#5fa8d8" stroke-width="5" opacity="${.25 + j * .05}" stroke-linecap="round"`); }
  s += P(`M${W * .74} ${H * .3} L${W * .82} ${H * .3} L${W * .86} ${H * .7} L${W * .7} ${H * .7}Z`, '#f4f1d6', 0, 'opacity=".12"');
  const rot = Math.sin(t * 2.1) * 4, by = H * .64 + Math.sin(t * 2.4) * 12;
  let raft = '';
  for (let i = 0; i < 6; i++) raft += R(-W * .36 + i * W * .12, -H * .09, W * .12, H * .18, 6, i % 2 ? '#9a6a3c' : '#a8774a', 5);
  raft += L(-W * .36, -H * .05, W * .36, -H * .05, 6) + L(-W * .36, H * .05, W * .36, H * .05, 6);
  raft += R(-8, -H * .38, 16, H * .33, 4, '#6b4a2e', 5) + P(`M8 ${-H * .36} Q${W * .22} ${-H * .25} 8 ${-H * .12}Z`, '#e8e0c8', 5);
  raft += lantern(W * .22, -H * .1, W / 700, .9) + L(-W * .3, -H * .02, -W * .42, H * .1, 12, '#5c3820');
  s += G(`translate(${W / 2} ${by}) rotate(${rot})`, raft);
  return s;
}
function arena(t, W, H) {
  let s = R(0, 0, W, H, 0, '#a8d8ff', 0) + R(0, H * .3, W, H * .25, 0, '#d9cbb0', 6);
  for (let i = 0; i < 6; i++) s += L(i * W / 5, H * .3, i * W / 5, H * .55, 4, '#bfb193');
  s += R(0, H * .55, W, H * .45, 0, '#8c929e', 6) + P(`M0 ${H * .8} L${W} ${H * .68}`, 'none', 0, `stroke="#ff8a3d" stroke-width="14"`);
  s += R(W * .5, H * .36, W * .45, H * .26, 4, '#4a4f5e') ; for (let i = 0; i < 9; i++) s += L(W * .52 + i * W * .045, H * .38, W * .52 + i * W * .045, H * .6, 4);
  s += R(W * .14, H * .48, W * .17, H * .1, 4, '#b07a42') + L(W * .14, H * .48, W * .31, H * .58, 5) + L(W * .31, H * .48, W * .14, H * .58, 5);
  // opponent peeking from the container
  const peek = (Math.sin(t * 3) + 1) / 2, ox = W * .5 - peek * W * .09, hit = (t % 1.2) > .55 && (t % 1.2) < .8;
  s += G(`translate(${ox} ${H * .5}) scale(${W / 500})`, R(-28, -10, 56, 90, 16, '#2fb3a5') + C(0, -40, 32, '#2fb3a5') + R(-22, -50, 44, 16, 6, '#0b0d1a', 0));
  if (hit) s += G(`translate(${ox + 30} ${H * .42})`, TS(0, 0, '+1', 54, LIME, 8));
  // crosshair
  s += C(W / 2, H * .47, 22, 'none', 0, `stroke="#fff" stroke-width="5"`) + L(W / 2 - 40, H * .47, W / 2 - 26, H * .47, 5, '#fff') + L(W / 2 + 26, H * .47, W / 2 + 40, H * .47, 5, '#fff');
  // chunky first-person blaster with recoil
  const rec = (t % .4) < .08 ? 1 : 0;
  s += G(`translate(${W * .78 + rec * 14} ${H * .9 + rec * 18}) rotate(24) scale(${-W / 560} ${W / 560})`, R(-60, -40, 260, 80, 22, '#e5484d') + R(150, -24, 90, 48, 12, '#2b2f45') + R(-20, 30, 60, 110, 16, '#2b2f45') + R(30, -60, 80, 24, 8, '#2b2f45') + R(-50, -14, 60, 20, 6, LIME, 4));
  if (rec) s += burst(W * .78 - Math.cos(.42) * 250 * W / 560, H * .9 - Math.sin(.42) * 250 * W / 560, 24 * W / 560, 64 * W / 560, 8, '#ffe14d', t * 9, 5);
  return s;
}
function oddCrowd(t, W, H) {   // the party game on a phone / panel
  let s = R(0, 0, W, H, 0, '#f5f1e8', 0) + T(W * .08, H * .09, 'ODD ⊘ CROWD', H * .05, '#1b1b1b', 'start', 'Chakra');
  s += R(W * .06, H * .14, W * .88, H * .06, 6, '#1f2a26', 0) + T(W * .1, H * .184, 'ROUND 1 / 3', H * .028, '#cfe', 'start', 'Chakra');
  s += `<text x="${W / 2}" y="${H * .33}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="${H * .055}" fill="#111">What does an elevator say</text>`;
  s += `<text x="${W / 2}" y="${H * .41}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="${H * .055}" fill="#111">when it gets a day off?</text>`;
  const v1 = Math.min(3, Math.floor(t * 1.6)), v2 = Math.min(1, Math.floor(t * .8));
  s += R(W * .06, H * .5, W * .42, H * .3, 6, '#fffdf5', 5) + `<text x="${W * .27}" y="${H * .64}" text-anchor="middle" font-family="Inter" font-weight="600" font-size="${H * .04}" fill="#111">A very confident</text><text x="${W * .27}" y="${H * .7}" text-anchor="middle" font-family="Inter" font-weight="600" font-size="${H * .04}" fill="#111">traffic cone</text>`;
  s += R(W * .52, H * .5, W * .42, H * .3, 6, '#c9b0f2', 5) + `<text x="${W * .73}" y="${H * .64}" text-anchor="middle" font-family="Inter" font-weight="600" font-size="${H * .04}" fill="#111">Grandma, but</text><text x="${W * .73}" y="${H * .7}" text-anchor="middle" font-family="Inter" font-weight="600" font-size="${H * .04}" fill="#111">on rollerblades</text>`;
  for (let i = 0; i < v1; i++) s += C(W * (.12 + i * .06), H * .86, H * .022, ['#ff4f6e', '#4fa3ff', '#ffd84d'][i], 4);
  for (let i = 0; i < v2; i++) s += C(W * (.58 + i * .06), H * .86, H * .022, '#3ddc84', 4);
  return s;
}
const MINI = { 'turbo-laps': ['Turbo Laps', turbo], 'dead-air': ['Dead Air', deadAir], 'lantern-keep': ['Lantern Keep', lanternKeep], 'blackwater': ['Blackwater Drift', blackwater], 'duelpoint': ['Duelpoint', arena], 'odd-crowd': ['Odd Crowd', oddCrowd] };
function gameCard(x, y, w, h, id, t, ex = '') {
  const [name, fn] = MINI[id];
  return `<g ${ex}>` + R(x, y, w, h, 22, '#171a2b', 6) + nest(x + 10, y + 10, w - 20, h * .66, fn(t, w - 20, h * .66)) + R(x + 10, y + 10, w - 20, h * .66, 14, 'none', 5) +
    T(x + 24, y + h * .66 + 52, name, h * .1, '#fff', 'start', 'Chakra') + R(x + w - 120, y + h * .66 + 22, 96, 42, 21, LIME, 4) + T(x + w - 72, y + h * .66 + 52, 'PLAY', 24, INK, 'middle', 'Chakra') + '</g>';
}
const logoMark = (x, y, s) => G(`translate(${x} ${y}) scale(${s})`, R(0, 0, 24, 24, 6, LIME, 1.4) + `<path d="M7 7h10v4h-4v2h4v4H7v-4h2v-2H7z" fill="${INK}"/>`);
function siteScreen(t, W, H, scroll = 0) {   // Pulsebox in a phone browser
  let s = R(0, 0, W, H, 0, '#0b0d14', 0);
  let inner = '';
  inner += logoMark(28, 120, 2.6) + `<text x="110" y="168" font-family="Chakra" font-size="50" fill="#fff">PULSE<tspan fill="${LIME}">BOX</tspan></text>`;
  inner += T(W - 30, 162, '77 GAMES', 26, '#8b93b8', 'end', 'Chakra');
  inner += R(28, 220, 130, 36, 8, LIME, 0) + T(93, 247, 'TODAY', 24, INK, 'middle', 'Chakra');
  inner += gameCard(28, 280, W - 56, 560, 'turbo-laps', t);
  inner += T(28, 920, 'TRENDING', 40, '#fff', 'start', 'Chakra');
  const ids = ['dead-air', 'lantern-keep', 'blackwater', 'duelpoint', 'odd-crowd', 'turbo-laps'];
  ids.forEach((id, i) => { inner += gameCard(28 + (i % 2) * ((W - 70) / 2 + 14), 960 + Math.floor(i / 2) * 420, (W - 70) / 2, 390, id, t + i); });
  s += G(`translate(0 ${-scroll})`, inner);
  s += R(0, 0, W, 92, 0, '#1b1f33', 0) + R(24, 18, W - 48, 58, 29, '#2a2f4a', 0) + T(W / 2, 58, '🔒 box.pulseform.org', 30, '#fff', 'middle', 'Inter', 'font-weight="700"');
  return s;
}
function phone(x, y, w, h, inner, rot = 0) {
  return G(`translate(${x} ${y}) rotate(${rot})`, R(-w / 2 - 22, -h / 2 - 22, w + 44, h + 44, 60, '#191c2c', 8) + nest(-w / 2, -h / 2, w, h, inner) + R(-w / 2, -h / 2, w, h, 40, 'none', 6) + R(-60, -h / 2 - 6, 120, 26, 13, INK, 0));
}


/* ============================ captions + frame render ============================ */
// A video page defines SC = [[startTime, drawFn(t, localT), captionY], ...] and calls startVideo(SC, CUES).
// CUES (optional) tells mix.py what music and sound effects to play: { music: [[from, to, style]], fx: [[t, name, gain]] }.
function startVideo(SC, CUES) {
  window.CUES = Object.assign({ music: [], fx: [], bpm: 100, key: 'minor' }, CUES || {});
  if (window.CUES.cuts == null) window.CUES.cuts = SC.map(s => s[0]).filter(a => a > 0);
  const capEl = document.getElementById('cap');
  function captions(t, y) {
    const c = TL.caps.find(c => t >= c.start && t < c.end);
    if (!c || y == null) { capEl.innerHTML = ''; return; }
    capEl.style.top = y + 'px';
    capEl.innerHTML = c.words.filter(w => t >= w.t - .04).map(w => { const k = eBack(clamp((t - w.t + .04) / .14)), sc = lerp(.4, 1, k);
      return `<span class="${w.hot ? 'hot' : ''}" style="transform:scale(${sc.toFixed(3)}) rotate(${w.hot ? -3 : 0}deg)">${esc(w.w)}</span>`; }).join(' ');
  }
  window.render = function (t) {
    let i = 0; for (let j = 0; j < SC.length; j++) if (t >= SC[j][0]) i = j;
    const [t0, fn, capY] = SC[i];
    document.getElementById('world').innerHTML = fn(t, t - t0);
    document.getElementById('turb').setAttribute('seed', String(Math.floor(t * 8) % 6 + 1));   // line boil, 8 fps like hand animation
    const cut = SC.some(([a]) => a > 0 && t >= a && t < a + 1 / 15);
    document.getElementById('flash').setAttribute('opacity', cut ? '.35' : '0');
    captions(t, typeof capY === 'function' ? capY(t) : capY);
  };
}
