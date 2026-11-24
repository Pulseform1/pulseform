// Canvas-drawn textures: the Pulsebox site on a monitor, a door/tile for every game, holograms, wallpaper.
import * as THREE from "three";

export const ALL_GAMES = ["Operation Ghost Town", "Night Market", "Sky Derby", "Heist Crew", "Baggage Panic", "Shellsmith", "Tetherpost Express", "Nibbleborough", "Bricktide Salvage", "Morrowfield",
  "Safecracker", "Cloudwash", "Bid Bandits", "Tiny Tee", "Flip Frenzy", "Spin Rally", "Hyperlane", "Blackwater Drift", "Duelpoint", "Lantern Keep", "Siegeworks", "The Hollow", "Bumper Brawl",
  "Paint Wars", "Turbo Laps", "Doodle Guess", "Cart Rush", "Odd Crowd", "Sea Battle", "Still Here", "Combo Cubes", "Pocket Bowl", "One More Night", "Dead Air", "Strata", "Flop Hoops",
  "Legend Maker", "Penalty Shootout", "Afterhours", "Lights Out Motel", "Sky Stack", "Tank Trouble", "Orbit Hop", "Lemonade Empire", "Brick Blitz", "Deep Signal", "Fruit Frenzy", "Tiny Aquarium",
  "Axe Spin", "Space Colony", "Hue Hop", "Sky Ace", "Neon Serpent", "Night Shift", "Chaos Climb", "Rooftop Rush", "Turbo Trail", "Horde Breaker", "Arena Rush", "Nightwatch", "Tiny Kingdom",
  "Stick Brawl Arena", "Merge Monsters", "Reel Legends", "Dig Deep", "Cluck Launch", "Getaway Heat", "Neon Drop", "Pulse Dash", "Pizza Empire", "The Endless Halls", "Tower Siege",
  "Neon Swarm", "Paper Plane Glide", "Shopping Cart Derby", "Cardboard Car Wars", "Raceword"];
// a colour pair per game (the hue comes from the name, so every door is different but stable)
const PALETTE = [["#ff3df0", "#3a0a4a"], ["#3de0ff", "#062a3a"], ["#ffd23d", "#3a2a06"], ["#3dff7a", "#06301a"], ["#ff5a3d", "#3a0e06"], ["#a56bff", "#1a0a3a"], ["#c6ff3d", "#1a2a06"], ["#ff7ad9", "#3a0a2a"], ["#7ad8ff", "#06203a"], ["#ffb547", "#3a2006"]];
export const gameColors = (name) => { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; };
export const FEATURED = { "Hyperlane": ["#ff3df0", "#2a0a4a"], "Deep Signal": ["#3de0ff", "#04202e"], "The Endless Halls": ["#ffe27a", "#3a3006"], "Night Shift": ["#ff5a3d", "#3a0e06"], "Safecracker": ["#ffd23d", "#3a2a06"], "Penalty Shootout": ["#3dff7a", "#06301a"], "Getaway Heat": ["#ff3d3d", "#3a0606"] };
const colorsFor = (n) => FEATURED[n] || gameColors(n);

function tex(canvas) { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const FONT = (w, px) => `${w} ${px}px 'Inter', 'Chakra Petch', sans-serif`;
const CHAKRA = (px) => `700 ${px}px 'Chakra Petch', 'Inter', sans-serif`;

function fitText(g, text, maxW, px, font) { let s = px; g.font = font(s); while (g.measureText(text).width > maxW && s > 10) { s -= 2; g.font = font(s); } return s; }

// a game door / tile: gradient, a glyph, the name
export function gameTile(name, { w = 256, h = 384, glyph = true } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
  const [a, b] = colorsFor(name);
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(0,0,0,.25)"; for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2);
  if (glyph) { g.globalAlpha = 0.35; g.fillStyle = "#fff"; g.font = `400 ${w * 0.9}px 'Luckiest Guy', sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(name[0], w / 2, h * 0.42); g.globalAlpha = 1; }
  g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(0, h * 0.72, w, h * 0.28);
  g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; const up = name.toUpperCase();
  const words = up.split(" "), lines = []; let cur = "";
  g.font = CHAKRA(Math.round(w * 0.13));
  for (const wd of words) { const tr = cur ? cur + " " + wd : wd; if (g.measureText(tr).width > w * 0.86 && cur) { lines.push(cur); cur = wd; } else cur = tr; }
  lines.push(cur);
  lines.slice(0, 2).forEach((l, i) => { fitText(g, l, w * 0.9, Math.round(w * 0.13), CHAKRA); g.fillText(l, w / 2, h * 0.79 + i * w * 0.14 - (lines.length > 1 ? w * 0.06 : 0)); });
  g.strokeStyle = a; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  return tex(c);
}

// the Pulsebox site as seen on Jay's monitor. state: { t, show78 (0..1), message, msgK (0..1 typed), dawn, title78 }
export class PulseboxScreen {
  constructor() { this.c = document.createElement("canvas"); this.c.width = 1280; this.c.height = 800; this.g = this.c.getContext("2d"); this.texture = tex(this.c); this.tiles = ALL_GAMES.slice(0, 15); }
  draw({ t = 0, show78 = 0, message = "", msgK = 0, glitch = 0, title78 = "78", focus78 = 0, mode = 0, press = 0, black = 0 }) {
    const g = this.g, W = 1280, H = 800;
    g.fillStyle = "#0b0d14"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#1b1e2a"; g.fillRect(0, 0, W, 64);
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(28 + i * 26, 32, 9, 0, 7); g.fill(); });
    g.fillStyle = "#0e1018"; rr(g, 120, 14, W - 160, 36, 18); g.fill();
    g.fillStyle = "#e8ecff"; g.font = FONT(600, 22); g.textBaseline = "middle"; g.fillText("box.pulseform.org", 150, 33);
    // header
    g.fillStyle = "#c6ff3d"; rr(g, 30, 88, 54, 54, 12); g.fill(); g.fillStyle = "#0b0d1a"; g.fillRect(43, 101, 28, 10); g.fillRect(43, 113, 10, 8); g.fillRect(43, 123, 28, 10); g.fillRect(61, 113, 10, 8);
    g.font = CHAKRA(48); g.fillStyle = "#fff"; g.fillText("PULSE", 100, 117); g.fillStyle = "#c6ff3d"; g.fillText("BOX", 100 + g.measureText("PULSE").width, 117);
    g.fillStyle = "#9aa3c7"; g.font = FONT(700, 22); g.textAlign = "right"; g.fillText(show78 > 0.5 ? "78 GAMES" : "77 GAMES", W - 40, 117); g.textAlign = "left";
    // the grid
    const cols = 4, gx = 30, gy = 170, gw = (W - 60 - 3 * 18) / cols, gh = 185;
    for (let i = 0; i < 12; i++) {
      const x = gx + (i % cols) * (gw + 18), y = gy + Math.floor(i / cols) * (gh + 18), last = i === 11;
      if (last && show78 > 0) {
        const jit = glitch ? (Math.random() - 0.5) * 30 * glitch : 0;
        g.fillStyle = "#050008"; rr(g, x + jit, y, gw, gh, 14); g.fill();
        g.save(); rr(g, x, y, gw, gh, 14); g.clip();
        for (let k = 0; k < 9; k++) { g.fillStyle = Math.random() < 0.5 ? "rgba(255,40,90,.35)" : "rgba(60,220,255,.25)"; g.fillRect(x + Math.random() * gw, y + Math.random() * gh, 40 + Math.random() * 120, 3 + Math.random() * 10); }
        g.globalAlpha = show78; g.fillStyle = "#ff2a5a"; g.shadowColor = "#ff2a5a"; g.shadowBlur = 30; g.font = `400 ${120 + focus78 * 10}px 'Luckiest Guy', sans-serif`; g.textAlign = "center"; g.fillText(title78, x + gw / 2 + jit, y + gh * 0.52); g.shadowBlur = 0; g.textAlign = "left"; g.globalAlpha = 1;
        g.restore();
        g.strokeStyle = `rgba(255,42,90,${0.6 + 0.4 * Math.sin(t * 9)})`; g.lineWidth = 5; rr(g, x, y, gw, gh, 14); g.stroke();
        continue;
      }
      const name = this.tiles[i], [a, b] = colorsFor(name);
      const gr = g.createLinearGradient(x, y, x + gw, y + gh); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; rr(g, x, y, gw, gh, 14); g.fill();
      g.fillStyle = "rgba(0,0,0,.5)"; g.fillRect(x, y + gh - 52, gw, 52);
      g.fillStyle = "#fff"; fitText(g, name.toUpperCase(), gw - 24, 24, CHAKRA); g.fillText(name.toUpperCase(), x + 14, y + gh - 26);
    }
    if (message) {   // the 78th game takes over the whole screen
      g.fillStyle = `rgba(4,0,8,${Math.min(0.94, msgK * 3)})`; g.fillRect(0, 64, W, H - 64);
      const shown = message.slice(0, Math.floor(message.length * Math.min(1, msgK * 1.4)));
      g.fillStyle = "#ff2a5a"; g.shadowColor = "#ff2a5a"; g.shadowBlur = 24; g.font = CHAKRA(64); g.textAlign = "center";
      const lines = shown.split("\n"), cy = 440; lines.forEach((l, i) => g.fillText(l, W / 2, cy + (i - (lines.length - 1) / 2) * 78));
      if (Math.sin(t * 8) > 0) { const lw = g.measureText(lines[lines.length - 1]).width; g.fillRect(W / 2 + lw / 2 + 8, cy + (lines.length - 1) / 2 * 78 - 26, 22, 52); }
      g.shadowBlur = 0; g.textAlign = "left";
    }
    if (mode > 0) {   // One Life: a hidden mode pops up (kept to the middle of the screen so a tall crop can read it)
      g.fillStyle = `rgba(3,2,8,${Math.min(0.92, mode * 1.5)})`; g.fillRect(0, 64, W, H - 64);
      const k = Math.min(1, mode * 1.6), cx = W / 2; g.save(); g.globalAlpha = k; g.translate(cx, 430); g.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k);
      g.fillStyle = "#0a0712"; rr(g, -280, -330, 560, 680, 30); g.fill(); g.strokeStyle = "#ff3d5e"; g.lineWidth = 6; g.shadowColor = "#ff3d5e"; g.shadowBlur = 30; rr(g, -280, -330, 560, 680, 30); g.stroke(); g.shadowBlur = 0;
      g.textAlign = "center"; g.fillStyle = "#ffd23d"; g.font = CHAKRA(30); g.fillText("NEW MODE UNLOCKED", 0, -270);
      g.fillStyle = "#ffffff"; g.font = "400 100px 'Luckiest Guy', sans-serif"; g.fillText("SPEEDRUN", 0, -180);
      [["3 GAMES", "#ffffff"], ["1 LIFE", "#ff3d5e"], ["NO SAVES", "#ffffff"]].forEach(([s, col], i) => { g.fillStyle = col; g.font = CHAKRA(62); g.fillText(s, 0, -80 + i * 80); });
      const pr = press > 0 && Math.sin(t * 30) > 0; g.fillStyle = pr ? "#ffffff" : "#ff3d5e"; g.shadowColor = "#ff3d5e"; g.shadowBlur = 20 + 20 * Math.sin(t * 6); rr(g, -150, 205, 300, 90, 45); g.fill(); g.shadowBlur = 0;
      g.fillStyle = pr ? "#ff3d5e" : "#ffffff"; g.font = CHAKRA(50); g.fillText("START", 0, 252); g.restore(); g.textAlign = "left";
    }
    g.fillStyle = "rgba(255,255,255,.035)"; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
    if (black > 0) { g.fillStyle = `rgba(0,0,0,${black})`; g.fillRect(0, 0, W, H); }
    this.texture.needsUpdate = true;
  }
}

// a big glowing "78" for the hub
export function hologram78() {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 1024; const g = c.getContext("2d");
  g.clearRect(0, 0, 1024, 1024); g.textAlign = "center"; g.textBaseline = "middle"; g.font = "400 640px 'Luckiest Guy', sans-serif";
  g.shadowColor = "#ff2a5a"; g.shadowBlur = 60; g.fillStyle = "#ff2a5a"; g.fillText("78", 512, 560);
  g.shadowBlur = 0; g.fillStyle = "rgba(255,200,220,.85)"; g.fillText("78", 512, 560);
  g.globalCompositeOperation = "destination-out"; for (let y = 0; y < 1024; y += 10) g.fillRect(0, y, 1024, 3);
  return tex(c);
}
export function labelTexture(text, { w = 1024, h = 256, color = "#ffffff", font = "Chakra", px = 140, glow = null } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
  g.textAlign = "center"; g.textBaseline = "middle"; g.font = font === "Chakra" ? CHAKRA(px) : `400 ${px}px 'Luckiest Guy', sans-serif`;
  if (glow) { g.shadowColor = glow; g.shadowBlur = 40; }
  g.fillStyle = color; g.fillText(text, w / 2, h / 2 + 6);
  return tex(c);
}
export function wallpaper() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d");
  g.fillStyle = "#cdb85e"; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 32) { g.fillStyle = "rgba(120,96,20,.22)"; g.fillRect(x, 0, 10, 256); g.fillStyle = "rgba(255,240,170,.15)"; g.fillRect(x + 14, 0, 4, 256); }
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(80,60,10,${Math.random() * 0.08})`; g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export function windowsTexture(seed = 1, hue = 0) {
  const c = document.createElement("canvas"); c.width = 128; c.height = 512; const g = c.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, 128, 512);
  let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let y = 8; y < 512; y += 16) for (let x = 8; x < 128; x += 20) { if (r() < 0.45) continue; g.fillStyle = ["#ff3df0", "#3de0ff", "#ffd23d", "#ffffff", "#7a5cff"][Math.floor(r() * 5 + hue) % 5]; g.globalAlpha = 0.4 + r() * 0.6; g.fillRect(x, y, 10, 7); }
  const t = tex(c); return t;
}
export function radialGlow(color = "255,255,255") {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d");
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, `rgba(${color},1)`); gr.addColorStop(0.35, `rgba(${color},.45)`); gr.addColorStop(1, `rgba(${color},0)`); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return tex(c);
}
export function streakTexture() {
  const c = document.createElement("canvas"); c.width = 16; c.height = 256; const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.8, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(4, 0, 8, 256);
  return tex(c);
}
