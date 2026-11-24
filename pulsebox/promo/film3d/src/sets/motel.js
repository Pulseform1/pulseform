// Lights Out Motel: the night clerk's booth at the Pinewood Motel on Route 9, in a storm. A desk lamp, the guest book,
// a board of room keys, the window to the parking lot (rain on the glass) and a metal shutter. Outside, under a cold
// lamp, a guest who looks exactly like Maya.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { makeJay } from "../jay.js";
import { labelTexture, radialGlow, windowsTexture } from "../textures.js";
import { gradientSky, glowSprite } from "./common.js";

const tex = (c, rep) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; };
function wood() { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); for (let x = 0; x < 256; x += 32) { g.fillStyle = ["#3a2416", "#432a19", "#35200f", "#4a2e1b"][(x / 32) % 4]; g.fillRect(x, 0, 32, 256); g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(x, 0, 2, 256); }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; g.fillRect(Math.random() * 256, Math.random() * 256, 1, 10 + Math.random() * 40); } return c; }
function drops() { const c = document.createElement("canvas"); c.width = 512; c.height = 512; const g = c.getContext("2d");
  for (let i = 0; i < 700; i++) { const x = Math.random() * 512, y = Math.random() * 512, r = 0.6 + Math.random() * 2.2; g.strokeStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.35})`; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); if (Math.random() < 0.12) { g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(x - 0.7, y, 1.4, 20 + Math.random() * 60); } }
  return c; }
function slats() { const c = document.createElement("canvas"); c.width = 64; c.height = 256; const g = c.getContext("2d"); for (let y = 0; y < 256; y += 32) { const gr = g.createLinearGradient(0, y, 0, y + 32); gr.addColorStop(0, "#9a9aa4"); gr.addColorStop(0.5, "#6a6a74"); gr.addColorStop(1, "#3a3a44"); g.fillStyle = gr; g.fillRect(0, y, 64, 32); } return c; }
function bookPages() { const c = document.createElement("canvas"); c.width = 256; c.height = 128; const g = c.getContext("2d"); g.fillStyle = "#e8dcc0"; g.fillRect(0, 0, 256, 128); g.strokeStyle = "rgba(60,40,20,.35)"; for (let y = 16; y < 128; y += 12) { g.beginPath(); g.moveTo(10, y); g.lineTo(118, y); g.moveTo(138, y); g.lineTo(246, y); g.stroke(); }
  g.fillStyle = "rgba(30,30,80,.8)"; g.font = "italic 10px serif"; ["Wes R.", "D. Haskell", "M. Ortiz", "Jay"].forEach((n, i) => g.fillText(n, 14, 26 + i * 24)); g.fillStyle = "#7a1a1a"; g.fillText("Maya", 142, 26); return c; }

export function createMotel() {
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x0b0a16, 0.045);
  const camera = new THREE.PerspectiveCamera(45, 1080 / 1920, 0.03, 300);
  scene.add(gradientSky([[0, "#05040c"], [0.45, "#0d0b1c"], [0.52, "#1a1226"], [1, "#030206"]], { radius: 200 }));
  const wallM = new THREE.MeshStandardMaterial({ map: tex(wood(), [3, 1]), roughness: 0.8 });
  const WZ = -1.0;   // the window wall
  // ---- the booth: floor, back and side walls, ceiling, the front wall with a window hole
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 3.2), new THREE.MeshStandardMaterial({ color: 0x3a2e2a, roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0.6); floor.receiveShadow = true; scene.add(floor);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.8), wallM); back.position.set(0, 1.4, 2.2); back.rotation.y = Math.PI; scene.add(back);
  for (const s of [-1, 1]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.8), wallM); side.position.set(2 * s, 1.4, 0.6); side.rotation.y = -s * Math.PI / 2; scene.add(side); }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(4, 3.2), new THREE.MeshStandardMaterial({ color: 0x1a1612 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 2.8, 0.6); scene.add(ceil);
  const extM = new THREE.MeshStandardMaterial({ color: 0x5a3a32, roughness: 0.85 });
  const piece = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.18), extM); m.position.set(x, y, WZ); m.castShadow = m.receiveShadow = true; scene.add(m); };
  piece(5, 1.0, 0, 0.5); piece(5, 0.55, 0, 2.62); piece(1.3, 1.35, -1.85, 1.68); piece(1.3, 1.35, 1.85, 1.68);   // window: x -1.2..1.2, y 1.0..2.35
  const sill = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 0.4), new THREE.MeshStandardMaterial({ color: 0x2a1a10 })); sill.position.set(0, 1.0, WZ + 0.1); scene.add(sill);
  // the glass, with rain on it
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.35), new THREE.MeshPhysicalMaterial({ color: 0x9ab0c8, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.12, clearcoat: 1, depthWrite: false }));
  glass.position.set(0, 1.675, WZ); scene.add(glass);
  const dropT = tex(drops(), [2, 1]); const wet = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.35), new THREE.MeshBasicMaterial({ map: dropT, transparent: true, opacity: 0.4, depthWrite: false })); wet.position.set(0, 1.675, WZ - 0.005); scene.add(wet);
  // the roll-down shutter (closes from the top)
  const shutT = tex(slats(), [1, 5]); const shutter = new THREE.Mesh(new THREE.PlaneGeometry(2.42, 1.36), new THREE.MeshStandardMaterial({ map: shutT, metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide }));
  shutter.position.set(0, 2.35, WZ + 0.06); scene.add(shutter);
  const shutBox = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.25), new THREE.MeshStandardMaterial({ color: 0x4a4a52, metalness: 0.7, roughness: 0.4 })); shutBox.position.set(0, 2.45, WZ + 0.12); scene.add(shutBox);
  // the desk and what's on it
  const desk = new THREE.Mesh(new RoundedBoxGeometry(3.6, 0.08, 0.9, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0x4a2c1a, roughness: 0.55 })); desk.position.set(0, 0.98, WZ + 0.55); desk.castShadow = desk.receiveShadow = true; scene.add(desk);
  const front = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.95, 0.06), wallM); front.position.set(0, 0.48, WZ + 0.98); scene.add(front);
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.4), new THREE.MeshStandardMaterial({ map: tex(bookPages()), roughness: 0.8 })); book.position.set(-0.55, 1.035, WZ + 0.5); book.rotation.y = 0.15; scene.add(book);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: 0.9, roughness: 0.25 })); bell.position.set(0.15, 1.02, WZ + 0.35); scene.add(bell);
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.04, 16), new THREE.MeshStandardMaterial({ color: 0x2a5a3a, metalness: 0.6, roughness: 0.35 })); lampBase.position.set(0.95, 1.04, WZ + 0.6); scene.add(lampBase);
  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.18, 0.16, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a6a3a, metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide })); lampShade.position.set(0.85, 1.38, WZ + 0.55); lampShade.rotation.z = 0.4; scene.add(lampShade);
  const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4), lampShade.material); lampArm.position.set(0.92, 1.22, WZ + 0.58); lampArm.rotation.z = 0.25; scene.add(lampArm);
  const bulb = glowSprite(0xffc070, 0.35, 0.8); bulb.position.set(0.82, 1.32, WZ + 0.55); scene.add(bulb);
  const lamp = new THREE.PointLight(0xffb070, 5, 5, 1.5); lamp.position.set(0.8, 1.3, WZ + 0.6); lamp.castShadow = true; lamp.shadow.mapSize.set(512, 512); scene.add(lamp);
  const crt = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.42, 0.45, 2, 0.04), new THREE.MeshStandardMaterial({ color: 0xc8c0a8, roughness: 0.6 })); crt.position.set(-1.25, 1.23, WZ + 0.6); scene.add(crt);
  const crtScr = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.28), new THREE.MeshBasicMaterial({ map: labelTexture("ROOM 6 · OCCUPIED", { w: 512, h: 256, px: 44, color: "#4ff0c8" }), color: 0x4ff0c8 })); crtScr.position.set(-1.25, 1.24, WZ + 0.37); crtScr.rotation.y = Math.PI; scene.add(crtScr);
  // the key board on the back wall
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.04), new THREE.MeshStandardMaterial({ color: 0x2a180c, roughness: 0.7 })); board.position.set(-0.9, 1.75, 2.17); scene.add(board);
  const keyM = new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: 0.9, roughness: 0.3 }), tagM = new THREE.MeshStandardMaterial({ color: 0xc83a3a, roughness: 0.6 });
  for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) { const x = -1.45 + k * 0.22, y = 1.95 - r * 0.38; const key = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.12, 0.01), keyM); key.position.set(x, y, 2.14); scene.add(key); if ((r * 6 + k) % 4 !== 2) { const tag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.01), tagM); tag.position.set(x, y - 0.12, 2.14); scene.add(tag); } }
  // ---- outside: wet lot, rooms, neon, the lamp post
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x15131c, roughness: 0.18, metalness: 0.5 })); lot.rotation.x = -Math.PI / 2; lot.position.set(0, -0.02, -25); lot.receiveShadow = true; scene.add(lot);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(18, 3.2, 6), new THREE.MeshStandardMaterial({ color: 0x4a3434, roughness: 0.85 })); wing.position.set(10, 1.6, -9); wing.rotation.y = -0.5; scene.add(wing);
  const roomWin = windowsTexture(21, 4); for (let i = 0; i < 6; i++) { const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2), new THREE.MeshStandardMaterial({ color: 0x6a2a2a, roughness: 0.6 })); const a = -0.5; door.position.set(10 + (i - 2.5) * 2.6 * Math.cos(a), 1.0, -9 + 3.02 * Math.cos(a) + (i - 2.5) * 2.6 * Math.sin(-a)); door.rotation.y = a; scene.add(door);
    const num = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshBasicMaterial({ map: labelTexture(String(i + 1), { w: 128, h: 96, px: 70, color: "#ffd23d" }), transparent: true })); num.position.copy(door.position).add(new THREE.Vector3(0, 1.2, 0.02)); num.rotation.y = a; scene.add(num);
    if (i === 5) { const lit = glowSprite(0xff4f7b, 1.6, 0.25); lit.position.copy(door.position).add(new THREE.Vector3(0, 0.2, 0.3)); scene.add(lit); } }
  const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.6 })); signPost.position.set(-5, 3, -14); scene.add(signPost);
  const signM = new THREE.MeshBasicMaterial({ map: labelTexture("PINEWOOD MOTEL", { w: 1024, h: 256, px: 120, color: "#ffffff", glow: "#4ff0c8" }), transparent: true, color: 0x9affe8 }); const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.4), signM); sign.position.set(-5, 6.6, -14); scene.add(sign);
  const vacM = new THREE.MeshBasicMaterial({ map: labelTexture("VACANCY", { w: 1024, h: 256, px: 150, color: "#ffffff", glow: "#ff4f7b" }), transparent: true, color: 0xff8aa6 }); const vac = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), vacM); vac.position.set(-5, 5.4, -14); scene.add(vac);
  const neon = new THREE.PointLight(0xff4f7b, 30, 16, 1.6); neon.position.set(-4, 4.5, -12); scene.add(neon);
  const officeSign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: labelTexture("OFFICE", { w: 512, h: 128, px: 90, color: "#ffffff", glow: "#ffd23d" }), transparent: true, color: 0xffe9a0 })); officeSign.position.set(0, 3.1, WZ - 0.1); officeSign.rotation.y = Math.PI; scene.add(officeSign);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.6, 8), new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.7 })); post.position.set(1.6, 2.3, -2.6); scene.add(post);
  const postHead = glowSprite(0xcfe0ff, 1.2, 0.6); postHead.position.set(1.4, 4.55, -2.5); scene.add(postHead);
  const cold = new THREE.SpotLight(0xb8ccff, 70, 12, 0.55, 0.5, 1.4); cold.position.set(1.4, 4.5, -2.5); cold.target.position.set(0, 1.2, -1.7); cold.castShadow = true; cold.shadow.mapSize.set(1024, 1024); scene.add(cold, cold.target);
  const car = new THREE.Mesh(new RoundedBoxGeometry(2, 1.2, 4.4, 3, 0.3), new THREE.MeshStandardMaterial({ color: 0x2a3a4a, metalness: 0.5, roughness: 0.3 })); car.position.set(-3.6, 0.6, -6.5); car.rotation.y = 0.3; scene.add(car);
  // rain outside (in front of and around the glass)
  const RAIN = 1300, rp = new Float32Array(RAIN * 6), rb = []; for (let i = 0; i < RAIN; i++) rb.push([(Math.random() * 2 - 1) * 9, Math.random() * 8, WZ - 0.15 - Math.random() * 16]);
  const rainG = new THREE.BufferGeometry(); rainG.setAttribute("position", new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rainG, new THREE.LineBasicMaterial({ color: 0xaab8e0, transparent: true, opacity: 0.4 })); rain.frustumCulled = false; scene.add(rain);
  // people: Jay at the desk (headset on), the guest outside
  const jay = makeJay({ headset: true }); jay.root.scale.setScalar(0.78); jay.root.position.set(0.1, 0, WZ + 1.45); jay.root.rotation.y = Math.PI; scene.add(jay.root);
  const chair = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.1, 0.55, 2, 0.04), new THREE.MeshStandardMaterial({ color: 0x1a1a22 })); chair.position.set(0.1, 0.48, WZ + 1.5); scene.add(chair);
  const guest = makeJay({ variant: "maya" }); guest.root.scale.setScalar(0.78); guest.root.position.set(0, 0, WZ - 0.75); scene.add(guest.root);
  scene.add(new THREE.HemisphereLight(0x5a5a9a, 0x140a10, 0.28));
  const set = {
    scene, camera, jay, guest, WZ, bloom: { strength: 0.6, radius: 0.5, threshold: 0.82 },
    // shut: 0 open .. 1 closed; lampOn: desk lamp; flicker: neon stutter
    update(t, { shut = 0, lampOn = 1, neonOn = 1 } = {}) {
      shutter.scale.y = Math.max(0.001, shut); shutter.position.y = 2.35 - 0.68 * shut; shutT.repeat.set(1, 5 * Math.max(shut, 0.05));
      const vf = neonOn * (Math.sin(t * 13) > 0.9 || Math.sin(t * 3.1) > 0.97 ? 0.2 : 1); vacM.opacity = vf; neon.intensity = 30 * vf; signM.opacity = neonOn;
      lamp.intensity = 5 * lampOn; bulb.material.opacity = 0.8 * lampOn;
      for (let i = 0; i < RAIN; i++) { const b = rb[i], y = ((b[1] - t * 9) % 8 + 8) % 8; rp.set([b[0], y, b[2], b[0] + 0.04, y + 0.38, b[2]], i * 6); }
      rainG.attributes.position.needsUpdate = true; dropT.offset.y = Math.floor(t * 2) * 0.13;
    },
  };
  return set;
}
