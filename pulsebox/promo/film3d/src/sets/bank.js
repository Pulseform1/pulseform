// The Vault (Safecracker): a bank at night. A marble lobby with pillars and a guard with a flashlight, a corridor of red
// lasers that change every three seconds, two security cameras, the round vault door (dial, wheel, bolts), the gold
// behind it, alarm beacons, a steel gate, and two doors out: a red one and a blue one.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { makeJay } from "../jay.js";
import { labelTexture, radialGlow } from "../textures.js";
import { glowSprite } from "./common.js";

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
const smooth = (k) => k * k * (3 - 2 * k), clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
function marble() {
  const c = document.createElement("canvas"); c.width = c.height = 512; const g = c.getContext("2d");
  g.fillStyle = "#cfc9bf"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(90,84,78,${0.08 + Math.random() * 0.18})`; g.lineWidth = 1 + Math.random() * 2.5; g.beginPath(); let x = Math.random() * 512, y = Math.random() * 512; g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (Math.random() - 0.4) * 140; y += (Math.random() - 0.5) * 140; g.lineTo(x, y); } g.stroke(); }
  g.strokeStyle = "rgba(40,36,32,.55)"; g.lineWidth = 3; g.strokeRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 20); t.anisotropy = 8; return t;
}
function dialFace() {
  const c = document.createElement("canvas"); c.width = c.height = 512; const g = c.getContext("2d");
  const gr = g.createRadialGradient(256, 256, 20, 256, 256, 256); gr.addColorStop(0, "#5a5e66"); gr.addColorStop(1, "#24262c"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.translate(256, 256); g.fillStyle = "#e8e4d8"; g.font = "700 34px 'Chakra Petch', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  for (let i = 0; i < 100; i++) { const a = (i / 100) * Math.PI * 2; g.save(); g.rotate(a); g.fillRect(-2, -240, 4, i % 5 ? 16 : 32); if (i % 10 === 0) g.fillText(String(i), 0, -186); g.restore(); }
  g.beginPath(); g.arc(0, 0, 110, 0, 7); g.fillStyle = "#33363e"; g.fill(); g.strokeStyle = "#8a8e98"; g.lineWidth = 6; g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function createBank() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x04050a); scene.fog = new THREE.Fog(0x06070d, 12, 44);
  const camera = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.05, 140);
  const box = (w, h, d, x, y, z, m, cast = true) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = cast; b.receiveShadow = true; scene.add(b); return b; };
  const wallM = std(0x2b2722, { roughness: 0.85 }), gold = std(0xb8934a, { metalness: 0.85, roughness: 0.3 }), steel = std(0x6c717a, { metalness: 0.85, roughness: 0.32 }), darkSteel = std(0x2a2d33, { metalness: 0.7, roughness: 0.4 });
  // ---- the lobby (z 3 .. -11)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 42), std(0xffffff, { map: marble(), roughness: 0.2, metalness: 0.05 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -16); floor.receiveShadow = true; scene.add(floor);
  box(0.3, 6, 14, -6.6, 3, -4, wallM); box(0.3, 6, 14, 6.6, 3, -4, wallM); box(13.4, 6, 0.3, 0, 3, 3.1, wallM);
  box(5.1, 6, 0.3, -4.05, 3, -11, wallM); box(5.1, 6, 0.3, 4.05, 3, -11, wallM); box(3, 2.8, 0.3, 0, 4.6, -11, wallM);
  box(13.4, 0.2, 14.2, 0, 6.1, -4, std(0x15130f), false);
  for (const x of [-3.3, 3.3]) for (const z of [0.4, -3.8, -8]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 5.6, 28), std(0xd7d0c4, { roughness: 0.35 })); p.position.set(x, 2.9, z); p.castShadow = p.receiveShadow = true; scene.add(p);
    box(1.1, 0.25, 1.1, x, 0.12, z, gold); box(1.1, 0.25, 1.1, x, 5.85, z, gold);
  }
  box(3.4, 1.1, 0.8, -4.3, 0.55, 1.2, std(0x3a2a1c, { roughness: 0.5 })); box(3.6, 0.08, 1.0, -4.3, 1.12, 1.2, std(0xe0dbd2, { roughness: 0.2 }));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.7), new THREE.MeshBasicMaterial({ map: labelTexture("FIRST PULSE BANK", { w: 1400, h: 210, px: 120, color: "#e8c77a" }), transparent: true }));
  sign.position.set(0, 5.1, -10.83); scene.add(sign);
  const winM = new THREE.MeshBasicMaterial({ color: 0x1a2a55 });
  for (const z of [-0.8, -5, -9.2]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.4), winM); w.rotation.y = Math.PI / 2; w.position.set(-6.43, 3.3, z); scene.add(w); }
  const moon = new THREE.SpotLight(0x8aa4ff, 260, 40, 0.7, 0.6, 1.2); moon.position.set(-11, 8, -4.5); moon.target.position.set(1, 0, -4.5); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024); moon.shadow.bias = -0.0005; scene.add(moon, moon.target);
  const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.24), new THREE.MeshBasicMaterial({ map: labelTexture("EXIT", { w: 512, h: 170, px: 120, color: "#5dff8a" }), transparent: true })); exitSign.position.set(-4.3, 3.6, 3.0); exitSign.rotation.y = Math.PI; scene.add(exitSign);
  scene.add(new THREE.HemisphereLight(0x46557a, 0x0a0a0c, 0.55));
  for (const z of [0.4, -3.8, -8]) { const l = new THREE.PointLight(0xffd8a0, 9, 11, 1.5); l.position.set(0, 5.6, z); scene.add(l); const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 20), new THREE.MeshBasicMaterial({ color: 0xffe2b8 })); lamp.position.set(0, 5.98, z); scene.add(lamp); }   // night lights, dimmed
  // ---- the laser corridor (z -11 .. -21)
  const corM = std(0x1c1d23, { roughness: 0.45, metalness: 0.35 });
  box(0.2, 3.2, 10, -1.6, 1.6, -16, corM); box(0.2, 3.2, 10, 1.6, 1.6, -16, corM); box(3.4, 0.2, 10, 0, 3.3, -16, corM, false);
  for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.18), new THREE.MeshBasicMaterial({ color: 0x8aa0c8 })); s.position.set(0, 3.19, -12 - i * 2); scene.add(s); }
  const corLight = new THREE.PointLight(0x9ab0d8, 6, 9, 1.4); corLight.position.set(0, 2.8, -14); scene.add(corLight);
  const camLight = new THREE.PointLight(0xaab8e0, 6, 6, 1.4); camLight.position.set(0, 2.5, -19.8); scene.add(camLight);
  const laserRed = new THREE.PointLight(0xff2030, 0, 6, 1.5); laserRed.position.set(0, 0.8, -16); scene.add(laserRed);
  const beamCore = new THREE.MeshBasicMaterial({ color: 0xff3040 }), beamGlow = new THREE.MeshBasicMaterial({ color: 0xff2030, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false });
  const lasers = [], PAT = [[0.25, 1.05, 0.55, 1.45, 0.3, 0.95, 0.5], [0.95, 0.35, 1.35, 0.6, 1.15, 0.4, 1.5]];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group(); g.position.set(0, PAT[0][i], -12.4 - i * 1.22); scene.add(g);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 3.0, 6), beamCore); core.rotation.z = Math.PI / 2; g.add(core);
    const halo = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.0, 10, 1, true), beamGlow); halo.rotation.z = Math.PI / 2; g.add(halo);
    for (const sx of [-1, 1]) { const em = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.1), darkSteel); em.position.x = 1.47 * sx; g.add(em); const sp = glowSprite(0xff3040, 0.25, 0.8); sp.position.x = 1.42 * sx; g.add(sp); }
    lasers.push(g);
  }
  // two cameras over the end of the corridor, sweeping
  const cams = [-1.3, 1.3].map((x) => {
    const pivot = new THREE.Group(); pivot.position.set(x, 3.0, -20.6); scene.add(pivot);
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.2, 0.42, 2, 0.04), std(0xdcdcdc, { roughness: 0.4 })); body.position.z = 0.16; pivot.add(body);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 18), std(0x050508, { roughness: 0.1, metalness: 0.5 })); lens.rotation.x = Math.PI / 2; lens.position.z = 0.39; pivot.add(lens);
    const ledM = new THREE.MeshBasicMaterial({ color: 0xff2030 }); const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), ledM); led.position.set(0.07, 0.07, 0.37); pivot.add(led);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 6, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3040, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.rotation.x = -Math.PI / 2; cone.position.z = 3.4; pivot.add(cone);
    return { pivot, ledM, cone };
  });
  // ---- the vault room (z -21 .. -31) and the chamber behind the door
  const vM = std(0x2d2f35, { roughness: 0.6, metalness: 0.4 });
  box(0.3, 5, 10, -5.15, 2.5, -26, vM); box(0.3, 5, 10, 5.15, 2.5, -26, vM); box(10.6, 0.2, 10.2, 0, 5.1, -26, std(0x1a1b1f), false);
  box(3.6, 5, 0.3, -3.3, 2.5, -21.15, vM); box(3.6, 5, 0.3, 3.3, 2.5, -21.15, vM); box(3.0, 1.8, 0.3, 0, 4.1, -21.15, vM);
  box(3.1, 5, 0.3, -3.45, 2.5, -31.2, vM); box(3.1, 5, 0.3, 3.45, 2.5, -31.2, vM); box(3.8, 0.8, 0.3, 0, 4.6, -31.2, vM); box(3.8, 0.3, 0.3, 0, 0.15, -31.2, vM);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.16, 16, 64), steel); frame.position.set(0, 2.3, -31.0); scene.add(frame);
  const roomLight = new THREE.PointLight(0xc8d0ff, 12, 13, 1.4); roomLight.position.set(0, 4.5, -25.5); scene.add(roomLight);
  const vaultLight = new THREE.SpotLight(0xdfe6ff, 40, 16, 0.5, 0.6, 1.3); vaultLight.position.set(0, 4.8, -25); vaultLight.target.position.set(0, 2.2, -31); vaultLight.castShadow = true; scene.add(vaultLight, vaultLight.target);
  // the door: hinged on its left edge, swings out into the room
  const hinge = new THREE.Group(); hinge.position.set(-1.95, 2.3, -30.72); scene.add(hinge);
  const door = new THREE.Group(); door.position.x = 1.95; hinge.add(door);
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 0.5, 64), steel); slab.rotation.x = Math.PI / 2; slab.castShadow = slab.receiveShadow = true; door.add(slab);
  for (const r of [1.7, 1.25]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 8, 64), darkSteel); ring.position.z = 0.26; door.add(ring); }
  const bolts = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 14), gold); b.position.set(Math.cos(a) * 1.92, Math.sin(a) * 1.92, 0); b.rotation.z = a - Math.PI / 2; door.add(b); bolts.push({ b, a }); }
  const dial = new THREE.Group(); dial.position.set(0, 0.62, 0.3); door.add(dial);
  const dialBody = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.12, 48), darkSteel); dialBody.rotation.x = Math.PI / 2; dial.add(dialBody);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.41, 48), new THREE.MeshStandardMaterial({ map: dialFace(), roughness: 0.4, metalness: 0.5 })); face.position.z = 0.065; dial.add(face);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.14, 24), steel); knob.rotation.x = Math.PI / 2; knob.position.z = 0.12; dial.add(knob);
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.02), new THREE.MeshBasicMaterial({ color: 0xff3d3d })); mark.position.set(0, 0.5, 0.31); door.add(mark);
  const wheel = new THREE.Group(); wheel.position.set(0, -0.55, 0.32); door.add(wheel);
  for (let i = 0; i < 3; i++) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 10), steel); sp.rotation.z = (i / 3) * Math.PI; wheel.add(sp); }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 20), gold); hub.rotation.x = Math.PI / 2; wheel.add(hub);
  // the chamber: shelves of gold
  box(4.4, 0.2, 5, 0, 4.4, -33.7, vM, false); box(0.2, 4.4, 5, -2.2, 2.2, -33.7, vM); box(0.2, 4.4, 5, 2.2, 2.2, -33.7, vM); box(4.4, 4.4, 0.2, 0, 2.2, -36.1, vM);
  const goldM = std(0xffc24a, { metalness: 0.95, roughness: 0.22, emissive: 0x3a2400 }), barG = new THREE.BoxGeometry(0.34, 0.1, 0.16);
  const bars = new THREE.InstancedMesh(barG, goldM, 420); { const m4 = new THREE.Matrix4(); let n = 0;
    for (const sx of [-1, 1]) for (let shelf = 0; shelf < 3; shelf++) for (let row = 0; row < 7; row++) for (let col = 0; col < 10 && n < 420; col++) {
      m4.makeTranslation(sx * (1.55 + (row % 2) * 0.02), 0.45 + shelf * 1.15 + row * 0.11, -31.8 - col * 0.38 - (row % 2) * 0.1); bars.setMatrixAt(n++, m4); }
    bars.count = n; } scene.add(bars);
  for (const sx of [-1, 1]) for (let shelf = 0; shelf < 3; shelf++) box(0.62, 0.05, 4.3, sx * 1.57, 0.37 + shelf * 1.15, -33.6, std(0x3a2a1a, { roughness: 0.6 }), false);   // the shelves
  const pile = new THREE.InstancedMesh(barG, goldM, 120); { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let n = 0;
    for (let lay = 0; lay < 6; lay++) for (let k = 0; k < 20 - lay * 3 && n < 120; k++) { e.set(0, (k % 2) * Math.PI / 2, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(-0.8 + (k % 5) * 0.4, 0.05 + lay * 0.1, -33.0 - Math.floor(k / 5) * 0.4), q, new THREE.Vector3(1, 1, 1)); pile.setMatrixAt(n++, m4); }
    pile.count = n; } scene.add(pile);
  const goldLight = new THREE.PointLight(0xffc06a, 0, 9, 1.3); goldLight.position.set(0, 3.2, -33.5); scene.add(goldLight);
  const goldGlow = glowSprite(0xffc870, 6, 0); goldGlow.position.set(0, 2.2, -31.6); scene.add(goldGlow);
  // the alarm: four red beacons, a red wash, a steel gate that drops behind him, the two doors
  const beacons = [[-4.6, -21.8], [4.6, -21.8], [-4.6, -30.3], [4.6, -30.3]].map(([x, z]) => {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x401014 })); dome.rotation.x = Math.PI; dome.position.set(x, 4.98, z); scene.add(dome);
    const sl = new THREE.SpotLight(0xff1a2a, 0, 14, 0.42, 0.4, 1.2); sl.position.set(x, 4.8, z); scene.add(sl, sl.target); return { dome, sl, x, z };
  });
  const redWash = new THREE.PointLight(0xff2030, 0, 16, 1.2); redWash.position.set(0, 4.3, -26); scene.add(redWash);
  const gate = new THREE.Group(); gate.position.set(0, 4.8, -21.0); scene.add(gate);
  for (let i = 0; i < 12; i++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.24, 0.06), steel); sl.position.y = -1.5 + i * 0.27; gate.add(sl); }
  const exits = [["red", -1, 0xd8263a], ["blue", 1, 0x2a6bff]].map(([name, sx, col]) => {
    const g = new THREE.Group(); g.position.set(3.2 * sx, 0, -21.32); g.rotation.y = Math.PI; scene.add(g);   // on the wall he came in through, either side of the gate
    const panel = new THREE.Mesh(new RoundedBoxGeometry(1.3, 2.5, 0.1, 2, 0.03), std(col, { roughness: 0.45, metalness: 0.2, emissive: col, emissiveIntensity: 0 })); panel.position.set(0, 1.27, 0.05); panel.castShadow = true; g.add(panel);
    const frameM = new THREE.MeshBasicMaterial({ color: col }); for (const [w, h, x, y] of [[0.08, 2.7, -0.71, 1.35], [0.08, 2.7, 0.71, 1.35], [1.5, 0.08, 0, 2.7]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), frameM); f.position.set(x, y, 0.08); g.add(f); }
    const knobD = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), gold); knobD.position.set(0.5, 1.2, 0.13); g.add(knobD);
    const q = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: labelTexture("?", { w: 256, h: 256, px: 220, color: name === "red" ? "#ff6a7a" : "#7aa8ff" }), transparent: true, opacity: 0 })); q.position.set(0, 3.25, 0.06); g.add(q);
    const light = new THREE.PointLight(col, 0, 6, 1.4); light.position.set(0, 1.8, 0.9); g.add(light);
    return { g, panel, frameM, q, light, col };
  });
  // ---- Jay (beanie, backpack) and the guard (cap, flashlight)
  const jay = makeJay(); scene.add(jay.root);
  { const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.345, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), std(0x16161c, { roughness: 0.95 })); beanie.position.y = 0.04; beanie.rotation.x = -0.12; jay.J.head.add(beanie);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.05, 8, 28), std(0x16161c, { roughness: 0.95 })); cuff.rotation.x = Math.PI / 2 - 0.12; cuff.position.y = 0.06; jay.J.head.add(cuff);
    const pack = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.5, 0.2, 3, 0.06), std(0x1b1b22, { roughness: 0.8 })); pack.position.set(0, 0.3, -0.3); jay.J.spine.add(pack);
    jay.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); }
  const guard = makeJay({ variant: "guard" }); scene.add(guard.root);
  { const capM = std(0x1a2440, { roughness: 0.6 }); const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.33, 0.16, 24), capM); crown.position.y = 0.3; guard.J.head.add(crown);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 24, 1, false, -Math.PI / 2, Math.PI), capM); brim.position.set(0, 0.23, 0.22); guard.J.head.add(brim);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.02), gold); badge.position.set(0.14, 0.42, 0.22); guard.J.spine.add(badge);
    guard.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); }
  const torch = new THREE.Group(); scene.add(torch);
  const torchBody = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.24, 12), std(0x111114)); torchBody.rotation.x = Math.PI / 2; torch.add(torchBody);
  const torchL = new THREE.SpotLight(0xfff1d6, 60, 16, 0.34, 0.5, 1.3); torchL.position.z = 0.14; torchL.target.position.z = 3; torch.add(torchL, torchL.target); torchL.castShadow = true; torchL.shadow.mapSize.set(512, 512);
  const bc = document.createElement("canvas"); bc.width = 4; bc.height = 256; { const x = bc.getContext("2d"), gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,240,210,.07)"); gr.addColorStop(1, "rgba(255,240,210,0)"); x.fillStyle = gr; x.fillRect(0, 0, 4, 256); }
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.0, 5, 24, 1, true), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beam.rotation.x = -Math.PI / 2; beam.position.z = 2.6; torch.add(beam);

  const P = { lobby: new THREE.Vector3(0, 0, -4), corridorStart: -11.6, corridorEnd: -20.4, vault: new THREE.Vector3(0, 0, -28.3), exits: exits.map((e) => e.g.position.clone()) };
  return {
    scene, camera, jay, guard, torch, lasers, cams, hinge, dial, wheel, exits, gate, P, bloom: { strength: 0.6, radius: 0.5, threshold: 0.8 },
    // laserT: seconds into the laser run (the pattern changes every 3 s); camFrozen: 0..1; dial: radians; bolts: 0 locked .. 1 drawn in;
    // doorOpen 0..1; gold 0..1 (its glow); alarm 0..1 (beacons spin, red wash); gate 0 up .. 1 down; doorsLit 0..1
    update(t, { laserT = 0, lasersOn = 1, camFrozen = 0, camSweep = true, dial: dialA = 0, bolts: boltK = 0, doorOpen = 0, gold: goldK = 0, alarm = 0, gate: gateK = 0, doorsLit = 0, torchOn = 1, haze = 1 } = {}) {
      const ph = Math.floor(laserT / 3), k = smooth(clamp((laserT - ph * 3) / 0.35)), a = PAT[ph % 2], b = PAT[(ph + 1) % 2], from = ph === 0 ? a : PAT[(ph - 1) % 2];
      lasers.forEach((g, i) => { g.visible = lasersOn > 0; g.position.y = from[i] + (a[i] - from[i]) * k; g.position.x = Math.sin(t * 9 + i) * 0.003; });
      beamGlow.opacity = 0.26 + Math.sin(t * 31) * 0.05; laserRed.intensity = lasersOn ? 3 : 0;
      cams.forEach((c, i) => { c.pivot.rotation.y = camSweep ? Math.PI + Math.sin(t * 0.7 + i * 1.7) * 0.4 * (1 - camFrozen) + (i ? 0.25 : -0.25) : Math.PI + (i ? 0.25 : -0.25); c.pivot.rotation.x = -0.18;
        c.ledM.color.set(camFrozen > 0.5 ? 0x4ad8ff : Math.sin(t * 5) > 0 ? 0xff2030 : 0x401014); c.cone.material.opacity = 0.05 * (1 - camFrozen); });
      dial.rotation.z = dialA; wheel.rotation.z = boltK * 2.2;
      bolts.forEach(({ b, a }) => { const r = 1.92 - boltK * 0.32; b.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); });
      hinge.rotation.y = -doorOpen * 1.75;
      goldLight.intensity = goldK * 14; goldGlow.material.opacity = goldK * 0.45 * haze; goldM.emissive.setRGB(0.23 * goldK, 0.14 * goldK, 0);
      beacons.forEach((bc, i) => { const ang = t * 7 + i * 1.6; bc.sl.intensity = alarm * 70; bc.sl.target.position.set(bc.x + Math.cos(ang) * 4, 0, bc.z + Math.sin(ang) * 4); bc.dome.material.color.setRGB(0.25 + alarm * 0.75 * (0.6 + 0.4 * Math.sin(ang * 2)), 0.06, 0.08); });
      redWash.intensity = alarm * (6 + Math.max(0, Math.sin(t * 12)) * 8); vaultLight.intensity = 40 * (1 - alarm * 0.6); roomLight.intensity = 12 * (1 - alarm * 0.75);
      gate.position.y = 4.8 - smooth(gateK) * 3.2;
      exits.forEach((e) => { e.panel.material.emissiveIntensity = doorsLit * 0.35; e.light.intensity = doorsLit * 6; e.q.material.opacity = doorsLit; e.frameM.color.set(e.col).multiplyScalar(0.25 + doorsLit * 0.75); });
      torchL.intensity = torchOn * 60; beam.visible = torchOn > 0;
    },
  };
}
