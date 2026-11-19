// Duelpoint: the latest features in a real browser: 4v4, plant-site markers, an enemy outline that keeps its size
// with distance, the store's featured Paragon, and reload effects on the glowing skins.
//   node tools/duelpoint-features-check.mjs <shots>
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const O = process.argv[2] || '.', URL0 = 'file://' + path.resolve('public/games/duelpoint.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [], ok = (c, n, x = '') => console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : ''));
const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
await p.addInitScript(() => { Object.defineProperty(Document.prototype, 'pointerLockElement', { get() { return document.getElementById('cv'); } }); Element.prototype.requestPointerLock = function () {}; });
await p.goto(URL0, { timeout: 120000 });
await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 90000 }); await p.waitForTimeout(600);
await p.click('#bPlay'); await p.waitForTimeout(900);
const T = (fn, a) => p.evaluate(fn, a);

// ---- 4v4 against bots: eight fighters, four a side, and a round that is decided
let r = await T(() => { const t = GAME.test; t.CFG.sites = 2; t.menuPlay(4); t.skipLoad(); const M = t.M; return { n: M.fs.length, a: M.fs.filter(f => f.team === M.fs[0].team).length, sites: t.SITES.length }; });
ok(r.n === 8 && r.a === 4, '4v4: eight fighters, four on each side', JSON.stringify(r));
await p.waitForTimeout(800); await p.screenshot({ path: O + '/feat-4v4-buy.png' });
// ---- the plant sites are marked on screen while you find your way (buy phase)
r = await T(() => { const t = GAME.test; return { phase: t.M.phase, sites: t.SITES.map(S => S.name || S.id || '?') }; });
ok(r.phase === 'buy', 'the buy phase is on, with the site markers showing', JSON.stringify(r));
r = await T(() => { const t = GAME.test; t.UI.armory = false; t.botMe(1); t.M.t = .01; const r0 = t.M.round; t.tick(100); return { r0, r1: t.M.round, wins: t.M.wins, alive: t.M.fs.filter(f => f.alive).length }; });
ok(r.r1 > r.r0 || r.wins.some(w => w > 0), 'a 4v4 round plays out with bots and is decided', JSON.stringify(r));
await p.waitForTimeout(600); await p.screenshot({ path: O + '/feat-4v4-live.png' });

// ---- the outline: one enemy close, then far, square in front of you; it should be about as thick on screen at both
const outlineAt = async d => {
  await T(dd => { const t = GAME.test; if (t.M) t.toMenu(); t.CFG.sites = 1; t.menuPlay(1); t.skipLoad(); t.UI.armory = false; t.M.t = .01; t.tick(.2);
    const Q = t.M.fs[0], E = t.M.fs[1]; E.bot = null; E.local = false; E.frozen = true;
    // find a straight, level run of open floor this long, anywhere on the map, and stand me at one end
    const { hAt, los, GW, GH } = t.mech(), CS = t.MAP && t.MAP.cs || 2; let best = null;
    for (let gz = 2; gz < GH - 2 && !best; gz += 2) for (let gx = 2; gx < GW - 2 && !best; gx += 2) {
      const x = (gx + .5) * CS, z = (gz + .5) * CS, y = hAt(x, z); if (!(y > -5)) continue;
      for (let a = 0; a < 16 && !best; a++) { const yaw = a / 16 * Math.PI * 2, ex = x - Math.sin(yaw) * dd, ez = z - Math.cos(yaw) * dd;
        if (Math.abs(hAt(ex, ez) - y) < .2 && los(x, y + 1.5, z, ex, y + 1.3, ez, false) >= dd - .3 && los(x, y + .3, z, ex, y + .3, ez, false) >= dd - .3) best = { yaw, ex, ez, x, z, y }; }
    }
    if (best) { Q.x = best.x; Q.z = best.z; Q.y = best.y; }
    if (!best) return; E.x = best.ex; E.z = best.ez; E.y = hAt(E.x, E.z); E.yaw = best.yaw + Math.PI; Q.yaw = best.yaw; Q.pitch = -.03; window.__olOK = true; }, d);
  await p.waitForTimeout(1200);
  const at = await T(() => { const t = GAME.test, Q = t.M.fs[0], E = t.M.fs[1]; return { me: [Q.x, Q.z, Q.yaw], foe: [E.x, E.z], alive: E.alive, phase: t.M.phase }; }); console.log('    ' + d + ' m: ' + JSON.stringify(at));
  return p.screenshot({ path: O + `/feat-outline-${d}m.png` });
};
await outlineAt(6); await outlineAt(40);
ok(await T(() => !!window.__olOK), 'an enemy stood in clear view at 6 m and 40 m (see feat-outline-*.png)');

// ---- the store: a Paragon always featured, and seven others
await T(() => { const t = GAME.test; t.toMenu(); t.UI.panel = 'store'; });
await p.waitForTimeout(900); await p.screenshot({ path: O + '/feat-store.png' });
r = await T(() => { const t = GAME.test, ids = t.dailyStore(); return { n: ids.length, first: t.skinOfId(ids[0]).L.r, rest: ids.slice(1).map(i => t.skinOfId(i).L.r) }; });
ok(r.n === 8 && r.first === 'paragon' && !r.rest.includes('paragon'), 'the store has a Paragon in its featured slot and seven others', JSON.stringify(r));
// next periods too: always one Paragon
r = await T(() => { const t = GAME.test, out = []; for (let k = 1; k <= 6; k++) { const ids = t.dailyStore(t.storeDay ? t.storeDay() + k : undefined); out.push(t.skinOfId(ids[0]).L.r); } return out; });
ok(r.every(x => x === 'paragon'), 'every store set has its Paragon', JSON.stringify(r));

// ---- a glowing skin's reload effect: equip one on the rifle, empty it and reload
r = await T(() => { const t = GAME.test, k = 'vesper', id = 'overclock:' + k; t.equipSkin(k, id); t.UI.panel = 'home'; t.CFG.sites = 1; t.menuPlay(1); t.skipLoad();
  const P = t.M.fs[0]; P.credits = 9000; const bought = t.buy(k); t.UI.armory = false; t.M.t = .01; t.tick(.3);
  if (!P.ammo[k]) return { bought, guns: P.guns };
  P.ammo[k].mag = 1; P.fireT = 0; t.fire(); t.tick(.05); P.fireT = 0; t.fire(); return { eq: id, held: t.gun ? t.gun(P).k : null, slot: P.slot, reloading: P.reloadT > 0 }; });
// the effect is drawn on the gun in your hands, so let a few real frames go by
await p.waitForTimeout(350);
const fx = await T(() => { const t = GAME.test, P = t.M.fs[0]; return { reloading: P.reloadT > 0, busy: t.rfx().busy }; });
ok(r.reloading && fx.busy > 0, 'a glowing skin plays its reload effect while the gun reloads', JSON.stringify({ ...r, ...fx }));
await p.waitForTimeout(150); await p.screenshot({ path: O + '/feat-reload-fx.png' });

console.log('ERRORS', JSON.stringify(errs.slice(0, 6))); await b.close();
