"""Builds public/games/cluck-launch-2.html (the page the site serves) from public/games/cluck-launch.html.
Cluck Launch 2 keeps the first game's flight model, art and sound, and changes the goal: launch Pepper (a black
hen) all the way round a 40,075 m world, through themed regions, smashing obstacles for cash.
Run: python3 tools/cluck2/fork.py   (then node tools/cluck2/balance.mjs to check the economy)"""
import os, re, sys
HERE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(HERE, 'public/games/cluck-launch.html'), encoding='utf-8').read()
s = src
def rep(a, b, n=1):
    global s
    c = s.count(a)
    if c != n: raise SystemExit(f'expected {n} of: {a[:90]!r}, found {c}')
    s = s.replace(a, b)
def rex(pat, b, n=1):
    global s
    s2, c = re.subn(pat, b, s, flags=re.S)
    if c != n: raise SystemExit(f'expected {n} of /{pat[:80]}/, found {c}')
    s = s2
exec(open(os.path.join(os.path.dirname(__file__), 'edits.py'), encoding='utf-8').read())
out = os.path.join(HERE, 'public/games/cluck-launch-2.html')
open(out, 'w', encoding='utf-8').write(s); print('wrote', out, len(s.encode()), 'bytes')
