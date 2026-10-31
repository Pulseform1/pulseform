/* Dead Air: first-person co-op ghost hunting for 1 to 4 players, each on their own device (rooms relay through /api/room).
   Something lives in 14 Alder Lane. Work out what it is from the evidence it leaves: EMF 5 readings, freezing temperatures,
   answers on the spirit box, ghost writing, and handprints only UV light shows. Name it in the journal and get out.
   There is no music. The house is quiet, apart from a faint static. The ghost almost never shows itself.
   The host's game runs the ghost; the house and its ghost come from a seed the whole room shares. */
const GAME = {
  id: 'dead-air', title: 'Dead Air', tagline: 'Something is in the house. Find out what. Bring friends.',
  font: 'Special Elite', accent: '#cfe3d4', accent2: '#7dffb0', bg: '#000', noSkins: true, noHud: true, scoreLabel: 'Score',
  how: ['Headphones on. Lights off. Find evidence, name the ghost in your journal (J), then leave by the front door.',
    'WASD to move, mouse to look (click to lock it), Shift to run. 1-6 pick a tool, click to use it. F flashlight, E light switches, hiding and the door.',
    'Evidence: EMF 5, freezing temperatures, spirit box answers, ghost writing in a book, handprints under UV light. Each ghost leaves three.',
    'When the lights start to flicker, it is hunting. Hide in a wardrobe or run. Play alone or with up to 3 friends.'],
  skins: [{ name: 'Default', price: 0, c: ['#fff'] }],
};
(() => {
  let RW = 400, RH = 225, buf, bctx, img, P32, zbuf, coneX, coneY;
  const FOV = .66, HF = s => `800 ${s}px Nunito, system-ui, sans-serif`, TF = s => `${s}px "Special Elite", "Courier New", monospace`;
  function setRes(w, h) { RW = w; RH = h; buf = document.createElement('canvas'); buf.width = w; buf.height = h; bctx = buf.getContext('2d'); img = bctx.createImageData(w, h); P32 = new Uint32Array(img.data.buffer); zbuf = new Float32Array(w); coneX = new Float32Array(w); coneY = new Float32Array(h * 2); }
  setRes(RW, RH);
  const SC = () => 1280 / RW;
  const rng = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const BAY = [-6, 2, -4, 4, 6, -2, 4, -4, -3, 5, -5, 3, 7, -1, 5, -3];
  const cl = v => v < 0 ? 0 : v > 255 ? 255 : v | 0;
  const HOUSE = { wall: [118, 104, 92], alt: [178, 184, 176], amb: .014 };
  /* ---------- the ghosts and their evidence ---------- */
  const EV = [['emf', 'EMF Level 5'], ['cold', 'Freezing Temps'], ['box', 'Spirit Box'], ['write', 'Ghost Writing'], ['uv', 'Handprints (UV)']];
  const GHOSTS = [
    { n: 'Phantom', ev: ['emf', 'box', 'cold'], d: 'Seeing it drains your sanity fast. It shows itself less than any other.', hunt: 50, sp: 1.6 },
    { n: 'Wraith', ev: ['emf', 'box', 'uv'], d: 'It drifts all over the house and can start a hunt from anywhere.', hunt: 50, sp: 1.65, roam: 1 },
    { n: 'Shade', ev: ['emf', 'cold', 'write'], d: 'Shy. Quiet when you stick together. Only hunts when sanity is very low.', hunt: 35, sp: 1.6, shy: 1 },
    { n: 'Revenant', ev: ['emf', 'write', 'uv'], d: 'Slow while it searches. Terrifyingly fast once it sees you.', hunt: 50, sp: 1.05, rev: 1 },
    { n: 'Poltergeist', ev: ['box', 'write', 'uv'], d: 'Loud. Throws things, knocks, slams. Lots of noise, all the time.', hunt: 50, sp: 1.6, loud: 1 },
    { n: 'Mare', ev: ['box', 'cold', 'write'], d: 'Hates the light. Turns lights off. Hunts sooner in the dark.', hunt: 60, sp: 1.6, dark: 1 },
    { n: 'Banshee', ev: ['cold', 'write', 'uv'], d: 'Picks one of you and follows them. Hunts that person first.', hunt: 50, sp: 1.6, stalk: 1 },
    { n: 'Yurei', ev: ['emf', 'cold', 'uv'], d: 'Its presence alone drains sanity. Slams doors near you.', hunt: 50, sp: 1.55, drain: 1 },
  ];
  const ANSWERS = { where: ['here', 'close', 'behind', 'in the walls', 'under'], who: ['nobody', 'mother', 'child', 'you', 'alone'], what: ['leave', 'stay', 'die', 'cold', 'mine'], age: ['old', 'young', 'seven', 'always'] };
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
  function bfsFrom(grid, n, start) {
    const d = new Int16Array(n * n).fill(-1), q = new Int32Array(n * n); let h = 0, t = 0; q[t++] = start; d[start] = 0;
    while (h < t) { const c = q[h++], x = c % n, y = (c / n) | 0; for (const nb of [c + 1, c - 1, c + n, c - n]) { const nx = nb % n, ny = (nb / n) | 0; if (nb < 0 || nb >= n * n || Math.abs(nx - x) + Math.abs(ny - y) !== 1 || grid[nb] !== 0 || d[nb] >= 0) continue; d[nb] = d[c] + 1; q[t++] = nb; } }
    return d;
  }
  const solid = (x, y) => { const i = Math.floor(x), j = Math.floor(y); return i < 0 || j < 0 || i >= L.n || j >= L.n || L.grid[j * L.n + i] !== 0; };
  const free = (x, y, r) => !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r) && !L.props.some(p => p.r && Math.abs(p.x - x) < p.r + r && Math.abs(p.y - y) < p.r * .8 + r);
  function los(ax, ay, bx, by) { const d = Math.hypot(bx - ax, by - ay), s = Math.ceil(d / .25); for (let i = 1; i < s; i++) if (solid(ax + (bx - ax) * i / s, ay + (by - ay) * i / s)) return false; return true; }
  const angDiff = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);

  /* ---------- textures: faded wallpaper, wood floors, kitchen tile, wardrobes, the front door ---------- */
  function makeTex(seed) {
    const R = rng(seed), T = {}, N = makeNoise(R), N2 = makeNoise(rng(seed + 9)), th = HOUSE;
    const mk = f => { const a = new Uint32Array(TX * TX); for (let y = 0; y < TX; y++) for (let x = 0; x < TX; x++) { const c = f(x, y); a[y * TX + x] = pack(c[0], c[1], c[2]); } return a; };
    const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k], mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const drip = Array.from({ length: TX }, () => R() < .25 ? 16 + R() * 60 : 0);
    for (let x = 1; x < TX; x++) if (drip[x - 1] && R() < .6) drip[x] = Math.max(drip[x], drip[x - 1] * (.7 + R() * .3));
    const wall = (x, y) => {
      const n = N.f(x, y), p = N2.f(x * .8, y * .8), lx = x & 31, ly = y & 31;
      // damask wallpaper: stripes and a repeating flower, gone yellow
      let c = mul(th.wall, .86 + (n - .5) * .35);
      if (lx < 2 || (lx > 14 && lx < 17)) c = mul(c, .82);
      const fx = lx - 8, fy = ly - 12, fl = Math.abs(fx) + Math.abs(fy) * .7 < 5 && (Math.abs(fx) < 1.5 || Math.abs(fy) < 1.5 || Math.abs(Math.abs(fx) - Math.abs(fy)) < 1.2);
      if (fl && y < 74) c = mul(c, 1.16);
      if (p > .68 && y < 74) c = mix(c, [150, 136, 110], .5);                                                   // torn paper
      if (y < drip[x]) c = mix(c, [72, 56, 34], .5 * (1 - y / drip[x] * .6));                                // water stains
      if (y >= 74) { const pl = (x >> 5) & 3; c = mul([88, 58, 38], .78 + (n - .5) * .4 + Math.sin(x * .9 + n * 6) * .04); if ((x & 31) < 2 || y === 74 || y === 75) c = mul(c, .6); if (y > 76 && y < 79) c = mul(c, 1.25); }
      if (y > 118) c = mul([46, 32, 24], y === 119 ? 1.5 : .9 + n * .2);
      return mul(c, Math.min(1, .6 + y / 26) * (y > 100 ? 1 - (y - 100) / 90 : 1));
    };
    T.wall = mk(wall);
    const tileR = Array.from({ length: 64 }, () => .9 + R() * .14), miss = Array.from({ length: 64 }, () => R() < .03);
    T.alt = mk((x, y) => {
      const tx = x >> 4, ty = y >> 4, ti = (ty & 7) * 8 + (tx & 7), lx = x & 15, ly = y & 15, n = N.f(x, y);
      if (y > 118) return mul([40, 40, 40], .9 + n * .2);
      if (miss[ti]) return mul([60, 56, 50], .7 + n * .5);
      if (lx < 1 || ly < 1) return mul([96, 92, 80], .7 + n * .2);
      let c = mul(th.alt, tileR[ti] - (n - .5) * .22 - Math.max(0, y - 70) / 240);
      if (lx === 1 || ly === 1) c = mul(c, 1.12); if (lx === 15 || ly === 15) c = mul(c, .8);
      if (N2.f(x, y) > .7) c = mix(c, [110, 96, 60], (N2.f(x, y) - .7) * 2.5);
      return c;
    });
    T.closet = mk((x, y) => {
      const n = N.f(x, y), lx = x & 63; let c = mul([92, 62, 40], .78 + (n - .5) * .3 + Math.sin(y * .7 + n * 8) * .05);
      if (lx < 3 || lx > 60) c = mul(c, .4); else if (lx === 3) c = mul(c, 1.3);
      if (y > 12 && y < 110 && lx > 10 && lx < 54 && (y - 12) % 7 < 3) c = (y - 12) % 7 === 0 ? [16, 12, 10] : mul(c, 1.2);             // slats you can see through
      if (lx > 52 && lx < 57 && y > 56 && y < 66) c = mul([180, 160, 110], .8 + n * .4);
      if (y < 4 || y > 123) c = mul(c, .45);
      return c;
    });
    T.door = mk((x, y) => {
      const n = N.f(x, y); let c = mul([70, 42, 28], .8 + (n - .5) * .3 + Math.sin(y * .5 + n * 7) * .04);
      if (x < 10 || x > 117) return mul(wall(x, y), .9);
      if (x < 14 || x > 113 || y < 6) c = mul(c, .55);
      if (y > 14 && y < 54 && x > 30 && x < 98) { const win = (x - 30) % 23 < 21 && (y - 14) % 20 < 18; c = win ? mix([40, 60, 90], [120, 150, 190], N2.f(x, y) * .6) : mul(c, .7); }
      if (y > 64 && y < 116 && ((x > 26 && x < 60) || (x > 68 && x < 102)) && !(y > 68 && y < 112 && ((x > 30 && x < 56) || (x > 72 && x < 98)))) c = mul(c, 1.25);
      if (x > 100 && x < 106 && y > 70 && y < 78) c = [190, 160, 90];
      return c;
    });
    const plank = Array.from({ length: 16 }, () => R() * 128);
    T.floor = mk((x, y) => {
      const n = N.f(x, y), st = N2.f(x * .7, y * .7), row = y >> 4, ly = y & 15, seam = ((x + plank[row]) & 127) < 2;
      let c = mul(row & 1 ? [104, 72, 46] : [92, 64, 40], .8 + Math.sin((x + plank[row]) * .3 + n * 9) * .08 + (n - .5) * .3);
      if (ly < 1 || seam) c = mul(c, .35);
      if (st > .68) c = mix(c, [40, 30, 20], (st - .68) * 2.5);
      return c;
    });
    T.floor2 = mk((x, y) => { const n = N.f(x, y), lx = x & 31, ly = y & 31, chk = ((x >> 5) + (y >> 5)) & 1; let c = mul(chk ? [168, 166, 156] : [44, 44, 48], .84 + (n - .5) * .3); if (lx < 1 || ly < 1) c = mul(c, .6); if (N2.f(x, y) > .7) c = mix(c, [70, 60, 40], (N2.f(x, y) - .7) * 2); return c; });
    T.ceil = mk((x, y) => { const n = N.f(x, y), st = N2.f(x, y); let c = mul([132, 126, 114], .8 + (n - .5) * .3); if (st > .62) c = mix(c, [100, 76, 44], Math.min(.8, (st - .62) * 4)); if (Math.abs(st - .62) < .008) c = mul(c, .6); return c; });
    return T;
  }

  /* ---------- sprites: the ghost, furniture, the book, the other players ---------- */
  const SPR = {}, friendTex = [], COLS = ['#5aa0ff', '#ff7a5a', '#6ad08a', '#e8c040'];
  function buildSprites() {
    // the ghost: a tall woman in a grey nightgown, hair hanging over the face, arms too long
    SPR.ghost = spriteTex(80, 220, (g, e) => {
      const gown = (p, x, y) => (p[7] === 'gown' ? [132, 136, 138] : null);
      g.drawImage(sculpt(80, 220, [[40, 44, 40, 58, 5, 5, 2], [40, 58, 40, 120, 12, 15, 3, 'cloth'], [40, 120, 40, 214, 15, 25, 3, 'gown'],
        [28, 62, 22, 120, 4, 3.4, 5], [22, 120, 19, 176, 3.4, 2.6, 6], [52, 62, 58, 120, 4, 3.4, 5], [58, 120, 61, 176, 3.4, 2.6, 6],
        [40, 28, 40, 32, 13, 13, 3]], { skin: [150, 156, 160], col: gown }), 0, 0);
      g.save(); g.translate(40, 30); g.drawImage(getFace('hollow').img, -15, -20, 30, 42); g.restore();
      const R = rng(77); g.lineCap = 'round';
      for (let k = 0; k < 70; k++) { const sx = 40 + (R() - .5) * 26, len = 50 + R() * 70, sw = (R() - .5) * 14; g.strokeStyle = `rgba(${6 + R() * 10},${6 + R() * 8},${8 + R() * 8},${.7 + R() * .3})`; g.lineWidth = 1 + R() * 2; g.beginPath(); g.moveTo(sx, 14 + R() * 6); g.bezierCurveTo(sx + sw, 40, sx - sw, 70, sx + (R() - .5) * 20, 14 + len); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(25, 180, 30, 40);
      e.fillStyle = '#fff'; e.fillRect(35, 29, 1, 1); e.fillRect(44, 30, 1, 1);
    });
    SPR.face = spriteTex(96, 96, (g, e) => { g.drawImage(getFace('hollow').img, 8, 0, 80, 96); e.fillStyle = '#fff'; e.fillRect(37, 38, 2, 2); e.fillRect(57, 38, 2, 2); });
    const wood = (g, x, y, w, h, c = '#5a3a24') => { const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, c); gr.addColorStop(1, '#2a1a10'); g.fillStyle = gr; g.fillRect(x, y, w, h); };
    SPR.bed = spriteTex(128, 80, g => { wood(g, 4, 18, 8, 62); wood(g, 116, 30, 8, 50); g.fillStyle = '#8a8478'; g.fillRect(10, 40, 108, 22); g.fillStyle = '#b8b0a0'; g.fillRect(12, 34, 30, 12); g.fillStyle = '#6a3a3a'; g.fillRect(40, 38, 78, 26); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(40, 56, 78, 8); wood(g, 10, 62, 108, 8); });
    SPR.crib = spriteTex(96, 80, g => { wood(g, 6, 20, 84, 6, '#c8b090'); wood(g, 6, 66, 84, 6, '#c8b090'); for (let x = 8; x < 90; x += 8) wood(g, x, 24, 3, 44, '#c8b090'); g.fillStyle = '#d8c8c8'; g.fillRect(10, 52, 76, 12); });
    SPR.couch = spriteTex(128, 72, g => { g.fillStyle = '#4a5a4a'; g.fillRect(4, 18, 120, 34); g.fillStyle = '#3a483a'; g.fillRect(0, 30, 16, 36); g.fillRect(112, 30, 16, 36); g.fillStyle = '#566a56'; g.fillRect(16, 40, 46, 16); g.fillRect(66, 40, 46, 16); wood(g, 8, 64, 6, 8); wood(g, 114, 64, 6, 8); });
    SPR.table = spriteTex(112, 64, g => { wood(g, 0, 18, 112, 8, '#6a4a30'); wood(g, 8, 26, 6, 38); wood(g, 98, 26, 6, 38); g.fillStyle = '#d8d0c0'; g.fillRect(44, 8, 6, 10); g.fillStyle = '#e8e4d8'; g.fillRect(70, 12, 14, 6); });
    SPR.chair = spriteTex(48, 96, g => { wood(g, 6, 4, 6, 92); wood(g, 36, 4, 6, 92); for (let y = 10; y < 46; y += 9) wood(g, 6, y, 36, 3); wood(g, 2, 52, 44, 6); wood(g, 4, 58, 5, 38); wood(g, 39, 58, 5, 38); });
    SPR.dresser = spriteTex(80, 96, g => { wood(g, 4, 20, 72, 76, '#5a3a24'); for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(8, 26 + i * 17, 64, 2); g.fillStyle = '#c8a860'; g.fillRect(36, 33 + i * 17, 8, 3); } g.fillStyle = '#2a3a4a'; g.fillRect(14, 0, 52, 20); g.strokeStyle = '#7a6040'; g.lineWidth = 3; g.strokeRect(14, 0, 52, 20); });
    SPR.fridge = spriteTex(64, 128, g => { const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, '#c8c4b8'); gr.addColorStop(1, '#8a8678'); g.fillStyle = gr; g.fillRect(4, 0, 56, 128); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(4, 44, 56, 2); g.fillStyle = '#5a5a5a'; g.fillRect(48, 14, 3, 22); g.fillRect(48, 54, 3, 30); });
    SPR.tv = spriteTex(72, 72, (g, e) => { wood(g, 4, 40, 64, 32); g.fillStyle = '#1a1a1a'; g.fillRect(10, 4, 52, 38); e.fillStyle = 'rgba(160,190,200,.0)'; g.fillStyle = '#26302e'; g.fillRect(14, 8, 44, 30); });
    SPR.rocker = spriteTex(64, 96, g => { wood(g, 14, 6, 5, 60); wood(g, 44, 6, 5, 60); for (let y = 12; y < 44; y += 8) wood(g, 14, y, 35, 3); wood(g, 10, 52, 44, 6); g.strokeStyle = '#3a2416'; g.lineWidth = 4; g.beginPath(); g.arc(32, 50, 40, 1.15, 1.99); g.stroke(); });
    SPR.doll = spriteTex(32, 48, g => { g.fillStyle = '#e8dcd0'; g.beginPath(); g.arc(16, 12, 8, 0, 7); g.fill(); g.fillStyle = '#5a1a20'; g.fillRect(8, 20, 16, 20); g.fillStyle = '#111'; g.fillRect(12, 10, 2, 3); g.fillRect(18, 10, 2, 3); g.fillStyle = '#3a2210'; g.beginPath(); g.arc(16, 9, 8, Math.PI, 0); g.fill(); g.fillStyle = '#e8dcd0'; g.fillRect(10, 40, 4, 8); g.fillRect(18, 40, 4, 8); });
    SPR.book = spriteTex(48, 24, g => { g.fillStyle = '#e8e0cc'; g.beginPath(); g.moveTo(2, 14); g.lineTo(24, 8); g.lineTo(46, 14); g.lineTo(24, 22); g.fill(); g.strokeStyle = '#7a3a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(24, 8); g.lineTo(24, 22); g.stroke(); g.fillStyle = '#9a9488'; for (let i = 0; i < 4; i++) { g.fillRect(8, 13 + i * 2, 12, 1); g.fillRect(28, 13 + i * 2, 12, 1); } });
    SPR.bookW = spriteTex(48, 24, (g, e) => { g.fillStyle = '#e8e0cc'; g.beginPath(); g.moveTo(2, 14); g.lineTo(24, 8); g.lineTo(46, 14); g.lineTo(24, 22); g.fill(); g.strokeStyle = '#2a0a0a'; g.lineWidth = 1.6; const R = rng(9); for (let s = 0; s < 3; s++) { g.beginPath(); let x = 6 + R() * 6, y = 12 + R() * 6; g.moveTo(x, y); for (let k = 0; k < 10; k++) { x += 3 + R() * 2; y += (R() - .5) * 5; g.lineTo(x, y); } g.stroke(); } });
    SPR.lamp = spriteTex(32, 24, (g, e) => { g.fillStyle = '#3a3a3a'; g.fillRect(15, 0, 2, 10); const gl = e.createRadialGradient(16, 16, 1, 16, 16, 9); gl.addColorStop(0, '#fff6d8'); gl.addColorStop(1, 'rgba(255,220,150,.6)'); e.fillStyle = gl; e.beginPath(); e.arc(16, 15, 8, 0, 7); e.fill(); });
    SPR.lampOff = spriteTex(32, 24, g => { g.fillStyle = '#3a3a3a'; g.fillRect(15, 0, 2, 10); g.fillStyle = '#6a665e'; g.beginPath(); g.arc(16, 15, 8, 0, 7); g.fill(); });
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
  // a handprint, for the UV light: palm plus five fingers on a 32x32 mask
  const HAND = new Uint8Array(32 * 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const palm = ((x - 16) / 7) ** 2 + ((y - 21) / 7.5) ** 2 < 1, fing = [[9, 13, 6], [12.5, 6, 0], [16.5, 4, 0], [20.5, 6, 0], [24, 11, 0]].some(([fx, fy], i) => Math.abs(x - fx + (y - fy) * (i === 0 ? .5 : 0)) < 1.6 && y > fy && y < fy + 10); if (palm || fing) HAND[y * 32 + x] = 1; }

  /* ---------- 14 Alder Lane ---------- */
  const ROOMS = [
    { n: 'Master Bedroom', x: 1, y: 1, w: 7, h: 8 }, { n: 'Bathroom', x: 9, y: 1, w: 4, h: 8, tile: 1 }, { n: 'Nursery', x: 14, y: 1, w: 5, h: 8 }, { n: 'Study', x: 20, y: 1, w: 3, h: 8 },
    { n: 'Hallway', x: 1, y: 10, w: 22, h: 2 }, { n: 'Living Room', x: 1, y: 13, w: 8, h: 10 }, { n: 'Dining Room', x: 10, y: 13, w: 6, h: 5 }, { n: 'Kitchen', x: 17, y: 13, w: 6, h: 10, tile: 1 },
    { n: 'Foyer', x: 10, y: 19, w: 4, h: 4 }, { n: 'Pantry', x: 15, y: 19, w: 1, h: 4 },
  ];
  const DOORS = [[4, 9], [10, 9], [16, 9], [21, 9], [4, 12], [12, 12], [19, 12], [11, 18], [9, 20], [16, 15], [15, 18]];
  const PROPS = [['bed', 3, 3, .9, 'Master Bedroom'], ['dresser', 6.5, 7.3, .5], ['chair', 2, 7.5, .35], ['crib', 17, 3, .7], ['rocker', 15.2, 7, .4], ['doll', 17.6, 7.4, 0], ['dresser', 21.5, 2.2, .5],
    ['table', 21.5, 6, .5], ['couch', 3.5, 15, .8], ['tv', 3.5, 21.5, .5], ['chair', 7.2, 18, .35], ['table', 12.5, 15, .7], ['chair', 11, 15, .3], ['chair', 14.2, 15, .3],
    ['fridge', 22.4, 14, .5], ['table', 19.5, 19, .6], ['chair', 18, 20.5, .3], ['dresser', 1.6, 11.45, .3], ['doll', 15.5, 21.5, 0]];
  let L = null;
  function genHouse(seed) {
    const R = rng(seed), n = 24, grid = new Uint8Array(n * n).fill(1), room = new Int8Array(n * n).fill(-1), fl = new Uint8Array(n * n);
    ROOMS.forEach((r, i) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { grid[y * n + x] = 0; room[y * n + x] = i; if (r.tile) fl[y * n + x] = 1; } });
    for (const [x, y] of DOORS) grid[y * n + x] = 0;
    for (const [x, y] of DOORS) { let best = -1; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = room[(y + b) * n + x + a]; if (k >= 0 && (best < 0 || ROOMS[k].n === 'Hallway')) best = k; } room[y * n + x] = best; }
    // tiled walls round the kitchen and bathroom
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (grid[y * n + x] === 1 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const k = room[(y + b) * n + x + a]; return k >= 0 && ROOMS[k].tile; })) grid[y * n + x] = 2;
    grid[23 * n + 11] = 4;
    const L2 = { n, grid, room, fl, seed, props: [], books: [], prints: new Uint8Array(n * n * 2), wardrobes: [], lightsOn: ROOMS.map(() => false) };
    L2.lightsOn[ROOMS.findIndex(r => r.n === 'Foyer')] = true;
    for (const [k, x, y, r] of PROPS) L2.props.push({ k, x, y, r });
    // wardrobes: wall tiles with exactly one open side, in bedrooms, the nursery, the hallway and the living room
    const cand = [];
    for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) { if (grid[y * n + x] !== 1) continue; const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => grid[(y + b) * n + x + a] === 0); if (open.length !== 1) continue; const k = room[(y + open[0][1]) * n + x + open[0][0]]; if (k < 0 || !['Master Bedroom', 'Nursery', 'Hallway', 'Living Room', 'Study', 'Dining Room'].includes(ROOMS[k].n) || DOORS.some(([dx, dy]) => Math.abs(dx - x) + Math.abs(dy - y) < 2)) continue; cand.push({ x, y, fx: x + open[0][0] + .5, fy: y + open[0][1] + .5, room: k }); }
    const usedRooms = {};
    while (L2.wardrobes.length < 6 && cand.length) { const c = cand.splice(Math.floor(R() * cand.length), 1)[0]; if ((usedRooms[c.room] || 0) >= (ROOMS[c.room].n === 'Hallway' ? 2 : 1)) continue; usedRooms[c.room] = (usedRooms[c.room] || 0) + 1; grid[c.y * n + c.x] = 3; L2.wardrobes.push(c); }
    // the ghost: its type and its room (never the foyer or the hallway)
    const homes = ROOMS.map((r, i) => i).filter(i => !['Foyer', 'Hallway', 'Pantry'].includes(ROOMS[i].n));
    L2.type = Math.floor(R() * GHOSTS.length); L2.home = homes[Math.floor(R() * homes.length)];
    L2.spawn = { x: 11.5, y: 21.6 };
    L2.wm = new Uint8Array(n * n); for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) if (!grid[y * n + x]) L2.wm[y * n + x] = (grid[y * n + x - 1] ? 1 : 0) | (grid[y * n + x + 1] ? 2 : 0) | (grid[(y - 1) * n + x] ? 4 : 0) | (grid[(y + 1) * n + x] ? 8 : 0);
    L2.tex = makeTex(seed);
    return L2;
  }
  const roomAt = (x, y) => { const i = Math.floor(x), j = Math.floor(y); return i < 0 || j < 0 || i >= L.n || j >= L.n ? -1 : L.room[j * L.n + i]; };
  const has = ev => GHOSTS[L.type].ev.includes(ev);
  let LR = 1, LG = .94, LB = .82; const LAMPC = [1, .94, .82], UVC = [.45, .2, 1.3];
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
      else { if (l.room !== undefined && L.room[(y | 0) * L.n + (x | 0)] !== l.room) continue; k = l.i / (1 + d2 * .16); }
      XR += k * l.cr; XG += k * l.cg; XB += k * l.cb;
    }
  }
  const CT = new Float32Array(257);
  function render(cam) {
    const T = L.tex, th = HOUSE, dx = Math.cos(cam.a), dy = Math.sin(cam.a), plx = -dy * FOV, ply = dx * FOV, hz = (RH >> 1) + (cam.bob | 0), amb = th.amb + (cam.sanity < 30 ? .01 : 0);
    const lamp = cam.lamp, w = cam.lampW || 1, lc = cam.lc || LAMPC; LR = lc[0]; LG = lc[1]; LB = lc[2];
    for (let x = 0; x < RW; x++) { const v = (x - RW / 2) / (RW * .3 * w); coneX[x] = v * v; }
    for (let y = 0; y < RH * 2; y++) { const v = (y - RH) / (RH * .55 * w); coneY[y] = v * v; }
    for (let i = 0; i <= 256; i++) { const r2 = i / 64; CT[i] = (r2 < 1 ? Math.pow(1 - r2, 1.4) : 0) + .06 / (1 + r2 * 3); }
    const cone = (x, yy) => CT[Math.min(256, ((coneX[x] + coneY[yy + RH]) * 64) | 0)];
    const meI = d => lamp * 2.4 / (1 + d * d * .085);
    // lights near the camera: other players' flashlights, red emergency lamps
    lights.length = 0;
    others.forEach(o => { if (o.out || !o.f || o.h || cam.of === o) return; if (Math.hypot(o.x - cam.x, o.y - cam.y) < 16) lights.push(o.uv ? { cone: 1, x: o.x, y: o.y, dx: Math.cos(o.a), dy: Math.sin(o.a), r2: 60, cr: .35, cg: .15, cb: .9 } : { cone: 1, x: o.x, y: o.y, dx: Math.cos(o.a), dy: Math.sin(o.a), r2: 100, cr: 1, cg: .94, cb: .8 }); });
    const hf = ghost && !me.posed && (ghost.hunt ? Math.random() < .4 : ghost.man > 0 && Math.random() < .12) ? 0 : 1;
    for (let r = 0; r < ROOMS.length; r++) { if (!L.lightsOn[r]) continue; const R0 = ROOMS[r], lx = R0.x + R0.w / 2, ly = R0.y + R0.h / 2; if (Math.hypot(lx - cam.x, ly - cam.y) > 18) continue; lights.push({ x: lx, y: ly, i: 1.15 * hf, r2: 60, cr: 1, cg: .8, cb: .52, room: r }); }
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
        let I = cone(x, p) * mi * ao, c = (cxi > 0 && cyi > 0 && cxi < n && cyi < n && L.fl[cyi * n + cxi] ? T.floor2 : T.floor)[ti], d = BAY[by + (x & 3)], xr = XR * ao, xg = XG * ao, xb = XB * ao;
        P32[y * RW + x] = 0xff000000 | (cl(((c >> 16) & 255) * (I * LB + xb + amb * 1.3) + d) << 16) | (cl(((c >> 8) & 255) * (I * LG + xg + amb) + d) << 8) | cl((c & 255) * (I * LR + xr + amb) + d);
        if (yc >= 0) { I = cone(x, -p) * mi * .85 * ao; c = T.ceil[ti]; d = BAY[byc + (x & 3)]; P32[yc * RW + x] = 0xff000000 | (cl(((c >> 16) & 255) * (I * LB + xb * .8 + amb * 1.3) + d) << 16) | (cl(((c >> 8) & 255) * (I * LG + xg * .8 + amb) + d) << 8) | cl((c & 255) * (I * LR + xr * .8 + amb) + d); }
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
      const tex = v === 2 ? T.alt : v === 3 ? T.closet : v === 4 ? T.door : T.wall, pr = cam.uv && mx >= 0 && my >= 0 && mx < n && my < n && L.prints[(my * n + mx) * 2 + side];
      ext(cam.x + perp * rx * .97, cam.y + perp * ry * .97);
      const mi = meI(perp) * (side ? .75 : 1), y0 = Math.max(0, ds | 0), y1 = Math.min(RH - 1, (ds + lh) | 0), sh = side ? .78 : 1;
      for (let y = y0; y <= y1; y++) {
        const fv = (y - ds) / lh, ao = fv > .9 ? .45 + (1 - fv) * 5.5 : fv < .07 ? .5 + fv * 7 : 1, c = tex[((((y - ds) * TX / lh) | 0) & TM) * TX + tx], I = cone(x, y - hz) * mi * ao, d = BAY[(y & 3) * 4 + (x & 3)], s2 = sh * ao;
        if (pr) { const hu = ((wx - .34) / .32 * 32) | 0, hv = ((fv - .3) / .32 * 32) | 0; if (hu >= 0 && hu < 32 && hv >= 0 && hv < 32 && HAND[hv * 32 + hu]) { const gI = Math.min(1.4, cone(x, y - hz) * mi * 2.4); P32[y * RW + x] = 0xff000000 | (cl(215 * gI) << 16) | (cl(255 * gI) << 8) | cl(150 * gI); continue; } }
        P32[y * RW + x] = 0xff000000 | (cl(((c >> 16) & 255) * (I * LB + (XB + amb * 1.3) * s2) + d) << 16) | (cl(((c >> 8) & 255) * (I * LG + (XG + amb) * s2) + d) << 8) | cl((c & 255) * (I * LR + (XR + amb) * s2) + d);
      }
    }
    // sprites
    const spr = []; others.forEach(o => { o.scr = null; });
    for (const p of L.props) spr.push({ x: p.x, y: p.y, tex: SPR[p.k], h: PH[p.k] || .5, dim: .85 });
    for (let r = 0; r < ROOMS.length; r++) { const R0 = ROOMS[r]; if (R0.n === 'Hallway' || R0.n === 'Pantry') continue; spr.push({ x: R0.x + R0.w / 2, y: R0.y + R0.h / 2, tex: L.lightsOn[r] ? SPR.lamp : SPR.lampOff, h: .12, z: .86, glow: L.lightsOn[r] ? .6 : 0 }); }
    for (const b of L.books) spr.push({ x: b.x, y: b.y, tex: b.w ? SPR.bookW : SPR.book, h: .08, dim: 1, glow: .02 });
    if (ghost && (ghost.man > 0 || (ghost.hunt && ghost.flick)) && Math.hypot(ghost.x - cam.x, ghost.y - cam.y) < 15) spr.push({ x: ghost.x + (ghost.hunt ? (Math.random() - .5) * .05 : 0), y: ghost.y, tex: SPR.ghost, h: .98, z: -.01, dim: .6, glow: .012 });
    others.forEach(o => { if (!o.out && !o.h && cam.of !== o && o.ok) spr.push({ x: o.x, y: o.y, tex: o.tex, h: .8, glow: .06, dim: .7, who: o }); });
    if (cam.of && !me.out && !me.hidden) spr.push({ x: me.x, y: me.y, tex: friendTex[myId() % 4], h: .8, glow: .12 });
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
          P32[y * RW + x] = 0xff000000 | (cl(((c >> 16) & 255) * (I * LB + XB + amb * 1.3)) << 16) | (cl(((c >> 8) & 255) * (I * LG + XG + amb)) << 8) | cl((c & 255) * (I * LR + XR + amb));
        }
      }
    }
    bctx.putImageData(img, 0, 0);
  }
  /* ---------- state ---------- */
  let mode = 'lobby', me, ghost = null, others = new Map(), net = null, feed = [], js = null, between = 0, menuT = 0, spect = 0, journal = false, endSent = false, emfs = [], roomShow = null, leaveArm = 0, sfxT = 0, hall = null;
  const keys = {}, touch = { on: false, move: null, look: null, btns: [] };
  const isHost = () => !net || net.hostId === net.id;
  const myId = () => net ? net.id : 0;
  const TOOLS = ['flash', 'emf', 'thermo', 'box', 'uv', 'book'], TN = { flash: 'Flashlight', emf: 'EMF Reader', thermo: 'Thermometer', box: 'Spirit Box', uv: 'UV Light', book: 'Ghost Writing Book' };
  const PH = { bed: .42, crib: .5, couch: .45, table: .42, chair: .55, dresser: .62, fridge: .95, tv: .5, rocker: .6, doll: .2 };
  function newMe() { return { x: 0, y: 0, a: 0, bob: 0, walk: 0, stam: 1, sanity: 100, flash: true, tool: 0, hidden: null, hideT: 0, out: false, stepT: 0, run: false, ev: {}, guess: -1, boxT: 0, boxMsg: null, boxFails: 0, temp: 15, tempT: 0, emf: 0, emfT: 0, breathT: 0, sawGhost: 0 }; }
  const tool = () => TOOLS[me.tool];

  /* ---------- sound: no music, only a faint static and the house ---------- */
  let noiseBuf = null, staticG = null, staticBoost = 0;
  const AC = () => (K.ac && K.master && !K.bot && !save.mute) ? K.ac : null;
  function dest(pan = 0) { const ac = K.ac, p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(K.master); return p; }
  function tone(f, d, type = 'sine', v = .1, slide = 0, pan = 0, delay = 0) {
    const ac = AC(); if (!ac || v < .002) return; const t = ac.currentTime + delay, o = ac.createOscillator(), a = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
    a.gain.setValueAtTime(v, t); a.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(a).connect(dest(pan)); o.start(t); o.stop(t + d + .05);
  }
  function nbuf(ac) { if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const c = noiseBuf.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; } return noiseBuf; }
  function hiss(d, v, lo = 200, hi = 4000, pan = 0, delay = 0, swell = false) {
    const ac = AC(); if (!ac || v < .002) return;
    const t = ac.currentTime + delay, s = ac.createBufferSource(), f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(), a = ac.createGain();
    s.buffer = nbuf(ac); s.loop = true; f1.type = 'highpass'; f1.frequency.value = lo; f2.type = 'lowpass'; f2.frequency.value = hi;
    if (swell) { a.gain.setValueAtTime(.0001, t); a.gain.exponentialRampToValueAtTime(v, t + d * .6); } else a.gain.setValueAtTime(v, t);
    a.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(f1).connect(f2).connect(a).connect(dest(pan)); s.start(t, Math.random()); s.stop(t + d + .05);
  }
  function scream(v = .5) { hiss(1.1, v, 500, 6000); for (const f of [620, 760, 905, 1210]) tone(f * (.95 + Math.random() * .1), 1, 'sawtooth', v * .16, -f * .55); tone(70, .8, 'square', v * .3, -40); }
  function heart(v) { tone(58, .14, 'sine', v); tone(52, .16, 'sine', v * .8, 0, 0, .2); }
  function speak(text, pitch = .1, rate = .55, vol = .5) { try { if (AC() && window.speechSynthesis) { const u = new SpeechSynthesisUtterance(text); u.pitch = pitch; u.rate = rate; u.volume = vol; speechSynthesis.cancel(); speechSynthesis.speak(u); } } catch (e) {} }
  function srcSound(x, y) { const dx = x - me.x, dy = y - me.y, d = Math.hypot(dx, dy), wall = los(me.x, me.y, x, y) ? 1 : .45; return { pan: Math.sin(Math.atan2(dy, dx) - me.a), vol: wall / (1 + d * d * .07), d }; }
  function startStatic() {
    const ac = K.ac; if (!ac || staticG) return;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = nbuf(ac); s.loop = true; f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = .5; g.gain.value = 0;
    s.connect(f).connect(g).connect(K.master); s.start(); staticG = g;
  }
  const SND = {
    knock: (x, y) => { const s = srcSound(x, y); for (let i = 0; i < 3; i++) { tone(105, .1, 'square', .22 * s.vol, -40, s.pan, i * .3); hiss(.07, .18 * s.vol, 80, 600, s.pan, i * .3); } },
    steps: (x, y) => { const s = srcSound(x, y); for (let i = 0; i < 4; i++) { tone(62, .12, 'sine', .3 * s.vol, -12, s.pan, i * .55); hiss(.08, .1 * s.vol, 60, 600, s.pan, i * .55); } },
    creak: (x, y) => { const s = srcSound(x, y); tone(180, 1.2, 'sawtooth', .035 * s.vol, -90, s.pan); tone(240, 1, 'sawtooth', .02 * s.vol, 120, s.pan, .2); },
    thud: (x, y) => { const s = srcSound(x, y); tone(70, .35, 'sine', .5 * s.vol, -30, s.pan); hiss(.25, .25 * s.vol, 100, 2500, s.pan); tone(900, .12, 'triangle', .05 * s.vol, -300, s.pan, .18); },
    slam: (x, y) => { const s = srcSound(x, y); hiss(.4, .55 * s.vol, 40, 900, s.pan); tone(55, .5, 'square', .3 * s.vol, -25, s.pan); if (s.d < 8) K.shake(6); },
    breath: (x, y) => { for (let i = 0; i < 3; i++) hiss(1.1, .06, 300, 1500, -.7, i * 1.3, true); },
    radio: (x, y) => { staticBoost = Math.max(staticBoost, 1.6); },
    whisper: (x, y) => { const s = srcSound(x, y); if (s.d < 7) { hiss(1.6, .05 * s.vol + .01, 1200, 5000, s.pan, 0, true); speak(K.pick(['get out', 'mine', 'not yours', 'leave', 'stay with me', 'cold'])); } },
    lights: (x, y) => { const s = srcSound(x, y); tone(1800, .03, 'square', .05 * s.vol, 0, s.pan); },
    touch: (x, y) => { const s = srcSound(x, y); hiss(.3, .06 * s.vol, 300, 1200, s.pan); },
    hum: (x, y) => { const s = srcSound(x, y); tone(110, 2, 'sine', .05 * s.vol, -20, s.pan); },
  };

  /* ---------- network ---------- */
  const WSHOST = /^https?:/.test(location.protocol) && !/^(localhost|127\.)/.test(location.hostname) ? location.host : 'box.pulseform.org';
  function connect(code, name) {
    if (net && net.ws) try { net.ws.close(); } catch (e) {}
    net = { code, name, id: 0, hostId: 0, ws: null, ok: false, sendT: 0, gT: 0 };
    lobbyMsg('Connecting...');
    let ws;
    try { ws = new WebSocket(`wss://${WSHOST}/api/room/${code}?n=${encodeURIComponent(name)}`); } catch (e) { lobbyMsg('Could not connect.'); net = null; return; }
    net.ws = ws;
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (err) { return; } onNet(m); };
    ws.onclose = () => { if (!net || net.ws !== ws) return; const was = mode === 'play' || mode === 'between'; net = null; others.clear(); if (was) say('Connection lost. You are alone in the house now.', '#ff8080'); else { lobbyMsg('Disconnected.'); lobbyRoom(); } };
  }
  const send = m => { if (net && net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify(m)); };
  function onNet(m) {
    switch (m.t) {
      case 'full': lobbyMsg('That room is full.'); break;
      case 'hello': net.id = m.id; net.hostId = m.host; net.ok = true; others.clear(); m.players.forEach(p => { if (p.id !== m.id) addOther(p.id, p.name); }); lobbyRoom(); break;
      case 'join': if (others.size >= 3) break; addOther(m.id, m.name); say(`${m.name} joined.`, '#9fe8ff'); lobbyRoom();
        if (isHost() && (mode === 'play' || mode === 'between')) send({ t: 'start', to: m.id, seed: L.seed, el: L.el, lights: L.lightsOn.map(Number), books: L.books, prints: [...L.prints].map((v, i) => v ? i : -1).filter(i => i >= 0) });
        break;
      case 'leave': { const o = others.get(m.id); if (o) say(`${o.name} left.`, '#9fe8ff'); others.delete(m.id); L && (L.books = L.books.filter(b => b.id !== m.id)); lobbyRoom(); break; }
      case 'host': net.hostId = m.id; if (isHost() && ghost) { ghost.wt = null; if (mode === 'play') say('You are the host now.', '#9fe8ff'); } lobbyRoom(); break;
      case 'start': if (K.state === 'over' || K.state === 'title') pending = m; else beginGame(m.seed, m); break;
      case 'p': { const o = others.get(m.from); if (!o) break; Object.assign(o, { rx: m.x, ry: m.y, ra: m.a, f: m.f, uv: m.u, tl: m.tl, h: m.h, out: m.o, run: m.r, san: m.s, ok: true }); if (!o.seen) { o.x = m.x; o.y = m.y; o.a = m.a; o.seen = 1; } break; }
      case 'g': if (!isHost() && ghost) { ghost.rx = m.x; ghost.ry = m.y; if (m.h && !ghost.hunt) huntBegins(); ghost.hunt = m.h; if (m.m > ghost.man) ghost.man = m.m; } break;
      case 'ev': if (L) playEvent(m); break;
      case 'emf': emfs.push({ x: m.x, y: m.y, lv: m.lv, t: 18 }); break;
      case 'lt': if (L) { L.lightsOn[m.r] = !!m.on; } break;
      case 'book': if (L) { L.books = L.books.filter(b => b.id !== m.from); L.books.push({ id: m.from, x: m.x, y: m.y, w: 0 }); } break;
      case 'wr': if (L) { const b = L.books.find(b => b.id === m.id); if (b) b.w = 1; if (m.id === myId()) { say('Something wrote in your book.', '#d0b0ff'); me.sanity -= 4; } } break;
      case 'pr': if (L) L.prints[m.i] = 1; break;
      case 'kill': if (m.id === myId()) caught(); else { const o = others.get(m.id); if (o) { o.out = true; say(`${o.name} is gone.`, '#ff5050'); const s = srcSound(o.x, o.y); scream(.12 * s.vol + .03); } } break;
      case 'hid': if (isHost()) noteHide(m.from); break;
      case 'end': endGame(); break;
    }
  }
  function addOther(id, name) { if (!others.has(id)) others.set(id, { id, name, x: 0, y: 0, a: 0, rx: 0, ry: 0, ra: 0, f: true, h: 0, out: false, col: COLS[id % 4], tex: friendTex[id % 4], stepT: 0, seen: 0, san: 100 }); }

  /* ---------- the investigation ---------- */
  function startGame() {
    me = newMe(); endSent = false; K.score = 0; spect = 0;
    const seed = (Math.random() * 1e9) | 0;
    if (net && net.ok) send({ t: 'start', seed });
    beginGame(seed, {});
  }
  function beginGame(seed, m) {
    if (!me || mode === 'lobby' || mode === 'over') me = newMe();
    hideLobby(); journal = false;
    L = genHouse(seed); L.el = m.el || 0;
    if (m.lights) L.lightsOn = m.lights.map(Boolean); if (m.books) L.books = m.books; if (m.prints) m.prints.forEach(i => { L.prints[i] = 1; });
    const slot = net ? [...others.keys(), net.id].sort((a, b) => a - b).indexOf(net.id) : 0;
    me.x = L.spawn.x + [0, .7, -.7, 0][slot % 4]; me.y = L.spawn.y - [0, 0, 0, .7][slot % 4]; me.a = -Math.PI / 2;
    const H = ROOMS[L.home], R0 = rng(seed + 3);
    ghost = { x: H.x + .5 + R0() * (H.w - 1), y: H.y + .5 + R0() * (H.h - 1), a: 0, st: 'idle', hunt: 0, huntT: 0, coolT: 40 + R0() * 20, actT: 10 + R0() * 8, man: 0, wt: null, repath: 0, stalk: null, flick: 0, grace: 0 };
    ghost.rx = ghost.x; ghost.ry = ghost.y;
    emfs = []; feed = []; js = null; leaveArm = 0; roomShow = null;
    mode = 'between'; between = m.el ? .5 : 4.2;
    startStatic();
  }
  function endGame() {
    if (mode === 'over' || !L) return;
    mode = 'over'; try { document.exitPointerLock(); } catch (e) {} try { speechSynthesis.cancel(); } catch (e) {}
    const G = GHOSTS[L.type], right = me.guess === L.type, found = G.ev.filter(e => me.ev[e] === 1).length, wrong = EV.filter(([k]) => me.ev[k] === 1 && !G.ev.includes(k)).length;
    K.score = Math.max(0, (right ? 100 : 0) + found * 15 - wrong * 10 + (me.out ? 0 : 30));
    const st = save.da || (save.da = { n: 0, right: 0 }); st.n++; if (right) st.right++; K.persist();
    const evn = G.ev.map(e => EV.find(x => x[0] === e)[1]).join(', ');
    K.over({ title: right ? `It was a ${G.n}. You were right.` : `It was a ${G.n}.`, text: `${me.guess >= 0 ? (right ? 'You named it.' : `You said ${GHOSTS[me.guess].n}.`) : 'You did not name it.'} Its evidence: ${evn}. It lived in the ${ROOMS[L.home].n}.${me.out ? ' You did not make it out.' : ''} Cases solved: ${st.right}/${st.n}.`, delay: 400 });
  }
  function say(s, c = '#fff') { feed.push({ s, c, t: 5 }); if (feed.length > 4) feed.shift(); }

  /* ---------- the player and the tools ---------- */
  function caught() {
    if (js || me.out) return;
    js = { t: 0 }; me.hidden = null; scream(.55); K.shake(30);
  }
  function afterCaught() {
    me.out = true; me.sanity = 0; say('You are gone. You can still watch the others.', '#ff5050');
    if (!net || ![...others.values()].some(o => !o.out)) { if (net) send({ t: 'end' }); setTimeout(endGame, 1200); }
  }
  function facingTile() { for (const d of [.6, 1, 1.3]) { const x = Math.floor(me.x + Math.cos(me.a) * d), y = Math.floor(me.y + Math.sin(me.a) * d), v = L.grid[y * L.n + x]; if (v) return { x, y, v }; } return null; }
  function setLight(r, on) { if (r < 0 || ROOMS[r].n === 'Pantry' && false) return; L.lightsOn[r] = on; send({ t: 'lt', r, on: on ? 1 : 0 }); }
  function interact() {
    if (me.out || js || mode !== 'play') return;
    if (me.hidden) { me.hidden = null; tone(160, .25, 'square', .04, -40); hiss(.3, .07, 300, 2000); return; }
    const f = facingTile();
    if (f && f.v === 3) { const w = L.wardrobes.find(l => l.x === f.x && l.y === f.y); if (w) { me.hidden = w; me.hideT = 0; me.x = w.fx; me.y = w.fy; me.a = Math.atan2(w.fy - (w.y + .5), w.fx - (w.x + .5)); hiss(.3, .08, 300, 2000); tone(150, .3, 'square', .04, -40); if (isHost()) noteHide(myId()); else send({ t: 'hid' }); } return; }
    if (f && f.v === 4) {
      if (leaveArm > 0) { send({ t: 'end' }); endGame(); return; }
      leaveArm = 4; say(me.guess >= 0 ? `Leave the house and end the case? You said: ${GHOSTS[me.guess].n}. Press E again.` : 'You have not named the ghost (J for the journal). Press E again to leave anyway.', '#ffe680'); return;
    }
    const r = roomAt(me.x, me.y); if (r < 0) return;
    setLight(r, !L.lightsOn[r]); tone(1500, .03, 'square', .07); tone(900, .02, 'square', .04, 0, 0, .03);
    if (L.lightsOn[r] && ghost && ghost.hunt) setTimeout(() => { if (L) L.lightsOn[r] = false; }, 300);
  }
  function useTool() {
    if (me.out || me.hidden || js || mode !== 'play') return;
    const k = tool();
    if (k === 'flash' || k === 'uv') { me.flash = !me.flash; tone(1400, .03, 'square', .06); return; }
    if (k === 'box') {
      if (me.boxT > 0) return; me.boxT = 2.6; me.boxMsg = null;
      for (let i = 0; i < 12; i++) hiss(.12, .05, 400 + Math.random() * 2000, 6000, 0, i * .2);
      speak(K.pick(['where are you', 'is anyone here', 'what do you want', 'how old are you', 'give us a sign']), 1, 1, .7);
      return;
    }
    if (k === 'book') {
      const x = me.x + Math.cos(me.a) * .8, y = me.y + Math.sin(me.a) * .8; if (!free(x, y, .1)) { say('No room to put it down there.'); return; }
      L.books = L.books.filter(b => b.id !== myId()); L.books.push({ id: myId(), x, y, w: 0 }); send({ t: 'book', x: +x.toFixed(2), y: +y.toFixed(2) });
      tone(300, .1, 'triangle', .05); say(`Book placed in the ${ROOMS[roomAt(x, y)] ? ROOMS[roomAt(x, y)].n : 'house'}. Leave it and check back.`, '#d0c8b0'); return;
    }
    if (k === 'emf' || k === 'thermo') { tone(2200, .03, 'square', .03); }
  }
  function spiritAnswer() {
    const r = roomAt(me.x, me.y), dG = Math.hypot(ghost.x - me.x, ghost.y - me.y), inRoom = r === roomAt(ghost.x, ghost.y) || dG < 3.5;
    if (has('box') && inRoom && !L.lightsOn[r] && Math.random() < .55) {
      const w = K.pick(Object.values(ANSWERS).flat()); me.boxMsg = { s: w, t: 4 }; me.sanity -= 5; me.boxFails = 0;
      hiss(.5, .2, 300, 5000); speak(w, .1, .45, .9); K.shake(3);
      if (!me.ev.box) say('The spirit box answered.', '#c8ffd0');
    } else { me.boxMsg = { s: '. . .', t: 2.4 }; me.boxFails++; if (me.boxFails === 4) say('Spirit boxes work best in the dark, close to it.', '#9fa8b8'); }
  }
  function roomTemp(r) {
    if (r < 0) return 13;
    if (r !== L.home) return 15.5 - (ROOMS[r].n === 'Hallway' ? 1.2 : 0) - (r * 7 % 5) * .3;
    return Math.max(has('cold') ? -2.6 : 4.2, 12.5 - L.el / 8);
  }
  function emfLevel() { let lv = 0; for (const e of emfs) { const d = Math.hypot(e.x - me.x, e.y - me.y); if (d < 2.4) lv = Math.max(lv, Math.round(e.lv * Math.min(1, e.t / 6 + .3))); } if (ghost && Math.hypot(ghost.x - me.x, ghost.y - me.y) < 1.6) lv = Math.max(lv, 2); return Math.max(1, lv); }
  function updateMe(dt) {
    if (me.out) { const alive = [...others.values()].filter(o => !o.out); if (alive.length) spect = spect % alive.length; return; }
    const r = roomAt(me.x, me.y);
    if (r >= 0 && (!roomShow || roomShow.r !== r)) roomShow = { r, t: 2.5 };
    // sanity: darkness wears you down, the lights help, being near it is worse
    const lit = r >= 0 && L.lightsOn[r], gd = Math.hypot(ghost.x - me.x, ghost.y - me.y), friends = [...others.values()].some(o => !o.out && Math.hypot(o.x - me.x, o.y - me.y) < 3);
    me.sanity = Math.max(0, Math.min(100, me.sanity - dt * ((lit ? .04 : .13) * (friends ? .7 : 1) + (GHOSTS[L.type].drain && gd < 6 ? .25 : 0) + (ghost.hunt && gd < 9 ? .4 : 0))));
    if (me.boxT > 0) { me.boxT -= dt; if (me.boxT <= 0) spiritAnswer(); }
    if (me.boxMsg && (me.boxMsg.t -= dt) <= 0) me.boxMsg = null;
    if ((me.tempT -= dt) <= 0) { me.tempT = .8; me.temp += (roomTemp(r) - me.temp) * .5 + (Math.random() - .5) * .5; }
    me.emf = emfLevel(); if (tool() === 'emf' && me.emf >= 2) { me.emfT -= dt; if (me.emfT <= 0) { me.emfT = [0, 0, .7, .45, .25, .12][me.emf]; tone(1200 + me.emf * 220, .05, 'square', .03 + me.emf * .012); } }
    if (roomTemp(r) < .5 && (me.breathT -= dt) <= 0) me.breathT = 2.6;
    if (leaveArm > 0) leaveArm -= dt;
    if (me.hidden) { me.hideT += dt; return; }
    let fw = 0, st = 0, turn = 0;
    if (!journal) { if (keys.KeyW || keys.ArrowUp) fw++; if (keys.KeyS || keys.ArrowDown) fw--; if (keys.KeyA) st--; if (keys.KeyD) st++; if (keys.ArrowLeft) turn--; if (keys.ArrowRight) turn++; }
    if (touch.move) { fw -= touch.move.dy; st += touch.move.dx; }
    me.a += turn * 2.4 * dt;
    const want = (keys.ShiftLeft || keys.ShiftRight || touch.run) && (fw || st) && me.stam > .02;
    me.run = want; me.stam = want ? Math.max(0, me.stam - dt / 3.5) : Math.min(1, me.stam + dt / 4);
    const sp = (want ? 3.6 : 2.1) * dt, n = Math.hypot(fw, st) || 1, mx = (Math.cos(me.a) * fw - Math.sin(me.a) * st) / Math.max(1, n), my = (Math.sin(me.a) * fw + Math.cos(me.a) * st) / Math.max(1, n);
    if (free(me.x + mx * sp, me.y, .22)) me.x += mx * sp; if (free(me.x, me.y + my * sp, .22)) me.y += my * sp;
    const moving = fw || st;
    if (moving) { me.walk += dt * (want ? 1.6 : 1); me.stepT -= dt * (want ? 1.7 : 1); if (me.stepT <= 0) { me.stepT = .5; hiss(.07, want ? .08 : .045, 250, 1400); if (L.fl[Math.floor(me.y) * L.n + Math.floor(me.x)] === 0 && Math.random() < .12) tone(160 + Math.random() * 60, .3, 'sawtooth', .012, -50); } }
    me.bob = moving ? Math.sin(me.walk * 9) * (want ? 3 : 1.6) : me.bob * .9;
    // seeing it
    if (ghost.man > 0 && gd < 12 && angDiff(Math.atan2(ghost.y - me.y, ghost.x - me.x), me.a) < .55 && los(me.x, me.y, ghost.x, ghost.y) && !me.sawGhost) { me.sawGhost = 1; me.sanity -= GHOSTS[L.type].n === 'Phantom' ? 22 : 12; staticBoost = 2; }
    if (ghost.man <= 0) me.sawGhost = 0;
  }

  /* ---------- the ghost (host) ---------- */
  function players() {
    const a = [];
    if (me && !me.out) a.push({ id: myId(), x: me.x, y: me.y, h: !!me.hidden, san: me.sanity, me: 1 });
    others.forEach(o => { if (o.ok && !o.out) a.push({ id: o.id, x: o.rx, y: o.ry, h: o.h, san: o.san ?? 100 }); });
    return a;
  }
  function pathStep(m, tx, ty, sp, dt) {
    const n = L.n, ti = Math.floor(ty) * n + Math.floor(tx);
    if (!m.field || m.fieldFor !== ti || m.repath <= 0) { if (L.grid[ti] !== 0) return true; m.field = bfsFrom(L.grid, n, ti); m.fieldFor = ti; m.repath = .5; }
    const x = Math.floor(m.x), y = Math.floor(m.y), here = m.field[y * n + x];
    if (here <= 0) { const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy); if (d < .15) return true; m.x += dx / d * Math.min(d, sp * dt); m.y += dy / d * Math.min(d, sp * dt); m.a = Math.atan2(dy, dx); return false; }
    let bx = x, by = y, bv = here;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = m.field[(y + b) * n + x + a]; if (v >= 0 && v < bv) { bv = v; bx = x + a; by = y + b; } }
    const cx = bx + .5, cy = by + .5, dx = cx - m.x, dy = cy - m.y, d = Math.hypot(dx, dy) || 1;
    m.x += dx / d * Math.min(d, sp * dt); m.y += dy / d * Math.min(d, sp * dt); m.a = Math.atan2(dy, dx);
    return false;
  }
  const hideSeen = new Map();
  function noteHide(id) { if (ghost && ghost.hunt && ghost.grace <= 0) { const p = players().find(q => q.id === id); if (p && Math.hypot(p.x - ghost.x, p.y - ghost.y) < 5 && los(ghost.x, ghost.y, p.x, p.y)) ghost.sawHide = { id, x: p.x, y: p.y }; } }
  function randomSpot(r) { const R0 = ROOMS[r]; for (let k = 0; k < 20; k++) { const x = R0.x + .5 + Math.random() * (R0.w - 1), y = R0.y + .5 + Math.random() * (R0.h - 1); if (free(x, y, .2)) return { x, y }; } return { x: R0.x + R0.w / 2, y: R0.y + R0.h / 2 }; }
  function ghostEvent(force) {
    const G = ghost, T = GHOSTS[L.type], ps = players();
    const pool = ['knock', 'steps', 'creak', 'thud', 'touch', 'radio', 'lights', 'hum', 'whisper', 'breath', 'slam'];
    let k = force || K.pick(pool);
    if (T.loud && Math.random() < .5) k = K.pick(['thud', 'slam', 'knock', 'thud']);
    if (T.dark && Math.random() < .4) k = 'lights';
    if (k === 'breath') { const p = ps.filter(p => Math.hypot(p.x - G.x, p.y - G.y) < 5)[0]; if (!p) k = 'creak'; else { emit({ t: 'ev', k, x: p.x, y: p.y, id: p.id }); return; } }
    if (k === 'lights') { const r = roomAt(G.x, G.y), lit = L.lightsOn.map((on, i) => on ? i : -1).filter(i => i >= 0).sort((a, b) => Math.hypot(ROOMS[a].x + ROOMS[a].w / 2 - G.x, ROOMS[a].y + ROOMS[a].h / 2 - G.y) - Math.hypot(ROOMS[b].x + ROOMS[b].w / 2 - G.x, ROOMS[b].y + ROOMS[b].h / 2 - G.y))[0]; if (lit === undefined) k = 'knock'; else { setLight(lit, false); emit({ t: 'ev', k, x: ROOMS[lit].x + ROOMS[lit].w / 2, y: ROOMS[lit].y + ROOMS[lit].h / 2 }); } }
    if (k !== 'lights') emit({ t: 'ev', k, x: +G.x.toFixed(2), y: +G.y.toFixed(2) });
    if (k !== 'whisper' && k !== 'radio') emit({ t: 'emf', x: +G.x.toFixed(2), y: +G.y.toFixed(2), lv: has('emf') && Math.random() < .35 ? 5 : 2 + Math.floor(Math.random() * 3) });
    if ((k === 'touch' || k === 'creak' || k === 'slam') && has('uv')) {
      const gx = Math.floor(G.x), gy = Math.floor(G.y), c = [];
      for (let y = gy - 2; y <= gy + 2; y++) for (let x = gx - 2; x <= gx + 2; x++) { if (L.grid[y * L.n + x] !== 1 && L.grid[y * L.n + x] !== 2) continue; if (L.grid[y * L.n + x - 1] === 0 || L.grid[y * L.n + x + 1] === 0) c.push((y * L.n + x) * 2); if (L.grid[(y - 1) * L.n + x] === 0 || L.grid[(y + 1) * L.n + x] === 0) c.push((y * L.n + x) * 2 + 1); }
      if (c.length && Math.random() < .6) { const i = K.pick(c); L.prints[i] = 1; send({ t: 'pr', i }); }
    }
  }
  function emit(m) { send(m); if (m.t === 'ev') playEvent(m); else if (m.t === 'emf') emfs.push({ x: m.x, y: m.y, lv: m.lv, t: 18 }); }
  function playEvent(m) {
    if (!me) return;
    if (m.k === 'breath') { if (m.id === myId() && !me.out) { SND.breath(); me.sanity -= 5; } return; }
    SND[m.k] && SND[m.k](m.x, m.y);
    if (!me.out && Math.hypot(m.x - me.x, m.y - me.y) < 6) me.sanity -= GHOSTS[L.type].drain ? 4 : 2;
    if (m.k === 'radio' && Math.hypot(m.x - me.x, m.y - me.y) < 8) staticBoost = 1.6;
  }
  function huntBegins() { SND.slam(ghost.x, ghost.y); staticBoost = 3; for (let r = 0; r < ROOMS.length; r++) L.lightsOn[r] = false; }
  function startHunt() {
    const G = ghost; G.hunt = 1; G.huntT = 24 + Math.random() * 8; G.grace = 3; G.target = null; G.lastSeen = null; G.sawHide = null;
    for (let r = 0; r < ROOMS.length; r++) if (L.lightsOn[r]) setLight(r, false);
    huntBegins(); send({ t: 'g', x: +G.x.toFixed(2), y: +G.y.toFixed(2), h: 1, m: 0 });
  }
  function updateGhost(dt) {
    const G = ghost, T = GHOSTS[L.type], ps = players(); G.repath -= dt;
    if (!ps.length) return;
    const avg = ps.reduce((s, p) => s + p.san, 0) / ps.length;
    if (G.hunt) {
      G.huntT -= dt; if (G.grace > 0) { G.grace -= dt; return; }
      if (T.stalk && !G.stalk) G.stalk = K.pick(ps).id;
      let best = null;
      for (const p of ps) { if (p.h) continue; const d = Math.hypot(p.x - G.x, p.y - G.y); if (d < 11 && los(G.x, G.y, p.x, p.y) && (!best || d - (p.id === G.stalk ? 3 : 0) < best.d)) best = { p, d }; }
      if (best) { G.lastSeen = { x: best.p.x, y: best.p.y }; G.seeing = 1; } else G.seeing = 0;
      const sp = T.rev ? (G.seeing ? 3.4 : 1.1) : T.sp * (G.seeing ? 1.25 : .9);
      if (G.sawHide) { if (pathStep(G, G.sawHide.x, G.sawHide.y, sp, dt) || Math.hypot(G.x - G.sawHide.x, G.y - G.sawHide.y) < .6) { const p = ps.find(q => q.id === G.sawHide.id); if (p && p.h) kill(p.id); G.sawHide = null; } }
      else if (G.lastSeen) { if (pathStep(G, G.lastSeen.x, G.lastSeen.y, sp, dt)) G.lastSeen = null; }
      else { if (!G.wt || pathStep(G, G.wt.x, G.wt.y, sp, dt)) G.wt = randomSpot(Math.floor(Math.random() * ROOMS.length)); }
      for (const p of ps) if (!p.h && Math.hypot(p.x - G.x, p.y - G.y) < .55) { kill(p.id); G.lastSeen = null; }
      if (G.huntT <= 0) { G.hunt = 0; G.coolT = 28 + Math.random() * 20; G.wt = null; const h = randomSpot(L.home); G.x = h.x; G.y = h.y; send({ t: 'g', x: +G.x.toFixed(2), y: +G.y.toFixed(2), h: 0, m: 0 }); }
      return;
    }
    // idle: drifting about its room (a Wraith wanders the whole house)
    if (!G.wt || pathStep(G, G.wt.x, G.wt.y, .55, dt)) { const away = Math.random() < (T.roam ? .4 : .12); G.wt = randomSpot(away ? Math.floor(Math.random() * ROOMS.length) : L.home); }
    const inRoom = ps.filter(p => roomAt(p.x, p.y) === roomAt(G.x, G.y)).length;
    const mult = (1 + (100 - avg) / 70) * (T.loud ? 1.8 : 1) * (T.shy && inRoom >= 2 ? .35 : 1) * (inRoom ? 1.3 : 1);
    if ((G.actT -= dt * mult) <= 0) { G.actT = 7 + Math.random() * 10; ghostEvent(); }
    // books in reach get written in
    if (has('write')) for (const b of L.books) if (!b.w && Math.hypot(b.x - G.x, b.y - G.y) < 3.2 && Math.random() < dt * .045) { b.w = 1; emit({ t: 'ev', k: 'touch', x: b.x, y: b.y }); send({ t: 'wr', id: b.id }); if (b.id === myId()) { say('Something wrote in your book.', '#d0b0ff'); me.sanity -= 4; } }
    // showing itself, rarely, to someone looking roughly its way
    if (G.man > 0) G.man -= dt;
    else if (Math.random() < dt * (T.n === 'Phantom' ? .003 : .006) * (1 + (100 - avg) / 60)) { const p = ps.find(p => !p.h && Math.hypot(p.x - G.x, p.y - G.y) < 9 && los(p.x, p.y, G.x, G.y)); if (p) { G.man = .7 + Math.random() * 1.1; send({ t: 'g', x: +G.x.toFixed(2), y: +G.y.toFixed(2), h: 0, m: +G.man.toFixed(2) }); } }
    const darkness = L.lightsOn.filter(Boolean).length === 0;
    if ((G.coolT -= dt) <= 0 && avg < T.hunt + (T.dark && darkness ? 10 : 0) && Math.random() < dt * .07 && (T.roam || ps.some(p => Math.hypot(p.x - G.x, p.y - G.y) < 14))) startHunt();
  }
  function kill(id) { if (id === myId()) caught(); else send({ t: 'kill', id }); if (id !== myId()) { const o = others.get(id); if (o) { o.out = true; say(`${o.name} is gone.`, '#ff5050'); } } }
  /* ---------- lobby (HTML) ---------- */
  const css = document.createElement('style');
  css.textContent = `#daLobby .card{max-width:480px}#daLobby .title{font-family:"Special Elite",monospace;letter-spacing:.06em}#daLobby input{width:100%;padding:12px 14px;border-radius:14px;border:1px solid var(--edge);background:rgba(0,0,0,.45);color:#fff;font:800 18px Nunito,sans-serif;margin:6px 0;text-align:center}#daLobby .code{font:42px "Special Elite",monospace;letter-spacing:.2em;color:var(--accent)}#daLobby ul{list-style:none;padding:0;margin:8px 0;text-align:left}#daLobby li{padding:6px 10px;border-radius:10px;background:rgba(255,255,255,.06);margin:4px 0;font-weight:800}#daLobby .msg{min-height:20px;color:#ff9a9a;font-weight:800;font-size:14px}#daLobby .gh{text-align:left;font-size:14px;line-height:1.35;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.05);margin:6px 0}#daLobby .gh b{font-family:"Special Elite",monospace;font-size:17px}#daLobby .gh i{color:#9fd8b0;font-style:normal;font-weight:800}`;
  document.head.appendChild(css);
  const lob = document.createElement('div'); lob.className = 'scr'; lob.id = 'daLobby'; lob.hidden = true;
  lob.innerHTML = `<div class="card"><h2 class="title">DEAD AIR</h2><p class="sub" id="daSub"></p><div id="daMain">
    <input id="daName" maxlength="12" placeholder="Your name"><button class="big" id="daSolo">Investigate alone</button>
    <div class="row"><button id="daCreate">Create a room</button><button id="daJoinB">Join a room</button></div>
    <div id="daJoinBox" hidden><input id="daCode" maxlength="4" placeholder="ROOM CODE" autocomplete="off"><button class="big" id="daJoinGo">Join</button></div>
    <div id="daRoom" hidden><p class="sub" style="margin:10px 0 0">Room code (send it to your friends)</p><div class="code" id="daCodeShow"></div><ul id="daPlayers"></ul><button class="big" id="daStart">Start the investigation</button><p class="hint" id="daWait"></p><div class="row"><button id="daLeave">Leave the room</button></div></div>
    <div class="row"><button id="daGuide">Ghost guide</button></div><p class="msg" id="daMsg"></p>
    <p class="hint">Best with headphones, in the dark, with friends. 1 to 4 players.</p></div><div id="daSide" hidden></div></div>`;
  document.body.appendChild(lob);
  const $s = id => document.getElementById(id);
  function lobbyMsg(s) { $s('daMsg').textContent = s || ''; }
  function showLobby() { lob.hidden = false; $s('daMain').hidden = false; $s('daSide').hidden = true; $s('daName').value = save.name || ''; const st = save.da || { n: 0, right: 0 }; $s('daSub').textContent = st.n ? `Cases: ${st.n} · solved: ${st.right}` : '14 Alder Lane. Something is still in there.'; lobbyRoom(); }
  function hideLobby() { lob.hidden = true; }
  function lobbyRoom() {
    const inRoom = !!(net && net.ok);
    $s('daRoom').hidden = !inRoom; $s('daSolo').hidden = inRoom; $s('daCreate').parentNode.hidden = inRoom; if (inRoom) $s('daJoinBox').hidden = true;
    if (!inRoom) return;
    $s('daCodeShow').textContent = net.code;
    const ps = [{ id: net.id, name: net.name + ' (you)' }, ...[...others.values()]].sort((a, b) => a.id - b.id);
    $s('daPlayers').innerHTML = ps.map(p => `<li style="border-left:6px solid ${COLS[p.id % 4]}">${p.name.replace(/[<>&]/g, '')}${p.id === net.hostId ? ' · host' : ''}</li>`).join('');
    $s('daStart').hidden = !isHost(); $s('daWait').textContent = isHost() ? (others.size ? 'Everyone in? Start when ready.' : 'Waiting for friends... or start alone.') : 'Waiting for the host to start.';
    lobbyMsg('');
  }
  const myName = () => { const v = ($s('daName').value || '').replace(/[^\w .'-]/g, '').trim().slice(0, 12) || 'Player'; save.name = v; K.persist(); return v; };
  $s('daSolo').onclick = () => { myName(); if (net && net.ws) { try { net.ws.close(); } catch (e) {} } net = null; K.audio && K.audio(); startGame(); };
  $s('daCreate').onclick = () => { K.audio && K.audio(); const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; connect(Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join(''), myName()); };
  $s('daJoinB').onclick = () => { $s('daJoinBox').hidden = false; $s('daCode').focus(); };
  $s('daJoinGo').onclick = () => { K.audio && K.audio(); const c = ($s('daCode').value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length !== 4) return lobbyMsg('Room codes are 4 letters.'); connect(c, myName()); };
  $s('daCode').onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') $s('daJoinGo').click(); };
  $s('daName').onkeydown = e => e.stopPropagation();
  $s('daStart').onclick = () => { K.audio && K.audio(); startGame(); };
  $s('daLeave').onclick = () => { const w = net && net.ws; net = null; others.clear(); if (w) try { w.close(); } catch (e) {} lobbyRoom(); };
  $s('daGuide').onclick = () => {
    const el = $s('daSide'); $s('daMain').hidden = true; el.hidden = false;
    el.innerHTML = `<p class="sub">Every ghost leaves exactly three kinds of evidence.</p>` + GHOSTS.map(g => `<div class="gh"><b>${g.n}</b> · <i>${g.ev.map(e => EV.find(x => x[0] === e)[1]).join(' · ')}</i><br>${g.d}</div>`).join('') +
      `<div class="gh"><b>Tools</b><br>EMF reader: a reading of 5 is evidence. Thermometer: below 0°C is evidence. Spirit box: ask in the dark near it. Book: leave it near it and come back. UV light: look for handprints on the walls near where it has been.</div><button class="big" id="daBack" style="margin-top:10px">Back</button>`;
    $s('daBack').onclick = showLobby;
  };

  /* ---------- kit hooks ---------- */
  GAME.reset = () => {
    save = K.save;
    if (!SPR.ghost) { buildSprites(); others.forEach(o => { o.tex = friendTex[o.id % 4]; }); }
    for (const k in keys) keys[k] = false; feed = []; js = null; journal = false;
    if (K.bot) { if (net && net.ws) try { net.ws.close(); } catch (e) {} net = null; others.clear(); hideLobby(); demo(); return; }
    mode = 'lobby'; me = newMe(); L = genHouse(7); me.x = 12.5; me.y = 16; me.a = 0; ghost = null; menuT = 0;
    if (pending && net && net.ok) { const m = pending; pending = null; me = newMe(); return beginGame(m.seed, m); }
    showLobby();
  };
  function demo() { me = newMe(); L = genHouse(4242); beginGame(4242, {}); me.x = L.spawn.x; me.y = L.spawn.y; mode = 'play'; between = 0; me.tool = 1; me.demoT = 0; me.flash = true; ghost.coolT = 9999; L.lightsOn = L.lightsOn.map((v, i) => [0, 5, 6, 7].includes(i)); }
  GAME.pose = () => {
    me.x = 1.6; me.y = 10.6; me.a = 0; me.tool = 0; me.flash = true; me.bob = 0; mode = 'play'; between = 0;
    ghost.x = ghost.rx = 7.2; ghost.y = ghost.ry = 11.1; ghost.man = 999; ghost.coolT = 9999; L.lightsOn = L.lightsOn.map(() => false); me.posed = 1; ghost.x = ghost.rx = 5.6; ghost.y = ghost.ry = 10.9;
  };
  function botThink(dt) {
    me.demoT += dt; if (me.posed) return;
    if (!me.bt || Math.hypot(me.bt.x - me.x, me.bt.y - me.y) < .7 || me.btT <= 0) { const r = Math.floor(Math.random() * ROOMS.length); me.bt = randomSpot(r); me.btT = 12; me.field = bfsFrom(L.grid, L.n, Math.floor(me.bt.y) * L.n + Math.floor(me.bt.x)); me.tool = [1, 2, 0, 4][Math.floor(Math.random() * 4)]; }
    me.btT -= dt;
    const x = Math.floor(me.x), y = Math.floor(me.y), here = me.field[y * L.n + x]; let tx = me.bt.x, ty = me.bt.y;
    if (here > 0) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = me.field[(y + b) * L.n + x + a]; if (v >= 0 && v < here) { tx = x + a + .5; ty = y + b + .5; } }
    const want = Math.atan2(ty - me.y, tx - me.x), da = ((want - me.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    me.a += Math.max(-dt * 2.4, Math.min(dt * 2.4, da)) + Math.sin(K.t * .8) * dt * .2;
    keys.KeyW = Math.abs(da) < .9;
    // for the trailer: it shows itself, now and then, at the end of the corridor
    if (me.demoT > 5 && ghost.man <= 0 && Math.random() < dt * .12) for (let d = 6; d > 2.5; d -= .5) { const gx = me.x + Math.cos(me.a) * d, gy = me.y + Math.sin(me.a) * d; if (free(gx, gy, .25) && los(me.x, me.y, gx, gy)) { ghost.x = ghost.rx = gx; ghost.y = ghost.ry = gy; ghost.man = 1.2; break; } }
    if (Math.random() < dt * .15) ghostEvent();
  }
  let flickT = 0;
  GAME.update = dt => {
    if (!staticG && K.ac && mode !== 'lobby') startStatic();
    for (let i = feed.length - 1; i >= 0; i--) { feed[i].t -= dt; if (feed[i].t <= 0) feed.splice(i, 1); }
    if (mode === 'lobby') { menuT += dt; me.a += dt * .1; if (staticG && K.ac) staticG.gain.setTargetAtTime(0, K.ac.currentTime, .3); return; }
    if (mode === 'over' || !L) return;
    L.el += dt;
    if (mode === 'between') { between -= dt; if (between <= 0) { mode = 'play'; if (!K.bot) say('Find three pieces of evidence. Name it in your journal (J). Leave by the front door.', '#cfe3d4'); } }
    if (js) { js.t += dt; if (js.t > 1.3) { js = null; afterCaught(); } }
    if (roomShow && (roomShow.t -= dt) <= 0) roomShow = null;
    for (let i = emfs.length - 1; i >= 0; i--) if ((emfs[i].t -= dt) <= 0) emfs.splice(i, 1);
    if (mode === 'play' && !js) { if (K.bot) botThink(dt); updateMe(dt); }
    if (net && net.ok && me) {
      net.sendT -= dt; if (net.sendT <= 0) { net.sendT = 1 / 12; send({ t: 'p', x: +me.x.toFixed(2), y: +me.y.toFixed(2), a: +me.a.toFixed(2), f: me.flash ? 1 : 0, u: tool() === 'uv' ? 1 : 0, tl: me.tool, h: me.hidden ? 1 : 0, o: me.out ? 1 : 0, r: me.run ? 1 : 0, s: Math.round(me.sanity) }); }
      if (isHost() && others.size && ghost) { net.gT -= dt; if (net.gT <= 0) { net.gT = .1; send({ t: 'g', x: +ghost.x.toFixed(2), y: +ghost.y.toFixed(2), h: ghost.hunt, m: ghost.man > 0 ? +ghost.man.toFixed(2) : 0 }); } }
    }
    if (ghost) {
      if (isHost() && mode === 'play' && !K.bot) updateGhost(dt);
      else { if (!isHost()) { ghost.x += (ghost.rx - ghost.x) * Math.min(1, dt * 10); ghost.y += (ghost.ry - ghost.y) * Math.min(1, dt * 10); } if (ghost.man > 0) ghost.man -= dt; }
      if (ghost.hunt) { if ((flickT -= dt) <= 0) { ghost.flick = !ghost.flick; flickT = ghost.flick ? .12 + Math.random() * .4 : .05 + Math.random() * .18; } ghost.stepT = (ghost.stepT || 0) - dt; if (ghost.stepT <= 0) { ghost.stepT = .42; const s = srcSound(ghost.x, ghost.y); tone(52, .2, 'sine', .55 * s.vol, -14, s.pan); hiss(.1, .14 * s.vol, 50, 500, s.pan); } }
    }
    others.forEach(o => { const ox = o.x, oy = o.y; o.x += (o.rx - o.x) * Math.min(1, dt * 10); o.y += (o.ry - o.y) * Math.min(1, dt * 10); o.a += (((o.ra - o.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 10); if (Math.hypot(o.x - ox, o.y - oy) > dt * .5) { o.stepT -= dt * (o.run ? 1.7 : 1); if (o.stepT <= 0) { o.stepT = .5; const s = srcSound(o.x, o.y); hiss(.07, (o.run ? .08 : .045) * s.vol, 250, 1400, s.pan); } } });
    // the static: almost nothing, until it is near
    if (staticG && K.ac && me) {
      staticBoost = Math.max(0, staticBoost - dt * .8); const gd = ghost ? Math.hypot(ghost.x - me.x, ghost.y - me.y) : 99;
      staticG.gain.setTargetAtTime(.0045 + (ghost && ghost.hunt ? .05 / (1 + gd * .25) : 0) + staticBoost * .02 + (ghost && ghost.man > 0 ? .03 : 0) + (me.emf >= 4 ? .006 : 0), K.ac.currentTime, .15);
      if (ghost && ghost.hunt && gd < 9 && !me.out) { me.hbT = (me.hbT || 0) - dt; if (me.hbT <= 0) { me.hbT = .32 + gd * .08; heart(.1 + (9 - gd) * .03); } }
    }
    // with low sanity, the house plays tricks: a knock that is not there, your name
    if (me && !me.out && mode === 'play' && me.sanity < 35 && Math.random() < dt * .02) { const a = me.a + Math.PI + (Math.random() - .5); K.pick([() => SND.knock(me.x + Math.cos(a) * 3, me.y + Math.sin(a) * 3), () => SND.steps(me.x + Math.cos(a) * 4, me.y + Math.sin(a) * 4), () => speak((net && net.name) || 'hello', .1, .5, .35)])(); }
  };

  /* ---------- drawing ---------- */
  let vign = null, grain = null, perf = 0, slowN = 0;
  const BLOOM = 'filter' in CanvasRenderingContext2D.prototype, bl = document.createElement('canvas'); bl.width = 160; bl.height = 90; const blc = bl.getContext('2d');
  const motes = Array.from({ length: 50 }, () => ({ x: Math.random(), y: Math.random(), z: .3 + Math.random() * .7, p: Math.random() * 6 }));
  function overlays() {
    if (vign) return;
    vign = document.createElement('canvas'); vign.width = 640; vign.height = 360; const v = vign.getContext('2d'), gr = v.createRadialGradient(320, 180, 50, 320, 180, 380); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.9)'); v.fillStyle = gr; v.fillRect(0, 0, 640, 360);
    grain = document.createElement('canvas'); grain.width = grain.height = 256; const g2 = grain.getContext('2d'), id = g2.createImageData(256, 256); for (let i = 0; i < id.data.length; i += 4) { const c = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = c; id.data[i + 3] = 20; } g2.putImageData(id, 0, 0);
  }
  function face(g, t) {
    const F = getFace('hollow'), v = K.view, k = Math.min(1, t / .1), s = (.3 + k * .66 + t * .2) * 3.1, sx = (Math.random() - .5) * 60, sy = (Math.random() - .5) * 60;
    g.fillStyle = '#000'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    if (t > .9) { g.drawImage(grain, -Math.random() * 256, -Math.random() * 256, 1280 + 512, 720 + 512); return; }
    const w = 300 * s, h = 300 * s, x = 640 - w / 2 + sx, y = 380 - h * .48 + sy;
    g.globalAlpha = Math.random() < .3 ? .4 : 1; g.drawImage(F.img, x, y, w, h); g.globalAlpha = 1;
    for (let i = 0; i < 8; i++) { g.fillStyle = Math.random() < .6 ? '#000' : 'rgba(255,255,255,.25)'; g.fillRect(v.x0, Math.random() * 720, v.x1 - v.x0, 2 + Math.random() * 30); }
    g.drawImage(grain, -Math.random() * 256, -Math.random() * 256, 1280 + 512, 720 + 512);
  }
  function project(x, y) { const c = me, dx = Math.cos(c.a), dy = Math.sin(c.a), plx = -dy * FOV, ply = dx * FOV, sx = x - c.x, sy = y - c.y, inv = 1 / (plx * dy - dx * ply), tx = inv * (dy * sx - dx * sy), ty = inv * (-ply * sx + plx * sy); return ty > .1 ? { x: 640 * (1 + tx / ty), d: ty } : null; }
  // the tool in your hand, bottom right
  function drawTool(g) {
    const k = tool(), bx = 960 + Math.sin(me.walk * 4.5) * 6, by = 520 + Math.abs(Math.cos(me.walk * 4.5)) * 6 + (me.hidden ? 200 : 0);
    g.save(); g.translate(bx, by); g.rotate(-.08);
    const body = (w, h, c = '#1c1d20') => { g.fillStyle = c; g.beginPath(); g.roundRect(0, 0, w, h, 14); g.fill(); g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; g.stroke(); };
    if (k === 'emf') { body(170, 220); g.fillStyle = '#0b0b0c'; g.beginPath(); g.roundRect(18, 20, 134, 60, 8); g.fill(); const cols = ['#3aff6a', '#9aff3a', '#ffe23a', '#ff9a2a', '#ff3a2a']; for (let i = 0; i < 5; i++) { const on = me.emf > i; g.fillStyle = on ? cols[i] : '#2a2a2a'; g.beginPath(); g.arc(36 + i * 25, 50, 9, 0, 7); g.fill(); if (on) { g.fillStyle = cols[i] + '55'; g.beginPath(); g.arc(36 + i * 25, 50, 16, 0, 7); g.fill(); } } g.fillStyle = '#8a8a8a'; g.font = HF(16); g.textAlign = 'center'; g.fillText('EMF', 85, 110); }
    else if (k === 'thermo') { body(150, 230, '#d8d4c8'); g.fillStyle = '#9ab09a'; g.beginPath(); g.roundRect(16, 22, 118, 64, 6); g.fill(); g.fillStyle = '#1a2a1a'; g.font = '700 34px "Courier New", monospace'; g.textAlign = 'center'; g.fillText(`${me.temp.toFixed(1)}°`, 75, 66); g.fillStyle = '#5a5a5a'; g.font = HF(14); g.fillText('°C', 75, 104); if (me.temp < 0) { g.fillStyle = '#5ac8ff'; g.fillText('FREEZING', 75, 124); } }
    else if (k === 'box') { body(200, 170, '#2a2420'); g.fillStyle = '#7a7a7a'; g.fillRect(150, -120, 5, 124); g.fillStyle = '#122014'; g.beginPath(); g.roundRect(16, 20, 168, 56, 6); g.fill(); g.font = '700 26px "Courier New", monospace'; g.textAlign = 'center'; g.fillStyle = '#6aff8a';
      g.fillText(me.boxMsg ? me.boxMsg.s.toUpperCase() : me.boxT > 0 ? `FM ${(87.5 + Math.random() * 20).toFixed(1)}` : 'READY', 100, 58); for (let i = 0; i < 9; i++) { g.fillStyle = '#111'; g.beginPath(); g.arc(40 + i * 15, 120, 4, 0, 7); g.fill(); } }
    else if (k === 'book') { g.fillStyle = '#5a1a14'; g.beginPath(); g.roundRect(0, 20, 210, 150, 8); g.fill(); g.fillStyle = '#e8e0cc'; g.fillRect(14, 30, 182, 130); g.fillStyle = '#9a9488'; for (let i = 0; i < 8; i++) g.fillRect(28, 48 + i * 13, 150, 2); g.fillStyle = '#2a2a2a'; g.font = HF(14); g.textAlign = 'center'; g.fillText(L.books.some(b => b.id === myId()) ? 'Click: move your book here' : 'Click: put the book down', 105, 190); }
    else { const uv = k === 'uv', gr = g.createLinearGradient(20, 0, 110, 0); gr.addColorStop(0, uv ? '#24142e' : '#1a1a1c'); gr.addColorStop(.45, uv ? '#5a3a6e' : '#4a4a50'); gr.addColorStop(1, uv ? '#1a0e22' : '#141416'); g.fillStyle = gr;
      g.beginPath(); g.moveTo(10, 20); g.lineTo(120, 20); g.lineTo(104, 80); g.lineTo(98, 260); g.lineTo(32, 260); g.lineTo(26, 80); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 110; y < 250; y += 12) g.fillRect(32, y, 66, 5); g.fillStyle = '#7a7a80'; g.beginPath(); g.ellipse(65, 20, 55, 12, 0, 0, 7); g.fill();
      g.fillStyle = me.flash ? (uv ? '#d090ff' : '#fff8dc') : '#2a2a2a'; g.beginPath(); g.ellipse(65, 20, 46, 9, 0, 0, 7); g.fill();
      if (me.flash) { const gl = g.createRadialGradient(65, 18, 4, 65, 18, 70); gl.addColorStop(0, uv ? 'rgba(200,120,255,.35)' : 'rgba(255,248,220,.3)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(-10, -50, 150, 140); }
      g.fillStyle = uv ? '#8a5aaa' : '#8a2a2a'; g.beginPath(); g.roundRect(56, 90, 18, 12, 3); g.fill(); }
    g.restore();
  }
  function drawJournal(g) {
    const x0 = 160, y0 = 70; g.fillStyle = 'rgba(232,224,204,.97)'; g.beginPath(); g.roundRect(x0, y0, 960, 580, 10); g.fill();
    g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(x0 + 478, y0, 4, 580);
    g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#2a2018'; g.font = TF(30); g.fillText('Evidence', x0 + 40, y0 + 44); g.fillText('Ghost', x0 + 520, y0 + 44);
    g.font = HF(13); g.fillStyle = '#6a5a48'; g.fillText('Click: found, then ruled out, then unknown.', x0 + 40, y0 + 74); g.fillText('Click the one you think it is.', x0 + 520, y0 + 74);
    JB.ev = []; JB.gh = [];
    EV.forEach(([k, n], i) => { const y = y0 + 110 + i * 54, st = me.ev[k] || 0; JB.ev.push({ x: x0 + 34, y: y - 22, w: 400, h: 44, k }); g.strokeStyle = '#3a2a1a'; g.lineWidth = 2.5; g.strokeRect(x0 + 44, y - 13, 26, 26);
      if (st === 1) { g.strokeStyle = '#1a6a2a'; g.lineWidth = 4; g.beginPath(); g.moveTo(x0 + 48, y); g.lineTo(x0 + 56, y + 9); g.lineTo(x0 + 70, y - 12); g.stroke(); }
      if (st === 2) { g.strokeStyle = '#8a1a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0 + 34, y + 2); g.lineTo(x0 + 330, y - 2); g.stroke(); }
      g.fillStyle = st === 2 ? '#8a7a68' : '#2a2018'; g.font = TF(24); g.fillText(n, x0 + 88, y); });
    const found = EV.filter(([k]) => me.ev[k] === 1).map(e => e[0]), out = EV.filter(([k]) => me.ev[k] === 2).map(e => e[0]);
    GHOSTS.forEach((G, i) => { const y = y0 + 110 + i * 54, ok = found.every(e => G.ev.includes(e)) && !out.some(e => G.ev.includes(e)); JB.gh.push({ x: x0 + 510, y: y - 24, w: 420, h: 48, i });
      if (me.guess === i) { g.strokeStyle = '#8a1a1a'; g.lineWidth = 3; g.beginPath(); g.ellipse(x0 + 586, y, 82, 22, -.03, 0, 7); g.stroke(); }
      g.fillStyle = ok ? '#2a2018' : 'rgba(42,32,24,.28)'; g.font = TF(24); g.fillText(G.n, x0 + 524, y - 4); g.font = HF(12); g.fillStyle = ok ? '#5a4a38' : 'rgba(42,32,24,.25)'; g.fillText(G.ev.map(e => EV.find(x => x[0] === e)[1]).join(' · '), x0 + 524, y + 17); });
    // a little floor plan
    const s = 9.5, ox = x0 + 70, oy = y0 + 392;
    g.fillStyle = '#2a2018'; g.font = HF(13); g.fillText(`Floor plan · sanity ${Math.round(me.sanity)}%`, ox - 30, oy - 16);
    for (let y = 0; y < L.n; y++) for (let x = 0; x < L.n; x++) if (!L.grid[y * L.n + x]) { g.fillStyle = 'rgba(80,60,40,.35)'; g.fillRect(ox + x * s, oy + y * s * .7, s, s * .7); }
    g.fillStyle = '#8a1a1a'; g.beginPath(); g.arc(ox + me.x * s, oy + me.y * s * .7, 4, 0, 7); g.fill();
    others.forEach(o => { if (!o.out) { g.fillStyle = o.col; g.beginPath(); g.arc(ox + o.x * s, oy + o.y * s * .7, 3.5, 0, 7); g.fill(); } });
    g.fillStyle = '#6a5a48'; g.font = HF(13); g.textAlign = 'center'; g.fillText('J to close', x0 + 480, y0 + 560); g.textBaseline = 'alphabetic';
  }
  const JB = { ev: [], gh: [] };
  function drawHUD(g) {
    g.textBaseline = 'middle';
    if (roomShow) { g.globalAlpha = Math.min(1, roomShow.t) * .8; g.textAlign = 'center'; g.font = TF(24); g.fillStyle = '#cfe3d4'; g.fillText(ROOMS[roomShow.r].n, 640, 54); g.globalAlpha = 1; }
    g.textAlign = 'left'; g.font = HF(15); g.fillStyle = 'rgba(207,227,212,.8)'; g.fillText(`${me.tool + 1} · ${TN[tool()]}`, 28, 668); g.font = HF(12); g.fillStyle = 'rgba(207,227,212,.5)';
    g.fillText(touch.on ? 'TOOL to switch · USE to use' : '1-6 tools · click use · F light · E switch/hide/door · J journal', 28, 692);
    if (me.stam < .98) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(28, 640, 120, 4); g.fillStyle = 'rgba(207,227,212,.6)'; g.fillRect(28, 640, 120 * me.stam, 4); }
    if (net && net.ok) {
      const ps = [{ name: (net.name || 'You') + ' (you)', id: net.id, out: me.out }, ...[...others.values()].map(o => ({ name: o.name, id: o.id, out: o.out }))];
      ps.forEach((p, i) => { g.fillStyle = COLS[p.id % 4]; g.globalAlpha = p.out ? .35 : .8; g.fillRect(1100, 24 + i * 22, 6, 14); g.font = HF(14); g.textAlign = 'left'; g.fillStyle = '#cfe3d4'; g.fillText(p.name + (p.out ? ' · gone' : ''), 1114, 31 + i * 22); g.globalAlpha = 1; });
    }
    others.forEach(o => { if (o.out || !o.scr || !o.scr.vis || o.scr.d > 10) return; g.font = HF(15); g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillText(o.name, o.scr.x + 1, o.scr.y - 9); g.fillStyle = o.col; g.fillText(o.name, o.scr.x, o.scr.y - 10); });
    g.textAlign = 'center'; g.font = HF(18);
    const f = !me.hidden && !me.out && facingTile(), r = roomAt(me.x, me.y);
    let prompt = me.hidden ? 'Hiding. Stay still. E to step out.' : f && f.v === 3 ? 'E: hide in the wardrobe' : f && f.v === 4 ? 'E: leave the house (ends the case)' : '';
    if (me.out) prompt = 'You are gone. Click to watch someone else.';
    if (prompt) { g.fillStyle = 'rgba(0,0,0,.5)'; const w = g.measureText(prompt).width + 30; g.fillRect(640 - w / 2, 590, w, 34); g.fillStyle = '#e8e8e8'; g.fillText(prompt, 640, 608); }
    feed.forEach((m, i) => { g.globalAlpha = Math.min(1, m.t); g.fillStyle = m.c; g.font = HF(17); g.fillText(m.s, 640, 500 + i * 26 - feed.length * 13); }); g.globalAlpha = 1;
    if (!touch.on && !K.bot && !document.pointerLockElement && mode === 'play' && !me.out && !journal) { g.font = HF(14); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillText('Click to look around with the mouse', 640, 650); }
    g.textBaseline = 'alphabetic';
  }
  function drawTouch(g) {
    touch.btns = [['RUN', 1070, 590, 'run'], ['USE', 1190, 500, 'use'], ['E', 1190, 630, 'e'], ['TOOL', 1070, 460, 'tool'], ['J', 950, 640, 'j'], ['LIGHT', 950, 520, 'light']];
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = HF(18);
    for (const [t, x, y, k] of touch.btns) { g.fillStyle = (k === 'run' && touch.run) ? 'rgba(159,232,255,.4)' : 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(x, y, 46, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(t, x, y); }
    if (touch.move) { g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 3; g.beginPath(); g.arc(touch.move.ox, touch.move.oy, 70, 0, 7); g.stroke(); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(touch.move.ox + touch.move.dx * 70, touch.move.oy + touch.move.dy * 70, 30, 0, 7); g.fill(); }
    g.textBaseline = 'alphabetic';
  }
  GAME.draw = g => {
    const v = K.view; g.fillStyle = '#000'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    if (!L || !me) return;
    overlays();
    let cam;
    const gd = ghost ? Math.hypot(ghost.x - me.x, ghost.y - me.y) : 99, near = ghost && ((ghost.hunt && gd < 10) || (ghost.man > 0 && gd < 8));
    if (mode === 'lobby') cam = { x: me.x, y: me.y, a: me.a, bob: 0, lamp: Math.sin(menuT * 5) > .9 ? .15 : .75, lampW: 1, sanity: 100 };
    else if (me.out) { const alive = [...others.values()].filter(o => !o.out); if (alive.length) { const o = alive[spect % alive.length]; cam = { x: o.x, y: o.y, a: o.a, bob: 0, lamp: o.f ? (o.uv ? .7 : 1) : 0, lc: o.uv ? UVC : LAMPC, uv: !!o.uv, of: o, lampW: 1, sanity: 100 }; } else cam = { x: me.x, y: me.y, a: me.a, bob: 0, lamp: 0, lampW: 1, sanity: 0 }; }
    else { const uv = tool() === 'uv', on = me.flash && (tool() === 'flash' || uv || true); cam = { x: me.x, y: me.y, a: me.a, bob: me.bob, lamp: (on ? (uv ? .6 : .72) : 0) * (near && !me.posed && Math.random() < (ghost.hunt ? .45 : .12) ? .05 : 1) * (K.bot ? 1.3 : 1) * (me.hidden ? .3 : 1), lampW: uv ? .8 : 1, lc: uv ? UVC : LAMPC, uv: uv && me.flash, sanity: me.sanity }; }
    const t0 = performance.now(); render(cam); perf = perf * .95 + (performance.now() - t0) * .05;
    if (perf > 19 && RW > 320 && ++slowN > 90) { setRes(320, 180); perf = 0; }
    g.imageSmoothingEnabled = false;
    const wob = me.sanity < 25 && mode === 'play' && !me.out;
    if (wob) for (let y = 0; y < RH; y += 4) g.drawImage(buf, 0, y, RW, 4, Math.sin(K.t * 3 + y * .08) * (25 - me.sanity) * .4, y * SC(), 1280, 4 * SC());
    else g.drawImage(buf, 0, 0, 1280, 720);
    g.imageSmoothingEnabled = true;
    if (BLOOM) { blc.filter = 'blur(3px)'; blc.clearRect(0, 0, 160, 90); blc.drawImage(buf, 0, 0, 160, 90); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .17; g.drawImage(bl, 0, 0, 1280, 720); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    if (cam.lamp > .2 && !cam.uv) { for (const m of motes) { m.x += Math.sin(K.t * .3 + m.p) * .0004; m.y += .00025 + Math.cos(K.t * .5 + m.p) * .0003; if (m.y > 1) m.y = 0; const dx = (m.x - .5) * 2, dy = (m.y - .5) * 2, r = dx * dx / .5 + dy * dy / .9; if (r > 1) continue; g.fillStyle = `rgba(255,240,210,${(1 - r) * .3 * cam.lamp * m.z})`; g.fillRect(m.x * 1280, m.y * 720, 2.5 * m.z, 2.5 * m.z); } }
    if (me.hidden) { g.fillStyle = '#060504'; for (let y = 0; y < 720; y += 44) g.fillRect(v.x0, y, v.x1 - v.x0, 30); g.fillRect(v.x0, 0, 260 - v.x0, 720); g.fillRect(1020, 0, v.x1, 720); }
    // breath in the cold
    if (me.breathT > 2 && !me.out && !me.hidden) { const a = (me.breathT - 2) / .6; for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(220,230,240,${.06 * a})`; g.beginPath(); g.ellipse(640 + Math.sin(i * 2) * 40, 700 - (1 - a) * 160 - i * 18, 120 + i * 20, 50 + i * 8, 0, 0, 7); g.fill(); } }
    g.drawImage(vign, v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.drawImage(grain, -Math.random() * 256, -Math.random() * 256, 1280 + 512, 720 + 512);
    if (near || staticBoost > .5) { const n = near ? 6 : 3; for (let i = 0; i < n; i++) { g.fillStyle = `rgba(255,255,255,${.03 + Math.random() * .05})`; g.fillRect(v.x0, Math.random() * 720, v.x1 - v.x0, 1 + Math.random() * 3); } }
    if (mode === 'lobby') return;
    if (mode === 'between') {
      g.fillStyle = `rgba(0,0,0,${Math.min(1, between)})`; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
      g.globalAlpha = Math.min(1, between, (4.2 - between) * 1.5); g.textAlign = 'center'; g.font = TF(64); g.fillStyle = '#cfe3d4'; g.fillText('14 Alder Lane', 640, 330); g.font = TF(24); g.fillStyle = '#8a9a90'; g.fillText('2:13 AM. The family moved out in a hurry.', 640, 390); g.globalAlpha = 1;
      return;
    }
    if (!K.bot && !me.posed) { if (!me.out) drawTool(g); drawHUD(g); }
    if (journal) drawJournal(g);
    if (touch.on && !K.bot) drawTouch(g);
    if (js) face(g, js.t);
  };

  /* ---------- input ---------- */
  function toggleJournal() { journal = !journal; tone(400, .05, 'triangle', .04); if (journal) try { document.exitPointerLock(); } catch (e) {} }
  GAME.key = (c, d) => {
    keys[c] = d; if (!d || mode !== 'play') return;
    if (c === 'KeyJ' || c === 'Tab' || (c === 'Escape' && journal)) return toggleJournal();
    if (me.out) { if (c === 'Space') spect++; return; }
    if (c === 'KeyF') { me.flash = !me.flash; tone(1400, .03, 'square', .06); }
    if (c === 'KeyE') interact();
    if (c === 'KeyQ' || c === 'Space') useTool();
    const n = /^Digit([1-6])$/.exec(c); if (n) { me.tool = +n[1] - 1; tone(700, .03, 'square', .03); }
  };
  function journalClick(x, y) {
    for (const b of JB.ev) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { me.ev[b.k] = ((me.ev[b.k] || 0) + 1) % 3; tone(500, .04, 'triangle', .04); return true; }
    for (const b of JB.gh) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { me.guess = me.guess === b.i ? -1 : b.i; tone(300, .06, 'triangle', .05); return true; }
    return false;
  }
  GAME.down = (x, y, e) => {
    if (mode !== 'play') return;
    if (e && e.pointerType === 'touch') {
      touch.on = true;
      for (const [, bx, by, k] of touch.btns) if (Math.hypot(x - bx, y - by) < 50) { if (k === 'run') touch.run = !touch.run; if (k === 'use') useTool(); if (k === 'e') interact(); if (k === 'tool') { me.tool = (me.tool + 1) % TOOLS.length; tone(700, .03, 'square', .03); } if (k === 'j') toggleJournal(); if (k === 'light') GAME.key('KeyF', true); if (me.out) spect++; return; }
      if (journal) { journalClick(x, y); return; }
      if (x < 640) touch.move = { id: e.pointerId, ox: x, oy: y, dx: 0, dy: 0 }; else touch.look = { id: e.pointerId, x };
      return;
    }
    if (journal) { if (!journalClick(x, y) && (x < 160 || x > 1120 || y < 70 || y > 650)) toggleJournal(); return; }
    if (me.out) { spect++; return; }
    if (!document.pointerLockElement) { try { document.getElementById('cv').requestPointerLock(); } catch (err) {} touch.drag = { x }; return; }
    useTool();
  };
  GAME.move = (x, y, e) => {
    if (mode !== 'play' || !me || journal) return;
    if (document.pointerLockElement && e) { me.a += (e.movementX || 0) * .0028; return; }
    if (touch.move && e && e.pointerId === touch.move.id) { const dx = (x - touch.move.ox) / 70, dy = (y - touch.move.oy) / 70, l = Math.hypot(dx, dy); touch.move.dx = l > 1 ? dx / l : dx; touch.move.dy = l > 1 ? dy / l : dy; return; }
    if (touch.look && e && e.pointerId === touch.look.id) { me.a += (x - touch.look.x) * .006; touch.look.x = x; return; }
    if (touch.drag) { me.a += (x - touch.drag.x) * .005; touch.drag.x = x; }
  };
  GAME.up = (x, y, e) => { if (touch.move && (!e || e.pointerId === touch.move.id)) touch.move = null; if (touch.look && (!e || e.pointerId === touch.look.id)) touch.look = null; touch.drag = null; };
  addEventListener('pointerup', e => { if (touch.move && e.pointerId === touch.move.id) touch.move = null; if (touch.look && e.pointerId === touch.look.id) touch.look = null; });
  GAME.test = { get me() { return me; }, get L() { return L; }, get ghost() { return ghost; }, get mode() { return mode; }, get others() { return others; }, get net() { return net; }, start: startGame, hunt: () => startHunt(), ev: k => ghostEvent(k), connect };
})();
