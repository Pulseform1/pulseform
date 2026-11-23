// The story document: everything the editor changes and the renderer draws.
import { newId } from "../engine/util.js";

export const GENRES = [
  { id: "horror", label: "Horror", blurb: "Creepy messages, strangers, things in the dark", color: "#7c5cff" },
  { id: "mystery", label: "Mystery", blurb: "Disappearances, clues, discoveries", color: "#2fb7a8" },
  { id: "comedy", label: "Comedy", blurb: "Misunderstandings and chaos", color: "#ffb02e" },
  { id: "drama", label: "Drama", blurb: "Secrets, betrayals, arguments", color: "#ff5c8a" },
  { id: "twist", label: "Plot Twist", blurb: "Everything flips at the end", color: "#c95cff" },
  { id: "suspense", label: "Suspense", blurb: "You need to know what happens next", color: "#ff6b3d" },
  { id: "school", label: "School", blurb: "Teachers, rumors, group chats", color: "#4fa3ff" },
  { id: "scifi", label: "Sci-Fi", blurb: "Future messages, strange tech", color: "#3de0ff" },
  { id: "adventure", label: "Adventure", blurb: "Choices and discoveries", color: "#5ad96b" },
];
export const RANDOM_GENRE = { id: "random", label: "Random", blurb: "Any genre, a fresh concept", color: "#c6ff3d" };

export const DURATIONS = [15, 30, 45, 60, 90, 120, 180];

export const BACKGROUNDS = [
  { id: "horror", label: "Midnight fog" },
  { id: "mystery", label: "Rainy window" },
  { id: "comedy", label: "Sunny pop" },
  { id: "drama", label: "Neon bokeh" },
  { id: "twist", label: "Purple swirl" },
  { id: "suspense", label: "Red alert" },
  { id: "school", label: "Notebook" },
  { id: "scifi", label: "Starfield grid" },
  { id: "adventure", label: "Sunset peaks" },
];

export const AVATARS = [
  { id: "initials", label: "Initials" }, { id: "unknown", label: "Unknown" }, { id: "smile", label: "Smiley" }, { id: "ghost", label: "Ghost" },
  { id: "cat", label: "Cat" }, { id: "dog", label: "Dog" }, { id: "moon", label: "Moon" }, { id: "star", label: "Star" }, { id: "heart", label: "Heart" },
  { id: "robot", label: "Robot" }, { id: "alien", label: "Alien" }, { id: "mask", label: "Mask" }, { id: "glasses", label: "Teacher" },
  { id: "crown", label: "Crown" }, { id: "eye", label: "Eye" }, { id: "flower", label: "Flower" }, { id: "skull", label: "Skull" },
];

export const IMAGES = [
  ["door", "Closed door"], ["hallway", "Dark hallway"], ["window", "Window at night"], ["house", "Old house"], ["forest", "Forest"],
  ["shadow", "Figure in the dark"], ["eye", "Eye in the dark"], ["note", "Handwritten note"], ["selfie", "Selfie"], ["photo-blur", "Blurry photo"],
  ["map", "Map pin"], ["clock", "Clock"], ["phone-screen", "Phone screenshot"], ["cat", "Cat"], ["dog", "Dog"], ["pizza", "Pizza"],
  ["cake", "Birthday cake"], ["classroom", "Classroom"], ["test", "Test paper"], ["bus", "School bus"], ["car", "Car at night"],
  ["stars", "Night sky"], ["portal", "Glowing portal"], ["robot", "Robot"], ["mountain", "Mountains"], ["cave", "Cave"],
  ["treasure", "Treasure chest"], ["ring", "Ring"], ["receipt", "Receipt"], ["polaroid", "Old photo"], ["key", "Key"], ["footprints", "Footprints"],
].map(([id, label]) => ({ id, label }));

export const REACTIONS = ["", "❤️", "😂", "😮", "😢", "😡", "👍", "‼️", "❓"];
export const EFFECTS = [
  { id: "", label: "None" }, { id: "shake", label: "Screen shake" }, { id: "zoom", label: "Camera zoom" }, { id: "glitch", label: "Glitch" },
  { id: "flash", label: "Flash" }, { id: "darken", label: "Lights out" }, { id: "heartbeat", label: "Heartbeat pulse" },
];
export const MESSAGE_TYPES = [
  { id: "text", label: "Text" }, { id: "image", label: "Image" }, { id: "system", label: "System note" },
  { id: "deleted", label: "Deleted message" }, { id: "missed-call", label: "Missed call" },
];

// Kokoro voices (free, run locally by the Studio server).
export const VOICES = [
  ["af_heart", "Heart (US, warm)"], ["af_bella", "Bella (US, bright)"], ["af_nicole", "Nicole (US, soft)"], ["af_sarah", "Sarah (US)"], ["af_sky", "Sky (US, young)"],
  ["af_nova", "Nova (US)"], ["af_jessica", "Jessica (US)"], ["af_river", "River (US)"], ["af_alloy", "Alloy (US)"], ["af_aoede", "Aoede (US)"], ["af_kore", "Kore (US)"],
  ["am_puck", "Puck (US, upbeat)"], ["am_echo", "Echo (US, calm)"], ["am_liam", "Liam (US)"], ["am_eric", "Eric (US)"], ["am_michael", "Michael (US)"],
  ["am_adam", "Adam (US, deep)"], ["am_fenrir", "Fenrir (US)"], ["am_onyx", "Onyx (US, low)"], ["am_santa", "Santa (US)"],
  ["bf_emma", "Emma (UK)"], ["bf_isabella", "Isabella (UK)"], ["bf_alice", "Alice (UK)"], ["bf_lily", "Lily (UK)"],
  ["bm_george", "George (UK)"], ["bm_lewis", "Lewis (UK)"], ["bm_daniel", "Daniel (UK)"], ["bm_fable", "Fable (UK)"],
].map(([id, label]) => ({ id, label }));

export const CAPTION_STYLES = [
  { id: "pop", label: "Pop (word by word)" }, { id: "karaoke", label: "Karaoke (line, word lights up)" }, { id: "clean", label: "Clean subtitle" }, { id: "off", label: "Off" },
];
export const CAPTION_FONTS = [
  { id: "Luckiest Guy", label: "Bold cartoon" }, { id: "Inter", label: "Clean sans" }, { id: "Permanent Marker", label: "Marker" }, { id: "Creepster", label: "Creepy" },
];
export const MUSIC = [
  { id: "auto", label: "Match the genre" }, { id: "horror", label: "Horror drone" }, { id: "mystery", label: "Mystery pulse" }, { id: "comedy", label: "Bouncy comedy" },
  { id: "drama", label: "Emotional keys" }, { id: "suspense", label: "Ticking suspense" }, { id: "scifi", label: "Synth arps" }, { id: "adventure", label: "Adventure groove" },
  { id: "lofi", label: "Lo-fi chill" }, { id: "none", label: "No music" },
];
export const SKINS = ["#f2c4a0", "#e0a37c", "#c68a5f", "#9c6644", "#6e4630", "#4a2f22"];

export const CHAT_THEMES = [
  { id: "violet", label: "Violet", me: ["#8b6cff", "#6a4dff"], them: "#2a2d3a", text: "#ffffff" },
  { id: "ocean", label: "Ocean", me: ["#2fa8ff", "#1f6fff"], them: "#262b36", text: "#ffffff" },
  { id: "lime", label: "Lime", me: ["#c6ff3d", "#8fdc1f"], them: "#262a30", text: "#ffffff", meText: "#10140a" },
  { id: "rose", label: "Rose", me: ["#ff6b9a", "#ff3d6e"], them: "#2b2730", text: "#ffffff" },
  { id: "light", label: "Light mode", me: ["#3a7bff", "#2f62ff"], them: "#e9ebf0", text: "#111318", light: true },
];

export function defaultStory() {
  return normalizeStory({
    title: "Untitled story", genre: "horror", duration: 60, hook: "", outro: "",
    characters: [
      { id: "me", name: "You", avatar: "initials", color: "#7c5cff", voice: "af_sky" },
      { id: "them", name: "Unknown", avatar: "unknown", color: "#3a3f55", voice: "am_echo" },
    ],
    messages: [],
  });
}

const CHAR_COLORS = ["#7c5cff", "#ff5c8a", "#2fb7a8", "#ffb02e", "#4fa3ff", "#5ad96b", "#c95cff", "#ff6b3d"];

// Fill in anything missing so every story (typed, generated, imported or from AI) has the same shape.
export function normalizeStory(s = {}) {
  const genre = GENRES.some((g) => g.id === s.genre) ? s.genre : "horror";
  const characters = (s.characters?.length ? s.characters : [{ id: "me", name: "You" }, { id: "them", name: "Unknown" }]).map((c, i) => ({
    id: c.id || (i === 0 ? "me" : newId()), name: c.name || (i === 0 ? "You" : "Friend"), avatar: c.avatar || (i === 0 ? "initials" : "initials"),
    image: c.image || "", color: c.color || CHAR_COLORS[i % CHAR_COLORS.length], voice: c.voice || (i === 0 ? "af_sky" : i === 1 ? "am_echo" : "af_bella"),
  }));
  if (!characters.some((c) => c.id === "me")) characters[0].id = "me";
  const ids = new Set(characters.map((c) => c.id));
  const messages = (s.messages || []).map((m) => ({
    id: m.id || newId(), from: m.from === "system" || ids.has(m.from) ? m.from : m.type === "system" ? "system" : characters[1]?.id || "me",
    type: ["text", "image", "system", "deleted", "missed-call"].includes(m.type) ? m.type : "text",
    text: String(m.text ?? ""), image: m.image || "", pause: Number(m.pause) || 0, effect: m.effect || "", reaction: m.reaction || "", typing: m.typing !== false,
  }));
  return {
    version: 1, id: s.id || newId(), title: s.title || "Untitled story", genre, duration: [15, 30, 45, 60, 90, 120, 180].includes(+s.duration) ? +s.duration : 60,
    hook: s.hook ?? "", outro: s.outro ?? "", chatTitle: s.chatTitle || "", chatStatus: s.chatStatus || "", clock: s.clock || "11:42",
    group: !!s.group || characters.length > 2, characters, messages,
    look: { background: s.look?.background || genre, chatTheme: s.look?.chatTheme || "violet", skin: s.look?.skin || SKINS[1], hookStyle: s.look?.hookStyle || "banner", ...(s.look || {}) },
    captions: { style: "pop", font: genre === "horror" ? "Creepster" : "Luckiest Guy", size: 1, position: 0.79, highlight: genre === "horror" ? "#ff3d6e" : "#c6ff3d", ...(s.captions || {}) },
    narration: { enabled: true, speed: 1, includeImages: false, ...(s.narration || {}) },
    audio: { music: "auto", musicVolume: 0.55, sfxVolume: 0.8, ...(s.audio || {}) },
    pacing: { fit: true, speed: 1, ...(s.pacing || {}) },
  };
}
