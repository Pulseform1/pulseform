// Five Stars: the Getaway Heat street with everything the game throws at you as the stars go up. SWAT trucks,
// a roadblock with spike strips (and a ramp), a police helicopter, army tanks, traffic, power-ups (shield, EMP,
// nitro) and effects (explosions, the shield bubble, the EMP wave, nitro flames, tyre smoke). Everything is placed
// per frame by the shots, so the set holds no state between frames.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createStreet, makeStreetCar } from "./street.js";
import { makeJay } from "../jay.js";
import { labelTexture, radialGlow } from "../textures.js";
import { glowSprite, clamp } from "./common.js";

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...o });
const wheel = (r, w) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 20), std(0x0b0b0e, { roughness: 0.8 })); m.rotation.z = Math.PI / 2; return m; };
const shadowAll = (g) => g.traverse((o) => { if (o.isMesh && !o.material.transparent && o.material.type !== "MeshBasicMaterial") o.castShadow = true; });

function fresnelMat(color) {
  return new THREE.ShaderMaterial({ uniforms: { uFade: { value: 1 }, uCol: { value: new THREE.Color(color) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }",
    fragmentShader: "uniform float uFade; uniform vec3 uCol; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.-abs(dot(vN,vV)), 2.5); gl_FragColor = vec4(uCol*(0.15+f*1.3), (0.08+f)*uFade); }" });
}
function iconTexture(kind) {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
  const col = { shield: "#3da5ff", emp: "#b56bff", nitro: "#3de0ff" }[kind];
  g.fillStyle = "rgba(8,10,20,.85)"; g.beginPath(); g.arc(128, 128, 110, 0, 7); g.fill(); g.lineWidth = 12; g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 30; g.stroke();
  g.fillStyle = col; g.shadowBlur = 20;
  if (kind === "shield") { g.beginPath(); g.moveTo(128, 50); g.lineTo(190, 75); g.quadraticCurveTo(190, 160, 128, 205); g.quadraticCurveTo(66, 160, 66, 75); g.closePath(); g.fill(); }
  if (kind === "emp") { g.beginPath(); g.moveTo(140, 40); g.lineTo(80, 140); g.lineTo(125, 140); g.lineTo(110, 215); g.lineTo(180, 110); g.lineTo(135, 110); g.closePath(); g.fill(); }
  if (kind === "nitro") { g.beginPath(); g.moveTo(128, 40); g.quadraticCurveTo(195, 120, 160, 190); g.quadraticCurveTo(128, 220, 96, 190); g.quadraticCurveTo(61, 120, 128, 40); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(128, 165, 22, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function makeSwat() {
  const g = new THREE.Group(), body = std(0x10141e, { metalness: 0.5, roughness: 0.4 });
  const box = new THREE.Mesh(new RoundedBoxGeometry(2.5, 2.3, 6.2, 3, 0.15), body); box.position.y = 1.65; g.add(box);
  const cab = new THREE.Mesh(new RoundedBoxGeometry(2.4, 1.6, 1.8, 3, 0.15), body); cab.position.set(0, 1.3, -3.6); g.add(cab);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.6), new THREE.MeshPhysicalMaterial({ color: 0x0a0e18, metalness: 0.4, roughness: 0.1 })); win.position.set(0, 1.75, -4.51); win.rotation.y = Math.PI; g.add(win);
  const ram = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.5, 0.35), std(0x2a2a30, { metalness: 0.8, roughness: 0.3 })); ram.position.set(0, 0.75, -4.6); g.add(ram);
  for (const s of [-1, 1]) { const lab = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.8), new THREE.MeshBasicMaterial({ map: labelTexture("SWAT", { w: 512, h: 128, px: 100, color: "#f2f2f2" }), transparent: true })); lab.position.set(1.26 * s, 1.9, 0.4); lab.rotation.y = s * Math.PI / 2; g.add(lab); }
  for (const [x, z] of [[-1.1, -3.5], [1.1, -3.5], [-1.1, 1.8], [1.1, 1.8]]) { const w = wheel(0.55, 0.45); w.position.set(x, 0.55, z); g.add(w); }
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.3), new THREE.MeshBasicMaterial({ color: 0xff1a2a })), blue = red.clone(); blue.material = new THREE.MeshBasicMaterial({ color: 0x1a4aff });
  red.position.set(-0.45, 2.2, -3.6); blue.position.set(0.45, 2.2, -3.6); g.add(red, blue); g.userData = { red, blue };
  for (const s of [-1, 1]) { const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.04), new THREE.MeshBasicMaterial({ color: 0xfff6e0 })); hl.position.set(0.8 * s, 1.0, -4.52); g.add(hl); }
  shadowAll(g); return g;
}
function makeHeli() {
  const g = new THREE.Group(), body = std(0x1a1e2a, { metalness: 0.5, roughness: 0.35 }), white = std(0xe8e8f0, { metalness: 0.3, roughness: 0.4 });
  const cabin = new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 16), body); cabin.scale.set(1, 0.9, 1.7); g.add(cabin);
  const stripe = new THREE.Mesh(new THREE.SphereGeometry(1.21, 24, 8, 0, Math.PI * 2, 1.35, 0.35), white); stripe.scale.set(1, 0.9, 1.7); g.add(stripe);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.0, 20, 12, 0, Math.PI * 2, 0, 1.2), new THREE.MeshPhysicalMaterial({ color: 0x223355, metalness: 0.3, roughness: 0.05, transparent: true, opacity: 0.7 })); glass.position.set(0, 0.15, -1.15); glass.rotation.x = -1.2; glass.scale.set(1, 0.8, 0.9); g.add(glass);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.35, 4.2, 12), body); boom.rotation.x = Math.PI / 2; boom.position.set(0, 0.3, 3.4); g.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.7), body); fin.position.set(0, 0.85, 5.3); g.add(fin);
  const tailRotor = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), new THREE.MeshBasicMaterial({ color: 0x9aa0b0, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })); tailRotor.rotation.y = Math.PI / 2; tailRotor.position.set(0.12, 0.9, 5.3); g.add(tailRotor);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5), body); mast.position.y = 1.2; g.add(mast);
  const rotor = new THREE.Mesh(new THREE.CircleGeometry(5.2, 40), new THREE.MeshBasicMaterial({ color: 0x8890a0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })); rotor.rotation.x = -Math.PI / 2; rotor.position.y = 1.45; g.add(rotor);
  const blades = new THREE.Group(); blades.position.y = 1.47; g.add(blades);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 5.0), body); b.position.z = 2.5; const h = new THREE.Group(); h.rotation.y = i * Math.PI / 2; h.add(b); blades.add(h); }
  for (const s of [-1, 1]) { const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2), body); skid.rotation.x = Math.PI / 2; skid.position.set(0.8 * s, -1.35, -0.2); g.add(skid); }
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.08), new THREE.MeshBasicMaterial({ color: 0xff2a2a })); navR.position.set(0, -1.0, 0.6); g.add(navR);
  const light = new THREE.SpotLight(0xe8f0ff, 300, 60, 0.22, 0.4, 1.1); light.position.set(0, -1.1, -1.4); g.add(light, light.target);
  const bc = document.createElement("canvas"); bc.width = 4; bc.height = 256; { const x = bc.getContext("2d"); const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(232,240,255,0)"); gr.addColorStop(1, "rgba(232,240,255,.07)"); x.fillStyle = gr; x.fillRect(0, 0, 4, 256); }
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.4, 10, 28, 1, true), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); g.add(beam);
  const lamp = glowSprite(0xffffff, 1.2, 0.8); lamp.position.copy(light.position); g.add(lamp);
  shadowAll(g);
  g.userData = { blades, tailRotor, light, beam, navR,
    aim(target) { g.updateMatrixWorld(); light.target.position.copy(g.worldToLocal(target.clone())); const d = light.target.position.clone().sub(light.position), len = d.length(); beam.scale.set(1, len / 10, 1); beam.position.copy(light.position).addScaledVector(d, 0.5); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d.normalize()); } };
  return g;
}
function makeTank() {
  const g = new THREE.Group(), olive = std(0x4a5a2a, { roughness: 0.75, metalness: 0.2 }), dark = std(0x23281a, { roughness: 0.9 });
  const hull = new THREE.Mesh(new RoundedBoxGeometry(3.6, 1.2, 7.2, 3, 0.18), olive); hull.position.y = 1.2; g.add(hull);
  const glacis = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.6, 1.4), olive); glacis.position.set(0, 1.05, -3.7); glacis.rotation.x = 0.5; g.add(glacis);
  for (const s of [-1, 1]) { const track = new THREE.Mesh(new RoundedBoxGeometry(0.9, 1.1, 7.8, 3, 0.4), dark); track.position.set(1.9 * s, 0.6, 0); g.add(track);
    for (let i = 0; i < 6; i++) { const w = wheel(0.42, 0.95); w.position.set(1.9 * s, 0.45, -3 + i * 1.2); g.add(w); } }
  const turret = new THREE.Group(); turret.position.set(0, 2.0, 0.4); g.add(turret);
  const tbody = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.9, 3.0, 3, 0.25), olive); turret.add(tbody);
  const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.15, 16), olive); hatch.position.set(0.5, 0.5, 0.4); turret.add(hatch);
  const barrel = new THREE.Group(); barrel.position.set(0, 0.1, -1.4); turret.add(barrel);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 4.2, 14), olive); tube.rotation.x = Math.PI / 2; tube.position.z = -2.1; barrel.add(tube);
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 14), dark); brake.rotation.x = Math.PI / 2; brake.position.z = -4.2; barrel.add(brake);
  const starC = document.createElement("canvas"); starC.width = starC.height = 128; { const x = starC.getContext("2d"); x.fillStyle = "#e8e8d8"; x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 22 : 52; x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } x.fill(); }
  for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(starC), transparent: true })); st.position.set(1.81 * s, 1.25, 0.8); st.rotation.y = s * Math.PI / 2; g.add(st); }
  const flash = glowSprite(0xffd27a, 0.1, 1); flash.position.set(0, 0, -4.6); barrel.add(flash);
  shadowAll(g); g.userData = { turret, barrel, flash }; return g;
}
function makeBus() {
  const g = new THREE.Group(); const body = new THREE.Mesh(new RoundedBoxGeometry(2.6, 3.0, 11, 3, 0.2), std(0xe8a020, { metalness: 0.3, roughness: 0.4 })); body.position.y = 1.85; g.add(body);
  const wins = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.9, 9.6), new THREE.MeshStandardMaterial({ color: 0x15202a, emissive: 0xffe8b0, emissiveIntensity: 0.35, roughness: 0.2 })); wins.position.y = 2.4; g.add(wins);
  for (const [x, z] of [[-1.15, -3.8], [1.15, -3.8], [-1.15, 3.8], [1.15, 3.8]]) { const w = wheel(0.55, 0.4); w.position.set(x, 0.55, z); g.add(w); }
  shadowAll(g); return g;
}

export function createGetaway() {
  const st = createStreet(), scene = st.scene;
  // Jay at the wheel (a real rig in the seat, so close-ups through the windshield work)
  const jc = st.jayCar; if (jc.userData.head) jc.userData.head.visible = false;
  const driver = makeJay(); driver.root.scale.setScalar(0.52); driver.root.position.set(-0.42, 0.12, 0.35); driver.root.rotation.y = Math.PI; jc.userData.chassis.add(driver.root);
  jc.traverse((o) => { if (o.isMesh && o.material.transparent && o.material.opacity === 0.55) { o.material = o.material.clone(); o.material.opacity = 0.22; } });
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 8, 24), std(0x101014)); sw.position.set(-0.42, 0.98, -0.25); sw.rotation.x = -0.5; jc.userData.chassis.add(sw);
  const dashGlow = new THREE.PointLight(0x7ac8ff, 2.5, 1.6, 1.6); dashGlow.position.set(-0.3, 1.0, -0.6); jc.userData.chassis.add(dashGlow);
  // nitro flames and the shield bubble on Jay's car
  const flames = [-1, 1].map((s) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.13, 1.4, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0x5ab8ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); f.rotation.x = Math.PI / 2; f.position.set(0.45 * s, 0.42, 2.9); jc.userData.chassis.add(f); return f; });
  const flameGlow = glowSprite(0x7ad8ff, 1.6, 0.6); flameGlow.position.set(0, 0.45, 2.6); jc.userData.chassis.add(flameGlow);
  const shield = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), fresnelMat(0x3da5ff)); shield.scale.set(1.6, 1.15, 3.0); shield.position.y = 0.8; jc.add(shield);
  // traffic, SWAT, roadblock, ramp, the bus, the helicopter, two tanks
  const traffic = [0xd8d8e0, 0x2a6aff, 0x18a858, 0x9a1a3a, 0xe8e0a0, 0x3a3a44].map((c) => { const car = makeStreetCar({ body: c }); scene.add(car); return car; });
  const swat = [makeSwat(), makeSwat()]; swat.forEach((s) => scene.add(s));
  const block = new THREE.Group(); scene.add(block);
  const blockCops = [-3.2, 0, 3.2].map((x, i) => { const c = makeStreetCar({ police: true }); c.position.set(x + (i === 0 ? -1.2 : 0), 0, 0); c.rotation.y = Math.PI / 2 + (i - 1) * 0.2; block.add(c); return c; });
  const barrierM = new THREE.MeshStandardMaterial({ map: (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 32; const x = c.getContext("2d"); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "#ffffff" : "#ff3a2a"; x.beginPath(); x.moveTo(i * 32, 32); x.lineTo(i * 32 + 16, 0); x.lineTo(i * 32 + 48, 0); x.lineTo(i * 32 + 32, 32); x.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(), roughness: 0.5 });
  for (const x of [-5.5, 5.5]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 0.15), barrierM); b.position.set(x, 1.0, 1.2); block.add(b); for (const dx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.5), std(0xdadada)); leg.position.set(x + dx, 0.5, 1.2); block.add(leg); } }
  const spikes = new THREE.Group(); spikes.position.set(0, 0.02, 4.2); block.add(spikes);
  const band = new THREE.Mesh(new THREE.BoxGeometry(12, 0.04, 0.35), std(0x1a1a1e)); spikes.add(band);
  for (let i = 0; i < 48; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 5), std(0xc8c8d0, { metalness: 0.9, roughness: 0.25 })); sp.position.set(-5.8 + i * 0.245, 0.1, 0); spikes.add(sp); }
  const ramp = new THREE.Group(); scene.add(ramp);   // a flatbed with a steel ramp on it: rises 2.6 m over 7 m
  const rampShape = new THREE.Shape(); rampShape.moveTo(0, 0); rampShape.lineTo(7, 0); rampShape.lineTo(7, 2.6); rampShape.lineTo(0, 0.05);
  const rampGeo = new THREE.ExtrudeGeometry(rampShape, { depth: 3.0, bevelEnabled: false }); rampGeo.translate(0, 0, -1.5);
  const chev = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 256; const x = c.getContext("2d"); x.fillStyle = "#1a1a1e"; x.fillRect(0, 0, 256, 256); x.fillStyle = "#ffd23d"; for (let i = -2; i < 8; i++) { x.beginPath(); x.moveTo(i * 48, 256); x.lineTo(i * 48 + 24, 256); x.lineTo(i * 48 + 152, 0); x.lineTo(i * 48 + 128, 0); x.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const rampM = new THREE.Mesh(rampGeo, new THREE.MeshStandardMaterial({ map: chev, metalness: 0.6, roughness: 0.4 })); rampM.rotation.y = Math.PI / 2; ramp.add(rampM); rampM.castShadow = rampM.receiveShadow = true;
  const bus = makeBus(); scene.add(bus);
  const heli = makeHeli(); scene.add(heli);
  const tanks = [makeTank(), makeTank()]; tanks.forEach((t) => scene.add(t));
  // power-ups: a spinning icon with a glow
  const pickups = { shield: null, emp: null, nitro: null };
  for (const k of Object.keys(pickups)) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture(k), transparent: true, depthWrite: false })); s.scale.setScalar(1.6); const glow = glowSprite(k === "emp" ? 0xb56bff : 0x3da5ff, 4, 0.5); s.add(glow); scene.add(s); pickups[k] = s; }
  // effects: the EMP wave, explosions (fire, smoke, debris, a flash of light), tyre smoke
  const emp = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), fresnelMat(0xb56bff)); scene.add(emp);
  const empRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color: 0xc89aff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); empRing.rotation.x = -Math.PI / 2; empRing.position.y = 0.05; scene.add(empRing);
  const fireTex = radialGlow("255,170,60"), smokeTex = radialGlow("40,36,40");
  const booms = Array.from({ length: 4 }, () => {
    const g = new THREE.Group(); scene.add(g);
    const fire = Array.from({ length: 7 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, color: 0xffa040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(s); return s; });
    const smoke = Array.from({ length: 8 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: 0x5a5058, transparent: true, depthWrite: false })); g.add(s); return s; });
    const debris = Array.from({ length: 10 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.35), std(0x2a2a30, { metalness: 0.6 })); g.add(m); return m; });
    const light = new THREE.PointLight(0xffa040, 0, 30, 1.4); g.add(light);
    return { g, fire, smoke, debris, light };
  });
  const SM = 40, smokeSprites = Array.from({ length: SM }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: 0x8a8890, transparent: true, depthWrite: false, opacity: 0 })); scene.add(s); return s; });

  const hash = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  return {
    ...st, driver, swat, block, blockCops, ramp, bus, heli, tanks, traffic, pickups, shield, bloom: { strength: 0.7, radius: 0.5, threshold: 0.8 },
    // p: { dist, siren, spark, nitro 0..1, shield 0..1, emp: {t, pos} | null, booms: [{t, pos, s}], smoke 0..1 (tyre smoke), hide: [...] }
    update(t, p = {}) {
      st.update(t, p);
      const n = p.nitro ?? 0; flames.forEach((f, i) => { const len = 0.2 + n * 1.6 + Math.sin(t * 60 + i) * 0.1 * n; f.scale.set(1 + n * 0.6, Math.max(0.01, len), 1 + n * 0.6); f.position.z = 2.3 + len * 0.7; f.visible = n > 0.02; }); flameGlow.material.opacity = n * 0.8; flameGlow.scale.setScalar(1 + n * 2);
      shield.visible = (p.shield ?? 0) > 0.01; shield.material.uniforms.uFade.value = (p.shield ?? 0) * (0.75 + 0.25 * Math.sin(t * 13));
      if (p.emp && p.emp.t >= 0 && p.emp.t < 2.2) { const r = 1 + p.emp.t * 34; emp.visible = empRing.visible = true; emp.position.copy(p.emp.pos); emp.scale.setScalar(r); emp.material.uniforms.uFade.value = clamp(1 - p.emp.t / 1.6);
        empRing.position.set(p.emp.pos.x, 0.06, p.emp.pos.z); empRing.scale.setScalar(r * 1.05); empRing.material.opacity = clamp(1 - p.emp.t / 1.4); } else emp.visible = empRing.visible = false;
      booms.forEach((b, i) => {
        const e = (p.booms || [])[i]; b.g.visible = !!e && e.t >= 0 && e.t < 3.5; if (!b.g.visible) { b.light.intensity = 0; return; }
        const s = e.s ?? 1, k = e.t; b.g.position.copy(e.pos);
        b.fire.forEach((f, j) => { const a = clamp(1 - k / (0.7 + hash(j, 1) * 0.5)); f.visible = a > 0; const r = s * (1.2 + k * (3 + hash(j, 2) * 3)); f.scale.setScalar(r); f.position.set((hash(j, 3) - 0.5) * s * 2 * (0.3 + k), s * (0.6 + k * (1 + hash(j, 4) * 2)), (hash(j, 5) - 0.5) * s * 2 * (0.3 + k)); f.material.opacity = a; f.material.color.setRGB(1, 0.45 + 0.4 * a, 0.15 + 0.3 * a * a); });
        b.smoke.forEach((m, j) => { const a = clamp((k - 0.15) / 0.3) * clamp(1 - (k - 0.4) / 3.0) * 0.8; m.visible = a > 0; m.scale.setScalar(s * (2 + k * (2.5 + hash(j, 6) * 2))); m.position.set((hash(j, 7) - 0.5) * s * 4, s * (1 + k * (1.6 + hash(j, 8))), (hash(j, 9) - 0.5) * s * 4); m.material.opacity = a; });
        b.debris.forEach((d, j) => { const vx = (hash(j, 10) - 0.5) * 14 * s, vy = (4 + hash(j, 11) * 9) * s, vz = (hash(j, 12) - 0.5) * 14 * s, tt = Math.min(k, 2.5); d.position.set(vx * tt, Math.max(0, 0.5 + vy * tt - 9.8 * tt * tt), vz * tt); d.rotation.set(tt * 8 * hash(j, 13), tt * 6, tt * 7 * hash(j, 14)); });
        b.light.intensity = 900 * s * clamp(1 - k / 0.6); b.light.position.set(0, 1.5 * s, 0);
      });
      const sm = p.smoke ?? 0; smokeSprites.forEach((s, i) => { const life = ((t * 1.3 + i / SM) % 1), side = i % 2 ? 1 : -1; s.position.set(st.jayCar.position.x + side * 0.9 + (hash(i, 1) - 0.5) * life * 3, 0.3 + life * 1.6, st.jayCar.position.z + 1.8 + life * 7); s.scale.setScalar(0.6 + life * 3.2); s.material.opacity = sm * 0.45 * (1 - life); s.visible = sm > 0.01; });
      const strobe = Math.sin(t * 22) > 0; swat.forEach((s) => { s.userData.red.material.color.setRGB(strobe ? 1 : 0.15, 0.05, 0.08); s.userData.blue.material.color.setRGB(0.05, 0.15, strobe ? 0.15 : 1); });
      blockCops.forEach((c) => { const u = c.userData; u.red.material.color.setRGB(strobe ? 1 : 0.15, 0.05, 0.08); u.blue.material.color.setRGB(0.05, 0.15, strobe ? 0.15 : 1); });
      heli.userData.blades.rotation.y = t * 30; heli.userData.tailRotor.rotation.x = t * 40; heli.userData.navR.visible = Math.sin(t * 6) > 0;
      Object.values(pickups).forEach((s, i) => { s.material.rotation = Math.sin(t * 2 + i) * 0.15; });
    },
  };
}
