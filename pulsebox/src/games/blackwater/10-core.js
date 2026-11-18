  /* ---------- 10 core: maths, the event bus, items, recipes, settings ----------
     Events (emit): pickup(items) splash(x,z,big) cast(kind) reel() catch(fish) eat(item) build(piece) break(cell) hurt(cell)
     bite(cell) sharkHit() thunder(dist) flash() giant() spout() pool() fall() climb() torch(on) cthulhu(phase) say(text) */
  const TAU = Math.PI * 2, D2R = Math.PI / 180, G = 9.81;
  const cl = (v, a, b) => v < a ? a : v > b ? b : v, lp = (a, b, t) => a + (b - a) * t, sm = x => x * x * (3 - 2 * x);
  const ease = (cur, to, rate, dt) => cur + (to - cur) * (1 - Math.exp(-rate * dt));   // approach a target at a rate, any frame rate
  let rng = Math.random;
  const R = () => rng(), rnd = (a, b) => a + R() * (b - a), pick = a => a[Math.floor(R() * a.length)], chance = p => R() < p;
  const seed = n => { let s = n >>> 0; rng = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const BUS = {};
  const on = (n, fn) => { (BUS[n] || (BUS[n] = [])).push(fn); };
  const emit = (n, a, b, c) => { if (NET.hook) NET.hook(n, a); const l = BUS[n]; if (l) for (const f of l) f(a, b, c); };
  /* online co-op (60-net fills this in). Alone, NET.client is false and every part runs here. With friends, the host runs the sea,
     the raft, the wreckage and the events; a client runs only its own body and tools and sends what it does to the host (NET.ask).
     NET.cap: while the host carries out a friend's request, what it would say or hand over goes back to that friend instead. */
  const NET = { on: false, client: false, ask: () => {}, cap: null, paddle: [0, 0], peers: new Map(), fw: null, out: [], gone: new Map(), hook: null };
  const say = (text, col) => { if (NET.cap) { NET.cap.says.push([text, col || '']); return; } if (NET.fw) NET.fw.push(['say', text, col || '']); emit('say', text, col); };
  const pickupMsg = (got, kind) => { if (NET.cap) { NET.cap.got.push(...got); return; } emit('pickup', got, kind); };

  // what you can carry. Fish are 'fish:<kind>' raw and 'cooked:<kind>'
  const ITEM = { plank: 'Plank', rope: 'Rope', scrap: 'Scrap', tinder: 'Dry tinder', biscuit: 'Ship biscuit', coconut: 'Coconut', line: 'Fishing line', water: 'Fresh water', log: 'Log', helm: 'Helm', sail: 'Sail', anchor: 'Anchor' };
  const DRINK = { water: 40, coconut: 18 };   // how much each one quenches thirst
  const FISH = {
    sardine: { n: 'Sardine', len: [.14, .22], kg: [.06, .14], raw: 5, cooked: 12, pull: .45, stam: 3, w: 40 },
    mackerel: { n: 'Mackerel', len: [.28, .42], kg: [.3, .9], raw: 9, cooked: 22, pull: .62, stam: 5, w: 32 },
    bream: { n: 'Sea bream', len: [.3, .5], kg: [.7, 2.2], raw: 12, cooked: 30, pull: .72, stam: 7, w: 18 },
    dorado: { n: 'Dorado', len: [.7, 1.2], kg: [4, 11], raw: 18, cooked: 45, pull: .88, stam: 10, w: 8 },
    tuna: { n: 'Yellowfin tuna', len: [1.1, 1.7], kg: [18, 45], raw: 26, cooked: 65, pull: 1, stam: 14, w: 3 },
  };
  const FOOD = { biscuit: 14, coconut: 10 };
  const itemName = k => k.startsWith('fish:') ? 'Raw ' + FISH[k.slice(5)].n.toLowerCase() : k.startsWith('cooked:') ? 'Cooked ' + FISH[k.slice(7)].n.toLowerCase() : ITEM[k] || k;
  const foodOf = k => k.startsWith('fish:') ? FISH[k.slice(5)].raw : k.startsWith('cooked:') ? FISH[k.slice(7)].cooked : FOOD[k] || 0;

  // tools: the hotbar. `need` is the recipe; `after` is how many pieces of salvage you must have hauled in before it shows
  const TOOLS = {
    hook: { n: 'Rope hook', key: 1 }, torch: { n: 'Torch', key: 2 },
    hammer: { n: 'Hammer', key: 3, need: { plank: 2, rope: 1 } },
    rod: { n: 'Fishing rod', key: 4, need: { plank: 2, rope: 2 }, after: 3 },
    spear: { n: 'Spear', key: 5, need: { plank: 2, scrap: 2 }, after: 5 },
    oar: { n: 'Oar', key: 6, need: { plank: 3, rope: 1 }, after: 5 },
    // upgrades: made once, they improve a tool you already have (they take no hotbar slot)
    ironhook: { n: 'Iron hook', need: { scrap: 4, rope: 2 }, after: 8, up: 'hook', tip: 'Throws further, reels heavy salvage in faster' },
    harpoon: { n: 'Barbed spear', need: { scrap: 3, plank: 1, rope: 1 }, up: 'spear', tip: 'Sharks give up after two hits, not three' },
  };
  // the steering gear: crafted at the bench (C) into your items, then placed on the deck with the hammer
  const GEAR = [
    { k: 'helm', n: 'Helm', need: { plank: 4, rope: 2, scrap: 2 }, tip: 'A wheel and rudder: steer the raft' },
    { k: 'sail', n: 'Sail', need: { plank: 5, rope: 4 }, tip: 'Mast and canvas: catch the wind' },
    { k: 'anchor', n: 'Anchor', need: { plank: 2, rope: 3, scrap: 3 }, tip: 'Hold the raft in one place' },
  ];
  // things you make from what you carry (as many as you like)
  const MAKE = [
    { k: 'rope', n: 'Twist rope', need: { tinder: 2 }, tip: 'Dry fibre twisted into a length of rope' },
    { k: 'plank', n: 'Split a log', need: { log: 1 }, out: 2, tip: 'Two planks from one log' },
    { k: 'scrap', n: 'Strip a barrel hoop', need: { plank: 3 }, tip: 'Pull the nails and bands: one scrap' },
  ];
  /* raft pieces. foundation: a cell of the raft. On a foundation: floor (decking), wall (one edge), shelter (a roof),
     storage (keeps tinder dry), fire (a fire pit: cook, relight the torch), reinforce (iron bands: sharks and waves do less) */
  const PIECES = {
    foundation: { n: 'Foundation', need: { plank: 4, rope: 2 }, hp: 100 },
    floor: { n: 'Floor', need: { plank: 2 } },
    wall: { n: 'Wall', need: { plank: 3 } },
    shelter: { n: 'Shelter', need: { plank: 4, rope: 2 } },
    storage: { n: 'Storage', need: { plank: 4, rope: 1, scrap: 1 } },
    fire: { n: 'Fire pit', need: { plank: 3, scrap: 2 } },
    reinforce: { n: 'Reinforced edge', need: { plank: 2, scrap: 2 } },
    catcher: { n: 'Rain catcher', need: { plank: 2, rope: 1, scrap: 1 }, tip: 'Fills with fresh water while it rains' },
    still: { n: 'Water still', need: { plank: 3, scrap: 3 }, tip: 'Turns sea water fresh in the sun' },
    trap: { n: 'Fish trap', need: { plank: 3, rope: 2 }, tip: 'Hangs off an edge and catches fish by itself' },
    helm: { n: 'Helm', need: { helm: 1 }, tip: 'E to take the wheel: A/D steer, W/S raise or lower the sails' },   // crafted first (C), then set on the deck
    sail: { n: 'Sail', need: { sail: 1 }, tip: 'Catches the wind. Raise it from the helm' },
    anchor: { n: 'Anchor', need: { anchor: 1 }, tip: 'E drops or raises it: holds the raft where it is' },
    net: { n: 'Salvage net', need: { plank: 2, rope: 3 }, tip: 'Hangs off an edge and catches wreckage that drifts into it' },
    lantern: { n: 'Lantern', need: { plank: 1, scrap: 2, tinder: 1 }, tip: 'Lights the deck at night; sharks shy away from it' },
  };
  const BUILD_ORDER = ['foundation', 'floor', 'wall', 'shelter', 'storage', 'fire', 'helm', 'sail', 'anchor', 'catcher', 'still', 'trap', 'net', 'lantern', 'reinforce'];
  const REPAIR = { plank: 1 };   // one plank mends 35 hp

  // settings and the saved run live in the kit's save for this game
  const CFG = { v: 1, quality: 'auto', reduce: false, vol: .8, sens: .5, keys: true };
  const loadCfg = () => { try { Object.assign(CFG, (K.save.bw || {}).cfg || {}); } catch (e) {} };
  const saveCfg = () => { try { K.save.bw = Object.assign(K.save.bw || {}, { cfg: CFG }); K.persist(); } catch (e) {} };
