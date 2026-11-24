// Regenerate the voice lines with Kokoro through the Story Studio TTS server (story-studio: npm run server).
//   node tools/voices.mjs <film> [id ...]      (no ids = every line)
// Writes public/films/<film>/vo/<id>.wav and stores each line's length (seconds) as `dur` in its script.json.
// (The 78th Game was voiced this way; One Life uses tools/voices_chatterbox.py for more natural voices.)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const [film, ...only] = process.argv.slice(2), dir = path.join(root, "public", "films", film);
const file = path.join(dir, "script.json"), script = JSON.parse(fs.readFileSync(file, "utf8"));
const api = process.env.TTS_URL || "http://localhost:8787/api/tts";
function wavSeconds(buf) {   // walk the RIFF chunks for fmt + data
  let o = 12, rate = 24000, block = 2;
  while (o < buf.length - 8) { const id = buf.toString("ascii", o, o + 4), size = buf.readUInt32LE(o + 4);
    if (id === "fmt ") { rate = buf.readUInt32LE(o + 12); block = buf.readUInt16LE(o + 20); }
    if (id === "data") return size / (rate * block);
    o += 8 + size + (size % 2); }
  throw new Error("no data chunk");
}
for (const line of script.lines) {
  if (only.length && !only.includes(line.id)) continue;
  const [voice, speed] = script.voices[line.who];
  const r = await fetch(api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: line.text, voice, speed }) });
  if (!r.ok) throw new Error(`${line.id}: ${r.status} ${await r.text()}`);
  const buf = Buffer.from(await r.arrayBuffer()); fs.writeFileSync(path.join(dir, "vo", `${line.id}.wav`), buf);
  line.dur = +wavSeconds(buf).toFixed(3); console.log(line.id, line.dur + "s", line.text);
}
fs.writeFileSync(file, JSON.stringify(script, null, 1) + "\n");
