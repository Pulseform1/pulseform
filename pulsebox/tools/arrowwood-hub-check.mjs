// ARROWWOOD through the Pulsebox hub: "Play with friends" makes an Arrowwood room (the game opens it on arrival), and
// a friend who types that code in the hub's Join box lands in the same room.
//   python3 build-worker.py && node arrowwood/server/node-server.js --dev --public ../../dist &   then   node tools/arrowwood-hub-check.mjs [base URL]
// (the hub page needs the built site in dist/; the hub only plays games signed in, so the check stands in for that)
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.argv[2] || 'http://localhost:8790';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let fails = 0; const ok = (c, name, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + name + (x !== '' ? '  (' + x + ')' : '')); };
const hub = async () => { const ctx = await b.newContext({ viewport: { width: 1000, height: 700 } }); await ctx.addInitScript(() => { try { localStorage.setItem('pbx-arrowwood', JSON.stringify({ aw: { cfg: { quality: 'low' } } })); } catch (e) {} }); await ctx.route('https://box.pulseform.org/api/**', async r => { const u = new URL(r.request().url()); const res = await fetch(BASE + u.pathname + u.search); r.fulfill({ status: res.status, contentType: 'application/json', body: await res.text() }); });   // a hub on localhost asks the live site about rooms: answer from this server
  const p = await ctx.newPage(); await p.goto(BASE + '/index.html'); await p.waitForTimeout(1500); return p; };
// the hub plays games for signed-in accounts only; stand in for the account check and start the game it was holding
const signedIn = p => p.evaluate(() => { window.pbxUser = () => ({ uid: 'test' }); if (window.pbxWaitingGame) startGame(window.pbxWaitingGame); });
const until = async (fn, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 300)); } return null; };
const A = await hub();
const listed = await A.evaluate(() => typeof byId === 'function' && !!byId('arrowwood') && FRIEND_GAMES.includes('arrowwood'));
ok(listed, 'Arrowwood is in the hub and in Play with friends');
await A.evaluate(() => { localStorage.setItem('pbx-mp-name', 'Robin'); openFriends('make'); makeRoom(byId('arrowwood')); });
const code = await A.evaluate(() => document.getElementById('frCodeShow').dataset.code);
await A.click('#frEnter'); await A.waitForTimeout(500); await signedIn(A);
const src = await until(() => A.evaluate(() => { const f = document.querySelector('#stage iframe'); return f && f.getAttribute('src'); }));
ok(/arrowwood(\.html)?\?room=[A-Z0-9]{4}&make=1/.test(src || ''), 'the maker\'s game opens with the hub\'s code', src);
const frameA = await until(async () => A.frames().find(f => /arrowwood/.test(f.url())));
// the kit's title screen: press Play inside the game frame (the game also does this by itself outside dev pages)
await until(async () => { try { await frameA.click('#bPlay', { timeout: 2000 }); return true; } catch (e) { return false; } }, 20000);
const made = await until(async () => { try { const r = await (await fetch(`${BASE}/api/arrowwood/room/${code}`)).json(); return r.players >= 1 && r; } catch (e) { return null; } }, 60000);
ok(made && made.game === 'arrowwood', 'the room exists on the server once the maker arrives', made && JSON.stringify(made));
const Bp = await hub();
await Bp.evaluate(c => { localStorage.setItem('pbx-mp-name', 'Marian'); openFriends('join', ''); document.getElementById('frCode').value = c; joinRoom(c); }, code); await Bp.waitForTimeout(1500); await signedIn(Bp);
const srcB = await until(() => Bp.evaluate(() => { const f = document.querySelector('#stage iframe'); return f && f.getAttribute('src'); }));
ok(/arrowwood(\.html)?\?room=/.test(srcB || '') && !/make/.test(srcB || ''), 'a friend types the code in the hub\'s Join box and is sent to that Arrowwood room', srcB);
const frameB = await until(async () => Bp.frames().find(f => /arrowwood/.test(f.url())));
await until(async () => { try { await frameB.click('#bPlay', { timeout: 2000 }); return true; } catch (e) { return false; } }, 20000);
const both = await until(async () => { const r = await (await fetch(`${BASE}/api/arrowwood/room/${code}`)).json(); return r.players === 2 && r; }, 60000);
ok(!!both, 'both players are in the same room', both && JSON.stringify(both));
console.log(fails ? fails + ' FAILED' : 'ALL OK'); await b.close();
