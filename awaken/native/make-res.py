# Builds the Android launcher icons and splash screens from the web app's icons. Run: python3 make-res.py
import os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(HERE, 'android/app/src/main/res')
ICON = Image.open(os.path.join(HERE, '../icons/icon-512.png')).convert('RGBA')
MASK = Image.open(os.path.join(HERE, '../icons/icon-maskable-512.png')).convert('RGBA')
BG = (3, 6, 13, 255)
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for d, s in DENS.items():
    out = os.path.join(RES, f'mipmap-{d}')
    os.makedirs(out, exist_ok=True)
    ICON.resize((round(48 * s),) * 2, Image.LANCZOS).save(os.path.join(out, 'ic_launcher.png'))
    ICON.resize((round(48 * s),) * 2, Image.LANCZOS).save(os.path.join(out, 'ic_launcher_round.png'))
    # adaptive icon: the launcher shows the middle 72 of 108 dp, the maskable art keeps its content in the middle 80%
    size = round(108 * s); inner = round(size * 72 / 108 / 0.8)
    fg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    m = MASK.resize((inner, inner), Image.LANCZOS)
    fg.paste(m, ((size - inner) // 2,) * 2, m)
    fg.save(os.path.join(out, 'ic_launcher_foreground.png'))
open(os.path.join(RES, 'values/ic_launcher_background.xml'), 'w').write(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#03060D</color>\n</resources>\n')
# splash: the icon on the app's dark background
def splash(w, h, path):
    im = Image.new('RGBA', (w, h), BG)
    n = round(min(w, h) * 0.32)
    ic = ICON.resize((n, n), Image.LANCZOS)
    im.paste(ic, ((w - n) // 2, (h - n) // 2), ic)
    im.convert('RGB').save(path)
for folder in os.listdir(RES):
    p = os.path.join(RES, folder, 'splash.png')
    if os.path.exists(p):
        w, h = Image.open(p).size
        splash(w, h, p)
print('resources written')
