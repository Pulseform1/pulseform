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

T['pocket-jury'] = async () => {
  const g = 'pocket-jury'; let p = await open(g);
  for (let docket = 0; docket < 2; docket++) {
    for (let c = 0; c < 8; c++) {
      for (const n of [0, 1, 2]) await tap(p, 170, 232 + n * 87 + 36);
      const dec = await p.evaluate(() => juryCases[state.case].decisive); await tap(p, 170, 232 + dec * 87 + 36); await ctl(p, 'mark');
      await ctl(p, (await p.evaluate(() => juryCases[state.case].guilty)) ? 'guilty' : 'clear');
      if (!(await p.evaluate(() => state.resolved))) { note(g, `docket ${docket + 1} case ${c + 1}: verdict did not register`); break; }
      await ctl(p, 'next');
    }
    const fin = await p.evaluate(() => ({ docket: state.docket, score: state.score, over: state.over })); console.log('  docket', JSON.stringify(fin));
    if (fin.score !== 1200 || !fin.over) note(g, `docket ${docket + 1}: perfect run did not reach 1200 and the end card`);
    if (docket === 0) { await tap(p, 480, 375); if ((await p.evaluate(() => state.case)) !== 8) { note(g, 'the Docket 2 button did not open case 9'); break; } }
  }
  const over = await p.evaluate(() => { const out = [], fit = (s, font, w) => { ctx.font = font; let rows = 1, row = ''; for (const x of s.split(' ')) { if (ctx.measureText(row + x).width > w && row) { rows++; row = ''; } row += x + ' '; } return rows; };
    for (const c of juryCases) { for (const [t, body] of c.cards) { if (fit(body, `600 22px ${FONT}`, 535) > 5) out.push(c.title + ' / ' + t); ctx.font = `600 16px ${FONT}`; if (ctx.measureText(t).width > 240) out.push('label: ' + t); } if (fit(c.brief, `600 17px ${FONT}`, 832) > 2) out.push(c.title + ' brief'); if (fit('VERDICT OVERTURNED. ' + c.explain, `600 15px ${FONT}`, 850) > 2) out.push(c.title + ' explanation'); ctx.font = `850 25px ${FONT}`; if (ctx.measureText(c.title).width > 840) out.push('title ' + c.title); }
    return { out, n: juryCases.length, guilty: juryCases.filter(c => c.guilty).length, dec: juryCases.map(c => c.decisive).join('') }; });
  console.log('  cases', over.n, 'guilty', over.guilty, 'decisive', over.dec);
  if (over.out.length) note(g, 'text overflows: ' + over.out.join('; '));
  await fuzz(p, 120); await finish(p, g);
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
