import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeStory } from "./story/model.js";
import { generateStory } from "./story/generator.js";
import { compileTimeline } from "./engine/timeline.js";
import { renderMix } from "./engine/audio.js";
import { serverHealth, buildNarration, cachedNarration } from "./engine/voices.js";
import { CreatePanel } from "./components/CreatePanel.jsx";
import { Preview } from "./components/Preview.jsx";
import { MessagesTab } from "./components/MessagesTab.jsx";
import { CastTab } from "./components/CastTab.jsx";
import { StyleTab } from "./components/StyleTab.jsx";
import { AudioTab } from "./components/AudioTab.jsx";
import { ExportTab } from "./components/ExportTab.jsx";
import { Icon } from "./components/ui.jsx";
import { loadCurrent, saveCurrent } from "./lib/storage.js";

const TABS = [["messages", "Messages"], ["cast", "Cast"], ["style", "Style"], ["audio", "Audio"], ["export", "Export"]];

export default function App() {
  const [story, setStoryState] = useState(() => loadCurrent() || generateStory({ genre: "horror", duration: 30 }));
  const hist = useRef({ past: [], future: [] });
  const setStory = useCallback((next, record = true) => {
    setStoryState((prev) => {
      const value = normalizeStory(typeof next === "function" ? next(prev) : next);
      if (record) { hist.current.past.push(prev); if (hist.current.past.length > 80) hist.current.past.shift(); hist.current.future = []; }
      return value;
    });
  }, []);
  const undo = () => { const h = hist.current; if (!h.past.length) return; setStoryState((cur) => { h.future.push(cur); return h.past.pop(); }); };
  const redo = () => { const h = hist.current; if (!h.future.length) return; setStoryState((cur) => { h.past.push(cur); return h.future.pop(); }); };
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.target.closest?.("textarea, input")) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); } else if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [saveFailed, setSaveFailed] = useState(false);   // browser storage full (usually big uploaded pictures)
  useEffect(() => { const id = setTimeout(() => setSaveFailed(!saveCurrent(story)), 400); return () => clearTimeout(id); }, [story]);

  // ---- server: voices, AI writer, MP4 conversion
  const [health, setHealth] = useState({ online: false, voice: "offline", ai: false, ffmpeg: false, checked: false });
  useEffect(() => { let live = true; const poll = async () => { const h = await serverHealth(); if (live) setHealth({ ...h, checked: true }); }; poll(); const id = setInterval(poll, 6000); return () => { live = false; clearInterval(id); }; }, []);

  // ---- narration: reuse what's cached, build what's missing in the background
  const [narr, setNarr] = useState({ buffers: new Map(), durations: {} });
  const [voiceJob, setVoiceJob] = useState(null);   // { done, total } | { error }
  const voiceKey = useMemo(() => JSON.stringify([story.narration, story.characters.map((c) => [c.id, c.voice]), story.messages.map((m) => [m.id, m.from, m.type, m.text, m.say])]), [story]);
  const buildRef = useRef(null);
  const buildVoices = useCallback(async (s) => {
    buildRef.current?.abort();
    const ac = new AbortController(); buildRef.current = ac;
    try {
      const result = await buildNarration(s, (done, total) => !ac.signal.aborted && setVoiceJob({ done, total }), ac.signal);
      if (!ac.signal.aborted) { setNarr(result); setVoiceJob(null); }
      return result;
    } catch (e) { if (e.name !== "AbortError") setVoiceJob({ error: e.message }); throw e; }
  }, []);
  useEffect(() => {
    const cached = cachedNarration(story);
    setNarr(cached);
    if (!story.narration.enabled || !health.online || !cached.missing) { setVoiceJob(null); return; }
    const id = setTimeout(() => buildVoices(story).catch(() => {}), 900);
    return () => clearTimeout(id);
  }, [voiceKey, health.online]); // eslint-disable-line react-hooks/exhaustive-deps

  const compiled = useMemo(() => compileTimeline(story, story.narration.enabled ? narr.durations : {}), [story, narr]);

  // ---- audio mix for the preview (rebuilt shortly after edits)
  const [mix, setMix] = useState(null);
  useEffect(() => {
    let live = true; setMix(null);
    const id = setTimeout(() => renderMix(compiled, narr).then((b) => live && setMix(b)).catch(() => {}), 350);
    return () => { live = false; clearTimeout(id); };
  }, [compiled, narr]);

  // ---- generating
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const generate = async ({ genre, duration, useAI, idea }) => {
    setError("");
    try {
      if (useAI) {
        setBusy("Claude is writing your story…");
        const r = await fetch("/api/story", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ genre, duration, idea }) });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `Server error ${r.status}`);
        setStory(normalizeStory({ ...data, duration, seed: Date.now(), group: (data.characters || []).length > 2, narration: story.narration, look: { background: data.genre } }));
      } else {
        setStory(generateStory({ genre, duration, narration: story.narration.enabled }));
      }
      setTab("messages"); setSeek({ t: 0, n: Date.now() });
    } catch (e) { setError(e.message); }
    finally { setBusy(""); }
  };

  const [tab, setTab] = useState("messages");
  const [time, setTime] = useState(0);
  const [seek, setSeek] = useState({ t: 0, n: 0 });
  const activeId = useMemo(() => { let id = null; for (const it of compiled.items) if (it.tStart <= time + 0.01) id = it.msg.id; return id; }, [compiled, time]);
  const seekToMessage = (id) => { const it = compiled.items.find((x) => x.msg.id === id); if (it) setSeek({ t: Math.max(0, it.tAppear + 0.3), n: Date.now() }); };

  const voiceLabel = !health.checked ? "Checking…" : !health.online ? "Voices offline" : voiceJob?.error ? "Voice error" : voiceJob ? `Voices ${voiceJob.done}/${voiceJob.total}` : health.voice === "loading" ? "Loading voices…" : story.narration.enabled ? "Voices ready" : "Narration off";

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><span className="logo"><span /><span /></span><b>Pulse Stories</b><em>Studio</em></div>
        <input className="title-input" value={story.title} onChange={(e) => setStory((s) => ({ ...s, title: e.target.value }))} aria-label="Story title" />
        <div className="top-actions">
          <button className="icon-btn" title="Undo (Ctrl+Z)" onClick={undo}><Icon name="undo" /></button>
          <button className="icon-btn" title="Redo (Ctrl+Y)" onClick={redo}><Icon name="redo" /></button>
          <span className={`pill ${health.online && !voiceJob?.error ? (voiceJob ? "busy" : "ok") : "warn"}`} title={health.online ? "Kokoro voices run on your computer through the Studio server" : "Start the Studio server (npm run dev) to hear and export voices"}><Icon name="mic" size={13} />{voiceLabel}</span>
          {saveFailed && <span className="pill warn" title="Browser storage is full (uploaded pictures take space). Use My stories → download to keep a copy.">Not autosaved</span>}
          <span className={`pill ${health.ai ? "ok" : "off"}`} title={health.ai ? "Claude AI writing is available" : "Set ANTHROPIC_API_KEY on the server to enable AI writing"}><Icon name="sparkle" size={13} />{health.ai ? "AI writer on" : "AI writer off"}</span>
          <button className="btn primary" onClick={() => setTab("export")}><Icon name="download" />Export MP4</button>
        </div>
      </header>
      <main className="workspace">
        <CreatePanel story={story} onGenerate={generate} busy={busy} error={error} aiAvailable={health.ai} serverOnline={health.online} onLoad={(s) => { setStory(s); setSeek({ t: 0, n: Date.now() }); }} />
        <Preview compiled={compiled} mix={mix} seek={seek} onTime={setTime} voiceJob={voiceJob} narrationOn={story.narration.enabled} serverOnline={health.online} />
        <section className="inspector">
          <nav className="tabs">{TABS.map(([id, label]) => <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>)}</nav>
          <div className="tab-body">
            {tab === "messages" && <MessagesTab story={story} setStory={setStory} activeId={activeId} onSelect={seekToMessage} compiled={compiled} />}
            {tab === "cast" && <CastTab story={story} setStory={setStory} serverOnline={health.online} />}
            {tab === "style" && <StyleTab story={story} setStory={setStory} />}
            {tab === "audio" && <AudioTab story={story} setStory={setStory} health={health} voiceJob={voiceJob} onRebuild={() => buildVoices(story).catch(() => {})} />}
            {tab === "export" && <ExportTab story={story} compiled={compiled} narr={narr} health={health} ensureVoices={async () => (cachedNarration(story).missing && health.online && story.narration.enabled ? buildVoices(story) : cachedNarration(story))} />}
          </div>
        </section>
      </main>
    </div>
  );
}
