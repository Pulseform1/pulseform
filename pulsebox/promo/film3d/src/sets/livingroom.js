// Iron Gramps: the living room downstairs at 9 PM. Grandpa's armchair under a warm floor lamp, a TV tray with his
// laptop (it shows whatever texture the shot gives it) and his notebook of Hyperlane notes, the couch, family photos,
// a wall clock at nine, and the doorway at the bottom of the stairs where Jay peeks in.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { makeJay } from "../jay.js";
import { glowSprite } from "./common.js";

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
function boards() {
  const c = document.createElement("canvas"); c.width = c.height = 512; const g = c.getContext("2d");
  for (let i = 0; i < 8; i++) { g.fillStyle = ["#6a4a30", "#5e412a", "#704f34", "#634529"][i % 4]; g.fillRect(0, i * 64, 512, 64); g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(0, i * 64, 512, 3); g.fillRect((i * 173) % 512, i * 64, 3, 64); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
}
function wallpaper() {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#6b5a46"; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 32) { g.fillStyle = "rgba(255,240,210,.07)"; g.fillRect(x, 0, 12, 256); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 3); return t;
}
function rugTex() {
  const c = document.createElement("canvas"); c.width = c.height = 512; const g = c.getContext("2d"); g.fillStyle = "#7a2f2a"; g.fillRect(0, 0, 512, 512);
  for (let r = 240; r > 20; r -= 34) { g.strokeStyle = r % 68 ? "#d9b06a" : "#2a3a5a"; g.lineWidth = 10; g.beginPath(); g.ellipse(256, 256, r, r * 0.66, 0, 0, 7); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function photoTex(kind) {   // little framed family pictures
  const c = document.createElement("canvas"); c.width = 256; c.height = 320; const g = c.getContext("2d");
  const sky = kind === 0 ? ["#8ac6ff", "#d8eeff"] : kind === 1 ? ["#ffb07a", "#ffe2b0"] : ["#9ad89a", "#e2f6d0"]; const gr = g.createLinearGradient(0, 0, 0, 320); gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]); g.fillStyle = gr; g.fillRect(0, 0, 256, 320);
  g.fillStyle = kind === 0 ? "#3a6aa8" : kind === 1 ? "#c86a3a" : "#4a8a4a"; g.fillRect(0, 230, 256, 90);
  const person = (x, h, col, hair) => { g.fillStyle = col; g.fillRect(x - 18, 230 - h, 36, h); g.fillStyle = "#f2bd96"; g.beginPath(); g.arc(x, 230 - h - 20, 20, 0, 7); g.fill(); g.fillStyle = hair; g.beginPath(); g.arc(x, 230 - h - 27, 20, Math.PI, 0); g.fill(); };
  person(90, 110, "#7a2f3a", "#e9e6e0"); person(165, 70, "#ff8a3d", "#f0cc6e");
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function notesTex() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 360; const g = c.getContext("2d"); g.fillStyle = "#f4ecd2"; g.fillRect(0, 0, 512, 360);
  g.strokeStyle = "rgba(60,90,160,.35)"; g.lineWidth = 2; for (let y = 40; y < 360; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  g.fillStyle = "#1a2a6a"; g.font = "italic 700 30px Georgia, serif"; ["HYPERLANE NOTES", "gate 3: stay LEFT", "boost after the bridge", "the kid brakes too early", "practice 8:15 every night"].forEach((s, i) => g.fillText(s, 24, 30 + i * 60 + (i ? 10 : 0)));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function clockTex() {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#f2eadb"; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
  g.fillStyle = "#2a2018"; g.font = "700 28px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillText(String(i), 128 + Math.sin(a) * 95, 128 - Math.cos(a) * 95); }
  g.lineCap = "round"; g.strokeStyle = "#2a2018"; g.lineWidth = 8; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 - 62, 128); g.stroke(); g.lineWidth = 5; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 128 - 92); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createLivingroom() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0e0a08); scene.fog = new THREE.Fog(0x120c08, 7, 18);
  const camera = new THREE.PerspectiveCamera(46, 1080 / 1920, 0.05, 60);
  const add = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), std(0xffffff, { map: boards(), roughness: 0.55 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallM = std(0xffffff, { map: wallpaper(), roughness: 0.95 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.0), wallM); back.position.set(0, 1.5, -3.0); back.receiveShadow = true; scene.add(back);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.0), wallM); right.rotation.y = -Math.PI / 2; right.position.set(3.2, 1.5, 0); right.receiveShadow = true; scene.add(right);
  // the left wall has the doorway to the hall (and the bottom of the stairs)
  for (const [w, x] of [[1.6, -3.2 + 0 * 1], [4.6, 0]]) { }
  const lw1 = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.0), wallM); lw1.rotation.y = Math.PI / 2; lw1.position.set(-3.2, 1.5, -1.7); scene.add(lw1);
  const lw2 = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.0), wallM); lw2.rotation.y = Math.PI / 2; lw2.position.set(-3.2, 1.5, 2.8); scene.add(lw2);
  const lw3 = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.8), wallM); lw3.rotation.y = Math.PI / 2; lw3.position.set(-3.2, 2.6, 0.1); scene.add(lw3);
  const trimM = std(0xe8dcc6, { roughness: 0.6 });
  for (const [w, h, y, z] of [[0.1, 2.2, 1.1, -0.42], [0.1, 2.2, 1.1, 0.62], [0.1, 0.1, 2.2, 0.1]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, w === 0.1 && h === 0.1 ? 1.14 : 0.1), trimM); f.position.set(-3.18, y, z); scene.add(f); }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), std(0x2a2018)); ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.0; scene.add(ceil);
  // the hall behind the doorway: a dim bulb, the bottom stairs
  const hallFloor = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), std(0x4a3626)); hallFloor.rotation.x = -Math.PI / 2; hallFloor.position.set(-4.7, 0.001, 0.1); scene.add(hallFloor);
  const hallWall = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), wallM); hallWall.rotation.y = Math.PI / 2; hallWall.position.set(-6.1, 1.5, 0.1); scene.add(hallWall);
  for (let k = 0; k < 6; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.3), std(0x5e412a, { roughness: 0.6 })); st.position.set(-4.6, 0.1 + k * 0.2, -0.9 - k * 0.3); st.scale.y = 1 + k * 0; scene.add(st); const riser = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2 + k * 0.2, 0.3), std(0x3e2a1a)); riser.position.set(-4.6, (0.2 + k * 0.2) / 2, -0.9 - k * 0.3); scene.add(riser); }
  const hallBulb = new THREE.PointLight(0xffc890, 1.6, 4, 1.6); hallBulb.position.set(-4.7, 2.6, 0.6); scene.add(hallBulb);
  // furniture
  const fabric = std(0x7a3a2e, { roughness: 0.95 }), couchM = std(0x3a4a5a, { roughness: 0.95 }), wood = std(0x4a3020, { roughness: 0.6 });
  const chair = new THREE.Group(); chair.position.set(1.4, 0, -1.4); chair.rotation.y = -0.45; scene.add(chair);
  for (const [w, h, d, x, y, z] of [[1.0, 0.45, 0.95, 0, 0.32, 0], [1.0, 1.0, 0.24, 0, 0.85, -0.4], [0.22, 0.6, 0.95, -0.55, 0.55, 0], [0.22, 0.6, 0.95, 0.55, 0.55, 0]]) { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.08), fabric); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; chair.add(m); }
  const couch = new THREE.Group(); couch.position.set(-1.0, 0, -2.45); scene.add(couch);
  for (const [w, h, d, x, y, z] of [[2.6, 0.42, 0.95, 0, 0.3, 0.1], [2.6, 0.75, 0.25, 0, 0.75, -0.3], [0.22, 0.55, 0.95, -1.35, 0.5, 0.1], [0.22, 0.55, 0.95, 1.35, 0.5, 0.1]]) { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.08), couchM); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; couch.add(m); }
  for (const x of [-0.65, 0.65]) { const p = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.4, 0.15, 3, 0.07), std(0xd9b06a)); p.position.set(x, 0.75, -0.12); p.rotation.x = -0.2; couch.add(p); }
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), std(0xffffff, { map: rugTex(), roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.scale.set(1.3, 1, 1); rug.position.set(-0.2, 0.004, -0.4); rug.receiveShadow = true; scene.add(rug);
  add(new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.08, 0.6, 2, 0.02), wood), -0.6, 0.42, -0.9); for (const [x, z] of [[-1.1, -1.1], [-0.1, -1.1], [-1.1, -0.7], [-0.1, -0.7]]) add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), wood), x, 0.2, z);
  // the TV tray, the laptop, the notebook, a mug
  const tray = new THREE.Group(); tray.position.set(1.05, 0, -0.65); tray.rotation.y = -0.45; scene.add(tray);
  const trayTop = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.45), wood); trayTop.position.y = 0.66; trayTop.castShadow = true; tray.add(trayTop);
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.9, 0.03), wood); l.position.set(0.3 * s, 0.33, 0); l.rotation.z = 0.5 * s; tray.add(l); }
  const lapBase = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.02, 0.3, 2, 0.008), std(0x9a9aa4, { metalness: 0.6, roughness: 0.35 })); lapBase.position.set(0, 0.69, 0.02); tray.add(lapBase);
  const lid = new THREE.Group(); lid.position.set(0, 0.7, -0.13); lid.rotation.x = -0.25; tray.add(lid);
  const lidM = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.28, 0.012, 2, 0.006), std(0x9a9aa4, { metalness: 0.6, roughness: 0.35 })); lidM.position.y = 0.14; lid.add(lidM);
  const lapScrM = new THREE.MeshBasicMaterial({ color: 0xffffff }); const lapScr = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.24), lapScrM); lapScr.position.set(0, 0.14, 0.008); lid.add(lapScr);
  const lapGlow = new THREE.PointLight(0x9ab8ff, 1.6, 2.5, 1.6); lapGlow.position.set(0, 0.95, 0.15); tray.add(lapGlow);
  const notes = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.18), new THREE.MeshStandardMaterial({ map: notesTex(), roughness: 0.9 })); notes.rotation.x = -Math.PI / 2; notes.position.set(0.24, 0.682, 0.16); notes.rotation.z = 0.3; tray.add(notes);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 16), std(0xf2eadb)); mug.position.set(-0.27, 0.73, 0.12); tray.add(mug);
  // the floor lamp, the TV (off), a bookshelf, photos, the clock at nine, the window
  const lampPole = add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.7, 10), std(0x2a2018, { metalness: 0.5 })), 2.35, 0.85, -2.1);
  const shade = add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 0.36, 24, 1, true), std(0xf2d8a8, { side: THREE.DoubleSide, emissive: 0xffb860, emissiveIntensity: 0.5 })), 2.35, 1.78, -2.1);
  const lamp = new THREE.PointLight(0xffc27a, 14, 9, 1.4); lamp.position.set(2.35, 1.7, -2.1); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.002; scene.add(lamp);
  const tvStand = add(new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.5, 0.45, 2, 0.03), wood), 2.85, 0.25, 0.9); tvStand.rotation.y = -Math.PI / 2;
  const tv = add(new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.78, 0.06, 2, 0.02), std(0x0a0a0c, { roughness: 0.25, metalness: 0.4 })), 2.95, 0.95, 0.9); tv.rotation.y = -Math.PI / 2;
  const shelf = new THREE.Group(); shelf.position.set(-2.95, 0, -2.4); shelf.rotation.y = Math.PI / 4; scene.add(shelf);
  const sb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.0, 0.32), wood); sb.position.y = 1.0; shelf.add(sb);
  const bookCols = [0x7a2f2a, 0x2a4a6a, 0xd9b06a, 0x3a6a3a, 0x6a3a6a, 0xc86a3a];
  for (let row = 0; row < 4; row++) for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3 + (i % 3) * 0.03, 0.22), std(bookCols[(i + row * 2) % 6])); b.position.set(-0.32 + i * 0.105, 0.35 + row * 0.47, 0.06); shelf.add(b); }
  [[-1.8, 1.9, 0], [-1.1, 2.0, 1], [-0.4, 1.85, 2]].forEach(([x, y, k]) => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.03), std(0x3a2a1a)); f.position.set(x, y, -2.98); scene.add(f); const p = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.43), new THREE.MeshStandardMaterial({ map: photoTex(k), roughness: 0.6 })); p.position.set(x, y, -2.96); scene.add(p); });
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.22, 40), new THREE.MeshStandardMaterial({ map: clockTex(), roughness: 0.5 })); clock.position.set(0.9, 2.3, -2.98); scene.add(clock);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.02, 8, 40), std(0x3a2a1a)); ring.position.copy(clock.position); scene.add(ring);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.5), new THREE.MeshBasicMaterial({ color: 0x18264a })); win.rotation.y = -Math.PI / 2; win.position.set(3.18, 1.65, -1.3); scene.add(win);
  for (const s of [-1, 1]) { const cur = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.9, 0.45), std(0x8a5a3a, { roughness: 1 })); cur.position.set(3.12, 1.55, -1.3 + s * 0.85); scene.add(cur); }
  scene.add(new THREE.HemisphereLight(0xffd6a8, 0x2a1a10, 0.55));
  const fill = new THREE.SpotLight(0xffd0a0, 18, 12, 0.8, 0.8, 1.4); fill.position.set(-1.5, 2.9, 2.5); fill.target.position.set(0.8, 0.6, -1.2); scene.add(fill, fill.target);
  // Grandpa (giant headset) and Jay
  const gramps = makeJay({ variant: "gramps", headset: true }); scene.add(gramps.root);
  const jay = makeJay(); scene.add(jay.root);
  [gramps, jay].forEach((r) => r.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }));
  return {
    scene, camera, gramps, jay, chair, tray, lapScrM, lapGlow, bloom: { strength: 0.45, radius: 0.5, threshold: 0.85 },
    // screen: a texture for the laptop; lampOn 0..1; glow: laptop light on his face
    update(t, { screen = null, lampOn = 1, glow = 1 } = {}) {
      if (screen && lapScrM.map !== screen) { lapScrM.map = screen; lapScrM.needsUpdate = true; }
      lamp.intensity = 14 * lampOn; shade.material.emissiveIntensity = 0.5 * lampOn; lapGlow.intensity = 1.6 * glow; hallBulb.intensity = 1.6;
    },
  };
}
