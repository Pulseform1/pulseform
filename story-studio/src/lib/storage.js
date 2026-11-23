// Stories are saved in this browser (localStorage): the one you're editing, plus a library you can save to.
import { normalizeStory } from "../story/model.js";

const CURRENT = "pulse-stories-current", LIBRARY = "pulse-stories-library";
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

export const loadCurrent = () => { const s = read(CURRENT, null); return s ? normalizeStory(s) : null; };
export const saveCurrent = (s) => write(CURRENT, s);
export const listLibrary = () => read(LIBRARY, []);
export function saveToLibrary(story) {
  const lib = listLibrary().filter((s) => s.id !== story.id);
  lib.unshift({ ...story, savedAt: Date.now() });
  return write(LIBRARY, lib.slice(0, 40));
}
export const removeFromLibrary = (id) => write(LIBRARY, listLibrary().filter((s) => s.id !== id));

export function downloadJSON(story) {
  const blob = new Blob([JSON.stringify(story, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${slug(story.title)}.story.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export const slug = (s) => (s || "story").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "story";
