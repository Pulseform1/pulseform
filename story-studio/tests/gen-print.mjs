import { generateStory } from "../src/story/generator.js";
const [plotId, d, seed] = process.argv.slice(2);
const g = plotId.split("-")[0];
const s = generateStory({ genre: g, duration: +d, plotId, seed: +(seed || 7) });
const names = Object.fromEntries(s.characters.map((c) => [c.id, c.name]));
console.log(`== ${s.title} (${d}s) | hook: ${s.hook} | outro: ${s.outro}`);
for (const m of s.messages) console.log(`  ${(m.from === "system" ? "*" : names[m.from]).padEnd(14)} ${m.type === "image" ? "[img " + m.image + "] " : ""}${m.text}${m.effect ? "  {" + m.effect + "}" : ""}`);
