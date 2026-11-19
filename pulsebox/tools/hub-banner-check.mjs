// The homepage banner and its editor (picks.html), with the API answered by the test: the banner sits at the top of the
// homepage on desktop, phone and iPad, × hides it until the words change, it shows nothing when off, words are text only,
// and the editor previews it live and saves it with the admin code. Serves public/ from any static server, e.g.
//   node arrowwood/server/node-server.js --dev &   then   node tools/hub-banner-check.mjs [base URL] [shots dir]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.argv[2] || 'http://localhost:8790', OUT = process.argv[3] || '/tmp';
let fails = 0; const ok = (c, n, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : '')); };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const BANNER = { on: true, tag: 'NEW', title: 'Three new maps in Arrowwood!', text: 'Emberfall, Frostpine and Mirewood are here: an autumn keep, a frozen lake and a misty swamp. Pick one or let the match choose.', button: 'Play now', link: '#play-arrowwood', style: 'neon', at: 1 };
const hub = async (banner, vp, name, dpr = 2) => {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr }), p = await ctx.newPage(); const errs = []; p.on('pageerror', e => { if (!/renderDaily/.test(e.stack || '')) errs.push(e.message); });   // renderDaily: needs the built page's data (not the banner)
  await p.route('**/api/banner', r => r.fulfill({ json: banner })); await p.route('**/api/featured', r => r.fulfill({ json: { default: [], days: {} } }));
  const unGate = async () => { await p.waitForTimeout(2500); await p.evaluate(() => { const g = document.getElementById('gate'); if (g) g.remove(); document.body.classList.remove('gated'); }); };
  await p.goto(BASE + '/index.html', { timeout: 120000, waitUntil: 'domcontentloaded' }); await unGate(); p.unGate = unGate;
  return { p, ctx, errs };
};
for (const [style, vp, nm] of [['neon', { width: 1280, height: 800 }, 'desk-neon'], ['sunset', { width: 1280, height: 800 }, 'desk-sunset'], ['gold', { width: 390, height: 844 }, 'phone-gold'], ['ice', { width: 820, height: 1180 }, 'ipad-ice']]) {
  const { p, ctx, errs } = await hub({ ...BANNER, style }, vp, nm);
  const st = await p.evaluate(() => { const e = document.getElementById('siteBanner'); if (!e) return null; const r = e.getBoundingClientRect(), home = document.getElementById('home'); return { first: home.firstElementChild === e, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), title: e.querySelector('h2').textContent, btn: e.querySelector('.sbn-go') && e.querySelector('.sbn-go').getAttribute('href'), overflow: document.documentElement.scrollWidth > innerWidth + 1 }; });
  ok(st && st.first && st.title === BANNER.title && st.btn === '#play-arrowwood' && !st.overflow, `${nm}: the banner sits at the top of the homepage`, JSON.stringify(st));
  await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/${nm}.png`, clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, (st ? st.top + st.h : 300) + 140) } });
  ok(!errs.length, `${nm}: no page errors`, JSON.stringify(errs.slice(0, 2)));
  await ctx.close();
}
// the × hides it, and it stays hidden after a reload until the words change
{ const { p, ctx } = await hub(BANNER, { width: 1280, height: 800 });
  await p.click('#siteBanner .sbn-x'); const gone = await p.evaluate(() => !document.getElementById('siteBanner'));
  await p.reload({ waitUntil: 'domcontentloaded' }); await p.unGate(); const still = await p.evaluate(() => !document.getElementById('siteBanner'));
  await p.unroute('**/api/banner'); await p.route('**/api/banner', r => r.fulfill({ json: { ...BANNER, title: 'Weekend tournament on Saturday' } }));
  await p.reload({ waitUntil: 'domcontentloaded' }); await p.unGate(); const back = await p.evaluate(() => !!document.getElementById('siteBanner'));
  ok(gone && still && back, '× hides it, it stays hidden after a reload, and comes back when the words change', `${gone} ${still} ${back}`); await ctx.close(); }
// off, or no headline: nothing; words are text, never HTML
{ const { p, ctx } = await hub({ on: false, title: 'x' }, { width: 1280, height: 800 }); ok(await p.evaluate(() => !document.getElementById('siteBanner')), 'switched off: no banner'); await ctx.close(); }
{ const { p, ctx } = await hub({ ...BANNER, title: '<img src=x onerror="window.__pwn=1">Hi', text: '<b>bold</b>', link: 'javascript:alert(1)' }, { width: 1280, height: 800 });
  const r = await p.evaluate(() => ({ pwn: !!window.__pwn, img: !!document.querySelector('#siteBanner img, #siteBanner b'), h: document.querySelector('#siteBanner h2').textContent, btn: !!document.querySelector('#siteBanner .sbn-go') }));
  ok(!r.pwn && !r.img && r.h.startsWith('<img') && !r.btn, 'HTML in the words shows as text; a javascript: link gets no button', JSON.stringify(r)); await ctx.close(); }
// the editor on the admin page
{ const ctx = await b.newContext({ viewport: { width: 1100, height: 1300 }, deviceScaleFactor: 1 }), p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); let saved = null, sentKey = null;
  await p.route('**/api/featured/admin', r => r.fulfill({ json: { default: [], days: {} } }));
  await p.route('**/api/banner/admin', async r => { sentKey = r.request().headers()['x-admin-key']; if (r.request().method() === 'POST') { saved = JSON.parse(r.request().postData()); return r.fulfill({ json: { ok: true, saved: { ...saved, at: 2 } } }); } return r.fulfill({ json: { on: false } }); });
  await p.route('**/picks.html', async r => { const res = await r.fetch(); const body = (await res.text()).replace('/*@games*/null', JSON.stringify([{ id: 'arrowwood', title: 'Arrowwood', cover: 'media/arrowwood-cover.jpg' }, { id: 'duelpoint', title: 'Duelpoint', cover: 'media/duelpoint-cover.jpg' }])); r.fulfill({ response: res, body }); });
  await p.goto(BASE + '/picks.html', { waitUntil: 'domcontentloaded' }); await p.fill('#k', 'test-admin-code-123456'); await p.click('#kGo'); await p.waitForSelector('#bTitle');
  await p.fill('#bTitle', 'Three new maps in Arrowwood!'); await p.click('[data-tag="NEW"]'); await p.fill('#bText', BANNER.text);
  await p.selectOption('#bKind', 'game'); await p.selectOption('#bGame', 'arrowwood'); await p.click('[data-style="sunset"]'); await p.click('#bOn');
  const pv = await p.evaluate(() => { const e = document.querySelector('#bPv .sbn'); return e ? { title: e.querySelector('h2').textContent, style: e.dataset.style, tag: (e.querySelector('.sbn-tag') || {}).textContent, x: !!e.querySelector('.sbn-x') } : null; });
  ok(pv && pv.title === 'Three new maps in Arrowwood!' && pv.style === 'sunset' && pv.tag === 'NEW' && !pv.x, 'the editor shows a live preview as you type', JSON.stringify(pv));
  await p.screenshot({ path: `${OUT}/editor.png`, fullPage: false });
  await p.click('#bSave'); await p.waitForTimeout(400);
  ok(saved && saved.on && saved.title === 'Three new maps in Arrowwood!' && saved.link === '#play-arrowwood' && saved.button === 'Play now' && saved.style === 'sunset' && sentKey === 'test-admin-code-123456', 'saving sends the banner with the admin code', JSON.stringify(saved));
  ok(/within a minute/.test(await p.textContent('#bMsg')), 'it says when the homepage will show it');
  ok(!errs.length, 'editor: no page errors', JSON.stringify(errs.slice(0, 2))); await ctx.close(); }
console.log(fails ? fails + ' FAILED' : 'ALL OK'); await b.close();
