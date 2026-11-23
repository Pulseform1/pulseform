import { BACKGROUNDS, CHAT_THEMES, SKINS, CAPTION_STYLES, CAPTION_FONTS } from "../story/model.js";
import { Field, Slider, Segmented, Swatches } from "./ui.jsx";

const HIGHLIGHTS = ["#c6ff3d", "#ffd23d", "#ff3d6e", "#3de0ff", "#b98cff", "#ffffff"];
const BG_SWATCH = {
  horror: "linear-gradient(160deg,#0b0d1f,#2a1450 60%,#05060c)", mystery: "linear-gradient(160deg,#16303a,#0d1a22)", comedy: "linear-gradient(160deg,#ffcf4a,#ff7a59)",
  drama: "linear-gradient(160deg,#3a1030,#14111f)", twist: "conic-gradient(from 90deg,#5b2cff,#c95cff,#2a0f5c,#5b2cff)", suspense: "linear-gradient(160deg,#4a0d0d,#120607)",
  school: "repeating-linear-gradient(0deg,#f6f1e3 0 14px,#cfe0f5 14px 15px)", scifi: "linear-gradient(160deg,#050b1c,#0c2a4a)", adventure: "linear-gradient(180deg,#ff9a5a,#8a4bd1 60%,#2a1a4a)",
};

export function StyleTab({ story, setStory }) {
  const look = (patch) => setStory((s) => ({ ...s, look: { ...s.look, ...patch } }));
  const cap = (patch) => setStory((s) => ({ ...s, captions: { ...s.captions, ...patch } }));
  const { look: L, captions: C } = story;
  return (
    <div className="style-tab">
      <h3>Background</h3>
      <div className="bg-grid">
        {BACKGROUNDS.map((b) => <button key={b.id} className={L.background === b.id ? "on" : ""} onClick={() => look({ background: b.id })}><i style={{ background: BG_SWATCH[b.id] }} />{b.label}</button>)}
      </div>

      <h3>Chat</h3>
      <div className="theme-row">
        {CHAT_THEMES.map((th) => (
          <button key={th.id} className={`theme ${L.chatTheme === th.id ? "on" : ""}`} onClick={() => look({ chatTheme: th.id })} style={{ background: th.light ? "#f4f5f8" : "#14161d" }}>
            <i style={{ background: th.them }} /><i className="me" style={{ background: `linear-gradient(${th.me[0]},${th.me[1]})` }} /><span style={{ color: th.light ? "#222" : "#ddd" }}>{th.label}</span>
          </button>
        ))}
      </div>
      <div className="grid-2">
        <Field label="Hands skin tone"><Swatches value={L.skin} onChange={(v) => look({ skin: v })} colors={SKINS} /></Field>
        <Field label="Hook headline"><Segmented value={L.hookStyle} onChange={(v) => look({ hookStyle: v })} options={[{ id: "banner", label: "First seconds" }, { id: "pinned", label: "Whole video" }, { id: "off", label: "Hidden" }]} /></Field>
      </div>

      <h3>Captions</h3>
      <Field label="Style"><Segmented value={C.style} onChange={(v) => cap({ style: v })} options={CAPTION_STYLES.map((x) => ({ id: x.id, label: x.label.split(" (")[0] }))} /></Field>
      {C.style !== "off" && <>
        {C.style !== "clean" && <Field label="Font"><div className="font-row">{CAPTION_FONTS.map((f) => <button key={f.id} className={C.font === f.id ? "on" : ""} style={{ fontFamily: `'${f.id}'` }} onClick={() => cap({ font: f.id })}>{f.id === "Inter" ? "Aa" : "AA"}<em>{f.label}</em></button>)}</div></Field>}
        <div className="grid-2">
          <Field label="Size"><Slider value={C.size} min={0.6} max={1.5} step={0.05} onChange={(v) => cap({ size: v })} format={(v) => `${Math.round(v * 100)}%`} /></Field>
          <Field label="Height on screen"><Slider value={C.position} min={0.12} max={0.9} step={0.01} onChange={(v) => cap({ position: v })} format={(v) => (v < 0.35 ? "top" : v < 0.65 ? "middle" : "bottom")} /></Field>
        </div>
        {C.style !== "clean" && <Field label="Highlight colour" hint="for *marked* and loud words"><Swatches value={C.highlight} onChange={(v) => cap({ highlight: v })} colors={HIGHLIGHTS} /></Field>}
      </>}
    </div>
  );
}
