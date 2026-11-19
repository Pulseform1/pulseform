// A kerosene lantern: tin fuel fount, glass globe with a wick flame, wire guards, chimney cap and a bail handle,
// with a warm flickering light. It hangs at camp or is carried in the left hand; L turns it up or down.
import * as THREE from 'three';

export function lanternModel() {
  const g = new THREE.Group();
  const tin = new THREE.MeshStandardMaterial({ color: 0x5a1e14, metalness: .55, roughness: .45 }); // red-painted tin, worn
  const dark = new THREE.MeshStandardMaterial({ color: 0x24221f, metalness: .7, roughness: .5 });
  const lathe = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  g.add(new THREE.Mesh(lathe([[0, 0], [.07, 0], [.082, .008], [.084, .045], [.074, .062], [.05, .07], [.045, .072]]), tin));
  const glass = new THREE.MeshStandardMaterial({ color: 0xfff1d6, roughness: .08, metalness: 0, transparent: true, opacity: .28, emissive: 0xffa040, emissiveIntensity: 0, depthWrite: false });
  const globe = new THREE.Mesh(lathe([[.042, .072], [.058, .095], [.064, .13], [.058, .175], [.04, .2]], 24), glass); globe.renderOrder = 3; g.add(globe);
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + .4, w = new THREE.Mesh(new THREE.CylinderGeometry(.0028, .0028, .14, 4), dark); w.position.set(Math.cos(a) * .069, .137, Math.sin(a) * .069); g.add(w); }
  for (const y of [.1, .17]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(y === .1 ? .066 : .064, .003, 4, 24), dark); ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring); }
  g.add(new THREE.Mesh(lathe([[.045, .2], [.06, .205], [.05, .225], [.025, .235], [.022, .26], [0, .262]]), tin));
  const bail = new THREE.Mesh(new THREE.TorusGeometry(.075, .003, 4, 20, Math.PI), dark); bail.position.y = .25; g.add(bail);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(.012, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd08a, fog: false }));
  flame.scale.set(1, 1.9, 1); flame.position.y = .108; g.add(flame);
  const light = new THREE.PointLight(0xffa255, 0, 22, 2); light.position.y = .13; g.add(light);
  g.traverse(o => { if (o.isMesh && o !== globe && o !== flame) o.castShadow = true; });
  return { group: g, glass, flame, light };
}

export class Lantern {
  constructor() {
    const m = lanternModel(); Object.assign(this, m);
    this.on = true; this.level = 1; this.t = Math.random() * 10; this.carried = false;
  }
  toggle() { this.on = !this.on; }
  update(dt, night) {
    this.t += dt;
    this.level += ((this.on ? 1 : 0) - this.level) * Math.min(1, dt * 6);
    const fl = 0.9 + 0.06 * Math.sin(this.t * 17.3) * Math.sin(this.t * 6.1) + 0.04 * Math.sin(this.t * 31.7);
    const k = this.level * fl;
    this.light.intensity = (this.carried ? 11 : 8) * k * (0.3 + 0.7 * night);
    this.glass.emissiveIntensity = 1.6 * k; this.flame.visible = this.level > 0.05; this.flame.scale.set(1, 1.6 + .5 * fl, 1);
  }
}
