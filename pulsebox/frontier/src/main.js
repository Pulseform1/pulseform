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
import { Weapons, GUNS, ORDER, AMMO } from './weapons.js';
import { Fishing } from './fishing.js';
import { Post } from './post.js';
import { Drone } from './drone.js';
import { SPECIES, makeAnimal } from './animals.js';
import { CampLife } from './camplife.js';
import { UI } from './ui.js';
import { SurveyMap } from './map.js';
import { Dens } from './dens.js';
import { ForestMist } from './mist.js';

const $ = s => document.querySelector(s);
const params = new URLSearchParams(location.search);
const QUALITY = {
  low: { pr: 1, shadow: 1024, span: 40, nearR: 300, farR: 2400, veg: { vegR: 600, nearR: 38, midR: 100, propR: 45 }, grass: 'low', fur: 0 },
  medium: { pr: 1.25, shadow: 2048, span: 55, nearR: 380, farR: 3200, veg: { vegR: 800, nearR: 50, midR: 130, propR: 62 }, grass: 'medium', fur: 3 },
  high: { pr: 1.6, shadow: 4096, span: 65, nearR: 440, farR: 3800, veg: { vegR: 950, nearR: 62, midR: 165, propR: 80 }, grass: 'high', fur: 7 },
};
const SPAWNS = { forest: 'Deep Forest', valley: 'Mountain Valley', lake: 'Wilderness Lake' };
// what a kill pays, in coins
const BOUNTY = { rabbit: 2, duck: 3, turkey: 4, deer: 12, goat: 20, elk: 22, wolf: 16, bison: 26, moose: 32, cougar: 38, bear: 48 };

const G = { settings: loadSettings(), state: 'menu' };
// a sensible first guess at graphics quality: phones and tablets low, small laptops medium
// The starting graphics: Chromebooks, phones and tablets, and laptops on basic built-in graphics start on Low; Macs and
// laptops with better built-in graphics on Medium; only a strong graphics card gets High. The game then steps down by
// itself if frames still run slow (until the player picks a setting by hand).
function gpuName() { try { const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl'), e = gl && gl.getExtension('WEBGL_debug_renderer_info'); return e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : ''; } catch { return ''; } }
function defaultQuality() {
  const touch = matchMedia('(pointer: coarse)').matches, cores = navigator.hardwareConcurrency || 4, ua = navigator.userAgent, gpu = gpuName().toLowerCase();
  if (touch || /CrOS/.test(ua) || cores <= 2 || /mali|adreno|powervr|swiftshader|llvmpipe|software|intel\(r\) (hd|uhd) graphics( [0-9]{3,4})?\b|intel hd|uhd graphics/.test(gpu)) return 'low';
  if (/Macintosh/.test(ua) || /intel|iris|apple|radeon\(tm\) graphics|vega [0-9] graphics/.test(gpu) || cores <= 4) return 'medium';
  return 'high';
}
function loadSettings() { const d = { quality: defaultQuality(), sens: 1, vol: .8, qualityAuto: true }; try { const st = { ...d, ...JSON.parse(localStorage.getItem('fh-settings') || '{}') }; if (st.qualityAuto !== false) { st.quality = d.quality; st.qualityAuto = true; } return st; } catch { return d; } }
function saveSettings() { try { localStorage.setItem('fh-settings', JSON.stringify(G.settings)); } catch { } }
if (params.get('q')) G.settings.quality = params.get('q');

// ---------- renderer ----------
const canvas = $('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
// shader error checks read each compile's log, which makes the browser finish compiling there and then (a freeze); only
// with ?debug=1
renderer.debug.checkShaderErrors = params.get('debug') === '1';
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.62;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.08, 6000);
function resize() {
  const q = QUALITY[G.settings.quality] || QUALITY.high;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q.pr)); renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); if (G.post) G.post.resize();
}
addEventListener('resize', resize); resize();
G.post = new Post(renderer, scene, camera, G.settings.quality);
const input = new Input(canvas); G.input = input;
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
  if (G.state === 'loading' || G.world) return;
  $('#menu').hidden = true; $('#loading').hidden = false; G.state = 'loading';
  await assets();
  const seed = opts.seed ?? ((Math.random() * 2 ** 31) | 0);
  const world = new World(seed);
  setLoad(.32, 'Scouting a place for camp'); await frame();
  const sp = opts.camp || world.findSpawn(opts.spawn);
  world.setCamp(sp.x, sp.z, opts.spawn);
  const q = QUALITY[G.settings.quality] || QUALITY.high;
  const jobs = new Jobs(seed, { x: sp.x, z: sp.z, region: opts.spawn });
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
  wildlife.onAttack = (a, dmg) => hurt(dmg, a);
  // bear dens in the deep forest, and the bears that keep them
  const dens = G.dens = new Dens(scene, world, TEX); wildlife.dens = dens;
  dens.onFound = () => { if (G.state === 'play') { toast('A bear den in the hillside. Gnawed bones at the mouth, claw marks raked into the rock. Whatever lives here will defend it: back away, or be ready.'); audio.animal('bear', 70, 0); } };
  wildlife.onDen = () => { const t = performance.now(); if (G.state === 'play' && t - (G.denToast || 0) > 8000) { G.denToast = t; toast('The den bear is coming for you! You cannot outrun it. Stand and shoot: the head drops it, the heart slows it.'); } };
  G.mist = new ForestMist(scene, TEX.puff, ({ low: 8, medium: 12, high: 16 })[G.settings.quality] || 12);
  wildlife.region = opts.spawn; wildlife.home = world.camp; wildlife.furN = (QUALITY[G.settings.quality] || QUALITY.medium).fur;
  player.onStep = kind => audio.step(surfaceAt(kind), kind === 'run');
  // stand in the tent doorway looking out at the fire
  const door = camp.toWorld(0, TENT.cz + TENT.L / 2 + 0.9);
  player.place(door.x, door.z, camp.yaw + Math.PI);
  if (opts.player) { player.place(opts.player.x, opts.player.z, opts.player.yaw); }
  Object.assign(G, { world, jobs, sky, terrain, flora, grass, water, camp, player, weather, wildlife, stats: { taken: {} }, timeScale: 1, gameHours: 0, seed, spawn: opts.spawn, gameTime: 0, day: 0, envT: 0, env: { waterDist: 99, riverDist: 99, forest: 0 }, coins: 40, health: 100, breath: 4, dead: false });
  if (!G.weapons) { G.weapons = new Weapons(camera, TEX, TEX.glow); }
  G.fishing = new Fishing(G, scene, camera, audio);
  G.drone = G.drone || new Drone(G, camera, renderer, scene); G.drone.reset();
  G.tex = TEX; G.life = new CampLife(G, G.ui);
  G.map = G.map || new SurveyMap(G); G.map.explored.clear(); G.map.markers = []; G.map.guide = true; G.map.trail = [];
  if (opts.restore) restore(opts.restore);
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
  // compile every animal's shaders (fur too) while the loading screen is up, so the first bear or elk to walk into view
  // does not freeze the game for a moment
  // ... and draw one whole frame behind the loading screen with them standing in the open, so the shadow and glow passes
  // compile their shaders now too, not the first time something casts a shadow in play
  { const tmp = []; let i = 0; for (const k of Object.keys(SPECIES)) { try { const a = makeAnimal(k, .5), d = 7 + (i++ % 4) * 3; a.mesh.position.set(camera.position.x - Math.sin(player.yaw) * d, world.height(camera.position.x, camera.position.z), camera.position.z - Math.cos(player.yaw) * d); for (const sh of a.shells || []) sh.visible = true; scene.add(a.mesh); tmp.push(a.mesh); } catch (e) { } }
    { const w0 = dens.warm(); w0.position.set(camera.position.x - Math.sin(player.yaw) * 9, world.height(camera.position.x, camera.position.z), camera.position.z - Math.cos(player.yaw) * 9); scene.add(w0); tmp.push(w0); }
    renderer.compile(scene, camera); try { G.post.render(0, U.uSunDirW.value, 1, 0); } catch (e) { renderer.render(scene, camera); } for (const m of tmp) scene.remove(m); }
  $('#loading').hidden = true; $('#hud').hidden = false; G.state = 'play'; G.saveT = 20;
  $('#touch').hidden = !input.isTouch; document.body.classList.toggle('touch', input.isTouch);
  setTimeout(() => toast(opts.restore ? `Back at camp. Day ${G.day + 1}.` : input.isTouch ? 'Drag left to walk, right to look. Tap ? for all the controls.' : 'Press Tab any time to see all the controls.'), 1500);
  // the first time, show the controls card for a while, then tuck it away
  if (!G.settings.helpSeen) { G.settings.helpSeen = true; saveSettings(); toggleHelp(true); clearTimeout(G.helpT); G.helpT = setTimeout(() => toggleHelp(false), 14000); }
  updateHud(true);
  if (!input.isTouch) input.lock();
}

// ---------- the weapon bar along the bottom: each gun with its key and rounds, the one in hand lit, and the drone ----------
const SLOT_NAME = { longrifle: 'Sniper', pump: 'Shotgun', double: 'Double', revolver: 'Pistol', rod: 'Rod' };
{
  const row = $('#slots .row');
  row.innerHTML = ORDER.map((k, i) => `<button type="button" data-slot="${k}"><kbd>${i + 1}</kbd>${SLOT_NAME[k] || GUNS[k].name}</button>`).join('') + '<button type="button" class="light" data-slot="light"><kbd>6</kbd>Light</button><button type="button" class="drone" data-slot="drone"><kbd>G</kbd>Drone</button>';
  row.addEventListener('click', e => { const b = e.target.closest('[data-slot]'); if (!b || G.state !== 'play') return; const k = b.dataset.slot;
    if (k === 'drone') input.press('KeyG'); else if (k === 'light') toggleTorch(); else if (!G.drone.on) G.weapons.select(G.weapons.want === k && k === 'rod' ? null : k); });
}
function drawSlots() {
  // hidden while the drone flies: its own screen lists its keys
  const el = $('#slots'), show = (G.state === 'play' || G.state === 'ui') && !G.drone.on; if (el.hidden === show) { el.hidden = !show; if (show) G._slotLit = performance.now(); } if (!show) return;
  const W = G.weapons, D = G.drone, touch = input.isTouch, now = performance.now();
  const key = touch + '|' + W.want + '|' + ORDER.map(k => GUNS[k].rod ? '' : (W.ammo[k] + W.reserve[GUNS[k].ammo] > 0 ? 1 : 0)).join('') + '|' + (D.battery < .2) + '|' + !!D.landed + '|' + G.torchOn;
  if (key !== G._slotKey) {   // something changed: show it brightly for a few seconds
    if ((G._slotKey || '').split('|')[1] !== String(W.want)) G._slotLit = now;
    G._slotKey = key; el.querySelector('.cap').textContent = touch ? 'Tap to switch' : '1–5 or scroll to switch · 6 light · G drone';
    for (const b of el.querySelectorAll('[data-slot]')) { const k = b.dataset.slot;
      if (k === 'light') { b.classList.toggle('on', G.torchOn); continue; }
      if (k === 'drone') { b.classList.toggle('low', D.battery < .2); b.classList.toggle('out', !!D.landed); b.title = D.landed ? 'The drone is landed out there: G flies it from where it sits, E packs it when you reach it' : ''; continue; }
      const g = GUNS[k]; b.classList.toggle('on', W.want === k); b.classList.toggle('empty', !g.rod && W.ammo[k] + W.reserve[g.ammo] === 0); }
  }
  el.classList.toggle('idle', now - (G._slotLit || 0) > 4500);
}

// ---------- the controls card (Tab, or the ? button) ----------
function toggleHelp(on) { const h = $('#help'), show = on ?? h.hidden; h.hidden = !show; $('#helpchip').classList.toggle('on', show); clearTimeout(G.helpT); }
$('#helpchip').addEventListener('click', () => toggleHelp());

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
G.ui = new UI(G); G.eat = () => eat();
G.onPanel = open => { if (open) { G.state = 'ui'; input.unlock(); } else if (G.state === 'ui') { G.state = 'play'; G.wasLocked = false; if (!input.isTouch) input.lock(); } };

// the hand that carries the lantern: hangs low on the left, sways as you walk
G.handL = new THREE.Group(); camera.add(G.handL); scene.add(camera);
// the flashlight: a beam from where you look, on and off with 6 (it is always in the scene, only dark when off, so turning
// it on never stalls the game while the lights are rebuilt)
G.torch = new THREE.SpotLight(0xfff1d6, 0, 90, .42, .5, 1); G.torch.position.set(.18, -.12, 0); camera.add(G.torch); G.torch.target.position.set(.05, -.02, -10); camera.add(G.torch.target); G.torchOn = false;
function toggleTorch(on = !G.torchOn) { G.torchOn = on; G.torch.intensity = on ? 150 : 0; audio.click && audio.click(); }

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
    if (input.hit('Tab')) toggleHelp();
    if (input.hit('KeyG')) { const Wq = G.weapons; Wq.ads = 0; Wq.scoped = 0; gunCtx.scope(0); G.drone.toggle(); }
    G.drone.update(dt, input, G.settings.sens);
  }
  if (G.state === 'play' && G.drone.on) {
    G.health = Math.min(100, G.health + dt * .08);
    if (input.hit('Escape') || (!input.locked && !input.isTouch && G.wasLocked)) pause(true);
    G.wasLocked = input.locked; G.gameTime += dt;
  } else if (G.state === 'play') {
    const Wp = G.weapons, aimK = camera.fov / 72;   // aiming and the scope slow the look to match the view
    if (input.locked || input.isTouch) player.look(input.lookX, input.lookY, G.settings.sens * (Wp.scoped > .5 || Wp.ads > .5 ? Math.max(.12, aimK) : 1));
    player.update(dt, input, (x, z, r) => collide(x, z, r));
    ORDER.forEach((k, i) => { if (input.hit('Digit' + (i + 1))) Wp.select(Wp.want === k && k === 'rod' ? null : k); });
    if (input.hit('KeyH')) Wp.select(null);
    if (input.hit('Digit6')) toggleTorch();
    if (input.hit('KeyP')) G.drone.pinLook();   // pin the spot you are looking at (through the scope too)
    if (input.wheel && !(Wp.scoped > .5) && !(G.fishing && G.fishing.busy)) Wp.cycle(input.wheel > 0 ? 1 : -1);
    if (input.hit('KeyF') && G.health < 100) eat();
    if (input.hit('KeyE') && G.drone.nearLanded && !nearestInteract()) G.drone.pickUp(); else if (input.hit('KeyE')) { const it = nearestInteract(), carcass = !it && G.carcass; if (player.seated && (!it || it.id === 'seat')) { player.seated = null; player.frozen = false; toast('You stand up.'); } else if (it) doInteract(it); else if (carcass) harvest(carcass); else if (G.wood) G.life.gather(G.wood); }
    G.timeScale = player.seated && input.down('Space') ? 30 : 1;
    // through the scope the crosshair drifts with your breathing and heartbeat; Shift holds your breath for a few seconds
    { const sc = Wp.scoped > .5, hold = sc && (input.down('ShiftLeft') || input.down('ShiftRight')) && G.breath > 0;
      G.breath = Math.max(0, Math.min(4, G.breath + (hold ? -dt : dt * .7))); const tired = G.breath < .5 && sc ? 1.8 : 1, k = sc ? (hold ? .12 : 1) * tired * (1 + (100 - G.health) / 120) : 0, t = G.gameTime;
      G.swayX = (G.swayX || 0) + ((Math.sin(t * .63) * .0036 + Math.sin(t * 1.37) * .0016) * k - (G.swayX || 0)) * Math.min(1, dt * 4);
      G.swayY = (G.swayY || 0) + ((Math.sin(t * .91 + 1) * .0028 + Math.sin(t * 2.1) * .001 + Math.max(0, Math.sin(t * 7.5)) * .0006) * k - (G.swayY || 0)) * Math.min(1, dt * 4);
      camera.rotation.y += G.swayX; camera.rotation.x += G.swayY; }
    G.health = Math.min(100, G.health + dt * (camp.inside(player.pos.x, player.pos.z) || player.seated ? .5 : .08));
    if (input.hit('KeyL')) { if (camp.lantern.carried) camp.lantern.toggle(); else toast('Your lantern hangs by the tent door.'); }
    if (input.hit('Escape') || (!input.locked && !input.isTouch && G.wasLocked)) pause(true);
    G.wasLocked = input.locked;
    G.gameTime += dt;
  }
  U.uTime.value += dt;
  const w = U.uWind.value;
  const gameDt = live ? dt * 60 * G.timeScale : 0, before = sky.hours;
  // how deep in the timber you are: thick forest all round dims the light, thickens the fog and mist, quiets the birds
  // (camp stays a clearing you can see across)
  G.gloomT = (G.gloomT || 0) - dt;
  if (G.gloomT <= 0) { G.gloomT = .4; let f = 0; for (let k = 0; k < 9; k++) { const a = k / 8 * Math.PI * 2, r = k ? 38 : 0, x = player.pos.x + Math.cos(a) * r, z = player.pos.z + Math.sin(a) * r; f += G.world.deep(x, z, G.world.forestRaw(x, z, G.world.sample(x, z, {}))); }
    const cp = G.world.camp, dc = cp ? Math.hypot(player.pos.x - cp.x, player.pos.z - cp.z) : 1e9; G.gloomTgt = THREE.MathUtils.smoothstep(f / 9, .25, .7) * THREE.MathUtils.smoothstep(dc, 60, 170); }
  G.gloom = (G.gloom || 0) + ((G.gloomTgt || 0) - (G.gloom || 0)) * Math.min(1, dt * .25); sky.gloom = G.gloom;
  sky.update(dt, camera.position, gameDt);
  if (sky.hours < before) G.day++;
  G.gameHours = G.day * 24 + sky.hours;
  G.life.update(dt * (live ? G.timeScale : 0), gameDt);
  G.weather.update(dt, gameDt, sky.hours, G.day);
  senseSurroundings(dt);
  audio.update({ gloom: G.gloom || 0, day: sky.daylight, night: sky.night, wind: U.uWind.value.z, rain: G.weather.cur.rain, inTent: camp.inside(player.pos.x, player.pos.z), fireDist: camera.position.distanceTo(camp.firePos), fireFuel: camp.fire.u.uFuel.value, waterDist: G.env.waterDist, riverDist: G.env.riverDist, forest: G.env.forest, dt });
  terrain.update(camera.position, dt); terrain.sync(); flora.update(camera.position, dt); grass.update(camera.position, player.pos); water.update(camera.position); jobs.tick(4);
  camp.update(dt * G.timeScale, sky.night, new THREE.Vector3(w.x * w.z, 0, w.y * w.z));
  G.dens.update(dt, player.pos);
  G.mist.update(dt, player.pos, G.world, G.gloom, (G.mistCol || (G.mistCol = new THREE.Color())).copy(scene.fog.color).multiplyScalar(1.7), { x: w.x * w.z, y: w.y * w.z });
  // wildlife and guns
  const moving = player.speed > .4, noise = player.swimming ? .7 : !moving ? .04 : player.crouched ? .14 : player.speed > 4.5 ? 1 : .42;
  const lookV = G.drone.on ? new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)) : camera.getWorldDirection(new THREE.Vector3()), inCamp = Math.hypot(player.pos.x - camp.c.x, player.pos.z - camp.c.z) < 16;
  G.inTall = G.grass.valueAt(player.pos.x, player.pos.z) > 2.3;   // deep in the super-tall grass: much harder to see
  if (live) G.wildlife.update(dt, { pos: player.pos, noise, crouched: player.crouched, hidden: G.inTall, moving, night: sky.night > .5, lantern: camp.lantern.carried && camp.lantern.on, wind: { x: w.x, z: w.y }, look: lookV, inCamp, dead: G.dead }, sky.hours);
  G.wildlife.furR = G.weapons.scoped > .5 ? 240 : 34; G.wildlife.lightK = Math.max(0, sky.night - .3) * (camp.lantern.carried && camp.lantern.on ? 1 : .35);
  G.wildlife.render(dt, camera.position);
  const W = G.weapons;
  if (G.state === 'play' && !G.drone.on) {
    W.update(dt, player.seated || player.sleeping || G.dead ? { mouseDown: [], clicked: new Set(), hit: () => false } : input, gunCtx);
    G.handL.visible = !(camp.lantern.carried && W.ads > .6) && !(W.scoped > .5);
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
  const onFoot = G.state === 'play' && !G.drone.on, it = onFoot ? nearestInteract() : null, pr = $('#prompt');
  const look = camera.getWorldDirection(new THREE.Vector3());
  G.carcass = !it && onFoot ? G.wildlife.carcassNear(player.pos, look) : null;
  G.woodT = (G.woodT || 0) - dt; if (G.woodT < 0) { G.woodT = .25; G.wood = !it && !G.carcass && onFoot ? G.life.gatherSpot(player.pos, look) : null; }
  if (player.seated && G.timeScale > 1) { pr.textContent = 'Time passes by the fire...'; pr.classList.add('on'); }
  else if (it) { pr.textContent = 'E  ' + it.label(); pr.classList.add('on'); } else if (onFoot && G.drone.nearLanded) { pr.textContent = 'E  Pack the drone away'; pr.classList.add('on'); } else if (G.carcass) { pr.textContent = 'E  Dress the ' + G.carcass.sp.label.toLowerCase(); pr.classList.add('on'); } else if (G.wood) { pr.textContent = 'E  Gather dry wood' + (G.wood.kind === 6 ? ' from the fallen log' : G.wood.kind === 7 ? ' from the old stump' : ' from the dead tree'); pr.classList.add('on'); } else pr.classList.remove('on');
  $('#cross').style.opacity = W.ads > .5 || W.scoped > .5 || G.drone.on ? 0 : 1; G.drone.draw(); drawSlots();
  $('#ammo').textContent = W.label; $('#hit').classList.toggle('on', G.hitT > 0); G.hitT -= dt; updateHud(); G.fishing.tick(dt);
  G.ui.tick(dt);
  if (live) G.map.reveal(dt);
  G.map.draw(); G.map.compass(); drawStick();
  if (G.state === 'play') { G.saveT -= dt; if (G.saveT <= 0) { G.saveT = 30; saveGame(); } }
  adaptResolution(dt);
  const h = sky.hours, hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  $('#clock').textContent = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`;
  if (G.debug) $('#debug').textContent = `${fps.toFixed(0)} fps  calls ${renderer.info.render.calls}  tris ${(renderer.info.render.triangles / 1e6).toFixed(2)}M  trees ${flora.counts.near}/${flora.counts.mid}/${flora.counts.far}  jobs ${jobs.pending}`;
  if (!G.noRender) G.post.render(dt, U.uSunDirW.value, sky.daylight * (1 - Math.min(1, G.weather.cur.rain * 2)), sky.night, G.gloom || 0);
  input.endFrame();
}
requestAnimationFrame(loop);
// keep the frame rate up on smaller machines: trade resolution for smoothness, and take it back when there is room
let frameAvg = 16, resT = 0, resScale = 1;
function adaptResolution(dt) {
  if (G.noRender || G.hold) return;
  frameAvg += (dt * 1000 - frameAvg) * .05; resT += dt; if (resT < 2) return; resT = 0;
  const q = QUALITY[G.settings.quality] || QUALITY.high, base = Math.min(devicePixelRatio || 1, q.pr);
  // still slow at the lowest resolution: drop a graphics level (only while the game is choosing for the player)
  if (frameAvg > 30 && resScale <= .61 && G.settings.qualityAuto && G.settings.quality !== 'low') { G.slowN = (G.slowN || 0) + 1; if (G.slowN >= 2) { G.slowN = 0; const nq = G.settings.quality === 'high' ? 'medium' : 'low'; G.settings.quality = nq; saveSettings(); drawSettings(); applyQuality(); resScale = 1; frameAvg = 16; toast(`Graphics set to ${nq === 'low' ? 'Low' : 'Medium'} to keep the game smooth.`); return; } } else G.slowN = 0;
  if (frameAvg > 22 && resScale > .6) resScale = Math.max(.6, resScale - .1);
  else if (frameAvg < 14 && resScale < 1) resScale = Math.min(1, resScale + .05);
  else return;
  renderer.setPixelRatio(base * resScale); renderer.setSize(innerWidth, innerHeight, false); G.post.resize();
}

// ---------- shooting ----------
const gunCtx = {
  scene, get puff() { return TEX.puff; }, get bob() { return G.player.bobAmt; }, get phase() { return G.player.stepPhase; }, get fishing() { return G.fishing; }, get lanternInHand() { return G.camp && G.camp.lantern.carried; },
  scope(k, fov) { const s = $('#scope'); s.style.opacity = k > .5 ? 1 : 0; s.classList.toggle('on', k > .5); if (k > .5) $('#scopepow').textContent = fov ? `${Math.round(72 / fov)}×` : ''; },
  setFov(f) { if (Math.abs(camera.fov - f) > .05) { camera.fov = f; camera.updateProjectionMatrix(); } },
  recoil(k) { G.player.pitch += k; G.recoilBack = (G.recoilBack || 0) + k * .7; },
  sound(kind, gun) { if (kind === 'shot') { audio.shot(gun); G.wildlife.gunshot(G.player.pos); } else if (kind === 'click') audio.click(); else audio.mech(kind); },
  trace(o, d, range, power, first, gun) {
    let blockT = range, hitTree = false;
    for (let t = .6; t < range; t += t < 30 ? .35 : 1) {
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
      if (y < G.world.height(x, z)) { blockT = t; break; }
      G.flora.near(x, z, 0, () => { hitTree = true; }); if (hitTree) { blockT = t; break; }
    }
    const h = G.wildlife.raycast(o, d, blockT);
    if (h) {
      const fall = gun && gun.pellets > 1 ? Math.max(.25, 1 - h.t / range) : 1;   // shot spreads and slows with distance
      const down = h.a.hit(h.zone || h.vital, power * fall); G.hitT = .15; showZone(h.zone, down, h.a);
      spawnDust(h.point, 0x8a7a64, .4);
      if (down) { const c = (BOUNTY[h.a.sp.name] || 5) + (h.a.den ? 40 : 0); G.coins += c; coinPop(c); }
      const danger = h.a.sp.bear || h.a.sp.ornery || h.a.sp.predator;
      if (first || down) toast(down ? (h.a.sp.small || h.a.sp.bird ? `Got the ${h.a.sp.label.toLowerCase()}. +${(BOUNTY[h.a.sp.name] || 5) + (h.a.den ? 40 : 0)} coins` : `A clean shot. The ${h.a.sp.label.toLowerCase()} is down. +${(BOUNTY[h.a.sp.name] || 5) + (h.a.den ? 40 : 0)} coins`) : danger ? `Hit! The ${h.a.sp.label.toLowerCase()} is wounded, and angry.` : `Hit, but the ${h.a.sp.label.toLowerCase()} runs on. Follow it.`);
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

// ---------- health ----------
// a blow from an animal: the view jolts and reddens, you are knocked back; at nothing, you black out and wake at camp
function hurt(dmg, a) {
  if (G.dead || G.state !== 'play' && G.state !== 'ui') return;
  G.health = Math.max(0, G.health - dmg); G.shake = Math.min(1.2, (G.shake || 0) + .5 + dmg / 60); G.hurtT = 1;
  const d = G.player.pos.clone().sub(a.pos).setY(0); if (d.lengthSq() > 1e-4) G.player.vel.addScaledVector(d.normalize(), 5 + dmg / 8);
  audio.hurt(dmg);
  if (G.drone.on) G.drone.recall('Something has you! The drone drops back to your pack.');
  if (G.health <= 0) return die(a);
  if (G.state === 'play') toast(a.sp.bear ? 'The grizzly is on you! Shoot it, or it will maul you.' : a.sp.ornery ? 'The moose tramples you and wheels away.' : a.sp.predator === 'cougar' ? 'The cougar has you! Shoot it off!' : 'A wolf bites and darts back to the pack.');
}
function die(a) {
  G.dead = true; if (G.drone.on) G.drone.recall(); G.weapons.select(null); if (G.state === 'ui') G.ui.close();
  const lost = Math.floor(G.coins * .25); G.coins -= lost; G.life.pack.meat.length = 0;
  $('#death').hidden = false; $('#deathmsg').textContent = `${a.sp.bear ? (a.den ? 'Mauled by a den grizzly: you came too close to its cave' : 'Mauled by a grizzly') : a.sp.ornery ? 'Trampled by a moose' : a.sp.predator === 'cougar' ? 'Taken by a cougar' : 'Pulled down by wolves'}. You lost the meat in your pack${lost ? ` and ${lost} coins` : ''}.`;
  setTimeout(() => {
    fade(1800);
    setTimeout(() => {
      const c = G.camp, door = c.toWorld(0, TENT.cz + TENT.L / 2 + 0.9); G.player.place(door.x, door.z, c.yaw + Math.PI); G.player.vel.set(0, 0, 0);
      const h = G.sky.hours; if (h > 6.4) G.day++; G.sky.hours = 6.4; G.sky.renderEnv();
      for (const g of [...G.wildlife.groups]) G.wildlife.removeGroup(g); G.wildlife.seeded = false;
      G.health = 60; G.dead = false; $('#death').hidden = true; toast('You come to in your bedroll, bandaged and sore. Hunt carefully.'); saveGame();
    }, 900);
  }, 2600);
}
// F: eat from your pack (roast or dried meat heals; raw does too, a little)
function eat() {
  const L = G.life, m = L.pack.meat.find(q => q.state === 'cooked' && q.lb > 0) || L.pack.meat.find(q => q.state === 'dried' && q.lb > 0) || L.pack.meat.find(q => q.lb > 0);
  if (!m) return toast('Nothing to eat. Roast some meat at the fire.');
  const lb = Math.min(1, m.lb); m.lb -= lb; L.pack.meat = L.pack.meat.filter(q => q.lb > .01);
  const heal = m.state === 'raw' ? 8 : m.state === 'dried' ? 18 : 25; G.health = Math.min(100, G.health + heal);
  toast(`You eat ${m.state === 'raw' ? 'some raw' : m.state === 'dried' ? 'dried' : 'roast'} ${m.meat}. ${m.state === 'raw' ? 'It sits poorly.' : 'You feel stronger.'}`);
}
G.coinPop = n => coinPop(n);
// where the shot landed, under the crosshair for a moment
function showZone(z, down, a) {
  if (!z) return; const e = $('#zone'); if (!e) return;
  e.textContent = (z.label + (down ? '  ·  down' : a && a.lame > .2 && z.lame ? '  ·  limping' : '')).toUpperCase();
  e.className = 'on ' + (z.vital ? 'vital' : z.lame ? 'lame' : ''); clearTimeout(G.zoneT); G.zoneT = setTimeout(() => { e.className = ''; }, 1400);
}
function coinPop(n) { const e = $('#coinpop'); e.textContent = `+${n}`; e.classList.remove('on'); void e.offsetWidth; e.classList.add('on'); }
function updateHud(force) {
  const h = Math.round(G.health || 0), c = G.coins | 0;
  if (force || h !== G._hh) { G._hh = h; $('#hpbar i').style.width = h + '%'; $('#hp').classList.toggle('low', h < 35); $('#hpnum').textContent = h; }
  if (force || c !== G._cc) { G._cc = c; $('#coins b').textContent = c; }
  G.hurtT = Math.max(0, (G.hurtT || 0) - 1 / 60); $('#hurt').style.opacity = Math.max(G.hurtT * .8, h < 30 ? .25 + .1 * Math.sin(performance.now() / 300) : 0);
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
  if (G.dens) G.dens.collide(p[0], p[1], r, col => { p = pushOut(p[0], p[1], r, col); });
  const c = G.camp.c;
  if (Math.abs(x - c.x) < 20 && Math.abs(z - c.z) < 20) for (const col of G.camp.colliders) p = pushOut(p[0], p[1], r, col);
  return { x: p[0], z: p[1] };
}

// ---------- saving ----------
function saveGame() {
  if (!G.world || (G.state !== 'play' && G.state !== 'pause' && G.state !== 'ui')) return;
  const P = G.player, W = G.weapons, c = G.world.camp;
  const d = { v: 1, seed: G.seed, spawn: G.spawn, camp: { x: c.x, z: c.z }, player: { x: P.pos.x, z: P.pos.z, yaw: P.yaw }, hours: G.sky.hours, day: G.day,
    weather: G.weather.state, life: G.life.save(), ammo: W.ammo, reserve: W.reserve, gun: W.want, map: G.map.save(), stats: G.stats, coins: G.coins, health: G.health, fish: G.fishing ? G.fishing.save() : null, drone: G.drone ? G.drone.save() : null, dens: G.dens ? G.dens.save() : null, lantern: { carried: G.camp.lantern.carried, on: G.camp.lantern.on }, fire: { lit: G.camp.fire.lit, fuel: G.camp.fire.fuel }, saved: Date.now() };
  try { localStorage.setItem('fh-save', JSON.stringify(d)); $('#saved').textContent = 'Saved.'; } catch { }
}
function loadSave() { try { const d = JSON.parse(localStorage.getItem('fh-save') || 'null'); return d && d.v === 1 ? d : null; } catch { return null; } }
function restore(d) {
  if (d.dens && G.dens) G.dens.load(d.dens);
  G.day = d.day || 0; G.life.load(d.life); G.weapons.load(d.ammo, d.reserve); G.map.load(d.map); G.stats = d.stats || { taken: {} }; if (d.coins != null) G.coins = d.coins; if (d.health != null) G.health = Math.max(30, d.health); if (G.fishing) G.fishing.load(d.fish); if (G.drone) G.drone.load(d.drone);
  if (d.weather) { G.weather.state = d.weather === 'rain' ? 'cloudy' : 'clear'; G.weather.roll(); Object.assign(G.weather.cur, G.weather.tgt); }
  if (d.fire) { G.camp.fire.lit = d.fire.lit; G.camp.fire.fuel = d.fire.fuel; }
  if (d.lantern) { G.camp.lantern.on = d.lantern.on; if (d.lantern.carried) carryLantern(true); }
  if (d.gun && GUNS[d.gun]) G.weapons.select(d.gun);
}
addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
addEventListener('pagehide', saveGame);
function drawContinue() {
  const d = loadSave(), b = $('#continue'); if (!d) { b.hidden = true; return; }
  b.hidden = false; b.innerHTML = `Continue &middot; <small>${SPAWNS[d.spawn] || 'Your camp'}, day ${(d.day || 0) + 1}</small>`;
}

// ---------- touch ----------
{
  const T = $('#touch');
  T.addEventListener('touchstart', e => {
    const b = e.target.closest('button'); if (!b) return; e.preventDefault(); e.stopPropagation(); audio.start();
    const k = b.dataset.k;
    if (k === 'fire') input.touchFire = true;
    else if (k === 'aim') { input.touchAim = !input.touchAim; b.classList.toggle('on', input.touchAim); }
    else if (k === 'run') { input.runLatch = !input.runLatch; b.classList.toggle('on', input.runLatch); }
    else if (k === 'weapon') G.weapons.cycle(1);
    else if (k === 'drone') input.press('KeyG');
    else if (k === 'help') toggleHelp();
    else if (k === 'eat') eat();
    else if (k === 'Escape') { if (G.state === 'play') pause(true); else if (G.state === 'ui') input.press('Escape'); }
    else if (k === 'KeyC') { input.press(k); b.classList.toggle('on'); }
    else input.press(k);
  }, { passive: false });
}
{
  const D = $('#drone .dtouch');
  D.addEventListener('touchstart', e => { const b = e.target.closest('button'); if (!b) return; e.preventDefault(); const d = b.dataset.d;
    if (d === 'land') G.drone.landReq = true; else if (d === 'up') G.drone.up = 1; else if (d === 'down') G.drone.up = -1; else if (d === 'nv') G.drone.setVision(!G.drone.nv); else if (d === 'pin') input.touchFire = true; else if (d === 'back') input.press('KeyG'); }, { passive: false });
  const stop = e => { const b = e.target.closest('button'); if (b && (b.dataset.d === 'up' || b.dataset.d === 'down')) G.drone.up = 0; };
  D.addEventListener('touchend', stop); D.addEventListener('touchcancel', stop);
}
function drawStick() {
  const s = $('#stick'), m = input.touch.move;
  if (!m || !input.isTouch) { s.style.display = 'none'; return; }
  s.style.display = 'block'; s.style.left = m.x0 + 'px'; s.style.top = m.y0 + 'px';
  const dx = m.x - m.x0, dy = m.y - m.y0, l = Math.hypot(dx, dy), k = Math.min(1, 50 / Math.max(l, 1));
  s.firstElementChild.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
}

// ---------- settings ----------
{
  const vol = $('#vol'), sens = $('#sens'); vol.value = G.settings.vol; sens.value = G.settings.sens; audio.setVolume(G.settings.vol);
  vol.addEventListener('input', () => { G.settings.vol = +vol.value; audio.setVolume(G.settings.vol); saveSettings(); });
  sens.addEventListener('input', () => { G.settings.sens = +sens.value; saveSettings(); });
}

// ---------- menus ----------
function pause(on) {
  if (on && G.state === 'play') { G.state = 'pause'; $('#pause').hidden = false; input.unlock(); saveGame(); }
  else if (!on && G.state === 'pause') { G.state = 'play'; $('#pause').hidden = true; G.wasLocked = false; input.lock(); }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
  if (a === 'spawn') start({ spawn: b.dataset.spawn });
  if (a === 'resume') pause(false);
  if (a === 'quality') { G.settings.quality = b.dataset.q; G.settings.qualityAuto = false; saveSettings(); drawSettings(); applyQuality(); }
  if (a === 'quit') { saveGame(); location.href = location.pathname + location.hash; }
  if (a === 'continue') { const d = loadSave(); if (d) start({ spawn: d.spawn, seed: d.seed, camp: d.camp, player: d.player, hours: d.hours, restore: d }); }
});
canvas.addEventListener('click', () => { if (G.state === 'play' && !input.locked && !input.isTouch) input.lock(); });
function drawSettings() { for (const b of document.querySelectorAll('[data-act=quality]')) b.classList.toggle('on', b.dataset.q === G.settings.quality); }
function applyQuality() {
  resize(); G.post.setQuality(G.settings.quality); if (!G.terrain) return; const q = QUALITY[G.settings.quality];
  G.terrain.setRadius(q.nearR, q.farR); G.flora.set(q.veg); G.grass.build(q.grass); G.sky.setShadowQuality(q.shadow, q.span); G.wildlife.furN = q.fur;
}
drawSettings(); drawContinue();

// test hooks
window.__fh = { G, THREE, start, scene, camera, renderer, input, hold: on => { G.hold = on; },
  // run frames by hand and grab the picture (for headless tests)
  tick: (frames = 1, dt = 1 / 30) => { G.noRender = true; for (let i = 0; i < frames; i++) step(dt); G.noRender = false; },
  snap: (frames = 1, dt = 1 / 30) => { for (let i = 0; i < frames; i++) step(dt); return renderer.domElement.toDataURL('image/jpeg', 0.92); },
  look: (yaw, pitch) => { G.player.yaw = yaw; G.player.pitch = pitch; G.player.applyCamera(); },
  collideTest: (x, z, r) => collide(x, z, r), interact: id => doInteract(G.camp.interact.find(i => i.id === id)), sleep, weather: st => G.weather.set(st), audio, gunCtx, hurt, eat, BOUNTY,
  goto: (x, z, yaw = G.player.yaw, pitch = G.player.pitch) => { G.player.place(x, z, yaw); G.player.pitch = pitch; G.player.applyCamera(); }, setTime: h => { G.sky.hours = h; G.sky.renderEnv(); }, debug: on => { G.debug = on; $('#debug').hidden = !on; } };
if (params.get('debug')) window.__fh.debug(true);
if (params.get('spawn')) start({ spawn: params.get('spawn'), seed: params.get('seed') ? +params.get('seed') : 1234, hours: params.get('t') ? +params.get('t') : undefined });
