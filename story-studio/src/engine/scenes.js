// Full-screen scenes the story cuts away to while the narrator speaks: rooms of a house at night,
// drawn with Canvas 2D in one-point perspective (no image files). Each scene moves: a handheld camera
// drift, a slow push in, flickering lights, a swaying flashlight or bulb, and an optional shadow figure.
import { rng, roundRect, clamp, lerp, easeInOut } from "./util.js";

const W = 1080, H = 1920, TAU = Math.PI * 2;
const INK = "#0b0d1a", LIME = "#c6ff3d";

// ---------------------------------------------------------------- helpers
export function poly(ctx, pts, fill) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
export function lin(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
export function light(ctx, x, y, r, color, a = 1) {
  if (a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
export function shade(ctx, x, y, r, a) {   // darkness everywhere except around (x, y)
  const g = ctx.createRadialGradient(x, y, r * 0.08, x, y, r);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.5, `rgba(1,1,6,${a * 0.38})`); g.addColorStop(1, `rgba(1,1,6,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
export function flicker(t, seed = 1, rate = 9) {   // 1 = on; drops out in short random bursts
  const r = rng(Math.floor(t * rate) * 7 + seed)();
  return r < 0.12 ? 0.15 : r < 0.2 ? 0.6 : 1;
}

// a room seen from inside: back wall rectangle + floor, ceiling and side walls running to the frame edges
export function room(vx, vy, bw, bh) {
  const x0 = vx - bw / 2, x1 = vx + bw / 2, y0 = vy - bh / 2, y1 = vy + bh / 2;
  // a point on a side wall: d = depth (0 at the camera, 1 at the back wall), v = height (0 ceiling, 1 floor)
  const wall = (side, d, v) => { const x = side < 0 ? d * x0 : W + d * (x1 - W); const yt = d * y0, yb = H + d * (y1 - H); return [x, yt + v * (yb - yt)]; };
  const floor = (u, d) => { const xl = d * x0, xr = W + d * (x1 - W); return [lerp(xl, xr, u), H + d * (y1 - H)]; };
  const ceil = (u, d) => { const xl = d * x0, xr = W + d * (x1 - W); return [lerp(xl, xr, u), d * y0]; };
  return { x0, x1, y0, y1, vx, vy, wall, floor, ceil };
}
export const persp = (z, c = 1.6) => z / (z + c);   // evenly spaced real distances -> 0..1 depth

export function drawRoom(ctx, R, c) {
  poly(ctx, [[0, 0], [W, 0], [R.x1, R.y0], [R.x0, R.y0]], c.ceil);
  poly(ctx, [[0, H], [W, H], [R.x1, R.y1], [R.x0, R.y1]], c.floor);
  poly(ctx, [[0, 0], [R.x0, R.y0], [R.x0, R.y1], [0, H]], c.left);
  poly(ctx, [[W, 0], [R.x1, R.y0], [R.x1, R.y1], [W, H]], c.right);
  ctx.fillStyle = c.back; ctx.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0);
}
export function quadOnWall(R, side, d0, d1, v0, v1) { return [R.wall(side, d0, v0), R.wall(side, d1, v0), R.wall(side, d1, v1), R.wall(side, d0, v1)]; }

// a tall thin silhouette with pale eyes. a = visibility 0..1
export function shadowFigure(ctx, x, footY, h, a, t, eyes = true, body = "#010103") {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, footY); const s = h / 600; ctx.scale(s, s); ctx.rotate(Math.sin(t * 0.7) * 0.015);
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(0, -548, 30, 44, 0, 0, TAU); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-12, -508); ctx.quadraticCurveTo(-74, -490, -78, -440);          // shoulder
  ctx.quadraticCurveTo(-96, -300, -92, -150); ctx.lineTo(-80, -148);          // long arm
  ctx.quadraticCurveTo(-70, -300, -52, -380); ctx.lineTo(-44, -250);
  ctx.lineTo(-36, 0); ctx.lineTo(-10, 0); ctx.lineTo(-4, -230); ctx.lineTo(4, -230); ctx.lineTo(10, 0); ctx.lineTo(36, 0); ctx.lineTo(44, -250);
  ctx.lineTo(52, -380); ctx.quadraticCurveTo(70, -300, 80, -148); ctx.lineTo(92, -150);
  ctx.quadraticCurveTo(96, -300, 78, -440); ctx.quadraticCurveTo(74, -490, 12, -508);
  ctx.closePath(); ctx.fill();
  if (eyes) {
    const blink = Math.sin(t * 1.3) > 0.97 ? 0.15 : 1;
    ctx.fillStyle = "#f2f0ff"; ctx.shadowColor = "#d8d4ff"; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.ellipse(-12, -552, 5, 3.5 * blink, 0.1, 0, TAU); ctx.ellipse(12, -552, 5, 3.5 * blink, -0.1, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// it flickers into view at time figT (seconds, scene-local) and stays
export function figureVis(t, figT) {
  if (figT == null || t < figT) return 0;
  const k = t - figT;
  if (k < 0.55) return [1, 0, 0.8, 0, 1, 0.2, 1][Math.floor(k / 0.08) % 7];
  return 1;
}

export function grain(ctx, t, a = 0.05) {
  const r = rng(Math.floor(t * 24) + 3);
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  for (let i = 0; i < 260; i++) ctx.fillRect(r() * W, r() * H, 2, 2);
  ctx.fillStyle = `rgba(0,0,0,${a * 2})`;
  for (let i = 0; i < 260; i++) ctx.fillRect(r() * W, r() * H, 3, 3);
}
export function vignette(ctx, a = 0.75) {
  const g = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.22, W / 2, H * 0.5, H * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,4,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
export function dust(ctx, t, n, cx, cy, rad, seed = 5) {
  const r = rng(seed);
  ctx.fillStyle = "#fff";
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * rad, sp = 6 + r() * 14;
    const x = cx + Math.cos(a) * d + Math.sin(t * 0.4 + i) * 12, y = cy + Math.sin(a) * d - ((t * sp + i * 37) % 80) + 40;
    ctx.globalAlpha = 0.12 + 0.18 * Math.abs(Math.sin(t * 0.9 + i));
    ctx.beginPath(); ctx.arc(x, y, 1.4 + r() * 2.2, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- Pulsebox in a browser (used on the bedroom monitor and the computer close-up)
const LOGO = typeof Path2D !== "undefined" ? new Path2D("M7 7h10v4h-4v2h4v4H7v-4h2v-2H7z") : null;
export function logoMark(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24);
  ctx.fillStyle = LIME; roundRect(ctx, 0, 0, 24, 24, 6); ctx.fill();
  if (LOGO) { ctx.fillStyle = INK; ctx.fill(LOGO); }
  ctx.restore();
}
const GAMES = [
  ["STILL HERE", "#5a1020", "#14060c", "eye"], ["ONE MORE NIGHT", "#123a2a", "#050d0a", "cabin"], ["DEAD AIR", "#2a2350", "#0a0816", "ghost"], ["NIGHT SHIFT", "#55301a", "#120a06", "pump"],
  ["NIGHTWATCH", "#173048", "#060b12", "cam"], ["THE ENDLESS HALLS", "#4a4010", "#100e04", "hall"], ["DEEP SIGNAL", "#0c3a48", "#03101a", "sonar"], ["LIGHTS OUT MOTEL", "#4a1240", "#10040e", "key"],
];
function tileArt(ctx, kind, x, y, w, h, t) {
  const cx = x + w / 2, cy = y + h * 0.42;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = Math.max(1.5, w * 0.025);
  const s = h * 0.22;
  switch (kind) {
    case "eye": ctx.beginPath(); ctx.moveTo(cx - s, cy); ctx.quadraticCurveTo(cx, cy - s * 0.8, cx + s, cy); ctx.quadraticCurveTo(cx, cy + s * 0.8, cx - s, cy); ctx.stroke(); ctx.fillStyle = "#ff3d6e"; ctx.beginPath(); ctx.arc(cx, cy, s * 0.28, 0, TAU); ctx.fill(); break;
    case "cabin": ctx.beginPath(); ctx.moveTo(cx - s, cy + s * 0.6); ctx.lineTo(cx - s, cy); ctx.lineTo(cx, cy - s * 0.7); ctx.lineTo(cx + s, cy); ctx.lineTo(cx + s, cy + s * 0.6); ctx.closePath(); ctx.stroke(); ctx.fillStyle = "#ffcf5a"; ctx.fillRect(cx - s * 0.2, cy + s * 0.05, s * 0.4, s * 0.3); break;
    case "ghost": ctx.beginPath(); ctx.arc(cx, cy - s * 0.1, s * 0.5, Math.PI, 0); ctx.lineTo(cx + s * 0.5, cy + s * 0.6); for (let i = 0; i < 4; i++) ctx.lineTo(cx + s * 0.5 - (i + 0.5) * s * 0.25, cy + s * (i % 2 ? 0.6 : 0.4)); ctx.lineTo(cx - s * 0.5, cy + s * 0.6); ctx.closePath(); ctx.fill(); break;
    case "pump": ctx.strokeRect(cx - s * 0.35, cy - s * 0.6, s * 0.7, s * 1.2); ctx.font = `700 ${s * 0.7}px 'Chakra Petch', sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#ff3d3d"; ctx.fillText("4", cx, cy); break;
    case "cam": ctx.strokeRect(cx - s * 0.6, cy - s * 0.35, s * 1.2, s * 0.7); ctx.fillStyle = "#ff3d3d"; ctx.beginPath(); ctx.arc(cx + s * 0.4, cy - s * 0.18, s * 0.08 * (0.5 + 0.5 * Math.sin(t * 6)), 0, TAU); ctx.fill(); break;
    case "hall": for (let i = 1; i < 5; i++) { const k = i / 5; ctx.strokeRect(cx - s * k, cy - s * k * 0.8, s * k * 2, s * k * 1.6); } break;
    case "sonar": for (let i = 1; i < 4; i++) { ctx.globalAlpha = 1 - i / 4; ctx.beginPath(); ctx.arc(cx, cy, s * i * 0.32 + ((t * 20) % (s * 0.32)), 0, TAU); ctx.stroke(); } ctx.globalAlpha = 1; break;
    case "key": ctx.beginPath(); ctx.arc(cx - s * 0.3, cy, s * 0.25, 0, TAU); ctx.moveTo(cx - s * 0.05, cy); ctx.lineTo(cx + s * 0.6, cy); ctx.lineTo(cx + s * 0.6, cy + s * 0.2); ctx.stroke(); break;
  }
  ctx.restore();
}
export function drawPulseboxScreen(ctx, x, y, w, h, t) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = "#0b0d14"; ctx.fillRect(x, y, w, h);
  const u = w / 100;                                   // layout unit: 1% of the screen width
  // browser bar
  const bh = u * 7.2;
  ctx.fillStyle = "#1b1e2a"; ctx.fillRect(x, y, w, bh);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + u * (2.2 + i * 2.2), y + bh / 2, u * 0.75, 0, TAU); ctx.fill(); });
  ctx.fillStyle = "#0e1018"; roundRect(ctx, x + u * 10, y + bh * 0.18, w - u * 14, bh * 0.64, bh * 0.32); ctx.fill();
  ctx.fillStyle = "#9aa3c7"; ctx.font = `600 ${u * 3}px Inter, sans-serif`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillText("🔒", x + u * 11.6, y + bh / 2 + u * 0.1);
  ctx.fillStyle = "#fff"; ctx.font = `600 ${u * 3.3}px Inter, sans-serif`;
  ctx.fillText("box.pulseform.org", x + u * 15.5, y + bh / 2 + u * 0.1);
  // header
  const hy = y + bh + u * 3;
  logoMark(ctx, x + u * 3, hy, u * 6);
  ctx.font = `700 ${u * 5.2}px 'Chakra Petch', Inter, sans-serif`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillStyle = "#fff"; ctx.fillText("PULSE", x + u * 10.5, hy + u * 3.2);
  ctx.fillStyle = LIME; ctx.fillText("BOX", x + u * 10.5 + ctx.measureText("PULSE").width, hy + u * 3.2);
  ctx.fillStyle = "#a56bff33"; roundRect(ctx, x + w - u * 24, hy + u * 0.4, u * 21, u * 5.4, u * 2.7); ctx.fill();
  ctx.fillStyle = "#c9a6ff"; ctx.font = `700 ${u * 2.8}px 'Chakra Petch', Inter, sans-serif`; ctx.textAlign = "center";
  ctx.fillText("👻 HORROR", x + w - u * 13.5, hy + u * 3.2);
  // game grid
  const gy = hy + u * 9.5, cols = 4, gap = u * 2, tw = (w - u * 6 - gap * (cols - 1)) / cols, th = tw * 0.82;
  GAMES.forEach(([name, c1, c2, kind], i) => {
    const gx = x + u * 3 + (i % cols) * (tw + gap), yy = gy + Math.floor(i / cols) * (th + gap);
    if (yy > y + h) return;
    ctx.fillStyle = lin(ctx, gx, yy, gx, yy + th, [[0, c1], [1, c2]]); roundRect(ctx, gx, yy, tw, th, u * 1.6); ctx.fill();
    tileArt(ctx, kind, gx, yy, tw, th * 0.8, t);
    ctx.fillStyle = "#fff"; ctx.font = `700 ${Math.min(u * 2.4, tw / (name.length * 0.62))}px 'Chakra Petch', Inter, sans-serif`; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(name, gx + u * 1.2, yy + th - u * 1.4);
    if (i === 0) { ctx.strokeStyle = LIME; ctx.lineWidth = u * 0.45; roundRect(ctx, gx, yy, tw, th, u * 1.6); ctx.stroke(); }
  });
  // screen sheen + scanlines
  ctx.fillStyle = lin(ctx, x, y, x + w, y + h, [[0, "rgba(255,255,255,.06)"], [0.5, "rgba(255,255,255,0)"]]); ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 0.07; ctx.fillStyle = "#000"; for (let sy = y; sy < y + h; sy += 4) ctx.fillRect(x, sy, w, 2); ctx.globalAlpha = 1;
  ctx.restore();
}

// ---------------------------------------------------------------- the scenes
// lt: seconds since the scene appeared; o: { figT (scene-local seconds or null), seed }
const SCENES = {
  bedroom(ctx, lt, o) {
    const R = room(610, 800, 560, 760);
    drawRoom(ctx, R, { ceil: "#07060d", floor: lin(ctx, 0, R.y1, 0, H, [[0, "#110e1c"], [1, "#07060c"]]), left: lin(ctx, 0, 0, R.x0, 0, [[0, "#0a0914"], [1, "#151229"]]), right: lin(ctx, W, 0, R.x1, 0, [[0, "#09080f"], [1, "#14112a"]]), back: lin(ctx, 0, R.y0, 0, R.y1, [[0, "#151330"], [1, "#100e22"]]) });
    // window with moonlight and blinds
    const wx = R.x1 - 220, wy = R.y0 + 40;
    ctx.fillStyle = lin(ctx, 0, wy, 0, wy + 220, [[0, "#2a3f78"], [1, "#16224a"]]); ctx.fillRect(wx, wy, 180, 220);
    ctx.fillStyle = "#0c0b18"; for (let i = 0; i < 10; i++) ctx.fillRect(wx, wy + 8 + i * 22, 180, 9);
    ctx.strokeStyle = "#07060c"; ctx.lineWidth = 10; ctx.strokeRect(wx, wy, 180, 220);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.07; poly(ctx, [[wx, wy + 220], [wx + 180, wy + 220], [wx + 520, H], [wx - 60, H]], "#6f8cff"); ctx.restore();
    // a poster, and the bedroom door on the left wall: open, a dim hallway light behind it
    poly(ctx, quadOnWall(R, -1, 0.22, 0.38, 0.22, 0.48), "#2a0c16");
    // desk, monitor (Pulsebox), keyboard
    const sx = 515, sy = 742, sw = 360, sh = 212, glowK = 0.85 + 0.15 * flicker(lt, 3, 6);
    ctx.fillStyle = "#0d0b16"; ctx.fillRect(470, 1050, 450, 30); ctx.fillStyle = "#08070e"; ctx.fillRect(490, 1080, 24, 130); ctx.fillRect(876, 1080, 24, 130);
    poly(ctx, [[460, 1050], [930, 1050], [900, 1010], [490, 1010]], "#17142a");
    ctx.fillStyle = "#06050a"; ctx.fillRect(680, 950, 30, 62); ctx.fillRect(635, 1004, 120, 10);
    ctx.fillStyle = "#05050a"; roundRect(ctx, sx - 14, sy - 14, sw + 28, sh + 28, 12); ctx.fill();
    drawPulseboxScreen(ctx, sx, sy, sw, sh, lt);
    ctx.fillStyle = "#04040a"; ctx.globalAlpha = 1 - glowK; ctx.fillRect(sx, sy, sw, sh); ctx.globalAlpha = 1;
    poly(ctx, [[550, 1036], [850, 1036], [840, 1018], [560, 1018]], "#0c0a16");
    ctx.fillStyle = "#a56bff"; ctx.globalAlpha = 0.6; ctx.fillRect(550, 1035, 300, 2); ctx.globalAlpha = 1;
    light(ctx, sx + sw / 2, sy + sh / 2, 820, "rgba(120,90,255,.55)", 0.55 * glowK);
    light(ctx, sx + sw / 2, sy + sh / 2, 330, "rgba(200,220,255,.5)", 0.3 * glowK);
    // bed on the right, gaming chair in front (we look over it at the screen)
    poly(ctx, [[W, 1180], [880, 1215], [870, 1420], [W, 1470]], "#0b0914");
    poly(ctx, [[W, 1160], [890, 1196], [880, 1236], [W, 1210]], "#1a1630");
    ctx.fillStyle = "#050409"; roundRect(ctx, 500, 1150, 360, 620, 70); ctx.fill(); roundRect(ctx, 570, 1080, 220, 130, 50); ctx.fill();
    ctx.strokeStyle = "rgba(150,120,255,.35)"; ctx.lineWidth = 5; roundRect(ctx, 570, 1080, 220, 130, 50); ctx.stroke();
    ctx.fillStyle = "#050409"; ctx.fillRect(650, 1760, 60, 160);
    dust(ctx, lt, 40, sx + sw / 2, sy + sh, 420);
    shade(ctx, sx + sw / 2, sy + sh * 0.7, 1250, 0.7);
    // drawn after the darkness: the bedroom door (back wall, left of the desk) is open, with a dim hallway light behind it
    const dx = R.x0 + 22, dy = R.y1 - 430, dw = 128, dh = 430;
    ctx.fillStyle = lin(ctx, 0, dy, 0, dy + dh, [[0, "#3a2c44"], [0.7, "#4e3a4c"], [1, "#5a4250"]]); ctx.fillRect(dx, dy, dw, dh);
    light(ctx, dx + dw / 2, dy + dh * 0.6, 240, "rgba(255,190,140,.4)", 0.55 * flicker(lt, 31, 5));
    const fv = figureVis(lt, o.figT);
    if (fv) { ctx.save(); ctx.beginPath(); ctx.rect(dx, dy, dw, dh); ctx.clip(); shadowFigure(ctx, dx + dw * 0.52, dy + dh + 2, dh * 0.93, fv, lt); ctx.restore(); }
    ctx.strokeStyle = "#07060c"; ctx.lineWidth = 12; ctx.strokeRect(dx, dy, dw, dh);
    poly(ctx, [[dx, dy], [dx - 70, dy - 26], [dx - 70, dy + dh + 40], [dx, dy + dh]], "#0d0b18");   // the door, swung open toward us
  },

  computer(ctx, lt) {
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#0a0916"], [0.6, "#100d22"], [1, "#05040a"]]); ctx.fillRect(0, 0, W, H);
    // "computer only" badge above the screen
    const by = 330;
    ctx.fillStyle = LIME; roundRect(ctx, 170, by - 62, 740, 124, 62); ctx.fill();
    ctx.save(); ctx.translate(262, by); ctx.fillStyle = INK;   // a laptop icon
    roundRect(ctx, -44, -36, 88, 56, 8); ctx.fill(); ctx.fillStyle = LIME; ctx.fillRect(-34, -26, 68, 36); ctx.fillStyle = INK; roundRect(ctx, -60, 22, 120, 14, 6); ctx.fill(); ctx.restore();
    ctx.fillStyle = INK; ctx.font = "700 60px 'Chakra Petch', Inter, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("COMPUTER ONLY", 345, by + 4);
    // monitor
    const sx = 50, sy = 520, sw = 980, sh = 600;
    ctx.fillStyle = "#040408"; roundRect(ctx, sx - 22, sy - 22, sw + 44, sh + 44, 22); ctx.fill();
    drawPulseboxScreen(ctx, sx, sy, sw, sh, lt);
    ctx.fillStyle = "#06050b"; ctx.fillRect(500, sy + sh + 22, 80, 150); ctx.fillRect(400, sy + sh + 160, 280, 22);
    light(ctx, 540, sy + sh / 2, 1100, "rgba(110,80,255,.5)", 0.45);
    // keyboard glow at the bottom
    poly(ctx, [[120, 1560], [960, 1560], [1060, 1800], [20, 1800]], "#0c0a16");
    ctx.fillStyle = "rgba(165,107,255,.55)"; for (let i = 0; i < 5; i++) { const y = 1590 + i * 40, inset = 100 - i * 18; for (let k = 0; k < 14; k++) { const x0 = inset + k * ((W - inset * 2) / 14); ctx.globalAlpha = 0.12 + 0.1 * Math.sin(lt * 2 + k + i); roundRect(ctx, x0 + 4, y, (W - inset * 2) / 14 - 8, 28, 5); ctx.fill(); } }
    ctx.globalAlpha = 1;
    vignette(ctx, 0.6);
  },

  hallway(ctx, lt, o) {
    const R = room(540, 790, 250, 420);
    const on = flicker(lt, 11, 7);
    drawRoom(ctx, R, { ceil: "#0a0912", floor: lin(ctx, 0, R.y1, 0, H, [[0, "#1a1424"], [1, "#0c0a12"]]), left: lin(ctx, 0, 0, R.x0, 0, [[0, "#110f1d"], [1, "#1d1a30"]]), right: lin(ctx, W, 0, R.x1, 0, [[0, "#0f0d1a"], [1, "#1c192e"]]), back: "#1a1730" });
    // wainscoting line and skirting
    ctx.strokeStyle = "rgba(0,0,0,.5)"; ctx.lineWidth = 6;
    [-1, 1].forEach((sd) => { const a = R.wall(sd, 0, 0.6), b = R.wall(sd, 1, 0.6); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); });
    // doors down both sides
    [[-1, 0.18, 0.3], [-1, 0.55, 0.62], [1, 0.3, 0.42], [1, 0.66, 0.72]].forEach(([sd, d0, d1], i) => {
      poly(ctx, quadOnWall(R, sd, d0, d1, 0.2, 1), i === 2 ? "#050409" : "#151226");
      const q = quadOnWall(R, sd, d0, d1, 0.2, 1); ctx.strokeStyle = "#0a0912"; ctx.lineWidth = 8; ctx.beginPath(); q.forEach((p, j) => (j ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.closePath(); ctx.stroke();
    });
    // picture frames
    poly(ctx, quadOnWall(R, -1, 0.36, 0.46, 0.3, 0.48), "#0d0b16"); poly(ctx, quadOnWall(R, 1, 0.5, 0.58, 0.3, 0.45), "#0d0b16");
    // runner rug + floorboards
    for (let i = 1; i < 9; i++) { const a = R.floor(i / 9, 0), b = R.floor(i / 9, 1); ctx.strokeStyle = "rgba(0,0,0,.28)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }
    poly(ctx, [R.floor(0.33, 0.05), R.floor(0.67, 0.05), R.floor(0.6, 0.95), R.floor(0.4, 0.95)], "#2a0e1a");
    // the basement door at the end, open into black
    const dx = R.vx - 70, dy = R.y1 - 300;
    ctx.fillStyle = lin(ctx, 0, dy, 0, dy + 300, [[0, "#1a0a12"], [0.7, "#2a0f18"], [1, "#3a1420"]]); ctx.fillRect(dx, dy, 140, 300);
    light(ctx, R.vx, R.y1 - 40, 160, "rgba(255,60,90,.35)", 0.6);
    const fv = figureVis(lt, o.figT);
    if (fv) shadowFigure(ctx, R.vx, R.y1 - 2, 290, fv, lt);
    poly(ctx, [[dx + 140, dy], [dx + 175, dy - 12], [dx + 175, R.y1 + 10], [dx + 140, R.y1]], "#16132a");
    ctx.strokeStyle = "#0b0a14"; ctx.lineWidth = 10; ctx.strokeRect(dx, dy, 140, 300);
    // ceiling lights, flickering
    [0.25, 0.7].forEach((d, i) => { const [lx, ly] = R.ceil(0.5, d); ctx.fillStyle = "#2a2840"; ctx.beginPath(); ctx.ellipse(lx, ly + 14, 60 * (1 - d * 0.7), 14 * (1 - d * 0.7), 0, 0, TAU); ctx.fill(); light(ctx, lx, ly + 30, 600 * (1 - d * 0.6), "rgba(255,226,170,.45)", (i ? 0.9 : 0.6) * on); });
    // flashlight sweeping
    const fx = 540 + Math.sin(lt * 0.55) * 150, fy = 860 + Math.sin(lt * 0.8) * 70;
    light(ctx, fx, fy, 420, "rgba(255,240,200,.35)", 0.6);
    shade(ctx, fx, fy, 900, 0.9 - 0.25 * on);
  },

  kitchen(ctx, lt, o) {
    const R = room(540, 780, 520, 560);
    drawRoom(ctx, R, { ceil: "#09080f", floor: "#0f0d18", left: lin(ctx, 0, 0, R.x0, 0, [[0, "#0d0c18"], [1, "#171528"]]), right: lin(ctx, W, 0, R.x1, 0, [[0, "#0c0b16"], [1, "#161427"]]), back: "#14122a" });
    // floor tiles
    for (let z = 0; z < 12; z++) { const d0 = persp(z, 2.2), d1 = persp(z + 1, 2.2); for (let i = 0; i < 6; i++) if ((i + z) % 2) poly(ctx, [R.floor(i / 6, d0), R.floor((i + 1) / 6, d0), R.floor((i + 1) / 6, d1), R.floor(i / 6, d1)], "rgba(255,255,255,.025)"); }
    // window over the sink with branches outside
    const wx = R.vx - 130, wy = R.y0 + 90, ww = 260, wh = 200;
    ctx.fillStyle = lin(ctx, 0, wy, 0, wy + wh, [[0, "#22346a"], [1, "#111a3a"]]); ctx.fillRect(wx, wy, ww, wh);
    ctx.strokeStyle = "#05050c"; ctx.lineWidth = 4; const rr = rng(9); for (let i = 0; i < 6; i++) { ctx.beginPath(); let x = wx + rr() * ww, y = wy + wh; ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (rr() - 0.5) * 80; y -= 40 + rr() * 30; ctx.lineTo(x, y); } ctx.stroke(); }
    const fv = figureVis(lt, o.figT);
    if (fv) { ctx.save(); ctx.beginPath(); ctx.rect(wx, wy, ww, wh); ctx.clip(); shadowFigure(ctx, wx + ww * 0.62, wy + wh + 260, 420, fv, lt); ctx.restore(); }
    ctx.strokeStyle = "#08070e"; ctx.lineWidth = 12; ctx.strokeRect(wx, wy, ww, wh); ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
    // counter along the back + sides
    ctx.fillStyle = "#14122a"; ctx.fillRect(R.x0, R.y1 - 200, R.x1 - R.x0, 200); ctx.fillStyle = "#3a3560"; ctx.fillRect(R.x0, R.y1 - 212, R.x1 - R.x0, 14);
    ctx.strokeStyle = "#0a0914"; ctx.lineWidth = 4; for (let k = 1; k < 5; k++) { const x = R.x0 + k * (R.x1 - R.x0) / 5; ctx.beginPath(); ctx.moveTo(x, R.y1 - 190); ctx.lineTo(x, R.y1 - 10); ctx.stroke(); }
    // the sink tap
    ctx.strokeStyle = "#5a5880"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(R.vx, R.y1 - 212); ctx.lineTo(R.vx, R.y1 - 262); ctx.lineTo(R.vx + 34, R.y1 - 262); ctx.stroke();
    // counters down the left wall: top, then cabinet fronts
    poly(ctx, [R.wall(-1, 0.15, 0.6), R.wall(-1, 1, 0.6), [R.x0 + 0, R.y1 - 200], R.floor(0, 0.15)], "#15132a");
    poly(ctx, [R.wall(-1, 0.15, 0.6), R.wall(-1, 1, 0.6), [R.x0, R.y1 - 212], [R.wall(-1, 0.15, 0.6)[0] + 90, R.wall(-1, 0.15, 0.6)[1] + 10]], "#3a3560");
    // open upper cabinets on the left wall (doors swung out)
    [[0.3, 0.45], [0.5, 0.62], [0.7, 0.8]].forEach(([d0, d1]) => {
      poly(ctx, quadOnWall(R, -1, d0, d1, 0.12, 0.38), "#030307");
      const a = R.wall(-1, d0, 0.12), b = R.wall(-1, d0, 0.38);
      poly(ctx, [a, [a[0] + 120 * (1 - d0 * 0.6), a[1] + 20], [b[0] + 120 * (1 - d0 * 0.6), b[1] + 30], b], "#2e2a50");
      ctx.strokeStyle = "#4a4478"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(a[0] + 120 * (1 - d0 * 0.6), a[1] + 20); ctx.lineTo(b[0] + 120 * (1 - d0 * 0.6), b[1] + 30); ctx.lineTo(...b); ctx.stroke();
    });
    // the fridge on the right, door open, cold light spilling out
    const fq = quadOnWall(R, 1, 0.12, 0.42, 0.05, 1);
    poly(ctx, fq, lin(ctx, fq[0][0], 0, fq[1][0], 0, [[0, "#7f93ad"], [1, "#4a5a74"]])); light(ctx, (fq[0][0] + fq[1][0]) / 2, (fq[0][1] + fq[3][1]) / 2, 700, "rgba(170,210,255,.55)", 0.45 + 0.05 * Math.sin(lt * 30));
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.16; poly(ctx, [fq[3], fq[2], [fq[2][0] - 520, fq[2][1] - 30], [fq[3][0] - 700, H]], "#a8d4ff"); ctx.restore();
    // the open fridge door, facing us: its inside, lit cold, with door shelves full of bottles
    const A = fq[0], D = fq[3], B = [A[0] - 300, A[1] + 70], C = [D[0] - 300, D[1] - 50];
    poly(ctx, [A, B, C, D], lin(ctx, B[0], 0, A[0], 0, [[0, "#6e819c"], [1, "#a9bdd6"]]));
    poly(ctx, [[lerp(A[0], B[0], 0.08), lerp(A[1], B[1], 0.08) + 30], [lerp(A[0], B[0], 0.92), lerp(A[1], B[1], 0.92) + 30], [lerp(D[0], C[0], 0.92), lerp(D[1], C[1], 0.92) - 30], [lerp(D[0], C[0], 0.08), lerp(D[1], C[1], 0.08) - 30]], "#c8d8ea");
    const rr2 = rng(4);
    [0.24, 0.46, 0.68, 0.88].forEach((v) => {
      const p0 = [lerp(A[0], D[0], v), lerp(A[1], D[1], v)], p1 = [lerp(B[0], C[0], v), lerp(B[1], C[1], v)];
      for (let j = 0; j < 4; j++) { const u = 0.14 + j * 0.2 + rr2() * 0.04, x = lerp(p0[0], p1[0], u), y = lerp(p0[1], p1[1], u), hh = 50 + rr2() * 60; ctx.fillStyle = ["#c94a5a", "#e8c35a", "#5aa0c9", "#f4f4fa", "#7ac96a"][Math.floor(rr2() * 5)]; roundRect(ctx, x - 13, y - hh, 26, hh, 8); ctx.fill(); }
      ctx.fillStyle = "#e9f2ff"; poly(ctx, [[p0[0], p0[1] - 4], [p1[0], p1[1] - 4], [p1[0], p1[1] + 10], [p0[0], p0[1] + 12]], "#e9f2ff");
    });
    dust(ctx, lt, 30, fq[0][0] - 200, 1100, 300, 8);
    shade(ctx, 600, 1000, 1250, 0.5);
  },

  basement(ctx, lt, o) {
    // looking down the stairs: steps run from the bottom of the frame to a black doorway
    const vx = 540, vy = 1080;
    ctx.fillStyle = "#08070d"; ctx.fillRect(0, 0, W, H);
    poly(ctx, [[0, 0], [W, 0], [vx + 150, vy - 260], [vx - 150, vy - 260]], "#0d0b14");
    poly(ctx, [[0, 0], [vx - 150, vy - 260], [vx - 150, vy + 80], [0, H]], lin(ctx, 0, 0, vx, 0, [[0, "#141120"], [1, "#0a0912"]]));
    poly(ctx, [[W, 0], [vx + 150, vy - 260], [vx + 150, vy + 80], [W, H]], lin(ctx, W, 0, vx, 0, [[0, "#121020"], [1, "#09080f"]]));
    // brick hints on the walls
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 3;
    for (let i = 1; i < 14; i++) { const k = i / 14; [[0, vx - 150], [W, vx + 150]].forEach(([e, f]) => { ctx.beginPath(); ctx.moveTo(e, k * H); ctx.lineTo(f, vy - 260 + k * 340); ctx.stroke(); }); }
    ctx.fillStyle = "#010103"; ctx.fillRect(vx - 150, vy - 260, 300, 340);
    const fv = figureVis(lt, o.figT);
    if (fv) {   // a pale face and eyes in the dark at the bottom
      ctx.save(); ctx.globalAlpha = fv * 0.5; ctx.fillStyle = "#3a3648"; ctx.beginPath(); ctx.ellipse(vx + 18, vy - 120, 26, 36, 0, 0, TAU); ctx.fill(); ctx.restore();
      ctx.save(); ctx.globalAlpha = fv; ctx.fillStyle = "#f4f2ff"; ctx.shadowColor = "#fff"; ctx.shadowBlur = 20; ctx.beginPath(); ctx.ellipse(vx + 8, vy - 126, 5, 3, 0, 0, TAU); ctx.ellipse(vx + 30, vy - 126, 5, 3, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
    // steps
    for (let i = 13; i >= 0; i--) {
      const d0 = persp(i, 2.4), d1 = persp(i + 1, 2.4);
      const y0 = H + d0 * (vy + 80 - H), y1 = H + d1 * (vy + 80 - H), hw0 = 540 - d0 * 390, hw1 = 540 - d1 * 390;
      const ym = lerp(y0, y1, 0.42);
      poly(ctx, [[vx - hw0, y0], [vx + hw0, y0], [vx + hw0 * 0.99, ym], [vx - hw0 * 0.99, ym]], i % 2 ? "#1c1828" : "#1a1625");   // riser
      poly(ctx, [[vx - hw0 * 0.99, ym], [vx + hw0 * 0.99, ym], [vx + hw1, y1], [vx - hw1, y1]], "#2a2438");                    // tread
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(vx - hw0, ym - 4, hw0 * 2, 4);
    }
    // handrail
    ctx.strokeStyle = "#0c0a12"; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(40, 1180); ctx.lineTo(vx - 160, vy - 120); ctx.stroke();
    // a bare bulb swinging on its cord
    const a = Math.sin(lt * 1.5) * 0.32, L = 420, bx = vx + Math.sin(a) * L, byy = 60 + Math.cos(a) * L;
    ctx.strokeStyle = "#050409"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(vx, 0); ctx.lineTo(bx, byy); ctx.stroke();
    const on = flicker(lt, 21, 8);
    ctx.fillStyle = on > 0.5 ? "#fff1c2" : "#5a5040"; ctx.beginPath(); ctx.ellipse(bx, byy + 22, 20, 26, a, 0, TAU); ctx.fill();
    light(ctx, bx, byy + 30, 1000, "rgba(255,214,140,.55)", 0.9 * on);
    shade(ctx, bx, byy + 400, 1350, 0.72);
    ctx.fillStyle = lin(ctx, 0, vy - 300, 0, vy + 120, [[0, "rgba(0,0,0,0)"], [0.5, "rgba(0,0,0,.6)"], [1, "rgba(0,0,0,0)"]]); ctx.fillRect(vx - 200, vy - 300, 400, 420);
  },

  living(ctx, lt, o) {
    const R = room(620, 820, 660, 640);
    drawRoom(ctx, R, { ceil: "#08070e", floor: "#0e0c16", left: lin(ctx, 0, 0, R.x0, 0, [[0, "#0b0a14"], [1, "#141227"]]), right: lin(ctx, W, 0, R.x1, 0, [[0, "#0b0a14"], [1, "#151229"]]), back: "#131129" });
    // window with curtains
    const wx = R.x1 - 230, wy = R.y0 + 110;
    ctx.fillStyle = "#1a2a5a"; ctx.fillRect(wx, wy, 180, 260);
    ctx.fillStyle = "#1c0c24"; ctx.fillRect(wx - 40, wy - 20, 60, 330); ctx.fillRect(wx + 160, wy - 20, 60, 330);
    // TV with static
    const tx = R.x0 + 60, ty = R.y1 - 330, tw = 330, th = 200;
    ctx.fillStyle = "#06050a"; ctx.fillRect(tx - 12, ty - 12, tw + 24, th + 24); ctx.fillRect(tx - 30, R.y1 - 110, tw + 60, 110);
    const rr = rng(Math.floor(lt * 30));
    for (let y = ty; y < ty + th; y += 6) for (let x = tx; x < tx + tw; x += 10) { const v = 90 + rr() * 150; ctx.fillStyle = `rgb(${v},${v},${v + 15})`; ctx.fillRect(x, y, 10, 6); }
    light(ctx, tx + tw / 2, ty + th / 2, 900, "rgba(190,200,255,.5)", 0.45 + rr() * 0.12);
    const fv = figureVis(lt, o.figT);
    if (fv) shadowFigure(ctx, tx + tw + 120, R.y1 + 4, 470, fv, lt);
    // couch from behind
    ctx.fillStyle = "#06050b"; roundRect(ctx, 60, 1330, 960, 520, 60); ctx.fill();
    ctx.fillStyle = "#0a0912"; roundRect(ctx, 90, 1290, 430, 140, 50); ctx.fill(); roundRect(ctx, 560, 1290, 430, 140, 50); ctx.fill();
    ctx.strokeStyle = "rgba(180,190,255,.22)"; ctx.lineWidth = 4; roundRect(ctx, 90, 1290, 430, 140, 50); ctx.stroke(); roundRect(ctx, 560, 1290, 430, 140, 50); ctx.stroke();
    shade(ctx, tx + tw / 2, ty + th, 1300, 0.6);
  },

  frontdoor(ctx, lt, o) {
    const R = room(540, 860, 640, 1020);
    // knocks: the door jumps three times
    let kick = 0; [0.65, 1.2, 1.75].forEach((k) => { const d = lt - k; if (d > 0 && d < 0.25) kick = Math.max(kick, (1 - d / 0.25) * Math.sin(d * 90)); });
    drawRoom(ctx, R, { ceil: "#08070d", floor: lin(ctx, 0, R.y1, 0, H, [[0, "#14101c"], [1, "#09070e"]]), left: lin(ctx, 0, 0, R.x0, 0, [[0, "#0c0a15"], [1, "#16132a"]]), right: lin(ctx, W, 0, R.x1, 0, [[0, "#0c0a15"], [1, "#16132a"]]), back: "#15122a" });
    const dx = 345 + kick * 4, dy = 470, dw = 390, dh = R.y1 - dy;
    // porch light through the fan window above the door
    ctx.fillStyle = "#3a2a14"; ctx.beginPath(); ctx.ellipse(540, dy - 10, 190, 90, 0, Math.PI, 0); ctx.fill();
    light(ctx, 540, dy - 40, 520, "rgba(255,190,110,.55)", 0.55);
    // the door
    ctx.fillStyle = "#1c1426"; ctx.fillRect(dx, dy, dw, dh);
    ctx.strokeStyle = "#0e0a14"; ctx.lineWidth = 9; ctx.strokeRect(dx + 40, dy + 330, dw - 80, 200); ctx.strokeRect(dx + 40, dy + 570, dw - 80, dh - 620);
    // frosted glass panes, porch light behind, and maybe a shape
    const gx = dx + 50, gy = dy + 50, gw = dw - 100, gh = 240;
    ctx.fillStyle = lin(ctx, 0, gy, 0, gy + gh, [[0, "#6a4a2a"], [1, "#3a2818"]]); ctx.fillRect(gx, gy, gw, gh);
    const fv = figureVis(lt, o.figT);
    if (fv) { ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip(); ctx.globalAlpha = 0.8 * fv; ctx.fillStyle = "#0a0608"; ctx.beginPath(); ctx.ellipse(gx + gw * 0.52, gy + 120, 55, 72, 0, 0, TAU); ctx.fill(); ctx.fillRect(gx + gw * 0.52 - 120, gy + 180, 240, 200); ctx.restore(); }
    ctx.strokeStyle = "#0e0a14"; ctx.lineWidth = 8; ctx.strokeRect(gx, gy, gw, gh); ctx.beginPath(); ctx.moveTo(gx + gw / 2, gy); ctx.lineTo(gx + gw / 2, gy + gh); ctx.moveTo(gx, gy + gh / 2); ctx.lineTo(gx + gw, gy + gh / 2); ctx.stroke();
    // knob, deadbolt, chain
    ctx.fillStyle = "#b89a5a"; ctx.beginPath(); ctx.arc(dx + dw - 50, dy + dh * 0.55, 16, 0, TAU); ctx.fill(); ctx.fillRect(dx + dw - 58, dy + dh * 0.47, 16, 26);
    ctx.strokeStyle = "#8a7444"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(dx + dw - 40, dy + dh * 0.44); ctx.quadraticCurveTo(dx + dw - 70, dy + dh * 0.5, dx + dw - 30, dy + dh * 0.49); ctx.stroke();
    // light under the door, broken by two shadows: feet
    ctx.fillStyle = "rgba(255,190,110,.8)"; ctx.fillRect(dx + 8, R.y1 - 6, dw - 16, 6);
    if (fv > 0 || o.figT == null) { ctx.fillStyle = "#020103"; ctx.fillRect(dx + dw * 0.36, R.y1 - 6, 44, 6); ctx.fillRect(dx + dw * 0.56, R.y1 - 6, 44, 6); }
    light(ctx, 540, R.y1 + 40, 360, "rgba(255,180,100,.4)", 0.4);
    // coat hooks + side table
    ctx.fillStyle = "#07060c"; poly(ctx, quadOnWall(R, -1, 0.55, 0.85, 0.28, 0.62), "#07060c");
    poly(ctx, [[W, 1250], [880, 1230], [880, 1290], [W, 1320]], "#0c0a14");
    vignette(ctx, 0.85);
    shade(ctx, 540, 900, 1250, 0.45);
  },
};


// ---------------------------------------------------------------- inside The Endless Halls (a Pulsebox horror game)
// Sickly yellow office halls that repeat forever, a first-person HUD, and the game's monsters with their rules.
function yellowHall(ctx, lt, { lights = 1, seed = 1 } = {}) {
  const R = room(540, 800, 300, 380);
  drawRoom(ctx, R, {
    ceil: "#cfc27e", back: "#e2d48a",
    floor: lin(ctx, 0, R.y1, 0, H, [[0, "#6e5f24"], [1, "#43391a"]]),
    left: lin(ctx, 0, 0, R.x0, 0, [[0, "#9c8a38"], [1, "#d6c56c"]]),
    right: lin(ctx, W, 0, R.x1, 0, [[0, "#968434"], [1, "#d2c068"]]),
  });
  ctx.lineWidth = 3; ctx.strokeStyle = "rgba(90,70,10,.16)";   // wallpaper stripes
  for (let z = 0; z < 34; z++) { const d = persp(z * 0.45, 2.4); [-1, 1].forEach((sd) => { const a = R.wall(sd, d, 0.08), b = R.wall(sd, d, 0.9); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }); }
  [-1, 1].forEach((sd) => poly(ctx, [R.wall(sd, 0, 0.93), R.wall(sd, 1, 0.93), R.wall(sd, 1, 1), R.wall(sd, 0, 1)], "rgba(60,48,12,.55)"));
  [[-1, 0.18, 0.28], [1, 0.34, 0.42], [-1, 0.53, 0.59], [1, 0.66, 0.7], [-1, 0.78, 0.81], [1, 0.85, 0.87]].forEach(([sd, d0, d1]) => poly(ctx, quadOnWall(R, sd, d0, d1, 0.22, 1), "#3a3112"));
  ctx.strokeStyle = "rgba(40,30,8,.22)"; ctx.lineWidth = 2;
  for (let z = 1; z < 12; z++) { const d = persp(z, 2.4), a = R.floor(0, d), b = R.floor(1, d); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }
  ctx.strokeStyle = "rgba(120,100,40,.35)";
  for (let i = 1; i < 6; i++) { const a = R.ceil(i / 6, 0), b = R.ceil(i / 6, 1); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }
  for (let z = 0; z < 9; z++) {   // fluorescent panels, some dying
    const d0 = persp(z * 1.2 + 0.3, 2.4), d1 = persp(z * 1.2 + 0.8, 2.4);
    const on = rng(seed * 31 + z)() < lights ? flicker(lt, seed + z * 13, 6) : 0.08;
    poly(ctx, [R.ceil(0.36, d0), R.ceil(0.64, d0), R.ceil(0.64, d1), R.ceil(0.36, d1)], on > 0.5 ? "#fffbe0" : "#7a7048");
    const [lx, ly] = R.ceil(0.5, (d0 + d1) / 2);
    light(ctx, lx, ly + 60, 420 * (1 - d0 * 0.7), "rgba(255,240,170,.35)", 0.5 * on);
  }
  light(ctx, R.vx, R.vy, 360, "rgba(255,245,190,.9)", 0.45 * lights);   // the far end is a haze: it never ends
  return R;
}
function crawler(ctx, x, y, s, a, t) {   // pale, eyeless, upside down on the ceiling
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s);
  ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 10;
  ctx.strokeStyle = "#b9ae90"; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 15;
  const leg = (sx, sy, kx, ky, fx, ph) => { const w = Math.sin(t * 9 + ph) * 10; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(kx + w, ky); ctx.lineTo(fx + w * 1.5, 0); ctx.stroke(); };
  leg(-50, 60, -130, 150, -190, 0); leg(-30, 70, -70, 170, -110, 2); leg(40, 66, 120, 160, 180, 1); leg(60, 58, 150, 130, 210, 3);
  ctx.fillStyle = "#d4ccb4"; ctx.beginPath(); ctx.ellipse(0, 70, 78, 34, 0.05, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-104, 100, 36, 46, -0.35, 0, TAU); ctx.fill();          // the head: smooth, no eyes
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = "#1a1408"; ctx.beginPath(); ctx.ellipse(-110, 126, 13, 20, -0.35, 0, TAU); ctx.fill();   // a gaping mouth
  ctx.strokeStyle = "rgba(60,50,30,.5)"; ctx.lineWidth = 3; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-40 + k * 26, 50); ctx.quadraticCurveTo(-30 + k * 26, 70, -40 + k * 26, 92); ctx.stroke(); }   // ribs
  ctx.restore();
}
function endlessHud(ctx, lt, battery) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.arc(W / 2, H / 2, 5, 0, TAU); ctx.fill();   // crosshair
  const bx = W - 190, by = H - 120, low = battery < 0.15;
  ctx.globalAlpha = low && Math.sin(lt * 10) > 0 ? 0.35 : 0.9;
  ctx.strokeStyle = low ? "#ff4d5e" : "#fff"; ctx.lineWidth = 5; roundRect(ctx, bx, by, 120, 50, 8); ctx.stroke(); ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(bx + 120, by + 16, 10, 18);
  ctx.fillRect(bx + 8, by + 8, Math.max(6, 104 * battery), 34);
  ctx.globalAlpha = 0.9; ctx.font = "700 28px 'Chakra Petch', Inter, sans-serif"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
  ctx.fillText(`${Math.round(battery * 100)}%`, bx - 14, by + 26);
  ctx.restore();
}
const BATTERY = { "endless-halls": 0.64, "endless-crawler": 0.41, "endless-watcher": 0.22, "endless-grin": 0.03, "endless-fusebox": 0.03, "endless-exit": 0.02 };

Object.assign(SCENES, {
  "endless-halls"(ctx, lt, o) {
    const R = yellowHall(ctx, lt, { seed: 3 });
    shade(ctx, 540, 860, 1300, 0.35);
    shadowFigure(ctx, R.vx + 18, R.y1 - 4, 320, figureVis(lt, o.figT), lt, false, "#15110a");   // the faceless Hollow Man, far away
  },
  "endless-crawler"(ctx, lt, o) {
    const R = yellowHall(ctx, lt, { seed: 9, lights: 0.6 });
    shade(ctx, 540, 900, 1200, 0.55);
    const fv = figureVis(lt, o.figT);
    if (fv) { const k = easeInOut(clamp((lt - o.figT) / 5)), d = lerp(0.84, 0.56, k); const [cx, cy] = R.ceil(0.56 + Math.sin(lt * 0.9) * 0.06, d); crawler(ctx, cx, cy, 2.3 * (1 - d * 0.8), fv, lt); }
  },
  "endless-watcher"(ctx, lt, o) {
    const R = yellowHall(ctx, lt, { seed: 17, lights: 0.8 });
    shade(ctx, 540, 900, 1250, 0.45);
    if (o.figT == null) return;
    // it only moves when you look away: every 1.1 s the view blinks, and it's closer
    const since = lt - o.figT, n = since < 0 ? 0 : Math.floor(since / 1.1) + 1;
    const d = Math.max(0.3, 0.8 - n * 0.12), [fx, fy] = R.floor(0.5, d), h = (fy - R.ceil(0.5, d)[1]) * 0.8;
    shadowFigure(ctx, fx, fy, h, 1, 0, false, "#e4ddcb");
    const s = h / 600; ctx.fillStyle = "#14100a"; ctx.beginPath(); ctx.ellipse(fx - 12 * s, fy - 552 * s, 7 * s, 9 * s, 0, 0, TAU); ctx.ellipse(fx + 12 * s, fy - 552 * s, 7 * s, 9 * s, 0, 0, TAU); ctx.fill();
    if (since > 0 && since % 1.1 < 0.09) { ctx.fillStyle = "#000"; ctx.fillRect(-100, -100, W + 200, H + 200); }
  },
  "endless-grin"(ctx, lt, o) {
    yellowHall(ctx, lt, { seed: 23, lights: 0.15 });
    const on = lt < 1.8 ? flicker(lt, 5, 14) : 0;   // the flashlight flickers... and dies
    if (on > 0.5) shade(ctx, 540 + Math.sin(lt * 2) * 80, 900, 800, 0.9);
    else { ctx.fillStyle = "rgba(0,0,0,.95)"; ctx.fillRect(-100, -100, W + 200, H + 200); }
    const fv = on > 0.5 ? 0 : figureVis(lt, o.figT);   // it hides from light
    if (fv) {
      ctx.save(); ctx.globalAlpha = fv; ctx.translate(540, 930); const b = 1 + Math.sin(lt * 2.2) * 0.03; ctx.scale(b, b);
      ctx.fillStyle = "#efe8d2"; ctx.shadowColor = "rgba(255,250,230,.5)"; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.moveTo(-230, -20); ctx.quadraticCurveTo(0, 60, 230, -20); ctx.quadraticCurveTo(0, 190, -230, -20); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = "#1a160c"; ctx.lineWidth = 5;
      for (let i = -7; i <= 7; i++) { const x = i * 28; ctx.beginPath(); ctx.moveTo(x, 20 - Math.abs(i) * 4); ctx.lineTo(x, 110 - Math.abs(i) * 9); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-220, -12); ctx.quadraticCurveTo(0, 125, 220, -12); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.shadowColor = "#fff"; ctx.shadowBlur = 22; ctx.beginPath(); ctx.ellipse(-110, -170, 10, 7, 0, 0, TAU); ctx.ellipse(110, -170, 10, 7, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  },
  "endless-fusebox"(ctx, lt) {
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#cbbb62"], [1, "#8c7c30"]]); ctx.fillRect(-100, -100, W + 200, H + 200);
    ctx.strokeStyle = "rgba(90,70,10,.18)"; ctx.lineWidth = 4; for (let x = -60; x < W + 100; x += 44) { ctx.beginPath(); ctx.moveTo(x, -100); ctx.lineTo(x, H + 100); ctx.stroke(); }
    const bx = 250, by = 520, bw = 580, bh = 820, ins = [1.5, 2.2, 2.9], done = lt >= ins[2];
    ctx.fillStyle = "rgba(0,0,0,.35)"; roundRect(ctx, bx + 18, by + 24, bw, bh, 18); ctx.fill();
    ctx.fillStyle = lin(ctx, bx, 0, bx + bw, 0, [[0, "#6d7378"], [1, "#4a4f54"]]); roundRect(ctx, bx, by, bw, bh, 18); ctx.fill();
    ctx.fillStyle = "#23272b"; roundRect(ctx, bx + 40, by + 150, bw - 80, bh - 230, 12); ctx.fill();
    poly(ctx, [[bx, by + 10], [bx - 170, by - 40], [bx - 170, by + bh + 60], [bx, by + bh - 10]], "#555b60");   // the open door
    ctx.fillStyle = "#ffd23d"; ctx.font = "700 46px 'Chakra Petch', Inter, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("EXIT STAIRWELL", bx + bw / 2, by + 62); ctx.font = "700 32px 'Chakra Petch', Inter, sans-serif"; ctx.fillText("POWER", bx + bw / 2, by + 108);
    [0, 1, 2].forEach((i) => {
      const sx = bx + 125 + i * 165, sy = by + 230, inT = ins[i], k = clamp((lt - inT + 0.25) / 0.25);
      ctx.fillStyle = "#0e1012"; roundRect(ctx, sx - 40, sy, 80, 360, 14); ctx.fill();
      ctx.fillStyle = lt >= inT ? "#3dff7a" : "#ff3d3d"; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 25; ctx.beginPath(); ctx.arc(sx, sy - 40, 16, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      if (k > 0) {   // the fuse slides in
        const fy = sy + 30 - (1 - k) * 260;
        ctx.fillStyle = "rgba(255,235,200,.35)"; roundRect(ctx, sx - 26, fy, 52, 300, 22); ctx.fill();
        ctx.fillStyle = "#b8b0a0"; ctx.fillRect(sx - 30, fy, 60, 40); ctx.fillRect(sx - 30, fy + 260, 60, 40);
        ctx.strokeStyle = "#ffb03d"; ctx.lineWidth = 6; ctx.shadowColor = "#ff9a3d"; ctx.shadowBlur = 20; ctx.beginPath(); ctx.moveTo(sx, fy + 40); for (let j = 0; j < 7; j++) ctx.lineTo(sx + (j % 2 ? 14 : -14), fy + 60 + j * 28); ctx.lineTo(sx, fy + 260); ctx.stroke(); ctx.shadowBlur = 0;
      }
      if (lt >= inT && lt < inT + 0.35) { const r = rng(i + 7); ctx.fillStyle = "#fff3a0"; for (let j = 0; j < 18; j++) { const a = r() * TAU, d = (lt - inT) * (300 + r() * 500); ctx.fillRect(sx + Math.cos(a) * d, sy + 20 + Math.sin(a) * d, 5, 5); } }
    });
    if (done) { ctx.fillStyle = "#3dff7a"; ctx.font = "700 44px 'Chakra Petch', Inter, sans-serif"; ctx.fillText("● ONLINE", bx + bw / 2, by + bh - 40); light(ctx, 540, 900, 1100, "rgba(90,255,150,.6)", 0.35 + 0.1 * Math.sin(lt * 6)); }
    shade(ctx, 540, 900, 1300, 0.45);
  },
  "endless-exit"(ctx, lt) {
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#3a3416"], [1, "#1c190a"]]); ctx.fillRect(-100, -100, W + 200, H + 200);
    const dx = 300, dy = 640, dw = 480, dh = 1000, open = easeInOut(clamp((lt - 1.2) / 1.2));
    // EXIT sign
    ctx.fillStyle = "#0c2a14"; roundRect(ctx, 400, 440, 280, 120, 14); ctx.fill();
    ctx.fillStyle = "#4dff8a"; ctx.shadowColor = "#4dff8a"; ctx.shadowBlur = 40; ctx.font = "700 86px 'Chakra Petch', Inter, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("EXIT", 540, 503); ctx.shadowBlur = 0;
    light(ctx, 540, 500, 600, "rgba(80,255,140,.5)", 0.6);
    // behind the door: the sunrise
    ctx.fillStyle = lin(ctx, 0, dy, 0, dy + dh, [[0, "#ffd9a0"], [0.6, "#ff9a6a"], [1, "#ffcf8a"]]); ctx.fillRect(dx, dy, dw, dh);
    light(ctx, 540, dy + dh * 0.45, 700, "rgba(255,240,200,.9)", open);
    // the door swings open toward us
    const ex = dx + dw * (1 - open) + (dx - 80 - dx) * open;
    poly(ctx, [[dx, dy], [lerp(dx + dw, dx - 140, open), dy - 40 * open], [lerp(dx + dw, dx - 140, open), dy + dh + 60 * open], [dx, dy + dh]], "#4a5048");
    ctx.fillStyle = "#c0c4b8"; ctx.fillRect(lerp(dx + dw - 70, dx - 110, open), dy + dh * 0.5, 50, 16);
    ctx.strokeStyle = "#151510"; ctx.lineWidth = 16; ctx.strokeRect(dx, dy, dw, dh);
    // and the light takes over
    const wash = clamp((lt - 2.6) / 2.5) * 0.8;
    if (wash > 0) { ctx.fillStyle = `rgba(255,236,200,${wash})`; ctx.fillRect(-100, -100, W + 200, H + 200); }
  },
});

// Other modules add scenes (and how each is graded) here.
const STYLE = {};
export function registerScenes(map, styles = {}) { Object.assign(SCENES, map); Object.assign(STYLE, styles); }
export const getScene = (id) => SCENES[id];

const GRADES = { purple: "rgba(70,40,160,.35)", yellow: "rgba(120,130,20,.3)", warm: "rgba(255,140,60,.22)", green: "rgba(40,140,90,.3)" };
export function drawScene(ctx, id, lt, dur, o = {}) {
  const fn = SCENES[id] || SCENES.hallway;
  const game = id.startsWith("endless-");
  const st = STYLE[id] || (game ? { grade: "yellow", hud: true } : {});
  ctx.save();
  if (st.drift !== false) {   // handheld camera: slow push in, a little drift
    const push = 1.03 + 0.07 * clamp(lt / Math.max(1, dur)), ox = Math.sin(lt * 0.9) * 9, oy = Math.sin(lt * 1.3 + 1) * 7;
    ctx.translate(W / 2 + ox, H / 2 + oy); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
  }
  fn(ctx, lt, { ...o, dur });
  ctx.restore();
  const grade = GRADES[st.grade || "purple"];
  if (grade) { ctx.save(); ctx.globalCompositeOperation = "soft-light"; ctx.fillStyle = grade; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  if (st.grain !== false) grain(ctx, lt, game ? 0.045 : 0.035);
  if (st.vignette !== false) vignette(ctx, 0.55);
  if (st.hud) endlessHud(ctx, lt, BATTERY[id] ?? 0.5);
  if (o.label) {   // a location stamp / game HUD label, top left
    ctx.save(); ctx.font = "700 34px 'Chakra Petch', Inter, sans-serif"; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    const tw = ctx.measureText(o.label).width;
    const ly = 270;   // below a two-line hook headline
    ctx.fillStyle = "rgba(5,5,10,.62)"; roundRect(ctx, 44, ly, tw + 48, 62, 12); ctx.fill();
    ctx.strokeStyle = game ? "rgba(255,226,122,.5)" : "rgba(255,255,255,.18)"; ctx.lineWidth = 2; roundRect(ctx, 44, ly, tw + 48, 62, 12); ctx.stroke();
    ctx.fillStyle = game ? "#ffe27a" : "#e8e6ff"; ctx.fillText(o.label, 68, ly + 32);
    ctx.restore();
  }
}
