import { open } from './rig.mjs';
const r = await open(process.argv[2]); const out = [];
for (let mi = 0; mi < 14; mi++) {
  const info = await r.run(mi => { const M = match({ mode: 'bot', size: 5, diff: 2, map: mi }, 'vanta'); T.botMe(2); live(); hud(false); const s = T.siteC, W = T.GW * 2, Hh = T.GH * 2;
    cine(t => ({ p: [s[0] + 15, 11, s[1] + 17], at: [s[0], 1, s[1]], fov: 50 })); return { i: mi, n: T.MAP.n, theme: T.MAP.theme, W, Hh, site: s.map(v => +v.toFixed(1)) }; }, mi);
  out.push(info); await r.idle(.5); await r.shot('scout' + String(mi).padStart(2, '0'), 1 / 30);
}
console.log(JSON.stringify(out)); await r.close();
