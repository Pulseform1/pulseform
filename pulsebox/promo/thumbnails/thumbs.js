// node thumbs.js [id ...]  -> out/<id>-9x16.png (1080x1920) and out/<id>-16x9.png (1280x720)
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1920 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, 'thumbs.html')); await p.evaluate(() => document.fonts.ready);
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : await p.evaluate(() => THUMB_IDS);
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  for (const id of ids) for (const wide of [false, true]) {
    const [W, H] = await p.evaluate(([id, wide]) => thumb(id, wide), [id, wide]);
    await p.screenshot({ path: path.join(__dirname, 'out', `${id}-${wide ? '16x9' : '9x16'}.png`), clip: { x: 0, y: 0, width: W, height: H } });
  }
  if (errs.length) console.log('ERRORS', errs.join('\n'));
  await b.close();
})();
