// Render the film: opens the built page in headless Chromium (WebGL through SwiftShader), renders the
// soundtrack and every frame, then muxes them with ffmpeg (x264 + AAC, loudness -14 LUFS).
//   npx vite build && npx vite preview --port 5301 --strictPort &
//   node tools/render.mjs http://localhost:5301/ out/pulsebox-the-78th-game.mp4
import { createRequire } from "module";
import { execFileSync } from "child_process";
import fs from "fs";
const { chromium } = createRequire(import.meta.url)("playwright");
const [url = "http://localhost:5301/", out = "out/pulsebox-the-78th-game.mp4"] = process.argv.slice(2);
const base = out.replace(/\.mp4$/, "");
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, acceptDownloads: true });
page.on("console", (m) => console.log("[page]", m.text()));
page.on("pageerror", (e) => console.log("[page error]", e.message));
await page.goto(url); await page.waitForFunction(() => window.ready || window.bootError, null, { timeout: 120000 });
const bootError = await page.evaluate(() => window.bootError); if (bootError) throw new Error(bootError);
async function grab(fn, name) {
  const dl = page.waitForEvent("download", { timeout: 0 });
  await page.evaluate(fn, name);
  await (await dl).saveAs(name);
}
const t0 = Date.now();
await grab(async (name) => { const b = await window.film.exportAudio(); window.film.download(b, name); }, `${base}.wav`);
console.log("audio done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
await grab(async (name) => {
  const b = await window.film.exportVideo((i, n, s) => console.log(`frame ${i}/${n}  ${s.toFixed(0)}s elapsed  ~${((n - i) * s / Math.max(i, 1) / 60).toFixed(1)} min left`));
  window.film.download(b, name);
}, `${base}-raw.mp4`);
console.log("video done", ((Date.now() - t0) / 60000).toFixed(1) + " min");
await browser.close();
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", `${base}-raw.mp4`, "-i", `${base}.wav`, "-map", "0:v", "-map", "1:a",
  "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-profile:v", "high", "-pix_fmt", "yuv420p",
  "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", out], { stdio: "inherit" });
console.log("wrote", out, (fs.statSync(out).size / 1e6).toFixed(1) + " MB");
