// Duelpoint: the skin key typed into the party's JOIN WITH A CODE box unlocks every skin and joins nothing; a wrong
// code still goes to the room join as before. The key is not kept in the repository: pass it in DP_KEY.
//   DP_KEY='...' node tools/duelpoint-code-check.mjs <shots>
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const KEY = process.env.DP_KEY; if (!KEY) { console.log('set DP_KEY to the key to run this check'); process.exit(0); }
const O = process.argv[2] || '.', URL0 = 'file://' + path.resolve('public/games/duelpoint.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [], ok = (c, n, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : ''));
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
await p.goto(URL0, { timeout: 120000 }); await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 90000 }); await p.waitForTimeout(500);
await p.click('#bPlay'); await p.waitForTimeout(600);
const before = await p.evaluate(() => { localStorage.clear(); const t = GAME.test; t.openParty(); return t.STATS ? t.STATS.skins.length : null; });
await p.waitForTimeout(500);
const box = p.locator('input.dp-in[placeholder="CODE"]'); await box.waitFor({ timeout: 10000 });
let joined = 0; await p.evaluate(() => { const j = MP.join; window.__joins = []; MP.join = c => { window.__joins.push(c); }; });
await box.fill(KEY); await box.press('Enter'); await p.waitForTimeout(400);
const r = await p.evaluate(() => { const t = GAME.test; return { status: t.PARTY.status, joins: window.__joins.length, box: document.querySelector('input.dp-in[placeholder="CODE"]').value, skins: (t.STATS || {}).skins ? t.STATS.skins.length : null, all: t.allSkinIds ? t.allSkinIds().length : null }; });
ok(/every skin unlocked/.test(r.status) && r.joins === 0 && r.box === '', 'the skin key in the join box unlocks every skin, joins nothing, clears the box', JSON.stringify(r));
await p.screenshot({ path: O + '/code-accepted.png' });
await box.fill('ABCD'); await p.locator('text=JOIN').last().count(); await box.press('Enter'); await p.waitForTimeout(300);
const r2 = await p.evaluate(() => window.__joins);
ok(r2.length === 1 && r2[0] === 'ABCD', 'a room code still joins a room', JSON.stringify(r2));
await box.fill([...KEY].slice(0, -1).join('')); await box.press('Enter'); await p.waitForTimeout(300);
const r3 = await p.evaluate(() => window.__joins);
ok(r3.length === 2, 'a near miss is treated as a room code, not the key', r3.length);
console.log('ERRORS', JSON.stringify(errs)); await b.close();
