// The film: timeline from the voice lines, 3D sets rendered with Three.js, a 2D overlay on top,
// and an exporter that encodes every frame (WebCodecs H.264) and the mixed soundtrack (WAV).
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { drawOverlay, captionWords } from "./overlay.js";
import { makeShots } from "./shots.js";
import { renderAudio, toWav } from "./audio.js";

const W = 1080, H = 1920, FPS = 30;
export const RATE = { G: 0.9, C: 0.93 };   // the 78th game and the copy are pitched down (and so take longer)

async function boot() {
  await Promise.all(["900 40px Inter", "700 40px 'Chakra Petch'", "400 40px 'Luckiest Guy'", "600 40px Inter"].map((f) => document.fonts.load(f)));
  const script = await (await fetch("./script.json")).json();
  // ---- timeline
  let t = 0.15;
  script.lines.forEach((l, i) => { if (i) t += l.gap || 0; l.t = t; l.rate = RATE[l.who] || 1; l.edur = l.dur / l.rate; t += l.edur; });
  script.lines.forEach((l) => (l.words = captionWords(l)));
  const duration = t + 1.1;
  const shots = [];
  script.lines.forEach((l, i) => {
    const prev = script.lines[i - 1];
    if (!prev || prev.shot !== l.shot) shots.push({ id: l.shot, t0: prev ? prev.t + prev.edur : 0, lines: [] });
    shots[shots.length - 1].lines.push(l);
  });
  shots.forEach((s, i) => { s.t1 = shots[i + 1] ? shots[i + 1].t0 : duration; s.dur = s.t1 - s.t0; s.lead = s.lines[0].t - s.t0; s.L = (id) => { const l = s.lines.find((x) => x.id === id); return l ? l.t - s.t0 : 0; }; s.E = (id) => { const l = s.lines.find((x) => x.id === id); return l ? l.t + l.edur - s.t0 : 0; }; });
  const tl = { lines: script.lines, shots, duration };

  // ---- renderer
  const out = document.getElementById("out"), g = out.getContext("2d");
  const glCanvas = document.createElement("canvas"); glCanvas.width = W; glCanvas.height = H;
  const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1;
  const composer = new EffectComposer(renderer); composer.setSize(W, H);
  const rp = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera()); composer.addPass(rp);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.8, 0.5, 0.6); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const route = makeShots(renderer, tl);

  function frame(time) {
    const shot = shots.find((s) => time >= s.t0 && time < s.t1) || shots[shots.length - 1];
    const r = route(shot, time - shot.t0, time);
    rp.scene = r.set.scene; rp.camera = r.set.camera;
    const b = { ...r.set.bloom, ...(r.bloom || {}) }; bloom.strength = window.noBloom ? 0 : b.strength * 0.55; bloom.radius = b.radius * 0.8; bloom.threshold = Math.max(0.85, b.threshold);
    renderer.toneMappingExposure = (r.exposure ?? r.set.exposure ?? 1) * 0.94;
    composer.render();
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (r.fx?.chroma) {   // a glitchy colour split
      const d = r.fx.chroma * 18; g.globalCompositeOperation = "source-over"; g.drawImage(glCanvas, 0, 0);
      g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.5; g.drawImage(glCanvas, d, 0); g.drawImage(glCanvas, -d, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    } else g.drawImage(glCanvas, 0, 0);
    if (!window.noOverlay) drawOverlay(g, tl, time, r.fx || {}, r.state || {});
  }

  async function exportVideo(onProgress = () => {}) {
    const target = new ArrayBufferTarget();
    const muxer = new Muxer({ target, video: { codec: "avc", width: W, height: H, frameRate: FPS }, fastStart: "in-memory" });
    let err = null;
    const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => (err = e) });
    enc.configure({ codec: "avc1.640028", width: W, height: H, bitrate: 16_000_000, framerate: FPS, latencyMode: "quality", avc: { format: "avc" } });
    const n = Math.ceil(duration * FPS), t0 = performance.now();
    for (let i = 0; i < n; i++) {
      if (err) throw err;
      frame(i / FPS);
      const vf = new VideoFrame(out, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
      enc.encode(vf, { keyFrame: i % (FPS * 2) === 0 }); vf.close();
      while (enc.encodeQueueSize > 4) await new Promise((res) => setTimeout(res, 1));
      if (i % 30 === 0) { onProgress(i, n, (performance.now() - t0) / 1000); await new Promise((res) => setTimeout(res, 0)); }
    }
    await enc.flush(); muxer.finalize();
    return new Blob([target.buffer], { type: "video/mp4" });
  }
  async function exportAudio() { const buf = await renderAudio(tl); return new Blob([toWav(buf)], { type: "audio/wav" }); }
  const download = (blob, name) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); };

  window.film = { tl, duration, frame, sets: route.sets, exportVideo, exportAudio, download, info: () => shots.map((s) => `${s.id} ${s.t0.toFixed(2)}-${s.t1.toFixed(2)}`) };
  window.ready = true;
}
boot().catch((e) => { console.error(e); window.bootError = String(e && e.stack || e); });
