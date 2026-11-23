// Offline story generator. Each plot (src/story/plots/*.js) is a hand-written story skeleton with
// variables (names, places, times), alternative lines, optional scenes and several endings.
// The generator picks a plot, fills it in, and keeps or drops optional scenes to fit the chosen length.
import { rng, pick, shuffle, stripMarkup } from "../engine/util.js";
import { normalizeStory, GENRES } from "./model.js";
import horror from "./plots/horror.js";
import mystery from "./plots/mystery.js";
import comedy from "./plots/comedy.js";
import drama from "./plots/drama.js";
import twist from "./plots/twist.js";
import suspense from "./plots/suspense.js";
import school from "./plots/school.js";
import scifi from "./plots/scifi.js";
import adventure from "./plots/adventure.js";

export const PLOTS = { horror, mystery, comedy, drama, twist, suspense, school, scifi, adventure };
export const plotCount = () => Object.values(PLOTS).reduce((n, a) => n + a.length, 0);

const NAMES = ["Maya", "Jordan", "Liam", "Ava", "Noah", "Zoe", "Eli", "Nia", "Kai", "Sofia", "Leo", "Priya", "Marcus", "Chloe", "Theo", "Imani", "Ethan",
  "Jade", "Mateo", "Ruby", "Sam", "Aaliyah", "Owen", "Lila", "Dev", "Harper", "Isaac", "Mia", "Rowan", "Tessa", "Caleb", "Yara", "Finn", "Nora", "Omar",
  "Hazel", "Jonah", "Alina", "Reese", "Milo", "Camila", "Ezra", "Talia", "Andre", "Ivy", "Luca", "Amara", "Wes", "Juno", "Rafael", "Skye", "Malik"];

// helpers the plots use to write messages
export const say = (from, text, o = {}) => ({ from, type: "text", text, ...o });
export const img = (from, image, text = "", o = {}) => ({ from, type: "image", image, text, ...o });
export const sys = (text, o = {}) => ({ from: "system", type: "system", text, ...o });
export const missed = (from, text = "Missed voice call") => ({ from, type: "missed-call", text });
export const deleted = (from) => ({ from, type: "deleted", text: "" });

// The plots get a toolkit: random choice, fresh names (never the same twice in one story).
function toolkit(r) {
  const used = new Set();
  const name = () => { const pool = NAMES.filter((n) => !used.has(n)); const n = pick(r, pool.length ? pool : NAMES); used.add(n); return n; };
  return { r, pick: (a) => pick(r, a), name, chance: (p) => r() < p, int: (a, b) => a + Math.floor(r() * (b - a + 1)), shuffle: (a) => shuffle(r, a) };
}

// Rough seconds a message takes on screen once narrated (calibrated against Kokoro at speed 1).
const msgSeconds = (m) => {
  const words = stripMarkup(m.text || "").split(/\s+/).filter(Boolean).length;
  if (m.type === "system") return 1.2;
  if (m.type === "image") return 2.0 + words / 2.4;
  return (m.from === "me" ? 0.3 : 0.5) + 0.55 + words / 2.4 + (m.effect ? 0.3 : 0);
};
const seconds = (msgs) => 2.2 + msgs.reduce((s, m) => s + msgSeconds(m) + (m.pause || 0), 0);

const themeFor = (g) => ({ comedy: "lime", drama: "rose", scifi: "ocean", school: "ocean", adventure: "lime", suspense: "rose" })[g] || "violet";

const RECENT_KEY = "pulse-stories-recent-plots";
function recent() { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } }
function remember(id) { try { localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...recent().filter((x) => x !== id)].slice(0, 12))); } catch { /* private mode */ } }

export function generateStory({ genre = "random", duration = 60, seed = Date.now() ^ Math.floor(Math.random() * 1e9), plotId = null, narration = true } = {}) {
  const r = rng(seed >>> 0);
  const g = genre === "random" || !PLOTS[genre] ? pick(r, GENRES.map((x) => x.id)) : genre;
  const seen = recent();
  let plots = PLOTS[g];
  let plot = plotId ? plots.find((p) => p.id === plotId) : null;
  if (!plot) { const fresh = plots.filter((p) => !seen.includes(p.id)); plot = pick(r, fresh.length ? fresh : plots); }
  remember(plot.id);

  const kit = toolkit(r);
  const v = plot.vars(kit);
  const ending = pick(r, plot.endings);
  const budget = duration - 1.5;

  // core scenes always; then optional scenes by tier while they fit; then repeatable "pool" scenes for long videos
  // Short videos: every plot has its own hand-written micro version (15s). For ~30s, if the full plot
  // can't be cut down far enough without losing key scenes, use the micro version plus a few extra moments.
  const fullFits = () => {
    const bs = plot.beats.filter((b, i) => !b.tier || plot.keys?.includes(i)).filter((b, i) => !b.tier || true);
    const keyMsgs = plot.beats.flatMap((b, i) => (plot.keys?.includes(i) || i === 0 ? b.m(v, kit) : []));
    return seconds([...keyMsgs, ...plot.endings[0](v, kit)]) <= duration + 4;
  };
  if (plot.short && (duration <= 15 || (duration <= 45 && !fullFits()))) {
    const msgs = plot.short(v, kit);
    if (duration > 15 && plot.pool) {
      const extra = [];
      for (const p of kit.shuffle(plot.pool)) { const add = p(v, kit); if (seconds([...msgs, ...extra.flat(), ...add]) > duration + 2) break; extra.push(add); }
      msgs.splice(2, 0, ...extra.flat());
    }
    const cast = plot.cast(v, kit);
    return normalizeStory({ title: typeof plot.title === "function" ? plot.title(v, kit) : plot.title, genre: g, duration, hook: plot.hook(v, kit),
      outro: plot.outro ? pick(r, plot.outro) : "", clock: v.clock || "11:42", chatTitle: v.chatTitle || "", group: cast.length > 2, characters: cast,
      messages: msgs, narration: { enabled: narration }, plotId: plot.id, seed,
      look: { background: plot.background || g, chatTheme: plot.theme || themeFor(g) } });
  }
  const beats = plot.beats.map((b, i) => ({ ...b, i, key: plot.keys?.includes(i), msgs: b.m(v, kit) }));
  const end = ending(v, kit);
  const chosen = new Set(beats.filter((b) => !b.tier).map((b) => b.i));
  const poolMsgs = [];
  const total = () => seconds([...beats.filter((b) => chosen.has(b.i)).flatMap((b) => b.msgs), ...poolMsgs.flat(), ...end]);
  for (const tier of [1, 2, 3]) for (const b of beats.filter((x) => x.tier === tier)) { chosen.add(b.i); if (total() > budget) { chosen.delete(b.i); } }
  if (plot.pool && total() < budget - 6) {
    const items = kit.shuffle(plot.pool);
    for (const p of items) { const msgs = p(v, kit); poolMsgs.push(msgs); if (total() > budget + 2) { poolMsgs.pop(); break; } }
  }
  // Short videos: drop middle scenes first (never the opening or a scene marked key), then lines marked "trim",
  // then keep only the punchline of the ending.
  let core = beats.filter((b) => chosen.has(b.i));
  let endMsgs = end;
  const fits = () => seconds([...core.flatMap((b) => b.msgs), ...poolMsgs.flat(), ...endMsgs]) <= budget + 3;
  if (!fits()) {
    const mid = (core.length - 1) / 2;
    const order = core.map((b, idx) => idx).filter((idx) => idx > 0 && !core[idx].key).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
    const drop = new Set();
    for (const idx of order) { if (fits()) break; drop.add(idx); const keep = core; core = keep.filter((_, j) => !drop.has(j)); if (fits()) break; core = keep; }
    core = core.filter((_, j) => !drop.has(j));
  }
  if (!fits()) core = core.map((b) => ({ ...b, msgs: b.msgs.filter((m) => !m.trim) }));

  const poolAt = plot.poolAt ?? Math.floor(core.length * 0.6);
  const messages = [];
  core.forEach((b, idx) => { if (idx === poolAt) poolMsgs.forEach((p) => messages.push(...p)); messages.push(...b.msgs); });
  if (poolAt >= core.length) poolMsgs.forEach((p) => messages.push(...p));
  messages.push(...endMsgs);

  const cast = plot.cast(v, kit);
  return normalizeStory({
    title: typeof plot.title === "function" ? plot.title(v, kit) : plot.title,
    genre: g, duration, hook: plot.hook(v, kit), outro: plot.outro ? (typeof plot.outro === "function" ? plot.outro(v, kit) : pick(r, plot.outro)) : "",
    clock: v.clock || pick(r, ["11:42", "12:08", "9:17", "10:51", "1:26"]), chatTitle: v.chatTitle || "", chatStatus: v.chatStatus || "",
    group: cast.length > 2, characters: cast, messages: messages.map(({ trim, ...m }) => m),
    narration: { enabled: narration }, plotId: plot.id, seed,
    look: { background: plot.background || g, chatTheme: plot.theme || themeFor(g) },
  });
}
