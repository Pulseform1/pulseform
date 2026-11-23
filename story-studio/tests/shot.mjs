// node tests/shot.mjs story.json out.png t1 t2 ... -> renderer screenshots (dev server on 5199)
import { createRequire } from "module";
const { chromium } = createRequire(import.meta.url)("playwright");   // the globally installed Playwright
import fs from "fs";
const [storyFile, out, ...ts] = process.argv.slice(2);
const story = JSON.parse(fs.readFileSync(storyFile, "utf8"));
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.goto("http://localhost:5199/tests/render-harness.html"); await p.waitForFunction(() => window.ready);
let dur;
for (const t of ts) { dur = await p.evaluate(([s, t]) => window.renderStory(s, +t), [story, t]); await p.locator("#c").screenshot({ path: out.replace(".png", `-${t}.png`) }); }
console.log("duration", dur?.toFixed(2), errs.length ? "ERRORS " + errs.join(" | ") : "");
await b.close();
