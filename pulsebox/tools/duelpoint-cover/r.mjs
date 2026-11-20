import { createRequire } from 'module';
const { chromium } = createRequire('/home/user/pulseform/pulsebox/')('playwright');
const D = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--proxy-server=' + process.env.HTTPS_PROXY, '--ignore-certificate-errors', '--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1200, height: 1200 } });
await p.goto('file://' + D + '/cover.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
console.log(await p.evaluate(() => document.fonts.check("700 100px 'Chakra Petch'")));
await (await p.$('#c')).screenshot({ path: D + '/cover-big.png' }); await b.close();
