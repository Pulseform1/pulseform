// STILLWATER as it runs on the site: the built page (public/games/stillwater.html) against the real room class.
//   node tools/stillwater-site-server.mjs 8795 &   then   node tools/stillwater-site-check.mjs [base URL] [shots dir]
// A solo run starts and moves; a friends room is made in one browser and joined by code in another; both get ready,
// vote and start the same run, and each sees the other in the world.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.argv[2] || 'http://localhost:8795', OUT = process.argv[3] || '';
let fails = 0; const ok = (c, n, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : '')); };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const open = async () => { const ctx = await b.newContext({ viewport: { width: 1100, height: 700 } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text().slice(0, 160)); });
  await p.goto(BASE + '/games/stillwater.html', { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForSelector('[data-action=solo]', { timeout: 60000 }); return p; };
const click = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) throw new Error('missing ' + s); e.click(); }, sel);
const screenText = p => p.evaluate(() => document.getElementById('app').innerText.slice(0, 160).replace(/\s+/g, ' '));
// solo
const s = await open();
ok(await s.evaluate(() => globalThis.STILLWATER_ROOMS === '/api/stillwater/ws' && !document.querySelector('script[type=importmap]')), 'the page is one file and talks to the site\'s rooms');
await click(s, '[data-action=keyboard-solo]'); await s.waitForSelector('#name'); await s.fill('#name', 'Solo Tester'); await click(s, '[data-action=create-solo]');
await s.waitForSelector('[data-monster]', { timeout: 30000 }); await click(s, '[data-monster]'); await s.waitForTimeout(300); await click(s, '[data-action=start]');
await s.waitForFunction(() => document.body.classList.contains('playing'), null, { timeout: 60000 }).catch(() => {});
const p0 = await s.evaluate(() => document.getElementById('hud').innerText.slice(0, 80).replace(/\s+/g, ' '));
await s.keyboard.down('KeyW'); await s.waitForTimeout(2500); await s.keyboard.up('KeyW');
const playing = await s.evaluate(() => document.body.classList.contains('playing'));
ok(playing && /ROOM 01/.test(p0), 'a solo run starts in the pools', p0);
if (OUT) await s.screenshot({ path: OUT + '/solo.jpg', quality: 80 });
ok(!s.errs.length, 'solo: no errors', JSON.stringify(s.errs.slice(0, 3)));
// friends
const h = await open(), g = await open();
await click(h, '[data-action=friends]'); await h.waitForSelector('#name'); await h.fill('#name', 'Host'); await click(h, '[data-action=create-party]');
await h.waitForFunction(() => /[A-F0-9]{6}/.test(document.getElementById('app').innerText), null, { timeout: 30000 });
const code = await h.evaluate(() => document.getElementById('app').innerText.match(/\b[A-F0-9]{6}\b/)[0]);
ok(/^[A-F0-9]{6}$/.test(code), 'a friends room gets a six-character code', code);
await click(g, '[data-action=friends]'); await g.waitForTimeout(200); await click(g, '[data-action=join]'); await g.waitForSelector('#code'); await g.fill('#name', 'Guest'); await g.fill('#code', code); await click(g, '[data-action=join-room]');
await g.waitForFunction(() => /Host/.test(document.getElementById('app').innerText), null, { timeout: 30000 }).catch(() => {});
const both = await h.evaluate(() => /Guest/.test(document.getElementById('app').innerText));
ok(both, 'the guest joins by code and the host sees them', await screenText(g));
await click(g, '[data-action=ready]'); await h.waitForTimeout(800); await click(h, '[data-action=begin]');
await h.waitForSelector('[data-monster]', { timeout: 30000 }); await g.waitForSelector('[data-monster]', { timeout: 30000 });
await click(h, '[data-monster]'); await click(g, '[data-monster]');
const hp = await h.waitForFunction(() => document.body.classList.contains('playing'), null, { timeout: 60000 }).then(() => true).catch(() => false), gp = await g.waitForFunction(() => document.body.classList.contains('playing'), null, { timeout: 60000 }).then(() => true).catch(() => false);
ok(hp && gp, 'after the vote both start the run', `${hp} ${gp}`);
await g.keyboard.down('KeyW'); await g.waitForTimeout(2000); await g.keyboard.up('KeyW');
if (OUT) { await h.screenshot({ path: OUT + '/host.jpg', quality: 80 }); await g.screenshot({ path: OUT + '/guest.jpg', quality: 80 }); }
ok(!h.errs.length && !g.errs.length, 'friends: no errors', JSON.stringify([...h.errs, ...g.errs].slice(0, 3)));
console.log(fails ? fails + ' FAILED' : 'ALL OK'); await b.close(); process.exit(fails ? 1 : 0);
