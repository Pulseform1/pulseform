// Day cycle, penalties, holds, import repair, layout at 320px.
const { assert, quiet, awaken, page } = require('./helpers');
(async () => {
  const { b, p, errors } = await page('Pixel 7');
  await awaken(p); await quiet(p);
  const r1 = await p.evaluate(() => { S.settings.resetHour = 6; CHANGE.reset({ value: '0' }); return { penalty: !!S.penalty, fails: Object.values(S.history).filter(h => h.s === 'fail').length, same: S.daily.date === dayKey() }; });
  assert(!r1.penalty && r1.fails === 0 && r1.same, "changing the reset hour keeps today's quest without a penalty");
  const r2 = await p.evaluate(() => { S.daily.date = addDays(dayKey(), 1); const rolled = rollover(); const res = { rolled, penalty: !!S.penalty }; S.daily.date = dayKey(); return res; });
  assert(!r2.rolled && !r2.penalty, 'a clock moving backwards does not trigger a rollover');
  const r3 = await p.evaluate(() => {
    const y = () => addDays(dayKey(), -1);
    S.daily.date = y(); S.daily.grace = false; S.daily.rest = false; S.inv.ward = 1; rollover();
    const ward = { penalty: !!S.penalty, wards: S.inv.ward, s: S.history[y()].s };
    S.daily.date = y(); S.daily.cleared = false; S.daily.rest = false; S.daily.grace = false; rollover();
    const fail = { penalty: !!S.penalty, s: S.history[y()].s, streak: S.streak.cur };
    S.penalty = null; S.daily.date = y(); S.daily.cleared = false; S.daily.grace = true; S.daily.rest = false; rollover();
    return { ward, fail, grace: { penalty: !!S.penalty, s: S.history[y()].s } };
  });
  assert(!r3.ward.penalty && r3.ward.wards === 0 && r3.ward.s === 'ward', 'a Penalty Ward absorbs a missed day');
  assert(r3.fail.penalty && r3.fail.s === 'fail' && r3.fail.streak === 0, 'a missed day without a ward starts the Penalty Quest and resets the streak');
  assert(!r3.grace.penalty && r3.grace.s === 'rest', 'missing the awakening day is not penalised');
  await p.evaluate(() => { S.penalty = makePenalty(); refresh(); }); await quiet(p); await p.waitForTimeout(200);
  await p.click('[data-a=pen][data-x="1"]'); await p.click('[data-a=holdToggle]'); await p.waitForTimeout(2200);
  assert(/Log [12] s/.test(await p.textContent('#hold-log')), 'plank Log button updates live');
  await p.click('.sheet .icon-btn[data-a=sheetClose]');
  assert(await p.evaluate(() => S.penalty.tasks[1].done) >= 2, 'closing the plank timer logs the held seconds');
  const r5 = await p.evaluate(() => {
    S.penalty = null; S.player.mp = 100;
    const g = { ...makeGate(rng('t'), 0), id: 'x' }; g.sets = [{ ex: 'plank', target: 30, round: 0, hp: 150 }, { ex: 'pushup', target: 5, round: 0, hp: 50 }];
    S.gates.list.push(g); enterGate('x'); const before = S.totals.ex.plank || 0; ACT.timeDone(); return (S.totals.ex.plank || 0) - before;
  });
  assert(r5 === 30, 'finishing an untimed hold credits the full target (' + r5 + ')');
  await p.evaluate(() => retreat()); await quiet(p);
  await p.evaluate(() => importText(JSON.stringify({ player: { name: '<img src=x onerror=alert(1)>', title: 'nope', job: 'wizard', rank: 99 }, stats: {}, awakened: true,
    settings: { diff: 'insane', skin: 'pink', units: 'parsecs' }, gates: { list: [{ id: '"><b>', exs: ['fly'], sets: [] }] }, daily: { date: '2020-01-01' } })));
  await p.waitForTimeout(400);
  const r6 = await p.evaluate(() => ({ diff: S.settings.diff, skin: S.settings.skin, title: S.player.title, job: S.player.job, rank: S.player.rank, imgs: document.querySelectorAll('#top img').length, daily: !!S.daily }));
  assert(r6.diff === 'normal' && r6.skin === 'blue' && r6.title === 'awakened' && r6.job === null && r6.rank === 5 && r6.imgs === 0 && r6.daily, 'broken backups are repaired and names are escaped');
  await p.setViewportSize({ width: 320, height: 640 });
  const over = [];
  for (const [kind, id] of [['tab', 'quest'], ['tab', 'status'], ['tab', 'gates'], ['tab', 'items'], ['tab', 'records'], ['tab', 'recover'], ['screen', 'settings'], ['screen', 'run']]) {
    await p.evaluate(([kind, id]) => { while (curN || NQ.length) { NQ.length = 0; closeNotify(); } UI.screen = null; if (kind === 'tab') UI.tab = id; else UI.screen = { kind: id }; refresh(); }, [kind, id]);
    const w = await p.evaluate(() => Math.max(document.documentElement.scrollWidth, ...[...document.querySelectorAll('.screen')].map(s => s.scrollWidth)));
    if (w > 320) over.push(id + ':' + w);
  }
  assert(over.length === 0, 'no sideways scrolling at 320px (' + over.join(',') + ')');
  const hud = await p.evaluate(() => { const b = s => document.querySelector(s).getBoundingClientRect();
    return { clipped: [...document.querySelectorAll('#tabs .tab-l')].filter(l => l.scrollWidth > l.clientWidth).map(l => l.textContent), labels: document.querySelectorAll('#tabs .tab-l').length,
      oneRow: b('#top .icon-btn[data-a=settings]').bottom <= b('#top .lv').bottom + 2 && b('#top .coin').right <= b('#top .icon-btn[data-a=settings]').left && b('#top .icon-btn[data-a=settings]').right <= innerWidth };
  });
  assert(hud.labels === 6 && hud.clipped.length === 0 && hud.oneRow, 'the top bar and all six tab labels fit at 320px (' + hud.clipped.join(',') + ')');
  assert(errors.length === 0, 'no page errors ' + JSON.stringify(errors));
  await b.close();
})();
