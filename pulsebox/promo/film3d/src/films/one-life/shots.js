// One Life: every shot (set, camera, animation, overlay effects and HUD), keyed to the voice lines.
import * as THREE from "three";
import { createBedroom } from "../../sets/bedroom.js";
import { createStreet } from "../../sets/street.js";
import { createMotel } from "../../sets/motel.js";
import { createRooftops, runnerAt, ROOFS } from "../../sets/rooftops.js";
import { createCta } from "../../sets/cta.js";
import { pose } from "../../jay.js";

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function place(cam, from, to, k, look, lookTo = look, fov = null) {
  cam.position.lerpVectors(from, to, k); cam.lookAt(new THREE.Vector3().lerpVectors(look, lookTo, k));
  if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
}
function aim(cam, pos, look, fov) { cam.position.copy(pos); cam.lookAt(look); if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); } }
function shake(cam, amt, t) { if (!amt) return; cam.position.x += Math.sin(t * 71) * amt; cam.position.y += Math.cos(t * 53) * amt; cam.rotation.z += Math.sin(t * 37) * amt * 0.3; }
const lightningAt = (t, seeds) => seeds.reduce((m, s) => Math.max(m, clamp(1 - Math.abs(t - s) / 0.08) * (Math.sin(t * 90) > -0.3 ? 1 : 0.4)), 0);

export function makeShots(renderer, tl) {
  const bed = createBedroom({ headset: true }), st = createStreet(), mo = createMotel(), rf = createRooftops(), cta = createCta();
  const shot = (id) => tl.shots.find((s) => s.id === id), line = (id) => tl.lines.find((l) => l.id === id);
  const headPos = (rig) => rig.J.head.getWorldPosition(new THREE.Vector3());
  const life = (extra = {}) => ({ lives: 1, ...extra });

  // ---- the run across the rooftops: Jay and the crawler at distance s
  function runners(T, jayS, crawlS, { catchIt = true, crawlerFalls = 0, jayHang = 0, climb = 0 } = {}) {
    const J = runnerAt(jayS, { catchIt }), j = rf.jay.root;
    if (jayHang > 0) {   // hanging off the far edge, then climbing up
      const [a, , y] = ROOFS[5]; const hy = y - 1.18 + climb * 1.2; j.position.set(0, hy, a + 0.32 - climb * 0.6);
      if (climb < 0.6) pose(rf.jay, "hang", T, { fear: 1 }); else pose(rf.jay, "crouch", T, { k: 1 - (climb - 0.6) / 0.4 });
    } else if (J.roof >= 0) { j.position.set(0, J.y, J.z); pose(rf.jay, "run", T, { phase: jayS * 1.35, fear: 0.7 }); }
    else { j.position.set(0, J.y, J.z); pose(rf.jay, "jump", T, { k: clamp(Math.sin(J.air * Math.PI) * 1.6) }); }
    j.rotation.set(0, Math.PI, 0);
    const C = runnerAt(crawlS, { catchIt: false }), c = rf.crawler.root;
    c.position.set(0.3, C.roof >= 0 ? C.y : C.y - crawlerFalls * crawlerFalls * 30, C.z); c.rotation.set(C.roof >= 0 ? 0 : -0.5 - crawlerFalls * 2, 0, crawlerFalls * 1.5);
    rf.crawler.crawl(T, { phase: crawlS * 1.9, jaw: 0.4 + 0.3 * Math.sin(T * 5), rear: C.roof >= 0 ? 0 : 0.6 });
    rf.drone.root.position.set(1.8 + Math.sin(T * 0.8) * 0.6, J.y + 5.2, J.z + 5.5); rf.drone.update(T, j.position.clone().add(V(0, 0.6, 0)));
    rf.update(T, { lightning: lightningAt(T, [1.1, 6.3, 13.2, 19.8, 24.1]), center: j.position });
    return { j: j.position, c: c.position, J, C };
  }
  // ---- the chase: Jay's car, three cruisers
  function cars(T, { jx = 1.8, copGap = 1, truckZ = null, truckTurn = 0, under = 0 } = {}) {
    const jc = st.jayCar; jc.position.set(jx + Math.sin(T * 1.3) * 0.25, 0, 0); jc.rotation.set(0, Math.sin(T * 1.3) * 0.05, 0);
    jc.userData.chassis.position.y = Math.sin(T * 17) * 0.01; jc.userData.chassis.rotation.z = Math.sin(T * 1.3) * 0.02 - under * 0.0;
    if (jc.userData.head) jc.userData.head.rotation.y = Math.sin(T * 2) * 0.2;
    st.cops.forEach((c, i) => { c.position.set([-1.8, 2.2, -0.4][i] + Math.sin(T * 1.1 + i * 2) * 0.6, 0, (7 + i * 5.5) * copGap); c.rotation.y = Math.sin(T * 1.1 + i * 2) * 0.06; });
    st.truck.visible = truckZ !== null; if (truckZ !== null) { st.truck.position.set(-1 + truckTurn * 1, 0, truckZ); st.truck.rotation.y = truckTurn * Math.PI / 2; }
  }

  const S = {
    // ================= HOOK: a flash-forward to the worst moment
    "hook"(lt, s, t) {
      const T = 20 + lt, js = 89 + lt * 6.2, cs = js - 2.9 + Math.sin(lt * 3) * 0.2;
      const { j, c } = runners(T, js, cs);
      const camY = Math.max(j.y, ROOFS[3][2]) + 0.75;
      aim(rf.camera, V(1.45, camY, j.z - 3.9), V(0.1, camY - 0.05, j.z + 1.4), 56); shake(rf.camera, 0.025, lt);
      return { set: rf, fx: { red: 0.04 + 0.05 * Math.max(0, Math.sin(lt * 9)), chroma: lt > s.dur - 0.25 ? 0.9 : 0, vignette: 0.7 }, state: life({ danger: true, game: "GAME 3/3" }) };
    },
    // ================= the bedroom, two hours earlier
    "bed-wide"(lt, s, t) {
      if (lt < 0.95) {   // the hook rewinds
        const hs = shot("hook"), back = hs.dur - lt * 2.6; const r = S.hook(Math.max(0, back), hs, t);
        return { ...r, fx: { ...r.fx, rewind: 1, chroma: 0.7, red: 0 }, state: {} };
      }
      const u = lt - 0.95, k = ease(clamp(u / (s.dur - 0.95)));
      pose(bed.jay, "sit", lt, { lean: 0.2 + k * 0.2 });
      bed.update(lt, { screen: {}, led: 1 });
      place(bed.camera, V(1.45, 2.2, 2.3), V(0.55, 1.62, 0.35), k, V(-0.1, 0.95, -1.4), V(0, 1.18, -1.8), 42);
      return { set: bed, fx: { flash: clamp(1 - u / 0.3) * 0.6 } };
    },
    "bed-screen"(lt, s) {
      const k = ease(clamp(lt / s.dur)), mode = clamp((lt - s.L("n02") - 1.4) / 0.6);
      pose(bed.jay, "sit", lt, { lean: 0.5 });
      bed.update(lt, { screen: { mode }, led: 1 });
      const m = ease(clamp((lt - s.L("n02") - 1.0) / 1.4));
      place(bed.camera, V(lerp(0.55, 0, m), lerp(1.55, 1.19, m), lerp(-0.3, -0.98, m)), V(lerp(0.55, 0, m), lerp(1.5, 1.19, m), lerp(-0.4, -1.08, m)), k * 0.3, V(0, lerp(1.1, 1.18, m), -1.8), V(0, 1.18, -1.8), lerp(42, 52, m));
      return { set: bed, fx: { chroma: mode > 0 && mode < 0.3 ? 0.7 : 0 } };
    },
    "bed-face"(lt, s) {
      pose(bed.jay, "sit", lt, { lean: 0.55, pitch: 0.03, fear: lt > s.L("e01") ? 0.2 : 0 });
      bed.update(lt, { screenRed: true, screen: { mode: 1 }, led: 1 });
      const h = headPos(bed.jay), k = ease(clamp(lt / s.dur));
      place(bed.camera, V(h.x + 0.36, h.y + 0.03, h.z - 1.05), V(h.x + 0.2, h.y + 0.02, h.z - 0.82), k, V(h.x, h.y - 0.1, h.z), V(h.x, h.y - 0.06, h.z), 50);
      return { set: bed };
    },
    "bed-dive"(lt, s) {
      const L = s.L("n04"), click = L + 0.5, dark = clamp((lt - L - 1.0) / 0.25), k = clamp((lt - L - 2.0) / (s.dur - L - 2.0));
      pose(bed.jay, "sit", lt, { lean: 0.6, click: clamp((lt - click) / 0.25), fear: dark * 0.6 });
      bed.update(lt, { screenRed: true, screenBright: dark > 0 ? Math.max(0.02, k * 6) : 1, room: 1 - dark * 0.92, led: dark > 0 ? 0 : 1, screen: { mode: 1, press: lt > click ? 1 : 0, black: dark * (1 - k) } });
      { const q = Math.pow(k, 1.8), a = V(0.75, 1.55, 0.25), b = V(0.5, 1.4, -1.1), c = V(0, 1.18, -1.76);
        bed.camera.position.copy(a.clone().multiplyScalar((1 - q) * (1 - q)).add(b.clone().multiplyScalar(2 * (1 - q) * q)).add(c.clone().multiplyScalar(q * q)));
        bed.camera.lookAt(0, 1.18, -1.8); bed.camera.fov = lerp(40, 75, q); bed.camera.updateProjectionMatrix(); }
      return { set: bed, fx: { flash: clamp((lt - (s.dur - 0.35)) / 0.3), chroma: k } };
    },
    // ================= GAME 1: Getaway Heat
    "gh-chase"(lt, s, t) {
      const T = lt, dist = T * 46; cars(T, {}); st.update(T, { dist });
      const j = st.jayCar.position, k = ease(clamp(lt / s.dur));
      aim(st.camera, V(j.x - 1.4 + k * 0.6, lerp(0.75, 1.1, k), j.z - lerp(5.2, 6.2, k)), V(j.x + 0.1, 0.95, j.z + 6), 50); shake(st.camera, 0.015, lt);
      return { set: st, fx: { flash: clamp(1 - lt / 0.4) * 0.8 }, state: life({ world: "Getaway Heat", worldColor: "#ff7a3d", worldT: s.t0 + 0.2, stars: 3, game: "GAME 1/3" }) };
    },
    "gh-empty"(lt, s, t) {
      const T = 6 + lt, dist = T * 46; cars(T, {}); st.update(T, { dist });
      const c = st.cops[0].position, k = ease(clamp(lt / s.dur));
      aim(st.camera, V(c.x - lerp(1.55, 1.3, k), 1.32, c.z - lerp(1.1, 0.8, k)), V(c.x - 0.4, 1.02, c.z - 0.2), 42); shake(st.camera, 0.008, lt);
      return { set: st, fx: { red: Math.sin(T * 22) > 0 ? 0.05 : 0 }, state: life({ stars: 3, game: "GAME 1/3" }) };
    },
    "gh-truck"(lt, s, t) {
      const T = 9 + lt, dist = T * 46, turn = ease(clamp((lt - 0.4) / 1.1)), tz = -78 + lt * 30;
      cars(T, { jx: 0.6, truckZ: tz, truckTurn: turn }); st.update(T, { dist });
      const j = st.jayCar.position;
      aim(st.camera, V(j.x + 0.5, 1.7, j.z + 6.2), V(j.x * 0.3, 1.6, tz + 4), 56); shake(st.camera, 0.02 + turn * 0.03, lt);
      return { set: st, state: life({ stars: 3, game: "GAME 1/3", danger: true }) };
    },
    "gh-under"(lt, s, t) {
      const T = 9 + shot("gh-truck").dur + lt * 0.35, dist = T * 46, slide = clamp(lt / (s.dur - 0.3));
      cars(T, { jx: 0.2, truckZ: lerp(-5, 7, slide), truckTurn: 1, under: 1 }); st.update(T, { dist, spark: slide > 0.25 && slide < 0.8 ? 1 : 0 });
      st.jayCar.rotation.y = 0.35;   // sliding sideways
      aim(st.camera, V(3.3, 1.05, 1.6), V(0, 0.95, -0.6), 52);
      return { set: st, fx: { flash: clamp((lt - (s.dur - 0.3)) / 0.28) }, state: life({ stars: 3, game: "GAME 1/3" }) };
    },
    // ================= GAME 2: Lights Out Motel
    "lm-desk"(lt, s, t) {
      pose(mo.jay, "sit", lt, { lean: 0.15, yaw: Math.sin(lt * 0.6) * 0.2 }); mo.guest.root.visible = false; mo.update(lt, {});
      const k = ease(clamp(lt / s.dur));
      place(mo.camera, V(-2.6, 1.5, -9.5), V(-0.7, 1.55, -4.0), k, V(0, 1.55, -1), V(0, 1.5, -1), 40);
      return { set: mo, fx: { flash: clamp(1 - lt / 0.45) }, state: life({ world: "Lights Out Motel", worldColor: "#ff4f7b", worldT: s.t0 + 0.2, game: "GAME 2/3" }) };
    },
    "lm-knock"(lt, s) {
      const walk = clamp(lt / 1.6), knock = lt > 1.7;
      pose(mo.jay, "sit", lt, { lean: 0.1, fear: knock ? 0.5 : 0, yaw: 0 });
      mo.guest.root.visible = true; mo.guest.root.position.set(lerp(-1.9, 0, ease(walk)), 0, mo.WZ - 0.75);
      if (walk < 1) pose(mo.guest, "walk", lt, { phase: lt * 4 }); else pose(mo.guest, "stand", lt, { noBlink: true });
      if (knock) { mo.guest.J.shoulder1.rotation.x = -2.3; mo.guest.J.elbow1.rotation.x = -0.9 - Math.max(0, Math.sin((lt - 1.7) * 18)) * 0.4; }
      mo.update(lt, {});
      const k = ease(clamp(lt / s.dur));
      place(mo.camera, V(0.55, 1.62, mo.WZ + 2.05), V(0.45, 1.6, mo.WZ + 1.85), k, V(-0.1, 1.35, mo.WZ - 0.75), V(0, 1.35, mo.WZ - 0.75), 44);
      return { set: mo, state: life({ game: "GAME 2/3" }) };
    },
    "lm-window"(lt, s) {
      pose(mo.jay, "sit", lt, {}); mo.guest.root.visible = true; mo.guest.root.position.set(0, 0, mo.WZ - 0.75);
      pose(mo.guest, "stand", lt, { noBlink: true, tilt: 0.04, pupil: 1.15, pitch: 0.05 }); mo.guest.J.mouth.scale.y = 1 + Math.max(0, Math.sin(lt * 14)) * 1.5;
      mo.update(lt, {});
      const h = headPos(mo.guest), k = ease(clamp(lt / s.dur));
      place(mo.camera, V(0.12, h.y + 0.08, mo.WZ + 1.0), V(0.08, h.y + 0.05, mo.WZ + 0.7), k, V(h.x, h.y - 0.12, h.z), V(h.x, h.y - 0.08, h.z), 34);
      return { set: mo, state: life({ game: "GAME 2/3" }) };
    },
    "lm-jay"(lt, s) {
      pose(mo.jay, "sit", lt, { lean: -0.05, fear: lt > s.L("m03") ? 1 : 0.6, noBlink: true, pitch: 0.05 }); mo.guest.root.visible = true; pose(mo.guest, "stand", lt, { noBlink: true });
      mo.update(lt, {}); if (mo.jay.J.led) mo.jay.J.led.material.color.set(Math.sin(lt * 8) > 0 ? 0x3dff7a : 0x0a3a1a);
      const h = headPos(mo.jay), k = ease(clamp(lt / s.dur));
      place(mo.camera, V(h.x - 0.28, h.y + 0.02, h.z - 0.95), V(h.x - 0.18, h.y + 0.01, h.z - 0.75), k, V(h.x, h.y - 0.08, h.z), V(h.x, h.y - 0.05, h.z), 44);
      return { set: mo, state: life({ game: "GAME 2/3", danger: true }) };
    },
    "lm-wrong"(lt, s) {
      const smile = ease(clamp((lt - 0.3) / 1.4)) * 0.7, pupil = 1 + ease(clamp((lt - 0.8) / 1.5)) * 0.9;
      pose(mo.jay, "sit", lt, { fear: 1 }); mo.guest.root.visible = true;
      pose(mo.guest, "stand", lt, { noBlink: true, smile, pupil, tilt: 0.04 + ease(clamp((lt - 1.5) / 2)) * 0.28 });
      mo.update(lt, {});
      const h = headPos(mo.guest), k = ease(clamp(lt / s.dur));
      place(mo.camera, V(0.06, h.y + 0.02, mo.WZ + 0.75), V(0.03, h.y + 0.01, mo.WZ + 0.4), k, V(h.x, h.y - 0.07, h.z), V(h.x, h.y - 0.06, h.z), 34);
      return { set: mo, fx: { red: 0.03 + k * 0.05 }, state: life({ game: "GAME 2/3", danger: true }) };
    },
    "lm-shutter"(lt, s) {
      const L = s.L("n12"), shut = easeOut(clamp((lt - L - 0.15) / 0.3)), wide = ease(clamp((lt - L - 0.5) / 1.6));
      pose(mo.jay, "sit", lt, { fear: 1, lean: -0.1 }); mo.jay.J.shoulder1.rotation.x = -2.6 * (1 - shut * 0.6); mo.jay.J.elbow1.rotation.x = -0.4;
      pose(mo.guest, "stand", lt, { noBlink: true, smile: 0.7 + wide * 1.9, pupil: 1.9, tilt: 0.32 + wide * 0.2 });
      const slam = lt > L + 2.6, lampOn = lt > s.dur - 0.5 ? 0 : (slam && Math.sin(lt * 40) > 0 ? 0.2 : 1);
      mo.update(lt, { shut: lt > L + 2.4 ? 1 : Math.min(shut, 0.62), lampOn });
      const k = ease(clamp(lt / s.dur));
      place(mo.camera, V(0.5, 1.5, mo.WZ + 1.9), V(0.3, 1.4, mo.WZ + 1.35), k, V(0, 1.22, mo.WZ - 0.6), V(0, 1.22, mo.WZ - 0.6), 40); shake(mo.camera, slam ? 0.05 : shut > 0 && shut < 1 ? 0.03 : 0, lt);
      return { set: mo, fx: { black: lt > s.dur - 0.45 ? 0.96 : 0, red: slam ? 0.12 : 0 }, state: life({ game: "GAME 2/3", danger: true }) };
    },
    // ================= GAME 3: Rooftop Rush
    "rr-run"(lt, s, t) {
      const T = lt, js = 4 + lt * 8; const { j } = runners(T, js, -30);
      aim(rf.camera, V(1.6, j.y + 1.7, j.z + 3.8), V(0, j.y + 0.8, j.z - 3), 54); shake(rf.camera, 0.012, lt);
      return { set: rf, fx: { flash: clamp(1 - lt / 0.5) * 0.7 }, state: life({ world: "Rooftop Rush", worldColor: "#ffb23f", worldT: s.t0 + 0.2, game: "GAME 3/3" }) };
    },
    "rr-crawl"(lt, s, t) {
      const T = 5 + lt, j0 = 4 + shot("rr-run").dur * 8, js = j0 + lt * 8.2, climb = clamp(lt / 1.2), cs = js - 9 + lt * 1.3;
      const { j, c } = runners(T, js, cs);
      if (climb < 1) { rf.crawler.root.position.y -= (1 - climb) * 1.4; rf.crawler.crawl(T, { rear: 1 - climb, jaw: 0.9, lookUp: 1 - climb }); }
      aim(rf.camera, V(-2.4, c.y + 1.4, c.z + 3.4), V(0.2, c.y + 0.6, c.z - 3), 54); shake(rf.camera, 0.02, lt);
      return { set: rf, state: life({ game: "GAME 3/3", danger: true }) };
    },
    "rr-gap"(lt, s, t) {
      const T = 12 + lt, js = 107.6 - (s.dur - lt) * 8, cs = js - 3.6; const { j } = runners(T, js, cs);
      const [, edge, ey] = ROOFS[4];
      aim(rf.camera, V(1.4, ey + 3.0, j.z + 4.6), V(0, ey - 3.5, edge - 6), 56); shake(rf.camera, 0.015, lt);
      return { set: rf, state: life({ game: "GAME 3/3", danger: true }) };
    },
    "rr-leap"(lt, s, t) {
      const T = 12 + shot("rr-gap").dur + lt * 0.25, js = Math.min(113.3, 108.2 + (lt / s.dur) * 4.6), cs = 104.8 + (lt / s.dur) * 3.0;
      const { j } = runners(T, js, cs);
      aim(rf.camera, V(4.0, j.y + 0.3, j.z + 2.3), V(0, j.y + 0.45, j.z - 0.6), 56);
      return { set: rf, fx: { vignette: 0.75 }, state: life({ game: "GAME 3/3", danger: true }) };
    },
    "rr-catch"(lt, s, t) {
      const hold = s.L("n16") - 0.15;
      if (lt < hold) { const lp = shot("rr-leap"); return S["rr-leap"](lp.dur + lt * 0.6, lp, t); }   // still in the air, in slow motion
      lt -= hold;
      const T = 20 + lt, fall = clamp((lt - 0.2) / 1.6);
      const r = runners(T, 113, 108.2 + lt * 2.6, { crawlerFalls: fall, jayHang: 1, climb: 0 });
      const [a, , y] = ROOFS[5];
      aim(rf.camera, V(0.95, y + 0.85, a - 1.05), V(0, y - 0.45, a + 0.35), 56); shake(rf.camera, lt < 0.25 ? 0.05 : 0.005, lt);
      return { set: rf, state: life({ game: "GAME 3/3", danger: true }) };
    },
    "rr-win"(lt, s, t) {
      const T = 23 + lt, climb = clamp(lt / 0.9), run = clamp((lt - 0.9) / (s.dur - 0.9));
      const [a, , y] = ROOFS[5];
      if (climb < 1) runners(T, 113, 60, { jayHang: 1, climb });
      else { runners(T, 113 + 1 + run * 10, 60); }
      rf.crawler.root.visible = false;
      aim(rf.camera, V(1.6, y + 1.3, a - 14), V(0, y + 1.0, a - 3), 50);
      const banner = lt > 1.2 ? { text: "RUN COMPLETE", color: "#c6ff3d", t: s.t0 + 1.2 } : null;
      return { set: rf, fx: { flash: clamp((lt - (s.dur - 0.35)) / 0.3) }, state: life({ game: "GAME 3/3", banner }) };
    },
    // ================= home
    "bed-dawn"(lt, s) {
      rf.crawler.root.visible = true;
      const wake = clamp(lt / 2.2); pose(bed.jay, "slumped", lt, { wake });
      bed.update(lt, { dawn: 1, screen: {}, led: 1 });
      const k = ease(clamp(lt / s.dur));
      place(bed.camera, V(1.7, 1.5, 0.9), V(1.2, 1.35, 0.35), k, V(0, 0.95, -1.1), V(0, 1.05, -1.4), 42);
      return { set: bed, fx: { flash: clamp(1 - lt / 0.7) } };
    },
    "bed-phone"(lt, s) {
      const ring = lt < s.L("j04") - 0.2 ? 1 : 0, up = clamp((lt - (s.L("j04") - 0.5)) / 0.4);
      if (up > 0) pose(bed.jay, "phone", lt, { fear: lt > s.L("p01") + 1 ? 0.7 : 0 }); else pose(bed.jay, "sit", lt, { lean: 0.2 });
      bed.update(lt, { dawn: 0.85, screen: {}, ring, led: 1 });
      if (up > 0) { const hnd = bed.jay.J.hand1.getWorldPosition(new THREE.Vector3()); bed.phone.position.copy(hnd); bed.phone.rotation.set(1.3, 0, 0.3); } else { bed.phone.position.set(-0.72, 0.795, -1.42); bed.phone.rotation.set(0, 0.3, 0); }
      const h = headPos(bed.jay), k = ease(clamp(lt / s.dur));
      place(bed.camera, V(h.x - 0.55, h.y + 0.05, h.z - 1.2), V(h.x - 0.4, h.y + 0.03, h.z - 0.95), k, V(h.x, h.y - 0.12, h.z), V(h.x, h.y - 0.08, h.z), 46);
      return { set: bed };
    },
    "bed-headset"(lt, s) {
      pose(bed.jay, "phone", lt, { fear: 1, noBlink: true });
      bed.update(lt, { dawn: 0.6, screen: {}, led: Math.sin(lt * 6) > 0 ? 2 : 0 });
      const hnd = bed.jay.J.hand1.getWorldPosition(new THREE.Vector3()); bed.phone.position.copy(hnd); bed.phone.rotation.set(1.3, 0, 0.3);
      const h = headPos(bed.jay), k = ease(clamp(lt / s.dur));
      place(bed.camera, V(h.x + 0.3, h.y + 0.05, h.z - 1.05), V(h.x + 0.22, h.y + 0.03, h.z - 0.82), k, V(h.x + 0.05, h.y - 0.05, h.z), V(h.x + 0.06, h.y - 0.04, h.z), 46);
      return { set: bed, fx: { red: 0.04 } };
    },
    "bed-door"(lt, s) {
      pose(bed.jay, "sit", lt, { fear: 1, yaw: 0.9, noBlink: true });
      bed.update(lt, { dawn: 0, room: 0.35, screenBright: 0.1, screen: { black: 0.9 }, led: 2, doorGap: 0.9, feet: lt > 0.6 ? 1 : 0 });
      const k = ease(clamp(lt / s.dur));
      place(bed.camera, V(1.2, 0.35, -1.25), V(1.75, 0.28, -1.28), k, V(2.6, 0.25, -1.3), V(2.6, 0.2, -1.3), 46);
      return { set: bed, fx: { black: clamp((lt - (s.dur - 0.3)) / 0.25), vignette: 0.8 } };
    },
    // ================= Pulsebox
    "cta"(lt, s, t) {
      const L = s.L("n20"), pop = clamp((lt - L) / 0.35) * clamp((L + 0.7 - lt) / 0.35);
      cta.update(lt, { spin: lt * 0.32, pop, show78: 0 });
      const L3 = s.L("n22"), k = ease(clamp(lt / L3)), k2 = ease(clamp((lt - L3) / (s.dur - L3))), a = lerp(0.55, -0.35, k) - k2 * 0.2, r = lerp(8.2, 7.2, k) - k2 * 1.4;
      aim(cta.camera, V(Math.sin(a) * r, lerp(2.2, 2.6, k) + k2 * 0.4, Math.cos(a) * r), V(0, lerp(2.0, 2.3, k) + k2 * 0.5, 0), 42);
      return { set: cta, fx: { flash: clamp(1 - lt / 0.3) * 0.5, vignette: 0.45 }, state: { cta: ctaTimes() } };
    },
  };
  let ctaCache = null;
  function ctaTimes() {
    if (ctaCache) return ctaCache;
    const a = line("n20"), b = line("n21"), c = line("n22"), wt = (l, re) => (l.words.find((w) => re.test(w.w)) || l.words[0]).t;
    return (ctaCache = { t17: a.t, tFree: wt(a, /^77|free/i), genres: [/racing/i, /horror/i, /heists/i, /sports/i].map((re) => wt(a, re)), t18: b.t + 0.2, tPc: wt(b, /^play/i), t19: c.t });
  }
  const route = (sh, lt, t) => (S[sh.id] || S["bed-wide"])(lt, sh, t);
  route.sets = { bed, st, mo, rf, cta };
  return route;
}
