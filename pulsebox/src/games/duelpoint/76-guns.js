  /* ---------- 76 guns: the gun kit and the guns built from it, first-person hands, moving parts, casings ----------
     Finishes are canvas textures (brushed steel, stippled polymer, cerakote, wood, carbon weave, digital camo) lit by a small
     reflection map. The kit and the guns are in gunModel below; viewAnim moves the working parts in first person. */
  let GTX = null;
  const DECAL = {}, GMAT = {}, ICON = {};
  /* Finishes. Every texture tiles seamlessly and is drawn once from the seeded random stream. Colour maps carry the look;
     a second "data" canvas per finish carries relief in red (read as a bump map), roughness in green and metalness in blue,
     so wear, smudges and scratches catch the light differently from the paint around them. */
  function gunTex() {
    if (GTX) return GTX;
    const T = (w, h, fn, rep) => canvasTex(w, h, fn, rep), D = (w, h, fn, rep) => { const t = canvasTex(w, h, fn, rep); t.encoding = THREE.LinearEncoding; return t; };
    const wrap = (w, h, x, y, fn) => { for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) fn(x + dx, y + dy); };   // draw across the seams
    const blots = (g, w, h, n, r0, r1, rgb, a) => { for (let i = 0; i < n; i++) { const x = R() * w, y = R() * h, r = r0 + R() * (r1 - r0), al = a * (.4 + R() * .6);
      wrap(w, h, x, y, (px, py) => { if (px < -r || py < -r || px > w + r || py > h + r) return; const gr = g.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(${rgb},${al})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(px - r, py - r, r * 2, r * 2); }); } };
    const specks = (g, w, h, n, rgbA, rgbB, a, s = 1) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${R() < .5 ? rgbA : rgbB},${a * R()})`; g.fillRect(Math.floor(R() * w), Math.floor(R() * h), s, s); } };
    const scratches = (g, w, h, n, rgb, a, l0, l1, ang) => { g.lineCap = 'round'; for (let i = 0; i < n; i++) { const x = R() * w, y = R() * h, l = l0 + R() * (l1 - l0), t = ang == null ? R() * Math.PI : ang + (R() - .5) * .5, bend = (R() - .5) * l * .3;
      g.strokeStyle = `rgba(${rgb},${a * (.5 + R() * .5)})`; g.lineWidth = .6 + R() * .9; wrap(w, h, x, y, (px, py) => { g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + Math.cos(t) * l / 2 - Math.sin(t) * bend, py + Math.sin(t) * l / 2 + Math.cos(t) * bend, px + Math.cos(t) * l, py + Math.sin(t) * l); g.stroke(); }); } };
    const S = 512;
    GTX = {
      // machined steel: long brushing marks, faint soft patches, a few fine scratches
      brushed: T(S, S, (g, w, h) => { g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y++) { g.fillStyle = `rgba(${R() < .5 ? '0,0,0' : '255,255,255'},${.012 + R() * .022})`; g.fillRect(0, y, w, 1); }
        for (let i = 0; i < 2600; i++) { const y = Math.floor(R() * h), x = R() * w, l = 200 + R() * 312; g.fillStyle = R() < .5 ? `rgba(0,0,0,${.01 + R() * .025})` : `rgba(255,255,255,${.01 + R() * .025})`; g.fillRect(x, y, l, 1); g.fillRect(x - w, y, l, 1); }
        scratches(g, w, h, 14, '235,235,235', .18, 6, 30); }, [8, 8]),
      // its data: shinier along fresh scratches, duller where hands have smudged it
      metalD: D(S, S, (g, w, h) => { g.fillStyle = 'rgb(128,200,255)'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { const y = Math.floor(R() * h); g.fillStyle = `rgba(128,${185 + R() * 30 | 0},255,.4)`; g.fillRect(R() * w, y, 200 + R() * 312, 1); }
        blots(g, w, h, 10, 40, 110, '128,235,255', .25); scratches(g, w, h, 14, '100,120,255', .8, 6, 30); }, [8, 8]),
      // stippled polymer: raised dots, used for colour and relief
      stipple: T(256, 256, (g, w, h) => { g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3400; i++) { const x = R() * w, y = R() * h, r = .7 + R() * 1.6, c = R() < .55 ? 'rgba(20,20,20,.32)' : 'rgba(255,255,255,.2)'; g.fillStyle = c; wrap(w, h, x, y, (px, py) => { if (px < -3 || py < -3 || px > w + 3 || py > h + 3) return; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); }); }
        blots(g, w, h, 10, 30, 90, '0,0,0', .08); }, [14, 14]),
      // diamond knurling for rubber and grip panels
      knurl: T(128, 128, (g, w, h) => { g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, w, h); g.lineWidth = 3.2; g.strokeStyle = 'rgba(0,0,0,.6)'; for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16 + h, h); g.stroke(); g.beginPath(); g.moveTo(i * 16, h); g.lineTo(i * 16 + h, 0); g.stroke(); }
        g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,.18)'; for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(i * 16 + 2, 0); g.lineTo(i * 16 + 2 + h, h); g.stroke(); } specks(g, w, h, 900, '0,0,0', '255,255,255', .15); }, [60, 60]),
      // cerakote: a sprayed ceramic paint, matte, softly mottled, with hairline scuffs
      cera: T(S, S, (g, w, h) => { g.fillStyle = '#d6d6d6'; g.fillRect(0, 0, w, h); blots(g, w, h, 40, 30, 140, '0,0,0', .05); blots(g, w, h, 30, 30, 120, '255,255,255', .06);
        specks(g, w, h, 16000, '0,0,0', '255,255,255', .09); scratches(g, w, h, 30, '255,255,255', .32, 6, 40); }, [4, 4]),
      ceraD: D(S, S, (g, w, h) => { g.fillStyle = 'rgb(140,215,255)'; g.fillRect(0, 0, w, h); specks(g, w, h, 12000, '110,230,255', '170,200,255', .5); blots(g, w, h, 30, 40, 140, '140,170,255', .35); scratches(g, w, h, 30, '110,140,255', .9, 6, 40); }, [4, 4]),
      // anodised aluminium: smooth, faint machining lines, a fine sparkle
      anod: T(256, 256, (g, w, h) => { g.fillStyle = '#d2d2d2'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(${R() < .5 ? '0,0,0' : '255,255,255'},${.006 + R() * .012})`; g.fillRect(0, y, w, 1); }
        specks(g, w, h, 5000, '0,0,0', '255,255,255', .06); blots(g, w, h, 8, 30, 100, '255,255,255', .03); }, [6, 6]),
      anodD: D(256, 256, (g, w, h) => { g.fillStyle = 'rgb(128,120,255)'; g.fillRect(0, 0, w, h); specks(g, w, h, 4000, '128,80,255', '128,160,255', .6); blots(g, w, h, 12, 30, 90, '128,175,255', .4); }, [6, 6]),
      // walnut: wavy grain with darker late-wood lines, ray flecks and open pores; also its own relief
      wood: T(S, S, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8a5630'); gr.addColorStop(.5, '#7a4826'); gr.addColorStop(1, '#8a5630'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        const k1 = 2 * Math.PI / w; for (let i = 0; i < 170; i++) { const y = R() * h, a1 = 2 + R() * 7, a2 = R() * 2.5, p1 = R() * 7, p2 = R() * 7, f1 = 1 + Math.floor(R() * 2), f2 = 3 + Math.floor(R() * 4), dark = R() < .62;
          g.strokeStyle = dark ? `rgba(48,22,8,${.12 + R() * .3})` : `rgba(190,128,70,${.08 + R() * .2})`; g.lineWidth = .6 + R() * (dark ? 3 : 2);
          for (const dy of [-h, 0, h]) { g.beginPath(); for (let x = 0; x <= w; x += 8) { const yy = y + dy + Math.sin(x * k1 * f1 + p1) * a1 + Math.sin(x * k1 * f2 + p2) * a2; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); } }
        for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(30,12,4,${.06 + R() * .14})`; g.fillRect(R() * w, R() * h, 1 + R() * 3, 1); }
        for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(220,160,100,${.04 + R() * .07})`; g.fillRect(R() * w, R() * h, 4 + R() * 10, 1 + R()); }
        blots(g, w, h, 14, 60, 200, '40,16,4', .12); blots(g, w, h, 10, 60, 160, '255,200,140', .06); }, [3, 3]),
      // carbon fibre, 2/2 twill: each tow shaded round its width with fine filaments along it
      carbon: T(256, 256, (g) => { const c = 16; for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const hz = (i + j) % 4 < 2, x = i * c, y = j * c, gr = hz ? g.createLinearGradient(0, y, 0, y + c) : g.createLinearGradient(x, 0, x + c, 0);
          gr.addColorStop(0, '#2a2a2f'); gr.addColorStop(.4, '#55555d'); gr.addColorStop(.55, '#606068'); gr.addColorStop(1, '#2e2e33'); g.fillStyle = gr; g.fillRect(x, y, c, c);
          g.fillStyle = 'rgba(0,0,0,.18)'; for (let f = 1; f < c; f += 2) hz ? g.fillRect(x, y + f, c, .5) : g.fillRect(x + f, y, .5, c); } }, [14, 14]),
      // digital camouflage over a teal base, lightly worn
      camo: T(256, 256, (g, w, h) => { g.fillStyle = '#2a8a75'; g.fillRect(0, 0, w, h); const cs = ['#3ee6c1', '#1b5248', '#1f2a33', '#30b496'];
        for (const [n, s] of [[90, 24], [160, 16], [260, 8]]) for (let i = 0; i < n; i++) { g.fillStyle = cs[Math.floor(R() * 4)]; const x = Math.floor(R() * w / 8) * 8, y = Math.floor(R() * h / 8) * 8, bw = s * (1 + Math.floor(R() * 2)), bh = s; wrap(w, h, x, y, (px, py) => g.fillRect(px, py, bw, bh)); }
        specks(g, w, h, 6000, '0,0,0', '255,255,255', .12); scratches(g, w, h, 18, '210,240,235', .35, 6, 30); }, [4, 4]),
      // a tight woven fabric for sleeves
      fabric: T(128, 128, (g, w, h) => { g.fillStyle = '#8c8c8c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 32; i++) for (let j = 0; j < 32; j++) { const on = (i + j) % 2; g.fillStyle = on ? 'rgba(255,255,255,.13)' : 'rgba(0,0,0,.16)'; g.fillRect(i * 4, j * 4, on ? 4 : 3, on ? 3 : 4); }
        specks(g, w, h, 1200, '0,0,0', '255,255,255', .12); }, [70, 70]),
      // vent holes: chamfered, with a lit lower lip
      holes: T(128, 128, (g, w, h) => { g.fillStyle = '#50545c'; g.fillRect(0, 0, w, h); specks(g, w, h, 1500, '0,0,0', '255,255,255', .1);
        for (const [x, y] of [[32, 32], [96, 32], [32, 96], [96, 96]]) { const gr = g.createRadialGradient(x, y + 2, 10, x, y, 22); gr.addColorStop(0, '#08090b'); gr.addColorStop(.7, '#08090b'); gr.addColorStop(.82, '#9aa0aa'); gr.addColorStop(1, 'rgba(80,84,92,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 22, 0, 7); g.fill(); } }, [1, 10]),
      // ---- finishes for the coin guns ----
      // neon: dark polymer with a circuit of lines; the lines are an emissive map, lit in the gun's colour
      neonB: T(256, 256, (g, w, h) => { g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, w, h); specks(g, w, h, 5000, '0,0,0', '255,255,255', .12); blots(g, w, h, 10, 30, 90, '0,0,0', .08); }, [5, 5]),
      neonG: T(256, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.lineCap = 'round';
        for (let i = 0; i < 26; i++) { let x = Math.floor(R() * 16) * 16, y = Math.floor(R() * 16) * 16; g.strokeStyle = `rgba(255,255,255,${.45 + R() * .55})`; g.lineWidth = R() < .3 ? 2.4 : 1.3; g.beginPath(); g.moveTo(x, y);
          for (let s2 = 0; s2 < 4; s2++) { if (R() < .5) x += (R() < .5 ? -1 : 1) * 16 * (1 + Math.floor(R() * 3)); else y += (R() < .5 ? -1 : 1) * 16 * (1 + Math.floor(R() * 3)); g.lineTo(x, y); } g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); } }, [5, 5]),
      // holographic: bands of hue that sweep across, with a glitter of flakes
      holo: T(S, S, (g, w, h) => { for (let x = 0; x < w; x++) { const t = x / w; g.fillStyle = `hsl(${(t * 360 + 200) % 360},70%,${62 + Math.sin(t * TAU * 3) * 8}%)`; g.fillRect(x, 0, 1, h); }
        g.globalCompositeOperation = 'overlay'; for (let i = 0; i < 40; i++) { const y = R() * h, gr = g.createLinearGradient(0, y - 40, 0, y + 40); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, `rgba(${R() < .5 ? '255,255,255' : '40,0,80'},.35)`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, y - 40, w, 80); }
        g.globalCompositeOperation = 'source-over'; specks(g, w, h, 9000, '255,255,255', '200,240,255', .55, 2); }, [2, 2]),
      // tiger stripes: black brush strokes over orange
      tiger: T(S, S, (g, w, h) => { g.fillStyle = '#e8892a'; g.fillRect(0, 0, w, h); blots(g, w, h, 30, 40, 140, '255,190,90', .25);
        for (let i = 0; i < 34; i++) { const x = R() * w, y = R() * h, l = 60 + R() * 140, th = 6 + R() * 14, a = (R() - .5) * .5; g.fillStyle = 'rgba(18,14,10,.9)';
          wrap(w, h, x, y, (px, py) => { g.beginPath(); g.moveTo(px, py - th / 2); g.quadraticCurveTo(px + l * .5, py - th * 1.2 + Math.sin(a) * l * .3, px + l, py + Math.sin(a) * l * .4); g.quadraticCurveTo(px + l * .5, py + th * .9 + Math.sin(a) * l * .3, px, py + th / 2); g.fill(); }); }
        specks(g, w, h, 9000, '0,0,0', '255,255,255', .1); scratches(g, w, h, 20, '255,230,190', .3, 6, 30); }, [3, 3]),
      // damascus: folded steel, wavy layers of light and dark
      damascus: T(S, S, (g, w, h) => { g.fillStyle = '#7d828a'; g.fillRect(0, 0, w, h); const k1 = TAU / w;
        for (let i = 0; i < 90; i++) { const y = i / 90 * h, a1 = 8 + R() * 14, p1 = R() * 7, f1 = 1 + Math.floor(R() * 3), f2 = 4 + Math.floor(R() * 4); g.strokeStyle = i % 2 ? 'rgba(30,32,36,.75)' : 'rgba(220,226,232,.55)'; g.lineWidth = 2 + R() * 3;
          for (const dy of [-h, 0, h]) { g.beginPath(); for (let x = 0; x <= w; x += 6) { const yy = y + dy + Math.sin(x * k1 * f1 + p1) * a1 + Math.sin(x * k1 * f2 + p1 * 2) * 3; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); } }
        specks(g, w, h, 6000, '0,0,0', '255,255,255', .08); }, [3, 3]),
      // hex carbon: a honeycomb of dark cells, each with a sheen across it
      hex: T(256, 256, (g, w, h) => { g.fillStyle = '#16181c'; g.fillRect(0, 0, w, h); const r = 16, dx = r * Math.sqrt(3), dy = r * 1.5;
        for (let j = -1; j < h / dy + 1; j++) for (let i = -1; i < w / dx + 1; i++) { const cx = i * dx + (j % 2 ? dx / 2 : 0), cy = j * dy, gr = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r); gr.addColorStop(0, '#2c3036'); gr.addColorStop(.5, '#4a5058'); gr.addColorStop(1, '#22252a'); g.fillStyle = gr; g.beginPath(); for (let a = 0; a < 6; a++) { const t = a / 6 * TAU + Math.PI / 6; g.lineTo(cx + Math.cos(t) * (r - 1.6), cy + Math.sin(t) * (r - 1.6)); } g.closePath(); g.fill(); } }, [12, 12]),
      // hazard: yellow and black diagonal bands, chipped
      hazard: T(256, 256, (g, w, h) => { g.fillStyle = '#f2c230'; g.fillRect(0, 0, w, h); g.fillStyle = '#16161a'; for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + 32, 0); g.lineTo(i * 64 + 32 + h, h); g.lineTo(i * 64 + h, h); g.fill(); }
        blots(g, w, h, 14, 20, 60, '0,0,0', .15); specks(g, w, h, 5000, '0,0,0', '255,255,255', .14); scratches(g, w, h, 30, '200,200,200', .5, 4, 20); }, [6, 6]),
    };
    // digital camouflage in any palette (woodland, arctic, desert)
    for (const [key, base, cs] of [['woodland', '#4d5a33', ['#6b7a42', '#2f3a22', '#7a6240', '#1e231a']], ['arctic', '#dfe6ea', ['#ffffff', '#b4c0c8', '#8794a0', '#cfd8de']], ['desert', '#c7a673', ['#e0c79a', '#9c7c4d', '#b28f5e', '#6f5a3c']]])
      GTX[key] = canvasTex(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
        for (const [n, s2] of [[80, 24], [150, 16], [240, 8]]) for (let i = 0; i < n; i++) { g.fillStyle = cs[Math.floor(R() * 4)]; const x = Math.floor(R() * w / 8) * 8, y = Math.floor(R() * h / 8) * 8, bw = s2 * (1 + Math.floor(R() * 2)); for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) g.fillRect(x + dx, y + dy, bw, s2); }
        for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${R() < .5 ? '0,0,0' : '255,255,255'},${.1 * R()})`; g.fillRect(R() * w | 0, R() * h | 0, 1, 1); } }, [4, 4]);
    return GTX;
  }
  // battle-worn paint in a gun's own colour: chipped through to bare metal on corners and high spots, with scuffs
  const WORN = {};
  function wornTex(col) {
    if (WORN[col]) return WORN[col];
    const S = 512, chips = [], c = new THREE.Color(col);
    for (let i = 0; i < 46; i++) { const cx = R() * S, cy = R() * S, n = 3 + Math.floor(R() * 8); for (let j = 0; j < n; j++) { const x = cx + (R() - .5) * 46, y = cy + (R() - .5) * 20, r = .8 + R() * (R() < .1 ? 6 : 2.6), k = 6 + Math.floor(R() * 4), pts = []; for (let q = 0; q < k; q++) { const a = q / k * TAU, rr = r * (.5 + R() * .7); pts.push([x + Math.cos(a) * rr * 1.5, y + Math.sin(a) * rr]); } chips.push(pts); } }
    const scuffs = []; for (let i = 0; i < 46; i++) scuffs.push([R() * S, R() * S, 8 + R() * 50, (R() - .5) * .6]);
    const draw = (g, paint, metal, scuff, rim) => { g.fillStyle = paint; g.fillRect(0, 0, S, S); for (const [x, y, l, t] of scuffs) for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { g.strokeStyle = scuff; g.lineWidth = 1; g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx + Math.cos(t) * l, y + dy + Math.sin(t) * l); g.stroke(); }
      for (const pts of chips) for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)); g.closePath(); if (rim) { g.strokeStyle = rim; g.lineWidth = 1.6; g.stroke(); } g.fillStyle = metal; g.fill(); } };
    const hex = '#' + c.getHexString(), map = canvasTex(S, S, (g, w, h) => { draw(g, hex, '#9a9ea6', 'rgba(255,255,255,.3)', 'rgba(0,0,0,.35)');
      g.globalCompositeOperation = 'multiply'; const n = canvasTex.noise || (canvasTex.noise = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const q = cv.getContext('2d'); q.fillStyle = '#fff'; q.fillRect(0, 0, 256, 256); for (let i = 0; i < 9000; i++) { const v = 205 + R() * 50 | 0; q.fillStyle = `rgb(${v},${v},${v})`; q.fillRect(R() * 256 | 0, R() * 256 | 0, 1, 1); } return cv; })());
      for (const x of [0, 256]) for (const y of [0, 256]) g.drawImage(n, x, y); g.globalCompositeOperation = 'source-over'; }, [3, 3]);
    const data = canvasTex(S, S, g => draw(g, 'rgb(200,225,50)', 'rgb(90,110,170)', 'rgba(170,150,120,.8)', 'rgb(150,230,50)'), [3, 3]); data.encoding = THREE.LinearEncoding;
    return WORN[col] = { map, data };
  }
  const FINISH = { knife: 'cera', pip: 'cera', stub: 'wood', wasp: 'cera', quill: 'cera', hammer: 'grip', gnat: 'anod', hornet: 'camo', breaker: 'wood', thresher: 'worn', mako: 'anod', paladin: 'worn', vesper: 'carbon', lancer: 'cera', kite: 'cera', longbow: 'carbon', torrent: 'worn' };
  const BUMP = .0007;   // relief strength; small, because a gun is small
  // a gun's materials, in its own finish or in a skin line's
  function gmats(k, line) { const b = baseMats(k); return line && LINES[line] ? skinMats(b, k, line) : b; }
  function baseMats(k) {
    if (GMAT[k]) return GMAT[k];
    const W = GUNS[k], T = gunTex();
    const env = (m, ei) => { if (X && X.env) { m.envMap = X.env; m.envMapIntensity = ei; } return m; };
    const std = (o, ei = 1) => env(new THREE.MeshStandardMaterial(o), ei);
    const basic = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
    const col = { pip: '#8f99a6', lancer: '#d4323e', longbow: '#9468dc', vesper: '#d0509a', stub: '#ffffff', breaker: '#ffffff' }[k] || W.col, fk = FINISH[k] || 'cera';
    let fin;
    if (fk === 'grip') fin = std({ color: '#26272c', map: T.stipple, bumpMap: T.stipple, bumpScale: BUMP * 1.1, roughness: .88, metalness: 0 }, .35);
    else if (fk === 'wood') fin = std({ color: col, map: T.wood, bumpMap: T.wood, bumpScale: BUMP * 1.4, roughness: .42, metalness: 0 }, .5);
    else if (fk === 'carbon') fin = env(new THREE.MeshPhysicalMaterial({ color: col, map: T.carbon, bumpMap: T.carbon, bumpScale: BUMP * .8, roughness: .4, metalness: .3, clearcoat: 1, clearcoatRoughness: .07 }), .9);
    else if (fk === 'camo') fin = std({ color: '#ffffff', map: T.camo, roughnessMap: T.ceraD, bumpMap: T.ceraD, bumpScale: BUMP * .5, roughness: .75, metalness: .08 }, .5);
    else if (fk === 'anod') fin = std({ color: col, map: T.anod, roughnessMap: T.anodD, roughness: .55, metalness: .55 }, .9);
    else if (fk === 'chrome') fin = std({ color: '#e6ecf2', map: T.brushed, roughnessMap: T.metalD, roughness: .16, metalness: 1 }, 1.8);
    else if (fk === 'gold') fin = std({ color: '#ffc94a', map: T.brushed, roughnessMap: T.metalD, roughness: .24, metalness: 1 }, 1.6);
    else if (fk === 'damascus') fin = std({ color: '#ffffff', map: T.damascus, roughnessMap: T.metalD, roughness: .3, metalness: .95 }, 1.4);
    else if (fk === 'neon') fin = std({ color: '#2a2d35', map: T.neonB, emissive: W.col, emissiveMap: T.neonG, emissiveIntensity: 1.3, roughness: .7, metalness: .2 }, .4);
    else if (fk === 'holo') fin = env(new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: T.holo, roughness: .22, metalness: .55, clearcoat: 1, clearcoatRoughness: .05 }), 1.2);
    else if (fk === 'hex') fin = env(new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: T.hex, bumpMap: T.hex, bumpScale: BUMP * .8, roughness: .35, metalness: .35, clearcoat: 1, clearcoatRoughness: .08 }), .9);
    else if (fk === 'tiger' || fk === 'hazard' || fk === 'woodland' || fk === 'arctic' || fk === 'desert') fin = std({ color: '#ffffff', map: T[fk], roughnessMap: T.ceraD, bumpMap: T.ceraD, bumpScale: BUMP * .5, roughness: .7, metalness: .1 }, .5);
    else if (fk === 'worn') { const wt = wornTex(col); fin = std({ color: '#ffffff', map: wt.map, roughnessMap: wt.data, metalnessMap: wt.data, bumpMap: wt.data, bumpScale: BUMP * 1.2, roughness: 1, metalness: 1 }, .7); }
    else fin = std({ color: col, map: T.cera, roughnessMap: T.ceraD, bumpMap: T.ceraD, bumpScale: BUMP * .5, roughness: .62, metalness: .25 }, .6);
    const metalish = (c, r, mt, ei) => std({ color: c, map: T.brushed, roughnessMap: T.metalD, metalness: mt, roughness: r }, ei);
    const M2 = GMAT[k] = {
      fin,
      metal: metalish('#3b4049', .42, .85, 1),
      dark: metalish('#1d2026', .52, .7, 1),
      steel: metalish('#a2a9b3', .26, .95, 1.2),
      blade: metalish('#d4d8de', .22, .9, 1.7),   // a polished knife blade, brighter than blued gun steel
      poly: std({ color: '#2b2e35', map: T.stipple, bumpMap: T.stipple, bumpScale: BUMP, roughness: .86, metalness: .05 }, .4),
      rubber: std({ color: '#1b1c20', map: T.knurl, bumpMap: T.knurl, bumpScale: BUMP * 1.2, roughness: .95 }, .2),
      heat: std({ color: '#ffffff', map: T.rib || (T.rib = (() => { const t = T.holes.clone(); t.needsUpdate = true; t.repeat.set(40, 40); return t; })()), bumpMap: T.rib, bumpScale: BUMP * 2, metalness: .7, roughness: .4 }),
      hole: new THREE.MeshStandardMaterial({ color: '#060708', roughness: .95, metalness: 0 }),   // bores, ports, vent slots: openings, not a surface
      acc: std({ color: W.col, map: T.anod, roughnessMap: T.anodD, roughness: .5, metalness: .4 }, .8),
      brass: std({ color: '#d9a441', map: T.brushed, metalness: 1, roughness: .26 }, 1.3),
      shell: std({ color: '#b8262a', roughness: .5 }, .5),
      lens: std({ color: '#0d2633', metalness: 1, roughness: .02, emissive: k === 'longbow' ? '#3a1866' : '#0b3550', emissiveIntensity: .8 }, 2),
      glass: std({ color: '#9fdcff', transparent: true, opacity: .2, metalness: 1, roughness: 0, depthWrite: false }, 2),
      glow: basic(W.col), tritium: basic('#7dff9a'), red: basic('#ff2a3a'), lamp: basic('#fff4d6'),
      glove: std({ color: '#24272e', map: T.stipple, bumpMap: T.stipple, bumpScale: BUMP * .7, roughness: .9 }, .3),
      sleeve: std({ color: '#323a4a', map: T.fabric, bumpMap: T.fabric, bumpScale: BUMP * .5, roughness: .85 }, .3),
    };
    // plain colours are read as linear light, which washes strong colours out: convert the ones meant to be seen as picked
    for (const q of ['fin', 'acc', 'glow', 'tritium', 'red', 'lamp', 'sleeve', 'glove', 'shell', 'brass']) M2[q].color.convertSRGBToLinear();
    if (fk === 'neon') M2.fin.emissive.convertSRGBToLinear();
    M2.fin.envMapIntensity = Math.min(M2.fin.envMapIntensity, fk === 'chrome' || fk === 'gold' || fk === 'damascus' ? 1.6 : fk === 'carbon' || fk === 'holo' || fk === 'hex' ? .9 : .6);
    return M2;
  }
  /* Texture coordinates in metres, projected from the side the face looks to: side and top faces run the texture along
     the gun (u = z), so brushing, wood grain and weave follow the length of a barrel, slide or stock, and every part
     shows its finish at the same real size whatever shape it was built from. Decals and vent shrouds keep their own. */
  function boxUV(g) {
    const P = g.attributes.position.array, n = P.length / 9, U = new Float32Array(n * 6);
    for (let t = 0; t < n; t++) {
      const o = t * 9, ax = P[o + 3] - P[o], ay = P[o + 4] - P[o + 1], az = P[o + 5] - P[o + 2], bx = P[o + 6] - P[o], by = P[o + 7] - P[o + 1], bz = P[o + 8] - P[o + 2];
      const nx = Math.abs(ay * bz - az * by), ny = Math.abs(az * bx - ax * bz), nz = Math.abs(ax * by - ay * bx);
      for (let k = 0; k < 3; k++) { const x = P[o + k * 3], y = P[o + k * 3 + 1], z = P[o + k * 3 + 2], j = t * 6 + k * 2;
        if (nx >= ny && nx >= nz) { U[j] = z; U[j + 1] = y; } else if (ny >= nz) { U[j] = z; U[j + 1] = x; } else { U[j] = x; U[j + 1] = y; } }
    }
    g.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  }
  // merge the plain meshes under a group into one mesh per material, so a gun is a handful of draw calls, not hundreds
  function bake(group, cast) {
    const by = new Map();
    for (const o of [...group.children]) {
      if (o.isGroup) { bake(o, cast); continue; }
      if (!o.isMesh || o.userData.live) continue;
      o.updateMatrix(); const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrix); if (!o.material.userData.keepUV) boxUV(g);
      if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(g); group.remove(o);
    }
    for (const [mat, list] of by) {
      let n = 0; for (const g of list) n += g.attributes.position.count;
      const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let at = 0;
      for (const g of list) { P.set(g.attributes.position.array, at * 3); N.set(g.attributes.normal.array, at * 3); if (g.attributes.uv) U.set(g.attributes.uv.array, at * 2); at += g.attributes.position.count; g.dispose(); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
      const m = new THREE.Mesh(geo, mat); m.castShadow = !!cast; m.userData.baked = true; group.add(m);
    }
  }
  /* Every gun is assembled from the same kit, so the arsenal reads as one family:
       side()   a silhouette drawn in (z, y) and given thickness, with bevelled edges, curves and cut-outs
       lathe()  a turned part (barrels, suppressors, brakes, scopes) spun round the bore from [z, radius] pairs
       hull()   a body with one cross-section all the way along (handguards, pumps)
       rbox()   a box with rounded edges
     Forward is -z, the trigger sits near the origin and the muzzle is at z = -len. Moving parts (slide, bolt, pump,
     magazine, the support hand) are their own groups so the first-person view can animate them. Each gun reports where
     its grip and its support hand go, which is how both your own hands and your rival's arms find it. */
  function gunModel(k, opts = {}) {
    const sk = skinOfId(opts.skin), line = sk && sk.k === k ? sk.line : null;
    const W = GUNS[k], m = gmats(k, line), G = new THREE.Group(), cast = !!opts.cast, parts = {};
    let T = G, len = .5, port = [.02, .03, 0], sight = .09, sup = [0, -.05, -.3], pistolHold = false, bore = null, ACC = 0, vgrip = false, angled = false;
    // where the body is (a top line's form is fitted to it), and which parts are fittings rather than body: sights, rails,
    // grips, lights and bipods, which a form leaves standing where they are
    const A = { by: .03 }, accy = f => { ACC = 1; f(); ACC = 0; };
    // the bore: the height of the barrel's axis and the very front of the gun (its muzzle device included), and how thick the
    // muzzle end is. Skins and the muzzle flash are placed from it, so they sit on the barrel whatever is screwed on the end.
    const setBore = (y, z, r) => { if (!bore || z < bore.z) bore = { y, z, r }; };
    const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); if (ACC) o.userData.acc = 1; T.add(o); return o; };
    const box = (w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz);
    const rbox = (w, h, d, mat, x, y, z, r = .004, rx = 0, rz = 0) => {
      const s = new THREE.Shape(), a = w / 2 - r, b = h / 2 - r; s.moveTo(-a, -h / 2); s.lineTo(a, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -b); s.lineTo(w / 2, b); s.quadraticCurveTo(w / 2, h / 2, a, h / 2); s.lineTo(-a, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, b); s.lineTo(-w / 2, -b); s.quadraticCurveTo(-w / 2, -h / 2, -a, -h / 2);
      const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 3 }); g.translate(0, 0, -d / 2); return add(g, mat, x, y, z, rx, 0, rz);
    };
    const trace = (P, s) => { P.forEach((p, i) => p[0] === 'q' ? s.quadraticCurveTo(p[1], p[2], p[3], p[4]) : i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); return s; };
    const side = (pts, w, mat, x = 0, bev = .005, holes) => {
      const s = trace(pts, new THREE.Shape()); if (holes) for (const h of holes) s.holes.push(trace(h, new THREE.Path()));
      const d = Math.max(.002, w - bev * 2), g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev * .9, bevelSegments: 2, curveSegments: 6 });
      g.translate(0, 0, -d / 2); g.rotateY(-Math.PI / 2); return add(g, mat, x);
    };
    const lathe = (pts, mat, y = 0, x = 0, seg = 18) => { const q = pts.map(p => new THREE.Vector2(Math.max(p[1], .0001), -p[0])); if (q[0].y > q[q.length - 1].y) q.reverse(); const g = new THREE.LatheGeometry(q, seg); g.rotateX(-Math.PI / 2); return add(g, mat, x, y, 0); };
    const hull = (sec, z0, z1, mat, bev = .003) => { const s = new THREE.Shape(); sec.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); const g = new THREE.ExtrudeGeometry(s, { depth: Math.abs(z1 - z0) - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1 }); return add(g, mat, 0, 0, Math.min(z0, z1) + bev); };
    const oct = (w, h, cy, c) => [[-w / 2 + c, cy - h / 2], [w / 2 - c, cy - h / 2], [w / 2, cy - h / 2 + c], [w / 2, cy + h / 2 - c], [w / 2 - c, cy + h / 2], [-w / 2 + c, cy + h / 2], [-w / 2, cy + h / 2 - c], [-w / 2, cy - h / 2 + c]];
    const frame = (w, h, cy, t, z0, z1, mat) => { const s = new THREE.Shape(), a = w / 2, b = h / 2, c = Math.min(.006, t * 1.2); s.moveTo(-a + c, cy - b); s.lineTo(a - c, cy - b); s.lineTo(a, cy - b + c); s.lineTo(a, cy + b - c); s.lineTo(a - c, cy + b); s.lineTo(-a + c, cy + b); s.lineTo(-a, cy + b - c); s.lineTo(-a, cy - b + c);
      const hp = new THREE.Path(); hp.moveTo(-a + t, cy - b + t); hp.lineTo(-a + t, cy + b - t); hp.lineTo(a - t, cy + b - t); hp.lineTo(a - t, cy - b + t); s.holes.push(hp); return add(new THREE.ExtrudeGeometry(s, { depth: Math.abs(z1 - z0), bevelEnabled: false }), mat, 0, 0, Math.min(z0, z1)); };
    const tube = (r, z0, z1, mat, y = 0, x = 0, seg = 18, rB) => add(new THREE.CylinderGeometry(rB == null ? r : rB, r, Math.abs(z1 - z0), seg), mat, x, y, (z0 + z1) / 2, Math.PI / 2);
    const vtube = (r, y0, y1, mat, x, z, rTop) => add(new THREE.CylinderGeometry(rTop == null ? r : rTop, r, Math.abs(y1 - y0), 14), mat, x, (y0 + y1) / 2, z);
    const pin = (y, z, w, r = .0038, mat = m.steel) => add(new THREE.CylinderGeometry(r, r, w + .003, 10), mat, 0, y, z, 0, 0, Math.PI / 2);
    const ring = (r, t, z, mat, y = 0, x = 0) => add(new THREE.TorusGeometry(r, t, 6, 20), mat, x, y, z);
    const disc = (r, x, y, z, mat, back) => add(new THREE.CircleGeometry(r, 18), mat, x, y, z, 0, back ? 0 : Math.PI);
    const rail = (z0, z1, y, w = .028) => { rbox(w, .008, z1 - z0, m.dark, 0, y, (z0 + z1) / 2, .002); for (let z = z0 + .008; z < z1 - .004; z += .0125) box(w + .004, .0065, .006, m.dark, 0, y + .0066, z); };
    const guardLoop = (z, y) => { add(new THREE.TorusGeometry(.023, .0042, 8, 18, Math.PI), m.metal, 0, y, z, 0, Math.PI / 2, Math.PI); side([[z + .004, y - .002], [z + .011, y - .022], [z + .016, y - .022], [z + .011, y - .002]], .007, m.steel, 0, .0015); };
    const decal = (text, sub, w, h, sx, y, z, col = 'rgba(240,238,232,.9)') => {
      const key = text + '|' + sub + '|' + col; let mat = DECAL[key];
      if (!mat) { const t = canvasTex(256, 64, (g, cw, ch) => { g.clearRect(0, 0, cw, ch); g.fillStyle = col; g.textBaseline = 'middle'; g.font = `700 ${sub ? 30 : 38}px "Chakra Petch", monospace`; g.fillText(text, 6, sub ? 22 : 32); if (sub) { g.globalAlpha = .75; g.font = '700 15px monospace'; g.fillText(sub, 8, 50); } }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
        mat = DECAL[key] = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: .6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }); mat.userData.keepUV = true; }
      for (const s of [1, -1]) add(new THREE.PlaneGeometry(w, h), mat, sx * s, y, z, 0, s * Math.PI / 2, 0);
    };
    // vented shroud: holes kept round by scaling the pattern to the tube (8 rows round it, one every 2.4 cm along it)
    const vent = L => { const key = 'vent' + Math.round(L * 1000); if (!GMAT[key]) { const t = gunTex().holes.clone(); t.needsUpdate = true; t.repeat.set(4, Math.max(2, Math.round(L / .024))); GMAT[key] = new THREE.MeshStandardMaterial({ color: '#ffffff', map: t, bumpMap: t, bumpScale: BUMP * 2, metalness: .7, roughness: .4, envMap: X && X.env, envMapIntensity: .8 }); GMAT[key].userData.keepUV = true; } return GMAT[key]; };
    const group = (x, y, z, rx = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.x = rx; g.userData.p0 = g.position.clone(); G.add(g); return g; };
    // sights and gadgets
    const holo = (z, y) => {   // a window sight: hooded frame, glass, a ring reticle
      rbox(.034, .012, .056, m.dark, 0, y + .006, z, .003); frame(.038, .042, y + .033, .0036, z - .024, z + .02, m.dark);
      box(.03, .031, .0012, m.glass, 0, y + .033, z - .02); add(new THREE.TorusGeometry(.0046, .0007, 6, 20), m.red, 0, y + .033, z - .018); add(new THREE.SphereGeometry(.0009, 6, 6), m.red, 0, y + .033, z - .018);
      vtube(.005, y + .056, y + .062, m.poly, 0, z + .01); rbox(.006, .012, .016, m.poly, .021, y + .03, z + .012, .002);
    };
    const prism = (z, y, long) => {   // a boxy magnified sight you look straight through
      const L = long ? .1 : .07; rbox(.03, .012, L * .7, m.dark, 0, y + .006, z, .003); frame(.044, .052, y + .036, .005, z - L / 2, z + L / 2, m.dark); for (const dz of [-L / 2 + .004, L / 2 - .004]) box(.033, .036, .0012, m.glass, 0, y + .034, z + dz);
      add(new THREE.SphereGeometry(.0011, 8, 6), m.red, 0, y + .034, z - L / 2 + .008); for (const [w2, h2, dx, dy] of [[.006, .0008, -.006, 0], [.006, .0008, .006, 0], [.0008, .006, 0, -.006]]) box(w2, h2, .0005, m.red, dx, y + .034 + dy, z - L / 2 + .008);
      vtube(.008, y + .061, y + .07, m.acc, 0, z); rbox(.01, .014, .02, m.acc, .0245, y + .034, z, .003);
    };
    const scope = (z0, z1, y, r, bell) => {   // a tube scope: flared bells at both ends, turrets, mounting rings, coated lenses
      lathe([[z0, bell * .86], [z0, bell], [z0 + .045, bell], [z0 + .1, r], [z1 - .075, r], [z1 - .03, r * 1.28], [z1, r * 1.28], [z1, r * 1.1]], m.metal, y, 0, 24);
      disc(bell * .88, 0, y, z0 + .004, m.lens); disc(r * 1.12, 0, y, z1 - .004, m.lens, true); ring(bell * 1.005, .0028, z0 + .012, m.glow, y); ring(r * 1.3, .003, z1 - .012, m.rubber, y);
      const zt = lp(z0, z1, .52); vtube(.013, y + r, y + r + .028, m.acc, 0, zt); vtube(.0145, y + r + .028, y + r + .034, m.dark, 0, zt); add(new THREE.CylinderGeometry(.013, .013, .026, 14), m.acc, r + .013, y, zt, 0, 0, Math.PI / 2);
      for (const z of [lp(z0, z1, .3), lp(z0, z1, .74)]) { ring(r + .003, .0045, z, m.dark, y); rbox(.022, y - r - .05, .022, m.dark, 0, .05 + (y - r - .05) / 2, z, .003); }
    };
    const counter = (y, z, hw) => {   // a little screen on the left of the receiver showing the rounds left
      rbox(.008, .026, .038, m.dark, -hw - .003, y, z, .002); const c = document.createElement('canvas'); c.width = 64; c.height = 44; const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
      const p = add(new THREE.PlaneGeometry(.03, .02), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), -hw - .0075, y, z, 0, -Math.PI / 2, 0); p.userData.live = true; parts.counter = { c, t, last: -1 };
    };
    // muzzle ends, turned on the lathe: 'brake' (ported block), 'flash' (slim hider), 'supp' (a suppressor of length sl), 'crown' (bare)
    const muzzle = (kind, z, y, r, sl = .2) => {
      setBore(y, z, kind === 'supp' ? r * 1.95 : kind === 'brake' ? r * 1.6 : kind === 'flash' ? r * 1.4 : r);
      if (kind === 'supp') { lathe([[z, .006], [z, r * 1.75], [z + .006, r * 1.95], [z + sl - .03, r * 1.95], [z + sl - .012, r * 1.5], [z + sl, r * 1.1]], m.dark, y, 0, 22); for (let i = 0; i < 5; i++) ring(r * 1.97, .0016, z + .016 + i * .009, m.metal, y); ring(r * 1.97, .0024, z + sl - .04, m.glow, y); disc(.0065, 0, y, z - .0005, m.hole); }
      else if (kind === 'brake') { lathe([[z, .0065], [z, r * 1.35], [z + .008, r * 1.6], [z + .058, r * 1.6], [z + .068, r * 1.05]], m.dark, y, 0, 8); for (let i = 0; i < 3; i++) box(r * 3.4, r * .7, .009, m.hole, 0, y, z + .016 + i * .017); disc(.0065, 0, y, z - .0005, m.hole); }
      else if (kind === 'flash') { lathe([[z, .0065], [z, r * 1.25], [z + .04, r * 1.4], [z + .05, r * 1.05]], m.dark, y, 0, 14); for (let a = 0; a < 4; a++) box(.003, .003, .03, m.hole, Math.cos(a * Math.PI / 2 + .78) * r * 1.3, y + Math.sin(a * Math.PI / 2 + .78) * r * 1.3, z + .02); disc(.006, 0, y, z - .0005, m.hole); }
      else { ring(r, .002, z + .002, m.steel, y); disc(r * .62, 0, y, z - .0005, m.hole); }
    };
    const GRIP = [[-.01, -.03], [.03, -.03], ['q', .048, -.07, .058, -.116], ['q', .06, -.13, .047, -.13], [.016, -.13], ['q', .005, -.13, .004, -.118], ['q', -.002, -.078, -.02, -.058]];
    const pistolGrip = (mat = m.poly) => { side(GRIP, .032, mat, 0, .008); for (let i = 0; i < 4; i++) box(.0335, .003, .028, m.rubber, 0, -.062 - i * .014, .024 + i * .006, -.28); };

    /* ---- pistols: Pip, Wasp (compensator, red dot, long magazine), Quill (suppressor) ---- */
    const pistol = o => {
      Object.assign(A, { fam: 'pistol', by: .034, rf: -.175, rb: .05, top: .053, hw: .015 });
      len = o.supp ? .37 : o.comp ? .236 : .207; port = [.012, .05, -.045]; sight = o.rdot ? .07 : .058; pistolHold = true;
      side([[-.175, .015], [-.175, -.006], [-.09, -.006], [-.083, -.046], ['q', -.081, -.056, -.069, -.056], [-.02, -.056], ['q', -.008, -.056, -.005, -.044], [.022, -.116], ['q', .024, -.124, .034, -.124], [.058, -.122], ['q', .068, -.12, .066, -.108], ['q', .058, -.06, .045, -.028], [.056, -.012], [.066, .002], [.048, .015]], .028, m.fin, 0, .006,
        [[[-.075, -.012], [-.075, -.043], ['q', -.075, -.049, -.069, -.049], [-.022, -.049], ['q', -.014, -.049, -.014, -.04], [-.016, -.012]]]);
      side([[.002, -.032], [.03, -.106], [.056, -.106], ['q', .05, -.062, .036, -.03]], .0312, m.poly, 0, .003);   // grip panels
      side([[-.04, -.014], [-.047, -.04], [-.041, -.043], [-.034, -.016]], .007, m.steel, 0, .0015);   // trigger
      accy(() => rail(-.168, -.095, -.012, .02)); pin(.004, -.03, .028); pin(.004, .012, .028); rbox(.004, .007, .026, m.steel, -.0148, .02, -.01, .002);
      if (o.light) accy(() => { rbox(.025, .024, .052, m.poly, 0, -.029, -.14, .006); disc(.0085, 0, -.029, -.1665, m.lamp); ring(.0095, .0018, -.166, m.steel, -.029); rbox(.006, .008, .012, m.acc, .0135, -.03, -.12, .002); });
      lathe([[-.207, .005], [-.207, .0092], [-.19, .0092]], m.steel, .034); disc(.005, 0, .034, -.2075, m.hole); setBore(.034, -.207, .0092);
      if (o.supp) muzzle('supp', -.37, .034, .0092, .168);
      T = parts.slide = group(0, 0, 0);
      side([[-.2, .017], [-.2, .044], ['q', -.2, .053, -.19, .053], [.03, .053], [.043, .044], [.043, .017]], .03, m.metal, 0, .005);
      for (let i = 0; i < 6; i++) box(.0312, .024, .0026, m.dark, 0, .033, .032 - i * .0068, 0, 0, 0); for (let i = 0; i < 4; i++) box(.0312, .018, .0026, m.dark, 0, .036, -.157 - i * .0068);
      rbox(.014, .003, .036, m.hole, .004, .0532, -.045, .001); rbox(.012, .0025, .09, m.dark, 0, .054, -.12, .001);
      ACC = 1; rbox(.005, .008, .008, m.dark, 0, .058, -.19, .0015); add(new THREE.SphereGeometry(.0018, 6, 6), m.tritium, 0, .0595, -.1858);
      if (o.rdot) { rbox(.024, .008, .036, m.dark, 0, .0565, -.008, .003); frame(.028, .026, .072, .0032, -.026, .006, m.dark); box(.02, .016, .001, m.glass, 0, .0715, -.02); add(new THREE.SphereGeometry(.0009, 6, 6), m.red, 0, .0715, -.019); }
      else { rbox(.021, .009, .008, m.dark, 0, .058, .03, .0015); for (const sx of [-.0058, .0058]) add(new THREE.SphereGeometry(.0018, 6, 6), m.tritium, sx, .059, .0343); }
      ACC = 0;
      if (o.cuts) { for (let i = 0; i < 3; i++) rbox(.012, .004, .022, m.hole, 0, .0535, -.07 - i * .032, .001); for (const sx of [-1, 1]) rbox(.0012, .004, .16, m.glow, sx * .0152, .041, -.09, .0004); }
      if (o.cannon) { setBore(.034, -.2905, .019); rbox(.036, .042, .09, m.fin, 0, .034, -.245, .007); for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) rbox(.004, .016, .012, m.hole, sx * .018, .04, -.215 - i * .02, .002); rbox(.014, .005, .07, m.hole, 0, .055, -.245, .001); disc(.007, 0, .034, -.2905, m.hole); for (const sx of [-1, 1]) rbox(.0012, .006, .08, m.glow, sx * .0182, .022, -.245, .0005); }
      if (o.comp) { setBore(.034, -.236, .017); rbox(.031, .037, .034, m.dark, 0, .034, -.2185, .006); for (let i = 0; i < 3; i++) rbox(.013, .004, .006, m.hole, 0, .0528, -.209 - i * .009, .001); disc(.0055, 0, .034, -.236, m.hole); }
      decal(o.name, o.sub, .07, .0175, .0155, .03, -.105);
      T = parts.mag = group(0, -.062, .027, -.25);
      rbox(.02, o.ext ? .15 : .1, .032, m.dark, 0, o.ext ? -.025 : 0, 0, .003); rbox(.031, .013, .044, o.ext ? m.acc : m.poly, 0, o.ext ? -.106 : -.057, .003, .004);
      T = G; sup = [-.02, -.08, .03];
    };

    /* ---- long guns with a receiver, handguard, pistol grip and stock: Gnat, Hornet, Mako, Paladin, Vesper, Lancer, Torrent ---- */
    const carbine = o => {
      const BY = .03, rf = o.rf == null ? -.2 : o.rf, rb = .13, top = .058, hz = o.hz, hw = o.wide ? .031 : .023; len = o.len; port = [hw, .03, -.02]; sight = o.sightY;
      // upper receiver, with its ejection port and brass deflector
      side([[rf - .006, .022], [rf, top], [rb - .012, top], [rb, top - .014], [rb, .002], [rf, .002]], hw * 2, o.upper || m.metal, 0, .006);
      rbox(.003, .019, .056, m.hole, hw - .0005, .03, -.02, .003); side([[.012, .02], [.03, .02], [.036, .034], [.022, .04]], .012, m.metal, hw - .003, .003);
      // lower receiver: magazine well, a real trigger guard, in the gun's own finish
      side([[rf + .02, .004], [rb, .004], [rb, -.022], [.03, -.03], [.012, -.034], [.004, -.07], [-.062, -.07], ['q', -.071, -.07, -.071, -.06], [-.074, -.034], [-.086, -.034], [-.092, -.072], [-.162, -.068], [-.168, -.03], [rf + .02, -.022]], hw * 2 - .003, o.lower || m.fin, 0, .006,
        [[[-.064, -.04], [-.064, -.057], ['q', -.064, -.063, -.058, -.063], [-.005, -.063], ['q', .001, -.063, .001, -.056], [-.001, -.04]]]);
      side([[-.03, -.036], [-.037, -.055], [-.031, -.058], [-.024, -.038]], .008, m.steel, 0, .0015);
      pin(-.012, .07, hw * 2); pin(-.012, -.07, hw * 2); pin(-.02, .0, hw * 2, .003); rbox(.004, .007, .022, m.steel, -hw + .001, -.013, .034, .002, -.4); add(new THREE.CylinderGeometry(.005, .005, .004, 10), m.steel, hw - .001, -.016, -.058, 0, 0, Math.PI / 2);
      pistolGrip();
      // handguard
      const hb = o.hg === 'oct' ? BY - .033 : o.hg === 'round' || o.hg === 'shroud' ? BY - .031 : -.032;
      if (o.hg === 'oct') { hull(oct(.05, .064, BY - .001, .015), hz, rf, o.hgMat || m.fin); for (let z = hz + .03; z < rf - .03; z += .045) for (const sx of [-1, 1]) { rbox(.004, .012, .028, m.hole, sx * .0245, BY - .001, z, .002); rbox(.004, .01, .026, m.hole, sx * .019, BY - .0275, z, .002, 0, sx * .78); } }
      else if (o.hg === 'round') { tube(.03, hz, rf, o.hgMat || m.fin, BY, 0, 20); ring(.03, .003, hz + .004, m.dark, BY); ring(.03, .003, rf - .004, m.dark, BY); for (let z = hz + .03; z < rf - .02; z += .042) for (let a = 0; a < 6; a++) { const t = a / 6 * TAU + .52; add(new THREE.CylinderGeometry(.006, .006, .004, 8), m.hole, Math.cos(t) * .0295, BY + Math.sin(t) * .0295, z, 0, 0, t - Math.PI / 2); } }
      else if (o.hg === 'rail') {   // two flat rails with glowing coils between them, a capacitor bank either side
        tube(.0065, hz, rf, m.dark, BY, 0, 12); for (const dy of [.026, -.026]) rbox(.03, .011, rf - hz, m.metal, 0, BY + dy, (hz + rf) / 2, .003);
        for (let z = hz + .03; z < rf - .02; z += .045) { ring(.021, .0042, z, m.glow, BY); ring(.024, .0025, z + .008, m.steel, BY); }
        for (const sx of [-1, 1]) { rbox(.014, .03, (rf - hz) * .45, m.fin, sx * .028, BY, rf - (rf - hz) * .25, .004); rbox(.003, .006, (rf - hz) * .4, m.glow, sx * .0352, BY, rf - (rf - hz) * .25, .001); }
        lathe([[hz, .0085], [hz, .02], [hz + .012, .022], [hz + .02, .016]], m.dark, BY, 0, 16); }
      else if (o.hg === 'shroud') { tube(.031, hz, rf, vent(rf - hz), BY, 0, 18); ring(.031, .0035, hz + .004, m.dark, BY); ring(.031, .0035, rf - .004, m.dark, BY); }
      else { side([[rf, top - .004], [hz + .024, top - .004], [hz, top - .024], [hz, -.016], [hz + .02, -.032], [rf, -.032]], .052, o.hgMat || m.fin, 0, .008); for (let z = hz + .04; z < rf - .03; z += .048) for (const sx of [-1, 1]) rbox(.004, .012, .03, m.hole, sx * .0258, .012, z, .002); }
      if (o.glow !== false) for (const sx of [-1, 1]) rbox(.0025, .005, (rf - hz) * .7, m.glow, sx * (o.hg === 'slab' ? .0262 : o.hg === 'oct' ? .0252 : .0302), o.hg === 'oct' ? BY - .016 : o.hg === 'slab' ? -.014 : BY, (hz + rf) / 2, .001);
      accy(() => rail(o.hg === 'round' || o.hg === 'shroud' ? rf : hz + .012, rb - .016, top + .0035, hw > .03 ? .03 : .028));
      // barrel and muzzle
      const br = o.br || .011, mz = -len, tipL = o.tip === 'supp' ? o.sl : o.tip === 'brake' ? .068 : o.tip === 'flash' ? .05 : 0;
      if (mz + tipL < hz) { tube(br, mz + tipL - .004, hz, m.steel, BY); if (hz - mz - tipL > .1) { rbox(.022, .03, .028, m.dark, 0, BY + .006, hz - .05, .005); rbox(.008, .014, .012, m.dark, 0, BY + .026, hz - .05, .002); } }
      muzzle(o.tip, mz, BY, br, o.sl);
      // stock
      const sb = rb;
      if (o.stock === 'ar') { tube(.0145, sb, sb + .2, m.metal, .026); side([[sb + .07, .052], [sb + .28, .056], [sb + .295, .05], [sb + .3, -.066], [sb + .286, -.078], [sb + .22, -.05], ['q', sb + .13, -.014, sb + .07, .0]], .04, m.poly, 0, .009, [[[sb + .19, .012], [sb + .25, -.03], [sb + .268, -.022], [sb + .268, .02]]]); rbox(.043, .13, .016, m.rubber, 0, -.01, sb + .303, .006); rbox(.03, .014, .1, o.cheek || m.fin, 0, .061, sb + .19, .005); }
      else if (o.stock === 'skel') { tube(.012, sb, sb + .27, m.metal, .034); side([[sb + .02, -.012], [sb + .27, -.062], [sb + .27, -.048], [sb + .02, .002]], .014, m.metal, 0, .004); rbox(.03, .135, .02, m.rubber, 0, -.008, sb + .28, .007); rbox(.026, .016, .12, o.cheek || m.fin, 0, .05, sb + .17, .006); }
      else if (o.stock === 'wire') { for (const sx of [-.016, .016]) tube(.0034, sb - .04, sb + (o.short ? .1 : .18), m.steel, .006, sx, 8); rbox(.04, .02, .024, m.metal, 0, .006, sb + .008, .005); rbox(.042, .07, .014, m.rubber, 0, -.008, sb + (o.short ? .104 : .184), .006); }
      else if (o.stock === 'fixed') { side([[sb, .05], [sb + .25, .058], [sb + .27, .05], [sb + .27, -.068], [sb + .25, -.076], [sb + .13, -.05], ['q', sb + .05, -.03, sb, -.02]], .042, m.poly, 0, .009, [[[sb + .06, .03], [sb + .06, -.008], [sb + .19, -.042], [sb + .23, -.03], [sb + .23, .034]]]); rbox(.046, .13, .016, m.rubber, 0, -.008, sb + .277, .006); }
      else if (o.stock === 'thumb') { side([[sb, .042], [sb + .03, .05], [sb + .29, .054], [sb + .31, .046], [sb + .31, -.07], [sb + .29, -.08], [sb + .14, -.07], ['q', sb + .1, -.07, sb + .08, -.04], ['q', sb + .04, -.03, sb, -.024]], .044, o.cheek || m.fin, 0, .01, [[[sb + .1, .022], [sb + .12, -.04], [sb + .2, -.048], [sb + .22, .024]]]); rbox(.048, .13, .016, m.rubber, 0, -.012, sb + .317, .006); }
      else if (o.stock === 'heavy') { side([[sb, .05], [sb + .27, .062], [sb + .29, .054], [sb + .29, -.074], [sb + .27, -.08], [sb + .2, -.07], ['q', sb + .1, -.05, sb, -.03]], .05, m.poly, 0, .01); rbox(.054, .14, .016, m.rubber, 0, -.008, sb + .297, .006); rbox(.02, .01, .1, m.steel, 0, .07, sb + .16, .004); }
      // what the support hand holds
      ACC = 1;
      if (o.fore === 'vgrip') { const z = lp(hz, rf, .42); vtube(.0155, hb - .09, hb + .004, m.poly, 0, z, .019); vtube(.0195, hb - .098, hb - .084, m.acc, 0, z); for (let i = 0; i < 3; i++) ring(.0172, .0016, z, m.rubber, hb - .03 - i * .018).rotation.x = Math.PI / 2; sup = [0, hb - .05, z]; vgrip = true; }
      else if (o.fore === 'angled') { const z = lp(hz, rf, .45); side([[z - .05, hb + .004], [z + .04, hb + .004], [z + .01, hb - .034], [z - .022, hb - .034]], .03, m.poly, 0, .006); sup = [0, hb - .028, z - .005]; angled = true; }
      else sup = [0, hb - .012, lp(hz, rf, .45)];
      // sight
      if (o.sight === 'scope') scope(-.26, .13, .112, .023, .034);
      if (o.sight === 'holo') holo(-.045, top + .008); else if (o.sight === 'prism') prism(-.02, top + .008, false); else if (o.sight === 'dmr') prism(-.02, top + .008, true);
      if (o.backup !== false) { rbox(.02, .014, .012, m.dark, 0, top + .016, hz + .03, .002); rbox(.004, .012, .004, m.dark, 0, top + .028, hz + .03, .001); rbox(.022, .014, .014, m.dark, 0, top + .016, rb - .03, .002); }
      if (o.counter) counter(.03, .06, hw);
      if (o.laser) { rbox(.02, .024, .052, m.poly, -.038, BY, hz + .09, .004); disc(.007, -.038, BY + .004, hz + .0635, m.red); disc(.005, -.038, BY - .006, hz + .0635, m.lamp); rbox(.012, .01, .02, m.dark, -.03, BY, hz + .09, .002); }
      ACC = 0; Object.assign(A, { fam: 'long', rf, rb, top, hw, hz, sb: rb, sideHandle: o.sideHandle ? 1 : 0 });
      // charging handle (moves when you rack it) and the magazine (comes out when you reload)
      T = parts.bolt = group(0, 0, 0); if (o.sideHandle) { rbox(.012, .012, .03, m.steel, -hw - .004, .032, .0, .003); rbox(.016, .01, .01, o.lower || m.fin, -hw - .012, .032, -.012, .003); } else { rbox(.034, .008, .022, m.dark, 0, top + .003, rb - .006, .002); rbox(.056, .008, .01, m.dark, 0, top + .003, rb + .002, .002); }
      T = parts.mag = group(0, -.058, -.127);
      if (o.mag === 'curve') { const c = o.curve || .03; side([[.024, .03], [-.024, .03], ['q', -.026, -.06, -.024 - c, -.14], [.02 - c, -.15], ['q', .03, -.06, .024, .03]], hw * 2 - .016, o.magMat || m.poly, 0, .005); for (let i = 0; i < 4; i++) box(hw * 2 - .014, .0035, .046, m.rubber, 0, -.02 - i * .03, -c * (i + .6) / 4.6, c * 3 * (i + 1) / 4); rbox(hw * 2 - .01, .012, .052, m.acc, 0, -.15, -c - .002, .004, c * 5); }
      else if (o.mag === 'stick') { rbox(.026, o.magL || .16, .034, m.poly, 0, -(o.magL || .16) / 2 + .03, 0, .004); for (let i = 0; i < 4; i++) box(.028, .003, .036, m.rubber, 0, -.01 - i * .03, 0); rbox(.03, .012, .04, m.acc, 0, -(o.magL || .16) + .028, 0, .004); }
      else if (o.mag === 'short') { rbox(.03, .085, .054, m.poly, 0, -.012, 0, .005); rbox(.034, .012, .058, m.acc, 0, -.058, 0, .004); for (let i = 0; i < 2; i++) box(.032, .003, .056, m.rubber, 0, -.0 - i * .025, 0); }
      else if (o.mag === 'drum') {   // a round drum under the gun on a short neck, ringed in the gun's colour
        const R0 = o.drumBig ? .082 : .066, wd = o.drumBig ? .062 : .05; rbox(.03, .05, .04, m.poly, 0, -.01, 0, .004);
        add(new THREE.CylinderGeometry(R0, R0, wd, 30), m.poly, 0, -.03 - R0, 0, 0, 0, Math.PI / 2);
        for (const sx of [-wd / 2, wd / 2]) { add(new THREE.TorusGeometry(R0 * .78, .004, 6, 28), m.acc, sx, -.03 - R0, 0, 0, Math.PI / 2, 0); add(new THREE.CylinderGeometry(R0 * .3, R0 * .3, .004, 16), m.dark, sx * 1.04, -.03 - R0, 0, 0, 0, Math.PI / 2); add(new THREE.TorusGeometry(R0 * .5, .0018, 6, 24), m.glow, sx * 1.02, -.03 - R0, 0, 0, Math.PI / 2, 0); }
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; box(wd + .002, .006, .006, m.rubber, 0, -.03 - R0 + Math.sin(a) * R0, Math.cos(a) * R0, a); } }
      else if (o.mag === 'shotbox') { rbox(.05, .11, .085, m.poly, 0, -.03, 0, .006); rbox(.054, .014, .089, m.acc, 0, -.088, 0, .004); for (let i = 0; i < 3; i++) { rbox(.0505, .014, .03, m.shell, 0, -.005 - i * .026, .0, .003); rbox(.051, .006, .03, m.brass, 0, -.014 - i * .026, .0, .002); } }
      else if (o.mag === 'cell') { rbox(.036, .07, .07, m.dark, 0, -.01, 0, .006); rbox(.0365, .05, .012, m.glow, 0, -.012, .02, .002); rbox(.04, .012, .074, m.acc, 0, -.05, 0, .004); }
      else if (o.mag === 'box') { rbox(.064, .1, .125, m.poly, 0, -.02, .0, .008); rbox(.066, .014, .127, m.acc, 0, .012, 0, .004); rbox(.03, .02, .03, m.metal, 0, .04, 0, .004); for (let i = 0; i < 4; i++) vtube(.0046, .034, .064, m.brass, -.028 + i * .0, -.03 + i * .011); }
      T = G;
    };

    /* ---- shotguns: Breaker (pump, wood, a saddle of spare shells) and Thresher (automatic, drum) ---- */
    const shotgun = o => {
      const BY = .03; len = o.len; port = [.024, .028, -.03]; sight = o.auto ? .09 : .068;
      side([[-.15, .03], [-.14, .054], [.1, .054], ['q', .128, .052, .13, .03], [.13, -.024], [.03, -.03], [.012, -.034], [.004, -.07], [-.062, -.07], ['q', -.071, -.07, -.071, -.06], [-.074, -.03], [-.15, -.03]], .046, o.auto ? m.fin : m.metal, 0, .007, [[[-.064, -.04], [-.064, -.057], ['q', -.064, -.063, -.058, -.063], [-.005, -.063], ['q', .001, -.063, .001, -.056], [-.001, -.04]]]);
      side([[-.03, -.036], [-.037, -.055], [-.031, -.058], [-.024, -.038]], .008, m.steel, 0, .0015); rbox(.003, .018, .058, m.hole, .0226, .026, -.03, .003); pin(-.01, .07, .046); pin(-.01, -.09, .046);
      tube(.019, -len + .01, -.14, m.steel, BY, 0, 18); muzzle(o.tip || (o.auto ? 'brake' : 'crown'), -len, BY, o.auto || o.tip ? .016 : .019);
      Object.assign(A, { fam: 'long', rf: -.15, rb: .13, top: .054, hw: .023, hz: -.15, sb: .12, pump: !o.auto });
      if (o.slug) ACC = 1;
      if (o.slug) { for (const sx of [-.008, .008]) rbox(.004, .022, .012, m.dark, sx, BY + .03, -len + .05, .001); ring(.009, .0024, .085, m.dark, .078); rbox(.024, .016, .02, m.dark, 0, .066, .085, .003); for (let i = 0; i < 3; i++) ring(.0195, .0028, -.2 - i * .1, m.glow, BY - .04); }
      ACC = 0;
      rbox(.03, .01, .3, m.heat, 0, BY + .024, -len + .22, .004); add(new THREE.SphereGeometry(.0042, 8, 6), m.glow, 0, BY + .026, -len + .03);
      if (o.auto) {
        side([[-.15, .05], [-.4, .05], [-.42, .036], [-.42, -.03], [-.4, -.04], [-.15, -.04]], .054, m.poly, 0, .008); for (let z = -.36; z < -.18; z += .045) for (const sx of [-1, 1]) rbox(.004, .014, .028, m.hole, sx * .027, .004, z, .002);
        accy(() => { rail(-.4, .1, .058); for (const sx of [-.009, .009]) rbox(.004, .02, .006, m.dark, sx, .074, .08, .001); ring(.008, .0022, .08, m.dark, .086); }); pistolGrip();
        side([[.13, .05], [.36, .06], [.38, .052], [.38, -.07], [.36, -.078], [.24, -.05], ['q', .16, -.03, .13, -.02]], .044, m.poly, 0, .009, [[[.18, .028], [.2, -.012], [.31, -.04], [.33, .03]]]); rbox(.048, .13, .016, m.rubber, 0, -.008, .387, .006);
        decal('THRESHER', '12 GA · AUTO', .12, .03, .0236, .02, -.06);
        T = parts.mag = group(0, -.1, -.115); add(new THREE.CylinderGeometry(.064, .064, .05, 26), m.poly, 0, -.022, 0, 0, 0, Math.PI / 2); for (const sx of [-.0255, .0255]) { add(new THREE.TorusGeometry(.05, .004, 6, 26), m.acc, sx, -.022, 0, 0, Math.PI / 2, 0); add(new THREE.CylinderGeometry(.02, .02, .003, 14), m.dark, sx * 1.02, -.022, 0, 0, 0, Math.PI / 2); } rbox(.03, .06, .042, m.poly, 0, .04, 0, .004); T = G; sup = [0, -.058, -.3];
      } else {
        tube(.0165, -len + .09, -.14, m.metal, BY - .04, 0, 16); lathe([[-len + .074, .008], [-len + .074, .018], [-len + .09, .018]], m.dark, BY - .04);
        for (const z of [-len + .11, -.2]) rbox(.026, .07, .014, m.dark, 0, BY - .02, z, .006);
        accy(() => { for (const sx of [-.009, .009]) rbox(.004, .018, .006, m.dark, sx, .062, .1, .001); ring(.008, .0022, .1, m.dark, .074); });
        // wooden stock with a pistol-grip wrist, and a rubber pad
        side([[.12, .04], [.2, .044], [.44, .05], [.45, .04], [.45, -.098], [.43, -.104], [.3, -.076], ['q', .2, -.05, .15, -.062], ['q', .11, -.075, .07, -.118], [.03, -.118], ['q', .02, -.08, .03, -.03], [.12, -.024]], .046, m.fin, 0, .011); rbox(.05, .15, .018, m.rubber, 0, -.028, .458, .006);
        // shells on the side
        accy(() => { rbox(.006, .044, .104, m.dark, -.0258, .008, -.03, .002); for (let i = 0; i < 4; i++) { const sz = -.066 + i * .024; vtube(.0095, -.012, .03, m.shell, -.0338, sz); vtube(.0098, -.02, -.01, m.brass, -.0338, sz); } });
        decal(o.name || 'BREAKER', o.sub || '12 GA · PUMP', .13, .032, .0236, .012, -.005);
        T = parts.pump = group(0, 0, 0); hull(oct(.056, .058, BY - .04, .016), -.46, -.24, m.fin, .004); for (let i = 0; i < 7; i++) for (const sx of [-1, 1]) rbox(.004, .03, .012, m.rubber, sx * .0285, BY - .04, -.43 + i * .028, .002); T = G; sup = [0, -.052, -.35];
      }
    };

    /* ---- bolt-action rifles: Kite (light, one-piece stock) and Longbow (heavy chassis, fluted barrel, bipod) ---- */
    const boltgun = o => {
      const BY = .03, big = o.big; len = o.len; port = [.03, .04, .03]; sight = .11;
      lathe([[-.24, .012], [-.24, big ? .0235 : .0205], [.1, big ? .0235 : .0205], [.12, .014], [.12, .008]], m.metal, BY, 0, 20); rbox(.002, .014, .07, m.hole, big ? .0228 : .0198, BY + .004, .02, .002);
      if (big) {
        side([[-.56, .008], [-.56, -.038], [-.24, -.046], [.02, -.04], [.012, -.034], [.004, -.07], [-.062, -.07], ['q', -.071, -.07, -.071, -.06], [-.074, -.034], [-.23, -.03], [-.23, .012]], .056, m.fin, 0, .008, [[[-.064, -.04], [-.064, -.057], ['q', -.064, -.063, -.058, -.063], [-.005, -.063], ['q', .001, -.063, .001, -.056], [-.001, -.04]]]);
        side([[.0, .016], [.13, .016], [.2, .05], [.5, .058], [.52, .05], [.52, -.094], [.5, -.102], [.3, -.08], ['q', .26, -.02, .2, -.02], [.14, -.03], [.06, -.118], [.03, -.118], ['q', .02, -.08, .024, -.034], [.0, -.03]], .05, m.fin, 0, .011, [[[.1, -.01], [.07, -.09], [.2, -.062], ['q', .22, -.02, .16, -.006]]]);
        rbox(.054, .15, .018, m.rubber, 0, -.022, .528, .006); rbox(.05, .022, .15, m.acc, 0, .068, .37, .008); accy(() => { vtube(.007, -.16, -.1, m.dark, 0, .44); vtube(.012, -.168, -.158, m.rubber, 0, .44); });
        lathe([[-.95, .0155], [-.56, .0185], [-.24, .0205]], m.steel, BY, 0, 16); for (let a = 0; a < 6; a++) { const t = a / 6 * TAU; box(.0035, .0035, .5, m.dark, Math.cos(t) * .0178, BY + Math.sin(t) * .0178, -.6); }
        muzzle('brake', -len, BY, .0155); accy(() => { for (const sx of [-.014, .014]) { tube(.0045, -.76, -.54, m.poly, -.055, sx, 8); rbox(.009, .012, .02, m.rubber, sx, -.055, -.765, .003); } rbox(.036, .02, .03, m.dark, 0, -.046, -.53, .004); });
        for (let z = -.5; z < -.28; z += .05) for (const sx of [-1, 1]) rbox(.004, .012, .03, m.hole, sx * .028, -.012, z, .002);
        accy(() => { rail(-.2, .1, .054, .026); scope(-.34, .17, .112, .024, .037); }); decal('LONGBOW', '.338 · BOLT', .13, .033, .0285, -.008, .33); sup = [0, -.05, -.42];
      } else {
        side([[-.5, .01], [-.5, -.028], [-.3, -.036], [.02, -.036], [.01, -.04], [.004, -.07], [-.062, -.07], ['q', -.071, -.07, -.071, -.06], [-.074, -.036], [-.2, -.03], [-.2, .012]], .048, m.fin, 0, .01, [[[-.064, -.042], [-.064, -.057], ['q', -.064, -.063, -.058, -.063], [-.005, -.063], ['q', .001, -.063, .001, -.056], [-.001, -.042]]]);
        side([[.0, .014], [.12, .014], [.17, .042], [.43, .034], [.45, .026], [.45, -.092], [.43, -.098], [.25, -.06], ['q', .16, -.04, .12, -.06], ['q', .09, -.09, .07, -.116], [.03, -.116], ['q', .018, -.08, .024, -.036], [.0, -.034]], .046, m.fin, 0, .012);
        rbox(.05, .13, .016, m.rubber, 0, -.03, .457, .006); lathe([[-.95, .0115], [-.5, .0135], [-.24, .017]], m.steel, BY, 0, 14); muzzle('crown', -len, BY, .0115);
        accy(() => scope(-.25, .11, .104, .02, .028)); decal('KITE', '.308 · BOLT', .1, .025, .0245, -.012, -.3); sup = [0, -.044, -.34];
      }
      side([[-.03, -.038], [-.037, -.055], [-.031, -.058], [-.024, -.04]], .008, m.steel, 0, .0015); Object.assign(A, { fam: 'long', rf: -.24, rb: big ? .12 : .1, top: BY + (big ? .0235 : .0205), hw: big ? .025 : .022, hz: -.24, sb: big ? .13 : .12, bolt: 1 });
      T = parts.boltL = group(0, BY, big ? .07 : .06); parts.boltL.userData.z0 = big ? .07 : .06;
      tube(big ? .0148 : .013, 0, .055, m.steel, 0); add(new THREE.CylinderGeometry(.0052, .0046, .06, 8), m.steel, .036, 0, .04, 0, 0, Math.PI / 2); add(new THREE.SphereGeometry(big ? .0135 : .011, 12, 10), m.dark, .07, 0, .04);
      T = parts.mag = group(0, big ? -.068 : -.05, -.11); rbox(big ? .036 : .03, big ? .07 : .034, big ? .08 : .062, m.poly, 0, 0, 0, .005); rbox(big ? .04 : .034, .012, big ? .084 : .066, m.acc, 0, big ? -.04 : -.02, 0, .004);
      T = G;
    };

    if (k === 'pip') pistol({ light: 1, name: 'PIP', sub: 'DP-9 · 12 RD' });
    else if (k === 'wasp') pistol({ comp: 1, ext: 1, rdot: 1, name: 'WASP', sub: 'AUTO · 13 RD' });
    else if (k === 'quill') pistol({ supp: 1, name: 'QUILL', sub: 'SUPPRESSED · 15' });
    else if (k === 'stub') {   // sawn-off double: two short barrels that break open, a wooden forend and a bird's-head grip
      len = .36; port = null; sight = .06; Object.assign(A, { fam: 'stub', by: .032 });
      side([[-.07, .052], [.04, .052], ['q', .062, .046, .058, .02], [.048, -.004], [-.07, -.004]], .058, m.metal, 0, .008);
      side([[.004, -.002], [.05, .004], ['q', .1, -.026, .094, -.096], ['q', .09, -.126, .062, -.12], ['q', .034, -.114, .03, -.07], [.018, -.03]], .036, m.fin, 0, .012);
      guardLoop(-.035, -.006); for (const sx of [-.011, .011]) side([[.03, .05], [.044, .072], [.052, .066], [.042, .05]], .008, m.steel, sx, .002); pin(.02, -.05, .058, .005);
      decal('STUB', '12 GA · 2 RD', .07, .0175, .0292, .03, -.008);
      T = parts.brk = group(0, .02, -.06);
      side([[-.015, -.004], [-.18, -.004], ['q', -.192, -.016, -.178, -.04], [-.015, -.044]], .05, m.fin, 0, .01);   // the forend, on the barrels (it tips down with them)
      for (const sx of [-.0148, .0148]) { lathe([[-.3, .0098], [-.3, .0152], [-.29, .0158], [-.02, .0158], [0, .0145], [0, .008]], m.steel, .012, sx, 16); disc(.0098, sx, .012, -.3005, m.hole); } setBore(.032, -.36, .031);
      rbox(.06, .012, .022, m.dark, 0, .012, -.283, .004); rbox(.005, .007, .262, m.metal, 0, .0295, -.14, .002); add(new THREE.SphereGeometry(.0036, 8, 6), m.brass, 0, .0355, -.29);
      T = G; sup = [0, -.034, -.16];   // both hands: the left one cups the wooden forend under the barrels
    } else if (k === 'hammer') {   // double-action revolver: stainless frame with a cylinder window, full under-lug barrel, vented rib, fluted cylinder, finger-groove grip
      len = .274; port = null; sight = .066; pistolHold = true; Object.assign(A, { fam: 'rev', by: .036 });
      const BY = .036, CY = .02, CZ = -.016;
      // frame: top strap, recoil shield and grip tang, with the window the cylinder turns in
      side([[-.072, .058], [.02, .058], ['q', .034, .058, .04, .046], [.044, .022], [.05, .004], [.03, -.012], [-.04, -.012], ['q', -.06, -.012, -.066, -.004], [-.072, .006]], .034, m.steel, 0, .005,
        [[[-.049, .051], [.013, .051], [.013, -.005], [-.049, -.005]]]);
      side([[-.034, -.01], [-.034, -.03], ['q', -.034, -.054, -.008, -.054], [.012, -.054], ['q', .03, -.054, .03, -.034], [.03, -.01]], .012, m.steel, 0, .003,
        [[[-.028, -.012], [-.028, -.03], ['q', -.028, -.048, -.008, -.048], [.012, -.048], ['q', .024, -.048, .024, -.034], [.024, -.012]]]);   // trigger guard
      for (const [y, z] of [[.03, .024], [-.002, .02], [.004, -.058]]) pin(y, z, .035, .0026, m.dark);   // side-plate screws
      rbox(.004, .01, .016, m.dark, -.019, .03, .024, .002); rbox(.002, .004, .01, m.metal, -.0215, .03, .024, .001);   // cylinder release
      // barrel: round tube on a full-length under-lug, a vented rib, crowned muzzle, ported near the end
      setBore(BY, -.274, .011); lathe([[-.072, .011], [-.262, .0105], [-.27, .0095], [-.274, .0082], [-.274, .005]], m.steel, BY, 0, 24); disc(.0048, 0, BY, -.2742, m.hole);
      side([[-.072, BY], [-.266, BY], ['q', -.274, BY, -.274, BY - .008], [-.274, .016], ['q', -.274, .01, -.266, .01], [-.072, .01]], .023, m.steel, 0, .004);
      rbox(.011, .008, .19, m.steel, 0, BY + .0135, -.167, .002); for (let i = 0; i < 7; i++) rbox(.0115, .005, .012, m.hole, 0, BY + .0122, -.088 - i * .025, .001);
      for (const z of [-.248, -.236]) rbox(.004, .003, .009, m.hole, 0, BY + .0105, z, .001);
      side([[-.262, BY + .017], [-.246, BY + .017], [-.25, BY + .03], [-.258, BY + .03]], .004, m.steel, 0, .0008); rbox(.0042, .005, .004, m.glow, 0, BY + .026, -.252, .0008);   // front sight with a coloured insert
      for (const sx of [-.0045, .0045]) rbox(.004, .009, .008, m.dark, sx, .0625, .014, .001); rbox(.016, .004, .016, m.dark, 0, .06, .016, .001);   // adjustable rear sight
      decal('HAMMER', '.44 · 6 RD', .085, .02, .0123, .023, -.17);
      // grip: rubber, finger grooves down the front strap, a medallion
      side([[.03, .004], [.058, .01], ['q', .078, -.004, .084, -.04], ['q', .09, -.08, .082, -.104], ['q', .076, -.116, .06, -.114], [.048, -.112], ['q', .038, -.108, .038, -.098], ['q', .04, -.088, .034, -.082], ['q', .029, -.075, .033, -.066], ['q', .037, -.058, .031, -.052], ['q', .025, -.045, .028, -.036], [.026, -.016]], .034, m.fin, 0, .009);
      add(new THREE.CylinderGeometry(.0055, .0055, .0355, 16), m.acc, 0, -.042, .062, 0, 0, Math.PI / 2);
      // hammer (cocks back and falls each shot) and trigger (pulled each shot)
      T = parts.ham = group(0, .044, .034);
      side([[-.006, -.006], [.006, -.006], [.01, .012], ['q', .014, .026, .028, .03], [.031, .025], ['q', .02, .02, .008, .014], [-.004, .006]], .011, m.steel, 0, .002);
      for (let i = 0; i < 3; i++) box(.0115, .0012, .002, m.dark, 0, .025 + i * .0015, .016 + i * .004, -.5);
      T = parts.trig = group(0, -.012, -.006);
      side([[-.003, .002], [.004, .002], ['q', .006, -.018, .014, -.03], [.008, -.032], ['q', -.002, -.018, -.004, .002]], .007, m.steel, 0, .0015);
      // cylinder: fluted, chamber mouths in front, brass rims behind; the ejector rod rides with it when it swings out
      T = parts.cyl = group(0, CY, CZ);
      lathe([[-.028, .004], [-.028, .022], [-.026, .0272], [.026, .0272], [.028, .023], [.028, .004]], m.steel, 0, 0, 30);
      for (let i = 0; i < 6; i++) { const a = Math.PI / 2 + TAU / 12 + i * TAU / 6; box(.0062, .0035, .034, m.dark, Math.cos(a) * .0262, Math.sin(a) * .0262, -.004, 0, 0, a + Math.PI / 2); }
      for (let i = 0; i < 6; i++) { const a = Math.PI / 2 + i * TAU / 6; disc(.0056, Math.cos(a) * .016, Math.sin(a) * .016, -.0283, m.hole); }
      tube(.0034, -.1, -.028, m.steel, 0); lathe([[-.106, .002], [-.106, .0048], [-.1, .0048], [-.1, .002]], m.steel, 0);
      { const rims = parts.rims = new THREE.Group(); T.add(rims); T = rims;
        for (let i = 0; i < 6; i++) { const a = Math.PI / 2 + i * TAU / 6, x = Math.cos(a) * .016, y = Math.sin(a) * .016; add(new THREE.CylinderGeometry(.0064, .0064, .0016, 14), m.brass, x, y, .0288, Math.PI / 2); disc(.0018, x, y, .0297, m.steel, true); } }
      T = G; sup = [-.02, -.08, .04];
    }
    else if (k === 'gnat') { carbine({ len: .32, rf: -.16, hz: -.26, hg: 'shroud', br: .0105, tip: 'flash', stock: 'wire', short: 1, mag: 'stick', magL: .13, sight: 'holo', sightY: .099, fore: 'vgrip', backup: false, sideHandle: 1, glow: false }); decal('GNAT', 'SMG · 20 RD', .085, .021, .0236, .03, -.105); }
    else if (k === 'hornet') { carbine({ len: .52, rf: -.18, hz: -.27, hg: 'slab', hgMat: m.poly, upper: m.fin, lower: m.poly, br: .0115, tip: 'supp', sl: .25, stock: 'wire', mag: 'stick', magL: .17, sight: 'holo', sightY: .099, counter: 1, backup: false, sideHandle: 1 }); decal('HORNET', 'SMG · 30 RD', .085, .021, .0236, .03, -.1); }
    else if (k === 'mako') { carbine({ len: .7, hz: -.47, hg: 'round', br: .0115, tip: 'flash', stock: 'fixed', mag: 'curve', curve: .02, sight: 'prism', sightY: .1 }); decal('MAKO', 'BURST · 24 RD', .1, .025, .0236, .03, -.125); }
    else if (k === 'paladin') { carbine({ len: .9, hz: -.56, hg: 'oct', br: .0105, tip: 'brake', stock: 'thumb', mag: 'short', sight: 'dmr', sightY: .1, backup: false }); decal('PALADIN', 'DMR · 12 RD', .12, .03, .0236, .03, -.125); }
    else if (k === 'vesper') { carbine({ len: .84, hz: -.5, hg: 'oct', br: .012, tip: 'supp', sl: .32, stock: 'skel', mag: 'curve', curve: .034, sight: 'holo', sightY: .099, fore: 'angled', counter: 1 }); decal('VESPER', 'SUPPRESSED · 30', .12, .03, .0236, .03, -.125); }
    else if (k === 'lancer') { carbine({ len: .79, hz: -.53, hg: 'slab', br: .012, tip: 'brake', stock: 'ar', mag: 'curve', curve: .028, sight: 'holo', sightY: .099, fore: 'vgrip', counter: 1, laser: 1 }); decal('LANCER', 'DP-ARMS · 5.7', .12, .03, .0236, .03, -.125); }
    else if (k === 'torrent') { carbine({ len: .95, rf: -.25, hz: -.62, hg: 'shroud', wide: 1, br: .014, tip: 'brake', stock: 'heavy', mag: 'box', sight: 'holo', sightY: .099, counter: 1, sideHandle: 1, glow: false, upper: m.fin, lower: m.metal }); rbox(.016, .012, .16, m.dark, 0, .078, -.44, .004); for (const z of [-.37, -.51]) rbox(.012, .022, .012, m.dark, 0, .068, z, .003); for (const sx of [-.014, .014]) tube(.0045, -.84, -.64, m.poly, -.014, sx, 8); decal('TORRENT', 'LMG · 100 RD', .13, .033, .0316, .03, -.13); sup = [0, -.02, -.42]; }
    else if (k === 'breaker') shotgun({ len: .79 });
    else if (k === 'thresher') shotgun({ len: .66, auto: 1 });
    else if (k === 'kite') boltgun({ len: .95 });
    else if (k === 'longbow') boltgun({ len: 1.03, big: 1 });
    else {   // the knife: a clipped blade with a fuller and a lit edge, a guard, a shaped grip, a pommel (a skin can change the blade)
      len = .24; port = null; pistolHold = true;
      const shape = line ? KNIFE_SHAPE[line] : null, bladeM = line === 'aurum' ? m.metal : line === 'nightshift' ? m.dark : m.blade, lcx = c => new THREE.Color(c).convertSRGBToLinear();
      const glowB = c => new THREE.MeshBasicMaterial({ color: lcx(c), toneMapped: false, transparent: true, opacity: .92, blending: THREE.AdditiveBlending, depthWrite: false });
      if (line && FORMS[line] && FORMS[line].knife) FORMS[line].knife({ add, side, rbox, box, lathe, m, glowB, lcx, line, L: LINES[line], grp: (x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); T.add(g); return g; }, live: (o, fn) => { o.userData.live = true; o.userData.anim = fn; return o; } });   // a top line forges its own knife (77-forms)
      else {
      if (shape === 'tanto') side([[-.02, .022], [-.19, .022], [-.238, -.004], [-.205, -.012], [-.02, -.012]], .006, bladeM, 0, .0022);
      else if (shape === 'kukri') side([[-.02, .018], ['q', -.12, .034, -.2, .014], ['q', -.25, -.002, -.236, -.02], ['q', -.15, -.03, -.02, -.012]], .007, bladeM, 0, .0022);
      else if (shape === 'cleaver') { side([[-.02, .032], [-.2, .034], [-.218, .022], [-.212, -.022], [-.02, -.014]], .006, bladeM, 0, .002); rbox(.0066, .002, .19, glowB(LINES[line].alt), 0, -.019, -.115, .0005); }
      else if (shape === 'crystal') { const ice = new THREE.MeshPhysicalMaterial({ color: lcx('#cfeaff'), roughness: .04, clearcoat: 1, transparent: true, opacity: .85, emissive: lcx('#3a8ad0'), emissiveIntensity: .45 }); if (X && X.env) { ice.envMap = X.env; ice.envMapIntensity = 1.6; }
        const c = add(new THREE.OctahedronGeometry(1, 0), ice, 0, .005, -.13); c.scale.set(.008, .026, .115); for (let i = 0; i < 3; i++) { const sh = add(new THREE.OctahedronGeometry(1, 0), ice, (i - 1) * .006, .018 + i % 2 * .006, -.05 - i * .025, 0, 0, (i - 1) * .4); sh.scale.set(.004, .014, .018); } }
      else if (shape === 'energy') { const L2 = LINES[line]; side([[-.02, .02], [-.17, .02], ['q', -.215, .018, -.25, .002], ['q', -.205, -.012, -.165, -.013], [-.02, -.013]], .004, glowB(L2.alt), 0, .0015); rbox(.0016, .006, .2, glowB('#ffffff'), 0, .003, -.12, .0005);
        const ring = add(new THREE.TorusGeometry(.03, .0016, 6, 28), glowB(L2.alt), 0, .005, -.012); ring.userData.live = true; ring.userData.anim = (o, t) => { o.rotation.set(t * 1.7, t * 1.1, 0); }; }
      else side([[-.02, .022], [-.165, .022], ['q', -.21, .02, -.242, .003], ['q', -.2, -.01, -.16, -.012], [-.02, -.012]], .006, bladeM, 0, .0022);
      if (shape === 'ornate') for (const sx of [-1, 1]) add(new THREE.ConeGeometry(.005, .03, 5), m.metal, sx * .02, .005, -.014, 0, 0, sx * Math.PI / 2);
      if (shape === 'coil') { for (let i = 0; i < 5; i++) add(new THREE.TorusGeometry(.012, .002, 6, 14), m.acc, 0, .006, -.05 - i * .024); rbox(.002, .003, .17, glowB(LINES[line].alt), 0, .023, -.11, .0005); }
      if (shape !== 'crystal' && shape !== 'energy') rbox(.0074, .005, .13, m.dark, 0, .012, -.095, .001);
      if (shape !== 'energy' && shape !== 'cleaver') rbox(.0066, .0016, .16, m.glow, 0, -.0085, -.105, .0005);
      rbox(.03, .052, .012, m.acc, 0, .005, -.014, .004); side([[-.008, .017], [.03, .02], ['q', .07, .022, .1, .012], [.104, -.014], ['q', .07, -.024, .04, -.016], ['q', .02, -.02, -.008, -.014]], .024, line ? m.fin : m.poly, 0, .009);
      for (let i = 0; i < 4; i++) rbox(.0255, .034, .004, m.rubber, 0, .0, .014 + i * .021, .002); rbox(.028, .032, .016, m.metal, 0, -.001, .108, .006); decal('DP', 'BLADE', .05, .0125, .0036, .008, -.1);
      }
    }
    if (k === 'pip' || k === 'wasp' || k === 'quill' || k === 'hammer' || k === 'knife' || (GUNS[k].cat === 'Sidearm' && k !== 'stub')) pistolHold = true;

    if (bore && -bore.z > len) len = -bore.z;   // a muzzle device past the barrel's end: the gun is that long
    if (line) { const K2 = skinKit(G, k, line, m, len, bore, Object.assign(A, { sight }), parts);
      // the Stub's barrels break open to reload: what a skin put on them goes with them (rings and collars; not the drifting bits)
      if (K2 && parts.brk) { G.updateMatrixWorld(true); for (const o of [...K2.children]) if (o.position.z < -.075 && (!o.userData.anim || o.geometry && o.geometry.type === 'TorusGeometry')) parts.brk.attach(o); } }
    const grip = k === 'knife' ? [0, 0, .045] : k === 'hammer' ? [0, -.055, .052] : k === 'stub' ? [0, -.058, .05] : pistolHold ? [0, -.062, .026] : k === 'breaker' ? [0, -.07, .05] : k === 'kite' || k === 'longbow' ? [0, -.072, .046] : [0, -.076, .026];
    if (opts.hands) {   // your own gloves and sleeves: fingers wrapped round the grip, the other hand under the gun
      const op = OPS[opts.op] || OPS.vex, band = gmats.band[op.col] || (gmats.band[op.col] = new THREE.MeshStandardMaterial({ color: LC(op.col), roughness: .5 }));
      // your gloves and sleeves stand apart from the gun: a mid-grey glove with a hint of your operative's colour, and a
      // sleeve dyed in it (each operative's arms look their own)
      const HM = gmats.hands[op.col] || (gmats.hands[op.col] = (() => { const gl = m.glove.clone(), sl = m.sleeve.clone(), c = new THREE.Color(op.col);
        gl.color.set('#6a707c').lerp(c, .16).convertSRGBToLinear(); sl.color.set('#262c38').lerp(c, .42).convertSRGBToLinear(); gl.name = sl.name = 'hand'; return { glove: gl, sleeve: sl }; })());
      const arm = (par, x, y, z, rx, ry, l) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rx, ry, 0); par.add(g); const was = T; T = g;
        lathe([[-.03, .03], [-.03, .037], [.0, .04], [.02, .043], [.03, .046], [l, .056], [l, .02]], HM.sleeve, 0, 0, 14); lathe([[.012, .0445], [.012, .0475], [.04, .0485], [.04, .046]], band, 0, 0, 14); T = was; return g; };
      const fingers = (n, x, y0, z, w, dy, mat = HM.glove) => { for (let i = 0; i < n; i++) rbox(w, .0155, .019, mat, x, y0 - i * dy, z, .0065); };
      const RH = parts.rhand = T = group(grip[0], grip[1], grip[2], k === 'knife' ? 0 : -.25);
      if (k === 'knife') { rbox(.013, .05, .074, HM.glove, .019, -.002, 0, .005); rbox(.013, .04, .07, HM.glove, -.018, -.006, 0, .005); for (let i = 0; i < 4; i++) rbox(.042, .017, .0165, HM.glove, 0, -.024, -.027 + i * .018, .0065); rbox(.012, .013, .04, HM.glove, -.011, .02, -.022, .005); rbox(.006, .024, .04, band, .0265, -.004, .012, .002); parts.rarm = arm(T, .006, -.02, .045, 1.1, -.3, .42); }
      else { rbox(.014, .074, .054, HM.glove, .0215, 0, .002, .006); rbox(.046, .072, .016, HM.glove, .002, 0, .03, .006); fingers(4, -.002, .027, -.029, .05, .0178); rbox(.014, .018, .05, HM.glove, -.0215, .032, -.012, .006); rbox(.0065, .03, .034, band, .0292, .004, .008, .002); rbox(.02, .012, .03, m.rubber, .024, .03, .004, .003); parts.rarm = arm(T, .012, -.036, .034, .7, .1, .42); }   // (the trigger arm: up from your right)
      if (k !== 'knife' && pistolHold) {
        // a pistol in both hands: the support hand closes round the grip, in the grip's own frame so it follows its angle.
        // Palm flat on the left panel, heel of the hand behind, four fingers wrapped over the trigger hand's in front of
        // the grip, the thumb laid forward along the frame
        const LH = parts.lhand = group(grip[0], grip[1], grip[2], -.25); LH.userData.wrap = 1; T = LH;   // (in the grip's own tilted frame, like the trigger hand)
        rbox(.013, .066, .058, HM.glove, -.0305, -.014, -.004, .006);   // palm
        rbox(.022, .046, .02, HM.glove, -.025, -.022, .026, .006);   // heel
        fingers(4, .002, .016, -.047, .058, .0172);   // fingers over the trigger hand's
        rbox(.012, .015, .052, HM.glove, -.0305, .034, -.026, .005);   // thumb, forward along the frame
        rbox(.0065, .028, .03, band, -.0385, -.03, .016, .002);
        parts.larm = arm(T, -.066, -.046, .04, .6, -.6, .4);   // the support arm reaches in from your left side (its cuff clear of the grip)
        if (k === 'hammer') { const sl = new THREE.Group(); sl.position.set(.012, .03, -.03); sl.rotation.x = Math.PI / 2 + .25; T.add(sl); const was = T; T = sl; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const c = vtube(.0052, -.016, .016, m.brass, Math.cos(a) * .014, Math.sin(a) * .014); c.userData.live = true; } vtube(.006, -.004, .02, m.dark, 0, 0).userData.live = true; T = was; sl.visible = false; parts.hshell = sl; }
      } else if (k !== 'knife') {
        T = parts.lhand = group(sup[0], sup[1], sup[2], pistolHold ? .3 : 0);
        // a left hand, palm up under the gun: the thumb up the near (left) side, the fingers wrapped up the far side, set
        // wide enough to clear a handguard or a pump; its forearm reaches in from your left side
        if (vgrip) {   // a vertical foregrip: a fist round the post, palm on the near side, the four fingers stacked down it and curled round the far side, the thumb over the top
          rbox(.018, .078, .058, HM.glove, -.03, -.004, .004, .007); for (let i = 0; i < 4; i++) { const fy = .026 - i * .019; rbox(.05, .016, .018, HM.glove, -.004, fy, -.026, .006); rbox(.018, .016, .036, HM.glove, .024, fy, -.008, .006); } rbox(.034, .014, .016, HM.glove, -.012, .046, -.004, .005); rbox(.004, .05, .04, m.rubber, -.0395, -.004, .004, .002); }
        else { rbox(.064, .018, .08, HM.glove, 0, 0, 0, .007); rbox(.014, .044, .07, HM.glove, .037, .022, 0, .006); for (let i = 0; i < 4; i++) rbox(.012, .034, .0165, HM.glove, .039, .034, -.027 + i * .018, .0055); rbox(.014, .03, .046, HM.glove, -.037, .016, .006, .006); rbox(.03, .004, .05, m.rubber, 0, -.0105, 0, .002); }
        parts.larm = arm(T, -.046, -.04, .024, .42, -.75, .55);   // (set low and to the left, so the cuff stays clear of what the hand holds and of the gun behind it)
        if (k === 'breaker') { const sh = vtube(.0095, -.021, .021, m.shell, 0, 0); sh.rotation.x = Math.PI / 2; sh.position.set(-.012, .03, 0); sh.userData.live = true; sh.visible = false; parts.hshell = sh; }
        if (k === 'stub') { const sl = new THREE.Group(); sl.position.set(-.004, .034, -.01); T.add(sl); const was = T; T = sl; for (const sx of [-.011, .011]) { const sh = vtube(.0095, -.021, .021, gmats('breaker').shell, 0, 0); sh.rotation.x = Math.PI / 2; sh.position.set(sx, 0, 0); sh.userData.live = true; } T = was; sl.visible = false; parts.hshell = sl; }
      }
      T = G;
    }
    bake(G, cast);
    if (parts.mag) { G.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(parts.mag); parts.mag.userData.bot = bb.min.y - parts.mag.position.y; parts.mag.userData.hw = (bb.max.x - bb.min.x) / 2; }
    if (parts.bolt && A.fam === 'long' && !parts.boltL) parts.bolt.userData.grab = A.sideHandle ? [-(A.hw || .022) - .012, .032, -.006, .058] : [0, (A.top || .06) + .003, (A.rb || .1), (A.hw || .022) + .054];
    G.userData.len = len; G.userData.port = port; G.userData.sight = sight; G.userData.parts = parts; G.userData.k = k; G.userData.grip = grip; G.userData.sup = sup; G.userData.pistolHold = pistolHold; G.userData.vgrip = vgrip; G.userData.angled = angled; G.userData.line = line; G.userData.bore = bore;
    if (opts.flash) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: X.starT, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.scale.setScalar(.4); sp.position.set(0, bore ? bore.y : .03, -len - .06); sp.visible = false; G.add(sp); G.userData.flash = sp; }
    return G;
  }
  gmats.band = {}; gmats.hands = {};
  function viewGun(k, op, skin) { return gunModel(k, { hands: true, op, skin }); }
  // a gun model that is finished with: free the shapes it alone owns (materials and textures are shared and cached;
  // shapes marked shared, like the skin effects', stay), and hand back any reload rig still on it
  function disposeGun(G) { if (!G) return; if (INS.rig && INS.rig.gun === G) insEnd(); if (G.userData.rig) rfxDrop(G.userData.rig); G.traverse(o => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); }); const ct = G.userData.parts && G.userData.parts.counter; if (ct && ct.t) ct.t.dispose(); }
  // the armory pictures: each gun rendered side-on into a small transparent image, once
  // (a new picture costs a model, its shaders and a read back from the GPU: at most one is made a frame, so opening the
  // store or the locker never freezes; the rest fill in over the next few frames, and most are made ahead of time anyway)
  const ICONB = { f: -1, n: 0 };
  function gunIcon(k, skin, ahead) {
    const ik = skin ? k + '|' + skin : k; if (ICON[ik] !== undefined) return ICON[ik];
    if (!X || !ready) return null;
    const fr = X.frameN || 0; if (ICONB.f !== fr) { ICONB.f = fr; ICONB.n = 0; } if (ICONB.n >= 1 && !ahead) return null; ICONB.n++;
    try {
      const w = 480, h = 150, r = X.renderer, rt = new THREE.WebGLRenderTarget(w, h); rt.texture.encoding = THREE.sRGBEncoding;
      const sc = new THREE.Scene(), gm = gunModel(k, { skin }); sc.add(gm); sc.add(new THREE.HemisphereLight('#ffffff', '#5a6270', 1.5));
      const kl = new THREE.DirectionalLight('#fff4e0', 2.6); kl.position.set(3, 4, 1); sc.add(kl); const rl = new THREE.DirectionalLight('#9fd8ff', 2.4); rl.position.set(-3, 2, -1); sc.add(rl);
      const bb = new THREE.Box3().setFromObject(gm), c = bb.getCenter(new THREE.Vector3()), s = bb.getSize(new THREE.Vector3());
      const hw = Math.max(s.z / 2, s.y / 2 * w / h) * 1.06, hh = hw * h / w, cam = new THREE.OrthographicCamera(-hw, hw, hh, -hh, .01, 10); cam.position.set(c.x + 3, c.y, c.z); cam.lookAt(c);
      const prev = r.getRenderTarget(), cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha();
      r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear(); r.render(sc, cam); const buf = new Uint8Array(w * h * 4); r.readRenderTargetPixels(rt, 0, 0, w, h, buf); r.setRenderTarget(prev); r.setClearColor(cc, ca); rt.dispose();
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext('2d'), id = ctx.createImageData(w, h);
      for (let y = 0; y < h; y++) id.data.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
      ctx.putImageData(id, 0, 0); disposeGun(gm); return ICON[ik] = cv;
    } catch (e) { console.error(e); return ICON[ik] = false; }
  }
  // the menus' pictures, made ahead in the quiet moments: the armory's guns, the store's current set, what your locker shows
  let iconQ = null, iconT = 0;
  function iconsAhead(dt) {
    if (!X || !ready || screen === 'play') return;   // never during a round
    if (!iconQ) { iconQ = []; try { for (const k of Object.keys(GUNS)) if (!GUNS[k].melee) iconQ.push([k, null]);
      for (const id of dailyStore()) { const sk = skinOfId(id); if (sk) iconQ.push([sk.k, id]); }
      for (const gk of SKIN_GUNS) iconQ.push([gk, STATS.equip[gk] || null]); for (const id of STATS.skins) { const sk = skinOfId(id); if (sk) iconQ.push([sk.k, id]); } } catch (e) { iconQ = []; } }
    if ((iconT -= dt) > 0) return; iconT = .12;
    if (iconQ.length) { const [k, id] = iconQ.shift(); gunIcon(k, id, true); return; }
    // then the locker's turntable, drawn once out of sight (this frame's own picture covers it), so its lighting is ready
    if (!X.gsWarm && screen === 'menu' && UI.panel === 'home') { X.gsWarm = 1; const was = UI.panel, wv = SH.lview; UI.panel = 'locker'; SH.lview = 'gun'; try { renderGunShow(0); } catch (e) {} UI.panel = was; SH.lview = wv; }
  }
  // spent brass flying out of the ejection port (first person only)
  const CASE = { pip: [.0045, .019], wasp: [.0045, .019], quill: [.0045, .019], gnat: [.0045, .019], hornet: [.0045, .019], mako: [.005, .03], paladin: [.005, .03], vesper: [.005, .03], lancer: [.005, .03], torrent: [.005, .03], kite: [.006, .04], longbow: [.0065, .045], breaker: [.0095, .05], thresher: [.0095, .05] }, CASEGEO = {};
  // where each gun sits in your view [right, up, ahead]: high enough that the hand on the grip shows at the bottom right,
  // with the support hand on the near side of the gun, as tactical shooters frame it
  const VOS = { knife: [.15, -.15, -.31], pip: [.13, -.115, -.3], wasp: [.13, -.115, -.3], quill: [.13, -.115, -.3], stub: [.17, -.165, -.29], hammer: [.13, -.115, -.3], gnat: [.185, -.172, -.29], hornet: [.185, -.172, -.29], breaker: [.185, -.178, -.27], thresher: [.185, -.178, -.28], mako: [.185, -.178, -.28], paladin: [.195, -.188, -.27], vesper: [.185, -.178, -.28], lancer: [.185, -.178, -.28], kite: [.205, -.198, -.26], longbow: [.215, -.208, -.25], torrent: [.195, -.188, -.27] };
  /* The moving parts of a gun, for your own view (fp) and your rival's model alike. `ex` carries first-person extras:
     draw (0..1 through the chambering at the end of a draw) and insp (0..1 through an inspect); show marks the store's
     turntable, which gets a skin's full reload effect without your hands. A reload runs as phases of
     r (0..1): magazine out and dropped, hand away for a fresh one, fresh one in and slapped home, then the bolt or slide. */
  const sm = x => x * x * (3 - 2 * x);
  function animParts(Gm, P, G, dt, fp, ex = {}) {
    const U = Gm.userData, pp = U.parts, A = P.ammo[G.k] || { mag: 0 };
    const st = P.fireT > 0 ? 60 / G.rpm - P.fireT : 9, shotT = st >= 0 ? st : 9, r = P.reloadT > 0 ? 1 - P.reloadT / G.rel : -1, win = (a, b) => cl((r - a) / (b - a), 0, 1);
    const dq = ex.draw == null ? -1 : ex.draw, rack = dq < 0 ? 0 : Math.sin(sm(dq) * Math.PI), iq = ex.insp == null ? -1 : ex.insp, ib = iq < 0 ? 0 : sm(cl(Math.sin(cl((iq - .3) / .45, 0, 1) * Math.PI) * 1.4, 0, 1));
    if (r < 0) P._dry = A.mag === 0; else if (r < .02) P._dry = P._dry || A.mag === 0;
    if (pp.slide) pp.slide.position.z = Math.max(shotT < .08 ? (1 - shotT / .08) * .03 : 0, A.mag === 0 && r < 0 ? .03 : 0, ib * .012, r >= 0 && P._dry ? (1 - sm(win(.86, .9))) * .03 : 0);
    if (pp.bolt) pp.bolt.position.z = (shotT < .05 ? (1 - shotT / .05) * .012 : 0) + (r > .85 ? Math.sin(win(.85, .95) * Math.PI) * .05 : 0) + rack * .05;
    if (pp.pump) { const s = cl((shotT - .16) / .36, 0, 1); pp.pump.position.z = Math.max(Math.sin(s * Math.PI) * .085, r > .85 ? Math.sin(win(.85, 1) * Math.PI) * .085 : 0, rack * .085, ib * .04); }
    if (pp.boltL) { const s = cl((shotT - (G.k === 'kite' ? .12 : .28)) / (G.k === 'kite' ? .45 : .8), 0, 1), s2 = r > .8 ? win(.8, 1) : 0, s3 = dq < 0 ? 0 : cl(dq, 0, .999), q = Math.max(s, s2, s3), lift = q <= 0 || q >= 1 ? 0 : q < .2 ? q / .2 : q > .8 ? (1 - q) / .2 : 1, back = q < .2 || q > .8 ? 0 : Math.sin((q - .2) / .6 * Math.PI);
      pp.boltL.rotation.z = Math.max(sm(cl(lift, 0, 1)), ib) * 1.1; pp.boltL.position.z = pp.boltL.userData.z0 + back * .075; }
    if (pp.cyl) { // swings out to the left to load, spins shut; turns a chamber each shot
      const o = r < 0 ? 0 : sm(win(.04, .16)) * (1 - sm(win(.84, .95))), want = (G.mag - A.mag) * TAU / 6 + (r > 0 ? sm(win(.25, .8)) * TAU * 2 : 0) + (dq > 0 ? sm(dq) * TAU : 0) + (iq > 0 ? sm(cl((iq - .3) / .5, 0, 1)) * TAU * 3 : 0);
      pp.cyl.rotation.z += (want - pp.cyl.rotation.z) * Math.min(1, dt * 22); pp.cyl.position.x = pp.cyl.userData.p0.x - o * .036; pp.cyl.position.y = pp.cyl.userData.p0.y - o * .012; pp.cyl.rotation.y = -o * .25; }
    if (pp.rot) { const w = P.net ? (P.fireT > -.15 ? 1 : 0) : (P.wind || 0); pp.rot.rotation.z += dt * w * 38; }
    if (pp.brk) pp.brk.rotation.x = -Math.max(r < 0 ? 0 : sm(win(.05, .25)) * (1 - sm(win(.8, .95))), dq < 0 ? 0 : (1 - sm(cl(dq * 1.6, 0, 1))) * .8, ib * .5) * .75;
    if (pp.ham) {   // double action: the pull cocks the hammer and it falls; drawing thumbs it back too
      const cock = shotT < .05 ? sm(shotT / .05) : shotT < .08 ? 1 - (shotT - .05) / .03 : 0;
      pp.ham.rotation.x = Math.max(cock, rack, r > .9 ? Math.sin(win(.9, 1) * Math.PI) * .6 : 0) * .62;
      if (pp.trig) pp.trig.rotation.x = -(shotT < .08 ? 1 : shotT < .14 ? 1 - (shotT - .08) / .06 : 0) * .38;
    }
    if (pp.rims) {   // spent brass is punched out, fresh rounds go in
      const out = r >= .2 && r < .62; if (fp && out && !P._droppedR) { P._droppedR = 1; dropMag(pp.rims); } if (r < .18) P._droppedR = 0; pp.rims.visible = !out;
    }
    /* A reload, in order: the support hand leaves the gun and takes hold of the magazine; pulls it and lets it fall; goes
       down for a fresh one and brings it up; pushes it home; then works the charging handle or the slide, and goes back to
       where it holds the gun. Each kind of gun keeps to the same beats with its own parts (shells, a cylinder, barrels). */
    let gone = false, out = 0;
    if (pp.mag) {
      const y0 = pp.mag.userData.p0.y, z0 = pp.mag.userData.p0.z, tilt0 = G.cat === 'Sidearm' ? -.25 : G.k === 'hornet' || G.k === 'gnat' ? .05 : 0;
      if (r >= 0) out = r < .13 ? 0 : r < .2 ? sm(win(.13, .2)) * .1 : r < .42 ? .42 : r < .7 ? lp(.42, .035, sm(win(.42, .7))) : r < .76 ? lp(.035, 0, win(.7, .76)) : 0;
      out = Math.max(out, ib * .05); gone = r >= .2 && r < .42;
      if (fp && gone && !P._dropped) { P._dropped = 1; dropMag(pp.mag); } if (r < .18) P._dropped = 0;
      pp.mag.visible = !gone; pp.mag.position.y = y0 - out; pp.mag.position.z = z0 + Math.min(out, .09) * .4; pp.mag.rotation.x = tilt0 + Math.min(out, .09) * 3;
    }
    if (pp.lhand) {
      /* The support hand never passes through the gun: each move is a route of straight legs that takes it clear first
         (down off the handguard, so the fingers come out from round it), then round the gun's left side or underneath,
         then in to where it is going. OUT is how far left is clear of any gun with the hand's own width to spare. */
      const LH = pp.lhand, p0 = LH.userData.p0, S = [p0.x, p0.y, p0.z + (pp.pump ? pp.pump.position.z : 0)], OUT = -.115; let shell = false;
      if (pp.brk) { const a = pp.brk.rotation.x, bp = pp.brk.userData.p0, dy = S[1] - bp.y, dz = S[2] - bp.z; S[1] = bp.y + dy * Math.cos(a) - dz * Math.sin(a); S[2] = bp.z + dy * Math.sin(a) + dz * Math.cos(a); LH.rotation.x = a; }   // (a break-open: the hand on the forend goes down with the barrels)
      let pos = S;
      const along = (pts, h) => { const n = pts.length - 1, f = cl(h, 0, 1) * n, i = Math.min(n - 1, Math.floor(f)), u = f - i, a = pts[i], c = pts[i + 1]; return [lp(a[0], c[0], u), lp(a[1], c[1], u), lp(a[2], c[2], u)]; };
      const under = (A2, B2) => { const low = Math.min(A2[1], B2[1]) - .06; return [A2, [A2[0], low, A2[2]], [B2[0], low, B2[2]], B2]; };   // both ends below the gun: dip, cross, rise
      const round = (A2, B2) => [A2, [A2[0], A2[1] - .05, A2[2]], [OUT, A2[1] - .05, A2[2]], [OUT, B2[1], B2[2]], B2];   // from under the gun to its side or top: down, out to the left, along, in
      const rev = pts => pts.slice().reverse(), fetch = (a, c, d, e) => sm(win(a, c)) * (1 - sm(win(d, e)));
      const gb = pp.bolt && pp.bolt.userData.grab, Hh = gb ? [gb[0] - gb[3], gb[1] - .045, gb[2] + .005 + pp.bolt.position.z] : null;
      if (r >= 0 && LH.userData.wrap && pp.mag) {   // a pistol: the hand slides down the grip's own line onto the magazine (its fingers pass in front of the grip, never through it), then back up into its hold
        const d = (.075 + out) * fetch(.03, .12, .78, .87); pos = [p0.x - .004 * Math.min(1, d / .075), p0.y - d * .969, p0.z + d * .247];
      } else if (r >= 0 && LH.userData.wrap && pp.cyl) {   // a revolver: out to the left and up under the open cylinder, away below for a ring of fresh rounds, back to drop them in
        const c = pp.cyl.position, T2 = [c.x - .03, c.y - .058 + (r > .56 && r < .66 ? Math.sin(win(.56, .66) * Math.PI) * .012 : 0), c.z + .02], rt = [S, [S[0] - .078, S[1] - .03, S[2]], [T2[0] - .048, T2[1] - .03, T2[2]], T2];   // (straight out to the left first: its fingers come away along the front of the grip, under the trigger guard)
        pos = r < .16 ? along(rt, sm(win(.05, .16))) : r < .84 ? along([T2, [T2[0] - .02, T2[1] - .32, T2[2] + .05]], fetch(.26, .36, .48, .58)) : along(rev(rt), sm(win(.84, .95))); shell = r > .44 && r < .63;
      } else if (r >= 0 && G.k === 'stub') {   // a break-open: round the left of the gun to above the open breech with two shells, thumbed in one after the other
        const push = r > .58 && r < .72 ? Math.abs(Math.sin(win(.58, .72) * Math.PI * 2)) : 0, T2 = [-.04, .092 - push * .012, -.005 - push * .03], rt = round(S, T2);
        pos = r < .34 ? along(rt, sm(win(.25, .34))) : r < .72 ? along([T2, [OUT, T2[1], T2[2]], [OUT, T2[1] - .38, T2[2] + .05]], fetch(.34, .42, .46, .56)) : along(rev(rt), sm(win(.72, .8))); shell = r > .44 && r < .68; LH.rotation.x = pp.brk.rotation.x * (1 - fetch(.25, .34, .72, .8));   // (level while it loads)
      } else if (r >= 0 && G.k === 'breaker') {   // a tube magazine: shells thumbed in one at a time, underneath, just ahead of the trigger guard
        const ph = (r * 5) % 1, T2 = [-.004, -.09 + Math.sin(ph * Math.PI) * .028, -.128 - ph * .02], rt = under(S, T2);
        pos = r < .2 ? along(rt, sm(win(.05, .2))) : r < .85 ? T2 : along(rev(rt), sm(win(.85, 1))); shell = r > .12 && r < .84 && ph < .55;
      } else if (r >= 0 && pp.mag) {   // a box magazine: under its base to pull it and to push the fresh one home; then round the left of the receiver to the charging handle
        const mp = pp.mag.position, bot = pp.mag.userData.bot || -.1, slim = (pp.mag.userData.hw || .02) < .026, Mg = [mp.x - .004, mp.y + bot - (slim ? .013 : .058) + (r > .76 && r < .84 ? Math.sin(win(.76, .84) * Math.PI) * .02 : 0), mp.z + .004];
        if (r < .12) pos = along(under(S, Mg), sm(win(.03, .12))); else if (r < .77) pos = Mg;
        else if (Hh) pos = r < .85 ? along([Mg, [Mg[0], Mg[1] - .06, Mg[2]], [OUT, Mg[1] - .06, Mg[2]], [OUT, Hh[1], Hh[2]], Hh], sm(win(.77, .85))) : r < .95 ? Hh : along(rev(round(S, Hh)), sm(win(.95, 1)));
        else pos = along(rev(under(S, Mg)), sm(win(.77, .87)));
      }
      // drawing a long gun: the same hand chambers it (beside the receiver, on the charging handle) and settles into its hold
      if (r < 0 && dq >= 0 && Hh) pos = dq < .22 ? along(round(S, Hh), sm(cl(dq / .22, 0, 1))) : dq < .72 ? Hh : along(rev(round(S, Hh)), sm(cl((dq - .72) / .28, 0, 1)));
      // looking the gun over: the support hand lets go (straight off the gun first) and drops out of the way while it is turned about
      if (r < 0 && iq > 0) { const hi = sm(cl(iq / .12, 0, 1)) * (1 - sm(cl((iq - .84) / .14, 0, 1))), off = LH.userData.wrap ? [S[0] - .012, S[1] - .13 * .969, S[2] + .13 * .247] : [S[0], S[1] - .13, S[2]]; pos = along([S, off, [off[0] - .08, off[1] - .3, off[2] + .12]], hi); }
      if (pp.hshell) pp.hshell.visible = shell;
      LH.position.set(pos[0], pos[1], pos[2]);
    }
    // the skin's own effects: its reload (and a Mythic's inspect) on your gun, in the store, and a lighter one on a rival's
    if (U.line) skinFx(Gm, P, G, r, iq, dt, fp, fp || !!ex.show);
    if (pp.counter && pp.counter.last !== A.mag) { const { c, t } = pp.counter, g = c.getContext('2d'); pp.counter.last = A.mag; g.fillStyle = '#05080c'; g.fillRect(0, 0, 64, 44); const low = A.mag <= G.mag * .25; g.fillStyle = low ? WARN : GUNS[G.k].col; g.font = '700 30px "Chakra Petch", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(A.mag).padStart(2, '0'), 32, 20); g.fillRect(6, 38, 52 * A.mag / G.mag, 3); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(6 + 52 * A.mag / G.mag, 38, 52 * (1 - A.mag / G.mag), 3); t.needsUpdate = true; }
  }
  function viewAnim(P, G, dt, ex) { animParts(X.viewGun, P, G, dt, true, ex); }
  /* Your forearms point at where your elbows are: down to your left and down to your right, just behind the view, however
     the gun is turned and wherever the hands have gone. So the support arm always reaches in from your left side, steeply
     when its hand is close to you, and neither arm swings about like part of the gun when it is tipped over to reload. */
  const ELBOW = [[-.2, -.5, -.05], [.32, -.5, .05]]; let _ae = null, _az = null;
  function aimArms(Gm) {
    const pp = Gm && Gm.userData.parts; if (!pp || !X || !X.vroot) return; if (!_ae) { _ae = new THREE.Vector3(); _az = new THREE.Vector3(0, 0, 1); }
    X.vroot.updateMatrixWorld(true);
    [pp.larm, pp.rarm].forEach((arm, i) => { if (!arm) return; _ae.set(ELBOW[i][0], ELBOW[i][1], ELBOW[i][2]); X.vroot.localToWorld(_ae); arm.parent.worldToLocal(_ae); _ae.sub(arm.position); if (_ae.lengthSq() > 1e-6) arm.quaternion.setFromUnitVectors(_az, _ae.normalize()); });
  }
  // the spent magazine: a copy falls away and tumbles out of view
  function dropMag(mag) {
    if (!X.drops) X.drops = []; X.vroot.updateMatrixWorld(true);
    const m = mag.clone(), inv = new THREE.Matrix4().copy(X.vroot.matrixWorld).invert(), mw = new THREE.Matrix4().multiplyMatrices(inv, mag.matrixWorld);
    mw.decompose(m.position, m.quaternion, m.scale); m.visible = true; X.vroot.add(m); X.drops.push({ m, t: .9, v: [-.15 + R() * .1, -.4, .15], s: [rnd(-4, 4), rnd(-2, 2), rnd(-5, 5)] });
  }
  function updateDrops(dt) {
    if (!X.drops) return;
    X.drops = X.drops.filter(d => { d.t -= dt; d.v[1] -= 6 * dt; d.m.position.x += d.v[0] * dt; d.m.position.y += d.v[1] * dt; d.m.position.z += d.v[2] * dt; d.m.rotation.x += d.s[0] * dt; d.m.rotation.y += d.s[1] * dt; d.m.rotation.z += d.s[2] * dt; if (d.t <= 0) { X.vroot.remove(d.m); return false; } return true; });
  }
  function updateCasings(dt) {
    if (!X.casings) X.casings = []; if (!X.ejects) X.ejects = [];
    X.vroot.updateMatrixWorld(true);
    for (const e of X.ejects) e.t -= dt;
    for (const e of X.ejects.filter(e => e.t <= 0)) {
      if (!X.viewGun || X.viewGun.userData.k !== e.k || !CASE[e.k] || !X.viewGun.userData.port) continue; const [rr, ll] = CASE[e.k], key = e.k;
      if (!CASEGEO[key]) CASEGEO[key] = new THREE.CylinderGeometry(rr, rr, ll, 10);
      const mm = new THREE.Mesh(CASEGEO[key], e.k === 'breaker' || e.k === 'thresher' ? gmats(e.k).shell : gmats(e.k).brass), v = new THREE.Vector3(...X.viewGun.userData.port); X.viewGun.localToWorld(v); X.vroot.worldToLocal(v);
      mm.position.copy(v); mm.rotation.set(R() * 3, R() * 3, R() * 3); X.vroot.add(mm); X.casings.push({ m: mm, v: [1.3 + R() * .6, 1.1 + R() * .6, .35 + R() * .3], s: [rnd(-20, 20), rnd(-20, 20), rnd(-20, 20)], t: .7 });
    }
    X.ejects = X.ejects.filter(e => e.t > 0);
    X.casings = X.casings.filter(c => { c.t -= dt; c.v[1] -= 7 * dt; c.m.position.x += c.v[0] * dt; c.m.position.y += c.v[1] * dt; c.m.position.z += c.v[2] * dt; c.m.rotation.x += c.s[0] * dt; c.m.rotation.y += c.s[1] * dt; c.m.rotation.z += c.s[2] * dt; if (c.t <= 0) X.vroot.remove(c.m); return c.t > 0; });
  }
