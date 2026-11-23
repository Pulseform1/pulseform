// Original illustrated pieces: genre backgrounds, the hands, avatar icons and chat image attachments.
// Everything is drawn with Canvas 2D, so it is resolution independent and needs no image files.
import { rng, roundRect, clamp, lerp } from "./util.js";

const W = 1080, H = 1920;
const TAU = Math.PI * 2;

function radial(ctx, x, y, r, color, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
}
function vgrad(ctx, stops, y0 = 0, y1 = H) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function particles(ctx, t, n, seed, color, size, speed, alpha) {
  const r = rng(seed);
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const x = (r() * W + Math.sin(t * 0.3 + i) * 30) % W, y = (((r() * H - t * speed * (0.5 + r())) % H) + H) % H, s = size * (0.4 + r());
    ctx.globalAlpha = alpha * (0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + i)));
    ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- backgrounds
export function drawBackground(ctx, id, t, mood = 0) {
  switch (id) {
    case "horror": {
      vgrad(ctx, [[0, "#05040c"], [0.55, "#0d0a24"], [1, "#04030a"]]);
      radial(ctx, 540, 900, 900, "#3b1f7a", 0.55 + 0.08 * Math.sin(t * 0.7));
      for (let i = 0; i < 6; i++) radial(ctx, ((i * 260 + t * (12 + i * 4)) % 1500) - 200, 300 + i * 290, 420, i % 2 ? "#2a2550" : "#1a2440", 0.45);
      particles(ctx, t, 70, 7, "#b9a8ff", 2.4, 18, 0.5);
      if (Math.sin(t * 3.7) > 0.985) { ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 0, W, H); }
      break;
    }
    case "mystery": {
      vgrad(ctx, [[0, "#061a22"], [1, "#0b2a36"]]);
      radial(ctx, 300, 500, 700, "#1f6a7a", 0.45); radial(ctx, 860, 1500, 700, "#123d52", 0.5);
      ctx.strokeStyle = "rgba(170,220,235,.28)"; ctx.lineWidth = 2.4;
      const r = rng(11);
      for (let i = 0; i < 120; i++) { const x = (r() * 1300 + t * 260) % 1300 - 110, y = (r() * 2100 + t * 1300 * (0.7 + r() * 0.6)) % 2100 - 90; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 18, y + 70); ctx.stroke(); }
      if (Math.sin(t * 0.9 + 2) > 0.995) { ctx.fillStyle = "rgba(220,240,255,.25)"; ctx.fillRect(0, 0, W, H); }
      break;
    }
    case "comedy": {
      vgrad(ctx, [[0, "#ffcf3d"], [0.5, "#ff9a3d"], [1, "#ff5c8a"]]);
      const r = rng(3), cols = ["#fff3b0", "#ffffff", "#ffd6e7", "#b8f2ff"];
      for (let i = 0; i < 22; i++) {
        const x = r() * W, y = (r() * H + Math.sin(t * 1.2 + i) * 26), s = 18 + r() * 50, c = cols[i % 4];
        ctx.globalAlpha = 0.45; ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 8; ctx.lineCap = "round";
        if (i % 3 === 0) { ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, TAU); ctx.fill(); }
        else if (i % 3 === 1) { ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.6 + i); ctx.fillRect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.8); ctx.restore(); }
        else { ctx.beginPath(); ctx.moveTo(x - s, y); for (let k = 0; k < 4; k++) ctx.quadraticCurveTo(x - s + k * s * 0.5 + s * 0.25, y + (k % 2 ? 18 : -18), x - s + (k + 1) * s * 0.5, y); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "drama": {
      vgrad(ctx, [[0, "#1a0b26"], [1, "#3a0d2e"]]);
      const r = rng(5), cols = ["#ff5c8a", "#ff9a5c", "#b85cff", "#5c8aff"];
      for (let i = 0; i < 26; i++) radial(ctx, (r() * W + Math.sin(t * 0.2 + i) * 40), (r() * H + Math.cos(t * 0.15 + i) * 40), 60 + r() * 120, cols[i % 4], 0.22 + 0.1 * Math.sin(t + i));
      break;
    }
    case "twist": {
      vgrad(ctx, [[0, "#12052a"], [1, "#2a0a4a"]]);
      ctx.save(); ctx.translate(540, 900); ctx.rotate(t * 0.12);
      for (let i = 0; i < 18; i++) { ctx.rotate(TAU / 18); ctx.fillStyle = i % 2 ? "rgba(201,92,255,.10)" : "rgba(92,140,255,.07)"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1500, -160); ctx.lineTo(1500, 160); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      radial(ctx, 540, 900, 700, "#c95cff", 0.25);
      particles(ctx, t, 40, 9, "#e9c6ff", 3, 30, 0.5);
      break;
    }
    case "suspense": {
      vgrad(ctx, [[0, "#140405"], [1, "#2a0808"]]);
      radial(ctx, 540, 900, 900, "#ff2d3d", 0.22 + 0.12 * Math.max(0, Math.sin(t * 2.6)));
      ctx.save(); ctx.translate(540, -200); ctx.rotate(Math.sin(t * 0.9) * 0.9);
      const g = ctx.createLinearGradient(0, 0, 0, 2300); g.addColorStop(0, "rgba(255,120,90,.28)"); g.addColorStop(1, "rgba(255,120,90,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(40, 0); ctx.lineTo(520, 2300); ctx.lineTo(-520, 2300); ctx.closePath(); ctx.fill(); ctx.restore();
      particles(ctx, t, 40, 4, "#ff9a7a", 2, 14, 0.35);
      break;
    }
    case "school": {
      ctx.fillStyle = "#f4f1e6"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(90,140,220,.28)"; ctx.lineWidth = 3;
      for (let y = 60; y < H; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.strokeStyle = "rgba(230,80,90,.45)"; ctx.beginPath(); ctx.moveTo(110, 0); ctx.lineTo(110, H); ctx.stroke();
      ctx.strokeStyle = "rgba(60,70,110,.35)"; ctx.lineWidth = 6; ctx.lineCap = "round";
      const r = rng(21);
      for (let i = 0; i < 12; i++) {
        const x = 160 + r() * 860, y = 80 + r() * 1760, s = 26 + r() * 24; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 0.5 + i) * 0.12);
        ctx.beginPath();
        if (i % 3 === 0) { for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * TAU * 2 / 5; ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s); } ctx.closePath(); }
        else if (i % 3 === 1) { ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.lineTo(s * 0.5, -s * 0.5); ctx.moveTo(s, 0); ctx.lineTo(s * 0.5, s * 0.5); }
        else { ctx.arc(0, 0, s * 0.6, 0, TAU); }
        ctx.stroke(); ctx.restore();
      }
      break;
    }
    case "scifi": {
      vgrad(ctx, [[0, "#020611"], [1, "#071a2e"]]);
      const r = rng(31);
      for (let i = 0; i < 140; i++) { const x = r() * W, y = r() * H * 0.75, s = r() * 2.4 + 0.6; ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i)); ctx.fillStyle = "#cfefff"; ctx.fillRect(x, y, s, s); }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(61,224,255,.35)"; ctx.lineWidth = 2;
      const hz = 1350;
      for (let i = 0; i < 16; i++) { const z = ((i / 16) + t * 0.12) % 1, y = hz + Math.pow(z, 2) * (H - hz); ctx.globalAlpha = z; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.globalAlpha = 0.6;
      for (let i = -10; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(540 + i * 30, hz); ctx.lineTo(540 + i * 260, H); ctx.stroke(); }
      ctx.globalAlpha = 1;
      radial(ctx, 540, 900, 800, "#1f8fff", 0.25);
      break;
    }
    case "adventure": {
      vgrad(ctx, [[0, "#ff9a5c"], [0.45, "#ffcf7a"], [0.75, "#ffb3a0"], [1, "#7a5c8a"]]);
      radial(ctx, 760, 760, 320, "#fff6d0", 0.9);
      ctx.fillStyle = "#fff3c9"; ctx.beginPath(); ctx.arc(760, 760, 110, 0, TAU); ctx.fill();
      const layers = [["#a8708a", 1100, 0.3], ["#7a5079", 1300, 0.5], ["#4a3358", 1500, 0.8]];
      layers.forEach(([c, base, par], li) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, H); const r = rng(40 + li);
        for (let x = -100; x <= W + 200; x += 180) ctx.lineTo(x - (t * 8 * par) % 180, base - r() * 260); ctx.lineTo(W, H); ctx.closePath(); ctx.fill(); });
      ctx.strokeStyle = "rgba(60,40,60,.6)"; ctx.lineWidth = 5;
      for (let i = 0; i < 4; i++) { const x = (i * 260 + t * 40) % 1300 - 100, y = 420 + i * 60 + Math.sin(t * 2 + i) * 10; ctx.beginPath(); ctx.moveTo(x - 20, y); ctx.quadraticCurveTo(x - 10, y - 12 - Math.sin(t * 9 + i) * 6, x, y); ctx.quadraticCurveTo(x + 10, y - 12 - Math.sin(t * 9 + i) * 6, x + 20, y); ctx.stroke(); }
      break;
    }
    default: vgrad(ctx, [[0, "#0b0d14"], [1, "#1a1d2a"]]);
  }
  // shared vignette
  const g = ctx.createRadialGradient(540, 960, 500, 540, 960, 1300);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${0.55 + mood * 0.3})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- hands
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const m = (c) => Math.round(clamp(f < 0 ? c * (1 + f) : c + (255 - c) * f, 0, 255));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}
// A tapered finger or thumb from (x0,y0) to (x1,y1): wide at the base, rounded tip, with a nail.
function digit(ctx, x0, y0, x1, y1, wBase, wTip, skin, dark, nail = true) {
  const a = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0);
  ctx.save(); ctx.translate(x0, y0); ctx.rotate(a);
  const g = ctx.createLinearGradient(0, -wBase / 2, 0, wBase / 2);
  g.addColorStop(0, shade(skin, 0.12)); g.addColorStop(0.6, skin); g.addColorStop(1, shade(skin, -0.12));
  ctx.beginPath();
  ctx.moveTo(0, -wBase / 2);
  ctx.quadraticCurveTo(len * 0.55, -wBase / 2 - 4, len - wTip / 2, -wTip / 2);
  ctx.arc(len - wTip / 2, 0, wTip / 2, -Math.PI / 2, Math.PI / 2);
  ctx.quadraticCurveTo(len * 0.55, wBase / 2 + 4, 0, wBase / 2);
  ctx.closePath();
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.stroke();
  if (nail) {
    ctx.fillStyle = shade(skin, 0.38); ctx.strokeStyle = shade(skin, -0.1); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(len - wTip * 0.62, -wTip * 0.08, wTip * 0.34, wTip * 0.26, 0, 0, TAU); ctx.fill(); ctx.stroke();
  }
  ctx.strokeStyle = shade(skin, -0.2); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(len * 0.5, -wBase * 0.18); ctx.quadraticCurveTo(len * 0.53, 0, len * 0.5, wBase * 0.18); ctx.stroke();
  ctx.restore();
}
// Parts of the hands that sit behind the phone: the holding (left) palm and the fingertips that wrap around the right edge.
export function drawHandsBack(ctx, ph, skin, sleeve = "#22242f") {
  const { x, y, w, h } = ph, dark = shade(skin, -0.32);
  // fingertips of the holding hand, peeking out from behind the right edge
  [[0.5, 74], [0.6, 78], [0.7, 76], [0.79, 66]].forEach(([v, len]) => digit(ctx, x + w - 40, y + h * v, x + w + len, y + h * v + 10, 66, 58, skin, dark, false));
  // left palm and wrist
  ctx.fillStyle = sleeve;
  ctx.beginPath(); ctx.moveTo(-40, H + 40); ctx.quadraticCurveTo(x - 120, y + h * 1.0, x - 60, y + h * 0.9); ctx.lineTo(x + 140, y + h * 1.02); ctx.lineTo(320, H + 40); ctx.closePath(); ctx.fill();
  const g = ctx.createLinearGradient(x - 120, 0, x + 120, 0); g.addColorStop(0, shade(skin, -0.12)); g.addColorStop(1, skin);
  ctx.fillStyle = g; ctx.strokeStyle = dark; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 64, y + h * 0.93); ctx.quadraticCurveTo(x - 118, y + h * 0.76, x - 46, y + h * 0.6); ctx.lineTo(x + 60, y + h * 0.6); ctx.lineTo(x + 60, y + h * 1.0); ctx.lineTo(x + 120, y + h * 1.03); ctx.closePath(); ctx.fill(); ctx.stroke();
  // right wrist coming up from the bottom corner (the typing hand)
  ctx.fillStyle = sleeve;
  ctx.beginPath(); ctx.moveTo(W + 40, H + 40); ctx.lineTo(W + 40, y + h * 0.9); ctx.quadraticCurveTo(x + w + 40, y + h * 0.92, x + w - 70, H + 40); ctx.closePath(); ctx.fill();
}
// Thumbs over the front of the phone. tap = 0..1: the right thumb dips toward the keyboard while you type.
export function drawHandsFront(ctx, ph, skin, tap = 0) {
  const { x, y, w, h } = ph, dark = shade(skin, -0.32);
  // left thumb resting on the left edge, pointing up and in
  digit(ctx, x - 40, y + h * 0.84, x + 46, y + h * 0.66, 96, 70, skin, dark);
  // right hand: the heel of the palm, then the thumb reaching toward the message box
  const g = ctx.createLinearGradient(x + w, 0, W, 0); g.addColorStop(0, skin); g.addColorStop(1, shade(skin, -0.15));
  ctx.fillStyle = g; ctx.strokeStyle = dark; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x + w - 30, H + 20); ctx.quadraticCurveTo(x + w - 40, y + h * 0.98, x + w + 40, y + h * 0.93); ctx.quadraticCurveTo(W, y + h * 0.95, W + 20, H + 20); ctx.closePath(); ctx.fill(); ctx.stroke();
  const tx = lerp(x + w - 120, x + w - 210, tap), ty = lerp(y + h * 0.9, y + h * 0.935, tap);
  digit(ctx, x + w + 50, y + h * 0.99, tx, ty, 100, 72, skin, dark);
}

// ---------------------------------------------------------------- avatars
export function drawAvatar(ctx, c, cx, cy, r, imgCache) {
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
  const img = c.image && imgCache?.get(c.image);
  if (img && img.complete && img.naturalWidth) {
    const s = Math.max((r * 2) / img.naturalWidth, (r * 2) / img.naturalHeight);
    ctx.drawImage(img, cx - (img.naturalWidth * s) / 2, cy - (img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
    ctx.restore(); return;
  }
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g.addColorStop(0, shade(c.color || "#555", 0.2)); g.addColorStop(1, shade(c.color || "#555", -0.25));
  ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.translate(cx, cy); ctx.scale(r / 50, r / 50);
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const eyes = (y = -6, gap = 14, rr = 5, col = "#1b1d26") => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(-gap, y, rr, 0, TAU); ctx.arc(gap, y, rr, 0, TAU); ctx.fill(); };
  switch (c.avatar) {
    case "unknown": ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.arc(0, -10, 18, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, 34, 32, 24, 0, Math.PI, 0); ctx.fill(); break;
    case "smile": ctx.beginPath(); ctx.arc(0, 0, 32, 0, TAU); ctx.fillStyle = "#ffd84d"; ctx.fill(); eyes(-8, 11, 5); ctx.strokeStyle = "#1b1d26"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 4, 16, 0.2, Math.PI - 0.2); ctx.stroke(); break;
    case "ghost": ctx.beginPath(); ctx.moveTo(-26, 32); ctx.lineTo(-26, -6); ctx.arc(0, -6, 26, Math.PI, 0); ctx.lineTo(26, 32); for (let i = 0; i < 4; i++) ctx.lineTo(26 - (i + 0.5) * 13, i % 2 ? 32 : 22); ctx.closePath(); ctx.fill(); eyes(-6, 10, 5); break;
    case "cat": ctx.beginPath(); ctx.moveTo(-28, -8); ctx.lineTo(-24, -34); ctx.lineTo(-8, -20); ctx.lineTo(8, -20); ctx.lineTo(24, -34); ctx.lineTo(28, -8); ctx.arc(0, 4, 29, 0, Math.PI); ctx.closePath(); ctx.fill(); eyes(-2, 11, 4.5); ctx.strokeStyle = "#1b1d26"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-4, 10); ctx.lineTo(0, 14); ctx.lineTo(4, 10); ctx.stroke(); break;
    case "dog": ctx.beginPath(); ctx.arc(0, 2, 26, 0, TAU); ctx.fill(); ctx.fillStyle = "#c9a27a"; ctx.beginPath(); ctx.ellipse(-26, -2, 10, 20, 0.3, 0, TAU); ctx.ellipse(26, -2, 10, 20, -0.3, 0, TAU); ctx.fill(); eyes(-4, 10, 4.5); ctx.fillStyle = "#1b1d26"; ctx.beginPath(); ctx.ellipse(0, 10, 7, 5, 0, 0, TAU); ctx.fill(); break;
    case "moon": ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fillStyle = "#fff6c9"; ctx.fill(); ctx.globalCompositeOperation = "destination-out"; ctx.beginPath(); ctx.arc(14, -10, 26, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = "source-over"; break;
    case "star": ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? 14 : 32; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = "#ffe14d"; ctx.fill(); break;
    case "heart": ctx.beginPath(); ctx.moveTo(0, 26); ctx.bezierCurveTo(-40, -2, -22, -36, 0, -14); ctx.bezierCurveTo(22, -36, 40, -2, 0, 26); ctx.fillStyle = "#ff4f6e"; ctx.fill(); break;
    case "robot": roundRect(ctx, -26, -22, 52, 44, 10); ctx.fill(); ctx.fillStyle = "#3de0ff"; ctx.fillRect(-16, -8, 10, 10); ctx.fillRect(6, -8, 10, 10); ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, -34); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -36, 5, 0, TAU); ctx.fill(); break;
    case "alien": ctx.fillStyle = "#7dff8a"; ctx.beginPath(); ctx.ellipse(0, 0, 26, 32, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#11131a"; ctx.beginPath(); ctx.ellipse(-11, -2, 9, 13, -0.5, 0, TAU); ctx.ellipse(11, -2, 9, 13, 0.5, 0, TAU); ctx.fill(); break;
    case "mask": ctx.beginPath(); ctx.ellipse(0, 0, 28, 34, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#11131a"; ctx.beginPath(); ctx.ellipse(-11, -6, 7, 10, 0, 0, TAU); ctx.ellipse(11, -6, 7, 10, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "#11131a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 16, 9, Math.PI + 0.3, -0.3); ctx.stroke(); break;
    case "glasses": ctx.fillStyle = "#f2c4a0"; ctx.beginPath(); ctx.arc(0, 0, 28, 0, TAU); ctx.fill(); ctx.fillStyle = "#5a4636"; ctx.beginPath(); ctx.arc(0, -10, 29, Math.PI, 0); ctx.fill(); ctx.strokeStyle = "#1b1d26"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-11, 2, 9, 0, TAU); ctx.moveTo(20, 2); ctx.arc(11, 2, 9, 0, TAU); ctx.moveTo(-2, 2); ctx.lineTo(2, 2); ctx.stroke(); break;
    case "crown": ctx.fillStyle = "#ffd84d"; ctx.beginPath(); ctx.moveTo(-30, 18); ctx.lineTo(-30, -14); ctx.lineTo(-15, 2); ctx.lineTo(0, -22); ctx.lineTo(15, 2); ctx.lineTo(30, -14); ctx.lineTo(30, 18); ctx.closePath(); ctx.fill(); break;
    case "eye": ctx.beginPath(); ctx.moveTo(-34, 0); ctx.quadraticCurveTo(0, -30, 34, 0); ctx.quadraticCurveTo(0, 30, -34, 0); ctx.fill(); ctx.fillStyle = "#ff3d6e"; ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill(); ctx.fillStyle = "#11131a"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill(); break;
    case "flower": for (let k = 0; k < 6; k++) { ctx.fillStyle = "#ffb3d1"; ctx.beginPath(); ctx.ellipse(Math.cos(k) * 16, Math.sin(k) * 16, 12, 12, 0, 0, TAU); ctx.fill(); } ctx.fillStyle = "#ffd84d"; ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill(); break;
    case "skull": ctx.beginPath(); ctx.arc(0, -4, 26, 0, TAU); ctx.fill(); ctx.fillRect(-14, 14, 28, 16); eyes(-4, 10, 7); ctx.fillStyle = "#11131a"; ctx.fillRect(-6, 18, 3, 10); ctx.fillRect(3, 18, 3, 10); break;
    default: { // initials
      const ini = (c.name || "?").trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
      ctx.fillStyle = "#fff"; ctx.font = `700 ${ini.length > 1 ? 34 : 42}px Inter, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ini, 0, 3);
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- image attachments (inside chat bubbles)
export function drawAttachment(ctx, id, x, y, w, h, t, seed = 1) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 26); ctx.clip();
  ctx.translate(x, y);
  const r = rng(seed);
  const sky = (a, b) => { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, a); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); };
  const glow = (gx, gy, rr, c, a = 1) => radial(ctx, gx, gy, rr, c, a);
  const fillPath = (c, pts) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fill(); };
  const grain = (a = 0.06) => { for (let i = 0; i < 260; i++) { ctx.fillStyle = r() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; ctx.fillRect(r() * w, r() * h, 2, 2); } };
  switch (id) {
    case "door": sky("#1a1714", "#0b0a09"); glow(w / 2, h * 0.95, w * 0.5, "#ffcf7a", 0.35); ctx.fillStyle = "#3a2618"; ctx.fillRect(w * 0.28, h * 0.1, w * 0.44, h * 0.86); ctx.strokeStyle = "#241710"; ctx.lineWidth = 8; ctx.strokeRect(w * 0.33, h * 0.16, w * 0.34, h * 0.32); ctx.strokeRect(w * 0.33, h * 0.54, w * 0.34, h * 0.34); ctx.fillStyle = "#c9a24a"; ctx.beginPath(); ctx.arc(w * 0.64, h * 0.56, 10, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(255,210,120,.55)"; ctx.fillRect(w * 0.28, h * 0.95, w * 0.44, 6); grain(); break;
    case "hallway": { sky("#0c0b10", "#16131c"); const vx = w / 2, vy = h * 0.45; fillPath("#2a2430", [[0, h], [vx - 40, vy + 40], [vx + 40, vy + 40], [w, h]]); fillPath("#1c1822", [[0, 0], [vx - 40, vy - 40], [vx - 40, vy + 40], [0, h]]); fillPath("#1a1620", [[w, 0], [vx + 40, vy - 40], [vx + 40, vy + 40], [w, h]]); ctx.fillStyle = "#000"; ctx.fillRect(vx - 40, vy - 40, 80, 80); glow(vx, vy - 60, 90, "#fff3c0", 0.25); if (seed % 2) { ctx.fillStyle = "#000"; ctx.fillRect(vx - 6, vy - 26, 12, 54); ctx.beginPath(); ctx.arc(vx, vy - 32, 8, 0, TAU); ctx.fill(); } grain(0.08); break; }
    case "window": sky("#05060d", "#0d1020"); ctx.fillStyle = "#151a30"; ctx.fillRect(w * 0.18, h * 0.12, w * 0.64, h * 0.76); glow(w * 0.62, h * 0.3, 60, "#fff6d0", 0.6); ctx.fillStyle = "#e8e4c9"; ctx.beginPath(); ctx.arc(w * 0.62, h * 0.3, 22, 0, TAU); ctx.fill(); ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(w * 0.42, h * 0.62, 34, 44, 0, 0, TAU); ctx.fill(); ctx.fillRect(w * 0.36, h * 0.66, w * 0.12, h * 0.22); ctx.fillStyle = "#fff"; ctx.fillRect(w * 0.4, h * 0.6, 5, 4); ctx.fillRect(w * 0.43, h * 0.6, 5, 4); ctx.strokeStyle = "#3a3f55"; ctx.lineWidth = 10; ctx.strokeRect(w * 0.18, h * 0.12, w * 0.64, h * 0.76); ctx.beginPath(); ctx.moveTo(w / 2, h * 0.12); ctx.lineTo(w / 2, h * 0.88); ctx.moveTo(w * 0.18, h / 2); ctx.lineTo(w * 0.82, h / 2); ctx.stroke(); break;
    case "house": sky("#0a0d22", "#2a2350"); for (let i = 0; i < 30; i++) { ctx.fillStyle = "#fff"; ctx.globalAlpha = r(); ctx.fillRect(r() * w, r() * h * 0.5, 2, 2); } ctx.globalAlpha = 1; ctx.fillStyle = "#e8e4c9"; ctx.beginPath(); ctx.arc(w * 0.8, h * 0.18, 22, 0, TAU); ctx.fill(); fillPath("#14101e", [[w * 0.12, h * 0.95], [w * 0.12, h * 0.5], [w * 0.5, h * 0.24], [w * 0.88, h * 0.5], [w * 0.88, h * 0.95]]); [[0.25, 0.58], [0.62, 0.58], [0.25, 0.76]].forEach(([u, v], i) => { ctx.fillStyle = i === 1 ? "#ffd27a" : "#2a2440"; ctx.fillRect(w * u, h * v, w * 0.12, h * 0.1); }); ctx.fillStyle = "#0b1a10"; ctx.fillRect(0, h * 0.94, w, h * 0.06); break;
    case "forest": sky("#0a1418", "#16282a"); for (let i = 0; i < 9; i++) { const tx = (i / 8) * w + (r() - 0.5) * 30, th = h * (0.5 + r() * 0.4), c = i % 2 ? "#0b1512" : "#102019"; fillPath(c, [[tx, h - th], [tx - 50, h], [tx + 50, h]]); } glow(w * 0.5, h * 0.55, 60, "#e8fff0", 0.15); ctx.fillStyle = "rgba(200,230,220,.08)"; ctx.fillRect(0, h * 0.6, w, h * 0.4); break;
    case "shadow": sky("#07070b", "#120f18"); glow(w / 2, h * 0.4, w * 0.45, "#3a3260", 0.5); ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.36, 34, 44, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(w / 2 - 70, h); ctx.quadraticCurveTo(w / 2 - 70, h * 0.5, w / 2, h * 0.47); ctx.quadraticCurveTo(w / 2 + 70, h * 0.5, w / 2 + 70, h); ctx.fill(); ctx.fillStyle = "#e8e8ff"; ctx.fillRect(w / 2 - 14, h * 0.34, 7, 5); ctx.fillRect(w / 2 + 7, h * 0.34, 7, 5); grain(0.1); break;
    case "eye": sky("#040306", "#0a0710"); ctx.fillStyle = "#e9e3d6"; ctx.beginPath(); ctx.moveTo(w * 0.18, h / 2); ctx.quadraticCurveTo(w / 2, h * 0.18, w * 0.82, h / 2); ctx.quadraticCurveTo(w / 2, h * 0.82, w * 0.18, h / 2); ctx.fill(); ctx.fillStyle = "#5a7a3a"; ctx.beginPath(); ctx.arc(w / 2 + Math.sin(t) * 10, h / 2, h * 0.17, 0, TAU); ctx.fill(); ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(w / 2 + Math.sin(t) * 10, h / 2, h * 0.08, 0, TAU); ctx.fill(); grain(0.1); break;
    case "note": sky("#2a2520", "#1a1612"); ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-0.06); ctx.fillStyle = "#f3ead2"; ctx.fillRect(-w * 0.34, -h * 0.38, w * 0.68, h * 0.76); ctx.strokeStyle = "rgba(90,120,200,.4)"; ctx.lineWidth = 2; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(-w * 0.34, -h * 0.24 + i * h * 0.09); ctx.lineTo(w * 0.34, -h * 0.24 + i * h * 0.09); ctx.stroke(); } ctx.strokeStyle = "#8a1f2b"; ctx.lineWidth = 5; ctx.lineCap = "round"; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-w * 0.26, -h * 0.2 + i * h * 0.13); for (let k = 0; k < 6; k++) ctx.lineTo(-w * 0.26 + k * w * 0.09, -h * 0.2 + i * h * 0.13 + (r() - 0.5) * 12); ctx.stroke(); } ctx.restore(); break;
    case "selfie": { sky("#ffb38a", "#ff7a9a"); const cx = w / 2, cy = h * 0.55; ctx.fillStyle = "#3a2a5a"; ctx.beginPath(); ctx.ellipse(cx, h * 1.05, w * 0.36, h * 0.32, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#e0a37c"; ctx.beginPath(); ctx.arc(cx, cy, h * 0.2, 0, TAU); ctx.fill(); ctx.fillStyle = "#3b2416"; ctx.beginPath(); ctx.arc(cx, cy - h * 0.05, h * 0.21, Math.PI, 0); ctx.fill(); ctx.fillStyle = "#1b1d26"; ctx.beginPath(); ctx.arc(cx - 22, cy, 7, 0, TAU); ctx.arc(cx + 22, cy, 7, 0, TAU); ctx.fill(); ctx.strokeStyle = "#1b1d26"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy + 14, 18, 0.2, Math.PI - 0.2); ctx.stroke(); ctx.fillStyle = "#e0a37c"; ctx.beginPath(); ctx.ellipse(w * 0.83, h * 0.5, 30, 22, -0.6, 0, TAU); ctx.fill(); break; }
    case "photo-blur": sky("#1d1a22", "#0e0d12"); for (let i = 0; i < 8; i++) glow(r() * w, r() * h, 80 + r() * 80, ["#ffcf7a", "#7a8aff", "#ff7aa8"][i % 3], 0.35); ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.beginPath(); ctx.ellipse(w * 0.6, h * 0.55, 50, 110, 0.2, 0, TAU); ctx.fill(); grain(0.12); break;
    case "map": ctx.fillStyle = "#dfe8d6"; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = "#fff"; ctx.lineWidth = 16; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, r() * h); ctx.lineTo(w, r() * h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r() * w, 0); ctx.lineTo(r() * w, h); ctx.stroke(); } ctx.fillStyle = "#a8d0f0"; ctx.beginPath(); ctx.ellipse(w * 0.2, h * 0.75, 70, 40, 0.3, 0, TAU); ctx.fill(); { const px = w * 0.58, py = h * 0.48 - Math.abs(Math.sin(t * 3)) * 10; ctx.fillStyle = "#ff3d4e"; ctx.beginPath(); ctx.arc(px, py - 30, 26, Math.PI, 0); ctx.lineTo(px, py + 10); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(px, py - 30, 10, 0, TAU); ctx.fill(); } break;
    case "clock": sky("#13151f", "#0a0b10"); { const cx = w / 2, cy = h / 2, rr = Math.min(w, h) * 0.34; ctx.fillStyle = "#f3f0e6"; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill(); ctx.strokeStyle = "#1b1d26"; ctx.lineWidth = 8; ctx.stroke(); for (let k = 0; k < 12; k++) { const a = (k * TAU) / 12; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * rr * 0.82, cy + Math.sin(a) * rr * 0.82); ctx.lineTo(cx + Math.cos(a) * rr * 0.92, cy + Math.sin(a) * rr * 0.92); ctx.stroke(); } const a1 = -Math.PI / 2 + 3 * TAU / 12, a2 = -Math.PI / 2 + t * 0.6; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a1) * rr * 0.45, cy + Math.sin(a1) * rr * 0.45); ctx.stroke(); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a2) * rr * 0.72, cy + Math.sin(a2) * rr * 0.72); ctx.stroke(); } break;
    case "phone-screen": sky("#e9ebf0", "#d9dce4"); for (let i = 0; i < 5; i++) { const me = i % 2, bw = w * (0.4 + r() * 0.3); ctx.fillStyle = me ? "#6a4dff" : "#fff"; roundRect(ctx, me ? w - bw - 20 : 20, 24 + i * (h / 5.4), bw, h / 7.5, 16); ctx.fill(); } break;
    case "cat": sky("#ffe2b8", "#ffc98a"); ctx.fillStyle = "#3a3f4a"; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.75, w * 0.26, h * 0.22, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(w / 2, h * 0.42, h * 0.17, 0, TAU); ctx.fill(); fillPath("#3a3f4a", [[w / 2 - h * 0.15, h * 0.36], [w / 2 - h * 0.13, h * 0.18], [w / 2 - h * 0.04, h * 0.3]]); fillPath("#3a3f4a", [[w / 2 + h * 0.15, h * 0.36], [w / 2 + h * 0.13, h * 0.18], [w / 2 + h * 0.04, h * 0.3]]); ctx.fillStyle = "#c6ff3d"; ctx.beginPath(); ctx.ellipse(w / 2 - 26, h * 0.42, 10, 14, 0, 0, TAU); ctx.ellipse(w / 2 + 26, h * 0.42, 10, 14, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#000"; ctx.fillRect(w / 2 - 28, h * 0.4, 4, 16); ctx.fillRect(w / 2 + 24, h * 0.4, 4, 16); break;
    case "dog": sky("#b8e2ff", "#8fd0ff"); ctx.fillStyle = "#c9925a"; ctx.beginPath(); ctx.arc(w / 2, h * 0.48, h * 0.22, 0, TAU); ctx.fill(); ctx.fillStyle = "#8a5a32"; ctx.beginPath(); ctx.ellipse(w / 2 - h * 0.2, h * 0.46, 22, 46, 0.3, 0, TAU); ctx.ellipse(w / 2 + h * 0.2, h * 0.46, 22, 46, -0.3, 0, TAU); ctx.fill(); ctx.fillStyle = "#1b1d26"; ctx.beginPath(); ctx.arc(w / 2 - 26, h * 0.44, 8, 0, TAU); ctx.arc(w / 2 + 26, h * 0.44, 8, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(w / 2, h * 0.55, 14, 10, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#ff7a8a"; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.65, 10, 14 + Math.sin(t * 6) * 3, 0, 0, TAU); ctx.fill(); break;
    case "pizza": sky("#3a1f14", "#1a0e09"); ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(t * 0.2); ctx.fillStyle = "#e8a94a"; ctx.beginPath(); ctx.arc(0, 0, h * 0.38, 0, TAU); ctx.fill(); ctx.fillStyle = "#e5484d"; ctx.beginPath(); ctx.arc(0, 0, h * 0.33, 0, TAU); ctx.fill(); ctx.fillStyle = "#ffd27a"; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(0, 0, h * 0.33, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = "#a8262d"; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(Math.cos(i) * h * 0.18, Math.sin(i * 1.3) * h * 0.18, 16, 0, TAU); ctx.fill(); } ctx.restore(); break;
    case "cake": sky("#ffd6e7", "#ffb3d1"); ctx.fillStyle = "#fff6ea"; roundRect(ctx, w * 0.22, h * 0.5, w * 0.56, h * 0.36, 18); ctx.fill(); ctx.fillStyle = "#ff8ab8"; ctx.fillRect(w * 0.22, h * 0.5, w * 0.56, h * 0.08); for (let i = 0; i < 3; i++) { const cx = w * (0.36 + i * 0.14); ctx.fillStyle = "#6fb2ff"; ctx.fillRect(cx - 5, h * 0.36, 10, h * 0.14); ctx.fillStyle = "#ffcf3d"; ctx.beginPath(); ctx.ellipse(cx, h * 0.33 + Math.sin(t * 8 + i) * 2, 7, 12, 0, 0, TAU); ctx.fill(); } break;
    case "classroom": sky("#f0e6d2", "#e2d4b8"); ctx.fillStyle = "#2d4a3a"; ctx.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.42); ctx.strokeStyle = "#8a6a3c"; ctx.lineWidth = 10; ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.42); ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(w * 0.18, h * 0.22); ctx.lineTo(w * 0.5, h * 0.22); ctx.moveTo(w * 0.18, h * 0.32); ctx.lineTo(w * 0.62, h * 0.32); ctx.stroke(); ctx.font = `700 ${h * 0.1}px Inter`; ctx.fillStyle = "#fff"; ctx.fillText("QUIZ", w * 0.6, h * 0.45); for (let i = 0; i < 3; i++) { ctx.fillStyle = "#a8774a"; ctx.fillRect(w * (0.1 + i * 0.3), h * 0.72, w * 0.22, h * 0.08); ctx.fillRect(w * (0.12 + i * 0.3), h * 0.8, 8, h * 0.18); } break;
    case "test": sky("#cfd6e0", "#b8c2d0"); ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(0.05); ctx.fillStyle = "#fff"; ctx.fillRect(-w * 0.32, -h * 0.4, w * 0.64, h * 0.8); ctx.strokeStyle = "#c9ced8"; ctx.lineWidth = 3; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(-w * 0.26, -h * 0.2 + i * h * 0.08); ctx.lineTo(w * 0.26, -h * 0.2 + i * h * 0.08); ctx.stroke(); } ctx.fillStyle = "#e5484d"; ctx.font = `800 ${h * 0.22}px Inter`; ctx.textAlign = "center"; ctx.fillText(seed % 2 ? "F" : "A+", w * 0.16, -h * 0.18); ctx.strokeStyle = "#e5484d"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(w * 0.16, -h * 0.25, h * 0.15, 0, TAU); ctx.stroke(); ctx.restore(); break;
    case "bus": sky("#bfe3ff", "#9fd0ff"); ctx.fillStyle = "#ffcf3d"; roundRect(ctx, w * 0.08, h * 0.35, w * 0.84, h * 0.42, 24); ctx.fill(); ctx.fillStyle = "#9fd8ff"; for (let i = 0; i < 4; i++) ctx.fillRect(w * (0.14 + i * 0.18), h * 0.42, w * 0.13, h * 0.13); ctx.fillStyle = "#1b1d26"; ctx.beginPath(); ctx.arc(w * 0.26, h * 0.78, 28, 0, TAU); ctx.arc(w * 0.74, h * 0.78, 28, 0, TAU); ctx.fill(); ctx.fillStyle = "#1b1d26"; ctx.fillRect(w * 0.08, h * 0.62, w * 0.84, 8); break;
    case "car": sky("#05060d", "#11131f"); glow(w * 0.3, h * 0.62, 120, "#fff3b0", 0.5); glow(w * 0.7, h * 0.62, 120, "#fff3b0", 0.5); ctx.fillStyle = "#1c1f2a"; roundRect(ctx, w * 0.15, h * 0.45, w * 0.7, h * 0.3, 30); ctx.fill(); ctx.fillStyle = "#0a0b10"; roundRect(ctx, w * 0.25, h * 0.33, w * 0.5, h * 0.18, 20); ctx.fill(); ctx.fillStyle = "#fff6d0"; ctx.beginPath(); ctx.arc(w * 0.27, h * 0.6, 18, 0, TAU); ctx.arc(w * 0.73, h * 0.6, 18, 0, TAU); ctx.fill(); break;
    case "stars": sky("#04061a", "#1a1450"); for (let i = 0; i < 90; i++) { ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t + i)); ctx.fillRect(r() * w, r() * h, 2.5, 2.5); } ctx.globalAlpha = 1; ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w * 0.7, h * 0.15); ctx.lineTo(w * 0.85, h * 0.3); ctx.stroke(); break;
    case "portal": sky("#06041a", "#14082a"); for (let i = 0; i < 8; i++) { ctx.strokeStyle = i % 2 ? "#3de0ff" : "#c95cff"; ctx.globalAlpha = 0.8 - i * 0.08; ctx.lineWidth = 10 - i; ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w * 0.12 + i * 18 + Math.sin(t * 3 + i) * 4, h * 0.2 + i * 22, t * 0.5 + i, 0, TAU); ctx.stroke(); } ctx.globalAlpha = 1; glow(w / 2, h / 2, 90, "#ffffff", 0.7); break;
    case "robot": sky("#0d1a2a", "#14283e"); ctx.fillStyle = "#c8d2e0"; roundRect(ctx, w * 0.3, h * 0.2, w * 0.4, h * 0.34, 24); ctx.fill(); ctx.fillStyle = "#3de0ff"; ctx.fillRect(w * 0.37, h * 0.3, w * 0.08, h * 0.08); ctx.fillRect(w * 0.55, h * 0.3, w * 0.08, h * 0.08); ctx.fillStyle = "#c8d2e0"; roundRect(ctx, w * 0.25, h * 0.58, w * 0.5, h * 0.36, 24); ctx.fill(); ctx.fillStyle = "#ff3d6e"; ctx.beginPath(); ctx.arc(w / 2, h * 0.72, 14 + Math.sin(t * 5) * 3, 0, TAU); ctx.fill(); break;
    case "mountain": sky("#8fc8ff", "#e8f4ff"); fillPath("#5a6f8a", [[0, h], [w * 0.3, h * 0.3], [w * 0.55, h * 0.7], [w * 0.75, h * 0.25], [w, h * 0.6], [w, h]]); fillPath("#fff", [[w * 0.3, h * 0.3], [w * 0.24, h * 0.42], [w * 0.36, h * 0.42]]); fillPath("#fff", [[w * 0.75, h * 0.25], [w * 0.68, h * 0.38], [w * 0.82, h * 0.38]]); break;
    case "cave": sky("#0b0906", "#1a140d"); ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.7, w * 0.3, h * 0.45, 0, Math.PI, 0); ctx.fill(); glow(w / 2, h * 0.68, 70, "#ffb547", 0.6); break;
    case "treasure": sky("#1a120a", "#0d0905"); glow(w / 2, h * 0.5, w * 0.4, "#ffd84d", 0.5); ctx.fillStyle = "#8a5a2b"; roundRect(ctx, w * 0.24, h * 0.45, w * 0.52, h * 0.34, 16); ctx.fill(); ctx.fillStyle = "#a8774a"; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.45, w * 0.26, h * 0.12, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = "#ffd84d"; ctx.fillRect(w * 0.46, h * 0.48, w * 0.08, h * 0.12); break;
    case "ring": sky("#1a0d1a", "#0d060d"); glow(w / 2, h / 2, 140, "#ffd6f0", 0.4); ctx.strokeStyle = "#e8c35a"; ctx.lineWidth = 18; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.56, 70, 50, 0, 0, TAU); ctx.stroke(); ctx.fillStyle = "#e6f7ff"; ctx.beginPath(); ctx.moveTo(w / 2, h * 0.24); ctx.lineTo(w / 2 + 34, h * 0.36); ctx.lineTo(w / 2, h * 0.46); ctx.lineTo(w / 2 - 34, h * 0.36); ctx.closePath(); ctx.fill(); break;
    case "receipt": sky("#2a2d36", "#1a1c22"); ctx.fillStyle = "#fbfaf4"; ctx.fillRect(w * 0.28, h * 0.08, w * 0.44, h * 0.84); ctx.fillStyle = "#555"; ctx.font = `600 ${h * 0.045}px Inter`; for (let i = 0; i < 9; i++) ctx.fillRect(w * 0.32, h * (0.16 + i * 0.07), w * (0.2 + r() * 0.15), 4); ctx.fillStyle = "#e5484d"; ctx.fillText("$" + (40 + (seed % 900)) + ".00", w * 0.34, h * 0.86); break;
    case "polaroid": sky("#3a3026", "#241c15"); ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-0.08); ctx.fillStyle = "#f6f1e4"; ctx.fillRect(-w * 0.3, -h * 0.38, w * 0.6, h * 0.76); ctx.fillStyle = "#8a7a5a"; ctx.fillRect(-w * 0.26, -h * 0.33, w * 0.52, h * 0.5); ctx.fillStyle = "#5a4a3a"; ctx.beginPath(); ctx.arc(-w * 0.08, -h * 0.1, 26, 0, TAU); ctx.arc(w * 0.1, -h * 0.1, 26, 0, TAU); ctx.fill(); ctx.fillRect(-w * 0.18, -h * 0.02, w * 0.36, h * 0.18); ctx.restore(); grain(0.1); break;
    case "key": sky("#1a1714", "#0e0c0a"); glow(w / 2, h / 2, 120, "#ffd27a", 0.3); ctx.strokeStyle = "#d8b45a"; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(w * 0.36, h / 2, 34, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(w * 0.36 + 34, h / 2); ctx.lineTo(w * 0.75, h / 2); ctx.moveTo(w * 0.66, h / 2); ctx.lineTo(w * 0.66, h / 2 + 30); ctx.moveTo(w * 0.73, h / 2); ctx.lineTo(w * 0.73, h / 2 + 24); ctx.stroke(); break;
    case "yellow-hall": { sky("#d8c878", "#8a7a30"); const vx = w / 2, vy = h * 0.46; fillPath("#6a5a22", [[0, h], [vx - 30, vy + 30], [vx + 30, vy + 30], [w, h]]); fillPath("#b4a24c", [[0, 0], [vx - 30, vy - 30], [vx - 30, vy + 30], [0, h]]); fillPath("#ae9c48", [[w, 0], [vx + 30, vy - 30], [vx + 30, vy + 30], [w, h]]); fillPath("#cfc27e", [[0, 0], [w, 0], [vx + 30, vy - 30], [vx - 30, vy - 30]]); for (let i = 0; i < 4; i++) { const k = 0.25 + i * 0.18; ctx.fillStyle = "#fffbe0"; ctx.fillRect(vx - 40 * (1 - k), (vy - 30) * (1 - k) + 4, 80 * (1 - k), 10 * (1 - k)); } glow(vx, vy, 60, "#fff6c8", 0.8); ctx.fillStyle = "#3a3112"; ctx.fillRect(w * 0.12, h * 0.3, w * 0.06, h * 0.45); ctx.fillRect(w * 0.84, h * 0.34, w * 0.05, h * 0.4); grain(0.08); break; }
    case "fuse": { sky("#2a2a1e", "#121208"); glow(w / 2, h / 2, w * 0.45, "#ffb03d", 0.55); ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-0.5); ctx.fillStyle = "rgba(255,235,200,.35)"; roundRect(ctx, -w * 0.3, -h * 0.1, w * 0.6, h * 0.2, h * 0.08); ctx.fill(); ctx.fillStyle = "#b8b0a0"; ctx.fillRect(-w * 0.34, -h * 0.11, w * 0.09, h * 0.22); ctx.fillRect(w * 0.25, -h * 0.11, w * 0.09, h * 0.22); ctx.strokeStyle = "#ffcf5a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-w * 0.25, 0); for (let i = 0; i < 9; i++) ctx.lineTo(-w * 0.22 + i * w * 0.055, i % 2 ? -h * 0.05 : h * 0.05); ctx.lineTo(w * 0.25, 0); ctx.stroke(); ctx.restore(); grain(0.06); break; }
    case "footprints": sky("#e8e2d4", "#d4ccb8"); ctx.fillStyle = "#5a4a3a"; for (let i = 0; i < 6; i++) { const fx = w * (0.4 + (i % 2) * 0.18), fy = h * (0.9 - i * 0.15); ctx.beginPath(); ctx.ellipse(fx, fy, 16, 28, 0.1, 0, TAU); ctx.fill(); } break;
    default: sky("#2a2d36", "#1a1c22");
  }
  ctx.restore();
}
