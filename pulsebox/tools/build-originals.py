"""Builds the Pulsebox Originals: src/originals/{shell.html, style.css, catalog.js, engine.js, games/<id>.js}
-> public/games/<id>.html, one self-contained page per game (no shared files, so they work in every deploy mode).
Run from anywhere: python3 tools/build-originals.py [game-id ...]"""
import glob, json, os, re, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, 'src', 'originals')
rd = lambda *p: open(os.path.join(SRC, *p), encoding='utf-8').read()
shell, css, catalog, engine = rd('shell.html'), rd('style.css'), rd('catalog.js'), rd('engine.js')
only = set(sys.argv[1:])
for path in sorted(glob.glob(os.path.join(SRC, 'games', '*.js'))):
    gid = os.path.basename(path)[:-3]
    if only and gid not in only: continue
    m = re.search(r"\{id:'%s',title:'([^']+)',genre:'([^']+)',color:'([^']+)',desc:'((?:[^'\\]|\\.)*)'" % re.escape(gid), catalog)
    assert m, 'no catalog entry for ' + gid
    title, genre, color, desc = m.groups()
    js = catalog + '\n' + engine + '\nconst GAMES = {};\n' + open(path, encoding='utf-8').read() + '\nreset(); saveBest(0); fit(); requestAnimationFrame(frame);\n'
    html = shell
    for k, v in {'TITLE': title, 'GENRE': genre, 'COLOR': color, 'DESC': desc.replace('\\', ''), 'ID': gid}.items(): html = html.replace('{{%s}}' % k, v)
    html = html.replace('{{CSS}}', css).replace('{{JS}}', js)
    out = os.path.join(HERE, 'public', 'games', gid + '.html')
    open(out, 'w', encoding='utf-8').write(html)
    print(gid, len(html.encode()), 'bytes')
