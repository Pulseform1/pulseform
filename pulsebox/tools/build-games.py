"""Builds the kit-based games: src/games/<id>.js (or the parts in src/games/<id>/) + src/kit.js + src/kit.css -> public/games/<id>.html (one file each).
Run from anywhere: python3 tools/build-games.py [game-id ...]  (no ids builds every game)"""
import glob, os, re, sys, urllib.parse

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = lambda *p: open(os.path.join(HERE, 'src', *p), encoding='utf-8').read()
kit_js, kit_css = src('kit.js'), src('kit.css')
only = set(sys.argv[1:])
# Pages kept exactly as they are live: Strata and Siegeworks were updated and deployed by another session with their own
# copies of the kit and the multiplayer library (a volume setting, no-shake option, crash guard, Strata's pixel-style
# screens and join-a-match fix). Rebuilding them from src/ with this kit would undo that, so they are never rebuilt here.
# Their game code still comes from src/games/strata.js and siegeworks.js: only that part of the page is refreshed.
FROZEN = {'strata', 'siegeworks'}
# Games under test: built from src/ to a private, unlisted page (own save slot, own rooms, a TEST BUILD tag) and the live
# page is left as it was. To ship the tested version, take the game out of LAB and build it again.
LAB = {}   # e.g. {'blackwater': 'blackwater-lab-b860f455'}
def export_names(code):
    names = []
    for m in re.finditer(r'^export\s+(async\s+)?(function\*?|class)\s+(\w+)', code, re.M): names.append(m.group(3))
    for m in re.finditer(r'^export\s+(const|let|var)\s+', code, re.M):
        i, depth, part, parts, q = m.end(), 0, '', [], None
        while i < len(code):
            ch = code[i]
            if q:
                part += ch
                if ch == '\\': part += code[i + 1]; i += 2; continue
                if ch == q: q = None
            elif ch in '\'"`': q = ch; part += ch
            elif ch in '([{': depth += 1; part += ch
            elif ch in ')]}': depth -= 1; part += ch
            elif depth == 0 and ch == ',': parts.append(part); part = ''
            elif depth == 0 and ch in ';\n' and part.strip() and not part.rstrip().endswith(('=', '=>', '?', ':', '||', '&&', '+', '-', '*')) and (ch == ';' or not code[i + 1:].lstrip().startswith(('.', '?', ':', '+', '-', '*', '/', '&&', '||'))): parts.append(part); break
            else: part += ch
            i += 1
        names += [re.match(r'\s*(\w+)', x).group(1) for x in parts if re.match(r'\s*(\w+)', x)]
    return names
SHARED = {}   # path -> the name its exports were given, so a later module's imports can be pointed at it
def share_module(rel, name):
    code = open(os.path.join(HERE, rel), encoding='utf-8').read()
    def imp(m):
        dep = os.path.normpath(os.path.join(os.path.dirname(rel), m.group(2)))
        return f'const {{{m.group(1)}}} = {SHARED[dep]};' if dep in SHARED else ''
    code = re.sub(r'^import\s*\{([^}]*)\}\s*from\s*[\'"]([^\'"]+)[\'"];\s*$', imp, code, flags=re.M)
    code = re.sub(r'^import\s+[^;]+;\s*$', '', code, flags=re.M)
    if name: SHARED[os.path.normpath(rel)] = name
    exports = export_names(code)
    code = re.sub(r'^export\s+', '', code, flags=re.M)
    if not name: return f'/* ---- shared: {rel} ---- */\n' + code
    return f'/* ---- shared: {rel} ---- */\nconst {name} = (() => {{\n{code}\nreturn {{ {", ".join(exports)} }};\n}})();\n'
def lab_page(gid, html):
    assert f"id: '{gid}'" in html
    html = html.replace(f"id: '{gid}'", f"id: '{gid}-lab'", 1).replace('<head>', '<head>\n<meta name="robots" content="noindex,nofollow">', 1)
    tag = '<div style="position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:99;background:#f2b33d;color:#1a1200;font:700 11px system-ui;padding:3px 9px;border-radius:9px;pointer-events:none;letter-spacing:.08em">TEST BUILD</div>'
    return html.replace('</body>', tag + '</body>', 1)
# a game is one file, src/games/<id>.js, or a folder, src/games/<id>/, whose .js parts are joined in name order
games = glob.glob(os.path.join(HERE, 'src', 'games', '*.js')) + [d for d in glob.glob(os.path.join(HERE, 'src', 'games', '*')) if os.path.isdir(d)]
for path in sorted(games, key=lambda q: os.path.splitext(os.path.basename(q))[0]):
    gid = os.path.splitext(os.path.basename(path))[0]
    if only and gid not in only: continue
    if gid in FROZEN:   # keep the page's own kit and multiplayer copies; refresh only the game's code from src/
        out = os.path.join(HERE, 'public', 'games', gid + '.html'); page = open(out, encoding='utf-8').read()
        a, b = page.index('// @use mp\n'), page.index('/* Pulsebox game kit')
        seg = page[a:b]; game = open(path, encoding='utf-8').read().rstrip('\n') + '\n' * max(1, len(seg) - len(seg.rstrip('\n')))   # keep the spacing as it was
        new = page[:a] + game + page[b:]
        if new != page: open(out, 'w', encoding='utf-8').write(new)
        print(gid, 'frozen page, game code', 'updated' if new != page else 'unchanged'); continue
    js = ''.join(open(q, encoding='utf-8').read().rstrip('\n') + '\n' for q in sorted(glob.glob(os.path.join(path, '*.js')))) if os.path.isdir(path) else open(path, encoding='utf-8').read()
    # shared ES modules (a game's server code): a line  // @share path/to/file.js  inlines that file right there with its
    # import/export keywords removed; // @share path/to/file.js as NAME  wraps it so its exports are NAME.thing
    js = re.sub(r'^// @share (\S+)(?: as (\w+))?\s*$', lambda m: share_module(m.group(1), m.group(2)), js, flags=re.M)
    # shared code a game asks for with a line like  // @use person  (from src/lib/person.js)
    for lib in re.findall(r'^// @use (\w+)', js, re.M): js = src('lib', lib + '.js') + '\n' + js
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
    if gid in LAB: html = lab_page(gid, html); gid = LAB[gid]
    out = os.path.join(HERE, 'public', 'games', gid + '.html')
    open(out, 'w', encoding='utf-8').write(html)
    print(gid, len(html.encode()), 'bytes')
