import { useCallback, useEffect, useRef, useState } from "react";
import { createRenderer } from "../engine/renderer.js";
import { fmtTime } from "../engine/util.js";
import { Icon } from "./ui.jsx";

const PREVIEW_W = 720, PREVIEW_H = 1280;   // drawn at 2/3 size for a smooth preview; exports are full 1080 x 1920

export function Preview({ compiled, mix, seek, onTime, voiceJob, narrationOn, serverOnline }) {
  const canvasRef = useRef(null), wrapRef = useRef(null);
  const renderer = useRef(createRenderer());
  const tRef = useRef(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const audio = useRef({ ctx: null, src: null });

  const draw = useCallback((time) => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); const s = c.width / 1080;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    renderer.current.draw(ctx, compiled, time);
  }, [compiled]);

  const setTime = useCallback((time) => { tRef.current = time; setT(time); onTime?.(time); draw(time); }, [draw, onTime]);

  // fonts first, then draw whenever the story changes
  useEffect(() => { document.fonts.ready.then(() => draw(tRef.current)); draw(tRef.current); }, [draw]);
  useEffect(() => { if (seek?.n) setTime(Math.min(seek.t, compiled.duration)); }, [seek]); // eslint-disable-line react-hooks/exhaustive-deps

  // playback: the audio clock drives the frames when the mix is ready
  useEffect(() => {
    if (!playing) return;
    let raf, last = 0;
    if (tRef.current >= compiled.duration - 0.05) tRef.current = 0;
    const startT = tRef.current, startWall = performance.now();
    let ctx = null, startAudio = 0;
    if (mix && !muted) {
      ctx = audio.current.ctx || (audio.current.ctx = new AudioContext());
      ctx.resume();
      const src = ctx.createBufferSource(); src.buffer = mix; src.connect(ctx.destination);
      startAudio = ctx.currentTime + 0.03; src.start(startAudio, startT);
      audio.current.src = src;
    }
    const loop = () => {
      const now = ctx ? startT + Math.max(0, ctx.currentTime - startAudio) : startT + (performance.now() - startWall) / 1000;
      if (now >= compiled.duration) { setPlaying(false); setTime(compiled.duration); return; }
      tRef.current = now; draw(now);
      if (performance.now() - last > 100) { last = performance.now(); setT(now); onTime?.(now); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); try { audio.current.src?.stop(); } catch { /* already stopped */ } audio.current.src = null; };
  }, [playing, compiled, mix, muted, draw, setTime, onTime]);

  useEffect(() => {
    const onKey = (e) => { if (e.code === "Space" && !e.target.closest?.("textarea, input, select, button")) { e.preventDefault(); setPlaying((p) => !p); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);

  const dur = compiled.duration, target = compiled.story.duration;
  const off = dur - target;
  return (
    <section className="stage" ref={wrapRef}>
      <div className="canvas-wrap">
        <canvas ref={canvasRef} width={PREVIEW_W} height={PREVIEW_H} onClick={() => setPlaying((p) => !p)} />
        {!playing && <button className="big-play" onClick={() => setPlaying(true)} aria-label="Play"><Icon name="play" size={34} /></button>}
      </div>
      <div className="transport">
        <button className="icon-btn round" onClick={() => setPlaying((p) => !p)} title="Play / pause (Space)"><Icon name={playing ? "pause" : "play"} size={18} /></button>
        <div className="scrub">
          <input type="range" min={0} max={dur} step={0.01} value={Math.min(t, dur)} onChange={(e) => { setPlaying(false); setTime(Number(e.target.value)); }} />
          <div className="marks">{compiled.items.map((it) => <i key={it.msg.id} style={{ left: `${(it.tAppear / dur) * 100}%` }} className={it.msg.effect ? "fx" : it.side} />)}</div>
        </div>
        <span className="time">{fmtTime(t)} / {fmtTime(dur)}</span>
        <button className="icon-btn" onClick={() => setMuted((m) => !m)} title={muted ? "Unmute" : "Mute"}><Icon name={muted ? "mute" : "speaker"} /></button>
        <button className="icon-btn" title="Fullscreen preview" onClick={() => wrapRef.current?.querySelector(".canvas-wrap")?.requestFullscreen?.()}><Icon name="film" /></button>
      </div>
      <div className="stage-notes">
        <span>Target {fmtTime(target)} · actual {fmtTime(dur)}{Math.abs(off) > 4 ? (off > 0 ? " (longer: trim messages or raise pace)" : " (shorter: add messages)") : ""}</span>
        {narrationOn && !serverOnline && <span className="warn">Narration needs the Studio server (npm run dev). The preview plays music and effects only.</span>}
        {voiceJob?.total > 0 && !voiceJob.error && <span>Generating voices {voiceJob.done}/{voiceJob.total}…</span>}
        {voiceJob?.error && <span className="warn">{voiceJob.error}</span>}
        {!mix && <span>Mixing audio…</span>}
      </div>
    </section>
  );
}
