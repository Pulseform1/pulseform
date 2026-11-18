/* ARROWWOOD shared world: The King's Wood map, movement, arrow flight, swept collision, hitboxes and damage.
   Pure JavaScript with no DOM: the authoritative server (server/engine.js, run by Cloudflare or Node) and the browser
   (aim preview, movement prediction, the practice range) run this same file, so a shot flies the same everywhere.
   Units are metres and seconds. X runs east, Z runs south, Y is up. The map is 140 x 140 and point-symmetric about its
   centre (70, 70): turning it half a circle swaps the two teams' halves, so neither side has the better ground. */

export const MAP_SIZE = 140, MIN = 6, MAX = 134, CX = 70, CZ = 70;
export const GRAV = 9.81;
// ---- the bow: every bow skin has exactly these numbers
export const BOW = {
  vMin: 13, vMax: 68,          // launch speed (m/s): a quick tap lobs at vMin, a full draw flies at vMax
  fullDraw: .9,                // seconds to reach a full draw
  nock: .5,                    // seconds after a release before the next arrow is on the string
  startArrows: 6, maxArrows: 9, bundle: 3,
};
export const drawPower = t => Math.max(0, Math.min(1, t / BOW.fullDraw));
export const launchSpeed = p => BOW.vMin + (BOW.vMax - BOW.vMin) * (1 - (1 - p) * (1 - p));   // rises quickly, then settles into a full draw
// damage: by where it lands and how fast it was still going. A full-draw headshot ends it; a strong body hit takes two;
// a weak lob or a leg hit only wounds. In one-shot rules any hit eliminates.
export const ZONES = { head: 115, body: 62, legs: 34 };
export function damageFor(zone, speed, oneShot) {
  if (oneShot) return 999;
  const f = Math.max(.16, Math.min(1, .16 + .84 * (speed - BOW.vMin) / (BOW.vMax - BOW.vMin)));
  return Math.round(ZONES[zone] * f);
}
// ---- the player body
export const PL = { r: .34, h: 1.8, hCrouch: 1.25, eye: 1.62, eyeCrouch: 1.12, step: .48, walk: 4.4, sprint: 6.6, crouch: 2.3, aim: 2.7, jump: 4.6, grav: 18, waterMul: .68 };
export const eyeHeight = crouch => crouch ? PL.eyeCrouch : PL.eye;

// ---- deterministic noise
function hash2(i, j) { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, z) {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
export function rng(seed) { let s = seed >>> 0; return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rot = (x, z) => [MAP_SIZE - x, MAP_SIZE - z];   // the half-turn that swaps the teams' halves

// ---- the creek: a shallow stream meandering west to east through the middle
export const creekZ = x => CZ + 5 * Math.sin((x - CX) * .06);
export const CREEK_W = 2.5;
// rolling hills: [x, z, height, radius] on the south half, turned for the north (so neither side has the better ground).
// Split Oak's rise and the tower mound are the tall ones; the camps sit on flat terraces; the long lane down the middle stays low.
const HILLS_HALF = [
  [26, 80, 3.6, 11], [46, 101, 3.4, 9], [97, 106, 3.2, 10], [24, 114, 3.6, 12], [116, 116, 3.2, 12], [84, 90, 1.8, 7],
  [54, 88, 1.6, 6], [12, 94, 2.8, 9], [128, 94, 2.6, 9], [42, 124, 2.2, 8], [100, 126, 2.4, 8], [36, 72, 1.8, 7],
];
const knolls = [];
for (const [x, z, h, r] of HILLS_HALF) { knolls.push([x, z, h, r]); const [rx, rz] = rot(x, z); knolls.push([rx, rz, h, r]); }
const CAMPS = [[70, 124], [70, 16]];
function baseH(x, z) {
  const f = (x, z) => 2.1 * vnoise(x * .05, z * .05) + .6 * vnoise(x * .12 + 7, z * .12 + 3) + .1 * vnoise(x * .4, z * .4);
  const [rx, rz] = rot(x, z);
  let h = (f(x, z) + f(rx, rz)) * .5 - 1.2;
  for (const [kx, kz, kh, kr] of knolls) { const d2 = ((x - kx) ** 2 + (z - kz) ** 2) / (kr * kr); h += kh * 1.3 * Math.exp(-d2 * 1.4); }
  // the lane down the middle (camp to bridge) stays low and the camps are flat terraces
  const lane = 1 - sstep(3, 9, Math.abs(x - CX)); h -= lane * Math.max(0, h - .15) * .75;
  for (const [cx, cz] of CAMPS) { const k = 1 - sstep(9, 15, Math.hypot(x - cx, z - cz)); h = h * (1 - k) + .25 * k; }
  // the edges rise into banks of earth so the wood closes in
  const e = Math.max(0, Math.max(MIN + 2 - x, x - MAX + 2, MIN + 2 - z, z - MAX + 2));
  return h + e * e * .12;
}
export function creekDist(x, z) { return Math.abs(z - creekZ(x)) / Math.sqrt(1 + (.3 * Math.cos((x - CX) * .06)) ** 2); }
export function terrainH(x, z) {
  const d = creekDist(x, z), b = baseH(x, z);
  const carve = d < CREEK_W ? 1.55 : 1.55 * (1 - sstep(CREEK_W, 6.8, d));
  return b - carve;
}
export const waterY = x => baseH(x, creekZ(x)) - 1.55 + .42;
export const inWater = (x, z, y) => creekDist(x, z) < CREEK_W + 1.2 && y < waterY(x) - .05;

/* ---------- static geometry ----------
   TREES: trunks (vertical cylinders) {x, z, r, h, lean?}. Branches and leaves let arrows through.
   BOXES: oriented boxes turned about Y {x, z, hx, hz, a, y0, y1, mat}: walls, logs, rocks, the bridge, the tower.
   A box's top is ground you can stand on; a box taller than a step blocks you while you overlap it in height. */
export const TREES = [], BOXES = [], PROPS = [], BUSHES = [];
const SEAT = new Set(['wall', 'log', 'rock', 'tower', 'rubble']);
const box = (x, z, hx, hz, a, y0, y1, mat, kind) => {
  const b = { x, z, hx, hz, a, c: Math.cos(a), s: Math.sin(a), y0, y1, mat, kind: kind || mat };
  // on a hillside a wall, log or rock reaches down to the lowest ground under it, so nothing floats
  if (SEAT.has(b.kind)) for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]) { const lx = u * hx, lz = v * hz, wx = x + lx * b.c + lz * b.s, wz = z - lx * b.s + lz * b.c; b.y0 = Math.min(b.y0, terrainH(wx, wz) - .25); }
  BOXES.push(b); return b;
};
const both = fn => { fn((x, z) => [x, z], 0); fn((x, z) => rot(x, z), Math.PI); };   // place something and its half-turn twin
const gnd = (x, z) => terrainH(x, z);

// The Stone Bridge: an arched deck over the creek on the centre line, low parapets for cover. You can wade under it.
(function bridge() {
  const n = 9, len = 15, z0 = CZ - len / 2, bank = gnd(CX, z0) * .5 + gnd(CX, z0 + len) * .5;
  for (let k = 0; k < n; k++) {
    const zc = z0 + (k + .5) * len / n, u = (k + .5) / n, arch = Math.sin(u * Math.PI);
    const top = Math.max(gnd(CX, zc), bank) * (1 - arch) + (bank + 1.35) * arch + .05;
    box(CX, zc, 1.7, len / n / 2 + .02, 0, top - .45, top, 'stone', 'deck');
    for (const sx of [-1, 1]) box(CX + sx * 1.62, zc, .14, len / n / 2 + .02, 0, top, top + .92, 'stone', 'parapet');
  }
  PROPS.push({ t: 'bridge', x: CX, z: CZ, len, bank });
})();

// The Old Tower: a ruined forester's watchtower north-east of the creek. Stairs inside climb to a platform with cover.
// Split Oak: a giant oak split in two on a rocky knoll south-west of the creek, with a ledge to shoot from.
const TOWER = { x: 114, z: 60, s: 3.6, wall: .45 };
(function tower() {
  const { x, z, s, wall } = TOWER, g0 = gnd(x, z) - .2, top = g0 + 6.2, plat = g0 + 3.3;
  // four walls with a doorway facing the creek (south-west) and a breach on the east
  box(x, z - s, s + wall, wall, 0, g0, top, 'stone', 'tower');                    // north
  box(x - s, z - 1.6, wall, 2.0 + wall, 0, g0, top - .6, 'stone', 'tower');        // west, north half
  box(x - s, z + s - .5, wall, .5 + wall, 0, g0, top - 1.2, 'stone', 'tower');     // west, south stub (doorway between)
  box(x - s, z + .9, wall, .62, 0, g0 + 2.4, top - 1.6, 'stone', 'tower');         // lintel over the door
  box(x + s, z - 1.2, wall, 2.4 + wall, 0, g0, top - .3, 'stone', 'tower');        // east, with a breach to the south
  box(x + s, z + s - .2, wall, .2 + wall, 0, g0, g0 + 1.1, 'stone', 'rubble');
  box(x + 1.4, z + s, 2.2 + wall, wall, 0, g0, top - 1.8, 'stone', 'tower');       // south, broken low on the west
  box(x - 2.2, z + s, 1.0, wall, 0, g0, g0 + 1.3, 'stone', 'rubble');
  // stairs up the inside of the north wall (west to east), then the platform over the east half
  for (let k = 0; k < 8; k++) { const sx = x - s + .9 + k * .62; box(sx, z - s + 1.05, .31, .6, 0, g0, g0 + .42 * (k + 1), 'wood', 'stair'); }
  box(x + 1.1, z - .2, 2.1, 2.9, 0, plat - .25, plat, 'wood', 'floor');
  // crenellations around the platform (cover up top), broken in places
  PROPS.push({ t: 'tower', x, z, s, wall, g0, top, plat });
  // the outpost around it: broken walls, a woodpile, a collapsed shed
  box(x - 9, z + 7, 3.2, .35, .35, gnd(x - 9, z + 7) - .2, gnd(x - 9, z + 7) + 1.25, 'stone', 'wall');
  box(x - 2, z + 11, .35, 2.6, 0, gnd(x - 2, z + 11) - .2, gnd(x - 2, z + 11) + 1.6, 'stone', 'wall');
  box(x + 7, z + 6, 2.4, .35, -.2, gnd(x + 7, z + 6) - .2, gnd(x + 7, z + 6) + 1.1, 'stone', 'wall');
  box(x - 6, z - 7, .35, 2.2, .15, gnd(x - 6, z - 7) - .2, gnd(x - 6, z - 7) + 1.4, 'stone', 'wall');
})();
const SPLIT = { x: 26, z: 80 };
(function splitOak() {
  const { x, z } = SPLIT, g = gnd(x, z);
  TREES.push({ x: x - .9, z, r: .62, h: 11, lean: [-.16, .05], kind: 'split' }, { x: x + .9, z: z + .2, r: .58, h: 10, lean: [.18, -.04], kind: 'split' });
  // rock ledges on the knoll: high ground with a lip to crouch behind
  box(x + 5.5, z - 3, 2.6, 1.6, .4, g - 1, g + 1.15, 'stone', 'rock');
  box(x + 6.6, z - 4.6, 1.8, .3, .4, g + 1.1, g + 1.75, 'stone', 'rock');
  box(x - 6, z + 2.5, 2, 1.4, -.3, g - 1, g + .9, 'stone', 'rock');
  box(x + 1, z + 6, 3.4, .45, 1.2, g - .3, g + .75, 'wood', 'log');   // the half of the oak that fell
  PROPS.push({ t: 'split', x, z, g });
})();

// Camps: protected spawns behind ruined walls, three ways out. Defined for the south (Moss) camp, turned for the north.
(function camps() {
  both((P, a) => {
    const w = (x, z, hx, hz, an, hgt) => { const [px, pz] = P(x, z); box(px, pz, hx, hz, an, gnd(px, pz) - .3, gnd(px, pz) + hgt, 'stone', 'wall'); };
    w(62, 118, 3.4, .4, 0, 1.9); w(78, 118, 3.4, .4, 0, 1.9);            // the camp's front wall, a gap in the middle
    w(56.5, 122, .4, 3, 0, 1.7); w(83.5, 122, .4, 3, 0, 1.7);           // side walls, open behind
    const lg = (x, z, an) => { const [px, pz] = P(x, z); box(px, pz, 2.6, .38, an, gnd(px, pz) - .2, gnd(px, pz) + .8, 'wood', 'log'); };
    lg(70, 112, .1); lg(52, 112, -.5); lg(88, 112, .6);
  });
})();

// Cover through the wood: broken walls, fallen logs and rocks, placed on the south half and turned for the north.
(function cover() {
  both(P => {
    const W = (x, z, hx, an, hgt) => { const [px, pz] = P(x, z); box(px, pz, hx, .38, an, gnd(px, pz) - .3, gnd(px, pz) + hgt, 'stone', 'wall'); };
    const L = (x, z, hx, an) => { const [px, pz] = P(x, z); box(px, pz, hx, .4, an, gnd(px, pz) - .25, gnd(px, pz) + .82, 'wood', 'log'); };
    const R = (x, z, s, hgt, an) => { const [px, pz] = P(x, z); box(px, pz, s, s * .75, an, gnd(px, pz) - .6, gnd(px, pz) + hgt, 'stone', 'rock'); };
    // near the bridge: banks with low walls (the long lane down the creek)
    W(61, 80, 2.4, .1, 1.15); W(80, 79, 2.2, -.15, 1.2); L(56, 86, 2.8, .4); R(85, 86, 1.3, 1.1, .3);
    // the mid wood between camp and creek
    W(66, 98, 2.6, 0, 1.5); W(76, 101, .38, 0, 1.6); L(58, 102, 3, -.2); L(83, 96, 2.6, .7); R(49, 92, 1.5, 1.3, .5); R(92, 104, 1.2, 1.5, 1.1);
    // the west flank toward Split Oak and the east flank toward the tower
    W(38, 94, 2.2, .8, 1.4); L(34, 104, 3, 1.3); R(18, 96, 1.6, 1.4, .2); W(42, 82, .38, 0, 1.3); L(14, 82, 2.6, 1.6);
    W(101, 90, 2.4, -.6, 1.4); L(108, 98, 2.8, .3); R(118, 88, 1.4, 1.2, .7); L(124, 76, 2.4, 1.5); W(100, 78, .38, .2, 1.2);
    // ruined outpost walls in the mid-field (the forester's old fence line)
    W(48, 116, 2.2, .3, 1.2); W(94, 115, 2.4, -.3, 1.3); L(26, 116, 2.8, .2); L(114, 112, 2.8, -.2); R(32, 126, 1.6, 1.4, 0); R(108, 126, 1.6, 1.4, 0);
  });
})();

// arrow pickups (a bundle of three) in exposed spots, and named areas for callouts
export const PICKUPS = [];
both(P => { for (const [x, z] of [[56, 75], [37, 97], [97, 104]]) { const [px, pz] = P(x, z); PICKUPS.push({ x: px, z: pz, y: terrainH(px, pz) }); } });
export const SPAWNS = { 0: [[70, 126], [64, 128], [76, 128], [70, 131]], 1: [[70, 14], [76, 12], [64, 12], [70, 9]] };
export const SPAWN_YAW = { 0: 0, 1: Math.PI };   // yaw 0 looks north (-Z)
// free-for-all spawns: spread around the whole wood
export const FFA_SPAWNS = [];
both(P => { for (const [x, z] of [[70, 126], [30, 126], [110, 124], [14, 100], [44, 96], [96, 98], [124, 90], [52, 78], [86, 82], [20, 72]]) FFA_SPAWNS.push(P(x, z)); });
// Trees: groves of tall old trees standing close, so their crowns meet overhead and shade the ground; open meadows with
// nothing but grass and the odd bush; a few lone trees in between. Placed on the south half and turned for the north.
export const GROVES = [], MEADOWS = [];
{ const G = [[30, 101, 13], [105, 101, 12], [51, 117, 8.5], [119, 121, 9], [12, 121, 8], [88, 88, 6.5]], Mw = [[70, 98, 12], [44, 83, 7], [96, 83, 7], [70, 123, 12], [124, 82, 7]];
  for (const [x, z, r] of G) { GROVES.push({ x, z, r }); const [a, b] = rot(x, z); GROVES.push({ x: a, z: b, r }); }
  for (const [x, z, r] of Mw) { MEADOWS.push({ x, z, r }); const [a, b] = rot(x, z); MEADOWS.push({ x: a, z: b, r }); } }
export const inGrove = (x, z, pad = 0) => GROVES.some(g => Math.hypot(x - g.x, z - g.z) < g.r + pad);
export const inMeadow = (x, z, pad = 0) => MEADOWS.some(m => Math.hypot(x - m.x, z - m.z) < m.r + pad);
(function trees() {
  const R = rng(1187), keepOut = (x, z) => {
    if (creekDist(x, z) < CREEK_W + 2.2) return true;
    if (Math.abs(x - CX) < 4.5 && Math.abs(z - CZ) < 12) return true;              // the bridge and its approaches
    if (Math.hypot(x - SPLIT.x, z - SPLIT.z) < 8) return true;
    if (Math.hypot(x - TOWER.x, z - TOWER.z) < 9) return true;
    const [rx, rz] = rot(x, z); if (Math.hypot(rx - SPLIT.x, rz - SPLIT.z) < 8 || Math.hypot(rx - TOWER.x, rz - TOWER.z) < 9) return true;
    if (Math.abs(x - CX) < 2.6 && z > 86 && z < 112) return true;                   // the long north-south lane stays open
    if (Math.hypot(x - 70, z - 124) < 9) return true;                               // the camp
    if (inMeadow(x, z, 1)) return true;
    if (PICKUPS.some(k => Math.hypot(k.x - x, k.z - z) < 2.6) || FFA_SPAWNS.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 2.4)) return true;
    return BOXES.some(b => Math.abs(x - b.x) < b.hx + 2.2 && Math.abs(z - b.z) < b.hx + 2.2);
  };
  const half = [];
  // the groves first: tall trunks about five metres apart
  for (let n = 0; n < 2400; n++) {
    const x = MIN + 2 + R() * (MAX - MIN - 4), z = CZ + 1 + R() * (MAX - CZ - 3);
    if (!inGrove(x, z) || keepOut(x, z) || half.some(t => Math.hypot(t.x - x, t.z - z) < 4.7)) continue;
    half.push({ x, z, r: .44 + R() * .2, h: 12 + R() * 4, lean: [(R() - .5) * .06, (R() - .5) * .06], kind: 'tall', seed: (R() * 1e6) | 0 });
  }
  // then a scatter of smaller trees across the rest (never in a meadow)
  let lone = 0;
  for (let n = 0; n < 1200 && lone < 24; n++) {
    const x = MIN + 2 + R() * (MAX - MIN - 4), z = CZ + 1 + R() * (MAX - CZ - 3);
    if (inGrove(x, z, 2) || keepOut(x, z) || half.some(t => Math.hypot(t.x - x, t.z - z) < 8)) continue;
    const big = R() < .25, r = big ? .42 + R() * .12 : .28 + R() * .1; lone++;
    half.push({ x, z, r, h: big ? 8 + R() * 2 : 5.5 + R() * 2, lean: [(R() - .5) * .08, (R() - .5) * .08], kind: big ? 'oak' : 'oak2', seed: (R() * 1e6) | 0 });
  }
  for (const t of half) { TREES.push(t); const [x, z] = rot(t.x, t.z); TREES.push({ ...t, x, z, lean: [-t.lean[0], -t.lean[1]], seed: t.seed + 1 }); }
  // bushes: round shrubs to crouch behind (you can see and shoot through them, but they break up your outline); few in the meadows
  const B = rng(2207), bh = [];
  for (let n = 0; n < 1600 && bh.length < 80; n++) {
    const x = MIN + 1 + B() * (MAX - MIN - 2), z = CZ + 4 + B() * (MAX - CZ - 5);
    if (creekDist(x, z) < CREEK_W + 1) continue;
    if (Math.abs(x - CX) < 2.2 && z > 80) continue;
    if (Math.hypot(x - 70, z - 124) < 6) continue;
    if (inMeadow(x, z) && B() < .75) continue;
    if (TREES.some(t => Math.hypot(t.x - x, t.z - z) < t.r + .9)) continue;
    if (BOXES.some(b => { const dx = x - b.x, dz = z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; return Math.abs(lx) < b.hx + .7 && Math.abs(lz) < b.hz + .7; })) continue;
    if (bh.some(q => Math.hypot(q.x - x, q.z - z) < 2.6)) continue;
    bh.push({ x, z, r: .55 + B() * .55, seed: (B() * 1e6) | 0 });
  }
  for (const q of bh) { BUSHES.push(q); const [x, z] = rot(q.x, q.z); BUSHES.push({ ...q, x, z, seed: q.seed + 1 }); }
})();

export const ZONE = { x: CX, z: CZ, r: 9, name: 'Stone Bridge' };
export const AREAS = [
  { n: 'Stone Bridge', x: CX, z: CZ, r: 14 }, { n: 'Split Oak', x: SPLIT.x, z: SPLIT.z, r: 14 }, { n: 'Old Tower', x: TOWER.x, z: TOWER.z, r: 14 },
  { n: 'Moss Camp', x: 70, z: 124, r: 15 }, { n: 'Russet Camp', x: 70, z: 16, r: 15 },
];
export function areaName(x, z) {
  for (const a of AREAS) if (Math.hypot(x - a.x, z - a.z) < a.r) return a.n;
  if (creekDist(x, z) < 6) return 'the Creek';
  return (z < CZ ? 'North' : 'South') + (x < 47 ? '-west' : x > 93 ? '-east' : '') + ' woods';
}
export const gridRef = (x, z) => 'ABCDEFG'[Math.max(0, Math.min(6, Math.floor(x / 20)))] + (Math.max(0, Math.min(6, Math.floor(z / 20))) + 1);
export const TEAMS = [{ n: 'Moss', col: '#7fae5a' }, { n: 'Russet', col: '#c7743e' }];

// ---- a coarse grid over the map so movement and arrows only test what is nearby
const CELL = 10, GN = Math.ceil(MAP_SIZE / CELL), GRID = Array.from({ length: GN * GN }, () => ({ t: [], b: [] }));
for (const [i, t] of TREES.entries()) { const gx = Math.floor(t.x / CELL), gz = Math.floor(t.z / CELL); for (let a = gx - 1; a <= gx + 1; a++) for (let c = gz - 1; c <= gz + 1; c++) if (a >= 0 && c >= 0 && a < GN && c < GN) GRID[c * GN + a].t.push(i); }
for (const [i, b] of BOXES.entries()) {
  const ext = Math.hypot(b.hx, b.hz) + 1, x0 = Math.floor((b.x - ext) / CELL), x1 = Math.floor((b.x + ext) / CELL), z0 = Math.floor((b.z - ext) / CELL), z1 = Math.floor((b.z + ext) / CELL);
  for (let a = x0; a <= x1; a++) for (let c = z0; c <= z1; c++) if (a >= 0 && c >= 0 && a < GN && c < GN) GRID[c * GN + a].b.push(i);
}
function near(x, z) { const gx = Math.max(0, Math.min(GN - 1, Math.floor(x / CELL))), gz = Math.max(0, Math.min(GN - 1, Math.floor(z / CELL))); return GRID[gz * GN + gx]; }
const local = (b, x, z) => { const dx = x - b.x, dz = z - b.z; return [dx * b.c - dz * b.s, dx * b.s + dz * b.c]; };   // into the box's own frame
const world = (b, lx, lz) => [b.x + lx * b.c + lz * b.s, b.z - lx * b.s + lz * b.c];

// ---- standing and walking
export function groundAt(x, z, y) {
  let g = terrainH(x, z);
  for (const i of near(x, z).b) { const b = BOXES[i]; if (b.y1 <= g || b.y1 > y + PL.step + .01) continue; const [lx, lz] = local(b, x, z); if (Math.abs(lx) <= b.hx + .05 && Math.abs(lz) <= b.hz + .05) g = b.y1; }
  return g;
}
// push a body (feet at y, height h) out of trunks and boxes it overlaps
function pushOut(p, h) {
  const cell = near(p.x, p.z);
  for (const i of cell.t) {
    const t = TREES[i], dx = p.x - t.x, dz = p.z - t.z, d = Math.hypot(dx, dz), m = t.r * 1.12 + PL.r;
    if (d < m && d > 1e-6) { p.x = t.x + dx / d * m; p.z = t.z + dz / d * m; }
  }
  for (const i of cell.b) {
    const b = BOXES[i];
    if (b.y1 <= p.y + PL.step || b.y0 >= p.y + h) continue;   // a step you walk onto, or a slab overhead
    const [lx, lz] = local(b, p.x, p.z), cx = Math.max(-b.hx, Math.min(b.hx, lx)), cz = Math.max(-b.hz, Math.min(b.hz, lz));
    let dx = lx - cx, dz = lz - cz, d = Math.hypot(dx, dz);
    if (d >= PL.r) continue;
    if (d < 1e-6) { const ox = b.hx - Math.abs(lx), oz = b.hz - Math.abs(lz); if (ox < oz) { const nx = Math.sign(lx || 1) * (b.hx + PL.r); [p.x, p.z] = world(b, nx, lz); } else { const nz = Math.sign(lz || 1) * (b.hz + PL.r); [p.x, p.z] = world(b, lx, nz); } continue; }
    const k = PL.r / d; [p.x, p.z] = world(b, cx + dx * k, cz + dz * k);
  }
  p.x = Math.max(MIN, Math.min(MAX, p.x)); p.z = Math.max(MIN, Math.min(MAX, p.z));
}
export function blocked(x, y, z, h = PL.h) {   // is a body standing here inside something solid?
  const cell = near(x, z);
  for (const i of cell.t) { const t = TREES[i]; if (Math.hypot(x - t.x, z - t.z) < t.r * 1.12 + PL.r - .06) return true; }
  for (const i of cell.b) { const b = BOXES[i]; if (b.y1 <= y + PL.step || b.y0 >= y + h) continue; const [lx, lz] = local(b, x, z); if (Math.abs(lx) < b.hx + PL.r - .06 && Math.abs(lz) < b.hz + PL.r - .06) { const cx = Math.max(-b.hx, Math.min(b.hx, lx)), cz = Math.max(-b.hz, Math.min(b.hz, lz)); if (Math.hypot(lx - cx, lz - cz) < PL.r - .06) return true; } }
  return x < MIN - .01 || x > MAX + .01 || z < MIN - .01 || z > MAX + .01;
}
/* one movement step. s: { x, y, z, vy, yaw, crouch, sprint, onGround }, i: { mx, mz (-1..1, local), jump, drawing }.
   Returns the speed limit used (the server checks reported moves against it). */
export function moveStep(s, i, dt) {
  const h = s.crouch ? PL.hCrouch : PL.h, water = inWater(s.x, s.z, s.y + .3);
  let sp = s.crouch ? PL.crouch : i.drawing ? PL.aim : s.sprint ? PL.sprint : PL.walk; if (water) sp *= PL.waterMul;
  let mx = i.mx || 0, mz = i.mz || 0; const L = Math.hypot(mx, mz); if (L > 1) { mx /= L; mz /= L; }
  const sy = Math.sin(s.yaw), cy = Math.cos(s.yaw);
  const vx = (cy * mx - sy * mz) * sp, vz = (-sy * mx - cy * mz) * sp;   // mz = forward (-Z at yaw 0), mx = right
  const steps = Math.max(1, Math.ceil(Math.hypot(vx, vz) * dt / .25));
  for (let k = 0; k < steps; k++) {
    const ox = s.x, oz = s.z;
    s.x += vx * dt / steps; s.z += vz * dt / steps; pushOut(s, h);
    const g = groundAt(s.x, s.z, s.y);
    if (g > s.y + PL.step) { s.x = ox; s.z = oz; }   // too tall to step up
  }
  if (i.jump && s.onGround && !s.crouch) { s.vy = PL.jump; s.onGround = false; }
  s.vy -= PL.grav * dt; s.y += s.vy * dt;
  const g = groundAt(s.x, s.z, s.y + .05);
  if (s.y <= g) { s.y = g; s.vy = 0; s.onGround = true; } else if (s.y - g > .08) s.onGround = false;
  // standing up needs headroom
  if (!s.crouch && blocked(s.x, s.y, s.z, PL.h) && !blocked(s.x, s.y, s.z, PL.hCrouch)) s.crouch = true;
  return sp;
}

// ---- arrows: a point under gravity, swept against the world and bodies segment by segment
// a full draw flies dead straight along your line of sight (no drop), so it lands exactly on the crosshair;
// anything short of a full draw arcs under gravity
export const isFull = p => p >= 1;
export const gravFor = p => isFull(p) ? 0 : GRAV;
export const arrowAt = (o, v, t, g = GRAV) => [o[0] + v[0] * t, o[1] + v[1] * t - .5 * g * t * t, o[2] + v[2] * t];
export function aimVector(yaw, pitch, speed) { const cp = Math.cos(pitch); return [-Math.sin(yaw) * cp * speed, Math.sin(pitch) * speed, -Math.cos(yaw) * cp * speed]; }
// the arrow leaves from half a metre in front of the eye, just below it, where the drawn arrow lies
// (a straight full-draw arrow leaves from the line of sight itself, so it goes exactly where you look)
export function shotOrigin(s, straight) { const e = eyeHeight(s.crouch), cp = Math.cos(s.pitch); return [s.x - Math.sin(s.yaw) * cp * .5, s.y + e - (straight ? 0 : .065) + Math.sin(s.pitch) * .5, s.z - Math.cos(s.yaw) * cp * .5]; }
// first hit along p0 -> p1 against the static world: { t (0..1), mat, kind } or null
export function sweepWorld(p0, p1) {
  let best = null;
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2];
  const cells = new Set(); const len = Math.hypot(dx, dz), n = Math.max(1, Math.ceil(len / 5));
  for (let k = 0; k <= n; k++) cells.add(near(p0[0] + dx * k / n, p0[2] + dz * k / n));
  const seenT = new Set(), seenB = new Set();
  for (const cell of cells) {
    for (const i of cell.t) {
      if (seenT.has(i)) continue; seenT.add(i); const t = TREES[i];
      const fx = p0[0] - t.x, fz = p0[2] - t.z, a = dx * dx + dz * dz, b = 2 * (fx * dx + fz * dz), c = fx * fx + fz * fz - t.r * t.r, disc = b * b - 4 * a * c;
      if (a < 1e-9 || disc < 0) continue;
      const tt = (-b - Math.sqrt(disc)) / (2 * a); if (tt < 0 || tt > 1 || (best && tt >= best.t)) continue;
      const y = p0[1] + dy * tt, g = terrainH(t.x, t.z); if (y < g - .5 || y > g + t.h * .62) continue;
      best = { t: tt, mat: 'wood', kind: 'tree' };
    }
    for (const i of cell.b) {
      if (seenB.has(i)) continue; seenB.add(i); const b = BOXES[i];
      const [ax, az] = local(b, p0[0], p0[2]), ldx = dx * b.c - dz * b.s, ldz = dx * b.s + dz * b.c;
      let t0 = 0, t1 = 1; const slab = (o, d, lo, hi) => { if (Math.abs(d) < 1e-9) return o >= lo && o <= hi; let a1 = (lo - o) / d, a2 = (hi - o) / d; if (a1 > a2) [a1, a2] = [a2, a1]; t0 = Math.max(t0, a1); t1 = Math.min(t1, a2); return t0 <= t1; };
      if (!slab(ax, ldx, -b.hx, b.hx) || !slab(p0[1], dy, b.y0, b.y1) || !slab(az, ldz, -b.hz, b.hz)) continue;
      if (best && t0 >= best.t) continue; best = { t: t0, mat: b.mat, kind: b.kind };
    }
  }
  // the ground: march along the segment, then refine
  const steps = Math.max(2, Math.ceil(Math.hypot(dx, dy, dz) / .35));
  let prev = 0;
  for (let k = 1; k <= steps; k++) {
    const u = k / steps; if (best && u - 1 / steps > best.t) break;
    const y = p0[1] + dy * u, x = p0[0] + dx * u, z = p0[2] + dz * u;
    if (y < terrainH(x, z)) {
      let lo = prev, hi = u; for (let r = 0; r < 12; r++) { const m = (lo + hi) / 2; if (p0[1] + dy * m < terrainH(p0[0] + dx * m, p0[2] + dz * m)) hi = m; else lo = m; }
      if (!best || hi < best.t) { const wx = p0[0] + dx * hi, wz = p0[2] + dz * hi; best = { t: hi, mat: creekDist(wx, wz) < CREEK_W + .3 ? 'water' : 'dirt', kind: 'ground' }; }
      break;
    }
    prev = u;
  }
  return best;
}
// a body's hitboxes: a head sphere, a torso capsule and a legs capsule (lower when crouched). The torso capsule's rounded
// top stops at the shoulders, under the head sphere, so a shot straight at someone's face is a headshot
export function hitboxes(s) {
  const c = s.crouch;
  return [
    { zone: 'head', a: [s.x, s.y + (c ? 1.12 : 1.62), s.z], b: null, r: .15 },
    { zone: 'body', a: [s.x, s.y + (c ? .64 : 1.0), s.z], b: [s.x, s.y + (c ? .84 : 1.25), s.z], r: .25 },
    { zone: 'legs', a: [s.x, s.y + .12, s.z], b: [s.x, s.y + (c ? .58 : .96), s.z], r: .19 },
  ];
}
function inBox(p, hb) {
  if (!hb.b) return (p[0] - hb.a[0]) ** 2 + (p[1] - hb.a[1]) ** 2 + (p[2] - hb.a[2]) ** 2 <= hb.r * hb.r;
  const y = Math.max(hb.a[1], Math.min(hb.b[1], p[1]));
  return (p[0] - hb.a[0]) ** 2 + (p[1] - y) ** 2 + (p[2] - hb.a[2]) ** 2 <= hb.r * hb.r;
}
// first body hit along p0 -> p1 (sampled finely: every sample is closer together than the thinnest hitbox)
export function sweepBodies(p0, p1, bodies) {
  const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]), n = Math.max(1, Math.ceil(L / .06));
  let cand = bodies.filter(b => { const mx = (p0[0] + p1[0]) / 2, mz = (p0[2] + p1[2]) / 2; return Math.hypot(b.s.x - mx, b.s.z - mz) < L / 2 + 1.2; });
  if (!cand.length) return null;
  const boxes = cand.map(b => ({ b, hb: hitboxes(b.s) }));
  for (let k = 0; k <= n; k++) {
    const u = k / n, p = [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u, p0[2] + (p1[2] - p0[2]) * u];
    for (const { b, hb } of boxes) for (const h of hb) if (inBox(p, h)) return { t: u, body: b, zone: h.zone };
  }
  return null;
}
// a ray from the eye for pings and the camera: distance to the first solid thing (or max)
export function rayWorld(o, d, max) {
  const p1 = [o[0] + d[0] * max, o[1] + d[1] * max, o[2] + d[2] * max], h = sweepWorld(o, p1);
  return h ? h.t * max : max;
}
// the arrow's early flight for the aim preview: the same launch speed and gravity the real arrow uses
export function previewArc(o, v, maxDist = 14, n = 16, g = GRAV) {
  const pts = [], sp = Math.hypot(v[0], v[1], v[2]) || 1, T = maxDist / sp;
  for (let k = 1; k <= n; k++) { const t = T * k / n, p = arrowAt(o, v, t, g); pts.push(p); }
  return pts;
}
export const BOWS = [
  { id: 'longbow', n: "Forester's Longbow", price: 0, d: 'Carved dark wood, a leather grip and a simple cord. The archer it finishes bursts into blocks that bounce away.' },
  { id: 'cupid', n: "Cupid's Bow", price: 220, d: 'Rose-gold limbs, carved hearts and red ribbon. Giant hearts, a heart stamp, and a burst of petals.' },
  { id: 'yardstick', n: 'The Yardstick', price: 260, d: 'Bent wooden rulers strapped together. A giant ruler swings down: THWACK.' },
  { id: 'cashout', n: 'Cashout', price: 320, d: 'Limbs wrapped in stacks of bills, a metal grip. The victim bursts into a cloud of cash and coins.' },
];
export const BOW_IDS = BOWS.map(b => b.id);
export const COINS = { start: 160, match: 40, win: 25, ffaTop: 25 };
