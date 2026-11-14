import { B, issues, note, open, tap, ctl, sim, fuzz, finish } from './lib.mjs';
const T = {};

T['baggage-panic'] = async () => {
  const g = 'baggage-panic'; let p = await open(g);
  const gen = await p.evaluate(() => { const t0 = performance.now(), bad = []; for (let lv = 1; lv <= 40; lv++) { const s = packNew(lv); if (s.level !== lv || s.parts.length !== packSpec(lv).n) bad.push(lv); } return { ms: Math.round(performance.now() - t0), bad }; });
  console.log('  generated 40 suitcases in', gen.ms, 'ms'); if (gen.bad.length) note(g, 'bad suitcases: ' + gen.bad.join(','));
  // solve suitcases 1..14 with real taps (covers every size)
  for (let lv = 1; lv <= 14; lv++) {
    const n = await p.evaluate(() => state.parts.length);
    for (let i = 0; i < n; i++) {
      await p.evaluate(i => { state.selected = i; }, i);
      let ok = false;
      for (let r = 0; r < 4 && !ok; r++) {
        ok = await p.evaluate(i => { const it = state.parts[i], s = it.solution.shape, norm = c => JSON.stringify(c.map(a => a.join()).sort()), mn = sh => { const mx = Math.min(...sh.map(a => a[0])), my = Math.min(...sh.map(a => a[1])); return sh.map(([x, y]) => [x - mx, y - my]); }; return norm(it.cells) === norm(mn(s)); }, i);
        if (!ok) await ctl(p, 'rotate');
      }
      if (!ok) { note(g, `suitcase ${lv} item ${i}: rotation never matches`); break; }
      const pos = await p.evaluate(i => { const it = state.parts[i], s = it.solution.shape, L = packLayout(); return { x: L.ox + (it.solution.x + Math.min(...s.map(a => a[0]))) * L.sz + L.sz / 2, y: L.oy + (it.solution.y + Math.min(...s.map(a => a[1]))) * L.sz + L.sz / 2 }; }, i);
      await tap(p, pos.x, pos.y);
    }
    const st = await p.evaluate(() => ({ won: state.won, level: state.level, stars: state.starsWon, w: state.w, h: state.h }));
    if (!st.won) { note(g, `suitcase ${lv} (${st.w}x${st.h}): not won after placing the solution`); break; }
    if (st.stars !== 3) note(g, `suitcase ${lv}: a clean pack earned ${st.stars} stars`);
    await ctl(p, 'next');
  }
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('pbx-pack-save-baggage-panic'))); console.log('  saved progress: level', saved.level, 'stars', Object.values(saved.stars).reduce((a, b) => a + b, 0));
  await p.reload(); await p.locator('#play').click(); if ((await p.evaluate(() => state.level)) !== 15) note(g, 'progress did not survive a reload');
  await fuzz(p, 120, ['r', 'z']); await finish(p, g);
};

T['engine'] = async () => {
  const p = await open('baggage-panic');
  await p.locator('#help').click(); await p.locator('#restart').click(); await p.waitForTimeout(500);
  const st = await p.evaluate(() => ({ paused, card: !document.getElementById('start').hidden }));
  if (st.card && !st.paused) note('engine', 'Restart while help is open runs the game behind the card');
  await finish(p, 'engine');
};

const only = process.argv.slice(2), list = only.length ? only : Object.keys(T);
for (const k of list) { console.log('▶ ' + k); try { await T[k](); } catch (e) { note(k, 'TEST CRASH ' + e.message.split('\n')[0]); } }
console.log('\n==== ' + issues.length + ' issues'); issues.forEach(x => console.log(' - ' + x));
await B.close();
