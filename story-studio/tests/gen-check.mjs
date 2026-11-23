// Generates every plot at every length and reports message counts and estimated vs. compiled duration.
import { generateStory, PLOTS } from "../src/story/generator.js";
import { compileTimeline } from "../src/engine/timeline.js";
import { stripMarkup } from "../src/engine/util.js";
let problems = 0;
for (const [g, plots] of Object.entries(PLOTS)) for (const p of plots) {
  const row = [];
  for (const d of [15, 30, 60, 120, 180]) {
    const s = generateStory({ genre: g, duration: d, plotId: p.id, seed: 12345 + d });
    // fake narration: 2.7 words per second
    const narr = Object.fromEntries(s.messages.map((m) => [m.id, m.type === "text" && m.from !== "system" ? stripMarkup(m.text).split(/\s+/).length / 2.5 + 0.3 : 0]));
    const c = compileTimeline(s, narr);
    row.push(`${d}s:${s.messages.length}m/${c.duration.toFixed(0)}s`);
    if (Math.abs(c.duration - d) > d * 0.35 + 6) problems++;
    if (s.messages.some((m) => /undefined|\[object/.test(m.text))) { problems++; console.log("BAD TEXT", p.id, s.messages.filter((m) => /undefined|\[object/.test(m.text)).map((m) => m.text)); }
  }
  console.log(p.id.padEnd(32), row.join("  "));
}
const r = generateStory({ genre: "random", duration: 30 });
console.log("random ->", r.genre, r.title, "|", r.hook);
console.log("problems:", problems);
