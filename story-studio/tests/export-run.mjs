// node tests/export-run.mjs genre duration out.mp4  (dev server on 5199, Studio server on 8787)
import { createRequire } from "module";
import fs from "fs";
const { chromium } = createRequire(import.meta.url)("playwright");
const [genre, duration, out] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.goto("http://localhost:5199/tests/export-harness.html"); await p.waitForFunction(() => window.ready);
const r = await p.evaluate((o) => window.runExport(o), { genre, duration: +duration, seed: 42 });
fs.writeFileSync(out, Buffer.from(r.b64, "base64"));
console.log(JSON.stringify({ title: r.title, messages: r.n, duration: r.duration.toFixed(1), encodeSeconds: r.seconds.toFixed(1), caps: r.caps, notes: r.notes }), errs.length ? "ERRORS " + errs.join(" | ") : "");
await b.close();
