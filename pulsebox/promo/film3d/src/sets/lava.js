// Floor Is Lava: an arena of coloured tiles on stone pillars over a sea of lava, inside a volcano. 98 players (simple
// bean figures) plus Jay and Maya. Tiles shake red and drop, a ring at a time from the outside in; whoever is standing
// on one goes down with it. In the middle: the last platform (round, gold rim) with the crown floating over it, and a
// big screen counting the players left. Everything is a function of the game clock G, so any shot can show any moment.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { makeJay } from "../jay.js";
import { radialGlow } from "../textures.js";
import { gradientSky, glowSprite } from "./common.js";

const N = 11, SP = 2.25, C = (N - 1) / 2, LAVA_Y = -6.5, FALL = Math.sqrt(2 * 6.4 / 9.8);   // FALL: seconds from the floor to the lava
export const tileXZ = (ix, iz) => [(ix - C) * SP, (iz - C) * SP];
const ring = (ix, iz) => Math.max(Math.abs(ix - C), Math.abs(iz - C));
const COLORS = [0xff6aa8, 0x45cfff, 0xffd84a, 0x9a6aff].map((c) => new THREE.Color(c));
const SKINS = [0xf1c7a1, 0xd9a27a, 0xa8714e, 0x6e4630, 0xf4d2b8].map((c) => new THREE.Color(c));
const OUTFITS = [0xff4a4a, 0x4a9aff, 0x4aff9a, 0xffb84a, 0xd04aff, 0xffffff, 0x2a2a3a, 0xff7ad0, 0x7affea, 0xc6ff3d].map((c) => new THREE.Color(c));

function lavaMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uGlow: { value: 1 } }]), fog: true,
    vertexShader: `varying vec3 vPos;
      #include <fog_pars_vertex>
      void main() { vPos = (modelMatrix * vec4(position, 1.0)).xyz; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uTime; uniform float uGlow; varying vec3 vPos;
      #include <fog_pars_fragment>
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
      void main() {
        vec2 p = vPos.xz * 0.11; float w = fbm(p * 1.7 - uTime * 0.05);
        float n = fbm(p + vec2(uTime * 0.04, uTime * 0.025) + w);
        float hot = smoothstep(0.45, 0.66, n), vein = pow(clamp(1.0 - abs(n - 0.52) * 4.0, 0.0, 1.0), 4.0);
        vec3 col = mix(vec3(0.09, 0.012, 0.0), vec3(0.95, 0.28, 0.03), hot) + vec3(1.0, 0.62, 0.2) * vein * 0.28;
        col *= 0.85 + 0.15 * sin(uTime * 1.3 + n * 9.0);
        gl_FragColor = vec4(col * uGlow, 1.0);
        #include <fog_fragment>
      }`,
  });
}

export function createLava({ reserved = [] } = {}) {
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x2a0c08, 0.016);
  const camera = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.05, 600);
  scene.add(gradientSky([[0, "#050208"], [0.3, "#1a0610"], [0.45, "#3a0c0a"], [0.5, "#5a1a0a"], [0.55, "#1a0604"], [1, "#050101"]], { radius: 400 }));
  // the lava sea, the volcano wall around it, embers
  const lavaM = lavaMaterial(); const lava = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 1, 1), lavaM); lava.rotation.x = -Math.PI / 2; lava.position.y = LAVA_Y; scene.add(lava);
  { const g = new THREE.CylinderGeometry(70, 95, 60, 64, 8, true), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), k = 1 + Math.sin(x * 0.21 + y * 0.3) * 0.05 + Math.sin(z * 0.37 - y * 0.5) * 0.04 + (Math.random() - 0.5) * 0.04; p.setXYZ(i, x * k, y, z * k); }
    g.computeVertexNormals(); const wall = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x1a0d0a, roughness: 0.95, side: THREE.BackSide, flatShading: true })); wall.position.y = 18; scene.add(wall); }
  const EM = 500, ep = new Float32Array(EM * 3), eb = []; for (let i = 0; i < EM; i++) eb.push([(Math.random() * 2 - 1) * 26, Math.random() * 16, (Math.random() * 2 - 1) * 26, 0.6 + Math.random() * 1.2]);
  const emG = new THREE.BufferGeometry(); emG.setAttribute("position", new THREE.BufferAttribute(ep, 3));
  const embers = new THREE.Points(emG, new THREE.PointsMaterial({ size: 0.12, map: radialGlow("255,150,60"), color: 0xff8a3a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 })); embers.frustumCulled = false; scene.add(embers);
  // the tiles (instanced): rounded slabs on stone pillars; the middle one is the last platform
  const tiles = []; for (let ix = 0; ix < N; ix++) for (let iz = 0; iz < N; iz++) { if (ix === C && iz === C) continue; const [x, z] = tileXZ(ix, iz); tiles.push({ ix, iz, x, z, r: ring(ix, iz), col: COLORS[(ix + iz * 2) % 4], drop: Infinity }); }
  const tileMesh = new THREE.InstancedMesh(new RoundedBoxGeometry(2.05, 0.55, 2.05, 3, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.05 }), tiles.length);
  const pillarMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.62, 6.4, 10), new THREE.MeshStandardMaterial({ color: 0x2a201e, roughness: 0.9, flatShading: true }), tiles.length);
  tileMesh.castShadow = tileMesh.receiveShadow = true; scene.add(tileMesh, pillarMesh);
  tiles.forEach((tt, i) => tileMesh.setColorAt(i, tt.col));
  // ...the drop order: the outer ring first, then inward (the game clock G, in seconds)
  const R = [Infinity, [41, 47.5], [32, 40], [23, 31], [14, 22], [5, 13]];
  tiles.forEach((tt) => { const [a, b] = R[tt.r]; tt.drop = a + Math.random() * (b - a); });
  // the last platform
  const last = new THREE.Group(); scene.add(last);
  const lastTop = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.2, 0.55, 48), new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.4 })); lastTop.position.y = -0.275; lastTop.castShadow = lastTop.receiveShadow = true; last.add(lastTop);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.06, 10, 64), new THREE.MeshStandardMaterial({ color: 0xffc23a, metalness: 0.9, roughness: 0.25, emissive: 0x3a2200 })); rim.rotation.x = Math.PI / 2; last.add(rim);
  const lastPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 6.4, 14), pillarMesh.material); lastPillar.position.y = -3.75; scene.add(lastPillar);
  const chunks = []; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + 0.2, m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + (i % 3) * 0.05), lastTop.material); m.userData = { a, d: 0.15 + (i % 4) * 0.12 }; m.castShadow = true; scene.add(m); chunks.push(m); }
  // the crown
  const crown = new THREE.Group(); crown.position.set(0, 4.3, 0); scene.add(crown);
  { const gold = new THREE.MeshStandardMaterial({ color: 0xffc83a, metalness: 1, roughness: 0.22, emissive: 0x4a2a00 });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.32, 0.24, 32, 1, true), gold); band.material.side = THREE.DoubleSide; crown.add(band);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, sp = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.26, 8), gold); sp.position.set(Math.sin(a) * 0.34, 0.24, Math.cos(a) * 0.34); crown.add(sp);
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: [0xff2a4a, 0x2a8aff, 0x3aff7a][i % 3], roughness: 0.1, metalness: 0.3 })); gem.position.set(Math.sin(a) * 0.35, 0.02, Math.cos(a) * 0.35); crown.add(gem); } }
  const crownGlow = glowSprite(0xffc23a, 1.3, 0.16); crown.add(crownGlow);
  const crownLight = new THREE.PointLight(0xffc860, 1.6, 5, 1.6); crown.add(crownLight);
  // the big screen: players left
  const jc = document.createElement("canvas"); jc.width = 1024; jc.height = 512; const jg = jc.getContext("2d"); const jt = new THREE.CanvasTexture(jc); jt.colorSpace = THREE.SRGBColorSpace; let jLast = null;
  const drawJumbo = (n) => { if (n === jLast) return; jLast = n; jg.fillStyle = "#0a0610"; jg.fillRect(0, 0, 1024, 512); jg.textAlign = "center"; jg.textBaseline = "middle"; jg.lineJoin = "round";
    jg.font = "400 92px 'Luckiest Guy', sans-serif"; jg.fillStyle = "#ff7a2a"; jg.fillText("FLOOR IS LAVA", 512, 92); jg.font = "700 54px 'Chakra Petch', sans-serif"; jg.fillStyle = "#ffffff"; jg.fillText("PLAYERS LEFT", 512, 200);
    jg.font = "400 230px 'Luckiest Guy', sans-serif"; jg.fillStyle = n <= 2 ? "#ffd23d" : n <= 10 ? "#ff4a3a" : "#ffffff"; jg.fillText(String(n), 512, 380); jt.needsUpdate = true; };
  const jumbo = new THREE.Group(); jumbo.position.set(0, 11, -21); scene.add(jumbo);
  { const frame = new THREE.Mesh(new RoundedBoxGeometry(10.6, 5.6, 0.5, 3, 0.15), new THREE.MeshStandardMaterial({ color: 0x15121a, metalness: 0.6, roughness: 0.4 })); jumbo.add(frame);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshBasicMaterial({ map: jt, color: 0xb8b8b8 })); scr.position.z = 0.26; jumbo.add(scr);
    for (const s of [-1, 1]) { const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 30), frame.material); cable.position.set(4.5 * s, 17.5, 0); jumbo.add(cable); } }
  // the players: 98 beans (instanced bodies, heads, eyes), each on a tile
  const NB = 98, spots = tiles.map((tt, i) => i).filter((i) => !reserved.some(([a, b]) => tiles[i].ix === a && tiles[i].iz === b)).sort(() => Math.random() - 0.5).slice(0, NB);
  const beans = spots.map((ti, i) => ({ ti, ox: (Math.random() - 0.5) * 0.9, oz: (Math.random() - 0.5) * 0.9, yaw: Math.random() * Math.PI * 2, ph: Math.random() * 7, hop: 4.5 + Math.random() * 3, skin: SKINS[i % 5], out: OUTFITS[(i * 7) % 10], tumble: (Math.random() - 0.5) * 6 }));
  const bodyMesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.24, 0.42, 4, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }), NB);
  const headMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.21, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }), NB);
  const eyeMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0x0a0a10 }), NB * 2);
  bodyMesh.castShadow = headMesh.castShadow = true; scene.add(bodyMesh, headMesh, eyeMesh);
  beans.forEach((b, i) => { bodyMesh.setColorAt(i, b.out); headMesh.setColorAt(i, b.skin); });
  // Jay and Maya
  const jay = makeJay(), maya = makeJay({ variant: "maya" }); [jay, maya].forEach((r) => { r.root.scale.setScalar(0.78); scene.add(r.root); r.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); });
  // splashes: an orange ring and a spray of drops where anything hits the lava
  const SPL = 24, splashes = []; const dropGeo = new THREE.SphereGeometry(0.09, 6, 5), dropM = new THREE.MeshBasicMaterial({ color: 0xffa040 });
  for (let i = 0; i < SPL; i++) { const g = new THREE.Group(); const ringM = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.9, 32), new THREE.MeshBasicMaterial({ color: 0xffb050, transparent: true, depthWrite: false, side: THREE.DoubleSide })); ringM.rotation.x = -Math.PI / 2; g.add(ringM);
    const drops = new THREE.InstancedMesh(dropGeo, dropM, 14); g.add(drops); g.userData = { ringM, drops }; g.visible = false; scene.add(g); splashes.push(g); }
  // confetti (Maya's win)
  const CF = 260, cfMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.09, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), CF), cf = [];
  for (let i = 0; i < CF; i++) { cf.push([(Math.random() * 2 - 1) * 3.2, 5 + Math.random() * 4, (Math.random() * 2 - 1) * 3.2, Math.random() * 7, 0.6 + Math.random() * 0.8]); cfMesh.setColorAt(i, new THREE.Color([0xffd23d, 0xff5aa0, 0x45cfff, 0xffffff, 0x9a6aff][i % 5])); }
  cfMesh.visible = false; cfMesh.frustumCulled = false; scene.add(cfMesh);
  // light: a dim sky, a warm key from above, the lava's glow from below
  const hemi = new THREE.HemisphereLight(0x5a3a7a, 0xff5a1a, 0.55); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffe2c8, 1.25); key.position.set(-12, 22, 14); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 70 }); key.shadow.bias = -0.0005; scene.add(key, key.target);
  const under = new THREE.DirectionalLight(0xff6a2a, 1.1); under.position.set(3, -20, 4); scene.add(under, under.target);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), red = new THREE.Color(0xff3a1a), tmpC = new THREE.Color();

  // a tile's state at G: its top's height, a little shake, a tilt as it falls
  function tileState(tt, G) {
    const w = G - (tt.drop - 0.9);
    if (G < tt.drop - 0.9) return { y: 0, warn: 0, sx: 0, sz: 0, tilt: 0 };
    if (G < tt.drop) { const k = w / 0.9; return { y: 0, warn: k, sx: Math.sin(G * 60 + tt.ix) * 0.03 * k, sz: Math.cos(G * 53 + tt.iz) * 0.03 * k, tilt: 0 }; }
    const f = G - tt.drop; return { y: -4.9 * f * f, warn: 1, sx: 0, sz: 0, tilt: f * 0.6 * (tt.ix % 2 ? 1 : -1), gone: f > FALL + 0.6 };
  }
  const impactsOf = (G) => tiles.filter((tt) => G - (tt.drop + FALL) >= 0 && G - (tt.drop + FALL) < 1.0).map((tt) => ({ x: tt.x, z: tt.z, t: tt.drop + FALL, big: true }));
  return {
    scene, camera, jay, maya, crown, last, tiles, tileXZ, LAVA_Y, FALL, bloom: { strength: 0.55, radius: 0.5, threshold: 0.86 },
    // the players still in at G (98 beans + Jay and Maya, unless out = how many of those two are out)
    beanDrops() { return beans.map((b, i) => ({ i, x: tiles[b.ti].x + b.ox, z: tiles[b.ti].z + b.oz, drop: tiles[b.ti].drop })).sort((a, b) => a.drop - b.drop); },
    alive(G, out = 0) { return beans.filter((b) => tiles[b.ti].drop > G).length + 2 - out; },
    tileTop(ix, iz, G) { const tt = tiles.find((x) => x.ix === ix && x.iz === iz); return tt ? tileState(tt, G).y : 0; },
    setDrop(ix, iz, G) { const tt = tiles.find((x) => x.ix === ix && x.iz === iz); if (tt) tt.drop = G; },
    lastDrop() { return Math.max(...beans.map((b) => tiles[b.ti].drop)); },
    // G: game clock; t: wall time (lava, embers); shrink: the last platform's size (1 = full); crumble: seconds since its edge broke off
    // splash: extra splashes [{x, z, t}] (Jay); jumbo: the number on the big screen (default: players left)
    update(G, { t = G, shrink = 1, crumble = -1, splash = [], jumbo = null, out = 0, crownY = 3.5, crownAt = null, confetti = -1 } = {}) {
      lavaM.uniforms.uTime.value = t;
      for (let i = 0; i < EM; i++) { const b = eb[i], y = LAVA_Y + ((b[1] + t * b[3]) % 16); ep.set([b[0] + Math.sin(t * 0.7 + i) * 0.4, y, b[2] + Math.cos(t * 0.6 + i) * 0.4], i * 3); } emG.attributes.position.needsUpdate = true;
      tiles.forEach((tt, i) => { const s = tileState(tt, G);
        if (s.gone) { m4.makeScale(0, 0, 0); tileMesh.setMatrixAt(i, m4); pillarMesh.setMatrixAt(i, m4); return; }
        e.set(s.tilt, 0, s.tilt * 0.5); q.setFromEuler(e); m4.compose(v.set(tt.x + s.sx, s.y - 0.275, tt.z + s.sz), q, sc); tileMesh.setMatrixAt(i, m4);
        m4.compose(v.set(tt.x + s.sx, s.y - 3.75, tt.z + s.sz), q, sc); pillarMesh.setMatrixAt(i, m4);
        tileMesh.setColorAt(i, tmpC.copy(tt.col).lerp(red, s.warn * (0.6 + 0.4 * Math.sin(G * 30)))); });
      tileMesh.instanceMatrix.needsUpdate = pillarMesh.instanceMatrix.needsUpdate = true; tileMesh.instanceColor.needsUpdate = true;
      beans.forEach((b, i) => { const tt = tiles[b.ti], s = tileState(tt, G), f = G - tt.drop;
        let x = tt.x + b.ox + s.sx, z = tt.z + b.oz + s.sz, y = s.y + Math.abs(Math.sin(G * b.hop + b.ph)) * 0.22 + 0.45, rx = 0, rz = 0;
        if (f > 0) { y = -4.9 * f * f + 0.45 + f * 1.2; rx = f * b.tumble; rz = f * b.tumble * 0.6; x += Math.sin(b.yaw) * f * 0.8; z += Math.cos(b.yaw) * f * 0.8; }   // a little hop as the floor goes, then down
        if (s.gone || y < LAVA_Y - 0.5) { m4.makeScale(0, 0, 0); bodyMesh.setMatrixAt(i, m4); headMesh.setMatrixAt(i, m4); eyeMesh.setMatrixAt(i * 2, m4); eyeMesh.setMatrixAt(i * 2 + 1, m4); return; }
        e.set(rx, b.yaw + Math.sin(G * 0.7 + b.ph) * 0.6, rz); q.setFromEuler(e); m4.compose(v.set(x, y, z), q, sc); bodyMesh.setMatrixAt(i, m4);
        const up = new THREE.Vector3(0, 0.6, 0).applyQuaternion(q); m4.compose(v.set(x + up.x, y + up.y, z + up.z), q, sc); headMesh.setMatrixAt(i, m4);
        for (const sd of [-1, 1]) { const o = new THREE.Vector3(0.08 * sd, 0.63, 0.18).applyQuaternion(q); m4.compose(v.set(x + o.x, y + o.y, z + o.z), q, sc); eyeMesh.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), m4); } });
      bodyMesh.instanceMatrix.needsUpdate = headMesh.instanceMatrix.needsUpdate = eyeMesh.instanceMatrix.needsUpdate = true;
      // the last platform and its crumbling edge
      last.scale.set(shrink, 1, shrink); rim.visible = true;
      chunks.forEach((m) => { const { a, d } = m.userData, r = 1.35 * shrink + 0.1, f = crumble - d;
        if (crumble < 0 || f < 0) { m.visible = false; return; }
        m.visible = f < FALL + 0.4; m.position.set(Math.sin(a) * (r + f * 0.5), -0.15 - 4.9 * f * f, Math.cos(a) * (r + f * 0.5)); m.rotation.set(f * 3, a, f * 2); });
      // splashes: the most recent impacts
      const imps = [...impactsOf(G), ...splash.filter((s) => G - s.t >= 0 && G - s.t < 1.2)].sort((a, b) => b.t - a.t).slice(0, SPL);
      splashes.forEach((g, i) => { const s = imps[i]; g.visible = !!s; if (!s) return; const k = G - s.t, { ringM, drops } = g.userData;
        g.position.set(s.x, LAVA_Y + 0.05, s.z); ringM.scale.setScalar(0.4 + k * 3.2 * (s.big ? 1.3 : 1)); ringM.material.opacity = Math.max(0, 0.8 - k * 0.9);
        for (let d = 0; d < 14; d++) { const a = d / 14 * Math.PI * 2 + i, sp = 1.5 + (d % 4) * 0.7, vy = 4 + (d % 3) * 1.5, y = vy * k - 4.9 * k * k;
          m4.compose(v.set(Math.sin(a) * sp * k, Math.max(-1, y), Math.cos(a) * sp * k), q.identity(), sc.setScalar(y > -0.2 ? 1 - k * 0.5 : 0)); drops.setMatrixAt(d, m4); sc.set(1, 1, 1); }
        drops.instanceMatrix.needsUpdate = true; });
      // the crown, the big screen
      if (crownAt) crown.position.copy(crownAt); else crown.position.set(0, crownY + Math.sin(t * 1.6) * 0.12, 0); crown.rotation.y = t * 0.8;
      drawJumbo(jumbo ?? this.alive(G, out));
      cfMesh.visible = confetti >= 0; if (confetti >= 0) { cf.forEach(([x, y, z, ph, sp], i) => { const yy = y - confetti * sp * 1.6; e.set(confetti * 4 + ph, confetti * 3 + ph * 2, 0); q.setFromEuler(e);
        m4.compose(v.set(x + Math.sin(confetti * 2 + ph) * 0.3, yy < -1 ? -50 : yy, z + Math.cos(confetti * 1.7 + ph) * 0.3), q, sc); cfMesh.setMatrixAt(i, m4); }); cfMesh.instanceMatrix.needsUpdate = true; }
      key.target.position.set(0, 0, 0); under.target.position.set(0, 0, 0);
    },
  };
}
