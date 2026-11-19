// ARROWWOOD maps in the browser: the menus offer every map, a bot match on each one builds that wood (and its look),
// the practice range goes back to the King's Wood, and in an online room the host's map choice reaches everyone and
// a match starts on it.
//   node arrowwood/server/node-server.js --dev &   then   node tools/arrowwood-maps-check.mjs [base URL] [shots dir]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.argv[2] || 'http://localhost:8790', OUT = process.argv[3] || '';
let fails = 0; const ok = (c, name, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + name + (x !== '' ? '  (' + x + ')' : '')); };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const open = async () => { const ctx = await b.newContext({ viewport: { width: 1000, height: 640 } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(BASE + '/games/arrowwood.html?dev&nolock&quality=low', { timeout: 120000, waitUntil: 'domcontentloaded' }); await p.waitForSelector('#bPlay', { timeout: 120000 }); await p.waitForTimeout(600); await p.click('#bPlay');
  await p.waitForFunction(() => GAME.test && GAME.test.ready, null, { timeout: 120000 }); await p.waitForTimeout(400); return p; };
const until = (p, fn, arg, ms = 30000) => p.waitForFunction(fn, arg, { timeout: ms }).then(h => h.jsonValue()).catch(() => null);
const p = await open();
// the bots menu lists Random and every map
await p.evaluate(() => GAME.test.act('bots')); await p.waitForTimeout(300);
const names = await p.evaluate(() => [...document.querySelectorAll('button[data-a="botMap"]')].map(e => e.textContent.trim()));
ok(names.length === 5 && names[0] === 'Random', 'the bots menu offers Random and the four woods', names.join(', '));
for (const id of ['emberfall', 'frostpine', 'mirewood', 'kingswood']) {
  await p.evaluate(id => { document.querySelector(`button[data-a="botMap"][data-v="${id}"]`).click(); }, id); await p.waitForTimeout(150);
  await p.evaluate(() => document.querySelector('button[data-a="botGo"]').click());
  const live = await until(p, () => GAME.test.CL.phase === 'live' && GAME.test.X.mapBuilt, null, 60000);
  const st = await p.evaluate(() => ({ map: GAME.test.W.mapId(), built: GAME.test.X.mapBuilt, tg: GAME.test.CL.tg.length, targets: GAME.test.W.TARGETS.length, fog: +GAME.test.X.scene.fog.density.toFixed(4), objs: GAME.test.X.wood.children.length }));
  ok(live && st.map === id && st.built === id && st.tg === st.targets, `a bot match on ${id} builds that wood`, JSON.stringify(st));
  if (OUT) await p.screenshot({ path: `${OUT}/bots-${id}.jpg`, quality: 80 });
  await p.evaluate(() => { GAME.test.leaveRoom(); GAME.test.act('bots'); }); await p.waitForTimeout(400);
}
// the practice range is the King's Wood, whatever you last played
await p.evaluate(() => document.querySelector('button[data-a="botMap"][data-v="mirewood"]').click()); await p.evaluate(() => document.querySelector('button[data-a="botGo"]').click());
await until(p, () => GAME.test.X.mapBuilt === 'mirewood', null, 60000);
await p.evaluate(() => { GAME.test.leaveRoom(); GAME.test.startPractice(); GAME.test.closeMenu(); }); await p.waitForTimeout(1500);
ok(await p.evaluate(() => GAME.test.W.mapId() === 'kingswood' && GAME.test.X.mapBuilt === 'kingswood'), 'the practice range is back in the King\'s Wood');
await p.evaluate(() => GAME.test.leaveRoom && GAME.test.leaveRoom());
// online: make a room on Frostpine, the guest sees it, the host switches to Mirewood, the match starts there for both
await p.evaluate(() => { GAME.test.act('friends'); }); await p.waitForTimeout(300);
await p.evaluate(() => document.querySelector('button[data-a="map"][data-v="frostpine"]').click()); await p.waitForTimeout(150);
await p.evaluate(() => document.querySelector('button[data-a="create"]').click());
const code = await until(p, () => GAME.test.CL.ids.online && GAME.test.CL.code, null, 30000);
const q = await open(); await q.evaluate(c => GAME.test.connect(c, null), code);
await until(q, () => GAME.test.CL.ids.online && GAME.test.CL.mapPick, null, 30000);
ok(await q.evaluate(() => GAME.test.CL.mapPick === 'frostpine') && await q.evaluate(() => /MAP · FROSTPINE/.test(document.getElementById('aw').textContent)), 'the guest sees the room\'s map (Frostpine)', code);
await p.evaluate(() => document.querySelector('button[data-a="roomMap"][data-v="mirewood"]').click());
await until(q, () => GAME.test.CL.mapPick === 'mirewood', null, 15000);
ok(await q.evaluate(() => GAME.test.CL.mapPick === 'mirewood'), 'the host changes the map and the guest sees it');
await p.evaluate(() => GAME.test.sendRoom({ t: 'start', force: true }));
const hostOn = await until(p, () => GAME.test.CL.src === 'online' && GAME.test.X.mapBuilt === 'mirewood' && GAME.test.W.mapId(), null, 60000), guestOn = await until(q, () => GAME.test.CL.src === 'online' && GAME.test.X.mapBuilt === 'mirewood' && GAME.test.W.mapId(), null, 60000);
ok(hostOn === 'mirewood' && guestOn === 'mirewood', 'the match starts on Mirewood for both of them', `${hostOn} / ${guestOn}`);
// both stand where the server put them, on the new map's ground
const pos = await q.evaluate(() => { const s = GAME.test.ME.st; return { y: s.y, g: GAME.test.W.groundAt(s.x, s.z, s.y + 1), x: s.x, z: s.z }; });
ok(Math.abs(pos.y - pos.g) < .6, 'the guest is standing on Mirewood\'s ground', JSON.stringify(pos));
if (OUT) await q.screenshot({ path: `${OUT}/online-mirewood.jpg`, quality: 80 });
ok(!p.errs.length && !q.errs.length, 'no errors in either browser', JSON.stringify([...p.errs, ...q.errs].slice(0, 3)));
console.log(fails ? `${fails} FAILED` : 'ALL OK');
await b.close(); process.exit(fails ? 1 : 0);
