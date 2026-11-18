"""Builds Morrowfield (the 3D world builder) for Pulsebox: src/morrowfield/ -> public/games/morrowfield.html, one page.

The game is written as 24 JavaScript modules plus Three.js, a stylesheet and 675 preview pictures. Pulsebox serves each
game as a single page, so this:
  - bundles the modules and Three.js into one script with esbuild and puts it and the stylesheet in the page;
  - shows each preview from one of three picture sheets in public/media (morrowfield-thumbs-N.webp) instead of 675 files;
  - keeps projects on the device only: the original asks its own host for a signed-in cloud library, which Pulsebox
    does not have;
  - makes the logo a plain mark (its link would load the hub inside the game frame).

Run from anywhere: python3 tools/build-morrowfield.py [folder with the 675 thumbnail PNGs]
Give the thumbnails folder (from the Morrowfield production zip) only to rebuild the picture sheets; without it the
sheets already in public/media are kept, and the order of the previews is read from src/morrowfield/thumbs.json."""
import json, os, re, shutil, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, MEDIA = os.path.join(HERE, 'src', 'morrowfield'), os.path.join(HERE, 'public', 'media')
COLS, PER, CW, CH = 15, 225, 216, 158   # each sheet: 15 x 15 previews of 216 x 158

if len(sys.argv) > 1:   # rebuild the picture sheets
    from PIL import Image
    tdir = sys.argv[1]; ids = sorted(f[:-4] for f in os.listdir(tdir) if f.endswith('.png'))
    for s in range(0, len(ids), PER):
        sheet = Image.new('RGB', (COLS * CW, COLS * CH), (240, 241, 231))
        for i, gid in enumerate(ids[s:s + PER]):
            sheet.paste(Image.open(os.path.join(tdir, gid + '.png')).convert('RGB').resize((CW, CH), Image.LANCZOS), ((i % COLS) * CW, (i // COLS) * CH))
        out = os.path.join(MEDIA, 'morrowfield-thumbs-%d.webp' % (s // PER + 1)); sheet.save(out, 'WEBP', quality=84, method=6); print(os.path.basename(out), os.path.getsize(out) // 1024, 'KB')
    json.dump(ids, open(os.path.join(SRC, 'thumbs.json'), 'w'))
ids = json.load(open(os.path.join(SRC, 'thumbs.json')))

def edit(text, old, new, n=1):
    assert text.count(old) == n, (old[:60], text.count(old)); return text.replace(old, new)

tmp = tempfile.mkdtemp()
try:
    for f in os.listdir(SRC):
        if f.endswith('.js'): open(os.path.join(tmp, f), 'w', encoding='utf-8').write(re.sub(r"(from\s*'\./[\w./-]+\.js)\?v=[\d.]+'", r"\1'", open(os.path.join(SRC, f), encoding='utf-8').read()))
    shutil.copytree(os.path.join(SRC, 'vendor'), os.path.join(tmp, 'vendor'))
    p = os.path.join(tmp, 'app.js'); s = open(p, encoding='utf-8').read()
    s = edit(s, "const img=document.createElement('img');img.alt=`${def.name} preview`;img.width=432;img.height=316;img.src=`./thumbnails/${def.id}.png`;",
             "const img=document.createElement('span');img.className='thumb';img.setAttribute('role','img');img.setAttribute('aria-label',`${def.name} preview`);"
             "{const ti=MF_THUMBS.indexOf(def.id);if(ti>=0){img.style.backgroundImage=`url(../media/morrowfield-thumbs-${Math.floor(ti/%d)+1}.webp)`;img.style.backgroundPosition=`${ti%%%d%%%d/%d*100}%% ${Math.floor(ti%%%d/%d)/%d*100}%%`;}}" % (PER, PER, COLS, COLS - 1, PER, COLS, COLS - 1))
    open(p, 'w', encoding='utf-8').write(s)
    p = os.path.join(tmp, 'project-store.js'); s = open(p, encoding='utf-8').read()
    s = edit(s, "if(!this.fetch)throw new Error('No network API');", "throw new Error('Pulsebox keeps projects on the device');")
    s = edit(s, "this.message='Cloud sign-in is unavailable here. Projects are saved on this device; export a backup to move them.';", "this.message='Projects are saved on this device. Export a backup to move them to another device.';")
    open(p, 'w', encoding='utf-8').write(s)
    local = os.path.join(HERE, 'src', 'operation-ghost-town', 'node_modules', '.bin', 'esbuild')
    cmd = ([local] if os.path.exists(local) else ['npx', '--yes', 'esbuild@0.21.5']) + [os.path.join(tmp, 'app.js'), '--bundle', '--format=esm', '--minify', '--target=es2020', '--legal-comments=none', '--log-level=warning']
    js = subprocess.run(cmd, check=True, capture_output=True, text=True).stdout
finally:
    shutil.rmtree(tmp, ignore_errors=True)
assert 'thumbnails/' not in js and '/api/session' not in js   # the minifier drops the unreachable sign-in probe
h = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
css = open(os.path.join(SRC, 'styles.css'), encoding='utf-8').read() + '''
/* Pulsebox: previews come from picture sheets (see tools/build-morrowfield.py) */
.catalog .thumb{display:block;flex:0 0 auto;width:100%;aspect-ratio:432/316;background-repeat:no-repeat;background-size:COLS00% COLS00%;pointer-events:none}
/* Pulsebox has no cloud library to sync with */
#syncNow,#signInLink{display:none!important}
'''.replace('COLS', str(COLS))
h = edit(h, '<link rel="stylesheet" href="./styles.css?v=1.4.0">', '<style>\n' + css + '</style>')
h = edit(h, '<script type="module" src="./app.js?v=1.4.0"></script>', '<script>window.MF_THUMBS=' + json.dumps(ids, separators=(',', ':')) + ';</script>\n<script type="module">\n' + js.replace('</script', '<\\/script') + '</script>')
h = edit(h, '<a class="brand" href="./" aria-label="Morrowfield home">', '<a class="brand" href="#" onclick="return false" aria-label="Morrowfield">')
license = open(os.path.join(SRC, 'vendor', 'THREE-LICENSE.txt'), encoding='utf-8').read().strip()
h = edit(h, '<!doctype html>', '<!doctype html>\n<!-- Morrowfield 1.4. Includes three.js r170:\n' + license.replace('--', '- -') + '\n-->', 1) if h.lstrip().lower().startswith('<!doctype html>') and h.count('<!doctype html>') == 1 else h
out = os.path.join(HERE, 'public', 'games', 'morrowfield.html'); open(out, 'w', encoding='utf-8').write(h)
print('morrowfield', len(h.encode()), 'bytes;', len(ids), 'previews in', -(-len(ids) // PER), 'sheets')
