// Scenes for Safecracker (the Impossible Vault) and Deep Signal (sonar horror), plus an end card that
// shows any featured game on Pulsebox, on a computer.
import { rng, roundRect, clamp, lerp, easeInOut, easeOut } from "./util.js";
import { poly, lin, light, shade, registerScenes, logoMark } from "./scenes.js";
import { drawJay } from "./scenes2.js";

const W = 1080, H = 1920, TAU = Math.PI * 2;
export const EVENTS4 = {
  "sc-dial": { clicks: [0.9, 1.25, 1.6, 1.95, 2.3, 2.65, 3.0, 3.35, 3.7, 4.05] },
  "sc-keypad": { flashes: [0.9, 1.5, 2.1, 2.7, 3.3] },
  "ds-black": { pings: [0.7, 3.2] }, "ds-part": { pings: [0.6] }, "ds-lurkers": { pings: [0.6, 2.8] },
};
const hud = (ctx, text, x, y, px, col = "#fff", align = "left") => { ctx.font = `700 ${px}px 'Chakra Petch', Inter, sans-serif`; ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.lineWidth = px * 0.18; ctx.strokeStyle = "rgba(0,0,0,.75)"; ctx.strokeText(text, x, y); ctx.fillStyle = col; ctx.fillText(text, x, y); };

// ================================================================ SAFECRACKER
const SAFE = { hood: "#22232c", hoodD: "#14151c", jeans: "#1a1b22", jeansD: "#101116" };   // dressed for the job: black hoodie
function marble(ctx, red = 0) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#14161e"], [1, "#08090e"]]); ctx.fillRect(-100, -100, W + 200, H + 200);
  ctx.strokeStyle = "rgba(255,255,255,.04)"; ctx.lineWidth = 3; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(-100, 200 + i * 220); ctx.bezierCurveTo(300, 150 + i * 230, 700, 300 + i * 200, W + 100, 220 + i * 220); ctx.stroke(); }
  ctx.fillStyle = "#1c1e28"; ctx.fillRect(-100, 1560, W + 200, 500);
  if (red) { ctx.fillStyle = `rgba(255,20,40,${0.18 * red})`; ctx.fillRect(-100, -100, W + 200, H + 200); }
}
function vaultDoor(ctx, cx, cy, r, { open = 0, lt = 0 } = {}) {
  ctx.fillStyle = "#0a0b10"; ctx.beginPath(); ctx.arc(cx, cy, r + 40, 0, TAU); ctx.fill();
  if (open > 0) { ctx.fillStyle = lin(ctx, 0, cy - r, 0, cy + r, [[0, "#fff2b0"], [1, "#ffb84a"]]); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); light(ctx, cx, cy, r * 2.4, "rgba(255,210,110,.9)", 0.8 * open); }
  ctx.save(); ctx.translate(cx - open * r * 1.15, cy); ctx.scale(lerp(1, 0.3, open), 1);   // the door swings toward us
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r); g.addColorStop(0, "#a8aeb8"); g.addColorStop(1, "#4a505a");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#2a2e36"; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, TAU); ctx.stroke();
  for (let i = 0; i < 16; i++) { const a = i * TAU / 16; ctx.fillStyle = "#2a2e36"; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.91, Math.sin(a) * r * 0.91, 16, 0, TAU); ctx.fill(); }
  ctx.save(); ctx.rotate(lt * 0.2 * open); ctx.strokeStyle = "#c8ccd4"; ctx.lineWidth = 22; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * TAU / 3) * r * 0.42, Math.sin(i * TAU / 3) * r * 0.42); ctx.stroke(); } ctx.restore();
  ctx.fillStyle = "#2a2e36"; ctx.beginPath(); ctx.arc(0, 0, 50, 0, TAU); ctx.fill();
  hud(ctx, "IMPOSSIBLE", 0, -r * 0.62, 40, "#ffd23d", "center");
  ctx.restore();
}
const ALARM = { "sc-vault": [0.4, 0.4], "sc-dial": [0.42, 0.45], "sc-drill": [0.48, 0.7], "sc-keypad": [0.7, 0.72], "sc-alarm": [0.72, 0.92], "sc-charge": [0.92, 0.97], "sc-open": [0.97, 0.97] };
const CLOCK = { "sc-vault": 299, "sc-dial": 262, "sc-drill": 198, "sc-keypad": 121, "sc-alarm": 74, "sc-charge": 21, "sc-open": 0 };
function scHud(ctx, lt, o) {
  const [a0, a1] = ALARM[o.id] || [0.5, 0.5], k = clamp(lt / Math.max(1, (o.dur || 5) - 0.5)), al = lerp(a0, a1, o.id === "sc-alarm" && o.figT != null ? clamp((lt - o.figT + 0.3) / 0.4) : k);
  ctx.fillStyle = "rgba(0,0,0,.6)"; roundRect(ctx, 60, H - 230, 960, 60, 30); ctx.fill();
  ctx.fillStyle = al > 0.85 ? (Math.sin(lt * 14) > 0 ? "#ff2a3a" : "#ff8a3d") : al > 0.6 ? "#ff8a3d" : "#ffd23d"; roundRect(ctx, 66, H - 224, 948 * al, 48, 24); ctx.fill();
  hud(ctx, `ALARM ${Math.round(al * 100)}%`, 540, H - 270, 40, al > 0.85 ? "#ff5a6a" : "#fff", "center");
  const secs = Math.max(0, (CLOCK[o.id] ?? 60) - lt * (o.id === "sc-charge" ? 1 : 1)), mm = Math.floor(secs / 60), ss = Math.floor(secs % 60);
  hud(ctx, `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`, W - 60, 380, 72, secs < 30 ? (Math.sin(lt * 10) > 0 ? "#ff3d4f" : "#fff") : "#fff", "right");
}

// ================================================================ DEEP SIGNAL
// a cave defined by its two walls; only what a sonar ping has just touched is visible
const SUB = [540, 1000];
function caveWalls(seed, { width = 900, wiggle = 160 } = {}) {
  const r = rng(seed), top = [], bot = [];
  for (let x = -200; x <= W + 200; x += 40) { top.push([x, 1000 - width / 2 + Math.sin(x * 0.01 + seed) * wiggle * 0.5 + (r() - 0.5) * 60]); bot.push([x, 1000 + width / 2 + Math.sin(x * 0.008 + seed * 2) * wiggle * 0.5 + (r() - 0.5) * 60]); }
  const rocks = []; for (let i = 0; i < 18; i++) rocks.push([r() * W, 1000 + (r() - 0.5) * width * 0.8, 10 + r() * 24]);
  return { top, bot, rocks };
}
function pingAlpha(p, lt, pings, speed = 950) {
  let a = 0; const d = Math.hypot(p[0] - SUB[0], p[1] - SUB[1]);
  for (const tp of pings) { if (lt < tp) continue; const age = (lt - tp) - d / speed; if (age >= 0) a = Math.max(a, Math.exp(-age * 1.1)); }
  return a;
}
function drawSonar(ctx, lt, pings, cave, extra = null) {
  ctx.fillStyle = "#000206"; ctx.fillRect(-100, -100, W + 200, H + 200);
  for (const tp of pings) { if (lt < tp) continue; const rad = (lt - tp) * 950, a = Math.max(0, 1 - (lt - tp) / 2.2); if (a <= 0) continue; ctx.strokeStyle = `rgba(80,230,255,${0.6 * a})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(SUB[0], SUB[1], rad, 0, TAU); ctx.stroke(); }
  for (const wall of [cave.top, cave.bot]) for (let i = 1; i < wall.length; i++) {
    const a = pingAlpha(wall[i], lt, pings); if (a < 0.02) continue;
    ctx.strokeStyle = `rgba(90,235,255,${a})`; ctx.lineWidth = 5; ctx.shadowColor = "#3de0ff"; ctx.shadowBlur = 14 * a; ctx.beginPath(); ctx.moveTo(...wall[i - 1]); ctx.lineTo(...wall[i]); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = `rgba(40,140,170,${0.18 * a})`; const edge = wall === cave.top ? -400 : 400; ctx.beginPath(); ctx.moveTo(...wall[i - 1]); ctx.lineTo(...wall[i]); ctx.lineTo(wall[i][0], wall[i][1] + edge); ctx.lineTo(wall[i - 1][0], wall[i - 1][1] + edge); ctx.fill();
  }
  for (const [x, y, rr] of cave.rocks) { const a = pingAlpha([x, y], lt, pings); if (a < 0.02) continue; ctx.strokeStyle = `rgba(90,235,255,${a})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.stroke(); }
  if (extra) extra(ctx, (p) => pingAlpha(p, lt, pings));
}
function sub(ctx, x, y, s, lt, { lights = 0.5, claw = 0 } = {}) {
  ctx.save(); ctx.translate(x, y + Math.sin(lt * 1.5) * 6); ctx.scale(s, s);
  light(ctx, 120, 0, 220, "rgba(255,240,200,.6)", lights * 0.5);
  ctx.fillStyle = "#101820"; ctx.beginPath(); ctx.ellipse(0, 0, 110, 46, 0, 0, TAU); ctx.fill(); ctx.fillRect(-150, -12, 50, 24);
  ctx.strokeStyle = "rgba(90,235,255,.45)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 110, 46, 0, 0, TAU); ctx.stroke();
  ctx.fillStyle = "#ffb84a"; ctx.beginPath(); ctx.arc(60, -6, 18, 0, TAU); ctx.fill(); light(ctx, 60, -6, 90, "rgba(255,180,80,.8)", 0.6);
  if (claw) { ctx.strokeStyle = "#3a4a54"; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(80, 30); ctx.lineTo(80 + claw * 110, 70 + claw * 40); ctx.stroke(); }
  ctx.restore();
}
function stalkerOutline(ctx, alphaAt, cx, cy, s, lt, eyeOpen = 1) {
  const pts = []; for (let i = 0; i <= 60; i++) { const a = (i / 60) * TAU, rr = (i % 6 < 3 ? 1 : 0.9) * 420 * s; pts.push([cx + Math.cos(a) * rr * 1.4, cy + Math.sin(a) * rr * 0.75]); }
  for (let i = 1; i < pts.length; i++) { const a = alphaAt(pts[i]); if (a < 0.02) continue; ctx.strokeStyle = `rgba(255,90,110,${a})`; ctx.lineWidth = 6; ctx.shadowColor = "#ff3d5e"; ctx.shadowBlur = 18 * a; ctx.beginPath(); ctx.moveTo(...pts[i - 1]); ctx.lineTo(...pts[i]); ctx.stroke(); }
  ctx.shadowBlur = 0;
  const ea = alphaAt([cx - 200 * s, cy]); const shown = Math.max(ea, eyeOpen * 0.5);
  if (shown > 0.02) { ctx.fillStyle = `rgba(255,220,120,${shown})`; ctx.shadowColor = "#ffd27a"; ctx.shadowBlur = 40; ctx.beginPath(); ctx.ellipse(cx - 260 * s, cy - 60 * s, 70 * s, 70 * s * Math.max(0.08, eyeOpen), 0, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = `rgba(0,0,0,${shown})`; ctx.beginPath(); ctx.ellipse(cx - 260 * s, cy - 60 * s, 14 * s, 60 * s * Math.max(0.08, eyeOpen), 0, 0, TAU); ctx.fill(); }
  const ta = alphaAt([cx - 380 * s, cy + 120 * s]); if (ta > 0.02) { ctx.fillStyle = `rgba(255,230,230,${ta})`; for (let i = 0; i < 9; i++) { const x = cx - 520 * s + i * 40 * s; ctx.beginPath(); ctx.moveTo(x, cy + 100 * s); ctx.lineTo(x + 18 * s, cy + 170 * s); ctx.lineTo(x + 36 * s, cy + 100 * s); ctx.fill(); } }
}
function dsHud(ctx, lt, o) {
  const parts = { "ds-black": 2, "ds-part": 2, "ds-stalker": 2, "ds-drift": 2, "ds-lurkers": 3, "ds-hatch": 3 }[o.id] ?? 3;
  for (let i = 0; i < 3; i++) { ctx.strokeStyle = "#3de0ff"; ctx.lineWidth = 4; ctx.strokeRect(W - 230 + i * 60, 360, 44, 44); if (i < parts) { ctx.fillStyle = "#ffb84a"; ctx.fillRect(W - 222 + i * 60, 368, 28, 28); } }
  const ready = Math.sin(lt * 4) > 0;
  hud(ctx, o.id === "ds-drift" ? "ENGINES OFF" : "SONAR READY", 540, H - 220, 40, o.id === "ds-drift" ? "#ff5a6a" : ready ? "#3de0ff" : "rgba(61,224,255,.4)", "center");
}

// ================================================================ any game, featured on Pulsebox (end card)
const ACCENT = { "Hyperlane": ["#ff3df0", "#3de0ff"], "Safecracker": ["#ffd23d", "#ff8a3d"], "Penalty Shootout": ["#3dff7a", "#2a8cff"], "Getaway Heat": ["#ff3d3d", "#ffd23d"], "Deep Signal": ["#3de0ff", "#2a5aff"] };
function heroScreen(ctx, x, y, w, h, lt, title) {
  const [a1, a2] = ACCENT[title] || ["#c6ff3d", "#7c5cff"], u = w / 100;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = "#0b0d14"; ctx.fillRect(x, y, w, h);
  const bh = u * 7.2; ctx.fillStyle = "#1b1e2a"; ctx.fillRect(x, y, w, bh);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + u * (2.2 + i * 2.2), y + bh / 2, u * 0.75, 0, TAU); ctx.fill(); });
  ctx.fillStyle = "#0e1018"; roundRect(ctx, x + u * 10, y + bh * 0.18, w - u * 14, bh * 0.64, bh * 0.32); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = `600 ${u * 3.3}px Inter, sans-serif`; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillText("box.pulseform.org", x + u * 13, y + bh / 2);
  const hy = y + bh + u * 2.6; logoMark(ctx, x + u * 3, hy, u * 6);
  ctx.font = `700 ${u * 5.2}px 'Chakra Petch', Inter, sans-serif`; ctx.fillStyle = "#fff"; ctx.fillText("PULSE", x + u * 10.5, hy + u * 3.2); ctx.fillStyle = "#c6ff3d"; ctx.fillText("BOX", x + u * 10.5 + ctx.measureText("PULSE").width, hy + u * 3.2);
  // the hero banner for the featured game
  const by = hy + u * 9, bhh = h - (by - y) - u * 3;
  ctx.fillStyle = lin(ctx, x, by, x + w, by + bhh, [[0, a2], [1, "#0b0d14"]]); roundRect(ctx, x + u * 3, by, w - u * 6, bhh, u * 2); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.35; for (let i = 0; i < 6; i++) { ctx.fillStyle = a1; ctx.fillRect(x + u * 3 + ((lt * 80 + i * 160) % (w - u * 6)), by, 6, bhh); } ctx.restore();
  ctx.font = `400 ${u * 10}px 'Luckiest Guy', sans-serif`; ctx.textAlign = "left"; ctx.lineWidth = u * 1.2; ctx.strokeStyle = "#0b0d1a"; ctx.lineJoin = "round"; ctx.strokeText(title.toUpperCase(), x + u * 7, by + bhh * 0.42); ctx.fillStyle = a1; ctx.fillText(title.toUpperCase(), x + u * 7, by + bhh * 0.42);
  const pulse = 1 + Math.sin(lt * 5) * 0.04; ctx.save(); ctx.translate(x + u * 18, by + bhh * 0.74); ctx.scale(pulse, pulse); ctx.fillStyle = "#c6ff3d"; roundRect(ctx, -u * 11, -u * 4, u * 22, u * 8, u * 4); ctx.fill(); ctx.fillStyle = "#0b0d1a"; ctx.font = `700 ${u * 4.4}px 'Chakra Petch', sans-serif`; ctx.textAlign = "center"; ctx.fillText("▶ PLAY FREE", 0, u * 0.3); ctx.restore();
  ctx.restore();
}

// ================================================================ the scenes
const ev = (id, k) => EVENTS4[id][k];
const SC = {
  // ---------- Safecracker
  "sc-vault"(ctx, lt) {
    marble(ctx); vaultDoor(ctx, 540, 860, 420, { lt });
    light(ctx, 540, 860, 900, "rgba(200,220,255,.35)", 0.4);
    drawJay(ctx, 540, 1700, 560, { view: "back", pose: "stand", palette: SAFE, light: 0.8, t: lt });
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,40,40,.5)"; for (let i = 0; i < 5; i++) { const y = 1100 + i * 90 + Math.sin(lt + i) * 20; ctx.fillRect(-100, y, W + 200, 3); } ctx.restore();   // lasers
  },
  "sc-dial"(ctx, lt, o) {
    marble(ctx);
    const clicks = ev("sc-dial", "clicks"), n = clicks.filter((x) => lt >= x).length, thunk = o.figT != null && lt > o.figT;
    const ang = thunk ? 3.7 : n * 0.32 + Math.sin(lt * 9) * 0.02;
    ctx.save(); ctx.translate(540, 900);
    ctx.fillStyle = "#3a3e48"; ctx.beginPath(); ctx.arc(0, 0, 420, 0, TAU); ctx.fill();
    ctx.save(); ctx.rotate(ang); ctx.fillStyle = lin(ctx, -300, -300, 300, 300, [[0, "#d8dce4"], [1, "#6a707a"]]); ctx.beginPath(); ctx.arc(0, 0, 330, 0, TAU); ctx.fill();
    for (let i = 0; i < 100; i++) { const a = i * TAU / 100, l = i % 10 ? 22 : 46; ctx.strokeStyle = "#1a1c22"; ctx.lineWidth = i % 10 ? 3 : 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 320, Math.sin(a) * 320); ctx.lineTo(Math.cos(a) * (320 - l), Math.sin(a) * (320 - l)); ctx.stroke(); if (!(i % 10)) { ctx.save(); ctx.translate(Math.cos(a) * 240, Math.sin(a) * 240); ctx.rotate(a + Math.PI / 2); ctx.fillStyle = "#1a1c22"; ctx.font = "700 38px 'Chakra Petch', sans-serif"; ctx.textAlign = "center"; ctx.fillText(String(i), 0, 12); ctx.restore(); } }
    ctx.fillStyle = "#2a2e36"; ctx.beginPath(); ctx.arc(0, 0, 120, 0, TAU); ctx.fill(); ctx.restore();
    ctx.fillStyle = "#ff3d3d"; poly(ctx, [[-18, -440], [18, -440], [0, -390]], "#ff3d3d");
    ctx.restore();
    // the gloved hand on the dial, the stethoscope on the door
    ctx.fillStyle = "#14151c"; ctx.beginPath(); ctx.ellipse(780, 1200, 170, 120, -0.6, 0, TAU); ctx.fill(); ctx.fillStyle = "#22232c"; ctx.fillRect(820, 1240, 300, 200);
    const last = clicks.filter((x) => lt >= x).pop(), ring = last != null ? clamp(1 - (lt - last) / 0.4) : 0, loud = 0.3 + n * 0.07;
    ctx.fillStyle = "#c8ccd4"; ctx.beginPath(); ctx.arc(250, 1290, 60, 0, TAU); ctx.fill(); ctx.strokeStyle = "#1a1c22"; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(250, 1350); ctx.bezierCurveTo(250, 1550, 60, 1500, 40, 1800); ctx.stroke();
    if (ring) for (let i = 1; i <= 3; i++) { ctx.strokeStyle = `rgba(255,210,61,${ring * loud / i})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(250, 1290, 60 + i * 40 * (1 - ring + 0.4), 0, TAU); ctx.stroke(); }
    if (thunk) { const k = clamp((lt - o.figT) / 0.3); light(ctx, 540, 900, 700, "rgba(60,255,120,.7)", 0.6 * (1 - k * 0.5)); hud(ctx, "THUNK", 540, 900, 150, "#3dff7a", "center"); }
    else if (ring) hud(ctx, "click", 380, 1150, 52, `rgba(255,210,61,${ring})`, "center");
  },
  "sc-drill"(ctx, lt, o) {
    marble(ctx);
    const heat = clamp(lt / Math.max(2, (o.figT ?? 4))), done = o.figT != null && lt > o.figT;
    ctx.fillStyle = "#5a606a"; ctx.fillRect(160, 560, 760, 760); ctx.strokeStyle = "#2a2e36"; ctx.lineWidth = 12; ctx.strokeRect(160, 560, 760, 760);
    [[200, 600], [880, 600], [200, 1280], [880, 1280]].forEach(([x, y]) => { ctx.fillStyle = "#2a2e36"; ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.fill(); });
    ctx.fillStyle = "#14161c"; ctx.beginPath(); ctx.arc(540, 940, 40 + heat * 30, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(540 + Math.sin(lt * 60) * 3, 940); ctx.rotate(-0.15);
    ctx.fillStyle = lin(ctx, 0, 0, 0, 1, [[0, "#ff8a3d"], [1, "#ff8a3d"]]); ctx.fillStyle = "#ffcf3a"; roundRect(ctx, 60, -80, 420, 160, 40); ctx.fill(); ctx.fillStyle = "#222"; roundRect(ctx, 260, 60, 90, 260, 20); ctx.fill();
    ctx.fillStyle = heat > 0.75 ? "#ff3d1a" : heat > 0.45 ? "#ff8a3d" : "#c8ccd4"; ctx.fillRect(-10, -14, 80, 28);
    ctx.restore();
    if (!done) { const r = rng(Math.floor(lt * 30)); for (let i = 0; i < 26; i++) { const a = (r() - 0.5) * 2.6 + Math.PI, d = r() * 260; ctx.fillStyle = r() < 0.5 ? "#ffd27a" : "#fff"; ctx.fillRect(540 + Math.cos(a) * d, 940 + Math.sin(a) * d * 0.6, 8, 4); } light(ctx, 540, 940, 300, "rgba(255,180,80,.8)", 0.7); }
    if (heat > 0.6 && !done) { ctx.fillStyle = `rgba(255,60,20,${(heat - 0.6) * 0.6})`; ctx.beginPath(); ctx.arc(540, 940, 140, 0, TAU); ctx.fill(); }
    ctx.fillStyle = "rgba(0,0,0,.6)"; roundRect(ctx, 160, 1400, 760, 50, 25); ctx.fill(); ctx.fillStyle = heat > 0.75 ? "#ff3d1a" : "#ff8a3d"; roundRect(ctx, 166, 1406, 748 * (done ? 0.2 : heat), 38, 19); ctx.fill(); hud(ctx, done ? "BIT COOLED · PLATE OPEN" : "DRILL BIT HEAT", 540, 1490, 40, heat > 0.75 && !done ? "#ff5a3a" : "#fff", "center");
  },
  "sc-keypad"(ctx, lt, o) {
    marble(ctx);
    const seq = ["#ff3d3d", "#2a8cff", "#2a8cff", "#ffd23d", "#3dff7a"], flashes = ev("sc-keypad", "flashes"), wrong = o.figT != null && lt > o.figT;
    ctx.fillStyle = "#2a2e36"; roundRect(ctx, 200, 480, 680, 960, 40); ctx.fill();
    ctx.fillStyle = "#0a1a10"; roundRect(ctx, 260, 540, 560, 150, 18); ctx.fill();
    const shown = flashes.filter((x) => lt >= x).length;
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i < shown ? (i === 4 ? (Math.sin(lt * 4) > 0 ? "#ffffff" : "#3a3e48") : seq[i]) : "#1a2a1e"; ctx.beginPath(); ctx.arc(320 + i * 110, 615, 34, 0, TAU); ctx.fill(); }
    if (shown >= 5) hud(ctx, "?", 760, 615, 70, "#fff", "center");
    const cols = ["#ff3d3d", "#2a8cff", "#ffd23d", "#3dff7a", "#c95cff", "#ff8a3d"];
    cols.forEach((c, i) => { const x = 300 + (i % 3) * 170, y = 780 + Math.floor(i / 3) * 190, lit = flashes.some((f, j) => seq[j] === c && lt >= f && lt < f + 0.4); ctx.fillStyle = lit ? c : mixDark(c); roundRect(ctx, x, y, 140, 150, 20); ctx.fill(); if (lit) light(ctx, x + 70, y + 75, 200, c, 0.6); });
    ctx.fillStyle = "#14151c"; ctx.beginPath(); ctx.ellipse(700 + Math.sin(lt * 2) * 30, 1300, 110, 80, -0.4, 0, TAU); ctx.fill();   // a gloved finger hovering
    if (wrong) { const k = clamp((lt - o.figT) / 0.3); ctx.fillStyle = `rgba(255,30,50,${0.35 * (1 - k * 0.5)})`; ctx.fillRect(-100, -100, W + 200, H + 200); hud(ctx, "WRONG CODE", 540, 1000, 104, "#ff3d4f", "center"); }
  },
  "sc-alarm"(ctx, lt, o) {
    marble(ctx, 1);
    vaultDoor(ctx, 540, 820, 380, { lt });
    for (let i = 0; i < 2; i++) { const a = lt * 4 + i * Math.PI, x = i ? 960 : 120; ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,30,40,.35)"; ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x + Math.cos(a) * 1400 - 200, 300 + Math.sin(a) * 1400); ctx.lineTo(x + Math.cos(a + 0.35) * 1400 + 200, 300 + Math.sin(a + 0.35) * 1400); ctx.fill(); ctx.restore(); ctx.fillStyle = "#ff2a3a"; ctx.beginPath(); ctx.arc(x, 300, 30, 0, TAU); ctx.fill(); }
    ctx.fillStyle = "#14161e"; ctx.fillRect(820, 1150, 220, 420); ctx.fillStyle = "rgba(255,240,200,.7)"; ctx.fillRect(820, 1566, 220, 6);   // a door; a flashlight under it
    const steps = o.figT != null && lt > o.figT; if (steps) { ctx.fillStyle = "#000"; const sx = 860 + ((lt - o.figT) * 40) % 100; ctx.fillRect(sx, 1566, 30, 6); ctx.fillRect(sx + 60, 1566, 30, 6); light(ctx, 930, 1580, 200, "rgba(255,240,200,.6)", 0.6); }
    drawJay(ctx, 330, 1700, 560, { view: "side", facing: 1, pose: "cower", palette: SAFE, light: 0.7, tint: "#2a0508", t: lt, shake: 1.2 });
  },
  "sc-charge"(ctx, lt, o) {
    marble(ctx, 0.6);
    vaultDoor(ctx, 640, 820, 400, { lt });
    const blast = o.figT ?? 4, before = lt < blast;
    ctx.fillStyle = "#c8402a"; roundRect(ctx, 400, 760, 120, 70, 10); ctx.fill(); ctx.fillStyle = "#222"; ctx.fillRect(410, 780, 100, 10); ctx.fillStyle = "#3dff7a"; ctx.fillRect(470, 770, 14, 10);   // the charge
    if (before) { const fk = clamp(lt / blast); ctx.strokeStyle = "#5a4a30"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(460, 830); ctx.quadraticCurveTo(420, 1100, 200 + fk * 0, 1400); ctx.stroke(); const fx = lerp(200, 460, fk), fy = lerp(1400, 830, fk); light(ctx, fx, fy, 80, "rgba(255,200,80,1)", 0.9); ctx.fillStyle = "#fff6c0"; ctx.beginPath(); ctx.arc(fx, fy, 8, 0, TAU); ctx.fill(); }
    const k = clamp((lt - 0.6) / Math.max(1, blast - 0.9));
    ctx.fillStyle = "#2a2c36"; ctx.fillRect(820, 1080, 200, 620);   // a pillar to hide behind
    drawJay(ctx, lerp(280, 880, easeInOut(k)), 1720, 560, { view: "side", facing: 1, pose: k < 1 ? "run" : "cower", phase: lt * 11, palette: SAFE, light: 0.7, tint: "#200808", t: lt });
    if (!before) { const b = lt - blast; light(ctx, 460, 800, 1400, "rgba(255,200,120,1)", Math.max(0, 1 - b * 1.4)); ctx.fillStyle = `rgba(255,250,230,${Math.max(0, 0.9 - b * 2.5)})`; ctx.fillRect(-100, -100, W + 200, H + 200); ctx.fillStyle = `rgba(60,56,60,${Math.min(0.7, b * 0.6)})`; for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.arc(460 + Math.cos(i) * b * 300, 800 + Math.sin(i * 1.7) * b * 200, 120 + b * 80, 0, TAU); ctx.fill(); } }
  },
  "sc-open"(ctx, lt) {
    marble(ctx);
    const k = easeInOut(clamp((lt - 0.3) / 2.2));
    vaultDoor(ctx, 540, 860, 420, { open: k, lt });
    if (k > 0.3) { const r = rng(4); for (let i = 0; i < 16; i++) { ctx.fillStyle = r() < 0.5 ? "#ffd23d" : "#f0b82a"; const x = 380 + (i % 4) * 80, y = 880 + Math.floor(i / 4) * 40; ctx.globalAlpha = (k - 0.3) / 0.7; roundRect(ctx, x, y - (3 - Math.floor(i / 4)) * 0, 70, 34, 6); ctx.fill(); } ctx.globalAlpha = 1; }
    const r = rng(Math.floor(lt * 4)); for (let i = 0; i < 30 * k; i++) { ctx.fillStyle = "rgba(255,240,180,.8)"; ctx.fillRect(540 + (r() - 0.5) * 900, 860 + (r() - 0.5) * 900, 4, 4); }
    drawJay(ctx, 540, 1720, 600, { view: "back", pose: "stand", palette: SAFE, light: 0.6 + k * 0.3, tint: "#3a2008", t: lt });
  },
  // ---------- Deep Signal
  "ds-black"(ctx, lt) { const cave = caveWalls(3); drawSonar(ctx, lt, ev("ds-black", "pings"), cave); sub(ctx, SUB[0], SUB[1], 1, lt); },
  "ds-part"(ctx, lt) {
    const cave = caveWalls(7, { width: 760 });
    drawSonar(ctx, lt, ev("ds-part", "pings"), cave, (c, a) => { const pa = a([880, 1060]); c.fillStyle = "#ffb84a"; c.globalAlpha = Math.max(0.35 + 0.3 * Math.sin(lt * 4), pa); c.fillRect(856, 1036, 48, 48); c.globalAlpha = 1; light(c, 880, 1060, 160, "rgba(255,184,74,.8)", 0.6); const ta = a([1000, 1000]); if (ta > 0.02) { c.strokeStyle = `rgba(90,235,255,${ta})`; c.lineWidth = 5; c.beginPath(); c.ellipse(1040, 1000, 120, 220, 0, 0, TAU); c.stroke(); } });
    sub(ctx, SUB[0], SUB[1], 1, lt);
  },
  "ds-stalker"(ctx, lt, o) {
    const cave = caveWalls(11), pings = o.figT != null ? [o.figT - 0.15] : [0.7];
    drawSonar(ctx, lt, pings, cave, (c, a) => stalkerOutline(c, a, 640, 860, 1.1, lt, o.figT != null && lt > o.figT + 0.6 ? 1 : 0));
    sub(ctx, SUB[0], SUB[1], 1, lt);
  },
  "ds-drift"(ctx, lt, o) {
    ctx.fillStyle = "#000206"; ctx.fillRect(-100, -100, W + 200, H + 200);
    const eye = (Math.sin(lt * 0.9) + 1) / 2; ctx.fillStyle = `rgba(255,210,110,${0.15 + 0.2 * eye})`; ctx.beginPath(); ctx.ellipse(200 + lt * 60, 700, 26, 10, 0, 0, TAU); ctx.fill();
    sub(ctx, SUB[0], SUB[1], 1, lt, { lights: 0 });
    if (o.figT != null && lt > o.figT) { const k = lt - o.figT; const r = rng(Math.floor(lt * 30)); if (k < 1.4) for (let i = 0; i < 20; i++) { ctx.fillStyle = "#ffd27a"; ctx.fillRect(420 + k * 200 + r() * 40, 970 + r() * 50, 6, 3); } hud(ctx, "HULL 61%", 540, 700, 60, "#ff5a6a", "center"); }
  },
  "ds-lurkers"(ctx, lt, o) {
    const cave = caveWalls(19, { width: 620 }), pings = ev("ds-lurkers", "pings");
    drawSonar(ctx, lt, pings, cave, (c, a) => { const r = rng(5); for (let i = 0; i < 40; i++) { const x = 650 + r() * 400 - (o.figT != null && lt > o.figT ? (lt - o.figT) * 120 : 0), y = 820 + r() * 360, al = a([x, y]); if (al < 0.03) continue; c.fillStyle = `rgba(255,90,110,${al})`; c.beginPath(); c.ellipse(x, y, 16, 9, 0, 0, TAU); c.fill(); c.fillStyle = `rgba(255,240,200,${al})`; c.fillRect(x - 10, y - 3, 4, 4); } });
    sub(ctx, SUB[0], SUB[1], 1, lt, { claw: clamp((lt - 1) / 1) });
    if (lt > 2) { ctx.fillStyle = "#ffb84a"; ctx.fillRect(540 + 200, 1060, 40, 40); }
  },
  "ds-hatch"(ctx, lt, o) {
    ctx.fillStyle = "#000206"; ctx.fillRect(-100, -100, W + 200, H + 200);
    const k = clamp(lt / Math.max(3, o.dur || 5));
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = lin(ctx, 0, 0, 0, 900, [[0, "rgba(220,255,255,.85)"], [1, "rgba(0,0,0,0)"]]); ctx.beginPath(); ctx.moveTo(380, 0); ctx.lineTo(700, 0); ctx.lineTo(900, 900); ctx.lineTo(180, 900); ctx.fill(); ctx.restore();
    ctx.fillStyle = "#e8ffff"; ctx.beginPath(); ctx.ellipse(540, lerp(160, 260, k), 150, 40, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(540, lerp(1100, 700, k)); ctx.rotate(-Math.PI / 2); sub(ctx, 0, 0, 1, lt, { lights: 1 }); ctx.restore();
    const jy = lerp(2050, 1250, easeInOut(k)), open = 0.5 + 0.5 * Math.sin(lt * 4);   // the jaws below
    ctx.strokeStyle = "rgba(255,90,110,.85)"; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(540, jy + 400, 520, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.fillStyle = "rgba(255,230,230,.85)"; for (let i = 0; i < 12; i++) { const x = 180 + i * 64; ctx.beginPath(); ctx.moveTo(x, jy + 60); ctx.lineTo(x + 28, jy - 60 - open * 60); ctx.lineTo(x + 56, jy + 60); ctx.fill(); }
    ctx.fillStyle = "rgba(255,210,110,.9)"; ctx.beginPath(); ctx.ellipse(300, jy + 160, 40, 30 * open + 6, 0, 0, TAU); ctx.fill();
  },
  "ds-log"(ctx, lt) {
    ctx.fillStyle = "#020408"; ctx.fillRect(-100, -100, W + 200, H + 200);
    ctx.fillStyle = "#e86a1a"; roundRect(ctx, 220, 640, 640, 520, 40); ctx.fill(); ctx.fillStyle = "#14161e"; roundRect(ctx, 270, 700, 540, 300, 20); ctx.fill();
    ctx.strokeStyle = "#3dff7a"; ctx.lineWidth = 5; ctx.beginPath(); for (let x = 0; x <= 500; x += 6) { const y = 850 + Math.sin(x * 0.08 + lt * 12) * 50 * Math.abs(Math.sin(lt * 3 + x * 0.01)); x ? ctx.lineTo(290 + x, y) : ctx.moveTo(290, y); } ctx.stroke();
    hud(ctx, "HALCYON · BLACK BOX · LOG 7", 540, 1080, 38, "#14161e", "center");
    ctx.fillStyle = Math.sin(lt * 6) > 0 ? "#ff2a2a" : "#4a0a0a"; ctx.beginPath(); ctx.arc(800, 1110, 14, 0, TAU); ctx.fill();
    light(ctx, 540, 900, 700, "rgba(255,140,60,.4)", 0.4);
  },
  // ---------- the end card
  "cta-game"(ctx, lt, o) {
    const title = o.label || "Pulsebox";
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#0a0916"], [0.6, "#100d22"], [1, "#05040a"]]); ctx.fillRect(-100, -100, W + 200, H + 200);
    const by = 330; ctx.fillStyle = "#c6ff3d"; roundRect(ctx, 170, by - 62, 740, 124, 62); ctx.fill();
    ctx.save(); ctx.translate(262, by); ctx.fillStyle = "#0b0d1a"; roundRect(ctx, -44, -36, 88, 56, 8); ctx.fill(); ctx.fillStyle = "#c6ff3d"; ctx.fillRect(-34, -26, 68, 36); ctx.fillStyle = "#0b0d1a"; roundRect(ctx, -60, 22, 120, 14, 6); ctx.fill(); ctx.restore();
    ctx.fillStyle = "#0b0d1a"; ctx.font = "700 60px 'Chakra Petch', Inter, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("COMPUTER ONLY", 345, by + 4);
    const sx = 50, sy = 520, sw = 980, sh = 600;
    ctx.fillStyle = "#040408"; roundRect(ctx, sx - 22, sy - 22, sw + 44, sh + 44, 22); ctx.fill();
    heroScreen(ctx, sx, sy, sw, sh, lt, title);
    ctx.fillStyle = "#06050b"; ctx.fillRect(500, sy + sh + 22, 80, 150); ctx.fillRect(400, sy + sh + 160, 280, 22);
    light(ctx, 540, sy + sh / 2, 1100, (ACCENT[title] || ["#7c5cff"])[0], 0.3);
  },
};
function mixDark(c) { const n = parseInt(c.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return `rgb(${Math.round(r * 0.3)},${Math.round(g * 0.3)},${Math.round(b * 0.3)})`; }

const scS = (id) => ({ overlay: (ctx, lt, o) => scHud(ctx, lt, { ...o, id }), grade: "none" });
const dsS = (id) => ({ overlay: (ctx, lt, o) => dsHud(ctx, lt, { ...o, id }), grade: "none", grain: true });
registerScenes(SC, {
  ...Object.fromEntries(["sc-vault", "sc-dial", "sc-drill", "sc-keypad", "sc-alarm", "sc-charge", "sc-open"].map((id) => [id, scS(id)])),
  ...Object.fromEntries(["ds-black", "ds-part", "ds-stalker", "ds-drift", "ds-lurkers", "ds-hatch"].map((id) => [id, dsS(id)])),
  "ds-log": { grade: "none" }, "cta-game": { grade: "none", noLabel: true },
});

export const NEW_SCENES_4 = [
  ["sc-vault", "Safecracker: the Impossible Vault"], ["sc-dial", "Safecracker: dial by ear (figure: THUNK)"], ["sc-drill", "Safecracker: drilling the plate (figure: done)"],
  ["sc-keypad", "Safecracker: colour keypad (figure: wrong code)"], ["sc-alarm", "Safecracker: alarm, footsteps (figure)"], ["sc-charge", "Safecracker: charge and run (figure: boom)"], ["sc-open", "Safecracker: the vault opens"],
  ["ds-black", "Deep Signal: sonar in the dark"], ["ds-part", "Deep Signal: the last part"], ["ds-stalker", "Deep Signal: the stalker (figure: ping)"],
  ["ds-drift", "Deep Signal: engines off (figure: scrape)"], ["ds-lurkers", "Deep Signal: lurkers in the tunnel"], ["ds-hatch", "Deep Signal: racing to the hatch"], ["ds-log", "Deep Signal: the Halcyon black box"],
  ["cta-game", "End card: a game on Pulsebox (label = game name)"],
].map(([id, label]) => ({ id, label }));
