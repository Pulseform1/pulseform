// ARROWWOOD: shots on the practice range (one browser). From one spot: a quick tap lobs short, a full draw flies far;
// the dotted preview follows the real arrow's first stretch and fades before the target; a stone wall stops a full-power arrow.
//   node arrowwood/server/node-server.js --dev &   then   node tools/arrowwood-shot-check.mjs [base URL]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.argv[2] || 'http://localhost:8790';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let fails = 0; const ok = (c, name, x = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + name + (x !== '' ? '  (' + x + ')' : '')); };
const p = await b.newPage({ viewport: { width: 1000, height: 560 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
const T = (fn, a) => p.evaluate(fn, a), until = async (fn, a, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await T(fn, a); if (r) return r; await p.waitForTimeout(100); } return null; };
await p.goto(BASE + '/games/arrowwood.html?dev&norender&nolock'); await p.waitForTimeout(600); await p.click('#bPlay');
await until(() => GAME.test.ready, null, 30000); await T(() => GAME.test.act('practice')); await until(() => GAME.test.CL.phase === 'live' && GAME.test.CL.players.size > 2);
// fire one arrow from a spot with a given draw time; return where it came down (from the server's stick event)
async function shoot(x, z, yaw, pitch, hold) {
  await T(([x, z, yaw, pitch]) => GAME.test.tp(x, z, yaw, pitch), [x, z, yaw, pitch]); await p.waitForTimeout(300);
  const before = await T(() => [...GAME.test.CL.stuck.keys()]);
  await until(() => GAME.test.ME.nockT === 0);
  await T(() => GAME.test.startDraw()); if (hold > 0) await until(h => GAME.test.ME.drawT >= h, hold); else await p.waitForTimeout(16);
  const arc = await T(() => GAME.test.ME.drawing ? GAME.test.arcPts() : null);
  const shotAt = await T(() => { GAME.test.release(); const a = [...GAME.test.CL.arrows.values()].pop(); return a && { o: a.o, v: a.v, g: a.g }; });
  const st = await until(b => { const n = [...GAME.test.CL.stuck.values()].find(s => !b.includes(s.id)); return n && { p: n.p, kind: n.kind, mat: n.mat }; }, before, 10000);
  return { arc, shotAt, st, dist: st && Math.hypot(st.p[0] - x, st.p[2] - z) };
}
const quick = await shoot(71, 118, 0, .05, 0), full = await shoot(71, 118, 0, -.015, 1);   // (a full draw flies straight, so aim it a touch down to land)
ok(quick.st && full.st && full.dist > quick.dist * 2.5, 'from the same spot a quick tap lands short and a full draw flies far', `${quick.dist && quick.dist.toFixed(1)} m vs ${full.dist && full.dist.toFixed(1)} m (${full.st && full.st.kind})`);
ok(quick.st && quick.dist < 16, 'the quick tap lobs and drops quickly', quick.dist && quick.dist.toFixed(1) + ' m');
// the dotted arc: its points lie on the real arrow's path, it covers only the first stretch, and it bends more on a weak draw
const devFrom = (arc, s) => Math.max(...arc.map(q => { const g = s.g == null ? 9.81 : s.g, hv = Math.hypot(s.v[0], s.v[2]), t = Math.hypot(q[0] - s.o[0], q[2] - s.o[2]) / hv; const y = s.o[1] + s.v[1] * t - .5 * g * t * t; return Math.abs(q[1] - y); }));
const fullArc = await (async () => { await T(() => GAME.test.tp(71, 118, 0, .05)); await p.waitForTimeout(300); await until(() => GAME.test.ME.nockT === 0); await T(() => GAME.test.startDraw()); await until(() => GAME.test.ME.drawT >= 1); const a = await T(() => ({ arc: GAME.test.arcPts(), pv: GAME.test.previewNow() })); await T(() => GAME.test.cancelDraw()); return a; })();
const arcLen = Math.hypot(fullArc.arc.at(-1)[0] - fullArc.arc[0][0], fullArc.arc.at(-1)[2] - fullArc.arc[0][2]);
ok(full.arc && devFrom(full.arc, full.shotAt) < .02, 'the dotted arc lies on the real arrow\'s flight (same speed and gravity)', (full.shotAt && full.shotAt.g === 0 ? 'full draw: straight; ' : '') + devFrom(full.arc || [[0, 0, 0]], full.shotAt).toFixed(4) + ' m');
ok(arcLen < 14 && arcLen < full.dist * .5, 'it shows only the first stretch, well short of where the arrow lands', arcLen.toFixed(1) + ' m of ' + (full.dist || 0).toFixed(1));
const weakArc = await (async () => { await until(() => GAME.test.ME.nockT === 0); await T(() => GAME.test.startDraw()); await p.waitForTimeout(30); const a = await T(() => GAME.test.arcPts()); await T(() => GAME.test.cancelDraw()); return a; })();
const drop = arc => { const n = arc.length - 1, a = arc[0], z = arc[n], m = arc[Math.floor(n / 2)]; return ((a[1] + z[1]) / 2 - m[1]); };
ok(weakArc.at(-1)[1] < fullArc.arc.at(-1)[1] - .3, 'the dots bend down on a weak draw and flatten at full power', `end height ${weakArc.at(-1)[1].toFixed(2)} vs ${fullArc.arc.at(-1)[1].toFixed(2)}`);
// a broken stone wall in front: a full-power arrow stops on it, it does not pass through
const wall = await shoot(66, 101.4, 0, -.08, 1);   // (straight now, so aim into the wall rather than over it)
ok(wall.st && wall.st.mat === 'stone' && wall.st.p[2] > 97.5, 'a stone wall stops a full-power arrow (swept collision, no tunnelling)', wall.st && `${wall.st.kind} at z ${wall.st.p[2].toFixed(2)}`);
const tree = await (async () => { const t = await T(() => GAME.test.W.TREES.filter(t => !t.vis && t.x > 20 && t.x < 120 && t.z > 90 && t.z < 130).sort((a, b) => Math.hypot(a.x - 70, a.z - 118) - Math.hypot(b.x - 70, b.z - 118))[0]);
  for (const a of [0, 1.6, 3.2, 4.7]) { const x = t.x + Math.sin(a) * (t.r + 6), z = t.z + Math.cos(a) * (t.r + 6); const free = await T(([x, z]) => !GAME.test.W.blocked(x, GAME.test.W.terrainH(x, z), z), [x, z]); if (free) return shoot(x, z, Math.atan2(x - t.x, z - t.z), .02, 1); } return {}; })();
 ok(tree.st && (tree.st.kind === 'tree' || tree.st.mat === 'wood'), 'arrows that hit a tree stay stuck in it', tree.st && tree.st.kind);
ok(errs.length === 0, 'no errors', JSON.stringify(errs.slice(0, 3)));
console.log(fails ? fails + ' FAILED' : 'ALL OK'); await b.close();
