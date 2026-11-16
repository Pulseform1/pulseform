  /* ---------- 30 raft: foundations on a grid, what stands on them, buoyancy, damage, pieces breaking away ----------
     A raft is a body (position, heave, yaw/pitch/roll and their speeds) and cells keyed "i,j", each a 1.5 m foundation
     with its own health. Buoyancy samples the sea under all four corners of every cell and fits a plane: its height is
     where the raft wants to sit, its slopes are the pitch and roll it wants. The raft follows on springs that get slower
     as it grows, so a big raft rides through the chop that tosses a small one. A cell that breaks is removed; whatever is
     no longer joined to the main raft becomes a separate body and drifts away. */
  const CS = 1.5, DECK = .32;   // cell size; deck height above the raft's waterline origin
  const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];   // 0 +x, 1 -x, 2 +z, 3 -z
  const ckey = (i, j) => i + ',' + j;
  const newCell = (i, j) => ({ i, j, hp: 100, floor: false, walls: [0, 0, 0, 0], shelter: false, obj: null, reinforce: false, fire: null, shake: 0, hit: 0 });
  function newBody(x, z) { return { x, z, y: 0, vy: 0, yaw: 0, vyaw: 0, pitch: 0, vp: 0, roll: 0, vr: 0, vx: 0, vz: 0, cells: new Map(), logs: [], ver: 0 }; }
  let RAFT = newBody(0, 0);
  const DRIFT = [];   // pieces that broke away
  // rotation Ry(yaw)·Rx(pitch)·Rz(roll), the same order as a Three.js 'YXZ' Euler
  function rotM(b) {
    const cy = Math.cos(b.yaw), sy = Math.sin(b.yaw), cx = Math.cos(b.pitch), sx = Math.sin(b.pitch), cz = Math.cos(b.roll), sz = Math.sin(b.roll);
    return [cy * cz + sy * sx * sz, -cy * sz + sy * sx * cz, sy * cx, cx * sz, cx * cz, -sx, -sy * cz + cy * sx * sz, sy * sz + cy * sx * cz, cy * cx];
  }
  function toWorld(b, lx, ly, lz, out = [0, 0, 0]) { const m = rotM(b); out[0] = b.x + m[0] * lx + m[1] * ly + m[2] * lz; out[1] = b.y + m[3] * lx + m[4] * ly + m[5] * lz; out[2] = b.z + m[6] * lx + m[7] * ly + m[8] * lz; return out; }
  function toLocal(b, wx, wy, wz, out = [0, 0, 0]) { const m = rotM(b), x = wx - b.x, y = wy - b.y, z = wz - b.z; out[0] = m[0] * x + m[3] * y + m[6] * z; out[1] = m[1] * x + m[4] * y + m[7] * z; out[2] = m[2] * x + m[5] * y + m[8] * z; return out; }
  // flat (yaw only) helpers, for where a cell is on the water
  const flatW = (b, lx, lz) => { const c = Math.cos(b.yaw), s = Math.sin(b.yaw); return [b.x + c * lx + s * lz, b.z - s * lx + c * lz]; };
  const flatL = (b, wx, wz) => { const c = Math.cos(b.yaw), s = Math.sin(b.yaw), x = wx - b.x, z = wz - b.z; return [c * x - s * z, s * x + c * z]; };
  const cellAt = (b, i, j) => b.cells.get(ckey(i, j));
  const cellUnder = (b, lx, lz) => cellAt(b, Math.round(lx / CS), Math.round(lz / CS));
  const exposed = (b, c) => SIDES.some(([di, dj]) => !cellAt(b, c.i + di, c.j + dj));
  const openSides = (b, c) => SIDES.map(([di, dj], s) => !cellAt(b, c.i + di, c.j + dj) ? s : -1).filter(s => s >= 0);

  // buoyancy and drift for one body
  const _cur = [0, 0];
  function bodyPhys(b, dt, extra = {}) {
    const n = b.cells.size; if (!n) return;
    let sw = 0, sx = 0, sz = 0, sh = 0, sxx = 0, szz = 0, sxz = 0, sxh = 0, szh = 0;
    for (const c of b.cells.values()) for (const [ox, oz] of [[-.6, -.6], [.6, -.6], [-.6, .6], [.6, .6]]) {
      const lx = c.i * CS + ox, lz = c.j * CS + oz, [wx, wz] = flatW(b, lx, lz), h = waterH(wx, wz);
      sw++; sx += lx; sz += lz; sh += h; sxx += lx * lx; szz += lz * lz; sxz += lx * lz; sxh += lx * h; szh += lz * h;
    }
    const mx = sx / sw, mz = sz / sw, mh = sh / sw, vxx = sxx / sw - mx * mx, vzz = szz / sw - mz * mz, vxz = sxz / sw - mx * mz, cxh = sxh / sw - mx * mh, czh = szh / sw - mz * mh;
    const det = vxx * vzz - vxz * vxz; let gx = 0, gz = 0;
    if (det > 1e-6) { gx = (cxh * vzz - czh * vxz) / det; gz = (czh * vxx - cxh * vxz) / det; }
    const a = mh - gx * mx - gz * mz;   // height at the raft's origin
    const big = Math.sqrt(n), wh = 2 * Math.PI / (.6 + .16 * big), wr = 2 * Math.PI / (.75 + .22 * big);
    const yT = a - .12 + (extra.load || 0), pT = cl(-Math.atan(gz), -.55, .55), rT = cl(Math.atan(gx), -.55, .55);
    b.vy += (wh * wh * (yT - b.y) - 2 * .75 * wh * b.vy) * dt; b.y += b.vy * dt;
    b.vp += (wr * wr * (pT - b.pitch) - 2 * .7 * wr * b.vp) * dt; b.pitch += b.vp * dt;
    b.vr += (wr * wr * (rT - b.roll) - 2 * .7 * wr * b.vr) * dt; b.roll += b.vr * dt;
    // drift with the water, turning with any swirl in it; bigger rafts answer more slowly
    currentAt(b.x, b.z, _cur); const k = .7 / (1 + .06 * n);
    b.vx += ((_cur[0] + (extra.px || 0)) - b.vx) * k * dt; b.vz += ((_cur[1] + (extra.pz || 0)) - b.vz) * k * dt;
    let curl = 0, rr = 0;
    for (const c of b.cells.values()) { const [wx, wz] = flatW(b, c.i * CS, c.j * CS), rx = wx - b.x, rz = wz - b.z, v = currentAt(wx, wz, [0, 0]); curl += rz * v[0] - rx * v[1]; rr += rx * rx + rz * rz; }
    const spin = rr > .5 ? curl / rr : 0; b.vyaw += ((spin * .9 + (extra.spin || 0)) - b.vyaw) * k * 1.4 * dt;
    b.x += b.vx * dt; b.z += b.vz * dt; b.yaw += b.vyaw * dt;
  }

  // what cells hold up: the player's cell (or the biggest group) stays the raft; anything not joined to it drifts off
  function checkJoined(keepKey) {
    const seen = new Set(), groups = [];
    for (const [k] of RAFT.cells) {
      if (seen.has(k)) continue; const grp = [], st = [k]; seen.add(k);
      while (st.length) { const q = st.pop(), c = RAFT.cells.get(q); grp.push(c); for (const [di, dj] of SIDES) { const nk = ckey(c.i + di, c.j + dj); if (RAFT.cells.has(nk) && !seen.has(nk)) { seen.add(nk); st.push(nk); } } }
      groups.push(grp);
    }
    if (groups.length < 2) return [];
    let main = groups.find(g => keepKey && g.some(c => ckey(c.i, c.j) === keepKey)) || groups.reduce((a, b) => b.length > a.length ? b : a);
    const off = [];
    for (const g of groups) if (g !== main) {
      const d = newBody(RAFT.x, RAFT.z); Object.assign(d, { y: RAFT.y, yaw: RAFT.yaw, pitch: RAFT.pitch, roll: RAFT.roll, vx: RAFT.vx, vz: RAFT.vz, life: 140 });
      for (const c of g) { RAFT.cells.delete(ckey(c.i, c.j)); d.cells.set(ckey(c.i, c.j), c); }
      const [ax, az] = flatW(RAFT, g[0].i * CS, g[0].j * CS), aw = Math.atan2(az - RAFT.z, ax - RAFT.x); d.vx += Math.cos(aw) * .6; d.vz += Math.sin(aw) * .6; d.px = Math.cos(aw) * .7; d.pz = Math.sin(aw) * .7;   // pushed clear, and it keeps going (smaller, it rides the wind differently)
      DRIFT.push(d); off.push(d);
    }
    RAFT.ver++; if (off.length) emit('detach', off); return off;
  }
  function breakCell(c, why) {
    const k = ckey(c.i, c.j); if (!RAFT.cells.has(k)) return;
    RAFT.cells.delete(k); RAFT.ver++;
    const [wx, wz] = flatW(RAFT, c.i * CS, c.j * CS); emit('break', c, wx, wz, why);
    // logs that lost the deck under them fall into the sea
    for (let n = RAFT.logs.length - 1; n >= 0; n--) { const L = RAFT.logs[n]; if (!cellUnder(RAFT, L.lx, L.lz)) { RAFT.logs.splice(n, 1); const [lx2, lz2] = flatW(RAFT, L.lx, L.lz); addFloater('log', lx2, lz2); } }
    if (why !== 'shark') for (let n = 0; n < 2; n++) addFloater('plank', wx + rnd(-1, 1), wz + rnd(-1, 1));   // splinters to haul back
    checkJoined(PL.onRaft ? ckey(Math.round(PL.lx / CS), Math.round(PL.lz / CS)) : null);
  }
  function hurtCell(c, amt, why) {
    if (!c || c.hp <= 0) return;
    const braced = RAFT.logs.some(L => L.solid && logCovers(L, c));   // a solid log across a cell braces it
    const real = amt * (c.reinforce ? (why === 'shark' ? .4 : .5) : 1) * (braced ? .65 : 1); c.hp -= real; c.hit = 1; c.shake = Math.max(c.shake, .4); RAFT.ver++;
    emit('hurt', c, real, why);
    if (c.hp <= 0) breakCell(c, why);
  }
  // a placed log is 2 m long: its ends, and whether it lies across a cell
  const LOG_LEN = 2;
  const logEnds = L => { const dx = Math.cos(L.rot) * LOG_LEN * .45, dz = Math.sin(L.rot) * LOG_LEN * .45; return [[L.lx - dx, L.lz - dz], [L.lx, L.lz], [L.lx + dx, L.lz + dz]]; };
  const logCovers = (L, c) => logEnds(L).some(([x, z]) => Math.round(x / CS) === c.i && Math.round(z / CS) === c.j);
  const logFits = L => logEnds(L).every(([x, z]) => cellUnder(RAFT, x, z)) && !RAFT.logs.some(o => o !== L && Math.hypot(o.lx - L.lx, o.lz - L.lz) < .3);
  // building: where each piece may go, and what it costs
  const INV = {};
  const has = need => Object.entries(need).every(([k, n]) => (INV[k] || 0) >= n);
  const spend = need => { for (const [k, n] of Object.entries(need)) INV[k] -= n; };
  const give = (k, n = 1) => { INV[k] = (INV[k] || 0) + n; };
  function canPlace(kind, i, j, side) {
    const c = cellAt(RAFT, i, j);
    if (kind === 'foundation') return !c && SIDES.some(([di, dj]) => cellAt(RAFT, i + di, j + dj)) && RAFT.cells.size < 64;
    if (!c) return false;
    if (kind === 'floor') return !c.floor;
    if (kind === 'wall') return side >= 0 && !c.walls[side];
    if (kind === 'shelter') return !c.shelter;
    if (kind === 'storage' || kind === 'fire' || kind === 'catcher' || kind === 'still') return !c.obj;
    if (kind === 'trap') return !c.obj && exposed(RAFT, c);
    if (kind === 'reinforce') return !c.reinforce && exposed(RAFT, c);
    return false;
  }
  function place(kind, i, j, side) {
    if (!canPlace(kind, i, j, side) || !has(PIECES[kind].need)) return false;
    spend(PIECES[kind].need);
    if (kind === 'foundation') RAFT.cells.set(ckey(i, j), newCell(i, j));
    else { const c = cellAt(RAFT, i, j); if (kind === 'floor') c.floor = true; else if (kind === 'wall') c.walls[side] = 1; else if (kind === 'shelter') c.shelter = true; else if (kind === 'reinforce') c.reinforce = true; else { c.obj = kind; if (kind === 'fire') c.fire = { lit: false, cook: null }; } }
    RAFT.ver++; emit('build', kind, i, j); return true;
  }
  function repair(c) { if (!c || c.hp >= 100 || !has(REPAIR)) return false; spend(REPAIR); c.hp = Math.min(100, c.hp + 35); RAFT.ver++; emit('repair', c); return true; }
  const sheltered = c => !!(c && c.shelter);
  const anyStorage = () => [...RAFT.cells.values()].some(c => c.obj === 'storage');
