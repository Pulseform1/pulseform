// Duelpoint: every Legendary, Mythic and Paragon skin on every weapon, checked piece by piece: nothing it adds may sink
// into a rail or sight sitting on top, cover or cross the bore (or hang in front of it), or rise into the line you aim
// along. Also builds every skin of every rarity once to catch errors.
//   node tools/duelpoint-skin-check.mjs
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext()).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.goto('file://' + path.resolve('public/games/duelpoint.html')); await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 90000 });
const r = await p.evaluate(() => { window.DP_AUDIT = 1; const t = GAME.test, L = t.LINES, guns = ['pip', 'wasp', 'quill', 'hammer', 'stub', 'gnat', 'hornet', 'breaker', 'thresher', 'mako', 'paladin', 'vesper', 'lancer', 'kite', 'longbow', 'torrent', 'knife'], bad = [], built = { n: 0, fail: [] };
  for (const ln of Object.keys(L)) for (const k of guns) { let gm; try { gm = t.gunModel(k, { skin: ln + ':' + k }); built.n++; } catch (e) { built.fail.push(ln + ':' + k + ' ' + e.message); continue; }
    const a = gm.userData.audit; if (a && (a.rail || a.bore || a.front || a.sight)) bad.push({ s: ln + ':' + k, rail: a.rail, bore: a.bore, front: a.front, sight: a.sight, where: a.where.slice(0, 3) });
    gm.traverse(o => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); }); }
  return { built, bad }; });
console.log('built', r.built.n, 'skins;', r.built.fail.length, 'failed'); for (const f of r.built.fail.slice(0, 10)) console.log('  FAIL build', f);
const by = {}; for (const x of r.bad) { const ln = x.s.split(':')[0]; (by[ln] = by[ln] || []).push(x); }
for (const [ln, xs] of Object.entries(by)) { console.log(ln); for (const x of xs) console.log('   ', x.s.split(':')[1].padEnd(9), 'rail', x.rail, 'bore', x.bore, 'front', x.front, 'sight', x.sight, '|', x.where.join(' ; ')); }
console.log(r.bad.length || r.built.fail.length ? r.bad.length + ' skins with problems, ' + r.built.fail.length + ' that did not build' : 'no problems: every skin builds, and rails, sights, bores and the aim line are all clear');
if (r.bad.length || r.built.fail.length) process.exitCode = 1;
console.log('errors', JSON.stringify(errs.slice(0, 5))); await b.close();
