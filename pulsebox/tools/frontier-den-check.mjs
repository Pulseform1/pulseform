// Frontier Hunter, the deep forest in a real browser: gloom closes in deep in the timber (not at camp); bear dens sit in
// wooded hillsides, built as you come near, with their bears at home; a den bear charges anyone on its ground, mauls,
// and soaks up a heart shot. Writes pictures of the deep woods and of a den from down the slope.
//   node tools/frontier-den-check.mjs <out dir>
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const FILE = 'file://' + path.resolve('public/games/frontier-hunter.html'), O = process.argv[2] || '.';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`${FILE}?spawn=forest&seed=1234&q=medium`, { timeout: 120000 });
await p.waitForFunction(() => window.__fh && __fh.G.state === 'play', null, { timeout: 240000 });
let failed = 0; const ok = (c, m, x) => { if (!c) failed++; console.log((c ? '  ok   ' : '  FAIL ') + m, x !== undefined ? JSON.stringify(x) : ''); };
const snap = async n => { const d = await p.evaluate(() => __fh.snap(2)); fs.writeFileSync(`${O}/den-${n}.jpg`, Buffer.from(d.split(',')[1], 'base64')); };
const camp = await p.evaluate(() => { __fh.hold(true); __fh.setTime(13); __fh.tick(60); return +(__fh.G.gloom || 0).toFixed(2); });
// the nearest den, and the woods round it
let r = await p.evaluate(() => { const G = __fh.G, P = G.player, L = []; G.dens.near(P.pos.x, P.pos.z, 6000, s => L.push(s)); L.sort((a, b) => Math.hypot(a.x - P.pos.x, a.z - P.pos.z) - Math.hypot(b.x - P.pos.x, b.z - P.pos.z)); const s = L[0];
  if (!s) return { n: 0 }; window.__den = s; const n = G.world.normal(s.x + s.fx * 3, s.z + s.fz * 3, [0, 1, 0], 5), up = G.world.height(s.x - s.fx * 12, s.z - s.fz * 12) - G.world.height(s.door.x, s.door.z);
  return { n: L.length, dist: Math.round(Math.hypot(s.x - P.pos.x, s.z - P.pos.z)), slopeNy: +n[1].toFixed(2), riseBehind: +up.toFixed(1) }; });
ok(r.n > 0 && r.slopeNy < .94 && r.riseBehind > 2, 'dens sit in hillsides: the ground rises behind the cave', r);
// down the slope from it, looking up at the mouth
r = await p.evaluate(() => { const G = __fh.G, s = window.__den, x = s.x + s.fx * 30, z = s.z + s.fz * 30; __fh.goto(x, z, Math.atan2(-s.fx, -s.fz), .05); __fh.tick(30 * 6);
  for (const q of G.wildlife.animals) if (q.den === s) { q.m.mesh.visible = false; q.pos.set(s.x, -60, s.z); q.setState('rest', 999); }
  const bears = G.wildlife.animals.filter(a => a.den === s).length; let trees = 0, props = 0; G.flora.near(x, z, 25, () => { trees++; });
  return { built: !!s.mesh, bears, gloom: +G.gloom.toFixed(2), treesWithin25m: trees, fog: +__fh.scene.fog.density.toFixed(4) }; });
ok(r.built && r.bears >= 1 && r.gloom > .5, 'down the slope from a den: built, its bear(s) at home, the deep-forest gloom on', { camp, ...r });
await snap('from-below');
await p.evaluate(() => { const G = __fh.G, s = window.__den; G.flora.group.visible = false; for (const q of G.grass.rings) q.mesh.visible = false; }); await snap('alone');
await p.evaluate(() => { const G = __fh.G; G.flora.group.visible = true; for (const q of G.grass.rings) q.mesh.visible = true; __fh.look(G.player.yaw + 2.2, .02); }); await snap('woods');
// onto its ground: it charges, for real, and mauls
r = await p.evaluate(() => { const G = __fh.G, s = window.__den; for (const q of G.wildlife.animals) if (q.den === s) { q.m.mesh.visible = true; q.pos.set(s.door.x, 0, s.door.z); q.ground(); q.setState('graze', 3); }
  const x = s.x + s.fx * 40, z = s.z + s.fz * 40; G.health = 100; __fh.goto(x, z, Math.atan2(-s.fx, -s.fz), .02);
  const seen = new Set(); let hitAt = null, n = 0;
  for (let i = 0; i < 30 * 9; i++) { __fh.tick(1); const bears = G.wildlife.animals.filter(a => a.den === s && !a.gone); n = Math.max(n, bears.length); for (const a of bears) seen.add(a.state); if (G.health < 100 && hitAt === null) hitAt = +(i / 30).toFixed(1); if (G.dead) break; }
  return { bears: n, states: [...seen], health: Math.round(G.health), dead: !!G.dead, firstHitAt: hitAt, death: (document.querySelector('#deathmsg') || {}).textContent || '' }; });
ok(r.states.includes('charge') && r.firstHitAt !== null && (!r.dead || /den grizzly/.test(r.death)), 'walk onto its ground: the den bear rears, roars, charges and mauls', r);
r = await p.evaluate(() => { const a = __fh.G.wildlife.animals.find(q => q.den === window.__den && q.state !== 'down'); if (!a) return null; const hp0 = a.hp, d = a.hit({ k: 'heart', label: 'Heart', mult: 3, vital: true }, 2.4); return { hp0, after: +a.hp.toFixed(1), dropped: d }; });
ok(r && !r.dropped && r.after < r.hp0, 'a den bear soaks up a heart shot', r);
console.log('errors', JSON.stringify(errs.filter(e => !/Pointer Lock/.test(e)).slice(0, 4))); console.log(failed ? failed + ' check(s) failed' : 'all checks passed');
await b.close(); process.exit(failed ? 1 : 0);
