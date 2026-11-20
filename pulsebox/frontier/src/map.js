// The survey map (M): a parchment chart drawn tile by tile in the workers, revealed as you explore, with the camp,
// you, your bearing and your own markers. Drag to pan, wheel or +/- to zoom, click to set a marker, click a marker
// to clear it. Also the compass strip along the top of the screen, with an optional heading to camp.
const $ = s => document.querySelector(s);
const CELL = 64, REVEAL = 170;

export class SurveyMap {
  constructor(G) {
    this.G = G; this.tiles = new Map(); this.explored = new Set(); this.markers = []; this.guide = true; this.trail = [];
    this.view = { x: 0, z: 0, mpp: 3 }; this.revealT = 0;
    this.el = $('#map'); this.cv = $('#mapcv'); this.ctx = this.cv.getContext('2d');
    this.comp = $('#compass'); this.cc = this.comp.getContext('2d');
    let drag = null;
    this.cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, vx: this.view.x, vz: this.view.z, moved: false }; this.cv.setPointerCapture(e.pointerId); });
    this.cv.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; this.view.x = drag.vx - dx * this.view.mpp; this.view.z = drag.vz - dy * this.view.mpp; });
    this.cv.addEventListener('pointerup', e => { if (drag && !drag.moved) this.click(e); drag = null; });
    this.cv.addEventListener('wheel', e => { e.preventDefault(); this.zoom(e.deltaY > 0 ? 1.25 : .8); }, { passive: false });
    this.el.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; const a = b.dataset.m;
      if (a === 'in') this.zoom(.7); if (a === 'out') this.zoom(1.4); if (a === 'me') this.center(); if (a === 'camp') { const c = G.world.camp; this.view.x = c.x; this.view.z = c.z; }
      if (a === 'guide') { this.guide = !this.guide; b.classList.toggle('on', this.guide); } if (a === 'close') this.close(); });
  }
  zoom(k) { this.view.mpp = Math.max(.8, Math.min(24, this.view.mpp * k)); }
  center() { const p = this.G.player.pos; this.view.x = p.x; this.view.z = p.z; }
  open() { this.center(); this.el.hidden = false; this.isOpen = true; $('[data-m=guide]').classList.toggle('on', this.guide); this.G.onPanel(true, 'map'); }
  close() { if (!this.isOpen) return; this.el.hidden = true; this.isOpen = false; this.G.onPanel(false, 'map'); }
  toScreen(x, z) { const W = this.cv.width, H = this.cv.height, k = devicePixelRatio || 1; return [W / 2 + (x - this.view.x) / this.view.mpp * k, H / 2 + (z - this.view.z) / this.view.mpp * k]; }
  toWorld(sx, sy) { const r = this.cv.getBoundingClientRect(); return [this.view.x + (sx - r.left - r.width / 2) * this.view.mpp, this.view.z + (sy - r.top - r.height / 2) * this.view.mpp]; }
  click(e) {
    const [x, z] = this.toWorld(e.clientX, e.clientY), k = devicePixelRatio || 1;
    const hit = this.markers.findIndex(m => Math.hypot(m.x - x, m.z - z) < 14 * this.view.mpp);
    if (hit >= 0) this.markers.splice(hit, 1); else if (this.markers.length < 12) this.markers.push({ x, z, n: (this.markers.reduce((a, m) => Math.max(a, m.n), 0) + 1) });
  }
  // mark ground near the player as explored
  reveal(dt) {
    this.revealT -= dt; if (this.revealT > 0) return; this.revealT = 1;
    const p = this.G.player.pos, r = Math.ceil(REVEAL / CELL);
    // the trail you have walked: a crumb every few metres, so the way back is on the map
    const last = this.trail[this.trail.length - 1]; if (!last || Math.hypot(last[0] - p.x, last[1] - p.z) > 7) { this.trail.push([Math.round(p.x * 10) / 10, Math.round(p.z * 10) / 10]); if (this.trail.length > 3000) this.trail.splice(0, this.trail.length - 3000); }
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const cx = Math.floor(p.x / CELL) + i, cz = Math.floor(p.z / CELL) + j; if (Math.hypot((cx + .5) * CELL - p.x, (cz + .5) * CELL - p.z) < REVEAL) this.explored.add(cx + ',' + cz); }
  }
  tile(level, tx, tz) {
    const key = level + ':' + tx + ',' + tz; let t = this.tiles.get(key); if (t) return t;
    const size = level ? 1024 : 256, n = 128;
    t = { ready: false, canvas: null }; this.tiles.set(key, t);
    const job = this.G.jobs.run({ t: 'map', x0: tx * size, z0: tz * size, size, n }, 5);
    job.promise.then(px => { const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), im = g.createImageData(n, n); im.data.set(px); g.putImageData(im, 0, 0); t.canvas = c; t.ready = true; });
    if (this.tiles.size > 600) { for (const [k, v] of this.tiles) { if (v.ready) { this.tiles.delete(k); break; } } }
    return t;
  }
  draw() {
    if (!this.isOpen) return;
    const cv = this.cv, k = devicePixelRatio || 1, W = cv.clientWidth * k, H = cv.clientHeight * k;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const g = this.ctx, v = this.view, level = v.mpp > 5 ? 1 : 0, size = level ? 1024 : 256;
    g.fillStyle = '#d8c9a3'; g.fillRect(0, 0, W, H);
    const x0 = v.x - W / 2 / k * v.mpp, x1 = v.x + W / 2 / k * v.mpp, z0 = v.z - H / 2 / k * v.mpp, z1 = v.z + H / 2 / k * v.mpp;
    g.imageSmoothingEnabled = true;
    for (let tz = Math.floor(z0 / size); tz <= Math.floor(z1 / size); tz++) for (let tx = Math.floor(x0 / size); tx <= Math.floor(x1 / size); tx++) {
      const t = this.tile(level, tx, tz); if (!t.ready) continue;
      const [sx, sy] = this.toScreen(tx * size, tz * size), s = size / v.mpp * k; g.drawImage(t.canvas, sx, sy, s + 1, s + 1);
    }
    // unexplored ground under a wash of blank parchment
    g.fillStyle = 'rgba(216,201,163,.93)';
    for (let cz = Math.floor(z0 / CELL); cz <= Math.floor(z1 / CELL); cz++) for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) {
      if (this.explored.has(cx + ',' + cz)) continue; const [sx, sy] = this.toScreen(cx * CELL, cz * CELL), s = CELL / v.mpp * k; g.fillRect(sx - .5, sy - .5, s + 1, s + 1);
    }
    // paper grain and an edge vignette
    const grd = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .7); grd.addColorStop(0, 'rgba(90,60,20,0)'); grd.addColorStop(1, 'rgba(90,60,20,.35)'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
    // scale bar
    const bar = [50, 100, 250, 500, 1000, 2000].find(m => m / v.mpp > 80) || 2000, bl = bar / v.mpp * k;
    g.strokeStyle = '#3a2a18'; g.fillStyle = '#3a2a18'; g.lineWidth = 2 * k; g.beginPath(); g.moveTo(20 * k, H - 24 * k); g.lineTo(20 * k + bl, H - 24 * k); g.stroke();
    g.font = `${12 * k}px Georgia, serif`; g.fillText(bar >= 1000 ? bar / 1000 + ' km' : bar + ' m', 20 * k, H - 32 * k);
    // your trail (older stretches fade), and a dashed line straight home
    if (this.trail.length > 1) {
      g.lineCap = 'round'; g.lineWidth = 2.6 * k; const n = this.trail.length;
      for (let i = 1; i < n; i++) { const [ax, ay] = this.toScreen(this.trail[i - 1][0], this.trail[i - 1][1]), [bx, by] = this.toScreen(this.trail[i][0], this.trail[i][1]); if ((ax < -50 && bx < -50) || (ay < -50 && by < -50) || (ax > W + 50 && bx > W + 50) || (ay > H + 50 && by > H + 50)) continue; g.strokeStyle = `rgba(122,38,18,${.25 + .6 * (i / n)})`; if (i % 2) { g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); } }
    }
    { const P = this.G.player.pos, c = this.G.world.camp, [ax, ay] = this.toScreen(P.x, P.z), [bx, by] = this.toScreen(c.x, c.z); g.save(); g.setLineDash([8 * k, 7 * k]); g.strokeStyle = 'rgba(40,24,10,.75)'; g.lineWidth = 2 * k; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.restore();
      const d = Math.hypot(c.x - P.x, c.z - P.z); if (d > 40) { g.fillStyle = 'rgba(244,232,204,.85)'; const mx = (ax + bx) / 2, my = (ay + by) / 2, txt = `camp ${d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m'} ${this.dirWord(c.x - P.x, c.z - P.z)}`; g.font = `italic ${12 * k}px Georgia, serif`; const tw = g.measureText(txt).width; g.fillRect(mx - tw / 2 - 5 * k, my - 13 * k, tw + 10 * k, 18 * k); g.fillStyle = '#2a1a0c'; g.textAlign = 'center'; g.fillText(txt, mx, my); g.textAlign = 'left'; } }
    // markers
    for (const m of this.markers) { const [sx, sy] = this.toScreen(m.x, m.z); this.flag(g, sx, sy, k, '#8a2a1a', String(m.n)); }
    // the drone, where it was landed
    { const L = this.G.drone && this.G.drone.landed; if (L) { const [sx, sy] = this.toScreen(L.x, L.z); this.flag(g, sx, sy, k, '#4a9a3a', 'Drone'); } }
    // animals pinned from the drone
    if (this.G.drone) for (const p of this.G.drone.pins) { const [sx, sy] = this.toScreen(p.x, p.z); this.flag(g, sx, sy, k, p.down ? '#8a8070' : '#e8781e', `${p.label}`); }
    // camp: a big tent, pinned to the edge when off the chart
    const c = this.G.world.camp; let [cx, cy] = this.toScreen(c.x, c.z); const pad = 28 * k, off = cx < pad || cy < pad || cx > W - pad || cy > H - pad;
    if (off) { const dx = cx - W / 2, dy = cy - H / 2, s = Math.min((W / 2 - pad) / Math.abs(dx || 1), (H / 2 - pad) / Math.abs(dy || 1)); cx = W / 2 + dx * s; cy = H / 2 + dy * s; }
    this.tent(g, cx, cy, k * (off ? .8 : 1.15)); g.fillStyle = '#2a1a0c'; g.font = `italic ${13 * k}px Georgia, serif`; g.textAlign = 'center'; g.fillText(off ? `Camp ${Math.round(Math.hypot(c.x - this.G.player.pos.x, c.z - this.G.player.pos.z))} m` : 'Camp', cx, cy + 26 * k); g.textAlign = 'left';
    // you
    const P = this.G.player, [px, py] = this.toScreen(P.pos.x, P.pos.z), b = -P.yaw;
    g.save(); g.translate(px, py); g.rotate(b); g.fillStyle = '#7a1e10'; g.strokeStyle = '#f4e8cc'; g.lineWidth = 2 * k; g.beginPath(); g.moveTo(0, -11 * k); g.lineTo(7 * k, 8 * k); g.lineTo(0, 4 * k); g.lineTo(-7 * k, 8 * k); g.closePath(); g.stroke(); g.fill(); g.restore();
    this.rose(g, W - 60 * k, 70 * k, k);
  }
  dirWord(dx, dz) { const a = (Math.atan2(dx, -dz) / (Math.PI * 2) * 8 + 8.5) % 8 | 0; return ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][a]; }
  tent(g, x, y, k) {
    g.save(); g.translate(x, y); g.scale(k, k);
    g.fillStyle = '#f2e6c8'; g.strokeStyle = '#3a2410'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-16, 10); g.lineTo(0, -14); g.lineTo(16, 10); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#3a2410'; g.beginPath(); g.moveTo(-4, 10); g.lineTo(0, -2); g.lineTo(4, 10); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(0, -14); g.lineTo(0, -20); g.stroke(); g.fillStyle = '#a83a1a'; g.beginPath(); g.moveTo(0, -20); g.lineTo(8, -17); g.lineTo(0, -14); g.fill();
    g.restore();
  }
  flag(g, x, y, k, col, label) {
    g.strokeStyle = '#2a1a0c'; g.lineWidth = 1.5 * k; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 18 * k); g.stroke();
    g.fillStyle = col; g.beginPath(); g.moveTo(x, y - 18 * k); g.lineTo(x + 12 * k, y - 14 * k); g.lineTo(x, y - 10 * k); g.fill();
    g.fillStyle = '#2a1a0c'; g.font = `${11 * k}px Georgia, serif`; g.fillText(label, x + 4 * k, y + 2 * k);
  }
  rose(g, x, y, k) {
    g.save(); g.translate(x, y); g.strokeStyle = '#3a2410'; g.fillStyle = '#3a2410'; g.lineWidth = 1.2 * k;
    g.beginPath(); g.arc(0, 0, 30 * k, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(0, 0, 26 * k, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 4; i++) { g.save(); g.rotate(i * Math.PI / 2); g.beginPath(); g.moveTo(0, -30 * k); g.lineTo(5 * k, 0); g.lineTo(0, 5 * k); g.lineTo(-5 * k, 0); g.closePath(); i === 0 ? g.fill() : g.stroke(); g.restore(); }
    g.font = `bold ${12 * k}px Georgia, serif`; g.textAlign = 'center'; g.fillText('N', 0, -36 * k); g.restore(); g.textAlign = 'left';
  }
  // the compass strip along the top of the screen
  compass() {
    const cv = this.comp, k = devicePixelRatio || 1, W = cv.clientWidth * k, H = cv.clientHeight * k; if (!W) return;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const g = this.cc, D = this.G.drone, P = D && D.on ? { pos: D.pos, yaw: D.yaw } : this.G.player, bearing = ((-P.yaw) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2), span = Math.PI * .9, px = W / span;
    g.clearRect(0, 0, W, H);
    const at = a => { let d = a - bearing; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return Math.abs(d) < span / 2 ? W / 2 + d * px : null; };
    g.textAlign = 'center'; g.font = `${12 * k}px Georgia, serif`;
    for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2, x = at(a); if (x === null) continue; const big = i % 9 === 0, mid = i % 3 === 0; g.strokeStyle = `rgba(243,231,207,${big ? .9 : .5})`; g.lineWidth = k; g.beginPath(); g.moveTo(x, H * (big ? .45 : mid ? .55 : .65)); g.lineTo(x, H * .8); g.stroke(); if (big) { g.fillStyle = i === 0 ? '#ffd27a' : 'rgba(243,231,207,.95)'; g.fillText(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][i / 9], x, H * .38); } }
    const mark = (x, z, col, txt) => { const a = Math.atan2(x - P.pos.x, -(z - P.pos.z)), sx = at((a + Math.PI * 2) % (Math.PI * 2)); if (sx === null) return; g.fillStyle = col; g.beginPath(); g.moveTo(sx, H * .82); g.lineTo(sx - 5 * k, H); g.lineTo(sx + 5 * k, H); g.fill(); if (txt) { g.font = `${10.5 * k}px Georgia, serif`; g.fillText(txt, sx, H * .2 + 2 * k); } };
    const c = this.G.world.camp, cd = Math.hypot(c.x - P.pos.x, c.z - P.pos.z); if (this.guide && cd > 18) mark(c.x, c.z, '#ffb24a', `camp ${cd > 1000 ? (cd / 1000).toFixed(1) + ' km' : Math.round(cd) + ' m'}`);
    for (const m of this.markers) mark(m.x, m.z, '#e06a4a', '');
    { const L = this.G.drone && !this.G.drone.on && this.G.drone.landed; if (L) { const d = Math.hypot(L.x - P.pos.x, L.z - P.pos.z); if (d > 6) mark(L.x, L.z, '#8af07a', `drone ${d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m'}`); } }
    if (this.G.drone) for (const p of this.G.drone.pins) { const d = Math.hypot(p.x - P.pos.x, p.z - P.pos.z); mark(p.x, p.z, '#ff9a3a', `${p.label.toLowerCase()} ${d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m'}`); }
  }
  save() { return { explored: [...this.explored].slice(-6000), markers: this.markers, guide: this.guide, trail: this.trail.slice(-1500) }; }
  load(d) { if (!d) return; this.explored = new Set(d.explored || []); this.markers = d.markers || []; this.guide = d.guide !== false; this.trail = d.trail || []; }
}
