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

if (typeof module !== 'undefined') module.exports = G;
