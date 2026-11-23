"""Draws the Duelpoint heatmaps written by tools/duelpoint-heatmap.mjs, and sums each map up.
  python3 tools/duelpoint-heatmap.py <dir with the JSON files>
For each map, <key>.png: three panels over the map's plan: where fighters spend their time, where the killers stood, where
the victims fell (attackers orange, defenders blue). And summary.json / summary.txt: round wins by side and how, which
site gets the charge, how far fights are, the strongest spots (most kills from a 6 m patch, with its kills to deaths) and
the open ground nobody uses."""
import json, os, sys, glob, math, statistics
from PIL import Image, ImageDraw, ImageFilter, ImageFont

D = sys.argv[1]
C = 12   # pixels per 2 m cell
COL = {'#': (24, 27, 33), 'X': (70, 78, 92), 'c': (96, 78, 56), 'h': (88, 92, 100), 'w': (60, 110, 140), 'P': (110, 100, 80), '7': (110, 100, 80), '8': (110, 100, 80), 'H': (120, 110, 90),
       '~': (40, 70, 110), 'o': (88, 64, 44), 'q': (88, 64, 44), 'r': (88, 64, 44), 'A': (60, 74, 50), 'D': (44, 58, 84), 'G': (90, 60, 60), 'W': (100, 84, 70)}
try: FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
except Exception: FONT = ImageFont.load_default()

def plan(src):
    H, W = len(src), len(src[0]); im = Image.new('RGB', (W * C, H * C), (52, 56, 62)); d = ImageDraw.Draw(im)
    for j, row in enumerate(src):
        for i, ch in enumerate(row):
            if ch in COL: d.rectangle([i * C, j * C, i * C + C - 1, j * C + C - 1], fill=COL[ch])
    return im

def heat(src, pts, col, blur=7):
    H, W = len(src), len(src[0]); acc = Image.new('L', (W * C, H * C), 0); d = ImageDraw.Draw(acc)
    if not pts: return None
    # each point adds to a soft blob; scaled so the busiest spot is full strength
    grid = {}
    for x, z, w in pts: grid[(int(x / 2 * C / 3), int(z / 2 * C / 3))] = grid.get((int(x / 2 * C / 3), int(z / 2 * C / 3)), 0) + w
    top = max(grid.values())
    for (gx, gz), v in grid.items():
        a = int(255 * min(1, (v / top) ** .55)); d.rectangle([gx * 3, gz * 3, gx * 3 + 3, gz * 3 + 3], fill=a)
    acc = acc.filter(ImageFilter.GaussianBlur(blur)); px = acc.load(); m = max(1, max(acc.getdata()))
    lay = Image.new('RGBA', acc.size, (0, 0, 0, 0)); lp = lay.load()
    for y in range(acc.size[1]):
        for x in range(acc.size[0]):
            v = px[x, y] / m
            if v > .04: lp[x, y] = col + (int(235 * min(1, v * 1.3)),)
    return lay

summary = {}
for f in sorted(glob.glob(os.path.join(D, '*.json'))):
    if f.endswith('summary.json'): continue
    R = json.load(open(f)); src = R['src']; H, W = len(src), len(src[0]); base = plan(src)
    ATT, DEF = (255, 140, 50), (70, 170, 255)
    panels = []
    for title, layers in [
        ('WHERE THEY SPEND TIME', [([(int(k.split(',')[0]) * 2 + 1, int(k.split(',')[1]) * 2 + 1, v) for k, v in R['occ'].items() if k.endswith(',a')], ATT), ([(int(k.split(',')[0]) * 2 + 1, int(k.split(',')[1]) * 2 + 1, v) for k, v in R['occ'].items() if k.endswith(',d')], DEF)]),
        ('WHERE THE KILLERS STOOD', [([(k['k'][0], k['k'][1], 1) for k in R['kills'] if 'k' in k and k['ks'] == 'att'], ATT), ([(k['k'][0], k['k'][1], 1) for k in R['kills'] if 'k' in k and k['ks'] == 'def'], DEF)]),
        ('WHERE THEY DIED', [([(k['v'][0], k['v'][1], 1) for k in R['kills'] if k['vs'] == 'att'], ATT), ([(k['v'][0], k['v'][1], 1) for k in R['kills'] if k['vs'] == 'def'], DEF)])]:
        im = base.copy().convert('RGBA')
        for pts, col in layers:
            L = heat(src, pts, col)
            if L: im = Image.alpha_composite(im, L)
        top = Image.new('RGBA', (im.size[0], 26), (14, 16, 20, 255)); ImageDraw.Draw(top).text((8, 5), title, fill=(230, 226, 214), font=FONT)
        p = Image.new('RGBA', (im.size[0], im.size[1] + 26)); p.paste(top, (0, 0)); p.paste(im, (0, 26)); panels.append(p)
    gap = 10; sheet = Image.new('RGB', (sum(p.size[0] for p in panels) + gap * 2, panels[0].size[1] + 34), (14, 16, 20)); x = 0
    for p in panels: sheet.paste(p, (x, 34)); x += p.size[0] + gap
    rs = R['rounds']; att = sum(r['att'] for r in rs)
    ImageDraw.Draw(sheet).text((8, 8), f"{R['n'].upper()}   {R['size']}v{R['size']} bots, {len(rs)} rounds   attackers won {round(100 * att / max(1, len(rs)))}%   orange: attackers   blue: defenders", fill=(242, 194, 48), font=FONT)
    sheet.save(os.path.join(D, R['k'] + '.png'))

    # the numbers
    why = {}
    for r in rs: why[r['why']] = why.get(r['why'], 0) + 1
    sites = {}
    for r in rs:
        if r['site'] is not None: sites['ABC'[r['site']]] = sites.get('ABC'[r['site']], 0) + 1
    ds = [k['d'] for k in R['kills'] if 'd' in k]
    # strongest spots: kills from each 6 m patch (3 by 3 cells), with deaths in the same patch
    patch = lambda x, z: (int(x // 6), int(z // 6))
    kf, dd = {}, {}
    for k in R['kills']:
        if 'k' in k: key = patch(*k['k']) + (k['ks'],); kf[key] = kf.get(key, 0) + 1
        key = patch(*k['v']) + (k['vs'],); dd[key] = dd.get(key, 0) + 1
    def area(px, pz):
        i, j = px * 3 + 1, pz * 3 + 1
        for a in R['areas']:
            r = a['r']
            if r[0] <= i <= r[2] and r[1] <= j <= r[3]: return a['n']
        return '?'
    tot = max(1, len(R['kills']))
    strong = sorted(kf.items(), key=lambda q: -q[1])[:6]
    strong = [{'area': area(k[0], k[1]), 'side': k[2], 'cell': [k[0] * 3 + 1, k[1] * 3 + 1], 'kills': v, 'share': round(100 * v / tot, 1), 'kd': round(v / max(1, dd.get(k, 0)), 1)} for k, v in strong]
    # open ground nobody uses: walkable cells with no time spent in them
    occ = set((int(k.split(',')[0]), int(k.split(',')[1])) for k in R['occ'])
    walk = [(i, j) for j, row in enumerate(src) for i, ch in enumerate(row) if ch in '.oqrPH78TJigLVG<>^v' ]
    dead = [c for c in walk if c not in occ]
    deadA = {}
    for i, j in dead:
        n = '?'
        for a in R['areas']:
            r = a['r']
            if r[0] <= i <= r[2] and r[1] <= j <= r[3]: n = a['n']; break
        deadA[n] = deadA.get(n, 0) + 1
    # each area: share of all kills made from it, and its kills to deaths
    ak, ad = {}, {}
    for k in R['kills']:
        if 'k' in k: n = area(*patch(*k['k'])) if False else None
    for k in R['kills']:
        def an(x, z):
            i, j = int(x // 2), int(z // 2)
            for a in R['areas']:
                r = a['r']
                if r[0] <= i <= r[2] and r[1] <= j <= r[3]: return a['n']
            return '?'
        if 'k' in k: ak[an(*k['k'])] = ak.get(an(*k['k']), 0) + 1
        ad[an(*k['v'])] = ad.get(an(*k['v']), 0) + 1
    areas = sorted([{'area': n, 'kills_from': ak.get(n, 0), 'deaths_in': ad.get(n, 0)} for n in set(ak) | set(ad)], key=lambda q: -(q['kills_from'] + q['deaths_in']))
    summary[R['k']] = {'name': R['n'], 'rounds': len(rs), 'att_win': round(100 * att / max(1, len(rs))), 'why': why, 'plant_site': sites,
                       'dist_median': round(statistics.median(ds), 1) if ds else None, 'dist_over30': round(100 * sum(d > 30 for d in ds) / max(1, len(ds))),
                       'strong_spots': strong, 'unused_cells': len(dead), 'walk_cells': len(walk), 'unused_by_area': dict(sorted(deadA.items(), key=lambda q: -q[1])[:5]), 'areas': areas[:8]}
json.dump(summary, open(os.path.join(D, 'summary.json'), 'w'), indent=1)
with open(os.path.join(D, 'summary.txt'), 'w') as o:
    for k, s in summary.items():
        o.write(f"\n{s['name']}: attackers win {s['att_win']}% of {s['rounds']} rounds  {s['why']}  plants by site {s['plant_site']}\n")
        o.write(f"  fights: median {s['dist_median']} m apart, {s['dist_over30']}% over 30 m;  unused open ground {s['unused_cells']} of {s['walk_cells']} cells {s['unused_by_area']}\n")
        for q in s['strong_spots']: o.write(f"  strong spot: {q['area']:<16} ({q['side']}) cell {q['cell']}  {q['kills']} kills = {q['share']}% of the map's, {q['kd']} kills per death there\n")
print(open(os.path.join(D, 'summary.txt')).read())
