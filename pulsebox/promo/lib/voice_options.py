# Sample pack of character voices for Milo and Jay: python voice_options.py OUTDIR
# Every option reads the same four lines so they can be compared by ear. All engines are free and run locally:
# Kokoro (KOKORO_DIR), Piper (PIPER_DIR, voices from huggingface.co/rhasspy/piper-voices), Flite and eSpeak-ng (apt).
import os, sys, subprocess, tempfile, numpy as np, soundfile as sf
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
KDIR = os.environ.get("KOKORO_DIR", os.path.expanduser("~/.cache/kokoro")); PDIR = os.environ.get("PIPER_DIR", os.path.expanduser("~/.cache/piper"))
PIPER = os.path.join(os.path.dirname(sys.executable), "piper")
SR = 24000; tmp = tempfile.mkdtemp()
_k = None
def load(f):
    a, sr = sf.read(f, dtype="float32")
    if a.ndim > 1: a = a.mean(1)
    return np.interp(np.arange(0, len(a), sr / SR), np.arange(len(a)), a).astype("float32")
def kokoro(voice, text, speed=1.05):
    global _k
    if _k is None:
        from kokoro_onnx import Kokoro; _k = Kokoro(f"{KDIR}/kokoro-v1.0.onnx", f"{KDIR}/voices-v1.0.bin")
    st = _k.get_voice_style(voice.split("+")[0]) * .5 + _k.get_voice_style(voice.split("+")[1]) * .5 if "+" in voice else voice
    a, sr = _k.create(text, voice=st, speed=speed, lang="en-us"); f = f"{tmp}/k.wav"; sf.write(f, a, sr); return load(f)
def piper(model, text, scale=1.0):
    f = f"{tmp}/p.wav"; subprocess.run([PIPER, "-m", f"{PDIR}/{model}.onnx", "--length_scale", str(scale), "--output_file", f], input=text.encode(), check=True, capture_output=True); return load(f)
def flite(voice, text):
    f = f"{tmp}/f.wav"; subprocess.run(["flite", "-voice", voice, "-t", text, "-o", f], check=True); return load(f)
def espeak(voice, text, pitch=50, speed=165):
    f = f"{tmp}/e.wav"; subprocess.run(["espeak-ng", "-v", voice, "-p", str(pitch), "-s", str(speed), "-w", f, text], check=True); return load(f)
def fx(a, chain):        # run audio through an ffmpeg filter chain
    i, o = f"{tmp}/fx_in.wav", f"{tmp}/fx_out.wav"; sf.write(i, a, SR)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", i, "-af", chain, "-ar", str(SR), "-ac", "1", o], check=True); return load(o)
ROBOT = "asplit[a][b];[b]aeval='val(0)*sin(2*PI*70*t)'[r];[a][r]amix=inputs=2:weights='0.8 0.6',acrusher=bits=10:mix=0.25,aecho=0.8:0.5:12:0.35,volume=2"
PITCH = lambda semis: f"rubberband=pitch={2 ** (semis / 12):.4f}"
LINES = [("J", "Milo... where are we?"), ("M", "Saint Verity Hospital. My game."), ("J", "Milo. Did you code that?"), ("M", "I don't remember coding that.")]
OPTIONS = [   # name, label read by the narrator, Milo voice, Jay voice
  ("1-classic-tts", "Option one. Classic text to speech.", lambda s: piper("en_US-ryan-medium", s), lambda s: piper("en_US-joe-medium", s)),
  ("2-default-voice", "Option two. The default voice.", lambda s: piper("en_US-lessac-medium", s), lambda s: piper("en_US-amy-medium", s)),
  ("3-old-computer", "Option three. Old computer.", lambda s: flite("kal16", s), lambda s: flite("rms", s)),
  ("4-retro-robot", "Option four. Retro robot.", lambda s: espeak("en-us+m3", s, 40, 160), lambda s: espeak("en-us+m7", s, 75, 170)),
  ("5-game-bots", "Option five. Game bots.", lambda s: fx(kokoro("am_puck", s), ROBOT), lambda s: fx(kokoro("am_echo", s), PITCH(3) + "," + ROBOT)),
  ("6-cartoon", "Option six. Cartoon.", lambda s: fx(kokoro("am_puck", s, 1.1), PITCH(5)), lambda s: fx(kokoro("am_echo", s, 1.1), PITCH(7))),
]
gap = np.zeros(int(SR * .45), dtype="float32")
norm = lambda a: a / (np.abs(a).max() + 1e-6) * .9
for name, label, milo, jay in OPTIONS:
    parts = [norm(kokoro("af_sky+bf_emma", label)), np.zeros(int(SR * .7), dtype="float32")]
    for who, text in LINES: parts += [norm((milo if who == "M" else jay)(text)), gap]
    a = np.concatenate(parts); w = f"{tmp}/{name}.wav"; sf.write(w, a, SR)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", w, "-b:a", "128k", f"{OUT}/voice-{name}.mp3"], check=True); print("ok", name)
