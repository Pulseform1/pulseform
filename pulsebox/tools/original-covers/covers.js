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

G['magnet-rescue'] = {
  t: 'MAGNET<br>RESCUE', f: 'Russo One', size: 100, fill: ['#ffffff', '#ffd23f'], stroke: '#14243a', ext: '#e0302a', rot: -4, italic: 1,
  svg: `<defs>${sh()}<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb36e"/><stop offset=".55" stop-color="#ff7a8a"/><stop offset="1" stop-color="#5a3fa8"/></linearGradient></defs>
  <rect width="600" height="600" fill="url(#bg)"/>${rays(300, 640, 14, '#fff', .08)}
  <rect x="0" y="520" width="600" height="80" fill="#2a2f45"/><rect x="0" y="512" width="600" height="12" fill="#4a5070"/>
  <g>${Array.from({ length: 7 }, (_, i) => `<rect x="${404 + i * 26}" y="500" width="14" height="22" fill="${i % 2 ? '#14243a' : '#ffd23f'}"/>`).join('')}</g>
  <rect x="0" y="228" width="600" height="26" fill="#ffd23f"/><path transform="translate(0 50)" d="M0 178 L30 204 L60 178 L90 204 L120 178 L150 204 L180 178 L210 204 L240 178 L270 204 L300 178 L330 204 L360 178 L390 204 L420 178 L450 204 L480 178 L510 204 L540 178 L570 204 L600 178" stroke="#c48a10" stroke-width="5" fill="none"/>
  <g filter="url(#ds)"><rect x="206" y="216" width="96" height="50" rx="10" fill="#14243a"/><circle cx="230" cy="241" r="10" fill="#ffd23f"/><circle cx="278" cy="241" r="10" fill="#ffd23f"/></g>
  <path d="M254 266 Q262 300 300 330" stroke="#2a2a3a" stroke-width="7" fill="none"/>
  <g filter="url(#ds)" transform="translate(308 350) rotate(-12) scale(1.3)">
    <path d="M-56 -14 a56 56 0 0 1 112 0 v40 h-34 v-40 a22 22 0 0 0 -44 0 v40 h-34Z" fill="#ff3d3d"/><rect x="-56" y="20" width="34" height="20" fill="#e8eef4"/><rect x="22" y="20" width="34" height="20" fill="#e8eef4"/>
    <path d="M-80 -30 l-14 -10 M80 -30 l14 -10 M-84 0 h-18 M84 0 h18" stroke="#fff6b0" stroke-width="5" stroke-linecap="round"/>
    <g transform="translate(0 92) rotate(10)"><rect x="-38" y="-36" width="76" height="62" rx="16" fill="#7cc8ff"/><rect x="-28" y="-26" width="56" height="34" rx="10" fill="#14243a"/><circle cx="-12" cy="-9" r="7" fill="#39ff88"/><circle cx="12" cy="-9" r="7" fill="#39ff88"/><rect x="-6" y="-56" width="12" height="20" fill="#7cc8ff"/><circle cy="-60" r="8" fill="#ffd23f"/><rect x="-30" y="26" width="18" height="24" rx="6" fill="#4a90d6"/><rect x="12" y="26" width="18" height="24" rx="6" fill="#4a90d6"/></g>
  </g>
  <g filter="url(#ds)" transform="translate(110 476) scale(1.5)"><rect x="-28" y="-26" width="56" height="48" rx="12" fill="#ffd23f"/><rect x="-20" y="-18" width="40" height="24" rx="8" fill="#14243a"/><circle cx="-8" cy="-6" r="5" fill="#39ff88"/><circle cx="8" cy="-6" r="5" fill="#39ff88"/></g>
  <g filter="url(#ds)" transform="translate(500 470) scale(1.4)"><rect x="-26" y="-24" width="52" height="46" rx="12" fill="#a066ff"/><rect x="-18" y="-16" width="36" height="22" rx="8" fill="#14243a"/><circle cx="-7" cy="-5" r="5" fill="#39ff88"/><circle cx="7" cy="-5" r="5" fill="#39ff88"/></g>
  ${sparkle(90, 290, 14)}${sparkle(520, 280, 11)}`
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

G['bid-bandits'] = {
  t: 'BID<br>BANDITS', f: 'Bowlby One', size: 104, fill: ['#ffffff', '#b8ff6a'], stroke: '#0a2010', ext: '#2a8a3a', rot: -4,
  svg: `<defs>${sh()}<radialGradient id="glow" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#ffe9a8"/><stop offset=".6" stop-color="#ffb347"/><stop offset="1" stop-color="#8a4a12"/></radialGradient>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3a5a"/><stop offset="1" stop-color="#121a2a"/></linearGradient></defs>
  <rect width="600" height="600" fill="url(#bg)"/>
  <g filter="url(#ds)"><rect x="70" y="200" width="460" height="380" rx="8" fill="#5a6a80"/>
    <rect x="96" y="330" width="408" height="250" fill="url(#glow)"/>
    <g transform="translate(300 470)"><rect x="-150" y="20" width="110" height="90" rx="6" fill="#8a5a2a"/><rect x="-140" y="30" width="90" height="10" fill="#a87a4a"/>
      <path d="M-20 110 L-10 0 Q40 -40 70 0 L90 110Z" fill="#e0302a"/><circle cx="34" cy="-20" r="26" fill="#2a2a3a"/><circle cx="34" cy="-20" r="10" fill="#9aa6b8"/>
      <rect x="100" y="-10" width="56" height="120" rx="20" fill="#ffd23f"/><rect x="116" y="-50" width="24" height="46" fill="#c49a2a"/></g>
    <g>${Array.from({ length: 6 }, (_, i) => `<rect x="96" y="${226 + i * 18}" width="408" height="14" fill="${i % 2 ? '#8a9ab0' : '#a8b8cc'}"/>`).join('')}</g>
    <rect x="96" y="330" width="408" height="16" fill="#3a4a60"/><rect x="270" y="334" width="60" height="22" rx="6" fill="#ffd23f"/>
  </g>
  <g filter="url(#ds)" transform="translate(110 210) rotate(-16)"><rect x="-56" y="-30" width="112" height="60" rx="8" fill="#4ac46a"/><rect x="-48" y="-22" width="96" height="44" rx="4" fill="none" stroke="#2a8a3a" stroke-width="4"/><text y="12" text-anchor="middle" font-family="Bowlby One" font-size="30" fill="#e8ffd8">$</text></g>
  <g filter="url(#ds)" transform="translate(500 230) rotate(14)"><circle r="40" fill="#fff"/><circle r="32" fill="#e0302a"/><text y="12" text-anchor="middle" font-family="Bowlby One" font-size="32" fill="#fff">7</text><rect x="-8" y="38" width="16" height="70" rx="6" fill="#8a5a2a"/></g>
  <text x="300" y="312" text-anchor="middle" font-family="Bowlby One" font-size="28" fill="#ffd23f" opacity=".9">LOT 04</text>
  ${sparkle(240, 400, 14, '#fff6c8')}${sparkle(380, 380, 10, '#fff6c8')}${sparkle(320, 430, 7)}`
};

G['foldscape'] = {
  t: 'FOLD<br>SCAPE', f: 'Fredoka', w: 700, size: 116, fill: ['#ffffff', '#ffd9b0'], stroke: '#3a1a08', ext: '#e0642a', rot: -3,
  svg: `<defs>${sh()}<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd0e8"/><stop offset="1" stop-color="#a8b8ff"/></linearGradient>
  <pattern id="pp" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#fff6e4"/><path d="M0 0 H40 V40" fill="none" stroke="#ead8b8" stroke-width="1.5"/></pattern></defs>
  <rect width="600" height="600" fill="url(#bg)"/>${dots(40, 5, '#fff', 3)}
  <g filter="url(#ds)">
    <path d="M60 240 L300 210 L300 580 L60 560Z" fill="url(#pp)"/><path d="M300 210 L540 240 L540 560 L300 580Z" fill="#f4e6c8"/>
    <path d="M300 210 L420 160 L540 240 L300 210Z" fill="#fff6e4"/><path d="M300 210 L420 160 L420 200Z" fill="#e8d4ae"/>
    <line x1="300" y1="210" x2="300" y2="580" stroke="#d8c09a" stroke-width="3"/>
  </g>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M110 520 Q110 420 190 420 T300 330" stroke="#c49a6a" stroke-width="26"/><path d="M300 330 Q380 300 420 380 T500 300" stroke="#c49a6a" stroke-width="26"/>
    <path d="M110 520 Q110 420 190 420 T300 330 Q380 300 420 380 T500 300" stroke="#ffe0a8" stroke-width="8" stroke-dasharray="4 14"/>
  </g>
  <g transform="translate(120 300)"><circle r="30" fill="#5bc06a"/><circle cx="34" cy="10" r="22" fill="#4aa85a"/></g><g transform="translate(460 470)"><circle r="28" fill="#5bc06a"/><circle cx="-30" cy="10" r="20" fill="#4aa85a"/></g>
  <path d="M340 470 q20 -30 50 -10 q30 20 60 0" stroke="#7cc8ff" stroke-width="16" fill="none" stroke-linecap="round"/>
  <g filter="url(#ds)" transform="translate(500 286)"><path d="M-40 10 Q0 -50 40 10Z" fill="#8a4b2a"/><ellipse cy="10" rx="44" ry="10" fill="#6a3418"/><path d="M-14 10 Q0 -12 14 10Z" fill="#2a1a08"/></g>
  <g filter="url(#ds)" transform="translate(112 500)">
    <path d="M-34 10 Q-40 -20 -10 -24 L20 -24 Q40 -20 36 10 Q30 24 0 24 Q-28 24 -34 10Z" fill="#ff7a1a"/>
    <path d="M14 -24 L22 -48 L32 -22Z M-8 -24 L-2 -48 L8 -24Z" fill="#ff7a1a"/><path d="M18 -30 l5 -12 4 10Z M-4 -30 l2 -12 5 12Z" fill="#2a1a08"/>
    <path d="M-34 6 Q-62 -6 -58 -30 Q-46 -10 -30 -6Z" fill="#ff7a1a"/><path d="M-58 -30 Q-56 -20 -48 -16 L-54 -26Z" fill="#fff"/>
    <ellipse cx="18" cy="2" rx="14" ry="10" fill="#fff"/><circle cx="6" cy="-10" r="4" fill="#2a1a08"/><circle cx="24" cy="-10" r="4" fill="#2a1a08"/><circle cx="30" cy="0" r="4" fill="#2a1a08"/>
  </g>
  <path d="M420 160 L470 120" stroke="#fff" stroke-width="4" stroke-dasharray="6 8" opacity=".9"/><path d="M462 112 l14 6 -10 12Z" fill="#fff"/>
  ${sparkle(560, 200, 14)}${sparkle(60, 200, 10)}${sparkle(300, 600 - 40, 8)}`
};
if (typeof module !== 'undefined') module.exports = G;
