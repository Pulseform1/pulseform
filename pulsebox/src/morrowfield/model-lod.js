import * as THREE from './vendor/three.module.js';

// Small, shared geometries for distant forest tiles. The close models remain in
// models.js; these silhouettes deliberately omit branches, needles and leaflets.
const sphere = new THREE.SphereGeometry(1, 7, 5);
const trunk = new THREE.CylinderGeometry(.65, 1, 1, 6);
const cone = new THREE.ConeGeometry(1, 1, 7);
const materials = {
  bark: new THREE.MeshStandardMaterial({color: 0x6e5841, roughness: .95}),
  birch: new THREE.MeshStandardMaterial({color: 0xf8f0db, roughness: .95}),
  palm: new THREE.MeshStandardMaterial({color: 0x947052, roughness: .95}),
  leaf: new THREE.MeshStandardMaterial({color: 0x638b58, roughness: .92}),
  light: new THREE.MeshStandardMaterial({color: 0x8baa68, roughness: .92}),
  dark: new THREE.MeshStandardMaterial({color: 0x416f55, roughness: .92}),
};
for (const [name, material] of Object.entries(materials)) {
  material.name = `morrowfield-far-${name}`;
  material.userData.foliage = ['leaf', 'light', 'dark'].includes(name);
}

function part(group, geometry, material, position, scale, rotation) {
  const mesh = new THREE.Mesh(geometry, materials[material]);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.foliage = materials[material].userData.foliage;
  group.add(mesh);
  return mesh;
}

/** Return a low-detail tree with shared geometry/materials, or null otherwise. */
export function makeFarModel(id) {
  if (!['oak', 'birch', 'pine', 'palm'].includes(id)) return null;
  const group = new THREE.Group();
  group.name = `${id}-distant`;
  group.userData = {assetId: id, kind: 'plant', sway: true, distant: true};
  if (id === 'oak') {
    part(group, trunk, 'bark', [0, 2.1, 0], [.4, 4.2, .4]);
    part(group, sphere, 'dark', [-1.05, 5.4, .15], [1.95, 1.45, 1.7]);
    part(group, sphere, 'leaf', [.95, 5.8, .3], [1.8, 1.6, 1.65]);
    part(group, sphere, 'light', [.1, 6.75, -.4], [1.65, 1.35, 1.65]);
  } else if (id === 'birch') {
    part(group, trunk, 'birch', [0, 3.5, 0], [.23, 7, .23]);
    part(group, sphere, 'light', [-.7, 6.05, .1], [1.5, 2.1, 1.1]);
    part(group, sphere, 'leaf', [.45, 7.25, 0], [1.35, 1.85, 1.25]);
  } else if (id === 'pine') {
    part(group, trunk, 'bark', [0, 3.4, 0], [.28, 6.8, .28]);
    part(group, cone, 'dark', [0, 3.45, 0], [2.2, 4.3, 2.2]);
    part(group, cone, 'leaf', [0, 5.55, 0], [1.65, 3.8, 1.65]);
    part(group, cone, 'dark', [0, 7.25, 0], [1.05, 3.7, 1.05]);
  } else {
    part(group, trunk, 'palm', [.4, 3.15, 0], [.23, 6.35, .23], [0, 0, -.125]);
    part(group, sphere, 'dark', [.8, 6.25, .1], [3.05, .34, 1.1], [0, .2, .04]);
    part(group, sphere, 'leaf', [.8, 6.4, .1], [3, .34, 1.05], [0, 1.22, -.05]);
    part(group, sphere, 'light', [.8, 6.5, .1], [2.75, .3, .9], [0, 2.22, .03]);
  }
  return group;
}
