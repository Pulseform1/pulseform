// Jay as a stylized 3D character built from rounded primitives, with a simple joint rig and poses.
import * as THREE from "three";

const cap = (r, len, mat, seg = 12) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, seg), mat);
const ball = (r, mat, ws = 24, hs = 16) => new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat);
function hang(mesh, len) { mesh.position.y = -len / 2; return mesh; }   // a limb that hangs from its joint

export function makeJay({ variant = "jay" } = {}) {
  const S = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o });
  const dark = variant === "copy";
  const m = dark ? {
    hood: S(0x0d0d14, { roughness: 0.35, metalness: 0.4 }), skin: S(0x15151c, { roughness: 0.3, metalness: 0.3 }), hair: S(0x0a0a10, { roughness: 0.3 }), jeans: S(0x0a0a12, { roughness: 0.4 }),
    shoe: S(0x111118, { roughness: 0.3 }), eyeW: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdfe8ff, emissiveIntensity: 1.3 }), pupil: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.8 }), mouth: S(0x000000),
  } : {
    hood: new THREE.MeshPhysicalMaterial({ color: 0xff8a3d, roughness: 0.9, sheen: 1, sheenColor: new THREE.Color(0xffb27a), sheenRoughness: 0.6 }),
    skin: new THREE.MeshPhysicalMaterial({ color: 0xf2bd96, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color(0xffd6c0) }),
    hair: S(0xf0cc6e, { roughness: 0.6 }), jeans: S(0x34466e, { roughness: 0.9 }), shoe: S(0xf4f4f8, { roughness: 0.45 }),
    eyeW: S(0xffffff, { roughness: 0.15 }), pupil: S(0x16110e, { roughness: 0.08 }), mouth: S(0x5a2a22, { roughness: 0.6 }),
  };
  const root = new THREE.Group(), J = {};
  const add = (parent, name, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };
  const hips = add(root, "hips", 0, 0.86, 0);
  const spine = add(hips, "spine", 0, 0.05, 0);
  const torso = cap(0.27, 0.36, m.hood, 16); torso.scale.set(1.18, 1, 0.82); torso.position.y = 0.3; spine.add(torso);
  const belly = cap(0.25, 0.1, m.hood, 16); belly.scale.set(1.15, 1, 0.82); belly.position.y = 0.08; spine.add(belly);
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.05), m.hood); pocket.position.set(0, 0.12, 0.21); spine.add(pocket);
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.075, 10, 20), m.hood); hood.position.set(0, 0.62, -0.1); hood.rotation.x = 1.2; spine.add(hood);
  const neck = add(spine, "neck", 0, 0.66, 0);
  const head = add(neck, "head", 0, 0.32, 0);
  const skull = ball(0.31, m.skin, 32, 24); skull.scale.set(1, 1.02, 0.96); head.add(skull);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.335, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.62), m.hair); hairCap.rotation.x = -1.0; hairCap.position.set(0, 0.02, -0.015); head.add(hairCap);
  const fringe = ball(0.2, m.hair); fringe.scale.set(1.3, 0.36, 0.62); fringe.position.set(0.06, 0.2, 0.19); fringe.rotation.set(-0.75, 0, -0.3); head.add(fringe);
  for (const [x, y, z, sc] of [[-0.1, 0.3, 0.06, 1], [0.08, 0.31, 0.03, 0.9], [0.0, 0.27, 0.14, 0.85]]) { const tuft = ball(0.09 * sc, m.hair); tuft.scale.set(1.3, 0.75, 1.1); tuft.position.set(x, y, z); head.add(tuft); }
  for (const s of [-1, 1]) {
    const ear = ball(0.065, m.skin); ear.position.set(0.3 * s, -0.01, 0); ear.scale.set(0.6, 1, 1); head.add(ear);
    const eye = ball(0.07, m.eyeW); eye.position.set(0.105 * s, 0.03, 0.26); eye.scale.set(1, 1.15, 0.6); head.add(eye); J["eye" + s] = eye;
    const pupil = ball(0.04, m.pupil); pupil.position.set(0.105 * s, 0.03, 0.3); head.add(pupil); J["pupil" + s] = pupil;
    if (!dark) { const glint = ball(0.012, new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(0.105 * s + 0.015, 0.05, 0.33); head.add(glint); }
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.022, 0.03), m.hair); brow.position.set(0.105 * s, 0.14, 0.27); brow.rotation.z = -0.12 * s; head.add(brow); J["brow" + s] = brow;
  }
  const mouth = cap(0.022, 0.06, m.mouth); mouth.rotation.z = Math.PI / 2; mouth.position.set(0, -0.13, 0.27); head.add(mouth); J.mouth = mouth;
  const nose = ball(0.035, m.skin); nose.position.set(0, -0.04, 0.3); head.add(nose);
  for (const s of [-1, 1]) {   // arms: shoulder -> elbow -> hand
    const sh = add(spine, "shoulder" + s, 0.33 * s, 0.52, 0);
    const ball1 = ball(0.11, m.hood); sh.add(ball1);
    sh.add(hang(cap(0.095, 0.24, m.hood), 0.3));
    const el = add(sh, "elbow" + s, 0, -0.32, 0);
    el.add(hang(cap(0.085, 0.22, m.hood), 0.26));
    const hand = ball(0.085, m.skin); hand.position.y = -0.33; hand.scale.set(0.9, 1.1, 0.75); el.add(hand); J["hand" + s] = hand;
  }
  for (const s of [-1, 1]) {   // legs: hip -> knee -> foot
    const hp = add(hips, "hip" + s, 0.14 * s, -0.02, 0);
    hp.add(hang(cap(0.12, 0.3, m.jeans), 0.43));
    const kn = add(hp, "knee" + s, 0, -0.43, 0);
    kn.add(hang(cap(0.105, 0.3, m.jeans), 0.42));
    const foot = add(kn, "foot" + s, 0, -0.42, 0);
    const shoe = cap(0.085, 0.16, m.shoe); shoe.rotation.x = Math.PI / 2; shoe.position.set(0, -0.02, 0.07); shoe.scale.set(1.15, 1, 0.9); foot.add(shoe);
  }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { root, J, mats: m };
}

// ---------------------------------------------------------------- poses (all reset first, then set)
function reset(J) { for (const k in J) { J[k].rotation.set(0, 0, 0); } J.hips.position.y = 0.86; J.hips.position.z = 0; J.eye1.scale.y = J["eye-1"].scale.y = 1.15; }
export function pose(rig, name, t = 0, p = {}) {
  const { J } = rig; reset(J);
  const breathe = Math.sin(t * 2.2) * 0.015;
  J.spine.rotation.x = breathe;
  const look = (yaw = 0, pitch = 0) => { J.head.rotation.y = yaw; J.head.rotation.x = pitch; J.neck.rotation.y = yaw * 0.3; };
  const fear = p.fear ?? 0;   // wide eyes, raised brows, open mouth
  for (const s of [-1, 1]) { J["brow" + s].position.y = 0.14 + fear * 0.04; J["brow" + s].rotation.z = -0.12 * s + fear * 0.25 * s; }
  J.mouth.scale.set(1 + fear * 0.2, 1 - fear * 0.3, 1); J.mouth.rotation.z = Math.PI / 2;
  if (fear > 0.3) { J.mouth.rotation.z = 0; J.mouth.scale.set(1.2, 0.6 + fear * 0.6, 1); }
  const blink = (!p.noBlink && Math.sin(t * 1.3) > 0.985) ? 0.1 : 1; J.eye1.scale.y = J["eye-1"].scale.y = 1.15 * blink * (1 + fear * 0.25);
  switch (name) {
    case "sit": {   // in the gaming chair, hands on keyboard and mouse
      J.hips.position.y = 0.62; J.spine.rotation.x = 0.08 + (p.lean ?? 0) * 0.35 + breathe;
      for (const s of [-1, 1]) { J["hip" + s].rotation.x = -1.45; J["knee" + s].rotation.x = 1.5; J["shoulder" + s].rotation.x = -0.95 - (p.lean ?? 0) * 0.3; J["shoulder" + s].rotation.z = 0.12 * s; J["elbow" + s].rotation.x = -0.75; }
      if (p.click) { J["elbow1"].rotation.x = -0.75 - Math.max(0, Math.sin(p.click * Math.PI)) * 0.25; }
      look(p.yaw ?? 0, p.pitch ?? -0.05);
      break;
    }
    case "slumped": { J.hips.position.y = 0.62; J.spine.rotation.x = 0.55; for (const s of [-1, 1]) { J["hip" + s].rotation.x = -1.45; J["knee" + s].rotation.x = 1.5; J["shoulder" + s].rotation.x = -1.4; J["elbow" + s].rotation.x = -1.6; J["shoulder" + s].rotation.z = 0.45 * s; } look(0, 0.5 - (p.wake ?? 0) * 0.6); break; }
    case "stand": { for (const s of [-1, 1]) { J["shoulder" + s].rotation.z = 0.12 * s; J["elbow" + s].rotation.x = -0.15; } look(p.yaw ?? 0, p.pitch ?? 0); break; }
    case "crouch": {   // just landed
      const k = p.k ?? 1; J.hips.position.y = 0.86 - 0.36 * k; J.spine.rotation.x = 0.45 * k;
      for (const s of [-1, 1]) { J["hip" + s].rotation.x = -1.2 * k; J["knee" + s].rotation.x = 1.9 * k; J["foot" + s].rotation.x = -0.6 * k; J["shoulder" + s].rotation.x = -0.6 * k; J["shoulder" + s].rotation.z = 0.5 * s * k; J["elbow" + s].rotation.x = -0.5 * k; }
      look(0, -0.2 * k); break;
    }
    case "run": {
      const ph = p.phase ?? t * 11, sw = 0.95;
      J.hips.position.y = 0.86 - Math.abs(Math.sin(ph)) * 0.06; J.spine.rotation.x = 0.22;
      for (const s of [-1, 1]) {
        const q = Math.sin(ph + (s > 0 ? 0 : Math.PI));
        J["hip" + s].rotation.x = -q * sw; J["knee" + s].rotation.x = Math.max(0, q) * 1.5 + 0.2;
        J["shoulder" + s].rotation.x = q * 0.9; J["elbow" + s].rotation.x = -1.3;
      }
      look(0, 0.05); break;
    }
    case "walk": {
      const ph = p.phase ?? t * 5.5, sw = 0.42;
      J.hips.position.y = 0.86 - Math.abs(Math.sin(ph)) * 0.025; J.spine.rotation.x = 0.04 + breathe;
      for (const s of [-1, 1]) {
        const q = Math.sin(ph + (s > 0 ? 0 : Math.PI));
        J["hip" + s].rotation.x = -q * sw; J["knee" + s].rotation.x = Math.max(0, -Math.cos(ph + (s > 0 ? 0 : Math.PI))) * 0.7 + 0.05;
        J["shoulder" + s].rotation.x = q * 0.4 * (p.armsUp ? 0 : 1) - (p.armsUp ?? 0) * 0.9; J["shoulder" + s].rotation.z = 0.1 * s; J["elbow" + s].rotation.x = -0.3 - (p.armsUp ?? 0) * 0.6;
      }
      look(p.yaw ?? 0, p.pitch ?? 0); break;
    }
    case "reach": {   // one arm out toward someone
      const k = p.k ?? 1; J.spine.rotation.x = 0.1 * k;
      J["shoulder-1"].rotation.x = -1.45 * k; J["elbow-1"].rotation.x = -0.15 * k; J["shoulder1"].rotation.z = 0.12; J["elbow1"].rotation.x = -0.15;
      look(p.yaw ?? 0, p.pitch ?? 0); break;
    }
    case "hold": {   // holding the keys out in front
      for (const s of [-1, 1]) { J["shoulder" + s].rotation.x = -1.0; J["shoulder" + s].rotation.z = -0.25 * s; J["elbow" + s].rotation.x = -0.6; }
      look(0, 0.25); break;
    }
    case "recoil": {
      J.spine.rotation.x = -0.15;
      for (const s of [-1, 1]) { J["shoulder" + s].rotation.x = -2.2; J["shoulder" + s].rotation.z = -0.4 * s; J["elbow" + s].rotation.x = -1.9; }
      look(0, 0.1); break;
    }
  }
}
