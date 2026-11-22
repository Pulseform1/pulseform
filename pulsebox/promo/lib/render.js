// node render.js VIDEO_DIR sheet t1 t2 ...        -> VIDEO_DIR/preview/sheet.jpg-ready stills
// node render.js VIDEO_DIR frames OUTDIR [from to] -> JPEG frames; also writes VIDEO_DIR/cues.json
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const [dir, mode, ...rest] = process.argv.slice(2); const D = path.resolve(dir);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file://' + path.join(D, 'scenes.html')); await p.evaluate(() => document.fonts.ready);
  if (errs.length) { console.log('ERRORS', errs.join('\n')); process.exit(1); }
  fs.writeFileSync(path.join(D, 'cues.json'), JSON.stringify(await p.evaluate(() => window.CUES)));
  if (mode === 'sheet') {
    fs.mkdirSync(path.join(D, 'preview'), { recursive: true });
    for (const t of rest) { await p.evaluate(t => render(+t), t); await p.screenshot({ path: path.join(D, 'preview', `t${t}.jpg`), type: 'jpeg', quality: 80 }); }
  } else if (mode === 'frames') {
    const out = rest[0]; fs.mkdirSync(out, { recursive: true }); const tl = await p.evaluate(() => TIMELINE); const n = Math.round(tl.end * tl.fps);
    const from = +(rest[1] || 0), to = Math.min(n, +(rest[2] || n));
    for (let i = from; i < to; i++) { await p.evaluate(t => render(t), i / tl.fps); await p.screenshot({ path: `${out}/f${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90 }); }
  }
  if (errs.length) console.log('ERRORS', errs.slice(0, 5).join('\n'));
  await b.close();
})();
