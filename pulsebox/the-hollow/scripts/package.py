"""Package editable sources and a portable solo build for sharing."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
with ZipFile(root / 'dist/THE-HOLLOW-source.zip', 'w', ZIP_DEFLATED) as archive:
    files = [root / name for name in ['README.md', 'CLAUDE-HANDOFF.md', 'package.json', 'package-lock.json', '.gitignore', 'engine.js', 'player-mechanics.js', 'levels.js', 'horror-director.js', 'world.js', 'server.js']]
    for directory in ['public', 'scripts', 'test']:
        files.extend((root / directory).rglob('*'))
    for item in sorted(files):
        relative = item.relative_to(root)
        if any(part in {'.git', 'node_modules', 'dist'} for part in relative.parts):
            continue
        if item.is_file() and item.suffix != '.log':
            archive.write(item, 'THE-HOLLOW/' + str(relative))
    archive.write(root / 'dist/THE-HOLLOW-3D-BUILD-7.html', 'THE-HOLLOW/THE-HOLLOW-3D-BUILD-7.html')
print('Built dist/THE-HOLLOW-source.zip')

import shutil
shutil.copyfile(root / 'dist/THE-HOLLOW-source.zip', root / 'dist/THE-HOLLOW-3D-BUILD-7-source.zip')
