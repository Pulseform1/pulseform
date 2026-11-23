# Contact sheet of every sprite in art/sprites at in-app size on the app background.
# usage: python3 tools/sprite-sheet.py out.png [filter: matches batch file name or sprite id]
import json, glob, os, sys, importlib.util
from PIL import Image, ImageDraw
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('rs', os.path.join(here, 'render-sprites.py')); rs = importlib.util.module_from_spec(spec); spec.loader.exec_module(rs)
flt = sys.argv[2] if len(sys.argv) > 2 else ''
sps = [(os.path.basename(f), sp) for f in sorted(glob.glob(os.path.join(here, '..', 'art', 'sprites', 'b*.json'))) for sp in json.load(open(f))['sprites'] if flt in f or flt in sp['id']]
cols, cw, ch = 6, 200, 200
sheet = Image.new('RGB', (cols * cw, max(1, (len(sps) + cols - 1) // cols) * ch), rs.BG); d = ImageDraw.Draw(sheet)
for i, (f, sp) in enumerate(sps):
    x, y = (i % cols) * cw, (i // cols) * ch; s = 5 if sp['size'] == 32 else 8
    big = rs.to_img(sp).resize((sp['size'] * s, sp['size'] * s), Image.NEAREST); sheet.paste(big, (x + (cw - big.width) // 2, y + 8), big)
    d.text((x + 6, y + ch - 22), f"{sp['id']} [{f[:-5]}]", fill=(200, 220, 255))
sheet.save(sys.argv[1]); print(len(sps), 'sprites ->', sys.argv[1])
