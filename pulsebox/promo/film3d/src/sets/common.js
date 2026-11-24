// Pieces shared by the sets: a glossy reflective floor, gradient skies, the glowing key, game-tile atlases.
import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { gameTile, radialGlow } from "../textures.js";

// a mirror floor with a dark tinted, gridded layer over it, so it reads as polished glass
export function glossFloor(size = 60, { tint = 0x05040c, opacity = 0.82, grid = "#2a1d55", res = [540, 960], gridScale = 30 } = {}) {
  const g = new THREE.Group();
  const mirror = new Reflector(new THREE.PlaneGeometry(size, size), { clipBias: 0.003, textureWidth: res[0], textureHeight: res[1], color: 0x8890a0 });
  mirror.rotation.x = -Math.PI / 2; g.add(mirror);
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
  x.fillStyle = "#000"; x.fillRect(0, 0, 256, 256); x.strokeStyle = grid; x.lineWidth = 3; x.strokeRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(gridScale, gridScale); t.colorSpace = THREE.SRGBColorSpace;
  const top = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.35, metalness: 0.2, transparent: true, opacity, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.6 }));
  top.rotation.x = -Math.PI / 2; top.position.y = 0.004; top.receiveShadow = true; g.add(top);
  g.mirror = mirror; g.top = top;
  return g;
}

// a big sphere with a vertical gradient (and optional stars), for skies and voids
export function gradientSky(stops, { radius = 400, stars = 0 } = {}) {
  const c = document.createElement("canvas"); c.width = 16; c.height = 512; const x = c.getContext("2d");
  const gr = x.createLinearGradient(0, 0, 0, 512); stops.forEach(([p, col]) => gr.addColorStop(p, col)); x.fillStyle = gr; x.fillRect(0, 0, 16, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }));
  const g = new THREE.Group(); g.add(m);
  if (stars) {
    const pos = new Float32Array(stars * 3);
    for (let i = 0; i < stars; i++) { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = radius * 0.9; const s = Math.sqrt(1 - u * u); pos[i * 3] = Math.cos(a) * s * r; pos[i * 3 + 1] = Math.abs(u) * r; pos[i * 3 + 2] = Math.sin(a) * s * r; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: true, color: 0xffffff, map: radialGlow(), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })));
  }
  return g;
}

// the glowing key: bow (ring with a gem), shaft, teeth, and a halo sprite
export function makeKey(color = 0xffd23d) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, metalness: 0.9, roughness: 0.25 });
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 14, 32), mat); bow.position.y = 0.42; g.add(bow);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.5 })); gem.position.y = 0.42; g.add(gem);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.75, 12), mat); shaft.position.y = -0.03; g.add(shaft);
  for (const [y, w] of [[-0.3, 0.18], [-0.17, 0.13]]) { const tooth = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, 0.06), mat); tooth.position.set(w / 2, y, 0); g.add(tooth); }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialGlow(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.4 })); halo.scale.setScalar(1.4); g.add(halo);
  g.mat = mat; g.halo = halo; g.gem = gem;
  return g;
}

// many game tiles packed into one texture, so a whole wall of them is one draw call
export function tileAtlas(names, { cw = 192, ch = 288, cols = 11 } = {}) {
  const rows = Math.ceil(names.length / cols);
  const c = document.createElement("canvas"); c.width = cw * cols; c.height = ch * rows; const x = c.getContext("2d");
  names.forEach((n, i) => { const t = gameTile(n, { w: cw, h: ch }); x.drawImage(t.image, (i % cols) * cw, Math.floor(i / cols) * ch); t.dispose(); });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const uv = (i) => { const u0 = (i % cols) / cols, v1 = 1 - Math.floor(i / cols) / rows; return [u0, v1 - 1 / rows, u0 + 1 / cols, v1]; };
  return { texture: tex, uv };
}

// quads (one per tile) in a single geometry; each gets a world matrix, an atlas cell and a brightness
export function quadBatch(count) {
  const pos = new Float32Array(count * 12), uvs = new Float32Array(count * 8), col = new Float32Array(count * 12), idx = [];
  for (let i = 0; i < count; i++) { const b = i * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
  const v = new THREE.Vector3();
  return {
    geo,
    set(i, matrix, w, h, [u0, v0, u1, v1]) {
      [[-w / 2, -h / 2, u0, v0], [w / 2, -h / 2, u1, v0], [w / 2, h / 2, u1, v1], [-w / 2, h / 2, u0, v1]].forEach(([x, y, u, vv], k) => {
        v.set(x, y, 0).applyMatrix4(matrix); pos.set([v.x, v.y, v.z], (i * 4 + k) * 3); uvs.set([u, vv], (i * 4 + k) * 2);
      });
    },
    bright(i, r, g = r, b = r) { for (let k = 0; k < 4; k++) col.set([r, g, b], (i * 4 + k) * 3); },
    commit() { geo.attributes.position.needsUpdate = true; geo.attributes.uv.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeBoundingSphere(); },
    colorsDirty() { geo.attributes.color.needsUpdate = true; },
  };
}

// a soft additive glow card
export function glowSprite(color = 0xffffff, size = 2, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialGlow(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity }));
  s.scale.setScalar(size); return s;
}

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const easeOut = (k) => 1 - Math.pow(1 - k, 3);
export const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
