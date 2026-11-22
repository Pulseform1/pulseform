import json, urllib.request, os, sys
LINES = [
 "This kid has a secret.",
 "Everyone thinks they're just playing games...",
 "...but they're actually building them.",
 "Their first game? A car that drove into a wall. Forever.",
 "So they fixed it. And it turned into Turbo Laps.",
 "Then a ghost hunt. A tower defence. A survival raft. An arena shooter.",
 "They just... couldn't stop. Seventy-seven games.",
 "Then their friends wanted in. So they added multiplayer.",
 "Wait. You think this is made up? It's real. It's called Pulsebox.",
 "Seventy-seven free games, right in your browser. No download. New ones every week.",
 "And right now, they're building game seventy-eight.",
 "Go play it at box dot pulseform dot org. And comment what they should build next.",
]
INSTR = ("Young, energetic storyteller voice for a viral short video. Fast pace, punchy. "
 "Line 1 is hushed and conspiratorial. 'Wait.' is a sudden dead stop. The Pulsebox reveal is hyped.")
only = None
for i, t in (enumerate(LINES, 1) if __name__ == "__main__" else []):
    if only and i not in only: continue
    body = json.dumps({"model":"gpt-4o-mini-tts","voice":"ash","input":t,"instructions":INSTR,"response_format":"wav","speed":1.08}).encode()
    req = urllib.request.Request("https://api.openai.com/v1/audio/speech", data=body,
        headers={"Content-Type":"application/json","Authorization":"Bearer proxy-injected"})
    open(f"vo/{i:02d}.wav","wb").write(urllib.request.urlopen(req, timeout=120).read())
    print("ok", i)
