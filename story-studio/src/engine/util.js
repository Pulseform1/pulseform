// Small helpers shared by the renderer, timeline and audio.

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const easeOut = (k) => 1 - Math.pow(1 - k, 3);
export const easeIn = (k) => k * k * k;
export const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const easeBack = (k) => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

// Deterministic random numbers (mulberry32), so a story always renders the same way.
export function rng(seed) {
  let s = typeof seed === "string" ? hash(seed) : seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
export function shuffle(r, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// Text markup: *word* marks a word to highlight in captions. Bubbles show plain text.
export const stripMarkup = (text = "") => text.replace(/\*([^*]+)\*/g, "$1");
export function captionWords(text = "") {
  const out = [];
  const re = /\*([^*]+)\*|(\S+)/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[1]) m[1].split(/\s+/).forEach((w) => out.push({ w, hot: true }));
    else out.push({ w: m[2], hot: false });
  }
  return out;
}
// Words worth highlighting when the writer did not mark any.
const LOUD = /^(never|don'?t|stop|run|now|why|who|what|help|wait|dead|gone|behind|blood|real|lied|secret|pregnant|fired|expelled|caught|liar|sorry|again|alone|door|tonight|forever|truth|everyone|nobody|missing|found|future|tomorrow|yesterday|exactly|cheated|broke|married|twin|exposed|ruined|actually|literally|seriously|omg|wtf|no+)$/i;
export function autoHot(words) {
  if (words.some((w) => w.hot)) return words;
  let marked = 0;
  return words.map((w) => {
    const bare = w.w.replace(/[^\w']/g, "");
    const hot = marked < 2 && (LOUD.test(bare) || /^\d/.test(bare) || (bare.length > 2 && bare === bare.toUpperCase() && /[A-Z]/.test(bare)));
    if (hot) marked++;
    return { ...w, hot };
  });
}

// Wrap text into lines that fit maxWidth with the context's current font.
export function wrapText(ctx, text, maxWidth) {
  const lines = [];
  for (const para of String(text).split("\n")) {
    const words = para.split(/(\s+)/).filter((s) => s.length);
    let line = "";
    for (const w of words) {
      const test = line + w;
      if (ctx.measureText(test.trimEnd()).width <= maxWidth || !line.trim()) {
        if (ctx.measureText(test.trimEnd()).width > maxWidth && !line.trim()) {
          // one very long word: break it by characters
          let chunk = "";
          for (const ch of w) { if (ctx.measureText(chunk + ch).width > maxWidth && chunk) { lines.push(chunk); chunk = ch; } else chunk += ch; }
          line = chunk;
        } else line = test;
      } else { lines.push(line.trimEnd()); line = w.trimStart(); }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export const newId = () => Math.random().toString(36).slice(2, 10);
export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
