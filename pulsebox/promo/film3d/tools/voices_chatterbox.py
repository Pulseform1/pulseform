"""Voice a film with Chatterbox (MIT, Resemble AI): natural, expressive speech that runs on a CPU.

    python tools/voices_chatterbox.py <film> [id ...]        (no ids = every line)

Each speaker in public/films/<film>/script.json names a reference clip in voices/refs/ (short clips made with
Kokoro's built-in voices, so no real person's voice is copied) plus exaggeration / cfg weight; a line's `mood`
can override those. Every take is trimmed, transcribed with faster-whisper and compared with the script; a take
that doesn't match is redone with a new seed (best of 4 kept). Writes public/films/<film>/vo/<id>.wav (24 kHz) and
stores each line's length in `dur`. Chatterbox adds its inaudible Perth watermark to everything it generates.

Setup (CPU):  uv venv -p 3.11 .venv-tts && . .venv-tts/bin/activate
              uv pip install torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cpu
              uv pip install chatterbox-tts==0.1.7 faster-whisper "setuptools<81"
"""
import difflib, json, re, sys, warnings
from pathlib import Path
warnings.filterwarnings("ignore")
import numpy as np, torch, torchaudio as ta
from chatterbox.tts import ChatterboxTTS
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parent.parent
film, only = sys.argv[1], set(sys.argv[2:])
fdir = ROOT / "public" / "films" / film; spath = fdir / "script.json"; (fdir / "vo").mkdir(parents=True, exist_ok=True)
script = json.loads(spath.read_text())
torch.set_num_threads(4)
tts = ChatterboxTTS.from_pretrained(device="cpu"); asr = WhisperModel("base.en", device="cpu", compute_type="int8")

NUM = {"seventy-seven": "77", "seventy seven": "77", "fifty-five": "55", "fifty-six": "56", "fifty-seven": "57", "seventeen": "17", "twelve": "12", "ten": "10",
       "forty": "40", "twenty": "20", "one": "1", "two": "2", "three": "3", "four": "4", "five": "5"}
def norm(s):
    s = s.lower().replace("box dot pulseform dot org", "boxpulseformorg").replace("box.pulseform.org", "boxpulseformorg").replace("get away", "getaway")
    s = re.sub(r"(\d)[:.](\d\d)", r"\1 \2", s)   # 4:57 / 3.20 -> 4 57
    s = re.sub(r"\b(a\.?m\.?)\b", "am", s)
    for k, v in NUM.items(): s = re.sub(rf"\b{k}\b", v, s)
    return re.sub(r"[^a-z0-9 ]+", " ", s).split()
def trim(w, sr):   # cut leading/trailing silence, keep a little air, short fades
    db = 20 * np.log10(np.abs(w) + 1e-7); thr = db.max() - 42
    win = int(sr * 0.02); env = np.convolve((db > thr).astype(float), np.ones(win), "same") > 0
    idx = np.where(env)[0]; a, b = max(0, idx[0] - int(sr * 0.05)), min(len(w), idx[-1] + int(sr * 0.12))
    w = w[a:b].copy(); f = int(sr * 0.01); w[:f] *= np.linspace(0, 1, f); w[-f * 3:] *= np.linspace(1, 0, f * 3)
    return w
for line in script["lines"]:
    if only and line["id"] not in only: continue
    v = dict(script["voices"][line["who"]]); v.update(script.get("moods", {}).get(line.get("mood", ""), {}))
    best = None
    for attempt in range(4):
        torch.manual_seed(1000 + attempt * 77 + sum(map(ord, line["id"])))
        wav = tts.generate(line["text"], audio_prompt_path=str(ROOT / "voices" / "refs" / v["ref"]), exaggeration=v["ex"], cfg_weight=v["cfg"])
        w = trim(wav.squeeze(0).numpy(), tts.sr)
        w16 = ta.functional.resample(torch.from_numpy(w), tts.sr, 16000).numpy()
        heard = " ".join(s.text for s in asr.transcribe(w16, beam_size=5, language="en")[0])
        score = difflib.SequenceMatcher(None, norm(line["text"]), norm(heard)).ratio()
        if not best or score > best[0]: best = (score, w, heard)
        print(f"  {line['id']} take {attempt + 1}: {score:.2f}  \"{heard.strip()}\"", flush=True)
        if score >= 0.93: break
    score, w, heard = best
    ta.save(str(fdir / "vo" / f"{line['id']}.wav"), torch.from_numpy(w).unsqueeze(0), tts.sr, encoding="PCM_S", bits_per_sample=16)
    line["dur"] = round(len(w) / tts.sr, 3)
    print(f"{line['id']} {line['who']} {line['dur']:.2f}s match {score:.2f}", flush=True)
    spath.write_text(json.dumps(script, indent=1, ensure_ascii=False) + "\n")
