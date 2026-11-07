/* Tiny Aquarium: raise fish, collect the pearls grown fish make, breed pairs for rare colors and fill the collection
   book. Every fish has a name and a personality. Decorations and tank themes make fish happier (faster growth, more
   pearls). Goals guide the way, and events (feeding frenzy, buried treasure, a visiting sea turtle) pop up now and
   then. Progress is saved in K.save.aq (+ K.save.aqT, the time of the last save, for pearls made while away). */
const GAME = {
  id: 'tiny-aquarium', title: 'Tiny Aquarium', tagline: 'Raise fish, breed rare colors, build the dream tank.',
  font: 'Baloo 2', accent: '#4fd8ff', accent2: '#ffb3d1', bg: '#0b3a5a', noHud: true, scoreLabel: 'Fish discovered',
  how: ['Tap the water (or press Space) to drop food. Fed fish grow up.', 'Grown fish make pearls: tap them to collect. Tap a fish to meet it.', 'Two grown fish of a kind lay eggs. Some hatch in rare colors!'],
  skins: [
    { name: 'Lagoon', price: 0, c: ['#1d8fc7', '#0b3a5a'] }, { name: 'Reef', price: 60, c: ['#1fb5a8', '#0b4a4a'] }, { name: 'Deep', price: 150, c: ['#2a3a9a', '#0a0f2a'] },
    { name: 'Sunset', price: 250, c: ['#d2703a', '#3a1a4a'] }, { name: 'Glow', price: 400, c: ['#3a1a6a', '#05030f'] }, { name: 'Gold', price: 700, c: ['#c99a3a', '#3a2a0a'] },
  ],
};
(() => {
  const F = '"Baloo 2", "Trebuchet MS", sans-serif', fnt = (s, b) => (b ? '700 ' : '') + s + 'px ' + F;
  // species (index = saved id). L/H = body length/height at full size
  const SP = [
    { n: 'Guppy', cost: 10, val: 6, pearl: 1, h: 30, L: 30, H: 14, spd: 60 },
    { n: 'Clownfish', cost: 60, val: 30, pearl: 3, h: 22, L: 40, H: 22, spd: 52 },
    { n: 'Angelfish', cost: 220, val: 110, pearl: 8, h: 48, L: 34, H: 32, spd: 42 },
    { n: 'Pufferfish', cost: 700, val: 340, pearl: 20, h: 46, L: 38, H: 30, spd: 34 },
    { n: 'Seahorse', cost: 2000, val: 1000, pearl: 50, h: 36, L: 28, H: 56, spd: 22 },
    { n: 'Jellyfish', cost: 6000, val: 3200, pearl: 140, h: 300, L: 46, H: 40, spd: 16 },
    { n: 'Koi', cost: 18000, val: 9000, pearl: 380, h: 12, L: 66, H: 24, spd: 46 },
    { n: 'Golden Dragon', cost: 60000, val: 30000, pearl: 1200, h: 44, L: 82, H: 26, spd: 50 },
  ];
  const VARIANTS = [0, 160, 280, 90, 210], VNAMES = ['Classic', 'Mint', 'Violet', 'Lime', 'Sky'];
  const PERS = [{ n: 'Shy', d: 'hides near the sand', spd: .75 }, { n: 'Playful', d: 'loves to zoom around', spd: 1.15 }, { n: 'Greedy', d: 'first to every snack', spd: 1 }, { n: 'Lazy', d: 'naps a lot', spd: .55 }, { n: 'Curious', d: 'follows your finger', spd: .95 }];
  const NAMES = 'Bubbles Finn Nemo Coral Pip Splash Wiggles Goldie Sunny Bloop Sushi Pebble Marina Dory Fizz Pearl Squirt Noodle Biscuit Mochi Peaches Ziggy Tango Luna Skipper Twinkle Waffles Poppy Kiki Milo Juno Ollie Sprinkles Cookie Jelly Pickle Tofu Zuzu Bean Captain Mango Kiwi Taffy Ripple Sandy Echo Indigo Blossom Gizmo Nibbles Pudding Dumpling Shelly Wave Toast Sparkle Opal Cosmo Lulu Pixie'.split(' ');
  // decorations (index = saved id): x position on the sand, cost
  const DECOR = [
    { n: 'Seaweed', cost: 40, x: 150 }, { n: 'Coral', cost: 250, x: 335 }, { n: 'Treasure chest', cost: 900, x: 610 }, { n: 'Castle', cost: 3500, x: 860 }, { n: 'Bubble volcano', cost: 12000, x: 1035 }, { n: 'Sunken ship', cost: 50000, x: 1150 },
    { n: 'Giant clam', cost: 600, x: 500, d: 'Collects pearls for you' }, { n: 'Anemone', cost: 180, x: 980, d: 'Clownfish love it: more rare babies' }, { n: 'Diver helmet', cost: 1500, x: 250 }, { n: 'Rock arch', cost: 2500, x: 430 },
    { n: 'Glow mushrooms', cost: 6000, x: 735 }, { n: 'Starfish', cost: 120, x: 690 }, { n: 'Old columns', cost: 20000, x: 640 }, { n: 'Kelp forest', cost: 80000, x: 70 },
  ];
  const DRAW_ORDER = [13, 12, 5, 3, 9, 1, 0, 4, 10, 2, 7, 8, 6, 11];
  const THEMES = [{ n: 'Lagoon', cost: 0 }, { n: 'Coral reef', cost: 500 }, { n: 'Kelp forest', cost: 2000 }, { n: 'Sunken city', cost: 8000 }, { n: 'Night glow', cost: 25000 }, { n: 'Ice cave', cost: 60000 }];
  const CAP = [6, 10, 16, 24, 32, 40], CAP_COST = [0, 300, 2500, 20000, 150000, 600000];
  const T = { x0: 16, y0: 14, x1: 1264, y1: 604 }, SAND = 556, SURF = T.y0 + 30;
  const found = () => Object.keys(S.found).length, ownSp = (sp, grown) => fish.filter(f => f.sp === sp && (!grown || f.age >= 1)).length, st = k => S.st[k] || 0;
  // goals: [text, progress, target, pearls, coins]
  const GOALS = [
    ['Tap the water to feed your fish', () => st('feeds'), 3, 10, 0], ['Tap a fish to meet it', () => st('meet'), 1, 10, 0], ['Grow a baby fish up', () => fish.filter(f => f.age >= 1).length, 1, 20, 1],
    ['Collect 5 pearls', () => st('pearls'), 5, 20, 0], ['Buy a Clownfish', () => ownSp(1), 1, 30, 1], ['Add a decoration', () => S.decor.length, 1, 30, 0],
    ['Hatch an egg', () => st('eggs'), 1, 50, 1], ['Grow two Clownfish up', () => ownSp(1, 1), 2, 60, 0], ['Breed a fish in a rare color', () => st('rare'), 1, 100, 3],
    ['Buy an Angelfish', () => ownSp(2), 1, 100, 1], ['Get a bigger tank', () => S.cap, 1, 150, 1], ['Dig up buried treasure', () => st('treasure'), 1, 100, 1],
    ['Discover 10 kinds of fish', found, 10, 200, 2], ['Breed a rare Clownfish', () => Object.keys(S.found).filter(k => k[0] === '1' && k !== '1-0').length, 1, 300, 3], ['Own 5 decorations', () => S.decor.length, 5, 300, 1],
    ['Buy a Pufferfish', () => ownSp(3), 1, 400, 1], ['Unlock a new tank theme', () => S.themes.length - 1, 1, 500, 2], ['Pet the visiting sea turtle', () => st('turtle'), 1, 300, 1],
    ['Discover 15 kinds of fish', found, 15, 800, 3], ['Buy a Seahorse', () => ownSp(4), 1, 1000, 2], ['Own 10 decorations', () => S.decor.length, 10, 2000, 3],
    ['Buy a Jellyfish', () => ownSp(5), 1, 3000, 2], ['Discover 25 kinds of fish', found, 25, 5000, 5], ['Buy a Koi', () => ownSp(6), 1, 9000, 3],
    ['Get the biggest tank', () => S.cap, CAP.length - 1, 20000, 5], ['Buy a Golden Dragon', () => ownSp(7), 1, 30000, 5], ['Complete the collection book', found, 40, 100000, 10],
  ];
  let S, fish, food, pearls, eggs, bubbles, panel, card, saveT, hover, goalT, away, ev, evT, banners, motes, turtle, treasure, ptr, ptrT, psel, caust, cPat, hint, rip, clamT, botT, feedX;
  const fresh = () => ({ shells: 25, fish: [{ sp: 0, v: 0, age: .2, hunger: .3 }, { sp: 0, v: 0, age: .2, hunger: .3 }], decor: [], cap: 0, found: { '0-0': 1 }, theme: 0, themes: [0], goal: 0, st: {} });
  function spawn(f) {
    const o = Object.assign({ x: K.rand(T.x0 + 120, T.x1 - 120), y: K.rand(T.y0 + 120, SAND - 120), vx: K.rand(-30, 30), vy: 0, face: 1, wt: 0, tx: 640, ty: 300, seed: Math.random() * 9, ph: Math.random() * 6, layT: K.rand(20, 40), pT: K.rand(4, 10), zoom: 0, puff: 0, bub: 0 }, f);
    if (o.nm === undefined) o.nm = K.pick(NAMES); if (o.pe === undefined) o.pe = K.irand(0, 4); o.face = o.vx < 0 ? -1 : 1; o.tx = o.x; o.ty = o.y; return o;
  }
  const happy = () => 1 + S.decor.length * .15 + (S.themes.length - 1) * .05;
  const cap = () => CAP[S.cap];
  const fedPct = () => fish.length ? 1 - fish.reduce((a, f) => a + f.hunger, 0) / fish.length : 1;
  GAME.reset = () => {
    if (K.bot) {
      S = Object.assign(fresh(), { shells: 5000, fish: [], decor: [0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 13], cap: 4, theme: 1, themes: [0, 1], goal: 99 });
      const pick = [0, 0, 1, 1, 1, 2, 2, 3, 4, 5, 6, 6, 7, 0, 1, 2];
      pick.forEach(sp => S.fish.push({ sp, v: Math.random() < .3 ? K.irand(1, 4) : 0, age: K.rand(.6, 1), hunger: K.rand(.1, .6) }));
    } else {
      const old = K.save.aq; S = Object.assign(fresh(), old || {});
      if (old && old.goal === undefined) S.goal = 2;  // players from before goals skip the first how-to steps
      if (!Array.isArray(S.fish)) S.fish = []; if (!Array.isArray(S.decor)) S.decor = []; if (!S.found) S.found = {}; if (!Array.isArray(S.themes)) S.themes = [0]; if (!S.st) S.st = {};
      S.cap = K.clamp(S.cap | 0, 0, CAP.length - 1); S.theme = S.themes.includes(S.theme) ? S.theme : 0;
    }
    fish = S.fish.map(f => spawn({ sp: f.sp | 0, v: f.v | 0, age: +f.age || .1, hunger: +f.hunger || 0, nm: f.nm, pe: f.pe }));
    food = []; pearls = []; eggs = []; bubbles = []; panel = null; card = null; saveT = 0; hover = null; goalT = 0; away = 0; ev = null; banners = []; turtle = null; treasure = null; ptr = null; ptrT = 0; psel = -1; hint = 0; rip = []; clamT = 10; botT = 0; feedX = 300;
    evT = K.bot ? 6 : S.goal >= 6 ? K.rand(40, 70) : 9e9;
    motes = Array.from({ length: 40 }, () => ({ x: K.rand(T.x0, T.x1), y: K.rand(T.y0, SAND), r: K.rand(.6, 2), v: K.rand(4, 12), p: Math.random() * 6 }));
    // pearls made while away (half rate, up to 4 hours)
    if (!K.bot && K.save.aqT) { const secs = Math.min(4 * 3600, (Date.now() - K.save.aqT) / 1000), gain = Math.floor(fish.filter(f => f.age >= 1).reduce((a, f) => a + SP[f.sp].pearl * (f.v ? 3 : 1), 0) * secs / 14 * .5 * happy()); if (gain > 0 && secs > 60) { S.shells += gain; away = { gain, secs }; } }
    for (let i = 0; i < 60; i++) { K.t += 1 / 30; GAME.update(1 / 30, true); }
    K.score = found();
  };
  GAME.pose = () => { for (const f of fish) { f.age = 1; f.hunger = .2; } for (let i = 0; i < 6; i++) pearls.push({ x: K.rand(200, 1100), y: SAND + K.rand(-4, 14), v: 10, vy: 0, t: 5 }); };
  function persist() { if (K.bot) return; S.fish = fish.map(f => ({ sp: f.sp, v: f.v, age: Math.round(f.age * 1000) / 1000, hunger: Math.round(f.hunger * 1000) / 1000, nm: f.nm, pe: f.pe })); K.save.aq = S; K.save.aqT = Date.now(); K.save.best = Math.max(K.save.best || 0, found()); K.persist(); }
  function bank(n, x, y) { if (K.bot || n <= 0) return; K.coin(n, x, y); K.runCoins -= n; K.save.coins += n; K.persist(); }
  const banner = (s, sub, c = '#2aa8d8') => { if (K.bot && banners.length) return; banners.push({ s, sub, c, t: 0 }); if (banners.length > 3) banners.shift(); };
  function discover(sp, v) { const k = sp + '-' + v; if (S.found[k]) return; S.found[k] = 1; K.score = found(); if (v) S.st.rare = st('rare') + 1; banner(v ? `Rare ${VNAMES[v]} ${SP[sp].n}!` : `New fish: ${SP[sp].n}!`, `Added to your collection book (${found()}/40)`, v ? '#c76bff' : '#2aa8d8'); K.chime(523, [0, 4, 7, 12]); bank(v ? 5 : 2, 640, 200); }

  /* ---------- actions ---------- */
  function feed(x, y, n = 3) {
    const gold = ev && ev.k === 'frenzy';
    for (let i = 0; i < n; i++) food.push({ x: x + K.rand(-22, 22), y: K.clamp(y, SURF + 10, SAND - 30) + K.rand(-10, 10), vy: K.rand(26, 44), gold, t: 0, r: K.rand(0, 6) });
    rip.push({ x, y, t: 0 }); S.st.feeds = st('feeds') + 1; if (food.length > 90) food.splice(0, food.length - 90);
    K.sfx(900 + Math.random() * 200, .03, 'sine', .04); K.sfx(1300, .04, 'sine', .03, 0, .04);
  }
  function collect(p) { const i = pearls.indexOf(p); if (i < 0) return; pearls.splice(i, 1); S.shells += p.v; S.st.pearls = st('pearls') + 1; K.pop(p.x, p.y - 22, '+' + p.v, '#fff1a8', 26); K.burst(p.x, p.y, ['#fff', '#e8f6ff'], 5, 120, { gravity: 0, life: .35, size: 5 }); K.sfx(1400 + Math.random() * 300, .06, 'sine', .05); K.sfx(2100, .05, 'sine', .03, 0, .04); }
  function buyFish(i) {
    const s = SP[i]; if (S.shells < s.cost) { K.sfx(160, .1, 'square', .05); return; } if (fish.length + eggs.length >= cap()) { banner('Your tank is full!', 'Get a bigger tank or sell a grown fish', '#e07a2a'); return; }
    S.shells -= s.cost; const f = spawn({ sp: i, v: 0, age: .08, hunger: .4, x: K.rand(300, 980), y: SURF + 40, vy: 40 }); fish.push(f); discover(i, 0); K.chime(660, [0, 7]); K.burst(f.x, f.y, ['#fff', '#bff3ff'], 14, 160, { gravity: -80, life: .6 });
    banner(`Say hi to ${f.nm}!`, `A ${PERS[f.pe].n.toLowerCase()} little ${s.n}`, '#2aa8d8'); persist();
  }
  function buyDecor(i) { if (S.decor.includes(i)) return; const d = DECOR[i]; if (S.shells < d.cost) { K.sfx(160, .1, 'square', .05); return; } S.shells -= d.cost; S.decor.push(i); K.chime(523, [0, 4, 7]); banner(`${d.n} added!`, d.d || 'Your fish are happier: +15% pearls and growth', '#36b36a'); bank(1, d.x, SAND - 40); K.burst(d.x, SAND - 40, ['#fff', '#bff3ff', '#ffe36e'], 20, 220, { gravity: -60, life: .7 }); persist(); }
  function buyTheme(i) {
    if (S.themes.includes(i)) { S.theme = i; K.sfx(700, .06, 'triangle', .05); persist(); return; }
    const th = THEMES[i]; if (S.shells < th.cost) { K.sfx(160, .1, 'square', .05); return; } S.shells -= th.cost; S.themes.push(i); S.theme = i; K.chime(587, [0, 4, 7, 12]); banner(`${th.n} theme!`, 'New scenery and +5% happiness', '#36b36a'); bank(1, 640, 300); persist();
  }
  function upgrade() { const n = S.cap + 1; if (n >= CAP.length) { banner('This is the biggest tank!', 'Room for 40 fish', '#2aa8d8'); return; } if (S.shells < CAP_COST[n]) { banner(`Bigger tank: ${fmt(CAP_COST[n])} pearls`, `Room for ${CAP[n]} fish`, '#e07a2a'); K.sfx(160, .1, 'square', .05); return; } S.shells -= CAP_COST[n]; S.cap = n; K.chime(392, [0, 4, 7, 12]); banner('Tank upgraded!', `Room for ${CAP[n]} fish now`, '#36b36a'); K.flash('#bff3ff', .3); bank(2, 640, 300); persist(); }
  function sell(f) { const v = Math.round(SP[f.sp].val * (f.v ? 4 : 1)); S.shells += v; fish.splice(fish.indexOf(f), 1); card = null; K.pop(f.x, f.y, '+' + fmt(v), '#fff1a8', 32); K.burst(f.x, f.y, ['#fff', '#fff1a8'], 14, 200, { gravity: -100, life: .6 }); K.sfx(1200, .1, 'triangle', .07); S.st.sold = st('sold') + 1; persist(); }
  const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(n < 1e7 ? 2 : 1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(n < 1e5 ? 1 : 0) + 'K' : String(Math.floor(n));
  function checkGoal() {
    if (K.bot) return; const g = GOALS[S.goal]; if (!g || g[1]() < g[2]) return;
    S.shells += g[3]; banner('Goal complete!', `${g[0]}: +${g[3]} pearls${g[4] ? ` and ${g[4]} coins` : ''}`, '#e0a800'); K.chime(659, [0, 4, 7, 12, 16]); bank(g[4], 1070, 70); S.goal++; hint = 0;
    if (S.goal === 6 && evT > 1e8) evT = 25; persist();
  }

  /* ---------- events ---------- */
  function startEvent(k) {
    k = k || K.pick(['frenzy', 'treasure', 'turtle', 'treasure', 'frenzy']);
    if (k === 'frenzy') { ev = { k, t: 20, d: 20 }; banner('Feeding frenzy!', 'Golden food: fish grow fast and drop pearls', '#e0a800'); }
    if (k === 'treasure') { ev = { k, t: 30, d: 30 }; treasure = { x: K.rand(120, 1160), y: SAND + 18, dig: 0, t: 0, open: 0 }; banner('Something glints in the sand...', 'Tap it three times to dig it up', '#c78a2a'); }
    if (k === 'turtle') { ev = { k, t: 24, d: 24 }; const d = Math.random() < .5 ? 1 : -1; turtle = { x: d > 0 ? -120 : 1400, y: K.rand(170, 330), dir: d, t: 0, pet: 0 }; banner('A sea turtle is visiting!', 'Tap it to say hello', '#36b36a'); }
    if (!K.bot) K.chime(698, [0, 4, 7, 4, 12]);
  }
  function endEvent() { if (ev.k === 'frenzy') food.forEach(p => p.gold = false); treasure = null; if (turtle && !turtle.pet) turtle.leave = 1; ev = null; evT = K.bot ? K.rand(9, 14) : K.rand(60, 110); }
  function digTreasure() {
    const tr = treasure; if (!tr || tr.open) return; tr.dig++; K.burst(tr.x, tr.y - 6, ['#e8d3a0', '#cdb27a', '#fff'], 12, 200, { life: .5, gravity: 400 }); K.sfx(200, .1, 'sine', .08, -80); K.noise(.08, .06, 400);
    if (tr.dig >= 3) { tr.open = .001; const v = Math.max(30, Math.round(fish.filter(f => f.age >= 1).reduce((a, f) => a + SP[f.sp].pearl, 0) * 6 * happy())); for (let i = 0; i < 6; i++) pearls.push({ x: tr.x + K.rand(-60, 60), y: tr.y - 40, v: Math.ceil(v / 6), vy: K.rand(-160, -60), t: 0, bounce: 1 }); S.st.treasure = st('treasure') + 1; K.chime(523, [0, 4, 7, 12, 16, 19]); bank(1, tr.x, tr.y - 50); if (ev) ev.t = Math.min(ev.t, 4); }
  }
  function petTurtle() { const tu = turtle; if (!tu || tu.pet) return; tu.pet = 1; S.st.turtle = st('turtle') + 1; const v = Math.max(20, Math.round(fish.reduce((a, f) => a + SP[f.sp].pearl, 0) * 4 * happy())); for (let i = 0; i < 5; i++) pearls.push({ x: tu.x + K.rand(-40, 40), y: tu.y, v: Math.ceil(v / 5), vy: K.rand(-60, 20), t: 0 }); K.chime(587, [0, 4, 7, 12, 7, 12]); bank(1, tu.x, tu.y); K.burst(tu.x, tu.y - 30, ['#ff8ab8', '#fff'], 10, 120, { gravity: -60, life: .8 }); if (ev) ev.t = Math.min(ev.t, 8); }

  /* ---------- input ---------- */
  const BTN = ['shop', 'decor', 'theme', 'book', 'tank'].map((k, i) => ({ k, x: 14 + i * 240, y: 616, w: 230, h: 92 }));
  const inB = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  const PANEL = { x: 170, y: 46, w: 940, h: 556 }, CLOSE = { x: PANEL.x + PANEL.w - 66, y: PANEL.y + 12, w: 54, h: 54 };
  const pItem = i => panel === 'shop' ? { x: PANEL.x + 24 + (i % 4) * 224, y: PANEL.y + 84 + Math.floor(i / 4) * 228, w: 214, h: 216 }
    : panel === 'decor' ? { x: PANEL.x + 22 + (i % 5) * 181, y: PANEL.y + 80 + Math.floor(i / 5) * 156, w: 173, h: 148 }
      : { x: PANEL.x + 24 + (i % 3) * 300, y: PANEL.y + 84 + Math.floor(i / 3) * 230, w: 290, h: 218 };
  const nItems = () => panel === 'shop' ? 8 : panel === 'decor' ? DECOR.length : panel === 'theme' ? THEMES.length : 0;
  const cardRect = () => { const f = card; return { x: K.clamp(f.x - 160, T.x0 + 10, T.x1 - 330), y: K.clamp(f.y - 250, T.y0 + 90, SAND - 300), w: 320, h: 216 }; };
  const FS = 1.65, fishR = f => (f.sp === 4 ? SP[f.sp].H * .5 : SP[f.sp].L * .55) * FS * (.45 + .55 * f.age) + 10;
  function openPanel(k) { panel = k; psel = 0; card = null; K.sfx(600, .05, 'triangle', .05); }
  function itemAct(i) { if (panel === 'shop') buyFish(i); else if (panel === 'decor') buyDecor(i); else if (panel === 'theme') buyTheme(i); }
  GAME.down = (x, y) => {
    ptr = { x, y }; ptrT = 4;
    if (away) { away = 0; K.chime(523, [0, 4, 7, 12]); return; }
    if (panel) { if (inB(CLOSE, x, y) || !inB(PANEL, x, y)) { panel = null; K.sfx(500, .05, 'triangle', .04); return; } for (let i = 0; i < nItems(); i++) if (inB(pItem(i), x, y)) { psel = i; itemAct(i); } return; }
    if (card) {
      const r = cardRect(), sb = { x: r.x + 170, y: r.y + 150, w: 136, h: 52 }, nb = { x: r.x + 14, y: r.y + 150, w: 146, h: 52 };
      if (inB(sb, x, y)) { if (card.age >= 1) sell(card); else K.sfx(160, .1, 'square', .05); return; }
      if (inB(nb, x, y)) { card.nm = K.pick(NAMES); K.sfx(800, .05, 'triangle', .05); persist(); return; }
      if (inB(r, x, y)) return; card = null;
    }
    for (const b of BTN) if (inB(b, x, y)) { if (b.k === 'tank') upgrade(); else openPanel(b.k); return; }
    if (y > T.y1) return;
    if (turtle && !turtle.pet && K.dist(x, y, turtle.x, turtle.y) < 80) { petTurtle(); return; }
    if (treasure && !treasure.open && K.dist(x, y, treasure.x, treasure.y) < 60) { digTreasure(); return; }
    for (const p of pearls) if (K.dist(x, y, p.x, p.y) < 38) { collect(p); return; }
    for (const e of eggs) if (K.dist(x, y, e.x, e.y) < 30) { e.wob = 1; K.sfx(600, .05, 'sine', .04); return; }
    let best = null, bd = 1e9; for (const f of fish) { const d = K.dist(x, y, f.x, f.y); if (d < fishR(f) + 8 && d < bd) { bd = d; best = f; } }
    if (best) { card = best; S.st.meet = st('meet') + 1; if (best.sp === 3) best.puff = 1; best.zoom = .6; K.sfx(700, .06, 'sine', .06, 300); return; }
    feed(x, y);
  };
  GAME.move = (x, y) => { ptr = { x, y }; ptrT = 3; hover = null; for (const b of BTN) if (inB(b, x, y)) hover = b.k; if (!panel) for (const p of pearls) if (K.dist(x, y, p.x, p.y) < 34) { collect(p); break; } };
  GAME.key = (c, d) => {
    if (!d) return;
    if (away) { away = 0; return; }
    if (panel) {
      const n = nItems(), cols = panel === 'shop' ? 4 : panel === 'decor' ? 5 : 3;
      if (c === 'ArrowRight') psel = (psel + 1) % n; if (c === 'ArrowLeft') psel = (psel + n - 1) % n; if (c === 'ArrowDown') psel = Math.min(n - 1, psel + cols); if (c === 'ArrowUp') psel = Math.max(0, psel - cols);
      if ((c === 'Enter' || c === 'Space') && n) itemAct(psel); if (c === 'Backspace' || c === 'KeyC' || c === 'KeyQ') panel = null;
      const k = +c.replace('Digit', ''); if (k >= 1 && k <= 4) openPanel(['shop', 'decor', 'theme', 'book'][k - 1]); return;
    }
    if (c === 'Space' || c === 'KeyF') { const f = fish.length ? K.pick(fish) : null; feedX = f ? f.x : K.rand(200, 1080); feed(K.clamp(feedX + K.rand(-60, 60), 80, 1200), K.rand(120, 260)); return; }
    if (c === 'KeyC') { pearls.slice(0, 6).forEach(collect); if (treasure) digTreasure(); if (turtle) petTurtle(); return; }
    if (c === 'Backspace') card = null;
    const k = +c.replace('Digit', ''); if (k >= 1 && k <= 4) openPanel(['shop', 'decor', 'theme', 'book'][k - 1]); if (k === 5) upgrade();
  };
  GAME.bot = dt => {
    botT += dt; if (botT < 1.1) return; botT = 0;
    if (away) { away = 0; return; }
    const hungry = fish.filter(f => f.hunger > .3); if (hungry.length && Math.random() < .8) { const f = K.pick(hungry); feed(K.clamp(f.x + K.rand(-80, 80), 80, 1200), K.clamp(f.y - 120, 90, 320)); }
    if (pearls.length > 2 || pearls.some(p => p.t > 6)) collect(pearls[0]);
    if (treasure && !treasure.open && treasure.t > 2) digTreasure();
    if (turtle && !turtle.pet && turtle.x > 300 && turtle.x < 980) petTurtle();
    if (eggs.length && Math.random() < .2) eggs[0].wob = 1;
  };

  /* ---------- update ---------- */
  GAME.update = (dt, warm) => {
    const t = K.t, hp = happy(), frenzy = ev && ev.k === 'frenzy';
    ptrT -= dt; if (ptrT <= 0) ptr = null;
    for (const p of food) { p.t += dt; p.r += dt; if (p.y < SAND + 6) { p.y += p.vy * dt; p.x += Math.sin(t * 2 + p.r * 3) * 12 * dt; } } food = food.filter(p => !p.eaten && p.t < 22);
    for (const f of fish) swim(f, dt, t, hp, frenzy);
    for (const p of pearls) { p.t += dt; if (p.y < SAND + 8 || p.vy < 0) { p.vy += (p.bounce ? 380 : 60) * dt; p.y += p.vy * dt; if (p.vy > 70 && !p.bounce) p.vy = 70; if (p.y > SAND + 8) { p.y = SAND + 8; p.vy = 0; } } }
    for (let i = eggs.length - 1; i >= 0; i--) {
      const e = eggs[i]; e.t -= dt * hp; e.wob = Math.max(0, (e.wob || 0) - dt * 2);
      if (e.t <= 0) { eggs.splice(i, 1); const nf = spawn({ sp: e.sp, v: e.v, age: .06, hunger: .35, x: e.x, y: e.y - 24 }); fish.push(nf); S.st.eggs = st('eggs') + 1; if (!S.found[e.sp + '-' + e.v]) discover(e.sp, e.v); else banner(`${nf.nm} hatched!`, `A baby ${e.v ? VNAMES[e.v] + ' ' : ''}${SP[e.sp].n}`, '#2aa8d8'); K.burst(e.x, e.y, ['#fff', '#ffe36e', '#bff3ff'], 16, 160, { gravity: 0, life: .6 }); K.sfx(880, .1, 'sine', .06, 400); }
    }
    // bubbles: from the sand, the volcano and the diver helmet
    if (Math.random() < dt * 3) bubbles.push({ x: K.rand(T.x0 + 20, T.x1 - 20), y: SAND, r: K.rand(2, 5), v: K.rand(40, 80), w: Math.random() * 6 });
    if (S.decor.includes(4) && Math.random() < dt * 9) bubbles.push({ x: DECOR[4].x + K.rand(-8, 8), y: SAND - 96, r: K.rand(3, 8), v: K.rand(90, 170), w: Math.random() * 6 });
    if (S.decor.includes(8) && Math.random() < dt * 2.5) bubbles.push({ x: DECOR[8].x + 20, y: SAND - 62, r: K.rand(2, 6), v: K.rand(60, 110), w: Math.random() * 6 });
    if (S.decor.includes(2) && Math.random() < dt * .8) bubbles.push({ x: DECOR[2].x + K.rand(-10, 10), y: SAND - 40, r: K.rand(2, 4), v: K.rand(50, 80), w: Math.random() * 6 });
    for (const b of bubbles) { b.y -= b.v * dt; b.x += Math.sin(t * 3 + b.w + b.y * .03) * 14 * dt; } bubbles = bubbles.filter(b => b.y > SURF + 4); if (bubbles.length > 140) bubbles.splice(0, bubbles.length - 140);
    for (const m of motes) { m.y -= m.v * dt * .3; m.x += Math.sin(t * .3 + m.p) * 6 * dt; if (m.y < T.y0) { m.y = SAND; m.x = K.rand(T.x0, T.x1); } }
    for (const r of rip) r.t += dt; rip = rip.filter(r => r.t < .7);
    if (warm) return;
    // the giant clam collects pearls for you
    if (S.decor.includes(6) && pearls.length) { clamT -= dt; if (clamT <= 0) { clamT = 8; let pb = null, bd = 1e9; for (const p of pearls) { const d = Math.abs(p.x - DECOR[6].x); if (p.t > 3 && d < bd) { bd = d; pb = p; } } if (pb) collect(pb); } }
    // events
    if (ev) { ev.t -= dt; if (ev.t <= 0) endEvent(); } else { evT -= dt; if (evT <= 0) startEvent(); }
    if (treasure) { treasure.t += dt; if (treasure.open) treasure.open += dt; }
    if (turtle) { const tu = turtle; tu.t += dt; tu.x += tu.dir * (tu.pet ? 50 : 70) * dt; tu.y += Math.sin(tu.t * .8) * 10 * dt; if (tu.x < -200 || tu.x > 1480) turtle = null; }
    for (const b of banners) b.t += dt; banners = banners.filter(b => b.t < 3.4); if (banners.length > 1 && banners[1].t > 0 && banners[0].t < 3) banners[1].t = 0;
    hint += dt; goalT += dt; if (goalT > .5) { goalT = 0; checkGoal(); }
    saveT += dt; if (saveT > 6) { saveT = 0; persist(); }
    K.score = found();
    music(dt);
  };
  function swim(f, dt, t, hp, frenzy) {
    const s = SP[f.sp], P = PERS[f.pe], R = fishR(f), baby = f.age < 1;
    f.hunger = Math.min(1, f.hunger + dt / 60 * (f.pe === 2 ? 1.25 : f.pe === 3 ? .8 : 1));
    f.ph += dt * (3 + Math.hypot(f.vx, f.vy) * .06); f.zoom = Math.max(0, f.zoom - dt); f.puff = Math.max(0, f.puff - dt * .35); f.wt -= dt;
    let spd = s.spd * P.spd * (frenzy ? 1.4 : 1), target = null;
    if (f.hunger > (baby ? .12 : .28) && food.length) { let bd = 1e9; for (const p of food) { const d = K.dist(f.x, f.y, p.x, p.y) - (f.pe === 2 ? 120 : 0); if (d < bd) { bd = d; target = p; } } }
    if (target) { f.tx = target.x; f.ty = target.y; spd *= 2.4 * (f.pe === 2 ? 1.3 : 1);
      if (K.dist(f.x, f.y, target.x, target.y) < R * .7 + 6) { target.eaten = true; f.hunger = Math.max(0, f.hunger - .25); f.bub = .4; if (f.age < 1) { f.age = Math.min(1, f.age + (target.gold ? .25 : .12) * hp); if (f.age >= 1) { banner(`${f.nm} is all grown up!`, 'Grown fish make pearls', '#36b36a'); K.chime(784, [0, 4, 7]); K.burst(f.x, f.y, ['#fff', '#ffe36e'], 14, 150, { gravity: 0, life: .5 }); } } else if (target.gold && pearls.length < 40) pearls.push({ x: f.x, y: f.y, v: Math.round(s.pearl * (f.v ? 3 : 1) * hp), vy: 30, t: 0 }); if (!K.bot && Math.random() < .5) K.sfx(1500 + Math.random() * 400, .03, 'sine', .025); } }
    else if (f.wt <= 0) {
      f.wt = K.rand(2, 6) * (f.pe === 3 ? 1.8 : 1);
      const lo = SURF + 60 + (s.L > 60 ? 20 : 0), hi = SAND - 50 - (f.sp === 5 ? 60 : 0);
      if (f.pe === 0 || f.pe === 3) { f.tx = K.rand(T.x0 + 80, T.x1 - 80); f.ty = K.rand(hi - 140, hi); if (f.pe === 0 && S.decor.length && Math.random() < .6) f.tx = DECOR[K.pick(S.decor)].x + K.rand(-60, 60); }
      else if (f.pe === 4 && ptr) { f.tx = ptr.x + K.rand(-60, 60); f.ty = ptr.y + K.rand(-40, 40); f.wt = 1.2; }
      else if (f.pe === 1 && Math.random() < .35) { const o = K.pick(fish); f.tx = o.x; f.ty = o.y; f.zoom = 1; }
      else { f.tx = K.rand(T.x0 + 80, T.x1 - 80); f.ty = K.rand(lo, hi); }
      f.tx = K.clamp(f.tx, T.x0 + 60, T.x1 - 60); f.ty = K.clamp(f.ty, lo, hi);
    }
    if (f.zoom > 0) spd *= 2;
    const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy) || 1, arrive = Math.min(1, d / 60);
    let dvx = dx / d * spd * arrive, dvy = dy / d * spd * arrive * (f.sp === 4 ? 1.3 : .8);
    if (f.sp === 5) { dvy += Math.sin(t * 1.6 + f.seed) * 14; dvx *= .6; }
    const k = Math.min(1, dt * (target ? 2.5 : 1.2)); f.vx += (dvx - f.vx) * k; f.vy += (dvy - f.vy) * k;
    f.vy += Math.sin(t * 1.3 + f.seed) * 4 * dt;
    f.x += f.vx * dt; f.y += f.vy * dt;
    f.x = K.clamp(f.x, T.x0 + 34, T.x1 - 34); f.y = K.clamp(f.y, SURF + 26, SAND - 14 - (f.sp === 5 ? 50 : 6));
    if (Math.abs(f.vx) > 6) f.dir = Math.sign(f.vx); f.face += ((f.dir || 1) - f.face) * Math.min(1, dt * 4);
    // grown, fed fish make pearls
    if (f.age >= 1 && f.hunger < .85) { f.pT -= dt * hp; if (f.pT <= 0) { f.pT = K.rand(10, 18); if (pearls.length < 30) { pearls.push({ x: f.x, y: f.y + 8, v: Math.round(s.pearl * (f.v ? 3 : 1) * hp), vy: 40, t: 0 }); f.bub = .5; } } }
    // two grown fish of a kind lay an egg
    f.layT -= dt; if (f.layT <= 0) { f.layT = K.rand(35, 60); if (f.age >= 1 && f.hunger < .6 && fish.length + eggs.length < cap() && fish.some(o => o !== f && o.sp === f.sp && o.age >= 1)) { const rare = f.sp === 1 && S.decor.includes(7) ? .2 : .1; eggs.push({ sp: f.sp, x: K.clamp(f.x, 80, 1200), y: SAND + 4, t: 12, v: Math.random() < rare ? K.irand(1, 4) : f.v && Math.random() < .5 ? f.v : 0 }); K.sfx(700, .2, 'sine', .06, 200); } }
  }

  /* ---------- music: slow, dreamy pads with a music-box melody ---------- */
  let mBus = null, mDel = null, mNext = 0, mStep = 0, bubT = 3;
  const CH = [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 7]];
  function note(f, t, d, type, v, att = .01) { const ac = K.ac, o = ac.createOscillator(), a = ac.createGain(); o.type = type; o.frequency.value = f; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + att); a.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(a); a.connect(mBus); a.connect(mDel); o.start(t); o.stop(t + d + .05); }
  function music(dt) {
    const ac = K.ac; if (!ac || K.bot || K.state !== 'play' || K.save.mute) return;
    if (!mBus) { mBus = ac.createGain(); mBus.gain.value = .6; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; mBus.connect(lp).connect(K.master); mDel = ac.createDelay(1); mDel.delayTime.value = .42; const fb = ac.createGain(); fb.gain.value = .38; const dg = ac.createGain(); dg.gain.value = .35; mDel.connect(fb).connect(mDel); mDel.connect(dg).connect(lp); }
    const beat = .5; if (mNext < ac.currentTime) mNext = ac.currentTime + .1;
    while (mNext < ac.currentTime + .3) {
      const s = mStep++, bar = Math.floor(s / 8) % 4, i = s % 8, ch = CH[bar], hz = n => 220 * Math.pow(2, (n + 3) / 12), t = mNext; mNext += beat;
      if (i === 0) { for (const n of ch) note(hz(n - 12), t, 4.2, 'sine', .028, 1.2); note(hz(ch[0] - 24), t, 4, 'triangle', .05, .8); }
      if ((i === 2 || i === 5 || i === 7 && bar % 2) && Math.random() < .8) { const n = ch[K.irand(0, 3)] + 12 + (Math.random() < .3 ? 12 : 0); note(hz(n), t, 1.6, 'sine', .035); note(hz(n) * 3, t, .4, 'sine', .006); }
    }
    bubT -= dt; if (bubT <= 0) { bubT = K.rand(3, 8); const t = ac.currentTime; for (let k = 0; k < 3; k++) { const o = ac.createOscillator(), a = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(300 + Math.random() * 300, t + k * .09); o.frequency.exponentialRampToValueAtTime(900 + Math.random() * 500, t + k * .09 + .08); a.gain.setValueAtTime(.015, t + k * .09); a.gain.exponentialRampToValueAtTime(.0001, t + k * .09 + .1); o.connect(a).connect(K.master); o.start(t + k * .09); o.stop(t + k * .09 + .12); } }
  }

  /* ---------- art helpers ---------- */
  const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
  function rr(gr, x, y, w, h, r, fill) { gr.beginPath(); gr.roundRect(x, y, w, h, r); if (fill) { gr.fillStyle = fill; gr.fill(); } }
  function circ(gr, x, y, r, fill) { gr.beginPath(); gr.arc(x, y, r, 0, 7); gr.fillStyle = fill; gr.fill(); }
  function ell(gr, x, y, rx, ry, rot, fill) { gr.beginPath(); gr.ellipse(x, y, rx, ry, rot, 0, 7); gr.fillStyle = fill; gr.fill(); }
  function lin(gr, x0, y0, x1, y1, stops) { const g = gr.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
  function Tx(gr, s, x, y, size, col, al = 'center', b = false, sh = 'rgba(0,0,0,.3)') { gr.font = fnt(size, b); gr.textAlign = al; gr.textBaseline = 'middle'; if (sh) { gr.fillStyle = sh; gr.fillText(s, x, y + 2); } gr.fillStyle = col; gr.fillText(s, x, y); }
  function btn(gr, b, top, bot, on = true, r = 16) { rr(gr, b.x, b.y + 5, b.w, b.h - 5, r, 'rgba(0,0,0,.3)'); rr(gr, b.x, b.y, b.w, b.h - 5, r, lin(gr, 0, b.y, 0, b.y + b.h, on ? [top, bot] : ['#6a7a88', '#4a5864'])); gr.save(); gr.globalAlpha = on ? .3 : .12; rr(gr, b.x + 6, b.y + 4, b.w - 12, (b.h - 5) * .4, r * .7, '#fff'); gr.restore(); }
  function pearlI(gr, x, y, r, glint) { const g = gr.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r); g.addColorStop(0, '#ffffff'); g.addColorStop(.6, '#f1e8ff'); g.addColorStop(1, '#c7b8e8'); circ(gr, x, y, r, g); if (glint) { gr.save(); gr.globalAlpha = glint; gr.strokeStyle = '#fff'; gr.lineWidth = 2; gr.beginPath(); gr.moveTo(x - r * 1.6, y - r * .3); gr.lineTo(x + r * 1.6, y - r * .3); gr.moveTo(x + r * .3 - r * .3, y - r * 1.9); gr.lineTo(x, y + r * 1.3); gr.stroke(); gr.restore(); } }

  /* ---------- fish art (local space: facing +x, centered) ---------- */
  function bodyP(gr, a, h, fat) { gr.beginPath(); gr.moveTo(a, 0); gr.bezierCurveTo(a * .86, -h * 1.32 * fat, -a * .35, -h * 1.22 * fat, -a, -h * .26); gr.lineTo(-a, h * .26); gr.bezierCurveTo(-a * .35, h * 1.18 * fat, a * .86, h * 1.25 * fat, a, 0); gr.closePath(); }
  function finP(gr, x0, y0, cx, cy, x1, y1) { gr.beginPath(); gr.moveTo(x0, y0); gr.quadraticCurveTo(cx, cy, x1, y1); gr.closePath(); }
  function eye(gr, x, y, r) { circ(gr, x, y, r, '#fff'); circ(gr, x + r * .18, y, r * .66, '#1a1a2a'); circ(gr, x + r * .32, y - r * .28, r * .26, '#fff'); }
  function fishArt(gr, sp, v, t, seed, puff) {
    const s = SP[sp], hue = (s.h + VARIANTS[v]) % 360, a = s.L / 2, h = s.H / 2, w = Math.sin(t * 7 + seed), w2 = Math.sin(t * 7 + seed - 1.2);
    if (sp === 4) return seahorse(gr, hue, t + seed);
    if (sp === 5) return jelly(gr, hue, t + seed);
    const gold = sp === 7 && !v;
    const base = gold ? '#ffcc33' : sp === 6 ? '#fbf6ee' : sp === 0 ? hsl(hue, 45, 72) : sp === 2 ? hsl(hue, 40, 80) : hsl(hue, 88, 56);
    const dark = gold ? '#b8860b' : sp === 6 ? '#e8dccb' : hsl(hue, 75, sp === 0 ? 48 : 36);
    const belly = gold ? '#fff2b0' : sp === 6 ? '#ffffff' : hsl(hue + 10, 90, 86);
    const fin = gold ? 'rgba(255,214,90,.75)' : sp === 6 ? hsl(hue, 90, 70, .55) : hsl(hue, 90, sp === 2 ? 75 : 62, .72);
    // tail
    gr.save(); gr.translate(-a + 2, 0); gr.rotate(w * .32);
    const TL = sp === 0 ? a * 1.5 : sp === 6 || sp === 7 ? a * .7 : sp === 2 ? a * .9 : a * .62;
    if (sp === 0) { gr.fillStyle = lin(gr, 0, 0, -TL, 0, [hsl(hue, 95, 60), hsl(hue + 50, 95, 62), hsl(hue + 90, 90, 70, .85)]); gr.beginPath(); gr.moveTo(0, 0); gr.lineTo(-TL, -TL * .8 - w2 * 3); gr.quadraticCurveTo(-TL * 1.3, 0, -TL, TL * .8 + w2 * 3); gr.closePath(); gr.fill(); gr.strokeStyle = 'rgba(255,255,255,.35)'; gr.lineWidth = 1; for (let k = -2; k <= 2; k++) { gr.beginPath(); gr.moveTo(0, 0); gr.lineTo(-TL * 1.1, k * TL * .32); gr.stroke(); } }
    else if (sp === 1 || sp === 3) { gr.fillStyle = fin; gr.beginPath(); gr.moveTo(0, -h * .3); gr.quadraticCurveTo(-TL * 1.2, -TL * .9, -TL, 0); gr.quadraticCurveTo(-TL * 1.2, TL * .9, 0, h * .3); gr.fill(); if (sp === 1) { gr.strokeStyle = '#1a1a1a'; gr.lineWidth = 2; gr.stroke(); } }
    else { gr.fillStyle = fin; gr.beginPath(); gr.moveTo(0, 0); gr.quadraticCurveTo(-TL * .5, -TL * .3, -TL - w2 * 4, -TL * .85); gr.quadraticCurveTo(-TL * .6, 0, -TL + w2 * 4, TL * .85); gr.quadraticCurveTo(-TL * .5, TL * .3, 0, 0); gr.fill(); }
    gr.restore();
    // dorsal and anal fins
    gr.fillStyle = fin;
    if (sp === 2) { finP(gr, a * .4, -h * .8, -a * .2, -h * 2.9, -a * 1.2, -h * 2.1 + w2 * 3); gr.fill(); finP(gr, a * .3, h * .8, -a * .3, h * 2.9, -a * 1.1, h * 2.2 - w2 * 3); gr.fill(); gr.strokeStyle = fin; gr.lineWidth = 1.5; gr.beginPath(); gr.moveTo(a * .2, h * .7); gr.quadraticCurveTo(0, h * 2.4, -a * .3 + w * 4, h * 3.2); gr.stroke(); }
    else if (sp === 7 || sp === 6) { finP(gr, -a * .2, -h * .85, -a * .55, -h * 1.7 + w2 * 2, -a * .9, -h * .45); gr.fill(); finP(gr, -a * .3, h * .85, -a * .6, h * 1.6 - w2 * 2, -a * .9, h * .45); gr.fill(); }
    else if (sp !== 3) { finP(gr, a * .25, -h * .9, -a * .15, -h * 2.1 + w2 * 2, -a * .6, -h * .7); gr.fill(); if (sp === 1) { gr.strokeStyle = '#1a1a1a'; gr.lineWidth = 1.5; gr.stroke(); } finP(gr, -a * .1, h * .8, -a * .35, h * 1.6, -a * .6, h * .55); gr.fill(); }
    // body
    const fat = sp === 3 ? 1.15 + puff * .35 : sp === 2 ? 1.15 : 1, bh = h * (sp === 3 ? 1 + puff * .4 : 1);
    bodyP(gr, a, bh, fat); gr.fillStyle = gold ? lin(gr, 0, -bh * 1.2, 0, bh * 1.2, ['#a86f00', '#ffd84a', '#fff4b0', '#ffcc33', '#a86f00']) : lin(gr, 0, -bh * 1.2, 0, bh * 1.2, [dark, base, base, belly]); gr.fill();
    gr.save(); bodyP(gr, a, bh, fat); gr.clip();
    if (sp === 1) { for (const [bx, bw] of [[a * .42, a * .2], [-a * .12, a * .24], [-a * .74, a * .14]]) { gr.fillStyle = '#1a1a1a'; gr.fillRect(bx - bw / 2 - 2.5, -h * 2, bw + 5, h * 4); gr.fillStyle = '#fff'; gr.beginPath(); gr.ellipse(bx, 0, bw / 2, h * 1.6, 0, 0, 7); gr.fill(); gr.fillRect(bx - bw / 2, -h * 2, bw, h * 4); } }
    if (sp === 2) { gr.fillStyle = hsl(hue, 35, 25, .55); for (const bx of [a * .35, -a * .05, -a * .5]) gr.fillRect(bx - a * .07, -h * 3, a * .14, h * 6); }
    if (sp === 3) { gr.fillStyle = hsl(hue, 60, 30, .5); for (let k = 0; k < 8; k++) circ(gr, -a * .6 + (k % 4) * a * .38, -bh * .55 + Math.floor(k / 4) * bh * .3, a * .07, hsl(hue, 60, 30, .5)); gr.fillStyle = 'rgba(255,255,255,.75)'; gr.beginPath(); gr.ellipse(0, bh * 1, a * .9, bh * .55, 0, 0, 7); gr.fill(); }
    if (sp === 6) { const ph = (12 + VARIANTS[v]) % 360; for (const [px, py, r] of [[a * .55, -h * .4, a * .22], [-a * .05, -h * .3, a * .3], [-a * .55, h * .1, a * .2]]) { gr.fillStyle = hsl(ph, 90, 52); gr.beginPath(); gr.ellipse(px, py, r, h * .75, .3, 0, 7); gr.fill(); } }
    if (sp === 7 || sp === 6) { gr.strokeStyle = gold ? 'rgba(130,80,0,.35)' : sp === 6 ? 'rgba(160,120,90,.18)' : hsl(hue, 70, 25, .35); gr.lineWidth = 1.2; const sc = sp === 7 ? 7 : 5; for (let yy = -h * 1.2; yy < h * 1.3; yy += sc) for (let xx = -a; xx < a * .6; xx += sc * 1.4) { gr.beginPath(); gr.arc(xx + (Math.round(yy / sc) % 2) * sc * .7, yy, sc * .7, -1.2, 1.2); gr.stroke(); } }
    if (sp === 0) { gr.fillStyle = hsl(hue + 40, 90, 60, .5); gr.beginPath(); gr.ellipse(-a * .4, h * .1, a * .3, h * .45, 0, 0, 7); gr.fill(); }
    const sx = ((t * .55 + seed) % 3 - 1) * a * 2.2, sg = gr.createLinearGradient(sx - 18, 0, sx + 18, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, gold ? 'rgba(255,255,230,.7)' : 'rgba(255,255,255,.32)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); gr.fillStyle = sg; gr.fillRect(-a * 1.2, -h * 3, a * 2.6, h * 6);
    gr.fillStyle = 'rgba(255,255,255,.22)'; gr.beginPath(); gr.ellipse(a * .1, -bh * .55, a * .55, bh * .16, -.05, 0, 7); gr.fill();
    gr.restore();
    if (sp === 3 && puff > .05) { gr.strokeStyle = hsl(hue, 60, 35); gr.lineWidth = 1.6; for (let k = 0; k < 14; k++) { const an = k / 14 * 6.28, rx = a * 1.05 * fat * .95, ry = bh * 1.15 * fat; gr.beginPath(); gr.moveTo(Math.cos(an) * rx * .92, Math.sin(an) * ry * .92); gr.lineTo(Math.cos(an) * (rx + 5 * puff), Math.sin(an) * (ry + 5 * puff)); gr.stroke(); } }
    if (sp === 7 || sp === 6) { gr.strokeStyle = gold ? '#e0a800' : sp === 6 ? hsl((12 + VARIANTS[v]) % 360, 70, 60) : dark; gr.lineWidth = 1.5; gr.beginPath(); gr.moveTo(a * .92, h * .15); gr.quadraticCurveTo(a * 1.15, h * .9, a * 1.05 + w * 3, h * 1.5); gr.moveTo(a * .9, h * .25); gr.quadraticCurveTo(a * 1, h * 1, a * .8 - w * 3, h * 1.6); gr.stroke(); }
    // pectoral fin
    gr.fillStyle = sp === 6 ? hsl((12 + VARIANTS[v]) % 360, 90, 70, .5) : fin; ell(gr, a * .22, h * .35, a * (sp >= 6 ? .3 : .22), h * .32, .7 + Math.sin(t * 9 + seed) * .35, gr.fillStyle);
    eye(gr, a * .6, -h * .18, Math.max(2.4, h * (sp === 3 ? .42 : sp >= 6 ? .26 : .32)));
    gr.strokeStyle = 'rgba(0,0,0,.35)'; gr.lineWidth = 1.2; gr.beginPath(); gr.arc(a * .93, h * .18, h * .14, .3, 1.8); gr.stroke();
  }
  function seahorse(gr, hue, t) {
    const pts = [[6, -18], [10, -6], [9, 6], [3, 16], [-3, 22], [-2, 30], [5, 32], [8, 27], [4, 24]], rad = [8, 9, 8.5, 6.5, 5, 3.6, 2.8, 2.2, 1.6];
    // dorsal fin fluttering
    gr.fillStyle = hsl(hue, 90, 70, .6); gr.beginPath(); gr.moveTo(-1, -6); for (let k = 0; k <= 5; k++) gr.lineTo(-11 - Math.sin(t * 14 + k) * 2, -8 + k * 3.4); gr.lineTo(0, 10); gr.fill();
    for (let i = 0; i < pts.length - 1; i++) for (let u = 0; u < 1; u += .34) { const x = K.lerp(pts[i][0], pts[i + 1][0], u), y = K.lerp(pts[i][1], pts[i + 1][1], u), r = K.lerp(rad[i], rad[i + 1], u); const g = gr.createRadialGradient(x - r * .4, y - r * .4, 1, x, y, r); g.addColorStop(0, hsl(hue, 90, 72)); g.addColorStop(1, hsl(hue, 80, 45)); circ(gr, x, y, r, g); }
    gr.strokeStyle = hsl(hue, 70, 35, .5); gr.lineWidth = 1; for (let y = -12; y < 18; y += 4) { gr.beginPath(); gr.moveTo(2, y); gr.lineTo(11, y + 1); gr.stroke(); }
    const hg = gr.createRadialGradient(4, -28, 1, 6, -26, 10); hg.addColorStop(0, hsl(hue, 90, 72)); hg.addColorStop(1, hsl(hue, 80, 48)); ell(gr, 5, -26, 8, 7, -.3, hg);
    gr.fillStyle = hsl(hue, 80, 50); gr.beginPath(); gr.moveTo(9, -29); gr.lineTo(20, -27); gr.lineTo(20, -23); gr.lineTo(9, -22); gr.fill();
    gr.beginPath(); gr.moveTo(0, -31); gr.lineTo(2, -38); gr.lineTo(5, -32); gr.lineTo(7, -37); gr.lineTo(8, -31); gr.fill();
    eye(gr, 7, -28, 2.8);
  }
  function jelly(gr, hue, t) {
    const p = Math.sin(t * 2.2), sx = 1 + p * .08, sy = 1 - p * .1, R = 22;
    const gl = gr.createRadialGradient(0, -4, 2, 0, -4, 42); gl.addColorStop(0, hsl(hue, 90, 75, .35)); gl.addColorStop(1, hsl(hue, 90, 75, 0)); circ(gr, 0, -4, 42, gl);
    gr.strokeStyle = hsl(hue, 80, 80, .5); gr.lineWidth = 1.4; for (let k = -3; k <= 3; k++) { gr.beginPath(); gr.moveTo(k * 6 * sx, 2); gr.bezierCurveTo(k * 6 + Math.sin(t * 2 + k) * 8, 20, k * 5 - Math.sin(t * 2.4 + k) * 8, 38, k * 4 + Math.sin(t * 1.7 + k) * 6, 56 + Math.abs(k) * -3); gr.stroke(); }
    gr.strokeStyle = hsl(hue, 85, 70, .7); gr.lineWidth = 4; for (let k = -1; k <= 1; k++) { gr.beginPath(); gr.moveTo(k * 5, 0); gr.quadraticCurveTo(k * 8 + Math.sin(t * 1.5 + k) * 6, 16, k * 4, 30); gr.stroke(); }
    gr.save(); gr.scale(sx, sy); const bg = gr.createRadialGradient(-6, -14, 2, 0, -6, R * 1.1); bg.addColorStop(0, hsl(hue, 90, 92, .95)); bg.addColorStop(.6, hsl(hue, 85, 72, .75)); bg.addColorStop(1, hsl(hue, 80, 60, .55));
    gr.fillStyle = bg; gr.beginPath(); gr.moveTo(-R, 2); gr.bezierCurveTo(-R, -R * 1.25, R, -R * 1.25, R, 2); for (let k = 0; k < 6; k++) gr.quadraticCurveTo(R - (k + .5) * R / 3, 7, R - (k + 1) * R / 3, 2); gr.fill();
    gr.fillStyle = hsl(hue, 90, 85, .5); for (let k = 0; k < 4; k++) { gr.beginPath(); gr.ellipse(-9 + k * 6, -6, 2.5, 5, 0, 0, 7); gr.fill(); } gr.fillStyle = 'rgba(255,255,255,.5)'; gr.beginPath(); gr.ellipse(-8, -14, 6, 3, -.5, 0, 7); gr.fill();
    gr.restore();
  }
  function drawFish(gr, f, x, y, sc, t) {
    const s = SP[f.sp], face = f.face === undefined ? 1 : f.face, fs = Math.sign(face) || 1, fw = Math.max(.22, Math.abs(face));
    const pitch = f.vx !== undefined && f.sp !== 4 && f.sp !== 5 ? K.clamp(Math.atan2(f.vy, Math.abs(f.vx) + 20), -.4, .4) * fs : 0;
    gr.save(); gr.translate(x, y);
    if (f.sp !== 5) ell(gr, 0, SAND + 10 - y, s.L * sc * .35, 4 * sc, 0, `rgba(0,20,40,${.12 * (1 - (SAND - y) / 600)})`);
    gr.rotate(pitch); gr.scale(fs * fw * sc, sc); fishArt(gr, f.sp, f.v, t, f.seed || 0, f.puff || 0); gr.restore();
  }
  function turtleArt(gr, tu, t) {
    gr.save(); gr.translate(tu.x, tu.y); gr.scale(tu.dir, 1); gr.rotate(tu.pet ? Math.sin(tu.t * 6) * .15 : 0); const p = Math.sin(t * 3);
    gr.fillStyle = '#7fbf6a'; gr.save(); gr.rotate(-.5 + p * .4); gr.beginPath(); gr.ellipse(20, -26, 34, 10, -.3, 0, 7); gr.fill(); gr.restore();
    gr.save(); gr.rotate(.4 - p * .4); gr.beginPath(); gr.ellipse(20, 26, 30, 9, .3, 0, 7); gr.fill(); gr.restore();
    gr.beginPath(); gr.ellipse(-48, 18, 14, 6, .5 - p * .3, 0, 7); gr.ellipse(-48, -16, 14, 6, -.5 + p * .3, 0, 7); gr.fill();
    ell(gr, 64, -4, 20, 15, .1, '#8fcf7a'); eye(gr, 72, -9, 4.5); gr.strokeStyle = '#3a6a2a'; gr.lineWidth = 2; gr.beginPath(); gr.arc(76, 0, 5, .2, 1.6); gr.stroke();
    const sg = gr.createRadialGradient(-6, -14, 6, 0, 0, 60); sg.addColorStop(0, '#c9a35a'); sg.addColorStop(1, '#6a4a1a'); ell(gr, 0, 0, 56, 36, 0, sg);
    gr.strokeStyle = 'rgba(60,40,10,.6)'; gr.lineWidth = 2.5; for (const [hx, hy] of [[0, 0], [-28, -8], [28, -8], [-26, 14], [26, 14], [0, -24], [0, 22]]) { gr.beginPath(); for (let k = 0; k < 6; k++) { const an = k / 6 * 6.28; gr.lineTo(hx + Math.cos(an) * 13, hy + Math.sin(an) * 10); } gr.closePath(); gr.stroke(); }
    gr.fillStyle = 'rgba(255,255,255,.18)'; gr.beginPath(); gr.ellipse(-8, -18, 30, 9, -.1, 0, 7); gr.fill();
    if (tu.pet) { gr.scale(tu.dir, 1); Tx(gr, '♥', 0, -60 - (tu.t % 1) * 10, 30, '#ff7ab0', 'center', false, null); }
    gr.restore();
  }

  /* ---------- decorations (x = center, by = sand line) ---------- */
  function deco(gr, i, x, by, s, t) {
    gr.save(); gr.translate(x, by); gr.scale(s, s);
    if (i === 0) for (let k = 0; k < 6; k++) { const bx = -50 + k * 20, hgt = 120 + (k * 37) % 80; gr.strokeStyle = lin(gr, 0, 0, 0, -hgt, [hsl(130 + k * 6, 55, 26), hsl(115 + k * 8, 60, 46)]); gr.lineWidth = 10 - k % 3; gr.lineCap = 'round'; gr.beginPath(); gr.moveTo(bx, 4); for (let j = 1; j <= 7; j++) gr.lineTo(bx + Math.sin(t * 1.3 + j * .7 + k) * j * 2.2, -j * hgt / 7); gr.stroke(); }
    else if (i === 1) {
      ell(gr, 34, -10, 40, 26, 0, '#e8a87c'); gr.strokeStyle = 'rgba(150,80,50,.5)'; gr.lineWidth = 2; for (let k = -2; k <= 2; k++) { gr.beginPath(); gr.moveTo(0, -10 + k * 7); gr.bezierCurveTo(20, -25 + k * 7, 40, 5 + k * 7, 70, -10 + k * 7); gr.stroke(); }
      const br = (x0, y0, ang, len, d) => { const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len + Math.sin(t + d) * 0; gr.lineWidth = 3 + d * 2.5; gr.beginPath(); gr.moveTo(x0, y0); gr.lineTo(x1, y1); gr.stroke(); if (d > 0) { br(x1, y1, ang - .45, len * .72, d - 1); br(x1, y1, ang + .4, len * .7, d - 1); } else circ(gr, x1, y1, 4, '#ff9ab8'); };
      gr.strokeStyle = '#ff6f91'; gr.lineCap = 'round'; br(-34, 4, -Math.PI / 2 - .15, 42, 3); gr.strokeStyle = '#ff9a5a'; br(-6, 4, -Math.PI / 2 + .3, 30, 2);
    }
    else if (i === 2) {
      const open = (Math.sin(t * .5) + 1) / 2 * .5;
      rr(gr, -46, -44, 92, 44, 6, lin(gr, 0, -44, 0, 0, ['#a0662e', '#6a3e1a'])); gr.fillStyle = '#e0b23a'; gr.fillRect(-46, -30, 92, 6); gr.fillRect(-30, -44, 8, 44); gr.fillRect(22, -44, 8, 44);
      const gl = gr.createRadialGradient(0, -46, 2, 0, -46, 50); gl.addColorStop(0, `rgba(255,220,90,${.6 * open + .1})`); gl.addColorStop(1, 'rgba(255,220,90,0)'); circ(gr, 0, -46, 50, gl);
      for (let k = 0; k < 5; k++) circ(gr, -28 + k * 14, -46, 7, '#ffd23f');
      gr.save(); gr.translate(-46, -44); gr.rotate(-open); gr.fillStyle = lin(gr, 0, -26, 0, 0, ['#b8763a', '#7a4a20']); gr.beginPath(); gr.moveTo(0, 0); gr.lineTo(92, 0); gr.quadraticCurveTo(92, -28, 46, -28); gr.quadraticCurveTo(0, -28, 0, 0); gr.fill(); gr.fillStyle = '#e0b23a'; gr.fillRect(16, -26, 8, 26); gr.fillRect(68, -26, 8, 26); gr.restore();
      circ(gr, 0, -22, 6, '#e0b23a'); circ(gr, 0, -22, 2.5, '#5a3a10');
    }
    else if (i === 3) {
      const stone = lin(gr, -80, 0, 80, 0, ['#8a8aa0', '#b4b4c8', '#8a8aa0']);
      gr.fillStyle = stone; gr.fillRect(-70, -130, 140, 130); for (const tx of [-86, 56]) { gr.fillRect(tx, -170, 30, 170); for (let k = 0; k < 3; k++) gr.fillRect(tx + k * 11 - 2, -182, 8, 14); }
      for (let k = 0; k < 6; k++) gr.fillRect(-70 + k * 25, -142, 14, 14);
      gr.strokeStyle = 'rgba(60,60,80,.25)'; gr.lineWidth = 1.5; for (let r = 0; r < 8; r++) { gr.beginPath(); gr.moveTo(-70, -16 * r); gr.lineTo(70, -16 * r); gr.stroke(); }
      rr(gr, -20, -60, 40, 60, [20, 20, 0, 0], '#23233a'); for (const wx of [-48, 34, -8]) rr(gr, wx, -110, 16, 24, [8, 8, 0, 0], '#23233a');
      for (let k = 0; k < 6; k++) ell(gr, -70 + k * 28, 0, 12 + k % 3 * 3, 5, 0, 'rgba(70,140,80,.55)');
      gr.strokeStyle = '#555'; gr.lineWidth = 2; gr.beginPath(); gr.moveTo(71, -182); gr.lineTo(71, -214); gr.stroke(); gr.fillStyle = '#ff5a6a'; gr.beginPath(); gr.moveTo(72, -214); gr.quadraticCurveTo(84, -210 + Math.sin(t * 3) * 3, 96, -206); gr.lineTo(72, -198); gr.fill();
    }
    else if (i === 4) {
      gr.fillStyle = lin(gr, 0, -100, 0, 0, ['#5a3a30', '#7a5244', '#4a2e24']); gr.beginPath(); gr.moveTo(-70, 2); gr.quadraticCurveTo(-30, -60, -16, -96); gr.lineTo(16, -96); gr.quadraticCurveTo(30, -60, 70, 2); gr.fill();
      const gl = gr.createRadialGradient(0, -96, 2, 0, -96, 30); gl.addColorStop(0, `rgba(255,140,60,${.8 + Math.sin(t * 4) * .2})`); gl.addColorStop(1, 'rgba(255,100,40,0)'); circ(gr, 0, -96, 30, gl); ell(gr, 0, -96, 16, 5, 0, '#ff8a3a');
      gr.strokeStyle = 'rgba(255,120,50,.6)'; gr.lineWidth = 3; gr.beginPath(); gr.moveTo(-8, -90); gr.lineTo(-20, -50); gr.lineTo(-14, -30); gr.moveTo(10, -88); gr.lineTo(18, -60); gr.stroke();
    }
    else if (i === 5) {
      gr.rotate(-.12); gr.fillStyle = lin(gr, 0, -60, 0, 0, ['#6a4a2a', '#3a2610']); gr.beginPath(); gr.moveTo(-120, -50); gr.lineTo(110, -60); gr.quadraticCurveTo(100, 0, 70, 6); gr.lineTo(-100, 6); gr.quadraticCurveTo(-118, -20, -120, -50); gr.fill();
      gr.strokeStyle = 'rgba(30,20,10,.5)'; gr.lineWidth = 2; for (let k = 1; k < 4; k++) { gr.beginPath(); gr.moveTo(-116, -50 + k * 13); gr.lineTo(104, -58 + k * 14); gr.stroke(); }
      for (const px of [-60, -10, 40]) { circ(gr, px, -32, 8, '#2a1a0a'); gr.strokeStyle = '#a08050'; gr.lineWidth = 2; gr.beginPath(); gr.arc(px, -32, 8, 0, 7); gr.stroke(); }
      gr.fillStyle = '#4a3218'; gr.fillRect(-14, -190, 9, 140); gr.fillRect(-60, -160, 90, 7); gr.save(); gr.translate(-10, -150); gr.fillStyle = 'rgba(220,210,180,.55)'; gr.beginPath(); gr.moveTo(0, 0); gr.quadraticCurveTo(46 + Math.sin(t) * 6, 30, 30, 90); gr.lineTo(4, 80); gr.lineTo(10, 40); gr.fill(); gr.restore();
      gr.fillStyle = 'rgba(70,140,80,.6)'; for (let k = 0; k < 7; k++) circ(gr, -100 + k * 30, 2, 7 + k % 3 * 3, 'rgba(70,140,80,.6)');
    }
    else if (i === 6) {
      const o = (Math.sin(t * .7) + 1) / 2 * .55;
      gr.fillStyle = lin(gr, 0, -10, 0, 10, ['#c8b8e8', '#8a78b8']); gr.beginPath(); gr.ellipse(0, -8, 48, 16, 0, 0, Math.PI); gr.fill();
      const pg = gr.createRadialGradient(-3, -16, 1, 0, -12, 9); pg.addColorStop(0, '#fff'); pg.addColorStop(1, '#d8c8f8'); circ(gr, 0, -12, 9, pg);
      gr.save(); gr.translate(-48, -8); gr.rotate(-o); gr.fillStyle = lin(gr, 0, -40, 0, 0, ['#e8dcff', '#a894d8']); gr.beginPath(); gr.moveTo(0, 0); gr.quadraticCurveTo(48, -44, 96, 0); gr.closePath(); gr.fill(); gr.strokeStyle = 'rgba(90,70,140,.4)'; gr.lineWidth = 2; for (let k = 1; k < 6; k++) { gr.beginPath(); gr.moveTo(k * 16, 0); gr.lineTo(48, -20); gr.stroke(); } gr.restore();
    }
    else if (i === 7) { ell(gr, 0, -6, 30, 12, 0, '#b0487a'); for (let k = 0; k < 16; k++) { const bx = -26 + k * 3.5, ang = -Math.PI / 2 + (k - 7.5) * .1 + Math.sin(t * 1.6 + k * .5) * .25, l = 38 + (k % 3) * 8; gr.strokeStyle = hsl(320 + k * 3, 70, 62); gr.lineWidth = 5; gr.lineCap = 'round'; gr.beginPath(); gr.moveTo(bx, -10); gr.quadraticCurveTo(bx + Math.cos(ang) * l * .5 + Math.sin(t * 2 + k) * 6, -10 + Math.sin(ang) * l * .5, bx + Math.cos(ang) * l, -10 + Math.sin(ang) * l); gr.stroke(); circ(gr, bx + Math.cos(ang) * l, -10 + Math.sin(ang) * l, 3.5, '#ffd0ea'); } }
    else if (i === 8) { gr.rotate(.15); const hg = gr.createRadialGradient(-12, -46, 4, 0, -34, 40); hg.addColorStop(0, '#ffe0a0'); hg.addColorStop(.5, '#d0942a'); hg.addColorStop(1, '#7a4a10'); circ(gr, 0, -34, 36, hg); gr.fillStyle = '#7a4a10'; gr.fillRect(-40, -6, 80, 10); circ(gr, 4, -34, 17, '#9a6a20'); circ(gr, 4, -34, 13, '#1a3a4a'); gr.fillStyle = 'rgba(255,255,255,.3)'; gr.beginPath(); gr.ellipse(0, -39, 6, 3, -.5, 0, 7); gr.fill(); circ(gr, -26, -32, 7, '#9a6a20'); circ(gr, 32, -40, 6, '#9a6a20'); }
    else if (i === 9) { gr.fillStyle = lin(gr, -90, 0, 90, 0, ['#5a5a6a', '#8a8a9a', '#5a5a6a']); gr.beginPath(); gr.moveTo(-90, 4); gr.quadraticCurveTo(-100, -90, -30, -120); gr.quadraticCurveTo(40, -140, 80, -80); gr.quadraticCurveTo(100, -30, 90, 4); gr.lineTo(50, 4); gr.quadraticCurveTo(52, -70, 0, -74); gr.quadraticCurveTo(-48, -70, -44, 4); gr.fill(); gr.fillStyle = 'rgba(80,150,90,.7)'; for (let k = 0; k < 6; k++) circ(gr, -60 + k * 22, -110 + Math.abs(k - 2.5) * 12, 9, 'rgba(80,150,90,.7)'); }
    else if (i === 10) { for (const [mx, mh, mr, hu] of [[-30, 40, 20, 180], [0, 60, 26, 280], [30, 34, 16, 160], [50, 24, 12, 300]]) { gr.fillStyle = '#e8e0d0'; gr.fillRect(mx - 4, -mh, 8, mh); const a = .6 + Math.sin(t * 2 + mx) * .3, gl = gr.createRadialGradient(mx, -mh, 2, mx, -mh, mr * 2.2); gl.addColorStop(0, hsl(hu, 100, 70, a * .7)); gl.addColorStop(1, hsl(hu, 100, 70, 0)); circ(gr, mx, -mh, mr * 2.2, gl); gr.fillStyle = hsl(hu, 90, 65); gr.beginPath(); gr.arc(mx, -mh, mr, Math.PI, 0); gr.fill(); for (let k = 0; k < 3; k++) circ(gr, mx - mr * .5 + k * mr * .5, -mh - mr * .5, 2.5, 'rgba(255,255,255,.7)'); } }
    else if (i === 11) { for (const [sx, sy, r, c] of [[-40, -6, 18, '#ff8a3a'], [30, -4, 14, '#ff5a7a']]) { gr.fillStyle = c; gr.beginPath(); for (let k = 0; k < 10; k++) { const an = k / 10 * 6.28 - Math.PI / 2 + .2, rr2 = k % 2 ? r * .45 : r; gr.lineTo(sx + Math.cos(an) * rr2, sy + Math.sin(an) * rr2 * .6); } gr.fill(); for (let k = 0; k < 5; k++) circ(gr, sx + Math.cos(k * 1.256 - 1.37) * r * .5, sy + Math.sin(k * 1.256 - 1.37) * r * .3, 1.6, '#fff3d0'); } gr.fillStyle = '#f0d8c0'; gr.beginPath(); gr.moveTo(0, 0); gr.quadraticCurveTo(-4, -26, 10, -24); gr.quadraticCurveTo(22, -12, 12, 0); gr.fill(); gr.strokeStyle = '#c8a088'; gr.lineWidth = 1.5; for (let k = 0; k < 3; k++) { gr.beginPath(); gr.arc(8, -10, 4 + k * 4, Math.PI, 0); gr.stroke(); } }
    else if (i === 12) { for (const [cx, ch, br] of [[-50, 150, 0], [0, 90, 1], [52, 120, 0]]) { gr.fillStyle = lin(gr, cx - 16, 0, cx + 16, 0, ['#a8a090', '#e0d8c8', '#a8a090']); gr.fillRect(cx - 14, -ch, 28, ch); gr.strokeStyle = 'rgba(80,70,60,.3)'; gr.lineWidth = 2; for (let k = -8; k <= 8; k += 8) { gr.beginPath(); gr.moveTo(cx + k, -ch); gr.lineTo(cx + k, 0); gr.stroke(); } gr.fillStyle = '#d0c8b8'; gr.fillRect(cx - 20, -8, 40, 8); if (!br) gr.fillRect(cx - 20, -ch - 10, 40, 10); else { gr.beginPath(); gr.moveTo(cx - 14, -ch); gr.lineTo(cx - 4, -ch - 12); gr.lineTo(cx + 6, -ch - 4); gr.lineTo(cx + 14, -ch - 14); gr.lineTo(cx + 14, -ch); gr.fill(); } } gr.fillStyle = 'rgba(70,140,80,.55)'; circ(gr, -50, -150, 10, 'rgba(70,140,80,.55)'); circ(gr, 52, -60, 8, 'rgba(70,140,80,.55)'); }
    else if (i === 13) { for (const [kx, kh] of [[-40, 470], [10, 520], [60, 440], [1060, 500], [1110, 470]]) { gr.strokeStyle = lin(gr, 0, 0, 0, -kh, ['#3a5a1a', '#6a8a2a', '#8aaa3a']); gr.lineWidth = 7; gr.lineCap = 'round'; gr.beginPath(); gr.moveTo(kx, 4); const pts = []; for (let j = 1; j <= 10; j++) { const px = kx + Math.sin(t * .8 + j * .5 + kx) * j * 2.4, py = -j * kh / 10; gr.lineTo(px, py); pts.push([px, py]); } gr.stroke(); for (let j = 1; j < pts.length; j += 1) { const [px, py] = pts[j], sd = j % 2 ? 1 : -1; gr.fillStyle = 'rgba(120,150,40,.85)'; gr.beginPath(); gr.ellipse(px + sd * 12, py + 4, 14, 5, sd * .6 + Math.sin(t + j) * .2, 0, 7); gr.fill(); } } }
    gr.restore();
  }
  function backdrop(gr, th, t, x0, y0, w, h) {
    // theme scenery behind the decorations (drawn as soft silhouettes so the water color still shows)
    const sb = y0 + h;
    if (th === 0) { gr.fillStyle = 'rgba(180,230,255,.12)'; gr.beginPath(); gr.moveTo(x0, sb); for (let x = 0; x <= w; x += 40) gr.lineTo(x0 + x, sb - 120 - Math.sin(x * .008) * 60 - Math.sin(x * .021) * 25); gr.lineTo(x0 + w, sb); gr.fill(); }
    if (th === 1) { gr.lineCap = 'round'; for (let k = 0; k < 10; k++) { const bx = x0 + 40 + k * w / 10 + (k % 2) * 30, c = ['#ff7aa0', '#ffb36a', '#c58aff', '#6ae0c0', '#ff9a7a'][k % 5]; gr.globalAlpha = .3; if (k % 3 === 0) { gr.fillStyle = c; gr.beginPath(); gr.moveTo(bx, sb); for (let j = 0; j <= 12; j++) { const an = Math.PI + j / 12 * Math.PI; gr.lineTo(bx + Math.cos(an) * 90, sb - 20 + Math.sin(an) * 110); } gr.fill(); } else { gr.strokeStyle = c; const br = (px, py, an, l, d) => { const qx = px + Math.cos(an) * l, qy = py + Math.sin(an) * l; gr.lineWidth = 4 + d * 3; gr.beginPath(); gr.moveTo(px, py); gr.lineTo(qx, qy); gr.stroke(); if (d) { br(qx, qy, an - .5, l * .75, d - 1); br(qx, qy, an + .45, l * .7, d - 1); } }; br(bx, sb, -Math.PI / 2 + (k % 2 ? .1 : -.1), 70 + (k % 3) * 20, 3); } gr.beginPath(); gr.ellipse(bx + 40, sb - 6, 60, 40, 0, Math.PI, 0); gr.fillStyle = c; gr.fill(); } gr.globalAlpha = 1; }
    if (th === 2) { gr.fillStyle = 'rgba(30,90,30,.22)'; gr.fillRect(x0, y0, w, h); for (let k = 0; k < 14; k++) { const bx = x0 + 30 + k * w / 14 + (k % 2) * 30; gr.strokeStyle = 'rgba(20,60,20,.45)'; gr.lineWidth = 10; gr.beginPath(); gr.moveTo(bx, sb); for (let j = 1; j <= 8; j++) gr.lineTo(bx + Math.sin(t * .5 + j * .6 + k) * j * 3, sb - j * h / 8.5); gr.stroke(); } }
    if (th === 3) { gr.fillStyle = 'rgba(20,30,60,.3)'; for (let k = 0; k < 6; k++) { const bx = x0 + 40 + k * w / 6, bh = 160 + (k * 71) % 140; gr.fillRect(bx, sb - bh, 70, bh); gr.beginPath(); gr.arc(bx + 35, sb - bh, 35, Math.PI, 0); gr.fill(); gr.fillStyle = 'rgba(255,230,150,.12)'; gr.fillRect(bx + 26, sb - bh + 20, 18, 30); gr.fillStyle = 'rgba(20,30,60,.3)'; } for (let k = 0; k < 5; k++) gr.fillRect(x0 + 120 + k * w / 5, sb - 110, 18, 110); }
    if (th === 4) { gr.fillStyle = 'rgba(0,0,30,.5)'; gr.fillRect(x0, y0, w, h); for (let k = 0; k < 50; k++) { const px = x0 + (k * 263.7 + t * 6 * (k % 3 + 1)) % w, py = y0 + (k * 131.3 + Math.sin(t * .5 + k) * 20) % h, a = .4 + Math.sin(t * 2 + k) * .4; circ(gr, px, py, 1.5 + k % 3, hsl(160 + (k % 4) * 40, 100, 70, Math.max(0, a))); } }
    if (th === 5) { gr.fillStyle = 'rgba(220,245,255,.18)'; gr.fillRect(x0, y0, w, h); gr.fillStyle = 'rgba(235,250,255,.55)'; for (let k = 0; k < 22; k++) { const bx = x0 + k * w / 22, l = 30 + (k * 37) % 70; gr.beginPath(); gr.moveTo(bx, y0); gr.lineTo(bx + w / 44, y0 + l); gr.lineTo(bx + w / 22, y0); gr.fill(); } gr.fillStyle = 'rgba(220,245,255,.3)'; gr.beginPath(); gr.moveTo(x0, sb); for (let x = 0; x <= w; x += 60) gr.lineTo(x0 + x, sb - 60 - (x * 37 % 90)); gr.lineTo(x0 + w, sb); gr.fill(); }
  }
  function causticTile() {
    const N = 192, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), img = x.createImageData(N, N), pts = Array.from({ length: 16 }, () => [Math.random() * N, Math.random() * N]);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let d1 = 1e9, d2 = 1e9; for (const [px, py] of pts) { let dx = Math.abs(i - px), dy = Math.abs(j - py); if (dx > N / 2) dx = N - dx; if (dy > N / 2) dy = N - dy; const d = dx * dx + dy * dy; if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; } const e = Math.sqrt(d2) - Math.sqrt(d1), v = Math.max(0, 1 - e / 9), k = (j * N + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = v * v * 255; }
    x.putImageData(img, 0, 0); return c;
  }
  GAME.drawSkin = (gr, s) => { gr.fillStyle = lin(gr, 0, -40, 0, 40, s.c); gr.beginPath(); gr.roundRect(-46, -40, 92, 80, 14); gr.fill(); gr.fillStyle = '#e8d3a0'; gr.fillRect(-46, 26, 92, 14); gr.save(); gr.scale(1.2, 1.2); fishArt(gr, 1, 0, 0, 0, 0); gr.restore(); };

  /* ---------- draw ---------- */
  function drawTank(gr) {
    const v = K.view, t = K.t, sk = K.skin, W0 = T.x1 - T.x0;
    // room around the tank
    gr.fillStyle = lin(gr, 0, v.y0, 0, v.y1, ['#2a1e18', '#1a120e']); gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    gr.fillStyle = lin(gr, 0, T.y1, 0, v.y1, ['#5a3a22', '#3a2414']); gr.fillRect(v.x0, T.y1 + 4, v.x1 - v.x0, v.y1 - T.y1);
    gr.save(); rr(gr, T.x0, T.y0, W0, T.y1 - T.y0, 18); gr.clip();
    gr.fillStyle = lin(gr, 0, T.y0, 0, SAND, [sk.c[0], sk.c[1]]); gr.fillRect(T.x0, T.y0, W0, T.y1 - T.y0);
    // light shafts from the surface
    gr.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { const x = T.x0 + 80 + i * 220 + Math.sin(t * .3 + i * 1.7) * 50, w = 70 + (i % 3) * 30; gr.fillStyle = lin(gr, 0, T.y0, 0, SAND, ['rgba(255,255,255,.10)', 'rgba(255,255,255,0)']); gr.beginPath(); gr.moveTo(x, T.y0); gr.lineTo(x + w, T.y0); gr.lineTo(x + w * .3 - 160, SAND); gr.lineTo(x - w * .6 - 160, SAND); gr.fill(); }
    gr.globalCompositeOperation = 'source-over';
    backdrop(gr, S.theme, t, T.x0, T.y0, W0, SAND - T.y0);
    // distant motes
    for (const m of motes) circ(gr, m.x, m.y, m.r, `rgba(255,255,255,${.12 + Math.sin(t + m.p) * .08})`);
    // sand
    gr.fillStyle = lin(gr, 0, SAND - 20, 0, T.y1, ['#e8d3a0', '#d8bd84', '#b89a62']); gr.beginPath(); gr.moveTo(T.x0, SAND); for (let x = T.x0; x <= T.x1; x += 30) gr.lineTo(x, SAND - 6 + Math.sin(x * .013) * 7 + Math.sin(x * .041) * 3); gr.lineTo(T.x1, T.y1); gr.lineTo(T.x0, T.y1); gr.fill();
    gr.fillStyle = 'rgba(120,90,50,.25)'; for (let k = 0; k < 40; k++) ell(gr, T.x0 + (k * 97.3) % W0, SAND + 10 + (k * 13) % 34, 3 + k % 4, 2, 0, 'rgba(120,90,50,.22)');
    for (const [rx, rw, rh, c] of [[380, 70, 34, '#6a7280'], [430, 40, 22, '#7a828e'], [900, 60, 28, '#6a7280'], [1200, 80, 40, '#5e6672'], [60, 50, 26, '#6a7280']]) { gr.fillStyle = lin(gr, 0, SAND - rh, 0, SAND + 10, [c, '#3a404a']); gr.beginPath(); gr.ellipse(rx, SAND + 8, rw, rh, 0, Math.PI, 0); gr.fill(); gr.fillStyle = 'rgba(255,255,255,.12)'; gr.beginPath(); gr.ellipse(rx - rw * .3, SAND + 8 - rh * .7, rw * .35, rh * .18, -.2, 0, 7); gr.fill(); }
    gr.lineCap = 'round'; for (let k = 0; k < 16; k++) { const gx = T.x0 + 40 + (k * 211.7) % (W0 - 80), n = 4 + k % 3; for (let j = 0; j < n; j++) { const hh = 24 + ((k * 7 + j * 13) % 26); gr.strokeStyle = hsl(110 + (k * 13 + j * 7) % 40, 55, 34 + j * 4); gr.lineWidth = 4; gr.beginPath(); gr.moveTo(gx + j * 6, SAND + 10); gr.quadraticCurveTo(gx + j * 6 + Math.sin(t * 1.5 + k + j) * 6, SAND + 10 - hh * .6, gx + j * 6 + Math.sin(t * 1.5 + k + j) * 10 + (j - n / 2) * 4, SAND + 10 - hh); gr.stroke(); } }
    for (const i of DRAW_ORDER) if (S.decor.includes(i)) deco(gr, i, DECOR[i].x, SAND + 6, 1, t);
    // caustics dance over everything below the surface
    if (!caust) { caust = causticTile(); cPat = gr.createPattern(caust, 'repeat'); }
    gr.save(); gr.globalCompositeOperation = 'lighter'; gr.fillStyle = cPat;
    for (const [sc, sp, al] of [[1.5, 9, .035], [1.15, -7, .03]]) { gr.save(); gr.globalAlpha = al * (S.theme === 4 ? .5 : 1); gr.translate(t * sp, t * sp * .5 + Math.sin(t * .4) * 10); gr.scale(sc, sc * .8); gr.fillRect((T.x0 - t * sp - 400) / sc, (T.y0 - 400) / sc, (W0 + 800) / sc, (T.y1 - T.y0 + 800) / sc); gr.restore(); }
    gr.globalAlpha = .1; gr.translate(t * 4, 0); gr.fillRect(T.x0 - t * 4, SAND - 10, W0, T.y1 - SAND + 10); gr.restore();
    // treasure
    if (treasure) { const tr = treasure; if (!tr.open) { const a = .5 + Math.sin(t * 6) * .5; ell(gr, tr.x, tr.y, 30, 10, 0, 'rgba(160,120,60,.4)'); gr.save(); gr.globalAlpha = a; Tx(gr, '✦', tr.x - 10, tr.y - 10, 26, '#fff7c0', 'center', false, null); Tx(gr, '✦', tr.x + 14, tr.y - 2, 16, '#fff7c0', 'center', false, null); gr.restore(); for (let k = 0; k < tr.dig; k++) ell(gr, tr.x - 20 + k * 20, tr.y + 4, 12, 5, 0, '#c8aa70'); if (tr.t > 1 && !K.bot) Tx(gr, `Dig! ${3 - tr.dig}`, tr.x, tr.y - 42 - Math.abs(Math.sin(t * 4)) * 6, 20, '#fff7c0', 'center', true); } else { gr.save(); gr.globalAlpha = Math.max(0, 1 - (tr.open - 2.5)); deco(gr, 2, tr.x, tr.y - 4 - Math.min(1, tr.open * 2) * 12, .55, t + 2); gr.restore(); } }
    // eggs, food, fish, pearls, bubbles
    for (const e of eggs) { const wob = Math.sin(t * 8) * (e.t < 3 ? 3 : 1) + Math.sin(t * 30) * (e.wob || 0) * 3, c = e.v ? hsl((SP[e.sp].h + VARIANTS[e.v]) % 360, 80, 78) : '#fff6e0'; gr.save(); gr.translate(e.x, e.y); gr.rotate(wob * .05); const g = gr.createRadialGradient(-4, -18, 2, 0, -12, 16); g.addColorStop(0, '#fff'); g.addColorStop(1, c); ell(gr, 0, -12, 11, 14, 0, g); if (e.v) { gr.globalAlpha = .5 + Math.sin(t * 5) * .4; Tx(gr, '✦', 12, -26, 14, '#fff', 'center', false, null); } gr.restore(); }
    for (const p of food) { gr.save(); gr.translate(p.x, p.y); gr.rotate(p.r); gr.globalAlpha = p.t > 18 ? (22 - p.t) / 4 : 1; gr.fillStyle = p.gold ? '#ffd23f' : '#d08a4a'; gr.fillRect(-4, -3, 8, 6); gr.fillStyle = p.gold ? '#fff6b0' : '#e8b07a'; gr.fillRect(-4, -3, 4, 3); gr.restore(); }
    const fs = fish.slice().sort((a, b) => a.age - b.age);
    for (const f of fs) drawFish(gr, f, f.x, f.y, FS * (.45 + .55 * f.age), t);
    if (turtle) turtleArt(gr, turtle, t);
    for (const f of fish) {
      if (f.hunger > .62 && !panel) { const bx = f.x + 18, by = f.y - fishR(f) - 18 + Math.sin(t * 3 + f.seed) * 3, starving = f.hunger > .85; circ(gr, bx - 10, by + 16, 3, 'rgba(255,255,255,.7)'); rr(gr, bx - 16, by - 14, 32, 26, 13, starving ? 'rgba(255,220,220,.95)' : 'rgba(255,255,255,.9)'); gr.fillStyle = '#d08a4a'; for (let k = 0; k < 3; k++) gr.fillRect(bx - 9 + k * 7, by - 4 + (k % 2) * 4, 5, 4); if (starving) Tx(gr, '!', bx + 12, by - 12, 18, '#e0303a', 'center', true, null); }
      if (f.bub > 0) { f.bub -= 1 / 60; circ(gr, f.x + f.face * fishR(f) * .8, f.y - 6 - (0.5 - f.bub) * 40, 3, 'rgba(255,255,255,.6)'); }
    }
    if (card && fish.includes(card)) { gr.strokeStyle = 'rgba(255,255,255,.7)'; gr.lineWidth = 2.5; gr.setLineDash([6, 6]); gr.lineDashOffset = -t * 20; gr.beginPath(); gr.arc(card.x, card.y, fishR(card) + 10, 0, 7); gr.stroke(); gr.setLineDash([]); }
    for (const p of pearls) { const gl = Math.max(0, Math.sin(t * 2.5 + p.x)) ** 8; const pg = gr.createRadialGradient(p.x, p.y, 4, p.x, p.y, 26); pg.addColorStop(0, 'rgba(255,255,255,.35)'); pg.addColorStop(1, 'rgba(255,255,255,0)'); circ(gr, p.x, p.y, 26, pg); pearlI(gr, p.x, p.y, 11, gl); }
    for (const b of bubbles) { gr.strokeStyle = 'rgba(255,255,255,.55)'; gr.lineWidth = 1.4; gr.beginPath(); gr.arc(b.x, b.y, b.r, 0, 7); gr.stroke(); circ(gr, b.x - b.r * .35, b.y - b.r * .35, b.r * .3, 'rgba(255,255,255,.6)'); }
    for (const r of rip) { gr.strokeStyle = `rgba(255,255,255,${.5 * (1 - r.t / .7)})`; gr.lineWidth = 2; gr.beginPath(); gr.ellipse(r.x, r.y, 10 + r.t * 50, 4 + r.t * 16, 0, 0, 7); gr.stroke(); }
    if (ev && ev.k === 'frenzy') { gr.fillStyle = `rgba(255,220,90,${.06 + Math.sin(t * 4) * .03})`; gr.fillRect(T.x0, T.y0, W0, T.y1 - T.y0); }
    // water surface
    gr.fillStyle = 'rgba(255,255,255,.12)'; gr.beginPath(); gr.moveTo(T.x0, T.y0); for (let x = T.x0; x <= T.x1; x += 20) gr.lineTo(x, SURF + Math.sin(x * .02 + t * 1.5) * 3 + Math.sin(x * .05 - t) * 2); gr.lineTo(T.x1, T.y0); gr.fill();
    gr.strokeStyle = 'rgba(255,255,255,.35)'; gr.lineWidth = 2; gr.beginPath(); for (let x = T.x0; x <= T.x1; x += 20) gr.lineTo(x, SURF + Math.sin(x * .02 + t * 1.5) * 3 + Math.sin(x * .05 - t) * 2); gr.stroke();
    gr.restore();
    // glass frame
    gr.strokeStyle = '#121a20'; gr.lineWidth = 12; rr(gr, T.x0, T.y0, W0, T.y1 - T.y0, 18); gr.stroke();
    gr.strokeStyle = 'rgba(255,255,255,.18)'; gr.lineWidth = 3; rr(gr, T.x0 + 8, T.y0 + 8, W0 - 16, T.y1 - T.y0 - 16, 14); gr.stroke();
    gr.fillStyle = 'rgba(255,255,255,.06)'; gr.beginPath(); gr.moveTo(T.x0 + 60, T.y0 + 10); gr.lineTo(T.x0 + 160, T.y0 + 10); gr.lineTo(T.x0 + 40, T.y1 - 10); gr.lineTo(T.x0 + 10, T.y1 - 10); gr.lineTo(T.x0 + 10, T.y0 + 80); gr.fill();
  }
  function meter(gr, x, y, w, p, c, label) { rr(gr, x, y, w, 12, 6, 'rgba(0,0,0,.35)'); rr(gr, x, y, Math.max(12, w * K.clamp(p, 0, 1)), 12, 6, c); Tx(gr, label, x, y - 12, 16, '#fff', 'left', false, 'rgba(0,0,0,.4)'); }
  function drawHud(gr) {
    const t = K.t;
    rr(gr, 64, 26, 600, 62, 31, 'rgba(5,25,45,.55)');
    pearlI(gr, 96, 57, 15, Math.max(0, Math.sin(t * 2)) ** 10); Tx(gr, fmt(S.shells), 120, 57, 30, '#fff', 'left', true);
    gr.font = fnt(30, true); const pw = gr.measureText(fmt(S.shells)).width;
    const fx = Math.max(250, 140 + pw); gr.save(); gr.translate(fx + 14, 57); gr.scale(.42, .42); fishArt(gr, 1, 0, t, 0, 0); gr.restore(); Tx(gr, `${fish.length}/${cap()}`, fx + 38, 57, 24, fish.length >= cap() ? '#ffb0a0' : '#fff', 'left', true);
    meter(gr, fx + 120, 62, 110, fedPct(), fedPct() < .35 ? '#ff7a5a' : '#ffc46a', `Fed ${Math.round(fedPct() * 100)}%`);
    meter(gr, fx + 250, 62, 110, (happy() - 1) / 3, '#ff7ab0', `♥ Happy +${Math.round((happy() - 1) * 100)}%`);
    // goal card
    const g = GOALS[S.goal], gx = 900, gy = 24, gw = 348;
    if (g && !K.bot) {
      rr(gr, gx, gy, gw, 76, 20, 'rgba(255,250,235,.94)'); Tx(gr, `GOAL ${S.goal + 1}/${GOALS.length}`, gx + 18, gy + 18, 15, '#c08a00', 'left', true, null);
      Tx(gr, `+${fmt(g[3])}`, gx + gw - 40, gy + 18, 16, '#7a6a9a', 'right', true, null); pearlI(gr, gx + gw - 26, gy + 18, 8);
      Tx(gr, g[0], gx + 18, gy + 42, 18, '#2a3a50', 'left', true, null);
      const p = Math.min(1, g[1]() / g[2]); rr(gr, gx + 18, gy + 58, gw - 36, 8, 4, '#e8dcc0'); rr(gr, gx + 18, gy + 58, Math.max(8, (gw - 36) * p), 8, 4, '#ffb300');
    }
    if (ev && ev.d && !(banners[0] && banners[0].t > 0)) { const c = { frenzy: '#e0a800', treasure: '#c78a2a', turtle: '#36b36a' }[ev.k], s = { frenzy: 'FEEDING FRENZY', treasure: 'BURIED TREASURE', turtle: 'SEA TURTLE VISIT' }[ev.k]; rr(gr, 520, 102, 240, 34, 17, c); rr(gr, 530, 128, 220 * Math.max(0, ev.t / ev.d), 4, 2, 'rgba(255,255,255,.7)'); Tx(gr, s, 640, 117, 17, '#fff', 'center', true); }
  }
  function drawButtons(gr) {
    const t = K.t, labels = { shop: 'Fish shop', decor: 'Decorate', theme: 'Themes', book: 'Collection', tank: 'Bigger tank' };
    for (const b of BTN) {
      const on = hover === b.k; btn(gr, on ? { ...b, y: b.y - 2 } : b, '#3aa8e0', '#1d6a9a', true, 20);
      const ix = b.x + 46, iy = b.y + 42;
      if (b.k === 'shop') { gr.save(); gr.translate(ix, iy); gr.scale(.75, .75); fishArt(gr, 1, 0, t, 0, 0); gr.restore(); }
      if (b.k === 'decor') deco(gr, 3, ix, iy + 24, .24, t);
      if (b.k === 'theme') { rr(gr, ix - 26, iy - 20, 52, 40, 8, lin(gr, 0, iy - 20, 0, iy + 20, ['#7fe0ff', '#1a5a9a'])); gr.fillStyle = '#e8d3a0'; gr.fillRect(ix - 26, iy + 10, 52, 10); deco(gr, 0, ix, iy + 14, .18, t); }
      if (b.k === 'book') { rr(gr, ix - 22, iy - 24, 44, 50, 6, '#c04a5a'); rr(gr, ix - 16, iy - 20, 34, 42, 4, '#fff3e0'); gr.save(); gr.translate(ix + 1, iy); gr.scale(.4, .4); fishArt(gr, 0, 0, t, 0, 0); gr.restore(); }
      if (b.k === 'tank') { rr(gr, ix - 26, iy - 20, 52, 40, 6, '#7fd0f0'); gr.strokeStyle = '#123'; gr.lineWidth = 3; gr.stroke(); Tx(gr, '+', ix + 18, iy - 18, 26, '#7dff9a', 'center', true); }
      Tx(gr, labels[b.k], b.x + 142, b.y + 32, 22, '#fff', 'center', true);
      const sub = b.k === 'tank' ? (S.cap + 1 < CAP.length ? `${fmt(CAP_COST[S.cap + 1])} pearls` : 'Biggest tank!') : b.k === 'decor' ? `${S.decor.length}/${DECOR.length} placed` : b.k === 'book' ? `${found()}/40 found` : b.k === 'theme' ? THEMES[S.theme].n : `${fish.length}/${cap()} fish`;
      Tx(gr, sub, b.x + 142, b.y + 60, 16, 'rgba(255,255,255,.85)', 'center', false, null);
      if (b.k === 'tank' && S.cap + 1 < CAP.length && S.shells >= CAP_COST[S.cap + 1] || b.k === 'shop' && fish.length < cap() && SP.some((s, i) => S.shells >= s.cost && !S.found[i + '-0'])) { circ(gr, b.x + b.w - 10, b.y + 6, 10, '#ff4a5a'); Tx(gr, '!', b.x + b.w - 10, b.y + 6, 15, '#fff', 'center', true, null); }
    }
  }
  function drawCard(gr) {
    const f = card; if (!f || !fish.includes(f)) { card = null; return; }
    const r = cardRect(), s = SP[f.sp], t = K.t;
    rr(gr, r.x, r.y + 6, r.w, r.h, 22, 'rgba(0,0,0,.3)'); rr(gr, r.x, r.y, r.w, r.h, 22, 'rgba(250,253,255,.97)');
    circ(gr, r.x + 54, r.y + 56, 40, lin(gr, 0, r.y + 16, 0, r.y + 96, ['#bfefff', '#5ab0e0'])); gr.save(); gr.beginPath(); gr.arc(r.x + 54, r.y + 56, 40, 0, 7); gr.clip(); const big = Math.min(1.1, 60 / Math.max(s.L, s.H)); drawFish(gr, { sp: f.sp, v: f.v, seed: f.seed, puff: f.puff }, r.x + 54, r.y + 56, big, t); gr.restore();
    Tx(gr, f.nm, r.x + 106, r.y + 30, 26, '#1d3a5a', 'left', true, null);
    Tx(gr, `${f.v ? VNAMES[f.v] + ' ' : ''}${s.n}`, r.x + 106, r.y + 56, 17, f.v ? '#a24bd8' : '#3a6a8a', 'left', true, null);
    Tx(gr, `${PERS[f.pe].n}: ${PERS[f.pe].d}`, r.x + 106, r.y + 78, 15, '#6a7a8a', 'left', false, null);
    const bar = (y, lbl, p, c) => { Tx(gr, lbl, r.x + 18, y, 16, '#3a4a5a', 'left', true, null); rr(gr, r.x + 104, y - 6, 196, 12, 6, '#dde6ee'); rr(gr, r.x + 104, y - 6, Math.max(12, 196 * p), 12, 6, c); };
    bar(r.y + 108, f.age >= 1 ? 'Grown!' : 'Growing', f.age, '#5fd36a'); bar(r.y + 132, f.hunger > .62 ? 'Hungry' : 'Full', 1 - f.hunger, f.hunger > .62 ? '#ff8a5a' : '#ffc46a');
    const nb = { x: r.x + 14, y: r.y + 150, w: 146, h: 52 }, sb = { x: r.x + 170, y: r.y + 150, w: 136, h: 52 };
    btn(gr, nb, '#8ab8e0', '#5a88b8', true, 14); Tx(gr, 'New name', nb.x + nb.w / 2, nb.y + 23, 18, '#fff', 'center', true);
    btn(gr, sb, '#7be37f', '#36a845', f.age >= 1, 14); Tx(gr, f.age >= 1 ? `Sell ${fmt(Math.round(s.val * (f.v ? 4 : 1)))}` : 'Too young', sb.x + sb.w / 2, sb.y + 23, 18, '#fff', 'center', true);
  }
  function drawPanel(gr) {
    const v = K.view, P = PANEL, t = K.t;
    gr.fillStyle = 'rgba(2,12,24,.6)'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    rr(gr, P.x, P.y + 8, P.w, P.h, 30, 'rgba(0,0,0,.35)'); rr(gr, P.x, P.y, P.w, P.h, 30, lin(gr, 0, P.y, 0, P.y + P.h, ['#f6fbff', '#dcecf8']));
    const title = { shop: 'Fish shop', decor: 'Decorations', theme: 'Tank themes', book: 'Collection book' }[panel];
    Tx(gr, title, P.x + 32, P.y + 40, 34, '#1d5a80', 'left', true, null);
    rr(gr, P.x + P.w - 330, P.y + 20, 240, 42, 21, 'rgba(29,90,128,.12)'); pearlI(gr, P.x + P.w - 306, P.y + 41, 12); Tx(gr, `${fmt(S.shells)} pearls`, P.x + P.w - 286, P.y + 41, 20, '#1d5a80', 'left', true, null);
    btn(gr, CLOSE, '#ff8a8a', '#e05a5a', true, 16); Tx(gr, '✕', CLOSE.x + 27, CLOSE.y + 24, 24, '#fff', 'center', true);
    if (panel === 'shop') SP.forEach((s, i) => {
      const b = pItem(i), can = S.shells >= s.cost && fish.length + eggs.length < cap(), seen = S.found[i + '-0'];
      rr(gr, b.x, b.y, b.w, b.h, 20, can ? '#ffffff' : '#eef2f6'); if (psel === i) { gr.strokeStyle = '#3aa8e0'; gr.lineWidth = 4; rr(gr, b.x, b.y, b.w, b.h, 20); gr.stroke(); }
      rr(gr, b.x + 10, b.y + 10, b.w - 20, 120, 14, lin(gr, 0, b.y + 10, 0, b.y + 130, ['#bfefff', '#4aa0d8'])); gr.save(); rr(gr, b.x + 10, b.y + 10, b.w - 20, 120, 14); gr.clip(); const sc = Math.min(1.6, 110 / Math.max(s.L * 1.8, s.H * 1.5)); drawFish(gr, { sp: i, v: 0, seed: i }, b.x + b.w / 2 + (i === 4 ? 0 : 8), b.y + 72, sc, t); gr.restore();
      if (!seen) { rr(gr, b.x + 14, b.y + 14, 52, 24, 12, '#ff5a7a'); Tx(gr, 'NEW', b.x + 40, b.y + 26, 14, '#fff', 'center', true, null); }
      Tx(gr, s.n, b.x + b.w / 2, b.y + 150, 21, '#1d3a50', 'center', true, null);
      Tx(gr, `${fmt(s.cost)} pearls`, b.x + b.w / 2, b.y + 178, 19, can ? '#2a8a3a' : '#b04a4a', 'center', true, null); Tx(gr, `makes ${s.pearl} per pearl`, b.x + b.w / 2, b.y + 200, 14, '#7a8a9a', 'center', false, null);
    });
    if (panel === 'decor') DECOR.forEach((d, i) => {
      const b = pItem(i), own = S.decor.includes(i), can = S.shells >= d.cost;
      rr(gr, b.x, b.y, b.w, b.h, 18, own ? '#e2f8e2' : can ? '#ffffff' : '#eef2f6'); if (psel === i) { gr.strokeStyle = '#3aa8e0'; gr.lineWidth = 4; rr(gr, b.x, b.y, b.w, b.h, 18); gr.stroke(); }
      gr.save(); rr(gr, b.x + 6, b.y + 6, b.w - 12, 86, 12); gr.clip(); gr.fillStyle = lin(gr, 0, b.y, 0, b.y + 92, ['#bfefff', '#5ab0e0']); gr.fillRect(b.x, b.y, b.w, 92); gr.fillStyle = '#e8d3a0'; gr.fillRect(b.x, b.y + 80, b.w, 12);
      const ds = [.38, .55, .55, .36, .5, .3, .6, .6, .6, .45, .6, .7, .42, .16][i]; deco(gr, i, b.x + b.w / 2 - (i === 13 ? 45 : 0) * ds * 4, b.y + 86, ds, t); gr.restore();
      Tx(gr, d.n, b.x + b.w / 2, b.y + 108, 17, '#1d3a50', 'center', true, null);
      Tx(gr, own ? '✓ In your tank' : `${fmt(d.cost)} pearls`, b.x + b.w / 2, b.y + 130, 16, own ? '#2a8a3a' : can ? '#1d5a80' : '#b04a4a', 'center', true, null);
    });
    if (panel === 'theme') THEMES.forEach((th, i) => {
      const b = pItem(i), own = S.themes.includes(i), can = S.shells >= th.cost, on = S.theme === i;
      rr(gr, b.x, b.y, b.w, b.h, 20, on ? '#e2f8e2' : '#ffffff'); if (psel === i || on) { gr.strokeStyle = on ? '#36b36a' : '#3aa8e0'; gr.lineWidth = 4; rr(gr, b.x, b.y, b.w, b.h, 20); gr.stroke(); }
      gr.save(); rr(gr, b.x + 10, b.y + 10, b.w - 20, 140, 14); gr.clip(); gr.fillStyle = lin(gr, 0, b.y + 10, 0, b.y + 150, K.skin.c); gr.fillRect(b.x, b.y, b.w, 150); gr.translate(b.x + 10, b.y + 10); gr.scale((b.w - 20) / 1248, 140 / 542); backdrop(gr, i, t, 0, 0, 1248, 542); gr.fillStyle = '#e8d3a0'; gr.fillRect(0, 520, 1248, 60); gr.restore();
      Tx(gr, th.n, b.x + b.w / 2, b.y + 172, 21, '#1d3a50', 'center', true, null);
      Tx(gr, on ? '✓ Showing now' : own ? 'Tap to use' : `${fmt(th.cost)} pearls`, b.x + b.w / 2, b.y + 198, 17, on ? '#2a8a3a' : own ? '#1d5a80' : can ? '#1d5a80' : '#b04a4a', 'center', true, null);
    });
    if (panel === 'book') {
      Tx(gr, `${found()} of 40 found · rare colors only come from eggs laid in your tank`, P.x + 32, P.y + 76, 16, '#5a6a7a', 'left', false, null);
      SP.forEach((s, i) => { const y = P.y + 116 + i * 55; Tx(gr, s.n, P.x + 36, y, 18, '#1d3a50', 'left', true, null); VARIANTS.forEach((_, vi) => { const x = P.x + 250 + vi * 132, got = S.found[i + '-' + vi]; rr(gr, x - 58, y - 24, 118, 48, 12, got ? (vi ? '#f3e8ff' : '#e6f6ff') : '#e8edf2'); if (got) { gr.save(); rr(gr, x - 58, y - 24, 118, 48, 12); gr.clip(); drawFish(gr, { sp: i, v: vi, seed: vi }, x, y + (i === 4 ? 4 : 0), Math.min(.7, 34 / Math.max(s.L, s.H * .8)), t); gr.restore(); } else Tx(gr, '?', x, y, 24, '#b8c4d0', 'center', true, null); if (i === 0) Tx(gr, VNAMES[vi], x, P.y + 92, 15, vi ? '#a24bd8' : '#3a6a8a', 'center', true, null); }); });
    }
  }
  function drawBanners(gr) {
    const b = banners[0]; if (!b || b.t <= 0) return; const k = b.t < .25 ? b.t / .25 : b.t > 3 ? (3.4 - b.t) / .4 : 1, y = 110 - (1 - Math.min(1, k)) * 24;
    gr.save(); gr.globalAlpha = Math.max(0, Math.min(1, k)); gr.font = fnt(28, true); const w1 = gr.measureText(b.s).width; gr.font = fnt(17); const w = Math.max(w1, gr.measureText(b.sub).width) + 70;
    rr(gr, 640 - w / 2, y + 5, w, 72, 24, 'rgba(0,0,0,.25)'); rr(gr, 640 - w / 2, y, w, 72, 24, b.c); gr.globalAlpha *= .25; rr(gr, 640 - w / 2 + 8, y + 5, w - 16, 26, 16, '#fff'); gr.globalAlpha = Math.max(0, Math.min(1, k));
    Tx(gr, b.s, 640, y + 26, 28, '#fff', 'center', true); Tx(gr, b.sub, 640, y + 54, 17, '#fff', 'center', false, 'rgba(0,0,0,.2)'); gr.restore();
  }
  function drawHint(gr) {
    if (K.bot || panel || away) return; const g = S.goal, t = K.t; let tx, ty, msg;
    if (g === 0) { tx = 640; ty = 300; msg = 'Tap the water to drop food'; }
    else if (g === 1 && fish[0]) { tx = fish[0].x; ty = fish[0].y; msg = 'Tap a fish to meet it'; }
    else if (g === 3 && pearls[0]) { tx = pearls[0].x; ty = pearls[0].y; msg = 'Tap the pearls!'; }
    else if (g === 2 && hint > 4) { tx = 640; ty = 300; msg = 'Keep feeding: babies grow when they eat'; }
    else return;
    const a = Math.min(1, hint * 1.5), bob = Math.sin(t * 6) * 8; gr.save(); gr.globalAlpha = a;
    gr.save(); gr.translate(tx + 12, ty + 16 + bob); gr.rotate(-.5); gr.fillStyle = '#fff'; gr.strokeStyle = '#234'; gr.lineWidth = 3; gr.beginPath(); gr.moveTo(0, 0); gr.lineTo(-12, 22); gr.lineTo(-4, 20); gr.lineTo(-6, 38); gr.lineTo(6, 38); gr.lineTo(4, 20); gr.lineTo(12, 22); gr.closePath(); gr.fill(); gr.stroke(); gr.restore();
    gr.font = fnt(22, true); const w = gr.measureText(msg).width + 40, bx = K.clamp(tx - w / 2, 30, 1250 - w), by = K.clamp(ty + 64, 120, 540);
    rr(gr, bx, by, w, 44, 22, 'rgba(10,30,50,.85)'); Tx(gr, msg, bx + w / 2, by + 22, 22, '#fff', 'center', true, null); gr.restore();
  }
  function drawAway(gr) {
    const v = K.view, t = K.t; gr.fillStyle = 'rgba(2,12,24,.6)'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    rr(gr, 390, 196, 500, 300, 30, 'rgba(0,0,0,.3)'); rr(gr, 390, 190, 500, 300, 30, '#f6fbff');
    Tx(gr, 'Welcome back!', 640, 240, 38, '#1d5a80', 'center', true, null); Tx(gr, `Your fish were busy for ${Math.floor(away.secs / 3600)}h ${Math.floor(away.secs % 3600 / 60)}m`, 640, 284, 19, '#5a6a7a', 'center', false, null);
    for (let k = 0; k < 5; k++) pearlI(gr, 520 + k * 22, 344 + Math.sin(t * 3 + k) * 4, 12, k === 2 ? .8 : 0); Tx(gr, `+${fmt(away.gain)}`, 760, 344, 44, '#2a8a3a', 'center', true, null);
    const b = { x: 520, y: 400, w: 240, h: 64 }; btn(gr, b, '#7be37f', '#36a845', true, 20); Tx(gr, 'Collect', 640, 430, 26, '#fff', 'center', true);
  }
  GAME.draw = gr => {
    drawTank(gr); drawHud(gr); drawButtons(gr);
    if (card && !panel) drawCard(gr);
    drawHint(gr);
    if (panel) drawPanel(gr);
    drawBanners(gr);
    if (away) drawAway(gr);
  };
  GAME._dbg = () => ({ S, fish, startEvent, open: k => { panel = k; }, pearls });
})();
