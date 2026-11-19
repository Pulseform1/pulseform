// Frontier Hunter: start-up, menus, the frame loop and the glue between systems.
import * as THREE from 'three';
import { U } from './fx.js';
import { World } from './world.js';
import { Jobs } from './jobs.js';
import { groundTextures, macroTexture, barkTexture, foliageTextures, canvasTexture, woodTexture, blanketTexture, endGrainTexture } from './texgen.js';
import { Terrain } from './terrain.js';
import { buildPlants } from './plants.js';
import { Flora } from './flora.js';
import { Grass } from './grass.js';
import { Water } from './water.js';
import { Sky } from './sky.js';
import { Camp, TENT } from './camp.js';
import { Player, pushOut } from './player.js';
import { Input } from './input.js';

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
  TEX = { ...ground, ground, bark, leaf, canvas: canvasTexture(), wood: woodTexture(61, '#8a6a48', '#46301e'), wood2: woodTexture(67, '#6a4a30', '#2e1e12'), blanket: blanketTexture(), endGrain: endGrainTexture() };
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
  // stand in the tent doorway looking out at the fire
  const door = camp.toWorld(0, TENT.cz + TENT.L / 2 + 0.9);
  player.place(door.x, door.z, camp.yaw + Math.PI);
  if (opts.player) { player.place(opts.player.x, opts.player.z, opts.player.yaw); }
  Object.assign(G, { world, jobs, sky, terrain, flora, grass, water, camp, player, seed, spawn: opts.spawn, gameTime: 0 });
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
  if (it.id === 'chest') { c.chestOpen = !c.chestOpen; toast(c.chestOpen ? 'The chest creaks open.' : 'You close the chest.'); return; }
  if (it.id === 'fire') { c.fire.addFuel(.35); toast(c.fire.fuel > .9 ? 'The fire roars.' : 'You lay another log on the fire.'); return; }
  if (it.id === 'seat') { P.seated = P.seated ? null : it; P.frozen = !!P.seated; toast(P.seated ? 'You sit by the fire. Press E to stand.' : 'You stand up.'); return; }
  if (it.id === 'bed') { G.sky.hours = G.sky.hours > 19 || G.sky.hours < 5 ? 6.2 : (G.sky.hours + 3) % 24; toast('You rest a while in the bedroll.'); fade(); return; }
  toast(it.label());
}
function carryLantern(on) {
  const L = G.camp.lantern;
  if (on) { L.carried = true; G.handL.add(L.group); L.group.position.set(0, 0, 0); L.group.rotation.set(0, 0, 0); }
  else { L.carried = false; G.camp.lanternHome.add(L.group); L.group.position.set(0, 0, 0); L.group.rotation.set(0, 0, 0); }
}
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); toastT = 3.2; }
function fade() { const f = $('#fade'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 900); }

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
  if (G.state !== 'play' && G.state !== 'pause') { input.endFrame(); return; }
  const { player, sky, terrain, flora, grass, water, camp, jobs } = G;
  if (G.state === 'play') {
    if (input.locked || input.isTouch) player.look(input.lookX, input.lookY, G.settings.sens);
    player.update(dt, input, (x, z, r) => collide(x, z, r));
    if (input.hit('KeyE')) { const it = nearestInteract(); if (it) doInteract(it); else if (player.seated) { player.seated = null; player.frozen = false; } }
    if (input.hit('KeyL')) { if (camp.lantern.carried) camp.lantern.toggle(); else toast('Your lantern hangs by the tent door.'); }
    if (input.hit('Escape') || (!input.locked && !input.isTouch && G.wasLocked)) pause(true);
    G.wasLocked = input.locked;
    G.gameTime += dt;
  }
  U.uTime.value += dt;
  const w = U.uWind.value, wt = U.uTime.value; w.z = 0.35 + 0.25 * Math.sin(wt * 0.05) + 0.15 * Math.sin(wt * 0.013);
  sky.update(dt, camera.position, G.state === 'play' ? dt * 60 : 0);
  terrain.update(camera.position, dt); terrain.sync(); flora.update(camera.position, dt); grass.update(camera.position, player.pos); water.update(camera.position); jobs.tick(4);
  camp.update(dt, sky.night, new THREE.Vector3(w.x * w.z, 0, w.y * w.z));
  if (camp.lantern.carried) {
    camp.lantern.update(dt, Math.max(sky.night, 1 - sky.daylight));
    const sw = player.bobAmt, ph = player.stepPhase;
    G.handL.position.set(-0.27 + Math.sin(ph) * .012 * sw, -0.43 + Math.abs(Math.cos(ph)) * .015 * sw, -0.5);
    G.handL.rotation.set(0.05 + Math.sin(ph) * .05 * sw, 0.2, Math.sin(ph * .5) * .06 * sw);
  }
  // HUD
  const it = G.state === 'play' ? nearestInteract() : null, pr = $('#prompt');
  if (it) { pr.textContent = 'E  ' + it.label(); pr.classList.add('on'); } else pr.classList.remove('on');
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('#toast').classList.remove('on'); }
  const h = sky.hours, hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  $('#clock').textContent = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`;
  if (G.debug) $('#debug').textContent = `${fps.toFixed(0)} fps  calls ${renderer.info.render.calls}  tris ${(renderer.info.render.triangles / 1e6).toFixed(2)}M  trees ${flora.counts.near}/${flora.counts.mid}/${flora.counts.far}  jobs ${jobs.pending}`;
  renderer.render(scene, camera);
  input.endFrame();
}
requestAnimationFrame(loop);

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
window.__fh = { G, THREE, start, scene, camera, renderer, hold: on => { G.hold = on; },
  // run frames by hand and grab the picture (for headless tests)
  snap: (frames = 1, dt = 1 / 30) => { for (let i = 0; i < frames; i++) step(dt); return renderer.domElement.toDataURL('image/jpeg', 0.92); },
  look: (yaw, pitch) => { G.player.yaw = yaw; G.player.pitch = pitch; G.player.applyCamera(); },
  goto: (x, z, yaw = G.player.yaw, pitch = G.player.pitch) => { G.player.place(x, z, yaw); G.player.pitch = pitch; G.player.applyCamera(); }, setTime: h => { G.sky.hours = h; G.sky.renderEnv(); }, debug: on => { G.debug = on; $('#debug').hidden = !on; } };
if (params.get('debug')) window.__fh.debug(true);
if (params.get('spawn')) start({ spawn: params.get('spawn'), seed: params.get('seed') ? +params.get('seed') : 1234, hours: params.get('t') ? +params.get('t') : undefined });
