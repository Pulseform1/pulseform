"""Builds the kit-based games: src/games/<id>.js + src/kit.js + src/kit.css -> public/games/<id>.html (one file each).
Run from anywhere: python3 tools/build-games.py"""
import glob, os, re, urllib.parse

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = lambda *p: open(os.path.join(HERE, 'src', *p), encoding='utf-8').read()
kit_js, kit_css = src('kit.js'), src('kit.css')
for path in sorted(glob.glob(os.path.join(HERE, 'src', 'games', '*.js'))):
    gid = os.path.splitext(os.path.basename(path))[0]
    js = open(path, encoding='utf-8').read()
    title = re.search(r"title: '([^']+)'", js).group(1)
    font = re.search(r"font: '([^']+)'", js).group(1)
    fam = urllib.parse.quote_plus(font)
    html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={fam}&family=Nunito:wght@600;700;800;900&display=swap">
<style>
{kit_css}</style>
</head>
<body>
<canvas id="cv"></canvas>
<script>
const W = 1280, H = 720;  // the game world; the kit scales it to fit the screen
{js}
{kit_js}</script>
</body>
</html>
'''
    out = os.path.join(HERE, 'public', 'games', gid + '.html')
    open(out, 'w', encoding='utf-8').write(html)
    print(gid, len(html.encode()), 'bytes')
