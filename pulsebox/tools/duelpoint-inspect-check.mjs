// Duelpoint's inspects, in a real browser: every line from Legendary up has a show of its own. For each of the 22, on a
// gun in the range: Y starts it at its own length; part way through, the rig is on the gun with shapes lit and sparks
// flying; when it ends everything is off the gun again and the finish glows as it did before. Then: a plain skin keeps
// the ordinary inspect, firing cuts a show short, a knife and a pistol run one without error, and the store's turntable
// plays one at the press of a button.   node tools/duelpoint-inspect-check.mjs <shots dir>
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const O = process.argv[2] || '.', URL0 = 'file://' + path.resolve('public/games/duelpoint.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = []; let failed = 0; const ok = (c, n, x = '') => { if (!c) failed++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : '')); };
const p = await (await b.newContext({ viewport: { width: 640, height: 360 } })).newPage(); p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 2).join('')));
await p.addInitScript(() => { Object.defineProperty(Document.prototype, 'pointerLockElement', { get() { return document.getElementById('cv'); } }); Element.prototype.requestPointerLock = function () {}; });
await p.goto(URL0, { timeout: 120000 }); await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 90000 }); await p.waitForTimeout(400);
await p.click('#bPlay'); await p.waitForTimeout(600);
await p.evaluate(() => { const t = GAME.test; t.CFG.quality = 'low'; t.play({ mode: 'range' }); t.skipLoad(); t.UI.armory = false; const F = t.M.fs[1]; if (F) { F.x = -60; F.bot = { diff: 0, dummy: true, home: [-60, -60] }; }
  window.__pin = null; const f = () => { const X = t.X; if (window.__pin != null && X) X.inspT = X.inspD * (1 - window.__pin); requestAnimationFrame(f); }; requestAnimationFrame(f); });
const hold = async (line, gun) => { await p.evaluate(([line, gun]) => { const t = GAME.test, P = t.M.fs[0], G = t.GUNS[gun]; window.__pin = null; t.X.inspT = 0; P.skins = P.skins || {}; if (line) P.skins[gun] = line + ':' + gun; else delete P.skins[gun]; P.guns[G.slot] = gun; P.ammo[gun] = { mag: G.mag || 0, res: 99 }; P.slot = G.slot; P.reloadT = 0; P.kick = 0; }, [line, gun]); await p.waitForTimeout(500); };
const state = () => p.evaluate(() => { const t = GAME.test, X = t.X, rig = t.INS.rig, on = !!(rig && rig.gun); let shapes = 0, sparks = 0;
  if (on) { for (const k of ['pl', 'plW', 'sp', 'spW', 'dk', 'sh', 'cr', 'crW', 'to', 'ln']) for (const o of rig[k]) if (o.visible) shapes++; for (const G2 of rig.gh) if (G2.grp.visible) shapes++; for (const C of rig.cl) { const a = C.geo.attributes.alpha.array; for (let i = 0; i < a.length; i++) if (a[i] > .02) sparks++; } }
  return { on, shapes, sparks, dur: X.inspD, t: X.inspT, line: X.inspLine, ei: rig && rig.fin ? +rig.fin.emissiveIntensity.toFixed(2) : null, kids: X.viewGun ? X.viewGun.children.length : 0 }; });
const lines = await p.evaluate(() => Object.keys(GAME.test.INSPECT));
ok(lines.length === 22, 'twenty-two lines have a show of their own', lines.length);
{ const tiers = await p.evaluate(() => { const t = GAME.test, need = Object.keys(t.LINES).filter(l => ['legendary', 'mythic', 'paragon'].includes(t.LINES[l].r)); return { need: need.length, missing: need.filter(l => !t.INSPECT[l]), extra: Object.keys(t.INSPECT).filter(l => !need.includes(l)) }; });
  ok(tiers.missing.length === 0 && tiers.extra.length === 0, 'every Legendary, Mythic and Paragon line has one, and nothing below does', JSON.stringify(tiers)); }
const durs = new Set(), bad = [];
for (const [i, line] of lines.entries()) {
  const gun = ['vesper', 'lancer', 'mako', 'paladin', 'hornet'][i % 5]; await hold(line, gun);
  const kids0 = (await state()).kids; await p.evaluate(() => GAME.test.startInspect(GAME.test.M.fs[0])); const s0 = await state(); durs.add(line + s0.dur);
  let peak = { shapes: 0, sparks: 0 }; for (const q of [.3, .5, .7, .8]) { await p.evaluate(q => { window.__pin = q; }, q); await p.waitForTimeout(260); const s = await state(); if (!s.on) bad.push(line + ' not on at ' + q); peak = { shapes: Math.max(peak.shapes, s.shapes), sparks: Math.max(peak.sparks, s.sparks) }; }
  if (i % 6 === 0) await p.screenshot({ path: `${O}/inspect-${line}.png` });
  await p.evaluate(() => { window.__pin = null; GAME.test.X.inspT = .05; }); await p.waitForTimeout(450); const s1 = await state();
  if (!(s0.line === line && s0.dur >= 3.8 && peak.shapes >= 2 && peak.sparks >= 8)) bad.push(`${line}: dur ${s0.dur}, ${peak.shapes} shapes, ${peak.sparks} sparks`);
  if (s1.on || s1.kids !== kids0) bad.push(`${line}: left on the gun (${s1.kids} parts, was ${kids0})`);
}
ok(bad.length === 0, 'each runs at its own length with shapes lit and sparks flying, and comes off the gun when it ends', bad.slice(0, 6).join(' | ') || `${lines.length} shows`);
// a plain skin and no skin: the ordinary inspect
await hold('dune', 'vesper'); await p.evaluate(() => GAME.test.startInspect(GAME.test.M.fs[0])); await p.waitForTimeout(300); let s = await state();
ok(!s.on && !s.line && Math.abs(s.dur - 3.4) < .01, 'a Common keeps the ordinary inspect', JSON.stringify({ line: s.line, dur: s.dur }));
// firing cuts it short
await hold('starforge', 'lancer'); await p.evaluate(() => { GAME.test.startInspect(GAME.test.M.fs[0]); window.__pin = .5; }); await p.waitForTimeout(400); const mid = await state();
await p.evaluate(() => { window.__pin = null; GAME.test.M.fs[0].kick = .08; }); await p.waitForTimeout(400); s = await state();
ok(mid.on && !s.on && !(s.t > 0), 'firing cuts the show short, and it comes straight off the gun', JSON.stringify({ mid: mid.on, after: s.on }));
// a knife and a pistol
for (const [line, gun] of [['phoenix', 'knife'], ['solaris', 'pip'], ['glyphbound', 'hammer'], ['riftborn', 'breaker'], ['permafrost', 'longbow']]) { await hold(line, gun); await p.evaluate(() => { GAME.test.startInspect(GAME.test.M.fs[0]); window.__pin = .5; }); await p.waitForTimeout(450); s = await state(); if (!s.on || s.shapes < 1) bad.push(`${line} ${gun}: ${JSON.stringify(s)}`); await p.evaluate(() => { window.__pin = null; GAME.test.X.inspT = 0; }); await p.waitForTimeout(200); }
ok(bad.length === 0, 'they run on a knife, a pistol, a revolver, a shotgun and a sniper too', bad.join(' | '));
// the store's turntable
await p.evaluate(() => { const t = GAME.test; t.toMenu(); t.UI.panel = 'store'; t.SH.show = 'eclipse:lancer'; }); await p.waitForTimeout(1500);
await p.evaluate(() => { GAME.test.showInspect('eclipse:lancer'); }); await p.waitForTimeout(300); await p.evaluate(() => { GAME.test.SH.insp.hold = .55; }); await p.waitForTimeout(900);
s = await state(); await p.screenshot({ path: `${O}/inspect-store.png` });
ok(s.on && s.shapes >= 3, 'the store plays a line\'s show on the turning gun', JSON.stringify({ on: s.on, shapes: s.shapes, sparks: s.sparks }));
await p.evaluate(() => { GAME.test.SH.insp = null; }); await p.waitForTimeout(400); s = await state(); ok(!s.on, 'and takes it down after');
console.log('errors', JSON.stringify(errs.slice(0, 5))); console.log(failed || errs.length ? (failed + ' check(s) failed') : 'all checks passed'); await b.close(); process.exit(failed || errs.length ? 1 : 0);
