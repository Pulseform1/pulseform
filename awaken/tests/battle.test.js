// Gate battles: waves, finishing blows, escalating wave rewards, defeat phase, no farming via retreat.
const { assert, quiet, awaken, clearSession, page } = require('./helpers');
(async () => {
  const { b, p, errors } = await page();
  await awaken(p); await quiet(p);
  await p.evaluate(() => { S.player.mp = 200; S.gear.owned.push('knuckle'); S.gear.eq.weapon = 'knuckle'; S.gates.list.push({ ...makeGate(rng('bt-c'), 2), id: 'bt' }); });
  const info = await p.evaluate(() => { const g = S.gates.list.find(x => x.id === 'bt'); return { rounds: g.rounds, foes: Array.from({ length: g.rounds }, (_, w) => foeFor(g, w)) }; });
  assert(info.rounds >= 3 && info.foes.slice(0, -1).every(f => !f.boss) && info.foes[info.rounds - 1].boss, 'minion waves first, the boss last');
  await p.evaluate(() => { UI.tab = 'gates'; UI.sheet = { kind: 'gate', id: 'bt' }; refresh(); });
  assert(await p.locator('#sheet .waves li').count() >= info.rounds, 'the gate preview lists every wave');
  await p.evaluate(() => enterGate('bt')); await quiet(p);
  await p.evaluate(() => { S.session.adj = 1; refresh(); }); await p.click('[data-a=setDone]');
  const h1 = await p.evaluate(() => ({ wdmg: S.session.wdmg, hp: waveHP(S.session.g, 0), combo: S.session.combo, dmg: !!document.querySelector('.dmg') }));
  assert(h1.wdmg > 0 && h1.wdmg < h1.hp && h1.combo === 0 && h1.dmg, 'a short set strikes but cannot end the wave and breaks the combo');
  // finish the rest of the gate quickly in code, collecting each wave's pay
  const pays = await p.evaluate(() => { const out = []; let guard = 0;
    while (S.session && S.session.phase !== 'defeat' && guard++ < 200) { const s = S.session, set = s.g.sets[s.i]; if (s.phase === 'rest') { nextSet(); continue; } const before = s.waves.length; completeSet(set.target); if (S.session.waves.length > before) out.push(S.session.waves[S.session.waves.length - 1]); }
    return { out, phase: S.session && S.session.phase }; });
  assert(pays.out.length === info.rounds - 1 && pays.out.every((w, i) => i === 0 || w.gold >= pays.out[i - 1].gold), 'every minion wave pays, and each pays at least as much as the last ' + pays.out.map(w => w.gold).join(' <= '));
  assert(pays.phase === 'defeat', 'the boss plays a defeat before the rewards');
  await p.waitForSelector('.scr-gate', { state: 'detached', timeout: 6000 }).catch(() => {}); await p.waitForTimeout(300);
  const end = await p.evaluate(() => ({ s: !!S.session, n: [curN, ...NQ].find(x => x && /Cleared/.test(x.head)) }));
  assert(!end.s && end.n && end.n.rewards.some(r => r[0] === 'Wave rewards'), 'the clear summary lists wave rewards');
  await quiet(p);
  const farm = await p.evaluate(() => { S.player.mp = 999; S.gates.list.push({ ...makeGate(rng('farm'), 2), id: 'f1' }); const out = [];
    for (let loop = 0; loop < 3; loop++) { const g0 = S.player.gold; enterGate('f1');
      while (S.session && S.session.g.sets[S.session.i].round === 0) { completeSet(0); if (S.session.phase === 'rest') nextSet(); }
      out.push(S.player.gold - g0); retreat(); while (curN || NQ.length) { NQ.length = 0; closeNotify(); } }
    return out; });
  assert(farm[0] > 0 && farm[1] === 0 && farm[2] === 0, 'retreating and re-entering does not pay the same wave again ' + farm.join(','));
  const def = await p.evaluate(() => { enterGate('f1'); S.session.phase = 'defeat'; S.session.defeatAt = Date.now(); retreat(); return !!S.session; });
  assert(def, 'no retreat once the boss is defeated');
  assert(errors.length === 0, 'no page errors ' + JSON.stringify(errors));
  await b.close();
})();
