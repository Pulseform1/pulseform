// Streak freeze, weekly quests, events, compass, shadow summons, personal bests, charts, re-tests, old-save migration.
const { assert, quiet, awaken, clearSession, page, BASE, devices } = require('./helpers');
(async () => {
  const { b, p, errors } = await page();
  await awaken(p);
  assert(await p.evaluate(() => [curN && curN.head, ...NQ.map(n => n.head)].includes('Login Reward') && S.login.n === 1), 'the first day gives the day-1 login reward');
  await quiet(p);
  const t0 = await p.evaluate(() => ({ tests: S.tests.length, w: S.periods.w && S.periods.w.list.length, m: S.periods.m && S.periods.m.list.length }));
  assert(t0.tests === 1 && t0.w === 3 && t0.m === 3, 'awakening records the first test and three weekly + three monthly quests');
  const f = await p.evaluate(() => { S.streak.cur = 6; S.daily.grace = false; S.daily.rest = false; S.daily.heal = false;
    for (const id of Object.keys(S.daily.targets)) S.daily.prog[id] = S.daily.targets[id]; checkDaily(); const got = S.streak.freeze;
    const y = addDays(dayKey(), -1); S.inv.ward = 1; S.daily.date = y; S.daily.cleared = false; S.daily.rest = false; S.daily.grace = false; S.daily.heal = false; rollover();
    return { got, after: S.streak.freeze, ward: S.inv.ward, s: S.history[y].s, streak: S.streak.cur, pen: !!S.penalty }; });
  assert(f.got === 1, 'a 7-day streak earns a Streak Freeze');
  assert(f.after === 0 && f.ward === 1 && f.s === 'freeze' && f.streak === 7 && !f.pen, 'a missed day uses the freeze first and keeps the streak');
  await quiet(p);
  const w = await p.evaluate(() => { const P = S.periods.w, M = { push: 'pushup', core: 'situp', legs: 'squat' };
    for (const q of P.list) { if (q.id === 'dist') S.totals.ex.run = (S.totals.ex.run || 0) + q.target; else if (M[q.id]) S.totals.ex[M[q.id]] = (S.totals.ex[M[q.id]] || 0) + q.target; else S.totals[q.id] += q.target; }
    refresh(); return { box: S.inv.box, key: S.inv.key, btns: document.querySelectorAll('[data-a=claimPQ][data-x^="w:"]').length }; });
  assert(w.btns === 3, 'finished weekly quests show Claim');
  for (let i = 0; i < 3; i++) { await p.click('[data-a=claimPQ][data-x^="w:"]'); await quiet(p); }
  const w2 = await p.evaluate(() => ({ gold: S.player.gold, box: S.inv.box, key: S.inv.key, bonus: S.periods.w.bonus, flag: !!S.flags.weekall }));
  assert(w2.bonus && w2.box === w.box + 2 && w2.key === w.key + 1 && w2.flag, 'claiming all three pays the weekly bonus once');
  await p.evaluate(() => claimPQ('w', 0));
  assert(await p.evaluate(() => S.player.gold) === w2.gold, 'a claimed quest cannot be claimed again');
  const ev = await p.evaluate(() => ({ d3: eventOn('2026-11-03')?.id, sat: eventOn('2026-11-14')?.id, wed: eventOn('2026-11-11') }));
  assert(ev.d3 === 'red' && ev.sat === 'dxp' && ev.wed === null, 'Red Gate Week and Double XP weekends');
  const cp = await p.evaluate(() => { genGates(S.daily.date); S.gates.done = S.gates.list.map(g => g.id); S.gates.list = []; S.inv.compass = 1; useItem('compass'); return S.gates.list.length; });
  assert(cp === 0, 'a Gate Compass after clearing every gate gives no new gates');
  await p.evaluate(() => { S.shadows = { goblinchieftain: { lv: 2 } }; S.player.mp = 100; S.gates.salt = 0; S.gates.done = []; genGates(S.daily.date); enterGate(S.gates.list[0].id); });
  await quiet(p);
  await p.click('[data-a=summonOpen]'); await p.click('#sheet [data-a=summon]');
  const sm = await p.evaluate(() => ({ s: S.session.summon, mp: S.player.mp }));
  assert(sm.s && sm.s.pct === 15 && sm.mp === 85, 'summoning costs 5 MP');
  assert(await p.locator('[data-a=summonOpen]').count() === 0, 'only one summon per gate');
  await clearSession(p); await quiet(p);
  await p.evaluate(() => { S.pb = {}; S.days = {}; logDaily('pushup', 10, true); logDaily('pushup', 15, true); });
  await p.waitForTimeout(900);
  const pb = await p.evaluate(() => ({ pb: S.pb.pushup, toasts: [...document.querySelectorAll('.toast')].map(t => t.textContent) }));
  assert(pb.pb.set === 15 && pb.pb.day === 25, 'best set and best day are tracked');
  assert(pb.toasts.some(t => /personal best/.test(t)), 'beating a best set shows a toast');
  await p.evaluate(() => undoDaily('pushup'));
  assert(await p.evaluate(() => S.pb.pushup.set === 10 && S.pb.pushup.day === 10), 'undoing the set restores the previous bests');
  await quiet(p); await p.click('[data-a=tab][data-x=records]');
  assert(await p.locator('svg.chart .ch-b').count() === 8, 'the progress chart shows 8 weeks');
  await p.evaluate(() => { S.tests[0].date = addDays(S.daily.date, -28); UI.tab = 'quest'; refresh(); });
  assert(await p.locator('[data-a=retest]').count() === 1, 'the Reassessment Test appears after 4 weeks');
  await p.click('[data-a=retest]'); await p.fill('#aw-pushup', '30'); await p.click('[data-a=awAssess]'); await p.waitForTimeout(200);
  assert(await p.evaluate(() => S.tests.length === 2 && S.baseline.pushup === 30 && !!S.flags.stronger && !retestDue()), 'submitting the re-test saves results and updates goals');
  await quiet(p);
  // an old save with a hurting knee and no adapt flag is migrated before the rollover; unowned imported gear is dropped
  const ctx2 = await b.newContext({ ...devices['iPhone 13'] }); const p2 = await ctx2.newPage();
  const old = await p.evaluate(() => { const o = JSON.parse(JSON.stringify(S)); const t = dayKey(); o.joints = { knee: { lv: 2, lastLv: 2, since: addDays(t, -2), checked: addDays(t, -2), l2: 1 } }; o.daily.date = addDays(t, -2); o.daily.cleared = true; o.penalty = null; delete o.periods; delete o.tests; delete o.login; o.streak = { cur: 5, best: 5 }; return JSON.stringify(o); });
  await p2.addInitScript(s => localStorage.setItem('awaken.save.v1', s), old);
  await p2.goto(BASE); await p2.waitForTimeout(400);
  const o2 = await p2.evaluate(() => ({ pen: !!S.penalty, streak: S.streak.cur, heal: S.daily.heal, periods: !!S.periods.w, tests: S.tests.length }));
  assert(!o2.pen && o2.streak === 5 && o2.heal && o2.periods && o2.tests === 1, 'an old save with a hurting knee is not penalised and gets the new state');
  const imp = await p2.evaluate(() => { const o = JSON.parse(exportText()); o.gear = { owned: 'knuckle', eq: { weapon: 'knuckle' } }; o.pb = { pushup: { set: 'lots' } }; o.days = { bad: 1 }; importText(JSON.stringify(o)); return { eq: S.gear.eq.weapon, pb: S.pb.pushup && S.pb.pushup.set, days: Object.keys(S.days).length }; });
  assert(imp.eq === null && imp.pb === 0 && imp.days === 0, 'imports cannot equip unowned gear and broken state is repaired');
  await ctx2.close();
  await p.setViewportSize({ width: 320, height: 640 }); const over = [];
  for (const t of ['quest', 'records']) { await p.evaluate(t => { UI.tab = t; refresh(); }, t); const wd = await p.evaluate(() => document.documentElement.scrollWidth); if (wd > 320) over.push(t + ':' + wd); }
  assert(over.length === 0, 'no sideways scrolling at 320 px (' + over.join(',') + ')');
  assert(errors.length === 0, 'no page errors ' + JSON.stringify(errors));
  await b.close();
})();
