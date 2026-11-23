// Exports a story as a 1080 x 1920 video, entirely in the browser:
// every frame is drawn by the same renderer as the preview, encoded with WebCodecs, and muxed into an MP4.
//  - Best case (Chrome/Edge on Windows/macOS, Safari): H.264 video + AAC audio, ready for TikTok/Reels/Shorts.
//  - Linux Chromium has no AAC encoder: the MP4 is written with Opus audio, then the Studio server
//    converts the audio to AAC with ffmpeg (video is copied, not re-encoded).
//  - No H.264 encoder at all (e.g. some Firefox builds): VP9 WebM, which the server converts to MP4.
import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4Target } from "mp4-muxer";
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmTarget } from "webm-muxer";
import { createRenderer, W, H } from "./renderer.js";

const FPS = 30;

export async function exportCapabilities() {
  if (typeof VideoEncoder === "undefined") return { webcodecs: false };
  const v = async (codec) => { try { return (await VideoEncoder.isConfigSupported({ codec, width: W, height: H, bitrate: 10e6, framerate: FPS })).supported; } catch { return false; } };
  const a = async (codec) => { try { return (await AudioEncoder.isConfigSupported({ codec, sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 })).supported; } catch { return false; } };
  const avc = (await v("avc1.640028")) ? "avc1.640028" : (await v("avc1.4d0028")) ? "avc1.4d0028" : (await v("avc1.42e028")) ? "avc1.42e028" : null;
  return { webcodecs: true, avc, vp9: await v("vp09.00.40.08"), aac: await a("mp4a.40.2"), opus: await a("opus") };
}

// onProgress({ phase, done, total }) ; returns { blob, type, notes }
export async function exportVideo(compiled, mix, { onProgress = () => {}, signal, serverFfmpeg = false } = {}) {
  const caps = await exportCapabilities();
  if (!caps.webcodecs) throw new Error("This browser can't encode video (WebCodecs is missing). Use a recent Chrome, Edge or Safari.");
  const useMp4 = !!caps.avc;
  const audioCodec = useMp4 ? (caps.aac ? "aac" : caps.opus ? "opus" : null) : caps.opus ? "opus" : null;
  const notes = [];
  if (!audioCodec) notes.push("This browser can't encode audio, so the video is silent.");

  const target = useMp4 ? new Mp4Target() : new WebmTarget();
  const muxer = useMp4
    ? new Mp4Muxer({ target, video: { codec: "avc", width: W, height: H, frameRate: FPS }, audio: audioCodec ? { codec: audioCodec, numberOfChannels: 2, sampleRate: 48000 } : undefined, fastStart: "in-memory" })
    : new WebmMuxer({ target, video: { codec: "V_VP9", width: W, height: H, frameRate: FPS }, audio: audioCodec ? { codec: "A_OPUS", numberOfChannels: 2, sampleRate: 48000 } : undefined });

  let failure = null;
  const venc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => (failure = e) });
  venc.configure({ codec: useMp4 ? caps.avc : "vp09.00.40.08", width: W, height: H, bitrate: 9_000_000, framerate: FPS, latencyMode: "quality", ...(useMp4 ? { avc: { format: "avc" } } : {}) });

  // audio first (it's quick): AudioBuffer -> AudioData chunks
  if (audioCodec && mix) {
    const aenc = new AudioEncoder({ output: (chunk, meta) => muxer.addAudioChunk(chunk, meta), error: (e) => (failure = e) });
    aenc.configure({ codec: audioCodec === "aac" ? "mp4a.40.2" : "opus", sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 });
    const L = mix.getChannelData(0), R = mix.numberOfChannels > 1 ? mix.getChannelData(1) : L;
    const total = Math.min(mix.length, Math.round(compiled.duration * 48000)), step = 4800;
    for (let i = 0; i < total; i += step) {
      const n = Math.min(step, total - i), planar = new Float32Array(n * 2);
      planar.set(L.subarray(i, i + n), 0); planar.set(R.subarray(i, i + n), n);
      const data = new AudioData({ format: "f32-planar", sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((i / 48000) * 1e6), data: planar });
      aenc.encode(data); data.close();
    }
    await aenc.flush(); aenc.close();
  }

  // video: draw each frame, hand it to the encoder, wait when the encoder queue fills up
  const canvas = new OffscreenCanvas(W, H), ctx = canvas.getContext("2d", { alpha: false });
  const renderer = createRenderer();
  await renderer.preload(compiled);
  const frames = Math.ceil(compiled.duration * FPS);
  const t0 = performance.now();
  for (let i = 0; i < frames; i++) {
    if (signal?.aborted) { venc.close(); throw new DOMException("Export cancelled", "AbortError"); }
    if (failure) throw failure;
    renderer.draw(ctx, compiled, i / FPS);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    venc.encode(frame, { keyFrame: i % (FPS * 2) === 0 }); frame.close();
    while (venc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 2));
    if (i % 10 === 0) { const el = (performance.now() - t0) / 1000; onProgress({ phase: "Rendering frames", done: i, total: frames, eta: (el / Math.max(1, i)) * (frames - i) }); await new Promise((r) => setTimeout(r, 0)); }
  }
  await venc.flush(); venc.close();
  if (failure) throw failure;
  muxer.finalize();
  let blob = new Blob([target.buffer], { type: useMp4 ? "video/mp4" : "video/webm" });

  // make it upload-ready: AAC audio in MP4
  if (useMp4 && audioCodec === "opus") {
    if (serverFfmpeg) { onProgress({ phase: "Converting audio to AAC", done: frames, total: frames }); blob = await serverConvert("/api/remux", blob); }
    else notes.push("Audio is Opus because this browser has no AAC encoder. It plays in Chrome/VLC; start the Studio server to get AAC for every app.");
  }
  if (!useMp4) {
    if (serverFfmpeg) { onProgress({ phase: "Converting WebM to MP4", done: frames, total: frames }); blob = await serverConvert("/api/transcode", blob); }
    else notes.push("This browser can't encode H.264, so you got a WebM. Start the Studio server to get an MP4.");
  }
  return { blob, type: blob.type, ext: blob.type === "video/mp4" ? "mp4" : "webm", notes, seconds: (performance.now() - t0) / 1000 };
}

async function serverConvert(url, blob) {
  const r = await fetch(url, { method: "POST", body: blob, headers: { "Content-Type": "application/octet-stream" } });
  if (!r.ok) { let m = `conversion failed (${r.status})`; try { m = (await r.json()).error; } catch { /* not json */ } throw new Error(m); }
  return new Blob([await r.arrayBuffer()], { type: "video/mp4" });
}
