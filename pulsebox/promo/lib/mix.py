# Music + sound effects + voiceover for one video, all synthesized (no samples).  python mix.py VIDEO_DIR
# Reads VIDEO_DIR/timeline.json and VIDEO_DIR/cues.json (written by render.js from the page's CUES).
import sys, json, numpy as np, soundfile as sf
from scipy.signal import lfilter
D = sys.argv[1]; SR = 44100
TL = json.load(open(f"{D}/timeline.json")); CU = json.load(open(f"{D}/cues.json"))
END = TL["end"]; N = int(END * SR); rng = np.random.default_rng(7)
noise = lambda n: rng.standard_normal(n)
def lp(x, k): return lfilter([k], [1, k - 1], x)
def sweep(x, k):
    y = np.zeros(len(x)); a = 0.0
    for i in range(len(x)): a += k[i] * (x[i] - a); y[i] = a
    return y
def env(n, a, d): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
def put(buf, x, t, g=1.0):
    i = int(t * SR)
    if i < 0: x = x[-i:]; i = 0
    j = min(len(buf), i + len(x))
    if i < len(buf) and j > i: buf[i:j] += x[: j - i] * g
tt = lambda d: np.arange(int(d * SR)) / SR
# ---------- instruments ----------
def kick(): t = tt(.35); f = 45 + 90 * np.exp(-t * 28); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
def snare(): t = tt(.22); x = noise(len(t)); x = x - lp(x, .15); return (x * .7 + np.sin(2 * np.pi * 190 * t) * .5) * np.exp(-t * 18)
def hat(): n = int(.04 * SR); x = noise(n); x = x - lp(x, .5); return x * env(n, .001, .012) * .5
def pluck(f, d=.3): t = tt(d); x = np.sign(np.sin(2 * np.pi * f * t)) * .5 + np.sin(2 * np.pi * f * 2 * t) * .3; return lp(x, .25) * env(len(t), .003, .12)
def bassn(f, d): t = tt(d); x = 2 * ((f * t) % 1) - 1; return lp(x, .05) * np.minimum(1, t / .01) * np.exp(-t * 1.8)
def pad(fs, d): t = tt(d); x = sum(2 * ((f * k * t) % 1) - 1 for f in fs for k in (1, 1.004)); return lp(x / len(fs), .02) * np.minimum(1, t / .3) * np.minimum(1, (d - t) / .3)
KEYS = {"minor": [(110, [220, 261.6, 329.6]), (87.31, [174.6, 220, 261.6]), (130.8, [261.6, 329.6, 392]), (98, [196, 246.9, 293.7])],
        "bright": [(130.8, [261.6, 329.6, 392]), (98, [196, 246.9, 293.7]), (110, [220, 261.6, 329.6]), (87.31, [174.6, 220, 261.6])],
        "dreamy": [(87.31, [174.6, 220, 261.6, 329.6]), (98, [196, 246.9, 293.7, 349.2]), (110, [220, 261.6, 329.6, 392]), (82.4, [164.8, 207.7, 246.9, 329.6])]}
CH = KEYS[CU.get("key", "minor")]; BEAT = 60 / CU.get("bpm", 100); BAR = 4 * BEAT
music = np.zeros(N)
def section(t0, t1, style):
    if style == "tense":
        t = t0
        while t < t1: put(music, kick() * .7, t); put(music, kick() * .45, t + .22); t += .9
        put(music, pad([55, 82.4], t1 - t0) * 1.2, t0, .5); return
    b = 0; t = t0; hard = style == "hard"
    while t < t1 - .01:
        root, notes = CH[b % 4]
        put(music, pad(notes, min(BAR, t1 - t + .3)), t, .1 if not hard else .08)
        for k in range(4):
            bt = t + k * BEAT
            if bt >= t1: break
            if hard or k % 2 == 0: put(music, kick(), bt, .9)
            if k % 2 == 1: put(music, snare(), bt, .45 if hard else .3)
            for h in range(4 if hard else 2): put(music, hat(), bt + h * BEAT / (4 if hard else 2), .35)
            put(music, bassn(root, BEAT * .95), bt, .35 if hard else .25)
            if hard:
                for a in range(2): put(music, pluck(notes[(k * 2 + a) % len(notes)] * 2), bt + a * BEAT / 2, .12)
        b += 1; t += BAR
for a, b, st in CU.get("music", []):
    if st in ("calm", "hard", "tense"):
        section(a, min(b, END), st)
        i, j = int(a * SR), int(min(b, END) * SR); f = int(.03 * SR)   # short fades so cuts never click
        if j - i > 2 * f: music[i:i + f] *= np.linspace(0, 1, f); music[j - f:j] *= np.linspace(1, 0, f)
for a, b, st in CU.get("music", []):
    if st == "tapestop":   # the music in [a, b) slows down to a stop
        i0, i1 = int(a * SR), int(b * SR); seg = music[i0:i1].copy(); idx = np.cumsum(np.linspace(1, .15, len(seg))); idx = idx[idx < len(seg)].astype(int)
        music[i0:i1] = 0; put(music, seg[idx] * np.linspace(1, 0, len(idx)), a)
fo = int(1.5 * SR); music[-fo:] *= np.linspace(1, 0, fo)
# ---------- sound effects ----------
def whoosh(d=.35): t = tt(d); return sweep(noise(len(t)), np.linspace(.02, .4, len(t))) * np.sin(np.pi * t / d) ** 2 * 1.4
def thud(): t = tt(.5); f = 40 + 60 * np.exp(-t * 20); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) + lp(noise(len(t)), .1) * np.exp(-t * 25) * .8
def bonk(): t = tt(.3); f = 520 * np.exp(-t * 9) + 140; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 10)
def click(): n = int(.03 * SR); x = noise(n); x = x - lp(x, .3); return x * env(n, .0005, .006)
def scratch(): t = tt(.55); x = lp(noise(len(t)), .2); m = np.sin(2 * np.pi * (5 + 9 * t) * t); return x * np.abs(m) ** .5 * np.exp(-t * 2) * 2.2
def riser(d): t = tt(d); return sweep(noise(len(t)), np.linspace(.01, .5, len(t))) * (t / d) ** 2 * 1.2
def sting(): t = tt(.5); return sum(np.sin(2 * np.pi * f * t) for f in (466, 554, 659)) / 3 * np.exp(-t * 5)
def pop_(): t = tt(.12); f = 300 + 900 * t / .12; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30)
def ding(): t = tt(.9); return (np.sin(2 * np.pi * 1318 * t) + .6 * np.sin(2 * np.pi * 1976 * t) + .4 * np.sin(2 * np.pi * 2637 * t)) / 2 * np.exp(-t * 4)
def tick(): t = tt(.05); return np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 120)
def buzz(): t = tt(.45); return np.sign(np.sin(2 * np.pi * 110 * t)) * .4 * np.exp(-t * 3)
def bird(): t = tt(.25); f = 2600 + 900 * np.sin(2 * np.pi * 14 * t); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / .25) * .5
def cheer(d=1.6): t = tt(d); x = sweep(noise(len(t)), np.full(len(t), .12)); return x * np.sin(np.pi * t / d) * 1.5
def splash(): t = tt(.6); return sweep(noise(len(t)), np.linspace(.5, .03, len(t))) * np.exp(-t * 5) * 1.5
FX = {"whoosh": whoosh, "thud": thud, "bonk": bonk, "scratch": scratch, "sting": sting, "pop": pop_, "ding": ding, "tick": tick, "buzz": buzz,
      "bird": bird, "cheer": cheer, "splash": splash, "click": click}
fx = np.zeros(N)
for c in CU.get("cuts", []): put(fx, whoosh(), c - .15, .55)
for e in CU.get("fx", []):
    t, name, g = e[0], e[1], (e[2] if len(e) > 2 else 1.0)
    if name == "typing":     # e[3] = duration
        x = t
        while x < t + e[3]: put(fx, click(), x, .5 + rng.random() * .3); x += .055 + rng.random() * .06
    elif name == "ticks":    # clock ticks for e[3] seconds, e[4] = gap
        x = t; gap = e[4] if len(e) > 4 else .09
        while x < t + e[3]: put(fx, tick(), x, g); x += gap
    elif name == "riser": put(fx, riser(e[3]), t, g)
    else: put(fx, FX[name](), t, g)
# ---------- voice ----------
vo = np.zeros(N)
for l in TL["lines"]:
    a, sr = sf.read(l["file"], dtype="float32")
    a = np.interp(np.arange(0, len(a), sr / SR), np.arange(len(a)), a)
    put(vo, a / (np.abs(a).max() + 1e-6) * .9, l["at"])
e = np.abs(vo); w = int(.15 * SR); e = np.convolve(e, np.ones(w) / w, "same"); duck = 1 - .55 * np.clip(e / .08, 0, 1)
mix = music * .55 * duck + fx * .5 + vo
mix = np.tanh(mix * 1.1) / np.tanh(1.1); mix = mix / np.abs(mix).max() * .92
sf.write(f"{D}/mix.wav", mix.astype(np.float32), SR); print("mix", round(END, 2), "s")
