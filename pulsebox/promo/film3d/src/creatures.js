// The thing that hunts Jay through One Life (a pale, long-limbed crawler) and Rooftop Rush's security drone.
import * as THREE from "three";
import { radialGlow } from "./textures.js";

const cap = (r, len, mat, seg = 10) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, seg), mat);

// The crawler runs on all fours along -z (its head points -z). crawl(t, { phase, jaw, rear }) animates it.
export function makeCrawler() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skin = new THREE.MeshStandardMaterial({ color: 0xcfc4b8, roughness: 0.62, metalness: 0.02 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a0404, roughness: 0.4 });
  // torso: long and thin, a ridge of spine
  const torso = cap(0.2, 0.95, skin, 14); torso.rotation.x = Math.PI / 2; torso.scale.set(1, 1, 0.8); body.add(torso);
  for (let i = 0; i < 9; i++) { const v = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), skin); v.position.set(0, 0.17, -0.5 + i * 0.12); body.add(v); }
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) { const rib = cap(0.018, 0.16, skin, 6); rib.position.set(0.16 * s, 0.02, -0.35 + i * 0.1); rib.rotation.z = 1.2 * s; body.add(rib); }
  // neck and head (no nose; black eyes with pinprick lights; a mouth that opens too wide)
  const neck = new THREE.Group(); neck.position.set(0, 0.08, -0.62); body.add(neck);
  const neckM = cap(0.07, 0.25, skin); neckM.rotation.x = Math.PI / 2 - 0.5; neckM.position.set(0, 0.05, -0.12); neck.add(neckM);
  const head = new THREE.Group(); head.position.set(0, 0.12, -0.32); neck.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), skin); skull.scale.set(0.85, 1.05, 1.25); head.add(skull);
  const eyes = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), dark); e.position.set(0.075 * s, 0.05, -0.2); e.scale.set(1, 1.4, 0.6); head.add(e);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(0.075 * s, 0.05, -0.235); head.add(glint); return glint; });
  const jawPivot = new THREE.Group(); jawPivot.position.set(0, -0.06, -0.08); head.add(jawPivot);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), skin); jaw.scale.set(0.9, 0.6, 1.3); jaw.position.z = -0.06; jawPivot.add(jaw);
  const maw = new THREE.Mesh(new THREE.CircleGeometry(0.11, 20), dark); maw.rotation.x = Math.PI / 2 + 0.2; maw.position.set(0, -0.02, -0.12); maw.scale.set(1, 1.5, 1); jawPivot.add(maw);
  for (let i = 0; i < 9; i++) { const a = -1.1 + i * 0.275; const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.06, 5), new THREE.MeshStandardMaterial({ color: 0xeee6d0, roughness: 0.3 }));
    tooth.position.set(Math.sin(a) * 0.12, -0.03, -0.08 - Math.cos(a) * 0.14); tooth.rotation.x = Math.PI; head.add(tooth); }
  // four long limbs: shoulder/hip -> elbow/knee -> hand/foot
  const limbs = [[-1, -0.42, 0.62], [1, -0.42, 0.62], [-1, 0.42, 0.55], [1, 0.42, 0.55]].map(([s, z, len]) => {
    const top = new THREE.Group(); top.position.set(0.17 * s, 0, z); body.add(top);
    const upper = cap(0.045, len, skin); upper.position.y = -len / 2; top.add(upper);
    const knee = new THREE.Group(); knee.position.y = -len; top.add(knee);
    const lower = cap(0.035, len * 0.95, skin); lower.position.y = -len * 0.48; knee.add(lower);
    const hand = new THREE.Group(); hand.position.y = -len * 0.95; knee.add(hand);
    for (let f = 0; f < 3; f++) { const finger = cap(0.012, 0.13, skin, 5); finger.position.set((f - 1) * 0.03, -0.03, -0.06); finger.rotation.x = 1.2; hand.add(finger); }
    return { top, knee, s, front: z < 0 };
  });
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  const set = {
    root, head, neck, jawPivot, eyes,
    // phase drives the gait; rear lifts the front half up (rearing), jaw opens the mouth
    crawl(t, { phase = t * 9, jaw = 0.15, rear = 0, lookUp = 0 } = {}) {
      body.position.y = 0.62 + Math.abs(Math.sin(phase)) * 0.05 + rear * 0.35; body.rotation.x = -rear * 0.7 + Math.sin(phase * 2) * 0.03;
      limbs.forEach((l, i) => {
        const q = Math.sin(phase + ((i === 0 || i === 3) ? 0 : Math.PI));
        if (l.front) { l.top.rotation.x = -0.35 + q * 0.75 - rear * 1.2; l.knee.rotation.x = 0.9 + Math.max(0, -q) * 0.7; l.top.rotation.z = 0.35 * l.s; }
        else { l.top.rotation.x = 0.4 + q * 0.7; l.knee.rotation.x = -1.2 - Math.max(0, q) * 0.6; l.top.rotation.z = 0.4 * l.s; }
      });
      neck.rotation.x = 0.3 - lookUp * 0.6 + Math.sin(phase * 2) * 0.05; head.rotation.z = Math.sin(t * 2.3) * 0.15;
      jawPivot.rotation.x = jaw * 0.9;
    },
  };
  set.crawl(0);
  return set;
}

// Rooftop Rush's drone: a quadcopter with spinning rotors, a red eye and a searchlight
export function makeDrone() {
  const root = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0x1a1c24, roughness: 0.35, metalness: 0.7 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.16, 8), shell); root.add(body);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), shell); dome.position.y = 0.08; root.add(dome);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), new THREE.MeshBasicMaterial({ color: 0xff2a3a })); eye.position.set(0, -0.08, -0.26); root.add(eye);
  const eyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialGlow(), color: 0xff2a3a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 })); eyeGlow.scale.setScalar(0.5); eye.add(eyeGlow);
  const rotors = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2, arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.5), shell);
    arm.position.set(Math.sin(a) * 0.32, 0.02, Math.cos(a) * 0.32); arm.rotation.y = a; root.add(arm);
    const blur = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), new THREE.MeshBasicMaterial({ color: 0x8890a0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    blur.rotation.x = -Math.PI / 2; blur.position.set(Math.sin(a) * 0.55, 0.07, Math.cos(a) * 0.55); root.add(blur); rotors.push(blur);
    const nav = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), new THREE.MeshBasicMaterial({ color: i < 2 ? 0x3dff7a : 0xff3d3d })); nav.position.set(Math.sin(a) * 0.55, 0.0, Math.cos(a) * 0.55); root.add(nav);
  }
  // the searchlight: a real spotlight and a soft visible beam
  const light = new THREE.SpotLight(0xdde8ff, 140, 30, 0.32, 0.5, 1.2); light.position.set(0, -0.1, -0.1); root.add(light, light.target); light.target.position.set(0, -8, -4);
  const bc = document.createElement("canvas"); bc.width = 4; bc.height = 256; { const g = bc.getContext("2d"); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(220,232,255,0)"); gr.addColorStop(1, "rgba(220,232,255,.05)"); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); }
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.3, 9, 32, 1, true), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  root.add(beam);
  const aimBeam = () => { const d = light.target.position.clone().sub(light.position); const len = d.length(); beam.scale.set(1, len / 9, 1); beam.position.copy(light.position).addScaledVector(d, 0.5); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d.normalize()); };
  aimBeam();
  return {
    root, light, beam,
    update(t, target = null) {   // target: a world point to light up
      rotors.forEach((r, i) => (r.rotation.z = t * 40 + i)); root.rotation.z = Math.sin(t * 1.7) * 0.06; root.rotation.x = Math.sin(t * 1.3) * 0.05;
      eye.material.color.setRGB(1, 0.16 + (Math.sin(t * 6) > 0 ? 0.1 : 0), 0.2);
      if (target) { root.updateMatrixWorld(); light.target.position.copy(root.worldToLocal(target.clone())); }
      aimBeam();
    },
  };
}
