// Unknown Number: inside Jay's house at night. The upstairs landing outside his bedroom door, the staircase, and the
// kitchen below (counters, stove, a pot rack over the island, the fridge, moonlight through the blinds). The pans
// can hang on the rack or lie on the floor (one still spinning). Jay carries his phone with the flashlight on.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { makeJay } from "../jay.js";
import { labelTexture } from "../textures.js";
import { glowSprite } from "./common.js";

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
function tiles() { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? "#d8d4cc" : "#2a2a30"; g.fillRect(x * 64, y * 64, 64, 64); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); return t; }
function wood() { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); for (let i = 0; i < 8; i++) { g.fillStyle = ["#4a3326", "#3f2b20", "#523a2b", "#46301f"][i % 4]; g.fillRect(0, i * 32, 256, 32); g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(0, i * 32, 256, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t; }
function makePan(r = 0.16, deep = 0.06, pot = false) {
  const g = new THREE.Group(), m = std(pot ? 0xa8a8b0 : 0x8a8a92, { metalness: 0.35, roughness: 0.32 });   // stainless (no env map, so not fully metallic)
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.88, deep, 28, 1, true), m); shell.material.side = THREE.DoubleSide; g.add(shell);
  const base = new THREE.Mesh(new THREE.CircleGeometry(r * 0.88, 28), m); base.rotation.x = Math.PI / 2; base.position.y = -deep / 2; g.add(base);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(pot ? 0.06 : 0.26, 0.02, 0.035), std(0x111114, { roughness: 0.5 })); handle.position.set(pot ? r + 0.02 : r + 0.12, deep / 2 - 0.01, 0); g.add(handle);
  if (pot) { const h2 = handle.clone(); h2.position.x = -r - 0.02; g.add(h2); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export function createHouse() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x020206); scene.fog = new THREE.FogExp2(0x05060c, 0.05);
  const camera = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.03, 60);
  const wallM = std(0x4a4652, { roughness: 0.95 }), trimM = std(0xd8d4cc, { roughness: 0.6 });
  const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; scene.add(b); return b; };
  // ---- the kitchen (ground floor: x -3..3.4, z -1..6)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 7), std(0xffffff, { map: tiles(), roughness: 0.35 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0.2, 0, 2.5); floor.receiveShadow = true; scene.add(floor);
  box(0.1, 2.8, 7, -3.05, 1.4, 2.5, wallM); box(6.4, 2.8, 0.1, 0.2, 1.4, 6.05, wallM); box(5.1, 2.8, 0.1, -0.45, 1.4, -1.05, wallM);   // (open at the foot of the stairs)
  box(6.4, 0.1, 7, 0.2, 2.85, 2.5, std(0x2a2830));
  const cab = std(0x3a4a5a, { roughness: 0.6 }), top = std(0xb8b4ac, { roughness: 0.3, metalness: 0.1 });
  box(0.65, 0.88, 5.2, -2.7, 0.44, 2.9, cab); box(0.7, 0.05, 5.3, -2.68, 0.905, 2.9, top); box(0.4, 0.75, 5.2, -2.85, 1.95, 2.9, cab);
  for (let i = 0; i < 7; i++) { const h = box(0.02, 0.18, 0.02, -2.36, 0.72, 0.6 + i * 0.75, std(0xc8c8d0, { metalness: 0.9, roughness: 0.2 })); }
  // stove, hood, burners
  box(0.7, 0.9, 0.8, -2.68, 0.45, 3.4, std(0xe8e8ec, { roughness: 0.3, metalness: 0.4 })); box(0.68, 0.02, 0.78, -2.68, 0.91, 3.4, std(0x0a0a0c, { roughness: 0.2 }));
  for (const [dx, dz] of [[-0.15, -0.18], [-0.15, 0.18], [0.15, -0.18], [0.15, 0.18]]) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 6, 20), std(0x2a2a2a)); b.rotation.x = Math.PI / 2; b.position.set(-2.68 + dx, 0.925, 3.4 + dz); scene.add(b); }
  box(0.6, 0.35, 0.85, -2.75, 1.9, 3.4, std(0x9a9aa0, { metalness: 0.8, roughness: 0.3 }));
  // the microwave clock: 3:04
  box(0.4, 0.28, 0.5, -2.78, 1.1, 1.4, std(0x1a1a1e)); const clk = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.05), new THREE.MeshBasicMaterial({ map: labelTexture("3:04", { w: 256, h: 96, px: 80, color: "#3dff7a" }), transparent: true })); clk.position.set(-2.57, 1.13, 1.48); clk.rotation.y = Math.PI / 2; scene.add(clk);
  const clkGlow = new THREE.PointLight(0x3dff7a, 0.4, 1.2, 2); clkGlow.position.set(-2.4, 1.13, 1.48); scene.add(clkGlow);
  // the island and the pot rack
  box(1.7, 0.92, 1.0, 0.1, 0.46, 3.0, cab); box(1.8, 0.05, 1.1, 0.1, 0.945, 3.0, top);
  const rail = box(1.9, 0.04, 0.04, 0.1, 2.15, 3.0, std(0x2a2a30, { metalness: 0.8 })); for (const x of [-0.8, 1.0]) box(0.02, 0.7, 0.02, x, 2.5, 3.0, std(0x2a2a30));
  const pans = [makePan(0.17, 0.05), makePan(0.14, 0.05), makePan(0.13, 0.14, true), makePan(0.11, 0.04)]; pans.forEach((p) => scene.add(p));
  const hangAt = [-0.55, -0.1, 0.35, 0.75];
  // the fridge, the window over the sink (moonlight through blinds), a table
  box(0.85, 1.95, 0.75, -2.45, 0.975, 5.55, std(0xd8d8dc, { roughness: 0.3, metalness: 0.3 })); box(0.03, 0.7, 0.03, -2.1, 1.2, 5.16, std(0x9a9aa0, { metalness: 0.9 }));
  const winHole = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.9), new THREE.MeshBasicMaterial({ color: 0x1a2440 })); winHole.position.set(0.6, 1.65, 6.0); winHole.rotation.y = Math.PI; scene.add(winHole);
  for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.035, 0.01), trimM); s.position.set(0.6, 1.25 + i * 0.1, 5.95); s.rotation.x = 0.6; s.castShadow = true; scene.add(s); }
  const moon = new THREE.SpotLight(0x8aa8ff, 70, 14, 0.45, 0.5, 1.3); moon.position.set(0.6, 2.6, 9); moon.target.position.set(0.2, 0, 2.5); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024); scene.add(moon, moon.target);
  box(1.2, 0.05, 0.8, 1.6, 0.76, 0.6, std(0x5a4030)); for (const [x, z] of [[1.1, 0.3], [2.1, 0.3], [1.1, 0.9], [2.1, 0.9]]) box(0.04, 0.76, 0.04, x, 0.38, z, std(0x3a2a1a));
  // ---- the staircase (up along the right wall: bottom at z = -0.9, top at z = -4.9, y 0 -> 3)
  const stairM = std(0xffffff, { map: wood(), roughness: 0.6 });
  for (let k = 0; k < 14; k++) { const y = (k + 1) * 0.214, z = -0.9 - k * 0.285; box(1.1, 0.06, 0.3, 2.75, y, z, stairM); box(1.1, 0.214, 0.02, 2.75, y - 0.107, z + 0.14, trimM); }
  box(0.1, 6, 6, 3.35, 3.0, -2.0, wallM); box(0.1, 5.9, 3.6, 2.02, 2.95, -2.85, wallM); box(1.45, 0.1, 3.7, 2.7, 5.85, -2.8, std(0x2a2830));   // the stairwell
  const banister = box(0.05, 0.05, 4.4, 2.18, 1.9, -2.9, std(0x3a2a1a)); banister.rotation.x = 0.64;
  for (let k = 0; k < 14; k += 2) box(0.03, 0.85, 0.03, 2.18, (k + 1) * 0.214 + 0.42, -0.9 - k * 0.285, trimM);
  // ---- upstairs: the landing and Jay's bedroom door (at z = -7.5, facing +z)
  const land = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.2), std(0xffffff, { map: wood(), roughness: 0.6 })); land.rotation.x = -Math.PI / 2; land.position.set(1.6, 3.0, -6.2); land.receiveShadow = true; scene.add(land);
  box(0.1, 2.8, 3.4, -0.2, 4.4, -6.2, wallM); box(3.8, 2.8, 0.1, 1.6, 4.4, -7.6, wallM); box(3.8, 0.1, 3.4, 1.6, 5.85, -6.2, std(0x2a2830));
  const bdoorH = new THREE.Group(); bdoorH.position.set(1.15, 3.0, -7.52); scene.add(bdoorH);
  const bdoor = new THREE.Mesh(new RoundedBoxGeometry(0.9, 2.05, 0.05, 2, 0.01), std(0xd8d0c8)); bdoor.position.set(0.45, 1.03, 0); bdoor.castShadow = true; bdoorH.add(bdoor);
  const bknob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), std(0xc8a24a, { metalness: 0.9, roughness: 0.25 })); bknob.position.set(0.8, 1.0, 0.05); bdoorH.add(bknob);
  const roomGlow = new THREE.PointLight(0x8aa0ff, 0, 4, 1.6);   // moonlight from his room roomGlow.position.set(1.6, 4.0, -8.4); scene.add(roomGlow);
  // light: almost nothing. The little light under the stove hood was left on; moonlight on the landing; the phone's flashlight does the rest
  scene.add(new THREE.HemisphereLight(0x3a4466, 0x0a0a10, 0.3));
  const hoodBulb = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.16), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })); hoodBulb.rotation.x = Math.PI / 2; hoodBulb.position.set(-2.72, 1.72, 3.4); scene.add(hoodBulb);
  const hood = new THREE.SpotLight(0xffc27a, 10, 6, 1.0, 0.85, 1.5); hood.position.set(-2.6, 1.68, 3.4); hood.target.position.set(-1.3, 0, 3.1); scene.add(hood, hood.target);
  const lwin = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.1), new THREE.MeshBasicMaterial({ color: 0x1a2440 })); lwin.rotation.y = Math.PI / 2; lwin.position.set(-0.14, 4.6, -5.6); scene.add(lwin);
  const landMoon = new THREE.SpotLight(0x8aa8ff, 40, 12, 0.6, 0.7, 1.3); landMoon.position.set(-1.5, 5.6, -5.6); landMoon.target.position.set(2.75, 2.2, -3.2); scene.add(landMoon, landMoon.target);
  const jay = makeJay(); jay.root.scale.setScalar(0.78); scene.add(jay.root);
  return {
    scene, camera, jay, pans, bdoorH, bloom: { strength: 0.5, radius: 0.5, threshold: 0.85 }, stairs: { bottomZ: -0.9, topZ: -4.9, step: 0.285, rise: 0.214 },
    // fallen: 0 pans on the rack .. 1 on the floor (t since they fell drives the spin); roomDoor: bedroom door open 0..1
    update(t, { fallen = 0, sinceFall = 9, roomDoor = 0, roomLit = 0 } = {}) {
      pans.forEach((p, i) => {
        if (!fallen) { p.position.set(0.1 + hangAt[i], 1.9 - (i === 2 ? 0.1 : 0), 3.0); p.rotation.set(Math.PI / 2, 0, 0); }
        else { const spots = [[-0.6, 2.1, 0.3], [0.9, 1.8, 2.2], [0.4, 2.4, -0.7], [-0.1, 1.6, 1.1]], [x, z, ry] = spots[i];
          p.position.set(x, i === 2 ? 0.07 : 0.03, z); const wob = i === 1 ? Math.exp(-sinceFall * 0.35) : 0; p.rotation.set(wob * 0.14 * Math.sin(sinceFall * 22), ry + (i === 1 ? sinceFall * 4 * Math.exp(-sinceFall * 0.3) : 0), wob * 0.14 * Math.cos(sinceFall * 22)); if (i === 2) p.rotation.z = Math.PI / 2; }
      });
      bdoorH.rotation.y = -roomDoor * 1.6; roomGlow.intensity = roomLit * 3;
    },
  };
}
