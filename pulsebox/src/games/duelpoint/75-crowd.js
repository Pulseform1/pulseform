  /* ---------- 75 crowd: eight fighters for the price of the ones in view ----------
     A 4v4 puts seven other bodies in the scene, each some forty pieces (a rival twice that, with its red outline), and at
     most moments most of them are behind walls. Just before the world is drawn, each body is tested against the map from
     the camera: rays to points across it, from the feet to over the head and out to a gun's length either side and in
     front (along the ground too, for one who has fallen). Only when every ray meets something solid is the body left out
     of that frame. The test reads the cells as they are drawn: a roof is its thin slab (not the solid block bullets treat
     it as), a doorway has its wall above, and while a blast door is moving nobody is left out, so it can only skip a body
     that really is out of sight. With shadows on, a hidden body still casts its shadow when it is close by (one can fall
     round a corner into view) or the ground its shadow falls on is in view. Nothing here changes the game: who sees or hits whom is 40-sim's. X.crowd counts what it did. */
  const CROWD_NEAR = 3, CROWD_SHADE = 15;   // metres: nobody this close is left out; one left out within this still casts a shadow
  const CROWD_LAT = [0, -.32, .32, -.75, .75], CROWD_UP = [1.75, .95, .15];   // the points tested: across the body, and up it
  let crowdRF = null, crowdMap = null;
  // the drawn solids above the ground, per cell: a roof slab's height, and doorways (wall from the top of the door up)
  function crowdCells() {
    if (crowdRF && crowdMap === MAP && crowdRF.h.length === NC) return crowdRF;
    crowdMap = MAP; crowdRF = { h: new Float32Array(NC), door: new Uint8Array(NC) };
    for (const rf of ROOFS) for (let j = rf.r[1]; j <= rf.r[3]; j++) for (let i = rf.r[0]; i <= rf.r[2]; i++) { const k = idx(i, j); if (k >= 0) crowdRF.h[k] = rf.h; }
    for (const d of DOORS) for (let j = d[1]; j <= d[3]; j++) for (let i = d[0]; i <= d[2]; i++) { const k = idx(i, j); if (k >= 0) { crowdRF.door[k] = 1; crowdRF.h[k] = 0; } }
    return crowdRF;
  }
  // how far a ray from o along d gets (up to max) before the ground, a wall, a crate, stairs, a lintel or a roof slab
  function crowdRay(ox, oy, oz, dx, dy, dz, max, RF) {
    let i = Math.floor(ox / CS), j = Math.floor(oz / CS), t = 0;
    const si = dx > 0 ? 1 : -1, sj = dz > 0 ? 1 : -1, adx = Math.abs(dx) || 1e-9, adz = Math.abs(dz) || 1e-9, tdx = CS / adx, tdz = CS / adz;
    let tx = (dx > 0 ? (i + 1) * CS - ox : ox - i * CS) / adx, tz = (dz > 0 ? (j + 1) * CS - oz : oz - j * CS) / adz;
    for (let n = 0; n < 240; n++) {
      const tn = Math.min(tx, tz, max), k = idx(i, j);
      if (k >= 0) {
        const y0 = oy + dy * t, y1 = oy + dy * tn, ylo = Math.min(y0, y1), yhi = Math.max(y0, y1);
        let s0 = CH[k], s1 = s0; if (CAX[k]) { s0 = lp(CH[k], CB[k], cl((oz + dz * t) / CS - j, 0, 1)); s1 = lp(CH[k], CB[k], cl((oz + dz * tn) / CS - j, 0, 1)); }
        if (y0 < s0 - 1e-4 || y1 < s1 - 1e-4) return t;   // into the ground, a wall or a box
        if (RF.door[k] && yhi > DOOR_H && ylo < WALL_H) return t;   // the wall over a doorway
        if (RF.h[k] && yhi > RF.h[k] && ylo < RF.h[k] + .3) return t;   // a roof's slab
      }
      if (tn >= max || i < -3 || j < -3 || i > GW + 2 || j > GH + 2) return max;
      if (tx < tz) { t = tx; tx += tdx; i += si; } else { t = tz; tz += tdz; j += sj; }
    }
    return max;
  }
  // is the point x, y, z in clear view of the camera at c?
  function crowdSee(cx, cy, cz, x, y, z, RF, C) { const dx = x - cx, dy = y - cy, dz = z - cz, L = Math.hypot(dx, dy, dz); if (L < .01) return true; C.rays++; return crowdRay(cx, cy, cz, dx / L, dy / L, dz / L, L, RF) >= L - .02; }
  // can the camera see any of the points across this body?
  function crowdSees(cx, cy, cz, f, A, RF, C) {
    const px = A.position.x, py = A.position.y, pz = A.position.z, hd = Math.hypot(px - cx, pz - cz) || 1, lx = -(pz - cz) / hd, lz = (px - cx) / hd, fx = -Math.sin(A.rotation.y), fz = -Math.cos(A.rotation.y);
    const see = (x, y, z) => crowdSee(cx, cy, cz, x, y, z, RF, C);
    for (const h of CROWD_UP) for (const l of CROWD_LAT) if (see(px + lx * l, py + h, pz + lz * l)) return true;
    for (const d of [.6, 1.2]) if (see(px + fx * d, py + 1.35, pz + fz * d)) return true;   // a gun poking out ahead of them
    if (!f.alive) for (const d of [.7, 1.4, 2]) if (see(px - fx * d, py + .3, pz - fz * d)) return true;   // fallen on their back
    return false;
  }
  // can the camera see the ground where the sun throws this body's shadow (from its head, chest and knees)?
  function crowdShadowSeen(cx, cy, cz, A, RF, C) {
    const s = X.sun, lx = s.position.x - s.target.position.x, ly = s.position.y - s.target.position.y, lz = s.position.z - s.target.position.z; if (ly < .05) return true;
    for (const h of [1.8, 1.2, .6]) { const x = A.position.x - lx / ly * h, z = A.position.z - lz / ly * h; if (crowdSee(cx, cy, cz, x, hAt(x, z) + .05, z, RF, C)) return true; }
    return false;
  }
  function crowdCull(cam) {
    const C = X.crowd; C.hidden = C.shade = 0; C.list.length = 0; C.frames++;
    if (X.crowdOff || !M || X.camHook || cam !== X.camera || !(screen === 'play' || screen === 'over')) return;
    if (X.mech && X.mech.gates.some(g => { const G = GATES[g.gi], want = G && !G.open ? GATE_H / 2 : -GATE_H / 2 - .02; return Math.abs(g.y - want) > .02; })) return;   // a blast door on the move
    const RF = crowdCells(), e = cam.matrixWorld.elements, cx = e[12], cy = e[13], cz = e[14];
    if (crowdRay(cx, cy, cz, 1, 0, 0, .01, RF) < .005) return;   // the camera itself is inside something (a death cam brushing a wall): everyone is drawn
    const shade = X.renderer.shadowMap.enabled;
    for (const [f, A] of X.agents) {
      if (!A.visible || Math.hypot(A.position.x - cx, A.position.z - cz) < CROWD_NEAR || crowdSees(cx, cy, cz, f, A, RF, C)) continue;
      let lit = false; const meshes = []; A.traverse(o => { if (o.isLight) lit = true; else if (o.isMesh) meshes.push(o); }); if (lit) continue;   // (a light inside would change the scene's lighting)
      if (shade && (Math.hypot(A.position.x - cx, A.position.z - cz) < (X.crowdShade || CROWD_SHADE) || crowdShadowSeen(cx, cy, cz, A, RF, C))) { A.userData.crowdShade = meshes.map(o => { const m0 = o.layers.mask; o.layers.mask = 2; return [o, m0]; }); C.shade++; }   // its shadow only
      else { A.visible = false; C.hidden++; }
      C.list.push(A);
    }
    C.sumHidden += C.hidden; C.sumShade += C.shade;
  }
  // straight after the frame, everyone is put back as they were, so nothing else ever sees a body left out
  function crowdRestore() {
    const C = X.crowd; if (!C) return;
    for (const A of C.list) { const sh = A.userData.crowdShade; if (sh) { for (const [o, m0] of sh) o.layers.mask = m0; A.userData.crowdShade = null; } else A.visible = true; }
    C.list.length = 0;
  }
  function crowdInstall() {
    if (!X || X.crowd) return;
    X.crowd = { hidden: 0, shade: 0, rays: 0, frames: 0, sumHidden: 0, sumShade: 0, list: [] };
    if (X.sun && X.sun.shadow) X.sun.shadow.camera.layers.enable(1);   // the sun still sees a body kept for its shadow (layer 1); the camera does not
    const b0 = X.scene.onBeforeRender, a0 = X.scene.onAfterRender;
    X.scene.onBeforeRender = function (r, sc, cam, rt) { b0.call(this, r, sc, cam, rt); crowdCull(cam); };
    X.scene.onAfterRender = function (r, sc, cam) { crowdRestore(); a0.call(this, r, sc, cam); };
  }
  on('round', () => { if (typeof X !== 'undefined' && X && ready) crowdInstall(); });
