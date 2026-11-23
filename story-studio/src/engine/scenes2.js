// Scenes inside three Pulsebox horror games (Night Shift, One More Night, Nightwatch), plus Jay himself,
// drawn in third person: walking, running, hammering boards, hiding, sitting at a desk, on security cameras.
import { rng, roundRect, clamp, lerp, easeInOut } from "./util.js";
import { poly, lin, light, shade, flicker, room, persp, drawRoom, quadOnWall, figureVis, shadowFigure, grain, vignette, registerScenes, getScene } from "./scenes.js";

const W = 1080, H = 1920, TAU = Math.PI * 2;

// Scene-local times (seconds from when the scene starts fading in) of things the sound effects must hit.
export const EVENTS = {
  "ns-phone": { rings: [1.0, 3.2, 5.4, 7.6, 9.8] },
  "ns-customer": { chime: [0.75] },
  "ns-lookdown": { taps: [1.3, 1.85, 2.4, 3.6, 4.15, 4.7] },
  "ns-flicker": { off: [2.5, 3.3, 4.1] },
  "omn-board": { hits: [1.0, 1.8, 2.6, 3.4, 4.2, 5.0] },
  "omn-door": { knocks: [0.7, 1.15, 1.6] },
  "omn-window": { boards: [1.2, 2.2, 3.1] },
  "nw-elevator": { ding: [1.2], open: [2.4] },
  "nw-locker": { steps: [0.8, 1.55, 2.3, 3.05] },
  "bedroom-knock": { knocks: [0.65, 1.2, 1.75] },
  "bedroom-call": { rings: [0.9, 2.9, 4.9, 6.9, 8.9] },
};
const ev = (id, k) => EVENTS[id][k];
const lastBefore = (times, lt) => times.filter((x) => x <= lt).pop();

// ---------------------------------------------------------------- colour
const rgbOf = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const mixc = (a, b, k) => { const A = rgbOf(a), B = rgbOf(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * clamp(k))).join(",")})`; };

// ---------------------------------------------------------------- Jay: orange hoodie, blond hair, jeans, white sneakers
const JAY = { hood: "#ff8a3d", hoodD: "#c45a1a", jeans: "#33446a", jeansD: "#212c48", shoe: "#ececf2", skin: "#f0c09a", skinD: "#cf9a74", hair: "#f2d27a", hairD: "#c8a24a", ink: "#14101c" };
// o: view side|back|front, facing 1|-1, pose stand|walk|run|hammer|reach|cower|wave|sit, phase (walk cycle), light 0..1, tint
export function drawJay(ctx, x, footY, h, o = {}) {
  const { view = "side", facing = 1, pose = "stand", phase = 0, light: L = 1, tint = "#0b0a16", t = 0, shake = 0, alpha = 1, palette = null, number = null } = o;
  const P = palette ? { ...JAY, ...palette } : JAY;
  const c = (k) => mixc(P[k], tint, 1 - L);
  const sw = pose === "run" ? 0.9 : pose === "walk" ? 0.45 : 0;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(x + (shake ? Math.sin(t * 57) * shake : 0), footY + (sw ? -Math.abs(Math.sin(phase)) * h * (pose === "run" ? 0.03 : 0.012) : 0));
  const s = h / 100; ctx.scale(s * (view === "side" ? facing : 1), s);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const seg = (a, b, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
  const dot = (x0, y0, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x0, y0, r, 0, TAU); ctx.fill(); };
  const scared = pose === "cower" || pose === "run" || o.scared;

  if (view === "side") {
    const lean = pose === "run" ? 0.22 : pose === "walk" ? 0.05 : pose === "cower" ? -0.12 : 0;
    const hip = [0, -47];
    const leg = (p, near) => {
      const a = Math.sin(p) * sw, b = sw ? Math.max(0, -Math.cos(p)) * sw * 1.6 : pose === "cower" ? 0.5 : 0;
      const k = [hip[0] + Math.sin(a) * 24, hip[1] + Math.cos(a) * 24], f = [k[0] + Math.sin(a - b) * 23, k[1] + Math.cos(a - b) * 23];
      seg(hip, k, 10.5, near ? c("jeans") : c("jeansD")); seg(k, f, 9.5, near ? c("jeans") : c("jeansD"));
      ctx.fillStyle = near ? c("shoe") : mixc(P.shoe, tint, 0.45 + (1 - L) * 0.5); ctx.beginPath(); ctx.ellipse(f[0] + 3.5, f[1] + 0.5, 7, 3.4, 0, 0, TAU); ctx.fill();
    };
    const arm = (p, near) => {
      let ua = -Math.sin(p) * sw * 0.9, fa = ua + (pose === "run" ? 1.5 : 0.35);
      if (pose === "hammer" && near) { ua = 2.5 + Math.sin(t * TAU / 0.8 + 1.2) * 0.75; fa = ua + 0.4; }
      if (pose === "reach" && near) { ua = 1.5; fa = 1.6; }
      if (pose === "wave" && near) { ua = 2.9; fa = 3.0 + Math.sin(t * 9) * 0.35; }
      if (pose === "cower") { ua = near ? 2.3 : 2.1; fa = ua + 2.0; }
      const sh = [1, -76], e = [sh[0] + Math.sin(ua) * 16, sh[1] + Math.cos(ua) * 16], hd = [e[0] + Math.sin(fa) * 15, e[1] + Math.cos(fa) * 15];
      seg(sh, e, 9, near ? c("hood") : c("hoodD")); seg(e, hd, 8, near ? c("hood") : c("hoodD"));
      dot(hd[0], hd[1], 3.6, c("skin"));
      if (pose === "hammer" && near) { ctx.save(); ctx.translate(hd[0], hd[1]); ctx.rotate(-fa); ctx.fillStyle = mixc("#6b4a2a", tint, 1 - L); ctx.fillRect(-1.3, -2, 2.6, 16); ctx.fillStyle = mixc("#8a8f98", tint, 1 - L); ctx.fillRect(-5, 12, 10, 5); ctx.restore(); }
      if (pose === "reach" && near) { ctx.save(); ctx.translate(hd[0], hd[1]); ctx.rotate(-fa + Math.PI / 2); ctx.fillStyle = mixc("#2a2a30", tint, 1 - L); ctx.fillRect(0, -2.5, 11, 5); ctx.restore(); }
    };
    const p0 = phase, p1 = phase + Math.PI;
    arm(p1, false); leg(p1, false); leg(p0, true);
    ctx.save(); ctx.translate(hip[0], hip[1]); ctx.rotate(lean); ctx.translate(-hip[0], -hip[1]);
    ctx.fillStyle = c("hood"); roundRect(ctx, -10, -81, 21, 38, 7); ctx.fill();               // hoodie
    ctx.fillStyle = c("hoodD"); roundRect(ctx, -10, -50, 21, 7, 3); ctx.fill();               // hem
    ctx.fillStyle = c("hoodD"); ctx.beginPath(); ctx.ellipse(-7, -80, 6, 5, 0.3, 0, TAU); ctx.fill();   // hood
    ctx.fillStyle = c("skinD"); ctx.fillRect(0, -84, 5, 5);                                     // neck
    ctx.fillStyle = c("hair"); ctx.beginPath(); ctx.ellipse(0.5, -93, 9.8, 8, 0, 0, TAU); ctx.fill();
    dot(3.2, -89.5, 8.3, c("skin"));                                                             // face
    ctx.fillStyle = c("hair"); ctx.beginPath(); ctx.ellipse(1.5, -96.5, 9.5, 4.6, -0.12, 0, TAU); ctx.fill();   // fringe
    dot(1, -89, 2.2, c("skinD"));                                                                // ear
    if (scared) { dot(8.2, -90.5, 2.1, mixc("#ffffff", tint, 1 - L)); dot(8.8, -90.5, 1.1, c("ink")); ctx.fillStyle = c("ink"); ctx.beginPath(); ctx.ellipse(9.6, -85.2, 1.3, 1.8, 0, 0, TAU); ctx.fill(); }
    else { dot(8.6, -90.5, 1.2, c("ink")); seg([8.2, -85.5], [10.5, -85.5], 0.9, c("ink")); }
    arm(p0, true);
    ctx.restore();
  } else {
    const front = view === "front";
    if (pose !== "sit") for (const i of [0, 1]) {   // legs
      const lx = i ? 4.8 : -4.8, lift = sw ? Math.max(0, Math.sin(phase + i * Math.PI)) * (pose === "run" ? 10 : 5) : 0;
      seg([lx, -47], [lx * 1.05, -24 - lift * 0.4], 10.5, c("jeans")); seg([lx * 1.05, -24 - lift * 0.4], [lx * 1.1, -2 - lift], 9.5, c("jeans"));
      ctx.fillStyle = c("shoe"); ctx.beginPath(); ctx.ellipse(lx * 1.1, -1 - lift, 5, 3, 0, 0, TAU); ctx.fill();
    }
    for (const i of [-1, 1]) {   // arms
      let hx = i * 15, hy = -50 + (sw ? Math.sin(phase + (i > 0 ? Math.PI : 0)) * sw * 5 : 0);
      if (pose === "sit") { hx = i * 19; hy = -60; }
      if (pose === "wave" && i > 0) { hx = 20 + Math.sin(t * 9) * 3; hy = -108; }
      if (pose === "cower") { hx = i * 6; hy = -94; }
      if (pose === "reach" && i > 0) { hx = 8; hy = -70; }
      const e = [i * 14, (-77 + hy) / 2 + 2];
      seg([i * 10, -77], e, 9, c("hood")); seg(e, [hx, hy], 8, c("hood")); dot(hx, hy, 3.6, c("skin"));
    }
    ctx.fillStyle = c("hood"); roundRect(ctx, -11, -81, 22, 38, 7); ctx.fill();
    ctx.fillStyle = c("hoodD"); roundRect(ctx, -11, -50, 22, 7, 3); ctx.fill();
    if (!front && number == null) { ctx.fillStyle = c("hoodD"); ctx.beginPath(); ctx.ellipse(0, -76, 8, 6, 0, 0, TAU); ctx.fill(); }
    if (!front && number != null) { ctx.fillStyle = c("shoe"); ctx.font = "700 15px 'Chakra Petch', Inter, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(number), 0, -64); }
    else { seg([-2.6, -78], [-2.6, -69], 1, c("shoe")); seg([2.6, -78], [2.6, -69], 1, c("shoe")); ctx.fillStyle = c("hoodD"); roundRect(ctx, -7, -60, 14, 7, 3); ctx.fill(); }
    if (pose === "cower" && front) { /* arms over the face, drawn after the head below */ }
    dot(0, -90, 9, front ? c("skin") : c("hair"));
    dot(-9, -89, 2.2, c("skinD")); dot(9, -89, 2.2, c("skinD"));
    ctx.fillStyle = c("hair");
    if (front) {
      ctx.beginPath(); ctx.ellipse(0, -96, 9.6, 5, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(-3, -94, 6, 3.5, -0.3, 0, TAU); ctx.fill();
      if (scared) { for (const i of [-1, 1]) { dot(i * 3.4, -90, 2, mixc("#ffffff", tint, 1 - L)); dot(i * 3.4, -90, 1.1, c("ink")); } ctx.fillStyle = c("ink"); ctx.beginPath(); ctx.ellipse(0, -84.5, 1.5, 2, 0, 0, TAU); ctx.fill(); }
      else { for (const i of [-1, 1]) dot(i * 3.2, -90, 1.2, c("ink")); seg([-1.6, -85.5], [1.6, -85.5], 0.9, c("ink")); }
    } else { ctx.beginPath(); ctx.ellipse(0, -93, 9.8, 7, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = c("hairD"); ctx.lineWidth = 0.8; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 3, -99); ctx.quadraticCurveTo(k * 3.4, -92, k * 3.8, -84); ctx.stroke(); } }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- security camera look
const pad2 = (n) => String(n).padStart(2, "0");
function clockAt(base, add) { const [h, m, s] = base.split(":").map(Number); let x = h * 3600 + m * 60 + s + Math.floor(add); x %= 86400; return `${pad2(Math.floor(x / 3600))}:${pad2(Math.floor(x / 60) % 60)}:${pad2(x % 60)}`; }
export function cctvLook(ctx, lt, { cam = "CAM 07", place = "", time = "03:51:07", tape = false } = {}) {
  ctx.save();
  ctx.globalCompositeOperation = "saturation"; ctx.fillStyle = "hsl(0,0%,50%)"; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "color"; ctx.globalAlpha = 0.45; ctx.fillStyle = tape ? "#8aa0b8" : "#7fbf98"; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(0,0,0,.2)"; for (let y = 0; y < H; y += 5) ctx.fillRect(0, y, W, 2);
  const by = ((lt * 260) % (H + 300)) - 150; ctx.fillStyle = "rgba(255,255,255,.05)"; ctx.fillRect(0, by, W, 110);
  if (tape) { const r = rng(Math.floor(lt * 12)); for (let i = 0; i < 3; i++) { const y = r() * H; ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(0, y, W, 4 + r() * 14); } }
  grain(ctx, lt, 0.09);
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.68); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.8)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.font = "700 42px 'Courier New', 'Liberation Mono', monospace"; ctx.textBaseline = "top"; ctx.textAlign = "left";
  ctx.fillStyle = "rgba(235,255,240,.88)"; ctx.shadowColor = "rgba(0,0,0,.8)"; ctx.shadowBlur = 6;
  ctx.fillText(tape ? "▶ PLAYBACK  TAPE 4" : cam, 54, 330); if (place) ctx.fillText(place, 54, 384);
  ctx.textAlign = "right"; ctx.fillText(`11/23/2026  ${clockAt(time, tape ? lt * 1.0 : lt)}`, W - 54, H - 300);
  if (!tape && Math.sin(lt * 5) > -0.2) { ctx.fillStyle = "#ff3b3b"; ctx.beginPath(); ctx.arc(W - 220, 352, 13, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(235,255,240,.88)"; ctx.fillText("REC", W - 54, 330); }
  ctx.restore();
}

// the tall thing in Nightwatch: a pale face behind a black bar
function barFigure(ctx, x, footY, h, a, t) {
  if (a <= 0) return;
  shadowFigure(ctx, x, footY, h, a, t, false, "#08080c");
  const s = h / 600;
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = "#d8d2c6"; ctx.beginPath(); ctx.ellipse(x, footY - 548 * s, 27 * s, 40 * s, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#000"; ctx.fillRect(x - 46 * s, footY - 566 * s, 92 * s, 24 * s);
  ctx.fillStyle = "#3a1414"; ctx.fillRect(x - 9 * s, footY - 524 * s, 18 * s, 3 * s);
  ctx.restore();
}
// a pale, tall thing between the trees in One More Night
function watcher(ctx, x, footY, h, a, t) {
  if (a <= 0) return;
  shadowFigure(ctx, x, footY, h, a, t, false, "#d6d1c4");
  const s = h / 600; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = "#0c0a08";
  ctx.beginPath(); ctx.ellipse(x - 11 * s, footY - 552 * s, 7 * s, 10 * s, 0, 0, TAU); ctx.ellipse(x + 11 * s, footY - 552 * s, 7 * s, 10 * s, 0, 0, TAU); ctx.fill(); ctx.restore();
}

// ================================================================ NIGHT SHIFT: the Starlite on Route 9
function starlite(ctx, lt, o, { dawn = 0, car = false, pumpOn = 0, jay = null }) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, 940, [[0, mixc("#04050c", "#3a4a8a", dawn)], [1, mixc("#161430", "#ffb27a", dawn)]]); ctx.fillRect(-100, -100, W + 200, 1100);
  const r = rng(3); ctx.fillStyle = "#fff"; for (let i = 0; i < 80; i++) { ctx.globalAlpha = (0.15 + 0.6 * r()) * (1 - dawn); ctx.fillRect(r() * W, r() * 700, 2, 2); } ctx.globalAlpha = 1;
  if (dawn) light(ctx, 860, 930, 760, "rgba(255,170,110,.9)", dawn * 0.85);
  ctx.fillStyle = mixc("#07060e", "#3a2a40", dawn); ctx.beginPath(); ctx.moveTo(-100, 950); for (let x = -100; x <= W + 100; x += 60) ctx.lineTo(x, 905 - Math.abs(Math.sin(x * 0.013)) * 50 - (x % 120 ? 0 : 20)); ctx.lineTo(W + 100, 960); ctx.fill();
  // the store
  const lit = (1 - dawn * 0.6) * (o.flick ?? 1);
  ctx.fillStyle = "#1b1828"; ctx.fillRect(60, 700, 960, 560); ctx.fillStyle = "#232036"; ctx.fillRect(60, 700, 960, 120);
  ctx.save(); ctx.font = "700 96px 'Chakra Petch', Inter, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#7af4ff"; ctx.shadowColor = "#3ae0ff"; ctx.shadowBlur = 34 * flicker(lt, 2, 3); ctx.fillText("STARLITE", 540, 764); ctx.restore();
  ctx.fillStyle = lin(ctx, 0, 850, 0, 1210, [[0, `rgba(205,225,255,${0.9 * lit})`], [1, `rgba(150,175,220,${0.85 * lit})`]]); ctx.fillRect(110, 850, 860, 360);
  ctx.fillStyle = "rgba(40,40,60,.55)"; for (let i = 0; i < 4; i++) { ctx.fillRect(150 + i * 210, 980, 150, 20); ctx.fillRect(150 + i * 210, 1060, 150, 20); ctx.fillRect(150 + i * 210, 1140, 150, 20); }
  if (jay) drawJay(ctx, jay.x, 1205, jay.h || 290, { view: "front", t: lt, light: 0.85, scared: true, ...jay });
  ctx.strokeStyle = "#12101c"; ctx.lineWidth = 12; for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(110 + i * 215, 850); ctx.lineTo(110 + i * 215, 1210); ctx.stroke(); }
  ctx.strokeRect(110, 850, 860, 360);
  ctx.fillStyle = "rgba(255,255,255,.06)"; poly(ctx, [[110, 850], [420, 850], [250, 1210], [110, 1210]], "rgba(255,255,255,.05)");
  light(ctx, 540, 1230, 520, "rgba(190,215,255,.5)", 0.5 * lit);
  // canopy
  poly(ctx, [[-60, 420], [1140, 420], [1140, 515], [-60, 515]], "#2b2838"); ctx.fillStyle = "#ff5a3d"; ctx.fillRect(-60, 496, 1200, 20);
  [[120, 330], [430, 630], [740, 930]].forEach(([a, b]) => { ctx.fillStyle = mixc("#fffbe8", "#888", dawn * 0.5); ctx.fillRect(a, 516, b - a + 40, 12); light(ctx, (a + b) / 2 + 20, 560, 420, "rgba(255,250,230,.6)", 0.6 * (1 - dawn * 0.5)); });
  ctx.fillStyle = "#24212f"; ctx.fillRect(270, 516, 42, 1040); ctx.fillRect(790, 516, 42, 1040);
  // pumps
  [[150, "1"], [410, "2"], [670, "3"], [930, "4"]].forEach(([px, n]) => {
    const four = n === "4";
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(px - 70, 1530, 140, 22);
    ctx.fillStyle = lin(ctx, px - 55, 0, px + 55, 0, [[0, "#d6d2dc"], [1, "#a29eac"]]); roundRect(ctx, px - 55, 1230, 110, 300, 12); ctx.fill();
    ctx.fillStyle = "#ff5a3d"; roundRect(ctx, px - 55, 1230, 110, 64, 12); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "700 52px 'Chakra Petch', Inter, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(n, px, 1264);
    const on = four ? pumpOn : 0;
    ctx.fillStyle = on ? "#300a0a" : "#0e1012"; ctx.fillRect(px - 38, 1312, 76, 56);
    ctx.fillStyle = on ? "#ff4a4a" : "#3dff8a"; ctx.font = "700 26px 'Courier New', monospace"; ctx.fillText(on ? (lt * 7.3).toFixed(2) : four ? "----" : "0.00", px, 1341);
    if (on) light(ctx, px, 1340, 300, "rgba(255,60,60,.7)", 0.6 + 0.2 * Math.sin(lt * 20));
    ctx.strokeStyle = "#1a1a20"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(px + 50, 1400); ctx.quadraticCurveTo(px + 90 + (on ? Math.sin(lt * 30) * 6 : 0), 1470, px + 52, 1520); ctx.stroke();
    if (four) { ctx.save(); ctx.translate(px, 1450); ctx.rotate(-0.25); ctx.fillStyle = "#ffd23d"; ctx.fillRect(-62, -14, 124, 28); ctx.fillStyle = "#111"; ctx.font = "700 17px Inter, sans-serif"; ctx.fillText("OUT OF ORDER", 0, 1); ctx.restore(); }
  });
  // lot
  ctx.fillStyle = lin(ctx, 0, 1552, 0, H, [[0, mixc("#1d1b26", "#5a4a4a", dawn)], [1, "#0b0a10"]]); ctx.fillRect(-100, 1552, W + 200, 500);
  ctx.fillStyle = "rgba(255,210,61,.35)"; for (let x = -40; x < W; x += 180) ctx.fillRect(x, 1760, 110, 10);
  light(ctx, 540, 1600, 600, "rgba(255,250,230,.35)", 0.4 * (1 - dawn));
  if (car) {   // a car at pump 4: lights on, nobody inside
    ctx.save(); ctx.translate(560, 1720); ctx.scale(1.05, 1.05);
    poly(ctx, [[-20, -60], [380, -60], [420, -10], [420, 40], [-60, 40], [-60, -10]], "#121018");
    poly(ctx, [[40, -60], [90, -130], [300, -130], [350, -60]], "#121018");
    poly(ctx, [[62, -64], [100, -120], [190, -120], [190, -64]], "#1d2a40"); poly(ctx, [[205, -64], [205, -120], [292, -120], [330, -64]], "#1d2a40");
    ctx.fillStyle = "#050507"; [40, 320].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, 40, 40, 0, TAU); ctx.fill(); });
    ctx.fillStyle = "#fffbe0"; ctx.beginPath(); ctx.ellipse(-52, -18, 12, 9, 0, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.2; poly(ctx, [[505, 1700], [-100, 1590], [-100, 1880]], "#fff6d0"); ctx.restore();
    light(ctx, 505, 1701, 150, "rgba(255,250,220,.9)", 0.9);
  }
}
function starliteInside(ctx, lt, o, { clock = "2:00", lights = 1, customer = 0, reflect = false, phoneRing = 0, jay = null, outside = null }) {
  const L = lights;
  ctx.fillStyle = mixc("#3a3a52", "#08080e", 1 - L); ctx.fillRect(-100, -100, W + 200, H + 200);
  for (let row = 0; row < 4; row++) {   // shelves full of snacks
    const y = 420 + row * 170; ctx.fillStyle = mixc("#1c1c2a", "#050508", 1 - L); ctx.fillRect(40, y + 120, 700, 16);
    const r = rng(row + 5); for (let x = 50; x < 730; x += 26 + r() * 10) { ctx.fillStyle = mixc(["#c94a5a", "#e8c35a", "#5aa0c9", "#7ac96a", "#c97ad9", "#e88a4a"][Math.floor(r() * 6)], "#08080e", 0.35 + (1 - L) * 0.6); ctx.fillRect(x, y + 120 - (50 + r() * 40), 20, 50 + r() * 40); }
  }
  // wall clock and the store phone
  ctx.fillStyle = mixc("#f0f0f0", "#111", 1 - L * 0.9); ctx.beginPath(); ctx.arc(560, 290, 62, 0, TAU); ctx.fill(); ctx.strokeStyle = "#222"; ctx.lineWidth = 6; ctx.stroke();
  const [hh, mm] = clock.split(":").map(Number), ha = ((hh % 12) + mm / 60) / 12 * TAU, ma = mm / 60 * TAU;
  ctx.lineCap = "round"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(560, 290); ctx.lineTo(560 + Math.sin(ha) * 34, 290 - Math.cos(ha) * 34); ctx.stroke();
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(560, 290); ctx.lineTo(560 + Math.sin(ma) * 50, 290 - Math.cos(ma) * 50); ctx.stroke();
  ctx.strokeStyle = "#d22"; ctx.lineWidth = 2; const sa = lt * TAU / 60; ctx.beginPath(); ctx.moveTo(560, 290); ctx.lineTo(560 + Math.sin(sa) * 54, 290 - Math.cos(sa) * 54); ctx.stroke();
  const ph = phoneRing ? Math.sin(lt * 60) * 4 * phoneRing : 0;
  ctx.fillStyle = mixc("#d8ccb0", "#111", 1 - L * 0.9); roundRect(ctx, 150 + ph, 300, 110, 170, 14); ctx.fill();
  ctx.fillStyle = mixc("#b8ac90", "#111", 1 - L * 0.9); roundRect(ctx, 136 + ph, 286, 36, 140, 14); ctx.fill();
  if (phoneRing) { light(ctx, 205, 380, 240, "rgba(255,80,80,.7)", 0.5 * phoneRing); ctx.fillStyle = "#ff3b3b"; ctx.beginPath(); ctx.arc(236 + ph, 320, 9, 0, TAU); ctx.fill(); }
  // the front windows / door on the right, night outside, reflections
  const gx = 760;
  ctx.fillStyle = lin(ctx, gx, 0, W, 0, [[0, "#0a1228"], [1, "#050912"]]); ctx.fillRect(gx, 200, W - gx + 100, 1560);
  if (outside) outside(ctx, gx);
  if (reflect && jay) { ctx.save(); ctx.beginPath(); ctx.rect(gx, 200, W - gx, 1560); ctx.clip(); ctx.globalAlpha = 0.16; drawJay(ctx, gx + 170, 1500, 660, { ...jay, facing: -(jay.facing || 1), light: 0.5, tint: "#4a6aa8", t: lt }); ctx.fillStyle = "rgba(120,160,230,.08)"; ctx.fillRect(gx, 200, W - gx, 1560); ctx.restore(); }
  ctx.strokeStyle = "#16141f"; ctx.lineWidth = 18; ctx.strokeRect(gx, 200, W - gx + 40, 1560); ctx.beginPath(); ctx.moveTo(gx, 980); ctx.lineTo(W + 40, 980); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.06)"; poly(ctx, [[gx, 200], [gx + 120, 200], [gx + 20, 1760], [gx, 1760]], "rgba(255,255,255,.07)");
  // Jay behind the counter
  if (jay && !jay.front) drawJay(ctx, jay.x ?? 330, jay.y ?? 1500, jay.h ?? 680, { view: "side", facing: 1, t: lt, light: 0.55 + L * 0.4, ...jay });
  // the counter
  ctx.fillStyle = mixc("#5a4d66", "#0a0a10", 1 - L); ctx.fillRect(-40, 1180, 720, 60);
  ctx.fillStyle = mixc("#3a3048", "#07070b", 1 - L); ctx.fillRect(-40, 1240, 720, 520);
  ctx.fillStyle = mixc("#ff5a3d", "#100808", 1 - L); ctx.fillRect(-40, 1300, 720, 18);
  ctx.fillStyle = mixc("#2a2a32", "#050507", 1 - L); roundRect(ctx, 80, 1040, 230, 150, 10); ctx.fill(); ctx.fillStyle = `rgba(61,255,138,${0.8 * L})`; ctx.fillRect(110, 1060, 170, 50);
  if (jay && jay.front) drawJay(ctx, jay.x, jay.y, jay.h, { t: lt, light: 0.5 + L * 0.4, ...jay });
  if (customer) {   // tall, in a long dark raincoat, hood up; grey fingers on the counter
    const cx = 800, s = 1.9;
    ctx.save(); ctx.globalAlpha = customer;
    ctx.fillStyle = "#0b0a10"; ctx.beginPath(); ctx.moveTo(cx - 60 * s, 1900); ctx.lineTo(cx - 40 * s, 1150); ctx.quadraticCurveTo(cx, 1060, cx + 40 * s, 1150); ctx.lineTo(cx + 70 * s, 1900); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx - 6, 1040, 46 * s * 0.75, 62 * s * 0.75, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(cx - 30, 1050, 26, 40, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#0b0a10"; ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(cx - 50, 1240); ctx.quadraticCurveTo(cx - 130, 1230, cx - 160, 1205); ctx.stroke();
    ctx.strokeStyle = "#9a9a96"; ctx.lineWidth = 7; ctx.lineCap = "round"; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - 170, 1198 + i * 5); ctx.quadraticCurveTo(cx - 230 - i * 6, 1192 + i * 3, cx - 270 - i * 12 + Math.sin(lt * 4 + i) * 5, 1184 + i * 2); ctx.stroke(); }
    ctx.restore();
  }
  ctx.save(); ctx.globalCompositeOperation = "lighter"; [[260, 120], [620, 120]].forEach(([x, y]) => { ctx.fillStyle = `rgba(255,255,255,${0.9 * L})`; ctx.fillRect(x - 130, y, 260, 18); light(ctx, x, y + 120, 600, "rgba(220,235,255,.4)", 0.5 * L); }); ctx.restore();
}
function clipboard(ctx, lt) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#2a2238"], [1, "#120e1a"]]); ctx.fillRect(-100, -100, W + 200, H + 200);
  ctx.save(); ctx.translate(540, 980); ctx.rotate(-0.04);
  ctx.fillStyle = "rgba(0,0,0,.45)"; roundRect(ctx, -370, -600, 760, 1220, 30); ctx.fill();
  ctx.fillStyle = "#8a5a32"; roundRect(ctx, -390, -620, 760, 1220, 30); ctx.fill();
  ctx.fillStyle = "#f3ecd8"; ctx.fillRect(-340, -520, 660, 1060);
  ctx.strokeStyle = "rgba(90,120,200,.35)"; ctx.lineWidth = 2; for (let y = -400; y < 520; y += 62) { ctx.beginPath(); ctx.moveTo(-340, y); ctx.lineTo(320, y); ctx.stroke(); }
  ctx.fillStyle = "#b8bcc4"; roundRect(ctx, -150, -660, 300, 110, 22); ctx.fill(); ctx.fillStyle = "#8a8e96"; roundRect(ctx, -110, -630, 220, 40, 12); ctx.fill();
  ctx.fillStyle = "#1c1a2a"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.font = "400 54px 'Permanent Marker', sans-serif"; ctx.fillText("NIGHT SHIFT RULES", -300, -430);
  const rules = [["1. Look DOWN if a customer", "has no reflection."], ["2. NEVER turn on pump 4."], ["3. Lights flicker 3 times?", "LOCK THE DOOR."], ["4. Never answer the phone", "at 2 AM."]];
  let y = -330; const shown = Math.floor(clamp((lt - 0.7) / 0.5, 0, 4));
  rules.forEach((lines, i) => { ctx.globalAlpha = i < shown ? 1 : 0.12; ctx.font = "400 42px 'Permanent Marker', sans-serif"; lines.forEach((l) => { ctx.fillStyle = i === 1 ? "#a3141f" : "#1c1a2a"; ctx.fillText(l, -300, y); y += 62; }); y += 30; });
  ctx.globalAlpha = 1; ctx.strokeStyle = "#a3141f"; ctx.lineWidth = 6; if (shown > 1) { ctx.beginPath(); ctx.moveTo(-300, -170); ctx.lineTo(Math.min(260, -300 + (lt - 1.2) * 900), -170); ctx.stroke(); }
  ctx.fillStyle = "rgba(120,70,30,.25)"; ctx.beginPath(); ctx.arc(200, 380, 90, 0, TAU); ctx.fill(); ctx.fillStyle = "#f3ecd8"; ctx.beginPath(); ctx.arc(200, 380, 74, 0, TAU); ctx.fill();
  ctx.fillStyle = "#1c1a2a"; ctx.font = "400 40px 'Permanent Marker', sans-serif"; ctx.fillText("- D.", 140, 500);
  ctx.restore();
  light(ctx, 540, 900, 900, "rgba(255,240,210,.35)", 0.4);
}

// ================================================================ ONE MORE NIGHT: the forest that remembers
function trees(ctx, lt, { sky, scroll = 0, layers = [["#1a1830", 0.25, 9], ["#0f0e1c", 0.55, 7], ["#06060c", 1, 5]] }) {
  const g = { dusk: [["#2a1240", 0], ["#8a2a3a", 0.55], ["#ff7a4a", 0.75]], night: [["#03040c", 0], ["#0c1028", 0.7], ["#141836", 0.8]], dawn: [["#2a3a7a", 0], ["#ff9a7a", 0.55], ["#ffd6a0", 0.78]] }[sky];
  ctx.fillStyle = lin(ctx, 0, 0, 0, 1400, g.map(([c, o]) => [o, c])); ctx.fillRect(-100, -100, W + 200, H + 200);
  if (sky !== "night") light(ctx, 700, 1080, 520, sky === "dusk" ? "rgba(255,120,70,.9)" : "rgba(255,220,160,.9)", 0.7);
  else { const r = rng(9); ctx.fillStyle = "#fff"; for (let i = 0; i < 60; i++) { ctx.globalAlpha = 0.2 + 0.5 * r(); ctx.fillRect(r() * W, r() * 900, 2, 2); } ctx.globalAlpha = 1; ctx.fillStyle = "#e8e8f0"; ctx.beginPath(); ctx.arc(820, 300, 46, 0, TAU); ctx.fill(); }
  layers.forEach(([col, sp, n], li) => {
    const r = rng(li * 17 + 3), off = (scroll * sp * 600) % W;
    ctx.fillStyle = col;
    for (let i = -2; i < n + 2; i++) {
      const x = ((i * (W / n) + r() * 80 - off) % (W + 400) + W + 400) % (W + 400) - 200, base = 1250 + li * 120, th = 700 + li * 260 + r() * 200, w = 70 + li * 60;
      ctx.fillRect(x - w * 0.09, base - th * 0.4, w * 0.18, th * 0.4 + 900);
      for (let k = 0; k < 5; k++) { const yy = base - th + k * th * 0.16, ww = w * (0.35 + k * 0.17); ctx.beginPath(); ctx.moveTo(x, yy - th * 0.12); ctx.lineTo(x + ww, yy + th * 0.14); ctx.lineTo(x - ww, yy + th * 0.14); ctx.fill(); }
    }
    ctx.fillStyle = `rgba(150,140,190,${0.06 + li * 0.02})`; ctx.fillRect(-100, 1180 + li * 120, W + 200, 140);   // fog between layers
  });
  ctx.fillStyle = lin(ctx, 0, 1560, 0, H, [[0, "#14101a"], [1, "#05040a"]]); ctx.fillRect(-100, 1560, W + 200, 500);
}
function cabinWall(ctx, L = 1) {
  ctx.fillStyle = mixc("#3a2418", "#050404", 1 - L); ctx.fillRect(-100, -100, W + 200, H + 200);
  for (let y = -60; y < 1700; y += 86) { ctx.fillStyle = mixc("#4a2e1c", "#070505", 1 - L); roundRect(ctx, -100, y, W + 200, 78, 36); ctx.fill(); ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(-100, y + 64, W + 200, 10); }
  ctx.fillStyle = mixc("#2a1a10", "#030303", 1 - L); ctx.fillRect(-100, 1600, W + 200, 400);
  for (let x = -100; x < W + 100; x += 140) { ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(x, 1600, 6, 400); }
}
function lantern(ctx, x, y, lt) {
  const f = 0.85 + 0.15 * Math.sin(lt * 13) * Math.sin(lt * 7.3);
  ctx.fillStyle = "#1a1410"; ctx.fillRect(x - 70, y + 60, 140, 20);
  ctx.fillStyle = "#2a2018"; roundRect(ctx, x - 26, y - 70, 52, 120, 10); ctx.fill(); ctx.fillStyle = "#ffcf6a"; roundRect(ctx, x - 18, y - 52, 36, 84, 8); ctx.fill();
  light(ctx, x, y - 10, 900, "rgba(255,180,90,.6)", 0.75 * f);
}
function boardedWindow(ctx, lt, x, y, w, h, boards, { outside = null, popped = [] } = {}) {
  ctx.fillStyle = "#0a0e22"; ctx.fillRect(x, y, w, h);
  if (outside) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); outside(ctx); ctx.restore(); }
  ctx.strokeStyle = "#1a100a"; ctx.lineWidth = 22; ctx.strokeRect(x, y, w, h);
  for (let i = 0; i < boards; i++) {
    const p = popped[i]; const by = y + 30 + i * (h - 60) / 4;
    ctx.save(); ctx.translate(x + w / 2, by + 30);
    if (p != null && lt > p) { const k = lt - p; ctx.translate(-k * 500, k * k * 900); ctx.rotate(-k * 4); ctx.globalAlpha = clamp(1 - k * 1.2); }
    else ctx.rotate((i % 2 ? 0.08 : -0.06));
    ctx.fillStyle = "#6a4a2a"; ctx.fillRect(-w * 0.62, -30, w * 1.24, 60); ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(-w * 0.62, 18, w * 1.24, 12);
    ctx.fillStyle = "#9aa0a8"; [-w * 0.52, w * 0.52].forEach((nx) => { ctx.beginPath(); ctx.arc(nx, 0, 6, 0, TAU); ctx.fill(); });
    ctx.restore();
  }
}

// ================================================================ NIGHTWATCH: the Castellan Building
function office(ctx, lt, { chairX = null }) {
  const R = room(540, 860, 760, 520);
  drawRoom(ctx, R, { ceil: "#2a2c30", floor: "#3a3c40", left: "#44474c", right: "#40434a", back: "#4a4d52" });
  for (let i = 1; i < 6; i++) { const a = R.ceil(i / 6, 0), b = R.ceil(i / 6, 1); ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }
  for (let z = 0; z < 3; z++) for (let sx = 0; sx < 2; sx++) {   // cubicles
    const d0 = persp(z * 1.6 + 0.4, 2.2), d1 = persp(z * 1.6 + 1.3, 2.2), u0 = sx ? 0.6 : 0.08, u1 = sx ? 0.92 : 0.4;
    const a = R.floor(u0, d0), b = R.floor(u1, d0), c2 = R.floor(u1, d1), d = R.floor(u0, d1), hh = 220 * (1 - d0 * 0.6);
    poly(ctx, [a, b, [b[0], b[1] - hh], [a[0], a[1] - hh]], "#5a5d64"); poly(ctx, [[a[0], a[1] - hh], [b[0], b[1] - hh], [c2[0], c2[1] - hh * 0.8], [d[0], d[1] - hh * 0.8]], "#6a6d74");
    ctx.fillStyle = "#1c1e22"; ctx.fillRect((a[0] + b[0]) / 2 - 40 * (1 - d0 * 0.6), a[1] - hh - 60 * (1 - d0 * 0.6), 80 * (1 - d0 * 0.6), 56 * (1 - d0 * 0.6));
  }
  if (chairX != null) {   // an office chair, rolling on its own
    const [fx, fy] = R.floor(chairX, 0.18), s = 1.25;
    ctx.save(); ctx.translate(fx, fy); ctx.scale(s, s); ctx.rotate(Math.sin(lt * 2) * 0.05);
    ctx.fillStyle = "#15161a"; roundRect(ctx, -60, -260, 120, 150, 24); ctx.fill(); roundRect(ctx, -70, -120, 140, 34, 12); ctx.fill(); ctx.fillRect(-7, -86, 14, 60);
    [-60, -20, 20, 60].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, -14, 11, 0, TAU); ctx.fill(); }); ctx.fillRect(-70, -28, 140, 10);
    ctx.restore();
  }
}
function corridor(ctx, lt, { lights = 0.6 } = {}) {
  const R = room(540, 820, 320, 470);
  drawRoom(ctx, R, { ceil: "#2a2c34", floor: lin(ctx, 0, R.y1, 0, H, [[0, "#3a3e48"], [1, "#1c1e24"]]), left: lin(ctx, 0, 0, R.x0, 0, [[0, "#2a2d36"], [1, "#4a4e5a"]]), right: lin(ctx, W, 0, R.x1, 0, [[0, "#282b34"], [1, "#484c58"]]), back: "#52566a" });
  [[-1, 0.2, 0.3], [1, 0.35, 0.44], [-1, 0.55, 0.61], [1, 0.7, 0.74]].forEach(([sd, d0, d1]) => poly(ctx, quadOnWall(R, sd, d0, d1, 0.2, 1), "#1a1c24"));
  for (let z = 0; z < 6; z++) { const d0 = persp(z * 1.4 + 0.3, 2.2), d1 = persp(z * 1.4 + 0.7, 2.2), on = rng(z + 3)() < lights ? flicker(lt, z * 7 + 2, 5) : 0.1; poly(ctx, [R.ceil(0.38, d0), R.ceil(0.62, d0), R.ceil(0.62, d1), R.ceil(0.38, d1)], on > 0.5 ? "#e8f0ff" : "#4a4e5a"); const [lx, ly] = R.ceil(0.5, (d0 + d1) / 2); light(ctx, lx, ly + 50, 380 * (1 - d0 * 0.7), "rgba(200,215,255,.35)", 0.45 * on); }
  return R;
}
function bedroomCam(ctx, lt, o) {   // Jay's bedroom from a high corner
  ctx.fillStyle = "#1a1828"; ctx.fillRect(-100, -100, W + 200, H + 200);
  poly(ctx, [[0, 1100], [W, 900], [W, H], [0, H]], "#24202e");
  poly(ctx, [[0, 0], [W, 0], [W, 900], [0, 1100]], "#2a2638");
  ctx.fillStyle = "#3a3448"; ctx.fillRect(120, 380, 200, 700); ctx.fillStyle = "#0a0910"; ctx.fillRect(140, 400, 160, 680);   // door
  poly(ctx, [[560, 1220], [1000, 1080], [1040, 1180], [600, 1330]], "#3a3044");   // desk
  ctx.fillStyle = "#08070c"; poly(ctx, [[640, 1000], [930, 920], [940, 1110], [650, 1190]], "#08070c");
  poly(ctx, [[660, 1012], [915, 940], [924, 1098], [668, 1172]], "#6f6aa8");   // monitor glow
  light(ctx, 790, 1080, 700, "rgba(150,140,255,.6)", 0.6);
  drawJay(ctx, 700, 1420, 520, { view: "back", pose: "sit", t: lt, light: 0.75 });
  ctx.fillStyle = "#0e0c14"; roundRect(ctx, 610, 1330, 200, 300, 40); ctx.fill();   // chair back
  const fv = figureVis(lt, o.figT);
  if (fv) barFigure(ctx, 360, 1360, 1000, fv, lt);
  poly(ctx, [[-50, 1500], [460, 1400], [520, 1900], [-50, 1950]], "#2a2236");   // bed
}

// ================================================================ the scenes
const SC = {
  // ---------- Night Shift
  "ns-exterior"(ctx, lt) { starlite(ctx, lt, {}, { jay: { x: 380, h: 300, pose: lt > 1.5 ? "cower" : "stand" } }); },
  "ns-clipboard"(ctx, lt) { clipboard(ctx, lt); },
  "ns-phone"(ctx, lt) {
    const ring = ev("ns-phone", "rings").some((r) => lt >= r && lt < r + 1.3) ? 1 : 0;
    starliteInside(ctx, lt, {}, { clock: "2:00", phoneRing: ring, jay: { x: 470, y: 1500, h: 690, facing: -1, scared: true, shake: 1.2 } });
  },
  "ns-pump"(ctx, lt, o) {
    const on = o.figT != null && lt >= o.figT ? 1 : 0;
    starlite(ctx, lt, {}, { car: true, pumpOn: on, jay: { x: 230, h: 280, pose: on ? "cower" : "stand" } });
  },
  "ns-customer"(ctx, lt) {
    const k = clamp((lt - 0.8) / 1.2);
    starliteInside(ctx, lt, {}, { clock: "3:41", customer: easeInOut(k), reflect: true, jay: { x: 330, y: 1500, h: 690, facing: 1, scared: true } });
  },
  "ns-lookdown"(ctx, lt, o) {
    ctx.fillStyle = "#1a1620"; ctx.fillRect(-100, -100, W + 200, H + 200);
    poly(ctx, [[-100, 640], [W + 100, 640], [W + 100, H + 100], [-100, H + 100]], lin(ctx, 0, 640, 0, H, [[0, "#4a4058"], [1, "#2a2434"]]));   // the counter top
    ctx.fillStyle = "#ff5a3d"; ctx.fillRect(-100, 630, W + 200, 14);
    ctx.fillStyle = "#07060b"; ctx.fillRect(-100, -100, W + 200, 640);   // beyond the counter: a wet black coat
    ctx.fillStyle = "#100e16"; ctx.beginPath(); ctx.moveTo(160, 640); ctx.quadraticCurveTo(540, -200, 920, 640); ctx.fill();
    ctx.fillStyle = "rgba(140,170,220,.12)"; for (let i = 0; i < 14; i++) ctx.fillRect(220 + i * 46, 80 + (i % 3) * 90, 3, 400);
    const gone = o.figT != null && lt > o.figT;
    if (!gone) {   // long grey fingers curl over the edge, and tap
      const taps = ev("ns-lookdown", "taps");
      ctx.lineCap = "round";
      [[330, 0], [690, 1]].forEach(([hx, side]) => {
        ctx.strokeStyle = "#0c0b12"; ctx.lineWidth = 70; ctx.beginPath(); ctx.moveTo(hx + (side ? 120 : -120), 300); ctx.lineTo(hx, 600); ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const up = !side && i === 1 && !taps.some((x) => lt >= x && lt < x + 0.12) ? 26 : 0, fx = hx - 54 + i * 36;
          ctx.strokeStyle = "#a8a8a2"; ctx.lineWidth = 17 - Math.abs(i - 1.5) * 2;
          ctx.beginPath(); ctx.moveTo(fx, 600); ctx.quadraticCurveTo(fx - 4, 650 - up, fx - 2 + (i - 1.5) * 6, 790 - up); ctx.stroke();
          ctx.strokeStyle = "#7a7a74"; ctx.lineWidth = 2.5; for (const k of [0.35, 0.7]) { const ky = 600 + (190 - up) * k; ctx.beginPath(); ctx.moveTo(fx - 7, ky); ctx.lineTo(fx + 6, ky); ctx.stroke(); }
          ctx.fillStyle = "#2a2622"; ctx.beginPath(); ctx.ellipse(fx - 2 + (i - 1.5) * 6, 798 - up, 7, 10, 0, 0, TAU); ctx.fill();
        }
      });
    }
    for (const sx of [-1, 1]) {   // Jay's own hands gripping the near edge
      ctx.save(); ctx.translate(540 + sx * 300, H + 40); ctx.scale(sx, 1);
      ctx.fillStyle = "#ff8a3d"; roundRect(ctx, -110, -140, 220, 260, 70); ctx.fill();
      ctx.fillStyle = "#f0c09a"; roundRect(ctx, -80, -300, 160, 190, 60); ctx.fill();
      ctx.fillStyle = "#e2ad86"; ctx.lineCap = "round"; ctx.strokeStyle = "#e2ad86"; ctx.lineWidth = 34;
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-54 + k * 36, -280); ctx.lineTo(-58 + k * 38, -360 + Math.abs(k - 1.5) * 12); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(70, -230); ctx.lineTo(118, -290); ctx.stroke();
      ctx.restore();
    }
    light(ctx, 540, 1200, 900, "rgba(220,235,255,.35)", 0.4);
    shade(ctx, 540, 1100, 1300, 0.55);
  },
  "ns-flicker"(ctx, lt, o) {
    const off = ev("ns-flicker", "off").some((x) => lt >= x && lt < x + 0.2);
    const run0 = (o.nEnd ?? 5) - 0.3, k = clamp((lt - run0) / 1.3), arrived = k >= 1;
    const slam = o.figT != null ? clamp((lt - o.figT + 0.8) / 0.8) : 0;
    starliteInside(ctx, lt, {}, {
      clock: "4:12", lights: off ? 0.12 : 1,
      jay: { front: true, x: lerp(300, 840, easeInOut(k)), y: 1880, h: 760, view: "side", facing: 1, pose: arrived ? "reach" : k > 0 ? "run" : "stand", phase: lt * 11, scared: true },
      outside: (c, gx) => { if (slam > 0) { const s = lerp(0.3, 1.25, easeInOut(slam)); shadowFigure(c, gx + 150, 1760, 1400 * s, 1, lt, true); if (slam >= 1) { c.fillStyle = "#050507"; [[gx + 60, 900], [gx + 230, 860]].forEach(([hx, hy]) => { c.beginPath(); c.ellipse(hx, hy, 46, 60, 0, 0, TAU); c.fill(); }); } } },
    });
  },
  "ns-dawn"(ctx, lt, o) {
    const k = clamp(lt / Math.max(2, (o.dur || 6) - 1));
    starlite(ctx, lt, {}, { dawn: 0.35 + 0.65 * k });
    drawJay(ctx, lerp(560, 900, k), 1640, 330, { view: "side", facing: 1, pose: "walk", phase: lt * 6, t: lt, light: 0.85, tint: "#3a2030" });
  },
  // ---------- One More Night
  "omn-run"(ctx, lt, o) {
    const k = clamp(lt / Math.max(3, o.dur || 6));
    trees(ctx, lt, { sky: "dusk", scroll: lt * 0.5 });
    const cx = lerp(1400, 760, easeInOut(k));   // the cabin comes into view
    ctx.fillStyle = "#120c10"; poly(ctx, [[cx - 200, 1500], [cx - 200, 1300], [cx, 1180], [cx + 200, 1300], [cx + 200, 1500]], "#120c10");
    ctx.fillStyle = "#ffcf6a"; ctx.fillRect(cx - 60, 1340, 70, 60); light(ctx, cx - 25, 1370, 220, "rgba(255,190,90,.8)", 0.7);
    ctx.fillStyle = "#1a1210"; ctx.fillRect(-100, 1560, W + 200, 30);
    drawJay(ctx, 380, 1640, 420, { view: "side", facing: 1, pose: "run", phase: lt * 13, t: lt, light: 0.7, tint: "#2a0a20" });
    if (o.figT != null) { const fv = figureVis(lt, o.figT); for (let i = 0; i < 3; i++) watcher(ctx, 120 + i * 180 - (lt * 40) % 60, 1330, 420, fv * 0.85, lt); }
  },
  "omn-board"(ctx, lt) {
    cabinWall(ctx, 0.9);
    const hits = ev("omn-board", "hits").filter((x) => lt >= x).length;
    boardedWindow(ctx, lt, 560, 560, 360, 480, Math.min(4, hits), { outside: (c) => trees(c, lt, { sky: "night", layers: [["#0c0c1a", 0, 6], ["#05050a", 0, 4]] }) });
    lantern(ctx, 170, 1230, lt);
    drawJay(ctx, 380, 1680, 760, { view: "side", facing: 1, pose: "hammer", t: lt, light: 0.75, tint: "#140a06" });
  },
  "omn-watchers"(ctx, lt, o) {
    // looking out through a gap between the boards; the flashlight beam sweeps the trees
    trees(ctx, lt, { sky: "night" });
    const beam = 540 + Math.sin(lt * 0.9) * 340;
    const fv = o.figT != null ? 1 : 0, steps = o.figT != null && lt > o.figT ? Math.floor((lt - o.figT) / 1.4) + 1 : 0;
    [[230, 0.3], [560, 0.0], [850, 0.6]].forEach(([x, ph], i) => { const near = Math.min(4, steps + (i === 1 ? 1 : 0)), h = 360 + near * 160; watcher(ctx, x + Math.sin(i * 3) * 20, 1330 + near * 90, h, fv * (0.55 + 0.1 * near), 0); });
    shade(ctx, beam, 1100, 520, 0.92);
    light(ctx, beam, 1100, 300, "rgba(255,250,220,.4)", 0.5);
    ctx.fillStyle = "#1a0f08"; ctx.fillRect(-100, -100, W + 200, 820); ctx.fillRect(-100, 1380, W + 200, 700);   // the boards
    ctx.fillStyle = "#2a1a10"; for (let i = 0; i < 4; i++) { ctx.fillRect(-100, 140 + i * 160, W + 200, 120); ctx.fillRect(-100, 1440 + i * 160, W + 200, 120); }
    ctx.fillStyle = "#9aa0a8"; [[80, 200], [1000, 200], [80, 1500], [1000, 1500]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill(); });
  },
  "omn-door"(ctx, lt) {
    cabinWall(ctx, 0.85);
    const kn = lastBefore(ev("omn-door", "knocks"), lt), jolt = kn != null && lt - kn < 0.2 ? (1 - (lt - kn) / 0.2) * 7 : 0;
    ctx.save(); ctx.translate(jolt, 0);
    ctx.fillStyle = "#3a2414"; ctx.fillRect(560, 560, 400, 1060); ctx.fillStyle = "rgba(0,0,0,.3)"; for (let x = 600; x < 960; x += 80) ctx.fillRect(x, 560, 6, 1060);
    ctx.fillStyle = "#2a180c"; ctx.fillRect(540, 900, 440, 60); ctx.fillRect(540, 1280, 440, 60);
    ctx.fillStyle = "#8a8f98"; ctx.fillRect(590, 1060, 30, 80);
    ctx.restore();
    ctx.fillStyle = "rgba(255,240,200,.55)"; ctx.fillRect(570, 1612, 380, 8); ctx.fillStyle = "#000"; ctx.fillRect(680, 1612, 50, 8); ctx.fillRect(790, 1612, 50, 8);   // feet outside
    lantern(ctx, 170, 1260, lt);
    drawJay(ctx, 330, 1700, 740, { view: "side", facing: 1, pose: "cower", t: lt, light: 0.75, tint: "#140a06", shake: jolt ? 2 : 0.6 });
  },
  "omn-window"(ctx, lt, o) {
    cabinWall(ctx, 0.8);
    const fv = figureVis(lt, o.figT);
    boardedWindow(ctx, lt, 520, 520, 400, 520, 4, {
      popped: [ev("omn-window", "boards")[0], null, ev("omn-window", "boards")[1], ev("omn-window", "boards")[2]],
      outside: (c) => { trees(c, lt, { sky: "night", layers: [["#0c0c1a", 0, 6]] }); if (fv) { c.fillStyle = "#0a0808"; c.beginPath(); c.ellipse(720, 820, 120, 160, 0, 0, TAU); c.fill(); c.fillStyle = "#e8e4ff"; c.beginPath(); c.ellipse(690, 790, 8, 5, 0, 0, TAU); c.ellipse(750, 790, 8, 5, 0, 0, TAU); c.fill(); } },
    });
    if (fv) {   // a long grey arm reaching in
      const k = easeInOut(clamp((lt - o.figT) / 0.7));
      ctx.strokeStyle = "#8a8680"; ctx.lineCap = "round"; ctx.lineWidth = 40; ctx.beginPath(); ctx.moveTo(760, 800); ctx.quadraticCurveTo(620, 900, lerp(700, 420, k), lerp(880, 1060, k)); ctx.stroke();
      ctx.lineWidth = 10; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(lerp(700, 420, k), lerp(880, 1060, k)); ctx.lineTo(lerp(700, 420, k) - 70 + i * 20, lerp(880, 1060, k) + 60 + i * 8); ctx.stroke(); }
    }
    lantern(ctx, 150, 1260, lt);
    drawJay(ctx, lerp(380, 250, clamp((lt - 1.2) / 2)), 1700, 740, { view: "side", facing: 1, pose: "cower", t: lt, light: 0.75, tint: "#140a06", shake: 1.5 });
  },
  "omn-radio"(ctx, lt) {
    cabinWall(ctx, 0.7);
    ctx.fillStyle = "#2a1a10"; ctx.fillRect(-100, 1400, W + 200, 600);
    ctx.fillStyle = "#5a3a22"; roundRect(ctx, 120, 620, 840, 760, 40); ctx.fill(); ctx.fillStyle = "#3a2414"; roundRect(ctx, 150, 650, 780, 700, 30); ctx.fill();
    ctx.fillStyle = "#2a1c14"; ctx.fillRect(190, 690, 340, 400); ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 3; for (let y = 700; y < 1090; y += 14) { ctx.beginPath(); ctx.moveTo(190, y); ctx.lineTo(530, y); ctx.stroke(); }
    ctx.fillStyle = "#f0e2b0"; roundRect(ctx, 570, 700, 330, 160, 16); ctx.fill();
    ctx.fillStyle = "#3a2a14"; ctx.font = "700 22px 'Courier New', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; [88, 92, 96, 100, 104, 108].forEach((f, i) => ctx.fillText(f, 600 + i * 54, 820)); ctx.fillRect(590, 790, 290, 3);
    const freq = lerp(91, 107, easeInOut(clamp((lt - 0.9) / 2.4))), nx = 600 + (freq - 88) / 20 * 270;
    ctx.fillStyle = "#c0141f"; ctx.fillRect(nx - 3, 712, 6, 80);
    const tuned = freq > 106.6; ctx.fillStyle = tuned ? "#3dff7a" : "#ff3b3b"; ctx.beginPath(); ctx.arc(860, 920, 16, 0, TAU); ctx.fill(); light(ctx, 860, 920, 120, tuned ? "rgba(60,255,120,.8)" : "rgba(255,60,60,.8)", 0.6);
    ctx.save(); ctx.translate(740, 1140); ctx.rotate(lt * 2.6 * (tuned ? 0 : 1) + (tuned ? 4.2 : 0)); ctx.fillStyle = "#1a120c"; ctx.beginPath(); ctx.arc(0, 0, 90, 0, TAU); ctx.fill(); ctx.fillStyle = "#c9a26a"; ctx.fillRect(-6, -84, 12, 40); ctx.restore();
    ctx.fillStyle = "#c0141f"; ctx.font = "400 46px 'Permanent Marker', sans-serif"; ctx.fillText("107!", 300, 1260);
    lantern(ctx, 1010, 1300, lt);
  },
  "omn-dawn"(ctx, lt) {
    trees(ctx, lt, { sky: "dawn" });
    poly(ctx, [[60, 1560], [60, 1330], [260, 1210], [460, 1330], [460, 1560]], "#1a1014"); ctx.fillStyle = "#2a1a14"; ctx.fillRect(220, 1440, 80, 120);
    const hx = 760 + Math.sin(lt * 0.6) * 30, hy = 360 + Math.sin(lt * 1.1) * 12;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.18; poly(ctx, [[hx - 20, hy + 40], [hx + 40, hy + 40], [700, 1700], [440, 1700]], "#fff6d8"); ctx.restore();
    ctx.fillStyle = "#14101a"; ctx.beginPath(); ctx.ellipse(hx, hy, 120, 46, 0, 0, TAU); ctx.fill(); ctx.fillRect(hx + 80, hy - 14, 170, 22); ctx.fillRect(hx - 60, hy + 40, 130, 8);
    ctx.fillStyle = "rgba(20,16,26,.5)"; ctx.fillRect(hx - 230, hy - 64, 460, 8 + Math.abs(Math.sin(lt * 40)) * 6);
    drawJay(ctx, 580, 1680, 420, { view: "front", pose: "wave", t: lt, light: 0.9, tint: "#402030" });
  },
  // ---------- Nightwatch
  "nw-desk"(ctx, lt) {
    ctx.fillStyle = "#0c0d12"; ctx.fillRect(-100, -100, W + 200, H + 200);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const x = 60 + c * 245, y = 300 + r * 250, me = r === 1 && c === 3;
      ctx.fillStyle = "#050608"; roundRect(ctx, x, y, 225, 225, 10); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.rect(x + 10, y + 10, 205, 180); ctx.clip();
      ctx.fillStyle = "#3a4a44"; ctx.fillRect(x + 10, y + 10, 205, 180);
      if (me) { ctx.fillStyle = "#2a3430"; ctx.fillRect(x + 10, y + 120, 205, 70); drawJay(ctx, x + 70, y + 190, 150, { view: "back", pose: "sit", tint: "#3a4a44", light: 0.4, t: lt }); }
      else { const vx = x + 112, vy = y + 90; ctx.fillStyle = "#2a3430"; poly(ctx, [[x + 10, y + 190], [vx - 20, vy], [vx + 20, vy], [x + 215, y + 190]], "#2a3430"); poly(ctx, [[x + 10, y + 10], [vx - 20, vy - 20], [vx + 20, vy - 20], [x + 215, y + 10]], "#33403a"); }
      ctx.fillStyle = "rgba(0,0,0,.25)"; for (let yy = y + 10; yy < y + 190; yy += 4) ctx.fillRect(x + 10, yy, 205, 1);
      ctx.restore();
      ctx.fillStyle = "rgba(200,255,220,.7)"; ctx.font = "700 18px 'Courier New', monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(`CAM ${pad2(r * 4 + c + 1)}`, x + 16, y + 196);
      if (me && Math.sin(lt * 6) > 0) { ctx.strokeStyle = "#ff3b3b"; ctx.lineWidth = 6; roundRect(ctx, x - 4, y - 4, 233, 233, 12); ctx.stroke(); }
      light(ctx, x + 112, y + 100, 260, "rgba(140,220,180,.35)", 0.35);
    }
    poly(ctx, [[-100, 1100], [W + 100, 1100], [W + 100, 1250], [-100, 1250]], "#1c1e24");
    ctx.fillStyle = "#2a2c34"; ctx.fillRect(560, 1140, 260, 40); ctx.fillStyle = "#3a2a20"; ctx.fillRect(880, 1110, 50, 70);
    drawJay(ctx, 300, 1640, 1000, { view: "back", pose: "sit", t: lt, light: 0.55, tint: "#0c1410" });
    ctx.fillStyle = "#0a0a0e"; roundRect(ctx, 170, 1420, 260, 520, 60); ctx.fill();
  },
  "nw-cam-office"(ctx, lt, o) {
    const k = clamp((lt - 1.0) / Math.max(2.5, (o.nEnd ?? 5) - 1.2));
    office(ctx, lt, { chairX: lerp(0.15, 0.62, easeInOut(k)) });
    cctvLook(ctx, lt, { cam: "CAM 07", place: "FLOOR 2 · OFFICE", time: "03:12:40" });
  },
  "nw-elevator"(ctx, lt) {
    ctx.fillStyle = "#5a5e66"; ctx.fillRect(-100, -100, W + 200, H + 200);
    poly(ctx, [[0, 0], [W, 0], [880, 520], [200, 520]], "#4a4e56"); poly(ctx, [[200, 520], [880, 520], [960, 1500], [120, 1500]], "#6a6e76");
    poly(ctx, [[120, 1500], [960, 1500], [W + 100, H + 100], [-100, H + 100]], "#3a3c42");
    const open = clamp((lt - ev("nw-elevator", "open")[0]) / 0.9);
    ctx.fillStyle = "#000"; ctx.fillRect(330, 640, 420, 860);
    if (open > 0.6) { ctx.globalAlpha = (open - 0.6) * 2; shadowFigure(ctx, 600, 1490, 760, 0.6, lt, true, "#050507"); ctx.globalAlpha = 1; }
    ctx.fillStyle = "#8a8e96"; ctx.fillRect(330 - open * 200, 640, 210, 860); ctx.fillRect(540 + open * 200, 640, 210, 860);
    ctx.fillStyle = "#1a0a0a"; ctx.fillRect(470, 540, 140, 80);
    const floor = lt < 0.6 ? "5" : lt < ev("nw-elevator", "ding")[0] ? "4" : "3";
    ctx.fillStyle = floor === "3" && Math.sin(lt * 14) > -0.5 ? "#ff2a2a" : "#ff6a4a"; ctx.font = "700 64px 'Courier New', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(floor, 540, 582);
    ctx.strokeStyle = "#9aa0a8"; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(140, 1250); ctx.lineTo(220, 980); ctx.stroke();
    drawJay(ctx, 540, 1660, 820, { view: "back", pose: open > 0.3 ? "cower" : "stand", t: lt, light: 0.8, shake: open > 0.3 ? 1.5 : 0 });
    cctvLook(ctx, lt, { cam: "CAM 11", place: "ELEVATOR B", time: "03:58:21" });
  },
  "nw-hall"(ctx, lt, o) {
    const R = corridor(ctx, lt, { lights: 0.5 });
    const fv = figureVis(lt, o.figT);
    if (fv) barFigure(ctx, R.vx, R.y1 - 4, 460, fv, lt);
    const fx = 540 + Math.sin(lt * 0.8) * 120; shade(ctx, fx, 860, 900, 0.86); light(ctx, fx, 860, 380, "rgba(255,250,220,.35)", 0.45);
  },
  "nw-locker"(ctx, lt, o) {
    ctx.fillStyle = "#4a4e58"; ctx.fillRect(-100, 600, W + 200, 600);   // the lit hallway, seen through the vents
    ctx.fillStyle = "#3a3e48"; ctx.fillRect(-100, 1000, W + 200, 200);
    const steps = ev("nw-locker", "steps"), n = steps.filter((x) => lt >= x).length, x = lerp(-300, 540, clamp(n / steps.length));
    const fv = figureVis(lt, o.figT);
    if (n > 0) { ctx.fillStyle = "#07070a"; const sw = Math.sin(lt * 4) * 20; ctx.fillRect(x - 70 + sw, 480, 60, 720); ctx.fillRect(x + 20 - sw, 480, 60, 720); ctx.fillRect(x - 100, 300, 220, 300); }
    if (fv) { const k = easeInOut(clamp((lt - o.figT) / 0.35)); ctx.save(); ctx.translate(540, lerp(300, 880, k)); ctx.scale(2.2, 2.2); ctx.fillStyle = "#d8d2c6"; ctx.beginPath(); ctx.ellipse(0, 0, 90, 120, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#000"; ctx.fillRect(-150, -60, 300, 70); ctx.fillStyle = "#3a1414"; ctx.fillRect(-26, 60, 52, 8); ctx.restore(); }
    ctx.fillStyle = "#0a0b0e"; ctx.fillRect(-100, -100, W + 200, 720); ctx.fillRect(-100, 1180, W + 200, 900);
    for (let i = 0; i < 7; i++) { ctx.fillStyle = "#14161c"; ctx.fillRect(-100, 620 + i * 80, W + 200, 44); ctx.fillStyle = "rgba(255,255,255,.04)"; ctx.fillRect(-100, 620 + i * 80, W + 200, 4); }
    ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(-100, -100, 140, H + 200); ctx.fillRect(W - 40, -100, 140, H + 200);
  },
  "nw-tape"(ctx, lt, o) {
    const R = corridor(ctx, lt, { lights: 0.8 });
    const k = clamp(lt / Math.max(3, o.dur || 6)), d = lerp(0.08, 0.6, k), [jx, jy] = R.floor(0.5, d);
    drawJay(ctx, jx, jy, (jy - R.ceil(0.5, d)[1]) * 0.62, { view: "back", pose: "walk", phase: lt * 6, t: lt, light: 0.85 });
    const fv = figureVis(lt, o.figT);
    if (fv) { const dd = Math.max(0.02, d - 0.18), [fx, fy] = R.floor(0.42, dd); barFigure(ctx, fx, fy, (fy - R.ceil(0.5, dd)[1]) * 0.95, fv, lt); }
    cctvLook(ctx, lt, { tape: true, time: "05:12:44" });
  },
  "nw-lobby"(ctx, lt, o) {
    const k = clamp(lt / Math.max(2.5, (o.dur || 5) - 0.5));
    ctx.fillStyle = "#2a2a34"; ctx.fillRect(-100, -100, W + 200, H + 200);
    const R = room(540, 860, 640, 900);
    drawRoom(ctx, R, { ceil: "#1c1c24", floor: lin(ctx, 0, R.y1, 0, H, [[0, "#6a6070"], [1, "#2a2630"]]), left: "#2e2c36", right: "#2c2a34", back: lin(ctx, 0, R.y0, 0, R.y1, [[0, "#ffb27a"], [1, "#ffe2b0"]]) });
    ctx.strokeStyle = "#1a1820"; ctx.lineWidth = 16; for (let i = 0; i <= 4; i++) { const x = R.x0 + i * (R.x1 - R.x0) / 4; ctx.beginPath(); ctx.moveTo(x, R.y0); ctx.lineTo(x, R.y1); ctx.stroke(); }
    light(ctx, 540, 860, 900, "rgba(255,220,170,.8)", 0.5 + k * 0.4);
    const d = lerp(0.05, 0.75, easeInOut(k)), [jx, jy] = R.floor(0.5, d);
    drawJay(ctx, jx, jy, (jy - R.ceil(0.5, d)[1]) * 0.6, { view: "back", pose: "run", phase: lt * 12, t: lt, light: 0.6, tint: "#3a2030" });
    const wash = clamp((k - 0.75) / 0.25) * 0.85; if (wash > 0) { ctx.fillStyle = `rgba(255,236,210,${wash})`; ctx.fillRect(-100, -100, W + 200, H + 200); }
  },
  "nw-cam13"(ctx, lt, o) { bedroomCam(ctx, lt, o); cctvLook(ctx, lt, { cam: "CAM 13", place: "JAY'S ROOM", time: "02:00:00" }); },
  // ---------- back in Jay's room
  "bedroom-call"(ctx, lt, o) {
    getScene("bedroom")(ctx, lt, { ...o, figT: null });
    const ring = ev("bedroom-call", "rings").some((r) => lt >= r && lt < r + 1.2), j = ring ? Math.sin(lt * 70) * 5 : 0;
    // his phone, face up on the desk right in front of us
    ctx.save(); ctx.translate(300 + j, 1160); ctx.rotate(-0.12); ctx.scale(2.2, 2.2);
    ctx.fillStyle = "#08080c"; roundRect(ctx, -62, -110, 124, 220, 18); ctx.fill(); ctx.fillStyle = ring ? "#1e2240" : "#101222"; roundRect(ctx, -56, -104, 112, 208, 14); ctx.fill();
    ctx.fillStyle = "#8a8aa8"; ctx.font = "600 10px Inter, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("incoming call", 0, -64);
    ctx.fillStyle = "#fff"; ctx.font = "700 22px Inter, sans-serif"; ctx.fillText("DANNY", 0, -40); ctx.fillStyle = "#c8c8e0"; ctx.font = "600 10px Inter, sans-serif"; ctx.fillText("Starlite · Route 9", 0, -20);
    ctx.fillStyle = "#ff3b4f"; ctx.beginPath(); ctx.arc(-30, 70, 15, 0, TAU); ctx.fill(); ctx.fillStyle = "#3dd16a"; ctx.beginPath(); ctx.arc(30, 70, 15, 0, TAU); ctx.fill();
    ctx.restore();
    if (ring) light(ctx, 300, 1160, 460, "rgba(170,170,255,.6)", 0.6);
  },
  "bedroom-knock"(ctx, lt, o) {
    getScene("bedroom")(ctx, lt, { ...o, figT: null });
    const R = room(610, 800, 560, 760), dx = R.x0 + 22, dy = R.y1 - 430;
    const kn = lastBefore(ev("bedroom-knock", "knocks"), lt), jolt = kn != null && lt - kn < 0.2 ? (1 - (lt - kn) / 0.2) * 5 : 0;
    ctx.fillStyle = "#2a2240"; ctx.fillRect(dx - 8, dy - 8, 144, 446);   // the frame
    ctx.fillStyle = "#3a3052"; ctx.fillRect(dx + jolt, dy, 128, 430);   // the door, shut now
    ctx.strokeStyle = "#241c36"; ctx.lineWidth = 5; ctx.strokeRect(dx + 16 + jolt, dy + 24, 96, 160); ctx.strokeRect(dx + 16 + jolt, dy + 220, 96, 180);
    ctx.fillStyle = "#c9a96a"; ctx.beginPath(); ctx.arc(dx + 110 + jolt, dy + 225, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,210,150,.95)"; ctx.fillRect(dx, dy + 428, 128, 7); ctx.fillStyle = "#000"; ctx.fillRect(dx + 30, dy + 428, 24, 7); ctx.fillRect(dx + 72, dy + 428, 24, 7);
    light(ctx, dx + 64, dy + 440, 200, "rgba(255,200,140,.6)", 0.6);
  },
};

registerScenes(SC, {
  "nw-cam-office": { drift: false, grade: "none", grain: false, vignette: false },
  "nw-elevator": { drift: false, grade: "none", grain: false, vignette: false },
  "nw-tape": { drift: false, grade: "none", grain: false, vignette: false },
  "nw-cam13": { drift: false, grade: "none", grain: false, vignette: false },
  "ns-dawn": { grade: "warm" }, "omn-dawn": { grade: "warm" }, "omn-run": { grade: "warm" }, "nw-lobby": { grade: "warm" },
  "nw-desk": { grade: "green" }, "nw-hall": { grade: "green" }, "nw-locker": { grade: "green" },
});

export const NEW_SCENES = [
  ["ns-exterior", "Night Shift: the Starlite at night (Jay inside)"], ["ns-clipboard", "Night Shift: the rules clipboard"], ["ns-phone", "Night Shift: the 2 AM phone call"],
  ["ns-pump", "Night Shift: a car at pump 4 (figure: pump turns on)"], ["ns-customer", "Night Shift: the customer with no reflection"], ["ns-lookdown", "Night Shift: looking down, grey fingers"],
  ["ns-flicker", "Night Shift: lights flicker, run to the door"], ["ns-dawn", "Night Shift: dawn, shift over"],
  ["omn-run", "One More Night: running to the cabin at dusk"], ["omn-board", "One More Night: boarding up the window"], ["omn-watchers", "One More Night: watchers in the trees"],
  ["omn-door", "One More Night: knocking at the door"], ["omn-window", "One More Night: boards torn off (figure: the arm)"], ["omn-radio", "One More Night: tuning the radio"], ["omn-dawn", "One More Night: rescue at dawn"],
  ["nw-desk", "Nightwatch: the camera desk"], ["nw-cam-office", "Nightwatch: CCTV, the chair moves"], ["nw-elevator", "Nightwatch: CCTV, elevator to floor 3"], ["nw-hall", "Nightwatch: the tall thing in the hall"],
  ["nw-locker", "Nightwatch: hiding in a locker"], ["nw-tape", "Nightwatch: the tape from 5:12 AM"], ["nw-lobby", "Nightwatch: running for the doors"], ["nw-cam13", "Nightwatch: CCTV camera 13 (your room)"],
  ["bedroom-call", "Bedroom: phone ringing (Danny)"], ["bedroom-knock", "Bedroom: knocking at the door"],
].map(([id, label]) => ({ id, label }));
