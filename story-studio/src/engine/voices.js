// Narration: each message is spoken in its character's voice by the Studio server (Kokoro, free, local).
import { decode } from "./audio.js";
import { narrationText, voiceFor } from "./timeline.js";

const cache = new Map();   // "voice|speed|text" -> AudioBuffer

export async function serverHealth() {
  try {
    const r = await fetch("/api/health", { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    return { online: true, ...(await r.json()) };
  } catch { return { online: false, voice: "offline", ai: false, ffmpeg: false }; }
}

async function line(text, voice, speed) {
  const key = `${voice}|${speed}|${text}`;
  if (cache.has(key)) return cache.get(key);
  const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voice, speed }) });
  if (!r.ok) { let msg = `voice server error ${r.status}`; try { msg = (await r.json()).error || msg; } catch { /* not json */ } throw new Error(msg); }
  const buf = await decode(await r.arrayBuffer());
  cache.set(key, buf);
  return buf;
}

// Generates (or reuses) every narration line. onProgress(done, total)
export async function buildNarration(story, onProgress = () => {}, signal) {
  const todo = story.messages.map((m) => ({ m, text: narrationText(m, story) })).filter((x) => x.text);
  const buffers = new Map(), durations = {};
  let done = 0;
  onProgress(0, todo.length);
  for (const { m, text } of todo) {
    if (signal?.aborted) throw new DOMException("cancelled", "AbortError");
    const { voice, speed } = voiceFor(m, story);
    const b = await line(text, voice, speed);
    buffers.set(m.id, b); durations[m.id] = b.duration;
    onProgress(++done, todo.length);
  }
  return { buffers, durations };
}

// What is already cached for this story (so the preview can use voices instantly after the first build).
export function cachedNarration(story) {
  const buffers = new Map(), durations = {};
  let missing = 0;
  for (const m of story.messages) {
    const text = narrationText(m, story); if (!text) continue;
    const { voice, speed } = voiceFor(m, story);
    const b = cache.get(`${voice}|${speed}|${text}`);
    if (b) { buffers.set(m.id, b); durations[m.id] = b.duration; } else missing++;
  }
  return { buffers, durations, missing };
}

export async function sampleVoice(voice, text = "Hey, it's me. Don't open the door.", speed = 1) {
  return line(text, voice, speed);
}
