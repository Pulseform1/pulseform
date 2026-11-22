// Security checks for the API: run `npx wrangler dev --local --port 8787` first, then `node tools/security-check.mjs`. Local only, never the live site.
// local hardening checks against `wrangler dev` (never the live site)
const B = 'ws://127.0.0.1:8787', H = 'http://127.0.0.1:8787', sleep = ms => new Promise(r => setTimeout(r, ms));
const open = url => new Promise((res, rej) => { const ws = new WebSocket(url); const got = []; ws.onmessage = e => got.push(JSON.parse(e.data)); ws.onopen = () => res({ ws, got }); ws.onerror = rej; ws.got = got; });
let fails = 0; const ok = (c, msg, x = '') => { console.log((c ? 'ok  ' : 'FAIL') + ' ' + msg + ' ' + x); if (!c) fails++; };
// 1. relay: a normal stream gets through, a flood is cut down, fake server messages are dropped
const a = await open(B + '/api/room/TST2?n=Ann&g=duelpoint'), b = await open(B + '/api/room/TST2?n=Bob&g=duelpoint'); await sleep(300);
for (let i = 0; i < 40; i++) { a.ws.send(JSON.stringify({ t: 'snap', i })); await sleep(50); }   // 20 a second, for 2 s
await sleep(300); ok(b.got.filter(m => m.t === 'snap').length === 40, 'a game-speed stream (20/s) all arrives', b.got.filter(m => m.t === 'snap').length);
for (const t of ['host', 'leave', 'join', 'hello', 'full']) a.ws.send(JSON.stringify({ t, id: 99 }));
a.ws.send(JSON.stringify({ t: 'chat', x: 1 })); await sleep(400);
ok(!b.got.some(m => m.from && ['host', 'leave', 'join', 'hello', 'full'].includes(m.t)) && b.got.some(m => m.t === 'chat'), 'fake host/leave/join messages are dropped, others pass');
b.got.length = 0; for (let i = 0; i < 5000; i++) a.ws.send(JSON.stringify({ t: 'spam', i })); await sleep(1500);
const n = b.got.filter(m => m.t === 'spam').length; ok(n < 600, 'a flood of 5000 at once is cut to the burst', n);
try { for (let i = 0; i < 6000; i++) a.ws.send('{"t":"spam"}'); } catch (e) {} await sleep(1500); ok(a.ws.readyState >= 2, 'a sender that keeps flooding is disconnected');
b.ws.close();
// 2. Elite's offline dev sign-in does nothing unless it is a local dev run with the variable set (it isn't here)
const r = await fetch(H + '/api/elite/me', { headers: { authorization: 'Bearer dev.u1.' + btoa('a@b.c') + '.1.1' } }); ok(r.status === 401, 'a fake dev token is refused', r.status);
// 3. the Hollow: one address can't hold more than 6 sockets open
const socks = []; for (let i = 0; i < 9; i++) socks.push(await open(B + '/api/hollow')); await sleep(500);
const refused = socks.filter(s => s.got.some(m => m.type === 'error' && /Too many/.test(m.message))).length; ok(refused === 3, 'the 7th+ socket from one address is refused', refused);
socks.forEach(s => s.ws.close()); await sleep(500); const again = await open(B + '/api/hollow'); await sleep(300); ok(!again.got.some(m => m.type === 'error'), 'closing them frees the slots'); again.ws.close();
// 4. headers
const h = await fetch(H + '/'); ok(/object-src 'none'/.test(h.headers.get('content-security-policy') || '') && /geolocation=\(\)/.test(h.headers.get('permissions-policy') || ''), 'pages carry the stricter headers');
console.log(fails ? fails + ' failed' : 'all checks passed'); process.exit(fails ? 1 : 0);
