// Illustrated 600x600 covers for the Pulsebox Originals, in the hub's house style:
// a big chunky title up top (stroke + extrusion + gradient fill), bright illustrated scene below.
const G = {};
const sh = (dx = 0, dy = 10, b = 14, c = 'rgba(0,0,0,.35)') => `<filter id="ds" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="${dx}" dy="${dy}" stdDeviation="${b}" flood-color="${c}"/></filter>`;
const rays = (cx, cy, n, c, o = .12) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, b = a + Math.PI / n; return `<path d="M${cx} ${cy} L${cx + Math.cos(a) * 900} ${cy + Math.sin(a) * 900} L${cx + Math.cos(b) * 900} ${cy + Math.sin(b) * 900}Z" fill="${c}" opacity="${o}"/>`; }).join('');
const sparkle = (x, y, r, c = '#fff') => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="${c}"/>`;
const dots = (n, seed, c, rmax = 3, y0 = 0, y1 = 600) => { let s = seed, r = () => (s = (s * 16807) % 2147483647) / 2147483647; return Array.from({ length: n }, () => `<circle cx="${r() * 600}" cy="${y0 + r() * (y1 - y0)}" r="${.8 + r() * rmax}" fill="${c}" opacity="${.3 + r() * .6}"/>`).join(''); };

G['baggage-panic'] = {
  t: 'BAGGAGE<br>PANIC!', f: 'Luckiest Guy', size: 104, fill: ['#ffffff', '#ffd23f'], stroke: '#5a1d05', ext: '#e0642a', rot: -4,
  svg: `<defs>${sh()}<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a3c"/><stop offset=".55" stop-color="#ff5f7a"/><stop offset="1" stop-color="#7b3fe4"/></linearGradient></defs>
  <rect width="600" height="600" fill="url(#bg)"/>${rays(300, 420, 18, '#fff', .09)}
  <path d="M0 520 Q300 470 600 520 V600 H0Z" fill="#3a1f6e" opacity=".55"/>
  <g filter="url(#ds)" transform="translate(300 430) rotate(-6) scale(.92)">
    <rect x="-200" y="-40" width="400" height="190" rx="26" fill="#2b6fd6"/><rect x="-200" y="-40" width="400" height="190" rx="26" fill="none" stroke="#174a9c" stroke-width="8"/>
    <rect x="-186" y="-26" width="372" height="162" rx="16" fill="#123a7a"/>
    <path d="M-200 -40 L-170 -170 H170 L200 -40Z" fill="#3a86ff"/><path d="M-170 -170 H170 L182 -120 H-182Z" fill="#5b9dff"/>
    <rect x="-40" y="-196" width="80" height="34" rx="12" fill="none" stroke="#174a9c" stroke-width="12"/>
    <rect x="-176" y="-16" width="96" height="62" rx="8" fill="#ffd23f"/><circle cx="-128" cy="15" r="20" fill="#2a2a3a"/><circle cx="-128" cy="15" r="11" fill="#7cc8ff"/>
    <rect x="-72" y="-16" width="62" height="140" rx="8" fill="#ff4d6a"/><rect x="-66" y="0" width="50" height="10" fill="#ff8aa0"/><rect x="-66" y="22" width="50" height="10" fill="#ff8aa0"/>
    <rect x="-2" y="-16" width="128" height="62" rx="8" fill="#38d39f"/><rect x="10" y="-6" width="104" height="8" rx="4" fill="#9ff0d4"/>
    <rect x="-176" y="54" width="96" height="70" rx="8" fill="#a066ff"/><path d="M-160 64 h64 M-160 80 h64 M-160 96 h64" stroke="#d2b5ff" stroke-width="6"/>
    <rect x="-2" y="54" width="60" height="70" rx="8" fill="#ff9f1c"/><rect x="66" y="54" width="60" height="70" rx="8" fill="#5bc0ff"/>
    <rect x="134" y="-16" width="44" height="140" rx="8" fill="#ffe66d"/>
  </g>
  <g filter="url(#ds)" transform="translate(470 250) rotate(18)"><rect x="-26" y="-60" width="52" height="120" rx="10" fill="#ff4d6a"/><path d="M-26 -30 h52 M-26 0 h52 M-26 30 h52" stroke="#c42647" stroke-width="5"/></g>
  <g filter="url(#ds)" transform="translate(120 255) rotate(-20)"><rect x="-55" y="-34" width="110" height="68" rx="10" fill="#ffd23f"/><circle r="22" fill="#2a2a3a"/><circle r="12" fill="#7cc8ff"/><rect x="26" y="-30" width="18" height="10" rx="3" fill="#fff"/></g>
  <g filter="url(#ds)" transform="translate(520 470) rotate(-12)"><path d="M-30 -40 h40 v50 h30 v30 h-70Z" fill="#8a4b2a"/><path d="M-30 -40 h40 v50 h30 v30 h-70Z" fill="none" stroke="#5a2d14" stroke-width="5"/></g>
  ${sparkle(90, 470, 16)}${sparkle(540, 180, 12)}${sparkle(60, 350, 9)}`
};

G['switchyard'] = {
  t: 'SWITCH<br>YARD', f: 'Bungee', size: 104, fill: ['#ffffff', '#ffd23f'], stroke: '#14243a', ext: '#ff7a1a', rot: -3,
  svg: `<defs>${sh()}<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd8ff"/><stop offset=".42" stop-color="#bff0ff"/><stop offset=".43" stop-color="#6cc56a"/><stop offset="1" stop-color="#2f8f4e"/></linearGradient></defs>
  <rect width="600" height="600" fill="url(#bg)"/>
  <circle cx="500" cy="80" r="46" fill="#fff6b0"/><ellipse cx="120" cy="120" rx="70" ry="22" fill="#fff" opacity=".85"/><ellipse cx="420" cy="170" rx="56" ry="16" fill="#fff" opacity=".7"/>
  <path d="M0 262 Q150 230 300 258 T600 250 V270 H0Z" fill="#4fa957"/>
  <g stroke-linecap="round" fill="none">
    <path d="M-20 470 H620" stroke="#6b4a2a" stroke-width="34"/><path d="M-20 470 H620" stroke="#d9d2c4" stroke-width="22" stroke-dasharray="6 18"/>
    <path d="M150 470 Q260 470 330 380 T520 300" stroke="#6b4a2a" stroke-width="30"/><path d="M150 470 Q260 470 330 380 T520 300" stroke="#d9d2c4" stroke-width="18" stroke-dasharray="6 16"/>
    <path d="M330 470 Q420 470 470 540 T620 590" stroke="#6b4a2a" stroke-width="30"/><path d="M330 470 Q420 470 470 540 T620 590" stroke="#d9d2c4" stroke-width="18" stroke-dasharray="6 16"/>
  </g>
  <g filter="url(#ds)"><rect x="470" y="268" width="110" height="56" rx="8" fill="#ff8a2a"/><path d="M462 270 L525 236 L588 270Z" fill="#c94f12"/><rect x="490" y="286" width="22" height="22" fill="#ffe1a8"/><rect x="530" y="286" width="22" height="22" fill="#ffe1a8"/></g>
  <g filter="url(#ds)" transform="translate(32 420)">
    <rect x="0" y="0" width="150" height="58" rx="14" fill="#ff7a1a"/><rect x="104" y="-22" width="46" height="40" rx="8" fill="#ff7a1a"/><rect x="112" y="-14" width="30" height="22" rx="4" fill="#bff0ff"/>
    <rect x="18" y="-18" width="18" height="24" rx="4" fill="#3a3a4a"/><circle cx="30" cy="62" r="14" fill="#2a2a3a"/><circle cx="80" cy="62" r="14" fill="#2a2a3a"/><circle cx="124" cy="62" r="14" fill="#2a2a3a"/><circle cx="150" cy="20" r="8" fill="#fff6b0"/>
  </g>
  <g filter="url(#ds)" transform="translate(372 330) rotate(-26)">
    <rect x="0" y="0" width="130" height="52" rx="14" fill="#2a8cff"/><rect x="88" y="-20" width="42" height="36" rx="8" fill="#2a8cff"/><rect x="96" y="-13" width="26" height="20" rx="4" fill="#bff0ff"/>
    <circle cx="28" cy="56" r="13" fill="#2a2a3a"/><circle cx="72" cy="56" r="13" fill="#2a2a3a"/><circle cx="110" cy="56" r="13" fill="#2a2a3a"/>
  </g>
  <g filter="url(#ds)" transform="translate(300 470)"><circle r="34" fill="#14243a"/><circle r="27" fill="#ffd23f"/><text y="11" text-anchor="middle" font-family="Bungee" font-size="32" fill="#14243a">2</text></g>
  <g transform="translate(250 330)"><rect x="-6" y="0" width="12" height="90" fill="#3a3a4a"/><rect x="-20" y="-50" width="40" height="64" rx="10" fill="#14243a"/><circle cy="-34" r="10" fill="#ff3d3d"/><circle cy="-6" r="10" fill="#39ff88"/></g>`
};

G['potion-protocol'] = {
  t: 'POTION<br>PROTOCOL', f: 'Lilita One', size: 96, fill: ['#ffffff', '#e2b8ff'], stroke: '#2a0f4a', ext: '#9b3dff', rot: -3,
  svg: `<defs>${sh()}<radialGradient id="bg" cx=".5" cy=".7" r=".8"><stop offset="0" stop-color="#8b4dff"/><stop offset=".6" stop-color="#3b1a8a"/><stop offset="1" stop-color="#170b3a"/></radialGradient>
  <linearGradient id="l1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cff9a"/><stop offset="1" stop-color="#16b85a"/></linearGradient>
  <linearGradient id="l2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8ad8"/><stop offset="1" stop-color="#d1238f"/></linearGradient>
  <linearGradient id="l3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ce8ff"/><stop offset="1" stop-color="#1a86d6"/></linearGradient></defs>
  <rect width="600" height="600" fill="url(#bg)"/>${dots(70, 7, '#e2c8ff', 2.4)}
  <rect x="0" y="508" width="600" height="92" fill="#5a2d14"/><rect x="0" y="500" width="600" height="16" fill="#8a4b2a"/>
  <g filter="url(#ds)">
    <g transform="translate(150 380)"><path d="M-22 -110 h44 v50 Q70 -40 70 20 Q70 120 0 120 Q-70 120 -70 20 Q-70 -40 -22 -60Z" fill="#ffffff" opacity=".25"/><path d="M-62 10 Q-62 112 0 112 Q62 112 62 10 Q30 0 0 12 Q-30 24 -62 10Z" fill="url(#l1)"/><rect x="-28" y="-128" width="56" height="24" rx="6" fill="#a0663a"/><path d="M-22 -110 h44 v50 Q70 -40 70 20 Q70 120 0 120 Q-70 120 -70 20 Q-70 -40 -22 -60Z" fill="none" stroke="#fff" stroke-width="6" opacity=".9"/><circle cx="-20" cy="50" r="9" fill="#d8ffe3"/><circle cx="16" cy="80" r="6" fill="#d8ffe3"/><circle cx="-34" cy="-10" r="6" fill="#d8ffe3" opacity=".8"/></g>
    <g transform="translate(300 350)"><path d="M-26 -140 h52 v70 L86 70 Q96 130 40 130 H-40 Q-96 130 -86 70 L-26 -70Z" fill="#fff" opacity=".25"/><path d="M-72 40 L-86 70 Q-96 130 -40 130 H40 Q96 130 86 70 L72 40 Q36 30 0 44 Q-36 56 -72 40Z" fill="url(#l2)"/><rect x="-32" y="-160" width="64" height="26" rx="6" fill="#a0663a"/><path d="M-26 -140 h52 v70 L86 70 Q96 130 40 130 H-40 Q-96 130 -86 70 L-26 -70Z" fill="none" stroke="#fff" stroke-width="6"/><circle cx="18" cy="84" r="10" fill="#ffd9f1"/><circle cx="-24" cy="104" r="6" fill="#ffd9f1"/></g>
    <g transform="translate(452 390)"><rect x="-48" y="-80" width="96" height="190" rx="22" fill="#fff" opacity=".25"/><rect x="-42" y="0" width="84" height="104" rx="18" fill="url(#l3)"/><rect x="-26" y="-104" width="52" height="26" rx="6" fill="#a0663a"/><rect x="-48" y="-80" width="96" height="190" rx="22" fill="none" stroke="#fff" stroke-width="6"/><circle cx="-12" cy="40" r="8" fill="#d6f8ff"/><circle cx="16" cy="66" r="6" fill="#d6f8ff"/></g>
  </g>
  <circle cx="150" cy="232" r="10" fill="#7cff9a" opacity=".8"/><circle cx="168" cy="200" r="7" fill="#7cff9a" opacity=".6"/><circle cx="300" cy="170" r="12" fill="#ff8ad8" opacity=".8"/><circle cx="318" cy="134" r="8" fill="#ff8ad8" opacity=".55"/>
  <g transform="translate(300 556)"><circle cx="-60" r="15" fill="#ffd23f"/><circle cx="0" r="15" fill="#ffd23f"/><circle cx="60" r="15" fill="none" stroke="#ffd23f" stroke-width="6"/></g>
  ${sparkle(70, 300, 14, '#ffe9a8')}${sparkle(540, 260, 16, '#ffe9a8')}${sparkle(520, 470, 9)}`
};

G['safecracker'] = {
  t: 'SAFE<br>CRACKER', f: 'Black Ops One', size: 104, fill: ['#fff7d6', '#ffc93c'], stroke: '#1a1408', ext: '#8a5a12', rot: -3,
  svg: `<defs>${sh(0, 14, 18, 'rgba(0,0,0,.55)')}<radialGradient id="bg" cx=".5" cy=".62" r=".75"><stop offset="0" stop-color="#2f6f7a"/><stop offset=".7" stop-color="#14323c"/><stop offset="1" stop-color="#0a161c"/></radialGradient>
  <radialGradient id="dial" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fff2c4"/><stop offset=".5" stop-color="#e2b04a"/><stop offset="1" stop-color="#8a5a12"/></radialGradient>
  <linearGradient id="door" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fb4c0"/><stop offset="1" stop-color="#4a5e6a"/></linearGradient></defs>
  <rect width="600" height="600" fill="url(#bg)"/><path d="M200 0 L120 600 H480 L400 0Z" fill="#fff6c8" opacity=".07"/>
  <g filter="url(#ds)">
    <rect x="80" y="210" width="440" height="380" rx="30" fill="url(#door)"/><rect x="100" y="230" width="400" height="340" rx="22" fill="none" stroke="#2a3a44" stroke-width="6"/>
    ${[[118, 248], [482, 248], [118, 552], [482, 552]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" fill="#2a3a44"/><circle cx="${x - 3}" cy="${y - 3}" r="5" fill="#c8d6de"/>`).join('')}
    <g transform="translate(300 400)"><circle r="138" fill="#1a262e"/><circle r="126" fill="url(#dial)"/>
      ${Array.from({ length: 60 }, (_, i) => { const a = i / 60 * Math.PI * 2, r0 = i % 5 ? 108 : 98; return `<line x1="${Math.sin(a) * r0}" y1="${-Math.cos(a) * r0}" x2="${Math.sin(a) * 120}" y2="${-Math.cos(a) * 120}" stroke="#4a2e08" stroke-width="${i % 5 ? 2 : 4}"/>`; }).join('')}
      <circle r="78" fill="#2a1a06"/><circle r="70" fill="#d9a23a"/><rect x="-14" y="-62" width="28" height="124" rx="12" fill="#8a5a12"/><circle r="16" fill="#fff2c4"/></g>
    <path d="M300 238 l-16 -26 h32Z" fill="#ff3d3d"/>
    <rect x="452" y="330" width="40" height="140" rx="16" fill="#2a3a44"/><rect x="460" y="338" width="24" height="124" rx="10" fill="#c8d6de"/>
  </g>
  <g transform="translate(64 380)">${[0, 1, 2, 3, 4].map(i => `<rect x="${i * 14}" y="${40 - i * 12}" width="10" height="${20 + i * 12}" rx="3" fill="${i < 4 ? '#39ff88' : '#2a3a44'}"/>`).join('')}</g>
  ${sparkle(470, 228, 16, '#fff2c4')}${sparkle(196, 300, 10, '#fff2c4')}`
};

G['pocket-jury'] = {
  t: 'POCKET<br>JURY', f: 'Chewy', size: 112, fill: ['#ffffff', '#ffd9a8'], stroke: '#3a1a08', ext: '#c4532a', rot: -4,
  svg: `<defs>${sh()}<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffcf7a"/><stop offset=".6" stop-color="#f08a4a"/><stop offset="1" stop-color="#8a3a2a"/></linearGradient></defs>
  <rect width="600" height="600" fill="url(#bg)"/>${rays(300, 380, 16, '#fff', .1)}
  <rect x="40" y="430" width="520" height="170" rx="10" fill="#6a3418"/><rect x="40" y="420" width="520" height="26" rx="8" fill="#8a4b2a"/>
  <g filter="url(#ds)" transform="translate(150 330) rotate(-8)"><rect x="-80" y="-100" width="160" height="200" rx="12" fill="#fff8ea"/><rect x="-60" y="-78" width="120" height="14" rx="6" fill="#c4532a"/><path d="M-60 -44 h120 M-60 -22 h120 M-60 0 h90 M-60 22 h120 M-60 44 h70" stroke="#c8b49a" stroke-width="8" stroke-linecap="round"/><circle cx="46" cy="66" r="22" fill="none" stroke="#e0302a" stroke-width="6"/></g>
  <g filter="url(#ds)" transform="translate(420 350) rotate(9)"><rect x="-74" y="-90" width="148" height="180" rx="12" fill="#fff8ea"/><circle cy="-20" r="46" fill="#ffd9a8"/><path d="M-46 -20 a46 46 0 0 0 92 0Z" fill="#e8a86a"/><path d="M-40 -28 q40 -30 80 0" stroke="#c4532a" stroke-width="10" fill="none" stroke-linecap="round"/><rect x="-54" y="44" width="108" height="12" rx="6" fill="#c8b49a"/><text x="0" y="-62" text-anchor="middle" font-family="Chewy" font-size="22" fill="#8a3a2a">EXHIBIT A</text></g>
  <g filter="url(#ds)" transform="translate(300 300) rotate(-30)"><rect x="-90" y="-12" width="180" height="24" rx="10" fill="#8a4b2a"/><rect x="70" y="-46" width="56" height="92" rx="16" fill="#a0663a"/><rect x="74" y="-46" width="48" height="16" rx="6" fill="#c48a5a"/><rect x="74" y="30" width="48" height="16" rx="6" fill="#c48a5a"/></g>
  <g filter="url(#ds)" transform="translate(300 488)"><ellipse rx="72" ry="16" fill="#8a4b2a"/><rect x="-60" y="-30" width="120" height="30" rx="10" fill="#a0663a"/></g>
  ${sparkle(76, 470, 14)}${sparkle(530, 200, 12)}${sparkle(560, 470, 9)}`
};

G['cloudwash'] = {
  t: 'CLOUD<br>WASH', f: 'Titan One', size: 112, fill: ['#ffffff', '#9fe8ff'], stroke: '#0a2a4a', ext: '#2a7fd6', rot: -3,
  svg: `<defs>${sh()}<clipPath id="wall"><rect x="40" y="190" width="520" height="380" rx="18"/></clipPath>
  <filter id="grime"><feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="4" seed="3"/><feColorMatrix values="0 0 0 0 .38  0 0 0 0 .29  0 0 0 0 .17  3.4 0 0 0 -.75"/></filter>
  <mask id="clean"><rect width="600" height="600" fill="#fff"/><path d="M120 600 C150 470 240 400 330 380 C430 360 470 300 560 250 L600 600Z" fill="#000"/><circle cx="360" cy="380" r="90" fill="#000"/></mask></defs>
  <rect width="600" height="600" fill="#bdeeff"/>${rays(300, 300, 16, '#fff', .3)}
  <g filter="url(#ds)"><rect x="40" y="190" width="520" height="380" rx="18" fill="#7fd0ff"/></g>
  <g clip-path="url(#wall)">
    <rect x="40" y="190" width="520" height="380" fill="#7fd0ff"/><circle cx="470" cy="260" r="44" fill="#fff6b0"/>
    <ellipse cx="160" cy="250" rx="70" ry="22" fill="#fff"/><ellipse cx="380" cy="300" rx="60" ry="18" fill="#fff"/>
    <path d="M40 470 Q200 420 340 460 T600 440 V600 H40Z" fill="#5bc06a"/><path d="M40 520 Q240 490 600 520 V600 H40Z" fill="#3a9fd6"/>
    <g transform="translate(250 430)"><rect x="-70" y="-70" width="140" height="100" fill="#ffb36e"/><path d="M-90 -66 L0 -140 L90 -66Z" fill="#e0482a"/><rect x="-20" y="-30" width="40" height="60" fill="#8a4b2a"/><rect x="-56" y="-50" width="30" height="28" fill="#bff0ff"/><rect x="26" y="-50" width="30" height="28" fill="#bff0ff"/></g>
    <g transform="translate(470 470)"><rect x="-8" y="-20" width="16" height="50" fill="#8a4b2a"/><circle cy="-40" r="38" fill="#2f9f4e"/></g>
    <rect x="40" y="190" width="520" height="380" filter="url(#grime)" mask="url(#clean)"/>
  </g>
  <g filter="url(#ds)" transform="translate(520 180) rotate(30)"><rect x="-14" y="0" width="28" height="80" rx="8" fill="#ffd23f"/><rect x="-22" y="70" width="44" height="60" rx="10" fill="#ff7a1a"/><rect x="-6" y="-40" width="12" height="44" fill="#9aa6b8"/></g>
  <path d="M500 150 L380 330 L420 350Z" fill="#e6fbff" opacity=".85"/>
  ${Array.from({ length: 16 }, (_, i) => `<circle cx="${380 + (i * 37) % 120 - 30}" cy="${330 + (i * 53) % 90}" r="${3 + i % 4}" fill="#fff" opacity=".9"/>`).join('')}
  ${sparkle(250, 330, 18)}${sparkle(160, 470, 12)}${sparkle(330, 520, 10)}`
};

G['circuit-courier'] = {
  t: 'CIRCUIT<br>COURIER', f: 'Bungee', size: 92, fill: ['#ffffff', '#7cf2ff'], stroke: '#0a1a30', ext: '#1aa0d6', rot: -3,
  svg: `<defs>${sh()}<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a5fd6"/><stop offset="1" stop-color="#14205a"/></linearGradient></defs>
  <rect width="600" height="600" fill="url(#bg)"/>
  <g transform="translate(300 420) scale(1 .55) rotate(45)">
    ${Array.from({ length: 36 }, (_, i) => { const x = i % 6, y = i / 6 | 0, wall = [7, 8, 20, 27].includes(i), go = i === 35, path = [0, 1, 2, 3, 9, 15, 21, 22, 23, 29, 35].includes(i); return `<rect x="${(x - 3) * 64 + 3}" y="${(y - 3) * 64 + 3}" width="58" height="58" rx="10" fill="${go ? '#39d97a' : wall ? '#3a2a5a' : path ? '#3a86ff' : '#1f3c8a'}"/>`; }).join('')}
  </g>
  <g transform="translate(300 420) scale(1 .55) rotate(45)" fill="none" stroke="#ffd23f" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 22"><path d="M-160 -160 H32 V32 H160 V160"/></g>
  <g filter="url(#ds)" transform="translate(300 535)"><rect x="-34" y="-40" width="68" height="40" rx="8" fill="#ffffff" opacity=".0"/><text y="0" text-anchor="middle" font-family="Bungee" font-size="30" fill="#0a3a1a">GO</text></g>
  <g filter="url(#ds)" transform="translate(178 330)">
    <ellipse cy="64" rx="56" ry="14" fill="#000" opacity=".25"/>
    <rect x="-46" y="-30" width="92" height="84" rx="22" fill="#e8eef4"/><rect x="-36" y="-18" width="72" height="40" rx="12" fill="#14243a"/><circle cx="-14" cy="2" r="9" fill="#39ff88"/><circle cx="14" cy="2" r="9" fill="#39ff88"/>
    <rect x="-6" y="-56" width="12" height="26" fill="#e8eef4"/><circle cy="-60" r="10" fill="#ff3d8b"/>
    <g transform="translate(26 -70) rotate(8)"><rect x="-30" y="-26" width="60" height="50" rx="6" fill="#ffb347"/><path d="M-30 -6 h60 M0 -26 v50" stroke="#c4741a" stroke-width="6"/></g>
    <circle cx="-30" cy="58" r="12" fill="#2a2a3a"/><circle cx="30" cy="58" r="12" fill="#2a2a3a"/>
  </g>
  <g transform="translate(470 250)" filter="url(#ds)"><rect x="-58" y="-30" width="116" height="34" rx="10" fill="#ffd23f"/><text y="-5" text-anchor="middle" font-family="Bungee" font-size="20" fill="#14243a">↑ ↑ ↻</text><rect x="-58" y="12" width="116" height="34" rx="10" fill="#ff8ad8"/><text y="37" text-anchor="middle" font-family="Bungee" font-size="20" fill="#14243a">×3</text></g>
  ${sparkle(84, 470, 14, '#7cf2ff')}${sparkle(540, 420, 10, '#7cf2ff')}${dots(30, 11, '#bfe8ff', 2, 200, 300)}`
};


if (typeof module !== 'undefined') module.exports = G;
