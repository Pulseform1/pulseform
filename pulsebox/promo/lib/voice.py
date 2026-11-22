# Voiceover + captions for one video.  python voice.py VIDEO_DIR
# Reads VIDEO_DIR/video.json, makes each line with Kokoro (free, local), times every word with Whisper,
# lays the lines on the clock, and writes VIDEO_DIR/timeline.json and timeline.js.
# video.json: {"voice": "af_sky+bf_emma", "start": 0.15, "tail": 3, "hot": [...],
#              "lines": [{"say": "spoken text", "cap": "caption text (optional)", "gap": 0.3, "speed": 1.15}]}
import sys, os, json, re, hashlib, subprocess, numpy as np, soundfile as sf
D = sys.argv[1]; cfg = json.load(open(f"{D}/video.json"))
MODEL = os.environ.get("KOKORO_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "kmodel"))
voice = cfg.get("voice", "af_sky+bf_emma"); os.makedirs(f"{D}/vo", exist_ok=True)
k = None; wm = None
def kokoro():
    global k
    if k is None:
        from kokoro_onnx import Kokoro
        k = Kokoro(f"{MODEL}/kokoro-v1.0.onnx", f"{MODEL}/voices-v1.0.bin")
    return k
def style():
    if "+" in voice: a, b = voice.split("+"); return kokoro().get_voice_style(a) * .5 + kokoro().get_voice_style(b) * .5
    return voice
def whisper():
    global wm
    if wm is None:
        from faster_whisper import WhisperModel
        wm = WhisperModel("base.en", device="cpu", compute_type="int8")
    return wm
lines, caps, t = [], [], cfg.get("start", 0.15)
HOT = set(cfg.get("hot", []))
for i, L in enumerate(cfg["lines"], 1):
    say, speed = L["say"], L.get("speed", 1.15)
    h = hashlib.md5(f"{voice}|{say}|{speed}".encode()).hexdigest()[:10]; f = f"{D}/vo/{i:02d}-{h}.wav"
    if not os.path.exists(f):
        a, sr = kokoro().create(say, voice=style(), speed=speed, lang="en-us"); sf.write(f, a, sr)
    a, sr = sf.read(f, dtype="float32"); dur = len(a) / sr
    wj = f[:-4] + ".words.json"
    if not os.path.exists(wj):
        a16 = np.interp(np.arange(0, len(a), sr / 16000), np.arange(len(a)), a).astype("float32")
        segs, _ = whisper().transcribe(a16, word_timestamps=True, language="en")
        json.dump([[w.word.strip(), w.start, w.end] for s in segs for w in s.words], open(wj, "w"))
    ws = json.load(open(wj))
    t += L.get("gap", 0.3) if i > 1 else 0
    at = t; t += dur
    lines.append({"n": i, "at": round(at, 3), "dur": round(dur, 3), "file": f, "say": say})
    toks = (L.get("cap") or say).split()
    if not ws: ws = [["", 0.05, dur - .05]]
    if len(toks) == len(ws): times = [(w[1], w[2]) for w in ws]
    else:   # spread caption words over the spoken span, weighted by length
        s0, e0 = ws[0][1], ws[-1][2]; wt = np.cumsum([0] + [len(x) + 2 for x in toks]); wt = wt / wt[-1]
        times = [(s0 + (e0 - s0) * wt[j], s0 + (e0 - s0) * wt[j + 1]) for j in range(len(toks))]
    chunk = []
    for j, (tok, (s, e)) in enumerate(zip(toks, times)):
        chunk.append((tok, s + at, e + at))
        if len(chunk) == 3 or re.search(r"[.,?!:]$", tok) or j == len(toks) - 1:
            caps.append({"line": i, "words": [{"w": x[0], "t": round(x[1], 3), "hot": x[0].strip(".,?!:'\"") in HOT} for x in chunk],
                         "start": round(chunk[0][1], 3), "end": round(chunk[-1][2] + .12, 3)}); chunk = []
for a_, b_ in zip(caps, caps[1:]):
    if b_["start"] - a_["end"] < .45: a_["end"] = b_["start"]
END = round(t + cfg.get("tail", 3.0), 2)
TLd = {"end": END, "fps": 30, "lines": lines, "caps": caps, "code": cfg.get("code", [])}
json.dump(TLd, open(f"{D}/timeline.json", "w"), indent=1)
open(f"{D}/timeline.js", "w").write("window.TIMELINE = " + json.dumps(TLd) + ";\n")
for l in lines: print(f'{l["n"]:2d} {l["at"]:6.2f} +{l["dur"]:.2f}  {l["say"]}')
print("end", END)
