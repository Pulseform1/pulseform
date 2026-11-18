"""Builds the private Blackwater test page (not linked from the hub, own save slot and rooms):
public/games/blackwater-lab-b860f455.html. Run after: python3 tools/build-games.py blackwater"""
import os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(HERE, 'public/games/blackwater.html'), encoding='utf-8').read()
assert "id: 'blackwater'" in src
page = src.replace("id: 'blackwater'", "id: 'blackwater-lab'", 1)
page = page.replace('<head>', '<head><meta name="robots" content="noindex,nofollow">', 1)
tag = '<div style="position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:99;background:#f2b33d;color:#1a1200;font:700 11px system-ui;padding:3px 9px;border-radius:9px;pointer-events:none;letter-spacing:.08em">TEST BUILD</div>'
page = page.replace('</body>', tag + '</body>', 1)
open(os.path.join(HERE, 'public/games/blackwater-lab-b860f455.html'), 'w', encoding='utf-8').write(page)
print('blackwater-lab-b860f455.html', len(page))
