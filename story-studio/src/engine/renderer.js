// Draws one 1080 x 1920 frame of a compiled story at time t. Used for the live preview and for export.
import { clamp, lerp, prog, easeOut, easeInOut, easeBack, roundRect, wrapText, stripMarkup, rng } from "./util.js";
import { drawBackground, drawHandsBack, drawHandsFront, drawAvatar, drawAttachment } from "./art.js";
import { drawScene } from "./scenes.js";
import "./scenes2.js";   // registers the game-world scenes
import "./scenes3.js";
import "./scenes4.js";
import { SCENE_IN, SCENE_OUT } from "./timeline.js";   // fallback durations
import { CHAT_THEMES } from "../story/model.js";

export const W = 1080, H = 1920;
export const PHONE = { x: 170, y: 250, w: 740, h: 1540 };
const BEZEL = 20, SCREEN_R = 76;
const SCREEN = { x: PHONE.x + BEZEL, y: PHONE.y + BEZEL, w: PHONE.w - BEZEL * 2, h: PHONE.h - BEZEL * 2 };
const STATUS_H = 74, HEADER_H = 140, COMPOSER_H = 140;
const VIEW = { x: SCREEN.x, y: SCREEN.y + STATUS_H + HEADER_H, w: SCREEN.w, h: SCREEN.h - STATUS_H - HEADER_H - COMPOSER_H };
const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const TEXT_SIZE = 33, LINE_H = 44, PAD_X = 26, PAD_Y = 18, MAX_BUBBLE = Math.round(VIEW.w * 0.74);
const IMG_W = Math.round(VIEW.w * 0.62), IMG_H = Math.round(IMG_W * 0.75);
const AV_R = 24, EDGE = 22;

// ------------------------------------------------------------------ layout (measured once per story)
let measureCtx = null;
function mctx() { if (!measureCtx) measureCtx = (typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(8, 8) : document.createElement("canvas")).getContext("2d"); return measureCtx; }

export function layoutStory(compiled) {
  const { story, items } = compiled;
  const ctx = mctx();
  const group = story.group;
  let y = 26;
  const rows = [];
  // a "Today" stamp at the top, like a real chat
  rows.push({ kind: "stamp", y, h: 44, text: `Today ${story.clock || ""}`.trim() });
  y += 44 + 18;
  let prevFrom = null;
  for (const it of items) {
    if (it.side === "scene" || it.side === "voice") continue;   // scenes are full-screen cutaways and spoken lines have no bubble
    const m = it.msg;
    const gap = prevFrom === null ? 0 : prevFrom === m.from ? 8 : 22;
    y += gap;
    const row = { it, kind: m.type === "system" || it.side === "center" ? "system" : m.type, side: it.side, y };
    if (row.kind === "system") {
      ctx.font = `500 25px ${FONT}`;
      const lines = wrapText(ctx, stripMarkup(m.text), VIEW.w * 0.76);
      row.lines = lines; row.w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 44; row.h = lines.length * 34 + 22;
    } else {
      const showName = group && it.side === "left" && prevFrom !== m.from;
      row.nameH = showName ? 34 : 0; row.showName = showName;
      if (m.type === "image") {
        ctx.font = `400 ${TEXT_SIZE}px ${FONT}`;
        const cap = m.text ? wrapText(ctx, stripMarkup(m.text), IMG_W - PAD_X * 2) : [];
        row.lines = cap; row.w = IMG_W + 12; row.h = IMG_H + 12 + (cap.length ? cap.length * LINE_H + PAD_Y : 0);
      } else if (m.type === "missed-call") {
        row.lines = [stripMarkup(m.text) || "Missed voice call"]; ctx.font = `600 ${TEXT_SIZE}px ${FONT}`;
        row.w = ctx.measureText(row.lines[0]).width + PAD_X * 2 + 64; row.h = LINE_H + PAD_Y * 2 + 8;
      } else {
        const text = m.type === "deleted" ? "This message was deleted" : stripMarkup(m.text);
        ctx.font = `${m.type === "deleted" ? "italic 400" : "400"} ${TEXT_SIZE}px ${FONT}`;
        const lines = wrapText(ctx, text || " ", MAX_BUBBLE - PAD_X * 2);
        // a message that is only emoji (1-3 of them) shows big, without a bubble
        const emojiOnly = /^\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic})*(\s*\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic})*){0,2}$/u.test(text.trim());
        row.emojiOnly = emojiOnly;
        row.lines = lines;
        row.w = emojiOnly ? 160 : Math.max(...lines.map((l) => ctx.measureText(l).width)) + PAD_X * 2;
        row.h = emojiOnly ? 110 : lines.length * LINE_H + PAD_Y * 2;
      }
      row.h += row.nameH;
    }
    y += row.h;
    row.bottom = y;
    rows.push(row);
    it.row = row;
    prevFrom = m.from;
  }
  rows.forEach((r, i) => { const n = rows[i + 1]; r.lastOfRun = !n || !n.it || n.it.msg.from !== r.it?.msg.from || n.kind === "system"; });
  return { rows, contentBottom: y };
}

// Where the chat scrolls to after each event, so it glides instead of jumping.
function scrollTrack(compiled, layout) {
  const changes = [{ t: 0, s: 0 }];
  const target = (bottom) => Math.max(0, bottom + 150 - VIEW.h);
  for (const it of compiled.items) {
    if (!it.row) continue;
    if (it.typingDur > 0) changes.push({ t: it.tStart, s: target(it.row.y + (it.row.nameH || 0) + 96) });
    changes.push({ t: it.tAppear, s: target(it.row.bottom) });
  }
  return changes;
}
function scrollAt(track, t) {
  let i = 0;
  while (i + 1 < track.length && track[i + 1].t <= t) i++;
  const cur = track[i], prev = track[Math.max(0, i - 1)];
  if (i === 0) return cur.s;
  return lerp(prev.s, cur.s, easeInOut(clamp((t - cur.t) / 0.42)));
}

// ------------------------------------------------------------------ the frame
export function createRenderer() {
  let cacheKey = null, layout = null, track = null;
  const imgCache = new Map();
  function ensure(compiled) {
    const key = compiled;   // a new compile produces a new object
    if (key !== cacheKey) { layout = layoutStory(compiled); track = scrollTrack(compiled, layout); cacheKey = key; }
  }
  function loadImage(src) {
    if (!src || imgCache.has(src)) return;
    const img = new Image(); img.src = src; imgCache.set(src, img);
  }
  const sources = (story) => [...story.characters.map((c) => c.image), ...story.messages.map((m) => (m.image?.startsWith("data:") ? m.image : ""))].filter(Boolean);
  return {
    layout: () => layout,
    draw(ctx, compiled, t) {
      ensure(compiled);
      sources(compiled.story).forEach(loadImage);
      drawFrame(ctx, compiled, t, layout, track, imgCache);
    },
    // uploaded pictures load asynchronously: exports wait for them so the first frames aren't missing any
    async preload(compiled) {
      const srcs = sources(compiled.story); srcs.forEach(loadImage);
      await Promise.all(srcs.map((s) => imgCache.get(s).decode().catch(() => {})));
    },
  };
}

function activeEffects(compiled, t) {
  return compiled.effects.filter((e) => t >= e.start && t < e.end + 0.35);
}

function drawFrame(ctx, compiled, t, layout, track, imgCache) {
  const { story } = compiled;
  const theme = CHAT_THEMES.find((c) => c.id === story.look.chatTheme) || CHAT_THEMES[0];
  const fx = activeEffects(compiled, t);
  const fxk = (type) => { const e = fx.find((f) => f.type === type); if (!e) return 0; const inK = clamp((t - e.start) / 0.25), outK = 1 - clamp((t - e.end) / 0.35); return Math.min(inK, outK); };
  const dark = fxk("darken");

  // scene cutaways: dip to black, the phone drops away, the scene plays, and back
  const sc = sceneAt(compiled, t);
  if (sc && sc.q < 0.5 && sc.toBlack) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); drawOverlays(ctx, compiled, t, fx, fxk); return; }
  if (sc && sc.q >= 0.5) {
    const it = sc.it, base = it.tStart;
    drawScene(ctx, it.msg.scene, t - base, it.sceneEnd - base, { figT: it.figureT != null ? it.figureT - base : null, label: it.msg.label, nEnd: (it.nEnd ?? it.sceneEnd) - base, hard: compiled.story.look.cut === "hard" });
    if (dark) { ctx.fillStyle = `rgba(0,0,0,${0.55 * dark})`; ctx.fillRect(0, 0, W, H); }
    if (sc.q < 1) { ctx.fillStyle = `rgba(0,0,0,${(1 - sc.q) * 2})`; ctx.fillRect(0, 0, W, H); }
    drawOverlays(ctx, compiled, t, fx, fxk);
    return;
  }

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, story.look.background, t, dark);
  if (dark) { ctx.fillStyle = `rgba(0,0,0,${0.55 * dark})`; ctx.fillRect(0, 0, W, H); }

  // camera: slow drift, zoom on dramatic moments, shake on surprises, heartbeat pulse
  let zoom = 1 + Math.sin(t * 0.25) * 0.006, ox = 0, oy = 0, focusY = PHONE.y + PHONE.h / 2;
  const zk = fxk("zoom");
  if (zk && fx.find((f) => f.type === "zoom").item.row) { const e = fx.find((f) => f.type === "zoom"); zoom += 0.16 * easeInOut(zk); const row = e.item.row; const scr = scrollAt(track, t); focusY = clamp(VIEW.y + row.y - scr + row.h / 2, PHONE.y + 300, PHONE.y + PHONE.h - 300); }
  const hb = fxk("heartbeat");
  if (hb) { const ph = (t * 1.6) % 1; zoom += hb * (ph < 0.15 ? Math.sin((ph / 0.15) * Math.PI) * 0.035 : ph > 0.3 && ph < 0.42 ? Math.sin(((ph - 0.3) / 0.12) * Math.PI) * 0.025 : 0); }
  const sk = fxk("shake");
  if (sk) { const r = rng(Math.floor(t * 60)); ox = (r() - 0.5) * 46 * sk; oy = (r() - 0.5) * 46 * sk; }
  if (sc) oy += Math.pow(sc.q * 2, 2) * 900;   // the phone drops out of frame
  ctx.translate(540 + ox, focusY + oy); ctx.scale(zoom, zoom); ctx.translate(-540, -focusY);

  // hands, phone, screen
  const typingMe = compiled.items.find((it) => it.side === "right" && it.composeDur > 0 && t >= it.tAppear - it.composeDur && t < it.tAppear + 0.15);
  const tap = typingMe ? Math.abs(Math.sin(t * 17)) : 0;
  drawHandsBack(ctx, PHONE, story.look.skin);
  drawPhone(ctx, compiled, t, layout, track, theme, imgCache, typingMe);
  drawHandsFront(ctx, PHONE, story.look.skin, tap);
  ctx.restore();
  if (sc) { ctx.fillStyle = `rgba(0,0,0,${sc.q * 2})`; ctx.fillRect(0, 0, W, H); }
  drawOverlays(ctx, compiled, t, fx, fxk);
}

// q: 0 = the chat, 1 = the scene fully on screen
function sceneAt(compiled, t) {
  for (const it of compiled.items) {
    if (it.side !== "scene" || (t < it.tStart && it.i !== 0) || t >= it.sceneEnd) continue;   // a story that opens on a scene shows it from frame one
    const qIn = it.i === 0 ? 1 : clamp((t - it.tStart) / (it.inDur || SCENE_IN)), qOut = clamp((it.sceneEnd - t) / (it.outDur || SCENE_OUT));
    // between two scenes the cut goes through black instead of back to the phone
    const toBlack = qIn < qOut ? it.chainIn : it.chainOut;
    return { it, q: Math.min(qIn, qOut), toBlack };
  }
  return null;
}

function drawOverlays(ctx, compiled, t, fx, fxk) {
  const hb = fxk("heartbeat");
  // full-frame effects
  const gk = fxk("glitch");
  if (gk > 0.02) glitch(ctx, t, gk);
  const fk = fx.find((f) => f.type === "flash");
  if (fk) { const a = 1 - clamp((t - fk.start) / 0.45); if (a > 0) { ctx.fillStyle = `rgba(255,255,255,${0.85 * a})`; ctx.fillRect(0, 0, W, H); } }
  if (hb) { const g = ctx.createRadialGradient(540, 960, 400, 540, 960, 1200); g.addColorStop(0, "rgba(120,0,20,0)"); g.addColorStop(1, `rgba(120,0,20,${0.45 * hb})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

  drawHook(ctx, compiled, t);
  drawCaptions(ctx, compiled, t);
  drawOutro(ctx, compiled, t);
}

function glitch(ctx, t, k) {
  const r = rng(Math.floor(t * 24));
  const canvas = ctx.canvas;
  const px = canvas.width / W;   // the preview canvas can be smaller than 1080 wide
  for (let i = 0; i < 9; i++) {
    const y = r() * H, h = 12 + r() * 90, dx = (r() - 0.5) * 120 * k;
    try { ctx.drawImage(canvas, 0, y * px, canvas.width, h * px, dx, y, W, h); } catch { /* canvas not readable */ }
  }
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = `rgba(255,0,80,${0.12 * k})`; ctx.fillRect(r() * 20 - 10, 0, W, H);
  ctx.fillStyle = `rgba(0,220,255,${0.1 * k})`; ctx.fillRect(r() * 20 - 10, 0, W, H);
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < 14; i++) { ctx.fillStyle = `rgba(255,255,255,${0.25 * k * r()})`; ctx.fillRect(0, r() * H, W, 2 + r() * 4); }
}

// ------------------------------------------------------------------ the phone
function drawPhone(ctx, compiled, t, layout, track, theme, imgCache, typingMe) {
  const { story } = compiled;
  const P = PHONE;
  // body with soft shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 26;
  const body = ctx.createLinearGradient(P.x, 0, P.x + P.w, 0);
  body.addColorStop(0, "#2c2f3a"); body.addColorStop(0.5, "#191b23"); body.addColorStop(1, "#2c2f3a");
  ctx.fillStyle = body; roundRect(ctx, P.x, P.y, P.w, P.h, SCREEN_R + BEZEL); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 3; roundRect(ctx, P.x + 2, P.y + 2, P.w - 4, P.h - 4, SCREEN_R + BEZEL - 2); ctx.stroke();
  ctx.fillStyle = "#2a2d38"; roundRect(ctx, P.x - 7, P.y + 260, 9, 90, 4); ctx.fill(); roundRect(ctx, P.x - 7, P.y + 380, 9, 140, 4); ctx.fill(); roundRect(ctx, P.x + P.w - 2, P.y + 330, 9, 170, 4); ctx.fill();

  // screen
  ctx.save();
  roundRect(ctx, SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, SCREEN_R); ctx.clip();
  const light = !!theme.light;
  const bg = light ? "#f2f3f7" : "#0d0f15";
  ctx.fillStyle = bg; ctx.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);
  // faint wallpaper
  ctx.globalAlpha = light ? 0.05 : 0.06; ctx.fillStyle = theme.me[0];
  for (let i = 0; i < 40; i++) { const r = rng(i + 5); ctx.beginPath(); ctx.arc(SCREEN.x + r() * SCREEN.w, SCREEN.y + r() * SCREEN.h, 4 + r() * 14, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;

  drawMessages(ctx, compiled, t, layout, track, theme, imgCache);
  drawHeader(ctx, compiled, t, theme, imgCache);
  drawStatusBar(ctx, story, light);
  drawComposer(ctx, compiled, t, theme, typingMe);
  // screen glare
  const gl = ctx.createLinearGradient(SCREEN.x, SCREEN.y, SCREEN.x + SCREEN.w, SCREEN.y + SCREEN.h);
  gl.addColorStop(0, "rgba(255,255,255,.07)"); gl.addColorStop(0.35, "rgba(255,255,255,0)"); gl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gl; ctx.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);
  ctx.restore();
  // camera pill
  ctx.fillStyle = "#000"; roundRect(ctx, 540 - 90, SCREEN.y + 16, 180, 46, 23); ctx.fill();
}

function drawStatusBar(ctx, story, light) {
  const y = SCREEN.y + 46, c = light ? "#111318" : "#fff";
  ctx.fillStyle = c; ctx.font = `600 29px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(story.clock || "11:42", SCREEN.x + 70, y);
  const rx = SCREEN.x + SCREEN.w - 64;
  for (let i = 0; i < 4; i++) { ctx.globalAlpha = i < 3 ? 1 : 0.35; ctx.fillRect(rx - 150 + i * 12, y + 8 - (i + 1) * 5, 8, (i + 1) * 5); }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(rx - 80, y + 10, 6 + i * 7, -Math.PI * 0.75, -Math.PI * 0.25); ctx.stroke(); }
  ctx.lineWidth = 3; roundRect(ctx, rx - 46, y - 11, 42, 22, 6); ctx.stroke(); ctx.fillRect(rx - 42, y - 7, 26, 14); ctx.fillRect(rx - 2, y - 4, 4, 8);
}

function drawHeader(ctx, compiled, t, theme, imgCache) {
  const { story } = compiled;
  const light = !!theme.light, y0 = SCREEN.y + STATUS_H;
  ctx.fillStyle = light ? "rgba(248,249,252,.96)" : "rgba(18,20,28,.96)";
  ctx.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, STATUS_H + HEADER_H);
  ctx.fillStyle = light ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.07)"; ctx.fillRect(SCREEN.x, y0 + HEADER_H - 2, SCREEN.w, 2);
  const others = story.characters.filter((c) => c.id !== "me");
  const main = others[0] || story.characters[0];
  const cy = y0 + HEADER_H / 2;
  // back chevron
  ctx.strokeStyle = theme.me[0]; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(SCREEN.x + 54, cy - 18); ctx.lineTo(SCREEN.x + 36, cy); ctx.lineTo(SCREEN.x + 54, cy + 18); ctx.stroke();
  // avatar(s)
  const ax = SCREEN.x + 120;
  if (story.group && others.length > 1) { drawAvatar(ctx, others[1], ax + 18, cy - 10, 32, imgCache); drawAvatar(ctx, others[0], ax - 6, cy + 10, 32, imgCache); }
  else drawAvatar(ctx, main, ax, cy, 44, imgCache);
  // name + status
  const typingNow = compiled.items.find((it) => it.typingDur > 0 && t >= it.tStart && t < it.tAppear);
  const title = story.chatTitle || (story.group ? "Group chat" : main.name);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = light ? "#111318" : "#fff"; ctx.font = `700 35px ${FONT}`;
  ctx.fillText(fit(ctx, title, 380), ax + 66, cy - 4);
  ctx.font = `500 25px ${FONT}`;
  let status = story.chatStatus || (story.group ? others.map((c) => c.name).concat("You").join(", ") : "online");
  if (typingNow) status = story.group ? `${typingNow.char?.name || "Someone"} is typing…` : "typing…";
  ctx.fillStyle = typingNow ? theme.me[0] : light ? "#6b7080" : "#8b90a0";
  ctx.fillText(fit(ctx, status, 380), ax + 66, cy + 32);
  // call + video icons
  const ix = SCREEN.x + SCREEN.w - 70;
  ctx.strokeStyle = theme.me[0]; ctx.lineWidth = 5;
  roundRect(ctx, ix - 120, cy - 16, 44, 32, 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ix - 76, cy - 4); ctx.lineTo(ix - 60, cy - 14); ctx.lineTo(ix - 60, cy + 14); ctx.lineTo(ix - 76, cy + 4); ctx.stroke();
  // info button
  ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(ix + 4, cy, 22, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = theme.me[0]; ctx.fillRect(ix + 1, cy - 4, 6, 16); ctx.beginPath(); ctx.arc(ix + 4, cy - 11, 3.6, 0, Math.PI * 2); ctx.fill();
}
function fit(ctx, s, maxW) { if (ctx.measureText(s).width <= maxW) return s; while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1); return s + "…"; }

function drawComposer(ctx, compiled, t, theme, typingMe) {
  const light = !!theme.light, y0 = SCREEN.y + SCREEN.h - COMPOSER_H;
  ctx.fillStyle = light ? "rgba(248,249,252,.97)" : "rgba(18,20,28,.97)"; ctx.fillRect(SCREEN.x, y0, SCREEN.w, COMPOSER_H);
  const fx = SCREEN.x + 96, fy = y0 + 22, fw = SCREEN.w - 200, fh = 66;
  ctx.strokeStyle = theme.me[0]; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(SCREEN.x + 44, fy + fh / 2); ctx.lineTo(SCREEN.x + 74, fy + fh / 2); ctx.moveTo(SCREEN.x + 59, fy + fh / 2 - 15); ctx.lineTo(SCREEN.x + 59, fy + fh / 2 + 15); ctx.stroke();
  ctx.fillStyle = light ? "#e4e6ec" : "#1f2230"; roundRect(ctx, fx, fy, fw, fh, fh / 2); ctx.fill();
  ctx.font = `400 29px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  let txt = "", active = false;
  if (typingMe && t < typingMe.tAppear) {
    const k = clamp((t - (typingMe.tAppear - typingMe.composeDur)) / (typingMe.composeDur * 0.92));
    txt = typingMe.plain.slice(0, Math.ceil(typingMe.plain.length * k)); active = true;
  }
  if (txt) {
    ctx.fillStyle = light ? "#111318" : "#fff";
    let shown = txt; while (shown.length && ctx.measureText(shown).width > fw - 60) shown = shown.slice(1);
    ctx.fillText(shown, fx + 28, fy + fh / 2 + 1);
    if ((t * 2.2) % 1 < 0.6) { ctx.fillStyle = theme.me[0]; ctx.fillRect(fx + 30 + ctx.measureText(shown).width, fy + 16, 3, fh - 32); }
  } else { ctx.fillStyle = light ? "#9aa0ae" : "#5d6273"; ctx.fillText("Message", fx + 28, fy + fh / 2 + 1); }
  // send button
  const bx = SCREEN.x + SCREEN.w - 56, by = fy + fh / 2;
  const g = ctx.createLinearGradient(bx - 30, by - 30, bx + 30, by + 30); g.addColorStop(0, theme.me[0]); g.addColorStop(1, theme.me[1]);
  ctx.fillStyle = active ? g : light ? "#c9cdd8" : "#2a2e3c"; ctx.beginPath(); ctx.arc(bx, by, 32 * (active ? 1 + Math.sin(t * 8) * 0.04 : 1), 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = theme.meText || "#fff"; ctx.lineWidth = 5; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(bx, by + 13); ctx.lineTo(bx, by - 13); ctx.moveTo(bx - 11, by - 3); ctx.lineTo(bx, by - 14); ctx.lineTo(bx + 11, by - 3); ctx.stroke();
}

function drawMessages(ctx, compiled, t, layout, track, theme, imgCache) {
  const { story } = compiled;
  const light = !!theme.light;
  const scroll = scrollAt(track, t);
  ctx.save();
  ctx.beginPath(); ctx.rect(VIEW.x, VIEW.y, VIEW.w, VIEW.h); ctx.clip();
  const top = VIEW.y - scroll;
  for (const row of layout.rows) {
    if (row.kind === "stamp") {
      if (top + row.y + row.h < VIEW.y - 50) continue;
      ctx.font = `600 23px ${FONT}`; ctx.fillStyle = light ? "#8a8f9c" : "#6b7080"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(row.text, VIEW.x + VIEW.w / 2, top + row.y + row.h / 2);
      continue;
    }
    const it = row.it;
    if (t < it.tAppear) {
      // typing indicator for the incoming message
      if (it.typingDur > 0 && t >= it.tStart) drawTyping(ctx, it, top + row.y + (row.nameH || 0), t, theme, story, imgCache, row);
      break;
    }
    const y = top + row.y;
    if (y > VIEW.y + VIEW.h + 40) break;
    if (y + row.h < VIEW.y - 60) continue;
    const k = clamp((t - it.tAppear) / 0.34);
    const e = easeBack(k);
    ctx.save();
    ctx.globalAlpha = clamp(k * 2.2);
    const dx = row.side === "right" ? (1 - e) * 70 : row.side === "left" ? -(1 - e) * 70 : 0;
    const pivotX = row.side === "right" ? VIEW.x + VIEW.w - EDGE : row.side === "left" ? VIEW.x + EDGE : VIEW.x + VIEW.w / 2;
    ctx.translate(pivotX + dx, y + row.h + (1 - e) * 26); ctx.scale(0.82 + 0.18 * e, 0.82 + 0.18 * e); ctx.translate(-pivotX, -(y + row.h));
    drawRow(ctx, row, y, t, theme, story, imgCache);
    ctx.restore();
  }
  // "Read" under the last message you sent, once the other side has seen it
  const lastMe = [...compiled.items].reverse().find((it) => it.side === "right" && t >= it.tAppear + 0.9);
  if (lastMe) {
    const nxt = compiled.items[lastMe.i + 1];
    if (!nxt || t < nxt.tAppear) {
      ctx.globalAlpha = clamp((t - lastMe.tAppear - 0.9) / 0.3);
      ctx.font = `500 21px ${FONT}`; ctx.fillStyle = light ? "#8a8f9c" : "#6b7080"; ctx.textAlign = "right"; ctx.textBaseline = "top";
      ctx.fillText("Read", VIEW.x + VIEW.w - EDGE - 6, top + lastMe.row.bottom + 6);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

function bubbleFill(ctx, theme, side, x, y, w, h) {
  if (side === "right") { const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, theme.me[0]); g.addColorStop(1, theme.me[1]); return g; }
  return theme.them;
}
function bubblePath(ctx, side, x, y, w, h, tail) {
  roundRect(ctx, x, y, w, h, Math.min(34, h / 2));
  ctx.fill();
  if (!tail) return;
  // a small curved tail at the bottom corner, filled on its own so it never cuts into the bubble
  ctx.beginPath();
  if (side === "right") { ctx.moveTo(x + w - 34, y + h - 4); ctx.quadraticCurveTo(x + w - 6, y + h, x + w + 12, y + h + 2); ctx.quadraticCurveTo(x + w - 2, y + h - 14, x + w - 4, y + h - 34); ctx.closePath(); }
  else { ctx.moveTo(x + 34, y + h - 4); ctx.quadraticCurveTo(x + 6, y + h, x - 12, y + h + 2); ctx.quadraticCurveTo(x + 2, y + h - 14, x + 4, y + h - 34); ctx.closePath(); }
}

function drawRow(ctx, row, y, t, theme, story, imgCache) {
  const it = row.it, m = it.msg, light = !!theme.light;
  if (row.kind === "system") {
    const x = VIEW.x + (VIEW.w - row.w) / 2;
    ctx.fillStyle = light ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.08)"; roundRect(ctx, x, y, row.w, row.h, 18); ctx.fill();
    ctx.fillStyle = light ? "#5d6273" : "#a5aabb"; ctx.font = `500 25px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
    row.lines.forEach((l, i) => ctx.fillText(l, VIEW.x + VIEW.w / 2, y + 12 + i * 34));
    return;
  }
  const group = story.group, left = row.side === "left";
  const avatarSpace = group && left ? AV_R * 2 + 14 : 0;
  let by = y + (row.nameH || 0);
  if (row.showName) { ctx.font = `600 23px ${FONT}`; ctx.fillStyle = it.char?.color || "#aaa"; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(it.char?.name || "", VIEW.x + EDGE + avatarSpace + 10, y + 4); }
  const bx = left ? VIEW.x + EDGE + avatarSpace : VIEW.x + VIEW.w - EDGE - row.w;
  if (group && left && row.lastOfRun) drawAvatar(ctx, it.char || {}, VIEW.x + EDGE + AV_R, by + row.h - (row.nameH || 0) - AV_R, AV_R, imgCache);
  const h = row.h - (row.nameH || 0);
  if (row.emojiOnly) {
    ctx.font = `92px ${FONT}`; ctx.textAlign = left ? "left" : "right"; ctx.textBaseline = "top";
    ctx.fillText(row.lines.join(" "), left ? bx : bx + row.w, by + 4);
  } else if (m.type === "image") {
    ctx.fillStyle = bubbleFill(ctx, theme, row.side, bx, by, row.w, h); roundRect(ctx, bx, by, row.w, h, 32); ctx.fill();
    const photo = m.image?.startsWith("data:") && imgCache.get(m.image);
    if (photo?.complete && photo.naturalWidth) drawPhoto(ctx, photo, bx + 6, by + 6, IMG_W, IMG_H);
    else drawAttachment(ctx, m.image?.startsWith("data:") ? "photo-blur" : m.image || "photo-blur", bx + 6, by + 6, IMG_W, IMG_H, t, (m.id || "x").length * 7 + it.i);
    if (row.lines.length) { ctx.fillStyle = row.side === "right" ? theme.meText || "#fff" : light ? "#111318" : "#fff"; ctx.font = `400 ${TEXT_SIZE}px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "top"; row.lines.forEach((l, i) => ctx.fillText(l, bx + PAD_X, by + IMG_H + 12 + PAD_Y / 2 + i * LINE_H)); }
  } else {
    ctx.fillStyle = bubbleFill(ctx, theme, row.side, bx, by, row.w, h);
    bubblePath(ctx, row.side, bx, by, row.w, h, true);
    if (m.type === "missed-call") {
      ctx.strokeStyle = "#ff4f6e"; ctx.lineWidth = 5; ctx.lineCap = "round";
      const ix = bx + PAD_X + 18, iy = by + h / 2;
      ctx.beginPath(); ctx.moveTo(ix - 12, iy - 12); ctx.quadraticCurveTo(ix - 18, iy, ix - 6, iy + 10); ctx.quadraticCurveTo(ix + 6, iy + 18, ix + 14, iy + 8); ctx.stroke();
      ctx.font = `600 ${TEXT_SIZE}px ${FONT}`; ctx.fillStyle = "#ff4f6e"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(row.lines[0], bx + PAD_X + 50, iy + 1);
    } else {
      ctx.font = `${m.type === "deleted" ? "italic 400" : "400"} ${TEXT_SIZE}px ${FONT}`;
      ctx.fillStyle = m.type === "deleted" ? (light ? "#8a8f9c" : "#8b90a0") : row.side === "right" ? theme.meText || "#fff" : light ? "#111318" : "#f2f3f7";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      row.lines.forEach((l, i) => ctx.fillText(l, bx + PAD_X, by + PAD_Y + i * LINE_H + 3));
    }
  }
  // reaction badge
  if (m.reaction && it.reactionT != null && t >= it.reactionT) {
    const k = easeBack(clamp((t - it.reactionT) / 0.3));
    const rx = left ? bx + row.w - 10 : bx + 10, ry = by + h - 4;
    ctx.save(); ctx.translate(rx, ry); ctx.scale(k, k);
    ctx.fillStyle = light ? "#fff" : "#262a36"; ctx.strokeStyle = light ? "#f2f3f7" : "#0d0f15"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.font = `34px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(m.reaction, 0, 2);
    ctx.restore();
  }
}

// a picture the user uploaded, cropped to fill the bubble
function drawPhoto(ctx, img, x, y, w, h) {
  ctx.save(); roundRect(ctx, x, y, w, h, 26); ctx.clip();
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  ctx.drawImage(img, x + (w - img.naturalWidth * s) / 2, y + (h - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
  ctx.restore();
}

function drawTyping(ctx, it, y, t, theme, story, imgCache, row) {
  const group = story.group, avatarSpace = group ? AV_R * 2 + 14 : 0;
  const k = easeOut(clamp((t - it.tStart) / 0.25));
  const x = VIEW.x + EDGE + avatarSpace, w = 120, h = 74;
  ctx.save(); ctx.globalAlpha = k;
  if (group) drawAvatar(ctx, it.char || {}, VIEW.x + EDGE + AV_R, y + h - AV_R, AV_R, imgCache);
  ctx.fillStyle = theme.them; bubblePath(ctx, "left", x, y, w, h, true);
  for (let i = 0; i < 3; i++) {
    const b = Math.max(0, Math.sin(t * 9 - i * 0.9)); ctx.fillStyle = theme.light ? "#8a8f9c" : "#9aa0b4"; ctx.globalAlpha = k * (0.45 + 0.55 * b);
    ctx.beginPath(); ctx.arc(x + 34 + i * 26, y + h / 2 - b * 7, 9, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ overlays
function drawHook(ctx, compiled, t) {
  const { story } = compiled;
  if (!story.hook || story.look.hookStyle === "off") return;
  const pinned = story.look.hookStyle === "pinned";
  // fully visible on the very first frame: the hook is what stops the scroll
  const a = pinned ? 1 - prog(t, compiled.outro.start, compiled.outro.start + 0.4) : 1 - prog(t, compiled.hook.end - 0.5, compiled.hook.end);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = `800 40px ${FONT}`;
  const lines = wrapText(ctx, stripMarkup(story.hook), 900);
  const lh = 50, bw = Math.min(980, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 70), bh = lines.length * lh + 40;
  const bx = (W - bw) / 2, by = 60;
  ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.fillStyle = "#fff"; roundRect(ctx, bx, by, bw, bh, 26); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#0d0f15"; ctx.textAlign = "center"; ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, W / 2, by + 22 + i * lh));
  ctx.restore();
}

function captionChunks(words) {
  const chunks = []; let cur = [];
  words.forEach((w, i) => { cur.push(i); if (cur.length >= 4 || /[.,!?…:;]$/.test(w.w)) { chunks.push(cur); cur = []; } });
  if (cur.length) chunks.push(cur);
  return chunks;
}
function drawCaptions(ctx, compiled, t) {
  const { story, captions } = compiled;
  const cs = story.captions;
  if (cs.style === "off") return;
  const cap = captions.find((c) => t >= c.start && t < c.end);
  if (!cap || t >= compiled.outro.start) return;
  const words = cap.words;
  let cur = -1; words.forEach((w, i) => { if (t >= w.t) cur = i; });
  const y = H * cs.position, size = 78 * (cs.size || 1), font = cs.font || "Luckiest Guy";
  const fam = `'${font}', ${FONT}`;
  ctx.save(); ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  const stroke = (txt, x, yy, fill, sz, align = "left") => {
    ctx.font = `${font === "Inter" ? "900" : "400"} ${sz}px ${fam}`; ctx.textAlign = align;
    ctx.lineWidth = sz * 0.2; ctx.strokeStyle = "rgba(0,0,0,.92)"; ctx.strokeText(txt, x, yy);
    ctx.fillStyle = fill; ctx.fillText(txt, x, yy);
  };
  const upper = (s) => (font === "Inter" ? s : s.toUpperCase());
  if (cs.style === "clean") {
    ctx.font = `700 ${size * 0.6}px ${FONT}`;
    const lines = wrapText(ctx, words.map((w) => w.w).join(" "), 900).slice(0, 3);
    const lh = size * 0.78, bh = lines.length * lh + 30;
    ctx.fillStyle = "rgba(0,0,0,.72)"; roundRect(ctx, 60, y - bh / 2, W - 120, bh, 22); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textAlign = "center";
    lines.forEach((l, i) => ctx.fillText(l, W / 2, y - bh / 2 + 15 + lh / 2 + i * lh));
    ctx.restore(); return;
  }
  if (cs.style === "karaoke") {
    const sz = size * 0.72;
    ctx.font = `400 ${sz}px ${fam}`;
    const lines = []; let line = [], lw = 0; const space = ctx.measureText(" ").width;
    words.forEach((w, i) => { const ww = ctx.measureText(upper(w.w)).width; if (lw + ww > 920 && line.length) { lines.push(line); line = []; lw = 0; } line.push(i); lw += ww + space; });
    if (line.length) lines.push(line);
    const shown = lines.slice(Math.max(0, lines.findIndex((l) => l.includes(Math.max(cur, 0))) - 0), Math.max(0, lines.findIndex((l) => l.includes(Math.max(cur, 0)))) + 2);
    shown.forEach((ln, li) => {
      const tw = ln.reduce((s, i) => s + ctx.measureText(upper(words[i].w)).width + space, -space);
      let x = (W - tw) / 2;
      ln.forEach((i) => { const w = words[i]; const on = i <= cur; stroke(upper(w.w), x, y + li * sz * 1.15, on ? (w.hot ? cs.highlight : "#fff") : "rgba(255,255,255,.45)", sz); x += ctx.measureText(upper(w.w)).width + space; });
    });
    ctx.restore(); return;
  }
  // pop: a few words at a time, the current word punches in
  const chunks = captionChunks(words);
  const ci = chunks.findIndex((c) => c.includes(Math.max(cur, 0)));
  const chunk = chunks[Math.max(0, ci)] || [];
  ctx.font = `400 ${size}px ${fam}`;
  const space = ctx.measureText(" ").width;
  const widths = chunk.map((i) => ctx.measureText(upper(words[i].w)).width);
  let total = widths.reduce((a, b) => a + b, 0) + space * (chunk.length - 1);
  let sz = size; if (total > 960) { sz = size * (960 / total); total = 960; }
  ctx.font = `400 ${sz}px ${fam}`;
  let x = (W - total) / 2;
  chunk.forEach((i, j) => {
    const w = words[i], ww = widths[j] * (sz / size);
    if (i <= cur || cur < 0) {
      const age = t - w.t, k = easeBack(clamp(age / 0.16));
      const active = i === cur;
      ctx.save(); ctx.translate(x + ww / 2, y); ctx.scale(0.6 + 0.4 * k + (active ? 0.08 : 0), 0.6 + 0.4 * k + (active ? 0.08 : 0)); if (w.hot) ctx.rotate(-0.04);
      stroke(upper(w.w), 0, 0, w.hot ? cs.highlight : "#fff", sz, "center");
      ctx.restore();
    }
    x += ww + space * (sz / size);
  });
  ctx.restore();
}

function drawOutro(ctx, compiled, t) {
  const { story, outro } = compiled;
  if (t < outro.start) return;
  const k = clamp((t - outro.start) / 0.5);
  ctx.fillStyle = `rgba(5,6,10,${0.55 * k})`; ctx.fillRect(0, 0, W, H);
  if (story.outro) {
    const e = easeBack(clamp((t - outro.start - 0.15) / 0.4));
    ctx.save(); ctx.translate(540, 900); ctx.scale(e, e); ctx.rotate(-0.03);
    const font = story.captions.font || "Luckiest Guy";
    ctx.font = `400 120px '${font}', ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    const lines = wrapText(ctx, font === "Inter" ? story.outro : story.outro.toUpperCase(), 900);
    lines.forEach((l, i) => { const yy = (i - (lines.length - 1) / 2) * 130; ctx.lineWidth = 24; ctx.strokeStyle = "#000"; ctx.strokeText(l, 0, yy); ctx.fillStyle = story.captions.highlight; ctx.fillText(l, 0, yy); });
    ctx.restore();
  }
  const f = clamp((t - (outro.end - 0.45)) / 0.45);
  if (f > 0) { ctx.fillStyle = `rgba(0,0,0,${f})`; ctx.fillRect(0, 0, W, H); }
}
