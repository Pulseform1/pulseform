import { B, open, fuzz } from './lib.mjs';
const ids = ['baggage-panic', 'switchyard', 'potion-protocol', 'pocket-jury', 'circuit-courier'];
const sizes = { desk: { viewport: { width: 1280, height: 800 } }, phoneP: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, phoneL: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } };
let bad = 0;
for (const id of ids) for (const [n, o] of Object.entries(sizes)) {
  const p = await open(id, o); await fuzz(p, 25);
  const fit = await p.evaluate(() => { const c = document.getElementById('game').getBoundingClientRect(), ctl = document.getElementById('controls').getBoundingClientRect(); return c.bottom <= innerHeight + 1 && ctl.bottom <= innerHeight + 1 && c.width > 100; });
  if (p.errs.length || !fit) { bad++; console.log(id, n, p.errs.slice(0, 2), fit ? '' : 'DOES NOT FIT'); }
  await p.context().close();
}
console.log(bad ? bad + ' problems' : 'all 30 loads clean'); await B.close();
