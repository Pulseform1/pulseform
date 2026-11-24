// Getaway Heat: a rain-soaked neon avenue at night. Jay's muscle car, driverless police cruisers with light bars,
// and a semi that jackknifes across the road. The city scrolls past the cars (a treadmill) driven by `dist`.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { windowsTexture, labelTexture, radialGlow } from "../textures.js";
import { gradientSky, glowSprite } from "./common.js";

function asphalt() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 1024; const g = c.getContext("2d");
  g.fillStyle = "#0c0b12"; g.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; g.fillRect(Math.random() * 512, Math.random() * 1024, 2, 2); }
  g.fillStyle = "#e8e4d0"; for (const x of [128, 384]) for (let y = 0; y < 1024; y += 256) g.fillRect(x - 4, y, 8, 120);
  g.fillStyle = "#ffd23d"; g.fillRect(250, 0, 5, 1024); g.fillRect(259, 0, 5, 1024);
  g.fillStyle = "#e8e4d0"; g.fillRect(8, 0, 8, 1024); g.fillRect(496, 0, 8, 1024);
  for (let i = 0; i < 14; i++) { g.fillStyle = "rgba(0,0,0,.5)"; g.beginPath(); g.ellipse(Math.random() * 512, Math.random() * 1024, 20 + Math.random() * 60, 40 + Math.random() * 90, 0, 0, 7); g.fill(); }   // puddles: clear so the mirror shows
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 20); t.anisotropy = 8; return t;
}

// a car with wheels. police: black and white with a light bar; driver: "jay" puts Jay in the seat
export function makeStreetCar({ body = 0xff7a1a, police = false, driver = null } = {}) {
  const car = new THREE.Group(), chassis = new THREE.Group(); car.add(chassis);
  const paint = new THREE.MeshPhysicalMaterial({ color: police ? 0x0c0c10 : body, metalness: 0.6, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06 });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf2f2f6, metalness: 0.3, roughness: 0.3, clearcoat: 1 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0a0c14, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.55, clearcoat: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.6 });
  const lower = new THREE.Mesh(new RoundedBoxGeometry(1.95, 0.55, 4.5, 4, 0.16), paint); lower.position.y = 0.55; chassis.add(lower);
  if (police) for (const s of [-1, 1]) { const door = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.42, 1.7), white); door.position.set(0.98 * s, 0.58, 0.05); chassis.add(door); }
  const cabin = new THREE.Mesh(new RoundedBoxGeometry(1.62, 0.5, 2.1, 4, 0.18), glass); cabin.position.set(0, 1.05, 0.25); chassis.add(cabin);
  const roof = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.08, 1.4, 2, 0.04), police ? white : paint); roof.position.set(0, 1.31, 0.35); chassis.add(roof);
  const hood = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.1, 1.5, 2, 0.05), police ? dark : paint); hood.position.set(0, 0.85, -1.45); hood.rotation.x = 0.05; chassis.add(hood);
  for (const [x, z] of [[-0.88, -1.45], [0.88, -1.45], [-0.88, 1.45], [0.88, 1.45]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.3, 24), dark); w.rotation.z = Math.PI / 2; w.position.set(x, 0.37, z); chassis.add(w);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.31, 12), new THREE.MeshStandardMaterial({ color: 0x9a9aa8, metalness: 0.9, roughness: 0.25 })); rim.rotation.z = Math.PI / 2; rim.position.copy(w.position); chassis.add(rim);
  }
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.04), new THREE.MeshBasicMaterial({ color: 0xd8d0c0 })); hl.position.set(0.62 * s, 0.7, -2.26); chassis.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.04), new THREE.MeshBasicMaterial({ color: 0xff1a2a })); tl.position.set(0.6 * s, 0.75, 2.26); chassis.add(tl);
  }
  const userData = { chassis };
  if (police) {   // light bar: red and blue blocks that strobe, with two real lights on top
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.25), new THREE.MeshBasicMaterial({ color: 0xff1a2a })), blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.25), new THREE.MeshBasicMaterial({ color: 0x1a4aff }));
    red.position.set(-0.3, 1.42, 0.35); blue.position.set(0.3, 1.42, 0.35); chassis.add(red, blue);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 8, 24), dark); wheel.position.set(-0.42, 1.0, -0.4); wheel.rotation.x = -0.4; chassis.add(wheel);   // and nobody holding it
    const seat = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.6, 0.15, 2, 0.05), dark); seat.position.set(-0.42, 0.95, 0.35); chassis.add(seat);
    Object.assign(userData, { red, blue, wheel });
  }
  if (driver === "jay") {   // just his head and shoulders show through the glass
    const head = new THREE.Group(); head.position.set(-0.42, 1.12, 0.3); chassis.add(head);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 14), new THREE.MeshStandardMaterial({ color: 0xf2bd96, roughness: 0.55 })));
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshStandardMaterial({ color: 0xf0cc6e, roughness: 0.6 })); hair.rotation.x = -0.5; head.add(hair);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.02, 6, 20, Math.PI), dark); head.add(band);
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 10), new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.9 })); sh.scale.set(1.3, 0.6, 0.9); sh.position.y = -0.3; head.add(sh);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); e.position.set(0.065 * s, 0.03, -0.17); head.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0x111111 })); p.position.set(0.065 * s, 0.03, -0.2); head.add(p); }
    userData.head = head;
  }
  car.traverse((o) => { if (o.isMesh && !o.material.transparent && o.material.type !== "MeshBasicMaterial") o.castShadow = true; });
  car.userData = userData;
  return car;
}

export function createStreet() {
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x1a1030, 0.012);
  const camera = new THREE.PerspectiveCamera(55, 1080 / 1920, 0.1, 600);
  scene.add(gradientSky([[0, "#06040e"], [0.42, "#1a0f33"], [0.5, "#3a1a4a"], [0.55, "#0c0816"], [1, "#030208"]], { radius: 400, stars: 0 }));
  const L = 420;
  // the wet road: a mirror under a dark, mostly-opaque asphalt layer (puddles are see-through)
  const mirror = new Reflector(new THREE.PlaneGeometry(14, L), { clipBias: 0.003, textureWidth: 540, textureHeight: 960, color: 0x9098a8 }); mirror.rotation.x = -Math.PI / 2; mirror.position.z = -L / 2 + 40; scene.add(mirror);
  const at = asphalt(), road = new THREE.Mesh(new THREE.PlaneGeometry(14, L), new THREE.MeshStandardMaterial({ map: at, transparent: true, opacity: 0.86, roughness: 0.35, metalness: 0.3 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, -L / 2 + 40); road.receiveShadow = true; scene.add(road);
  const walkM = new THREE.MeshStandardMaterial({ color: 0x2a2632, roughness: 0.6, metalness: 0.2 });
  for (const s of [-1, 1]) { const walk = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, L), walkM); walk.position.set(9 * s, 0.1, -L / 2 + 40); walk.receiveShadow = true; scene.add(walk); }
  // buildings on both sides (instanced), with neon shop signs
  const wins = [windowsTexture(5, 1), windowsTexture(11, 3)]; wins.forEach((w) => { w.wrapS = w.wrapT = THREE.RepeatWrapping; w.repeat.set(3, 6); });
  const bm = wins.map((w) => new THREE.MeshStandardMaterial({ color: 0x0e0c16, roughness: 0.7, metalness: 0.3, emissive: 0xffffff, emissiveMap: w, emissiveIntensity: 1.1 }));
  const BN = 44, inst = bm.map((m) => new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), m, BN / 2)); inst.forEach((m) => scene.add(m));
  const blds = []; for (let i = 0; i < BN; i++) { const s = i % 2 ? 1 : -1, w = 10 + Math.random() * 6; blds.push({ s, z: -Math.floor(i / 2) * 19 - Math.random() * 4, h: 16 + Math.random() * 50, d: 16 + Math.random() * 3, w, mi: i % 2, idx: Math.floor(i / 2) }); }
  const SIGNS = [["24/7", "#3de0ff"], ["ARCADE", "#ff3df0"], ["NOODLES", "#ffd23d"], ["PULSEBOX", "#c6ff3d"], ["HOTEL", "#ff4f7b"], ["PIZZA", "#ff7a3d"], ["OPEN", "#3dff7a"], ["BAR", "#a56bff"]];
  const signs = SIGNS.map(([txt, col], i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), new THREE.MeshBasicMaterial({ map: labelTexture(txt, { w: 1024, h: 256, px: 150, color: "#ffffff", glow: col }), transparent: true, depthWrite: false, color: new THREE.Color(col).lerp(new THREE.Color(0xffffff), 0.5) }));
    const s = i % 2 ? 1 : -1; m.rotation.y = -s * Math.PI / 2; m.userData = { s, z: -i * 26 - 8, y: 4 + (i % 3) * 2.2 }; scene.add(m); return m; });
  // street lamps
  const poleM = new THREE.MeshStandardMaterial({ color: 0x22222a, metalness: 0.7, roughness: 0.4 }), headM = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  const lamps = []; for (let i = 0; i < 16; i++) { const g = new THREE.Group(), s = i % 2 ? 1 : -1; const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 7, 8), poleM); pole.position.y = 3.5; g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.08), poleM); arm.position.set(-0.9 * s, 6.9, 0); g.add(arm); const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.3), headM); head.position.set(-1.7 * s, 6.82, 0); g.add(head);
    const glow = glowSprite(0xffc070, 3, 0.35); glow.position.set(-1.7 * s, 6.7, 0); g.add(glow); g.userData = { s, z: -Math.floor(i / 2) * 26 }; scene.add(g); lamps.push(g); }
  // rain
  const RAIN = 1600, rp = new Float32Array(RAIN * 6), rb = []; for (let i = 0; i < RAIN; i++) rb.push([(Math.random() * 2 - 1) * 16, Math.random() * 14, -Math.random() * 60 + 12]);
  const rainG = new THREE.BufferGeometry(); rainG.setAttribute("position", new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rainG, new THREE.LineBasicMaterial({ color: 0xb8c0e8, transparent: true, opacity: 0.35 })); rain.frustumCulled = false; scene.add(rain);
  // cars
  const jayCar = makeStreetCar({ body: 0xff6a1a, driver: "jay" }); scene.add(jayCar);
  const cops = [0, 1, 2].map(() => { const c = makeStreetCar({ police: true }); scene.add(c); return c; });
  const beams = [-1, 1].map((s) => { const l = new THREE.SpotLight(0xfff2d8, 22, 60, 0.4, 0.5, 1.2); l.position.set(0.62 * s, 0.75, -2.3); l.target.position.set(0.62 * s, 0, -20); jayCar.userData.chassis.add(l, l.target); return l; });
  const copRed = new THREE.PointLight(0xff1a2a, 0, 14, 1.6), copBlue = new THREE.PointLight(0x2a5aff, 0, 14, 1.6); scene.add(copRed, copBlue);
  // the semi: a cab and a trailer you can just fit under
  const truck = new THREE.Group(); scene.add(truck);
  const tm = new THREE.MeshStandardMaterial({ color: 0xc8c8d0, roughness: 0.5, metalness: 0.5 }), cabM = new THREE.MeshPhysicalMaterial({ color: 0x8a1a1a, metalness: 0.5, roughness: 0.35, clearcoat: 1 });
  const trailer = new THREE.Group(); truck.add(trailer);
  const box = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 13), tm); box.position.y = 1.55 + 1.3; trailer.add(box);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.12, 13.02), new THREE.MeshBasicMaterial({ color: 0xff3d3d })); stripe.position.y = 1.7; trailer.add(stripe);
  for (const z of [4.6, 5.8]) for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 20), new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.7 })); w.rotation.z = Math.PI / 2; w.position.set(1.05 * s, 0.5, z); trailer.add(w); }
  const cab = new THREE.Group(); cab.position.z = -7.6; truck.add(cab);
  const cabBox = new THREE.Mesh(new RoundedBoxGeometry(2.6, 3.2, 2.6, 3, 0.2), cabM); cabBox.position.y = 2.1; cab.add(cabBox);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.45, 20), new THREE.MeshStandardMaterial({ color: 0x0b0b0e })); w.rotation.z = Math.PI / 2; w.position.set(1.1 * s, 0.55, 0); cab.add(w); }
  truck.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const sparks = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(300 * 3), 3)), new THREE.PointsMaterial({ size: 0.08, map: radialGlow(), color: 0xffb050, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparks.frustumCulled = false; scene.add(sparks);

  scene.add(new THREE.HemisphereLight(0x8a7aff, 0x1a0e22, 1.0));
  const key = new THREE.PointLight(0xffc89a, 40, 16, 1.4); scene.add(key); const fill = new THREE.PointLight(0x7a9aff, 30, 18, 1.4); scene.add(fill);
  const dash = new THREE.PointLight(0x3de0ff, 3, 2.2, 1.6); cops[0].userData.chassis.add(dash); dash.position.set(-0.3, 1.15, -0.2);
  const moon = new THREE.DirectionalLight(0x9aa8ff, 0.8); moon.position.set(-20, 40, 10); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 100 }); scene.add(moon, moon.target);

  const wrap = (z, period, off) => (((z % period) + period) % period) - off;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  return {
    scene, camera, jayCar, cops, truck, trailer, bloom: { strength: 0.7, radius: 0.5, threshold: 0.8 },
    // dist: metres travelled; siren: strobe on; spark: 0..1 sparks under the car
    update(t, { dist = 0, siren = 1, spark = 0 } = {}) {
      at.offset.y = (dist / L) * 20;
      blds.forEach((b) => { const z = wrap(b.z + dist, 19 * BN / 2, 19 * BN / 2 - 40); m4.compose(new THREE.Vector3(b.s * (11 + b.w / 2), b.h / 2, z), q, new THREE.Vector3(b.w, b.h, b.d)); inst[b.mi].setMatrixAt(b.idx, m4); });
      inst.forEach((m) => (m.instanceMatrix.needsUpdate = true));
      signs.forEach((m) => { m.position.set(m.userData.s * 10.9, m.userData.y, wrap(m.userData.z + dist, 26 * SIGNS.length, 26 * SIGNS.length - 40)); m.material.opacity = Math.sin(t * 7 + m.userData.z) > 0.96 ? 0.4 : 1; });
      lamps.forEach((g) => g.position.set(g.userData.s * 7.6, 0, wrap(g.userData.z + dist, 26 * 8, 26 * 8 - 40)));
      for (let i = 0; i < RAIN; i++) { const b = rb[i], y = ((b[1] - t * 24) % 14 + 14) % 14, z = wrap(b[2] + dist * 0.5, 72, 60); rp.set([b[0], y, z, b[0] - 0.05, y + 0.55, z + 0.5], i * 6); }
      rainG.attributes.position.needsUpdate = true;
      const strobe = Math.sin(t * 22) > 0; cops.forEach((c, i) => { const u = c.userData; u.red.material.color.setRGB(strobe ? 1 : 0.15, 0.05, 0.08); u.blue.material.color.setRGB(0.05, 0.15, strobe ? 0.15 : 1); u.wheel.rotation.z = Math.sin(t * 3 + i) * 0.5; });
      const lead = cops[0].position; copRed.position.set(lead.x - 0.3, 2, lead.z); copBlue.position.set(lead.x + 0.3, 2, lead.z); copRed.intensity = siren * (strobe ? 60 : 4); copBlue.intensity = siren * (strobe ? 4 : 60);
      const sp = sparks.geometry.attributes.position; for (let i = 0; i < 300; i++) { const k = (i * 0.618 + t * 3) % 1; sp.setXYZ(i, jayCar.position.x + (Math.sin(i * 12.9) * 0.9), spark > 0 ? 0.05 + k * k * 0.6 * (1 + Math.sin(i)) : -50, jayCar.position.z + 2 + k * 6); }
      sp.needsUpdate = true; sparks.material.opacity = spark;
      key.position.set(jayCar.position.x - 3, 4.5, jayCar.position.z - 3); fill.position.set(jayCar.position.x + 4, 3.5, jayCar.position.z + 9);
      moon.target.position.copy(jayCar.position); moon.position.set(jayCar.position.x - 20, 40, jayCar.position.z + 10);
    },
  };
}
