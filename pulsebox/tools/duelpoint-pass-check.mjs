// Duelpoint's levels, season pass, challenges and what a match shows when it ends, on a desktop and on a small phone.
// The PASS page: thirty tiers, six challenges, your card; premium unlocks with coins and hands over the tiers passed.
// A round's end shows your team's round. A match's end: the line-up (every operative, an award under each), then the
// rewards (coins, XP, level, pass), then the scoreboard; the XP it paid is saved.
//   node tools/duelpoint-pass-check.mjs <shots dir>
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const O = process.argv[2] || '.', URL0 = 'file://' + path.resolve('public/games/duelpoint.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = []; let failed = 0; const ok = (c, n, x = '') => { if (!c) failed++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : '')); };
const saved = p => p.evaluate(() => (JSON.parse(localStorage.getItem('pbx-duelpoint') || '{}').dp || {}).stats || {});
async function page(vp, touch) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 }), p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); return p;
}
const boot = async p => { await p.goto(URL0, { timeout: 120000 }); await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 90000 }); await p.waitForTimeout(500); await p.evaluate(() => document.getElementById('bPlay').click()); await p.waitForTimeout(800); };
// every label drawn on the page, to see nothing collides: fillText boxes that overlap by more than a sliver
const overlaps = p => p.evaluate(() => new Promise(res => { const P = CanvasRenderingContext2D.prototype, real = P.fillText, boxes = []; P.fillText = function (s, x, y) { try { const m = this.getTransform(), w = this.measureText(s).width, px = parseFloat(this.font.match(/([\d.]+)px/)[1]), al = this.textAlign, x0 = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x, a = m.transformPoint(new DOMPoint(x0, y - px * .42)), c = m.transformPoint(new DOMPoint(x0 + w, y + px * .42)); if (this.canvas.isConnected && this.globalAlpha > .5 && String(s).trim()) boxes.push({ s: String(s), x0: a.x, y0: a.y, x1: c.x, y1: c.y }); } catch (e) {} return real.apply(this, arguments); };
  requestAnimationFrame(() => { boxes.length = 0; requestAnimationFrame(() => { P.fillText = real; const bad = []; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0), oy = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0); if (ox > 3 && oy > 3 && A.s !== B.s) bad.push(A.s + ' ✕ ' + B.s); } res({ n: boxes.length, bad: bad.slice(0, 6) }); }); }); }));

for (const [vp, touch, tag] of [[{ width: 1366, height: 768 }, false, 'desktop'], [{ width: 667, height: 375 }, true, 'phone']]) {
  console.log(tag);
  const p = await page(vp, touch); await boot(p);
  // the PASS page
  await p.evaluate(() => { GAME.test.UI.panel = 'pass'; }); await p.waitForTimeout(700); await p.screenshot({ path: `${O}/pass-${tag}.png` });
  let r = await p.evaluate(() => { const t = GAME.test; return { tiers: t.passRewards().length, ch: t.myChallenges().map(c => c.words), s: t.seasonNow().n, lv: t.myCard().lv, tier: t.passTier() }; });
  ok(r.tiers === 30 && r.ch.length === 6 && r.s >= 1 && r.lv === 1 && r.tier === 0, 'the PASS page: a season, thirty tiers, three daily and three weekly challenges; you start at level 1, tier 0', r.ch[0]);
  let ov = await overlaps(p); ok(ov.n > 30 && !ov.bad.length, 'nothing written on it collides', ov.n + ' labels' + (ov.bad.length ? ': ' + ov.bad.join(' | ') : ''));
  // some play behind you: tier 7, and the coins for premium
  r = await p.evaluate(() => { const t = GAME.test; t.myPass().xp = 7400; t.STATS.xp = 7400; t.STATS.coins = 3500; const free = t.payProgress({ stat: { k: 0, d: 0, hs: 0, dmg: 0 } }, { wins: [0, 5], online: false }, false, {}).got.length; const got = t.buyPremium(); t.PS.toast = { t0: performance.now(), got }; t.PS.off = null; return { free, prem: got && got.length, coins: t.STATS.coins, tier: t.passTier(), skins: t.STATS.skins.length, lv: t.myCard().lv, card: t.myCard() }; });
  ok(r.free === 7 && r.prem === 7 && r.tier === 7 && r.skins >= 2 && r.lv > 5, 'tier 7 grants seven free rewards; premium (3000 coins) then hands over its seven', JSON.stringify(r));
  await p.waitForTimeout(600); await p.screenshot({ path: `${O}/pass-${tag}-premium.png` });
  await p.evaluate(() => { GAME.test.PS.toast = null; }); await p.waitForTimeout(200); ov = await overlaps(p); ok(!ov.bad.length, 'with rewards claimed, still nothing collides', ov.bad.join(' | '));
  // a match: a round's end shows the team's round
  await p.evaluate(() => { const t = GAME.test; t.CFG.quality = 'low'; t.STATS.title = 'Deadeye'; t.play({ mode: 'bot', size: 3, diff: 1 }); }); await p.waitForTimeout(1500); await p.screenshot({ path: `${O}/loading-${tag}.png` });
  ov = await overlaps(p); ok(!ov.bad.length, 'the loading screen: a level on every card, and nothing collides', ov.bad.join(' | '));
  await p.evaluate(() => { const t = GAME.test; t.skipLoad(); t.UI.armory = false; t.M.phase = 'live'; t.M.t = 60; const P = t.M.fs[0], foes = t.M.fs.filter(f => f.team !== P.team); P.stat.dmg += 160; for (const f of foes) t.hurt(f, 500, P, true); t.tick(.3); });
  await p.waitForTimeout(900); r = await p.evaluate(() => { const t = GAME.test; return { phase: t.M.phase, last: t.M.last, rk: t.M.fs[0].stat.k - t.M.fs[0].stat.k0 }; }); await p.screenshot({ path: `${O}/round-end-${tag}.png` });
  ok(r.phase === 'end' && r.last && r.last.wi === 0 && r.rk === 3, 'a round ends: the band, and your team\'s kills and damage for that round', JSON.stringify(r));
  // the match ends: the line-up
  const before = await p.evaluate(() => ({ xp: GAME.test.STATS.xp, coins: GAME.test.STATS.coins }));
  await p.evaluate(() => { const t = GAME.test; t.botMe(1); for (let i = 0; i < 60 * 900 && !t.M.over; i++) t.tick(1 / 60); }); await p.waitForTimeout(1800); await p.screenshot({ path: `${O}/lineup-${tag}.png` });
  r = await p.evaluate(() => { const t = GAME.test, S = t.X.lu; return { screen: t.screen, stage: t.M.overStage | 0, n: S ? S.fakes.length : 0, pts: S ? S.pts.map(q => [Math.round(q.x), Math.round(q.y), Math.round(q.yh)]) : [], aw: t.M.awards ? [...t.M.awards.values()].map(a => a.title) : [], view: [K.view.x0, K.view.x1, K.view.y0, K.view.y1].map(Math.round) }; });
  ok(r.screen === 'over' && r.stage === 0 && r.n === 6 && r.aw.length === 6 && r.aw.filter(a => a === 'MATCH MVP').length === 1, 'the match ends on the line-up: six operatives, an award under each, one match MVP', r.aw.join(', '));
  ok(r.pts.length === 6 && r.pts.every((q, i) => q[0] > r.view[0] + 20 && q[0] < r.view[1] - 20 && q[2] > r.view[2] + 40 && q[1] < r.view[3] - 60 && (!i || q[0] > r.pts[i - 1][0] + 30)), 'they stand in a row inside the screen, head to foot, room under each for its plate', JSON.stringify(r.pts));
  ov = await overlaps(p); ok(!ov.bad.length, 'the plates do not run into each other', ov.bad.join(' | '));
  // on to the rewards
  await p.evaluate(() => GAME.test.overNext()); await p.waitForTimeout(2600); await p.screenshot({ path: `${O}/rewards-${tag}.png` });
  r = await p.evaluate(() => { const t = GAME.test, R = t.M.prog; return { stage: t.M.overStage, xp: R.xp.total, rows: R.xp.rows.length, coins: t.M.pay.total, lv: R.level.map(l => l.l), pass: R.pass, moved: R.ch.moved.length, fakes: t.X.lu.fakes.length, agents: [...t.X.agents.keys()].filter(f => /^lu/.test(f.key)).length }; });
  ok(r.stage === 1 && r.xp > 150 && r.coins > 0 && r.pass.xp1 - r.pass.xp0 === r.xp && r.moved >= 1, 'then the rewards: coins, XP for your level and for the pass, the challenges it moved', JSON.stringify(r));
  ok(r.fakes === 0 && r.agents === 0, 'the line-up\'s models are cleared away');
  ov = await overlaps(p); ok(!ov.bad.length, 'nothing on the rewards collides', ov.bad.join(' | '));
  const st = await saved(p); ok(st.xp === before.xp + r.xp && st.coins >= before.coins + r.coins && st.pass && st.pass.xp === r.pass.xp1, 'the XP, the coins and the pass are saved', `${st.xp} XP, ${st.coins} coins`);
  await p.evaluate(() => GAME.test.overNext()); await p.waitForTimeout(700); await p.screenshot({ path: `${O}/scoreboard-${tag}.png` });
  r = await p.evaluate(() => ({ stage: GAME.test.M.overStage, screen: GAME.test.screen })); ok(r.stage === 2 && r.screen === 'over', 'then the scoreboard, with PLAY AGAIN and MENU');
  // the locker: the loadout by class, then one weapon and its skins
  await p.evaluate(() => { const t = GAME.test; t.toMenu(); for (const id of ['inferno:vesper', 'voidline:vesper', 'starforge:vesper', 'jade:vesper', 'hive:vesper', 'storm:pip', 'celestial:knife', 'toxic:longbow']) if (t.skinOfId(id) && !t.STATS.skins.includes(id)) t.STATS.skins.push(id); t.STATS.equip.vesper = 'inferno:vesper'; t.STATS.equip.knife = 'celestial:knife'; t.STATS.equip.pip = 'storm:pip'; t.UI.panel = 'locker'; t.SH.lview = 'grid'; });
  await p.waitForTimeout(900); await p.screenshot({ path: `${O}/locker-${tag}.png` });
  r = await p.evaluate(() => { const t = GAME.test, V = K.view, zs = t.zones.filter(z => z.y > V.y0 + 100 && z.w > (V.x1 - V.x0) * .18 && z.w < (V.x1 - V.x0) * .3); return { tiles: zs.length, fit: zs.every(z => z.x >= V.x0 && z.x + z.w <= V.x1 + 1 && z.y + z.h <= V.y1 + 1), small: Math.min(...zs.map(z => z.h)) * innerHeight / (V.y1 - V.y0) }; });
  ok(r.tiles === 17 && r.fit && r.small >= 14, 'the locker opens on the loadout: all seventeen weapons by class, every tile on the screen', JSON.stringify(r));
  ov = await overlaps(p); ok(!ov.bad.length, 'nothing in the loadout collides', ov.bad.join(' | '));
  await p.evaluate(() => { const t = GAME.test; t.SH.locker = 'vesper'; t.SH.lview = 'gun'; t.SH.lsel = null; t.SH.lpage = 0; }); await p.waitForTimeout(1500); await p.screenshot({ path: `${O}/locker-gun-${tag}.png` });
  r = await p.evaluate(() => { const t = GAME.test, S = t.X.gs; return { key: S && S.key, cards: t.zones.filter(z => z.w > 60 && z.h > 30 && z.x > 640).length }; });
  ok(r.key === 'inferno:vesper' && r.cards >= 4, 'press a weapon: it turns in what it wears, its skins are cards beside it', JSON.stringify(r));
  await p.evaluate(() => { GAME.test.SH.lsel = 'voidline:vesper'; }); await p.waitForTimeout(700);
  r = await p.evaluate(() => ({ key: GAME.test.X.gs.key, eq: GAME.test.STATS.equip.vesper })); ok(r.key === 'voidline:vesper' && r.eq === 'inferno:vesper', 'press a card: that skin is on the gun to look at, and nothing is equipped yet', JSON.stringify(r));
  await p.evaluate(() => GAME.test.equipSkin('vesper', 'voidline:vesper')); await p.waitForTimeout(300); await p.screenshot({ path: `${O}/locker-gun2-${tag}.png` });
  ov = await overlaps(p); ok(!ov.bad.length, 'nothing in the weapon view collides', ov.bad.join(' | '));
  ok((await saved(p)).equip.vesper === 'voidline:vesper', 'EQUIP puts it on, and saves it');
  await p.evaluate(() => GAME.esc()); r = await p.evaluate(() => ({ v: GAME.test.SH.lview, p: GAME.test.UI.panel })); ok(r.v === 'grid' && r.p === 'locker', 'Escape goes back to the loadout');
  // back in the menu, your level is on your card; a reload keeps it
  await boot(p); await p.evaluate(() => { GAME.test.UI.panel = 'pass'; GAME.test.PS.off = null; }); await p.waitForTimeout(500);
  r = await p.evaluate(() => { const t = GAME.test; return { lv: t.myCard().lv, tier: t.passTier(), prem: t.myPass().prem, xp: t.STATS.xp }; }); ok(r.xp === st.xp && r.prem && r.tier >= 7, 'after a reload: the level, the tier and premium are all still there', JSON.stringify(r));
  await p.context().close();
}
// a lobby: your card (level, title, banner) reaches the others in the room, and theirs reaches you (through the live room relay)
if (process.env.HTTPS_PROXY || process.argv[3] === 'lobby') {
  console.log('lobby');
  const b2 = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', ...(process.env.HTTPS_PROXY ? ['--proxy-server=' + process.env.HTTPS_PROXY] : [])] });
  const open = async name => { const ctx = await b2.newContext({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: true }), p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message));
    await p.addInitScript(n => { try { localStorage.setItem('pbx-mp-name', n); } catch (e) {} }, name); await p.goto(URL0, { waitUntil: 'domcontentloaded', timeout: 120000 }); await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 120000 }); await p.waitForTimeout(500); await p.click('#bPlay'); await p.waitForTimeout(600); return p; };
  try {
    const H = await open('Hale'), C = await open('Coral');
    await H.evaluate(() => { const t = GAME.test; t.STATS.xp = 52000; t.STATS.titles = ['Deadeye']; t.STATS.title = 'Deadeye'; t.STATS.banners = ['ember']; t.STATS.banner = 'ember'; t.openParty(); MP.create(); }); await H.waitForFunction(() => MP.online() && MP.code, null, { timeout: 30000 }); const code = await H.evaluate(() => MP.code);
    await C.evaluate(c => { const t = GAME.test; t.STATS.xp = 9000; t.openParty(); MP.join(c); }, code); await C.waitForFunction(() => MP.online() && MP.players().length === 2, null, { timeout: 30000 }); await C.waitForTimeout(2500);
    const seen = await C.evaluate(() => { const t = GAME.test, pr = t.PARTY.prof.get(MP.hostId); return pr && pr.cd; }), back = await H.evaluate(() => { const t = GAME.test, o = MP.players().find(p => p.id !== MP.id), pr = o && t.PARTY.prof.get(o.id); return pr && pr.cd; });
    const want = await H.evaluate(() => GAME.test.myCard()); await C.screenshot({ path: `${O}/lobby-friend.png` }); await H.screenshot({ path: `${O}/lobby-host.png` });
    ok(seen === `${want.lv}|6|ember` && want.lv > 20, 'the friend sees the host\'s level, title and banner on their lobby card', seen);
    ok(back && +back.split('|')[0] >= 5, 'and the host sees the friend\'s level', back);
  } catch (e) { ok(false, 'the lobby could be reached', e.message.slice(0, 120)); }
  await b2.close();
}
console.log('errors', JSON.stringify(errs.slice(0, 5))); console.log(failed || errs.length ? (failed + ' check(s) failed') : 'all checks passed'); await b.close(); process.exit(failed || errs.length ? 1 : 0);
