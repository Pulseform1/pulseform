  /* ---------- 20 data: guns, shields, operatives, difficulty, timings, money ----------
     Handling follows tactical-shooter rules. The first shot goes exactly where you aim while you stand still. Moving adds
     error, none below about a quarter of run speed, so stopping (or tapping the opposite key to counter-strafe, which brakes
     hard) brings accuracy straight back. Each shot of a spray after the first 'free' ones adds error and climbs, then the
     spray sways side to side; let go and it settles in 'recov' seconds. Damage depends on what you hit (head, body, legs)
     and how far away it is; shields soak damage until they run out.
     acc, in degrees: fs first shot (sfs scoped), walk / run / jump movement error, inc and max spray error.
     pat: vk climb per shot up to vmax, hk sideways sway after hs0 shots. dmg rows: [up to metres, head, body, legs]. */
  const GUN = (k, n, cat, slot, cost, col, o) => Object.assign({ k, n, cat, slot, cost, col, spd: 1, equip: .75, punch: .5, auto: false }, o);
  const GUNS = {
    pip: GUN('pip', 'Pip', 'Sidearm', 2, 0, '#9aa4b0', { mag: 12, res: 36, rpm: 405, rel: 1.75, alt: 'burst3', dmg: [[30, 26], [99, 22]], head: 3, legs: .85, acc: { fs: .4, walk: 1.1, run: 2.2, jump: 5, inc: .6, max: 3, free: 0, recov: .35 }, pat: { vk: .6, vmax: 2.2, hs0: 4, hk: .5 }, desc: 'Free sidearm. Right click fires a three-round burst.' }),
    stub: GUN('stub', 'Stub', 'Sidearm', 2, 300, '#d9a066', { mag: 2, res: 6, rpm: 198, rel: 1.75, pel: 15, pspr: 4, dmg: [[7, 12], [15, 8], [99, 3]], head: 3, legs: .75, acc: { fs: .3, walk: .5, run: 1, jump: 3, inc: 0, max: 0, free: 0, recov: .3 }, punch: 2.5, desc: 'Two-shot sawn-off. Brutal inside 7 m, harmless past 15.' }),
    wasp: GUN('wasp', 'Wasp', 'Sidearm', 2, 450, '#ffd23f', { mag: 13, res: 39, rpm: 600, rel: 1.5, auto: true, dmg: [[20, 26], [99, 21]], head: 3, legs: .85, acc: { fs: .45, walk: 1, run: 2, jump: 5, inc: .8, max: 4.5, free: 0, recov: .35 }, pat: { vk: .35, vmax: 2, hs0: 4, hk: .9 }, desc: 'Machine pistol. Sprays fast, wild after a few shots.' }),
    quill: GUN('quill', 'Quill', 'Sidearm', 2, 500, '#8fe3ff', { mag: 15, res: 45, rpm: 405, rel: 1.5, sil: 1, dmg: [[30, 30], [99, 25]], head: 3.5, legs: .85, acc: { fs: .3, walk: .9, run: 1.9, jump: 5, inc: .5, max: 2.6, free: 0, recov: .3 }, pat: { vk: .5, vmax: 2, hs0: 5, hk: .4 }, desc: 'Suppressed pistol. Quiet and precise; one headshot on bare health.' }),
    hammer: GUN('hammer', 'Hammer', 'Sidearm', 2, 800, '#d4a24c', { mag: 6, res: 24, rpm: 240, rel: 2.25, dmg: [[30, 55], [99, 50]], head: 2.9, legs: .85, acc: { fs: .25, walk: 1.4, run: 2.8, jump: 6, inc: 2.2, max: 5, free: 0, recov: .45 }, pat: { vk: 1.6, vmax: 4, hs0: 3, hk: .5 }, punch: 2.2, desc: 'Revolver. A headshot kills anyone at any range.' }),
    gnat: GUN('gnat', 'Gnat', 'SMG', 1, 950, '#a6f04d', { mag: 20, res: 60, rpm: 960, rel: 2.25, auto: true, ads: 1.15, punch: 1.05, kickV: 1.25, dmg: [[10, 22], [20, 19], [99, 15]], head: 2.5, legs: .85, acc: { fs: .4, walk: .9, run: 2.2, jump: 5, inc: .7, max: 5.5, free: 0, recov: .4 }, pat: { vk: .55, vmax: 4.2, hs0: 4, hk: 1.6 }, desc: 'Cheap, very fast SMG. Deadly at arm\'s length; the spray climbs hard and it fades fast with range. Tap or short bursts.' }),
    hornet: GUN('hornet', 'Hornet', 'SMG', 1, 1600, '#3ee6c1', { mag: 30, res: 90, rpm: 800, rel: 2.25, auto: true, ads: 1.15, sil: 1, punch: .85, kickV: 1.05, dmg: [[15, 23], [30, 20], [99, 17]], head: 3, legs: .85, acc: { fs: .3, walk: .7, run: 1.4, jump: 4, inc: .5, max: 3.6, free: 1, recov: .34 }, pat: { vk: .42, vmax: 3, hs0: 6, hk: 1.1 }, desc: 'Suppressed SMG. Steadier on the move than the Gnat; still climbs, so burst it past mid range.' }),
    breaker: GUN('breaker', 'Breaker', 'Shotgun', 1, 850, '#ffb347', { mag: 5, res: 10, rpm: 66, rel: 2.5, pel: 15, pspr: 2.6, equip: 1, dmg: [[8, 20], [12, 17], [99, 13]], head: 2, legs: .85, acc: { fs: .2, walk: .4, run: 1, jump: 3, inc: 0, max: 0, free: 0, recov: .3 }, punch: 3, desc: 'Pump shotgun. One shot up close, slow to cycle.' }),
    thresher: GUN('thresher', 'Thresher', 'Shotgun', 1, 1850, '#ff6a3d', { mag: 7, res: 21, rpm: 210, rel: 2.2, auto: true, pel: 12, pspr: 2.25, equip: 1, dmg: [[10, 17], [15, 13], [99, 10]], head: 2, legs: .85, acc: { fs: .2, walk: .4, run: .9, jump: 3, inc: .4, max: 2, free: 0, recov: .4 }, punch: 2, desc: 'Auto shotgun. Hold a corner and nothing walks past.' }),
    mako: GUN('mako', 'Mako', 'Rifle', 1, 2050, '#4f7dff', { mag: 24, res: 72, rpm: 594, rel: 2.5, auto: true, ads: 1.25, alt: 'burst4', equip: 1, dmg: [[99, 35]], head: 3.3, legs: .85, acc: { fs: .3, walk: 1.8, run: 5.5, jump: 9, inc: .45, max: 3.4, free: 0, recov: .36 }, pat: { vk: .4, vmax: 3, hs0: 6, hk: 1.1 }, desc: 'Budget rifle. Aim down sights (right click) to fire 4-round bursts.' }),
    paladin: GUN('paladin', 'Paladin', 'Rifle', 1, 2250, '#e6d3a3', { mag: 12, res: 36, rpm: 285, rel: 2.5, ads: 1.5, equip: 1, dmg: [[99, 65]], head: 3, legs: .75, acc: { fs: .1, walk: 2.2, run: 6, jump: 10, inc: 1.2, max: 3, free: 0, recov: .3 }, pat: { vk: 1, vmax: 3, hs0: 4, hk: .4 }, punch: 1.6, desc: 'Marksman rifle. One headshot kills. Tap, do not spray.' }),
    // the two 2900 rifles: the Vesper sprays (quiet, tight for its first shots, a gentle climb, weaker far away); the Lancer taps (one headshot kills at any range, the first shot is pin-point, then it climbs hard)
    vesper: GUN('vesper', 'Vesper', 'Rifle', 1, 2900, '#ff5fb0', { mag: 30, res: 60, rpm: 660, rel: 2.5, auto: true, ads: 1.25, sil: 1, equip: 1, punch: .42, kickV: .8, dmg: [[15, 39], [30, 35], [99, 31]], head: 4, legs: .85, acc: { fs: .2, walk: 1.6, run: 6, jump: 10, inc: .2, max: 2.4, free: 2, recov: .3 }, pat: { vk: .3, vmax: 2.4, hs0: 6, hk: .75 }, desc: 'Suppressed spray rifle. Fast, quiet and steady for its first shots; the climb is gentle. A headshot kills inside 15 m; it loses damage past that.' }),
    lancer: GUN('lancer', 'Lancer', 'Rifle', 1, 2900, '#e5484d', { mag: 25, res: 50, rpm: 585, rel: 2.5, auto: true, ads: 1.25, equip: 1, punch: .62, kickV: 1.3, dmg: [[99, 40]], head: 4, legs: .85, acc: { fs: .15, walk: 1.6, run: 6, jump: 10, inc: .5, max: 3.6, free: 1, recov: .38 }, pat: { vk: .55, vmax: 4, hs0: 4, hk: 1.35 }, desc: 'Tap rifle. One headshot kills at any range and the first shot is pin-point, but it kicks hard: tap or burst three.' }),
    kite: GUN('kite', 'Kite', 'Sniper', 1, 950, '#9fb6ff', { mag: 5, res: 10, rpm: 90, rel: 2.5, scope: [2.5], equip: 1, dmg: [[99, 101]], head: 2, legs: .85, acc: { fs: 2.5, sfs: 0, walk: 3, run: 8, jump: 12, inc: 0, max: 0, free: 0, recov: .3 }, punch: 3, desc: 'Light sniper. Cheap. A headshot kills, two body shots do.' }),
    longbow: GUN('longbow', 'Longbow', 'Sniper', 1, 4700, '#c58cff', { mag: 5, res: 10, rpm: 36, rel: 3.7, scope: [2.5, 5], spd: .92, equip: 1.25, dmg: [[99, 150]], head: 1.7, legs: .85, acc: { fs: 5, sfs: 0, walk: 5, run: 10, jump: 14, inc: 0, max: 0, free: 0, recov: .3 }, punch: 4, desc: 'Heavy sniper. One body shot kills. Right click twice for 5x.' }),
    knife: GUN('knife', 'Knife', 'Melee', 3, 0, '#ff8a3d', { melee: 1, auto: true, mag: 0, res: 0, rpm: 140, rel: 0, spd: 1.25, equip: .4, dmg: [[2.4, 50]], head: 1.5, legs: 1, acc: { fs: 0, walk: 0, run: 0, jump: 0, inc: 0, max: 0, free: 0, recov: .3 }, desc: 'Always with you. Left click slashes, right click stabs: 150 from behind. You run faster with it out.' }),
    torrent: GUN('torrent', 'Torrent', 'Heavy', 1, 3200, '#e8e8e8', { mag: 60, res: 120, rpm: 720, spin: .3, rel: 5, auto: true, ads: 1.25, spd: .9, equip: 1.25, kickV: 1.1, dmg: [[30, 38], [99, 31]], head: 2.5, legs: .85, acc: { fs: .8, walk: 2, run: 4, jump: 8, inc: .15, inc2: .22, n2: 10, max: 4.5, free: 0, recov: .45 }, pat: { vk: .12, n2: 10, vk2: .42, vmax: 6, hs0: 10, hk: .9 }, desc: 'Machine gun. 60 rounds that fire faster the longer you hold. Steady for ten shots, then it climbs hard: pull down.' }),
  };
  // round money: pistol rounds (1 and 5) start everyone on 800; winning, losing streaks, kills and plants pay for the next round's buys
  // damage is the body damage at that range times where it landed: G.head for the head, G.legs for the legs (1 head, 2 body, 3 legs)
  const dmgAt = (G, dist, part) => { const row = G.dmg.find(r => dist <= r[0]) || G.dmg[G.dmg.length - 1]; return Math.round(row[1] * (part === 1 ? G.head : part === 3 ? G.legs : 1)); };
  const zoomOf = f => { const G = GUNS[f.guns[f.slot]] || GUNS.pip; return !f.scoped ? 1 : G.scope ? G.scope[Math.min(G.scope.length, +f.scoped) - 1] : G.ads || 1; };
  // the smoke grenade: bought with round money, up to `per` at a time; G throws one
  const NADE = { k: 'smoke', n: 'Smoke grenade', short: 'Smoke', cat: 'Utility', cost: 200, per: 2, col: '#c3cad4', R: 4.2, T: 15, fuse: 1.5,
    desc: 'Thrown with G (the SMOKE button on touch). Bounces off walls and crates, then pops into a thick grey cloud that blocks sight for 15 s. Carry up to two.' };
  const ARMOR = [{ k: 'light', n: 'Light shield', cost: 400, sh: 25 }, { k: 'heavy', n: 'Heavy shield', cost: 1000, sh: 50 }];
  // the armory's tabs, in order
  const CLASSES = [['Sidearm', 'Sidearms'], ['SMG', 'SMGs'], ['Shotgun', 'Shotguns'], ['Rifle', 'Rifles'], ['Sniper', 'Snipers'], ['Heavy', 'Heavy'], ['Shield', 'Shields']];
  const OPS = {
    vex: { n: 'VEX', role: 'Shade', col: '#8f6bff', bio: 'Smoke and a sudden step: Vex fights where you cannot see.', q: { n: 'Blink', d: 'Dash 6 m the way you are moving.' }, e: { n: 'Veil', d: 'Throw a smoke cloud that blocks sight for 12 s.' } },
    iris: { n: 'IRIS', role: 'Seer', col: '#35e0c8', bio: 'Iris sees through walls. Then she makes you look away.', q: { n: 'Ping', d: 'See your rival through walls for 3 s.' }, e: { n: 'Flare', d: 'A flash that blinds whoever is looking at it.' } },
    bastion: { n: 'BASTION', role: 'Warden', col: '#ffb347', bio: 'A wall, a patch, and a refusal to move.', q: { n: 'Rampart', d: 'Raise a wall in front of you for 12 s.' }, e: { n: 'Patch', d: 'Heal 60 health over 3 s.' } },
    nova: { n: 'NOVA', role: 'Striker', col: '#ffe14d', bio: 'A courier who outran everything once. She still does.', q: { n: 'Surge', d: '3.5 s of speed, and your sprays settle twice as fast.' }, e: { n: 'Shockwave', d: 'A blast where you aim: rivals caught are slowed, shaky and stung for 15.' } },
    wraith: { n: 'WRAITH', role: 'Phantom', col: '#a9b8ff', bio: 'Nobody has seen Wraith arrive. That is the point.', q: { n: 'Shroud', d: 'Nearly invisible beyond 5 m and silent for 5 s. Firing ends it.' }, e: { n: 'Ghost Step', d: 'Fake footsteps, then fake gunfire, where you aim. Rivals hear it as real.' } },
    talon: { n: 'TALON', role: 'Tracker', col: '#7bd65a', bio: 'A ranger who reads a room like tracks in snow.', q: { n: 'Recon Dart', d: 'A dart that sticks where it lands and pulses twice, revealing rivals in its sight.' }, e: { n: 'Snare', d: 'A trap on the floor ahead: the first rival over it is slowed and revealed.' } },
    ember: { n: 'EMBER', role: 'Pyre', col: '#ff7a2f', bio: 'Foundry-born. Thinks every problem is a fuel problem.', q: { n: 'Ignite', d: 'Lob a firebomb: its pool burns rivals for 30 a second, 5 s.' }, e: { n: 'Heat Haze', d: 'A wall of amber haze across your view that blocks sight for 10 s.' } },
    axiom: { n: 'AXIOM', role: 'Engineer', col: '#5aa0ff', bio: 'Builds the thing that holds the angle, then goes for coffee.', q: { n: 'Sentry', d: 'A turret that fires on rivals in front of it until it is shot down.' }, e: { n: 'Tripmine', d: 'A mine at your feet. Armed, it bursts for up to 75 when a rival comes near.' } },
  };
  /* Abilities the way the genre does them: Q is bought in the armory (a price a charge, up to its most), E is the signature that
     comes free every round, X is the ultimate, which charges a point at a time: a kill, a death, planting or defusing the
     charge, and the two orbs that sit on the map each round (hold F over one). Bought charges you don't use carry into the
     next round; they are cleared when sides swap. Ultimate points never are. */
  const ABQ = { vex: [150, 2], iris: [250, 1], bastion: [300, 1], nova: [150, 2], wraith: [250, 1], talon: [150, 2], ember: [250, 1], axiom: [300, 1] };
  const ULTS = {
    vex: { n: 'Nightwalk', d: 'Gather the dark for a second, then step out of it wherever you aim, up to 30 m away.', pts: 6 },
    iris: { n: 'Allsight', d: 'Every rival on the map shows through the walls for 6 s.', pts: 6 },
    bastion: { n: 'Bulwark', d: 'Back to full health with a heavy shield, and you take half damage for 8 s.', pts: 6 },
    nova: { n: 'Overdrive', d: '10 s of Surge, and running no longer throws your aim.', pts: 6 },
    wraith: { n: 'Phase', d: 'Gone for 8 s: unseen even up close, and silent. Firing brings you back.', pts: 6 },
    talon: { n: 'Piercer', d: 'Three bolts along your aim, a second apart, that go straight through walls for 75 each.', pts: 7 },
    ember: { n: 'Inferno', d: 'Lob a great firebomb: a 5.5 m blaze that burns rivals for 40 a second, 8 s.', pts: 6 },
    axiom: { n: 'Lockdown', d: 'Plant a device; 2.5 s later every rival within 14 m is held: slowed, and unable to fire or use abilities, for 4 s.', pts: 7 },
  };
  for (const k in OPS) { OPS[k].q.cost = ABQ[k][0]; OPS[k].q.max = ABQ[k][1]; OPS[k].x = ULTS[k]; }
  const ultCost = f => OPS[f.op] ? OPS[f.op].x.pts : 6;
  const ORB = { n: 2, take: 1, r: 1.3 };   // ultimate orbs: how many on the map, the seconds of F to take one, how near you stand
  // bots aim like people, not aimbots: react = seconds before they start shooting at what they see; lag = how old their
  // picture of where you are is (so strafing makes them miss); err = the first-sight aim error (rad) they then correct over
  // flick seconds; jit = the wobble that never goes away (rad); turn = fastest they can swing (rad/s); spray = recoil
  // control 0..1; hs = how often they go for the head; hear = how far away they notice footsteps (m)
  const DIFF = [
    { n: 'Recruit', react: .8, lag: .28, err: .14, flick: .6, jit: .03, turn: 3, spray: .25, hs: .06, hear: 14 },
    { n: 'Veteran', react: .52, lag: .2, err: .095, flick: .45, jit: .02, turn: 4.4, spray: .5, hs: .15, hear: 20 },
    { n: 'Elite', react: .36, lag: .14, err: .065, flick: .32, jit: .013, turn: 6, spray: .72, hs: .28, hear: 26 },
    { n: 'Legend', react: .27, lag: .11, err: .045, flick: .26, jit: .01, turn: 7.2, spray: .84, hs: .36, hear: 30 },
  ];
  const LOAD_T = 5;   // the loading screen before the first round: added to that round's buy phase, so no buy time is lost
  let WIN_ROUNDS = 5; const BUY_T = 15, ROUND_T = 80, PLANT_T = 3.5, DEFUSE_T = 6, FUSE_T = 38, END_T = 4.5;
  const MATCH_LENS = [3, 4, 5, 6], winOf = w => MATCH_LENS.includes(+w) ? +w : 5, HALF = () => WIN_ROUNDS - 1;
  // overtime: tied at one short of the target after both halves, rounds go on (sides swap every round, credits topped up) until
  // one team is two ahead; after OT_MAX overtime rounds still level, the next round settles it (sudden death)
  const OT_MAX = 6, otRound = n => Math.max(0, n - 2 * HALF()), suddenDeath = n => otRound(n) > OT_MAX;   // first to 3/4/5/6: best of 5/7/9/11, sides swap at the half
  // round credits are tight: a win doesn't always buy a rifle and shields, a loss rarely does
  const CASH = { start: 800, win: 2600, loss: [1600, 2000, 2400], kill: 150, plant: 250, cap: 9000, decider: 4500 };
  // the adaptive bot: your skill rating picks its level, between these ratings it blends from one to the next
  const RATING_AT = [700, 1000, 1300, 1600];
  function diffFor(r) {
    r = cl(r || 1000, 600, 1750); let i = 0; while (i < DIFF.length - 2 && r > RATING_AT[i + 1]) i++;
    const t = cl((r - RATING_AT[i]) / (RATING_AT[i + 1] - RATING_AT[i]), 0, 1), a = DIFF[i], b = DIFF[i + 1], D = {};
    for (const k of Object.keys(a)) D[k] = typeof a[k] === 'number' ? lp(a[k], b[k], t) : a[k];
    const idx = t > .5 ? i + 1 : i; D.n = DIFF[idx].n; return { D, i: idx };
  }
  const rankName = r => { const { i } = diffFor(r); return DIFF[i].n; };
  const RANK_COL = ['#9aa4b0', '#7fc8ff', '#c58cff', '#ffd23f'];
  // a bot's rating, for the loading screen: an adaptive one sits near yours, a fixed level near that level's rating
  const botRating = (f, M) => Math.round(M.auto ? cl(M.rating + rnd(-60, 60), 600, 1800) : RATING_AT[cl(f.bot ? f.bot.diff : 1, 0, 3)] + rnd(10, 140));
  // the body: eye heights standing and crouched, radius, speeds (m/s), gravity, jump speed, the step you climb without jumping
  const teamSize = n => Math.max(1, Math.min(5, (n | 0) || 2)), vsLabel = n => teamSize(n) + 'V' + teamSize(n);   // 1v1 up to 5v5
  // the maps' mechanics: ice grip (of normal), low gravity (of normal), belt speed, a jump pad's throw, the vents' clock,
  // the sandstorm's clock and how far you see in it
  const DC_WAIT = 20;   // seconds a dropped player has to reconnect before they count as gone
  const ICE_GRIP = .14, LOW_G = .36, BELT_V = 3.4, PAD_VY = 11.5, VENT_EVERY = 15, VENT_ON = 5.5, VENT_GAP = 5.2, STORM_EVERY = 40, STORM_AT = 14, STORM_LEN = 12, STORM_SHIFT = 0, STORM_SIGHT = 13;
  const EYE = 1.62, CEYE = 1.12, RAD = .34, SPD = 5.4, WALK = 2.7, CSPD = 2.3, GRAV = 19, JUMP = 6.6, STEP = .42;
  // sliding (crouch while running with the knife out; there is no sprint, the knife is the quick way round)
  const SPRINT = 7.4, SLIDE_V = 10.8, SLIDE_T = .75, SLIDE_CD = .9;
