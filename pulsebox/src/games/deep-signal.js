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
  let grid, vent, sf, wd, lit, swl, seen, segs, sq0, sqn, inten, lc, lcx, lcd, oc, ocx, ocN = 0, panelC = null, panelKey = '', scan = null;
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
    const tmp = [], fr = (u, v) => (.5 - u) / (v - u); sq0 = new Int32Array(GW * GH); sqn = new Uint8Array(GW * GH);
    for (let y = 0; y < GH - 1; y++) for (let x = 0; x < GW - 1; x++) {
      const a = S(x, y), b = S(x + 1, y), c = S(x + 1, y + 1), d = S(x, y + 1), i = y * GW + x;
      const e = MS[(a > .5 ? 8 : 0) | (b > .5 ? 4 : 0) | (c > .5 ? 2 : 0) | (d > .5 ? 1 : 0)]; sq0[i] = tmp.length / 4; if (!e) continue;
      const X = (x + .5) * C, Y = (y + .5) * C;
      const P = k => k === 0 ? [X + C * fr(a, b), Y] : k === 1 ? [X + C, Y + C * fr(b, c)] : k === 2 ? [X + C * fr(d, c), Y + C] : [X, Y + C * fr(a, d)];
      for (let j = 0; j < e.length; j += 2) { const p = P(e[j]), r = P(e[j + 1]); tmp.push(p[0], p[1], r[0], r[1]); sqn[i]++; }
    }
    segs = new Float32Array(tmp);
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
  const BT = { ping: { x: 1118, y: 270, r: 86 }, decoy: { x: 984, y: 394, w: 130, h: 100 }, flare: { x: 1122, y: 394, w: 130, h: 100 }, listen: { x: 984, y: 508, w: 268, h: 84 } };
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
    const vmax = boosting ? 172 : 92, k = Math.min(1, dt * (thr > 0 ? 1.7 : 1.1));
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
    noiseR = sub.thr > 3 ? (55 + sub.thr * sub.thr * .0135) * (1 - .2 * up('quiet')) + (boosting ? 160 : 0) : listen ? 0 : 22;
    if (sub.thr > 20 && Math.random() < dt * (boosting ? 30 : 10)) fxp.push({ x: sub.x - ca * 27 + K.rand(-3, 3), y: sub.y - sa * 27 + K.rand(-3, 3), vx: -ca * 40 + K.rand(-15, 15), vy: -sa * 40 + K.rand(-15, 15), life: 0, max: K.rand(.8, 1.6), k: 'bub', s: K.rand(1.5, 3.5) });
  }
