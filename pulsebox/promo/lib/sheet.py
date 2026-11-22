# Contact sheet of preview stills: python sheet.py VIDEO_DIR t1 t2 ...
import sys
from PIL import Image, ImageDraw
D, ts = sys.argv[1], sys.argv[2:]
c = Image.new("RGB", (6 * 270, ((len(ts) + 5) // 6) * 480), "black")
for i, t in enumerate(ts):
    im = Image.open(f"{D}/preview/t{t}.jpg").resize((270, 480)); x, y = (i % 6) * 270, (i // 6) * 480
    c.paste(im, (x, y)); ImageDraw.Draw(c).text((x + 5, y + 5), t, fill="red")
c.save(f"{D}/preview/sheet.jpg")
