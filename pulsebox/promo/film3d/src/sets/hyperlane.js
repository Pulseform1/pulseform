// Hyperlane: a neon sky highway at sunset over a city, rain, gates, two hover cars. The world scrolls
// past the cars (a treadmill), except at the end where the road simply stops.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { windowsTexture, radialGlow, labelTexture } from "../textures.js";
import { gradientSky, makeKey, glowSprite, clamp } from "./common.js";

function roadTexture() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 1024; const g = c.getContext("2d");
  g.fillStyle = "#120e1c"; g.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; g.fillRect(Math.random() * 512, Math.random() * 1024, 2, 2); }
  g.fillStyle = "#ff3df0"; g.fillRect(14, 0, 10, 1024); g.fillRect(488, 0, 10, 1024);
  g.fillStyle = "#3de0ff"; for (const x of [178, 334]) for (let y = 0; y < 1024; y += 256) g.fillRect(x - 5, y, 10, 150);
  // wet sheen streaks
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(150,120,255,${Math.random() * 0.06})`; g.fillRect(Math.random() * 512, 0, 3 + Math.random() * 6, 1024); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 30); t.anisotropy = 8; return t;
}
function sunTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 512; const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#ffe27a"); gr.addColorStop(0.55, "#ff7a3d"); gr.addColorStop(1, "#ff2a8a");
  g.fillStyle = gr; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill();
  g.globalCompositeOperation = "destination-out"; for (let i = 0; i < 9; i++) { const y = 300 + i * 24, h = 4 + i * 2.2; g.fillRect(0, y, 512, h); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function makeCar({ body = 0xff7a1a, glow = 0xff3df0, driver = "jay" } = {}) {
  const car = new THREE.Group(), hover = new THREE.Group(); car.add(hover);
  const paint = new THREE.MeshPhysicalMaterial({ color: body, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0c0a14, metalness: 0.7, roughness: 0.35 });
  const neonM = new THREE.MeshBasicMaterial({ color: glow });
  const main = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.4, 3.3, 4, 0.17), paint); hover.add(main);
  const nose = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.24, 1.3, 4, 0.11), paint); nose.position.set(0, -0.06, -1.75); nose.rotation.x = 0.08; hover.add(nose);
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.4), dark); splitter.position.set(0, -0.18, -2.3); hover.add(splitter);
  for (const s of [-1, 1]) {
    const pod = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.34, 1.6, 3, 0.12), paint); pod.position.set(0.86 * s, 0.02, 0.75); hover.add(pod);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 2.9), neonM); strip.position.set(0.77 * s, -0.16, -0.1); hover.add(strip);
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.3, 20), dark); eng.rotation.x = Math.PI / 2; eng.position.set(0.86 * s, 0.03, 1.62); hover.add(eng);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), new THREE.MeshBasicMaterial({ color: 0x9adfff })); disc.position.set(0.86 * s, 0.03, 1.78); hover.add(disc);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.03), new THREE.MeshBasicMaterial({ color: 0xffffff })); head.position.set(0.45 * s, 0.0, -2.42); hover.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.03), new THREE.MeshBasicMaterial({ color: 0xff2a5a })); tail.position.set(0.5 * s, 0.17, 1.66); hover.add(tail);
  }
  const fin = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.42, 0.7, 2, 0.03), paint); fin.position.set(0, 0.36, 1.3); fin.rotation.x = -0.35; hover.add(fin);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16), new THREE.MeshPhysicalMaterial({ color: 0x9ab8ff, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.22, clearcoat: 1, depthWrite: false }));
  glass.scale.set(1.15, 0.62, 1.9); glass.position.set(0, 0.22, -0.1); hover.add(glass);
  // the driver's head inside
  const headG = new THREE.Group(); headG.position.set(0, 0.32, 0.05); hover.add(headG);
  const dash = new THREE.PointLight(0x9adfff, 1.6, 1.4, 2); dash.position.set(0, 0.3, -0.55); hover.add(dash);
  if (driver === "jay") {
    const skin = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 16), new THREE.MeshStandardMaterial({ color: 0xf2bd96, roughness: 0.5 })); headG.add(skin);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: 0xf0cc6e, roughness: 0.6 })); hair.rotation.x = -0.5; headG.add(hair);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 })); e.position.set(0.07 * s, 0.02, -0.16); headG.add(e); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), new THREE.MeshBasicMaterial({ color: 0x111111 })); pu.position.set(0.07 * s, 0.02, -0.2); headG.add(pu); }
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 10), new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.9 })); hood.position.set(0, -0.28, 0.05); hood.scale.set(1.3, 0.7, 1); headG.add(hood);
  } else {
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 16), new THREE.MeshStandardMaterial({ color: 0x1a0a2a, metalness: 0.6, roughness: 0.2 })); headG.add(helm);
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.215, 24, 12, -0.9, 1.8, 1.1, 0.7), new THREE.MeshBasicMaterial({ color: 0xff2a5a })); visor.rotation.y = Math.PI; headG.add(visor);
  }
  // under-glow and engine flames
  const under = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 5), new THREE.MeshBasicMaterial({ map: radialGlow(), color: glow, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending })); under.rotation.x = -Math.PI / 2; under.position.y = -0.5; car.add(under);
  const flames = [-1, 1].map((s) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.4, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x7ad8ff, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending })); f.rotation.x = Math.PI / 2; f.position.set(0.86 * s, 0.03, 2.3); hover.add(f); return f; });
  const flareSpr = [-1, 1].map((s) => { const sp = glowSprite(0x9adfff, 0.45, 0.35); sp.position.set(0.86 * s, 0.03, 1.85); hover.add(sp); return sp; });
  const light = new THREE.PointLight(glow, 5, 6, 2); light.position.set(0, -0.3, 0); car.add(light);
  car.traverse((o) => { if (o.isMesh && o.material.blending !== THREE.AdditiveBlending && !o.material.transparent) o.castShadow = true; });
  car.userData = { hover, flames, flareSpr, headG, under };
  car.setBoost = (b, t) => { flames.forEach((f, i) => { const len = 0.45 + b * 1.3 + Math.sin(t * 50 + i) * 0.08; f.scale.set(1 + b * 0.5, len, 1 + b * 0.5); f.position.z = 1.78 + len * 0.7; f.material.color.set(b > 0.5 ? 0x9a7aff : 0x7ad8ff); }); flareSpr.forEach((s) => s.scale.setScalar(0.4 + b * 0.45)); };
  return car;
}

export function createHyperlane() {
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x3a0f5a, 40, 320);
  const camera = new THREE.PerspectiveCamera(62, 1080 / 1920, 0.1, 1200);
  scene.add(gradientSky([[0, "#0e0430"], [0.32, "#3a0a6a"], [0.47, "#b0247a"], [0.5, "#ff6a6a"], [0.53, "#2a0640"], [1, "#05010c"]], { radius: 700, stars: 400 }));
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshBasicMaterial({ map: sunTexture(), transparent: true, fog: false, depthWrite: false })); sun.position.set(0, 55, -640); scene.add(sun);
  const sunGlow = glowSprite(0xff5a8a, 700, 0.55); sunGlow.material.fog = false; sunGlow.position.set(0, 50, -650); scene.add(sunGlow);

  // the road (scrolling texture), its underside and its neon barriers
  const rt = roadTexture();
  const roadMat = new THREE.MeshStandardMaterial({ map: rt, roughness: 0.22, metalness: 0.5, emissive: 0xffffff, emissiveMap: rt, emissiveIntensity: 0.4 });
  const ROAD_L = 900;
  const road = new THREE.Mesh(new THREE.PlaneGeometry(7.4, ROAD_L), roadMat); road.rotation.x = -Math.PI / 2; road.receiveShadow = true;
  const roadG = new THREE.Group(); roadG.add(road); scene.add(roadG);
  const under = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.7, ROAD_L), new THREE.MeshStandardMaterial({ color: 0x0c0818, metalness: 0.6, roughness: 0.4 })); under.position.y = -0.37; roadG.add(under);
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, ROAD_L), new THREE.MeshBasicMaterial({ color: s < 0 ? 0xff3df0 : 0x3de0ff })); rail.position.set(3.75 * s, 0.55, 0); roadG.add(rail);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_L, 0.55), new THREE.MeshBasicMaterial({ color: s < 0 ? 0xff3df0 : 0x3de0ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })); glass.rotation.y = Math.PI / 2; glass.position.set(3.75 * s, 0.27, 0); roadG.add(glass);
  }
  // the broken end of the road (only placed for the last shot)
  const endG = new THREE.Group(); scene.add(endG); endG.visible = false;
  { const m = new THREE.MeshStandardMaterial({ color: 0x1a1426, roughness: 0.5, metalness: 0.4 });
    for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.6 + Math.random() * 1.4, 0.7, 0.5 + Math.random() * 1.2), m); b.position.set(-3.2 + i * 0.8, -0.35 - Math.random() * 0.4, -Math.random() * 0.9); b.rotation.set(Math.random() * 0.5, Math.random() * 0.6, Math.random() * 0.4); endG.add(b); }
    for (let i = 0; i < 14; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2 + Math.random() * 0.6, 0.2 + Math.random() * 0.4, 0.2 + Math.random() * 0.6), m); b.position.set(-3 + Math.random() * 6, -2 - Math.random() * 14, -1 - Math.random() * 6); b.rotation.set(Math.random() * 3, Math.random() * 3, 0); b.userData.spin = Math.random() * 2; b.userData.y0 = b.position.y; b.userData.rx0 = b.rotation.x; endG.add(b); }
    const spark = glowSprite(0xff7a3d, 3, 0.8); spark.position.set(2.5, -0.2, 0); endG.add(spark); }

  // the city far below
  const CITY = 360, cityG = new THREE.Group(); scene.add(cityG);
  const wins = [windowsTexture(3, 0), windowsTexture(9, 2)];
  wins.forEach((w) => { w.wrapS = w.wrapT = THREE.RepeatWrapping; w.repeat.set(2, 3); });
  const cityMats = wins.map((w) => new THREE.MeshStandardMaterial({ color: 0x0b0a16, roughness: 0.7, metalness: 0.3, emissive: 0xffffff, emissiveMap: w, emissiveIntensity: 1.4 }));
  const box = new THREE.BoxGeometry(1, 1, 1), inst = cityMats.map((m) => new THREE.InstancedMesh(box, m, CITY / 2));
  const cityItems = [];
  { const m4 = new THREE.Matrix4();
    for (let i = 0; i < CITY; i++) {
      let x = (Math.random() * 2 - 1) * 220; if (Math.abs(x) < 14) x += Math.sign(x || 1) * 14;
      const w = 8 + Math.random() * 16, h = 30 + Math.random() * 90, z = -Math.random() * 900 + 100;
      cityItems.push({ x, z, w, h, mesh: i % 2, idx: Math.floor(i / 2) });
      m4.compose(new THREE.Vector3(x, -120 + h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, w)); inst[i % 2].setMatrixAt(Math.floor(i / 2), m4);
    } }
  inst.forEach((m) => cityG.add(m));
  // pillars holding the road up, and the gates
  const pillarM = new THREE.MeshStandardMaterial({ color: 0x120c22, metalness: 0.6, roughness: 0.35 });
  const pillars = []; for (let i = 0; i < 12; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, 120, 1.6), pillarM); p.position.set(0, -60.8, 0); scene.add(p); pillars.push(p); }
  const gates = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group(), col = i % 2 ? 0x3de0ff : 0xff3df0;
    const arch = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.14, 10, 64, Math.PI), new THREE.MeshBasicMaterial({ color: col })); g.add(arch);
    const arch2 = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.05, 6, 64, Math.PI), new THREE.MeshBasicMaterial({ color: 0xffffff })); g.add(arch2);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.9), new THREE.MeshBasicMaterial({ map: labelTexture("HYPERLANE", { w: 1024, h: 220, px: 150, color: "#ffffff", glow: i % 2 ? "#3de0ff" : "#ff3df0" }), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    sign.position.y = 6.0; g.add(sign);
    scene.add(g); gates.push(g);
  }
  // rain
  const RAIN = 1400, rp = new Float32Array(RAIN * 6), rbase = [];
  for (let i = 0; i < RAIN; i++) rbase.push([(Math.random() * 2 - 1) * 14, Math.random() * 16 - 2, -Math.random() * 70 + 10]);
  const rainG = new THREE.BufferGeometry(); rainG.setAttribute("position", new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rainG, new THREE.LineBasicMaterial({ color: 0xc8b8ff, transparent: true, opacity: 0.45 })); rain.frustumCulled = false; scene.add(rain);

  // cars, the key
  const jayCar = makeCar({ body: 0xff7a1a, glow: 0xff3df0, driver: "jay" }); scene.add(jayCar);
  const rival = makeCar({ body: 0x5a2aff, glow: 0x3de0ff, driver: "rival" }); scene.add(rival);
  const key = makeKey(0xff3df0); key.scale.setScalar(1.3); key.halo.material.opacity = 0.45; key.mat.emissiveIntensity = 1.1; scene.add(key);

  scene.add(new THREE.HemisphereLight(0xff8ad8, 0x1a0630, 0.9));
  const sunL = new THREE.DirectionalLight(0xffa070, 2.2); sunL.position.set(0, 30, -80); scene.add(sunL);
  const top = new THREE.DirectionalLight(0x8a7aff, 1.2); top.position.set(10, 30, 20); top.castShadow = true; top.shadow.mapSize.set(1024, 1024);
  Object.assign(top.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 80 }); scene.add(top, top.target);

  const wrap = (z, L, off) => (((z % L) + L) % L) - off;
  return {
    scene, camera, jayCar, rival, key, bloom: { strength: 0.6, radius: 0.5, threshold: 0.78 },
    // dist: metres travelled (drives every scrolling thing); endZ: where the road stops (null = endless)
    update(t, { dist = 0, endZ = null, rainSpeed = 1 } = {}) {
      rt.offset.y = (dist / ROAD_L) * 30;
      if (endZ === null) { roadG.position.z = -ROAD_L / 2 + 60; roadG.scale.z = 1; endG.visible = false; }
      else { const len = 400; roadG.scale.z = len / ROAD_L; roadG.position.z = endZ + len / 2; endG.visible = true; endG.position.set(0, 0, endZ);
        const fall = Math.max(0, t - 11);   // seconds into the last shot (shots.js passes T = lt + 11)
        endG.children.forEach((b) => { if (b.userData.spin) { b.rotation.x = b.userData.rx0 + 0.6 * b.userData.spin * fall; b.position.y = b.userData.y0 - 0.9 * fall; } }); }
      // the city and pillars move with the road
      const m4 = new THREE.Matrix4();
      cityItems.forEach((c) => { const z = wrap(c.z + dist, 900, 800); m4.compose(new THREE.Vector3(c.x, -120 + c.h / 2, z), new THREE.Quaternion(), new THREE.Vector3(c.w, c.h, c.w)); inst[c.mesh].setMatrixAt(c.idx, m4); });
      inst.forEach((m) => (m.instanceMatrix.needsUpdate = true));
      pillars.forEach((p, i) => { p.position.z = wrap(i * 40 + dist, 480, 420); p.visible = endZ === null || p.position.z > endZ + 2; });
      gates.forEach((g, i) => { g.position.z = wrap(i * 70 + dist + 20, 350, 300); g.visible = endZ === null || g.position.z > endZ; });
      for (let i = 0; i < RAIN; i++) { const b = rbase[i]; const y = ((b[1] - t * 22 * rainSpeed) % 16 + 16) % 16 - 2, z = wrap(b[2] + dist * 0.9, 80, 70); rp.set([b[0], y, z, b[0], y + 0.5, z + 0.9], i * 6); }
      rainG.attributes.position.needsUpdate = true;
      top.position.set(jayCar.position.x + 8, 30, jayCar.position.z + 20); top.target.position.copy(jayCar.position);
    },
    placeGate(i, z) { gates[i].position.z = z; },
    gates,
  };
}
