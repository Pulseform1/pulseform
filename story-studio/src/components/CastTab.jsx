import { useRef, useState } from "react";
import { AVATARS, VOICES } from "../story/model.js";
import { newId } from "../engine/util.js";
import { sampleVoice } from "../engine/voices.js";
import { Icon, Field, Swatches } from "./ui.jsx";

const COLORS = ["#7c5cff", "#ff5c8a", "#2fb7a8", "#ffb02e", "#4fa3ff", "#5ad96b", "#c95cff", "#ff6b3d", "#3a3f55", "#e8e8f0"];
const AVATAR_GLYPH = { initials: "Ab", unknown: "?", smile: "🙂", ghost: "👻", cat: "🐱", dog: "🐶", moon: "🌙", star: "⭐", heart: "❤", robot: "🤖", alien: "👽", mask: "🎭", glasses: "🤓", crown: "👑", eye: "👁", flower: "🌸", skull: "💀" };

// Shrink uploads to a 256px square so stories stay small enough to autosave.
async function toAvatarDataURL(file) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(bmp.width, bmp.height), c = document.createElement("canvas"); c.width = c.height = 256;
  c.getContext("2d").drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, 256, 256);
  return c.toDataURL("image/jpeg", 0.86);
}

let player = null;
export function CastTab({ story, setStory, serverOnline }) {
  const [sampling, setSampling] = useState("");
  const [sampleErr, setSampleErr] = useState("");
  const fileRefs = useRef({});
  const setChar = (id, patch) => setStory((s) => ({ ...s, characters: s.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const addChar = () => setStory((s) => {
    const used = new Set(s.characters.map((c) => c.voice));
    const voice = VOICES.find((v) => !used.has(v.id))?.id || "af_bella";
    return { ...s, group: true, characters: [...s.characters, { id: newId(), name: `Friend ${s.characters.length}`, avatar: "initials", color: COLORS[s.characters.length % COLORS.length], voice }] };
  });
  const removeChar = (id) => {
    const n = story.messages.filter((m) => m.from === id).length;
    const heir = story.characters.find((c) => c.id !== id && c.id !== "me") || story.characters.find((c) => c.id === "me");
    if (n && !confirm(`${n} message(s) are from this character. They'll be given to ${heir.name}. Continue?`)) return;
    setStory((s) => ({ ...s, group: s.characters.length - 1 > 2 ? s.group : false, characters: s.characters.filter((c) => c.id !== id), messages: s.messages.map((m) => (m.from === id ? { ...m, from: heir.id } : m)) }));
  };
  const play = async (c) => {
    setSampleErr(""); setSampling(c.id);
    try {
      const buf = await sampleVoice(c.voice, story.messages.find((m) => m.from === c.id && m.type === "text")?.text.replace(/\*/g, "").slice(0, 140) || `Hey, it's ${c.name}.`);
      player ||= new AudioContext(); await player.resume();
      const src = player.createBufferSource(); src.buffer = buf; src.connect(player.destination); src.start();
      src.onended = () => setSampling("");
    } catch (e) { setSampleErr(e.message); setSampling(""); }
  };

  return (
    <div className="cast-tab">
      <div className="grid-2">
        <Field label="Chat name" hint="blank = the other person's name"><input value={story.chatTitle} onChange={(e) => setStory((s) => ({ ...s, chatTitle: e.target.value }))} placeholder={story.group ? "Group chat" : story.characters[1]?.name} /></Field>
        <Field label="Status line" hint="blank = automatic"><input value={story.chatStatus} onChange={(e) => setStory((s) => ({ ...s, chatStatus: e.target.value }))} placeholder="online" /></Field>
        <Field label="Phone clock"><input value={story.clock} onChange={(e) => setStory((s) => ({ ...s, clock: e.target.value }))} placeholder="11:42" /></Field>
        <Field label="Chat type">
          <div className="segmented"><button type="button" className={!story.group ? "on" : ""} disabled={story.characters.length > 2} onClick={() => setStory((s) => ({ ...s, group: false }))}>1-on-1</button><button type="button" className={story.group ? "on" : ""} onClick={() => setStory((s) => ({ ...s, group: true }))}>Group</button></div>
        </Field>
      </div>
      {!serverOnline && <p className="hint warn">Voice samples need the Studio server (npm run dev).</p>}
      {sampleErr && <p className="hint error">{sampleErr}</p>}
      {story.characters.map((c) => (
        <section key={c.id} className="char-card">
          <div className="char-top">
            <button className="avatar-preview" style={{ background: c.image ? `center/cover url(${c.image})` : c.color }} title="Upload a picture" onClick={() => fileRefs.current[c.id]?.click()}>
              {!c.image && <span>{c.avatar === "initials" ? (c.name || "?").slice(0, 2).toUpperCase() : AVATAR_GLYPH[c.avatar]}</span>}
            </button>
            <input ref={(el) => (fileRefs.current[c.id] = el)} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files[0]; if (f) setChar(c.id, { image: await toAvatarDataURL(f) }); e.target.value = ""; }} />
            <div className="char-fields">
              <input className="char-name" value={c.name} onChange={(e) => setChar(c.id, { name: e.target.value })} aria-label="Name" />
              <span className="role">{c.id === "me" ? "Phone owner (right side)" : "Sends from the left"}</span>
            </div>
            {c.image && <button className="btn small ghost" onClick={() => setChar(c.id, { image: "" })}>Remove photo</button>}
            {c.id !== "me" && story.characters.length > 2 && <button className="icon-btn danger" title="Remove character" onClick={() => removeChar(c.id)}><Icon name="trash" size={14} /></button>}
          </div>
          <div className="avatar-grid">
            {AVATARS.map((a) => <button key={a.id} title={a.label} className={!c.image && c.avatar === a.id ? "on" : ""} onClick={() => setChar(c.id, { avatar: a.id, image: "" })}>{a.id === "initials" ? (c.name || "?").slice(0, 2).toUpperCase() : AVATAR_GLYPH[a.id]}</button>)}
            <button title="Upload a picture" onClick={() => fileRefs.current[c.id]?.click()}><Icon name="upload" size={14} /></button>
          </div>
          <div className="char-row">
            <Swatches value={c.color} onChange={(v) => setChar(c.id, { color: v })} colors={COLORS} />
          </div>
          <div className="char-row">
            <Icon name="mic" size={14} />
            <select value={c.voice} onChange={(e) => setChar(c.id, { voice: e.target.value })}>{VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select>
            <button className="btn small" disabled={!serverOnline || !!sampling} onClick={() => play(c)}>{sampling === c.id ? <><span className="spinner" />Playing</> : <><Icon name="play" size={12} />Hear</>}</button>
          </div>
        </section>
      ))}
      <button className="btn wide ghost" onClick={addChar}><Icon name="plus" />Add a character (makes it a group chat)</button>
    </div>
  );
}
