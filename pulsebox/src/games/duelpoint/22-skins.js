  /* ---------- 22 skins: the lines, their rarities, the daily store and what a match pays ----------
     A skin is a line (its look, its add-on parts, its effects) on one weapon, so 'inferno:lancer' is the Inferno Lancer.
     Rarity sets what a line brings: a Common is a paint job; a Rare adds parts and coloured tracers; an Epic reshapes the
     gun and brings its own muzzle flash and kill banner; a Legendary adds a living finish, idle effects, a kill effect and
     a kill sound; a Mythic is all of that at full strength, and turns up in the store about once a week.
     Pure data and rules: the pictures are in 77-skins. */
  const RARITY = {
    common: { n: 'Common', col: '#a7b1bd', price: 300, w: 38, tier: 0 },
    rare: { n: 'Rare', col: '#4fa3ff', price: 700, w: 30, tier: 1 },
    epic: { n: 'Epic', col: '#b56bff', price: 1400, w: 19, tier: 2 },
    legendary: { n: 'Legendary', col: '#ffb020', price: 2600, w: 10, tier: 3 },
    mythic: { n: 'Mythic', col: '#ff5ac8', price: 4800, w: 3, tier: 4 },
  };
  // fx: tracer and muzzle colours; kill: the kill effect; emblem: the kill banner's glyph and glow; sound: the kill sound's extra layer
  const LINES = {
    dune: { n: 'Dune Wrap', r: 'common', blurb: 'Two-tone desert wrap. Honest work.', base: '#c9a66b', alt: '#7d6440' },
    nightshift: { n: 'Night Shift', r: 'common', blurb: 'Matte black with one stripe of hi-vis tape.', base: '#1c1f24', alt: '#e8ff3a' },
    tidewater: { n: 'Tidewater', r: 'rare', blurb: 'Deep-sea blue, brass fittings, waves along the steel.', base: '#14365a', alt: '#d9a441', fx: { tracer: '#7fd8ff', muzzle: '#bfefff' } },
    circuit: { n: 'Circuitry', r: 'rare', blurb: 'A board you can fire. The traces glow when it is warm.', base: '#0f2a1e', alt: '#4dff9a', fx: { tracer: '#6dffb0', muzzle: '#c8ffe0' } },
    glacier: { n: 'Glacier', r: 'epic', blurb: 'Frosted marble and ice that grows along the barrel.', base: '#dfeaf4', alt: '#6fc6ff', fx: { tracer: '#bfe8ff', muzzle: '#a8e4ff' }, kill: { kind: 'shards', col: '#bfe8ff', col2: '#ffffff' }, emblem: { shape: 'star', col: '#eaf7ff', glow: '#6fc6ff' }, sound: 'ice' },
    aurum: { n: 'Aurum', r: 'epic', blurb: 'White marble veined with gold. It knows it is beautiful.', base: '#f1ede4', alt: '#e3b341', fx: { tracer: '#ffe08a', muzzle: '#fff0b8' }, kill: { kind: 'coins', col: '#ffd24a', col2: '#fff3c4' }, emblem: { shape: 'crown', col: '#fff3c4', glow: '#e3b341' }, sound: 'coin' },
    inferno: { n: 'Inferno', r: 'legendary', blurb: 'Charcoal split by living lava. Heat fins, a burning core, embers on the wind.', base: '#1b1512', alt: '#ff6a1a', live: 'pulse', fx: { tracer: '#ff9a3a', muzzle: '#ff7a2a', idle: 'embers' }, kill: { kind: 'flame', col: '#ff7a2a', col2: '#ffd27a' }, emblem: { shape: 'flame', col: '#ffd27a', glow: '#ff6a1a' }, sound: 'fire' },
    storm: { n: 'Storm Coil', r: 'legendary', blurb: 'Copper coils wound round the barrel, and the lightning they hold.', base: '#2a2f38', alt: '#4fd2ff', live: 'flicker', fx: { tracer: '#8fe6ff', muzzle: '#9fe8ff', idle: 'arcs' }, kill: { kind: 'bolt', col: '#8fe6ff', col2: '#ffffff' }, emblem: { shape: 'bolt', col: '#e8fbff', glow: '#4fd2ff' }, sound: 'zap' },
    voidline: { n: 'Voidline', r: 'mythic', blurb: 'Obsidian with violet light running through it, and rings that never stop turning.', base: '#0c0a14', alt: '#b46bff', live: 'flow', fx: { tracer: '#d29bff', muzzle: '#c07bff', idle: 'motes' }, kill: { kind: 'void', col: '#b46bff', col2: '#ffffff' }, emblem: { shape: 'fang', col: '#f3e6ff', glow: '#b46bff' }, sound: 'void' },
    solaris: { n: 'Solaris', r: 'mythic', blurb: 'White ceramic and gold, a halo of sun behind the sight. It burns bright.', base: '#f6f2ea', alt: '#ffb52e', live: 'flow', fx: { tracer: '#ffe7a0', muzzle: '#fff1c4', idle: 'motes' }, kill: { kind: 'sun', col: '#ffcf5a', col2: '#fff8e0' }, emblem: { shape: 'star', col: '#fff8e0', glow: '#ffb52e' }, sound: 'sun' },
  };
  const SKIN_GUNS = ['pip', 'wasp', 'quill', 'hammer', 'stub', 'gnat', 'hornet', 'breaker', 'thresher', 'mako', 'paladin', 'vesper', 'lancer', 'kite', 'longbow', 'torrent', 'knife'];
  const skinId = (line, k) => line + ':' + k;
  const skinOfId = id => { if (!id) return null; const [line, k] = id.split(':'), L = LINES[line]; return L && SKIN_GUNS.includes(k) ? { id, line, k, L, R: RARITY[L.r] } : null; };
  const skinName = id => { const s = skinOfId(id); if (!s) return ''; return s.L.n + ' ' + (s.k === 'knife' ? 'Blade' : GUNS[s.k].n); };
  // knives cost half as much again: they are the one thing you hold every round
  const skinPrice = id => { const s = skinOfId(id); return s ? Math.round(s.R.price * (s.k === 'knife' ? 1.5 : 1) / 50) * 50 : 0; };
  // the store: five skins a day, the same for everyone, drawn by rarity. At most one Mythic, and only on about one day in seven.
  const DAY = 86400000, storeDay = (now = Date.now()) => Math.floor(now / DAY), storeLeft = (now = Date.now()) => DAY - now % DAY;
  function dailyStore(day = storeDay()) {
    let s = (day * 2654435761) >>> 0; const r = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const mythicDay = r() < .15, out = [], lines = Object.keys(LINES), gunFor = () => r() < .16 ? 'knife' : SKIN_GUNS[Math.floor(r() * (SKIN_GUNS.length - 1))];
    if (mythicDay) { const ms = lines.filter(l => LINES[l].r === 'mythic'); out.push(skinId(ms[Math.floor(r() * ms.length)], gunFor())); }   // a Mythic day: one, as the featured skin
    while (out.length < 5) {
      const pool = lines.filter(l => LINES[l].r !== 'mythic' && !(LINES[l].r === 'legendary' && out.filter(id => skinOfId(id).L.r === 'legendary').length >= 2));
      let tot = 0; for (const l of pool) tot += RARITY[LINES[l].r].w; let x = r() * tot, line = pool[0]; for (const l of pool) { x -= RARITY[LINES[l].r].w; if (x <= 0) { line = l; break; } }
      const k = gunFor(), id = skinId(line, k);
      if (!out.includes(id) && !out.some(q => skinOfId(q).line === line)) out.push(id);
    }
    return out.sort((a, b) => skinOfId(b).R.tier - skinOfId(a).R.tier);
  }
  // which skin a fighter has on gun k: yours from the locker, a bot's from what it was dealt, a remote player's as they sent it
  const skinFor = (f, k) => (f && f.skins && f.skins[k]) || null;
  // the skins a bot is dealt for a match: mostly plain, now and then something special
  function botSkins() { const o = {}; for (const k of SKIN_GUNS) { const x = R(); if (x < .45) continue; const tier = x < .72 ? 'common' : x < .88 ? 'rare' : x < .96 ? 'epic' : x < .99 ? 'legendary' : 'mythic'; const ls = Object.keys(LINES).filter(l => LINES[l].r === tier); o[k] = skinId(pick(ls), k); } return o; }
  /* What a match pays, in coins. A strong match comes to about 600, an eighth of a Mythic. Kills, headshots, rounds and
     the result count; a K/D of 2 or better adds a quarter; tougher opposition pays more. */
  function matchCoins(P, Mx, won, extra = {}) {
    const rows = [], add = (label, n) => { if (n) rows.push([label, Math.round(n)]); };
    add('Match played', 60); add(`${P.stat.k} kill${P.stat.k === 1 ? '' : 's'}`, P.stat.k * 18); add(`${P.stat.hs} headshot${P.stat.hs === 1 ? '' : 's'}`, P.stat.hs * 8); add(`${Mx.wins[0]} round${Mx.wins[0] === 1 ? '' : 's'} won`, Mx.wins[0] * 12);
    if (won) add('Victory', 120); add('Plants', (extra.plants || 0) * 20); add('Defuses', (extra.defuses || 0) * 30);
    let sub = rows.reduce((a, r) => a + r[1], 0);
    const kd = P.stat.k / Math.max(1, P.stat.d), lvl = Mx.online ? 1.1 : [.6, .85, 1, 1.15][cl(extra.botLevel == null ? 1 : extra.botLevel, 0, 3)];
    if (kd >= 2 && P.stat.k >= 4) { rows.push(['Dominant (K/D ' + kd.toFixed(1) + ')', Math.round(sub * .25)]); sub = Math.round(sub * 1.25); }
    const total = Math.round(sub * lvl); if (lvl !== 1) rows.push([Mx.online ? 'Online match' : 'Bot level', total - sub]);
    return { rows, total };
  }
