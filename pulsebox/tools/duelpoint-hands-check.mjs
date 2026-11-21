// Duelpoint: your support hand never goes through the gun. For every gun, through its whole reload, its draw and its
// inspect, points on the support hand and the near end of its forearm are tested against the gun's solid parts: a point
// counts as inside when the first surface met in every direction is seen from behind (and it is deeper than a few
// millimetres, so a touch does not count). Also: the support forearm reaches in from your left, the trigger arm from the right.
//   node tools/duelpoint-hands-check.mjs [gun,gun,...]
import { createRequire } from 'module'; import path from 'path';
const { chromium } = createRequire(import.meta.url)('playwright');
const ONLY = process.argv[2] ? process.argv[2].split(',') : null, URL0 = 'file://' + path.resolve('public/games/duelpoint.html');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = []; let failed = 0; const ok = (c, n, x = '') => { if (!c) failed++; console.log((c ? '  ok   ' : '  FAIL ') + n + (x !== '' ? '  (' + x + ')' : '')); };
const p = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
await p.goto(URL0, { timeout: 120000 });
await p.waitForFunction(() => typeof GAME !== 'undefined' && GAME.test && GAME.test.ready(), null, { timeout: 90000 }); await p.waitForTimeout(600);
const guns = await p.evaluate(() => Object.keys(GAME.test.GUNS).filter(k => !GAME.test.GUNS[k].melee));
for (const k of guns) {
  if (ONLY && !ONLY.includes(k)) continue;
  const r = await p.evaluate(k => {
    const t = GAME.test, THREE = window.THREE, G = t.GUNS[k], gm = t.gunModel(k, { hands: true, op: 'vex' }), pp = gm.userData.parts, LH = pp.lhand, RH = pp.rhand;
    if (!LH) return { none: true };
    const inSub = (o, root) => { for (let q = o; q; q = q.parent) if (q === root) return true; return false; };
    // what the hand is tested with (its glove, and the forearm's first 16 cm) and against (the gun: not the hands, not what the hand carries)
    const hand = [], solid = [], mats = new Set();
    gm.traverse(o => { if (!o.isMesh) return; if (inSub(o, LH)) { if (o.material.name === 'hand') hand.push(o); } else if (!inSub(o, RH)) { solid.push(o); mats.add(o.material); } });
    const sides = new Map(); for (const m of mats) { sides.set(m, m.side); m.side = THREE.DoubleSide; }
    const local = []; for (const o of hand) { const P = o.geometry.attributes.position, n = P.count, step = Math.max(1, Math.floor(n / 70)); o.updateMatrix();
      for (let i = 0; i < n; i += step) { const v = new THREE.Vector3().fromBufferAttribute(P, i); local.push({ o, v }); } }
    const rc = new THREE.Raycaster(), DIRS = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]].map(d => new THREE.Vector3(...d)), nm = new THREE.Matrix3(), nw = new THREE.Vector3(), w = new THREE.Vector3(), lo = new THREE.Vector3();
    rc.far = .6;
    const behind = (pt, d) => { rc.set(pt, d); const hit = rc.intersectObjects(solid, false)[0]; if (!hit || !hit.face) return null; nm.getNormalMatrix(hit.object.matrixWorld); nw.copy(hit.face.normal).applyMatrix3(nm); return { back: nw.dot(d) > 0, dist: hit.distance }; };
    const inside = pt => { let backs = 0, near = 9; for (let i = 0; i < 6; i++) { const h = behind(pt, DIRS[i]); if (!h) return 0; if (h.back) backs++; else if (i - backs >= 1) return 0; near = Math.min(near, h.dist); } return backs >= 5 ? near : 0; };
    // the gun goes where the game holds it in your view, and is tipped the way its reload tips it, so the forearms (which
    // point at your elbows, whatever the gun does) are tested as they really lie
    const X = t.X, view = X.view, was = { p: view.position.clone(), r: view.rotation.clone() }, VO = G.cat === 'Sidearm' && k !== 'stub' ? [.13, -.115, -.3] : [.185, -.178, -.28]; view.add(gm);
    const track = t.VKF.reload[k === 'stub' ? 'stub' : k === 'hammer' ? 'revolver' : k === 'thresher' ? 'rifle' : G.cat === 'Sidearm' ? 'sidearm' : G.cat === 'Shotgun' ? 'shotgun' : G.cat === 'Sniper' ? 'sniper' : 'rifle'];
    const kf = q => { for (let i = 1; i < track.length; i++) if (q <= track[i][0]) { const a = track[i - 1], c = track[i], u = (q - a[0]) / (c[0] - a[0]), e = u * u * (3 - 2 * u); return a.slice(1).map((v, j) => v + (c[j + 1] - v) * e); } return [0, 0, 0, 0, 0, 0]; };
    const fake = { ammo: { [k]: { mag: Math.max(1, G.mag - 2), res: 30 } }, fireT: -1, reloadT: 0, wind: 0, alive: true };
    const worst = { reload: [0, 0, 0], draw: [0, 0, 0], inspect: [0, 0, 0] };   // [deepest, at, how many of the samples]
    const run = (kind, q) => {
      fake.reloadT = kind === 'reload' ? G.rel * (1 - q) : 0; fake.ammo[k].mag = Math.max(1, G.mag - 2);
      const o = kind === 'reload' ? kf(q) : [0, 0, 0, 0, 0, 0]; view.position.set(VO[0] + o[0], VO[1] + o[1], VO[2] + o[2]); view.rotation.set(o[3], .02 + o[4], o[5]);
      t.animParts(gm, fake, G, 0, false, kind === 'draw' ? { draw: q } : kind === 'inspect' ? { insp: q } : {}); t.aimArms(gm); X.vroot.updateMatrixWorld(true);
      const lhp = LH.getWorldPosition(lo); let deep = 0, n = 0;
      let at = null; for (const s of local) { w.copy(s.v).applyMatrix4(s.o.matrixWorld); if (w.distanceTo(lhp) > .17) continue; const d = inside(w); if (d > .004) { n++; if (d > deep) { deep = d; at = w.toArray().map(v => +v.toFixed(3)); } } }
      if (deep > worst[kind][0]) worst[kind] = [deep, q, n, at, lhp.toArray().map(v => +v.toFixed(3))];
    };
    for (let q = 0; q <= 1.0001; q += .025) run('reload', q);
    for (let q = 0; q <= 1.0001; q += .05) { run('draw', q); run('inspect', q); }
    // at rest: which way each forearm leaves its hand (x: to your right is +)
    fake.reloadT = 0; view.position.set(VO[0], VO[1], VO[2]); view.rotation.set(0, .02, 0); t.animParts(gm, fake, G, 0, false, {}); t.aimArms(gm); X.vroot.updateMatrixWorld(true);
    const toView = v => { const q = new THREE.Vector3(v[0], v[1], v[2]).transformDirection(new THREE.Matrix4().copy(X.vroot.matrixWorld).invert()); return q.toArray().map(c => +c.toFixed(2)); };
    const armDir = H => { const a = new THREE.Vector3(), c = new THREE.Vector3(), h0 = H.getWorldPosition(new THREE.Vector3()); let far = 0;   // toward the point of the arm furthest from the hand: its elbow end
      H.traverse(o => { if (!o.isMesh || o.material.name !== 'hand') return; const P = o.geometry.attributes.position; for (let i = 0; i < P.count; i++) { c.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); const d = c.distanceTo(h0); if (d > far) { far = d; a.copy(c); } } });
      return a.sub(h0).normalize().toArray().map(v => +v.toFixed(2)); };
    const res = { worst, left: toView(armDir(LH)), right: toView(armDir(RH)) };   // (as you see them: x to your right, y up)
    for (const [m, sd] of sides) m.side = sd; view.remove(gm); view.position.copy(was.p); view.rotation.copy(was.r); return res;
  }, k);
  if (r.none) continue;
  const mm = v => (v * 1000).toFixed(0) + ' mm';
  for (const kind of ['reload', 'draw', 'inspect']) ok(r.worst[kind][0] <= .004, `${k}: the support hand stays out of the gun through the ${kind}`, r.worst[kind][0] ? `${mm(r.worst[kind][0])} deep at ${r.worst[kind][1].toFixed(2)}, ${r.worst[kind][2]} points, at ${r.worst[kind][3]} with the hand at ${r.worst[kind][4]}` : 'clear');
  ok(r.left[0] < -.3 && r.left[1] < -.15 && r.right[0] > r.left[0] + .4 && r.right[1] < -.15, `${k}: the support forearm comes in from your left, the trigger arm from your right`, `left ${r.left.join(',')}  right ${r.right.join(',')}`);
}
console.log('errors', errs.length, errs.slice(0, 3)); await b.close(); process.exit(errs.length || failed ? 1 : 0);
