"""Builds the private Frontier Hunter test page (not linked from the hub, its own saves):
public/games/frontier-hunter-lab-c2811d1c.html. Run after: npm run build in frontier/ (which writes public/games/frontier-hunter.html)"""
import os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(HERE, 'public/games/frontier-hunter.html'), encoding='utf-8').read()
assert '"fh-save"' in src and '"fh-settings"' in src
page = src.replace('"fh-save"', '"fh-lab-save"').replace('"fh-settings"', '"fh-lab-settings"')   # its own save, apart from the real game's
page = page.replace('<head>', '<head><meta name="robots" content="noindex,nofollow">', 1)
page = page.replace('<title>Frontier Hunter</title>', '<title>Frontier Hunter (test build)</title>', 1)
tag = '<div style="position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:99;background:#f2b33d;color:#1a1200;font:700 11px system-ui;padding:3px 9px;border-radius:9px;pointer-events:none;letter-spacing:.08em">TEST BUILD</div>'
page = page.replace('</body>', tag + '</body>', 1)
out = 'frontier-hunter-lab-c2811d1c.html'
open(os.path.join(HERE, 'public/games', out), 'w', encoding='utf-8').write(page)
print(out, len(page))
