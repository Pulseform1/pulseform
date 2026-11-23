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
  const speed = (story.narration.speed || 1) * (MOOD_SPEED[m.mood] || 1);
  return { voice: story.characters.find((c) => c.id === m.from)?.voice || "af_sky", speed: Math.round(speed * 100) / 100, narrator: false };
}
// panicked lines come out faster, whispers a little slower (the mixer adds the breath, shake and filters)
const MOOD_SPEED = { panic: 1.15, scream: 1.2, whisper: 0.94 };

// how long the phone takes to slide away / come back around a scene
export const SCENE_IN = 0.5, SCENE_OUT = 0.45, SCENE_CUT = 0.28;   // CUT: scene straight to scene, through black
const SCENE_LEAD = { frontdoor: 1.7, "bedroom-knock": 1.7, "omn-door": 1.6, "ns-phone": 1.0 };   // sounds that come before the narrator speaks

// narration: { [messageId]: seconds } once voices are generated (empty when narration is off)
export function compileTimeline(story, narration = {}) {
  const chars = Object.fromEntries(story.characters.map((c) => [c.id, c]));
  const items = story.messages.map((m, i) => {
    const plain = stripMarkup(textOf(m));
    const words = plain.split(/\s+/).filter(Boolean).length;
    const isMe = m.from === "me", isSys = m.from === "system" || m.type === "system", isScene = m.type === "scene", isVoice = m.type === "voice";
    const first = i === 0;
    const typing = isSys || isScene || isVoice || first || !m.typing ? 0 : isMe ? 0 : clamp(0.45 + plain.length * 0.017, 0.6, 1.7) + (m.type === "image" ? 0.4 : 0);
    const compose = isMe && !first && m.type === "text" && m.typing ? clamp(0.3 + plain.length * 0.02, 0.45, 1.5) : 0;
    const read = isScene ? 1.8 + words * 0.36 : isVoice ? clamp(0.5 + words * 0.3, 1, 5) : isSys ? 1.0 : m.type === "image" ? 1.6 + words * 0.12 : clamp(0.6 + words * 0.21, 0.9, 4.2);
    const narr = story.narration.enabled ? narration[m.id] || 0 : 0;
    const lead = isScene ? SCENE_LEAD[m.scene] || 0.25 : 0;
    return { msg: m, i, char: chars[m.from], side: isScene ? "scene" : isVoice ? "voice" : isSys ? "center" : isMe ? "right" : "left", plain, words, typing, compose, read, narr, lead, pause: Math.max(0, m.pause || 0) };
  });
  const effTail = (m) => (m.type === "scene" ? SCENE_IN + SCENE_OUT + 0.3 : m.type === "voice" ? 0.12 : m.effect === "darken" ? 0.5 : m.effect === "heartbeat" ? 0.6 : m.effect ? 0.25 : 0);
  const outroLen = story.outro ? 2.4 : 1.3;

  // k stretches typing and reading time (not narration, which has a fixed length).
  const readFor = (it, k) => (it.side === "scene" ? it.lead + Math.max(it.read * k, it.narr ? it.narr + 0.32 : 0) : it.side === "voice" ? Math.max(it.read * k, it.narr ? it.narr + 0.25 : 0) : Math.max(it.read * k, it.narr ? it.narr + 0.18 : 0));
  const total = (k) => INTRO + outroLen + items.reduce((s, it) => s + (it.typing + it.compose) * k + readFor(it, k) + it.pause + effTail(it.msg), 0);
  let k = 1 / (story.pacing.speed || 1);
  if (story.pacing.fit && items.length) {
    let lo = 0.45, hi = 1.7;   // never slower than this: dead air loses viewers
    for (let n = 0; n < 40; n++) { const mid = (lo + hi) / 2; if (total(mid) < story.duration) lo = mid; else hi = mid; }
    k = (lo + hi) / 2;
  }

  let t = INTRO;
  const cues = [], captions = [], effects = [];
  const caption = (it, start, span, who) => {
    const text = it.msg.text;
    if (!stripMarkup(text || "").trim()) return;
    const ws = autoHot(captionWords(text)), t0 = start + 0.05;
    const weights = ws.map((w) => w.w.length + 2), sum = weights.reduce((a, b) => a + b, 0);
    let acc = 0;
    captions.push({ start, end: start + Math.max(span, 0.6) + 0.25, who, words: ws.map((w, j) => { const wt = t0 + (acc / sum) * span * 0.94; acc += weights[j]; return { ...w, t: wt }; }) });
  };
  // a line spoken out loud (no chat bubble): inside a scene, the scene stays on screen while it's said
  const voiceLine = (v, t) => {
    v.tStart = t; v.typingDur = 0; v.composeDur = 0;
    v.tAppear = t + 0.12;
    v.readDur = readFor(v, k);
    if (v.narr) v.narration = { start: v.tAppear, dur: v.narr };
    if (v.msg.effect) { const len = EFFECT_LEN[v.msg.effect] || (v.msg.effect === "darken" || v.msg.effect === "zoom" ? v.readDur : 0.5); effects.push({ type: v.msg.effect, start: v.tAppear + 0.1, end: v.tAppear + 0.1 + len, item: v }); cues.push({ t: v.tAppear + 0.1, type: "fx-" + v.msg.effect }); }
    caption(v, v.tAppear, v.narr || v.readDur * 0.8, v.msg.from);
    return v.tAppear + v.readDur + v.pause;
  };
  for (let n = 0; n < items.length; n++) {
    const it = items[n];
    it.tStart = t;
    if (it.side === "voice") { t = voiceLine(it, t); it.tEnd = t; continue; }
    it.typingDur = it.typing * k; it.composeDur = it.compose * k;
    if (it.typingDur) cues.push({ t, type: "typing-start", dur: it.typingDur });
    if (it.composeDur) cues.push({ t, type: "keys", dur: it.composeDur });
    t += it.typingDur + it.composeDur;
    const m = it.msg;
    if (it.side === "scene") {
      // the phone slides away, the scene fades in, the narrator speaks, characters talk, the phone comes back
      // (or, when another scene comes next, it cuts straight to it through black)
      it.chainIn = n > 0 && items[n - 1].side === "scene" || (items[n - 1]?.side === "voice" && items[n - 1].scene);
      cues.push({ t, type: it.chainIn ? "scene-cut" : "scene-in" });
      const cut = story.look.cut === "hard" ? 0.02 : SCENE_CUT;
      it.inDur = it.chainIn ? cut : SCENE_IN;
      t += it.inDur;
      it.tAppear = t;
      it.readDur = readFor(it, k);
      if (it.narr) it.narration = { start: t + it.lead, dur: it.narr };
      caption(it, t + it.lead, it.narr || (it.readDur - it.lead) * 0.8, "narrator");
      t += it.readDur;
      it.nEnd = t;
      while (items[n + 1]?.side === "voice") { n++; items[n].scene = it; t = voiceLine(items[n], t); items[n].tEnd = t; }
      const spokenEnd = t;
      it.chainOut = items[n + 1]?.side === "scene";
      it.outDur = it.chainOut ? cut : SCENE_OUT;
      t += it.outDur + it.pause;
      it.sceneEnd = t;
      if (m.figure) {
        // figureAt: 0..1 = that far through the narrator's line, 1..2 = that far through the lines spoken after it
        const fa = m.figureAt > 0 ? m.figureAt : 0.55, nStart = it.tAppear + it.lead, nDur = it.narr || it.readDur - it.lead;
        it.figureT = fa <= 1 ? nStart + fa * nDur : it.nEnd + (fa - 1) * Math.max(0.6, spokenEnd - it.nEnd);
        cues.push({ t: it.figureT, type: "figure" });
      }
      if (m.effect) { const len = m.effect === "zoom" || m.effect === "darken" ? it.readDur : EFFECT_LEN[m.effect] || 0.5; const at = it.figureT || it.tAppear + 0.2; effects.push({ type: m.effect, start: at, end: at + len, item: it }); cues.push({ t: at, type: "fx-" + m.effect }); }
      cues.push({ t: it.tAppear, type: "amb-" + m.scene, dur: it.sceneEnd - it.tAppear, figT: it.figureT, t0: it.tStart });
      if (!it.chainOut) t += 0.15;   // a beat before the chat continues
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
