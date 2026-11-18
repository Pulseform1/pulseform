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

if (typeof module !== 'undefined') module.exports = G;
