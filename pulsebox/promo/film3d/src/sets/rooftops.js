// Rooftop Rush: six rooftops in a storm, a city far below, the game's security drone with a searchlight, the crawler
// coming after Jay, and the biggest gap in the game before the FINISH arch. Jay and the crawler move along a path
// (`s` = metres run, toward -z); gaps are jumped on an arc.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { makeJay } from "../jay.js";
import { makeCrawler, makeDrone } from "../creatures.js";
import { windowsTexture, labelTexture } from "../textures.js";
import { gradientSky, glowSprite } from "./common.js";

// roofs: [start z, end z, height]; the gap before the last one is the big jump
export const ROOFS = [[12, -24, 0], [-26.8, -44, 0.8], [-47.2, -62, -0.4], [-64.6, -80, 0.4], [-83, -96, 1.0], [-102.5, -140, 1.6]];
const BIG = 4;   // the gap after roof 4
export function roofAt(z) { return ROOFS.findIndex(([a, b]) => z <= a && z >= b); }
// where a runner is after running s metres; big: how the big jump goes ("make" = lands, "catch" = falls short and hangs)
export function runnerAt(s, { catchIt = true } = {}) {
  const z = 12 - s, i = roofAt(z);
  if (i >= 0) return { z, y: ROOFS[i][2], air: 0, roof: i };
  if (z > ROOFS[0][0]) return { z, y: ROOFS[0][2], air: 0, roof: 0 };   // not on the run yet
  if (z < ROOFS[ROOFS.length - 1][1]) return { z, y: ROOFS[ROOFS.length - 1][2], air: 0, roof: ROOFS.length - 1 };
  const j = ROOFS.findIndex(([, b], n) => z < b && ROOFS[n + 1] && z > ROOFS[n + 1][0]), a = ROOFS[j], b2 = ROOFS[j + 1];   // between roof j and j+1
  const k = (a[1] - z) / (a[1] - b2[0]), big = j === BIG;
  const y0 = a[2], y1 = big && catchIt ? b2[2] - 1.15 : b2[2], apex = Math.max(y0, y1) + (big ? 1.4 : 0.9);
  const y = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * apex + k * k * y1;
  return { z, y, air: k, roof: -1, gap: j, big };
}

export function createRooftops() {
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x1a1230, 0.012);
  const camera = new THREE.PerspectiveCamera(55, 1080 / 1920, 0.05, 800);
  const sky = gradientSky([[0, "#05040c"], [0.3, "#1a1236"], [0.46, "#3a1e52"], [0.5, "#5a2a5a"], [0.53, "#140c22"], [1, "#030208"]], { radius: 500, stars: 0 }); scene.add(sky);
  const wins = [windowsTexture(7, 0), windowsTexture(13, 2), windowsTexture(17, 4)]; wins.forEach((w) => { w.wrapS = w.wrapT = THREE.RepeatWrapping; w.repeat.set(3, 12); });
  const bodyMats = wins.map((w) => new THREE.MeshStandardMaterial({ color: 0x12101c, roughness: 0.75, metalness: 0.25, emissive: 0xffffff, emissiveMap: w, emissiveIntensity: 1.0 }));
  const roofM = new THREE.MeshStandardMaterial({ color: 0x2a2632, roughness: 0.35, metalness: 0.35 }), parM = new THREE.MeshStandardMaterial({ color: 0x3a3442, roughness: 0.6 });
  const propM = new THREE.MeshStandardMaterial({ color: 0x5a5a66, roughness: 0.45, metalness: 0.6 });
  // the six buildings we run across
  ROOFS.forEach(([a, b, y], i) => {
    const len = a - b, zc = (a + b) / 2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(14, 90, len), bodyMats[i % 3]); body.position.set(0, y - 45.15, zc); scene.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, len), roofM); roof.position.set(0, y - 0.15, zc); roof.receiveShadow = true; scene.add(roof);
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, len), parM); p.position.set(6.85 * s, y + 0.3, zc); p.castShadow = p.receiveShadow = true; scene.add(p); }
    const edgeLight = new THREE.Mesh(new THREE.BoxGeometry(14, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: i === BIG ? 0xff3d3d : 0xffb23f })); edgeLight.position.set(0, y - 0.02, b - 0.02); scene.add(edgeLight);
    // props: AC units, vents, an antenna with a blinking light
    for (let k = 0; k < 3; k++) { const ac = new THREE.Mesh(new RoundedBoxGeometry(1.6, 1.0, 1.2, 2, 0.06), propM); ac.position.set((k % 2 ? 1 : -1) * (3.8 + (k % 3) * 0.6), y + 0.5, a - 4 - k * (len - 8) / 3); ac.castShadow = true; scene.add(ac);
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 20), new THREE.MeshStandardMaterial({ color: 0x15151a })); fan.position.copy(ac.position).add(new THREE.Vector3(0, 0.51, 0)); scene.add(fan); }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 6, 6), propM); mast.position.set(-5.5, y + 3, b + 3); scene.add(mast);
    const blink = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2a2a })); blink.position.set(-5.5, y + 6.05, b + 3); blink.userData.blink = i; scene.add(blink);
  });
  // a water tower on roof 2, a billboard on roof 3
  { const [a, , y] = ROOFS[2]; const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3, 24), new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.8 })); tank.position.set(4.5, y + 5, a - 7); scene.add(tank);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.1, 24), tank.material); cone.position.set(4.5, y + 7.05, a - 7); scene.add(cone);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.5), propM); leg.position.set(4.5 + dx, y + 1.75, a - 7 + dz); scene.add(leg); } }
  { const [a, , y] = ROOFS[3]; const bb = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.6), new THREE.MeshBasicMaterial({ map: labelTexture("ROOFTOP RUSH", { w: 1024, h: 340, px: 150, color: "#ffffff", glow: "#ffb23f" }), transparent: true, color: 0xffd27a, side: THREE.FrontSide }));
    bb.position.set(-4, y + 4.5, a - 6); bb.rotation.y = 0.5; scene.add(bb);
    const bb2 = bb.clone(); bb2.rotation.y = 0.5 + Math.PI; bb2.position.add(new THREE.Vector3(-0.05, 0, -0.03)); scene.add(bb2);   // readable from both sides
    const frame = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.12, 0.12), propM); frame.position.set(-4, y + 3.15, a - 6); frame.rotation.y = 0.5; scene.add(frame); }
  // the finish arch on the last roof
  const [fa, , fy] = ROOFS[5];
  const finish = new THREE.Group(); finish.position.set(0, fy, fa - 9); scene.add(finish);
  const archM = new THREE.MeshBasicMaterial({ color: 0x4fd8ff });
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 0.2), archM); leg.position.set(3.2 * s, 2, 0); finish.add(leg); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.9, 0.2), new THREE.MeshBasicMaterial({ map: labelTexture("FINISH", { w: 1024, h: 140, px: 110, color: "#ffffff", glow: "#4fd8ff" }), transparent: true })); top.position.y = 4.2; top.rotation.y = Math.PI; finish.add(top);
  // the city around and far below
  const CN = 240, cityM = bodyMats.map((m) => new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), m, CN / 3)); cityM.forEach((m) => scene.add(m));
  { const m4 = new THREE.Matrix4(); for (let i = 0; i < CN; i++) { let x = (Math.random() * 2 - 1) * 160; if (Math.abs(x) < 12) x += Math.sign(x || 1) * 12; const z = 40 - Math.random() * 320, w = 10 + Math.random() * 16, h = 40 + Math.random() * 120;
    m4.compose(new THREE.Vector3(x, -95 + h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, w)); cityM[i % 3].setMatrixAt(Math.floor(i / 3), m4); } cityM.forEach((m) => (m.instanceMatrix.needsUpdate = true)); }
  const streetGlow = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: 0x3a1a4a, fog: false })); streetGlow.rotation.x = -Math.PI / 2; streetGlow.position.y = -94; scene.add(streetGlow);
  // rain
  const RAIN = 1500, rp = new Float32Array(RAIN * 6), rb = []; for (let i = 0; i < RAIN; i++) rb.push([(Math.random() * 2 - 1) * 14, Math.random() * 16 - 4, (Math.random() * 2 - 1) * 26]);
  const rainG = new THREE.BufferGeometry(); rainG.setAttribute("position", new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rainG, new THREE.LineBasicMaterial({ color: 0xb8b0e0, transparent: true, opacity: 0.38 })); rain.frustumCulled = false; scene.add(rain);
  // runners and the drone
  const jay = makeJay(); jay.root.scale.setScalar(0.78); jay.root.rotation.y = Math.PI; scene.add(jay.root);
  const crawler = makeCrawler(); crawler.root.scale.setScalar(1.35); scene.add(crawler.root);
  const crawlLight = new THREE.PointLight(0xcfe0ff, 5, 4.5, 1.5); crawlLight.position.set(0.6, 1.8, -1.4); crawler.root.add(crawlLight);
  const drone = makeDrone(); scene.add(drone.root);
  // light: a moody fill, a sky light for lightning, a warm rim from the city
  const hemi = new THREE.HemisphereLight(0x7a6aaa, 0x1a0a18, 0.5); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x9a9aff, 0.7); moon.position.set(-30, 50, 20); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 120 }); scene.add(moon, moon.target);
  const rim = new THREE.DirectionalLight(0xff8a5a, 0.6); rim.position.set(30, 10, -60); scene.add(rim);
  const blinks = []; scene.traverse((o) => { if (o.userData.blink !== undefined) blinks.push(o); });

  return {
    scene, camera, jay, crawler, drone, finish, bloom: { strength: 0.65, radius: 0.5, threshold: 0.82 },
    // lightning: 0..1 flash; jayS / crawlerS: metres run; red: a red alarm wash (the hook)
    update(t, { lightning = 0, center = null } = {}) {
      hemi.intensity = 0.5 + lightning * 3; hemi.color.setRGB(0.48 + lightning * 0.5, 0.42 + lightning * 0.5, 0.67 + lightning * 0.3);
      blinks.forEach((b) => (b.visible = Math.sin(t * 3 + b.userData.blink) > 0.3));
      const c = center || jay.root.position;
      for (let i = 0; i < RAIN; i++) { const b = rb[i], y = ((b[1] - t * 20) % 16 + 16) % 16 - 4; rp.set([c.x + b[0], c.y + y, c.z + b[2], c.x + b[0] + 0.05, c.y + y + 0.6, c.z + b[2] + 0.2], i * 6); }
      rainG.attributes.position.needsUpdate = true;
      moon.target.position.copy(c); moon.position.set(c.x - 30, c.y + 50, c.z + 20);
    },
  };
}
