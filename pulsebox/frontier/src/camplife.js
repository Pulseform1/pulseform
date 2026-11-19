// Life at camp: the pack (I), firewood (deadfall in the woods and the woodpile), lighting and feeding the fire,
// roasting meat on the spit (raw -> cooking -> cooked), the meat box in the tent, drying meat on the rack, the
// ammunition chest, sitting by the fire to let time pass, and sleeping in the bedroll. No hunger, no spoilage.
import * as THREE from 'three';

const MEAT_CAP = 120, WOOD_CAP = 8, COOK_LB = 4, COOK_TIME = 45, DRY_HOURS = 20;
const cap = s => s[0].toUpperCase() + s.slice(1);

export class CampLife {
  constructor(G, ui) {
    this.G = G; this.ui = ui;
    this.pack = { wood: 2, meat: [] };     // meat: { meat: 'venison', lb, state: raw|cooked|dried }
    this.box = [];                          // the meat box in the tent
    this.chest = { rifle: 40, shotgun: 24, restockDay: 0 };
    this.pile = 14;                         // split logs on the woodpile
    this.spit = [null, null, null];         // { meat, lb, t (seconds cooked) }
    this.rack = [];                         // { meat, lb, hung (game hours) }
    this.gathered = new Set();              // deadfall already picked over
    this.buildVisuals();
    this.hookCamp();
  }
  get lbCarried() { return this.pack.meat.reduce((s, m) => s + m.lb, 0); }
  addMeat(list, meat, lb, state) {
    const e = list.find(m => m.meat === meat && m.state === state);
    if (e) e.lb += lb; else list.push({ meat, lb, state });
    for (let i = list.length - 1; i >= 0; i--) if (list[i].lb <= 0.01) list.splice(i, 1);
  }
  takeMeat(list, pred, lb) {
    const e = list.find(pred); if (!e) return null; const n = Math.min(lb, e.lb); e.lb -= n; const r = { meat: e.meat, lb: n, state: e.state };
    for (let i = list.length - 1; i >= 0; i--) if (list[i].lb <= 0.01) list.splice(i, 1);
    return r;
  }
  // a fresh kill goes into the pack, up to what you can carry
  packKill(r) {
    const room = MEAT_CAP - this.lbCarried, lb = Math.min(r.lb, Math.max(0, room));
    if (lb > 0) this.addMeat(this.pack.meat, r.meat, lb, 'raw');
    return lb < r.lb ? `You pack ${lb} lb of ${r.meat}. Your pack is full; the rest is left for the ravens.` : `You dress the ${r.label.toLowerCase()} and pack ${lb} lb of ${r.meat}.`;
  }

  // ---- visuals: the spit, meat on it, strips on the rack, the size of the woodpile ----
  buildVisuals() {
    const c = this.G.camp, M = c.mats, fg = c.fireGroup;
    const stick = (a, b, r) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), M.pole); m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.castShadow = true; return m; };
    for (const s of [-1, 1]) { fg.add(stick(new THREE.Vector3(s * .95, 0, .35), new THREE.Vector3(s * .95, .8, .35), .025)); fg.add(stick(new THREE.Vector3(s * .95, .62, .35), new THREE.Vector3(s * 1.03, .86, .35), .015)); fg.add(stick(new THREE.Vector3(s * .95, .62, .35), new THREE.Vector3(s * .87, .86, .35), .015)); }
    this.spitBar = stick(new THREE.Vector3(-1.15, .72, .35), new THREE.Vector3(1.15, .72, .35), .012); fg.add(this.spitBar);
    this.meatMat = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: 0x5a1410, roughness: .7, envMapIntensity: .4 }));
    this.spitMeat = [-.45, 0, .45].map((x, i) => { const g = new THREE.SphereGeometry(.12, 14, 10), pp = g.attributes.position; for (let j = 0; j < pp.count; j++) { const y = pp.getY(j), x = pp.getX(j); pp.setY(j, y * (1 + .25 * Math.sin(x * 40))); } g.computeVertexNormals(); const m = new THREE.Mesh(g, this.meatMat[i]); m.scale.set(1.5, .75, .85); m.position.set(x, .72, .35); m.castShadow = true; m.visible = false; fg.add(m); return m; });
    // steam off cooking meat
    this.steam = [];
    for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.G.tex.puff, color: 0xdedad2, transparent: true, depthWrite: false, opacity: 0 })); s.userData.t = i / 6 * 2; fg.add(s); this.steam.push(s); }
    // drying strips on the rack
    const stripMat = new THREE.MeshStandardMaterial({ color: 0x6a2a1e, roughness: .7 });
    this.strips = c.hooks.map(h => { const m = new THREE.Mesh(new THREE.BoxGeometry(.12, .45, .03), stripMat.clone()); m.position.set(h.x, 1.47, 0); m.castShadow = true; m.visible = false; h.group.add(m); return m; });
    // the woodpile shrinks as you take from it
    this.pileLogs = []; c.group.traverse(o => { if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.thetaLength && o.geometry.parameters.thetaLength > 3.5 && o.geometry.parameters.height === .62) this.pileLogs.push(o); });
    this.updatePile();
  }
  updatePile() { this.pileLogs.forEach((m, i) => { m.visible = i < Math.round(this.pile * this.pileLogs.length / 22); }); }

  // ---- interactions at camp: labels and actions ----
  hookCamp() {
    const c = this.G.camp, L = this;
    for (const it of c.interact) {
      if (it.id === 'fire') it.label = () => { const f = c.fire; if (!f.lit) return L.pack.wood >= 2 ? 'Light the fire (2 wood)' : 'Light the fire (needs 2 firewood)'; return L.pack.wood ? `Add a log to the fire (${L.pack.wood} in your pack)` : 'Add a log (no firewood in your pack)'; };
      if (it.id === 'woodpile') it.label = () => L.pack.wood < WOOD_CAP && L.pile > 0 ? `Take firewood (${L.pile} on the pile)` : L.pile <= 0 ? 'The woodpile is empty' : 'Your arms are full of wood';
      if (it.id === 'meatbox') it.label = () => 'Open the meat box';
      if (it.id === 'chest') it.label = () => 'Open the chest';
      if (it.id === 'rack') it.label = () => L.rack.length ? 'Drying rack: take or hang meat' : 'Hang meat to dry';
      if (it.id === 'table') it.label = () => 'Camp table: check your pack';
    }
    const fp = c.fireGroup;
    this.spitIt = c.addInteract('spit', 0, .9, 3.1 + .35, 1.6, () => {
      const cooked = L.spit.filter(s => s && s.t >= COOK_TIME).length, cooking = L.spit.filter(s => s && s.t < COOK_TIME).length, raw = L.pack.meat.some(m => m.state === 'raw');
      if (cooked) return `Take cooked meat off the spit (${cooked})`;
      if (raw && cooking < 3) return c.fire.lit ? 'Put raw meat on the spit' : 'Put meat on the spit (light the fire to cook it)';
      if (cooking) return `Roasting... ${Math.round(Math.max(...L.spit.filter(Boolean).map(s => s.t)) / COOK_TIME * 100)}%`;
      return 'Spit (bring raw meat to roast)';
    });
    // the spit sits a little in front of the fire, so prefer it when looking low at the fire
    this.spitIt.pos.y -= .2;
  }
  interact(it) {
    const c = this.G.camp, ui = this.ui;
    switch (it.id) {
      case 'fire': {
        const f = c.fire;
        if (!f.lit) { if (this.pack.wood < 2) return ui.toast('You need two pieces of firewood. Try the woodpile, or deadfall in the woods.'); this.pack.wood -= 2; f.ignite(); return ui.toast('Shavings, a match, two logs: the fire catches.'); }
        if (!this.pack.wood) return ui.toast('No firewood in your pack.');
        this.pack.wood--; f.addFuel(.32); return ui.toast(f.fuel > .9 ? 'The fire roars up.' : 'You lay another log on the fire.');
      }
      case 'woodpile': {
        if (this.pile <= 0) return ui.toast('The woodpile is empty. Gather deadfall in the woods; it stacks here.');
        const n = Math.min(WOOD_CAP - this.pack.wood, this.pile, 4); if (n <= 0) return ui.toast('You cannot carry more wood.');
        this.pack.wood += n; this.pile -= n; this.updatePile(); return ui.toast(`You take ${n} split logs. (${this.pack.wood} carried)`);
      }
      case 'spit': return this.useSpit();
      case 'meatbox': return ui.storage('meatbox');
      case 'chest': c.chestOpen = true; return ui.storage('chest');
      case 'rack': return this.useRack();
      case 'table': return ui.openPack();
    }
    return false;
  }
  useSpit() {
    const c = this.G.camp, ui = this.ui;
    const done = this.spit.map((s, i) => s && s.t >= COOK_TIME ? i : -1).filter(i => i >= 0);
    if (done.length) { let lb = 0; for (const i of done) { const s = this.spit[i]; this.addMeat(this.pack.meat, s.meat, s.lb, 'cooked'); lb += s.lb; this.spit[i] = null; } return ui.toast(`You take ${lb} lb of hot roast meat off the spit.`); }
    const slot = this.spit.indexOf(null), raw = this.pack.meat.find(m => m.state === 'raw');
    if (!raw) return ui.toast('You have no raw meat. Hunt, or take some from the meat box in the tent.');
    if (slot < 0) return ui.toast('The spit is full.');
    const r = this.takeMeat(this.pack.meat, m => m.state === 'raw', COOK_LB); this.spit[slot] = { meat: r.meat, lb: r.lb, t: 0 };
    ui.toast(c.fire.lit ? `${cap(r.meat)} on the spit. It will take a while to roast.` : `${cap(r.meat)} on the spit. Light the fire to roast it.`);
  }
  useRack() {
    const ui = this.ui, G = this.G, done = this.rack.filter(r => G.gameHours - r.hung >= DRY_HOURS);
    if (done.length) { let lb = 0; for (const r of done) { this.addMeat(this.pack.meat, r.meat, r.lb, 'dried'); lb += r.lb; } this.rack = this.rack.filter(r => !done.includes(r)); return ui.toast(`You take down ${lb} lb of dried meat.`); }
    if (this.rack.length >= 5) return ui.toast('The rack is full. Strips take about a day to dry.');
    const r = this.takeMeat(this.pack.meat, m => m.state === 'raw', 6);
    if (!r) return ui.toast(this.rack.length ? 'The meat is still drying. Give it about a day.' : 'Bring raw meat to hang and dry.');
    this.rack.push({ meat: r.meat, lb: r.lb, hung: G.gameHours }); ui.toast(`You hang ${r.lb} lb of ${r.meat} in strips to dry.`);
  }
  // deadfall in the forest: fallen logs, stumps and snags give dry wood once each
  gatherSpot(pos, dir) {
    const G = this.G, f = G.flora, list = f.propsNear(pos.x, pos.z, 3, [6, 7]).concat(f.treesNear(pos.x, pos.z, 2.6, [9, 10]));
    let best = null, bd = 9;
    for (const p of list) { const key = Math.round(p.x * 2) + ',' + Math.round(p.z * 2); if (this.gathered.has(key)) continue; const dx = p.x - pos.x, dz = p.z - pos.z, d = Math.hypot(dx, dz); if (d > 1.5 && (dx * dir.x + dz * dir.z) / d < .4) continue; if (d < bd) { bd = d; best = { ...p, key }; } }
    return best;
  }
  gather(spot) {
    if (this.pack.wood >= WOOD_CAP) return this.ui.toast('Your arms are full of wood.');
    const n = Math.min(WOOD_CAP - this.pack.wood, spot.kind === 6 ? 3 : 2); this.pack.wood += n; this.gathered.add(spot.key);
    this.ui.toast(`You break off ${n} armfuls of dry wood. (${this.pack.wood} carried)`);
  }
  update(dt, gameDt) {
    const G = this.G, c = G.camp, f = c.fire;
    // rain burns the fire down faster
    if (f.lit && G.weather.cur.rain > .3 && !c.inside(c.firePos.x, c.firePos.z)) f.fuel = Math.max(0, f.fuel - dt / 900 * G.weather.cur.rain);
    // roasting
    let cooking = false;
    this.spit.forEach((s, i) => {
      const m = this.spitMeat[i]; m.visible = !!s; if (!s) return;
      if (f.lit && f.fuel > .02 && s.t < COOK_TIME) { s.t += dt + gameDt / 60 * .02; cooking = true; }
      const k = Math.min(1, s.t / COOK_TIME);
      this.meatMat[i].color.setRGB(.36 - .22 * k, .07 + .01 * k, .06 - .035 * k); this.meatMat[i].roughness = .7 - .25 * k;
      m.rotation.x += dt * (f.lit ? .8 : 0);
    });
    this.spitBar.rotation.y += 0;
    this.steam.forEach(s => { s.userData.t += dt; const k = (s.userData.t % 2) / 2; s.position.set((Math.random() - .5) * .02 + (k - .5) * .1, .85 + k * .9, .35); s.scale.setScalar(.15 + k * .5); s.material.opacity = cooking ? Math.sin(k * Math.PI) * .25 : 0; });
    // the drying rack
    this.strips.forEach((m, i) => { const r = this.rack[i]; m.visible = !!r; if (r) { const k = Math.min(1, (G.gameHours - r.hung) / DRY_HOURS); m.material.color.setRGB(.42 - .18 * k, .17 - .06 * k, .12 - .05 * k); m.scale.y = 1 - .25 * k; } });
    // a new day: you load fresh cartridges at camp
    if (G.day > this.chest.restockDay) { this.chest.restockDay = G.day; if (G.day > 0) { this.chest.rifle = Math.min(80, this.chest.rifle + 12); this.chest.shotgun = Math.min(48, this.chest.shotgun + 8); } }
  }
  // sleeping or sitting lets time pass: the fire burns down, the spit keeps roasting
  passTime(hours) {
    const f = this.G.camp.fire, secs = hours * 60;
    if (f.lit) { f.fuel = Math.max(0, f.fuel - secs / 600); if (f.fuel <= 0) f.lit = false; }
    this.spit.forEach(s => { if (s && f.lit) s.t = Math.min(COOK_TIME, s.t + secs); });
  }
  save() { return { pack: this.pack, box: this.box, chest: this.chest, pile: this.pile, spit: this.spit, rack: this.rack, gathered: [...this.gathered].slice(-400) }; }
  load(d) { if (!d) return; Object.assign(this, { pack: d.pack, box: d.box, chest: d.chest, pile: d.pile, spit: d.spit, rack: d.rack }); this.gathered = new Set(d.gathered || []); this.updatePile(); }
}
