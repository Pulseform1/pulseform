// End-to-end test: drives the real app in a headless browser, the way a person would.
//   1. generates a story in every genre (+ Random) and checks it has a hook and messages
//   2. edits a message, renames a character, changes style options
//   3. renders and downloads an MP4, then checks it with ffprobe / ffmpeg (1080x1920, H.264, AAC, duration)
// Run with the app already running (npm run dev), then:  npm run test:e2e
// Options: BASE=http://localhost:5173  DURATION=15  OUT=./e2e-output.mp4
import { createRequire } from "module";
import { execFileSync } from "child_process";
import fs from "fs";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { console.error("Playwright isn't installed: npm i -D playwright && npx playwright install chromium"); process.exit(2); }
const BASE = process.env.BASE || "http://localhost:5173";
const DURATION = process.env.DURATION || "15";
const OUT = process.env.OUT || "e2e-output.mp4";

let failures = 0;
const check = (ok, label) => { console.log(`${ok ? "  ✓" : "  ✗"} ${label}`); if (!ok) failures++; };

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 960 }, acceptDownloads: true });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
const story = () => page.evaluate(() => JSON.parse(localStorage.getItem("pulse-stories-current")));
const settle = () => page.waitForTimeout(700);   // autosave runs 400 ms after an edit

console.log(`Pulse Stories e2e against ${BASE}`);
await page.goto(BASE);
await page.waitForSelector(".canvas-wrap canvas");
const health = await page.evaluate(() => fetch("/api/health").then((r) => r.json()).catch(() => null));
console.log(`server: ${health ? `voice=${health.voice} ai=${health.ai} ffmpeg=${health.ffmpeg}` : "offline (export will have no voices)"}`);

console.log("\n1. Generate stories");
await page.click(`.durations button:has-text("${DURATION === "15" ? "15s" : DURATION + "s"}")`);
for (const g of ["Horror", "Mystery", "Comedy", "Drama", "Plot Twist", "Suspense", "School", "Sci-Fi", "Adventure"]) {
  await page.click(`.genre:has-text("${g}")`);
  await page.click(".btn.primary.wide");
  await settle();
  const s = await story();
  check(s.messages.length >= 3 && s.hook && s.title, `${g}: "${s.title}" (${s.messages.length} messages, hook: "${s.hook.slice(0, 50)}")`);
}
const before = (await story()).id;
await page.click('button:has-text("Generate Random Story")');
await settle();
const rnd = await story();
check(rnd.id !== before && rnd.messages.length >= 3, `Random: "${rnd.title}" [${rnd.genre}]`);

console.log("\n2. Edit");
await page.click('.tabs button:has-text("Messages")');
const first = page.locator(".msg textarea").first();
await first.fill("this is an *edited* message from the e2e test");
await settle();
check((await story()).messages[0].text === "this is an *edited* message from the e2e test", "message text edited");
const count = (await story()).messages.length;
await page.locator(".add-row .btn").first().click();
await settle();
check((await story()).messages.length === count + 1, "message added");
await page.locator(".msg").last().locator(".icon-btn.danger").click();
await settle();
check((await story()).messages.length === count, "message deleted");
await page.click('.tabs button:has-text("Cast")');
await page.locator(".char-name").nth(1).fill("E2E Friend");
await settle();
check((await story()).characters[1].name === "E2E Friend", "character renamed");
// uploads: a profile picture and a photo attachment (a generated test image)
const png = Buffer.from((await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 400; c.height = 300; const g = c.getContext("2d"); const gr = g.createLinearGradient(0, 0, 400, 300); gr.addColorStop(0, "#ff3d6e"); gr.addColorStop(1, "#3de0ff"); g.fillStyle = gr; g.fillRect(0, 0, 400, 300); g.fillStyle = "#fff"; g.font = "bold 60px sans-serif"; g.fillText("E2E", 120, 170); return c.toDataURL("image/png"); })).split(",")[1], "base64");
await page.locator('.char-card input[type="file"]').nth(1).setInputFiles({ name: "face.png", mimeType: "image/png", buffer: png });
await settle();
check((await story()).characters[1].image.startsWith("data:image/jpeg"), "profile picture uploaded");
await page.click('.tabs button:has-text("Messages")');
await page.locator(".msg").nth(1).locator("select.mini").selectOption("image");
await page.waitForTimeout(200);
await page.locator(".msg").nth(1).locator('.msg-opts select[title="Picture"]').selectOption("__upload").catch(() => {});
await page.locator('.messages-tab > input[type="file"]').setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: png });
await settle();
const im = (await story()).messages[1];
check(im.type === "image" && im.image.startsWith("data:image/jpeg"), "photo attachment uploaded");
await page.click('.tabs button:has-text("Style")');
await page.click('.bg-grid button:has-text("Starfield grid")');
await page.click('.segmented button:has-text("Karaoke")');
await settle();
const st = await story();
check(st.look.background === "scifi" && st.captions.style === "karaoke", "background + caption style changed");
await page.click('.tabs button:has-text("Audio")');
check(await page.locator(".audio-tab").isVisible(), "audio tab renders");

console.log("\n3. Preview");
await page.click(".big-play");
await page.waitForTimeout(1500);
const t1 = await page.locator(".time").textContent();
check(!t1.startsWith("0:00 /"), `preview plays (${t1})`);
await page.click(".transport .icon-btn.round");

console.log("\n4. Export");
await page.click('.tabs button:has-text("Export")');
const t0 = Date.now();
await page.click('button:has-text("Render video")');
const link = page.locator('a:has-text("Download")');
await link.waitFor({ timeout: 15 * 60 * 1000 });
const [dl] = await Promise.all([page.waitForEvent("download"), link.click()]);
await dl.saveAs(OUT);
const notes = await page.locator(".result .hint").allTextContents();
const meta = await page.locator(".result .meta").textContent();
if (health?.voice === "ready") check(!/no voices/.test(meta), "export includes narration");
console.log(`  rendered in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${OUT} (${(fs.statSync(OUT).size / 1048576).toFixed(1)} MB)${notes.length ? "\n  notes: " + notes.join(" | ") : ""}`);

let info = "";
try { info = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,sample_rate:format=duration", "-of", "default=nw=1", OUT]).toString(); }
catch { try { execFileSync("ffmpeg", ["-hide_banner", "-i", OUT]); } catch (e) { info = String(e.stderr || ""); } }
console.log(info.trim().split("\n").map((l) => "    " + l).join("\n"));
check(/1080/.test(info) && /1920/.test(info), "1080 x 1920");
check(/h264/.test(info), "H.264 video");
check(/aac/.test(info) || (!health?.ffmpeg && /opus/.test(info)), "AAC audio");
const dur = Number((info.match(/duration=([\d.]+)/) || [])[1] || 0);
if (dur) check(dur > 8 && dur < 60, `duration ${dur.toFixed(1)}s`);

check(!errors.length, `no browser errors${errors.length ? ": " + errors.join(" | ") : ""}`);
await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
