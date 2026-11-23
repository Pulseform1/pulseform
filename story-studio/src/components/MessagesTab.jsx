import { useEffect, useRef } from "react";

// Uploaded pictures are shrunk (longest side 720 px) so the story still fits in browser storage.
async function toPhotoDataURL(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 720 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.82);
}
import { IMAGES, REACTIONS, EFFECTS, MESSAGE_TYPES, SCENES } from "../story/model.js";
import { newId } from "../engine/util.js";
import { Icon, AutoText, Field } from "./ui.jsx";

export function MessagesTab({ story, setStory, activeId, onSelect }) {
  const listRef = useRef(null), uploadRef = useRef(null), uploadFor = useRef(null);
  const chars = story.characters;
  const update = (id, patch) => setStory((s) => ({ ...s, messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  const move = (i, d) => setStory((s) => { const a = s.messages.slice(); const j = i + d; if (j < 0 || j >= a.length) return s; [a[i], a[j]] = [a[j], a[i]]; return { ...s, messages: a }; });
  const remove = (id) => setStory((s) => ({ ...s, messages: s.messages.filter((m) => m.id !== id) }));
  const insertAt = (i, msg) => setStory((s) => { const a = s.messages.slice(); a.splice(i, 0, { id: newId(), type: "text", text: "", pause: 0, effect: "", reaction: "", typing: true, image: "", ...msg }); return { ...s, messages: a }; });
  const duplicate = (i) => insertAt(i + 1, { ...story.messages[i], id: newId() });

  // keep the message that's playing in view
  useEffect(() => { listRef.current?.querySelector(".msg.active")?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [activeId]);

  const senderOptions = [...chars.map((c) => ({ id: c.id, label: c.id === "me" ? `${c.name} (you)` : c.name })), { id: "system", label: "System note" }, { id: "narrator", label: "Narrator (scene)" }];
  const changeSender = (m, from) => update(m.id, from === "narrator" ? { from, type: "scene", scene: m.scene || "hallway" } : { from, type: from === "system" ? "system" : ["system", "scene"].includes(m.type) ? "text" : m.type });
  return (
    <div className="messages-tab">
      <div className="story-meta">
        <Field label="Hook headline" hint="the first thing viewers see"><input value={story.hook} onChange={(e) => setStory((s) => ({ ...s, hook: e.target.value }))} placeholder="e.g. My own number texted me at 3 AM" /></Field>
        <Field label="Ending card" hint="optional"><input value={story.outro} onChange={(e) => setStory((s) => ({ ...s, outro: e.target.value }))} placeholder="e.g. Part 2?" /></Field>
      </div>
      <p className="hint small">Tip: wrap a word in *asterisks* to highlight it in the captions. Click a message to jump the preview to it.</p>
      <input ref={uploadRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files[0]; if (f && uploadFor.current) update(uploadFor.current, { image: await toPhotoDataURL(f) }); e.target.value = ""; }} />
      <ol className="msg-list" ref={listRef}>
        {story.messages.map((m, i) => {
          const c = chars.find((x) => x.id === m.from);
          return (
            <li key={m.id} className={`msg ${m.from === "me" ? "me" : m.from === "system" ? "sys" : m.type === "scene" ? "scene" : "them"} ${activeId === m.id ? "active" : ""}`} onClick={(e) => { if (!e.target.closest("select, button, input, textarea")) onSelect(m.id); }}>
              <div className="msg-head">
                <span className="dot" style={{ background: m.type === "scene" ? "#c6ff3d" : m.from === "system" ? "#6b7080" : c?.color || "#888" }} />
                <select className="sender" value={m.from} onChange={(e) => changeSender(m, e.target.value)}>
                  {senderOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                {m.from !== "system" && m.type !== "scene" && <select className="mini" value={m.type} onChange={(e) => update(m.id, { type: e.target.value, image: e.target.value === "image" && !m.image ? "photo-blur" : m.image })}>
                  {MESSAGE_TYPES.filter((t) => t.id !== "system" && t.id !== "scene").map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>}
                <span className="grow" />
                <span className="num">#{i + 1}</span>
                <button className="icon-btn" title="Move up" onClick={() => move(i, -1)}><Icon name="up" size={13} /></button>
                <button className="icon-btn" title="Move down" onClick={() => move(i, 1)}><Icon name="down" size={13} /></button>
                <button className="icon-btn" title="Duplicate" onClick={() => duplicate(i)}><Icon name="copy" size={13} /></button>
                <button className="icon-btn danger" title="Delete" onClick={() => remove(m.id)}><Icon name="trash" size={13} /></button>
              </div>
              {m.type !== "deleted" && <AutoText value={m.text} onFocus={() => onSelect(m.id)} onChange={(v) => update(m.id, { text: v })}
                placeholder={m.type === "scene" ? "What the narrator says, e.g. He stepped into the hallway." : m.type === "image" ? "Caption (optional)" : m.type === "missed-call" ? "Missed voice call" : m.from === "system" ? "e.g. The hallway light flickers." : "Message…"} />}
              <div className="msg-opts">
                {m.type === "scene" && <select value={m.scene} onChange={(e) => update(m.id, { scene: e.target.value })} title="Scene">{SCENES.map((x) => <option key={x.id} value={x.id}>🎬 {x.label}</option>)}</select>}
                {m.type === "scene" && <input className="say" value={m.label} placeholder="On-screen label (optional), e.g. FLOOR 13 · FUSES 0/3" title="A stamp shown in the scene's top-left corner: a game HUD or a place and time" onChange={(e) => update(m.id, { label: e.target.value })} />}
                {m.type === "scene" && <input className="say" value={m.say} placeholder="Say it as… (optional)" title="How the narrator pronounces it, e.g. box dot pulseform dot org. Captions still show the text above." onChange={(e) => update(m.id, { say: e.target.value })} />}
                {m.type === "scene" && <label className="chk" title="A shadow figure appears during the scene"><input type="checkbox" checked={m.figure} onChange={(e) => update(m.id, { figure: e.target.checked })} />shadow figure</label>}
                {m.type === "image" && <select value={m.image.startsWith("data:") ? "__mine" : m.image} title="Picture"
                  onChange={(e) => { if (e.target.value === "__upload") { uploadFor.current = m.id; uploadRef.current?.click(); } else if (e.target.value !== "__mine") update(m.id, { image: e.target.value }); }}>
                  {m.image.startsWith("data:") && <option value="__mine">📷 Your photo</option>}
                  {IMAGES.map((x) => <option key={x.id} value={x.id}>🖼 {x.label}</option>)}
                  <option value="__upload">⬆ Upload a picture…</option>
                </select>}
                <select value={m.effect} onChange={(e) => update(m.id, { effect: e.target.value })} title="Effect when it arrives">{EFFECTS.map((x) => <option key={x.id} value={x.id}>{x.id ? "✨ " + x.label : "No effect"}</option>)}</select>
                {m.from !== "system" && m.type !== "scene" && <select value={m.reaction} onChange={(e) => update(m.id, { reaction: e.target.value })} title="Reaction">{REACTIONS.map((x) => <option key={x} value={x}>{x || "No reaction"}</option>)}</select>}
                <label className="pause" title="Extra pause after this message (seconds)">pause<input type="number" min={0} max={5} step={0.1} value={m.pause} onChange={(e) => update(m.id, { pause: Number(e.target.value) })} />s</label>
                {m.from !== "system" && m.type !== "scene" && <label className="chk" title="Show 'typing…' first"><input type="checkbox" checked={m.typing} onChange={(e) => update(m.id, { typing: e.target.checked })} />typing</label>}
              </div>
              <button className="insert" title="Insert a message below" onClick={() => insertAt(i + 1, { from: m.from === "me" ? chars.find((x) => x.id !== "me")?.id || "me" : "me" })}><Icon name="plus" size={12} /></button>
            </li>
          );
        })}
      </ol>
      <div className="add-row">
        <span>Add:</span>
        {chars.map((c) => <button key={c.id} className="btn small" onClick={() => insertAt(story.messages.length, { from: c.id })}><span className="dot" style={{ background: c.color }} />{c.name}</button>)}
        <button className="btn small ghost" onClick={() => insertAt(story.messages.length, { from: "system", type: "system" })}>System note</button>
        <button className="btn small ghost" onClick={() => insertAt(story.messages.length, { from: "narrator", type: "scene", scene: "hallway" })}>🎬 Scene + narrator</button>
      </div>
    </div>
  );
}
