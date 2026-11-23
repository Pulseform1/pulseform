import { useRef, useState } from "react";
import { GENRES, RANDOM_GENRE, DURATIONS, normalizeStory } from "../story/model.js";
import { plotCount } from "../story/generator.js";
import { listLibrary, saveToLibrary, removeFromLibrary, downloadJSON } from "../lib/storage.js";
import { Icon, Toggle } from "./ui.jsx";

const fmtDur = (d) => (d < 60 ? `${d}s` : d % 60 ? `${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}` : `${d / 60} min`);
const GLYPH = { horror: "👁", mystery: "🔎", comedy: "😂", drama: "💔", twist: "🌀", suspense: "⏱", school: "🎒", scifi: "🛸", adventure: "🧭", random: "🎲" };

export function CreatePanel({ story, onGenerate, busy, error, aiAvailable, serverOnline, onLoad }) {
  const [genre, setGenre] = useState(story.genre || "horror");
  const [duration, setDuration] = useState(story.duration || 30);
  const [useAI, setUseAI] = useState(false);
  const [idea, setIdea] = useState("");
  const [lib, setLib] = useState(listLibrary);
  const fileRef = useRef(null);
  const ai = useAI && aiAvailable;

  const importFile = async (f) => { try { onLoad(normalizeStory(JSON.parse(await f.text()))); } catch { alert("That file isn't a Pulse Stories project."); } };

  return (
    <aside className="create">
      <section className="panel">
        <h2>Create a story</h2>
        <div className="genre-grid">
          {[...GENRES, RANDOM_GENRE].map((g) => (
            <button key={g.id} className={`genre ${genre === g.id ? "on" : ""}`} style={{ "--c": g.color }} onClick={() => setGenre(g.id)} title={g.blurb}>
              <span className="glyph">{GLYPH[g.id]}</span><span>{g.label}</span>
            </button>
          ))}
        </div>
        <div className="sub-label">Length</div>
        <div className="durations">{DURATIONS.map((d) => <button key={d} className={d === duration ? "on" : ""} onClick={() => setDuration(d)}>{fmtDur(d)}</button>)}</div>

        <div className="ai-box">
          <Toggle value={useAI} onChange={setUseAI} label="Write with AI (Claude)" />
          {useAI && !aiAvailable && <p className="hint warn">{serverOnline ? "The server has no Anthropic API key, so AI writing is off. Add ANTHROPIC_API_KEY and restart the server (see README). The built-in writer is used instead." : "AI writing runs through the Studio server, which isn't running."}</p>}
          {useAI && aiAvailable && <textarea className="idea" rows={2} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Optional: your idea, a twist, a setting… (leave empty for a fresh concept)" />}
          {!useAI && <p className="hint">Built-in writer: {plotCount()} hand-written plots with random names, details, scenes and endings. Works offline.</p>}
        </div>

        <button className="btn primary wide" disabled={!!busy} onClick={() => onGenerate({ genre, duration, useAI: ai, idea })}>
          <Icon name="sparkle" />{genre === "random" ? "Generate story" : `Generate ${GENRES.find((g) => g.id === genre)?.label || ""} story`}
        </button>
        <button className="btn lime wide" disabled={!!busy} onClick={() => { setGenre("random"); onGenerate({ genre: "random", duration, useAI: ai, idea: "" }); }}>
          <Icon name="dice" />Generate Random Story
        </button>
        {busy && <p className="hint busy"><span className="spinner" />{busy}</p>}
        {error && <p className="hint error">{error}</p>}
      </section>

      <section className="panel library">
        <div className="row-between"><h2>My stories</h2>
          <div className="row">
            <button className="btn small" onClick={() => { saveToLibrary(story); setLib(listLibrary()); }} title="Save the current story to this list"><Icon name="check" size={13} />Save</button>
            <button className="btn small ghost" onClick={() => fileRef.current?.click()} title="Open a .story.json file"><Icon name="upload" size={13} /></button>
            <button className="btn small ghost" onClick={() => downloadJSON(story)} title="Download this story as a .story.json file"><Icon name="download" size={13} /></button>
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files[0] && importFile(e.target.files[0])} />
          </div>
        </div>
        {!lib.length && <p className="hint">Saved stories appear here. Your current story is also autosaved.</p>}
        <ul>
          {lib.map((s) => (
            <li key={s.id} className={s.id === story.id ? "on" : ""}>
              <button className="lib-item" onClick={() => onLoad(normalizeStory(s))}>
                <span className="glyph">{GLYPH[s.genre]}</span>
                <span className="lib-text"><b>{s.title}</b><em>{s.messages.length} messages · {fmtDur(s.duration)}</em></span>
              </button>
              <button className="icon-btn" title="Remove" onClick={() => { removeFromLibrary(s.id); setLib(listLibrary()); }}><Icon name="trash" size={13} /></button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
