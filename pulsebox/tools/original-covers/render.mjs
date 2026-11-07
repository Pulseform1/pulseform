import { chromium } from 'playwright';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const G = createRequire(import.meta.url)('./covers.js');
const out = process.argv[2], only = process.argv.slice(3);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--proxy-server=' + process.env.HTTPS_PROXY] });
const p = await b.newPage({ viewport: { width: 600, height: 600 }, ignoreHTTPSErrors: true });
for (const [id, ST] of Object.entries(G)) {
  if (only.length && !only.includes(id)) continue;
  const fam = encodeURIComponent(ST.f).replace(/%20/g, '+') + (ST.w ? ':wght@' + ST.w : '');
  const ext = Array.from({ length: 9 }, (_, i) => `${i + 1}px ${i + 1}px 0 ${ST.ext}`).join(',');
  const ts = `position:absolute;left:0;right:0;top:0;text-align:center;font-family:'${ST.f}';font-weight:${ST.w || 400};font-size:${ST.size}px;line-height:.92;${ST.italic ? 'font-style:italic;' : ''}letter-spacing:.01em;padding:0 18px`;
  await p.setContent(`<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${fam}&display=block"></head>
<body style="margin:0;width:600px;height:600px;overflow:hidden;background:#000">
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" style="position:absolute;inset:0">${ST.svg}</svg>
<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.28) 0%,rgba(0,0,0,0) 34%)"></div>
<div style="position:absolute;left:0;right:0;top:30px;transform:rotate(${ST.rot || 0}deg)">
<div style="${ts};-webkit-text-stroke:${Math.round(ST.size / 9)}px ${ST.stroke};color:${ST.stroke};text-shadow:${ext},0 14px 24px rgba(0,0,0,.55)">${ST.t}</div>
<div style="${ts};background:linear-gradient(180deg,${ST.fill[0]} 15%,${ST.fill[1]} 85%);-webkit-background-clip:text;background-clip:text;color:transparent">${ST.t}</div>
</div></body></html>`);
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(700);
  const ok = await p.evaluate(f => document.fonts.check(`40px '${f}'`), ST.f);
  await p.screenshot({ path: `${out}/${id}-cover.jpg`, type: 'jpeg', quality: 88 });
  console.log(id, ok ? 'font ok' : 'FONT MISSING');
}
await b.close();
