# Word timings for each voiceover line (faster-whisper), written to vo/<voice>/words.json
import sys, json, glob, os, numpy as np, soundfile as sf
from faster_whisper import WhisperModel
voice = sys.argv[1]
m = WhisperModel("base.en", device="cpu", compute_type="int8")
out = {}
for f in sorted(glob.glob(f"vo/{voice}/[0-9]*.wav")):
    a, sr = sf.read(f, dtype='float32'); a = np.interp(np.arange(0, len(a), sr/16000), np.arange(len(a)), a).astype('float32')
    segs, _ = m.transcribe(a, word_timestamps=True, language="en")
    out[os.path.basename(f)[:2]] = [[w.word.strip(), round(w.start,3), round(w.end,3)] for s in segs for w in s.words]
json.dump(out, open(f"vo/{voice}/words.json","w"), indent=0)
for k,v in out.items(): print(k, " ".join(w[0] for w in v))
