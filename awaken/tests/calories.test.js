// Calorie estimates, the Quest burn meter, weight setting.
const { assert, quiet, awaken, page } = require('./helpers');
(async () => {
  const { b, p, errors } = await page();
  await awaken(p, 'Jin'); await quiet(p);
  const m = await p.evaluate(() => ({ push100: calOf('pushup', 100), run5: calOf('run', 5), zero: calDay(S.daily.date) }));
  assert(m.push100 > 30 && m.push100 < 50 && m.run5 === 350 && m.zero === 0, 'estimates are realistic at 70 kg');
  assert(await p.locator('.burn').count() === 1, 'the Quest window shows calories burned today');
  await p.evaluate(() => { logDaily('pushup', 20, true); logDaily('squat', 30, true); });
  const t = await p.evaluate(() => ({ today: Math.round(calDay(S.daily.date)), exp: Math.round(calOf('pushup', 20) + calOf('squat', 30)), shown: document.querySelector('.burn-t b').textContent }));
  assert(t.today === t.exp && t.shown === t.today + ' kcal', 'logging sets adds to today\'s calories');
  await p.evaluate(() => undoDaily('squat'));
  assert(await p.evaluate(() => Math.round(calDay(S.daily.date)) === Math.round(calOf('pushup', 20))), 'undoing a set takes its calories off');
  await p.evaluate(() => { UI.screen = { kind: 'settings' }; refresh(); });
  await p.fill('#set-weight', '90'); await p.dispatchEvent('#set-weight', 'change');
  assert(await p.evaluate(() => S.settings.weight === 90 && Math.round(calOf('run', 1)) === 90), 'body weight changes the estimate');
  await p.evaluate(() => { S.settings.units = 'mi'; refresh(); });
  assert(await p.inputValue('#set-weight') === '198.42', 'weight shows in pounds with miles');
  assert(errors.length === 0, 'no page errors ' + JSON.stringify(errors));
  await b.close();
})();
