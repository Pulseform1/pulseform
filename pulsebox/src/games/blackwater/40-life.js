  /* ---------- 40 life: you, the salvage, the hook, the rod, food, fire, the torch, sharks, the big events ---------- */
  const EYE = 1.62, REACH = 26;
  const PL = { onRaft: true, lx: .75, lz: .75, ly: 0, vy: 0, wx: 0, wy: 0, wz: 0, yaw: Math.PI * .8, pitch: -.05, hunger: 100, thirst: 100, air: 100, faint: 0,
    tools: { hook: 1, torch: 1 }, tool: 'hook', torch: false, torchWet: 0, brace: false, under: false, pickups: 0, knock: 0, cool: 0, play: 0 };
  const HK = { state: 'idle', charge: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, items: [], tension: 0, reel: false };
  const FS = { state: 'idle', charge: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, fish: null, dist: 0, tension: 0, over: 0, slack: 0, reel: false, bob: 0 };
  const FL = []; let flId = 0;   // floating salvage
  const SPN = { quiet: 6, left: 0, gx: 0, gz: 0, groups: 0 };
  const SH = { state: 'away', t: 200, x: 0, z: 0, y: -1, ang: 0, cell: null, hits: 0, yaw: 0, stun: 0, biteT: 0, swim: 0 };
  const CACHE = { x: 0, z: 0, y: -5, on: false, t: 150, open: false };   // a sunken supply crate you dive for
  const CT = { state: 'none', t: 0, x: 0, z: 0, y: -90, cool: 0, pending: -1, seen: 0 };
  let saveT = 30, devMode = /[?&]dev\b/.test(typeof location !== 'undefined' ? location.search : ''), runLive = false;   // runLive: a real run (the menu's backdrop raft never saves)
  const MASS = { plank: 1, log: 2, crate: 2.6, barrel: 3, panel: 4, wallpiece: 3.4 }, DRAFT = { plank: .05, log: .12, crate: .25, barrel: .3, panel: .1, wallpiece: .12 };
  const ui = { aim: null, prompt: '', buildKind: 'foundation', buildOpen: false, craftOpen: false, warn: '', place: null };   // place: a log you are putting down { lx, lz, rot, set }

  // ---- where you are, and where you are looking
  function eyePos(out = [0, 0, 0]) {
    if (PL.onRaft) return toWorld(RAFT, PL.lx, DECK + EYE + PL.ly, PL.lz, out);
    out[0] = PL.wx; out[1] = PL.wy; out[2] = PL.wz; return out;
  }
  const lookDir = () => [-Math.sin(PL.yaw) * Math.cos(PL.pitch), Math.sin(PL.pitch), -Math.cos(PL.yaw) * Math.cos(PL.pitch)];
  // what you point at on the deck: the cell, and the edge nearest the point (for walls)
  function deckAim() {
    const o = eyePos(), d = lookDir(), m = rotM(RAFT), lo = toLocal(RAFT, o[0], o[1], o[2]);
    const ld = [m[0] * d[0] + m[3] * d[1] + m[6] * d[2], m[1] * d[0] + m[4] * d[1] + m[7] * d[2], m[2] * d[0] + m[5] * d[1] + m[8] * d[2]];
    if (ld[1] > -.05) return null; const t = (DECK - lo[1]) / ld[1]; if (t > 7) return null;
    const lx = lo[0] + ld[0] * t, lz = lo[2] + ld[2] * t, i = Math.round(lx / CS), j = Math.round(lz / CS), fx = lx / CS - i, fz = lz / CS - j;
    return { i, j, lx, lz, side: Math.abs(fx) > Math.abs(fz) ? (fx > 0 ? 0 : 1) : (fz > 0 ? 2 : 3), dist: t };
  }

  // ---- walking the deck, falling in, swimming, climbing out
  function fallIn(push = 1) {
    if (!PL.onRaft) return; const e = toWorld(RAFT, PL.lx, DECK, PL.lz), c = cellUnder(RAFT, PL.lx, PL.lz);
    let ox = 0, oz = 0; if (c) { const sides = openSides(RAFT, c); const s = sides.length ? sides[0] : 0; [ox, oz] = SIDES[s]; }
    const [wx, wz] = flatW(RAFT, PL.lx + ox * 1.1 * push, PL.lz + oz * 1.1 * push);
    Object.assign(PL, { onRaft: false, wx: e[0] + (wx - e[0]), wz: e[2] + (wz - e[2]), wy: e[1] - .5, vy: -1, ly: 0, knock: 0 });
    if (PL.torch) { PL.torch = false; emit('torch', false); } if (!anyStorage()) INV.tinder = 0;
    HK.state = 'idle'; HK.items.forEach(f => f.hooked = false); HK.items = []; FS.state = 'idle';
    emit('fall'); say('You went into the sea. Swim back and press E at the edge to climb out', '#9fd0ff');
  }
  function climbOut() {
    let best = null, bd = 1.8;
    for (const c of RAFT.cells.values()) { const [wx, wz] = flatW(RAFT, c.i * CS, c.j * CS), d = Math.hypot(wx - PL.wx, wz - PL.wz) - CS * .7; if (d < bd) { bd = d; best = c; } }
    if (!best) return false; Object.assign(PL, { onRaft: true, lx: best.i * CS, lz: best.j * CS, ly: 0, vy: 0, under: false }); emit('climb'); return true;
  }
  function moveRaftPlayer(I, dt) {
    const sp = 2.6 * (PL.brace ? .35 : 1), ly = PL.yaw - RAFT.yaw, s = Math.sin(ly), c = Math.cos(ly);
    let mx = -s * I.mz + c * I.mx, mz = -c * I.mz - s * I.mx; const L = Math.hypot(mx, mz); if (L > 1) { mx /= L; mz /= L; }
    const tryMove = (nx, nz) => {
      const a = cellUnder(RAFT, PL.lx, PL.lz), b = cellUnder(RAFT, nx, nz);
      if (!b) { if (PL.ly > .15) { PL.lx = nx; PL.lz = nz; return 'off'; } return false; }   // the edge holds you unless you jump off
      if (a && a !== b) { const s2 = SIDES.findIndex(([di, dj]) => di === b.i - a.i && dj === b.j - a.j); if (s2 >= 0 && (a.walls[s2] || b.walls[s2 ^ 1])) return false; }
      // walls on a cell's own edges
      const fx = nx - b.i * CS, fz = nz - b.j * CS, lim = CS / 2 - .22;
      if ((b.walls[0] && fx > lim) || (b.walls[1] && fx < -lim) || (b.walls[2] && fz > lim) || (b.walls[3] && fz < -lim)) return false;
      PL.lx = nx; PL.lz = nz; return true;
    };
    let r = tryMove(PL.lx + mx * sp * dt, PL.lz); if (r !== 'off') r = tryMove(PL.lx, PL.lz + mz * sp * dt);
    if (I.jump && PL.ly <= 0 && !PL.brace) PL.vy = 3.4;
    PL.vy -= G * dt; PL.ly = Math.max(0, PL.ly + PL.vy * dt); if (PL.ly <= 0) PL.vy = 0;
    if (r === 'off' || !cellUnder(RAFT, PL.lx, PL.lz)) fallIn(0);
  }
  function swim(I, dt) {
    const s = Math.sin(PL.yaw), c = Math.cos(PL.yaw), sp = 1.5;
    let mx = -s * I.mz + c * I.mx, mz = -c * I.mz - s * I.mx; const L = Math.hypot(mx, mz); if (L > 1) { mx /= L; mz /= L; }
    const cur = currentAt(PL.wx, PL.wz, [0, 0]); PL.wx += (mx * sp + cur[0]) * dt; PL.wz += (mz * sp + cur[1]) * dt;
    const surf = waterH(PL.wx, PL.wz), dive = I.brace && !I.jump, want = dive ? surf - 1.8 : surf + (I.jump ? .3 : .08);
    PL.wy = ease(PL.wy, want, dive ? 1.4 : 3.2, dt); PL.under = PL.wy < surf - .02;
    PL.hunger -= dt * .02;
    if (PL.wy < surf - .5) { PL.air = Math.max(0, PL.air - dt * 100 / 28); if (PL.air <= 0) { PL.air = 100; drown(); } } else PL.air = Math.min(100, PL.air + dt * 40);
  }

  // ---- salvage drifting by: groups with quiet stretches between
  function addFloater(k, x, z) { const f = { id: ++flId, k, x, z, y: waterH(x, z), yaw: rnd(0, TAU), pitch: 0, roll: 0, vx: 0, vz: 0, hooked: false, spin: rnd(-.2, .2) }; FL.push(f); return f; }
  function spawnTick(dt) {
    const dir = S.windAng, fx = Math.cos(dir), fz = Math.sin(dir);   // the raft drifts this way faster than the wreckage does
    if (SPN.left > 0) { SPN.gap -= dt; if (SPN.gap <= 0) { SPN.left--; SPN.gap = rnd(1.5, 4); const lat = SPN.lat + rnd(-4, 4), ahead = rnd(44, 58);
      const early = SPN.groups <= 2, k = early && SPN.left === 2 ? 'barrel' : early && SPN.left === 0 ? 'crate' : pick(['plank', 'plank', 'plank', 'log', 'barrel', 'crate', 'panel', 'wallpiece', 'plank']);
      addFloater(k, RAFT.x + fx * ahead - fz * lat, RAFT.z + fz * ahead + fx * lat); } return; }
    SPN.quiet -= dt; if (SPN.quiet > 0) return;
    SPN.groups++; SPN.left = SPN.groups <= 2 ? 6 : Math.floor(rnd(3, 7)); SPN.gap = 0; SPN.lat = SPN.groups <= 2 ? rnd(-7, 7) : rnd(-15, 15); SPN.quiet = rnd(30, 65);
  }
  function floaterTick(dt) {
    const fx = Math.cos(S.windAng), fz = Math.sin(S.windAng);
    for (const f of FL) {
      if (f.hooked) continue;
      const cur = currentAt(f.x, f.z, [0, 0]), base = .25 + .035 * S.wind;
      // wreckage sits lower in the water than the raft and catches less wind: it falls behind as the raft drifts on
      f.vx = ease(f.vx, cur[0] - fx * base * .62 + fx * S.wind * .01, .8, dt); f.vz = ease(f.vz, cur[1] - fz * base * .62 + fz * S.wind * .01, .8, dt);
      f.x += f.vx * dt; f.z += f.vz * dt; f.yaw += f.spin * dt;
    }
    for (const f of FL) bob(f, dt, DRAFT[f.k] || .1);
    for (let n = FL.length - 1; n >= 0; n--) { const f = FL[n]; if (!f.hooked && Math.hypot(f.x - RAFT.x, f.z - RAFT.z) > 160) FL.splice(n, 1); }
  }
  // ride the water: height at the middle, pitch and roll from two more samples along and across it
  function bob(f, dt, draft) {
    const L = f.k === 'plank' || f.k === 'log' ? 1 : .6, c = Math.cos(f.yaw), s = Math.sin(f.yaw);
    const h = waterH(f.x, f.z), ha = waterH(f.x + c * L, f.z - s * L), hb = waterH(f.x - s * L, f.z - c * L);
    f.y = ease(f.y, h - draft, 9, dt); f.roll = ease(f.roll, Math.atan2(ha - h, L), 5, dt); f.pitch = ease(f.pitch, -Math.atan2(hb - h, L), 5, dt);
  }
  // what a piece of salvage holds
  function contents(f) {
    const out = [];
    const tab = { crate: ['plank', 'plank', 'rope', 'scrap', 'biscuit', 'tinder', 'line', 'scrap', 'water'], barrel: ['rope', 'rope', 'scrap', 'coconut', 'biscuit', 'tinder', 'plank', 'water', 'water'] };
    if (f.k === 'plank') out.push('plank'); else if (f.k === 'log') out.push('log'); else if (f.k === 'panel') out.push('plank', 'plank', 'plank', ...(chance(.5) ? ['rope'] : []));
    else if (f.k === 'wallpiece') out.push('plank', 'plank', 'scrap');
    else { const n = f.k === 'crate' ? Math.floor(rnd(2, 5)) : Math.floor(rnd(2, 4)); for (let i = 0; i < n; i++) out.push(pick(tab[f.k])); if (f.k === 'barrel' && PL.pickups < 6) out.push('rope', 'rope'); }
    return out;
  }
  function collect(f) {
    if (NET.client) { NET.ask('collect', { id: f.id }); PL.pickups++; NET.gone.set(f.id, S.t); const i = FL.indexOf(f); if (i >= 0) FL.splice(i, 1); return []; }
    const got = contents(f); got.forEach(k => give(k)); PL.pickups++; const i = FL.indexOf(f); if (i >= 0) FL.splice(i, 1);
    pickupMsg(got, f.k); return got;
  }
  function nearFloater(r = 2.4) { const e = eyePos(); let best = null, bd = r; for (const f of FL) { if (f.hooked) continue; const d = Math.hypot(f.x - e[0], f.z - e[2]); if (d < bd) { bd = d; best = f; } } return best; }

  // ---- the rope hook: hold to charge, release to throw, hold again to reel
  function handPos() { const e = eyePos(), d = lookDir(), r = [Math.cos(PL.yaw) * .28, 0, -Math.sin(PL.yaw) * .28]; return [e[0] + d[0] * .5 + r[0], e[1] - .3 + d[1] * .5, e[2] + d[2] * .5 + r[2]]; }
  function throwFrom(o, charge, vmin, vmax) { const d = lookDir(), v = vmin + charge * (vmax - vmin), up = Math.max(.18, d[1] + .22), L = Math.hypot(d[0], up, d[2]); const h = handPos(); Object.assign(o, { x: h[0], y: h[1], z: h[2], vx: d[0] / L * v, vy: up / L * v, vz: d[2] / L * v }); }
  function hookTick(dt) {
    const h = handPos();
    if (HK.state === 'charge') HK.charge = Math.min(1, HK.charge + dt / 1.1);
    else if (HK.state === 'fly') {
      HK.vy -= G * dt; HK.x += HK.vx * dt; HK.y += HK.vy * dt; HK.z += HK.vz * dt;
      const d = Math.hypot(HK.x - h[0], HK.z - h[2]); if (d > REACH) { const k = REACH / d; HK.x = h[0] + (HK.x - h[0]) * k; HK.z = h[2] + (HK.z - h[2]) * k; HK.vx *= .3; HK.vz *= .3; }   // the rope runs out
      const wh = waterH(HK.x, HK.z); if (HK.y <= wh) { HK.y = wh; HK.state = 'water'; emit('splash', HK.x, HK.z, false); }
    } else if (HK.state === 'water') {
      const wh = waterH(HK.x, HK.z); HK.y = wh - .04;
      if (!HK.items.length) for (const f of FL) if (!f.hooked && Math.hypot(f.x - HK.x, f.z - HK.z) < 1.4) { f.hooked = true; HK.items.push(f); emit('snag', f); break; }
      const mass = HK.items.reduce((a, f) => a + (MASS[f.k] || 1), 0);
      if (HK.reel) {
        const dx = h[0] - HK.x, dz = h[2] - HK.z, d = Math.hypot(dx, dz), sp = 3.6 / (1 + mass * .45) * (1 - .45 * S.sea);
        HK.x += dx / d * Math.min(d, sp * dt); HK.z += dz / d * Math.min(d, sp * dt);
        HK.tension = ease(HK.tension, cl(.18 + mass * .14 + S.sea * .35 + Math.abs(waterH(HK.x, HK.z) - wh) * 3, 0, 1), 6, dt);
        if (d < 1.6 || (PL.onRaft && cellUnder(RAFT, ...flatL(RAFT, HK.x, HK.z)))) { HK.items.slice().forEach(collect); HK.items = []; HK.state = 'idle'; emit('reeled'); }
      } else { const cur = currentAt(HK.x, HK.z, [0, 0]); HK.x += cur[0] * .3 * dt; HK.z += cur[1] * .3 * dt; HK.tension = ease(HK.tension, HK.items.length ? .12 : 0, 4, dt); }
      for (const f of HK.items) { f.x = HK.x; f.z = HK.z; }
      if (Math.hypot(HK.x - h[0], HK.z - h[2]) > REACH + 6) dropHook();
    }
  }
  function dropHook() { HK.items.forEach(f => f.hooked = false); HK.items = []; HK.state = 'idle'; HK.tension = 0; }

  // ---- the fishing rod: cast the bobber, wait for a bite, then reel without snapping the line
  function fishPick() { const tot = Object.values(FISH).reduce((a, f) => a + f.w, 0); let r = R() * tot; for (const [k, f] of Object.entries(FISH)) { r -= f.w * (k === 'tuna' || k === 'dorado' ? 1 + S.sea : 1); if (r <= 0) return k; } return 'sardine'; }
  function fishTick(dt) {
    if (FS.state === 'charge') FS.charge = Math.min(1, FS.charge + dt / 1);
    else if (FS.state === 'fly') { FS.vy -= G * dt; FS.x += FS.vx * dt; FS.y += FS.vy * dt; FS.z += FS.vz * dt; const wh = waterH(FS.x, FS.z); if (FS.y <= wh) { FS.state = 'wait'; FS.t = rnd(5, 14) * (S.tod > 5 && S.tod < 8 || S.tod > 17 && S.tod < 20 ? .7 : 1); emit('splash', FS.x, FS.z, false); } }
    else if (FS.state === 'wait' || FS.state === 'bite' || FS.state === 'fight') {
      const wh = waterH(FS.x, FS.z); FS.y = wh + .02 - (FS.state === 'bite' ? .12 + .08 * Math.sin(S.t * 30) : FS.state === 'fight' ? .1 : 0);
      if (FS.state === 'wait') { const cur = currentAt(FS.x, FS.z, [0, 0]); FS.x += cur[0] * .2 * dt; FS.z += cur[1] * .2 * dt; FS.t -= dt; if (FS.t <= 0) { FS.state = 'bite'; FS.t = 1.8; emit('bite'); } }
      else if (FS.state === 'bite') { FS.t -= dt; if (FS.reel) startFight(); else if (FS.t <= 0) { FS.state = 'wait'; FS.t = rnd(4, 10); say('It took the bait and let go', '#cfd6e2'); } }
      else fight(dt);
    }
  }
  function startFight() {
    const k = fishPick(), F = FISH[k], s = R(); FS.fish = { k, len: lp(F.len[0], F.len[1], s), kg: lp(F.kg[0], F.kg[1], s * s), stam: F.stam * (.7 + s * .6), pull: F.pull * (.8 + s * .3) };
    const e = eyePos(); FS.dist = Math.hypot(FS.x - e[0], FS.z - e[2]); FS.state = 'fight'; FS.tension = .3; FS.over = 0; FS.slack = 0; FS.ft = 0; emit('hooked');
  }
  function fight(dt) {
    const f = FS.fish; FS.ft += dt; const lunge = Math.max(0, Math.sin(FS.ft * 1.7) * Math.sin(FS.ft * .63 + 1)) * 1.4;
    const pull = f.pull * (.45 + .55 * lunge) * (.4 + .6 * cl(f.stam / 6, 0, 1));
    const want = FS.reel ? .3 + pull * .78 : pull * .3; FS.tension = ease(FS.tension, want, 3.5, dt);
    if (FS.reel && FS.tension < .92) FS.dist -= (1.7 - pull) * dt; else FS.dist += pull * .9 * dt;
    if (FS.tension > .3) f.stam = Math.max(0, f.stam - dt * (FS.reel ? 1 : .4));
    FS.over = FS.tension > .95 ? FS.over + dt : Math.max(0, FS.over - dt); FS.slack = FS.tension < .06 ? FS.slack + dt : 0;
    // the bobber comes in along the line
    const e = eyePos(), dx = FS.x - e[0], dz = FS.z - e[2], d = Math.hypot(dx, dz) || 1; FS.x = e[0] + dx / d * Math.max(1, FS.dist); FS.z = e[2] + dz / d * Math.max(1, FS.dist);
    if (FS.over > .7) { FS.state = 'idle'; emit('snap'); say('The line snapped', '#ff9a7a'); }
    else if (FS.slack > 2.5 || FS.dist > 30) { FS.state = 'idle'; say('It threw the hook', '#cfd6e2'); }
    else if (FS.dist <= 1.1) { give('fish:' + f.k); FS.state = 'idle'; FS.last = { ...f, at: S.t }; emit('catch', f); }
  }

  // ---- food, fire and the torch
  const foods = () => Object.keys(INV).filter(k => INV[k] > 0 && foodOf(k) > 0).sort((a, b) => foodOf(b) - foodOf(a));
  function eat(k) { k = k || foods()[0]; if (!k || !(INV[k] > 0)) return false; INV[k]--; PL.hunger = Math.min(100, PL.hunger + foodOf(k)); emit('eat', k); return true; }
  // ---- putting a log on the raft: pick it in the inventory, aim, rotate, click to set it down, click SOLIDIFY to fix it
  function startPlace(k) { if (!(INV[k] > 0) || !PL.onRaft) { say(PL.onRaft ? 'No logs. Hook one from the sea' : 'Climb aboard first', '#cfd6e2'); return false; } ui.place = { k, lx: 0, lz: 0, rot: PL.yaw - RAFT.yaw + Math.PI / 2, set: false, ok: false }; dropHook(); FS.state = 'idle'; return true; }
  function placeTick() {
    const P = ui.place; if (!P) return; if (!PL.onRaft || !(INV[P.k] > 0)) { ui.place = null; return; }
    if (!P.set) { const a = ui.aim; if (a) { P.lx = a.lx; P.lz = a.lz; } }
    if (!ui.aim && !P.set) { P.ok = false; return; }
    P.ok = logFits(P);
    if (!P.ok && !P.set) {   // slide it along its length (then a little sideways) to the nearest spot where it lies on the deck
      const ax = Math.cos(P.rot), az = Math.sin(P.rot), x0 = P.lx, z0 = P.lz;
      for (const sd of [0, .3, -.3, .6, -.6]) { for (let k = 1; k <= 8 && !P.ok; k++) for (const sg of [1, -1]) { const d = sg * k * .15; P.lx = x0 + ax * d - az * sd; P.lz = z0 + az * d + ax * sd; if (logFits(P)) { P.ok = true; break; } } if (P.ok) break; }
      if (!P.ok) { P.lx = x0; P.lz = z0; }
    }
  }
  function rotatePlace(d) { if (ui.place) ui.place.rot += d * Math.PI / 12; }   // 15 degrees a step
  function placeClick() {
    const P = ui.place; if (!P) return false;
    if (!P.ok) { say(P.set ? 'It has to lie on the deck' : 'Aim at the deck where it should go', '#ff9a7a'); return true; }
    if (!P.set) { P.set = true; emit('logSet'); return true; }
    if (NET.client) { NET.ask('log', { lx: P.lx, lz: P.lz, rot: P.rot }); ui.place = null; emit('solidify'); say('Solid. It braces the deck under it', '#9fe0a0'); return true; }
    INV[P.k]--; RAFT.logs.push({ lx: P.lx, lz: P.lz, rot: P.rot, solid: true }); RAFT.ver++; ui.place = null; emit('solidify'); say('Solid. It braces the deck under it', '#9fe0a0'); return true;
  }
  function placeBack() { const P = ui.place; if (!P) return false; if (P.set) P.set = false; else ui.place = null; return true; }
  // aiming at a solid log on the deck: E pries it loose again
  function logAimed() { const a = ui.aim; if (!a || a.dist > 3.2) return null; let best = null, bd = .45; for (const L of RAFT.logs) { const dx = Math.cos(L.rot), dz = Math.sin(L.rot), px = a.lx - L.lx, pz = a.lz - L.lz, along = px * dx + pz * dz, side = Math.abs(-px * dz + pz * dx); if (Math.abs(along) < LOG_LEN / 2 && side < bd) { bd = side; best = L; } } return best; }
  function drink(k) {
    k = k || ((INV.water || 0) > 0 ? 'water' : (INV.coconut || 0) > 0 ? 'coconut' : null); if (!k || !(INV[k] > 0)) { say('Nothing to drink. Build a rain catcher or a water still (B)', '#cfd6e2'); return false; }
    INV[k]--; PL.thirst = Math.min(100, PL.thirst + DRINK[k]); if (k === 'coconut') PL.hunger = Math.min(100, PL.hunger + FOOD.coconut); emit('drink', k); return true;
  }
  // rain catchers fill in the rain, stills work in the sun, traps catch fish: each holds a few until you empty it
  const HOLD = { catcher: 4, still: 3, trap: 3 };
  function piecesTick(dt) {
    const sun = S.tod > 7 && S.tod < 18.5 ? 1 - S.cloud * .6 : 0;
    for (const c of RAFT.cells.values()) {
      if (!HOLD[c.obj]) continue; c.store = c.store || 0; if (c.store >= HOLD[c.obj]) continue;
      const rate = c.obj === 'catcher' ? (S.rain > .15 ? S.rain / 22 : 0) : c.obj === 'still' ? sun / 95 : 1 / rnd(70, 110);
      c.prog = (c.prog || 0) + dt * rate; if (c.prog >= 1) { c.prog = 0; c.store++; if (c.obj === 'trap') c.fish = (c.fish || []).concat([R() < .6 ? 'sardine' : R() < .8 ? 'mackerel' : 'bream']); RAFT.ver++; }
    }
  }
  function emptyPiece(c) {
    if (NET.client) { if (c.store) NET.ask('empty', { i: c.i, j: c.j }); else say(c.obj === 'catcher' ? 'Empty. It fills when it rains' : c.obj === 'still' ? 'Nothing yet. It works while the sun is up' : 'Nothing in the trap yet', '#cfd6e2'); return true; }
    if (!c.store) { say(c.obj === 'catcher' ? 'Empty. It fills when it rains' : c.obj === 'still' ? 'Nothing yet. It works while the sun is up' : 'Nothing in the trap yet', '#cfd6e2'); return false; }
    const got = c.obj === 'trap' ? (c.fish || []).map(f => 'fish:' + f) : Array(c.store).fill('water'); got.forEach(k => give(k)); c.store = 0; c.fish = []; RAFT.ver++; pickupMsg(got); return true;
  }
  // a sunken supply crate: bubbles mark it; dive (hold Shift in the water) and press E beside it
  function cacheTick(dt) {
    if (!CACHE.on) { CACHE.t -= dt; if (CACHE.t <= 0) { const a = rnd(0, TAU), d = rnd(12, 26); Object.assign(CACHE, { on: true, open: false, x: RAFT.x + Math.cos(a) * d, z: RAFT.z + Math.sin(a) * d, y: -rnd(4, 6), life: 300 }); emit('cache'); say('Bubbles rising nearby: something is down there', '#9fd0ff'); } return; }
    CACHE.life -= dt; if (CACHE.life <= 0 || Math.hypot(CACHE.x - RAFT.x, CACHE.z - RAFT.z) > 90) { CACHE.on = false; CACHE.t = rnd(180, 320); }
  }
  const nearCache = () => CACHE.on && !PL.onRaft && Math.hypot(CACHE.x - PL.wx, CACHE.z - PL.wz) < 2.4 && PL.wy < waterH(PL.wx, PL.wz) - 1.5 && Math.abs(PL.wy - CACHE.y) < 3.2;
  function openCache() {
    if (NET.client) { NET.ask('cache', {}); CACHE.on = false; return []; }
    const got = ['scrap', 'scrap', 'rope', pick(['scrap', 'rope', 'plank']), pick(['water', 'water', 'biscuit', 'line', 'tinder'])]; if (R() < .5) got.push('water');
    got.forEach(k => give(k)); CACHE.on = false; CACHE.t = rnd(200, 340); pickupMsg(got); emit('cacheOpen'); return got;
  }
  function drown() { say('You ran out of air', '#ff9a7a'); faint(true); }
  function fireTick(dt) {
    for (const c of RAFT.cells.values()) {
      const F = c.fire; if (!F) continue;
      if (F.lit && S.rain > .35 && !c.shelter) { F.wet = (F.wet || 0) + dt * S.rain; if (F.wet > 8) { F.lit = false; F.wet = 0; say('The rain put the fire out. Build a shelter over it', '#9fd0ff'); } }
      if (F.lit && F.cook && !F.cook.done) { F.cook.t += dt; if (F.cook.t >= 14) { F.cook.done = true; emit('cooked', F.cook.k); } }
    }
  }
  function torchTick(dt) {
    // a torch drowns in heavy rain unless you stand under a roof
    if (PL.torch) {
      const c = PL.onRaft ? cellUnder(RAFT, PL.lx, PL.lz) : null;
      if (S.rain > .6 && !sheltered(c)) { PL.torchWet += dt * S.rain; if (PL.torchWet > 7) { PL.torch = false; PL.torchWet = 0; emit('torch', false); say('The rain put your torch out', '#9fd0ff'); } } else PL.torchWet = Math.max(0, PL.torchWet - dt);
    }
  }
  function lightTorch() {
    if (PL.torch || !PL.onRaft) return false;
    const fire = [...RAFT.cells.values()].find(c => c.fire && c.fire.lit && Math.hypot(c.i * CS - PL.lx, c.j * CS - PL.lz) < 2.6);
    if (fire) { PL.torch = true; emit('torch', true); say('Lit from the fire', '#ffd28a'); return true; }
    if ((INV.tinder || 0) > 0) { INV.tinder--; PL.torch = true; emit('torch', true); say('You strike a light on dry tinder', '#ffd28a'); return true; }
    say(anyStorage() ? 'No dry tinder left' : 'You need dry tinder (keep it in storage) or a lit fire', '#cfd6e2'); return false;
  }
  function useFire(c) {
    const F = c.fire;
    if (NET.client) { if (F.lit && !PL.torch && !F.cook && !Object.keys(INV).some(k => k.startsWith('fish:') && INV[k] > 0)) return lightTorch(); NET.ask('fire', { i: c.i, j: c.j, torch: PL.torch }); return true; }
    if (!F.lit) { if (PL.torch || (INV.tinder || 0) > 0) { if (!PL.torch) INV.tinder--; F.lit = true; F.wet = 0; emit('fire', true); say('The fire catches', '#ffd28a'); return true; } say('Light it with your torch or dry tinder', '#cfd6e2'); return false; }
    if (F.cook && F.cook.done) { give('cooked:' + F.cook.k); emit('pickup', ['cooked:' + F.cook.k]); F.cook = null; return true; }
    if (!F.cook) { const raw = Object.keys(INV).find(k => k.startsWith('fish:') && INV[k] > 0); if (raw) { INV[raw]--; F.cook = { k: raw.slice(5), t: 0, done: false }; say('Cooking...', '#ffd28a'); return true; } }
    if (!PL.torch) return lightTorch();
    return false;
  }

  // ---- sharks: a fin first, circling, then it goes for an exposed edge
  function sharkTick(dt) {
    SH.swim += dt * (SH.state === 'bite' ? 9 : 4); SH.stun = Math.max(0, SH.stun - dt);
    const goTo = (x, z, sp) => { const dx = x - SH.x, dz = z - SH.z, d = Math.hypot(dx, dz) || 1; const a = Math.atan2(dz, dx); SH.yaw = a; SH.x += dx / d * Math.min(d, sp * dt); SH.z += dz / d * Math.min(d, sp * dt); return d; };
    const surf = waterH(SH.x, SH.z);
    if (SH.state === 'away') { SH.y = -6; SH.t -= dt; if (SH.t <= 0 && PL.play > 150) { SH.state = 'circle'; SH.t = rnd(18, 28); SH.ang = rnd(0, TAU); const r = 40; SH.x = RAFT.x + Math.cos(SH.ang) * r; SH.z = RAFT.z + Math.sin(SH.ang) * r; say('A fin, off the raft', '#ff9a7a'); emit('fin'); } return; }
    if (SH.state === 'circle') {
      SH.ang += dt * .32; const r = 10 + Math.sin(S.t * .4) * 1.5; goTo(RAFT.x + Math.cos(SH.ang) * r, RAFT.z + Math.sin(SH.ang) * r, 4.2); SH.y = ease(SH.y, surf - .45, 2, dt);
      SH.t -= dt; if (SH.t <= 0) {
        if (!PL.onRaft) { SH.state = 'player'; return; }
        const edge = [...RAFT.cells.values()].filter(c => exposed(RAFT, c)).sort((a, b) => (a.reinforce - b.reinforce) || (a.hp - b.hp) || (R() - .5))[0];
        if (edge) { SH.cell = ckey(edge.i, edge.j); SH.side = pick(openSides(RAFT, edge)); SH.state = 'approach'; } else SH.t = 10;
      }
      if (!PL.onRaft && Math.hypot(PL.wx - SH.x, PL.wz - SH.z) < 25) SH.state = 'player';
      return;
    }
    if (SH.state === 'player') {
      if (PL.onRaft) { SH.state = 'circle'; SH.t = 8; return; }
      const d = goTo(PL.wx, PL.wz, 5.5); SH.y = ease(SH.y, surf - .6, 2, dt);
      if (d < 1.3 && SH.biteT <= 0) { PL.hunger -= 14; SH.biteT = 3; PL.wx += Math.cos(SH.yaw) * 1.5; PL.wz += Math.sin(SH.yaw) * 1.5; emit('bitten'); say('Bitten! Get out of the water', '#ff6a5a'); }
      SH.biteT -= dt; return;
    }
    const c = RAFT.cells.get(SH.cell);
    if (SH.state === 'approach') {
      if (!c) { SH.state = 'circle'; SH.t = 6; return; }
      const [di, dj] = SIDES[SH.side], [tx, tz] = flatW(RAFT, c.i * CS + di * CS * .95, c.j * CS + dj * CS * .95), d = goTo(tx, tz, 5); SH.y = ease(SH.y, surf - .5, 2, dt);
      if (d < .5) { SH.state = 'bite'; SH.biteT = 0; emit('latch', c); say('Shark on the raft! Spear it (tool 5)', '#ff6a5a'); }
      return;
    }
    if (SH.state === 'bite') {
      if (!c) { SH.state = 'flee'; SH.t = 6; return; }
      const [di, dj] = SIDES[SH.side], [tx, tz] = flatW(RAFT, c.i * CS + di * CS * .92, c.j * CS + dj * CS * .92); const [cx2, cz2] = flatW(RAFT, c.i * CS, c.j * CS); SH.x = tx; SH.z = tz; SH.yaw = Math.atan2(cz2 - tz, cx2 - tx);   // jaws on the edge, facing in
      SH.y = waterH(tx, tz) - .25; SH.biteT += dt;
      if (SH.stun <= 0) { c.shake = .6; hurtCell(c, 7.5 * dt, 'shark'); RAFT.vy += Math.sin(S.t * 26) * .25 * dt * 60 * .02; }
      if (!RAFT.cells.has(SH.cell)) { SH.state = 'flee'; SH.t = 8; say('It tore the piece away', '#ff6a5a'); }
      else if (SH.biteT > 40) { SH.state = 'flee'; SH.t = 8; }
      return;
    }
    if (SH.state === 'flee') { SH.t -= dt; const a = Math.atan2(SH.z - RAFT.z, SH.x - RAFT.x); goTo(SH.x + Math.cos(a) * 30, SH.z + Math.sin(a) * 30, 7); SH.y = ease(SH.y, surf - 1.5, 1, dt); if (SH.t <= 0) { SH.state = 'away'; SH.t = rnd(170, 260); SH.hits = 0; } }
  }
  function spearHit() {
    if (PL.cool > 0) return false; PL.cool = .6; emit('thrust');
    if (SH.state !== 'bite' && SH.state !== 'player' && SH.state !== 'approach' && SH.state !== 'circle') return false;
    const e = eyePos(), d = lookDir(), vx = SH.x - e[0], vy = SH.y + .2 - e[1], vz = SH.z - e[2], dist = Math.hypot(vx, vy, vz);
    if (dist > 3.6 || (vx * d[0] + vy * d[1] + vz * d[2]) / dist < .8) return false;
    if (NET.client) { NET.ask('spear', {}); emit('sharkHit'); return true; }
    SH.hits++; SH.stun = 1.2; emit('sharkHit');
    if (SH.hits >= 3) { SH.state = 'flee'; SH.t = 10; say('It lets go and runs', '#9fe0a0'); }
    return true;
  }

  // ---- what the big events do to you
  function eventsTick(dt) {
    ui.warn = '';
    // giant swells: a warning while it comes, damage and a wash of spray as it passes
    for (const g of S.giants) {
      const u = g.dx * RAFT.x + g.dz * RAFT.z, ahead = u - g.s;
      if (ahead > 0 && ahead < 330) ui.warn = ahead < 120 ? 'HOLD ON! (hold Shift)' : 'A huge wave is coming: get off the damaged edges, then hold Shift to brace';
      if (!g.passed && ahead < 2) {
        g.passed = true; emit('wash', g.A);
        for (const c of [...RAFT.cells.values()]) if (exposed(RAFT, c) && c.hp < 60) hurtCell(c, 18 * g.A / 6, 'wave');
        if (PL.onRaft && !PL.brace) { const c = cellUnder(RAFT, PL.lx, PL.lz); if (c && exposed(RAFT, c) && !c.walls.some(Boolean) && chance(.75)) fallIn(1); }
      }
    }
    // a waterspout close by tears at the edges
    for (const s of S.spouts) { const d = Math.hypot(s.x - RAFT.x, s.z - RAFT.z); if (s.form > .8 && d < 10) { const ex = [...RAFT.cells.values()].filter(c => exposed(RAFT, c)); if (ex.length) hurtCell(pick(ex), 7 * dt, 'spout'); } }
    // the heart of a whirlpool grinds the raft
    for (const p of S.pools) { const d = Math.hypot(p.x - RAFT.x, p.z - RAFT.z); if (p.str > .5 && d < p.R * .22) { const ex = [...RAFT.cells.values()].filter(c => exposed(RAFT, c)); if (ex.length) hurtCell(pick(ex), 4 * p.str * dt, 'pool'); } }
  }

  // ---- Cthulhu: only after sunset, very rarely; a dev switch can call it for testing
  on('dusk', n => { CT.cool = Math.max(0, CT.cool - 1); if (n > 3 && CT.cool <= 0 && CT.state === 'none' && chance(.02)) CT.pending = rnd(15, 60); });
  function summon() {   // the developer trigger: at night now, or skip ahead to tonight first
    if (!isNight()) { S.tod = 20.3; S.phase = 'calm'; S.pt = 200; }
    CT.pending = 0;
  }
  function cthulhuTick(dt) {
    if (CT.pending >= 0 && CT.state === 'none') { CT.pending -= dt; if (CT.pending <= 0 && (isNight() || S.tod > 18.8)) startCthulhu(); else if (CT.pending <= 0) CT.pending = -1; }
    if (CT.state === 'none') return;
    CT.t += dt; const t = CT.t;
    if (CT.state === 'rumble') { if (t > CT.ring) { CT.ring = t + 2.4; S.rings.push({ x: CT.x + rnd(-15, 15), z: CT.z + rnd(-15, 15), age: 0, A: .5 }); } if (t > 9) { CT.state = 'rise'; emit('cthulhu', 'rise'); } }
    if (CT.state === 'rise') {
      CT.y = lp(-80, 0, sm(cl((t - 9) / 18, 0, 1))); S.forceFlash = 8;
      if (t > CT.ring) { CT.ring = t + 3.5; S.rings.push({ x: CT.x, z: CT.z, age: 0, A: .8 }); }
      if (t > 27) {
        CT.state = 'tower'; emit('cthulhu', 'tower');
        const dir = Math.atan2(RAFT.z - CT.z, RAFT.x - CT.x); S.giants.push({ dx: Math.cos(dir), dz: Math.sin(dir), s: Math.cos(dir) * CT.x + Math.sin(dir) * CT.z + 30, A: 3.6, c: 11 }); emit('giant');
        // whirlpools all round the raft, with one way out
        const gap = dir + Math.PI * .5 * (chance(.5) ? 1 : -1); CT.gap = gap;
        for (let n = 0; n < 4; n++) { const a = gap + .95 + n * 1.45, r = rnd(32, 38); const p = spawnPool(RAFT, .9, [RAFT.x + Math.cos(a) * r, RAFT.z + Math.sin(a) * r], 22, 95); p.fade = 40; }
        say('The sea is pulling apart. Find the gap and paddle', '#ffd28a');
      }
    }
    if (CT.state === 'tower') { S.forceFlash = 6; if (t > 72) { CT.state = 'sink'; emit('cthulhu', 'sink'); } }
    if (CT.state === 'sink') {
      CT.y = lp(0, -95, sm(cl((t - 72) / 22, 0, 1)));
      if (R() < dt * .8) emit('splash', CT.x + rnd(-60, 60), CT.z + rnd(-60, 60), true);
      if (!CT.dropped && t > 84) { CT.dropped = true; const a = Math.atan2(CT.z - RAFT.z, CT.x - RAFT.x); for (let n = 0; n < 7; n++) addFloater(pick(['panel', 'crate', 'barrel', 'log', 'wallpiece']), RAFT.x + Math.cos(a) * rnd(25, 60) + rnd(-12, 12), RAFT.z + Math.sin(a) * rnd(25, 60) + rnd(-12, 12)); }
      if (t > 95) { CT.state = 'none'; CT.cool = 6; CT.seen++; emit('cthulhu', 'gone'); }
    }
  }
  function startCthulhu() {
    const a = rnd(0, TAU); Object.assign(CT, { state: 'rumble', t: 0, x: RAFT.x + Math.cos(a) * 240, z: RAFT.z + Math.sin(a) * 240, y: -80, ring: 0, dropped: false, pending: -1 });
    emit('cthulhu', 'rumble'); emit('rumble');
  }

  // ---- hunger, fainting, the clock that keeps it all turning
  function hungerTick(dt) {
    PL.hunger -= dt * 100 / (22 * 60);   // about twenty-two minutes from full to empty
    PL.thirst -= dt * 100 / (16 * 60) * (S.tod > 11 && S.tod < 16 && S.cloud < .5 ? 1.25 : 1);   // thirst comes faster, worst in the midday sun
    if (PL.thirst < 0) PL.thirst = 0;
    if (PL.hunger <= 0 || PL.thirst <= 0) { PL.hunger = Math.max(0, PL.hunger); PL.faint += dt; if (PL.faint > 25) faint(); } else PL.faint = 0;
  }
  function faint(drowned) {
    const why = drowned ? 'You black out' : PL.thirst <= 0 ? 'You black out from thirst' : 'You black out from hunger';
    PL.faint = 0; PL.hunger = Math.max(PL.hunger, 35); PL.thirst = Math.max(PL.thirst, 35); PL.air = 100; for (const k of Object.keys(INV)) if (k.startsWith('fish:') || k.startsWith('cooked:')) INV[k] = 0;
    if (!PL.onRaft) climbOut() || Object.assign(PL, { onRaft: true, lx: 0, lz: 0 });
    S.tod = 7; emit('faint'); say(why + ', and wake at dawn on the raft', '#ffb08a');
  }
  // keep the numbers small: when the raft has drifted far, move the world back round it
  function recentre() {
    if (Math.hypot(RAFT.x, RAFT.z) < 400) return;
    const dx = RAFT.x, dz = RAFT.z; S.ox += dx; S.oz += dz;
    const mv = o => { o.x -= dx; o.z -= dz; };
    mv(RAFT); DRIFT.forEach(mv); FL.forEach(mv); S.pools.forEach(mv); S.rings.forEach(mv); S.spouts.forEach(mv); mv(SH); mv(CT); mv(HK); mv(FS); mv(CACHE);
    for (const g of S.giants) g.s -= g.dx * dx + g.dz * dz;
    PL.wx -= dx; PL.wz -= dz; emit('recentre', dx, dz);
  }
  let paddle = [0, 0];
  function lifeTick(dt, I) {
    PL.play += dt; PL.cool = Math.max(0, PL.cool - dt);
    seaFrame(); if (NET.client) { S.t += dt; S.tod = (S.tod + dt * 24 / DAY_LEN) % 24; } else { NET.fw = NET.on ? [] : null; weatherTick(dt, RAFT); }
    // paddling with the oar pushes the raft the way you face
    paddle = [0, 0]; if (PL.tool === 'oar' && I.use && PL.onRaft) { const f = 1.65; paddle = [-Math.sin(PL.yaw) * f, -Math.cos(PL.yaw) * f]; PL.paddleT = (PL.paddleT || 0) + dt; } else PL.paddleT = 0;
    if (NET.client) NET.paddleOut = paddle;
    bodyPhys(RAFT, dt, { px: paddle[0] + NET.paddle[0], pz: paddle[1] + NET.paddle[1] });
    if (!NET.client) for (const d of DRIFT) { bodyPhys(d, dt, { px: d.px || 0, pz: d.pz || 0 }); d.life -= dt; d.px *= Math.exp(-dt / 50); d.pz *= Math.exp(-dt / 50); } for (let n = DRIFT.length - 1; n >= 0; n--) if (DRIFT[n].life <= 0 || Math.hypot(DRIFT[n].x - RAFT.x, DRIFT[n].z - RAFT.z) > 180) DRIFT.splice(n, 1);
    for (const c of RAFT.cells.values()) { c.shake = Math.max(0, c.shake - dt * 1.5); c.hit = Math.max(0, c.hit - dt * 2); }
    PL.brace = !!I.brace;
    if (PL.onRaft) moveRaftPlayer(I, dt); else { swim(I, dt); ui.place = null; }
    HK.reel = I.use && PL.tool === 'hook'; FS.reel = I.use && PL.tool === 'rod';
    hookTick(dt); fishTick(dt);
    if (!NET.client) { spawnTick(dt); floaterTick(dt); sharkTick(dt); eventsTick(dt); cthulhuTick(dt); fireTick(dt); piecesTick(dt); cacheTick(dt); } else for (const f of FL) bob(f, dt, DRAFT[f.k] || .1);
    if (NET.fw && NET.out) NET.out.push(...NET.fw); NET.fw = null; torchTick(dt); hungerTick(dt);
    // the aim: what the hammer would build or mend, what E would use
    ui.aim = PL.onRaft ? deckAim() : null; placeTick(); ui.prompt = promptFor();
    if (!NET.client) recentre();
    if (NET.tick) NET.tick(dt);
    saveT -= dt; if (saveT <= 0) { saveT = 30; saveRun(); }
  }

  // ---- the controls call these
  function promptFor() {
    if (ui.place) return ui.place.set ? (ui.place.ok ? 'Click  SOLIDIFY  ·  R rotate  ·  right click to move it' : 'It has to lie on the deck: R rotate · right click to move it') : 'Click to set it down  ·  R or wheel rotate  ·  right click cancel';
    if (nearCache()) return 'E  Open the sunken crate';
    if (!PL.onRaft) return Math.min(...[...RAFT.cells.values()].map(c => { const [wx, wz] = flatW(RAFT, c.i * CS, c.j * CS); return Math.hypot(wx - PL.wx, wz - PL.wz); })) < 2.6 ? 'E  Climb aboard' : 'Swim to the raft';
    const f = nearFloater(); if (f) return 'E  Grab the ' + ({ wallpiece: 'broken wall', panel: 'broken platform' }[f.k] || f.k);
    const a = ui.aim, c = a && a.dist < 3.2 ? cellAt(RAFT, a.i, a.j) : null;
    if (c && c.fire) { const F = c.fire; return !F.lit ? 'E  Light the fire' : F.cook ? (F.cook.done ? 'E  Take the cooked fish' : 'Cooking...') : Object.keys(INV).some(k => k.startsWith('fish:') && INV[k] > 0) ? 'E  Cook a fish' : !PL.torch ? 'E  Light your torch' : 'Fire'; }
    if (PL.onRaft && logAimed()) return 'E  Pry the log loose';
    if (c && c.obj === 'storage') return `Storage: ${INV.tinder || 0} dry tinder kept here`;
    if (c && HOLD[c.obj]) { const n = c.store || 0, P = PIECES[c.obj]; return n ? `E  Take ${n} ${c.obj === 'trap' ? (n > 1 ? 'fish' : 'fish') : 'fresh water'} from the ${P.n.toLowerCase()}` : `${P.n}: ${P.tip.toLowerCase()}`; }
    if (PL.tool === 'hammer' && c && c.hp < 100) return `Right click  Mend (1 plank)  ·  ${Math.ceil(c.hp)}%`;
    return '';
  }
  const act = {
    useDown() {
      if (placeClick()) return;
      const t = PL.tool;
      if (t === 'hook') { if (HK.state === 'idle') { HK.state = 'charge'; HK.charge = 0; } }
      else if (t === 'rod') { if (!PL.tools.rod) return; if (FS.state === 'idle') { FS.state = 'charge'; FS.charge = 0; } }
      else if (t === 'spear') spearHit();
      else if (t === 'torch') { if (!PL.torch) lightTorch(); }
      else if (t === 'hammer') { const a = ui.aim; if (a && ui.buildKind) { if (place(ui.buildKind, a.i, a.j, a.side)) say(PIECES[ui.buildKind].n + ' built', '#9fe0a0'); else if (!has(PIECES[ui.buildKind].need)) say('Not enough materials', '#ff9a7a'); } }
      else if (t === 'food') eat();
      else if (t === 'water') drink();
    },
    useUp() {
      if (HK.state === 'charge') { throwFrom(HK, HK.charge, 6, 21); HK.state = 'fly'; HK.items = []; emit('cast', 'hook'); }
      if (FS.state === 'charge') { throwFrom(FS, FS.charge, 5, 17); FS.state = 'fly'; emit('cast', 'rod'); }
    },
    alt() {
      if (placeBack()) return;
      if (PL.tool === 'hook' && HK.state !== 'idle') dropHook();
      else if (PL.tool === 'rod' && FS.state !== 'idle') FS.state = 'idle';
      else if (PL.tool === 'hammer') { const a = ui.aim, c = a && cellAt(RAFT, a.i, a.j); if (c && !repair(c)) say(c.hp >= 100 ? 'Not damaged' : 'Mending needs a plank', '#cfd6e2'); }
    },
    interact() {
      if (nearCache()) return openCache();
      if (!PL.onRaft) return climbOut();
      const f = nearFloater(); if (f) return collect(f);
      const a = ui.aim, c = a && a.dist < 3.2 ? cellAt(RAFT, a.i, a.j) : null;
      if (c && c.fire) return useFire(c);
      if (c && HOLD[c.obj]) return emptyPiece(c);
      { const Lg = logAimed(); if (Lg) { if (NET.client) { NET.ask('unlog', { lx: Lg.lx, lz: Lg.lz }); return true; } RAFT.logs.splice(RAFT.logs.indexOf(Lg), 1); RAFT.ver++; give('log'); pickupMsg(['log']); return true; } }
      if (PL.tool === 'torch' && !PL.torch) return lightTorch();
    },
    select(t) { if (t === 'food' || t === 'water' || PL.tools[t]) { PL.tool = t; if (t !== 'hook') dropHook(); if (t !== 'rod') FS.state = 'idle'; ui.buildOpen = t === 'hammer' && ui.buildOpen; } },
    craft(t) { const T = TOOLS[t]; if (PL.tools[t] || !T.need || (T.after && PL.pickups < T.after) || !has(T.need)) return false; spend(T.need); PL.tools[t] = 1; act.select(t); emit('craft', t); say(T.n + ' made', '#9fe0a0'); return true; },
  };
  const craftable = () => Object.keys(TOOLS).filter(t => TOOLS[t].need && !PL.tools[t] && !(TOOLS[t].after && PL.pickups < TOOLS[t].after));

  // ---- a new raft, or the one you left
  function newRun() {
    RAFT = newBody(0, 0); for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) RAFT.cells.set(ckey(i, j), newCell(i, j));
    DRIFT.length = 0; FL.length = 0; for (const k of Object.keys(INV)) delete INV[k]; INV.water = 2; Object.assign(CACHE, { on: false, t: 150 });
    Object.assign(PL, { onRaft: true, lx: .75, lz: .75, ly: 0, vy: 0, hunger: 100, thirst: 100, air: 100, faint: 0, tools: { hook: 1, torch: 1 }, tool: 'hook', torch: false, torchWet: 0, pickups: 0, play: 0, pitch: -.08 });
    Object.assign(S, { t: 0, ox: 0, oz: 0, sea: .14, seaTo: .14, wind: 4, rain: 0, cloud: .25, phase: 'calm', pt: 330, tod: 7.2, day: 1, nights: 0, giants: [], pools: [], rings: [], spouts: [], bolts: [], nextPool: 480 });
    Object.assign(SPN, { quiet: 5, left: 0, groups: 0 }); Object.assign(SH, { state: 'away', t: 230, hits: 0 }); Object.assign(CT, { state: 'none', cool: 0, pending: -1, y: -90 });
    HK.state = 'idle'; HK.items = []; FS.state = 'idle';
    // face the way the wreckage will come from
    PL.yaw = Math.atan2(-Math.cos(S.windAng), -Math.sin(S.windAng));
    emit('newRun');
  }
  function snapshot() {
    return { v: 1, raft: { yaw: RAFT.yaw, logs: RAFT.logs.map(l => ({ ...l })), cells: [...RAFT.cells.values()].map(c => ({ ...c, fire: c.fire ? { lit: c.fire.lit, cook: c.fire.cook } : null })) }, inv: { ...INV },
      pl: { hunger: PL.hunger, thirst: PL.thirst, tools: PL.tools, tool: PL.tool, pickups: PL.pickups, torch: PL.torch, lx: PL.onRaft ? PL.lx : 0, lz: PL.onRaft ? PL.lz : 0, play: PL.play },
      s: { tod: S.tod, day: S.day, nights: S.nights }, ct: { cool: CT.cool, seen: CT.seen }, at: Date.now() };
  }
  function saveRun() { if (!runLive || NET.client) return; try { K.save.bw = Object.assign(K.save.bw || {}, { cfg: CFG, run: snapshot() }); K.persist(); } catch (e) {} }
  const savedRun = () => { try { return (K.save.bw || {}).run || null; } catch (e) { return null; } };
  function loadRun(r) {
    newRun(); if (!r) return;
    RAFT.cells.clear(); for (const c of r.raft.cells) RAFT.cells.set(ckey(c.i, c.j), Object.assign(newCell(c.i, c.j), c, { shake: 0, hit: 0 })); RAFT.yaw = r.raft.yaw || 0; RAFT.logs = (r.raft.logs || []).map(l => ({ ...l })); RAFT.ver++;
    Object.assign(INV, r.inv); Object.assign(PL, r.pl, { onRaft: true }); if (!cellUnder(RAFT, PL.lx, PL.lz)) { const c = RAFT.cells.values().next().value; PL.lx = c.i * CS; PL.lz = c.j * CS; }
    Object.assign(S, r.s); Object.assign(CT, r.ct || {}); SPN.groups = 3;
  }
