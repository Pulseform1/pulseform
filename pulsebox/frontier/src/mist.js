// Drifting banks of mist in the deep forest: a few large, soft, see-through cards that hang between the trunks around
// you, drift with the wind and thin out as you walk into them. Only there when the timber is thick all round (gloom).
import * as THREE from 'three';

export class ForestMist {
  constructor(scene, puff, n) {
    this.g = new THREE.Group(); this.g.visible = false; scene.add(this.g); this.items = []; this.init = false;
    for (let i = 0; i < n; i++) {
      const m = new THREE.SpriteMaterial({ map: puff, color: 0xb8c0bc, transparent: true, depthWrite: false, opacity: 0 }), s = new THREE.Sprite(m);
      s.renderOrder = 3; this.g.add(s); this.items.push({ s, sc: 10, h: 1, ph: 0 });
    }
  }
  update(dt, pos, world, k, col, wind) {
    this.g.visible = k > .03; if (!this.g.visible) { this.init = false; return; }
    for (const it of this.items) {
      const s = it.s; let d = Math.hypot(s.position.x - pos.x, s.position.z - pos.z);
      if (!this.init || d > 36) {   // (re)placed: anywhere round you the first time, then on the far edge as you move
        const a = Math.random() * Math.PI * 2, r = this.init ? 28 + Math.random() * 6 : 7 + Math.random() * 26;
        s.position.set(pos.x + Math.cos(a) * r, 0, pos.z + Math.sin(a) * r); it.sc = 9 + Math.random() * 9; it.h = .3 + Math.random() * 1.4; it.ph = Math.random() * 6; d = r;
      }
      s.position.x += wind.x * dt * .5; s.position.z += wind.y * dt * .5; s.position.y = world.height(s.position.x, s.position.z) + it.h;
      it.ph += dt * .12; s.scale.set(it.sc * (1 + .12 * Math.sin(it.ph)), it.sc * .42, 1);
      s.material.opacity = k * .34 * Math.min(1, Math.max(0, (d - 3) / 6)); s.material.color.copy(col);
    }
    this.init = true;
  }
}
