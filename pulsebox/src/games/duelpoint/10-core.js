  /* ---------- 10 core: maths, the event bus, settings and saved stats ----------
     Parts 10 to 60 are the simulation. They never touch the page or Three.js: pictures, sound and the HUD listen on
     the bus instead, so the same code runs in Node for the tests.
     Events (emit(name, ...)):
       shot(f, S, first)  dry(f)  reload(f)  swap(f)  melee(f, heavy, S)  hurt(v, by, dmg, head)  kill(v, by, head, gunKey)
       step(f)  jump(f)  land(f)  ability(f, key)  smoke(s)  wall(w)  flare(fl)  flarePop(fl)
       plantStart(f)  planted(f)  defuseStart(f)  defused(f)  beep()  boom(x, z)  buy(f, ok)
       round(n)  live()  end(winnerIdx, why)  over(won)  say(text, colour) */
  const TAU = Math.PI * 2, D2R = Math.PI / 180;
  const cl = (v, a, b) => v < a ? a : v > b ? b : v, lp = (a, b, t) => a + (b - a) * t, smooth = x => x * x * (3 - 2 * x);
  // one random source for the simulation, so a test can seed it and replay a match exactly
  let rng = Math.random;
  const R = () => rng(), rnd = (a, b) => a + R() * (b - a), pick = a => a[Math.floor(R() * a.length)];
  const seed = n => { let s = n >>> 0; rng = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const yawTo = (ax, az, bx, bz) => Math.atan2(-(bx - ax), -(bz - az));   // the yaw that looks from a to b (yaw 0 faces -z)

  const BUS = {};
  const on = (name, fn) => { (BUS[name] || (BUS[name] = [])).push(fn); };
  const emit = (name, a, b, c, d) => { const l = BUS[name]; if (l) for (let i = 0; i < l.length; i++) l[i](a, b, c, d); };

  // colours used by every drawing part
  const INK = '#0c1016', BONE = '#efe9dc', YOU = '#35e0c8', FOE = '#f43f3f', GOLD = '#ffd23f', DIM = '#8d97a6', WARN = '#ff5a4d', COIN = '#ffc94a';

  // settings and lifetime stats live in the kit's save for this game
  // xh is the crosshair: shape (cross, tee, x, circle, square, chevron, dot), colour and opacity, arm length, centre gap,
  // thickness, a centre dot and its size, a dark outline and its thickness, outer lines, and whether it opens with your
  // error (dyn) or stays fixed
  // sens: mouse turn speed; zsens: multiplier while aiming down sights or scoped; crouch: 'hold' or 'toggle'; full: go full
  // screen when you click in to play, which lets the game keep Ctrl shortcuts (Ctrl+W) from the browser
  const CFG = { v: 4, sens: .45, zsens: 1, tsens: 1, aim: 'mouse', aimSet: false, tpsens: .8, tpassist: false, crouch: 'hold', full: true, assist: true, autofire: true, quality: 'auto', op: 'vex', diff: 'auto', team: 'versus', size: 2, sites: 2,
    xh: { shape: 'cross', col: '#35e0c8', alpha: 1, len: 9, gap: 3, thick: 3, dot: true, dotSize: 0, outline: true, oth: 1.5, dyn: true, out: false, olen: 4, ogap: 6 } };
  let tickA = 1;   // how far the screen is between the last simulation tick and the next (99-main sets it), so motion is smooth at any refresh rate
  // rating: your skill, which sets the adaptive bot
  // skins: the ids you own ('line:gun'); equip: what each gun wears
  const STATS = { matches: 0, wins: 0, kills: 0, heads: 0, coins: 0, rating: 1000, owned: [], eco: 2, skins: [], equip: {} };
  // (the kit, and so K.save, only exists once the page has finished loading: 99-main calls this on the first reset)
  const loadSave = () => { try { if (K.save.dp) { { const c = Object.assign({}, K.save.dp.cfg || {}), xh = Object.assign({}, CFG.xh, c.xh || {}); if (!(c.v >= 2)) { delete c.sens; } if (!(c.v >= 3)) { c.diff = 'auto'; c.v = 3; } if (!(c.v >= 4)) { c.size = 2; c.team = 'versus'; c.v = 4; } Object.assign(CFG, c); CFG.xh = xh; } const st = K.save.dp.stats || {}; if (!(st.eco >= 2)) { st.coins = 0; st.eco = 2; }   /* the coin rules changed (35 a kill, 15 a win): everyone starts again from zero, keeping any guns already bought */
      Object.assign(STATS, st); if (!Array.isArray(STATS.owned)) STATS.owned = []; if (!Array.isArray(STATS.skins)) STATS.skins = []; if (!STATS.equip || typeof STATS.equip !== 'object') STATS.equip = {}; { const RETIRED = {'viper': 250, 'flux': 300, 'brick': 400, 'saber': 350, 'pulsar': 450, 'grinder': 350, 'tempest': 400, 'raptor': 550, 'nova': 600, 'specter': 650, 'warden': 700, 'harpoon': 800, 'lumen': 1000, 'hailstorm': 750, 'cyclone': 900}; let back = 0; STATS.owned = STATS.owned.filter(k => { if (k in RETIRED) { back += RETIRED[k]; return false; } return true; }); if (back) { STATS.coins += back; STATS.refunded = back; } } } } catch (e) {} };
  // saved on this device at once; `now` also asks the hub to copy it to the player's account straight away (a gun bought, a match paid)
  const saveAll = now => { try { K.save.dp = { cfg: CFG, stats: STATS }; K.persist(); if (now && window.parent !== window) window.parent.postMessage({ pbx: 'save' }, location.origin); } catch (e) {} };
