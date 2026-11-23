// The Android app's code paths with stand-in Capacitor plugins: reminders, back button, background GPS.
const { assert, quiet, awaken, page } = require('./helpers');
(async () => {
  const { b, ctx, p, errors } = await page('Pixel 7');
  await ctx.addInitScript(() => { const log = window.__nlog = [], L = window.__listeners = {};
    window.Capacitor = { isNativePlatform: () => true, Plugins: {
      LocalNotifications: { requestPermissions: async () => (log.push('perm'), { display: 'granted' }), schedule: async o => { log.push(['schedule', o.notifications]); }, cancel: async o => { log.push(['cancel', o.notifications.length]); }, addListener: (ev, fn) => { L[ev] = fn; } },
      App: { addListener: (ev, fn) => { L[ev] = fn; }, minimizeApp: () => log.push('min') },
      BackgroundGeolocation: { addWatcher: (o, cb) => { log.push(['watch']); window.__geo = cb; return Promise.resolve('w1'); }, removeWatcher: async o => log.push(['unwatch', o.id]) } } }; });
  await awaken(p, 'Droid');
  await p.evaluate(() => { while (curN || NQ.length) { NQ.length = 0; closeNotify(); } S.daily.grace = false; S.daily.rest = false; S.daily.heal = false; S.daily.cleared = false; S.settings.restDays = []; UI.screen = { kind: 'settings' }; refresh(); });
  const st = await p.evaluate(() => ({ native: NATIVE, api: API, badge: !!document.querySelector('[data-x=badge]'), apk: !!document.querySelector('a[href="awaken.apk"]'), install: /To install/.test(document.body.innerText) }));
  assert(st.native && /^https:\/\/awaken\./.test(st.api) && !st.badge && !st.apk && !st.install, 'inside the APK: absolute API address, no web-only items');
  await p.click('[data-a=remindOn]'); await p.waitForTimeout(300);
  const sched = await p.evaluate(() => __nlog.filter(x => x[0] === 'schedule').pop());
  assert(await p.evaluate(() => Push.cfg && Push.cfg.native) && sched && sched[1].length >= 6, 'reminders schedule local notifications for the coming days');
  await p.evaluate(() => { for (const id of Object.keys(S.daily.targets)) S.daily.prog[id] = S.daily.targets[id]; checkDaily(); saveNow(); });
  await p.waitForTimeout(200);
  assert(await p.evaluate(() => !__nlog.filter(x => x[0] === 'schedule').pop()[1].some(n => n.id === 100)), "once the quest is cleared, today's reminder is dropped");
  await p.evaluate(() => { while (curN || NQ.length) { NQ.length = 0; closeNotify(); } UI.screen = null; UI.tab = 'items'; refresh(); __listeners.localNotificationActionPerformed({ notification: { extra: { go: 'quest' } } }); });
  assert(await p.evaluate(() => UI.tab === 'quest'), 'tapping a reminder opens the Quest tab');
  await p.evaluate(() => { UI.tab = 'status'; UI.sheet = { kind: 'titles' }; refresh(); __listeners.backButton(); });
  const b1 = await p.evaluate(() => ({ sheet: UI.sheet, tab: UI.tab }));
  await p.evaluate(() => __listeners.backButton()); const b2 = await p.evaluate(() => UI.tab);
  await p.evaluate(() => __listeners.backButton()); const b3 = await p.evaluate(() => __nlog.includes('min'));
  assert(!b1.sheet && b1.tab === 'status' && b2 === 'quest' && b3, 'back closes the sheet, then returns to Quest, then leaves the app');
  await p.evaluate(() => { ACT.runOpen('gps'); runStart(); }); await p.waitForTimeout(100);
  await p.evaluate(() => { const t = Date.now(); for (let i = 0; i < 11; i++) __geo({ latitude: 37 + i * .0009, longitude: -122, accuracy: 5, time: t + i * 30000 }); });
  const dist = await p.evaluate(() => S.run.dist); await p.evaluate(() => runPause()); await p.waitForTimeout(100);
  assert(dist > .9 && dist < 1.2 && await p.evaluate(() => __nlog.some(x => x[0] === 'unwatch')), 'runs use background GPS and pausing stops it');
  assert(errors.length === 0, 'no page errors ' + JSON.stringify(errors));
  await b.close();
})();
