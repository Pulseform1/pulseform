# Validates and previews a sprite batch file (see art/STYLE.md).
# usage: python3 tools/render-sprites.py art/sprites/<batch>.json [out.png]
# Writes a PNG (default art/previews/<batch>.png): each sprite big (8x) on the app's navy, next to its in-app size.
import json, sys, os
from PIL import Image, ImageDraw
BG = (6, 20, 42)
def check(sp):
    errs, n = [], sp.get('size')
    if n not in (16, 32): errs.append(f"size must be 16 or 32, got {n}")
    rows, pal = sp.get('rows', []), sp.get('palette', {})
    if len(rows) != n: errs.append(f"{len(rows)} rows, need {n}")
    for i, r in enumerate(rows):
        if len(r) != n: errs.append(f"row {i} has {len(r)} chars, need {n}")
        for ch in set(r):
            if ch != '.' and ch not in pal: errs.append(f"row {i}: '{ch}' not in palette")
    for k, v in pal.items():
        if len(k) != 1 or k == '.': errs.append(f"palette key {k!r} must be one char and not '.'")
        if not (isinstance(v, str) and len(v) == 7 and v[0] == '#'): errs.append(f"palette {k}: {v!r} is not #rrggbb")
    if len(pal) > 18: errs.append(f"{len(pal)} colors; keep it to 18 or fewer")
    return errs, sum(c != '.' for r in rows for c in r)
def to_img(sp):
    n = sp['size']; im = Image.new('RGBA', (n, n), (0, 0, 0, 0)); px = im.load()
    for y, r in enumerate(sp['rows'][:n]):
        for x, ch in enumerate(r[:n]):
            if ch != '.' and ch in sp['palette']:
                c = sp['palette'][ch]; px[x, y] = (int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16), 255)
    return im
def render(sprites, out):
    cells = []
    for sp in sprites:
        errs, filled = check(sp); n = sp.get('size', 32); big = 8 if n == 32 else 12; real = 5 if n == 32 else 3
        try: im = to_img(sp)
        except Exception as e: errs.append(str(e)); im = Image.new('RGBA', (n, n))
        c = Image.new('RGB', (n * big + 24 + n * real + 16, n * big + 40), BG); d = ImageDraw.Draw(c)
        b = im.resize((n * big, n * big), Image.NEAREST); c.paste(b, (8, 32), b)
        s = im.resize((n * real, n * real), Image.NEAREST); c.paste(s, (n * big + 24, 32), s)
        d.text((8, 8), f"{sp.get('id')} ({sp.get('name', '')})", fill=(231, 244, 255))
        if errs: d.text((8, 20), 'ERRORS: ' + '; '.join(errs)[:120], fill=(255, 80, 90))
        cells.append(c)
        print(f"{sp.get('id')}: {'OK' if not errs else 'ERRORS: ' + ' | '.join(errs[:6])} ({filled} filled px)")
    sheet = Image.new('RGB', (max(c.width for c in cells), sum(c.height for c in cells)), BG); y = 0
    for c in cells: sheet.paste(c, (0, y)); y += c.height
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True); sheet.save(out); print('preview:', out)
if __name__ == '__main__':
    path = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'art', 'previews', os.path.basename(path)[:-5] + '.png')
    render(json.load(open(path))['sprites'], out)
