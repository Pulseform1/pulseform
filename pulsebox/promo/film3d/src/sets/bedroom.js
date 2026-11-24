// Jay's bedroom at 3:07 AM (and at dawn): moonlight through the blinds, the monitor showing Pulsebox.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { makeJay } from "../jay.js";
import { PulseboxScreen, gameTile, radialGlow } from "../textures.js";
import { glowSprite } from "./common.js";

RectAreaLightUniformsLib.init();
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
function planks() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 512; const g = c.getContext("2d");
  for (let i = 0; i < 8; i++) { g.fillStyle = ["#4a3326", "#3f2b20", "#523a2b", "#46301f"][i % 4]; g.fillRect(0, i * 64, 512, 64); g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(0, i * 64, 512, 3); for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; g.fillRect(Math.random() * 512, i * 64 + Math.random() * 64, 60 + Math.random() * 120, 2); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
}

export function createBedroom({ headset = false, lamp = false } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07060e); scene.fog = new THREE.Fog(0x0a0816, 4, 14);
  const camera = new THREE.PerspectiveCamera(42, 1080 / 1920, 0.05, 60);
  // room
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), std(0xffffff, { map: planks(), roughness: 0.65 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallM = std(0x2b2446, { roughness: 0.95 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.2), wallM); back.position.set(0, 1.6, -2.1); back.receiveShadow = true; scene.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.2), wallM); left.rotation.y = Math.PI / 2; left.position.set(-2.4, 1.6, 0); left.receiveShadow = true; scene.add(left);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.2), wallM); right.rotation.y = -Math.PI / 2; right.position.set(2.6, 1.6, 0); right.receiveShadow = true; scene.add(right);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), std(0x1a1628)); ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.2; scene.add(ceil);
  // the window with blinds on the left wall; moonlight slices through them
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.3), new THREE.MeshBasicMaterial({ color: 0x3a5ab8 })); win.rotation.y = Math.PI / 2; win.position.set(-2.39, 1.75, -0.6); scene.add(win);
  const slatM = std(0xc8c4d8, { roughness: 0.6 });
  for (let i = 0; i < 13; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.045, 1.5), slatM); s.position.set(-2.33, 1.15 + i * 0.1, -0.6); s.rotation.z = 0.5; s.castShadow = true; scene.add(s); }
  const moon = new THREE.SpotLight(0x8fb0ff, 160, 14, 0.38, 0.35, 1.2); moon.position.set(-5.2, 3.2, -0.4); moon.target.position.set(0.2, 0.4, -0.2); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024); moon.shadow.bias = -0.0004; scene.add(moon, moon.target);
  // desk, monitor, keyboard, mouse, mug
  const deskM = std(0x1a1622, { roughness: 0.5 });
  const top = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.06, 0.8, 3, 0.02), deskM); top.position.set(0, 0.76, -1.6); top.castShadow = top.receiveShadow = true; scene.add(top);
  for (const x of [-1.0, 1.0]) for (const z of [-1.9, -1.3]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.76, 0.05), deskM); l.position.set(x, 0.38, z); scene.add(l); }
  const screen = new PulseboxScreen();
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(1.18, 0.72, 0.05, 3, 0.02), std(0x050508, { roughness: 0.3, metalness: 0.4 })); bezel.position.set(0, 1.2, -1.82); bezel.castShadow = true; scene.add(bezel);
  const scrMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: screen.texture, emissiveIntensity: 1.25, roughness: 0.25 });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.6875), scrMat); scr.position.set(0, 1.2, -1.793); scene.add(scr);
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3), std(0x0a0a10, { metalness: 0.6, roughness: 0.3 })); stand.position.set(0, 0.92, -1.86); scene.add(stand);
  const foot = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.02, 0.22, 2, 0.01), std(0x0a0a10, { metalness: 0.6, roughness: 0.3 })); foot.position.set(0, 0.8, -1.82); scene.add(foot);
  const screenLight = new THREE.RectAreaLight(0x9aa8ff, 4, 1.1, 0.69); screenLight.position.set(0, 1.2, -1.76); screenLight.lookAt(0, 1.2, 1); scene.add(screenLight);
  const kb = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.03, 0.2, 2, 0.01), std(0x101018, { roughness: 0.4 })); kb.position.set(-0.05, 0.805, -1.38); scene.add(kb);
  const rgb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.006, 0.005), new THREE.MeshBasicMaterial({ color: 0xff3df0 })); rgb.position.set(-0.05, 0.805, -1.275); scene.add(rgb);
  const mouse = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.05, 4, 12), std(0x101018, { roughness: 0.3 })); mouse.rotation.x = Math.PI / 2; mouse.scale.set(1, 1, 0.5); mouse.position.set(0.45, 0.8, -1.38); scene.add(mouse);
  const mouseGlow = new THREE.Mesh(new THREE.SphereGeometry(0.012), new THREE.MeshBasicMaterial({ color: 0x3de0ff })); mouseGlow.position.set(0.45, 0.82, -1.36); scene.add(mouseGlow);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.11, 20), std(0xc6ff3d, { roughness: 0.4 })); mug.position.set(0.85, 0.845, -1.5); mug.castShadow = true; scene.add(mug);
  // posters: Pulsebox games
  [["Hyperlane", -1.15], ["Deep Signal", 1.2], ["The Endless Halls", -0.1]].forEach(([name, x], i) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), new THREE.MeshStandardMaterial({ map: gameTile(name, { w: 256, h: 384 }), roughness: 0.7 })); p.position.set(x, i === 2 ? 2.45 : 2.15, -2.09); if (i === 2) p.scale.setScalar(0.75); scene.add(p);
  });
  // the gaming chair
  const chairM = std(0x14121c, { roughness: 0.55 }), accent = std(0xff7426, { roughness: 0.6 });
  const chair = new THREE.Group(); chair.position.set(0, 0, -0.45); scene.add(chair);
  const seat = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.12, 0.6, 4, 0.05), chairM); seat.position.y = 0.5; chair.add(seat);
  const backrest = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.95, 0.12, 4, 0.06), chairM); backrest.position.set(0, 1.05, 0.3); backrest.rotation.x = -0.12; chair.add(backrest);
  const stripe = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.9, 0.13, 3, 0.05), accent); stripe.position.set(0, 1.05, 0.301); stripe.rotation.x = -0.12; chair.add(stripe);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42), std(0x2a2a30, { metalness: 0.7, roughness: 0.3 })); post.position.y = 0.24; chair.add(post);
  for (let i = 0; i < 5; i++) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.32), std(0x1a1a20, { metalness: 0.6, roughness: 0.4 })); leg.position.set(Math.sin(i * 1.256) * 0.16, 0.05, Math.cos(i * 1.256) * 0.16); leg.rotation.y = i * 1.256; chair.add(leg); }
  chair.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // bed and a shelf
  const bed = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.45, 2.2, 4, 0.08), std(0x2a2240)); bed.position.set(1.85, 0.25, 0.6); bed.receiveShadow = bed.castShadow = true; scene.add(bed);
  const blanket = new THREE.Mesh(new RoundedBoxGeometry(1.32, 0.12, 1.4, 4, 0.06), std(0x5a2a6a, { roughness: 0.95 })); blanket.position.set(1.85, 0.5, 0.95); blanket.rotation.z = 0.03; blanket.castShadow = true; scene.add(blanket);
  const pillow = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.14, 0.4, 4, 0.07), std(0xd8d4e8)); pillow.position.set(1.85, 0.53, -0.25); scene.add(pillow);
  // Jay
  const jay = makeJay({ headset }); jay.root.rotation.y = Math.PI; jay.root.position.set(0, 0, -0.45); jay.root.scale.setScalar(0.78); scene.add(jay.root);
  const deskLamp = new THREE.Group(); deskLamp.position.set(-0.85, 0.79, -1.7); deskLamp.visible = lamp; scene.add(deskLamp);
  { const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.03, 16), std(0x1a1a20, { metalness: 0.6 })); deskLamp.add(base);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42), std(0x1a1a20)); arm.position.set(0, 0.21, 0); deskLamp.add(arm);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.12, 20, 1, true), std(0x1a1a20, { side: THREE.DoubleSide })); shade.position.set(0.05, 0.42, 0.04); shade.rotation.z = -0.5; deskLamp.add(shade); }
  const lampLight = new THREE.PointLight(0xffc890, 0, 4, 1.6); lampLight.position.set(-0.8, 1.15, -1.6); scene.add(lampLight);
  const lampBulb = glowSprite(0xffd8a0, 0.25, 0.9); lampBulb.position.set(-0.8, 1.18, -1.64); lampBulb.visible = false; scene.add(lampBulb);
  const bat = new THREE.Group(); bat.position.set(2.42, 0.02, 1.9); bat.rotation.z = 0.18; scene.add(bat);
  { const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.014, 0.82, 16), std(0xb8925a, { roughness: 0.5 })); shaft.position.y = 0.41; bat.add(shaft);
    const knobB = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12), std(0x3a2a1a)); knobB.position.y = 0.0; bat.add(knobB);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.22, 12), std(0x1a1a1e)); grip.position.y = 0.11; bat.add(grip); bat.traverse((o) => { if (o.isMesh) o.castShadow = true; }); }
  // light: a dim fill, a purple rim from behind
  const hemi = new THREE.HemisphereLight(0x3a3a7a, 0x120a10, 0.35); scene.add(hemi);
  const rim = new THREE.PointLight(0xa24aff, 6, 6, 2); rim.position.set(0.8, 2.2, 1.2); scene.add(rim);
  // his phone on the desk (it rings at dawn) and the bedroom door on the right wall (light under it)
  const phoneC = document.createElement("canvas"); phoneC.width = 128; phoneC.height = 256; { const g = phoneC.getContext("2d"); g.fillStyle = "#0b0d1a"; g.fillRect(0, 0, 128, 256); g.fillStyle = "#7a4dff"; g.beginPath(); g.arc(64, 80, 30, 0, 7); g.fill();
    g.fillStyle = "#fff"; g.font = "700 26px Inter, sans-serif"; g.textAlign = "center"; g.fillText("M", 64, 90); g.fillText("Maya", 64, 150); g.font = "500 14px Inter, sans-serif"; g.fillStyle = "#9aa3c7"; g.fillText("calling...", 64, 172); g.fillStyle = "#28c840"; g.beginPath(); g.arc(64, 218, 18, 0, 7); g.fill(); }
  const phoneScr = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: new THREE.CanvasTexture(phoneC), emissiveIntensity: 0 }); phoneScr.emissiveMap.colorSpace = THREE.SRGBColorSpace;
  const phone = new THREE.Group(); phone.position.set(-0.72, 0.795, -1.42); phone.rotation.y = 0.3; scene.add(phone);
  const phoneBody = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.012, 0.16, 2, 0.006), std(0x15151c, { roughness: 0.3 })); phone.add(phoneBody);
  const phoneFace = new THREE.Mesh(new THREE.PlaneGeometry(0.072, 0.148), phoneScr); phoneFace.rotation.x = -Math.PI / 2; phoneFace.position.y = 0.007; phone.add(phoneFace);
  const phoneGlow = new THREE.PointLight(0x9a8aff, 0, 1.2, 2); phoneGlow.position.y = 0.1; phone.add(phoneGlow);
  const doorG = new THREE.Group(); doorG.position.set(2.59, 0, -1.3); doorG.rotation.y = -Math.PI / 2; scene.add(doorG);
  const hinge = new THREE.Group(); hinge.position.set(-0.45, 0, 0); doorG.add(hinge);
  const doorP = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.05, 0.05), std(0xd8d0c8, { roughness: 0.7 })); doorP.position.set(0.45, 1.04, 0); doorP.castShadow = doorP.receiveShadow = true; hinge.add(doorP);
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.015), std(0xc8a24a, { metalness: 0.9, roughness: 0.25 })); lock.position.set(0.79, 1.12, 0.06); hinge.add(lock);
  for (const [w, h, x, y] of [[0.08, 2.2, -0.49, 1.1], [0.08, 2.2, 0.49, 1.1], [1.06, 0.08, 0, 2.15]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), std(0xbab0a6)); f.position.set(x, y, 0.01); doorG.add(f); }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), std(0xc8a24a, { metalness: 0.9, roughness: 0.25 })); knob.position.set(0.79, 1.0, 0.05); hinge.add(knob);
  const gapM = new THREE.MeshBasicMaterial({ color: 0xffe2b0 }); const gap = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.025), gapM); gap.position.set(0, 0.012, 0.03); doorG.add(gap);
  const feet = [-1, 1].map((s) => { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.03), new THREE.MeshBasicMaterial({ color: 0x050302 })); f.position.set(0.12 * s, 0.013, 0.031); doorG.add(f); return f; });
  const gapLight = new THREE.PointLight(0xffd8a0, 0, 2.2, 2); gapLight.position.set(2.2, 0.3, -1.3); scene.add(gapLight);
  const sun = new THREE.SpotLight(0xffa860, 0, 14, 0.42, 0.4, 1.2); sun.position.set(-5.2, 2.6, -0.5); sun.target.position.set(0.3, 0.6, -0.4); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); scene.add(sun, sun.target);
  // dust in the moonlight
  const N = 400, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pos[i * 3] = -2.2 + Math.random() * 3; pos[i * 3 + 1] = 0.3 + Math.random() * 2.6; pos[i * 3 + 2] = -1.8 + Math.random() * 2.6; }
  const dustG = new THREE.BufferGeometry(); dustG.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustG, new THREE.PointsMaterial({ size: 0.012, map: radialGlow(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xaab8ff, opacity: 0.8 })); scene.add(dust);

  return {
    scene, camera, jay, screen, phone, door: doorG, hinge, lock, chair, bat, scrMat, screenLight, deskLamp, bloom: { strength: 0.55, radius: 0.5, threshold: 0.7 },
    update(lt, p = {}) {
      dust.rotation.y = lt * 0.01; dust.position.y = Math.sin(lt * 0.3) * 0.05;
      const dawn = p.dawn ?? 0;
      moon.intensity = 160 * (1 - dawn); sun.intensity = 320 * dawn; moon.castShadow = dawn < 0.5; sun.castShadow = dawn >= 0.5;
      win.material.color.setRGB(0.23 + dawn * 0.9, 0.35 + dawn * 0.45, 0.72 - dawn * 0.4);
      scene.fog.color.setRGB(0.04 + dawn * 0.12, 0.03 + dawn * 0.07, 0.09);
      screenLight.intensity = (p.screenBright ?? 1) * 4; scrMat.emissiveIntensity = 1.25 * (p.screenBright ?? 1);
      screenLight.color.set(p.screenRed ? 0xff4a6a : 0x9aa8ff);
      if (!p.screenTex) { scrMat.emissiveMap = screen.texture; screen.draw({ t: lt, ...p.screen }); } else scrMat.emissiveMap = p.screenTex;
      hinge.rotation.y = (p.doorOpen ?? 0) * 1.5; lock.rotation.z = p.locked ? Math.PI / 2 : 0;
      lampLight.intensity = lamp ? (p.lampOn ?? 1) * 2.4 : 0; lampBulb.visible = lamp && (p.lampOn ?? 1) > 0.5;
      const room = p.room ?? 1; hemi.intensity = 0.35 * room; rim.intensity = 6 * room; moon.intensity *= room;   // "his room went dark"
      const ring = p.ring ?? 0; phoneScr.emissiveIntensity = ring * 1.2; phoneGlow.intensity = ring * 1.5 * (Math.sin(lt * 10) > 0 ? 1 : 0.6);
      const dg = p.doorGap ?? 0; gap.visible = dg > 0; gapM.color.setRGB(dg, dg * 0.88, dg * 0.7); gapLight.intensity = dg * 0.12; feet.forEach((f) => (f.visible = (p.feet ?? 0) > 0));
      if (jay.J.led) jay.J.led.material.color.set(p.led === 0 ? 0x111111 : p.led === 2 ? 0xff2a3a : 0x3dff7a);
    },
  };
}
