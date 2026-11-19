// Frontier Hunter, the new features in a real browser: the four guns (aimed shots go along the sights; the long rifle's
// scope), coins for a kill, the ammunition shop, dangerous big game (a grizzly's charge and maul, a stalking cougar, a
// wolf pack), dying and waking at camp, eating to heal, fishing, the trail home on the map, and the regions' animals.
//   node tools/frontier-features-check.mjs <shots>
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const O = process.argv[2] || '.', FILE = 'file://' + path.resolve('public/games/frontier-hunter.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [], ok = (c, n, x = '') => { console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : '')); if (!c) process.exitCode = 1; };
async function open(region, seed = 1234) {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  p.on('pageerror', e => errs.push(region + ': ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join('|')));
  await p.goto(`${FILE}?spawn=${region}&seed=${seed}&q=medium`, { timeout: 120000 });
  await p.waitForFunction(() => window.__fh && __fh.G.state === 'play', null, { timeout: 240000 });
  await p.evaluate(() => { __fh.hold(true); __fh.tick(30); }); return p;
}
const T = (p, fn, a) => p.evaluate(fn, a);
const shot = async (p, name, frames = 2) => { const d = await T(p, f => __fh.snap(f), frames); fs.writeFileSync(`${O}/${name}.jpg`, Buffer.from(d.split(',')[1], 'base64')); };
// helpers inside the page: an animal placed in front of you, and aiming at it
const HELP = () => {
  window.__h = {
    clearAll() { const W = __fh.G.wildlife; for (const g of [...W.groups]) W.removeGroup(g); W.seeded = true; W.target = 0; },
    place(kind, dist, side = 0, n = 1) { const G = __fh.G, P = G.player, f = new __fh.THREE.Vector3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), r = new __fh.THREE.Vector3(Math.cos(P.yaw), 0, -Math.sin(P.yaw)); const x = P.pos.x + f.x * dist + r.x * side, z = P.pos.z + f.z * dist + r.z * side; const g = G.wildlife.spawnGroup(kind, x, z, n); for (const a of g.members) { a.pos.x = x; a.pos.z = z; a.ground(); a.yaw = Math.atan2(P.pos.x - x, P.pos.z - z) + Math.PI / 2; } return g; },
    aimAt(a, y = .8) { const G = __fh.G, c = __fh.camera.position, P = G.player; a.m.mesh.updateMatrixWorld(true); const t = new __fh.THREE.Vector3(); a.m.B.chest.getWorldPosition(t); P.yaw = Math.atan2(-(t.x - c.x), -(t.z - c.z)); P.pitch = Math.atan2(t.y - c.y - .05, Math.hypot(t.x - c.x, t.z - c.z)); P.applyCamera(); },
    fire() { __fh.input.clicked.add(0); __fh.tick(1); },
    ads(on) { __fh.input.mouseDown[2] = on; },
  };
};
// ================= the forest: guns, coins, the shop, the grizzly, the cougar, the wolves
let p = await open('forest');
await T(p, HELP);
let r = await T(p, () => { const W = __fh.G.weapons; __h.clearAll(); W.select('longrifle'); __fh.tick(30); __h.ads(true); __fh.tick(40); return { cur: W.current, scoped: +W.scoped.toFixed(2), fov: +__fh.camera.fov.toFixed(1), overlay: getComputedStyle(document.querySelector('#scope')).opacity }; });
ok(r.cur === 'longrifle' && r.scoped > .9 && r.fov < 10 && r.overlay === '1', 'the long rifle: aim and you look through the scope (8x)', JSON.stringify(r));
r = await T(p, () => { const W = __fh.G.weapons; __fh.input.wheel = -1; __fh.tick(1); __fh.tick(10); const f2 = __fh.camera.fov; __fh.input.wheel = 1; __fh.tick(1); __fh.tick(10); return [+f2.toFixed(1), +__fh.camera.fov.toFixed(1)]; });
ok(r[0] < r[1], 'the wheel changes the scope power', JSON.stringify(r));
await T(p, () => { const G = __fh.G; __h.clearAll(); const g = __h.place('bear', 70); g.members[0].state = 'graze'; __h.aimAt(g.members[0]); G.swayX = G.swayY = 0; __fh.input.mouseDown[2] = true; __fh.tick(3); });
await shot(p, 'ff-scope-bear');
// every gun's iron sights: an aimed shot goes along the sight line, which is the middle of the view
r = await T(p, () => { const W = __fh.G.weapons, out = {}; __h.ads(false); for (const k of ['pump', 'double', 'revolver']) { W.select(k); __fh.tick(40); __h.ads(true); __fh.tick(40); const o = new __fh.THREE.Vector3(), d = new __fh.THREE.Vector3(); W.aimRay(o, d); const f = __fh.camera.getWorldDirection(new __fh.THREE.Vector3()); out[k] = +(Math.acos(Math.min(1, d.dot(f))) * 180 / Math.PI).toFixed(2); __h.ads(false); __fh.tick(20); } return out; });
ok(Object.values(r).every(v => v < .5), 'aiming down the iron sights: the shot goes where the sights point (degrees off the view centre)', JSON.stringify(r));
for (const k of ['pump', 'double', 'revolver']) { await T(p, k => { const W = __fh.G.weapons; W.select(k); __fh.tick(40); __h.ads(true); __fh.tick(40); }, k); await shot(p, 'ff-sights-' + k, 1); await T(p, () => { __h.ads(false); __fh.tick(10); }); }
// the shop: buy a box of rifle cartridges
r = await T(p, () => { const G = __fh.G, W = G.weapons; G.coins = 30; const r0 = W.reserve.rifle; __fh.interact('chest'); __fh.tick(2); const btn = [...document.querySelectorAll('#panel [data-a=buy]')].find(b => b.dataset.k === 'rifle'); btn.click(); const out = { bought: W.reserve.rifle - r0, coins: G.coins, rows: document.querySelectorAll('#panel [data-a=buy]').length }; return out; });
ok(r.bought === 10 && r.coins === 21 && r.rows === 3, 'the supply chest sells ammunition for coins', JSON.stringify(r));
await shot(p, 'ff-shop', 1); await T(p, () => { __fh.G.ui.close(); __fh.tick(2); });
// the grizzly: charges home and mauls
r = await T(p, () => { const G = __fh.G; __h.clearAll(); G.weapons.select(null); const P = G.player; P.place(P.pos.x + 30, P.pos.z, P.yaw); const g = __h.place('bear', 26), a = g.members[0]; a.aware = 2; a.state = 'graze'; let n = 0; while (G.health >= 100 && n++ < 600) __fh.tick(1, 1 / 30); return { hurt: 100 - G.health, secs: +(n / 30).toFixed(1), state: a.state, charged: g.charged }; });
ok(r.hurt > 15 && r.secs < 15, 'a grizzly at 26 m rears, charges and mauls you', JSON.stringify(r));
await T(p, () => { const G = __fh.G, a = G.wildlife.animals[0]; __h.aimAt(a, 1); G.player.pitch -= .05; G.player.applyCamera(); });
await shot(p, 'ff-bear-close', 1);
// shoot it off: a wounded grizzly keeps coming; enough hits bring it down
r = await T(p, () => { const G = __fh.G, W = G.weapons, a = G.wildlife.animals[0]; W.select('revolver'); W.reserve.pistol = 60; __fh.tick(40); G.health = 100; let shots = 0; for (let i = 0; i < 12 && a.state !== 'down' && a.state !== 'dead'; i++) { __h.aimAt(a); __h.ads(true); __fh.tick(25); __h.aimAt(a); __h.fire(); shots++; __fh.tick(12); } return { state: a.state, shots, health: Math.round(G.health) }; });
ok(r.state === 'down' || r.state === 'dead', 'enough revolver hits bring the grizzly down', JSON.stringify(r));
// dying: health to nothing, wake at camp
r = await T(p, () => { const G = __fh.G; __h.ads(false); __h.clearAll(); G.health = 10; G.coins = 40; G.life.pack.meat = [{ meat: 'venison', lb: 20, state: 'raw' }]; const g = __h.place('wolf', 8), a = g.members[0]; a.real = true; a.setState('charge', 5); let n = 0; while (!G.dead && n++ < 300) __fh.tick(1, 1 / 30); const dead = G.dead, screen = !document.querySelector('#death').hidden; return { dead, screen, coins: G.coins, meat: G.life.pack.meat.length }; });
ok(r.dead && r.screen && r.coins === 30 && r.meat === 0, 'killed: the death screen, a quarter of your coins and the meat in your pack are lost', JSON.stringify(r));
await shot(p, 'ff-death', 1);
await p.waitForTimeout(4200);
r = await T(p, () => { __fh.tick(2); const G = __fh.G, c = G.camp.c; return { dead: G.dead, health: Math.round(G.health), atCamp: Math.round(Math.hypot(G.player.pos.x - c.x, G.player.pos.z - c.z)), hour: +G.sky.hours.toFixed(1) }; });
ok(!r.dead && r.health === 60 && r.atCamp < 10, 'you wake at camp next morning, bandaged (60 health)', JSON.stringify(r));
r = await T(p, () => { const G = __fh.G; G.life.pack.meat = [{ meat: 'venison', lb: 3, state: 'cooked' }]; G.health = 50; __fh.input.pressed.add('KeyF'); __fh.tick(1); return { health: Math.round(G.health), left: G.life.pack.meat[0] && G.life.pack.meat[0].lb }; });
ok(r.health >= 74 && r.left === 2, 'F eats roast meat from your pack: +25 health', JSON.stringify(r));
// the cougar: comes up from behind, freezes when looked at, springs
r = await T(p, () => { const G = __fh.G; __h.clearAll(); G.health = 100; G.player.place(G.player.pos.x - 40, G.player.pos.z + 10, G.player.yaw); const P = G.player, g = G.wildlife.spawnGroup('cougar', P.pos.x + Math.sin(P.yaw) * 45, P.pos.z + Math.cos(P.yaw) * 45, 1), a = g.members[0]; a.state = 'graze'; const seen = []; let n = 0; while (G.health >= 100 && n++ < 1500) { __fh.tick(1, 1 / 30); if (n % 60 === 0) seen.push(a.state + ':' + Math.round(a.dist)); } return { hurt: Math.round(100 - G.health), states: seen.slice(0, 12).join(' '), secs: Math.round(n / 30) }; });
ok(r.hurt >= 25 && /stalk/.test(r.states), 'a cougar stalks you from behind and springs', JSON.stringify(r));
await T(p, () => { const G = __fh.G, a = G.wildlife.animals[0]; __h.aimAt(a); });
await shot(p, 'ff-cougar', 1);
// the wolves: they ring you, then rush in
r = await T(p, () => { const G = __fh.G; __h.clearAll(); G.health = 100; G.player.place(G.player.pos.x + 60, G.player.pos.z - 20, G.player.yaw); const g = __h.place('wolf', 30, 0, 4); const seen = new Set(); let n = 0; while (G.health >= 100 && n++ < 1500) { __fh.tick(1, 1 / 30); for (const a of g.members) seen.add(a.state); } return { hurt: Math.round(100 - G.health), states: [...seen].join(','), secs: Math.round(n / 30) }; });
ok(r.hurt > 5 && r.states.includes('circle'), 'a wolf pack circles you, then one rushes in and bites', JSON.stringify(r));
await T(p, () => { const G = __fh.G, a = G.wildlife.animals.find(q => q.state === 'circle') || G.wildlife.animals[0]; __h.aimAt(a); G.player.pitch -= .1; G.player.applyCamera(); });
await shot(p, 'ff-wolves', 1);
// the map: your trail, and the way home
r = await T(p, () => { const G = __fh.G, P = G.player; for (let i = 0; i < 12; i++) { P.place(P.pos.x + 12, P.pos.z + 5, P.yaw); G.map.revealT = 0; G.map.reveal(1); } G.map.open(); __fh.tick(2); return { trail: G.map.trail.length, guide: G.map.guide }; });
ok(r.trail >= 10 && r.guide, 'the map keeps your trail; the compass guides you to camp from the start', JSON.stringify(r));
await shot(p, 'ff-map', 1); await T(p, () => { __fh.G.map.close(); __fh.tick(1); });
await p.close();
// ================= the lake: fishing
p = await open('lake'); await T(p, HELP);
r = await T(p, () => { const G = __fh.G, w = G.world, c = G.camp.c; __h.clearAll();
  // find a spot on the shore with open water ahead
  let spot = null; for (let r = 10; r < 300 && !spot; r += 6) for (let a = 0; a < 32 && !spot; a++) { const an = a / 32 * Math.PI * 2, x = c.x + Math.cos(an) * r, z = c.z + Math.sin(an) * r; if (w.height(x, z) < .4 || w.height(x, z) > 2) continue; for (let b2 = 0; b2 < 16; b2++) { const yaw = b2 / 16 * Math.PI * 2, fx = -Math.sin(yaw), fz = -Math.cos(yaw); let water = 0; for (let d = 6; d < 24; d += 2) if (w.height(x + fx * d, z + fz * d) < -.8) water++; if (water >= 7) { spot = { x, z, yaw }; break; } } }
  if (!spot) return { spot: false }; G.player.place(spot.x, spot.z, spot.yaw); G.player.pitch = -.15; G.player.applyCamera(); G.weapons.select('rod'); __fh.tick(40); return { spot: true }; });
ok(r.spot, 'found the shore with open water ahead');
r = await T(p, () => { const G = __fh.G, F = G.fishing, I = __fh.input; I.clicked.add(0); I.mouseDown[0] = true; __fh.tick(1); __fh.tick(25); I.mouseDown[0] = false; __fh.tick(1); __fh.tick(30); return { state: F.state, d: F.flyD && Math.round(F.flyD.r), bob: F.bob.visible }; });
ok(r.state === 'wait' && r.d > 8 && r.bob, 'hold and let go to cast: the float lands out on the water', JSON.stringify(r));
await shot(p, 'ff-fishing-wait', 1);
r = await T(p, () => { const G = __fh.G, F = G.fishing, I = __fh.input; F.nibbles = 0; F.waitT = 0; F.fishKind = 'bass'; __fh.tick(2); const bite = F.state; I.clicked.add(0); __fh.tick(1); const fight = F.state; const c0 = G.coins; let n = 0; while (F.state === 'fight' && n++ < 900) { const t = F.fish.tension; I.mouseDown[0] = t < .7; __fh.tick(1, 1 / 30); } I.mouseDown[0] = false; return { bite, fight, end: F.state, caught: F.caught, coins: G.coins - c0, fish: G.life.pack.meat.map(m => m.meat + ' ' + m.lb).join(',') }; });
ok(r.bite === 'bite' && r.fight === 'fight' && r.caught === 1 && r.coins > 0 && /bass/.test(r.fish), 'a bite pulls the float under; hook it, play it in: a smallmouth bass, coins and fish for the spit', JSON.stringify(r));
await shot(p, 'ff-fish-caught', 1);
await p.close();
// ================= the valley: goats on the mountainsides, through the scope
p = await open('valley'); await T(p, HELP);
r = await T(p, () => { const G = __fh.G, W = G.wildlife; let goat = null; for (let i = 0; i < 400 && !goat; i++) { W.trySpawn(G.player, 200, 700); goat = W.groups.find(g => g.kind === 'goat'); } return { goat: !!goat, dist: goat && Math.round(Math.hypot(goat.leader.pos.x - G.player.pos.x, goat.leader.pos.z - G.player.pos.z)), h: goat && Math.round(goat.leader.pos.y - G.player.pos.y) }; });
ok(r.goat && r.h > 30, 'mountain goats live high on the slopes around the valley', JSON.stringify(r));
// a deer at 120 m across the open valley, through the scope, shot dead: coins
r = await T(p, () => { const G = __fh.G, W = G.weapons; W.select('longrifle'); __fh.tick(40); __h.ads(true); __fh.tick(30); let a = null, tries = 0;
  for (; tries < 24; tries++) { G.player.yaw += Math.PI / 12; G.player.applyCamera(); const g = __h.place('deer', 120), d = g.members[0]; d.state = 'graze'; d.aware = 0; __fh.tick(1); __h.aimAt(d); const o = __fh.camera.position.clone(), dir = __fh.camera.getWorldDirection(new __fh.THREE.Vector3()); let clear = true; for (let t = 1; t < 118; t += .5) { const x = o.x + dir.x * t, y = o.y + dir.y * t, z = o.z + dir.z * t; if (y < G.world.height(x, z)) { clear = false; break; } G.flora.near(x, z, 0, () => { clear = false; }); if (!clear) break; } if (clear) { a = d; break; } G.wildlife.removeGroup(g); }
  if (!a) return { clear: false };
  __fh.input.keys.add('ShiftLeft'); __fh.tick(20); __h.aimAt(a); __fh.tick(1); __h.aimAt(a); const c0 = G.coins; __h.fire(); __fh.input.keys.delete('ShiftLeft'); __fh.tick(5); __h.ads(false); __fh.tick(20); return { state: a.state, coins: G.coins - c0, tries }; });
ok((r.state === 'down' || r.state === 'dead') && r.coins === 12, 'a deer at 120 m across the valley, through the scope: down, and 12 coins', JSON.stringify(r));
await T(p, () => { const G = __fh.G, g = G.wildlife.groups.find(q => q.kind === 'goat'); G.weapons.select('longrifle'); __fh.tick(40); __h.aimAt(g.leader); __h.ads(true); __fh.tick(40); __h.aimAt(g.leader); G.swayX = G.swayY = 0; });
await shot(p, 'ff-goat-scope', 2);
await T(p, () => { __h.ads(false); __fh.tick(30); const G = __fh.G, g = G.wildlife.groups.find(q => q.kind === 'goat'); __h.aimAt(g.leader); G.player.pitch -= .05; G.player.applyCamera(); });
await shot(p, 'ff-valley-view', 2);
console.log('ERRORS', JSON.stringify(errs.slice(0, 8))); await b.close();
