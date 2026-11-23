  /* ---------- 73 alive: life inside the walls ----------
     The far life (71) is all past the walls. This is what you walk among, built from the map's own cells so every map gets it:
       cloths on the walls that sway in the wind (signal flags, banners, vines, bunting; glowing strips in the city and on the station);
       drifts in the corners (salt, snow, sand, leaves, slag, moss, rubbish);
       cans and bottles on the crates and half walls, which a bullet knocks flying (back again next round);
       birds on the ground that take off when someone runs past, comes right up to them or fires near them, wheel for a
       while and come back down (so a flock going up tells you somebody is there, as a footstep does);
       a mist over the harbour and dust on the station (the other themes have their own air already);
       and the daylight: clouds cross the sun, the caldera flickers, the station turns.
     Each kind is one or two instanced meshes, a few dozen instances at most, and the Low setting has about half. */
  function buildAlive(W, TH) {
    const Z = X.mech, t = MAP.theme, low = X.low, life = fn => Z.life.push(fn), add = o => { W.add(o); return o; };
    const seed = [...MAP.k].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11);
    const hash = (...v) => { let h = seed ^ 0x9e3779b9; for (const q of v) { h = Math.imul(h ^ (q | 0), 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; } return (h >>> 0) / 4294967296; };
    const ch = (i, j) => (SRC[j] || '')[i] || '#', floor = (i, j) => { const k = idx(i, j); return k >= 0 && NAV[k] && CH[k] < .1; }, roofed = (i, j) => { const k = idx(i, j); return k >= 0 && CEIL[k] > 0; };
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(0, 0, 0, 'YXZ'), p4 = new THREE.Vector3(), s4 = new THREE.Vector3(), cc = new THREE.Color();
    const put = (im, k, x, y, z, rx, ry, rz, sx, sy, sz) => { p4.set(x, y, z); e4.set(rx, ry, rz); q4.setFromEuler(e4); s4.set(sx, sy, sz); m4.compose(p4, q4, s4); im.setMatrixAt(k, m4); };
    const pickN = (list, n) => list.sort((a, b) => a.h - b.h).slice(0, n);
    const A = X.alive = { cans: [], canM: null, flocks: [], scatter: null };
    const E4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    // ---- cloths on the walls: a pole out from the wall, well over head height, and a cloth hanging from it that swings
    {
      const cols = { harbor: ['#e04a3a', '#f2c230', '#2f6fd0', '#f4f4f0'], neon: ['#ff3ea5', '#3df2ff', '#ffd23f'], snow: ['#ff7a1a', '#e03a2a'], desert: ['#b5523f', '#2f8f8a', '#d9a441', '#6a4a8a'], jungle: ['#3f8a3a', '#5aa04a', '#2f6a34'], lava: ['#f2c230', '#ff6a1a'], autumn: ['#c0392b', '#d9a441', '#3f6a8a'], space: ['#38e8ff', '#9fd8ff'] }[t] || ['#e04a3a', '#f2c230'];
      const vine = t === 'jungle', glowing = t === 'neon' || t === 'space', w = vine ? .3 : .62, h = vine ? 1.7 : 1, y0 = vine ? 4 : 3.55, wind = { harbor: 1.3, snow: 1.2, desert: 1.1, autumn: 1, jungle: .5, lava: .5, neon: .7, space: .25 }[t] || 1;
      let spots = [];
      for (let j = 1; j < GH - 1; j++) for (let i = 1; i < GW - 1; i++) { if (ch(i, j) !== '#') continue;
        E4.forEach(([di, dj], e) => { if (!floor(i + di, j + dj) || roofed(i + di, j + dj)) return; const hh = hash(i, j, e, 1); if (hh > .16) return;
          spots.push({ h: hh, x: (i + .5 + di * .5) * CS, z: (j + .5 + dj * .5) * CS, nx: di, nz: dj }); }); }
      spots = pickN(spots, low ? 14 : 30);
      if (spots.length) {
        const geo = new THREE.PlaneGeometry(w, h); geo.translate(.16 + w / 2, -h / 2, 0);
        const mat = glowing ? new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: t === 'space', opacity: t === 'space' ? .7 : 1 }) : new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
        const im = add(new THREE.InstancedMesh(geo, mat, spots.length)); im.frustumCulled = false;
        const poles = [];
        spots.forEach((s, k) => { s.yaw = Math.atan2(-s.nz, s.nx); s.ph = hash(k, 7) * TAU; cc.set(LC(cols[Math.floor(hash(k, 3) * cols.length)])); im.setColorAt(k, cc);
          poles.push(new THREE.CylinderGeometry(.022, .022, w + .3, 5).rotateZ(Math.PI / 2).translate((w + .3) / 2, 0, 0).rotateY(s.yaw).translate(s.x, y0, s.z)); });
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        add(new THREE.Mesh(mergeGeos(poles), new THREE.MeshLambertMaterial({ color: LC(t === 'jungle' ? '#4a3a28' : '#3a3f48') })));
        life(T => { const gust = .6 + .4 * Math.sin(T * .23) * Math.sin(T * .071 + 1);
          for (let k = 0; k < spots.length; k++) { const s = spots[k], a = (Math.sin(T * 1.7 + s.ph) * .2 + Math.sin(T * 2.9 + s.ph * 2) * .07 + .1) * wind * gust; put(im, k, s.x, y0, s.z, a, s.yaw, 0, 1, 1, 1); }
          im.instanceMatrix.needsUpdate = true; });
      }
    }

    // ---- drifts in the corners (not on the station: it is swept)
    if (t !== 'space') {
      const col = { harbor: '#d8d2bc', neon: '#262a34', snow: '#f4f8fc', desert: '#dcb97c', jungle: '#4d6e36', lava: '#3b3331', autumn: '#c96a2c' }[t] || '#b8b0a0';
      let spots = [];
      for (let j = 1; j < GH - 1; j++) for (let i = 1; i < GW - 1; i++) { if (!floor(i, j) || !'.oqr'.includes(ch(i, j))) continue;
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) { if (ch(i + sx, j) !== '#' || ch(i, j + sz) !== '#') continue; const hh = hash(i, j, sx + 2, sz + 5); if (hh > .34) continue;
          spots.push({ h: hh, x: (i + .5 + sx * .5) * CS - sx * .3, z: (j + .5 + sz * .5) * CS - sz * .3 }); } }
      spots = pickN(spots, low ? 18 : 40);
      if (spots.length) {
        const im = add(new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ flatShading: true }), spots.length)); im.receiveShadow = !low;
        spots.forEach((s, k) => { const r = .5 + hash(k, 21) * .45; put(im, k, s.x, 0, s.z, 0, hash(k, 22) * TAU, 0, r, r * (.3 + hash(k, 23) * .22), r); cc.set(LC(col)).multiplyScalar(.82 + hash(k, 24) * .3); im.setColorAt(k, cc); });
        im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      }
    }

    // ---- cans and bottles on the crates and the half walls: a bullet through one sends it flying
    {
      const cols = ['#c0392b', '#2f8f8a', '#d9a441', '#e8e4d8', '#3f6a8a', '#5a8a3a'], list = [];
      for (let j = 1; j < GH - 1; j++) for (let i = 1; i < GW - 1; i++) { const c = ch(i, j); if (c !== 'c' && c !== 'h') continue; const n = hash(i, j, 31) < .45 ? (hash(i, j, 32) < .4 ? 2 : 1) : 0;
        for (let q = 0; q < n; q++) { const tall = hash(i, j, q, 33) < .4; list.push({ h: hash(i, j, q, 34), x: (i + .5) * CS + (hash(i, j, q, 35) - .5) * 1.3, z: (j + .5) * CS + (hash(i, j, q, 36) - .5) * 1.3, y0: CH[idx(i, j)], sy: tall ? 1.8 : 1, c: cols[Math.floor(hash(i, j, q, 37) * cols.length)] }); } }
      const cans = pickN(list, low ? 36 : 70);
      if (cans.length) {
        const im = add(new THREE.InstancedMesh(new THREE.CylinderGeometry(.05, .05, .15, 7), new THREE.MeshLambertMaterial(), cans.length)); im.frustumCulled = false;
        const rest = k => { const c = cans[k]; c.live = true; c.fly = null; put(im, k, c.x, c.y0 + .075 * c.sy, c.z, 0, 0, 0, 1, c.sy, 1); };
        cans.forEach((c, k) => { cc.set(LC(c.c)); im.setColorAt(k, cc); rest(k); }); im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
        A.cans = cans; A.canM = im; A.resetCans = () => { cans.forEach((c, k) => rest(k)); im.instanceMatrix.needsUpdate = true; };
        life((T, dt) => { let any = false;
          for (let k = 0; k < cans.length; k++) { const c = cans[k], F = c.fly; if (!F) continue; any = true; F.t += dt; F.vy -= 14 * dt; F.x += F.vx * dt; F.y += F.vy * dt; F.z += F.vz * dt;
            if (F.y < .05 || F.t > 2.5) { c.fly = null; put(im, k, c.x, -5, c.z, 0, 0, 0, .001, .001, .001); } else put(im, k, F.x, F.y, F.z, F.t * F.sp, F.t * 3, F.t * F.sp * .7, 1, c.sy, 1); }
          if (any) im.instanceMatrix.needsUpdate = true; });
      }
    }

    // ---- birds on the ground (the station has none)
    if (t !== 'space') {
      const kind = { harbor: ['#f2f2ee', '#c9ccd0', 1150, 'sine', -420], neon: ['#7b808c', '#5a5f6a', 520, 'sine', -120], snow: ['#26282c', '#1a1b1e', 480, 'sawtooth', -180], desert: ['#6e5842', '#4f3f30', 1700, 'sine', -600], jungle: ['#d8452f', '#2f8a4a', 2500, 'sine', 700], lava: ['#1f1d1d', '#141313', 460, 'sawtooth', -170], autumn: ['#24211f', '#171514', 500, 'sawtooth', -190] }[t] || ['#7b808c', '#5a5f6a', 520, 'sine', -120];
      const spawnCell = (i, j) => 'AD'.includes(ch(i, j));
      let cand = [];
      for (let j = 2; j < GH - 2; j++) for (let i = 2; i < GW - 2; i++) { if (ch(i, j) !== '.' || !floor(i, j) || roofed(i, j)) continue;
        let ok = true; for (let b = -3; b <= 3 && ok; b++) for (let a = -3; a <= 3; a++) if (spawnCell(i + a, j + b)) { ok = false; break; }
        if (ok && E4.every(([di, dj]) => floor(i + di, j + dj))) cand.push({ h: hash(i, j, 41), x: (i + .5) * CS, z: (j + .5) * CS }); }
      cand.sort((a, b) => a.h - b.h); const homes = [];
      for (const c of cand) { if (homes.length >= (low ? 3 : 5)) break; if (homes.every(o => Math.hypot(o.x - c.x, o.z - c.z) > 18)) homes.push(c); }
      const per = low ? 3 : 4, n = homes.length * per;
      if (n) {
        const body = mergeGeos([new THREE.BoxGeometry(.13, .12, .28).translate(0, .1, 0), new THREE.BoxGeometry(.09, .09, .1).translate(0, .19, -.17), new THREE.BoxGeometry(.08, .03, .14).translate(0, .1, .2)]);
        const wing = new THREE.BufferGeometry(); wing.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-.5, .22, .1, 0, .12, -.1, 0, .12, .14, .5, .22, .1, 0, .12, .14, 0, .12, -.1]), 3)); wing.computeVertexNormals();
        const bm = add(new THREE.InstancedMesh(body, new THREE.MeshLambertMaterial({ color: LC(kind[0]) }), n)), wm = add(new THREE.InstancedMesh(wing, new THREE.MeshLambertMaterial({ color: LC(kind[1]), side: THREE.DoubleSide }), n)); bm.frustumCulled = wm.frustumCulled = false;
        const flocks = homes.map((hm, fi) => ({ x: hm.x, z: hm.z, up: false, t0: 0, dur: 18, birds: Array.from({ length: per }, (_, b) => { const a = hash(fi, b, 51) * TAU, r = .4 + hash(fi, b, 52) * .9;
          return { gx: hm.x + Math.cos(a) * r, gz: hm.z + Math.sin(a) * r, yaw: hash(fi, b, 53) * TAU, ph: hash(fi, b, 54) * TAU, R: 5 + hash(fi, b, 55) * 4, H: 8 + hash(fi, b, 56) * 4, w: (.75 + hash(fi, b, 57) * .4) * (b % 2 ? 1 : -1), px: 0, pz: 0 }; }) }));
        A.flocks = flocks;
        A.scatter = (F, T) => { if (F.up) return; F.up = true; F.t0 = T == null ? Z.t : T; F.dur = 16 + Math.random() * 8;
          if (canHear() && M) { const o = atPos(F.x, F.z, .9); hiss(o, .6, .09, 'bandpass', 1500, 0, 1.2); for (let k = 0; k < 2; k++) tone(o, kind[2] * (.9 + Math.random() * .2), .2, kind[3], .035, kind[4], .12 + k * .22); } };
        const ease = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
        life((T, dt) => {
          const fs = M ? M.fs : null;
          flocks.forEach((F, fi) => {
            let near = false, flush = false;
            if (fs) for (const f of fs) { if (!f.alive) continue; const d = Math.hypot(f.x - F.x, f.z - F.z); if (d < 9) near = true; if (d < 2.6 || (d < 6 && Math.hypot(f.vx, f.vz) > 3.4)) flush = true; }
            if (!F.up && flush) A.scatter(F, T);
            const u = T - F.t0; if (F.up && u > F.dur) { if (near) F.dur += dt; else if (u > F.dur + 3) F.up = false; }
            F.birds.forEach((b, bi) => { const k = fi * per + bi;
              if (!F.up) { const peck = Math.max(0, Math.sin(T * 1.9 + b.ph * 7) - .82) * 3.2; put(bm, k, b.gx, 0, b.gz, peck, b.yaw, 0, 1, 1, 1); put(wm, k, b.gx, -3, b.gz, 0, 0, 0, .001, .001, .001); return; }
              const a = b.ph + u * b.w, ox = F.x + Math.cos(a) * b.R, oz = F.z + Math.sin(a) * b.R * .8, oy = b.H + Math.sin(u * .8 + b.ph) * .8;
              const k1 = ease(u / 1.6), k2 = u > F.dur ? ease((u - F.dur) / 3) : 0, kk = k1 * (1 - k2);
              const x = lp(b.gx, ox, kk), y = oy * kk, z = lp(b.gz, oz, kk), dx = x - b.px, dz = z - b.pz; if (dx * dx + dz * dz > 1e-6) b.fy = Math.atan2(-dx, -dz); b.px = x; b.pz = z;
              const yaw = b.fy == null ? b.yaw : b.fy; put(bm, k, x, y, z, 0, yaw, 0, 1, 1, 1); put(wm, k, x, y, z, 0, yaw, 0, 1, Math.sin(T * 15 + b.ph), 1); });
          });
          bm.instanceMatrix.needsUpdate = wm.instanceMatrix.needsUpdate = true;
        });
      }
    }

    // ---- air where the theme has none of its own: a mist drifting over the quay, dust turning in the station's light
    if (t === 'harbor' || t === 'space') {
      const n = Math.round((t === 'harbor' ? 260 : 200) * (low ? .5 : 1)), pos = new Float32Array(n * 3), top = t === 'harbor' ? 3.5 : 6;
      for (let k = 0; k < n; k++) { pos[k * 3] = Math.random() * MW; pos[k * 3 + 1] = .2 + Math.random() * top; pos[k * 3 + 2] = Math.random() * MH; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = add(new THREE.Points(geo, new THREE.PointsMaterial({ color: LC(t === 'harbor' ? '#eef4f6' : '#9fd8ff'), size: t === 'harbor' ? .09 : .05, transparent: true, opacity: t === 'harbor' ? .5 : .7, depthWrite: false }))); pts.frustumCulled = false;
      const vx = t === 'harbor' ? 1.1 : .12;
      life((T, dt) => { for (let k = 0; k < n; k++) { const i = k * 3; pos[i] += (vx + Math.sin(T * .6 + k) * .3) * dt; pos[i + 1] += Math.sin(T * .9 + k * 1.7) * dt * .15; pos[i + 2] += Math.cos(T * .5 + k * .9) * dt * .25; if (pos[i] > MW) pos[i] -= MW; if (pos[i + 2] > MH) pos[i + 2] -= MH; else if (pos[i + 2] < 0) pos[i + 2] += MH; }
        geo.attributes.position.needsUpdate = true; });
    }

    // ---- the light: never quite still
    {
      const sun0 = X.sun.intensity, day = t === 'harbor' || t === 'snow' || t === 'desert' || t === 'jungle' || t === 'autumn';
      life(T => { let k;
        if (day) { const c = .5 + .5 * Math.sin(T * .09 + Math.sin(T * .037) * 2.2); k = 1 - .17 * c * c; }
        else if (t === 'lava') k = 1 + Math.sin(T * 1.7) * .035 + Math.sin(T * 4.3 + Math.sin(T * .9) * 2) * .03;
        else if (t === 'neon') k = 1 + Math.sin(T * .5) * .05;
        else k = 1 + Math.sin(T * .12) * .08;
        X.sun.intensity = sun0 * k; });
    }
  }
  // a shot: a can or a bottle in its way goes flying, and the birds near the gun go up
  on('shot', (f, S, first) => {
    const A = X && X.alive; if (!A || !S || !S.o) return;
    if (first && A.scatter && !gun(f).sil) for (const F of A.flocks) if (!F.up && Math.hypot(F.x - f.x, F.z - f.z) < 18) A.scatter(F);
    if (!A.canM) return; const o = S.o, d = S.d, L = S.dist; let hit = false;
    for (let k = 0; k < A.cans.length; k++) { const c = A.cans[k]; if (!c.live) continue; const cy = c.y0 + .075 * c.sy, rx = c.x - o[0], ry = cy - o[1], rz = c.z - o[2], along = rx * d[0] + ry * d[1] + rz * d[2]; if (along < 0 || along > L + .2) continue;
      const px = rx - d[0] * along, py = ry - d[1] * along, pz = rz - d[2] * along; if (px * px + pz * pz > .012 || Math.abs(py) > .09 * c.sy + .05) continue;
      c.live = false; hit = true; c.fly = { x: c.x, y: cy, z: c.z, vx: d[0] * 3 + (Math.random() - .5) * 2, vy: 2.4 + Math.random() * 1.6, vz: d[2] * 3 + (Math.random() - .5) * 2, t: 0, sp: 9 + Math.random() * 9 };
      if (canHear()) { const out = atPos(c.x, c.z, .7); tone(out, 2300 + Math.random() * 900, .08, 'triangle', .05, -1100); hiss(out, .05, .05, 'highpass', 4200); } }
  });
  on('round', () => { const A = X && X.alive; if (!A) return; if (A.resetCans) A.resetCans(); for (const F of A.flocks) F.up = false; });
  on('boom', () => { const A = X && X.alive; if (A && A.scatter) for (const F of A.flocks) A.scatter(F); });
