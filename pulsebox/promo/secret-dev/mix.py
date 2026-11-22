# Music + sound effects + voiceover, all synthesized here (no samples) -> mix.wav
import json, re, numpy as np, soundfile as sf
SR = 44100; TL = json.load(open("timeline.json")); END = TL["end"]; N = int(END * SR)
rng = np.random.default_rng(7)
def word(line, pat):
    for c in TL["caps"]:
        if c["line"] == line:
            for w in c["words"]:
                if re.search(pat, w["w"]): return w["t"]
tWait, tPB, t77 = word(9, r"^Wait"), word(9, r"PULSEBOX"), word(7, r"^77")
tFree, tNoDl, tNew, t78 = word(10, r"^free"), word(10, r"^No"), word(10, r"^New"), word(11, r"^78")
cuts = [1.8, 3.9, 5.75, 9.6, word(5, "TURBO") - .25, word(6, "ghost") - .12, word(6, "tower") - .12, word(6, "^raft") - .12, word(6, "shooter") - .12, 17.55, 20.8, 28.9, 34.1, 37.55]
def env(n, a, d): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
from scipy.signal import lfilter
def lp(x, k):  # one-pole low-pass, k in 0..1 (bigger = brighter)
    return lfilter([k], [1, k - 1], x)
def put(buf, x, t, g=1.0):
    i = int(t * SR); j = min(len(buf), i + len(x))
    if i < len(buf) and j > i: buf[i:j] += x[: j - i] * g
noise = lambda n: rng.standard_normal(n)
# ---------- instruments ----------
def kick(): n = int(.35 * SR); t = np.arange(n) / SR; f = 45 + 90 * np.exp(-t * 28); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
def snare(): n = int(.22 * SR); t = np.arange(n) / SR; x = noise(n); x = x - lp(x, .15); return (x * .7 + np.sin(2 * np.pi * 190 * t) * .5) * np.exp(-t * 18)
def hat(o=False): n = int((.12 if o else .04) * SR); x = noise(n); x = x - lp(x, .5); return x * env(n, .001, .05 if o else .012) * .5
def pluck(f, d=.35): n = int(d * SR); t = np.arange(n) / SR; x = np.sign(np.sin(2 * np.pi * f * t)) * .5 + np.sin(2 * np.pi * f * 2 * t) * .3; return lp(x, .25) * env(n, .003, .12)
def bassn(f, d): n = int(d * SR); t = np.arange(n) / SR; x = 2 * ((f * t) % 1) - 1; return lp(x, .05) * np.minimum(1, t / .01) * np.exp(-t * 1.8)
def pad(fs, d): n = int(d * SR); t = np.arange(n) / SR; x = sum(2 * ((f * k * t) % 1) - 1 for f in fs for k in (1, 1.004)); return lp(x / len(fs), .02) * np.minimum(1, t / .3) * np.minimum(1, (d - t) / .3)
BPM = 100; BEAT = 60 / BPM; BAR = 4 * BEAT
CH = [(110, [220, 261.6, 329.6]), (87.31, [174.6, 220, 261.6]), (130.8, [261.6, 329.6, 392]), (98, [196, 246.9, 293.7])]
music = np.zeros(N); drums = np.zeros(N)
def section(t0, t1, hard):
    b = 0; t = t0
    while t < t1 - .01:
        root, notes = CH[b % 4]
        put(music, pad(notes, BAR), t, .10 if not hard else .08)
        for k in range(4):
            bt = t + k * BEAT
            if bt >= t1: break
            put(drums, kick(), bt, .9 if (hard or k % 2 == 0) else 0)
            if k % 2 == 1: put(drums, snare(), bt, .45 if hard else .3)
            for h in range(2 if not hard else 4): put(drums, hat(), bt + h * BEAT / (2 if not hard else 4), .35)
            put(music, bassn(root, BEAT * .95), bt, .35 if hard else .25)
            if hard:
                for a in range(2): put(music, pluck(notes[(k * 2 + a) % 3] * 2, .3), bt + a * BEAT / 2, .12)
        b += 1; t += BAR
section(0.0, tWait, False)
# tape-stop at "Wait": pitch the last bit down, then silence until the drop
section(tPB, 37.55, True)
section(37.55, END, True)
mus = music + drums
i0 = int(tWait * SR); seg = mus[i0 - int(.5 * SR): i0].copy(); idx = np.cumsum(np.linspace(1, .15, len(seg))); idx = idx[idx < len(seg)].astype(int)
mus[i0 - int(.5 * SR): i0] = 0; put(mus, seg[idx] * np.linspace(1, 0, len(idx)), tWait - .5)
mus[i0: int(tPB * SR)] *= 0
# a soft heartbeat + ticking clock under the reveal pause
for k in range(int((tPB - tWait - .6) / .55)): put(mus, kick() * .5, tWait + .5 + k * .55, .5)
mus[int((END - 1.5) * SR):] *= np.linspace(1, 0, N - int((END - 1.5) * SR))
# ---------- sound effects ----------
fx = np.zeros(N)
def sweep(x, k):  # low-pass with a moving cutoff
    y = np.zeros(len(x)); a = 0.0
    for i in range(len(x)): a += k[i] * (x[i] - a); y[i] = a
    return y
def whoosh(d=.35):
    n = int(d * SR); t = np.arange(n) / SR
    return sweep(noise(n), np.linspace(.02, .4, n)) * np.sin(np.pi * t / d) ** 2 * 1.4
def thud(): n = int(.5 * SR); t = np.arange(n) / SR; f = 40 + 60 * np.exp(-t * 20); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) + lp(noise(n), .1) * np.exp(-t * 25) * .8
def bonk(): n = int(.3 * SR); t = np.arange(n) / SR; f = 520 * np.exp(-t * 9) + 140; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 10)
def click(): n = int(.03 * SR); x = noise(n); x = x - lp(x, .3); return x * env(n, .0005, .006)
def scratch(): n = int(.55 * SR); t = np.arange(n) / SR; x = lp(noise(n), .2); m = np.sin(2 * np.pi * (5 + 9 * t) * t); return x * (np.abs(m) ** .5) * np.exp(-t * 2) * 2.2
def riser(d):
    n = int(d * SR); t = np.arange(n) / SR
    return sweep(noise(n), np.linspace(.01, .5, n)) * (t / d) ** 2 * 1.2
def sting(): n = int(.5 * SR); t = np.arange(n) / SR; return sum(np.sin(2 * np.pi * f * t) for f in (466, 554, 659)) / 3 * np.exp(-t * 5)
def popfx(): n = int(.12 * SR); t = np.arange(n) / SR; f = 300 + 900 * t / .12; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30)
for c in cuts: put(fx, whoosh(), c - .15, .55)
put(fx, sting(), 2.05, .35); put(fx, thud(), 2.55, .9)
for a, b in [(3.95, 5.6), (6.0, 8.3), (9.6, 11.2), (34.6, 35.5)]:
    t = a
    while t < b: put(fx, click(), t, .5 + rng.random() * .3); t += .055 + rng.random() * .06
k = 0
while 5.75 + .55 + k < 9.6: put(fx, bonk(), 5.75 + .55 + k, .45); k += 1.0
for t in (t77, tFree, tNoDl, tNew): put(fx, thud(), t, .8 if t == t77 else .55)
put(fx, scratch(), tWait - .02, .9)
put(fx, riser(tPB - word(9, r"^real") ), word(9, r"^real"), .5); put(fx, thud(), tPB, 1.0)
for t in (34.7, 35.0): put(fx, click() * 3, t, .8)
put(fx, popfx(), 37.6, .5); put(fx, popfx(), 37.95, .5); put(fx, popfx(), t78, .5)
# ---------- voiceover ----------
vo = np.zeros(N)
for l in TL["lines"]:
    a, sr = sf.read(l["file"], dtype="float32")
    a = np.interp(np.arange(0, len(a), sr / SR), np.arange(len(a)), a)
    put(vo, a / (np.abs(a).max() + 1e-6) * .9, l["at"])
# duck music under the voice
e = np.abs(vo); win = int(.15 * SR); e = np.convolve(e, np.ones(win) / win, "same"); duck = 1 - .55 * np.clip(e / .08, 0, 1)
mixd = mus * .55 * duck + fx * .5 + vo * 1.0
mixd = np.tanh(mixd * 1.1) / np.tanh(1.1)
mixd = mixd / np.abs(mixd).max() * .92
sf.write("mix.wav", mixd.astype(np.float32), SR)
print("mix ok", round(len(mixd) / SR, 2), "s; wait", tWait, "drop", tPB)
