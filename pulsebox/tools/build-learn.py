"""Builds the Educational Games: src/learn/ -> public/games/learn.html (the category page) and public/games/learn-<id>.html
(one page per game). Each page is a single file, like every Pulsebox game: the shared CSS, catalog and framework
(src/learn/edu.css, catalog.js, edu.js) are written once in src/ and put into each page, with only the data that game
uses (a game names it on a line like  // @data countries  -> src/learn/data/countries.js).
Run from anywhere: python3 tools/build-learn.py [game-id ...]  (no ids builds every game and the category page)"""
import glob, html, os, re, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L = os.path.join(HERE, 'src', 'learn')
OUT = os.path.join(HERE, 'public', 'games')
read = lambda *p: open(os.path.join(L, *p), encoding='utf-8').read()
css, edu, catalog = read('edu.css'), read('edu.js'), read('catalog.js')
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Barlow:wght@500;600;700;800&display=swap">')
ICON = ("<link rel=\"icon\" type=\"image/svg+xml\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E"
        "%3Crect width='32' height='32' rx='8' fill='%23c6ff3d'/%3E%3Ctext x='16' y='23' font-size='18' text-anchor='middle'%3E%F0%9F%8E%93%3C/text%3E%3C/svg%3E\">")

def slim_css(s):  # comments and runs of whitespace out; nothing else touched
    s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
    return re.sub(r'\s*\n\s*', '\n', s).strip()

def code_end(line):  # where the code on a line ends: before a trailing "  // comment" that is outside every string
    q, i = None, 0
    while i < len(line):
        ch = line[i]
        if q:
            if ch == '\\': i += 2; continue
            if ch == q: q = None
        elif ch in '\'"`': q = ch
        elif line.startswith('  //', i) and (i + 4 >= len(line) or line[i + 4] in ' ('): return i
        i += 1
    return len(line)

def slim_js(s):  # whole-line comments, trailing comments and indentation out; strings and code untouched
    out, block = [], False
    for line in s.split('\n'):
        t = line.strip()
        if block:
            if t.endswith('*/'): block = False
            continue
        if t.startswith('/*'):
            block = not t.endswith('*/'); continue
        if t.startswith('//'): continue
        t = line[:code_end(line)].strip()
        if t: out.append(t)
    return '\n'.join(out)

def page(title, desc, body_js, theme='#0a0c12', extra_css=''):
    for bad in ('</script', '<!--'): assert bad not in body_js.lower(), 'a script may not contain ' + bad
    return ('<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            f'<title>{html.escape(title)}</title>\n<meta name="description" content="{html.escape(desc)}">\n<meta name="theme-color" content="{theme}">\n'
            f'{ICON}\n{FONTS}\n<style>\n{slim_css(css + extra_css)}\n</style>\n<body>\n<div id="app"></div>\n<noscript><p style="padding:20px">These educational games need JavaScript turned on.</p></noscript>\n'
            f'<script>\n{body_js}\n</script>\n</body>\n</html>\n')

cat = {m.group(1): m for m in re.finditer(r"\{ id: '([a-z0-9-]+)', title: '((?:[^'\\]|\\.)*)'", catalog)}
only = set(sys.argv[1:])
sizes = {}
for path in sorted(glob.glob(os.path.join(L, 'games', '*.js'))):
    gid = os.path.splitext(os.path.basename(path))[0]
    if only and gid not in only: continue
    assert gid in cat, f'{gid} is not in src/learn/catalog.js'
    code = open(path, encoding='utf-8').read()
    data = []
    for m in re.finditer(r'^//\s*@data\s+([\w, -]+)$', code, re.M):
        for d in re.split(r'[,\s]+', m.group(1).strip()):
            if d and d not in data: data.append(d)
    js = slim_js('\n'.join([catalog, edu] + [read('data', d + '.js') for d in data] + [code]))
    title = cat[gid].group(2).replace("\\'", "'")
    teaches = re.search(r"id: '" + gid + r"'.*?teaches: '((?:[^'\\]|\\.)*)'", catalog, re.S).group(1).replace("\\'", "'")
    out = page(f'{title} · Educational Games · Pulsebox', f'{title}, a free educational game on Pulsebox. {teaches}', js)
    open(os.path.join(OUT, f'learn-{gid}.html'), 'w', encoding='utf-8').write(out)
    sizes[gid] = len(out.encode())
if not only or 'learn' in only or 'hub' in only:
    out = page('Educational Games · Pulsebox', 'Free educational games on Pulsebox: math, typing, spelling, grammar, vocabulary, flags, capitals, science, space, chemistry, memory, logic, patterns, sudoku and coding.',
               slim_js('\n'.join([catalog, edu, read('hub.js')])), extra_css=read('hub.css'))
    open(os.path.join(OUT, 'learn.html'), 'w', encoding='utf-8').write(out)
    sizes['(category page)'] = len(out.encode())
for k, v in sizes.items(): print(f'  {k:22s} {v / 1024:6.1f} KB')
total = sum(os.path.getsize(p) for p in glob.glob(os.path.join(OUT, 'learn*.html')))
print(f'learn: {len(sizes)} page(s) built; all learn pages together {total / 1024:.0f} KB')
