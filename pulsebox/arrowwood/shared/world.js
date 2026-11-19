/* ARROWWOOD shared world: the maps (The King's Wood and its sister woods), movement, arrow flight, swept collision,
   hitboxes and damage.
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
  infinite: true,              // the quiver never runs out (the count stays at startArrows)
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
export const PL = { r: .34, h: 1.8, hCrouch: 1.25, eye: 1.62, eyeCrouch: 1.12, step: .48, walk: 4.4, sprint: 6.6, crouch: 2.3, aim: 2.7, jump: 6.4, grav: 18, waterMul: .68 };
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

/* ---------- the maps ----------
   Every map is the same 140 x 140 square, point-symmetric about its centre, with the two camps at the north and south ends.
   A map's builder fills a map object M: its ground (terrainH), its water, and its static geometry:
   TREES: trunks (vertical cylinders) {x, z, r, h, lean?}. Branches and leaves let arrows through.
   BOXES: oriented boxes turned about Y {x, z, hx, hz, a, y0, y1, mat}: walls, logs, rocks, bridges, towers.
   A box's top is ground you can stand on; a box taller than a step blocks you while you overlap it in height.
   useMap(id) makes one the map in use: everything below (movement, arrows, targets) reads that one, and the exported lists
   (TREES, BOXES, ...) are refilled with its contents. A room calls it before each step, so rooms on different maps can
   share one process. */
let M = null;
const BUILT = {};
export const MAPS = [
  { id: 'kingswood', n: "The King's Wood", d: 'A creek through the middle, the Stone Bridge over it, the Old Tower and Split Oak on the flanks.' },
  { id: 'emberfall', n: 'Emberfall', d: 'An autumn wood around a hill crowned by a ruined keep, with an orchard and a hay barn on the flanks.' },
  { id: 'frostpine', n: 'Frostpine', d: 'A snowy pine wood around a frozen lake: rocks on the ice, ridges and a ruined lodge on each side.' },
  { id: 'mirewood', n: 'Mirewood', d: 'A misty swamp of shallow pools that slow you down, boardwalks across them, and a sunken shrine on an island.' },
];
export const MAP_IDS = MAPS.map(m => m.id);
export const mapId = () => M.id;
export const mapInfo = id => MAPS.find(m => m.id === (id || M.id)) || MAPS[0];
// the lists and records of the map in use (filled in place, so a copy of these references always sees the current map)
export const TREES = [], BOXES = [], PROPS = [], BUSHES = [], PICKUPS = [], FFA_SPAWNS = [], GROVES = [], MEADOWS = [], TARGETS = [], AREAS = [], WATER = [], PATHS = [];
export const ZONE = {};
const LISTS = { TREES, BOXES, PROPS, BUSHES, PICKUPS, FFA_SPAWNS, GROVES, MEADOWS, TARGETS, AREAS, WATER, PATHS };
export const CREEK_W = 2.5;
export const terrainH = (x, z) => M.terrainH(x, z);
export const creekZ = x => M.creekZ(x);
export const creekDist = (x, z) => M.creekDist(x, z);
export const waterY = x => M.waterY(x);
export const inWater = (x, z, y) => M.inWater(x, z, y);
export const inGrove = (x, z, pad = 0) => M.GROVES.some(g => Math.hypot(x - g.x, z - g.z) < g.r + pad);
export const inMeadow = (x, z, pad = 0) => M.MEADOWS.some(m => Math.hypot(x - m.x, z - m.z) < m.r + pad);
// every map has the same two camps: spawns, which way they face
export const SPAWNS = { 0: [[70, 126], [64, 128], [76, 128], [70, 131]], 1: [[70, 14], [76, 12], [64, 12], [70, 9]] };
export const SPAWN_YAW = { 0: 0, 1: Math.PI };   // yaw 0 looks north (-Z)
export const TARGET = { coins: 5, back: 30, r: .46, rFly: .62 };

export function useMap(id) {
  if (!MAP_IDS.includes(id)) id = 'kingswood';
  if (M && M.id === id) return M;
  const m = BUILT[id] || buildMap(id);
  M = m;
  for (const k in LISTS) { const a = LISTS[k]; a.length = 0; for (const v of m[k]) a.push(v); }
  for (const k in ZONE) delete ZONE[k]; Object.assign(ZONE, m.ZONE);
  return m;
}
const BUILDERS = {};
function buildMap(id) {
  const prev = M, m = { id, GRID: null, ZONE: {}, waterName: '' }; for (const k in LISTS) m[k] = [];
  M = m;
  try { BUILDERS[id](m); buildGrid(m); } finally { M = prev; }
  BUILT[id] = m; return m;
}

// ---- builder helpers (they write into the map being built)
const SEAT = new Set(['wall', 'log', 'rock', 'tower', 'rubble']);
const box = (x, z, hx, hz, a, y0, y1, mat, kind) => {
  const b = { x, z, hx, hz, a, c: Math.cos(a), s: Math.sin(a), y0, y1, mat, kind: kind || mat };
  // on a hillside a wall, log or rock reaches down to the lowest ground under it, so nothing floats
  if (SEAT.has(b.kind)) for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]) { const lx = u * hx, lz = v * hz, wx = x + lx * b.c + lz * b.s, wz = z - lx * b.s + lz * b.c; b.y0 = Math.min(b.y0, terrainH(wx, wz) - .25); }
  M.BOXES.push(b); return b;
};
const both = fn => { fn((x, z) => [x, z], 0); fn((x, z) => rot(x, z), Math.PI); };   // place something and its half-turn twin
const gnd = (x, z) => terrainH(x, z);
// Camps: protected spawns behind ruined walls, three ways out. Defined for the south (Moss) camp, turned for the north.
function camps() {
  both((P, a) => {
    const w = (x, z, hx, hz, an, hgt) => { const [px, pz] = P(x, z); box(px, pz, hx, hz, an, gnd(px, pz) - .3, gnd(px, pz) + hgt, 'stone', 'wall'); };
    w(62, 118, 3.4, .4, 0, 1.9); w(78, 118, 3.4, .4, 0, 1.9);            // the camp's front wall, a gap in the middle
    w(56.5, 122, .4, 3, 0, 1.7); w(83.5, 122, .4, 3, 0, 1.7);           // side walls, open behind
    const lg = (x, z, an) => { const [px, pz] = P(x, z); box(px, pz, 2.6, .38, an, gnd(px, pz) - .2, gnd(px, pz) + .8, 'wood', 'log'); };
    lg(70, 112, .1); lg(52, 112, -.5); lg(88, 112, .6);
  });
}

// ======== The King's Wood: a creek through the middle under the Stone Bridge, the Old Tower and Split Oak on the flanks ========
function kingsWood(M) {
  // ---- the creek: a shallow stream meandering west to east through the middle
  const creekZ = M.creekZ = x => CZ + 5 * Math.sin((x - CX) * .06);
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
  const creekDist = M.creekDist = function (x, z) { return Math.abs(z - creekZ(x)) / Math.sqrt(1 + (.3 * Math.cos((x - CX) * .06)) ** 2); }
  M.terrainH = (x, z) => {
    const d = creekDist(x, z), b = baseH(x, z);
    const carve = d < CREEK_W ? 1.55 : 1.55 * (1 - sstep(CREEK_W, 6.8, d));
    return b - carve;
  };
  const waterY = M.waterY = x => baseH(x, creekZ(x)) - 1.55 + .42;
  M.inWater = (x, z, y) => creekDist(x, z) < CREEK_W + 1.2 && y < waterY(x) - .05;
  M.WATER.push({ kind: 'creek' }); M.waterName = 'the Creek';

  /* ---------- static geometry ----------
     TREES: trunks (vertical cylinders) {x, z, r, h, lean?}. Branches and leaves let arrows through.
     BOXES: oriented boxes turned about Y {x, z, hx, hz, a, y0, y1, mat}: walls, logs, rocks, the bridge, the tower.
     A box's top is ground you can stand on; a box taller than a step blocks you while you overlap it in height. */
  const { TREES, BOXES, PROPS, BUSHES, PICKUPS, FFA_SPAWNS, GROVES, MEADOWS, TARGETS } = M;

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

  camps();

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

  // six clearings in exposed spots (they once held arrow bundles; now each has a target on a post), kept clear of trees
  both(P => { for (const [x, z] of [[56, 75], [37, 97], [97, 104]]) { const [px, pz] = P(x, z); PICKUPS.push({ x: px, z: pz, y: terrainH(px, pz) }); } });
  // free-for-all spawns: spread around the whole wood
  both(P => { for (const [x, z] of [[70, 126], [30, 126], [110, 124], [14, 100], [44, 96], [96, 98], [124, 90], [52, 78], [86, 82], [20, 72]]) FFA_SPAWNS.push(P(x, z)); });
  // Trees: groves of tall old trees standing close, so their crowns meet overhead and shade the ground; open meadows with
  // nothing but grass and the odd bush; a few lone trees in between. Placed on the south half and turned for the north.
  { const G = [[30, 101, 13], [105, 101, 12], [51, 117, 8.5], [119, 121, 9], [12, 121, 8], [88, 88, 6.5]], Mw = [[70, 98, 12], [44, 83, 7], [96, 83, 7], [70, 123, 12], [124, 82, 7]];
    for (const [x, z, r] of G) { GROVES.push({ x, z, r }); const [a, b] = rot(x, z); GROVES.push({ x: a, z: b, r }); }
    for (const [x, z, r] of Mw) { MEADOWS.push({ x, z, r }); const [a, b] = rot(x, z); MEADOWS.push({ x: a, z: b, r }); } }
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

  /* ---- targets: little bullseyes worth coins. On posts in the clearings and meadows, nailed to lone tree trunks, and
     flying in circles under balloons over the meadows. One arrow breaks one; it comes back a while later. They are not
     solid: you walk through them, and only arrows hit them. Flying ones move on the room's clock (targetPos). */
  (function targets() {
    const g = (x, z) => terrainH(x, z);
    for (const k of PICKUPS) TARGETS.push({ kind: 'ground', x: k.x, y: k.y + 1.25, z: k.z, face: Math.atan2(CX - k.x, CZ - k.z) });
    both(P => { for (const [x, z] of [[44, 86], [96, 86], [122, 80], [70, 104]]) { const [px, pz] = P(x, z); TARGETS.push({ kind: 'ground', x: px, y: g(px, pz) + 1.25, z: pz, face: Math.atan2(CX - px, CZ - pz) }); } });
    // on trees: every third lone tree on each half, on the side facing the middle of the wood, at head height
    const lone = TREES.filter(t => t.kind === 'oak' || t.kind === 'oak2');
    lone.forEach((t, i) => { if (i % 3) return; const a = Math.atan2(CX - t.x, CZ - t.z), d = t.r + .07, x = t.x + Math.sin(a) * d, z = t.z + Math.cos(a) * d; TARGETS.push({ kind: 'tree', x, y: g(t.x, t.z) + 2.3 + (i % 2) * .5, z, face: a, tree: TREES.indexOf(t) }); });
    // in the sky: circling over the meadows, high enough to need a lob or a long straight shot
    MEADOWS.forEach((m, i) => TARGETS.push({ kind: 'fly', x: m.x, y: g(m.x, m.z) + 11 + (i % 3) * 2.5, z: m.z, rad: Math.max(4, m.r * .7), per: 18 + (i % 4) * 4, ph: i * 1.7, dir: i % 2 ? 1 : -1 }));
  })();
  Object.assign(M.ZONE, { x: CX, z: CZ, r: 9, name: 'Stone Bridge' });
  M.AREAS.push(
    { n: 'Stone Bridge', x: CX, z: CZ, r: 14 }, { n: 'Split Oak', x: SPLIT.x, z: SPLIT.z, r: 14 }, { n: 'Old Tower', x: TOWER.x, z: TOWER.z, r: 14 },
    { n: 'Moss Camp', x: 70, z: 124, r: 15 }, { n: 'Russet Camp', x: 70, z: 16, r: 15 },
  );
}
BUILDERS.kingswood = kingsWood;

// ======== the toolkit the newer maps are built with (the King's Wood keeps its own hand-placed code above) ========
const CAMP_SPOTS = [[70, 124], [70, 16]];
// ground: point-symmetric rolling noise, hills placed on the south half and turned for the north, ridges (capsules), flat camp
// terraces, the lane from each camp kept low, edges rising into banks; shape(x, z, h) reshapes it (keep it symmetric too)
function ground(o) {
  const knolls = [], ridges = [];
  for (const [x, z, h, r] of o.hills || []) { knolls.push([x, z, h, r]); const [rx, rz] = rot(x, z); knolls.push([rx, rz, h, r]); }
  for (const [x0, z0, x1, z1, h, w] of o.ridges || []) { ridges.push([x0, z0, x1, z1, h, w]); const [a, b] = rot(x0, z0), [c, d] = rot(x1, z1); ridges.push([a, b, c, d, h, w]); }
  const amp = o.amp ?? 1, sd = o.seed || 0;
  return (x, z) => {
    const f = (x, z) => 2.1 * vnoise(x * .05 + sd, z * .05 - sd) + .6 * vnoise(x * .12 + 7 + sd, z * .12 + 3) + .1 * vnoise(x * .4, z * .4);
    const [rx, rz] = rot(x, z);
    let h = ((f(x, z) + f(rx, rz)) * .5 - 1.2) * amp;
    for (const [kx, kz, kh, kr] of knolls) { const d2 = ((x - kx) ** 2 + (z - kz) ** 2) / (kr * kr); h += kh * 1.3 * Math.exp(-d2 * 1.4); }
    for (const [x0, z0, x1, z1, rh, w] of ridges) { const dx = x1 - x0, dz = z1 - z0, t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz))), d = Math.hypot(x - x0 - dx * t, z - z0 - dz * t); h += rh * Math.exp(-(d * d) / (w * w) * 1.4); }
    if (o.lane !== false) { const lane = (1 - sstep(3, 9, Math.abs(x - CX))) * sstep(o.laneFrom || 20, (o.laneFrom || 20) + 6, Math.abs(z - CZ)); h -= lane * Math.max(0, h - .15) * .75; }
    if (o.shape) h = o.shape(x, z, h);
    for (const [cx, cz] of CAMP_SPOTS) { const k = 1 - sstep(9, 15, Math.hypot(x - cx, z - cz)); h = h * (1 - k) + .25 * k; }
    const e = Math.max(0, Math.max(MIN + 2 - x, x - MAX + 2, MIN + 2 - z, z - MAX + 2));
    return h + e * e * .12;
  };
}
function dryLand(m) { m.creekZ = () => CZ; m.creekDist = () => 1e9; m.waterY = () => -99; m.inWater = () => false; }
// a marsh: open water wherever the ground dips below one level (the client draws a single sheet of water at that height)
function marshAt(m, level) {
  m.waterY = () => level; m.creekZ = () => CZ;
  m.inWater = (x, z, y) => m.terrainH(x, z) < level - .05 && y < level - .05;
  m.creekDist = (x, z) => { const h = m.terrainH(x, z) - level; return h < 0 ? 0 : CREEK_W + h * 7; };   // how far up the bank, in creek terms
  m.WATER.push({ kind: 'marsh', y: level });
}
const halves = (list, into) => { for (const [x, z, r] of list) { into.push({ x, z, r }); const [a, b] = rot(x, z); into.push({ x: a, z: b, r }); } };
const turned = (list, into) => both(P => { for (const [x, z] of list) { const [px, pz] = P(x, z); into.push([px, pz]); } });
const spots = (list, into) => both(P => { for (const [x, z] of list) { const [px, pz] = P(x, z); into.push({ x: px, z: pz, y: terrainH(px, pz) }); } });
// trees and bushes: groves of tall trunks close together, lone trees scattered, bushes to crouch behind; south half, turned
function growWood(o) {
  const R = rng(o.seed), keep = o.keep || (() => false);
  const keepOut = (x, z) => {
    const g = terrainH(x, z);
    if (creekDist(x, z) < CREEK_W + 2.2 || inWater(x, z, g)) return true;
    if (CAMP_SPOTS.some(([cx, cz]) => Math.hypot(x - cx, z - cz) < 9)) return true;
    if (Math.abs(x - CX) < 2.6 && Math.abs(z - CZ) > 16 && Math.abs(z - CZ) < 42) return true;   // the lane out of each camp stays open
    if (inMeadow(x, z, 1) || keep(x, z)) return true;
    const [rx, rz] = rot(x, z); if (keep(rx, rz)) return true;
    if ((o.posts || []).some(([px, pz]) => Math.hypot(px - x, pz - z) < 2.6 || Math.hypot(px - rx, pz - rz) < 2.6)) return true;   // where the target posts go
    if (M.PICKUPS.some(k => Math.hypot(k.x - x, k.z - z) < 2.6) || M.FFA_SPAWNS.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 2.4)) return true;
    return M.BOXES.some(b => { const dx = x - b.x, dz = z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; return Math.abs(lx) < b.hx + 2 && Math.abs(lz) < b.hz + 2; });
  };
  const half = [], gap = o.gap || 4.7;
  for (let n = 0; n < 2600; n++) {
    const x = MIN + 2 + R() * (MAX - MIN - 4), z = CZ + 1 + R() * (MAX - CZ - 3);
    if (!inGrove(x, z) || keepOut(x, z) || half.some(t => Math.hypot(t.x - x, t.z - z) < gap)) continue;
    const t = o.grove(R); half.push({ x, z, lean: [(R() - .5) * .06, (R() - .5) * .06], seed: (R() * 1e6) | 0, ...t });
  }
  let lone = 0;
  for (let n = 0; n < 1400 && lone < (o.lone ?? 24); n++) {
    const x = MIN + 2 + R() * (MAX - MIN - 4), z = CZ + 1 + R() * (MAX - CZ - 3);
    if (inGrove(x, z, 2) || keepOut(x, z) || half.some(t => Math.hypot(t.x - x, t.z - z) < 8)) continue;
    lone++; half.push({ x, z, lean: [(R() - .5) * .08, (R() - .5) * .08], seed: (R() * 1e6) | 0, ...o.single(R) });
  }
  for (const t of o.extra || []) half.push(t);
  for (const t of half) { M.TREES.push(t); const [x, z] = rot(t.x, t.z); M.TREES.push({ ...t, x, z, lean: [-t.lean[0], -t.lean[1]], seed: t.seed + 1 }); }
  const B = rng(o.seed + 1020), bh = [];
  for (let n = 0; n < 1800 && bh.length < (o.bushes ?? 70); n++) {
    const x = MIN + 1 + B() * (MAX - MIN - 2), z = CZ + 4 + B() * (MAX - CZ - 5), g = terrainH(x, z);
    if (creekDist(x, z) < CREEK_W + 1 || inWater(x, z, g)) continue;
    if (Math.abs(x - CX) < 2.2 && z > 80) continue;
    if (Math.hypot(x - 70, z - 124) < 6 || keep(x, z)) continue;
    if (inMeadow(x, z) && B() < .75) continue;
    if (M.TREES.some(t => Math.hypot(t.x - x, t.z - z) < t.r + .9)) continue;
    if (M.BOXES.some(b => { const dx = x - b.x, dz = z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; return Math.abs(lx) < b.hx + .7 && Math.abs(lz) < b.hz + .7; })) continue;
    if (bh.some(q => Math.hypot(q.x - x, q.z - z) < 2.6)) continue;
    bh.push({ x, z, r: .55 + B() * .55, seed: (B() * 1e6) | 0 });
  }
  for (const q of bh) { M.BUSHES.push(q); const [x, z] = rot(q.x, q.z); M.BUSHES.push({ ...q, x, z, seed: q.seed + 1 }); }
}
// targets: on posts at the clearings and a few more spots, nailed to every third lone tree, flying over the meadows
function hangTargets(posts) {
  const g = (x, z) => terrainH(x, z), face = (x, z) => Math.atan2(CX - x, CZ - z);
  for (const k of M.PICKUPS) M.TARGETS.push({ kind: 'ground', x: k.x, y: k.y + 1.25, z: k.z, face: face(k.x, k.z) });
  both(P => { for (const [x, z] of posts) { const [px, pz] = P(x, z); M.TARGETS.push({ kind: 'ground', x: px, y: g(px, pz) + 1.25, z: pz, face: face(px, pz) }); } });
  const lone = M.TREES.filter(t => t.lone);
  lone.forEach((t, i) => { if (i % 3) return; const a = face(t.x, t.z), d = t.r + .07, x = t.x + Math.sin(a) * d, z = t.z + Math.cos(a) * d; M.TARGETS.push({ kind: 'tree', x, y: g(t.x, t.z) + 2.3 + (i % 2) * .5, z, face: a, tree: M.TREES.indexOf(t) }); });
  M.MEADOWS.forEach((m, i) => M.TARGETS.push({ kind: 'fly', x: m.x, y: g(m.x, m.z) + 11 + (i % 3) * 2.5, z: m.z, rad: Math.max(4, m.r * .7), per: 18 + (i % 4) * 4, ph: i * 1.7, dir: i % 2 ? 1 : -1 }));
}
// placing on one half (P turns it for the other): walls, logs, rocks, crates of the kinds the client knows how to draw
const kit = P => ({
  wall: (x, z, hx, an, hgt, hz = .38) => { const [px, pz] = P(x, z); return box(px, pz, hx, hz, an, gnd(px, pz) - .3, gnd(px, pz) + hgt, 'stone', 'wall'); },
  log: (x, z, hx, an, r = .4) => { const [px, pz] = P(x, z); return box(px, pz, hx, r, an, gnd(px, pz) - .25, gnd(px, pz) + r * 2.05, 'wood', 'log'); },
  rock: (x, z, sz, hgt, an) => { const [px, pz] = P(x, z); return box(px, pz, sz, sz * .75, an, gnd(px, pz) - .6, gnd(px, pz) + hgt, 'stone', 'rock'); },
  // a box at an absolute height (y0..y1) of a given material and kind
  at: (x, z, hx, hz, an, y0, y1, mat, kind) => { const [px, pz] = P(x, z); return box(px, pz, hx, hz, an, y0, y1, mat, kind); },
  // a box standing on the ground here, hgt tall
  on: (x, z, hx, hz, an, hgt, mat, kind, sink = .3) => { const [px, pz] = P(x, z), g0 = gnd(px, pz); return box(px, pz, hx, hz, an, g0 - sink, g0 + hgt, mat, kind); },
});

// ======== Emberfall: an autumn wood. Keep Hill in the middle crowned by a ruined keep (the overtime ground); an orchard
// on one flank and a hay barn on the other; golden fields between ========
BUILDERS.emberfall = function emberfall(m) {
  dryLand(m); m.woods = 'woods';
  const ORCH = { x: 31, z: 100 }, BARN = { x: 107, z: 100 };
  m.terrainH = ground({ seed: 13.7, amp: .85, laneFrom: 24,
    hills: [[22, 116, 3.2, 11], [118, 120, 3, 11], [48, 112, 2.1, 8], [96, 118, 2, 8], [12, 92, 2.6, 9], [128, 90, 2.6, 9], [52, 88, 1.3, 6], [90, 86, 1.4, 6]],
    shape: (x, z, h) => {   // Keep Hill: a broad hill with a flat top for the keep; the orchard and the barn on level ground
      const d = Math.hypot(x - CX, z - CZ), hill = 4.2 * (1 - sstep(12, 26, d)); h = h * sstep(10, 24, d) + hill;
      for (const [cx, cz] of [[ORCH.x, ORCH.z], rot(ORCH.x, ORCH.z), [BARN.x, BARN.z], rot(BARN.x, BARN.z)]) { const k = 1 - sstep(8, 13, Math.hypot(x - cx, z - cz)); h = h * (1 - k) + .45 * k; }
      return h;
    } });
  // the keep: a square courtyard (18 x 18) of broken walls on the hilltop, gates on all four sides, two corner turrets with
  // stairs up (south-east and, turned, north-west), pillars inside and the old beacon in the middle
  const top = terrainH(CX, CZ), K = 9;
  both(P => { const B = kit(P);
    B.at(CX - 5.4, CZ + K, 3.2, .45, 0, top - .4, top + 2.2, 'stone', 'wall'); B.at(CX + 5.2, CZ + K, 3.4, .45, 0, top - .4, top + 1.25, 'stone', 'wall');   // south wall, gate in the middle
    B.at(CX + K, CZ - 5.8, .45, 3.2, 0, top - .4, top + 2.2, 'stone', 'wall'); B.at(CX + K, CZ + 3.4, .45, 2.4, 0, top - .4, top + 1.1, 'stone', 'wall');    // east wall, gate north of middle
    // the south-east turret, its top a lookout, stairs climbing to it along the inside of the south wall
    B.at(CX + K - .4, CZ + K - .4, 1.7, 1.7, 0, top - .4, top + 3.6, 'stone', 'tower');
    for (let k = 0; k < 8; k++) B.at(CX + 1.2 + k * .72, CZ + K - 1.25, .36, .55, 0, top - .2, top + .45 * (k + 1), 'stone', 'stair');
    B.at(CX + 5, CZ + 5, .45, .45, 0, top - .2, top + 2.6, 'stone', 'pillar'); B.at(CX - 5, CZ + 5, .45, .45, 0, top - .2, top + 1.3, 'stone', 'pillar');
    B.at(CX + 1.6, CZ, .5, .5, 0, top - .2, top + 2.4, 'stone', 'pillar');   // the beacon's two posts
  });
  box(CX, CZ, 1.1, 1.1, 0, top - .2, top + .9, 'stone', 'plinth');   // the beacon stone
  m.PROPS.push({ t: 'beacon', x: CX, z: CZ, y: top + .9 });
  both(P => { const B = kit(P);
    // the orchard: rows of apple trees inside a low dry-stone wall, open toward the middle
    B.wall(ORCH.x - 10.5, ORCH.z, 7, Math.PI / 2, 1.1); B.wall(ORCH.x - 4, ORCH.z + 10, 6, 0, 1.1); B.wall(ORCH.x + 7, ORCH.z + 10, 3, 0, 1.1);
    B.on(ORCH.x + 6, ORCH.z - 8, .9, .7, .2, 1.1, 'hay', 'bale', .1); B.on(ORCH.x - 6, ORCH.z + 6, .9, .7, -.4, 1.1, 'hay', 'bale', .1);
    // the hay barn: tall plank walls, wide doors to the north and south, windows east and west, a loft inside up a stack of bales
    const bx = BARN.x, bz = BARN.z, bh = 3.4;
    B.on(bx - 3.6, bz - 4, 1.8, .2, 0, bh, 'wood', 'barn'); B.on(bx + 3.6, bz - 4, 1.8, .2, 0, bh, 'wood', 'barn');            // north, a big door between
    B.on(bx - 3, bz + 4, 2.4, .2, 0, bh, 'wood', 'barn'); B.on(bx + 3.6, bz + 4, 1.8, .2, 0, bh, 'wood', 'barn');              // south, a door left of middle
    B.on(bx - 5.4, bz - 2.2, .2, 1.8, 0, bh, 'wood', 'barn'); B.on(bx - 5.4, bz + 2.6, .2, 1.4, 0, bh, 'wood', 'barn'); B.on(bx - 5.4, bz + .6, .2, .6, 0, 1.0, 'wood', 'barn');   // west, a window
    B.on(bx + 5.4, bz - 2.6, .2, 1.4, 0, bh, 'wood', 'barn'); B.on(bx + 5.4, bz + 2.2, .2, 1.8, 0, bh, 'wood', 'barn'); B.on(bx + 5.4, bz - .6, .2, .6, 0, 1.0, 'wood', 'barn');   // east, a window
    const g0 = gnd(bx, bz);
    B.at(bx + 2.7, bz, 2.5, 3.6, 0, g0 + 2.0, g0 + 2.25, 'wood', 'floor');   // the loft (head room under it)
    for (let k = 0; k < 4; k++) B.at(bx - .3, bz + 2.9 - k * .72, .6, .36, 0, g0 - .1, g0 + .45 * (k + 1), 'hay', 'bale');   // bales stacked into steps up to it
    B.at(bx - 3.4, bz - 2.5, .7, .55, .3, g0 - .1, g0 + 1.1, 'hay', 'bale');
    // bales and fences out in the fields
    B.on(bx - 9, bz + 9, .9, .7, .5, 1.1, 'hay', 'bale', .1); B.on(bx + 3, bz - 11, .9, .7, -.3, 1.1, 'hay', 'bale', .1); B.on(88, 92, .9, .7, .2, 1.1, 'hay', 'bale', .1); B.on(54, 92, .9, .7, -.2, 1.1, 'hay', 'bale', .1);
    B.on(60, 104, 3.2, .1, .1, .95, 'wood', 'fence', .15); B.on(81, 106, 3.2, .1, -.15, .95, 'wood', 'fence', .15); B.on(97, 84, 2.8, .1, .9, .95, 'wood', 'fence', .15);
    // cover on the way up Keep Hill and across the fields
    B.wall(62, 86, 2.4, .15, 1.2); B.wall(79, 88, 2, -.2, 1.3); B.log(66, 97, 2.8, .1); B.log(84, 98, 2.6, -.5); B.rock(46, 96, 1.4, 1.3, .4); B.rock(94, 110, 1.3, 1.4, 1);
    B.log(20, 86, 2.6, 1.4); B.rock(16, 104, 1.5, 1.4, .3); B.wall(122, 102, 2.2, 1.2, 1.3); B.log(124, 78, 2.4, 1.5); B.rock(110, 82, 1.3, 1.2, .6);
    B.wall(44, 118, 2.2, .3, 1.2); B.wall(96, 116, 2.4, -.3, 1.3); B.rock(32, 126, 1.5, 1.3, 0); B.rock(108, 126, 1.5, 1.3, 0);
  });
  camps();
  spots([[54, 80], [88, 84], [26, 114]], m.PICKUPS);
  turned([[70, 126], [30, 126], [112, 126], [12, 104], [46, 100], [92, 94], [126, 98], [54, 78], [86, 80], [20, 78]], m.FFA_SPAWNS);
  halves([[18, 86, 9], [57, 98, 6.5], [90, 108, 7.5], [122, 84, 9], [46, 126, 7], [124, 126, 8]], m.GROVES);
  halves([[70, 101, 10], [98, 86, 6.5], [40, 84, 6], [70, 123, 12], [16, 122, 6]], m.MEADOWS);
  const orchard = [];   // apple trees in rows (they count as lone trees, so some carry targets)
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) orchard.push({ x: ORCH.x - 6.6 + i * 4.6, z: ORCH.z - 5 + j * 5, r: .24, h: 4.2, kind: 'apple', lean: [0, 0], seed: 900 + i * 7 + j, lone: true });
  const POSTS = [[44, 88], [96, 90], [122, 76], [70, 106]];
  growWood({ posts: POSTS, seed: 4411, gap: 4.6, lone: 20, bushes: 62, extra: orchard,
    keep: (x, z) => Math.hypot(x - CX, z - CZ) < 15 || (Math.abs(x - ORCH.x) < 11 && Math.abs(z - ORCH.z) < 11) || (Math.abs(x - BARN.x) < 8.5 && Math.abs(z - BARN.z) < 7.5),
    grove: R => ({ r: .44 + R() * .2, h: 11 + R() * 4, kind: 'tall' }),
    single: R => { const big = R() < .3; return { r: big ? .42 + R() * .12 : .28 + R() * .1, h: big ? 8 + R() * 2 : 5.5 + R() * 2, kind: big ? 'oak' : 'oak2', lone: true }; } });
  hangTargets(POSTS);
  Object.assign(m.ZONE, { x: CX, z: CZ, r: 9, name: 'The Old Keep' });
  m.AREAS.push({ n: 'The Old Keep', x: CX, z: CZ, r: 15 }, { n: 'The Orchard', x: ORCH.x, z: ORCH.z, r: 13 }, { n: 'The Orchard', x: 140 - ORCH.x, z: 140 - ORCH.z, r: 13 },
    { n: 'Hay Barn', x: BARN.x, z: BARN.z, r: 11 }, { n: 'Hay Barn', x: 140 - BARN.x, z: 140 - BARN.z, r: 11 }, { n: 'Moss Camp', x: 70, z: 124, r: 15 }, { n: 'Russet Camp', x: 70, z: 16, r: 15 });
  for (const p of [[[70, 118], [70, 100], [70, 84]], [[62, 116], [48, 108], [38, 100]], [[78, 116], [92, 108], [104, 96]], [[38, 100], [52, 90], [62, 82]]]) { m.PATHS.push(p); m.PATHS.push(p.map(([x, z]) => rot(x, z))); }
};

// ======== Frostpine: a snowy pine wood around a frozen lake (you can walk the ice; rocks on it are the only cover), two
// ridges with a pass between them, Hunter's Lodge on one flank and Bearback Rocks on the other ========
BUILDERS.frostpine = function frostpine(m) {
  dryLand(m); m.woods = 'pines';
  const LAKE = { rx: 25, rz: 15, y: -.9 }, LODGE = { x: 105, z: 101 }, BEAR = { x: 31, z: 97 };
  const lakeD = (x, z) => Math.hypot((x - CX) / LAKE.rx, (z - CZ) / LAKE.rz);   // 1 at the shore
  m.terrainH = ground({ seed: 41.3, amp: 1.05, laneFrom: 22,
    hills: [[18, 122, 3.4, 11], [122, 122, 3.2, 11], [70, 102, 1.1, 7], [10, 98, 2.6, 8], [130, 98, 2.6, 8]],
    ridges: [[22, 108, 46, 90, 3.4, 5.5], [96, 112, 120, 92, 3, 5]],
    shape: (x, z, h) => { const d = lakeD(x, z), k = 1 - sstep(.92, 1.22, d); h = h * (1 - k) + LAKE.y * k;   // the lake: dead flat ice, the shore rising round it
      const b = Math.hypot(x - LODGE.x, z - LODGE.z), rb = Math.hypot(140 - x - LODGE.x, 140 - z - LODGE.z), kk = 1 - sstep(7, 11, Math.min(b, rb)); return h * (1 - kk) + .6 * kk; } });
  m.WATER.push({ kind: 'ice', x: CX, z: CZ, rx: LAKE.rx, rz: LAKE.rz, y: LAKE.y });
  both(P => { const B = kit(P);
    // rocks out on the ice: the only cover on the lake; the Isle in the middle is a flat rock to stand on beside a tall one
    B.rock(58, 76, 1.6, 1.5, .4); B.rock(82, 75, 1.2, 1.1, 1.1); B.rock(50, 68, 1.1, 1.2, .2); B.rock(88, 64, 1.4, 1.0, .8);
    B.at(CX - 1.6, CZ + .8, 2.1, 1.5, .3, LAKE.y - .3, LAKE.y + .9, 'stone', 'rock'); B.at(CX + 1.2, CZ + 2.4, .9, .8, .5, LAKE.y - .3, LAKE.y + 2.3, 'stone', 'rock');
    // an ice-fishing shack on the lake: three plank walls, open toward the shore
    const sx = 92, sz = 74; B.at(sx, sz - 1.1, 1.3, .12, 0, LAKE.y, LAKE.y + 2.1, 'wood', 'shack'); B.at(sx - 1.2, sz, .12, 1.1, 0, LAKE.y, LAKE.y + 2.1, 'wood', 'shack'); B.at(sx + 1.2, sz, .12, 1.1, 0, LAKE.y, LAKE.y + 2.1, 'wood', 'shack');
    // Hunter's Lodge: a log cabin with no roof left, a door toward the lake, windows to shoot through, a stone chimney
    const lx = LODGE.x, lz = LODGE.z, g0 = gnd(lx, lz), wh = 2.3;
    B.at(lx - 2.9, lz - 3.3, 1.7, .3, 0, g0 - .3, g0 + wh, 'wood', 'cabin'); B.at(lx + 2.6, lz - 3.3, 2, .3, 0, g0 - .3, g0 + wh, 'wood', 'cabin'); B.at(lx - .1, lz - 3.3, .9, .3, 0, g0 + 1.15, g0 + wh, 'wood', 'cabin');   // north: a window
    B.at(lx - 4.6, lz - 1.3, .3, 1.7, 0, g0 - .3, g0 + wh, 'wood', 'cabin'); B.at(lx - 4.6, lz + 2.4, .3, .9, 0, g0 - .3, g0 + wh, 'wood', 'cabin');   // west: the door between
    B.at(lx + 4.6, lz, .3, 3.3, 0, g0 - .3, g0 + wh, 'wood', 'cabin');   // east: solid, the chimney on it
    B.at(lx - 1.6, lz + 3.3, 3, .3, 0, g0 - .3, g0 + wh, 'wood', 'cabin'); B.at(lx + 3.4, lz + 3.3, 1.2, .3, 0, g0 - .3, g0 + 1.05, 'wood', 'cabin');   // south: a low window corner
    B.at(lx + 5.3, lz + .4, .7, .8, 0, g0 - .3, g0 + 4.6, 'stone', 'chimney');
    B.at(lx + 1.5, lz + .5, 1, .6, 0, g0, g0 + .8, 'wood', 'table');
    // woodpiles and sledges round the lodge
    B.log(lx - 8, lz + 4, 1.8, .3, .32); B.log(lx - 8, lz + 4.7, 1.8, .3, .32); B.on(lx + 1, lz - 7.5, 1.4, .5, .2, .55, 'wood', 'sled', .05);
    // Bearback Rocks: a heap of boulders with a flat top, stepped so you can climb it
    const bx = BEAR.x, bz = BEAR.z, b0 = gnd(bx, bz);
    B.at(bx, bz, 2.8, 2.2, .3, b0 - .8, b0 + 2.4, 'stone', 'rock'); B.at(bx + 3.2, bz + 1.6, 1.2, 1, .3, b0 - .5, b0 + 1.6, 'stone', 'rock'); B.at(bx + 4.6, bz + 2.6, .9, .8, .3, b0 - .5, b0 + .8, 'stone', 'rock');
    B.at(bx - 2.6, bz - 2.4, 1.6, 1.2, .7, b0 - .6, b0 + 1.8, 'stone', 'rock'); B.at(bx - 1.2, bz - 1.4, .8, .5, .3, b0 + 2.4, b0 + 3.1, 'stone', 'rock');   // a lip on top to crouch behind
    // cover through the pines and along the shore
    B.rock(60, 90, 1.4, 1.3, .3); B.log(80, 92, 2.8, .4); B.log(48, 104, 3, -.3); B.rock(92, 100, 1.2, 1.4, 1.1); B.wall(66, 99, 2.4, 0, 1.3); B.rock(120, 82, 1.5, 1.3, .7);
    B.log(18, 82, 2.6, 1.6); B.rock(16, 108, 1.4, 1.5, .2); B.log(124, 74, 2.4, 1.5); B.wall(42, 116, 2.2, .3, 1.2); B.wall(98, 116, 2.4, -.3, 1.3); B.rock(32, 126, 1.5, 1.4, 0); B.rock(108, 126, 1.5, 1.4, 0);
  });
  camps();
  spots([[56, 92], [88, 94], [16, 116]], m.PICKUPS);
  turned([[70, 126], [30, 126], [112, 126], [12, 106], [44, 98], [94, 92], [126, 100], [40, 86], [100, 86], [20, 76]], m.FFA_SPAWNS);
  halves([[22, 88, 10], [53, 103, 7.5], [88, 106, 6.5], [120, 88, 9], [30, 124, 7.5], [112, 124, 7.5]], m.GROVES);
  halves([[70, 100, 9], [44, 82, 5], [96, 84, 5.5], [70, 123, 11]], m.MEADOWS);
  const POSTS = [[44, 92], [98, 92], [124, 84], [70, 106]];
  growWood({ posts: POSTS, seed: 7733, gap: 4.2, lone: 26, bushes: 40,
    keep: (x, z) => lakeD(x, z) < 1.25 || Math.hypot(x - LODGE.x, z - LODGE.z) < 9 || Math.hypot(x - BEAR.x, z - BEAR.z) < 8,
    grove: R => ({ r: .4 + R() * .16, h: 12 + R() * 5, kind: 'pine' }),
    single: R => ({ r: .3 + R() * .14, h: 7 + R() * 4, kind: 'pine', lone: true }) });
  hangTargets(POSTS);
  Object.assign(m.ZONE, { x: CX, z: CZ, r: 9, name: 'Frozen Lake' });
  m.AREAS.push({ n: 'The Isle', x: CX, z: CZ, r: 6 }, { n: 'Frozen Lake', x: CX, z: CZ, r: 20 }, { n: "Hunter's Lodge", x: LODGE.x, z: LODGE.z, r: 11 }, { n: "Hunter's Lodge", x: 140 - LODGE.x, z: 140 - LODGE.z, r: 11 },
    { n: 'Bearback Rocks', x: BEAR.x, z: BEAR.z, r: 10 }, { n: 'Bearback Rocks', x: 140 - BEAR.x, z: 140 - BEAR.z, r: 10 }, { n: 'Moss Camp', x: 70, z: 124, r: 15 }, { n: 'Russet Camp', x: 70, z: 16, r: 15 });
  for (const p of [[[70, 118], [70, 98], [70, 86]], [[62, 116], [46, 106], [36, 100]], [[78, 116], [94, 108], [100, 100]]]) { m.PATHS.push(p); m.PATHS.push(p.map(([x, z]) => rot(x, z))); }
};

// ======== Mirewood: a misty swamp. Shallow pools you wade through slowly, boardwalks across them, the Sunken Shrine on an
// island in the middle (ringed by a moat), a stilt hut on one flank and a fallen giant of a log on the other ========
BUILDERS.mirewood = function mirewood(m) {
  const WY = 0, HUT = { x: 108, z: 104 }, GIANT = { x: 30, z: 106 };
  const POOLS = [[40, 95, 10, 6], [101, 93, 8, 7], [24, 114, 7, 5], [120, 116, 6, 5], [70, 104, 5, 3]];   // [x, z, rx, rz] on the south half
  const pools = []; for (const [x, z, rx, rz] of POOLS) { pools.push([x, z, rx, rz]); const [a, b] = rot(x, z); pools.push([a, b, rx, rz]); }
  m.terrainH = ground({ seed: 77.1, amp: .5, laneFrom: 26,
    hills: [[18, 124, 2.4, 10], [122, 124, 2.4, 10], [56, 116, 1.4, 7], [86, 118, 1.4, 7], [12, 96, 1.8, 8], [128, 98, 1.8, 8]],
    shape: (x, z, h) => {
      h = h * .6 + .55;
      const d = Math.hypot(x - CX, z - CZ);
      const moat = (1 - sstep(13.5, 16.5, d)) * sstep(7.5, 9.5, d);   // a ring of water round the island
      const isle = 1 - sstep(6.5, 8.5, d);
      let wet = moat; for (const [px, pz, rx, rz] of pools) { const e = Math.hypot((x - px) / rx, (z - pz) / rz); wet = Math.max(wet, 1 - sstep(.7, 1.05, e)); }
      h = h * (1 - wet) + (WY - .85) * wet;
      return h * (1 - isle) + (WY + .9) * isle;
    } });
  marshAt(m, WY); m.waterName = 'the Mire'; m.woods = 'swamp';
  // a boardwalk: planks a hand above the water from (x0, z0) to (x1, z1), with posts down into it
  const walk = (B, x0, z0, x1, z1, w = .75) => { const L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(-(z1 - z0), x1 - x0); B.at((x0 + x1) / 2, (z0 + z1) / 2, L / 2, w, a, WY + .05, WY + .34, 'wood', 'walk'); };
  both(P => { const B = kit(P);
    walk(B, 70, 87, 70, 74.5); walk(B, 87, 70, 75.5, 70);                  // over the moat to the island (south and east)
    walk(B, 28, 95, 52, 95); walk(B, 101, 84, 101, 102);                     // across the big pools
    walk(B, 64, 104, 76, 104, .6);
    // the Sunken Shrine: broken pillars in a ring on the island, the altar stone in the middle, a fallen pillar to hide behind
    for (let k = 0; k < 4; k++) { const a = k / 8 * Math.PI * 2 + .2, px = CX + Math.cos(a) * 5, pz = CZ + Math.sin(a) * 5, hh = [3.2, 1.3, 2.6, 1.0][k]; B.at(px, pz, .42, .42, a, WY + .6, WY + .9 + hh, 'stone', 'pillar'); }
    B.at(CX + 2.6, CZ - 1.4, 1.6, .38, .9, WY + .6, WY + 1.45, 'stone', 'pillar');
    // the stilt hut: a deck on legs over the water's edge, a rail round it, steps up from the west
    const hx = HUT.x, hz = HUT.z, dk = WY + 2.1;
    B.at(hx, hz, 2.2, 2.2, 0, dk - .25, dk, 'wood', 'floor');
    for (const [ox, oz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) B.at(hx + ox, hz + oz, .14, .14, 0, WY - 1, dk - .25, 'wood', 'post');
    B.at(hx, hz - 2.1, 2.2, .1, 0, dk, dk + 1.05, 'wood', 'rail'); B.at(hx + 2.1, hz, .1, 2.2, 0, dk, dk + 1.05, 'wood', 'rail'); B.at(hx + .9, hz + 2.1, 1.3, .1, 0, dk, dk + 1.05, 'wood', 'rail');
    B.at(hx + 1.2, hz + .6, 1, 1.4, 0, dk, dk + 2.2, 'wood', 'hut');   // the hut itself at the back of the deck
    for (let k = 0; k < 5; k++) B.at(hx - 2.6 - k * .7, hz - .6, .35, .6, 0, WY - .9, WY + .3 + .42 * (5 - k) - .1, 'wood', 'stair');
    // the fallen giant: an old tree lying across a pool, its trunk a high road you can run along
    B.at(GIANT.x, GIANT.z, 9, .95, .25, WY - .4, WY + 1.5, 'wood', 'log');
    B.at(GIANT.x - 9.5, GIANT.z + 2.4, 1.6, 1.4, .25, WY - .6, WY + 2.0, 'wood', 'stump');
    // tussocks, stones and old fences through the reeds
    B.rock(58, 88, 1.3, 1.2, .3); B.rock(84, 86, 1.1, 1.3, 1); B.log(52, 108, 2.6, .5); B.log(90, 110, 2.6, -.4); B.wall(64, 96, 2.2, .1, 1.2); B.rock(118, 84, 1.4, 1.2, .5);
    B.log(16, 84, 2.4, 1.3); B.rock(14, 106, 1.4, 1.3, .2); B.wall(44, 120, 2.2, .3, 1.1); B.wall(96, 118, 2.4, -.3, 1.2); B.rock(32, 128, 1.4, 1.3, 0); B.rock(108, 128, 1.4, 1.3, 0);
  });
  camps();
  spots([[56, 82], [86, 82], [12, 118]], m.PICKUPS);
  turned([[70, 126], [30, 126], [112, 126], [12, 102], [48, 106], [92, 106], [128, 104], [54, 78], [86, 80], [20, 80]], m.FFA_SPAWNS);
  halves([[20, 84, 9], [56, 112, 7], [88, 100, 6], [124, 84, 8], [44, 128, 6], [118, 128, 7]], m.GROVES);
  halves([[70, 100, 6], [40, 84, 5], [100, 82, 5], [70, 123, 11]], m.MEADOWS);
  const POSTS = [[46, 102], [96, 104], [124, 92], [62, 110]];
  growWood({ posts: POSTS, seed: 5151, gap: 5.2, lone: 22, bushes: 60,
    keep: (x, z) => Math.hypot(x - CX, z - CZ) < 17 || Math.hypot(x - HUT.x, z - HUT.z) < 6.5 || (Math.abs(x - GIANT.x) < 12 && Math.abs(z - GIANT.z) < 5),
    grove: R => ({ r: .48 + R() * .2, h: 10 + R() * 3, kind: 'willow' }),
    single: R => { const dead = R() < .3; return { r: dead ? .26 + R() * .08 : .38 + R() * .12, h: dead ? 6 + R() * 2 : 7 + R() * 2, kind: dead ? 'snag' : 'willow', lone: true }; } });
  hangTargets(POSTS);
  Object.assign(m.ZONE, { x: CX, z: CZ, r: 7, name: 'Sunken Shrine' });
  m.AREAS.push({ n: 'Sunken Shrine', x: CX, z: CZ, r: 9 }, { n: 'Stilt Hut', x: HUT.x, z: HUT.z, r: 9 }, { n: 'Stilt Hut', x: 140 - HUT.x, z: 140 - HUT.z, r: 9 },
    { n: 'Fallen Giant', x: GIANT.x, z: GIANT.z, r: 11 }, { n: 'Fallen Giant', x: 140 - GIANT.x, z: 140 - GIANT.z, r: 11 }, { n: 'Moss Camp', x: 70, z: 124, r: 15 }, { n: 'Russet Camp', x: 70, z: 16, r: 15 });
  for (const p of [[[70, 118], [70, 106], [70, 92]], [[62, 116], [46, 106], [30, 100]], [[78, 116], [94, 108], [104, 100]]]) { m.PATHS.push(p); m.PATHS.push(p.map(([x, z]) => rot(x, z))); }
};

// where a target is at room time t (fixed ones never move)
export function targetPos(k, t) {
  if (k.kind !== 'fly') return [k.x, k.y, k.z];
  const a = k.ph + k.dir * t * Math.PI * 2 / k.per; return [k.x + Math.cos(a) * k.rad, k.y + Math.sin(t * 1.1 + k.ph) * .7, k.z + Math.sin(a) * k.rad];
}
// the first target an arrow's step from p0 to p1 meets (up: which are standing), with how far along it, or null
export function sweepTargets(p0, p1, up, t) {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2], L2 = dx * dx + dy * dy + dz * dz; if (L2 < 1e-9) return null; let best = null;
  for (let i = 0; i < M.TARGETS.length; i++) {
    if (!up[i]) continue; const k = M.TARGETS[i], c = targetPos(k, t), r = k.kind === 'fly' ? TARGET.rFly : TARGET.r;
    const fx = p0[0] - c[0], fy = p0[1] - c[1], fz = p0[2] - c[2], b = 2 * (fx * dx + fy * dy + fz * dz), cc = fx * fx + fy * fy + fz * fz - r * r, disc = b * b - 4 * L2 * cc;
    if (disc < 0) continue; const tt = (-b - Math.sqrt(disc)) / (2 * L2); if (tt < 0 || tt > 1 || (best && tt >= best.t)) continue;
    best = { i, t: tt, p: [p0[0] + dx * tt, p0[1] + dy * tt, p0[2] + dz * tt] };
  }
  return best;
}

export function areaName(x, z) {
  for (const a of M.AREAS) if (Math.hypot(x - a.x, z - a.z) < a.r) return a.n;
  if (M.waterName && creekDist(x, z) < 6) return M.waterName;
  return (z < CZ ? 'North' : 'South') + (x < 47 ? '-west' : x > 93 ? '-east' : '') + ' ' + (M.woods || 'woods');
}
export const gridRef = (x, z) => 'ABCDEFG'[Math.max(0, Math.min(6, Math.floor(x / 20)))] + (Math.max(0, Math.min(6, Math.floor(z / 20))) + 1);
export const TEAMS = [{ n: 'Moss', col: '#7fae5a' }, { n: 'Russet', col: '#c7743e' }];

// ---- a coarse grid over the map so movement and arrows only test what is nearby
const CELL = 10, GN = Math.ceil(MAP_SIZE / CELL);
function buildGrid(m) {
  const GRID = m.GRID = Array.from({ length: GN * GN }, () => ({ t: [], b: [] }));
  for (const [i, t] of m.TREES.entries()) { const gx = Math.floor(t.x / CELL), gz = Math.floor(t.z / CELL); for (let a = gx - 1; a <= gx + 1; a++) for (let c = gz - 1; c <= gz + 1; c++) if (a >= 0 && c >= 0 && a < GN && c < GN) GRID[c * GN + a].t.push(i); }
  for (const [i, b] of m.BOXES.entries()) {
    const ext = Math.hypot(b.hx, b.hz) + 1, x0 = Math.floor((b.x - ext) / CELL), x1 = Math.floor((b.x + ext) / CELL), z0 = Math.floor((b.z - ext) / CELL), z1 = Math.floor((b.z + ext) / CELL);
    for (let a = x0; a <= x1; a++) for (let c = z0; c <= z1; c++) if (a >= 0 && c >= 0 && a < GN && c < GN) GRID[c * GN + a].b.push(i);
  }
}
function near(x, z) { if (!M.GRID) return { t: M.TREES.map((_, i) => i), b: M.BOXES.map((_, i) => i) }; const gx = Math.max(0, Math.min(GN - 1, Math.floor(x / CELL))), gz = Math.max(0, Math.min(GN - 1, Math.floor(z / CELL))); return M.GRID[gz * GN + gx]; }
const local = (b, x, z) => { const dx = x - b.x, dz = z - b.z; return [dx * b.c - dz * b.s, dx * b.s + dz * b.c]; };   // into the box's own frame
const world = (b, lx, lz) => [b.x + lx * b.c + lz * b.s, b.z - lx * b.s + lz * b.c];

// ---- standing and walking
export function groundAt(x, z, y) {
  let g = terrainH(x, z);
  for (const i of near(x, z).b) { const b = M.BOXES[i]; if (b.y1 <= g || b.y1 > y + PL.step + .01) continue; const [lx, lz] = local(b, x, z); if (Math.abs(lx) <= b.hx + .05 && Math.abs(lz) <= b.hz + .05) g = b.y1; }
  return g;
}
// push a body (feet at y, height h) out of trunks and boxes it overlaps
function pushOut(p, h) {
  const cell = near(p.x, p.z);
  for (const i of cell.t) {
    const t = M.TREES[i], dx = p.x - t.x, dz = p.z - t.z, d = Math.hypot(dx, dz), m = t.r * 1.12 + PL.r;
    if (d < m && d > 1e-6) { p.x = t.x + dx / d * m; p.z = t.z + dz / d * m; }
  }
  for (const i of cell.b) {
    const b = M.BOXES[i];
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
  for (const i of cell.t) { const t = M.TREES[i]; if (Math.hypot(x - t.x, z - t.z) < t.r * 1.12 + PL.r - .06) return true; }
  for (const i of cell.b) { const b = M.BOXES[i]; if (b.y1 <= y + PL.step || b.y0 >= y + h) continue; const [lx, lz] = local(b, x, z); if (Math.abs(lx) < b.hx + PL.r - .06 && Math.abs(lz) < b.hz + PL.r - .06) { const cx = Math.max(-b.hx, Math.min(b.hx, lx)), cz = Math.max(-b.hz, Math.min(b.hz, lz)); if (Math.hypot(lx - cx, lz - cz) < PL.r - .06) return true; } }
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
      if (seenT.has(i)) continue; seenT.add(i); const t = M.TREES[i];
      const fx = p0[0] - t.x, fz = p0[2] - t.z, a = dx * dx + dz * dz, b = 2 * (fx * dx + fz * dz), c = fx * fx + fz * fz - t.r * t.r, disc = b * b - 4 * a * c;
      if (a < 1e-9 || disc < 0) continue;
      const tt = (-b - Math.sqrt(disc)) / (2 * a); if (tt < 0 || tt > 1 || (best && tt >= best.t)) continue;
      const y = p0[1] + dy * tt, g = terrainH(t.x, t.z); if (y < g - .5 || y > g + t.h * .62) continue;
      best = { t: tt, mat: 'wood', kind: 'tree' };
    }
    for (const i of cell.b) {
      if (seenB.has(i)) continue; seenB.add(i); const b = M.BOXES[i];
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
// Bows: every bow shoots exactly the same; a bow changes the look, the arrows' trail and the finisher (what happens to the
// archer it eliminates). Listed cheapest first; the price climbs as you go down the shop.
// d: what it looks like; fin: its finisher.
const B = (id, n, price, d, fin) => ({ id, n, price, d, fin });
export const BOWS = [
  B('longbow', "Forester's Longbow", 0, 'Carved dark wood, a leather grip and a simple cord.', 'The archer it finishes bursts into blocks that bounce away.'),
  B('cupid', "Cupid's Bow", 150, 'Rose-gold limbs, carved hearts and red ribbon.', 'Hearts swirl, a giant heart stamps down, petals everywhere.'),
  B('yardstick', 'The Yardstick', 200, 'Bent wooden rulers strapped together with tape.', 'A giant ruler swings down: THWACK. Flattened.'),
  B('partypopper', 'Party Popper', 250, 'Candy-striped limbs with curly streamers and a party hat on each tip.', 'A giant party popper goes off and they burst into confetti.'),
  B('pocketsize', 'Pocket Bow', 300, 'A chunky toy bow in bright plastic, with big round buttons.', 'They shrink smaller and smaller, squeak, and pop.'),
  B('sugarrush', 'Sugar Rush', 350, 'Twisted red-and-white candy cane with a lollipop on each tip.', 'They rattle, then burst into a shower of sweets.'),
  B('skyfloat', 'Skyfloat', 400, 'A string of shiny balloons in every colour, tied to a light frame.', 'A bunch of balloons lifts them into the sky, where they pop.'),
  B('bitbow', '8-Bit Bow', 500, 'Built from chunky red and white pixels, like an old arcade game.', 'They break into pixels that float away: GAME OVER.'),
  B('bubbleburst', 'Bubbleburst', 600, 'A chain of shimmering soap bubbles on a silver frame.', 'A giant bubble traps them and floats off until it pops.'),
  B('blossom', 'Blossom', 700, 'A living green vine covered in pink flowers.', 'Flowers spring up and they turn into a blooming bush.'),
  B('gloop', 'Gloop', 800, 'Wobbly lime-green slime that never quite sets.', 'They melt into a bubbling puddle of slime.'),
  B('beekeeper', 'Beekeeper', 900, 'Honey-gold with black stripes, a honeycomb grip and a bee on each tip.', 'An angry swarm of bees chases them out of the fight.'),
  B('origami', 'Origami', 1000, 'Folded white paper, crisp creases, a paper crane on each tip.', 'They fold flat into a paper plane and glide away.'),
  B('cashout', 'Cashout', 1200, 'Limbs wrapped in stacks of bills, a metal grip.', 'They burst into a cloud of cash and spinning coins.'),
  B('frostfall', 'Frostfall', 1400, 'Snow-white birch with a red knitted scarf and snowflake tips.', 'Snow piles up and they become a snowman with a carrot nose.'),
  B('toonbow', 'Toon Bow', 1600, 'Cartoon red with thick black outlines and giant bolts.', 'A cartoon anvil drops on them: BONK, stars and all.'),
  B('hexbow', 'Hexbow', 1800, 'Twisted purple wood, a bubbling potion bottle on each tip.', 'A puff of green smoke, and a frog hops away.'),
  B('rootbind', 'Rootbind', 2000, 'Gnarled roots, thorns and fresh leaves.', 'Roots burst from the ground and drag them under.'),
  B('dune', 'Dune', 2250, 'Carved sandstone with turquoise inlay and golden scarab tips.', 'They turn to sand and blow away on the wind.'),
  B('frostbite', 'Frostbite', 2500, 'Clear blue ice crystal with frozen spikes on the tips.', 'A block of ice freezes them solid, then shatters.'),
  B('emberwood', 'Emberwood', 2800, 'Charred black wood split by glowing embers, a flame on each tip.', 'They catch fire and crumble into ash.'),
  B('gorgon', 'Gorgon', 3100, 'Green bronze scales, with a snake head rearing from each tip.', 'They turn to stone and crumble to rubble.'),
  B('discofever', 'Disco Fever', 3400, 'Mirror-ball silver that throws rainbow sparkles, a disco ball on each tip.', 'A disco ball drops in, they dance, and vanish in glitter.'),
  B('galeforce', 'Galeforce', 3750, 'Sleek white-and-teal wind blades with feathers.', 'A tornado spins up and whisks them into the sky.'),
  B('skyrocket', 'Skyrocket', 4100, 'Red-and-white rocket tubes with fins on the tips.', 'They blast off into the sky and explode like a firework.'),
  B('thunderclap', 'Thunderclap', 4500, 'Dark steel blades with yellow lightning running through them.', 'A bolt of lightning strikes them: ZAP.'),
  B('spectral', 'Spectral', 5000, 'See-through ghostly blue that glows in the shade.', 'They fall, and their ghost floats up and away.'),
  B('magmacore', 'Magmacore', 5500, 'Black volcanic rock with lava glowing through the cracks.', 'A pool of lava opens and they sink into it.'),
  B('arrowstorm', 'Arrowstorm', 6000, 'Polished steel and gold with white wings on the tips.', 'A storm of arrows rains down on them from the sky.'),
  B('abductor', 'Abductor', 6500, 'Silver alien tech with green lights and a tiny saucer on each tip.', 'A flying saucer beams them up and zooms off.'),
  B('midas', 'Midas', 7000, 'Solid gold set with rubies.', 'They turn to a solid gold statue and topple over.'),
  B('arcane', 'Arcane', 8000, 'Midnight blue with glowing runes and a crystal orb on each tip.', 'A rune circle lights up and they vanish in a storm of sparks.'),
  B('starfall', 'Starfall', 9000, 'Deep space blue scattered with gold stars.', 'A meteor falls from the sky: KABOOM.'),
  B('voidstring', 'Voidstring', 10000, 'Pure black with purple light and rings that never stop turning.', 'A black hole opens and swallows them whole.'),
];
// rarity by price, for the shop's colours
export const tierOf = price => price === 0 ? 'Starter' : price < 500 ? 'Common' : price < 1200 ? 'Rare' : price < 2500 ? 'Epic' : price < 4500 ? 'Legendary' : 'Mythic';
export const BOW_IDS = BOWS.map(b => b.id);
// coins for online matches: for playing, each elimination, each round your side wins, and the win itself
// coins: online matches pay these (and targets), up to maxMatch; bot matches pay the same rows up to maxBots; offline
// earnings (bot matches and targets outside online matches) are capped at offlineHour an hour on the server
export const COINS = { start: 150, match: 25, kill: 15, round: 10, win: 50, ffaTop: 50, maxMatch: 1000, maxBots: 300, offlineHour: 1500 };

useMap('kingswood');   // the map in use until a room asks for another
