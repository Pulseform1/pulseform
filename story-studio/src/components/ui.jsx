// Small form controls shared by the panels.
import { useEffect, useRef } from "react";

const PATHS = {
  play: "M8 5v14l11-7z", pause: "M7 5h4v14H7zM13 5h4v14h-4z", plus: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z", trash: "M9 3h6l1 2h4v2H4V5h4zM6 8h12l-1 13H7z",
  up: "M12 6l6 6h-4v6h-4v-6H6z", down: "M12 18l-6-6h4V6h4v6h4z", copy: "M8 8h11v13H8zM5 3h11v3H7v11H5z", download: "M11 3h2v9l3-3 1.4 1.4L12 15.8 6.6 10.4 8 9l3 3zM5 18h14v2H5z",
  sparkle: "M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z", dice: "M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm3 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm8 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-4 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-4 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm8 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z",
  mic: "M12 2a3 3 0 013 3v6a3 3 0 01-6 0V5a3 3 0 013-3zm-7 9h2a5 5 0 0010 0h2a7 7 0 01-6 6.9V21h-2v-3.1A7 7 0 015 11z", film: "M4 4h16v16H4zm2 2v2h2V6zm10 0v2h2V6zM6 10v4h12v-4zm0 6v2h2v-2zm10 0v2h2v-2z",
  undo: "M12 5V1L6 7l6 6V9a5 5 0 110 10H7v2h5a7 7 0 000-14z", redo: "M12 5V1l6 6-6 6V9a5 5 0 100 10h5v2h-5a7 7 0 010-14z", refresh: "M17.6 6.4A8 8 0 104 12h2a6 6 0 1110.2-4.2L13 11h7V4z",
  upload: "M11 16h2V7l3 3 1.4-1.4L12 3.2 6.6 8.6 8 10l3-3zM5 18h14v2H5z", speaker: "M3 9h4l5-4v14l-5-4H3zm13 .5a4 4 0 010 5l1.4 1.4a6 6 0 000-7.8z", mute: "M3 9h4l5-4v14l-5-4H3zm13.6.2L18 7.8 20 9.8l2-2 1.4 1.4-2 2 2 2-1.4 1.4-2-2-2 2-1.4-1.4 2-2z",
  book: "M6 3h11a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2zm1 3v2h9V6z", close: "M6 6l12 12M18 6L6 18", check: "M9 16.2l-4.2-4.2-1.4 1.4L9 19 21 7l-1.4-1.4z",
};
export function Icon({ name, size = 16, stroke = false }) {
  return stroke
    ? <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d={PATHS[name]} /></svg>
    : <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d={PATHS[name]} /></svg>;
}

export const Field = ({ label, hint, children }) => (
  <label className="field"><span className="field-label">{label}{hint && <em>{hint}</em>}</span>{children}</label>
);
export const Select = ({ value, onChange, options }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
);
export function Slider({ value, onChange, min, max, step = 0.01, format = (v) => v }) {
  return <div className="slider"><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} /><span>{format(value)}</span></div>;
}
export const Segmented = ({ value, onChange, options }) => (
  <div className="segmented">{options.map((o) => <button key={o.id} type="button" className={o.id === value ? "on" : ""} onClick={() => onChange(o.id)}>{o.label}</button>)}</div>
);
export const Toggle = ({ value, onChange, label }) => (
  <button type="button" className={`toggle ${value ? "on" : ""}`} onClick={() => onChange(!value)}><span className="knob" />{label}</button>
);
export const Swatches = ({ value, onChange, colors }) => (
  <div className="swatches">{colors.map((c) => <button key={c} type="button" title={c} className={c === value ? "on" : ""} style={{ background: c }} onClick={() => onChange(c)} />)}</div>
);
export function AutoText({ value, onChange, placeholder, onFocus }) {
  const ref = useRef(null);
  useEffect(() => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }, [value]);
  return <textarea ref={ref} rows={1} value={value} placeholder={placeholder} onFocus={onFocus} onChange={(e) => onChange(e.target.value)} />;
}
