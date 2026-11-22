  /* ---------- 72 horizon: the world past the walls ----------
     The far distance is a painted band all the way round, a long way out: ranges of hills or peaks, a city, a forest, the
     shapes paler and bluer the further off they are, standing in the haze where the floor meets the sky. One open
     cylinder and one texture (a single draw), painted once as the map loads, so it costs a Chromebook next to nothing
     and shows however thick the map's fog is. The sky above it has real clouds now: lit on the sun's side, shaded under. */
  const HZ = { W: 2048, H: 256 };
  // a periodic noise along the band (it wraps, so the band has no seam): values on `n` points, smoothly joined
  function hzNoise(n) { const v = Array.from({ length: n }, () => Math.random()); return x => { const f = ((x % 1) + 1) % 1 * n, i = Math.floor(f), u = f - i, s = u * u * (3 - 2 * u); return v[i % n] * (1 - s) + v[(i + 1) % n] * s; }; }
  const hzMix = (a, b, k) => { const p = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)], A = p(a), B = p(b); return `rgb(${A.map((q, i) => Math.round(q + (B[i] - q) * k)).join(',')})`; };
  // one range: a profile (0..1 of the band's height at each x), filled from the bottom; deco(x, top) adds things along its top
  function hzRange(g, prof, col, step = 2, deco) {
    const { W, H } = HZ; g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += step) g.lineTo(x, H - prof(x / W) * H);
    g.lineTo(W, H); g.closePath(); g.fill();
    if (deco) for (let x = 0; x < W; x += step) deco(x, H - prof(x / W) * H);
  }
  function hzPaint(g, TH) {
    const { W, H } = HZ, t = MAP.theme || 'harbor', fog = TH.fog, foot = H * .12;   // the bottom of the band sits below the horizon, in the haze
    const L = (c, k) => hzMix(fog, c, k);   // a colour at a distance: k 0 is lost in the haze, 1 is its own
    if (t === 'snow') {
      const pk = hzNoise(14), pk2 = hzNoise(37), far = x => .3 + .38 * Math.pow(pk(x), 1.4) + .06 * pk2(x * 3);
      hzRange(g, far, L('#7d93ad', .45), 2);
      for (let x = 0; x < W; x += 2) { const top = H - far(x / W) * H; if (far(x / W) > .42) { g.fillStyle = L('#ffffff', .7); g.fillRect(x, top, 2, H * (far(x / W) - .42) * .9 + 3); } }   // snow on the upper slopes of the high peaks
      const mid = hzNoise(22), midP = x => .18 + .16 * mid(x) + .03 * pk2(x * 7); hzRange(g, midP, L('#5a6e80', .6), 2);
      const pines = (prof, col, k) => hzRange(g, x => prof(x) + .015, col, 3, (x, top) => { if (Math.random() < k) { const s = 5 + Math.random() * 9; g.fillStyle = col; g.beginPath(); g.moveTo(x - s * .5, top + 2); g.lineTo(x, top - s * 1.6); g.lineTo(x + s * .5, top + 2); g.fill(); } });
      pines(x => .12 + .05 * mid(x * 3), L('#2c4434', .72), .5);
    } else if (t === 'desert') {
      const m = hzNoise(9), m2 = hzNoise(31);
      hzRange(g, x => { const v = m(x); return .2 + (v > .55 ? .22 : v > .4 ? .22 * (v - .4) / .15 : 0) + .02 * m2(x * 4); }, L('#b88a5c', .5), 2);   // flat-topped mesas, cliffs straight down
      const d = hzNoise(18); hzRange(g, x => .15 + .07 * Math.sin(x * TAU * 7 + 3 * d(x)) + .03 * d(x * 3), L('#d9a86a', .62), 2);
      const d2 = hzNoise(26); hzRange(g, x => .11 + .05 * d2(x) + .03 * Math.sin(x * TAU * 13), L('#e4b97c', .75), 2, (x, top) => {   // a palm or a ruined column here and there
        if (Math.random() < .006) { g.fillStyle = L('#5a4a30', .7); g.fillRect(x, top - 26, 2, 28); for (let k = -2; k <= 2; k++) { g.beginPath(); g.ellipse(x + k * 5, top - 26, 7, 2.2, k * .35, 0, 7); g.fill(); } }
        else if (Math.random() < .004) { g.fillStyle = L('#c49a68', .7); g.fillRect(x, top - 18, 4, 20); g.fillRect(x - 2, top - 20, 8, 3); } });
    } else if (t === 'jungle') {
      const k = hzNoise(11), k2 = hzNoise(43);
      hzRange(g, x => .22 + .34 * Math.pow(k(x), 2) + .04 * k2(x * 2), L('#5f7f6a', .38), 2);   // steep green karst hills in the mist
      const c = hzNoise(60); hzRange(g, x => .2 + .07 * c(x) + .025 * Math.abs(Math.sin(x * TAU * 90)), L('#3d6a3c', .58), 2);
      { const tx = W * .63, ty = H - H * .2; g.fillStyle = L('#7a8a6a', .55); for (let s = 0; s < 5; s++) g.fillRect(tx - 46 + s * 8, ty - 10 - s * 9, 92 - s * 16, 10); g.fillRect(tx - 6, ty - 60, 12, 12); }   // a temple's steps above the trees
      const n = hzNoise(90); hzRange(g, x => .14 + .06 * n(x) + .03 * Math.abs(Math.sin(x * TAU * 140)), L('#244a26', .8), 2);
    } else if (t === 'autumn') {
      // rolling hills fading blue into the haze; woods in their autumn colours along the nearer ridges; a church spire and
      // a farm on the middle ridge; a near line of trees, red, orange and gold
      const a = hzNoise(8), b = hzNoise(23), c = hzNoise(47), mid = x => .17 + .12 * b(x) + .02 * c(x * 4);
      hzRange(g, x => .25 + .2 * a(x) + .03 * b(x * 3), L('#8c8cae', .42), 2);
      const WOOD = ['#c8642a', '#b8401e', '#d8a030', '#8a5a2a', '#a8782a'];
      hzRange(g, mid, L('#a8904e', .56), 2, (x, top) => { if (b(x / W) > .45 && Math.random() < .45) { g.fillStyle = L(WOOD[Math.floor(Math.random() * WOOD.length)], .56); g.beginPath(); g.arc(x, top + 3, 3 + Math.random() * 4, 0, 7); g.fill(); } });
      for (const sx of [.21, .69]) { const x = sx * W, top = H - mid(sx) * H; g.fillStyle = L('#d8ccb0', .55); g.fillRect(x - 7, top - 16, 14, 18); g.fillRect(x + 7, top - 8, 22, 10); g.beginPath(); g.moveTo(x - 7, top - 16); g.lineTo(x, top - 44); g.lineTo(x + 7, top - 16); g.fill(); }   // the spire and its church
      { const x = W * .46, top = H - mid(.46) * H; g.fillStyle = L('#9a3a24', .5); g.fillRect(x, top - 9, 26, 10); g.beginPath(); g.moveTo(x - 3, top - 9); g.lineTo(x + 13, top - 18); g.lineTo(x + 29, top - 9); g.fill(); }   // a barn
      hzRange(g, x => .11 + .06 * c(x) + .015 * Math.abs(Math.sin(x * TAU * 80)), L('#6a5a2a', .8), 2, (x, top) => { if (Math.random() < .5) { g.fillStyle = L(WOOD[Math.floor(Math.random() * WOOD.length)], .82); g.beginPath(); g.arc(x, top + 2, 4 + Math.random() * 6, 0, 7); g.fill(); } });
    } else if (t === 'neon') {
      // the rest of the city: two layers of towers, lit windows in the nearer one, a glow of light over it all
      { const gr = g.createLinearGradient(0, H * .3, 0, H); gr.addColorStop(0, 'rgba(255,90,200,0)'); gr.addColorStop(1, 'rgba(255,90,200,.35)'); g.fillStyle = gr; g.fillRect(0, H * .3, W, H * .7); }
      const towers = (n, hMin, hMax, wMin, wMax, col, lit) => { let x = 0; while (x < W) { const w = wMin + Math.random() * (wMax - wMin), h = H * (hMin + Math.random() * (hMax - hMin)), y = H - h; g.fillStyle = col; g.fillRect(x, y, w, h);
        if (Math.random() < .3) g.fillRect(x + w * .4, y - 10, 2, 10);   // an aerial
        if (lit) { for (let wy = y + 4; wy < H - foot; wy += 5) for (let wx = x + 2; wx < x + w - 2; wx += 4) if (Math.random() < .3) { g.fillStyle = ['#ffd27a', '#7af0ff', '#ff8ad8', '#fff2c4'][Math.floor(Math.random() * 4)]; g.globalAlpha = .55 + Math.random() * .45; g.fillRect(wx, wy, 2, 2); } g.globalAlpha = 1;
          if (Math.random() < .25) { g.fillStyle = ['#ff3ea5', '#3df2ff', '#ffd23f', '#9a7cff'][Math.floor(Math.random() * 4)]; g.fillRect(x + 2, y + 6, w - 4, 3); } }
        x += w + Math.random() * 3; } };
      towers(0, .25, .62, 18, 44, L('#2a2246', .55), false);
      towers(0, .16, .42, 14, 34, L('#140f26', .85), true);
    } else if (t === 'lava') {
      // volcanoes with lit craters and smoke, a jagged near ridge, the stacks of other works
      const v = hzNoise(7), r = hzNoise(41);
      const cones = [[.12, .62, .2], [.44, .5, .16], [.78, .7, .22]];
      const volc = x => { let h = .18 + .05 * r(x * 3); for (const [cx, ch, cw] of cones) { const d = Math.min(Math.abs(x - cx), 1 - Math.abs(x - cx)); h = Math.max(h, ch * Math.max(0, 1 - d / cw) - (d < .012 ? .03 : 0)); } return h; };
      hzRange(g, volc, L('#3a2420', .55), 2);
      for (const [cx, ch] of cones) for (const dx of [0, W, -W]) { const x = cx * W + dx, y = H - ch * H + 6; const gr = g.createRadialGradient(x, y, 2, x, y, 40); gr.addColorStop(0, 'rgba(255,170,60,.9)'); gr.addColorStop(1, 'rgba(255,80,20,0)'); g.fillStyle = gr; g.fillRect(x - 40, y - 40, 80, 80);
        for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(60,40,36,${.18 + Math.random() * .15})`; g.beginPath(); g.ellipse(x + k * 9 + Math.random() * 10, y - 18 - k * 9, 12 + k * 2.5, 8 + k * 1.5, 0, 0, 7); g.fill(); } }   // the plume, drifting east
      hzRange(g, x => .13 + .06 * r(x * 2) + .03 * Math.abs(Math.sin(x * TAU * 70)), L('#1e1412', .85), 2, (x, top) => { if (Math.random() < .007) { const h = 20 + Math.random() * 30; g.fillStyle = L('#1e1412', .85); g.fillRect(x, top - h, 6, h); g.fillStyle = 'rgba(255,120,40,.8)'; g.fillRect(x, top - h, 6, 2); } });
      { const gr = g.createLinearGradient(0, H - foot - 20, 0, H); gr.addColorStop(0, 'rgba(255,100,30,0)'); gr.addColorStop(1, 'rgba(255,100,30,.45)'); g.fillStyle = gr; g.fillRect(0, H - foot - 20, W, foot + 20); }   // the lava sea's glow
    } else if (t === 'space') {
      // other parts of the station, far off: long trusses with modules hung on them, their windows lit
      for (let i = 0; i < 9; i++) { const x = Math.random() * W, y = H * (.35 + Math.random() * .3), len = 120 + Math.random() * 260, c = L('#8a96b0', .5);
        g.fillStyle = c; g.fillRect(x, y, len, 3); for (let k = 0; k < len; k += 14) { g.fillRect(x + k, y - 3, 1, 9); }
        for (let k = 0; k < 3; k++) { const mx = x + 20 + Math.random() * (len - 60), mw = 26 + Math.random() * 30; g.fillStyle = c; g.fillRect(mx, y - 7, mw, 16); g.fillStyle = 'rgba(160,230,255,.8)'; for (let wx = mx + 3; wx < mx + mw - 3; wx += 5) g.fillRect(wx, y - 1, 2, 2); }
        g.fillStyle = Math.random() < .5 ? '#ff6a4a' : '#7dff9a'; g.fillRect(x + len - 2, y - 2, 3, 3); }
      return;   // nothing below: the deck floats
    } else {   // HARBOUR: the far coast, a town on the hillside, wind turbines on the ridge
      const h = hzNoise(10), h2 = hzNoise(33);
      hzRange(g, x => .2 + .2 * h(x) + .03 * h2(x * 3), L('#6f8aa0', .4), 2, (x, top) => { if (Math.random() < .004) { g.strokeStyle = L('#e8eef2', .55); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, top); g.lineTo(x, top - 28); g.stroke(); const a = Math.random() * 2; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x, top - 28); g.lineTo(x + Math.cos(a + k * 2.09) * 12, top - 28 + Math.sin(a + k * 2.09) * 12); g.stroke(); } } });
      const m = hzNoise(19); hzRange(g, x => .13 + .1 * m(x), L('#5e7a64', .6), 2, (x, top) => { if (m(x / W) > .55 && Math.random() < .12) { g.fillStyle = L(['#efe8dc', '#d8c4a8', '#c8d2dc'][Math.floor(Math.random() * 3)], .6); const w = 4 + Math.random() * 5; g.fillRect(x, top + 2 + Math.random() * 8, w, 4 + Math.random() * 3); g.fillStyle = L('#a84a3a', .6); g.fillRect(x - 1, top + 1 + Math.random() * 3, w + 2, 2); } });
    }
    // the haze the far land stands in: its feet melt into the colour of the fog
    const gr = g.createLinearGradient(0, H - foot - 26, 0, H); gr.addColorStop(0, hzMix(fog, fog, 0).replace('rgb', 'rgba').replace(')', ',0)')); gr.addColorStop(.55, hzMix(fog, fog, 0).replace('rgb', 'rgba').replace(')', ',.85)')); gr.addColorStop(1, fog); g.fillStyle = gr; g.fillRect(0, H - foot - 26, W, foot + 26);
  }
  function horizonBackdrop(W0, TH) {
    const tex = canvasTex(HZ.W, HZ.H, (g) => hzPaint(g, TH)); tex.repeat.set(2, 1); tex.wrapT = THREE.ClampToEdgeWrapping;
    const R = 560, Hm = 2 * Math.PI * R / 2 * HZ.H / HZ.W;   // (twice round the circle, so each pixel is as wide as it is tall)
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, side: THREE.BackSide });
    const c = new THREE.Mesh(new THREE.CylinderGeometry(R, R, Hm, 64, 1, true), m); c.position.set(MW / 2, Hm / 2 - 24, MH / 2); c.renderOrder = -9; W0.add(c);
  }
  /* The sky's clouds, painted into the dome: cumulus near the horizon, built of soft puffs, lit on the sun's side and grey
     underneath; thin streaks high up. Smoky and lit from below over the lava; faint violet haze over the city at night;
     colourful nebula wisps in space. sx: where the sun is across the texture (0..1). */
  function skyClouds(g, w, h, TH, sx) {
    const t = MAP.theme || 'harbor', hor = h * .5, n = { snow: 26, jungle: 22, harbor: 16, desert: 7, lava: 18, neon: 10, space: 12, autumn: 15 }[t] || 14;
    if (t === 'space') { for (let i = 0; i < n; i++) { const x = Math.random() * w, y = h * (.12 + Math.random() * .3), c = ['120,80,220', '60,160,255', '255,90,160'][i % 3]; for (let k = 0; k < 8; k++) { const gr = g.createRadialGradient(x + k * 18, y + Math.sin(k) * 10, 0, x + k * 18, y + Math.sin(k) * 10, 60 + Math.random() * 60); gr.addColorStop(0, `rgba(${c},.09)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(0, 0, w, hor); } } return; }
    // high streaks
    if (t !== 'lava') for (let i = 0; i < 10; i++) { const x = Math.random() * w, y = h * (.12 + Math.random() * .16); g.fillStyle = `rgba(255,255,255,${t === 'neon' ? .03 : .08 + Math.random() * .08})`; g.beginPath(); g.ellipse(x, y, 120 + Math.random() * 200, 3 + Math.random() * 4, (Math.random() - .5) * .1, 0, 7); g.fill(); }
    for (let i = 0; i < n; i++) {
      const x = Math.random() * w, y = hor - h * (.03 + Math.random() * .12), s = (1 - (hor - y) / (h * .2)) * .6 + .5, cw = (50 + Math.random() * 90) * s, ch = (14 + Math.random() * 18) * s;
      const dsun = Math.min(Math.abs(x - sx * w), w - Math.abs(x - sx * w)) / w, lit = t === 'lava' ? 'rgba(255,150,90,' : t === 'neon' ? 'rgba(200,150,255,' : `rgba(255,${Math.round(252 - 30 * (1 - dsun * 2))},${Math.round(245 - 50 * (1 - dsun * 2))},`;
      const body = t === 'lava' ? 'rgba(70,40,34,' : t === 'neon' ? 'rgba(80,50,120,' : 'rgba(255,255,255,', shade = t === 'lava' ? 'rgba(40,22,18,' : t === 'neon' ? 'rgba(30,20,50,' : t === 'snow' ? 'rgba(170,184,204,' : 'rgba(190,204,222,', a = t === 'neon' ? .35 : .85;
      const puffs = Array.from({ length: 6 + Math.floor(Math.random() * 6) }, () => [x + (Math.random() - .5) * cw * 1.6, y - Math.random() * ch * 1.2, ch * (.6 + Math.random() * .7)]);
      g.fillStyle = shade + (a * .7) + ')'; g.beginPath(); for (const [px, py, r] of puffs) { g.moveTo(px + r * 1.4, py + r * .35); g.ellipse(px, py + r * .35, r * 1.4, r * .7, 0, 0, 7); } g.fill();   // the shaded underside
      g.fillStyle = body + a + ')'; g.beginPath(); for (const [px, py, r] of puffs) { g.moveTo(px + r, py); g.arc(px, py, r, 0, 7); } g.fill();
      if (t === 'lava') { g.fillStyle = 'rgba(255,120,50,.35)'; g.beginPath(); for (const [px, py, r] of puffs) { g.moveTo(px + r, py + r * .5); g.ellipse(px, py + r * .5, r, r * .4, 0, 0, 7); } g.fill(); }   // lit from below by the lava
      else { const side = ((sx * w - x + w * 1.5) % w - w / 2) > 0 ? 1 : -1; g.fillStyle = lit + (a * .6) + ')'; g.beginPath(); for (const [px, py, r] of puffs) { g.moveTo(px + side * r * .3 + r * .7, py - r * .3); g.arc(px + side * r * .3, py - r * .3, r * .7, 0, 7); } g.fill(); }   // lit on the sun's side
    }
  }
