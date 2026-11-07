#!/usr/bin/env python3
"""Builds public/games/odd-crowd.html from src/odd-crowd/ (one self-contained page, no network but the Pulsebox rooms relay).
Order matters: prompts -> rules engine -> the original client (app.js) -> the Pulsebox room service and polish (net.js)."""
import pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
src = root / 'src' / 'odd-crowd'
def module(name):
    text = (src / name).read_text()
    text = re.sub(r"^import [^\n]*\n", '', text, flags=re.M)
    return re.sub(r"^export ", '', text, flags=re.M)
js = '\n'.join([module('prompts.mjs'), module('game.mjs'), (src / 'app.js').read_text(), (src / 'net.js').read_text()])
js = "(()=>{'use strict';\n" + js + "\n})();"
js = js.replace('</script', '<\\/script')
html = (src / 'index.html').read_text()
css = (src / 'style.css').read_text()
license = (src / 'LICENSE.txt').read_text().replace('--', '- -')
html = html.replace('<link rel="stylesheet" href="./style.css">', '<style>' + css + '</style>', 1)
html = html.replace('<script src="./app.js"></script>', '<script>' + js + '</script>', 1)
assert 'style.css' not in html and 'app.js"' not in html, 'inline failed'
html = html.replace('<!doctype html>', '<!doctype html>\n<!-- ODD CROWD, adapted for Pulsebox (online rooms run on the Pulsebox relay; house guests; motion polish).\n' + license + '-->', 1)
out = root / 'public' / 'games' / 'odd-crowd.html'
out.write_text(html)
print('built', out.relative_to(root), len(html), 'bytes')
