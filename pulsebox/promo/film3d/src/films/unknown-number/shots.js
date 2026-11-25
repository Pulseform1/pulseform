// Unknown Number: every shot. Jay plays The Endless Halls at 2:47 AM; an unknown number texts him photos as it gets
// closer (his town, his street, his porch), then "I'm in your house", the pans in the kitchen, "I'm in your room",
// and the tall pale man right behind him as he shuts his door. The film freezes there.
import * as THREE from "three";
import { createBedroom } from "../../sets/bedroom.js";
import { createHalls } from "../../sets/halls.js";
import { createOutside } from "../../sets/outside.js";
import { createHouse } from "../../sets/house.js";
import { makePaleMan } from "../../creatures.js";
import { PhoneUI, makePhone } from "../../phoneui.js";
import { pose } from "../../jay.js";

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function aim(cam, pos, look, fov) { cam.position.copy(pos); cam.lookAt(look); if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); } }
function place(cam, from, to, k, look, lookTo = look, fov = null) { cam.position.lerpVectors(from, to, k); cam.lookAt(new THREE.Vector3().lerpVectors(look, lookTo, k)); if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); } }
function hand(cam, amt, t) { cam.position.x += Math.sin(t * 1.7) * amt + Math.sin(t * 4.3) * amt * 0.4; cam.position.y += Math.cos(t * 1.3) * amt; cam.rotation.z += Math.sin(t * 1.1) * amt * 0.5; }

export function makeShots(renderer, tl) {
  const bed = createBedroom({ lamp: true }), halls = createHalls(), out = createOutside(), house = createHouse();
  const shot = (id) => tl.shots.find((s) => s.id === id), line = (id) => tl.lines.find((l) => l.id === id);
  const at = (id, lt = 0) => shot(id).t0 + lt;
  bed.phone.visible = false;
  // ---- The Endless Halls, live on his monitor (its Watcher as the pale man, no glowing eyes)
  halls.watcher.traverse((o) => { if (o.isSprite) o.visible = false; else if (o.isMesh) { o.material = o.material.clone(); o.material.color.set(o.material.type === "MeshBasicMaterial" ? 0x1a1612 : 0xdcd6cc); if (o.material.roughness !== undefined) o.material.roughness = 0.45; } });
  halls.jay.root.visible = false;
  const hallsRT = new THREE.WebGLRenderTarget(800, 500, { samples: 0 }); hallsRT.texture.colorSpace = THREE.SRGBColorSpace;
  const hallsCam = new THREE.PerspectiveCamera(62, 800 / 500, 0.05, 80);
  function renderGame(t) { halls.update(t, { watcherZ: -15 + Math.sin(t * 0.07) * 0.5, lights: Math.sin(t * 7.3) > 0.97 ? 0.3 : 1 }); hallsCam.position.set(0.15 + Math.sin(t * 2.4) * 0.03, 1.45 + Math.abs(Math.sin(t * 2.4)) * 0.03, 2.0 - (t % 6) * 0.2); hallsCam.lookAt(0.1, 1.35, -20);
    const old = renderer.getRenderTarget(), ex = renderer.toneMappingExposure; renderer.setRenderTarget(hallsRT); renderer.toneMappingExposure = 1; renderer.render(halls.scene, hallsCam); renderer.setRenderTarget(old); renderer.toneMappingExposure = ex; }
  // ---- the three photos, taken once with a camera flash (rendered here and copied into canvases)
  const ui = new PhoneUI();
  { const old = renderer.toneMappingExposure; renderer.toneMappingExposure = 1.05; renderer.setRenderTarget(null);
    for (const name of ["town", "street", "porch"]) {
      out.snapCam(name); const cp = out.camera.position.clone(); out.update(0, { flashOn: name === "town" ? 3 : 1, flashAt: cp.clone().add(V(0.15, 0.1, 0)), flicker: false, shadow: name === "porch" });
      renderer.render(out.scene, out.camera); const c = document.createElement("canvas"); c.width = 600; c.height = 800; c.getContext("2d").drawImage(renderer.domElement, 0, 240, 1080, 1440, 0, 0, 600, 800); ui.photos[name] = c;
    }
    out.update(0, { flashOn: 0 }); renderer.toneMappingExposure = old; }
  // ---- the phone (in his hands, on the desk, on the bed) and what it shows
  const phone = makePhone(ui); phone.scale.setScalar(1.25); bed.scene.add(phone);
  const phone2 = makePhone(ui); phone2.scale.setScalar(1.25); house.scene.add(phone2);
  const T1 = { time: "Today 2:47 AM", photo: "town", text: "I'm in your town." }, ME = { me: true, text: "lol nice try. who is this?", status: "Delivered" }, ME2 = { me: true, text: "seriously who is this??", status: "Delivered" }, ME1 = { ...ME, status: null };
  const T2 = { time: "2:52 AM", photo: "street", text: "I'm on your street." }, T3 = { time: "3:02 AM", photo: "porch", text: "I'm at your front porch." };
  const T4 = { time: "3:04 AM", text: "I'm in your house." }, T5 = { time: "3:05 AM", text: "I'm in your room." };
  const msgs = (list, lastK = 1) => list.map((m, i) => ({ ...m, k: i === list.length - 1 ? lastK : 1 }));
  function inHands(rig, ph, lift = 0) {   // between his hands, screen toward his eyes
    const a = rig.J.hand1.getWorldPosition(V(0, 0, 0)), b = rig.J["hand-1"].getWorldPosition(V(0, 0, 0)), head = rig.J.head.getWorldPosition(V(0, 0, 0));
    ph.position.copy(a).add(b).multiplyScalar(0.5).add(V(0, 0.07 + lift, 0)); ph.lookAt(head); ph.rotateX(-0.15);
  }
  function oneHand(rig, ph) { const a = rig.J.hand1.getWorldPosition(V(0, 0, 0)), q = rig.root.quaternion; ph.position.copy(a).add(V(0, 0.05, 0)); ph.quaternion.copy(q); ph.rotateY(Math.PI); ph.rotateX(-0.25); }
  let povRig = null;
  function screenCam(cam, ph, t, { dist = 0.26, fov = 40, side = 0.02, rig = null } = {}) {   // his view of the phone (his own head is hidden)
    povRig = rig; if (rig) rig.J.head.visible = false;
    const n = V(0, 0, 1).applyQuaternion(ph.quaternion), up = V(0, 1, 0).applyQuaternion(ph.quaternion), c = ph.position.clone().addScaledVector(n, dist * ph.scale.x).addScaledVector(up, -0.01);
    cam.up.copy(up); aim(cam, c.add(V(side, 0, 0)), ph.position, fov); cam.up.set(0, 1, 0); hand(cam, 0.002, t);
  }
  const headPos = (rig) => rig.J.head.getWorldPosition(V(0, 0, 0));
  const DESK = V(0.74, 0.8, -1.16), BED = V(1.55, 0.6, 0.55);
  const CHAIR = V(2.12, 0, -0.62), HIDE = V(0.72, 0, 1.35), HIDE_RY = 2.45;   // the chair wedged under the handle; his hiding spot behind the bed, facing the door
  const holdBat = (tilt) => { const hp = bed.jay.J["hand-1"].getWorldPosition(V(0, 0, 0)); bed.bat.position.copy(hp).add(V(0, -0.06, 0)); bed.bat.quaternion.copy(bed.jay.root.quaternion); bed.bat.rotateX(tilt); };
  const flat = (ph, pos, ry = 0.3) => { ph.position.copy(pos); ph.rotation.set(-Math.PI / 2, 0, ry); };
  const buzz = (ph, lt, t0, d = 0.9) => { if (lt > t0 && lt < t0 + d) { ph.position.x += Math.sin(lt * 180) * 0.0025; ph.rotation.z += Math.sin(lt * 150) * 0.03; } };
  const seatJay = (lt, p = {}) => { bed.jay.root.position.set(0, 0, -0.45); bed.jay.root.rotation.set(0, Math.PI, 0); pose(bed.jay, "sit", lt, p); };
  const darkRoom = (p) => ({ screenTex: hallsRT.texture, screenBright: 0, lampOn: 0, room: 0.75, ...p });
  const litRoom = (p) => ({ screenTex: hallsRT.texture, lampOn: 1, ...p });
  // the pale man: hidden until the very end
  const man = makePaleMan(); man.root.visible = false; bed.scene.add(man.root);
  man.root.traverse((o) => { if (o.isMesh) o.receiveShadow = false; });   // no blind-slat stripes across him
  const manMats = []; man.root.traverse((o) => { if (o.isMesh && o.material.emissive && !manMats.includes(o.material)) manMats.push(o.material); });
  const manGlow = manMats.map((m) => m.emissive.getHex()), manDark = (dark) => manMats.forEach((m, i) => m.emissive.setHex(dark ? 0x000000 : manGlow[i]));   // black in the dark corner until the light finds him
  const faceFill = new THREE.PointLight(0xcfd8ff, 0, 1.6, 1.6); bed.scene.add(faceFill);
  { const ceil = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 7), new THREE.MeshStandardMaterial({ color: 0x1c1830, roughness: 0.95 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0.1, 3.2, 0); ceil.receiveShadow = true; bed.scene.add(ceil);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 3.2), new THREE.MeshStandardMaterial({ color: 0x2b2446, roughness: 0.95 })); front.rotation.y = Math.PI; front.position.set(0.1, 1.6, 3.45); bed.scene.add(front); }   // a ceiling and a fourth wall (the reveal looks up and across the room)
  const CORNER = V(2.2, 0, -1.93), UP = 6.5;   // where the pale man stands: the corner behind the door (it opens into the room); how long the climb back up takes
  const moonFill = new THREE.SpotLight(0xe6ecff, 0, 7, 0.42, 0.9, 1.2); moonFill.position.set(2.45, 2.95, -1.95); moonFill.target.position.set(1.4, 2.0, -0.6); bed.scene.add(moonFill, moonFill.target);   // a cold key on his face

  const TYPE = 2.3, TYPE_AT = () => at("txt1", shot("txt1").L("j01") + 1.0), SENT_AT = () => TYPE_AT() + TYPE + 0.25;   // his joke reply, typed across two shots
  const S = {
    "hook"(lt, s, t) {
      renderGame(t); seatJay(lt, { lean: 0.35 }); bed.update(lt, litRoom({ screenBright: 1.1 }));
      flat(phone, DESK); buzz(phone, lt, 0.9, 1.6);
      ui.draw({ mode: "lock", clock: "2:47", notif: { title: "Unknown Number", body: "1 new message", sub: "(318) 555-0147", k: clamp((lt - 0.9) / 0.25) }, t }); phone.userData.set({ bright: lt > 0.9 ? 1 : 0.05 });
      if (lt < 1.15) { const k = clamp(lt / 1.15); aim(bed.camera, V(0.05, 1.21, lerp(-0.95, -1.1, k)), V(0, 1.2, -1.8), 52); }
      else { const k = ease(clamp((lt - 1.15) / (s.dur - 1.15))); aim(bed.camera, V(DESK.x + 0.05, DESK.y + lerp(0.5, 0.36, k), DESK.z + 0.08), DESK, 44); bed.camera.rotation.z += 0.3; hand(bed.camera, 0.003, t); }
      return { set: bed, fx: { vignette: 0.75 } };
    },
    "bed-play"(lt, s, t) {
      renderGame(t); seatJay(lt, { lean: 0.35, yaw: lt > s.dur - 1.6 ? -0.5 * clamp((lt - s.dur + 1.6) / 0.5) : 0 });
      bed.update(lt, litRoom({ screenBright: 1.1 })); flat(phone, DESK); phone.userData.set({ bright: 1 });
      ui.draw({ mode: "lock", clock: "2:47", notif: { title: "Unknown Number", body: "1 new message", sub: "(318) 555-0147" }, t });
      const k = ease(clamp(lt / s.dur)); place(bed.camera, V(1.5, 2.0, 1.6), V(0.85, 1.55, 0.2), k, V(-0.1, 1.0, -1.5), V(0.1, 1.05, -1.6), 44); hand(bed.camera, 0.006, t);
      return { set: bed, fx: { vignette: 0.7 } };
    },
    "txt1"(lt, s, t) {   // the first text: a photo of his town. He thinks it's a joke and starts typing back
      renderGame(t); const typing = clamp((t - TYPE_AT()) / TYPE);
      bed.jay.root.position.set(0, 0, -0.45); bed.jay.root.rotation.set(0, Math.PI - 0.25, 0); pose(bed.jay, "text", lt, { sit: true, lean: 0.1 }); bed.update(lt, litRoom());
      inHands(bed.jay, phone); phone.userData.set({ bright: 1 });
      ui.draw({ mode: "thread", clock: "2:48", messages: msgs([T1], clamp((lt - 0.5) / 0.4)), typing: t > TYPE_AT() ? { text: ME.text, k: typing } : null, t });
      screenCam(bed.camera, phone, t, { rig: bed.jay });
      return { set: bed, fx: { vignette: 0.6 } };
    },
    "txt1-face"(lt, s, t) {   // from his monitor, like a webcam: a smirk as he hits send
      renderGame(t); const sent = t > SENT_AT(), typing = clamp((t - TYPE_AT()) / TYPE);
      bed.jay.root.position.set(0, 0, -0.45); bed.jay.root.rotation.set(0, Math.PI - 0.25, 0); pose(bed.jay, "text", lt, { sit: true, lean: 0.1, pitch: 0.3, smile: 0.4 }); bed.update(lt, litRoom({ lampOn: 0.6 }));
      inHands(bed.jay, phone); phone.userData.set({ bright: 1.2 });
      ui.draw({ mode: "thread", clock: "2:48", messages: sent ? msgs([T1, ME], clamp((t - SENT_AT()) / 0.3)) : msgs([T1]), typing: sent ? null : { text: ME.text, k: typing }, t });
      const h = headPos(bed.jay), k = ease(clamp(lt / s.dur)); place(bed.camera, V(0.16, 1.0, -1.7), V(0.13, 1.02, -1.6), k, V(h.x, h.y - 0.08, h.z), V(h.x, h.y - 0.06, h.z), 50); hand(bed.camera, 0.003, t);
      return { set: bed, fx: { vignette: 0.7 } };
    },
    "break1"(lt, s, t) {   // the phone goes face down on the desk and he goes back to the game. "Probably just Maya." Five minutes.
      renderGame(t); const L = s.L("j07"), N2 = s.L("n02"), glance = clamp((lt - (N2 - 2.4)) / 0.3) * clamp((N2 - 1.4 - lt) / 0.3);
      bed.update(lt, litRoom({ screenBright: 1.1, lampOn: 0.6 })); seatJay(lt, { lean: 0.32, smile: lt < L + 2.8 ? 0.35 : 0, yaw: -0.55 * glance, pitch: -0.05 - 0.25 * glance, click: lt * 3 });
      phone.position.copy(DESK); phone.rotation.set(Math.PI / 2, 0, 0.3); phone.position.y -= 0.004; phone.userData.set({ bright: 0 });   // face down
      if (lt < 1.4) { aim(bed.camera, V(0.5, 1.5, 0.45), V(-0.05, 1.12, -1.8), 46); hand(bed.camera, 0.004, t); }   // over his shoulder: back to The Endless Halls
      else if (lt < N2 - 0.6) { const h = headPos(bed.jay); aim(bed.camera, V(1.2, 1.32, -1.3), V(h.x - 0.05, h.y - 0.12, h.z), 50); hand(bed.camera, 0.003, t); }   // his face in the monitor light; a glance at the phone
      else { const k = ease(clamp((lt - N2 + 0.6) / (s.dur - N2 + 0.6))); place(bed.camera, V(1.7, 2.1, 2.0), V(1.5, 1.95, 1.7), k, V(0, 1.0, -1.4), V(0, 1.0, -1.4), 46); }   // wide: the clock jumps
      return { set: bed, fx: { vignette: 0.7 }, state: lt > N2 - 0.1 ? { slams: [{ text: "2:52 AM", t: at("break1", N2 - 0.1), until: at("txt2", 1.0), color: "#ffffff", y: 560, px: 110 }] } : {} };
    },
    "txt2"(lt, s, t) {   // it buzzes face down; he turns it over: his street. A nervous laugh... then it isn't funny
      renderGame(t); const bz = 0.25, grab = 1.0, L = s.L("j02"), show = clamp((lt - grab - 0.25) / 0.35);
      bed.update(lt, litRoom({ lampOn: 0.6, screenBright: 1.1 }));
      if (lt < grab) {
        seatJay(lt, { lean: 0.3, yaw: -0.45 * clamp((lt - bz) / 0.3), pitch: -0.25 }); phone.position.copy(DESK); phone.rotation.set(Math.PI / 2, 0, 0.3); phone.position.y -= 0.004; buzz(phone, lt, bz, 0.6); phone.userData.set({ bright: 0 });
        aim(bed.camera, V(DESK.x - 0.12, DESK.y + 0.4, DESK.z + 0.32), DESK, 46); hand(bed.camera, 0.003, t);
      } else {
        bed.jay.root.position.set(0, 0, -0.45); bed.jay.root.rotation.set(0, Math.PI - 0.25, 0); pose(bed.jay, "text", lt, { sit: true, lean: 0.12, pitch: 0.3, fear: lt > L + 1.2 ? 0.55 : 0.25, smile: lt > L && lt < L + 1.2 ? 0.25 : 0, noBlink: lt > L });
        inHands(bed.jay, phone); phone.userData.set({ bright: 1.1 });
        ui.draw({ mode: "thread", clock: "2:52", messages: show > 0 ? msgs([T1, ME, T2], show) : msgs([T1, ME]), t });
        if (lt < L + 0.15) screenCam(bed.camera, phone, t, { rig: bed.jay });
        else { const h = headPos(bed.jay), k = ease(clamp((lt - L) / (s.dur - L))); place(bed.camera, V(0.16, 1.0, -1.7), V(0.12, 1.02, -1.58), k, V(h.x, h.y - 0.08, h.z), V(h.x, h.y - 0.06, h.z), 48); hand(bed.camera, 0.004, t); }
      }
      return { set: bed, fx: { vignette: 0.65 }, state: lt < grab ? { slams: [{ text: "2:52 AM", t: at("break1", shot("break1").L("n02") - 0.1), until: at("txt2", grab), color: "#ffffff", y: 560, px: 110 }] } : {} };
    },
    "wait"(lt, s, t) {   // ten minutes: he texts again (nothing), checks the street, calls the number (it just rings), then sits and waits
      const W1 = 2.1, W2 = 3.1, W3 = 5.5, W4 = s.L("n03") - 0.4, fear = lerp(0.5, 0.95, clamp(lt / s.dur));
      if (lt < W1) {   // "seriously who is this??" ... Delivered
        renderGame(t); bed.update(lt, litRoom({ lampOn: 0.6 })); bed.jay.root.position.set(0, 0, -0.45); bed.jay.root.rotation.set(0, Math.PI - 0.25, 0); pose(bed.jay, "text", lt, { sit: true, lean: 0.12, fear });
        inHands(bed.jay, phone); phone.userData.set({ bright: 1.1 }); const sent = lt > 1.45;
        ui.draw({ mode: "thread", clock: "2:53", messages: sent ? msgs([T1, ME1, T2, ME2], clamp((lt - 1.45) / 0.3)) : msgs([T1, ME, T2]), typing: sent ? null : { text: ME2.text, k: clamp((lt - 0.1) / 1.2) }, t });
        screenCam(bed.camera, phone, t, { rig: bed.jay });
        return { set: bed, fx: { vignette: 0.65 } };
      }
      if (lt < W2) {   // to the window
        const k = clamp((lt - W1) / (W2 - W1)); bed.jay.root.position.set(lerp(0.2, -1.95, ease(k)), 0, lerp(-0.2, -0.6, k)); bed.jay.root.rotation.set(0, -Math.PI / 2 - 0.2, 0); pose(bed.jay, "walk", lt, { phase: lt * 6, fear });
        renderGame(t); bed.update(lt, litRoom({ lampOn: 0.6 })); oneHand(bed.jay, phone); phone.userData.set({ bright: 0.6 });
        aim(bed.camera, V(1.6, 1.6, 1.4), V(-1.5, 1.2, -0.6), 50); hand(bed.camera, 0.006, t);
        return { set: bed, fx: { vignette: 0.65 } };
      }
      if (lt < W3) {   // his view through the blinds: the street, the sign, the flickering lamp, nobody
        const k = clamp((lt - W2) / (W3 - W2)); out.snapCam("window"); const c = out.camera; c.position.x += Math.sin(t * 0.9) * 0.01; c.lookAt(lerp(11.3, 12.1, k), lerp(2.2, 2.6, k), 2.6);
        out.update(t, { blindsAt: { pos: c.position.clone().add(V(0.25, 0.0, 0.42)), look: c.position.clone().add(V(0.8, -0.2, 1.4)), gap: true } }); out.camera.fov = lerp(30, 24, k); out.camera.updateProjectionMatrix();
        return { set: out, exposure: 2.4, fx: { vignette: 0.8 } };
      }
      renderGame(t); bed.update(lt, litRoom({ lampOn: 0.4 }));
      if (lt < W4) {   // calling the number. It rings. And rings.
        bed.jay.root.position.set(1.5, 0.05, 0.1); bed.jay.root.rotation.set(0, -Math.PI / 2, 0); pose(bed.jay, "phone", lt, { fear, noBlink: true, pitch: 0.15, yaw: Math.sin(lt * 0.8) * 0.15 });
        const hp = bed.jay.J.hand1.getWorldPosition(V(0, 0, 0)); phone.position.copy(hp).add(V(0, 0.05, 0)); phone.quaternion.copy(bed.jay.root.quaternion); phone.rotateY(-Math.PI / 2); phone.rotateZ(0.3); phone.userData.set({ bright: 0.8 });
        const h = headPos(bed.jay), k = ease(clamp((lt - W3) / (W4 - W3))); place(bed.camera, V(0.28, 1.32, 0.78), V(0.45, 1.3, 0.62), k, V(h.x, h.y - 0.12, h.z), V(h.x, h.y - 0.08, h.z), 46); hand(bed.camera, 0.004, t);
        return { set: bed, fx: { vignette: 0.72 } };
      }
      // on the bed, knee bouncing; the phone's clock creeps from 2:54 to 3:01
      const u = lt - W4, k = clamp(u / (s.dur - W4)), min = 54 + Math.floor(k * 7.99);
      bed.jay.root.position.set(1.55, 0.05, 0.1); bed.jay.root.rotation.set(0, -Math.PI / 2, 0); pose(bed.jay, "text", lt, { sit: true, lean: 0.25, pitch: 0.45, fear });
      bed.jay.J.hip1.rotation.x += Math.sin(lt * 17) * 0.06; bed.jay.J["hip-1"].rotation.x += Math.sin(lt * 17 + 1.7) * 0.05;   // a knee that won't stop bouncing
      inHands(bed.jay, phone); phone.userData.set({ bright: 0.9 });
      ui.draw({ mode: "lock", clock: min < 60 ? `2:${min}` : `3:0${min - 60}`, t });
      const h = headPos(bed.jay); place(bed.camera, V(h.x - 1.6, h.y + 0.5, h.z + 1.2), V(h.x - 1.2, h.y + 0.2, h.z + 0.8), ease(k), V(h.x, h.y - 0.3, h.z), V(h.x, h.y - 0.25, h.z), 46); hand(bed.camera, 0.004, t);
      return { set: bed, fx: { vignette: 0.75 }, state: { slams: [{ text: min < 60 ? `2:${min} AM` : `3:0${min - 60} AM`, t: at("wait", W4), until: at("wait", s.dur), color: "#ffffff", y: 560, px: 100 }] } };
    },
    "txt3"(lt, s, t) {
      const L = s.L("n04"), bz = L + 0.4, grab = L + 2.2, show = clamp((lt - grab - 0.2) / 0.35);
      bed.jay.root.position.set(1.55, 0.05, 0.1); bed.jay.root.rotation.set(0, -Math.PI / 2, 0); renderGame(t); bed.update(lt, litRoom({ lampOn: 0.4 }));
      if (lt < grab) { pose(bed.jay, "sit", lt, { lean: 0.1, yaw: 0.6, fear: 0.4 }); bed.jay.J.hips.position.y = 0.62; flat(phone, BED, 0.9); buzz(phone, lt, bz, 1.2); phone.userData.set({ bright: lt > bz ? 1 : 0.1 });
        ui.draw({ mode: "lock", clock: "3:02", notif: { title: "Unknown Number", body: "1 new message", sub: "(318) 555-0147", k: clamp((lt - bz) / 0.25) }, t });
        aim(bed.camera, V(BED.x - 0.4, BED.y + 0.55, BED.z + 0.25), BED, 46); hand(bed.camera, 0.004, t);
      } else { pose(bed.jay, "text", lt, { sit: true, lean: 0.1, fear: 1, noBlink: true }); inHands(bed.jay, phone); phone.userData.set({ bright: 1.1 });
        ui.draw({ mode: "thread", clock: "3:02", messages: msgs([T1, ME, T2, T3], show), t }); screenCam(bed.camera, phone, t, { rig: bed.jay }); }
      return { set: bed, fx: { vignette: 0.7 }, state: lt > L - 0.2 && lt < grab ? { slams: [{ text: "3:02 AM", t: at("txt3", L - 0.2), until: at("txt3", grab), color: "#ff3d5e", y: 560, px: 110 }] } : {} };
    },
    "panic"(lt, s, t) {   // up off the bed, pacing, hands in his hair
      const ph = lt * 4.5, x = 1.0 + Math.sin(lt * 1.3) * 0.7; renderGame(t); bed.update(lt, litRoom({ lampOn: 0.6 }));
      bed.jay.root.position.set(x, 0, 0.35 + Math.cos(lt * 1.3) * 0.2); bed.jay.root.rotation.set(0, Math.cos(lt * 1.3) > 0 ? -Math.PI / 2 : Math.PI / 2, 0); pose(bed.jay, "walk", lt, { phase: ph, fear: 1, armsUp: 0.9, noBlink: true });
      oneHand(bed.jay, phone); phone.userData.set({ bright: 0.8 });
      const h = headPos(bed.jay); aim(bed.camera, V(-0.6, 1.6, 1.8), V(h.x, h.y - 0.2, h.z), 48); hand(bed.camera, 0.012, t);
      return { set: bed, fx: { vignette: 0.7 } };
    },
    "prep"(lt, s, t) {   // the chair under the door handle, the lock ("He locked the door"), the lights ("Killed the lights"), the bat ("Grabbed the bat")
      const A = 1.5, B = 3.45, C = 4.55, lockAt = 3.1, offAt = 4.05, grabAt = 4.95;
      const chairK = ease(clamp(lt / A)), locked = lt > lockAt, off = lt > offAt;
      bed.chair.position.set(lerp(0, CHAIR.x, chairK), 0, lerp(-0.45, CHAIR.z, chairK)); bed.chair.rotation.y = lerp(0, Math.PI / 2, chairK);
      renderGame(t); bed.update(lt, off ? darkRoom({ locked }) : litRoom({ locked, lampOn: 0.6, screenBright: 1.1 }));
      if (lt < A) {   // dragging the chair to the door
        bed.jay.root.position.set(lerp(0.15, 1.55, chairK), 0, lerp(-0.1, -0.7, chairK)); bed.jay.root.rotation.set(0, Math.PI / 2 - 0.3, 0); pose(bed.jay, "walk", lt, { phase: lt * 6, fear: 1, noBlink: true });
        aim(bed.camera, V(-0.9, 1.75, 1.7), V(1.5, 0.8, -0.9), 50);
      } else if (lt < B) {   // his hand to the lock; it turns
        bed.chair.visible = false; const r = clamp((lt - A) / 1.0); bed.jay.root.position.set(2.0, 0, -1.28); bed.jay.root.rotation.set(0, Math.PI / 2, 0); pose(bed.jay, "reach", lt, { k: 0.4 + 0.6 * ease(r), fear: 1, noBlink: true });
        const lk = bed.lock.getWorldPosition(V(0, 0, 0)), hp = bed.jay.J["hand-1"].getWorldPosition(V(0, 0, 0)); bed.jay.root.position.z += lk.z - hp.z; bed.jay.root.position.x += Math.min(0, lk.x - 0.07 - hp.x);
        aim(bed.camera, lk.clone().add(V(lerp(-0.5, -0.42, clamp((lt - A) / (B - A))), 0.1, 0.36)), lk.clone().add(V(-0.04, -0.02, -0.03)), 38);
      } else if (lt < C) {   // the monitor and the lamp go off
        bed.jay.root.position.set(-0.2, 0, -0.9); bed.jay.root.rotation.set(0, Math.PI, 0); pose(bed.jay, "reach", lt, { k: 1, fear: 1 }); aim(bed.camera, V(0.55, 1.35, -0.55), V(-0.05, 1.12, -1.8), 46);
      } else {   // the bat by the end of the bed
        const r = clamp((lt - C) / (grabAt - C)); bed.jay.root.position.set(2.05, 0, 2.35); bed.jay.root.rotation.set(0, 2.45, 0); pose(bed.jay, "reach", lt, { k: 0.5 + 0.5 * r, fear: 1, noBlink: true, pitch: 0.3 });
        const hp = bed.jay.J["hand-1"].getWorldPosition(V(0, 0, 0)); bed.jay.root.position.x += (2.3 - hp.x) * 0.9; bed.jay.root.position.z += (1.95 - hp.z) * 0.9;
        aim(bed.camera, V(2.3, 1.05, 1.0), V(2.2, 0.98, 2.25), 55);   // from over the bed: the bat in his flashlight
      }
      if (lt > grabAt) holdBat(0.4); else { bed.bat.position.set(2.42, 0.02, 1.9); bed.bat.rotation.set(0, 0, 0.18); }
      oneHand(bed.jay, phone); phone.userData.set({ bright: off ? 0.7 : 0.5, torchOn: lt > C }); ui.draw({ mode: "thread", clock: "3:03", messages: msgs([T1, ME, T2, T3]), t });
      hand(bed.camera, 0.01, t);
      return { set: bed, exposure: lt > A && lt < B ? 0.8 : 1, fx: { vignette: 0.75, flash: lt > offAt - 0.05 && lt < offAt + 0.05 ? 0.15 : 0 } };
    },
    "txt4"(lt, s, t) {   // hiding behind the bed in the dark with the bat; "I'm in your house."; the pans
      const bz = 0.55, show = clamp((lt - 0.75) / 0.35), clang = 2.6;
      bed.update(lt, darkRoom({ locked: true })); renderGame(t); bed.chair.position.copy(CHAIR); bed.chair.rotation.y = Math.PI / 2;
      bed.jay.root.position.copy(HIDE); bed.jay.root.rotation.set(0, HIDE_RY, 0); pose(bed.jay, "crouch", lt, { k: 1, fear: 1, noBlink: true, yaw: lt > clang ? 0.55 * clamp((lt - clang) / 0.2) : 0 });
      inHands(bed.jay, phone, 0.05); phone.userData.set({ bright: 1.1 }); buzz(phone, lt, bz, 0.5); holdBat(0.6);
      ui.draw({ mode: "thread", clock: "3:04", messages: msgs(show > 0 ? [T1, ME, T2, T3, T4] : [T1, ME, T2, T3], show > 0 ? show : 1), t });
      const f = V(Math.sin(HIDE_RY), 0, Math.cos(HIDE_RY));
      if (lt < 0.55) { aim(bed.camera, HIDE.clone().addScaledVector(f, -1.35).add(V(0.25, 1.45, 0.2)), V(2.55, 0.8, -1.3), 52); hand(bed.camera, 0.004, t); }   // over his shoulder: the door
      else if (lt < clang - 0.2) screenCam(bed.camera, phone, t, { rig: bed.jay });
      else { const h = headPos(bed.jay); aim(bed.camera, h.clone().addScaledVector(f, 1.15).add(V(0.15, 0.08, 0.15)), V(h.x, h.y - 0.04, h.z), 46); const sh = clamp(1 - (lt - clang) / 0.7); bed.camera.position.x += Math.sin(lt * 47) * 0.03 * sh; bed.camera.position.y += Math.sin(lt * 39) * 0.02 * sh; }
      return { set: bed, fx: { vignette: 0.8, flash: lt > clang && lt < clang + 0.08 ? 0.12 : 0 } };
    },
    "kitchen"(lt, s, t) {   // down the stairs with the flashlight; the pans on the floor; nobody
      const run = s.L("j05") - 0.3, st = house.stairs, j = house.jay.root;
      house.update(t, { fallen: 1, sinceFall: lt + 1.4, roomDoor: lt < run ? 1 : 1, roomLit: 0 });
      phone2.userData.set({ bright: 0.6, torchOn: true });
      if (lt < run) {   // one step at a time, the flashlight shaking
        const k = clamp(lt / run), kk = k * 0.85 + ease(k) * 0.15, z = lerp(-6.4, 0.6, kk), y = z < st.topZ ? 3.0 : z > st.bottomZ ? 0 : 3.0 * (z - st.bottomZ) / (st.topZ - st.bottomZ);
        j.position.set(lerp(1.6, 2.75, clamp((z + 6.4) / 1.6)), y, z); j.rotation.set(0, Math.sin(lt * 0.7) * 0.12, 0); pose(house.jay, "torch", lt, { walk: lt * 3.4, fear: 1, pitch: 0.2, yaw: Math.sin(lt * 0.9) * 0.25 }); house.jay.J.spine.rotation.x += 0.2;
        oneHand(house.jay, phone2); phone2.rotateY(Math.sin(lt * 0.9) * 0.25 + Math.sin(lt * 13) * 0.012); phone2.rotateX(-0.12 + Math.sin(lt * 11) * 0.01);
        if (lt < run * 0.55) { aim(house.camera, V(j.position.x - 0.25, y + 1.55, Math.max(-7.3, z - 1.6)), V(j.position.x + 0.05, y + 0.5, z + 3), 58); hand(house.camera, 0.008, t); }   // behind him, at the top
        else { const k2 = clamp((lt - run * 0.55) / (run * 0.45)); aim(house.camera, V(2.45, 1.05, lerp(1.25, 1.15, k2)), V(j.position.x, y + 1.25, z), 50); hand(house.camera, 0.004, t); }   // from the foot of the stairs: his light coming down
      } else if (lt < s.L("n06") - 0.15) {   // "Hello? Is someone there?"
        const u = lt - run, k = clamp(u / (s.L("n06") - 0.15 - run)); j.position.set(lerp(2.4, 1.5, ease(k)), 0, lerp(0.7, 1.0, ease(k))); j.rotation.set(0, lerp(-0.3, -0.75, ease(k)) + Math.sin(u * 1.7) * 0.3, 0);
        pose(house.jay, "torch", lt, { walk: k < 0.7 ? u * 5 : 0, fear: 1, yaw: Math.sin(u * 1.7) * 0.3 }); oneHand(house.jay, phone2);
        aim(house.camera, V(j.position.x + 0.85, 1.95, j.position.z - 1.35), V(j.position.x - 0.7, 0.45, j.position.z + 2.4), 54); hand(house.camera, 0.006, t);
      } else if (lt < s.L("n06") + 1.3) {   // "The pans were on the floor."
        const u = lt - s.L("n06"); j.position.set(1.5, 0, 1.0); j.rotation.set(0, -0.75 + Math.sin(u * 1.2) * 0.12, 0); pose(house.jay, "torch", lt, { fear: 1, pitch: 0.4 }); oneHand(house.jay, phone2); phone2.rotateX(-0.35);
        aim(house.camera, V(lerp(-1.32, -1.25, clamp(u / 1.4)), 0.32, 2.28), V(0.5, 0.1, 1.45), 50);   // low, from the stove side: the pans, his light beyond hand(house.camera, 0.003, t);
      } else {   // "The kitchen was empty."
        const u = lt - s.L("n06") - 1.3; j.position.set(1.5, 0, 1.0); j.rotation.set(0, -0.75 + Math.sin(u * 0.9) * 0.5, 0); pose(house.jay, "torch", lt, { fear: 1 }); oneHand(house.jay, phone2);
        aim(house.camera, V(-1.75, 2.35, lerp(5.2, 5.05, clamp(u / 1.6))), V(1.0, 0.7, 0.9), 50);
      }
      ui.draw({ mode: "thread", clock: "3:04", messages: msgs([T1, ME, T2, T3, T4]), t });
      return { set: house, fx: { vignette: 0.8 } };
    },
    "txt5"(lt, s, t) {
      const bz = 0.4, show = clamp((lt - 0.6) / 0.35), j = house.jay.root;
      house.update(t, { fallen: 1, sinceFall: lt + 12 }); j.position.set(1.2, 0, 1.6); j.rotation.set(0, -1.1, 0);
      pose(house.jay, "text", lt, { fear: 1, noBlink: true, pitch: 0.35 }); inHands(house.jay, phone2); phone2.userData.set({ bright: 1.1, torchOn: false }); buzz(phone2, lt, bz, 0.5);
      ui.draw({ mode: "thread", clock: "3:05", messages: msgs(show > 0 ? [T1, ME, T2, T3, T4, T5] : [T1, ME, T2, T3, T4], show > 0 ? show : 1), t });
      if (lt < s.L("j06") - 0.1) screenCam(house.camera, phone2, t, { rig: house.jay });
      else { const h = headPos(house.jay); aim(house.camera, V(h.x - 0.82, h.y + 0.06, h.z + 0.76), V(h.x, h.y - 0.03, h.z), 42); hand(house.camera, 0.008, t); }
      return { set: house, fx: { vignette: 0.8 } };
    },
    "freeze"(lt, s, t) {   // slowly back up; into his room; the flashlight finds nothing; he shuts the door and breathes... and turns around
      const up = UP, J9 = s.L("j09"), JUMP = J9 + line("j09").edur + 0.9, F = JUMP + 0.42, tt = Math.min(lt, F);   // after F everything holds still
      if (tt < up) {   // back up the stairs, one step at a time
        const k = clamp(tt / up), st = house.stairs, z = lerp(0.6, -6.9, k * 0.85 + ease(k) * 0.15), y = z < st.topZ ? 3.0 : z > st.bottomZ ? 0 : 3.0 * (z - st.bottomZ) / (st.topZ - st.bottomZ), j = house.jay.root;
        house.update(t, { fallen: 1, sinceFall: 20, roomDoor: 0.22, roomLit: 0.35 }); j.position.set(lerp(2.75, 1.6, clamp((z + 4.9) / -1.8)), y, z); j.rotation.set(0, Math.PI + Math.sin(tt * 0.7) * 0.1, 0);
        pose(house.jay, "torch", tt, { walk: tt * 3.2, fear: 1, pitch: 0.05 }); house.jay.J.spine.rotation.x += 0.18; oneHand(house.jay, phone2); phone2.rotateY(Math.sin(tt * 13) * 0.012); phone2.userData.set({ bright: 0.6, torchOn: true });
        if (tt < up * 0.5) { aim(house.camera, V(2.55, Math.max(0, y) + 1.0, Math.min(1.5, z + 2.6)), V(j.position.x, y + 1.3, z - 2), 56); hand(house.camera, 0.006, t); }   // from below and behind
        else { const k2 = clamp((tt - up * 0.5) / (up * 0.5)); aim(house.camera, V(lerp(1.2, 1.25, k2), 4.55, -7.2), V(j.position.x, y + 1.1, z), 52); hand(house.camera, 0.003, t); }   // from the landing, by his door: him coming up
        return { set: house, fx: { vignette: 0.82 } };
      }
      const u = tt - up, A = 1.5, B = 3.0, C = 4.3, j = bed.jay.root;   // A: the door opens, he comes in; B: the flashlight sweeps the room; C: he shuts the door
      bed.chair.position.set(0.55, 0, 0.9); bed.chair.rotation.y = 0.8;
      man.root.position.copy(CORNER); man.root.rotation.y = -0.36;   // the corner behind the door. He's only there when Jay looks away (the rule of The Endless Halls)
      if (u < A) {   // the door swings in, his light first, then him
        const k = clamp(u / A); bed.update(tt, darkRoom({ doorOpen: ease(clamp(k * 1.4)), doorIn: true, locked: false, room: 0.55 }));
        j.position.set(lerp(3.1, 2.05, ease(clamp((u - 0.5) / 1.0))), 0, -1.22); j.rotation.set(0, -Math.PI / 2, 0); pose(bed.jay, "torch", tt, { walk: u * 3.2, fear: 1 }); oneHand(bed.jay, phone); phone.userData.set({ bright: 0.5, torchOn: true });
        man.pose({ tilt: 0.25, hunch: 0.15 }); aim(bed.camera, V(0.15, 1.42, 0.55), V(2.4, 1.15, -1.25), 46); hand(bed.camera, 0.003, t);
        return { set: bed, fx: { vignette: 0.85 } };
      }
      if (u < B) {   // his eyes: the flashlight across the bed, the desk, the window. Nobody.
        const k = clamp((u - A) / (B - A)); bed.update(tt, darkRoom({ doorOpen: 1, doorIn: true, locked: false, room: 0.55 }));
        j.position.set(2.05, 0, -1.22); j.rotation.set(0, -Math.PI / 2, 0); pose(bed.jay, "torch", tt, { fear: 1 }); bed.jay.J.head.visible = false;
        const eye = V(2.05, 1.42, -1.15), look = new THREE.Vector3().lerpVectors(V(1.6, 0.55, 1.4), V(-2.2, 1.3, -0.9), ease(k)); look.y += Math.sin(k * Math.PI) * 0.35;
        aim(bed.camera, eye, look, 58); hand(bed.camera, 0.006, t);
        phone.position.copy(eye).add(V(-0.25, -0.32, 0.12)); phone.lookAt(phone.position.clone().add(phone.position.clone().sub(look).normalize())); phone.userData.set({ bright: 0.5, torchOn: true });
        man.pose({ tilt: 0.25, hunch: 0.15 });
        return { set: bed, fx: { vignette: 0.85 } };
      }
      if (u < C) {   // he turns back and eases the door shut. The corner behind it is black.
        const k = clamp((u - B) / (C - B)); bed.update(tt, darkRoom({ doorOpen: 1 - ease(clamp((k - 0.2) / 0.8)), doorIn: true, locked: false, room: 0.55 }));
        j.position.set(1.88, 0, -1.02); j.rotation.set(0, lerp(-Math.PI / 2, Math.PI / 2, ease(clamp(k / 0.3))), 0); pose(bed.jay, "reach", tt, { k: clamp((k - 0.15) / 0.3), fear: 0.9 }); oneHand(bed.jay, phone); phone.userData.set({ bright: 0.4, torchOn: false });
        man.pose({ tilt: 0.25, hunch: 0.15 }); aim(bed.camera, V(0.15, 1.42, 0.55), V(2.3, 1.2, -1.3), 46); hand(bed.camera, 0.003, t);
        return { set: bed, fx: { vignette: 0.88 } };
      }
      bed.update(tt, darkRoom({ doorOpen: 0, doorIn: true, locked: false, room: 0.5 }));
      if (tt < JUMP) {   // from the corner, above him: he leans his head on the door and breathes out... then slowly turns around
        const turn = ease(clamp((tt - (JUMP - 0.95)) / 0.9)); j.position.set(1.88, 0, -1.02); j.rotation.set(0, Math.PI / 2 - turn * 0.9, 0);
        pose(bed.jay, "reach", tt, { k: 0.55 * (1 - turn), fear: 0.55 + turn * 0.4, pitch: 0.35 * (1 - turn), yaw: -turn * 0.6, noBlink: turn > 0 }); bed.jay.J.spine.rotation.x += 0.15 * (1 - turn);
        oneHand(bed.jay, phone); phone.userData.set({ bright: 0.35, torchOn: false }); man.root.visible = false;   // (the camera is where he stands)
        const h = headPos(bed.jay), k = clamp((tt - up - C) / (JUMP - up - C)); aim(bed.camera, V(lerp(2.3, 2.27, k), lerp(2.3, 2.2, k), lerp(-1.78, -1.72, k)), V(h.x, h.y - 0.1, h.z), 50);   // where he is standing
        faceFill.position.set(h.x + 0.3, h.y - 0.3, h.z + 0.1); faceFill.intensity = 0.5;
        return { set: bed, fx: { vignette: 0.9 } };
      }
      // JUMP: his eyes, his light swinging up into the face right there. It lunges.
      manDark(false); man.root.visible = true;
      const v = clamp((tt - JUMP) / 0.3), lunge = 1 - Math.pow(1 - v, 3); j.position.set(1.88, 0, -1.02); j.rotation.set(0, -0.1, 0); pose(bed.jay, "torch", tt, { fear: 1 }); bed.jay.J.head.visible = false;
      man.pose({ tilt: 0.15, turn: 0, hunch: 0.25 + 0.5 * lunge, reach: 0.9 * lunge }); man.J["shoulder-1"].rotation.x = -1.1 * lunge; man.J.mouth.scale.set(1 + 0.7 * lunge, 2.4 + 2.2 * lunge, 0.5);
      man.root.position.copy(CORNER).add(V(-0.05, 0, 0.18 * lunge));
      const eye = V(1.93, 1.43, -1.0), face = man.J.head.getWorldPosition(V(0, 0, 0)); aim(bed.camera, eye, face.clone().add(V(0, -0.02, 0)), 62);
      const sh = clamp(1 - v * 0.6); bed.camera.position.x += Math.sin(t * 61) * 0.035 * sh; bed.camera.position.y += Math.sin(t * 53) * 0.03 * sh; bed.camera.rotation.z += Math.sin(t * 37) * 0.05 * sh;
      phone.position.copy(eye).add(V(0.12, -0.34, -0.12)); phone.lookAt(phone.position.clone().add(phone.position.clone().sub(face).normalize())); phone.userData.set({ bright: 0.4, torchOn: true });
      moonFill.position.copy(eye).add(V(0.05, -0.45, -0.05)); moonFill.target.position.copy(face); moonFill.intensity = 5;   // the flashlight on his face, from below
      const frozen = lt >= F;
      return { set: bed, fx: { vignette: 0.9, flash: tt - JUMP < 0.07 ? 0.5 : 0, chroma: frozen ? 0 : clamp(1 - (tt - JUMP) / 0.3), paused: frozen ? clamp((lt - F) / 0.15) : 0, gray: frozen ? 0.5 : 0, red: frozen ? 0.06 : 0 }, state: frozen ? { cta: ctaTimes() } : {} };
    },
  };
  let ctaCache = null;
  function ctaTimes() {
    if (ctaCache) return ctaCache;
    const a = line("n09"), b = line("n10"), wt = (l, re) => (l.words.find((w) => re.test(w.w)) || l.words[0]).t;
    return (ctaCache = { freeText: "TONS OF FREE GAMES", t17: a.t, tFree: wt(a, /^tons|free/i), genres: [1e9, 1e9, 1e9, 1e9], t18: b.t + 0.2, tPc: wt(b, /^play/i), t19: tl.duration + 10 });
  }
  const route = (sh, lt, t) => {   // reset the props every frame so any frame renders the same on its own
    bed.jay.J.head.visible = true; house.jay.J.head.visible = true; man.root.visible = false; moonFill.intensity = 0; manDark(true);
    bed.chair.position.set(0, 0, -0.45); bed.chair.rotation.set(0, 0, 0); bed.chair.visible = true; faceFill.intensity = 0; bed.bat.position.set(2.42, 0.02, 1.9); bed.bat.rotation.set(0, 0, 0.18);
    return (S[sh.id] || S["bed-play"])(lt, sh, t);
  };
  route.sets = { bed, halls, out, house, man };
  return route;
}
