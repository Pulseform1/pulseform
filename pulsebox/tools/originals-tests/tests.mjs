import { B, issues, note, open, tap, ctl, sim, fuzz, finish } from './lib.mjs';
const T = {};

T['baggage-panic'] = async () => {
  const g = 'baggage-panic'; let p = await open(g);
  // solve 8 suitcases with real taps: rotate each item until it matches its solution shape, then tap its spot
  for (let lv = 1; lv <= 8; lv++) {
    for (let i = 0; i < 6; i++) {
      await p.evaluate(i => { state.selected = i; }, i);
      let ok = false;
      for (let r = 0; r < 4 && !ok; r++) {
        ok = await p.evaluate(i => { const it = state.parts[i], s = it.solution.shape, norm = c => JSON.stringify(c.map(a => a.join()).sort()), mn = sh => { const mx = Math.min(...sh.map(a => a[0])), my = Math.min(...sh.map(a => a[1])); return sh.map(([x, y]) => [x - mx, y - my]); }; return norm(it.cells) === norm(mn(s)); }, i);
        if (!ok) await ctl(p, 'rotate');
      }
      if (!ok) { note(g, `suitcase ${lv} item ${i}: rotation never matches the solution`); break; }
      const pos = await p.evaluate(i => { const it = state.parts[i], s = it.solution.shape; return { x: it.solution.x + Math.min(...s.map(a => a[0])), y: it.solution.y + Math.min(...s.map(a => a[1])) }; }, i);
      await tap(p, 57 + pos.x * 64 + 30, 125 + pos.y * 64 + 30);
    }
    const st = await p.evaluate(() => ({ won: state.won, level: state.level, packed: state.parts.filter(x => x.placed).length }));
    if (!st.won) note(g, `suitcase ${lv}: not won after placing the solution (${st.packed}/6)`);
    if (st.level !== lv) note(g, `suitcase counter shows ${st.level} on the ${lv}th suitcase`);
    await ctl(p, 'next');
  }
  // undo should take back the item placed last
  await p.evaluate(() => reset());
  const order = await p.evaluate(() => { const placed = []; for (const i of [3, 0]) { const it = state.parts[i], s = it.solution.shape; state.selected = i; it.cells = (() => { const mx = Math.min(...s.map(a => a[0])), my = Math.min(...s.map(a => a[1])); return s.map(([x, y]) => [x - mx, y - my]); })(); GAMES[ID].pointer('down', { x: 57 + (it.solution.x + Math.min(...s.map(a => a[0]))) * 64 + 30, y: 125 + (it.solution.y + Math.min(...s.map(a => a[1]))) * 64 + 30 }); placed.push(i); } GAMES[ID].action('undo'); return state.parts.map(x => !!x.placed); });
  if (!(order[0] === false && order[3] === true)) note(g, '"Undo last" did not take back the item placed last');
  // suitcase numbers far ahead: does generation ever skip numbers?
  const skips = await p.evaluate(() => { const out = []; for (let lv = 1; lv <= 60; lv++) { const s = packNew(lv); if (s.level !== lv) out.push(lv + '→' + s.level); } return out; });
  if (skips.length) note(g, 'suitcase number jumps when generation retries: ' + skips.slice(0, 6).join(', '));
  await fuzz(p, 120, ['r', 'R']); await finish(p, g);
};

T['switchyard'] = async () => {
  const g = 'switchyard'; let p = await open(g);
  // a perfect dispatcher: always route the next train to reach each junction
  const res = await p.evaluate(() => {
    let collisions = 0; const st0 = status; status = s => { if (/Collision/.test(s)) collisions++; st0(s); };
    for (let s = 0; s < 200 && !state.over; s += 1 / 60) {
      for (const [j, x0] of [[0, 245], [1, 490], [2, 710]]) {
        const next = state.trains.filter(t => t.x < x0 && (j === 0 ? t.route === null : j === 1 ? t.route === 2 : t.route === 3 || t.route === 2 || t.route === null)).sort((a, b) => b.x - a.x)[0];
        if (!next) continue;
        const want = j === 0 ? (next.target === 0 ? 0 : 1) : j === 1 ? (next.target === 0 ? 0 : 1) : (next.target === 0 ? 0 : 1);
        if (state.switches[j] !== want) state.switches[j] = want;
      }
      GAMES[ID].update(1 / 60);
    }
    return { delivered: state.delivered, lives: state.lives, over: state.over, clock: state.clock, collisions };
  });
  console.log('  perfect dispatcher:', JSON.stringify(res));
  if (res.lives < 3) note(g, `even perfect switching loses lives (${res.collisions} collisions, ${3 - res.lives} lives lost in ${Math.round(res.clock)}s)`);
  // the shift lasts 180 s and the end card appears
  if (!res.over) note(g, 'shift did not end');
  await p.evaluate(() => reset()); await fuzz(p, 100, ['1', '2', '3']);
  const lives = await p.evaluate(() => { for (let s = 0; s < 400; s += 1 / 30) GAMES[ID].update(1 / 30); return state.lives; });
  if (lives < 0) note(g, 'signal lives counter goes negative (' + lives + ')');
  await finish(p, g);
};

T['potion-protocol'] = async () => {
  const g = 'potion-protocol'; let p = await open(g);
  // a consistent-guess solver must always crack the recipe within 8 tests
  const r = await p.evaluate(() => {
    const perms = []; for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) for (let c = 0; c < 6; c++) if (a !== b && b !== c && a !== c) perms.push([a, b, c]);
    const fb = (gs, s) => { const e = gs.filter((v, i) => v === s[i]).length; return [e, gs.filter(v => s.includes(v)).length - e]; };
    let worst = 0, fails = 0;
    for (const secret of perms) {
      state = potionNew(); state.secret = secret.slice(); let cand = perms.slice();
      while (!state.over) { const gs = cand[0]; gs.forEach(i => GAMES[ID].action('pick' + i)); GAMES[ID].action('test'); const h = state.history.at(-1); cand = cand.filter(c => { const [e, n] = fb(gs, c); return e === h.exact && n === h.near; }); }
      if (!state.won) fails++; worst = Math.max(worst, state.history.length);
    }
    return { worst, fails, total: perms.length };
  });
  console.log('  solver over all 120 recipes:', JSON.stringify(r));
  if (r.fails) note(g, `${r.fails} recipes can't be cracked in 8 tests by a sensible player`);
  // real clicks: pick three on the canvas and test
  await p.evaluate(() => reset());
  for (const n of [0, 1, 2]) await tap(p, 604 + n % 3 * 104 + 45, 153 + 48);
  await tap(p, 750, 520);
  const h = await p.evaluate(() => state.history.length); if (h !== 1) note(g, 'clicking ingredients + TEST RECIPE on the canvas did not run a test');
  await ctl(p, 'daily'); const d1 = await p.evaluate(() => state.secret.join()); await ctl(p, 'practice'); await ctl(p, 'daily'); const d2 = await p.evaluate(() => state.secret.join());
  if (d1 !== d2) note(g, 'daily recipe changes between loads');
  await fuzz(p, 120, ['1', '2', 'Enter', 'Backspace']); await finish(p, g);
};

T['safecracker'] = async () => {
  const g = 'safecracker'; let p = await open(g);
  // open all five vaults with the arrow keys and Enter
  for (let v = 0; v < 5; v++) {
    for (let s = 0; s < 3; s++) {
      const want = await p.evaluate(() => GAMES[ID].target().n), have = await p.evaluate(() => state.dial);
      let d = (want - have + 100) % 100; const key = d <= 50 ? 'ArrowRight' : 'ArrowLeft'; d = d <= 50 ? d : 100 - d;
      for (let i = 0; i < d; i++) await p.keyboard.press(key);
      await p.keyboard.press('Enter');
    }
    const st = await p.evaluate(() => ({ won: state.won, vault: state.vault, score: state.score }));
    if (!st.won) { note(g, `vault ${v + 1} did not open with the right numbers`); break; }
    if (v < 4) await ctl(p, 'next');
  }
  const fin = await p.evaluate(() => ({ score: state.score, vault: state.vault })); console.log('  all vaults:', JSON.stringify(fin));
  await p.evaluate(() => reset()); await ctl(p, 'set'); await p.keyboard.press('Enter');
  const m = await p.evaluate(() => state.mistakes); if (m !== 2) note(g, `clicking Set tumbler then pressing Enter counted ${m} entries (expected 2)`);
  // three wrong entries lock it
  await p.evaluate(() => reset()); for (let i = 0; i < 3; i++) await p.keyboard.press('Enter');
  if (!(await p.evaluate(() => state.over))) note(g, 'three wrong entries did not lock the vault');
  // dragging around the dial edge should turn it smoothly; a tap near the very center should not spin it wildly
  await p.evaluate(() => reset());
  const r = await p.locator('#game').boundingBox(), sx = r.width / 960, sy = r.height / 600;
  await p.mouse.move(r.x + 305 * sx, r.y + (325 - 160) * sy); await p.mouse.down();
  for (let a = 0; a <= Math.PI / 2 + .01; a += .1) await p.mouse.move(r.x + (305 + Math.sin(a) * 160) * sx, r.y + (325 - Math.cos(a) * 160) * sy);
  await p.mouse.up(); const dial = await p.evaluate(() => state.dial);
  if (Math.abs(dial - 25) > 2) note(g, `dragging a quarter turn left the dial at ${dial} (expected ~25)`);
  const before = await p.evaluate(() => state.dial); await tap(p, 308, 322); const after = await p.evaluate(() => state.dial);
  if (before !== after) note(g, `tapping the center of the dial jumps it from ${before} to ${after}`);
  await fuzz(p, 120, ['ArrowLeft', 'ArrowRight', 'Enter', ' ']); await finish(p, g);
};

T['magnet-rescue'] = async () => {
  const g = 'magnet-rescue'; let p = await open(g);
  // the cable can't be lowered through the floor
  const floor = await p.evaluate(() => { for (let i = 0; i < 30; i++) GAMES[ID].action('down'); for (let s = 0; s < 3; s += 1 / 60) GAMES[ID].update(1 / 60); return { magnet: GAMES[ID].pos().y, len: state.length }; });
  if (floor.magnet + 10 > 513) note(g, `the magnet can be lowered into the floor (magnet at y=${Math.round(floor.magnet)}, floor at 513)`);
  // a controller that rescues every robot
  await p.evaluate(() => reset());
  const res = await p.evaluate(() => {
    const step = t => { for (let s = 0; s < t; s += 1 / 60) GAMES[ID].update(1 / 60); };
    const settle = (x, max = 8) => { state.target = x; for (let s = 0; s < max; s += 1 / 60) { GAMES[ID].update(1 / 60); if (Math.abs(state.crane - x) < 2 && Math.abs(state.omega) < .05 && Math.abs(state.angle) < .05) break; } };
    for (let k = 0; k < 5; k++) {
      const i = state.robots.findIndex(r => !r.saved && !r.lost); if (i < 0) break; const r = state.robots[i];
      state.length = 180; settle(r.x); state.length = 383; settle(r.x, 3); if (!state.magnet) GAMES[ID].action('magnet'); step(.5);
      if (state.held !== i) { GAMES[ID].action('magnet'); continue; }
      state.length = 150; step(1); settle(820); state.length = 330; settle(820, 3); GAMES[ID].action('magnet'); step(2);
    }
    return { rescued: state.rescued, lives: state.lives, won: state.won };
  });
  console.log('  controller:', JSON.stringify(res));
  if (!res.won) note(g, `scripted careful play only rescued ${res.rescued}/5`);
  // losing everything: the end card should not throw a celebration
  await p.evaluate(() => { reset(); state.lives = 0; GAMES[ID].update(1 / 60); render(); });
  const title = await p.evaluate(() => state.over && !state.won); if (title) { /* look at the title text used */ }
  // a robot dropped gently into the bay but too fast
  await fuzz(p, 120, ['a', 'd', 'w', 's', ' ', 'ArrowLeft', 'ArrowRight']); await finish(p, g);
};

T['pocket-jury'] = async () => {
  const g = 'pocket-jury'; let p = await open(g);
  for (let c = 0; c < 8; c++) {
    for (const n of [0, 1, 2]) await tap(p, 170, 232 + n * 87 + 36);
    const dec = await p.evaluate(() => juryCases[state.case].decisive); await tap(p, 170, 232 + dec * 87 + 36); await ctl(p, 'mark');
    await ctl(p, (await p.evaluate(() => juryCases[state.case].guilty)) ? 'guilty' : 'clear');
    if (!(await p.evaluate(() => state.resolved))) { note(g, `case ${c + 1}: verdict did not register`); break; }
    await ctl(p, 'next');
  }
  const fin = await p.evaluate(() => ({ score: state.score, over: state.over })); console.log('  perfect run:', JSON.stringify(fin));
  if (fin.score !== 1200 || !fin.over) note(g, 'a perfect run did not reach 1200 and the end card');
  // verdict before reading everything should be refused
  await p.evaluate(() => reset()); await ctl(p, 'guilty'); if (await p.evaluate(() => state.resolved)) note(g, 'a verdict was accepted without reading the exhibits');
  // text that doesn't fit: check every brief/card wraps inside its box
  const over = await p.evaluate(() => { const out = []; ctx.font = `600 22px ${FONT}`; for (const c of juryCases) { for (const [t, body] of c.cards) { let rows = 1, row = ''; for (const w of body.split(' ')) { if (ctx.measureText(row + w).width > 535 && row) { rows++; row = ''; } row += w + ' '; } if (305 + (rows - 1) * 33 > 440) out.push(c.title + ' / ' + t + ' (' + rows + ' lines)'); } ctx.font = `600 17px ${FONT}`; let rows = 1, row = ''; for (const w of c.brief.split(' ')) { if (ctx.measureText(row + w).width > 832 && row) { rows++; row = ''; } row += w + ' '; } if (rows > 2) out.push(c.title + ' brief (' + rows + ' lines)'); ctx.font = `600 15px ${FONT}`; rows = 1; row = ''; for (const w of ('VERDICT OVERTURNED. ' + c.explain).split(' ')) { if (ctx.measureText(row + w).width > 850 && row) { rows++; row = ''; } row += w + ' '; } if (rows > 2) out.push(c.title + ' explanation (' + rows + ' lines)'); } return out; });
  if (over.length) note(g, 'text overflows its box: ' + over.join('; '));
  await fuzz(p, 120); await finish(p, g);
};

T['cloudwash'] = async () => {
  const g = 'cloudwash'; let p = await open(g);
  const times = [];
  for (let lv = 0; lv < 6; lv++) {
    const t = await p.evaluate(() => { let t = 0; pointer.down = true; for (let pass = 0; pass < 40 && !state.won; pass++) for (let y = 110; y < 550 && !state.won; y += 40) for (let x = 40; x < 926 && !state.won; x += 12) { if (state.water <= 0) { pointer.down = false; for (let s = 0; s < 3.5; s += .05) { GAMES[ID].update(.05); t += .05; } pointer.down = true; } pointer.x = x; pointer.y = pass % 2 ? 650 - y : y; GAMES[ID].update(.05); t += .05; } pointer.down = false; return state.won ? Math.round(state.time) : -1; });
    times.push(t); if (t < 0) { note(g, `mural ${lv + 1} could not be finished by sweeping`); break; }
    await ctl(p, 'next');
  }
  console.log('  seconds per mural (sweep bot):', times.join(', '), ' level now', await p.evaluate(() => state.level));
  // real drag spraying cleans
  await p.evaluate(() => reset()); const r = await p.locator('#game').boundingBox();
  await p.mouse.move(r.x + r.width * .3, r.y + r.height * .5); await p.mouse.down();
  for (let i = 0; i < 20; i++) { await p.mouse.move(r.x + r.width * (.3 + i * .02), r.y + r.height * .5); await p.waitForTimeout(30); }
  await p.mouse.up(); const c = await p.evaluate(() => state.dirt.filter(d => d < .7).length);
  if (!c) note(g, 'dragging on the wall did not clean anything');
  await fuzz(p, 100); await finish(p, g);
};

T['circuit-courier'] = async () => {
  const g = 'circuit-courier'; let p = await open(g);
  for (let lv = 0; lv < 8; lv++) {
    // shortest route: start → parcel → goal, as commands
    const prog = await p.evaluate(() => {
      const m = state.map, bfs = (a, b) => { const q = [[a, []]], seen = new Set([a.join()]); while (q.length) { const [[x, y], path] = q.shift(); if (x === b[0] && y === b[1]) return path; for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= 7 || ny >= 5 || m[ny][nx] === '#' || seen.has(nx + ',' + ny)) continue; seen.add(nx + ',' + ny); q.push([[nx, ny], [...path, [dx, dy]]]); } } return null; };
      const find = ch => { const i = m.join('').indexOf(ch); return [i % 7, Math.floor(i / 7)]; };
      const steps = [...bfs(find('S'), find('P')), ...bfs(find('P'), find('G'))]; let dir = 0, out = []; const D = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      for (const [dx, dy] of steps) { const want = D.findIndex(d => d[0] === dx && d[1] === dy); const turn = (want - dir + 4) % 4; if (turn === 1) out.push('R'); if (turn === 3) out.push('L'); if (turn === 2) out.push('R', 'R'); dir = want; out.push('F'); }
      return out;
    });
    if (prog.length > 32) { note(g, `route ${lv + 1} needs ${prog.length} commands (max 32 without loops)`); }
    await ctl(p, 'clear'); for (const c of prog.slice(0, 32)) await ctl(p, c);
    await ctl(p, 'run'); await sim(p, prog.length * .4 + 2);
    const st = await p.evaluate(() => ({ won: state.won, failed: state.failed, msg: state.msg }));
    if (!st.won) { note(g, `route ${lv + 1}: correct program did not deliver (${st.msg})`); break; }
    await ctl(p, 'next');
  }
  console.log('  finished on route', (await p.evaluate(() => state.level)) + 1);
  await fuzz(p, 120, ['ArrowUp', 'ArrowLeft', 'ArrowRight', ' ', 'f', 'l', 'r']); await sim(p, 30); await finish(p, g);
};

T['bid-bandits'] = async () => {
  const g = 'bid-bandits'; let p = await open(g);
  for (const strat of ['pass', 'greedy', 'smart', 'reader']) {
    await p.evaluate(() => reset());
    for (let r = 0; r < 6; r++) {
      for (let k = 0; k < 80 && !(await p.evaluate(() => state.resolved)); k++) {
        const s = await p.evaluate(() => ({ bid: state.bid, lead: state.leader, est: state.lot.estimate, money: state.money[0], value: state.lot.value, cond: state.lot.cond || '' }));
        const want = strat === 'pass' ? false : strat === 'greedy' ? s.bid + 50 <= s.money : strat === 'smart' ? s.bid + 50 <= Math.min(s.money, (s.est[0] + s.est[1]) / 2) : s.bid + 50 <= Math.min(s.money, (s.est[0] + s.est[1]) / 2 * (/nearly new/.test(s.cond) ? 1.25 : /clean/.test(s.cond) ? 1.05 : /Dusty/.test(s.cond) ? .85 : .6));
        if (want && s.lead !== 0) await ctl(p, 'bid'); else await ctl(p, 'pass');
      }
      if (!(await p.evaluate(() => state.resolved))) { note(g, `${strat}: auction ${r + 1} never settled`); break; }
      await ctl(p, 'next');
    }
    const fin = await p.evaluate(() => ({ over: state.over, money: state.money, profit: state.profit }));
    console.log('  ' + strat + ':', JSON.stringify(fin)); (globalThis.BID ||= {})[strat] = fin;
    if (!fin.over) note(g, strat + ': the day did not end after six lockers');
  }
  await fuzz(p, 150); await finish(p, g);
};

T['foldscape'] = async () => {
  const g = 'foldscape'; let p = await open(g);
  const gen = await p.evaluate(() => { const out = []; for (let lv = 0; lv < 8; lv++) { const t0 = performance.now(), s = foldNew(lv); out.push({ lv, ms: Math.round(performance.now() - t0), sol: s.solution.join(''), fallback: s.cells.length === 3 }); } return out; });
  console.log('  generation:', gen.map(x => `#${x.lv + 1} ${x.ms}ms ${x.sol}${x.fallback ? ' FALLBACK' : ''}`).join(' | '));
  for (const x of gen) { if (x.fallback) note(g, `map ${x.lv + 1} fell back to the built-in map`); if (x.ms > 400) note(g, `map ${x.lv + 1} takes ${x.ms} ms to generate`); }
  const fb = await p.evaluate(() => { const s = { cells: [[0, 0, 0, 0], [2, 10, 0, 2], [0, 0, 0, 0]], fox: { x: 0, y: 1 }, home: { x: 3, y: 1 } }; const b = foldMap(s, 'R'); return foldConnected(b); });
  if (!fb) note(g, 'the built-in fallback map cannot be solved with its listed solution (latent; only used if generation fails)');
  for (let lv = 0; lv < 8; lv++) {
    const sol = await p.evaluate(() => state.solution);
    for (const d of sol) await ctl(p, d);
    if (!(await p.evaluate(() => state.won))) { note(g, `map ${lv + 1}: following the solution did not connect the path`); break; }
    await ctl(p, 'next');
  }
  // hint timing on a fresh map and after bad folds
  await p.evaluate(() => reset());
  const ht = await p.evaluate(() => { const t0 = performance.now(); GAMES[ID].action('hint'); return Math.round(performance.now() - t0); }); console.log('  hint takes', ht, 'ms');
  if (ht > 300) note(g, `Hint freezes the page for ${ht} ms`);
  await fuzz(p, 120); await finish(p, g);
};

// engine-level: restart while the help card is open should not run the game behind it
T['engine'] = async () => {
  const p = await open('switchyard');
  await p.locator('#help').click(); await p.locator('#restart').click(); await p.waitForTimeout(1200);
  const st = await p.evaluate(() => ({ paused, card: !document.getElementById('start').hidden, clock: state.clock }));
  if (st.card && !st.paused) note('engine (all 10 games)', `pressing Restart while the help card is open starts the game running behind the card (clock ${st.clock.toFixed(1)}s)`);
  // resize and phone layout: no errors
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300); await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(300);
  await finish(p, 'engine');
};

const only = process.argv.slice(2), list = only.length ? only : Object.keys(T);
for (const k of list) { console.log('▶ ' + k); try { await T[k](); } catch (e) { note(k, 'TEST CRASH ' + e.message.split('\n')[0]); } }
console.log('\n==== ' + issues.length + ' issues'); issues.forEach(x => console.log(' - ' + x));
await B.close();
