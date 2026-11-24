// Every shot of the film: which set, where the camera is, what moves, and the overlay effects / HUD.
import * as THREE from "three";
import { createBedroom } from "../../sets/bedroom.js";
import { createHub, createTunnel } from "../../sets/hub.js";
import { createHyperlane } from "../../sets/hyperlane.js";
import { createDeep } from "../../sets/deep.js";
import { createHalls } from "../../sets/halls.js";
import { createCta } from "../../sets/cta.js";
import { makeKey } from "../../sets/common.js";
import { pose } from "../../jay.js";

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const bump = (x, a, b) => clamp((x - a) / (b - a)) * clamp((b + (b - a) - x) / (b - a));   // up then down
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function place(cam, from, to, k, look, lookTo = look, fov = null) {
  cam.position.lerpVectors(from, to, k);
  const l = new THREE.Vector3().lerpVectors(look, lookTo, k); cam.lookAt(l);
  if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
}
function aim(cam, pos, look, fov) { cam.position.copy(pos); cam.lookAt(look); if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); } }
function shake(cam, amt, t) { if (!amt) return; cam.position.x += Math.sin(t * 71) * amt; cam.position.y += Math.cos(t * 53) * amt; cam.rotation.z += Math.sin(t * 37) * amt * 0.3; }

export function makeShots(renderer, tl) {
  const bed = createBedroom(), hub = createHub(), tun = createTunnel(), hl = createHyperlane(), deep = createDeep(), halls = createHalls(), cta = createCta();
  const headPos = (rig) => rig.J.head.getWorldPosition(new THREE.Vector3());
  const shot = (id) => tl.shots.find((s) => s.id === id);
  const line = (id) => tl.lines.find((l) => l.id === id);
  const at = (id, lt) => shot(id).t0 + lt;   // absolute time of a moment inside a shot
  // the HUD for each world: when its title card shows, when each key is picked up
  const W1 = shot("hl-chase").t0, W2 = shot("ds-dark").t0, W3 = shot("eh-hall").t0;
  const KEY1 = at("hl-key", 2.45), KEY2 = at("ds-eye", 1.95), KEY3 = at("eh-hall", shot("eh-hall").L("j04") - 0.7);
  const keysAt = (t) => (t >= KEY3 ? 3 : t >= KEY2 ? 2 : t >= KEY1 ? 1 : 0);
  const lastKey = (t) => [KEY3, KEY2, KEY1].find((k) => t >= k) ?? null;
  const hud = (t, world, color, wt) => ({ world, worldColor: color, worldT: wt + 0.25, keys: keysAt(t), keyPop: lastKey(t) });
  // a key in Jay's hand in the halls
  const handKey = makeKey(0xffe27a); handKey.scale.setScalar(0.38 / 0.78); handKey.position.set(0, -0.12, 0.08); handKey.visible = false; halls.jay.J.hand1.add(handKey);

  const S = {
    // ------------------------------------------------------------------ the bedroom
    "bed-wide"(lt, s) {
      const k = ease(clamp(lt / s.dur)), n2 = s.L("n02"), appear = n2 + 2.2;
      pose(bed.jay, "sit", lt, { lean: 0.15 + k * 0.25 });
      const show = clamp((lt - appear) / 0.25), gl = lt > appear && lt < appear + 0.6 ? 1 : 0;
      bed.update(lt, { screen: { show78: show, glitch: gl } });
      place(bed.camera, V(1.45, 2.2, 2.3), V(0.5, 1.62, 0.3), k, V(-0.1, 0.95, -1.4), V(0, 1.18, -1.8), 42);
      return { set: bed, fx: { chroma: gl * 0.6, black: clamp(1 - lt / 0.5) } };
    },
    "bed-face"(lt, s) {
      pose(bed.jay, "sit", lt, { lean: 0.55, fear: clamp(lt / 1.2) * 0.7, pitch: 0.05, noBlink: true });
      bed.update(lt, { screen: { show78: 1, glitch: Math.sin(lt * 20) > 0.7 ? 0.5 : 0 } });
      const h = headPos(bed.jay), k = ease(clamp(lt / s.dur));
      place(bed.camera, V(h.x + 0.38, h.y + 0.04, h.z - 1.05), V(h.x + 0.22, h.y + 0.02, h.z - 0.85), k, V(h.x, h.y - 0.1, h.z), V(h.x, h.y - 0.06, h.z), 50);
      return { set: bed };
    },
    "bed-screen"(lt, s) {
      const g0 = s.L("g00"), k = ease(clamp(lt / s.dur));
      pose(bed.jay, "sit", lt, { lean: 0.6 });
      const msgK = clamp((lt - g0 + 0.2) / 2.4);
      bed.update(lt, { screenRed: msgK > 0.05, screen: { show78: 1, focus78: 1, message: "PLAYER\nONE.\nWE'VE BEEN\nWAITING.", msgK, glitch: lt < 0.4 ? 1 : 0 } });
      const m = ease(clamp((lt - g0 + 0.4) / 1.2));   // from the 78 tile to the message
      place(bed.camera, V(lerp(0.36, 0.0, m), lerp(0.99, 1.19, m), lerp(-1.3, -0.98, m)), V(lerp(0.36, 0.0, m), lerp(0.99, 1.19, m), lerp(-1.4, -1.06, m)), k * 0.4, V(lerp(0.38, 0, m), lerp(0.97, 1.18, m), -1.8), V(lerp(0.38, 0, m), lerp(0.97, 1.18, m), -1.8), lerp(40, 52, m));
      return { set: bed, fx: { chroma: lt < 0.3 ? 0.8 : 0 } };
    },
    "bed-dive"(lt, s) {
      const click = s.L("n03") + 0.55, k = clamp((lt - click - 0.4) / (s.dur - click - 0.4));
      pose(bed.jay, "sit", lt, { lean: 0.6, click: clamp((lt - click) / 0.25) });
      bed.update(lt, { screenRed: true, screenBright: 1 + Math.pow(k, 2) * 7, screen: { show78: 1, focus78: 1, message: "PLAYER\nONE.\nWE'VE BEEN\nWAITING.", msgK: 1, glitch: k > 0.2 ? k : 0 } });
      { const q = Math.pow(k, 1.8), a = V(0.75, 1.55, 0.25), b = V(0.55, 1.45, -1.1), c = V(0, 1.18, -1.76);   // over his shoulder, then into the screen
        const p1 = a.clone().multiplyScalar((1 - q) * (1 - q)).add(b.clone().multiplyScalar(2 * (1 - q) * q)).add(c.clone().multiplyScalar(q * q));
        bed.camera.position.copy(p1); bed.camera.lookAt(0, 1.18, -1.8); bed.camera.fov = lerp(40, 75, Math.pow(k, 2)); bed.camera.updateProjectionMatrix(); }
      return { set: bed, fx: { flash: clamp((lt - (s.dur - 0.35)) / 0.3), chroma: k * 1.2 } };
    },
    // ------------------------------------------------------------------ the fall and the hub
    "hub-land"(lt, s, t) {
      const FALL = 1.05;
      if (lt < FALL) {
        const z = -lt * 44; tun.camera.position.set(Math.sin(lt * 3) * 0.3, Math.cos(lt * 2) * 0.2, z); tun.camera.lookAt(0, -0.2, z - 10); tun.camera.rotation.z = lt * 1.2; tun.camera.fov = 72; tun.camera.updateProjectionMatrix();
        pose(tun.jay, "recoil", lt, { fear: 1 }); tun.jay.root.position.set(Math.sin(lt * 4) * 0.15, -0.75, z - 3.4); tun.jay.root.rotation.set(0.45, Math.sin(lt * 2) * 0.4, lt * 1.6);
        tun.update(lt, z);
        return { set: tun, fx: { flash: Math.max(clamp(1 - lt / 0.25), clamp((lt - FALL + 0.25) / 0.25)), chroma: 0.5 } };
      }
      const u = lt - FALL, g2 = s.L("g02"), speak = lt > g2 && lt < s.E("g02");
      const drop = clamp(u / 0.25), y = (1 - drop * drop) * 3.5;
      const rise = clamp((u - 0.7) / 0.8);
      if (drop < 1) pose(hub.jay, "recoil", lt, { fear: 1 }); else if (rise < 1) pose(hub.jay, "crouch", lt, { k: 1 - ease(rise) * 0.95, fear: 0.6 });
      else pose(hub.jay, "stand", lt, { pitch: lt > 3.6 ? -0.45 : -0.1, yaw: Math.sin(lt * 0.7) * 0.15, fear: 0.45 });
      hub.jay.root.position.set(0, 0.08 + y, 0.5); hub.jay.root.rotation.set(0, Math.PI, 0); hub.copy.root.visible = false; hub.keys.forEach((k) => (k.visible = false));
      hub.update(lt, { dark: 0, holo: clamp((lt - 2.2) / 0.6), holoPulse: speak ? 0.5 + 0.5 * Math.sin(lt * 15) : 0, exit: 0.35 });
      const c = hub.camera;
      if (u < 2.15) { place(c, V(1.25, 0.42, -1.5), V(1.05, 0.5, -1.25), easeOut(clamp(u / 2.15)), V(0, 0.7, 0.5), V(0, 0.85, 0.5), 50); shake(c, clamp(1 - (u - 0.25) / 0.6) * (u > 0.25 ? 0.06 : 0), lt); }
      else if (lt < 6.6) { const k = ease(clamp((lt - FALL - 2.15) / (6.6 - FALL - 2.15))); place(c, V(0.7, 0.55, 3.4), V(-2.6, 4.6, 6.8), k, V(0, 1.6, -3), V(0, 3.8, -5), lerp(48, 56, k)); }
      else { const k = ease(clamp((lt - 6.6) / (s.dur - 6.6))); place(c, V(0.55, 0.32, 2.7), V(0.3, 0.45, 1.85), k, V(0, 5.6, -1.2), V(0, 5.9, -0.6), 56); }
      return { set: hub, fx: { flash: clamp(1 - u / 0.45), chroma: u < 0.3 ? 0.6 : 0, red: speak ? 0.04 : 0 } };
    },
    "hub-dark"(lt, s) {
      const dark = clamp((lt - 0.5) / (s.dur - 0.5)) * 34;
      pose(hub.jay, "stand", lt, { yaw: Math.sin(lt * 1.1) * 0.6, pitch: -0.15, fear: 0.5 });
      hub.jay.root.position.set(0, 0.08, 0.5); hub.jay.root.rotation.set(0, Math.PI + Math.sin(lt * 0.4) * 0.3, 0);
      hub.update(lt, { dark, holo: 0.55, exit: 0.35 });
      const c = hub.camera, e2 = s.L("e02") - 0.2;
      if (lt < e2) { const k = ease(clamp(lt / e2)), a = lerp(0.5, -0.7, k), r = lerp(3.6, 3.0, k); aim(c, V(Math.sin(a) * r, lerp(1.4, 2.6, k), 0.5 + Math.cos(a) * r), V(0, lerp(1.1, 1.5, k), 0.5), 46); }
      else { const k = clamp((lt - e2) / (s.dur - e2)), a = Math.PI - 1.05 + k * 1.5, r = 3.8; aim(c, V(Math.sin(a) * r, 1.45, Math.cos(a) * r), V(Math.sin(a + 0.22) * 8, 2.1, Math.cos(a + 0.22) * 8), 52); }
      return { set: hub };
    },
    "hub-return"(lt, s) {
      const L = s.L("n12"), one = L + 2.55;
      pose(hub.jay, "hold", lt, { fear: 0.2 }); hub.jay.root.position.set(0, 0.08, 0.5); hub.jay.root.rotation.set(0, Math.PI, 0); hub.copy.root.visible = false;
      hub.update(lt, { dark: 80, holo: 0.18, exit: lt < one ? 0.12 : lerp(0.12, 1, clamp((lt - one) / 0.4)), keyLight: 40 });
      holdKeys(hub, lt, 0);
      const k = ease(clamp(lt / s.dur));
      place(hub.camera, V(1.0, 0.75, 3.6), V(0.55, 0.95, 2.55), k, V(0, 1.2, -7), V(0, 1.3, -7.5), 44);
      return { set: hub, fx: { flash: clamp(1 - lt / 0.4) }, state: { keys: 3 } };
    },
    "hub-copy"(lt, s) {
      const jz = -3.0, cz = lerp(-6.8, -5.0, ease(clamp(lt / (s.E("n13") + 0.3))));
      const j5 = s.L("j05") - 0.15, c1 = s.L("c01") - 0.15, e3 = s.L("e03") - 0.2;
      pose(hub.jay, "hold", lt, { fear: lt > j5 ? 1 : 0.5, noBlink: lt > j5 }); hub.jay.root.position.set(0, 0.08, jz); hub.jay.root.rotation.set(0, Math.PI, 0);
      hub.copy.root.visible = true; hub.copy.root.position.set(0, 0.08, cz); hub.copy.root.rotation.set(0, 0, 0);
      if (lt < s.E("n13") + 0.3) pose(hub.copy, "walk", lt, { phase: lt * 3.5 }); else pose(hub.copy, "stand", lt, { yaw: 0, pitch: 0.05, noBlink: true });
      hub.copy.J.head.rotation.z = lt > c1 ? Math.min(0.28, (lt - c1) * 0.5) : 0;
      hub.update(lt, { dark: 80, holo: 0.1, exit: 1, keyLight: 25 });
      holdKeys(hub, lt, 0);
      const c = hub.camera, h = headPos(hub.jay), ch = headPos(hub.copy);
      if (lt < j5) { const k = ease(clamp(lt / j5)); place(c, V(0.72, 1.4, jz + 1.7), V(0.6, 1.36, jz + 1.0), k, V(0, 1.15, cz), V(0, 1.2, cz), 38); }
      else if (lt < c1) { const k = clamp((lt - j5) / (c1 - j5)); place(c, V(h.x + 0.3, h.y + 0.02, h.z - 0.95), V(h.x + 0.22, h.y + 0.02, h.z - 0.8), k, V(h.x, h.y - 0.05, h.z), V(h.x, h.y - 0.04, h.z), 44); }
      else if (lt < e3) { const k = clamp((lt - c1) / (e3 - c1)); place(c, V(ch.x - 0.28, ch.y + 0.0, ch.z + 1.0), V(ch.x - 0.18, ch.y + 0.0, ch.z + 0.78), k, V(ch.x, ch.y - 0.04, ch.z), V(ch.x, ch.y - 0.03, ch.z), 44); }
      else { const k = ease(clamp((lt - e3) / (s.dur - e3))); place(c, V(0.62, 1.55, cz - 1.0), V(0.5, 1.5, cz - 0.75), k, V(0, 1.15, jz), V(0, 1.2, jz), 40); }
      const villain = lt > c1 && lt < e3; hub.copyLight.intensity = villain ? 2.2 : lt > e3 ? 0.8 : 0;
      return { set: hub, fx: { red: villain ? 0.08 + (Math.sin(lt * 23) > 0.8 ? 0.08 : 0) : 0, chroma: villain && Math.sin(lt * 17) > 0.9 ? 0.5 : 0 }, state: { keys: 3 } };
    },
    "hub-escape"(lt, s) {
      const L = s.L("n14"), runEnd = L + 2.3, burn = clamp((lt - L - 1.1) / 0.9), open = clamp((lt - (s.dur - 0.85)) / 0.3);
      const k = clamp(lt / runEnd), jz = lerp(-3.0, -7.25, k), jx = Math.sin(k * Math.PI) * 0.85;
      if (k < 1) pose(hub.jay, "run", lt, { phase: lt * 11, fear: 0.8 }); else pose(hub.jay, "hold", lt, { fear: 0.6 });
      hub.jay.root.position.set(jx, 0.08, jz); hub.jay.root.rotation.set(0, Math.PI - Math.cos(k * Math.PI) * 0.35 * (k < 1 ? 1 : 0), 0);
      hub.copy.root.visible = true; hub.copy.root.position.set(-0.1, 0.08, -5.0); hub.copy.root.rotation.set(0, lt > 0.6 ? Math.min(Math.PI, (lt - 0.6) * 2.2) * 0.5 : 0, 0);
      pose(hub.copy, "reach", lt, { k: clamp((lt - 0.4) / 0.5), noBlink: true });
      hub.update(lt, { dark: 80, holo: 0.1, exit: 1, exitOpen: open, keyLight: 25 });
      holdKeys(hub, lt, burn);
      const j = hub.jay.root.position;
      aim(hub.camera, V(j.x + 1.3 - k * 0.4, 1.05, j.z + 2.6), V(j.x * 0.5, 1.05, j.z - 3.2), 56 + open * 20); shake(hub.camera, 0.015 + open * 0.08, lt);
      return { set: hub, fx: { flash: clamp((lt - (s.dur - 0.5)) / 0.45), chroma: open * 0.8 }, state: { keys: 3 } };
    },
    // ------------------------------------------------------------------ Hyperlane
    "hl-chase"(lt, s, t) {
      const dist = lt * 75; hlCars(lt, { jx: -1.6 + Math.sin(lt * 1.2) * 0.25, rz: -5 + Math.sin(lt * 0.9) * 1.5, boost: 0.15 });
      hl.update(lt, { dist });
      const k = ease(clamp(lt / s.dur)), j = hl.jayCar.position;
      place(hl.camera, V(j.x + 0.45, 1.6, 5.0), V(j.x + 0.2, 1.25, 4.0), k, V(j.x + 0.35, 0.65, -8), V(j.x + 0.25, 0.7, -8), 60); shake(hl.camera, 0.018, lt);
      return { set: hl, state: hud(t, "Hyperlane", "#ff3df0", W1) };
    },
    "hl-rival"(lt, s, t) {
      const T = lt + 5, dist = T * 75;
      hlCars(T, { jx: -1.5, rz: lerp(7, 0.4, easeOut(clamp(lt / s.dur))), rx: 1.6, boost: 0.25 });
      hl.update(T, { dist });
      const j = hl.jayCar.position; pokeHead(hl.jayCar, lt);
      aim(hl.camera, V(j.x + 0.7, 1.05, j.z - 2.25), V(j.x + 0.05, 0.86, j.z + 0.1), 46); shake(hl.camera, 0.02, lt);
      return { set: hl, state: hud(t, "Hyperlane", "#ff3df0", W1) };
    },
    "hl-key"(lt, s, t) {
      const T = lt + 7, boost = ease(clamp((lt - 0.15) / 0.5)), dist = 7 * 75 + lt * 75 + Math.max(0, lt - 0.3) * 70 * boost;
      const passT = 2.4, gz = (lt - passT) * 140;
      hlCars(T, { jx: -1.6, rz: lerp(0.4, 26, ease(clamp((lt - 0.3) / 2.2))), rx: 1.6, boost });
      hl.update(T, { dist });
      hl.gates.forEach((g) => (g.visible = false)); hl.gates[0].visible = true; hl.gates[0].position.z = gz;
      const got = lt >= passT; hl.key.visible = !got; hl.key.position.set(-1.6, 2.6, gz); hl.key.rotation.y = lt * 4;
      const j = hl.jayCar.position, fov = lerp(62, 92, boost);
      aim(hl.camera, V(j.x + 0.2, lerp(1.6, 1.05, boost), j.z + lerp(6.5, 5.0, boost)), V(j.x, lerp(0.8, 1.2, boost), -14), fov); shake(hl.camera, 0.02 + boost * 0.05, lt);
      return { set: hl, fx: { chroma: boost * 0.5 + (got && lt < passT + 0.3 ? 1 : 0), flash: got ? clamp(1 - (lt - passT) / 0.3) * 0.7 : 0 }, state: hud(t, "Hyperlane", "#ff3df0", W1) };
    },
    "hl-cliff"(lt, s, t) {
      const T = lt + 11, endZ = -34, cz = 6 - lt * 24, edgeT = (6 - endZ) / 24;
      hlCars(T, { jx: -1.6, rz: 60, boost: 0.6 }); hl.rival.visible = false;
      const air = Math.max(0, lt - edgeT); hl.jayCar.position.set(-1.6, 0.55 - 4.9 * air * air * 1.4, cz); hl.jayCar.rotation.x = -air * 0.7;
      hl.update(T, { dist: 0, endZ });
      const j = hl.jayCar.position;
      if (lt < edgeT - 0.25) { aim(hl.camera, V(-0.8, 1.7, j.z + 6.5), V(-1.2, 0.6, endZ - 20), 58); }
      else { const k = ease(clamp((lt - edgeT + 0.25) / 0.6)); aim(hl.camera, V(lerp(-0.8, 1.6, k), lerp(1.7, 2.6, k), lerp(endZ + 6.25, endZ + 2.0, k)), V(j.x, j.y, j.z - 2), lerp(58, 50, k)); }
      shake(hl.camera, 0.02, lt);
      return { set: hl, fx: { black: clamp((lt - (s.dur - 0.35)) / 0.3) }, state: hud(t, "Hyperlane", "#ff3df0", W1) };
    },
    // ------------------------------------------------------------------ Deep Signal
    "ds-dark"(lt, s, t) {
      const subZ = -lt * 0.5; deep.update(lt, { subZ, fear: 0.2 });
      deep.key.visible = true; deep.head.rotation.y = Math.sin(lt * 0.8) * 0.3;
      const k = ease(clamp(lt / s.dur));
      place(deep.camera, V(1.5, 2.6, subZ + 5.6), V(1.1, 1.7, subZ + 4.6), k, V(0, -1.0, subZ - 3.5), V(0, -1.1, subZ - 3.8), 48);
      return { set: deep, fx: { black: clamp(1 - lt / 0.4) }, state: hud(t, "Deep Signal", "#3de0ff", W2) };
    },
    "ds-ping"(lt, s, t) {
      const T = lt + 5.3, subZ = -T * 0.5; deep.update(T, { subZ, fear: 0.55 }); deep.head.rotation.y = 0;
      const h = deep.head.getWorldPosition(new THREE.Vector3()), k = ease(clamp(lt / s.dur));
      place(deep.camera, V(h.x + 0.3, h.y + 0.12, h.z - 1.6), V(h.x + 0.18, h.y + 0.08, h.z - 1.3), k, V(h.x, h.y - 0.02, h.z), V(h.x, h.y - 0.02, h.z), 42);
      return { set: deep, state: hud(t, "Deep Signal", "#3de0ff", W2) };
    },
    "ds-eye"(lt, s, t) {
      const T = lt + 7.6, subZ = -T * 0.5, grab = 1.95, ping2 = 2.0;
      const open = ease(clamp((lt - 2.75) / 0.6)), pt = lt < ping2 ? lt : lt - ping2;
      deep.update(T, { subZ, ping: pt, open, fear: lt > 2.6 ? 1 : 0.5 });
      // the key comes to the sub
      const kk = ease(clamp((lt - 1.35) / (grab - 1.35))); deep.key.visible = lt < grab;
      deep.key.position.lerpVectors(V(0.6, -3.4, -13), deep.sub.position.clone().add(V(0, -0.6, -1.4)), kk);
      const sp = deep.sub.position, c = deep.camera;
      if (lt < 2.05) { const k = ease(clamp(lt / 2.05)); place(c, V(0.9, 1.3, sp.z + 4.6), V(0.7, 0.8, sp.z + 3.6), k, V(0.2, -2.2, sp.z - 12), V(0.1, -1.5, sp.z - 6), 50); }
      else { const k = ease(clamp((lt - 2.05) / 1.0)), k2 = ease(clamp((lt - 3.2) / (s.dur - 3.2))); place(c, V(lerp(2.4, 1.3, k2), lerp(0.3, 0.35, k2), sp.z - lerp(3.4, 1.4, k2)), V(lerp(2.4, 1.3, k2), lerp(0.3, 0.35, k2), sp.z - lerp(3.4, 1.4, k2)), 0, V(lerp(0, -1.5, k), lerp(-0.5, 0.2, k), lerp(sp.z, 6.3, k)), undefined, lerp(50, 38, k2)); shake(c, open * 0.035, lt); }
      return { set: deep, fx: { red: open * 0.1, chroma: lt > 2.7 && lt < 3.0 ? 0.6 : 0 }, state: hud(t, "Deep Signal", "#3de0ff", W2) };
    },
    // ------------------------------------------------------------------ The Endless Halls
    "eh-hall"(lt, s, t) {
      const j4 = s.L("j04") - 0.15, grab = j4 - 0.55, walkK = clamp(lt / (grab - 0.3));
      const jz = lerp(1.6, -2.75, walkK), j = halls.jay.root;
      halls.key.visible = t < KEY3; handKey.visible = t >= KEY3;
      if (lt < grab - 0.3) { pose(halls.jay, "walk", lt, { phase: lt * 5.2, yaw: Math.sin(lt * 0.9) * 0.25, fear: 0.4 }); j.rotation.set(0, Math.PI, 0); }
      else if (lt < j4) { pose(halls.jay, "stand", lt, { yaw: -0.4, fear: 0.5 }); halls.jay.J.shoulder1.rotation.x = -1.2 * bump(lt, grab - 0.3, grab); j.rotation.set(0, Math.PI + 0.6, 0); }
      else { pose(halls.jay, "stand", lt, { pitch: 0.02, fear: 1, noBlink: true }); halls.jay.J.shoulder1.rotation.x = -0.5; halls.jay.J.elbow1.rotation.x = -1.2; j.rotation.set(0, 0, 0); }
      j.position.set(0.25, 0, jz);
      halls.update(lt, { watcherZ: lt < j4 ? -24 : 5.5 });
      const c = halls.camera;
      if (lt < j4) { const k = ease(clamp(lt / j4)); aim(c, V(0.25 + lerp(0.55, 0.45, k), 1.5, jz + lerp(2.0, 1.4, k)), V(0, 1.25, -20), 50); shake(c, 0.006, lt * 0.5); }
      else { const h = headPos(halls.jay), k = ease(clamp((lt - j4) / (s.dur - j4))); place(c, V(h.x - 0.1, h.y + 0.02, h.z + 0.95), V(h.x - 0.06, h.y + 0.01, h.z + 0.72), k, V(h.x, h.y - 0.04, h.z), V(h.x, h.y - 0.03, h.z), 46); }
      return { set: halls, state: hud(t, "The Endless Halls", "#ffe27a", W3) };
    },
    "eh-flicker"(lt, s, t) {
      const L = s.L("n11"), off1 = [L + 1.45, L + 1.63], off2 = [L + 1.95, L + 2.13], end = s.dur - 0.22;
      const dark = (lt > off1[0] && lt < off1[1]) || (lt > off2[0] && lt < off2[1]) || lt > end;
      const wz = lt < off1[1] ? -24 : lt < off2[1] ? -12 : -5.6, reach = lt > off2[1] ? clamp((lt - off2[1]) / 0.25) : 0;
      pose(halls.jay, "stand", lt, { fear: 1, noBlink: true }); halls.jay.J.shoulder1.rotation.x = -0.5; halls.jay.J.elbow1.rotation.x = -1.2;
      halls.jay.root.position.set(0.25, 0, -2.75); halls.jay.root.rotation.set(0, Math.PI, 0); handKey.visible = true; halls.key.visible = false;
      halls.update(lt, { lights: dark ? 0 : 1, watcherZ: wz, reach });
      const k = ease(clamp(lt / s.dur));
      place(halls.camera, V(0.85, 1.45, -1.55), V(0.7, 1.42, -1.85), k, V(0.1, 1.35, -20), V(0.15, 1.5, -10), 48);
      if (lt > off2[1]) shake(halls.camera, 0.03, lt);
      return { set: halls, fx: { black: dark ? 0.94 : 0, red: lt > off2[1] && !dark ? 0.12 : 0, chroma: lt > off2[1] && lt < off2[1] + 0.2 ? 0.8 : 0 }, state: hud(t, "The Endless Halls", "#ffe27a", W3) };
    },
    // ------------------------------------------------------------------ home again
    "bed-dawn"(lt, s) {
      const wake = clamp(lt / 2.2), back = s.dur - 1.6, show = clamp((lt - back) / 0.3);
      pose(bed.jay, "slumped", lt, { wake });
      bed.update(lt, { dawn: 1, screen: { show78: show, glitch: show > 0 && show < 1 ? 1 : 0 } });
      const k = ease(clamp(lt / s.dur));
      place(bed.camera, V(1.7, 1.5, 0.9), V(1.2, 1.35, 0.35), k, V(0, 0.95, -1.1), V(0, 1.05, -1.4), 42);
      return { set: bed, fx: { flash: clamp(1 - lt / 0.7), chroma: show > 0 && show < 1 ? 0.6 : 0 } };
    },
    "bed-two"(lt, s) {
      const k = ease(clamp(lt / s.dur));
      pose(bed.jay, "sit", lt, { lean: 0.3 });
      bed.update(lt, { dawn: 0.6, screenRed: true, screen: { show78: 1, focus78: 1, message: "PLAYER\nTWO...\nWE'VE BEEN\nWAITING.", msgK: clamp(lt / 2.2), glitch: Math.sin(lt * 9) > 0.8 ? 0.6 : 0 } });
      place(bed.camera, V(0, 1.19, -0.96), V(0, 1.19, -1.12), k, V(0, 1.18, -1.8), V(0, 1.18, -1.8), 52);
      return { set: bed, fx: { chroma: Math.sin(lt * 9) > 0.8 ? 0.5 : 0 } };
    },
    // ------------------------------------------------------------------ the ending
    "cta"(lt, s, t) {
      const L17 = s.L("n17"), L19 = s.L("n19"), pop = bump(lt, L17, L17 + 0.35), show78 = easeOut(clamp((lt - L19 - 1.2) / 0.5));
      cta.update(lt, { spin: lt * 0.32, pop, show78 });
      const k = ease(clamp(lt / L19)), k2 = ease(clamp((lt - L19) / (s.dur - L19))), a = lerp(0.55, -0.35, k) + k2 * -0.2, r = lerp(8.2, 7.2, k) - k2 * 1.6;
      aim(cta.camera, V(Math.sin(a) * r, lerp(2.2, 2.6, k) + k2 * 0.4, Math.cos(a) * r), V(0, lerp(2.0, 2.3, k) + k2 * 0.6, 0), 42);
      return { set: cta, fx: { flash: clamp(1 - lt / 0.3) * 0.6, chroma: show78 > 0 && Math.sin(lt * 19) > 0.85 ? 0.5 : 0, vignette: 0.45 }, state: { cta: ctaTimes(s) } };
    },
  };

  // ---- helpers that need the sets
  function hlCars(T, { jx = -1.6, rz = -5, rx = 1.6, boost = 0 }) {
    const j = hl.jayCar, r = hl.rival; hl.rival.visible = true;
    j.position.set(jx, 0.55 + Math.sin(T * 3) * 0.04, 0); j.rotation.set(Math.sin(T * 2.1) * 0.01, 0, -Math.cos(T * 1.2) * 0.06); j.setBoost(boost, T);
    r.position.set(rx + Math.sin(T * 1.4) * 0.2, 0.55 + Math.sin(T * 3 + 1) * 0.04, rz); r.rotation.set(0, 0, Math.sin(T * 1.4) * 0.05); r.setBoost(0.3, T);
    hl.jayCar.userData.headG.rotation.set(0, 0, 0); hl.key.visible = false;
  }
  function pokeHead(car, lt) { car.userData.headG.rotation.y = Math.sin(lt * 2.5) * 0.25 + 0.3; car.userData.headG.position.y = 0.32 + Math.sin(lt * 9) * 0.01; }
  function holdKeys(set, lt, burn) {   // three keys floating between his hands; at the end they burn white
    const a = set.jay.J.hand1.getWorldPosition(new THREE.Vector3()), b = set.jay.J["hand-1"].getWorldPosition(new THREE.Vector3());
    const c = a.clone().add(b).multiplyScalar(0.5).add(V(0, 0.18, 0)), fwd = V(0, 0, -1).applyQuaternion(set.jay.root.quaternion), right = V(1, 0, 0).applyQuaternion(set.jay.root.quaternion);
    set.keys.forEach((k, i) => {
      k.visible = true; k.position.copy(c).addScaledVector(right, (i - 1) * 0.2).addScaledVector(fwd, 0.12).add(V(0, Math.sin(lt * 3 + i) * 0.02 + (i === 1 ? 0.05 : 0), 0));
      k.rotation.set(0, lt * 1.5 + i, (i - 1) * 0.3); k.scale.setScalar(0.3 + burn * 0.12);
      k.mat.emissive.setRGB(...[[1, 0.24, 0.94], [0.24, 0.88, 1], [1, 0.89, 0.48]][i].map((v) => lerp(v, 1, burn))); k.mat.emissiveIntensity = 1.6 + burn * 5;
      k.halo.scale.setScalar(1.2 + burn * 5); k.halo.material.opacity = 0.35 + burn * 0.6; k.halo.material.color.setRGB(...[[1, 0.24, 0.94], [0.24, 0.88, 1], [1, 0.89, 0.48]][i].map((v) => lerp(v, 1, burn)));
    });
  }
  let ctaCache = null;
  function ctaTimes(s) {
    if (ctaCache) return ctaCache;
    const n17 = line("n17"), n18 = line("n18"), n19 = line("n19");
    const wt = (l, re) => (l.words.find((w) => re.test(w.w)) || l.words[0]).t;
    ctaCache = { t17: n17.t, tFree: wt(n17, /^77|free/i), genres: [/racing/i, /horror/i, /heists/i, /sports/i].map((re) => wt(n17, re)), t18: n18.t + 0.2, tPc: wt(n18, /^play/i), t19: n19.t };
    return ctaCache;
  }

  const route = (sh, lt, t) => (S[sh.id] || S["bed-wide"])(lt, sh, t);
  route.sets = { bed, hub, tun, hl, deep, halls, cta };
  return route;
}
