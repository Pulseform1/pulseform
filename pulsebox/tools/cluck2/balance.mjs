// Cluck Launch 2 balance + smoke test: plays N runs on autopilot with greedy buying.
// node tools/cluck2/balance.mjs [runs] [greedy|smart]
// greedy (default): always buys the cheapest thing, gadgets included (a slow, pessimistic player).
// smart: buys gear first (rocket, fuel, glider, ramp, sled, helmet) and gadgets only when they are cheap.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import path from 'path';
const RUNS = +process.argv[2] || 40, MODE = process.argv[3] || 'greedy';
const file = 'file://' + path.resolve('public/games/cluck-launch-2.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); else if (m.text().startsWith('#')) console.log(m.text()); });
await p.goto(file); await p.waitForTimeout(800);
const log = await p.evaluate(async ([RUNS, MODE]) => {
  const out = []; localStorage.clear();
  const pick = () => { // cheapest available upgrade across gear + gadgets
    let best = null;
    for (const c of CATS) { const nx = c.list[S.tier[c.id] + 1]; if (!nx || !unlocked(nx) || (c.id === 'tank' && S.tier.rocket < 1)) continue; if (!best || nx.price < best.price) best = { price: nx.price, f: () => S.tier[c.id]++, n: c.id + (S.tier[c.id] + 1) }; }
    const gear = best;
    GADGETS.forEach(gd => { const lv = S.gad[gd.id] || 0; const pr = gd.prices ? gd.prices[lv] : (lv ? null : gd.price); if (pr == null || !unlocked(gd)) return; if (MODE === 'smart' && gear && pr > gear.price * 0.25) return; if (!best || pr < best.price) best = { price: pr, f: () => { S.gad[gd.id] = lv + 1; }, n: gd.id + (lv + 1) }; });
    return best;
  };
  for (let i = 0; i < RUNS; i++) {
    startRun(); AUTO = 'dist'; let k = 0;
    while (F && !F.done && k < 200000) { autopilot(F, 'dist'); update(1 / 30); k++; }
    const r = runResult(); const c0 = S.coins; endFlight(); const earn = S.coins - c0;
    const bought = []; let q; while ((q = pick()) && S.coins >= q.price) { S.coins -= q.price; q.f(); bought.push(q.n); }
    if (r.laps && !window.__lap) { window.__lap = 1; console.log(`# FIRST TIME ROUND THE WORLD on run ${i + 1}`); }
    console.log(`#${i + 1}: dist ${Math.round(r.dist)} smash ${r.smash} cash ${r.cash} bonks ${r.bonks} skips ${r.skips} rings ${r.rings} laps ${r.laps} region ${r.region} +${earn} [${bought.join(' ')}] t${Math.round(F.t)} real${Math.round(F.real)}`);
  }
  return out;
}, [RUNS, MODE]);

console.log('errors:', errs.slice(0, 8));
await b.close();
