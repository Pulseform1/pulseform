// Unknown Number: the world outside Jay's house at 2:47 AM. A quiet street (Maple St) with houses and street lamps,
// the corner street sign, the "Welcome to Cedar Hollow" sign at the edge of town, and Jay's house with its porch,
// porch light and the number 1407. Cameras for the three photos (with a camera flash) and for the view from his window.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { labelTexture, radialGlow } from "../textures.js";
import { gradientSky, glowSprite } from "./common.js";

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
function signTex(lines, { w = 1024, h = 256, bg = "#1f6a3a", fg = "#f4f4f0", border = "#f4f4f0", font = "700 150px 'Inter', sans-serif" } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = border; g.lineWidth = 12; g.strokeRect(14, 14, w - 28, h - 28);
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  lines.forEach((l, i) => { g.font = l.font || font; g.fillText(l.text, w / 2, h / 2 + (i - (lines.length - 1) / 2) * (l.gap || 150)); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function makeHouse({ w = 9, d = 8, h = 6.2, color = 0x6a6a74, roof = 0x2a2a30, lit = [] } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(color, { roughness: 0.9 })); body.position.y = h / 2; body.castShadow = body.receiveShadow = true; g.add(body);
  const r = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2 * 1.05, 2.6, 4), std(roof, { roughness: 0.85 })); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, d / w); r.position.y = h + 1.3; r.castShadow = true; g.add(r);
  const winM = (on) => new THREE.MeshStandardMaterial({ color: 0x0a0c12, emissive: on ? 0xffc878 : 0x000000, emissiveIntensity: on ? 0.9 : 0, roughness: 0.2 });
  [[-2.6, 1.8], [2.6, 1.8], [-2.6, 4.6], [2.6, 4.6]].forEach(([x, y], i) => { const wn = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), winM(lit.includes(i))); wn.position.set(x, y, d / 2 + 0.01); g.add(wn); });
  return g;
}

export function createOutside() {
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x0c1020, 0.03);
  const camera = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.05, 600);
  scene.add(gradientSky([[0, "#04060e"], [0.4, "#0c1226"], [0.5, "#1a1e34"], [0.56, "#070810"], [1, "#020204"]], { radius: 300, stars: 500 }));
  const moon = glowSprite(0xdfe8ff, 16, 0.9); moon.material.fog = false; moon.position.set(-80, 60, -160); scene.add(moon);
  // ground: lawns, the road (Maple St runs along x), sidewalks
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), std(0x16221a, { roughness: 1 })); grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; scene.add(grass);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(400, 8), std(0x1a1a1e, { roughness: 0.55, metalness: 0.2 })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, 7); road.receiveShadow = true; scene.add(road);
  for (const z of [2.3, 11.7]) { const sw = new THREE.Mesh(new THREE.BoxGeometry(400, 0.15, 1.6), std(0x4a4a50, { roughness: 0.9 })); sw.position.set(0, 0.075, z); sw.receiveShadow = true; scene.add(sw); }
  for (let x = -190; x < 190; x += 6) { const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.14), std(0xb8b090)); dash.rotation.x = -Math.PI / 2; dash.position.set(x, 0.02, 7); scene.add(dash); }
  // houses on both sides; Jay's is at x = 0 on the north side
  const colors = [0x5a5a68, 0x6a5a4a, 0x4a5a6a, 0x6a6a6a, 0x5a4a4a];
  for (let i = -4; i <= 4; i++) { if (i === 0) continue; const hs = makeHouse({ color: colors[(i + 9) % 5], lit: i === 2 ? [3] : [] }); hs.position.set(i * 13, 0, -11); scene.add(hs);
    const hs2 = makeHouse({ color: colors[(i + 11) % 5] }); hs2.position.set(i * 13 + 6, 0, 26); hs2.rotation.y = Math.PI; scene.add(hs2); }
  // Jay's house: two storeys, a porch, a red door, 1407, the porch light, his own window glowing upstairs
  const jay = new THREE.Group(); jay.position.set(0, 0, -11); scene.add(jay);
  const body = new THREE.Mesh(new THREE.BoxGeometry(10, 6.5, 8), std(0x7a7468, { roughness: 0.9 })); body.position.y = 3.25; body.castShadow = body.receiveShadow = true; jay.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.9, 2.8, 4), std(0x2a2628)); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.8); roof.position.y = 7.9; jay.add(roof);
  const porch = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.4, 2.4), std(0x6a5a48, { roughness: 0.8 })); porch.position.set(0, 0.2, 5.2); porch.receiveShadow = true; jay.add(porch);
  for (let k = 0; k < 3; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.32), std(0x5a4a3a)); st.position.set(0, 0.07 + k * 0.13 - 0.0, 6.55 + (2 - k) * 0.3 - 0.0); st.receiveShadow = true; jay.add(st); }
  const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.18, 2.8), std(0x3a3434)); porchRoof.position.set(0, 3.1, 5.2); porchRoof.castShadow = true; jay.add(porchRoof);
  for (const x of [-2.5, 2.5]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.7, 0.16), std(0xe8e4dc)); post.position.set(x, 1.75, 6.25); post.castShadow = true; jay.add(post);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), std(0xe8e4dc)); rail.position.set(x * 0.68, 1.15, 6.25); jay.add(rail); }
  const door = new THREE.Mesh(new RoundedBoxGeometry(1.05, 2.15, 0.08, 2, 0.02), std(0x7a1c1c, { roughness: 0.5 })); door.position.set(0, 1.48, 4.04); door.castShadow = door.receiveShadow = true; jay.add(door);
  for (const [x, y, w, h] of [[0, 2.62, 1.3, 0.12], [-0.6, 1.5, 0.1, 2.3], [0.6, 1.5, 0.1, 2.3]]) { const fr = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), std(0xe8e4dc)); fr.position.set(x, y, 4.05); jay.add(fr); }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), std(0xc8a24a, { metalness: 0.9, roughness: 0.25 })); knob.position.set(0.38, 1.45, 4.1); jay.add(knob);
  const peep = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10), std(0xc8a24a, { metalness: 0.9, roughness: 0.25 })); peep.rotation.x = Math.PI / 2; peep.position.set(0, 1.85, 4.09); jay.add(peep);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.28), new THREE.MeshStandardMaterial({ map: signTex([{ text: "1407", font: "700 190px 'Inter', sans-serif" }], { w: 512, h: 230, bg: "#14141a", fg: "#e8e0c8", border: "#8a7a5a" }), roughness: 0.4, metalness: 0.3 }));
  plaque.position.set(1.05, 1.85, 4.06); jay.add(plaque);
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.6), new THREE.MeshStandardMaterial({ map: signTex([{ text: "HOME", font: "700 120px 'Inter', sans-serif" }], { w: 512, h: 280, bg: "#4a3a2a", fg: "#2a1e14", border: "#2a1e14" }), roughness: 1 }));
  mat.rotation.x = -Math.PI / 2; mat.position.set(0, 0.41, 4.6); jay.add(mat);
  const sconce = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.28, 0.14, 2, 0.03), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffc070, emissiveIntensity: 1.2 })); sconce.position.set(-0.95, 2.15, 4.12); jay.add(sconce);
  const porchLight = new THREE.PointLight(0xffb060, 6, 7, 1.6); porchLight.position.set(-0.95, 2.1, 4.5); porchLight.castShadow = true; porchLight.shadow.mapSize.set(512, 512); jay.add(porchLight);
  const winM = (c, i) => new THREE.MeshStandardMaterial({ color: 0x0a0c12, emissive: c, emissiveIntensity: i, roughness: 0.2 });
  const jayWin = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.3), winM(0xffe27a, 0.55)); jayWin.position.set(2.6, 4.7, 4.01); jay.add(jayWin);   // his room: the game's yellow glow
  for (const [x, y] of [[-2.6, 4.7], [-2.8, 1.9], [2.8, 1.9]]) { const wn = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), winM(0x000000, 0)); wn.position.set(x, y, 4.01); jay.add(wn); }
  // the corner street sign under a street lamp, and more lamps down the street (one flickers)
  const signPost = new THREE.Group(); signPost.position.set(12, 0, 2.6); scene.add(signPost);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 10), std(0x8a8a90, { metalness: 0.7, roughness: 0.4 })); pole.position.y = 1.7; signPost.add(pole);
  const blade = (text, ry, y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 0.03), [std(0x1f6a3a), std(0x1f6a3a), std(0x1f6a3a), std(0x1f6a3a), new THREE.MeshStandardMaterial({ map: signTex([{ text, font: "700 150px 'Inter', sans-serif" }]), roughness: 0.35, metalness: 0.2 }), new THREE.MeshStandardMaterial({ map: signTex([{ text, font: "700 150px 'Inter', sans-serif" }]), roughness: 0.35, metalness: 0.2 })]); b.position.y = y; b.rotation.y = ry; signPost.add(b); };
  blade("MAPLE ST", 0, 3.25); blade("CEDAR AVE", Math.PI / 2, 3.0);
  const stop = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.03, 8), new THREE.MeshStandardMaterial({ map: labelTexture("STOP", { w: 256, h: 256, px: 80, color: "#ffffff" }), color: 0xc81e1e, roughness: 0.5 })); stop.rotation.x = Math.PI / 2; stop.position.set(0, 2.25, 0.05); signPost.add(stop);
  const lamps = [];
  for (const [x, z] of [[14.5, 1.8], [-14, 1.8], [-40, 1.8], [40, 1.8], [2, 12.4]]) {
    const lp = new THREE.Group(); lp.position.set(x, 0, z); scene.add(lp);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5.6, 8), std(0x2a2a30, { metalness: 0.6 })); p.position.y = 2.8; lp.add(p);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.3), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })); head.position.set(0, 5.6, z > 6 ? -0.4 : 0.4); lp.add(head);
    const l = new THREE.SpotLight(0xffd29a, 70, 18, 0.8, 0.6, 1.2); l.position.set(0, 5.5, z > 6 ? -0.4 : 0.4); l.target.position.set(0, 0, z > 6 ? -1.5 : 1.5); lp.add(l, l.target);
    const halo = glowSprite(0xffc070, 2.2, 0.4); halo.position.copy(head.position); lp.add(halo); lamps.push({ l, head, halo });
  }
  // the town sign at the edge of town, among pines
  const town = new THREE.Group(); town.position.set(-70, 0, 15); town.rotation.y = Math.PI; scene.add(town);
  const board = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.6, 0.12), [std(0x5a4028), std(0x5a4028), std(0x5a4028), std(0x5a4028), new THREE.MeshStandardMaterial({ map: signTex([{ text: "WELCOME TO", font: "700 70px Georgia, serif", gap: 120 }, { text: "CEDAR HOLLOW", font: "700 110px Georgia, serif", gap: 120 }, { text: "EST. 1897", font: "600 56px Georgia, serif", gap: 120 }], { w: 1024, h: 460, bg: "#3a2a1a", fg: "#e8dcc0", border: "#c8b080" }), roughness: 0.8 }), std(0x5a4028)]);
  board.position.y = 1.7; board.castShadow = true; town.add(board);
  for (const x of [-1.4, 1.4]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.4, 0.14), std(0x3a2a1a)); leg.position.set(x, 0.7, 0); town.add(leg); }
  for (let i = 0; i < 40; i++) { const tr = new THREE.Mesh(new THREE.ConeGeometry(0.9 + Math.random() * 0.8, 4 + Math.random() * 4, 7), std(0x0e1a12, { roughness: 1 })); tr.position.set(-90 + Math.random() * 40, 2.5, 18 + Math.random() * 25); tr.castShadow = true; scene.add(tr); }
  // a faint town glow beyond the sign
  for (let i = 0; i < 26; i++) { const s = glowSprite(0xffc878, 0.4, 0.8); s.position.set(-110 + Math.random() * 80, 0.6 + Math.random() * 3, 55 + Math.random() * 40); scene.add(s); }
  // light: moonlight and a camera flash used for the photos
  scene.add(new THREE.HemisphereLight(0x4a5a8a, 0x0a0c10, 0.35));
  const moonL = new THREE.DirectionalLight(0x8aa0ff, 0.6); moonL.position.set(-60, 80, -40); moonL.castShadow = true; moonL.shadow.mapSize.set(1024, 1024); Object.assign(moonL.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 200 }); scene.add(moonL, moonL.target);
  const flash = new THREE.PointLight(0xf4f6ff, 0, 30, 1.6); scene.add(flash);
  // blinds in front of the window view
  const blinds = new THREE.Group(); scene.add(blinds);
  for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.035, 0.01), std(0xc8c4d0)); s.position.set(0, (i - 4) * 0.11, 0); s.rotation.x = 0.9; blinds.add(s); }
  // something tall that casts a shadow but is never seen (used on the porch)
  const shadowMan = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 2.2, 4, 10), new THREE.MeshStandardMaterial({ colorWrite: false, depthWrite: false })); shadowMan.castShadow = true; shadowMan.visible = false; scene.add(shadowMan);

  const set = {
    scene, camera, bloom: { strength: 0.55, radius: 0.5, threshold: 0.8 },
    shots: {   // [camera position, look at, fov]
      town: [[-70.25, 1.75, 4.2], [-70, 1.85, 15], 40],
      street: [[10.6, 1.45, 4.4], [12.05, 3.0, 2.6], 44],
      porch: [[0.8, 1.62, -2.6], [0.68, 1.6, -6.9], 50],
      window: [[2.6, 4.7, -7.3], [12, 2.6, 2.6], 26],
    },
    update(t, { flashOn = 0, flashAt = null, flicker = true, blindsAt = null, shadow = false } = {}) {
      flash.intensity = flashOn * 140; if (flashAt) flash.position.copy(flashAt);
      lamps.forEach((lm, i) => { const on = !(flicker && i === 0 && (Math.sin(t * 17) > 0.6 || Math.sin(t * 3.3) > 0.92)); lm.l.intensity = on ? 40 : 3; lm.head.material.color.set(on ? 0xffd9a0 : 0x2a2418); lm.halo.visible = on; });
      porchLight.intensity = 6 * (Math.sin(t * 23) > 0.95 ? 0.4 : 1);
      blinds.visible = !!blindsAt; if (blindsAt) { blinds.position.copy(blindsAt.pos); blinds.lookAt(blindsAt.look); blinds.children.forEach((sl, i) => (sl.position.y = (i - 4) * 0.11 + (blindsAt.gap ? (i < 4 ? -0.18 : i > 4 ? 0.18 : 9) : 0))); }
      shadowMan.visible = shadow; shadowMan.position.set(-1.5, 1.4, -3.2);
    },
    snapCam(name) { const [p, l, f] = set.shots[name]; camera.position.set(...p); camera.lookAt(...l); camera.fov = f; camera.updateProjectionMatrix(); },
  };
  return set;
}
