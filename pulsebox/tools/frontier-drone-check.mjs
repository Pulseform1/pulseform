// Run from pulsebox/frontier: node ../tools/frontier-drone-check.mjs <out-dir>
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs';
const { chromium } = createRequire('/home/user/pulseform/pulsebox/')('playwright');
const FILE = 'file://' + path.resolve('../public/games/frontier-hunter.html'), O = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 1100, height: 620 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
const shot = async n => { const d = await p.evaluate(() => __fh.snap(1)); fs.writeFileSync(`${O}/${n}.jpg`, Buffer.from(d.split(',')[1], 'base64')); await p.screenshot({ path: `${O}/${n}-page.png` }); };
const ok = (c, m, x) => console.log(`  ${c ? 'ok  ' : 'FAIL'} ${m}`, x !== undefined ? JSON.stringify(x) : '');
await p.goto(`${FILE}?spawn=valley&seed=1234&q=medium&t=10`, { timeout: 120000 }); await p.waitForFunction(() => window.__fh && __fh.G.state === 'play', null, { timeout: 300000 });
// (read, press and read again in one go: on a slow software renderer the card's own 14 s timer can otherwise tuck it away in between)
const tab = await p.evaluate(() => { const h = document.querySelector('#help'), shown = !h.hidden; __fh.input.press('Tab'); __fh.tick(1, 1/30); return { shown, tucked: h.hidden }; });
ok(tab.shown, 'first game: the controls card shows', tab.shown);
ok(tab.tucked, 'Tab tucks the controls card away');
// put a deer 150 m out in the open
const r = await p.evaluate(() => { __fh.hold(true); const G = __fh.G, W = G.wildlife, P = G.player;
  for (const g of [...W.groups]) W.removeGroup(g); W.seeded = true; W.target = 0;
  const yaw = P.yaw, x = P.pos.x - Math.sin(yaw) * 150, z = P.pos.z - Math.cos(yaw) * 150, g = W.spawnGroup('elk', x, z, 1); const a = g.members[0];
  a.update = function (dt) { this.t += dt; this.gait = 'stand'; };
  __fh.input.press('KeyG'); __fh.tick(1, 1/30);
  const on = G.drone.on;
  // climb, then turn to the elk
  __fh.input.keys.add('Space'); for (let i = 0; i < 90; i++) __fh.tick(1, 1/30); __fh.input.keys.delete('Space');
  const c = __fh.camera.position, t = a.pos; G.drone.yaw = Math.atan2(-(t.x - c.x), -(t.z - c.z)); G.drone.pitch = Math.atan2(t.y + .8 - c.y, Math.hypot(t.x - c.x, t.z - c.z));
  for (let i = 0; i < 3; i++) __fh.tick(1, 1/30);
  const tgt = G.drone.target && G.drone.target.sp.label, alt = c.y - G.world.height(c.x, c.z);
  return { on, tgt, alt: Math.round(alt), frozen: P.frozen, gunHidden: G.weapons.root.children.every(c => c.isLight || !c.visible) };   // (the gun's models hide; its light stays, so no shader rebuilds)
});
ok(r.on && r.frozen && r.gunHidden, 'G sends the drone up; you stand still, gun away', r);
ok(r.alt > 15, 'Space climbs', r.alt);
ok(r.tgt === 'Elk', 'centre ring locks on the elk 150 m out', r.tgt);
await shot('d-day');
const pin = await p.evaluate(() => { __fh.input.clicked.add(0); __fh.tick(1, 1/30); const D = __fh.G.drone; return D.pins.map(p => p.label); });
ok(pin[0] === 'Elk', 'click pins it', pin);
await p.evaluate(() => { __fh.setTime(23); __fh.input.press('KeyN'); __fh.tick(3, 1/30); });
const nv = await p.evaluate(() => ({ nv: __fh.G.drone.nv, body: document.body.classList.contains('nv'), heat: [...document.querySelectorAll('#heat i')].filter(e => e.style.display === 'block').length }));
ok(nv.nv && nv.body && nv.heat >= 1, 'N: night vision, the elk shows as body heat', nv);
await shot('d-night');
await p.evaluate(() => { __fh.input.press('KeyN'); __fh.tick(1, 1/30); });
const day = await p.evaluate(() => ({ body: document.body.classList.contains('nv'), heat: [...document.querySelectorAll('#heat i')].filter(e => e.style.display === 'block').length }));
ok(!day.body && day.heat === 0, 'N again: back to day vision, no heat marks', day);
await p.evaluate(() => __fh.setTime(10));
const back = await p.evaluate(() => { const G = __fh.G; __fh.input.press('KeyG'); __fh.tick(2, 1/30); const e = document.querySelector('#pins .pin');
  return { on: G.drone.on, frozen: G.player.frozen, gun: G.weapons.root.visible, pinShown: e && e.style.display === 'block', text: e && e.textContent, camY: +(__fh.camera.position.y - G.player.pos.y).toFixed(2) }; });
ok(!back.on && !back.frozen && back.gun && back.pinShown && /Elk/.test(back.text), 'G brings it back; the pin shows on your screen', back);
await shot('d-pin');
// walk to it: the pin should clear when you arrive
const walk = await p.evaluate(() => { const G = __fh.G, a = G.drone.pins[0].a; G.player.place(a.pos.x + 4, a.pos.z + 4, 0); __fh.tick(2, 1/30); return G.drone.pins.length; });
ok(walk === 0, 'reaching the animal clears the pin', walk);
// battery
const bat = await p.evaluate(() => { const G = __fh.G; __fh.input.press('KeyG'); __fh.tick(1, 1/30); G.drone.batt = .05; __fh.tick(3, 1/30); return { on: G.drone.on }; });
ok(!bat.on, 'a flat battery brings the drone home', bat);
// attacked while flying
const atk = await p.evaluate(() => { const G = __fh.G; G.drone.batt = 150; __fh.input.press('KeyG'); __fh.tick(1, 1/30); const a = G.wildlife.animals[0]; G.wildlife.onAttack(a, 5); __fh.tick(1, 1/30); return { on: G.drone.on }; });
ok(!atk.on, 'hurt while flying: the drone drops back and you can fight', atk);
// landing: X sets it down; the view comes back to you; G flies it again from where it sits; E beside it packs it
const land = await p.evaluate(() => { const G = __fh.G, D = G.drone, P = G.player; D.batt = 150; if (D.on) D.recall(); __fh.tick(1, 1/30);
  __fh.input.press('KeyG'); __fh.tick(1, 1/30); __fh.input.move = () => ({ x: 0, y: 1 }); for (let i = 0; i < 60; i++) __fh.tick(1, 1/30); __fh.input.move = () => ({ x: 0, y: 0 });
  __fh.input.press('KeyX'); let n = 0; while (D.on && n < 400) { __fh.tick(1, 1/30); n++; }
  const L = D.landed; return { on: D.on, landed: !!L, frames: n, model: !!(D.model && D.model.visible), away: L ? +Math.hypot(L.x - P.pos.x, L.z - P.pos.z).toFixed(1) : -1, frozen: P.frozen }; });
ok(!land.on && land.landed && land.model && land.away > 5 && !land.frozen, 'X lands the drone out there; the view comes back to you', land);
const again = await p.evaluate(() => { const G = __fh.G, D = G.drone, L = { ...D.landed }; __fh.input.press('KeyG'); __fh.tick(2, 1/30); const r = { on: D.on, fromSpot: +Math.hypot(D.pos.x - L.x, D.pos.z - L.z).toFixed(2), model: D.model.visible }; __fh.input.press('KeyX'); let n = 0; while (D.on && n < 400) { __fh.tick(1, 1/30); n++; } return r; });
ok(again.on && again.fromSpot < 1 && !again.model, 'G flies it again from where it sat', again);
const pack = await p.evaluate(() => { const G = __fh.G, D = G.drone, L = D.landed, P = G.player; P.place(L.x + 1.2, L.z + .5, 0); __fh.tick(2, 1/30); const prompt = document.querySelector('#prompt').textContent; __fh.input.press('KeyE'); __fh.tick(2, 1/30); return { prompt, landed: !!D.landed, model: D.model.visible }; });
ok(/Pack the drone/.test(pack.prompt) && !pack.landed && !pack.model, 'walk up to it: E packs it away', pack);
// pins anywhere: P pins the spot you look at; the map pins where you click; a fourth takes the oldest's place
const pins = await p.evaluate(() => { const G = __fh.G, D = G.drone, P = G.player; D.pins.length = 0; P.pitch = -.35; P.applyCamera(); __fh.tick(1, 1/30);
  __fh.input.press('KeyP'); __fh.tick(1, 1/30); const a = D.pins.map(q => q.label);
  D.pinAt(P.pos.x + 60, P.pos.z, 'map', 10); D.pinAt(P.pos.x - 60, P.pos.z, 'map', 10); const b = D.pins.map(q => q.label);
  D.pinAt(P.pos.x, P.pos.z + 90, 'map', 10); const c = D.pins.map(q => q.label);
  D.pinAt(P.pos.x, P.pos.z + 90, 'map', 10); const d = D.pins.map(q => q.label); __fh.tick(1, 1/30);
  const shown = [...document.querySelectorAll('#pins .pin')].filter(e => e.style.display === 'block').length;
  return { a, b, c, d, shown }; });
ok(pins.a.length === 1 && pins.b.length === 3 && pins.c.length === 3 && pins.c[0] === pins.b[1] && pins.d.length === 2 && pins.shown === 2, 'pins anywhere: P on foot, clicks on the map; a fourth replaces the oldest; a click on a pin takes it off', pins);
console.log('ERRORS', JSON.stringify(errs.filter(e => !/Pointer Lock/.test(e)).slice(0, 5)));
await b.close();
