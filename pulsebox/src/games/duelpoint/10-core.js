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
  const INK = '#0c1016', BONE = '#efe9dc', YOU = '#35e0c8', FOE = '#ff8a3d', GOLD = '#ffd23f', DIM = '#8d97a6', WARN = '#ff5a4d';

  // settings and lifetime stats live in the kit's save for this game
  const CFG = { sens: 1, tsens: 1, assist: true, autofire: true, quality: 'auto', op: 'vex', diff: 1 };
  const STATS = { matches: 0, wins: 0, kills: 0, heads: 0 };
  // (the kit, and so K.save, only exists once the page has finished loading: 99-main calls this on the first reset)
  const loadSave = () => { try { if (K.save.dp) { Object.assign(CFG, K.save.dp.cfg || {}); Object.assign(STATS, K.save.dp.stats || {}); } } catch (e) {} };
  const saveAll = () => { try { K.save.dp = { cfg: CFG, stats: STATS }; K.persist(); } catch (e) {} };
