// 2D layer drawn over every 3D frame: captions, comment prompts, game HUD, world titles, flashes, grain.
const W = 1080, H = 1920;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeBack = (k) => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// caption words with timings spread over the spoken line
export function captionWords(line) {
  const raw = (line.cap || line.text).split(/\s+/).filter(Boolean);
  const words = raw.map((w) => ({ w: w.replace(/\*/g, ""), hot: /\*/.test(w) }));
  const hot = (line.cap || "").includes("*");
  const weights = words.map((w) => w.w.length + 2), sum = weights.reduce((a, b) => a + b, 0);
  let acc = 0; const span = line.edur * 0.95;
  return words.map((w, i) => { const t = line.t + (acc / sum) * span; acc += weights[i]; return { ...w, hot: hot ? w.hot : false, t }; });
}
function chunks(words) { const out = []; let cur = []; words.forEach((w, i) => { cur.push(i); if (cur.length >= 3 || /[.,!?…:]$/.test(w.w)) { out.push(cur); cur = []; } }); if (cur.length) out.push(cur); return out; }

let grainCanvas = null;
function grain(g, t) {
  if (!grainCanvas) { grainCanvas = []; for (let k = 0; k < 6; k++) { const c = document.createElement("canvas"); c.width = 270; c.height = 480; const x = c.getContext("2d"); const d = x.createImageData(270, 480); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 22; } x.putImageData(d, 0, 0); grainCanvas.push(c); } }
  g.save(); g.globalCompositeOperation = "overlay"; g.imageSmoothingEnabled = false; g.drawImage(grainCanvas[Math.floor(t * 24) % 6], 0, 0, W, H); g.restore();
}
function vignette(g, a = 0.55) { const v = g.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.72); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, `rgba(0,0,0,${a})`); g.fillStyle = v; g.fillRect(0, 0, W, H); }

function drawCaption(g, tl, t) {
  const line = tl.lines.find((l) => t >= l.t - 0.05 && t < l.t + l.edur + 0.35);
  if (!line) return;
  const words = line.words, cur = words.reduce((c, w, i) => (t >= w.t ? i : c), -1);
  const ch = chunks(words), ci = Math.max(0, ch.findIndex((c) => c.includes(Math.max(cur, 0)))), chunk = ch[ci];
  const y = H * 0.75, size = 92;
  g.save(); g.textBaseline = "middle"; g.lineJoin = "round";
  const font = (s) => `900 ${s}px 'Inter', sans-serif`;
  g.font = font(size); const space = g.measureText(" ").width;
  const ws = chunk.map((i) => g.measureText(words[i].w.toUpperCase()).width);
  let total = ws.reduce((a, b) => a + b, 0) + space * (chunk.length - 1), sz = size;
  if (total > 960) { sz = size * 960 / total; total = 960; g.font = font(sz); }
  let x = (W - total) / 2;
  const villain = line.who === "G" || line.who === "C";
  chunk.forEach((i, j) => {
    const w = words[i], ww = ws[j] * sz / size;
    if (i <= cur || cur < 0) {
      const k = easeBack(clamp((t - w.t) / 0.14)), s = 0.7 + 0.3 * k + (i === cur ? 0.06 : 0);
      g.save(); g.translate(x + ww / 2, y); g.scale(s, s); g.textAlign = "center";
      g.lineWidth = sz * 0.2; g.strokeStyle = "rgba(0,0,0,.9)"; g.strokeText(w.w.toUpperCase(), 0, 0);
      g.fillStyle = w.hot ? (villain ? "#ff2a5a" : "#c6ff3d") : villain ? "#ffd6e0" : "#ffffff"; g.fillText(w.w.toUpperCase(), 0, 0);
      g.restore();
    }
    x += ww + space * sz / size;
  });
  g.restore();
}

// "comment below" cards
function speechIcon(g, x, y, s, col) { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = col; rr(g, -40, -30, 80, 56, 16); g.fill(); g.beginPath(); g.moveTo(-18, 24); g.lineTo(-30, 44); g.lineTo(2, 24); g.fill(); g.fillStyle = "#0b0d1a"; [-18, 0, 18].forEach((dx) => { g.beginPath(); g.arc(dx, -2, 6, 0, 7); g.fill(); }); g.restore(); }
function drawPrompt(g, tl, t) {
  const line = tl.lines.find((l) => l.prompt && t >= l.t && t < l.t + l.edur + 1.4);
  if (!line) return;
  const k = clamp((t - line.t) / 0.35), out = clamp((line.t + line.edur + 1.4 - t) / 0.3), a = Math.min(k, out);
  const bob = Math.sin(t * 5) * 6, y = 330 + bob;
  g.save(); g.globalAlpha = a; g.translate(W / 2, y); g.scale(0.8 + 0.2 * easeBack(k), 0.8 + 0.2 * easeBack(k)); g.rotate(-0.02);
  g.font = "900 54px 'Inter', sans-serif"; const tw = Math.min(860, g.measureText(line.prompt).width), bw = tw + 190, bh = 132;
  g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 30; g.shadowOffsetY = 10;
  g.fillStyle = "#ffffff"; rr(g, -bw / 2, -bh / 2, bw, bh, 34); g.fill(); g.shadowColor = "transparent";
  speechIcon(g, -bw / 2 + 76, -4, 0.95, "#c6ff3d");
  g.fillStyle = "#0b0d1a"; g.textAlign = "left"; g.textBaseline = "middle"; let fs = 54; while (g.measureText(line.prompt).width > 860 && fs > 30) { fs -= 2; g.font = `900 ${fs}px 'Inter', sans-serif`; }
  g.fillText(line.prompt, -bw / 2 + 140, 2);
  g.fillStyle = "#c6ff3d"; rr(g, -150, bh / 2 - 6, 300, 60, 30); g.fill(); g.fillStyle = "#0b0d1a"; g.font = "900 30px 'Inter', sans-serif"; g.textAlign = "center"; g.fillText("COMMENT BELOW ↓", 0, bh / 2 + 25);
  g.restore();
}

// which game we're in + keys collected
function heart(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.moveTo(x, y + r * 0.9); g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.9, y - r * 1.3, x, y - r * 0.45); g.bezierCurveTo(x + r * 0.9, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); g.fill(); }
function star(g, x, y, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } g.closePath(); g.fill(); }
// One Life's HUD: the life counter (pulses when in danger), wanted stars, which game, and a banner
function drawLives(g, t, state) {
  const beat = state.danger ? 1 + 0.12 * Math.max(0, Math.sin(t * 9)) : 1;
  g.save(); g.fillStyle = "rgba(5,5,10,.6)"; rr(g, W - 330, 236, 280, 76, 38); g.fill();
  g.save(); g.translate(W - 290, 272); g.scale(beat, beat); g.shadowColor = "#ff2a4a"; g.shadowBlur = state.danger ? 30 : 12; heart(g, 0, 0, 22, "#ff2a4a"); g.restore();
  g.font = "700 34px 'Chakra Petch', sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.fillText(`${state.lives} LIFE`, W - 250, 276);
  if (state.game) { g.fillStyle = "rgba(5,5,10,.6)"; rr(g, 50, 236, 230, 76, 38); g.fill(); g.fillStyle = "#c6ff3d"; g.textAlign = "center"; g.fillText(state.game, 165, 276); }
  if (state.stars != null) { g.fillStyle = "rgba(5,5,10,.6)"; rr(g, W - 330, 326, 280, 64, 32); g.fill(); for (let i = 0; i < 3; i++) { g.fillStyle = i < state.stars ? (Math.sin(t * 8 + i) > 0 ? "#ffd23d" : "#fff3b0") : "rgba(255,255,255,.18)"; star(g, W - 258 + i * 70, 358, 24); } }
  if (state.banner) { const k = clamp((t - state.banner.t) / 0.35); g.globalAlpha = k; g.translate(W / 2, 640); g.scale(0.7 + 0.3 * easeBack(k), 0.7 + 0.3 * easeBack(k)); g.textAlign = "center"; g.lineJoin = "round";
    g.font = "400 130px 'Luckiest Guy', sans-serif"; g.lineWidth = 20; g.strokeStyle = "#0b0d1a"; g.strokeText(state.banner.text, 0, 0); g.fillStyle = state.banner.color; g.fillText(state.banner.text, 0, 0); }
  g.restore();
}
// "2 hours earlier": a tape rewinding
function drawRewind(g, t, k) {
  g.save(); g.globalAlpha = Math.min(1, k * 1.5);
  for (let i = 0; i < 7; i++) { const y = ((t * 900 + i * 331) % (H + 200)) - 100, h = 14 + (i % 3) * 18; g.fillStyle = i % 2 ? "rgba(255,255,255,.22)" : "rgba(120,200,255,.16)"; g.fillRect(0, y, W, h); }
  g.globalCompositeOperation = "source-over"; g.fillStyle = "#ffffff"; g.font = "700 64px 'Chakra Petch', sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.shadowColor = "#000"; g.shadowBlur = 10;
  g.fillText("◀◀ REWIND", 70, 170); g.textAlign = "center"; g.font = "400 96px 'Luckiest Guy', sans-serif"; g.lineWidth = 16; g.strokeStyle = "#0b0d1a"; g.lineJoin = "round";
  g.strokeText("2 HOURS EARLIER", W / 2, H * 0.42); g.fillStyle = "#ffd23d"; g.fillText("2 HOURS EARLIER", W / 2, H * 0.42); g.restore();
}
function drawHud(g, tl, t, state) {
  if (state.lives != null) drawLives(g, t, state);
  if (!state.world && state.keys == null) return;
  const since = t - (state.worldT ?? -99);
  if (state.world && since < 2.6) {   // the game's title card as we arrive
    const k = clamp(since / 0.3), out = clamp((2.6 - since) / 0.4), a = Math.min(k, out);
    g.save(); g.globalAlpha = a; g.translate(W / 2, 470); g.scale(0.9 + 0.1 * easeOut(k), 0.9 + 0.1 * easeOut(k));
    g.font = "700 34px 'Chakra Petch', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#c6ff3d"; g.fillText("A PULSEBOX GAME", 0, -70);
    g.font = "400 120px 'Luckiest Guy', sans-serif"; g.lineWidth = 18; g.lineJoin = "round"; g.strokeStyle = "#0b0d1a"; g.strokeText(state.world.toUpperCase(), 0, 10); g.fillStyle = state.worldColor; g.fillText(state.world.toUpperCase(), 0, 10);
    g.restore();
  }
  if (state.keys == null) return;
  g.save(); g.fillStyle = "rgba(5,5,10,.55)"; rr(g, W - 330, 236, 280, 76, 38); g.fill();
  g.font = "700 30px 'Chakra Petch', sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.fillText("KEYS", W - 306, 275);
  const pop = state.keyPop != null ? clamp(1 - (t - state.keyPop) / 0.5) : 0;
  if (pop > 0) { g.save(); g.globalAlpha = pop; g.fillStyle = "#ffd23d"; g.shadowColor = "#ffd23d"; g.shadowBlur = 40; g.font = "400 64px 'Luckiest Guy', sans-serif"; g.textAlign = "center"; g.fillText("+1 KEY", W - 190, 380 - (1 - pop) * 40); g.restore(); }
  for (let i = 0; i < 3; i++) { const got = i < state.keys, x = W - 196 + i * 50; g.fillStyle = got ? "#ffd23d" : "rgba(255,255,255,.18)"; g.beginPath(); g.arc(x, 268, 12, 0, 7); g.fill(); g.fillRect(x - 4, 268, 8, 28); if (got) { g.shadowColor = "#ffd23d"; g.shadowBlur = 20; g.beginPath(); g.arc(x, 268, 12, 0, 7); g.fill(); g.shadowBlur = 0; } }
  g.restore();
}

// the ending's text: what Pulsebox is, the genres as they're said, the address, "computer only"
function monitorIcon(g, x, y, s, col) { g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = col; g.lineWidth = 7; rr(g, -30, -24, 60, 40, 6); g.stroke(); g.fillStyle = col; g.fillRect(-4, 16, 8, 12); g.fillRect(-18, 27, 36, 6); g.restore(); }
function drawCta(g, t, c) {
  const a1 = Math.min(clamp((t - c.t17) / 0.3), clamp((c.t19 + 0.2 - t) / 0.35));
  if (a1 > 0) {
    g.save(); g.globalAlpha = a1; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    const k = easeBack(clamp((t - c.t17) / 0.45)); g.translate(W / 2, 250); g.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
    g.font = "700 128px 'Chakra Petch', sans-serif"; const w1 = g.measureText("PULSE").width, w2 = g.measureText("BOX").width, x0 = -(w1 + w2) / 2;
    g.textAlign = "left"; g.lineWidth = 16; g.strokeStyle = "#0b0d1a"; g.strokeText("PULSE", x0, 0); g.strokeText("BOX", x0 + w1, 0);
    g.shadowColor = "#c6ff3d"; g.shadowBlur = 30; g.fillStyle = "#ffffff"; g.fillText("PULSE", x0, 0); g.fillStyle = "#c6ff3d"; g.fillText("BOX", x0 + w1, 0);
    g.restore();
    const k2 = clamp((t - c.tFree) / 0.3);
    if (k2 > 0) { g.save(); g.globalAlpha = a1 * k2; g.translate(W / 2, 390); g.scale(0.8 + 0.2 * easeBack(k2), 0.8 + 0.2 * easeBack(k2)); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
      g.font = "400 104px 'Luckiest Guy', sans-serif"; g.lineWidth = 18; g.strokeStyle = "#0b0d1a"; g.strokeText("77 FREE GAMES", 0, 0); g.fillStyle = "#ffd23d"; g.fillText("77 FREE GAMES", 0, 0); g.restore(); }
    const chips = [["RACING", "#ff3df0"], ["HORROR", "#ff2a5a"], ["HEISTS", "#ffd23d"], ["SPORTS", "#3dff7a"]];
    g.save(); g.font = "900 38px 'Inter', sans-serif"; const cw = chips.map(([s]) => g.measureText(s).width + 56), tot = cw.reduce((a, b) => a + b, 0) + 18 * 3; let x = (W - tot) / 2;
    chips.forEach(([s, col], i) => { const kk = clamp((t - c.genres[i]) / 0.25); if (kk > 0) { g.save(); g.globalAlpha = a1 * kk; g.translate(x + cw[i] / 2, 505); g.scale(0.6 + 0.4 * easeBack(kk), 0.6 + 0.4 * easeBack(kk)); g.fillStyle = col; rr(g, -cw[i] / 2, -36, cw[i], 72, 36); g.fill(); g.fillStyle = "#0b0d1a"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(s, 0, 2); g.restore(); } x += cw[i] + 18; });
    g.restore();
  }
  const ku = clamp((t - c.t18) / 0.3);
  if (ku > 0) {
    g.save(); g.translate(W / 2, 1180); g.scale(0.7 + 0.3 * easeBack(ku), 0.7 + 0.3 * easeBack(ku)); g.globalAlpha = ku;
    g.font = "900 66px 'Inter', sans-serif"; const tw = g.measureText("box.pulseform.org").width + 110;
    g.shadowColor = "rgba(198,255,61,.6)"; g.shadowBlur = 40; g.fillStyle = "#ffffff"; rr(g, -tw / 2, -62, tw, 124, 62); g.fill(); g.shadowBlur = 0;
    g.fillStyle = "#0b0d1a"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("box.pulseform.org", 0, 4); g.restore();
  }
  const kc = clamp((t - c.tPc) / 0.3);
  if (kc > 0) {
    g.save(); g.translate(W / 2, 1300); g.scale(0.7 + 0.3 * easeBack(kc), 0.7 + 0.3 * easeBack(kc)); g.globalAlpha = kc;
    g.font = "900 42px 'Inter', sans-serif"; const tw = g.measureText("PLAY IT ON A COMPUTER").width + 150;
    g.fillStyle = "rgba(11,13,26,.85)"; rr(g, -tw / 2, -44, tw, 88, 44); g.fill(); g.strokeStyle = "#c6ff3d"; g.lineWidth = 4; g.stroke();
    monitorIcon(g, -tw / 2 + 62, -2, 0.85, "#c6ff3d"); g.fillStyle = "#c6ff3d"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText("PLAY IT ON A COMPUTER", -tw / 2 + 112, 3); g.restore();
  }
}

export function drawOverlay(g, tl, t, fx = {}, state = {}) {
  if (fx.chroma) { /* drawn by caller */ }
  grain(g, t); vignette(g, fx.vignette ?? 0.55);
  if (fx.black) { g.fillStyle = `rgba(0,0,0,${clamp(fx.black)})`; g.fillRect(0, 0, W, H); }
  if (fx.flash) { g.fillStyle = `rgba(255,255,255,${clamp(fx.flash) * 0.82})`; g.fillRect(0, 0, W, H); }
  if (fx.red) { g.fillStyle = `rgba(255,20,60,${clamp(fx.red)})`; g.fillRect(0, 0, W, H); }
  if (fx.rewind) drawRewind(g, t, fx.rewind);
  drawHud(g, tl, t, state);
  if (state.cta) drawCta(g, t, state.cta);
  drawPrompt(g, tl, t);
  drawCaption(g, tl, t);
}
