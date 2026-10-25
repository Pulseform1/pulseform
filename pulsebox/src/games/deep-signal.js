/* Deep Signal: a submarine in a black sea cave, seen only on a sonar scope. Every ping, scrape or loud engine run is
   heard by what lives down there: a huge stalker, lurkers waiting in tunnels, swarms of small things. Recover three parts,
   reach the hatch, upgrade the sub with salvage and go deeper. Logs left by the lost crew of the Halcyon tell the story. */
const GAME = {
  id: 'deep-signal', title: 'Deep Signal', tagline: 'Every ping shows you the way. It also shows you to it.',
  font: 'Share Tech Mono', accent: '#39ff9c', accent2: '#ff4a4a', bg: '#030807', noSkins: true, noHud: true, scoreLabel: 'Score',
  how: ['Steer with WASD or the arrows (hold Shift for full speed, which is loud), or hold the screen where you want to go.', 'Space or PING lights up the cave for a moment. It hears every ping.', 'Q listens for beacons and movement. F drops a flare that drives it off. E fires a decoy.', 'Recover 3 parts, reach the hatch, upgrade the sub and go deeper. Headphones on.'],
  skins: [{ name: 'Sub', price: 0 }],
};
(() => {
  const C = 32, GW = 84, GH = 60, Z = .74, SX = 640, SY = 362, SR = 318, TAU = Math.PI * 2, RAYS = 360, SP = 19, NSEG = 26;
  const G1 = '57,255,156', FONT = s => s + 'px "Share Tech Mono", monospace';
  const N4 = [1, -1, GW, -GW], N8 = [1, -1, GW, -GW, GW + 1, GW - 1, -GW + 1, -GW - 1];
  const MS = [null, [3, 2], [2, 1], [3, 1], [0, 1], [3, 0, 2, 1], [0, 2], [3, 0], [3, 0], [0, 2], [0, 1, 3, 2], [0, 1], [3, 1], [2, 1], [3, 2], null];
  const UPS = [
    { k: 'hull', n: 'HULL PLATING', d: '+25 max hull', c: [6, 14, 26] },
    { k: 'o2', n: 'O2 SCRUBBER', d: '+45 s of air', c: [6, 14, 26] },
    { k: 'sonar', n: 'SONAR ARRAY', d: 'Longer range, faster charge', c: [8, 18, 30] },
    { k: 'quiet', n: 'SILENT PROPS', d: 'Engine 20% quieter', c: [8, 18, 30] },
    { k: 'decoy', n: 'DECOY RACK', d: '+1 decoy each dive', c: [6, 14, 26] },
    { k: 'flare', n: 'FLARE RACK', d: '+1 flare each dive', c: [6, 14, 26] },
  ];
  const LOGS = [
    'Halcyon log, day 1. Cave mouth at three hundred meters. Sonar is clean. Okafor says the water tastes of iron. Captain Varga out.',
    'Day 3. Found the first cluster of pods. Warm right through the hull. Okafor wants a sample. I said no.',
    'Day 4. Something on the passive array. Long, slow, very big. Lin says it is a current. Currents do not change direction.',
    'Day 6. We stopped pinging. Every time we ping, it comes closer. It is learning the sound.',
    'Day 7. Tomas rigged the decoys. It went straight for the first one. We heard it hit the rock a kilometer away.',
    'Day 9. Lin swears the little lights in the tunnels are fish. Standing order: nobody follows the lights.',
    'Day 11. The hatch is real. An old station, older than us. Someone built locks down here and left in a hurry.',
    'Day 12. Okafor thinks they are not hunting us. They are guarding the pods. We are the noise in their nursery.',
    'Day 14. Air for six days. We split the spare parts into cargo pods and sent them down the tunnels. If you hear this, you found one.',
    'Day 15. It sang tonight. Not a call. A song. Nobody spoke for an hour.',
    'Day 16. Tomas went dark. Engine off, riding the current. He made it past. He is waiting for us below.',
    'Day 18. Last entry. We are going deeper. If you follow us: keep quiet, keep moving, and when the screen goes red, do not stop.',
  ];
  let grid, vent, sf, wd, lit, swl, seen, lay = null, inten, panelC = null, panelKey = '', scan = null;
  let sub, cam, pings, items, hatch, logs, eggs, rocks, currents, stalkers, lurkers, mites, decoys, flares, ghosts, fxp, silt, bear, avoid;
  let level, o2, o2max, hull, hullMax, dead, deathT, deathHow, win, keys = {}, hold, msg, msgT, got, levelT, sweep, noiseR, evR, listen, station, logView;
  let tools, scare, scareSeen, callT, creakT, beatT, nearD, distort, hint, hintT, hintDone, pingCharge, lastPing, press, boosting, alarmT, hurtT, runLogs, dives;
  const sv = () => K.save, up = k => (K.save.up && K.save.up[k]) || 0;
  const ang = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  const cellAt = (x, y) => (x < 0 || y < 0 || x >= GW || y >= GH) ? 1 : grid[y * GW + x];
  const S = (x, y) => (x < 0 || y < 0 || x >= GW || y >= GH) ? 1 : sf[y * GW + x];
  const idx = (px, py) => K.clamp(Math.floor(py / C), 0, GH - 1) * GW + K.clamp(Math.floor(px / C), 0, GW - 1);
  const ctr = i => [(i % GW) * C + C / 2, ((i / GW) | 0) * C + C / 2];
  const depthM = () => 300 + level * 250;
  function fieldAt(px, py) {
    const gx = px / C - .5, gy = py / C - .5, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
    return (S(ix, iy) * (1 - fx) + S(ix + 1, iy) * fx) * (1 - fy) + (S(ix, iy + 1) * (1 - fx) + S(ix + 1, iy + 1) * fx) * fy;
  }
  const passable = k => k >= 0 && k < GW * GH && !grid[k] && sf[k] < .45;
  const stalkerOk = k => k >= 0 && k < GW * GH && !grid[k] && !vent[k];
  function bfsFrom(start, ok, any) {
    const d = new Int32Array(GW * GH).fill(-1), q = [start]; d[start] = 0;
    for (let h = 0; h < q.length; h++) { const j = q[h]; for (const o of N4) { const k = j + o; if (k >= 0 && k < GW * GH && d[k] < 0 && ok(k)) { d[k] = d[j] + 1; q.push(k); } } }
    return d;
  }
  function clearLine(x0, y0, x1, y1, m = .32) {
    const n = Math.ceil(K.dist(x0, y0, x1, y1) / 10);
    for (let i = 1; i <= n; i++) if (fieldAt(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n) > m) return false;
    return true;
  }

  /* ---------- cave generation ---------- */
  function cave() {
    for (let tries = 0; tries < 40; tries++) {
      grid = new Uint8Array(GW * GH);
      for (let i = 0; i < GW * GH; i++) { const x = i % GW, y = (i / GW) | 0; grid[i] = x < 2 || y < 2 || x >= GW - 2 || y >= GH - 2 || Math.random() < .465 ? 1 : 0; }
      for (let it = 0; it < 5; it++) { const n = grid.slice(); for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) { let c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) c += grid[(y + dy) * GW + x + dx]; n[y * GW + x] = c >= 5 ? 1 : 0; } grid = n; }
      const reg = new Int32Array(GW * GH).fill(-1); let best = -1, bestN = 0, id = 0;
      for (let i = 0; i < GW * GH; i++) if (!grid[i] && reg[i] < 0) { let n = 0; const st = [i]; reg[i] = id; while (st.length) { const j = st.pop(); n++; for (const d of N4) { const k = j + d; if (!grid[k] && reg[k] < 0) { reg[k] = id; st.push(k); } } } if (n > bestN) { bestN = n; best = id; } id++; }
      for (let i = 0; i < GW * GH; i++) if (!grid[i] && reg[i] !== best) grid[i] = 1;
      if (bestN > GW * GH * .36) break;
    }
    // narrow vents: short two-wide tunnels cut through rock as shortcuts. The stalker is too big to follow you in.
    vent = new Uint8Array(GW * GH); let made = 0;
    for (let k = 0; k < 600 && made < 5; k++) {
      const x = K.irand(3, GW - 4), y = K.irand(3, GH - 4); if (grid[y * GW + x]) continue;
      const [dx, dy] = K.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]), px = dy ? 1 : 0, py = dx ? 1 : 0;
      let x0 = x, y0 = y; while (!cellAt(x0 + dx, y0 + dy)) { x0 += dx; y0 += dy; }
      let len = 0, x1 = x0 + dx, y1 = y0 + dy; while (cellAt(x1, y1) && len < 9) { x1 += dx; y1 += dy; len++; }
      if (len < 3 || len > 8 || x1 < 3 || y1 < 3 || x1 >= GW - 3 || y1 >= GH - 3 || cellAt(x1, y1) || cellAt(x1 + px, y1 + py) || cellAt(x0 + px, y0 + py)) continue;
      const d = bfsFrom(y0 * GW + x0, k => !grid[k]); if (d[y1 * GW + x1] >= 0 && d[y1 * GW + x1] < 24) continue;
      for (let j = 1; j <= len; j++) for (const o of [0, 1]) { const cx = x0 + dx * j + px * o, cy = y0 + dy * j + py * o; if (cx > 1 && cy > 1 && cx < GW - 2 && cy < GH - 2 && grid[cy * GW + cx]) { grid[cy * GW + cx] = 0; vent[cy * GW + cx] = 1; } }
      made++;
    }
    // smoothed field (for contours and smooth collision), wall distance, marching-squares segments
    sf = new Float32Array(GW * GH);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += (dx || dy ? (dx && dy ? 1 : 2) : 4) * cellAt(x + dx, y + dy); sf[y * GW + x] = s / 16; }
    wd = new Int32Array(GW * GH).fill(-1); const q = [];
    for (let i = 0; i < GW * GH; i++) if (grid[i]) { wd[i] = 0; q.push(i); }
    for (let h = 0; h < q.length; h++) { const j = q[h]; for (const o of N4) { const k = j + o; if (k >= 0 && k < GW * GH && wd[k] < 0) { wd[k] = wd[j] + 1; q.push(k); } } }
    // two iso levels: the bright wall contour and a dimmer inner line, like a depth chart
    lay = [.5, .82].map(lv => {
      const tmp = [], fr = (u, v) => (lv - u) / (v - u), s0 = new Int32Array(GW * GH), sn = new Uint8Array(GW * GH);
      for (let y = 0; y < GH - 1; y++) for (let x = 0; x < GW - 1; x++) {
        const a = S(x, y), b = S(x + 1, y), c = S(x + 1, y + 1), d = S(x, y + 1), i = y * GW + x;
        const e = MS[(a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (d > lv ? 1 : 0)]; s0[i] = tmp.length / 4; if (!e) continue;
        const X = (x + .5) * C, Y = (y + .5) * C;
        const P = k => k === 0 ? [X + C * fr(a, b), Y] : k === 1 ? [X + C, Y + C * fr(b, c)] : k === 2 ? [X + C * fr(d, c), Y + C] : [X, Y + C * fr(a, d)];
        for (let j = 0; j < e.length; j += 2) { const p = P(e[j]), r = P(e[j + 1]); tmp.push(p[0], p[1], r[0], r[1]); sn[i]++; }
      }
      return { segs: new Float32Array(tmp), s0, sn };
    });
  }

  function longestRay(x, y) {
    let best = 0, bl = 0;
    for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; let d = 0; while (d < 600 && fieldAt(x + Math.cos(a) * d, y + Math.sin(a) * d) < .5) d += 12; if (d > bl) { bl = d; best = a; } }
    return best;
  }
  function makeStalker(i, n) {
    const [x, y] = ctr(i), s = { x, y, a: Math.random() * TAU, tx: x, ty: y, mode: 'roam', field: null, fieldFor: -1, fieldT: 0, wp: null, t: Math.random() * 9, lastHeard: -99, rage: 0, fleeT: 0, sniffT: 0, id: n, seg: [] };
    s.roam = 52 + level * 5; s.seek = 92 + level * 6; s.hunt = Math.min(205, 132 + level * 8);
    for (let j = 0; j < NSEG; j++) s.seg.push({ x, y, r: j < 4 ? 25 + j * 3 : 6 + 31 * Math.pow(1 - (j - 4) / (NSEG - 4), .85) });
    return s;
  }
  function buildLevel() {
    cave();
    lit = new Float32Array(GW * GH).fill(-99); swl = new Float32Array(GW * GH).fill(-99); seen = new Uint8Array(GW * GH); inten = new Float32Array(GW * GH);
    const roomy = []; for (let i = 0; i < GW * GH; i++) if (passable(i) && wd[i] >= 2) roomy.push(i);
    const sa = Math.random() * TAU, ux = Math.cos(sa), uy = Math.sin(sa); let start = roomy[0], sb = 1e9;
    for (const i of roomy) { const v = (i % GW) * ux + ((i / GW) | 0) * uy * 1.4; if (v < sb) { sb = v; start = i; } }
    const d = bfsFrom(start, passable), far = roomy.filter(i => d[i] > 0).sort((a, b) => d[b] - d[a]);
    const [sx, sy] = ctr(start);
    const pick = (lo, hi, ok) => { const pool = far.slice(Math.floor(far.length * lo), Math.floor(far.length * hi)); for (let t = 0; t < 300 && pool.length; t++) { const i = pool[K.irand(0, pool.length - 1)], [x, y] = ctr(i); if (ok(x, y, i)) return [x, y, i]; } return null; };
    hatch = { x: 0, y: 0, seenT: -99, mem: 0 }; [hatch.x, hatch.y] = ctr(far[0]);
    const placed = [[sx, sy], [hatch.x, hatch.y]], away = (x, y, r) => placed.every(p => K.dist(p[0], p[1], x, y) > r);
    items = [];
    for (let n = 0; n < 3; n++) { const p = pick(.04, .8, (x, y) => away(x, y, 430)) || pick(0, 1, (x, y) => away(x, y, 200)); if (p) { items.push({ x: p[0], y: p[1], got: false, seenT: -99, mem: 0 }); placed.push(p); } }
    while (items.length < 3) { const [x, y] = ctr(far[K.irand(0, far.length - 1)]); items.push({ x, y, got: false, seenT: -99, mem: 0 }); }
    logs = [];
    for (let n = 0; n < (level >= 4 ? 2 : 1); n++) { const p = pick(.05, .9, (x, y) => away(x, y, 330)); if (p) { logs.push({ x: p[0], y: p[1], got: false, seenT: -99, mem: 0 }); placed.push(p); } }
    // features
    currents = [];
    for (let n = 0; n < 3 + Math.min(3, level >> 1); n++) { const p = pick(.1, .95, (x, y, i) => wd[i] >= 2 && currents.every(c => K.dist(c.x, c.y, x, y) > 420)); if (p) { const a = longestRay(p[0], p[1]); currents.push({ x: p[0], y: p[1], r: K.rand(130, 190), dx: Math.cos(a), dy: Math.sin(a), s: K.rand(38, 58) }); } }
    eggs = []; const need = [...items, hatch, ...logs];
    for (let n = 0; n < (level >= 5 ? 3 : level >= 3 ? 2 : level >= 2 ? 1 : 0); n++) {
      const p = pick(.05, .85, (x, y, i) => wd[i] >= 2 && away(x, y, 280)); if (!p) continue;
      const pods = []; for (let t = 0; t < 30 && pods.length < 7; t++) { const a = Math.random() * TAU, r = Math.random() * 46, x = p[0] + Math.cos(a) * r, y = p[1] + Math.sin(a) * r; if (fieldAt(x, y) < .25 && pods.every(o => K.dist(o.x, o.y, x, y) > 18)) pods.push({ x, y, r: K.rand(8, 13), ph: Math.random() * 6 }); }
      const blocked = new Uint8Array(GW * GH); for (let i = 0; i < GW * GH; i++) { const [x, y] = ctr(i); if (K.dist(x, y, p[0], p[1]) < 90) blocked[i] = 1; }
      const dd = bfsFrom(start, k => passable(k) && !blocked[k]);
      if (pods.length >= 4 && need.every(o => dd[idx(o.x, o.y)] >= 0)) { eggs.push({ x: p[0], y: p[1], pods, angry: 0, seenT: -99, mem: 0 }); placed.push(p); }
    }
    rocks = [];
    if (level >= 2) for (let n = 0; n < Math.min(6, 1 + level); n++) {
      const p = pick(.05, .95, (x, y, i) => wd[i] === 2 && away(x, y, 200) && rocks.every(r => K.dist(r.ox, r.oy, x, y) > 300)); if (!p) continue;
      let wx = p[0], wy = p[1]; for (let a = 0; a < TAU; a += TAU / 16) { let r = 0; while (r < 120 && fieldAt(p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r) < .5) r += 4; if (r < 120 && (wx === p[0] || r < K.dist(wx, wy, p[0], p[1]))) { wx = p[0] + Math.cos(a) * r; wy = p[1] + Math.sin(a) * r; } }
      rocks.push({ x: wx, y: wy, ox: p[0], oy: p[1], fall: 0, done: false, seenT: -99, mem: 0 });
    }
    // creatures
    const ds = bfsFrom(start, stalkerOk), sfar = far.filter(i => ds[i] > 0 && stalkerOk(i)).sort((a, b) => ds[b] - ds[a]);
    stalkers = []; for (let n = 0; n < (level >= 7 ? 2 : 1); n++) { const i = sfar[Math.floor(sfar.length * (.1 + n * .3))] || far[0]; stalkers.push(makeStalker(i, n)); }
    lurkers = [];
    for (let n = 0; n < (level >= 2 ? Math.min(4, level - 1) : 0); n++) {
      const p = pick(.05, 1, (x, y, i) => wd[i] === 2 && away(x, y, 240) && K.dist(x, y, sx, sy) > 520 && lurkers.every(l => K.dist(l.hx, l.hy, x, y) > 420)); if (!p) continue;
      const a = longestRay(p[0], p[1]), hx = p[0] - Math.cos(a) * 26, hy = p[1] - Math.sin(a) * 26;
      lurkers.push({ hx, hy, x: hx, y: hy, a, st: 'sleep', t: 0, cd: 0, seenT: -99, ph: Math.random() * 6 });
    }
    mites = [];
    for (let n = 0; n < (level >= 6 ? 2 : level >= 3 ? 1 : 0); n++) {
      const p = pick(.2, .9, (x, y) => K.dist(x, y, sx, sy) > 700); if (!p) continue;
      for (let j = 0; j < 5 + Math.min(5, level - 3); j++) mites.push({ x: p[0] + K.rand(-30, 30), y: p[1] + K.rand(-30, 30), vx: 0, vy: 0, nx: p[0], ny: p[1], tx: p[0], ty: p[1], chase: 0, bite: 0, seenT: -99, sx: 0, sy: 0 });
    }
    avoid = new Uint8Array(GW * GH);
    for (let i = 0; i < GW * GH; i++) { const [x, y] = ctr(i); if (eggs.some(e => K.dist(e.x, e.y, x, y) < 110) || lurkers.some(l => K.dist(l.hx, l.hy, x, y) < 150)) avoid[i] = 1; }
    sub = { x: sx, y: sy, vx: 0, vy: 0, a: longestRay(sx, sy), thr: 0, scrapeT: 0 };
    cam = { x: sx, y: sy }; pings = []; decoys = []; flares = []; ghosts = []; fxp = []; bear = []; silt = [];
    for (let n = 0; n < 70; n++) silt.push({ x: sx + K.rand(-480, 480), y: sy + K.rand(-480, 480), z: K.rand(.4, 1), s: K.rand(1, 2.6) });
    hullMax = 100 + up('hull') * 25; o2max = 200 + up('o2') * 45 + level * 8; o2 = o2max; hull = Math.min(hull, hullMax);
    tools = { decoy: 1 + up('decoy'), flare: 1 + up('flare') };
    got = 0; levelT = 0; pingCharge = 1; lastPing = -9; listen = false; noiseR = 0; evR = 0; callT = K.rand(8, 14); creakT = 5; beatT = 0; scare = 0; scareSeen = false; nearD = 1e9; distort = 0; alarmT = 0; hurtT = 0;
    // let the creatures settle into the cave so the stalker's body is uncoiled
    for (let n = 0; n < 160; n++) for (const s of stalkers) stalkerStep(s, 1 / 20, true);
    show(`DIVE ${level}  ·  ${depthM()} m  ·  recover 3 parts`, 4);
  }

  /* ---------- progression ---------- */
  const totalSalvage = () => sv().coins + K.runCoins;
  const cost = u => u.c[up(u.k)];
  const cheapest = () => Math.min(...UPS.map(u => cost(u) ?? 1e9));
  function spend(n) { const r = Math.min(n, K.runCoins); K.runCoins -= r; sv().coins -= n - r; K.persist(); }
  function openStation(first) { station = { t: 0, first, note: first ? 'Spend salvage from earlier dives before you go down.' : `Hatch sealed. Hull patched +30.`, flash: -1, fT: 0 }; hold = null; listen = false; keys = {}; }
  function buy(i) {
    const u = UPS[i], c = cost(u); if (!station || !u) return;
    if (c === undefined) { station.flash = i; station.fT = .5; tone(200, .15, 'square', .05); return; }
    if (totalSalvage() < c) { station.flash = i; station.fT = .5; tone(150, .2, 'sawtooth', .06); return; }
    spend(c); sv().up[u.k] = up(u.k) + 1; K.persist();
    if (u.k === 'hull') { hullMax += 25; hull += 25; } else if (u.k === 'o2') { o2max += 45; o2 += 45; } else if (u.k === 'decoy') tools.decoy++; else if (u.k === 'flare') tools.flare++;
    tone(523, .2, 'triangle', .1); tone(784, .3, 'triangle', .09, 0, .08); tone(1046, .45, 'sine', .07, 0, .16);
  }
  function dive() { if (!station) return; station = null; levelT = 0; show(`DIVE ${level}  ·  ${depthM()} m  ·  recover 3 parts`, 4); tone(90, 2, 'sine', .2, -40, 0, 0, .5); hiss(1.6, .2, 'lowpass', 300, 0, 0, .5); }
  GAME.reset = () => {
    const s = sv(); s.up = Object.assign({ hull: 0, o2: 0, sonar: 0, quiet: 0, decoy: 0, flare: 0 }, s.up || {}); s.logs = s.logs || []; s.deep = s.deep || 0; s.dives = s.dives || 0;
    level = 1; hull = 999; dead = false; deathT = 0; deathHow = ''; win = 0; keys = {}; hold = null; msg = ''; msgT = 0; station = null; logView = null; press = {};
    hint = ''; hintT = 0; hintDone = {}; runLogs = 0; dives = 0; boosting = false; sweep = 0;
    buildLevel(); hull = hullMax;
    if (!K.bot && cheapest() <= totalSalvage()) openStation(true);
  };
  const show = (t, d = 3.5) => { msg = t; msgT = d; };

  /* ---------- sound ---------- */
  let A = null;
  const live = () => !K.bot && !K.save.mute && K.ac && au();
  function au() {
    if (A) return A; const ac = K.ac; if (!ac || !ac.createConvolver) return null;
    const bus = ac.createGain(); bus.connect(K.master);
    const rv = ac.createConvolver(), len = ac.sampleRate * 3.4 | 0, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4); }
    rv.buffer = ir; const rg = ac.createGain(); rg.gain.value = .5; rv.connect(rg).connect(K.master);
    const mk = (n, f) => { const b = ac.createBuffer(1, ac.sampleRate * n | 0, ac.sampleRate), d = b.getChannelData(0); f(d); return b; };
    const bn = mk(4, d => { let b = 0; for (let i = 0; i < d.length; i++) { b = (b + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = b * 3.2; } });
    const wn = mk(2, d => { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; });
    const loop = (buf, type, f, v) => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = ac.createGain(); g.gain.value = v; s.connect(fl).connect(g).connect(bus); s.start(); return [g, fl]; };
    const [amb, alp] = loop(bn, 'lowpass', 240, 0);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = .05; lg.gain.value = 110; lfo.connect(lg).connect(alp.frequency); lfo.start();
    const drone = ac.createGain(); drone.gain.value = 0; const dl = ac.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 170; dl.connect(drone).connect(bus);
    const ds = ac.createGain(); ds.gain.value = .25; drone.connect(ds).connect(rv);
    for (const [f, v, t] of [[41.2, .45, 'sine'], [41.9, .45, 'sine'], [61.8, .16, 'triangle'], [82.6, .07, 'sawtooth'], [55.1, .1, 'sine']]) { const o = ac.createOscillator(), g = ac.createGain(); o.type = t; o.frequency.value = f; g.gain.value = v; o.connect(g).connect(dl); o.start(); }
    const eng = ac.createOscillator(); eng.type = 'sawtooth'; eng.frequency.value = 38; const ef = ac.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 200; const eg = ac.createGain(); eg.gain.value = 0; eng.connect(ef).connect(eg).connect(bus); eng.start();
    const wh = ac.createOscillator(); wh.type = 'triangle'; wh.frequency.value = 380; const wg = ac.createGain(); wg.gain.value = 0; wh.connect(wg).connect(bus); wh.start();
    const [hg] = loop(wn, 'highpass', 2600, 0);
    A = { ac, bus, rv, amb, drone, eng, ef, eg, wh, wg, hg, wn };
    return A;
  }
  function out(a, n, pan, wet) {
    let o = n; if (pan && a.ac.createStereoPanner) { const p = a.ac.createStereoPanner(); p.pan.value = K.clamp(pan, -1, 1); o = n.connect(p); }
    o.connect(a.bus); if (wet) { const s = a.ac.createGain(); s.gain.value = wet; o.connect(s).connect(a.rv); }
  }
  function tone(f, d, type = 'sine', v = .1, slide = 0, delay = 0, pan = 0, wet = .25, vib = 0) {
    const a = live(); if (!a) return; const ac = a.ac, t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
    if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 5.5; lg.gain.value = vib; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + d + .05); }
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + Math.min(.03, d / 4)); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    out(a, o.connect(g), pan, wet); o.start(t); o.stop(t + d + .05);
  }
  function hiss(d, v, type = 'bandpass', f = 800, delay = 0, pan = 0, wet = .2, q = 1) {
    const a = live(); if (!a) return; const ac = a.ac, t = ac.currentTime + delay, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = a.wn; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    out(a, s.connect(fl).connect(g), pan, wet); s.start(t, Math.random()); s.stop(t + d + .05);
  }
  function moan(dist, pan) {
    const a = live(); if (!a) return; const ac = a.ac, t = ac.currentTime, v = K.clamp(.32 - dist / 6000, .05, .3), f = K.rand(62, 84), d = K.rand(2.6, 3.8);
    for (const [m, w] of [[1, 1], [1.06, .6], [2.01, .25]]) {
      const o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f * m, t); o.frequency.linearRampToValueAtTime(f * m * 1.25, t + d * .35); o.frequency.exponentialRampToValueAtTime(f * m * .7, t + d);
      l.frequency.value = 3.2; lg.gain.value = 2.5 * m; l.connect(lg).connect(o.frequency);
      fl.type = 'lowpass'; fl.frequency.setValueAtTime(220, t); fl.frequency.linearRampToValueAtTime(700 - dist / 6, t + d * .4); fl.frequency.linearRampToValueAtTime(180, t + d);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v * w, t + .7); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      out(a, o.connect(fl).connect(g), pan, .8); o.start(t); l.start(t); o.stop(t + d + .1); l.stop(t + d + .1);
    }
  }
  function creak() {
    const a = live(); if (!a) return; const ac = a.ac, t = ac.currentTime, d = K.rand(.7, 1.6), o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain(), f = K.rand(70, 140);
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * K.rand(.7, 1.4), t + d);
    fl.type = 'bandpass'; fl.frequency.value = K.rand(300, 700); fl.Q.value = 7;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.09, t + d * .3); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    out(a, o.connect(fl).connect(g), K.rand(-.6, .6), .5); o.start(t); o.stop(t + d + .05);
  }
  const panOf = (x, y) => K.clamp((x - sub.x) / 500, -1, 1);
  function pingSnd() { tone(1180, 1.7, 'sine', .22, -30, 0, 0, .8); tone(2360, .3, 'sine', .05, 0, 0, 0, .4); hiss(.06, .08, 'highpass', 3000); }
  function scareSnd() { hiss(1.5, .6, 'bandpass', 1100, 0, 0, .6, .6); tone(170, 1.3, 'sawtooth', .28, 760, 0, 0, .5); tone(181, 1.3, 'sawtooth', .26, 690, 0, 0, .5); tone(88, 1.8, 'square', .22, -45, 0, 0, .4); tone(2600, .7, 'sine', .07, -1700, .05, 0, .4); }
  function heartbeat(v) { tone(58, .16, 'sine', .34 * v, -12, 0, 0, 0); tone(50, .2, 'sine', .27 * v, -10, .17, 0, 0); }

  /* ---------- input ---------- */
  const BT = { ping: { x: 1129, y: 262, r: 84 }, decoy: { x: 1000, y: 360, w: 124, h: 100 }, flare: { x: 1134, y: 360, w: 124, h: 100 }, listen: { x: 1000, y: 474, w: 258, h: 80 } };
  const inB = (b, x, y) => b.r ? K.dist(x, y, b.x, b.y) < b.r : x >= b.x && y >= b.y && x <= b.x + b.w && y <= b.y + b.h;
  GAME.down = (x, y, e) => {
    if (station) return stationClick(x, y);
    if (dead || win) return;
    for (const k of ['ping', 'decoy', 'flare', 'listen']) if (inB(BT[k], x, y)) { use(k); return; }
    hold = { x, y, id: e && e.pointerId };
  };
  GAME.move = (x, y, e) => { if (hold && (!e || e.pointerId === hold.id) && (!e || e.buttons || e.pointerType === 'touch')) { hold.x = x; hold.y = y; } };
  GAME.up = (x, y, e) => { if (hold && (!e || e.pointerId === hold.id)) hold = null; };
  GAME.key = (c, d) => {
    keys[c] = d; if (!d) return;
    if (station) { if (/^Digit[1-6]$/.test(c)) buy(+c[5] - 1); else if (c === 'Space' || c === 'Enter') dive(); return; }
    if (c === 'Space') use('ping'); else if (c === 'KeyE') use('decoy'); else if (c === 'KeyF') use('flare'); else if (c === 'KeyQ' || c === 'KeyL') use('listen');
  };
  const pingRange = () => 520 * (1 + .15 * up('sonar')), pingCd = () => 2.1 - .3 * up('sonar'), pingNoise = () => 950 + level * 60;
  function setListen(on) { if (listen === on) return; listen = on; tone(on ? 330 : 520, .14, 'sine', .08, on ? -120 : 200); hiss(.12, .06, 'highpass', 2500); }
  function use(k) {
    if (dead || win || station) return; press[k] = K.t;
    if (k === 'ping') {
      if (pingCharge < 1) { tone(180, .1, 'square', .04); return; }
      pingCharge = 0; lastPing = K.t; setListen(false); const rays = newPing(sub.x, sub.y, pingRange(), 'sub'); pingSnd();
      const hits = []; for (let j = 0; j < RAYS; j += 6) if (rays[j] < pingRange()) hits.push([rays[j], j / RAYS * TAU]);
      hits.sort((a, b) => a[0] - b[0]);
      for (const n of [0, hits.length >> 2, hits.length >> 1]) if (hits[n]) { const [d, a] = hits[n]; tone(1180, .55, 'sine', .1 * (1 - d / 700), -25, d / 860 + .04, Math.cos(a) * .8, .9); }
      emit(sub.x, sub.y, pingNoise(), 'ping'); hintDone.ping = 1;
    } else if (k === 'decoy') {
      if (!tools.decoy) { show('No decoys left', 1.5); tone(160, .15, 'square', .05); return; }
      tools.decoy--; const a = aim(); decoys.push({ x: sub.x + Math.cos(a) * 24, y: sub.y + Math.sin(a) * 24, vx: Math.cos(a) * 330 + sub.vx, vy: Math.sin(a) * 330 + sub.vy, t: 0, n: 0 });
      tone(320, .3, 'square', .06, -170); hiss(.35, .15, 'bandpass', 600); emit(sub.x, sub.y, 200, 'launch'); hintDone.tools = 1;
    } else if (k === 'flare') {
      if (!tools.flare) { show('No flares left', 1.5); tone(160, .15, 'square', .05); return; }
      tools.flare--; const a = aim(); flares.push({ x: sub.x + Math.cos(a) * 20, y: sub.y + Math.sin(a) * 20, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, t: 0, life: 7.5 });
      hiss(1.4, .22, 'highpass', 1800, 0, 0, .3); tone(900, .25, 'triangle', .08, -500); emit(sub.x, sub.y, 240, 'launch'); hintDone.tools = 1;
    } else if (k === 'listen') setListen(!listen);
  }
  function aim() { if (hold) return Math.atan2(hold.y - SY, hold.x - SX); return sub.a; }
  function newPing(x, y, range, kind) {
    const rays = new Float32Array(RAYS);
    for (let k = 0; k < RAYS; k++) { const a = k / RAYS * TAU, ca = Math.cos(a), sa = Math.sin(a); let d = 6; while (d < range && !cellAt(Math.floor((x + ca * d) / C), Math.floor((y + sa * d) / C))) d += 8; rays[k] = d; }
    pings.push({ x, y, r: 0, range, rays, kind, hit: new Set(), t: K.t });
    return rays;
  }
  const rayAt = (p, a) => p.rays[((Math.round(a / TAU * RAYS) % RAYS) + RAYS) % RAYS];
  const hearMul = () => (K.bot ? .7 : 1) * (1 + .05 * (level - 1));
  function hear(s, x, y, r, kind) {
    const d = K.dist(s.x, s.y, x, y); if (d > r * hearMul() || s.mode === 'flee') return;
    const fromSub = kind !== 'decoy' && kind !== 'rock';
    s.tx = x; s.ty = y; s.fieldFor = -1; s.wp = null; if (fromSub) s.lastHeard = K.t;
    if (kind === 'egg' || (fromSub && d < 360)) s.mode = 'hunt';
    else if (!fromSub || s.mode !== 'hunt') s.mode = 'seek';
  }
  function emit(x, y, r, kind) {
    if (kind !== 'decoy' && kind !== 'rock') evR = Math.max(evR, r);
    for (const s of stalkers) hear(s, x, y, r, kind);
    for (const m of mites) if (r > 150 && K.dist(m.x, m.y, x, y) < r * 1.1) { m.tx = x; m.ty = y; m.chase = 5; }
    for (const l of lurkers) if (l.st === 'sleep' && K.dist(l.hx, l.hy, x, y) < Math.min(r, 150) && kind !== 'rock') l.cd = 0;
    if (kind !== 'engine' && kind !== 'launch') for (const rk of rocks) if (!rk.fall && !rk.done && K.dist(rk.x, rk.y, x, y) < Math.min(r, 240)) { rk.fall = .001; tone(40, 1.2, 'sine', .3, -8, 0, panOf(rk.x, rk.y), .5); hiss(1, .25, 'lowpass', 160, 0, panOf(rk.x, rk.y), .5); }
  }

  /* ---------- creatures ---------- */
  const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  function pickCell(near, r, ok) {
    for (let t = 0; t < 80; t++) { const i = near ? idx(near[0] + K.rand(-r, r) * C, near[1] + K.rand(-r, r) * C) : K.irand(0, GW * GH - 1); if (ok(i) && wd[i] >= 2) return ctr(i); }
    return null;
  }
  function stalkerStep(s, dt, silent) {
    s.t += dt; s.fieldT -= dt; s.rage = Math.max(0, s.rage - dt);
    if (s.mode === 'hunt' && K.t - s.lastHeard > 3.2) s.mode = 'seek';
    if (s.mode === 'flee' && (s.fleeT -= dt) <= 0) { s.mode = 'roam'; s.tx = s.x; s.ty = s.y; }
    const ci = idx(s.x, s.y), atT = K.dist(s.x, s.y, s.tx, s.ty) < 40 || (s.field && s.fieldFor === idx(s.tx, s.ty) && s.field[ci] === 0);
    if (s.mode === 'seek' && atT) { s.mode = 'sniff'; s.sniffT = K.rand(3, 6); }
    if (s.mode === 'sniff') { s.sniffT -= dt; if (s.sniffT <= 0) s.mode = 'roam'; else if (atT) { const p = pickCell([s.x, s.y], 6, stalkerOk); if (p) { [s.tx, s.ty] = p; } } }
    if (s.mode === 'roam' && atT) { const p = pickCell(null, 0, stalkerOk); if (p) [s.tx, s.ty] = p; }
    if (!silent && !dead && s.mode !== 'flee' && K.dist(s.x, s.y, sub.x, sub.y) < (listen ? 95 : 145) && !vent[idx(sub.x, sub.y)]) { s.mode = 'hunt'; s.lastHeard = K.t; s.tx = sub.x; s.ty = sub.y; }
    const tc = idx(s.tx, s.ty);
    if ((s.fieldFor !== tc || !s.field) && s.fieldT <= 0) { s.field = bfsFrom(tc, stalkerOk); s.fieldFor = tc; s.fieldT = .35; s.wp = null; }
    if (!s.wp || K.dist(s.x, s.y, s.wp[0], s.wp[1]) < 10) {
      let nb = -1, nd = s.field && s.field[ci] >= 0 ? s.field[ci] : 1e9;
      if (s.field) for (const [dx, dy] of D8) { const k = ci + dy * GW + dx; if (!stalkerOk(k) || s.field[k] < 0 || s.field[k] >= nd) continue; if (dx && dy && (!stalkerOk(ci + dx) || !stalkerOk(ci + dy * GW))) continue; nd = s.field[k]; nb = k; }
      if (nb >= 0) { const [gx, gy] = ctr(nb); s.wp = [gx + K.rand(-5, 5), gy + K.rand(-5, 5)]; } else s.wp = [s.tx, s.ty];
    }
    const spd = (s.mode === 'hunt' ? s.hunt : s.mode === 'seek' ? s.seek : s.mode === 'flee' ? s.hunt * 1.05 : s.mode === 'sniff' ? s.roam * .8 : s.roam) * (s.rage > 0 ? 1.3 : 1) * (K.bot ? .85 : 1);
    const want = Math.atan2(s.wp[1] - s.y, s.wp[0] - s.x) + Math.sin(s.t * 2.4) * .5;
    s.a += K.clamp(ang(want - s.a), -4.2 * dt, 4.2 * dt);
    const nx = s.x + Math.cos(s.a) * spd * dt, ny = s.y + Math.sin(s.a) * spd * dt;
    if (stalkerOk(idx(nx, ny))) { s.x = nx; s.y = ny; } else { s.wp = null; const [cx, cy] = ctr(ci); s.x += (cx - s.x) * Math.min(1, dt * 4); s.y += (cy - s.y) * Math.min(1, dt * 4); }
    s.seg[0].x = s.x; s.seg[0].y = s.y;
    for (let j = 1; j < NSEG; j++) { const p = s.seg[j - 1], q = s.seg[j], dx = q.x - p.x, dy = q.y - p.y, dd = Math.hypot(dx, dy) || 1; if (dd > SP) { q.x = p.x + dx / dd * SP; q.y = p.y + dy / dd * SP; } }
  }
  function flee(s, fx, fy) {
    if (s.mode === 'flee') return; s.mode = 'flee'; s.fleeT = 4.5; s.fieldFor = -1; s.fieldT = 0; s.wp = null;
    let best = null, bd = -1; for (let t = 0; t < 24; t++) { const p = pickCell(null, 0, stalkerOk); if (p && K.dist(p[0], p[1], fx, fy) > bd) { bd = K.dist(p[0], p[1], fx, fy); best = p; } }
    if (best) [s.tx, s.ty] = best;
    tone(900, 1.1, 'sawtooth', .12, 900, 0, panOf(s.x, s.y), .8, 40); tone(620, 1.2, 'sawtooth', .1, 500, .05, panOf(s.x, s.y), .8, 30);
    if (!K.bot && !hintDone.fled) { hintDone.fled = 1; show('It recoils from the light.', 2.5); }
  }
  function lurkerStep(l, dt) {
    l.t += dt; l.cd -= dt; const d = K.dist(l.x, l.y, sub.x, sub.y);
    if (l.st === 'sleep') {
      l.x += (l.hx - l.x) * Math.min(1, dt * 2); l.y += (l.hy - l.y) * Math.min(1, dt * 2);
      if (d < 150 && l.cd <= 0 && !dead) { l.st = 'lunge'; l.t = 0; l.seenT = K.t; tone(70, 1, 'sawtooth', .25, 50, 0, panOf(l.x, l.y), .5); tone(74, 1, 'sawtooth', .2, 60, 0, panOf(l.x, l.y), .5); }
    } else if (l.st === 'lunge') {
      const a = Math.atan2(sub.y - l.y, sub.x - l.x); l.a = a; l.x += Math.cos(a) * 430 * dt; l.y += Math.sin(a) * 430 * dt; l.seenT = K.t;
      if (d < 42) { hurt(K.bot ? 8 : 26); sub.vx += Math.cos(a) * 260; sub.vy += Math.sin(a) * 260; scare = Math.max(scare, .55); tone(95, .35, 'square', .3, -50); hiss(.2, .5, 'bandpass', 900, 0, 0, .3); show('Something bit the hull!', 2); l.st = 'back'; }
      if (l.t > .55) l.st = 'back';
    } else {
      const dd = K.dist(l.x, l.y, l.hx, l.hy) || 1; l.x += (l.hx - l.x) / dd * Math.min(dd, 130 * dt); l.y += (l.hy - l.y) / dd * Math.min(dd, 130 * dt);
      if (dd < 6) { l.st = 'sleep'; l.cd = 3.5; l.a = longestRay(l.hx + Math.cos(l.a) * 26, l.hy + Math.sin(l.a) * 26); }
    }
  }
  function miteStep(m, dt) {
    m.chase -= dt; m.bite -= dt;
    let tx = m.chase > 0 ? m.tx : m.nx + Math.cos(K.t * .9 + m.vx * .001 + m.ny) * 55, ty = m.chase > 0 ? m.ty : m.ny + Math.sin(K.t * 1.1 + m.nx) * 55, mx = m.chase > 0 ? 205 : 70;
    for (const f of flares) if (K.dist(f.x, f.y, m.x, m.y) < 250) { tx = m.x + (m.x - f.x) * 3; ty = m.y + (m.y - f.y) * 3; m.chase = 0; mx = 230; }
    const dx = tx - m.x, dy = ty - m.y, dd = Math.hypot(dx, dy) || 1;
    m.vx += (dx / dd * mx - m.vx) * Math.min(1, dt * 3) + K.rand(-1, 1) * 900 * dt; m.vy += (dy / dd * mx - m.vy) * Math.min(1, dt * 3) + K.rand(-1, 1) * 900 * dt;
    const nx = m.x + m.vx * dt, ny = m.y + m.vy * dt;
    if (fieldAt(nx, ny) > .45) { m.vx *= -.6; m.vy *= -.6; } else { m.x = nx; m.y = ny; }
    if (!dead && m.bite <= 0 && K.dist(m.x, m.y, sub.x, sub.y) < 24) { m.bite = 1.4; hurt(K.bot ? 1 : 4); m.vx = -m.vx * 2; m.vy = -m.vy * 2; hiss(.05, .25, 'highpass', 3000, 0, panOf(m.x, m.y), .1); m.seenT = K.t; }
  }
  function hurt(n) { if (dead) return; hull -= n; hurtT = .6; K.shake(Math.min(18, 4 + n * .5)); creak(); if (hull <= 0) { hull = 0; die('hull'); } }
  function die(how) {
    if (dead) return; dead = true; deathT = K.t; deathHow = how; hold = null; logView = null;
    const s = sv(); if (!K.bot) { s.deep = Math.max(s.deep || 0, depthM()); K.persist(); }
    if (how === 'beast') { scareSnd(); K.shake(34); } else { tone(420, 2.6, 'sawtooth', .14, -380, 0, 0, .4); hiss(2, .3, 'lowpass', 400, 0, 0, .5); K.shake(16); }
    const rec = `Deepest dive: ${s.deep || depthM()} m. Logs found: ${(s.logs || []).length}/${LOGS.length}.`;
    K.over({
      title: how === 'o2' ? 'Out of air' : how === 'hull' ? 'Hull breach' : 'Signal lost',
      text: (how === 'o2' ? 'The scrubbers went quiet. The sonar kept pinging for a while after.' : how === 'hull' ? 'The pressure won. The cave went quiet again.' : `It found you at ${depthM()} m. The last thing on the scope was an eye.`) + ' ' + rec,
      delay: how === 'beast' ? 3300 : 2600,
    });
  }

  /* ---------- the sub ---------- */
  const HULL = [[25, 0], [15, 7], [15, -7], [0, 9], [0, -9], [-15, 7], [-15, -7], [-25, 0]];
  function subStep(dt) {
    let ix = 0, iy = 0, boost = !!(keys.ShiftLeft || keys.ShiftRight);
    if (keys.KeyW || keys.ArrowUp) iy -= 1; if (keys.KeyS || keys.ArrowDown) iy += 1; if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
    if (hold) { const dx = hold.x - SX, dy = hold.y - SY, d = Math.hypot(dx, dy); if (d > 22) { ix = dx / d; iy = dy / d; boost = d > SR * .74; } }
    if (K.bot && GAME._steer) { const st = GAME._steer, dx = st.x - sub.x, dy = st.y - sub.y, d = Math.hypot(dx, dy); if (d > 6) { ix = dx / d; iy = dy / d; } boost = !!st.boost; }
    const want = ix || iy; if (want && listen && !K.bot) setListen(false);
    let thr = 0;
    if (want && !listen) { const da = ang(Math.atan2(iy, ix) - sub.a); sub.a += K.clamp(da, -3.4 * dt, 3.4 * dt); thr = Math.max(0, Math.cos(da)); hintDone.move = 1; }
    boosting = boost && thr > .3;
    const vmax = boosting ? 195 : 112, k = Math.min(1, dt * (thr > 0 ? 1.7 : 1.1));
    sub.vx += (Math.cos(sub.a) * thr * vmax - sub.vx) * k; sub.vy += (Math.sin(sub.a) * thr * vmax - sub.vy) * k;
    for (const c of currents) { const d = K.dist(c.x, c.y, sub.x, sub.y); if (d < c.r) { const f = (1 - d / c.r) * c.s * 1.5 * dt; sub.vx += c.dx * f; sub.vy += c.dy * f; } }
    sub.thr = thr * vmax; sub.x += sub.vx * dt; sub.y += sub.vy * dt;
    // smooth collision against the same field the contours are drawn from
    const ca = Math.cos(sub.a), sa = Math.sin(sub.a); let hitN = null;
    for (let it = 0; it < 6; it++) {
      let wx = 0, wy = 0, wv = .5;
      for (const [hx, hy] of HULL) { const px = sub.x + hx * ca - hy * sa, py = sub.y + hx * sa + hy * ca, f = fieldAt(px, py); if (f > wv) { wv = f; wx = px; wy = py; } }
      if (wv <= .5) break;
      const gx = fieldAt(wx + 3, wy) - fieldAt(wx - 3, wy), gy = fieldAt(wx, wy + 3) - fieldAt(wx, wy - 3), gl = Math.hypot(gx, gy);
      if (gl < 1e-4) { sub.x -= sub.vx * dt; sub.y -= sub.vy * dt; break; }
      hitN = [-gx / gl, -gy / gl]; sub.x += hitN[0] * 2.5; sub.y += hitN[1] * 2.5;
    }
    sub.scrapeT -= dt;
    if (hitN) {
      const vn = sub.vx * hitN[0] + sub.vy * hitN[1];
      if (vn < 0) { sub.vx -= hitN[0] * vn * 1.25; sub.vy -= hitN[1] * vn * 1.25; }
      if (-vn > 62 && sub.scrapeT <= 0) {
        const dmg = Math.round((-vn - 40) / 6); sub.scrapeT = .6; hurt(K.bot ? Math.ceil(dmg / 3) : dmg); show(`Hull scraped  -${dmg}`, 1.4); emit(sub.x, sub.y, 620, 'scrape');
        hiss(.45, .35, 'bandpass', 700, 0, 0, .3, 3); tone(140, .35, 'sawtooth', .1, -50);
        for (let n = 0; n < 12; n++) fxp.push({ x: sub.x - hitN[0] * 14, y: sub.y - hitN[1] * 14, vx: K.rand(-90, 90) + hitN[0] * 80, vy: K.rand(-90, 90) + hitN[1] * 80, life: 0, max: K.rand(.3, .7), k: 'spark' });
      } else if (Math.hypot(sub.vx, sub.vy) > 50 && Math.random() < dt * 5) hiss(.25, .04, 'bandpass', 1300, 0, 0, .1, 4);
    }
    noiseR = sub.thr > 3 ? (55 + sub.thr * sub.thr * .0095) * (1 - .2 * up('quiet')) + (boosting ? 160 : 0) : listen ? 0 : 22;
    if (sub.thr > 20 && Math.random() < dt * (boosting ? 30 : 10)) fxp.push({ x: sub.x - ca * 27 + K.rand(-3, 3), y: sub.y - sa * 27 + K.rand(-3, 3), vx: -ca * 40 + K.rand(-15, 15), vy: -sa * 40 + K.rand(-15, 15), life: 0, max: K.rand(.8, 1.6), k: 'bub', s: K.rand(1.5, 3.5) });
  }

  /* ---------- sonar ---------- */
  const PR = 210;
  const angIn = (a, a0, span) => { let d = (a - a0) % TAU; if (d < 0) d += TAU; return d < span; };
  function pingStep(p, dt) {
    const r0 = p.r; p.r += 860 * dt; const R = p.r, own = p.kind === 'sub';
    const x0 = Math.max(0, Math.floor((p.x - R) / C)), x1 = Math.min(GW - 1, Math.floor((p.x + R) / C)), y0 = Math.max(0, Math.floor((p.y - R) / C)), y1 = Math.min(GH - 1, Math.floor((p.y + R) / C));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * GW + x; if (!grid[i]) continue; const cx = x * C + C / 2 - p.x, cy = y * C + C / 2 - p.y, d = Math.hypot(cx, cy);
      if (d >= r0 - C && d < R && d <= rayAt(p, Math.atan2(cy, cx)) + C * 1.3) { lit[i] = K.t; seen[i] = 1; }
    }
    const vis = (x, y, m) => { const d = K.dist(x, y, p.x, p.y); return d < R && d >= r0 - m && d <= rayAt(p, Math.atan2(y - p.y, x - p.x)) + m; };
    for (const o of [...items, hatch, ...logs, ...eggs, ...rocks]) if (vis(o.x, o.y, 30)) { o.seenT = K.t; o.mem = 1; }
    for (const l of lurkers) if (vis(l.x, l.y, 50)) { l.seenT = K.t; ghosts.push({ t: K.t, k: 'lurk', x: l.x, y: l.y, a: l.a }); }
    for (const m of mites) if (vis(m.x, m.y, 12)) ghosts.push({ t: K.t, k: 'mite', x: m.x, y: m.y, a: Math.atan2(m.vy, m.vx) });
    for (const s of stalkers) {
      if (p.hit.has(s)) continue; let md = 1e9; for (const q of s.seg) md = Math.min(md, K.dist(q.x, q.y, p.x, p.y) - q.r);
      if (md > R || md > p.range) continue; p.hit.add(s);
      const pts = s.seg.map(q => { const d = K.dist(q.x, q.y, p.x, p.y); return d - q.r < p.range && d - q.r <= rayAt(p, Math.atan2(q.y - p.y, q.x - p.x)) + 12 ? { x: q.x, y: q.y, r: q.r } : null; });
      if (pts.some(q => q)) {
        ghosts.push({ t: K.t, k: 'body', pts, a: s.a });
        if (own) { const pn = panOf(s.x, s.y); tone(520, .9, 'triangle', .14, -170, .03, pn, .9); tone(250, 1.1, 'sine', .12, -90, .05, pn, .6); }
      }
    }
  }
  function sweepStep(a0, span) {
    const r = Math.ceil(PR / C) + 1, cx = Math.floor(sub.x / C), cy = Math.floor(sub.y / C);
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (x < 0 || y < 0 || x >= GW || y >= GH) continue; const i = y * GW + x; if (!grid[i]) continue;
      const px = x * C + C / 2 - sub.x, py = y * C + C / 2 - sub.y; if (px * px + py * py > PR * PR) continue;
      if (angIn(Math.atan2(py, px), a0, span)) swl[i] = K.t;
    }
    const hit = (x, y, m = 0) => K.dist(x, y, sub.x, sub.y) < PR + m && angIn(Math.atan2(y - sub.y, x - sub.x), a0, span);
    for (const s of stalkers) { const pts = s.seg.map(q => hit(q.x, q.y, q.r) ? { x: q.x, y: q.y, r: q.r } : null); if (pts.some(q => q)) ghosts.push({ t: K.t, k: 'body', pts, a: s.a, sw: 1 }); }
    for (const m of mites) if (hit(m.x, m.y)) ghosts.push({ t: K.t, k: 'mite', x: m.x, y: m.y, a: Math.atan2(m.vy, m.vx) });
    for (const l of lurkers) if (hit(l.x, l.y, 40)) { l.seenT = K.t; ghosts.push({ t: K.t, k: 'lurk', x: l.x, y: l.y, a: l.a }); }
    for (const o of [...items, hatch, ...logs, ...eggs, ...rocks]) if (hit(o.x, o.y, 20)) { o.seenT = K.t; o.mem = 1; }
  }

  /* ---------- update ---------- */
  function nextDive() {
    win = 0; level++; dives++; K.add(2); K.coin(3 + level); hull = Math.min(hullMax, hull + 30);
    if (!K.bot) { const s = sv(); s.deep = Math.max(s.deep || 0, depthM()); s.dives = (s.dives || 0) + 1; K.persist(); }
    buildLevel(); if (!K.bot) openStation(false);
  }
  function audioStep() {
    if (!A || !sub) return; const t = A.ac.currentTime, on = !dead && !station && !win;
    A.amb.gain.setTargetAtTime(on ? .3 : .08, t, .5); A.drone.gain.setTargetAtTime(on ? .5 + distort * .5 : .12, t, .5);
    A.eg.gain.setTargetAtTime(on ? sub.thr / 195 * .17 : 0, t, .1); A.eng.frequency.setTargetAtTime(34 + sub.thr * .22, t, .1); A.ef.frequency.setTargetAtTime(150 + sub.thr * 2.6, t, .1);
    A.wg.gain.setTargetAtTime(on && boosting ? .022 : 0, t, .2); A.wh.frequency.setTargetAtTime(300 + sub.thr * 1.6, t, .2);
    A.hg.gain.setTargetAtTime(on && listen ? .03 : 0, t, .2);
  }
  function fxStep(dt) {
    for (let i = fxp.length - 1; i >= 0; i--) { const p = fxp[i]; p.life += dt; if (p.life > p.max) { fxp.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 1.5; p.vy *= 1 - dt * 1.5; if (p.k === 'rock') p.vy += 160 * dt; }
    for (const s of silt) {
      s.x += Math.sin(K.t * .3 + s.z * 9) * 4 * dt; s.y += Math.cos(K.t * .23 + s.s * 5) * 4 * dt;
      for (const c of currents) { const d = K.dist(c.x, c.y, s.x, s.y); if (d < c.r * 1.3) { s.x += c.dx * c.s * 1.4 * dt; s.y += c.dy * c.s * 1.4 * dt; } }
      if (Math.abs(s.x - cam.x) > 490) s.x = cam.x - Math.sign(s.x - cam.x) * K.rand(400, 480);
      if (Math.abs(s.y - cam.y) > 490) s.y = cam.y - Math.sign(s.y - cam.y) * K.rand(400, 480);
    }
    for (let i = ghosts.length - 1; i >= 0; i--) if (K.t - ghosts[i].t > 3) ghosts.splice(i, 1);
    for (let i = bear.length - 1; i >= 0; i--) if (K.t - bear[i].t > 3) bear.splice(i, 1);
  }
  const HINTS = [
    ['move', () => levelT > 1, 'Hold the screen where you want to go, or use WASD / the arrows.'],
    ['ping', () => levelT > 5, 'SPACE or PING lights up the cave. It hears every ping.'],
    ['beacon', () => hintDone.ping && levelT > 10, 'Find 3 amber PARTS. LISTEN (Q) shows their beacons on the rim.'],
    ['loud', () => boosting, 'Full speed is LOUD. The dashed ring shows how far you can be heard.'],
    ['seen', () => ghosts.some(g => g.k === 'body' && !g.sw), 'That red shape is IT. Stay quiet. Flares (F) drive it off, decoys (E) lure it away.'],
    ['vent', () => vent[idx(sub.x, sub.y)] || vent[idx(sub.x + Math.cos(sub.a) * 60, sub.y + Math.sin(sub.a) * 60)], 'A narrow vent: too tight for it to follow you in.'],
    ['pods', () => eggs.some(e => e.seenT > 0 && K.dist(e.x, e.y, sub.x, sub.y) < 320), 'Pods. Do not touch them, and do not race past them.'],
  ];
  function hintStep(dt) {
    hintT -= dt; if (hintT > 0) { if (hintDone[hint.id]) hintT = Math.min(hintT, .6); return; }
    if (K.bot || (sv().dives || 0) >= 3) return;
    for (const [id, cond, text] of HINTS) if (!hintDone['h' + id] && !hintDone[id] && cond()) { hintDone['h' + id] = 1; hint = { id, text }; hintT = 6.5; return; }
  }
  GAME.update = dt => {
    if (!sub) return;
    if (!K.bot && K.ac) au();
    audioStep(); fxStep(dt);
    if (dead || station) { if (station) { station.t += dt; station.fT -= dt; } return; }
    if (win) { win += dt; sub.x += (hatch.x - sub.x) * Math.min(1, dt * 2); sub.y += (hatch.y - sub.y) * Math.min(1, dt * 2); sub.a += dt * 2; cam.x = sub.x; cam.y = sub.y; if (win > 2.4) nextDive(); return; }
    levelT += dt; msgT -= dt; hurtT -= dt; scare = Math.max(0, scare - dt * 1.4);
    const sw0 = sweep; sweep += dt * 2.1;
    pingCharge = Math.min(1, pingCharge + dt / pingCd() * (listen ? 1.6 : 1));
    subStep(dt); if (dead) return;
    cam.x = sub.x; cam.y = sub.y; evR = Math.max(0, evR - dt * 700);
    for (const p of pings) pingStep(p, dt);
    pings = pings.filter(p => p.r < p.range);
    sweepStep(sw0, sweep - sw0);
    // flares and decoys
    for (const f of flares) {
      f.t += dt; f.vx *= 1 - dt * 1.4; f.vy *= 1 - dt * 1.4; const nx = f.x + f.vx * dt, ny = f.y + f.vy * dt;
      if (fieldAt(nx, ny) > .45) { f.vx *= -.5; f.vy *= -.5; } else { f.x = nx; f.y = ny; }
      const FR = 230 * Math.min(1, f.t * 3) * (f.t > f.life - 1 ? f.life - f.t : 1);
      const r = Math.ceil(FR / C), cx = Math.floor(f.x / C), cy = Math.floor(f.y / C);
      for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) { const i = y * GW + x; if (x >= 0 && y >= 0 && x < GW && y < GH && grid[i] && K.dist(x * C + C / 2, y * C + C / 2, f.x, f.y) < FR) { lit[i] = K.t - .3; seen[i] = 1; } }
      for (const o of [...items, hatch, ...logs, ...eggs, ...rocks]) if (K.dist(o.x, o.y, f.x, f.y) < FR) { o.seenT = K.t; o.mem = 1; }
      for (const s of stalkers) if (s.seg.some(q => K.dist(q.x, q.y, f.x, f.y) < FR + 50)) flee(s, f.x, f.y);
      if (Math.random() < dt * 25) fxp.push({ x: f.x, y: f.y, vx: K.rand(-40, 40), vy: K.rand(-60, 10), life: 0, max: K.rand(.4, 1), k: 'flare' });
    }
    flares = flares.filter(f => f.t < f.life);
    for (const d of decoys) {
      d.t += dt; d.vx *= 1 - dt * 2.2; d.vy *= 1 - dt * 2.2; const nx = d.x + d.vx * dt, ny = d.y + d.vy * dt;
      if (fieldAt(nx, ny) > .45) { d.vx *= -.5; d.vy *= -.5; } else { d.x = nx; d.y = ny; }
      if (d.t > .8 && d.n < 5 && d.t - (d.last || 0) > 1.7) { d.n++; d.last = d.t; newPing(d.x, d.y, 380, 'decoy'); emit(d.x, d.y, 1400, 'decoy'); tone(1500, 1, 'sine', .08, -40, 0, panOf(d.x, d.y), .8); }
    }
    decoys = decoys.filter(d => d.n < 5 || d.t - d.last < 1.5);
    // creatures
    for (const s of stalkers) {
      if (noiseR > 30 && K.dist(s.x, s.y, sub.x, sub.y) < noiseR * hearMul()) { if (s.mode === 'hunt') { s.tx = sub.x; s.ty = sub.y; s.lastHeard = K.t; } else hear(s, sub.x, sub.y, noiseR, 'engine'); }
      stalkerStep(s, dt);
      if (K.dist(s.x, s.y, sub.x, sub.y) < 38) { if (vent[idx(sub.x, sub.y)]) { if (scare < .2) { scare = .9; K.shake(22); tone(60, .5, 'square', .3, -20); hiss(.4, .5, 'lowpass', 500); show('It cannot fit. Stay in the vent.', 2); } } else return die('beast'); }
    }
    for (const l of lurkers) lurkerStep(l, dt);
    for (const m of mites) { if (noiseR > 30 && K.dist(m.x, m.y, sub.x, sub.y) < noiseR * 1.2) { m.tx = sub.x; m.ty = sub.y; m.chase = 3; } miteStep(m, dt); }
    if (dead) return;
    // cave features
    for (const e of eggs) {
      if (e.angry) { e.angry += dt; continue; }
      if (e.pods.some(p => K.dist(p.x, p.y, sub.x, sub.y) < p.r + 22) || (boosting && K.dist(e.x, e.y, sub.x, sub.y) < 170)) {
        e.angry = .001; e.seenT = K.t; e.mem = 1; scare = Math.max(scare, .5); K.shake(10); show('You woke the pods. It is coming.', 3);
        tone(1700, 1.8, 'sine', .1, 900, 0, panOf(e.x, e.y), .7, 40); tone(1760, 1.8, 'sine', .08, 1000, .1, panOf(e.x, e.y), .7, 50);
        for (const s of stalkers) { s.mode = 'roam'; hear(s, sub.x, sub.y, 1e6, 'egg'); s.rage = 10; }
        for (const m of mites) { m.tx = sub.x; m.ty = sub.y; m.chase = 6; }
      }
    }
    for (const rk of rocks) if (rk.fall && !rk.done) {
      rk.fall += dt; K.shake(3);
      if (rk.fall > 1) {
        rk.done = true; rk.seenT = K.t; K.shake(16); hiss(2.2, .45, 'lowpass', 150, 0, panOf(rk.x, rk.y), .6); tone(48, 1.6, 'sine', .3, -14);
        for (let n = 0; n < 34; n++) fxp.push({ x: rk.x + K.rand(-20, 20), y: rk.y + K.rand(-20, 20), vx: (rk.ox - rk.x) * K.rand(.5, 2) + K.rand(-60, 60), vy: (rk.oy - rk.y) * K.rand(.5, 2) + K.rand(-60, 60), life: 0, max: K.rand(.8, 1.8), k: 'rock', s: K.rand(3, 8) });
        for (let i = 0; i < GW * GH; i++) if (grid[i]) { const [x, y] = ctr(i); if (K.dist(x, y, rk.ox, rk.oy) < 170) { lit[i] = K.t; seen[i] = 1; } }
        if (K.dist(rk.ox, rk.oy, sub.x, sub.y) < 95) { hurt(K.bot ? 6 : 22); show('Rockfall!', 1.5); }
        emit(rk.ox, rk.oy, 900, 'rock');
      }
    }
    if (dead) return;
    // objectives
    for (const it of items) if (!it.got && K.dist(it.x, it.y, sub.x, sub.y) < 40) {
      it.got = true; got++; K.add(1); K.coin(2); tone(660, .25, 'triangle', .12); tone(990, .3, 'triangle', .1, 0, .08); tone(1320, .6, 'sine', .08, 0, .16, 0, .5);
      show(got < 3 ? `Part ${got} of 3 recovered` : 'All parts aboard. Follow the teal arrow to the hatch.', 3);
      for (let n = 0; n < 16; n++) fxp.push({ x: it.x, y: it.y, vx: K.rand(-120, 120), vy: K.rand(-120, 120), life: 0, max: K.rand(.4, .9), k: 'gold' });
    }
    for (const lg of logs) if (!lg.got && K.dist(lg.x, lg.y, sub.x, sub.y) < 40) {
      lg.got = true; runLogs++; K.coin(4); K.add(2); const s = sv(); let n = -1;
      for (let j = 0; j < LOGS.length; j++) if (!s.logs.includes(j)) { n = j; break; }
      if (n >= 0 && !K.bot) { s.logs.push(n); K.persist(); logView = { i: n, t: 0 }; } else show('Black box recovered: salvage +4', 2.5);
      hiss(.6, .2, 'bandpass', 1800, 0, 0, 0, 2); for (let j = 0; j < 3; j++) tone(880, .08, 'square', .05, 0, .3 + j * .13);
    }
    if (logView) { logView.t += dt; if (logView.t > LOGS[logView.i].length / 26 + 5) logView = null; }
    if (got >= 3 && K.dist(hatch.x, hatch.y, sub.x, sub.y) < 46) { win = .001; listen = false; tone(330, 1.2, 'triangle', .12); tone(415, 1.2, 'triangle', .1, 0, .15); tone(494, 1.6, 'sine', .1, 0, .3, 0, .6); hiss(2, .2, 'lowpass', 300, .2, 0, .5); show(`Hatch open. Descending to ${depthM() + 250} m.`, 2.5); return; }
    // air, danger, ambience
    o2 -= dt; if (o2 <= 0) { o2 = 0; return die('o2'); }
    if (o2 < 30 && (alarmT -= dt) <= 0) { alarmT = 1.2; tone(980, .14, 'square', .05); }
    nearD = 1e9; let ns = null;
    for (const s of stalkers) for (const q of s.seg) { const d = K.dist(q.x, q.y, sub.x, sub.y) - q.r; if (d < nearD) { nearD = d; ns = s; } }
    distort += (K.clamp((480 - nearD) / 380, 0, 1) - distort) * Math.min(1, dt * 3);
    if (nearD < 160 && !scareSeen && !K.bot) { scareSeen = true; scare = 1; scareSnd(); K.shake(20); }
    if (nearD < 650) { beatT -= dt; if (beatT <= 0) { beatT = .3 + nearD / 650 * .85; heartbeat(K.clamp(1.2 - nearD / 700, .25, 1)); } }
    if ((callT -= dt) <= 0 && ns) { callT = K.rand(10, 20); const s = stalkers[K.irand(0, stalkers.length - 1)], d = K.dist(s.x, s.y, sub.x, sub.y); moan(d, panOf(s.x, s.y)); bear.push({ a: Math.atan2(s.y - sub.y, s.x - sub.x), t: K.t, c: '255,80,70', w: .2 }); }
    if ((creakT -= dt) <= 0) { creakT = K.rand(6, 14) / (1 + level * .08); creak(); }
    if (mites.some(m => K.dist(m.x, m.y, sub.x, sub.y) < 420) && Math.random() < dt * 3) { const m = mites[K.irand(0, mites.length - 1)]; for (let j = 0; j < 4; j++) hiss(.03, .12, 'highpass', 3600, j * .05 + Math.random() * .03, panOf(m.x, m.y), .2); }
    if (listen && Math.random() < dt * 1.2) { const o = [...items.filter(i => !i.got), ...logs.filter(l => !l.got), ...(got >= 3 ? [hatch] : [])]; const t = o[K.irand(0, o.length - 1)]; if (t) tone(1400, .1, 'sine', .04, 0, 0, panOf(t.x, t.y), .6); }
    hintStep(dt);
  };

  /* ---------- bot ---------- */
  let bField = null, bGoal = null, bT = 0, bChk = 0, bLast = [0, 0], bWay = null, bWayT = 0, bListen = 0, bNext = 12;
  GAME.bot = dt => {
    if (!sub || dead || win) { GAME._steer = null; return; }
    if (station) { if (station.t > 1.6) dive(); return; }
    if (listen) { GAME._steer = null; if ((bListen -= dt) <= 0) setListen(false); return; }
    let goal = null, gd = 1e9;
    if (got < 3) for (const it of items) if (!it.got) { const d = K.dist(it.x, it.y, sub.x, sub.y); if (d < gd) { gd = d; goal = it; } }
    for (const lg of logs) if (!lg.got && K.dist(lg.x, lg.y, sub.x, sub.y) < Math.min(gd, 520)) { goal = lg; gd = 0; }
    if (got >= 3) goal = hatch;
    bT -= dt;
    if (goal !== bGoal || bT <= 0 || !bField) { bGoal = goal; bT = .8; const gi = idx(goal.x, goal.y); bField = bfsFrom(gi, k => passable(k) && !avoid[k]); if (bField[idx(sub.x, sub.y)] < 0) bField = bfsFrom(gi, passable); }
    let k = idx(sub.x, sub.y), tgt = null;
    for (let j = 0; j < 9; j++) {
      let nb = -1, nd = bField[k] >= 0 ? bField[k] : 1e9, nw = -1;
      for (const [dx, dy] of D8) {
        const q = k + dy * GW + dx; if (q < 0 || q >= GW * GH || bField[q] < 0) continue;
        if (dx && dy && (bField[k + dx] < 0 || bField[k + dy * GW] < 0)) continue;
        if (bField[q] < nd || (nb >= 0 && bField[q] === nd && wd[q] > nw)) { nd = bField[q]; nb = q; nw = wd[q]; }
      }
      if (nb < 0) break; k = nb; const [x, y] = ctr(k);
      if (j < 1 || clearLine(sub.x, sub.y, x, y, .3)) tgt = [x, y]; else break;
    }
    if (!tgt) tgt = [goal.x, goal.y];
    if ((bChk -= dt) <= 0) { bChk = 2; if (K.dist(sub.x, sub.y, bLast[0], bLast[1]) < 25) { const p = pickCell([sub.x, sub.y], 4, passable); if (p) { bWay = p; bWayT = 1.2; } } bLast = [sub.x, sub.y]; }
    if (bWayT > 0) { bWayT -= dt; tgt = bWay; }
    GAME._steer = { x: tgt[0], y: tgt[1], boost: levelT > 3 && nearD > 950 && !mites.some(m => K.dist(m.x, m.y, sub.x, sub.y) < 600) && !eggs.some(e => K.dist(e.x, e.y, sub.x, sub.y) < 280) && !lurkers.some(l => K.dist(l.hx, l.hy, sub.x, sub.y) < 260) };
    if (pingCharge >= 1 && K.t - lastPing > (nearD < 700 ? 7 : 2.4)) use('ping');
    if (nearD < 290 && tools.flare && !flares.length) use('flare');
    else if (nearD < 650 && nearD > 320 && tools.decoy && !decoys.length && stalkers.some(s => s.mode === 'hunt')) use('decoy');
    if (levelT > bNext && nearD > 750 && got < 3) { bNext = levelT + K.rand(15, 24); bListen = 1.7; setListen(true); }
  };

  GAME._dbg = k => k === 'die' ? die('beast') : k === 'hull' ? die('hull') : k === 'station' ? openStation(false) : k === 'deep' ? (level = 5, buildLevel()) : null;
  /* ---------- cover pose: the sweep catches the stalker coiled around the sub ---------- */
  GAME.pose = () => {
    let bi = 0; for (let i = 0; i < GW * GH; i++) if (wd[i] > wd[bi]) bi = i;
    [sub.x, sub.y] = ctr(bi); cam.x = sub.x; cam.y = sub.y; sub.a = -.6; sub.thr = 50;
    const s = stalkers[0];
    for (let j = 0; j < NSEG; j++) { const a = 2.75 - j * .2, r = 105 + j * 7; s.seg[j].x = sub.x + Math.cos(a) * r; s.seg[j].y = sub.y + Math.sin(a) * r; }
    s.x = s.seg[0].x; s.y = s.seg[0].y; s.a = Math.atan2(sub.y - s.y, sub.x - s.x) - .6;
    ghosts = [{ t: K.t - .25, k: 'body', pts: s.seg.map(q => ({ x: q.x, y: q.y, r: q.r })), a: s.a }];
    const p = (newPing(sub.x, sub.y, 600, 'sub'), pings[pings.length - 1]); pingStep(p, 600 / 860);
    for (let i = 0; i < GW * GH; i++) if (lit[i] === K.t) lit[i] = K.t - .2 - Math.random() * 1.3;
    p.r = 360; p.hit.add(s); ghosts.length = 1;
    for (const o of [...items, hatch, ...logs]) o.mem = 1;
    sweep = Math.atan2(s.y - sub.y, s.x - sub.x) + .35; s.mode = 'hunt'; s.lastHeard = K.t; nearD = 40; distort = .3; noiseR = 120; GAME._pose = 1; msgT = 0; hintT = 0;
  };

  /* ---------- station (upgrades between dives) ---------- */
  const cardXY = i => [121 + (i % 3) * 354, 160 + ((i / 3) | 0) * 166];
  function stationClick(x, y) {
    if (station.t < .3) return;
    if (x >= 520 && x <= 760 && y >= 604 && y <= 680) return dive();
    for (let i = 0; i < UPS.length; i++) { const [cx, cy] = cardXY(i); if (x >= cx && x <= cx + 330 && y >= cy && y <= cy + 150) return buy(i); }
  }

  /* ---------- drawing helpers ---------- */
  const TXT = (gr, s, x, y, size, col, al = 'left', bl = 'alphabetic') => { gr.font = FONT(size); gr.fillStyle = col; gr.textAlign = al; gr.textBaseline = bl; gr.fillText(s, x, y); };
  function wrap(gr, s, w) { const out = []; let line = ''; for (const word of s.split(' ')) { const t = line ? line + ' ' + word : word; if (gr.measureText(t).width > w && line) { out.push(line); line = word; } else line = t; } if (line) out.push(line); return out; }
  function hash(a, b) { let h = Math.imul(a, 374761393) ^ Math.imul(b + 1, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function rr(gr, x, y, w, h, r) { gr.beginPath(); gr.moveTo(x + r, y); gr.arcTo(x + w, y, x + w, y + h, r); gr.arcTo(x + w, y + h, x, y + h, r); gr.arcTo(x, y + h, x, y, r); gr.arcTo(x, y, x + w, y, r); gr.closePath(); }
  function pill(gr, lines, cx, y, size, col, bd) {
    gr.font = FONT(size); let w = 0; for (const l of lines) w = Math.max(w, gr.measureText(l).width);
    rr(gr, cx - w / 2 - 18, y, w + 36, lines.length * (size + 7) + 16, 10); gr.fillStyle = 'rgba(1,10,6,.84)'; gr.fill(); gr.strokeStyle = bd; gr.lineWidth = 1.5; gr.stroke();
    lines.forEach((l, i) => TXT(gr, l, cx, y + 8 + (i + .5) * (size + 7), size, col, 'center', 'middle'));
  }
  function glitchText(gr, s, x, y, size) {
    const j = Math.random() < .2 ? K.rand(-8, 8) : 0; gr.globalCompositeOperation = 'lighter';
    TXT(gr, s, x - 3 + j, y, size, 'rgba(255,40,40,.85)', 'center', 'middle'); TXT(gr, s, x + 3, y + 1, size, 'rgba(40,220,255,.5)', 'center', 'middle');
    gr.globalCompositeOperation = 'source-over'; TXT(gr, s, x + j * .4, y, size, '#ffeee6', 'center', 'middle');
  }
  const INS = [[24, 44, 256, 84, 'DEPTH'], [24, 140, 256, 58, 'O2'], [24, 210, 256, 58, 'HULL'], [24, 280, 256, 122, 'NOISE'], [24, 414, 256, 92, 'OBJECTIVE'], [24, 518, 256, 112, 'CONTACT'], [24, 642, 256, 56, 'BLACK BOX']];
  function bolt(p, x, y, r) {
    const bg = p.createRadialGradient(x - r * .3, y - r * .3, 0, x, y, r); bg.addColorStop(0, '#76877f'); bg.addColorStop(1, '#151d1a');
    p.fillStyle = bg; p.beginPath(); p.arc(x, y, r, 0, TAU); p.fill(); p.strokeStyle = 'rgba(0,0,0,.65)'; p.lineWidth = 1.2; p.beginPath(); p.moveTo(x - r * .6, y - r * .2); p.lineTo(x + r * .6, y + r * .2); p.stroke();
  }
  function panelBg(gr) {
    const v = K.view, cnv = gr.canvas, key = cnv.width + 'x' + cnv.height + ':' + v.x0 + ',' + v.y0;
    if (key !== panelKey) {
      panelKey = key; panelC = document.createElement('canvas'); panelC.width = cnv.width; panelC.height = cnv.height;
      const p = panelC.getContext('2d'), s = cnv.width / (v.x1 - v.x0), W0 = v.x1 - v.x0, H0 = v.y1 - v.y0; p.setTransform(s, 0, 0, s, -v.x0 * s, -v.y0 * s);
      const gd = p.createLinearGradient(0, v.y0, 0, v.y1); gd.addColorStop(0, '#101816'); gd.addColorStop(1, '#050908'); p.fillStyle = gd; p.fillRect(v.x0, v.y0, W0, H0);
      for (let i = 0; i < 320; i++) { p.fillStyle = `rgba(255,255,255,${Math.random() * .03})`; p.fillRect(v.x0 + Math.random() * W0, v.y0 + Math.random() * H0, Math.random() * 140, 1); }
      const plate = (x, y, w, h) => {
        rr(p, x, y, w, h, 14); const lg = p.createLinearGradient(x, y, x + w * .4, y + h); lg.addColorStop(0, '#1b2723'); lg.addColorStop(1, '#0a110f'); p.fillStyle = lg; p.fill();
        p.strokeStyle = '#2f413a'; p.lineWidth = 2; p.stroke(); rr(p, x + 4, y + 4, w - 8, h - 8, 11); p.strokeStyle = 'rgba(0,0,0,.55)'; p.lineWidth = 1; p.stroke();
        for (const [bx, by] of [[x + 13, y + 13], [x + w - 13, y + 13], [x + 13, y + h - 13], [x + w - 13, y + h - 13]]) bolt(p, bx, by, 5);
      };
      plate(10, 8, 284, 704); plate(986, 8, 284, 704);
      // hazard stripes and vents on the side plates
      p.save(); rr(p, 1000, 668, 206, 28, 6); p.clip(); for (let x = 980; x < 1270; x += 22) { p.fillStyle = 'rgba(255,190,60,.16)'; p.beginPath(); p.moveTo(x, 668); p.lineTo(x + 11, 668); p.lineTo(x - 17, 696); p.lineTo(x - 28, 696); p.fill(); } p.restore();
      // scope bezel
      const bz = p.createRadialGradient(SX, SY, SR - 4, SX, SY, SR + 36); bz.addColorStop(0, '#020504'); bz.addColorStop(.12, '#33433d'); bz.addColorStop(.5, '#18231f'); bz.addColorStop(.9, '#0c1311'); bz.addColorStop(1, '#2a3833');
      p.fillStyle = bz; p.beginPath(); p.arc(SX, SY, SR + 36, 0, TAU); p.fill();
      for (let k = 0; k < 12; k++) { const a = (k + .5) / 12 * TAU - Math.PI / 2; bolt(p, SX + Math.cos(a) * (SR + 27), SY + Math.sin(a) * (SR + 27), 3.5); }
      p.font = FONT(16); p.fillStyle = '#86a398'; p.textAlign = 'center'; p.textBaseline = 'middle';
      for (let d = 0; d < 360; d += 30) { const a = (d - 90) / 180 * Math.PI; p.fillText(String(d).padStart(3, '0'), SX + Math.cos(a) * (SR + 15), SY + Math.sin(a) * (SR + 15)); }
      for (const [x, y, w, h, lab] of INS) {
        rr(p, x, y, w, h, 8); p.fillStyle = '#020605'; p.fill(); p.strokeStyle = 'rgba(0,0,0,.9)'; p.lineWidth = 2; p.stroke();
        const sh = p.createLinearGradient(0, y, 0, y + 10); sh.addColorStop(0, 'rgba(0,0,0,.7)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); p.fillStyle = sh; p.fillRect(x + 2, y + 2, w - 4, 10);
        p.fillStyle = 'rgba(255,255,255,.06)'; p.fillRect(x + 6, y + h, w - 12, 1);
        p.font = FONT(16); p.fillStyle = '#5f8277'; p.textAlign = 'left'; p.textBaseline = 'alphabetic'; p.fillText(lab, x + 12, y + 20);
      }
      p.beginPath(); p.arc(1129, 262, 92, 0, TAU); p.fillStyle = '#020605'; p.fill(); p.strokeStyle = '#2f413a'; p.lineWidth = 3; p.stroke();
      p.font = FONT(16); p.fillStyle = '#5f8277'; p.textAlign = 'left'; p.fillText('DSV HALCYON II', 64, 32); p.fillText('SONAR CONTROL', 1000, 32);
      for (let k = 0; k < 5; k++) { p.fillStyle = '#020605'; rr(p, 1160 + k * 18, 22, 10, 14, 3); p.fill(); }
    }
    gr.drawImage(panelC, v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  }

  /* ---------- gauges and buttons ---------- */
  function bar(gr, x, y, w, h, n, f, col) { const sw = w / n; for (let i = 0; i < n; i++) { const on = i < f * n - .001; gr.fillStyle = on ? col(i / n) : 'rgba(57,255,156,.07)'; gr.fillRect(x + i * sw + 1, y, sw - 2, h); } }
  function panels(gr) {
    const t = K.t, grn = '#7dffc0', dim = '#5f8277', red = '#ff5a4a', amb = '#ffc94a', blink = Math.sin(t * 10) > 0;
    // depth
    TXT(gr, (depthM() + Math.sin(t * .4) * .8 + sub.y / C * .25).toFixed(1).padStart(6, '0') + ' m', 36, 112, 38, grn);
    TXT(gr, 'DIVE ' + level, 268, 64, 16, dim, 'right');
    // air and hull
    const of = o2 / o2max, low = o2 < 30;
    TXT(gr, Math.ceil(o2) + ' s', 268, 160, 18, low && blink ? red : grn, 'right');
    bar(gr, 36, 170, 232, 18, 20, of, () => low ? red : of < .35 ? amb : '#39ff9c');
    const hf = hull / hullMax;
    TXT(gr, Math.ceil(hull) + ' / ' + hullMax, 268, 230, 18, hf < .3 && blink ? red : grn, 'right');
    bar(gr, 36, 240, 232, 18, 20, hf, () => hf < .3 ? red : hf < .55 ? amb : '#39ff9c');
    if (hurtT > 0) { gr.fillStyle = `rgba(255,60,40,${hurtT * .5})`; gr.fillRect(28, 214, 248, 50); }
    // noise: how far away you can be heard, against how far away it is
    const n = Math.max(noiseR, evR), nf = Math.min(1, n / 1000);
    let hd = 1e9; for (const s of stalkers) hd = Math.min(hd, K.dist(s.x, s.y, sub.x, sub.y) / hearMul());
    if (!listen) hd += Math.sin(t * 1.7) * 50 + Math.sin(t * 4.3) * 20;
    bar(gr, 36, 322, 232, 30, 24, nf, f => f < .3 ? '#39ff9c' : f < .6 ? amb : red);
    const mx = 36 + 232 * K.clamp(hd / 1000, 0, 1);
    gr.fillStyle = red; gr.beginPath(); gr.moveTo(mx, 318); gr.lineTo(mx - 7, 306); gr.lineTo(mx + 7, 306); gr.fill(); gr.fillRect(mx - 1, 318, 2, 38);
    TXT(gr, hd > 1000 ? 'IT ▶' : 'IT', mx > 220 ? mx - 10 : mx + 10, 316, 16, red, mx > 220 ? 'right' : 'left');
    const word = listen ? 'SILENT' : n < 40 ? 'IDLE' : n < 200 ? 'QUIET' : n < 450 ? 'LOUD' : 'DEAFENING', heard = n > hd;
    TXT(gr, word, 36, 384, 20, n < 200 ? grn : n < 450 ? amb : red);
    TXT(gr, heard ? 'HEARD' : 'UNHEARD', 268, 384, 18, heard ? (blink ? red : '#ff9a8a') : dim, 'right');
    // objective
    for (let i = 0; i < 3; i++) {
      const x = 48 + i * 40, y = 462, on = i < got; gr.save(); gr.translate(x, y); gr.rotate(Math.PI / 4);
      gr.strokeStyle = on ? amb : 'rgba(255,201,74,.3)'; gr.lineWidth = 2; gr.strokeRect(-10, -10, 20, 20); if (on) { gr.fillStyle = amb; gr.fillRect(-5, -5, 10, 10); } gr.restore();
    }
    TXT(gr, `PARTS ${got}/3`, 268, 468, 20, got >= 3 ? amb : grn, 'right');
    TXT(gr, got >= 3 ? 'HATCH OPEN: FOLLOW ▲' : 'HATCH SEALED', 36, 496, 17, got >= 3 ? (blink ? '#5ff4ff' : '#bdfaff') : dim);
    // contact
    let st = 0; for (const s of stalkers) st = Math.max(st, s.mode === 'hunt' ? 2 : s.mode === 'seek' || s.mode === 'sniff' ? 1 : s.mode === 'flee' ? -1 : 0);
    const [sw, sc] = st === 2 ? ['HUNTING', red] : st === 1 ? ['SEARCHING', amb] : st === -1 ? ['REPELLED', '#5ff4ff'] : ['CALM', grn];
    gr.fillStyle = st === 2 && !blink ? '#401010' : sc; gr.beginPath(); gr.arc(46, 566, 10, 0, TAU); gr.fill();
    if (st === 2) { gr.fillStyle = 'rgba(255,60,40,.25)'; gr.beginPath(); gr.arc(46, 566, 18, 0, TAU); gr.fill(); }
    TXT(gr, sw, 66, 575, 24, sc);
    const known = listen || ghosts.some(g => g.k === 'body' && t - g.t < 3);
    TXT(gr, known ? `RANGE ${Math.max(0, Math.round(nearD * .25))} m` : 'RANGE  ---', 36, 602, 17, known ? grn : dim);
    let hz = '';
    if (eggs.some(e => K.dist(e.x, e.y, sub.x, sub.y) < 300 && e.mem)) hz = 'PODS: STAY CLEAR';
    if (lurkers.some(l => K.dist(l.hx, l.hy, sub.x, sub.y) < 330)) hz = 'LIGHT AHEAD: LURKER';
    if (mites.some(m => K.dist(m.x, m.y, sub.x, sub.y) < 450)) hz = 'SWARM NEARBY';
    if (currents.some(c => K.dist(c.x, c.y, sub.x, sub.y) < c.r)) hz = hz || 'CURRENT';
    TXT(gr, hz || 'NO HAZARDS', 36, 622, 17, hz ? amb : dim);
    // black box
    TXT(gr, `${(sv().logs || []).length}/${LOGS.length}`, 268, 664, 18, '#9fd8ff', 'right');
    TXT(gr, runLogs ? `+${runLogs} this run` : 'Find the crew logs', 36, 688, 16, runLogs ? '#9fd8ff' : dim);
    // ping button
    const B = BT.ping, ready = pingCharge >= 1, pr = K.t - (press.ping || -9);
    gr.lineWidth = 9; gr.strokeStyle = 'rgba(57,255,156,.12)'; gr.beginPath(); gr.arc(B.x, B.y, 74, 0, TAU); gr.stroke();
    gr.strokeStyle = ready ? '#39ff9c' : '#2a8d62'; gr.beginPath(); gr.arc(B.x, B.y, 74, -Math.PI / 2, -Math.PI / 2 + TAU * pingCharge); gr.stroke();
    const pg = gr.createRadialGradient(B.x, B.y, 0, B.x, B.y, 62); pg.addColorStop(0, ready ? `rgba(57,255,156,${.32 + .1 * Math.sin(t * 4)})` : 'rgba(57,255,156,.06)'); pg.addColorStop(1, ready ? 'rgba(57,255,156,.08)' : 'rgba(57,255,156,.02)');
    gr.fillStyle = pg; gr.beginPath(); gr.arc(B.x, B.y, 62 * (pr < .15 ? .92 : 1), 0, TAU); gr.fill();
    if (pr < .6) { gr.strokeStyle = `rgba(57,255,156,${1 - pr / .6})`; gr.lineWidth = 3; gr.beginPath(); gr.arc(B.x, B.y, 62 + pr * 90, 0, TAU); gr.stroke(); }
    TXT(gr, 'PING', B.x, B.y + 2, 32, ready ? '#d8ffe8' : '#3f8f6c', 'center', 'middle'); TXT(gr, 'SPACE', B.x, B.y + 32, 16, dim, 'center', 'middle');
    // decoy, flare, listen
    const tool = (k, name, key, cnt, icon) => {
      const b = BT[k], on = cnt > 0, hot = K.t - (press[k] || -9) < .25;
      rr(gr, b.x, b.y, b.w, b.h, 10); gr.fillStyle = hot ? 'rgba(57,255,156,.25)' : on ? 'rgba(10,30,22,.95)' : 'rgba(6,12,10,.95)'; gr.fill(); gr.strokeStyle = on ? '#39ff9c' : '#25403a'; gr.lineWidth = 2; gr.stroke();
      gr.save(); gr.translate(b.x + b.w / 2, b.y + 32); gr.globalAlpha = on ? 1 : .35; icon(); gr.restore();
      TXT(gr, name, b.x + b.w / 2, b.y + 68, 18, on ? '#d8ffe8' : '#4c6d62', 'center'); TXT(gr, '×' + cnt, b.x + b.w / 2, b.y + 91, 18, on ? amb : '#4c6d62', 'center');
      TXT(gr, key, b.x + b.w - 10, b.y + 22, 16, dim, 'right');
    };
    tool('decoy', 'DECOY', 'E', tools.decoy, () => { gr.fillStyle = '#9fe0ff'; gr.beginPath(); gr.ellipse(0, 0, 18, 6, 0, 0, TAU); gr.fill(); gr.fillRect(-22, -7, 5, 14); gr.strokeStyle = '#9fe0ff'; gr.lineWidth = 2; for (let i = 1; i < 3; i++) { gr.beginPath(); gr.arc(18, 0, 6 + i * 6, -.7, .7); gr.stroke(); } });
    tool('flare', 'FLARE', 'F', tools.flare, () => { const fg = gr.createRadialGradient(0, 0, 0, 0, 0, 20); fg.addColorStop(0, '#fff3c4'); fg.addColorStop(.4, 'rgba(255,170,70,.8)'); fg.addColorStop(1, 'rgba(255,120,40,0)'); gr.fillStyle = fg; gr.beginPath(); gr.arc(0, 0, 20, 0, TAU); gr.fill(); gr.strokeStyle = '#ffd27a'; gr.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t; gr.beginPath(); gr.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); gr.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); gr.stroke(); } });
    const L = BT.listen; rr(gr, L.x, L.y, L.w, L.h, 10); gr.fillStyle = listen ? 'rgba(60,170,220,.22)' : 'rgba(10,30,22,.95)'; gr.fill(); gr.strokeStyle = listen ? '#7fdcff' : '#39ff9c'; gr.lineWidth = 2; gr.stroke();
    if (listen) { gr.strokeStyle = 'rgba(127,220,255,.6)'; gr.lineWidth = 2; gr.beginPath(); for (let x = 0; x <= 230; x += 3) { const y = L.y + 58 + Math.sin(x * .13 + t * 9) * Math.sin(x * .021 + t) * 9 * Math.random(); x ? gr.lineTo(L.x + 14 + x, y) : gr.moveTo(L.x + 14 + x, y); } gr.stroke(); }
    TXT(gr, listen ? 'LISTENING…' : 'LISTEN', L.x + L.w / 2, L.y + 32, 24, listen ? '#bfefff' : '#d8ffe8', 'center');
    if (!listen) TXT(gr, 'passive sonar · silent', L.x + L.w / 2, L.y + 60, 16, dim, 'center');
    TXT(gr, 'Q', L.x + L.w - 10, L.y + 22, 16, dim, 'right');
    [['MOVE', 'WASD · arrows · drag'], ['BOOST', 'SHIFT (loud!)'], ['PING', 'SPACE'], ['TOOLS', 'E decoy · F flare']].forEach(([a, b], i) => { TXT(gr, a, 1002, 584 + i * 21, 16, '#7fa597'); TXT(gr, b, 1072, 584 + i * 21, 16, dim); });
  }

  /* ---------- the scope ---------- */
  let caBuf = null, cracks = null, crackFor = -1;
  function caveDraw(gr) {
    const t = K.t, R = SR / Z + 40, x0 = Math.max(0, Math.floor((cam.x - R) / C)), x1 = Math.min(GW - 2, Math.floor((cam.x + R) / C)), y0 = Math.max(0, Math.floor((cam.y - R) / C)), y1 = Math.min(GH - 2, Math.floor((cam.y + R) / C));
    if (!caBuf || caBuf.length !== GW * GH) caBuf = new Float32Array(GW * GH);
    const dots = [];
    for (let y = y0; y <= y1 + 1; y++) for (let x = x0; x <= x1 + 1; x++) {
      const j = y * GW + x; if (!grid[j]) { caBuf[j] = 0; continue; }
      const pa = t - lit[j], sa = t - swl[j]; let a = pa < 7 ? Math.pow(1 - pa / 7, 1.5) : 0;
      if (sa < 3) a = Math.max(a, .7 * (1 - sa / 3)); if (seen[j] && a < .11) a = .11;
      const dx = x * C + 16 - sub.x, dy = y * C + 16 - sub.y, dd = dx * dx + dy * dy; if (dd < 9000) a = Math.max(a, .4 * (1 - dd / 9000));
      if (pa < .3 || sa < .08) a = 2;
      caBuf[j] = a;
      if (a > .16 && sf[j] > .7) { const b = a > 1 ? 11 : Math.min(11, a * 12 | 0), P = dots[b] || (dots[b] = new Path2D()); for (let k = 0; k < 3; k++) P.rect(x * C + hash(j, k) * 28, y * C + hash(j, k + 7) * 28, 2.6, 2.6); }
    }
    gr.globalCompositeOperation = 'lighter'; gr.lineCap = 'round'; gr.lineJoin = 'round';
    dots.forEach((P, b) => { if (P) { gr.fillStyle = `rgba(${G1},${(b + 1) / 12 * .3})`; gr.fill(P); } });
    const red = distort > .15 ? [] : null;
    lay.forEach((L, li) => {
      const B = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = y * GW + x, n = L.sn[i]; if (!n) continue;
        let a = Math.max(caBuf[i], caBuf[i + 1], caBuf[i + GW], caBuf[i + GW + 1]); if (a < .03) continue;
        if (li) a = a > 1 ? .7 : a * .45;
        const b = a > 1 ? 12 : Math.min(11, a * 12 | 0), P = B[b] || (B[b] = new Path2D());
        for (let s = L.s0[i] * 4, e = s + n * 4; s < e; s += 4) { P.moveTo(L.segs[s], L.segs[s + 1]); P.lineTo(L.segs[s + 2], L.segs[s + 3]); }
      }
      B.forEach((P, b) => {
        if (!P) return; const al = b === 12 ? 1 : (b + .5) / 12;
        gr.strokeStyle = `rgba(${G1},${al * .15})`; gr.lineWidth = li ? 6 : 13; gr.stroke(P);
        gr.strokeStyle = b === 12 ? 'rgb(225,255,238)' : `rgba(${G1},${al})`; gr.lineWidth = li ? 1.6 : 3; gr.stroke(P);
        if (red && !li && b > 3) red.push([P, al]);
      });
    });
    if (red) { gr.save(); gr.translate(distort * 8, distort * 2); gr.lineWidth = 3; for (const [P, al] of red) { gr.strokeStyle = `rgba(255,40,40,${al * distort * .75})`; gr.stroke(P); } gr.restore(); }
    gr.globalCompositeOperation = 'source-over';
  }
  function drawBody(gr, pts, a, al) {
    const runs = []; let run = [];
    for (let j = 0; j < pts.length; j++) { if (pts[j]) run.push(Object.assign({ j }, pts[j])); else if (run.length) { runs.push(run); run = []; } }
    if (run.length) runs.push(run);
    for (const rn of runs) {
      const side = rn.map((q, k) => { const p0 = rn[k - 1] || q, p1 = rn[k + 1] || q, d = p0 === p1 ? a : Math.atan2(p0.y - p1.y, p0.x - p1.x); return { q, d, nx: -Math.sin(d), ny: Math.cos(d) }; });
      gr.fillStyle = `rgba(255,45,35,${al * .17})`; gr.strokeStyle = `rgba(255,95,70,${al * .85})`; gr.lineWidth = 2.6;
      if (rn.length === 1) { const q = rn[0]; gr.beginPath(); gr.arc(q.x, q.y, q.r, 0, TAU); gr.fill(); gr.stroke(); }
      else {
        gr.beginPath(); side.forEach((s, i) => { const x = s.q.x + s.nx * s.q.r, y = s.q.y + s.ny * s.q.r; i ? gr.lineTo(x, y) : gr.moveTo(x, y); });
        for (let i = side.length - 1; i >= 0; i--) { const s = side[i]; gr.lineTo(s.q.x - s.nx * s.q.r, s.q.y - s.ny * s.q.r); }
        gr.closePath(); gr.fill(); gr.stroke();
        gr.strokeStyle = `rgba(255,150,110,${al * .45})`; gr.lineWidth = 1.5; gr.beginPath(); rn.forEach((q, i) => i ? gr.lineTo(q.x, q.y) : gr.moveTo(q.x, q.y)); gr.stroke();
      }
      for (const s of side) {
        const q = s.q, cd = Math.cos(s.d), sd = Math.sin(s.d);
        gr.strokeStyle = `rgba(255,110,80,${al * .32})`; gr.lineWidth = 1.5; gr.beginPath(); gr.moveTo(q.x + s.nx * q.r * .85, q.y + s.ny * q.r * .85); gr.quadraticCurveTo(q.x - cd * q.r * .5, q.y - sd * q.r * .5, q.x - s.nx * q.r * .85, q.y - s.ny * q.r * .85); gr.stroke();
        if (q.j > 3 && q.j % 2 === 0) { gr.strokeStyle = `rgba(255,90,70,${al * .75})`; gr.lineWidth = 2; for (const sg of [1, -1]) { gr.beginPath(); gr.moveTo(q.x + s.nx * q.r * sg, q.y + s.ny * q.r * sg); gr.lineTo(q.x + s.nx * (q.r + 17) * sg - cd * 15, q.y + s.ny * (q.r + 17) * sg - sd * 15); gr.stroke(); } }
      }
    }
    const q = pts[0]; if (!q) return;
    const ca = Math.cos(a), sa = Math.sin(a), t = K.t;
    gr.save(); gr.translate(q.x, q.y); gr.rotate(a);
    gr.fillStyle = `rgba(255,50,40,${al * .22})`; gr.strokeStyle = `rgba(255,110,80,${al})`; gr.lineWidth = 3;
    gr.beginPath(); gr.ellipse(q.r * .5, 0, q.r * 1.7, q.r * 1.05, 0, 0, TAU); gr.fill(); gr.stroke();
    gr.lineWidth = 2; gr.strokeStyle = `rgba(255,90,70,${al * .7})`;
    for (let k = 0; k < 4; k++) { const sg = k < 2 ? 1 : -1, o = (k % 2 ? .5 : .85) * q.r * sg; gr.beginPath(); gr.moveTo(q.r * 1.8, o); gr.quadraticCurveTo(q.r * 3, o * 1.6 + Math.sin(t * 2 + k) * 14, q.r * 4.2, o * 2.4 + Math.sin(t * 1.4 + k * 2) * 22); gr.stroke(); }
    gr.restore();
    for (const sg of [1, -1]) {
      const ex = q.x + ca * q.r * 1.1 - sa * q.r * .45 * sg, ey = q.y + sa * q.r * 1.1 + ca * q.r * .45 * sg;
      const eg = gr.createRadialGradient(ex, ey, 0, ex, ey, 16); eg.addColorStop(0, `rgba(255,245,190,${al})`); eg.addColorStop(.3, `rgba(255,190,90,${al * .6})`); eg.addColorStop(1, 'rgba(255,120,40,0)');
      gr.fillStyle = eg; gr.beginPath(); gr.arc(ex, ey, 16, 0, TAU); gr.fill();
    }
  }
  function drawLurker(gr, x, y, a, al, gape) {
    gr.save(); gr.translate(x, y); gr.rotate(a);
    gr.strokeStyle = `rgba(255,90,70,${al})`; gr.fillStyle = `rgba(255,50,40,${al * .2})`; gr.lineWidth = 2.5;
    gr.beginPath(); gr.moveTo(-66, 0); gr.quadraticCurveTo(-30, -18, 4, -13); gr.lineTo(30, -5 - gape * 18); gr.lineTo(12, 0); gr.lineTo(30, 5 + gape * 18); gr.lineTo(4, 13); gr.quadraticCurveTo(-30, 18, -66, 0); gr.fill(); gr.stroke();
    gr.fillStyle = `rgba(255,240,180,${al})`; gr.beginPath(); gr.arc(2, -6, 3, 0, TAU); gr.fill();
    gr.restore();
  }
  function drawSub(gr) {
    const t = K.t; gr.save(); gr.translate(sub.x, sub.y); gr.rotate(sub.a);
    const hl = gr.createRadialGradient(20, 0, 0, 20, 0, 130); hl.addColorStop(0, 'rgba(190,255,225,.16)'); hl.addColorStop(1, 'rgba(190,255,225,0)');
    gr.fillStyle = hl; gr.beginPath(); gr.moveTo(20, 0); gr.arc(20, 0, 130, -.38, .38); gr.closePath(); gr.fill();
    gr.fillStyle = 'rgba(57,255,156,.22)'; gr.beginPath(); gr.ellipse(0, 0, 32, 15, 0, 0, TAU); gr.fill();
    const bg = gr.createLinearGradient(0, -9, 0, 9); bg.addColorStop(0, '#f2fff8'); bg.addColorStop(1, '#7fd8ac');
    gr.fillStyle = bg; gr.beginPath(); gr.ellipse(0, 0, 25, 9, 0, 0, TAU); gr.fill();
    gr.fillStyle = '#bdf5d8'; rr(gr, -6, -14, 13, 7, 3); gr.fill();
    gr.fillStyle = '#04140c'; for (const x of [-10, -2, 6]) { gr.beginPath(); gr.arc(x, 1, 1.8, 0, TAU); gr.fill(); }
    gr.fillStyle = '#ffe9a0'; gr.beginPath(); gr.arc(22, 0, 2.4, 0, TAU); gr.fill();
    const sp = Math.sin(t * (8 + sub.thr * .3)); gr.fillStyle = '#9fe8c4'; gr.fillRect(-30, -7 * sp, 4, 14 * sp);
    gr.restore();
  }
  function world(gr) {
    const t = K.t, view = SR / Z + 60, inV = (x, y, m = 0) => Math.abs(x - cam.x) < view + m && Math.abs(y - cam.y) < view + m;
    gr.globalCompositeOperation = 'lighter';
    for (const f of flares) {
      const FR = 230 * Math.min(1, f.t * 3) * (f.t > f.life - 1 ? f.life - f.t : 1) * (1 + Math.sin(t * 31) * .04); if (FR <= 2) continue;
      const lg = gr.createRadialGradient(f.x, f.y, 0, f.x, f.y, FR * 1.25); lg.addColorStop(0, 'rgba(255,215,140,.55)'); lg.addColorStop(.35, 'rgba(255,150,70,.18)'); lg.addColorStop(1, 'rgba(255,100,40,0)');
      gr.fillStyle = lg; gr.beginPath(); gr.arc(f.x, f.y, FR * 1.25, 0, TAU); gr.fill();
    }
    for (const c of currents) if (inV(c.x, c.y, c.r)) {
      const nx = -c.dy, ny = c.dx;
      for (let k = 0; k < 6; k++) {
        const ph = (t * .45 + k / 6) % 1, d = (ph - .5) * c.r * 1.7, side = ((k % 3) - 1) * c.r * .35, x = c.x + c.dx * d + nx * side, y = c.y + c.dy * d + ny * side, al = Math.sin(ph * Math.PI) * .3;
        gr.strokeStyle = `rgba(120,210,255,${al})`; gr.lineWidth = 2.5; gr.beginPath(); gr.moveTo(x - c.dx * 12 + nx * 10, y - c.dy * 12 + ny * 10); gr.lineTo(x + c.dx * 4, y + c.dy * 4); gr.lineTo(x - c.dx * 12 - nx * 10, y - c.dy * 12 - ny * 10); gr.stroke();
      }
    }
    for (const s of silt) { gr.fillStyle = `rgba(160,255,210,${.05 + .1 * s.z})`; gr.fillRect(s.x, s.y, s.s, s.s); }
    gr.globalCompositeOperation = 'source-over';
    caveDraw(gr);
    gr.globalCompositeOperation = 'lighter';
    const objA = (o, near = 120) => Math.max(t - o.seenT < 6 ? 1 - (t - o.seenT) / 6 : 0, o.mem ? .24 : 0, K.dist(o.x, o.y, sub.x, sub.y) < near ? .85 : 0);
    gr.font = FONT(22); gr.textAlign = 'center'; gr.textBaseline = 'middle';
    for (const e of eggs) {
      const al = e.angry ? 1 : objA(e, 170); if (al <= 0 || !inV(e.x, e.y)) continue; const col = e.angry ? (Math.sin(t * 20) > 0 ? '255,70,90' : '255,160,120') : '205,130,255';
      for (const p of e.pods) {
        const pr = p.r * (1 + .1 * Math.sin(t * 2.2 + p.ph));
        gr.fillStyle = `rgba(${col},${al * .16})`; gr.beginPath(); gr.arc(p.x, p.y, pr * 1.9, 0, TAU); gr.fill();
        gr.strokeStyle = `rgba(${col},${al * .9})`; gr.lineWidth = 2; gr.beginPath(); gr.arc(p.x, p.y, pr, 0, TAU); gr.stroke();
        gr.fillStyle = `rgba(${col},${al * .7})`; gr.beginPath(); gr.arc(p.x + Math.sin(t + p.ph) * 2, p.y, pr * .3, 0, TAU); gr.fill();
      }
    }
    for (const rk of rocks) {
      const al = Math.max(objA(rk, 140), rk.fall && !rk.done ? 1 : 0); if (al <= 0 || !inV(rk.ox, rk.oy)) continue;
      const k = rk.done ? 1 : Math.pow(Math.min(1, rk.fall), 2), x = K.lerp(rk.x, rk.ox, k), y = K.lerp(rk.y, rk.oy, k);
      gr.strokeStyle = `rgba(255,190,90,${al * (rk.done ? .4 : .9)})`; gr.lineWidth = 2.5;
      if (rk.done) { for (let n = 0; n < 6; n++) { gr.beginPath(); gr.arc(rk.ox + (hash(n, 3) - .5) * 70, rk.oy + (hash(n, 9) - .5) * 50, 5 + hash(n, 5) * 9, 0, TAU); gr.stroke(); } continue; }
      gr.beginPath(); for (let n = 0; n < 8; n++) { const a = n / 8 * TAU + k * 3, r = 18 + hash(n, 1) * 12; n ? gr.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : gr.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } gr.closePath(); gr.stroke();
      gr.beginPath(); gr.moveTo(x - 10, y - 6); gr.lineTo(x, y + 3); gr.lineTo(x + 8, y - 4); gr.stroke();
      if (!rk.fall && al > .3) { gr.fillStyle = `rgba(255,190,90,${al})`; gr.fillText('!', x, y - 42); }
    }
    for (const it of items) {
      if (it.got) continue; const al = objA(it); if (al <= 0) continue;
      gr.save(); gr.translate(it.x, it.y); gr.rotate(t * .8); gr.strokeStyle = `rgba(255,201,74,${al})`; gr.lineWidth = 3; gr.strokeRect(-12, -12, 24, 24); gr.fillStyle = `rgba(255,201,74,${al * .8})`; gr.fillRect(-5, -5, 10, 10); gr.restore();
      const pr = (t * 26) % 30; gr.strokeStyle = `rgba(255,201,74,${al * (1 - pr / 30) * .7})`; gr.lineWidth = 2; gr.beginPath(); gr.arc(it.x, it.y, 18 + pr, 0, TAU); gr.stroke();
      gr.fillStyle = `rgba(255,220,140,${al})`; gr.fillText('PART', it.x, it.y - 36);
    }
    for (const lg of logs) {
      if (lg.got) continue; const al = objA(lg); if (al <= 0) continue;
      gr.strokeStyle = `rgba(159,216,255,${al})`; gr.lineWidth = 3; gr.strokeRect(lg.x - 13, lg.y - 9, 26, 18); gr.fillStyle = `rgba(255,70,60,${al * (Math.sin(t * 6) > 0 ? 1 : .2)})`; gr.beginPath(); gr.arc(lg.x + 6, lg.y - 2, 3, 0, TAU); gr.fill();
      gr.fillStyle = `rgba(190,230,255,${al})`; gr.fillText('BLACK BOX', lg.x, lg.y - 32);
    }
    {
      const open = got >= 3, al = open ? 1 : objA(hatch); if (al > 0) {
        const col = open ? '95,244,255' : '70,150,120'; gr.strokeStyle = `rgba(${col},${al})`; gr.lineWidth = 4; gr.beginPath(); gr.arc(hatch.x, hatch.y, 24 + (open ? Math.sin(t * 4) * 3 : 0), 0, TAU); gr.stroke();
        gr.lineWidth = 2; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + (open ? t : 0); gr.beginPath(); gr.moveTo(hatch.x + Math.cos(a) * 8, hatch.y + Math.sin(a) * 8); gr.lineTo(hatch.x + Math.cos(a) * 20, hatch.y + Math.sin(a) * 20); gr.stroke(); }
        if (open) { const pr = (t * 40) % 60; gr.strokeStyle = `rgba(95,244,255,${1 - pr / 60})`; gr.beginPath(); gr.arc(hatch.x, hatch.y, 26 + pr, 0, TAU); gr.stroke(); }
        gr.fillStyle = `rgba(${col},${al})`; gr.fillText(open ? 'HATCH' : 'HATCH · SEALED', hatch.x, hatch.y - 44);
      }
    }
    for (const p of pings) {
      const al = (1 - p.r / p.range) * (p.kind === 'sub' ? 1 : .55), col = p.kind === 'sub' ? G1 : '140,220,255', P = new Path2D(); let on = false;
      for (let k = 0; k <= RAYS; k += 2) { const kk = k % RAYS, a = kk / RAYS * TAU; if (p.r < p.rays[kk]) { const x = p.x + Math.cos(a) * p.r, y = p.y + Math.sin(a) * p.r; on ? P.lineTo(x, y) : P.moveTo(x, y); on = true; } else on = false; }
      gr.strokeStyle = `rgba(${col},${al * .18})`; gr.lineWidth = 16; gr.stroke(P); gr.strokeStyle = `rgba(${col},${al})`; gr.lineWidth = 3; gr.stroke(P);
    }
    for (const gh of ghosts) {
      const al = Math.max(0, 1 - (t - gh.t) / 3) * (gh.sw ? .75 : 1); if (al <= 0) continue;
      if (gh.k === 'body') drawBody(gr, gh.pts, gh.a, al);
      else if (gh.k === 'lurk') drawLurker(gr, gh.x, gh.y, gh.a, al * .9, .2);
      else { gr.save(); gr.translate(gh.x, gh.y); gr.rotate(gh.a); gr.strokeStyle = `rgba(255,90,200,${al})`; gr.lineWidth = 2; gr.beginPath(); gr.moveTo(9, 0); gr.lineTo(-6, -6); gr.lineTo(-3, 0); gr.lineTo(-6, 6); gr.closePath(); gr.stroke(); gr.restore(); }
    }
    for (const l of lurkers) {
      if (!inV(l.x, l.y)) continue;
      if (l.st === 'lunge') drawLurker(gr, l.x, l.y, l.a, 1, .9);
      const pu = .5 + .5 * Math.sin(t * 2 + l.ph), lx = l.x + Math.cos(l.a) * 46 - Math.sin(l.a) * Math.sin(t * 1.3 + l.ph) * 6, ly = l.y + Math.sin(l.a) * 46 + Math.cos(l.a) * Math.sin(t * 1.3 + l.ph) * 6;
      const lg = gr.createRadialGradient(lx, ly, 0, lx, ly, 18); lg.addColorStop(0, `rgba(200,255,240,${.5 + .4 * pu})`); lg.addColorStop(1, 'rgba(120,255,220,0)');
      gr.fillStyle = lg; gr.beginPath(); gr.arc(lx, ly, 18, 0, TAU); gr.fill();
    }
    for (const s of stalkers) {
      const d = K.dist(s.x, s.y, sub.x, sub.y); if (d > 260 || GAME._pose) continue;
      const al = (1 - d / 260) * (.55 + .45 * Math.sin(t * 2.5)), ca = Math.cos(s.a), sa = Math.sin(s.a);
      for (const sg of [1, -1]) { const ex = s.x + ca * 30 - sa * 12 * sg, ey = s.y + sa * 30 + ca * 12 * sg; gr.fillStyle = `rgba(255,220,150,${al * .25})`; gr.beginPath(); gr.arc(ex, ey, 10, 0, TAU); gr.fill(); gr.fillStyle = `rgba(255,240,200,${al})`; gr.beginPath(); gr.arc(ex, ey, 3, 0, TAU); gr.fill(); }
    }
    for (const d of decoys) { const b = Math.sin(t * 12) > 0; gr.fillStyle = `rgba(150,225,255,${b ? 1 : .4})`; gr.beginPath(); gr.arc(d.x, d.y, 5, 0, TAU); gr.fill(); gr.strokeStyle = 'rgba(150,225,255,.4)'; gr.lineWidth = 2; gr.beginPath(); gr.arc(d.x, d.y, 12, 0, TAU); gr.stroke(); }
    for (const f of flares) { gr.fillStyle = '#fff4cc'; gr.beginPath(); gr.arc(f.x, f.y, 5, 0, TAU); gr.fill(); }
    for (const p of fxp) {
      const k = 1 - p.life / p.max;
      if (p.k === 'bub') { gr.strokeStyle = `rgba(170,255,220,${k * .45})`; gr.lineWidth = 1.2; gr.beginPath(); gr.arc(p.x, p.y, p.s, 0, TAU); gr.stroke(); }
      else { const c = p.k === 'spark' ? '255,230,150' : p.k === 'flare' ? '255,170,80' : p.k === 'gold' ? '255,210,90' : '190,160,120', s = p.k === 'rock' ? p.s : 3.5; gr.fillStyle = `rgba(${c},${k})`; gr.fillRect(p.x - s / 2, p.y - s / 2, s, s); }
    }
    if (noiseR > 30 || evR > 40) {
      const nr = Math.max(noiseR, evR), col = nr > 450 ? '255,80,60' : nr > 200 ? '255,200,80' : G1;
      gr.setLineDash([10, 12]); gr.lineDashOffset = -t * 40; gr.strokeStyle = `rgba(${col},.4)`; gr.lineWidth = 2.5; gr.beginPath(); gr.arc(sub.x, sub.y, nr, 0, TAU); gr.stroke(); gr.setLineDash([]);
    }
    gr.globalCompositeOperation = 'source-over';
    if (!(dead && deathHow === 'beast')) drawSub(gr);
  }
  function scanPat(gr) {
    if (!scan) { const c = document.createElement('canvas'); c.width = 4; c.height = 4; const p = c.getContext('2d'); p.fillStyle = 'rgba(0,0,0,.3)'; p.fillRect(0, 2, 4, 2); scan = gr.createPattern(c, 'repeat'); }
    return scan;
  }
  function deathBeast(gr, t) {
    gr.fillStyle = '#0d0101'; gr.fillRect(SX - SR, SY - SR, SR * 2, SR * 2);
    const ex = SX + 70, ey = SY - 40, ring = (t - .3) * 560, s = 1 + t * .05;
    gr.save(); gr.beginPath(); gr.arc(SX, SY, Math.max(1, ring), 0, TAU); gr.clip();
    gr.translate(SX, SY + 20); gr.scale(s, s); gr.translate(-SX, -SY - 20);
    gr.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 12; k++) {
      const f = 1 - k * .078, cx = SX + (ex - SX) * (1 - f), cy = SY + 30 + (ey - SY - 30) * (1 - f);
      gr.beginPath();
      for (let i = 0; i <= 96; i++) { const th = i / 96 * TAU, w = 1 + .07 * Math.sin(th * 5 + k * .7) + .04 * Math.sin(th * 11 - k) + .025 * Math.sin(t * 2 + th * 3), x = cx + Math.cos(th) * 390 * f * w, y = cy + Math.sin(th) * 260 * f * w; i ? gr.lineTo(x, y) : gr.moveTo(x, y); }
      gr.closePath(); gr.strokeStyle = `rgba(255,${60 + k * 9},${45 + k * 5},${.14 + k * .05})`; gr.lineWidth = 2; gr.stroke();
    }
    gr.strokeStyle = 'rgba(255,80,60,.35)'; gr.lineWidth = 3;
    for (let i = 0; i < 8; i++) { const x0 = SX - 260 + i * 70; gr.beginPath(); gr.moveTo(x0, SY + 230); gr.bezierCurveTo(x0 + Math.sin(t * 1.5 + i) * 40, SY + 300, x0 - 30 + Math.sin(t + i * 2) * 60, SY + 360, x0 + Math.sin(t * .8 + i) * 80, SY + 420); gr.stroke(); }
    gr.strokeStyle = 'rgba(255,90,60,.5)'; gr.lineWidth = 4; gr.beginPath(); gr.moveTo(SX - 250, SY + 120); gr.quadraticCurveTo(SX + 20, SY + 200 + Math.sin(t * 3) * 6, SX + 280, SY + 110); gr.stroke();
    const op = K.clamp((t - 1) / .5, 0, 1), sq = K.clamp((t - 1.8) / .7, 0, 1);
    if (op > 0) {
      const eg = gr.createRadialGradient(ex, ey, 0, ex, ey, 170); eg.addColorStop(0, `rgba(255,170,60,${.45 * op})`); eg.addColorStop(1, 'rgba(255,80,20,0)'); gr.fillStyle = eg; gr.beginPath(); gr.arc(ex, ey, 170, 0, TAU); gr.fill();
      gr.globalCompositeOperation = 'source-over';
      gr.save(); gr.beginPath(); gr.ellipse(ex, ey, 100, 56 * op, -.08, 0, TAU); gr.clip();
      const ir = gr.createRadialGradient(ex, ey, 4, ex, ey, 70); ir.addColorStop(0, '#fff3b8'); ir.addColorStop(.35, '#ffb23a'); ir.addColorStop(.8, '#b23a0c'); ir.addColorStop(1, '#2a0600');
      gr.fillStyle = '#1a0402'; gr.fillRect(ex - 110, ey - 70, 220, 140); gr.fillStyle = ir; gr.beginPath(); gr.arc(ex, ey, 70, 0, TAU); gr.fill();
      gr.strokeStyle = 'rgba(90,20,0,.45)'; gr.lineWidth = 2; for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; gr.beginPath(); gr.moveTo(ex + Math.cos(a) * 18, ey + Math.sin(a) * 18); gr.lineTo(ex + Math.cos(a) * 66, ey + Math.sin(a) * 66); gr.stroke(); }
      gr.fillStyle = '#000'; gr.beginPath(); gr.ellipse(ex + Math.sin(t * 1.3) * 3, ey, 6 + 16 * (1 - sq), 62, 0, 0, TAU); gr.fill();
      gr.fillStyle = 'rgba(255,255,255,.85)'; gr.beginPath(); gr.arc(ex - 26, ey - 20, 7, 0, TAU); gr.fill();
      gr.restore();
      gr.strokeStyle = 'rgba(255,130,90,.85)'; gr.lineWidth = 3; gr.beginPath(); gr.ellipse(ex, ey, 100, 56 * op, -.08, 0, TAU); gr.stroke();
    }
    gr.globalCompositeOperation = 'source-over'; gr.restore();
    if (ring < SR * 1.5) { gr.strokeStyle = `rgba(255,90,70,${Math.max(0, 1 - ring / (SR * 1.5))})`; gr.lineWidth = 4; gr.beginPath(); gr.arc(SX, SY, Math.max(1, ring), 0, TAU); gr.stroke(); }
    if (t > 2.1) glitchText(gr, 'SIGNAL LOST', SX, SY + 250, 42);
  }
  function deathOther(gr, t) {
    gr.fillStyle = `rgba(0,0,0,${Math.min(.75, t / 2.2)})`; gr.fillRect(SX - SR, SY - SR, SR * 2, SR * 2);
    if (deathHow === 'hull') {
      if (crackFor !== deathT) { crackFor = deathT; cracks = []; const cx = SX + K.rand(-90, 90), cy = SY + K.rand(-90, 90); for (let k = 0; k < 10; k++) { let a = k / 10 * TAU + K.rand(-.2, .2), x = cx, y = cy; const pts = [[x, y]]; for (let s = 0; s < 8; s++) { a += K.rand(-.5, .5); const l = K.rand(30, 70); x += Math.cos(a) * l; y += Math.sin(a) * l; pts.push([x, y]); } cracks.push(pts); } }
      const k = Math.min(1, t * 3); gr.strokeStyle = 'rgba(225,255,240,.8)'; gr.lineWidth = 2;
      for (const c of cracks) { gr.beginPath(); c.slice(0, Math.ceil(c.length * k)).forEach(([x, y], i) => i ? gr.lineTo(x, y) : gr.moveTo(x, y)); gr.stroke(); }
    } else {
      gr.strokeStyle = 'rgba(170,255,220,.5)'; gr.lineWidth = 2;
      for (let i = 0; i < 34; i++) { const y = SY + SR - ((t * 110 + i * 47) % (SR * 2)), x = SX + Math.sin(i * 12.9) * SR * .8 + Math.sin(t * 2 + i) * 8; gr.beginPath(); gr.arc(x, y, 3 + i % 6, 0, TAU); gr.stroke(); }
    }
    if (t > .5) glitchText(gr, deathHow === 'hull' ? 'HULL BREACH' : 'OUT OF AIR', SX, SY + 150, 44);
  }
  function scope(gr) {
    const t = K.t;
    gr.save(); gr.beginPath(); gr.arc(SX, SY, SR, 0, TAU); gr.clip();
    const bg = gr.createRadialGradient(SX, SY, 0, SX, SY, SR); bg.addColorStop(0, listen ? '#04202a' : '#052a1a'); bg.addColorStop(1, '#010604'); gr.fillStyle = bg; gr.fillRect(SX - SR, SY - SR, SR * 2, SR * 2);
    const dt0 = t - deathT;
    if (dead && deathHow === 'beast' && dt0 > .3) deathBeast(gr, dt0);
    else {
      gr.strokeStyle = 'rgba(57,255,156,.09)'; gr.lineWidth = 1.5;
      for (let k = 1; k <= 3; k++) { gr.beginPath(); gr.arc(SX, SY, SR * k / 4, 0, TAU); gr.stroke(); }
      gr.beginPath(); gr.moveTo(SX - SR, SY); gr.lineTo(SX + SR, SY); gr.moveTo(SX, SY - SR); gr.lineTo(SX, SY + SR); gr.stroke();
      for (let k = 1; k <= 3; k++) TXT(gr, Math.round(SR * k / 4 / Z * .25) + ' m', SX + 6, SY - SR * k / 4 - 6, 16, 'rgba(57,255,156,.32)');
      const j = distort > .05 && !GAME._pose ? distort * 5 : 0;
      gr.save(); gr.translate(SX + (Math.random() - .5) * j, SY + (Math.random() - .5) * j); gr.scale(Z, Z); gr.translate(-cam.x, -cam.y);
      world(gr); gr.restore();
      // the sweep
      gr.globalCompositeOperation = 'lighter';
      if (listen && !dead) { for (let k = 0; k < 3; k++) { const r = ((t * .5 + k / 3) % 1) * SR; gr.strokeStyle = `rgba(120,220,255,${.3 * (1 - r / SR)})`; gr.lineWidth = 2; gr.beginPath(); gr.arc(SX, SY, r, 0, TAU); gr.stroke(); } }
      else {
        const a0 = sweep;
        for (let k = 0; k < 26; k++) { gr.fillStyle = `rgba(57,255,156,${.16 * Math.pow(1 - k / 26, 1.5)})`; gr.beginPath(); gr.moveTo(SX, SY); gr.arc(SX, SY, SR, a0 - (k + 1) * .042, a0 - k * .042); gr.closePath(); gr.fill(); }
        gr.strokeStyle = 'rgba(170,255,210,.75)'; gr.lineWidth = 2; gr.beginPath(); gr.moveTo(SX, SY); gr.lineTo(SX + Math.cos(a0) * SR, SY + Math.sin(a0) * SR); gr.stroke();
        gr.setLineDash([4, 8]); gr.strokeStyle = 'rgba(57,255,156,.2)'; gr.beginPath(); gr.arc(SX, SY, PR * Z, 0, TAU); gr.stroke(); gr.setLineDash([]);
      }
      gr.globalCompositeOperation = 'source-over';
      if (listen && !dead) TXT(gr, 'PASSIVE · LISTENING', SX, SY + SR - 34, 16, 'rgba(160,230,255,.8)', 'center');
      if (dead && deathHow !== 'beast') deathOther(gr, dt0);
    }
    if (distort > .03) { gr.fillStyle = `rgba(255,0,0,${distort * .14 * (.6 + .4 * Math.sin(t * 8))})`; gr.fillRect(SX - SR, SY - SR, SR * 2, SR * 2); }
    gr.fillStyle = scanPat(gr); gr.fillRect(SX - SR, SY - SR, SR * 2, SR * 2);
    const vg = gr.createRadialGradient(SX, SY, SR * .55, SX, SY, SR); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.72)'); gr.fillStyle = vg; gr.fillRect(SX - SR, SY - SR, SR * 2, SR * 2);
    gr.strokeStyle = 'rgba(220,255,240,.05)'; gr.lineWidth = 16; gr.beginPath(); gr.arc(SX, SY, SR - 16, 3.5, 4.7); gr.stroke(); gr.lineWidth = 6; gr.beginPath(); gr.arc(SX, SY, SR - 34, 3.7, 4.4); gr.stroke();
    // interference: torn scanlines and static when it is close
    const beastD = dead && deathHow === 'beast', tear = GAME._pose ? 0 : beastD ? (dt0 < .6 ? 1 : .25) : distort * .8 + scare;
    if (tear > .05) {
      const m = gr.getTransform(), cnv = gr.canvas, n = 1 + (tear * 7) | 0;
      for (let i = 0; i < n; i++) {
        const y = SY - SR + Math.random() * SR * 2, h = 4 + Math.random() * 28, off = (Math.random() - .5) * tear * 50;
        const dy = m.d * y + m.f, dh = m.d * h, dx0 = m.a * (SX - SR) + m.e, dw = m.a * SR * 2;
        gr.save(); gr.setTransform(1, 0, 0, 1, 0, 0); gr.drawImage(cnv, dx0, dy, dw, dh, dx0 + off * m.a, dy, dw, dh); gr.restore();
      }
      for (let i = 0; i < 260 * tear; i++) { gr.fillStyle = Math.random() < .5 ? `rgba(255,90,80,${Math.random() * .5})` : `rgba(160,255,200,${Math.random() * .4})`; gr.fillRect(SX - SR + Math.random() * SR * 2, SY - SR + Math.random() * SR * 2, 2 + Math.random() * 4, 2); }
    }
    if (beastD && dt0 < .35) { gr.fillStyle = `rgba(255,235,225,${(1 - dt0 / .35) * .9})`; gr.fillRect(SX - SR, SY - SR, SR * 2, SR * 2); }
    if (scare > 0) { gr.fillStyle = `rgba(255,40,30,${scare * .25})`; gr.fillRect(SX - SR, SY - SR, SR * 2, SR * 2); }
    gr.restore();
    // bezel ring and bearing ticks
    const rd = Math.max(distort, beastD ? 1 : 0, scare);
    const rc = `${Math.round(57 + 198 * rd)},${Math.round(255 - 185 * rd)},${Math.round(156 - 96 * rd)}`;
    gr.strokeStyle = `rgba(${rc},.16)`; gr.lineWidth = 12; gr.beginPath(); gr.arc(SX, SY, SR, 0, TAU); gr.stroke();
    gr.strokeStyle = `rgba(${rc},.9)`; gr.lineWidth = 3; gr.stroke();
    gr.strokeStyle = `rgba(${rc},.5)`; gr.lineWidth = 1.5; gr.beginPath();
    for (let d = 0; d < 360; d += 5) { const a = (d - 90) / 180 * Math.PI, r1 = SR - (d % 30 === 0 ? 15 : d % 10 === 0 ? 9 : 5); gr.moveTo(SX + Math.cos(a) * r1, SY + Math.sin(a) * r1); gr.lineTo(SX + Math.cos(a) * SR, SY + Math.sin(a) * SR); }
    gr.stroke();
  }
  function rim(gr) {
    if (dead || GAME._pose) return;
    const t = K.t, inView = (x, y) => K.dist(x, y, cam.x, cam.y) < SR / Z * .8;
    const mark = (x, y, col, al, sz) => {
      if (inView(x, y)) return; const a = Math.atan2(y - sub.y, x - sub.x), r = SR - 30;
      gr.save(); gr.translate(SX + Math.cos(a) * r, SY + Math.sin(a) * r); gr.rotate(a); gr.fillStyle = `rgba(${col},${al})`;
      gr.beginPath(); gr.moveTo(sz, 0); gr.lineTo(-sz * .8, sz * .75); gr.lineTo(-sz * .4, 0); gr.lineTo(-sz * .8, -sz * .75); gr.closePath(); gr.fill(); gr.restore();
    };
    if (got >= 3) mark(hatch.x, hatch.y, '95,244,255', .65 + .35 * Math.sin(t * 5), 20);
    for (const it of items) if (!it.got && (it.mem || listen)) mark(it.x, it.y, '255,201,74', listen ? .6 + .4 * Math.sin(t * 6) : .6, 14);
    if (listen) for (const lg of logs) if (!lg.got) mark(lg.x, lg.y, '159,216,255', .5 + .4 * Math.sin(t * 4 + 1), 12);
    const arc = (a, w, col, al, lw = 10) => { gr.strokeStyle = `rgba(${col},${al})`; gr.lineWidth = lw; gr.beginPath(); gr.arc(SX, SY, SR - 8, a - w, a + w); gr.stroke(); };
    for (const b of bear) arc(b.a, b.w, b.c, Math.max(0, 1 - (t - b.t) / 3) * .85);
    if (listen) {
      for (const s of stalkers) { const d = K.dist(s.x, s.y, sub.x, sub.y); if (d < 2200) { const k = 1 - d / 2200; arc(Math.atan2(s.y - sub.y, s.x - sub.x) + Math.sin(t * 7) * .03, .07 + .3 * k, '255,74,60', (.35 + .6 * k) * (.7 + .3 * Math.sin(t * 9)), 12); } }
      for (const m of mites) { const d = K.dist(m.x, m.y, sub.x, sub.y); if (d < 900 && Math.random() < .5) arc(Math.atan2(m.y - sub.y, m.x - sub.x), .03, '255,90,200', .7 * (1 - d / 900), 8); }
    }
  }
  function texts(gr) {
    if (GAME._pose || station) return;
    if (msgT > 0 && !dead) { gr.globalAlpha = Math.min(1, msgT * 2); pill(gr, [msg], SX, 60, 22, '#d8ffe8', 'rgba(57,255,156,.5)'); gr.globalAlpha = 1; }
    if (logView && !dead) {
      const L = LOGS[logView.i], dur = L.length / 26 + 5, n = Math.floor(logView.t * 26); gr.font = FONT(19); const lines = wrap(gr, L, 520), h = 50 + lines.length * 26, y = 676 - h;
      gr.globalAlpha = Math.min(1, logView.t * 4, (dur - logView.t) * 2);
      rr(gr, 370, y, 540, h, 10); gr.fillStyle = 'rgba(2,8,14,.92)'; gr.fill(); gr.strokeStyle = '#9fd8ff'; gr.lineWidth = 1.5; gr.stroke();
      TXT(gr, `◉ BLACK BOX · HALCYON · ${logView.i + 1}/${LOGS.length}`, 388, y + 26, 16, '#ffc94a');
      let left = n; lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, left)), cur = left >= 0 && left <= l.length && Math.sin(K.t * 12) > 0; left -= l.length + 1; TXT(gr, s + (cur ? '▌' : ''), 388, y + 52 + i * 26, 19, '#e6fff0'); });
      gr.globalAlpha = 1;
    } else if (hintT > 0 && hint && !dead) {
      gr.globalAlpha = Math.max(0, Math.min(1, hintT * 2, (6.5 - hintT) * 3)); gr.font = FONT(19); pill(gr, wrap(gr, hint.text, 520), SX, 586, 19, '#bfffe0', 'rgba(57,255,156,.45)'); gr.globalAlpha = 1;
    }
  }
  function stationDraw(gr) {
    const v = K.view, t = station.t; gr.fillStyle = 'rgba(1,7,5,.92)'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    gr.globalAlpha = Math.min(1, t * 3);
    gr.strokeStyle = 'rgba(57,255,156,.06)'; gr.lineWidth = 1; for (let y = 0; y < 720; y += 24) { gr.beginPath(); gr.moveTo(0, y); gr.lineTo(1280, y); gr.stroke(); }
    TXT(gr, 'DIVE STATION', 640, 62, 44, '#7dffc0', 'center');
    TXT(gr, station.note, 640, 98, 20, '#9fcdb8', 'center');
    TXT(gr, `NEXT: DIVE ${level} · ${depthM()} m`, 121, 140, 20, '#5ff4ff');
    TXT(gr, `SALVAGE ◆ ${totalSalvage()}`, 1159, 140, 22, '#ffc94a', 'right');
    UPS.forEach((u, i) => {
      const [x, y] = cardXY(i), lv = up(u.k), c = cost(u), can = c !== undefined && totalSalvage() >= c, fl = station.flash === i && station.fT > 0;
      rr(gr, x, y, 330, 150, 12); gr.fillStyle = fl ? 'rgba(80,10,10,.9)' : 'rgba(8,26,19,.95)'; gr.fill(); gr.strokeStyle = fl ? '#ff5a4a' : can ? '#39ff9c' : '#24433a'; gr.lineWidth = 2; gr.stroke();
      TXT(gr, `[${i + 1}]`, x + 16, y + 34, 16, '#5f8277'); TXT(gr, u.n, x + 62, y + 34, 22, '#d8ffe8');
      TXT(gr, u.d, x + 16, y + 70, 18, '#9fcdb8');
      for (let j = 0; j < u.c.length; j++) { gr.fillStyle = j < lv ? '#39ff9c' : 'rgba(57,255,156,.12)'; gr.fillRect(x + 16 + j * 34, y + 104, 28, 14); }
      TXT(gr, c === undefined ? 'MAX' : `◆ ${c}`, x + 314, y + 132, 22, c === undefined ? '#5ff4ff' : can ? '#ffc94a' : '#7a5a4a', 'right');
    });
    const logsN = (sv().logs || []).length;
    TXT(gr, `BLACK BOX ARCHIVE ${logsN}/${LOGS.length}`, 121, 520, 18, '#9fd8ff');
    if (logsN) { gr.font = FONT(17); wrap(gr, '"' + LOGS[sv().logs[logsN - 1]] + '"', 1038).slice(0, 2).forEach((l, i) => TXT(gr, l, 121, 546 + i * 22, 17, '#cfe9dd')); }
    else TXT(gr, 'No crew logs recovered yet. Look for blinking black boxes in the dark.', 121, 546, 17, '#6f8f84');
    const pu = .5 + .5 * Math.sin(t * 4);
    rr(gr, 520, 604, 240, 76, 14); gr.fillStyle = `rgba(57,255,156,${.12 + pu * .1})`; gr.fill(); gr.strokeStyle = '#39ff9c'; gr.lineWidth = 3; gr.stroke();
    TXT(gr, 'DIVE ▼', 640, 646, 32, '#d8ffe8', 'center', 'middle'); TXT(gr, 'SPACE · 1-6 to buy', 640, 702, 16, '#5f8277', 'center');
    gr.globalAlpha = 1;
  }

  GAME.draw = gr => {
    if (!sub || !lay) return;
    panelBg(gr); panels(gr); scope(gr); rim(gr); texts(gr);
    const v = K.view;
    if (hurtT > 0 && !dead) { const hg = gr.createRadialGradient(640, 360, 300, 640, 360, 800); hg.addColorStop(0, 'rgba(255,30,20,0)'); hg.addColorStop(1, `rgba(255,30,20,${hurtT * .55})`); gr.fillStyle = hg; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
    if (win) {
      gr.fillStyle = `rgba(0,0,0,${Math.min(.92, win / 1.6)})`; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
      gr.globalAlpha = K.clamp((win - .5) * 2, 0, 1);
      TXT(gr, 'DESCENDING', 640, 320, 30, '#5ff4ff', 'center', 'middle');
      TXT(gr, String(Math.round(depthM() + K.clamp(win / 2.4, 0, 1) * 250)).padStart(4, '0') + ' m', 640, 380, 60, '#d8ffe8', 'center', 'middle');
      gr.globalAlpha = 1;
    }
    if (station) stationDraw(gr);
  };
})();
