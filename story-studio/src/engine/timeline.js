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

const isNarrator = (m) => m.type === "scene" || m.from === "narrator" || m.from === "system";

export function narrationText(m, story) {
  if (m.type === "deleted" || m.type === "missed-call") return "";
  if (m.type === "image") return story.narration.includeImages ? stripMarkup(m.text || "") : "";
  if (m.from === "system" && !story.narration.systemNotes) return "";
  // emoji are for the screen, not the voice ("😊" would be read as "smiling face with smiling eyes")
  return stripMarkup(m.say || m.text || "").replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, "").replace(/\s+/g, " ").trim();
}

// Who reads a message: its character, or the narrator for scenes (and system notes, when that's on).
export function voiceFor(m, story) {
  if (isNarrator(m)) return { voice: story.narration.narrator || "am_onyx", speed: story.narration.narratorSpeed || 0.92, narrator: true };
  return { voice: story.characters.find((c) => c.id === m.from)?.voice || "af_sky", speed: story.narration.speed || 1, narrator: false };
}

// how long the phone takes to slide away / come back around a scene
export const SCENE_IN = 0.6, SCENE_OUT = 0.55;
const SCENE_LEAD = { frontdoor: 1.7 };   // the knocks come before the narrator speaks

// narration: { [messageId]: seconds } once voices are generated (empty when narration is off)
export function compileTimeline(story, narration = {}) {
  const chars = Object.fromEntries(story.characters.map((c) => [c.id, c]));
  const items = story.messages.map((m, i) => {
    const plain = stripMarkup(textOf(m));
    const words = plain.split(/\s+/).filter(Boolean).length;
    const isMe = m.from === "me", isSys = m.from === "system" || m.type === "system", isScene = m.type === "scene";
    const first = i === 0;
    const typing = isSys || isScene || first || !m.typing ? 0 : isMe ? 0 : clamp(0.45 + plain.length * 0.017, 0.6, 1.7) + (m.type === "image" ? 0.4 : 0);
    const compose = isMe && !first && m.type === "text" && m.typing ? clamp(0.3 + plain.length * 0.02, 0.45, 1.5) : 0;
    const read = isScene ? 1.8 + words * 0.36 : isSys ? 1.0 : m.type === "image" ? 1.6 + words * 0.12 : clamp(0.6 + words * 0.21, 0.9, 4.2);
    const narr = story.narration.enabled ? narration[m.id] || 0 : 0;
    const lead = isScene ? SCENE_LEAD[m.scene] || 0.25 : 0;
    return { msg: m, i, char: chars[m.from], side: isScene ? "scene" : isSys ? "center" : isMe ? "right" : "left", plain, words, typing, compose, read, narr, lead, pause: Math.max(0, m.pause || 0) };
  });
  const effTail = (m) => (m.type === "scene" ? SCENE_IN + SCENE_OUT + 0.3 : m.effect === "darken" ? 0.5 : m.effect === "heartbeat" ? 0.6 : m.effect ? 0.25 : 0);
  const outroLen = story.outro ? 2.4 : 1.3;

  // k stretches typing and reading time (not narration, which has a fixed length).
  const readFor = (it, k) => (it.side === "scene" ? it.lead + Math.max(it.read * k, it.narr ? it.narr + 0.45 : 0) : Math.max(it.read * k, it.narr ? it.narr + 0.18 : 0));
  const total = (k) => INTRO + outroLen + items.reduce((s, it) => s + (it.typing + it.compose) * k + readFor(it, k) + it.pause + effTail(it.msg), 0);
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
    const m = it.msg;
    if (it.side === "scene") {
      // the phone slides away, the scene fades in, the narrator speaks, the phone comes back
      cues.push({ t, type: "scene-in" });
      t += SCENE_IN;
      it.tAppear = t;
      it.readDur = readFor(it, k);
      if (it.narr) it.narration = { start: t + it.lead, dur: it.narr };
      if (m.figure) { it.figureT = t + it.lead + (it.narr || it.readDur - it.lead) * 0.55; cues.push({ t: it.figureT, type: "figure" }); }
      cues.push({ t, type: "amb-" + m.scene, dur: it.readDur + SCENE_OUT, figT: it.figureT });
      if (m.effect) { const len = m.effect === "zoom" || m.effect === "darken" ? it.readDur : EFFECT_LEN[m.effect] || 0.5; const at = it.figureT || t + 0.2; effects.push({ type: m.effect, start: at, end: at + len, item: it }); cues.push({ t: at, type: "fx-" + m.effect }); }
      const capText = stripMarkup(m.text || "").trim() ? m.text : "";
      if (capText) {
        const ws = autoHot(captionWords(capText)), span = (it.narr || (it.readDur - it.lead) * 0.8) * 0.94, t0 = t + it.lead + 0.05;
        const weights = ws.map((w) => w.w.length + 2), sum = weights.reduce((a, b) => a + b, 0);
        let acc = 0;
        captions.push({ start: t + it.lead, end: t + it.readDur, who: "narrator", words: ws.map((w, j) => { const wt = t0 + (acc / sum) * span; acc += weights[j]; return { ...w, t: wt }; }) });
      }
      t += it.readDur + SCENE_OUT + it.pause;
      it.sceneEnd = t;
      t += 0.3;   // a beat before the chat continues
      it.tEnd = t;
      continue;
    }
    it.tAppear = t;
    it.readDur = Math.max(it.read * k, it.narr ? it.narr + 0.18 : 0);
    cues.push({ t, type: it.side === "right" ? "send" : it.side === "center" ? "system" : m.type === "image" ? "image" : "receive" });
    if (it.narr) it.narration = { start: t + 0.04, dur: it.narr };
    if (m.effect) {
      const len = m.effect === "zoom" || m.effect === "darken" ? null : EFFECT_LEN[m.effect] || 0.5;
      effects.push({ type: m.effect, start: t, end: len ? t + len : null, item: it });
      cues.push({ t, type: "fx-" + m.effect });
    }
    if (m.reaction) { it.reactionT = t + Math.min(it.readDur * 0.55, 1.1); cues.push({ t: it.reactionT, type: "reaction" }); }
    // caption: the line being read, words spread over the narration (or reading time)
    const capText = it.side === "center" ? (it.narr ? textOf(m) : "") : m.type === "deleted" ? "" : m.type === "missed-call" ? "" : textOf(m);
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
  const last = items[items.length - 1];
  if (last?.side === "scene") last.sceneEnd = duration + 1;   // a story that ends on a scene stays there under the ending card
  return { story, items, cues, captions, effects, k, duration, outro: { start: t, end: duration }, hook: { start: 0, end: Math.min(4.5, duration) } };
}
