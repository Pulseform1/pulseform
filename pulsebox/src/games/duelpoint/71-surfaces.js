  /* ---------- 71 surfaces: each kind of map has walls and floors of its own ----------
     Every map used to wear the same plaster and the same stone slabs in a different tint. Now each theme is painted as
     what it is: sandstone courses in the desert, mossy temple blocks in the jungle, frosted concrete in the snow, lit
     brick and wet asphalt in the neon city, riveted plate in the foundry, hull panels on the station. They are painted,
     once as a map loads, into the same two textures the world always used (a wall 16 m by 6 m, a floor 4 m square), so a
     map costs exactly what it did: no extra draws, no extra textures, no new shaders. Big shapes and soft light, little
     speckle, so a fighter still reads at a glance. Each one meets its own edges, so it tiles without a seam. */
  const sfTone = (c, d = 0) => `rgb(${Math.round(cl(c[0] + d, 0, 255))},${Math.round(cl(c[1] + d, 0, 255))},${Math.round(cl(c[2] + d, 0, 255))})`;
  const sfA = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const sfR = (a, b) => a + Math.random() * (b - a);
  // soft washes of light and dark: the mottling of a painted or weathered surface
  function sfWash(g, x, y, w, h, n, lt, dk, a = .06, big = 1) {
    for (let i = 0; i < n; i++) { g.fillStyle = sfA(Math.random() < .55 ? lt : dk, a * (.5 + Math.random())); g.beginPath(); g.ellipse(x + Math.random() * w, y + Math.random() * h, (20 + Math.random() * 90) * big, (10 + Math.random() * 45) * big, Math.random() * 3, 0, 7); g.fill(); }
  }
  /* Courses of cut stone, brick or paving: rows of blocks of uneven length, each row starting somewhere else and running
     off one edge and back in at the other (so the texture tiles), every block its own tone, lit along its top and near
     edge and shaded along the others, the gap between them left in the colour underneath. o: { rows: [heights in px],
     min, max: block length, col, vary, joint, lit, shade, each(x, y, w, h, tone) } */
  function sfBlocks(g, x0, y0, w, o) {
    let y = y0; const j = o.joint == null ? 3 : o.joint, lit = o.lit == null ? .22 : o.lit, shade = o.shade == null ? .24 : o.shade;
    for (const rh of o.rows) {
      const ws = []; let sum = 0; while (sum < w) { const bw = sfR(o.min, o.max); ws.push(bw); sum += bw; } const k = w / sum, off = -Math.random() * o.max * .5; let x = off;
      for (const bw0 of ws) { const bw = bw0 * k, d = (Math.random() - .5) * (o.vary == null ? 20 : o.vary);
        for (const bx of x < 0 ? [x, x + w] : x + bw > w ? [x, x - w] : [x]) {
          const X0 = x0 + bx + j / 2, Y0 = y + j / 2, W2 = bw - j, H2 = rh - j;
          g.fillStyle = sfTone(o.col, d); g.fillRect(X0, Y0, W2, H2);
          g.fillStyle = `rgba(255,255,255,${lit})`; g.fillRect(X0, Y0, W2, 2); g.fillRect(X0, Y0, 2, H2);
          g.fillStyle = `rgba(0,0,0,${shade})`; g.fillRect(X0, Y0 + H2 - 2.5, W2, 2.5); g.fillRect(X0 + W2 - 2, Y0, 2, H2);
          if (o.each) o.each(X0, Y0, W2, H2, d);
        }
        x += bw; }
      y += rh;
    }
    return y;
  }
  // the coping along the top of a wall and the skirting along its foot
  function sfEdges(g, w, h, cop, sk, cc, cs, step = 128) {
    g.fillStyle = sfTone(cc); g.fillRect(0, 0, w, cop); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(0, 0, w, 3); g.fillStyle = 'rgba(0,0,0,.42)'; g.fillRect(0, cop, w, 4); g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(0, cop + 4, w, 7);
    g.fillStyle = sfTone(cs); g.fillRect(0, h - sk, w, sk); g.fillStyle = 'rgba(255,255,255,.34)'; g.fillRect(0, h - sk, w, 3); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, h - sk - 4, w, 4);
    for (let x = 0; x < w; x += step) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x, 0, 2, cop); g.fillRect(x + step / 2, h - sk, 2, sk); }
  }
  const sfCrack = (g, x, y, len, col = 'rgba(40,34,26,.45)') => { g.strokeStyle = col; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y); let cx = x, cy = y; for (let k = 0; k < 5; k++) { cx += (Math.random() - .5) * len * .5; cy += len / 5; g.lineTo(cx, cy); } g.stroke(); };
  const sfStencil = (g, s, x, y, px, col) => { g.font = `700 ${px}px "Chakra Petch", sans-serif`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(s, x, y); };

  const SURF_WALL = {
    // DESERT: a fortress of sandstone. Big cut blocks in courses, a carved fret under the capstones, sand blown up against the foot
    desert(g, w, h) {
      const C = [224, 190, 132], cop = 26, sk = 40, fr = 30; g.fillStyle = sfTone(C, -52); g.fillRect(0, 0, w, h);
      const rows = [70, 78, 70, 82, 74]; rows.push(h - cop - sk - fr - rows.reduce((a, b) => a + b, 0));
      sfBlocks(g, 0, cop + fr, w, { rows, min: 150, max: 330, col: C, vary: 22, joint: 4, each: (x, y, bw, bh) => {
        if (Math.random() < .5) { g.fillStyle = sfA(Math.random() < .5 ? [255, 236, 190] : [150, 112, 66], .09); g.beginPath(); g.ellipse(x + bw * Math.random(), y + bh * Math.random(), bw * .3, bh * .3, 0, 0, 7); g.fill(); }
        for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(120,88,50,.13)'; g.fillRect(x + 6, y + 8 + Math.random() * (bh - 16), bw - 12, 1.5); }   // the stone's bedding
        if (Math.random() < .1) { g.fillStyle = sfTone(C, -52); g.beginPath(); const cx = x + (Math.random() < .5 ? 0 : bw), s = cx === x ? 1 : -1; g.moveTo(cx, y + bh); g.lineTo(cx + s * (14 + Math.random() * 22), y + bh); g.lineTo(cx, y + bh - 10 - Math.random() * 16); g.fill(); }   // a chipped corner
        if (Math.random() < .07) sfCrack(g, x + bw * sfR(.2, .8), y + 4, bh - 8, 'rgba(96,66,36,.5)'); } });
      // the carved band: a running step-fret, cut shallow
      g.fillStyle = sfTone(C, -8); g.fillRect(0, cop, w, fr); g.strokeStyle = 'rgba(120,84,44,.5)'; g.lineWidth = 3; g.lineJoin = 'miter';
      for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x + 4, cop + fr - 7); g.lineTo(x + 4, cop + 7); g.lineTo(x + 44, cop + 7); g.lineTo(x + 44, cop + fr - 13); g.lineTo(x + 20, cop + fr - 13); g.lineTo(x + 20, cop + 15); g.lineTo(x + 32, cop + 15); g.stroke(); }
      g.fillStyle = 'rgba(255,240,200,.3)'; g.fillRect(0, cop + fr - 3, w, 2); g.fillStyle = 'rgba(90,60,30,.35)'; g.fillRect(0, cop + fr - 1, w, 3);
      // bleached by the sun up high, sand drifted against the foot
      { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,244,214,.16)'); gr.addColorStop(.5, 'rgba(255,244,214,0)'); gr.addColorStop(1, 'rgba(120,84,44,.12)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
      sfEdges(g, w, h, cop, sk, [236, 206, 150], [196, 160, 104], 256);
      { const gr = g.createLinearGradient(0, h - sk - 80, 0, h); gr.addColorStop(0, 'rgba(244,220,168,0)'); gr.addColorStop(.6, 'rgba(244,220,168,.5)'); gr.addColorStop(1, 'rgba(244,220,168,.85)'); g.fillStyle = gr; g.fillRect(0, h - sk - 80, w, sk + 80); }
      for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(255,238,196,.22)'; g.fillRect(Math.random() * w, h - sfR(0, sk + 50), 40 + Math.random() * 120, 1.5); }
    },
    // JUNGLE: an old temple the forest is taking back. Great grey-green blocks, a band of carved glyphs, moss thick at the foot
    // and under the capstones and creeping along the joints
    jungle(g, w, h) {
      const C = [150, 158, 132], cop = 26, sk = 42; g.fillStyle = sfTone(C, -64); g.fillRect(0, 0, w, h);
      const gy = cop + 96 + 92, rows = [96, 92, 46, 96]; rows.push(h - cop - sk - rows.reduce((a, b) => a + b, 0));
      sfBlocks(g, 0, cop, w, { rows, min: 190, max: 400, col: C, vary: 20, joint: 5, each: (x, y, bw, bh) => {
        if (Math.random() < .6) { g.fillStyle = sfA(Math.random() < .5 ? [200, 206, 180] : [90, 98, 76], .1); g.beginPath(); g.ellipse(x + bw * Math.random(), y + bh * Math.random(), bw * .32, bh * .34, 0, 0, 7); g.fill(); }
        if (Math.random() < .12) sfCrack(g, x + bw * sfR(.2, .8), y + 4, bh - 8, 'rgba(48,56,40,.55)');
        if (Math.abs(y - gy) < 8) { const n = Math.max(1, Math.floor(bw / 62)), sp = bw / n; g.strokeStyle = 'rgba(58,66,48,.6)'; g.lineWidth = 3;   // this course is carved: a glyph every half metre
          for (let i = 0; i < n; i++) { const cx = x + sp * (i + .5), cy = y + bh / 2, r = Math.min(13, bh * .32), kind = Math.floor(Math.random() * 4); g.beginPath();
            if (kind === 0) { g.arc(cx, cy, r, 0, 7); g.moveTo(cx + r * .4, cy); g.arc(cx, cy, r * .4, 0, 7); }
            else if (kind === 1) { g.moveTo(cx - r, cy + r); g.lineTo(cx - r, cy - r); g.lineTo(cx + r, cy - r); g.lineTo(cx + r, cy + r * .3); g.lineTo(cx - r * .3, cy + r * .3); g.lineTo(cx - r * .3, cy - r * .3); }
            else if (kind === 2) { g.moveTo(cx - r, cy + r); g.lineTo(cx - r * .4, cy + r); g.lineTo(cx - r * .4, cy); g.lineTo(cx + r * .4, cy); g.lineTo(cx + r * .4, cy - r); g.lineTo(cx + r, cy - r); }
            else { g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath(); g.moveTo(cx - r * .3, cy); g.lineTo(cx + r * .3, cy); }
            g.stroke(); } } } });
      // moss: along the joints here and there, heavy at the foot, hanging under the coping; damp running down
      const moss = (x, y, rx, ry, a) => { g.fillStyle = `rgba(${78 + Math.random() * 26},${108 + Math.random() * 24},${58 + Math.random() * 16},${a * .8})`; g.beginPath(); g.ellipse(x, y, rx, ry, Math.random() * .6 - .3, 0, 7); g.fill(); };
      { let y = cop; for (const rh of rows) { y += rh; for (let i = 0; i < 22; i++) moss(Math.random() * w, y + sfR(-5, 5), 20 + Math.random() * 60, 4 + Math.random() * 7, .5); } }
      for (let i = 0; i < 150; i++) { const t = Math.random(); moss(Math.random() * w, h - sk - t * t * 150, 24 + Math.random() * 70, 8 + Math.random() * 20, .2 + .35 * (1 - t)); }
      for (let i = 0; i < 60; i++) moss(Math.random() * w, cop + Math.random() * Math.random() * 60, 20 + Math.random() * 50, 5 + Math.random() * 12, .4);
      for (let i = 0; i < 40; i++) { const x = Math.random() * w, l = 60 + Math.random() * 200, gr = g.createLinearGradient(0, cop, 0, cop + l); gr.addColorStop(0, 'rgba(50,62,44,.25)'); gr.addColorStop(1, 'rgba(50,62,44,0)'); g.fillStyle = gr; g.fillRect(x, cop, 4 + Math.random() * 12, l); }
      sfEdges(g, w, h, cop, sk, [140, 150, 120], [112, 122, 96], 256);
      for (let i = 0; i < 90; i++) moss(Math.random() * w, Math.random() < .3 ? sfR(0, cop) : h - sfR(0, sk), 14 + Math.random() * 44, 4 + Math.random() * 9, .6);
    },
    // SNOW: a research base poured in concrete. Board-marked panels with tie holes, frost climbing from the foot, snow on
    // the ledge of the skirting and packed into the seams, icicles under the coping
    snow(g, w, h) {
      const C = [178, 188, 200], cop = 24, sk = 40; const base = g.createLinearGradient(0, 0, 0, h); base.addColorStop(0, sfTone(C, 12)); base.addColorStop(1, sfTone(C, -10)); g.fillStyle = base; g.fillRect(0, 0, w, h);
      sfWash(g, 0, 0, w, h, 120, [214, 222, 232], [136, 146, 160], .07, 1.5);
      for (let y = cop + 6; y < h - sk; y += 15) { g.fillStyle = `rgba(96,106,122,${.1 + Math.random() * .1})`; g.fillRect(0, y, w, 1.5); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0, y + 1.5, w, 1); }   // the boards the concrete was poured against
      for (let x = 0; x < w; x += 256) { g.fillStyle = 'rgba(70,80,96,.55)'; g.fillRect(x, cop, 4, h - sk - cop); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x + 4, cop, 2, h - sk - cop);
        for (const dx of [64, 192]) for (const y of [cop + 90, cop + 230, cop + 370]) { g.fillStyle = 'rgba(60,70,86,.6)'; g.beginPath(); g.arc(x + dx, y, 5, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.arc(x + dx + 1, y + 1.5, 2.4, 0, 7); g.fill(); } }
      { const y = Math.round(h * .42); g.fillStyle = 'rgba(70,80,96,.45)'; g.fillRect(0, y, w, 3); g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(0, y + 3, w, 2); }
      sfStencil(g, 'SECTOR 2', 300, cop + 60, 34, 'rgba(40,64,96,.5)'); sfStencil(g, 'KEEP CLEAR', 1340, cop + 60, 30, 'rgba(200,96,44,.55)');
      // frost: white climbing from the cold ground in a ragged edge of fine fingers, thinning as it rises
      { const gr = g.createLinearGradient(0, h - sk - 150, 0, h - sk); gr.addColorStop(0, 'rgba(244,250,255,0)'); gr.addColorStop(.6, 'rgba(244,250,255,.5)'); gr.addColorStop(1, 'rgba(244,250,255,.92)'); g.fillStyle = gr; g.fillRect(0, h - sk - 150, w, 150); }
      for (let x = 0; x < w; x += 5) { const t = .5 + .5 * Math.sin(x * Math.PI / 128) * Math.sin(x * Math.PI / 341.33), l = 60 + 90 * t + Math.random() * 70, gr = g.createLinearGradient(0, h - sk - l, 0, h - sk); gr.addColorStop(0, 'rgba(244,250,255,0)'); gr.addColorStop(1, 'rgba(244,250,255,.5)'); g.fillStyle = gr; g.fillRect(x, h - sk - l, 3 + Math.random() * 5, l); }
      for (let x = 0; x < w; x += 256) for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(248,252,255,.8)'; g.beginPath(); g.ellipse(x + sfR(-2, 7), cop + Math.random() * (h - sk - cop), 3 + Math.random() * 3.5, 8 + Math.random() * 24, 0, 0, 7); g.fill(); }   // snow packed in the seams
      for (let i = 0; i < 36; i++) { const x = Math.random() * w, l = 50 + Math.random() * 160, gr = g.createLinearGradient(0, cop, 0, cop + l); gr.addColorStop(0, 'rgba(110,122,140,.26)'); gr.addColorStop(1, 'rgba(110,122,140,0)'); g.fillStyle = gr; g.fillRect(x, cop, 3 + Math.random() * 9, l); }   // melt streaks
      sfEdges(g, w, h, cop, sk, [150, 160, 174], [134, 146, 162], 128);
      // icicles under the coping, and snow lying on the skirting's ledge and on the coping
      for (let i = 0; i < 46; i++) { const x = Math.random() * w, l = 10 + Math.random() * 44, hw = 2 + Math.random() * 3.5; g.fillStyle = 'rgba(232,244,255,.9)'; g.beginPath(); g.moveTo(x - hw, cop + 2); g.lineTo(x + hw, cop + 2); g.lineTo(x, cop + 2 + l); g.fill(); }
      g.fillStyle = '#f6fafd'; g.beginPath(); g.moveTo(0, h - sk + 6); for (let x = 0; x <= w; x += 32) g.quadraticCurveTo(x - 16, h - sk - 10 - 8 * Math.sin(x * Math.PI / 128) - 5 * Math.sin(x * Math.PI / 64), x, h - sk - 5 - 4 * Math.sin(x * Math.PI / 512)); g.lineTo(w, h - sk + 6); g.fill();
      g.fillStyle = 'rgba(120,144,176,.35)'; g.fillRect(0, h - sk + 6, w, 3); g.fillStyle = '#f6fafd'; g.fillRect(0, 0, w, 8);
    },
    // NEON: the back streets at night. Dark glazed brick over a painted dado, lit in pools of pink and cyan by signs out of
    // sight, a conduit along it, paste-ups peeling, rain running down
    neon(g, w, h) {
      const C = [94, 96, 128], cop = 22, sk = 38, dado = 150; g.fillStyle = '#23233a'; g.fillRect(0, 0, w, h);
      const n = Math.floor((h - cop - sk) / 18), rows = Array.from({ length: n }, () => (h - cop - sk) / n);
      sfBlocks(g, 0, cop, w, { rows, min: 50, max: 70, col: C, vary: 16, joint: 3, lit: .12, shade: .22, each: (x, y, bw, bh) => { if (Math.random() < .14) { g.fillStyle = sfA(Math.random() < .5 ? [120, 96, 160] : [80, 110, 150], .16); g.fillRect(x, y, bw, bh); } } });
      // the painted dado and its rail; a conduit clipped along the wall above it
      g.fillStyle = 'rgba(22,22,40,.72)'; g.fillRect(0, h - sk - dado, w, dado); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, h - sk - dado, w, 3); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, h - sk - dado - 4, w, 4);
      { const y = h - sk - dado - 34; g.fillStyle = '#3c3f58'; g.fillRect(0, y, w, 9); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, y + 9, w, 3); for (let x = 96; x < w; x += 256) { g.fillStyle = '#5a5e7c'; g.fillRect(x, y - 3, 12, 15); } }
      // paste-ups: flat shapes in the city's colours, corners torn
      const poster = (x, y, pw, ph, c1, c2, kind) => { g.save(); g.translate(x, y); g.rotate(sfR(-.04, .04)); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(3, 4, pw, ph); g.fillStyle = c1; g.fillRect(0, 0, pw, ph); g.fillStyle = c2;
        if (kind === 0) { g.beginPath(); g.arc(pw / 2, ph * .42, pw * .3, 0, 7); g.fill(); g.fillRect(pw * .15, ph * .78, pw * .7, ph * .06); g.fillRect(pw * .15, ph * .88, pw * .45, ph * .05); }
        else if (kind === 1) { for (let i = 0; i < 5; i++) g.fillRect(0, ph * (.1 + i * .18), pw, ph * .09); }
        else { g.beginPath(); g.moveTo(pw * .15, ph * .8); g.lineTo(pw * .5, ph * .15); g.lineTo(pw * .85, ph * .8); g.fill(); g.fillRect(pw * .2, ph * .86, pw * .6, ph * .05); }
        g.fillStyle = '#23233a'; g.beginPath(); g.moveTo(pw, 0); g.lineTo(pw - sfR(10, 26), 0); g.lineTo(pw, sfR(12, 30)); g.fill(); g.restore(); };
      poster(250, cop + 70, 96, 130, '#2a2f55', '#ff5fb8', 0); poster(372, cop + 96, 84, 112, '#3a2a55', '#5fe8ff', 1); poster(1210, cop + 60, 104, 138, '#26304a', '#ffd86a', 2); poster(1700, cop + 90, 88, 118, '#2a2f55', '#9a8cff', 1);
      // the light of signs you cannot see: wide soft pools, pink and cyan and a little gold
      const pool = (x, y, r, c, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, sfA(c, a)); gr.addColorStop(1, sfA(c, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
      for (const [x, y, r, c, a] of [[180, 150, 330, [255, 70, 170], .3], [760, 250, 380, [70, 230, 255], .25], [1290, 130, 330, [255, 190, 80], .18], [1830, 240, 360, [255, 70, 170], .26], [1560, 400, 260, [70, 230, 255], .18], [470, 420, 240, [150, 120, 255], .2]]) { pool(x, y, r, c, a); if (x - r < 0) pool(x + w, y, r, c, a); if (x + r > w) pool(x - w, y, r, c, a); }
      for (let i = 0; i < 50; i++) { const x = Math.random() * w, l = 60 + Math.random() * 240, gr = g.createLinearGradient(0, cop, 0, cop + l); gr.addColorStop(0, 'rgba(190,200,255,.16)'); gr.addColorStop(1, 'rgba(190,200,255,0)'); g.fillStyle = gr; g.fillRect(x, cop, 2 + Math.random() * 3, l); }
      sfEdges(g, w, h, cop, sk, [58, 60, 86], [46, 48, 70], 128);
      { const gr = g.createLinearGradient(0, h - sk, 0, h); gr.addColorStop(0, 'rgba(120,150,255,0)'); gr.addColorStop(1, 'rgba(120,150,255,.22)'); g.fillStyle = gr; g.fillRect(0, h - sk, w, sk); }   // the wet street's glow at its foot
    },
    // LAVA: the foundry. Riveted plate, dark and warm, seams and rivet lines, a hazard band above the kick plate, soot
    // running down and the heat of the floor staining its lower half
    lava(g, w, h) {
      const C = [112, 98, 92], cop = 28, sk = 44, hz = 26; g.fillStyle = sfTone(C, -50); g.fillRect(0, 0, w, h);
      const ph = (h - cop - sk - hz) / 3;
      sfBlocks(g, 0, cop, w, { rows: [ph, ph, ph], min: 256, max: 256.01, col: C, vary: 14, joint: 4, lit: .16, shade: .3, each: (x, y, bw, bh) => {
        g.fillStyle = sfA(Math.random() < .5 ? [150, 130, 118] : [60, 50, 46], .12); g.beginPath(); g.ellipse(x + bw * Math.random(), y + bh * Math.random(), bw * .34, bh * .3, 0, 0, 7); g.fill();
        for (let rx = 16; rx < bw; rx += 32) for (const ry of [11, bh - 11]) { g.fillStyle = 'rgba(30,24,22,.7)'; g.beginPath(); g.arc(x + rx, y + ry, 4, 0, 7); g.fill(); g.fillStyle = 'rgba(210,190,176,.5)'; g.beginPath(); g.arc(x + rx - 1, y + ry - 1.2, 1.8, 0, 7); g.fill(); }
        for (const rx of [11, bw - 11]) for (let ry = 36; ry < bh - 24; ry += 32) { g.fillStyle = 'rgba(30,24,22,.7)'; g.beginPath(); g.arc(x + rx, y + ry, 4, 0, 7); g.fill(); g.fillStyle = 'rgba(210,190,176,.5)'; g.beginPath(); g.arc(x + rx - 1, y + ry - 1.2, 1.8, 0, 7); g.fill(); } } });
      sfStencil(g, 'FURNACE 3', 300, cop + ph * .5, 40, 'rgba(232,210,180,.3)'); sfStencil(g, 'HOT WORK', 1330, cop + ph * 1.5, 36, 'rgba(255,170,70,.34)');
      // the hazard band: yellow and black, worn
      { const y = h - sk - hz; g.save(); g.beginPath(); g.rect(0, y, w, hz); g.clip(); g.fillStyle = '#d9a520'; g.fillRect(0, y, w, hz); g.fillStyle = '#1c1816'; for (let x = -hz; x < w + hz; x += 64) { g.beginPath(); g.moveTo(x, y + hz); g.lineTo(x + 32, y + hz); g.lineTo(x + 32 + hz, y); g.lineTo(x + hz, y); g.fill(); }
        for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(70,58,52,${.3 + Math.random() * .4})`; g.fillRect(Math.random() * w, y + Math.random() * hz, 8 + Math.random() * 40, 1.5 + Math.random() * 3); } g.restore(); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, y - 3, w, 3); }
      // soot down from the top, heat up from the floor
      for (let i = 0; i < 56; i++) { const x = Math.random() * w, l = 60 + Math.random() * 230, gr = g.createLinearGradient(0, cop, 0, cop + l); gr.addColorStop(0, 'rgba(20,16,14,.4)'); gr.addColorStop(1, 'rgba(20,16,14,0)'); g.fillStyle = gr; g.fillRect(x, cop, 5 + Math.random() * 16, l); }
      { const gr = g.createLinearGradient(0, h * .45, 0, h - sk); gr.addColorStop(0, 'rgba(255,120,40,0)'); gr.addColorStop(.7, 'rgba(255,120,40,.16)'); gr.addColorStop(1, 'rgba(255,150,60,.34)'); g.fillStyle = gr; g.fillRect(0, h * .45, w, h * .55 - sk); }
      sfEdges(g, w, h, cop, sk, [72, 62, 58], [84, 72, 66], 128);
      for (let x = 32; x < w; x += 64) for (const y of [cop / 2, h - sk / 2]) { g.fillStyle = 'rgba(24,20,18,.75)'; g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill(); g.fillStyle = 'rgba(210,190,176,.45)'; g.beginPath(); g.arc(x - 1, y - 1.4, 2, 0, 7); g.fill(); }
    },
    // SPACE: the station's hull. Pale panels with fine seams and rounded insets, vent slots, a hatch, a thin cyan line
    // at hand height, stencilled deck marks
    space(g, w, h) {
      const C = [206, 212, 224], cop = 22, sk = 40; const base = g.createLinearGradient(0, 0, 0, h); base.addColorStop(0, sfTone(C, 12)); base.addColorStop(1, sfTone(C, -14)); g.fillStyle = base; g.fillRect(0, 0, w, h);
      sfWash(g, 0, 0, w, h, 90, [240, 244, 252], [150, 160, 180], .05, 1.6);
      const seam = (x, y, pw, ph) => { g.fillStyle = 'rgba(70,82,104,.5)'; g.fillRect(x, y, pw, 2.5); g.fillRect(x, y, 2.5, ph); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x, y + 2.5, pw, 1.5); g.fillRect(x + 2.5, y, 1.5, ph); };
      const inset = (x, y, pw, ph, r = 14) => { g.lineWidth = 2.5; g.strokeStyle = 'rgba(70,82,104,.5)'; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + pw, y, x + pw, y + ph, r); g.arcTo(x + pw, y + ph, x, y + ph, r); g.arcTo(x, y + ph, x, y, r); g.arcTo(x, y, x + pw, y, r); g.closePath(); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5; g.save(); g.translate(1.5, 2); g.stroke(); g.restore(); };
      const yA = cop, yB = Math.round(h * .36), yC = h - sk;
      for (let x = 0; x < w; x += 512) { seam(x, yA, 512, yC - yA); seam(x + 256, yB, 256, yC - yB); }
      seam(0, yB, w, 0);
      for (let x = 0; x < w; x += 512) { inset(x + 30, yA + 22, 452, yB - yA - 44);
        // a vent in one lower panel, a hatch in the other
        const vx = x + 44, vy = yB + 60; g.fillStyle = 'rgba(120,132,152,.5)'; g.fillRect(vx, vy, 168, 92); g.fillStyle = 'rgba(40,48,66,.8)'; for (let i = 0; i < 6; i++) g.fillRect(vx + 12, vy + 12 + i * 13, 144, 6); g.strokeStyle = 'rgba(70,82,104,.6)'; g.lineWidth = 2; g.strokeRect(vx, vy, 168, 92);
        inset(x + 290, yB + 34, 188, yC - yB - 68, 22); g.fillStyle = 'rgba(90,102,124,.7)'; g.fillRect(x + 440, yB + (yC - yB) / 2 - 24, 10, 48); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x + 440, yB + (yC - yB) / 2 - 24, 3, 48);
        for (const [dx, dy] of [[14, 14], [242, 14], [14, yC - yB - 14], [242, yC - yB - 14]]) { g.fillStyle = 'rgba(70,82,104,.6)'; g.beginPath(); g.arc(x + dx, yB + dy, 3.5, 0, 7); g.fill(); } }
      // the cyan line, and the marks
      { const y = h - sk - 112; g.fillStyle = 'rgba(56,222,255,.8)'; g.fillRect(0, y, w, 5); g.fillStyle = 'rgba(56,222,255,.16)'; g.fillRect(0, y - 6, w, 17); }
      sfStencil(g, 'DECK 02', 70, cop + 60, 38, 'rgba(70,90,124,.5)'); sfStencil(g, 'RING C', 1110, cop + 60, 34, 'rgba(70,90,124,.45)'); sfStencil(g, 'PRESSURE DOOR', 1570, yB + 26, 22, 'rgba(230,120,50,.6)');
      for (const x of [560, 1070, 1580]) { for (let i = 0; i < 3; i++) { g.fillStyle = ['#38e8ff', '#ff8a3d', '#7dff9a'][i]; g.fillRect(x + i * 14, yB + 18, 8, 5); } }
      sfEdges(g, w, h, cop, sk, [120, 130, 150], [104, 114, 134], 128);
      for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(232,140,60,.55)'; g.beginPath(); g.moveTo(x + 8, h - 9); g.lineTo(x + 20, h - sk + 12); g.lineTo(x + 30, h - sk + 12); g.lineTo(x + 18, h - 9); g.fill(); }   // chevrons on the kick panel
    },
  };

  const SURF_GROUND = {
    // DESERT: flagstones the sand is winning against
    desert(g, w, h) {
      const C = [200, 170, 118]; g.fillStyle = sfTone([236, 212, 160]); g.fillRect(0, 0, w, h);   // sand in the joints
      sfBlocks(g, 0, 0, w, { rows: [128, 128, 128, 128], min: 110, max: 230, col: C, vary: 24, joint: 7, lit: .2, shade: .2, each: (x, y, bw, bh) => {
        g.fillStyle = sfA(Math.random() < .5 ? [240, 214, 160] : [150, 116, 70], .1); g.beginPath(); g.ellipse(x + bw * Math.random(), y + bh * Math.random(), bw * .34, bh * .3, 0, 0, 7); g.fill();
        if (Math.random() < .16) sfCrack(g, x + bw * sfR(.2, .8), y + 5, bh - 10, 'rgba(110,80,44,.5)'); } });
      for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(240,216,164,${.25 + Math.random() * .3})`; g.beginPath(); const x = Math.random() * w, y = Math.random() * h, rx = 30 + Math.random() * 90, ry = 6 + Math.random() * 16; for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) { g.moveTo(x + ox + rx, y + oy); g.ellipse(x + ox, y + oy, rx, ry, -.35, 0, 7); } g.fill(); }   // drifts, all blown the same way
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(120,90,54,${.2 + Math.random() * .25})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 1.8, 0, 7); g.fill(); }
    },
    // JUNGLE: paving under moss, grass in every joint, leaves where they fell
    jungle(g, w, h) {
      const C = [146, 152, 124]; g.fillStyle = '#5a6e42'; g.fillRect(0, 0, w, h);   // moss in the joints
      sfBlocks(g, 0, 0, w, { rows: [128, 128, 128, 128], min: 110, max: 240, col: C, vary: 22, joint: 7, lit: .16, shade: .22, each: (x, y, bw, bh) => {
        g.fillStyle = sfA(Math.random() < .5 ? [190, 196, 164] : [84, 94, 66], .12); g.beginPath(); g.ellipse(x + bw * Math.random(), y + bh * Math.random(), bw * .34, bh * .3, 0, 0, 7); g.fill();
        for (let i = 0; i < 3; i++) { g.fillStyle = `rgba(${74 + Math.random() * 20},${116 + Math.random() * 24},${54 + Math.random() * 14},${.3 + Math.random() * .3})`; g.beginPath(); const ex = Math.random() < .5, px = ex ? x + bw * Math.random() : x + (Math.random() < .5 ? 0 : bw), py = ex ? y + (Math.random() < .5 ? 0 : bh) : y + bh * Math.random(); g.ellipse(px, py, ex ? 14 + Math.random() * 30 : 6 + Math.random() * 10, ex ? 6 + Math.random() * 10 : 12 + Math.random() * 26, 0, 0, 7); g.fill(); }   // moss spreading in from the edges
        if (Math.random() < .14) sfCrack(g, x + bw * sfR(.2, .8), y + 5, bh - 10, 'rgba(50,58,40,.55)'); } });
      for (let i = 0; i < 26; i++) { const x = Math.random() * w, y = Math.random() * h, a = Math.random() * 3; g.fillStyle = ['rgba(150,120,60,.6)', 'rgba(120,96,50,.55)', 'rgba(170,150,70,.5)'][i % 3]; g.beginPath(); g.ellipse(x, y, 7 + Math.random() * 4, 3 + Math.random() * 1.5, a, 0, 7); g.fill(); }   // fallen leaves
      for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(40,52,34,.14)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 30 + Math.random() * 60, 16 + Math.random() * 30, Math.random() * 3, 0, 7); g.fill(); }   // damp
    },
    // SNOW: packed snow, blue in its hollows, a slab of the yard showing through here and there, ice where it has thawed and set
    snow(g, w, h) {
      g.fillStyle = '#e9eff5'; g.fillRect(0, 0, w, h);
      const blob = (x, y, rx, ry, rot, fill) => { g.fillStyle = fill; g.beginPath(); for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h], [w, h], [-w, -h], [w, -h], [-w, h]]) { g.moveTo(x + ox + rx, y + oy); g.ellipse(x + ox, y + oy, rx, ry, rot, 0, 7); } g.fill(); };
      for (let i = 0; i < 5; i++) { const x = Math.random() * w, y = Math.random() * h, rx = 40 + Math.random() * 50, ry = 26 + Math.random() * 30, rot = Math.random() * 3; blob(x, y, rx + 5, ry + 5, rot, 'rgba(150,172,200,.35)'); blob(x, y, rx, ry, rot, Math.random() < .5 ? '#b9c2cc' : '#cfe3f2'); blob(x - 6, y - 6, rx * .5, ry * .4, rot, 'rgba(255,255,255,.25)'); }   // bare slab, or ice
      for (let i = 0; i < 70; i++) blob(Math.random() * w, Math.random() * h, 24 + Math.random() * 70, 10 + Math.random() * 26, Math.random() * 3, Math.random() < .5 ? `rgba(255,255,255,${.25 + Math.random() * .3})` : `rgba(160,184,214,${.08 + Math.random() * .12})`);   // drifts and hollows
      for (let i = 0; i < 16; i++) { const x = Math.random() * w, y = Math.random() * h, a = Math.random() * 3; blob(x + 2, y + 2, 13, 6, a, 'rgba(140,164,196,.3)'); blob(x, y, 12, 5.5, a, 'rgba(206,220,236,.9)'); }   // boot prints
    },
    // NEON: wet asphalt. Tar seams, standing water with the signs in it
    neon(g, w, h) {
      g.fillStyle = '#4a4c62'; g.fillRect(0, 0, w, h); sfWash(g, 0, 0, w, h, 60, [96, 100, 128], [40, 42, 58], .1);
      for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${150 + Math.random() * 60},${150 + Math.random() * 60},${190 + Math.random() * 50},${.05 + Math.random() * .1})`; g.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6); }   // the stone in it
      g.strokeStyle = 'rgba(24,24,38,.7)'; g.lineWidth = 3; g.lineCap = 'round'; for (let i = 0; i < 4; i++) { let x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += sfR(-50, 50); y += sfR(-50, 50); g.lineTo(x, y); } g.stroke(); }   // tar over the cracks
      const NC2 = [[255, 70, 170], [70, 230, 255], [255, 200, 90]];
      for (let i = 0; i < 3; i++) { const x = sfR(110, w - 110), y = sfR(110, h - 110), rx = 70 + Math.random() * 40, ry = 44 + Math.random() * 30, rot = Math.random() * 3, c = NC2[i % 3];
        g.save(); g.beginPath(); for (let k = 0; k < 16; k++) { const t = k / 16 * Math.PI * 2, r = .8 + Math.random() * .3, ex = Math.cos(t) * rx * r, ey = Math.sin(t) * ry * r; g.lineTo(x + ex * Math.cos(rot) - ey * Math.sin(rot), y + ex * Math.sin(rot) + ey * Math.cos(rot)); } g.closePath(); g.clip();
        g.fillStyle = 'rgba(30,32,50,.75)'; g.fillRect(x - rx * 1.4, y - rx * 1.4, rx * 2.8, rx * 2.8);
        const gr = g.createRadialGradient(x, y, 0, x, y, rx); gr.addColorStop(0, sfA(c, .34)); gr.addColorStop(1, sfA(c, 0)); g.fillStyle = gr; g.fillRect(x - rx * 1.4, y - rx * 1.4, rx * 2.8, rx * 2.8);   // a sign, in the water
        g.restore(); }
    },
    // LAVA: tread plate. Four bolted plates to the tile, the raised pattern worn bright down the middle, soot and scorch
    lava(g, w, h) {
      const C = [104, 92, 86]; g.fillStyle = sfTone(C, -52); g.fillRect(0, 0, w, h);
      for (const [px, py] of [[0, 0], [256, 0], [0, 256], [256, 256]]) { const d = (Math.random() - .5) * 14; g.fillStyle = sfTone(C, d); g.fillRect(px + 2.5, py + 2.5, 251, 251); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(px + 2.5, py + 2.5, 251, 2); g.fillRect(px + 2.5, py + 2.5, 2, 251); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(px + 2.5, py + 251, 251, 2.5); g.fillRect(px + 251, py + 2.5, 2.5, 251);
        for (let y = 20; y < 240; y += 16) for (let x = 20 + ((y / 16) % 2) * 8; x < 240; x += 16) { const a = ((x + y) / 8) % 2 < 1 ? .6 : -.6; g.save(); g.translate(px + x, py + y); g.rotate(a); g.fillStyle = 'rgba(190,172,160,.2)'; g.fillRect(-5, -1.4, 10, 2.2); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-5, .8, 10, 1.4); g.restore(); }
        for (const [bx, by] of [[14, 14], [242, 14], [14, 242], [242, 242], [128, 14], [128, 242], [14, 128], [242, 128]]) { g.fillStyle = 'rgba(26,22,20,.75)'; g.beginPath(); g.arc(px + bx, py + by, 4.5, 0, 7); g.fill(); g.fillStyle = 'rgba(210,190,176,.4)'; g.beginPath(); g.arc(px + bx - 1, py + by - 1.3, 2, 0, 7); g.fill(); } }
      for (let i = 0; i < 7; i++) { const x = sfR(90, w - 90), y = sfR(90, h - 90), r = 60 + Math.random() * 50, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(20,16,14,.2)'); gr.addColorStop(1, 'rgba(20,16,14,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }   // soot
      for (let i = 0; i < 2; i++) { const x = sfR(80, w - 80), y = sfR(80, h - 80), r = 30 + Math.random() * 26, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,130,50,.12)'); gr.addColorStop(.5, 'rgba(90,50,30,.14)'); gr.addColorStop(1, 'rgba(90,50,30,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }   // where something hot was set down
      for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(214,196,184,.14)'; g.save(); g.translate(sfR(30, w - 30), sfR(30, h - 30)); g.rotate(sfR(-.5, .5)); g.fillRect(-20 - Math.random() * 30, 0, 40 + Math.random() * 60, 1.6); g.restore(); }   // scuffs
    },
    // SPACE: deck tiles two metres square, a grid of grip dots, a bolt at each corner, the scuffs of boots
    space(g, w, h) {
      const C = [150, 158, 174]; g.fillStyle = sfTone(C, -70); g.fillRect(0, 0, w, h);
      for (const [px, py] of [[0, 0], [256, 0], [0, 256], [256, 256]]) { const d = (Math.random() - .5) * 12, gr = g.createLinearGradient(px, py, px + 256, py + 256); gr.addColorStop(0, sfTone(C, d + 8)); gr.addColorStop(1, sfTone(C, d - 8)); g.fillStyle = gr; g.fillRect(px + 2.5, py + 2.5, 251, 251);
        g.fillStyle = 'rgba(255,255,255,.34)'; g.fillRect(px + 2.5, py + 2.5, 251, 2.5); g.fillRect(px + 2.5, py + 2.5, 2.5, 251); g.fillStyle = 'rgba(30,38,58,.3)'; g.fillRect(px + 2.5, py + 251, 251, 2.5); g.fillRect(px + 251, py + 2.5, 2.5, 251);
        for (let y = 40; y <= 216; y += 16) for (let x = 40; x <= 216; x += 16) { g.fillStyle = 'rgba(60,70,92,.3)'; g.beginPath(); g.arc(px + x, py + y, 2.4, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(px + x - .8, py + y - .8, 1.1, 0, 7); g.fill(); }
        g.strokeStyle = 'rgba(60,70,92,.3)'; g.lineWidth = 1.5; g.strokeRect(px + 26, py + 26, 204, 204);
        for (const [bx, by] of [[13, 13], [243, 13], [13, 243], [243, 243]]) { g.fillStyle = 'rgba(40,48,68,.7)'; g.beginPath(); g.arc(px + bx, py + by, 4, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.arc(px + bx - 1, py + by - 1.2, 1.7, 0, 7); g.fill(); } }
      for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(40,48,68,${.1 + Math.random() * .12})`; g.save(); g.translate(sfR(30, w - 30), sfR(30, h - 30)); g.rotate(Math.random() * 3); g.fillRect(-14 - Math.random() * 24, 0, 28 + Math.random() * 48, 2.2); g.restore(); }
    },
  };
  // (the harbour maps keep their plaster and their stone slabs, with a few things only a harbour wall has)
  function surfHarborExtra(g, w, h) {
    const cop = Math.round(h * .045), sk = Math.round(h * .075);
    sfStencil(g, 'QUAY 3', 330, cop + 62, 40, 'rgba(60,84,104,.34)'); sfStencil(g, 'NO MOORING', 1300, cop + 62, 30, 'rgba(160,70,44,.34)');
    for (const x of [770, 1790]) { const y = h - sk - 150; for (let i = 0; i < 3; i++) { const l = 70 + Math.random() * 60, gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, 'rgba(150,84,40,.5)'); gr.addColorStop(1, 'rgba(150,84,40,0)'); g.fillStyle = gr; g.fillRect(x - 9 + i * 7, y + 8, 4 + Math.random() * 4, l); }   // a mooring ring, and its rust
      g.fillStyle = '#5a5f66'; g.fillRect(x - 13, y - 12, 26, 12); g.strokeStyle = '#3c4046'; g.lineWidth = 5; g.beginPath(); g.arc(x, y + 12, 13, 0, 7); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x - 1, y + 11, 13, 3.4, 5.2); g.stroke(); }
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(250,250,244,${.14 + Math.random() * .2})`; g.beginPath(); g.ellipse(Math.random() * w, h - sk - 16 - Math.random() * 26, 10 + Math.random() * 34, 2 + Math.random() * 5, 0, 0, 7); g.fill(); }   // the salt line the spray leaves
  }
  // paints a theme's own wall or floor; false if that theme keeps the standard one
  const surfWall = (theme, g, w, h) => SURF_WALL[theme] ? (SURF_WALL[theme](g, w, h), true) : false;
  const surfGround = (theme, g, w, h) => SURF_GROUND[theme] ? (SURF_GROUND[theme](g, w, h), true) : false;
  const surfOwn = (theme, k) => !!((k === 'wall' && SURF_WALL[theme]) || (k === 'ground' && SURF_GROUND[theme]));
