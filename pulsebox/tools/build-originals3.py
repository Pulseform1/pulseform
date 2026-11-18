"""Builds the stand-alone original (Nibbleborough):
src/originals3/<id>.html + fit.css + fit.js -> public/games/<id>.html.
The source pages are complete games on their own; this step fits them to the Pulsebox frame (no page scrolling,
the side panel as a drawer on small screens, touch buttons on the game) and drops the link back to their own index.
Run from anywhere: python3 tools/build-originals3.py"""
import os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, 'src', 'originals3')
rd = lambda n: open(os.path.join(SRC, n), encoding='utf-8').read()
css, js = rd('fit.css'), rd('fit.js')
DOCK = {'nibbleborough': ['pulse']}   # Bricktide Salvage and Tetherpost Express were rebuilt as kit games (src/games/)
for gid, dock in DOCK.items():
    h = rd(gid + '.html')
    back = '<a class="back" href="../index.html">← All three games</a>'
    assert h.count(back) == 1 and h.count('</head>') == 1 and h.count('</body>') == 1, gid
    h = h.replace(back, '')
    h = h.replace('content="width=device-width,initial-scale=1"', 'content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"')
    h = h.replace(' — Pulsebox Original</title>', '</title>')
    h = h.replace('</head>', '<style>\n' + css + '</style></head>')
    h = h.replace('</body>', '<script>\nconst GAME_ID = %r, DOCK = %r;\n%s</script></body>' % (gid, dock, js))
    open(os.path.join(HERE, 'public', 'games', gid + '.html'), 'w', encoding='utf-8').write(h)
    print(gid, len(h.encode()), 'bytes')
