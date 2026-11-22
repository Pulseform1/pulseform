// node render.js frames <outdir>   -> every frame as JPEG
// node render.js sheet <out.png> t1 t2 ...   -> contact sheet of chosen times
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const [mode, out, ...ts] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file://' + path.resolve(__dirname, 'scenes.html')); await p.evaluate(() => document.fonts.ready);
  if (errs.length) { console.log(errs.join('\n')); }
  if (mode === 'sheet') {
    fs.mkdirSync('preview', { recursive: true }); const files = [];
    for (const t of ts) { await p.evaluate(t => render(+t), t); const f = `preview/t${t}.jpg`; await p.screenshot({ path: f, type: 'jpeg', quality: 80 }); files.push(f); }
    console.log(files.join(' '));
  } else {
    fs.mkdirSync(out, { recursive: true }); const tl = await p.evaluate(() => TIMELINE); const n = Math.round(tl.end * tl.fps);
    const from = +(ts[0] || 0), to = +(ts[1] || n);
    for (let i = from; i < to; i++) { await p.evaluate(t => render(t), i / tl.fps); await p.screenshot({ path: `${out}/f${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90 }); if (i % 150 === 0) console.log('frame', i); }
  }
  if (errs.length) console.log('ERRORS', errs.slice(0, 5).join('\n'));
  await b.close();
})();
