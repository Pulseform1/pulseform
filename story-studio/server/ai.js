// AI story writing with Claude (optional). Needs ANTHROPIC_API_KEY (or an `ant auth login` profile) on the server.
import Anthropic from "@anthropic-ai/sdk";

const GENRES = ["horror", "mystery", "comedy", "drama", "twist", "suspense", "school", "scifi", "adventure"];
const AVATARS = ["initials", "unknown", "smile", "ghost", "cat", "dog", "moon", "star", "heart", "robot", "alien", "mask", "glasses", "crown", "eye", "flower", "skull"];
const IMAGES = ["door", "hallway", "window", "house", "forest", "shadow", "eye", "note", "selfie", "photo-blur", "map", "clock", "phone-screen", "cat", "dog", "pizza", "cake",
  "classroom", "test", "bus", "car", "stars", "portal", "robot", "mountain", "cave", "treasure", "ring", "receipt", "polaroid", "key", "footprints"];
const EFFECTS = ["", "shake", "zoom", "glitch", "flash", "darken", "heartbeat"];
const VOICES = ["af_heart", "af_bella", "af_nicole", "af_sarah", "af_sky", "af_nova", "af_jessica", "af_river", "am_puck", "am_echo", "am_liam", "am_eric", "am_michael", "am_adam", "am_onyx", "bf_emma", "bf_isabella", "bf_alice", "bm_george", "bm_lewis", "bm_daniel"];

const STORY_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["title", "hook", "outro", "genre", "clock", "chatTitle", "characters", "messages"],
  properties: {
    title: { type: "string" }, hook: { type: "string" }, outro: { type: "string" }, genre: { type: "string", enum: GENRES },
    clock: { type: "string" }, chatTitle: { type: "string" },
    characters: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "name", "avatar", "voice"],
      properties: { id: { type: "string" }, name: { type: "string" }, avatar: { type: "string", enum: AVATARS }, voice: { type: "string", enum: VOICES } } } },
    messages: { type: "array", items: { type: "object", additionalProperties: false, required: ["from", "type", "text", "image", "effect", "reaction", "pause", "scene", "figure"],
      properties: { from: { type: "string" }, type: { type: "string", enum: ["text", "image", "system", "deleted", "missed-call", "scene"] }, text: { type: "string" },
        scene: { type: "string", enum: ["", "bedroom", "hallway", "kitchen", "basement", "living", "frontdoor"] }, figure: { type: "boolean" },
        image: { type: "string", enum: ["", ...IMAGES] }, effect: { type: "string", enum: EFFECTS }, reaction: { type: "string", enum: ["", "❤️", "😂", "😮", "😢", "😡", "👍", "‼️", "❓"] }, pause: { type: "number" } } } },
  },
};

const SYSTEM = `You write original short-form text-message stories for vertical videos (TikTok, Reels, Shorts). The video shows a phone with a chat; each message pops in one at a time and is read aloud.

What makes them work:
- The very first message is the hook. It must make someone stop scrolling within 2 seconds: an unsettling instruction, an impossible sender, a shocking confession, a ridiculous situation. No greetings, no setup.
- Texts sound like real people texting in 2026: mostly lowercase, short bursts, several messages in a row from the same person, real punctuation habits ("??", "...", "ok wait"). No outdated slang, no forced jokes, at most one or two emoji in the whole story.
- Every character has a distinct voice and personality (one is careful, one is chaotic, one is formal, etc).
- Escalate: a new development every few messages. Tension, curiosity or laughs should keep rising.
- End with either a satisfying payoff or a genuine cliffhanger, and make the ending surprising but fair: set it up earlier.
- Horror: psychological, not gore. Use pauses and strange details instead of constant jumpscares. Mysterious contacts, impossible knowledge, things that are slightly wrong.
- Comedy: believable misunderstandings that escalate, with a real punchline. Drama: real secrets, realistic arguments, a satisfying twist.
- Never copy existing creators' stories or famous plots; invent a fresh concept.
- Never write sexual content, real public figures, hate, self-harm, or instructions for anything dangerous. Keep it suitable for teens.

Format rules:
- characters: the phone owner has id "me" and name "You". Other ids are short lowercase words ("x", "mom", "sam"). Use 2 characters for a private chat, 3-5 for a group chat (then set chatTitle to the group's name, otherwise "").
- messages: from = a character id or "system". type "text" for normal messages; "image" with an image id from the list (text = optional caption); "system" (from "system") for events like "The hallway light flickers." or "1 hour later"; "missed-call"; "deleted".
- scene: an optional full-screen cutaway with a narrator (type "scene", from "narrator", text = what the narrator says, third person, past tense, 1-2 sentences; scene = where it happens; figure = true if a shadow figure should appear). Use 0-5 of them, mostly in horror/suspense, to show the characters doing things and moving around between bursts of texts. For every other message, scene is "" and figure is false.
- effect: use rarely, only on big moments: shake (surprise), zoom (a reveal), glitch (something impossible), flash, darken (lights out), heartbeat (dread). Most messages use "".
- Wrap at most one or two important words per message in *asterisks* to highlight them in captions. Use this sparingly.
- pause: extra seconds of silence before the next message (0 for most, 0.5-1.2 for dramatic beats).
- hook: a one-line headline shown at the top of the video (under 70 characters). outro: 1-4 words shown at the end ("Part 2?", "Who was it?") or "".
- clock: the time on the phone (e.g. "3:07").`;

export function aiAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export async function writeStory({ genre, duration, idea }) {
  const client = new Anthropic();
  const n = Math.max(5, Math.round(duration * 0.27));
  const g = genre === "random" || !GENRES.includes(genre) ? "any genre you choose (pick the one that fits your best idea)" : genre;
  const prompt = `Write a brand-new ${g} story for a ${duration}-second video. Aim for about ${n} messages (each takes ~3.5 seconds on screen).` +
    (idea ? `\nThe creator's idea to build on: ${idea}` : "\nCome up with a fresh, specific concept. Avoid the obvious version of the genre.");
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: STORY_SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal") {
    const err = new Error("Claude declined to write this story. Try a different idea."); err.status = 422; throw err;
  }
  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) { const err = new Error("Claude returned no story."); err.status = 502; throw err; }
  return JSON.parse(text);
}

export { Anthropic };
