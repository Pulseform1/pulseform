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
    pip: GUN('pip', 'Pip', 'Sidearm', 2, 0, '#9aa4b0', { mag: 12, res: 36, rpm: 405, rel: 1.75, alt: 'burst3', dmg: [[30, 26], [99, 22]], head: 3, legs: .85, acc: { fs: .4, walk: 1.1, run: 2.2, jump: 5, inc: .6, max: 3, free: 1, recov: .35 }, pat: { vk: .6, vmax: 2.2, hs0: 4, hk: .5 }, desc: 'Free sidearm. Right click fires a three-round burst.' }),
    stub: GUN('stub', 'Stub', 'Sidearm', 2, 300, '#d9a066', { mag: 2, res: 6, rpm: 198, rel: 1.75, pel: 15, pspr: 4, dmg: [[7, 12], [15, 8], [99, 3]], head: 3, legs: .75, acc: { fs: .3, walk: .5, run: 1, jump: 3, inc: 0, max: 0, free: 1, recov: .3 }, punch: 2.5, desc: 'Two-shot sawn-off. Brutal inside 7 m, harmless past 15.' }),
    wasp: GUN('wasp', 'Wasp', 'Sidearm', 2, 450, '#ffd23f', { mag: 13, res: 39, rpm: 600, rel: 1.5, auto: true, dmg: [[20, 26], [99, 21]], head: 3, legs: .85, acc: { fs: .45, walk: 1, run: 2, jump: 5, inc: .8, max: 4.5, free: 1, recov: .35 }, pat: { vk: .35, vmax: 2, hs0: 4, hk: .9 }, desc: 'Machine pistol. Sprays fast, wild after a few shots.' }),
    quill: GUN('quill', 'Quill', 'Sidearm', 2, 500, '#8fe3ff', { mag: 15, res: 45, rpm: 405, rel: 1.5, sil: 1, dmg: [[30, 30], [99, 25]], head: 3.5, legs: .85, acc: { fs: .3, walk: .9, run: 1.9, jump: 5, inc: .5, max: 2.6, free: 1, recov: .3 }, pat: { vk: .5, vmax: 2, hs0: 5, hk: .4 }, desc: 'Suppressed pistol. Quiet and precise; one headshot on bare health.' }),
    hammer: GUN('hammer', 'Hammer', 'Sidearm', 2, 800, '#d4a24c', { mag: 6, res: 24, rpm: 240, rel: 2.25, dmg: [[30, 55], [99, 50]], head: 2.9, legs: .85, acc: { fs: .25, walk: 1.4, run: 2.8, jump: 6, inc: 2.2, max: 5, free: 1, recov: .45 }, pat: { vk: 1.6, vmax: 4, hs0: 3, hk: .5 }, punch: 2.2, desc: 'Revolver. A headshot kills anyone at any range.' }),
    gnat: GUN('gnat', 'Gnat', 'SMG', 1, 950, '#a6f04d', { mag: 20, res: 60, rpm: 960, rel: 2.25, auto: true, ads: 1.15, dmg: [[15, 27], [99, 25]], head: 2.5, legs: .85, acc: { fs: .65, walk: 1.2, run: 2.6, jump: 5, inc: .5, max: 4.5, free: 1, recov: .35 }, pat: { vk: .3, vmax: 2.2, hs0: 6, hk: 1 }, desc: 'Cheap SMG. Shreds up close, then the spray runs away.' }),
    hornet: GUN('hornet', 'Hornet', 'SMG', 1, 1600, '#3ee6c1', { mag: 30, res: 90, rpm: 800, rel: 2.25, auto: true, ads: 1.15, sil: 1, dmg: [[20, 26], [99, 22]], head: 3, legs: .85, acc: { fs: .4, walk: .7, run: 1.4, jump: 4, inc: .35, max: 3, free: 2, recov: .3 }, pat: { vk: .28, vmax: 1.8, hs0: 7, hk: .8 }, desc: 'Suppressed SMG. Accurate on the move: the gun for eco rounds.' }),
    breaker: GUN('breaker', 'Breaker', 'Shotgun', 1, 850, '#ffb347', { mag: 5, res: 10, rpm: 66, rel: 2.5, pel: 15, pspr: 2.6, equip: 1, dmg: [[8, 20], [12, 17], [99, 13]], head: 2, legs: .85, acc: { fs: .2, walk: .4, run: 1, jump: 3, inc: 0, max: 0, free: 1, recov: .3 }, punch: 3, desc: 'Pump shotgun. One shot up close, slow to cycle.' }),
    thresher: GUN('thresher', 'Thresher', 'Shotgun', 1, 1850, '#ff6a3d', { mag: 7, res: 21, rpm: 210, rel: 2.2, auto: true, pel: 12, pspr: 2.25, equip: 1, dmg: [[10, 17], [15, 13], [99, 10]], head: 2, legs: .85, acc: { fs: .2, walk: .4, run: .9, jump: 3, inc: .4, max: 2, free: 1, recov: .4 }, punch: 2, desc: 'Auto shotgun. Hold a corner and nothing walks past.' }),
    mako: GUN('mako', 'Mako', 'Rifle', 1, 2050, '#4f7dff', { mag: 24, res: 72, rpm: 594, rel: 2.5, auto: true, ads: 1.25, alt: 'burst4', equip: 1, dmg: [[99, 35]], head: 3.3, legs: .85, acc: { fs: .3, walk: 2.5, run: 5.5, jump: 9, inc: .45, max: 4, free: 2, recov: .36 }, pat: { vk: .4, vmax: 3, hs0: 6, hk: 1.1 }, desc: 'Budget rifle. Aim down sights (right click) to fire 4-round bursts.' }),
    paladin: GUN('paladin', 'Paladin', 'Rifle', 1, 2250, '#e6d3a3', { mag: 12, res: 36, rpm: 285, rel: 2.5, ads: 1.5, equip: 1, dmg: [[99, 65]], head: 3, legs: .75, acc: { fs: .1, walk: 3, run: 6, jump: 10, inc: 1.2, max: 3, free: 1, recov: .3 }, pat: { vk: 1, vmax: 3, hs0: 4, hk: .4 }, punch: 1.6, desc: 'Marksman rifle. One headshot kills. Tap, do not spray.' }),
    vesper: GUN('vesper', 'Vesper', 'Rifle', 1, 2900, '#ff5fb0', { mag: 30, res: 60, rpm: 660, rel: 2.5, auto: true, ads: 1.25, sil: 1, equip: 1, dmg: [[15, 39], [30, 35], [99, 31]], head: 4, legs: .85, acc: { fs: .2, walk: 2.5, run: 6, jump: 10, inc: .3, max: 3.5, free: 2, recov: .33 }, pat: { vk: .38, vmax: 2.8, hs0: 6, hk: 1 }, desc: 'Suppressed rifle. Fast and controllable; loses damage at range.' }),
    lancer: GUN('lancer', 'Lancer', 'Rifle', 1, 2900, '#e5484d', { mag: 25, res: 50, rpm: 585, rel: 2.5, auto: true, ads: 1.25, equip: 1, dmg: [[99, 40]], head: 4, legs: .85, acc: { fs: .25, walk: 2.6, run: 6, jump: 10, inc: .4, max: 4, free: 2, recov: .36 }, pat: { vk: .45, vmax: 3.4, hs0: 6, hk: 1.2 }, desc: 'Rifle. One headshot kills at any range. Kicks harder.' }),
    kite: GUN('kite', 'Kite', 'Sniper', 1, 950, '#9fb6ff', { mag: 5, res: 10, rpm: 90, rel: 2.5, scope: [2.5], equip: 1, dmg: [[99, 101]], head: 2, legs: .85, acc: { fs: 2.5, sfs: 0, walk: 3, run: 8, jump: 12, inc: 0, max: 0, free: 1, recov: .3 }, punch: 3, desc: 'Light sniper. Cheap. A headshot kills, two body shots do.' }),
    longbow: GUN('longbow', 'Longbow', 'Sniper', 1, 4700, '#c58cff', { mag: 5, res: 10, rpm: 36, rel: 3.7, scope: [2.5, 5], spd: .92, equip: 1.25, dmg: [[99, 150]], head: 1.7, legs: .85, acc: { fs: 5, sfs: 0, walk: 5, run: 10, jump: 14, inc: 0, max: 0, free: 1, recov: .3 }, punch: 4, desc: 'Heavy sniper. One body shot kills. Right click twice for 5x.' }),
    knife: GUN('knife', 'Knife', 'Melee', 3, 0, '#ff8a3d', { melee: 1, auto: true, mag: 0, res: 0, rpm: 140, rel: 0, spd: 1.18, equip: .4, dmg: [[2.4, 50]], head: 1.5, legs: 1, acc: { fs: 0, walk: 0, run: 0, jump: 0, inc: 0, max: 0, free: 1, recov: .3 }, desc: 'Always with you. Left click slashes, right click stabs: 150 from behind. You run faster with it out.' }),
    torrent: GUN('torrent', 'Torrent', 'Heavy', 1, 3200, '#e8e8e8', { mag: 100, res: 200, rpm: 720, spin: .3, rel: 5, auto: true, ads: 1.25, spd: .9, equip: 1.25, dmg: [[30, 38], [99, 31]], head: 2.5, legs: .85, acc: { fs: .8, walk: 2, run: 4, jump: 8, inc: .15, max: 3.5, free: 1, recov: .45 }, pat: { vk: .12, vmax: 1.6, hs0: 10, hk: .7 }, desc: 'Machine gun. 100 rounds that fire faster the longer you hold.' }),
  };
  // damage is the body damage at that range times where it landed: G.head for the head, G.legs for the legs (1 head, 2 body, 3 legs)
  const dmgAt = (G, dist, part) => { const row = G.dmg.find(r => dist <= r[0]) || G.dmg[G.dmg.length - 1]; return Math.round(row[1] * (part === 1 ? G.head : part === 3 ? G.legs : 1)); };
  const zoomOf = f => { const G = GUNS[f.guns[f.slot]] || GUNS.pip; return !f.scoped ? 1 : G.scope ? G.scope[Math.min(G.scope.length, +f.scoped) - 1] : G.ads || 1; };
  const ARMOR = [{ k: 'light', n: 'Light shield', cost: 400, sh: 25 }, { k: 'heavy', n: 'Heavy shield', cost: 1000, sh: 50 }];
  // the armory's tabs, in order
  const CLASSES = [['Sidearm', 'Sidearms'], ['SMG', 'SMGs'], ['Shotgun', 'Shotguns'], ['Rifle', 'Rifles'], ['Sniper', 'Snipers'], ['Heavy', 'Heavy'], ['Shield', 'Shields']];
  const OPS = {
    vex: { n: 'VEX', role: 'Shade', col: '#8f6bff', q: { n: 'Blink', d: 'Dash 6 m the way you are moving.' }, e: { n: 'Veil', d: 'Throw a smoke cloud that blocks sight for 12 s.' } },
    iris: { n: 'IRIS', role: 'Seer', col: '#35e0c8', q: { n: 'Ping', d: 'See your rival through walls for 3 s.' }, e: { n: 'Flare', d: 'A flash that blinds whoever is looking at it.' } },
    bastion: { n: 'BASTION', role: 'Warden', col: '#ffb347', q: { n: 'Rampart', d: 'Raise a wall in front of you for 12 s.' }, e: { n: 'Patch', d: 'Heal 60 health over 3 s.' } },
  };
  // bots aim like people, not aimbots: react = seconds before they start shooting at what they see; lag = how old their
  // picture of where you are is (so strafing makes them miss); err = the first-sight aim error (rad) they then correct over
  // flick seconds; jit = the wobble that never goes away (rad); turn = fastest they can swing (rad/s); spray = recoil
  // control 0..1; hs = how often they go for the head; hear = how far away they notice footsteps (m)
  const DIFF = [
    { n: 'Recruit', react: .8, lag: .28, err: .14, flick: .6, jit: .03, turn: 3, spray: .25, hs: .06, hear: 14 },
    { n: 'Veteran', react: .52, lag: .2, err: .095, flick: .45, jit: .02, turn: 4.4, spray: .5, hs: .15, hear: 20 },
    { n: 'Elite', react: .36, lag: .14, err: .065, flick: .32, jit: .013, turn: 6, spray: .72, hs: .28, hear: 26 },
  ];
  const WIN_ROUNDS = 5, BUY_T = 15, ROUND_T = 80, PLANT_T = 3.5, DEFUSE_T = 6, FUSE_T = 38, END_T = 4.5;
  const CASH = { start: 800, win: 3000, loss: [1900, 2400, 2900], kill: 200, plant: 300, cap: 9000, decider: 5000 };
  // the body: eye heights standing and crouched, radius, speeds (m/s), gravity, jump speed, the step you climb without jumping
  const EYE = 1.62, CEYE = 1.12, RAD = .34, SPD = 5.4, WALK = 2.7, CSPD = 2.3, GRAV = 19, JUMP = 6.2, STEP = .42;
