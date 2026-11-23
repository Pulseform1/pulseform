// Pulse Stories Studio local server. Runs on http://localhost:8787.
//  - /api/tts        natural voices with Kokoro (free, runs on this computer, ~90 MB model downloaded on first use)
//  - /api/story      AI story writing with Claude (only when ANTHROPIC_API_KEY is set)
//  - /api/remux      turns the browser's MP4 (Opus audio) into MP4 with AAC audio, for TikTok/Instagram/YouTube
//  - /api/transcode  turns a WebM export into MP4 (H.264 + AAC) for browsers that cannot encode H.264
// Start it with `npm run dev` (with the editor) or `npm start` (serves the built app).
import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { spawn, spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { aiAvailable, writeStory, Anthropic } from "./ai.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const CACHE = path.join(here, ".cache", "tts");
fs.mkdirSync(CACHE, { recursive: true });

const app = express();
app.use(express.json({ limit: "4mb" }));

// ---------------------------------------------------------------- ffmpeg (for MP4 audio conversion)
let FFMPEG = null;
async function findFfmpeg() {
  const candidates = [process.env.FFMPEG_PATH];
  try { candidates.push((await import("ffmpeg-static")).default); } catch { /* optional dependency */ }
  candidates.push("ffmpeg");
  for (const c of candidates.filter(Boolean)) { try { if (spawnSync(c, ["-version"]).status === 0) return c; } catch { /* next */ } }
  return null;
}
function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, ["-y", "-v", "error", ...args]);
    let err = ""; p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(err || `ffmpeg exited with ${code}`))));
  });
}

// ---------------------------------------------------------------- Kokoro voices
let tts = null, ttsState = "idle", ttsError = "";
let queue = Promise.resolve();
async function loadTts() {
  if (tts) return tts;
  if (ttsState === "loading") { while (ttsState === "loading") await new Promise((r) => setTimeout(r, 300)); if (tts) return tts; }
  ttsState = "loading";
  try {
    const { KokoroTTS } = await import("kokoro-js");
    tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });
    ttsState = "ready";
  } catch (e) { ttsState = "error"; ttsError = String(e.message || e); throw e; }
  return tts;
}
function wav16(samples, rate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  return buf;
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, voice: ttsState, voiceError: ttsError, ai: aiAvailable(), ffmpeg: Boolean(FFMPEG) });
});

app.post("/api/tts", async (req, res) => {
  const text = String(req.body?.text || "").trim().slice(0, 600);
  const voice = String(req.body?.voice || "af_sky").replace(/[^a-z_+]/g, "");
  const speed = Math.max(0.6, Math.min(1.6, Number(req.body?.speed) || 1));
  if (!text) return res.status(400).json({ error: "No text" });
  const key = crypto.createHash("sha1").update(`${voice}|${speed}|${text}`).digest("hex");
  const file = path.join(CACHE, key + ".wav");
  if (fs.existsSync(file)) return res.type("audio/wav").send(fs.readFileSync(file));
  // one line at a time, so a long story doesn't overload the CPU
  const job = queue.then(async () => {
    const model = await loadTts();
    const audio = await model.generate(text, { voice, speed });
    const out = wav16(audio.audio, audio.sampling_rate);
    fs.writeFileSync(file, out);
    return out;
  });
  queue = job.catch(() => {});
  try { res.type("audio/wav").send(await job); }
  catch (e) { res.status(500).json({ error: `Voice generation failed: ${e.message}` }); }
});

app.post("/api/story", async (req, res) => {
  if (!aiAvailable()) return res.status(501).json({ error: "AI writing needs an Anthropic API key. Set ANTHROPIC_API_KEY before starting the server (see README). The built-in generator works without it." });
  try {
    const { genre = "random", duration = 60, idea = "" } = req.body || {};
    res.json(await writeStory({ genre, duration: Number(duration) || 60, idea: String(idea).slice(0, 500) }));
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return res.status(401).json({ error: "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY." });
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ error: "Rate limited by the Anthropic API. Try again in a minute." });
    if (e instanceof Anthropic.APIError) return res.status(502).json({ error: `Anthropic API error ${e.status}: ${e.message}` });
    res.status(e.status || 500).json({ error: e.message || String(e) });
  }
});

const raw = express.raw({ type: () => true, limit: "2gb" });
async function convert(req, res, inExt, args) {
  if (!FFMPEG) return res.status(501).json({ error: "ffmpeg is not available on this computer." });
  const id = crypto.randomBytes(6).toString("hex"), dir = fs.mkdtempSync(path.join(os.tmpdir(), "pulse-"));
  const input = path.join(dir, `in.${inExt}`), output = path.join(dir, `out-${id}.mp4`);
  try {
    fs.writeFileSync(input, req.body);
    await runFfmpeg(["-i", input, ...args, "-movflags", "+faststart", output]);
    res.type("video/mp4").send(fs.readFileSync(output));
  } catch (e) { res.status(500).json({ error: `Conversion failed: ${e.message}` }); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
app.post("/api/remux", raw, (req, res) => convert(req, res, "mp4", ["-c:v", "copy", "-c:a", "aac", "-b:a", "192k"]));
app.post("/api/transcode", raw, (req, res) => convert(req, res, "webm", ["-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k"]));

if (process.argv.includes("--serve-dist")) {
  const dist = path.join(here, "..", "dist");
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, "index.html")));
}

FFMPEG = await findFfmpeg();
app.listen(PORT, () => {
  console.log(`Pulse Stories server on http://localhost:${PORT}`);
  console.log(`  voices: Kokoro (loads on first use) | AI writing: ${aiAvailable() ? "on" : "off (set ANTHROPIC_API_KEY)"} | ffmpeg: ${FFMPEG ? "found" : "not found"}`);
});
