// The ending: a glowing Pulsebox cube on a mirror floor, rings of real game tiles orbiting it, and the 78th tile.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { ALL_GAMES, hologram78, radialGlow } from "../textures.js";
import { glossFloor, gradientSky, tileAtlas, quadBatch, glowSprite } from "./common.js";

function logoFace() {
  const c = document.createElement("canvas"); c.width = c.height = 1024; const g = c.getContext("2d");
  g.fillStyle = "#07060f"; g.fillRect(0, 0, 1024, 1024);
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  g.shadowColor = "#c6ff3d"; g.shadowBlur = 50; g.strokeStyle = "#c6ff3d"; g.lineWidth = 40; rr(312, 200, 400, 400, 90); g.stroke();
  g.shadowBlur = 30; g.fillStyle = "#c6ff3d"; rr(402, 330, 220, 44, 22); g.fill(); rr(402, 430, 220, 44, 22); g.fill();
  g.shadowBlur = 40; g.font = "700 150px 'Chakra Petch', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "#ffffff"; const w1 = g.measureText("PULSE").width, w2 = g.measureText("BOX").width, x0 = 512 - (w1 + w2) / 2;
  g.textAlign = "left"; g.fillText("PULSE", x0, 790); g.fillStyle = "#c6ff3d"; g.fillText("BOX", x0 + w1, 790);
  g.shadowBlur = 0; g.strokeStyle = "rgba(198,255,61,.35)"; g.lineWidth = 8; g.strokeRect(24, 24, 976, 976);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function createCta() {
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x0a0620, 0.03);
  const camera = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.05, 400);
  scene.add(gradientSky([[0, "#05030e"], [0.4, "#170a3a"], [0.5, "#2a0f55"], [0.56, "#08051a"], [1, "#020108"]], { radius: 200, stars: 700 }));
  const floor = glossFloor(80, { opacity: 0.7, gridScale: 40, grid: "#3a2470" }); scene.add(floor);
  // the cube
  const face = logoFace();
  const cubeM = new THREE.MeshPhysicalMaterial({ color: 0x0b0918, metalness: 0.5, roughness: 0.18, clearcoat: 1, emissive: 0xffffff, emissiveMap: face, emissiveIntensity: 0.95 });
  const cube = new THREE.Mesh(new RoundedBoxGeometry(2, 2, 2, 6, 0.2), cubeM); cube.position.y = 1.75; cube.castShadow = true; scene.add(cube);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.04, 2.04, 2.04)), new THREE.LineBasicMaterial({ color: 0xc6ff3d })); cube.add(edges);
  const cubeGlow = glowSprite(0xc6ff3d, 6, 0.15); cubeGlow.position.copy(cube.position); scene.add(cubeGlow);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 0.16, 64), new THREE.MeshStandardMaterial({ color: 0x120c22, metalness: 0.8, roughness: 0.25 })); base.position.y = 0.08; scene.add(base);
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.03, 8, 120), new THREE.MeshBasicMaterial({ color: 0xc6ff3d })); baseRing.rotation.x = Math.PI / 2; baseRing.position.y = 0.17; scene.add(baseRing);
  // two rings of game tiles
  const names = ALL_GAMES.slice(0, 44), atlas = tileAtlas(names);
  const rings = [{ n: 14, r: 3.3, y: 3.95, s: 0.72, tilt: 0.1, speed: 0.22 }, { n: 30, r: 10, y: 2.3, s: 1.25, tilt: -0.12, speed: -0.06 }];
  const total = rings.reduce((a, b) => a + b.n, 0), batch = quadBatch(total);
  const tileMesh = new THREE.Mesh(batch.geo, new THREE.MeshBasicMaterial({ map: atlas.texture, vertexColors: true, side: THREE.DoubleSide })); scene.add(tileMesh);
  // the 78th tile (red, glitching), hidden until the last line
  const t78 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: hologram78(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); t78.visible = false; scene.add(t78);
  const t78Glow = glowSprite(0xff2a5a, 4, 0.6); t78.add(t78Glow);
  // motes
  const M = 400, mp = new Float32Array(M * 3); for (let i = 0; i < M; i++) mp.set([(Math.random() * 2 - 1) * 10, Math.random() * 8, (Math.random() * 2 - 1) * 10], i * 3);
  const mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.BufferAttribute(mp, 3));
  const motes = new THREE.Points(mg, new THREE.PointsMaterial({ size: 0.05, map: radialGlow(), color: 0xd8ffb0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(motes);
  // light
  scene.add(new THREE.HemisphereLight(0x8a7aff, 0x0a0618, 0.6));
  const l1 = new THREE.SpotLight(0xff3df0, 120, 30, 0.5, 0.6, 1.3); l1.position.set(-6, 7, 4); l1.target.position.set(0, 1.5, 0); scene.add(l1, l1.target);
  const l2 = new THREE.SpotLight(0x3de0ff, 120, 30, 0.5, 0.6, 1.3); l2.position.set(6, 6, -3); l2.target.position.set(0, 1.5, 0); scene.add(l2, l2.target);
  const l3 = new THREE.PointLight(0xc6ff3d, 18, 8, 1.6); l3.position.set(0, 4.2, 2.5); scene.add(l3);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), up = new THREE.Vector3(0, 1, 0);
  return {
    scene, camera, cube, t78, bloom: { strength: 0.6, radius: 0.5, threshold: 0.75 },
    update(t, { spin = 0, pop = 0, show78 = 0, focus = -1 } = {}) {
      cube.rotation.y = 0.6 + spin; cube.position.y = 1.75 + Math.sin(t * 1.4) * 0.06 + pop * 0.15; cube.scale.setScalar(1 + pop * 0.08);
      cubeM.emissiveIntensity = 0.95 + pop * 0.4;
      let i = 0;
      rings.forEach((rg, ri) => {
        for (let k = 0; k < rg.n; k++, i++) {
          const a = (k / rg.n) * Math.PI * 2 + t * rg.speed, p = new THREE.Vector3(Math.sin(a) * rg.r, rg.y + Math.sin(a * 2 + t) * 0.12 + Math.sin(a) * rg.tilt * rg.r * 0.3, Math.cos(a) * rg.r);
          q.setFromEuler(e.set(0, a, 0)); m4.compose(p, q, new THREE.Vector3(rg.s, rg.s, rg.s)); batch.set(i, m4, 0.95, 1.42, atlas.uv(i % names.length));
          batch.bright(i, focus >= 0 && i % names.length !== focus ? 0.5 : 0.9);
        }
      });
      batch.commit();
      motes.rotation.y = t * 0.03;
      t78.visible = show78 > 0.01; t78.position.set(1.5, 3.1 + Math.sin(t * 2) * 0.05, 1.6); t78.scale.setScalar(show78 * (1 + (Math.sin(t * 31) > 0.85 ? 0.08 : 0)));
      t78.quaternion.copy(camera.quaternion);
    },
  };
}
