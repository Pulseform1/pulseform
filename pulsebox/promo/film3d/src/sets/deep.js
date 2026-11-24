// Deep Signal: the bottom of the ocean. A little yellow sub with a headlight beam, marine snow, a rocky
// canyon that only shows up when the sonar pings, the key on a ledge, and the eye behind him.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { radialGlow } from "../textures.js";
import { makeKey, glowSprite, clamp } from "./common.js";

const n3 = (x, y, z) => Math.sin(x * 1.7 + y * 0.6) * Math.cos(z * 1.3 - x * 0.4) + Math.sin(y * 2.3 + z * 0.9) * 0.5 + Math.sin(x * 4.1 - z * 3.3) * 0.2;
function rock(r, seed) {
  const g = new THREE.IcosahedronGeometry(r, 3), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = v.clone().normalize(); const d = 1 + n3(n.x * 2 + seed, n.y * 2, n.z * 2 - seed) * 0.22; v.copy(n).multiplyScalar(r * d); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}
function eyeTexture() {
  // equirectangular: the iris is a cap around the centre of the map (which faces forward)
  const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const g = c.getContext("2d");
  g.fillStyle = "#4a1a0a"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 120; i++) { g.strokeStyle = `rgba(160,20,10,${0.2 + Math.random() * 0.3})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); let x = Math.random() * 1024, y = Math.random() * 512; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
  const R = 160, gr = g.createRadialGradient(512, 256, 10, 512, 256, R); gr.addColorStop(0, "#fff27a"); gr.addColorStop(0.45, "#ffb02a"); gr.addColorStop(0.82, "#c2410c"); gr.addColorStop(1, "#1a0502");
  g.fillStyle = gr; g.beginPath(); g.arc(512, 256, R, 0, 7); g.fill();
  for (let i = 0; i < 260; i++) { const a = Math.random() * Math.PI * 2, r0 = 25 + Math.random() * 40, r1 = 90 + Math.random() * 65; g.strokeStyle = `rgba(${Math.random() < 0.5 ? "90,20,0" : "255,240,160"},${0.15 + Math.random() * 0.3})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); g.moveTo(512 + Math.cos(a) * r0, 256 + Math.sin(a) * r0); g.lineTo(512 + Math.cos(a) * r1, 256 + Math.sin(a) * r1); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createDeep() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x01060b); scene.fog = new THREE.FogExp2(0x021820, 0.1);
  const camera = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.05, 300);
  // the sea floor and the canyon walls
  const floorG = new THREE.PlaneGeometry(160, 160, 100, 100); { const p = floorG.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, n3(p.getX(i) * 0.2, p.getY(i) * 0.2, 0) * 0.9 + Math.abs(p.getX(i)) * 0.08); floorG.computeVertexNormals(); }
  const rockM = new THREE.MeshStandardMaterial({ color: 0x3a4a50, roughness: 0.95, flatShading: true });
  const sea = new THREE.Mesh(floorG, new THREE.MeshStandardMaterial({ color: 0x2a3430, roughness: 1 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -6; scene.add(sea);
  const rocks = new THREE.Group(); scene.add(rocks);
  let sd = 3; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 34; i++) {
    const side = i % 2 ? 1 : -1, z = 14 - i * 1.6 - r() * 2, x = side * (7 + r() * 4), s = 1.8 + r() * 1.8;
    const m = new THREE.Mesh(rock(1, i * 1.3), rockM); m.position.set(x, -6 + r() * 7, z); m.scale.set(s, s * (1 + r()), s); m.rotation.set(r() * 3, r() * 3, r() * 3); rocks.add(m);
  }
  const ledge = new THREE.Mesh(rock(1, 9.1), rockM); ledge.position.set(0.6, -5.2, -13); ledge.scale.set(2.4, 1.4, 2); rocks.add(ledge);
  // glowing specks on the rocks (bioluminescence)
  const BL = 220, bp = new Float32Array(BL * 3); for (let i = 0; i < BL; i++) { const z = 14 - Math.random() * 56, side = Math.random() < 0.5 ? -1 : 1; bp.set([side * (3.6 + Math.random() * 4), -6 + Math.random() * 8, z], i * 3); }
  const blG = new THREE.BufferGeometry(); blG.setAttribute("position", new THREE.BufferAttribute(bp, 3));
  const bio = new THREE.Points(blG, new THREE.PointsMaterial({ size: 0.12, map: radialGlow(), color: 0x3de0ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(bio);
  // marine snow
  const SN = 1600, snp = new Float32Array(SN * 3), snb = []; for (let i = 0; i < SN; i++) snb.push([(Math.random() * 2 - 1) * 9, Math.random() * 12 - 7, 12 - Math.random() * 34]);
  const snowG = new THREE.BufferGeometry(); snowG.setAttribute("position", new THREE.BufferAttribute(snp, 3));
  const snow = new THREE.Points(snowG, new THREE.PointsMaterial({ size: 0.035, map: radialGlow(), color: 0xcfe8ff, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })); snow.frustumCulled = false; scene.add(snow);

  // the sub (faces -z)
  const sub = new THREE.Group(); scene.add(sub);
  const yellow = new THREE.MeshPhysicalMaterial({ color: 0xffc83d, metalness: 0.35, roughness: 0.35, clearcoat: 0.8 }), metal = new THREE.MeshStandardMaterial({ color: 0x3a3a44, metalness: 0.8, roughness: 0.3 });
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.9, 32, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffc83d, metalness: 0.35, roughness: 0.35, clearcoat: 0.8, side: THREE.DoubleSide })); hull.rotation.x = Math.PI / 2; hull.position.z = 0.5; sub.add(hull);
  const rear = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), yellow); rear.rotation.x = Math.PI / 2; rear.position.z = 1.45; sub.add(rear);
  const wallIn = new THREE.Mesh(new THREE.CircleGeometry(0.69, 32), new THREE.MeshStandardMaterial({ color: 0x15202a, roughness: 0.6 })); wallIn.position.z = 0.05; wallIn.rotation.y = Math.PI; sub.add(wallIn);
  const tower = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.45, 0.8, 3, 0.12), yellow); tower.position.set(0, 0.72, 0.65); sub.add(tower);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 16), new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0, clearcoat: 1, depthWrite: false }));
  dome.position.z = -0.45; sub.add(dome);
  const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.71, 0.06, 10, 32), metal); ringM.position.z = -0.45; sub.add(ringM);
  const duct = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 10, 32), metal); duct.position.z = 2.3; sub.add(duct);
  const prop = new THREE.Group(); prop.position.z = 2.3; sub.add(prop);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, 0.04), metal); b.position.y = 0.18; const h = new THREE.Group(); h.rotation.z = (i / 3) * Math.PI * 2; h.add(b); prop.add(h); }
  for (const [x, y, rz] of [[0.75, 0, 0], [-0.75, 0, 0], [0, 0.6, Math.PI / 2]]) { const f = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.06, 0.5, 2, 0.02), yellow); f.position.set(x, y, 1.75); f.rotation.z = rz; sub.add(f); }
  for (const x of [-0.5, 0.5]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), metal); arm.position.set(x, -0.55, -0.55); sub.add(arm); const lampHead = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.14, 16), metal); lampHead.rotation.x = Math.PI / 2; lampHead.position.set(x, -0.55, -0.85); sub.add(lampHead); const lens = glowSprite(0xffffff, 0.5, 1); lens.position.set(x, -0.55, -0.93); sub.add(lens); }
  // Jay's head in the dome, lit by the sonar screen
  const head = new THREE.Group(); head.position.set(0, 0.02, -0.5); sub.add(head);
  const skinM = new THREE.MeshStandardMaterial({ color: 0xf2bd96, roughness: 0.5 });
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), skinM); head.add(skull);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.275, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), new THREE.MeshStandardMaterial({ color: 0xf0cc6e, roughness: 0.6 })); hair.rotation.x = 0.55; head.add(hair);
  const eyes = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 })); e.position.set(0.09 * s, 0.03, -0.22); e.scale.set(1, 1.25, 0.6); head.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), new THREE.MeshBasicMaterial({ color: 0x0a0a0a })); p.position.set(0.09 * s, 0.03, -0.255); head.add(p); return e; });
  const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.05, 4, 8), new THREE.MeshStandardMaterial({ color: 0x5a2a22 })); mouth.rotation.z = Math.PI / 2; mouth.position.set(0, -0.11, -0.23); head.add(mouth);
  const hoodie = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 12), new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.9 })); hoodie.position.set(0, -0.36, 0.05); hoodie.scale.set(1.25, 0.7, 1); head.add(hoodie);
  const fill = new THREE.PointLight(0x7ac8e0, 4, 7, 1.6); fill.position.set(1.6, 1.8, 0.4); sub.add(fill);
  const faceL = new THREE.PointLight(0xffd0a8, 0.6, 1.2, 2); faceL.position.set(0.15, 0.15, -1.0); sub.add(faceL);
  const screenGlow = new THREE.PointLight(0x3de0ff, 0.7, 1.2, 2); screenGlow.position.set(0, -0.15, -0.98); sub.add(screenGlow);
  const sonarScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2), new THREE.MeshBasicMaterial({ color: 0x1a8a9a })); sonarScreen.position.set(0, -0.36, -0.98); sonarScreen.rotation.set(-0.7, Math.PI, 0); sub.add(sonarScreen);
  // headlight and its beam through the murk
  const lamp = new THREE.SpotLight(0xd8f0ff, 90, 30, 0.42, 0.5, 1.3); lamp.position.set(0, -0.55, -0.95); lamp.target.position.set(0, -2.5, -14); sub.add(lamp, lamp.target);
  const beamC = document.createElement("canvas"); beamC.width = 4; beamC.height = 256; { const g = beamC.getContext("2d"); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(200,235,255,0)"); gr.addColorStop(1, "rgba(200,235,255,.32)"); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); }
  const beamT = new THREE.CanvasTexture(beamC);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(3.2, 13, 32, 1, true), new THREE.MeshBasicMaterial({ map: beamT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beam.rotation.x = -Math.PI / 2 + 0.15; beam.position.set(0, -1.5, -7.4); sub.add(beam);

  // the ping: a shell of light that expands, and a light that rides it
  const pingMat = new THREE.ShaderMaterial({
    uniforms: { uFade: { value: 0 }, uCol: { value: new THREE.Color(0x3de0ff) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }",
    fragmentShader: "uniform float uFade; uniform vec3 uCol; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.-abs(dot(vN,vV)), 4.); gl_FragColor = vec4(uCol*(f*1.6), f*uFade); }",
  });
  const ping = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), pingMat); scene.add(ping);
  const pingLight = new THREE.PointLight(0x7ae8ff, 0, 30, 1.2); scene.add(pingLight);

  // the key on the ledge
  const key = makeKey(0x3de0ff); key.scale.setScalar(0.7); key.position.set(0.6, -3.4, -13); scene.add(key);

  // the creature: a vast head, an eye with lids, a jaw of teeth (behind the sub, facing it)
  const beast = new THREE.Group(); beast.position.set(-1.5, -1, 7.5); scene.add(beast);
  const skinB = new THREE.MeshStandardMaterial({ color: 0x1c2a28, roughness: 0.55, metalness: 0.15, flatShading: true });
  const skullB = new THREE.Mesh(rock(1, 4.4), skinB); skullB.scale.set(7, 5, 8); skullB.position.set(0, 0.5, 6); beast.add(skullB);
  const eyeM = new THREE.MeshStandardMaterial({ map: eyeTexture(), emissive: 0xffffff, emissiveMap: eyeTexture(), emissiveIntensity: 0.4, roughness: 0.15 });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(1.7, 48, 32), eyeM); eye.position.set(0, 1.2, -1.2); eye.rotation.y = Math.PI / 2; beast.add(eye);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0x050202 })); pupil.scale.set(0.22, 1.25, 0.2); pupil.position.set(0, 1.2, -2.85); beast.add(pupil);
  const lidM = new THREE.MeshStandardMaterial({ color: 0x18211f, roughness: 0.6, flatShading: true, side: THREE.DoubleSide });
  const lids = [1, -1].map((s) => { const piv = new THREE.Group(); piv.position.set(0, 1.2, -1.2); const l = new THREE.Mesh(new THREE.SphereGeometry(1.82, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), lidM); if (s < 0) l.rotation.x = Math.PI; piv.add(l); beast.add(piv); return piv; });
  const teethM = new THREE.MeshStandardMaterial({ color: 0xd8d0b8, roughness: 0.4 });
  for (let i = 0; i < 11; i++) { const tth = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.4 + (i % 3) * 0.5, 8), teethM); const a = -0.9 + i * 0.18; tth.position.set(Math.sin(a) * 4.4, -2.6, -1.3 + Math.cos(a) * 1.5); tth.rotation.x = Math.PI; beast.add(tth); }
  const eyeLight = new THREE.PointLight(0xffa02a, 0, 14, 1.5); eyeLight.position.set(0, 1.2, -3.5); beast.add(eyeLight);

  scene.add(new THREE.HemisphereLight(0x2a6a8a, 0x020405, 0.18));
  return {
    scene, camera, sub, head, eyes, mouth, key, beast, eye, pupil, bloom: { strength: 0.6, radius: 0.5, threshold: 0.85 },
    // ping: seconds since the ping (null = none), open: the eye 0..1
    update(t, { ping: pt = null, open = 0, fear = 0, subZ = 0 } = {}) {
      sub.position.set(0, -0.6 + Math.sin(t * 0.9) * 0.08, subZ); sub.rotation.z = Math.sin(t * 0.7) * 0.03; prop.rotation.z = t * 9;
      for (let i = 0; i < SN; i++) { const b = snb[i]; snp.set([b[0] + Math.sin(t * 0.3 + i) * 0.2, ((b[1] + t * 0.18) % 12 + 12) % 12 - 7, b[2]], i * 3); }
      snowG.attributes.position.needsUpdate = true;
      if (pt !== null && pt >= 0) { const rr = 0.8 + pt * 16; ping.visible = true; ping.scale.setScalar(rr); ping.position.copy(sub.position); pingMat.uniforms.uFade.value = clamp(1 - pt / 2.2); pingLight.position.copy(sub.position); pingLight.distance = rr * 1.4 + 2; pingLight.intensity = 600 * clamp(1 - pt / 2.6) * clamp(pt * 6); }
      else { ping.visible = false; pingLight.intensity = 0; }
      lids[0].rotation.x = open * 1.15; lids[1].rotation.x = -open * 1.15; pupil.scale.set(0.22 - open * 0.08, 1.25, 0.2); eyeM.emissiveIntensity = 0.15 + open * 0.9; eyeLight.intensity = open * 120;
      eyes.forEach((e) => e.scale.set(1 + fear * 0.25, 1.25 + fear * 0.35, 0.6)); mouth.scale.set(1, 1 + fear * 2, 1);
      key.rotation.y = t * 1.6;
    },
  };
}
