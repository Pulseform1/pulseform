// Screenshots of every main screen with a realistic mid-game save. usage: node tests/tour.js <outdir> [baseUrl]
const { chromium, devices } = require('playwright');
const OUT = process.argv[2], URL = process.argv[3] || 'http://127.0.0.1:8765/index.html';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  const shot = async (n, full) => { await p.waitForTimeout(450); await p.screenshot({ path: `${OUT}/${n}.png`, fullPage: !!full }); };
  const quiet = () => p.evaluate(() => { while (curN || NQ.length) { NQ.length = 0; closeNotify(); } });
  await p.goto(URL); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
  await shot('00-awaken-start');
  await p.evaluate(() => {
    S.awakened = true; S.created = Date.now() - 20 * 864e5; S.player.name = 'Jin'; S.player.level = 14; S.player.xp = 900; S.player.gold = 3420; S.player.rank = 1; S.player.points = 2; S.player.title = 'ironwill';
    S.titles.push('firststep', 'ironwill'); S.stats.str.t = 9; S.stats.vit.t = 6; S.stats.agi.t = 7; S.stats.int.t = 4; S.stats.per.t = 5;
    S.streak = { cur: 12, best: 12, freeze: 1 }; S.inv.box = 2; S.inv.potion = 1; S.inv.key = 1; S.gear.owned = ['knuckle', 'vest', 'ring']; S.gear.eq = { weapon: 'knuckle', armor: 'vest', acc: 'ring' };
    S.shadows = { goblinchieftain: { lv: 2 }, direwolf: { lv: 1 } };
    newDay(dayKey(), true); S.daily.grace = false; S.daily.announced = true; logDaily('pushup', 20, true); logDaily('situp', 15, true);
    S.tests = [{ date: addDays(dayKey(), -20), pushup: 10, situp: 15, squat: 20, run: 1 }];
    for (let i = 20; i > 0; i--) { const k = addDays(dayKey(), -i); S.history[k] = { s: i % 6 ? 'clear' : 'rest' }; S.days[k] = { pushup: 15 + i % 5, situp: 20, squat: 25, run: 1.2 }; }
    UI.screen = null; saveNow(); refresh();
  });
  await quiet();
  for (const t of ['quest', 'status', 'gates', 'recover', 'records']) { await p.evaluate(t => { UI.screen = null; UI.tab = t; refresh(); window.scrollTo(0, 0); }, t); await shot(`1-${t}`); await shot(`1-${t}-full`, true); }
  for (const t of ['inv', 'gear', 'shop', 'army']) { await p.evaluate(t => { UI.tab = 'items'; UI.itemsTab = t; refresh(); window.scrollTo(0, 0); }, t); await shot(`2-items-${t}`); }
  await p.evaluate(() => { UI.tab = 'gates'; UI.sheet = { kind: 'gate', id: S.gates.list[0].id }; refresh(); }); await shot('3-gate-sheet');
  await p.evaluate(() => { UI.sheet = null; enterGate(S.gates.list[0].id); }); await quiet(); await shot('4-battle');
  await p.evaluate(() => { S.session = null; UI.screen = { kind: 'settings' }; refresh(); }); await shot('5-settings'); await shot('5-settings-full', true);
  await p.evaluate(() => { UI.screen = null; UI.tab = 'quest'; refresh(); notify({ kind: 'quest', head: 'Quest Complete', lines: ['[You have completed the Daily Quest: Strength Training.]', 'Rewards have been distributed.'], rewards: [['XP', '+152'], ['Gold', '+72'], ['Random Box', '×1']] }); });
  await p.waitForTimeout(2500); await shot('6-notification');
  console.log('errors', JSON.stringify(errors)); await b.close();
})();
