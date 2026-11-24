// The Endless Halls: a yellow corridor that goes on forever, buzzing fluorescent panels that flicker,
// a fuse box with the last key, and the Watcher, who only moves when the lights are off.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { makeJay } from "../jay.js";
import { wallpaper } from "../textures.js";
import { makeKey, glowSprite } from "./common.js";

function carpet() {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
  g.fillStyle = "#8a7434"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "60,45,10" : "170,150,80"},${Math.random() * 0.25})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(50,35,5,.18)"; g.beginPath(); g.ellipse(Math.random() * 256, Math.random() * 256, 10 + Math.random() * 30, 6 + Math.random() * 16, Math.random() * 3, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function ceilingTiles() {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
  g.fillStyle = "#d8d0a8"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(120,100,50,${Math.random() * 0.12})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  g.strokeStyle = "#8a8060"; g.lineWidth = 6; g.strokeRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function createHalls() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0e0b04); scene.fog = new THREE.Fog(0x3a3214, 5, 34);
  const camera = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.05, 120);
  const HW = 1.6, HH = 2.7, Z0 = 6, Z1 = -70, L = Z0 - Z1;
  const cp = carpet(); cp.repeat.set(2, L / 1.6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, L), new THREE.MeshStandardMaterial({ map: cp, roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.position.z = (Z0 + Z1) / 2; floor.receiveShadow = true; scene.add(floor);
  const ct = ceilingTiles(); ct.repeat.set(3, L / 1.1);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, L), new THREE.MeshStandardMaterial({ map: ct, roughness: 0.9 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, HH, (Z0 + Z1) / 2); scene.add(ceil);
  // walls in segments with dark doorways
  const wp = wallpaper();
  const wallMat = (len) => { const t = wp.clone(); t.needsUpdate = true; t.repeat.set(len / 1.2, 2.2); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }); };
  for (const side of [-1, 1]) {
    let z = Z0;
    while (z > Z1) {
      const seg = 5 + ((Math.abs(z * 7 + side * 3) | 0) % 3) * 1.5, len = Math.min(seg, z - Z1);
      const w = new THREE.Mesh(new THREE.PlaneGeometry(len, HH), wallMat(len)); w.rotation.y = -side * Math.PI / 2; w.position.set(side * HW, HH / 2, z - len / 2); w.receiveShadow = true; scene.add(w);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, len), new THREE.MeshStandardMaterial({ color: 0x6a5a2a, roughness: 0.8 })); base.position.set(side * (HW - 0.02), 0.06, z - len / 2); scene.add(base);
      z -= len;
      if (z > Z1 + 2) {   // a doorway into darkness
        const dw = 1.3, dark = new THREE.Mesh(new THREE.PlaneGeometry(dw, HH), new THREE.MeshBasicMaterial({ color: 0x050402 })); dark.rotation.y = -side * Math.PI / 2; dark.position.set(side * (HW + 1.2), HH / 2, z - dw / 2); scene.add(dark);
        for (const zz of [z, z - dw]) { const jamb = new THREE.Mesh(new THREE.PlaneGeometry(1.2, HH), wallMat(1.2)); jamb.position.set(side * (HW + 0.6), HH / 2, zz); jamb.rotation.y = zz === z ? Math.PI : 0; scene.add(jamb); }
        const lintel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, dw), new THREE.MeshStandardMaterial({ color: 0x8a7a40 })); lintel.rotation.set(Math.PI / 2, 0, Math.PI / 2); lintel.position.set(side * (HW + 0.6), HH - 0.01, z - dw / 2); scene.add(lintel);
        z -= dw;
      }
    }
  }
  // fluorescent panels; the nearest few also cast light
  const panelM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4c8, emissiveIntensity: 2.2 });
  const panels = [], lights = [];
  for (let z = 3, i = 0; z > Z1; z -= 3.2, i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 1.22), panelM.clone()); m.position.set(0, HH - 0.02, z); scene.add(m); panels.push(m);
    if (i < 8) { const l = new THREE.PointLight(0xfff0c0, 7, 8, 1.6); l.position.set(0, HH - 0.25, z); scene.add(l); lights.push(l); }
  }
  lights[1].castShadow = true; lights[1].shadow.mapSize.set(512, 512);
  const hemi = new THREE.HemisphereLight(0xfff0b0, 0x3a2a08, 0.5); scene.add(hemi);

  // the fuse box with the key, on the right wall
  const box = new THREE.Group(); box.position.set(HW - 0.09, 1.35, -3.4); box.rotation.y = -Math.PI / 2; scene.add(box);
  const metal = new THREE.MeshStandardMaterial({ color: 0x8a8a80, roughness: 0.5, metalness: 0.7 });
  const shell = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.75, 0.16, 2, 0.02), metal); box.add(shell);
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(0.47, 0.67), new THREE.MeshStandardMaterial({ color: 0x15130c })); inside.position.z = 0.081; box.add(inside);
  const doorP = new THREE.Group(); doorP.position.set(-0.275, 0, 0.085); box.add(doorP);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.02), metal); door.position.x = -0.275; doorP.add(door); doorP.rotation.y = -1.2;
  const warn = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ color: 0xffd23d })); warn.position.set(-0.275, 0.18, 0.011); doorP.add(warn);
  const key = makeKey(0xffe27a); key.scale.setScalar(0.3); key.position.set(0, 0, 0.12); box.add(key);

  // the Watcher
  const W = new THREE.Group(); scene.add(W);
  const skin = new THREE.MeshStandardMaterial({ color: 0x0b0a0a, roughness: 0.85 });
  const limb = (r, len) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), skin);
  const torso = limb(0.17, 0.85); torso.position.y = 1.75; torso.scale.set(1, 1, 0.7); W.add(torso);
  const headW = new THREE.Group(); headW.position.set(0, 2.42, 0.05); headW.rotation.z = 0.25; W.add(headW);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), skin); skull.scale.set(0.9, 1.25, 0.9); headW.add(skull);
  const eyeGlow = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); e.position.set(0.06 * s, 0.03, 0.15); headW.add(e); const g = glowSprite(0xffffff, 0.13, 0.9); g.position.copy(e.position); headW.add(g); return g; });
  const armsW = [-1, 1].map((s) => { const sh = new THREE.Group(); sh.position.set(0.24 * s, 2.15, 0); W.add(sh); const a = limb(0.05, 1.35); a.position.y = -0.72; sh.add(a); const hnd = limb(0.04, 0.22); hnd.position.y = -1.5; sh.add(hnd); sh.rotation.z = 0.08 * s; return sh; });
  for (const s of [-1, 1]) { const lg = limb(0.065, 1.25); lg.position.set(0.11 * s, 0.68, 0); W.add(lg); }
  W.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  const jay = makeJay(); jay.root.scale.setScalar(0.78); scene.add(jay.root);
  return {
    scene, camera, jay, key, box, watcher: W, armsW, bloom: { strength: 0.6, radius: 0.5, threshold: 0.75 },
    // lights: 0..1 master, watcherZ: where it stands, reach: arms up 0..1
    update(t, { lights: on = 1, watcherZ = -22, reach = 0, buzz = 1 } = {}) {
      panels.forEach((m, i) => { const b = on * (buzz && Math.sin(t * 50 + i * 3) > 0.97 ? 0.3 : 1) * (i === 3 && Math.sin(t * 13) > 0.6 ? 0.2 : 1); m.material.emissiveIntensity = 2.2 * b; });
      lights.forEach((l, i) => (l.intensity = 7 * on * (i === 3 && Math.sin(t * 13) > 0.6 ? 0.2 : 1)));
      hemi.intensity = 0.5 * on + 0.02;
      W.position.set(0.2, 0, watcherZ); W.visible = watcherZ < 5;
      armsW.forEach((a, i) => { a.rotation.x = -reach * 1.9; a.rotation.z = (i ? 1 : -1) * (0.08 + reach * 0.15); });
      eyeGlow.forEach((g) => (g.material.opacity = 0.6 + (1 - on) * 0.4));
      key.rotation.y = t * 1.5;
    },
  };
}
