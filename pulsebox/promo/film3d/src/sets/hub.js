// Inside the 78th game: a dark coliseum of 77 glowing game doors (three tiers), a hologram "78",
// a mirror floor, the white EXIT door, and the copy of Jay. Also the tunnel of game tiles Jay falls through.
import * as THREE from "three";
import { makeJay } from "../jay.js";
import { ALL_GAMES, gameColors, FEATURED, hologram78, labelTexture, radialGlow } from "../textures.js";
import { glossFloor, gradientSky, makeKey, tileAtlas, quadBatch, glowSprite, clamp } from "./common.js";

export const R = 8, TIERS = 3, SLOTS = 26, EXIT_SLOT = 13;
const DOOR_W = 1.25, DOOR_H = 2.3, TIER_Y = [0.05, 3.3, 6.55];
const doorAngle = (tier, slot) => ((slot + (tier % 2) * 0.5) / SLOTS) * Math.PI * 2;

// which game sits in which slot: the featured worlds flank the exit, everything else fills in
function slotNames() {
  const front = { 12: "Hyperlane", 14: "Deep Signal", 11: "The Endless Halls", 15: "Night Shift", 10: "Safecracker", 16: "Penalty Shootout", 9: "Getaway Heat", 17: "One More Night" };
  const rest = ALL_GAMES.filter((n) => !Object.values(front).includes(n));
  const out = [];
  for (let i = 0; i < TIERS * SLOTS; i++) { if (i === EXIT_SLOT) out.push("EXIT"); else if (front[i]) out.push(front[i]); else out.push(rest.shift()); }
  return out;
}
const hex = (c) => new THREE.Color(c);
function frameTexture() {
  const c = document.createElement("canvas"); c.width = 128; c.height = 192; const g = c.getContext("2d");
  g.shadowColor = "#fff"; g.shadowBlur = 14; g.strokeStyle = "#fff"; g.lineWidth = 7; g.strokeRect(14, 14, 100, 164);
  g.shadowBlur = 0; g.lineWidth = 3; g.strokeRect(14, 14, 100, 164);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createHub() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04030a); scene.fog = new THREE.FogExp2(0x07051a, 0.028);
  const camera = new THREE.PerspectiveCamera(45, 1080 / 1920, 0.05, 500);
  scene.add(gradientSky([[0, "#0c0624"], [0.45, "#120a30"], [0.55, "#05030c"], [1, "#020108"]], { radius: 200, stars: 900 }));
  const floor = glossFloor(80, { opacity: 0.78, gridScale: 40, grid: "#2b1f66" }); scene.add(floor);

  // ---- doors
  const names = slotNames(), N = names.length;
  const atlasNames = names.map((n) => (n === "EXIT" ? "Pulsebox" : n));
  const atlas = tileAtlas(atlasNames);
  const panels = quadBatch(N), frames = quadBatch(N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const doorInfo = names.map((name, i) => {
    const tier = Math.floor(i / SLOTS), slot = i % SLOTS, a = doorAngle(tier, slot), y = TIER_Y[tier] + DOOR_H / 2;
    const p = new THREE.Vector3(Math.sin(a) * R, y, Math.cos(a) * R);
    q.setFromEuler(e.set(0, a + Math.PI, 0));
    m4.compose(p, q, new THREE.Vector3(1, 1, 1)); panels.set(i, m4, DOOR_W, DOOR_H, atlas.uv(i));
    const fp = p.clone().add(new THREE.Vector3(-Math.sin(a), 0, -Math.cos(a)).multiplyScalar(0.03));
    m4.compose(fp, q, new THREE.Vector3(1, 1, 1)); frames.set(i, m4, DOOR_W + 0.34, DOOR_H + 0.34, [0, 0, 1, 1]);
    const col = name === "EXIT" ? hex("#ffffff") : hex((FEATURED[name] || gameColors(name))[0]);
    return { name, tier, slot, a, pos: p, col };
  });
  panels.commit(); frames.commit();
  const panelMesh = new THREE.Mesh(panels.geo, new THREE.MeshBasicMaterial({ map: atlas.texture, vertexColors: true, side: THREE.DoubleSide }));
  const frameMesh = new THREE.Mesh(frames.geo, new THREE.MeshBasicMaterial({ map: frameTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  scene.add(panelMesh, frameMesh);
  // the order the doors go dark in (never the exit)
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const darkOrder = doorInfo.map((d, i) => i).filter((i) => i !== EXIT_SLOT).sort(() => rnd() - 0.5);
  const darkRank = new Array(N).fill(-1); darkOrder.forEach((i, r) => (darkRank[i] = r));

  // the walls behind the doors and the balconies between tiers
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.25, R + 0.25, 10.2, 78, 1, true), new THREE.MeshStandardMaterial({ color: 0x0b0918, roughness: 0.6, metalness: 0.4, side: THREE.BackSide }));
  wall.position.y = 5.0; scene.add(wall);
  const neon = (c) => new THREE.MeshBasicMaterial({ color: c });
  for (const y of [3.12, 6.37]) {
    const deck = new THREE.Mesh(new THREE.RingGeometry(R - 0.9, R + 0.25, 96, 1), new THREE.MeshStandardMaterial({ color: 0x0d0a1c, roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide }));
    deck.rotation.x = -Math.PI / 2; deck.position.y = y; scene.add(deck);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(R - 0.9, 0.025, 6, 160), neon(0x7a5cff)); edge.rotation.x = Math.PI / 2; edge.position.y = y; scene.add(edge);
  }
  const baseEdge = new THREE.Mesh(new THREE.TorusGeometry(R - 0.6, 0.03, 6, 160), neon(0x7a5cff)); baseEdge.rotation.x = Math.PI / 2; baseEdge.position.y = 0.02; scene.add(baseEdge);
  // the centre platform: a ring of light and a projector
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.3, 0.08, 64), new THREE.MeshStandardMaterial({ color: 0x120c22, roughness: 0.3, metalness: 0.7 })); pad.position.y = 0.04; pad.receiveShadow = true; scene.add(pad);
  const padRing = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.03, 6, 120), neon(0xff2a5a)); padRing.rotation.x = Math.PI / 2; padRing.position.y = 0.09; scene.add(padRing);
  const padRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.015, 6, 120), neon(0xff2a5a)); padRing2.rotation.x = Math.PI / 2; padRing2.position.y = 0.09; scene.add(padRing2);

  // the hologram "78" (always faces the camera) with a beam under it
  const holoMat = new THREE.MeshBasicMaterial({ map: hologram78(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff, side: THREE.DoubleSide, fog: false });
  const holo = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), holoMat); holo.position.set(0, 6.4, 0); scene.add(holo);
  const holoGlow = glowSprite(0xff2a5a, 9, 0.25); holoGlow.position.copy(holo.position); scene.add(holoGlow);
  const beamC = document.createElement("canvas"); beamC.width = 4; beamC.height = 256; { const g = beamC.getContext("2d"); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,42,90,0)"); gr.addColorStop(1, "rgba(255,42,90,.55)"); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); }
  const beamT = new THREE.CanvasTexture(beamC); beamT.colorSpace = THREE.SRGBColorSpace;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 0.5, 4.2, 48, 1, true), new THREE.MeshBasicMaterial({ map: beamT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  beam.position.y = 2.2; beam.visible = false; scene.add(beam);

  // the exit: a white door that can swing open, a label, light that floods out
  const ex = doorInfo[EXIT_SLOT];
  const exitGroup = new THREE.Group(); exitGroup.position.copy(ex.pos); exitGroup.rotation.y = ex.a + Math.PI; scene.add(exitGroup);
  const exitPanelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const hinge = new THREE.Group(); hinge.position.set(-DOOR_W / 2, 0, 0.06); exitGroup.add(hinge);
  const exitPanel = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, DOOR_H, 0.06), new THREE.MeshStandardMaterial({ color: 0xdfe6ff, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.2 }));
  exitPanel.position.x = DOOR_W / 2; hinge.add(exitPanel);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.9, roughness: 0.2 })); knob.position.set(DOOR_W - 0.15, 0, 0.05); hinge.add(knob);
  const exitLight = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, DOOR_H), exitPanelMat); exitLight.position.z = 0.01; exitGroup.add(exitLight);
  const exitLabel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: labelTexture("EXIT", { w: 512, h: 128, px: 100, color: "#ffffff", glow: "#ffffff" }), transparent: true, depthWrite: false }));
  exitLabel.position.set(0, DOOR_H / 2 + 0.42, 0.05); exitGroup.add(exitLabel);
  const exitGlow = glowSprite(0xeaf0ff, 6, 0.0); exitGlow.position.set(0, 0, 0.4); exitGroup.add(exitGlow);
  const exitSpot = new THREE.SpotLight(0xe8eeff, 0, 30, 0.7, 0.6, 1.2); exitSpot.position.copy(ex.pos).add(new THREE.Vector3(0, 0.4, 0)); exitSpot.target.position.set(0, 0, 0); scene.add(exitSpot, exitSpot.target);

  // light
  scene.add(new THREE.HemisphereLight(0x5a4aff, 0x100818, 0.55));
  const red = new THREE.PointLight(0xff2a5a, 18, 14, 1.6); red.position.set(0, 4.2, 0); scene.add(red);
  const key = new THREE.SpotLight(0xb8a8ff, 70, 20, 0.45, 0.6, 1.4); key.position.set(2.5, 9, 4); key.target.position.set(0, 0, 0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005; scene.add(key, key.target);
  const rimL = new THREE.PointLight(0x3de0ff, 8, 10, 2); rimL.position.set(-3, 2.2, -3); scene.add(rimL);

  // Jay, the copy, the keys he carries
  const jay = makeJay(); jay.root.scale.setScalar(0.78); scene.add(jay.root);
  const copy = makeJay({ variant: "copy" }); copy.root.scale.setScalar(0.78); copy.root.visible = false; scene.add(copy.root);
  const copyEyes = glowSprite(0xffffff, 0.2, 0.5);
  const copyLight = new THREE.PointLight(0xff2a5a, 0, 2.5, 2); copy.J.head.add(copyLight); copyLight.position.set(0.2, -0.5, 0.8); copy.J.head.add(copyEyes); copyEyes.position.set(0, 0.03, 0.32);
  const keys = [0xff3df0, 0x3de0ff, 0xffe27a].map((c) => { const k = makeKey(c); k.scale.setScalar(0.32); k.visible = false; scene.add(k); return k; });

  // floating motes rising through the room
  const M = 500, mp = new Float32Array(M * 3); for (let i = 0; i < M; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * (R - 1); mp[i * 3] = Math.cos(a) * r; mp[i * 3 + 1] = Math.random() * 10; mp[i * 3 + 2] = Math.sin(a) * r; }
  const moteG = new THREE.BufferGeometry(); moteG.setAttribute("position", new THREE.BufferAttribute(mp, 3));
  const motes = new THREE.Points(moteG, new THREE.PointsMaterial({ size: 0.05, map: radialGlow(), color: 0xb39cff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 })); scene.add(motes);

  const set = {
    scene, camera, jay, copy, copyLight, keys, doorInfo, holo, exitGroup, bloom: { strength: 0.55, radius: 0.45, threshold: 0.82 }, exposure: 1.0,
    // dark: how many doors have gone dark (0..76); lit: brightness of the ones still on
    update(lt, p = {}) {
      const dark = p.dark ?? 0, flick = p.flicker ?? 0;
      doorInfo.forEach((d, i) => {
        if (i === EXIT_SLOT) { const w = p.exit ?? 0.35; panels.bright(i, w * 1.15, w * 1.15, w * 1.25); frames.bright(i, w * 1.3, w * 1.3, w * 1.4); return; }
        const r = darkRank[i]; let b = 0.85;
        if (r < dark) b = 0.05; else if (r < dark + 1) { const f = dark - Math.floor(dark); b = f > 0 ? (Math.sin(lt * 60 + i) > 0 ? 1.1 : 0.15) * (1 - f) + 0.05 : 0.85; }
        if (flick && Math.sin(lt * 37 + i * 1.7) > 0.6) b *= 0.4;
        panels.bright(i, b); frames.bright(i, d.col.r * b * 1.05, d.col.g * b * 1.05, d.col.b * b * 1.05);
      });
      panels.colorsDirty(); frames.colorsDirty();
      // hologram faces the camera and breathes with the voice
      holo.quaternion.copy(camera.quaternion); const hv = p.holo ?? 1, pulse = p.holoPulse ?? 0;
      holoMat.opacity = hv * (0.85 + Math.sin(lt * 23) * 0.08); holo.visible = hv > 0.01; holo.scale.setScalar(1 + pulse * 0.06);
      holoGlow.material.opacity = hv * (0.22 + pulse * 0.25); beam.visible = hv > 0.01; beam.material.opacity = hv * (0.7 + pulse * 0.3);
      red.intensity = 18 * (0.4 + hv * 0.6) * (1 + pulse * 0.6);
      motes.position.y = -((lt * 0.25) % 10) * 0.1;
      const exitW = p.exit ?? 0.35;
      exitPanel.material.emissiveIntensity = 0.12 + exitW * 0.75; exitGlow.material.opacity = clamp(exitW - 0.3) * 0.22 + (p.exitOpen ?? 0) * 1.5; exitGlow.scale.setScalar(3 + (p.exitOpen ?? 0) * 30);
      exitSpot.intensity = exitW * 28 + (p.exitOpen ?? 0) * 400; hinge.rotation.y = -(p.exitOpen ?? 0) * 1.9; exitLight.visible = (p.exitOpen ?? 0) > 0;
      key.intensity = p.keyLight ?? 70; floor.top.material.opacity = 0.78;
    },
  };
  return set;
}

// the fall: a tunnel of game tiles rushing past, a light at the end
export function createTunnel() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a0420); scene.fog = new THREE.Fog(0x0a0420, 6, 60);
  const camera = new THREE.PerspectiveCamera(70, 1080 / 1920, 0.05, 200);
  const names = ALL_GAMES, atlas = tileAtlas(names.slice(0, 66), { cols: 11 });
  const RINGS = 28, PER = 10, RAD = 3.4, GAP = 2.9, count = RINGS * PER, b = quadBatch(count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let r = 0; r < RINGS; r++) for (let k = 0; k < PER; k++) {
    const i = r * PER + k, a = (k / PER) * Math.PI * 2 + r * 0.31;
    const p = new THREE.Vector3(Math.cos(a) * RAD, Math.sin(a) * RAD, -r * GAP);
    q.setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, p.z), p, new THREE.Vector3(0, 0, -1)));
    m4.compose(p, q, new THREE.Vector3(1, 1, 1)); b.set(i, m4, 1.5, 2.25, atlas.uv(i % 66)); b.bright(i, 0.9);
  }
  b.commit();
  const tiles = new THREE.Mesh(b.geo, new THREE.MeshBasicMaterial({ map: atlas.texture, vertexColors: true, side: THREE.DoubleSide })); scene.add(tiles);
  // speed streaks
  const S = 400, sp = new Float32Array(S * 6);
  for (let i = 0; i < S; i++) { const a = Math.random() * Math.PI * 2, r = 0.8 + Math.random() * 2.4, z = -Math.random() * RINGS * GAP, l = 2 + Math.random() * 4; sp.set([Math.cos(a) * r, Math.sin(a) * r, z, Math.cos(a) * r, Math.sin(a) * r, z - l], i * 6); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0xd8c8ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending })));
  const end = glowSprite(0xffffff, 10, 0.7); end.position.set(0, 0, -RINGS * GAP); scene.add(end);
  const jay = makeJay(); jay.root.scale.setScalar(0.78); scene.add(jay.root);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a3aff, 1.2));
  const front = new THREE.PointLight(0xff3df0, 20, 12, 1.5); scene.add(front);
  return {
    scene, camera, jay, length: RINGS * GAP, end, bloom: { strength: 1.0, radius: 0.6, threshold: 0.6 },
    update(lt, z) { front.position.set(0, 0, z - 3); end.scale.setScalar(10 + Math.max(0, lt - 0.4) * 50); },
  };
}
