# Lays the voiceover lines on the video clock and builds word-by-word captions -> timeline.json
import json, subprocess, sys, re
VOICE = sys.argv[1] if len(sys.argv) > 1 else "af_sky+bf_emma"
# when each voice line starts (seconds); scenes are keyed to these
VO_AT = [0.15, 1.85, 3.95, 6.0, 9.7, 13.5, 17.7, 20.9, 24.8, 29.1, 34.3, 37.8]
END = 45.0
FIX = {  # whisper spelling -> on-screen spelling (per line)
 "05": [("lapse.", "LAPS!"), ("turbo", "TURBO"), ("in a", "into")],
 "06": [("than", "Then"), ("and arena", "an arena")],
 "09": [("pulse box.", "PULSEBOX.")],
 "10": [("download new", "download. New")],
 "12": [("box.pulseform.org and", "box.pulseform.org, and")]}
HOT = {"secret.", "BUILDING", "building", "forever.", "TURBO", "LAPS!", "ghost", "tower", "raft", "shooter.",
       "77", "multiplayer.", "Wait,", "real.", "PULSEBOX.", "free", "No", "download", "every", "week.", "78.", "box.pulseform.org", "next."}
words = json.load(open(f"vo/{VOICE}/words.json"))
dur = lambda f: float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f]))
lines, caps = [], []
for i, at in enumerate(VO_AT, 1):
    key = f"{i:02d}"; f = f"vo/{VOICE}/{key}.wav"
    ws = [[w, s + at, e + at] for w, s, e in words[key]]
    # merge "box .pulseform .org" into one token
    m = []
    for w in ws:
        if m and w[0].startswith(".") : m[-1][0] += w[0]; m[-1][2] = w[2]
        else: m.append(list(w))
    ws = m
    txt = " ".join(w[0] for w in ws)
    for a, b in FIX.get(key, []): txt = txt.replace(a, b)
    toks = txt.split(" ")
    if len(toks) != len(ws):  # spread evenly if a fix changed the count
        s0, e0 = ws[0][1], ws[-1][2]; n = len(toks)
        ws = [[t, s0 + (e0 - s0) * k / n, s0 + (e0 - s0) * (k + 1) / n] for k, t in enumerate(toks)]
    else:
        for w, t in zip(ws, toks): w[0] = t
    ws[0][0] = ws[0][0][:1].upper() + ws[0][0][1:]
    lines.append({"n": i, "at": at, "dur": round(dur(f), 3), "file": f})
    # captions: chunks of up to 3 words, broken after punctuation
    chunk = []
    for k, w in enumerate(ws):
        chunk.append(w)
        if len(chunk) == 3 or re.search(r"[.,?!]$", w[0]) or k == len(ws) - 1:
            caps.append({"line": i, "words": [{"w": x[0], "t": round(x[1], 3), "hot": x[0] in HOT or x[0].rstrip(",.") in HOT} for x in chunk],
                         "start": round(chunk[0][1], 3), "end": round(chunk[-1][2] + 0.12, 3)})
            chunk = []
for a, b in zip(caps, caps[1:]):  # hold each chunk until the next one starts if the gap is short
    if b["start"] - a["end"] < 0.45: a["end"] = b["start"]
code = [l.rstrip()[:38] for l in open("../../src/games/turbo-laps.js") if l.strip()][18:90]
json.dump({"end": END, "fps": 30, "lines": lines, "caps": caps, "code": code}, open("timeline.json", "w"), indent=1)
for c in caps: print(f'{c["start"]:6.2f}-{c["end"]:6.2f}', " ".join(w["w"] + ("*" if w["hot"] else "") for w in c["words"]))
open("timeline.js", "w").write("window.TIMELINE = " + json.dumps({"end": END, "fps": 30, "lines": lines, "caps": caps, "code": code}) + ";\n")
