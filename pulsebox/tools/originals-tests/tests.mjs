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

T['switchyard'] = async () => {
  const g = 'switchyard'; let p = await open(g);
  for (let sh = 0; sh < 4; sh++) {
    await p.evaluate(sh => { sySave.unlocked = 4; GAMES[ID].begin(sh); }, sh);
    const res = await p.evaluate(sh => {
      let collisions = 0; const st0 = status; status = s => { if (/Collision/.test(s)) collisions++; st0(s); };
      for (let s = 0; s < (sh === 3 ? 400 : 230) && !state.over; s += 1 / 60) {
        for (const [j, x0] of [[0, 245], [1, 490], [2, 710]]) {
          const next = state.trains.filter(t => t.x < x0 && (j === 0 ? t.route === null : j === 1 ? (t.route === 2 || t.route === null) : (t.route === 3 || t.route === 2 || t.route === null))).sort((a, b) => b.x - a.x)[0];
          if (next) state.switches[j] = next.target === 0 ? 0 : 1;
        }
        GAMES[ID].update(1 / 60);
      }
      status = st0; return { points: state.points, delivered: state.delivered, lives: state.lives, over: state.over, clock: Math.round(state.clock), collisions };
    }, sh);
    console.log('  shift', sh + 1, JSON.stringify(res));
    if (sh < 3 && res.lives < 3) note(g, `shift ${sh + 1}: careful switching still lost ${3 - res.lives} lives (${res.collisions} merge crashes)`);
    if (sh < 3 && !res.over) note(g, `shift ${sh + 1} did not end`);
  }
  // menu taps start a shift; Play again replays it
  await p.evaluate(() => { sySave.unlocked = 1; state = GAMES[ID].init(); state.mode = 'menu'; GAMES[ID].ui(); });
  await tap(p, 60 + 97, 200 + 257); if ((await p.evaluate(() => state.mode)) !== 'play') note(g, 'tapping Start on the menu did not start the shift');
  await p.evaluate(() => { state.shift = 1; reset(); }); if ((await p.evaluate(() => state.mode + state.shift)) !== 'play1') note(g, 'Play again did not replay the same shift');
  await fuzz(p, 100, ['1', '2', '3']); await finish(p, g);
};

T['potion-protocol'] = async () => {
  const g = 'potion-protocol'; let p = await open(g);
  const r = await p.evaluate(() => {
    const out = [];
    for (let rank = 0; rank < 3; rank++) {
      const R = RANKS[rank], all = [];
      const rec = (cur) => { if (cur.length === R.slots) { all.push(cur); return; } for (let i = 0; i < R.kinds; i++) if (R.repeat || !cur.includes(i)) rec([...cur, i]); }; rec([]);
      let worst = 0, fails = 0, tries = 0; const sample = all.length > 400 ? all.filter((_, i) => i % Math.ceil(all.length / 400) === 0) : all;
      for (const secret of sample) {
        state = potionNew(false, rank); state.secret = secret.slice(); let cand = all.slice();
        while (!state.over) { const gs = cand[Math.floor(cand.length / 2)]; gs.forEach(i => GAMES[ID].action('pick' + i)); GAMES[ID].action('test'); const h = state.history.at(-1); cand = cand.filter(c => { const f = potionScore(gs, c); return f.exact === h.exact && f.near === h.near; }); }
        tries++; if (!state.won) fails++; worst = Math.max(worst, state.history.length);
      }
      out.push({ rank: R.name, secrets: tries, worst, fails });
    }
    return out;
  });
  console.log('  solver:', JSON.stringify(r));
  for (const x of r) if (x.fails / x.secrets > .03) note(g, `${x.rank}: a sensible solver fails ${x.fails}/${x.secrets} recipes`);
  await p.evaluate(() => { state = potionNew(false, 0); GAMES[ID].ui(); });
  for (const n of [0, 1, 2]) await tap(p, 602 + n * 104 + 45, 126 + 47);
  await tap(p, 750, 470); if ((await p.evaluate(() => state.history.length)) !== 1) note(g, 'canvas picks + TEST RECIPE did not run a test');
  await ctl(p, 'rank'); await ctl(p, 'rank'); const rk = await p.evaluate(() => [state.rank, state.secret.length, new Set(state.secret).size]); console.log('  archmage secret', rk);
  await fuzz(p, 120, ['1', '5', '8', 'Enter', 'Backspace']); await finish(p, g);
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

T['cloudwash'] = async () => {
  const g = 'cloudwash'; let p = await open(g);
  const times = [];
  for (let lv = 0; lv < 11; lv++) {
    const t = await p.evaluate(() => { pointer.down = true; for (let pass = 0; pass < 80 && !state.won; pass++) { if (state.level >= 3) state.nozzle = pass % 2 ? 'jet' : 'fan'; for (let y = 110; y < 550 && !state.won; y += (state.nozzle === 'jet' ? 24 : 40)) for (let x = 40; x < 926 && !state.won; x += 12) { if (state.water <= 0) { pointer.down = false; for (let s = 0; s < 3.7; s += .05) GAMES[ID].update(.05); pointer.down = true; } pointer.x = x; pointer.y = pass % 2 ? 650 - y : y; GAMES[ID].update(.05); } } pointer.down = false; return state.won ? Math.round(state.time) + 's/' + state.starsWon + '★' : -1; });
    times.push(t); if (t === -1) { note(g, `mural ${lv + 1} could not be finished`); break; }
    await ctl(p, 'next');
  }
  console.log('  per mural (sweep bot):', times.join(', '), '→ now on', await p.evaluate(() => state.level));
  await fuzz(p, 100); await finish(p, g);
};

T['circuit-courier'] = async () => {
  const g = 'circuit-courier'; let p = await open(g);
  for (let lv = 0; lv < 16; lv++) {
    const prog = await p.evaluate(() => {
      const m = state.map, bfs = (a, b) => { const q = [[a, []]], seen = new Set([a.join()]); while (q.length) { const [[x, y], path] = q.shift(); if (x === b[0] && y === b[1]) return path; for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= 7 || ny >= 5 || m[ny][nx] === '#' || seen.has(nx + ',' + ny)) continue; seen.add(nx + ',' + ny); q.push([[nx, ny], [...path, [dx, dy]]]); } } return null; };
      const find = ch => { const i = m.join('').indexOf(ch); return [i % 7, Math.floor(i / 7)]; };
      const a = bfs(find('S'), find('P')), b = bfs(find('P'), find('G')); if (!a || !b) return null;
      let dir = 0, out = []; const D = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      for (const [dx, dy] of [...a, ...b]) { const want = D.findIndex(d => d[0] === dx && d[1] === dy); const turn = (want - dir + 4) % 4; if (turn === 1) out.push('R'); if (turn === 3) out.push('L'); if (turn === 2) out.push('R', 'R'); dir = want; out.push('F'); }
      return out;
    });
    const par = await p.evaluate(() => state.par);
    if (!prog) { note(g, `route ${lv + 1} has no path`); break; }
    if (prog.length > 32) note(g, `route ${lv + 1} needs ${prog.length} commands without loops (max 32)`);
    await ctl(p, 'clear'); for (const c of prog.slice(0, 32)) await ctl(p, c);
    await ctl(p, 'run'); await sim(p, prog.length * .4 + 2);
    const st = await p.evaluate(() => ({ won: state.won, msg: state.msg, stars: state.starsWon }));
    console.log(`  route ${lv + 1}: par ${par}, program ${prog.length}, ${st.won ? st.stars + '★' : 'FAILED'}`);
    if (!st.won) { note(g, `route ${lv + 1}: correct program did not deliver (${st.msg})`); break; }
    if (prog.length < par) note(g, `route ${lv + 1}: par ${par} is above a ${prog.length}-command solution`);
    await ctl(p, 'next');
  }
  await fuzz(p, 100, ['ArrowUp', 'ArrowLeft', ' ', 'f']); await sim(p, 30); await finish(p, g);
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
