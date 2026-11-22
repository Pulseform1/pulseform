// Shoots the Duelpoint trailer's scenes into <out>/<scene>/NNNN.jpg.   node shoot.mjs <out> [scene ...]
import { open } from './rig.mjs';
const out = process.argv[2], want = process.argv.slice(3), r = await open(out), on = n => !want.length || want.includes(n);
const OPS = ['vanta', 'nova', 'bastion', 'tessel', 'ember', 'axiom', 'wraith', 'iris', 'talon', 'vex'], GUNS = ['vesper', 'gnat', 'breaker', 'hornet', 'thresher', 'paladin', 'kite', 'longbow', 'lancer', 'mako'];

if (on('lineup')) {   // ten agents in a row at night; the camera trucks past them, low and long-lensed
  const info = await r.run(([OPS, GUNS]) => { const M = match({ mode: 'bot', size: 5, diff: 2, map: 8 }, 'vanta'); T.botMe(2); live(); hud(false); const W = T.GW * 2, Hh = T.GH * 2; let best = null;
    for (let z = 4; z < Hh - 8; z += 1) { let run = 0; for (let x = 3; x < W - 3; x += .5) { const ok = [0, 1.5, 3, 4.5, 6].every(d => open1(x, z + d)) && open1(x, z - .6); run = ok ? run + .5 : 0; if (run >= 17 && (!best || run > best.run)) best = { x1: x, z, run }; } }
    const x0 = best.x1 - best.run + 2.2, z = best.z;
    M.fs.forEach((f, i) => { setOp(f, OPS[i]); f.team = 0; place(f, x0 + i * 1.42, z, Math.PI); gun(f, GUNS[i]); still(f); f.hide = false; });
    window.__L = { x0, z }; cine(t => { const k = ease(t / 4.2), x = lerp(x0 - .7, x0 + 9 * 1.42 - .1, k); return { p: [x - .35, 1.32, z + 3.1], at: [x + .5, 1.12, z], fov: 31 }; });
    return { best, names: M.fs.map(f => T.OPS[f.op].n), cols: M.fs.map(f => T.OPS[f.op].col) }; }, [OPS, GUNS]);
  console.log('lineup', JSON.stringify(info)); await r.idle(.6); await r.shot('lineup', 4.2);
}

// shared staging in the page: open spots round a point, arming everyone, a smooth aim
await r.run(() => {
  window.spots = (cx, cz, r0, r1, n, seed = 1) => { const out = []; let s = seed; const rn = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let k = 0; k < 4000 && out.length < n; k++) { const a = rn() * 6.283, d = r0 + rn() * (r1 - r0), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (x < 2 || z < 2 || x > T.GW * 2 - 2 || z > T.GH * 2 - 2) continue; if (![[0, 0], [.6, 0], [-.6, 0], [0, .6], [0, -.6]].every(([u, v]) => open1(x + u, z + v))) continue; if (out.some(q => Math.hypot(q[0] - x, q[1] - z) < 1.6)) continue; out.push([x, z]); } return out; };
  window.arm = (list) => { const G = ['vesper', 'paladin', 'lancer', 'mako', 'hornet', 'vesper', 'breaker', 'paladin', 'lancer', 'gnat']; T.M.fs.forEach((f, i) => { gun(f, (list || G)[i % 10]); f.sh = 50; f.credits = 5000; f.ab = { c: 2, q: 2, e: 2 }; }); };
  window.gunsOnly = () => { T.M.fs.forEach(f => { f.ab = { c: 0, q: 0, e: 0 }; f.ult = 0; }); T.M.charge = null; };
  window.turnTo = (f, x, y, z, k) => { const dx = x - f.x, dz = z - f.z, dy = y - (f.y + 1.62), wy = Math.atan2(-dx, -dz), wp = Math.atan2(dy, Math.hypot(dx, dz)); let d = wy - f.yaw; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; f.yaw += d * k; f.pitch += (wp - f.pitch) * k; return Math.abs(d) + Math.abs(wp - f.pitch); };
  window.strip = (need, depth) => { const W = T.GW * 2, Hh = T.GH * 2; let best = null; const ds = []; for (let d = 0; d <= depth; d += 1.5) ds.push(d);
    for (let z = 4; z < Hh - depth - 2; z += 1) { let run = 0; for (let x = 3; x < W - 3; x += .5) { const ok = ds.every(d => open1(x, z + d)) && open1(x, z - .6); run = ok ? run + .5 : 0; if (run >= 9 && (!best || run > best.run)) best = { x1: x, z, run, x0: x - run }; } } if (best && best.run < need) console.log('strip: only ' + best.run + ' m of ' + need); return best; };
});

if (on('hero')) {   // the cold open: three agents walk out of the dark toward a low camera that backs away
  await r.run(() => { const M = match({ mode: 'bot', size: 5, diff: 2, map: 8 }, 'vanta'); T.botMe(2); live(); hud(false); const B = strip(17, 6), x0 = B.x0 + 2, z = B.z + 2.6;
    const cast = [['vanta', 0, 0, 'vesper'], ['bastion', -1.5, -1.25, 'breaker'], ['nova', -1.5, 1.25, 'gnat'], ['axiom', -3.1, -2.3, 'paladin'], ['tessel', -3.1, 2.3, 'hornet']];
    M.fs.forEach((f, i) => { if (i < 5) { const c = cast[i]; setOp(f, c[0]); f.team = 0; place(f, x0 + 4 + c[1], z + c[2], -Math.PI / 2); gun(f, c[3]); act(f, (f, dt, I) => { I.mz = 1; I.walk = true; return I; }); } else { place(f, 4, 4, 0); f.hide = true; still(f); } });
    cine(t => { const lead = F(0), k = ease(t / 2.4); return { p: [lead.x + 3.3 - k * .5, .5 + k * .25, lead.z + .7 - k * .5], at: [lead.x, 1.25, lead.z], fov: 44 }; }); });
  await r.idle(.5); await r.shot('hero', 2.4);
}
const MAPSHOTS = [[3, 'DUNEWATCH', 1], [4, 'OVERGROWTH', -1], [5, 'FOUNDRY', 1], [6, 'ORBITAL', -1], [2, 'FROSTLINE', 1]];
for (let k = 0; k < MAPSHOTS.length; k++) if (on('maps')) {   // a quick tour: a crane move over each site with a fight breaking out on it
  const [mi, , dir] = MAPSHOTS[k];
  await r.run(([mi, dir, k]) => { const M = match({ mode: 'bot', size: 5, diff: 2, map: mi }, 'vanta'); T.botMe(2); live(); hud(false); arm(); gunsOnly(); const s = T.siteC, A = spots(s[0], s[1], 0, 5, 5, 3 + k), Bq = spots(s[0], s[1], 7, 12, 5, 11 + k);
    M.fs.forEach((f, i) => { const q = (f.team === 0 ? A : Bq)[f.team === 0 ? M.fs.filter(g => g.team === 0).indexOf(f) : M.fs.filter(g => g.team === 1).indexOf(f)] || [s[0], s[1]]; place(f, q[0], q[1], Math.random() * 6); f.hide = false; });
    const a0 = .7 + k * 1.3; cine(t => { const u = t / 1.1, a = a0 + dir * u * .32; return { p: [s[0] + Math.cos(a) * lerp(19, 15, u), lerp(10.5, 7.5, u), s[1] + Math.sin(a) * lerp(19, 15, u)], at: [s[0], 1, s[1]], fov: 44 }; }); }, [mi, dir, k]);
  await r.idle(.45); await r.shot('map' + k, 1.1);
}
if (on('fight')) {   // first person, HUD on: a rifle spray drops two rivals (the kill banner counts them)
  await r.run(() => { const M = match({ mode: 'bot', size: 5, diff: 2, map: 7 }, 'vanta'); T.botMe(2); live(); hud(true); cine(null); arm(); gunsOnly(); const B = strip(24, 6), x0 = B.x0 + 2, z = B.z, P = F(0);
    place(P, x0, z + 3, -Math.PI / 2); gun(P, 'vesper'); const foes = M.fs.filter(f => f.team !== P.team), mates = M.fs.filter(f => f.team === P.team && f !== P);
    mates.forEach((f, i) => { place(f, x0 - 3 - i * 1.5, z + 1 + (i % 2) * 3, -Math.PI / 2); still(f); });
    foes.forEach((f, i) => { if (i < 2) { place(f, x0 + 8 + i * 2.5, z + 1.6 + i * 2.8, Math.PI / 2); f.hp = 100; f.sh = 0; gun(f, 'mako'); const s0 = i ? -1 : 1; act(f, (f, dt, I) => { I.mx = Math.sin(T.M.time * 2.2 + i * 2) > 0 ? s0 : -s0; return I; }); } else { place(f, 4, 4, 0); f.hide = true; still(f); } });
    let tgt = 0, hold = 0; act(P, (f, dt, I) => { const live2 = foes.slice(0, 2).filter(q => q.alive); if (!live2.length) { hold += dt; return I; } const q = live2[0], off = turnTo(f, q.x, q.y + 1.5, q.z, Math.min(1, dt * 9)); hold += dt; I.fire = hold > .4 && off < .06; I.rapid = I.fire; return I; }); });
  await r.idle(.3); await r.shot('fight', 3.2);
}
if (on('sniper')) {   // first person: scope in, one shot, one headshot
  await r.run(() => { const M = match({ mode: 'bot', size: 5, diff: 2, map: 3 }, 'iris'); T.botMe(2); live(); hud(true); cine(null); arm(); gunsOnly(); const B = strip(26, 4), x0 = B.x0 + 1.5, z = B.z, P = F(0);
    place(P, x0, z + 2, -Math.PI / 2); gun(P, 'longbow'); const foes = M.fs.filter(f => f.team !== P.team);
    M.fs.forEach(f => { if (f !== P && f !== foes[0]) { place(f, 4, 4, 0); f.hide = true; still(f); } });
    const q = foes[0]; place(q, x0 + Math.min(23, B.run - 3.5), z + 1.2, Math.PI / 2); q.hp = 100; q.sh = 0; act(q, (f, dt, I) => { I.mx = 1; I.walk = true; return I; });
    let t = 0, shot = false; aimAt(P, q.x - 2.5, q.y + 1.2, q.z + 1.5); act(P, (f, dt, I) => { t += dt; if (t > .25) f.scoped = 1; if (q.alive) { const off = turnTo(f, q.x, q.y + 1.58, q.z, Math.min(1, dt * (t > .5 ? 7 : 2))); if (t > 1.05 && off < .01 && !shot) { I.fire = true; shot = true; } } return I; }); });
  await r.idle(.2); await r.shot('sniper', 2.2);
}
if (on('rampart')) {   // Bastion throws up a Rampart; rifle fire cracks it
  await r.run(() => { const M = match({ mode: 'bot', size: 5, diff: 2, map: 0 }, 'bastion'); T.botMe(2); live(); hud(false); arm(); const B = strip(20, 6), x0 = B.x0 + 3, z = B.z + 3, P = F(0), foes = M.fs.filter(f => f.team !== P.team);
    setOp(P, 'bastion'); place(P, x0, z, -Math.PI / 2); gun(P, 'breaker'); P.ab = { c: 2, q: 2, e: 2 }; P.pitch = -.12;
    M.fs.forEach(f => { if (f !== P && !foes.slice(0, 2).includes(f)) { place(f, 4, 4, 0); f.hide = true; still(f); } });
    foes.slice(0, 2).forEach((f, i) => { place(f, x0 + 13 + i, z - 1.3 + i * 2.6, Math.PI / 2); gun(f, i ? 'paladin' : 'vesper'); act(f, (f, dt, I) => { turnTo(f, x0 + 4, 1.2, z + (i ? .5 : -.5), 1); I.fire = T.M.time > window.__t0 + .5; I.rapid = I.fire; return I; }); });
    window.__t0 = T.M.time; let cast = false; act(P, (f, dt, I) => { if (!cast && T.M.time > window.__t0 + .12) { cast = true; T.kit().ability(f, 'q', false); } const w = T.M.walls.find(w => w.hp != null); if (w && T.M.time > window.__t0 + .6) w.hp = Math.max(40, w.hp - dt * 330); I.crouch = T.M.time > window.__t0 + .7; return I; });
    cine(t => { const k = ease(t / 1.5); return { p: [x0 - 2.2 + k * .5, 1.5 - k * .3, z + 2.6 - k * .5], at: [x0 + 4.5, 1.25, z - .2], fov: 46 }; }); });
  await r.shot('rampart', 1.5);
}
if (on('sentry')) {   // Axiom's Sentry locks on and opens up on a rival crossing its arc
  await r.run(() => { const M = match({ mode: 'bot', size: 5, diff: 2, map: 7 }, 'axiom'); T.botMe(2); live(); hud(false); arm(); const B = strip(20, 6), x0 = B.x0 + 3, z = B.z + 3, P = F(0), foes = M.fs.filter(f => f.team !== P.team);
    setOp(P, 'axiom'); place(P, x0, z, -Math.PI / 2); gun(P, 'paladin'); P.ab = { c: 2, q: 2, e: 2 }; P.pitch = -.35;
    M.fs.forEach(f => { if (f !== P && f !== foes[0]) { place(f, 4, 4, 0); f.hide = true; still(f); } });
    T.kit().ability(P, 'q', false); const s = M.kit.sentries[0]; window.__s = s ? [s.x, s.z] : null; place(P, x0 - 1.2, z + 1.4, -Math.PI / 2); still(P); P.pitch = 0;
    const q = foes[0]; place(q, x0 + 9, z - 2.4, Math.PI / 2); q.hp = 100; q.sh = 100; gun(q, 'vesper'); act(q, (f, dt, I) => { f.yaw = Math.PI; I.mz = 1; I.walk = true; if (f.hp < 30) f.hp = 30; return I; });
    const sx = s ? s.x : x0 + 2, sz = s ? s.z : z; cine(t => { const k = ease(t / 1.5); return { p: [sx - 1.7 + k * .3, 1.25, sz + 1.1 - k * .2], at: [sx + 4, .95, sz - .6 + k * .8], fov: 46 }; }); return !!s; });
  await r.idle(.1); await r.shot('sentry', 1.5);
}
if (on('glass')) {   // Tessel's Glasshouse rises round three rivals
  await r.run(() => { const M = match({ mode: 'bot', size: 5, diff: 2, map: 10 }, 'tessel'); T.botMe(2); live(); hud(false); arm(); const B = strip(16, 12) || strip(16, 9), x0 = B.x0 + 8, z = B.z + 5, P = F(0), foes = M.fs.filter(f => f.team !== P.team);
    setOp(P, 'tessel'); place(P, x0 - 5, z + 5.5, 0); gun(P, 'hornet'); P.ult = 9; M.fs.forEach(f => { if (f !== P && !foes.slice(0, 3).includes(f)) { place(f, 4, 4, 0); f.hide = true; still(f); } });
    foes.slice(0, 3).forEach((f, i) => { place(f, x0 - 1.4 + i * 1.5, z - 1 + (i % 2) * 2, Math.PI * .8); act(f, (f, dt, I) => { turnTo(f, P.x, 1.4, P.z, .2); I.mx = Math.sin(T.M.time * 3 + i) > 0 ? 1 : -1; I.walk = true; return I; }); });
    aimAt(P, x0, 0, z); window.__t0 = T.M.time; let cast = false; act(P, (f, dt, I) => { aimAt(f, x0, 0, z); if (!cast && T.M.time > window.__t0 + .4) { cast = true; window.__ok = T.kit().ability(f, 'x', false); } return I; });
    cine(t => { const k = ease(t / 1.8); return { p: [x0 - 6.5 + k * 1.5, 7.5 + k * 1.5, z + 9.5 - k * 1.5], at: [x0, .6, z], fov: 50 }; }); });
  await r.shot('glass', 1.8); console.log('glass cast', await r.run(() => [window.__ok, T.M.kit.houses.length]));
}
if (on('fire')) {   // Ember's Ignite: a firebomb bursts into a pool of flame under two rivals
  await r.run(() => { const M = match({ mode: 'bot', size: 5, diff: 2, map: 12 }, 'ember'); T.botMe(2); live(); hud(false); arm(); const B = strip(18, 6), x0 = B.x0 + 3, z = B.z + 3, P = F(0), foes = M.fs.filter(f => f.team !== P.team);
    setOp(P, 'ember'); place(P, x0, z, -Math.PI / 2); gun(P, 'thresher'); P.ab = { c: 2, q: 2, e: 2 }; M.fs.forEach(f => { if (f !== P && !foes.slice(0, 2).includes(f)) { place(f, 4, 4, 0); f.hide = true; still(f); } });
    foes.slice(0, 2).forEach((f, i) => { place(f, x0 + 9 + i * 1.3, z - .8 + i * 1.6, Math.PI / 2); f.hp = 100; f.sh = 100; act(f, (f, dt, I) => { if (T.M.kit.fires.length) { f.yaw = i ? Math.PI : 0; I.mz = 1; } if (f.hp < 25) f.hp = 25; return I; }); });
    aimAt(P, x0 + 9.5, .4, z); window.__t0 = T.M.time; let cast = false; act(P, (f, dt, I) => { if (!cast && T.M.time > window.__t0 + .1) { cast = true; window.__ok = T.kit().ability(f, 'q', false); } return I; });
    cine(t => { const k = ease(t / 1.6); return { p: [x0 + 4.2 + k * .8, 1.0 + k * .2, z + 3.6 - k * .4], at: [x0 + 9.4, .9, z], fov: 48 }; }); });
  await r.shot('fire', 1.6); console.log('fire', await r.run(() => [window.__ok, T.M.kit.fires.length, T.M.kit.bombs.length]));
}
if (on('boom')) {   // the charge is down: the last beeps, then the blast, as the attackers run for it
  await r.run(() => { const M = match({ mode: 'bot', size: 5, diff: 2, map: 5 }, 'vanta'); T.botMe(2); live(); hud(false); arm(); const s = T.siteC, q0 = spots(s[0], s[1], 0, 2.5, 1, 4)[0] || s, P = F(0);
    T.plantAt(q0[0], q0[1], P); M.planted.t = 1.25; const run = spots(q0[0], q0[1], 2.5, 5, 3, 9), ang = Math.atan2(run[0][1] - q0[1], run[0][0] - q0[0]);
    M.fs.forEach((f, i) => { if (i < 3 && run[i]) { place(f, run[i][0], run[i][1], 0); f.team = 0; f.yaw = yawTo(q0[0], q0[1], run[i][0], run[i][1]); act(f, (f, dt, I) => { I.mz = 1; return I; }); f.hp = 100; } else { place(f, 4, 4, 0); f.hide = true; still(f); } });
    cine(t => { const k = ease(t / 2); return { p: [q0[0] + Math.cos(ang) * (7 + k * 3), 1.1 + k * 1.6, q0[1] + Math.sin(ang) * (7 + k * 3)], at: [q0[0], 1 + k, q0[1]], fov: 52 }; }); });
  await r.shot('boom', 2.0);
}
if (on('clash')) {   // five against five: both teams meet on a site, the camera sweeping in over them
  await r.run(() => { const M = match({ mode: 'bot', size: 5, diff: 2, map: 7 }, 'vanta'); T.botMe(2); live(); hud(false); arm(); gunsOnly(); const s = T.siteC, A = spots(s[0], s[1], 0, 4.5, 5, 21), Bq = spots(s[0], s[1], 7, 11, 5, 5);
    let a = 0, b = 0; M.fs.forEach(f => { const q = f.team === 0 ? A[a++] : Bq[b++]; if (q) place(f, q[0], q[1], Math.random() * 6); f.hide = false; f.hp = 100; f.sh = 50; });
    cine(t => { const u = t / 2.6, an = 1.2 + u * .45; return { p: [s[0] + Math.cos(an) * lerp(17, 13.5, ease(u)), lerp(11, 8.5, ease(u)), s[1] + Math.sin(an) * lerp(17, 13.5, ease(u))], at: [s[0], 1, s[1]], fov: 46 }; }); });
  await r.idle(.35); await r.shot('clash', 2.6);
}
if (on('title')) {   // behind the title: a slow orbit over the rooftops at night
  await r.run(() => { const M = match({ mode: 'bot', size: 5, diff: 2, map: 8 }, 'vanta'); T.botMe(2); live(); hud(false); const s = T.siteC; M.fs.forEach(f => { place(f, 4, 4, 0); f.hide = true; still(f); });
    cine(t => { const an = .9 + t * .07; return { p: [s[0] + Math.cos(an) * 30, 15 - t * .5, s[1] + Math.sin(an) * 30], at: [s[0], 3, s[1]], fov: 52 }; }); });
  await r.idle(.3); await r.shot('title', 4.6);
}
console.log('errors', r.errs.length); await r.close();
