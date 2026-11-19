// Frontier Hunter: start-up, menus, the frame loop and the glue between systems.
import * as THREE from 'three';
import { U } from './fx.js';
import { World } from './world.js';
import { Jobs } from './jobs.js';
import { groundTextures, macroTexture, barkTexture, foliageTextures, canvasTexture, woodTexture, blanketTexture, endGrainTexture, glowTexture, puffTexture } from './texgen.js';
import { Terrain } from './terrain.js';
import { buildPlants } from './plants.js';
import { Flora } from './flora.js';
import { Grass } from './grass.js';
import { Water } from './water.js';
import { Sky } from './sky.js';
import { Camp, TENT } from './camp.js';
import { Player, pushOut } from './player.js';
import { Input } from './input.js';
import { Weather } from './weather.js';
import { Audio } from './audio.js';
import { Wildlife } from './wildlife.js';
import { Weapons } from './weapons.js';
import { CampLife } from './camplife.js';
import { UI } from './ui.js';
import { SurveyMap } from './map.js';

const $ = s => document.querySelector(s);
const params = new URLSearchParams(location.search);
const QUALITY = {
  low: { pr: 1, shadow: 1024, span: 40, nearR: 300, farR: 2400, veg: { vegR: 600, nearR: 38, midR: 100, propR: 45 }, grass: 'low' },
  medium: { pr: 1.25, shadow: 2048, span: 55, nearR: 380, farR: 3200, veg: { vegR: 800, nearR: 50, midR: 130, propR: 62 }, grass: 'medium' },
  high: { pr: 1.6, shadow: 4096, span: 65, nearR: 440, farR: 3800, veg: { vegR: 950, nearR: 62, midR: 165, propR: 80 }, grass: 'high' },
};
const SPAWNS = { forest: 'Deep Forest', valley: 'Mountain Valley', lake: 'Wilderness Lake' };

const G = { settings: loadSettings(), state: 'menu' };
function loadSettings() { try { return { quality: 'high', sens: 1, ...JSON.parse(localStorage.getItem('fh-settings') || '{}') }; } catch { return { quality: 'high', sens: 1 }; } }
function saveSettings() { try { localStorage.setItem('fh-settings', JSON.stringify(G.settings)); } catch { } }
if (params.get('q')) G.settings.quality = params.get('q');

// ---------- renderer ----------
const canvas = $('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.62;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.08, 6000);
function resize() {
  const q = QUALITY[G.settings.quality] || QUALITY.high;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q.pr)); renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
const input = new Input(canvas);
const audio = new Audio();
addEventListener('pointerdown', () => audio.start()); addEventListener('keydown', () => audio.start());

// ---------- loading ----------
function setLoad(p, msg) { $('#loadbar i').style.width = Math.round(p * 100) + '%'; if (msg) $('#loadmsg').textContent = msg; }
const frame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

let TEX = null, PLANTS = null;
async function assets() {
  if (TEX) return;
  setLoad(.04, 'Painting the forest floor'); await frame();
  const ground = groundTextures(); ground.macro = macroTexture();
  setLoad(.12, 'Peeling bark'); await frame();
  const bark = { pine: barkTexture('pine'), spruce: barkTexture('spruce'), aspen: barkTexture('aspen'), dead: barkTexture('dead') };
  setLoad(.18, 'Growing needles and leaves'); await frame();
  const leaf = foliageTextures();
  setLoad(.22, 'Stitching the tent'); await frame();
  TEX = { ...ground, ground, bark, leaf, canvas: canvasTexture(), wood: woodTexture(61, '#8a6a48', '#46301e'), wood2: woodTexture(67, '#6a4a30', '#2e1e12'), blanket: blanketTexture(), endGrain: endGrainTexture(), glow: glowTexture(), puff: puffTexture() };
  setLoad(.28, 'Raising pines, spruce and aspen'); await frame();
  PLANTS = buildPlants(renderer, { bark, leaf, rock: ground.rock, rockN: ground.rockN }, U);
}

// ---------- a game ----------
async function start(opts) {
  $('#menu').hidden = true; $('#loading').hidden = false; G.state = 'loading';
  await assets();
  const seed = opts.seed ?? ((Math.random() * 2 ** 31) | 0);
  const world = new World(seed);
  setLoad(.32, 'Scouting a place for camp'); await frame();
  const sp = opts.camp || world.findSpawn(opts.spawn);
  world.setCamp(sp.x, sp.z);
  const q = QUALITY[G.settings.quality] || QUALITY.high;
  const jobs = new Jobs(seed, { x: sp.x, z: sp.z });
  const sky = new Sky(renderer, scene, { shadowSize: q.shadow, shadowSpan: q.span }); sky.hours = opts.hours ?? 16.2;
  const terrain = new Terrain(scene, jobs, TEX.ground, { nearR: q.nearR, farR: q.farR });
  const flora = new Flora(scene, jobs, PLANTS, U, q.veg);
  const grass = new Grass(scene, jobs, { quality: q.grass });
  const water = new Water(scene);
  const camp = new Camp(scene, world, TEX, PLANTS);
  const player = new Player(camera, world);
  const weather = new Weather(scene, sky, camp);
  const wildlife = new Wildlife(scene, world, flora, camp, audio);
  wildlife.panOf = p => { const r = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), d = p.clone().sub(camera.position).normalize(); return Math.max(-1, Math.min(1, r.dot(d))); };
  wildlife.onBump = a => { const d = player.pos.clone().sub(a.pos).setY(0).normalize(); player.vel.addScaledVector(d, 9); G.shake = .6; toast('The bear bowls you over, then wheels away into the timber.'); };
  if (!G.weapons) G.weapons = new Weapons(camera, TEX, TEX.glow);
  player.onStep = kind => audio.step(surfaceAt(kind), kind === 'run');
  // stand in the tent doorway looking out at the fire
  const door = camp.toWorld(0, TENT.cz + TENT.L / 2 + 0.9);
  player.place(door.x, door.z, camp.yaw + Math.PI);
  if (opts.player) { player.place(opts.player.x, opts.player.z, opts.player.yaw); }
  Object.assign(G, { world, jobs, sky, terrain, flora, grass, water, camp, player, weather, wildlife, stats: { taken: {} }, timeScale: 1, gameHours: 0, seed, spawn: opts.spawn, gameTime: 0, day: 0, envT: 0, env: { waterDist: 99, riverDist: 99, forest: 0 } });
  G.tex = TEX; G.life = new CampLife(G, G.ui);
  G.map = G.map || new SurveyMap(G); G.map.explored.clear(); G.map.markers = []; G.map.guide = false;
  // build the world around the player before showing it
  const t0 = performance.now();
  while (true) {
    camera.position.set(player.pos.x, player.pos.y + 1.6, player.pos.z);
    terrain.update(camera.position, 1); flora.update(camera.position, 1); grass.update(camera.position, player.pos); jobs.tick(12);
    terrain.sync();
    const p = Math.min(terrain.progress(camera.position, 260), flora.progress(camera.position, 200)), gp = grass.field.ready ? 1 : 0;
    setLoad(.35 + .6 * (p * .85 + gp * .15), 'Walking out to the clearing');
    if ((p >= 1 && gp) || performance.now() - t0 > 30000) break;
    await frame();
  }
  flora.rebuild(camera.position);
  sky.update(0, camera.position, 0);
  renderer.compile(scene, camera);
  $('#loading').hidden = true; $('#hud').hidden = false; G.state = 'play';
  setTimeout(() => toast('Press 1 for the rifle, 2 for the shotgun, 3 to put it away.'), 1500);
  if (!input.isTouch) input.lock();
}

// ---------- interaction ----------
function nearestInteract() {
  const c = G.camp, p = camera.position, dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  let best = null, bs = 1e9;
  for (const it of c.interact) {
    const d = it.pos.distanceTo(p); if (d > it.r + .6) continue;
    const to = it.pos.clone().sub(p).normalize(), dot = to.dot(dir); if (dot < .55) continue;
    const s = d * (1.6 - dot); if (s < bs) { bs = s; best = it; }
  }
  return best;
}
function doInteract(it) {
  const c = G.camp, P = G.player;
  if (it.id === 'lantern' && !c.lantern.carried) { carryLantern(true); toast('You take the lantern. L turns it up or down.'); return; }
  if (it.id === 'lantern' && c.lantern.carried) { carryLantern(false); toast('Lantern hung on its post.'); return; }
  if (it.id === 'seat') { P.seated = P.seated ? null : it; P.frozen = !!P.seated; if (P.seated) { const s = it.pos, f = c.firePos; P.pos.x = s.x; P.pos.z = s.z; P.yaw = Math.atan2(-(f.x - s.x), -(f.z - s.z)); P.pitch = -.15; } toast(P.seated ? 'You sit by the fire. Hold Space to let time pass; E to stand.' : 'You stand up.'); return; }
  if (it.id === 'bed') return sleep();
  if (['fire', 'woodpile', 'spit', 'meatbox', 'chest', 'rack', 'table'].includes(it.id)) return G.life.interact(it);
  toast(it.label());
}
// the bedroll: sleep through the night, or rest a couple of hours by day
function sleep() {
  const h = G.sky.hours, night = h >= 19.5 || h < 5, target = night ? 6.4 : (h + 2) % 24, dh = (target - h + 24) % 24;
  if (G.weapons.current) G.weapons.select(null);
  fade(1600);
  setTimeout(() => {
    if (target < h) G.day++;
    G.sky.hours = target; G.life.passTime(dh); G.weather.nextChange = 0; G.weather.update(.1, 3600, target, G.day); Object.assign(G.weather.cur, G.weather.tgt);
    for (const g of [...G.wildlife.groups]) G.wildlife.removeGroup(g); G.wildlife.seeded = false;
    G.sky.renderEnv();
    toast(night ? (G.weather.state === 'rain' ? 'You wake to rain drumming on the canvas.' : 'You sleep soundly. Morning comes cold and clear.') : 'You rest a couple of hours in the bedroll.');
  }, 700);
}
function carryLantern(on) {
  const L = G.camp.lantern;
  if (on) { L.carried = true; G.handL.add(L.group); L.group.position.set(0, 0, 0); L.group.rotation.set(0, 0, 0); }
  else { L.carried = false; G.camp.lanternHome.add(L.group); L.group.position.set(0, 0, 0); L.group.rotation.set(0, 0, 0); }
}
function toast(msg) { G.ui.toast(msg); }
function fade(ms = 900) { const f = $('#fade'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), ms); }
G.ui = new UI(G);
G.onPanel = open => { if (open) { G.state = 'ui'; input.unlock(); } else if (G.state === 'ui') { G.state = 'play'; G.wasLocked = false; if (!input.isTouch) input.lock(); } };

// the hand that carries the lantern: hangs low on the left, sways as you walk
G.handL = new THREE.Group(); camera.add(G.handL); scene.add(camera);

// ---------- frame ----------
let last = performance.now(), fpsT = 0, fpsN = 0, fps = 60;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (G.hold) return;
  step(dt);
}
function step(dt) {
  fpsT += dt; fpsN++; if (fpsT > .5) { fps = fpsN / fpsT; fpsT = 0; fpsN = 0; }
  if (G.state !== 'play' && G.state !== 'pause' && G.state !== 'ui') { input.endFrame(); return; }
  const { player, sky, terrain, flora, grass, water, camp, jobs } = G, live = G.state === 'play' || G.state === 'ui';
  if (G.state === 'ui' && G.map.isOpen) { if (input.hit('Escape') || input.hit('KeyM')) { G.map.close(); input.pressed.clear(); } }
  else if (G.state === 'ui' && (input.hit('Escape') || input.hit('KeyI') || (input.hit('KeyE') && G.ui.open !== 'pack'))) { G.ui.close(); input.pressed.clear(); }
  else if (G.state === 'play' && input.hit('KeyI')) G.ui.openPack();
  else if (G.state === 'play' && input.hit('KeyM')) G.map.open();
  if (G.state === 'play') {
    if (input.locked || input.isTouch) player.look(input.lookX, input.lookY, G.settings.sens);
    player.update(dt, input, (x, z, r) => collide(x, z, r));
    if (input.hit('Digit1')) G.weapons.select('rifle'); if (input.hit('Digit2')) G.weapons.select('shotgun'); if (input.hit('Digit3') || input.hit('KeyH')) G.weapons.select(null);
    if (input.wheel) { const order = [null, 'rifle', 'shotgun'], i = order.indexOf(G.weapons.want); G.weapons.select(order[(i + (input.wheel > 0 ? 1 : 2)) % 3]); }
    if (input.hit('KeyE')) { const it = nearestInteract(), carcass = !it && G.carcass; if (player.seated && (!it || it.id === 'seat')) { player.seated = null; player.frozen = false; toast('You stand up.'); } else if (it) doInteract(it); else if (carcass) harvest(carcass); else if (G.wood) G.life.gather(G.wood); }
    G.timeScale = player.seated && input.down('Space') ? 30 : 1;
    if (input.hit('KeyL')) { if (camp.lantern.carried) camp.lantern.toggle(); else toast('Your lantern hangs by the tent door.'); }
    if (input.hit('Escape') || (!input.locked && !input.isTouch && G.wasLocked)) pause(true);
    G.wasLocked = input.locked;
    G.gameTime += dt;
  }
  U.uTime.value += dt;
  const w = U.uWind.value;
  const gameDt = live ? dt * 60 * G.timeScale : 0, before = sky.hours;
  sky.update(dt, camera.position, gameDt);
  if (sky.hours < before) G.day++;
  G.gameHours = G.day * 24 + sky.hours;
  G.life.update(dt * (live ? G.timeScale : 0), gameDt);
  G.weather.update(dt, gameDt, sky.hours, G.day);
  senseSurroundings(dt);
  audio.update({ day: sky.daylight, night: sky.night, wind: U.uWind.value.z, rain: G.weather.cur.rain, inTent: camp.inside(player.pos.x, player.pos.z), fireDist: camera.position.distanceTo(camp.firePos), fireFuel: camp.fire.u.uFuel.value, waterDist: G.env.waterDist, riverDist: G.env.riverDist, forest: G.env.forest, dt });
  terrain.update(camera.position, dt); terrain.sync(); flora.update(camera.position, dt); grass.update(camera.position, player.pos); water.update(camera.position); jobs.tick(4);
  camp.update(dt * G.timeScale, sky.night, new THREE.Vector3(w.x * w.z, 0, w.y * w.z));
  // wildlife and guns
  const moving = player.speed > .4, noise = player.swimming ? .7 : !moving ? .04 : player.crouched ? .14 : player.speed > 4.5 ? 1 : .42;
  if (live) G.wildlife.update(dt, { pos: player.pos, noise, crouched: player.crouched, moving, night: sky.night > .5, lantern: camp.lantern.carried && camp.lantern.on, wind: { x: w.x, z: w.y } }, sky.hours);
  G.wildlife.render(dt, camera.position);
  const W = G.weapons;
  if (G.state === 'play') {
    W.update(dt, player.seated || player.sleeping ? { mouseDown: [], clicked: new Set(), hit: () => false } : input, gunCtx);
    for (const m of Object.values(W.models)) { const a = m.holder.children[1]; if (a.userData.left) { a.userData.left.visible = a.userData.leftHand.visible = !camp.lantern.carried; } }
    G.handL.visible = !(camp.lantern.carried && W.ads > .6);
  }
  if (G.recoilBack > 0) { const r = Math.min(G.recoilBack, dt * .25); player.pitch -= r; G.recoilBack -= r; }
  if (G.shake > 0) { G.shake = Math.max(0, G.shake - dt); camera.rotation.x += (Math.random() - .5) * G.shake * .05; camera.rotation.y += (Math.random() - .5) * G.shake * .05; }
  updateDust(dt);
  if (camp.lantern.carried) {
    camp.lantern.update(dt, Math.max(sky.night, 1 - sky.daylight));
    const sw = player.bobAmt, ph = player.stepPhase;
    G.handL.position.set(-0.36 + Math.sin(ph) * .012 * sw, -0.52 + Math.abs(Math.cos(ph)) * .015 * sw, -0.62);
    G.handL.rotation.set(0.05 + Math.sin(ph) * .05 * sw, 0.2, Math.sin(ph * .5) * .06 * sw);
  }
  // HUD
  const it = G.state === 'play' ? nearestInteract() : null, pr = $('#prompt');
  const look = camera.getWorldDirection(new THREE.Vector3());
  G.carcass = !it && G.state === 'play' ? G.wildlife.carcassNear(player.pos, look) : null;
  G.woodT = (G.woodT || 0) - dt; if (G.woodT < 0) { G.woodT = .25; G.wood = !it && !G.carcass && G.state === 'play' ? G.life.gatherSpot(player.pos, look) : null; }
  if (player.seated && G.timeScale > 1) { pr.textContent = 'Time passes by the fire...'; pr.classList.add('on'); }
  else if (it) { pr.textContent = 'E  ' + it.label(); pr.classList.add('on'); } else if (G.carcass) { pr.textContent = 'E  Dress the ' + G.carcass.sp.label.toLowerCase(); pr.classList.add('on'); } else if (G.wood) { pr.textContent = 'E  Gather dry wood' + (G.wood.kind === 6 ? ' from the fallen log' : G.wood.kind === 7 ? ' from the old stump' : ' from the dead tree'); pr.classList.add('on'); } else pr.classList.remove('on');
  $('#ammo').textContent = W.label; $('#hit').classList.toggle('on', G.hitT > 0); G.hitT -= dt;
  G.ui.tick(dt);
  if (live) G.map.reveal(dt);
  G.map.draw(); G.map.compass();
  const h = sky.hours, hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  $('#clock').textContent = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`;
  if (G.debug) $('#debug').textContent = `${fps.toFixed(0)} fps  calls ${renderer.info.render.calls}  tris ${(renderer.info.render.triangles / 1e6).toFixed(2)}M  trees ${flora.counts.near}/${flora.counts.mid}/${flora.counts.far}  jobs ${jobs.pending}`;
  if (!G.noRender) renderer.render(scene, camera);
  input.endFrame();
}
requestAnimationFrame(loop);

// ---------- shooting ----------
const gunCtx = {
  scene, get puff() { return TEX.puff; }, get bob() { return G.player.bobAmt; }, get phase() { return G.player.stepPhase; },
  setFov(f) { if (Math.abs(camera.fov - f) > .05) { camera.fov = f; camera.updateProjectionMatrix(); } },
  recoil(k) { G.player.pitch += k; G.recoilBack = (G.recoilBack || 0) + k * .7; },
  sound(kind, gun) { if (kind === 'shot') { audio.shot(gun); G.wildlife.gunshot(G.player.pos); } else if (kind === 'click') audio.click(); else audio.mech(kind === 'load' ? 'load' : 'reload'); if (kind === 'shot' && gun === 'rifle') setTimeout(() => audio.mech('lever'), 260); },
  trace(o, d, range, power, first) {
    let blockT = range, hitTree = false;
    for (let t = .6; t < range; t += t < 30 ? .35 : 1) {
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
      if (y < G.world.height(x, z)) { blockT = t; break; }
      G.flora.near(x, z, 0, () => { hitTree = true; }); if (hitTree) { blockT = t; break; }
    }
    const h = G.wildlife.raycast(o, d, blockT);
    if (h) {
      const down = h.a.hit(h.vital, power); G.hitT = .15;
      spawnDust(h.point, 0x8a7a64, .4);
      if (first || down) toast(down ? (h.a.sp.small || h.a.sp.bird ? `Got the ${h.a.sp.label.toLowerCase()}.` : `A clean shot. The ${h.a.sp.label.toLowerCase()} is down.`) : `Hit, but the ${h.a.sp.label.toLowerCase()} runs on. Follow it.`);
    } else if (blockT < range && first) spawnDust(o.clone().addScaledVector(d, blockT), hitTree ? 0x6a5040 : 0x7a6a50, .6);
  },
};
const dust = [];
function spawnDust(p, color, size) {
  for (let i = 0; i < 3; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.puff, color, transparent: true, depthWrite: false, opacity: .6 })); s.position.copy(p).add(new THREE.Vector3((Math.random() - .5) * .2, Math.random() * .2, (Math.random() - .5) * .2)); s.userData = { t: 0, s: size * (.6 + Math.random() * .5) }; scene.add(s); dust.push(s); }
}
function updateDust(dt) { for (let i = dust.length - 1; i >= 0; i--) { const s = dust[i]; s.userData.t += dt; const k = s.userData.t / 1.4; s.scale.setScalar(s.userData.s * (1 + k * 2.5)); s.position.y += dt * .3; s.material.opacity = .6 * (1 - k); if (k >= 1) { scene.remove(s); s.material.dispose(); dust.splice(i, 1); } } }
function harvest(a) {
  fade();
  setTimeout(() => {
    const r = G.wildlife.harvest(a); G.stats.taken[r.kind] = (G.stats.taken[r.kind] || 0) + 1;
    toast(G.life.packKill(r));
  }, 450);
}

// what is around the player, for sound: open water, a river, how wooded
function senseSurroundings(dt) {
  G.envT -= dt; if (G.envT > 0) return; G.envT = 0.5;
  const w = G.world, p = G.player.pos; let wd = 99, rd = 99;
  for (let a = 0; a < 12; a++) { const an = a / 12 * Math.PI * 2; for (const r of [0, 8, 16, 26, 40]) { const x = p.x + Math.cos(an) * r, z = p.z + Math.sin(an) * r, s = w.sample(x, z, {}); if (s.h < -0.2 && r < wd) wd = r; if (s.river > .7 && s.h < 0 && r < rd) rd = r; if (s.h < -0.2) break; } }
  G.env.waterDist = wd; G.env.riverDist = rd; G.env.forest = w.forest(p.x, p.z);
}
function surfaceAt(kind) {
  if (kind === 'water' || kind === 'swim') return 'water';
  const p = G.player.pos, c = G.camp;
  if (c.inside(p.x, p.z)) return 'floor';
  if (Math.hypot(p.x - c.c.x, p.z - c.c.z) < 9) return 'dirt';
  const n = G.world.normal(p.x, p.z, [0, 1, 0], 1); if (n[1] < .8) return 'rock';
  return G.world.forest(p.x, p.z) > .55 ? 'dirt' : 'grass';
}
function collide(x, z, r) {
  let p = [x, z];
  G.flora.near(p[0], p[1], r, (cx, cz, cr) => { p = pushOut(p[0], p[1], r, { t: 'c', x: cx, z: cz, r: cr }); });
  const c = G.camp.c;
  if (Math.abs(x - c.x) < 20 && Math.abs(z - c.z) < 20) for (const col of G.camp.colliders) p = pushOut(p[0], p[1], r, col);
  return { x: p[0], z: p[1] };
}

// ---------- menus ----------
function pause(on) {
  if (on && G.state === 'play') { G.state = 'pause'; $('#pause').hidden = false; input.unlock(); }
  else if (!on && G.state === 'pause') { G.state = 'play'; $('#pause').hidden = true; G.wasLocked = false; input.lock(); }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
  if (a === 'spawn') start({ spawn: b.dataset.spawn });
  if (a === 'resume') pause(false);
  if (a === 'quality') { G.settings.quality = b.dataset.q; saveSettings(); drawSettings(); applyQuality(); }
  if (a === 'quit') location.reload();
});
canvas.addEventListener('click', () => { if (G.state === 'play' && !input.locked && !input.isTouch) input.lock(); });
function drawSettings() { for (const b of document.querySelectorAll('[data-act=quality]')) b.classList.toggle('on', b.dataset.q === G.settings.quality); }
function applyQuality() {
  resize(); if (!G.terrain) return; const q = QUALITY[G.settings.quality];
  G.terrain.setRadius(q.nearR, q.farR); G.flora.set(q.veg); G.grass.build(q.grass); G.sky.setShadowQuality(q.shadow, q.span);
}
drawSettings();

// test hooks
window.__fh = { G, THREE, start, scene, camera, renderer, input, hold: on => { G.hold = on; },
  // run frames by hand and grab the picture (for headless tests)
  tick: (frames = 1, dt = 1 / 30) => { G.noRender = true; for (let i = 0; i < frames; i++) step(dt); G.noRender = false; },
  snap: (frames = 1, dt = 1 / 30) => { for (let i = 0; i < frames; i++) step(dt); return renderer.domElement.toDataURL('image/jpeg', 0.92); },
  look: (yaw, pitch) => { G.player.yaw = yaw; G.player.pitch = pitch; G.player.applyCamera(); },
  collideTest: (x, z, r) => collide(x, z, r), interact: id => doInteract(G.camp.interact.find(i => i.id === id)), sleep, weather: st => G.weather.set(st), audio, gunCtx,
  goto: (x, z, yaw = G.player.yaw, pitch = G.player.pitch) => { G.player.place(x, z, yaw); G.player.pitch = pitch; G.player.applyCamera(); }, setTime: h => { G.sky.hours = h; G.sky.renderEnv(); }, debug: on => { G.debug = on; $('#debug').hidden = !on; } };
if (params.get('debug')) window.__fh.debug(true);
if (params.get('spawn')) start({ spawn: params.get('spawn'), seed: params.get('seed') ? +params.get('seed') : 1234, hours: params.get('t') ? +params.get('t') : undefined });
