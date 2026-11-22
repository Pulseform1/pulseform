# Free local voiceover with Kokoro (Apache-2.0). Usage: python tts_kokoro.py VOICE [MODEL_DIR]
import sys, os, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
sys.path.insert(0, os.path.dirname(__file__))
from tts import LINES
voice = sys.argv[1]; mdir = sys.argv[2] if len(sys.argv) > 2 else "kmodel"
k = Kokoro(f"{mdir}/kokoro-v1.0.onnx", f"{mdir}/voices-v1.0.bin")
# "a+b" blends two voices 50/50, e.g. af_sky+bf_emma (the voice picked for this video)
style = voice
if "+" in voice:
    a_, b_ = voice.split("+"); style = k.get_voice_style(a_) * 0.5 + k.get_voice_style(b_) * 0.5
out = f"vo/{voice}"; os.makedirs(out, exist_ok=True)
SPEED = {1: 1.0, 9: 1.08}             # slower opener and reveal, the rest brisk
for i, t in enumerate(LINES, 1):
    t = t.replace("...", ",").lstrip(", ")
    a, sr = k.create(t, voice=style, speed=SPEED.get(i, 1.15), lang="en-us")
    sf.write(f"{out}/{i:02d}.wav", a, sr)
print("done", voice)
