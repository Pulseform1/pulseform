# ---------------- identity ----------------
rep('<title>Cluck Launch</title>', '<title>Cluck Launch 2</title>')
rep('<span class="b">LAUNCH<em>!</em></span>', '<span class="b">LAUNCH<em>2</em></span>')
rep('<div class="tag">Slide, fly and blast one brave chicken all the way to space!</div>', '<div class="tag">Launch Pepper all the way round the world. Smash everything in the way for cash!</div>')
s = s.replace('Nugget', 'Pepper')
rep("const SAVE_KEY = 'cluck-launch-save-v1';", "const SAVE_KEY = 'cluck-launch-2-save-v1';")
rep("""<div class="step"><canvas id="hw4" width="144" height="144"></canvas><div><b>4. Upgrade</b>Every flight earns coins. Buy better gear, fly higher, and reach space!</div></div>""",
    """<div class="step"><canvas id="hw4" width="144" height="144"></canvas><div><b>4. Smash &amp; upgrade</b>Crash through fences, hay, cacti and more for cash. Too slow and you bonk! Buy gear and go all the way round the world.</div></div>""")
rep("""<div class="tip">Grab coins, pop balloons for a lift, and bounce on pink clouds. Watch out for birds, planes and UFOs up high!</div>""",
    """<div class="tip">The world is 40,075 m round: farm, prairie, desert, ocean, jungle, canyon, the frozen north and the megacity. Skip across the sea, bounce on springboards, fly through gold rings. A better helmet smashes harder and loses less speed.</div>""")
rep('<div class="step"><canvas id="hw1" width="144" height="144"></canvas><div><b>1. Slide!</b>Press <b style="display:inline">Space</b> or tap to slide down the snowy ramp and jump off the end.</div></div>',
    '<div class="step"><canvas id="hw1" width="144" height="144"></canvas><div><b>1. Slide!</b>Press <b style="display:inline">Space</b> or tap to slide down the ramp and jump off the end.</div></div>')
rep("""    <h2>SPACE!</h2>
    <p id="endText"></p>
    <ul>
      <li>New gear in the shop: the <b>Star Engine</b> and <b>Star Tank</b>.</li>
      <li>Hard challenges for real sky pros.</li>
      <li>The Moon is up there at 12,000 m. Can you touch it?</li>
    </ul>""", """    <h2>AROUND THE WORLD!</h2>
    <p id="endText"></p>
    <ul>
      <li>Hard challenges for real globe-trotters, and the <b>Egg</b> tab: hatch a new egg for golden perks.</li>
      <li>Every extra lap pays a big bonus. How many laps can Pepper do?</li>
      <li>Space is still up there too, if you point your beak at it.</li>
    </ul>""")
# ---------------- the world: once round is 40,075 m, through themed regions ----------------
rep("const layerAt = y => { let z = LAYERS[0]; for (const q of LAYERS) if (y >= q.at) z = q; return z; };", r"""const layerAt = y => { let z = LAYERS[0]; for (const q of LAYERS) if (y >= q.at) z = q; return z; };
/* ---------- Cluck Launch 2: the trip round the world ----------
   The ground is a loop 40,075 m long. Each region has its own ground, its own things to smash (worth more the
   further you get), its own decorations. The oceans are water: hit them flat and fast and you skip; dive in and
   you splash down. */
const WORLD = 40075;
const REGIONS = [
  { id: 'farm', name: 'Home Farm', at: 0, g: ['#9bdc6a', '#6fb64a', '#4e8a34'], amp: 1, mult: 1, sky: 0 },
  { id: 'prairie', name: 'Golden Prairie', at: 1500, g: ['#e8d77a', '#cdb256', '#a48a3c'], amp: 1.15, mult: 1.35 },
  { id: 'desert', name: 'Sizzling Desert', at: 4500, g: ['#ffe4a0', '#f0c472', '#cf9a52'], amp: 1.7, mult: 1.8 },
  { id: 'ocean', name: 'Big Blue Ocean', at: 9000, water: true, mult: 2.3 },
  { id: 'jungle', name: 'Jungle Coast', at: 14500, g: ['#6fd36a', '#3fa84a', '#2a7a36'], amp: 1.35, mult: 2.9 },
  { id: 'canyon', name: 'Red Rock Canyon', at: 19500, g: ['#f2a070', '#d9764a', '#a4502e'], amp: 2, mult: 3.6 },
  { id: 'arctic', name: 'Frosty North', at: 24500, g: ['#ffffff', '#eef6ff', '#bcd4ee'], amp: 1.45, mult: 4.6 },
  { id: 'city', name: 'Neon Megacity', at: 29500, g: ['#9aa0ad', '#767c8a', '#535866'], amp: 0.25, mult: 6 },
  { id: 'sea', name: 'Endless Sea', at: 34500, water: true, mult: 7.5 },
  { id: 'home', name: 'Home Farm, again!', at: 39400, g: ['#9bdc6a', '#6fb64a', '#4e8a34'], amp: 1, mult: 8 }
];
const wmod = x => ((x % WORLD) + WORLD) % WORLD;
const regionIdx = x => { const m = wmod(x); let i = 0; for (let k = 0; k < REGIONS.length; k++) if (m >= REGIONS[k].at) i = k; return i; };
const regionAt = x => REGIONS[regionIdx(x)];
const regionEnd = i => i + 1 < REGIONS.length ? REGIONS[i + 1].at : WORLD;
// how far x is inside its region (0 at either edge): water needs a shore before it starts
const inside = x => { const m = wmod(x), i = regionIdx(x); return Math.min(m - REGIONS[i].at, regionEnd(i) - m); };
const isWater = x => x > 600 && regionAt(x).water && inside(x) > 140;
const SEA = -2;   // the water's surface
/* things to smash, by region: hp is how hard you must hit (m/s of speed times your helmet), pay is cash */
const OBS = {
  farm: [['fence', 12, 1.4, 1.3, 4], ['hay', 20, 1.6, 1.4, 7], ['pumpkin', 6, 0.9, 0.8, 3], ['scarecrow', 16, 0.9, 2.4, 6], ['tractor', 70, 3.2, 2.2, 30], ['barn', 140, 5, 4.5, 70]],
  prairie: [['fence', 12, 1.4, 1.3, 4], ['hay', 20, 1.6, 1.4, 7], ['wagon', 45, 2.6, 1.8, 20], ['windpump', 60, 1.2, 4.5, 26], ['tnt', 15, 1, 1, 10]],
  desert: [['cactus', 18, 0.9, 2.2, 8], ['sandcastle', 10, 1.6, 1.1, 6], ['tumble', 3, 0.9, 0.9, 2], ['pot', 8, 0.8, 0.9, 6], ['pyramid', 120, 4, 2.6, 60], ['tnt', 15, 1, 1, 10]],
  ocean: [['buoy', 14, 0.9, 1.4, 8], ['float', 22, 1.4, 1, 12], ['boat', 60, 3.4, 2.6, 34]],
  jungle: [['crate', 22, 1.2, 1.2, 10], ['tiki', 45, 2.6, 2.6, 22], ['palm', 30, 0.7, 4.5, 14], ['idol', 140, 2.2, 3.4, 75], ['tnt', 15, 1, 1, 10]],
  canyon: [['boulder', 90, 2.4, 2.2, 40], ['cart', 40, 2, 1.5, 20], ['tnt', 15, 1, 1, 10], ['cactus', 18, 0.9, 2.2, 8], ['totem', 70, 1.1, 4, 34]],
  arctic: [['ice', 50, 1.6, 1.6, 24], ['igloo', 80, 3, 1.9, 38], ['sculpt', 30, 1.2, 2.4, 16], ['crate', 22, 1.2, 1.2, 10]],
  city: [['cone', 4, 0.6, 0.8, 2], ['mailbox', 18, 0.7, 1.4, 8], ['hydrant', 25, 0.6, 1, 10], ['booth', 50, 1.2, 2.6, 24], ['truck', 160, 4.5, 3, 80], ['billboard', 120, 4, 5, 60], ['tnt', 15, 1, 1, 10]],
  sea: [['buoy', 14, 0.9, 1.4, 8], ['float', 22, 1.4, 1, 12], ['boat', 60, 3.4, 2.6, 34], ['iceberg', 110, 4, 3, 55]],
  home: [['fence', 12, 1.4, 1.3, 4], ['hay', 20, 1.6, 1.4, 7], ['barn', 140, 5, 4.5, 70], ['tractor', 70, 3.2, 2.2, 30]]
};""")
rep("""const RAMPS = [""", """const HELMETS = [
  { name: 'Bare Beak', smash: 1, keep: 1, price: 0, desc: 'Just a beak. It hurts. A lot.' },
  { name: 'Tin Bucket', smash: 1.5, keep: 0.9, price: 30, desc: 'A bucket on your head. Fences fear you now.' },
  { name: 'Football Helmet', smash: 2.2, keep: 0.8, price: 140, desc: 'Padded, shiny, and ready for contact.' },
  { name: 'Battering Ram', smash: 3.2, keep: 0.72, price: 500, desc: 'A wooden ram strapped to your beak. BONK.' },
  { name: 'Drill Beak', smash: 4.6, keep: 0.62, price: 1500, desc: 'A spinning steel drill. Nothing stays in one piece.' },
  { name: 'Wrecking Helmet', smash: 6.5, keep: 0.54, price: 4500, desc: 'A spiked iron ball. Barns, beware.' },
  { name: 'Diamond Drill', smash: 9, keep: 0.46, price: 14000, desc: 'Cuts through icebergs like butter.', post: 1 },
  { name: 'Meteor Head', smash: 13, keep: 0.38, price: 42000, desc: 'Your head is on fire. In a good way.', post: 2 }
];
const RAMPS = [""")
# a black hen to start
rep("""const SKINS = [
  { id: 'white', name: 'Classic White', price: 0,""", """const SKINS = [
  { id: 'midnight', name: 'Midnight (Pepper)', price: 0, body: '#2a2a33', shade: '#17171d', wing: '#3a3a47' },
  { id: 'white', name: 'Classic White', price: 60,""")
rep("hat: 'none', skin: 'white',", "hat: 'none', skin: 'midnight',")
rep("own: { hats: ['none'], skins: ['white'],", "own: { hats: ['none'], skins: ['midnight'],")
rep("tier: { ramp: 0, sled: 0, glider: 0, rocket: 0, tank: 0 },", "tier: { ramp: 0, sled: 0, glider: 0, rocket: 0, tank: 0, helmet: 0 },")
rep("gad: { cone: 0, magnet: 0, boots: 0, shield: 0, burner: 0, doubler: 0, recycler: 0 },", "gad: { cone: 0, magnet: 0, boots: 0, shield: 0, burner: 0, doubler: 0, recycler: 0, piggy: 0, skipper: 0, wheels: 0, tail: 0 },")
rep("best: { dist: 0, alt: 0, speed: 0 },", "best: { dist: 0, alt: 0, speed: 0, smash: 0, cash: 0 }, laps: 0,")
rep("""  { id: 'recycler', name: 'Fuel Recycler', desc: 'Slowly refills your tank up in space while the rocket is off.', lv: [0.12, 0.22, 0.35], prices: [9000, 26000, 60000], post: 2 }
];""", """  { id: 'recycler', name: 'Fuel Recycler', desc: 'Slowly refills your tank up in space while the rocket is off.', lv: [0.12, 0.22, 0.35], prices: [9000, 26000, 60000], post: 2 },
  { id: 'piggy', name: 'Piggy Bank', desc: 'Everything you smash pays more.', lv: [1.3, 1.65, 2.1], prices: [120, 900, 5000] },
  { id: 'skipper', name: 'Skipping Feet', desc: 'Skip across water like a stone: at lower speeds, and losing less.', lv: [1, 2, 3], prices: [600, 2500, 9000] },
  { id: 'wheels', name: 'Belly Wheels', desc: 'Little wheels under your belly. Roll on and on after you land.', lv: [0.6, 0.38, 0.22], prices: [200, 1100, 5500] },
  { id: 'tail', name: 'Tail Fan', desc: 'A buzzing fan on your tail: a gentle push the whole time you fly.', lv: [0.5, 1, 1.8], prices: [700, 3500, 16000] }
];""")
rep("""const CATS = [
  { id: 'ramp', name: 'Ramp', list: RAMPS },""", """const CATS = [
  { id: 'ramp', name: 'Ramp', list: RAMPS },
  { id: 'helmet', name: 'Helmet', list: HELMETS },""")
# late gear: unlocked by how far round the world you have been
rep("const unlocked = it => !it.post || (it.post === 1 || it.post === true ? S.won : it.post === 2 ? S.best.alt >= MOON : S.best.alt >= 30000);",
    "const unlocked = it => !it.post || (it.post === 1 || it.post === true ? S.best.dist >= REGIONS[3].at : it.post === 2 ? S.best.dist >= REGIONS[5].at : S.best.dist >= REGIONS[7].at);")
rep("const lockText = it => it.post === 2 ? 'Touch the Moon (12,000 m) to unlock' : it.post === 3 ? 'Reach the Ringed Giant (30,000 m) to unlock' : 'Reach space to unlock';",
    "const lockText = it => it.post === 2 ? `Reach ${REGIONS[5].name} (${fmt(REGIONS[5].at)} m) to unlock` : it.post === 3 ? `Reach ${REGIONS[7].name} (${fmt(REGIONS[7].at)} m) to unlock` : `Reach the ${REGIONS[3].name} (${fmt(REGIONS[3].at)} m) to unlock`;")
# records and missions for a trip round the world
rex(r"const RECORDS = \[\n.*?\n\];", """const RECORDS = [
  ...[150, 400, 800, 1500, 3000, 4500, 7000, 9000, 14500, 19500, 24500, 29500, 34500, 40075].map((n, i) => ({ id: 'd' + n, kind: 'dist', n, pay: [15, 40, 90, 200, 400, 700, 1100, 1800, 3500, 6000, 10000, 16000, 24000, 50000][i] })),
  ...[100, 400, 1500, 4000].map((n, i) => ({ id: 'a' + n, kind: 'alt', n, pay: [30, 150, 600, 2500][i] })),
  ...[100, 200, 400, 700, 1000, 1500, 2500, 5000, 10000].map((n, i) => ({ id: 's' + n, kind: 'speed', n, pay: [15, 50, 150, 400, 800, 1500, 3000, 9000, 20000][i] }))
];""")
rex(r"const MISSIONS = \[\n.*?\n\];\n// unlocked after the ending: hard challenges for sandbox play\nconst CHALLENGES = \[\n.*?\n\];", """const MISSIONS = [
  { id: 'd100', text: 'Fly 100 m', stat: 'dist', n: 100, pay: 20 },
  { id: 'sm1', text: 'Smash anything', stat: 'smash', n: 1, pay: 15 },
  { id: 'buy1', text: 'Buy any upgrade', stat: 'bought', n: 1, pay: 20 },
  { id: 'sm5', text: 'Smash 5 things in one run', stat: 'smash', n: 5, pay: 40 },
  { id: 'kmh80', text: 'Go 80 km/h', stat: 'speed', n: 80, pay: 30 },
  { id: 'd300', text: 'Fly 300 m', stat: 'dist', n: 300, pay: 50 },
  { id: 'cash50', text: 'Earn 50 smash cash in one run', stat: 'cashRun', n: 50, pay: 60 },
  { id: 'spring', text: 'Bounce on a springboard', stat: 'springs', n: 1, pay: 60 },
  { id: 'rocket', text: 'Use a rocket for 1 second', stat: 'rocketT', n: 1, pay: 60 },
  { id: 'ring', text: 'Fly through a gold ring', stat: 'rings', n: 1, pay: 70 },
  { id: 'hat', text: 'Buy a hat or a skin', stat: 'looks', n: 1, pay: 60 },
  { id: 'prairie', text: 'Reach the Golden Prairie (1,500 m)', stat: 'dist', n: 1500, pay: 200 },
  { id: 'sm20', text: 'Smash 20 things in one run', stat: 'smash', n: 20, pay: 200 },
  { id: 'tnt', text: 'Blow up a TNT crate', stat: 'tnts', n: 1, pay: 150 },
  { id: 'kmh250', text: 'Go 250 km/h', stat: 'speed', n: 250, pay: 220 },
  { id: 'desert', text: 'Reach the Sizzling Desert (4,500 m)', stat: 'dist', n: 4500, pay: 500 },
  { id: 'cash400', text: 'Earn 400 smash cash in one run', stat: 'cashRun', n: 400, pay: 400 },
  { id: 'ocean', text: 'Reach the Big Blue Ocean (9,000 m)', stat: 'dist', n: 9000, pay: 900 },
  { id: 'skip3', text: 'Skip 3 times across the water', stat: 'skips', n: 3, pay: 700 },
  { id: 'jungle', text: 'Cross the ocean to the Jungle Coast (14,500 m)', stat: 'dist', n: 14500, pay: 1500 },
  { id: 'sm60', text: 'Smash 60 things in one run', stat: 'smash', n: 60, pay: 1200 },
  { id: 'canyon', text: 'Reach Red Rock Canyon (19,500 m)', stat: 'dist', n: 19500, pay: 2500 },
  { id: 'arctic', text: 'Reach the Frosty North (24,500 m)', stat: 'dist', n: 24500, pay: 4000 },
  { id: 'city', text: 'Reach the Neon Megacity (29,500 m)', stat: 'dist', n: 29500, pay: 6500 },
  { id: 'sea', text: 'Reach the Endless Sea (34,500 m)', stat: 'dist', n: 34500, pay: 9000 },
  { id: 'world', text: 'Fly ALL the way round the world (40,075 m)', stat: 'dist', n: WORLD, pay: 20000 }
];
// unlocked after the first lap: hard challenges
const CHALLENGES = [
  { id: 'c_sm150', text: 'Smash 150 things in one run', stat: 'smash', n: 150, pay: 8000 },
  { id: 'c_cash5k', text: 'Earn 5,000 smash cash in one run', stat: 'cashRun', n: 5000, pay: 10000 },
  { id: 'c_skip10', text: 'Skip 10 times in one run', stat: 'skips', n: 10, pay: 9000 },
  { id: 'c_kmh5k', text: 'Go 5,000 km/h', stat: 'speed', n: 5000, pay: 25000 },
  { id: 'c_space', text: 'Reach space (4,000 m high)', stat: 'alt', n: SPACE, pay: 20000 },
  { id: 'c_lap2', text: 'Go round the world twice in one flight (80,150 m)', stat: 'dist', n: WORLD * 2, pay: 80000 }
];""")
# ---------------- the chicken's numbers ----------------
rep("""    shield: S.gad.shield ? GADGETS[3].lv[S.gad.shield - 1] : 0
  };""", """    shield: S.gad.shield ? GADGETS[3].lv[S.gad.shield - 1] : 0,
    smash: HELMETS[S.tier.helmet || 0].smash, keep: HELMETS[S.tier.helmet || 0].keep,
    piggy: S.gad.piggy ? GADGETS[7].lv[S.gad.piggy - 1] : 1,
    skipMin: [24, 18, 13, 9][S.gad.skipper || 0], skipKeep: [0.8, 0.86, 0.91, 0.95][S.gad.skipper || 0],
    wheel: S.gad.wheels ? GADGETS[9].lv[S.gad.wheels - 1] : 1,
    tail: S.gad.tail ? GADGETS[10].lv[S.gad.tail - 1] : 0
  };""")
rep("""    dist: Math.round(r.dist * 0.25 * k),
    alt: Math.round(Math.max(0, r.alt - LIP_ALT) * 1.0 * k),""", """    dist: Math.round(r.dist * 0.2 * k),
    alt: Math.round(Math.max(0, r.alt - LIP_ALT) * 0.3 * k),
    smash: Math.round(r.cash * k),
    laps: Math.round(r.laps * 25000 * k),""")
# ---------------- the ground: hills shaped by region, flat sea where there is ocean ----------------
rep("""function groundY(x) {
  if (x < 2) return PLATEAU;
  if (x < 520) { const u = (x - 2) / 518; return PLATEAU * (1 - (0.5 - 0.5 * Math.cos(Math.PI * u))) + Math.sin(u * 9) * 1.2 * u * (1 - u); }
  const k = Math.min(1, (x - 520) / 300);
  return k * (5 * Math.sin((x - 520) / 140) + 2.2 * Math.sin((x - 520) / 47 + 1) + 7 * Math.sin((x - 520) / 610));
}""", """// how hilly the ground is here, blending smoothly across region edges (the sea is flat, and below the land)
function landShape(x) {
  const m = wmod(x), i = regionIdx(x), R = REGIONS[i], N = REGIONS[(i + 1) % REGIONS.length], P = REGIONS[(i + REGIONS.length - 1) % REGIONS.length];
  const amp = r => r.water ? 0 : r.amp, base = r => r.water ? SEA - 3 : 0;
  let a = amp(R), b = base(R); const toEnd = regionEnd(i) - m, fromStart = m - R.at, B = 260;
  if (toEnd < B) { const t = sm((B - toEnd) / B) * 0.5; a = lerp(a, amp(N), t); b = lerp(b, base(N), t); }
  if (fromStart < B && x > B) { const t = sm((B - fromStart) / B) * 0.5; a = lerp(a, amp(P), t); b = lerp(b, base(P), t); }
  return [a, b];
}
const sm = t => t * t * (3 - 2 * t);
function groundY(x) {
  if (x < 2) return PLATEAU;
  if (x < 520) { const u = (x - 2) / 518; return PLATEAU * (1 - (0.5 - 0.5 * Math.cos(Math.PI * u))) + Math.sin(u * 9) * 1.2 * u * (1 - u); }
  const k = Math.min(1, (x - 520) / 300), [a, b] = landShape(x);
  return b + k * a * (5 * Math.sin((x - 520) / 140) + 2.2 * Math.sin((x - 520) / 47 + 1) + 7 * Math.sin((x - 520) / 610));
}
// the surface you meet: the sea where there is sea, else the ground
const surfaceY = x => isWater(x) ? SEA : groundY(x);""")
# ---------------- smashables, springboards and gold rings, made with the cells ----------------
rep("""  const put = (k, rad, extra) =>""", """  // on the ground: things to smash, springboards; in the low sky: gold rings and crates on balloons
  if (x0 > 60 && gy >= y0 - CELL && gy < y0 + CELL && j === Math.max(0, Math.floor((Math.max(gy, SEA) + 0.5) / CELL))) {
    const R = regionAt(x0), list = OBS[R.id] || OBS.farm, wet = R.water, n = r() < 0.85 ? 1 + Math.floor(r() * (wet ? 2 : 3.2)) : 0;
    for (let q = 0; q < n; q++) {
      const x = x0 + 4 + r() * (CELL - 8); if (wet !== isWater(x)) continue;
      const pick = list[Math.floor(Math.pow(r(), 1.6) * list.length)], [type, hp, w, h, pay] = pick, far = 1 + wmod(x) / WORLD * 0.6;
      out.push({ k: 'ob', type, x, y: wet ? SEA : groundY(x), bx: x, w, h, hp: hp * far, hp0: hp * far, pay: Math.max(1, Math.round(pay * R.mult)), ph: r() * 6.28 });
    }
    if (!wet && r() < 0.09) { const x = x0 + 4 + r() * (CELL - 8); out.push({ k: 'spring', x, y: groundY(x), bx: x, w: 2.2, h: 0.7, ph: 0 }); }
  }
  if (j <= 4 && x0 > 120 && r() < 0.06) { const x = x0 + 8 + r() * (CELL - 16), y = Math.max(groundY(x), SEA) + 14 + r() * 70; if (y > y0 && y < y0 + CELL) out.push({ k: 'ring', x, y, bx: x, by: y, r: 3, ph: 0 }); }
  if (j <= 3 && x0 > 200 && r() < 0.035) { const x = x0 + 8 + r() * (CELL - 16), y = Math.max(groundY(x), SEA) + 12 + r() * 40; if (y > y0 && y < y0 + CELL) out.push({ k: 'aircrate', x, y, bx: x, by: y, r: 1.3, hp: 8, pay: Math.round(15 * regionAt(x).mult), ph: r() * 6.28 }); }
  const put = (k, rad, extra) =>""")
rep("  else if (o.k === 'balloon' || o.k === 'cloud') { o.y = o.by + Math.sin(t * 1.1 + o.ph) * 1.2; }", "  else if (o.k === 'balloon' || o.k === 'cloud' || o.k === 'aircrate') { o.y = o.by + Math.sin(t * 1.1 + o.ph) * 1.2; }\n  else if (o.k === 'ob' && isWater(o.x)) { o.y = SEA + Math.sin(t * 1.6 + o.ph) * 0.15; }")
# ---------------- a run keeps count of what it smashed ----------------
rep("stopT: 0, done: false, warp: 1,", "stopT: 0, done: false, warp: 1, smash: 0, cash: 0, bonks: 0, skips: 0, springs: 0, rings: 0, tnts: 0, splash: false, lapsDone: 0, reg: 0, popT: 0,")
# ---------------- the flight itself ----------------
# the tail fan pushes along the direction of travel while flying
rep("  if (F.firing) { ax += Math.cos(F.th) * st.thrust; ay += Math.sin(F.th) * st.thrust; }\n  vx += ax * dt; vy += ay * dt;",
    "  if (F.firing) { ax += Math.cos(F.th) * st.thrust; ay += Math.sin(F.th) * st.thrust; }\n  if (st.tail && !F.contact && v > 3) { ax += vx / v * st.tail; ay += vy / v * st.tail; }\n  if (F.splash) { ax -= vx * 1.6; ay -= vy * 1.2; }   // in the water: it slows you right down\n  vx += ax * dt; vy += ay * dt;")
# meeting the sea: skip if flat and fast, splash otherwise
rep("""  // ground
  const gy = groundY(x);
  let touching = false;
  if (y <= gy + 0.02) {""", """  // the sea: flat and fast skips like a stone; anything else is a splash-down
  let touching = false;
  if (isWater(x) && y <= SEA + 0.02) {
    touching = true; y = SEA;
    const sp2 = Math.hypot(vx, vy);
    if (vy < 0 && !F.splash && vx > st.skipMin && -vy < vx * 0.42 && F.tumble <= 0) { vy = -vy * 0.55 + 2; vx *= st.skipKeep; F.skips++; FXH('skip', sp2, x, y); }
    else if (!F.splash && vy < 0) { F.splash = true; vy = 0; vx *= 0.5; FXH('splash', sp2, x, y); }
    else vy = Math.max(vy, 0);
    if (F.splash) { vy = 0; F.th = lerp(F.th, 0, 0.1); }
  }
  // ground
  const gy = groundY(x);
  if (!isWater(x) && y <= gy + 0.02) {""")
rep("        const mu = st.mu * 1.4 + (F.tumble > 0 ? 0.25 : 0);", "        const mu = st.mu * 1.4 * st.wheel + (F.tumble > 0 ? 0.25 : 0);")
# smashing: fast enough and it shatters (you lose some speed), too slow and you bonk off it
rep("""    if (o.k === 'coin') {""", """    if (o.k === 'ob' || o.k === 'spring') {
      const hx = o.w / 2 + 0.45, top = o.y + o.h + 0.3;
      // does this step's path cross the box?
      let t0 = 0, t1 = 1; const dxs = x - px, dys = y - py;
      for (const [p0, dd, lo, hi] of [[px, dxs, o.x - hx, o.x + hx], [py, dys, o.y - 0.6, top]]) {
        if (Math.abs(dd) < 1e-9) { if (p0 < lo || p0 > hi) { t0 = 2; break; } continue; }
        let a = (lo - p0) / dd, b = (hi - p0) / dd; if (a > b) { const q = a; a = b; b = q; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) break;
      }
      if (t0 > t1 || t0 > 1) return;
      if (o.k === 'spring') { if (vy <= 4) { vy = Math.max(vy, 0) * 0.3 + 15 + Math.hypot(vx, vy) * 0.12; F.springs++; F.tumble = 0; o.squash = 1; FXH('spring', o); } return; }
      const v2 = Math.hypot(vx, vy), power = v2 * st.smash;
      if (power >= o.hp) {
        o.dead = true; const loss = clamp(o.hp / power, 0.03, 0.85) * 0.5 * st.keep;
        vx *= 1 - loss; vy *= 1 - loss * 0.5; F.smash++; const pay = Math.round(o.pay * st.piggy); F.cash += pay;
        if (o.type === 'tnt') { vy = Math.max(vy, 0) + 20; vx += 6; F.tnts++; F.tumble = 0; }
        FXH('smash', o, pay);
      } else if (F.hitCD <= 0) {
        // bonk: it holds, you bounce back off it and it cracks a little
        o.hp -= power * 0.5; o.hit = F.t; F.hitCD = 0.35; F.bonks++;
        vx = -Math.abs(vx) * 0.22; vy = Math.max(vy, 0) * 0.3 + 2.5; F.tumble = 0.8; F.spin = 12 * (Math.random() < 0.5 ? -1 : 1); F.shake = 10;
        x = px - 0.05; FXH('bonk', o);
      }
      return;
    }
    if (o.k === 'ring') { if (d < 3.2 * F.hs + rc && !o.dead) { o.dead = true; const k = 1.12; vx *= k; vy *= k; F.coins += 2; F.nCoins += 2; F.rings++; FXH('ring', o); } return; }
    if (o.k === 'aircrate') { if (d < o.r * F.hs + rc) { o.dead = true; const pay = Math.round(o.pay * st.piggy); F.cash += pay; F.smash++; vx *= 0.97; FXH('smash', o, pay); } return; }
    if (o.k === 'coin') {""")
# laps, regions; no early end for coming back from space; a long trip gets a long clock
rep("""  if (!F.space && F.y >= SPACE) { F.space = true; FXH('space'); }""", """  if (!F.space && F.y >= SPACE) { F.space = true; FXH('space'); }
  if (x >= WORLD * (F.lapsDone + 1)) { F.lapsDone++; FXH('lap', F.lapsDone); }
  const ri = regionIdx(x); if (x > 400 && ri !== F.reg) { F.reg = ri; FXH('region', REGIONS[ri]); }""")
rep("""  if (touching && sp < 2.5 && !F.firing) { F.stopT += dt; if (F.stopT > 0.5) { F.done = true; FXH('stop'); } } else F.stopT = 0;""",
    """  if (touching && sp < (F.splash ? 4 : 2.5) && !F.firing) { F.stopT += dt; if (F.stopT > 0.5) { F.done = true; FXH('stop'); } } else F.stopT = 0;""")
rep("""  if (F.maxY > SPACE * 1.5 && F.vy < 0 && F.y < SPACE && !F.firing) { F.done = true; F.reentry = true; FXH('stop'); }
  if (F.t > (F.maxY > SPACE ? 3600 : 600)) { F.done = true; FXH('stop'); }""", """  if (F.t > 3600) { F.done = true; FXH('stop'); }""")
rep("return { real: F.real, t: F.t, dist: Math.max(0, F.maxX),", "return { real: F.real, t: F.t, smash: F.smash, cash: F.cash, bonks: F.bonks, skips: F.skips, springs: F.springs, rings: F.rings, tnts: F.tnts, laps: F.lapsDone, region: regionIdx(F.maxX) + Math.floor(F.maxX / WORLD) * REGIONS.length, dist: Math.max(0, F.maxX),")
# ---------------- what you see and hear when things happen ----------------
rep("""    case 'space':
      if (!quiet && !S.won) spaceEnding();
      break;""", """    case 'space':
      if (!quiet) { banner('PEPPER IS IN', 'SPACE!'); sfx.space(); }
      break;
    case 'smash': {
      const o = a, col = SMASH_COL[o.type] || '#c98a4b';
      burst(o.x, o.y + (o.h || 1) * 0.5, 16, () => ({ t: 'conf', x: o.x + rnd(-0.5, 0.5) * (o.w || 1), y: o.y + rnd(0.2, 1) * (o.h || 1), vx: F.vx * rnd(0.3, 0.9) + rnd(-5, 5), vy: rnd(2, 12), life: rnd(0.6, 1.3), s: rnd(0.35, 0.8) * Math.max(1, F.hs * 0.6), col, vr: rnd(-10, 10) }));
      if (o.type === 'tnt') { part({ t: 'ring', x: o.x, y: o.y + 0.5, vx: 0, vy: 0, life: 0.6, s: 7 * F.hs, col: '#ffb52e', add: true }); burst(o.x, o.y + 0.5, 22, () => ({ t: 'star', x: o.x, y: o.y + 0.5, vx: rnd(-14, 14), vy: rnd(-4, 16), life: rnd(0.4, 0.9), s: 0.7 * F.hs, rot: rnd(0, 6), vr: rnd(-6, 6), add: true, col: ['#ffd23f', '#ff7a2a', '#fff3b0'][Math.random() * 3 | 0] })); }
      if (!quiet) { sfx.crash(o.type === 'tnt' ? 30 : 8 + Math.min(20, o.hp0 * 0.1)); sfx.coin(2); if (F.popT <= 0 || b >= 20) { popText((o.type === 'tnt' ? 'KABOOM! ' : SMASH_WORDS[F.smash % SMASH_WORDS.length] + ' ') + '+' + b, o.type === 'tnt' ? '#ffb52e' : '#7dff9a'); F.popT = 0.35; } F.shake = Math.max(F.shake, o.type === 'tnt' ? 12 : Math.min(9, 2 + o.hp0 * 0.05)); }
      break;
    }
    case 'bonk': if (!quiet) { sfx.hit(); popText('BONK! Too slow', '#ff7a6a'); } feathers(F.x, F.y + F.hs, 10, (F.look || curLook()).skin); break;
    case 'skip': burst(b, SEA, 14, () => ({ t: 'snow', x: b, y: SEA + 0.1, vx: F.vx * rnd(0.1, 0.4), vy: rnd(2, 8), life: rnd(0.4, 0.9), s: rnd(0.15, 0.35) * F.hs, col: '#cfefff' })); if (!quiet) { sfx.boing(); popText('SKIP! x' + F.skips, '#7ce3ff'); } break;
    case 'splash': burst(b, SEA, 34, () => ({ t: 'snow', x: b + rnd(-1, 1), y: SEA + 0.1, vx: rnd(-6, 6), vy: rnd(4, 16), life: rnd(0.6, 1.4), s: rnd(0.2, 0.5) * F.hs, col: '#cfefff' })); if (!quiet) { sfx.crash(18); popText('SPLASH!', '#7ce3ff'); } break;
    case 'spring': part({ t: 'ring', x: a.x, y: a.y + 0.6, vx: 0, vy: 0, life: 0.5, s: 3 * F.hs, col: '#ff5fa2', add: true }); if (!quiet) { sfx.boing(); popText('BOING!', '#ff9ad5'); } break;
    case 'ring': part({ t: 'ring', x: a.x, y: a.y, vx: 0, vy: 0, life: 0.5, s: 4 * F.hs, col: '#ffd23f', add: true }); if (!quiet) { sfx.fuel(); popText('SPEED RING!', '#ffd23f'); } break;
    case 'region': if (!quiet) { banner(S.best.dist < wmod(F.x) + Math.floor(F.x / WORLD) * WORLD - 50 ? 'NEW PLACE!' : 'Welcome to', a.name); sfx.layer(); } break;
    case 'lap':
      if (!quiet) { if (!S.won && a === 1) worldEnding(); else { banner('LAP ' + a + '!', 'All the way round again!'); sfx.fanfare(); confetti(); } }
      break;""")
rep("function spaceEnding() {", """const SMASH_WORDS = ['SMASH!', 'CRUNCH!', 'KAPOW!', 'WHAM!', 'CRASH!', 'BAM!', 'THWACK!'];
const SMASH_COL = { fence: '#b07a45', hay: '#f0cf5a', pumpkin: '#ff8a1f', scarecrow: '#c9a05a', tractor: '#e8362f', barn: '#c0392b', wagon: '#9a6a3a', windpump: '#9aa3ad', cactus: '#3faa4e', sandcastle: '#f0c472', tumble: '#b08a52', pot: '#c96a3a', pyramid: '#e0b870', buoy: '#ff4a3a', float: '#b07a45', boat: '#ffffff', crate: '#b07a45', tiki: '#a4703a', palm: '#3faa4e', idol: '#8a8f7a', boulder: '#9a5a3a', cart: '#6a6f7a', totem: '#c97a3a', ice: '#cfefff', igloo: '#ffffff', sculpt: '#dff4ff', cone: '#ff7a1f', mailbox: '#2f6fe8', hydrant: '#e8362f', booth: '#e8362f', truck: '#ffd23f', billboard: '#ff4fa0', iceberg: '#eaf8ff', tnt: '#e8362f' };
// once round the world: the big ending
function worldEnding() {
  F.lapsDone = Math.max(F.lapsDone, 1); $('pops').innerHTML = ''; setHint(null);
  FLASH = 1; sfx.space(); confetti(); banner('PEPPER WENT', 'ALL THE WAY ROUND!');
  burst(F.x, F.y, 50, () => ({ t: 'star', x: F.x, y: F.y + F.hs, vx: rnd(-25, 25), vy: rnd(-20, 20), life: rnd(1, 2.2), s: 0.85 * F.hs, rot: rnd(0, 6), vr: rnd(-3, 3), add: true, col: ['#fff6b0', '#9fe0ff', '#7dff9a'][Math.random() * 3 | 0] }));
  setTimeout(() => {
    if (mode !== 'play') return;
    mode = 'ending'; $('hud').hidden = true; endKind = 'world';
    $('endText').innerHTML = `Pepper did it! After <b>${S.day}</b> day${S.day > 1 ? 's' : ''} of launching, smashing and splashing, one small black hen flew <b>all the way round the world</b>: over the prairie, the desert, two oceans, the jungle, the canyon, the frozen north and the megacity, and back home to the farm.`;
    show('scrEnd');
  }, 2600);
}
function spaceEnding() {""")
rep("function endGo() { if (endKind === 'cosmic') {", "function endGo() { if (endKind === 'world') { S.won = true; S.wonDay = S.day; endKind = 'space'; save(); show(null); F.done = true; endFlight(); return; } if (endKind === 'cosmic') {")
# ---------------- results, missions, records ----------------
rep("""    ['Distance', fmt(r.dist) + ' m', pay.dist, newBest.dist],
    ['Height', fmt(r.alt) + ' m', pay.alt, newBest.alt],""", """    ['Distance', fmt(r.dist) + ' m (' + (r.dist / WORLD * 100).toFixed(r.dist < WORLD * 0.1 ? 1 : 0) + '% of the world)', pay.dist, newBest.dist],
    ['Smashed', r.smash + (r.smash === 1 ? ' thing' : ' things') + (r.bonks ? ' · ' + r.bonks + ' bonk' + (r.bonks > 1 ? 's' : '') : ''), pay.smash, r.smash > (S.best.smash || 0) && S.runs > 0],
    ...(r.laps ? [['Laps of the world', '' + r.laps, pay.laps, true]] : []),
    ['Height', fmt(r.alt) + ' m', pay.alt, newBest.alt],""")
rep("    case 'spaceNoGlider': return r && r.alt >= SPACE && r.glider === 0 ? 1 : 0;", "    case 'spaceNoGlider': return r && r.alt >= SPACE && r.glider === 0 ? 1 : 0;\n    case 'cashRun': return r ? r.cash : null;")
rep("  for (const k of ['coinsRun', 'balRun', 'cloudRun', 'air', 'rocketT', 'slide', 'fuels', 'balloons', 'clouds']) {\n    const v = k === 'coinsRun' ? r.nCoins : k === 'balRun' ? r.balloons : k === 'cloudRun' ? r.clouds : r[k];",
    "  for (const k of ['coinsRun', 'balRun', 'cloudRun', 'air', 'rocketT', 'slide', 'fuels', 'balloons', 'clouds', 'smash', 'cashRun', 'skips', 'springs', 'rings', 'tnts']) {\n    const v = k === 'coinsRun' ? r.nCoins : k === 'balRun' ? r.balloons : k === 'cloudRun' ? r.clouds : k === 'cashRun' ? r.cash : r[k];")
rep("  S.best.dist = Math.max(S.best.dist, r.dist);", "  S.best.smash = Math.max(S.best.smash || 0, r.smash); S.best.cash = Math.max(S.best.cash || 0, r.cash); S.laps = (S.laps || 0) + r.laps;\n  S.best.dist = Math.max(S.best.dist, r.dist);")
rep("  const faces = F && F.reentry ? `Parachuted home from ${fmt(r.alt)} m!` : r.alt >= SPACE ? 'Space chicken!' :", "  const faces = r.laps ? 'Round the world!' : F && F.splash ? 'Splashdown!' : r.smash >= 40 ? 'Wrecking hen!' : r.alt >= SPACE ? 'Space chicken!' :")
# tips: where to go next round the world
rep("""  const nextLayer = LAYERS.find(l => l.at > S.best.alt);
  if (S.tier.rocket === 0) return `Save up for a <b>rocket</b> (${fmt(ROCKETS[1].price)} coins). Rockets let you blast up high!`;
  if (nextLayer && !S.won) return `Next stop: <b>${nextLayer.name}</b> at ${fmt(nextLayer.at)} m high. Point your nose up while the rocket fires!`;""", """  const nr = REGIONS.find(q => q.at > S.best.dist);
  if (r && r.bonks >= 2 && S.tier.helmet < HELMETS.length - 1) return `Bonk! Things you hit too slowly stop you dead. A better <b>helmet</b> smashes harder and keeps more of your speed.`;
  if (S.tier.rocket === 0 && S.runs > 3) return `Save up for a <b>rocket</b> (${fmt(ROCKETS[1].price)} coins). Point it a little up for distance!`;
  if (F && F.splash && S.gad.skipper < 3) return `Splash! Hit the water flat and fast to <b>skip</b>. <b>Skipping Feet</b> in Gadgets make it easier.`;
  if (nr && !S.won) return `Next stop: <b>${nr.name}</b>, ${fmt(nr.at)} m round the world. You are ${(S.best.dist / WORLD * 100).toFixed(1)}% of the way round.`;""")
# ---------------- the HUD: a world-trip meter instead of a height meter, and the region you are in ----------------
rep("""      <div class="chip">Height <b id="hAlt">0</b> m</div>""", """      <div class="chip" id="hReg">Home Farm</div>
      <div class="chip">Height <b id="hAlt">0</b> m</div>""")
rep("const meterTop = () => !S.won ? SPACE : S.best.alt >= MOON * 0.9 ? COSMIC : MOON;\nfunction meterPos(a) { return Math.sqrt(clamp(a / meterTop(), 0, 1)); }",
    "const meterTop = () => WORLD * (1 + Math.floor((S.best.dist || 0) / WORLD));\nfunction meterPos(a) { return clamp(a / meterTop(), 0, 1); }")
rep("  for (const l of LAYERS) { if (l.at <= 0 || l.at > meterTop()) continue; const d = document.createElement('div'); d.className = 'tick'; placeY(d, meterPos(l.at)); tk.appendChild(d); }\n  placeY($('mBest'), meterPos(S.best.alt)); $('mBest').hidden = S.best.alt < 50;\n  $('mGoal').textContent = meterTop() === COSMIC ? '🥚' : S.won ? '🌙' : '⭐';",
    "  const base = meterTop() - WORLD; for (const l of REGIONS) { if (l.at <= 0) continue; const d = document.createElement('div'); d.className = 'tick'; placeY(d, meterPos(base + l.at)); d.title = l.name; tk.appendChild(d); }\n  placeY($('mBest'), meterPos(S.best.dist)); $('mBest').hidden = S.best.dist < 100;\n  $('mGoal').textContent = '🌍';")
rep("  setT('hAlt', fmt(Math.max(0, F.y)));", "  setT('hAlt', fmt(Math.max(0, F.y))); setT('hReg', regionAt(Math.max(0, F.x)).name + (F.x > WORLD ? ' · lap ' + (1 + Math.floor(F.x / WORLD)) : ''));")
rep("  placeY($('mMe'), meterPos(F.y));", "  placeY($('mMe'), meterPos(Math.max(0, F.x))); if (F.popT > 0) F.popT -= 1 / 60;")
rep("  if (S.won) dl.insertAdjacentHTML('beforeend', `<span class=\"sandbox\">${S.cosmic ? 'COSMIC CHICKEN 🥚' : 'SPACE CHICKEN ⭐'}</span>`);",
    "  if (S.won) dl.insertAdjacentHTML('beforeend', `<span class=\"sandbox\">WORLD TRAVELLER 🌍${S.laps > 1 ? ' x' + S.laps : ''}</span>`);")
# no space ending; the height banners only show once you have been round the world
rep("if (L.id !== 'space' || S.won) { banner(", "if (L.id !== 'space' && F.y > 250) { banner(")
# ---------------- drawing the world round the globe ----------------
rex(r"  // back hills with trees \(a little parallax\)\n  // snow body\n.*?\n  // the landing track: sled marks", r"""  // the ground, a stretch per region in its own colours (the start mountain wears the farm's)
  const chunks = []; { let a = x0, ri = x0 < 600 ? 0 : regionIdx(x0); for (let x = x0; x <= x1 + step; x += step) { const r2 = x < 600 ? 0 : regionIdx(x); if (r2 !== ri) { chunks.push([a, x, ri]); a = x; ri = r2; } } chunks.push([a, x1 + step, ri]); }
  for (const [a, b, ri] of chunks) {
    const R = REGIONS[ri], cs = R.water ? ['#f2e3a8', '#d9c07a', '#b89a58'] : R.g;
    g.beginPath(); g.moveTo(sx(a), H + 10); for (let x = a; x <= b + step * 0.5; x += step) g.lineTo(sx(Math.min(x, b)), sy(surfY(Math.min(x, b), rp))); g.lineTo(sx(b), H + 10); g.closePath();
    const sg = g.createLinearGradient(0, sy(PLATEAU + 30), 0, H); sg.addColorStop(0, cs[0]); sg.addColorStop(0.3, cs[1]); sg.addColorStop(1, cs[2]); g.fillStyle = sg; g.fill();
    g.strokeStyle = cs[2]; g.lineWidth = Math.max(2, cam.k * 0.18); g.beginPath(); for (let x = a; x <= b + step * 0.5; x += step) { const X = sx(Math.min(x, b)), Y = sy(surfY(Math.min(x, b), rp)) + g.lineWidth * 0.6; x === a ? g.moveTo(X, Y) : g.lineTo(X, Y); } g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(1.5, cam.k * 0.08); g.beginPath(); for (let x = a; x <= b + step * 0.5; x += step) { const X = sx(Math.min(x, b)), Y = sy(surfY(Math.min(x, b), rp)); x === a ? g.moveTo(X, Y) : g.lineTo(X, Y); } g.stroke();
  }
  // the sea: deep blue, a lighter band at the top, a foam line that rolls
  { let a = null; const spans = []; for (let x = x0; x <= x1 + step; x += step) { const w = isWater(x); if (w && a === null) a = x; if (!w && a !== null) { spans.push([a, x]); a = null; } } if (a !== null) spans.push([a, x1 + step]);
    for (const [a2, b2] of spans) {
      const wy = x => SEA + Math.sin(x * 0.35 + t * 2) * 0.12 + Math.sin(x * 0.11 - t * 1.3) * 0.18;
      g.beginPath(); g.moveTo(sx(a2), H + 10); for (let x = a2; x <= b2; x += step) g.lineTo(sx(x), sy(wy(x))); g.lineTo(sx(b2), H + 10); g.closePath();
      const wg = g.createLinearGradient(0, sy(SEA), 0, H); wg.addColorStop(0, '#3fb4e8'); wg.addColorStop(0.25, '#1f7fc4'); wg.addColorStop(1, '#0d3f7a'); g.fillStyle = wg; g.fill();
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = Math.max(1.5, cam.k * 0.12); g.beginPath(); for (let x = a2; x <= b2; x += step) { x === a2 ? g.moveTo(sx(x), sy(wy(x))) : g.lineTo(sx(x), sy(wy(x))); } g.stroke();
    } }
  // the landing track: sled marks""")
rep("""    const kind = h % 100;
    if (kind < 38) pine(sx(x), sy(groundY(x)), (4.5 + (h >>> 5) % 6) * cam.k, h);
    else if (kind < 40 && x > 200) snowman(sx(x), sy(groundY(x)), cam.k);
    else if (kind < 41 && x > 600) cabin(sx(x), sy(groundY(x) - 0.5), cam.k, h);""", """    const kind = h % 100, R = x < 600 ? REGIONS[0] : regionAt(x), X = sx(x), Y = sy(groundY(x)), hh = (4.5 + (h >>> 5) % 6) * cam.k;
    if (R.water || isWater(x)) continue;
    if (R.id === 'arctic') { if (kind < 34) pine(X, Y, hh, h); }
    else if (R.id === 'desert') { if (kind < 16) cactusD(X, Y, hh * 0.6); else if (kind < 22) rockD(X, Y, hh * 0.4, '#d9a95a'); }
    else if (R.id === 'jungle') { if (kind < 40) palmD(X, Y, hh * 1.3, h); }
    else if (R.id === 'canyon') { if (kind < 14) mesaD(X, Y, hh * 1.6, h); else if (kind < 20) rockD(X, Y, hh * 0.4, '#a4502e'); }
    else if (R.id === 'city') { if (kind < 45) towerD(X, Y, hh * (2 + (h >>> 8) % 4), h, t); }
    else if (R.id === 'prairie') { if (kind < 12) treeD(X, Y, hh * 0.9, '#7aa83a'); else if (kind < 40) grassD(X, Y, cam.k, '#a48a3c'); }
    else { if (kind < 26) treeD(X, Y, hh, '#4e9a3a'); else if (kind < 29 && x > 300) cabin(X, sy(groundY(x) - 0.5), cam.k, h); }""")
rep("  const M = 100;\n  for (let i = Math.max(1, Math.floor(x0 / M)); i <= Math.floor(x1 / M) + 1; i++) {\n    const x = i * M, X = sx(x), Y = sy(groundY(x));",
    "  const M = cam.k < 1.5 ? 1000 : cam.k < 4 ? 500 : 100;\n  for (let i = Math.max(1, Math.floor(x0 / M)); i <= Math.floor(x1 / M) + 1; i++) {\n    const x = i * M, X = sx(x), Y = sy(surfaceY(x)); if (isWater(x)) continue;")
rep("function snowman(X, Y, k) {", r"""// region scenery (not in the way: decoration only)
function treeD(X, Y, h, col) { if (X < -h || X > W + h) return; g.fillStyle = '#6b4526'; g.fillRect(X - h * 0.05, Y - h * 0.45, h * 0.1, h * 0.45); g.fillStyle = col; for (const [dx, dy, r] of [[0, 0.62, 0.3], [-0.18, 0.5, 0.22], [0.18, 0.5, 0.22]]) { g.beginPath(); g.arc(X + dx * h, Y - dy * h, r * h, 0, 7); g.fill(); } g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(X - h * 0.08, Y - h * 0.7, h * 0.12, 0, 7); g.fill(); }
function grassD(X, Y, k, col) { if (X < -10 || X > W + 10) return; g.strokeStyle = col; g.lineWidth = Math.max(1, k * 0.08); for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(X + i * k * 0.2, Y); g.lineTo(X + i * k * 0.35, Y - k * (0.6 + Math.abs(i) * 0.1)); g.stroke(); } }
function cactusD(X, Y, h) { if (X < -h || X > W + h) return; g.fillStyle = '#3f9a4a'; rr(X - h * 0.08, Y - h, h * 0.16, h, h * 0.08); g.fill(); rr(X - h * 0.3, Y - h * 0.7, h * 0.12, h * 0.38, h * 0.06); g.fill(); rr(X + h * 0.18, Y - h * 0.8, h * 0.12, h * 0.42, h * 0.06); g.fill(); g.fillRect(X - h * 0.3, Y - h * 0.4, h * 0.3, h * 0.08); g.fillRect(X, Y - h * 0.46, h * 0.3, h * 0.08); }
function rockD(X, Y, h, col) { if (X < -h || X > W + h) return; g.fillStyle = col; g.beginPath(); g.ellipse(X, Y, h * 1.2, h * 0.6, 0, Math.PI, 0); g.fill(); }
function palmD(X, Y, h, seed) { if (X < -h || X > W + h) return; const lean = ((seed >>> 4) % 5 - 2) * 0.06; g.strokeStyle = '#8a5a30'; g.lineWidth = h * 0.06; g.beginPath(); g.moveTo(X, Y); g.quadraticCurveTo(X + h * lean * 3, Y - h * 0.5, X + h * lean * 5, Y - h); g.stroke(); const tx = X + h * lean * 5, ty = Y - h; g.fillStyle = '#2f9a44'; for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.55; g.beginPath(); g.ellipse(tx + Math.cos(a) * h * 0.22, ty + Math.sin(a) * h * 0.1 + h * 0.08, h * 0.26, h * 0.06, a, 0, 7); g.fill(); } }
function mesaD(X, Y, h, seed) { if (X < -h * 2 || X > W + h * 2) return; const w = h * (0.6 + (seed >>> 6) % 4 * 0.2); g.fillStyle = '#b85a34'; g.beginPath(); g.moveTo(X - w, Y); g.lineTo(X - w * 0.7, Y - h); g.lineTo(X + w * 0.7, Y - h); g.lineTo(X + w, Y); g.fill(); g.fillStyle = 'rgba(255,220,180,.25)'; g.fillRect(X - w * 0.7, Y - h, w * 1.4, h * 0.08); }
function towerD(X, Y, h, seed, t) { const w = h * (0.2 + (seed >>> 5) % 3 * 0.06); if (X < -w || X > W + w) return; g.fillStyle = ['#3a3f52', '#2e3344', '#454b60'][seed % 3]; g.fillRect(X - w / 2, Y - h, w, h); const ws = Math.max(2, w * 0.14); for (let yy = Y - h + ws; yy < Y - ws; yy += ws * 2) for (let xx = X - w / 2 + ws * 0.6; xx < X + w / 2 - ws; xx += ws * 1.8) { g.fillStyle = (Math.floor(xx * 7 + yy * 3 + seed) % 5) ? 'rgba(255,230,140,.75)' : 'rgba(120,230,255,.7)'; g.fillRect(xx, yy, ws * 0.8, ws); } g.fillStyle = '#ff3f9a'; g.fillRect(X - w / 2, Y - h - 2, w, 2); void t; }
// the things you smash, drawn at their real size; they show cracks once you have bonked them
function drawOb(o, X, Y, k, t) {
  const w = o.w * k, h = o.h * k, col = SMASH_COL[o.type] || '#c98a4b', dark = 'rgba(0,0,0,.28)', lw = Math.max(1, k * 0.08);
  if (X < -w * 2 || X > W + w * 2) return;
  g.save(); g.translate(X, Y); g.lineWidth = lw; g.strokeStyle = 'rgba(40,25,15,.6)';
  const box = (x, y, bw, bh, c) => { g.fillStyle = c; g.fillRect(x, y, bw, bh); g.strokeRect(x, y, bw, bh); };
  switch (o.type) {
    case 'fence': for (const px of [-0.45, 0, 0.45]) box(px * w - w * 0.05, -h, w * 0.1, h, col); box(-w / 2, -h * 0.8, w, h * 0.14, col); box(-w / 2, -h * 0.42, w, h * 0.14, col); break;
    case 'hay': box(-w / 2, -h, w, h, col); g.strokeStyle = 'rgba(160,110,30,.6)'; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(-w / 2, -h * i / 4); g.lineTo(w / 2, -h * i / 4); g.stroke(); } box(-w * 0.32, -h, w * 0.08, h, '#a4703a'); box(w * 0.24, -h, w * 0.08, h, '#a4703a'); break;
    case 'pumpkin': case 'boulder': case 'buoy': case 'tumble': case 'pot': g.fillStyle = col; g.beginPath(); g.ellipse(0, -h / 2, w / 2, h / 2, 0, 0, 7); g.fill(); g.stroke();
      if (o.type === 'pumpkin') { g.fillStyle = '#3f7a2a'; g.fillRect(-w * 0.05, -h * 1.1, w * 0.1, h * 0.2); } if (o.type === 'buoy') { g.fillStyle = '#fff'; g.fillRect(-w / 2, -h * 0.55, w, h * 0.14); g.fillStyle = '#333'; g.fillRect(-w * 0.04, -h * 1.3, w * 0.08, h * 0.4); }
      if (o.type === 'tumble') { g.strokeStyle = '#7a5a32'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(0, -h / 2, w * (0.15 + i * 0.07), i, i + 3); g.stroke(); } } break;
    case 'scarecrow': box(-w * 0.06, -h, w * 0.12, h, '#8a5a30'); box(-w / 2, -h * 0.72, w, h * 0.08, '#8a5a30'); g.fillStyle = '#e8362f'; g.fillRect(-w * 0.3, -h * 0.75, w * 0.6, h * 0.35); g.fillStyle = '#f0cf5a'; g.beginPath(); g.arc(0, -h * 0.86, w * 0.22, 0, 7); g.fill(); g.fillStyle = '#5a3a1a'; g.fillRect(-w * 0.3, -h * 1.03, w * 0.6, h * 0.06); break;
    case 'tractor': case 'wagon': case 'cart': case 'truck': {
      const bc = o.type === 'truck' ? '#ffd23f' : col; box(-w / 2, -h * 0.85, w * (o.type === 'tractor' ? 0.62 : 1), h * 0.55, bc);
      if (o.type === 'tractor') { box(-w * 0.05, -h, w * 0.45, h * 0.7, bc); g.fillStyle = '#9fe0ff'; g.fillRect(w * 0.02, -h * 0.92, w * 0.3, h * 0.3); }
      if (o.type === 'truck') { box(w * 0.25, -h * 0.95, w * 0.25, h * 0.65, '#e8362f'); g.fillStyle = '#ff4fa0'; g.font = `900 ${Math.max(6, h * 0.22)}px ${FONT}`; g.textAlign = 'center'; g.fillText('TACOS', -w * 0.12, -h * 0.5); }
      g.fillStyle = '#222'; for (const [wx, r] of o.type === 'tractor' ? [[-w * 0.3, h * 0.32], [w * 0.32, h * 0.2]] : [[-w * 0.32, h * 0.16], [w * 0.32, h * 0.16]]) { g.beginPath(); g.arc(wx, -r, r, 0, 7); g.fill(); g.fillStyle = '#999'; g.beginPath(); g.arc(wx, -r, r * 0.4, 0, 7); g.fill(); g.fillStyle = '#222'; } break; }
    case 'barn': case 'tiki': case 'igloo': case 'booth':
      if (o.type === 'igloo') { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 0, w / 2, h, 0, Math.PI, 0); g.fill(); g.stroke(); g.strokeStyle = '#bcd4ee'; for (let i = 1; i < 4; i++) { g.beginPath(); g.ellipse(0, 0, w / 2, h * i / 4, 0, Math.PI, 0); g.stroke(); } g.fillStyle = '#5a7a9a'; g.beginPath(); g.ellipse(w * 0.2, 0, w * 0.12, h * 0.4, 0, Math.PI, 0); g.fill(); break; }
      if (o.type === 'booth') { box(-w / 2, -h, w, h, col); g.fillStyle = '#9fe0ff'; g.fillRect(-w * 0.35, -h * 0.85, w * 0.7, h * 0.55); g.fillStyle = '#fff'; g.font = `900 ${Math.max(5, w * 0.28)}px ${FONT}`; g.textAlign = 'center'; g.fillText('TEL', 0, -h * 0.9); break; }
      box(-w / 2, -h * 0.65, w, h * 0.65, col); g.fillStyle = o.type === 'tiki' ? '#d9a95a' : '#8a2a22'; g.beginPath(); g.moveTo(-w * 0.6, -h * 0.65); g.lineTo(0, -h); g.lineTo(w * 0.6, -h * 0.65); g.closePath(); g.fill(); g.stroke();
      if (o.type === 'barn') { g.strokeStyle = '#fff'; g.lineWidth = lw * 1.5; g.strokeRect(-w * 0.2, -h * 0.5, w * 0.4, h * 0.5); g.beginPath(); g.moveTo(-w * 0.2, -h * 0.5); g.lineTo(w * 0.2, 0); g.moveTo(w * 0.2, -h * 0.5); g.lineTo(-w * 0.2, 0); g.stroke(); } break;
    case 'windpump': box(-w * 0.08, -h * 0.8, w * 0.16, h * 0.8, '#9aa3ad'); g.save(); g.translate(0, -h * 0.82); g.rotate(t * 3); g.fillStyle = '#d0d6dc'; for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.fillRect(0, -w * 0.08, w * 0.6, w * 0.16); } g.restore(); break;
    case 'cactus': g.fillStyle = col; rr(-w * 0.18, -h, w * 0.36, h, w * 0.18); g.fill(); g.stroke(); rr(-w * 0.55, -h * 0.72, w * 0.26, h * 0.4, w * 0.13); g.fill(); rr(w * 0.3, -h * 0.82, w * 0.26, h * 0.4, w * 0.13); g.fill(); g.fillRect(-w * 0.4, -h * 0.4, w * 0.4, h * 0.1); g.fillRect(0, -h * 0.46, w * 0.42, h * 0.1); break;
    case 'sandcastle': box(-w / 2, -h * 0.6, w, h * 0.6, col); for (const px of [-0.4, 0, 0.4]) box(px * w - w * 0.12, -h, w * 0.24, h * 0.45, col); g.fillStyle = '#e8362f'; g.fillRect(-w * 0.02, -h * 1.35, w * 0.04, h * 0.35); g.beginPath(); g.moveTo(w * 0.02, -h * 1.35); g.lineTo(w * 0.22, -h * 1.27); g.lineTo(w * 0.02, -h * 1.19); g.fill(); break;
    case 'pyramid': case 'iceberg': g.fillStyle = o.type === 'iceberg' ? '#eaf8ff' : '#e0b870'; g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(o.type === 'iceberg' ? -w * 0.1 : 0, -h); g.lineTo(o.type === 'iceberg' ? w * 0.2 : 0, -h * 0.85); g.lineTo(w / 2, 0); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = o.type === 'iceberg' ? '#9fd0ef' : 'rgba(120,80,30,.4)'; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(-w / 2 * (1 - i / 5), -h * i / 5); g.lineTo(w / 2 * (1 - i / 5), -h * i / 5); g.stroke(); } break;
    case 'float': case 'crate': case 'ice': case 'tnt': {
      const c2 = o.type === 'ice' ? 'rgba(200,240,255,.85)' : o.type === 'tnt' ? '#e8362f' : col; box(-w / 2, -h, w, h, c2);
      if (o.type === 'tnt') { g.fillStyle = '#fff'; g.font = `900 ${Math.max(6, h * 0.42)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TNT', 0, -h / 2); }
      else if (o.type === 'ice') { g.strokeStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.moveTo(-w * 0.3, -h * 0.8); g.lineTo(-w * 0.1, -h * 0.6); g.stroke(); }
      else { g.beginPath(); g.moveTo(-w / 2, -h); g.lineTo(w / 2, 0); g.moveTo(w / 2, -h); g.lineTo(-w / 2, 0); g.stroke(); } break; }
    case 'boat': g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-w / 2, -h * 0.35); g.lineTo(w / 2, -h * 0.35); g.lineTo(w * 0.35, 0); g.lineTo(-w * 0.35, 0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#e8362f'; g.fillRect(-w / 2, -h * 0.3, w, h * 0.06); box(-w * 0.03, -h, w * 0.06, h * 0.65, '#8a5a30'); g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(w * 0.03, -h * 0.98); g.lineTo(w * 0.42, -h * 0.42); g.lineTo(w * 0.03, -h * 0.42); g.fill(); break;
    case 'palm': palmD(0, 0, h, 3); break;
    case 'idol': case 'totem': case 'sculpt': {
      const segs = o.type === 'totem' ? 4 : 3, sh = h / segs; for (let i = 0; i < segs; i++) { box(-w / 2 + (i % 2) * w * 0.05, -sh * (i + 1), w * (1 - (i % 2) * 0.1), sh, o.type === 'sculpt' ? 'rgba(220,245,255,.9)' : i % 2 ? col : '#7a6a52'); g.fillStyle = '#222'; g.fillRect(-w * 0.25, -sh * (i + 0.7), w * 0.14, sh * 0.14); g.fillRect(w * 0.11, -sh * (i + 0.7), w * 0.14, sh * 0.14); } break; }
    case 'cone': g.fillStyle = col; g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(0, -h); g.lineTo(w / 2, 0); g.fill(); g.fillStyle = '#fff'; g.fillRect(-w * 0.25, -h * 0.55, w * 0.5, h * 0.14); break;
    case 'mailbox': box(-w * 0.08, -h * 0.6, w * 0.16, h * 0.6, '#555'); g.fillStyle = col; rr(-w / 2, -h, w, h * 0.42, w * 0.2); g.fill(); g.stroke(); break;
    case 'hydrant': g.fillStyle = col; rr(-w * 0.35, -h * 0.8, w * 0.7, h * 0.8, w * 0.2); g.fill(); g.stroke(); g.beginPath(); g.arc(0, -h * 0.8, w * 0.35, Math.PI, 0); g.fill(); g.fillRect(-w / 2, -h * 0.55, w, h * 0.14); break;
    case 'billboard': box(-w * 0.04, -h * 0.5, w * 0.08, h * 0.5, '#555'); box(-w / 2, -h, w, h * 0.5, '#2a2a3a'); g.fillStyle = `hsl(${(t * 60 + o.ph * 50) % 360},90%,62%)`; g.font = `900 ${Math.max(6, h * 0.16)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('EAT MORE CORN', 0, -h * 0.75); break;
    default: box(-w / 2, -h, w, h, col);
  }
  // cracks where you bonked it
  if (o.hp < o.hp0) { g.strokeStyle = 'rgba(20,10,5,.75)'; g.lineWidth = lw * 1.4; g.beginPath(); g.moveTo(-w * 0.1, -h * 0.9); g.lineTo(w * 0.05, -h * 0.6); g.lineTo(-w * 0.12, -h * 0.35); g.lineTo(w * 0.08, -h * 0.1); g.stroke(); }
  g.restore();
}
function snowman(X, Y, k) {""")
rep("    else if (o.k === 'rock') spaceRock(X, Y, u, o, t);", """    else if (o.k === 'rock') spaceRock(X, Y, u, o, t);
    else if (o.k === 'ob') drawOb(o, X, Y, cam.k, t);
    else if (o.k === 'spring') { const k = cam.k, sq = o.squash ? (o.squash = Math.max(0, o.squash - 0.05)) : 0; g.fillStyle = '#333'; g.fillRect(X - o.w * k * 0.5, Y - k * 0.12, o.w * k, k * 0.12); g.strokeStyle = '#aab'; g.lineWidth = Math.max(1, k * 0.08); g.beginPath(); for (let i = 0; i <= 6; i++) g.lineTo(X + (i % 2 ? 0.25 : -0.25) * k, Y - k * 0.12 - i * k * 0.08 * (1 - sq * 0.6)); g.stroke(); g.fillStyle = '#ff3f7a'; g.fillRect(X - o.w * k * 0.5, Y - k * (0.7 - sq * 0.3), o.w * k, k * 0.2); g.fillStyle = '#fff'; g.fillRect(X - o.w * k * 0.25, Y - k * (0.7 - sq * 0.3), o.w * k * 0.15, k * 0.2); g.fillRect(X + o.w * k * 0.1, Y - k * (0.7 - sq * 0.3), o.w * k * 0.15, k * 0.2); }
    else if (o.k === 'ring') { g.save(); g.strokeStyle = '#ffd23f'; g.lineWidth = Math.max(2, u * 0.35); g.shadowColor = '#ffd23f'; g.shadowBlur = QUAL.low ? 0 : 12; g.beginPath(); g.ellipse(X, Y, u * 1.1, u * 3, 0, 0, 7); g.stroke(); g.strokeStyle = '#fff6b0'; g.lineWidth = Math.max(1, u * 0.12); g.stroke(); g.restore(); }
    else if (o.k === 'aircrate') { const s2 = u * 1.1; g.strokeStyle = '#555'; g.lineWidth = Math.max(1, u * 0.06); g.beginPath(); g.moveTo(X, Y - s2); g.lineTo(X, Y - s2 * 2.2); g.stroke(); g.fillStyle = BALLOON_COLS[Math.floor(o.ph * 10) % 5]; g.beginPath(); g.ellipse(X, Y - s2 * 2.8, s2 * 0.8, s2 * 0.95, 0, 0, 7); g.fill(); g.fillStyle = '#b07a45'; g.fillRect(X - s2, Y - s2, s2 * 2, s2 * 2); g.strokeStyle = 'rgba(40,25,15,.6)'; g.strokeRect(X - s2, Y - s2, s2 * 2, s2 * 2); g.beginPath(); g.moveTo(X - s2, Y - s2); g.lineTo(X + s2, Y + s2); g.moveTo(X + s2, Y - s2); g.lineTo(X - s2, Y + s2); g.stroke(); g.fillStyle = '#ffd23f'; g.font = `900 ${Math.max(7, s2 * 0.8)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', X, Y); }""")
# ---------------- helmets on Pepper ----------------
rep("function curLook() {\n  return { skin: S.skin, hat: S.hat,", "function curLook() {\n  return { helmet: S.tier.helmet || 0, skin: S.skin, hat: S.hat,")
rep("  drawHat(c, L.hat, t);", "  drawHat(c, L.hat, t);\n  if (L.helmet) drawHelmet(c, L.helmet, t);")
rep("function drawHat(c, hat, t) {", r"""function drawHelmet(c, n, t) {
  c.save(); c.translate(0.55, -1.32); c.lineWidth = 0.05; c.strokeStyle = '#222';
  if (n === 1) { c.fillStyle = '#a9b0b8'; c.beginPath(); c.moveTo(-0.42, -0.05); c.lineTo(-0.34, -0.55); c.lineTo(0.34, -0.55); c.lineTo(0.42, -0.05); c.closePath(); c.fill(); c.stroke(); c.strokeStyle = '#777'; c.beginPath(); c.moveTo(-0.38, -0.2); c.lineTo(0.38, -0.2); c.stroke(); }
  else if (n === 2) { c.fillStyle = '#e8362f'; c.beginPath(); c.arc(0, -0.05, 0.47, Math.PI * 1.05, Math.PI * 2.1); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.fillRect(-0.05, -0.52, 0.1, 0.44); c.strokeStyle = '#ddd'; c.lineWidth = 0.06; c.beginPath(); c.moveTo(0.3, -0.05); c.lineTo(0.62, 0.05); c.moveTo(0.3, 0.12); c.lineTo(0.62, 0.15); c.stroke(); }
  else if (n === 3) { c.fillStyle = '#8a5a30'; c.fillRect(0.25, -0.12, 0.7, 0.28); c.strokeRect(0.25, -0.12, 0.7, 0.28); c.fillStyle = '#555'; c.fillRect(0.9, -0.17, 0.12, 0.38); c.strokeStyle = '#3a2412'; c.beginPath(); c.moveTo(0.25, -0.12); c.lineTo(-0.3, -0.4); c.moveTo(0.25, 0.16); c.lineTo(-0.3, 0.3); c.stroke(); }
  else if (n === 4 || n === 6) { const col = n === 6 ? '#7fe8ff' : '#b8c0ca'; c.save(); c.translate(0.42, 0.02); c.fillStyle = col; c.beginPath(); c.moveTo(0, -0.2); c.lineTo(0.75, 0); c.lineTo(0, 0.2); c.closePath(); c.fill(); c.stroke(); c.strokeStyle = n === 6 ? '#fff' : '#6a727c'; const sp = (t * 8) % 0.25; for (let i = 0; i < 4; i++) { const x = 0.08 + i * 0.16 + sp * 0.5; c.beginPath(); c.moveTo(x, -0.2 * (1 - x / 0.75)); c.lineTo(x + 0.06, 0.2 * (1 - x / 0.75)); c.stroke(); } c.restore(); c.fillStyle = '#555'; c.beginPath(); c.arc(0, -0.08, 0.44, Math.PI * 1.1, Math.PI * 1.95); c.closePath(); c.fill(); c.stroke(); }
  else if (n === 5) { c.fillStyle = '#4a4f58'; c.beginPath(); c.arc(0, -0.1, 0.5, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#c0c6cc'; for (let i = 0; i < 7; i++) { const a = -Math.PI * 0.95 + i * Math.PI * 0.3; c.beginPath(); c.moveTo(Math.cos(a) * 0.45, -0.1 + Math.sin(a) * 0.45); c.lineTo(Math.cos(a) * 0.72, -0.1 + Math.sin(a) * 0.72); c.lineTo(Math.cos(a + 0.18) * 0.45, -0.1 + Math.sin(a + 0.18) * 0.45); c.fill(); } }
  else if (n >= 7) { const fl = 0.85 + Math.sin(t * 20) * 0.15; c.fillStyle = 'rgba(255,140,40,.7)'; c.beginPath(); c.moveTo(-0.3, -0.4); c.quadraticCurveTo(-1.2 * fl, -0.2, -0.3, 0.2); c.fill(); c.fillStyle = '#6a4a3a'; c.beginPath(); c.arc(0, -0.1, 0.5, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#ff8a2a'; for (const [x, y] of [[-0.2, -0.3], [0.15, 0.05], [0.2, -0.35]]) { c.beginPath(); c.arc(x, y, 0.08, 0, 7); c.fill(); } }
  c.restore();
}
function drawHat(c, hat, t) {""")
# obstacles start right past the landing hill, and the farm is busy so early runs pay
rep("  if (x0 > 60 && gy >= y0 - CELL", "  if (gy >= y0 - CELL")
rep("wet = R.water, n = r() < 0.85 ? 1 + Math.floor(r() * (wet ? 2 : 3.2)) : 0;", "wet = R.water, n = x0 < 1500 ? 2 + Math.floor(r() * 3) : r() < 0.85 ? 1 + Math.floor(r() * (wet ? 2 : 3.2)) : 0;")
rep("      const x = x0 + 4 + r() * (CELL - 8); if (wet !== isWater(x)) continue;", "      const x = x0 + 4 + r() * (CELL - 8); if (wet !== isWater(x) || x < 22) continue;")
rep("pay: Math.max(1, Math.round(pay * R.mult)), ph: r() * 6.28 });", "pay: Math.max(1, Math.round(pay * R.mult * 3)), ph: r() * 6.28 });")
# far hills take the colours of the region you are flying over
rep("""    mountains(0.06, base, H * 0.36, '#a8c6e8', '#e9f4ff', 11);
    mountains(0.14, base + H * 0.12, H * 0.26, '#86aad6', '#f4faff', 23);""", """    const B = BACKS[(cam.x < 600 ? REGIONS[0] : regionAt(cam.x)).id] || BACKS.farm;
    mountains(0.06, base, H * 0.36 * B[4], B[0], B[1], 11);
    mountains(0.14, base + H * 0.12, H * 0.26 * B[4], B[2], B[3], 23);""")
rep("function mountains(p, base, hgt, col, snow, seed) {", """const BACKS = {
  farm: ['#a9c9a0', null, '#8db684', null, 0.6], prairie: ['#c9c69a', null, '#b0ad7c', null, 0.45], desert: ['#e8c99a', null, '#d9ae76', null, 0.5],
  ocean: ['#a8c6e8', null, '#8fb4dc', null, 0.12], jungle: ['#7fb08a', null, '#5e9a6a', null, 0.75], canyon: ['#d99a7a', null, '#c47a58', null, 0.8],
  arctic: ['#a8c6e8', '#e9f4ff', '#86aad6', '#f4faff', 1], city: ['#9aa6c4', null, '#7d89aa', null, 0.9], sea: ['#a8c6e8', null, '#8fb4dc', null, 0.12], home: ['#a9c9a0', null, '#8db684', null, 0.6]
};
function mountains(p, base, hgt, col, snow, seed) {""")
rep("  g.fillStyle = snow;\n  for (let i = 0; i < pts.length; i++) { const q = pts[i], w = 22;", "  if (!snow) return; g.fillStyle = snow;\n  for (let i = 0; i < pts.length; i++) { const q = pts[i], w = 22;")
rep("else if (n >= 7) { const fl = 0.85 + Math.sin(t * 20) * 0.15; c.fillStyle = 'rgba(255,140,40,.7)'; c.beginPath(); c.moveTo(-0.3, -0.4); c.quadraticCurveTo(-1.2 * fl, -0.2, -0.3, 0.2); c.fill(); c.fillStyle = '#6a4a3a'; c.beginPath(); c.arc(0, -0.1, 0.5, 0, 7); c.fill();",
    "else if (n >= 7) { const fl = 0.85 + Math.sin(t * 20) * 0.15; c.fillStyle = 'rgba(255,140,40,.7)'; c.beginPath(); c.moveTo(-0.3, -0.5); c.quadraticCurveTo(-1.2 * fl, -0.4, -0.35, -0.05); c.fill(); c.fillStyle = '#6a4a3a'; c.beginPath(); c.arc(0, -0.1, 0.5, Math.PI * 1.02, Math.PI * 2.05); c.closePath(); c.fill();")
rep("list = OBS[R.id] || OBS.farm, wet = R.water,", "list = OBS[R.id] || OBS.farm, wet = !!R.water,")
rep("if (wet !== isWater(x) || x < 22) continue;", "if (wet !== !!isWater(x) || x < 22) continue;")
# an air ceiling: the trip round the world is flown, not coasted through space
rep("  if (F.splash) { ax -= vx * 1.6; ay -= vy * 1.2; }", "  if (F.splash) { ax -= vx * 1.6; ay -= vy * 1.2; }\n  if (F.y > CEIL) { ay -= (F.y - CEIL) * 0.06 + (vy > 0 ? vy * 0.4 : 0); if (!F.ceilT) { F.ceilT = 1; FXH('ceiling'); } }")
rep("const rho = y =>", "const CEIL = 2400;         // above this the air is too thin to carry a hen: she is pushed back down\nconst rho = y =>")
rep("w = clamp(1 + (F.air - 4) / 4, 1, 2.8 + clamp(F.y / 400, 0, 3.2));", "w = clamp(1 + (F.air - 4) / 3, 1, 3.5 + clamp(F.y / 300, 0, 4.5));")
rep("    case 'space':\n      if (!quiet) { banner('PEPPER IS IN', 'SPACE!'); sfx.space(); }\n      break;", "    case 'space':\n      if (!quiet) { banner('PEPPER IS IN', 'SPACE!'); sfx.space(); }\n      break;\n    case 'ceiling':\n      if (!quiet) { banner('THE AIR IS TOO THIN', 'Go far, not high!'); sfx.stall && sfx.stall(); }\n      break;")
# unlock gates: the desert, the jungle, the frozen north
rex(r"const unlocked = it => .*?\n", "const unlocked = it => !it.post || (it.post === 1 || it.post === true ? S.best.dist >= REGIONS[2].at : it.post === 2 ? S.best.dist >= REGIONS[4].at : S.best.dist >= REGIONS[6].at);\n")
rex(r"const lockText = it => .*?\n", "const lockText = it => { const R = REGIONS[it.post === 2 ? 4 : it.post === 3 ? 6 : 2]; return `Reach the ${R.name} (${fmt(R.at)} m) to unlock`; };\n")
rep("const CEIL = 2400;", "const CEIL = 3200;")
rep("tgt = (style === 'dist' ? 30 : 68) * DEG", "tgt = (style === 'dist' ? 22 : 68) * DEG")
rep("  setT('hCoins', fmt(F.coins));", "  setT('hCoins', fmt(F.coins + (F.cash || 0)));")
# progression gates by distance flown
rex(r"const unlocked = it => .*?\n", "const GATES = [0, 3000, 9000, 19500];\nconst unlocked = it => !it.post || S.best.dist >= GATES[it.post === true ? 1 : it.post];\n")
rex(r"const lockText = it => .*?\n", "const lockText = it => { const d = GATES[it.post === true ? 1 : it.post]; return `Fly ${fmt(d)} m (${regionAt(d).name}) to unlock`; };\n")
# the tail fan runs on a battery; the air gets thick past ~1000 km/h so nobody coasts forever
rep("  if (st.tail && !F.contact && v > 3) {", "  if (st.tail && !F.contact && v > 3 && (F.tailT = (F.tailT || 0) + dt) < st.tailDur) {")
rep("    tail: S.gad.tail ? GADGETS[10].lv[S.gad.tail - 1] : 0\n", "    tail: S.gad.tail ? GADGETS[10].lv[S.gad.tail - 1] : 0, tailDur: [0, 12, 18, 26][S.gad.tail || 0]\n")
rep("    const df = dens * v * v * (st.d0 + st.dk * 2 * sa * sa);", "    const df = dens * v * v * (st.d0 + st.dk * 2 * sa * sa) + (v > VWALL ? (v - VWALL) * (v - VWALL) * 0.004 : 0);")
rep("const CEIL = 3200;", "const CEIL = 3200;\nconst VWALL = 280;       // m/s: past this the air pushes back hard")
rep("desc: 'A buzzing fan on your tail: a gentle push the whole time you fly.', lv: [0.5, 1, 1.8]", "desc: 'A buzzing fan on your tail: a steady push for the first 12 / 18 / 26 seconds of every flight.', lv: [0.8, 1.4, 2.2]")
rep("desc: 'Slowly refills your tank up in space while the rocket is off.', lv: [0.12, 0.22, 0.35]", "desc: 'Refills your tank while you slide along the ground with the rocket off.', lv: [0.3, 0.5, 0.8]")
rep("else if (st.recycle && F.y > SPACE && F.fuelMax > 0)", "else if (st.recycle && F.contact && F.fuelMax > 0)")
rep("if (F.y > CEIL) { ay -= (F.y - CEIL) * 0.06 + (vy > 0 ? vy * 0.4 : 0);", "if (F.y > CEIL) { ay -= (F.y - CEIL) * 0.35 + (vy > 0 ? vy * 1.2 : 0);")
rep("desc: 'Refills your tank while you slide along the ground with the rocket off.', lv: [0.3, 0.5, 0.8]", "desc: 'Everything you smash puts a splash of fuel back in your tank.', lv: [0.25, 0.45, 0.7]")
rep("else if (st.recycle && F.contact && F.fuelMax > 0) F.fuel = Math.min(F.fuelMax, F.fuel + st.recycle * dt);", "")
rep("F.smash++; const pay = Math.round(o.pay * st.piggy); F.cash += pay;", "F.smash++; const pay = Math.round(o.pay * st.piggy); F.cash += pay; if (st.recycle && F.fuelMax > 0) F.fuel = Math.min(F.fuelMax, F.fuel + st.recycle);")
rep("const CEIL = 3200;", "const CEIL = 3800;")
rep("(v > VWALL ? (v - VWALL) * (v - VWALL) * 0.004 : 0)", "(v > st.vwall ? (v - st.vwall) * (v - st.vwall) * 0.004 : 0)")
rep("tailDur: [0, 12, 18, 26][S.gad.tail || 0]\n", "tailDur: [0, 12, 18, 26][S.gad.tail || 0], vwall: VWALL + 14 * S.tier.rocket\n")
