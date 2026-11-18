// ARROWWOOD on the live site (no dev rules there, so no teleports): two browsers make and join a real room through the
// Durable Object, the match starts, both see each other move, the host shoots a real arrow the server flies, and the
// page's bot match and coin bank answer.   node tools/arrowwood-live-check.mjs [base URL, default https://box.pulseform.org]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.argv[2] || 'https://box.pulseform.org';
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
if (process.env.HTTPS_PROXY && !/localhost|127\./.test(BASE)) args.push('--proxy-server=' + process.env.HTTPS_PROXY);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args });
let fails = 0; const ok = (c, name, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + name + (x !== '' ? '  (' + x + ')' : '')); };
const errs = [];
async function session(name, url) {
  // small and low quality: the live page draws every frame (no test shortcut), and two software-rendered windows are slow
  const ctx = await b.newContext({ viewport: { width: 480, height: 270 }, ignoreHTTPSErrors: true }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text() + JSON.stringify(m.location()))) errs.push(name + ': ' + m.text().slice(0, 200)); });
  await p.goto(url); await p.waitForTimeout(1500); if (await p.evaluate(() => { const e = document.getElementById('bPlay'); return !!(e && e.offsetParent); })) await p.click('#bPlay');   // an invite link presses Play by itself
  for (let i = 0; i < 120 && !(await p.evaluate(() => GAME.test.ready)); i++) await p.waitForTimeout(250);
  return p;
}
const T = (p, fn, a) => p.evaluate(fn, a);
const until = async (p, fn, a, ms = 25000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await T(p, fn, a); if (r) return r; await p.waitForTimeout(200); } return null; };
const host = await session('host', BASE + '/games/arrowwood.html?quality=low&nolock');
const prof = await until(host, () => GAME.test.PROFILE.loaded && GAME.test.PROFILE.coins);
ok(prof >= 0 && prof !== null, 'the coin bank answers (a new player starts with coins)', prof);
await T(host, () => { GAME.test.act('friends'); GAME.test.act('mode', '1v1'); GAME.test.act('create'); });
const code = await until(host, () => GAME.test.CL.ids.online && GAME.test.UI.open === 'room' && GAME.test.CL.code);
ok(!!code, 'the host makes a live 1v1 room', code);
const guest = await session('guest', BASE + '/games/arrowwood.html?room=' + code + '&quality=low&nolock');
const joined = await until(guest, () => GAME.test.CL.ids.online && GAME.test.CL.lobby.length);
ok(joined === 2, 'the guest joins with the invite link', joined);
await T(guest, () => GAME.test.act('ready')); await until(host, () => GAME.test.CL.lobby.every(q => q.ready || q.id === GAME.test.CL.host));
await T(host, () => GAME.test.act('start'));
const live = await until(host, () => GAME.test.CL.phase === 'live', null, 20000), gLive = await until(guest, () => GAME.test.CL.phase === 'live', null, 5000);
ok(live && gLive, 'the match starts for both and goes live');
// the guest walks forward; the host sees them move
const gid = await T(guest, () => GAME.test.CL.me), at = () => T(host, id => { const q = GAME.test.CL.players.get(id); const s = q && q.buf[q.buf.length - 1]; return s ? [s[1], s[3]] : null; }, gid);
const p0 = await at(); const g0 = await T(guest, () => [GAME.test.ME.st.x, GAME.test.ME.st.z, performance.now()]);
await T(guest, () => { window.__corr = 0; window.__fr = 0; const f = () => { window.__fr++; requestAnimationFrame(f); }; f(); GAME.test.IN.keys.KeyW = true; });
const trace = []; for (let i = 0; i < 10; i++) { await guest.waitForTimeout(200); trace.push(await T(guest, () => [+GAME.test.ME.st.x.toFixed(1), +GAME.test.ME.st.z.toFixed(1)].join(','))); }
const g1 = await T(guest, () => [GAME.test.ME.st.x, GAME.test.ME.st.z, performance.now(), window.__fr]); console.log('  guest path:', trace.join(' '), ' frames in 2 s:', g1[3]); await T(guest, () => { GAME.test.IN.keys.KeyW = false; }); await host.waitForTimeout(600); const p1 = await at();
ok(p0 && p1 && Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 1, 'the host sees the guest walk (slowly here: software rendering)', p0 && p1 ? Math.hypot(p1[0] - p0[0], p1[1] - p0[1]).toFixed(1) + ' m' : '');
// the host draws and shoots; the server spawns the arrow and it lands somewhere
const a0 = await T(host, () => GAME.test.ME.arrows);
await T(host, () => { GAME.test.ME.st.pitch = .08; GAME.test.startDraw(); }); await host.waitForTimeout(1100); await T(host, () => GAME.test.release());
const landed = await until(host, () => GAME.test.CL.stuck.size > 0 || [...GAME.test.CL.arrows.values()].some(a => a.srv), null, 8000);
ok(!!landed, 'the server flies the host\'s arrow');
const a1 = await until(host, () => GAME.test.ME.arrows < 6 && GAME.test.ME.arrows, null, 4000);
ok(a1 === a0 - 1, 'the server counts the arrow (one fewer in the quiver)', `${a0} -> ${a1}`);
await T(guest, () => GAME.test.act('leave')); await T(host, () => GAME.test.act('leave'));
// a bot match on the live page
await T(host, () => { GAME.test.act('bots'); GAME.test.UI.botMode = 'ffa'; GAME.test.act('botGo'); });
const bots = await until(host, () => GAME.test.CL.phase === 'live' && GAME.test.CL.players.size, null, 45000);
ok(bots === 6, 'Play vs bots starts a six-archer free for all', bots); const fps = await T(host, () => Math.round(1000 / GAME.test.X.frameMs)); console.log('  (host page at about ' + fps + ' fps)');
ok(!errs.length, 'no errors on the live pages', JSON.stringify(errs.slice(0, 4)));
console.log(fails ? fails + ' FAILED' : 'ALL OK'); await b.close();
