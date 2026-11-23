import { useEffect, useRef, useState } from "react";
import { compileTimeline } from "../engine/timeline.js";
import { renderMix } from "../engine/audio.js";
import { exportCapabilities, exportVideo } from "../engine/exporter.js";
import { fmtTime } from "../engine/util.js";
import { slug } from "../lib/storage.js";
import { Icon } from "./ui.jsx";

export function ExportTab({ story, compiled, health, ensureVoices }) {
  const [caps, setCaps] = useState(null);
  const [job, setJob] = useState(null);       // { phase, done, total, eta }
  const [result, setResult] = useState(null); // { url, size, ext, notes, seconds, duration, name }
  const [error, setError] = useState("");
  const abort = useRef(null);

  useEffect(() => { exportCapabilities().then(setCaps); }, []);
  useEffect(() => () => { abort.current?.abort(); }, []);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  const voicesMissing = story.narration.enabled && !health.online;
  const run = async () => {
    setError(""); setResult(null);
    const ac = new AbortController(); abort.current = ac;
    try {
      let narr = { buffers: new Map(), durations: {} };
      if (story.narration.enabled && health.online) {
        setJob({ phase: "Generating voices", done: 0, total: 1 });
        narr = await ensureVoices();
      }
      if (ac.signal.aborted) throw new DOMException("cancelled", "AbortError");
      const final = compileTimeline(story, story.narration.enabled ? narr.durations : {});
      setJob({ phase: "Mixing audio", done: 0, total: 1 });
      const mix = await renderMix(final, narr);
      const out = await exportVideo(final, mix, { signal: ac.signal, serverFfmpeg: health.online && health.ffmpeg, onProgress: setJob });
      const name = `${slug(story.title)}.${out.ext}`;
      setResult({ url: URL.createObjectURL(out.blob), size: out.blob.size, ext: out.ext, notes: out.notes, seconds: out.seconds, duration: final.duration, name, hasVoices: narr.buffers.size > 0 });
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message || String(e));
    } finally { setJob(null); abort.current = null; }
  };

  const pct = job ? Math.round((job.done / Math.max(1, job.total)) * 100) : 0;
  const mp4Path = caps?.avc ? (caps.aac ? "H.264 + AAC, encoded directly in this browser" : health.ffmpeg ? "H.264 + Opus in the browser, then audio converted to AAC by the Studio server" : "H.264 + Opus audio (start the Studio server to get AAC)") : caps?.vp9 ? (health.ffmpeg ? "VP9 in the browser, converted to MP4 by the Studio server" : "WebM (VP9) only. Start the Studio server for MP4") : null;

  return (
    <div className="export-tab">
      <div className="export-hero">
        <div>
          <h3>MP4 · 1080 × 1920 · 30 fps</h3>
          <p>{fmtTime(compiled.duration)} long · {story.messages.length} messages · vertical for TikTok, Reels and Shorts</p>
        </div>
      </div>
      <ul className="checklist">
        <li className={caps?.webcodecs ? "ok" : caps ? "bad" : ""}>{!caps ? "Checking this browser…" : caps.webcodecs ? `Video encoding: ${mp4Path}` : "This browser can't encode video. Use a recent Chrome, Edge or Safari."}</li>
        <li className={story.narration.enabled ? (health.online ? "ok" : "bad") : "off"}>{!story.narration.enabled ? "Narration is off" : health.online ? "Narration: Kokoro voices (local, free)" : "Narration: the Studio server is offline, so this export will have NO voices"}</li>
        <li className="ok">Music, sound effects and captions are built in</li>
      </ul>
      <p className="hint">Rendering happens on your computer: every frame is drawn and encoded locally, so it's free and nothing is uploaded. Expect about 1–3× the video's length on a typical laptop.</p>

      {!job && <button className="btn primary wide big" disabled={!caps?.webcodecs || !story.messages.length} onClick={run}><Icon name="film" />Render video{voicesMissing ? " (without voices)" : ""}</button>}
      {job && (
        <div className="job">
          <div className="bar big"><i style={{ width: `${pct}%` }} /><span>{job.phase}{job.total > 1 ? ` · ${pct}%` : "…"}{job.eta ? ` · about ${Math.ceil(job.eta)}s left` : ""}</span></div>
          <button className="btn small ghost" onClick={() => abort.current?.abort()}><Icon name="close" size={13} stroke />Cancel</button>
        </div>
      )}
      {error && <p className="hint error">Export failed: {error}</p>}

      {result && (
        <div className="result">
          <video src={result.url} controls playsInline />
          <div className="result-side">
            <a className="btn lime wide big" href={result.url} download={result.name}><Icon name="download" />Download {result.ext.toUpperCase()}</a>
            <p className="meta">{result.name}<br />{(result.size / 1048576).toFixed(1)} MB · {fmtTime(result.duration)} · rendered in {Math.round(result.seconds)}s{!result.hasVoices && story.narration.enabled ? " · no voices" : ""}</p>
            {result.notes.map((n) => <p key={n} className="hint warn">{n}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}
