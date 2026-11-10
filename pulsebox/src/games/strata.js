// @use mp
/* Strata: a 2D dig-and-build sandbox in the style of Terraria, alone or with up to 3 friends online.
   A generated world: grass and trees, dirt, stone and caves, then deeper layers (silver, gold, shadow ore, a bone-filled
   catacomb) down to a burning underworld of ash and hellstone. Mine, build, open chests, craft at a workbench, furnace
   and anvil. Thirty-odd weapons: swords, spears, bows and arrows, a flintlock, knives, boomerangs and magic staves.
   Armor, potions, life and mana crystals, falling stars. Four bosses, each dropping new gear: King Slime, The Watcher,
   the Bone Lord and the Ember Lord. Three saved worlds; your character carries between them.
   Online: the host's world streams to everyone in chunks; the host runs the enemies; block edits, chests, players and
   hits are relayed. Art: 16px pixel tiles drawn at 1.5x, beveled where they meet air, blocky tile lighting. */
const GAME = {
  id: 'strata', title: 'Strata', tagline: 'Dig, build, fight. Alone or with friends.',
  font: 'Pixelify Sans', accent: '#9cdc4a', accent2: '#ffd23f', bg: '#10203a', noSkins: true, noHud: true, scoreLabel: 'Score',
  how: ['A/D or arrows to move, Space to jump. Click (or hold) to mine, chop, place, swing, shoot or cast at the spot you point at.', '1-0 or the mouse wheel pick a hotbar slot. Tab opens your inventory and crafting (change keys in Settings). H drinks a healing potion. Click armor to wear it.', 'Go deeper for better ore. Open chests. Summon bosses with crafted items for new weapons. Play online with up to 3 friends.'],
  skins: [{ name: 'Classic', price: 0 }],
};
(() => {
  let WW = 520; const TS = 24, PXF = '"Tiny5", "Pixelify Sans", "Courier New", monospace'; let WH = 210, HELL = 186, DK = 1;
  const DY = y => Math.round(58 + (y - 58) * DK);   // a depth from the old 210-row worlds, stretched to this world's depth
  function setDepth(wh) { WH = wh; HELL = wh === 210 ? 186 : wh - 36; DK = (HELL - 58) / 128; }
  const T = { AIR: 0, DIRT: 1, GRASS: 2, STONE: 3, COPPER: 4, IRON: 5, GOLD: 6, TRUNK: 7, LEAF: 8, PLANK: 9, TORCH: 10, BENCH: 11, FURNACE: 12, ANVIL: 13, SAND: 14, CRYSTAL: 15, SILVER: 16, SHADOW: 17, ASH: 18, HELLSTONE: 19, CHEST: 20, GCHEST: 21, MUSH: 22, BONE: 23, BRICK: 24, POT: 25, TABLE: 26, CHAIR: 27, LANTERN: 28, CAMPFIRE: 29, BED: 30, SBRICK: 31, CBRICK: 32, GBRICK: 33, GLASS: 34, BOOKS: 35, MUD: 36, JGRASS: 37, LWOOD: 38, TBRICK: 39, DTRAP: 40, SPIKE: 41, WATER: 42, COBWEB: 43, SSTONE: 44, OBSID: 45, DOOR: 46, DOORO: 47, PLAT: 48, SNOW: 49, ICE: 50, SLEAF: 51, BGRASS: 52, BSTONE: 53, BHEART: 54, GMOSS: 55, GLOWCAP: 56, CAPBLK: 57, STALK: 58, CLOUD: 59, AZURITE: 60, VIRIDIUM: 61, STARMETAL: 62, STARFORGE: 63, RUNEANVIL: 64, RGRASS: 65, LSTONE: 66 };
  const SOLID = new Set([1, 2, 3, 4, 5, 6, 9, 14, 16, 17, 18, 19, 23, 24, 31, 32, 33, 34, 36, 37, 38, 39, 40, 44, 45, 46, 49, 50, 52, 53, 55, 57, 59, 60, 61, 62, 65, 66]);
  const HARD = { 1: 1, 2: 1, 14: .9, 3: 2.4, 4: 3, 5: 4, 16: 4.6, 6: 6, 17: 8, 18: 2, 19: 10, 7: 1.6, 8: .3, 9: 1.4, 10: .2, 11: 1, 12: 2, 13: 2.5, 15: 2, 20: 1.5, 21: 2, 22: .2, 23: 3, 24: 5, 25: .3, 26: 1, 27: 1, 28: .4, 29: 1, 30: 1, 31: 2.6, 32: 2.8, 33: 3, 34: 1, 35: 1, 36: 1, 37: 1, 38: 3.2, 39: 9, 40: 9, 41: 6, 43: .2, 44: 2, 45: 5, 46: 1.2, 47: 1.2, 48: .5, 49: .8, 50: 1.4, 51: .3, 52: 1.2, 53: 2.6, 54: 1.5, 55: 1, 56: .2, 57: .8, 58: 1.2, 59: .4, 60: 7, 61: 8, 62: 9, 63: 2.5, 64: 3, 65: 1.2, 66: 3 };
  const NEED = { 60: 3.8, 61: 5.5, 62: 6.2, 66: 1.8, 53: 1.8, 6: 1.8, 17: 2.8, 19: 3.6, 24: 2.8, 39: 3.6, 40: 3.6, 41: 3.6, 45: 2.8 };
  const RAR = ['#ffffff', '#9a9aff', '#7aff7a', '#ffaa3a', '#ff7aff', '#ff4a4a'];
  /* ---------- items ---------- */
  const IT = {
    dirt: { n: 'Dirt Block', tile: 1 }, stone: { n: 'Stone Block', tile: 3 }, sand: { n: 'Sand Block', tile: 14 }, wood: { n: 'Wood', tile: 9 }, ash: { n: 'Ash Block', tile: 18 }, brick: { n: 'Dungeon Brick', tile: 24 },
    copper: { n: 'Copper Ore', tile: 4 }, iron: { n: 'Iron Ore', tile: 5 }, silver: { n: 'Silver Ore', tile: 16 }, gold: { n: 'Gold Ore', tile: 6, r: 1 }, shadow: { n: 'Shadow Ore', tile: 17, r: 2 }, hellstone: { n: 'Hellstone', tile: 19, r: 3 },
    torch: { n: 'Torch', tile: 10 }, bench: { n: 'Workbench', tile: 11 }, furnace: { n: 'Furnace', tile: 12 }, anvil: { n: 'Anvil', tile: 13 }, chest: { n: 'Chest', tile: 20 },
    gel: { n: 'Gel' }, lens: { n: 'Lens' }, bone: { n: 'Bone' }, mush: { n: 'Mushroom', tile: 22 }, star: { n: 'Fallen Star', r: 1 }, ember: { n: 'Ember', r: 3 },
    cbar: { n: 'Copper Bar' }, ibar: { n: 'Iron Bar' }, sbar: { n: 'Silver Bar' }, gbar: { n: 'Gold Bar', r: 1 }, shbar: { n: 'Shadow Bar', r: 2 }, hbar: { n: 'Hellstone Bar', r: 3 },
    arrow: { n: 'Wooden Arrow', ammo: 'arrow', dmg: 4 }, farrow: { n: 'Flaming Arrow', ammo: 'arrow', dmg: 7, fire: 1, r: 1 }, shot: { n: 'Musket Ball', ammo: 'shot', dmg: 7 }, knife: { n: 'Throwing Knife', throw: 'knife', dmg: 12 },
    life: { n: 'Life Crystal', use: 'life', r: 2 }, mana: { n: 'Mana Crystal', use: 'mana', r: 2 }, potion: { n: 'Healing Potion', use: 'heal', r: 1 },
    crown: { n: 'Gel Crown', use: 'boss:king', r: 1 }, eye: { n: 'Strange Eye', use: 'boss:watcher', r: 1 }, totem: { n: 'Bone Totem', use: 'boss:bone', r: 2 }, horn: { n: 'Ember Horn', use: 'boss:ember', r: 3 },
    cpick: { n: 'Copper Pickaxe', pick: 1, dmg: 4, c: '#d8864a' }, ipick: { n: 'Iron Pickaxe', pick: 1.8, dmg: 6, c: '#b8c0c8' }, spick: { n: 'Silver Pickaxe', pick: 2.2, dmg: 7, c: '#e0e8f0' },
    gpick: { n: 'Gold Pickaxe', pick: 2.9, dmg: 9, c: '#ffd23f', r: 1 }, shpick: { n: 'Shadow Pickaxe', pick: 3.8, dmg: 12, c: '#8a5ad8', r: 2 }, hpick: { n: 'Molten Pickaxe', pick: 5, dmg: 16, c: '#ff6a2a', r: 3 },
    cax: { n: 'Copper Axe', axe: 1, dmg: 5, c: '#d8864a' }, iax: { n: 'Iron Axe', axe: 1.8, dmg: 7, c: '#b8c0c8' }, sax: { n: 'Silver Axe', axe: 2.2, dmg: 8, c: '#e0e8f0' },
    gax: { n: 'Gold Axe', axe: 2.9, dmg: 10, c: '#ffd23f', r: 1 }, shax: { n: 'Shadow Axe', axe: 3.8, dmg: 13, c: '#8a5ad8', r: 2 }, hax: { n: 'Molten Axe', axe: 5, dmg: 17, c: '#ff6a2a', r: 3 },
    csword: { n: 'Copper Sword', melee: 9, c: '#d8864a' }, isword: { n: 'Iron Sword', melee: 14, c: '#b8c0c8' }, ssword: { n: 'Silver Sword', melee: 17, c: '#e0e8f0' }, gsword: { n: 'Gold Sword', melee: 22, c: '#ffd23f', r: 1 },
    shsword: { n: 'Shadow Blade', melee: 32, c: '#8a5ad8', r: 2 }, hsword: { n: 'Molten Blade', melee: 46, c: '#ff6a2a', fire: 1, r: 3 }, saber: { n: 'Slime Saber', melee: 26, c: '#3aa0ff', kb: 2, r: 2 },
    esword: { n: 'Enchanted Sword', melee: 24, beam: 1, c: '#7ae0ff', r: 3 }, starfall: { n: 'Starfall', melee: 70, stars: 1, c: '#ffe680', r: 5 }, spear: { n: 'Iron Spear', melee: 16, reach: 3.4, c: '#b8c0c8' }, trident: { n: 'Trident', melee: 30, reach: 3.8, c: '#3ae0c8', r: 2 },
    wbow: { n: 'Wooden Bow', bow: 6, cd: .55, c: '#b07a42' }, ibow: { n: 'Iron Bow', bow: 9, cd: .5, c: '#b8c0c8' }, gbow: { n: 'Gold Bow', bow: 13, cd: .45, c: '#ffd23f', r: 1 }, shbow: { n: 'Shadow Bow', bow: 19, cd: .38, c: '#8a5ad8', r: 2 },
    gaze: { n: "Watcher's Gaze", bow: 15, cd: .5, shots: 3, c: '#c8203a', r: 3 }, fury: { n: 'Molten Fury', bow: 30, cd: .32, fire: 1, c: '#ff6a2a', r: 3 }, eclipse: { n: 'Eclipse', bow: 44, cd: .22, shots: 2, c: '#ffe680', r: 5 },
    flint: { n: 'Flintlock Pistol', gun: 18, cd: .42, c: '#7a7a84', r: 1 }, slimegun: { n: 'Slime Gun', gun: 12, cd: .18, free: 1, c: '#3aa0ff', r: 2 },
    boom: { n: 'Wooden Boomerang', boom: 10, c: '#b07a42' }, eboom: { n: 'Enchanted Boomerang', boom: 20, c: '#7ae0ff', r: 2 },
    spark: { n: 'Wand of Sparking', magic: 9, mp: 2, proj: 'spark', c: '#ff9a3a', r: 1 }, missile: { n: 'Magic Missile', magic: 18, mp: 8, proj: 'missile', home: 1, c: '#5ad8ff', r: 2 }, water: { n: 'Water Bolt', magic: 22, mp: 7, proj: 'water', bounce: 3, c: '#3a8aff', r: 2 },
    skull: { n: 'Bone Scepter', magic: 30, mp: 9, proj: 'skull', home: 1, c: '#e8e0c8', r: 3 }, flame: { n: 'Flame Staff', magic: 34, mp: 10, proj: 'flame', fire: 1, c: '#ff6a2a', r: 3 }, starstaff: { n: 'Star Staff', magic: 26, mp: 8, proj: 'star', c: '#ffe680', r: 2 },
    carmor: { n: 'Copper Armor', armor: 3, c: '#d8864a', bon: { melee: .05 } }, iarmor: { n: 'Iron Armor', armor: 6, c: '#b8c0c8', bon: { mspd: .06 } }, sarmor: { n: 'Silver Armor', armor: 8, c: '#e0e8f0', bon: { ranged: .08 } }, garmor: { n: 'Gold Armor', armor: 11, c: '#ffd23f', r: 1, bon: { magic: .1, mana: 20 } },
    sharmor: { n: 'Shadow Armor', armor: 16, c: '#8a5ad8', r: 2, bon: { melee: .1, crit: .05 } }, harmor: { n: 'Molten Armor', armor: 24, c: '#ff6a2a', r: 3, bon: { melee: .1, ranged: .1, magic: .1, throw: .1 } },
    table: { n: 'Wooden Table', tile: 26 }, chair: { n: 'Wooden Chair', tile: 27 }, lantern: { n: 'Iron Lantern', tile: 28 }, campfire: { n: 'Campfire', tile: 29 }, bed: { n: 'Wooden Bed', tile: 30, spawn: 1 },
    sbrick: { n: 'Stone Brick', tile: 31 }, cbrick: { n: 'Copper Brick', tile: 32 }, gbrick: { n: 'Gold Brick', tile: 33, r: 1 }, glass: { n: 'Glass', tile: 34 }, books: { n: 'Bookcase', tile: 35 },
    wsword: { n: 'Wooden Sword', melee: 7, c: '#b07a42' }, bsword: { n: 'Bone Sword', melee: 20, c: '#e8e0c8', r: 1 }, gspear: { n: 'Gold Spear', melee: 22, reach: 3.6, c: '#ffd23f', r: 1 },
    cbow: { n: 'Copper Bow', bow: 7, cd: .52, c: '#d8864a' }, sbow: { n: 'Silver Bow', bow: 11, cd: .48, c: '#e0e8f0' }, musket: { n: 'Musket', gun: 26, cd: .9, c: '#6a5a4a', r: 1 },
    revolver: { n: 'Silver Revolver', gun: 15, cd: .3, c: '#e0e8f0', r: 1 }, blunder: { n: 'Blunderbuss', gun: 8, cd: 1, shots: 5, c: '#b8c0c8', r: 1 }, handcannon: { n: 'Golden Handcannon', gun: 34, cd: .75, c: '#ffd23f', r: 2 },
    repeater: { n: 'Shadow Repeater', gun: 14, cd: .13, c: '#8a5ad8', r: 2 }, scattergun: { n: 'Hellfire Scattergun', gun: 13, cd: .72, shots: 4, fire: 1, c: '#ff6a2a', r: 3 }, longrifle: { n: 'Azurite Longrifle', gun: 64, cd: 1.15, c: '#4a8aff', r: 3 },
    burstgun: { n: 'Viridium Burstgun', gun: 24, cd: .22, shots: 2, c: '#3ad87a', r: 3 }, railgun: { n: 'Starmetal Railgun', gun: 96, cd: 1.05, c: '#ffe8a0', r: 4 },
    iboom: { n: 'Iron Boomerang', boom: 14, c: '#b8c0c8' }, rod: { n: 'Spark Rod', magic: 11, mp: 3, proj: 'spark', c: '#ffb04a' }, bpick: { n: 'Bone Pickaxe', pick: 2, dmg: 7, c: '#e8e0c8', r: 1 },
    shuriken: { n: 'Shuriken', throw: 'knife', dmg: 9 }, bknife: { n: 'Bone Knife', throw: 'knife', dmg: 14 }, barrow: { n: 'Bone Arrow', ammo: 'arrow', dmg: 6 }, sshot: { n: 'Silver Shot', ammo: 'shot', dmg: 10 },
    warmor: { n: 'Wood Armor', armor: 1, c: '#b07a42', bon: { speed: .05 } }, barmor: { n: 'Bone Armor', armor: 9, c: '#e8e0c8', r: 1, bon: { ranged: .12, ammo: .15 } },
    band: { n: "Brawler's Band", acc: 'ring', c: '#d8864a', bon: { melee: .08 } }, gaunt: { n: 'Swift Gauntlet', acc: 'glove', c: '#b8c0c8', bon: { mspd: .12 } }, wemb: { n: 'Warrior Emblem', acc: 'emblem', c: '#ff5a4a', r: 2, bon: { melee: .15 } },
    quiver: { n: "Hunter's Quiver", acc: 'quiver', c: '#b07a42', bon: { ranged: .1, ammo: .2 } }, scope: { n: 'Marksman Scope', acc: 'scope', c: '#5a6a7a', r: 1, bon: { ranged: .06, crit: .08 } }, remb: { n: 'Ranger Emblem', acc: 'emblem', c: '#5ad84a', r: 2, bon: { ranged: .15 } },
    mcharm: { n: 'Mana Charm', acc: 'charm', c: '#3a7aff', bon: { mana: 20 } }, focus: { n: 'Focus Crystal', acc: 'crystal', c: '#9a7aff', r: 1, bon: { mcost: .15 } }, semb: { n: 'Sorcerer Emblem', acc: 'emblem', c: '#5a8aff', r: 2, bon: { magic: .15 } },
    pouch: { n: 'Blade Pouch', acc: 'pouch', c: '#8a5a32', bon: { throw: .15, ammo: .25 } }, temb: { n: 'Thrower Emblem', acc: 'emblem', c: '#e8c040', r: 2, bon: { throw: .2 } },
    boots: { n: 'Running Boots', acc: 'boots', c: '#a0603a', bon: { speed: .2 } }, ishield: { n: 'Iron Shield', acc: 'shield', c: '#b8c0c8', bon: { def: 3 } }, vband: { n: 'Band of Vigor', acc: 'ring', c: '#5aff7a', bon: { regen: 1 } },
    coin: { n: 'Lucky Coin', acc: 'coin', c: '#ffd23f', r: 1, bon: { crit: .04 } }, echarm: { n: 'Ember Charm', acc: 'charm', c: '#ff6a2a', r: 3, bon: { melee: .06, ranged: .06, magic: .06, throw: .06, summon: .06 } },
    homeshard: { n: 'Homeward Shard', use: 'recall', r: 2 }, lodestar: { n: 'Lodestar Charm', use: 'home', uniq: 1, r: 4 },
    essence: { n: 'Boss Essence', r: 3 }, mud: { n: 'Mud Block', tile: 36 }, lwood: { n: 'Living Wood', tile: 38 }, tbrick: { n: 'Temple Brick', tile: 39, r: 1 },
    sstone: { n: 'Sandstone Block', tile: 44 }, obsidian: { n: 'Obsidian', tile: 45 },
    azurite: { n: 'Azurite Ore', tile: 60, r: 3 }, viridium: { n: 'Viridium Ore', tile: 61, r: 3 }, starmetal: { n: 'Starmetal Ore', tile: 62, r: 4 }, azbar: { n: 'Azurite Bar', r: 3 }, vibar: { n: 'Viridium Bar', r: 3 }, smbar: { n: 'Starmetal Bar', r: 4 },
    starforge: { n: 'Starforge', tile: 63, r: 3 }, runeanvil: { n: 'Rune Anvil', tile: 64, r: 3 }, lstone: { n: 'Lumenstone', tile: 66 }, lumenshard: { n: 'Lumen Shard', r: 3 }, gloomshard: { n: 'Gloom Shard', r: 3 },
    azpick: { n: 'Azurite Pickaxe', pick: 5.6, dmg: 20, c: '#4a8aff', r: 3 }, azax: { n: 'Azurite Axe', axe: 5.6, dmg: 21, c: '#4a8aff', r: 3 }, azsword: { n: 'Azurite Sword', melee: 54, c: '#4a8aff', r: 3 }, azbow: { n: 'Azurite Bow', bow: 36, cd: .3, c: '#4a8aff', r: 3 }, azstaff: { n: 'Azurite Staff', magic: 40, mp: 9, proj: 'water', bounce: 4, c: '#4a8aff', r: 3 },
    vipick: { n: 'Viridium Pickaxe', pick: 6.4, dmg: 24, c: '#3ad87a', r: 3 }, viax: { n: 'Viridium Axe', axe: 6.4, dmg: 25, c: '#3ad87a', r: 3 }, visword: { n: 'Viridium Sword', melee: 66, c: '#3ad87a', r: 3 }, vibow: { n: 'Viridium Bow', bow: 44, cd: .27, c: '#3ad87a', r: 3 }, vistaff: { n: 'Viridium Staff', magic: 50, mp: 10, proj: 'missile', home: 1, c: '#3ad87a', r: 3 },
    smpick: { n: 'Starmetal Pickaxe', pick: 7.2, dmg: 30, c: '#ffe8a0', r: 4 }, smax: { n: 'Starmetal Axe', axe: 7.2, dmg: 30, c: '#ffe8a0', r: 4 }, smsword: { n: 'Starmetal Greatsword', melee: 80, beam: 1, c: '#ffe8a0', r: 4 }, smbow: { n: 'Starmetal Longbow', bow: 54, cd: .24, shots: 2, c: '#ffe8a0', r: 4 }, smstaff: { n: 'Starmetal Staff', magic: 62, mp: 11, proj: 'star', c: '#ffe8a0', r: 4 },
    avalanche: { n: 'Avalanche', melee: 40, c: '#9ae8ff', r: 3 }, frostheart: { n: 'Frost Heart', acc: 'charm', c: '#9ae8ff', r: 3, bon: { def: 4, regen: 1 } }, idol: { n: 'Frozen Idol', use: 'boss:colossus', r: 2 },
    blightscythe: { n: 'Blight Scythe', melee: 38, reach: 3.4, c: '#9a5ae8', r: 3 }, mawcharm: { n: 'Maw Charm', acc: 'charm', c: '#9a5ae8', r: 3, bon: { minions: 1, summon: .1 } }, offering: { n: 'Rotten Offering', use: 'boss:gloom', r: 2 },
    prismblade: { n: 'Prism Blade', melee: 92, beam: 1, c: '#ff9aff', r: 5 }, lightcharm: { n: 'Charm of Light', acc: 'charm', c: '#ffe8ff', r: 5, bon: { melee: .1, ranged: .1, magic: .1, throw: .1, summon: .1 } }, prismkey: { n: 'Prism Key', use: 'boss:sentinel', r: 4 },
    tyrantblade: { n: 'Tyrant Blade', melee: 125, stars: 1, c: '#ff5a2a', r: 5 }, voidbow: { n: 'Void Bow', bow: 72, cd: .24, shots: 3, c: '#5a2aa8', r: 5 }, eclsigil: { n: 'Eclipse Sigil', use: 'boss:tyrant', r: 4 },
    gustjar: { n: 'Gust Jar', acc: 'jar', c: '#cfeeff', r: 1, bon: {} }, emberboots: { n: 'Ember Boots', acc: 'rocket', c: '#ff6a2a', r: 2, bon: { speed: .08 } }, windstep: { n: 'Windstep Anklet', acc: 'anklet', c: '#bfe6ff', r: 1, bon: { speed: .05 } },
    prismwings: { n: 'Prism Wings', acc: 'wings', c: '#ff9aff', r: 4, bon: { speed: .1 } }, gloomwings: { n: 'Gloom Wings', acc: 'wings', c: '#9a5ae8', r: 4, bon: { speed: .1 } }, hook: { n: 'Grappling Hook', hook: 1, uniq: 1, c: '#9a9aa4', r: 1 },
    woodrod: { n: 'Wooden Fishing Rod', rod: 10, uniq: 1, c: '#b07a42' }, ironrod: { n: 'Iron Fishing Rod', rod: 22, uniq: 1, c: '#b8c0c8', r: 1 }, glowrod: { n: 'Glowcap Rod', rod: 32, uniq: 1, c: '#3ad8e8', r: 2 }, starrod: { n: 'Starmetal Rod', rod: 55, uniq: 1, c: '#ffe8a0', r: 4 },
    worm: { n: 'Worm', bait: 15 }, glowgrub: { n: 'Glow Grub', bait: 25, r: 1 }, lure: { n: 'Shiny Lure', bait: 40, r: 2 },
    minnow: { n: 'Cave Minnow', fish: 1 }, trout: { n: 'Brook Trout', fish: 1 }, perch: { n: 'Sun Perch', fish: 1 }, snapper: { n: 'Ocean Snapper', fish: 1 }, frostfin: { n: 'Frostfin', fish: 1, r: 1 }, gloomeel: { n: 'Gloom Eel', fish: 1, r: 1 },
    glowgill: { n: 'Glowgill', fish: 1, r: 1 }, prismkoi: { n: 'Prism Koi', fish: 1, r: 3 }, honeyfin: { n: 'Honeyfin', fish: 1, r: 1 }, cookedfish: { n: 'Cooked Fish', use: 'lheal' },
    woodcrate: { n: 'Wooden Crate', use: 'crate:wood' }, ironcrate: { n: 'Iron Crate', use: 'crate:iron', r: 1 }, goldcrate: { n: 'Golden Crate', use: 'crate:gold', r: 2 },
    reefblade: { n: 'Reefblade', melee: 30, c: '#3ae0c8', r: 3 }, tidecharm: { n: 'Tide Charm', acc: 'charm', c: '#3ae0c8', r: 2, bon: { regen: 1, speed: .05 } },
    snow: { n: 'Snow Block', tile: 49 }, ice: { n: 'Ice Block', tile: 50 }, bstone: { n: 'Blightstone', tile: 53 }, capblock: { n: 'Glowcap Block', tile: 57 }, cloud: { n: 'Cloud', tile: 59 },
    glowcap: { n: 'Glowcap' }, gloomscale: { n: 'Gloomscale', r: 1 },
    frostblade: { n: 'Rimeblade', melee: 26, c: '#9ae8ff', r: 2 }, froststaff: { n: 'Frost Staff', magic: 24, mp: 8, proj: 'missile', home: 1, c: '#9ae8ff', r: 2 }, frostgrip: { n: 'Frostgrip Boots', acc: 'boots', c: '#9ae8ff', r: 1, bon: { speed: .08 } },
    gloomstaff: { n: 'Gloom Staff', magic: 20, mp: 7, proj: 'skull', home: 1, c: '#9a5ae8', r: 2 }, rotbow: { n: 'Rotwood Bow', bow: 15, cd: .42, c: '#7a5a8a', r: 2 }, gloomfang: { n: 'Gloomfang', melee: 34, c: '#9a5ae8', r: 2 },
    shroompike: { n: 'Shroom Pike', melee: 22, reach: 3.6, c: '#3ad8e8', r: 1 }, sunfeather: { n: 'Sun Feather', acc: 'charm', c: '#ffe680', r: 2, bon: { speed: .06 } },
    ccoin: { n: 'Copper Coin', coin: 1 }, scoin: { n: 'Silver Coin', coin: 100 }, gcoin: { n: 'Gold Coin', coin: 10000, r: 1 }, pcoin: { n: 'Platinum Coin', coin: 1000000, r: 2 },
    door: { n: 'Wooden Door', tile: 46 }, platform: { n: 'Wood Platform', tile: 48 },
    woodwall: { n: 'Wood Wall', wall: 8 }, stonewall: { n: 'Stone Wall', wall: 9 }, sbwall: { n: 'Stone Brick Wall', wall: 10 }, cbwall: { n: 'Copper Brick Wall', wall: 11 }, gbwall: { n: 'Gold Brick Wall', wall: 12, r: 1 }, glasswall: { n: 'Glass Wall', wall: 13 },
    whammer: { n: 'Wooden Hammer', hammer: 1, dmg: 5, c: '#b07a42' }, chammer: { n: 'Copper Hammer', hammer: 1.4, dmg: 7, c: '#d8864a' }, ihammer: { n: 'Iron Hammer', hammer: 1.9, dmg: 9, c: '#b8c0c8' }, ghammer: { n: 'Gold Hammer', hammer: 2.6, dmg: 12, c: '#ffd23f', r: 1 },
    bucket: { n: 'Empty Bucket', bucket: 'empty' }, wbucket: { n: 'Water Bucket', bucket: 1 }, lbucket: { n: 'Lava Bucket', bucket: 2, r: 1 }, hbucket: { n: 'Honey Bucket', bucket: 3, r: 1 }, silk: { n: 'Spider Silk', r: 2 },
    broodstaff: { n: 'Brood Scepter', summon: 'spider', mp: 10, c: '#9a5ae8', r: 4 }, weaverfang: { n: "Weaver's Fang", acc: 'charm', c: '#9a5ae8', r: 4, bon: { minions: 1, summon: .15 } },
    sunblade: { n: 'Sunblade', melee: 38, fire: 1, c: '#ffb02e', r: 3 }, sunstaff: { n: 'Sun Staff', magic: 32, mp: 9, proj: 'flame', fire: 1, c: '#ffb02e', r: 3 }, vinebow: { n: 'Vinebow', bow: 24, cd: .36, c: '#5aa83a', r: 3 },
    thorns: { n: 'Thorn Chakram', boom: 30, c: '#5aa83a', r: 3 },
    ffwand: { n: 'Firefly Wand', summon: 'firefly', mp: 10, c: '#ffe680' }, slstaff: { n: 'Slime Staff', summon: 'slime', mp: 10, c: '#3aa0ff', r: 1 }, wispwand: { n: 'Wisp Wand', summon: 'wisp', mp: 10, c: '#9ae8ff', r: 1 },
    skstaff: { n: 'Skull Staff', summon: 'skull', mp: 10, c: '#e8e0c8', r: 1 }, falcon: { n: 'Gilded Falcon Staff', summon: 'falcon', mp: 10, c: '#ffd23f', r: 2 }, fangstaff: { n: 'Shadow Fang Staff', summon: 'fang', mp: 10, c: '#8a5ad8', r: 2 },
    spritestaff: { n: 'Ember Sprite Staff', summon: 'sprite', mp: 10, c: '#ff6a2a', r: 3 }, wyrm: { n: 'Starwyrm Scepter', summon: 'wyrm', mp: 10, c: '#ffe680', r: 5 },
    collar: { n: 'Beast Collar', acc: 'ring', c: '#a0603a', bon: { minions: 1 } }, sigil: { n: "Summoner's Sigil", acc: 'coin', c: '#7a5ad8', r: 1, bon: { summon: .12 } }, cemb: { n: 'Caller Emblem', acc: 'emblem', c: '#c87aff', r: 2, bon: { summon: .15 } },
    bell: { n: 'Spirit Bell', acc: 'charm', c: '#9ae8ff', r: 4, bon: { minions: 1, summon: .08 } },
    pactp: { n: 'Pact Potion', use: 'buff:pact', pc: '#c87aff' },
    mightp: { n: 'Might Potion', use: 'buff:might', pc: '#ff5a4a' }, eaglep: { n: 'Eagle Eye Potion', use: 'buff:eagle', pc: '#5ad84a' }, arcanep: { n: 'Arcana Potion', use: 'buff:arcana', pc: '#5a8aff' },
    edgep: { n: 'Keen Edge Potion', use: 'buff:edge', pc: '#e8c040' }, hastep: { n: 'Haste Potion', use: 'buff:haste', pc: '#7affee' }, stonep: { n: 'Stoneskin Potion', use: 'buff:stone', pc: '#9a9aa4' }, vigorp: { n: 'Vigor Potion', use: 'buff:vigor', pc: '#ff8ad8' },
    lpotion: { n: 'Lesser Healing Potion', use: 'lheal', pc: '#ff8a9a' }, mpotion: { n: 'Mana Potion', use: 'mpot', pc: '#3a7aff', r: 1 }, recall: { n: 'Recall Potion', use: 'recall', pc: '#3ae0d0', r: 1 },
  };
  // every armor set comes as a helmet, a chestplate and greaves; the old one-piece armor becomes the chestplate
  const SLOTS = ['head', 'body', 'legs'], SETS = {};
  for (const [set, nm, c, r, d, bon, body] of [['wood', 'Wood', '#b07a42', 0, [1, 1, 1], { speed: .05 }, 'warmor'], ['copper', 'Copper', '#d8864a', 0, [1, 2, 1], {}, 'carmor'], ['iron', 'Iron', '#b8c0c8', 0, [2, 3, 2], {}, 'iarmor'],
    ['silver', 'Silver', '#e0e8f0', 0, [2, 4, 2], {}, 'sarmor'], ['gold', 'Gold', '#ffd23f', 1, [3, 5, 3], {}, 'garmor'], ['bone', 'Bone', '#e8e0c8', 1, [2, 4, 3], { ranged: .12, ammo: .15 }, 'barmor'],
    ['shadow', 'Shadow', '#8a5ad8', 2, [5, 6, 5], { melee: .1, crit: .05 }, 'sharmor'], ['molten', 'Molten', '#ff6a2a', 3, [7, 10, 7], { melee: .1, ranged: .1, magic: .1, throw: .1, summon: .1 }, 'harmor'],
    ['spore', 'Spore', '#7ab04a', 0, [1, 2, 1], { minions: 1 }, 'sparmor'], ['spirit', 'Spirit', '#9ae8ff', 1, [2, 4, 3], { minions: 1, summon: .1 }, 'spiarmor'],
    ['warlord', 'Warlord', '#c8303a', 4, [10, 14, 10], { melee: .2, mspd: .15, crit: .08 }, 'wararmor'], ['deadeye', 'Deadeye', '#3a9a5a', 4, [8, 12, 9], { ranged: .2, crit: .12, ammo: .25 }, 'dearmor'],
    ['archmage', 'Archmage', '#4a6aff', 4, [6, 10, 7], { magic: .22, mana: 80, mcost: .2 }, 'amarmor'], ['phantom', 'Phantom', '#5a5a7a', 4, [7, 11, 8], { throw: .25, ammo: .3, speed: .15 }, 'pharmor'],
    ['overlord', 'Overlord', '#8a2ad8', 4, [6, 9, 7], { minions: 3, summon: .25 }, 'ovarmor'],
    ['azurite', 'Azurite', '#4a8aff', 3, [6, 9, 7], {}, 'azarmor'], ['viridium', 'Viridium', '#3ad87a', 3, [8, 11, 8], {}, 'viarmor'], ['starmetal', 'Starmetal', '#ffe8a0', 4, [10, 14, 10], {}, 'smarmor']]) {
    SETS[set] = { n: nm, bon, pieces: [body.replace('armor', 'helm'), body, body.replace('armor', 'legs')] };
    SLOTS.forEach((slot, i) => { IT[SETS[set].pieces[i]] = { n: nm + [' Helmet', ' Chestplate', ' Greaves'][i], armor: d[i], slot, set, c, ...(r ? { r } : {}) }; });
  }
  for (const k in IT) IT[k].one = !!(IT[k].uniq || IT[k].summon || IT[k].acc || IT[k].pick || IT[k].axe || IT[k].hammer || IT[k].melee || IT[k].bow || IT[k].gun || IT[k].boom || IT[k].magic || IT[k].armor);
  const DROP = { 1: 'dirt', 2: 'dirt', 3: 'stone', 4: 'copper', 5: 'iron', 6: 'gold', 7: 'wood', 9: 'wood', 10: 'torch', 11: 'bench', 12: 'furnace', 13: 'anvil', 14: 'sand', 15: 'life', 16: 'silver', 17: 'shadow', 18: 'ash', 19: 'hellstone', 20: 'chest', 21: 'chest', 22: 'mush', 23: 'bone', 24: 'brick', 26: 'table', 27: 'chair', 28: 'lantern', 29: 'campfire', 30: 'bed', 31: 'sbrick', 32: 'cbrick', 33: 'gbrick', 34: 'glass', 35: 'books', 36: 'mud', 37: 'mud', 38: 'lwood', 39: 'tbrick', 44: 'sstone', 45: 'obsidian', 46: 'door', 47: 'door', 48: 'platform', 49: 'snow', 50: 'ice', 52: 'dirt', 53: 'bstone', 55: 'mud', 56: 'glowcap', 57: 'capblock', 58: 'capblock', 59: 'cloud', 60: 'azurite', 61: 'viridium', 62: 'starmetal', 63: 'starforge', 64: 'runeanvil', 65: 'dirt', 66: 'lstone' };
  const PW = w => w >= 8 && w < 20;   // walls players built (8-19); natural walls are 1-7 and 20+
  const WALLIT = { 8: 'woodwall', 9: 'stonewall', 10: 'sbwall', 11: 'cbwall', 12: 'gbwall', 13: 'glasswall' };   // walls players build; the natural ones (1-7) drop nothing
  Object.assign(T, { PPLANK: 67, MPLANK: 68, GPLANK: 69, RPLANK: 70, SAPLING: 71 }); DROP[71] = 'acorn'; for (const k of [67, 68, 69, 70]) SOLID.add(k);
Object.assign(DROP, { 67: 'pinewood', 68: 'mosswood', 69: 'gloomwood', 70: 'glimwood' });
Object.assign(WALLIT, { 14: 'lwwall', 15: 'pwwall', 16: 'mwwall', 17: 'gwwall', 18: 'rwwall' });
// wood kinds: platform look index (pv) and wall id; platforms are one tile type, their look lives in pv[] (low 4 bits) with the stair shape (bits 4-5)
const WOODK = [['wood', 'platform', 'woodwall'], ['lwood', 'lplat', 'lwwall'], ['pinewood', 'pplat', 'pwwall'], ['mosswood', 'mplat', 'mwwall'], ['gloomwood', 'gplat', 'gwwall'], ['glimwood', 'rplat', 'rwwall']];
const WOODS = WOODK.map(w => w[0]), PLATIT = WOODK.map(w => w[1]);
Object.assign(IT, {
  acorn: { n: 'Acorn', tile: 71 }, pinewood: { n: 'Frostpine Wood', tile: 67 }, mosswood: { n: 'Mossbark Wood', tile: 68 }, gloomwood: { n: 'Gloomwood', tile: 69, r: 1 }, glimwood: { n: 'Glimmerwood', tile: 70, r: 2 },
  lplat: { n: 'Living Wood Platform', tile: 48, pv: 1 }, pplat: { n: 'Frostpine Platform', tile: 48, pv: 2 }, mplat: { n: 'Mossbark Platform', tile: 48, pv: 3 }, gplat: { n: 'Gloomwood Platform', tile: 48, pv: 4 }, rplat: { n: 'Glimmerwood Platform', tile: 48, pv: 5 },
  lwwall: { n: 'Living Wood Wall', wall: 14 }, pwwall: { n: 'Frostpine Wall', wall: 15 }, mwwall: { n: 'Mossbark Wall', wall: 16 }, gwwall: { n: 'Gloomwood Wall', wall: 17 }, rwwall: { n: 'Glimmerwood Wall', wall: 18 } });
IT.platform.pv = 0;
const WOODY = new Set([T.PPLANK, T.MPLANK, T.GPLANK, T.RPLANK, T.LWOOD, T.TRUNK, T.LEAF, T.PLANK, T.BENCH, T.CHEST, T.TABLE, T.CHAIR, T.CAMPFIRE, T.BED, T.BOOKS, T.DOOR, T.DOORO, T.PLAT, T.SLEAF, T.STALK]);   // everything an axe is made for
  const R_ = (out, n, need, at) => [out, n, need, at];
  const RECIPES = [
    R_('bench', 1, { wood: 10 }), R_('woodrod', 1, { wood: 8 }, 'bench'), R_('ironrod', 1, { ibar: 6, woodrod: 1 }, 'anvil'), R_('glowrod', 1, { capblock: 10, glowcap: 6, ibar: 4 }, 'anvil'), R_('starrod', 1, { smbar: 8 }, 'runeanvil'), R_('cookedfish', 1, { trout: 1 }, 'campfire'), R_('cookedfish', 1, { perch: 1 }, 'campfire'), R_('cookedfish', 1, { minnow: 1 }, 'campfire'), R_('cookedfish', 2, { snapper: 1 }, 'campfire'), R_('hook', 1, { ibar: 8 }, 'anvil'), R_('emberboots', 1, { hbar: 8, boots: 1 }, 'anvil'), R_('windstep', 1, { sbar: 6, gel: 20 }, 'anvil'), R_('prismwings', 1, { lumenshard: 15, azbar: 6, star: 5 }, 'runeanvil'), R_('gloomwings', 1, { gloomshard: 15, azbar: 6, star: 5 }, 'runeanvil'), R_('idol', 1, { ice: 20, snow: 20, lens: 2 }, 'bench'), R_('offering', 1, { gloomscale: 8, bone: 5 }, 'bench'), R_('prismkey', 1, { lumenshard: 10, azbar: 5 }, 'runeanvil'), R_('eclsigil', 1, { smbar: 6, lumenshard: 6, gloomshard: 6 }, 'runeanvil'), R_('starforge', 1, { hbar: 10, furnace: 1 }, 'anvil'), R_('runeanvil', 1, { azbar: 12 }, 'anvil'),
    R_('azbar', 1, { azurite: 4 }, 'starforge'), R_('vibar', 1, { viridium: 4 }, 'starforge'), R_('smbar', 1, { starmetal: 5 }, 'starforge'),
    R_('azpick', 1, { azbar: 15 }, 'anvil'), R_('azax', 1, { azbar: 12 }, 'anvil'), R_('azsword', 1, { azbar: 12 }, 'anvil'), R_('azbow', 1, { azbar: 11 }, 'anvil'), R_('azstaff', 1, { azbar: 11, star: 2 }, 'anvil'), R_('azarmor', 1, { azbar: 22 }, 'anvil'),
    R_('vipick', 1, { vibar: 15 }, 'runeanvil'), R_('viax', 1, { vibar: 12 }, 'runeanvil'), R_('visword', 1, { vibar: 12 }, 'runeanvil'), R_('vibow', 1, { vibar: 11 }, 'runeanvil'), R_('vistaff', 1, { vibar: 11, lumenshard: 3 }, 'runeanvil'), R_('viarmor', 1, { vibar: 22 }, 'runeanvil'),
    R_('smpick', 1, { smbar: 15 }, 'runeanvil'), R_('smax', 1, { smbar: 12 }, 'runeanvil'), R_('smsword', 1, { smbar: 12, lumenshard: 6, gloomshard: 6 }, 'runeanvil'), R_('smbow', 1, { smbar: 11, gloomshard: 4 }, 'runeanvil'), R_('smstaff', 1, { smbar: 11, lumenshard: 4 }, 'runeanvil'), R_('smarmor', 1, { smbar: 24 }, 'runeanvil'),
    R_('lpotion', 2, { glowcap: 2, gel: 1 }, 'bench'), R_('shroompike', 1, { capblock: 15, glowcap: 8 }, 'anvil'), R_('gloomfang', 1, { shbar: 8, gloomscale: 6 }, 'anvil'), R_('platform', 2, { wood: 1 }), ...WOODK.slice(1).flatMap(([w, p, wl]) => [R_(p, 2, { [w]: 1 }), R_(wl, 4, { [w]: 1 }, 'bench')]), R_('door', 1, { wood: 6 }, 'bench'), R_('whammer', 1, { wood: 8 }, 'bench'), R_('chammer', 1, { cbar: 8, wood: 3 }, 'anvil'), R_('ihammer', 1, { ibar: 8, wood: 3 }, 'anvil'), R_('ghammer', 1, { gbar: 9, wood: 3 }, 'anvil'),
    R_('woodwall', 4, { wood: 1 }, 'bench'), R_('stonewall', 4, { stone: 1 }, 'bench'), R_('sbwall', 4, { sbrick: 1 }, 'bench'), R_('cbwall', 4, { cbrick: 1 }, 'bench'), R_('gbwall', 4, { gbrick: 1 }, 'bench'), R_('glasswall', 4, { glass: 1 }, 'bench'),
    R_('torch', 3, { wood: 1, gel: 1 }), R_('arrow', 15, { wood: 1, stone: 1 }), R_('wbow', 1, { wood: 10 }, 'bench'), R_('boom', 1, { wood: 8 }, 'bench'),
    R_('chest', 1, { wood: 8, ibar: 1 }, 'bench'), R_('furnace', 1, { stone: 20, wood: 4, torch: 3 }, 'bench'), R_('potion', 2, { gel: 2, mush: 1 }, 'bench'), R_('farrow', 10, { arrow: 10, torch: 1 }, 'bench'),
    R_('cbar', 1, { copper: 3 }, 'furnace'), R_('ibar', 1, { iron: 3 }, 'furnace'), R_('sbar', 1, { silver: 3 }, 'furnace'), R_('gbar', 1, { gold: 4 }, 'furnace'), R_('shbar', 1, { shadow: 4 }, 'furnace'), R_('hbar', 1, { hellstone: 3, shadow: 1 }, 'furnace'),
    R_('anvil', 1, { ibar: 5 }, 'bench'), R_('carmor', 1, { cbar: 12 }, 'anvil'), R_('ipick', 1, { ibar: 10, wood: 3 }, 'anvil'), R_('cax', 1, { cbar: 8, wood: 3 }, 'anvil'), R_('iax', 1, { ibar: 9, wood: 3 }, 'anvil'), R_('isword', 1, { ibar: 8 }, 'anvil'), R_('spear', 1, { ibar: 8, wood: 4 }, 'anvil'), R_('ibow', 1, { ibar: 7 }, 'anvil'),
    R_('knife', 20, { ibar: 1 }, 'anvil'), R_('shot', 50, { ibar: 1 }, 'anvil'), R_('iarmor', 1, { ibar: 15 }, 'anvil'),
    R_('spick', 1, { sbar: 10, wood: 3 }, 'anvil'), R_('sax', 1, { sbar: 9, wood: 3 }, 'anvil'), R_('ssword', 1, { sbar: 8 }, 'anvil'), R_('sarmor', 1, { sbar: 15 }, 'anvil'),
    R_('gpick', 1, { gbar: 10, wood: 3 }, 'anvil'), R_('gax', 1, { gbar: 9, wood: 3 }, 'anvil'), R_('gsword', 1, { gbar: 8 }, 'anvil'), R_('gbow', 1, { gbar: 7 }, 'anvil'), R_('garmor', 1, { gbar: 15 }, 'anvil'),
    R_('shpick', 1, { shbar: 12 }, 'anvil'), R_('shax', 1, { shbar: 10 }, 'anvil'), R_('shsword', 1, { shbar: 10 }, 'anvil'), R_('shbow', 1, { shbar: 9 }, 'anvil'), R_('sharmor', 1, { shbar: 18 }, 'anvil'),
    R_('hpick', 1, { hbar: 15 }, 'anvil'), R_('hax', 1, { hbar: 13 }, 'anvil'), R_('hsword', 1, { hbar: 14 }, 'anvil'), R_('fury', 1, { hbar: 13 }, 'anvil'), R_('flame', 1, { hbar: 12, ember: 3 }, 'anvil'), R_('harmor', 1, { hbar: 22 }, 'anvil'),
    R_('table', 1, { wood: 8 }, 'bench'), R_('chair', 1, { wood: 4 }, 'bench'), R_('bed', 1, { wood: 15, gel: 5 }, 'bench'), R_('books', 1, { wood: 20 }, 'bench'), R_('campfire', 1, { wood: 10, torch: 5 }),
    R_('lantern', 1, { ibar: 1, torch: 1 }, 'anvil'), R_('sbrick', 1, { stone: 2 }, 'furnace'), R_('cbrick', 1, { stone: 1, copper: 1 }, 'furnace'), R_('gbrick', 1, { stone: 1, gold: 1 }, 'furnace'), R_('glass', 1, { sand: 2 }, 'furnace'),
    R_('wsword', 1, { wood: 7 }, 'bench'), R_('warmor', 1, { wood: 30 }, 'bench'), R_('barrow', 5, { arrow: 5, bone: 1 }, 'bench'), R_('lpotion', 3, { gel: 2 }, 'bench'), R_('mpotion', 2, { gel: 2, star: 1 }, 'bench'), R_('recall', 1, { mush: 1, gel: 1, bone: 1 }, 'bench'),
    R_('cbow', 1, { cbar: 7 }, 'anvil'), R_('sbow', 1, { sbar: 7 }, 'anvil'), R_('gspear', 1, { gbar: 10, wood: 4 }, 'anvil'), R_('iboom', 1, { ibar: 8 }, 'anvil'), R_('musket', 1, { ibar: 18, wood: 8 }, 'anvil'), R_('revolver', 1, { sbar: 10, ibar: 4 }, 'anvil'), R_('blunder', 1, { ibar: 14, cbar: 6, wood: 10 }, 'anvil'), R_('handcannon', 1, { gbar: 14, wood: 4 }, 'anvil'), R_('repeater', 1, { shbar: 14, lens: 4 }, 'anvil'), R_('scattergun', 1, { hbar: 16, ember: 4 }, 'anvil'), R_('longrifle', 1, { azbar: 14, lens: 2 }, 'anvil'), R_('burstgun', 1, { vibar: 14 }, 'runeanvil'), R_('railgun', 1, { smbar: 14, lumenshard: 4 }, 'runeanvil'),
    R_('rod', 1, { cbar: 10, gel: 5 }, 'anvil'), R_('shuriken', 25, { ibar: 1 }, 'anvil'), R_('sshot', 50, { sbar: 1 }, 'anvil'), R_('bsword', 1, { bone: 30 }, 'anvil'), R_('bpick', 1, { bone: 25 }, 'anvil'), R_('barmor', 1, { bone: 40 }, 'anvil'), R_('bknife', 15, { bone: 1 }, 'anvil'),
    R_('band', 1, { cbar: 6, gel: 3 }, 'anvil'), R_('gaunt', 1, { ibar: 8, bone: 5 }, 'anvil'), R_('wemb', 1, { shbar: 8, bone: 10 }, 'anvil'),
    R_('quiver', 1, { wood: 10, bone: 10, arrow: 50 }, 'bench'), R_('scope', 1, { ibar: 6, lens: 2 }, 'anvil'), R_('remb', 1, { shbar: 8, lens: 4 }, 'anvil'),
    R_('mcharm', 1, { star: 3, gel: 5 }, 'bench'), R_('focus', 1, { star: 5, sbar: 5 }, 'anvil'), R_('semb', 1, { shbar: 8, star: 3 }, 'anvil'),
    R_('pouch', 1, { ibar: 5, wood: 5 }, 'anvil'), R_('temb', 1, { shbar: 8, ibar: 5 }, 'anvil'), R_('boots', 1, { gel: 10, ibar: 4 }, 'anvil'), R_('ishield', 1, { ibar: 10 }, 'anvil'),
    R_('vband', 1, { cbar: 4, mush: 3 }, 'anvil'), R_('coin', 1, { gbar: 4 }, 'anvil'), R_('echarm', 1, { hbar: 8, ember: 3 }, 'anvil'),
    R_('mightp', 1, { gel: 1, copper: 2 }, 'bench'), R_('eaglep', 1, { gel: 1, lens: 1 }, 'bench'), R_('arcanep', 1, { gel: 1, star: 1 }, 'bench'), R_('edgep', 1, { gel: 1, ibar: 1 }, 'bench'),
    R_('hastep', 1, { gel: 1, sand: 2 }, 'bench'), R_('stonep', 1, { gel: 1, stone: 5, iron: 1 }, 'bench'), R_('vigorp', 1, { gel: 1, mush: 2 }, 'bench'),
    R_('ffwand', 1, { wood: 10, gel: 8, torch: 5 }, 'bench'), R_('wispwand', 1, { sbar: 10, lens: 3 }, 'anvil'), R_('fangstaff', 1, { shbar: 12, bone: 10 }, 'anvil'), R_('spritestaff', 1, { hbar: 12, ember: 4 }, 'anvil'),
    R_('collar', 1, { bone: 15, gel: 10 }, 'anvil'), R_('sigil', 1, { sbar: 6, star: 2 }, 'anvil'), R_('cemb', 1, { shbar: 8, gel: 10 }, 'anvil'), R_('bell', 1, { hbar: 6, essence: 2 }, 'anvil'), R_('pactp', 1, { gel: 1, bone: 2, mush: 1 }, 'bench'),
    R_('sparmor', 1, { mush: 6, gel: 10 }, 'bench'), R_('spiarmor', 1, { sbar: 12, star: 3 }, 'anvil'),
    R_('wararmor', 1, { hbar: 16, essence: 4 }, 'anvil'), R_('dearmor', 1, { hbar: 16, essence: 4 }, 'anvil'), R_('amarmor', 1, { hbar: 16, essence: 4 }, 'anvil'), R_('pharmor', 1, { hbar: 16, essence: 4 }, 'anvil'), R_('ovarmor', 1, { hbar: 16, essence: 4 }, 'anvil'),
    R_('pactp', 5, { silk: 2, gel: 2 }, 'bench'),
    R_('bucket', 1, { ibar: 3 }, 'anvil'),
    R_('mana', 1, { star: 5 }), R_('starstaff', 1, { star: 8, gbar: 6 }, 'anvil'),
    R_('crown', 1, { gel: 30, cbar: 5 }, 'bench'), R_('eye', 1, { lens: 6, sbar: 5 }, 'anvil'), R_('totem', 1, { bone: 25, sbar: 4 }, 'anvil'), R_('horn', 1, { hbar: 10, ember: 5 }, 'anvil'),
  ];
  for (let i = RECIPES.length - 1; i >= 0; i--) { const r = RECIPES[i], it = IT[r[0]]; if (it && it.slot === 'body') { const S = SETS[it.set], sc = f => Object.fromEntries(Object.entries(r[2]).map(([k, n]) => [k, Math.max(1, Math.round(n * f))])); RECIPES.splice(i + 1, 0, R_(S.pieces[0], 1, sc(.6), r[3]), R_(S.pieces[2], 1, sc(.8), r[3])); } }
  const PET_IT = { mosspup: { n: 'Moss Pup', pet: 'mosspup', one: 1, r: 2, c: '#4caa2a' }, pebbler: { n: 'Pebbler', pet: 'pebbler', one: 1, r: 2, c: '#8a8a94' }, wobble: { n: 'Wobble', pet: 'wobble', one: 1, r: 3, c: '#5ad8a0' },
    emberkit: { n: 'Ember Kit', pet: 'emberkit', one: 1, r: 3, c: '#e8702a' }, glowmoth: { n: 'Glowmoth', pet: 'glowmoth', one: 1, r: 2, c: '#7af0ff' }, frostling: { n: 'Frostling', pet: 'frostling', one: 1, r: 2, c: '#bff4ff' } };
  Object.assign(IT, PET_IT);
  const CHEST_LOOT = [['gustjar', 'boom', 'spark', 'potion', 'hook', 'flint', 'knife', 'bucket', 'farrow', 'mana', 'torch', 'ibar', 'shot', 'arrow'], ['eboom', 'missile', 'water', 'trident', 'esword', 'gbar', 'potion', 'life', 'shot', 'farrow']];
  const BOSSES = { colossus: { n: 'The Rime Colossus', drop: ['avalanche', 'frostheart', 'ice'] }, gloom: { n: 'The Gloom Mother', drop: ['blightscythe', 'mawcharm', 'gloomscale'] }, sentinel: { n: 'The Prismatic Sentinel', drop: ['prismblade', 'lightcharm', 'lumenshard'] }, tyrant: { n: 'The Eclipse Tyrant', drop: ['tyrantblade', 'voidbow', 'smbar'] }, weaver: { n: 'The Weaver Queen', drop: ['broodstaff', 'weaverfang', 'silk'] }, king: { n: 'The Gel Sovereign', drop: ['saber', 'slimegun', 'gel'] }, watcher: { n: 'The Watcher', drop: ['gaze', 'shbar', 'lens'] }, bone: { n: 'Bone Lord', drop: ['skull', 'shbar', 'bone'] }, ember: { n: 'Ember Lord', drop: ['starfall', 'eclipse', 'hbar'] } };

  let tiles, walls, surf, chests, light, lw, lh, lx0, ly0, P, ch, sel, cam = { x: 0, y: 0 }, time, ents = [], drops = [], projs = [], mine, invOpen, hover, msg, boss, won, dead, keys = {}, saveT = 0, botS = { t: 0 }, tex = {}, score, touch = false, demo = false;
  try { document.fonts.load('16px Tiny5', '0123456789'); document.fonts.load('16px "Pixelify Sans"', 'Ab'); } catch (e) {}
  let dfc = 1;   // world difficulty: 0 Gentle, 1 Classic (old saves), 2 Veteran, 3 Mythic
  const DIFF = [
    { n: 'Gentle', c: '#7ae0a0', hp: .6, dmg: .5, boss: .65, coin: .8, spawn: .75, loot: 0, resp: 2, d: 'Softer foes and short respawns. Good for building and exploring.' },
    { n: 'Classic', c: '#9fc8ff', hp: 1, dmg: 1, boss: 1, coin: 1, spawn: 1, loot: 0, resp: 3, d: 'The balanced adventure.' },
    { n: 'Veteran', c: '#ffb84a', hp: 1.7, dmg: 1.5, boss: 1.6, coin: 1.8, spawn: 1.25, loot: .25, resp: 4, d: 'Tougher, hungrier foes. More coins and a chance of double loot.' },
    { n: 'Mythic', c: '#ff5a7a', hp: 2.4, dmg: 2.1, boss: 2.2, coin: 2.6, spawn: 1.5, loot: .5, resp: 6, d: 'Brutal. Foes hit hard and swarm. Rich rewards for the brave.' }];
  const DFX = () => DIFF[dfc] || DIFF[1];
  const CMODE = [
    { n: 'Wanderer', c: '#9fc8ff', d: 'Lose nothing when you fall.' },
    { n: 'Seeker', c: '#ffd36a', d: 'Drop half your coins when you fall. Go get them back!' },
    { n: 'Ironheart', c: '#ff5a7a', d: 'One life. If you fall, this character is gone for good.' }];
  const cmOf = c => CMODE[(c && c.cm) | 0] || CMODE[0];
  let hard = 0, radiant = null, spreadT = 0, hearts = 0;   // Hardmode, the Radiance, and the clock for creeping biomes
  let frost = null, blight = null, glowc = [], isles = [], zone = {}, zoneT = 0, flakes = [];   // the new biomes, and which one you are in
  let npcs = [], npcGone = {}, npcT = 0, npcId = 1, talk = null, shopK = null, dlgBtns = [], dlgBox = null;   // townsfolk, who you are talking to, and whose shop is open
  let mode = 'menu', wslot = -1, net = null, others = new Map(), sendT = 0, eSendT = 0, recv = null, eid = 1, downed = {}, pops = [];
  const R = Math.random, rnd = (a, b) => a + R() * (b - a), clamp = (v, a, b) => v < a ? a : v > b ? b : v, pick = a => a[Math.floor(R() * a.length)];
  const at = (x, y) => x < 0 || y < 0 || x >= WW || y >= WH ? T.STONE : tiles[y * WW + x];
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < WW && y < WH) tiles[y * WW + x] = v; };
  const solid = (x, y) => SOLID.has(at(Math.floor(x), Math.floor(y)));
  const online = () => !demo && typeof MP !== 'undefined' && MP.online() && !!net;
  const isHost = () => online() ? MP.isHost() : !(net && wslot < 0 && typeof MP !== 'undefined' && MP.rejoining && (MP.rejoining() || MP.waitingForOwner()));

  /* ---------- the world ---------- */
  function noise1() { const p = Array.from({ length: 64 }, () => R()); return x => { const i = Math.floor(x), f = x - i, a = p[(i % 64 + 64) % 64], b = p[((i + 1) % 64 + 64) % 64], s = f * f * (3 - 2 * f); return a + (b - a) * s; }; }
  let liq = null, lqk = null, lqTick = 0, lqAcc = 0;
  const LQ = { 1: { n: 'Water', rgb: [40, 110, 220], a: .6, every: 1 }, 2: { n: 'Lava', rgb: [255, 110, 30], a: .92, every: 3 }, 3: { n: 'Honey', rgb: [232, 168, 40], a: .8, every: 5 } };
  const lqAt = (x, y) => { x = Math.floor(x); y = Math.floor(y); if (!liq || x < 0 || y < 0 || x >= WW || y >= WH) return 0; const i = y * WW + x; return liq[i] ? lqk[i] : 0; };
  function lqMix(i, j) {   // lava meeting water or honey cools into obsidian
    const lv = lqk[i] === 2 ? i : lqk[j] === 2 ? j : -1; if (lv < 0) return false;
    liq[lv] = 0; lqk[lv] = 0; set(lv % WW, (lv / WW) | 0, T.OBSID); if (R() < .3) K.sfx(160, .12, 'sawtooth', .03, -80); return true;
  }
  function stepLiquids() {
    if (!liq || liq.length !== WW * WH) return; lqTick++; const done = new Set();
    const open = c => tiles[c] === T.AIR || tiles[c] === T.PLAT, supp = (c, k) => !open(c + WW) || (liq[c + WW] === 8 && lqk[c + WW] === k);
    for (const p of allPlayers()) { const key = Math.floor(p.x / 20) + ',' + Math.floor(p.y / 20); if (done.has(key)) continue; done.add(key);
      const x0 = Math.max(1, Math.floor(p.x) - 72), x1 = Math.min(WW - 2, Math.floor(p.x) + 72), y0 = Math.max(0, Math.floor(p.y) - 48), y1 = Math.min(WH - 2, Math.floor(p.y) + 48);
      for (let y = y1; y >= y0; y--) { const row = y * WW;
        // 1) falling: liquid drops into the open cell below
        for (let x = x0; x <= x1; x++) { const i = row + x; let a = liq[i]; if (!a) continue; const k = lqk[i]; if (lqTick % LQ[k].every) continue;
          if (!open(i)) { liq[i] = 0; lqk[i] = 0; continue; }   // a block was placed in the liquid
          const j = i + WW; if (!open(j)) continue;
          if (liq[j] && lqk[j] !== k) { lqMix(i, j); continue; }
          const m = Math.min(a, 8 - liq[j]); if (m > 0) { liq[j] += m; lqk[j] = k; liq[i] = a - m; if (!liq[i]) lqk[i] = 0; } }
        // 2) levelling: each resting run of liquid shares its amount evenly and creeps one cell outward
        for (let x = x0; x <= x1;) { const i = row + x; if (!liq[i] || !supp(i, lqk[i]) || lqTick % LQ[lqk[i]].every) { x++; continue; } const k = lqk[i];
          let e = x; while (e + 1 <= x1 && liq[row + e + 1] && lqk[row + e + 1] === k && supp(row + e + 1, k)) e++;
          let mixed = false; for (const c of [row + x - 1, row + e + 1]) if (open(c) && liq[c] && lqk[c] !== k) { if (lqMix(row + x, c) || lqMix(c, row + x)) mixed = true; }
          if (mixed) { x = e + 1; continue; }
          let tot = 0; for (let c = x; c <= e; c++) tot += liq[row + c];
          let S = x, E = e; const lc = row + x - 1, rc = row + e + 1;
          if (open(lc) && !liq[lc] && tot >= E - S + 2) S = x - 1; if (open(rc) && !liq[rc] && tot >= E - S + 2) E = e + 1;
          const len = E - S + 1, base = Math.floor(tot / len), rem = tot - base * len, off = lqTick % len;
          for (let c = S; c <= E; c++) { const v = base + (((c - S + off) % len) < rem ? 1 : 0), ci = row + c; liq[ci] = v; lqk[ci] = v ? k : 0; }
          x = E + 1; } } }
  }
  // world liquids: the oceans, plus pools in cave basins (water up top, lava deep down and in the Underworld, honey in the jungle)
  function liquidsGen() {
    liq = new Uint8Array(WW * WH); lqk = new Uint8Array(WW * WH);
    for (let i = 0; i < tiles.length; i++) if (tiles[i] === T.WATER) { tiles[i] = T.AIR; liq[i] = 8; lqk[i] = 1; }
    const busy = (x, y) => temple && x >= temple.x0 - 3 && x <= temple.x1 + 3 && y >= temple.y0 - 3 && y <= (temple.arena ? temple.arena.y1 : temple.y1) + 3;
    const pool = (k, n, ymin, ymax, maxw, depth, xa, xb) => { for (let c = 0, tries = 0; c < n && tries < n * 80; tries++) { const x = Math.floor(rnd(xa, xb)), y = Math.floor(rnd(ymin, ymax)); if (at(x, y) !== T.AIR || !SOLID.has(at(x, y + 1)) || liq[y * WW + x] || busy(x, y)) continue;
        let l = x, r = x; while (r - l < maxw && at(l - 1, y) === T.AIR && SOLID.has(at(l - 1, y + 1))) l--; while (r - l < maxw && at(r + 1, y) === T.AIR && SOLID.has(at(r + 1, y + 1))) r++;
        if (!SOLID.has(at(l - 1, y)) || !SOLID.has(at(r + 1, y)) || r - l < 2) continue;
        for (let yy = y; yy > y - depth; yy--) { for (let xx = l; xx <= r; xx++) if (at(xx, yy) === T.AIR) { liq[yy * WW + xx] = 8; lqk[yy * WW + xx] = k; } if (!SOLID.has(at(l - 1, yy - 1)) || !SOLID.has(at(r + 1, yy - 1))) break; }
        c++; } };
    const sc = WW / 520, xa = (ocean || 10) + 10, xb = WW - (ocean || 10) - 10;
    pool(1, Math.round(28 * sc), 60, 150, 16, 3, xa, xb); pool(2, Math.round(14 * sc), 152, HELL - 4, 14, 2, xa, xb); pool(2, Math.round(22 * sc), HELL + 2, WH - 4, 26, 3, xa, xb);
    if (jungle) pool(3, Math.max(3, Math.round(5 * sc)), 50, HELL - 30, 10, 3, jungle.x0 + 2, jungle.x1 - 2);
  }
  let jungle = null, temple = null, traps = [], ocean = 0, explored = null, arenaWas = false;
  const inArena = p => temple && temple.arena && p.x > temple.arena.x0 && p.x < temple.arena.x1 && p.y > temple.arena.y0 && p.y < temple.arena.y1 + 1;
  const inJungle = x => jungle && x >= jungle.x0 && x < jungle.x1, inTemple = p => temple && p.x > temple.x0 && p.x < temple.x1 && p.y > temple.y0 && p.y < temple.y1 + 1;
  function findTraps() { traps = []; if (!temple) return; for (let x = temple.x0; x <= temple.x1; x++) for (let y = temple.y0; y <= temple.y1; y++) if (at(x, y) === T.DTRAP) traps.push({ x, y, d: at(x + 1, y) === T.AIR ? 1 : -1, cd: R() }); }
  function gen() { setDepth(315); gen0(); if (blight) for (let x = Math.max(1, blight.x0 - 14); x < Math.min(WW - 1, blight.x1 + 14); x++) { let y = surf[x]; { let c = 0; while (c < 3 && SOLID.has(at(x, y + c))) c++; if (c && c <= 2 && at(x, y + c) === T.AIR && at(x, y + c + 1) === T.AIR && at(x, y + c + 2) === T.AIR && at(x, y + c + 3) === T.AIR) for (let k = 0; k < c; k++) set(x, y + k, T.AIR); } if (SOLID.has(at(x, y)) || !(at(x, y + 1) === T.AIR && at(x, y + 2) === T.AIR)) continue; while (y < HELL - 2 && !SOLID.has(at(x, y))) y++; for (let yy = surf[x]; yy < y; yy++) if (!PW(walls[yy * WW + x])) walls[yy * WW + x] = 0; surf[x] = y; } }
  function gen0() {
    tiles = new Uint8Array(WW * WH); walls = new Uint8Array(WW * WH); surf = new Int16Array(WW); chests = {}; hard = 0; radiant = null; brokenDeco = new Set(); npcs = []; npcGone = {}; npcT = 0; explored = new Uint8Array(WW * WH); const isDes = new Uint8Array(WW);
    const n1 = noise1(), n2 = noise1(), n3 = noise1();
    for (let x = 0; x < WW; x++) surf[x] = Math.round(58 + (n1(x / 34) - .5) * 22 + (n2(x / 11) - .5) * 7 + (n3(x / 90) - .5) * 26);
    { const n4 = noise1(), far = x => Math.min(1, Math.max(0, (Math.abs(x - WW / 2) - 30) / 40)), F = new Float32Array(WW);
      for (let i = 0; i < Math.max(2, Math.round(WW / 520 * 2.4)); i++) { const c = rnd(60, WW - 60), w = rnd(16, 34), h = rnd(12, 24) * (R() < .3 ? -.6 : 1), jag = rnd(.6, 1.2);   // a mountain, or now and then a valley
        for (let x = Math.max(0, Math.floor(c - w * 3)); x < Math.min(WW, c + w * 3); x++) { const t = (x - c) / w; F[x] -= h * Math.exp(-t * t) * (1 + (n4(x / 4) - .5) * jag * .6) * (h > 0 ? 1 : 1); } }
      for (let i = 0; i < Math.round(WW / 520 * 5); i++) { const c = Math.floor(rnd(40, WW - 40)), w = Math.floor(rnd(8, 22)), d = (R() < .5 ? -1 : 1) * Math.floor(rnd(3, 6));   // ledges: a sudden step up or down
        for (let x = c; x < Math.min(WW, c + w); x++) F[x] += d; }
      for (let x = 0; x < WW; x++) surf[x] = clamp(Math.round(surf[x] + F[x] * far(x)), 34, 84); }
    const DES = new Uint8Array(WW); for (let x = 0; x < WW; x++) DES[x] = n3(x / 62) > .6 && Math.abs(x - WW / 2) > 40 ? 1 : 0;
    { let n = 0; for (let x = 0; x < WW; x++) n += DES[x]; if (n < WW * .14) { const w = Math.round(WW * .11), c = Math.round(WW / 2 + (R() < .5 ? -1 : 1) * WW * .13); for (let x = c - (w >> 1); x < c + (w >> 1); x++) DES[x] = 1; } }   // every world gets at least one big desert
    for (let x = 0; x < WW; x++) {
      const top = surf[x], dd = 6 + Math.round(n2(x / 7) * 7), desert = DES[x]; isDes[x] = desert ? 1 : 0;
      for (let y = top; y < WH; y++) {
        let v = y < top + dd ? (desert ? T.SAND : T.DIRT) : T.STONE; if (y === top && v === T.DIRT) v = T.GRASS;
        if (y > top + dd && y < DY(120) && R() < .025) v = T.DIRT;
        if (y >= HELL - 2 + Math.round(n1(x / 9) * 4)) v = T.ASH;
        tiles[y * WW + x] = v; if (y > top + 1) walls[y * WW + x] = y < top + dd + 3 ? 1 : y >= HELL ? 3 : 2;
      }
    }
    for (let i = 0; i < Math.round(60 * WW / 520 * DK); i++) {
      let x = rnd(10, WW - 10), y = rnd(surf[Math.floor(x)] + 8, HELL - 8), a = rnd(0, 6.28); const len = rnd(40, 170);
      for (let k = 0; k < len; k++) { a += rnd(-.35, .35); x += Math.cos(a); y += Math.sin(a) * .6 + .08; const r = 1.2 + (y / WH) * 2.6 + Math.sin(k * .2) * .6; for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) if (dx * dx + dy * dy <= r * r) { const tx = Math.floor(x + dx), ty = Math.floor(y + dy); if (ty > surf[clamp(tx, 0, WW - 1)] + 4 && ty < HELL - 1) set(tx, ty, T.AIR); } }
    }
    for (let x = 0; x < WW; x++) for (let y = HELL + 3; y < WH - 6; y++) { const k = Math.sin(x * .07) * 3 + Math.sin(x * .19) * 2; if (y > HELL + 6 + k && y < WH - 9 - k * .5) set(x, y, T.AIR); }
    for (let i = 0; i < Math.max(3, Math.round(6 * WW / 520)); i++) { let x = rnd(30, WW - 30); while (Math.abs(x - WW / 2) < 24) x = rnd(30, WW - 30); let y = surf[Math.floor(x)] - 1, a = Math.PI / 2 + rnd(-.7, .7), r = 1.6;
      const L = 55 + rnd(0, 50); for (let k = 0; k < L; k++) { a += rnd(-.45, .45); a = clamp(a, .35, Math.PI - .35); if (k % 17 === 9) a = R() < .5 ? .3 : Math.PI - .3;   // every so often it turns sideways for a while
        x += Math.cos(a) * .9; y += Math.sin(a) * .8; r += rnd(-.25, .25); r = clamp(r, 1.2, 2.8); const pocket = k % 23 === 15 ? 3.8 : 0, rr = Math.max(r, pocket);
        for (let dx = -4; dx <= 4; dx++) for (let dy = -4; dy <= 4; dy++) if (dx * dx + dy * dy * 1.3 <= rr * rr) { const tx = Math.floor(x + dx), ty = Math.floor(y + dy); if (ty < HELL - 4) set(tx, ty, T.AIR); } } }
    for (let i = 0; i < Math.round(14 * WW / 520 * DK); i++) { const cx = rnd(20, WW - 20), cy = rnd(surf[Math.floor(cx)] + 25, HELL - 20), W0 = rnd(6, 14), H0 = rnd(4, 8);   // open caverns with lumpy walls
      for (let k = 0; k < 9; k++) { const ox = cx + rnd(-W0, W0), oy = cy + rnd(-H0, H0) * .7, rx = rnd(3, W0 * .7), ry = rnd(2, H0 * .7);
        for (let x = Math.floor(ox - rx); x <= ox + rx; x++) for (let y = Math.floor(oy - ry); y <= oy + ry; y++) { const t = ((x - ox) / rx) ** 2 + ((y - oy) / ry) ** 2; if (t <= 1 && y > surf[clamp(x, 0, WW - 1)] + 8 && y < HELL - 3) set(x, y, T.AIR); } } }
    const blob = (t, n, dmin, dmax, r, onto = [T.STONE, T.DIRT]) => { for (let i = 0; i < n * WW / 520 * DK; i++) { const x = Math.floor(rnd(2, WW - 2)), y = Math.floor(rnd(Math.max(surf[x] + dmin, 0), dmax)); for (let k = 0; k < r * 3; k++) { const tx = x + Math.round(rnd(-r, r)), ty = y + Math.round(rnd(-r, r)); if (onto.includes(at(tx, ty))) set(tx, ty, t); } } };
    // oceans: the world dips into deep water at both edges, with sandy beaches and a sandy sea floor
    const OW = Math.max(30, Math.round(WW * .06)); ocean = OW;
    for (const sd of [-1, 1]) { const shore = sd < 0 ? OW : WW - 1 - OW, sea = surf[shore] + 2;
      for (let k = 0; k < 10; k++) { const x = shore - sd * k, tgt = Math.round(sea - 1 + (surf[x] - (sea - 1)) * (k / 10)); for (let y = 0; y < tgt; y++) { set(x, y, T.AIR); walls[y * WW + x] = 0; } for (let y = tgt; y < tgt + 5; y++) set(x, y, T.SAND); surf[x] = tgt; }
      for (let i = 0; i < OW; i++) { const x = sd < 0 ? i : WW - 1 - i, f = (OW - i) / OW, floorY = sea + Math.round(4 + 28 * Math.pow(f, .7));
        for (let y = 0; y < floorY + 8; y++) { set(x, y, y < sea ? T.AIR : y < floorY ? T.WATER : T.SAND); walls[y * WW + x] = 0; } surf[x] = sea; } }
    jungle = null; temple = null; { const jw = Math.max(50, Math.round(WW * .15)), side = R() < .5 ? -1 : 1, jc = Math.round(WW / 2 + side * WW * .28), jx0 = clamp(jc - Math.round(jw / 2), OW + 14, WW - jw - OW - 14), jx1 = jx0 + jw;
      jungle = { x0: jx0, x1: jx1 };
      for (let x = jx0; x < jx1; x++) { const top = surf[x]; for (let y = top; y < Math.min(top + 30, WH); y++) { const t = at(x, y); if (t === T.DIRT || t === T.GRASS || t === T.SAND || (t === T.STONE && y < top + 14)) set(x, y, y === top ? T.JGRASS : T.MUD); } }
      // the temple: a brick vault under the middle of the jungle
      const tc = Math.round((jx0 + jx1) / 2), tw = 46, th = 26, tx0 = tc - tw / 2, tx1 = tc + tw / 2; let ms = 0; for (let x = tx0; x <= tx1; x++) ms = Math.max(ms, surf[x]); const ty0 = Math.min(ms + 46, HELL - 82), ty1 = ty0 + th;
      temple = { x0: tx0, y0: ty0, x1: tx1, y1: ty1 };
      for (let x = tx0; x <= tx1; x++) for (let y = ty0; y <= ty1; y++) { const edge = x < tx0 + 2 || x > tx1 - 2 || y < ty0 + 2 || y > ty1 - 2; set(x, y, edge ? T.TBRICK : T.AIR); walls[y * WW + x] = 5; }
      const mid = ty0 + 13; for (let x = tx0 + 2; x <= tx1 - 2; x++) if (!(x > tc - 3 && x < tc + 3) && !(x > tx0 + 6 && x < tx0 + 10) && !(x > tx1 - 10 && x < tx1 - 6)) set(x, mid, T.TBRICK);   // a middle floor with three gaps to drop through
      for (const [x, y, d] of [[tx0 + 2, ty0 + 6, 1], [tx1 - 2, ty0 + 9, -1], [tx0 + 2, mid + 5, 1], [tx1 - 2, mid + 8, -1], [tx0 + 2, mid + 10, 1], [tx1 - 2, ty0 + 4, -1]]) set(x, y, T.DTRAP);
      for (const [a, b, y] of [[tx0 + 12, tx0 + 17, mid - 1], [tx1 - 18, tx1 - 13, mid - 1], [tc + 5, tc + 10, ty1 - 3], [tc - 10, tc - 5, ty1 - 3]]) for (let x = a; x <= b; x++) set(x, y, T.SPIKE);
      for (const [x, y] of [[tx0 + 4, mid - 1], [tx1 - 4, mid - 1], [tc, ty1 - 3], [tx0 + 4, ty1 - 3], [tx1 - 4, ty1 - 3]]) { set(x, y, T.GCHEST); const L = ['wemb', 'remb', 'semb', 'temb', 'cemb', 'bell', 'spritestaff', 'fangstaff', 'sunblade', 'sunstaff', 'vinebow', 'thorns'], items = [[pick(L), 1]];
        for (let i = 0; i < 2 + Math.floor(R() * 3); i++) { const e = pick([['gbar', 6], ['potion', 3], ['lpotion', 5], ['mightp', 1], ['eaglep', 1], ['arcanep', 1], ['edgep', 1], ['pactp', 1], ['life', 1], ['mana', 1], ['shot', 60], ['farrow', 40]]); items.push([e[0], e[1] + (IT[e[0]].one ? 0 : Math.floor(R() * e[1]))]); }
        chests[x + ',' + y] = items; }
      // the Weaver Queen's arena: a sealed brick hall under the temple, reached by a shaft from the temple's lower floor
      { const ax0 = tc - 32, ax1 = tc + 32, ay0 = ty1 + 3, ay1 = ay0 + 22;
        for (let x = ax0; x <= ax1; x++) for (let y = ay0; y <= ay1; y++) { const edge = x < ax0 + 3 || x > ax1 - 3 || y < ay0 + 3 || y > ay1 - 3; set(x, y, edge ? T.TBRICK : T.AIR); walls[y * WW + x] = 5; }
        for (const [a, b] of [[ax0 + 8, ax0 + 17], [ax1 - 17, ax1 - 8]]) for (let x = a; x <= b; x++) set(x, ay0 + 12, T.TBRICK);
        for (let i = 0; i < 40; i++) { const x = Math.floor(rnd(ax0 + 3, ax1 - 2)), y = Math.floor(rnd(ay0 + 3, ay0 + 8)); if (at(x, y) === T.AIR) set(x, y, T.COBWEB); }
        for (let x = tc - 14; x <= tc - 13; x++) for (let y = ty1 - 2; y <= ay0 + 3; y++) { set(x, y, T.AIR); walls[y * WW + x] = 5; }
        for (let x = ax0 + 5; x <= ax1 - 5; x += 8) set(x, ay1 - 3, T.TORCH); for (const x of [ax0 + 10, ax0 + 15, ax1 - 15, ax1 - 10]) set(x, ay0 + 11, T.TORCH);
        temple.arena = { x0: ax0, y0: ay0, x1: ax1, y1: ay1 }; }
      // the only way in: a giant living-wood trunk that runs from high above the jungle down into the temple roof
      for (let x = tc - 2; x <= tc + 1; x++) for (let y = surf[x] - 26; y <= surf[x] + 2; y++) set(x, y, T.LWOOD);
      // the jungle underground is mud all the way down to the temple, with mossy jungle caves winding toward its two doors
      for (let x = jx0; x < jx1; x++) for (let y = surf[x] + 1; y < ty1 + 30; y++) { const t = at(x, y); if ((t === T.STONE || t === T.DIRT || t === T.SAND) && R() < .9) set(x, y, T.MUD); if (walls[y * WW + x] && walls[y * WW + x] !== 5) walls[y * WW + x] = 7; }
      const carve = (x, y, r) => { for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) if (dx * dx + dy * dy <= r * r) { const tx = Math.floor(x + dx), ty = Math.floor(y + dy); if (tx < jx0 || tx >= jx1 || ty <= surf[tx] - 1) continue; const t = at(tx, ty); if (t === T.TBRICK || t === T.DTRAP || t === T.SPIKE || t === T.GCHEST || (tx >= tx0 && tx <= tx1 && ty >= ty0 && ty <= ty1 + 25)) continue; set(tx, ty, T.AIR); walls[ty * WW + tx] = 7; } };
      const doors = [[tx0 - 3, ty1 - 3], [tx1 + 3, ty1 - 3]];
      for (const [k, [gx, gy]] of [[0, doors[0]], [1, doors[1]], [2, doors[0]], [3, doors[1]]]) { let x = k % 2 ? rnd(tx1 + 6, jx1 - 4) : rnd(jx0 + 4, tx0 - 6); if (k >= 2) x = k % 2 ? rnd(tc + 4, tx1 - 2) : rnd(tx0 + 2, tc - 4); let y = surf[Math.floor(x)] - 1;
        for (let s = 0; s < 900 && Math.hypot(gx - x, gy - y) > 1.2; s++) { const a = Math.atan2(gy - y, gx - x) + Math.sin(s * .13 + k) * .9; x += Math.cos(a) * .9; y += Math.sin(a) * .9; carve(x, y, 1.6 + Math.sin(s * .21) * .5 + (s % 37 < 6 ? 1.1 : 0)); } }
      for (let i = 0; i < 6; i++) { let x = rnd(jx0 + 4, jx1 - 4), y = rnd(surf[Math.floor(x)] + 10, ty1 + 20), a = rnd(0, 6.28); for (let s = 0; s < 70; s++) { a += rnd(-.4, .4); x += Math.cos(a); y += Math.sin(a) * .6; carve(x, y, 1.8); } }
      for (const [dx0, dx1] of [[tx0, tx0 + 1], [tx1 - 1, tx1]]) for (let x = dx0; x <= dx1; x++) for (let y = ty1 - 4; y <= ty1 - 2; y++) set(x, y, T.LWOOD);   // living-wood doors: chop through to get in
      for (let x = jx0; x < jx1; x++) for (let y = surf[x] + 3; y < ty1 + 28; y++) if (at(x, y) === T.MUD && at(x, y - 1) === T.AIR && walls[(y - 1) * WW + x] === 7) set(x, y, T.JGRASS);   // moss on the cave floors
      // more giant trees across the jungle: 3-wide trunks you have to chop through, with big canopies
      const canopy = (cx, cy, r) => { for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= Math.ceil(r / 2); dy++) if (dx * dx + dy * dy * 2 <= r * r && at(cx + dx, cy + dy) === T.AIR) set(cx + dx, cy + dy, T.LEAF); };
      canopy(tc, surf[tc] - 27, 7);
      for (let x = jx0 + 4; x < jx1 - 4; x += 9 + Math.floor(R() * 6)) { if (Math.abs(x - tc) < 7) continue; const h = 16 + Math.floor(R() * 12), base = surf[x];
        for (let dx = -1; dx <= 1; dx++) for (let y = base - h; y <= base + 2; y++) set(x + dx, y, T.LWOOD); canopy(x, base - h - 1, 5 + Math.floor(R() * 2)); }
    }
    // desert caves: sandstone under the dunes, wide flat caverns with loose sand floors
    { const desertCol = x => isDes[x] && x > OW + 10 && x < WW - OW - 10 && !inJungle(x);
      for (let x = 0; x < WW; x++) if (desertCol(x)) for (let y = surf[x] + 3; y < Math.min(HELL - 20, surf[x] + 60); y++) { const t = at(x, y); if (t === T.STONE || t === T.DIRT) set(x, y, T.SSTONE); if (walls[y * WW + x]) walls[y * WW + x] = 6; }
      for (let x = 0; x < WW;) { if (!desertCol(x)) { x++; continue; } let e = x; while (e < WW && desertCol(e)) e++;
        for (let c = 0; c < Math.max(1, Math.round((e - x) / 14)); c++) { let cx = rnd(x + 2, e - 2), cy = surf[Math.floor(cx)] + rnd(10, 45), dir = R() < .5 ? -1 : 1;
          for (let k = 0; k < (e - x) * 1.4; k++) { cx += dir * rnd(.6, 1.2); cy += rnd(-.35, .35); if (cx < x + 1 || cx > e - 2) dir = -dir; const rw = 3 + Math.sin(k * .15) * 1.5, rh = 1.6 + Math.sin(k * .23) * .6;
            for (let dx = -5; dx <= 5; dx++) for (let dy = -3; dy <= 3; dy++) if ((dx / rw) ** 2 + (dy / rh) ** 2 <= 1) { const tx = Math.floor(cx + dx), ty = Math.floor(cy + dy); if (ty > surf[tx] + 4 && at(tx, ty) === T.SSTONE) { set(tx, ty, T.AIR); walls[ty * WW + tx] = 6; } } } }
        for (let xx = x; xx < e; xx++) for (let y = surf[xx] + 4; y < surf[xx] + 62; y++) if (at(xx, y) === T.AIR && at(xx, y + 1) === T.SSTONE) set(xx, y + 1, T.SAND);
        x = e; } }
    blob(T.COPPER, 128, 6, DY(120), 2); blob(T.IRON, 96, 20, DY(150), 2); blob(T.SILVER, 72, Math.round(34 * DK), DY(165), 2); blob(T.GOLD, 56, Math.round(50 * DK), DY(180), 1.6); blob(T.SHADOW, 48, Math.round(85 * DK), HELL - 2, 1.6); blob(T.HELLSTONE, 112, HELL - 60, WH - 2, 2, [T.ASH]);
    { let cx = Math.floor(rnd(80, WW - 80)); for (let k = 0; k < 50 && jungle && cx > jungle.x0 - 25 && cx < jungle.x1 + 25; k++) cx = Math.floor(rnd(80, WW - 80)); const cy = Math.floor(rnd(DY(140), DY(160))); for (let x = cx - 18; x <= cx + 18; x++) for (let y = cy - 7; y <= cy + 7; y++) { const edge = Math.abs(x - cx) > 16 || Math.abs(y - cy) > 5; set(x, y, edge ? T.BRICK : T.AIR); walls[y * WW + x] = 4; }
      for (let x = cx - 14; x <= cx + 14; x += 3) set(x, cy + 5, T.BONE); for (const ex of [cx - 17, cx + 17]) { set(ex, cy + 3, T.AIR); set(ex, cy + 4, T.AIR); } placeChest(cx, cy + 6, 1); }
    // ---- new biomes
    { const OWb = ocean, J = jungle || { x0: -99, x1: -99 }, free = (a, b, taken) => a > OWb + 16 && b < WW - OWb - 16 && b < WW / 2 - 40 || a > OWb + 16 && b < WW - OWb - 16 && a > WW / 2 + 40 ? !taken.some(([c, d]) => a < d + 12 && b > c - 12) : false;
      const taken = [[J.x0, J.x1]], region = w => { for (let k = 0; k < 80; k++) { const a = Math.floor(rnd(OWb + 16, WW - OWb - 16 - w)); if (free(a, a + w, taken)) { taken.push([a, a + w]); return [a, a + w]; } } return null; };
      const wall0 = (x, y, v) => { const i = y * WW + x; if (walls[i] && walls[i] !== 5) walls[i] = v; };
      // the Frostmarch: snow on top, ice underground with winding ice caves, frozen chests and snowy pines
      const sn = region(Math.max(46, Math.round(WW * .11))); frost = sn ? { x0: sn[0], x1: sn[1] } : null;
      if (sn) { const [a, b] = sn;
        for (let x = a; x < b; x++) { for (let y = 0; y < surf[x]; y++) if (at(x, y) === T.LEAF) set(x, y, T.SLEAF); for (let y = surf[x]; y < Math.min(HELL - 30, surf[x] + 75); y++) { const t = at(x, y); if (t === T.GRASS || t === T.DIRT || t === T.SAND || t === T.SSTONE || t === T.MUD) set(x, y, y < surf[x] + 8 || R() < .25 ? T.SNOW : T.ICE); else if (t === T.STONE) set(x, y, R() < .8 ? T.ICE : T.SNOW); wall0(x, y, 20); } }
        for (let c = 0; c < Math.max(3, Math.round((b - a) / 14)); c++) { let x = rnd(a + 4, b - 4), y = surf[Math.floor(x)] + rnd(14, 55), ang = rnd(0, 6.28); for (let s = 0; s < 80; s++) { ang += rnd(-.3, .3); x = clamp(x + Math.cos(ang), a + 2, b - 3); y = clamp(y + Math.sin(ang) * .5, surf[Math.floor(x)] + 10, HELL - 34); for (let dx = -3; dx <= 3; dx++) for (let dy = -2; dy <= 2; dy++) if (dx * dx / 9 + dy * dy / 4 <= 1) { const tx = Math.floor(x + dx), ty = Math.floor(y + dy); if (at(tx, ty) === T.ICE || at(tx, ty) === T.SNOW) set(tx, ty, T.AIR); } } }
        let nch = 0; for (let k = 0; k < 600 && nch < Math.max(2, Math.round((b - a) / 25)); k++) { const x = Math.floor(rnd(a + 2, b - 2)), y = Math.floor(rnd(surf[x] + 12, Math.min(HELL - 30, surf[x] + 70))); if (at(x, y) === T.AIR && at(x + 1, y) === T.AIR && SOLID.has(at(x, y + 1))) { set(x, y, T.CHEST); chests[x + ',' + y] = [[pick(['frostblade', 'froststaff', 'frostgrip']), 1], ['potion', 2], ['scoin', 3 + Math.floor(R() * 8)], [pick(['torch', 'arrow', 'shot']), 15 + Math.floor(R() * 20)]]; if (R() < .15) chests[x + ',' + y].push(['frostling', 1]); nch++; } }
        for (let x = a + 3; x < b - 3; x += 6 + Math.floor(R() * 6)) { const base = surf[x]; if (at(x, base) !== T.SNOW || at(x, base - 1) !== T.AIR) continue; const h = 7 + Math.floor(R() * 6); for (let y = base - 1; y >= base - h; y--) set(x, y, T.TRUNK); for (let dy = 0; dy < h - 2; dy++) { const w = Math.floor(dy / 2.4) + 1, yy = base - h - 1 + dy; for (let dx = -w; dx <= w; dx++) if (dx && at(x + dx, yy) === T.AIR) set(x + dx, yy, T.SLEAF); } set(x, base - h - 1, T.SLEAF); } }
      // the Blight: purple grass over blightstone, with chasms dropping to Blight Hearts and shadow ore
      const bl = region(Math.max(40, Math.round(WW * .08))); blight = bl ? { x0: bl[0], x1: bl[1] } : null;
      if (bl) { const [a, b] = bl;
        for (let x = a; x < b; x++) for (let y = surf[x]; y < Math.min(HELL - 30, surf[x] + 60); y++) { const t = at(x, y); if (t === T.GRASS) set(x, y, T.BGRASS); else if ((t === T.STONE || t === T.SSTONE) || (t === T.DIRT && y > surf[x] + 5)) set(x, y, T.BSTONE); else if (t === T.SAND) set(x, y, T.BSTONE); wall0(x, y, 21); if (y < surf[x] && at(x, y) === T.LEAF) set(x, y, T.AIR); }
        for (let x = a; x < b; x++) for (let y = 0; y < surf[x]; y++) if (at(x, y) === T.TRUNK || at(x, y) === T.MUSH) set(x, y, T.AIR);
        const nc = Math.max(2, Math.round((b - a) / 14)); for (let c = 0; c < nc; c++) { let x = a + (c + .5) * (b - a) / nc; const deep = surf[Math.floor(x)] + 34 + Math.floor(R() * 20); let y = surf[Math.floor(x)] - 2;
          const y0c = y, drift = R() < .5 ? -1 : 1; for (; y < deep; y++) { const dd = y - y0c; x += Math.sin(dd * .13 + c * 2) * .55 + drift * .18 * (dd % 9 < 4 ? 1 : -.4); const w = Math.max(1.6, 6.5 - dd * .22) + Math.sin(dd * .5 + c) * .9 + (dd % 11 === 6 ? 1.6 : 0); for (let dx = -12; dx <= 12; dx++) { const tx = Math.floor(x + dx), jag = ((tx * 7 + y * 13) % 5) * .2; if (Math.abs(dx) <= w + jag - .5) { set(tx, y, T.AIR); } else if (Math.abs(dx) <= w + 2 && SOLID.has(at(tx, y))) set(tx, y, T.BSTONE); if (y > surf[clamp(tx, 0, WW - 1)] + 1) wall0(tx, y, 21); } }
          for (let dx = -6; dx <= 6; dx++) for (let dy = -4; dy <= 3; dy++) if (dx * dx / 36 + dy * dy / 16 <= 1) { const tx = Math.floor(x + dx), ty = y + dy; set(tx, ty, T.AIR); walls[ty * WW + tx] = 21; }
          for (let dx = -8; dx <= 8; dx++) for (let dy = -6; dy <= 6; dy++) { const tx = Math.floor(x + dx), ty = y + dy; if (at(tx, ty) === T.STONE || at(tx, ty) === T.DIRT) set(tx, ty, T.BSTONE); if (at(tx, ty) === T.BSTONE && R() < .14) set(tx, ty, T.SHADOW); }
          set(Math.floor(x), y + 3, T.BSTONE); set(Math.floor(x), y + 2, T.BHEART); } }
      // Glowcap Caverns: big glowing-mushroom caves deep in the cavern layer
      glowc = []; for (let c = 0, tries = 0; c < Math.max(2, Math.round(WW / 520 * 2)) && tries < 200; tries++) { const cx = Math.floor(rnd(OWb + 30, WW - OWb - 30)), cy = Math.floor(rnd(DY(95), Math.min(DY(150), HELL - 34))); if (cx > J.x0 - 30 && cx < J.x1 + 30) continue; if (glowc.some(q => Math.abs(q.x - cx) < 60)) continue; if (temple && cx > temple.x0 - 40 && cx < temple.x1 + 40) continue; glowc.push({ x: cx, y: cy }); c++;
        const rx = 18 + Math.floor(R() * 8), ry = 8 + Math.floor(R() * 3);
        for (let dx = -rx - 4; dx <= rx + 4; dx++) for (let dy = -ry - 4; dy <= ry + 4; dy++) { const tx = cx + dx, ty = cy + dy, q = dx * dx / (rx * rx) + dy * dy / (ry * ry) + Math.sin(dx * .4) * .08; if (tx < 2 || tx >= WW - 2 || ty < 2 || ty >= HELL) continue; if (q <= 1) set(tx, ty, T.AIR); else if (q <= 1.6 && SOLID.has(at(tx, ty))) set(tx, ty, T.MUD); if (q <= 1.6) walls[ty * WW + tx] = 22; }
        for (let dx = -rx - 4; dx <= rx + 4; dx++) for (let dy = -ry - 4; dy <= ry + 4; dy++) { const tx = cx + dx, ty = cy + dy; if (at(tx, ty) === T.MUD && (at(tx, ty - 1) === T.AIR || at(tx, ty + 1) === T.AIR)) set(tx, ty, T.GMOSS); }
        for (let dx = -rx; dx <= rx; dx++) { const tx = cx + dx; for (let ty = cy - ry; ty <= cy + ry + 3; ty++) if (at(tx, ty) === T.AIR && at(tx, ty + 1) === T.GMOSS) { if (R() < .35) set(tx, ty, T.GLOWCAP); break; } }
        for (let m = 0; m < 3 + Math.floor(R() * 3); m++) { const tx = cx + Math.floor(rnd(-rx + 4, rx - 4)); let ty = cy; while (ty < cy + ry + 3 && at(tx, ty + 1) !== T.GMOSS) ty++; if (at(tx, ty + 1) !== T.GMOSS) continue; const h = 4 + Math.floor(R() * 4), w = 2 + Math.floor(R() * 2);
          for (let y = ty; y > ty - h; y--) if (at(tx, y) === T.AIR || at(tx, y) === T.GLOWCAP) set(tx, y, T.STALK); for (let dx = -w; dx <= w; dx++) { if (at(tx + dx, ty - h) === T.AIR) set(tx + dx, ty - h, T.CAPBLK); if (Math.abs(dx) < w && at(tx + dx, ty - h - 1) === T.AIR) set(tx + dx, ty - h - 1, T.CAPBLK); } } }
      // Sky Islands: clouds with a grassy top and a little gold-brick shrine holding a chest
      isles = []; for (let c = 0, tries = 0; c < Math.max(2, Math.round(WW / 520 * 1.5)) && tries < 200; tries++) { const cx = Math.floor(rnd(OWb + 40, WW - OWb - 40)), cy = Math.floor(rnd(14, 22)); if (Math.abs(cx - WW / 2) < 30 || isles.some(q => Math.abs(q.x - cx) < 70)) continue; let low = 99; for (let dx = -16; dx <= 16; dx++) low = Math.min(low, surf[cx + dx]); if (low - cy < 26) continue; isles.push({ x: cx, y: cy }); c++;
        const rx = 13 + Math.floor(R() * 5); for (let dx = -rx; dx <= rx; dx++) { const d = Math.round(Math.sqrt(1 - (dx / rx) ** 2) * 6), x = cx + dx; for (let dy = 0; dy <= d; dy++) set(x, cy + dy, dy < 2 && Math.abs(dx) < rx - 2 ? (dy === 0 ? T.GRASS : T.DIRT) : T.CLOUD); }
        for (let dx = -4; dx <= 4; dx++) { set(cx + dx, cy - 6, T.GBRICK); for (let dy = 1; dy <= 5; dy++) walls[(cy - dy) * WW + cx + dx] = 12; } for (let dy = 2; dy <= 5; dy++) { set(cx - 4, cy - dy, T.GBRICK); set(cx + 4, cy - dy, T.GBRICK); } for (let dx = -2; dx <= 2; dx++) set(cx + dx, cy - 7, T.GBRICK);
        set(cx, cy - 1, T.GCHEST); chests[cx + ',' + (cy - 1)] = [[pick(['sunfeather', 'gustjar', 'starstaff', 'falcon', 'eboom']), 1], ['gbar', 2 + Math.floor(R() * 3)], ['scoin', 10 + Math.floor(R() * 20)], ['star', 2]]; set(cx - 2, cy - 4, T.TORCH); set(cx + 2, cy - 4, T.TORCH); } }
    for (let i = 0, n = 0; i < 6000 && n < Math.round(5 * WW / 520 * DK); i++) { const x = Math.floor(rnd(5, WW - 5)), y = Math.floor(rnd(surf[x] + 30, HELL - 4)); if (at(x, y) === T.AIR && SOLID.has(at(x, y + 1))) { set(x, y, T.CRYSTAL); n++; } }
    for (let i = 0, n = 0; i < 8000 && n < Math.round(34 * WW / 520 * DK); i++) { const x = Math.floor(rnd(5, WW - 5)), y = Math.floor(rnd(surf[x] + 12, HELL - 4)); if (at(x, y) === T.AIR && SOLID.has(at(x, y + 1))) { placeChest(x, y + 1, y > DY(110) && R() < .55 * (.35 + .65 * clamp((y - surf[x]) / Math.max(1, HELL - surf[x]), 0, 1)) ? 1 : 0); n++; } }
    for (let i = 0, n = 0; i < 8000 && n < Math.round(80 * WW / 520 * DK); i++) { const x = Math.floor(rnd(5, WW - 5)), y = Math.floor(rnd(surf[x] + 8, WH - 4)); if (at(x, y) === T.AIR && SOLID.has(at(x, y + 1))) { set(x, y, T.POT); n++; } }
    for (let x = 4; x < WW - 4; x++) if (at(x, surf[x]) === T.GRASS && at(x, surf[x] - 1) === T.AIR && R() < .05) set(x, surf[x] - 1, T.MUSH);
    for (let x = 4; x < WW - 4; x += 4 + Math.floor(R() * 9)) {
      if (at(x, surf[x]) !== T.GRASS || Math.abs(x - WW / 2) < 4) continue; const h = 5 + Math.floor(R() * 7), top = surf[x] - h;
      for (let y = surf[x] - 1; y >= top; y--) set(x, y, T.TRUNK);
      for (let dx = -2; dx <= 2; dx++) for (let dy = -3; dy <= 1; dy++) if (Math.abs(dx) + Math.abs(dy) < 4 && at(x + dx, top + dy) === T.AIR) set(x + dx, top + dy, T.LEAF);
    }
    liquidsGen();
  }
  function placeChest(x, y, gold) {
    if (!SOLID.has(at(x, y))) return; set(x, y - 1, gold ? T.GCHEST : T.CHEST);
    const df = clamp((y - surf[clamp(x, 0, WW - 1)]) / Math.max(1, HELL - surf[clamp(x, 0, WW - 1)]), 0, 1);   // 0 at the surface, 1 at the underworld
    const L = CHEST_LOOT[gold]; let main = pick(L.slice(0, 5));
    if (gold) { if (main === 'esword' && R() > df * df) main = pick(['eboom', 'missile', 'water', 'trident']); if (R() > .2 + .8 * Math.pow(df, 1.4)) main = null; }   // Enchanted Swords mostly deep down
    else if (['gustjar', 'hook', 'spark'].includes(main) && R() > .25 + .75 * df) main = pick(['boom', 'potion']);
    const items = main ? [[main, 1]] : [[pick(['gbar', 'potion', 'lpotion']), 2 + Math.floor(R() * 3)]]; if (R() < .04) items.push([gold ? 'glowmoth' : 'mosspup', 1]); if (gold && R() < .25) items.push(['falcon', 1]); if (R() < (gold ? .3 : .18)) items.push(['homeshard', 1 + (R() < .3 ? 1 : 0)]); if (R() < (gold ? .07 : .02)) items.push(['lodestar', 1]); items.push(['scoin', 1 + Math.floor(R() * (gold ? 30 : 8))]); for (let i = 0; i < 2 + Math.floor(R() * 3); i++) { const id = pick(L.slice(5)); items.push([id, IT[id].one ? 1 : ['torch', 'arrow', 'shot', 'farrow'].includes(id) ? 10 + Math.floor(R() * 30) : 1 + Math.floor(R() * 4)]); }
    chests[x + ',' + (y - 1)] = items;
  }
  // spawn standing on the surface: the closest column to the middle whose surface tile is solid with open air above it
  function spawnPoint() {
    const c = Math.floor(WW / 2);
    for (let d = 0; d < 60; d++) for (const x of d ? [c + d, c - d] : [c]) { if (x < 2 || x >= WW - 2) continue; const y = surf[x]; if (SOLID.has(at(x, y)) && !SOLID.has(at(x, y - 1)) && !SOLID.has(at(x, y - 2)) && !SOLID.has(at(x, y - 3))) return { x: x + .5, y: y - .01 }; }
    let y = 0; while (y < WH && !SOLID.has(at(c, y))) y++; return { x: c + .5, y: y - .01 };
  }

  /* ---------- pixel art ---------- */
  function px(w, h, fn) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); fn(g, (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); }); return cv; }
  function speckle(base, dots, seed) { let s = seed; const r = () => (s = s * 16807 % 2147483647) / 2147483647; return px(16, 16, (g, d) => { g.fillStyle = base; g.fillRect(0, 0, 16, 16); for (const [c, n] of dots) for (let i = 0; i < n; i++) { const x = Math.floor(r() * 16), y = Math.floor(r() * 16); d(x, y, c); if (r() < .4) d(Math.min(15, x + 1), y, c); } }); }
  function makeTex() { makeTex0(); pixelArt(); }
  function makeTex0() {
    tex[T.DIRT] = speckle('#8a5a32', [['#6e4424', 26], ['#a06c3e', 18], ['#5a3618', 8]], 3);
    tex[T.STONE] = speckle('#7a7a84', [['#62626c', 26], ['#94949e', 20], ['#4e4e58', 10]], 5);
    tex[T.SAND] = speckle('#d8c070', [['#c4aa5a', 30], ['#e8d488', 22]], 7);
    tex[T.ASH] = speckle('#4a4246', [['#3a3236', 30], ['#5a5256', 18], ['#2a2226', 8]], 31);
    tex[T.GRASS] = px(16, 16, (g, d) => { g.drawImage(tex[T.DIRT], 0, 0); g.fillStyle = '#4caa2a'; g.fillRect(0, 0, 16, 4); for (let x = 0; x < 16; x++) { const h = 3 + ((x * 7) % 3); for (let y = 0; y < h; y++) d(x, y, y === 0 ? '#7cdc4a' : '#4caa2a'); if (x % 3 === 0) d(x, h, '#3a8a1e'); } });
    const ore = (base, c1, c2, seed) => { const s = speckle(base, [['rgba(0,0,0,.18)', 22], ['rgba(255,255,255,.12)', 14]], seed); return px(16, 16, (g, d) => { g.drawImage(s, 0, 0); let q = seed; const r = () => (q = q * 16807 % 2147483647) / 2147483647; for (let i = 0; i < 6; i++) { const x = 1 + Math.floor(r() * 13), y = 1 + Math.floor(r() * 13); d(x, y, c1); d(x + 1, y, c1); d(x, y + 1, c2); d(x + 1, y + 1, c1); } }); };
    tex[T.COPPER] = ore('#7a7a84', '#e8904a', '#a85a2a', 11); tex[T.IRON] = ore('#7a7a84', '#d8c8b8', '#9a8a7a', 13); tex[T.SILVER] = ore('#7a7a84', '#f0f4ff', '#a8b0c0', 37);
    tex[T.GOLD] = ore('#7a7a84', '#ffe050', '#c89a1a', 17); tex[T.SHADOW] = ore('#3a3246', '#b07aff', '#6a3ab8', 41); tex[T.HELLSTONE] = ore('#4a2a26', '#ff7a2a', '#ffd23f', 43);
    tex[T.AZURITE] = ore('#4a4a5a', '#4a8aff', '#a8d0ff', 151); tex[T.VIRIDIUM] = ore('#3e4a44', '#3ad87a', '#b0ffd0', 157); tex[T.STARMETAL] = ore('#3a3644', '#ffe8a0', '#ffffff', 163);
    tex[T.STARFORGE] = px(16, 16, g => { g.fillStyle = '#3a3a5a'; g.fillRect(1, 2, 14, 14); g.fillStyle = '#5a5a8a'; g.fillRect(1, 2, 14, 2); g.fillStyle = '#10142a'; g.fillRect(5, 8, 6, 6); g.fillStyle = '#4ab0ff'; g.fillRect(6, 11, 4, 3); g.fillStyle = '#e0f4ff'; g.fillRect(7, 12, 2, 2); g.fillStyle = '#ffe8a0'; g.fillRect(2, 5, 1, 1); g.fillRect(13, 5, 1, 1); g.fillStyle = '#2a2a44'; g.fillRect(6, 0, 4, 2); });
    tex[T.RUNEANVIL] = px(16, 16, g => { g.fillStyle = '#2e5a6a'; g.fillRect(1, 7, 14, 3); g.fillRect(5, 10, 6, 3); g.fillRect(3, 13, 10, 3); g.fillStyle = '#5ab0c8'; g.fillRect(1, 7, 14, 1); g.fillRect(0, 7, 2, 2); g.fillStyle = '#7affd0'; g.fillRect(4, 8, 1, 1); g.fillRect(8, 8, 1, 1); g.fillRect(11, 8, 1, 1); g.fillRect(7, 14, 2, 1); });
    tex[T.RGRASS] = px(16, 16, g => { g.drawImage(tex[T.DIRT] || speckle('#8a5a32', [['#7a4e2a', 30]], 3), 0, 0); g.fillStyle = '#5ae0e8'; g.fillRect(0, 0, 16, 4); g.fillStyle = '#ff9aff'; for (const x of [2, 7, 12]) g.fillRect(x, 2, 2, 2); g.fillStyle = '#ffffff'; g.fillRect(5, 1, 1, 1); g.fillRect(10, 0, 1, 1); });
    tex[T.LSTONE] = speckle('#b8a8d0', [['#a898c0', 30], ['#d8c8f0', 12], ['#ffffff', 5], ['#ff9aff', 3]], 167); tex.wall23 = speckle('#6a5a84', [['#5e4e78', 30], ['#7a6a96', 12]], 173);
    tex[T.BONE] = px(16, 16, (g) => { g.fillStyle = '#5a5248'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#e8e0c8'; g.fillRect(2, 6, 12, 3); g.fillRect(1, 4, 3, 3); g.fillRect(12, 8, 3, 3); g.fillRect(5, 11, 7, 2); g.fillStyle = '#c8c0a8'; g.fillRect(2, 8, 12, 1); });
    tex[T.BRICK] = px(16, 16, (g) => { g.fillStyle = '#3a4a6a'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#2a3450'; for (const y of [0, 8]) g.fillRect(0, y, 16, 1); for (const [x, y] of [[0, 0], [8, 0], [4, 8], [12, 8]]) g.fillRect(x, y, 1, 8); g.fillStyle = '#4a5a80'; g.fillRect(1, 1, 6, 1); g.fillRect(5, 9, 6, 1); });
    tex[T.PLANK] = px(16, 16, (g) => { g.fillStyle = '#b07a42'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#8a5a2a'; for (const y of [0, 5, 10, 15]) g.fillRect(0, y, 16, 1); for (const [x, y] of [[4, 1], [11, 6], [6, 11]]) g.fillRect(x, y, 1, 4); g.fillStyle = '#c48a52'; g.fillRect(1, 2, 3, 1); g.fillRect(8, 7, 4, 1); });
    tex[T.TRUNK] = px(16, 16, (g, d) => { g.fillStyle = '#7a4e26'; g.fillRect(3, 0, 10, 16); g.fillStyle = '#5a3616'; g.fillRect(3, 0, 2, 16); g.fillRect(9, 0, 1, 16); g.fillStyle = '#9a663a'; g.fillRect(6, 0, 2, 16); g.fillRect(11, 0, 1, 16); for (const y of [3, 9, 13]) d(5 + (y % 4), y, '#4a2a10'); });
    tex[T.LEAF] = speckle('#3a8a2a', [['#2a6a1e', 30], ['#5aaa3a', 26], ['#7cc84a', 8]], 19);
    tex[T.TORCH] = px(16, 16, (g) => { g.fillStyle = '#7a4e26'; g.fillRect(7, 6, 2, 9); g.fillStyle = '#ffd23f'; g.fillRect(6, 2, 4, 4); g.fillStyle = '#fff6c0'; g.fillRect(7, 3, 2, 2); g.fillStyle = '#ff8a1a'; g.fillRect(6, 1, 1, 2); g.fillRect(9, 1, 1, 2); });
    tex[T.BENCH] = px(16, 16, (g) => { g.fillStyle = '#9a6a3a'; g.fillRect(0, 5, 16, 3); g.fillStyle = '#7a4e26'; g.fillRect(1, 8, 2, 8); g.fillRect(13, 8, 2, 8); g.fillStyle = '#b8844a'; g.fillRect(0, 5, 16, 1); g.fillStyle = '#5a3616'; g.fillRect(5, 3, 4, 2); });
    tex[T.FURNACE] = px(16, 16, (g) => { g.fillStyle = '#5a5a64'; g.fillRect(1, 2, 14, 14); g.fillStyle = '#7a7a84'; g.fillRect(1, 2, 14, 2); g.fillStyle = '#2a1a10'; g.fillRect(5, 8, 6, 6); g.fillStyle = '#ff8a1a'; g.fillRect(6, 11, 4, 3); g.fillStyle = '#ffd23f'; g.fillRect(7, 12, 2, 2); g.fillStyle = '#44444c'; g.fillRect(6, 0, 4, 2); });
    tex[T.ANVIL] = px(16, 16, (g) => { g.fillStyle = '#5a6068'; g.fillRect(1, 7, 14, 3); g.fillRect(5, 10, 6, 3); g.fillRect(3, 13, 10, 3); g.fillStyle = '#8a9098'; g.fillRect(1, 7, 14, 1); g.fillRect(0, 7, 2, 2); });
    tex[T.CRYSTAL] = px(16, 16, (g) => { g.fillStyle = '#c8203a'; g.beginPath(); g.moveTo(8, 2); g.lineTo(13, 8); g.lineTo(8, 15); g.lineTo(3, 8); g.fill(); g.fillStyle = '#ff6a7a'; g.fillRect(6, 5, 2, 4); g.fillStyle = '#ffd0d8'; g.fillRect(7, 5, 1, 2); });
    const chestT = (c, band) => px(16, 16, (g) => { g.fillStyle = c; g.fillRect(1, 4, 14, 12); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(1, 9, 14, 1); g.fillStyle = band; g.fillRect(1, 4, 14, 2); g.fillRect(1, 14, 14, 2); g.fillRect(7, 8, 2, 4); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(2, 6, 4, 1); });
    tex[T.CHEST] = chestT('#9a6a3a', '#5a5a64'); tex[T.GCHEST] = chestT('#d8a830', '#7a5a10');
    tex[T.MUSH] = px(16, 16, (g) => { g.fillStyle = '#e8e0d0'; g.fillRect(7, 9, 3, 7); g.fillStyle = '#c8302a'; g.fillRect(4, 5, 9, 5); g.fillRect(5, 4, 7, 1); g.fillStyle = '#fff'; g.fillRect(6, 6, 2, 1); g.fillRect(10, 7, 1, 1); });
    const brickT = (c, line, hi) => px(16, 16, (g) => { g.fillStyle = c; g.fillRect(0, 0, 16, 16); g.fillStyle = line; for (const y of [0, 8]) g.fillRect(0, y, 16, 1); for (const [x, y] of [[0, 0], [8, 0], [4, 8], [12, 8]]) g.fillRect(x, y, 1, 8); g.fillStyle = hi; for (const [x, y] of [[1, 1], [9, 1], [5, 9], [13, 9]]) g.fillRect(x, y, 3, 1); });
    tex[T.SBRICK] = brickT('#80808a', '#55555e', '#a0a0aa'); tex[T.CBRICK] = brickT('#c87a42', '#8a4a22', '#eaa070'); tex[T.GBRICK] = brickT('#e8c040', '#9a7a10', '#fff0a0');
    tex[T.GLASS] = px(16, 16, (g) => { g.fillStyle = 'rgba(190,230,255,.35)'; g.fillRect(0, 0, 16, 16); g.fillStyle = 'rgba(230,248,255,.8)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(3, 3, 1, 4); g.fillRect(4, 3, 1, 2); g.fillStyle = 'rgba(120,170,200,.7)'; g.fillRect(15, 0, 1, 16); g.fillRect(0, 15, 16, 1); });
    tex[T.TABLE] = px(16, 16, (g) => { g.fillStyle = '#a06c3e'; g.fillRect(0, 6, 16, 3); g.fillStyle = '#c08a52'; g.fillRect(0, 6, 16, 1); g.fillStyle = '#7a4e26'; g.fillRect(1, 9, 2, 7); g.fillRect(13, 9, 2, 7); });
    tex[T.CHAIR] = px(16, 16, (g) => { g.fillStyle = '#7a4e26'; g.fillRect(4, 1, 2, 15); g.fillRect(11, 10, 2, 6); g.fillStyle = '#a06c3e'; g.fillRect(4, 9, 9, 2); g.fillRect(4, 3, 2, 1); g.fillRect(4, 6, 2, 1); });
    tex[T.LANTERN] = px(16, 16, (g) => { g.fillStyle = '#4a4a54'; g.fillRect(7, 0, 2, 3); g.fillRect(4, 3, 8, 2); g.fillRect(4, 13, 8, 2); g.fillRect(4, 5, 1, 8); g.fillRect(11, 5, 1, 8); g.fillStyle = '#ffd23f'; g.fillRect(5, 5, 6, 8); g.fillStyle = '#fff6c0'; g.fillRect(7, 7, 2, 4); });
    tex[T.CAMPFIRE] = px(16, 16, (g) => { g.fillStyle = '#6a4424'; g.fillRect(1, 13, 14, 3); g.fillStyle = '#8a5a32'; g.fillRect(3, 11, 10, 2); g.fillStyle = '#ff6a1a'; g.fillRect(4, 6, 8, 5); g.fillRect(6, 3, 4, 3); g.fillStyle = '#ffd23f'; g.fillRect(6, 7, 4, 4); g.fillStyle = '#fff6c0'; g.fillRect(7, 8, 2, 2); });
    tex[T.BED] = px(16, 16, (g) => { g.fillStyle = '#7a4e26'; g.fillRect(0, 5, 2, 11); g.fillRect(14, 9, 2, 7); g.fillStyle = '#c8303a'; g.fillRect(2, 9, 12, 4); g.fillStyle = '#e8e8f0'; g.fillRect(2, 7, 4, 3); g.fillStyle = '#a06c3e'; g.fillRect(0, 13, 16, 2); });
    tex[T.BOOKS] = px(16, 16, (g) => { g.fillStyle = '#7a4e26'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#4a2e16'; g.fillRect(1, 1, 14, 6); g.fillRect(1, 9, 14, 6); const cs = ['#c8303a', '#3a6ad8', '#3aa04a', '#d8a830', '#8a4ad8']; for (let i = 0; i < 6; i++) { g.fillStyle = cs[i % 5]; g.fillRect(2 + i * 2, 2 + (i % 2), 2, 5 - (i % 2)); g.fillStyle = cs[(i + 2) % 5]; g.fillRect(2 + i * 2, 10 + ((i + 1) % 2), 2, 5 - ((i + 1) % 2)); } });
    tex[T.POT] = px(16, 16, (g) => { g.fillStyle = '#9a5a3a'; g.fillRect(4, 6, 9, 10); g.fillRect(5, 4, 7, 2); g.fillStyle = '#7a3a1a'; g.fillRect(4, 10, 9, 1); g.fillStyle = '#c87a4a'; g.fillRect(5, 7, 2, 4); });
    tex.wall1 = speckle('#4a3020', [['#3a2416', 30], ['#56382a', 14]], 23); tex.wall2 = speckle('#3a3a42', [['#2e2e36', 30], ['#46464e', 14]], 29); tex.wall3 = speckle('#3a1a16', [['#2a1210', 30], ['#4a2420', 14]], 47); tex.wall4 = speckle('#2a3048', [['#20263a', 30], ['#343c58', 14]], 53); tex.wall5 = speckle('#5a4220', [['#4a3418', 30], ['#6a5028', 14]], 61); tex[T.OBSID] = px(16, 16, (g) => { g.fillStyle = '#1e1428'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#2e2040'; for (const [x, y, w, h] of [[1, 2, 6, 3], [9, 1, 5, 4], [3, 8, 5, 4], [10, 9, 5, 5], [0, 13, 4, 3]]) g.fillRect(x, y, w, h); g.fillStyle = '#5a3a8a'; for (const [x, y] of [[2, 2], [10, 2], [4, 9], [11, 10]]) g.fillRect(x, y, 2, 1); });
    tex.wall6 = speckle('#6a5232', [['#5a4428', 30], ['#7a6040', 14]], 71); tex.wall7 = speckle('#2a3a20', [['#22301a', 30], ['#344828', 14]], 79);
    tex[T.SNOW] = speckle('#eef4fc', [['#d4e2f2', 26], ['#ffffff', 16]], 101); tex[T.ICE] = px(16, 16, g => { g.fillStyle = '#8ed0f0'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#a8e0f8'; g.fillRect(1, 1, 14, 6); g.fillStyle = '#cff0ff'; for (const [x, y, w] of [[2, 2, 5], [9, 9, 4], [4, 12, 2]]) g.fillRect(x, y, w, 1); g.fillStyle = '#6ab4dc'; g.fillRect(11, 3, 1, 4); g.fillRect(3, 9, 1, 3); });
    tex[T.SLEAF] = px(16, 16, g => { for (let y = 0; y < 16; y++) { const w = Math.min(16, 4 + y); g.fillStyle = y % 4 < 2 ? '#1e4a34' : '#2a5e42'; g.fillRect(8 - w / 2, y, w, 1); } g.fillStyle = '#f4f8ff'; for (const [x, y] of [[7, 1], [5, 5], [10, 6], [3, 10], [12, 11], [7, 13]]) g.fillRect(x, y, 2, 1); });
    tex[T.BGRASS] = px(16, 16, g => { g.drawImage(speckle('#5a3a44', [['#4a2e36', 30], ['#6a4652', 12]], 107), 0, 0); g.fillStyle = '#6a2a8a'; g.fillRect(0, 0, 16, 4); g.fillStyle = '#8a3aaa'; for (const x of [1, 5, 9, 13]) g.fillRect(x, 3, 2, 2); });
    tex[T.BSTONE] = speckle('#4a3a5a', [['#3a2c4a', 30], ['#5e4a70', 14], ['#7a3aa0', 4]], 109);
    tex[T.BHEART] = px(16, 16, g => { g.fillStyle = '#3a0a4a'; g.beginPath(); g.arc(8, 8, 7, 0, 7); g.fill(); g.fillStyle = '#8a1aa8'; g.beginPath(); g.arc(8, 8, 5, 0, 7); g.fill(); g.fillStyle = '#e05aff'; g.fillRect(6, 5, 3, 3); g.fillStyle = '#2a0636'; g.fillRect(4, 9, 8, 1); g.fillRect(8, 3, 1, 10); });
    tex[T.GMOSS] = px(16, 16, g => { g.drawImage(speckle('#3a3a4a', [['#2e2e3e', 30], ['#46465a', 12]], 113), 0, 0); g.fillStyle = '#2a8ab8'; g.fillRect(0, 0, 16, 3); g.fillStyle = '#5ae0ff'; for (const x of [2, 6, 11, 14]) g.fillRect(x, 1, 1, 2); });
    tex[T.GLOWCAP] = px(16, 16, g => { g.fillStyle = '#c8e8f0'; g.fillRect(7, 8, 2, 8); g.fillStyle = '#2ab8e8'; g.beginPath(); g.ellipse(8, 8, 6, 4, 0, Math.PI, 0); g.fill(); g.fillStyle = '#9af4ff'; g.fillRect(5, 5, 2, 1); g.fillRect(9, 6, 2, 1); });
    tex[T.CAPBLK] = speckle('#2a9ac8', [['#2286b0', 28], ['#5ad8ff', 10], ['#c8f4ff', 3]], 127); tex[T.STALK] = px(16, 16, g => { g.fillStyle = '#b8d8e0'; g.fillRect(4, 0, 8, 16); g.fillStyle = '#d8eef4'; g.fillRect(5, 0, 2, 16); g.fillStyle = '#90b4c0'; g.fillRect(10, 0, 2, 16); });
    tex[T.CLOUD] = px(16, 16, g => { g.fillStyle = '#e8eef8'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#ffffff'; for (const [x, y, r] of [[4, 4, 4], [11, 5, 4], [7, 11, 4]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } g.fillStyle = '#d0dcec'; g.fillRect(0, 14, 16, 2); });
    tex.wall20 = speckle('#3a5a78', [['#30506c', 30], ['#4a6c8a', 14]], 131); tex.wall21 = speckle('#3a2a44', [['#2e2238', 30], ['#4a3456', 14]], 137); tex.wall22 = speckle('#24304a', [['#1c263c', 30], ['#2a4a6a', 10]], 139);
    { const planks = (base, dark, hi) => px(16, 16, g => { g.fillStyle = base; g.fillRect(0, 0, 16, 16); g.fillStyle = dark; for (const y of [3, 7, 11, 15]) g.fillRect(0, y, 16, 1); for (const [x, y] of [[5, 0], [11, 4], [3, 8], [9, 12]]) g.fillRect(x, y, 1, 3); g.fillStyle = hi; for (const y of [0, 4, 8, 12]) g.fillRect(0, y, 16, 1); });
      const bricks = (base, mortar, hi) => px(16, 16, g => { g.fillStyle = mortar; g.fillRect(0, 0, 16, 16); g.fillStyle = base; for (let r = 0; r < 4; r++) for (let c = -1; c < 3; c++) g.fillRect(c * 8 + (r % 2 ? 4 : 0) + 1, r * 4 + 1, 7, 3); g.fillStyle = hi; for (let r = 0; r < 4; r++) for (let c = -1; c < 3; c++) g.fillRect(c * 8 + (r % 2 ? 4 : 0) + 1, r * 4 + 1, 7, 1); });
      tex.wall8 = planks('#6a4424', '#4a2e16', '#7a5230');
      const logs = (base, dark, hi, ring) => px(16, 16, g => { for (let x = 0; x < 16; x += 4) { g.fillStyle = dark; g.fillRect(x, 0, 4, 16); g.fillStyle = base; g.fillRect(x + 1, 0, 2, 16); g.fillStyle = hi; g.fillRect(x + 1, 0, 1, 16); } g.fillStyle = ring; g.fillRect(5, 3, 2, 2); g.fillRect(13, 10, 2, 2); });
      const herring = (base, dark, hi) => px(16, 16, g => { g.fillStyle = base; g.fillRect(0, 0, 16, 16); g.fillStyle = dark; for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x++) g.fillRect(x, (y + (x % 8 < 4 ? x % 4 : 3 - x % 4)) % 16, 1, 1); g.fillStyle = hi; for (let y = 2; y < 16; y += 4) g.fillRect((y * 3) % 16, y, 3, 1); });
      tex.wall14 = logs('#4a3018', '#24160a', '#5e4024', '#2a1a0c');
      tex.wall15 = px(16, 16, g => { g.drawImage(planks('#5e5850', '#3a3630', '#6e685e'), 0, 0); g.fillStyle = '#c8dcec'; for (const [x, y] of [[2, 0], [9, 4], [14, 8], [5, 12]]) { g.fillRect(x, y, 2, 1); g.fillRect(x, y + 1, 1, 1); } });
      tex.wall16 = herring('#5a2418', '#381208', '#6e3424');
      tex.wall17 = px(16, 16, g => { g.drawImage(planks('#34203e', '#1c1024', '#443050'), 0, 0); g.fillStyle = '#7a3a9a'; for (const [x, y] of [[3, 2], [11, 6], [6, 10], [13, 14]]) g.fillRect(x, y, 1, 1); });
      tex.wall18 = px(16, 16, g => { g.drawImage(logs('#a898ac', '#786a7c', '#c0b2c4', '#8a7a8e'), 0, 0); g.fillStyle = '#9af4ff'; for (const [x, y] of [[2, 5], [10, 1], [6, 12], [14, 9]]) g.fillRect(x, y, 1, 1); }); tex.wall9 = speckle('#55555e', [['#45454e', 30], ['#62626c', 14]], 83); tex.wall10 = bricks('#5c5c66', '#3a3a42', '#6a6a74');
      tex.wall11 = bricks('#8a5430', '#4a2e1a', '#9a643a'); tex.wall12 = bricks('#a88a2a', '#5a4a14', '#c0a038');
      tex.wall13 = px(16, 16, g => { g.fillStyle = '#5a8aa8'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#6a9ab8'; g.fillRect(1, 1, 14, 14); g.fillStyle = '#9ac8e0'; g.fillRect(3, 3, 1, 4); g.fillRect(4, 3, 3, 1); g.fillRect(11, 10, 2, 1); g.fillStyle = '#3a6a88'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16); });
      const door = (open, bottom) => px(16, 16, g => { const x0 = open ? 0 : 2, w = open ? 4 : 12; g.fillStyle = '#4a2e16'; g.fillRect(x0, 0, w, 16); g.fillStyle = '#9a6a3a'; g.fillRect(x0 + 1, bottom ? 0 : 1, w - 2, bottom ? 15 : 15); g.fillStyle = '#b07a42'; for (let x = x0 + 1; x < x0 + w - 1; x += 3) g.fillRect(x, bottom ? 0 : 1, 1, 15);
        g.fillStyle = '#5a5a64'; g.fillRect(x0 + 1, bottom ? 10 : 4, w - 2, 1); if (bottom && !open) { g.fillStyle = '#ffd23f'; g.fillRect(x0 + w - 3, 2, 1, 2); } });
      tex.doorT = door(false, false); tex.doorB = door(false, true); tex.doorOT = door(true, false); tex.doorOB = door(true, true); tex[T.DOOR] = tex.doorB; tex[T.DOORO] = tex.doorOB;
      tex.platV = [];
      const platT = (dk, base, hi, leg, extra) => px(16, 16, g => { g.fillStyle = dk; g.fillRect(0, 0, 16, 5); g.fillStyle = base; g.fillRect(0, 1, 16, 3); g.fillStyle = hi; g.fillRect(0, 1, 16, 1); g.fillStyle = leg; g.fillRect(2, 5, 2, 3); g.fillRect(12, 5, 2, 3); g.fillStyle = dk; g.fillRect(7, 1, 1, 3); if (extra) extra(g); });
      tex.platV[1] = platT('#24160a', '#5a3a1a', '#7a5228', '#3a2410', g => { g.fillStyle = '#4caa2a'; g.fillRect(4, 0, 2, 1); g.fillRect(11, 0, 1, 1); g.fillStyle = '#3a8a20'; g.fillRect(9, 5, 1, 2); });
      tex.platV[2] = platT('#3e3832', '#8a8076', '#b0a698', '#5e5850', g => { g.fillStyle = '#e8f6ff'; g.fillRect(0, 0, 16, 1); g.fillStyle = '#bfe6ff'; g.fillRect(5, 5, 1, 3); g.fillRect(10, 5, 1, 2); });
      tex.platV[3] = platT('#2e100a', '#7a3020', '#a04a30', '#4a1a10', g => { g.fillStyle = '#4a8a2a'; g.fillRect(5, 5, 1, 4); g.fillRect(9, 5, 1, 2); g.fillRect(4, 8, 1, 1); });
      tex.platV[4] = platT('#140a1a', '#3e2450', '#5a3a70', '#24142e', g => { g.fillStyle = '#9a4ac8'; g.fillRect(3, 5, 1, 1); g.fillRect(12, 7, 1, 1); g.fillStyle = '#24142e'; g.fillRect(6, 5, 1, 2); g.fillRect(9, 5, 1, 2); });
      tex.platV[5] = platT('#8a7a8e', '#d8c8dc', '#ffffff', '#a898ac', g => { g.fillStyle = '#7af0ff'; g.fillRect(4, 2, 1, 1); g.fillRect(11, 2, 1, 1); g.fillStyle = '#ff9aff'; g.fillRect(8, 6, 1, 1); });
      tex[T.SAPLING] = px(16, 16, g => { g.fillStyle = '#6a4424'; g.fillRect(7, 8, 2, 8); g.fillStyle = '#3e9a24'; g.fillRect(3, 6, 4, 3); g.fillRect(9, 4, 4, 3); g.fillRect(6, 1, 3, 4); g.fillStyle = '#8ee860'; g.fillRect(4, 6, 2, 1); g.fillRect(10, 4, 2, 1); g.fillRect(7, 1, 1, 2); g.fillStyle = '#2a6a14'; g.fillRect(5, 8, 2, 1); g.fillRect(11, 6, 2, 1); });
      tex[T.PLAT] = px(16, 16, g => { g.fillStyle = '#4a2e16'; g.fillRect(0, 0, 16, 5); g.fillStyle = '#a06c3e'; g.fillRect(0, 1, 16, 3); g.fillStyle = '#c08a52'; g.fillRect(0, 1, 16, 1); g.fillStyle = '#6a4424'; g.fillRect(2, 5, 2, 3); g.fillRect(12, 5, 2, 3); g.fillRect(7, 1, 1, 3); });
      tex.doorIcon = px(16, 16, g => { g.fillStyle = '#4a2e16'; g.fillRect(4, 0, 8, 16); g.fillStyle = '#9a6a3a'; g.fillRect(5, 1, 6, 14); g.fillStyle = '#b07a42'; g.fillRect(6, 1, 1, 14); g.fillRect(9, 1, 1, 14); g.fillStyle = '#5a5a64'; g.fillRect(5, 4, 6, 1); g.fillRect(5, 11, 6, 1); g.fillStyle = '#ffd23f'; g.fillRect(10, 8, 1, 2); }); }
    tex[T.SSTONE] = px(16, 16, (g) => { g.fillStyle = '#c8a060'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#b08a4a'; for (const y of [4, 9, 13]) g.fillRect(0, y, 16, 1); g.fillStyle = '#dcb878'; for (const [x, y] of [[2, 1], [9, 6], [5, 10], [12, 14]]) g.fillRect(x, y, 3, 1); });
    tex[T.WATER] = px(16, 16, (g) => { g.fillStyle = 'rgba(40,110,220,.62)'; g.fillRect(0, 0, 16, 16); g.fillStyle = 'rgba(150,200,255,.35)'; g.fillRect(2, 3, 5, 1); g.fillRect(9, 10, 4, 1); });
    tex[T.COBWEB] = px(16, 16, (g) => { g.strokeStyle = 'rgba(235,235,245,.75)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(16, 16); g.moveTo(16, 0); g.lineTo(0, 16); g.moveTo(8, 0); g.lineTo(8, 16); g.moveTo(0, 8); g.lineTo(16, 8); g.stroke(); g.beginPath(); g.arc(8, 8, 3, 0, 7); g.arc(8, 8, 6, 0, 7); g.stroke(); });
    tex[T.MUD] = speckle('#4a3a2a', [['#3a2c1e', 28], ['#5a4834', 16], ['#2e2216', 8]], 67);
    tex[T.JGRASS] = px(16, 16, (g, d) => { g.drawImage(tex[T.MUD], 0, 0); g.fillStyle = '#2a8a3a'; g.fillRect(0, 0, 16, 4); for (let x = 0; x < 16; x++) { const h = 3 + ((x * 5) % 4); for (let y = 0; y < h; y++) d(x, y, y === 0 ? '#5ad84a' : '#2a8a3a'); } });
    tex[T.LWOOD] = px(16, 16, (g) => { g.fillStyle = '#5a3a1a'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#4a2e12'; for (const x of [2, 7, 12]) g.fillRect(x, 0, 2, 16); g.fillStyle = '#6e4a24'; for (const x of [5, 10]) g.fillRect(x, 0, 1, 16); g.fillStyle = '#3a7a2a'; g.fillRect(9, 3, 2, 3); g.fillRect(3, 11, 2, 2); });
    tex[T.TBRICK] = px(16, 16, (g) => { g.fillStyle = '#a07a30'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#6a4a18'; for (const y of [0, 8]) g.fillRect(0, y, 16, 1); for (const [x, y] of [[0, 0], [8, 0], [4, 8], [12, 8]]) g.fillRect(x, y, 1, 8); g.fillStyle = '#c8a050'; for (const [x, y] of [[1, 1], [9, 1], [5, 9], [13, 9]]) g.fillRect(x, y, 3, 1); g.fillStyle = '#7a5a20'; g.fillRect(6, 3, 2, 2); });
    tex[T.DTRAP] = px(16, 16, (g) => { g.drawImage(tex[T.TBRICK], 0, 0); g.fillStyle = '#3a2a10'; g.fillRect(4, 4, 8, 8); g.fillStyle = '#1a1208'; g.fillRect(6, 6, 4, 4); g.fillStyle = '#ff6a2a'; g.fillRect(7, 7, 2, 2); });
    tex[T.SPIKE] = px(16, 16, (g) => { g.fillStyle = '#8a8a94'; for (const x of [1, 6, 11]) { g.beginPath(); g.moveTo(x, 16); g.lineTo(x + 2, 6); g.lineTo(x + 4, 16); g.fill(); } g.fillStyle = '#c8c8d0'; for (const x of [2, 7, 12]) g.fillRect(x + 1, 8, 1, 4); });
  }
  let rawIcon = false; const pixIc = {};
  function pixIcon(id) { if (pixIc[id] !== undefined) return pixIc[id]; const N = 22, c = document.createElement('canvas'); c.width = c.height = N; const cg = c.getContext('2d');
    rawIcon = true; try { icon(cg, id, 11, 11, 1); } catch (e) {} rawIcon = false; const im = cg.getImageData(0, 0, N, N), d = im.data, A = i => d[i * 4 + 3] > 90;
    let any = false; for (let i = 0; i < N * N; i++) { if (A(i)) { any = true; d[i * 4 + 3] = 255; } else d[i * 4 + 3] = 0; } if (!any) return (pixIc[id] = null);
    const o = new Uint8ClampedArray(d); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x, k = i * 4;
      if (A(i)) { const up = y > 0 && A(i - N), dn = y < N - 1 && A(i + N), m = !up ? 1.22 : !dn ? .74 : 1; o[k] = d[k] * m; o[k + 1] = d[k + 1] * m; o[k + 2] = d[k + 2] * m; continue; }
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; const j = yy * N + xx; if (A(j)) { o[k] = d[j * 4] * .28; o[k + 1] = d[j * 4 + 1] * .28; o[k + 2] = d[j * 4 + 2] * .32; o[k + 3] = 255; break; } } }
    im.data.set(o); cg.putImageData(im, 0, 0); return (pixIc[id] = c); }
  function icon(g, id, x, y, s) {
    const it = IT[id]; if (!it) return; g.imageSmoothingEnabled = false;
    if (it.pet && PETA[it.pet]) { const c = petSpr(it.pet, 0), k = 16 * s / Math.max(c.width, c.height); g.imageSmoothingEnabled = false; g.drawImage(c, x - c.width * k / 2, y - c.height * k / 2, c.width * k, c.height * k); return; }
    if (it.coin) { const c = { 1: ['#e0955a', '#9a5428'], 100: ['#eef0f6', '#8e94a4'], 10000: ['#ffd23f', '#a8820e'], 1000000: ['#d4f0ff', '#6e9ec0'] }[it.coin];
      for (const [ox, oy] of [[2, 3], [0, 0]]) { g.fillStyle = c[1]; g.beginPath(); g.ellipse(x + ox * s, y + (oy + 1) * s, 5 * s, 3.2 * s, 0, 0, 7); g.fill(); g.fillStyle = c[0]; g.beginPath(); g.ellipse(x + ox * s, y + oy * s, 5 * s, 3.2 * s, 0, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.65)'; g.fillRect(x - 2 * s, y - 2 * s, 3 * s, s); return; }
    if (it.wall) { g.drawImage(tex['wall' + it.wall], x - 7 * s, y - 7 * s, 14 * s, 14 * s); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = s; g.strokeRect(x - 7 * s, y - 7 * s, 14 * s, 14 * s); return; }
    if (it.tile === 48 && it.pv) { g.drawImage(tex.platV[it.pv], x - 8 * s, y - 8 * s, 16 * s, 16 * s); return; }
    if (it.tile === 46) { g.drawImage(tex.doorIcon, x - 8 * s, y - 8 * s, 16 * s, 16 * s); return; }
    if (it.tile) { g.drawImage(tex[it.tile], x - 8 * s, y - 8 * s, 16 * s, 16 * s); return; }
    { const ti = toolIcon(id); if (ti) { g.drawImage(ti, x - 9 * s, y - 9 * s, 18 * s, 18 * s); return; } }
    { const gi = gearIcon(id); if (gi) { g.drawImage(gi, x - 9 * s, y - 9 * s, 18 * s, 18 * s); return; } }
    { const xi = xIcon(id); if (xi) { g.drawImage(xi, x - 9 * s, y - 9 * s, 18 * s, 18 * s); return; } }
    { const ni = nIcon(id); if (ni) { g.drawImage(ni, x - 9 * s, y - 9 * s, 18 * s, 18 * s); return; } }
    if (!rawIcon) { const oi = pixIcon(id); if (oi) { g.imageSmoothingEnabled = false; g.drawImage(oi, x - 11 * s, y - 11 * s, 22 * s, 22 * s); return; } }
    g.save(); g.translate(x, y); g.scale(s, s);
    const r = (c, a, b, w, h) => { g.fillStyle = c; g.fillRect(a, b, w, h); };
    if (it.rod) { g.strokeStyle = '#6a4424'; g.lineWidth = 2; g.beginPath(); g.moveTo(-7, 7); g.lineTo(6, -7); g.stroke(); g.strokeStyle = it.c; g.lineWidth = 1; g.beginPath(); g.moveTo(-5, 5); g.lineTo(4, -5); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = .6; g.beginPath(); g.moveTo(6, -7); g.lineTo(7, 4); g.stroke(); r('#ff3a3a', 6, 3, 3, 2); r('#ffffff', 6, 5, 3, 1); }
    else if (it.hammer) { r('#7a4e26', -1, -4, 2, 11); r(it.c, -5, -8, 10, 5); r('rgba(0,0,0,.25)', -5, -4, 10, 1); r('rgba(255,255,255,.45)', -4, -7, 8, 1); }
    else if (it.axe) { r('#7a4e26', -1, -6, 2, 13); r(it.c, 1, -7, 4, 6); r(it.c, 5, -8, 2, 8); r('rgba(0,0,0,.25)', 1, -2, 4, 1); r('rgba(255,255,255,.45)', 2, -6, 3, 1); }
    else if (it.pick) { r('#7a4e26', -1, -2, 2, 9); r(it.c, -7, -6, 14, 3); r(it.c, -7, -4, 2, 3); r(it.c, 5, -4, 2, 3); r('rgba(255,255,255,.4)', -6, -6, 5, 1); }
    else if (it.reach) { g.rotate(-.8); r('#7a4e26', -1, -2, 2, 12); r(it.c, -2, -9, 4, 7); if (id === 'trident') { r(it.c, -4, -8, 1, 4); r(it.c, 3, -8, 1, 4); } }
    else if (it.melee) { g.rotate(-.78); r(it.c, -1.5, -9, 3, 12); r('rgba(255,255,255,.45)', -.5, -8, 1, 10); r(it.beam || it.stars ? '#ffd23f' : '#7a4e26', -4, 3, 8, 2); r('#5a3616', -1, 5, 2, 3); }
    else if (it.bow) { g.strokeStyle = it.c; g.lineWidth = 2; g.beginPath(); g.arc(-3, 0, 7, -1.2, 1.2); g.stroke(); g.strokeStyle = '#e8e8e8'; g.lineWidth = 1; g.beginPath(); g.moveTo(-.5, -6.5); g.lineTo(-.5, 6.5); g.stroke(); if (it.shots) r('#c8203a', -6, -1, 3, 2); }
    else if (it.gun) { r(it.c, -7, -3, 12, 4); r('#5a3616', -5, 1, 4, 5); r('#3a3a3a', 3, -4, 3, 2); if (id === 'slimegun') r('#7ac8ff', -6, -2, 6, 2); }
    else if (it.boom) { g.strokeStyle = it.c; g.lineWidth = 3; g.beginPath(); g.moveTo(-6, 5); g.lineTo(0, -5); g.lineTo(6, 5); g.stroke(); }
    else if (it.summon) { g.rotate(-.7); r('#5a3616', -1, -3, 2, 12); r(it.c, -4, -9, 8, 6); r('rgba(255,255,255,.6)', -2, -8, 2, 2); r('#2a1a40', 1, -6, 2, 2); }
    else if (it.bucket) { const fc = it.bucket === 'empty' ? null : ['', '#3a7ae8', '#ff6a1a', '#e8a828'][it.bucket]; g.strokeStyle = '#6a6a74'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, -3, 5, Math.PI, 0); g.stroke(); r('#8a8a94', -5, -3, 10, 9); r('#6a6a74', -5, 4, 10, 2); r('#b8c0c8', -6, -4, 12, 2); r('rgba(255,255,255,.35)', -4, -2, 2, 6); if (fc) { r(fc, -4, -2, 8, 3); r('rgba(255,255,255,.5)', -3, -2, 3, 1); } }
    else if (id === 'homeshard') { g.fillStyle = '#3ae0d0'; g.beginPath(); g.moveTo(0, -8); g.lineTo(5, -1); g.lineTo(2, 8); g.lineTo(-3, 6); g.lineTo(-5, -2); g.fill(); r('#c8fff8', -2, -5, 2, 4); r('rgba(255,255,255,.8)', 1, -2, 1, 2); }
    else if (id === 'lodestar') { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, 7, 0, 7); g.fill(); g.fillStyle = '#2a1a40'; g.beginPath(); g.arc(0, 0, 5, 0, 7); g.fill(); g.fillStyle = '#7affee'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? 1.5 : 4.5; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.fill(); r('#fff', -1, -1, 2, 2); }
    else if (id === 'essence') { g.fillStyle = '#ff7aff'; g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill(); g.fillStyle = '#ffd0ff'; g.beginPath(); g.arc(-1, -1, 3, 0, 7); g.fill(); r('#fff', -2, -3, 2, 2); }
    else if (it.magic) { g.rotate(-.7); r('#7a4e26', -1, -4, 2, 13); r(it.c, -3, -9, 6, 6); r('#fff', -1, -8, 2, 2); }
    else if (it.slot === 'head') { r(it.c, -6, -6, 12, 7); r(it.c, -6, 1, 3, 4); r(it.c, 3, 1, 3, 4); r('rgba(0,0,0,.35)', -3, 1, 6, 2); r('rgba(255,255,255,.35)', -5, -5, 4, 2); }
    else if (it.slot === 'legs') { r(it.c, -6, -6, 12, 4); r(it.c, -6, -2, 5, 9); r(it.c, 1, -2, 5, 9); r('rgba(0,0,0,.25)', -6, 5, 5, 2); r('rgba(0,0,0,.25)', 1, 5, 5, 2); r('rgba(255,255,255,.35)', -5, -5, 3, 1); }
    else if (it.armor) { r(it.c, -6, -6, 12, 11); r('rgba(0,0,0,.3)', -6, 2, 12, 2); r(it.c, -8, -6, 3, 5); r(it.c, 5, -6, 3, 5); r('rgba(255,255,255,.35)', -5, -5, 4, 2); }
    else if (it.ammo === 'shot') { r('#5a5a64', -3, -3, 6, 6); r('#8a8a94', -2, -2, 2, 2); }
    else if (it.ammo) { g.rotate(-.78); r('#b07a42', -.5, -6, 1, 12); r(it.fire ? '#ff8a1a' : '#c8c8c8', -1.5, -8, 3, 3); r('#e8e8e8', -1.5, 5, 3, 2); }
    else if (it.throw) { g.rotate(-.78); r('#c8c8d0', -1, -8, 2, 9); r('#5a3616', -1, 1, 2, 4); }
    else if (id === 'gel') { r('#3aa0ff', -5, -3, 10, 7); r('#7ac8ff', -3, -2, 3, 2); }
    else if (id === 'lens') { r('#e8e8e8', -5, -5, 10, 10); r('#c8203a', -3, -3, 6, 6); r('#1a1a1a', -1, -1, 2, 2); }
    else if (id === 'bone') { r('#e8e0c8', -6, -1, 12, 3); r('#e8e0c8', -7, -3, 3, 3); r('#e8e0c8', 4, 1, 3, 3); }
    else if (id === 'star') { g.fillStyle = '#ffe680'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? 3 : 7; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.fill(); }
    else if (id === 'ember') { r('#ff6a2a', -4, -4, 8, 8); r('#ffd23f', -2, -2, 4, 4); }
    else if (/bar$/.test(id)) { const c = { cbar: '#d8864a', ibar: '#c8c8d0', sbar: '#f0f4ff', gbar: '#ffd23f', shbar: '#9a6ae8', hbar: '#ff6a2a', azbar: '#3a8ae8', vibar: '#3ad86a', smbar: '#ffe680' }[id] || '#c8c8d0'; r(c, -6, -2, 12, 5); r('rgba(255,255,255,.45)', -5, -2, 10, 1); r('rgba(0,0,0,.25)', -6, 2, 12, 1); }
    else if (id === 'life') { r('#c8203a', -4, -6, 8, 12); r('#ff6a7a', -2, -4, 2, 5); }
    else if (id === 'mana') { r('#2a5ad8', -4, -6, 8, 12); r('#7ab0ff', -2, -4, 2, 5); }
    else if (it.acc) { const k = it.acc, c = it.c;
      if (k === 'ring') { g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); g.arc(0, 1, 5, 0, 7); g.stroke(); r('#fff', -1, -6, 2, 2); }
      else if (k === 'emblem') { g.fillStyle = c; g.beginPath(); g.moveTo(0, -7); g.lineTo(7, 0); g.lineTo(0, 7); g.lineTo(-7, 0); g.fill(); r('rgba(255,255,255,.55)', -1, -4, 2, 8); r('rgba(255,255,255,.55)', -4, -1, 8, 2); }
      else if (k === 'glove') { r(c, -5, -3, 10, 9); r(c, -5, -7, 2, 4); r(c, -2, -8, 2, 5); r(c, 1, -8, 2, 5); r(c, 4, -6, 2, 4); r('rgba(0,0,0,.25)', -5, 4, 10, 2); }
      else if (k === 'quiver') { g.rotate(.5); r(c, -3, -6, 6, 13); r('#e8e8e8', -2, -9, 1, 3); r('#e8e8e8', 1, -9, 1, 3); r('#c8303a', -2, -9, 1, 1); }
      else if (k === 'scope') { r(c, -7, -2, 14, 5); r('#8ad8ff', 4, -1, 3, 3); r('#2a2a34', -3, 3, 2, 3); }
      else if (k === 'charm' || k === 'crystal') { g.fillStyle = c; g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 0); g.lineTo(0, 7); g.lineTo(-5, 0); g.fill(); r('rgba(255,255,255,.6)', -1, -4, 2, 3); if (k === 'charm') { r('#d8c070', -1, -9, 2, 2); } }
      else if (k === 'pouch') { r(c, -6, -3, 12, 9); r('#5a3616', -6, -4, 12, 2); r('#c8c8d0', -3, -8, 1, 5); r('#c8c8d0', 1, -8, 1, 5); }
      else if (k === 'boots') { r(c, -6, -6, 5, 10); r(c, -6, 3, 9, 4); r(c, 2, -6, 5, 10); r(c, 2, 3, 6, 4); r('rgba(255,255,255,.3)', -6, -6, 5, 1); }
      else if (k === 'shield') { g.fillStyle = c; g.beginPath(); g.moveTo(-6, -6); g.lineTo(6, -6); g.lineTo(6, 1); g.lineTo(0, 7); g.lineTo(-6, 1); g.fill(); r('rgba(0,0,0,.25)', -1, -5, 2, 11); }
      else if (k === 'coin') { g.fillStyle = c; g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fill(); r('#c89a1a', -1, -4, 2, 8); r('rgba(255,255,255,.5)', -4, -3, 2, 2); } }
    else if (it.pc) { r('#e8e8f0', -2, -7, 4, 3); r(it.pc, -5, -4, 10, 10); r('rgba(255,255,255,.5)', -3, -3, 2, 4); }
    else if (id === 'potion') { r('#e8e8f0', -2, -7, 4, 3); r('#ff3a5a', -5, -4, 10, 10); r('rgba(255,255,255,.5)', -3, -3, 2, 4); }
    else if (id === 'crown') { r('#3aa0ff', -7, -2, 14, 7); r('#ffd23f', -7, -6, 3, 4); r('#ffd23f', -2, -7, 3, 5); r('#ffd23f', 4, -6, 3, 4); }
    else if (id === 'eye') { r('#e8e8e8', -6, -5, 12, 10); r('#7a1a2a', -3, -3, 6, 6); r('#1a1a1a', -1, -1, 3, 3); }
    else if (id === 'totem') { r('#e8e0c8', -4, -7, 8, 7); r('#1a1a1a', -3, -5, 2, 2); r('#1a1a1a', 1, -5, 2, 2); r('#7a4e26', -1, 0, 2, 8); }
    else if (id === 'horn') { g.fillStyle = '#ff6a2a'; g.beginPath(); g.moveTo(-7, 5); g.quadraticCurveTo(0, -8, 7, -6); g.lineTo(5, -2); g.quadraticCurveTo(0, -2, -3, 6); g.fill(); }
    g.restore();
  }

  /* ---------- the character ---------- */
  function newChar() { const inv = Array(40).fill(null); inv[0] = { id: 'cpick', n: 1 }; inv[1] = { id: 'cax', n: 1 }; inv[2] = { id: 'csword', n: 1 }; inv[3] = { id: 'torch', n: 10 }; inv[4] = { id: 'potion', n: 2 }; return { inv, max: 100, mana: 20, gear: {} }; }
  const MODS = { none: { n: '' }, fine: { n: 'Fine', d: .05 }, keen: { n: 'Keen', c: .05 }, swift: { n: 'Swift', s: .1 }, brutal: { n: 'Brutal', d: .12, s: -.05 }, precise: { n: 'Precise', d: .04, c: .08 }, deft: { n: 'Deft', d: .04, s: .15 }, masterwork: { n: 'Masterwork', d: .15, s: .1, c: .05, w: .5 },
    flawed: { n: 'Flawed', d: -.1, bad: 1 }, sluggish: { n: 'Sluggish', s: -.12, bad: 1 }, dull: { n: 'Dull', d: -.15, c: -.03, bad: 1 }, broken: { n: 'Broken', d: -.25, s: -.1, bad: 1, w: .6 },
    arcane: { n: 'Arcane', d: .1, mp: -.15, only: 'magic' }, draining: { n: 'Draining', mp: .2, only: 'magic', bad: 1 }, hasty: { n: 'Hasty', s: .2, only: 'tool' }, clumsy: { n: 'Clumsy', s: -.15, only: 'tool', bad: 1 } };
  const NOM = { d: 0, s: 0, c: 0, mp: 0 };
  const moddable = id => { const it = IT[id]; return !!(it && it.one && (it.melee || it.bow || it.gun || it.magic || it.boom || it.pick || it.axe || it.hammer)); };
  function rollMod(id, not) { const it = IT[id], kind = it.magic ? 'magic' : (it.pick || it.axe || it.hammer) && !it.melee ? 'tool' : 'weapon'; if (R() < .18 && not !== 'none') return 'none';
    const L = Object.entries(MODS).filter(([k, m]) => k !== 'none' && k !== not && (!m.only || m.only === kind)); let tot = 0; for (const [, m] of L) tot += m.w || (m.bad ? 1 : 2); let r = R() * tot; for (const [k, m] of L) { r -= m.w || (m.bad ? 1 : 2); if (r <= 0) return k; } return L[0][0]; }
  const modOf = s => (s && s.m && MODS[s.m]) || null, modStats = s => { const m = modOf(s); return m ? { d: m.d || 0, s: m.s || 0, c: m.c || 0, mp: m.mp || 0 } : NOM; };
  const nameOf = s => { const m = modOf(s); return (m && m.n ? m.n + ' ' : '') + IT[s.id].n; };
  const modVal = s => { const m = modStats(s); return Math.max(.3, (1 + m.d + m.s * .8 + m.c * 2 - m.mp * .5) ** 2); };
  function modLine(s) { const m = modOf(s); if (!m || !m.n) return ''; const o = []; const f = (v, l) => { if (v) o.push((v > 0 ? '+' : '') + Math.round(v * 100) + '% ' + l); }; f(m.d, 'damage'); f(m.s, 'speed'); f(m.c, 'crit chance'); f(m.mp, 'mana cost'); return o.join(' · '); }
  let curCrit = 0, hoverCoin = -1;   // the crit bonus of the weapon being used right now, carried by its shots
  const COINS = ['pcoin', 'gcoin', 'scoin', 'ccoin'];
  const CIDS = ['ccoin', 'scoin', 'gcoin', 'pcoin'];
  const cslots = () => { if (!ch.cs) ch.cs = [0, 0, 0, 0]; return ch.cs; };
  function foldCoins() { if (!ch) return; let add = 0; ch.inv.forEach((s, i) => { if (s && IT[s.id] && IT[s.id].coin) { add += s.n * IT[s.id].coin; ch.inv[i] = null; } }); if (add) setMoney(money() + add); }
  const money = () => cslots().reduce((a, n, k) => a + n * IT[CIDS[k]].coin, 0);
  const CSB = k => ({ x: 400 + k * 43, y: 284, w: 40, h: 40 });
const ASB = k => ({ x: 589, y: 12 + k * 50, w: 46, h: 46 }); let hoverAm = -1;
const amS = () => { if (!ch.am || ch.am.length !== 4) ch.am = [null, null, null, null]; return ch.am; };
  function coinText(v) { const o = []; for (const [id, l] of [['pcoin', 'p'], ['gcoin', 'g'], ['scoin', 's'], ['ccoin', 'c']]) { const n = Math.floor(v / IT[id].coin); v -= n * IT[id].coin; if (n) o.push(n + l); } return o.join(' ') || '0c'; }
  // coins always sit in as few slots as possible: 100 copper become a silver, and so on
  function setMoney(v) { v = Math.max(0, Math.floor(v)); const cs = cslots(); for (let k = 3; k >= 0; k--) { const c = IT[CIDS[k]].coin, n = k === 3 ? Math.floor(v / c) : Math.floor(v / c) % 100; cs[k] = n; } for (let k = 3; k >= 0; k--) v -= cs[k] * IT[CIDS[k]].coin; if (v > 0) cs[0] += v; return true; }
  function giveCoins(c) { const before = money(), keep = ch.inv.slice(); if (setMoney(before + c)) return true; ch.inv = keep; return false; }
  function pay(c) { const m = money(); if (m < c) return false; const keep = ch.inv.slice(); if (!setMoney(m - c)) { ch.inv = keep; return false; } return true; }
  function coinLoot(v, loot) { for (const id of COINS) { const n = Math.floor(v / IT[id].coin); v -= n * IT[id].coin; if (n) loot.push([id, n]); } }
  // what things are worth, in copper; traders buy for a fifth of that
  const VAL = { mosspup: 20000, glowmoth: 30000, emberkit: 30000, frostling: 30000, pebbler: 50000, wobble: 40000, woodrod: 800, ironrod: 4000, glowrod: 9000, starrod: 40000, worm: 20, glowgrub: 60, lure: 300, minnow: 60, trout: 80, perch: 80, snapper: 150, frostfin: 300, gloomeel: 350, glowgill: 350, prismkoi: 1500, honeyfin: 300, cookedfish: 150, woodcrate: 500, ironcrate: 2000, goldcrate: 8000, hook: 3000, torch: 50, arrow: 5, lpotion: 300, potion: 1200, mpotion: 500, recall: 800, bucket: 2000, cpick: 1000, cax: 800, whammer: 500, chest: 500, platform: 10, lantern: 1000, knife: 50, shot: 7, sshot: 18, flint: 5000, musket: 15000, scope: 30000,
    mightp: 1500, eaglep: 1500, arcanep: 1500, edgep: 1500, hastep: 1000, stonep: 1500, vigorp: 1500, pactp: 2000, copper: 25, iron: 50, silver: 75, gold: 150, shadow: 300, hellstone: 500, cbar: 120, ibar: 200, sbar: 300, gbar: 600, shbar: 1200, hbar: 2000,
    gel: 5, lens: 30, bone: 20, star: 500, ember: 800, silk: 400, essence: 3000, life: 10000, mana: 6000, obsidian: 50, wood: 2, mush: 25 };
  function value(id) { const it = IT[id]; if (!it || it.coin) return 0; if (VAL[id]) return VAL[id]; const r = it.r || 0; if (it.one) return 2000 * (r + 1) * (r + 1); if (it.tile || it.wall) return it.tile && !SOLID.has(it.tile) ? 300 : 0; return 20 * (r + 1) * (r + 1); }
  function give(id, n = 1, m) { if (IT[id] && IT[id].coin) return giveCoins(n * IT[id].coin); if (IT[id] && IT[id].ammo && ch) { const a = amS().find(s => s && s.id === id); if (a) { a.n += n; return true; } } if (moddable(id)) { const i = ch.inv.findIndex(s => !s); if (i < 0) return false; ch.inv[i] = { id, n, m: m || rollMod(id) }; if (IT[id].r >= 2 || IT[id].one) say(`Got: ${nameOf(ch.inv[i])}`, 2.6, RAR[IT[id].r || 0]); return true; }
    for (const s of ch.inv) if (s && s.id === id && !IT[id].one) { s.n += n; return true; }
    const i = ch.inv.findIndex(s => !s); if (i < 0) return false; ch.inv[i] = { id, n }; if (IT[id].r >= 2 || IT[id].one) say(`Got: ${IT[id].n}`, 2.6, RAR[IT[id].r || 0]); return true;
  }
  const count = id => ch.inv.reduce((a, s) => a + (s && s.id === id ? s.n : 0), 0);
  function take(id, n) { for (const s of ch.inv) if (s && s.id === id) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (s.n <= 0) ch.inv[ch.inv.indexOf(s)] = null; if (!n) return; } }
  function stationNear(tile) { const cx = Math.floor(P.x), cy = Math.floor(P.y - 1); for (let x = cx - 5; x <= cx + 5; x++) for (let y = cy - 4; y <= cy + 4; y++) if (at(x, y) === tile) return true; return false; }
  const STN = { campfire: T.CAMPFIRE, bench: T.BENCH, furnace: T.FURNACE, anvil: T.ANVIL, starforge: T.STARFORGE, runeanvil: T.RUNEANVIL };
  const anyWood = r => r[0] !== 'platform' && r[0] !== 'woodwall';
  const woodHave = (k, r) => k === 'wood' && anyWood(r) ? WOODS.reduce((a, w) => a + count(w), 0) : count(k);
  const canCraft = r => (!r[3] || stationNear(STN[r[3]])) && Object.entries(r[2]).every(([k, n]) => woodHave(k, r) >= n);
  function craft(r) { if (!canCraft(r)) return; if (!ch.inv.some(s => !s || (s.id === r[0] && !IT[r[0]].one)) && !Object.keys(r[2]).some(k => count(k) === r[2][k])) return say('Your inventory is full.'); for (const [k, n] of Object.entries(r[2])) { if (k === 'wood' && anyWood(r)) { let left = n; for (const w of WOODS) { const c = Math.min(left, count(w)); if (c) { take(w, c); left -= c; } if (!left) break; } } else take(k, n); } give(r[0], r[1]); K.sfx(700, .06, 'square', .05); K.sfx(1050, .06, 'square', .05, 0, .06); if (!IT[r[0]].one && !(IT[r[0]].r >= 2)) say(`Crafted ${IT[r[0]].n}${r[1] > 1 ? ' x' + r[1] : ''}`); score += 5; }
  function say(t, d = 2.4, c = '#ffe680') { msg = { t, k: 0, d, c }; }

  /* ---------- bodies ---------- */
  function newPlayer() { const s = spawnPoint(); P = { x: s.x, y: s.y, vx: 0, vy: 0, w: .8, h: 1.9, hp: ch.max, mp: ch.mana, face: 1, ground: false, inv: 0, swing: 0, cd: 0, spawn: s, potCd: 0 }; unstick(P); }
  function moveBody(b, dt) { moveBody0(b, dt); if (!b.drop && b.vy >= 0 && !b.fly) stairSnap(b); }
  function stairSnap(b) { const cx = Math.floor(b.x); for (const cy of new Set([Math.floor(b.y - .02), Math.floor(b.y - .6), Math.floor(b.y + .3)])) { if (cy < 0 || cy >= WH || at(cx, cy) !== T.PLAT) continue; const sh = platSh(cx, cy); if (!sh) continue;
      const fx = b.x - cx, yS = cy + (sh === 1 ? 1 - fx : fx); if (b.y >= yS - .45 && b.y <= yS + .7 && !solid(b.x, yS - b.h)) { b.y = yS - .001; b.vy = 0; b.ground = true; return; } }
    { const cy = Math.floor(b.y - .02); if (at(cx, cy) === T.PLAT && !platSh(cx, cy) && b.y - cy < .55 && (platSh(cx - 1, cy) || platSh(cx + 1, cy) || platSh(cx - 1, cy + 1) || platSh(cx + 1, cy + 1)) && !solid(b.x, cy - b.h)) { b.y = cy - .001; b.vy = 0; b.ground = true; } } }
  function moveBody0(b, dt) {
    const hw = b.w / 2;
    let nx = b.x + b.vx * dt;
    const yTop = b.y - b.h + .05, yBot = b.y - .05;
    const blocked = x => { for (let y = Math.floor(yTop); y <= Math.floor(yBot); y++) if (solid(x, y)) return true; return false; };
    const edge = nx + (b.vx > 0 ? hw : -hw);
    if (b.vx !== 0 && blocked(edge)) {
      const fy = Math.floor(b.y - .05);
      if (b.ground && solid(edge, fy) && !solid(edge, fy - 1) && !solid(edge, fy - 2) && !solid(edge, fy - 3) && !solid(b.x, Math.floor(b.y - b.h - .9))) b.y = fy;
      else { nx = b.vx > 0 ? Math.floor(edge) - hw - .001 : Math.floor(edge) + 1 + hw + .001; b.vx = 0; b.bump = 1; }
    }
    b.x = clamp(nx, 1, WW - 1);
    b.vy = Math.min(b.vy + 48 * dt, 32); let ny = b.y + b.vy * dt; b.ground = false;
    for (const sx of [b.x - hw + .02, b.x + hw - .02]) {
      if (b.vy > 0 && solid(sx, ny)) { ny = Math.floor(ny) - .001; b.vy = 0; b.ground = true; }
      else if (b.vy > 0 && !b.drop && at(Math.floor(sx), Math.floor(ny)) === T.PLAT && !platSh(Math.floor(sx), Math.floor(ny)) && b.y <= Math.floor(ny) + .002) { ny = Math.floor(ny) - .001; b.vy = 0; b.ground = true; }
      if (b.vy < 0 && solid(sx, ny - b.h)) { ny = Math.floor(ny - b.h) + 1 + b.h + .001; b.vy = 0; }
    }
    b.y = clamp(ny, 2, WH - .5);
  }
  const BUFFS = { might: { n: 'Might', bon: { melee: .1 } }, eagle: { n: 'Eagle Eye', bon: { ranged: .1, crit: .05 } }, arcana: { n: 'Arcana', bon: { magic: .1, mana: 40 } }, edge: { n: 'Keen Edge', bon: { throw: .15 } },
    haste: { n: 'Haste', bon: { speed: .25 } }, pact: { n: 'Pact', bon: { minions: 1 } }, stone: { n: 'Stoneskin', bon: { def: 6 } }, vigor: { n: 'Vigor', bon: { regen: 1 } } };
  const gear = () => (ch && ch.gear) || {}, anyGear = () => SLOTS.some(k => gear()[k]);
  const setOf = () => { const G = gear(), s = G.head && IT[G.head] && IT[G.head].set; return s && SLOTS.every(k => G[k] && IT[G[k]] && IT[G[k]].set === s) ? s : null; };
  function fixGear(c) { if (!c) return; c.gear = c.gear || {}; if (c.armor) { if (IT[c.armor]) c.gear[IT[c.armor].slot || 'body'] = c.armor; delete c.armor; } }   // saves from before armor had three pieces
  const BKEYS = ['summon', 'minions', 'melee', 'ranged', 'magic', 'throw', 'crit', 'mana', 'mcost', 'speed', 'mspd', 'def', 'ammo', 'regen'];
  // every bonus you have right now: armor + up to three accessories + active potions
  function B() { const b = {}; for (const k of BKEYS) b[k] = 0; const add = o => { if (o) for (const k in o) b[k] += o[k]; };
    { const st = ch && setOf(); if (st) add(SETS[st].bon); } if (ch && ch.acc) for (const a of ch.acc) if (a && IT[a]) add(IT[a].bon); if (P && P.buffs) for (const k in P.buffs) if (P.buffs[k] > 0 && BUFFS[k]) add(BUFFS[k].bon); return b; }
  const dm = k => 1 + B()[k], maxMana = () => ch.mana + B().mana;
  const pct = v => Math.round(v * 100);
  function bonusText(b) { const o = []; for (const [k, l] of [['melee', 'melee'], ['ranged', 'ranged'], ['magic', 'magic'], ['throw', 'thrown'], ['summon', 'summon']]) if (b[k]) o.push(`+${pct(b[k])}% ${l} damage`); if (b.minions) o.push(`+${b.minions} max minion${b.minions > 1 ? 's' : ''}`);
    if (b.crit) o.push(`+${pct(b.crit)}% crit chance`); if (b.mspd) o.push(`+${pct(b.mspd)}% melee speed`); if (b.mana) o.push(`+${b.mana} max mana`); if (b.mcost) o.push(`-${pct(b.mcost)}% mana cost`);
    if (b.speed) o.push(`+${pct(b.speed)}% move speed`); if (b.def) o.push(`+${b.def} defense`); if (b.ammo) o.push(`${pct(b.ammo)}% chance to save ammo`); if (b.regen) o.push('faster life regen'); return o.join(' · '); }
  function classLine(b) { const o = []; for (const [k, l] of [['melee', 'Melee'], ['ranged', 'Ranged'], ['magic', 'Magic'], ['throw', 'Thrown'], ['summon', 'Summon']]) if (b[k]) o.push(`${l} +${pct(b[k])}%`); if (b.minions) o.push(`Minions ${1 + b.minions}`); if (b.crit) o.push(`Crit ${pct(b.crit)}%`); return o.join(' · '); }
  const def = () => SLOTS.reduce((a, k) => a + (gear()[k] && IT[gear()[k]] ? IT[gear()[k]].armor : 0), 0) + B().def;
  let lastHurt = null;
  function hurt(d, from, why) {
    if (P.inv > 0 || dead || mode !== 'play') return;
    d = Math.max(1, Math.round(d * DFX().dmg - def() * .6)); lastHurt = why || null;
    P.hp -= d; P.inv = .7; P.vy = -11; P.vx = (P.x < from ? -1 : 1) * 9; K.sfx(180, .12, 'square', .1, -60); K.shake(6);
    pops.push({ x: P.x, y: P.y - 3, t: 0, s: '-' + d, c: '#ff5a5a' });
    if (P.hp <= 0) { P.hp = 0; dead = { t: 0, msg: deathText(lastHurt) }; K.sfx(120, .6, 'sawtooth', .1, -60); if (online()) { MP.send({ t: 'dm', s: dead.msg }); feedAdd(dead.msg, '#ff8a8a'); } onDeath(); }
  }

  /* ---------- enemies ---------- */
  const KIND = {
    slime: { hp: 14, w: 1.5, h: 1.1, dmg: 7, sc: 10 }, zombie: { hp: 34, w: .9, h: 2.6, dmg: 13, sc: 20 }, eye: { hp: 26, w: 1.2, h: 1.2, dmg: 14, sc: 25, fly: 1 }, bat: { hp: 18, w: 1, h: .8, dmg: 11, sc: 15, fly: 1 },
    skeleton: { hp: 70, w: .9, h: 2.6, dmg: 24, sc: 45 }, imp: { hp: 90, w: 1.1, h: 1.6, dmg: 26, sc: 60, fly: 1 }, fb: { hp: 1, w: .8, h: .8, dmg: 22, fly: 1, proj: 1 }, dart: { hp: 1, w: .7, h: .4, dmg: 30, fly: 1, proj: 1 }, web: { hp: 1, w: 1, h: 1, dmg: 18, fly: 1, proj: 1 },
    weaver: { hp: 9000, w: 6, h: 3.2, dmg: 60, sc: 6000, boss: 1, fly: 1 }, spiderling: { hp: 45, w: 1.2, h: .8, dmg: 22, sc: 20 },
    stalker: { hp: 160, w: .9, h: 2.4, dmg: 32, sc: 70 }, thorn: { hp: 110, w: 1.3, h: 1, dmg: 28, sc: 60, fly: 1 }, guardian: { hp: 420, w: 1.3, h: 2.9, dmg: 48, sc: 160 }, sunspirit: { hp: 260, w: 1.3, h: 1.6, dmg: 40, sc: 140, fly: 1 },
    rime: { hp: 40, w: 1.5, h: 1.1, dmg: 16, sc: 25, ai: 'slime', c: '#a8ecff', loot: [['gel', 1, 2], ['frostgrip', .02]] },
    revenant: { hp: 80, w: .9, h: 2.6, dmg: 22, sc: 45, ai: 'zombie', tint: [170, .55, 1.3], loot: [['snow', .5, 5]] },
    frostbat: { hp: 30, w: 1, h: .8, dmg: 15, sc: 25, fly: 1, ai: 'bat', tint: [180, .7, 1.5], loot: [['ice', .5, 3]] },
    gnawer: { hp: 55, w: 1.3, h: .9, dmg: 20, sc: 40, fly: 1, ai: 'bat', tint: [250, 1.6, .85], loot: [['gloomscale', .6]] },
    crawler: { hp: 70, w: 1.2, h: .8, dmg: 22, sc: 45, ai: 'spiderling', tint: [210, 1.6, .85], loot: [['gloomscale', .4]] },
    sporebat: { hp: 35, w: 1, h: .8, dmg: 16, sc: 30, fly: 1, ai: 'bat', tint: [140, 1.8, 1.3], loot: [['glowcap', .5, 2]] },
    shambler: { hp: 90, w: .9, h: 2.6, dmg: 22, sc: 50, ai: 'skeleton', tint: [150, 1.4, 1.1], cap: 1, loot: [['glowcap', .7, 3], ['shroompike', .02]] },
    galewisp: { hp: 60, w: 1.3, h: 1, dmg: 20, sc: 50, fly: 1, ai: 'thorn', tint: [0, 0, 1.9], loot: [['sunfeather', .03], ['star', .2], ['cloud', .5, 4]] },
    wraith: { hp: 160, w: 1.2, h: 1.2, dmg: 34, sc: 120, fly: 1, ai: 'eye', tint: [260, .4, .6], loot: [['gloomshard', .3]] },
    brute: { hp: 260, w: 1.1, h: 2.6, dmg: 40, sc: 160, ai: 'skeleton', tint: [0, .15, .9], loot: [['azurite', .5, 4], ['viridium', .2, 3]] },
    buzzard: { hp: 46, w: 1.3, h: 1.2, dmg: 17, sc: 30, loot: [['potion', .04]] },
    prism: { hp: 140, w: 1.3, h: 1, dmg: 32, sc: 130, fly: 1, ai: 'thorn', tint: [300, 1.6, 1.3], loot: [['lumenshard', .5]] },
    lumenslime: { hp: 120, w: 1.5, h: 1.1, dmg: 30, sc: 100, ai: 'slime', c: '#ff9aff', loot: [['lumenshard', .3], ['gel', 1, 3]] },
    maw: { hp: 300, w: .9, h: 2.4, dmg: 44, sc: 170, ai: 'stalker', tint: [250, 1.5, .7], loot: [['gloomshard', .5]] },
    colossus: { hp: 3200, w: 4, h: 5, dmg: 40, sc: 2200, boss: 1, draw: 'colossus' }, gloom: { hp: 3800, w: 4.4, h: 3.4, dmg: 45, sc: 2600, boss: 1, fly: 1, draw: 'gloom' },
    sentinel: { hp: 16000, w: 3.6, h: 3.6, dmg: 70, sc: 9000, boss: 1, fly: 1, draw: 'sentinel' }, tyrant: { hp: 30000, w: 5.6, h: 5.6, dmg: 90, sc: 15000, boss: 1, fly: 1, draw: 'tyrant' },
    shard: { hp: 1, w: .8, h: .8, dmg: 26, fly: 1, proj: 1, draw: 'shard' }, gspit: { hp: 1, w: .8, h: .8, dmg: 30, fly: 1, proj: 1, draw: 'gspit' }, pshot: { hp: 1, w: .7, h: .7, dmg: 48, fly: 1, proj: 1, draw: 'pshot' }, vshot: { hp: 1, w: .9, h: .9, dmg: 60, fly: 1, proj: 1, draw: 'vshot' },
    king: { hp: 1400, w: 5, h: 4, dmg: 26, sc: 800, boss: 1 }, watcher: { hp: 2200, w: 4.4, h: 4.4, dmg: 30, sc: 1500, boss: 1, fly: 1 }, bone: { hp: 4200, w: 5, h: 5, dmg: 40, sc: 2500, boss: 1, fly: 1 }, ember: { hp: 7000, w: 5.4, h: 5.4, dmg: 55, sc: 5000, boss: 1, fly: 1 },
  };
  const PROJBY = { fb: 'a fireball', dart: 'a dart trap', web: 'a sticky web', shard: 'the Rime Colossus', gspit: 'the Gloom Mother', pshot: 'the Prismatic Sentinel', vshot: 'the Eclipse Tyrant' };
  function deathText(why) { const s = deathText0(why); return s.startsWith('You was ') ? 'You were ' + s.slice(8) : s; }
  function deathText0(why) { const p = (cslot >= 0 && chars()[cslot] && chars()[cslot].name) || (online() ? MP.name : 'You'), T_ = a => pick(a).replace('{p}', p);
    if (why === 'fall') return T_(['{p} hit the ground too hard.', '{p} forgot to look down.', '{p} took the fast way down.']);
    if (why === 'lava') return T_(['{p} tried to swim in lava.', '{p} got a little too toasty.', '{p} melted.']);
    if (why === 'burn') return T_(['{p} burned to a crisp.', "{p} couldn't put the fire out."]);
    if (why === 'spike') return T_(['{p} was impaled on spikes.', '{p} stepped where they should not have.']);
    if (why && (BNAME[why] || BOSSES[why] || PROJBY[why])) { const f = PROJBY[why] || (BOSSES[why] ? BOSSES[why].n.replace(/^The /, 'the ') : (/^[AEIOU]/.test(BNAME[why]) ? 'an ' : 'a ') + BNAME[why]);
      if (/slime/i.test(why)) return T_(['{p} was squished by F.', '{p} got gooed by F.']).replace('F', f);
      if (why === 'zombie') return T_(['{p} was eaten by F.', '{p} let F get a little too close.']).replace('F', f);
      if (why === 'dart') return T_(['{p} walked into a dart trap.', '{p} found a dart trap the hard way.']);
      return T_(['{p} was slain by F.', '{p} was torn apart by F.', '{p} lost a fight with F.', '{p} was defeated by F.']).replace('F', f); }
    return p + ' was slain.'; }
  const markBossDeath = id => { for (const e of ents) if (!e.dead && KIND[e.kind] && KIND[e.kind].boss) (e.deaths = e.deaths || new Set()).add(id); };
  function onDeath() { const m = (ch.cm | 0); markBossDeath(online() ? MP.id : 0);
    if (m === 1) { const v = Math.floor(money() / 2); if (v > 0) { setMoney(money() - v); const L = []; coinLoot(v, L); for (const [id, n] of L) dropItem(id, P.x, P.y - 1, n); say(coinText(v) + ' dropped where you fell!', 4, '#ffd36a'); } }
    if (m === 2) { ch.fallen = 1; dead.perm = 1; }
    saveAll(); }
  function spawnEnemy(kind, x, y, o = {}) { const C_ = spawnCtx; if (C_ && KIND[kind] && !KIND[kind].boss && !KIND[kind].proj) { if (kind === 'slime' && C_.left > 0 && R() < .87) { C_.left--; return { kind, x, y, w: 1, h: 1, hp: 1, max: 1, dead: 1, t: 0, vx: 0, vy: 0 }; } if (C_.left <= 0 || C_.at.some(q => Math.abs(q[0] - x) < 8 && Math.abs(q[1] - y) < 8) || ents.some(e => natural(e) && Math.abs(e.x - x) < 6 && Math.abs(e.y - y) < 6)) return { kind, x, y, w: 1, h: 1, hp: 1, max: 1, dead: 1, t: 0, vx: 0, vy: 0 }; C_.at.push([x, y]); C_.left--; } const k = KIND[kind]; const E = { id: eid++, kind, x, y, vx: 0, vy: 0, w: k.w, h: k.h, hp: k.hp * (online() ? 1 + others.size * .5 : 1) * (hard && !k.boss && !k.proj ? 2 : 1) * (k.proj ? 1 : k.boss ? DFX().boss : DFX().hp), t: R() * 2, hit: 0, fly: k.fly, ...o }; E.max = E.hp; if (kind === 'slime') E.c = E.c || pick(['#3aa0ff', '#4ac83a', '#c84aff']); ents.push(E); return E; }
  const CEN = new Set(['gloom', 'sentinel', 'tyrant', 'shard', 'gspit', 'pshot', 'vshot', 'wraith', 'prism', 'frostbat', 'gnawer', 'sporebat', 'galewisp', 'eye', 'bat', 'watcher', 'bone', 'ember', 'fb', 'dart', 'thorn', 'sunspirit', 'weaver', 'web']), top = e => CEN.has(e.kind) ? e.y - e.h / 2 : e.y - e.h, bot = e => CEN.has(e.kind) ? e.y + e.h / 2 : e.y, mid = e => (top(e) + bot(e)) / 2;
  const night = () => { const d = time % 1; return d > .62; };
  const dayLight = () => { const d = time % 1; return d < .07 ? .38 + d / .07 * .62 : d < .55 ? 1 : d < .62 ? 1 - (d - .55) / .07 * .62 : .38; };
  const allPlayers = () => [P, ...[...others.values()].filter(o => o.p && o.p.x != null && !o.dead).map(o => o.p)];
  function nearestP(x, y) { let b = P, d = 1e9; for (const p of allPlayers()) { const dd = Math.hypot(p.x - x, p.y - y); if (dd < d) { d = dd; b = p; } } return b; }
  let spawnCtx = null, farT = 0; const natural = e => { const k = KIND[e.kind]; return !!k && !k.boss && !k.proj; };
  function spawnLoop(dt) { try { spawnLoop1(dt); } finally { spawnCtx = null; } }
  function spawnLoop1(dt) {
    for (const pl of allPlayers()) {
      const W_ = pl.wave || (pl.wave = { left: 0, at: [], tries: 0 }); spawnCtx = null;
      if (!W_.left) { if (ents.some(e => natural(e) && Math.abs(e.x - pl.x) < 70 && Math.abs(e.y - pl.y) < 50) || R() > dt * .13 * DFX().spawn) continue;
        W_.left = Math.max(1, Math.round((1 + Math.floor(R() * 3) + (night() ? 1 : 0)) * Math.min(1.5, DFX().spawn))); W_.at = []; W_.tries = 0; }
      if (++W_.tries > 240) { W_.left = 0; continue; } spawnCtx = W_;
      const hw = (() => { const v = WV(); return (v.x1 - v.x0) / TS / 2 + 3; })(), side = R() < .5 ? -1 : 1, x = Math.floor(pl.x + side * rnd(Math.max(28, hw), Math.max(40, hw + 12))); if (x < 2 || x >= WW - 2) continue;
      const depth = pl.y - surf[clamp(Math.floor(pl.x), 0, WW - 1)];
      if (inTemple(pl)) { const cy = Math.floor(pl.y + rnd(-6, 6)), cx = Math.floor(pl.x + side * rnd(hw, hw + 8)); if (at(cx, cy) !== T.AIR || at(cx, cy - 1) !== T.AIR || !inTemple({ x: cx, y: cy })) continue; if (R() < .45) spawnEnemy('sunspirit', cx + .5, cy); else if (SOLID.has(at(cx, cy + 1))) spawnEnemy('guardian', cx + .5, cy + .99); continue; }
      const Z = zoneAt(pl);
      if (Z.sky) { spawnEnemy('galewisp', x + .5, pl.y - rnd(4, 10)); continue; }
      if (hard && (Z.radiant || (Z.blight && R() < .5) || (night() && depth < 8 && R() < .35))) { let gy = 0; while (gy < WH - 1 && !SOLID.has(at(x, gy))) gy++; const onGround = depth < 10 && Math.abs(gy - pl.y) < 25 && !PW(walls[(gy - 1) * WW + x]);
        if (Z.radiant) { if (onGround && R() < .45) spawnEnemy('lumenslime', x + .5, gy - .01); else spawnEnemy('prism', x + .5, pl.y - rnd(4, 10)); }
        else if (Z.blight) { if (onGround) spawnEnemy('maw', x + .5, gy - .01); else spawnEnemy('gnawer', x + .5, pl.y - rnd(4, 10)); } else spawnEnemy('wraith', x + .5, pl.y - rnd(8, 14)); continue; }
      if ((Z.snow || Z.blight) && depth < 10) { let y = 0; while (y < WH - 1 && !SOLID.has(at(x, y))) y++; if (Math.abs(y - pl.y) > 25 || PW(walls[(y - 1) * WW + x])) continue;
        if (Z.blight) { if (R() < .5) spawnEnemy('gnawer', x + .5, pl.y - rnd(6, 12)); else spawnEnemy('crawler', x + .5, y - .01); } else if (night() && R() < .6) spawnEnemy('revenant', x + .5, y - .01); else spawnEnemy('rime', x + .5, y - .01); continue; }
      if (inJungle(pl.x) && depth < 10) { let y = 0; while (y < WH - 1 && !SOLID.has(at(x, y))) y++; if (Math.abs(y - pl.y) > 25) continue; if (R() < .55) spawnEnemy('stalker', x + .5, y - .01); else spawnEnemy('thorn', x + .5, pl.y - rnd(8, 14)); continue; }
      if (depth < 8) {
        let y = 0; while (y < WH - 1 && !SOLID.has(at(x, y))) y++; if (Math.abs(y - pl.y) > 25 || PW(walls[(y - 1) * WW + x])) continue;
        if (night()) { if (R() < .55) spawnEnemy('zombie', x + .5, y - .01); else spawnEnemy('eye', x + .5, pl.y - rnd(10, 16)); if (R() < .35) addDrop({ id: 'star', n: 1, x: pl.x + rnd(-20, 20), y: pl.y - 22, vx: rnd(-2, 2), vy: 8, t: 0 }); }
        else if (at(x, y) === T.SAND && R() < .18) spawnEnemy('buzzard', x + .5, y - .01);
        else if (R() < .6) spawnEnemy('slime', x + .5, y - .01);
      } else {
        const cy = Math.floor(pl.y + rnd(-8, 8)), cx = Math.floor(pl.x + side * rnd(hw, hw + 10));
        if (at(cx, cy) !== T.AIR || at(cx, cy - 1) !== T.AIR) continue;
        if (pl.y > HELL) { spawnEnemy('imp', cx + .5, cy); continue; }
        if (hard && R() < .3 && SOLID.has(at(cx, cy + 1))) { spawnEnemy('brute', cx + .5, cy + .99); continue; }
        if (Z.glow) { if (R() < .5) spawnEnemy('sporebat', cx + .5, cy); else if (SOLID.has(at(cx, cy + 1))) spawnEnemy('shambler', cx + .5, cy + .99); continue; }
        if (Z.blight) { if (R() < .4) spawnEnemy('gnawer', cx + .5, cy); else if (SOLID.has(at(cx, cy + 1))) spawnEnemy('crawler', cx + .5, cy + .99); continue; }
        if (Z.snow) { if (R() < .5) spawnEnemy('frostbat', cx + .5, cy); else if (SOLID.has(at(cx, cy + 1))) spawnEnemy('rime', cx + .5, cy + .99); continue; }
        if (inJungle(pl.x)) { if (R() < .45) spawnEnemy('thorn', cx + .5, cy); else if (SOLID.has(at(cx, cy + 1))) spawnEnemy('stalker', cx + .5, cy + .99); continue; }
        if (R() < .4) { spawnEnemy('bat', cx + .5, cy); continue; }
        if (!SOLID.has(at(cx, cy + 1)) || PW(walls[cy * WW + cx])) continue;
        spawnEnemy(pl.y > 120 && R() < .6 ? 'skeleton' : R() < .5 ? 'slime' : 'zombie', cx + .5, cy + .99, { c: '#8a4aff' });
      }
    }
  }
  const BPH2 = { king: ['slimes', 3.2], watcher: ['eyes', 4.5], bone: ['ring', 3, 'fb', 8, { bone: true }], ember: ['ring', 2.6, 'fb', 10], colossus: ['rain', 2.4, 'shard', 6], gloom: ['ring', 3, 'gspit', 7], sentinel: ['ring', 2.4, 'pshot', 9], tyrant: ['ring', 2.2, 'vshot', 10], weaver: ['web', 3] };
  function bossPhase(e, dt) { const nm = (BOSSES[e.kind] || { n: 'The boss' }).n;
    if (!e.ph && e.hp <= e.max * .5) { e.ph = 1; e.phT = 1.4; const s = `${nm} grows furious!`; say(s, 3.5, '#ff6a5a'); K.shake(16); K.sfx(55, 1.1, 'sawtooth', .12, 40); if (online()) MP.send({ t: 'bl', s }); }
    if (e.phT > 0) { e.phT -= dt; e.vx *= .85; e.vy *= .85; e.hit = Math.max(e.hit, .06); return true; }
    if (!e.ph) return false; e.rage = 1; const B2 = BPH2[e.kind]; if (!B2) return false; if ((e.p2 = (e.p2 || 0) + dt) < B2[1]) return false; e.p2 = 0;
    const tp = nearestP(e.x, e.y), cx = e.x, cy = e.y - e.h / 2, kind = B2[0];
    if (kind === 'ring') { const n = B2[3], o = R() * 6.28; for (let i = 0; i < n; i++) { const a = o + i / n * 6.28; spawnEnemy(B2[2], cx + Math.cos(a) * .8, cy + Math.sin(a) * .8, { vx: Math.cos(a) * 11, vy: Math.sin(a) * 11, life: 3.5, ...(B2[4] || {}) }); } K.sfx(300, .2, 'square', .05, -200); }
    else if (kind === 'rain') { for (let i = 0; i < B2[3]; i++) spawnEnemy('shard', tp.x + rnd(-7, 7), tp.y - 13 - R() * 3, { vx: 0, vy: 6, life: 4 }); }
    else if (kind === 'slimes') { if (ents.filter(q => q.kind === 'slime').length < 8) for (const s of [-1, 1]) spawnEnemy('slime', cx + s * 2, e.y - .2, { c: '#3a7aff' }); }
    else if (kind === 'eyes') { if (ents.filter(q => q.kind === 'eye').length < 6) for (const s of [-1, 1]) spawnEnemy('eye', cx + s * 2.5, cy); }
    else if (kind === 'web') { for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; spawnEnemy('web', cx, cy, { vx: Math.cos(a) * 10, vy: Math.sin(a) * 10, life: 3 }); } if (ents.filter(q => q.kind === 'spiderling').length < 6) spawnEnemy('spiderling', cx, e.y); }
    return false; }
  function enemyAI(e, dt) { if (KIND[e.kind] && KIND[e.kind].boss && !e.dead) { if (bossPhase(e, dt)) return; if (e.ph) dt *= 1.25; } const al = KIND[e.kind].ai; if (!al) return enemyAI0(e, dt); const k = e.kind; e.kind = al; try { enemyAI0(e, dt); } finally { e.kind = k; } }
  function enemyAI0(e, dt) {
    e.t += dt; if (e.hit > 0) e.hit -= dt; const tp = nearestP(e.x, e.y), dx = tp.x - e.x, dir = Math.sign(dx) || 1;
    if (e.kind === 'slime') { if (e.ground) { e.vx *= .8; if (e.t > 1.4) { e.t = 0; e.vy = -rnd(13, 17); e.vx = dir * rnd(5, 8); } } moveBody(e, dt); }
    else if (e.kind === 'zombie' || e.kind === 'skeleton') { const sp = e.kind === 'skeleton' ? 5.4 : 4.2; e.vx += (dir * sp - e.vx) * Math.min(1, dt * 3); if (e.ground && e.bump && e.t > .6) { e.vy = -15; e.t = 0; } e.bump = 0; moveBody(e, dt); }
    else if (e.kind === 'buzzard') { const d = Math.hypot(dx, tp.y - e.y);
      if (!e.st) { e.fly = 0; e.vx *= .8; moveBody(e, dt); if ((d < 13 && e.t > .5) || e.hit > 0) { e.st = 1; e.fly = 1; e.vy = -9; e.t = 0; } }
      else { e.fly = 1; if (e.st === 1 && e.t > 2.6) { e.st = 2; e.t = 0; } else if (e.st === 2 && (e.t > 1.2 || e.y > tp.y - .4)) { e.st = 1; e.t = 0; }
        const dv = e.st === 2, tx = dv ? tp.x : tp.x + Math.cos(e.t * 1.7 + e.id) * 7, ty = dv ? tp.y - 1.1 : tp.y - 7 + Math.sin(e.t * 2.4) * 1.2, sp = dv ? 16 : 9;
        e.vx += ((tx - e.x) * 2 - e.vx) * dt * 2.2; e.vy += ((ty - e.y) * 2 - e.vy) * dt * 2.2; const m = Math.hypot(e.vx, e.vy); if (m > sp) { e.vx *= sp / m; e.vy *= sp / m; }
        e.x += e.vx * dt; e.y += e.vy * dt; if (solid(e.x, e.y) || solid(e.x, e.y - e.h)) { e.x -= e.vx * dt * 2; e.y -= e.vy * dt * 2; e.vx *= -.5; e.vy = -Math.abs(e.vy) * .6; if (e.st === 2) { e.st = 1; e.t = 0; } } }
      e.rage = e.st ? 1 : 0; }
    else if (e.kind === 'eye' || e.kind === 'bat') { const sp = e.kind === 'bat' ? 11 : 9, ty = tp.y - 2.2 + Math.sin(e.t * (e.kind === 'bat' ? 6 : 2)) * 2; e.vx += (dir * sp - e.vx) * dt * 1.2; e.vy += (Math.sign(ty - e.y) * sp * .8 - e.vy) * dt * 1.2; e.x += e.vx * dt; e.y += e.vy * dt; if (solid(e.x, e.y)) { e.vx *= -.6; e.vy *= -.6; e.x += e.vx * dt * 2; e.y += e.vy * dt * 2; } }
    else if (e.kind === 'imp') { const tx = tp.x - dir * 8, ty = Math.max(HELL + 2, tp.y - 4); e.vx += ((tx - e.x) * 1.2 - e.vx) * dt; e.vy += ((ty - e.y) * 1.2 - e.vy) * dt; e.x += e.vx * dt; e.y += e.vy * dt; if (e.y < HELL + 1.5) { e.y = HELL + 1.5; if (e.vy < 0) e.vy = 0; } if (e.t > 2.2 && tp.y > HELL - 6) { e.t = 0; const d = Math.hypot(dx, tp.y - 1.4 - e.y) || 1; spawnEnemy('fb', e.x, e.y - .8, { vx: dx / d * 12, vy: (tp.y - 1.4 - e.y) / d * 12, life: 4 }); } }
    else if (e.kind === 'stalker' || e.kind === 'guardian') { const sp = e.kind === 'stalker' ? 7 : 4.6; e.vx += (dir * sp - e.vx) * Math.min(1, dt * 3); if (e.ground && (e.bump || (e.kind === 'stalker' && Math.abs(dx) < 6 && e.t > 1.6)) && e.t > .5) { e.vy = e.kind === 'stalker' ? -18 : -14; e.t = 0; } e.bump = 0; moveBody(e, dt); }
    else if (e.kind === 'thorn') { const ty = tp.y - 2 + Math.sin(e.t * 5) * 2; e.vx += (dir * 13 - e.vx) * dt * 1.4; e.vy += (Math.sign(ty - e.y) * 10 - e.vy) * dt * 1.4; e.x += e.vx * dt; e.y += e.vy * dt; if (solid(e.x, e.y)) { e.vx *= -.6; e.vy *= -.6; e.x += e.vx * dt * 2; e.y += e.vy * dt * 2; } }
    else if (e.kind === 'sunspirit') { const tx = tp.x - dir * 7, ty = tp.y - 4; e.vx += ((tx - e.x) * 1.4 - e.vx) * dt; e.vy += ((ty - e.y) * 1.4 - e.vy) * dt; e.x += e.vx * dt; e.y += e.vy * dt; if (e.t > 1.6) { e.t = 0; const d = Math.hypot(dx, tp.y - 1.4 - e.y) || 1; for (const a of [-.15, .15]) spawnEnemy('fb', e.x, e.y - .5, { vx: (dx / d * Math.cos(a) - (tp.y - 1.4 - e.y) / d * Math.sin(a)) * 14, vy: ((tp.y - 1.4 - e.y) / d * Math.cos(a) + dx / d * Math.sin(a)) * 14, life: 4 }); } }
    else if (e.kind === 'dart') { e.x += e.vx * dt; if ((e.life -= dt) <= 0 || solid(e.x, e.y)) e.dead = 1; }
    else if (e.kind === 'spiderling') { e.vx += (dir * 8.5 - e.vx) * Math.min(1, dt * 4); if (e.ground && (e.bump || e.t > 1.2)) { e.vy = -13; e.t = 0; } e.bump = 0; moveBody(e, dt); }
    else if (e.kind === 'shard' || e.kind === 'gspit' || e.kind === 'pshot' || e.kind === 'vshot') { if (e.kind === 'shard') e.vy += 18 * dt * (Math.abs(e.vy) > 0 || e.vx === 0 ? 1 : 0); e.x += e.vx * dt; e.y += e.vy * dt; if ((e.life -= dt) <= 0 || solid(e.x, e.y)) e.dead = 1; }
    else if (e.kind === 'fb' || e.kind === 'web') { e.x += e.vx * dt; e.y += e.vy * dt; if ((e.life -= dt) <= 0 || solid(e.x, e.y)) e.dead = 1; }
    else bossAI(e, tp, dt);
    if (!KIND[e.kind].boss && !KIND[e.kind].proj && Math.abs(dx) > 70) e.dead = 1;
    if ((e.kind === 'zombie' || e.kind === 'eye') && !night() && tp.y < surf[clamp(Math.floor(e.x), 0, WW - 1)] && R() < dt * .2) e.dead = 1;
  }
  function weaverAI(e, tp, dt) {
    const A = temple && temple.arena; if (!A) { e.dead = 1; return; } const rage = e.rage = e.hp < e.max / 2; e.pt = (e.pt || 0) + dt; e.wt = (e.wt || 0) + dt; e.st = (e.st || 0) + dt;
    const ceil = A.y0 + 5.2, flo = A.y1 - 2 - 1.7; if (!e.m) e.m = 'crawl';
    if (e.m === 'crawl') { e.vx += (Math.sign(tp.x - e.x) * (rage ? 15 : 10) - e.vx) * dt * 2; e.vy = (ceil - e.y) * 4; if (e.pt > (rage ? 2.2 : 3.4) && Math.abs(tp.x - e.x) < 10) { e.m = 'drop'; e.pt = 0; e.vy = 4; e.vx = (tp.x - e.x) * .8; K.sfx(120, .4, 'sawtooth', .08, -60); } }
    else if (e.m === 'drop') { e.vy = Math.min(34, e.vy + 75 * dt); if (e.y >= flo) { e.y = flo; e.m = 'land'; e.pt = 0; K.shake(10); e.vx = 0; } }
    else if (e.m === 'land') { e.vx *= .9; if (e.pt > (rage ? .5 : .9)) { e.m = 'climb'; e.pt = 0; } }
    else if (e.m === 'climb') { e.vy = -15; e.vx *= .95; if (e.y <= ceil) { e.m = 'crawl'; e.pt = 0; } }
    e.x = clamp(e.x + e.vx * dt, A.x0 + 6, A.x1 - 6); e.y = clamp(e.y + e.vy * dt, ceil - 1, flo);
    if (e.m === 'crawl' && e.wt > (rage ? 1.3 : 2.2)) { e.wt = 0; const dx = tp.x - e.x, dy = tp.y - 1.4 - e.y, d = Math.hypot(dx, dy) || 1; for (const a of rage ? [-.22, 0, .22] : [0]) spawnEnemy('web', e.x, e.y + 1.2, { vx: (dx / d * Math.cos(a) - dy / d * Math.sin(a)) * 15, vy: (dy / d * Math.cos(a) + dx / d * Math.sin(a)) * 15, life: 3 }); }
    if (e.st > (rage ? 4 : 6.5)) { e.st = 0; if (ents.filter(q => q.kind === 'spiderling').length < (rage ? 6 : 4)) for (let i = 0; i < 2; i++) spawnEnemy('spiderling', e.x + rnd(-2, 2), e.y + 1); }
    if (!allPlayers().some(inArena)) { if ((e.away = (e.away || 0) + dt) > 20) { e.dead = 1; boss = null; say('The Weaver Queen retreats into her webs.', 3); } } else e.away = 0;
  }
  // helpers for the new bosses
  function shoot2(kind, e, tx, ty, sp, spreadA = 0, n = 1, life = 4) { const dx = tx - e.x, dy = ty - e.y, a0 = Math.atan2(dy, dx); for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * spreadA; spawnEnemy(kind, e.x, e.y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life }); } }
  function ring(kind, e, n, sp, off = 0) { for (let i = 0; i < n; i++) { const a = off + i / n * Math.PI * 2; spawnEnemy(kind, e.x, e.y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 5 }); } }
  function hoverTo(e, tx, ty, dt, k = 3) { e.vx += (tx - e.x) * dt * k - e.vx * dt * 2; e.vy += (ty - e.y) * dt * k - e.vy * dt * 2; }
  function newBossAI(e, tp, dt) {
    const rage = e.rage = e.hp < e.max / 2; e.pt = (e.pt || 0) + dt; e.st = (e.st || 0) + dt; const ty = tp.y - 1.4;
    if (e.kind === 'colossus') {   // stomps toward you, leaps and sends shards when it lands, lobs ice
      if (e.ground) { e.vx += (Math.sign(tp.x - e.x) * (rage ? 6.5 : 4.5) - e.vx) * Math.min(1, dt * 2); if (e.air) { e.air = 0; K.shake(10); K.sfx(60, .4, 'square', .1, -20); for (const d of [-1, 1]) spawnEnemy('shard', e.x + d * 2.5, e.y - .6, { vx: d * 15, vy: 0, life: 2.2 }); }
        if (e.pt > (rage ? 2.2 : 3.2)) { e.pt = 0; e.vy = -24; e.vx = Math.sign(tp.x - e.x) * 10; e.air = 1; } if (e.bump && e.pt > .4) { e.vy = -16; e.air = 1; } }
      e.bump = 0; moveBody(e, dt);
      if (e.st > (rage ? 1.5 : 2.4)) { e.st = 0; shoot2('shard', { x: e.x, y: e.y - 4 }, tp.x, ty - 2, 17, .18, rage ? 3 : 1); }
      if (Math.abs(tp.x - e.x) > 60) { e.x = tp.x + 20; e.y = tp.y - 20; } return; }
    if (e.kind === 'gloom') {   // hovers and spits, then dives; in a rage she calls her brood
      if (!e.m) e.m = 'hover'; if (e.m === 'hover') { hoverTo(e, tp.x + Math.cos(e.t * .8) * 11, tp.y - 9 + Math.sin(e.t * 1.6) * 2, dt); if (e.st > (rage ? .9 : 1.5)) { e.st = 0; shoot2('gspit', e, tp.x, ty, 13, .22, 3); K.sfx(150, .15, 'sawtooth', .05, -60); } if (e.pt > (rage ? 2.4 : 3.6)) { e.m = 'dive'; e.pt = 0; const dx = tp.x - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1; e.vx = dx / d * 26; e.vy = dy / d * 26; K.sfx(90, .5, 'sawtooth', .08, 80); } }
      else { e.vx *= 1 - dt * .5; e.vy *= 1 - dt * .5; if (e.pt > 1) { e.m = 'hover'; e.pt = 0; } }
      if (rage && (e.bt = (e.bt || 0) + dt) > 6) { e.bt = 0; for (let i = 0; i < 2; i++) spawnEnemy('crawler', e.x + rnd(-2, 2), e.y); }
      e.x += e.vx * dt; e.y += e.vy * dt; return; }
    if (e.kind === 'sentinel') {   // keeps its distance, fires rings of light, blinks next to you
      hoverTo(e, tp.x + (e.side || 1) * 12, tp.y - 8 + Math.sin(e.t * 2) * 2, dt, 2.4);
      if (e.st > (rage ? 1.6 : 2.5)) { e.st = 0; ring('pshot', e, rage ? 12 : 8, 12, e.t); K.sfx(880, .2, 'sine', .06, 300); }
      if (rage && (e.vt = (e.vt || 0) + dt) > .5) { e.vt = 0; shoot2('pshot', e, tp.x, ty, 20, 0, 1); }
      if (e.pt > (rage ? 4 : 6)) { e.pt = 0; e.side = -(e.side || 1); e.x = tp.x + e.side * 9; e.y = tp.y - 7; e.vx = e.vy = 0; e.flash = .4; K.sfx(1200, .15, 'sine', .07, -600); }
      if (e.flash > 0) e.flash -= dt; e.x += e.vx * dt; e.y += e.vy * dt; return; }
    if (e.kind === 'tyrant') {   // circles and bursts; in a rage it charges three times in a row and calls wraiths
      if (!night()) { e.dead = 1; boss = null; say('The Eclipse Tyrant retreats from the dawn.', 4); return; }
      if (!e.m) e.m = 'orbit';
      if (e.m === 'orbit') { const a = e.t * .7; hoverTo(e, tp.x + Math.cos(a) * 14, tp.y - 9 + Math.sin(a * 2) * 4, dt, 2.2); if (e.st > (rage ? 1.1 : 1.8)) { e.st = 0; if (R() < .5) ring('vshot', e, rage ? 14 : 10, 11, e.t); else shoot2('vshot', e, tp.x, ty, 16, .16, 5); K.sfx(70, .4, 'sawtooth', .08, 40); }
        if (e.pt > (rage ? 4 : 6)) { e.m = 'charge'; e.pt = 0; e.n = rage ? 3 : 1; } }
      if (e.m === 'charge') { if (e.pt > .9 || !e.cv) { e.pt = 0; if (e.n-- <= 0) { e.m = 'orbit'; e.cv = 0; } else { const dx = tp.x - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1; e.vx = dx / d * 30; e.vy = dy / d * 30; e.cv = 1; K.sfx(55, .6, 'sawtooth', .1, 60); } } else { e.vx *= 1 - dt * .4; e.vy *= 1 - dt * .4; } }
      if (rage && (e.wt = (e.wt || 0) + dt) > 8) { e.wt = 0; for (let i = 0; i < 2; i++) spawnEnemy('wraith', e.x + rnd(-4, 4), e.y + rnd(-2, 2)); }
      e.x += e.vx * dt; e.y += e.vy * dt; return; }
  }
  function bossAI(e, tp, dt) {
    if (KIND[e.kind].draw) return newBossAI(e, tp, dt);
    if (e.kind === 'weaver') return weaverAI(e, tp, dt);
    const rage = e.rage = e.hp < e.max / 2; e.pt = (e.pt || 0) + dt;
    if (e.kind === 'king') {
      if (e.ground) { e.vx *= .85; if (e.pt > (rage ? 1.1 : 1.8)) { e.pt = 0; e.vy = -rnd(20, 26); e.vx = Math.sign(tp.x - e.x) * rnd(8, 13); if (R() < .5) spawnEnemy('slime', e.x, e.y - 2); } }
      moveBody(e, dt); if (Math.abs(tp.x - e.x) > 60) { e.x = tp.x + 20; e.y = tp.y - 20; }
      return;
    }
    const hover = e.kind === 'ember' ? 10 : 9;
    if (!e.m || (e.m === 'hover' && e.pt > (rage ? 1.3 : 2.4))) { e.m = 'charge'; e.pt = 0; const dx = tp.x - e.x, dy = tp.y - 1.4 - e.y, d = Math.hypot(dx, dy) || 1, sp = (e.kind === 'bone' ? 18 : e.kind === 'ember' ? 26 : 22) * (rage ? 1.3 : 1); e.vx = dx / d * sp; e.vy = dy / d * sp; K.sfx(90, .5, 'sawtooth', .08, 80); }
    else if (e.m === 'charge' && e.pt > .9) { e.m = 'hover'; e.pt = 0; }
    if (e.m === 'hover') { const tx = tp.x + Math.cos(e.t * .9) * 10, ty = tp.y - hover + Math.sin(e.t * 1.7) * 2; e.vx += (tx - e.x) * dt * 3 - e.vx * dt * 2; e.vy += (ty - e.y) * dt * 3 - e.vy * dt * 2;
      if ((e.kind === 'bone' || e.kind === 'ember') && R() < dt * (rage ? 2.2 : 1.2)) { const dx = tp.x - e.x, dy = tp.y - 1.4 - e.y, d = Math.hypot(dx, dy) || 1; for (const a of e.kind === 'ember' ? [-.25, 0, .25] : [0]) spawnEnemy('fb', e.x, e.y, { vx: (dx / d * Math.cos(a) - dy / d * Math.sin(a)) * 13, vy: (dy / d * Math.cos(a) + dx / d * Math.sin(a)) * 13, life: 4, bone: e.kind === 'bone' }); } }
    else { e.vx *= 1 - dt * .6; e.vy *= 1 - dt * .6; }
    e.x += e.vx * dt; e.y += e.vy * dt;
    if (e.kind === 'watcher' && !night()) { e.dead = 1; boss = null; say('The Watcher drifts away with the sunrise.', 4); }
    if (!e.dead && e.deaths && KIND[e.kind] && KIND[e.kind].boss && isHost()) { const ids = [online() ? MP.id : 0, ...(online() ? others.keys() : [])]; if (ids.every(i => e.deaths.has(i))) { e.dead = 1; if (boss === e) boss = null; for (const q of ents) if (q !== e && KIND[q.kind] && KIND[q.kind].boss) q.dead = 1; const s = `${(BOSSES[e.kind] || { n: 'The boss' }).n} has left. Everyone fell.`; say(s, 5, '#ff9aff'); if (online()) MP.send({ t: 'bl', s }); } }
  }
  function hitEnemy(e, d, kx, fire, xc = 0) {
    if (!e || e.dead) return; const crit = R() < B().crit + xc; d = Math.round(d * rnd(.85, 1.15) * (fire ? 1.15 : 1) * (crit ? 2 : 1));
    pops.push({ x: e.x, y: e.y - e.h - .3, t: 0, s: crit ? d + '!' : String(d), c: crit ? '#ffd23f' : fire ? '#ff9a3a' : '#fff' });
    e.hit = .15; K.sfx(260, .06, 'square', .08);
    if (!isHost()) { MP.send({ t: 'hit', id: e.id, d, kx }); return; }
    applyHit(e, d, kx, online() ? MP.id : 0);
  }
  function applyHit(e, d, kx, by) { if (e.phT > 0) return;
    e.hp -= d; e.hit = .15; if (!KIND[e.kind].boss) { e.vx += kx * 9; if (!e.fly) e.vy = -7; }
    if (e.hp <= 0 && !e.dead) {
      e.dead = 1; const K_ = KIND[e.kind], loot = []; if (K_.loot) for (const [lid, lp, ln] of K_.loot) if (R() < lp) loot.push([lid, ln ? 1 + Math.floor(R() * ln) : 1]); if (K_.loot && R() < DFX().loot) for (const [lid, lp, ln] of K_.loot) if (R() < lp) loot.push([lid, ln ? 1 + Math.floor(R() * ln) : 1]); if (!K_.proj) coinLoot(Math.round((K_.sc || 5) * rnd(2.5, 4) * (K_.boss ? 2 : 1) * (hard ? (K_.boss ? 1.5 : 2.5) : 1) * DFX().coin), loot);
      if (e.kind === 'slime') loot.push(['gel', 1 + Math.floor(R() * 2)]);
      if (e.kind === 'eye' && R() < .6) loot.push(['lens', 1]);
      if (e.kind === 'stalker' || e.kind === 'thorn') { if (R() < .3) loot.push(['potion', 1]); if (R() < .04) loot.push([pick(['vinebow', 'thorns']), 1]); }
      if (e.kind === 'guardian' || e.kind === 'sunspirit') { loot.push(['gbar', 1 + Math.floor(R() * 2)]); if (R() < .05) loot.push([pick(['sunblade', 'sunstaff', 'wemb', 'remb', 'semb', 'temb', 'cemb']), 1]); }
      if (e.kind === 'zombie' && R() < .06) loot.push([pick(['isword', 'potion', 'knife']), 1]);
      if (e.kind === 'zombie' || KIND[e.kind].ai === 'zombie') { const h = mobHash(e); if ((h >>> 5) % 4 === 0) loot.push([ZHOLD[(h >>> 9) % ZHOLD.length], 1]); }
      if (e.kind === 'slime' && R() < .005) loot.push(['slstaff', 1]);
      if (e.kind === 'skeleton') { loot.push(['bone', 1 + Math.floor(R() * 3)]); if (R() < .04) loot.push(['skstaff', 1]); if (R() < .05) loot.push([pick(['flint', 'trident', 'water']), 1]); }
      if (e.kind === 'bat' && R() < .2) loot.push(['potion', 1]);
      if (e.kind === 'sporebat' && R() < .04) loot.push(['glowmoth', 1]); if (e.kind === 'king' && R() < .33) loot.push(['wobble', 1]); if (e.kind === 'imp') { if (R() < .03) loot.push(['emberkit', 1]); loot.push(['ember', 1]); if (R() < .04) loot.push(['flame', 1]); }
      if (K_.boss) { const B = BOSSES[e.kind]; loot.push([B.drop[0], 1], [B.drop[1], B.drop[1].endsWith('bar') ? 8 : 1], [B.drop[2], 10], ['potion', 4], ['essence', 3 + Math.floor(R() * 3)]); if (e.kind === 'ember' && R() < .2) loot.push(['wyrm', 1]); boss = null; downed[e.kind] = 1; bossDown(e.kind); }
      for (const [id, n] of loot) { if (K_.boss && online()) { drops.push({ id, n, x: e.x, y: e.y - .5, vx: rnd(-3, 3), vy: -rnd(4, 8), t: 0 }); for (const [oid] of others) MP.to(oid, { t: 'drop', id, n, x: e.x, y: e.y - .5 }); } else giveDrop(by, id, n, e.x, e.y - .5); }
      if (!online() || by === MP.id) { score += K_.sc || 0; if (!K_.proj) { ch.best = ch.best || {}; ch.best[e.kind] = (ch.best[e.kind] || 0) + 1; } }
    }
  }
  function giveDrop(to, id, n, x, y) { addDrop({ id, n, x, y, vx: rnd(-3, 3), vy: -rnd(4, 8), t: 0 }); }
  function bossDown(k) {
    say(`${BOSSES[k].n.toUpperCase()} HAS BEEN DEFEATED!`, 5, '#ff7aff'); K.chime(523, [0, 4, 7, 12, 16, 19]); K.shake(18);
    if (online() && isHost()) MP.send({ t: 'boss', k });
    if (k === 'ember' && !demo && !hard && isHost()) { const sd = Math.floor(R() * 2147483647); startHardmode(sd); if (online()) MP.send({ t: 'hm', sd }); }
    if (k === 'watcher') setTimeout(() => say('Shadow ore glimmers somewhere deep below...', 5, '#b07aff'), 5200);
  }

  /* ---------- using the selected item ---------- */
  const SEETHRU = new Set();
  function clearLine(x0, y0, x1, y1, tx = -9, ty = -9) { const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / .2), sx0 = Math.floor(x0), sy0 = Math.floor(y0); for (let i = 1; i < n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n, cx = Math.floor(x), cy = Math.floor(y); if ((cx === tx && cy === ty) || (cx === sx0 && cy === sy0)) continue; if (SOLID.has(at(cx, cy))) return false; } return true; }
  function seeTile(tx, ty) { for (const ey of [P.y - 2.3, P.y - 1.6, P.y - .6]) for (const [ox, oy] of [[.5, .5], [.5, .04], [.5, .96], [.04, .5], [.96, .5], [.08, .08], [.92, .08], [.08, .92], [.92, .92]]) if (clearLine(P.x, ey, tx + ox, ty + oy, tx, ty)) return true; return false; }
  const reach = (x, y, r = 5.6) => Math.hypot(x + .5 - P.x, y + .5 - (P.y - 1.4)) <= r && seeTile(x, y);
  // with the inventory open, an item picked up on the cursor is the one you use in the world
  const cur = () => invOpen && held && !bag() ? held : ch.inv[sel];
  const spendOne = s => { s.n--; if (s.n <= 0) { if (s === held) held = null; else { const i = ch.inv.indexOf(s); if (i >= 0) ch.inv[i] = null; } } };
  function use(tx, ty, wx, wy, dt, first) {
    const s = cur(), it = s && IT[s.id]; if (dead) return;
    if (first === true && reach(tx, ty) && isDoor(at(tx, ty)) && !(it && (it.pick || it.axe || it.hammer))) { toggleDoor(tx, ty); return; }   // a click opens or shuts a door unless you are swinging a tool at it
    if (first === true) { const n = npcAt(wx, wy); if (n && !it && Math.hypot(n.x - P.x, n.y - P.y) < 7) { talkTo(n); return; } }   // right-click always talks; a plain click only with an empty hand
    if (!it) return;
    const M = modStats(s); curCrit = M.c;
    P.face = wx >= P.x ? 1 : -1;
    const aim = () => { const dx = wx - P.x, dy = wy - (P.y - 1.5), d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; };
    if ((it.pick || it.axe || it.hammer) && !it.melee && reach(tx, ty) && decoFind(tx, ty) && !brokenDeco.has(decoFind(tx, ty).k)) { if (P.swing <= 0) { P.swing = .3; hitDeco(tx, ty); } return; }
    if (it.melee || ((it.pick || it.axe || it.hammer) && ents.some(e => !KIND[e.kind].proj && Math.hypot(e.x - (P.x + P.face * 1.4), mid(e) - (P.y - 1.4)) < 2.4 + e.h / 2 && Math.abs(e.x - wx) < 3))) {
      if (P.swing <= 0 && P.cd <= 0) melee(it, aim(), M); if (!it.pick && !it.axe && !it.hammer) return;
    }
    if (it.bow || it.gun) {
      if (P.cd > 0) return; const ammoK = it.bow ? 'arrow' : 'shot', slot = it.free ? null : amS().find(x => x && IT[x.id].ammo === ammoK) || ch.inv.find(x => x && IT[x.id].ammo === ammoK);
      if (!it.free && !slot) { if (first === true) say(`No ${it.bow ? 'arrows' : 'musket balls'}!`); return; }
      const am = slot ? IT[slot.id] : { dmg: 0 }, [ax, ay] = aim(); P.cd = it.cd / (1 + M.s); P.swing = .2;
      for (let i = 0; i < (it.shots || 1); i++) { const a = (i - ((it.shots || 1) - 1) / 2) * .08; shoot(it.gun ? (it.free ? 'gel' : 'bullet') : (it.fire || am.fire ? 'farrow' : 'arrow'), ax * Math.cos(a) - ay * Math.sin(a), ay * Math.cos(a) + ax * Math.sin(a), ((it.bow || it.gun) + am.dmg) * dm('ranged') * (1 + M.d), it.fire || am.fire); }
      if (slot && R() >= B().ammo) { slot.n--; if (slot.n <= 0) { const ai = amS().indexOf(slot); if (ai >= 0) ch.am[ai] = null; else ch.inv[ch.inv.indexOf(slot)] = null; } } K.sfx(it.gun ? 140 : 600, .1, it.gun ? 'sawtooth' : 'triangle', .07, it.gun ? -60 : -300); return;
    }
    if (it.boom) { if (projs.some(p => p.k === 'boom' && p.mine)) return; const [ax, ay] = aim(); shoot('boom', ax, ay, it.boom * dm('throw') * (1 + M.d), 0, { c: it.c }); P.swing = .25; return; }
    if (it.throw) { if (P.cd > 0) return; const [ax, ay] = aim(); shoot('knife', ax, ay, it.dmg * dm('throw')); P.cd = .3; if (R() >= B().ammo) spendOne(s); return; }
    if (it.magic) { if (P.cd > 0) return; const cost = Math.max(1, Math.round(it.mp * (1 - B().mcost) * (1 + M.mp))); if (P.mp < cost) { if (first === true) say('Not enough mana.'); return; } P.mp -= cost; P.cd = (it.proj === 'spark' ? .25 : .45) / (1 + M.s); const [ax, ay] = aim(); if (it.proj === 'star') { const ox = P.x + rnd(-6, 6); shoot('star', 0, 1, it.magic * dm('magic') * (1 + M.d), 0, { sx: ox, sy: P.y - 20, tx: wx, ty: wy }); } else shoot(it.proj, ax, ay, it.magic * dm('magic') * (1 + M.d), it.fire, { home: it.home, bounce: it.bounce }); K.sfx(900, .08, 'sine', .06, -500); P.swing = .2; return; }
    if (it.bucket) { if (first !== true || !reach(tx, ty) || !liq) return; P.swing = .25; const i0 = ty * WW + tx, changed = [];
      if (it.bucket === 'empty') { if (!liq[i0]) return; const k = lqk[i0]; let got = 0; const took = [];
        for (let rr = 0; rr <= 2 && got < 8; rr++) for (let dy = -rr; dy <= rr && got < 8; dy++) for (let dx = -rr; dx <= rr && got < 8; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== rr) continue; const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= WW || y >= WH) continue; const j = y * WW + x; if (!liq[j] || lqk[j] !== k) continue; const m = Math.min(liq[j], 8 - got); liq[j] -= m; got += m; if (!liq[j]) lqk[j] = 0; took.push([j, m]); }
        if (got < 8) { for (const [j, m] of took) { liq[j] += m; lqk[j] = k; } return say('Not enough liquid here to fill a bucket.'); }
        spendOne(s); const out = ['', 'wbucket', 'lbucket', 'hbucket'][k]; if (!give(out, 1)) dropItem(out, P.x, P.y - 1, 1); K.sfx(340, .12, 'sine', .06, 200); for (const [j] of took) changed.push([j, liq[j], lqk[j]]); }
      else { const k = it.bucket; if (tiles[i0] !== T.AIR || liq[i0]) return say('Pour it into an empty space.'); liq[i0] = 8; lqk[i0] = k; spendOne(s); if (!give('bucket', 1)) dropItem('bucket', P.x, P.y - 1, 1); K.sfx(260, .14, 'sine', .06, -160); changed.push([i0, 8, k]); }
      if (online() && changed.length) MP.send({ t: 'lq', c: changed }); return; }
    if (it.rod) { if (first !== true) return; return rodUse(it, wx, wy); }
    if (it.hook) { if (first !== true) return; const dx = wx - P.x, dy = wy - (P.y - 1.2), d = Math.hypot(dx, dy) || 1; P.hook = { x: P.x, y: P.y - 1.2, vx: dx / d * 40, vy: dy / d * 40, st: 'fly' }; K.sfx(700, .06, 'square', .04, -300); P.swing = .2; return; }
    if (it.summon) { if (first !== true) return; if (P.mp < it.mp) return say('Not enough mana.'); P.mp -= it.mp; P.swing = .3; summonMinion(it); return; }
    if (it.hammer) {   // hammers knock down background walls
      if (P.swing <= 0) P.swing = .3;
      const i0 = ty * WW + tx; if (tx < 0 || ty < 0 || tx >= WW || ty >= WH || !reach(tx, ty) || !walls[i0]) { mine = null; return; }
      if (SOLID.has(tiles[i0])) { mine = null; if (first === true) say('Clear the block in front of the wall first.'); return; }
      if (!mine || mine.x !== tx || mine.y !== ty || !mine.w) mine = { x: tx, y: ty, p: 0, w: 1 };
      mine.p += dt * it.hammer * (1 + M.s) / (PW(walls[i0]) ? .3 : .5);
      if (R() < dt * 8) K.sfx(150, .05, 'square', .04, -30);
      if (mine.p >= 1) breakWall(tx, ty);
      return;
    }
    if (it.axe) {
      if (P.swing <= 0) P.swing = .3;
      const t = at(tx, ty); if (!t || t === T.WATER || !reach(tx, ty)) { mine = null; return; }
      if ((t === T.CHEST || t === T.GCHEST) && chests[tx + ',' + ty] && chests[tx + ',' + ty].length) { if (first === true) openChest(tx, ty); return; }
      if (!WOODY.has(t)) { mine = null; return; }
      if (!mine || mine.x !== tx || mine.y !== ty) mine = { x: tx, y: ty, p: 0 };
      mine.p += dt * it.axe * (1 + M.s) * .75 / (HARD[t] * .24);
      if (R() < dt * 8) K.sfx(180, .05, 'triangle', .05, -40);
      if (mine.p >= 1) { axeCut = true; breakTile(tx, ty); axeCut = false; }
      return;
    }
    if (it.pick) {
      if (P.swing <= 0) P.swing = .3;
      const t = at(tx, ty); if (!t || t === T.WATER || !reach(tx, ty)) { mine = null; return; }
      if ((t === T.CHEST || t === T.GCHEST) && chests[tx + ',' + ty] && chests[tx + ',' + ty].length) { if (first === true) openChest(tx, ty); return; }
      if (NEED[t] && it.pick < NEED[t]) return;
      if (!mine || mine.x !== tx || mine.y !== ty) mine = { x: tx, y: ty, p: 0 };
      mine.p += dt * it.pick * (1 + M.s) * (WOODY.has(t) ? .1 : 1) / (HARD[t] * .24);
      if (R() < dt * 8) K.sfx(SOLID.has(t) && t !== 1 && t !== 2 && t !== 14 ? 320 : 140, .04, 'square', .04);
      if (mine.p >= 1) breakTile(tx, ty);
      return;
    }
    if (it.wall) {   // hold to paint walls, like blocks but behind everything
      if (!reach(tx, ty) || tx < 1 || ty < 1 || tx >= WW - 1 || ty >= WH - 1) return; const i0 = ty * WW + tx; if (walls[i0]) return;
      if (tiles[i0] === T.AIR && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => walls[(ty + b) * WW + tx + a] || at(tx + a, ty + b) !== T.AIR)) return;
      editWall(tx, ty, it.wall); spendOne(s); K.sfx(180, .04, 'square', .04); P.swing = .2; score += 1; return;
    }
    if (it.tile && (first !== 'hold' || (anim - (P.placeT || 0) > .06 && it.tile !== T.DOOR && !it.spawn && ![T.STARFORGE, T.RUNEANVIL, T.BENCH, T.FURNACE, T.ANVIL, T.CHEST, T.GCHEST, T.MUSH, T.TABLE, T.CHAIR, T.CAMPFIRE, T.BED, T.BOOKS].includes(it.tile) && at(tx, ty) === T.AIR)) && reach(tx, ty)) {
      if (at(tx, ty) === T.CHEST || at(tx, ty) === T.GCHEST) return openChest(tx, ty);
      if (at(tx, ty) !== T.AIR && at(tx, ty) !== T.WATER) return;
      if (it.tile === T.DOOR) return placeDoor(tx, ty, s);
      if (it.tile === T.SAPLING && at(tx, ty + 1) !== T.GRASS) { if (first !== 'hold') say('Acorns only take root in grass.', 1.6); return; }
      const support = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => SOLID.has(at(tx + a, ty + b)) || at(tx + a, ty + b) === T.TRUNK || at(tx + a, ty + b) === T.PLAT || at(tx + a, ty + b) === T.DOORO) || walls[ty * WW + tx];
      if (!support) return;
      if ([T.STARFORGE, T.RUNEANVIL, T.BENCH, T.FURNACE, T.ANVIL, T.CHEST, T.MUSH, T.TABLE, T.CHAIR, T.CAMPFIRE, T.BED, T.BOOKS].includes(it.tile)) { if (!SOLID.has(at(tx, ty + 1))) return; }
      else if (it.tile !== T.TORCH && it.tile !== T.LANTERN && it.tile !== T.PLAT && Math.abs(tx + .5 - P.x) < .9 && ty >= Math.floor(P.y - P.h) && ty <= Math.floor(P.y - .01)) return;
      if (SOLID.has(it.tile) && bodyIn(tx, ty)) return;
      editTile(tx, ty, it.tile); if (it.tile === T.PLAT) placePlat(tx, ty, it.pv | 0); spendOne(s); P.placeT = anim; if (it.spawn) { P.spawn = { x: tx + .5, y: ty + .99 }; say('Spawn point set.', 2.4, '#7aff7a'); } K.sfx(200, .05, 'square', .06); P.swing = .25; score += 1;
      return;
    }
    if (first !== true) return;
    if ((at(tx, ty) === T.CHEST || at(tx, ty) === T.GCHEST) && reach(tx, ty)) return openChest(tx, ty);
    if (it.use) useItem(it, s);
    if ((it.armor || it.acc) && s === ch.inv[sel]) equip(sel);
  }
  function equip(i) { const s = ch.inv[i]; if (s && IT[s.id].acc) return equipAcc(i); if (!s || !IT[s.id].armor) return; ch.gear = ch.gear || {}; const k = IT[s.id].slot || 'body', old = ch.gear[k]; ch.gear[k] = s.id; ch.inv[i] = old ? { id: old, n: 1 } : null; K.sfx(500, .1, 'square', .05, 200); const st = setOf(); say(`Equipped ${IT[s.id].n} (+${IT[s.id].armor} defense)` + (st && IT[s.id].set === st && bonusText(SETS[st].bon) ? ` · ${SETS[st].n} set bonus: ${bonusText(SETS[st].bon)}` : ''), 2.6, RAR[IT[s.id].r || 0]); }
  function useItem(it, s) {
    const u = it.use, spend = () => spendOne(s);
    if (u === 'heal') { if (P.potCd > 0) return; P.hp = Math.min(ch.max, P.hp + 100); P.potCd = 30; spend(); K.sfx(700, .2, 'sine', .07, 300); pops.push({ x: P.x, y: P.y - 3, t: 0, s: '+100', c: '#5aff7a' }); }
    if (u === 'lheal') { if (P.potCd > 0) return; P.hp = Math.min(ch.max, P.hp + 50); P.potCd = 30; spend(); K.sfx(700, .2, 'sine', .07, 300); pops.push({ x: P.x, y: P.y - 3, t: 0, s: '+50', c: '#5aff7a' }); }
    if (u === 'mpot') { if (P.mp >= maxMana()) return say('Your mana is already full.'); P.mp = Math.min(maxMana(), P.mp + 100); spend(); K.sfx(900, .2, 'sine', .07, 300); pops.push({ x: P.x, y: P.y - 3, t: 0, s: '+100 mana', c: '#7ab0ff' }); }
    if (u === 'home') { if (P.homeCd > 0) return say(`The Lodestar is recharging (${Math.ceil(P.homeCd)}s).`); P.homeCd = 5; P.x = P.spawn.x; P.y = P.spawn.y; P.vx = P.vy = 0; unstick(P); K.chime(587, [0, 7, 12, 19]); say('The Lodestar carries you home.', 2, '#7affee'); return; }
    if (u === 'recall') { spend(); P.x = P.spawn.x; P.y = P.spawn.y; P.vx = P.vy = 0; unstick(P); K.chime(523, [0, 7, 12]); say('Back home.', 2, '#7affee'); }
    if (u.startsWith('buff:')) { const k = u.slice(5); P.buffs = P.buffs || {}; P.buffs[k] = 180; spend(); K.sfx(800, .2, 'sine', .07, 200); say(`${BUFFS[k].n} for 3 minutes: ${bonusText(BUFFS[k].bon)}`, 2.6, '#ffe680'); return; }
    if (u === 'life') { if (ch.max >= 400) return say('You cannot get any healthier.'); ch.max += 20; P.hp += 20; spend(); K.chime(659, [0, 4, 7, 12]); say('Max life +20!', 2.4, '#ff6a7a'); }
    if (u === 'mana') { if (ch.mana >= 200) return say('Your mana is maxed.'); ch.mana += 20; P.mp += 20; spend(); K.chime(784, [0, 4, 7, 12]); say('Max mana +20!', 2.4, '#7ab0ff'); }
    if (u.startsWith('crate:')) { const got = CRATES[u.slice(6)](); spend(); for (const [id, n] of got) if (!give(id, n)) dropItem(id, P.x, P.y - 1, n); K.chime(587, [0, 4, 7, 12]); return say('Opened: ' + got.map(([id, n]) => IT[id].n + (n > 1 ? ' x' + n : '')).join(', '), 4, '#ffe680'); }
    if (u.startsWith('boss:')) {
      const k = u.slice(5);
      if (ents.some(e => KIND[e.kind].boss)) return say('A boss is already here.');
      if (k === 'watcher' && !night()) return say('Nothing happens. Try again at night.');
      if (k === 'colossus' && !zone.snow) return say('The idol wants the cold of the Frostmarch.');
      if (k === 'gloom' && !zone.blight) return say('Nothing stirs. Offer it in the Blight.');
      if (k === 'sentinel' && !hard) return say('The key does not turn. The world is not hard enough yet.');
      if (k === 'sentinel' && !zone.radiant) return say('The key only turns in the Radiance.');
      if (k === 'tyrant' && (!hard || !night())) return say(hard ? 'The sigil only answers at night.' : 'The sigil is silent. The world is not hard enough yet.');
      if (k === 'bone' && P.y < DY(100)) return say('The totem only stirs deep underground.');
      if (k === 'ember' && P.y < HELL) return say('The horn wants the heat of the underworld.');
      spend(); summon(k, P.x, P.y); if (online() && !isHost()) MP.send({ t: 'sum', k, x: P.x, y: P.y });
    }
  }
  function summon(k, x, y) { say(`${BOSSES[k].n} has awoken!`, 4, '#ff7aff'); K.sfx(70, 1.2, 'sawtooth', .12, 40); K.shake(14); if (isHost()) boss = spawnEnemy(k, x + 14, k === 'king' || k === 'colossus' ? y - 18 : y - 14); }
  function melee(it, [ax, ay], M = NOM) {
    const spear = it.reach, cd = (spear ? .38 : .34) / (1 + B().mspd) / (1 + M.s); P.swing = cd; P.cd = cd; K.sfx(500, .06, 'triangle', .05, -200);
    const dmg = (it.melee || it.dmg) * dm('melee') * (1 + M.d), range = spear || 1.9, cx = P.x + (spear ? ax * range * .6 : P.face * 1.4), cy = P.y - 1.4 + (spear ? ay * range * .6 : 0);
    for (const e of ents) if (!KIND[e.kind].proj && Math.abs(e.x - cx) < range * (spear ? .7 : 1) + e.w / 2 && Math.abs(mid(e) - cy) < 1.8 + e.h / 2 && (clearLine(P.x, P.y - 1.4, e.x, mid(e)) || clearLine(P.x, P.y - .5, e.x, bot(e) - .3) || clearLine(P.x, P.y - 1.8, e.x, top(e) + .3))) hitEnemy(e, dmg, P.face * (it.kb || 1), it.fire, M.c);
    for (let x = Math.floor(cx - range); x <= Math.floor(cx + range); x++) for (let y = Math.floor(cy - 1.8); y <= Math.floor(cy + 1.8); y++) if (reach(x, y)) hitDeco(x, y, true);
    if (it.beam) shoot('beam', ax, ay, dmg * .7, 0); if (it.stars) for (let i = 0; i < 2; i++) shoot('star', 0, 1, dmg * .5, 0, { sx: P.x + rnd(-8, 8), sy: P.y - 20, tx: P.x + ax * 8 + rnd(-2, 2), ty: P.y - 1.5 + ay * 8 });
  }
  function equipAcc(i) { const s = ch.inv[i]; if (!s) return; ch.acc = ch.acc || [null, null, null];
    if (ch.acc.includes(s.id)) return say('You are already wearing one of those.'); let j = ch.acc.indexOf(null); if (j < 0) j = 0; const old = ch.acc[j]; ch.acc[j] = s.id; ch.inv[i] = old ? { id: old, n: 1 } : null;
    K.sfx(500, .1, 'square', .05, 200); say(`Equipped ${IT[s.id].n}: ${bonusText(IT[s.id].bon)}`, 2.6, RAR[IT[s.id].r || 0]); }
  /* ---------- minions: summoned helpers that follow you and fight ---------- */
  const MINI = { firefly: { n: 'Firefly', dmg: 6, spd: 16, c: '#ffe680' }, slime: { n: 'Baby Slime', dmg: 8, spd: 11, c: '#3aa0ff' }, wisp: { n: 'Wisp', dmg: 12, spd: 15, c: '#9ae8ff' },
    skull: { n: 'Floating Skull', dmg: 14, spd: 13, c: '#e8e0c8' }, falcon: { n: 'Gilded Falcon', dmg: 18, spd: 21, c: '#ffd23f' }, fang: { n: 'Shadow Fang', dmg: 23, spd: 18, c: '#8a5ad8' },
    sprite: { n: 'Ember Sprite', dmg: 21, spd: 12, c: '#ff6a2a', shoot: 'flame', rate: .9 }, wyrm: { n: 'Starwyrm', dmg: 44, spd: 25, c: '#ffe680' }, spider: { n: 'Spiderling', dmg: 34, spd: 22, c: '#9a5ae8' } };
  let minions = [];
  const maxMinions = () => 1 + Math.floor(B().minions);
  function summonMinion(it) { const M = MINI[it.summon]; minions.push({ k: it.summon, x: P.x, y: P.y - 3, vx: 0, vy: 0, t: R() * 6, cd: 0, hits: {}, tr: [] }); while (minions.length > maxMinions()) minions.shift(); K.chime(440, [0, 7, 12]); say(`${M.n} summoned (${minions.length}/${maxMinions()})`, 2, '#c87aff'); }
  function stepMinions(dt) {
    while (minions.length > maxMinions()) minions.shift();
    minions.forEach((m, i) => { const M = MINI[m.k]; m.t += dt; if (m.cd > 0) m.cd -= dt; for (const id in m.hits) if ((m.hits[id] -= dt) <= 0) delete m.hits[id];
      if (dead || Math.hypot(m.x - P.x, m.y - P.y) > 45) { m.x = P.x; m.y = P.y - 3; m.vx = m.vy = 0; }
      let tg = null, best = 22; for (const e of ents) { if (KIND[e.kind].proj || e.dead) continue; const d = Math.hypot(e.x - P.x, mid(e) - P.y); if (d < best) { best = d; tg = e; } }
      const home = [P.x - P.face * (1.6 + i * 1.3), P.y - 4.2 - Math.sin(m.t * 2 + i) * .5]; let gx, gy, sp = M.spd;
      if (tg && !M.shoot) { gx = tg.x; gy = mid(tg); } else { [gx, gy] = tg ? [P.x + (tg.x > P.x ? 1 : -1) * 2, P.y - 5] : home; if (!tg) sp = Math.max(7, sp * .7); }
      const dx = gx - m.x, dy = gy - m.y, d = Math.hypot(dx, dy) || 1, want = Math.min(sp, d * 4);
      m.vx += (dx / d * want - m.vx) * Math.min(1, dt * 6); m.vy += (dy / d * want - m.vy) * Math.min(1, dt * 6); m.x += m.vx * dt; m.y += m.vy * dt;
      m.tr.unshift([m.x, m.y]); if (m.tr.length > 14) m.tr.pop();
      const dmg = M.dmg * dm('summon');
      if (tg && M.shoot && m.cd <= 0) { const ax = tg.x - m.x, ay = mid(tg) - m.y, dd = Math.hypot(ax, ay) || 1; shoot(M.shoot, ax / dd, ay / dd, dmg, 1, { sx: m.x, sy: m.y }); m.cd = M.rate; }
      if (tg && !M.shoot) for (const e of ents) if (!KIND[e.kind].proj && !e.dead && !m.hits[e.id] && Math.abs(e.x - m.x) < e.w / 2 + .7 && Math.abs(mid(e) - m.y) < e.h / 2 + .7) { m.hits[e.id] = .45; hitEnemy(e, dmg, Math.sign(m.vx) || 1); m.vx *= -.6; m.vy = -6; }
    });
  }
  function drawMinions(g) { drawMinionList(g, minions); for (const [, o] of others) if (o.mins && o.mins.length && o.p && !o.dead) { for (const m of o.mins) { m.x += (m.tx - m.x) * .25; m.y += (m.ty - m.y) * .25; m.t += 1 / 60; if (m.k === 'wyrm') { m.tr.unshift([m.x, m.y]); if (m.tr.length > 14) m.tr.length = 14; } } drawMinionList(g, o.mins); } }
  function drawMinionList(g, list) {
    for (const m of list) { const M = MINI[m.k], X = sx(m.x), Y = sy(m.y), f = m.vx < 0 ? -1 : 1, fl = Math.sin(m.t * 18) > 0, r = (c, a, b, w, h) => { g.fillStyle = c; g.fillRect(X + a * f - (f < 0 ? w : 0), Y + b, w, h); };
      if (m.k === 'wyrm') { for (let j = m.tr.length - 1; j >= 0; j -= 2) { const [tx, ty] = m.tr[j]; g.fillStyle = j ? (j % 4 ? '#c8a830' : '#ffe680') : '#fff2a0'; g.beginPath(); g.arc(sx(tx), sy(ty), j ? 8 - j * .3 : 10, 0, 7); g.fill(); } r('#2a1a40', 3, -4, 3, 3); continue; }
      const glow = g.createRadialGradient(X, Y, 1, X, Y, 18); glow.addColorStop(0, M.c + '55'); glow.addColorStop(1, M.c + '00'); g.fillStyle = glow; g.fillRect(X - 18, Y - 18, 36, 36);
      if (m.k === 'spider') { g.strokeStyle = '#2a1a30'; g.lineWidth = 1.5; for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(X + s * i, Y); g.lineTo(X + s * (5 + i), Y - 5 + (fl ? 1 : -1) * (i % 2)); g.lineTo(X + s * (8 + i), Y + 3); g.stroke(); } g.fillStyle = '#5a2a78'; g.beginPath(); g.ellipse(X, Y, 6, 4, 0, 0, 7); g.fill(); r('#c89a30', -1, -3, 2, 5); r('#ff6a3a', 4, -1, 1, 1); }
      else if (m.k === 'firefly') { r('#3a3a2a', -3, -2, 6, 4); r('#ffe680', -2, 1, 4, 3); r('rgba(220,240,255,.8)', -4, fl ? -6 : -4, 4, 3); }
      else if (m.k === 'slime') { g.fillStyle = M.c; g.beginPath(); g.ellipse(X, Y, 9, 7, 0, 0, 7); g.fill(); r('#fff', 1, -3, 3, 3); r('#1a1a1a', 2, -2, 1, 2); r('rgba(255,255,255,.5)', -5, -4, 3, 2); }
      else if (m.k === 'wisp') { g.fillStyle = '#e8faff'; g.beginPath(); g.arc(X, Y, 5, 0, 7); g.fill(); g.fillStyle = M.c; g.beginPath(); g.arc(X - f * 6, Y + 2, 3, 0, 7); g.arc(X - f * 10, Y + 3, 2, 0, 7); g.fill(); }
      else if (m.k === 'skull') { r(M.c, -6, -6, 12, 10); r(M.c, -4, 4, 8, 3); r('#1a1a1a', -4, -3, 3, 3); r('#1a1a1a', 2, -3, 3, 3); r('#ff5a3a', -3, -2, 1, 1); r('#ff5a3a', 3, -2, 1, 1); }
      else if (m.k === 'falcon') { r(M.c, -4, -3, 9, 6); r('#c89a1a', 4, -2, 3, 2); r(M.c, -6, fl ? -8 : 1, 7, 4); r('#1a1a1a', 3, -2, 1, 1); }
      else if (m.k === 'fang') { r(M.c, -6, -4, 12, 8); r(M.c, 5, -2, 4, 5); r('#e8e8e8', 6, 3, 1, 2); r('#e8e8e8', 8, 3, 1, 2); r('#ff3a7a', 2, -2, 2, 2); r(M.c, -4, -7, 3, 3); }
      else if (m.k === 'sprite') { r(M.c, -4, -5, 8, 10); r('#ffd23f', -2, -3, 4, 4); r('#ff9a3a', -6, fl ? -6 : -2, 3, 4); r('#5a1a10', -3, -8, 2, 3); r('#5a1a10', 2, -8, 2, 3); r('#fff', 1, -3, 2, 2); }
    }
  }
  /* ---------- projectiles ---------- */
  function shoot(k, ax, ay, dmg, fire, o = {}) {
    const sp = { arrow: 24, farrow: 24, bullet: 40, gel: 22, boom: 20, knife: 26, spark: 16, missile: 14, water: 18, skull: 15, flame: 18, beam: 22, star: 30 }[k], p = { k, x: o.sx ?? P.x + ax * .8, y: o.sy ?? P.y - 1.6 + ay * .8, vx: ax * sp, vy: ay * sp, dmg, fire, life: k === 'boom' ? 3 : 2.2, mine: 1, hit: new Set(), ...o };
    if (k === 'star') { const d = Math.hypot(o.tx - p.x, o.ty - p.y) || 1; p.vx = (o.tx - p.x) / d * sp; p.vy = (o.ty - p.y) / d * sp; }
    p.crit = o.crit ?? curCrit; projs.push(p); if (online()) MP.send({ t: 'pr', k, x: +p.x.toFixed(2), y: +p.y.toFixed(2), vx: +p.vx.toFixed(2), vy: +p.vy.toFixed(2), c: o.c });
  }
  function stepProjs(dt) {
    for (const p of projs) {
      p.life -= dt; if (p.life <= 0) { p.dead = 1; continue; }
      if (p.k === 'arrow' || p.k === 'farrow' || p.k === 'knife') p.vy += 22 * dt; if (p.k === 'gel') p.vy += 30 * dt;
      if (p.home && p.mine) { const t = ents.filter(e => !KIND[e.kind].proj).reduce((b, e) => { const d = Math.hypot(e.x - p.x, mid(e) - p.y); return d < b.d ? { e, d } : b; }, { e: null, d: 14 }).e; if (t) { const dx = t.x - p.x, dy = mid(t) - p.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(p.vx, p.vy); p.vx += (dx / d * sp - p.vx) * dt * 4; p.vy += (dy / d * sp - p.vy) * dt * 4; } }
      if (p.k === 'boom') { p.t = (p.t || 0) + dt; if (p.t > .5) { const dx = P.x - p.x, dy = P.y - 1.4 - p.y, d = Math.hypot(dx, dy) || 1; p.vx += dx / d * 60 * dt; p.vy += dy / d * 60 * dt; if (d < 1 && p.mine) p.dead = 1; } }
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      if (solid(nx, ny) && p.k !== 'star' && p.k !== 'beam') {
        if (p.bounce > 0) { p.bounce--; if (solid(nx, p.y)) p.vx *= -1; else p.vy *= -1; continue; }
        if (p.k === 'boom') { p.t = 1; p.vx *= -.5; p.vy *= -.5; continue; }
        p.dead = 1; continue;
      }
      p.x = nx; p.y = ny;
      if (!p.mine) continue;
      for (const e of ents) if (!KIND[e.kind].proj && !p.hit.has(e.id) && Math.abs(e.x - p.x) < e.w / 2 + .4 && p.y > top(e) - .4 && p.y < bot(e) + .4) { p.hit.add(e.id); hitEnemy(e, p.dmg, Math.sign(p.vx), p.fire, p.crit || 0); if (!['boom', 'beam', 'star', 'flame'].includes(p.k)) { p.dead = 1; break; } }
    }
    projs = projs.filter(p => !p.dead);
  }
  function startHardmode(seed) {
    if (hard) return; hard = 1; let s = seed >>> 0; const rr = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };   // the same on every player's game
    const host = [T.STONE, T.BSTONE, T.ICE, T.SSTONE, T.MUD, T.SNOW], vein = (tile, n, y0, y1, len) => { for (let i = 0; i < n * WW / 520; i++) { let x = Math.floor(4 + rr() * (WW - 8)), y = Math.floor(y0 + rr() * (y1 - y0)); for (let k = 0; k < len; k++) { x += Math.round(rr() * 2 - 1); y += Math.round(rr() * 2 - 1); if (host.includes(at(x, y))) set(x, y, tile); } } };
    vein(T.AZURITE, 70, 60, HELL - 10, 12); vein(T.VIRIDIUM, 52, 90, HELL - 6, 11); vein(T.STARMETAL, 36, 118, HELL - 4, 10);
    // the Radiance: a slanted band of shining grass and lumenstone, from the surface down to the underworld
    const w = Math.max(28, Math.round(WW * .05)), dir = rr() < .5 ? -1 : 1, bad = x => (jungle && x > jungle.x0 - 10 && x < jungle.x1 + 10) || (frost && x > frost.x0 - 6 && x < frost.x1 + 6) || (blight && x > blight.x0 - 6 && x < blight.x1 + 6) || Math.abs(x - WW / 2) < 40 || x < ocean + 20 || x > WW - ocean - 20;
    let x0 = -1; for (let k = 0; k < 120; k++) { const c = Math.floor(ocean + 20 + rr() * (WW - 2 * ocean - 40 - w)); if (!bad(c) && !bad(c + w)) { x0 = c; break; } } if (x0 < 0) x0 = Math.floor(WW * .3);
    radiant = { x0, x1: x0 + w, dir };
    const conv = { [T.GRASS]: T.RGRASS, [T.JGRASS]: T.RGRASS, [T.BGRASS]: T.RGRASS, [T.STONE]: T.LSTONE, [T.SSTONE]: T.LSTONE, [T.SAND]: T.LSTONE, [T.BSTONE]: T.LSTONE, [T.ICE]: T.LSTONE, [T.SNOW]: T.LSTONE };
    for (let y = 0; y < HELL - 8; y++) { const off = Math.round(Math.max(0, y - 60) * .35 * dir); for (let x = x0 + off; x < x0 + off + w; x++) { if (x < 2 || x >= WW - 2) continue; if (temple && x >= temple.x0 - 2 && x <= temple.x1 + 2 && y >= temple.y0 - 2) continue; const i = y * WW + x, c = conv[tiles[i]] || (tiles[i] === T.DIRT && y > surf[x] + 3 ? T.LSTONE : 0); if (c) tiles[i] = c; if (walls[i] && walls[i] !== 5 && !PW(walls[i])) walls[i] = 23; } }
    say('The deep rumbles. A radiant light and a creeping dark spread through the world!', 6, '#ff9aff'); setTimeout(() => say('Your world is now in Hardmode: new ores, tougher monsters.', 5, '#7ae8ff'), 4500); K.chime(392, [0, 5, 10, 15, 20]); K.shake(14);
  }
  // in Hardmode the Blight and the Radiance creep, a few blocks at a time
  const BLIGHTOF = { [T.GRASS]: T.BGRASS, [T.STONE]: T.BSTONE, [T.SAND]: T.BSTONE, [T.SSTONE]: T.BSTONE, [T.ICE]: T.BSTONE }, RADOF = { [T.GRASS]: T.RGRASS, [T.STONE]: T.LSTONE, [T.SAND]: T.LSTONE, [T.SSTONE]: T.LSTONE, [T.ICE]: T.LSTONE };
  function spread() { for (let n = 0; n < 160; n++) { const x = 3 + Math.floor(R() * (WW - 6)), y = 3 + Math.floor(R() * (HELL - 10)), t = tiles[y * WW + x]; if (!BLIGHTOF[t]) continue; let b = 0, r = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const u = at(x + dx, y + dy); if (u === T.BGRASS || u === T.BSTONE) b++; else if (u === T.RGRASS || u === T.LSTONE) r++; }
      if (b > r && b) editTile(x, y, BLIGHTOF[t]); else if (r) editTile(x, y, RADOF[t]); } }
  function treeWood(x, y) { const z = zoneAt({ x: x + .5, y: y - 4 }); return z.blight ? 'gloomwood' : z.radiant ? 'glimwood' : z.snow ? 'pinewood' : inJungle(x) ? 'mosswood' : 'wood'; }
  function zoneAt(p) { const z = { snow: 0, blight: 0, glow: 0, cloud: 0, rad: 0 }, x0 = Math.floor(p.x) - 26, y0 = Math.floor(p.y) - 18;
    for (let y = y0; y < y0 + 36; y += 2) for (let x = x0; x < x0 + 52; x += 2) { const t = at(x, y); if (t === T.SNOW || t === T.ICE || t === T.SLEAF) z.snow++; else if (t === T.BGRASS || t === T.BSTONE || t === T.BHEART) z.blight++; else if (t === T.GMOSS || t === T.GLOWCAP || t === T.CAPBLK || t === T.STALK) z.glow++; else if (t === T.CLOUD) z.cloud++; else if (t === T.RGRASS || t === T.LSTONE) z.rad++; }
    return { snow: z.snow > 50, blight: z.blight > 40, glow: z.glow > 14, sky: z.cloud > 10 && p.y < 34, radiant: z.rad > 24 }; }
  const RF_SLOT = { x: 24, y: 400, w: 46, h: 46 }, RF_GO = { x: 92, y: 404, w: 130, h: 32 };
  const rfCost = () => rfItem ? Math.max(100, Math.floor(value(rfItem.id) * modVal(rfItem) / 3)) : 0;
  function rfClose() { if (rfItem) { if (!give(rfItem.id, rfItem.n, rfItem.m)) dropItem(rfItem.id, P.x, P.y - 1, rfItem.n); rfItem = null; } rfOpen = false; }
  function rfClick(lx, ly) { if (inB(RF_SLOT, lx, ly)) { if (held && !moddable(held.id)) return say('Only weapons and tools can be reforged.', 2, '#ff9a7a'); const t = rfItem; rfItem = held; held = t; K.sfx(500, .03, 'square', .03); return; }
    if (inB(RF_GO, lx, ly)) { if (!rfItem) return say('Put a weapon or tool in the slot first.', 2); const c = rfCost(); if (!pay(c)) return say('Not enough coins.', 1.6, '#ff9a7a'); const old = rfItem.m; rfItem.m = rollMod(rfItem.id, old || 'none'); K.sfx(220, .08, 'square', .06); K.sfx(880, .08, 'square', .05, 0, .08); const m = modOf(rfItem); say(`Reforged: ${nameOf(rfItem)}`, 2.4, m && m.bad ? '#ff9a8a' : '#7aff7a'); } }
  function drawReforge(g, panel) { if (!rfOpen) return; panel(CHP.x, CHP.y, CHP.w, 110); outlined(g, 'Reforge', 16, 380, 20, '#ffe680'); slot(g, RF_SLOT, rfItem, false);
    const on = hover === 'rfgo'; outlined(g, 'Reforge', RF_GO.x + 2, RF_GO.y + 24, on ? 24 : 21, on ? '#ffe680' : '#fff');
    if (rfItem) { outlined(g, nameOf(rfItem), 240, 418, 16, RAR[IT[rfItem.id].r || 0]); outlined(g, 'Cost ' + coinText(rfCost()) + (modLine(rfItem) ? ' · ' + modLine(rfItem) : ''), 240, 440, 13, '#cfd8ff'); } else outlined(g, 'Click a weapon or tool into the slot', 240, 428, 14, '#9fb0e8'); }
  /* ---------- fishing: cast into water, wait for a bite, click to reel it in ---------- */
  const FISH = ['trout', 'perch', 'minnow', 'snapper', 'frostfin', 'gloomeel', 'glowgill', 'prismkoi', 'honeyfin'];
  const CRATES = { wood: () => [['scoin', 2 + Math.floor(R() * 8)], [pick(['potion', 'lpotion', 'worm', 'torch']), 2 + Math.floor(R() * 4)], ...(R() < .25 ? [[pick(['gustjar', 'hook', 'boom', 'spark', 'windstep']), 1]] : [])],
    iron: () => [['scoin', 10 + Math.floor(R() * 20)], [pick(['ibar', 'sbar']), 4 + Math.floor(R() * 5)], ['lure', 1 + Math.floor(R() * 2)], ...(R() < .35 ? [[pick(['hook', 'gustjar', 'frostgrip', 'mcharm', 'band', 'tidecharm']), 1]] : [])],
    gold: () => [['gcoin', 1], [hard ? pick(['azbar', 'gbar']) : 'gbar', 5 + Math.floor(R() * 6)], ['lure', 3], ...(R() < .5 ? [[pick(['sunfeather', 'gustjar', 'emberboots', 'windstep', 'tidecharm', 'reefblade']), 1]] : [])] };
  function rodUse(it, wx, wy) {
    if (P.bob) { const B = P.bob; if (B.bite > 0) reelIn(B); else K.sfx(300, .05, 'square', .03, -100); P.bob = null; P.swing = .2; return; }
    const bait = ch.inv.find(s => s && IT[s.id].bait); if (!bait) return say('You need bait to fish: worms come up when you dig dirt.', 3);
    const dx = wx - P.x, dy = wy - (P.y - 2), d = Math.hypot(dx, dy) || 1, sp = Math.min(22, 8 + d * 1.2);
    P.bob = { x: P.x + P.face * .8, y: P.y - 2.2, vx: dx / d * sp, vy: dy / d * sp - 4, st: 'fly', wait: 0, bite: 0, power: it.rod + IT[bait.id].bait, t: 0 }; P.swing = .3; K.sfx(500, .08, 'triangle', .04, -250);
  }
  function stepBob(dt) {
    const B = P.bob; if (!B) return; const s = cur(); if (!s || !IT[s.id].rod || dead) { P.bob = null; return; } B.t += dt;
    if (B.st === 'fly') { B.vy += 30 * dt; B.x += B.vx * dt; B.y += B.vy * dt; const k = lqAt(B.x, B.y);
      if (k === 2) { P.bob = null; return say('The line burns up in the lava.', 2, '#ff9a5a'); }
      if (k) { B.st = 'float'; B.k = k; let y = Math.floor(B.y); while (lqAt(B.x, y - .5)) y--; B.y = y + .15; B.vx = B.vy = 0; let n = 0; for (let ddx = -7; ddx <= 7; ddx++) for (let ddy = 0; ddy <= 5; ddy++) if (lqAt(B.x + ddx, y + ddy + .5)) n++; B.deep = n >= 16; if (!B.deep) say('The water here is too shallow for fish.', 2.4); B.wait = rnd(2, 7) / (1 + B.power / 40); K.sfx(220, .08, 'sine', .04, -60); }
      else if (solid(B.x, B.y) || B.t > 4) { P.bob = null; } }
    else { if (!lqAt(B.x, B.y + .4)) { P.bob = null; return; } if (B.bite > 0) { B.bite -= dt; if (B.bite <= 0) B.wait = rnd(2, 7) / (1 + B.power / 40); } else if (B.deep && (B.wait -= dt) <= 0) { B.bite = .9; K.sfx(880, .06, 'square', .05); K.sfx(660, .06, 'square', .04, 0, .07); pops.push({ x: B.x, y: B.y - 1, t: 0, s: '!', c: '#ffe680' }); } }
    if (Math.hypot(B.x - P.x, B.y - P.y) > 32) P.bob = null;
  }
  function reelIn(B) {
    const x = Math.floor(B.x), depth = B.y - surf[clamp(x, 0, WW - 1)], Z = zoneAt({ x: B.x, y: B.y }), oceanic = x < ocean || x >= WW - ocean, pw = B.power;
    const L = []; const add = (id, w) => L.push([id, w]);
    if (B.k === 3) add('honeyfin', 10); else { if (oceanic) { add('snapper', 10); if (R() < .02 + pw / 3000) add('reefblade', 6); if (R() < .015 + pw / 3000) add('tidecharm', 6); }
      if (Z.snow) add('frostfin', 8); if (Z.blight) add('gloomeel', 8); if (Z.glow) add('glowgill', 8); if (Z.radiant && hard) add('prismkoi', 6);
      if (depth > 20) add('minnow', 6); else if (!oceanic) { add('trout', 6); if (!night()) add('perch', 5); } }
    let id; if (R() < .08 + pw / 500) { const r = R(); id = r < .12 + pw / 600 ? 'goldcrate' : r < .45 ? 'ironcrate' : 'woodcrate'; }
    else { let tot = 0; for (const [, w] of L) tot += w; let r = R() * tot; id = L[0][0]; for (const [k, w] of L) { r -= w; if (r <= 0) { id = k; break; } } }
    if (!give(id, 1)) { dropItem(id, P.x, P.y - 1, 1); } ch.fishLog = ch.fishLog || {}; if (IT[id].fish) ch.fishLog[id] = (ch.fishLog[id] || 0) + 1;
    const bait = ch.inv.find(s => s && IT[s.id].bait); if (bait && R() > Math.min(.6, pw / 150)) spendOne(bait);
    say('Caught: ' + IT[id].n + '!', 2.2, RAR[IT[id].r || 0]); K.chime(659, [0, 4, 7]);
  }
  function drawBob(g) { const B = P && P.bob; if (!B || dead) return; const dip = B.bite > 0 ? 4 : Math.sin(anim * 3) * 1.2, X1 = sx(B.x), Y1 = sy(B.y) + dip, X0 = sx(P.x + P.face * 1.1), Y0 = sy(P.y - 2.6);
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X0, Y0); g.quadraticCurveTo((X0 + X1) / 2, Math.max(Y0, Y1) + 10, X1, Y1); g.stroke(); g.fillStyle = '#ff3a3a'; g.beginPath(); g.arc(X1, Y1 - 2, 3.5, Math.PI, 0); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(X1, Y1 - 2, 3.5, 0, Math.PI); g.fill(); }
  /* ---------- bestiary: every creature you have defeated and every fish you have caught ---------- */
  const BNAME = { slime: 'Slime', zombie: 'Zombie', eye: 'Night Eye', bat: 'Cave Bat', skeleton: 'Skeleton', imp: 'Ember Imp', spiderling: 'Spiderling', stalker: 'Jungle Stalker', thorn: 'Thornball', guardian: 'Temple Guardian', sunspirit: 'Sun Spirit',
    rime: 'Rime Slime', revenant: 'Frost Revenant', frostbat: 'Frost Bat', buzzard: 'Dune Buzzard', gnawer: 'Gloom Gnawer', crawler: 'Blight Crawler', sporebat: 'Spore Bat', shambler: 'Shroom Shambler', galewisp: 'Gale Wisp', wraith: 'Dusk Wraith', brute: 'Stone Brute', prism: 'Prism Wisp', lumenslime: 'Lumen Slime', maw: 'Blight Maw' };
  const BDROPS = { slime: ['gel', 'slstaff'], zombie: ['isword', 'potion', 'knife'], eye: ['lens'], bat: ['potion'], skeleton: ['bone', 'skstaff', 'flint', 'trident', 'water'], imp: ['ember', 'flame'], stalker: ['potion', 'vinebow', 'thorns'], thorn: ['potion', 'vinebow', 'thorns'], guardian: ['gbar', 'sunblade', 'sunstaff'], sunspirit: ['gbar', 'sunblade', 'sunstaff'] };
  const bName = k => BNAME[k] || (BOSSES[k] && BOSSES[k].n) || k, bKinds = () => Object.keys(KIND).filter(k => !KIND[k].proj);
  const portraits = {};
  function portrait(k) { if (portraits[k]) return portraits[k]; const c = document.createElement('canvas'); c.width = 96; c.height = 80; const g2 = c.getContext('2d'), D = KIND[k], s = Math.min(1.2, 2.6 / Math.max(D.w, D.h)), cen = CEN.has(k); g2.scale(s, s);
    const e = { id: 0, kind: k, x: (48 / s + cam.x) / TS, y: ((cen ? 42 : 72) / s + cam.y) / TS, vx: 0, vy: 0, w: D.w, h: D.h, t: 1, hit: 0, ground: true, c: '#3aa0ff', hp: 1, max: 1 }; try { drawEnemy(g2, e); } catch (er) {} return (portraits[k] = c.toDataURL()); }
  let bestOpen = false;
  function openBest() { let d = document.getElementById('hbest');
    if (!d) { d = document.createElement('div'); d.className = 'scr'; d.id = 'hbest'; d.style.zIndex = 20; d.innerHTML = '<div class="card" style="width:min(720px,100%);text-align:left"><h2 class="title" style="font-size:34px;text-align:center">Bestiary</h2><div id="hb2-sum" style="text-align:center;opacity:.85;margin-bottom:8px"></div><div id="hb2-list" style="max-height:min(60vh,540px);overflow:auto;padding-right:4px"></div><div class="row"><button id="hb2-close">Close</button></div></div>'; document.body.appendChild(d); d.querySelector('#hb2-close').onclick = closeBest; d.onpointerdown = e => { if (e.target === d) closeBest(); }; }
    keys = {}; useHeld = false; bestOpen = true; d.hidden = false; const box = d.querySelector('#hb2-list'); box.textContent = ''; const best = ch.best || {}, fl = ch.fishLog || {}, ks = bKinds(); let seen = 0;
    const row = (img, title, lines, known) => { const r = document.createElement('div'); r.style.cssText = 'display:flex;gap:12px;align-items:center;padding:8px 10px;margin:4px 0;border-radius:12px;border:2px solid #0a0e28;background:' + (known ? 'rgba(40,60,140,.55)' : 'rgba(20,24,50,.5)');
      const im = document.createElement(known ? 'img' : 'div'); if (known) { im.src = img; im.width = 72; im.height = 60; im.style.cssText = 'object-fit:contain;image-rendering:pixelated;background:rgba(0,0,0,.25);border-radius:8px'; } else { im.textContent = '?'; im.style.cssText = 'width:72px;height:60px;display:flex;align-items:center;justify-content:center;font-size:30px;background:rgba(0,0,0,.35);border-radius:8px;color:#5a6290'; } r.appendChild(im);
      const t = document.createElement('div'); t.style.flex = '1'; const n = document.createElement('div'); n.textContent = title; n.style.cssText = 'font-size:19px;color:' + (known ? '#fff' : '#7a82b0'); t.appendChild(n); for (const l of lines) { const p = document.createElement('div'); p.textContent = l; p.style.cssText = 'font-size:14px;color:#cfd8ff'; t.appendChild(p); } r.appendChild(t); box.appendChild(r); };
    const head = s => { const h = document.createElement('div'); h.textContent = s; h.style.cssText = 'font-size:20px;color:#ffe680;margin:10px 4px 2px'; box.appendChild(h); };
    head('Creatures'); for (const k of ks.filter(k => !KIND[k].boss)) { const n = best[k] || 0, D = KIND[k]; if (n) seen++; const drops = (D.loot ? D.loot.map(l => l[0]) : BDROPS[k] || []).filter(id => IT[id]);
      row(n ? portrait(k) : null, n ? bName(k) : '???', n ? [`Defeated ${n}`, `Life ${D.hp}${hard ? ' (x2 in Hardmode)' : ''} · Damage ${D.dmg}`, drops.length ? 'Drops: ' + (n >= 10 ? drops.map(id => IT[id].n).join(', ') : drops.slice(0, 1).map(id => IT[id].n).join('') + (drops.length > 1 ? ' and more (defeat 10 to learn all)' : '')) : 'No special drops'] : ['Not yet defeated'], n > 0); }
    head('Bosses'); for (const k of ks.filter(k => KIND[k].boss)) { const n = best[k] || (downed[k] ? 1 : 0), D = KIND[k]; if (n) seen++; row(n ? portrait(k) : null, n ? bName(k) : '???', n ? [`Defeated ${n}`, `Life ${D.hp} · Damage ${D.dmg}`, 'Drops: ' + BOSSES[k].drop.map(id => IT[id].n).join(', ')] : ['Not yet defeated'], n > 0); }
    head('Fish'); for (const id of FISH) { const n = fl[id] || 0; if (n) seen++; const c = document.createElement('canvas'); c.width = c.height = 40; icon(c.getContext('2d'), id, 20, 20, 2.2); row(n ? c.toDataURL() : null, n ? IT[id].n : '???', n ? [`Caught ${n}`] : ['Not yet caught'], n > 0); }
    d.querySelector('#hb2-sum').textContent = `Discovered ${seen} of ${ks.length + FISH.length} (${Math.round(seen / (ks.length + FISH.length) * 100)}%)`; }
  function closeBest() { const d = document.getElementById('hbest'); if (d) d.hidden = true; bestOpen = false; keys = {}; }
  /* ---------- quality of life: sort your bag, quick stack into nearby chests ---------- */
  function sortBag() { const items = []; for (let i = 10; i < 40; i++) if (ch.inv[i]) { items.push(ch.inv[i]); ch.inv[i] = null; }
    const merged = []; for (const s of items) { const it = IT[s.id]; const m = !it.one && merged.find(q => q.id === s.id); if (m) m.n += s.n; else merged.push({ ...s }); }
    const cat = s => { const it = IT[s.id]; return it.coin ? 9 : it.melee || it.bow || it.gun || it.magic || it.boom || it.summon ? 0 : it.pick || it.axe || it.hammer || it.rod || it.hook ? 1 : it.armor ? 2 : it.acc ? 3 : it.use ? 4 : it.ammo || it.throw || it.bait ? 5 : it.tile || it.wall ? 7 : 6; };
    merged.sort((a, b) => cat(a) - cat(b) || (IT[b.id].r || 0) - (IT[a.id].r || 0) || IT[a.id].n.localeCompare(IT[b.id].n)); merged.forEach((s, i) => ch.inv[10 + i] = s); K.sfx(600, .05, 'square', .04); K.sfx(800, .05, 'square', .03, 0, .05); }
  function stackNearby() { let moved = 0; const used = new Set(), cx = Math.floor(P.x), cy = Math.floor(P.y - 1);
    for (let x = cx - 10; x <= cx + 10; x++) for (let y = cy - 8; y <= cy + 8; y++) { const t = at(x, y); if (t !== T.CHEST && t !== T.GCHEST) continue; const key = x + ',' + y, L = chests[key] = chests[key] || []; chestFix(L); let any = 0;
      for (let i = 10; i < 40; i++) { const s = ch.inv[i]; if (!s || IT[s.id].one || IT[s.id].coin) continue; const e = L.find(e => e[0] === s.id); if (e) { e[1] += s.n; ch.inv[i] = null; moved++; any = 1; } }
      if (any) { used.add(key); if (online()) MP.send({ t: 'cs', key, c: L }); } }
    if (moved) { say(`Stacked ${moved} item${moved > 1 ? 's' : ''} into ${used.size} chest${used.size > 1 ? 's' : ''} nearby.`, 2.4, '#7aff7a'); K.sfx(420, .05, 'square', .04); } else say('Nothing to stack: no nearby chest holds the same items.', 2.4); }
  const QB = () => ({ sort: { x: OX() + 650, y: TOP() + 12, w: 70, h: 28 }, stack: { x: OX() + 650, y: TOP() + 44, w: 200, h: 28 }, best: { x: OX() + 650, y: TOP() + 76, w: 110, h: 28 } });
  function drawQB(g) { if (bag()) return; const Q = QB(); for (const [k, lab] of [['sort', 'Sort'], ['stack', 'Quick Stack Nearby'], ['best', 'Bestiary']]) { const on = hover === 'qb' + k; outlined(g, lab, Q[k].x + 2, Q[k].y + 21, on ? 21 : 18, on ? '#ffe680' : '#fff'); } }
  /* ---------- pixel art: every block is drawn pixel by pixel with a 4-shade palette, in 3 variations ---------- */
  const texV = {}, TOC = {};
  function prng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
  const darkC = (h, f = .55) => { const n = parseInt(h.slice(1), 16); return '#' + [16, 8, 0].map(sh => Math.round(((n >> sh) & 255) * f).toString(16).padStart(2, '0')).join(''); };
  function grid(pal, fn) { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = fn(x, y); if (v == null) continue; g.fillStyle = typeof v === 'number' ? pal[v] : v; g.fillRect(x, y, 1, 1); } return c; }
  // wrapping value noise, so tiles join without seams
  function noiseF(r, n = 4) { const v = []; for (let i = 0; i < n * n; i++) v.push(r()); const at = (i, j) => v[((j % n + n) % n) * n + ((i % n + n) % n)]; return (x, y) => { const fx = x / 16 * n, fy = y / 16 * n, i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j, s = t => t * t * (3 - 2 * t); const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1); return (a + (b - a) * s(tx)) * (1 - s(ty)) + (c + (d - c) * s(tx)) * s(ty); }; }
  function soil(pal, seed, peb = 3) { const r = prng(seed), N = noiseF(r), j = []; for (let i = 0; i < 256; i++) j.push(r()); const pb = []; for (let i = 0; i < peb; i++) pb.push([Math.floor(r() * 15), Math.floor(r() * 15)]);
    return grid(pal, (x, y) => { for (const [px_, py_] of pb) { if ((x === px_ || x === px_ + 1) && y === py_) return 3; if ((x === px_ || x === px_ + 1) && y === py_ + 1) return 0; } const v = N(x, y) * .8 + j[y * 16 + x] * .2; return v < .2 ? 0 : v < .46 ? 1 : v < .83 ? 2 : 3; }); }
  // stone: chunky rocks, lit at the top-left, shaded at the bottom-right, with dark cracks between them
  function stone(pal, seed, n = 6) { const r = prng(seed), C = []; for (let i = 0; i < n; i++) C.push([r() * 16, r() * 16]); const j = []; for (let i = 0; i < 256; i++) j.push(r());
    return grid(pal, (x, y) => { let d1 = 99, d2 = 99, cx = 0, cy = 0; for (const [a, b] of C) for (const ox of [-16, 0, 16]) for (const oy of [-16, 0, 16]) { const dx = x + .5 - (a + ox), dy = y + .5 - (b + oy), d = Math.hypot(dx, dy); if (d < d1) { d2 = d1; d1 = d; cx = dx; cy = dy; } else if (d < d2) d2 = d; }
      const e = d2 - d1; if (e < 1.1) return 0; if (e < 2.4) return cx + cy > 0 ? 1 : 3; return j[y * 16 + x] < .12 ? 1 : 2; }); }
  function ore(sp, op, seed) { const base = stone(sp, seed), r = prng(seed + 77), c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.drawImage(base, 0, 0);
    for (let k = 0; k < 4; k++) { const x = 1 + Math.floor(r() * 12), y = 1 + Math.floor(r() * 12), w = 2 + Math.floor(r() * 2), h = 2 + (r() < .5 ? 1 : 0); g.fillStyle = sp[0]; g.fillRect(x - 1, y + 1, w + 1, h); g.fillStyle = op[1]; g.fillRect(x, y, w, h); g.fillStyle = op[0]; g.fillRect(x + 1, y + h - 1, w - 1, 1); g.fillRect(x + w - 1, y + 1, 1, h - 1); g.fillStyle = op[2]; g.fillRect(x, y, 1, 1); if (k === 0) { g.fillStyle = '#ffffff'; g.fillRect(x + 1, y, 1, 1); } }
    return c; }
  function brick(pal, seed, bw = 8, bh = 4) { const r = prng(seed), j = []; for (let i = 0; i < 256; i++) j.push(r());
    return grid(pal, (x, y) => { const row = Math.floor(y / bh), off = row % 2 ? bw / 2 : 0, bx = (x + off) % bw, by = y % bh; if (by === bh - 1 || bx === bw - 1) return 0; if (by === 0 || bx === 0) return 3; if (by === bh - 2 || bx === bw - 2) return 1; return j[y * 16 + x] < .15 ? 1 : 2; }); }
  function plank(pal, seed) { const r = prng(seed), seams = [0, 1, 2, 3].map(() => 2 + Math.floor(r() * 12)), grain = []; for (let i = 0; i < 256; i++) grain.push(r());
    return grid(pal, (x, y) => { const row = Math.floor(y / 4), by = y % 4; if (by === 3) return 0; if (x === seams[row]) return 0; if (x === seams[row] + 1 && by === 1) return 3; if (by === 0) return 3; return grain[y * 16 + x] < .16 ? 1 : 2; }); }
  function grassT(dirt, gp, seed) { const r = prng(seed), H = []; for (let x = 0; x < 16; x++) H.push(3 + Math.floor(r() * 3)); const hang = new Set([Math.floor(r() * 16), Math.floor(r() * 16)]); const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.drawImage(dirt, 0, 0);
    for (let x = 0; x < 16; x++) { const h = H[x] + (hang.has(x) ? 2 : 0); for (let y = 0; y < h; y++) { g.fillStyle = y === 0 ? gp[3] : y === h - 1 ? gp[0] : y === 1 ? gp[2] : gp[1]; g.fillRect(x, y, 1, 1); } } return c; }
  function sstoneT(pal, seed) { const r = prng(seed), j = []; for (let i = 0; i < 256; i++) j.push(r()); return grid(pal, (x, y) => { const band = Math.floor((y + (x > 7 ? 1 : 0)) / 4) % 2; if ((y + (x > 7 ? 1 : 0)) % 4 === 3) return 0; return j[y * 16 + x] < .15 ? (band ? 1 : 3) : band ? 2 : 1 + (j[y * 16 + x] > .7 ? 1 : 0); }); }
  function iceT(pal, seed) { const base = stone(pal, seed, 4), c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.drawImage(base, 0, 0); const r = prng(seed + 5); g.fillStyle = '#e8faff'; for (let k = 0; k < 2; k++) { const x = Math.floor(r() * 10), y = Math.floor(r() * 10); for (let i = 0; i < 4; i++) g.fillRect(x + i, y + i, 1, 1); } return c; }
  function variants(t, make, oc) { texV[t] = [make(1), make(2), make(3)]; tex[t] = texV[t][0]; TOC[t] = oc; }
  function pixelArt() {
    const DIRT = ['#563620', '#6e4628', '#87582f', '#9c6a3c'], STONE = ['#3c3c46', '#5c5c68', '#7a7a86', '#9a9aa6'], MUDP = ['#2e2218', '#3e2e20', '#4e3a2a', '#5e4836'];
    const s = (t, pal, k, f) => variants(t, v => f(pal, k * 31 + v), darkC(pal[0]));
    s(T.DIRT, DIRT, 1, soil); s(T.STONE, STONE, 2, stone); s(T.SAND, ['#a88a44', '#c8a85a', '#dcc070', '#eed898'], 3, (p, k) => soil(p, k, 1)); s(T.ASH, ['#2a2226', '#3c3438', '#4e4648', '#625a5c'], 4, soil);
    s(T.MUD, MUDP, 5, soil); s(T.SNOW, ['#a8bcd4', '#d0dcec', '#e8f0fa', '#ffffff'], 6, (p, k) => soil(p, k, 0)); s(T.ICE, ['#3a7aa8', '#5aa4d0', '#8ed0f0', '#c8f0ff'], 7, iceT);
    s(T.SSTONE, ['#8a6a38', '#a8844a', '#c8a060', '#dcb878'], 8, sstoneT); s(T.BSTONE, ['#2a2034', '#3e3050', '#544468', '#6e5a86'], 9, stone); s(T.LSTONE, ['#8a7aa8', '#a898c4', '#c4b4dc', '#e4d8f4'], 10, stone);
    s(T.OBSID, ['#0c0614', '#1e1428', '#2e2040', '#5a3a8a'], 11, (p, k) => stone(p, k, 5)); s(T.CAPBLK, ['#1a6a90', '#2a9ac8', '#5ad8ff', '#c8f4ff'], 12, soil); s(T.BONE, ['#4a4438', '#8a8270', '#c8c0a8', '#ece4cc'], 13, (p, k) => stone(p, k, 4));
    const o = (t, op, k, sp = STONE) => variants(t, v => ore(sp, op, k * 37 + v), darkC(sp[0]));
    o(T.COPPER, ['#8a4a22', '#e8904a', '#ffc08a'], 1); o(T.IRON, ['#6a5a4a', '#c8b8a8', '#f0e4d8'], 2); o(T.SILVER, ['#7a8294', '#d8e0ee', '#ffffff'], 3); o(T.GOLD, ['#a8780e', '#ffd040', '#fff0a0'], 4);
    o(T.SHADOW, ['#5a2aa8', '#b07aff', '#e8d0ff'], 5, ['#1e1a28', '#2e2840', '#3e3656', '#544a70']); o(T.HELLSTONE, ['#c84a1a', '#ff7a2a', '#ffd23f'], 6, ['#2a120e', '#4a2018', '#6a3022', '#8a402c']);
    o(T.AZURITE, ['#2a4ab0', '#4a8aff', '#c0e0ff'], 7); o(T.VIRIDIUM, ['#1a8a4a', '#3ad87a', '#c0ffd8'], 8); o(T.STARMETAL, ['#b0905a', '#ffe8a0', '#ffffff'], 9, ['#242030', '#38324a', '#4a4460', '#5e5878']);
    const b = (t, pal, k) => variants(t, v => brick(pal, k * 41 + v), darkC(pal[0]));
    b(T.BRICK, ['#1a2234', '#2e3a56', '#3e4e72', '#5a6c94'], 1); b(T.SBRICK, ['#34343c', '#5e5e68', '#80808a', '#a4a4ae'], 2); b(T.CBRICK, ['#4a2610', '#8a4a22', '#c87a42', '#eaa070'], 3); b(T.GBRICK, ['#6a4a08', '#b08a1a', '#e8c040', '#fff0a0'], 4); b(T.TBRICK, ['#3a2408', '#7a5420', '#a07a30', '#c8a050'], 5);
    variants(T.PLANK, v => plank(['#3a2410', '#7a5028', '#a06c3e', '#c48a52'], 50 + v), '#1e1208'); variants(T.LWOOD, v => plank(['#2a1a0a', '#5a3a1a', '#6a4a24', '#8a6434'], 60 + v), '#160e06');
    variants(T.PPLANK, v => plank(['#3e3832', '#7a7066', '#9a9084', '#c8beb0'], 70 + v), '#1e1a16'); variants(T.MPLANK, v => plank(['#2e100a', '#6a2a1c', '#8a3a26', '#b05a3a'], 80 + v), '#180806');
    variants(T.GPLANK, v => plank(['#1a0e22', '#3e2450', '#523066', '#6e4a84'], 90 + v), '#0c0612'); variants(T.RPLANK, v => plank(['#8a7a8e', '#c8b8cc', '#e0d4e2', '#fff6ff'], 100 + v), '#4a3e4e');
    const gr = (t, gp, k, dirtPal = DIRT, base = soil) => variants(t, v => grassT(base(dirtPal, k * 43 + v), gp, k * 47 + v), darkC(gp[0]));
    gr(T.GRASS, ['#2a6a14', '#3e9a24', '#5cc038', '#8ee860'], 1); gr(T.JGRASS, ['#1a7a2a', '#2aa83a', '#4ad85a', '#9aff9a'], 2, MUDP); gr(T.BGRASS, ['#3a1458', '#6a2a8a', '#8a3aaa', '#c07ae0'], 3, ['#2e1e26', '#44303a', '#5a3a44', '#6e4a56']);
    gr(T.RGRASS, ['#1a8890', '#3ac8d0', '#ff9aff', '#ffffff'], 4); gr(T.GMOSS, ['#1a5a88', '#2a8ab8', '#5ae0ff', '#c8f8ff'], 5, ['#22222e', '#30303e', '#3e3e50', '#4c4c62'], stone);
    // bark with ridges and knots
    tex[T.TRUNK] = grid(['#3a2210', '#5a3616', '#7a4e26', '#9a663a'], (x, y) => { if (x < 3 || x > 12) return null; if (x === 3 || x === 12) return 0; if ((x === 5 || x === 9) && (y + x) % 7 !== 0) return 1; if (x === 7 || x === 10) return 3; if ((y === 4 || y === 11) && x > 5 && x < 9) return 0; return 2; });
    // background walls: the same pixel style, darker
    const W = (k, pal, f, seed) => { tex['wall' + k] = f(pal, seed); };
    W(1, ['#24160c', '#321e10', '#3e2818', '#4a3220'], soil, 201); W(2, ['#202026', '#2c2c34', '#383842', '#44444e'], stone, 202); W(3, ['#240e0c', '#341612', '#441e18', '#54261e'], stone, 203); W(4, ['#10141e', '#1a2030', '#242c42', '#2e3852'], brick, 204);
    W(5, ['#2e200c', '#3e2c12', '#4e3818', '#5e4420'], brick, 205); W(6, ['#3a2c18', '#4a3820', '#5a4428', '#6a5232'], sstoneT, 206); W(7, ['#121a0c', '#1a2612', '#24321a', '#2e3e22'], soil, 207);
    W(20, ['#1c2e40', '#243a50', '#2e4a64', '#3a5a78'], stone, 220); W(21, ['#18121e', '#221a2a', '#2e2238', '#3a2c46'], stone, 221); W(22, ['#10162a', '#161e34', '#1e2840', '#243452'], stone, 222); W(23, ['#3a3050', '#463a5e', '#544870', '#625682'], stone, 223);
  }
  // a block with its exposed sides outlined and its exposed corners stepped, made once and reused
  const edgeCache = new Map();
  function edgeTex(t, v, m) { const k = t * 64 + v * 16 + m; let c = edgeCache.get(k); if (c) return c; const base = (texV[t] && texV[t][v]) || tex[t]; c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.drawImage(base, 0, 0);
    if (m) { const oc = TOC[t] || '#120c0a', F = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
      if (m & 1) { F(0, 1, 16, 1, 'rgba(255,255,255,.22)'); F(0, 0, 16, 1, oc); } if (m & 2) { F(0, 14, 16, 1, 'rgba(0,0,0,.3)'); F(0, 15, 16, 1, oc); } if (m & 4) { F(1, 0, 1, 16, 'rgba(255,255,255,.1)'); F(0, 0, 1, 16, oc); } if (m & 8) { F(14, 0, 1, 16, 'rgba(0,0,0,.22)'); F(15, 0, 1, 16, oc); }
      const cut = (cx, cy, dx, dy) => { g.clearRect(cx, cy, 1, 1); g.clearRect(cx + dx, cy, 1, 1); g.clearRect(cx, cy + dy, 1, 1); F(cx + dx, cy + dy, 1, 1, oc); };
      if ((m & 5) === 5) cut(0, 0, 1, 1); if ((m & 9) === 9) cut(15, 0, -1, 1); if ((m & 6) === 6) cut(0, 15, 1, -1); if ((m & 10) === 10) cut(15, 15, -1, -1); }
    edgeCache.set(k, c); return c; }
  // blocky pixel discs for leaves, clouds, background trees and the sun
  const discCache = new Map();
  function pdisc(col, r) { const k = col + r; let c = discCache.get(k); if (c) return c; c = document.createElement('canvas'); c.width = c.height = 2 * r + 1; const g = c.getContext('2d'); g.fillStyle = col; for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * .6)); g.fillRect(r - w, y + r, 2 * w + 1, 1); } discCache.set(k, c); return c; }
  function drawDisc(g, col, cx, cy, r, S) { const c = pdisc(col, r); g.drawImage(c, Math.round(cx / S - r) * S, Math.round(cy / S - r) * S, c.width * S, c.height * S); }
  /* ---------- music: short original chiptune loops, one mood per place, written from note patterns below ---------- */
  const MUS = {
    day: { root: 60, sc: [0, 2, 4, 5, 7, 9, 11], bpm: 108, prog: [0, 5, 3, 4], seed: 11, lead: 'square' }, night: { root: 57, sc: [0, 2, 3, 5, 7, 8, 10], bpm: 84, prog: [0, 5, 3, 6], seed: 23, lead: 'triangle' },
    cave: { root: 50, sc: [0, 2, 3, 5, 7, 9, 10], bpm: 92, prog: [0, 6, 5, 4], seed: 37, lead: 'triangle' }, snow: { root: 64, sc: [0, 2, 4, 5, 7, 9, 11], bpm: 96, prog: [0, 3, 4, 0], seed: 41, lead: 'triangle' },
    blight: { root: 47, sc: [0, 1, 3, 5, 7, 8, 10], bpm: 88, prog: [0, 1, 0, 6], seed: 53, lead: 'sawtooth' }, jungle: { root: 55, sc: [0, 2, 4, 5, 7, 9, 10], bpm: 124, prog: [0, 6, 3, 0], seed: 61, lead: 'square' },
    hell: { root: 49, sc: [0, 2, 3, 5, 7, 8, 10], bpm: 132, prog: [0, 5, 6, 4], seed: 71, lead: 'sawtooth' }, boss: { root: 52, sc: [0, 2, 3, 5, 7, 8, 11], bpm: 150, prog: [0, 5, 4, 0], seed: 83, lead: 'square', drums: 1 },
    radiant: { root: 65, sc: [0, 2, 4, 6, 7, 9, 11], bpm: 112, prog: [0, 1, 4, 5], seed: 97, lead: 'triangle' }, sky: { root: 67, sc: [0, 2, 4, 5, 7, 9, 11], bpm: 100, prog: [0, 4, 5, 3], seed: 101, lead: 'triangle' } };
  // each track's melody is generated once from its own seed: two-bar phrases that walk the scale and land on chord tones
  for (const k in MUS) { const M = MUS[k], r = prng(M.seed), mel = []; let d = 4;
    for (let bar = 0; bar < 4; bar++) { const ch = M.prog[bar], tones = [ch, ch + 2, ch + 4]; for (let s = 0; s < 8; s++) {
      if (bar >= 2 && s < 6 && r() < .7) { mel.push(mel[(bar - 2) * 8 + s]); continue; }   // the second half answers the first
      if (s % 4 === 0) d = tones[Math.floor(r() * 3)] + (r() < .3 ? 7 : 0); else if (r() < .28) { mel.push(null); continue; } else d += r() < .5 ? 1 : -1;
      d = clamp(d, 0, 12); mel.push(d); } } M.mel = mel; }
  let mus = { ac: null, gain: null, track: null, want: 'day', step: 0, next: 0, pickT: 0 };
  const midiF = m => 440 * Math.pow(2, (m - 69) / 12);
  const degNote = (M, d) => M.root + 12 * Math.floor(d / 7) + M.sc[((d % 7) + 7) % 7];
  function mNote(f, t, dur, type, v) { const ac = mus.ac, o = ac.createOscillator(), a = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + .01); a.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(a).connect(mus.gain); o.start(t); o.stop(t + dur + .03); }
  function mHat(t, v) { const ac = mus.ac; if (!mus.nb) { const n = Math.floor(ac.sampleRate * .05); mus.nb = ac.createBuffer(1, n, ac.sampleRate); const c = mus.nb.getChannelData(0); for (let i = 0; i < n; i++) c[i] = (Math.random() * 2 - 1) * (1 - i / n); } const s = ac.createBufferSource(), f = ac.createBiquadFilter(), a = ac.createGain(); f.type = 'highpass'; f.frequency.value = 6000; a.gain.value = v; s.buffer = mus.nb; s.connect(f).connect(a).connect(mus.gain); s.start(t); }
  function musicTick(dt) {
    if (!K.master || demo) return; if (!mus.ac) { mus.ac = K.master.context; mus.gain = mus.ac.createGain(); mus.gain.connect(K.master); }
    const target = K.save.mute ? 0 : (K.save.music ?? .6) * .9; mus.gain.gain.setTargetAtTime(mode === 'play' ? target : 0, mus.ac.currentTime, .3);
    if ((mus.pickT -= dt) <= 0) { mus.pickT = 1.5; const depth = P ? P.y - surf[clamp(Math.floor(P.x), 0, WW - 1)] : 0;
      mus.want = ents.some(e => KIND[e.kind].boss) ? 'boss' : P && P.y > HELL - 12 ? 'hell' : zone.blight ? 'blight' : zone.radiant ? 'radiant' : zone.sky ? 'sky' : zone.snow ? 'snow' : P && inJungle(P.x) && depth < 40 ? 'jungle' : depth > 25 ? 'cave' : night() ? 'night' : 'day'; }
    const ac = mus.ac; if (ac.state !== 'running' || mode !== 'play') { mus.next = 0; return; }
    if (!mus.next || mus.next < ac.currentTime - .5) mus.next = ac.currentTime + .1;
    while (mus.next < ac.currentTime + .3) { if (mus.step % 8 === 0 && mus.track !== mus.want) { mus.track = mus.want; mus.step = 0; }
      const M = MUS[mus.track], st = mus.step % 32, bar = Math.floor(st / 8), s = st % 8, ch = M.prog[bar], e = 60 / M.bpm / 2, t = mus.next;
      if (s % 4 === 0) mNote(midiF(degNote(M, ch) - 12), t, e * 3.6, 'triangle', .16);
      mNote(midiF(degNote(M, ch + [0, 2, 4, 2][s % 4]) + 12), t, e * .8, 'square', .025);
      const d = M.mel[st]; if (d != null) mNote(midiF(degNote(M, d) + 12), t, e * (M.mel[st + 1] == null ? 1.8 : .95), M.lead, M.lead === 'sawtooth' ? .03 : .05);
      if (M.drums || M.bpm >= 120) { if (s % 2 === 1) mHat(t, .05); if (s % 4 === 0) mNote(110, t, .08, 'square', .06); }
      mus.step++; mus.next += e; }
  }
  // cached coloured glows, drawn additively over the darkness
  const glowCache = {};
  function glowSprite(c) { if (glowCache[c]) return glowCache[c]; const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 2, 64, 64, 64); gr.addColorStop(0, `rgba(${c},.32)`); gr.addColorStop(.4, `rgba(${c},.11)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return (glowCache[c] = cv); }
  const GLOWC = { [T.GLOWCAP]: ['90,220,255', 80], [T.CRYSTAL]: ['255,60,100', 70], [T.HELLSTONE]: ['255,110,40', 60], [T.STARFORGE]: ['80,170,255', 110], [T.FURNACE]: ['255,150,60', 100], [T.CAMPFIRE]: ['255,150,60', 130], [T.LANTERN]: ['255,210,130', 120], [T.BHEART]: ['200,80,255', 110], [T.GCHEST]: ['255,210,90', 50], [T.GMOSS]: ['60,190,255', 50] };
  const isDoor = t => t === T.DOOR || t === T.DOORO;
  /* ---------- townsfolk ---------- */
  // look: skin, hair, hair colour, face, eyes, top, top colour, legs colour, pants, shoes, extra, extra colour, beard
  const NPCS = {
    guide: { n: 'Wayfinder', always: 1, look: [0, 0, 0, 1, 0, 4, 10, 9, 0, 0, 0, 2, 1], names: ['Orrin', 'Tamsin', 'Bram', 'Lisle', 'Corwin', 'Neve', 'Hollis', 'Wren', 'Ansel', 'Mira'],
      chat: ["Lost? Everyone is, the first night. Torches help more than you'd think.", 'Slimes are harmless alone. In a crowd they are less harmless.', 'Build a proper house and travelers will hear of it and come.', "Dig straight down if you like. Just don't dig straight down into lava."],
      say: n => { const p = (cslot >= 0 && chars()[cslot] && chars()[cslot].name) || 'friend', L = [], hasT = t => stationNear(t) || count(Object.keys(IT).find(k => IT[k].tile === t) || '_');
        { const tip = !hasT(T.BENCH) && count('wood') < 10 ? `First things first, ${p}: chop a tree with your axe. Hold click on the trunk. Ten wood makes a workbench, and ${keyName(KB().inv)} opens your crafting.`
            : !hasT(T.BENCH) ? `You've got the wood! Open your inventory with ${keyName(KB().inv)} and make a workbench. Everything starts there.`
            : !hasT(T.FURNACE) ? 'A furnace is next: 20 stone, 4 wood and 3 torches. Torches need gel, and slimes are full of the stuff.'
            : !hasT(T.ANVIL) ? 'Smelt some ore in your furnace, then turn the bars into an anvil. That opens up real armor and better tools.'
            : ch.max <= 100 ? 'Dig deep and keep an eye out for red crystal hearts. Smash one and you will feel sturdier right away.'
            : !Object.keys(downed).some(k => downed[k]) ? 'Feeling strong? Craft a Gel Crown and use it to call the Gel Sovereign. Bring potions.' : null;
          if (tip && R() < .7) return tip; }
        L.push("Tip: hold Left Shift and your torch jumps into your hand, wherever it is in your bag.", "Tip: right-click townsfolk to talk to them. A plain click works too when your hands are empty.", "Tip: press M for the map. It fills in as you explore.");
        if (night()) L.push("It's getting dark. Stick close, okay? I'll keep my bow ready, but those zombies never take a hint.", "Nights out here are long. Light a torch or two. Or ten. I won't judge.");
        if (P && P.hp < ch.max * .4) L.push(`Whoa, ${p}, you look rough. Sit down a second. Drink something red.`);
        if (!n.house) L.push("I'd love a real roof over my head when you have the time. Walls, a door, a light, a table and a chair. That's all I ask.");
        if (hard) L.push("The whole world feels different since that thing went down. Brighter in some places, nastier in others. Be careful out there, alright?");
        if (!downed.king) L.push("There's something big and bouncy out there. If you ever feel brave, I hear a crown made of gel gets its attention.");
        L.push(`Oh, hey ${p}! Good to see you're still in one piece. Need a hand with anything?`, "Honestly? I've wandered these lands for years and I still get lost. Don't feel bad if you do too.",
          "If I were you, I'd chop some trees, make a workbench, and get a roof up before dark. But hey, you do you.", "I keep my bow strung. Not because I'm worried. Okay. Maybe a little worried.",
          "Find a red crystal heart underground? Smash it. You'll feel sturdier right away. Trust me on that one.", "I tried mining once. Got my pickaxe stuck in a wall for a whole afternoon. Please don't tell anyone.",
          `You know, ${p}, it's nice having company around here. It gets quiet.`, "Slimes look cute until there are twelve of them. Then they just look like a problem.");
        return pick(L); } },
    peddler: { n: 'Peddler', when: () => money() >= 2000, look: [5, 5, 4, 7, 6, 1, 3, 10, 0, 6, 2, 2, 3], names: ['Gilby', 'Marta', 'Osk', 'Pell', 'Dorran', 'Fenna', 'Tobin', 'Ysolde'],
      shop: [['torch', 5], ['arrow', 25], ['lpotion', 1], ['bucket', 1], ['cpick', 1], ['cax', 1], ['whammer', 1], ['chest', 1], ['platform', 20], ['lantern', 1], ['knife', 10], ['woodrod', 1], ['worm', 5], ['lure', 1], ['pebbler', 1]],
      chat: ["Coins, coins! Bring me coins and I'll bring you torches.", 'Everything I sell is nearly new. Mostly.', "I'd sell you a map of the caves, but the caves keep moving.", 'A bucket is the best friend money can buy.'] },
    mender: { n: 'Mender', heal: 1, when: () => ch.max > 100, look: [1, 1, 3, 1, 1, 6, 7, 7, 2, 2, 1, 2, 0], names: ['Elspeth', 'Rowan', 'Celia', 'Bryn', 'Ilse', 'Juno', 'Maren', 'Saffi'],
      chat: ['Hold still. This only stings for a second.', "Life crystals will make you sturdier. I'd still rather you didn't need me.", 'If you are going to fight a boss, at least eat something first.', 'My rates are fair. Cheaper than the alternative, anyway.'] },
    tinker: { n: 'Tinker', when: () => ch.inv.some(s => s && IT[s.id] && IT[s.id].gun), look: [3, 2, 5, 8, 2, 5, 1, 9, 3, 1, 4, 2, 2], names: ['Rusk', 'Calder', 'Vex', 'Dagny', 'Hester', 'Quill', 'Marek', 'Tamber'],
      shop: [['shot', 50], ['sshot', 50], ['flint', 1], ['musket', 1], ['scope', 1]],
      chat: ['That pistol of yours wants better shot. I happen to have some.', 'Every gear has a purpose. Every spring too. The screws are a mystery.', 'Silver shot hits harder. Costs more too. That is how it works.', 'I tuned my scope on a bat once. The bat won.'] },
    smith: { n: 'Smith', reforge: 1, when: () => Object.keys(downed).some(k => downed[k]), look: [2, 9, 1, 2, 2, 5, 8, 10, 3, 0, 0, 2, 3], names: ['Brandt', 'Oriel', 'Kestra', 'Hamund', 'Sigrun', 'Tavish', 'Ragna', 'Bellamy'],
      chat: ['Give it here. A blade is never really finished.', 'Bad luck on the anvil happens. That is what reforging is for.', 'Masterwork? Maybe. Broken? Also maybe. That is the fun of it.', 'I can make your pickaxe swing faster. Costs a little, saves a lot.'] },
    brewer: { n: 'Brewer', when: () => !!downed.king, look: [6, 11, 11, 3, 3, 6, 4, 13, 0, 0, 0, 2, 4], names: ['Thistle', 'Ambrose', 'Nim', 'Odessa', 'Pip', 'Verity', 'Sorrel', 'Fable'],
      shop: [['potion', 1], ['mpotion', 1], ['recall', 1], ['mightp', 1], ['eaglep', 1], ['arcanep', 1], ['edgep', 1], ['hastep', 1], ['stonep', 1], ['vigorp', 1], ['pactp', 1]],
      chat: ["Ah, the one who flattened the Gel Sovereign! Try a potion. Not free, mind you.", 'Never drink anything that glows unless I brewed it.', 'Haste potions: for when walking is simply too slow.', 'Stoneskin tastes like gravel. It works, though.'] },
  };
  function newNpc(k, nm, x, y, house, hp) { return { id: npcId++, k, nm: nm || pick(NPCS[k].names), x, y, vx: 0, vy: 0, w: .8, h: 1.9, hp: hp || 250, max: 250, face: 1, house: house || null, home: house ? house.fx : x, dir: 0, walkT: 0, inv: 0, kb: 0, talk: 0 }; }
  function npcSay(s, c = '#9cdc4a') { say(s, 4, c); if (online()) MP.send({ t: 'nps', s, c }); }
  const npcName = n => `${n.nm} the ${NPCS[n.k].n}`;
  const npcAt = (wx, wy) => npcs.find(n => Math.abs(n.x - wx) < .8 && wy > n.y - n.h - .3 && wy < n.y + .2);
  // a house: a closed room (blocks, doors or platforms all round) of 36 to 750 spaces, your own walls behind every space,
  // a door, a light, a table or workbench and a chair or bed
  function houseAt(x0, y0) {
    const edge = t => SOLID.has(t) || t === T.DOORO || t === T.PLAT;
    if (x0 < 1 || y0 < 1 || x0 >= WW - 1 || y0 >= WH - 1 || edge(at(x0, y0))) return { ok: false, why: 'Stand inside the room to check it.' };
    const seen = new Set([y0 * WW + x0]), st = [y0 * WW + x0], cells = []; let door = 0, light = 0, table = 0, chair = 0, bare = 0, cx = -1, cy = -1;
    while (st.length) { const i = st.pop(), x = i % WW, y = (i - x) / WW; cells.push(i); if (cells.length > 750) return { ok: false, why: 'This room is not closed in, or it is too big.' };
      const t = tiles[i]; if (!PW(walls[i])) bare++; if (t === T.TORCH || t === T.LANTERN || t === T.CAMPFIRE) light = 1; if (t === T.TABLE || t === T.BENCH) table = 1; if (t === T.CHAIR || t === T.BED) { chair = 1; if (cx < 0) { cx = x; cy = y; } }
      for (const j of [i - 1, i + 1, i - WW, i + WW]) { if (seen.has(j)) continue; const tj = tiles[j]; if (edge(tj)) { if (isDoor(tj) || tj === T.PLAT) door = 1; continue; } if (j % WW === 0 || j % WW === WW - 1 || j < WW || j >= (WH - 1) * WW) return { ok: false, why: 'This room is not closed in, or it is too big.' }; seen.add(j); st.push(j); } }
    const why = cells.length < 36 ? 'This room is too small.' : bare ? 'This room needs your own walls behind every space.' : !door ? 'This room needs a door.' : !light ? 'This room needs a light, like a torch.' : !table ? 'This room needs a table or workbench.' : !chair ? 'This room needs a chair or bed.' : '';
    if (why) return { ok: false, why };
    let x0b = WW, x1b = 0, y0b = WH, y1b = 0, sx_ = 0; for (const i of cells) { const x = i % WW, y = (i - x) / WW; x0b = Math.min(x0b, x); x1b = Math.max(x1b, x); y0b = Math.min(y0b, y); y1b = Math.max(y1b, y); sx_ += x; }
    const mx_ = sx_ / cells.length; let best = null, bd = 1e9; for (const i of cells) { const x = i % WW, y = (i - x) / WW; if (!SOLID.has(at(x, y + 1)) && at(x, y + 1) !== T.PLAT) continue; if (!seen.has(i - WW)) continue; const d = Math.abs(x - mx_) + (y1b - y) * 2; if (d < bd) { bd = d; best = [x, y]; } }
    if (!best) return { ok: false, why: 'This room has no floor to stand on.' };
    return { ok: true, key: Math.min(...cells), x0: x0b, x1: x1b, y0: y0b, y1: y1b, cx, cy, fx: best[0] + .5, fy: best[1] + .99, n: cells.length };
  }
  function findHouses() { const out = [], keys = new Set(), done = new Set(); const add = h => { if (h.ok && !keys.has(h.key)) { keys.add(h.key); out.push(h); } };
    for (const n of npcs) if (n.house) add(houseAt(n.house.cx, n.house.cy));
    for (const p of allPlayers()) { const px_ = Math.floor(p.x), py_ = Math.floor(p.y); for (let y = Math.max(1, py_ - 50); y < Math.min(WH - 1, py_ + 50); y++) for (let x = Math.max(1, px_ - 80); x < Math.min(WW - 1, px_ + 80); x++) { const i = y * WW + x, t = tiles[i]; if ((t !== T.CHAIR && t !== T.BED) || done.has(i)) continue; done.add(i); add(houseAt(x, y)); } }
    return out; }
  function npcTick(dt) {
    if ((npcT -= dt) > 0) return; npcT = 5;
    if (downed.ember && !hard && !demo) { const sd = Math.floor(R() * 2147483647); startHardmode(sd); if (online()) MP.send({ t: 'hm', sd }); }
    const H = findHouses(), taken = new Set();
    for (const n of npcs) if (n.house) { const h = H.find(h => h.key === n.house.key && h.cx === n.house.cx && h.cy === n.house.cy) || H.find(h => h.key === n.house.key); if (h && !taken.has(h.key)) { n.house = h; taken.add(h.key); } else { npcSay(`${npcName(n)} has no home anymore.`, '#ffb07a'); n.house = null; n.home = n.x; } }
    const free = H.filter(h => !taken.has(h.key));
    for (const n of npcs) if (!n.house && free.length) { n.house = free.shift(); n.home = n.house.fx; taken.add(n.house.key); npcSay(`${npcName(n)} moved into a house.`); }
    for (const k in NPCS) { const D = NPCS[k]; if (npcs.some(n => n.k === k) || (npcGone[k] && time < npcGone[k])) continue;
      if (D.always) { const h = free.shift() || null, sp = h ? { x: h.fx, y: h.fy } : spawnPoint(), n = newNpc(k, null, sp.x + (h ? 0 : 2), sp.y, h); npcs.push(n); if (npcGone[k]) npcSay(`${npcName(n)} is back.`); continue; }
      if (night() || !free.length || !D.when()) continue; const h = free.shift(), n = newNpc(k, null, h.fx, h.fy, h); npcs.push(n); npcSay(`${npcName(n)} has arrived!`); K.chime(587, [0, 4, 7]); break; }
  }
  function stepNpcs(dt) {
    if (!isHost()) { for (const n of npcs) if (n.tx != null) { const ox = n.x; n.x += (n.tx - n.x) * Math.min(1, dt * 10); n.y += (n.ty - n.y) * Math.min(1, dt * 10); n.vx = (n.x - ox) / Math.max(dt, .001); n.ground = true; if (n.inv > 0) n.inv -= dt; } return; }
    npcTick(dt);
    for (const n of npcs) {
      if (n.inv > 0) n.inv -= dt; if (n.kb > 0) n.kb -= dt; if (n.talk > 0) n.talk -= dt;
      const H = n.house, lo = H ? H.x0 + .5 : n.home - 10, hi = H ? H.x1 + .5 : n.home + 10;
      if (H && (n.x < H.x0 - 6 || n.x > H.x1 + 7 || Math.abs(n.y - H.fy) > 9)) { n.x = H.fx; n.y = H.fy; n.vx = n.vy = 0; }   // never wander far from home
      if (n.kb <= 0) { if (n.talk > 0 || (talk && talk.id === n.id)) { n.vx = 0; n.face = P.x > n.x ? 1 : -1; }
        else { if ((n.walkT -= dt) <= 0) { n.walkT = rnd(1.5, 4.5); n.dir = R() < .4 ? 0 : R() < .5 ? -1 : 1; } if (n.x < lo) n.dir = 1; else if (n.x > hi) n.dir = -1; n.vx = n.dir * 2.4; if (n.dir) n.face = n.dir; } }
      if (n.k === 'guide') { n.bowCd = (n.bowCd || 0) - dt; if (n.fightT > 0) n.fightT -= dt; if (n.aimT > 0) { n.aimT -= dt; n.vx *= .5; }
        if (n.bowCd <= 0) { let tg = null, bd = 15; const ey = n.y - 1.6; for (const e of ents) { if (KIND[e.kind].proj || e.dead) continue; const dd = Math.hypot(e.x - n.x, mid(e) - ey); if (dd < bd && clearLine(n.x, ey, e.x, mid(e))) { bd = dd; tg = e; } }
          if (tg) { n.fightT = 2.5; const dx = tg.x - n.x, dy = mid(tg) - ey, tt = Math.max(.15, Math.hypot(dx, dy) / 24), vx = dx / tt, vy = dy / tt - 11 * tt; n.bowCd = 1.05; n.aimT = .45; n.face = dx > 0 ? 1 : -1; const dl = Math.hypot(vx, vy) || 1; n.aim = [vx / dl, vy / dl];
            projs.push({ k: 'arrow', x: n.x + n.face * .6, y: ey, vx, vy, dmg: (8 + Object.keys(downed).filter(k => downed[k]).length * 3) * (hard ? 1.6 : 1), fire: 0, life: 2.2, mine: 1, hit: new Set(), crit: 0 }); K.sfx(700, .05, 'triangle', .03, -300); } else n.bowCd = .35; } }
      moveBody(n, dt); if (n.bump) { n.bump = 0; n.dir = -n.dir; n.walkT = rnd(1, 2); }
      if (n.hp < n.max) n.hp = Math.min(n.max, n.hp + dt * 1.5);
      if (n.inv <= 0) for (const e of ents) if (Math.abs(n.x - e.x) < (n.w + e.w) / 2 && n.y - n.h < bot(e) && top(e) < n.y) { const d = KIND[e.kind].dmg; n.hp -= d; n.inv = .8; n.kb = .3; n.vx = Math.sign(n.x - e.x || 1) * 7; n.vy = -6; pops.push({ x: n.x, y: n.y - n.h - .3, t: 0, s: String(d), c: '#ff8a8a' }); if (KIND[e.kind].proj) e.dead = 1; break; }
      if (n.hp <= 0) { n.dead = 1; npcGone[n.k] = Math.floor(time) + 1.25; npcSay(`${npcName(n)} was slain...`, '#ff7a7a'); if (talk && talk.id === n.id) { talk = null; shopK = null; } }
    }
    npcs = npcs.filter(n => !n.dead);
  }
  function drawNpcs(g) { for (const n of npcs) { drawHero(g, n, n.nm, null, n.k === 'guide' && n.fightT > 0 ? 'wbow' : null, 0, n.face || 1, n.inv > 0 && Math.floor(anim * 20) % 2, '#9cdc4a', n.aimT > 0 && n.aim ? n.aim : null, NPCS[n.k].look);
    if (n.hp < n.max) { const X = sx(n.x), Y = sy(n.y); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(X - 20, Y + 4, 40, 5); g.fillStyle = '#5ad84a'; g.fillRect(X - 19, Y + 5, 38 * Math.max(0, n.hp / n.max), 3); } } }
  // talking: a box with what they say and a row of text buttons
  function guideTip() {
    if (!count('bench') && !stationNear(T.BENCH)) return 'Chop trees with your axe. Ten wood makes a Workbench, right from your inventory.';
    if (!stationNear(T.FURNACE) && !count('furnace') && !count('cbar') && !count('ibar')) return 'A Furnace (20 stone, 4 wood, 3 torches) turns ore into bars. Torches need gel from slimes.';
    if (!stationNear(T.ANVIL) && !count('anvil')) return 'Five iron bars at the Workbench make an Anvil. Better tools and armor come from there.';
    if (!npcs.some(n => n.house)) return 'Build a house: a closed room with your own walls behind it, a door, a torch, a table and a chair. Newcomers only move into rooms like that.';
    if (!downed.king) return 'Craft a Gel Crown and you can call the Gel Sovereign. Beat him and a Brewer may come to town.';
    if (ch.max <= 100) return 'Life Crystals glow red deep underground. Smash one for more life, and a Mender will want to live nearby.';
    return pick(['Peddlers love coins. Hunting at night pays well, if you survive it.', 'Shadow ore hides deep down once the Watcher falls.', 'Each room can hold one neighbor. Build more rooms for more neighbors.', 'Click Housing in your inventory to see whether the room you stand in is a home.']);
  }
  const healCost = () => Math.max(1, Math.ceil((ch.max - P.hp) * 2));
  function npcBtns(n) { const D = NPCS[n.k]; return [D.shop ? ['shop', 'Shop'] : D.reforge ? ['reforge', 'Reforge'] : D.heal ? ['heal', P.hp < ch.max || P.burn > 0 ? `Heal (${coinText(healCost())})` : 'Heal'] : ['help', 'Help'], ['chat', 'Chat'], ['close', 'Close']]; }
  function talkTo(n) { talk = { id: n.id, text: NPCS[n.k].say ? NPCS[n.k].say(n) : pick(NPCS[n.k].chat) }; shopK = null; if (!isHost()) MP.send({ t: 'npt', id: n.id }); else n.talk = 4; K.sfx(520, .05, 'square', .04, 120); }
  function talkAct(k) { const n = npcs.find(n => n.id === talk.id); if (!n) { talk = null; return; } const D = NPCS[n.k];
    if (k === 'close') { talk = null; shopK = null; }
    else if (k === 'chat') talk.text = pick(D.chat.filter(c => c !== talk.text));
    else if (k === 'help') talk.text = guideTip();
    else if (k === 'heal') { if (P.hp >= ch.max && !(P.burn > 0)) talk.text = 'You look perfectly healthy to me.'; else if (!pay(healCost())) talk.text = "You can't afford that. Come back with " + coinText(healCost()) + '.'; else { P.hp = ch.max; P.burn = 0; P.webbed = 0; talk.text = 'There. Good as new.'; K.chime(784, [0, 4, 7]); } }
    else if (k === 'reforge') { if (bag()) { talk.text = 'Reforging needs a keyboard and mouse for now. Sorry!'; return; } openCh = null; shopK = null; rfOpen = true; if (!invOpen) toggleInv(); rfOpen = true; talk.text = 'Put a weapon or tool in the slot, then click Reforge.'; }
    else if (k === 'shop') { if (bag()) { talk.text = 'Shops need a keyboard and mouse for now. Sorry!'; return; } openCh = null; shopK = n.k; if (!invOpen) toggleInv(); shopK = n.k; }
    K.sfx(500, .04, 'square', .03); }
  function wrapText(g, t, w) { const out = []; let line = ''; for (const word of t.split(' ')) { const tr = line ? line + ' ' + word : word; if (g.measureText(tr).width > w && line) { out.push(line); line = word; } else line = tr; } if (line) out.push(line); return out; }
  function drawTalk(g) { const n = npcs.find(n => n.id === talk.id); if (!n) { talk = null; shopK = null; return; }
    const x = 600, w = 500, y = 196; g.font = `16px ${PXF}`; const lines = wrapText(g, talk.text, w - 32), h = 70 + lines.length * 22 + 34;
    g.fillStyle = 'rgba(22,30,78,.9)'; g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill(); g.strokeStyle = 'rgba(150,170,255,.45)'; g.lineWidth = 2; g.stroke();
    outlined(g, npcName(n), x + 16, y + 30, 20, '#ffe680'); lines.forEach((l, i) => outlined(g, l, x + 16, y + 58 + i * 22, 16, '#fff'));
    dlgBtns = []; let bx = x + 16; const by = y + h - 34; for (const [k, lab] of npcBtns(n)) { g.font = `19px ${PXF}`; const bw = g.measureText(lab).width, on = hover === 'dl' + k; outlined(g, lab, bx, by + 22, on ? 21 : 19, on ? '#ffe680' : '#fff'); dlgBtns.push({ k, x: bx - 6, y: by, w: bw + 14, h: 30 }); bx += bw + 30; }
    dlgBox = { x, y, w, h }; }
  function talkDown(x, y) { for (const b of dlgBtns) if (inB(b, x, y)) { talkAct(b.k); return true; } return !!(dlgBox && inB(dlgBox, x, y)); }
  // shops use the same panel as chests: click to buy, shift-click your own things to sell them
  const shopItem = i => { const L = shopK && NPCS[shopK] && NPCS[shopK].shop, e = L && L[i]; return e ? { id: e[0], n: e[1], p: value(e[0]) * e[1] } : null; };
  function shopBuy(i) { const s = shopItem(i); if (!s) return; if (!pay(s.p)) return say('Not enough coins.', 1.6, '#ff9a7a'); if (!give(s.id, s.n)) { giveCoins(s.p); return say('Your inventory is full.'); } K.sfx(880, .05, 'square', .04); K.sfx(1320, .05, 'square', .03, 0, .05); say(`Bought ${IT[s.id].n}${s.n > 1 ? ' x' + s.n : ''}`, 1.6); }
  const sellPrice = s => Math.floor(value(s.id) * modVal(s) / 5) * s.n;
  function sellSlot(i) { const s = ch.inv[i]; if (!s) return; const v = sellPrice(s); if (!v) return say("They won't buy that.", 1.6, '#ff9a7a'); ch.inv[i] = null; if (!giveCoins(v)) { ch.inv[i] = s; return say('Make room for the coins first.'); } K.sfx(1040, .05, 'square', .04); say(`Sold ${IT[s.id].n}${s.n > 1 ? ' x' + s.n : ''} for ${coinText(v)}`, 1.8); }
  function sellHeld() { const s = held; if (!s) return; const v = sellPrice(s); if (!v) return say("They won't buy that.", 1.6, '#ff9a7a'); held = null; if (!giveCoins(v)) { held = s; return say('Make room for the coins first.'); } K.sfx(1040, .05, 'square', .04); say(`Sold ${IT[s.id].n}${s.n > 1 ? ' x' + s.n : ''} for ${coinText(v)}`, 1.8); }
  function drawShop(g, panel) { if (!shopK) return; const n = npcs.find(n => talk && n.id === talk.id); panel(CHP.x, CHP.y, CHP.w, CHP.h);
    outlined(g, n ? `${n.nm}'s shop` : NPCS[shopK].n, 16, 380, 20, '#ffe680'); outlined(g, 'Shift-click your things to sell', 570, 380, 13, '#9fb0e8', 'right');
    for (let i = 0; i < 40; i++) slot(g, CSLOT(i), shopItem(i), false); }
  function checkHousing() { const h = houseAt(Math.floor(P.x), Math.floor(P.y - .5)); if (!h.ok) return say(h.why, 4, '#ff9a7a');
    const who = npcs.find(n => n.house && n.house.key === h.key); say(who ? `This is ${npcName(who)}'s home.` : 'This room is a fine home. Someone may move in soon.', 4, '#7aff7a'); }
  function toggleDoor(x, y) {
    const t = at(x, y); if (!isDoor(t)) return false; const top = isDoor(at(x, y + 1)) ? y : y - 1, nt = t === T.DOOR ? T.DOORO : T.DOOR;
    if (nt === T.DOOR && [...allPlayers(), ...ents].some(b => b && Math.abs(b.x - (x + .5)) < .5 + b.w / 2 && b.y > top && b.y - b.h < top + 2)) return false;   // something is standing in the doorway
    for (const yy of [top, top + 1]) if (isDoor(at(x, yy))) editTile(x, yy, nt);
    K.sfx(nt === T.DOOR ? 150 : 230, .06, 'square', .04, nt === T.DOOR ? -40 : 40); return true;
  }
  function placeDoor(tx, ty, s) {
    const floor = y => SOLID.has(at(tx, y)) && !isDoor(at(tx, y)), free = y => at(tx, y) === T.AIR || at(tx, y) === T.WATER;
    const bot = floor(ty + 1) ? ty : ty + 1;   // point at either half of where it goes
    if (!floor(bot + 1) || !free(bot) || !free(bot - 1)) return say('A door needs two free spaces on solid ground.');
    if (Math.abs(tx + .5 - P.x) < .5 + P.w / 2 && P.y > bot - 1 && P.y - P.h < bot + 1) return;
    editTile(tx, bot - 1, T.DOOR); editTile(tx, bot, T.DOOR); spendOne(s); K.sfx(200, .05, 'square', .06); P.swing = .25; score += 1;
  }
  // walking into a closed door opens it; doors opened that way shut again behind you
  function autoDoor() {
    const dir = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
    if (dir && !dead) { const x = Math.floor(P.x + dir * (P.w / 2 + .15)); for (const y of [Math.floor(P.y - .05), Math.floor(P.y - 1.2)]) if (at(x, y) === T.DOOR) { if (toggleDoor(x, y)) autoDoors.push({ x, y }); break; } }
    if (autoDoors.length) autoDoors = autoDoors.filter(d => { if (at(d.x, d.y) !== T.DOORO) return false; if (Math.abs(P.x - (d.x + .5)) < 1.7 && Math.abs(P.y - 1 - d.y) < 2.5) return true; toggleDoor(d.x, d.y); return at(d.x, d.y) === T.DOORO; });
  }
  function editWall(x, y, v) { walls[y * WW + x] = v; if (online()) MP.send({ t: 'wl', x, y, v }); }
  function breakWall(x, y) { const v = walls[y * WW + x]; mine = null; editWall(x, y, 0); if (WALLIT[v]) dropItem(WALLIT[v], x + .5, y + .5, 1);
    K.burst(scrX(sx(x + .5)), scrY(sy(y + .5)), ['#5a4a3a', '#3a3a42'], 5, 120, { life: .3, size: 3, gravity: 600 }); K.sfx(130, .07, 'square', .06, -50); }
  function interact(tx, ty, wx = tx + .5, wy = ty + .5) { if (dead) return; { const n = npcAt(wx, wy); if (n && Math.hypot(n.x - P.x, n.y - P.y) < 7) return talkTo(n); } if (!reach(tx, ty)) return; const t = at(tx, ty); if (isDoor(t)) return toggleDoor(tx, ty); if (t === T.CHEST || t === T.GCHEST) return openChest(tx, ty); }
  /* ---- chests are storage: 40 slots, kept as [id, count, slot] so older saves (plain [id, count]) still load */
  const CSLOT = i => ({ x: 14 + (i % 10) * (SLOT + 4), y: 390 + Math.floor(i / 10) * (SLOT + 4), w: SLOT, h: SLOT }), CHP = { x: 4, y: 352, w: 576, h: 248 };
  const CHBT = { loot: { x: 150, y: 358, w: 100, h: 28 }, dep: { x: 266, y: 358, w: 132, h: 28 }, stack: { x: 414, y: 358, w: 140, h: 28 } };
  function chestFix(L) { const used = new Set(L.filter(e => e && e[2] != null).map(e => e[2])); let f = 0; for (const e of L) if (e && e[2] == null) { while (used.has(f)) f++; e[2] = f; used.add(f); } }
  const cList = () => (openCh && chests[openCh]) || [];
  function cget(i) { const e = cList().find(e => e[2] === i); if (!e) return null; if (!e[3] && moddable(e[0])) e[3] = rollMod(e[0]); const o = { id: e[0], n: e[1] }; if (e[3]) o.m = e[3]; return o; }
  function cset(i, s) { const L = cList(), j = L.findIndex(e => e[2] === i); if (j >= 0) L.splice(j, 1); if (s) L.push(s.m ? [s.id, s.n, i, s.m] : [s.id, s.n, i]); }
  function chestSync() { if (openCh && online()) MP.send({ t: 'cs', key: openCh, c: chests[openCh] }); }
  function chestOk() { if (!openCh) return false; const [x, y] = openCh.split(',').map(Number), t = at(x, y); return (t === T.CHEST || t === T.GCHEST) && reach(x, y, 7.5); }
  function chestClick(i, shift) { const c = cget(i);
    if (shift && !held) { if (!c) return; if (!give(c.id, c.n)) return say('Your inventory is full.'); cset(i, null); }
    else if (held) { if (c && c.id === held.id && !IT[c.id].one) { cset(i, { id: c.id, n: c.n + held.n }); held = null; } else { cset(i, held); held = c; } }
    else if (c) { held = c; cset(i, null); } else return;
    K.sfx(500, .03, 'square', .03); chestSync(); }
  function toChest(i) { const s = ch.inv[i]; if (!s) return false; const L = cList(), same = !IT[s.id].one && L.find(e => e[0] === s.id);
    if (same) same[1] += s.n; else { const used = new Set(L.map(e => e[2])); let f = 0; while (used.has(f)) f++; if (f >= 40) return false; L.push(s.m ? [s.id, s.n, f, s.m] : [s.id, s.n, f]); } ch.inv[i] = null; return true; }
  function lootAll() { const L = cList(); let n = 0; for (const e of L.slice()) if (give(e[0], e[1], e[3])) { L.splice(L.indexOf(e), 1); n++; } if (n) { K.sfx(620, .05, 'square', .04); chestSync(); } else if (L.length) say('Your inventory is full.'); }
  function depositAll(onlyStack) { const L = cList(); let n = 0; for (let i = 10; i < 40; i++) { const s = ch.inv[i]; if (!s || (onlyStack && !L.some(e => e[0] === s.id))) continue; if (toChest(i)) n++; }
    if (n) { K.sfx(420, .05, 'square', .04); chestSync(); } else say(onlyStack ? 'Nothing in your bag matches this chest.' : 'Nothing to put away (your hotbar stays with you).'); }
  function drawChest(g, panel) {
    if (!openCh) return; panel(CHP.x, CHP.y, CHP.w, CHP.h); const [x, y] = openCh.split(',').map(Number);
    outlined(g, at(x, y) === T.GCHEST ? 'Gold Chest' : 'Chest', 16, 380, 20, '#ffe680');
    for (const [k, lab] of [['loot', 'Loot All'], ['dep', 'Deposit All'], ['stack', 'Quick Stack']]) { const b = CHBT[k], on = hover === 'cb' + k; outlined(g, lab, b.x + 2, b.y + 21, on ? 20 : 17, on ? '#ffe680' : '#fff'); }
    for (let i = 0; i < 40; i++) slot(g, CSLOT(i), cget(i), false);
  }
  function openChest(x, y) {
    const key = x + ',' + y; chests[key] = chests[key] || []; chestFix(chests[key]);
    if (bag()) { const L = chests[key]; if (!L.length) return say('The chest is empty.'); const got = []; chests[key] = L.filter(e => { if (give(e[0], e[1])) { got.push(e); return false; } return true; });   // phones take everything at once
      if (got.length) { say('Found: ' + got.map(([id, n]) => IT[id].n + (n > 1 ? ' x' + n : '')).join(', '), 4, RAR[Math.max(...got.map(([id]) => IT[id].r || 0))]); K.chime(659, [0, 7, 12]); if (online()) MP.send({ t: 'cs', key, c: chests[key] }); } else say('Your inventory is full.'); return; }
    if (openCh === key && invOpen) { openCh = null; K.sfx(380, .05, 'square', .04); return; }
    openCh = key; shopK = null; if (!invOpen) toggleInv(); if (chests[key].length) K.chime(659, [0, 7, 12]); else K.sfx(420, .06, 'square', .05, 120);
  }
  function oldOpenChest(x, y) {
    const key = x + ',' + y, items = chests[key];
    if (!items || !items.length) return say('The chest is empty.');
    for (const [id, n] of items) give(id, n);
    say('Found: ' + items.map(([id, n]) => IT[id].n + (n > 1 ? ' x' + n : '')).join(', '), 4, RAR[Math.max(...items.map(([id]) => IT[id].r || 0))]);
    chests[key] = []; K.chime(659, [0, 7, 12]); if (online()) MP.send({ t: 'chest', key });
  }
  const saplT = new Map();
  function growTree(x, base) { const h = 5 + Math.floor(R() * 7), top = base - h; for (let y = base; y >= top - 2; y--) for (let dx = -2; dx <= 2; dx++) { const t = at(x + dx, y); if (y < base && dx === 0 && t !== T.AIR && t !== T.SAPLING) return; if (Math.abs(dx) + Math.abs(y - top) < 4 && y <= top + 1 && SOLID.has(t)) return; }
    for (let y = base; y >= top; y--) editTile(x, y, T.TRUNK); for (let dx = -2; dx <= 2; dx++) for (let dy = -3; dy <= 1; dy++) if (Math.abs(dx) + Math.abs(dy) < 4 && at(x + dx, top + dy) === T.AIR) editTile(x + dx, top + dy, T.LEAF); }
  let gclock = 0, gScanT = 0; const grassTm = new Map(), GRASSES = new Set([T.GRASS, T.JGRASS, T.BGRASS, T.RGRASS]);
  function grassTick(dt) { gclock += dt; if ((gScanT -= dt) > 0) return; gScanT = 1.5;
    for (const pl of allPlayers()) { const px = Math.floor(pl.x), py = Math.floor(pl.y);
      for (let x = Math.max(1, px - 45); x < Math.min(WW - 1, px + 45); x++) for (let y = Math.max(1, py - 30); y < Math.min(WH - 1, py + 30); y++) { const t = tiles[y * WW + x], k = y * WW + x;
        if (t === T.SAPLING) { if (tiles[k + WW] !== T.GRASS) continue; if (!saplT.has(k)) { saplT.set(k, gclock + 120 + R() * 90); continue; } if (gclock >= saplT.get(k)) { saplT.delete(k); growTree(x, y); } continue; }
        if (GRASSES.has(t)) { const up = tiles[k - WW]; if (SOLID.has(up) && up !== T.GLASS) editTile(x, y, T.DIRT); continue; }
        if (t !== T.DIRT) { if (grassTm.size) grassTm.delete(k); continue; }
        let sky = tiles[k - WW] === T.AIR && !(liq && liq[k - WW]); if (sky) for (let yy = y - 2; yy >= 0; yy--) if (SOLID.has(tiles[yy * WW + x]) && tiles[yy * WW + x] !== T.GLASS) { sky = false; break; }
        if (!sky) { grassTm.delete(k); continue; } if (!grassTm.has(k)) { grassTm.set(k, gclock); continue; }
        if (gclock - grassTm.get(k) >= 300) { grassTm.delete(k); let v = T.GRASS; for (const [a, b] of [[-1, 0], [1, 0], [-1, 1], [1, 1], [-1, -1], [1, -1]]) { const n = tiles[(y + b) * WW + x + a]; if (GRASSES.has(n)) { v = n; break; } } editTile(x, y, v); } } } }
  // is any character overlapping tile (tx, ty)?
  function bodyIn(tx, ty) { const hit = (x, y, w, h) => x != null && x + w / 2 > tx + .02 && x - w / 2 < tx + .98 && y > ty + .02 && y - h < ty + .98;
    if (P && !dead && hit(P.x, P.y, P.w, P.h)) return true; for (const [, o] of others) if (o.p && !o.dead && hit(o.p.x, o.p.y, .8, 1.9)) return true;
    for (const n of npcs) if (hit(n.x, n.y, n.w || .8, n.h || 2.4)) return true; for (const e of ents) if (!e.dead && KIND[e.kind] && !KIND[e.kind].proj && hit(e.x, e.y, e.w, e.h)) return true; return false; }
  // something solid where a character appears: move them up to the first open space
  function unstick(b) { const stuck = () => { for (let yy = Math.floor(b.y - b.h); yy <= Math.floor(b.y - .01); yy++) for (let xx = Math.floor(b.x - b.w / 2 + .02); xx <= Math.floor(b.x + b.w / 2 - .02); xx++) if (solid(xx + .5, yy + .5)) return true; return false; };
    for (let i = 0; i < 200 && stuck(); i++) b.y = Math.floor(b.y - 1e-3) - .01; }
  const isPlat = (x, y) => at(x, y) === T.PLAT, platSh = (x, y) => (PVA()[y * WW + x] >> 4) & 3;
  function editPV(x, y, v) { PVA()[y * WW + x] = v; if (online()) MP.send({ t: 'pv', x, y, v }); }
  // a stair step rises toward its high side; only its low side has to be free
  function placePlat(x, y, k) { const P_ = (a, b) => PVA()[b * WW + a], setSh = (a, b, sh) => editPV(a, b, (P_(a, b) & 15) | sh << 4);
    let sh = 0; if (isPlat(x - 1, y + 1) && !isPlat(x - 1, y)) sh = 1; else if (isPlat(x + 1, y + 1) && !isPlat(x + 1, y)) sh = 2;
    editPV(x, y, k | sh << 4);
    if (sh === 1 && !platSh(x - 1, y + 1) && !isPlat(x - 2, y + 1)) setSh(x - 1, y + 1, 1);   // the bottom step slopes too
    if (sh === 2 && !platSh(x + 1, y + 1) && !isPlat(x + 2, y + 1)) setSh(x + 1, y + 1, 2);
    if (isPlat(x + 1, y - 1) && !isPlat(x, y - 1) && !platSh(x + 1, y - 1)) setSh(x + 1, y - 1, 1);   // a platform up and to the side carries the stair on
    if (isPlat(x - 1, y - 1) && !isPlat(x, y - 1) && !platSh(x - 1, y - 1)) setSh(x - 1, y - 1, 2);
    if (isPlat(x + 1, y) && platSh(x + 1, y) === 1) setSh(x + 1, y, 0);   // filled in the low side of a stair: it goes flat
    if (isPlat(x - 1, y) && platSh(x - 1, y) === 2) setSh(x - 1, y, 0); }
  const hookLink = v => spr('hlink|' + v, v ? 4 : 6, v ? 6 : 4, P => { if (v) { P.ell(2, 3, 2, 3, '#9a9aa6'); P.rect(1.5, 1.5, 1, 3, null); P.del(1, 2); P.del(2, 2); P.del(1, 3); P.del(2, 3); } else { P.ell(3, 2, 3, 2, '#9a9aa6'); P.del(2, 1); P.del(3, 1); P.del(2, 2); P.del(3, 2); } }, { hi: 1.3, lo: .7 });
  const hookHead = shut => spr('hhead|' + (shut ? 1 : 0), 12, 12, P => { P.rect(0, 5, 5, 2, '#7a7a86'); P.ell(5.5, 6, 2.2, 2.2, '#b8b8c4'); const o = shut ? 0 : 1.5; P.line(6, 5, 11, 1 - o, '#d8d8e2'); P.line(6, 7, 11, 11 + o, '#d8d8e2'); P.line(7, 6, 12, 6, '#d8d8e2'); P.px(11, 1 - o, '~#ffffff'); P.px(11, 11 + o, '~#ffffff'); P.px(11, 6, '~#ffffff'); }, { hi: 1.25, lo: .7 });
  function drawHook(g, px, py, hx, hy, hold) { const X0 = sx(px), Y0 = sy(py - 1.2), X1 = sx(hx), Y1 = sy(hy), d = Math.hypot(X1 - X0, Y1 - Y0), a = Math.atan2(Y1 - Y0, X1 - X0), n = Math.max(1, Math.floor(d / 7)); g.imageSmoothingEnabled = false;
    for (let i = 0; i < n; i++) { const t = i / n, l = hookLink(i % 2); g.save(); g.translate(X0 + (X1 - X0) * t, Y0 + (Y1 - Y0) * t + Math.sin(t * Math.PI) * (hold ? 0 : 3)); g.rotate(a); g.drawImage(l, -l.width * .75, -l.height * .75, l.width * 1.5, l.height * 1.5); g.restore(); }
    const h = hookHead(hold); g.save(); g.translate(X1, Y1); g.rotate(a); g.drawImage(h, -h.width * 1.5 + 6, -h.height * .75, h.width * 1.5, h.height * 1.5); g.restore(); }
  function drawPlat(g, X, Y, x, y) { const v = PVA()[y * WW + x], k = v & 15, sh = (v >> 4) & 3, tx = (k && tex.platV[k]) || tex[T.PLAT], u = TS / 16;
    if (!sh) { g.drawImage(tx, X, Y, TS, TS); return; } for (let i = 0; i < 16; i++) { const off = sh === 1 ? 15 - i : i; g.drawImage(tx, i, 0, 1, 5, X + i * u, Y + off * u, u + .4, 5 * u); g.drawImage(tx, i, 0, 1, 5, X + i * u, Y + (off + 2) * u, u + .4, 5 * u); if (i % 6 === 2) { g.fillStyle = 'rgba(40,24,10,.9)'; g.fillRect(X + i * u, Y + (off + 6) * u, 2 * u, 3 * u); } } }
  const roomFor = id => { const it = IT[id]; if (!it) return false; if (it.coin) return true; if (it.ammo && amS().some(s => s && s.id === id)) return true; return ch.inv.some(s => !s || (s.id === id && !it.one && !moddable(id))); };
  function throwHeld() { if (!held) { say('Pick up an item in your inventory first, then press Drop.', 2.2); return; } if (!P || dead) return; const h = held; held = null; addDrop({ id: h.id, n: h.n, x: P.x + P.face * .7, y: P.y - 1.3, vx: (P.face || 1) * 8, vy: -6, t: -1.6, m: h.m }); K.sfx(260, .06, 'square', .04); }
  function editTile(x, y, v) { set(x, y, v); if (online()) MP.send({ t: 'tl', x, y, v }); }
  let axeCut = false;   // a tree felled with an axe gives half as much wood again
  function breakTile(x, y) {
    const t = at(x, y); mine = null; if (!t) return;
    if (isDoor(t)) { const o = isDoor(at(x, y + 1)) ? y + 1 : isDoor(at(x, y - 1)) ? y - 1 : -1; if (o >= 0) editTile(x, o, T.AIR); }   // a door is two blocks tall and goes as one
    if (t === T.CHEST || t === T.GCHEST) { delete chests[x + ',' + y]; if (openCh === x + ',' + y) openCh = null; }
    editTile(x, y, T.AIR); score += t === T.GOLD || t === T.SHADOW || t === T.HELLSTONE ? 6 : (t >= T.COPPER && t <= T.GOLD) || t === T.SILVER ? 3 : 1;
    K.burst(scrX(sx(x + .5)), scrY(sy(y + .5)), t === T.GRASS || t === T.LEAF ? ['#4caa2a', '#8a5a32'] : t === T.STONE ? ['#7a7a84', '#94949e'] : ['#8a5a32', '#a06c3e'], 6, 140, { life: .35, size: 4, gravity: 700 });
    K.sfx(SOLID.has(t) && t !== 1 && t !== 2 ? 200 : 120, .08, 'square', .07, -60);
    if (t === T.TRUNK) { let n = 1; for (let yy = y - 1; yy > y - 16; yy--) { if (at(x, yy) === T.TRUNK) { editTile(x, yy, T.AIR); n++; } else break; } for (let dx = -3; dx <= 3; dx++) for (let dy = -18; dy < 0; dy++) if (at(x + dx, y + dy) === T.LEAF || at(x + dx, y + dy) === T.SLEAF) editTile(x + dx, y + dy, T.AIR); { const tw = treeWood(x, y); dropItem(tw, x + .5, y, n * (axeCut ? 3 : 2)); if (tw === 'wood' && R() < .7) dropItem('acorn', x + .5, y - 1, 1 + (R() < .35 ? 1 : 0)); } if (R() < .3) dropItem('gel', x + .5, y - 2, 1); if (R() < .15) dropItem('mush', x + .5, y - 2, 1); return; }
    if (t === T.BHEART) { dropItem(pick(['gloomstaff', 'rotbow', 'gloomscale']), x + .5, y, 1); dropItem('scoin', x + .5, y, 3 + Math.floor(R() * 5)); if (isHost()) for (let k = 0; k < 3; k++) spawnEnemy('crawler', x + .5 + rnd(-4, 4), y); say('The Blight stirs...', 3, '#c87aff'); K.sfx(90, .5, 'sawtooth', .08, -40); K.shake(6); hearts++; if (hearts % 3 === 0 && isHost() && !ents.some(q => KIND[q.kind].boss)) setTimeout(() => summon('gloom', x - 14, y + 6), 1200); else if (hearts % 3 === 2) setTimeout(() => say('Something deep in the Blight is getting angry...', 4, '#c87aff'), 3200); return; }
    if (t === T.POT && R() < .4) dropItem('ccoin', x + .5, y, Math.floor(rnd(15, 70) * (y > DY(100) ? 2.5 : 1)));
    if (t === T.POT && R() < .03) { dropItem(R() < .12 ? 'lodestar' : 'homeshard', x + .5, y, 1); K.chime(660, [0, 7, 12]); return; }
    if (t === T.POT) { const r = R(); dropItem(r < .3 ? 'potion' : r < .6 ? 'torch' : r < .8 ? (y > DY(100) ? 'shot' : 'arrow') : 'gel', x + .5, y, r < .3 ? 1 : 3 + Math.floor(R() * 8)); K.sfx(900, .08, 'square', .05); return; }
    if ((t === T.DIRT || t === T.GRASS) && R() < .035) dropItem('worm', x + .5, y, 1); if ((t === T.GLOWCAP || t === T.GMOSS) && R() < .2) dropItem('glowgrub', x + .5, y, 1);
    if (DROP[t]) dropItem(t === T.PLAT ? PLATIT[PVA()[y * WW + x] & 15] || 'platform' : DROP[t], x + .5, y + .3, 1);
    const up = at(x, y - 1); if ([T.TABLE, T.CHAIR, T.LANTERN, T.CAMPFIRE, T.BED, T.BOOKS, T.TORCH, T.BENCH, T.FURNACE, T.ANVIL, T.CRYSTAL, T.CHEST, T.GCHEST, T.MUSH, T.POT, T.DOOR, T.DOORO, T.GLOWCAP, T.BHEART, T.STARFORGE, T.RUNEANVIL].includes(up)) breakTile(x, y - 1);
  }
  let feed = [];
  let chatOn = false;
  function chatBox() { let el = document.getElementById('chatIn'); if (el) return el; el = document.createElement('input'); el.id = 'chatIn'; el.maxLength = 120; el.autocomplete = 'off'; el.placeholder = 'Say something... (Enter to send, Esc to close)';
    el.style.cssText = 'position:fixed;left:12px;bottom:12px;width:min(520px,calc(100vw - 24px));padding:9px 12px;border-radius:10px;border:2px solid rgba(255,255,255,.35);background:rgba(8,10,24,.82);color:#fff;font:16px "Pixelify Sans",monospace;z-index:30;display:none;user-select:text';
    el.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') { const s = el.value.replace(/\s+/g, ' ').trim().slice(0, 120); if (s && online()) { MP.send({ t: 'chat', s, n: MP.name }); feedAdd((MP.name || 'You') + ': ' + s, '#ffffff', 1); } closeChat(); } else if (e.key === 'Escape') closeChat(); };
    el.onkeyup = e => e.stopPropagation(); el.onblur = () => setTimeout(closeChat, 0); document.body.appendChild(el); return el; }
  function chatLogBox() { let el = document.getElementById('chatLog'); if (el) return el; el = document.createElement('div'); el.id = 'chatLog'; el.style.cssText = 'position:fixed;left:12px;bottom:58px;width:min(520px,calc(100vw - 24px));max-height:38vh;overflow-y:auto;padding:8px 10px;border-radius:10px;background:rgba(8,10,24,.72);border:2px solid rgba(255,255,255,.2);font:15px "Pixelify Sans",monospace;z-index:30;display:none;color:#fff'; el.onpointerdown = e => e.preventDefault(); document.body.appendChild(el); return el; }
  function openChat() { if (!online() || chatOn) return; chatOn = true; keys = {}; useHeld = false; const el = chatBox(); el.value = ''; el.style.display = 'block';
    const lg = chatLogBox(); lg.textContent = ''; if (!chatLog.length) { const p = document.createElement('div'); p.textContent = 'No messages yet. Say hi!'; p.style.opacity = .7; lg.appendChild(p); } for (const m of chatLog) { const p = document.createElement('div'); p.textContent = '[' + m.at + '] ' + m.s; p.style.color = m.c; p.style.margin = '2px 0'; lg.appendChild(p); } lg.style.display = 'block'; lg.scrollTop = lg.scrollHeight; setTimeout(() => el.focus(), 0); }
  function closeChat() { { const lg = document.getElementById('chatLog'); if (lg) lg.style.display = 'none'; } if (!chatOn) return; chatOn = false; const el = document.getElementById('chatIn'); if (el) { el.style.display = 'none'; el.blur(); } }
  const chatLog = [];
  function feedAdd(s, c, chat) { if (!online()) return; const d = new Date(); chatLog.push({ s, c: c || '#ffffff', at: d.getHours() % 12 + (d.getHours() % 12 ? 0 : 12) + ':' + String(d.getMinutes()).padStart(2, '0') }); if (chatLog.length > 60) chatLog.shift(); if (chatOn) { const lg = document.getElementById('chatLog'); if (lg) { const p = document.createElement('div'); const m = chatLog[chatLog.length - 1]; p.textContent = '[' + m.at + '] ' + m.s; p.style.color = m.c; p.style.margin = '2px 0'; lg.appendChild(p); lg.scrollTop = lg.scrollHeight; } } feed.push({ s, chat: !!chat, c: c || '#ffffff', t: 0, at: d.getHours() % 12 + (d.getHours() % 12 ? 0 : 12) + ':' + String(d.getMinutes()).padStart(2, '0') }); if (feed.length > 8) feed.shift(); }
  function drawFeed(g, dt) { if (!online()) { feed.length = 0; return; } if (chatOn) return; feed = feed.filter(f => (f.t += dt) < (f.chat ? 24 : 14) || chatOn); if (!feed.length) return; if (chatOn) feed.forEach(f => f.t = Math.min(f.t, 3)); const v = K.view, base = (invOpen ? 584 : v.y1 - (touch && !kbd ? 230 : 22)) - (chatOn ? 58 : 0);
    g.font = `15px ${PXF}`; feed.slice(chatOn ? -10 : -6).reverse().forEach((f, i) => { const y = base - i * 24, s = '[' + f.at + '] ' + f.s, w = g.measureText(s).width + 16; { const L = f.chat ? 24 : 14; g.globalAlpha = f.t > L - 3 ? Math.max(0, (L - f.t) / 3) : 1; } g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(v.x0 + 10, y - 17, w, 22); outlined(g, s, v.x0 + 18, y, 15, f.c); }); g.globalAlpha = 1; }
  let picks = [];
  function pickTxt(id, n) { const o = picks.find(p => p.id === id && p.t < 1.4); if (o) { o.n += n; o.t = 0; return; } picks.push({ id, n, t: 0 }); if (picks.length > 6) picks.shift(); }
  function drawPicks(g, dt) { if (!P) return; picks = picks.filter(p => (p.t += dt) < 2.4); picks.forEach((p, i) => { const k = picks.length - 1 - i, a = p.t > 1.8 ? 1 - (p.t - 1.8) / .6 : 1; g.globalAlpha = Math.max(0, a); outlined(g, IT[p.id].n + (p.n > 1 ? ' (' + p.n + ')' : ''), sx(P.x), sy(P.y - 3.3) - k * 21 - Math.min(p.t, .4) * 20, 18, IT[p.id].r ? RAR[IT[p.id].r] : '#ffffff', 'center'); }); g.globalAlpha = 1; }
  let dropSeq = 0;
  // a drop everyone in the world sees (u: its id across the room)
  function addDrop(d) { if (online()) { d.u = d.u || (MP.id * 1e6 + (++dropSeq)); MP.send({ t: 'dr', u: d.u, k: d.id, n: d.n, x: +d.x.toFixed(2), y: +d.y.toFixed(2), vx: +(d.vx || 0).toFixed(1), vy: +(d.vy || 0).toFixed(1), dt: d.t || 0, m: d.m || null }); } drops.push(d); }
  // picking up a shared drop: the host takes it at once; a guest asks the host, who answers with who got it
  function takeDrop(d) { if (!d.u || !online()) return give(d.id, d.n, d.m); if (isHost()) { if (!give(d.id, d.n, d.m)) return false; MP.send({ t: 'dp', u: d.u, w: MP.id }); return true; }
    if (!d.req || anim - d.req > 1.5) { d.req = anim; MP.to(MP.hostId, { t: 'dq', u: d.u }); } return false; }
  function dropMsg(m, from) { if (m.t === 'dr') { if (typeof m.k !== 'string' || !IT[m.k] || !(m.n > 0) || drops.some(q => q.u === m.u)) return true; drops.push({ u: m.u, id: m.k, n: m.n | 0, x: +m.x, y: +m.y, vx: +m.vx || 0, vy: +m.vy || 0, t: Math.min(+m.dt || 0, .4), m: m.m || undefined }); return true; }
    if (m.t === 'dq') { if (!isHost()) return true; const d = drops.find(q => q.u === m.u && !q.dead); if (d) { d.dead = 1; MP.send({ t: 'dp', u: d.u, w: from, k: d.id, n: d.n, m: d.m || null }); } return true; }
    if (m.t === 'dp') { const d = drops.find(q => q.u === m.u); if (d) d.dead = 1; if (m.w === MP.id && from !== MP.id && m.k && IT[m.k]) { if (give(m.k, m.n, m.m || undefined)) { pickTxt(m.k, m.n); K.sfx(900, .04, 'square', .04); } else addDrop({ id: m.k, n: m.n, x: P.x, y: P.y - 1, vx: 0, vy: -3, t: 0, m: m.m || undefined }); } return true; }
    return false; }
  function dropItem(id, x, y, n) { addDrop({ id, n, x, y, vx: rnd(-3, 3), vy: -rnd(4, 8), t: 0 }); }

  /* ---------- lighting ---------- */
  // camera zoom, like Terraria's: the world is drawn bigger around the screen centre; menus and the HUD are not.
  // 4/3 and 3/2 keep 24px tiles on whole pixels (32 and 36) so the pixel art stays crisp
  const ZOOM = () => posed ? 1 : (K.save && K.save.zoom) || (touch ? 1.5 : 4 / 3);
  const WV = () => { const v = K.view, z = ZOOM(); return { x0: 640 + (v.x0 - 640) / z, x1: 640 + (v.x1 - 640) / z, y0: 360 + (v.y0 - 360) / z, y1: 360 + (v.y1 - 360) / z }; };
  const wmx = () => 640 + (mx - 640) / ZOOM(), wmy = () => 360 + (my - 360) / ZOOM();   // pointer in world-drawing space
  const scrX = X => 640 + (X - 640) * ZOOM(), scrY = Y => 360 + (Y - 360) * ZOOM();    // world-drawing space to screen
  const NATG = new Set([T.DIRT, T.GRASS, T.STONE, T.SAND, T.SNOW, T.ICE, T.MUD, T.JGRASS, T.BGRASS, T.RGRASS, T.SSTONE, T.ASH, T.BSTONE, T.LSTONE, T.COPPER, T.IRON, T.GOLD, T.SILVER, T.GMOSS, T.HELLSTONE, T.SHADOW]);
  let bgCache = new Map(), bgTiles = null;
  // the top of the natural ground in a column: the deeper of the generated surface and the first natural block from there
  function bgTop(x) { x = clamp(x, 0, WW - 1); let v = bgCache.get(x); if (v !== undefined) return v; const s0 = surf[x]; let y = Math.max(0, s0 - 40); while (y < WH && !NATG.has(tiles[y * WW + x])) y++; v = Math.max(s0, Math.min(y, WH)); bgCache.set(x, v); return v; }
  function computeLight() { bgCache.clear();
    const v = WV(), vw = Math.ceil((v.x1 - v.x0) / TS) + 26, vh = Math.ceil((v.y1 - v.y0) / TS) + 26; lx0 = Math.floor((cam.x + v.x0) / TS) - 13; ly0 = Math.floor((cam.y + v.y0) / TS) - 13; lw = vw; lh = vh;
    if (!light || light.length !== vw * vh) light = new Float32Array(vw * vh);
    const sun = dayLight();
    for (let i = 0; i < vw; i++) { const x = lx0 + i, sfx = bgTop(x); let open = true, gap = 0;
      for (let j = 0; j < vh; j++) { const y = ly0 + j, t = at(x, y), k = j * vw + i, wl = x >= 0 && x < WW && y >= 0 && y < WH ? walls[y * WW + x] : 0; if (open && y >= 0) { if ((SOLID.has(t) && t !== T.GLASS) || (wl && wl !== 13 && y > sfx + 2)) { open = false; gap = 0; } }
        else if (!open && y < sfx - 1) { if (!SOLID.has(t) && !wl) { if (++gap >= 5) open = true; } else gap = 0; }
        let L = y < 0 || open ? sun : 0;
        if (t === T.TORCH || t === T.LANTERN) L = 1.15; else if (t === T.CAMPFIRE) L = Math.max(L, 1); else if (t === T.FURNACE) L = Math.max(L, .9); else if (t === T.CRYSTAL || t === T.GCHEST) L = Math.max(L, .5); else if (t === T.HELLSTONE) L = Math.max(L, .55); else if (t === T.GLOWCAP || t === T.BHEART || t === T.STARFORGE) L = Math.max(L, .7); else if (t === T.GMOSS || t === T.CAPBLK) L = Math.max(L, .4); else if (y >= HELL && t === T.AIR) L = Math.max(L, .45);
        if (liq && x >= 0 && y >= 0 && x < WW && y < WH && liq[y * WW + x] && lqk[y * WW + x] === 2) L = Math.max(L, .85); light[k] = L; } }
    for (const p of allPlayers()) { const pi = Math.floor(p.x) - lx0, pj = Math.floor(p.y - 1.4) - ly0; if (pi >= 0 && pi < vw && pj >= 0 && pj < vh) light[pj * vw + pi] = Math.max(light[pj * vw + pi], .62); }
    { const lamp = id => id && IT[id] && (IT[id].tile === T.TORCH || IT[id].tile === T.LANTERN), glowAt = p => { const pi = Math.floor(p.x) - lx0, pj = Math.floor(p.y - 1.6) - ly0; for (const [a, b, v] of [[0, 0, 1.15], [0, -1, 1.1], [0, 1, 1.1], [1, 0, 1.1], [-1, 0, 1.1]]) { const i = pi + a, j = pj + b; if (i >= 0 && i < vw && j >= 0 && j < vh) light[j * vw + i] = Math.max(light[j * vw + i], v); } };
      if (P && !dead && lamp(cur() && cur().id)) glowAt(P); for (const [, o] of others) if (o.p && o.p.x != null && !o.dead && lamp(o.held)) glowAt(o.p); }
    for (const p of projs) if (['farrow', 'spark', 'flame', 'missile', 'star', 'beam', 'skull'].includes(p.k)) { const pi = Math.floor(p.x) - lx0, pj = Math.floor(p.y) - ly0; if (pi >= 0 && pi < vw && pj >= 0 && pj < vh) light[pj * vw + pi] = 1; }
    const dec = (i, j) => { const t = at(lx0 + i, ly0 + j); return SOLID.has(t) && t !== T.GLASS ? .14 : .075; };
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < vh; j++) { let c = 0; for (let i = 0; i < vw; i++) { const k = j * vw + i; c = Math.max(c - dec(i, j), light[k]); light[k] = c; } c = 0; for (let i = vw - 1; i >= 0; i--) { const k = j * vw + i; c = Math.max(c - dec(i, j), light[k]); light[k] = c; } }
      for (let i = 0; i < vw; i++) { let c = 0; for (let j = 0; j < vh; j++) { const k = j * vw + i; c = Math.max(c - dec(i, j), light[k]); light[k] = c; } c = 0; for (let j = vh - 1; j >= 0; j--) { const k = j * vw + i; c = Math.max(c - dec(i, j), light[k]); light[k] = c; } }
    }
  }
  const lightAt = (x, y) => { const i = Math.floor(x) - lx0, j = Math.floor(y) - ly0; return i < 0 || j < 0 || i >= lw || j >= lh ? 0 : light[j * lw + i]; };

  /* ---------- drawing ---------- */
  const sx = x => x * TS - cam.x, sy = y => y * TS - cam.y;
  const CLOUDS = [[.05, 60, 180, .3], [.3, 20, 120, .5], [.52, 90, 220, .2], [.74, 40, 150, .45], [.9, 110, 100, .6], [.18, 140, 90, .7]];
  function sky(g) {
    const v = K.view, dl = dayLight(), d = time % 1, hell = cam.y / TS > HELL - 30, gr = g.createLinearGradient(0, 0, 0, 720);
    if (hell) { gr.addColorStop(0, '#3a0a06'); gr.addColorStop(1, '#8a2a0a'); g.fillStyle = gr; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); return; }
    const top = night() ? '#0a0e24' : `rgb(${Math.round(40 + 60 * dl)},${Math.round(80 + 90 * dl)},${Math.round(150 + 90 * dl)})`, bot = night() ? '#1a2244' : `rgb(${Math.round(120 + 100 * dl)},${Math.round(170 + 60 * dl)},${Math.round(210 + 40 * dl)})`;
    gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const a = ((d < .62 ? d / .62 : (d - .62) / .38)) * Math.PI, bx = 640 - Math.cos(a) * 560, by = 420 - Math.sin(a) * 340;
    if (!night()) { const sg = g.createRadialGradient(bx, by, 10, bx, by, 90); sg.addColorStop(0, 'rgba(255,240,170,.55)'); sg.addColorStop(1, 'rgba(255,240,170,0)'); g.fillStyle = sg; g.fillRect(bx - 90, by - 90, 180, 180); g.imageSmoothingEnabled = false; drawDisc(g, '#fff2a0', bx, by, 8, 3); drawDisc(g, '#ffd23f', bx, by, 6, 3); g.fillStyle = '#fff6c8'; g.fillRect(Math.round(bx / 3) * 3 - 9, Math.round(by / 3) * 3 - 12, 6, 3); }
    else { g.fillStyle = '#e8e8f0'; g.fillRect(bx - 18, by - 18, 36, 36); g.fillStyle = '#b8b8c8'; g.fillRect(bx - 8, by - 6, 8, 8); g.fillRect(bx + 4, by + 6, 6, 6); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${(.3 + .5 * Math.abs(Math.sin(anim * (.5 + i % 5 * .3) + i))).toFixed(2)})`; g.fillRect(v.x0 + (i * 211) % (v.x1 - v.x0), v.y0 + (i * 97) % (380 - v.y0), 2, 2); } }
    for (const c of CLOUDS) { const CW = v.x1 - v.x0 + 420, cx = ((c[0] * 1600 - cam.x * .08 + time * 2400 * c[3]) % CW + CW) % CW + v.x0 - 210, cy = c[1] - cam.y * .04 + 120, w = c[2]; const S = 4, q = v => Math.round(v / S) * S, cc = night() ? '#3c4670' : '#f4f8ff', sh = night() ? '#2a3058' : '#c8d8f0'; g.imageSmoothingEnabled = false; g.fillStyle = sh; g.fillRect(q(cx + w * .06), q(cy + w * .14), q(w * .88), q(w * .14)); g.fillStyle = cc; g.fillRect(q(cx), q(cy + w * .06), q(w), q(w * .12)); drawDisc(g, cc, cx + w * .36, cy + w * .02, Math.max(2, Math.round(w * .17 / S)), S); drawDisc(g, cc, cx + w * .62, cy + w * .05, Math.max(2, Math.round(w * .12 / S)), S); drawDisc(g, cc, cx + w * .16, cy + w * .08, Math.max(2, Math.round(w * .09 / S)), S); }
    drawBiomeBg(g, v);
  }
  /* ---------- pixel sprites: painted once into small canvases, with automatic outlines and light-from-above shading ---------- */
  const SPRC = new Map();
  const hx = c => { if (c[0] === '~') c = c.slice(1); let h = c.slice(1); if (h.length === 3) h = h.replace(/./g, d => d + d); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255]; };
  const toHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const shadeC = (c, k) => { const [r, g, b] = hx(c); return k < 1 ? toHex(r * k, g * k, b * k) : toHex(r + (255 - r) * (k - 1), g + (255 - g) * (k - 1), b + (255 - b) * (k - 1)); };
  const mixC = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
  function mkSpr(w, h, paint, o = {}) {
    const W = w + 2, H = h + 2, buf = new Array(W * H).fill(null);
    const P = { w, h,
      px(x, y, c) { x = Math.floor(x) + 1; y = Math.floor(y) + 1; if (x >= 0 && y >= 0 && x < W && y < H) buf[y * W + x] = c; },
      rect(x, y, ww, hh, c) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) P.px(x + i, y + j, c); },
      ell(cx, cy, rx, ry, c) { for (let y = Math.floor(cy - ry - 1); y <= cy + ry; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx; x++) { const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry; if (dx * dx + dy * dy <= 1) P.px(x, y, c); } },
      line(x0, y0, x1, y1, c, t = 1) { const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2) + 1; for (let i = 0; i <= n; i++) P.rect(Math.round(x0 + (x1 - x0) * i / n - (t - 1) / 2), Math.round(y0 + (y1 - y0) * i / n - (t - 1) / 2), t, t, c); },
      tri(x0, y0, x1, y1, x2, y2, c) { const mnx = Math.floor(Math.min(x0, x1, x2)), mxx = Math.ceil(Math.max(x0, x1, x2)), mny = Math.floor(Math.min(y0, y1, y2)), mxy = Math.ceil(Math.max(y0, y1, y2)); const s = (ax, ay, bx, by, px, py) => (bx - ax) * (py - ay) - (by - ay) * (px - ax);
        for (let y = mny; y <= mxy; y++) for (let x = mnx; x <= mxx; x++) { const px = x + .5, py = y + .5, a = s(x0, y0, x1, y1, px, py), b = s(x1, y1, x2, y2, px, py), d = s(x2, y2, x0, y0, px, py); if ((a >= 0 && b >= 0 && d >= 0) || (a <= 0 && b <= 0 && d <= 0)) P.px(x, y, c); } },
      get(x, y) { x = Math.floor(x) + 1; y = Math.floor(y) + 1; return x >= 0 && y >= 0 && x < W && y < H ? buf[y * W + x] : null; },
      del(x, y) { x = Math.floor(x) + 1; y = Math.floor(y) + 1; if (x >= 0 && y >= 0 && x < W && y < H) buf[y * W + x] = null; } };
    paint(P);
    const out = new Array(W * H).fill(null);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = buf[y * W + x];
      if (c) { if (c[0] === '~' || o.flat) { out[y * W + x] = c; continue; } const up = y > 0 ? buf[(y - 1) * W + x] : null, dn = y < H - 1 ? buf[(y + 1) * W + x] : null, lf = x > 0 ? buf[y * W + x - 1] : null;
        out[y * W + x] = !up ? shadeC(c, o.hi || 1.22) : !dn ? shadeC(c, o.lo || .74) : !lf && o.side !== false ? shadeC(c, 1.08) : c; continue; }
      if (o.outline === false) continue; let n = null; for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && buf[yy * W + xx] && buf[yy * W + xx][0] !== '~') { n = buf[yy * W + xx]; break; } }
      if (n) { const A = hx(n); out[y * W + x] = o.ol || toHex(A[0] * .28, A[1] * .28, A[2] * .32) + (A[3] < 255 ? Math.round(A[3] * .9).toString(16).padStart(2, '0') : ''); } }
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), id = g.createImageData(W, H);
    for (let i = 0; i < W * H; i++) { const c = out[i]; if (!c) continue; const [r, gg, b, a] = hx(c); id.data[i * 4] = r; id.data[i * 4 + 1] = gg; id.data[i * 4 + 2] = b; id.data[i * 4 + 3] = a; }
    g.putImageData(id, 0, 0); return cv; }
  const spr = (key, w, h, paint, o) => { let c = SPRC.get(key); if (!c) { c = mkSpr(w, h, paint, o); SPRC.set(key, c); } return c; };
  // a plant leaning in the wind: the top rows shift sideways, the roots stay put
  function swayed(key, base, k) { const kk = key + '|s' + k; let c = SPRC.get(kk); if (c) return c; c = document.createElement('canvas'); c.width = base.width + 4; c.height = base.height; const g = c.getContext('2d');
    for (let y = 0; y < base.height; y++) { const t = 1 - y / base.height; g.drawImage(base, 0, y, base.width, 1, 2 + Math.round(k * t * t * 2), y, base.width, 1); } SPRC.set(kk, c); return c; }
  function drawSpr(g, c, X, Y, s, flip, mid) { g.save(); g.translate(Math.round(X), Math.round(Y)); g.scale(flip ? -s : s, s); g.drawImage(c, -c.width / 2, mid ? -c.height / 2 : -c.height + 1); g.restore(); }
  const srng = seed => { let a = seed >>> 0 || 1; return () => { a ^= a << 13; a >>>= 0; a ^= a >> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; }; };

  /* ---------- creatures ---------- */
  const legs2 = (P, x, y, len, f, col, foot, w = 3) => { const sw = [0, 2, 0, -2][f], up = [0, 1, 0, 1][f]; P.rect(x - sw, y, w, len - up, shadeC(col, .8)); P.rect(x - sw - 1, y + len - 2 - up, w + 1, 2, foot); P.rect(x + 3 + sw, y, w, len - (1 - up), col); P.rect(x + 3 + sw, y + len - 2 - (1 - up), w + 2, 2, foot); };
  const mobHash = e => Math.imul((e.id | 0) + 7, 2654435761) >>> 0;
  const ZSKIN = [['#8aaa6a', '#4a6a7a', '#3a3a5a', '#3a2a1a'], ['#a8b4a0', '#9a2a2a', '#2a3a4a', '#1a1a1a'], ['#9a8a5a', '#d8d0c0', '#5a4a3a', '#6a5a3a'], ['#7aa880', '#6a3a6a', '#4a2a4a', '#a0602a']];
  const ZHOLD = ['csword', 'cpick', 'cax', 'torch', 'wood', 'gel', 'potion', 'whammer', 'knife', 'lens'];
  const ESKIN = [['#f0ece8', '~#d84a4a', '#a01a2a', '#8a1a2a', '#c8402a'], ['#eef2e4', '~#5aa04a', '#3a7a2a', '#1f6a2a', '#3aa04a'], ['#f0eaf4', '~#a04ad8', '#6a2a8a', '#4a1a7a', '#8a4ad8'], ['#f0e8c0', '~#e03a3a', '#8a1020', '#8a6a10', '#d8b020']];
  const MOBA = {
    buzzard: { w: 32, h: 24, n: 4, key: e => e.rage ? 'f' : 'p', paint(P, f, v) { const fe = '#5a3a26', dk = '#3e271a', hd = '#d8826a';
        if (v === 'p') { P.rect(12, 20, 1, 4, '#c8a050'); P.rect(16, 20, 1, 4, '#c8a050'); P.ell(14, 14, 7, 6.5, fe); P.tri(6, 11, 2, 20, 10, 18, dk); P.ell(13, 15, 5, 4.5, shadeC(fe, .85)); P.ell(19, 9, 3.6, 2, '~#ece4d8'); P.ell(22, 6, 2.6, 2.4, hd); P.tri(24, 5, 27, 6.5, 24, 8, '#e8d0a0'); P.px(26, 8, '#e8d0a0'); P.px(22, 5, '~#141018'); return; }
        const wy = [-7, -2, 4, -2][f]; P.tri(10, 11, 1, 11 + wy, 13, 13, dk); P.tri(18, 11, 31, 11 + wy, 17, 13, dk); P.tri(10, 11, 3, 11 + wy * .8, 12, 12, fe); P.tri(18, 11, 29, 11 + wy * .8, 18, 12, fe);
        for (const s of [-1, 1]) for (let i = 0; i < 3; i++) P.px(14 + s * (13 - i * 2), 11 + wy * (1 - i * .2) + 1, '~#2a1a10');
        P.ell(14, 13, 6, 3.4, fe); P.tri(8, 12, 3, 16, 9, 15, dk); P.ell(20, 11.5, 2.6, 1.6, '~#ece4d8'); P.ell(23, 11, 2.4, 2.1, hd); P.tri(25, 10, 28, 11.5, 25, 13, '#e8d0a0'); P.px(23, 10, '~#141018'); P.rect(12, 16, 1, 2, '#c8a050'); P.rect(15, 16, 1, 2, '#c8a050'); } },
    slime: { w: 24, h: 18, n: 4, key: e => e.c || '#3aa0ff', paint(P, f, c) { const sq = [0, 1, 2, 1][f], rx = 10.5 + sq * .7, ry = 7.5 - sq * .9, cy = 17 - ry;
        P.ell(12, cy, rx, ry, c + 'e0'); P.ell(12, cy + ry * .45, rx * .82, ry * .5, shadeC(c, .78) + 'e8'); P.ell(8, cy - ry * .45, 3, 1.6, '~#ffffffb0'); P.px(15, cy - ry * .6, '~#ffffffc0');
        P.ell(16, cy + 2, 1.4, 1.4, shadeC(c, 1.35) + 'c0'); P.px(6, cy + 2, shadeC(c, 1.4) + 'c0');
        for (const ex of [8, 15]) { P.rect(ex, cy - 1, 2, 3, '~#141420'); P.px(ex, cy - 1, '~#ffffff'); } P.rect(11, cy + 3, 3, 1, '~#141420'); } },
    rime: { w: 24, h: 22, n: 4, paint(P, f) { const c = '#a8ecff', sq = [0, 1, 2, 1][f], rx = 10.5 + sq * .7, ry = 7.5 - sq * .9, cy = 21 - ry;
        for (const [x, hh] of [[6, 5], [10, 8], [14, 6], [18, 4]]) P.tri(x - 2, cy - ry + 3, x + 2, cy - ry + 3, x, cy - ry - hh + 3, '#e8fbff');
        P.ell(12, cy, rx, ry, c + 'e8'); P.ell(12, cy + ry * .45, rx * .82, ry * .5, '#7ac8f0e8'); P.ell(8, cy - ry * .45, 3, 1.5, '~#ffffffc0');
        for (const [x, y] of [[5, 2], [17, 1], [12, 4]]) P.px(x, cy + y, '~#ffffff'); for (const ex of [8, 15]) { P.rect(ex, cy - 1, 2, 3, '~#1a3a6a'); P.px(ex, cy - 1, '~#e8fbff'); } } },
    lumenslime: { w: 24, h: 18, n: 4, paint(P, f) { const c = '#ff9aff', sq = [0, 1, 2, 1][f], rx = 10.5 + sq * .7, ry = 7.5 - sq * .9, cy = 17 - ry;
        P.ell(12, cy, rx, ry, c + 'd0'); P.ell(12, cy + ry * .45, rx * .82, ry * .5, '#d86ae8d8'); P.ell(8, cy - ry * .45, 3, 1.5, '~#ffffffc0');
        for (const [x, y, k] of [[6, 1, 0], [17, 2, 1], [12, -2, 2]]) { const s = (k + f) % 3; P.px(x, cy + y, '~#ffffff'); if (s) { P.px(x - 1, cy + y, '~#fff0ff'); P.px(x + 1, cy + y, '~#fff0ff'); P.px(x, cy + y - 1, '~#fff0ff'); P.px(x, cy + y + 1, '~#fff0ff'); } }
        for (const ex of [8, 15]) { P.rect(ex, cy - 1, 2, 3, '~#3a1040'); P.px(ex, cy - 1, '~#ffffff'); } } },
    zombie: { w: 22, h: 41, n: 4, key: e => { const h = mobHash(e); return (h % 4) + '|' + ((h >>> 5) % 4 === 0 ? ZHOLD[(h >>> 9) % ZHOLD.length] : ''); }, paint(P, f, v) { const s = +v.split('|')[0], Z = ZSKIN[s], sk = Z[0], sh = Z[1], pa = Z[2], hr = Z[3], bob = [0, 1, 0, 1][f];
        if (s === 3) for (let y = 4; y < 22; y++) P.rect(3, y + bob, 3, 1, hr);
        legs2(P, 7, 28, 13, f, pa, '#2a2a22');
        P.rect(5, 15 + bob, 10, 14, sh); if (s === 1) for (let y = 16; y < 28; y += 3) P.rect(5, y + bob, 10, 1, shadeC(sh, .7)); if (s === 3) { P.rect(4, 24 + bob, 12, 6, sh); for (let x = 4; x < 16; x += 2) P.px(x, 30 + bob, sh); }
        P.rect(7, 18 + bob, 3, 4, sk); P.rect(11, 24 + bob, 2, 3, sk); if (s !== 3) { P.rect(5, 26 + bob, 10, 2, '#3a2a1a'); P.px(9, 26 + bob, '~#a08040'); } if (s === 2) { P.px(8, 22 + bob, '#8a6a4a'); P.px(12, 19 + bob, '#8a6a4a'); }
        P.rect(12, 18 + bob, 8, 3, shadeC(sh, .8)); P.rect(19, 18 + bob, 3, 3, shadeC(sk, .85));
        P.rect(4, 4 + bob, 11, 11, sk); if (s !== 1) { P.rect(4, 4 + bob, 11, 2, hr); P.px(6, 3 + bob, hr); P.px(11, 3 + bob, hr); } else { P.px(7, 4 + bob, shadeC(sk, .8)); P.px(12, 6 + bob, shadeC(sk, .8)); } P.rect(5, 9 + bob, 3, 2, shadeC(sk, .8));
        P.rect(10, 7 + bob, 3, 3, '~#2a1a12'); P.px(11, 8 + bob, s === 2 ? '~#ffd23a' : '~#ff3a2a'); P.rect(6, 7 + bob, 2, 2, '~#3a2a18'); if (s === 1) P.px(6, 8 + bob, '~#ff3a2a'); P.rect(9, 12 + bob, 5, 2, '~#2a1a12'); P.px(10, 12 + bob, '~#e8e0c0'); P.px(12, 13 + bob, '~#e8e0c0');
        P.rect(10, 16 + bob, 9, 3, sh); P.rect(18, 16 + bob, 4, 3, sk); P.px(21, 15 + bob, sk); P.px(21, 19 + bob, sk); } },
    revenant: { w: 22, h: 41, n: 4, paint(P, f) { const sk = '#b8d8f0', cl = '#2a3a6a', bob = [0, 1, 0, 1][f];
        legs2(P, 7, 29, 12, f, '#3a4a7a', '#1a2440');
        P.rect(4, 14 + bob, 12, 16, cl); for (let x = 4; x < 16; x += 2) P.rect(x, 29 + bob + (x % 4 ? 1 : 0), 2, 2, cl); P.rect(9, 16 + bob, 2, 12, shadeC(cl, 1.25));
        P.rect(12, 17 + bob, 8, 3, cl); P.rect(19, 17 + bob, 3, 3, sk); for (const x of [13, 16]) P.rect(x, 20 + bob, 1, 3, '~#e8fbffd0');
        P.rect(3, 2 + bob, 13, 13, cl); P.rect(5, 5 + bob, 10, 9, sk); P.rect(5, 5 + bob, 10, 2, shadeC(cl, .8));
        P.rect(10, 8 + bob, 3, 2, '~#7af8ff'); P.rect(6, 8 + bob, 2, 2, '~#7af8ff'); P.rect(8, 12 + bob, 5, 1, '~#2a3a5a'); for (const x of [6, 9, 13]) P.rect(x, 15 + bob, 1, 2 + x % 2, '~#e8fbffe0'); } },
    skeleton: { w: 20, h: 41, n: 4, paint(P, f) { const b = '#e8e0c8', d = '~#2a2420', bob = [0, 1, 0, 1][f], sw = [0, 2, 0, -2][f];
        P.rect(7 - sw, 28, 2, 11, b); P.rect(6 - sw, 38, 4, 2, b); P.rect(11 + sw, 28, 2, 11, shadeC(b, .85)); P.rect(10 + sw, 38, 4, 2, shadeC(b, .85)); P.rect(6, 33, 2, 2, b); P.rect(11, 33, 2, 2, b);
        P.rect(6, 25 + bob, 8, 3, b); P.rect(9, 15 + bob, 2, 11, b); for (let y = 16; y < 24; y += 2) P.rect(6, y + bob, 8, 1, b);
        P.rect(12, 16 + bob, 6, 2, b); P.rect(17, 14 + bob, 2, 4, b); P.rect(5, 16 + bob, 2, 8, shadeC(b, .8));
        P.rect(4, 3 + bob, 12, 10, b); P.rect(6, 12 + bob, 9, 3, b); P.rect(10, 6 + bob, 4, 4, d); P.rect(5, 6 + bob, 3, 4, d); P.px(11, 7 + bob, '~#ff7a3a'); P.px(6, 7 + bob, '~#ff7a3a'); P.rect(9, 10 + bob, 2, 2, d);
        for (const x of [7, 9, 11, 13]) P.px(x, 13 + bob, d); } },
    brute: { w: 26, h: 41, n: 4, paint(P, f) { const st = '#7a7a84', bob = [0, 1, 0, 1][f], sw = [0, 2, 0, -2][f];
        P.rect(6 - sw, 29, 6, 10, shadeC(st, .85)); P.rect(14 + sw, 29, 6, 10, st); P.rect(5 - sw, 38, 7, 3, '#5a5a64'); P.rect(14 + sw, 38, 7, 3, '#5a5a64');
        P.rect(3, 12 + bob, 20, 18, st); P.rect(6, 15 + bob, 4, 3, '#6a6a74'); P.rect(14, 22 + bob, 6, 2, '#5a5a64'); P.line(8, 20 + bob, 12, 26 + bob, '~#4a4a52'); P.rect(3, 12 + bob, 7, 3, '#4a8a3a'); P.rect(17, 12 + bob, 5, 2, '#5aa04a');
        P.rect(19, 16 + bob, 6, 10, st); P.rect(18, 25 + bob, 8, 6, '#6a6a74'); P.rect(0, 16 + bob, 5, 9, shadeC(st, .75)); P.rect(0, 24 + bob, 6, 5, '#5a5a64');
        P.rect(7, 3 + bob, 12, 10, st); P.rect(7, 3 + bob, 12, 2, '#4a8a3a'); P.rect(10, 7 + bob, 8, 2, '~#2a1a10'); P.rect(11, 7 + bob, 2, 2, '~#ffb03a'); P.rect(15, 7 + bob, 2, 2, '~#ffb03a'); P.rect(10, 11 + bob, 7, 1, '#5a5a64'); } },
    shambler: { w: 24, h: 41, n: 4, paint(P, f) { const stk = '#d8d0c0', cap = '#2a9ac8', bob = [0, 1, 0, 1][f], sw = [0, 2, 0, -2][f];
        P.rect(8 - sw, 30, 3, 9, shadeC(stk, .85)); P.rect(13 + sw, 30, 3, 9, stk); P.rect(7 - sw, 38, 5, 3, '#a89a80'); P.rect(13 + sw, 38, 5, 3, '#a89a80');
        P.rect(7, 13 + bob, 10, 18, stk); P.rect(9, 15 + bob, 1, 14, '#c0b8a8'); P.rect(14, 15 + bob, 1, 14, '#c0b8a8'); P.rect(16, 18 + bob, 6, 2, stk); P.rect(21, 18 + bob, 2, 4, stk); P.rect(4, 19 + bob, 3, 7, shadeC(stk, .8));
        P.ell(12, 9 + bob, 12, 7, cap); P.rect(1, 9 + bob, 22, 3, shadeC(cap, .7)); for (let x = 3; x < 22; x += 2) P.px(x, 11 + bob, '#1a5a7a');
        for (const [x, y, r] of [[6, 6, 1.6], [12, 4, 2], [18, 7, 1.4], [9, 9, 1]]) P.ell(x, y + bob, r, r, '~#9af4ff'); P.rect(9, 14 + bob, 2, 2, '~#101820'); P.rect(14, 14 + bob, 2, 2, '~#101820'); P.px(9, 14 + bob, '~#9af4ff'); P.px(14, 14 + bob, '~#9af4ff'); } },
    stalker: { w: 22, h: 38, n: 4, paint(P, f) { const sk = '#3a8a4a', bob = [0, 1, 0, 1][f];
        legs2(P, 7, 26, 12, f, '#2f7a3e', '#1f4a26');
        P.rect(6, 13 + bob, 9, 14, sk); P.rect(8, 15 + bob, 5, 10, '#6ab05a'); P.rect(5, 24 + bob, 11, 3, '#2a6a2a'); for (let x = 5; x < 16; x += 3) P.tri(x, 27 + bob, x + 3, 27 + bob, x + 1.5, 30 + bob, '#2a6a2a');
        P.rect(13, 15 + bob, 7, 2, sk); P.rect(19, 13 + bob, 1, 9, '#8a6a3a'); P.tri(18, 13 + bob, 21, 13 + bob, 19.5, 8 + bob, '#c8c8d0');
        P.rect(6, 4 + bob, 10, 10, sk); P.rect(12, 8 + bob, 6, 4, sk); P.rect(13, 6 + bob, 2, 2, '~#ffe03a'); P.px(14, 6 + bob, '~#1a1a10'); P.rect(14, 11 + bob, 4, 1, '~#1a3a1a');
        for (const [x, y, h] of [[6, 4, 5], [8, 3, 6], [10, 3, 5]]) P.tri(x, y + bob, x + 3, y + bob, x - 2, y - h + bob, '#5ab04a'); } },
    maw: { w: 24, h: 38, n: 4, paint(P, f) { const fl = '#7a3a8a', bob = [0, 1, 0, 1][f], op = [3, 5, 6, 4][f];
        legs2(P, 8, 27, 11, f, '#5a2a6a', '#3a1a4a');
        P.ell(12, 16 + bob, 11, 12, fl); P.ell(12, 18 + bob, 8, op, '~#2a0a1a'); for (let x = 6; x < 19; x += 2) { P.tri(x, 18 + bob - op, x + 2, 18 + bob - op, x + 1, 21 + bob - op, '~#f0e8d0'); P.tri(x, 18 + bob + op, x + 2, 18 + bob + op, x + 1, 15 + bob + op, '~#f0e8d0'); }
        P.ell(13, 19 + bob, 3, 1.5, '~#d84a6a'); for (const [x, y] of [[5, 7], [12, 4], [19, 7]]) P.ell(x, y + bob, 2, 2, '~#f0e8d0'), P.px(x, y + bob, '~#e05aff');
        P.rect(3, 10 + bob, 2, 3, shadeC(fl, 1.3)); P.rect(19, 24 + bob, 2, 2, shadeC(fl, 1.3)); } },
    guardian: { w: 26, h: 46, n: 4, paint(P, f) { const go = '#c8a050', br = '#8a6a2a', bob = [0, 1, 0, 1][f];
        legs2(P, 8, 31, 14, f, br, '#5a4218', 4);
        P.rect(5, 15 + bob, 15, 17, go); P.rect(7, 18 + bob, 11, 2, br); P.rect(7, 23 + bob, 11, 2, br); P.ell(12.5, 21 + bob, 2.5, 2.5, '~#ff6a2a'); P.rect(5, 30 + bob, 15, 2, br);
        P.rect(2, 15 + bob, 4, 4, '#e0c070'); P.rect(19, 15 + bob, 4, 4, '#e0c070'); P.rect(20, 19 + bob, 3, 8, go); P.rect(23, 6 + bob, 2, 30, '#6a4a1a'); P.tri(22, 7 + bob, 26, 7 + bob, 24, 1 + bob, '#e8e8f0');
        P.rect(6, 3 + bob, 13, 13, go); P.rect(8, 7 + bob, 9, 6, '#7a5a20'); P.rect(9, 8 + bob, 2, 2, '~#ff8a2a'); P.rect(14, 8 + bob, 2, 2, '~#ff8a2a'); P.rect(11, 11 + bob, 3, 1, '~#3a2a10');
        for (let i = 0; i < 5; i++) P.tri(8 + i * 2.5, 3 + bob, 10 + i * 2.5, 3 + bob, 9 + i * 2.5, -1 + bob + (i % 2), '#ffd060'); } },
    bat: { w: 22, h: 13, n: 4, mid: 1, key: e => e.kind, paint(P, f, k) { const th = { bat: ['#4a3a4a', '#6a4a5a', '~#ff3a3a'], frostbat: ['#5a8ab8', '#a8d8f0', '~#7af8ff'], sporebat: ['#4a6a2a', '#7aa04a', '~#ffe03a'] }[k] || ['#4a3a4a', '#6a4a5a', '~#ff3a3a'];
        const wy = [-4, -1, 3, -1][f]; for (const s of [-1, 1]) { const x0 = 11 + s * 3; P.tri(x0, 5, x0 + s * 9, 5 + wy, x0 + s * 3, 8, th[1]); P.tri(x0 + s * 3, 8, x0 + s * 9, 5 + wy, x0 + s * 8, 8 + wy * .3, shadeC(th[1], .8)); if (k === 'frostbat') P.px(x0 + s * 9, 5 + wy, '~#ffffff'); }
        P.ell(11, 7, 4, 4, th[0]); P.tri(8, 4, 10, 4, 8, 0, th[0]); P.tri(12, 4, 14, 4, 14, 0, th[0]); P.px(9, 6, th[2]); P.px(12, 6, th[2]); P.px(10, 9, '~#ffffff'); P.px(12, 9, '~#ffffff');
        if (k === 'sporebat') { P.px(10, 4, '~#c8e86a'); P.px(13, 7, '~#c8e86a'); } } },
    gnawer: { w: 22, h: 16, n: 4, mid: 1, paint(P, f) { const c = '#6a3a8a', wy = [-3, 0, 3, 0][f], op = [1, 2, 3, 2][f];
        for (const s of [-1, 1]) P.tri(11 + s * 4, 5, 11 + s * 11, 3 + wy, 11 + s * 6, 9, '#8a5aaa');
        P.ell(11, 8, 7, 6, c); P.rect(6, 9, 11, op + 1, '~#1a0a1a'); for (let x = 6; x < 17; x += 2) { P.px(x, 9, '~#f0e8d0'); P.px(x + 1, 9 + op, '~#f0e8d0'); }
        P.ell(11, 5, 2.5, 2, '~#ffe03a'); P.px(11, 5, '~#1a0a1a'); P.tri(6, 3, 8, 3, 5, -1, c); P.tri(14, 3, 16, 3, 17, -1, c); } },
    eye: { w: 26, h: 18, n: 4, mid: 1, key: e => mobHash(e) % 4, paint(P, f, v) { const tw = [0, 1, 0, -1][f], S_ = ESKIN[+v];
        for (let i = 0; i < 8; i++) P.rect(i, 8 + Math.round(Math.sin(i * .9 + f * 1.5) * 1.5 + tw * (8 - i) / 8), 2, 2, S_[2]);
        P.ell(16, 9, 8, 8, S_[0]); P.line(9, 6, 13, 7, S_[1]); P.line(9, 12, 12, 10, S_[1]); P.line(15, 2, 15, 5, S_[1]); P.line(16, 16, 17, 13, S_[1]);
        if (+v === 3) { P.line(20, 3, 18, 6, S_[1]); P.line(22, 14, 20, 12, S_[1]); P.line(10, 9, 12, 9, S_[1]); } if (+v === 2) for (const [x, y] of [[11, 3], [21, 4], [12, 15]]) P.tri(x - 1, y + 1, x + 1, y + 1, x, y - 2, '#6a2a8a'); } },
    wraith: { w: 22, h: 26, n: 4, mid: 1, paint(P, f) { const cl = '#3a2a5a';
        P.ell(11, 9, 8, 8, cl); P.rect(3, 9, 16, 9, cl); for (let x = 3; x < 19; x += 3) { const d = (x + f * 3) % 6 < 3 ? 3 : 6; P.tri(x, 17, x + 3, 17, x + 1.5, 17 + d, cl + 'c0'); }
        P.ell(11, 9, 5, 5, '~#0a0614'); P.rect(8, 8, 2, 2, '~#d8a0ff'); P.rect(12, 8, 2, 2, '~#d8a0ff'); P.px(8, 8, '~#ffffff');
        for (const s of [-1, 1]) { P.rect(11 + s * 9 - 1, 12 + [0, 1, 0, -1][f], 3, 2, '#4a3a6a'); P.px(11 + s * 10, 14 + [0, 1, 0, -1][f], '~#c8b8e8'); } } },
    imp: { w: 22, h: 26, n: 4, mid: 1, paint(P, f) { const c = '#c8302a', wy = [-3, 0, 3, 0][f];
        for (const s of [-1, 1]) P.tri(11 + s * 3, 9, 11 + s * 10, 4 + wy, 11 + s * 6, 14, '#8a1a1a');
        P.rect(8, 11, 7, 9, c); P.rect(9, 19, 2, 4, c); P.rect(13, 19, 2, 4, c); P.line(8, 18, 3, 22, '#a0201a'); P.tri(1, 21, 4, 21, 2, 25, '#a0201a');
        P.rect(7, 3, 9, 8, '#e8402a'); P.tri(7, 4, 9, 4, 6, -1, '#2a0a0a'); P.tri(14, 4, 16, 4, 17, -1, '#2a0a0a'); P.rect(12, 6, 2, 2, '~#ffd23f'); P.rect(8, 6, 2, 2, '~#ffd23f'); P.rect(10, 9, 3, 1, '~#2a0a0a');
        P.rect(15, 12, 4, 2, c); P.ell(20, 11, 2, 2, '~#ffb03a'); P.px(20, 10, '~#fff2a0'); } },
    thorn: { w: 26, h: 18, n: 4, mid: 1, paint(P, f) { const wy = [-3, 0, 3, 0][f];
        for (const s of [-1, 1]) { P.tri(13 + s * 5, 7, 13 + s * 13, 4 + wy, 13 + s * 7, 11, '#5ab04a'); P.line(13 + s * 6, 8, 13 + s * 11, 5 + wy, '#3a8a2a'); }
        P.ell(13, 9, 6, 6, '#2a6a2a'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, x = 13 + Math.cos(a) * 6, y = 9 + Math.sin(a) * 6; P.tri(x - 1, y, x + 1, y, 13 + Math.cos(a) * 9, 9 + Math.sin(a) * 9, '#a0e050'); }
        P.ell(13, 9, 2.5, 2.5, '~#ff3a5a'); P.px(12, 8, '~#ffffff'); } },
    galewisp: { w: 24, h: 18, n: 4, mid: 1, paint(P, f) { for (let i = 0; i < 26; i++) { const a = i * .45 + f * 1.57, r = 2 + i * .32; P.rect(12 + Math.cos(a) * r, 9 + Math.sin(a) * r * .7, 2, 1, i % 3 ? '#e8f8ff' : '#9ad8ff'); }
        P.ell(12, 9, 3.5, 3, '#f4fcff'); P.px(11, 8, '~#2a6a9a'); P.px(13, 8, '~#2a6a9a'); } },
    prism: { w: 22, h: 20, n: 4, mid: 1, paint(P, f) { const C = ['~#ffb0f0', '~#b0c8ff', '~#b0ffe8', '~#fff0a0'];
        P.tri(11, 1, 4, 10, 11, 10, C[f % 4]); P.tri(11, 1, 18, 10, 11, 10, C[(f + 1) % 4]); P.tri(4, 10, 11, 19, 11, 10, C[(f + 2) % 4]); P.tri(18, 10, 11, 19, 11, 10, C[(f + 3) % 4]);
        P.line(11, 1, 11, 19, '~#ffffff'); P.px(7, 6, '~#ffffff'); P.rect(9, 9, 1, 2, '~#3a1a4a'); P.rect(13, 9, 1, 2, '~#3a1a4a'); } },
    sunspirit: { w: 22, h: 26, n: 4, mid: 1, paint(P, f) { const fl = [0, 1, 2, 1][f];
        P.tri(4, 14, 18, 14, 11 + (f % 2 ? 1 : -1), 0 + fl, '~#ff8a1a'); P.ell(11, 16, 8, 8, '~#ff8a1a'); P.tri(6, 14, 16, 14, 11 - (f % 2 ? 1 : -1), 4 + fl, '~#ffb02e'); P.ell(11, 17, 6, 6, '~#ffb02e'); P.ell(11, 18, 3.5, 3.5, '~#fff2a0');
        P.rect(8, 15, 2, 2, '~#7a2a0a'); P.rect(13, 15, 2, 2, '~#7a2a0a'); P.rect(10, 19, 3, 1, '~#7a2a0a'); } },
    spiderling: { w: 20, h: 13, n: 4, key: e => e.kind, paint(P, f, k) { const c = k === 'crawler' ? '#6a2a7a' : '#2a1a30', l = k === 'crawler' ? '#4a1a5a' : '#1a1020';
        if (k === 'crawler') { for (let i = 0; i < 5; i++) { P.ell(4 + i * 3, 8 - (i === 4 ? 1 : 0), 2.5, 2.5, i === 4 ? shadeC(c, 1.2) : c); P.rect(4 + i * 3, 10 + ((i + f) % 2), 1, 3 - ((i + f) % 2), l); } P.px(17, 6, '~#ff5a5a'); P.tri(18, 8, 20, 7, 19, 10, '~#e8d8c0'); return; }
        for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const ox = 10 + s * (2 + i), k2 = ((i + f) % 2) ? 1 : 0; P.line(ox, 7, ox + s * 3, 3 + k2, l); P.line(ox + s * 3, 3 + k2, ox + s * 5, 12, l); }
        P.ell(8, 8, 4, 3.5, c); P.ell(13, 8, 3, 3, shadeC(c, 1.2)); for (const [x, y] of [[13, 7], [15, 7], [14, 6], [12, 6]]) P.px(x, y, '~#ff3a3a'); } },
  };
  MOBA.frostbat = MOBA.sporebat = MOBA.bat; MOBA.crawler = MOBA.spiderling;
  // bosses that used to be simple shapes
  const BOSSA = {
    weaver: { w: 96, h: 54, n: 4, mid: 1, key: e => e.rage ? 'r' : '', paint: weaverPaint }, colossus: { w: 66, h: 80, n: 4, paint: colossusPaint },
    gloom: { w: 70, h: 54, n: 4, mid: 1, paint: gloomPaint }, sentinel: { w: 58, h: 58, n: 6, mid: 1, paint: sentinelPaint }, tyrant: { w: 90, h: 90, n: 8, mid: 1, key: e => e.rage ? 'r' : '', paint: tyrantPaint },
    king: { w: 80, h: 62, n: 4, paint(P, f) { const c = '#3a7aff', sq = [0, 1, 2, 1][f], rx = 38 + sq * 1.5, ry = 24 - sq * 2, cy = 61 - ry;
        P.ell(40, cy, rx, ry, c + 'e0'); P.ell(40, cy + ry * .45, rx * .84, ry * .5, '#2a5ad0e8'); P.ell(26, cy - ry * .5, 9, 4, '~#ffffffa0'); P.ell(52, cy + 4, 4, 4, '#7ab8ffc0'); P.ell(30, cy + 8, 3, 3, '#7ab8ffc0');
        P.rect(36, cy + 2, 7, 5, '~#ffd23fa0'); for (const ex of [28, 46]) { P.rect(ex, cy - 6, 5, 7, '~#141420'); P.rect(ex + 1, cy - 6, 2, 2, '~#ffffff'); } P.rect(34, cy + 4, 12, 2, '~#141420');
        const top = cy - ry; P.rect(26, top - 6, 28, 8, '#ffd23f'); for (const x of [26, 33, 40, 47]) P.tri(x, top - 5, x + 7, top - 5, x + 3.5, top - 16, '#ffd23f'); P.rect(26, top, 28, 2, '#c89a1a');
        for (const [x, cc] of [[30, '~#ff3a5a'], [40, '~#3ae0ff'], [50, '~#ff3a5a']]) P.rect(x - 1, top - 4, 3, 3, cc); } },
    watcher: { w: 72, h: 60, n: 4, mid: 1, paint(P, f) { return watcherPaint(P, f); for (let k = 0; k < 4; k++) for (let i = 0; i < 26; i++) P.rect(i, 26 + k * 3 + Math.round(Math.sin(i * .35 + f * 1.57 + k) * 3), 3, 2, k % 2 ? '#a01a2a' : '#7a1020');
        P.ell(46, 30, 26, 26, '#f0ece8'); for (const [a, b, c2, d] of [[22, 22, 32, 26], [22, 38, 30, 34], [44, 5, 44, 14], [50, 55, 48, 46], [64, 12, 60, 18], [66, 48, 60, 42]]) P.line(a, b, c2, d, '~#d84a4a'); } },
    bone: { w: 76, h: 72, n: 2, paint(P, f) { const b = '#e8e0c8', d = '~#1a1418', jaw = f ? 3 : 0;
        P.ell(38, 30, 30, 28, b); P.rect(18, 46, 40, 10, b); P.rect(20, 56 + jaw, 36, 12, shadeC(b, .9)); for (let x = 22; x < 56; x += 5) { P.rect(x, 54, 4, 4, '~#f8f4e8'); P.rect(x, 56 + jaw, 4, 3, '~#f8f4e8'); }
        P.ell(26, 32, 8, 9, d); P.ell(50, 32, 8, 9, d); P.tri(34, 44, 42, 44, 38, 36, d); P.line(30, 8, 36, 18, '~#b8b0a0', 2); P.line(52, 12, 48, 20, '~#b8b0a0', 2); for (const x of [10, 66]) P.ell(x, 50, 6, 5, b); } },
    ember: { w: 80, h: 80, n: 4, mid: 1, paint(P, f) { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + f * .26, r = 36 + (i % 2) * 3; P.tri(40 + Math.cos(a - .2) * 26, 40 + Math.sin(a - .2) * 26, 40 + Math.cos(a + .2) * 26, 40 + Math.sin(a + .2) * 26, 40 + Math.cos(a) * r, 40 + Math.sin(a) * r, '~#ff6a1a'); }
        P.ell(40, 40, 28, 28, '~#ff6a1a'); P.ell(40, 40, 22, 22, '~#ff9a2a'); P.ell(40, 42, 15, 15, '~#ffd23f'); P.ell(40, 44, 8, 8, '~#fff2a0'); P.rect(28, 34, 7, 6, '~#5a1a08'); P.rect(45, 34, 7, 6, '~#5a1a08'); P.rect(31, 36, 2, 2, '~#ffffff'); P.rect(48, 36, 2, 2, '~#ffffff'); P.rect(32, 50, 16, 3, '~#5a1a08'); } },
  };
  function mobFrame(e, D) { const mv = D.mid ? 1 : (Math.abs(e.vx || (e.tx != null ? e.tx - e.x : 0)) > .3 ? 1 : 0); return mv ? Math.floor((anim * (D.mid ? 9 : 7)) + (e.id || 0)) % D.n : 0; }
  function drawMob(g, e) { const k = e.kind, D = MOBA[k] || BOSSA[k]; if (!D) return false; const boss = !!BOSSA[k], f = mobFrame(e, D), v = D.key ? D.key(e) : '', key = 'mob|' + k + '|' + f + '|' + v, c = spr(key, D.w, D.h, P => D.paint(P, f, v));
    const tp = nearestP(e.x, e.y), fl = (Math.sign(tp.x - e.x) || 1) < 0, X = sx(e.x), Y = sy(e.y) + (D.mid ? -e.h * TS / 2 : 0) + (k === 'slime' || k === 'rime' || k === 'lumenslime' || k === 'king' ? 1 : 0);
    if (k === 'lumenslime' || k === 'sunspirit' || k === 'prism' || k === 'ember') { const gs = glowSprite(k === 'lumenslime' ? '255,150,255' : k === 'prism' ? '200,190,255' : '255,170,60'); const r = (boss ? 150 : 40); g.drawImage(gs, X - r, (D.mid ? Y : Y - e.h * TS / 2) - r, r * 2, r * 2); }
    if (e.hit > 0) g.globalCompositeOperation = 'lighter'; const S = 1.5;
    drawSpr(g, c, X, Y, S, fl, D.mid);
    if (k === 'eye' || k === 'watcher') { const s = k === 'watcher' ? 1 : 0, a = Math.atan2(tp.y - 1.4 - e.y, tp.x - e.x), cx = X + (fl ? -1 : 1) * (s ? 10 : 3) * S, rr = (s ? 12 : 4) * S;
      const I = s ? 9 : 3, es = s ? 0 : mobHash(e) % 4, ir = spr('iris|' + s + '|' + (e.rage ? 1 : 0) + '|' + es, I * 2 + 1, I * 2 + 1, P => { P.ell(I + .5, I + .5, I + .5, I + .5, e.rage ? '#ff3a2a' : ESKIN[es][3]); P.ell(I + .5, I + .5, I * .7, I * .7, e.rage ? '#ff6a3a' : ESKIN[es][4]); P.ell(I + .5, I + .5, I * .42, I * .42, '~#101010'); P.px(I - I * .25, I - I * .25, '~#ffffff'); if (s) P.rect(I - 3, I - 3, 2, 2, '~#ffffff'); }); drawSpr(g, ir, cx + Math.cos(a) * rr, Y + Math.sin(a) * rr, S, false, true); }
    if (k === 'zombie') { const hd = v.split('|')[1]; if (hd && IT[hd]) icon(g, hd, X + (fl ? -1 : 1) * 14 - (fl ? -1 : 1) * 0, Y - 36 + (f % 2) * 1.5, .9); }
    if (e.hit > 0) g.globalCompositeOperation = 'source-over';
    if (!boss && !KIND[k].proj && e.hp < e.max) { const w = 28, Yb = sy(e.y) + 4; g.fillStyle = '#1a1a1a'; g.fillRect(X - w / 2, Yb, w, 5); g.fillStyle = '#3ad84a'; g.fillRect(X - w / 2, Yb, w * Math.max(0, e.hp / e.max), 5); }
    return true; }
  /* ---------- trees: one painted canopy per tree instead of a pile of leaf blobs ---------- */
  const LEAFP = { forest: ['#1f5418', '#2a6c20', '#3a8a2a', '#52a83a', '#78c850'], blight: ['#341442', '#4e1e60', '#682c7e', '#8442a0', '#ac6ecc'], radiant: ['#a04490', '#c46ab0', '#e092cc', '#f6bce2', '#fff0fa'],
    jungle: ['#123e1e', '#1a5a2a', '#267638', '#3a9446', '#5eb858'], frost: ['#1a4a3e', '#22604c', '#2e7a5e', '#4a9a78', '#e8f4ff'] };
  function canopySpr(kind, v, wT, hT) {
    return spr('can|' + kind + '|' + v + '|' + wT + '|' + hT, wT * 16, hT * 16, P => {
      const rnd = srng(v * 7919 + wT * 31 + hT * 7 + kind.length), W = wT * 16, H = hT * 16, pal = LEAFP[kind], lobes = [], big = wT >= 14, n = Math.round(wT * hT / (big ? 2 : 4)) + 4;
      const hangX = x => { x = Math.floor(x); for (let y = H - 1; y >= 0; y--) if (P.get(x, y)) return y + 1; return -1; };   // where something can hang from: the canopy's lowest leaf in that column
      if (big) { for (let i = 0; i < 7; i++) lobes.push([W * (.2 + i * .1), H * (.44 + Math.abs(i - 3) * .04), Math.min(W, H) * .24]); for (let i = 0, tries = 0; i < n && tries < n * 30; tries++) { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()), L = [W / 2 + Math.cos(a) * d * (W / 2 - 22), H * .44 + Math.sin(a) * d * (H * .38 - 16), 14 + rnd() * 9]; if (!lobes.some(o => Math.hypot(o[0] - L[0], o[1] - L[1]) < (o[2] + L[2]) * .7)) continue; lobes.push(L); i++; } }
      else lobes.push([W / 2, H * .5, Math.min(18, Math.min(W, H) * .32)]); if (!big) for (let i = 0, tries = 0; i < n && tries < n * 30; tries++) { const a = rnd() * Math.PI * 2, d = .15 + .85 * Math.sqrt(rnd()), L = [W / 2 + Math.cos(a) * d * (W / 2 - 14), H * .5 + Math.sin(a) * d * (H / 2 - 12), 10 + rnd() * 4]; if (!lobes.some(o => Math.hypot(o[0] - L[0], o[1] - L[1]) < (o[2] + L[2]) * .7)) continue; lobes.push(L); i++; }
      lobes.sort((a, b) => a[1] - b[1]);
      for (const [x, y, r] of lobes) P.ell(x + 1, y + 3, r + 1.5, r * .82 + 1.5, pal[0]);
      for (const [x, y, r] of lobes) { P.ell(x, y, r, r * .82, pal[2]); P.ell(x - r * .2, y - r * .28, r * .66, r * .5, pal[3]); P.ell(x - r * .38, y - r * .44, r * .26, r * .2, pal[4]); }
      for (let i = 0; i < W * H / 22; i++) { const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H), c = P.get(x, y); if (!c || c[0] === '~') continue; const lt = c === pal[3] || c === pal[4];
        if (P.get(x + 1, y + 1) && P.get(x + 2, y + 2)) { P.px(x, y, lt ? pal[2] : pal[1]); P.px(x + 1, y + 1, lt ? pal[2] : pal[1]); P.px(x + 1, y, lt ? pal[4] : pal[3]); } }
      if (kind === 'frost') for (let x = 0; x < W; x++) { let y = 0; while (y < H && !P.get(x, y)) y++; if (y < H) { P.px(x, y, '~#f4f8ff'); P.px(x, y + 1, '~#dde8f8'); if (rnd() < .4) P.px(x, y + 2, '~#c8d8ec'); } }
      if (kind === 'blight') { for (let i = 0; i < wT * 2; i++) { const x = Math.floor(6 + rnd() * (W - 12)), y = hangX(x); if (y < 0) continue; const L = 4 + rnd() * 10; P.line(x, y - 1, x + rnd() * 2 - 1, y + L, pal[1]); P.px(x, y + L, '~#e05aff'); }
        for (let i = 0; i < wT; i++) { const x = rnd() * W, y = rnd() * H; if (P.get(x, y)) P.ell(x, y, 1.5, 1.5, '~#e070ff'); } }
      if (kind === 'radiant') for (let i = 0; i < wT * 2; i++) { const x = rnd() * W, y = rnd() * H; if (P.get(x, y + 2)) P.tri(x - 1.5, y + 2, x + 1.5, y + 2, x, y - 3, '~#e8ffff'); }
      if (kind === 'forest' && v % 3 === 0) for (let i = 0; i < wT; i++) { const x = rnd() * W, y = rnd() * H; if (P.get(x, y) && P.get(x, y + 2)) { P.rect(x, y, 2, 2, '~#d83a3a'); P.px(x, y, '~#ff8a7a'); } }
      if (kind === 'forest' && v % 3 === 1) for (let i = 0; i < wT * 1.5; i++) { const x = rnd() * W, y = rnd() * H; if (P.get(x, y)) { P.px(x, y, '~#fff0f8'); P.px(x + 1, y, '~#ffc8e0'); } }
      if (kind === 'jungle') { for (let i = 0; i < wT * (big ? 2.4 : 1.6); i++) { const x = Math.floor(4 + rnd() * (W - 8)), y = hangX(x); if (y < 0) continue; const L = 6 + rnd() * (big ? 34 : 24); for (let k = 0; k < L; k++) P.px(x + Math.round(Math.sin(k * .5) * .8), y + k, k % 4 === 3 ? pal[3] : pal[1]); }
        for (let i = 0; i < wT; i++) { const x = rnd() * W, y = rnd() * H; if (P.get(x, y)) { P.ell(x, y, 1.8, 1.8, '~#ff5aa0'); P.px(x, y, '~#ffe680'); } } }
    }, { hi: 1.12, lo: .7 }); }
  function pineSpr(h, v) { const rows = h - 1, wmax = Math.floor(Math.max(0, h - 3) / 2.4) + 1, W = (wmax * 2 + 1) * 16 + 8, H = rows * 16;
    return spr('pine|' + h + '|' + v, W, H, P => { const rnd = srng(h * 131 + v * 17 + 3), cx = W / 2, tiers = Math.max(3, Math.round(rows / 1.5));
      for (let i = 0; i < tiers; i++) { const t0 = 1 + i * (H - 12) / tiers, t1 = t0 + (H - 12) / tiers + 11, hw = 7 + (i + 1) / tiers * (W / 2 - 7);
        P.tri(cx, t0, cx - hw, t1, cx + hw, t1, i % 2 ? '#1e4a34' : '#245a3e'); P.tri(cx, t0 + 4, cx - hw * .5, t1 - 2, cx - 1, t1 - 2, '#2e6e4a');
        for (let k = 0; k < hw / 3; k++) { const x = cx - hw + 2 + rnd() * (hw * 2 - 4); P.px(x, t1 - 1 - rnd() * 4, '#173a2a'); }
        for (let x = Math.floor(cx - hw); x < cx + hw; x++) { let y = Math.floor(t0); while (y < t1 && !P.get(x, y)) y++; if (y < t1 - 1) { P.px(x, y, '~#f4f8ff'); if (rnd() < .65) P.px(x, y + 1, '~#dde8f8'); } } }
      P.px(cx, 0, '~#ffffff'); }, { hi: 1.12, lo: .7 }); }
  const rootSpr = kind => spr('root|' + kind, 36, 9, P => { const c = kind === 'blight' ? '#4a3040' : '#6a4424'; P.rect(13, 0, 10, 9, c); P.tri(13, 3, 13, 9, 3, 9, c); P.tri(23, 3, 23, 9, 33, 9, c); P.line(4, 8, 0, 9, c); P.line(31, 8, 35, 9, c); P.rect(16, 1, 1, 7, '#4a2e14'); P.rect(20, 2, 1, 6, '#8a5a32'); });
  const branchSpr = (kind, s) => spr('br|' + kind + '|' + s, 22, 14, P => { const pal = LEAFP[kind] || LEAFP.forest; P.line(0, 10, 12, 6, '#6a4424', 2); P.ell(15, 6, 6, 5, pal[2]); P.ell(13, 4, 3.5, 3, pal[3]); P.px(12, 3, pal[4]); if (kind === 'frost') { P.rect(11, 1, 7, 1, '~#f4f8ff'); } });
  // find the trees around the screen; their leaf tiles are then drawn as one canopy
  function scanTrees(x0, x1, y0, y1) { const L = [], cov = new Set(); const C = (x, y) => cov.add(y * WW + x);
    for (let x = Math.max(1, x0 - 8); x < Math.min(WW - 1, x1 + 8); x++) for (let y = Math.max(1, y0 - 14); y < Math.min(WH - 1, y1 + 16); y++) { const t = tiles[y * WW + x]; if (t !== T.TRUNK && t !== T.LWOOD) continue; const up = tiles[(y - 1) * WW + x];
      if (t === T.TRUNK && (up === T.LEAF || up === T.SLEAF)) { let b = y; while (b < WH - 1 && tiles[(b + 1) * WW + x] === T.TRUNK) b++; const gt = tiles[(b + 1) * WW + x], h = b - y + 1, hs = (Math.imul(x, 2654435761) >>> 0);
        if (up === T.SLEAF && (at(x + 1, y + 2) === T.SLEAF || at(x - 1, y + 2) === T.SLEAF)) { const wmax = Math.floor(Math.max(0, h - 3) / 2.4) + 1; for (let dy = -1; dy <= h - 2; dy++) for (let dx = -wmax - 1; dx <= wmax + 1; dx++) if (at(x + dx, y + dy) === T.SLEAF) C(x + dx, y + dy); L.push({ k: 'pine', x, y, h, b, v: hs % 3, kind: 'frost' }); continue; }
        const kind = up === T.SLEAF ? 'frost' : gt === T.BGRASS ? 'blight' : gt === T.RGRASS ? 'radiant' : gt === T.JGRASS || gt === T.MUD ? 'jungle' : 'forest';
        for (let dy = -4; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) { const tt = at(x + dx, y + dy); if (tt === T.LEAF || tt === T.SLEAF) C(x + dx, y + dy); }
        L.push({ k: 'tree', x, y, h, b, kind, v: hs % 6, w: 6 + hs % 2, hh: 5 + (hs >> 3) % 2 }); }
      else if (t === T.LWOOD && up === T.LEAF && at(x - 1, y) === T.LWOOD && at(x + 1, y) === T.LWOOD) { let r = 0; while (r < 9 && at(x + r + 1, y - 2) === T.LEAF) r++; r = Math.max(4, r);
        for (let dy = -r - 2; dy <= Math.ceil(r / 2) + 1; dy++) for (let dx = -r - 2; dx <= r + 2; dx++) if (at(x + dx, y - 1 + dy) === T.LEAF) C(x + dx, y - 1 + dy); L.push({ k: 'giant', x, y, r, v: (Math.imul(x, 2654435761) >>> 0) % 4 }); } }
    return { L, cov }; }
  function drawTrees(g, TR) { for (const t of TR.L) { const X = (t.x + .5) * TS - cam.x;
      if (t.k === 'pine') { drawSpr(g, pineSpr(t.h, t.v), X, (t.y + t.h - 1.6) * TS - cam.y, 1.5); continue; }
      if (t.k === 'giant') { const wT = t.r * 2 + 10, hT = Math.ceil(t.r * 1.2) + 7; drawSpr(g, canopySpr('jungle', t.v, wT, hT), X, (t.y - 1 + Math.ceil(t.r / 2) + 3) * TS - cam.y, 1.5); continue; }
      drawSpr(g, canopySpr(t.kind, t.v, t.w, t.hh), X, (t.y + 1.9) * TS - cam.y, 1.5); } }
  function drawTrunkBits(g, TR) { for (const t of TR.L) { if (t.k !== 'tree' && t.k !== 'pine') continue; const X = (t.x + .5) * TS - cam.x;
      if (SOLID.has(at(t.x, t.b + 1))) drawSpr(g, rootSpr(t.kind), X, (t.b + 1) * TS - cam.y + 2, 1.5);
      if (t.k === 'tree') for (let y = t.y + 2; y < t.b - 1; y++) { const hs = (Math.imul(t.x * 31 + y, 2246822519) >>> 0); if (hs % 5) continue; const s = hs & 8 ? 1 : -1; drawSpr(g, branchSpr(t.kind, 0), X + s * 22, (y + .7) * TS - cam.y, 1.5, s < 0); } } }

  /* ---------- plants and little things on the ground, different in every biome ---------- */
  const DECO = {
    grass: (P, v) => { const r = srng(v + 1); for (let i = 0; i < 6; i++) { const x = 1 + i * 2.4 + r(), h = 4 + r() * 8; P.line(x, 15, x + (r() - .5) * 3, 15 - h, i % 2 ? '#3e9e24' : '#62c838'); } },
    rgrass: (P, v) => { const r = srng(v + 1); for (let i = 0; i < 6; i++) { const x = 1 + i * 2.4 + r(), h = 4 + r() * 8; P.line(x, 15, x + (r() - .5) * 3, 15 - h, i % 2 ? '#7ad8e8' : '#e898d0'); } },
    snowgrass: (P, v) => { const r = srng(v + 1); for (let i = 0; i < 5; i++) { const x = 2 + i * 2.6 + r(), h = 3 + r() * 6; P.line(x, 15, x + (r() - .5) * 2, 15 - h, i % 2 ? '#8ab8c8' : '#c8e0ec'); P.px(x, 15 - h, '~#ffffff'); } },
    drygrass: (P, v) => { const r = srng(v + 1); for (let i = 0; i < 5; i++) { const x = 2 + i * 2.6 + r(), h = 3 + r() * 7; P.line(x, 15, x + (r() - .5) * 4, 15 - h, i % 2 ? '#a8884a' : '#d0b068'); } },
    flower: (P, v) => { const C = ['#ff5a7a', '#ffe14a', '#7ab0ff', '#f4f4ff', '#ff9a3a', '#c87aff'][v % 6]; P.line(8, 15, 8, 7, '#3a8a1e'); P.rect(9, 11, 2, 1, '#4caa2a'); P.rect(5, 12, 3, 1, '#4caa2a'); for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) P.rect(7 + dx, 5 + dy, 2, 2, C); P.rect(7, 5, 2, 2, '~#ffe680'); },
    pastel: (P, v) => { const C = ['#ffb0e0', '#b0f0ff', '#e0c0ff'][v % 3]; P.line(8, 15, 8, 6, '#7ac8b0'); for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, 1]]) P.rect(7 + dx, 4 + dy, 2, 2, C); P.rect(7, 4, 2, 2, '~#ffffff'); },
    bush: (P, v) => { P.ell(8, 11, 7.5, 5, '#2a6c20'); P.ell(6, 9, 4, 3.5, '#3a8a2a'); P.ell(11, 10, 3.5, 3, '#3a8a2a'); P.px(5, 8, '#78c850'); P.px(10, 8, '#78c850'); if (v % 2) { P.px(12, 10, '~#d83a3a'); P.px(4, 12, '~#d83a3a'); P.px(8, 9, '~#d83a3a'); } },
    snowbush: (P, v) => { P.ell(8, 11, 7.5, 5, '#22604c'); P.ell(7, 9, 4, 3.5, '#2e7a5e'); for (let x = 2; x < 15; x++) { let y = 4; while (y < 15 && !P.get(x, y)) y++; if (y < 15) P.px(x, y, '~#f4f8ff'); } },
    frostflower: (P, v) => { P.line(8, 15, 8, 8, '#6a9ab8'); for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) P.line(8, 6, 8 + dx, 6 + dy, '~#bff4ff'); P.px(8, 6, '~#ffffff'); P.rect(9, 12, 2, 1, '#6a9ab8'); },
    rock: (P, v) => { P.ell(8, 14, 4 + v % 2, 2.5, '#84848e'); P.ell(12, 15, 2, 1.4, '#6e6e78'); P.px(6, 13, '#b0b0ba'); },
    cactus: (P, v) => { P.rect(6, 4, 5, 20, '#3a8a3a'); P.rect(7, 4, 1, 20, '#5aaa4a'); P.rect(1, 10, 5, 3, '#3a8a3a'); P.rect(1, 6, 3, 5, '#3a8a3a'); if (v % 2) { P.rect(11, 13, 4, 3, '#3a8a3a'); P.rect(13, 8, 3, 6, '#3a8a3a'); } for (let y = 6; y < 22; y += 3) { P.px(5, y, '~#f0f0c8'); P.px(11, y + 1, '~#f0f0c8'); } if (v % 3 === 0) { P.rect(7, 2, 3, 2, '~#ff7ab0'); P.px(8, 1, '~#ffe680'); } },
    bones: (P, v) => { P.rect(3, 13, 9, 2, '#e8e0c8'); P.rect(2, 12, 2, 2, '#e8e0c8'); P.rect(11, 14, 2, 2, '#e8e0c8'); if (v % 2) { P.ell(12, 12, 3, 2.5, '#e8e0c8'); P.px(11, 12, '~#2a2420'); P.px(13, 12, '~#2a2420'); } },
    fern: (P, v) => { for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const L = 9 - k * 2; for (let i = 0; i < L; i++) { const x = 8 + s * i, y = 19 - k * 5 - i * .5 + i * i * .06; P.px(x, y, i % 2 ? '#3a9446' : '#267638'); P.px(x, y + 1, '#1a5a2a'); } } P.line(8, 19, 8, 6, '#1a5a2a'); },
    jtall: (P, v) => { const r = srng(v + 7); for (let i = 0; i < 6; i++) { const x = 1 + i * 2.5 + r(), h = 9 + r() * 12; P.line(x, 19, x + (r() - .5) * 4, 19 - h, i % 2 ? '#267638' : '#4ab05a'); } },
    jflower: (P, v) => { P.line(8, 19, 8, 9, '#1a5a2a'); P.ell(4, 15, 4, 2, '#267638'); P.ell(12, 13, 4, 2, '#3a9446'); const C = v % 2 ? '#ff5aa0' : '#ff8a3a'; for (let i = 0; i < 5; i++) { const a = i * 1.2566 - 1.57; P.ell(8 + Math.cos(a) * 3, 6 + Math.sin(a) * 3, 2, 2, C); } P.ell(8, 6, 1.5, 1.5, '~#ffe680'); },
    thornweed: (P, v) => { for (const [x0, h, s] of [[5, 12, -1], [9, 15, 1], [12, 9, 1]]) { P.line(x0, 19, x0 + s * 2, 19 - h, '#6e2e86'); for (let k = 3; k < h; k += 3) P.px(x0 + s * (k / h) * 2 + (k % 2 ? 1 : -1), 19 - k, '#b070d0'); } },
    eyestalk: (P, v) => { for (let i = 0; i < 12; i++) P.px(8 + Math.round(Math.sin(i * .35) * 2), 19 - i, '#552068'); P.ell(10, 5, 3.5, 3.5, '~#f0e8d0'); P.rect(10, 4, 2, 2, '~#e05aff'); P.px(10, 4, '~#1a0a1a'); },
    deadtwig: (P, v) => { P.line(8, 19, 7, 8, '#4a3a3a', 2); P.line(7, 12, 3, 7, '#4a3a3a'); P.line(8, 10, 12, 5, '#4a3a3a'); P.line(12, 5, 13, 3, '#4a3a3a'); },
    crystal: (P, v) => { for (const [x, h, c] of [[5, 7, '~#c8f8ff'], [9, 11, '~#ffc8f0'], [12, 6, '~#e0d0ff']]) { P.tri(x - 2, 15, x + 2, 15, x, 15 - h, c); P.px(x - 1, 14 - h / 2, '~#ffffff'); } },
    glowshroom: (P, v) => { for (const [x, h, r] of [[5, 5, 2.5], [10, 8, 3], [13, 4, 1.8]]) { P.rect(x, 15 - h, 1, h, '~#c8e8f0'); P.ell(x + .5, 15 - h, r, r * .6, '~#7af0ff'); P.px(x, 15 - h - 1, '~#e8ffff'); } },
    stalag: (P, v) => { P.tri(3, 15, 13, 15, 8 + (v % 3) - 1, 2 + v % 4, '#6a6a74'); P.line(8, 14, 8, 6, '#84848e'); },
    stalac: (P, v) => { P.tri(4, 0, 12, 0, 8, 10 + v % 4, '#6a6a74'); P.line(7, 1, 7, 6, '#84848e'); },
    icicle: (P, v) => { for (const [x, h] of [[4, 7], [8, 11], [12, 5]]) { P.tri(x - 1.5, 0, x + 1.5, 0, x, h - v % 3, '~#d8f4ff'); P.px(x, 1, '~#ffffff'); } },
    pebble: (P, v) => { P.ell(5, 14, 2, 1.4, '#7a7a84'); P.ell(10, 15, 1.5, 1, '#8a8a94'); P.ell(12, 14, 1, 1, '#6a6a74'); },
  };
  const DECOH = { cactus: 24, fern: 20, jtall: 20, jflower: 20, thornweed: 20, eyestalk: 20, deadtwig: 20 }, SWAY = new Set(['grass', 'rgrass', 'snowgrass', 'drygrass', 'flower', 'pastel', 'fern', 'jtall', 'jflower', 'thornweed', 'eyestalk', 'frostflower']);
  const decoSpr = (n, v) => spr('deco|' + n + '|' + v, 16, DECOH[n] || 16, P => DECO[n](P, v), { hi: 1.15, lo: .8 });
  function decoPick(t, x, y) { const h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0, r = h % 100, v = (h >>> 8) % 6, top = y <= surf[clamp(x, 0, WW - 1)] + 2;
    if (t === T.GRASS) return r < 30 ? ['grass', v] : r < 37 ? ['flower', v] : r < 41 ? ['bush', v % 2] : r < 43 ? ['rock', v % 2] : null;
    if (t === T.SNOW && top) return r < 22 ? ['snowgrass', v % 3] : r < 27 ? ['frostflower', 0] : r < 31 ? ['snowbush', 0] : null;
    if (t === T.SAND && top) return r < 6 && (h >>> 3) % 3 ? ['cactus', v % 3] : r < 18 ? ['drygrass', v % 3] : r < 20 ? ['bones', v % 2] : r < 22 ? ['flower', 4] : null;
    if (t === T.JGRASS) return r < 24 ? ['jtall', v % 3] : r < 40 ? ['fern', 0] : r < 46 ? ['jflower', v % 2] : null;
    if (t === T.BGRASS) return r < 22 ? ['thornweed', 0] : r < 28 ? ['eyestalk', 0] : r < 33 ? ['deadtwig', 0] : null;
    if (t === T.RGRASS) return r < 14 ? ['crystal', 0] : r < 24 ? ['pastel', v % 3] : r < 42 ? ['rgrass', v % 3] : null;
    if (t === T.GMOSS) return r < 35 ? ['glowshroom', 0] : null;
    if ((t === T.STONE || t === T.SSTONE || t === T.BSTONE) && !top && y > surf[clamp(x, 0, WW - 1)] + 6) return r < 6 ? ['stalag', v % 4] : r < 11 ? ['pebble', 0] : null;
    return null; }
  function decoHang(t, x, y) { const h = (Math.imul(x, 83492791) ^ Math.imul(y, 2971215073)) >>> 0, r = h % 100;
    if ((t === T.SNOW || t === T.ICE) && r < 22) return ['icicle', h % 3];
    if ((t === T.STONE || t === T.SSTONE || t === T.BSTONE) && y > surf[clamp(x, 0, WW - 1)] + 6 && r < 7) return ['stalac', h % 4];
    if ((t === T.JGRASS || t === T.MUD || t === T.LWOOD) && r < 32 && inJungle(x)) return ['vine', 2 + h % 4];
    return null; }
  function drawDeco(g, D) { for (let i = 0; i < D.length; i += 5) { const n = D[i], v = D[i + 1], X = D[i + 2], Y = D[i + 3], x = D[i + 4];
      if (n === 'vine') { let L = 0; while (L < v && at(x, Math.round((Y + cam.y) / TS) + L) === T.AIR) L++; const sw = Math.sin(anim * 1.6 + x) * 2; for (let k = 0; k < L * 16; k++) { const xx = X + 12 + Math.sin(k * .3) * 1.5 + sw * k / (L * 16), yy = Y + k * 1.5; g.fillStyle = k % 6 === 5 ? '#3a9446' : '#1a5a2a'; g.fillRect(Math.round(xx), Math.round(yy), 3, 2); if (k % 8 === 4) { g.fillStyle = '#3a9446'; g.fillRect(Math.round(xx) + (k % 16 ? 3 : -4), Math.round(yy), 4, 3); } } continue; }
      if (n === 'stalac' || n === 'icicle') { const c = decoSpr(n, v); g.drawImage(c, Math.round(X + 12 - c.width * .75), Math.round(Y), c.width * 1.5, c.height * 1.5); continue; }
      let c = decoSpr(n, v); if (SWAY.has(n)) { const k = Math.round(Math.sin(anim * 2.1 + x * .7) * 1.2); if (k) c = swayed('deco|' + n + '|' + v, c, k); }
      g.drawImage(c, Math.round(X + 12 - c.width * .75), Math.round(Y - c.height * 1.5 + 4), c.width * 1.5, c.height * 1.5); } }

  /* ---------- a backdrop for every biome ---------- */
  const BGT = {
    forest: { L: [['#86b0cc', '#1a2a3a', 'hills', .12, 420, 70], ['#5a9a64', '#14242a', 'hills', .3, 500, 50]], near: ['#2f6e40', '#0e1c20', 'oaks'] },
    snow: { L: [['#c8d8ea', '#28344a', 'peaks', .1, 430, 120], ['#8eb0cc', '#1c2840', 'hills', .3, 505, 45]], near: ['#2a5444', '#0c1a1e', 'pines'] },
    desert: { L: [['#d8a070', '#3a2a2a', 'mesas', .1, 440, 110], ['#e4c080', '#2a2220', 'dunes', .3, 510, 40]], near: ['#4a8a3a', '#14201a', 'cacti'] },
    jungle: { L: [['#6aa88a', '#122a24', 'steep', .1, 420, 130], ['#2e7a44', '#0e2018', 'bumps', .3, 490, 50]], near: ['#1a5228', '#071410', 'jtrees'] },
    blight: { L: [['#6a4a8a', '#1a1028', 'spires', .1, 440, 90], ['#4a2a5a', '#120a1c', 'hills', .3, 505, 45]], near: ['#2a1a34', '#08040c', 'dead'] },
    radiant: { L: [['#e8c0f0', '#3a2a50', 'spires', .1, 440, 90], ['#f0a8d0', '#2a1a3a', 'hills', .3, 505, 45]], near: ['#b07ad0', '#160e24', 'crystals'] },
    ocean: { L: [['#9ac0dc', '#1a2a3a', 'hills', .08, 470, 30], ['#3a7ab8', '#0e1a30', 'sea', .3, 520, 0]], near: ['#2f6e40', '#0e1c20', 'palms'] },
    sky: { L: [['#f4f8ff', '#3c4670', 'clouds', .1, 560, 60], ['#dfe8f8', '#2a3058', 'clouds', .25, 640, 50]], near: null } };
  const tri01 = t => 1 - 2 * Math.abs(t - Math.floor(t) - .5);
  const BGH = { hills: wx => Math.sin(wx) + Math.sin(wx * 2.3) * .4, peaks: wx => tri01(wx * .5) * 1.1 + tri01(wx * 1.3 + .3) * .45 + tri01(wx * 3.7) * .12 - .3,
    mesas: wx => { const q = Math.sin(wx * .55) + .45 * Math.sin(wx * 1.6 + 2); return q > .5 ? 1 : q > -.2 ? .55 : .15; }, dunes: wx => Math.sin(wx * .8) + .35 * Math.sin(wx * 2.1),
    steep: wx => Math.abs(Math.sin(wx * 1.1)) * 1.1 + .25 * Math.sin(wx * 3.3), bumps: wx => .5 + .5 * Math.abs(Math.sin(wx * 3.1)) + .2 * Math.sin(wx * 1.3),
    spires: wx => { const f = ((wx * .7) % 1 + 1) % 1, s = f < .24 ? (1 - Math.abs(f - .12) / .12) * 1.5 + ((Math.floor(wx * 7) % 3) * .06) : 0; return .3 * Math.sin(wx * 1.2) + Math.max(0, s); }, sea: wx => 0, clouds: wx => .5 + .5 * Math.abs(Math.sin(wx * 2)) + .3 * Math.sin(wx * 5) };
  let bgW = { forest: 1 }, bgT0 = 0;
  function bgTheme() { if (!P || !surf) return 'forest'; const x = clamp(Math.floor(P.x), 0, WW - 1);
    if (zone.sky) return 'sky'; if (zone.blight) return 'blight'; if (zone.radiant) return 'radiant'; if (zone.snow) return 'snow'; if (inJungle(x)) return 'jungle';
    if (x < ocean + 12 || x > WW - ocean - 12) return 'ocean'; if (at(x, surf[x]) === T.SAND) return 'desert'; return 'forest'; }
  function drawBiomeBg(g, v) { const now = performance.now(), dt = Math.min(.1, (now - (bgT0 || now)) / 1000); bgT0 = now; const th = bgTheme();
    if (!(th in bgW)) bgW[th] = 0; for (const k in bgW) { bgW[k] += ((k === th ? 1 : 0) - bgW[k]) * Math.min(1, dt * 1.3); if (bgW[k] < .01 && k !== th) delete bgW[k]; }
    const nt = night() ? 1 : 1 - dayLight(); const order = Object.keys(bgW).sort((a, b) => bgW[b] - bgW[a]);
    order.forEach((k, i) => { g.globalAlpha = i ? bgW[k] : 1; bgDraw(g, v, BGT[k], nt); }); g.globalAlpha = 1; }
  function bgDraw(g, v, B, nt) { const cy = (cam.y - 1100), S = 6;
    for (const [cd, cn, kind, k, base, amp] of B.L) { const c = mixC(cd, cn, nt), off = cam.x * k, fy = base - cy * k * .3, H = BGH[kind]; g.fillStyle = c;
      for (let x = Math.floor(v.x0 / S) * S - S; x < v.x1 + S; x += S) { const wx = (x + off) / 90, h = Math.round(H(wx) * amp / 3) * 3, top = Math.round((fy - h) / 3) * 3; g.fillRect(x, top, S, Math.max(0, v.y1 - top) + S);
        if (kind === 'peaks' && h > amp * .55) { g.fillStyle = mixC('#f4f8ff', '#4a5470', nt); g.fillRect(x, top, S, 6 + (h - amp * .55) * .25); g.fillStyle = c; }
        if (kind === 'sea' && ((x / S) + Math.floor(anim * 2)) % 9 === 0) { g.fillStyle = mixC('#c8e8ff', '#3a5a8a', nt); g.fillRect(x, top + 6 + ((x / S) % 3) * 6, S, 3); g.fillStyle = c; }
        if (kind === 'mesas' && h > amp * .9) { g.fillStyle = mixC('#b87850', '#2a1e1e', nt); g.fillRect(x, top + 9, S, 3); g.fillStyle = c; } } }
    if (!B.near) return; const [cd, cn, kind] = B.near, c = mixC(cd, cn, nt), c2 = mixC(shadeC(cd, 1.15), shadeC(cn, 1.2), nt), sp = 150, off2 = cam.x * .5, fy = 540 - cy * .5 * .3, q = n => Math.round(n / 3) * 3;
    const R_ = (x, y, w, h, cc) => { g.fillStyle = cc || c; g.fillRect(q(x), q(y), q(w) || 3, q(h) || 3); };
    for (let i = Math.floor((off2 + v.x0) / sp) - 1; i < Math.floor((off2 + v.x1) / sp) + 2; i++) { const tx = i * sp - off2 + ((i * 53) % 60), hh = 70 + ((i * 37) % 50), y0 = fy - hh;
      if (kind === 'oaks') { R_(tx - 6, y0, 12, hh + 200); drawDisc(g, c, tx, y0, 11, 3); drawDisc(g, c, tx - 22, y0 + 18, 8, 3); drawDisc(g, c, tx + 22, y0 + 16, 9, 3); R_(tx - 18, y0 - 18, 9, 6, c2); R_(tx + 6, y0 - 12, 6, 6, c2); }
      else if (kind === 'pines') { R_(tx - 4, y0 + 40, 8, hh + 160); for (let k = 0; k < 4; k++) { const w = 12 + k * 10, yy = y0 + k * 18; for (let j = 0; j < 6; j++) R_(tx - w * j / 6, yy + j * 3, w * j / 3, 3); R_(tx - w * .5, yy + 15, w, 3, mixC('#e8f0f8', '#3a4458', nt)); } }
      else if (kind === 'cacti') { R_(tx - 6, y0 + 20, 12, hh + 160); R_(tx - 21, y0 + 45, 15, 9); R_(tx - 21, y0 + 24, 9, 24); if (i % 2) { R_(tx + 6, y0 + 60, 15, 9); R_(tx + 12, y0 + 36, 9, 30); } }
      else if (kind === 'jtrees') { R_(tx - 6, y0 - 40, 12, hh + 240); drawDisc(g, c, tx, y0 - 50, 13, 3); drawDisc(g, c, tx - 30, y0 - 42, 10, 3); drawDisc(g, c, tx + 30, y0 - 44, 11, 3); for (const vx of [-36, -12, 18, 40]) R_(tx + vx, y0 - 30, 3, 30 + ((i * 7 + vx) & 31)); }
      else if (kind === 'dead') { R_(tx - 4, y0, 9, hh + 200); for (const [dx, dy, s] of [[-1, 18, -1], [1, 30, 1], [-1, 50, -1], [1, 8, 1]]) for (let j = 0; j < 7; j++) R_(tx + s * (6 + j * 3), y0 + dy - j * (j % 3 ? 3 : 0), 3, 3); }
      else if (kind === 'crystals') { for (const [dx, h, w] of [[0, hh, 18], [-24, hh * .6, 12], [22, hh * .5, 10]]) for (let j = 0; j < h; j += 3) { const ww = w * (1 - Math.abs(j / h - .5) * 2); R_(tx + dx - ww / 2, fy - h + j, ww, 3, j < h / 2 ? c2 : c); } }
      else if (kind === 'palms') { for (let j = 0; j < hh + 200; j += 3) R_(tx + Math.sin(j / 60) * 8, y0 + j, 9, 3); for (const s of [-1, 1]) for (let j = 0; j < 10; j++) R_(tx + s * j * 4, y0 - 3 + j * j * .25, 4, 3); }
    }
    g.fillStyle = c; g.fillRect(v.x0, q(fy), v.x1 - v.x0, v.y1 - fy + 3); }
  /* ---------- rare gear: hand-shaped icons in the material's own style ---------- */
  const GTH = { gold: ['#a8820e', '#ffd23f', '#fff2a0', '~#ff3a5a'], shadow: ['#3a2060', '#8a5ad8', '#c8a0ff', '~#e05aff'], molten: ['#7a2208', '#ff6a2a', '#ffc04a', '~#fff2a0'],
    azurite: ['#1a3a8a', '#4a8aff', '#a8d0ff', '~#e8f8ff'], viridium: ['#1a6a3a', '#3ad87a', '#a8f8c8', '~#e8ffe8'], starmetal: ['#a8904a', '#ffe8a0', '#fffbe8', '~#ffffff'], bone: ['#8a8070', '#e8e0c8', '#fffaf0', '~#2a2420'],
    slime: ['#1a5ad0', '#3aa0ff', '#a8e0ff', '~#ffffff'], enchanted: ['#2a8aa8', '#7ae0ff', '#e0fbff', '~#ffffff'], star: ['#c8a020', '#ffe680', '#fffbe0', '~#ffffff'], prism: ['#a04490', '#ff9aff', '#ffe8ff', '~#9ae8ff'],
    eclipse: ['#1a0a14', '#3a1a2a', '#ff8a2a', '~#ffd23f'], void: ['#140a28', '#5a2aa8', '#9a7aff', '~#ffffff'], reef: ['#1a7a6a', '#3ae0c8', '#b0fff0', '~#ff7a9a'], frost: ['#3a7aa8', '#9ae8ff', '#f0fcff', '~#ffffff'],
    gloom: ['#3a1a4a', '#9a5ae8', '#d8b0ff', '~#e05aff'], sun: ['#a8600a', '#ffb02e', '#fff0a0', '~#ff6a2a'], vine: ['#2a5a1a', '#5aa83a', '#b0e080', '~#ff5aa0'], spore: ['#3a6a2a', '#7ab04a', '#c8e8a0', '~#3ad8e8'],
    eye: ['#6a0a1a', '#c8203a', '#ff8a9a', '~#f0ece8'], warlord: ['#6a1018', '#c8303a', '#ff8a8a', '~#ffd23f'], deadeye: ['#1a4a2a', '#3a9a5a', '#a8e8b8', '~#ffe03a'], archmage: ['#1a2a8a', '#4a6aff', '#b0c0ff', '~#ffe680'],
    phantom: ['#1a1a2a', '#5a5a7a', '#a8a8c8', '~#7af8ff'], overlord: ['#3a0a6a', '#8a2ad8', '#d0a0ff', '~#ffd23f'], spirit: ['#3a7aa8', '#9ae8ff', '#f0fcff', '~#ffffff'], fire: ['#8a2a0a', '#ff9a3a', '#ffe080', '~#fff2a0'], arcane: ['#1a4a8a', '#5ad8ff', '#d0f4ff', '~#ffffff'], water: ['#1a3a8a', '#3a8aff', '#a8d0ff', '~#ffffff'] };
  const GID = { gpick: 'gold', gax: 'gold', gsword: 'gold', gbow: 'gold', gspear: 'gold', ghammer: 'gold', garmor: 'gold', ghelm: 'gold', glegs: 'gold', falcon: 'gold',
    shpick: 'shadow', shax: 'shadow', shsword: 'shadow', shbow: 'shadow', sharmor: 'shadow', shhelm: 'shadow', shlegs: 'shadow', fangstaff: 'shadow',
    hpick: 'molten', hax: 'molten', hsword: 'molten', fury: 'molten', harmor: 'molten', hhelm: 'molten', hlegs: 'molten', flame: 'molten', spritestaff: 'molten',
    azpick: 'azurite', azax: 'azurite', azsword: 'azurite', azbow: 'azurite', azstaff: 'azurite', azhelm: 'azurite', azarmor: 'azurite', azlegs: 'azurite',
    vipick: 'viridium', viax: 'viridium', visword: 'viridium', vibow: 'viridium', vistaff: 'viridium', vihelm: 'viridium', viarmor: 'viridium', vilegs: 'viridium',
    smpick: 'starmetal', smax: 'starmetal', smsword: 'starmetal', smbow: 'starmetal', smstaff: 'starmetal', smhelm: 'starmetal', smarmor: 'starmetal', smlegs: 'starmetal',
    handcannon: 'gold', repeater: 'shadow', scattergun: 'molten', longrifle: 'azurite', burstgun: 'viridium', railgun: 'starmetal',
    bsword: 'bone', bpick: 'bone', bhelm: 'bone', barmor: 'bone', blegs: 'bone', skull: 'bone', skstaff: 'bone', saber: 'slime', slimegun: 'slime', slstaff: 'slime', esword: 'enchanted', eboom: 'enchanted',
    starfall: 'star', starstaff: 'star', wyrm: 'star', prismblade: 'prism', tyrantblade: 'eclipse', eclipse: 'eclipse', voidbow: 'void', reefblade: 'reef', trident: 'reef', frostblade: 'frost', froststaff: 'frost', avalanche: 'frost', wispwand: 'frost',
    gloomstaff: 'gloom', gloomfang: 'gloom', blightscythe: 'gloom', rotbow: 'gloom', broodstaff: 'gloom', sunblade: 'sun', sunstaff: 'sun', vinebow: 'vine', thorns: 'vine', shroompike: 'spore', gaze: 'eye',
    warhelm: 'warlord', wararmor: 'warlord', warlegs: 'warlord', dehelm: 'deadeye', dearmor: 'deadeye', delegs: 'deadeye', amhelm: 'archmage', amarmor: 'archmage', amlegs: 'archmage', phhelm: 'phantom', pharmor: 'phantom', phlegs: 'phantom',
    ovhelm: 'overlord', ovarmor: 'overlord', ovlegs: 'overlord', spihelm: 'spirit', spiarmor: 'spirit', spilegs: 'spirit', sphelm: 'spore', sparmor: 'spore', splegs: 'spore', spark: 'fire', missile: 'arcane', water: 'water' };
  const WOODH = '#6a4424';
  function gearPaint(P, id, it, th) { const [D, B, L, A] = GTH[th], sparkle = (x, y) => { P.px(x, y, '~#ffffff'); P.px(x - 1, y, A); P.px(x + 1, y, A); P.px(x, y - 1, A); P.px(x, y + 1, A); };
    if (it.slot === 'head') { P.ell(8, 9, 6, 5.5, B); P.rect(2, 9, 12, 4, B); P.rect(3, 9, 10, 2, D); P.rect(4, 13, 2, 2, B); P.rect(10, 13, 2, 2, B); P.px(5, 6, L); P.px(6, 5, L);
      if (th === 'gold' || th === 'overlord') { for (const x of [3, 7, 11]) P.tri(x, 5, x + 2, 5, x + 1, 1, th === 'gold' ? '#ffd23f' : '#ffd23f'); P.rect(7, 6, 2, 2, A); }
      else if (th === 'shadow') { for (const x of [3, 7, 11]) P.tri(x, 6, x + 2, 6, x + 1, 1, D); P.rect(5, 10, 2, 1, A); P.rect(9, 10, 2, 1, A); }
      else if (th === 'molten') { P.tri(1, 7, 3, 6, 0, 1, D); P.tri(13, 6, 15, 7, 16, 1, D); P.px(6, 7, A); P.px(10, 6, A); P.px(8, 8, '~#ffc04a'); }
      else if (th === 'bone') { P.rect(4, 9, 3, 3, A); P.rect(9, 9, 3, 3, A); P.rect(7, 12, 2, 2, A); }
      else if (th === 'azurite' || th === 'frost' || th === 'spirit') { P.tri(6, 5, 10, 5, 8, 0, L); P.tri(2, 7, 5, 6, 2, 2, B); P.tri(11, 6, 14, 7, 14, 2, B); }
      else if (th === 'viridium' || th === 'spore') { if (th === 'spore') { P.ell(8, 6, 8, 4, B); P.px(5, 4, L); P.px(10, 3, L); P.px(12, 5, L); } else for (const [x, s] of [[5, -1], [11, 1]]) P.tri(x, 5, x + s * 4, 0, x + s, 3, L); }
      else if (th === 'starmetal') { P.tri(1, 8, 4, 6, 0, 3, L); P.tri(15, 8, 12, 6, 16, 3, L); sparkle(8, 5); }
      else if (th === 'warlord') { for (let i = 0; i < 6; i++) P.rect(7 - i, 3 - i * .5, 2, 2, '#ff5a5a'); P.rect(4, 10, 8, 1, '~#1a0a0a'); }
      else if (th === 'deadeye') { P.rect(3, 9, 10, 3, '#6a4a2a'); P.ell(6, 10, 1.5, 1.5, A); P.ell(10, 10, 1.5, 1.5, A); }
      else if (th === 'archmage') { P.tri(3, 8, 13, 8, 10, -1, B); P.rect(2, 8, 12, 2, D); sparkle(9, 4); }
      else if (th === 'phantom') { P.rect(4, 9, 8, 4, '~#0a0a14'); P.px(6, 10, A); P.px(9, 10, A); }
      return; }
    if (it.slot === 'legs') { P.rect(3, 1, 10, 4, B); P.rect(3, 5, 4, 10, B); P.rect(9, 5, 4, 10, B); P.rect(2, 14, 5, 2, D); P.rect(9, 14, 5, 2, D); P.rect(3, 8, 4, 2, L); P.rect(9, 8, 4, 2, L); P.rect(7, 2, 2, 2, A); P.px(4, 2, L);
      if (th === 'molten') { P.px(4, 11, A); P.px(10, 6, A); } if (th === 'starmetal') { P.px(5, 12, '~#ffffff'); P.px(11, 12, '~#ffffff'); } return; }
    if (it.armor) { P.rect(3, 3, 10, 11, B); P.rect(0, 2, 4, 5, L); P.rect(12, 2, 4, 5, L); P.rect(0, 6, 4, 1, D); P.rect(12, 6, 4, 1, D); P.rect(5, 6, 6, 1, D); P.rect(5, 10, 6, 1, D); P.ell(8, 8, 1.5, 1.5, A); P.px(4, 4, L);
      if (th === 'shadow' || th === 'gloom' || th === 'overlord') { P.tri(0, 2, 3, 2, 0, -1, D); P.tri(13, 2, 16, 2, 16, -1, D); }
      if (th === 'molten') { P.line(5, 4, 7, 12, '~#ffc04a'); P.px(10, 5, A); } if (th === 'azurite' || th === 'frost') { P.tri(6, 3, 10, 3, 8, 0, L); } if (th === 'starmetal') sparkle(8, 8); if (th === 'archmage') { P.rect(3, 12, 10, 3, D); sparkle(6, 11); } return; }
    // weapons and tools: everything leans up and to the right
    const handle = it.pick || it.axe || it.hammer || it.reach;
    if (it.melee && !it.reach) { const sc = id === 'blightscythe';
      if (sc) { P.line(3, 14, 9, 2, WOODH, 2); for (let i = 0; i < 9; i++) P.rect(9 - i, 2 + i * i * .1, 2, 2, B); P.line(9, 2, 1, 6, L); return; }
      const wide = id === 'smsword' || id === 'avalanche' || id === 'tyrantblade' ? 1 : 0;
      for (let i = 0; i < 10; i++) { const x = 4 + i, y = 11 - i; P.rect(x, y - wide, 2 + wide, 2 + wide, B); P.px(x + 1 + wide, y - wide, L); }
      P.px(14, 1, L); P.line(2, 9, 6, 13, D, 1); P.rect(3, 11, 2, 2, D); P.line(1, 14, 3, 12, th === 'bone' ? '#c0b8a0' : '#5a3616'); P.px(1, 15, A);
      if (th === 'molten' || th === 'sun' || th === 'fire') { P.px(8, 7, '~#fff2a0'); P.px(11, 4, '~#fff2a0'); } if (th === 'gloom') for (let i = 0; i < 8; i += 2) P.px(6 + i, 11 - i, D);
      if (th === 'azurite' || th === 'frost' || th === 'prism' || th === 'enchanted') { P.px(7, 8, '~#ffffff'); P.px(10, 5, '~#ffffff'); } if (th === 'star' || th === 'starmetal' || th === 'prism' || th === 'eclipse') sparkle(13, 3);
      if (th === 'slime') { P.px(6, 9, '~#e0f4ff'); P.px(9, 6, '~#e0f4ff'); } if (th === 'reef') { P.px(6, 11, A); P.px(5, 10, A); } return; }
    if (it.bow) { for (let y = 1; y < 15; y++) { const x = 3 + Math.round(Math.pow((y - 8) / 7, 2) * 5); P.rect(x, y, 2, 1, y > 6 && y < 10 ? D : B); } P.line(8, 1, 8, 14, '~#e8e8e8'); P.px(4, 8, L); P.px(4, 7, L);
      for (const y of [1, 14]) { P.px(8, y, L); P.px(9, y, A); } if (th === 'vine') { P.px(5, 4, '#2a5a1a'); P.px(6, 3, A); P.px(5, 12, '#2a5a1a'); } if (th === 'eye') P.ell(4, 8, 1.6, 1.6, '~#f0ece8'); if (th === 'star' || th === 'starmetal' || th === 'void' || th === 'eclipse') sparkle(12, 3); return; }
    if (it.magic || it.summon) { P.line(2, 15, 10, 6, th === 'bone' ? '#c0b8a0' : WOODH, 2);
      if (th === 'bone') { P.ell(12, 4, 3.5, 3.5, B); P.rect(10, 3, 2, 2, A); P.rect(13, 3, 2, 2, A); P.rect(11, 7, 3, 1, B); }
      else if (th === 'star') { P.tri(12, 0, 10, 6, 15, 4, B); P.tri(9, 3, 15, 3, 12, 8, B); sparkle(12, 4); }
      else if (th === 'gloom' || th === 'eye') { P.ell(12, 4, 3.5, 3.5, B); P.ell(12, 4, 2, 2, '~#f0e8d0'); P.px(12, 4, A); }
      else if (th === 'sun' || th === 'fire' || th === 'molten') { P.ell(12, 4, 3, 3, B); for (let i = 0; i < 8; i++) { const a = i * .785; P.px(12 + Math.cos(a) * 4.5, 4 + Math.sin(a) * 4.5, L); } P.ell(12, 4, 1.5, 1.5, A); }
      else { P.tri(12, -1, 9, 4, 12, 9, B); P.tri(12, -1, 15, 4, 12, 9, L); P.px(12, 3, A); }
      P.rect(8, 7, 4, 2, D); return; }
    if (it.boom) { P.line(2, 12, 8, 3, B, 2); P.line(8, 3, 14, 12, B, 2); P.px(8, 3, L); P.px(3, 11, A); P.px(13, 11, A); return; }
    if (handle) { P.line(2, 15, 11, 5, th === 'bone' ? '#c0b8a0' : WOODH, 2); P.px(3, 13, '#4a2e14');
      if (it.pick) { for (let i = 0; i < 13; i++) { const x = 1 + i, y = 6 - Math.round(Math.sin(i / 12 * Math.PI) * 5); P.rect(x, y, 2, 2, i > 4 && i < 9 ? B : B); } P.px(1, 7, L); P.px(14, 7, L); P.px(7, 1, L); P.rect(10, 3, 2, 2, D); }
      else if (it.axe) { P.tri(9, 2, 15, 0, 15, 9, B); P.tri(9, 2, 13, 1, 11, 6, L); P.rect(9, 3, 3, 3, D); }
      else if (it.hammer) { P.rect(7, 0, 9, 6, B); P.rect(7, 0, 9, 1, L); P.rect(7, 5, 9, 1, D); P.rect(10, 2, 3, 2, A); }
      else if (it.reach) { P.line(10, 6, 15, 1, '#c8c8d0', 2); P.tri(12, 0, 16, 0, 16, 4, B); if (id === 'trident') { P.line(11, 1, 13, -1, B); P.line(15, 5, 17, 3, B); } }
      if (th === 'molten') { P.px(10, 3, '~#fff2a0'); P.px(5, 4, '~#fff2a0'); } if (th === 'starmetal' || th === 'star') sparkle(13, 2); if (th === 'azurite' || th === 'frost') P.px(9, 1, '~#ffffff'); return; }
    if (it.gun) { P.rect(1, 6, 13, 4, B); P.rect(12, 5, 3, 2, D); P.rect(2, 9, 4, 5, th === 'slime' ? B : WOODH); P.rect(4, 7, 8, 1, L); P.px(13, 7, A); return; } }
  const gearIcon = id => { const it = IT[id], th = GID[id]; if (!it || !th || !GTH[th]) return null; return spr('gear|' + id, 16, 16, P => gearPaint(P, id, it, th), { hi: 1.18, lo: .78 }); };
  // worn armour gets the same character: crests, horns, spikes, glowing eyes
  function armorBits(r, G) { const th = k => G[k] && GID[G[k]], hd = th('head'), bd = th('body'), lg = th('legs');
    if (hd && GTH[hd]) { const [D, B, L, A] = GTH[hd].map(c => c.replace('~', ''));
      if (hd === 'gold' || hd === 'overlord') { r('#ffd23f', -5, -35, 2, 3); r('#ffd23f', -1, -36, 2, 4); r('#ffd23f', 3, -35, 2, 3); r(A, -1, -33, 2, 1); }
      else if (hd === 'shadow') { r(D, -5, -35, 2, 3); r(D, -1, -37, 2, 5); r(D, 3, -35, 2, 3); r(A, 2, -27, 2, 1); }
      else if (hd === 'molten') { r(D, -7, -36, 2, 5); r(D, 6, -36, 2, 5); r(A, -2, -31, 1, 1); r('#ffc04a', 2, -30, 1, 1); }
      else if (hd === 'bone') { r(B, -4, -29, 9, 4); r(A, -3, -28, 2, 2); r(A, 1, -28, 2, 2); }
      else if (hd === 'azurite' || hd === 'frost' || hd === 'spirit') { r(L, -1, -36, 3, 4); r(B, -6, -34, 2, 3); r(B, 5, -34, 2, 3); }
      else if (hd === 'viridium') { r(L, -6, -35, 3, 2); r(L, 4, -35, 3, 2); r(B, -1, -35, 2, 3); }
      else if (hd === 'spore') { r(B, -8, -34, 17, 4); r(L, -5, -34, 2, 1); r(L, 2, -33, 2, 1); }
      else if (hd === 'starmetal') { r('#ffffff', 0, -31, 2, 2); r(L, -8, -32, 3, 2); r(L, 6, -32, 3, 2); }
      else if (hd === 'warlord') { r('#ff5a5a', -1, -36, 2, 4); r('#ff5a5a', -3, -37, 2, 2); r('#c8303a', -5, -38, 2, 2); }
      else if (hd === 'deadeye') { r('#6a4a2a', -5, -27, 11, 2); r(A, 0, -27, 2, 2); r(A, 3, -27, 2, 2); }
      else if (hd === 'archmage') { r(B, -4, -35, 9, 3); r(B, -2, -38, 6, 3); r(B, 0, -41, 4, 3); r(A, 1, -39, 1, 1); }
      else if (hd === 'phantom') { r(D, -5, -29, 2, 8); r(D, 4, -29, 2, 8); r('#0a0a14', -3, -28, 7, 4); r(A, -1, -27, 1, 1); r(A, 2, -27, 1, 1); } }
    if (bd && GTH[bd]) { const [D, B, L, A] = GTH[bd].map(c => c.replace('~', '')); r(L, -7, -22, 3, 3); r(L, 5, -22, 3, 3); r(A, -1, -18, 2, 2); r(D, -5, -14, 10, 1);
      if (bd === 'molten') { r('#ffc04a', -3, -19, 1, 2); r('#ffc04a', 2, -16, 1, 2); } if (bd === 'shadow' || bd === 'gloom' || bd === 'overlord') { r(D, -8, -24, 2, 2); r(D, 7, -24, 2, 2); } if (bd === 'starmetal') r('#ffffff', -1, -18, 2, 2); }
    if (lg && GTH[lg]) { const L = GTH[lg][2]; r(L, -5, -6, 4, 1); r(L, 1, -6, 4, 1); } }
  // plants can be knocked down; they drop nothing. Grass, flowers, ferns and vines go in one hit, the sturdier ones take a few
  let brokenDeco = new Set(); const decoHits = new Map(), DECO1 = new Set(['grass', 'rgrass', 'snowgrass', 'drygrass', 'flower', 'pastel', 'frostflower', 'fern', 'jtall', 'jflower', 'thornweed', 'glowshroom', 'pebble', 'vine']);
  const DECOC = { cactus: ['#3a8a3a', '#5aaa4a'], bush: ['#2a6c20', '#3a8a2a'], snowbush: ['#22604c', '#f4f8ff'], rock: ['#84848e', '#6e6e78'], bones: ['#e8e0c8', '#c0b8a0'], eyestalk: ['#552068', '#f0e8d0'], deadtwig: ['#4a3a3a', '#6a5a4a'], crystal: ['#c8f8ff', '#ffc8f0'], stalag: ['#6a6a74', '#84848e'], stalac: ['#6a6a74', '#84848e'], icicle: ['#d8f4ff', '#ffffff'], snowgrass: ['#c8e0ec', '#8ab8c8'], drygrass: ['#d0b068', '#a8884a'], thornweed: ['#6e2e86', '#b070d0'], glowshroom: ['#7af0ff', '#c8e8f0'], pebble: ['#7a7a84', '#8a8a94'], jflower: ['#ff5aa0', '#267638'], flower: ['#ff5a7a', '#3a8a1e'], pastel: ['#ffb0e0', '#7ac8b0'], frostflower: ['#bff4ff', '#6a9ab8'] };
  function decoFind(tx, ty) { if (tx < 0 || ty < 1 || tx >= WW || ty >= WH - 1 || at(tx, ty) !== T.AIR) return null;
    { const b = at(tx, ty + 1); if (SOLID.has(b)) { const d = decoPick(b, tx, ty + 1); if (d) return { n: d[0], k: 'u' + ((ty + 1) * WW + tx) }; } }
    for (let k = 1; k <= 6; k++) { const a = at(tx, ty - k); if (a === T.AIR) continue; if (!SOLID.has(a)) return null; const d = decoHang(a, tx, ty - k); if (d && (k === 1 || (d[0] === 'vine' && k <= d[1]))) return { n: d[0], k: 'h' + ((ty - k) * WW + tx) }; return null; }
    return null; }
  function hitDeco(tx, ty, sweep) { const D = decoFind(tx, ty); if (!D || brokenDeco.has(D.k)) return false; const need = DECO1.has(D.n) ? 1 : 3, h = (decoHits.get(D.k) || 0) + 1, C = DECOC[D.n] || ['#4cb02a', '#6ad03c'];
    K.burst(scrX(sx(tx + .5)), scrY(sy(ty + .6)), C, h >= need ? 7 : 3, h >= need ? 110 : 60, { life: .4, size: 3, gravity: 500 });
    if (h >= need) { brokenDeco.add(D.k); decoHits.delete(D.k); K.sfx(DECO1.has(D.n) ? 520 : 240, .05, 'triangle', .04, -200); if (online()) MP.send({ t: 'bd', k: D.k }); }
    else { decoHits.set(D.k, h); K.sfx(300, .04, 'square', .03, -60); }
    return true; }
  let torchL = [], glints = [], glowL = [];
  function glassPane(g, X, Y, x, y, blk) { const same = blk ? (a, b) => at(a, b) === T.GLASS : (a, b) => a >= 0 && b >= 0 && a < WW && b < WH && walls[b * WW + a] === 13;
    g.fillStyle = blk ? 'rgba(200,230,255,.2)' : 'rgba(190,225,255,.1)'; g.fillRect(X, Y, TS, TS); g.fillStyle = blk ? 'rgba(235,248,255,.75)' : 'rgba(220,240,255,.35)';
    if (!same(x, y - 1)) g.fillRect(X, Y, TS, 2); if (!same(x, y + 1)) g.fillRect(X, Y + TS - 2, TS, 2); if (!same(x - 1, y)) g.fillRect(X, Y, 2, TS); if (!same(x + 1, y)) g.fillRect(X + TS - 2, Y, 2, TS);
    if ((x * 3 + y * 5) % 4 === 0) { g.fillStyle = blk ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.3)'; for (let k = 0; k < 4; k++) g.fillRect(X + 6 + k * 3, Y + 15 - k * 3, 3, 3); } }
  /* ---------- pets: little companions that follow you around (purely for company) ---------- */
  const PETA = {
    mosspup: { w: 18, h: 13, fly: 0, paint(P, f) { const b = '#8a6a3a', sw = [0, 1, 0, -1][f];
        P.rect(3 + sw, 9, 2, 4, shadeC(b, .8)); P.rect(11 - sw, 9, 2, 4, shadeC(b, .8)); P.rect(5 - sw, 9, 2, 4, b); P.rect(13 + sw, 9, 2, 4, b);
        P.ell(9, 7, 6.5, 3.5, b); P.ell(8, 4.5, 4.5, 1.8, '#4caa2a'); P.px(6, 3, '#78c850'); P.px(10, 3, '#78c850'); P.line(2, 7, 0, 3 + (f % 2), b);
        P.ell(14.5, 5, 3.2, 3, b); P.tri(13, 3, 15, 3, 13.5, 0, shadeC(b, .7)); P.rect(16, 6, 2, 1.5, shadeC(b, .7)); P.px(15, 4, '~#141018'); P.px(17, 6, '~#2a1a12'); } },
    pebbler: { w: 14, h: 14, fly: 0, paint(P, f) { const st = '#8a8a94', sw = [0, 1, 0, -1][f];
        P.rect(3 + sw, 10, 3, 4, shadeC(st, .75)); P.rect(8 - sw, 10, 3, 4, shadeC(st, .75)); P.ell(7, 7, 6, 5.5, st); P.ell(5, 4, 2, 1.5, '#a8a8b0'); P.px(10, 9, '#6a6a74'); P.px(4, 9, '#6a6a74');
        P.rect(2, 2, 4, 2, '#4caa2a'); P.rect(8, 6, 2, 2, '~#ffb03a'); P.rect(11, 6, 1, 2, '~#ffb03a'); } },
    wobble: { w: 14, h: 13, fly: 0, paint(P, f) { const c = '#5ad8a0', sq = [0, 1, 2, 1][f], ry = 4.5 - sq * .6, cy = 12 - ry;
        P.ell(7, cy, 6 + sq * .4, ry, c + 'e0'); P.ell(7, cy + ry * .45, 5, ry * .45, shadeC(c, .75) + 'e8'); P.ell(5, cy - ry * .45, 1.6, .9, '~#ffffffb0');
        P.px(5, cy - .5, '~#141420'); P.px(9, cy - .5, '~#141420'); P.px(7, cy + 1.5, '~#141420');
        const t = cy - ry - 1; P.rect(4, t, 6, 2, '#ffd23f'); P.px(4, t - 1, '#ffd23f'); P.px(7, t - 1, '#ffd23f'); P.px(9, t - 1, '#ffd23f'); P.px(7, t, '~#ff3a5a'); } },
    emberkit: { w: 18, h: 13, fly: 0, paint(P, f) { const b = '#e8702a', sw = [0, 1, 0, -1][f];
        P.rect(4 + sw, 9, 2, 4, shadeC(b, .8)); P.rect(12 - sw, 9, 2, 4, shadeC(b, .8)); P.ell(9, 7.5, 5.5, 3, b); P.ell(9, 9, 3.5, 1.4, '#ffe0c0');
        for (let i = 0; i < 4; i++) P.rect(3 - i, 6 - i + (f % 2), 2, 2, i < 2 ? '#ff8a2a' : '~#ffd23f'); P.px(0, 2 + (f % 2), '~#fff2a0');
        P.ell(14.5, 5, 3, 2.6, b); P.tri(12.5, 3.5, 14.5, 3.5, 13, 0, b); P.tri(15, 3.5, 17, 3.5, 16.5, 0, b); P.px(13, 1, '~#2a1a12'); P.rect(16.5, 5.5, 1.5, 1.5, '#fff0e0'); P.px(15, 4, '~#141018'); } },
    glowmoth: { w: 16, h: 12, fly: 1, paint(P, f) { const wy = [-2, 0, 2, 0][f];
        for (const s of [-1, 1]) { P.ell(8 + s * 4, 4 + wy * .5, 3.5, 3, '~#7af0ffd0'); P.ell(8 + s * 3.5, 8 - wy * .3, 2.5, 2, '~#4ab8e0c0'); P.px(8 + s * 4, 4 + wy * .5, '~#ffffff'); }
        P.ell(8, 6, 1.6, 4, '#3a3048'); P.line(7, 2, 5, 0, '#3a3048'); P.line(9, 2, 11, 0, '#3a3048'); P.px(7, 3, '~#e8ffff'); P.px(9, 3, '~#e8ffff'); } },
    frostling: { w: 12, h: 14, fly: 1, paint(P, f) { const bob = [0, 1, 0, -1][f];
        for (let i = 0; i < 6; i++) { const a = i * 1.047 + f * .2; P.line(6, 6 + bob, 6 + Math.cos(a) * 5.5, 6 + bob + Math.sin(a) * 5.5, '~#bff4ff'); }
        P.ell(6, 6 + bob, 3.6, 3.6, '#e8fbff'); P.px(5, 5 + bob, '~#2a5a8a'); P.px(7, 5 + bob, '~#2a5a8a'); P.px(6, 7 + bob, '~#7ab0d8'); P.tri(4, 11 + bob, 8, 11 + bob, 6, 14, '~#bff4ffa0'); } },
  };
  const petSpr = (k, f) => { const D = PETA[k]; return spr('pet|' + k + '|' + f, D.w, D.h, P => D.paint(P, f), { hi: 1.15, lo: .78 }); };
  function newPet(k, x, y) { return { k, x, y, vx: 0, vy: 0, w: .7, h: .6, ground: false, t: R() * 5, face: 1, stuck: 0 }; }
  function stepPet(pt, owner, face, dt) { const D = PETA[pt.k]; if (!D || !owner) return; pt.t += dt; const tx = owner.x - face * 1.8, d = Math.hypot(owner.x - pt.x, owner.y - pt.y);
    if (d > 22 || !isFinite(d)) { pt.x = owner.x - face * 1.5; pt.y = owner.y - (D.fly ? 2.5 : .2); pt.vx = pt.vy = 0; }
    if (D.fly) { const ty = owner.y - 2.6 + Math.sin(pt.t * 2.2) * .4; pt.x += (tx - pt.x) * Math.min(1, dt * 3.5); pt.y += (ty - pt.y) * Math.min(1, dt * 3.5); pt.face = owner.x >= pt.x ? 1 : -1; pt.moving = 1; return; }
    const dx = tx - pt.x; pt.vx = Math.abs(dx) > .7 ? clamp(dx * 4, -11, 11) : pt.vx * .7; pt.bump = 0; moveBody(pt, dt);
    if (pt.ground && (pt.bump || owner.y < pt.y - 2.5 && Math.abs(owner.x - pt.x) < 6)) pt.vy = -14;
    pt.face = Math.abs(pt.vx) > .3 ? Math.sign(pt.vx) : owner.x >= pt.x ? 1 : -1; pt.moving = Math.abs(pt.vx) > .3 || !pt.ground; }
  function drawPet(g, pt) { const D = PETA[pt.k]; if (!D) return; const f = pt.moving ? Math.floor(pt.t * (D.fly ? 10 : 9)) % 4 : 0, c = petSpr(pt.k, f), X = sx(pt.x), Y = sy(pt.y);
    if (pt.k === 'glowmoth' || pt.k === 'emberkit' || pt.k === 'frostling') { const gs = glowSprite(pt.k === 'emberkit' ? '255,150,60' : '120,230,255'); g.drawImage(gs, X - 30, Y - (D.fly ? 30 : 38), 60, 60); }
    drawSpr(g, c, X, Y, 1.5, pt.face < 0, D.fly); }
  let myPet = null;
  /* ---------- item icons that had none: shards, summon items, movement gear, bait, fish, crates, drops ---------- */
  const fishPaint = (b, belly, fin, mark) => P => {
    P.tri(1, 4, 1, 12, 5, 8, fin); P.ell(9, 8, 6, 3.6, b); P.ell(9.5, 9.6, 4.5, 1.6, belly); P.tri(7, 4.6, 11, 4.6, 8, 2, fin); P.tri(8, 11.4, 10, 11.4, 8, 13, fin);
    if (mark) mark(P); P.px(13, 7, '~#141018'); P.px(12, 7, '~#ffffff'); P.px(14, 9, shadeC(b, .6)); };
  const crateP = (wood, band, gem) => P => { P.rect(1, 3, 14, 12, wood); for (const y of [6, 10]) P.rect(1, y, 14, 1, shadeC(wood, .7)); P.rect(1, 3, 2, 12, band); P.rect(13, 3, 2, 12, band); P.rect(1, 3, 14, 2, band); P.rect(1, 13, 14, 2, band);
    P.rect(6, 7, 4, 4, band); P.rect(7, 8, 2, 2, gem); P.px(2, 4, '~#ffffffa0'); P.px(14, 4, '~#ffffffa0'); };
  const shardP = (c, core) => P => { P.tri(8, 0, 13, 7, 8, 15, c); P.tri(8, 0, 3, 8, 8, 15, shadeC(c, .82)); P.tri(4, 9, 1, 13, 6, 14, shadeC(c, .9)); P.line(8, 2, 8, 12, core); P.px(6, 5, '~#ffffff'); P.px(10, 9, '~#ffffffc0'); };
  const wingP = c => P => { for (const s of [-1, 1]) { const x0 = 8 + s; P.tri(x0, 6, x0 + s * 7, 1, x0 + s * 7, 8, c); P.tri(x0, 7, x0 + s * 6, 8, x0 + s * 4, 13, shadeC(c, .82)); P.line(x0, 6, x0 + s * 6, 2, '~' + shadeC(c, 1.35)); P.px(x0 + s * 5, 4, '~#ffffffc0'); }
    P.rect(7, 5, 2, 7, '#3a3048'); };
  const XICON = {
    lumenshard: shardP('#8aeaff', '~#ffffff'), gloomshard: shardP('#7a3ac8', '~#ff9aff'),
    idol: P => { P.rect(4, 12, 8, 3, '#7aa8c8'); P.rect(5, 6, 6, 6, '#a8dcf0'); P.ell(8, 4.5, 3.2, 3, '#c8f0ff'); P.px(7, 4, '~#1a3a5a'); P.px(9, 4, '~#1a3a5a'); P.rect(7, 6, 2, 1, '~#5a8ab0'); P.rect(3, 7, 2, 4, '#a8dcf0'); P.rect(11, 7, 2, 4, '#a8dcf0'); P.px(6, 2, '~#ffffff'); P.px(12, 13, '~#e8fbff'); P.px(3, 12, '~#e8fbff'); },
    offering: P => { P.ell(8, 11, 6.5, 3.5, '#7a5230'); P.rect(2, 8, 13, 2, '#8a6038'); P.ell(8, 7.5, 4.5, 2.5, '#6a8a2a'); P.ell(6, 6.5, 1.6, 1.2, '#8aaa3a'); P.px(10, 6, '~#c8e05a'); P.px(3, 3, '~#2a2a2a'); P.px(12, 2, '~#2a2a2a'); P.px(9, 1, '~#2a2a2a'); P.px(11, 12, '#5a3a1a'); },
    prismkey: P => { P.ell(4.5, 4.5, 3.6, 3.6, '#e8e8f0'); P.ell(4.5, 4.5, 1.5, 1.5, '~#2a2a40'); P.line(7, 7, 14, 14, '#d8d8e4', 2); P.rect(10, 12, 2, 3, '#d8d8e4'); P.rect(12, 10, 3, 2, '#d8d8e4'); P.px(2, 2, '~#ff7aff'); P.px(6, 2, '~#7affff'); P.px(2, 6, '~#ffe67a'); P.px(6, 6, '~#7aff9a'); },
    eclsigil: P => { P.ell(8, 8, 7, 7, '~#ff8a2a'); P.ell(8, 8, 6, 6, '~#ffd23f'); P.ell(9, 7.5, 5.2, 5.2, '#1a1028'); P.px(3, 12, '~#fff2a0'); P.px(12, 2, '~#ffd23f'); P.ell(7, 6, 1, 1, '~#3a2a50'); },
    gustjar: P => { P.rect(6, 1, 4, 2, '#8a5a2e'); P.rect(5, 3, 6, 1, '#cfeeff'); P.ell(8, 9.5, 5.5, 5.5, '#cfeeffb0'); P.line(5, 9, 8, 7, '~#ffffff'); P.line(8, 7, 11, 9, '~#ffffff'); P.line(6, 12, 10, 11, '~#ffffffc0'); P.px(5, 6, '~#ffffff'); },
    emberboots: P => { for (const [x, d] of [[1, 0], [8, 1]]) { P.rect(x, 3 + d, 5, 8, '#c8502a'); P.rect(x, 10 + d, 7, 3, '#8a3018'); P.rect(x, 3 + d, 5, 1, '#ffd23f'); P.px(x - 1, 12 + d, '~#ffd23f'); P.px(x - 1, 11 + d, '~#ff8a2a'); } P.px(0, 14, '~#ff8a2a'); },
    windstep: P => { P.ell(8, 9, 5.5, 3.2, '#bfe6ff'); P.ell(8, 9, 3.6, 1.6, null); for (let y = 8; y <= 10; y++) for (let x = 5; x <= 11; x++) P.del(x, y); P.ell(8, 12, 1.4, 1.4, '~#7affee');
      P.line(12, 8, 15, 2, '#f0f8ff'); P.line(13, 7, 15, 4, '#cfe8ff'); P.px(15, 1, '~#ffffff'); },
    prismwings: wingP('#ff9aff'), gloomwings: wingP('#9a5ae8'),
    hook: P => { P.rect(7, 6, 2, 9, '#7a7a84'); for (const y of [9, 12]) P.px(6, y, '#5a5a64'); P.line(8, 6, 3, 1, '#b0b0bc', 2); P.line(8, 6, 13, 1, '#b0b0bc', 2); P.line(8, 6, 8, 0, '#b0b0bc', 2); P.px(2, 2, '#d8d8e0'); P.px(13, 2, '#d8d8e0'); },
    worm: P => { const pts = [[2, 12], [4, 9], [7, 10], [9, 7], [12, 8], [14, 5]]; for (let i = 0; i < pts.length - 1; i++) P.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#e88a9a', 2); P.px(14, 4, '~#2a1018'); P.px(7, 9, '~#c86a7a'); },
    glowgrub: P => { for (let i = 0; i < 4; i++) P.ell(3.5 + i * 3, 9 - (i % 2), 2.6, 2.4, i === 3 ? '#e8ffc0' : '#b8f070'); P.px(13, 7, '~#1a2a10'); P.px(4, 7, '~#ffffff'); P.px(7, 6, '~#f0ffd0'); },
    lure: P => { P.ell(7, 6, 3.5, 5, '#d8dce8'); P.ell(6, 5, 1.4, 2.4, '~#ffffff'); P.rect(6, 0, 2, 2, '#8a8a94'); P.ell(7, 12, 1.4, 1.4, '~#ff3a4a'); P.line(8, 12, 11, 13, '#9a9aa4'); P.line(11, 13, 12, 10, '#9a9aa4'); },
    minnow: P => fishPaint('#9aa8b4', '#d8e0e8', '#7a8894')(P),
    trout: fishPaint('#8a9a4a', '#e8d8b8', '#6a7a3a', P => { P.line(4, 8, 14, 8, '~#e88a8a'); P.px(7, 6, '~#3a3a20'); P.px(10, 6, '~#3a3a20'); P.px(12, 10, '~#3a3a20'); }),
    perch: fishPaint('#e8c83a', '#fff0b0', '#e8822a', P => { for (const x of [6, 9, 12]) P.rect(x, 5, 1, 5, '#7a6a1a'); }),
    snapper: fishPaint('#e04a3a', '#ffb0a0', '#b02a2a'),
    frostfin: fishPaint('#8ad8f0', '#e8fbff', '~#ffffff', P => P.px(9, 6, '~#ffffff')),
    gloomeel: P => { for (let i = 0; i < 14; i++) P.ell(1.5 + i, 8 + Math.sin(i * .7) * 2.2, 1.8, 1.8, '#6a3aa8'); P.line(2, 9, 13, 8, '~#c87aff'); P.px(14, 5 + Math.round(Math.sin(13 * .7) * 2.2) + 2, '~#ffd23f'); },
    glowgill: fishPaint('#3ab8a8', '#a8f0e0', '#2a8a7a', P => { P.rect(10, 6, 1, 4, '~#a8fff0'); P.rect(11, 6, 1, 4, '~#7affe8'); }),
    prismkoi: fishPaint('#f4f4f8', '#ffffff', '#ffb0e8', P => { P.ell(7, 6.5, 2, 1.5, '~#ff7a5a'); P.ell(11, 9, 1.6, 1.2, '~#7ad8ff'); P.px(9, 6, '~#ffe67a'); }),
    honeyfin: fishPaint('#e8a828', '#ffe08a', '#c87a18', P => { P.px(7, 7, '~#fff2b0'); P.px(10, 8, '~#fff2b0'); }),
    cookedfish: P => { P.ell(8, 12, 7.5, 2.6, '#e8e8f0'); fishPaint('#a86a32', '#d8a060', '#7a4a22', P => { for (const x of [6, 9, 12]) P.line(x, 5, x - 2, 10, '~#5a3418'); })(P); P.px(4, 1, '~#ffffff80'); P.px(5, 0, '~#ffffff60'); },
    woodcrate: crateP('#a8743a', '#7a4e26', '~#d8a050'), ironcrate: crateP('#a8743a', '#8a8a96', '~#d8d8e8'), goldcrate: crateP('#b8843a', '#e8b828', '~#fff2a0'),
    glowcap: P => { P.rect(7, 8, 3, 7, '#e8e0c8'); P.ell(8.5, 7, 6.5, 4, '#3a8ae8'); P.rect(2, 7, 14, 2, '#3a8ae8'); P.px(5, 5, '~#a8e8ff'); P.px(10, 4, '~#a8e8ff'); P.px(12, 6, '~#a8e8ff'); P.px(7, 5, '~#ffffff'); },
    gloomscale: P => { P.ell(8, 9, 6, 6, '#5a2a8a'); P.tri(2, 8, 14, 8, 8, 1, '#5a2a8a'); P.line(5, 12, 8, 6, '~#8a5ac8'); P.line(11, 12, 8, 6, '~#8a5ac8'); P.px(6, 5, '~#c89aff'); },
    silk: P => { P.ell(8, 9, 6, 5, '#f0f0f6'); P.line(3, 7, 13, 11, '~#c8c8d4'); P.line(3, 10, 13, 6, '~#c8c8d4'); P.line(13, 4, 15, 0, '#e8e8f0'); P.px(6, 7, '~#ffffff'); },
  };
  const xIcon = id => XICON[id] ? spr('xi|' + id, 16, 16, XICON[id], { hi: 1.18, lo: .78 }) : null;

  /* ---------- everyday items redrawn as detailed pixel icons: potions, gel, materials, bars, basic tools, armor, accessories ---------- */
  const MPAL = { cu: ['#7a3e1a', '#d8864a', '#f8c090'], fe: ['#4a5058', '#a8b0b8', '#e8eef4'], ag: ['#6a7080', '#d8e0ea', '#ffffff'], au: ['#9a700a', '#ffd23f', '#fff4b0'], sh: ['#2a1650', '#7a4ac8', '#c8a0ff'],
    he: ['#6a1a06', '#ff5a1a', '#ffc04a'], az: ['#16307a', '#3a7aff', '#a8d0ff'], vi: ['#145a30', '#2ec86a', '#a8f8c8'], sm: ['#9a8040', '#ffe08a', '#fffbe8'], wd: ['#4a2a10', '#9a6a36', '#d0a060'], bn: ['#8a8070', '#e0d8c0', '#fffaf0'] };
  const metalOf = c => ({ '#d8864a': 'cu', '#b8c0c8': 'fe', '#e0e8f0': 'ag', '#b07a42': 'wd', '#7a7a84': 'fe', '#6a5a4a': 'wd' })[c] || 'fe';
  const handle = (P, x0, y0, x1, y1) => { P.line(x0, y0, x1, y1, '#6a4020', 2); P.line(x0, y0 - 1, x1 - 1, y1, '~#a87444'); };
  const flask = (liq, shape) => P => {
    const gl = '#cfeaf2', L = liq, Ld = shadeC(liq, .7), Ll = shadeC(liq, 1.35);
    if (shape === 'round') { P.rect(6, 0, 4, 2, '#9a6436'); P.px(6, 0, '~#c08a52'); P.rect(6, 2, 4, 3, gl); P.ell(8, 10, 6, 5.6, gl); P.ell(8, 10.6, 5, 4.6, L); P.rect(4, 7, 8, 1, Ll); P.ell(8, 12.4, 4, 2.2, Ld); }
    else if (shape === 'tall') { P.rect(6, 0, 4, 2, '#9a6436'); P.rect(6, 2, 4, 2, gl); P.rect(4, 4, 8, 11, gl); P.rect(5, 6, 6, 8, L); P.rect(5, 6, 6, 1, Ll); P.rect(5, 12, 6, 2, Ld); }
    else if (shape === 'square') { P.rect(6, 0, 4, 2, '#9a6436'); P.rect(6, 2, 4, 2, gl); P.rect(2, 4, 12, 11, gl); P.rect(3, 6, 10, 8, L); P.rect(3, 6, 10, 1, Ll); P.rect(3, 12, 10, 2, Ld); }
    else { P.rect(6, 2, 4, 2, '#9a6436'); P.rect(6, 4, 4, 2, gl); P.tri(2, 15, 14, 15, 8, 5, gl); P.tri(4, 14, 12, 14, 8, 8, L); P.rect(5, 12, 6, 2, Ld); }
    P.px(5, 8, '~#ffffff'); P.px(5, 9, '~#ffffffc0'); P.px(6, 7, '~#ffffffa0'); P.px(9, 10, '~' + Ll); P.px(10, 12, '~' + Ll); P.px(8, 9, '~#ffffffa0'); };
  const ingot = pal => P => { const [d, m, l] = pal; P.tri(1, 13, 4, 7, 4, 13, shadeC(m, .82)); P.tri(15, 13, 12, 7, 12, 13, shadeC(m, .7)); P.rect(4, 7, 8, 6, m); P.rect(1, 13, 15, 2, d); P.rect(4, 6, 8, 2, l); P.line(5, 6, 10, 6, '~' + shadeC(l, 1.2)); P.px(5, 9, '~#ffffffc0'); P.px(6, 10, '~#ffffff80'); P.px(10, 11, '~' + shadeC(m, .8)); };
  const pickP = pal => P => { const [d, m, l] = pal; handle(P, 3, 14, 11, 4); P.line(1, 6, 8, 1, m, 2); P.line(8, 1, 15, 8, m, 2); P.line(2, 5, 8, 0, '~' + l); P.line(9, 1, 14, 6, '~' + l); P.px(1, 7, d); P.px(15, 9, d); P.rect(9, 3, 3, 3, d); P.px(10, 4, '~' + l); };
  const axeP = pal => P => { const [d, m, l] = pal; handle(P, 4, 15, 11, 2); P.tri(9, 2, 15, 1, 15, 9, m); P.tri(9, 2, 15, 9, 10, 7, shadeC(m, .85)); P.line(15, 1, 15, 9, '~' + l); P.line(14, 2, 14, 8, '~' + shadeC(l, .95)); P.rect(9, 3, 2, 4, d); };
  const hamP = pal => P => { const [d, m, l] = pal; handle(P, 3, 15, 10, 5); P.rect(6, 0, 9, 6, m); P.rect(6, 0, 9, 1, '~' + l); P.rect(6, 5, 9, 1, d); P.rect(9, 1, 3, 5, shadeC(m, .85)); P.px(7, 2, '~#ffffffb0'); P.px(13, 2, '~#ffffffb0'); };
  const swordP = (pal, wood) => P => { const [d, m, l] = pal; P.line(5, 10, 14, 1, m, 2); P.line(5, 9, 13, 1, '~' + l); P.px(14, 1, '~' + l); P.line(6, 11, 14, 3, d); P.line(2, 9, 7, 14, wood ? '#6a4020' : '#8a6a2a', 2); P.line(1, 14, 4, 11, '#5a3616', 2); P.px(1, 15, '#c8a040'); P.px(3, 10, '~#e8c860'); };
  const bowP = (pal, string = '#e8e8e8') => P => { const [d, m, l] = pal; P.line(4, 1, 9, 2, m, 2); P.line(9, 2, 13, 6, m, 2); P.line(13, 6, 14, 11, m, 2); P.line(4, 1, 1, 0, d); P.line(14, 11, 15, 15, d); P.line(5, 1, 9, 1, '~' + l); P.line(10, 2, 13, 5, '~' + l); P.line(3, 1, 15, 14, '~' + string); P.rect(10, 3, 2, 2, '#5a3616'); };
  const armorP = pal => P => { const [d, m, l] = pal; P.rect(3, 2, 10, 12, m); P.rect(0, 2, 4, 5, m); P.rect(12, 2, 4, 5, m); P.rect(6, 1, 4, 2, d); P.rect(3, 13, 10, 2, d); P.line(8, 3, 8, 12, shadeC(m, .8)); P.rect(4, 8, 8, 1, d); P.px(1, 3, '~' + l); P.px(13, 3, '~' + l); P.rect(4, 4, 2, 3, '~' + l); P.px(10, 10, '~' + l); };
  const arrowP = (tip, fl, shaft = '#b07a42') => P => { P.line(2, 14, 12, 4, shaft); P.tri(10, 3, 15, 1, 13, 6, tip); P.px(14, 2, '~' + shadeC(tip, 1.4)); P.tri(1, 11, 4, 12, 2, 15, fl); P.tri(3, 13, 4, 15, 0, 15, shadeC(fl, .8)); };
  const charmP = (c, chain = '#d8c070') => P => { P.line(4, 0, 8, 4, chain); P.line(12, 0, 8, 4, chain); P.tri(8, 3, 14, 9, 8, 15, c); P.tri(8, 3, 2, 9, 8, 15, shadeC(c, .85)); P.tri(8, 6, 11, 9, 8, 12, shadeC(c, 1.3)); P.px(6, 7, '~#ffffff'); P.px(7, 6, '~#ffffffc0'); P.px(10, 11, '~' + shadeC(c, .7)); };
  const emblemP = (c, mark) => P => { P.ell(8, 8, 7, 7, '#c8a040'); P.ell(8, 8, 5.6, 5.6, c); P.ell(8, 8, 3.6, 3.6, shadeC(c, 1.25)); if (mark) mark(P); P.px(4, 4, '~#ffffff'); P.px(5, 3, '~#ffffffb0'); P.px(12, 12, '~#7a5a10'); };
  const rodP = (pal, bob = '#ff4a4a') => P => { const [d, m, l] = pal; P.line(2, 14, 13, 1, m, 2); P.line(2, 13, 12, 1, '~' + l); P.rect(1, 12, 3, 3, '#3a3a44'); P.px(2, 13, '~#8a8a94'); P.line(14, 1, 15, 10, '~#e8e8e8'); P.rect(14, 10, 2, 3, bob); P.px(14, 10, '~#ffffff'); };
  const bootsP = (c, trim) => P => { P.rect(2, 1, 5, 9, c); P.rect(2, 9, 8, 5, c); P.rect(2, 14, 9, 1, '#2a1a10'); P.rect(2, 1, 5, 2, trim); P.rect(9, 3, 5, 8, shadeC(c, .8)); P.rect(9, 10, 6, 4, shadeC(c, .8)); P.rect(9, 3, 5, 2, shadeC(trim, .85)); P.px(3, 4, '~#ffffffa0'); P.px(3, 10, '~#ffffff70'); };
  const bucketP = liq => P => { P.line(2, 5, 8, 0, '#6a6a74'); P.line(8, 0, 14, 5, '#6a6a74'); P.tri(1, 5, 15, 5, 13, 15, '#9aa0aa'); P.tri(1, 5, 13, 15, 3, 15, '#8a909a'); P.rect(1, 5, 15, 2, '#c0c6d0'); if (liq) { P.rect(3, 5, 11, 2, liq); P.px(5, 5, '~' + shadeC(liq, 1.4)); P.px(9, 6, '~' + shadeC(liq, 1.3)); } P.rect(2, 10, 12, 1, '#6a6a74'); P.px(3, 8, '~#ffffffa0'); };
  const NICON = {
    potion: flask('#e8203a', 'round'), lpotion: flask('#ff6a7a', 'small'), mpotion: flask('#2a6aff', 'round'), recall: flask('#2ad8c8', 'tall'),
    pactp: flask('#b05aff', 'square'), mightp: flask('#ff4a3a', 'tall'), eaglep: flask('#3ad84a', 'square'), arcanep: flask('#4a7aff', 'tall'), edgep: flask('#e8b830', 'square'), hastep: flask('#5affe8', 'tall'), stonep: flask('#8a8a96', 'square'), vigorp: flask('#ff7ad0', 'small'),
    gel: P => { P.ell(8, 10, 7, 5, '#2a8aff'); P.rect(1, 10, 15, 4, '#2a8aff'); P.ell(8, 9, 5.5, 3.6, '#5ab4ff'); P.ell(10, 11, 1.6, 1.6, '#1a5ad0'); P.ell(5, 8, 1.6, 1.1, '~#ffffff'); P.px(7, 7, '~#ffffffc0'); P.px(12, 9, '~#c8ecff'); P.rect(1, 14, 15, 1, '#1a4ab0'); },
    lens: P => { P.ell(8, 8, 7, 7, '#f0ece4'); P.ell(8, 8, 4.4, 4.4, '#c8203a'); P.ell(8, 8, 3, 3, '#7a0a1a'); P.ell(8, 8, 1.6, 1.6, '~#141014'); P.px(6, 6, '~#ffffff'); P.px(7, 5, '~#ffffffc0'); for (const [a, b, c, d] of [[1, 6, 3, 7], [14, 9, 12, 8], [7, 14, 8, 12], [11, 2, 10, 4]]) P.line(a, b, c, d, '~#e05a6a'); },
    bone: P => { P.line(4, 11, 11, 4, '#e8e0c8', 3); P.ell(3, 13, 2, 2, '#e8e0c8'); P.ell(1.5, 11.5, 1.6, 1.6, '#e8e0c8'); P.ell(13, 3, 2, 2, '#e8e0c8'); P.ell(14.5, 4.6, 1.6, 1.6, '#e8e0c8'); P.line(5, 9, 10, 4, '~#fffaf0'); P.px(12, 2, '~#ffffff'); },
    star: P => { const pts = []; for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 3.2 : 7.6; pts.push([8 + Math.cos(a) * r, 8.4 + Math.sin(a) * r]); } for (let i = 0; i < 10; i++) P.tri(8, 8.4, pts[i][0], pts[i][1], pts[(i + 1) % 10][0], pts[(i + 1) % 10][1], i % 2 ? '#ffd23f' : '#ffe880'); P.ell(8, 8.4, 2.2, 2.2, '#fff4b0'); P.px(7, 6, '~#ffffff'); P.px(6, 4, '~#ffffffc0'); },
    ember: P => { P.ell(8, 9, 6, 5.4, '#7a1a06'); P.ell(8, 9, 4.6, 4, '#ff5a1a'); P.ell(8, 9, 2.6, 2.2, '#ffc04a'); P.px(8, 9, '~#fff4c0'); P.line(4, 6, 6, 9, '~#2a0a04'); P.line(11, 7, 10, 11, '~#2a0a04'); P.px(5, 2, '~#ff9a3a'); P.px(11, 1, '~#ffc04a'); P.px(9, 3, '~#ff6a1a'); },
    cbar: ingot(MPAL.cu), ibar: ingot(MPAL.fe), sbar: ingot(MPAL.ag), gbar: ingot(MPAL.au), shbar: ingot(MPAL.sh), azbar: ingot(MPAL.az), vibar: ingot(MPAL.vi), smbar: P => { ingot(MPAL.sm)(P); P.px(3, 3, '~#ffffff'); P.px(13, 2, '~#ffffff'); P.px(12, 4, '~#fff4b0'); },
    hbar: P => { ingot(MPAL.he)(P); P.line(5, 9, 8, 11, '~#ffe080'); P.line(8, 11, 10, 9, '~#ffe080'); P.px(11, 12, '~#ffe080'); },
    arrow: arrowP('#b8c0c8', '#e8e8e8'), farrow: P => { arrowP('#ff6a1a', '#e8e8e8')(P); P.px(15, 0, '~#ffc04a'); P.px(13, 0, '~#ffe080'); P.px(15, 3, '~#ff9a3a'); }, barrow: arrowP('#e8e0c8', '#c8303a', '#c8bfa8'),
    shot: P => { for (const [x, y, c] of [[5, 10, '#6a6a74'], [11, 10, '#5a5a64'], [8, 5, '#7a7a84']]) { P.ell(x, y, 3.4, 3.4, c); P.px(x - 1, y - 1, '~#d8d8e0'); } },
    sshot: P => { for (const [x, y, c] of [[5, 10, '#c8d0dc'], [11, 10, '#b0b8c4'], [8, 5, '#e0e8f0']]) { P.ell(x, y, 3.4, 3.4, c); P.px(x - 1, y - 1, '~#ffffff'); } },
    knife: P => { P.line(6, 9, 14, 1, '#c8d0dc', 2); P.line(6, 8, 13, 1, '~#ffffff'); P.rect(4, 9, 4, 2, '#5a5a64'); P.line(1, 14, 5, 10, '#6a4020', 2); P.px(1, 15, '#c8a040'); },
    bknife: P => { P.line(6, 9, 14, 1, '#e0d8c0', 2); P.line(6, 8, 13, 1, '~#fffaf0'); P.rect(4, 9, 4, 2, '#8a8070'); P.line(1, 14, 5, 10, '#5a4a3a', 2); P.ell(2, 13, 1.4, 1.4, '#e0d8c0'); },
    shuriken: P => { P.tri(8, 0, 10, 8, 6, 8, '#b8c0c8'); P.tri(16, 8, 8, 10, 8, 6, '#a8b0b8'); P.tri(8, 16, 6, 8, 10, 8, '#98a0a8'); P.tri(0, 8, 8, 6, 8, 10, '#a8b0b8'); P.ell(8, 8, 2, 2, '#4a5058'); P.px(8, 8, '~#1a1a20'); P.px(8, 2, '~#ffffff'); P.px(13, 8, '~#e8eef4'); },
    life: P => { P.ell(5, 6, 4, 4, '#d8203a'); P.ell(11, 6, 4, 4, '#d8203a'); P.tri(1, 7, 15, 7, 8, 15, '#d8203a'); P.tri(8, 5, 13, 7, 8, 13, '#a8102a'); P.ell(5, 5, 2.2, 2, '#ff6a7a'); P.px(4, 4, '~#ffffff'); P.px(5, 3, '~#ffd0d6'); P.line(8, 5, 8, 12, '~#ff8a9a'); },
    mana: P => { const pts = []; for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 3.4 : 7.6; pts.push([8 + Math.cos(a) * r, 8.4 + Math.sin(a) * r]); } for (let i = 0; i < 10; i++) P.tri(8, 8.4, pts[i][0], pts[i][1], pts[(i + 1) % 10][0], pts[(i + 1) % 10][1], i % 2 ? '#2a5ad8' : '#4a8aff'); P.ell(8, 8.4, 2.2, 2.2, '#a8d0ff'); P.px(7, 6, '~#ffffff'); P.px(6, 3, '~#e0f0ff'); },
    crown: P => { P.rect(2, 8, 13, 6, '#ffd23f'); P.tri(2, 9, 2, 3, 5, 9, '#ffd23f'); P.tri(6, 9, 8, 2, 10, 9, '#ffd23f'); P.tri(11, 9, 14, 3, 14, 9, '#ffd23f'); P.rect(2, 12, 13, 2, '#a8820e'); P.ell(8, 10.5, 1.8, 1.8, '#3aa0ff'); P.px(8, 10, '~#c8ecff'); P.px(4, 11, '~#ff4a5a'); P.px(12, 11, '~#3ad86a'); P.px(3, 4, '~#fff4b0'); P.px(8, 3, '~#fff4b0'); },
    eye: P => { P.ell(8, 8, 7, 6.4, '#f0e8e0'); P.ell(10, 8, 3.6, 3.6, '#3a8a5a'); P.ell(10.4, 8, 1.8, 1.8, '~#141014'); P.px(9, 6, '~#ffffff'); for (const [a, b, c, d] of [[1, 7, 4, 8], [2, 11, 5, 10], [3, 3, 5, 5], [7, 14, 7, 12]]) P.line(a, b, c, d, '~#d83a4a'); P.tri(0, 12, 3, 9, 4, 15, '#a8203a'); },
    totem: P => { P.rect(7, 8, 3, 8, '#7a5a3a'); P.ell(8, 5, 5, 4.6, '#e8e0c8'); P.rect(5, 8, 7, 3, '#e8e0c8'); P.rect(5, 4, 2, 2, '~#2a2420'); P.rect(10, 4, 2, 2, '~#2a2420'); P.px(8, 7, '~#2a2420'); for (let x = 6; x <= 10; x += 2) P.px(x, 10, '~#8a8070'); P.px(6, 2, '~#ffffff'); P.line(3, 12, 13, 12, '#c8303a'); },
    horn: P => { P.line(2, 13, 6, 8, '#c86a2a', 3); P.line(6, 8, 11, 5, '#e88a3a', 2); P.line(11, 5, 14, 1, '#ffc04a', 1); P.ell(3, 13, 2.6, 2.6, '#8a3a12'); P.ell(3, 13, 1.4, 1.4, '~#2a0a04'); for (const [x, y] of [[5, 9], [8, 7], [11, 5]]) P.px(x, y, '~#5a2008'); P.px(13, 2, '~#fff4b0'); P.px(15, 0, '~#ff9a3a'); },
    cpick: pickP(MPAL.cu), ipick: pickP(MPAL.fe), spick: pickP(MPAL.ag), cax: axeP(MPAL.cu), iax: axeP(MPAL.fe), sax: axeP(MPAL.ag),
    whammer: hamP(MPAL.wd), chammer: hamP(MPAL.cu), ihammer: hamP(MPAL.fe),
    wsword: swordP(MPAL.wd, 1), csword: swordP(MPAL.cu), isword: swordP(MPAL.fe), ssword: swordP(MPAL.ag),
    spear: P => { P.line(1, 15, 11, 5, '#7a4e26', 2); P.line(1, 14, 10, 5, '~#a87444'); P.tri(10, 4, 15, 0, 12, 7, '#b8c0c8'); P.px(13, 2, '~#ffffff'); P.rect(9, 5, 3, 2, '#5a5a64'); },
    wbow: bowP(MPAL.wd), cbow: bowP(MPAL.cu), ibow: bowP(MPAL.fe), sbow: bowP(MPAL.ag),
    flint: P => { P.rect(4, 5, 11, 3, '#6a6a74'); P.rect(4, 5, 11, 1, '~#b0b0bc'); P.rect(14, 4, 2, 2, '#3a3a44'); P.tri(3, 7, 9, 7, 3, 14, '#7a4a22'); P.rect(2, 11, 4, 4, '#7a4a22'); P.rect(6, 8, 3, 3, '~#3a3a44'); P.rect(5, 3, 2, 2, '#4a4a54'); P.px(3, 12, '~#a87444'); },
    musket: P => { P.line(0, 13, 15, 3, '#5a5a64', 2); P.line(0, 12, 14, 3, '~#9a9aa4'); P.line(0, 15, 7, 10, '#7a4a22', 3); P.rect(6, 9, 3, 3, '#3a3a44'); P.px(15, 2, '#2a2a34'); P.px(2, 13, '~#a87444'); },
    boom: P => { P.line(2, 14, 7, 3, '#a8743c', 3); P.line(7, 3, 14, 7, '#a8743c', 3); P.line(3, 13, 7, 4, '~#d8a868'); P.line(8, 3, 13, 6, '~#d8a868'); P.rect(6, 2, 3, 3, '#6a4020'); },
    iboom: P => { P.line(2, 14, 7, 3, '#a8b0b8', 3); P.line(7, 3, 14, 7, '#a8b0b8', 3); P.line(3, 13, 7, 4, '~#e8eef4'); P.line(8, 3, 13, 6, '~#e8eef4'); P.rect(6, 2, 3, 3, '#4a5058'); },
    rod: P => { P.line(2, 14, 11, 5, '#7a4e26', 2); P.line(2, 13, 10, 5, '~#a87444'); P.ell(12, 4, 3, 3, '#ffb04a'); P.ell(12, 4, 1.6, 1.6, '#fff4c0'); P.px(15, 1, '~#ffe080'); P.px(9, 1, '~#ffc04a'); P.px(15, 7, '~#ff9a3a'); P.rect(9, 6, 3, 2, '#c8a040'); },
    ffwand: P => { P.line(2, 14, 11, 5, '#7a4e26', 2); P.line(2, 13, 10, 5, '~#a87444'); P.ell(12, 4, 2.6, 2.6, '#c8e05a'); P.ell(12, 4, 1.4, 1.4, '~#ffffc0'); P.px(14, 1, '~#ffe680'); P.px(9, 2, '~#ffe680'); P.px(15, 6, '~#ffe680'); },
    carmor: armorP(MPAL.cu), iarmor: armorP(MPAL.fe), sarmor: armorP(MPAL.ag), warmor: armorP(MPAL.wd),
    gaunt: P => { const c = '#b8c0c8'; P.rect(3, 7, 9, 6, c); for (const [x, h] of [[3, 5], [5, 6], [7, 6], [9, 5]]) P.rect(x + (x > 3 ? x - 3 - Math.floor((x - 3) / 2) : 0) - (x > 3 ? Math.floor((x - 3) / 2) : 0), 7 - h, 2, h, c); P.line(12, 9, 14, 6, c, 2); P.rect(2, 12, 11, 3, '#5a5a64'); P.rect(2, 12, 11, 1, '#8a8a94'); P.line(4, 3, 4, 6, '~#ffffff'); P.line(6, 2, 6, 6, '~#ffffff'); P.rect(4, 9, 7, 1, '#8a9098'); P.px(13, 6, '~#ffffff'); },
    wemb: emblemP('#e83a2a', P => { P.line(5, 11, 11, 5, '~#ffffff'); P.line(6, 5, 11, 10, '~#fff0c0'); }), remb: emblemP('#3ab83a', P => { P.line(5, 11, 11, 5, '~#ffffff'); P.tri(9, 5, 12, 4, 11, 7, '~#ffffff'); }),
    semb: emblemP('#3a6ae8', P => { P.ell(8, 8, 1.6, 1.6, '~#ffffff'); P.px(8, 5, '~#ffffff'); P.px(5, 8, '~#ffffff'); P.px(11, 8, '~#ffffff'); P.px(8, 11, '~#ffffff'); }), temb: emblemP('#e8b830', P => { P.tri(8, 4, 12, 8, 8, 12, '~#ffffff'); P.tri(8, 4, 4, 8, 8, 12, '~#fff0c0'); }),
    cemb: emblemP('#b05aff', P => { P.ell(6, 8, 1.4, 1.4, '~#ffffff'); P.ell(10, 8, 1.4, 1.4, '~#ffffff'); P.px(8, 5, '~#ffffff'); }),
    scope: P => { P.rect(1, 5, 14, 5, '#4a5a6a'); P.rect(1, 5, 14, 1, '~#8a9aaa'); P.rect(0, 4, 3, 7, '#3a4a5a'); P.rect(13, 4, 3, 7, '#3a4a5a'); P.rect(14, 5, 2, 5, '#5ad8ff'); P.px(14, 6, '~#e0f8ff'); P.rect(5, 10, 2, 4, '#2a2a34'); P.rect(9, 10, 2, 4, '#2a2a34'); },
    mcharm: charmP('#3a7aff'), echarm: charmP('#ff6a2a'), frostheart: charmP('#9ae8ff', '#c8d8e8'), mawcharm: charmP('#9a5ae8'), lightcharm: charmP('#ffe8ff', '#ffd23f'), tidecharm: charmP('#3ae0c8'),
    sunfeather: P => { P.line(2, 15, 13, 2, '#e8c040'); P.tri(4, 12, 13, 1, 15, 4, '#ffe680'); P.tri(4, 12, 13, 1, 9, 2, '#ffd23f'); for (let i = 0; i < 4; i++) P.px(7 + i * 2, 8 - i * 2, '~#fff4c0'); P.px(14, 2, '~#ffffff'); },
    bell: P => { P.rect(7, 0, 2, 2, '#c8a040'); P.ell(8, 8, 5, 6, '#9ae8ff'); P.rect(2, 11, 13, 2, '#7ac8e8'); P.ell(8, 14, 1.6, 1.4, '#c8a040'); P.px(6, 5, '~#ffffff'); P.px(6, 6, '~#e0f8ff'); P.line(10, 4, 11, 9, '~#c8f4ff'); },
    focus: P => { P.tri(8, 0, 13, 6, 8, 15, '#9a7aff'); P.tri(8, 0, 3, 6, 8, 15, '#7a5ae8'); P.tri(8, 2, 11, 6, 8, 11, '#c8b0ff'); P.px(7, 3, '~#ffffff'); P.px(6, 6, '~#e8e0ff'); },
    pouch: P => { P.ell(8, 10, 6.4, 5, '#8a5a32'); P.rect(4, 4, 8, 3, '#7a4a22'); P.rect(5, 6, 6, 1, '#c8a040'); P.line(9, 1, 11, 6, '#c8d0dc'); P.line(6, 0, 7, 5, '#c8d0dc'); P.px(9, 1, '~#ffffff'); P.px(6, 0, '~#ffffff'); P.px(5, 9, '~#c08a52'); },
    boots: bootsP('#a0603a', '#d8a868'), frostgrip: bootsP('#7ac8e8', '#e8fbff'),
    ishield: P => { const c = '#a8b0b8'; P.rect(2, 1, 12, 8, c); P.tri(2, 8, 14, 8, 8, 15, c); P.rect(2, 1, 12, 1, '~#e8eef4'); P.line(2, 1, 2, 8, '~#d0d8e0'); P.rect(7, 2, 2, 11, '#7a8088'); P.rect(3, 5, 10, 2, '#7a8088'); P.ell(8, 6, 2, 2, '#c8a040'); P.px(7, 5, '~#fff0a0'); P.px(4, 3, '~#ffffff'); },
    vband: P => { P.ell(8, 9, 6, 5.4, '#5aff7a'); P.ell(8, 9, 3.6, 3, '#00000000'); for (let y = 5; y <= 13; y++) for (let x = 4; x <= 12; x++) { const dx = (x + .5 - 8) / 3.6, dy = (y + .5 - 9) / 3; if (dx * dx + dy * dy <= 1) P.del(x, y); } P.ell(8, 3, 2.2, 2.2, '#2ec86a'); P.px(7, 2, '~#ffffff'); P.px(4, 7, '~#c8ffd0'); },
    collar: P => { P.ell(8, 9, 6.4, 5.6, '#a0603a'); for (let y = 5; y <= 13; y++) for (let x = 4; x <= 12; x++) { const dx = (x + .5 - 8) / 4, dy = (y + .5 - 9) / 3.4; if (dx * dx + dy * dy <= 1) P.del(x, y); } P.ell(8, 14, 1.8, 1.8, '#ffd23f'); P.px(3, 7, '~#c8c8d0'); P.px(13, 7, '~#c8c8d0'); P.px(3, 11, '~#c8c8d0'); P.px(13, 11, '~#c8c8d0'); },
    coin: P => { P.ell(8, 8, 7, 7, '#ffd23f'); P.ell(8, 8, 5, 5, '#e8b020'); P.tri(8, 4, 11, 8, 8, 12, '#fff0a0'); P.tri(8, 4, 5, 8, 8, 12, '#ffe060'); P.px(4, 4, '~#ffffff'); P.px(12, 12, '~#9a700a'); },
    homeshard: P => { P.tri(8, 0, 13, 7, 8, 15, '#3ae0d0'); P.tri(8, 0, 3, 8, 8, 15, '#1ab0a8'); P.tri(8, 3, 11, 7, 8, 12, '#a8fff4'); P.px(7, 4, '~#ffffff'); P.px(12, 2, '~#c8fff8'); P.px(3, 12, '~#c8fff8'); },
    lodestar: P => { P.ell(8, 8, 7, 7, '#ffd23f'); P.ell(8, 8, 5.4, 5.4, '#2a1a40'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; P.px(8 + Math.cos(a) * 3.6, 8 + Math.sin(a) * 3.6, i % 2 ? '~#5ad8ff' : '~#7affee'); } P.ell(8, 8, 1.6, 1.6, '~#ffffff'); P.px(4, 4, '~#fff4b0'); },
    essence: P => { P.ell(8, 8, 6.4, 6.4, '#c84ad8'); P.ell(8, 8, 4.4, 4.4, '#ff7aff'); P.ell(7, 7, 2.2, 2.2, '#ffd0ff'); P.px(6, 6, '~#ffffff'); P.px(2, 2, '~#ffb0ff'); P.px(14, 4, '~#ffb0ff'); P.px(13, 14, '~#e080ff'); },
    woodrod: rodP(MPAL.wd), ironrod: rodP(MPAL.fe), glowrod: rodP(['#1a6a7a', '#3ad8e8', '#c8fbff'], '#3ad8e8'), starrod: rodP(MPAL.sm, '#ffd23f'),
    bucket: bucketP(null), wbucket: bucketP('#3a7ae8'), lbucket: bucketP('#ff6a1a'), hbucket: bucketP('#e8a828'),
  };
  /* ---------- pickaxes, axes, swords and guns: one careful renderer for every metal ---------- */
  const WOODP = ['#4a2a10', '#8a5a2a', '#c08a52'];
  const strip = c => c && c[0] === '~' ? c.slice(1) : c;
  function toolArt(id, it, pal, accent) {
    const [d, m, l] = pal, ac = strip(accent) || '#c8303a', W = '~#ffffff';
    const wood = (P, x0, y0, x1, y1) => { P.line(x0, y0, x1, y1, WOODP[1], 2); P.line(x0, y0 - 1, x1 - 1, y1, '~' + WOODP[2]); P.line(x0 + 1, y0, x1, y1 + 1, '~' + WOODP[0]); };
    if (it.pick) return P => {   // a curved, tapered head across the top of a diagonal handle
      wood(P, 2, 14, 10, 6); P.rect(1, 14, 2, 2, '#3a2410');
      const A = [4.4, 1.6], C = [13.6, 2.4], B = [14.4, 11.6], bz = (t, k) => (1 - t) * (1 - t) * A[k] + 2 * (1 - t) * t * C[k] + t * t * B[k];
      for (let t = 0; t <= 1.001; t += .02) { const x = bz(t, 0), y = bz(t, 1), r = .55 + 1.15 * Math.sin(Math.PI * Math.min(1, t * 1.05)); P.ell(x, y, r, r, m); }
      for (let t = .04; t <= .96; t += .02) { const x = bz(t, 0), y = bz(t, 1), dx = 2 * (1 - t) * (C[0] - A[0]) + 2 * t * (B[0] - C[0]), dy = 2 * (1 - t) * (C[1] - A[1]) + 2 * t * (B[1] - C[1]), n = Math.hypot(dx, dy), nx = dy / n, ny = -dx / n, r = .55 + 1.15 * Math.sin(Math.PI * t);
        P.px(x + nx * (r - .2), y + ny * (r - .2), '~' + l); P.px(x - nx * (r - .1), y - ny * (r - .1), '~' + d); }
      P.px(7, 2, W); P.px(13, 6, W); P.rect(9, 5, 3, 3, d); P.px(10, 6, '~' + l); P.px(4, 1, '~' + d); P.px(14, 12, '~' + d); };
    if (it.axe) return P => {   // a broad crescent blade with a bright cutting edge
      wood(P, 2, 15, 10, 3); P.line(10, 3, 11, 1, WOODP[1], 2);
      for (let y = 0; y <= 11; y++) { const hx = 2 + (15 - y) * 8 / 12, k = Math.sin(Math.PI * (y + .5) / 12), ex = 11.5 + 3.8 * k - (y < 2 ? 1.5 : 0); if (ex <= hx + .5) continue;
        for (let x = Math.ceil(hx + .6); x <= ex; x++) P.px(x, y, x >= ex - .9 ? '~' + l : x >= ex - 2 ? m : x <= hx + 1.6 ? d : shadeC(m, .9)); }
      P.px(Math.round(11.5 + 3.8) - 1, 5, W); P.px(Math.round(11.5 + 3.8) - 1, 6, W); P.rect(9, 3, 2, 5, d); P.px(9, 4, '~' + l); };
    if (it.gun) return (it.cd || .5) >= .7 || it.shots > 1 ? P => {   // a long gun
      P.rect(4, 5, 12, 2, m); if (it.shots > 1) { P.rect(14, 3, 2, 6, m); P.px(15, 3, '~' + l); } P.rect(4, 5, 12, 1, '~' + l); P.px(15, 4, d); P.rect(13, 5, 1, 2, d);
      P.rect(0, 7, 6, 4, WOODP[1]); P.rect(5, 7, 9, 2, WOODP[1]); P.rect(0, 7, 13, 1, '~' + WOODP[2]); P.rect(0, 10, 6, 1, '~' + WOODP[0]); P.rect(0, 8, 1, 4, '#3a2410');
      P.rect(5, 6, 3, 2, d); P.rect(5, 4, 2, 2, d); P.px(5, 4, '~' + l); P.line(7, 9, 9, 9, d); P.px(9, 8, d); P.px(8, 8, '~' + WOODP[0]); P.px(10, 5, W); } : P => {   // a pistol
      P.rect(6, 4, 9, 3, m); P.rect(6, 4, 9, 1, '~' + l); P.rect(6, 6, 9, 1, d); P.rect(14, 3, 1, 1, d); P.rect(15, 4, 1, 3, d);
      P.rect(3, 4, 5, 5, shadeC(m, .75)); P.px(4, 5, '~' + l); P.rect(2, 2, 2, 3, d); P.px(2, 2, '~' + l);
      P.tri(3, 8, 8, 8, 4, 15, WOODP[1]); P.tri(3, 8, 4, 15, 0, 14, WOODP[1]); P.line(3, 9, 1, 13, '~' + WOODP[2]); P.rect(0, 13, 4, 2, d);
      P.line(6, 9, 9, 9, d); P.px(9, 8, d); P.px(7, 8, '~' + shadeC(m, .6)); P.px(10, 5, W); P.px(4, 7, '~' + ac); };
    if (it.melee && !it.reach) return P => {   // a broad blade with a bright edge, a ridge, a crossguard with a gem, a wrapped grip
      P.line(6, 9, 13, 2, m, 3); P.line(5, 9, 12, 2, '~' + l); P.line(7, 10, 14, 3, '~' + d); P.line(7, 8, 12, 3, '~' + shadeC(l, 1.1));
      P.px(14, 1, '~' + l); P.px(15, 0, '~' + l); P.px(13, 1, '~' + l); P.px(14, 2, m); P.px(9, 5, W); P.px(10, 4, W);
      const gc = it.c === '#b07a42' ? WOODP[1] : '#c8a040'; P.line(2, 8, 7, 13, gc, 2); P.line(2, 8, 6, 12, '~' + shadeC(gc, 1.3)); P.px(5, 10, '~' + ac); P.px(4, 10, '~' + shadeC(ac, 1.4));
      P.line(1, 14, 3, 12, '#5a3616', 2); P.px(2, 13, '~#8a5a2a'); P.px(3, 12, '~#3a2410'); P.rect(0, 14, 2, 2, gc); P.px(0, 14, '~' + shadeC(gc, 1.4)); };
    return null;
  }
  const BASEPAL = { '#d8864a': MPAL.cu, '#b8c0c8': MPAL.fe, '#e0e8f0': MPAL.ag, '#b07a42': MPAL.wd, '#7a7a84': MPAL.fe, '#6a5a4a': MPAL.fe };
  const toolIcon = id => { const it = IT[id]; if (!it || !(it.pick || it.axe || it.gun || (it.melee && !it.reach))) return null; const th = GID[id] && GTH[GID[id]];
    const pal = th ? [th[0], th[1], th[2]] : BASEPAL[it.c] || [shadeC(it.c || '#b8c0c8', .55), it.c || '#b8c0c8', shadeC(it.c || '#b8c0c8', 1.35)], acc = th ? th[3] : it.c === '#e0e8f0' ? '#3a8ae8' : '#c8303a';
    const art = toolArt(id, it, pal, acc); return art ? spr('tool|' + id, 16, 16, art, { flat: true }) : null; };
  const nIcon = id => NICON[id] ? spr('ni|' + id, 16, 16, NICON[id], { hi: 1.18, lo: .78 }) : null;
  // the Watcher, redrawn: a great veined eye in a dark plated shell, trailing nerve-tendrils that ripple
  const watcherPaint = (P, f) => {
    for (let k = 0; k < 5; k++) { const y0 = 16 + k * 7, ph = f * 1.57 + k * 1.1, len = 26 - Math.abs(k - 2) * 3;
      for (let i = 0; i <= len; i++) { const t = i / len, x = 24 - i, y = y0 + Math.sin(i * .32 + ph) * (1 + t * 3.5) + (k - 2) * t * 2.2, w = Math.max(1, Math.round(4 - t * 3));
        P.rect(x, y - w / 2, 2, w, t > .82 ? '~#ff5a6a' : t > .5 ? '#a8203a' : '#6a1024'); } }
    P.ell(43, 30, 28, 28, '#2a1426'); for (let a = 1.75; a < 4.6; a += .32) { const cx = 43 + Math.cos(a) * 24, cy = 30 + Math.sin(a) * 24; P.tri(cx, cy, 43 + Math.cos(a - .2) * 28, 30 + Math.sin(a - .2) * 28, 43 + Math.cos(a + .14) * 33, 30 + Math.sin(a + .14) * 33, '#3a1c34'); P.line(cx, cy, 43 + Math.cos(a) * 28, 30 + Math.sin(a) * 28, '~#5a2a4e'); }
    P.ell(47, 30, 25, 25, '#ece4de'); P.ell(49, 28, 20, 20, '~#f6f0ea'); P.ell(52, 26, 13, 13, '~#fbf8f4');
    const vein = (x0, y0, a, n, s) => { let x = x0, y = y0; for (let i = 0; i < n; i++) { const nx = x + Math.cos(a) * 2, ny = y + Math.sin(a) * 2; P.line(x, y, nx, ny, i < n / 2 ? '~#b82a3e' : '~#e07080'); if (i === Math.floor(n / 2)) { let bx = nx, by = ny; for (let j = 0; j < n / 3; j++) { const b2x = bx + Math.cos(a + s) * 2, b2y = by + Math.sin(a + s) * 2; P.line(bx, by, b2x, b2y, '~#e07080'); bx = b2x; by = b2y; } } x = nx; y = ny; a += Math.sin(i * 1.7 + x0) * .18; } };
    for (const [a, n, s] of [[3.3, 6, .6], [2.6, 5, -.5], [4.0, 5, .5], [1.6, 4, .7], [4.8, 4, -.6], [.6, 4, -.5], [5.6, 4, .5], [2.1, 3, .4]]) vein(47 + Math.cos(a) * 24, 30 + Math.sin(a) * 24, a + Math.PI, n, s);
    P.ell(38, 15, 3, 2, '~#ffffff'); P.px(42, 13, '~#ffffff'); P.px(34, 18, '~#ffffffc0');
    for (const [x, y] of [[8, 6], [14, 52], [70, 4], [2, 30]]) if ((x + f) % 2) P.px(x, y, '~#ff8a9a'); };
  /* ---------- five bosses redrawn as pixel sprites (outlined and shaded like the rest) ---------- */
  // The Weaver Queen: a broad spider with a gold sigil on her back, six red eyes and jointed legs that step in turn
  function weaverPaint(P, f, v) { const body = '#3a2040', hi = '#5a3a64', gold = '#e8b83a', leg = '#2a1830';
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const ph = (f + i + (s > 0 ? 2 : 0)) % 4, lift = ph === 0 ? -3 : ph === 2 ? 1 : -1, bx = 48 + s * (6 + i * 4), by = 26;
      const kx = 48 + s * (18 + i * 7), ky = 10 + i * 2 + lift, fx = 48 + s * (26 + i * 6), fy = 50 - (i === 0 || i === 3 ? 2 : 0) + (lift < -1 ? -2 : 0);
      P.line(bx, by, kx, ky, leg, 2); P.line(kx, ky, fx, fy, leg, 2); P.px(kx, ky, hi); }
    P.ell(36, 26, 20, 15, body); P.ell(32, 21, 13, 8, hi); P.rect(33, 16, 4, 18, gold); P.rect(26, 23, 18, 4, gold); P.px(34, 17, '~#fff2a0'); P.px(27, 24, '~#fff2a0');
    for (const [x, y] of [[20, 30], [24, 36], [44, 34], [50, 30]]) P.px(x, y, '~#7a4a8a');
    P.ell(62, 27, 10, 9, body); P.ell(61, 24, 6, 4, hi);
    const eye = v === 'r' ? '~#ff3a2a' : '~#ff5a5a'; for (const [x, y] of [[66, 22], [69, 24], [66, 26], [70, 28], [64, 21], [64, 25]]) P.px(x, y, eye); P.px(69, 23, '~#ffffff');
    P.line(70, 31, 74, 36 + (f % 2), '#d8d0c0', 2); P.line(66, 33, 69, 38 - (f % 2), '#d8d0c0', 2); }
  // The Rime Colossus: a golem of packed ice with a crown of icicles and glowing eyes; its fists swing as it walks
  function colossusPaint(P, f) { const ice = '#8ac8e8', deep = '#4a86b0', hi = '#d8f4ff', sw = [0, 2, 0, -2][f];
    P.rect(20, 62, 10, 18, deep); P.rect(36, 62, 10, 18, deep); P.rect(18, 76, 14, 4, '#3a6a90'); P.rect(34, 76, 14, 4, '#3a6a90');
    P.rect(14, 30, 38, 34, ice); P.rect(18, 34, 14, 10, hi); P.rect(38, 46, 10, 12, deep); P.line(26, 48, 32, 58, '~#5aa0c8'); P.line(32, 58, 30, 62, '~#5aa0c8');
    P.rect(2, 32 + sw, 12, 22, ice); P.rect(0, 52 + sw, 16, 12, deep); P.rect(52, 32 - sw, 12, 22, ice); P.rect(50, 52 - sw, 16, 12, deep); P.rect(3, 33 + sw, 4, 8, hi); P.rect(53, 33 - sw, 4, 8, hi);
    P.rect(20, 12, 26, 20, ice); P.rect(22, 14, 10, 6, hi); P.rect(25, 22, 5, 4, '~#1a3a6a'); P.rect(37, 22, 5, 4, '~#1a3a6a'); P.px(26, 23, '~#9af4ff'); P.px(38, 23, '~#9af4ff'); P.rect(28, 28, 10, 2, deep);
    for (const [x, h] of [[21, 6], [26, 10], [32, 13], [38, 9], [43, 6]]) P.tri(x - 2, 12, x + 2, 12, x, 12 - h, '#e8fbff'); }
  // The Gloom Mother: a lumpy flying brood-mass with glowing pores, a fringe of tendrils and beating membrane wings
  function gloomPaint(P, f) { const b = '#4a2058', d = '#2e1238', pore = '~#ff7aff', wy = [-6, -2, 3, -2][f];
    for (const s of [-1, 1]) { P.tri(35 + s * 10, 22, 35 + s * 34, 6 + wy, 35 + s * 32, 26 + wy * .4, '#8a6aa8a0'); P.line(35 + s * 10, 22, 35 + s * 34, 6 + wy, '#c8a8e8c0'); }
    for (let i = 0; i < 6; i++) { const x = 16 + i * 8; P.line(x, 40, x + Math.sin(i + f) * 3, 52, d, 2); }
    P.ell(35, 30, 24, 15, b); for (const [x, y, r] of [[22, 26, 7], [36, 22, 9], [50, 27, 7], [30, 34, 6], [44, 35, 6]]) { P.ell(x, y, r, r * .8, shadeC(b, 1.15)); P.ell(x - 1, y - 1, r * .5, r * .4, shadeC(b, 1.35)); }
    for (const [x, y] of [[24, 28], [38, 24], [49, 29], [31, 35], [44, 36], [35, 30]]) { P.px(x, y, pore); P.px(x + 1, y, '~#ffd0ff'); }
    P.tri(28, 42, 32, 42, 30, 49, '#1a0820'); P.tri(38, 42, 42, 42, 40, 49, '#1a0820'); }
  // The Prismatic Sentinel: a faceted crystal heart with a ring of shards that turns
  function sentinelPaint(P, f) { const C = ['#ff9aff', '#9af4ff', '#ffe680', '#9aff9a', '#c8a8ff', '#ffb07a'];
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + f * .26, x = 29 + Math.cos(a) * 25, y = 29 + Math.sin(a) * 25; P.tri(x, y - 4, x + 3, y, x, y + 4, C[i]); P.tri(x, y - 4, x - 3, y, x, y + 4, shadeC(C[i], .8)); }
    P.tri(29, 6, 44, 29, 29, 52, '#e0b8f0'); P.tri(29, 6, 14, 29, 29, 52, '#a888d8'); P.tri(29, 6, 44, 29, 29, 29, '~#f8e0ff'); P.tri(29, 29, 14, 29, 29, 52, '~#8a6ac0');
    P.line(29, 6, 29, 52, '~#ffffffa0'); P.line(14, 29, 44, 29, '~#ffffff80'); P.ell(29, 29, 4, 4, '~#ffffff'); P.ell(29, 29, 2, 2, '~#9af4ff'); P.px(24, 16, '~#ffffff'); }
  // The Eclipse Tyrant: a black sun whose corona turns, ringed by embers, one burning eye
  function tyrantPaint(P, f, v) { const cx = 45, cy = 45;
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283 + f * .1, L = i % 2 ? 40 : 44, r0 = 30; P.line(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * L, cy + Math.sin(a) * L, i % 2 ? '~#ff8a2a' : '~#ffd23f', 2); }
    P.ell(cx, cy, 31, 31, '~#ffb03a'); P.ell(cx, cy, 29, 29, '#2a1238'); P.ell(cx, cy, 27, 27, '#0e0814'); P.ell(cx - 8, cy - 9, 8, 5, '~#2a1a3a');
    P.ell(cx + 9, cy, 8, 5, '~#f0e0d0'); P.ell(cx + 10, cy, 4, 4, v === 'r' ? '~#ff2a1a' : '~#b81a1a'); P.ell(cx + 10, cy, 2, 2, '~#1a0808'); P.px(cx + 8, cy - 2, '~#ffffff');
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + f * .4 + .4, x = cx + Math.cos(a) * 38, y = cy + Math.sin(a) * 38; P.rect(x - 2, y - 2, 4, 4, '#3a1a10'); P.px(x, y, '~#ff6a1a'); } }
  let caveBg = null;
  function caveBack(g) { if (!caveBg) { const c = spr('caveback', 96, 96, P => { const r = srng(77); P.rect(0, 0, 96, 96, '~#0e0a08'); for (let i = 0; i < 26; i++) { const x = r() * 96, y = r() * 96, w = 6 + r() * 14, h = 4 + r() * 9; P.ell(x, y, w / 2, h / 2, '~#151009'); P.ell(x - w * .15, y - h * .2, w * .3, h * .25, '~#1a140d'); } for (let i = 0; i < 40; i++) P.px(r() * 96, r() * 96, '~#070504'); }, { outline: false });
      const cc = document.createElement('canvas'); cc.width = cc.height = 96; cc.getContext('2d').drawImage(c, -1, -1); caveBg = g.createPattern(cc, 'repeat'); }
    try { caveBg.setTransform(new DOMMatrix([1.5, 0, 0, 1.5, Math.round(-cam.x * .55), Math.round(-cam.y * .55)])); } catch (e) {} return caveBg; }
  function drawTiles(g) {
    g.imageSmoothingEnabled = false; torchL = []; glints = []; glowL = [];
    const v = WV(), x0 = Math.floor((cam.x + v.x0) / TS) - 1, y0 = Math.floor((cam.y + v.y0) / TS) - 1, x1 = x0 + Math.ceil((v.x1 - v.x0) / TS) + 3, y1 = y0 + Math.ceil((v.y1 - v.y0) / TS) + 3, leaves = [], tufts = [];
    // the underground backdrop, column by column under each column's own surface, so it never cuts across the sky
    g.fillStyle = caveBack(g); for (let x = Math.max(0, x0); x < Math.min(WW, x1); x++) { const Y = Math.round((bgTop(x) + 3) * TS - cam.y), B = Math.round(y1 * TS - cam.y); if (Y < B) g.fillRect(Math.round(x * TS - cam.x), Y, TS, B - Y); }
    const TR = scanTrees(x0, x1, y0, y1), DC = [];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (x < 0 || y < 0 || x >= WW || y >= WH) continue;
      const t = tiles[y * WW + x], wl = walls[y * WW + x], X = Math.round(x * TS - cam.x), Y = Math.round(y * TS - cam.y);
      if (wl === 13 && (!SOLID.has(t) || t === T.GLASS)) glassPane(g, X, Y, x, y, false); else if (wl && (!SOLID.has(t) || t === T.GLASS)) { g.drawImage(tex['wall' + wl], X, Y, TS, TS); g.fillStyle = PW(wl) ? 'rgba(0,0,0,.24)' : 'rgba(0,0,0,.38)'; g.fillRect(X, Y, TS, TS); }
      if (!t) continue;
      if (t === T.LEAF) { if (!TR.cov.has(y * WW + x)) leaves.push(X + TS / 2, Y + TS / 2, x * 7 + y * 13); continue; }
      if (t === T.SLEAF && TR.cov.has(y * WW + x)) continue;
      if (t === T.TORCH) { torchL.push(X + TS / 2, Y + 6); if (R() < .006) K.burst(scrX(X + TS / 2), scrY(Y + 2), ['#ffd23f', '#ff8a1a'], 1, 30, { life: .7, size: 2, gravity: -50 }); } else if (GLOWC[t] && (t !== T.GMOSS || (x + y) % 3 === 0) && (t !== T.HELLSTONE || (x + y) % 2 === 0)) glowL.push(X + TS / 2, Y + TS / 2, t);
      if ((t === T.GOLD || t === T.SHADOW || t === T.HELLSTONE || t === T.SILVER || t === T.CRYSTAL || t === T.GCHEST) && (x * 73 + y * 37 + Math.floor(anim * 1.5)) % 29 === 0) glints.push(X + 4 + (x * 5 % 16), Y + 4 + (y * 7 % 16), x + .5, y + .5);
      if (t === T.DOOR || t === T.DOORO) { const top = isDoor(at(x, y + 1)); g.drawImage(tex[t === T.DOOR ? (top ? 'doorT' : 'doorB') : (top ? 'doorOT' : 'doorOB')], X, Y, TS, TS); continue; }
      if (t === T.GLASS) { glassPane(g, X, Y, x, y, true); continue; }
      if (t === T.PLAT) { drawPlat(g, X, Y, x, y); continue; }
      if (SOLID.has(t)) {
        const o = s => !SOLID.has(s), u = o(at(x, y - 1)), d = o(at(x, y + 1)), l = o(at(x - 1, y)), r = o(at(x + 1, y));
        g.drawImage(edgeTex(t, ((Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0) % 3, (u ? 1 : 0) | (d ? 2 : 0) | (l ? 4 : 0) | (r ? 8 : 0)), X, Y, TS, TS);
        if (u && at(x, y - 1) === T.AIR) { const dp = decoPick(t, x, y); if (dp && !brokenDeco.has('u' + (y * WW + x))) DC.push(dp[0], dp[1], X, Y, x); } if (d && at(x, y + 1) === T.AIR) { const dh = decoHang(t, x, y); if (dh && !brokenDeco.has('h' + (y * WW + x))) DC.push(dh[0], dh[1], X, Y + TS, x); }
      } else {
        g.drawImage(tex[t], X, Y, TS, TS);
        if (t === T.TORCH) { const f = Math.sin(anim * 18 + x) > 0; g.fillStyle = f ? '#fff6c0' : '#ff8a1a'; g.fillRect(X + 10, Y + (f ? 0 : 1), 4, 3); }
      }
    }
    drawTrunkBits(g, TR); drawDeco(g, DC);
    if (leaves.length) {
      const pass = (c, ox, oy, r) => { const d = pdisc(c, r), w = d.width * 1.5; for (let i = 0; i < leaves.length; i += 3) g.drawImage(d, leaves[i] + ox + Math.round(Math.sin(anim * 1.1 + (leaves[i] + cam.x) * .012)) * 1.5 - r * 1.5 - .75, leaves[i + 1] + oy - r * 1.5 - .75, w, w); };
      pass('#10280c', 0, 1.5, 16); pass('#2a6e20', 0, 0, 14); pass('#3a8e2a', -1.5, -3, 11); pass('#4aa834', -4.5, -7.5, 7); pass('#6ac84a', -6, -10.5, 3);
      g.fillStyle = '#1f5618'; for (let i = 0; i < leaves.length; i += 3) { const h = leaves[i + 2], q = v => Math.round(v / 1.5) * 1.5; g.fillRect(q(leaves[i] - 8 + h % 9), q(leaves[i + 1] + (h * 3) % 8 - 2), 3, 3); g.fillRect(q(leaves[i] + 2 + (h * 5) % 7), q(leaves[i + 1] - 6 + h % 5), 3, 3); } g.fillStyle = '#8ee860'; for (let i = 0; i < leaves.length; i += 3) { const h = leaves[i + 2]; if (h % 3) continue; g.fillRect(Math.round((leaves[i] - 9 + h % 6) / 1.5) * 1.5, Math.round((leaves[i + 1] - 12) / 1.5) * 1.5, 1.5, 1.5); }
    }
    drawTrees(g, TR);
    if (liq) { for (let y = Math.max(0, y0); y < Math.min(WH, y1); y++) for (let x = Math.max(0, x0); x < Math.min(WW, x1); x++) { const i = y * WW + x, a = liq[i]; if (!a) continue; const k = lqk[i], Lq = LQ[k]; if (!Lq) continue;
        const full = y > 0 && liq[i - WW] && lqk[i - WW] === k, h = full ? TS : Math.max(2, Math.round(a / 8 * TS + Math.sin(anim * 2.6 + x * .9) * 1.5)), X = Math.round(x * TS - cam.x), Y = Math.round(y * TS - cam.y), [cr, cg, cb] = Lq.rgb;
        g.fillStyle = `rgba(${cr},${cg},${cb},${Lq.a})`; g.fillRect(X, Y + TS - h, TS, h);
        if (!full) { g.fillStyle = k === 2 ? 'rgba(255,220,120,.85)' : `rgba(${Math.min(255, cr + 90)},${Math.min(255, cg + 80)},${Math.min(255, cb + 60)},.7)`; g.fillRect(X, Y + TS - h, TS, 2); }
        if (k === 2 && !full && x % 2 === 0) glowL.push(X + TS / 2, Y + TS / 2, T.HELLSTONE);
        if (k === 2 && (x * 13 + y * 7 + Math.floor(anim * 3)) % 23 === 0) { g.fillStyle = 'rgba(255,230,150,.9)'; g.fillRect(X + (x * 5) % 18, Y + TS - h + 3 + (y % 4), 3, 3); } } }
    if (mine) { const X = sx(mine.x), Y = sy(mine.y), k = Math.min(1, mine.p); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 3 + k * 6; i++) { const a = i * 2.1; g.moveTo(X + 12, Y + 12); g.lineTo(X + 12 + Math.cos(a) * 11 * k, Y + 12 + Math.sin(a) * 11 * k); } g.stroke(); }
  }
  function heldItem(g, id, it, b) {
    g.rotate(b);
    const put = (rho, gx, gy) => { g.rotate(Math.PI - rho); const c = Math.cos(rho), sn = Math.sin(rho); icon(g, id, -(gx * c - gy * sn), -(gx * sn + gy * c), 1); };
    if (GID[id] && GTH[GID[id]] && (it.melee || it.pick || it.axe || it.hammer || it.reach || it.magic)) put(.78, 0, 7.5);
    else if (it.melee) put(-.78, 0, 6.5);
    else if (it.pick || it.axe || it.hammer) put(0, 0, 6);
    else if (it.reach) put(-.8, 0, 8.5);
    else if (it.magic) put(-.7, 0, 7.5);
    else if (it.throw) put(-.78, 0, 3);
    else if (it.gun) { g.rotate(Math.PI / 2); icon(g, id, 3, -3, 1); }
    else if (it.bow) { g.rotate(Math.PI / 2); icon(g, id, -4, 0, 1); }
    else if (it.boom) { g.rotate(Math.PI / 2); icon(g, id, 5, -4, 1); }
    else icon(g, id, 1.5, -3.5, it.tile ? .55 : .75);
  }
  function drawHero(g, p, name, armor, held, swing, face, blink, col, aim, lk) {
    const X = sx(p.x), Y = sy(p.y), walk = p.ground && Math.abs(p.vx) > .5 ? Math.sin(anim * 14) : 0;
    if (blink) return; g.save(); g.translate(Math.round(X), Math.round(Y)); g.scale(face * 1.5, 1.5); const r = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); }, L = lookOf(lk);
    const G = !armor ? {} : typeof armor === 'string' ? { body: armor } : armor, cOf = k => G[k] && IT[G[k]] ? IT[G[k]].c : null, hc = cOf('head'), bc = cOf('body'), gc = cOf('legs');
    const shirt = bc || (lk ? L.topC : col || '#3a8a3a'), dk = 'rgba(0,0,0,.28)', l1 = Math.max(0, walk) * 2, l2 = -Math.min(0, walk) * 2;
    const pst = gc ? 0 : L.pants, legTop = pst === 1 ? 4 : pst === 2 ? 0 : 8 - 0, lc = gc || L.legC;
    for (const [lx, lo] of [[-5, l1], [1, l2]]) { if (pst === 1 || pst === 2) r(L.sk, lx, -9 + lo, 4, 8 - lo); if (pst !== 2) r(lc, lx, -9 + lo, 4, pst === 1 ? 4 : 8 - lo); r(dk, lx + 3, -9 + lo, 1, pst === 1 ? 4 : 8 - lo); if (pst === 3) r(shade(lc, .72), lx, -6 + lo, 2, 2); if (gc) r('rgba(255,255,255,.25)', lx, -9 + lo, 1, 8 - lo); }
    if (pst === 2) { r(lc, -6, -11, 12, 6); r(shade(lc, .72), -6, -6, 12, 1); for (const x of [-3, 0, 3]) r(shade(lc, .82), x, -10, 1, 4); }
    const shoe = gc || L.shoe; for (const lx of [-6, 1]) { r(shoe, lx, -2, 5, 2); r(shade(shoe, .55), lx, -1, 5, 1); r(shade(shoe, 1.35), lx + 3, -2, 2, 1); }
    const sleeve = !bc && L.top === 7 && lk ? L.sk : shirt; r(shade(sleeve, .68), -6, -20, 2, 7); r(shade(L.sk, .8), -6, -13, 2, 2);   // the far arm, behind the body
    r(shirt, -5, -21, 10, 12); r(dk, 2, -21, 3, 12); r('rgba(255,255,255,.18)', -5, -21, 2, 12); if (!(lk && !bc && L.top === 6)) { r('#3a2410', -5, -11, 10, 2); r(bc ? 'rgba(255,255,255,.4)' : '#d8aa2a', -1, -11, 2, 2); }
    r(L.sk2, -1, -21, 3, 1);
    if (bc) { r('rgba(255,255,255,.3)', -4, -20, 3, 2); r(shirt, -6, -22, 12, 3); r(dk, -6, -20, 12, 1); }
    else topArt(r, L, shirt);
    r(L.sk, -4, -29, 9, 9); r(L.sk2, -4, -21, 9, 1); faceArt(r, L); r(L.sk3, 4, -23, 1, 1);
    if (hc) { r(hc, -5, -32, 11, 5); r(hc, -5, -29, 2, 5); r('rgba(255,255,255,.35)', -3, -31, 5, 1); }
    else hairArt(r, L);
    if (lk) extraArt(r, L, !!hc);
    armorBits(r, G);
    // the front arm and whatever is in that hand. Arm angle 0 hangs straight down; negative swings it forward.
    const it = held && IT[held], ranged = it && (it.gun || it.bow || it.magic || it.boom), tool = it && (it.melee || it.pick || it.axe || it.hammer || it.reach || it.throw);
    const sw = swing > 0 ? Math.min(1, 1 - swing / (it && it.reach ? .38 : .34)) : 0, ez = 1 - Math.pow(1 - sw, 3);
    let armA = Math.sin(anim * 14) * (walk ? .45 : 0) - .15, itemA = 0;
    if (ranged) { const a = aim || [1, 0]; armA = Math.atan2(-a[0] * face, a[1]); }
    else if (tool && it.reach && swing > 0) { const a = aim || [1, 0]; armA = Math.atan2(-a[0] * face, a[1]); }
    else if (tool && swing > 0) armA = 2 + ez * 3.25;                 // over the shoulder, down in front
    else if (tool) { armA = -.35 + Math.sin(anim * 14) * (walk ? .2 : 0); itemA = -2.32; }   // resting, blade up and forward
    else if (it) { armA = -.55 + Math.sin(anim * 14) * (walk ? .25 : 0); }
    if (tool && swing > 0 && !it.reach) for (const k of [.12, .24]) { const pa = 2 + Math.max(0, ez - k) * 3.25; g.save(); g.globalAlpha = .18; g.translate(1, -19); g.rotate(pa); g.translate(1, 8.5); heldItem(g, held, it, 0); g.restore(); }
    g.save(); g.translate(1, -19); g.rotate(armA); r(sleeve, -1, 0, 4, 5); r(shade(sleeve, .8), -1, 4, 4, 1); r(L.sk, -1, 5, 4, 5); r(L.sk2, 2, 5, 1, 5);
    if (it) { g.save(); g.translate(1, 8.5); if (!tool && !ranged) g.rotate(-armA); heldItem(g, held, it, itemA); g.restore(); r(L.sk, -1, 7, 4, 3); }
    g.restore(); g.restore();
    if (name) { g.font = `14px ${PXF}`; g.textAlign = 'center'; g.fillStyle = '#000'; g.fillText(name, X + 1, Y - 73); g.fillStyle = col || '#fff'; g.fillText(name, X, Y - 74); }
  }
  // new creatures are drawn with an older creature's drawing, but every colour it paints is shifted to their own palette
  // (a colour table instead of a canvas filter, which is far too slow on Chromebooks)
  const tintMemo = new Map(), CTX = CanvasRenderingContext2D.prototype, FSD = Object.getOwnPropertyDescriptor(CTX, 'fillStyle'), SSD = Object.getOwnPropertyDescriptor(CTX, 'strokeStyle');
  function tintCol(c, T_) { if (typeof c !== 'string') return c; const key = T_.join() + c; let o = tintMemo.get(key); if (o) return o; o = c;
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c); if (m) { let h = m[1]; if (h.length === 3) h = h.replace(/./g, d => d + d); let r = parseInt(h.slice(0, 2), 16) / 255, gg = parseInt(h.slice(2, 4), 16) / 255, bb = parseInt(h.slice(4, 6), 16) / 255;
      const mx = Math.max(r, gg, bb), mn = Math.min(r, gg, bb); let H = 0, S = 0, L = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; S = L > .5 ? d / (2 - mx - mn) : d / (mx + mn); H = mx === r ? (gg - bb) / d + (gg < bb ? 6 : 0) : mx === gg ? (bb - r) / d + 2 : (r - gg) / d + 4; H *= 60; }
      H = (H + T_[0]) % 360; S = Math.min(1, S * T_[1]); L = Math.min(.97, L * T_[2]); o = `hsl(${Math.round(H)},${Math.round(S * 100)}%,${Math.round(L * 100)}%)`; }
    if (tintMemo.size > 4000) tintMemo.clear(); tintMemo.set(key, o); return o; }
  const BDRAW = {
    colossus(g, e, f) { const w = Math.sin(e.t * 5) * (e.ground ? 1 : 0), s = 2.6; g.scale(f * s, s); const r = (c, x, y, ww, h) => { g.fillStyle = c; g.fillRect(x, y, ww, h); };
      r('#4a7a9a', -14, -10 + w, 9, 10 - w); r('#4a7a9a', 5, -10 - w, 9, 10 + w); r('#8ec8e8', -13, -10 + w, 7, 3); r('#8ec8e8', 6, -10 - w, 7, 3);
      r('#6aa8c8', -18, -40, 36, 31); r('#a8e0f8', -16, -38, 32, 6); r('#3a6a88', -18, -14, 36, 4); r('#c8f0ff', -10, -30, 8, 5); r('#4a8aaa', 4, -26, 10, 9);
      r('#5a98b8', -26, -38, 9, 20); r('#5a98b8', 17, -38, 9, 20); r('#a8e0f8', -26, -38, 9, 4); r('#a8e0f8', 17, -38, 9, 4); r('#3a6a88', -27, -20, 11, 6); r('#3a6a88', 16, -20, 11, 6);
      r('#7ab8d8', -11, -55, 22, 16); r('#c8f0ff', -9, -53, 18, 4); r(e.rage ? '#ff5a3a' : '#2a4a8a', -7, -47, 4, 3); r(e.rage ? '#ff5a3a' : '#2a4a8a', 3, -47, 4, 3); r('#ffffff', -6, -47, 1, 1); r('#ffffff', 4, -47, 1, 1);
      for (const [x, h] of [[-10, 7], [-4, 10], [2, 8], [8, 6]]) { g.fillStyle = '#d8f6ff'; g.beginPath(); g.moveTo(x, -55); g.lineTo(x + 2, -55 - h); g.lineTo(x + 4, -55); g.fill(); } },
    gloom(g, e) { const s = 2.4, fl = Math.sin(e.t * 22); g.scale(s, s); g.fillStyle = 'rgba(200,170,230,.35)'; for (const d of [-1, 1]) { g.beginPath(); g.ellipse(d * 14, -8 - fl * 3, 14, 6 + fl * 2, d * -.5, 0, 7); g.fill(); }
      g.fillStyle = '#3a1a4a'; g.beginPath(); g.ellipse(0, 0, 20, 14, 0, 0, 7); g.fill(); g.fillStyle = '#5a2a6a'; g.beginPath(); g.ellipse(0, -3, 16, 9, 0, 0, 7); g.fill();
      const p = .6 + Math.sin(e.t * 4) * .4; g.fillStyle = `rgba(180,80,255,${p})`; for (const [x, y, r] of [[-9, -4, 4], [8, -5, 3.5], [0, 4, 4.5], [-3, -9, 2.5], [11, 4, 3]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
      g.fillStyle = e.rage ? '#ff5a5a' : '#e05aff'; g.beginPath(); g.arc(-6, 6, 2, 0, 7); g.arc(6, 6, 2, 0, 7); g.fill(); g.strokeStyle = '#1a0a22'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-5, 12); g.quadraticCurveTo(-9, 18, -3, 20); g.moveTo(5, 12); g.quadraticCurveTo(9, 18, 3, 20); g.stroke(); },
    sentinel(g, e) { const s = 2.2, a = e.t * 1.4; g.scale(s, s); if (e.flash > 0) { g.fillStyle = `rgba(255,255,255,${e.flash * 2})`; g.beginPath(); g.arc(0, 0, 30, 0, 7); g.fill(); }
      for (let i = 0; i < 6; i++) { const b = a + i / 6 * Math.PI * 2, x = Math.cos(b) * 24, y = Math.sin(b) * 24; g.fillStyle = `hsl(${(i * 60 + e.t * 90) % 360},90%,75%)`; g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x + 3, y); g.lineTo(x, y + 5); g.lineTo(x - 3, y); g.fill(); }
      g.save(); g.rotate(Math.sin(e.t) * .3); const fac = [['#ffd0ff', [0, -22, 13, 0, 0, 4]], ['#c8a0ff', [0, -22, -13, 0, 0, 4]], ['#a0e8ff', [-13, 0, 0, 22, 0, 4]], ['#ff9aff', [13, 0, 0, 22, 0, 4]]];
      for (const [c, [x1, y1, x2, y2, x3, y3]] of fac) { g.fillStyle = c; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3); g.fill(); }
      g.fillStyle = e.rage ? '#ff3a6a' : '#ffffff'; g.beginPath(); g.arc(0, -2, 4, 0, 7); g.fill(); g.restore(); },
    tyrant(g, e) { const s = 2.6, a = e.t; g.scale(s, s); const gr = g.createRadialGradient(0, 0, 12, 0, 0, 34); gr.addColorStop(0, 'rgba(255,120,40,.0)'); gr.addColorStop(.5, e.rage ? 'rgba(255,60,30,.55)' : 'rgba(255,140,40,.45)'); gr.addColorStop(1, 'rgba(255,80,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 34, 0, 7); g.fill();
      g.strokeStyle = '#ffb04a'; g.lineWidth = 2; for (let i = 0; i < 12; i++) { const b = a * .6 + i / 12 * Math.PI * 2, r1 = 21, r2 = 27 + Math.sin(a * 5 + i) * 3; g.beginPath(); g.moveTo(Math.cos(b) * r1, Math.sin(b) * r1); g.lineTo(Math.cos(b) * r2, Math.sin(b) * r2); g.stroke(); }
      g.fillStyle = '#0c0814'; g.beginPath(); g.arc(0, 0, 20, 0, 7); g.fill(); g.strokeStyle = '#3a1a5a'; g.lineWidth = 2; g.stroke();
      const tp = nearestP(e.x, e.y), ea = Math.atan2(tp.y - 1.4 - e.y, tp.x - e.x); g.fillStyle = '#ffe8c0'; g.beginPath(); g.ellipse(Math.cos(ea) * 5, Math.sin(ea) * 5, 7, 5, 0, 0, 7); g.fill(); g.fillStyle = e.rage ? '#ff2a1a' : '#a01a0a'; g.beginPath(); g.arc(Math.cos(ea) * 7, Math.sin(ea) * 7, 3, 0, 7); g.fill();
      for (let i = 0; i < 4; i++) { const b = -a * 1.2 + i * Math.PI / 2, x = Math.cos(b) * 38, y = Math.sin(b) * 38; g.fillStyle = '#2a1a3a'; g.fillRect(x - 3, y - 3, 6, 6); g.fillStyle = '#ff8a3a'; g.fillRect(x - 1, y - 1, 2, 2); } },
    shard(g, e) { g.rotate(Math.atan2(e.vy, e.vx)); g.fillStyle = '#c8f0ff'; g.beginPath(); g.moveTo(12, 0); g.lineTo(0, -5); g.lineTo(-10, 0); g.lineTo(0, 5); g.fill(); g.fillStyle = '#ffffff'; g.fillRect(-2, -1, 8, 2); },
    gspit(g, e) { g.fillStyle = '#6a2a8a'; g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fill(); g.fillStyle = '#c87aff'; g.beginPath(); g.arc(-2, -2, 4, 0, 7); g.fill(); },
    pshot(g, e) { g.fillStyle = `hsl(${(e.t * 400 + e.id * 40) % 360},95%,72%)`; g.beginPath(); g.arc(0, 0, 8, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, 3.5, 0, 7); g.fill(); },
    vshot(g, e) { g.fillStyle = '#1a0a24'; g.beginPath(); g.arc(0, 0, 11, 0, 7); g.fill(); g.strokeStyle = '#ff8a2a'; g.lineWidth = 3; g.stroke(); g.fillStyle = '#ffb04a'; g.beginPath(); g.arc(0, 0, 3, 0, 7); g.fill(); },
  };
  let furyC = null;
  function drawEnemy(g, e) { if (KIND[e.kind] && KIND[e.kind].boss && e.rage) { if (!furyC) { furyC = document.createElement('canvas'); furyC.width = furyC.height = 128; const fg = furyC.getContext('2d'), gr = fg.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,40,20,.6)'); gr.addColorStop(.45, 'rgba(255,40,20,.28)'); gr.addColorStop(1, 'rgba(255,40,20,0)'); fg.fillStyle = gr; fg.fillRect(0, 0, 128, 128); } const r = 34 + e.w * TS + Math.sin(anim * 6) * 12, cy = sy(e.y) - e.h * TS / 2; g.drawImage(furyC, sx(e.x) - r, cy - r, r * 2, r * 2); } if ((!(KIND[e.kind] && KIND[e.kind].draw) || BOSSA[e.kind]) && drawMob(g, e)) return; const D = KIND[e.kind]; if (D && D.draw) { const tp = nearestP(e.x, e.y); g.save(); g.translate(Math.round(sx(e.x)), Math.round(sy(e.y))); if (e.hit > 0) g.globalCompositeOperation = 'lighter'; try { BDRAW[D.draw](g, e, Math.sign(tp.x - e.x) || 1); } finally { g.restore(); } return; }
    if (!D || !D.ai) return drawEnemy0(g, e); const k = e.kind, c = e.c; e.kind = D.ai; if (D.c) e.c = D.c;
    if (D.tint) { Object.defineProperty(g, 'fillStyle', { configurable: true, get() { return FSD.get.call(g); }, set(v) { FSD.set.call(g, tintCol(v, D.tint)); } }); Object.defineProperty(g, 'strokeStyle', { configurable: true, get() { return SSD.get.call(g); }, set(v) { SSD.set.call(g, tintCol(v, D.tint)); } }); }
    try { drawEnemy0(g, e); } finally { if (D.tint) { delete g.fillStyle; delete g.strokeStyle; } e.kind = k; e.c = c; }
    if (D.cap) { const X = Math.round(sx(e.x)), Y = Math.round(sy(e.y - e.h)); g.fillStyle = '#2a9ac8'; g.beginPath(); g.ellipse(X, Y + 4, 16, 9, 0, Math.PI, 0); g.fill(); g.fillStyle = '#9af4ff'; g.fillRect(X - 8, Y - 2, 4, 3); g.fillRect(X + 4, Y, 4, 3); } }
  function drawEnemy0(g, e) {
    const X = sx(e.x), Y = sy(e.y), tp = nearestP(e.x, e.y), f = Math.sign(tp.x - e.x) || 1; g.save(); g.translate(Math.round(X), Math.round(Y)); const r = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    if (e.hit > 0) g.globalCompositeOperation = 'lighter';
    if (e.kind === 'slime' || e.kind === 'king') { const kg = e.kind === 'king', big = kg ? 3.4 : 1, sq = e.ground ? 1 + Math.sin(e.t * 8) * .06 : .9, c = kg ? '#3a7aff' : e.c; g.scale(1.5 * big, 1.5 * sq * big); g.globalAlpha = .82; g.fillStyle = c; g.beginPath(); g.roundRect(-11, -16, 22, 16, [9, 9, 3, 3]); g.fill(); g.globalAlpha = 1; g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1; g.stroke(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.roundRect(-7, -14, 5, 3, 1.5); g.fill(); r('#1a1a2a', -5, -9, 3, 3); r('#1a1a2a', 3, -9, 3, 3); r('rgba(255,255,255,.7)', -5, -9, 1, 1); r('rgba(255,255,255,.7)', 3, -9, 1, 1); if (kg) { r('#ffd23f', -6, -21, 12, 4); r('#ffd23f', -6, -24, 2, 3); r('#ffd23f', -1, -25, 2, 4); r('#ffd23f', 4, -24, 2, 3); r('#ff3a5a', -1, -20, 2, 2); r('#c89a1a', -6, -18, 12, 1); } }
    else if (e.kind === 'zombie' || e.kind === 'skeleton') { g.scale(f * 1.5, 1.5); const w = Math.sin(e.t * 9), sk = e.kind === 'skeleton'; const body = sk ? '#e0d8c0' : '#5a6a3a', head = sk ? '#e8e0c8' : '#8aaa6a'; r(sk ? '#c8c0a8' : '#3a4a2a', -5, -9 + w, 4, 9 - w); r(sk ? '#c8c0a8' : '#3a4a2a', 1, -9 - w, 4, 9 + w); r(body, -5, -21, 10, 13); if (sk) { r('#5a5248', -4, -19, 8, 1); r('#5a5248', -4, -15, 8, 1); } r(head, -4, -29, 9, 9); r(sk ? '#1a1a1a' : '#c8203a', 1, -26, 2, 2); r(head, 3, -19, 9, 3); if (!sk) r('#4a2a1a', -5, -30, 10, 3); }
    else if (e.kind === 'bat') { const fl = Math.sin(e.t * 20) * 4; g.scale(1.5, 1.5); r('#3a2a3a', -3, -4, 6, 6); r('#4a3a4a', -10, -4 - fl, 7, 3); r('#4a3a4a', 3, -4 - fl, 7, 3); r('#ff3a3a', -2, -2, 1, 1); r('#ff3a3a', 1, -2, 1, 1); }
    else if (e.kind === 'imp') { g.scale(f * 1.5, 1.5); r('#c8302a', -4, -18, 8, 10); r('#e8402a', -4, -24, 8, 7); r('#2a0a0a', -6, -27, 2, 4); r('#2a0a0a', 4, -27, 2, 4); r('#ffd23f', 1, -22, 2, 2); r('#8a1a1a', -9, -18 + Math.sin(e.t * 14) * 2, 5, 4); r('#8a1a1a', 4, -18 - Math.sin(e.t * 14) * 2, 5, 4); }
    else if (e.kind === 'stalker') { g.scale(f * 1.5, 1.5); const w = Math.sin(e.t * 12); r('#2a5a2a', -4, -9 + w, 3, 9); r('#2a5a2a', 1, -9 - w, 3, 9); r('#3a8a3a', -5, -20, 10, 12); r('#5ab04a', -4, -26, 10, 7); r('#ffe03a', 3, -24, 2, 2); r('#2a5a2a', 5, -17, 6, 2); r('#1a3a1a', -8, -18, 3, 8); r('#7ad84a', -5, -20, 2, 12); }
    else if (e.kind === 'thorn') { const fl = Math.sin(e.t * 22) * 4; g.scale(1.5, 1.5); r('#2a6a2a', -4, -4, 8, 7); r('#5ab04a', -12, -5 - fl, 8, 3); r('#5ab04a', 4, -5 - fl, 8, 3); r('#a0e050', -12, -5 - fl, 1, 3); r('#a0e050', 11, -5 - fl, 1, 3); r('#ff3a5a', -2, -2, 1, 1); r('#ff3a5a', 1, -2, 1, 1); r('#a0e050', -1, 3, 2, 3); }
    else if (e.kind === 'guardian') { g.scale(f * 1.5, 1.5); const w = Math.sin(e.t * 7); r('#7a5a20', -5, -9 + w, 4, 9); r('#7a5a20', 1, -9 - w, 4, 9); r('#a07a30', -7, -22, 14, 14); r('#c8a050', -6, -21, 12, 2); r('#a07a30', -5, -29, 10, 8); r('#ff6a2a', -3, -26, 2, 2); r('#ff6a2a', 2, -26, 2, 2); r('#6a4a18', -10, -21, 3, 10); r('#6a4a18', 7, -21, 3, 10); r('#ffd23f', -1, -17, 2, 4); }
    else if (e.kind === 'sunspirit') { g.scale(1.6, 1.6); g.fillStyle = 'rgba(255,190,60,.35)'; g.beginPath(); g.arc(0, -2, 11, 0, 7); g.fill(); g.fillStyle = '#ffb02e'; g.beginPath(); g.arc(0, -2, 6, 0, 7); g.fill(); g.fillStyle = '#fff2a0'; g.beginPath(); g.arc(0, -3, 3, 0, 7); g.fill(); for (let i = 0; i < 6; i++) { const a = e.t * 2 + i * 1.047; r('#ffd23f', Math.cos(a) * 9 - 1, Math.sin(a) * 9 - 3, 2, 2); } }
    else if (e.kind === 'weaver') { g.scale(2.4, 2.4); const lg = Math.sin(e.t * (e.m === 'crawl' ? 10 : 4)) * 2, eye = e.rage ? '#ff3a3a' : '#ff9a3a';
      g.strokeStyle = '#2a1a30'; g.lineWidth = 2; for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const ox = s * (3 + i * 2), k = (i % 2 ? lg : -lg) * s; g.beginPath(); g.moveTo(ox, 0); g.lineTo(ox + s * 6, -7 + k); g.lineTo(ox + s * 10, 6 + k * .5); g.stroke(); }
      g.fillStyle = '#3a2048'; g.beginPath(); g.ellipse(0, -2, 10, 7, 0, 0, 7); g.fill(); g.fillStyle = '#c89a30'; g.fillRect(-1, -8, 2, 10); g.fillRect(-5, -4, 10, 2); g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(-3, -5, 5, 2, 0, 0, 7); g.fill();
      g.fillStyle = '#2a1430'; g.beginPath(); g.ellipse(0, 6, 5, 3.5, 0, 0, 7); g.fill(); for (const [x, y] of [[-3, 5], [-1, 4], [1, 4], [3, 5], [-2, 7], [2, 7]]) r(eye, x - .5, y - .5, 1, 1); r('#e8e0c8', -2, 9, 1, 2); r('#e8e0c8', 1, 9, 1, 2);
      if (e.rage) { g.fillStyle = 'rgba(255,60,60,.18)'; g.beginPath(); g.arc(0, 0, 14, 0, 7); g.fill(); } }
    else if (e.kind === 'spiderling') { g.scale(f * 1.5, 1.5); const lg = Math.sin(e.t * 18); g.strokeStyle = '#2a1a30'; g.lineWidth = 1; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(s * i, -3); g.lineTo(s * (4 + i), -6 + (i % 2 ? lg : -lg)); g.lineTo(s * (6 + i), 0); g.stroke(); } r('#4a2a58', -4, -6, 8, 5); r('#c89a30', -1, -6, 2, 4); r('#ff6a3a', 3, -5, 1, 1); }
    else if (e.kind === 'web') { g.strokeStyle = 'rgba(240,240,250,.9)'; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * 1.047 + e.t * 3; g.moveTo(0, 0); g.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); } g.stroke(); g.beginPath(); g.arc(0, 0, 5, 0, 7); g.stroke(); }
    else if (e.kind === 'dart') { g.scale(Math.sign(e.vx) || 1, 1); r('#6a4a18', -10, -1, 16, 2); r('#c8c8d0', 6, -2, 4, 4); r('#5ab04a', -12, -3, 3, 6); }
    else if (e.kind === 'fb') { g.fillStyle = e.bone ? '#e8e0c8' : '#ff8a1a'; g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fill(); g.fillStyle = e.bone ? '#1a1a1a' : '#ffe680'; g.beginPath(); g.arc(0, 0, 4, 0, 7); g.fill(); }
    else if (e.kind === 'eye' || e.kind === 'watcher') { const s = e.kind === 'watcher' ? 4.2 : 1.5, a = Math.atan2(tp.y - 1.4 - e.y, tp.x - e.x); g.scale(s, s); g.rotate(a); r('#c8203a', -14, -2, 6, 1); r('#c8203a', -16, 2, 7, 1); r('#a01a2a', -12, -4, 4, 1); g.fillStyle = '#e8e8e8'; g.beginPath(); g.arc(0, 0, 7, 0, 7); g.fill(); g.fillStyle = '#c8203a'; g.fillRect(-2, -6, 1, 3); g.fillRect(-4, 3, 2, 1); g.fillStyle = e.rage ? '#ff3a2a' : '#3a6aaa'; g.beginPath(); g.arc(3, 0, 3.6, 0, 7); g.fill(); g.fillStyle = '#0a0a0a'; g.beginPath(); g.arc(4, 0, 1.8, 0, 7); g.fill(); if (e.rage) { g.fillStyle = '#7a0a1a'; for (let i = 0; i < 5; i++) g.fillRect(i * 1.5, 3, 1, 2 + (i % 2)); } }
    else if (e.kind === 'bone') { g.scale(3.6, 3.6); r('#e8e0c8', -9, -10, 18, 14); r('#e8e0c8', -6, 4, 12, 5); r('#1a1a1a', -6, -5, 5, 5); r('#1a1a1a', 1, -5, 5, 5); r(e.rage ? '#ff3a2a' : '#7ae0ff', -4, -3, 2, 2); r(e.rage ? '#ff3a2a' : '#7ae0ff', 3, -3, 2, 2); r('#1a1a1a', -1, 1, 2, 2); for (let i = 0; i < 4; i++) r('#c8c0a8', -5 + i * 3, 5, 1, 4); for (const k of [-1, 1]) { const hx = k * 16 + Math.sin(e.t * 3 + k) * 3, hy = 6 + Math.cos(e.t * 2 + k) * 4; r('#e8e0c8', hx - 4, hy - 3, 8, 6); r('#c8c0a8', hx - 4, hy + 3, 2, 3); r('#c8c0a8', hx, hy + 3, 2, 3); } }
    else if (e.kind === 'ember') { g.scale(3.8, 3.8); g.fillStyle = '#ff6a1a'; g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fill(); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, 6 + Math.sin(e.t * 9), 0, 7); g.fill(); for (let i = 0; i < 8; i++) { const a = i * .785 + e.t * 2; g.fillStyle = i % 2 ? '#ff3a1a' : '#ff8a1a'; g.fillRect(Math.cos(a) * 11 - 2, Math.sin(a) * 11 - 2, 4, 4); } r('#2a0a0a', -4, -2, 3, 3); r('#2a0a0a', 2, -2, 3, 3); r(e.rage ? '#fff' : '#ff3a1a', -3, -1, 1, 1); r(e.rage ? '#fff' : '#ff3a1a', 3, -1, 1, 1); }
    g.restore(); g.filter = 'none';
    if (!KIND[e.kind].boss && !KIND[e.kind].proj && e.hp < e.max) { const w = 28; g.fillStyle = '#1a1a1a'; g.fillRect(X - w / 2, Y + 4, w, 5); g.fillStyle = '#3ad84a'; g.fillRect(X - w / 2, Y + 4, w * Math.max(0, e.hp / e.max), 5); }
  }
  function drawProjs(g) {
    for (const p of projs) {
      const X = sx(p.x), Y = sy(p.y), a = Math.atan2(p.vy, p.vx); g.save(); g.translate(X, Y); g.rotate(a);
      const r = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      if (p.k === 'arrow' || p.k === 'farrow') { r('#b07a42', -12, -1, 16, 2); r(p.k === 'farrow' ? '#ff8a1a' : '#c8c8c8', 4, -2, 5, 4); r('#e8e8e8', -14, -3, 4, 6); if (p.k === 'farrow') r('#ffd23f', 6, -1, 4, 2); }
      else if (p.k === 'bullet') r('#e8e8e8', -4, -1.5, 8, 3);
      else if (p.k === 'gel') { r('#3aa0ff', -5, -4, 10, 8); r('#7ac8ff', -2, -3, 3, 2); }
      else if (p.k === 'knife') { r('#c8c8d0', -6, -1, 10, 2); r('#5a3616', -8, -1, 3, 2); }
      else if (p.k === 'boom') { g.rotate(anim * 20); g.strokeStyle = p.c || '#b07a42'; g.lineWidth = 4; g.beginPath(); g.moveTo(-8, 6); g.lineTo(0, -6); g.lineTo(8, 6); g.stroke(); }
      else { const c = { spark: '#ff9a3a', missile: '#5ad8ff', water: '#3a8aff', skull: '#e8e0c8', flame: '#ff6a1a', beam: '#7ae0ff', star: '#ffe680' }[p.k] || '#fff'; g.fillStyle = c; g.shadowColor = c; g.shadowBlur = 14; g.beginPath(); g.arc(0, 0, p.k === 'beam' ? 7 : p.k === 'star' ? 8 : 6, 0, 7); g.fill(); g.shadowBlur = 0; if (p.k === 'skull') { r('#1a1a1a', -3, -3, 2, 2); r('#1a1a1a', 1, -3, 2, 2); } if (p.k === 'beam') { g.globalAlpha = .5; r(c, -20, -4, 20, 8); } }
      g.restore();
    }
  }
  let lc = null, lcx = null, lid = null;
  function drawLight(g) {
    if (!lc || lc.width !== lw || lc.height !== lh) { lc = document.createElement('canvas'); lc.width = lw; lc.height = lh; lcx = lc.getContext('2d'); lid = lcx.createImageData(lw, lh); }
    const d = lid.data; for (let k = 0, n = lw * lh; k < n; k++) { const L = light[k] > 1 ? 1 : light[k]; d[k * 4 + 3] = (1 - L) * 247; }
    lcx.putImageData(lid, 0, 0);
    g.save(); g.imageSmoothingEnabled = true; g.drawImage(lc, Math.round(lx0 * TS - cam.x), Math.round(ly0 * TS - cam.y), lw * TS, lh * TS); g.restore();
    if (torchL.length || glowL.length) { g.save(); g.globalCompositeOperation = 'lighter'; const ts = glowSprite('255,150,60'); for (let i = 0; i < torchL.length; i += 2) { const x = torchL[i], y = torchL[i + 1], r = 120 * (1 + Math.sin(anim * 9 + x) * .06); g.drawImage(ts, x - r, y - r, r * 2, r * 2); }
      for (let i = 0; i < glowL.length; i += 3) { const [c, rr] = GLOWC[glowL[i + 2]], r = rr * (1 + Math.sin(anim * 2 + glowL[i]) * .05); g.drawImage(glowSprite(c), glowL[i] - r, glowL[i + 1] - r, r * 2, r * 2); } g.restore(); }
    for (let i = 0; i < glints.length; i += 4) { if (lightAt(glints[i + 2], glints[i + 3]) < .12) continue; const x = glints[i], y = glints[i + 1], a = .5 + Math.sin(anim * 6) * .5; g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(x - 1, y - 4, 2, 8); g.fillRect(x - 4, y - 1, 8, 2); }
  }
  const SLOT = 46, HB = i => ({ x: 14 + i * (SLOT + 4), y: 12, w: SLOT, h: SLOT });
  function slot(g, b, s, on) {
    g.fillStyle = on ? 'rgba(70,100,200,.9)' : 'rgba(46,62,150,.72)'; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(b.x + 3, b.y + 3, b.w - 6, (b.h - 6) / 2);
    g.strokeStyle = on ? '#ffd23f' : 'rgba(150,170,255,.45)'; g.lineWidth = on ? 3 : 1.5; g.beginPath(); g.roundRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1, 7); g.stroke();
    g.strokeStyle = 'rgba(8,10,30,.85)'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2, 8); g.stroke();
    if (s) { const it = IT[s.id]; if (it && it.r >= 2) { g.fillStyle = RAR[it.r] + '22'; g.beginPath(); g.arc(b.x + b.w / 2, b.y + b.h / 2, b.w * .36, 0, 7); g.fill(); }
      icon(g, s.id, b.x + b.w / 2, b.y + b.h / 2 - 1, 1.6 * b.w / SLOT); if (s.n > 1) { g.font = `16px ${PXF}`; g.textAlign = 'right'; g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 3; g.strokeText(s.n, b.x + b.w - 4, b.y + b.h - 6); g.fillText(s.n, b.x + b.w - 4, b.y + b.h - 6); } }
  }
  function outlined(g, t, x, y, size, c, al = 'left') { t = String(t).replace(/f(?=[ilt])/g, 'f\u200c'); g.font = `${size}px ${PXF}`; g.textAlign = al; g.textBaseline = 'alphabetic'; g.strokeStyle = '#000'; g.lineWidth = 3; g.lineJoin = 'round'; g.strokeText(t, x, y); g.fillStyle = c; g.fillText(t, x, y); }
  // the pause button sits 12-52px from the screen's top-left corner, so the hotbar moves over just enough to clear it
  const OX = () => { const v = K.view; return Math.max(0, v.x0 + 2); };
  // the HUD hugs the real top of the screen, which sits above y=0 on tall screens (tablets, 4:3 windows)
  const TOP = () => Math.min(0, K.view.y0);
  const cover = g => { const v = K.view; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); };
  // phones held upright get a "turn sideways" card: the world would be a thin strip with tiny buttons
  // a phone or tablet: a coarse pointer with no hover, a mobile browser, or an iPad that reports itself as a Mac
  const MOBILE = (() => { try { const ua = navigator.userAgent || ''; return (matchMedia('(pointer: coarse)').matches && matchMedia('(hover: none)').matches) || /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); } catch (e) { return false; } })();
  const upright = () => touch && innerHeight > innerWidth * 1.05;
  function hud(g) {
    const v = K.view, R = v.x1 - 26;
    g.save(); g.translate(OX(), TOP());
    for (let i = 0; i < 10; i++) { const b = HB(i); slot(g, i === sel && !invOpen ? { x: b.x - 3, y: b.y - 3, w: b.w + 6, h: b.h + 6 } : b, ch.inv[i], i === sel); g.font = `12px ${PXF}`; g.fillStyle = 'rgba(255,255,255,.8)'; g.textAlign = 'left'; g.fillText(String((i + 1) % 10), HB(i).x + 4, HB(i).y + 13); }
    if (P.potCd > 0) { const py = invOpen ? 372 : 108; g.fillStyle = 'rgba(10,14,40,.65)'; g.beginPath(); g.roundRect(10, py - 22, 84, 40, 10); g.fill(); g.save(); g.globalAlpha = .55; icon(g, 'potion', 32, py - 2, 1.5); g.restore(); outlined(g, Math.ceil(P.potCd) + 's', 52, py + 5, 18, '#ffb0b8'); }
    const s = ch.inv[sel]; if (s && !invOpen) { const it = IT[s.id]; outlined(g, nameOf(s) + ((it.bow || it.gun) && !it.free ? ` · ${[...ch.inv, ...amS()].reduce((a, q) => a + (q && IT[q.id].ammo === (it.bow ? 'arrow' : 'shot') ? q.n : 0), 0)} ${it.bow ? 'arrows' : 'shots'}` : it.rod ? ` · ${ch.inv.reduce((a, q) => a + (q && IT[q.id].bait ? q.n : 0), 0)} bait` : ''), 16, 78, 18, RAR[it.r || 0]); }
    g.restore();
    g.save(); g.translate(0, TOP());
    const hearts = ch.max / 20; for (let i = 0; i < hearts; i++) { const row = Math.floor(i / 10), col = i % 10, x = R - (Math.min(10, hearts) - col) * 26, y = 20 + row * 24, full = clamp((P.hp - i * 20) / 20, 0, 1); heart(g, x, y, '#3a0a0a'); if (full > 0) { g.save(); g.beginPath(); g.rect(x - 12, y - 12, 24 * full, 24); g.clip(); heart(g, x, y, '#e8202a'); g.restore(); } }
    const hy = 20 + Math.ceil(hearts / 10) * 24 + 4; for (let i = 0; i < maxMana() / 20; i++) { const x = R, y = hy + i * 20; g.fillStyle = '#0a1a3a'; g.fillRect(x - 8, y - 8, 16, 16); const f = clamp((P.mp - i * 20) / 20, 0, 1); g.fillStyle = '#3a7aff'; g.fillRect(x - 8, y + 8 - 16 * f, 16, 16 * f); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(x - 6, y - 6, 4, 4); }
    outlined(g, `Life ${Math.ceil(P.hp)}/${ch.max}${def() ? '  ·  Defense ' + def() : ''}`, R - 24, hy + 6, 15, '#fff', 'right');
    const d = time % 1, hh = Math.floor((d * 24 + 6) % 24), mm = Math.floor((d * 24 * 60) % 60); outlined(g, `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}${night() ? ' · night' : ''}  ·  depth ${Math.max(0, Math.round(P.y - surf[clamp(Math.floor(P.x), 0, WW - 1)]))}`, R - 24, hy + 26, 14, '#cfd8ff', 'right');
    if (online() && MP.code) outlined(g, 'WORLD CODE  ' + MP.code, R - 24, hy + 54, 20, '#ffe680', 'right');
    { const lines = (P.burn > 0 ? [[`On fire ${Math.ceil(P.burn)}s`, '#ff9a3a']] : []).concat(Object.entries(P.buffs || {}).map(([k, t]) => [`${BUFFS[k] ? BUFFS[k].n : k} ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`, '#ffe680'])); if (minions.length) lines.push([`Minions ${minions.length}/${maxMinions()}`, '#c87aff']);
      lines.forEach(([t, c], i) => outlined(g, t, R - 24, hy + (online() && MP.code ? 80 : 50) + i * 20, 15, c, 'right')); }   // under the hearts: what friends type to join
    if (msg && !invOpen) { const a = Math.min(1, msg.k * 5, (msg.d - msg.k) * 2); g.globalAlpha = Math.max(0, a); outlined(g, msg.t, 640, 140, 22, msg.c, 'center'); g.globalAlpha = 1; }
    if (hint && !invOpen) { g.font = `17px ${PXF}`; g.textAlign = 'center'; const w = g.measureText(hint).width + 30; g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(640 - w / 2, 160, w, 28); g.fillStyle = '#fff'; g.fillText(hint, 640, 180); }
    g.restore();
    const B = ents.find(e => KIND[e.kind].boss); if (B) { const w = 600, by = Math.max(680, v.y1 - 40); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(340, by, w, 22); g.fillStyle = '#c8203a'; g.fillRect(342, by + 2, (w - 4) * Math.max(0, B.hp / B.max), 18); outlined(g, BOSSES[B.kind].n, 640, by - 6, 18, '#fff', 'center'); }
    if (!K.save.noPops) for (const p of pops) { g.globalAlpha = Math.max(0, 1 - p.t); outlined(g, p.s, scrX(sx(p.x)), scrY(sy(p.y)) - p.t * 30, 18, p.c, 'center'); } g.globalAlpha = 1;
  }
  function heart(g, x, y, c) { g.fillStyle = c; const r = (a, b, w, h) => g.fillRect(x + a, y + b, w, h); r(-10, -6, 8, 8); r(2, -6, 8, 8); r(-11, -3, 22, 7); r(-8, 4, 16, 3); r(-5, 7, 10, 3); r(-2, 10, 4, 2); if (c !== '#3a0a0a') { g.fillStyle = 'rgba(255,255,255,.5)'; r(-8, -4, 3, 3); } }
  // phone buttons hug the real screen edges, whatever the screen's shape
  const TB = () => { const v = K.view, y = v.y1 - 130; return { left: { x: v.x0 + 24, y, w: 100, h: 100 }, right: { x: v.x0 + 140, y, w: 100, h: 100 }, jump: { x: v.x1 - 124, y, w: 100, h: 100 }, inv: { x: v.x1 - 124, y: y - 120, w: 100, h: 90 } }; };
  function touchUI(g) { for (const [k, b] of Object.entries(TB())) { g.fillStyle = 'rgba(40,60,140,.55)'; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 18); g.fill(); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.stroke(); g.font = `${k === 'inv' ? 20 : 34}px ${PXF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText({ left: '◀', right: '▶', jump: '▲', inv: 'BAG' }[k], b.x + b.w / 2, b.y + b.h / 2); g.textBaseline = 'alphabetic'; } }
  const IB = i => ({ x: 14 + (i % 10) * (SLOT + 4), y: 12 + Math.floor(i / 10) * (SLOT + 4), w: SLOT, h: SLOT });
  const ARMS = i => ({ x: 524, y: 12 + i * 50, w: SLOT, h: SLOT }), ACCB = i => ({ x: 14 + i * 50, y: 284, w: SLOT, h: SLOT });
  let hoverGear = null;
  let cscroll = 0, cpy = 0, drag = null, picked = -1;
  const CY = 352, CN = () => clamp(Math.floor((K.view.y1 - TOP() - CY - 92) / 50), 3, 12);   // crafting sits on the left, under the bag, with as many rows as fit
  const CB = i => ({ x: 18, y: CY + 44 + (i - cscroll) * 50, w: 360, h: 44 });
  function craftList() { return RECIPES.filter(r => (!r[3] || stationNear(STN[r[3]])) && canCraft(r)); }
  /* touch bag: one full-screen layout with big slots, big craft rows you can drag to scroll, and a close button.
     Everything is measured from the real screen edges so it fits phones, tablets and odd shapes. */
  const TS_ = 64, TG = 6, ROW = 84;
  const TL = () => {
    const v = K.view, sc = innerWidth / (v.x1 - v.x0), top = v.y0 + 14, left = v.x0 + Math.max(16, 112 / sc), gw = 10 * (TS_ + TG) - TG, cx = left + gw + 22, cw = Math.min(820, v.x1 - 16 - cx), ly = top + 76;
    return { left, top, gw, cx, cw, slot: i => ({ x: left + (i % 10) * (TS_ + TG), y: top + Math.floor(i / 10) * (TS_ + TG), w: TS_, h: TS_ }), arm: { x: left, y: top + 4 * (TS_ + TG) + 12, w: TS_, h: TS_ },
      list: { x: cx, y: ly, w: cw - 56, h: v.y1 - 14 - ly }, close: { x: cx + cw - 92, y: top, w: 92, h: 62 }, up: { x: cx + cw - 48, y: ly, w: 48, h: 90 }, dn: { x: cx + cw - 48, y: v.y1 - 90 - 70 / sc, w: 48, h: 90 } };  // kept clear of the sound button in the corner
  };
  const cmax = () => { const L = TL(); return Math.max(0, craftList().length * ROW - L.list.h); };
  const crow = (L, y) => Math.floor((y - L.list.y + cpy) / ROW);
  function fitText(g, t, w) { if (g.measureText(t).width <= w) return t; while (t.length > 3 && g.measureText(t + '…').width > w) t = t.slice(0, -1); return t + '…'; }
  const BX = L => ({ acc: [1, 2, 3].map(i => ({ ...L.slot(30 + i), y: L.arm.y })), pet: { ...L.slot(34), y: L.arm.y }, am: [6, 7, 8, 9].map(i => ({ ...L.slot(30 + i), y: L.arm.y })),
    btn: (() => { const v = K.view, n = 6, gap = 8, w = (L.gw - gap * (n - 1)) / n, y = v.y1 - 82; return [['drop', 'DROP'], ['sort', 'SORT'], ['book', 'BOOK'], ['house', 'HOUSE'], ['set', 'SETTINGS'], ['quit', 'QUIT']].map(([k, l], i) => ({ k, l, x: L.left + i * (w + gap), y, w, h: 60 })); })() });
  function bagExtras(g, L) { const X = BX(L), A = ch.acc || [];
    X.acc.forEach((b, i) => { slot(g, b, A[i] ? { id: A[i], n: 1 } : null, false); if (!A[i]) outlined(g, 'Acc', b.x + b.w / 2, b.y + b.h / 2 + 6, 15, 'rgba(255,255,255,.45)', 'center'); });
    slot(g, X.pet, ch.pet ? { id: ch.pet, n: 1 } : null, false); if (!ch.pet) outlined(g, 'Pet', X.pet.x + X.pet.w / 2, X.pet.y + X.pet.h / 2 + 6, 15, 'rgba(255,255,255,.45)', 'center');
    const M = amS(); X.am.forEach((b, i) => { slot(g, b, M[i], false); if (!M[i]) outlined(g, 'Ammo', b.x + b.w / 2, b.y + b.h / 2 + 6, 13, 'rgba(255,230,128,.5)', 'center'); });
    for (const b of X.btn) { const hot = b.k === 'drop' && (held || picked >= 0); g.fillStyle = b.k === 'quit' ? 'rgba(150,40,50,.85)' : hot ? 'rgba(200,150,40,.9)' : 'rgba(40,60,140,.9)'; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 12); g.fill(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.stroke(); outlined(g, b.l, b.x + b.w / 2, b.y + b.h / 2 + 8, b.l.length > 6 ? 17 : 20, '#fff', 'center'); } }
  // a slot that holds one kind of thing: whatever is held or picked goes in if it fits, else the slot's item comes out
  function bagSlot(get, set, ok, what) { const cur = get(), src = held || (picked >= 0 && ch.inv[picked]) || null;
    if (src) { if (!ok(src)) { say(`Only ${what} go there.`, 1.6); return; } const back = cur; set(src); if (held) held = back; else { ch.inv[picked] = back; picked = -1; } K.sfx(500, .04, 'square', .04); return; }
    if (cur) { held = cur; set(null); } }
  function bagExtraDown(L, x, y) { const X = BX(L);
    for (let i = 0; i < 3; i++) if (inB(X.acc[i], x, y)) { ch.acc = ch.acc || [null, null, null]; bagSlot(() => ch.acc[i] ? { id: ch.acc[i], n: 1 } : null, s => { ch.acc[i] = s ? s.id : null; }, s => IT[s.id].acc && !ch.acc.some((a, j) => a === s.id && j !== i), 'accessories (one of each)'); return true; }
    if (inB(X.pet, x, y)) { bagSlot(() => ch.pet ? { id: ch.pet, n: 1 } : null, s => { ch.pet = s ? s.id : null; myPet = null; }, s => !!IT[s.id].pet, 'pets'); return true; }
    for (let i = 0; i < 4; i++) if (inB(X.am[i], x, y)) { const M = amS(); bagSlot(() => M[i], s => { M[i] = s; }, s => !!IT[s.id].ammo, 'arrows and shots'); return true; }
    for (const b of X.btn) if (inB(b, x, y)) { if (b.k === 'drop') { if (!held && picked >= 0 && ch.inv[picked]) { held = ch.inv[picked]; ch.inv[picked] = null; picked = -1; } throwHeld(); } else if (b.k === 'sort') sortBag(); else if (b.k === 'book') openBook(); else if (b.k === 'house') checkHousing(); else if (b.k === 'set') openSettings(); else if (b.k === 'quit') quitToMenu(); return true; }
    return false; }
  function bagTouch(g) {
    const L = TL(), list = craftList(), v = K.view;
    g.fillStyle = 'rgba(6,10,30,.78)'; cover(g);
    const panel = (x, y, w, h) => { g.fillStyle = 'rgba(22,30,78,.92)'; g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill(); g.strokeStyle = 'rgba(150,170,255,.35)'; g.lineWidth = 2; g.stroke(); };
    panel(L.left - 10, L.top - 8, L.gw + 20, v.y1 - 6 - L.top); panel(L.cx - 8, L.top - 8, L.cw + 16, v.y1 - 6 - L.top);
    for (let i = 0; i < 40; i++) slot(g, L.slot(i), ch.inv[i], i === picked || (i === sel && picked < 0));
    g.font = `13px ${PXF}`; g.fillStyle = 'rgba(255,255,255,.75)'; g.textAlign = 'left'; for (let i = 0; i < 10; i++) g.fillText(String((i + 1) % 10), L.slot(i).x + 5, L.slot(i).y + 15);
    bagExtras(g, L); slot(g, L.arm, gear().body ? { id: gear().body, n: 1 } : gear().head ? { id: gear().head, n: 1 } : gear().legs ? { id: gear().legs, n: 1 } : null, false);
    const ax = L.arm.x + TS_ + 16, show = held || (picked >= 0 && ch.inv[picked]);
    outlined(g, anyGear() ? `Armor: ${SLOTS.filter(k => gear()[k]).length} of 3 pieces (${def()} defense)` : 'Armor', L.left, L.arm.y + TS_ + 28, 18, '#cfd8ff');
    if (show) { const it = IT[show.id]; outlined(g, fitText(g, (held ? 'Holding ' : '') + it.n + (it.melee ? ` · ${it.melee} melee` : it.bow ? ` · ${it.bow} ranged` : it.gun ? ` · ${it.gun} ranged` : it.magic ? ` · ${it.magic} magic` : it.armor ? ` · ${it.armor} defense` : it.pick ? ` · ${Math.round(it.pick * 35)}% pick` : it.axe ? ` · ${Math.round(it.axe * 35)}% axe` : ''), L.gw - TS_ - 20), L.left, L.arm.y + TS_ + 54, 20, RAR[it.r || 0]); }
    let y = L.arm.y + TS_ + 100; const locked = [...new Set(RECIPES.filter(r => r[3] && !stationNear(STN[r[3]])).map(r => IT[r[3]].n))];
    outlined(g, 'Crafting', L.cx + 8, L.top + 42, 30, '#ffe680');
    const c = L.close; g.fillStyle = 'rgba(200,50,60,.9)'; g.beginPath(); g.roundRect(c.x, c.y, c.w, c.h, 12); g.fill(); outlined(g, '✕', c.x + c.w / 2, c.y + 44, 34, '#fff', 'center');
    if (cpy > cmax()) cpy = cmax();
    const b = L.list; g.save(); g.beginPath(); g.rect(b.x - 4, b.y, b.w + 8, b.h); g.clip();
    if (!list.length) outlined(g, 'Nothing yet. Get wood from trees.', b.x + 8, b.y + 40, 20, '#fff');
    for (let i = Math.max(0, Math.floor(cpy / ROW)); i < list.length; i++) { const r = list[i], ry = b.y + i * ROW - cpy; if (ry > b.y + b.h) break; const ok = canCraft(r), it = IT[r[0]];
      g.fillStyle = ok ? (drag && drag.row === i && !drag.moved ? 'rgba(90,130,230,.95)' : 'rgba(40,60,140,.9)') : 'rgba(30,30,50,.8)'; g.beginPath(); g.roundRect(b.x, ry + 3, b.w, ROW - 8, 10); g.fill();
      icon(g, r[0], b.x + 38, ry + ROW / 2 - 1, 2.2);
      g.font = `24px ${PXF}`; g.textAlign = 'left'; g.fillStyle = ok ? RAR[it.r || 0] : '#8a8aa0'; g.fillText(fitText(g, it.n + (r[1] > 1 ? ' x' + r[1] : ''), b.w - 180), b.x + 76, ry + 36);
      g.font = `18px ${PXF}`; g.fillStyle = ok ? '#cfd8ff' : '#6a6a80'; g.fillText(fitText(g, Object.entries(r[2]).map(([k, n]) => `${n} ${IT[k].n} (${count(k)})`).join(', '), b.w - 90), b.x + 76, ry + 62);
      if (ok) { g.font = `20px ${PXF}`; g.textAlign = 'right'; g.fillStyle = '#ffe680'; g.fillText('MAKE', b.x + b.w - 14, ry + 36); } }
    g.restore();
    const mxs = cmax(); if (mxs > 0) { for (const [k, a] of [['up', '▲'], ['dn', '▼']]) { const q = L[k], on = k === 'up' ? cpy > 0 : cpy < mxs; g.fillStyle = on ? 'rgba(60,90,190,.95)' : 'rgba(40,50,90,.6)'; g.beginPath(); g.roundRect(q.x, q.y, q.w, q.h, 10); g.fill(); outlined(g, a, q.x + q.w / 2, q.y + q.h / 2 + 10, 28, on ? '#fff' : '#6a7090', 'center'); }
      const tr = L.list, tl = L.dn.y - L.up.y - 110, th = Math.max(40, tl * tr.h / (tr.h + mxs)), ty = L.up.y + 100 + (tl - th) * (cpy / mxs); g.fillStyle = 'rgba(150,170,255,.25)'; g.fillRect(L.up.x + 20, L.up.y + 100, 8, tl); g.fillStyle = 'rgba(200,215,255,.8)'; g.fillRect(L.up.x + 18, ty, 12, th); }
    if (held) icon(g, held.id, mx, my - 40, 2.2);
  }
  // where the open inventory's panels are (in HUD space): clicks there go to the inventory, everywhere else to the world
  const craftH = () => { const n = Math.min(CN(), craftList().length); return Math.max(90, 56 + n * 50 + (craftList().length > CN() ? 30 : 0)); };
  const inPanel = (x, y) => inB({ x: 4, y: 4, w: 576, h: 340 }, x, y) || inB({ x: 582, y: 4, w: 60, h: 232 }, x, y);
  // the crafting wheel: only what you can make right now (materials in your bag, station nearby), scrolled with the mouse wheel
  let cpick = null, cidx = 0;
  function wheelList() { const list = craftList().filter(r => Object.keys(r[2]).some(k => count(k) > 0)).sort((a, b) => RECIPES.indexOf(a) - RECIPES.indexOf(b)); let i = list.indexOf(cpick); if (i < 0) i = clamp(cidx, 0, Math.max(0, list.length - 1)); cidx = i; cpick = list[i] || null; return list; }
  function wheelUI() {
    const v = K.view, cx = v.x1 - 76, top = TOP() + 196, bot = v.y1 - 108, cy = Math.round((top + bot) / 2), big = 66, sm = 44, gap = 52;
    const n = Math.max(1, Math.floor((Math.min(cy - top, bot - cy) - big / 2 - 4) / gap));
    const colB = cy + big / 2 + n * gap + 8;
    return { cx, cy, big, sm, gap, n, book: { x: cx - 56, y: colB + 10, w: 112, h: 32 }, col: { x: cx - 44, y: cy - big / 2 - n * gap - 8, w: 88, h: big + 2 * n * gap + 16 }, mid: { x: cx - big / 2, y: cy - big / 2, w: big, h: big } };
  }
  const inCraft = (x, y) => { if (!invOpen || bag()) return false; const W = wheelUI(); if (inB(W.col, x, y) || inB(W.book, x, y)) return true; return !!cpick && inB(wheelInfo(W, cpick), x, y); };
  const overUI = (x, y) => inPanel(x - OX(), y - TOP()) || ((openCh || shopK) && invOpen && !bag() && inB(CHP, x - OX(), y - TOP())) || (rfOpen && invOpen && inB({ x: CHP.x, y: CHP.y, w: CHP.w, h: 110 }, x - OX(), y - TOP())) || (talk && dlgBox && inB(dlgBox, x, y)) || inCraft(x, y) || (invOpen && !bag() && (inB(QB().sort, x, y) || inB(QB().stack, x, y) || inB(QB().best, x, y) || inB(invBtns().set, x, y) || inB(invBtns().quit, x, y) || inB(invBtns().house, x, y)));
  function wheelInfo(W, r) { const lines = 2 + Object.keys(r[2]).length + (r[3] ? 1 : 0), h = 30 + lines * 22, w = 340; return { x: W.cx - 52 - w, y: clamp(W.cy - h / 2, TOP() + 196, K.view.y1 - 14 - h), w, h }; }
  function craftWheel(g) {
    const list = wheelList(), W = wheelUI(); W.info = cpick ? wheelInfo(W, cpick) : null;
    g.fillStyle = 'rgba(22,30,78,.55)'; g.beginPath(); g.roundRect(W.col.x, W.col.y, W.col.w, W.col.h, 14); g.fill();
    outlined(g, 'Crafting', W.cx, W.col.y - 10, 20, '#ffe680', 'center');
    { const B = W.book; g.fillStyle = hover === 'book' ? 'rgba(90,130,230,.95)' : 'rgba(40,60,140,.9)'; g.beginPath(); g.roundRect(B.x, B.y, B.w, B.h, 8); g.fill(); g.strokeStyle = 'rgba(8,10,30,.85)'; g.lineWidth = 2; g.stroke(); outlined(g, 'Handbook', B.x + B.w / 2, B.y + 22, 16, '#fff', 'center'); }
    if (!list.length) { outlined(g, 'Nothing', W.cx, W.cy - 4, 15, '#cfd8ff', 'center'); outlined(g, 'to craft', W.cx, W.cy + 16, 15, '#cfd8ff', 'center'); return; }
    for (let k = -W.n; k <= W.n; k++) { const i = cidx + k; if (i < 0 || i >= list.length || !k) continue; const d = Math.abs(k), y = W.cy + k * W.gap + Math.sign(k) * (W.big - W.sm) / 2;
      g.globalAlpha = Math.max(.25, 1 - (d - 1) * .2) * (canCraft(list[i]) ? 1 : .45); slot(g, { x: W.cx - W.sm / 2, y: y - W.sm / 2, w: W.sm, h: W.sm }, { id: list[i][0], n: list[i][1] }, false); g.globalAlpha = 1; }
    slot(g, W.mid, { id: cpick[0], n: cpick[1] }, true); if (!canCraft(cpick)) { g.fillStyle = 'rgba(20,10,30,.55)'; g.beginPath(); g.roundRect(W.mid.x, W.mid.y, W.mid.w, W.mid.h, 7); g.fill(); }
    if (cidx > 0) outlined(g, '▲', W.cx, W.col.y + 18, 14, '#cfd8ff', 'center'); if (cidx < list.length - 1) outlined(g, '▼', W.cx, W.col.y + W.col.h - 6, 14, '#cfd8ff', 'center');
    // the middle item: what it is, what it does and what it takes
    const I = W.info, it = IT[cpick[0]]; g.fillStyle = 'rgba(22,30,78,.86)'; g.beginPath(); g.roundRect(I.x, I.y, I.w, I.h, 12); g.fill(); g.strokeStyle = 'rgba(150,170,255,.35)'; g.lineWidth = 2; g.stroke();
    let y = I.y + 30; outlined(g, fitText(g, it.n + (cpick[1] > 1 ? ' x' + cpick[1] : ''), I.w - 24), I.x + 12, y, 18, RAR[it.r || 0]); y += 22;
    const st = statLine(it); g.font = `13px ${PXF}`; outlined(g, fitText(g, st || ' ', I.w - 24), I.x + 12, y, 13, '#cfd8ff'); y += 24;
    for (const [k, q] of Object.entries(cpick[2])) { icon(g, k, I.x + 24, y - 5, .9); outlined(g, fitText(g, `${q} ${IT[k].n} (${count(k)})`, I.w - 60), I.x + 42, y, 14, count(k) >= q ? '#fff' : '#ff8a8a'); y += 22; }
    if (cpick[3]) { outlined(g, (/^[AEIOU]/.test(IT[cpick[3]].n) ? 'At an ' : 'At a ') + IT[cpick[3]].n, I.x + 12, y, 14, '#cfd8ff'); y += 22; }
    outlined(g, canCraft(cpick) ? 'Click to craft' : 'Missing materials', I.x + 12, y, 13, canCraft(cpick) ? (hover === 'cmid' ? '#ffe680' : '#9fb0e8') : '#ff8a8a');
  }
  function wheelDown(x, y) {
    const list = wheelList(), W = wheelUI(); if (inB(W.book, x, y)) { openBook(); return true; } if (!list.length) return inB(W.col, x, y);
    if (inB(W.mid, x, y)) { craft(cpick); return true; }
    for (let k = -W.n; k <= W.n; k++) { const i = cidx + k; if (i < 0 || i >= list.length || !k) continue; const yy = W.cy + k * W.gap + Math.sign(k) * (W.big - W.sm) / 2; if (inB({ x: W.cx - W.sm / 2, y: yy - W.sm / 2, w: W.sm, h: W.sm }, x, y)) { cidx = i; cpick = list[i]; K.sfx(520, .03, 'square', .03); return true; } }
    return inCraft(x, y);
  }
  let mapOpen = false, mapCv = null, mapT = 0, mapZ = 1, mapC = null, mapDrag = null;
  const MAPC = { 1: '#8a5a32', 2: '#4caa2a', 3: '#7a7a84', 4: '#e8904a', 5: '#d8c8b8', 6: '#ffe050', 7: '#7a4e26', 8: '#3a8a2a', 9: '#b07a42', 10: '#ffd23f', 11: '#9a6a3a', 12: '#6a6a74', 13: '#5a6068', 14: '#d8c070', 15: '#ff3a5a',
    16: '#f0f4ff', 17: '#8a5ad8', 18: '#4a4246', 19: '#ff6a2a', 20: '#c89a4a', 21: '#ffd23f', 22: '#c8302a', 23: '#e8e0c8', 24: '#3a4a6a', 25: '#9a5a3a', 26: '#a06c3e', 27: '#a06c3e', 28: '#ffd23f', 29: '#ff8a1a', 30: '#c8303a',
    31: '#80808a', 32: '#c87a42', 33: '#e8c040', 34: '#bfe6ff', 35: '#7a4e26', 36: '#4a3a2a', 37: '#3ac84a', 38: '#6a4a24', 39: '#a07a30', 40: '#ff6a2a', 41: '#c8c8d0', 42: '#2a5ad8', 43: '#e8e8f0', 44: '#c8a060', 45: '#2a1a3a', 46: '#9a6a3a', 47: '#9a6a3a', 48: '#a06c3e', 49: '#f0f6ff', 50: '#8ed0f0', 51: '#2a5e42', 52: '#7a3a9a', 53: '#5a4470', 54: '#e05aff', 55: '#2a9ac8', 56: '#7ae8ff', 57: '#2a9ac8', 58: '#c8e0e8', 59: '#ffffff', 60: '#4a8aff', 61: '#3ad87a', 62: '#ffe8a0', 63: '#4ab0ff', 64: '#5ab0c8', 65: '#5ae0e8', 66: '#c8b8e0' };
  const MAPW = { 1: '#3a2616', 2: '#26262c', 3: '#3a1410', 4: '#1a2236', 5: '#4a3418', 6: '#5a4a2a', 7: '#1e2e18', 8: '#5a3a1e', 9: '#4a4a52', 10: '#52525c', 11: '#7a4a2a', 12: '#9a7a24', 13: '#5a8aa8', 20: '#2a4660', 21: '#2e2238', 22: '#1c2a40', 23: '#4e4266' };
  // the whole world as one pixel per tile, redrawn when the map opens and twice a second while it is open
  function buildMap() {
    if (!mapCv || mapCv.width !== WW || mapCv.height !== WH) { mapCv = document.createElement('canvas'); mapCv.width = WW; mapCv.height = WH; }
    const c = mapCv.getContext('2d'), im = c.createImageData(WW, WH), d = im.data, hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], cache = {};
    const rgb = h => cache[h] || (cache[h] = hx(h));
    const ex = explored && explored.length === WW * WH ? explored : null;
    for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) { const t = tiles[y * WW + x], k = (y * WW + x) * 4; let col;
      if (!ex || !ex[y * WW + x]) col = [0, 0, 0];
      else if (t) col = rgb(MAPC[t] || '#888888');
      else if (liq && liq[y * WW + x]) col = [[0, 0, 0], [42, 90, 216], [255, 110, 30], [230, 165, 40]][lqk[y * WW + x]] || [0, 0, 0];
      else if (PW(walls[y * WW + x])) col = rgb(MAPW[walls[y * WW + x]]);
      else if (y < surf[x]) { const f = y / Math.max(1, surf[x]); col = [Math.round(70 + 80 * f), Math.round(120 + 70 * f), Math.round(190 + 40 * f)]; }
      else if (y >= HELL) col = rgb('#5a1a0a');
      else col = rgb(MAPW[walls[y * WW + x]] || '#0c0a10');
      d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255; }
    c.putImageData(im, 0, 0);
  }
  function reveal(cx, cy, r) { if (!explored || explored.length !== WW * WH) explored = new Uint8Array(WW * WH); const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(WW - 1, Math.ceil(cx + r)), y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(WH - 1, Math.ceil(cy + r)); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) explored[y * WW + x] = 1; }
  let revT = 0;
  function toggleMap() { mapOpen = !mapOpen; mapDrag = null; keys = {}; useHeld = false; if (mapOpen) { buildMap(); mapT = 0; if (!mapC) { mapZ = 1; mapC = [WW / 2, WH / 2]; } } K.sfx(mapOpen ? 520 : 380, .05, 'square', .04); }
  const mapArea = () => { const v = K.view; return { x: v.x0 + 30, y: v.y0 + 78, w: v.x1 - v.x0 - 60, h: v.y1 - v.y0 - 120 }; };
  const mapS = A => Math.min(A.w / WW, A.h / WH) * mapZ;
  function mapGlass(g, x, y, w, h, r, edge) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(40,42,48,.96)'); gr.addColorStop(1, 'rgba(16,17,20,.98)'); g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); g.strokeStyle = edge || 'rgba(255,176,46,.3)'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.roundRect(x + 2, y + 2, w - 4, Math.min(60, h * .4), r); g.fill(); }
  function mtxt(g, s, x, y, size, c, al = 'left') { g.font = `${size}px Bungee, Impact, sans-serif`; g.textAlign = al; g.textBaseline = 'middle'; g.lineWidth = 4; g.strokeStyle = 'rgba(10,6,20,.85)'; g.strokeText(s, x, y); g.fillStyle = c; g.fillText(s, x, y); g.textBaseline = 'alphabetic'; }
  function drawMap(g) {
    if ((mapT += 1 / 60) > .5) { mapT = 0; buildMap(); }
    const v = K.view, A = mapArea(), s = mapS(A);
    g.fillStyle = 'rgba(6,6,10,.75)'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    mapGlass(g, v.x0 + 12, v.y0 + 12, v.x1 - v.x0 - 24, v.y1 - v.y0 - 24, 16);
    mtxt(g, 'WORLD MAP', v.x0 + 80, v.y0 + 44, 26, '#ffb02e');
    const W = worlds()[wslot]; mtxt(g, (W && W.name ? W.name + '  ·  ' : '') + (online() ? 'ONLINE: THE WORLD KEEPS GOING' : 'GAME PAUSED'), v.x0 + 300, v.y0 + 46, 13, online() ? '#5cf28a' : '#cfc8e0');
    mtxt(g, `${keyName(KB().map).toUpperCase()} CLOSE  ·  DRAG TO MOVE  ·  WHEEL TO ZOOM`, v.x1 - 34, v.y0 + 46, 12, '#cfc8e0', 'right');
    mapGlass(g, A.x - 6, A.y - 6, A.w + 12, A.h + 12, 10, 'rgba(255,176,46,.45)');
    const ox = A.x + A.w / 2 - mapC[0] * s, oy = A.y + A.h / 2 - mapC[1] * s, X = tx => ox + tx * s, Y = ty => oy + ty * s;
    g.save(); g.beginPath(); g.rect(A.x, A.y, A.w, A.h); g.clip(); g.imageSmoothingEnabled = false; g.drawImage(mapCv, ox, oy, WW * s, WH * s);
    // the layers, faintly marked down the left edge
    for (const [ty, nm] of [[0, 'SKY'], [surf[clamp(Math.floor(mapC[0]), 0, WW - 1)] + 6, 'UNDERGROUND'], [DY(110), 'CAVERNS'], [HELL, 'UNDERWORLD']]) { const yy = Y(ty); if (yy > A.y - 4 && yy < A.y + A.h - 10) { g.fillStyle = 'rgba(255,176,46,.25)'; g.fillRect(A.x, yy, A.w, 1); mtxt(g, nm, A.x + 8, yy + 10, 10, 'rgba(255,214,140,.8)'); } }
    // spawn point, other players, you
    const sp = P.spawn; if (sp) { const x = X(sp.x), y = Y(sp.y); g.fillStyle = '#5cf28a'; g.beginPath(); g.moveTo(x - 7, y - 4); g.lineTo(x, y - 11); g.lineTo(x + 7, y - 4); g.fill(); g.fillRect(x - 5, y - 4, 10, 7); g.strokeStyle = '#0a0614'; g.lineWidth = 1.5; g.strokeRect(x - 5, y - 4, 10, 7); }
    for (const [, o] of others) if (o.p && o.p.x != null) { const x = X(o.p.x), y = Y(o.p.y - 1.4); g.fillStyle = o.col || '#3ec5ff'; g.strokeStyle = '#0a0614'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.stroke(); mtxt(g, o.name || 'Player', x, y - 14, 11, o.col || '#3ec5ff', 'center'); }
    { const x = X(P.x), y = Y(P.y - 1.4), pulse = 9 + Math.sin(anim * 5) * 2; g.strokeStyle = '#ffd23f'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, pulse, 0, 7); g.stroke(); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.strokeStyle = '#0a0614'; g.lineWidth = 1.5; g.stroke(); mtxt(g, 'YOU', x, y - 18, 12, '#ffd23f', 'center'); }
    g.restore();
    // what is under the pointer
    if (inB(A, mx, my)) { const tx = Math.floor((mx - ox) / s), ty = Math.floor((my - oy) / s); if (tx >= 0 && tx < WW && ty >= 0 && ty < WH) { const t = tiles[ty * WW + tx], nm = !(explored && explored[ty * WW + tx]) ? 'Unexplored' : t ? (IT[DROP[t]] ? IT[DROP[t]].n : t === T.GRASS ? 'Grass' : t === T.TRUNK ? 'Tree' : t === T.LEAF ? 'Leaves' : 'Block') : ty < surf[tx] ? 'Sky' : ty >= HELL ? 'Underworld' : 'Cave';
      mtxt(g, `${nm.toUpperCase()}  ·  ${tx < WW / 2 ? Math.round(WW / 2 - tx) + ' WEST' : Math.round(tx - WW / 2) + ' EAST'}  ·  DEPTH ${Math.max(0, ty - surf[tx])}`, v.x0 + 34, v.y1 - 30, 12, '#f0e8d8'); } }
    mtxt(g, `ZOOM ${mapZ.toFixed(1)}×`, v.x1 - 84, v.y1 - 30, 12, '#ffb02e', 'right');
  }
  function mapZoom(d, px, py) { const A = mapArea(), s0 = mapS(A); const wx = mapC[0] + (px - (A.x + A.w / 2)) / s0, wy = mapC[1] + (py - (A.y + A.h / 2)) / s0;
    mapZ = clamp(mapZ * (d < 0 ? 1.25 : 1 / 1.25), 1, 12); const s1 = mapS(A); mapC = [wx - (px - (A.x + A.w / 2)) / s1, wy - (py - (A.y + A.h / 2)) / s1]; mapClamp(); }
  function mapClamp() { const A = mapArea(), s = mapS(A), hw = A.w / 2 / s, hh = A.h / 2 / s; mapC[0] = WW <= hw * 2 ? WW / 2 : clamp(mapC[0], hw, WW - hw); mapC[1] = WH <= hh * 2 ? WH / 2 : clamp(mapC[1], hh, WH - hh); }
  const KB_DEF = { left: 'KeyA', right: 'KeyD', jump: 'Space', inv: 'Tab', map: 'KeyM', potion: 'KeyH', down: 'KeyS' }, KB_NAME = { left: 'Move left', right: 'Move right', jump: 'Jump / swim up', inv: 'Inventory', map: 'World map', potion: 'Quick heal', down: 'Drop through platforms' };
  const KB = () => Object.assign({}, KB_DEF, (K.save && K.save.kb) || {});
  const keyName = c => !c ? '?' : c.startsWith('Key') ? c.slice(3) : c.startsWith('Digit') ? c.slice(5) : ({ Space: 'Space', Tab: 'Tab', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift', ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl', Enter: 'Enter', Backquote: '`' })[c] || c;
  addEventListener('keydown', e => { if (e.code === 'Tab' && K.state === 'play') e.preventDefault(); }, true);
  // ---- settings: volume, display and keybinds ----
  let setOpen = false, setCatch = null;
  function openSettings() {
    let d = document.getElementById('sset');
    if (!d) { d = document.createElement('div'); d.className = 'scr'; d.id = 'sset'; d.style.zIndex = 21; document.body.appendChild(d);
      d.onpointerdown = e => { if (e.target === d) closeSettings(); };
      addEventListener('keydown', e => { if (!setOpen) return; if (setCatch) { e.preventDefault(); e.stopPropagation(); if (e.code !== 'Escape') { K.save.kb = Object.assign({}, K.save.kb || {}, { [setCatch]: e.code }); K.persist(); } setCatch = null; renderSettings(); return; } if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSettings(); } }, true); }
    keys = {}; useHeld = false; setOpen = true; d.hidden = false; renderSettings();
  }
  function closeSettings() { const d = document.getElementById('sset'); if (d) d.hidden = true; setOpen = false; setCatch = null; keys = {}; }
  function renderSettings() {
    const d = document.getElementById('sset'), S = K.save, k = KB(), row = 'display:flex;justify-content:space-between;align-items:center;gap:12px;margin:3px 0;font-size:16px';
    const tog = (id, label, on) => `<div style="${row}"><span>${label}</span><button data-t="${id}" style="min-width:86px;padding:3px 12px;border-radius:10px;border:3px solid #0a0e28;background:${on ? 'rgba(40,120,60,.92)' : 'rgba(60,66,90,.85)'}">${on ? 'On' : 'Off'}</button></div>`;
    const zs = [[1, '1×'], [4 / 3, '1.33×'], [1.5, '1.5×'], [2, '2×']], zc = S.zoom || (touch ? 1.5 : 4 / 3);
    d.innerHTML = `<div class="card" style="width:min(560px,100%);text-align:left"><h2 class="title" style="font-size:30px;text-align:center;margin:0">Settings</h2>
      <h3 style="margin:4px 0 2px;color:#ffe680">Sound</h3>
      <div style="${row}"><span>Master volume</span><span style="display:flex;align-items:center;gap:10px"><input id="set-vol" type="range" min="0" max="100" value="${Math.round((S.vol ?? 1) * 100)}" style="width:190px"><b id="set-volv" style="width:44px;text-align:right">${Math.round((S.vol ?? 1) * 100)}%</b></span></div>
      <div style="${row}"><span>Music volume</span><span style="display:flex;align-items:center;gap:10px"><input id="set-mus" type="range" min="0" max="100" value="${Math.round((S.music ?? .6) * 100)}" style="width:190px"><b id="set-musv" style="width:44px;text-align:right">${Math.round((S.music ?? .6) * 100)}%</b></span></div>
      ${tog('mute', 'Mute all sound', !!S.mute)}
      <h3 style="margin:8px 0 2px;color:#ffe680">Display</h3>
      <div style="${row}"><span>Camera zoom</span><span style="display:flex;gap:6px">${zs.map(([z, l]) => `<button data-z="${z}" style="padding:3px 10px;border-radius:10px;border:3px solid #0a0e28;background:${Math.abs(z - zc) < .01 ? 'rgba(40,120,60,.92)' : 'rgba(40,60,140,.85)'}">${l}</button>`).join('')}</span></div>
      ${tog('shake', 'Screen shake', !S.noShake)}${tog('pops', 'Damage numbers', !S.noPops)}${tog('hints', 'Tutorial hints', !S.noHints)}
      <h3 style="margin:8px 0 2px;color:#ffe680">Keybinds <small style="color:#cfd8ff;font-weight:400">(click, then press a key · Esc cancels)</small></h3>
      ${Object.keys(KB_DEF).map(a => `<div style="${row}"><span>${KB_NAME[a]}</span><button data-k="${a}" style="min-width:120px;padding:3px 12px;border-radius:10px;border:3px solid #0a0e28;background:${setCatch === a ? 'rgba(200,150,30,.95)' : 'rgba(40,60,140,.85)'}">${setCatch === a ? 'Press a key…' : keyName(k[a])}</button></div>`).join('')}
      <div style="${row};color:#9fb0e8;font-size:14px"><span>Hotbar: 1-0 or the mouse wheel · Arrow keys also move</span></div>
      <div class="row"><button id="set-reset">Reset keybinds</button><button id="set-close">Done</button></div></div>`;
    const vol = d.querySelector('#set-vol'); vol.oninput = () => { S.vol = vol.value / 100; d.querySelector('#set-volv').textContent = vol.value + '%'; K.persist(); }; const musv = d.querySelector('#set-mus'); musv.oninput = () => { S.music = musv.value / 100; d.querySelector('#set-musv').textContent = musv.value + '%'; K.persist(); };
    d.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const t = b.dataset.t; if (t === 'mute') S.mute = !S.mute; if (t === 'shake') S.noShake = !S.noShake; if (t === 'pops') S.noPops = !S.noPops; if (t === 'hints') S.noHints = !S.noHints; K.persist(); renderSettings(); });
    d.querySelectorAll('[data-z]').forEach(b => b.onclick = () => { S.zoom = +b.dataset.z; K.persist(); renderSettings(); });
    d.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { setCatch = b.dataset.k; renderSettings(); });
    d.querySelector('#set-reset').onclick = () => { delete S.kb; K.persist(); renderSettings(); };
    d.querySelector('#set-close').onclick = closeSettings;
  }
  function quitToMenu() { closeSettings(); closeBook(); rfClose(); if (held) { give(held.id, held.n); held = null; } invOpen = false; mapOpen = false; torchOff(); saveAll(); backToMenu(); toMenu(); }
  // the text buttons in the bottom-left corner of the open inventory
  const invBtns = () => { const v = K.view; return { drop: { x: OX() + 524, y: TOP() + 163, w: 46, h: 34 }, house: { x: v.x0 + 22, y: v.y1 - 118, w: 130, h: 30 }, set: { x: v.x0 + 22, y: v.y1 - 82, w: 140, h: 30 }, quit: { x: v.x0 + 22, y: v.y1 - 46, w: 100, h: 30 } }; };
  function drawInvBtns(g) {
    const v = K.view, Bt = invBtns();
    if (online() && MP.code) outlined(g, 'World code: ' + MP.code, v.x0 + 24, v.y1 - 136, 20, '#ffe680');
    { const d = Bt.drop, on = hover === 'ibdrop'; g.fillStyle = on ? 'rgba(90,110,200,.85)' : 'rgba(40,60,140,.75)'; g.beginPath(); g.roundRect(d.x, d.y, d.w, d.h, 7); g.fill(); g.strokeStyle = '#0a0e28'; g.lineWidth = 2; g.stroke(); outlined(g, 'Drop', d.x + d.w / 2, d.y + 23, on ? 17 : 15, on || held ? '#ffe680' : '#fff', 'center'); }
    for (const [k, lab] of [['house', 'Housing'], ['set', 'Settings'], ['quit', 'Quit']]) { const on = hover === 'ib' + k, b = Bt[k]; outlined(g, lab, b.x + 2, b.y + 24, on ? 28 : 24, on ? '#ffe680' : '#fff'); }
  }
  let hbOpen = false; const iconURLs = {};
  function iconURL(id) { if (!iconURLs[id]) { const c = document.createElement('canvas'); c.width = c.height = 40; icon(c.getContext('2d'), id, 20, 20, 2.2); iconURLs[id] = c.toDataURL(); } return iconURLs[id]; }
  function openBook() {
    let d = document.getElementById('hbook');
    if (!d) {
      d = document.createElement('div'); d.className = 'scr'; d.id = 'hbook'; d.style.zIndex = 20;
      d.innerHTML = '<div class="card" style="width:min(680px,100%);text-align:left"><h2 class="title" style="font-size:34px;text-align:center">Crafting Handbook</h2>' +
        '<input id="hb-q" placeholder="Search for an item..." autocomplete="off" style="width:100%;padding:12px 14px;border-radius:14px;border:3px solid #0a0e28;background:rgba(10,16,48,.75);color:#fff;font-size:18px;margin:6px 0 10px;user-select:text">' +
        '<div id="hb-list" style="max-height:min(58vh,520px);overflow:auto;padding-right:4px"></div><div class="row"><button id="hb-close">Close</button></div></div>';
      document.body.appendChild(d);
      const q = d.querySelector('#hb-q'); q.oninput = renderBook;
      q.onkeydown = e => { e.stopPropagation(); if (e.key === 'Escape') closeBook(); }; q.onkeyup = e => e.stopPropagation();
      d.querySelector('#hb-close').onclick = closeBook; d.onpointerdown = e => { if (e.target === d) closeBook(); };
    }
    keys = {}; useHeld = false; hbOpen = true; d.hidden = false; const q = d.querySelector('#hb-q'); q.value = ''; renderBook(); setTimeout(() => q.focus(), 30);
  }
  function closeBook() { const d = document.getElementById('hbook'); if (d) d.hidden = true; hbOpen = false; keys = {}; }
  function renderBook() {
    const d = document.getElementById('hbook'), box = d.querySelector('#hb-list'), q = d.querySelector('#hb-q').value.trim().toLowerCase(); box.textContent = '';
    const all = RECIPES.slice().sort((a, b) => IT[a[0]].n.localeCompare(IT[b[0]].n) || a[1] - b[1]);
    const hits = all.filter(r => !q || IT[r[0]].n.toLowerCase().includes(q) || Object.keys(r[2]).some(k => IT[k].n.toLowerCase().includes(q)));
    if (!hits.length) { const p = document.createElement('p'); p.textContent = 'No craftable item matches "' + q + '".'; p.style.cssText = 'text-align:center;opacity:.8'; box.appendChild(p); return; }
    for (const r of hits) { const it = IT[r[0]], row = document.createElement('div'); row.style.cssText = 'display:flex;gap:12px;align-items:center;padding:8px 10px;margin:4px 0;border-radius:12px;background:rgba(40,60,140,.55);border:2px solid #0a0e28';
      const im = document.createElement('img'); im.src = iconURL(r[0]); im.width = im.height = 40; im.style.imageRendering = 'pixelated'; row.appendChild(im);
      const tx = document.createElement('div'); tx.style.flex = '1';
      const nm = document.createElement('div'); nm.textContent = it.n + (r[1] > 1 ? ' x' + r[1] : ''); nm.style.cssText = 'font-size:19px;color:' + RAR[it.r || 0]; tx.appendChild(nm);
      const mt = document.createElement('div'); mt.style.cssText = 'font-size:15px;color:#cfd8ff;display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center';
      for (const [k, n] of Object.entries(r[2])) { const s = document.createElement('span'); s.style.cssText = 'display:inline-flex;align-items:center;gap:4px'; const mi = document.createElement('img'); mi.src = iconURL(k); mi.width = mi.height = 20; mi.style.imageRendering = 'pixelated'; s.appendChild(mi); s.appendChild(document.createTextNode(n + ' ' + IT[k].n)); mt.appendChild(s); }
      tx.appendChild(mt);
      const bf = it.summon ? `summons a ${MINI[it.summon].n} (${MINI[it.summon].dmg} damage)` : it.acc ? bonusText(it.bon || {}) : it.set ? (bonusText(SETS[it.set].bon) ? `${it.armor} defense · full ${SETS[it.set].n} set: ${bonusText(SETS[it.set].bon)}` : `${it.armor} defense, no set bonus`) : it.use && it.use.startsWith('buff:') ? `${BUFFS[it.use.slice(5)].n} for 3 minutes: ${bonusText(BUFFS[it.use.slice(5)].bon)}` : '';
      { const sl = statLine(it); if (sl) { const sd = document.createElement('div'); sd.textContent = sl; sd.style.cssText = 'font-size:14px;color:#ffe680;margin:2px 0'; tx.appendChild(sd); } }
      if (bf && !(it.set || it.acc || it.summon)) { const bd = document.createElement('div'); bd.textContent = (it.summon ? 'Summon: ' : it.acc ? 'Accessory: ' : it.set ? 'Armor: ' : 'Buff: ') + bf; bd.style.cssText = 'font-size:14px;color:#7aff7a;margin:2px 0'; tx.appendChild(bd); }
      const at = document.createElement('div'); at.textContent = r[3] ? (/^[AEIOU]/.test(IT[r[3]].n) ? 'At an ' : 'At a ') + IT[r[3]].n : 'By hand'; at.style.cssText = 'font-size:13px;color:#9fb0e8'; tx.appendChild(at);
      row.appendChild(tx); box.appendChild(row); }
  }
  function wheelScroll(d) { const list = wheelList(); if (!list.length) return; cidx = clamp(cidx + d, 0, list.length - 1); cpick = list[cidx]; K.sfx(480, .02, 'square', .02); }
  const statLine = it => [it.melee && `${it.melee} melee damage`, (it.pick || it.axe || it.hammer) && it.dmg && `${it.dmg} melee damage`, it.pick && `${Math.round(it.pick * 35)}% mining power`, it.axe && `${Math.round(it.axe * 17.5)}% chopping power (wood)`, it.hammer && `${Math.round(it.hammer * 35)}% hammer power · knocks down walls`, it.wall && 'background wall · hammers take it down', it.tile === 46 && 'opens with a click or when you walk into it', it.coin && 'money · traders take it', it === IT.frostgrip && 'no slipping on ice', it === IT.gustjar && 'jump again in the air', it === IT.emberboots && 'press jump in the air, then hold it, to fly up for a moment', it === IT.windstep && 'tap left or right twice to dash', it.acc === 'wings' && 'press jump in the air and hold it to fly, then glide', it.hook && 'shoots a hook at blocks and pulls you to them · jump to let go', it.rod && `${it.rod} fishing power · click water to cast, click again when it bites · needs bait`, it.bait && `${it.bait} bait power`, it.fish && 'a fish · traders buy it, some cook at a campfire', it.use && it.use.startsWith('crate:') && 'click to open', it === IT.sunfeather && 'hold jump while falling to glide', it.tile === 48 && `stand on it · ${keyName(KB().down).toUpperCase()} drops through`,
    it.reach && 'long reach', it.bow && `${it.bow} ranged damage`, it.gun && `${it.gun} ranged damage`, it.shots && `${it.shots} shots at once`, it.magic && `${it.magic} magic damage`, it.mp && `${it.mp} mana per cast`, it.boom && `${it.boom} thrown damage`,
    it.throw && `${it.dmg} thrown damage`, it.ammo && `${it.dmg} damage ammo`, it.fire && 'sets enemies on fire', it.armor && `${it.armor} defense (${it.slot || 'body'})`, it.set && bonusText(SETS[it.set].bon) && `full ${SETS[it.set].n} set: ${bonusText(SETS[it.set].bon)}`, it.use === 'heal' && 'heals 100 life', it.use === 'lheal' && 'heals 50 life', it.use === 'mpot' && 'restores 100 mana', it.use === 'recall' && 'takes you back to your spawn point', it.use === 'home' && 'takes you back to your spawn point, as often as you like (5s recharge)', it.spawn && 'sets your spawn point', (it.tile === 28 || it.tile === 29) && 'gives light', it.use === 'life' && '+20 max life', it.use === 'mana' && '+20 max mana',
    it.use && it.use.startsWith('boss:') && 'summons a boss', it.use && it.use.startsWith('buff:') && `${BUFFS[it.use.slice(5)].n}, 3 min: ${bonusText(BUFFS[it.use.slice(5)].bon)}`, it.pet && 'pet · goes in the pet slot next to your accessories', it.acc && 'accessory', it.bon && bonusText(it.bon), it.bucket === 'empty' && 'scoops up a full cell of water, lava or honey', it.bucket > 0 && `pours ${LQ[it.bucket].n.toLowerCase()} · empties back into a bucket`, it.summon && `summons a ${MINI[it.summon].n} · ${MINI[it.summon].dmg} summon damage · ${it.mp} mana`, it.tile && 'can be placed'].filter(Boolean).join(' · ');
  function inventory(g) {
    if (bag()) return bagTouch(g);
    g.save(); g.translate(OX(), TOP());
    const panel = (x, y, w, h) => { g.fillStyle = 'rgba(22,30,78,.78)'; g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill(); g.strokeStyle = 'rgba(150,170,255,.35)'; g.lineWidth = 2; g.stroke(); };
    panel(4, 4, 576, 340); panel(582, 4, 60, 232);
    { const A = amS(); for (let k = 0; k < 4; k++) { slot(g, ASB(k), A[k], false); if (!A[k]) { g.globalAlpha = .22; icon(g, k < 2 ? 'arrow' : 'shot', ASB(k).x + 23, ASB(k).y + 23, 1); g.globalAlpha = 1; } } outlined(g, 'Ammo', 612, 226, 13, '#ffe680', 'center'); }
    for (let i = 0; i < 40; i++) slot(g, IB(i), ch.inv[i], i === sel);
    SLOTS.forEach((k, i) => { const id = gear()[k]; slot(g, ARMS(i), id ? { id, n: 1 } : null, false); if (!id) outlined(g, ['Head', 'Body', 'Legs'][i], ARMS(i).x + 23, ARMS(i).y + 28, 11, '#8a96c8', 'center'); });
    for (let i = 0; i < 3; i++) slot(g, ACCB(i), ch.acc && ch.acc[i] ? { id: ch.acc[i], n: 1 } : null, false);
    slot(g, ACCB(3), ch.pet ? { id: ch.pet, n: 1 } : null, false); if (!ch.pet) outlined(g, 'Pet', ACCB(3).x + 23, ACCB(3).y + 28, 11, '#8a96c8', 'center');
    { const b = B(), cl = classLine(b); const st = setOf(); const sb = st && bonusText(SETS[st].bon); outlined(g, (st && bonusText(SETS[st].bon) ? 'Def ' : 'Defense ') + def() + (st && bonusText(SETS[st].bon) ? ` · ${SETS[st].n} set` : ''), 222, 302, 14, sb ? '#7aff7a' : '#cfd8ff'); g.font = `13px ${PXF}`; outlined(g, fitText(g, cl || 'No bonuses yet', 170), 222, 324, 13, cl ? '#ffe680' : '#8a96c8'); }
    const hv = (rfOpen && rfItem && inB(RF_SLOT, mx - OX(), my - TOP()) && rfItem) || (openCh && hoverChest >= 0 && cget(hoverChest)) || (shopK && hoverChest >= 0 && shopItem(hoverChest)) || (hoverSlot >= 0 && ch.inv[hoverSlot]) || (hoverCoin >= 0 && cslots()[hoverCoin] && { id: CIDS[hoverCoin], n: cslots()[hoverCoin] }) || (hoverAm >= 0 && amS()[hoverAm]) || (hoverGear && { id: hoverGear }) || held || ch.inv[sel]; if (hv) { const it = IT[hv.id], mm = modOf(hv); outlined(g, nameOf(hv), 14, 240, 18, RAR[it.r || 0]); const st = [modLine(hv), statLine(it)].filter(Boolean).join(' · '); if (st) outlined(g, fitText(g, st, 490), 14, 264, 14, mm && mm.n ? (mm.bad ? '#ff9a8a' : '#7aff7a') : '#cfd8ff'); }
    drawChest(g, panel); drawShop(g, panel); drawReforge(g, panel); { const cs = cslots(); outlined(g, 'Coins', 568, 280, 11, '#ffe680', 'right'); for (let k = 0; k < 4; k++) { slot(g, CSB(k), cs[k] ? { id: CIDS[k], n: cs[k] } : null, false); if (!cs[k]) { g.globalAlpha = .25; icon(g, CIDS[k], CSB(k).x + 20, CSB(k).y + 20, .8); g.globalAlpha = 1; } } }
    if (shopK) { const si = hoverChest >= 0 && shopItem(hoverChest), hs = hoverSlot >= 0 && ch.inv[hoverSlot]; const sv = si ? 'Buy for ' + coinText(si.p) : hs ? (sellPrice(hs) ? 'Sells for ' + coinText(sellPrice(hs)) : "Can't be sold") : ''; if (sv) outlined(g, sv, 570, 240, 15, '#ffe680', 'right'); }
    g.restore();
    craftWheel(g);
    drawInvBtns(g); drawQB(g);
    if (held) icon(g, held.id, mx, my, 1.6);
  }

  /* ---------- worlds and the menu ---------- */
  const rle = a => { const out = []; for (let i = 0; i < a.length;) { const v = a[i]; let n = 1; while (i + n < a.length && a[i + n] === v && n < 255) n++; out.push(n, v); i += n; } return Uint8Array.from(out); };
  const unrle = (b, n) => { const a = new Uint8Array(n); let k = 0; for (let i = 0; i < b.length; i += 2) { a.fill(b[i + 1], k, k + b[i]); k += b[i]; } return a; };
  const b64 = a => { let s = ''; for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode.apply(null, a.subarray(i, i + 8192)); return btoa(s); };
  const unb64 = s => { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
  function packWorld() { return { pv: b64(rle(PVA())), lq: liq ? b64(rle(liq)) : null, lk: lqk ? b64(rle(lqk)) : null, ex: explored ? b64(rle(explored)) : null, ww: WW, wh: WH, t: b64(rle(tiles)), w: b64(rle(walls)), s: Array.from(surf), c: chests, np: npcs.map(n => ({ k: n.k, nm: n.nm, x: +n.x.toFixed(2), y: +n.y.toFixed(2), hp: Math.round(n.hp), h: n.house })), ng: npcGone, time, downed, jg: jungle, tp: temple, hm: hard, df: dfc, bd: [...brokenDeco], ra: radiant, hb: hearts, fr: frost, bl: blight, gl: glowc, sk: isles }; }
  let pv = null, pvT = null; const PVA = () => { if (!pv || pvT !== tiles || pv.length !== WW * WH) { pv = new Uint8Array(WW * WH); pvT = tiles; } return pv; };
function unpackWorld(W) { unpackWorld0(W); pv = W.pv ? unrle(unb64(W.pv), WW * WH) : new Uint8Array(WW * WH); pvT = tiles; }
function unpackWorld0(W) { WW = W.ww || 520; setDepth(W.wh || 210); tiles = unrle(unb64(W.t), WW * WH); walls = unrle(unb64(W.w), WW * WH); surf = Int16Array.from(W.s); chests = W.c || {}; npcs = (W.np || []).filter(o => NPCS[o.k]).map(o => newNpc(o.k, o.nm, o.x, o.y, o.h || null, o.hp)); npcGone = W.ng || {}; npcT = 0; time = W.time || .05; downed = W.downed || {}; jungle = W.jg || null; temple = W.tp || null; hard = W.hm || 0; brokenDeco = new Set(W.bd || []); dfc = W.df == null ? 1 : W.df | 0; radiant = W.ra || null; hearts = W.hb || 0; frost = W.fr || null; blight = W.bl || null; glowc = W.gl || []; isles = W.sk || []; explored = W.ex ? unrle(unb64(W.ex), WW * WH) : new Uint8Array(WW * WH);
    if (W.lq && W.lk) { liq = unrle(unb64(W.lq), WW * WH); lqk = unrle(unb64(W.lk), WW * WH); } else { liq = new Uint8Array(WW * WH); lqk = new Uint8Array(WW * WH); }
    for (let i = 0; i < tiles.length; i++) if (tiles[i] === T.WATER) { tiles[i] = T.AIR; liq[i] = 8; lqk[i] = 1; }   // worlds from before liquids flowed
  }
  const worlds = () => K.save.sw || (K.save.sw = []);
  function saveAll() { if (demo) return; const th = tHold; if (th && th.i !== 9) { const a = ch.inv[th.i]; ch.inv[th.i] = ch.inv[9]; ch.inv[9] = a; } try { K.save.sc = ch; if (cslot >= 0 && chars()[cslot]) chars()[cslot].ch = ch; if (isHost() && wslot >= 0 && worlds()[wslot]) { const W = worlds(); W[wslot] = { ...W[wslot], ...packWorld(), played: Date.now() }; } K.persist(); } catch (e) {} if (th && th.i !== 9 && tHold === th) { const a = ch.inv[th.i]; ch.inv[th.i] = ch.inv[9]; ch.inv[9] = a; } }
  const MB = { worlds: i => ({ x: 340, y: 210 + i * 104, w: 600, h: 90 }), del: i => ({ x: 950, y: 230 + i * 104, w: 110, h: 50 }), join: { x: 340, y: 530, w: 600, h: 70 } };
  let confirmDel = null, menuNote = '', menuNoteUntil = 0;
  function drawMenu(g) {
    const v = K.view, gr = g.createLinearGradient(0, 0, 0, 720); gr.addColorStop(0, '#2a4a8a'); gr.addColorStop(1, '#7ab0e8'); g.fillStyle = gr; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.imageSmoothingEnabled = false; for (let x = -24; x < 1304; x += 24) { const h = 636; g.drawImage(tex[T.GRASS], x, h, 24, 24); for (let y = h + 24; y < 744; y += 24) g.drawImage(tex[y > h + 48 ? T.STONE : T.DIRT], x, y, 24, 24); }
    outlined(g, 'STRATA', 640, 120, 86, '#9cdc4a', 'center'); outlined(g, 'Dig, build, fight. Alone or with friends.', 640, 166, 22, '#fff', 'center');
    const W = worlds();
    for (let i = 0; i < 3; i++) { const b = MB.worlds(i), w = W[i], hv = hover === 'w' + i; g.fillStyle = hv ? 'rgba(80,110,210,.95)' : 'rgba(40,60,140,.85)'; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 12); g.fill(); g.strokeStyle = '#0a0e28'; g.lineWidth = 3; g.stroke();
      if (w) { outlined(g, w.name, b.x + 24, b.y + 38, 28, '#fff'); const dq = DIFF[w.df == null ? 1 : w.df] || DIFF[1]; outlined(g, dq.n, b.x + b.w - 24, b.y + 24, 15, dq.c, 'right'); outlined(g, sizeName(w.ww) + ' world · ' + `${Object.keys(w.downed || {}).length} of 4 bosses down · last played ${new Date(w.played || w.made).toLocaleDateString()}`, b.x + 24, b.y + 68, 15, '#cfd8ff'); outlined(g, 'PLAY ▶', b.x + b.w - 24, b.y + 52, 24, '#ffe680', 'right');
        const d = MB.del(i); g.fillStyle = hover === 'd' + i ? '#c8303a' : 'rgba(120,30,40,.85)'; g.beginPath(); g.roundRect(d.x, d.y, d.w, d.h, 10); g.fill(); outlined(g, 'Delete', d.x + d.w / 2, d.y + 32, 18, '#fff', 'center'); }
      else outlined(g, `+  New world (slot ${i + 1})`, b.x + 24, b.y + 54, 24, '#cfd8ff'); }
    const j = MB.join; g.fillStyle = hover === 'join' ? '#3a9a4a' : 'rgba(40,120,60,.9)'; g.beginPath(); g.roundRect(j.x, j.y, j.w, j.h, 12); g.fill(); g.strokeStyle = '#0a0e28'; g.lineWidth = 3; g.stroke(); outlined(g, 'JOIN A WORLD', 640, j.y + 45, 26, '#fff', 'center');
    if (performance.now() < menuNoteUntil) outlined(g, menuNote, 640, 624, 17, '#ffe680', 'center');
    outlined(g, 'Pick a world, then play it alone or online with friends.', 640, 196, 15, '#e8f0ff', 'center');
    if (confirmDel != null && W[confirmDel]) { g.fillStyle = 'rgba(0,0,0,.72)'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); outlined(g, `Delete ${W[confirmDel].name} forever?`, 640, 330, 30, '#ff9a9a', 'center'); outlined(g, 'Click Delete again to confirm, anywhere else to cancel.', 640, 370, 18, '#fff', 'center'); const d = MB.del(confirmDel); g.fillStyle = '#c8303a'; g.beginPath(); g.roundRect(d.x, d.y, d.w, d.h, 10); g.fill(); outlined(g, 'Delete', d.x + d.w / 2, d.y + 32, 18, '#fff', 'center'); }
  }
  const NAMES = ['Mossy Reach', 'Ember Hollow', 'Copper Vale', 'Starfall Plains', 'Deepglen', 'Ashen Crown', 'Willowmere', 'Stonewake', 'Lantern Ridge', 'Gloamwood'];
  function newWorld(i, name, ww, df) { WW = ww || 1040; gen(); dfc = df == null ? 1 : df; time = .05; downed = {}; const W = worlds(); W[i] = { name: name || pick(NAMES), made: Date.now(), ...packWorld(), played: Date.now() }; K.persist(); return i; }
  const SIZES = [['Small', 720], ['Medium', 1040], ['Large', 1520]], sizeName = ww => (SIZES.find(s => s[1] === (ww || 520)) || ['Classic'])[0];
  // ---------- singleplayer or multiplayer, characters, world codes ----------
  // The shared room code runs out of sight here; Strata draws its own pixel screens for it.
  const inRoom = () => typeof MP !== 'undefined' && MP.online();
  let joinT = 0, linkTried = false, hostT = 0, hostTry = 0, joinCode = '', pickW = -1, flow = null, edit = null, confirmDelC = null, cslot = -1;
  const waiting = new Map();   // friends who typed the code while the owner is still on the world-code screen
  const note = t => { menuNote = t; menuNoteUntil = performance.now() + 5000; };
  const $id = id => document.getElementById(id);
  const cleanName = (s, max) => String(s || '').replace(/[^\w .'-]/g, '').trim().slice(0, max);
  function netOpts() {
    Object.assign(MP.opts, { max: 4, min: 1, bots: 0, solo: false, config: () => ({ name: wslot >= 0 && worlds()[wslot] ? worlds()[wslot].name : 'World' }), onStart, onMsg, onLeave, onJoin, rejoin: true, inWorld: () => (mode === 'play' || mode === 'recv') && !!net, owner: () => (mode === 'play' || mode === 'recv') && !!net && wslot >= 0, onResume, onOwnerBack, onHost: id => { if ((mode === 'play' || mode === 'recv') && id === MP.id && wslot < 0) kicked('The world host left, so the game ended.'); else if (mode === 'play' && id === MP.id) adopt('The world owner left. You are hosting the world now.'); } });
  }
  function netReady() {
    if (typeof MP === 'undefined' || demo) return;
    netOpts(); MP.show();   // builds the hidden room code
    const m = /[?&]room=([A-Za-z0-9]{4})/.exec(location.search);
    if (m && !linkTried) { linkTried = true; if (inRoom()) MP.leave(); joinCode = m[1].toUpperCase(); flow = { next: 'join', w: -1 }; mode = 'chars'; }   // a shared link: pick a character, then join
  }
  function backToMenu() { if (inRoom()) MP.leave(); waiting.clear(); flow = null; mode = 'menu'; }
  function playWorld(i) { pickW = i; mode = 'pick'; }   // a world was picked: singleplayer or multiplayer?
  function chooseWorld(i) { if (worlds()[i]) return playWorld(i); createDialog(i); }
  function openJoin() { flow = { next: 'join', w: -1 }; mode = 'chars'; }

  // ---------- how a character looks ----------
  const SKINS = [['#f0c090', '#d8a070', '#c88a60'], ['#ffdcc0', '#ecbc9c', '#d89c80'], ['#d9a066', '#c08550', '#a8703f'], ['#a8683a', '#8e552c', '#7a4524'], ['#6e4224', '#5a341b', '#48280f'], ['#fff0e4', '#f0d6c4', '#dcb8a4'], ['#c8a070', '#b08858', '#987044'], ['#4a2c18', '#3a2210', '#2a1808']];
  const HAIRS = ['Short', 'Long', 'Spiky', 'Ponytail', 'Mohawk', 'Bald', 'Curly', 'Bob', 'Braids', 'Buzz', 'Side part', 'Topknot'], FACES = ['Classic', 'Happy', 'Fierce', 'Sleepy', 'Freckles', 'Wink', 'Surprised', 'Smirk', 'Determined'], TOPS = ['Tunic', 'Vest', 'Striped', 'Hoodie', 'Jacket', 'Overalls', 'Robe', 'Tank top'];
  const BEARDS = ['None', 'Stubble', 'Mustache', 'Beard', 'Goatee'], PANTS = ['Trousers', 'Shorts', 'Skirt', 'Cargo'], EXTRAS = ['None', 'Headband', 'Glasses', 'Scarf', 'Bandana', 'Eyepatch', 'Earring'];
  const HAIRC = ['#6a3a18', '#2a1a10', '#e8c060', '#c84a1a', '#d8d8d8', '#1a1a1a', '#3a6ad0', '#e070b0', '#8a4a2a', '#f4ecd0', '#3aa04a', '#7a3ac8', '#20a0a0'], EYEC = ['#2a4a9a', '#3a8a3a', '#6a3a18', '#7a2ac8', '#1a1a1a', '#c8303a', '#c8901a', '#7a8494', '#1aa0a0'];
  const CLOTHC = ['#3a8a3a', '#2a6ad0', '#c8303a', '#e8b020', '#8a3ac8', '#e07020', '#20a0a0', '#e0e0e8', '#303038', '#2e2e5e', '#6a3a18', '#f080b0', '#7a8a3a', '#5a2030', '#8ab0e0', '#c8a878'], SHOEC = ['#4a2a14', '#1a1a1a', '#e8e8e8', '#8a3a2a', '#2a4a8a', '#6a6a74', '#c8a060', '#3a6a2a'];
  const HERO_NAMES = ['Ash', 'Rowan', 'Kit', 'Juniper', 'Flint', 'Wren', 'Sage', 'Ember', 'Pip', 'Moss'];
  const defLook = () => [0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 0, 2, 0];   // skin, hair, hair colour, face, eye colour, shirt, shirt colour, trouser colour, pants style, shoes, extra, extra colour, facial hair
  let look = defLook();
  const shade = (c, k) => { const n = parseInt(c.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return '#' + ((1 << 24) + (f(n >> 16) << 16) + (f(n >> 8 & 255) << 8) + f(n & 255)).toString(16).slice(1); };
  function lookOf(lk) { const a = Array.isArray(lk) ? lk : defLook(), s = SKINS[a[0]] || SKINS[0]; return { sk: s[0], sk2: s[1], sk3: s[2], hair: a[1] | 0, hairC: HAIRC[a[2]] || HAIRC[0], face: a[3] | 0, eyeC: EYEC[a[4]] || EYEC[0], top: a[5] | 0, topC: CLOTHC[a[6]] || CLOTHC[0], legC: CLOTHC[a[7]] || CLOTHC[9], pants: a[8] | 0, shoe: SHOEC[a[9] | 0] || SHOEC[0], extra: a[10] | 0, exC: CLOTHC[a[11] == null ? 2 : a[11]] || CLOTHC[2], beard: a[12] | 0 }; }
  function hairArt(r, L) {
    const H = L.hairC, hl = shade(H, 1.3), dk = shade(H, .72);
    if (L.hair === 5) return;
    if (L.hair === 4) { r(H, -1, -35, 4, 6); r(hl, 0, -35, 2, 1); r(dk, -1, -30, 4, 1); return; }
    if (L.hair === 9) { r(H, -4, -30, 9, 2); r(H, -4, -29, 2, 3); r(hl, -2, -30, 4, 1); return; }
    r(H, -5, -32, 11, 4); r(hl, -3, -32, 6, 1); r(dk, -5, -29, 11, 1);
    if (L.hair === 0) { r(H, -5, -29, 3, 6); r(H, 2, -30, 3, 2); r(dk, -5, -24, 3, 1); }
    else if (L.hair === 1) { r(H, -5, -29, 3, 12); r(H, -6, -29, 2, 10); r(H, 2, -30, 3, 2); r(dk, -6, -20, 3, 1); r(hl, -5, -27, 1, 6); }
    else if (L.hair === 2) { r(H, -5, -29, 3, 4); r(H, -4, -35, 2, 3); r(H, 0, -36, 2, 4); r(H, 3, -35, 2, 3); r(hl, 0, -36, 1, 2); }
    else if (L.hair === 3) { r(H, -5, -29, 3, 6); r(H, 2, -30, 3, 2); r(H, -8, -30, 3, 3); r(H, -9, -28, 2, 7); r(shade(H, .5), -8, -29, 1, 1); r(hl, -9, -27, 1, 4); }
    else if (L.hair === 6) { r(H, -6, -33, 12, 3); r(H, -7, -31, 3, 7); r(H, 4, -31, 2, 3); r(H, -6, -25, 2, 2); for (const [x, y] of [[-6, -33], [-3, -34], [1, -34], [4, -33], [-7, -29], [-7, -26]]) r(hl, x, y, 2, 1); }
    else if (L.hair === 7) { r(H, -6, -30, 3, 10); r(H, 1, -30, 5, 2); r(H, 4, -29, 2, 3); r(dk, -6, -21, 3, 1); r(hl, -5, -29, 1, 7); }
    else if (L.hair === 8) { r(H, -5, -29, 3, 5); r(H, 2, -30, 3, 2); for (let i = 0; i < 4; i++) { r(i % 2 ? dk : H, -7, -25 + i * 3, 2, 3); r(hl, -7, -25 + i * 3, 1, 1); } r(L.exC || '#c8303a', -7, -13, 2, 1); }
    else if (L.hair === 10) { r(H, -5, -29, 3, 5); r(H, -1, -31, 6, 3); r(H, 4, -29, 1, 2); r(hl, 0, -31, 4, 1); r(dk, -1, -29, 1, 1); }
    else if (L.hair === 11) { r(H, -5, -29, 3, 5); r(H, 2, -30, 3, 2); r(H, -2, -37, 5, 5); r(hl, -1, -37, 2, 1); r(dk, -2, -33, 5, 1); }
  }
  function faceArt(r, L) {
    const E = L.eyeC, brow = shade(L.hairC, .8), lip = shade(L.sk3, .8);
    r(L.sk2, -2, -26, 2, 3); r(L.sk3, -2, -25, 1, 1);   // ear
    if (L.face === 3 || L.face === 5) { r('#2a1a10', 1, -25, 3, 1); r(L.sk3, 1, -26, 3, 1); }
    else if (L.face === 6) { r('#fff', 1, -27, 3, 3); r(E, 2, -26, 2, 2); r('#fff', 2, -26, 1, 1); }
    else { r('#fff', 1, -26, 3, 2); r(E, 3, -26, 1, 2); r('rgba(255,255,255,.8)', 3, -26, 1, 1); }
    if (L.face === 2) r('#2a1a10', 0, -28, 4, 1); else if (L.face === 8) { r('#2a1a10', 0, -28, 2, 1); r('#2a1a10', 2, -27, 2, 1); } else if (L.face !== 6) r(brow, 1, -28, 3, 1); else r(brow, 1, -29, 3, 1);
    if (L.face === 1 || L.face === 5) { r('#8a3a2a', 0, -23, 1, 1); r('#8a3a2a', 1, -22, 2, 1); r('#8a3a2a', 3, -23, 1, 1); r('rgba(255,110,110,.35)', 1, -24, 2, 1); }
    else if (L.face === 2) r('#8a3a2a', 1, -22, 2, 1);
    else if (L.face === 6) r('#5a1a10', 2, -23, 2, 2);
    else if (L.face === 7) { r('#8a3a2a', 1, -22, 2, 1); r('#8a3a2a', 3, -23, 1, 1); }
    else if (L.face === 8) r('#8a3a2a', 1, -22, 3, 1);
    else r(lip, 2, -22, 2, 1);
    if (L.face === 4) { r(L.sk3, 0, -24, 1, 1); r(L.sk3, 2, -24, 1, 1); r(L.sk3, -1, -23, 1, 1); }
    const H = L.hairC;
    if (L.beard === 1) { r(H + '55', 0, -23, 5, 3); }
    else if (L.beard === 2) { r(H, 1, -23, 4, 1); r(H, 4, -22, 1, 1); r(shade(H, 1.25), 1, -23, 2, 1); }
    else if (L.beard === 3) { r(H, -2, -24, 7, 3); r(H, -1, -21, 6, 2); r(H, 0, -19, 4, 1); r(shade(H, 1.25), 1, -23, 3, 1); r(lip, 2, -22, 2, 1); }
    else if (L.beard === 4) { r(H, 1, -23, 3, 1); r(H, 2, -21, 2, 3); r(shade(H, 1.25), 2, -21, 1, 1); }
  }
  // worn extras: drawn over the face and hair
  function extraArt(r, L, helm) {
    const X = L.exC, d = shade(X, .7);
    if (L.extra === 1 && !helm) { r(X, -5, -29, 10, 2); r(shade(X, 1.3), -4, -29, 8, 1); r(d, -7, -28, 2, 4); }
    else if (L.extra === 2) { r(X, 0, -27, 5, 1); r(X, 0, -27, 1, 3); r(X, 4, -27, 1, 3); r(X, 0, -25, 5, 1); r('rgba(190,230,255,.5)', 1, -26, 3, 1); r(X, -3, -27, 3, 1); }
    else if (L.extra === 3) { r(X, -5, -21, 10, 3); r(shade(X, 1.25), -4, -21, 7, 1); r(d, -7, -20, 3, 8); r(shade(X, 1.25), -7, -13, 3, 1); }
    else if (L.extra === 4 && !helm) { r(X, -5, -32, 10, 4); r(shade(X, 1.25), -3, -32, 6, 1); r(X, -8, -30, 3, 2); r(d, -9, -28, 2, 3); r('#fff', -1, -31, 1, 1); r('#fff', 2, -30, 1, 1); }
    else if (L.extra === 5) { r('#1a1a1a', 1, -27, 3, 3); r('#1a1a1a', -4, -29, 6, 1); r('#3a3a3a', 2, -26, 1, 1); }
    else if (L.extra === 6) { r(X, -2, -23, 1, 2); r(shade(X, 1.4), -2, -23, 1, 1); }
  }
  function topArt(r, L, shirt) {
    if (L.top === 0) { r(shade(shirt, .72), -1, -21, 3, 2); r(shade(shirt, .72), 0, -19, 1, 1); }
    else if (L.top === 1) { r(shade(shirt, 1.4), -1, -21, 3, 10); r(shade(shirt, .7), -1, -21, 1, 10); r('#ffd23f', 0, -17, 1, 1); r('#ffd23f', 0, -14, 1, 1); }
    else if (L.top === 2) { r(shade(shirt, .62), -5, -19, 10, 2); r(shade(shirt, .62), -5, -15, 10, 2); }
    else if (L.top === 3) { r(shirt, -6, -31, 4, 10); r(shade(shirt, .75), -6, -31, 1, 10); r(shade(shirt, .8), -2, -21, 4, 2); r(shade(shirt, 1.3), 1, -19, 1, 4); r(shade(shirt, 1.3), -1, -19, 1, 3); r(shade(shirt, .8), -2, -15, 6, 3); }
    else if (L.top === 4) { r('#e8e0d0', -1, -21, 3, 10); r(shade(shirt, .78), -2, -21, 1, 5); r(shade(shirt, .78), 2, -21, 1, 5); r(shade(shirt, 1.3), -5, -21, 1, 10); }
    else if (L.top === 5) { r(L.legC, -3, -17, 7, 6); r(L.legC, -3, -21, 1, 4); r(L.legC, 3, -21, 1, 4); r('#ffd23f', -3, -17, 1, 1); r('#ffd23f', 3, -17, 1, 1); r(shade(L.legC, .75), -1, -15, 3, 2); }
    else if (L.top === 6) { r(shirt, -6, -11, 12, 8); r(shade(shirt, .75), 2, -11, 4, 8); r(shade(shirt, 1.3), -6, -4, 12, 1); r(shade(shirt, .55), -5, -12, 10, 2); r(shade(shirt, 1.3), -1, -21, 2, 10); }
    else if (L.top === 7) { r(L.sk, -5, -21, 2, 3); r(L.sk, 3, -21, 2, 3); r(L.sk2, -5, -19, 2, 1); r(L.sk, -1, -21, 3, 1); }
  }
  // draw a character anywhere on a menu screen
  function heroAt(g, X, Y, s, lk) { const c0 = cam.x, c1 = cam.y; cam.x = 0; cam.y = 0; g.save(); g.translate(X, Y); g.scale(s, s); drawHero(g, { x: 0, y: 0, vx: 0, ground: true }, null, null, null, 0, 1, false, null, null, lk); g.restore(); cam.x = c0; cam.y = c1; }

  // ---------- menu screens, all drawn in the game's own style ----------
  function menuSky(g, ground) {
    const v = K.view, gr = g.createLinearGradient(0, 0, 0, 720); gr.addColorStop(0, '#2a4a8a'); gr.addColorStop(1, '#7ab0e8'); g.fillStyle = gr; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    if (ground) { g.imageSmoothingEnabled = false; for (let x = -24; x < 1304; x += 24) { const h = 636; g.drawImage(tex[T.GRASS], x, h, 24, 24); for (let y = h + 24; y < 744; y += 24) g.drawImage(tex[y > h + 48 ? T.STONE : T.DIRT], x, y, 24, 24); } }
  }
  const mpanel = (g, x, y, w, h, c) => { g.fillStyle = c || 'rgba(40,60,140,.85)'; g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill(); g.strokeStyle = '#0a0e28'; g.lineWidth = 3; g.stroke(); };
  const GREEN = ['rgba(40,120,60,.92)', '#3a9a4a'], BLUE = ['rgba(40,60,140,.85)', 'rgba(80,110,210,.95)'], RED = ['rgba(120,30,40,.85)', '#c8303a'], GREY = ['rgba(60,66,90,.85)', 'rgba(60,66,90,.85)'];
  function btn(g, b, label, C, key, size) { size = size || 22; mpanel(g, b.x, b.y, b.w, b.h, hover === key ? C[1] : C[0]); outlined(g, label, b.x + b.w / 2, b.y + b.h / 2 + size * .36, size, '#fff', 'center'); }
  // pick: singleplayer or multiplayer
  const PKB = { solo: { x: 440, y: 290, w: 400, h: 72 }, multi: { x: 440, y: 378, w: 400, h: 72 }, back: { x: 540, y: 470, w: 200, h: 54 } };
  function drawPick(g) {
    const v = K.view, W = worlds()[pickW]; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    mpanel(g, 390, 190, 500, 356); outlined(g, W ? W.name : 'World', 640, 240, 34, '#9cdc4a', 'center'); outlined(g, 'How do you want to play?', 640, 272, 17, '#e8f0ff', 'center');
    btn(g, PKB.solo, 'SINGLEPLAYER', GREEN, 'ps', 26); btn(g, PKB.multi, 'MULTIPLAYER', BLUE, 'pm', 26); btn(g, PKB.back, '◀ BACK', BLUE, 'pb', 20);
  }
  function pickDown(x, y) {
    if (inB(PKB.solo, x, y)) { flow = { next: 'solo', w: pickW }; mode = 'chars'; return; }
    if (inB(PKB.multi, x, y)) { flow = { next: 'host', w: pickW }; mode = 'chars'; return; }
    if (inB(PKB.back, x, y) || !inB({ x: 390, y: 190, w: 500, h: 356 }, x, y)) mode = 'menu';
  }
  // characters: 3 slots, each with its own look, inventory and progress
  const chars = () => { const s = K.save; if (!s.chars) { s.chars = []; if (s.sc && s.sc.inv) s.chars.push({ name: 'Hero', look: defLook(), ch: s.sc }); } return s.chars; };
  const CHB = { card: i => ({ x: 300, y: 196 + i * 104, w: 640, h: 90 }), play: i => ({ x: 800, y: 211 + i * 104, w: 124, h: 60 }), edit: i => ({ x: 960, y: 216 + i * 104, w: 100, h: 50 }), del: i => ({ x: 1070, y: 216 + i * 104, w: 110, h: 50 }), back: { x: 540, y: 528, w: 200, h: 56 } };
  function drawChars(g) {
    menuSky(g, true); const C = chars(), W = flow && flow.w >= 0 ? worlds()[flow.w] : null;
    outlined(g, 'CHOOSE YOUR CHARACTER', 640, 106, 52, '#9cdc4a', 'center');
    outlined(g, flow && flow.next === 'join' ? "Pick who joins your friend's world." : (W ? W.name : 'World') + '  ·  ' + (flow && flow.next === 'host' ? 'Multiplayer' : 'Singleplayer'), 640, 150, 20, '#fff', 'center');
    outlined(g, 'Each character keeps their own items and progress.', 640, 178, 15, '#e8f0ff', 'center');
    for (let i = 0; i < 3; i++) { const b = CHB.card(i), c = C[i];
      mpanel(g, b.x, b.y, b.w, b.h, !c && hover === 'cn' + i ? 'rgba(80,110,210,.95)' : 'rgba(40,60,140,.85)');
      if (c) { heroAt(g, b.x + 54, b.y + 84, 1.15, c.look); outlined(g, c.name, b.x + 104, b.y + 40, 28, c.ch.fallen ? '#9a9aa8' : '#fff'); { const q = cmOf(c.ch); outlined(g, c.ch.fallen ? 'Fallen ' + q.n : q.n, b.x + 484, b.y + 40, 16, c.ch.fallen ? '#8a8a98' : q.c, 'right'); } outlined(g, 'Life ' + c.ch.max + '  ·  ' + c.ch.inv.filter(Boolean).length + ' items' + (c.ch.armor || (c.ch.gear && SLOTS.some(k => c.ch.gear[k])) ? '  ·  armored' : ''), b.x + 104, b.y + 68, 15, '#cfd8ff');
        if (c.ch.fallen) btn(g, CHB.play(i), 'FALLEN', GREY, 'cpx' + i, 18); else btn(g, CHB.play(i), 'PLAY ▶', GREEN, 'cp' + i, 22); btn(g, CHB.edit(i), 'Edit', BLUE, 'ce' + i, 18); btn(g, CHB.del(i), 'Delete', RED, 'cx' + i, 18); }
      else outlined(g, '+  Create character (slot ' + (i + 1) + ')', b.x + 24, b.y + 54, 24, '#cfd8ff'); }
    btn(g, CHB.back, '◀ BACK', BLUE, 'cb', 20);
    if (confirmDelC != null && C[confirmDelC]) { const v = K.view; g.fillStyle = 'rgba(0,0,0,.72)'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); outlined(g, 'Delete ' + C[confirmDelC].name + ' forever?', 640, 330, 30, '#ff9a9a', 'center'); outlined(g, 'Their items and progress go too. Click Delete again to confirm, anywhere else to cancel.', 640, 370, 17, '#fff', 'center'); btn(g, CHB.del(confirmDelC), 'Delete', RED, 'cx' + confirmDelC, 18); }
  }
  function charsDown(x, y) {
    const C = chars();
    if (confirmDelC != null) { if (inB(CHB.del(confirmDelC), x, y)) { C.splice(confirmDelC, 1); K.persist(); } confirmDelC = null; return; }
    if (inB(CHB.back, x, y)) return backToMenu();
    for (let i = 0; i < 3; i++) { if (C[i]) { if (inB(CHB.play(i), x, y)) return playChar(i); if (inB(CHB.edit(i), x, y)) return openEdit(i); if (inB(CHB.del(i), x, y)) { confirmDelC = i; return; } } else if (inB(CHB.card(i), x, y)) return openEdit(C.length); }
  }
  function playChar(i) {
    const c = chars()[i]; if (!c || c.ch.fallen) return; cslot = i; ch = c.ch; look = c.look.slice(); K.save.sc = ch;
    fixGear(ch);
    if (!ch.axeGift) { ch.axeGift = 1; if (!ch.inv.some(s => s && IT[s.id] && IT[s.id].axe)) { const e = ch.inv.indexOf(null); if (e >= 0) ch.inv[e] = { id: 'cax', n: 1 }; } }
    if (flow.next === 'solo') { wslot = flow.w; net = null; others = new Map(); flow = null; return enterWorld(); }
    if (flow.next === 'host') { mode = 'hostcode'; hostTry = 0; waiting.clear(); return openWorld(); }
    joinDlg();
  }
  // the character editor: clothes, face and hair, each with colours
  const ROWS_BODY = [['SKIN', -1, null, 0, () => SKINS.map(s => s[0])], ['HAIR', 1, HAIRS, 2, () => HAIRC], ['FACE', 3, FACES, 4, () => EYEC], ['FACIAL HAIR', 12, BEARDS, -1, null]];
  const ROWS_OUTFIT = [['SHIRT', 5, TOPS, 6, () => CLOTHC], ['PANTS', 8, PANTS, 7, () => CLOTHC], ['SHOES', -1, null, 9, () => SHOEC], ['EXTRA', 10, EXTRAS, 11, () => CLOTHC]];
  const erows = () => edit && edit.tab ? ROWS_OUTFIT : ROWS_BODY, ETAB = { body: { x: 540, y: 200, w: 170, h: 44 }, outfit: { x: 720, y: 200, w: 170, h: 44 }, rnd: { x: 900, y: 200, w: 180, h: 44 } };
  function randomLook() { const pick = n => Math.floor(R() * n); return [pick(SKINS.length), pick(HAIRS.length), pick(HAIRC.length), pick(FACES.length), pick(EYEC.length), pick(TOPS.length), pick(CLOTHC.length), pick(CLOTHC.length), pick(PANTS.length), pick(SHOEC.length), R() < .5 ? 0 : pick(EXTRAS.length), pick(CLOTHC.length), R() < .6 ? 0 : pick(BEARDS.length)]; }
  const ER = k => 262 + k * 78, EB = { cm: { x: 110, y: 152, w: 360, h: 44 }, name: { x: 640, y: 136, w: 420, h: 50 }, save: { x: 560, y: 622, w: 320, h: 62 }, cancel: { x: 900, y: 622, w: 200, h: 62 } };
  function openEdit(i) { const c = chars()[i]; edit = { slot: i, isNew: !c, name: c ? c.name : HERO_NAMES[Math.floor(R() * HERO_NAMES.length)], look: c ? c.look.slice() : defLook(), tab: 0, cm: c ? c.ch.cm | 0 : 0 }; while (edit.look.length < 13) edit.look.push(defLook()[edit.look.length]); mode = 'edit'; }
  function drawEdit(g) {
    menuSky(g, false);
    outlined(g, edit.isNew ? 'CREATE CHARACTER' : 'EDIT CHARACTER', 640, 84, 48, '#9cdc4a', 'center');
    mpanel(g, 90, 136, 400, 470); { const q = CMODE[edit.cm]; if (edit.isNew) btn(g, EB.cm, '◀  ' + q.n.toUpperCase() + '  ▶', edit.cm === 2 ? RED : edit.cm === 1 ? GREEN : BLUE, 'ecm', 20); else outlined(g, q.n + ' character', 290, 182, 22, q.c, 'center'); outlined(g, q.d, 290, 222, 12, '#e8f0ff', 'center'); }
    heroAt(g, 290, 520, 3.4, edit.look); outlined(g, edit.name, 290, 580, 26, '#fff', 'center');
    outlined(g, 'NAME', 540, 170, 20, '#cfd8ff'); mpanel(g, EB.name.x, EB.name.y, EB.name.w, EB.name.h, hover === 'en' ? 'rgba(80,110,210,.95)' : 'rgba(20,30,80,.85)'); outlined(g, edit.name + '   ✎', EB.name.x + 16, EB.name.y + 33, 22, '#fff');
    btn(g, ETAB.body, 'BODY', edit.tab ? BLUE : GREEN, 'tb0', 20); btn(g, ETAB.outfit, 'OUTFIT', edit.tab ? GREEN : BLUE, 'tb1', 20); btn(g, ETAB.rnd, '🎲 RANDOM', BLUE, 'trnd', 20);
    erows().forEach(([lab, si, styles, ci, cols], k) => {
      const y0 = ER(k); outlined(g, lab, 540, y0 + 28, lab.length > 8 ? 16 : 20, '#cfd8ff');
      if (styles) { btn(g, { x: 640, y: y0, w: 44, h: 40 }, '◀', BLUE, 'el' + k, 20); btn(g, { x: 856, y: y0, w: 44, h: 40 }, '▶', BLUE, 'er' + k, 20); outlined(g, styles[edit.look[si]] || '', 770, y0 + 28, 20, '#ffe680', 'center'); outlined(g, `${(edit.look[si] | 0) + 1}/${styles.length}`, 912, y0 + 28, 14, '#8a96c8'); }
      if (ci < 0) return; const top = y0 + (styles ? 46 : 6); cols().forEach((c, j) => { const x = 640 + j * 36; g.fillStyle = c; g.fillRect(x, top, 30, 26); g.strokeStyle = edit.look[ci] === j ? '#ffe680' : '#0a0e28'; g.lineWidth = edit.look[ci] === j ? 4 : 2; g.strokeRect(x, top, 30, 26); });
    });
    btn(g, EB.save, edit.isNew ? 'CREATE CHARACTER' : 'SAVE CHANGES', GREEN, 'es', 22); btn(g, EB.cancel, 'CANCEL', BLUE, 'ec', 20);
  }
  function editDown(x, y) {
    if (inB(EB.save, x, y)) { const C = chars(); if (edit.isNew) C[edit.slot] = { name: edit.name, look: edit.look, ch: { ...newChar(), cm: edit.cm } }; else { C[edit.slot].name = edit.name; C[edit.slot].look = edit.look; } K.persist(); mode = 'chars'; return; }
    if (inB(EB.cancel, x, y)) { mode = 'chars'; return; }
    if (edit.isNew && inB(EB.cm, x, y)) { edit.cm = (edit.cm + (x < EB.cm.x + EB.cm.w / 2 ? 2 : 1)) % 3; K.sfx(500, .05, 'square', .04, 200); return; }
    if (inB(EB.name, x, y)) return renameDlg();
    if (inB(ETAB.body, x, y)) { edit.tab = 0; return; } if (inB(ETAB.outfit, x, y)) { edit.tab = 1; return; } if (inB(ETAB.rnd, x, y)) { edit.look = randomLook(); K.sfx(600, .05, 'square', .04, 200); return; }
    erows().forEach(([lab, si, styles, ci, cols], k) => {
      const y0 = ER(k); if (styles) { if (inB({ x: 640, y: y0, w: 44, h: 40 }, x, y)) edit.look[si] = (edit.look[si] + styles.length - 1) % styles.length; if (inB({ x: 856, y: y0, w: 44, h: 40 }, x, y)) edit.look[si] = (edit.look[si] + 1) % styles.length; }
      if (ci < 0) return; const top = y0 + (styles ? 46 : 6); cols().forEach((c, j) => { if (inB({ x: 640 + j * 36, y: top, w: 30, h: 26 }, x, y)) edit.look[ci] = j; });
    });
  }
  // the owner's world-code screen: open the world to friends, then enter it
  const HOB = { enter: { x: 440, y: 436, w: 400, h: 72 }, back: { x: 540, y: 526, w: 200, h: 54 } };
  const newCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };
  function openWorld() {
    const W = worlds()[flow.w]; if (!W) return backToMenu();
    if (!W.code) { W.code = newCode(); K.persist(); }   // each world keeps its code, so friends can reuse it
    $id('mp-name').value = cleanName(chars()[cslot] && chars()[cslot].name, 12); $id('mp-code').value = W.code; hostT = performance.now(); $id('mp-joingo').click();
  }
  function drawHost(g) {
    menuSky(g, true); const W = worlds()[flow.w], ready = inRoom() && MP.isHost(), el = performance.now() - hostT, failed = !inRoom() && el > 9000;
    if (inRoom() && !MP.isHost() && W && hostTry < 4) { hostTry++; MP.leave(); W.code = newCode(); K.persist(); openWorld(); }   // that code was taken: get a fresh one
    outlined(g, 'MULTIPLAYER', 640, 106, 52, '#9cdc4a', 'center'); outlined(g, (W ? W.name : 'World') + '  ·  playing as ' + (chars()[cslot] ? chars()[cslot].name : ''), 640, 150, 20, '#fff', 'center');
    mpanel(g, 320, 184, 640, 230); outlined(g, 'WORLD CODE', 640, 226, 20, '#cfd8ff', 'center');
    outlined(g, ready ? MP.code.split('').join(' ') : failed ? 'NO CONNECTION' : 'OPENING' + '.'.repeat(1 + Math.floor(el / 400) % 3), 640, 310, ready ? 78 : 34, ready ? '#ffe680' : failed ? '#ff9a9a' : '#fff', 'center');
    outlined(g, 'Friends press JOIN A WORLD on the menu and type this code.', 640, 356, 17, '#e8f0ff', 'center'); outlined(g, waiting.size ? waiting.size + (waiting.size > 1 ? ' friends are' : ' friend is') + ' waiting for you.' : 'They can join any time while you play.', 640, 384, 17, waiting.size ? '#7aff7a' : '#e8f0ff', 'center');
    btn(g, HOB.enter, failed ? 'TRY AGAIN' : 'ENTER WORLD ▶', ready || failed ? GREEN : GREY, 'he', 26); btn(g, HOB.back, '◀ BACK', BLUE, 'hb', 20);
  }
  function hostDown(x, y) {
    if (inB(HOB.back, x, y)) return backToMenu();
    if (!inB(HOB.enter, x, y)) return;
    if (!inRoom()) { hostTry = 0; return openWorld(); }
    if (!MP.isHost()) return;
    wslot = flow.w; net = { roster: [{ id: MP.id, name: MP.name, col: MP.colors[0], seat: 0 }] }; others = new Map(); flow = null; enterWorld();
    for (const [id, nm] of waiting) onJoin(id, nm); waiting.clear();   // friends who were already waiting come in now
  }
  // pixel-style pop-ups for typing (the page's .scr/.card screens, restyled to match the game)
  function dialog(id, html) {
    let d = $id(id); if (!d) { d = document.createElement('div'); d.className = 'scr'; d.id = id; d.style.zIndex = 20; document.body.appendChild(d); }
    d.innerHTML = '<div class="card">' + html + '</div>'; d.hidden = false;
    d.querySelectorAll('input').forEach(el => { el.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') { const go = d.querySelector('.big'); if (go) go.click(); } }; });
    return d;
  }
  const field = (id, ph, val, max) => '<input id="' + id + '" class="px-in" maxlength="' + max + '" autocomplete="off" placeholder="' + ph + '" value="' + val + '">';
  function renameDlg() {
    const d = dialog('rename', '<h2 class="title" style="font-size:40px">Character name</h2>' + field('rn-name', 'Name', cleanName(edit.name, 12), 12) + '<button class="big" id="rn-go">Done</button>');
    $id('rn-go').onclick = () => { edit.name = cleanName($id('rn-name').value, 12) || edit.name; d.hidden = true; };
    setTimeout(() => { const el = $id('rn-name'); if (el) { el.focus(); el.select(); } }, 50);
  }
  function joinDlg() {
    const d = dialog('joinc', '<h2 class="title" style="font-size:40px">Join a world</h2><p class="sub">Type the world code your friend sees on their screen.</p>' + field('jn-code', 'CODE', joinCode, 4) + '<button class="big" id="jn-go">Join world</button><div class="row"><button id="jn-x">Back</button></div><p class="hint" id="jn-msg"></p>');
    $id('jn-x').onclick = () => { d.hidden = true; };
    $id('jn-go').onclick = () => {
      const c = ($id('jn-code').value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length !== 4) { $id('jn-msg').textContent = 'World codes are 4 letters.'; return; }
      $id('mp-name').value = cleanName(chars()[cslot] && chars()[cslot].name, 12); $id('mp-code').value = c; joinCode = c; d.hidden = true; mode = 'joining'; joinT = performance.now(); $id('mp-joingo').click();
    };
    setTimeout(() => { const el = $id('jn-code'); if (el) el.focus(); }, 50);
  }
  function drawJoining(g) {
    menuSky(g, true); const el = performance.now() - joinT, dots = '.'.repeat(1 + Math.floor(el / 400) % 3), wait = inRoom() && !MP.isHost();
    outlined(g, (wait ? 'Waiting for the world owner' : "Joining your friend's world") + dots, 640, 320, 36, '#9cdc4a', 'center');
    outlined(g, wait ? 'You will come in as soon as they enter their world.' : 'World code ' + joinCode, 640, 366, 18, '#fff', 'center'); outlined(g, 'Click anywhere to cancel.', 640, 400, 16, '#cfd8ff', 'center');
    if (inRoom() && MP.isHost() && el > 2000) { MP.leave(); mode = 'menu'; note('No world is open with that code right now.'); }
    else if (!inRoom() && el > 12000) { mode = 'menu'; note('Could not connect. Check the code and try again.'); }
  }
  function cancelJoin() { if (inRoom()) MP.leave(); mode = 'menu'; }
  function hoverKey(x, y) {
    if (mode === 'pick') return inB(PKB.solo, x, y) ? 'ps' : inB(PKB.multi, x, y) ? 'pm' : inB(PKB.back, x, y) ? 'pb' : null;
    if (mode === 'chars') { if (inB(CHB.back, x, y)) return 'cb'; const C = chars(); for (let i = 0; i < 3; i++) { if (C[i]) { if (inB(CHB.play(i), x, y)) return 'cp' + i; if (inB(CHB.edit(i), x, y)) return 'ce' + i; if (inB(CHB.del(i), x, y)) return 'cx' + i; } else if (inB(CHB.card(i), x, y)) return 'cn' + i; } return null; }
    if (mode === 'edit') { if (edit && edit.isNew && inB(EB.cm, x, y)) return 'ecm'; if (inB(EB.save, x, y)) return 'es'; if (inB(EB.cancel, x, y)) return 'ec'; if (inB(EB.name, x, y)) return 'en'; if (inB(ETAB.body, x, y)) return 'tb0'; if (inB(ETAB.outfit, x, y)) return 'tb1'; if (inB(ETAB.rnd, x, y)) return 'trnd'; for (let k = 0; k < erows().length; k++) { if (inB({ x: 640, y: ER(k), w: 44, h: 40 }, x, y)) return 'el' + k; if (inB({ x: 856, y: ER(k), w: 44, h: 40 }, x, y)) return 'er' + k; } return null; }
    if (mode === 'hostcode') return inB(HOB.enter, x, y) ? 'he' : inB(HOB.back, x, y) ? 'hb' : null;
    return null;
  }
  // making a world: pick its name and size
  function createDialog(i) {
    let d = document.getElementById('wcreate');
    if (!d) {
      d = document.createElement('div'); d.className = 'scr'; d.id = 'wcreate'; d.style.zIndex = 20;
      d.innerHTML = '<div class="card"><h2 class="title" style="font-size:36px">New world</h2><p class="sub">Give it a name, a size and a difficulty.</p>' +
        '<input id="wc-name" maxlength="18" autocomplete="off" style="width:100%;padding:12px 14px;border-radius:14px;border:3px solid #0a0e28;background:rgba(10,16,48,.75);color:#fff;font-size:20px;margin:8px 0;text-align:center;user-select:text">' +
        '<div class="row" id="wc-size"></div><p class="hint" id="wc-desc"></p><div class="row" id="wc-diff"></div><p class="hint" id="wc-ddesc"></p><button class="big" id="wc-go" style="margin-top:12px">Create world</button><div class="row"><button id="wc-cancel">Cancel</button></div></div>';
      document.body.appendChild(d);
      d.querySelector('#wc-name').onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') d.querySelector('#wc-go').click(); };
    }
    let pickSize = 1040; const row = d.querySelector('#wc-size'), desc = d.querySelector('#wc-desc'), nm = d.querySelector('#wc-name');
    const paint = () => { row.innerHTML = ''; for (const [label, w] of SIZES) { const b = document.createElement('button'); b.textContent = label; b.dataset.w = w; if (w === pickSize) { b.style.background = 'var(--accent)'; b.style.color = '#10203a'; } b.onclick = () => { pickSize = w; paint(); }; row.appendChild(b); } desc.textContent = sizeName(pickSize) + ': ' + pickSize + ' tiles wide' + (pickSize === 360 ? ', quick to explore.' : pickSize === 760 ? ', lots to explore.' : ', the classic size.'); };
    let pickDf = 1; const drow = d.querySelector('#wc-diff'), ddesc = d.querySelector('#wc-ddesc');
    const paintDf = () => { drow.innerHTML = ''; DIFF.forEach((q, k) => { const b = document.createElement('button'); b.textContent = q.n; b.dataset.df = k; if (k === pickDf) { b.style.background = q.c; b.style.color = '#10203a'; } b.onclick = () => { pickDf = k; paintDf(); }; drow.appendChild(b); }); ddesc.textContent = DIFF[pickDf].n + ': ' + DIFF[pickDf].d; };
    paintDf();
    nm.value = pick(NAMES); paint(); d.hidden = false; setTimeout(() => nm.focus(), 50);
    d.querySelector('#wc-cancel').onclick = () => { d.hidden = true; };
    d.querySelector('#wc-go').onclick = () => { const name = (nm.value || '').replace(/[^\w .'-]/g, '').trim().slice(0, 18) || pick(NAMES); d.hidden = true; newWorld(i, name, pickSize, pickDf); playWorld(i); };
  }
  function onStart(cfg, roster) {
    net = MP.online() ? { roster } : null; others = new Map();
    if (net) for (const r of roster) if (r.id !== MP.id) others.set(r.id, { name: r.name, col: r.col, p: null });
    if (isHost()) { if (wslot < 0) wslot = worlds().length < 3 ? newWorld(worlds().length) : 0; enterWorld(); if (net) streamWorld(); }
    else { const keep = (mode === 'play' || mode === 'recv') && P ? (recv && recv.keep) || { x: P.x, y: P.y, hp: P.hp, mp: P.mp } : null; mode = 'recv'; recv = { parts: [], n: 0, name: cfg.name, keep }; }
  }
  function onResume(own) {
    if (!net) return; if (!own) { say('Reconnected. Waiting for the world host...', 4, '#9fe8ff'); return; }
    if (mode !== 'play') return; const ps = MP.roster(); others = new Map(); net.roster = ps.map((p, i) => ({ id: p.id, name: p.name, col: MP.colors[i % 8], seat: i }));
    for (const r of net.roster) if (r.id !== MP.id) { others.set(r.id, { name: r.name, col: r.col, p: null }); MP.to(r.id, { t: 'mp-start', cfg: { name: worlds()[wslot] ? worlds()[wslot].name : 'World', resync: 1 }, roster: net.roster }); }
    if (others.size) setTimeout(() => streamWorld(), 300); say('Reconnected.', 3, '#7aff7a');
  }
  // the owner came back under a new id: move their player over so they do not blink out
  function onOwnerBack(oldId, newId) { const o = others.get(oldId); if (o) { others.delete(oldId); others.set(newId, o); } }
  function streamWorld(to) {
    const s = JSON.stringify(packWorld()), size = 7000, n = Math.ceil(s.length / size);
    for (let i = 0; i < n; i++) { const m = { t: 'w', i, n, d: s.slice(i * size, (i + 1) * size) }; if (to) MP.to(to, m); else MP.send(m); }
  }
  function onJoin(id, name) { if (mode === 'play' && net && !isHost()) { others.set(id, { name, col: MP.colors[(others.size + 1) % 8], p: null }); if (!(MP.waitingForOwner && MP.waitingForOwner())) feedAdd(name + ' joined the world', '#7aff7a'); return; } if (mode === 'hostcode' && inRoom() && MP.isHost()) { waiting.set(id, name); return; }   // the owner has not entered yet
    if (mode !== 'play' || !isHost() || !net) return; const col = MP.colors[(others.size + 1) % 8]; others.set(id, { name, col, p: null }); net.roster.push({ id, name, col, seat: net.roster.length }); MP.to(id, { t: 'mp-start', cfg: { name: worlds()[wslot] ? worlds()[wslot].name : 'World' }, roster: net.roster }); setTimeout(() => streamWorld(id), 300); feedAdd(`${name} joined the world`, '#7aff7a'); }
  // when the host leaves (or the connection drops) the guest keeps the world, saved into a free slot if there is one
  function adopt(t) { if (wslot < 0 && worlds().length < 3) { worlds().push({ name: (recv && recv.name) || 'Shared World', made: Date.now(), ...packWorld(), played: Date.now() }); wslot = worlds().length - 1; K.persist(); t += ' It is saved in your world list.'; } say(t, 5, '#9fe8ff'); }
  function kicked(t) { saveAll(); net = null; others.clear(); closeChat(); if (inRoom()) MP.leave(); backToMenu(); menuNote = t; menuNoteUntil = performance.now() + 8000; }
  function onLeave(id) { if (id === -1) { if (mode === 'play' && wslot < 0) { kicked('Lost the connection to the world host.'); return; } net = null; others.clear(); if (mode === 'play') adopt('Disconnected. You are playing alone now.'); return; } waiting.delete(id); if (net && net.roster) net.roster = net.roster.filter(r => r.id !== id); const o = others.get(id); if (o) feedAdd(`${o.name} left the world`, '#ffb07a'); others.delete(id); }
  function onMsg(m) {
    const from = m.from ?? m.id; if (m.t === 'chat' && typeof m.s === 'string') { const o = others.get(from); feedAdd(String((o && o.name) || m.n || 'Someone').slice(0, 16) + ': ' + m.s.slice(0, 120), '#ffffff', 1); return; } if (m.t === 'bd' && typeof m.k === 'string') { brokenDeco.add(m.k); return; } if (m.t === 'dm') { feedAdd(String(m.s || '').slice(0, 90), '#ff8a8a'); return; }
    if (m.t === 'lq' && liq && mode === 'play') { for (const [i, a, k] of m.c || []) if (i >= 0 && i < liq.length) { liq[i] = a; lqk[i] = a ? k : 0; } return; }
    if (m.t === 'w' && mode === 'recv') { recv.parts[m.i] = m.d; recv.n = m.n; if (recv.parts.filter(Boolean).length === m.n) { unpackWorld(JSON.parse(recv.parts.join(''))); enterWorld(); if (recv.keep) { Object.assign(P, recv.keep); cam.x = P.x * TS - 640; cam.y = (P.y - 1.4) * TS - 380; say('Back in the world.', 3, '#7aff7a'); } else say(`Welcome to ${recv.name}!`, 4, '#7aff7a'); } return; }
    if (mode !== 'play') return;
    const o = others.get(from);
    if (m.t === 'bl' && typeof m.s === 'string') { say(m.s.slice(0, 80), 5, '#ff9aff'); return; }
    if (m.t === 'p' && o) { if (m.d && !o.dead) markBossDeath(from); o.hk = Array.isArray(m.hk) && m.hk.length === 3 && m.hk.every(Number.isFinite) ? m.hk : null; o.petK = typeof m.pt === 'string' && PETA[m.pt] ? m.pt : null; { const L = Array.isArray(m.mn) ? m.mn.filter(q => Array.isArray(q) && MINI[q[0]]) : []; o.mins = L.map((q, i) => { const prev = o.mins && o.mins[i] && o.mins[i].k === q[0] ? o.mins[i] : { k: q[0], x: q[1], y: q[2], t: Math.random() * 6, tr: [] }; prev.tx = q[1]; prev.ty = q[2]; prev.vx = q[3]; return prev; }); } if (m.lk) o.look = m.lk; o.p = o.p || { w: .8, h: 1.9 }; if (o.p.x == null) { o.p.x = m.x; o.p.y = m.y; } Object.assign(o.p, { tx: m.x, ty: m.y, vx: m.vx, vy: m.vy, ground: m.g }); o.face = m.f; o.sw = m.s; o.held = m.h; o.armor = m.a; o.dead = m.d; }
    else if (m.t === 'tl') set(m.x, m.y, m.v); else if (dropMsg(m, from)) {} else if (m.t === 'pv' && m.x >= 0 && m.y >= 0 && m.x < WW && m.y < WH) PVA()[m.y * WW + m.x] = m.v & 63;
    else if (m.t === 'chest') chests[m.key] = [];
    else if (m.t === 'cs') chests[m.key] = m.c || [];
    else if (m.t === 'wl') { if (walls && m.x >= 0 && m.x < WW && m.y >= 0 && m.y < WH) walls[m.y * WW + m.x] = m.v; }
    else if (m.t === 'pr') projs.push({ k: m.k, x: m.x, y: m.y, vx: m.vx, vy: m.vy, life: 2, c: m.c, hit: new Set() });
    else if (m.t === 'hit' && isHost()) { const e = ents.find(e => e.id === m.id); if (e) applyHit(e, m.d, m.kx, from); }
    else if (m.t === 'drop') drops.push({ id: m.id, n: m.n, x: m.x, y: m.y, vx: rnd(-3, 3), vy: -6, t: 0 });
    else if (m.t === 'sum' && isHost()) summon(m.k, m.x, m.y);
    else if (m.t === 'boss') { downed[m.k] = 1; bossDown(m.k); }
    else if (m.t === 'np' && !isHost()) { const seen = new Set(); for (const [id, k, nm, x, y, f, hp, max] of m.l) { if (!NPCS[k]) continue; seen.add(id); let n = npcs.find(n => n.id === id); if (!n) { n = newNpc(k, nm, x, y, null, hp); n.id = id; npcs.push(n); } if (hp < n.hp) n.inv = .3; n.tx = x; n.ty = y; n.face = f; n.hp = hp; n.max = max; n.nm = nm; } npcs = npcs.filter(n => seen.has(n.id)); }
    else if (m.t === 'nps') say(m.s, 4, m.c || '#9cdc4a');
    else if (m.t === 'hm') startHardmode(m.sd);
    else if (m.t === 'npt' && isHost()) { const n = npcs.find(n => n.id === m.id); if (n) n.talk = 4; }
    else if (m.t === 'e' && !isHost()) {
      time = m.time; const seen = new Set();
      for (const [id, kind, x, y, hp, max, rage] of m.l) { seen.add(id); let e = ents.find(e => e.id === id); if (!e) { e = { id, kind, x, y, vx: 0, vy: 0, w: KIND[kind].w, h: KIND[kind].h, t: 0, hit: 0, c: '#3aa0ff', fly: KIND[kind].fly }; ents.push(e); } e.tx = x; e.ty = y; e.hp = hp; e.max = max; e.rage = rage; }
      ents = ents.filter(e => seen.has(e.id));
    }
  }
  function enterWorld() { closeBook(); closeSettings(); minions = []; mapOpen = false; mapC = null; setTimeout(findTraps, 0); mode = 'play'; talk = null; shopK = null; rfOpen = false; rfItem = null; ents = []; drops = []; projs = []; pops = []; mine = null; invOpen = false; boss = null; won = null; dead = null; if (wslot >= 0 && isHost() && worlds()[wslot]) unpackWorld(worlds()[wslot]); newPlayer(); cam.x = P.x * TS - 640; cam.y = (P.y - 1.4) * TS - 380; computeLight(); if (online()) say('Online! Your friends share this world.', 4); }

  /* ---------- the loop ---------- */
  let openCh = null, hoverChest = -1, autoDoors = [], rfOpen = false, rfItem = null;   // the chest you have open, and doors that opened as you walked into them
  let upPending = false, anim = 0, mx = 640, my = 360, held = null, useHeld = false, firstUse = false, hint = null, hoverSlot = -1, lastClick = { i: -1, t: 0 };
  function update(dt) {
    anim += dt; if (msg && (msg.k += dt) > msg.d) msg = null; for (const p of pops) p.t += dt; pops = pops.filter(p => p.t < 1);
    if (mode !== 'play') return;
    if (isHost()) time += dt / 600;
    if (won) { won.t += dt; if (won.t > 6 && !won.over) { won.over = 1; saveAll(); K.over({ title: 'The Ember Lord is defeated!', text: `You conquered all four bosses. Score ${score}. Your world and character are saved: keep playing any time.`, delay: 100 }); } }
    if (dead) { dead.t += dt; if (dead.perm) { if (dead.t > 5) { dead = null; saveAll(); backToMenu(); menuNote = 'That Ironheart character has fallen.'; menuNoteUntil = performance.now() + 6000; return; } } else if (dead.t > DFX().resp) { dead = null; P.hp = ch.max; P.x = P.spawn.x; P.y = P.spawn.y; P.vx = P.vy = 0; unstick(P); } }
    else {
      const ice = P.ground && at(Math.floor(P.x), Math.floor(P.y + .05)) === T.ICE && !(ch.acc || []).includes('frostgrip'), acc = P.ground ? (ice ? 20 : 60) : 30, mxs = 9.5 * (1 + B().speed) * (P.webbed > 0 ? .4 : 1), dir = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
      if (dir) { P.vx += dir * acc * dt; P.face = dir; } else P.vx *= P.ground ? Math.pow(ice ? .4 : .0001, dt) : Math.pow(.3, dt);
      if (!(P.dashT > 0)) P.vx = clamp(P.vx, -mxs, mxs);
      const gr0 = P.ground; if (keys.j && P.ground) { P.vy = -20.5; P.ground = false; K.sfx(240, .05, 'square', .04, 120); }
      { const A = ch.acc || [], wings = A.includes('prismwings') || A.includes('gloomwings'), jp = keys.j && !P.jPrev; P.jPrev = keys.j;
        if (gr0) { P.fuel = wings ? 2.4 : 1.2; P.dj = 0; P.fly = 0; }
        else if (jp) { if (A.includes('gustjar') && !P.dj) { P.dj = 1; P.vy = -18; K.sfx(520, .08, 'sine', .05, 300); K.burst(scrX(sx(P.x)), scrY(sy(P.y)), ['#ffffff', '#cfeeff'], 8, 120, { life: .4, size: 4, gravity: 0 }); } P.fly = 1; }
        if (!P.ground && P.fly && keys.j && (wings || A.includes('emberboots')) && P.fuel > 0 && !jp) { P.fuel -= dt; P.vy = Math.max(P.vy - (wings ? 100 : 80) * dt, wings ? -11 : -9); if (R() < dt * 30) K.burst(scrX(sx(P.x)), scrY(sy(P.y - .4)), wings ? (A.includes('prismwings') ? ['#ff9aff', '#9af4ff', '#ffffff'] : ['#9a5ae8', '#3a1a4a']) : ['#ffb04a', '#ff6a2a'], 2, 90, { life: .35, size: 3, gravity: 200 }); }
        else if (!P.ground && keys.j && wings && P.vy > 3) P.vy = 3;   // wings glide once their flight runs out
        if (P.dashT > 0) P.dashT -= dt; if (P.dashCd > 0) P.dashCd -= dt; }
      if (!keys.j && P.vy < -6) P.vy *= Math.pow(.02, dt);
      { const wk = lqAt(P.x, P.y - 1) || lqAt(P.x, P.y - .2);
        if (wk === 1) { if (keys.j) P.vy = Math.max(-9, P.vy - 80 * dt); P.vy = Math.min(P.vy, 5); P.vx *= Math.pow(.3, dt); P.burn = 0; }
        else if (wk === 3) { if (keys.j) P.vy = Math.max(-4, P.vy - 30 * dt); P.vy = Math.min(P.vy, 2.5); P.vx *= Math.pow(.03, dt); P.burn = 0; }
        else if (wk === 2) { if (keys.j) P.vy = Math.max(-6, P.vy - 50 * dt); P.vy = Math.min(P.vy, 4); P.vx *= Math.pow(.12, dt); hurt(32, P.x, 'lava'); P.burn = 5; } }
      if (P.burn > 0) { P.burn -= dt; if ((P.burnT = (P.burnT || 0) - dt) <= 0) { P.burnT = .5; P.hp -= 3; pops.push({ x: P.x, y: P.y - 3, t: 0, s: '-3', c: '#ff9a3a' }); if (P.hp <= 0) { P.hp = 1; P.inv = 0; hurt(9999, P.x, 'burn'); } } }
      if (at(Math.floor(P.x), Math.floor(P.y - 1)) === T.COBWEB || at(Math.floor(P.x), Math.floor(P.y - 1.6)) === T.COBWEB) { P.webbed = Math.max(P.webbed || 0, .3); P.vy = Math.min(P.vy, 3); }
      if (P.webbed > 0) P.webbed -= dt;
      if (keys.j && P.vy > 3 && (ch.acc || []).includes('sunfeather')) P.vy = 3;   // gliding
      if (P.hook) { const H = P.hook; if (H.st === 'fly') { for (let k = 0; k < 4 && H.st === 'fly'; k++) { H.x += H.vx * dt / 4; H.y += H.vy * dt / 4; if (solid(H.x, H.y)) { H.st = 'hold'; K.sfx(260, .05, 'square', .05); } } if (H.st === 'fly' && Math.hypot(H.x - P.x, H.y - P.y + 1.2) > 14) P.hook = null; }
        else if (!solid(H.x, H.y) || (keys.j && !P.hookJ)) { if (keys.j) P.vy = Math.min(P.vy, -12); P.hook = null; }
        else { const dx = H.x - P.x, dy = H.y - (P.y - 1), d = Math.hypot(dx, dy); if (d > 1.1) { P.vx = dx / d * 24; P.vy = dy / d * 24; } else { P.vx = 0; P.vy = -48 * dt; } P.dj = 0; P.fly = 0; P.fuel = Math.max(P.fuel || 0, .6); } }
      P.hookJ = keys.j; stepBob(dt);
      P.drop = !!keys.d; autoDoor(); if (openCh && (!invOpen || !chestOk())) openCh = null; if (talk) { const tn = npcs.find(n => n.id === talk.id); if (!tn || dead || Math.hypot(tn.x - P.x, tn.y - P.y) > 9) { talk = null; shopK = null; } } if (shopK && !invOpen) shopK = null; if (rfOpen && (!invOpen || !talk)) rfClose(); const vy0 = P.vy; moveBody(P, dt); if (P.ground && vy0 > 12) K.burst(scrX(sx(P.x)), scrY(sy(P.y)), ['#a08060', '#7a5a40'], Math.min(10, Math.round(vy0 / 3)), 90, { life: .35, size: 3, gravity: 300 }); if (P.ground && Math.abs(P.vx) > 7 && R() < dt * 6) K.burst(scrX(sx(P.x - P.face * .4)), scrY(sy(P.y)), ['#b09070'], 2, 40, { life: .3, size: 2, gravity: 120 }); if (P.ground && vy0 > 25) hurt(Math.round((vy0 - 25) * 6), P.x, 'fall');
      if (P.y > HELL + 1 && !anyGear() && R() < dt * .3) hurt(4, P.x);
      if (useHeld) { const wx = (wmx() + cam.x) / TS, wy = (wmy() + cam.y) / TS; use(Math.floor(wx), Math.floor(wy), wx, wy, dt, firstUse ? true : 'hold'); firstUse = false; if (upPending) { upPending = false; useHeld = false; } } else mine = null;
    }
    if ((zoneT -= dt) <= 0) { zoneT = .5; zone = zoneAt(P); }
    try { musicTick(dt); } catch (er) {}
    if (hard && isHost() && !demo && (spreadT -= dt) <= 0) { spreadT = 1; spread(); }
    if (temple && !dead) { for (const k of [[-.3, -.2], [.3, -.2], [-.3, -1.2], [.3, -1.2]]) if (at(Math.floor(P.x + k[0]), Math.floor(P.y + k[1])) === T.SPIKE) { hurt(30, P.x - P.vx, 'spike'); break; } }
    if (temple && temple.arena && isHost()) { const inside = allPlayers().some(inArena); if (inside && !arenaWas && !ents.some(q => KIND[q.kind].boss)) { const A = temple.arena; say('The Weaver Queen descends!', 4, '#ff7aff'); K.sfx(60, 1.4, 'sawtooth', .12, 30); K.shake(14); boss = spawnEnemy('weaver', (A.x0 + A.x1) / 2, A.y0 + 6); } arenaWas = inside; }
    if (temple && isHost()) for (const tr of traps) { if ((tr.cd -= dt) > 0) continue; if (at(tr.x, tr.y) !== T.DTRAP) { tr.cd = 99; continue; } for (const pl of allPlayers()) { const ddx = pl.x - (tr.x + .5); if (Math.sign(ddx) === tr.d && Math.abs(ddx) < 16 && Math.abs(pl.y - 1.2 - (tr.y + .5)) < 1.6) { spawnEnemy('dart', tr.x + .5 + tr.d * .9, tr.y + .5, { vx: tr.d * 22, vy: 0, life: 1.6 }); tr.cd = 1.8; K.sfx(700, .05, 'square', .05, -300); break; } } }
    if ((revT -= dt) <= 0) { revT = .2; reveal(P.x, P.y - 1.4, 17); }
    if (P.inv > 0) P.inv -= dt; if (P.swing > 0) P.swing -= dt; if (P.cd > 0) P.cd -= dt; if (P.potCd > 0) P.potCd -= dt; if (P.homeCd > 0) P.homeCd -= dt;
    if (!held || !IT[held.id].coin) foldCoins();
    if (ch.pet && PETA[IT[ch.pet] && IT[ch.pet].pet] && !dead) { if (!myPet || myPet.k !== IT[ch.pet].pet) myPet = newPet(IT[ch.pet].pet, P.x - P.face * 1.5, P.y - 1); stepPet(myPet, P, P.face, dt); } else myPet = null;
    for (const [, o] of others) { if (o.petK && PETA[o.petK] && o.p && o.p.x != null && !o.dead) { if (!o.pet || o.pet.k !== o.petK) o.pet = newPet(o.petK, o.p.x, o.p.y - 1); stepPet(o.pet, o.p, o.face || 1, dt); } else o.pet = null; } if (tHold && (invOpen || dead)) torchOff();
    if (!dead) { if (P.hp < ch.max && P.inv <= 0) P.hp = Math.min(ch.max, P.hp + dt * (Math.abs(P.vx) < .5 ? 2.4 : .9) * (1 + B().regen)); P.mp = Math.min(maxMana(), P.mp + dt * 4); }
    if (P.buffs) for (const k in P.buffs) if ((P.buffs[k] -= dt) <= 0) { delete P.buffs[k]; say((BUFFS[k] ? BUFFS[k].n : 'A potion') + ' wore off.', 2, '#cfd8ff'); }
    if (isHost() && (farT = (farT || 0) + dt) > 2) { farT = 0; const pls = allPlayers(); for (const e of ents) if (natural(e) && !pls.some(p => Math.abs(p.x - e.x) < 110 && Math.abs(p.y - e.y) < 80)) e.dead = 1; }
    if (isHost()) { spawnLoop(dt); for (const e of ents) { enemyAI(e, dt); if (!KIND[e.kind].proj && !KIND[e.kind].boss && lqAt(e.x, e.y - .3) === 2 && ((e.lavaT = (e.lavaT || 0) - dt) <= 0)) { e.lavaT = .5; hitEnemy(e, 20, 0, 1); } } }
    else for (const e of ents) { if (e.tx != null) { e.x += (e.tx - e.x) * Math.min(1, dt * 12); e.y += (e.ty - e.y) * Math.min(1, dt * 12); } e.t += dt; if (e.hit > 0) e.hit -= dt; }
    stepNpcs(dt);
    for (const e of ents) if (Math.abs(P.x - e.x) < (P.w + e.w) / 2 && P.y - P.h < bot(e) && top(e) < P.y) { hurt(KIND[e.kind].dmg * (e.rage ? 1.25 : 1) * (hard && !KIND[e.kind].boss ? 1.6 : 1), e.x, e.kind); if (e.kind === 'web') P.webbed = 2.2; if (KIND[e.kind].proj && isHost()) e.dead = 1; }
    ents = ents.filter(e => !e.dead);
    stepProjs(dt); stepMinions(dt);
    lqAcc += dt; let lqn = 0; while (lqAcc >= .05 && lqn < 3) { lqAcc -= .05; lqn++; stepLiquids(); }
    for (const d of drops) if (lqAt(d.x, d.y) === 2 && d.id !== 'obsidian') { d.dead = 1; K.sfx(200, .1, 'sawtooth', .03, -100); }
    for (const d of drops) { d.t += dt; const dx = P.x - d.x, dy = P.y - 1 - d.y, dd = Math.hypot(dx, dy); if (dd < 4 && d.t > .4 && !dead && roomFor(d.id)) { d.x += dx / dd * 14 * dt; d.y += dy / dd * 14 * dt; if (dd < .8 && takeDrop(d)) { d.dead = 1; pickTxt(d.id, d.n); K.sfx(900, .04, 'square', .04); } } else { d.vy += 30 * dt; { const nx = d.x + d.vx * dt; if (solid(nx, d.y - .15)) d.vx = 0; else d.x = nx; } d.vx *= .95; const ny = d.y + d.vy * dt; if (solid(d.x, ny)) { if (d.vy > 0) d.y = Math.floor(ny) - .01; d.vy = 0; } else d.y = ny; } }
    drops = drops.filter(d => !d.dead && d.t < 300);
    for (const [, o] of others) if (o.p && o.p.tx != null) { o.p.x += (o.p.tx - o.p.x) * Math.min(1, dt * 12); o.p.y += (o.p.ty - o.p.y) * Math.min(1, dt * 12); }
    if (online()) {
      if ((sendT -= dt) <= 0) { sendT = .1; const s = cur(); MP.send({ t: 'p', lk: look, x: +P.x.toFixed(2), y: +P.y.toFixed(2), vx: +P.vx.toFixed(1), vy: +P.vy.toFixed(1), g: P.ground, f: P.face, s: P.swing > 0 ? +P.swing.toFixed(2) : 0, h: s && s.id, a: gear(), d: !!dead, pt: ch.pet && IT[ch.pet] ? IT[ch.pet].pet : 0, hk: P.hook ? [+P.hook.x.toFixed(2), +P.hook.y.toFixed(2), P.hook.st === 'hold' ? 1 : 0] : 0, mn: minions.length ? minions.map(m => [m.k, +m.x.toFixed(1), +m.y.toFixed(1), m.vx < 0 ? -1 : 1]) : 0 }); }
      if (isHost() && (eSendT -= dt) <= 0) { eSendT = .12; if (npcs.length) MP.send({ t: 'np', l: npcs.map(n => [n.id, n.k, n.nm, +n.x.toFixed(2), +n.y.toFixed(2), n.face, Math.round(n.hp), n.max]) }); MP.send({ t: 'e', time, l: ents.slice(0, 40).map(e => [e.id, e.kind, +e.x.toFixed(2), +e.y.toFixed(2), Math.round(e.hp), Math.round(e.max), e.rage ? 1 : 0]) }); }
    }
    const tx = P.x * TS - 640, ty = (P.y - 1.4) * TS - 380; cam.x += (tx - cam.x) * Math.min(1, dt * 10); cam.y += (ty - cam.y) * Math.min(1, dt * 10);
    { const v = WV(); cam.x = clamp(cam.x, -v.x0, WW * TS - v.x1); cam.y = clamp(cam.y, -200 - v.y0, WH * TS - v.y1); }
    if (isHost()) grassTick(dt);
    computeLight();
    hint = null;
    if ((saveT += dt) > 20 && !demo) { saveT = 0; saveAll(); }
  }

  /* ---------- kit hooks ---------- */
  GAME.reset = () => {
    if (typeof MP !== 'undefined') { if (MP.online() && mode !== 'joining' && mode !== 'menu') MP.leave(); MP.hide(); }   // leaving a world ends its invite
    demo = !!K.bot; keys = {}; held = null; useHeld = false; others = new Map(); net = null;
    touch = MOBILE;
    // on phones the sound button would sit right on top of the jump button, so it moves up beside pause
    { const m = document.getElementById('bMute'); if (m && touch) Object.assign(m.style, { top: '10px', left: '60px', right: 'auto', bottom: 'auto', width: '40px', height: '40px' }); }
    if (!Object.keys(tex).length) makeTex();
    ch = demo ? newChar() : (K.save.sc && K.save.sc.inv ? K.save.sc : newChar());
    sel = 0; score = 0;
    if (demo) { wslot = -1; WW = 520; gen(); time = .1; downed = {}; mode = 'play'; talk = null; shopK = null; rfOpen = false; rfItem = null; ents = []; drops = []; projs = []; pops = []; newPlayer(); ch.inv[4] = { id: 'wbow', n: 1 }; ch.inv[5] = { id: 'arrow', n: 99 }; cam.x = P.x * TS - 640; cam.y = (P.y - 1.4) * TS - 380; computeLight(); return; }
    mode = 'menu'; wslot = -1; cslot = -1; look = defLook(); netReady();
  };
  let posed = false;
  GAME.pose = () => {
    posed = true; const c = GAME.test.cave(18); if (!c) return; const [x, y] = c;
    for (const dx of [-7, -3, 4, 8]) for (let yy = y - 1; yy > y - 6; yy--) if (at(x + dx, yy) === T.AIR && walls[yy * WW + x + dx]) { set(x + dx, yy - 1 > 0 && at(x + dx, yy - 1) === T.AIR ? yy - 1 : yy, T.TORCH); break; }
    for (const dx of [2, 3, -2]) if (at(x + dx, y) === T.AIR && SOLID.has(at(x + dx, y + 1))) { set(x + dx, y, T.GCHEST); break; }
    for (let dx = -10; dx <= 10; dx++) for (let dy = -4; dy <= 6; dy++) if (at(x + dx, y + dy) === T.STONE && R() < .12) set(x + dx, y + dy, pick([T.GOLD, T.SILVER, T.COPPER, T.IRON]));
    ch.inv[0] = { id: 'hsword', n: 1 }; sel = 0; ch.gear = { head: 'ghelm', body: 'garmor', legs: 'glegs' }; P.face = 1; P.swing = .2; P.hp = 80; P.inv = 0;
    ents = []; spawnEnemy('skeleton', P.x + 4.5, P.y); spawnEnemy('bat', P.x - 4, P.y - 4); spawnEnemy('slime', P.x + 7, P.y);
    projs.push({ k: 'flame', x: P.x + 2.5, y: P.y - 2, vx: 1, vy: 0, life: 9, hit: new Set() }); cam.x = P.x * TS - 640; cam.y = (P.y - 1.4) * TS - 380; computeLight();
  };
  GAME.update = dt => { if ((hbOpen || setOpen) && !online()) return; if (mapOpen && !online()) { anim += dt; return; } if (posed) { anim += dt; computeLight(); return; } if (upright() && mode === 'play') { anim += dt; keys = {}; useHeld = false; return; } update(Math.min(dt, 1 / 30)); };
  GAME.draw = g => {
    if (mode === 'joining') return drawJoining(g);
    if (mode === 'pick') { drawMenu(g); return drawPick(g); }
    if (mode === 'chars') return drawChars(g);
    if (mode === 'edit') return drawEdit(g);
    if (mode === 'hostcode') return drawHost(g);
    if (mode === 'menu' || mode === 'lobby') return drawMenu(g);
    if (mode === 'recv') { g.fillStyle = '#10203a'; cover(g); outlined(g, `Receiving ${recv.name}...`, 640, 330, 32, '#9cdc4a', 'center'); outlined(g, `${recv.parts.filter(Boolean).length} of ${recv.n || '?'} pieces`, 640, 380, 20, '#fff', 'center'); return; }
    sky(g);
    { const v = K.view, under = P && P.y > surf[clamp(Math.floor(P.x), 0, WW - 1)] + 12; if (!under && zone.radiant) { g.fillStyle = 'rgba(255,160,250,.24)'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); } else if (!under && zone.blight) { g.fillStyle = 'rgba(70,20,90,.28)'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); } else if (!under && zone.snow) { g.fillStyle = 'rgba(225,240,255,.18)'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); } }
    g.save(); { const z = ZOOM(); g.translate(640 * (1 - z), 360 * (1 - z)); g.scale(z, z); } drawTiles(g);
    for (const d of drops) { const X = sx(d.x), Y = sy(d.y) - 8 + Math.sin(anim * 4 + d.x) * 2, r = IT[d.id].r || 0; if (r) { const gr = g.createRadialGradient(X, Y, 1, X, Y, 18); gr.addColorStop(0, RAR[r] + '88'); gr.addColorStop(1, RAR[r] + '00'); g.fillStyle = gr; g.fillRect(X - 18, Y - 18, 36, 36); } icon(g, d.id, X, Y, 1.2); }
    for (const e of ents) drawEnemy(g, e);
    drawMinions(g); drawNpcs(g); for (const [, o] of others) if (o.pet) drawPet(g, o.pet); if (myPet && !dead) drawPet(g, myPet);
    for (const [, o] of others) if (o.p && o.p.x != null && !o.dead) drawHero(g, o.p, o.name, o.armor, o.held, o.sw, o.face || 1, false, o.col, null, o.look);
    if (!dead) { const s = cur(); const hx = sx(P.x), hy = sy(P.y) - 30, dd = Math.hypot(wmx() - hx, wmy() - hy) || 1; drawHero(g, P, online() ? MP.name : null, gear(), s && s.id, P.swing, P.face, P.inv > 0 && Math.floor(anim * 20) % 2, null, [(wmx() - hx) / dd, (wmy() - hy) / dd], look); }
    if (P && P.hook && !dead) drawHook(g, P.x, P.y, P.hook.x, P.hook.y, P.hook.st === 'hold');
    for (const [, o] of others) if (o.p && o.p.x != null && Array.isArray(o.hk) && !o.dead) drawHook(g, o.p.x, o.p.y, o.hk[0], o.hk[1], o.hk[2]);
    drawBob(g);
    drawProjs(g); drawLight(g); if (!dead) drawPicks(g, 1 / 60);
    { const d = time % 1, k = d > .5 && d < .66 ? Math.sin((d - .5) / .16 * Math.PI) : d < .09 ? Math.sin(Math.min(1, (d + .01) / .1) * Math.PI) * .7 : 0; if (k > 0 && P && P.y < surf[clamp(Math.floor(P.x), 0, WW - 1)] + 15) { const v = WV(); g.fillStyle = `rgba(255,110,50,${(.14 * k).toFixed(3)})`; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); } }
    if (zone.snow && P && P.y < surf[clamp(Math.floor(P.x), 0, WW - 1)] + 6) { const v = WV(); if (flakes.length < 60) flakes.push({ x: rnd(v.x0, v.x1), y: v.y0 - rnd(0, 300), s: rnd(1.5, 3.5) }); g.fillStyle = 'rgba(255,255,255,.85)';
      for (const f of flakes) { f.y += f.s * .9; f.x += Math.sin(anim * 1.5 + f.s * 7) * .6; if (f.y > v.y1) { f.y = v.y0 - 4; f.x = rnd(v.x0, v.x1); } g.fillRect(f.x, f.y, f.s, f.s); } } else flakes.length = 0;
    if (!(invOpen && (bag() || overUI(mx, my))) && (!touch || kbd) && !posed) { const tx = Math.floor((wmx() + cam.x) / TS), ty = Math.floor((wmy() + cam.y) / TS); if (reach(tx, ty)) { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.strokeRect(sx(tx) + 1, sy(ty) + 1, TS - 2, TS - 2); } }
    g.restore();
    if (dead) { g.fillStyle = 'rgba(60,0,0,.35)'; cover(g); { const m = dead.msg || 'You were slain.'; g.font = `40px ${PXF}`; const sz = Math.min(40, Math.floor(40 * 1100 / Math.max(1, g.measureText(m).width))); outlined(g, m, 640, 340, sz, '#ff6a6a', 'center'); } outlined(g, dead.perm ? 'Their tale ends here.' : 'Back in ' + Math.max(1, Math.ceil(DFX().resp - dead.t)) + '...', 640, 384, 22, '#ffd0d0', 'center'); }
    if (won && won.t < 6) outlined(g, 'VICTORY', 640, 300, 56, '#ffd23f', 'center');
    if (!posed) hud(g); drawFeed(g, 1 / 60); if (invOpen) inventory(g); if (talk && !mapOpen) drawTalk(g); if (mobOn()) mobUI(g);
    if (mapOpen) drawMap(g);
    if (upright()) turnCard(g);
  };
  function turnCard(g) {
    const v = K.view; g.fillStyle = 'rgba(8,12,34,.94)'; cover(g);
    g.save(); g.translate(640, 330); g.rotate(-Math.PI / 2 * clamp((anim % 2.4) / .8 - .5, 0, 1)); g.strokeStyle = '#9cdc4a'; g.lineWidth = 10; g.beginPath(); g.roundRect(-70, -130, 140, 260, 22); g.stroke(); g.fillStyle = '#9cdc4a'; g.fillRect(-20, 100, 40, 8); g.restore();
    outlined(g, 'Turn your phone sideways', 640, 560, 64, '#fff', 'center'); outlined(g, 'Strata plays in landscape', 640, 640, 42, '#cfd8ff', 'center');
  }
  const inB = (b, x, y) => b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  const mob = { stick: null, sx: 0, sy: 0, dx: 0, dy: 0, jump: null };
  const mobOn = () => touch && !kbd && mode === 'play' && !posed && !mapOpen && !upright() && !(invOpen && bag()) && !hbOpen && !setOpen;
  const MB_ = () => { const v = K.view, b = v.y1 - 150; return { stick: { cx: v.x0 + 150, cy: b, r: 92 }, jump: { cx: v.x1 - 120, cy: b + 10, r: 70 },
    btn: [['bag', 'BAG'], ['map', 'MAP'], ['heal', 'HEAL'], ...(online() ? [['chat', 'CHAT']] : [])].map(([k, l], i) => ({ k, l, x: v.x1 - 104, y: v.y0 + 150 + i * 78, w: 88, h: 64 })) }; };
  function mobUI(g) { const M = MB_(), S = M.stick; g.save(); g.globalAlpha = .9;
    g.fillStyle = 'rgba(20,30,70,.45)'; g.beginPath(); g.arc(S.cx, S.cy, S.r, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.stroke();
    for (const [a, t] of [[Math.PI, '◀'], [0, '▶'], [Math.PI / 2, '▼']]) outlined(g, t, S.cx + Math.cos(a) * S.r * .7, S.cy + Math.sin(a) * S.r * .7 + 8, 22, 'rgba(255,255,255,.7)', 'center');
    const kx = S.cx + mob.dx, ky = S.cy + mob.dy; g.fillStyle = mob.stick != null ? 'rgba(160,190,255,.85)' : 'rgba(120,150,230,.6)'; g.beginPath(); g.arc(kx, ky, 38, 0, 7); g.fill(); g.strokeStyle = '#0a0e28'; g.lineWidth = 3; g.stroke();
    const J = M.jump; g.fillStyle = mob.jump != null ? 'rgba(120,220,120,.85)' : 'rgba(40,120,60,.6)'; g.beginPath(); g.arc(J.cx, J.cy, J.r, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.45)'; g.stroke(); outlined(g, 'JUMP', J.cx, J.cy + 9, 26, '#fff', 'center');
    for (const b of M.btn) { g.fillStyle = 'rgba(40,60,140,.62)'; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 14); g.fill(); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.stroke(); outlined(g, b.l, b.x + b.w / 2, b.y + b.h / 2 + 8, 20, '#fff', 'center'); if (b.k === 'heal') { const n = ch.inv.reduce((a, s) => a + (s && s.id === 'potion' ? s.n : 0), 0); outlined(g, '' + n, b.x + b.w - 8, b.y + 18, 14, '#ffe680', 'right'); } }
    g.restore(); }
  function mobStick(x, y) { const S = MB_().stick; let dx = x - S.cx, dy = y - S.cy; const d = Math.hypot(dx, dy), m = S.r * .75; if (d > m) { dx *= m / d; dy *= m / d; } mob.dx = dx; mob.dy = dy; keys.l = dx < -20; keys.r = dx > 20; keys.d = dy > 42 && Math.abs(dx) < 50; }
  function mobDown(x, y, ev) { if (!mobOn()) return false; const M = MB_(), id = ev ? ev.pointerId : 0;
    if (Math.hypot(x - M.stick.cx, y - M.stick.cy) < M.stick.r + 40) { mob.stick = id; mobStick(x, y); return true; }
    if (Math.hypot(x - M.jump.cx, y - M.jump.cy) < M.jump.r + 20) { mob.jump = id; keys.j = true; return true; }
    for (const b of M.btn) if (inB(b, x, y)) { if (b.k === 'bag') toggleInv(); else if (b.k === 'map') toggleMap(); else if (b.k === 'heal') GAME.key(KB().potion, true); else if (b.k === 'chat') { openChat(); const el = document.getElementById('chatIn'); if (el) el.focus(); } return true; }
    return false; }
  function mobUp(ev) { const id = ev ? ev.pointerId : 0; let hit = false; if (mob.stick != null && (id === mob.stick || !ev)) { mob.stick = null; mob.dx = mob.dy = 0; keys.l = keys.r = keys.d = false; hit = true; } if (mob.jump != null && (id === mob.jump || !ev)) { mob.jump = null; keys.j = false; hit = true; } return hit; }
  let tPtr = {}, usePtr = null, kbd = false;   // kbd: a keyboard or mouse is in use, even on a touchscreen laptop
  const bag = () => touch && !kbd && !openCh && !shopK && !rfOpen;   // the full-screen bag is only for fingers
  GAME.down = (x, y, ev) => {
    K.audio && K.audio(); const pmx = mx, pmy = my; mx = x; my = y; if (ev && ev.pointerType === 'mouse') kbd = true;
    if (mode === 'joining') return cancelJoin();
    if (mode === 'pick') return pickDown(x, y);
    if (mode === 'chars') return charsDown(x, y);
    if (mode === 'edit') return editDown(x, y);
    if (mode === 'hostcode') return hostDown(x, y);
    if (mode === 'menu') {
      if (confirmDel != null) { if (inB(MB.del(confirmDel), x, y)) { worlds().splice(confirmDel, 1); K.persist(); } confirmDel = null; return; }
      for (let i = 0; i < 3; i++) { if (worlds()[i] && inB(MB.del(i), x, y)) { confirmDel = i; return; } if (inB(MB.worlds(i), x, y)) return chooseWorld(worlds()[i] ? i : worlds().length); }
      if (inB(MB.join, x, y)) return openJoin();
      return;
    }
    if (mode !== 'play' || upright()) return;
    if (mapOpen) { mapDrag = { x, y, c: mapC.slice() }; return; }
    if (talk && talkDown(x, y)) return;
    if (invOpen && bag()) return bagDown(x, y);
    if (invOpen) {
      if (inB(ACCB(3), x - OX(), y - TOP())) { const cur0 = ch.pet || null; if (held && IT[held.id].pet) { ch.pet = held.id; held = cur0 ? { id: cur0, n: 1 } : null; myPet = null; K.chime(660, [0, 4, 7]); } else if (!held && cur0) { held = { id: cur0, n: 1 }; ch.pet = null; myPet = null; } else if (held) say('Only pets go there.'); return; }
      for (let k = 0; k < 4; k++) if (inB(ASB(k), x - OX(), y - TOP())) { const A = amS(); if (held) { if (!IT[held.id].ammo) { say('Only ammo goes there.'); return; } if (A[k] && A[k].id === held.id) { A[k].n += held.n; held = null; } else { const t = A[k]; A[k] = held; held = t; } K.sfx(500, .04, 'square', .04); } else if (A[k]) { held = A[k]; A[k] = null; } return; }
      for (let k = 0; k < 4; k++) if (inB(CSB(k), x - OX(), y - TOP())) { const cs = cslots(); if (held && IT[held.id].coin) { setMoney(money() + held.n * IT[held.id].coin); held = null; K.sfx(900, .04, 'square', .04); } else if (!held && cs[k]) { held = { id: CIDS[k], n: cs[k] }; cs[k] = 0; } return; }
      for (let i = 0; i < 3; i++) if (inB(ARMS(i), x - OX(), y - TOP())) { ch.gear = ch.gear || {}; const k = SLOTS[i], cur = ch.gear[k];
        if (held && IT[held.id].armor) { const hs = IT[held.id].slot || 'body'; if (hs !== k) return say(`That goes in the ${{ head: 'head', body: 'body', legs: 'legs' }[hs]} slot.`); ch.gear[k] = held.id; held = cur ? { id: cur, n: 1 } : null; K.sfx(500, .04, 'square', .04); }
        else if (!held && cur) { held = { id: cur, n: 1 }; ch.gear[k] = null; } else if (held) say('Only armor goes there.'); return; }
      for (let i = 0; i < 3; i++) if (inB(ACCB(i), x - OX(), y - TOP())) { ch.acc = ch.acc || [null, null, null]; const cur = ch.acc[i];
        if (held && IT[held.id].acc) { if (ch.acc.some((a, j) => a === held.id && j !== i)) return say('You are already wearing one of those.'); ch.acc[i] = held.id; held = cur ? { id: cur, n: 1 } : null; K.sfx(500, .04, 'square', .04); }
        else if (!held && cur) { held = { id: cur, n: 1 }; ch.acc[i] = null; } else if (held) say('Only accessories go there.'); return; }
      for (let i = 0; i < 40; i++) if (inB(IB(i), x - OX(), y - TOP())) { const s = ch.inv[i]; if (shopK && ev && ev.shiftKey && !held && s) { sellSlot(i); return; } if (openCh && ev && ev.shiftKey && !held && s) { if (toChest(i)) { chestSync(); K.sfx(500, .03, 'square', .03); } else say('The chest is full.'); return; } if (held) { if (s && s.id === held.id && !IT[s.id].one) { s.n += held.n; held = null; } else { ch.inv[i] = held; held = s; } } else if (s) { if ((IT[s.id].armor || IT[s.id].acc) && lastClick.i === i && anim - lastClick.t < .35) { equip(i); return; } held = s; ch.inv[i] = null; } lastClick = { i, t: anim }; return; }
      if (rfOpen) { const lx = x - OX(), ly = y - TOP(); if (inB(RF_SLOT, lx, ly) || inB(RF_GO, lx, ly)) return rfClick(lx, ly); if (inB({ x: CHP.x, y: CHP.y, w: CHP.w, h: 110 }, lx, ly)) return; }
      if (shopK) { const lx = x - OX(), ly = y - TOP(); for (let i = 0; i < 40; i++) if (inB(CSLOT(i), lx, ly)) return shopBuy(i); if (inB(CHP, lx, ly)) { if (held) sellHeld(); return; } }
      if (openCh) { const lx = x - OX(), ly = y - TOP();
        for (let i = 0; i < 40; i++) if (inB(CSLOT(i), lx, ly)) return chestClick(i, ev && ev.shiftKey);
        if (inB(CHBT.loot, lx, ly)) return lootAll(); if (inB(CHBT.dep, lx, ly)) return depositAll(false); if (inB(CHBT.stack, lx, ly)) return depositAll(true); if (inB(CHP, lx, ly)) return; }
      { const Q = QB(); if (inB(Q.sort, x, y)) return sortBag(); if (inB(Q.stack, x, y)) return stackNearby(); if (inB(Q.best, x, y)) return openBest(); } { const Bt = invBtns(); if (inB(Bt.drop, x, y)) return throwHeld(); if (inB(Bt.set, x, y)) return openSettings(); if (inB(Bt.quit, x, y)) return quitToMenu(); if (inB(Bt.house, x, y)) return checkHousing(); }
      if (wheelDown(x, y)) return;
      if (overUI(x, y)) return;
    }
    for (let i = 0; i < 10; i++) if (inB(HB(i), x - OX(), y - TOP())) { sel = i; return; }
    if (ev && ev.button === 2) { const wx = (wmx() + cam.x) / TS, wy = (wmy() + cam.y) / TS; interact(Math.floor(wx), Math.floor(wy), wx, wy); return; }   // right-click opens doors and chests
    useHeld = true; firstUse = true; usePtr = ev ? ev.pointerId : null;
  };
  GAME.move = (x, y, ev) => {
    if (!(touch && ev && Object.values(tPtr).includes(ev.pointerId))) { mx = x; my = y; } hover = null; hoverSlot = -1; hoverGear = null; hoverChest = -1; if (talk) for (const b of dlgBtns) if (inB(b, x, y)) hover = 'dl' + b.k; if (rfOpen && inB(RF_GO, x - OX(), y - TOP())) hover = 'rfgo';
    if (mapOpen) { if (mapDrag) { const s = mapS(mapArea()); mapC = [mapDrag.c[0] - (x - mapDrag.x) / s, mapDrag.c[1] - (y - mapDrag.y) / s]; mapClamp(); } return; }
    if (invOpen && !bag()) { for (let i = 0; i < 3; i++) if (inB(ARMS(i), x - OX(), y - TOP())) hoverGear = gear()[SLOTS[i]]; for (let i = 0; i < 3; i++) if (inB(ACCB(i), x - OX(), y - TOP())) hoverGear = ch.acc && ch.acc[i]; if (inB(ACCB(3), x - OX(), y - TOP())) hoverGear = ch.pet || null; }
    if (mode === 'pick' || mode === 'chars' || mode === 'edit' || mode === 'hostcode') hover = hoverKey(x, y);
    if (mode === 'menu') { for (let i = 0; i < 3; i++) { if (worlds()[i] && inB(MB.del(i), x, y)) hover = 'd' + i; else if (inB(MB.worlds(i), x, y)) hover = 'w' + i; } if (inB(MB.join, x, y)) hover = 'join'; }
    if (invOpen && bag() && drag) { if (Math.abs(y - drag.y) > 12) drag.moved = true; if (drag.moved) cpy = clamp(drag.c - (y - drag.y), 0, cmax()); }
    else if (invOpen && !bag()) { { const Q = QB(); for (const k in Q) if (inB(Q[k], x, y)) hover = 'qb' + k; } { const Bt = invBtns(); if (inB(Bt.drop, x, y)) hover = 'ibdrop'; if (inB(Bt.set, x, y)) hover = 'ibset'; if (inB(Bt.quit, x, y)) hover = 'ibquit'; if (inB(Bt.house, x, y)) hover = 'ibhouse'; } if (cpick && inB(wheelUI().mid, x, y)) hover = 'cmid'; if (inB(wheelUI().book, x, y)) hover = 'book'; for (let i = 0; i < 40; i++) if (inB(IB(i), x - OX(), y - TOP())) hoverSlot = i; hoverCoin = -1; for (let k = 0; k < 4; k++) if (inB(CSB(k), x - OX(), y - TOP())) hoverCoin = k; hoverAm = -1; for (let k = 0; k < 4; k++) if (inB(ASB(k), x - OX(), y - TOP())) hoverAm = k; if (openCh || shopK) { for (let i = 0; i < 40; i++) if (inB(CSLOT(i), x - OX(), y - TOP())) hoverChest = i; for (const k in CHBT) if (inB(CHBT[k], x - OX(), y - TOP())) hover = 'cb' + k; } }
    const c = document.getElementById('cv'); if (c) c.style.cursor = hover ? 'pointer' : 'default';
  };
  GAME.up = (x, y, ev) => {
    if (mapOpen) { mapDrag = null; useHeld = false; return; }
    if (drag) { const d = drag; drag = null; if (!d.moved && invOpen) { const L = TL(), list = craftList(); if (inB(L.list, x, y) && crow(L, y) === d.row && list[d.row]) craft(list[d.row]); } } const id = ev ? ev.pointerId : null; if (id == null || usePtr == null || id === usePtr) { if (firstUse) upPending = true; else useHeld = false; } if (touch) { for (const k of Object.keys(tPtr)) if (id == null || tPtr[k] === id) { keys[k === 'left' ? 'l' : k === 'right' ? 'r' : 'j'] = false; delete tPtr[k]; } } };
  function bagDown(x, y) {
    const L = TL();
    if (inB(L.close, x, y)) return toggleInv();
    if (bagExtraDown(L, x, y)) return;
    if (inB(L.arm, x, y)) { ch.gear = ch.gear || {}; if (held && IT[held.id].armor) { const k = IT[held.id].slot || 'body', old = ch.gear[k]; ch.gear[k] = held.id; held = old ? { id: old, n: 1 } : null; } else if (!held && picked >= 0 && ch.inv[picked] && IT[ch.inv[picked].id].armor) { equip(picked); picked = -1; } else if (!held) { const k = SLOTS.find(k => ch.gear[k]); if (k) { held = { id: ch.gear[k], n: 1 }; ch.gear[k] = null; } } K.sfx(500, .04, 'square', .04); return; }
    for (let i = 0; i < 40; i++) if (inB(L.slot(i), x, y)) { const s = ch.inv[i]; K.sfx(520, .03, 'square', .03);
      if (held) { if (s && s.id === held.id && !IT[s.id].one) { s.n += held.n; held = null; } else { ch.inv[i] = held; held = s; } picked = held ? -1 : i; }
      else if (s) { if (picked === i) { held = s; ch.inv[i] = null; picked = -1; } else picked = i; }  // first tap shows the item, second tap picks it up
      else picked = -1;
      if (i < 10 && !held) sel = i; return; }
    const mxs = cmax(); if (mxs > 0) { if (inB(L.up, x, y)) { cpy = clamp(cpy - ROW * 3, 0, mxs); return; } if (inB(L.dn, x, y)) { cpy = clamp(cpy + ROW * 3, 0, mxs); return; } }
    if (inB(L.list, x, y)) drag = { y, c: cpy, moved: false, row: crow(L, y) };
  }
  let lastTap = { d: 0, t: -9 };
  function tapDash(d) { if (P && (ch.acc || []).includes('windstep') && lastTap.d === d && anim - lastTap.t < .28 && !(P.dashCd > 0) && !dead) { P.vx = d * 25; P.dashT = .22; P.dashCd = .9; K.sfx(300, .1, 'sine', .05, 400); K.burst(scrX(sx(P.x)), scrY(sy(P.y - .5)), ['#ffffff', '#bfe6ff'], 6, 100, { life: .3, size: 3, gravity: 0 }); lastTap.t = -9; return; } lastTap = { d, t: anim }; }
  function toggleInv() { if (hbOpen) closeBook(); if (bestOpen) closeBest(); invOpen = !invOpen; if (!invOpen) { openCh = null; shopK = null; rfClose(); } cscroll = 0; cpy = 0; drag = null; picked = -1; if (!invOpen && held) { give(held.id, held.n); held = null; } K.sfx(invOpen ? 600 : 400, .05, 'square', .04); useHeld = false; }
  let tHold = null;
  const isLight = s => s && IT[s.id] && (IT[s.id].tile === T.TORCH || IT[s.id].tile === T.LANTERN);
  function torchOn() { if (tHold || !ch || dead || invOpen || mode !== 'play') return; const tot = {}; ch.inv.forEach(s => { if (isLight(s)) tot[s.id] = (tot[s.id] || 0) + s.n; }); const ids = Object.keys(tot); if (!ids.length) return;
    const id = ids.sort((a, b) => tot[b] - tot[a])[0]; let i = -1; ch.inv.forEach((s, k) => { if (s && s.id === id && (i < 0 || s.n > ch.inv[i].n)) i = k; }); if (i < 0) return;
    tHold = { i, sel }; if (i !== 9) { const a = ch.inv[i]; ch.inv[i] = ch.inv[9]; ch.inv[9] = a; } sel = 9; }
  function torchOff() { if (!tHold) return; const { i } = tHold; if (i !== 9) { const a = ch.inv[i]; ch.inv[i] = ch.inv[9]; ch.inv[9] = a; } sel = tHold.sel; tHold = null; }
  addEventListener('blur', () => torchOff());
  { const d0 = GAME.down, m0 = GAME.move, u0 = GAME.up;
  GAME.down = (x, y, ev) => { if (ev && ev.pointerType === 'mouse') kbd = true; if (mobDown(x, y, ev)) { K.audio && K.audio(); return; } return d0(x, y, ev); };
  GAME.move = (x, y, ev) => { if (mob.stick != null && ev && ev.pointerId === mob.stick) { mobStick(x, y); return; } if (mob.jump != null && ev && ev.pointerId === mob.jump) return; return m0(x, y, ev); };
  GAME.up = (x, y, ev) => { if (mobUp(ev)) return; return u0(x, y, ev); }; }
if (MOBILE) { const fb = document.createElement('button'); fb.id = 'fsBtn'; fb.textContent = '⛶'; fb.title = 'Fullscreen'; fb.setAttribute('aria-label', 'Fullscreen');
  fb.style.cssText = 'position:fixed;left:max(8px,env(safe-area-inset-left));top:max(8px,env(safe-area-inset-top));z-index:40;width:46px;height:46px;border-radius:14px;border:2px solid rgba(255,255,255,.45);background:rgba(20,30,70,.6);color:#fff;font-size:28px;line-height:1;padding:0;touch-action:manipulation';
  const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const tip = t => { try { if (mode === 'play') say(t, 4); else { menuNote = t; menuNoteUntil = performance.now() + 6000; } } catch (e) {} };
  fb.onpointerdown = e => e.stopPropagation();
  fb.onclick = e => { e.stopPropagation(); if (isFull()) { (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document); return; }
    const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen, ok = document.fullscreenEnabled || document.webkitFullscreenEnabled;
    if (rq && ok) { try { Promise.resolve(rq.call(el, { navigationUI: 'hide' })).then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => tip('Fullscreen was blocked. Try again, or open the game in its own tab.')); } catch (e) { tip('Fullscreen is not available here.'); } return; }
    if (window.top !== window) { window.open(location.href, '_blank'); return; }
    tip(/iPhone|iPod/i.test(navigator.userAgent) ? 'On iPhone: tap Share, then Add to Home Screen, and open Strata from there to play fullscreen.' : 'This browser does not allow fullscreen.'); };
  const upd = () => { fb.textContent = isFull() ? '✕' : '⛶'; }; document.addEventListener('fullscreenchange', upd); document.addEventListener('webkitfullscreenchange', upd);
  document.body.appendChild(fb); }
GAME.keepRunning = () => (mode === 'play' || mode === 'recv') && (online() || !!(net && typeof MP !== 'undefined' && MP.rejoining && MP.rejoining()));
  GAME.blurred = () => { keys = {}; useHeld = false; };
  GAME.key = (c, d) => {
    if (chatOn) return;
    if (c === 'Enter' && d && mode === 'play' && online() && !invOpen && !mapOpen) { openChat(); return; }
    if (c === 'ShiftLeft') { if (d) torchOn(); else torchOff(); }
    if (mode !== 'play') return;
    const kb = KB(); if (setOpen) return; const wasL = keys.l, wasR = keys.r; if (c === kb.left || c === 'ArrowLeft') keys.l = d; if (c === kb.right || c === 'ArrowRight') keys.r = d; if (d && keys.l && !wasL) tapDash(-1); if (d && keys.r && !wasR) tapDash(1); if (c === kb.jump || c === 'ArrowUp' || (c === 'KeyW' && !Object.values(kb).includes('KeyW'))) keys.j = d; if (c === kb.down || c === 'ArrowDown') keys.d = d;
    if (!d) return;
    kbd = true; if (c === kb.map) return toggleMap(); if (mapOpen) { if (c === kb.inv) return; } if (c === kb.inv) return toggleInv();
    if (c === kb.potion) { const s = ch.inv.find(x => x && x.id === 'potion'); if (s) useItem(IT.potion, s); }
    const n = /^Digit(\d)$/.exec(c); if (n) sel = (+n[1] + 9) % 10;
  };
  addEventListener('wheel', e => { if (K.state !== 'play' || mode !== 'play' || hbOpen || setOpen || chatOn || bestOpen) return; if (mapOpen) return mapZoom(e.deltaY, mx, my); if (invOpen && bag()) cscroll = clamp(cscroll + (e.deltaY > 0 ? 1 : -1), 0, Math.max(0, craftList().length - 12)); else if (invOpen && inCraft(mx, my)) wheelScroll(e.deltaY > 0 ? 1 : -1); else sel = (sel + (e.deltaY > 0 ? 1 : 9)) % 10; }, { passive: true });
  addEventListener('contextmenu', e => { if (K.state === 'play' && mode === 'play') e.preventDefault(); });
  addEventListener('visibilitychange', () => { if (document.hidden && K.state === 'play' && mode === 'play' && !demo) saveAll(); });
  GAME.bot = dt => {
    const b = botS; b.t += dt; keys.r = true; keys.l = false;
    const ahead = solid(P.x + 1, P.y - 1.5) || solid(P.x + 1, P.y - 2.5); keys.j = ahead && P.ground;
    const e = ents.find(e => Math.abs(e.x - P.x) < 12 && !KIND[e.kind].proj); if (e) { sel = 4; mx = scrX(sx(e.x)); my = scrY(sy(e.y - .5)); useHeld = true; firstUse = true; return; }
    if (ahead && b.t % 3 < 1.2) { sel = 0; mx = scrX(sx(P.x + 1.5)); my = scrY(sy(P.y - 1.6)); useHeld = true; } else useHeld = false;
  };
  GAME.test = { iconSheet: (ids, sc = 3) => { const n = ids.length, cols = 10, c = document.createElement('canvas'); c.width = cols * 20 * sc; c.height = Math.ceil(n / cols) * 20 * sc; const g = c.getContext('2d'); g.fillStyle = '#2a2a3a'; g.fillRect(0, 0, c.width, c.height); ids.forEach((id, i) => icon(g, id, (i % cols) * 20 * sc + 10 * sc, Math.floor(i / cols) * 20 * sc + 10 * sc, sc)); return c.toDataURL(); }, st: () => ({ mode, P: P && { x: +P.x.toFixed(1), y: +P.y.toFixed(1), hp: P.hp, ground: P.ground }, inv: ch && ch.inv.filter(Boolean).map(s => s.id + 'x' + s.n), ents: ents.map(e => e.kind), time: time && +(time % 1).toFixed(2), worlds: worlds().length }), give: (i, n) => give(i, n), setTime: v => time = v, spawn: k => spawnEnemy(k, P.x + 8, P.y - 6), tp: (x, y) => { P.x = x; P.y = y; }, choose: chooseWorld, sel: i => sel = i, summon: k => summon(k, P.x, P.y), inv: () => invOpen || toggleInv(), _: () => ({ cam, keys, tPtr, P, ch, ents, drops, projs, downed, chests, tiles, RECIPES, IT, CHEST_LOOT, BOSSES, KIND, DROP, craft, canCraft, at, set, hurt, useItem, use, equip, openChest, stationNear, time, mode, others, saveAll, worlds, boss, won, dead, invOpen, held, sel, surf, HELL, T, icon, hitEnemy, count, give }), solo: () => MP.start(), cave: (d = 30) => { for (let r = 0; r < 200; r++) for (const x of [Math.floor(P.x) + r, Math.floor(P.x) - r]) for (let y = surf[clamp(x, 0, WW - 1)] + d; y < surf[clamp(x, 0, WW - 1)] + d + 30; y++) if (at(x, y) === T.AIR && at(x, y - 1) === T.AIR && at(x, y - 2) === T.AIR && SOLID.has(at(x, y + 1))) { P.x = x + .5; P.y = y + .99; P.vy = 0; cam.x = P.x * TS - 640; cam.y = (P.y - 1.4) * TS - 380; return [x, y]; } return null; } };
})();
