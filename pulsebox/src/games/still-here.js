/* Still Here: first-person co-op horror for 1 to 4 players, each on their own device (rooms relay through /api/room).
   Every floor of the building is generated from a seed the whole room shares. Find the fuses, power the elevator, go down.
   The host's game runs the monsters: the Hollow hunts by sight and sound, the dolls only move while nobody looks at them.
   Scares are local to each player, so nobody gets the same night twice. */
const GAME = {
  id: 'still-here', title: 'Still Here', tagline: 'Something in this building knows your name. Bring friends.',
  font: 'Rubik Glitch', accent: '#ff3b3b', accent2: '#9fe8ff', bg: '#000', noSkins: true, noHud: true, scoreLabel: 'Score',
  how: ['Headphones on. Find the fuses on each floor to power the elevator, then ride it down. How deep can you get?',
    'WASD to move, mouse to look (click to lock it), Shift to run, F flashlight, E hide in a locker or ride the elevator, C camera flash, Q ping, M map.',
    'Play alone, or create a room and send friends the 4-letter code so they can join from their own phone or computer.',
    'The Hollow hunts by sight and sound, and your flashlight gives you away. The dolls only move when nobody is looking at them.'],
  skins: [{ name: 'Default', price: 0, c: ['#fff'] }],
};
(() => {
  let RW = 428, RH = 240, buf, bctx, img, P32, zbuf, coneX, coneY;
  const FOV = .66, HF = s => `800 ${s}px Nunito, system-ui, sans-serif`, TF = s => `${s}px "Rubik Glitch", Impact, sans-serif`;
  // the 3D view is drawn into a small pixel buffer and scaled up; slow devices drop to a lower resolution
  function setRes(w, h) { RW = w; RH = h; buf = document.createElement('canvas'); buf.width = w; buf.height = h; bctx = buf.getContext('2d'); img = bctx.createImageData(w, h); P32 = new Uint32Array(img.data.buffer); zbuf = new Float32Array(w); coneX = new Float32Array(w); coneY = new Float32Array(h * 2); }
  setRes(RW, RH);
  const SC = () => 1280 / RW;
  const rng = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const BAY = [-6, 2, -4, 4, 6, -2, 4, -4, -3, 5, -5, 3, 7, -1, 5, -3];
  const cl = v => v < 0 ? 0 : v > 255 ? 255 : v | 0;
  const THEMES = [
    { n: 'Ward B', fl: 'lino', cl: 'tile', wall: [140, 156, 140], alt: [196, 202, 192], floor: [[112, 118, 106], [86, 92, 82]], ceil: [118, 118, 112], amb: .03 },
    { n: 'The Old School Wing', fl: 'wood', cl: 'tile', wall: [168, 146, 108], alt: [132, 82, 58], floor: [[110, 78, 52], [94, 66, 44]], ceil: [130, 124, 108], amb: .028 },
    { n: 'The Boiler Rooms', fl: 'conc', cl: 'pipes', wall: [106, 106, 100], alt: [80, 90, 96], floor: [[70, 72, 72], [60, 62, 62]], ceil: [56, 56, 54], amb: .024 },
    { n: 'The Red Floors', fl: 'flesh', cl: 'flesh', wall: [132, 40, 36], alt: [96, 22, 26], floor: [[70, 24, 24], [56, 18, 20]], ceil: [40, 12, 14], amb: .03 },
  ];
  const NOTES = [
    'Saint Verity Hospital, staff memo: Elevator 3 now stops at floors that are not on the panel. Do not get out.',
    'Night nurse log: Patient in 4B keeps saying the building is hungry. Gave a sedative. He was smiling when he fell asleep.',
    'Maintenance: Replaced the fuses again. Someone keeps taking them DOWN, not up. There is no down.',
    'Child\'s drawing, crayon: a tall man with no face. Underneath: "he stands still when you look".',
    'Security tape label: CAM 7, 3:12 AM. Do not watch alone. (The tape is warm.)',
    'Dr. Hale\'s journal: The dolls came from the old pediatric ward. We burned them in 1987. They were back by Monday.',
    'Torn page: If you hear your name from behind you, do not turn around. It already knows what you look like.',
    'Janitor, written on a glove: lockers are safe if it did not see you go in. If it saw you, run.',
    'Missing person flyer, five names. The last name is yours. The date is tomorrow.',
    'Radio transcript: "...we are on floor nine, but the building only has four floors..."',
    'Lab note: Its eyes reflect light. Turn off the flashlight and it has to listen for you instead.',
    'Scratched into a door: IT COPIES VOICES. ASK THEM SOMETHING ONLY THEY WOULD KNOW.',
    'School report card, grade 3: "Lucy talks to the tall man in the hallway. Please speak to her parents."',
    'Boiler room log: The pipes are breathing. Temperature 4°C. We can see our breath, and someone else\'s.',
    'Final page, no handwriting at all: You were always going to come down here. Welcome home.',
    'Polaroid, on the back: "Everyone who got out". The photo is of an empty elevator.',
  ];
  const UPS = [['bat', 'Bigger battery', 'Flashlight lasts 25% longer', 4], ['stam', 'Running shoes', 'Sprint 25% longer', 4], ['heart', 'Lucky charm', 'One more heart', 2],
    ['film', 'Spare film', 'Start with one more camera flash', 3], ['nerve', 'Steady nerves', 'Sanity drains slower', 3], ['lamp', 'Wide lens', 'A wider flashlight beam', 2]];
  const upCost = lv => [6, 12, 20, 32][lv];
  let save = {}, pending = null;

  /* ---------- textures (128x128, generated per floor theme) ---------- */
  const TX = 128, TM = 127, TS = 7;
  const pack = (r, g, b) => (0xff000000 | (cl(b) << 16) | (cl(g) << 8) | cl(r)) >>> 0;
  // tileable value noise: n.v(x, y, scale) and n.f(x, y) = a few octaves, both 0..1
  function makeNoise(R, size = TX) {
    const cache = {}, lat = s => cache[s] || (cache[s] = Float32Array.from({ length: (size / s) * (size / s) }, () => R()));
    const v = (x, y, s) => { const n = size / s, L2 = lat(s), fx = x / s, fy = y / s, x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0, sx = ax * ax * (3 - 2 * ax), sy = ay * ay * (3 - 2 * ay), i0 = (x0 % n + n) % n, j0 = (y0 % n + n) % n, i1 = (i0 + 1) % n, j1 = (j0 + 1) % n;
      return (L2[j0 * n + i0] * (1 - sx) + L2[j0 * n + i1] * sx) * (1 - sy) + (L2[j1 * n + i0] * (1 - sx) + L2[j1 * n + i1] * sx) * sy; };
    return { v, f: (x, y) => v(x, y, 32) * .45 + v(x, y, 16) * .27 + v(x, y, 8) * .17 + v(x, y, 4) * .11 };
  }
  function makeTex(th, seed) {
    const R = rng(seed), T = {}, N = makeNoise(R), N2 = makeNoise(rng(seed + 9));
    const mk = f => { const a = new Uint32Array(TX * TX); for (let y = 0; y < TX; y++) for (let x = 0; x < TX; x++) { const c = f(x, y); a[y * TX + x] = pack(c[0], c[1], c[2]); } return a; };
    const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k], mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    // cracks: random walks down the plaster
    const crack = new Uint8Array(TX * TX);
    for (let k = 0; k < 2; k++) { let x = R() * TX, y = R() * 60; for (let s = 0; s < 70; s++) { crack[((y | 0) & TM) * TX + ((x | 0) & TM)] = 1; x += (R() - .5) * 2.2; y += R() * 1.4; if (R() < .05) { let bx = x, by = y; for (let b = 0; b < 15; b++) { crack[((by | 0) & TM) * TX + ((bx | 0) & TM)] = 1; bx += R() * 1.6; by += R() - .2; } } } }
    const drip = Array.from({ length: TX }, (_, x) => R() < .3 ? 20 + R() * 70 : 0);
    for (let x = 1; x < TX; x++) if (drip[x - 1] && R() < .6) drip[x] = Math.max(drip[x], drip[x - 1] * (.7 + R() * .3));
    const wain = mul(th.wall, .72), wall = (x, y) => {
      const n = N.f(x, y), p = N2.f(x * .8, y * .8);
      let c = mul(th.wall, .78 + (n - .5) * .5);
      if (y > 78) c = mul(wain, .82 + (n - .5) * .45);
      if (p > .66 && y < 76) c = p > .68 ? mul(th.wall, 1.1 + (n - .5) * .2) : mul(c, .8);           // peeling paint
      if (y >= 76 && y <= 79) c = mul(th.wall, y < 78 ? 1.18 : .45);                                      // chair rail
      if (y > 116) c = mul([50, 46, 42], y === 117 ? 1.6 : .9 + n * .2);                                   // skirting board
      if (y < drip[x]) c = mix(c, [70, 52, 30], .55 * (1 - y / drip[x] * .6));                            // water stains
      if (crack[y * TX + x]) c = mul(c, .62);
      const ao = Math.min(1, .55 + y / 22) * (y > 96 ? 1 - (y - 96) / 70 : 1);
      return mul(c, ao);
    };
    T.wall = mk(wall);
    const tileR = Array.from({ length: 64 }, () => .9 + R() * .16), miss = Array.from({ length: 64 }, () => R() < .02);
    T.alt = mk((x, y) => {
      const tx = x >> 4, ty = y >> 4, ti = (ty & 7) * 8 + (tx & 7), lx = x & 15, ly = y & 15, n = N.f(x, y);
      if (miss[ti]) return mul([46, 44, 40], .7 + n * .5);
      if (lx < 1 || ly < 1) return mul(th.alt, .42 + n * .2 - (y / TX) * .15);
      let c = mul(th.alt, tileR[ti] - (n - .5) * .25 - Math.max(0, y - 70) / 200);
      if (lx === 1 || ly === 1) c = mul(c, 1.14); if (lx === 15 || ly === 15) c = mul(c, .78);
      if (crack[y * TX + x] && ti % 3 === 0) c = mul(c, .4);
      return c;
    });
    T.blood = mk((x, y) => {
      let c = wall(x, y); const n = N2.f(x * 1.5, y * 1.5), sm = Math.abs((y - 30) - (x - 64) * .35) < 14 + n * 22 && x > 18 && x < 110;
      const palm = ((x - 70) / 11) ** 2 + ((y - 60) / 13) ** 2 < 1, fing = [[58, 40], [64, 34], [71, 32], [78, 36], [84, 50]].some(([fx, fy], i) => Math.abs(x - fx) < 2.8 && y > fy && y < fy + 16 - (i === 4 ? 8 : 0));
      const dr = sm || palm || fing ? 0 : (x % 9 === 3 && y > 40 && y < 40 + (x * 37 % 50) && Math.abs((y - 30) - (x - 64) * .35) < 60);
      if (sm || palm || fing || dr) c = mix([92, 6, 10], [40, 2, 4], n);
      return c;
    });
    T.locker = mk((x, y) => {
      const n = N.f(x, y), lx = x & 63; let c = mul([84, 100, 92], .82 + (n - .5) * .3);
      if (lx < 3 || lx > 60) c = mul(c, .4); else if (lx === 3) c = mul(c, 1.3);
      if (y > 16 && y < 40 && y % 5 < 2 && lx > 12 && lx < 52) c = y % 5 === 0 ? [14, 16, 15] : mul(c, 1.35);
      if (y > 96 && y < 112 && y % 5 < 2 && lx > 12 && lx < 52) c = y % 5 === 0 ? [14, 16, 15] : mul(c, 1.35);
      if (lx > 50 && lx < 56 && y > 54 && y < 74) c = mul([170, 170, 160], .8 + n * .4);
      if (lx > 20 && lx < 44 && y > 44 && y < 51) c = [196, 190, 170];
      if (N2.f(x, y) > .7) c = mix(c, [120, 62, 30], (N2.f(x, y) - .7) * 4);                                // rust
      if (y < 4 || y > 123) c = mul(c, .45);
      return c;
    });
    const steel = N.v, elev = on => mk((x, y) => {
      if (y < 18) { if (y > 4 && y < 14 && x > 50 && x < 78) { const lit = Math.hypot(x - 64, y - 9) < 4; return lit ? (on ? [80, 255, 140] : [255, 50, 36]) : [26, 26, 30]; } return [44, 44, 48]; }
      let c = mul([136, 140, 146], .78 + steel(x * 4, y * .25, 8) * .3 + (N.f(x, y) - .5) * .1);
      if (x < 6 || x > 121) c = mul(c, .5); if (x > 61 && x < 66) c = mul(c, x === 63 || x === 64 ? .18 : .6);
      if (y > 122) c = mul(c, .35);
      return c;
    });
    T.elevOff = elev(false); T.elevOn = elev(true);
    const plank = Array.from({ length: 16 }, () => R() * 128);
    T.floor = mk((x, y) => {
      const n = N.f(x, y), st = N2.f(x * .7, y * .7);
      let c;
      if (th.fl === 'wood') { const row = y >> 4, ly = y & 15, seam = ((x + plank[row]) & 127) < 2; c = mul(th.floor[row & 1], .8 + Math.sin((x + plank[row]) * .3 + n * 9) * .08 + (n - .5) * .3); if (ly < 1 || seam) c = mul(c, .35); }
      else if (th.fl === 'conc') { c = mul(th.floor[0], .75 + (n - .5) * .5); if (crack[(y * 3 & TM) * TX + x]) c = mul(c, .4); if (st > .62) c = mul(c, .62); }
      else if (th.fl === 'flesh') { c = mul(th.floor[0], .7 + n * .6); if (Math.abs(N2.f(x * 2, y * 2) - .5) < .025) c = [30, 4, 6]; }
      else { const lx = x & 31, ly = y & 31; c = mul(th.floor[((x >> 5) + (y >> 5)) & 1], .82 + (n - .5) * .3); if (lx < 1 || ly < 1) c = mul(c, .5); }
      if (st > .68 && th.fl !== 'conc') c = mix(c, [40, 30, 20], (st - .68) * 2.5);                       // stains
      return c;
    });
    T.ceil = mk((x, y) => {
      const n = N.f(x, y), lx = x & 63, ly = y & 63, st = N2.f(x, y);
      if (th.cl === 'pipes') { const p = (y + 8) & 63; if (p < 18) { const k = Math.sin(p / 18 * Math.PI); return mul([92, 70, 54], .3 + k * .8); } return mul(th.ceil, .7 + (n - .5) * .4); }
      if (th.cl === 'flesh') return mul(th.ceil, .6 + n * .7);
      if (lx < 2 || ly < 2) return mul([150, 150, 146], .6 + n * .3);
      let c = mul(th.ceil, .82 + (n - .5) * .25 + ((x * 7 + y * 13) % 5 === 0 ? -.12 : 0));
      if (st > .64) c = mix(c, [96, 70, 40], Math.min(.8, (st - .64) * 4)); if (Math.abs(st - .64) < .008) c = mul(c, .6);
      return c;
    });
    return T;
  }
  function spriteTex(w, h, draw) {
    const c = document.createElement('canvas'), e = document.createElement('canvas'); c.width = e.width = w; c.height = e.height = h;
    draw(c.getContext('2d'), e.getContext('2d'), c);
    const d = new Uint32Array(c.getContext('2d').getImageData(0, 0, w, h).data.buffer), ed = new Uint32Array(e.getContext('2d').getImageData(0, 0, w, h).data.buffer), em = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) if ((ed[i] >>> 24) > 90) { d[i] = (ed[i] | 0xff000000) >>> 0; em[i] = 1; }
    return { w, h, d, e: em };
  }
  const ell = (g, x, y, rx, ry, c, r = 0) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, r, 0, 7); g.fill(); };
  const norm3 = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };

  /* A face rendered from a height field: skull dome, sunken sockets, a gaping mouth, lit from below like a flashlight held low.
     Used for the jump scares and, shrunk, for the monster's head and the apparitions. kind: hollow | doll | mimic */
  const faces = {};
  function reliefFace(kind) {
    const S = 300, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), id = g.createImageData(S, S), D = id.data;
    const R = rng(kind.length * 977), N = makeNoise(R, 128), doll = kind === 'doll', H = new Float32Array(S * S).fill(-9), dome = new Float32Array(S * S);
    const gs = (u, v, cx, cy, sx, sy) => Math.exp(-(((u - cx) / sx) ** 2 + ((v - cy) / sy) ** 2));
    const ex = doll ? .3 : .25, ey = doll ? -.08 : -.2;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = (x - S / 2) / (S / 2), v = (y - S / 2) / (S / 2), hx = u / (doll ? .72 : .6), hy = (v - .02) / (doll ? .8 : .95), r = hx * hx + hy * hy * (v > .3 && !doll ? 1.25 : 1);
      if (r >= 1) continue;
      const dm = Math.sqrt(1 - r); let h = dm;
      h -= (doll ? .14 : .75) * (gs(u, v, ex, ey, doll ? .12 : .14, doll ? .12 : .2) + gs(u, v, -ex, ey + (doll ? 0 : .02), doll ? .12 : .14, doll ? .12 : .21));
      if (!doll) {
        h += .12 * gs(u, v, 0, -.43, .5, .07) + .12 * (gs(u, v, .34, .08, .12, .07) + gs(u, v, -.34, .08, .12, .07)) - .16 * (gs(u, v, .3, .34, .1, .17) + gs(u, v, -.3, .34, .1, .17));
        h -= .4 * gs(u, v, 0, .1, .055, .08);
        const mr = (u / .16) ** 2 + ((v - .58) / .36) ** 2; if (mr < 1) h -= 1.1 * Math.sqrt(1 - mr);
        h += .014 * Math.sin(v * 95 + N.f(x, y) * 9) * gs(u, v, 0, -.55, .5, .12) + (N.f(x * 1.7, y * 1.7) - .5) * .06;
      } else { h += (N.f(x, y) - .5) * .012; }
      H[y * S + x] = h; dome[y * S + x] = dm;
    }
    const L1 = norm3(-.4, -.55, .73), L2 = norm3(.1, .85, .52);
    const alb = doll ? [236, 230, 224] : kind === 'mimic' ? [214, 168, 138] : [196, 189, 170];
    for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
      const i = y * S + x, h = H[i]; if (h < -8) continue;
      const hl = H[i - 1] < -8 ? h : H[i - 1], hr = H[i + 1] < -8 ? h : H[i + 1], hu = H[i - S] < -8 ? h : H[i - S], hd = H[i + S] < -8 ? h : H[i + S];
      const n = norm3((hl - hr) * S * .28, (hu - hd) * S * .28, 1), d1 = Math.max(0, n[0] * L1[0] + n[1] * L1[1] + n[2] * L1[2]), d2 = Math.max(0, n[0] * L2[0] + n[1] * L2[1] + n[2] * L2[2]);
      const depth = dome[i] - h, ao = Math.max(0, 1 - Math.max(0, depth - .04) * (doll ? 1.4 : 1.9));
      const u = (x - S / 2) / (S / 2), v = (y - S / 2) / (S / 2), bl = N.f(x * .8, y * .8);
      let a = alb.map(k => k * (.78 + bl * .35));
      if (!doll && Math.abs(N.f(x * 2.4, y * 2.4) - .5) < .018 && (gs(u, v, ex, ey, .3, .3) + gs(u, v, -ex, ey, .3, .3)) > .25) a = [96, 34, 52];   // veins round the eyes
      if (!doll && ((u / .16) ** 2 + ((v - .58) / .36) ** 2) < 1.15 && depth < .3) a = [118, 26, 32];                               // gums
      const hv = norm3(L1[0], L1[1], L1[2] + 1), spec = Math.pow(Math.max(0, n[0] * hv[0] + n[1] * hv[1] + n[2] * hv[2]), doll ? 60 : 24) * (doll ? 120 : 40);
      const k = (.05 + d1 * .5 + d2 * .8) * ao, edge = Math.min(1, (1 - dome[i]) < .08 ? .6 + (1 - dome[i]) * 0 : 1);
      D[i * 4] = cl(a[0] * k * edge + spec); D[i * 4 + 1] = cl(a[1] * k * edge + spec); D[i * 4 + 2] = cl(a[2] * k * edge + spec * 1.05); D[i * 4 + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    const P = (u, v) => [S / 2 + u * S / 2, S / 2 + v * S / 2];
    if (doll) {
      for (const s of [-1, 1]) { const [cx, cy] = P(s * ex, ey), gr = g.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, 24); gr.addColorStop(0, '#3a3a44'); gr.addColorStop(1, '#000'); ell(g, cx, cy, 22, 23, gr); ell(g, cx - 7, cy - 8, 4, 3, 'rgba(255,255,255,.85)'); ell(g, cx, cy, 2.5, 2.5, '#ff1a1a'); }
      const [mx, my] = P(0, .33); ell(g, mx, my, 9, 4, '#8a0a14'); ell(g, mx, my - 1, 5, 1.5, '#c0303a');
      for (const s of [-1, 1]) { const [cx, cy] = P(s * .38, .18), gr = g.createRadialGradient(cx, cy, 2, cx, cy, 26); gr.addColorStop(0, 'rgba(230,110,120,.35)'); gr.addColorStop(1, 'rgba(230,110,120,0)'); g.fillStyle = gr; g.fillRect(cx - 30, cy - 30, 60, 60); }
      g.strokeStyle = 'rgba(40,24,24,.9)'; g.lineWidth = 2.2; g.beginPath(); let [cx, cy] = P(.18, -.75); g.moveTo(cx, cy); for (let k = 0; k < 9; k++) { cx += (R() - .35) * 16; cy += 14; g.lineTo(cx, cy); } g.stroke();
      const [hx, hy] = P(-.42, .36); g.fillStyle = '#060404'; g.beginPath(); g.moveTo(hx, hy); for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28; g.lineTo(hx + Math.cos(a) * (14 + R() * 9), hy + Math.sin(a) * (11 + R() * 8)); } g.fill();
      g.fillStyle = '#1a1010'; for (let k = 0; k < 14; k++) { const a = Math.PI + k / 13 * Math.PI, [cx2, cy2] = P(Math.cos(a) * .7, -.15 + Math.sin(a) * .82); g.beginPath(); g.arc(cx2, cy2, 16 + R() * 6, 0, 7); g.fill(); }
    } else {
      // teeth round the mouth, black tears, pinprick eyes, hair falling over the brow
      const [mx, my] = P(0, .58), rx = .16 * S / 2, ry = .36 * S / 2;
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2, x0 = mx + Math.cos(a) * rx, y0 = my + Math.sin(a) * ry, len = 7 + R() * 9;
        const gr = g.createLinearGradient(x0, y0, mx, my); gr.addColorStop(0, '#d8cfae'); gr.addColorStop(1, '#5a4a30'); g.fillStyle = gr;
        g.beginPath(); g.moveTo(x0 + Math.sin(a) * 4, y0 - Math.cos(a) * 4); g.lineTo(x0 - Math.sin(a) * 4, y0 + Math.cos(a) * 4); g.lineTo(x0 + (mx - x0) * len / rx * .55, y0 + (my - y0) * len / ry * .55); g.fill();
      }
      for (const s of [-1, 1]) {
        const [cx, cy] = P(s * ex, ey + .02), gr = g.createLinearGradient(cx, cy, cx, cy + 120); gr.addColorStop(0, 'rgba(0,0,0,.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.strokeStyle = gr; g.lineWidth = 5; g.beginPath(); g.moveTo(cx + s * 4, cy + 10); g.bezierCurveTo(cx + s * 2, cy + 50, cx + s * 8, cy + 80, cx + s * 4, cy + 120); g.stroke();
        const gl = g.createRadialGradient(cx, cy, 0, cx, cy, 9); gl.addColorStop(0, '#ffffff'); gl.addColorStop(.3, 'rgba(255,255,255,.6)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(cx - 10, cy - 10, 20, 20);
      }
      g.lineCap = 'round';
      for (let k = 0; k < (kind === 'mimic' ? 60 : 26); k++) { const side = R() < .5 ? -1 : 1, [x0, y0] = P(side * (.15 + R() * .45), -.9 + R() * .15), len = kind === 'mimic' ? 30 + R() * 40 : 50 + R() * 110, sw = (R() - .5) * 26; g.strokeStyle = kind === 'mimic' ? `rgba(${40 + R() * 20},${24 + R() * 12},14,.9)` : `rgba(${6 + R() * 10},${5 + R() * 8},${6 + R() * 8},${.55 + R() * .35})`; g.lineWidth = 1.5 + R() * 2.5; g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x0 + sw, y0 + len * .35, x0 - sw + side * 10, y0 + len * .7, x0 + side * (8 + R() * 18), y0 + len); g.stroke(); }
      g.strokeStyle = 'rgba(30,0,0,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(mx, my + ry * .8); g.bezierCurveTo(mx + 4, my + ry + 20, mx - 6, my + ry + 40, mx, S); g.stroke();
    }
    const tint = col => { const t = document.createElement('canvas'); t.width = t.height = S; const tg = t.getContext('2d'); tg.drawImage(c, 0, 0); tg.globalCompositeOperation = 'multiply'; tg.fillStyle = col; tg.fillRect(0, 0, S, S); tg.globalCompositeOperation = 'destination-in'; tg.drawImage(c, 0, 0); return t; };
    faces[kind] = { img: c, red: tint('#ff0000'), cyan: tint('#00ffff'), eyes: doll ? [] : [P(ex, ey + .02), P(-ex, ey + .02)] };
    return faces[kind];
  }
  const getFace = k => faces[k] || reliefFace(k);

  /* A body built from rounded 3D limbs (capsules), shaded per pixel: used for the Hollow, the dolls and other players. */
  function sculpt(w, h, parts, o) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), id = g.createImageData(w, h), D = id.data, N = makeNoise(rng(w * 7 + h), 128);
    const L1 = norm3(-.45, -.6, .66);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let best = null, bz = -1e9;
      for (const p of parts) {
        const ax = p[0], ay = p[1], bx = p[2], by = p[3], vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / l2));
        const cx = ax + vx * t, cy = ay + vy * t, r = p[4] + (p[5] - p[4]) * t, dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
        if (d2 >= r * r) continue;
        const z = Math.sqrt(r * r - d2), zz = z + (p[6] || 0);
        if (zz > bz) { bz = zz; best = { p, dx, dy, z, r, t }; }
      }
      if (!best) continue;
      const { p, dx, dy, z, r, t } = best;
      let nx = dx, ny = dy, nz = z;
      if (p[7] === 'ribs') ny += Math.sin(t * 34) * r * .35 * (1 - Math.abs(dx) / r);                          // ribs under the skin
      if (p[7] === 'cloth') nx += Math.sin(x * .9 + N.f(x, y) * 8) * r * .5;
      const n = norm3(nx, ny, nz), dif = Math.max(0, n[0] * L1[0] + n[1] * L1[1] + n[2] * L1[2]), rim = Math.pow(1 - n[2], 3) * .45;
      const col = (o.col && o.col(p, x, y, t)) || p[8] || o.skin, bl = .8 + N.f(x * 1.3, y * 1.3) * .4;
      const ao = Math.min(1, .45 + z / r * .7), k = (.16 + dif * .9) * ao * bl;
      const i = (y * w + x) * 4;
      D[i] = cl(col[0] * k + rim * 60); D[i + 1] = cl(col[1] * k + rim * 64); D[i + 2] = cl(col[2] * k + rim * 76); D[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    return c;
  }
  const BONE = [150, 146, 134];
  function hollowParts() {
    // x0 y0 x1 y1 r0 r1 depth [kind] [color] on a 128x256 sprite; arms hang past the knees
    return [
      [64, 82, 63, 98, 6, 7, 2], [44, 100, 86, 98, 8, 8, -2], [64, 100, 62, 150, 22, 13, 4, 'ribs'], [62, 150, 62, 166, 13, 15, 2],
      [44, 102, 28, 156, 6, 5, 5], [28, 156, 20, 212, 5, 4, 6], [20, 212, 17, 226, 5, 4, 7],
      [86, 100, 101, 152, 6, 5, -3], [101, 152, 108, 208, 5, 4, -2], [108, 208, 110, 222, 5, 4, -1],
      [55, 166, 48, 206, 8, 6, 1], [48, 206, 52, 248, 5, 4, 2], [52, 248, 42, 254, 4, 3, 3],
      [70, 166, 78, 206, 8, 6, 0], [78, 206, 75, 248, 5, 4, 1], [75, 248, 84, 254, 4, 3, 2],
      ...[-6, -3, 0, 3, 6].map((f, i) => [17, 224, 12 + f * 1.4, 248 + (i % 2) * 4, 1.8, 1, 8]),
      ...[-6, -3, 0, 3, 6].map((f, i) => [110, 220, 114 + f * 1.4, 244 + (i % 2) * 4, 1.8, 1, 0]),
    ];
  }
  const SPR = {};
  function buildSprites() {
    SPR.hollow = spriteTex(128, 256, (g, e) => {
      g.drawImage(sculpt(128, 256, hollowParts(), { skin: BONE }), 0, 0);
      g.fillStyle = 'rgba(14,12,14,.85)'; const R = rng(5);
      for (let i = 0; i < 14; i++) { const x = 44 + i * 3; g.fillStyle = `rgba(${12 + R() * 14},${10 + R() * 10},${12 + R() * 10},${.7 + R() * .3})`; g.beginPath(); g.moveTo(x - 2.5, 150 + R() * 8); g.lineTo(x + (R() - .5) * 10, 176 + R() * 46); g.lineTo(x + 2.5, 150 + R() * 8); g.fill(); }
      const f = getFace('hollow'); g.save(); g.translate(64, 46); g.rotate(.12); g.drawImage(f.img, -30, -48, 60, 96); g.restore();
      g.strokeStyle = 'rgba(70,10,10,.8)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(64, 70); g.bezierCurveTo(66, 90, 62, 110, 65, 130); g.stroke();
      e.fillStyle = '#fff'; e.fillRect(57, 35, 2, 2); e.fillRect(72, 37, 2, 2);
    });
    SPR.face = spriteTex(96, 96, (g, e) => { g.drawImage(getFace('hollow').img, 8, 0, 80, 96); e.fillStyle = '#fff'; e.fillRect(37, 38, 2, 2); e.fillRect(57, 38, 2, 2); });
    SPR.doll = spriteTex(64, 128, (g, e) => {
      const lace = (p, x, y) => (p[7] === 'dress' ? (y > 118 && (x % 4 < 2) ? [210, 200, 190] : [92, 14, 22]) : null);
      g.drawImage(sculpt(64, 128, [[32, 58, 32, 66, 4, 4, 1], [32, 66, 32, 116, 9, 24, 3, 'dress'], [22, 70, 16, 98, 3, 2.6, 5], [42, 70, 48, 98, 3, 2.6, 5], [27, 116, 27, 126, 3, 2.5, 1], [37, 116, 37, 126, 3, 2.5, 1]], { skin: [236, 228, 220], col: lace }), 0, 0);
      g.fillStyle = 'rgba(240,232,220,.9)'; for (let x = 22; x < 43; x += 3) { g.beginPath(); g.moveTo(x, 66); g.lineTo(x + 1.5, 71); g.lineTo(x + 3, 66); g.fill(); }
      g.fillStyle = '#111'; g.fillRect(24, 124, 6, 4); g.fillRect(34, 124, 6, 4);
      g.save(); g.translate(32, 32); g.rotate(-.18); g.drawImage(getFace('doll').img, -26, -28, 52, 52); g.restore();
      e.fillStyle = '#ff2020'; e.fillRect(24, 28, 1, 1); e.fillRect(38, 26, 1, 1);
    });
    SPR.lamp = spriteTex(24, 40, (g, e) => { g.strokeStyle = '#2a2a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(12, 0); g.lineTo(12, 18); g.stroke(); g.strokeRect(5, 18, 14, 16); const gl = e.createRadialGradient(12, 27, 1, 12, 27, 7); gl.addColorStop(0, '#ffd0c0'); gl.addColorStop(.4, '#ff2a1a'); gl.addColorStop(1, 'rgba(255,0,0,.5)'); e.fillStyle = gl; e.beginPath(); e.arc(12, 27, 6, 0, 7); e.fill(); });
    SPR.fuse = spriteTex(32, 32, (g, e) => { const gr = g.createLinearGradient(10, 0, 22, 0); gr.addColorStop(0, '#6a5410'); gr.addColorStop(.5, '#e8c84a'); gr.addColorStop(1, '#6a5410'); g.fillStyle = gr; g.fillRect(10, 8, 12, 16); g.fillStyle = '#ccc'; g.fillRect(9, 5, 14, 4); g.fillRect(9, 23, 14, 4); e.fillStyle = '#fff3a0'; e.fillRect(14, 13, 4, 6); });
    SPR.battery = spriteTex(32, 32, (g, e) => { const gr = g.createLinearGradient(0, 10, 0, 22); gr.addColorStop(0, '#2e9a46'); gr.addColorStop(.5, '#7ee08a'); gr.addColorStop(1, '#1a5a28'); g.fillStyle = gr; g.fillRect(6, 10, 18, 12); g.fillStyle = '#bbb'; g.fillRect(24, 13, 3, 6); e.fillStyle = '#c8ffc8'; e.fillRect(9, 13, 3, 3); });
    SPR.film = spriteTex(32, 32, (g, e) => { g.fillStyle = '#1a1a1c'; g.fillRect(4, 10, 24, 15); g.fillStyle = '#4a4a50'; g.fillRect(7, 7, 7, 3); e.fillStyle = '#cfe8ff'; e.beginPath(); e.arc(16, 17, 4, 0, 7); e.fill(); });
    SPR.note = spriteTex(32, 32, (g, e) => { e.fillStyle = '#e8e0c8'; e.save(); e.translate(16, 16); e.rotate(.2); e.fillRect(-10, -12, 20, 24); e.restore(); g.save(); g.translate(16, 16); g.rotate(.2); g.fillStyle = '#e8e0c8'; g.fillRect(-10, -12, 20, 24); g.fillStyle = '#444'; for (let i = 0; i < 5; i++) g.fillRect(-7, -8 + i * 4, 14, 1); g.restore(); });
    SPR.relic = spriteTex(32, 32, (g, e) => { const gl = e.createRadialGradient(16, 16, 1, 16, 16, 10); gl.addColorStop(0, '#e6c8ff'); gl.addColorStop(.5, '#a050ff'); gl.addColorStop(1, 'rgba(120,40,255,.5)'); e.fillStyle = gl; e.beginPath(); e.ellipse(16, 16, 10, 6, 0, 0, 7); e.fill(); e.fillStyle = '#12001e'; e.fillRect(14, 12, 4, 8); });
    friendTex.length = 0;
    COLS.forEach(c => {
      const rgb = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
      friendTex.push(spriteTex(64, 128, (g, e) => {
        g.drawImage(sculpt(64, 128, [[32, 34, 32, 40, 4, 4, 1], [32, 42, 32, 76, 13, 11, 3, 0, rgb], [19, 46, 15, 74, 4, 4, 4, 0, rgb], [45, 46, 49, 70, 4, 4, 5, 0, rgb], [27, 76, 26, 120, 5.5, 4.5, 1, 0, [36, 38, 52]], [37, 76, 38, 120, 5.5, 4.5, 1, 0, [36, 38, 52]], [26, 120, 24, 126, 4, 3, 2, 0, [24, 24, 24]], [38, 120, 40, 126, 4, 3, 2, 0, [24, 24, 24]], [32, 22, 32, 24, 11, 11, 2, 0, [226, 184, 147]]], { skin: [226, 184, 147] }), 0, 0);
        g.fillStyle = '#2a1a10'; g.beginPath(); g.ellipse(32, 17, 11.5, 8, 0, Math.PI, 0); g.fill(); g.fillStyle = '#111'; g.fillRect(27, 22, 2, 2); g.fillRect(35, 22, 2, 2);
        g.fillStyle = '#222'; g.fillRect(47, 66, 6, 8); e.fillStyle = '#fff6c8'; e.fillRect(48, 72, 4, 3);
      }));
    });
  }
  const COLS = ['#2f6fd0', '#d0452f', '#2fae5a', '#c9a227'];
  const friendTex = [];

  /* ---------- level ---------- */
  let L = null;
  function genLevel(seed, floor) {
    const R = rng(seed), n = Math.min(52, 30 + floor * 2), grid = new Uint8Array(n * n).fill(1), rooms = [];
    const carve = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j * n + i] = 0; };
    const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
    for (let t = 0; t < 600 && rooms.length < Math.min(16, 8 + floor); t++) {
      const w = ri(3, 7), h = ri(3, 7), x = ri(1, n - w - 2), y = ri(1, n - h - 2);
      if (rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
      rooms.push({ x, y, w, h }); carve(x, y, w, h);
    }
    const ctr = r => [r.x + (r.w >> 1), r.y + (r.h >> 1)], link = (a, b) => { const [ax, ay] = ctr(a), [bx, by] = ctr(b); carve(Math.min(ax, bx), ay, Math.abs(bx - ax) + 1, 1); carve(bx, Math.min(ay, by), 1, Math.abs(by - ay) + 1); };
    const left = rooms.slice(1), order = [rooms[0]];
    while (left.length) { const [ax, ay] = ctr(order[order.length - 1]); left.sort((a, b) => Math.hypot(ctr(a)[0] - ax, ctr(a)[1] - ay) - Math.hypot(ctr(b)[0] - ax, ctr(b)[1] - ay)); order.push(left.shift()); }
    for (let i = 1; i < order.length; i++) link(order[i - 1], order[i]);
    for (let k = 0; k < 3; k++) link(order[ri(0, order.length - 1)], order[ri(0, order.length - 1)]);  // loops, so there is always another way round
    const L2 = { n, grid, rooms: order, seed, floor, theme: Math.min(3, Math.floor((floor - 1) / 2)), items: [], lamps: [], lockers: [], need: Math.min(7, 3 + (floor - 1 >> 1)) };
    const at = (x, y) => x < 0 || y < 0 || x >= n || y >= n ? 1 : grid[y * n + x];
    const sp = ctr(order[0]); L2.spawn = { x: sp[0] + .5, y: sp[1] + .5 };
    const dist = bfsFrom(grid, n, sp[1] * n + sp[0]);
    let far = order[1] || order[0], fd = -1; for (const r of order) { const [cx, cy] = ctr(r), d = dist[cy * n + cx]; if (d > fd) { fd = d; far = r; } }
    // elevator in the top wall of the farthest room
    const ex = far.x + (far.w >> 1); grid[(far.y - 1) * n + ex] = 4; L2.exit = { x: ex, y: far.y - 1, fx: ex + .5, fy: far.y + .5 };
    // wall styles: tiled zones, a little blood
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (grid[y * n + x] === 1) { if (((x >> 3) + (y >> 3) * 3 + seed) % 4 === 0) grid[y * n + x] = 2; if (R() < .025) grid[y * n + x] = 5; }
    // lockers: wall tiles with exactly one open side
    const cand = [];
    for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) {
      const v = grid[y * n + x]; if (v === 0 || v === 4) continue;
      const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => at(x + a, y + b) === 0);
      if (open.length === 1) cand.push({ x, y, fx: x + open[0][0] + .5, fy: y + open[0][1] + .5 });
    }
    for (let k = 0; k < Math.min(16, 7 + floor) && cand.length; k++) { const c = cand.splice(Math.floor(R() * cand.length), 1)[0]; grid[c.y * n + c.x] = 3; L2.lockers.push(c); }
    const spot = (r) => ({ x: r.x + .5 + Math.floor(R() * r.w), y: r.y + .5 + Math.floor(R() * r.h) });
    let id = 0; const used = new Set();
    const put = (k, r) => { for (let t = 0; t < 12; t++) { const p = spot(r), key = Math.floor(p.x) + ',' + Math.floor(p.y); if (used.has(key) || (r === order[0] && k !== 'battery')) continue; used.add(key); L2.items.push({ id: id++, k, x: p.x, y: p.y }); return; } };
    const others = order.slice(1);
    for (let i = 0; i < L2.need; i++) put('fuse', others[Math.floor(R() * others.length)]);
    for (let i = 0; i < 3; i++) put('battery', order[Math.floor(R() * order.length)]);
    for (let i = 0; i < 1 + (R() < .5); i++) put('film', others[Math.floor(R() * others.length)]);
    for (let i = 0; i < 5; i++) put('relic', others[Math.floor(R() * others.length)]);
    put('note', others[Math.floor(R() * others.length)]);
    order.forEach((r, i) => { if (i % 2 === 1) { const [cx, cy] = ctr(r); L2.lamps.push({ x: cx + .5, y: cy + .5, r: 1, g: .1, b: .07, i: .9, fl: R() }); } });
    L2.lamps.push({ x: L2.exit.fx, y: L2.exit.fy, r: 1, g: .12, b: .08, i: .6, fl: 0, exit: 1 });
    L2.monSpawns = order.filter(r => { const [cx, cy] = ctr(r); return dist[cy * n + cx] > 14; }).map(r => { const [cx, cy] = ctr(r); return { x: cx + .5, y: cy + .5 }; });
    if (!L2.monSpawns.length) L2.monSpawns = [{ x: ctr(far)[0] + .5, y: ctr(far)[1] + .5 }];
    L2.seen = new Uint8Array(n * n);
    // which sides of each floor tile touch a wall (for the dark corners)
    L2.wm = new Uint8Array(n * n); for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) if (!grid[y * n + x]) L2.wm[y * n + x] = (grid[y * n + x - 1] ? 1 : 0) | (grid[y * n + x + 1] ? 2 : 0) | (grid[(y - 1) * n + x] ? 4 : 0) | (grid[(y + 1) * n + x] ? 8 : 0);
    L2.tex = makeTex(THEMES[L2.theme], seed);
    return L2;
  }
  function bfsFrom(grid, n, start) {
    const d = new Int16Array(n * n).fill(-1), q = new Int32Array(n * n); let h = 0, t = 0; q[t++] = start; d[start] = 0;
    while (h < t) { const c = q[h++], x = c % n, y = (c / n) | 0; for (const nb of [c + 1, c - 1, c + n, c - n]) { const nx = nb % n, ny = (nb / n) | 0; if (nb < 0 || nb >= n * n || Math.abs(nx - x) + Math.abs(ny - y) !== 1 || grid[nb] !== 0 || d[nb] >= 0) continue; d[nb] = d[c] + 1; q[t++] = nb; } }
    return d;
  }
  const solid = (x, y) => { const i = Math.floor(x), j = Math.floor(y); return i < 0 || j < 0 || i >= L.n || j >= L.n || L.grid[j * L.n + i] !== 0; };
  const free = (x, y, r) => !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r);
  function los(ax, ay, bx, by) { const d = Math.hypot(bx - ax, by - ay), s = Math.ceil(d / .25); for (let i = 1; i < s; i++) if (solid(ax + (bx - ax) * i / s, ay + (by - ay) * i / s)) return false; return true; }
  const angDiff = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);

  /* ---------- state ---------- */
  let mode = 'lobby', me, mons = [], others = new Map(), net = null, feed = [], js = null, between = 0, noteShow = null, mapOpen = false, scareT = 20, fx = [], flashT = 0, pings = [], endSent = false, menuT = 0, spect = 0;
  const keys = {}, touch = { on: false, move: null, look: null, btns: [] };
  const isHost = () => !net || net.hostId === net.id;
  const myId = () => net ? net.id : 0;
  function newMe() {
    const up = save.up || {};
    return { x: 0, y: 0, a: 0, bob: 0, walk: 0, bat: 1, batMax: 90 * (1 + .25 * (up.bat || 0)), stam: 1, stamMax: 4 * (1 + .25 * (up.stam || 0)), hearts: 2 + (up.heart || 0), film: 1 + (up.film || 0), sanity: 100,
      flash: true, hidden: null, hideT: 0, elev: false, out: false, relics: 0, fuses: 0, lampW: 1 + .15 * (up.lamp || 0), nerve: 1 - .2 * (up.nerve || 0), stepT: 0, run: false, lastSeenBy: 0 };
  }

  /* ---------- sound ---------- */
  let noiseBuf = null, drone = null;
  const AC = () => (K.ac && K.master && !K.bot && !save.mute) ? K.ac : null;
  function dest(pan = 0) { const ac = K.ac, p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(K.master); return p; }
  function tone(f, d, type = 'sine', v = .1, slide = 0, pan = 0, delay = 0) {
    const ac = AC(); if (!ac || v < .002) return; const t = ac.currentTime + delay, o = ac.createOscillator(), a = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
    a.gain.setValueAtTime(v, t); a.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(a).connect(dest(pan)); o.start(t); o.stop(t + d + .05);
  }
  function hiss(d, v, lo = 200, hi = 4000, pan = 0, delay = 0, swell = false) {
    const ac = AC(); if (!ac || v < .002) return;
    if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const c = noiseBuf.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; }
    const t = ac.currentTime + delay, s = ac.createBufferSource(), f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(), a = ac.createGain();
    s.buffer = noiseBuf; s.loop = true; f1.type = 'highpass'; f1.frequency.value = lo; f2.type = 'lowpass'; f2.frequency.value = hi;
    if (swell) { a.gain.setValueAtTime(.0001, t); a.gain.exponentialRampToValueAtTime(v, t + d * .6); } else a.gain.setValueAtTime(v, t);
    a.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(f1).connect(f2).connect(a).connect(dest(pan)); s.start(t, Math.random()); s.stop(t + d + .05);
  }
  function scream(v = .5) { hiss(1.1, v, 500, 6000); for (const f of [620, 760, 905, 1210]) tone(f * (.95 + Math.random() * .1), 1, 'sawtooth', v * .16, -f * .55); tone(70, .8, 'square', v * .3, -40); }
  function sting() { for (const f of [1480, 1568, 1661]) tone(f, 1.2, 'sawtooth', .05, -200); hiss(.6, .12, 2000, 9000); }
  function heart(v) { tone(58, .14, 'sine', v); tone(52, .16, 'sine', v * .8, 0, 0, .2); }
  function whisper(text) { hiss(1.6, .05, 1200, 5000, -.8, 0, true); try { if (AC() && window.speechSynthesis) { const u = new SpeechSynthesisUtterance(text); u.pitch = .1; u.rate = .6; u.volume = .45; speechSynthesis.cancel(); speechSynthesis.speak(u); } } catch (e) {} }
  function srcSound(x, y) { const dx = x - me.x, dy = y - me.y, d = Math.hypot(dx, dy); return { pan: Math.sin(Math.atan2(dy, dx) - me.a), vol: 1 / (1 + d * d * .06), d }; }
  function startDrone() {
    const ac = K.ac; if (!ac || drone) return;
    const g = ac.createGain(); g.gain.value = 0; g.connect(K.master);
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180; f.connect(g);
    for (const hz of [48, 48.6, 72.3]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz; o.connect(f); o.start(); }
    drone = g;
  }

  /* ---------- network ---------- */
  const WSHOST = /^https?:/.test(location.protocol) && !/^(localhost|127\.)/.test(location.hostname) ? location.host : 'box.pulseform.org';
  function connect(code, name) {
    if (net && net.ws) try { net.ws.close(); } catch (e) {}
    net = { code, name, id: 0, hostId: 0, ws: null, ok: false, sendT: 0, monT: 0 };
    lobbyMsg('Connecting...');
    let ws;
    try { ws = new WebSocket(`wss://${WSHOST}/api/room/${code}?n=${encodeURIComponent(name)}`); } catch (e) { lobbyMsg('Could not connect.'); net = null; return; }
    net.ws = ws;
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (err) { return; } onNet(m); };
    ws.onclose = () => {
      if (!net || net.ws !== ws) return;
      const wasPlaying = mode === 'play' || mode === 'between';
      net = null; others.clear();
      if (wasPlaying) say('Connection lost. You are on your own now.', '#ff8080'); else { lobbyMsg('Disconnected.'); lobbyRoom(); }
    };
  }
  const send = m => { if (net && net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify(m)); };
  function onNet(m) {
    switch (m.t) {
      case 'full': lobbyMsg('That room is full (4 players).'); break;
      case 'hello': net.id = m.id; net.hostId = m.host; net.ok = true; others.clear(); m.players.forEach(p => { if (p.id !== m.id) addOther(p.id, p.name); }); lobbyRoom(); break;
      case 'join': addOther(m.id, m.name); say(`${m.name} joined.`, '#9fe8ff'); lobbyRoom();
        if (isHost() && (mode === 'play' || mode === 'between')) send({ t: 'start', to: m.id, seed: L.seed, floor: L.floor, taken: L.items.filter(i => i.taken).map(i => i.id), late: 1 });
        break;
      case 'leave': { const o = others.get(m.id); if (o) say(`${o.name} left.`, '#9fe8ff'); others.delete(m.id); lobbyRoom(); break; }
      case 'host': net.hostId = m.id; if (isHost()) { mons.forEach(mm => { mm.st = 'wander'; mm.path = null; }); say('You are the host now.', '#9fe8ff'); } lobbyRoom(); break;
      case 'start': if (K.state === 'over' || K.state === 'title') pending = m; else beginFloor(m.seed, m.floor, m.taken || [], !!m.late); break;
      case 'p': { const o = others.get(m.from); if (!o) break; Object.assign(o, { rx: m.x, ry: m.y, ra: m.a, f: m.f, h: m.h, e: m.e, out: m.o, run: m.r, ok: true }); if (!o.seen) { o.x = m.x; o.y = m.y; o.a = m.a; o.seen = 1; } break; }
      case 'm': if (!isHost()) { m.m.forEach((d, i) => { let mm = mons[i]; if (!mm) mm = mons[i] = { x: d[0], y: d[1], a: d[2], type: d[4] ? 'doll' : 'hollow', rx: d[0], ry: d[1] }; mm.rx = d[0]; mm.ry = d[1]; mm.ra = d[2]; mm.st = d[3]; mm.type = d[4] ? 'doll' : 'hollow'; }); mons.length = m.m.length; } break;
      case 'take': takeItem(m.id, false); break;
      case 'caught': if (m.id === myId()) caught(m.k); else { const o = others.get(m.id); if (o) { say(`${o.name} was taken.`, '#ff5050'); const s = srcSound(o.x, o.y); scream(.15 * s.vol + .03); } } break;
      case 'scr': { const s = srcSound(m.x, m.y); scream(.06 + .3 * s.vol); break; }
      case 'ping': pings.push({ x: m.x, y: m.y, t: 5, who: (others.get(m.from) || {}).name || '?' }); { const s = srcSound(m.x, m.y); tone(880, .3, 'triangle', .12 * s.vol + .02, 0, s.pan); } if (isHost()) noise(m.x, m.y, 14); break;
      case 'flash': if (isHost()) flashStun(m.x, m.y, m.a); break;
      case 'noise': if (isHost()) noise(m.x, m.y, m.r); break;
      case 'end': endRun(); break;
    }
  }
  function addOther(id, name) { if (!others.has(id)) others.set(id, { id, name, x: 0, y: 0, a: 0, rx: 0, ry: 0, ra: 0, f: true, h: 0, e: 0, out: false, col: COLS[id % 4], tex: friendTex[id % 4], stepT: 0, seen: 0 }); }

  /* ---------- run flow ---------- */
  function startRun() {
    me = newMe(); endSent = false; K.score = 0; spect = 0;
    const seed = (Math.random() * 1e9) | 0;
    if (net && net.ok) send({ t: 'start', seed, floor: 1, taken: [] });
    beginFloor(seed, 1, [], false);
  }
  function beginFloor(seed, floor, taken, late) {
    if (!me || late && mode === 'lobby') me = newMe();
    hideLobby();
    L = genLevel(seed, floor); taken.forEach(id => { const it = L.items.find(i => i.id === id); if (it) it.taken = true; });
    const slot = net ? [...others.keys(), net.id].sort((a, b) => a - b).indexOf(net.id) : 0;
    me.x = L.spawn.x + [0, .6, -.6, 0][slot % 4] * .8; me.y = L.spawn.y + [0, 0, 0, .6][slot % 4]; me.a = Math.atan2(L.exit.fy - me.y, L.exit.fx - me.x);
    for (let k = 0; k < 40 && !free(me.x, me.y, .22); k++) { me.x = L.spawn.x + (Math.random() - .5); me.y = L.spawn.y + (Math.random() - .5); }
    if (me.out && floor > 1) { me.out = false; me.hearts = 1; }
    me.elev = false; me.hidden = null; me.fuses = L.items.filter(i => i.taken && i.k === 'fuse').length; me.sanity = Math.max(me.sanity, 70);
    mons = [];
    if (isHost()) spawnMonsters();
    others.forEach(o => { o.e = 0; });
    mode = 'between'; between = 2.6; scareT = 14 + Math.random() * 10; pings = []; fx = []; mapOpen = false; noteShow = null;
    K.score = Math.max(K.score, (floor - 1) * 100);
    startDrone();
    if (!K.bot) { tone(110, 2.5, 'sawtooth', .06, -60); hiss(2.5, .08, 60, 400, 0, 0, true); }
  }
  function spawnMonsters() {
    const f = L.floor, nh = f >= 7 ? 3 : f >= 4 ? 2 : 1, nd = f >= 3 ? Math.min(4, 1 + ((f - 3) >> 1)) : 0;
    for (let i = 0; i < nh; i++) { const s = L.monSpawns[i % L.monSpawns.length]; mons.push({ type: 'hollow', x: s.x, y: s.y, a: 0, st: 'wander', path: null, stun: 0, sleep: f === 1 && i === 0 ? 25 : 4 + i * 6, lost: 0, wait: 0, stepT: 0, repath: 0 }); }
    for (let i = 0; i < nd; i++) { const s = L.monSpawns[(i + 1) % L.monSpawns.length]; mons.push({ type: 'doll', x: s.x + (Math.random() - .5), y: s.y + (Math.random() - .5), a: 0, st: 'still', stun: 0, repath: 0 }); }
  }
  function endRun() {
    if (mode === 'over') return;
    mode = 'over'; try { document.exitPointerLock(); } catch (e) {}
    K.score = (L.floor - 1) * 100 + me.fuses * 10 + me.relics * 5 + (save.notes || []).length;
    save.bestFloor = Math.max(save.bestFloor || 0, L.floor); K.persist();
    K.over({ title: `Taken on floor ${L.floor}`, text: `${THEMES[L.theme].n}. ${me.relics} relics found. Deepest ever: floor ${save.bestFloor}.`, delay: 400 });
  }
  function say(s, c = '#fff') { feed.push({ s, c, t: 5 }); if (feed.length > 5) feed.shift(); }

  /* ---------- player ---------- */
  function takeItem(id, mine) {
    const it = L && L.items.find(i => i.id === id); if (!it || it.taken) return; it.taken = true;
    if (it.k === 'fuse') { me.fuses = L.items.filter(i => i.taken && i.k === 'fuse').length; if (me.fuses >= L.need) { say('The elevator hums. It has power.', '#7dff9a'); tone(220, 1.2, 'triangle', .08, 220); } }
    if (!mine) return;
    if (it.k === 'fuse') { say(`Fuse ${me.fuses}/${L.need}`, '#ffe680'); tone(660, .15, 'triangle', .12); tone(990, .2, 'triangle', .1, 0, 0, .1); }
    if (it.k === 'battery') { me.bat = Math.min(1, me.bat + .45); say('Battery +45%', '#9dff9d'); tone(520, .12, 'square', .05); }
    if (it.k === 'film') { me.film++; say('Camera film +1', '#cfe8ff'); tone(800, .1, 'square', .05); }
    if (it.k === 'relic') { me.relics++; K.coin(1); say('Relic', '#c890ff'); tone(330, .5, 'sine', .08, 330); }
    if (it.k === 'note') { const have = save.notes || (save.notes = []), left = NOTES.map((_, i) => i).filter(i => !have.includes(i)); const i = left.length ? left[0] : Math.floor(Math.random() * NOTES.length); if (!have.includes(i)) have.push(i); K.persist(); noteShow = { i, t: 9 }; tone(200, .4, 'triangle', .06); }
    send({ t: 'take', id });
  }
  function caught(kind) {
    if (js || me.out) return;
    js = { t: 0, kind: kind || 'hollow' }; me.hidden = null; me.elev = false; me.hearts--; me.sanity = Math.max(0, me.sanity - 35);
    scream(.55); K.shake(30);
  }
  function afterCaught() {
    if (me.hearts > 0) {
      const sp = L.rooms[Math.floor(Math.random() * L.rooms.length)];
      me.x = sp.x + sp.w / 2; me.y = sp.y + sp.h / 2; if (!free(me.x, me.y, .22)) { me.x = L.spawn.x; me.y = L.spawn.y; }
      say(`You wake up somewhere else. ${me.hearts} ${me.hearts === 1 ? 'heart' : 'hearts'} left.`, '#ff8080'); fx.push({ k: 'fade', t: 1.5 });
    } else {
      me.out = true; say('You were taken.', '#ff5050');
      if (!net || ![...others.values()].some(o => !o.out)) { if (net) send({ t: 'end' }); endRun(); }
    }
  }
  function interact() {
    if (me.out || js) return;
    if (me.hidden) { me.hidden = null; tone(180, .2, 'square', .05, -40); hiss(.25, .08, 300, 2000); return; }
    if (me.elev) { me.elev = false; me.elevCool = 1.5; return; }
    const f = facingTile();
    if (f && f.v === 3) { const lk = L.lockers.find(l => l.x === f.x && l.y === f.y); if (lk) { me.hidden = lk; me.hideT = 0; me.x = lk.fx; me.y = lk.fy; me.a = Math.atan2(lk.fy - (lk.y + .5), lk.fx - (lk.x + .5)); hiss(.3, .1, 300, 2000); tone(160, .25, 'square', .05, -40); } return; }
    if (f && f.v === 4) { if (me.fuses >= L.need) { me.elev = true; me.x = L.exit.fx; me.y = L.exit.fy; tone(440, .4, 'triangle', .08); } else say(`No power. Find ${L.need - me.fuses} more ${L.need - me.fuses === 1 ? 'fuse' : 'fuses'}.`, '#ffe680'); }
  }
  function facingTile() { for (const d of [.6, 1, 1.3]) { const x = Math.floor(me.x + Math.cos(me.a) * d), y = Math.floor(me.y + Math.sin(me.a) * d), v = L.grid[y * L.n + x]; if (v) return { x, y, v }; } return null; }
  function camFlash() {
    if (me.film <= 0 || me.out || me.hidden || js) return;
    me.film--; flashT = .5; tone(1800, .08, 'square', .1); hiss(.3, .2, 2000, 9000);
    if (isHost()) flashStun(me.x, me.y, me.a); else send({ t: 'flash', x: me.x, y: me.y, a: me.a });
  }
  function flashStun(x, y, a) {
    for (const m of mons) { const d = Math.hypot(m.x - x, m.y - y); if (d < 7 && angDiff(Math.atan2(m.y - y, m.x - x), a) < .7 && los(x, y, m.x, m.y)) { m.stun = m.type === 'doll' ? 6 : 4.5; m.st = 'stun'; send({ t: 'scr', x: m.x, y: m.y }); scream(.2 * srcSound(m.x, m.y).vol); } }
  }
  function ping() { if (me.out) return; send({ t: 'ping', x: me.x, y: me.y }); pings.push({ x: me.x, y: me.y, t: 3, who: 'You' }); tone(880, .3, 'triangle', .1); if (isHost()) noise(me.x, me.y, 14); }
  function updateMe(dt) {
    if (me.out) { const alive = [...others.values()].filter(o => !o.out); if (alive.length) spect = spect % alive.length; return; }
    if (me.hidden) { me.hideT += dt; me.sanity = Math.min(100, me.sanity + dt * 1.5); return; }
    if (me.elev) return;
    let fw = 0, st = 0, turn = 0;
    if (keys.KeyW || keys.ArrowUp) fw++; if (keys.KeyS || keys.ArrowDown) fw--; if (keys.KeyA) st--; if (keys.KeyD) st++;
    if (keys.ArrowLeft) turn--; if (keys.ArrowRight) turn++;
    if (touch.move) { fw -= touch.move.dy; st += touch.move.dx; }
    me.a += turn * 2.4 * dt;
    const want = (keys.ShiftLeft || keys.ShiftRight || touch.run) && (fw || st) && me.stam > .02;
    me.run = want; me.stam = want ? Math.max(0, me.stam - dt / me.stamMax) : Math.min(1, me.stam + dt / 3.5);
    const sp = (want ? 3.7 : 2.2) * dt, n = Math.hypot(fw, st) || 1, mx = (Math.cos(me.a) * fw - Math.sin(me.a) * st) / Math.max(1, n), my = (Math.sin(me.a) * fw + Math.cos(me.a) * st) / Math.max(1, n);
    if (free(me.x + mx * sp, me.y, .22)) me.x += mx * sp; if (free(me.x, me.y + my * sp, .22)) me.y += my * sp;
    const moving = fw || st;
    if (moving) { me.walk += dt * (want ? 1.6 : 1); me.stepT -= dt * (want ? 1.7 : 1); if (me.stepT <= 0) { me.stepT = .48; hiss(.07, want ? .09 : .05, 250, 1600); if (want) send({ t: 'noise', x: me.x, y: me.y, r: 8 }), isHost() && noise(me.x, me.y, 8); } }
    me.bob = moving ? Math.sin(me.walk * 9) * (want ? 3 : 1.8) : me.bob * .9;
    if (me.flash && me.bat > 0) me.bat = Math.max(0, me.bat - dt / me.batMax);
    const lit = me.flash && me.bat > 0, nearM = mons.reduce((d, m) => Math.min(d, Math.hypot(m.x - me.x, m.y - me.y)), 99);
    me.sanity = Math.max(0, Math.min(100, me.sanity + dt * ((lit ? .25 : -.9) * (lit ? 1 : me.nerve) - (nearM < 6 ? 1.6 * me.nerve : 0) + (others.size && [...others.values()].some(o => !o.out && Math.hypot(o.x - me.x, o.y - me.y) < 3) ? .6 : 0))));
    const ti = Math.floor(me.y) * L.n + Math.floor(me.x); for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const k = ti + a + b * L.n; if (k >= 0 && k < L.seen.length) L.seen[k] = 1; }
    for (const it of L.items) if (!it.taken && Math.hypot(it.x - me.x, it.y - me.y) < .55) takeItem(it.id, true);
    me.elevCool = Math.max(0, (me.elevCool || 0) - dt);
    if (me.fuses >= L.need && Math.hypot(me.x - L.exit.fx, me.y - L.exit.fy) < .7 && !me.elevCool) { me.elev = true; tone(440, .4, 'triangle', .08); }
  }

  /* ---------- monsters (host) ---------- */
  function players() {
    const a = [];
    if (me && !me.out) a.push({ id: myId(), x: me.x, y: me.y, a: me.a, f: me.flash && me.bat > 0, h: !!me.hidden, e: me.elev, me: 1 });
    others.forEach(o => { if (o.ok && !o.out) a.push({ id: o.id, x: o.rx, y: o.ry, a: o.ra, f: o.f, h: o.h, e: o.e }); });
    return a;
  }
  function noise(x, y, r) { for (const m of mons) if (m.type === 'hollow' && m.st !== 'hunt' && m.st !== 'stun' && !(m.sleep > 0) && Math.hypot(m.x - x, m.y - y) < r) { m.st = 'search'; m.tx = x; m.ty = y; m.path = null; } }
  function pathStep(m, tx, ty, sp, dt) {
    const n = L.n, ti = Math.floor(ty) * n + Math.floor(tx);
    if (!m.field || m.fieldFor !== ti || m.repath <= 0) { if (L.grid[ti] !== 0) return true; m.field = bfsFrom(L.grid, n, ti); m.fieldFor = ti; m.repath = .5; }
    const x = Math.floor(m.x), y = Math.floor(m.y), here = m.field[y * n + x];
    if (here <= 0) { const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy); if (d < .2) return true; m.x += dx / d * Math.min(d, sp * dt); m.y += dy / d * Math.min(d, sp * dt); m.a = Math.atan2(dy, dx); return here === 0 && d < .25; }
    let bx = x, by = y, bv = here;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = m.field[(y + b) * n + x + a]; if (v >= 0 && v < bv) { bv = v; bx = x + a; by = y + b; } }
    const cx = bx + .5, cy = by + .5, dx = cx - m.x, dy = cy - m.y, d = Math.hypot(dx, dy) || 1;
    m.x += dx / d * Math.min(d, sp * dt); m.y += dy / d * Math.min(d, sp * dt); m.a = Math.atan2(dy, dx);
    return false;
  }
  const wasHidden = new Map();
  function updateMonsters(dt) {
    const ps = players(), f = L.floor;
    // a player who ducks into a locker while the Hollow is chasing them gets dragged out
    for (const p of ps) { if (p.h && !wasHidden.get(p.id)) for (const m of mons) if (m.type === 'hollow' && m.st === 'hunt' && m.target === p.id && Math.hypot(m.x - p.x, m.y - p.y) < 7) { const lk = L.lockers.slice().sort((a, b) => Math.hypot(a.fx - p.x, a.fy - p.y) - Math.hypot(b.fx - p.x, b.fy - p.y))[0]; if (lk) m.sawHide = { lk, id: p.id }; } wasHidden.set(p.id, p.h); }
    for (const m of mons) {
      m.repath -= dt; const ox = m.x, oy = m.y;
      if (m.stun > 0) { m.stun -= dt; if (m.stun <= 0) { m.st = m.type === 'doll' ? 'still' : 'wander'; if (m.tp) { const s = L.monSpawns[Math.floor(Math.random() * L.monSpawns.length)]; m.x = s.x; m.y = s.y; m.tp = false; } } continue; }
      if (m.sleep > 0) { m.sleep -= dt; if (m.sleep <= 0 && f === 1) for (const p of ps) if (p.me) say('Somewhere below you, something gets up.', '#ff8080'); continue; }
      if (m.type === 'doll') {
        const seen = ps.some(p => !p.e && !p.h && Math.hypot(p.x - m.x, p.y - m.y) < 18 && angDiff(Math.atan2(m.y - p.y, m.x - p.x), p.a) < .75 && los(p.x, p.y, m.x, m.y));
        const tgt = ps.filter(p => !p.e && !p.h).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0];
        m.st = seen ? 'still' : 'move';
        if (!seen && tgt) pathStep(m, tgt.x, tgt.y, 2.2 + f * .06, dt);
        m.moved = Math.hypot(m.x - ox, m.y - oy) / dt;
        for (const p of ps) if (!p.h && !p.e && Math.hypot(p.x - m.x, p.y - m.y) < .55) { hit(p.id, 'doll'); m.stun = 3; m.tp = true; }
        continue;
      }
      // the Hollow
      let best = null;
      for (const p of ps) {
        if (p.h || p.e) continue; const d = Math.hypot(p.x - m.x, p.y - m.y); if (d > 16) continue;
        const ang = angDiff(Math.atan2(p.y - m.y, p.x - m.x), m.a);
        if ((d < 3 || (d < 10 && ang < 1.1) || (p.f && d < 15 && ang < 1.7)) && los(m.x, m.y, p.x, p.y) && (!best || d < best.d)) best = { p, d };
      }
      if (best) { if (m.st !== 'hunt') { send({ t: 'scr', x: m.x, y: m.y }); scream(.06 + .3 * srcSound(m.x, m.y).vol); } m.st = 'hunt'; m.tx = best.p.x; m.ty = best.p.y; m.lost = 0; m.target = best.p.id; }
      else if (m.st === 'hunt') { m.lost += dt; if (m.lost > .4) { m.st = 'search'; m.wait = 0; } }
      if (m.sawHide) { const lk = m.sawHide.lk; m.st = 'locker'; if (pathStep(m, lk.fx, lk.fy, 3, dt) || Math.hypot(m.x - lk.fx, m.y - lk.fy) < .6) { const p = ps.find(q => q.id === m.sawHide.id); if (p && p.h) hit(p.id, 'hollow'); m.sawHide = null; m.st = 'wander'; } continue; }
      const chase = 3 + Math.min(.9, f * .08);
      if (m.st === 'hunt') pathStep(m, m.tx, m.ty, chase, dt);
      else if (m.st === 'search') { if (pathStep(m, m.tx, m.ty, 2, dt)) { m.wait += dt; m.a += dt * 2; if (m.wait > 3.5) { m.st = 'wander'; m.path = null; } } }
      else { if (!m.wt || pathStep(m, m.wt.x, m.wt.y, 1.3, dt)) { const r = L.rooms[Math.floor(Math.random() * L.rooms.length)]; m.wt = { x: r.x + r.w / 2, y: r.y + r.h / 2 }; } }
      for (const p of ps) if (!p.h && !p.e && Math.hypot(p.x - m.x, p.y - m.y) < .6) { hit(p.id, 'hollow'); m.stun = 2.5; m.tp = true; m.st = 'stun'; }
      m.moved = Math.hypot(m.x - ox, m.y - oy) / dt;
    }
    // everyone alive is in the elevator: next floor
    if (ps.length && ps.every(p => p.e) && me.fuses >= L.need) {
      L.leaveT = (L.leaveT || 0) + dt;
      if (L.leaveT > 1.5) { const seed = (Math.random() * 1e9) | 0; send({ t: 'start', seed, floor: L.floor + 1, taken: [] }); beginFloor(seed, L.floor + 1, [], false); }
    } else if (L) L.leaveT = 0;
  }
  function hit(id, k) { if (id === myId()) caught(k); else send({ t: 'caught', id, k }); }

  /* ---------- scares (local only) ---------- */
  const SCARES = ['apparition', 'runner', 'whisper', 'slam', 'breath', 'lightsout', 'hands', 'phone', 'mimic', 'drop', 'knock', 'fakeheart'];
  function scare(k) {
    const ahead = d => ({ x: me.x + Math.cos(me.a) * d, y: me.y + Math.sin(me.a) * d });
    switch (k) {
      case 'apparition': { const p = ahead(1.6); if (!free(p.x, p.y, .1)) return scare('slam'); fx.push({ k: 'flicker', t: .7 }); fx.push({ k: 'ghost', x: p.x, y: p.y, t: .94, d: .62, tex: SPR.face, h: .55, z: .35 }); setTimeout(() => { sting(); K.shake(12); }, 620); break; }
      case 'runner': { let d = 7; for (; d > 3; d--) { const p = ahead(d); if (free(p.x, p.y, .2)) break; } const p = ahead(d), s = me.a + Math.PI / 2; fx.push({ k: 'run', x: p.x - Math.cos(s) * 1.5, y: p.y - Math.sin(s) * 1.5, vx: Math.cos(s) * 7, vy: Math.sin(s) * 7, t: .45, tex: SPR.hollow, h: 1 }); for (let i = 0; i < 4; i++) hiss(.06, .12, 100, 900, 0, i * .1); break; }
      case 'whisper': whisper(Math.random() < .5 ? `behind you, ${(net && net.name) || 'little one'}` : K.pick(['still here', 'I can see your light', 'come down', 'they left you'])); me.sanity -= 6; break;
      case 'slam': { const pan = Math.random() * 2 - 1; hiss(.4, .5, 40, 700, pan); tone(60, .5, 'square', .3, -30, pan); K.shake(8); me.sanity -= 4; break; }
      case 'breath': fx.push({ k: 'breath', t: 4, a0: me.a }); for (let i = 0; i < 4; i++) hiss(.8, .09, 300, 1600, -.9 * Math.sign(Math.random() - .5), i * 1, true); break;
      case 'lightsout': fx.push({ k: 'dark', t: 1.8 }); { const p = ahead(4); if (free(p.x, p.y, .1)) fx.push({ k: 'eyes', x: p.x, y: p.y, t: 1.8 }); } tone(90, 1.5, 'sawtooth', .05, -40); break;
      case 'hands': fx.push({ k: 'hands', t: 4, seed: Math.random() * 1000 }); for (let i = 0; i < 5; i++) tone(70, .12, 'sine', .3, 0, 0, i * .25); break;
      case 'phone': for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) tone(i % 2 ? 480 : 440, .09, 'sine', .04, 0, .6, r * 1.6 + i * .1); break;
      case 'mimic': { let d = 6; for (; d > 3; d--) { const p = ahead(d); if (free(p.x, p.y, .2)) break; } const p = ahead(d); fx.push({ k: 'mimic', x: p.x, y: p.y, t: 12, tex: friendTex[Math.floor(Math.random() * 4)], h: .8 }); break; }
      case 'drop': { const p = ahead(2.2); if (!free(p.x, p.y, .1)) return scare('knock'); fx.push({ k: 'drop', x: p.x, y: p.y, t: .5, z: .8, tex: SPR.hollow, h: 1 }); setTimeout(() => { scream(.25); K.shake(14); }, 120); break; }
      case 'knock': for (let i = 0; i < 3; i++) { tone(110, .1, 'square', .25, -40, .7, i * .28); hiss(.08, .2, 80, 600, .7, i * .28); } break;
      case 'fakeheart': for (let i = 0; i < 8; i++) setTimeout(() => heart(.35), i * 420); fx.push({ k: 'pulse', t: 3.4 }); break;
    }
  }
  function updateScares(dt) {
    if (me.out || me.elev) return;
    scareT -= dt * (1 + (100 - me.sanity) / 60 + L.floor * .05);
    if (scareT <= 0 && !js) { scareT = 16 + Math.random() * 22; scare(K.pick(L.floor === 1 && Math.random() < .5 ? ['whisper', 'slam', 'knock', 'phone', 'runner'] : SCARES)); }
    for (let i = fx.length - 1; i >= 0; i--) {
      const e = fx[i]; e.t -= dt;
      if (e.k === 'ghost' && e.d !== undefined) { e.d -= dt; }
      if (e.k === 'run') { e.x += e.vx * dt; e.y += e.vy * dt; }
      if (e.k === 'drop') e.z = Math.max(0, e.z - dt * 3);
      if (e.k === 'breath' && angDiff(me.a, e.a0) > 2.4 && !e.done) { e.done = 1; const p = { x: me.x + Math.cos(me.a) * 1.2, y: me.y + Math.sin(me.a) * 1.2 }; if (free(p.x, p.y, .1)) { fx.push({ k: 'ghost', x: p.x, y: p.y, t: .35, tex: SPR.face, h: .6, z: .3 }); scream(.35); K.shake(16); me.sanity -= 12; } }
      if (e.k === 'mimic' && !e.done && Math.hypot(e.x - me.x, e.y - me.y) < 2.6) { e.done = 1; e.t = .45; e.rush = 1; scream(.4); K.shake(18); me.sanity -= 12; js = { t: .55, kind: 'mimic', mini: 1 }; }
      if (e.k === 'mimic' && e.rush) { e.x += (me.x - e.x) * dt * 8; e.y += (me.y - e.y) * dt * 8; }
      if (e.t <= 0) fx.splice(i, 1);
    }
    if (me.sanity < 20 && Math.random() < dt * .08) { const p = { x: me.x + Math.cos(me.a + (Math.random() - .5)) * 5, y: me.y + Math.sin(me.a + (Math.random() - .5)) * 5 }; if (free(p.x, p.y, .2)) fx.push({ k: 'ghost', x: p.x, y: p.y, t: .25, tex: SPR.hollow, h: 1 }); }
  }

  /* ---------- rendering ---------- */
  const lights = [];
  let XR = 0, XG = 0, XB = 0;
  function ext(x, y) {
    XR = XG = XB = 0;
    for (let i = 0; i < lights.length; i++) {
      const l = lights[i], vx = x - l.x, vy = y - l.y, d2 = vx * vx + vy * vy;
      if (d2 > l.r2) continue;
      let k;
      if (l.cone) { const d = Math.sqrt(d2) + 1e-4, c = (vx * l.dx + vy * l.dy) / d; k = (c > .82 ? (c - .82) * 5.5 : 0) * 1.6 / (1 + d2 * .2) + .3 / (1 + d2 * 4); }
      else k = l.i / (1 + d2 * .9);
      XR += k * l.cr; XG += k * l.cg; XB += k * l.cb;
    }
  }
  const CT = new Float32Array(257);
  function render(cam) {
    const T = L.tex, th = THEMES[L.theme], dx = Math.cos(cam.a), dy = Math.sin(cam.a), plx = -dy * FOV, ply = dx * FOV, hz = (RH >> 1) + (cam.bob | 0), amb = th.amb + (cam.sanity < 30 ? .01 : 0);
    const lamp = cam.lamp, w = cam.lampW || 1;
    for (let x = 0; x < RW; x++) { const v = (x - RW / 2) / (RW * .3 * w); coneX[x] = v * v; }
    for (let y = 0; y < RH * 2; y++) { const v = (y - RH) / (RH * .55 * w); coneY[y] = v * v; }
    for (let i = 0; i <= 256; i++) { const r2 = i / 64; CT[i] = (r2 < 1 ? Math.pow(1 - r2, 1.4) : 0) + .06 / (1 + r2 * 3); }
    const cone = (x, yy) => CT[Math.min(256, ((coneX[x] + coneY[yy + RH]) * 64) | 0)];
    const meI = d => lamp * 2.4 / (1 + d * d * .085);
    // lights near the camera: other players' flashlights, red emergency lamps
    lights.length = 0;
    others.forEach(o => { if (o.out || !o.f || cam.of === o) return; if (Math.hypot(o.x - cam.x, o.y - cam.y) < 16) lights.push({ cone: 1, x: o.x, y: o.y, dx: Math.cos(o.a), dy: Math.sin(o.a), r2: 100, cr: 1, cg: .94, cb: .8 }); });
    for (const l of L.lamps) { if (Math.hypot(l.x - cam.x, l.y - cam.y) > 14) continue; const fl = l.exit ? (me.fuses >= L.need ? 1 : .8) : (Math.sin(K.t * 13 + l.fl * 40) > .93 - l.fl * .2 ? .15 : 1) * (darkFx() ? 0 : 1); lights.push({ x: l.x, y: l.y, i: l.i * fl, r2: 36, cr: l.exit && me.fuses >= L.need ? .1 : l.r, cg: l.exit && me.fuses >= L.need ? 1 : l.g, cb: l.exit && me.fuses >= L.need ? .3 : l.b }); }
    P32.fill(0xff000000);
    const n = L.n, G = L.grid, WM = L.wm;
    // floor and ceiling, a row at a time
    for (let y = hz + 1; y < RH; y++) {
      const p = y - hz, rd = (RH * .5) / p, sx = rd * 2 * plx / RW, sy = rd * 2 * ply / RW, mi = meI(rd), yc = 2 * hz - y, by = (y & 3) * 4, byc = (yc & 3) * 4;
      let fx2 = cam.x + rd * (dx - plx), fy2 = cam.y + rd * (dy - ply);
      for (let x = 0; x < RW; x++, fx2 += sx, fy2 += sy) {
        const ti = (((fy2 * TX) & TM) << TS) | ((fx2 * TX) & TM), cxi = fx2 | 0, cyi = fy2 | 0, wm = cxi > 0 && cyi > 0 && cxi < n && cyi < n ? WM[cyi * n + cxi] : 0;
        let ao = 1;
        if (wm) { const ux = fx2 - cxi, uy = fy2 - cyi; if (wm & 1 && ux < .25) ao *= .4 + ux * 2.4; if (wm & 2 && ux > .75) ao *= .4 + (1 - ux) * 2.4; if (wm & 4 && uy < .25) ao *= .4 + uy * 2.4; if (wm & 8 && uy > .75) ao *= .4 + (1 - uy) * 2.4; }
        ext(fx2, fy2);
        let I = cone(x, p) * mi * ao, c = T.floor[ti], d = BAY[by + (x & 3)], xr = XR * ao, xg = XG * ao, xb = XB * ao;
        P32[y * RW + x] = 0xff000000 | (cl(((c >> 16) & 255) * (I * .82 + xb + amb * 1.3) + d) << 16) | (cl(((c >> 8) & 255) * (I * .94 + xg + amb) + d) << 8) | cl((c & 255) * (I + xr + amb) + d);
        if (yc >= 0) { I = cone(x, -p) * mi * .85 * ao; c = T.ceil[ti]; d = BAY[byc + (x & 3)]; P32[yc * RW + x] = 0xff000000 | (cl(((c >> 16) & 255) * (I * .82 + xb * .8 + amb * 1.3) + d) << 16) | (cl(((c >> 8) & 255) * (I * .94 + xg * .8 + amb) + d) << 8) | cl((c & 255) * (I + xr * .8 + amb) + d); }
      }
    }
    // walls
    for (let x = 0; x < RW; x++) {
      const camX = 2 * x / RW - 1, rx = dx + plx * camX, ry = dy + ply * camX;
      let mx = Math.floor(cam.x), my = Math.floor(cam.y);
      const ddx = Math.abs(1 / rx), ddy = Math.abs(1 / ry), stx = rx < 0 ? -1 : 1, sty = ry < 0 ? -1 : 1;
      let sdx = rx < 0 ? (cam.x - mx) * ddx : (mx + 1 - cam.x) * ddx, sdy = ry < 0 ? (cam.y - my) * ddy : (my + 1 - cam.y) * ddy, side = 0, v = 0;
      for (let k = 0; k < 64; k++) { if (sdx < sdy) { sdx += ddx; mx += stx; side = 0; } else { sdy += ddy; my += sty; side = 1; } if (mx < 0 || my < 0 || mx >= n || my >= n) { v = 1; break; } v = G[my * n + mx]; if (v) break; }
      const perp = Math.max(.05, side ? sdy - ddy : sdx - ddx); zbuf[x] = perp;
      const lh = RH / perp, ds = hz - lh / 2;
      let wx = side ? cam.x + perp * rx : cam.y + perp * ry; wx -= Math.floor(wx);
      let tx = (wx * TX) | 0; if ((!side && rx > 0) || (side && ry < 0)) tx = TM - tx;
      const tex = v === 2 ? T.alt : v === 3 ? T.locker : v === 4 ? (me.fuses >= L.need ? T.elevOn : T.elevOff) : v === 5 ? T.blood : T.wall;
      ext(cam.x + perp * rx * .97, cam.y + perp * ry * .97);
      const mi = meI(perp) * (side ? .75 : 1), y0 = Math.max(0, ds | 0), y1 = Math.min(RH - 1, (ds + lh) | 0), sh = side ? .78 : 1;
      for (let y = y0; y <= y1; y++) {
        const fv = (y - ds) / lh, ao = fv > .9 ? .45 + (1 - fv) * 5.5 : fv < .07 ? .5 + fv * 7 : 1, c = tex[((((y - ds) * TX / lh) | 0) & TM) * TX + tx], I = cone(x, y - hz) * mi * ao, d = BAY[(y & 3) * 4 + (x & 3)], s2 = sh * ao;
        P32[y * RW + x] = 0xff000000 | (cl(((c >> 16) & 255) * (I * .82 + (XB + amb * 1.3) * s2) + d) << 16) | (cl(((c >> 8) & 255) * (I * .94 + (XG + amb) * s2) + d) << 8) | cl((c & 255) * (I + (XR + amb) * s2) + d);
      }
    }
    // sprites
    const spr = []; others.forEach(o => { o.scr = null; });
    for (const it of L.items) if (!it.taken) spr.push({ x: it.x, y: it.y, tex: SPR[it.k], h: .2, glow: .25 });
    for (const l of L.lamps) if (!l.exit) spr.push({ x: l.x, y: l.y, tex: SPR.lamp, h: .2, z: .8, glow: .3 });
    for (const m of mons) { if (m.type === 'doll') spr.push({ x: m.x, y: m.y, tex: SPR.doll, h: .55, dim: .75 }); else spr.push({ x: m.x + (m.st === 'hunt' ? (Math.random() - .5) * .04 : 0), y: m.y, tex: SPR.hollow, h: 1.08, z: -.04, dim: .5 }); }
    others.forEach(o => { if (!o.out && !o.h && cam.of !== o && o.ok) spr.push({ x: o.x, y: o.y, tex: o.tex, h: .8, glow: .06, dim: .7, who: o }); });
    if (cam.of && !me.out && !me.hidden) spr.push({ x: me.x, y: me.y, tex: friendTex[myId() % 4], h: .8, glow: .12 });
    for (const e of fx) if (e.tex && (!e.d || e.d <= 0)) spr.push({ x: e.x, y: e.y, tex: e.tex, h: e.h, z: e.z || 0 });
    for (const e of fx) if (e.k === 'eyes') spr.push({ x: e.x, y: e.y, tex: SPR.face, h: .45, z: .45, eyesOnly: 1 });
    const inv = 1 / (plx * dy - dx * ply);
    for (const s of spr) { const sx = s.x - cam.x, sy = s.y - cam.y; s.tx = inv * (dy * sx - dx * sy); s.ty = inv * (-ply * sx + plx * sy); }
    spr.sort((a, b) => b.ty - a.ty);
    for (const s of spr) {
      if (s.ty < .12) continue;
      const t = s.tex, scx = (RW / 2) * (1 + s.tx / s.ty), h = s.h * RH / s.ty, w = h * t.w / t.h, fy = hz + (RH * .5) / s.ty, top = fy - h - (s.z || 0) * RH / s.ty;
      const x0 = Math.max(0, (scx - w / 2) | 0), x1 = Math.min(RW - 1, (scx + w / 2) | 0), mi = meI(s.ty); ext(s.x, s.y);
      if (s.who) s.who.scr = { x: scx * SC(), y: top * SC(), d: s.ty, vis: x0 <= x1 && s.ty < zbuf[Math.max(0, Math.min(RW - 1, scx | 0))] };
      for (let x = x0; x <= x1; x++) {
        if (s.ty >= zbuf[x]) continue;
        const u = Math.min(t.w - 1, ((x - (scx - w / 2)) * t.w / w) | 0);
        for (let y = Math.max(0, top | 0); y < Math.min(RH, top + h); y++) {
          const vi = Math.min(t.h - 1, ((y - top) * t.h / h) | 0) * t.w + u, c = t.d[vi];
          if ((c >>> 24) < 128) continue;
          if (t.e[vi]) { P32[y * RW + x] = c; continue; }
          if (s.eyesOnly) continue;
          const I = cone(x, y - hz) * mi * (s.dim || 1) + (s.glow || 0);
          P32[y * RW + x] = 0xff000000 | (cl(((c >> 16) & 255) * (I * .82 + XB + amb * 1.3)) << 16) | (cl(((c >> 8) & 255) * (I * .94 + XG + amb)) << 8) | cl((c & 255) * (I + XR + amb));
        }
      }
    }
    bctx.putImageData(img, 0, 0);
  }
  function darkFx() { return fx.some(e => e.k === 'dark' || (e.k === 'flicker' && e.t > .1)); }

  /* ---------- lobby (HTML) ---------- */
  const css = document.createElement('style');
  css.textContent = `#shLobby .card{max-width:460px}#shLobby input{width:100%;padding:12px 14px;border-radius:14px;border:1px solid var(--edge);background:rgba(0,0,0,.45);color:#fff;font:800 18px Nunito,sans-serif;margin:6px 0;text-align:center}#shLobby .code{font:42px "Rubik Glitch",Impact,sans-serif;letter-spacing:.2em;color:var(--accent)}#shLobby ul{list-style:none;padding:0;margin:8px 0;text-align:left}#shLobby li{padding:6px 10px;border-radius:10px;background:rgba(255,255,255,.06);margin:4px 0;font-weight:800}#shLobby .msg{min-height:20px;color:#ff9a9a;font-weight:800;font-size:14px}#shLobby .up{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.06);margin:6px 0;text-align:left;font-size:14px}#shLobby .up button{padding:8px 12px;border-radius:10px;background:var(--accent);color:#000;font-weight:900;white-space:nowrap}#shLobby .up button:disabled{opacity:.35}#shLobby .note{text-align:left;font-size:14px;line-height:1.4;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.05);margin:6px 0}`;
  document.head.appendChild(css);
  const lob = document.createElement('div'); lob.className = 'scr'; lob.id = 'shLobby'; lob.hidden = true;
  lob.innerHTML = `<div class="card"><h2 class="title">Still Here</h2><p class="sub" id="shSub"></p><div id="shMain">
    <input id="shName" maxlength="12" placeholder="Your name"><button class="big" id="shSolo">Play alone</button>
    <div class="row"><button id="shCreate">Create a room</button><button id="shJoinB">Join a room</button></div>
    <div id="shJoinBox" hidden><input id="shCode" maxlength="4" placeholder="ROOM CODE" autocomplete="off"><button class="big" id="shJoinGo">Join</button></div>
    <div id="shRoom" hidden><p class="sub" style="margin:10px 0 0">Room code (send it to your friends)</p><div class="code" id="shCodeShow"></div><ul id="shPlayers"></ul><button class="big" id="shStart">Start</button><p class="hint" id="shWait"></p><div class="row"><button id="shLeave">Leave the room</button></div></div>
    <div class="row"><button id="shShop">Upgrades</button><button id="shFiles">Files</button></div><p class="msg" id="shMsg"></p>
    <p class="hint">Headphones on. Lights off. Contains loud jump scares.</p></div><div id="shSide" hidden></div></div>`;
  document.body.appendChild(lob);
  const $s = id => document.getElementById(id);
  function lobbyMsg(s) { $s('shMsg').textContent = s || ''; }
  function showLobby() {
    lob.hidden = false; $s('shMain').hidden = false; $s('shSide').hidden = true;
    $s('shName').value = save.name || ''; $s('shSub').textContent = `Deepest floor: ${save.bestFloor || 0} · Relics: ${save.coins || 0} · Files: ${(save.notes || []).length}/${NOTES.length}`;
    lobbyRoom();
  }
  function hideLobby() { lob.hidden = true; }
  function lobbyRoom() {
    const inRoom = !!(net && net.ok);
    $s('shRoom').hidden = !inRoom; $s('shSolo').hidden = inRoom; $s('shCreate').parentNode.hidden = inRoom; if (inRoom) $s('shJoinBox').hidden = true;
    if (!inRoom) return;
    $s('shCodeShow').textContent = net.code;
    const ps = [{ id: net.id, name: net.name + ' (you)' }, ...[...others.values()]].sort((a, b) => a.id - b.id);
    $s('shPlayers').innerHTML = ps.map(p => `<li style="border-left:6px solid ${COLS[p.id % 4]}">${p.name.replace(/[<>&]/g, '')}${p.id === net.hostId ? ' · host' : ''}</li>`).join('');
    $s('shStart').hidden = !isHost(); $s('shWait').textContent = isHost() ? (others.size ? 'Everyone in? Start when ready.' : 'Waiting for friends... or start alone.') : 'Waiting for the host to start.';
    lobbyMsg('');
  }
  const myName = () => { const v = ($s('shName').value || '').replace(/[^\w .'-]/g, '').trim().slice(0, 12) || 'Player'; save.name = v; K.persist(); return v; };
  $s('shSolo').onclick = () => { myName(); if (net && net.ws) { try { net.ws.close(); } catch (e) {} } net = null; K.audio && K.audio(); startRun(); };
  $s('shCreate').onclick = () => { K.audio && K.audio(); const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; connect(Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join(''), myName()); };
  $s('shJoinB').onclick = () => { $s('shJoinBox').hidden = false; $s('shCode').focus(); };
  $s('shJoinGo').onclick = () => { K.audio && K.audio(); const c = ($s('shCode').value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length !== 4) return lobbyMsg('Room codes are 4 letters.'); connect(c, myName()); };
  $s('shCode').onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') $s('shJoinGo').click(); };
  $s('shName').onkeydown = e => e.stopPropagation();
  $s('shStart').onclick = () => { K.audio && K.audio(); startRun(); };
  $s('shLeave').onclick = () => { const w = net && net.ws; net = null; others.clear(); if (w) try { w.close(); } catch (e) {} lobbyRoom(); };
  $s('shShop').onclick = () => side('shop'); $s('shFiles').onclick = () => side('files');
  function side(k) {
    const el = $s('shSide'); $s('shMain').hidden = true; el.hidden = false; const up = save.up || (save.up = {});
    if (k === 'shop') el.innerHTML = `<p class="sub">Spend relics you find in the dark. You have <b>${save.coins || 0}</b>.</p>` + UPS.map(([id, n, d, max]) => { const lv = up[id] || 0; return `<div class="up"><div><b>${n}</b> ${'●'.repeat(lv)}${'○'.repeat(max - lv)}<br><small>${d}</small></div>${lv < max ? `<button data-up="${id}" ${(save.coins || 0) < upCost(lv) ? 'disabled' : ''}>${upCost(lv)} relics</button>` : '<small>MAX</small>'}</div>`; }).join('');
    else el.innerHTML = `<p class="sub">Files found: ${(save.notes || []).length}/${NOTES.length}</p>` + NOTES.map((t, i) => `<div class="note">${(save.notes || []).includes(i) ? t : '<i style="opacity:.4">Not found yet. Keep going down.</i>'}</div>`).join('');
    el.insertAdjacentHTML('beforeend', '<button class="big" id="shBack" style="margin-top:10px">Back</button>');
    el.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const id = b.dataset.up, lv = up[id] || 0; if ((save.coins || 0) >= upCost(lv)) { save.coins -= upCost(lv); up[id] = lv + 1; K.persist(); tone(660, .2, 'triangle', .1); side('shop'); } });
    $s('shBack').onclick = showLobby;
  }

  /* ---------- kit hooks ---------- */
  GAME.reset = () => {
    save = K.save;
    if (!SPR.hollow) { buildSprites(); getFace('mimic'); others.forEach(o => { o.tex = friendTex[o.id % 4]; }); }
    for (const k in keys) keys[k] = false; feed = []; fx = []; js = null; noteShow = null; mapOpen = false; pings = [];
    if (K.bot) { if (net && net.ws) try { net.ws.close(); } catch (e) {} net = null; others.clear(); hideLobby(); demo(); return; }
    mode = 'lobby'; me = newMe(); L = genLevel(7, 2); me.x = L.spawn.x; me.y = L.spawn.y; mons = []; menuT = 0;
    if (pending && net && net.ok) { const m = pending; pending = null; return beginFloor(m.seed, m.floor, m.taken || [], false); }
    showLobby();
  };
  function demo() {
    me = newMe(); me.hearts = 99; L = genLevel(1337, 3); me.x = L.spawn.x; me.y = L.spawn.y; mons = []; spawnMonsters(); mons.forEach(m => { m.sleep = 0; });
    mode = 'play'; between = 0; scareT = 4; me.demoT = 0;
  }
  GAME.pose = () => {
    const h = mons.find(m => m.type === 'hollow'); if (!h) return;
    for (let k = 0; k < 400; k++) { const r = L.rooms[k % L.rooms.length], x = r.x + .5, y = r.y + r.h / 2; if (free(x + 2.3, y, .2) && free(x, y, .2) && los(x, y, x + 2.3, y)) { me.x = x; me.y = y; me.a = 0; h.x = x + 2.3; h.y = y; break; } }
    h.st = 'hunt'; mons.filter(m => m !== h).forEach(m => { m.x = -9; m.y = -9; }); me.flash = true; me.bat = 1; me.bob = 0;
  };
  function botThink(dt) {
    me.demoT += dt;
    const h = mons.find(m => m.type === 'hollow');
    if (h && me.demoT > 6 && !me.demoMet) { me.demoMet = 1; for (let d = 6; d > 3; d--) { const x = me.x + Math.cos(me.a) * d, y = me.y + Math.sin(me.a) * d; if (free(x, y, .3) && los(me.x, me.y, x, y)) { h.x = x; h.y = y; h.sleep = 0; h.stun = 0; h.st = 'hunt'; break; } } }
    if (!me.bt || Math.hypot(me.bt.x - me.x, me.bt.y - me.y) < .6 || me.btT <= 0) { const it = L.items.filter(i => !i.taken).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[Math.floor(Math.random() * 2)]; me.bt = it ? { x: it.x, y: it.y } : { x: L.rooms[0].x + 1, y: L.rooms[0].y + 1 }; me.btT = 9; me.field = bfsFrom(L.grid, L.n, Math.floor(me.bt.y) * L.n + Math.floor(me.bt.x)); }
    me.btT -= dt;
    const x = Math.floor(me.x), y = Math.floor(me.y), here = me.field[y * L.n + x]; let tx = me.bt.x, ty = me.bt.y;
    if (here > 0) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = me.field[(y + b) * L.n + x + a]; if (v >= 0 && v < here) { tx = x + a + .5; ty = y + b + .5; } }
    const want = Math.atan2(ty - me.y, tx - me.x), da = ((want - me.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    me.a += Math.max(-dt * 2.6, Math.min(dt * 2.6, da)) + Math.sin(K.t * .9) * dt * .25;
    keys.KeyW = Math.abs(da) < .9;
  }
  GAME.update = dt => {
    if (!drone && K.ac && mode !== 'lobby') startDrone();
    if (drone && K.ac) drone.gain.setTargetAtTime(mode === 'play' || mode === 'between' ? .045 + (100 - (me ? me.sanity : 100)) / 2000 : .02, K.ac.currentTime, .5);
    for (let i = feed.length - 1; i >= 0; i--) { feed[i].t -= dt; if (feed[i].t <= 0) feed.splice(i, 1); }
    if (mode === 'lobby') { menuT += dt; me.a += dt * .12; return; }
    if (mode === 'over' || !L) return;
    if (mode === 'between') { between -= dt; if (between <= 0) { mode = 'play'; if (!K.bot && L.floor === 1) say('Find the fuses. Power the elevator. Do not let it see your light.', '#ffe680'); } }
    if (js) { js.t += dt; if (js.t > (js.mini ? .9 : 1.25)) { const k = js; js = null; if (!k.mini) afterCaught(); } }
    if (flashT > 0) flashT -= dt;
    if (noteShow) { noteShow.t -= dt; if (noteShow.t <= 0) noteShow = null; }
    for (let i = pings.length - 1; i >= 0; i--) { pings[i].t -= dt; if (pings[i].t <= 0) pings.splice(i, 1); }
    if (mode === 'play' && !js) { if (K.bot) botThink(dt); updateMe(dt); updateScares(dt); }
    // network out
    if (net && net.ok) {
      net.sendT -= dt; if (net.sendT <= 0) { net.sendT = 1 / 12; send({ t: 'p', x: +me.x.toFixed(2), y: +me.y.toFixed(2), a: +me.a.toFixed(2), f: me.flash && me.bat > 0 ? 1 : 0, h: me.hidden ? 1 : 0, e: me.elev ? 1 : 0, o: me.out ? 1 : 0, r: me.run ? 1 : 0 }); }
      if (isHost() && others.size) { net.monT -= dt; if (net.monT <= 0) { net.monT = .1; send({ t: 'm', m: mons.map(m => [+m.x.toFixed(2), +m.y.toFixed(2), +m.a.toFixed(2), m.st, m.type === 'doll' ? 1 : 0]) }); } }
    }
    if (isHost() && mode === 'play') updateMonsters(dt);
    else mons.forEach(m => { if (m.rx !== undefined) { const ox = m.x, oy = m.y; m.x += (m.rx - m.x) * Math.min(1, dt * 10); m.y += (m.ry - m.y) * Math.min(1, dt * 10); m.a = m.ra; m.moved = Math.hypot(m.x - ox, m.y - oy) / dt; } });
    others.forEach(o => { const ox = o.x, oy = o.y; o.x += (o.rx - o.x) * Math.min(1, dt * 10); o.y += (o.ry - o.y) * Math.min(1, dt * 10); o.a += (((o.ra - o.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 10); const mv = Math.hypot(o.x - ox, o.y - oy);
      if (mv > dt * .5) { o.stepT -= dt * (o.run ? 1.7 : 1); if (o.stepT <= 0) { o.stepT = .48; const s = srcSound(o.x, o.y); hiss(.07, (o.run ? .09 : .05) * s.vol, 250, 1600, s.pan); } } });
    // monster footsteps and the heartbeat
    let near = 99;
    for (const m of mons) {
      const s = srcSound(m.x, m.y); near = Math.min(near, s.d);
      if ((m.moved || 0) > .3) { m.stepT = (m.stepT || 0) - dt; if (m.stepT <= 0) { if (m.type === 'doll') { m.stepT = .35; if (s.d < 9) tone(1200 + Math.random() * 400, .05, 'square', .04 * s.vol, -600, s.pan); } else { m.stepT = m.st === 'hunt' ? .27 : .6; tone(55, .16, 'sine', .45 * s.vol, -15, s.pan); hiss(.08, .1 * s.vol, 60, 500, s.pan); } } }
      if (m.type === 'hollow' && m.st !== 'hunt' && Math.random() < dt * .05 && s.d < 14) tone(90 + Math.random() * 40, 1.4, 'sawtooth', .05 * s.vol, -30, s.pan);
    }
    if (me && !me.out && near < 9) { me.hbT = (me.hbT || 0) - dt; if (me.hbT <= 0) { me.hbT = .35 + near * .1; heart(.12 + (9 - near) * .03); } }
  };

  /* ---------- drawing ---------- */
  let vign = null, grain = null, perf = 0, slowN = 0;
  const BLOOM = 'filter' in CanvasRenderingContext2D.prototype, bl = document.createElement('canvas'); bl.width = 160; bl.height = 90; const blc = bl.getContext('2d');
  const motes = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), z: .3 + Math.random() * .7, p: Math.random() * 6 }));
  function overlays() {
    if (!vign) {
      vign = document.createElement('canvas'); vign.width = 640; vign.height = 360; const v = vign.getContext('2d'), gr = v.createRadialGradient(320, 180, 60, 320, 180, 380); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.85)'); v.fillStyle = gr; v.fillRect(0, 0, 640, 360);
      grain = document.createElement('canvas'); grain.width = grain.height = 256; const g2 = grain.getContext('2d'), id = g2.createImageData(256, 256); for (let i = 0; i < id.data.length; i += 4) { const c = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = c; id.data[i + 3] = 15; } g2.putImageData(id, 0, 0);
    }
  }
  function face(g, kind, t) {
    const F = getFace(kind), v = K.view, k = Math.min(1, t / .12), s = (.3 + k * .62 + t * .22) * 3.1, sx = (Math.random() - .5) * 70 * (1 - t * .3), sy = (Math.random() - .5) * 70 * (1 - t * .3);
    g.fillStyle = Math.floor(t * 30) % 4 === 0 ? '#2a0000' : '#000'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const w = 300 * s * (1 + Math.sin(t * 70) * .03), h = 300 * s, x = 640 - w / 2 + sx, y = 380 - h * .48 + sy;
    g.save(); g.translate(640, 360); g.rotate(Math.sin(t * 31) * .05); g.translate(-640, -360);
    g.drawImage(F.img, x, y, w, h);
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = .55; const off = 10 + Math.random() * 24; g.drawImage(F.red, x + off, y, w, h); g.drawImage(F.cyan, x - off, y + off * .3, w, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 5; i++) { const sy0 = Math.random() * 300, sh = 6 + Math.random() * 26; g.drawImage(F.img, 0, sy0, 300, sh, x + (Math.random() - .5) * 140, y + sy0 * h / 300, w, sh * h / 300); }
    g.restore();
    g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(255,${150 + Math.random() * 50},${140 + Math.random() * 50},1)`; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 5; i++) { g.fillStyle = Math.random() < .6 ? '#000' : 'rgba(255,255,255,.3)'; g.fillRect(v.x0, Math.random() * 720, v.x1 - v.x0, 2 + Math.random() * 20); }
    if (grain) g.drawImage(grain, -Math.random() * 256, -Math.random() * 256, 1280 + 512, 720 + 512);
  }
  function hands(g, e) { const R = rng(e.seed | 0), a = Math.min(1, e.t / 1.5); g.fillStyle = `rgba(110,0,6,${.8 * a})`; for (let i = 0; i < 7; i++) { const x = R() < .5 ? R() * 260 : 1020 + R() * 260, y = R() * 720; g.beginPath(); g.ellipse(x, y, 34, 42, R() * 3, 0, 7); g.fill(); for (let f = 0; f < 5; f++) { g.beginPath(); g.ellipse(x - 30 + f * 15, y - 50 - (f % 4 ? 12 : 0), 7, 22, 0, 0, 7); g.fill(); } g.fillRect(x - 4, y + 30, 6, 40 + R() * 80); } }
  function project(x, y) { const c = me, dx = Math.cos(c.a), dy = Math.sin(c.a), plx = -dy * FOV, ply = dx * FOV, sx = x - c.x, sy = y - c.y, inv = 1 / (plx * dy - dx * ply), tx = inv * (dy * sx - dx * sy), ty = inv * (-ply * sx + plx * sy); return ty > .1 ? { x: 640 * (1 + tx / ty), d: ty } : null; }
  function drawHUD(g) {
    const v = K.view;
    g.textBaseline = 'middle';
    // top left: floor and objective
    g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.roundRect(64, 12, 420, 70, 12); g.fill();
    g.font = TF(28); g.fillStyle = '#ff3b3b'; g.textAlign = 'left'; g.fillText(`FLOOR ${L.floor}`, 80, 36);
    g.font = HF(15); g.fillStyle = '#ddd'; g.fillText(THEMES[L.theme].n, 230, 36);
    g.fillStyle = me.fuses >= L.need ? '#7dff9a' : '#ffe680'; g.fillText(me.fuses >= L.need ? 'The elevator has power. Get to it.' : `Fuses ${me.fuses}/${L.need}: power the elevator`, 80, 64);
    // bottom left: battery, stamina, hearts, film
    g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.roundRect(20, 620, 330, 84, 12); g.fill();
    g.font = HF(14); g.fillStyle = '#ccc'; g.fillText('LIGHT', 34, 642); g.fillText('RUN', 34, 666);
    g.fillStyle = '#333'; g.fillRect(90, 634, 160, 14); g.fillStyle = me.bat < .2 ? '#ff4040' : '#ffe680'; g.fillRect(90, 634, 160 * me.bat, 14);
    g.fillStyle = '#333'; g.fillRect(90, 660, 160, 10); g.fillStyle = '#9fe8ff'; g.fillRect(90, 660, 160 * me.stam, 10);
    g.font = HF(20); g.fillStyle = '#ff4060'; g.fillText('♥'.repeat(Math.max(0, me.hearts)), 34, 690); g.fillStyle = '#cfe8ff'; g.font = HF(15); g.fillText(`📷 ${me.film}`, 262, 641); g.fillStyle = '#c890ff'; g.fillText(`◉ ${me.relics}`, 262, 665);
    g.fillStyle = me.sanity < 30 ? '#ff6060' : '#aaa'; g.fillText(`Sanity ${Math.round(me.sanity)}`, 140, 690);
    // top right: party
    if (net && net.ok) {
      const ps = [{ name: (net.name || 'You') + ' (you)', id: net.id, st: me.out ? 'taken' : me.hidden ? 'hiding' : me.elev ? 'in elevator' : '' }, ...[...others.values()].map(o => ({ name: o.name, id: o.id, st: o.out ? 'taken' : o.h ? 'hiding' : o.e ? 'in elevator' : '' }))];
      g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.roundRect(1010, 12, 254, 30 + ps.length * 26, 12); g.fill();
      g.font = HF(13); g.fillStyle = '#9fe8ff'; g.textAlign = 'left'; g.fillText(`ROOM ${net.code}`, 1024, 28);
      ps.forEach((p, i) => { g.fillStyle = COLS[p.id % 4]; g.fillRect(1024, 44 + i * 26, 8, 16); g.fillStyle = p.st === 'taken' ? '#777' : '#fff'; g.font = HF(15); g.fillText(p.name, 1040, 52 + i * 26); g.fillStyle = p.st === 'taken' ? '#ff5050' : '#aaa'; g.textAlign = 'right'; g.font = HF(12); g.fillText(p.st, 1252, 52 + i * 26); g.textAlign = 'left'; });
    }
    // friend name tags and pings
    others.forEach(o => { if (o.out || !o.scr || !o.scr.vis || o.scr.d > 12) return; g.font = HF(16); g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillText(o.name, o.scr.x + 1, o.scr.y - 9); g.fillStyle = o.col; g.fillText(o.name, o.scr.x, o.scr.y - 10); });
    for (const p of pings) { const s = project(p.x, p.y); if (!s) continue; g.textAlign = 'center'; g.font = TF(34); g.fillStyle = `rgba(255,230,120,${Math.min(1, p.t)})`; g.fillText('!', s.x, 300); g.font = HF(13); g.fillText(`${p.who} · ${Math.round(Math.hypot(p.x - me.x, p.y - me.y))}m`, s.x, 330); }
    // prompts
    g.textAlign = 'center'; g.font = HF(18);
    const f = !me.hidden && !me.elev && !me.out && facingTile();
    let prompt = me.hidden ? 'Hiding. E to step out. Hold your breath.' : me.elev ? `In the elevator. ${[...others.values()].filter(o => !o.out && !o.e).length ? 'Waiting for the others... (E to step out)' : 'Going down...'}` : f && f.v === 3 ? 'E: hide in the locker' : f && f.v === 4 ? (me.fuses >= L.need ? 'E: take the elevator down' : `The elevator is dead. ${L.need - me.fuses} fuses to go.`) : '';
    if (me.out) prompt = `You were taken. Your friends can bring you back by reaching the next floor.`;
    if (prompt) { g.fillStyle = 'rgba(0,0,0,.55)'; const w = g.measureText(prompt).width + 30; g.fillRect(640 - w / 2, 560, w, 34); g.fillStyle = '#fff'; g.fillText(prompt, 640, 578); }
    // event feed
    feed.forEach((m, i) => { g.globalAlpha = Math.min(1, m.t); g.fillStyle = m.c; g.font = HF(17); g.fillText(m.s, 640, 470 + i * 24 - feed.length * 12); }); g.globalAlpha = 1;
    if (!touch.on && !K.bot && !document.pointerLockElement && mode === 'play' && !me.out) { g.font = HF(14); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillText('Click to look around with the mouse', 640, 700); }
  }
  function drawMap(g) {
    const n = L.n, s = Math.min(560 / n, 12), ox = 640 - n * s / 2, oy = 360 - n * s / 2;
    g.fillStyle = 'rgba(10,8,6,.92)'; g.fillRect(ox - 20, oy - 40, n * s + 40, n * s + 60); g.font = HF(16); g.fillStyle = '#ddd'; g.textAlign = 'center'; g.fillText('Your scribbled map (M to close)', 640, oy - 20);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = y * n + x; if (!L.seen[i]) continue; const v = L.grid[i]; g.fillStyle = v === 0 ? '#5a5244' : v === 4 ? (me.fuses >= L.need ? '#3dff7a' : '#ff3b3b') : v === 3 ? '#4a6a5a' : '#1e1a16'; g.fillRect(ox + x * s, oy + y * s, s, s); }
    others.forEach(o => { if (!o.out) { g.fillStyle = o.col; g.beginPath(); g.arc(ox + o.x * s, oy + o.y * s, 4, 0, 7); g.fill(); } });
    g.fillStyle = '#fff'; g.beginPath(); g.arc(ox + me.x * s, oy + me.y * s, 5, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(ox + me.x * s, oy + me.y * s); g.lineTo(ox + (me.x + Math.cos(me.a) * 1.6) * s, oy + (me.y + Math.sin(me.a) * 1.6) * s); g.stroke();
  }
  function drawTouch(g) {
    touch.btns = [['RUN', 1060, 560, 'run'], ['USE', 1180, 470, 'use'], ['LIGHT', 1180, 600, 'light'], ['📷', 1060, 440, 'cam'], ['MAP', 940, 640, 'map'], ['!', 940, 520, 'ping']];
    g.textAlign = 'center'; g.font = HF(18);
    for (const [t, x, y, k] of touch.btns) { g.fillStyle = (k === 'run' && touch.run) ? 'rgba(159,232,255,.45)' : 'rgba(255,255,255,.14)'; g.beginPath(); g.arc(x, y, 48, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillText(t, x, y); }
    if (touch.move) { g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 3; g.beginPath(); g.arc(touch.move.ox, touch.move.oy, 70, 0, 7); g.stroke(); g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(touch.move.ox + touch.move.dx * 70, touch.move.oy + touch.move.dy * 70, 30, 0, 7); g.fill(); }
  }
  GAME.draw = g => {
    const v = K.view; g.fillStyle = '#000'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    if (!L || !me) return;
    overlays();
    let cam = me;
    if (me.out) { const alive = [...others.values()].filter(o => !o.out); if (alive.length) { const o = alive[spect % alive.length]; cam = { x: o.x, y: o.y, a: o.a, bob: 0, lamp: o.f ? 1 : 0, of: o, lampW: 1, sanity: 100 }; } }
    if (mode === 'lobby') cam = { x: me.x, y: me.y, a: me.a, bob: 0, lamp: Math.sin(menuT * 7) > .85 ? .2 : .8, lampW: 1, sanity: 100 };
    else if (cam === me) { const fl = me.bat <= 0 || !me.flash ? 0 : (me.bat < .2 && Math.random() < .12 ? .1 : 1) * (darkFx() ? 0 : 1) * Math.min(1, .35 + me.bat * 2); cam = { x: me.x, y: me.y, a: me.a, bob: me.bob, lamp: me.hidden ? fl * .4 : fl, lampW: me.lampW, sanity: me.sanity }; }
    const t0 = performance.now(); render(cam); perf = perf * .95 + (performance.now() - t0) * .05;
    if (perf > 19 && RW > 320 && ++slowN > 90) { setRes(320, 180); perf = 0; }
    g.imageSmoothingEnabled = false;
    const wob = me.sanity < 30 && mode === 'play';
    if (wob) for (let y = 0; y < RH; y += 4) g.drawImage(buf, 0, y, RW, 4, Math.sin(K.t * 3 + y * .08) * (30 - me.sanity) * .5, y * SC(), 1280, 4 * SC());
    else g.drawImage(buf, 0, 0, 1280, 720);
    g.imageSmoothingEnabled = true;
    if (BLOOM) { blc.filter = 'blur(3px)'; blc.clearRect(0, 0, 160, 90); blc.drawImage(buf, 0, 0, 160, 90); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .3; g.drawImage(bl, 0, 0, 1280, 720); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    if (cam.lamp > .2) { for (const m of motes) { m.x += Math.sin(K.t * .3 + m.p) * .0004; m.y += .00025 + Math.cos(K.t * .5 + m.p) * .0003; if (m.y > 1) m.y = 0; const dx = (m.x - .5) * 2, dy = (m.y - .5) * 2, r = dx * dx / .5 + dy * dy / .9; if (r > 1) continue; g.fillStyle = `rgba(255,240,210,${(1 - r) * .35 * cam.lamp * m.z})`; g.fillRect(m.x * 1280, m.y * 720, 2.5 * m.z, 2.5 * m.z); } }
    if (me.hidden) { g.fillStyle = '#050606'; for (let y = 0; y < 720; y += 48) { g.fillRect(0, y, 1280, 30); } g.fillRect(0, 0, 220, 720); g.fillRect(1060, 0, 220, 720); }
    g.drawImage(vign, v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.drawImage(grain, -Math.random() * 256, -Math.random() * 256, 1280 + 512, 720 + 512);
    if (me.sanity < 40 && mode === 'play') { g.fillStyle = `rgba(80,0,0,${(40 - me.sanity) / 120 * (.7 + Math.sin(K.t * 5) * .3)})`; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
    for (const e of fx) { if (e.k === 'hands') hands(g, e); if (e.k === 'fade') { g.fillStyle = `rgba(0,0,0,${Math.min(1, e.t)})`; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); } if (e.k === 'pulse') { g.fillStyle = `rgba(120,0,0,${Math.max(0, Math.sin(K.t * 15)) * .25})`; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); } }
    if (flashT > 0) { g.fillStyle = `rgba(255,255,255,${flashT * 2})`; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
    if (mode === 'lobby') return;
    if (mode === 'between') {
      g.fillStyle = `rgba(0,0,0,${Math.min(1, between)})`; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
      g.globalAlpha = Math.min(1, between); g.textAlign = 'center'; g.font = TF(110); g.fillStyle = '#ff3b3b'; g.fillText(`FLOOR ${L.floor}`, 640 + (Math.random() - .5) * 6, 330); g.font = HF(22); g.fillStyle = '#ccc'; g.fillText(THEMES[L.theme].n + (L.floor >= 3 ? ' · the dolls are awake' : ''), 640, 410); g.globalAlpha = 1;
      return;
    }
    if (!K.bot) drawHUD(g);
    if (mapOpen) drawMap(g);
    if (noteShow) { g.fillStyle = 'rgba(232,224,200,.95)'; g.beginPath(); g.roundRect(340, 150, 600, 220, 8); g.fill(); g.fillStyle = '#2a2018'; g.font = HF(14); g.textAlign = 'left'; g.fillText(`FILE ${noteShow.i + 1}/${NOTES.length}`, 370, 180); g.font = '700 20px Georgia, serif'; let line = '', y = 220; for (const w of NOTES[noteShow.i].split(' ')) { if (g.measureText(line + w).width > 540) { g.fillText(line, 370, y); y += 30; line = ''; } line += w + ' '; } g.fillText(line, 370, y); }
    if (touch.on && !K.bot) drawTouch(g);
    if (js) face(g, js.kind, js.t);
  };

  /* ---------- input ---------- */
  GAME.key = (c, d) => {
    keys[c] = d; if (!d || mode !== 'play') return;
    if (c === 'KeyF') { me.flash = !me.flash; tone(1400, .03, 'square', .06); send({ t: 'noise', x: me.x, y: me.y, r: 2 }); }
    if (c === 'KeyE' || c === 'Space') interact();
    if (c === 'KeyC') camFlash();
    if (c === 'KeyQ') ping();
    if (c === 'KeyM' || c === 'Tab') mapOpen = !mapOpen;
    if (c === 'KeyN' && me.out) spect++;
  };
  GAME.down = (x, y, e) => {
    if (mode !== 'play') return;
    if (e && e.pointerType === 'touch') {
      touch.on = true;
      for (const [, bx, by, k] of touch.btns) if (Math.hypot(x - bx, y - by) < 52) { if (k === 'run') touch.run = !touch.run; if (k === 'use') interact(); if (k === 'light') GAME.key('KeyF', true); if (k === 'cam') camFlash(); if (k === 'map') mapOpen = !mapOpen; if (k === 'ping') ping(); if (me.out) spect++; return; }
      if (x < 640) touch.move = { id: e.pointerId, ox: x, oy: y, dx: 0, dy: 0 }; else touch.look = { id: e.pointerId, x };
      return;
    }
    if (me.out) { spect++; return; }
    if (!document.pointerLockElement) { try { document.getElementById('cv').requestPointerLock(); } catch (err) {} touch.drag = { x }; }
  };
  GAME.move = (x, y, e) => {
    if (mode !== 'play' || !me) return;
    if (document.pointerLockElement && e) { me.a += (e.movementX || 0) * .0028; return; }
    if (touch.move && e && e.pointerId === touch.move.id) { const dx = (x - touch.move.ox) / 70, dy = (y - touch.move.oy) / 70, l = Math.hypot(dx, dy); touch.move.dx = l > 1 ? dx / l : dx; touch.move.dy = l > 1 ? dy / l : dy; return; }
    if (touch.look && e && e.pointerId === touch.look.id) { me.a += (x - touch.look.x) * .006; touch.look.x = x; return; }
    if (touch.drag) { me.a += (x - touch.drag.x) * .005; touch.drag.x = x; }
  };
  GAME.up = (x, y, e) => { if (touch.move && (!e || e.pointerId === touch.move.id)) touch.move = null; if (touch.look && (!e || e.pointerId === touch.look.id)) touch.look = null; touch.drag = null; };
  addEventListener('pointerup', e => { if (touch.move && e.pointerId === touch.move.id) touch.move = null; if (touch.look && e.pointerId === touch.look.id) touch.look = null; });
  if (/[?&]test/.test(location.search)) window.SH = { faces: () => ['hollow', 'doll', 'mimic'].map(k => getFace(k).img.toDataURL()), sprite: k => { const t = SPR[k], c = document.createElement('canvas'); c.width = t.w; c.height = t.h; const id = c.getContext('2d').createImageData(t.w, t.h); new Uint32Array(id.data.buffer).set(t.d); c.getContext('2d').putImageData(id, 0, 0); return c.toDataURL(); }, get me() { return me; }, get L() { return L; }, get mons() { return mons; }, get others() { return others; }, get net() { return net; }, get mode() { return mode; }, scare, caught, startRun, connect };
})();
