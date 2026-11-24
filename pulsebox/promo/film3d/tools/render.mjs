// Render the film: opens the built page in headless Chromium (WebGL through SwiftShader), renders the
// soundtrack and every frame, then muxes them with ffmpeg (x264 + AAC, loudness -14 LUFS).
//   npx vite build && npx vite preview --port 5301 --strictPort &
//   node tools/render.mjs <film> [http://localhost:5301/]      e.g. node tools/render.mjs one-life
// Writes out/pulsebox-<film>.mp4. Frames are encoded in 10-second pieces under out/seg/<film>/; a piece that already
// exists is skipped, so if the render is interrupted, running the same command again carries on where it stopped.
// Delete out/seg/<film>/ and out/pulsebox-<film>.wav after changing the film.
import { createRequire } from "module";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
const { chromium } = createRequire(import.meta.url)("playwright");
const [film = "the-78th-game", host = "http://localhost:5301/"] = process.argv.slice(2);
const url = `${host}?film=${film}`, out = `out/pulsebox-${film}.mp4`, base = out.replace(/\.mp4$/, ""), segDir = path.join("out", "seg", film), SEG = 300;
fs.mkdirSync(segDir, { recursive: true });

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, acceptDownloads: true });
page.on("console", (m) => { if (!/GL Driver Message/.test(m.text())) console.log("[page]", m.text()); });
page.on("pageerror", (e) => console.log("[page error]", e.message));
await page.goto(url); await page.waitForFunction(() => window.ready || window.bootError, null, { timeout: 120000 });
const bootError = await page.evaluate(() => window.bootError); if (bootError) throw new Error(bootError);
async function grab(fn, arg, file) {   // run fn in the page; it hands back a blob through a download
  const dl = page.waitForEvent("download", { timeout: 0 });
  await page.evaluate(fn, arg);
  await (await dl).saveAs(file + ".part"); fs.renameSync(file + ".part", file);
}
const t0 = Date.now(), since = () => ((Date.now() - t0) / 60000).toFixed(1) + " min";
if (!fs.existsSync(`${base}.wav`)) {
  await grab(async () => { const b = await window.film.exportAudio(); window.film.download(b, "a.wav"); }, null, `${base}.wav`);
  console.log("audio done", since());
}
const total = await page.evaluate(() => window.film.frames), segs = [];
for (let from = 0; from < total; from += SEG) {
  const file = path.join(segDir, `seg-${String(from).padStart(5, "0")}.mp4`); segs.push(file);
  if (fs.existsSync(file)) { console.log("have", file); continue; }
  await grab(async ([from, to]) => {
    const b = await window.film.exportVideo((i, n, s, done) => console.log(`frame ${i}/${n}  (${(s / Math.max(done, 1)).toFixed(2)} s/frame)`), from, to);
    window.film.download(b, "v.mp4");
  }, [from, Math.min(from + SEG, total)], file);
  console.log("wrote", file, since());
}
await browser.close();
fs.writeFileSync(path.join(segDir, "list.txt"), segs.map((f) => `file '${path.resolve(f)}'`).join("\n") + "\n");
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(segDir, "list.txt"), "-c", "copy", `${base}-raw.mp4`], { stdio: "inherit" });
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", `${base}-raw.mp4`, "-i", `${base}.wav`, "-map", "0:v", "-map", "1:a",
  "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-profile:v", "high", "-pix_fmt", "yuv420p",
  "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", out], { stdio: "inherit" });
console.log("wrote", out, (fs.statSync(out).size / 1e6).toFixed(1) + " MB", since());
