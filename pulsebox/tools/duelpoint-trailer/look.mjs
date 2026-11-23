// Look at a place on a map: node tools/duelpoint-trailer/look.mjs <out dir> <map index> <name>:<px>,<py>,<pz>,<ax>,<ay>,<az>[,fov] ...
// (positions in metres: a cell (i, j) is at x = i * 2 + 1, z = j * 2 + 1). Writes <out>/<name>.jpg for each view.
import { open } from './rig.mjs'; import fs from 'fs'; import path from 'path';
const out = process.argv[2], mi = +process.argv[3], r = await open(out);
await r.run(mi => { match({ mode: 'bot', size: 1, diff: 0, map: mi }, 'vanta'); T.botMe(2); live(); hud(false); for (const f of T.M.fs) { f.hide = true; still(f); } }, mi);
for (const a of process.argv.slice(4)) { const [name, v] = a.split(':'), n = v.split(',').map(Number);
  await r.run(n => { cine(() => ({ p: [n[0], n[1], n[2]], at: [n[3], n[4], n[5]], fov: n[6] || 62 })); }, n); await r.idle(.3); await r.shot('_v', 1 / 30);
  fs.copyFileSync(path.join(out, '_v', '0000.jpg'), path.join(out, name + '.jpg')); }
if (r.errs.length) console.log('ERRORS', r.errs); await r.close();
