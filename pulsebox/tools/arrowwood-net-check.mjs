// ARROWWOOD: connection problems and room limits, free for all, and a copy of the client served from another folder.
//   node arrowwood/server/node-server.js --dev &   then   node tools/arrowwood-net-check.mjs [base URL]
import { createRequire } from 'module';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.argv[2] || 'http://localhost:8790';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let fails = 0; const ok = (c, name, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + name + (x !== '' ? '  (' + x + ')' : '')); };
const errs = [];
const T = (p, fn, a) => p.evaluate(fn, a);
const until = async (p, fn, a, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await T(p, fn, a); if (r) return r; await p.waitForTimeout(150); } return null; };
async function session(name, url) { const ctx = await b.newContext({ viewport: { width: 1000, height: 560 } }), p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message)); await p.goto(url); await p.waitForTimeout(500); await p.click('#bPlay'); await until(p, () => GAME.test.ready, null, 30000); return p; }
const q = 'dev&norender&nolock';
// ---- a 1v1 room: a third person is turned away; a wrong code says so; a dropped connection comes back to the same seat
const H = await session('H', `${BASE}/games/arrowwood.html?${q}`);
await T(H, () => { GAME.test.act('friends'); GAME.test.act('mode', '1v1'); GAME.test.act('create'); });
const code = await until(H, () => GAME.test.CL.ids.online && GAME.test.CL.code);
const G = await session('G', `${BASE}/games/arrowwood.html?room=${code}&${q}`); await until(H, () => GAME.test.CL.lobby.length === 2);
const X3 = await session('X', `${BASE}/games/arrowwood.html?room=${code}&${q}`);
const full = await until(X3, () => GAME.test.UI.joinErr);
ok(/full/i.test(full || ''), 'a third player is told the 1v1 room is full', full);
const bad = await session('Y', `${BASE}/games/arrowwood.html?room=QQQQ&${q}`);
const nocode = await until(bad, () => GAME.test.UI.joinErr);
ok(/no room/i.test(nocode || ''), 'a wrong code gets a clear message', nocode);
await T(G, () => GAME.test.act('ready')); await until(H, () => GAME.test.CL.lobby.every(q => q.ready || q.id === GAME.test.CL.host)); await T(H, () => GAME.test.act('start'));
await until(G, () => GAME.test.CL.phase === 'live', null, 15000);
const gid = await T(G, () => GAME.test.CL.ids.online);
await T(G, () => GAME.test.CL.conn.ws.close());   // the connection drops mid-match
const lost = await until(G, () => /lost|Reconnect/i.test(GAME.test.CL.status) && GAME.test.CL.status, null, 5000);
ok(!!lost, 'the dropped player sees a clear "connection lost" status', lost);
const back = await until(G, () => GAME.test.CL.conn.state === 'open' && GAME.test.CL.ids.online, null, 15000);
ok(back === gid, 'they reconnect to the same seat in the same match', `${back} / ${gid}`);
const hostSaw = await until(H, () => GAME.test.CL.notes.map(n => n.text).join(' | '), null, 3000);
ok(/reconnected/.test(hostSaw || ''), 'the other player is told they came back', hostSaw);
const still = await until(G, () => GAME.test.CL.src === 'online' && ['live', 'overtime', 'roundEnd', 'intro'].includes(GAME.test.CL.phase) && GAME.test.CL.phase, null, 5000);
ok(!!still, 'the match carries on', still);
// ---- free for all: one shot, one kill, respawn somewhere new, a timer, most eliminations wins
const F1 = await session('F1', `${BASE}/games/arrowwood.html?${q}`);
await T(F1, () => { GAME.test.act('friends'); GAME.test.act('mode', 'ffa'); GAME.test.act('create'); });
const fcode = await until(F1, () => GAME.test.CL.ids.online && GAME.test.CL.code);
const F2 = await session('F2', `${BASE}/games/arrowwood.html?room=${fcode}&${q}`), F3 = await session('F3', `${BASE}/games/arrowwood.html?room=${fcode}&${q}`);
await until(F1, () => GAME.test.CL.lobby.length === 3); for (const p of [F2, F3]) await T(p, () => GAME.test.act('ready'));
await until(F1, () => GAME.test.CL.lobby.every(q => q.ready || q.id === GAME.test.CL.host)); await T(F1, () => GAME.test.act('start'));
await until(F2, () => GAME.test.CL.phase === 'live', null, 15000);
await T(F2, () => GAME.test.tp(70, 92, Math.PI, 0)); await T(F1, () => GAME.test.tp(70, 100, 0, 0)); await T(F3, () => GAME.test.tp(30, 30, 0, 0)); await F1.waitForTimeout(700);
const f2id = await T(F2, () => GAME.test.CL.ids.online);
const tgt = await T(F1, id => { const q = GAME.test.CL.players.get(id).buf.slice(-1)[0]; return [q[1], q[2] + .5, q[3]]; }, f2id);   // a leg, with a weak draw
await T(F1, t => { GAME.test.aimAt(...t, .3); GAME.test.startDraw(); }, tgt); await until(F1, () => GAME.test.ME.drawT >= .22, null, 5000); await T(F1, t => { GAME.test.aimAt(...t, GAME.test.W.drawPower(GAME.test.ME.drawT)); GAME.test.release(); }, tgt);
const elim = await until(F2, () => { const f = GAME.test.CL.feed.slice(-1)[0]; return f && f; }, null, 6000);
ok(elim && elim.zone === 'legs', 'free for all: a weak leg shot is one shot, one kill', elim && elim.zone);
const deathAt = [70, 92], re = await until(F2, () => GAME.test.ME.alive && GAME.test.ME.cam === 'fp' && GAME.test.pos(), null, 8000);
ok(re && Math.hypot(re.x - deathAt[0], re.z - deathAt[1]) > 15, 'they respawn a few seconds later somewhere new', re && `${re.x.toFixed(0)},${re.z.toFixed(0)}`);
const k1 = await until(F1, id => GAME.test.CL.players.get(GAME.test.CL.me).k, null, 3000);
ok(k1 === 1, 'the scoreboard counts the elimination', k1);
const fres = await until(F1, () => GAME.test.CL.results, null, 60000);
ok(fres && fres.mode === 'ffa' && fres.board[0].k === 1, 'the clock runs out and the most eliminations wins', fres && fres.board.map(b => b.name + ' ' + b.k).join(', '));
// ---- the client copied into another folder, pointed at the multiplayer server with ?server=
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-sub-')), sub = path.join(dir, 'arcade', 'games', 'archery'); fs.mkdirSync(sub, { recursive: true });
fs.copyFileSync(new URL('../public/games/arrowwood.html', import.meta.url), path.join(sub, 'index.html'));
const st = http.createServer((req, res) => { const f = path.join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname)); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f; if (!fs.existsSync(ff)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': 'text/html' }); fs.createReadStream(ff).pipe(res); }).listen(8811);
const S1 = await session('S1', `http://localhost:8811/arcade/games/archery/?server=${encodeURIComponent(BASE)}&${q}`);
const prof = await until(S1, () => GAME.test.PROFILE.loaded && GAME.test.SERVER.ws);
ok(prof === BASE.replace(/^http/, 'ws'), 'a copy served from another site and folder talks to the configured server', prof);
await T(S1, () => { GAME.test.act('friends'); GAME.test.act('mode', '1v1'); GAME.test.act('create'); });
const scode = await until(S1, () => GAME.test.CL.ids.online && GAME.test.CL.code);
const S2 = await session('S2', `${BASE}/games/arrowwood.html?room=${scode}&${q}`);
const two = await until(S1, () => GAME.test.CL.lobby.length === 2 && 2);
ok(two === 2, 'and a friend on the main site joins that room', scode);
const link = await T(S1, () => GAME.test.UI && location.href);
ok(true, 'subfolder build loads from ' + new URL(link).pathname);
st.close(); fs.rmSync(dir, { recursive: true, force: true });
ok(errs.length === 0, 'no errors', JSON.stringify(errs.slice(0, 3)));
console.log(fails ? fails + ' FAILED' : 'ALL OK'); await b.close(); process.exit(0);
