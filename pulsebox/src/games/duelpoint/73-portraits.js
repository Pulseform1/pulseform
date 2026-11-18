  /* ---------- 73 portraits: every operative's head and shoulders, rendered once from their 3D model ----------
     A small studio (key light, a rim light in the operative's colour, a cool fill) renders each model into an offscreen
     target at twice the size and shrinks it, so the edges are smooth. Each portrait also gets a grey copy for a fighter
     who is down. The tiles in the top bar, agent select, the loading screen and the menu all draw these. */
  const PORTRAIT = 256;
  function buildPortraits() {
    if (X.portraits) return X.portraits; X.portraits = {};
    const S2 = PORTRAIT * 2, rt = new THREE.WebGLRenderTarget(S2, S2, { format: THREE.RGBAFormat }); rt.texture.encoding = THREE.sRGBEncoding;
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(24, 1, .05, 20), buf = new Uint8Array(S2 * S2 * 4);
    scene.add(new THREE.HemisphereLight('#dfe8ff', '#2a2622', .42));
    const key = new THREE.DirectionalLight('#fff1dc', .95); key.position.set(-1.6, 2.4, -2.4); scene.add(key, key.target);
    const rim = new THREE.DirectionalLight('#ffffff', 1.15); rim.position.set(1.8, 2.2, 2.2); scene.add(rim, rim.target);
    const fill = new THREE.DirectionalLight('#9fc4ff', .3); fill.position.set(2.4, 1.2, -1.4); scene.add(fill, fill.target);
    const big = document.createElement('canvas'); big.width = big.height = S2; const bg = big.getContext('2d'), img = bg.createImageData(S2, S2);
    const prev = { rt: X.renderer.getRenderTarget(), col: X.renderer.getClearColor(new THREE.Color()).clone(), a: X.renderer.getClearAlpha() };
    for (const op of Object.keys(OPS)) {
      const f = fighter({ op, key: 'portrait', name: '' }), G = agentModel(f); X.scene.remove(G); scene.add(G); G.rotation.y = -.32;
      rim.color.set(OPS[op].col);
      cam.fov = 27; cam.position.set(.44, 1.72, -1.3); cam.lookAt(.04, 1.58, 0); cam.updateProjectionMatrix();
      X.renderer.setRenderTarget(rt); X.renderer.setClearColor(0x000000, 0); X.renderer.clear(); X.renderer.render(scene, cam);
      X.renderer.readRenderTargetPixels(rt, 0, 0, S2, S2, buf);
      for (let y = 0; y < S2; y++) img.data.set(buf.subarray((S2 - 1 - y) * S2 * 4, (S2 - y) * S2 * 4), y * S2 * 4);   // the target is bottom-up
      bg.putImageData(img, 0, 0);
      const c = document.createElement('canvas'); c.width = c.height = PORTRAIT; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(big, 0, 0, PORTRAIT, PORTRAIT);
      const grey = document.createElement('canvas'); grey.width = grey.height = PORTRAIT; const gg = grey.getContext('2d'); gg.drawImage(c, 0, 0); const d = gg.getImageData(0, 0, PORTRAIT, PORTRAIT);
      for (let i = 0; i < d.data.length; i += 4) { const l = (d.data[i] * .3 + d.data[i + 1] * .55 + d.data[i + 2] * .15) * .62; d.data[i] = d.data[i + 1] = d.data[i + 2] = l; } gg.putImageData(d, 0, 0);
      X.portraits[op] = { c, grey };
      scene.remove(G); G.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    X.renderer.setRenderTarget(prev.rt); X.renderer.setClearColor(prev.col, prev.a); rt.dispose();
    return X.portraits;
  }
  // an operative's tile: their colour behind them, the portrait framed tight, a bar along the bottom; grey and struck
  // through when they are down. o: { dead, on (selected), hot (under the pointer), bar (the bar's colour), r (corner) }
  function portraitTile(g, op, x, y, w, h, o = {}) {
    const O = OPS[op] || OPS.vex, P = X && ready ? (X.portraits || buildPortraits())[op] : null, r = o.r == null ? 5 : o.r, dead = !!o.dead;
    g.save(); g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.clip();
    // backdrop: dark, a wash of their colour from the bottom, fine diagonal lines
    g.fillStyle = dead ? '#0b0d11' : '#0e1218'; g.fillRect(x, y, w, h);
    if (!dead) { const gr = g.createLinearGradient(x, y + h, x + w * .4, y); gr.addColorStop(0, O.col + '66'); gr.addColorStop(.55, O.col + '18'); gr.addColorStop(1, O.col + '00'); g.fillStyle = gr; g.fillRect(x, y, w, h); }
    g.strokeStyle = dead ? 'rgba(255,255,255,.025)' : 'rgba(255,255,255,.05)'; g.lineWidth = 1; g.beginPath(); for (let k = -h; k < w; k += 7) { g.moveTo(x + k, y + h); g.lineTo(x + k + h, y); } g.stroke();
    if (P) { const s = Math.max(w, h) * 1.06; g.globalAlpha = dead ? .85 : 1; g.drawImage(dead ? P.grey : P.c, x + (w - s) / 2, y + (h - s) / 2 + s * .03, s, s); g.globalAlpha = 1; }
    else { g.save(); g.translate(0, 0); opBust(g, op, x + w / 2, y + h * .6, w / 46, !dead); g.restore(); }
    if (o.on || o.hot) { const gr = g.createLinearGradient(x, y + h, x, y + h * .5); gr.addColorStop(0, O.col + (o.on ? '55' : '2a')); gr.addColorStop(1, O.col + '00'); g.fillStyle = gr; g.fillRect(x, y, w, h); }
    g.restore();
    g.fillStyle = dead ? 'rgba(239,233,220,.14)' : (o.bar || O.col); g.fillRect(x, y + h - Math.max(2, h * .06), w, Math.max(2, h * .06));
    if (dead) { g.strokeStyle = 'rgba(244,63,63,.75)'; g.lineWidth = Math.max(1.5, w * .04); g.beginPath(); g.moveTo(x + w * .18, y + h * .82); g.lineTo(x + w * .82, y + h * .18); g.stroke(); }
    g.lineWidth = o.on ? 2.5 : 1; g.strokeStyle = o.on ? O.col : o.hot ? 'rgba(239,233,220,.55)' : 'rgba(239,233,220,.14)';
    g.beginPath(); if (g.roundRect) g.roundRect(x + .5, y + .5, w - 1, h - 1, r); else g.rect(x + .5, y + .5, w - 1, h - 1); g.stroke();
  }
