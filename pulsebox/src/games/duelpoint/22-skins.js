  /* ---------- 22 skins: the lines, their rarities, the daily store and what a match pays ----------
     A skin is a line (its look, its add-on parts, its effects) on one weapon, so 'inferno:lancer' is the Inferno Lancer.
     Rarity sets what a line brings: a Common is a paint job; a Rare adds parts and coloured tracers; an Epic reshapes the
     gun and brings its own muzzle flash and kill banner; a Legendary adds a living finish, idle effects, a kill effect and
     a kill sound; a Mythic is all of that at full strength, and turns up in the store about once a week. A Paragon is
     above them all: the most elaborate glow, reload, idle and kill effects and its own sounds, and exactly one is on sale
     in every rotation, in a featured slot of its own.
     Pure data and rules: the pictures are in 77-skins and 77-skinfx. */
  const RARITY = {
    common: { n: 'Common', col: '#a7b1bd', price: 300, w: 38, tier: 0 },
    rare: { n: 'Rare', col: '#4fa3ff', price: 700, w: 30, tier: 1 },
    epic: { n: 'Epic', col: '#b56bff', price: 1400, w: 19, tier: 2 },
    legendary: { n: 'Legendary', col: '#ffb020', price: 2600, w: 10, tier: 3 },
    mythic: { n: 'Mythic', col: '#ff5ac8', price: 4800, w: 3, tier: 4 },
    paragon: { n: 'Paragon', col: '#c6ff3a', price: 8000, w: 0, tier: 5 },   // never rolled: it has its own slot
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
  // thirty-two more lines, each a painted pattern (77-skins paints it from pat): commons are paint, rares add parts and
  // tracers, epics a muzzle flash, kill effect, banner and sound, legendaries a living finish and idle effects, mythics all of it
  const PL = (n, r, blurb, base, alt, pat, more = {}) => Object.assign({ n, r, blurb, base, alt, pat }, more);
  Object.assign(LINES, {
    tigerline: PL('Tiger Line', 'common', 'Burnt orange with black tiger stripes.', '#e8862a', '#151210', 'tiger'),
    arctic: PL('Arctic Camo', 'common', 'Snow, slate and ice-blue camouflage.', '#e9eef2', '#7f93a6', 'camo', { cols: ['#b9c6d2', '#7f93a6', '#5d6f80'] }),
    redwood: PL('Redwood', 'common', 'Oiled redwood grain, warm and deep.', '#8a3f22', '#c0703a', 'wood'),
    checkpoint: PL('Checkpoint', 'common', 'Racing checks in black and white.', '#f2f2f2', '#141414', 'checker'),
    mintchip: PL('Mint Chip', 'common', 'Mint green with chocolate chips. Do not lick.', '#a8ecd2', '#4a2a1a', 'dots'),
    brutal: PL('Brutalist', 'common', 'Poured concrete, stencilled with a serial.', '#9a9a96', '#e8c13a', 'concrete'),
    sakura: PL('Sakura', 'rare', 'Cherry blossom drifting over cream lacquer.', '#f6ece4', '#e8789a', 'sakura', { fx: { tracer: '#ffb3c8', muzzle: '#ffd6e2' } }),
    carbon: PL('Carbon Strike', 'rare', 'Woven carbon fibre with a racing-red flash.', '#1a1c20', '#e8202a', 'carbon', { fx: { tracer: '#ff6060', muzzle: '#ffb0a0' }, metal: .4 }),
    hive: PL('Hive', 'rare', 'Black honeycomb filled with gold.', '#1a1610', '#f2b82a', 'hex', { fx: { tracer: '#ffd060', muzzle: '#fff0b0' } }),
    contour: PL('Contour', 'rare', 'Map contour lines in sage and rust.', '#c9c7a8', '#9a4a2a', 'topo', { fx: { tracer: '#ffd8a0', muzzle: '#fff0c0' } }),
    koi: PL('Koi Pond', 'rare', 'Deep teal water with orange koi circling.', '#12424a', '#ff7a2a', 'koi', { fx: { tracer: '#7fe0e0', muzzle: '#c0fff8' } }),
    racer: PL('Racer', 'rare', 'Hazard chevrons in yellow and black.', '#1a1a1a', '#ffd21a', 'chevron', { fx: { tracer: '#ffe060', muzzle: '#fff4b0' } }),
    paintball: PL('Paintball', 'rare', 'White, splattered every colour going.', '#f4f4f0', '#ff3b8f', 'splatter', { fx: { tracer: '#7fd8ff', muzzle: '#ffffff' } }),
    leopard: PL('Leopard', 'rare', 'Golden leopard print, sharp and loud.', '#d9a54a', '#2a1a0e', 'leopard', { fx: { tracer: '#ffd890', muzzle: '#fff0c8' } }),
    dragonscale: PL('Dragonscale', 'epic', 'Overlapping crimson scales edged in gold.', '#7a1018', '#e8b030', 'scales', { fx: { tracer: '#ff7a3a', muzzle: '#ffb060' }, kill: { kind: 'flame', col: '#ff5a2a', col2: '#ffd27a' }, emblem: { shape: 'flame', col: '#ffd27a', glow: '#ff3a1a' }, sound: 'fire', metal: .5 }),
    damascus: PL('Damascus', 'epic', 'Folded steel, its layers rippling like water.', '#7c838c', '#cfd6de', 'damascus', { fx: { tracer: '#dfe8f2', muzzle: '#ffffff' }, kill: { kind: 'shards', col: '#cfd6de', col2: '#ffffff' }, emblem: { shape: 'fang', col: '#eef4fa', glow: '#8aa0b8' }, sound: 'ice', metal: 1 }),
    jade: PL('Jade Emperor', 'epic', 'Carved jade veined with gold.', '#2f8a5a', '#e8c040', 'marble', { fx: { tracer: '#9ff0c0', muzzle: '#e8ffd0' }, kill: { kind: 'coins', col: '#e8c040', col2: '#c8ffd8' }, emblem: { shape: 'crown', col: '#f4ffe8', glow: '#2f8a5a' }, sound: 'coin', clear: 1 }),
    synthwave: PL('Synthwave', 'epic', 'A neon grid running into a striped sunset.', '#1a0a2e', '#ff3ac8', 'grid', { glow: 1, fx: { tracer: '#ff6ae0', muzzle: '#7ff0ff' }, kill: { kind: 'bolt', col: '#ff3ac8', col2: '#3af0ff' }, emblem: { shape: 'star', col: '#ffe0ff', glow: '#ff3ac8' }, sound: 'zap' }),
    toxic: PL('Toxic', 'epic', 'Hazard green ooze that glows in the dark.', '#1c2418', '#8aff2a', 'ooze', { glow: 1, fx: { tracer: '#aaff5a', muzzle: '#d8ffa0' }, kill: { kind: 'void', col: '#8aff2a', col2: '#e8ffb0' }, emblem: { shape: 'fang', col: '#e8ffd0', glow: '#5aff1a' }, sound: 'void' }),
    abyssal: PL('Abyssal', 'epic', 'The deep sea, lit by drifting glowing creatures.', '#05121e', '#3ae8ff', 'biolum', { glow: 1, fx: { tracer: '#7ff4ff', muzzle: '#c0faff' }, kill: { kind: 'shards', col: '#3ae8ff', col2: '#c0faff' }, emblem: { shape: 'star', col: '#e0fdff', glow: '#3ae8ff' }, sound: 'ice' }),
    royalguard: PL('Royal Guard', 'epic', 'Midnight navy with gold filigree.', '#141c3a', '#e3b341', 'filigree', { fx: { tracer: '#ffe08a', muzzle: '#fff3c4' }, kill: { kind: 'coins', col: '#ffd24a', col2: '#fff3c4' }, emblem: { shape: 'crown', col: '#fff3c4', glow: '#e3b341' }, sound: 'coin', clear: 1 }),
    glitch: PL('Glitch', 'epic', 'Corrupted pixels shearing in red, green and blue.', '#0a0a0e', '#ff2a5a', 'glitch', { glow: 1, live: 'flicker', fx: { tracer: '#ff5a8a', muzzle: '#8affff' }, kill: { kind: 'bolt', col: '#ff2a5a', col2: '#2affd8' }, emblem: { shape: 'bolt', col: '#ffffff', glow: '#ff2a5a' }, sound: 'zap' }),
    nebula: PL('Nebula', 'legendary', 'A whole galaxy, slowly turning on the steel.', '#0a0620', '#b46bff', 'galaxy', { glow: 1, live: 'flow', fx: { tracer: '#d0a0ff', muzzle: '#f0d8ff', idle: 'motes' }, kill: { kind: 'void', col: '#b46bff', col2: '#7fd8ff' }, emblem: { shape: 'star', col: '#f3e6ff', glow: '#b46bff' }, sound: 'void' }),
    phoenix: PL('Phoenix', 'legendary', 'Feathers of flame that never burn out.', '#5a0e08', '#ffb02a', 'feathers', { glow: 1, live: 'pulse', fx: { tracer: '#ffa040', muzzle: '#ffd080', idle: 'embers' }, kill: { kind: 'flame', col: '#ff6a1a', col2: '#ffe08a' }, emblem: { shape: 'flame', col: '#fff0c0', glow: '#ff7a1a' }, sound: 'fire' }),
    aurora: PL('Aurora', 'legendary', 'Green and pink lights rippling across a polar night.', '#06101e', '#5aff9a', 'aurora', { glow: 1, live: 'flow', fx: { tracer: '#9affc8', muzzle: '#d8ffe8', idle: 'motes' }, kill: { kind: 'sun', col: '#5aff9a', col2: '#ff7ad8' }, emblem: { shape: 'star', col: '#e8fff2', glow: '#5aff9a' }, sound: 'sun' }),
    tempest: PL('Tempest', 'legendary', 'Thunderheads with lightning crawling through them.', '#1c222e', '#9ad8ff', 'clouds', { glow: 1, live: 'flicker', fx: { tracer: '#b8e8ff', muzzle: '#e8f8ff', idle: 'arcs' }, kill: { kind: 'bolt', col: '#9ad8ff', col2: '#ffffff' }, emblem: { shape: 'bolt', col: '#f0faff', glow: '#5ab8ff' }, sound: 'zap' }),
    prism: PL('Prism', 'legendary', 'Cut crystal throwing rainbows as it moves.', '#d8e4f0', '#ff9aea', 'facets', { glow: 1, live: 'shift', fx: { tracer: '#ffffff', muzzle: '#e8f0ff', idle: 'motes' }, kill: { kind: 'shards', col: '#ff9aea', col2: '#9ae8ff' }, emblem: { shape: 'star', col: '#ffffff', glow: '#c89aff' }, sound: 'ice', clear: 1 }),
    magmaflow: PL('Magma Flow', 'legendary', 'Rivers of lava creeping through black rock.', '#140c0a', '#ff5a10', 'lava', { glow: 1, live: 'flow', fx: { tracer: '#ff8a3a', muzzle: '#ffb060', idle: 'embers' }, kill: { kind: 'flame', col: '#ff4a10', col2: '#ffc060' }, emblem: { shape: 'flame', col: '#ffe0a0', glow: '#ff4a10' }, sound: 'fire' }),
    celestial: PL('Celestial', 'mythic', 'White porcelain mapped with glowing golden constellations.', '#f4f1ea', '#ffc23a', 'stars', { glow: 1, live: 'pulse', fx: { tracer: '#ffe7a0', muzzle: '#fff4d0', idle: 'motes' }, kill: { kind: 'sun', col: '#ffcf5a', col2: '#fff8e0' }, emblem: { shape: 'crown', col: '#fff8e0', glow: '#ffc23a' }, sound: 'sun', clear: 1 }),
    abyss: PL('Abyss', 'mythic', 'Jet black, split by red cracks that breathe.', '#060406', '#ff1a3a', 'cracks', { glow: 1, live: 'pulse', fx: { tracer: '#ff4a6a', muzzle: '#ff8a9a', idle: 'embers' }, kill: { kind: 'void', col: '#ff1a3a', col2: '#ffb0c0' }, emblem: { shape: 'fang', col: '#ffe0e6', glow: '#ff1a3a' }, sound: 'void' }),
    spectrum: PL('Spectrum', 'mythic', 'Liquid rainbow chrome that never stops shifting.', '#e8e8f0', '#ff5ac8', 'holo', { glow: 1, live: 'shift', fx: { tracer: '#ffffff', muzzle: '#ffe8ff', idle: 'arcs' }, kill: { kind: 'sun', col: '#ff5ac8', col2: '#5ae8ff' }, emblem: { shape: 'star', col: '#ffffff', glow: '#ff5ac8' }, sound: 'sun', metal: .9 }),
    eclipse: PL('Eclipse', 'mythic', 'A black sun ringed in burning gold.', '#0a0806', '#ffb02a', 'corona', { glow: 1, live: 'flow', fx: { tracer: '#ffd27a', muzzle: '#fff0c4', idle: 'motes' }, kill: { kind: 'void', col: '#ffb02a', col2: '#fff0c4' }, emblem: { shape: 'crown', col: '#fff0c4', glow: '#ffb02a' }, sound: 'void', metal: .6 }),
  });
  /* thirteen lines that really glow: a finish that lights up and breathes, energy flowing along strips, glowing barrel
     rings, energy cells, halos on the sight and the muzzle, and drifting particles; and each reloads with its own effect.
     gk is what 77-skinfx builds onto the gun (strips, rings, cell, sight and muzzle halos, idle particles pts, a
     signature piece sig, a second glow colour c2); rl is the reload effect (its kind and two colours). */
  Object.assign(LINES, {
    glowstick: PL('Glowstick', 'rare', 'Matte black wrapped in amber chemical light. Snap it and it glows all night.', '#16140f', '#ffb21a', 'strips', { glow: 1, live: 'pulse', fx: { tracer: '#ffd27a', muzzle: '#fff0c4' }, gk: { strips: 2, c2: '#ffe8a0' }, rl: { kind: 'snap', col: '#ffb21a', col2: '#fff0c4' } }),
    neondrift: PL('Neon Drift', 'epic', 'Night-street black with pink and sunset-orange neon tubes bent along it.', '#0d0a14', '#ff4ad8', 'tubes', { glow: 1, live: 'flicker', fx: { tracer: '#ff8ae6', muzzle: '#ffd0f4' }, kill: { kind: 'bolt', col: '#ff4ad8', col2: '#ff9a3a' }, emblem: { shape: 'bolt', col: '#ffe0f8', glow: '#ff4ad8' }, sound: 'zap', gk: { strips: 3, rings: 2, sight: 1, c2: '#ff9a3a' }, rl: { kind: 'neon', col: '#ff4ad8', col2: '#ff9a3a' } }),
    voltaic: PL('Voltaic', 'epic', 'Gunmetal wired with live current. Do not touch the bare bits.', '#23272d', '#ffe23a', 'wires', { glow: 1, live: 'flicker', metal: .6, fx: { tracer: '#fff08a', muzzle: '#ffffff' }, kill: { kind: 'bolt', col: '#ffe23a', col2: '#ffffff' }, emblem: { shape: 'bolt', col: '#fffbe0', glow: '#ffe23a' }, sound: 'zap', gk: { strips: 2, cell: 1, rings: 2, c2: '#ffffff' }, rl: { kind: 'sparks', col: '#ffe23a', col2: '#ffffff' } }),
    holoform: PL('Holoform', 'epic', 'A hard-light projection of a gun, scan lines and all.', '#071626', '#4ab8ff', 'hologrid', { glow: 1, live: 'flow', fx: { tracer: '#8ad4ff', muzzle: '#d8f4ff' }, kill: { kind: 'shards', col: '#4ab8ff', col2: '#d8f4ff' }, emblem: { shape: 'star', col: '#e8f8ff', glow: '#4ab8ff' }, sound: 'ice', gk: { strips: 2, sight: 1, muzzle: 1, pts: 'pixels', c2: '#c8f0ff' }, rl: { kind: 'digital', col: '#4ab8ff', col2: '#d8f4ff' } }),
    moonlit: PL('Moonlit', 'epic', 'Midnight lacquer, a silver crescent, and a tide of moonlight along every edge.', '#0d1330', '#cfe0ff', 'moon', { glow: 1, live: 'pulse', fx: { tracer: '#e0eaff', muzzle: '#ffffff' }, kill: { kind: 'shards', col: '#cfe0ff', col2: '#ffffff' }, emblem: { shape: 'star', col: '#ffffff', glow: '#8aa8ff' }, sound: 'ice', clear: 1, gk: { strips: 2, sight: 1, sig: 'crescent', c2: '#8aa8ff' }, rl: { kind: 'runes', col: '#cfe0ff', col2: '#8aa8ff' } }),
    permafrost: PL('Permafrost', 'legendary', 'Ice so old it glows blue from inside, veined with frost that creeps as you watch.', '#cfe4f2', '#6cc8ff', 'frost', { glow: 1, live: 'pulse', clear: 1, fx: { tracer: '#bfe8ff', muzzle: '#ffffff', idle: 'frost' }, kill: { kind: 'shards', col: '#9adcff', col2: '#ffffff' }, emblem: { shape: 'star', col: '#ffffff', glow: '#6cc8ff' }, sound: 'ice', gk: { strips: 2, rings: 2, cell: 1, muzzle: 1, pts: 'frost', sig: 'icicles', c2: '#ffffff' }, rl: { kind: 'frost', col: '#8adcff', col2: '#ffffff' } }),
    fission: PL('Fission', 'legendary', 'Hazard-yellow plating over a reactor core that burns a deep blue.', '#1b1d22', '#3a7dff', 'reactor', { glow: 1, live: 'pulse', fx: { tracer: '#8ab0ff', muzzle: '#d8e6ff', idle: 'motes' }, kill: { kind: 'void', col: '#3a7dff', col2: '#ffd23a' }, emblem: { shape: 'bolt', col: '#ffe890', glow: '#3a7dff' }, sound: 'zap', gk: { strips: 1, rings: 3, cell: 2, sight: 1, pts: 'motes', c2: '#9ad0ff' }, rl: { kind: 'cell', col: '#3a7dff', col2: '#cfe0ff' } }),
    cinderwake: PL('Cinderwake', 'legendary', 'Volcanic glass with fire just under the surface, and embers trailing off the barrel.', '#120808', '#ff4a1a', 'cinder', { glow: 1, live: 'flow', fx: { tracer: '#ff8a4a', muzzle: '#ffc070', idle: 'embers' }, kill: { kind: 'flame', col: '#ff4a1a', col2: '#ffc04a' }, emblem: { shape: 'flame', col: '#ffe0b0', glow: '#ff4a1a' }, sound: 'fire', gk: { strips: 2, rings: 2, muzzle: 1, pts: 'sparks', c2: '#ffc04a' }, rl: { kind: 'flame', col: '#ff5a1a', col2: '#ffc04a' } }),
    overclock: PL('Overclock', 'mythic', 'A rig built to run hot: smoked glass, fans, and RGB light chasing round every edge.', '#090b10', '#ff3ad0', 'rgb', { glow: 1, live: 'flow', fx: { tracer: '#ff8ae6', muzzle: '#c0fff8', idle: 'arcs' }, kill: { kind: 'bolt', col: '#ff3ad0', col2: '#3affea' }, emblem: { shape: 'bolt', col: '#ffffff', glow: '#ff3ad0' }, sound: 'zap', gk: { strips: 3, rings: 2, cell: 1, sight: 1, muzzle: 1, pts: 'pixels', sig: 'fans', c2: '#3affea' }, rl: { kind: 'digital', col: '#3affea', col2: '#ff3ad0' } }),
    ghostfire: PL('Ghostfire', 'mythic', 'Pale spirit flame that burns cold and never lights anything it touches.', '#08100e', '#7dff9a', 'spirit', { glow: 1, live: 'pulse', fx: { tracer: '#b0ffc4', muzzle: '#eafff0', idle: 'embers' }, kill: { kind: 'flame', col: '#7dff9a', col2: '#eafff0' }, emblem: { shape: 'flame', col: '#eafff0', glow: '#4aff7a' }, sound: 'void', gk: { strips: 2, rings: 2, cell: 1, sight: 1, muzzle: 1, pts: 'wisps', c2: '#eafff0' }, rl: { kind: 'flame', col: '#7dff9a', col2: '#eafff0' } }),
    starforge: PL('Starforge', 'paragon', 'Blackened iron split by white-hot plasma, forged in the heart of a dying star.', '#110d0b', '#ff8a2a', 'forge', { glow: 1, live: 'surge', metal: .5, fx: { tracer: '#ffd27a', muzzle: '#fff3d6', idle: 'motes' }, kill: { kind: 'nova', col: '#ff8a2a', col2: '#fff3d6' }, emblem: { shape: 'star', col: '#fff3d6', glow: '#ff8a2a' }, sound: 'forge', gk: { strips: 3, rings: 3, cell: 2, sight: 1, muzzle: 1, pts: 'sparks', sig: 'star', c2: '#fff3d6' }, rl: { kind: 'forge', col: '#ff8a2a', col2: '#fff3d6' } }),
    riftborn: PL('Riftborn', 'paragon', 'Black glass torn open onto somewhere else. The light leaks through the cracks.', '#07060d', '#9a5bff', 'rift', { glow: 1, live: 'flowpulse', fx: { tracer: '#c49aff', muzzle: '#c0faff', idle: 'motes' }, kill: { kind: 'rift', col: '#9a5bff', col2: '#3af0ff' }, emblem: { shape: 'fang', col: '#eafcff', glow: '#9a5bff' }, sound: 'rift', gk: { strips: 3, rings: 2, cell: 1, sight: 1, muzzle: 1, pts: 'pixels', sig: 'rift', c2: '#3af0ff' }, rl: { kind: 'rift', col: '#9a5bff', col2: '#3af0ff' } }),
    glyphbound: PL('Glyphbound', 'paragon', 'Old dark stone carved with golden runes that wake in your hands and remember every shot.', '#17191d', '#ffd04a', 'runes', { glow: 1, live: 'flowpulse', fx: { tracer: '#ffe490', muzzle: '#d0fff0', idle: 'motes' }, kill: { kind: 'glyph', col: '#ffd04a', col2: '#3affd0' }, emblem: { shape: 'crown', col: '#fff6d8', glow: '#ffd04a' }, sound: 'glyph', gk: { strips: 2, rings: 2, cell: 1, sight: 1, muzzle: 1, pts: 'runes', sig: 'glyph', c2: '#3affd0' }, rl: { kind: 'glyph', col: '#ffd04a', col2: '#3affd0' } }),
  });
  // every Epic and up reloads with an effect that fits it: the older lines get theirs here
  for (const [l, kind, col, col2] of [['circuit', 'snap', '#4dff9a', '#c8ffe0'], ['tidewater', 'snap', '#7fd8ff', '#ffffff'], ['glacier', 'frost', '#bfe8ff', '#ffffff'], ['aurum', 'gold', '#ffd24a', '#fff3c4'], ['inferno', 'flame', '#ff7a2a', '#ffd27a'], ['storm', 'bolt', '#8fe6ff', '#ffffff'],
    ['voidline', 'void', '#b46bff', '#f0dcff'], ['solaris', 'gold', '#ffcf5a', '#fff8e0'], ['dragonscale', 'flame', '#ff5a2a', '#ffd27a'], ['damascus', 'sparks', '#dfe8f2', '#ffd27a'], ['jade', 'gold', '#e8c040', '#c8ffd8'], ['synthwave', 'neon', '#ff3ac8', '#3af0ff'],
    ['toxic', 'cell', '#8aff2a', '#e8ffb0'], ['abyssal', 'motes', '#3ae8ff', '#c0faff'], ['royalguard', 'gold', '#ffd24a', '#fff3c4'], ['glitch', 'digital', '#ff2a5a', '#2affd8'], ['nebula', 'void', '#b46bff', '#7fd8ff'], ['phoenix', 'flame', '#ff6a1a', '#ffe08a'],
    ['aurora', 'motes', '#5aff9a', '#ff7ad8'], ['tempest', 'bolt', '#9ad8ff', '#ffffff'], ['prism', 'motes', '#ff9aea', '#9ae8ff'], ['magmaflow', 'flame', '#ff4a10', '#ffc060'], ['celestial', 'runes', '#ffc23a', '#fff8e0'], ['abyss', 'void', '#ff1a3a', '#ffb0c0'],
    ['spectrum', 'digital', '#ff5ac8', '#5ae8ff'], ['eclipse', 'void', '#ffb02a', '#fff0c4']]) LINES[l].rl = { kind, col, col2 };
  const SKIN_GUNS = ['pip', 'wasp', 'quill', 'hammer', 'stub', 'gnat', 'hornet', 'breaker', 'thresher', 'mako', 'paladin', 'vesper', 'lancer', 'kite', 'longbow', 'torrent', 'knife'];
  const skinId = (line, k) => line + ':' + k;
  const skinOfId = id => { if (!id) return null; const [line, k] = id.split(':'), L = LINES[line]; return L && SKIN_GUNS.includes(k) ? { id, line, k, L, R: RARITY[L.r] } : null; };
  const skinName = id => { const s = skinOfId(id); if (!s) return ''; return s.L.n + ' ' + (s.k === 'knife' ? 'Blade' : GUNS[s.k].n); };
  // knives cost half as much again: they are the one thing you hold every round
  const skinPrice = id => { const s = skinOfId(id); return s ? Math.round(s.R.price * (s.k === 'knife' ? 1.5 : 1) / 50) * 50 : 0; };
  // the store: a Paragon in its own featured slot, then seven skins drawn by rarity; the same for everyone, a new set every
  // three hours. At most one Mythic among the seven, in about one set in ten (so roughly one a day).
  const STORE_PERIOD = 3 * 3600000, STORE_SIZE = 7, storeDay = (now = Date.now()) => Math.floor(now / STORE_PERIOD), storeLeft = (now = Date.now()) => STORE_PERIOD - now % STORE_PERIOD;
  /* the featured Paragon of a period: every line on every weapon in turn, in a shuffled order that never repeats the
     line of the period before (the step, 23, shares no factor with lines x weapons, so all of them come round) */
  const PARAGONS = Object.keys(LINES).filter(l => LINES[l].r === 'paragon');
  function paragonFor(day = storeDay()) {
    const n = PARAGONS.length, all = n * SKIN_GUNS.length; let step = 23; while (gcdI(step, all) !== 1 || step % n === 0) step++;
    const i = ((day * step) % all + all) % all; return skinId(PARAGONS[i % n], SKIN_GUNS[Math.floor(i / n)]);
  }
  const gcdI = (a, b) => b ? gcdI(b, a % b) : a;
  // the whole store: [the featured Paragon, then the seven, rarest first]
  function dailyStore(day = storeDay()) { return [paragonFor(day), ...rotationFor(day)]; }
  function rotationFor(day) {
    let s = (day * 2654435761) >>> 0; const r = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const mythicDay = r() < .1, out = [], lines = Object.keys(LINES), gunFor = () => r() < .16 ? 'knife' : SKIN_GUNS[Math.floor(r() * (SKIN_GUNS.length - 1))];
    if (mythicDay) { const ms = lines.filter(l => LINES[l].r === 'mythic'); out.push(skinId(ms[Math.floor(r() * ms.length)], gunFor())); }   // a Mythic day: one, as the featured skin
    while (out.length < STORE_SIZE) {
      // roll a rarity first (so adding lines never changes how rare a rarity is), then a line of that rarity
      const legs = out.filter(id => skinOfId(id).L.r === 'legendary').length, tiers = ['common', 'rare', 'epic', 'legendary'].filter(r => !(r === 'legendary' && legs >= 2));
      let tot = 0; for (const t of tiers) tot += RARITY[t].w; let x = r() * tot, tier = tiers[0]; for (const t of tiers) { x -= RARITY[t].w; if (x <= 0) { tier = t; break; } }
      const pool = lines.filter(l => LINES[l].r === tier && !out.some(q => skinOfId(q).line === l)); if (!pool.length) continue;
      const line = pool[Math.floor(r() * pool.length)], id = skinId(line, gunFor());
      if (!out.includes(id)) out.push(id);
    }
    return out.sort((a, b) => skinOfId(b).R.tier - skinOfId(a).R.tier);
  }
  // codes typed into the store: one unlocks every skin. Only a hash of it is kept here.
  const codeHash = s => { let h = 2166136261; for (const c of String(s).trim().toUpperCase().replace(/[^A-Z0-9]/g, '')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
  const ALL_SKINS_HASH = 3385685177;
  const allSkinIds = () => { const o = []; for (const line of Object.keys(LINES)) for (const k of SKIN_GUNS) o.push(skinId(line, k)); return o; };
  // which skin a fighter has on gun k: yours from the locker, a bot's from what it was dealt, a remote player's as they sent it
  const skinFor = (f, k) => (f && f.skins && f.skins[k]) || null;
  // the skins a bot is dealt for a match: mostly plain, now and then something special
  function botSkins() { const o = {}; for (const k of SKIN_GUNS) { const x = R(); if (x < .45) continue; const tier = x < .72 ? 'common' : x < .88 ? 'rare' : x < .96 ? 'epic' : x < .99 ? 'legendary' : x < .997 ? 'mythic' : 'paragon'; const ls = Object.keys(LINES).filter(l => LINES[l].r === tier); o[k] = skinId(pick(ls), k); } return o; }
  // how the locker lists skins: rarest first (Paragon at the top), then by name
  const skinSort = ids => ids.filter(id => skinOfId(id)).sort((a, b) => { const A = skinOfId(a), B = skinOfId(b); return B.R.tier - A.R.tier || (A.L.n < B.L.n ? -1 : A.L.n > B.L.n ? 1 : 0); });
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
