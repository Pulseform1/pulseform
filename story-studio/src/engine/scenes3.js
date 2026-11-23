// Scenes for three non-horror Pulsebox games: Hyperlane (hover racing), Getaway Heat (police chase),
// Penalty Shootout (World Cup final). Each kit draws its world, the action, and the game's HUD.
import { rng, roundRect, clamp, lerp, easeInOut, easeOut } from "./util.js";
import { poly, lin, light, shade, figureVis, registerScenes } from "./scenes.js";
import { drawJay, mixc } from "./scenes2.js";

const W = 1080, H = 1920, TAU = Math.PI * 2;
export const EVENTS3 = {
  "hl-grid": { lights: [0.7, 1.2, 1.7, 2.2, 2.7], go: [3.3] },
  "ps-net": { goal: [1.3] },
};
const hudFont = (px) => `700 ${px}px 'Chakra Petch', Inter, sans-serif`;
function hudText(ctx, text, x, y, px, col = "#fff", align = "left") { ctx.font = hudFont(px); ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.lineWidth = px * 0.18; ctx.strokeStyle = "rgba(0,0,0,.75)"; ctx.strokeText(text, x, y); ctx.fillStyle = col; ctx.fillText(text, x, y); }
function sparks(ctx, x, y, lt, n, seed, spread = 1, col = "#ffd27a") {
  const r = rng(Math.floor(lt * 20) + seed); ctx.fillStyle = col;
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.4 * spread, d = r() * 160, l = 10 + r() * 26; ctx.globalAlpha = 0.5 + r() * 0.5; ctx.save(); ctx.translate(x + Math.cos(a) * d, y + Math.sin(a) * d); ctx.rotate(a); ctx.fillRect(0, -2, l, 4); ctx.restore(); }
  ctx.globalAlpha = 1; light(ctx, x, y, 160, "rgba(255,200,120,.8)", 0.6);
}
function fireworks(ctx, lt, n = 5, seed = 3) {
  for (let i = 0; i < n; i++) {
    const r = rng(seed + i * 7), period = 1.6 + r(), ph = (lt + r() * period) % period, x = 120 + r() * 840, y = 200 + r() * 500, col = ["#ff3df0", "#3de0ff", "#ffd23d", "#c6ff3d", "#ff6b3d"][i % 5];
    const k = ph / period, rad = easeOut(Math.min(1, k * 2)) * (120 + r() * 80);
    ctx.globalAlpha = 1 - k; ctx.fillStyle = col;
    for (let j = 0; j < 18; j++) { const a = (j / 18) * TAU; ctx.beginPath(); ctx.arc(x + Math.cos(a) * rad, y + Math.sin(a) * rad + k * k * 60, 5, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1; light(ctx, x, y, rad * 1.5, col, 0.25 * (1 - k));
  }
}

// ================================================================ HYPERLANE
const VP = [540, 760];
function skyline(ctx, lt, { sky = "rain" }) {
  const g = { rain: [["#05040f", 0], ["#1a0f3a", 0.5], ["#3a1050", 1]], aurora: [["#02061a", 0], ["#08203a", 0.6], ["#123a4a", 1]], sunset: [["#2a0f3a", 0], ["#c8423a", 0.6], ["#ffa24a", 1]] }[sky];
  // far below the sky highway: the city, a long way down (this also covers the whole frame)
  ctx.fillStyle = lin(ctx, 0, 800, 0, H, [[0, sky === "sunset" ? "#3a1420" : "#0a0618"], [1, "#020108"]]); ctx.fillRect(-100, 780, W + 200, H);
  const rb = rng(21); for (let i = 0; i < 140; i++) { const y = 840 + Math.pow(rb(), 1.6) * 1080, x = rb() * W; ctx.fillStyle = ["#ff3df0", "#3de0ff", "#ffd23d", "#ffffff"][i % 4]; ctx.globalAlpha = 0.15 + 0.35 * rb(); ctx.fillRect(x, y, 3 + (y - 840) / 300, 2 + (y - 840) / 400); } ctx.globalAlpha = 1;
  ctx.fillStyle = lin(ctx, 0, 0, 0, 900, g.map(([c, o]) => [o, c])); ctx.fillRect(-100, -100, W + 200, 1000);
  if (sky === "aurora") {
    for (let i = 0; i < 3; i++) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.22; ctx.fillStyle = i === 1 ? "#a24aff" : "#3dffb0"; ctx.beginPath(); ctx.moveTo(-100, 300 + i * 80); for (let x = -100; x <= W + 100; x += 40) ctx.lineTo(x, 280 + i * 80 + Math.sin(x * 0.006 + lt * 0.8 + i) * 70); for (let x = W + 100; x >= -100; x -= 40) ctx.lineTo(x, 420 + i * 90 + Math.sin(x * 0.005 + lt * 0.6 + i * 2) * 60); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = "#cfe6ff"; ctx.beginPath(); ctx.moveTo(-100, 820); [[0, 640], [180, 720], [330, 560], [520, 700], [700, 520], [880, 690], [1180, 600]].forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(1180, 820); ctx.fill();
    ctx.fillStyle = "#7a9ac8"; ctx.beginPath(); ctx.moveTo(-100, 820); [[100, 700], [260, 760], [420, 680], [640, 760], [860, 690], [1180, 760]].forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(1180, 820); ctx.fill();
    return;
  }
  if (sky === "sunset") {   // a canyon of towering mesas
    light(ctx, 540, 700, 600, "rgba(255,200,120,.9)", 0.6); ctx.fillStyle = "#ffe0a0"; ctx.beginPath(); ctx.arc(540, 720, 80, 0, TAU); ctx.fill();
    [[[-60, 820], [-60, 430], [40, 420], [90, 470], [230, 470], [270, 820]], [[700, 820], [740, 520], [780, 500], [1000, 500], [1040, 540], [1140, 560], [1140, 820]], [[260, 820], [300, 600], [460, 600], [500, 820]]].forEach((pts, i) => { poly(ctx, pts, i === 2 ? "#7a2e22" : "#5a1e1a"); ctx.fillStyle = "rgba(255,160,90,.18)"; for (let y = pts[2][1] + 30; y < 820; y += 46) ctx.fillRect(pts[0][0], y, 1400, 5); });
    return;
  }
  const r = rng(5);
  for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 14; i++) {   // the neon megacity
    const w = 60 + r() * 90, x = i * 80 + r() * 40 - 60, h = 300 + r() * 500 - layer * 120, y = 820 - h;
    ctx.fillStyle = layer ? "#120a24" : "#1c1236"; ctx.fillRect(x, y, w, h + 100);
    for (let k = 0; k < 18; k++) { if (r() < 0.55) continue; ctx.fillStyle = ["#ff3df0", "#3de0ff", "#ffd23d", "#7a5cff"][Math.floor(r() * 4)]; ctx.globalAlpha = 0.35 + 0.4 * r(); ctx.fillRect(x + 8 + r() * (w - 20), y + 10 + r() * (h - 20), 8, 5); }
    ctx.globalAlpha = 1;
    if (r() < 0.25) { ctx.fillStyle = r() < 0.5 ? "#ff3df0" : "#3de0ff"; ctx.fillRect(x + w * 0.2, y + 40, w * 0.6, 14); light(ctx, x + w * 0.5, y + 47, 120, ctx.fillStyle, 0.4); }
  }
}
function rain(ctx, lt, a = 0.5) {
  const r = rng(11); ctx.strokeStyle = `rgba(180,200,255,${a * 0.45})`; ctx.lineWidth = 2;
  for (let i = 0; i < 120; i++) { const x = r() * W, sp = 1800 + r() * 900, y = ((r() * H + lt * sp) % (H + 200)) - 100; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 14, y + 46); ctx.stroke(); }
}
function skyRoad(ctx, lt, { speed = 1, curve = 0, gates = true, pads = false, col1 = "#3de0ff", col2 = "#ff3df0" } = {}) {
  const [vx, vy] = VP, bend = (k) => vx + curve * 260 * Math.pow(1 - k, 2) * 0 + curve * 220 * (1 - k) * (1 - k);
  // road surface from the bottom of the frame to the vanishing point
  const pt = (u, k) => { const y = lerp(H + 40, vy, k), half = lerp(780, 30, k), cx = lerp(540, vx, k) + curve * 300 * k * k; return [cx + (u - 0.5) * 2 * half, y]; };
  poly(ctx, [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)], lin(ctx, 0, vy, 0, H, [[0, "#140a2a"], [1, "#0a0614"]]));
  const off = (lt * speed * 1.6) % 1;
  for (let i = 0; i < 14; i++) {   // lane dashes rushing at us
    const z = (i + off) / 14, k = 1 - Math.pow(z, 0.42);
    if (k <= 0.02) continue;
    const a = pt(0.5, k), b = pt(0.5, Math.min(1, k + 0.02)); ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - k)})`; ctx.lineWidth = 14 * (1 - k); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
    if (pads && i % 5 === 2) { const c = pt(0.3, k), d = pt(0.7, k); ctx.fillStyle = `rgba(255,210,61,${0.7 * (1 - k)})`; ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo((c[0] + d[0]) / 2, c[1] - 40 * (1 - k)); ctx.lineTo(d[0], d[1]); ctx.fill(); }
  }
  [[0, col1], [1, col2]].forEach(([u, col]) => { ctx.strokeStyle = col; ctx.lineWidth = 10; ctx.shadowColor = col; ctx.shadowBlur = 24; ctx.beginPath(); for (let k = 0; k <= 1.001; k += 0.05) { const p = pt(u, k); k ? ctx.lineTo(...p) : ctx.moveTo(...p); } ctx.stroke(); ctx.shadowBlur = 0; });
  if (gates) for (let i = 0; i < 3; i++) {   // light gates
    const z = ((i / 3) + (lt * speed * 0.35) % 1) % 1, k = 1 - Math.pow(z, 0.5);
    if (k < 0.45 || k > 0.97) continue;   // only gates far enough away to see whole: closer ones have already flashed past
    const a = pt(-0.05, k), b = pt(1.05, k), h = (b[0] - a[0]) * 0.75, fade = clamp((k - 0.45) / 0.15);
    ctx.globalAlpha = fade; ctx.strokeStyle = i % 2 ? col2 : col1; ctx.lineWidth = 26 * (1 - k); ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0], a[1] - h * 0.8); ctx.quadraticCurveTo((a[0] + b[0]) / 2, a[1] - h * 1.25, b[0], b[1] - h * 0.8); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  return pt;
}
function speedLines(ctx, lt, k = 1, col = "rgba(255,255,255,.5)") {
  const r = rng(Math.floor(lt * 30)); ctx.strokeStyle = col; ctx.lineWidth = 3;
  for (let i = 0; i < 40 * k; i++) { const a = r() * TAU, d0 = 300 + r() * 500, d1 = d0 + 200 + r() * 500; ctx.globalAlpha = 0.25 + r() * 0.4; ctx.beginPath(); ctx.moveTo(VP[0] + Math.cos(a) * d0, VP[1] + Math.sin(a) * d0); ctx.lineTo(VP[0] + Math.cos(a) * d1, VP[1] + Math.sin(a) * d1); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
// a hover car from behind. boost: 0 none, 1 blue, 2 orange, 3 purple, 4 overdrive
const BOOST = ["#9ad8ff", "#3d8cff", "#ff8a3d", "#b04aff", "#ff3df0"];
function hoverCar(ctx, x, y, s, { body = "#ff8a3d", trim = "#2a1a10", boost = 0, tilt = 0, lt = 0, ribbon = true } = {}) {
  ctx.save(); ctx.translate(x, y + Math.sin(lt * 7 + x) * 3 * s); ctx.rotate(tilt); ctx.scale(s, s);
  const glow = BOOST[boost];
  light(ctx, 0, 40, 220, glow, 0.5);
  if (ribbon) { ctx.save(); ctx.globalCompositeOperation = "lighter"; [-70, 70].forEach((ex) => { ctx.fillStyle = lin(ctx, 0, 20, 0, 300, [[0, glow], [1, "rgba(0,0,0,0)"]]); ctx.beginPath(); ctx.moveTo(ex - 18, 20); ctx.lineTo(ex + 18, 20); ctx.lineTo(ex * 1.6 + 6, 320 + Math.sin(lt * 20) * 10); ctx.lineTo(ex * 1.6 - 6, 320); ctx.fill(); }); ctx.restore(); }
  poly(ctx, [[-160, 30], [160, 30], [130, -40], [70, -78], [-70, -78], [-130, -40]], body);
  poly(ctx, [[-160, 30], [160, 30], [150, 52], [-150, 52]], trim);
  poly(ctx, [[-60, -70], [60, -70], [44, -110], [-44, -110]], "#120c22");   // canopy
  poly(ctx, [[-50, -76], [50, -76], [38, -104], [-38, -104]], "#3a2a6a");
  ctx.fillStyle = "#ff2a4a"; ctx.shadowColor = "#ff2a4a"; ctx.shadowBlur = 20; ctx.fillRect(-120, -10, 70, 12); ctx.fillRect(50, -10, 70, 12); ctx.shadowBlur = 0;
  [-70, 70].forEach((ex) => { ctx.fillStyle = "#0c0a14"; ctx.beginPath(); ctx.arc(ex, 24, 24, 0, TAU); ctx.fill(); ctx.fillStyle = glow; ctx.shadowColor = glow; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(ex, 24, 15, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; });
  ctx.restore();
}
function hlHud(ctx, lt, o) {
  const id = o.id, spd = { "hl-grid": lt > 3.3 ? Math.min(240, (lt - 3.3) * 200) : 0, "hl-finish": 418, "hl-result": 0 }[id] ?? 380 + Math.round(Math.sin(lt * 3) * 12 + (id === "hl-slip" ? lt * 6 : 0));
  hudText(ctx, `${Math.round(spd)}`, W - 70, H - 230, 92, "#fff", "right"); hudText(ctx, "KM/H", W - 70, H - 160, 34, "#3de0ff", "right");
  const od = { "hl-grid": 0, "hl-side": 0.2, "hl-drift": clamp(lt / 6) * 0.6, "hl-aurora": 0.6 + clamp(lt / 6) * 0.4, "hl-block": 1, "hl-slip": (o.figT != null && lt > o.figT) ? Math.max(0, 1 - (lt - o.figT) / 3) : 1, "hl-finish": 0.1, "hl-result": 0.1 }[id] ?? 0.5;
  ctx.fillStyle = "rgba(0,0,0,.55)"; roundRect(ctx, 60, H - 210, 420, 34, 17); ctx.fill();
  ctx.fillStyle = od >= 1 ? (Math.sin(lt * 12) > 0 ? "#ff3df0" : "#ffd23d") : "#b04aff"; roundRect(ctx, 64, H - 206, 412 * od, 26, 13); ctx.fill();
  hudText(ctx, od >= 1 ? "OVERDRIVE READY" : "OVERDRIVE", 70, H - 238, 30, od >= 1 ? "#ffd23d" : "#d8c8ff");
}

// ================================================================ GETAWAY HEAT (top down)
function cityTop(ctx, lt, { speed = 1, roadW = 420, map = "neon", narrow = 0 } = {}) {
  const day = map === "palm";
  ctx.fillStyle = day ? "#2a2a34" : "#0e0c16"; ctx.fillRect(-100, -100, W + 200, H + 200);
  const rw = lerp(roadW, 230, narrow), x0 = 540 - rw / 2, x1 = 540 + rw / 2;
  ctx.fillStyle = day ? "#3a3a44" : "#1a1824"; ctx.fillRect(x0, -100, rw, H + 200);
  const off = (lt * speed * 900) % 240;
  ctx.fillStyle = day ? "rgba(255,255,255,.7)" : "rgba(255,220,120,.55)"; if (!narrow) for (let y = -240 + off; y < H; y += 240) ctx.fillRect(538, y, 6, 120);
  // buildings on both sides, seen from above with a little height
  const bo = (lt * speed * 900) % 520;
  for (const side of [-1, 1]) for (let y = -520 + bo; y < H + 520; y += 520) {
    const r = rng(Math.floor((y - bo) / 520) * 3 + side + 40), bw = 300 + r() * 120, bx = side < 0 ? x0 - 30 - bw : x1 + 30, bh = 420;
    if (day && r() < 0.4) { for (let k = 0; k < 3; k++) { const px = bx + 60 + k * 110, py = y + 80 + k * 120; ctx.fillStyle = "#2a5a2a"; for (let j = 0; j < 6; j++) { ctx.save(); ctx.translate(px, py); ctx.rotate(j * 1.05 + lt * 0.2); ctx.beginPath(); ctx.ellipse(40, 0, 50, 14, 0, 0, TAU); ctx.fill(); ctx.restore(); } } continue; }
    const hx = side < 0 ? 30 : -30;
    ctx.fillStyle = day ? "#5a5060" : "#18142a"; ctx.fillRect(bx, y, bw, bh);
    ctx.fillStyle = day ? "#7a7080" : "#241e3a"; ctx.fillRect(bx + hx, y - 30, bw, bh);
    if (!day) for (let k = 0; k < 10; k++) { ctx.fillStyle = ["#ff3df0", "#3de0ff", "#ffd23d"][Math.floor(r() * 3)]; ctx.globalAlpha = 0.5; ctx.fillRect(bx + hx + 20 + r() * (bw - 50), y - 10 + r() * (bh - 40), 14, 8); }
    ctx.globalAlpha = 1;
    if (!day && r() < 0.5) { ctx.fillStyle = r() < 0.5 ? "#ff3df0" : "#3de0ff"; ctx.fillRect(side < 0 ? x0 - 40 : x1 + 30, y + 120, 10, 160); light(ctx, side < 0 ? x0 - 35 : x1 + 35, y + 200, 160, ctx.fillStyle, 0.5); }
  }
  if (narrow) { ctx.fillStyle = "#08060e"; ctx.fillRect(-100, -100, x0 - 4 + 100, H + 200); ctx.fillRect(x1 + 4, -100, W, H + 200); ctx.fillStyle = "#2a2440"; ctx.fillRect(x0 - 24, -100, 20, H + 200); ctx.fillRect(x1 + 4, -100, 20, H + 200); }
  return { x0, x1 };
}
function carTop(ctx, x, y, s, { color = "#ff8a3d", police = false, swat = false, rot = 0, lt = 0, brake = false } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  const w = swat ? 96 : 76, h = swat ? 190 : 150;
  ctx.fillStyle = "rgba(0,0,0,.45)"; roundRect(ctx, -w / 2 + 8, -h / 2 + 10, w, h, 18); ctx.fill();
  ctx.fillStyle = police ? "#f2f2f6" : swat ? "#1c2230" : color; roundRect(ctx, -w / 2, -h / 2, w, h, 18); ctx.fill();
  if (police) { ctx.fillStyle = "#111"; ctx.fillRect(-w / 2, -h * 0.12, w, h * 0.24); }
  ctx.fillStyle = "#0c1420"; roundRect(ctx, -w / 2 + 10, -h / 2 + 26, w - 20, 30, 8); ctx.fill(); roundRect(ctx, -w / 2 + 12, h / 2 - 46, w - 24, 22, 6); ctx.fill();
  ctx.fillStyle = "#fffbe0"; ctx.fillRect(-w / 2 + 6, -h / 2 + 2, 16, 8); ctx.fillRect(w / 2 - 22, -h / 2 + 2, 16, 8);
  ctx.fillStyle = brake ? "#ff2a2a" : "#a01818"; ctx.fillRect(-w / 2 + 6, h / 2 - 9, 16, 7); ctx.fillRect(w / 2 - 22, h / 2 - 9, 16, 7);
  if (police || swat) { const on = Math.sin(lt * 18) > 0; ctx.fillStyle = on ? "#ff2a3a" : "#2a5aff"; ctx.fillRect(-w / 2 + 12, -8, w / 2 - 12, 14); ctx.fillStyle = on ? "#2a5aff" : "#ff2a3a"; ctx.fillRect(0, -8, w / 2 - 12, 14); light(ctx, 0, 0, 240, on ? "rgba(255,40,60,.9)" : "rgba(40,90,255,.9)", 0.55); }
  if (!police && !swat) { light(ctx, 0, -h / 2 - 120, 200, "rgba(255,250,220,.5)", 0.45); }
  ctx.restore();
}
function tankTop(ctx, x, y, s, aim, lt) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = "#1a1c14"; ctx.fillRect(-120, -150, 50, 300); ctx.fillRect(70, -150, 50, 300);
  ctx.fillStyle = "#2a2e1c"; for (let k = 0; k < 10; k++) { ctx.fillRect(-120, -150 + ((k * 30 + lt * 120) % 300), 50, 6); ctx.fillRect(70, -150 + ((k * 30 + lt * 120) % 300), 50, 6); }
  ctx.fillStyle = "#4a5232"; roundRect(ctx, -90, -130, 180, 260, 20); ctx.fill();
  ctx.save(); ctx.rotate(aim); ctx.fillStyle = "#3a4228"; ctx.beginPath(); ctx.arc(0, 0, 70, 0, TAU); ctx.fill(); ctx.fillStyle = "#2a3018"; ctx.fillRect(-12, 0, 24, 220); ctx.restore();
  ctx.restore();
}
function heliTop(ctx, x, y, s, lt) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = "#14161e"; ctx.beginPath(); ctx.ellipse(0, 0, 50, 80, 0, 0, TAU); ctx.fill(); ctx.fillRect(-8, 60, 16, 130);
  ctx.save(); ctx.rotate(lt * 30); ctx.fillStyle = "rgba(30,30,40,.35)"; ctx.beginPath(); ctx.arc(0, 0, 220, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(10,10,16,.8)"; ctx.fillRect(-220, -7, 440, 14); ctx.fillRect(-7, -220, 14, 440); ctx.restore();
  ctx.fillStyle = Math.sin(lt * 8) > 0 ? "#ff2a2a" : "#4a0a0a"; ctx.beginPath(); ctx.arc(0, 186, 8, 0, TAU); ctx.fill();
  ctx.restore();
}
function spotlight(ctx, x, y, r = 210) { ctx.save(); ctx.globalCompositeOperation = "lighter"; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "rgba(255,255,230,.55)"); g.addColorStop(0.75, "rgba(255,255,230,.25)"); g.addColorStop(1, "rgba(255,255,230,0)"); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore(); }
function boom(ctx, x, y, k, s = 1) {   // explosion, k: 0..1 age
  if (k <= 0 || k >= 1) return;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const rad = easeOut(k) * 260 * s; light(ctx, x, y, rad * 2, "rgba(255,170,60,.9)", 1 - k);
  ctx.fillStyle = `rgba(255,220,120,${1 - k})`; ctx.beginPath(); ctx.arc(x, y, rad * 0.6, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.fillStyle = `rgba(40,36,40,${0.7 * (1 - k)})`; for (let i = 0; i < 8; i++) { const a = i * 0.8; ctx.beginPath(); ctx.arc(x + Math.cos(a) * rad * 0.8, y + Math.sin(a) * rad * 0.8, rad * 0.3, 0, TAU); ctx.fill(); }
}
function ghHud(ctx, lt, o) {
  const stars = o.id === "gh-escape" ? (o.figT != null && lt > o.figT ? 3 : 1) : o.id === "gh-tank" || o.id === "gh-jump" ? 6 : 5;
  for (let i = 0; i < 6; i++) { const on = i < stars; ctx.fillStyle = on ? (stars === 6 && Math.sin(lt * 10) > 0 ? "#ff3d3d" : "#ffd23d") : "rgba(255,255,255,.2)"; star(ctx, W - 80 - i * 62, 380, 26); }
  const coins = { "gh-heli": 1240, "gh-street": 1240 + (o.figT != null && lt > o.figT ? 500 : 0), "gh-swat": 2900, "gh-alley": 3400, "gh-tank": 3400, "gh-jump": 3400 + (o.figT != null && lt > o.figT ? 12000 : 0), "gh-escape": 15400 }[o.id] ?? 0;
  ctx.fillStyle = "#ffd23d"; ctx.beginPath(); ctx.arc(80, H - 200, 22, 0, TAU); ctx.fill(); hudText(ctx, coins.toLocaleString("en-US"), 116, H - 200, 44);
}
function zoomAt(ctx, x, y, z) { ctx.translate(x, y); ctx.scale(z, z); ctx.translate(-x, -y); }
function star(ctx, x, y, r) { ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
function comboBurst(ctx, lt, t0, text) {
  if (t0 == null || lt < t0) return; const k = lt - t0; if (k > 1.6) return;
  const s = easeOut(Math.min(1, k * 4)) * (1 - Math.max(0, k - 1.2) * 2.5);
  ctx.save(); ctx.translate(540, 760); ctx.rotate(-0.08); ctx.scale(s, s); hudText(ctx, text, 0, 0, 120, "#ffd23d", "center"); ctx.restore();
}

// ================================================================ PENALTY SHOOTOUT
const KIT = { hood: "#ff8a3d", hoodD: "#c45a1a", jeans: "#f2f2f2", jeansD: "#cfcfd6", shoe: "#1a1a22" };
const KEEPER = { hood: "#2a8cff", hoodD: "#1a5ab8", jeans: "#14161e", jeansD: "#0c0e14", shoe: "#f2f2f2", skin: "#c68a5f", skinD: "#a06a44", hair: "#2a1a10", hairD: "#1a0f08" };
const STRIKER = { hood: "#e8233a", hoodD: "#a8142a", jeans: "#f2f2f2", jeansD: "#cfcfd6", shoe: "#111", skin: "#e0a37c", hair: "#3a2414", hairD: "#2a180c" };
function stadium(ctx, lt, { horizon = 900, crowdK = 1, flashes = 0.3 } = {}) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, horizon, [[0, "#02040c"], [1, "#0c1430"]]); ctx.fillRect(-100, -100, W + 200, horizon + 100);
  [[120, 120], [960, 120]].forEach(([x, y]) => { ctx.fillStyle = "#1a1c26"; ctx.fillRect(x - 6, y, 12, horizon - y); ctx.fillStyle = "#fffbe8"; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) ctx.fillRect(x - 60 + i * 32, y - 40 + j * 22, 24, 16); light(ctx, x, y - 10, 520, "rgba(255,255,230,.7)", 0.6); });
  const r = rng(8);   // the crowd in the stands
  for (let row = 0; row < 18; row++) { const y = horizon - 380 + row * 22; ctx.fillStyle = row % 2 ? "#1a1830" : "#14122a"; ctx.fillRect(-100, y, W + 200, 22); for (let x = -20; x < W + 20; x += 13) { ctx.fillStyle = ["#ff8a3d", "#2a8cff", "#f2f2f2", "#e8233a", "#ffd23d"][Math.floor(r() * 5)]; ctx.globalAlpha = 0.45 + 0.3 * Math.sin(lt * 6 * crowdK + x * 0.3 + row); ctx.fillRect(x, y + 6 + Math.sin(lt * 9 * crowdK + x) * 3 * crowdK, 8, 9); } }
  ctx.globalAlpha = 1;
  const fr = rng(Math.floor(lt * 8)); for (let i = 0; i < 30 * flashes; i++) { const x = fr() * W, y = horizon - 380 + fr() * 380; light(ctx, x, y, 26, "rgba(255,255,255,1)", 0.9); }
  ctx.fillStyle = "#0a0a14"; ctx.fillRect(-100, horizon - 20, W + 200, 30);
}
function pitch(ctx, horizon = 900) {
  for (let i = 0; i < 12; i++) { const y0 = horizon + (H - horizon) * Math.pow(i / 12, 1.6), y1 = horizon + (H - horizon) * Math.pow((i + 1) / 12, 1.6); ctx.fillStyle = i % 2 ? "#1f6a32" : "#247a3a"; ctx.fillRect(-100, y0, W + 200, y1 - y0 + 1); }
  light(ctx, 540, horizon + 300, 900, "rgba(220,255,220,.3)", 0.35);
}
function goal(ctx, x, y, w, h, { bulge = 0, bx = 0, by = 0 } = {}) {
  ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 2;
  for (let i = 0; i <= 24; i++) { const gx = x + (w * i) / 24; ctx.beginPath(); ctx.moveTo(gx, y); ctx.quadraticCurveTo(gx + (bulge && Math.abs(gx - bx) < 160 ? 0 : 0), y + h / 2, gx, y + h); ctx.stroke(); }
  for (let j = 0; j <= 10; j++) { const gy = y + (h * j) / 10; ctx.beginPath(); ctx.moveTo(x, gy); for (let i = 0; i <= 24; i++) { const gx = x + (w * i) / 24, d = Math.hypot(gx - bx, gy - by), push = bulge * Math.max(0, 1 - d / 180) * 50; ctx.lineTo(gx, gy - push * 0.4); } ctx.stroke(); }
  ctx.strokeStyle = "#f4f4f8"; ctx.lineWidth = Math.max(6, w * 0.018); ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.stroke();
}
function ball(ctx, x, y, r, lt, spin = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(lt * 6 * spin);
  ctx.fillStyle = "#f8f8fc"; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.fillStyle = "#1a1a22"; for (let i = 0; i < 5; i++) { const a = i * TAU / 5; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.2, 0, TAU); ctx.fill(); } ctx.beginPath(); ctx.arc(0, 0, r * 0.24, 0, TAU); ctx.fill();
  ctx.restore();
}
function trail(ctx, pts, col = "rgba(255,255,255,.5)") { ctx.strokeStyle = col; ctx.lineCap = "round"; for (let i = 1; i < pts.length; i++) { ctx.lineWidth = (i / pts.length) * 22; ctx.globalAlpha = i / pts.length * 0.6; ctx.beginPath(); ctx.moveTo(...pts[i - 1]); ctx.lineTo(...pts[i]); ctx.stroke(); } ctx.globalAlpha = 1; }
function bigWord(ctx, lt, t0, text, col = "#ffd23d", y = 760) {
  if (t0 == null || lt < t0) return; const k = lt - t0, s = easeOut(Math.min(1, k * 5)) * (1 + Math.sin(k * 8) * 0.03);
  ctx.save(); ctx.translate(540, y); ctx.rotate(-0.06); ctx.scale(s, s); ctx.font = "400 190px 'Luckiest Guy', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round"; ctx.lineWidth = 34; ctx.strokeStyle = "#0b0d1a"; ctx.strokeText(text, 0, 0); ctx.fillStyle = col; ctx.fillText(text, 0, 0); ctx.restore();
}

// ================================================================ the scenes
const SC = {
  // ---------- Hyperlane
  "hl-side"(ctx, lt) {
    skyline(ctx, lt, { sky: "rain" }); skyRoad(ctx, lt, { speed: 1.4 }); speedLines(ctx, lt, 1);
    const jolt = Math.sin(lt * 23) * 6;
    hoverCar(ctx, 720 + Math.sin(lt * 1.3) * 20, 1360, 1.05, { body: "#7a2aff", trim: "#1a0a3a", boost: 3, lt, tilt: -0.04 });   // Vex
    hoverCar(ctx, 380 + jolt, 1500, 1.25, { boost: 2, lt, tilt: 0.05 });   // Jay
    sparks(ctx, 560, 1440, lt, 26, 3, 1.4);
    rain(ctx, lt, 0.7);
  },
  "hl-grid"(ctx, lt) {
    skyline(ctx, lt, { sky: "rain" });
    const go = lt >= ev3("hl-grid", "go")[0], mv = go ? (lt - 3.3) * 0.6 : 0;
    skyRoad(ctx, lt * (go ? 0.6 : 0), { speed: go ? 1 : 0, gates: false });
    [[360, 1080, 0.55, "#2aff9a"], [720, 1080, 0.55, "#ffd23d"], [300, 1240, 0.75, "#3d8cff"], [780, 1240, 0.75, "#ff3d6e"], [740, 1450, 1.0, "#7a2aff"]].forEach(([x, y, s, c]) => hoverCar(ctx, x, y - mv * 200 * s, s, { body: c, trim: "#140c22", boost: go ? 1 : 0, lt, ribbon: go }));
    hoverCar(ctx, 340, 1520 - mv * 120, 1.15, { boost: go ? 1 : 0, lt, ribbon: go });   // Jay, last on the grid
    const lit = ev3("hl-grid", "lights").filter((x) => lt >= x).length;   // the start lights
    ctx.fillStyle = "#08060e"; roundRect(ctx, 190, 380, 700, 140, 30); ctx.fill();
    for (let i = 0; i < 5; i++) { const on = !go && i < lit; ctx.fillStyle = go ? "#2aff6a" : on ? "#ff2a3a" : "#2a1a1e"; ctx.beginPath(); ctx.arc(260 + i * 140, 450, 46, 0, TAU); ctx.fill(); if (on || go) light(ctx, 260 + i * 140, 450, 140, go ? "rgba(60,255,120,.8)" : "rgba(255,40,60,.8)", 0.6); }
    rain(ctx, lt, 0.8);
  },
  "hl-drift"(ctx, lt) {
    skyline(ctx, lt, { sky: "rain" }); skyRoad(ctx, lt, { speed: 1.2, curve: -0.9 }); speedLines(ctx, lt, 0.6);
    const lvl = 1 + Math.min(2, Math.floor(lt / 2.2)), tilt = -0.32 + Math.sin(lt * 2) * 0.05;
    for (let i = 0; i < 14; i++) { const r = rng(Math.floor(lt * 24) + i); ctx.fillStyle = BOOST[lvl]; ctx.globalAlpha = 0.8; ctx.fillRect(280 + r() * 120 - 60, 1600 + r() * 160, 8 + r() * 20, 6); ctx.fillRect(640 + r() * 120, 1560 + r() * 160, 8 + r() * 20, 6); }
    ctx.globalAlpha = 1;
    hoverCar(ctx, 500, 1480, 1.3, { boost: lvl, lt, tilt });
    rain(ctx, lt, 0.6);
    hudText(ctx, ["", "BLUE BOOST", "ORANGE BOOST", "PURPLE BOOST"][lvl], 540, 1120, 64, BOOST[lvl], "center");
  },
  "hl-aurora"(ctx, lt) {
    skyline(ctx, lt, { sky: "aurora" }); skyRoad(ctx, lt, { speed: 1.5, col1: "#3dffb0", col2: "#a24aff" }); speedLines(ctx, lt, 0.8, "rgba(200,255,240,.5)");
    hoverCar(ctx, 860, 1180, 0.6, { body: "#7a2aff", trim: "#1a0a3a", boost: 2, lt });
    hoverCar(ctx, 500, 1490, 1.25, { boost: 3, lt, tilt: Math.sin(lt * 1.5) * 0.06 });
    const r = rng(2); ctx.fillStyle = "#fff"; for (let i = 0; i < 60; i++) { ctx.globalAlpha = 0.6; ctx.fillRect(r() * W, ((r() * H + lt * 500) % H), 3, 3); } ctx.globalAlpha = 1;   // snow
  },
  "hl-block"(ctx, lt, o) {
    skyline(ctx, lt, { sky: "sunset" }); skyRoad(ctx, lt, { speed: 1.4, col1: "#ffd23d", col2: "#ff6b3d" }); speedLines(ctx, lt, 1);
    const k = easeInOut(clamp((lt - 0.6) / 1.2)), hit = o.figT != null && lt > o.figT;
    hoverCar(ctx, lerp(760, 470, k), 1300, 0.95, { body: "#7a2aff", trim: "#1a0a3a", boost: 3, lt, tilt: -0.18 * (1 - k) });
    hoverCar(ctx, hit ? 300 + Math.sin(lt * 40) * 12 : lerp(520, 330, k), 1520, 1.25, { boost: 2, lt, tilt: hit ? 0.22 : 0.1 });
    if (hit) { sparks(ctx, 120, 1500, lt, 40, 9, 1.6); ctx.fillStyle = `rgba(255,40,60,${0.25 * Math.max(0, 1 - (lt - o.figT) * 1.5)})`; ctx.fillRect(-100, -100, W + 200, H + 200); }
  },
  "hl-slip"(ctx, lt, o) {
    skyline(ctx, lt, { sky: "sunset" });
    const od = o.figT != null && lt > o.figT, k = od ? easeOut(clamp((lt - o.figT) / 1.8)) : 0;
    skyRoad(ctx, lt, { speed: od ? 3 : 1.6, col1: "#ffd23d", col2: "#ff6b3d", pads: true }); speedLines(ctx, lt, od ? 2.5 : 1.2, od ? "rgba(255,61,240,.7)" : "rgba(255,255,255,.5)");
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "rgba(200,230,255,.35)"; ctx.lineWidth = 4; for (let i = 0; i < 10; i++) { const x = 400 + i * 30, y0 = 1500 - ((lt * 1400 + i * 120) % 600); ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + (i - 5) * 8, y0 - 160); ctx.stroke(); } ctx.restore();   // slipstream
    hoverCar(ctx, 540 + lerp(0, 110, k), lerp(1230, 1300, k), lerp(0.95, 0.9, k), { body: "#7a2aff", trim: "#1a0a3a", boost: 3, lt });
    hoverCar(ctx, 540 - lerp(0, 230, k), lerp(1560, 1340, k), lerp(1.2, 0.95, k), { boost: od ? 4 : 2, lt });
    if (od) { light(ctx, 540, 1100, 1100, "rgba(255,61,240,.7)", 0.5 * (1 - k * 0.6)); if (lt - o.figT < 0.25) { ctx.fillStyle = `rgba(255,220,255,${0.7 * (1 - (lt - o.figT) / 0.25)})`; ctx.fillRect(-100, -100, W + 200, H + 200); } hudText(ctx, "OVERDRIVE", 540, 1050, 110, "#ff3df0", "center"); }
  },
  "hl-finish"(ctx, lt, o) {
    skyline(ctx, lt, { sky: "rain" });
    const slow = o.figT != null ? Math.max(0.05, 1 - clamp((lt - o.figT + 1) / 1.5)) : 1;
    skyRoad(ctx, lt * slow, { speed: 1.2 * slow, gates: false });
    const k = clamp(lt / Math.max(2, (o.figT ?? 3)));
    ctx.fillStyle = "#14101e"; ctx.fillRect(130, 520, 40, 700); ctx.fillRect(910, 520, 40, 700);   // finish arch
    for (let i = 0; i < 18; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? "#fff" : "#111"; ctx.fillRect(130 + i * 45.5, 520 + j * 40, 45.5, 40); }
    light(ctx, 540, 560, 600, "rgba(255,255,255,.5)", 0.4);
    hoverCar(ctx, 400, lerp(1500, 1290, k), lerp(1.2, 0.95, k), { boost: 4, lt });
    hoverCar(ctx, 700, lerp(1480, 1285, k), lerp(1.15, 0.95, k), { body: "#7a2aff", trim: "#1a0a3a", boost: 3, lt });
    rain(ctx, lt * slow, 0.6);
    if (o.figT != null && lt > o.figT) { ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(-100, -100, W + 200, H + 200); hudText(ctx, "PHOTO FINISH", 540, 980, 96, "#fff", "center"); }
  },
  "hl-result"(ctx, lt) {
    ctx.fillStyle = "#0a0816"; ctx.fillRect(-100, -100, W + 200, H + 200); fireworks(ctx, lt, 7, 5);
    ctx.save(); ctx.translate(0, 300); ctx.fillStyle = "#1a1430"; ctx.fillRect(40, 520, 1000, 640); ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.strokeRect(40, 520, 1000, 640);
    ctx.save(); ctx.beginPath(); ctx.rect(40, 520, 1000, 640); ctx.clip();   // the photo: two noses at the line
    ctx.fillStyle = "#ff8a3d"; poly(ctx, [[40, 720], [574, 700], [614, 760], [574, 820], [40, 800]], "#ff8a3d");
    poly(ctx, [[40, 900], [566, 880], [606, 940], [566, 1000], [40, 980]], "#7a2aff");
    ctx.restore();
    ctx.strokeStyle = "#ff2a3a"; ctx.lineWidth = 8; ctx.setLineDash([24, 14]); ctx.beginPath(); ctx.moveTo(610, 520); ctx.lineTo(610, 1160); ctx.stroke(); ctx.setLineDash([]);
    hudText(ctx, "+0.003s", 760, 600, 60, "#ffd23d", "center");
    ctx.restore();
    bigWord(ctx, lt, 0.9, "P1!", "#ffd23d", 560);
  },
  // ---------- Getaway Heat
  "gh-heli"(ctx, lt) {
    zoomAt(ctx, 540, 1150, 1.45);   // close on Jay's car
    cityTop(ctx, lt, { speed: 1 });
    const jx = 540 + Math.sin(lt * 1.6) * 90;
    [[440, 1500], [640, 1620], [540, 1820]].forEach(([x, y], i) => carTop(ctx, x + Math.sin(lt * 1.6 - 0.6 - i * 0.3) * 80, y, 1.1, { police: true, lt: lt + i * 0.1 }));
    carTop(ctx, jx, 1100, 1.15, { lt });
    spotlight(ctx, jx + Math.sin(lt * 2.3) * 30, 1100 + Math.cos(lt * 1.7) * 30, 220);
    heliTop(ctx, 760, 520, 0.9, lt);
  },
  "gh-street"(ctx, lt, o) {
    zoomAt(ctx, 540, 1150, 1.45);   // close on Jay's car
    cityTop(ctx, lt, { speed: 1 });
    const t0 = o.figT ?? 3, k = clamp(lt / t0), crashed = lt > t0;
    const jx = crashed ? lerp(540, 620, clamp((lt - t0) * 2)) : 540 - Math.sin(k * Math.PI) * 40;
    carTop(ctx, jx, 1050, 1.15, { lt });
    if (!crashed) { carTop(ctx, lerp(380, 520, easeInOut(k)), lerp(1400, 1160, k), 1.1, { police: true, lt, rot: 0.25 * k }); carTop(ctx, lerp(700, 560, easeInOut(k)), lerp(1420, 1170, k), 1.1, { police: true, lt: lt + 0.2, rot: -0.25 * k }); }
    else { const d = lt - t0; carTop(ctx, 500 - d * 60, 1220 + d * 500, 1.1, { police: true, lt, rot: 0.9 + d * 2 }); carTop(ctx, 590 + d * 50, 1240 + d * 520, 1.1, { police: true, lt, rot: -1.1 - d * 2 }); boom(ctx, 545, 1230 + d * 500, d / 1.2, 0.7); }
    comboBurst(ctx, lt, crashed ? t0 : null, "COMBO x2!");
  },
  "gh-swat"(ctx, lt, o) {
    zoomAt(ctx, 540, 1150, 1.45);   // close on Jay's car
    cityTop(ctx, lt, { speed: 1 });
    const t0 = o.figT ?? 2.5, k = easeInOut(clamp((lt - 0.4) / Math.max(0.5, t0 - 0.4)));
    carTop(ctx, 470 - (lt > t0 ? Math.sin(lt * 40) * 10 : 0), 1120, 1.15, { lt });
    carTop(ctx, lerp(1250, 700, k), lerp(900, 1060, k), 1.25, { swat: true, lt, rot: -1.2 + k * 0.6 });
    carTop(ctx, 560, 1640, 1.25, { swat: true, lt: lt + 0.3 });
    if (lt > t0) sparks(ctx, 560, 1100, lt, 30, 4, 1.5);
  },
  "gh-alley"(ctx, lt) {
    zoomAt(ctx, 540, 1150, 1.45);   // close on Jay's car
    cityTop(ctx, lt, { speed: 1.2, narrow: 1 });
    carTop(ctx, 540 + Math.sin(lt * 5) * 6, 1120, 1.15, { lt });
    sparks(ctx, 495, 1120, lt, 14, 6, 0.8); sparks(ctx, 585, 1150, lt, 14, 8, 0.8);
    [[470, 1700], [600, 1740]].forEach(([x, y], i) => carTop(ctx, x, y, 1.25, { swat: true, lt: lt + i * 0.2, rot: i ? 0.5 : -0.4 }));   // stuck at the entrance
  },
  "gh-tank"(ctx, lt, o) {
    zoomAt(ctx, 540, 1150, 1.45);   // close on Jay's car
    cityTop(ctx, lt, { speed: 0.9, narrow: 1 });
    const aim = Math.PI - 0.6 + clamp(lt / 2.5) * 0.6;   // the turret swings round to face Jay
    ctx.fillStyle = "#1a1824"; ctx.fillRect(-100, 420, W + 200, 480);   // the cross street beyond the alley
    light(ctx, 540, 640, 420, "rgba(255,200,120,.35)", 0.4);
    tankTop(ctx, 540, 650, 1.1, aim - Math.PI, lt);
    carTop(ctx, 540, 1250, 1.15, { lt });
    if (o.figT != null && lt > o.figT && lt < o.figT + 0.2) { ctx.fillStyle = "rgba(255,240,200,.85)"; ctx.fillRect(-100, -100, W + 200, H + 200); }
  },
  "gh-jump"(ctx, lt, o) {
    zoomAt(ctx, 540, 1150, 1.45);   // close on Jay's car
    cityTop(ctx, lt, { speed: 1.2 });
    const t0 = o.figT ?? 2;
    tankTop(ctx, 540, 600 + lt * 60, 1.1, 0, lt);
    const sx = 540, sy = lerp(840, 1900, clamp((lt - 0.8) / 0.9));   // the shell flies over Jay
    carTop(ctx, 540 + Math.sin(clamp((lt - 0.5) / 1) * Math.PI) * -50, 1080, 1.15, { lt });
    if (lt > 0.8 && lt < 1.7) { trail(ctx, [[sx, sy - 300], [sx, sy - 150], [sx, sy]], "rgba(255,220,150,.8)"); ctx.fillStyle = "#ffe8a0"; ctx.beginPath(); ctx.arc(sx, sy, 16, 0, TAU); ctx.fill(); }
    [[420, 1650], [660, 1700], [540, 1850]].forEach(([x, y], i) => { if (lt < t0) carTop(ctx, x, y, 1.1, { police: true, lt: lt + i * 0.2 }); });
    boom(ctx, 540, 1720, (lt - t0) / 1.4, 1.8);
    comboBurst(ctx, lt, t0, "COMBO x12!");
  },
  "gh-escape"(ctx, lt, o) {
    zoomAt(ctx, 540, 1150, 1.45);   // close on Jay's car
    cityTop(ctx, lt, { speed: 0.9, map: "palm" });
    ctx.fillStyle = "rgba(255,170,90,.18)"; ctx.fillRect(-100, -100, W + 200, H + 200);
    carTop(ctx, 540, 1150, 1.15, { lt });
    if (o.figT != null && lt > o.figT) { const k = clamp((lt - o.figT) / 1.2); ctx.fillStyle = `rgba(0,0,0,${0.35 * k})`; ctx.beginPath(); ctx.ellipse(lerp(1300, 620, easeOut(k)), lerp(400, 900, k), 160, 90, 0.4, 0, TAU); ctx.fill(); spotlight(ctx, 540 + Math.sin(lt * 3) * 20, 1150, 220 * k); }
  },
  // ---------- Penalty Shootout
  "ps-stadium"(ctx, lt) {
    stadium(ctx, lt, { horizon: 980, crowdK: 1, flashes: 0.5 }); pitch(ctx, 980);
    ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 5; poly(ctx, [[300, 1180], [780, 1180], [880, 1420], [200, 1420]], "rgba(0,0,0,0)"); ctx.beginPath(); ctx.moveTo(300, 1180); ctx.lineTo(780, 1180); ctx.lineTo(880, 1420); ctx.lineTo(200, 1420); ctx.closePath(); ctx.stroke();
    goal(ctx, 420, 1060, 240, 120); ball(ctx, 540, 1340, 14, 0);
    drawJay(ctx, 520, 1420, 160, { view: "back", pose: "stand", palette: KIT, number: 10, light: 0.95, t: lt });
    ctx.fillStyle = "#08080e"; roundRect(ctx, 300, 380, 480, 130, 24); ctx.fill(); ctx.strokeStyle = "#ffd23d"; ctx.lineWidth = 5; roundRect(ctx, 300, 380, 480, 130, 24); ctx.stroke();
    hudText(ctx, "4  -  4", 540, 447, 84, "#ffd23d", "center");
  },
  "ps-walk"(ctx, lt, o) {
    const k = clamp(lt / Math.max(3, o.dur || 5));
    stadium(ctx, lt, { horizon: 820, crowdK: 0.3, flashes: 0.8 }); pitch(ctx, 820);
    goal(ctx, 290, 700, 500, 230); drawJay(ctx, 540, 930, 220, { view: "front", pose: "stand", palette: KEEPER, light: 0.9, t: lt });
    ball(ctx, 540, 1180, 22, 0);
    drawJay(ctx, 540 + Math.sin(lt * 3) * 6, lerp(2050, 1560, k), lerp(760, 560, k), { view: "back", pose: "walk", phase: lt * 5, palette: KIT, number: 10, light: 0.95, t: lt });
  },
  "ps-keeper-jay"(ctx, lt) {
    stadium(ctx, lt, { horizon: 700, crowdK: 1.2, flashes: 0.4 }); pitch(ctx, 700);
    goal(ctx, 140, 640, 800, 380); drawJay(ctx, 540 + Math.sin(lt * 4) * 60, 1030, 360, { view: "front", pose: "stand", palette: { ...KIT, hood: "#c6ff3d", hoodD: "#8fbf1f" }, light: 0.95, t: lt, scared: true });
    ball(ctx, 540, 1360, 34, 0);
    const k = clamp((lt - 0.8) / 3); drawJay(ctx, lerp(300, 470, k), lerp(1950, 1580, k), lerp(820, 700, k), { view: "back", pose: k < 1 ? "run" : "stand", phase: lt * 9, palette: STRIKER, number: 9, light: 0.95, t: lt });
  },
  "ps-dive"(ctx, lt) {
    stadium(ctx, lt * 0.15, { horizon: 520, crowdK: 0.2, flashes: 0 }); pitch(ctx, 520);
    goal(ctx, 40, 470, 1000, 560);
    const k = clamp(lt / 6);
    ctx.save(); ctx.translate(lerp(560, 700, k), lerp(900, 760, k)); ctx.rotate(-1.25); drawJay(ctx, 0, 220, 460, { view: "front", pose: "wave", palette: { ...KIT, hood: "#c6ff3d", hoodD: "#8fbf1f" }, light: 0.95, t: 0, scared: true }); ctx.restore();
    const bx = lerp(1060, 900, k), by = lerp(560, 600, k); trail(ctx, [[bx + 260, by + 260], [bx + 140, by + 120], [bx, by]]); ball(ctx, bx, by, 44, lt * 0.15);
    ctx.fillStyle = "rgba(10,20,40,.18)"; ctx.fillRect(-100, -100, W + 200, H + 200);
  },
  "ps-dive-result"(ctx, lt, o) {
    stadium(ctx, lt, { horizon: 520, crowdK: 2, flashes: 1 }); pitch(ctx, 520);
    goal(ctx, 40, 470, 1000, 560);
    ctx.save(); ctx.translate(760, 780); ctx.rotate(-1.35); drawJay(ctx, 0, 220, 460, { view: "front", pose: "wave", palette: { ...KIT, hood: "#c6ff3d", hoodD: "#8fbf1f" }, light: 0.95, t: 0 }); ctx.restore();
    const k = clamp(lt / 0.8), bx = lerp(990, 1200, k), by = lerp(500, 260, easeOut(k)); ball(ctx, bx, by, 42, lt * 2);
    if (lt < 0.4) light(ctx, 1030, 480, 260, "rgba(255,255,255,.9)", 1 - lt / 0.4);
    bigWord(ctx, lt, 0.3, "SAVED!", "#c6ff3d", 1200);
  },
  "ps-spot"(ctx, lt) {
    stadium(ctx, lt, { horizon: 640, crowdK: 0.3, flashes: 0.6 }); pitch(ctx, 640);
    goal(ctx, 110, 600, 860, 420);
    drawJay(ctx, 540 + Math.sin(lt * 3.2) * 110, 1010, 380, { view: "front", pose: "stand", palette: KEEPER, light: 0.95, t: lt });
    ball(ctx, 540, 1640, 110, 0);
    const arcs = [["left", 0.9, [200, 760], "#ff3d5e"], ["high", 2.4, [600, 400], "#ff3d5e"], ["chip", 3.9, [560, 740], "#c6ff3d"]];
    arcs.forEach(([kind, t0, [ex, ey], col], i) => {
      if (lt < t0) return; const k = clamp((lt - t0) / 0.7), fade = i < 2 ? clamp(1 - (lt - t0 - 1.2) / 0.3) : 1;
      if (fade <= 0) return; ctx.globalAlpha = fade; ctx.strokeStyle = col; ctx.lineWidth = 10; ctx.setLineDash([18, 16]); ctx.beginPath();
      const cx = kind === "chip" ? 540 : (540 + ex) / 2, cy = kind === "chip" ? 300 : (1560 + ey) / 2 - 80;
      for (let s = 0; s <= k; s += 0.02) { const x = (1 - s) * (1 - s) * 540 + 2 * (1 - s) * s * cx + s * s * ex, y = (1 - s) * (1 - s) * 1540 + 2 * (1 - s) * s * cy + s * s * ey; s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.setLineDash([]);
      if (k >= 1 && i < 2) hudText(ctx, "✕", ex, ey, 110, col, "center");
      if (k >= 1 && i === 2) hudText(ctx, "CHIP?", ex, ey - 120, 80, col, "center");
      ctx.globalAlpha = 1;
    });
  },
  "ps-chip"(ctx, lt) {
    stadium(ctx, lt * 0.2, { horizon: 640, crowdK: 0.1, flashes: 0 }); pitch(ctx, 640);
    goal(ctx, 110, 600, 860, 420);
    const k = clamp(lt / 5.5);
    ctx.save(); ctx.translate(lerp(520, 300, easeOut(k)), lerp(880, 940, k)); ctx.rotate(lerp(0, -1.2, easeOut(k))); drawJay(ctx, 0, 130, 380, { view: "front", pose: "wave", palette: KEEPER, light: 0.95, t: 0 }); ctx.restore();
    const s = k, bx = 540, by = (1 - s) * (1 - s) * 1500 + 2 * (1 - s) * s * 300 + s * s * 780, br = lerp(90, 34, s);
    const pts = []; for (let j = 0; j <= 8; j++) { const ss = Math.max(0, s - j * 0.03); pts.unshift([540, (1 - ss) * (1 - ss) * 1500 + 2 * (1 - ss) * ss * 300 + ss * ss * 780]); } trail(ctx, pts);
    ball(ctx, bx, by, br, lt * 0.3);
    ctx.fillStyle = "rgba(10,20,40,.15)"; ctx.fillRect(-100, -100, W + 200, H + 200); hudText(ctx, "SLOW-MO", 60, 380, 44, "#fff");
  },
  "ps-net"(ctx, lt) {
    const g = ev3("ps-net", "goal")[0], scored = lt > g;
    stadium(ctx, lt, { horizon: 640, crowdK: scored ? 3 : 0.1, flashes: scored ? 2 : 0 }); pitch(ctx, 640);
    const k = clamp(lt / g), by = lerp(560, 840, easeInOut(k));
    goal(ctx, 110, 600, 860, 420, { bulge: scored ? Math.max(0, 1 - (lt - g) * 1.5) : 0, bx: 540, by: 820 });
    ctx.save(); ctx.translate(300, 950); ctx.rotate(-1.3); drawJay(ctx, 0, 130, 380, { view: "front", pose: "wave", palette: KEEPER, light: 0.95, t: 0 }); ctx.restore();
    ball(ctx, 540, by, 34, lt);
    if (scored) { fireworks(ctx, lt, 8, 11); const r = rng(Math.floor(lt * 10)); for (let i = 0; i < 80; i++) { ctx.fillStyle = ["#ff8a3d", "#ffd23d", "#fff", "#c6ff3d"][i % 4]; ctx.fillRect(r() * W, ((r() * H + (lt - g) * 600) % H), 10, 16); } }
    bigWord(ctx, lt, g, "GOAL!", "#ffd23d", 1250);
  },
};
const EVS = EVENTS3;
function ev3(id, k) { return EVS[id][k]; }

const ov = (fn) => ({ overlay: fn });
const hlStyle = (id) => ({ overlay: (ctx, lt, o) => hlHud(ctx, lt, { ...o, id }) });
const ghStyle = (id) => ({ overlay: (ctx, lt, o) => ghHud(ctx, lt, { ...o, id }), grade: "none" });
registerScenes(SC, {
  ...Object.fromEntries(["hl-side", "hl-grid", "hl-drift", "hl-aurora", "hl-block", "hl-slip", "hl-finish"].map((id) => [id, hlStyle(id)])),
  "hl-result": { grade: "none" },
  ...Object.fromEntries(["gh-heli", "gh-street", "gh-swat", "gh-alley", "gh-tank", "gh-jump", "gh-escape"].map((id) => [id, ghStyle(id)])),
  ...Object.fromEntries(["ps-stadium", "ps-walk", "ps-keeper-jay", "ps-dive", "ps-dive-result", "ps-spot", "ps-chip", "ps-net"].map((id) => [id, { grade: "none" }])),
});
void ov;

export const NEW_SCENES_3 = [
  ["hl-side", "Hyperlane: wheel to wheel at 400 km/h"], ["hl-grid", "Hyperlane: starting grid, lights out"], ["hl-drift", "Hyperlane: drifting, charging boosts"],
  ["hl-aurora", "Hyperlane: ice valley under the aurora"], ["hl-block", "Hyperlane: blocked into the wall (figure: impact)"], ["hl-slip", "Hyperlane: slipstream, then Overdrive (figure)"],
  ["hl-finish", "Hyperlane: finish line (figure: photo finish)"], ["hl-result", "Hyperlane: photo finish result"],
  ["gh-heli", "Getaway Heat: helicopter spotlight"], ["gh-street", "Getaway Heat: cops crash into each other (figure)"], ["gh-swat", "Getaway Heat: SWAT truck rams in (figure)"],
  ["gh-alley", "Getaway Heat: squeezing through an alley"], ["gh-tank", "Getaway Heat: a tank at the alley exit (figure: fires)"], ["gh-jump", "Getaway Heat: the shell flies over (figure: boom)"],
  ["gh-escape", "Getaway Heat: sunrise escape (figure: helicopter returns)"],
  ["ps-stadium", "Penalty Shootout: the final, 4-4"], ["ps-walk", "Penalty Shootout: walking to the spot"], ["ps-keeper-jay", "Penalty Shootout: Jay in goal"],
  ["ps-dive", "Penalty Shootout: the dive (slow-mo)"], ["ps-dive-result", "Penalty Shootout: saved off the post"], ["ps-spot", "Penalty Shootout: from the spot, picking the shot"],
  ["ps-chip", "Penalty Shootout: the chip (slow-mo)"], ["ps-net", "Penalty Shootout: GOAL"],
].map(([id, label]) => ({ id, label }));
