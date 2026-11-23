// Turns a story into a timeline: when each typing indicator, message, narration line, caption,
// effect and sound happens. The renderer and the audio mixer both read this.
import { clamp, stripMarkup, captionWords, autoHot } from "./util.js";

const INTRO = 0.35;           // the first message lands almost immediately: the hook
const EFFECT_LEN = { shake: 0.55, glitch: 0.7, flash: 0.45, heartbeat: 1.6 };

function textOf(m) {
  if (m.type === "image") return m.text || "";
  if (m.type === "deleted") return "This message was deleted";
  if (m.type === "missed-call") return m.text || "Missed call";
  return m.text || "";
}

export function narrationText(m, story) {
  if (m.type === "deleted" || m.type === "missed-call") return "";
  if (m.type === "image") return story.narration.includeImages ? stripMarkup(m.text || "") : "";
  if (m.from === "system") return "";
  // emoji are for the screen, not the voice ("😊" would be read as "smiling face with smiling eyes")
  return stripMarkup(m.text || "").replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, "").replace(/\s+/g, " ").trim();
}

// narration: { [messageId]: seconds } once voices are generated (empty when narration is off)
export function compileTimeline(story, narration = {}) {
  const chars = Object.fromEntries(story.characters.map((c) => [c.id, c]));
  const items = story.messages.map((m, i) => {
    const plain = stripMarkup(textOf(m));
    const words = plain.split(/\s+/).filter(Boolean).length;
    const isMe = m.from === "me", isSys = m.from === "system" || m.type === "system";
    const first = i === 0;
    const typing = isSys || first || !m.typing ? 0 : isMe ? 0 : clamp(0.45 + plain.length * 0.017, 0.6, 1.7) + (m.type === "image" ? 0.4 : 0);
    const compose = isMe && !first && m.type === "text" && m.typing ? clamp(0.3 + plain.length * 0.02, 0.45, 1.5) : 0;
    const read = isSys ? 1.0 : m.type === "image" ? 1.6 + words * 0.12 : clamp(0.6 + words * 0.21, 0.9, 4.2);
    const narr = story.narration.enabled ? narration[m.id] || 0 : 0;
    return { msg: m, i, char: chars[m.from], side: isSys ? "center" : isMe ? "right" : "left", plain, words, typing, compose, read, narr, pause: Math.max(0, m.pause || 0) };
  });
  const effTail = (m) => (m.effect === "darken" ? 0.5 : m.effect === "heartbeat" ? 0.6 : m.effect ? 0.25 : 0);
  const outroLen = story.outro ? 2.4 : 1.3;

  // k stretches typing and reading time (not narration, which has a fixed length).
  const total = (k) => INTRO + outroLen + items.reduce((s, it) => s + (it.typing + it.compose) * k + Math.max(it.read * k, it.narr ? it.narr + 0.18 : 0) + it.pause + effTail(it.msg), 0);
  let k = 1 / (story.pacing.speed || 1);
  if (story.pacing.fit && items.length) {
    let lo = 0.45, hi = 1.7;   // never slower than this: dead air loses viewers
    for (let n = 0; n < 40; n++) { const mid = (lo + hi) / 2; if (total(mid) < story.duration) lo = mid; else hi = mid; }
    k = (lo + hi) / 2;
  }

  let t = INTRO;
  const cues = [], captions = [], effects = [];
  for (const it of items) {
    it.tStart = t;
    it.typingDur = it.typing * k; it.composeDur = it.compose * k;
    if (it.typingDur) cues.push({ t, type: "typing-start", dur: it.typingDur });
    if (it.composeDur) cues.push({ t, type: "keys", dur: it.composeDur });
    t += it.typingDur + it.composeDur;
    it.tAppear = t;
    it.readDur = Math.max(it.read * k, it.narr ? it.narr + 0.18 : 0);
    const m = it.msg;
    cues.push({ t, type: it.side === "right" ? "send" : it.side === "center" ? "system" : m.type === "image" ? "image" : "receive" });
    if (it.narr) it.narration = { start: t + 0.04, dur: it.narr };
    if (m.effect) {
      const len = m.effect === "zoom" || m.effect === "darken" ? null : EFFECT_LEN[m.effect] || 0.5;
      effects.push({ type: m.effect, start: t, end: len ? t + len : null, item: it });
      cues.push({ t, type: "fx-" + m.effect });
    }
    if (m.reaction) { it.reactionT = t + Math.min(it.readDur * 0.55, 1.1); cues.push({ t: it.reactionT, type: "reaction" }); }
    // caption: the line being read, words spread over the narration (or reading time)
    const capText = it.side === "center" ? "" : m.type === "deleted" ? "" : m.type === "missed-call" ? "" : textOf(m);
    if (capText.trim()) {
      const ws = autoHot(captionWords(capText));
      const span = (it.narr || it.readDur * 0.7) * 0.94, t0 = t + 0.05;
      const weights = ws.map((w) => w.w.length + 2), sum = weights.reduce((a, b) => a + b, 0);
      let acc = 0;
      captions.push({ start: t, end: t + it.readDur, who: m.from, words: ws.map((w, j) => { const wt = t0 + (acc / sum) * span; acc += weights[j]; return { ...w, t: wt }; }) });
    }
    t += it.readDur + it.pause + effTail(m);
    it.tEnd = t;
  }
  // effects with no fixed length last until the next message lands
  for (const e of effects) if (e.end == null) { const nx = items[e.item.i + 1]; e.end = nx ? nx.tAppear : t + 0.5; }
  for (let j = 0; j < captions.length - 1; j++) if (captions[j + 1].start - captions[j].end < 0.4) captions[j].end = captions[j + 1].start;
  const duration = t + outroLen;
  return { story, items, cues, captions, effects, k, duration, outro: { start: t, end: duration }, hook: { start: 0, end: Math.min(4.5, duration) } };
}
