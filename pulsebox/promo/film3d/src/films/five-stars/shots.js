// Five Stars: one long Getaway Heat chase, star by star. Every shot places the cars, the threats and the camera
// relative to Jay's car (which sits near z = 0 while the city scrolls past), keyed to the voice lines.
import * as THREE from "three";
import { createGetaway } from "../../sets/getaway.js";
import { createCta } from "../../sets/cta.js";
import { pose } from "../../jay.js";

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function aim(cam, pos, look, fov) { cam.position.copy(pos); cam.lookAt(look); if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); } }
function place(cam, from, to, k, look, lookTo = look, fov = null) { cam.position.lerpVectors(from, to, k); cam.lookAt(new THREE.Vector3().lerpVectors(look, lookTo, k)); if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); } }
function shake(cam, amt, t) { if (!amt) return; cam.position.x += Math.sin(t * 71) * amt; cam.position.y += Math.cos(t * 53) * amt; cam.rotation.z += Math.sin(t * 37) * amt * 0.4; }
const HIDE = new THREE.Vector3(0, -200, 0);

export function makeShots(renderer, tl) {
  const gw = createGetaway(), cta = createCta(), cam = gw.camera;
  const shot = (id) => tl.shots.find((s) => s.id === id), line = (id) => tl.lines.find((l) => l.id === id);
  const at = (id, lt = 0) => shot(id).t0 + lt;
  // the run timer: 3:20 when Jay's time is first said, 4:40 at "four forty", 4:55/56/57 on the count, then real time
  const wordT = (id, i) => line(id).words[Math.min(i, line(id).words.length - 1)].t;
  const keys = [[line("n02").t, 200], [line("n09").t, 280], [wordT("n11", 0), 295], [wordT("n11", 2), 297]];
  const timerAt = (t) => { if (t <= keys[0][0]) return 200 - (keys[0][0] - t); for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])); return 297 + (t - keys[keys.length - 1][0]); };
  const STAR4 = wordT("d01", 6), STAR5 = line("d03").t + 0.2;
  const hud = (t, extra = {}) => { const stars = t >= STAR5 ? 5 : t >= STAR4 ? 4 : 3; return { stars, starsMax: 5, starT: stars === 5 ? STAR5 : stars === 4 ? STAR4 : null, timer: { now: timerAt(t), record: 297 }, ...extra }; };

  // ---- the usual state of the chase: Jay in lane x, three cruisers behind, a little traffic, everything else away
  function base(t, { jx = 1.75, cops = 1, yaw = 0, roll = 0, carY = 0, pitch = 0, steer = 0 } = {}) {
    const jc = gw.jayCar; jc.position.set(jx, carY, 0); jc.rotation.set(pitch, yaw, roll); jc.userData.chassis.position.y = Math.sin(t * 17) * 0.012;
    pose(gw.driver, "sit", t, { lean: 0.1, yaw: steer * 0.3 }); gw.driver.J.shoulder1.rotation.x = gw.driver.J["shoulder-1"].rotation.x = -1.25; gw.driver.J.elbow1.rotation.x = gw.driver.J["elbow-1"].rotation.x = -0.5;
    gw.cops.forEach((c, i) => { c.visible = cops > 0; c.position.set([-1.75, 1.75, -1.75][i] + Math.sin(t * 1.1 + i * 2) * 0.7, 0, (8 + i * 6.5) * cops); c.rotation.set(0, Math.sin(t * 1.1 + i * 2) * 0.07, 0); });
    gw.traffic.forEach((c, i) => { const lane = [-5.25, -1.75, 1.75, 5.25][i % 4], z = (((-30 - i * 23 + t * 14) % 140) + 140) % 140 - 125; c.position.set(lane, 0, z); c.rotation.set(0, 0, 0); c.visible = Math.abs(lane - jx) > 1.5 || z < -14; });
    gw.truck.visible = false; gw.swat.forEach((s) => s.position.copy(HIDE)); gw.block.position.copy(HIDE); gw.ramp.position.copy(HIDE); gw.bus.position.copy(HIDE); gw.heli.position.copy(HIDE); gw.tanks.forEach((k) => k.position.copy(HIDE));
    Object.values(gw.pickups).forEach((p) => p.position.copy(HIDE));
  }
  const dist = (t, extra = 0) => t * 46 + extra;
  function clearView() { gw.traffic.forEach((c) => { if (c.position.distanceTo(cam.position) < 8) c.visible = false; }); }
  const carCam = (h, fov = 46) => aim(cam, V(h.x + 0.2, h.y + 0.13, h.z - 0.8), V(h.x, h.y - 0.04, h.z), fov);
  const driverHead = () => gw.driver.J.head.getWorldPosition(new THREE.Vector3());

  // ---- the tank shot (the hook, and again for real near the end)
  function tankBlast(t, lt, s, { slow = true } = {}) {
    const fire = 0.75, k = lt < fire ? 0 : (lt - fire) * (slow ? 0.38 : 1);
    base(t, { jx: 0.4, cops: 1, pitch: -0.04 });
    const tank = gw.tanks[0]; tank.position.set(2.2, 0, -32 + lt * (lt < fire ? 6 : 1.5)); tank.rotation.y = Math.PI; tank.userData.turret.rotation.y = -0.06; tank.userData.barrel.rotation.x = 0.03;
    tank.userData.flash.scale.setScalar(lt > fire && lt < fire + 0.25 ? 6 : 0.01);
    const boomPos = V(0.9, 0, 4.0), flip = gw.cops[0];
    if (k > 0) { flip.position.set(1.2 + k * 2, 1.2 + k * 9 - 9.8 * k * k * 0.5, 6 + k * 4); flip.rotation.set(k * 4, 0.3, k * 6); }
    gw.update(t, { dist: dist(t), nitro: 1, booms: k > 0 ? [{ t: k, pos: boomPos, s: 1.6 }] : [], spark: k > 0 ? 1 : 0 });
    if (lt < fire + 0.05) { const tp = tank.position; aim(cam, V(tp.x + 0.3, 2.95, tp.z + 0.6 + lt * 0.4), V(0.4, 1.0, 0), 36); shake(cam, lt > fire - 0.05 ? 0.25 : 0.012, t); }
    else { const kk = clamp((lt - fire) / (s.dur - fire)); aim(cam, V(lerp(-1.4, -2.0, kk), lerp(0.65, 0.9, kk), lerp(-5.6, -7.2, kk)), V(0.3, 1.1, 2.2), 58); shake(cam, 0.08 * (1 - kk) + 0.015, t); }
    return { k, fire };
  }

  const S = {
    // ================= HOOK
    "hook"(lt, s, t) {
      const { fire } = tankBlast(t, lt, s); clearView();
      const slams = [{ text: "5 STARS", t: 0.12, until: fire - 0.02, color: "#ffd23d", y: 640 }, { text: "TANK!", t: fire, until: 1.9, color: "#ff3d3d", y: 640, px: 190 }, { text: "17 SECONDS", t: 1.95, until: s.dur + 0.4, color: "#ffffff", y: 640, px: 130 }];
      return { set: gw, fx: { flash: lt > fire && lt < fire + 0.12 ? 0.75 : 0, chroma: lt > fire && lt < fire + 0.4 ? 0.9 : lt > s.dur - 0.2 ? 0.8 : 0, vignette: 0.65 }, state: { stars: 5, starsMax: 5, timer: { now: 280 + lt, record: 297 }, slams } };
    },
    // ================= three stars: the run so far
    "gh-intro"(lt, s, t) {
      if (lt < 0.9) { const hs = shot("hook"), back = Math.max(0, hs.dur - lt * 3.2); const r = S.hook(back, hs, hs.t0 + back); return { ...r, fx: { rewind: 1, rewindText: "2 MINUTES EARLIER", chroma: 0.7 }, state: {} }; }
      const u = lt - 0.9, k = ease(clamp(u / (s.dur - 0.9)));
      base(t, { jx: lerp(1.75, -1.75, ease(clamp((u - 2.5) / 1.2))), steer: Math.sin(u * 2) * 0.5 }); gw.update(t, { dist: dist(t), siren: 1 });
      const j = gw.jayCar.position;
      place(cam, V(j.x + 6, 7.5, j.z - 14), V(j.x + 1.6, 1.6, j.z + 7.5), k, V(j.x, 0.6, j.z), V(j.x, 0.9, j.z - 12), 54); shake(cam, 0.01, t);
      clearView();
      return { set: gw, fx: { flash: clamp(1 - u / 0.3) * 0.6 }, state: hud(t, { world: "Getaway Heat", worldColor: "#ff7a3d", worldT: s.t0 + 0.95 }) };
    },
    "gh-drift"(lt, s, t) {
      const pull = clamp((lt - 0.2) / 1.4), dodge = ease(clamp((lt - 0.9) / 1.0)), back = ease(clamp((lt - 2.2) / 1.0));
      const yaw = Math.sin(dodge * Math.PI) * 0.55 * (1 - back);
      base(t, { jx: lerp(-1.75, 3.2, dodge) - back * 1.4, yaw: -yaw, roll: yaw * 0.08, steer: -yaw * 2 });
      gw.bus.position.set(lerp(-9, -2.6, ease(pull)), 0, -16 + lt * 9); gw.bus.rotation.y = lerp(-1.2, -0.25, ease(pull));
      gw.update(t, { dist: dist(t), smoke: yaw > 0.15 ? 1 : 0 });
      const j = gw.jayCar.position;
      aim(cam, V(j.x - 1.2, 1.0, 6.8), V(j.x * 0.4, 1.1, -10), 58); shake(cam, 0.02, t);
      clearView();
      return { set: gw, state: hud(t) };
    },
    "gh-radio"(lt, s, t) {
      const ram = s.lead - 0.9, hit = lt > ram && lt < ram + 0.5;
      base(t, { jx: 1.75 + (lt > ram ? Math.sin((lt - ram) * 9) * 0.15 * clamp(1 - (lt - ram)) : 0), steer: Math.sin(lt * 3) * 0.4 });
      gw.cops[0].position.set(1.75, 0, lerp(8, 4.7, clamp(lt / ram)) + (lt > ram ? (lt - ram) * 2.5 : 0));
      gw.update(t, { dist: dist(t), spark: hit ? 1 : 0, nitro: lt > ram + 0.2 && lt < ram + 1.4 ? 0.7 : 0 });
      const h = driverHead();
      if (lt < s.lead - 0.15) { const j = gw.jayCar.position; aim(cam, V(j.x + 2.6, 0.7, j.z + 3.2), V(j.x, 0.8, j.z + 4), 50); shake(cam, hit ? 0.08 : 0.015, t); }
      else carCam(h);
      clearView();
      return { set: gw, state: hud(t) };
    },
    // ================= four stars: SWAT
    "gh-swat"(lt, s, t) {
      const L = s.L("n03"), come = clamp((lt - L + 0.3) / 1.6), hit = lt > L + 1.25;
      base(t, { jx: 1.75 + (hit ? Math.min(1.6, (lt - L - 1.25) * 4) : 0), roll: hit ? -0.06 : 0, steer: hit ? -0.8 : 0.2 });
      const sw = gw.swat[0]; sw.position.set(lerp(-14, -1.2 + (hit ? Math.min(1.6, (lt - L - 1.25) * 4) : 0), ease(come)), 0, lerp(-8, 0.4, ease(come))); sw.rotation.y = lerp(-1.3, -0.1, ease(come));
      gw.update(t, { dist: dist(t), spark: hit && lt < L + 1.9 ? 1 : 0 });
      const h = driverHead();
      if (lt < L - 0.1) { pose(gw.driver, "sit", t, { fear: 0.6, yaw: -0.5 }); carCam(h); }
      else { const j = gw.jayCar.position; aim(cam, V(j.x + 4.5, 2.4, j.z - 7.5), V(j.x - 1.0, 0.9, j.z), 56); shake(cam, hit ? 0.1 * clamp(1 - (lt - L - 1.25)) : 0.02, t); }
      clearView();
      return { set: gw, fx: { flash: hit && lt < L + 1.35 ? 0.4 : 0 }, state: hud(t) };
    },
    "gh-shield"(lt, s, t) {
      const grab = 0.55, ram = s.lead - 0.35, bounce = lt > ram ? lt - ram : -1;
      base(t, { jx: 2.2, steer: 0.1 });
      const pk = gw.pickups.shield; if (lt < grab) pk.position.set(2.2, 1.0, -9 + lt * 16); else pk.position.copy(HIDE);
      const sw = gw.swat[1], come = clamp((lt - grab) / (ram - grab));
      if (bounce < 0) { sw.position.set(lerp(9, 3.4, ease(come)), 0, lerp(-6, 0.3, ease(come))); sw.rotation.y = lerp(1.2, 0.25, ease(come)); }
      else { const b = bounce; sw.position.set(3.4 + b * 9, Math.max(0, b * 5 - 9.8 * b * b * 0.6), 0.3 + b * 6); sw.rotation.set(b * 1.5, 0.25 + b * 2, b * 2.5); }
      gw.update(t, { dist: dist(t), shield: lt > grab ? 1 : 0, booms: bounce > 0.45 ? [{ t: bounce - 0.45, pos: sw.position.clone().setY(0), s: 1.2 }] : [] });
      const j = gw.jayCar.position;
      aim(cam, V(j.x - 3.4, 2.1, j.z - 6.2), V(j.x + 1.0, 0.9, j.z), 56); shake(cam, bounce > 0 && bounce < 0.6 ? 0.1 : 0.015, t);
      clearView();
      return { set: gw, fx: { flash: bounce > 0 && bounce < 0.12 ? 0.6 : 0 }, state: hud(t, { pop: { text: "+SHIELD", color: "#3da5ff", t: at("gh-shield", grab) } }) };
    },
    // ================= the roadblock and the ramp
    "gh-block"(lt, s, t) {
      const k = ease(clamp(lt / s.dur)), bz = lerp(-120, -46, k);
      base(t, { jx: 1.75, cops: 1.3 }); gw.block.position.set(0, 0, bz); gw.ramp.position.set(5.0, 0, bz + 10);
      gw.update(t, { dist: dist(t), shield: 0.35 });
      const j = gw.jayCar.position;
      aim(cam, V(j.x - 0.6, 6.5, j.z + 9), V(1.5, 0, bz + 6), 54); shake(cam, 0.01, t);
      clearView();
      return { set: gw, state: hud(t) };
    },
    "gh-ramp"(lt, s, t) {
      const k = clamp(lt / s.dur), bz = lerp(-30, -12, k);
      base(t, { jx: lerp(1.75, 5.0, ease(k)), steer: 0.6 }); gw.block.position.set(0, 0, bz); gw.ramp.position.set(5.0, 0, bz + 10);
      gw.update(t, { dist: dist(t), nitro: ease(k) });
      const h = driverHead();
      if (lt < s.dur * 0.55) carCam(h);
      else { const j = gw.jayCar.position; aim(cam, V(j.x - 0.6, 0.55, j.z + 5.2), V(j.x, 1.2, j.z - 12), 60); shake(cam, 0.03, t); }
      clearView();
      return { set: gw, state: hud(t, { pop: { text: "NITRO!", color: "#3de0ff", t: at("gh-ramp", s.dur * 0.55) } }) };
    },
    "gh-air"(lt, s, t) {   // slow motion over the roadblock
      const u = lt * 0.42, air = clamp(u / 1.25), y = 2.6 + 6.5 * air - 6.5 * air * air * 1.15, land = air >= 1;
      base(t, { jx: 5.0 - air * 3.4, carY: land ? Math.max(0, y) : Math.max(0, y), pitch: land ? 0 : 0.18 - air * 0.4, roll: -air * 0.15 });
      gw.block.position.set(0, 0, 3.5 - u * 6); gw.ramp.position.set(5.0, 0, 14 - u * 6);
      gw.update(t, { dist: dist(t, 0), nitro: 1, spark: land ? 1 : 0 });
      const j = gw.jayCar.position, orbit = lerp(-1.2, 0.9, ease(clamp(lt / s.dur)));
      aim(cam, V(clamp(j.x + Math.sin(orbit) * 5.8, -6, 6), j.y + 1.0, j.z + Math.cos(orbit) * 5.8), V(j.x, j.y - 0.4, j.z), 56); clearView();
      return { set: gw, fx: { vignette: 0.7 }, state: hud(t) };
    },
    // ================= five stars: the helicopter, the EMP
    "gh-heli"(lt, s, t) {
      const k = ease(clamp(lt / s.dur));
      base(t, { jx: 1.75, steer: Math.sin(lt * 2) * 0.4 });
      const heli = gw.heli; heli.position.set(lerp(14, 3.5, ease(clamp(lt / 2.2))), lerp(22, 10, ease(clamp(lt / 2.2))), lerp(-30, 6, ease(clamp(lt / 2.6)))); heli.rotation.set(0.18, Math.PI + 0.3, Math.sin(lt) * 0.1);
      heli.userData.aim(gw.jayCar.position.clone().add(V(0, 0.5, 0)));
      gw.update(t, { dist: dist(t) });
      const j = gw.jayCar.position;
      place(cam, V(j.x - 3, 0.7, j.z - 9), V(j.x - 2.2, 0.9, j.z - 7), k, V(j.x + 1, 6, j.z), V(heli.position.x * 0.6, heli.position.y * 0.6, heli.position.z * 0.5), 60); shake(cam, 0.02, t);
      clearView();
      return { set: gw, state: hud(t) };
    },
    "gh-emp"(lt, s, t) {
      const grab = 0.6;
      base(t, { jx: 1.75 }); const pk = gw.pickups.emp; if (lt < grab) pk.position.set(1.75, 1.0, -10 + lt * 17); else pk.position.copy(HIDE);
      gw.heli.position.set(3.0, 9.5, 7); gw.heli.rotation.set(0.18, Math.PI + 0.3, 0); gw.heli.userData.aim(gw.jayCar.position.clone());
      gw.update(t, { dist: dist(t) });
      const h = driverHead();
      if (lt < grab + 0.4) { const j = gw.jayCar.position; aim(cam, V(j.x + 0.4, 1.6, j.z + 6.5), V(j.x, 1.0, j.z - 8), 56); }
      else { pose(gw.driver, "sit", t, { lean: 0.2, yaw: 0.1 }); gw.driver.J.shoulder1.rotation.x = -1.6; carCam(h); }
      clearView();
      return { set: gw, state: hud(t, { pop: { text: "+EMP", color: "#b56bff", t: at("gh-emp", grab) } }) };
    },
    "gh-crash"(lt, s, t) {
      const e = lt - 0.15, dead = e > 0.35, fall = Math.max(0, e - 0.5);
      base(t, { jx: 1.75, cops: 1 + (dead ? Math.min(3, (e - 0.35) * 2.2) : 0) });
      const heli = gw.heli; heli.position.set(3.0 + fall * 2, Math.max(0.5, 9.5 - fall * fall * 4.5), 7 + fall * 6); heli.rotation.set(0.18 + fall * 0.5, Math.PI + 0.3 + fall * 4.5, fall * 0.8);
      heli.userData.light.intensity = dead ? 0 : 300; heli.userData.beam.visible = !dead; if (!dead) heli.userData.aim(gw.jayCar.position.clone());
      const crashT = fall > 0 && 9.5 - fall * fall * 4.5 <= 0.6 ? fall - Math.sqrt(8.9 / 4.5) : -1;
      gw.update(t, { dist: dist(t), siren: dead ? 0 : 1, emp: { t: e, pos: gw.jayCar.position.clone().setY(0.8) }, booms: crashT >= 0 ? [{ t: crashT, pos: heli.position.clone().setY(0), s: 2.2 }] : [] });
      const j = gw.jayCar.position;
      aim(cam, V(j.x - 4, 3.2, j.z - 11), V(j.x + 1, 2.5, j.z + 8), 62); shake(cam, crashT >= 0 && crashT < 0.6 ? 0.15 : e > 0 && e < 0.3 ? 0.06 : 0.01, t);
      clearView();
      return { set: gw, fx: { flash: e > 0 && e < 0.1 ? 0.5 : crashT >= 0 && crashT < 0.1 ? 0.5 : 0 }, state: hud(t) };
    },
    // ================= the tank
    "gh-tank"(lt, s, t) {
      const L = s.L("n09"), out = ease(clamp((lt - L - 2.6) / 1.6)), jay = s.L("j04");
      base(t, { jx: 0.4, steer: 0.2 });
      const tank = gw.tanks[0]; tank.position.set(lerp(-16, 2.2, out), 0, -34 + lt * 0.8); tank.rotation.y = lerp(Math.PI / 2, Math.PI, out); tank.userData.turret.rotation.y = lerp(1.2, -0.06, ease(clamp((lt - jay) / 1.2)));
      gw.update(t, { dist: dist(t) });
      const h = driverHead(), j = gw.jayCar.position;
      if (lt < jay - 0.1) aim(cam, V(j.x - 0.8, 1.7, j.z + 6.5), V(1.0, 1.5, -30), 50);
      else if (lt < jay + line("j04").edur + 0.1) { pose(gw.driver, "sit", t, { fear: 1, noBlink: true }); carCam(h); }
      else { const tp = tank.position; aim(cam, V(tp.x + 1.1, 3.9, tp.z - 3.2), V(0.4, 0.9, 0), 46); }
      clearView();
      return { set: gw, state: hud(t) };
    },
    "gh-blast"(lt, s, t) {
      const { fire } = tankBlast(t, lt, s, {}); clearView();
      return { set: gw, fx: { flash: lt > fire && lt < fire + 0.12 ? 0.75 : 0, chroma: lt > fire && lt < fire + 0.4 ? 0.9 : 0, vignette: 0.6 }, state: hud(t, { pop: { text: "NITRO!", color: "#3de0ff", t: at("gh-blast", fire + 0.3) } }) };
    },
    // ================= the record
    "gh-record"(lt, s, t) {
      const rec = wordT("n11", 2), won = t >= rec;
      base(t, { jx: 1.75, cops: 1.6, steer: Math.sin(lt * 2) * 0.3 });
      if (won) { pose(gw.driver, "sit", t, { lean: 0.1 }); gw.driver.J.shoulder1.rotation.set(-2.9, 0, 0.2); gw.driver.J.shoulder1.rotation.x = -2.9 + Math.sin(t * 9) * 0.15; }
      gw.update(t, { dist: dist(t, 0), nitro: won ? 0.6 : 0 });
      const h = driverHead(), j = gw.jayCar.position, k = ease(clamp(lt / s.dur));
      if (lt < s.L("n12") - 0.1) aim(cam, V(j.x + lerp(3.5, 2.5, k), 1.3, j.z - 6.5), V(j.x, 1.0, j.z), 50);
      else aim(cam, V(h.x + 0.3, h.y + 0.05, h.z - 1.0), V(h.x, h.y, h.z), 48);
      const slams = won ? [{ text: "NEW RECORD", t: rec + 0.9, color: "#ffd23d", y: 620, px: 140 }] : [];
      clearView();
      return { set: gw, fx: { flash: t > rec + 0.85 && t < rec + 1.0 ? 0.5 : 0 }, state: hud(t, { slams }) };
    },
    "gh-tank2"(lt, s, t) {
      const k = ease(clamp(lt / 1.8));
      base(t, { jx: 1.75 });
      const t1 = gw.tanks[1]; t1.position.set(lerp(-3, -0.5, k), 0, -24 + lt * 1.2); t1.rotation.y = Math.PI; t1.userData.turret.rotation.y = lerp(0.6, 0.05, k);
      const bb = lt < 0.5 ? [{ t: lt + 0.2, pos: V(-4, 0, -26), s: 1.4 }] : [];
      gw.update(t, { dist: dist(t), booms: bb });
      const j = gw.jayCar.position, h = driverHead();
      if (lt < s.L("n13") + 1.4) aim(cam, V(j.x - 0.8, 1.5, j.z + 6), V(-0.5, 1.8, -24), 48);
      else { pose(gw.driver, "sit", t, { fear: 1, noBlink: true }); carCam(h); }
      clearView();
      return { set: gw, fx: { red: 0.06, black: clamp((lt - (s.dur - 0.3)) / 0.28) }, state: hud(t) };
    },
    // ================= Pulsebox
    "cta"(lt, s, t) {
      const L = s.L("n14"), pop = clamp((lt - L) / 0.35) * clamp((L + 0.7 - lt) / 0.35);
      cta.update(lt, { spin: lt * 0.32, pop, show78: 0 });
      const L3 = s.L("n16"), k = ease(clamp(lt / L3)), k2 = ease(clamp((lt - L3) / (s.dur - L3))), a = lerp(0.55, -0.35, k) - k2 * 0.2, r = lerp(8.2, 7.2, k) - k2 * 1.4;
      aim(cta.camera, V(Math.sin(a) * r, lerp(2.2, 2.6, k) + k2 * 0.4, Math.cos(a) * r), V(0, lerp(2.0, 2.3, k) + k2 * 0.5, 0), 42);
      return { set: cta, fx: { flash: clamp(1 - lt / 0.3) * 0.5, vignette: 0.45 }, state: { cta: ctaTimes() } };
    },
  };
  let ctaCache = null;
  function ctaTimes() {
    if (ctaCache) return ctaCache;
    const a = line("n14"), b = line("n15"), c = line("n16"), wt = (l, re) => (l.words.find((w) => re.test(w.w)) || l.words[0]).t;
    return (ctaCache = { t17: a.t, tFree: wt(a, /^77|free/i), genres: [/racing/i, /horror/i, /heists/i, /sports/i].map((re) => wt(a, re)), t18: b.t + 0.2, tPc: wt(b, /^play/i), t19: c.t });
  }
  const route = (sh, lt, t) => (S[sh.id] || S["gh-intro"])(lt, sh, t);
  route.sets = { gw, cta };
  return route;
}
