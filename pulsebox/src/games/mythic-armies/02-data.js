/* ---------- world data: factions, rarities, roles, the character table, abilities ---------- */

const FACTIONS = [
  { id: 'ember', name: 'Emberwing', region: 'the Cinder Reaches', blurb: 'Dragons, fire beasts and volcano-born clans.',
    col: '#ff7a2f', dark: '#2a0b06', mid: '#7a2410', light: '#ffd27a', glow: '#ffae3d',
    pal: ['#b8341a', '#d9642a', '#7c2214', '#4a302a', '#e8a13a', '#5a3d33', '#9e4a22'], accent: ['#ffcf4a', '#ff8a2a', '#ffe08a'],
    words: ['Cinder', 'Magma', 'Scorch', 'Ash', 'Blaze', 'Pyre', 'Ember', 'Kiln'],
    syn: { k: 'atk', a: 0.10, b: 0.25, text: 'attack' } },
  { id: 'wild', name: 'Wildwood', region: 'the Verdant Hollow', blurb: 'Forest guardians, armoured beasts and the fey.',
    col: '#5fd068', dark: '#071a0c', mid: '#1f5a2a', light: '#d4ffb0', glow: '#a8ff7a',
    pal: ['#4f8a3a', '#7a5a34', '#2f6a3a', '#a07a44', '#6fae4a', '#5a4630', '#8fb85a'], accent: ['#d8ff6a', '#ffe36a', '#9affc8'],
    words: ['Thorn', 'Briar', 'Moss', 'Bloom', 'Root', 'Fern', 'Bramble', 'Grove'],
    syn: { k: 'regen', a: 0.012, b: 0.03, text: 'max HP regenerated per second' } },
  { id: 'stone', name: 'Stonehold', region: 'the Granite Crowns', blurb: 'Giants, golems and dwarven knights of the deep halls.',
    col: '#c9a26a', dark: '#16110b', mid: '#5a4a38', light: '#ffe8c0', glow: '#7fe0ff',
    pal: ['#8a8378', '#6a6258', '#a89a82', '#5a5f66', '#b88a4a', '#4a4440', '#9aa3aa'], accent: ['#7fe0ff', '#ffc46a', '#b8f0ff'],
    words: ['Granite', 'Rune', 'Iron', 'Quartz', 'Basalt', 'Anvil', 'Bedrock', 'Forge'],
    syn: { k: 'def', a: 0.15, b: 0.40, text: 'defence' } },
  { id: 'tide', name: 'Tidereach', region: 'the Sunken Expanse', blurb: 'Sea serpents, krakens and the coral knighthood.',
    col: '#3cc7e0', dark: '#03141f', mid: '#0f4a6a', light: '#bff6ff', glow: '#5ff2ff',
    pal: ['#2a7aa0', '#3aa8b8', '#1f4f7a', '#e0705a', '#5ac0b0', '#2f3f6a', '#e8a08a'], accent: ['#7affff', '#ffd0f0', '#bfffea'],
    words: ['Riptide', 'Coral', 'Brine', 'Undertow', 'Pearl', 'Surge', 'Abyss', 'Tidal'],
    syn: { k: 'hp', a: 0.12, b: 0.30, text: 'max HP' } },
  { id: 'star', name: 'Starfall', region: 'the Halo Steppes', blurb: 'Star beasts, winged sentinels and moon creatures.',
    col: '#a9b6ff', dark: '#080a24', mid: '#2c3378', light: '#f4f0ff', glow: '#fff2a8',
    pal: ['#e8e4f4', '#8a8fd8', '#c9b46a', '#5a62b0', '#f0e0b0', '#3a3f80', '#b8c4ff'], accent: ['#fff2a8', '#a8f0ff', '#ffd0ff'],
    words: ['Astral', 'Lunar', 'Comet', 'Radiant', 'Nova', 'Aurora', 'Halo', 'Zenith'],
    syn: { k: 'energy', a: 0.20, b: 0.45, text: 'faster ability charge' } },
  { id: 'gloom', name: 'Gloomveil', region: 'the Hushmarsh', blurb: 'Restless dead, shadow beasts and marsh witches.',
    col: '#b07cff', dark: '#0c0614', mid: '#3a2058', light: '#e8d8ff', glow: '#7dffb8',
    pal: ['#4a3a5a', '#6a5a7a', '#2a2433', '#d8d0c0', '#5a6a4a', '#3a2a40', '#8a7a9a'], accent: ['#7dffb8', '#c08aff', '#b8ffde'],
    words: ['Hex', 'Grave', 'Shade', 'Wither', 'Night', 'Bone', 'Mire', 'Dread'],
    syn: { k: 'steal', a: 0.10, b: 0.25, text: 'life steal' } }
];
const FAC = {}; FACTIONS.forEach((f, i) => { f.i = i; FAC[f.id] = f; });

const RAR = [
  { id: 'C', name: 'Common', col: '#b9c2cf', deep: '#4a5260', mult: 1.00, ess: 5, price: 70 },
  { id: 'U', name: 'Uncommon', col: '#56d98e', deep: '#14583a', mult: 1.10, ess: 10, price: 140 },
  { id: 'R', name: 'Rare', col: '#4fb0ff', deep: '#123f7a', mult: 1.22, ess: 25, price: 340 },
  { id: 'E', name: 'Epic', col: '#bb77ff', deep: '#43207a', mult: 1.36, ess: 60, price: 900 },
  { id: 'L', name: 'Legendary', col: '#ffc53d', deep: '#7a4a08', mult: 1.52, ess: 150, price: 2600 },
  { id: 'M', name: 'Mythic', col: '#ff6fd8', deep: '#5a1050', mult: 1.72, ess: 400, price: 6500 }
];
const RIDX = { C: 0, U: 1, R: 2, E: 3, L: 4, M: 5 };

const ROLES = {
  D: { name: 'Defender', hp: 1000, atk: 44, def: 40, spd: 3, rng: 1.3, tip: 'Holds the front line and protects allies.' },
  S: { name: 'Striker', hp: 780, atk: 68, def: 22, spd: 5, rng: 1.3, tip: 'Heavy melee damage.' },
  R: { name: 'Ranger', hp: 560, atk: 60, def: 12, spd: 5, rng: 6.0, tip: 'Attacks from long range.' },
  M: { name: 'Mage', hp: 520, atk: 72, def: 10, spd: 4, rng: 5.0, tip: 'Area spells and control.' },
  H: { name: 'Support', hp: 620, atk: 46, def: 16, spd: 5, rng: 4.5, tip: 'Heals, shields and inspires allies.' },
  A: { name: 'Assassin', hp: 560, atk: 76, def: 12, spd: 8, rng: 1.3, tip: 'Dives the back line.' }
};
const BODY_MOD = {
  bru: { hp: 1.15, spd: -1, atk: 1.04 }, gol: { hp: 1.18, spd: -1, def: 1.15 }, swm: { hp: 0.9, spd: 1 }, qd: { spd: 1 },
  srp: { hp: 1.06 }, avi: { spd: 1, hp: 0.94 }, ray: { spd: 1 }, drk: { atk: 1.06 }, ent: { hp: 1.1, spd: -1 },
  oct: { atk: 1.04 }, crw: { def: 1.12 }, spc: { def: 0.9, atk: 1.04 }, flt: { hp: 0.95 }, fsh: { hp: 1.04 }, bip: {}
};

/* ---------- the character table ----------
   One row per character: name | rarity | role | body plan | parts | flavour.
   Everything else (stats, abilities, palette, proportions, card art, 3D model) is derived from the row, so the
   table scales to the 1,000+ planned characters without per-character code. */
const CHAR_ROWS = {
ember: `Cinderpup|C|S|qd|ears,tail,flames|Its sneezes have started three wildfires and one very warm birthday.
Ashfeather Scout|C|R|avi|crest,fwings|It flies ahead of every warband, trailing smoke like a signal flag.
Kilnback Tortle|C|D|qd|shell,spikes|Slow, warm, and impossible to move once it decides to sit.
Emberling Swarm|C|A|swm|flames|A hundred tiny sparks sharing one enormous grudge.
Scorchscale Raider|C|S|bip|snout,tail,axe|Lizardfolk raiders who bathe in hot springs before every battle.
Magma Mite|C|D|crw|shell,glowcore|It tunnels through cooling lava and surfaces in a foul mood.
Flarewick Acolyte|C|H|bip|hood,staff|Tends a candle that has not gone out in four hundred years.
Soot Imp|C|M|bip|horns,wings,tail,orb|Small, sticky, and gleeful about setting your curtains alight.
Brimstone Hound|C|S|qd|horns,spikes,tail|Its bark smells of sulphur; its bite smells worse.
Pyreclaw Stalker|U|A|qd|ears,tail,claws,flames|Leaves pawprints that keep smouldering long after it has gone.
Ashen Drakeling|U|M|drk|horns,wings,tail|Too young to fly far, already old enough to hold a grudge.
Lavafin Salamander|U|R|qd|crest,tail,glowcore|Spits molten pebbles with an archer's patience.
Ironbrand Smith|U|D|bru|helm,hammer,plates|Forges armour onto its own chest, mid-battle, out of spite.
Cinder Warden|U|D|bip|helm,shield,spear,plates|Sworn to guard the caldera gates, even from the weather.
Phoenix Chick|U|H|avi|crest,flames|Bursts into flame when startled, then hatches again, slightly embarrassed.
Blazehorn Ram|U|S|qd|horns4,mane|Charges anything that glows, which is most things around here.
Searwing Harrier|R|R|avi|crest,fwings,flames|Dives so fast the air behind it catches fire.
Slagheart Golem|R|D|gol|glowcore,spikes|Built from a collapsed forge; it still remembers being a furnace.
Kindlewitch Orra|R|M|bip|hat,staff,cape|Brews her potions directly in the lava, which saves on pots.
Charfang Wyvern|R|S|drk|horns,wings,tail,spikes|Its scales are hot enough to cook the arrows that strike them.
Coilflame Naga|R|M|srp|crest,flames,glowcore|Sings in a crackle, and the coals rise up to dance.
Ashblade Duelist|R|A|bip|blades,cape,mask|Has never lost a duel, nor ever arrived at one on time.
Grimmaw Behemoth|E|D|bru|horns4,tusks,plates,flames|Mountains move aside when it yawns.
Thornax the Kilnking|E|M|bip|crown,staff,cape,flames|Rules a kingdom of ash, and taxes it in embers.
Triskar Hydra|E|S|srp|heads3,horns,spikes|Three heads, three tempers, and no agreement on anything.
Sunflare Roc|E|R|avi|crest,fwings,flames,plates|Its shadow is the only cool place in the Cinder Reaches.
Ignivar, the Ember Tyrant|L|S|drk|horns4,wings,spikes,crown,flames|When Ignivar roars, every volcano answers.
Solenne of the Second Flame|L|H|avi|crest,fwings,halo,flames|She has died nine times and returned brighter after every one.
Magmalord Ruhg|L|D|gol|crown,glowcore,flames,spikes|A walking eruption with the manners of a king.
Vyrmorax, Heart of the Caldera|M|M|drk|horns4,wings,crown,halo,flames,spikes,glowcore|Before the first mountain cooled, Vyrmorax was already dreaming of fire.`,
wild: `Mossback Boar|C|D|qd|tusks,plates,leaves|Grows a new garden on its back every spring.
Thistle Sprite|C|H|flt|iwings,leaves|Heals scratches by humming at them until they feel silly.
Briar Fox|C|A|qd|ears,tail|Slips through bramble walls as if they were open doors.
Acorn Knight|C|D|bip|helm,shield,sword|Three inches tall and absolutely certain it is a giant.
Spore Puffling|C|M|flt|mush|Its sneeze puts whole regiments to sleep.
Barkhide Badger|C|S|qd|ears,plates,claws|Digs, bites, and refuses to apologise for either.
Needlewing Swarm|C|R|swm|iwings|A cloud of tiny lancers with very pointed opinions.
Fernleaf Archer|C|R|bip|hood,bow|Never misses a target that stands still for a heartbeat.
Glimmer Snail|C|H|crw|snail,glowcore|Leaves a glowing trail that mends whatever it touches.
Thornstag|U|S|qd|antlers|Its antlers grow sharper thorns with every season.
Bramble Bear|U|D|qd|ears,plates,leaves|Hibernates for half the year and fights for the other half.
Morel Hag|U|M|bip|mush,staff,hood|Grows curses in her cellar the way other folk grow mushrooms.
Willowmaid|U|H|bip|leaves,staff|Sings the riverbanks back together after every flood.
Ironhorn Beetle|U|D|crw|horns,shell|Can carry eight hundred times its weight, and a grudge besides.
Vinewhip Lasher|U|A|ent|leaves,spikes|Strikes from the undergrowth before you notice the undergrowth moved.
Wolfkin Tracker|U|R|bip|ears,snout,tail,bow|Follows a scent through rain, river and three days of excuses.
Oldroot Warden|R|D|ent|leaves,mush|Has guarded the same crossroads since before there were roads.
Pangolin Paladin|R|D|bip|plates,tail,mace,shield|Rolls into a ball of holy armour when things get dangerous.
Mantis Duelist|R|A|bip|iwings,blades,antennae|Bows politely before every strike, and strikes very fast.
Lunamoth Seer|R|M|flt|iwings,antennae,glowcore|Reads the future in the dust shaken from her wings.
Hollowhorn Elk|R|H|qd|antlers,glowcore,leaves|Where it walks, the moss turns soft and the wounded sleep.
Briarscale Basilisk|R|R|qd|spikes,tail,crest|Its glare roots enemies in place like old trees.
Grovekeeper Orsa|E|D|qd|ears,plates,leaves,crown|The forest's eldest bear, crowned in bark and wildflowers.
Faewing Duchess|E|H|bip|iwings,crown,staff|Her court meets at midnight inside a single dewdrop.
Verdant Wyrm|E|M|srp|leaves,horns,crest|It sleeps beneath the hills, and the hills grow green above it.
Stormantler|E|S|qd|antlers,glowcore,mane|Its antlers catch lightning and keep it for later.
Sylvara, the Thousand-Root Mother|L|H|ent|leaves,crown,halo,mush|Every tree in the Wildwood calls her mother, and she answers each by name.
King Bramblemane|L|S|qd|mane,crown,plates,spikes|A lion of living briar whose roar makes flowers bloom.
Tanglewisp, Prince of Riddles|L|A|bip|iwings,crown,blades,ears|Ask him a question and you will lose your way, your hat and probably the battle.
Eldwyrd, the Last Greenwood|M|D|ent|antlers,leaves,halo,crown,glowcore|When the final forest falls, Eldwyrd will still be standing.`,
stone: `Cobble Golem|C|D|gol||Assembled from a road that got tired of being walked on.
Pickaxe Delver|C|S|bip|helm,axe|Has dug through four mountains looking for the perfect lunch spot.
Quarry Mole|C|A|qd|claws,snout|Pops up behind the lines, blinks, then bites.
Gravelkin|C|S|swm||A rattling crowd of pebbles that learned to march.
Shieldwall Recruit|C|D|bip|helm,shield,spear|First day on the wall, and already sure nothing will get past.
Rune Apprentice|C|M|bip|hood,book|Carves runes on everything, including the furniture.
Granite Ram|C|S|qd|horns,plates|Butts heads with boulders for practice. The boulders lose.
Boltcaster Sentry|C|R|bip|helm,bow|Its crossbow was handed down through seven grumpy generations.
Hearthbrew Medic|C|H|bip|hood,staff|Cures most wounds with soup, and the rest with louder soup.
Basalt Brute|U|D|bru|spikes|Patient as bedrock, and roughly as hard to argue with.
Crystal Crawler|U|R|crw|shards|Fires splinters of its own glittering shell.
Anvil Priest|U|H|bip|helm,hammer|Blesses allies with a ringing hammer blow. Gently. Mostly.
Gargoyle Sentinel|U|A|bip|wings,horns,tail|Pretends to be a statue until the very last moment.
Boulder Tortoise|U|D|qd|shell,spikes|Mistaken for a hill so often that it now grows grass.
Thunderhammer Thane|U|S|bip|helm,hammer,cape|Each swing of the hammer echoes across three valleys.
Geode Wisp|U|M|flt|shards|A hollow stone full of glittering, angry starlight.
Ironclad Juggernaut|R|D|gol|plates,helm|Nothing has ever stopped it, including its own engineers.
Mossjaw Giant|R|S|bru|tusks,hammer|Uses a felled pine as a toothpick and an oak as a club.
Runesmith Valda|R|M|bip|helm,hammer,cape,glowcore|Her runes hum louder the angrier she gets.
Prismhide Armadillo|R|D|qd|shell,shards|Its shell splits sunlight into blinding rainbows.
Cragwing Eagle|R|R|avi|crest,plates|Nests on peaks so high the clouds bring it messages.
Tunnel Wyrm|R|A|srp|plates,tusks|Burrows under the battlefield and surfaces beneath the bravest.
Obsidian Titan|E|D|gol|crown,glowcore,shards|Carved from a single shard of the world's dark glass.
Forgefather Durm|E|S|bip|crown,hammer,plates,cape|The king who forged his own crown, then the mountain to put it on.
Peakstrider|E|R|qd|shards,plates,crest|A walking mountain range that hurls boulders from its own back.
Echo Oracle|E|H|flt|shards,halo|It speaks only in echoes, and every echo heals.
Gorrun, the Mountain That Walks|L|D|bru|crown,shards,plates,spikes|Maps have to be redrawn whenever Gorrun goes for a stroll.
Queen Halvra Ironbraid|L|S|bip|crown,axe,shield,cape,plates|Her braids are bound in iron rings, one for every siege she broke.
Aurex, the Gilded Guardian|L|M|qd|crown,mane,shards,wings|A lion of living gold who guards the deepest vault in the world.
Terramaw, the First Mountain|M|D|gol|crown,halo,shards,glowcore,spikes|The world was built on its shoulders, and it has never once complained.`,
tide: `Reefling Crab|C|D|crw|claws,shell|Sideways is the only direction it has ever needed.
Bubblefin Puffer|C|M|flt|spikes,fin|Inflates to three times its size when insulted.
Coral Squire|C|D|bip|helm,shield,coral|Polishes its coral armour every morning, whether it needs it or not.
Kelpdancer|C|H|bip|leaves,staff|Sways with the current and heals with the tide.
Harpoon Otter|C|R|bip|ears,tail,spear|Fishes with a harpoon, fights with a harpoon, eats with a harpoon.
Stingray Skimmer|C|A|ray|tail|Glides beneath notice until the tail comes round.
Barnacle Brute|C|S|bru|coral|Covered in so many barnacles it has become a small reef.
Minnow Swarm|C|A|swm|fin|Silver flashes, a thousand nibbles, and then nothing at all.
Urchin Roller|C|D|flt|spikes|Rolls into battle and refuses to be stepped on.
Coral Knight|U|D|bip|helm,coral,shield,sword|Sworn to the Pearl Spire, armoured in its living reef.
Inkshade Octopus|U|A|oct||Vanishes in a cloud of ink and reappears holding your purse.
Sawtooth Marauder|U|S|bip|fin,snout,axe|A shark-headed raider who smells trouble a league away.
Lantern Angler|U|R|fsh|lure|Its little light leads the curious straight into its jaws.
Pearl Oracle|U|H|bip|hood,orb|Sees futures inside pearls, mostly ones involving lunch.
Walrus Warden|U|D|bru|tusks,ears|Guards the ice shelves with two tusks and a very long nap.
Shoalsinger|U|M|srp|crest,fin|Her songs pull ships off course and enemies off their feet.
Leviathan Whelp|R|S|srp|fin,horns|Small for a leviathan, which still makes it enormous.
Bellglow Jelly|R|H|oct|glowcore|Pulses with a soft light that closes wounds and calms storms.
Tidecaller Shaman|R|M|bip|hood,trident,coral|Calls the tide in, and the tide brings friends.
Hermit Fortress|R|D|crw|shell,coral,claws|Lives inside a sunken watchtower and has never been evicted.
Narwhal Lancer|R|S|fsh|unihorn|Charges through the waves, horn first, apologies never.
Mistblade Naiad|R|A|bip|fin,blades|Strikes from the sea spray and vanishes with it.
Abyssal Kraken|E|M|oct|eye1,spikes|Sailors' stories never describe its eye. Nobody survives to.
Coral Colossus|E|D|gol|coral,shell|An entire reef that stood up one day and decided to fight.
Stormspout Whale|E|H|fsh|fin,glowcore|Its song carries across oceans, and storms quiet down to listen.
Admiral Brinesnap|E|S|bip|shell,helm,sword,cape|A snapping turtle who has commanded the fleet for two hundred years.
Thalassor, Tide Leviathan|L|M|srp|crown,fin,horns,spikes|The tides rise and fall with each of Thalassor's breaths.
Queen Marisol of the Pearl Spire|L|H|srp|crown,halo,fin,trident|She rules the deep from a throne carved from a single, impossible pearl.
Sir Barnaby Deepwake|L|D|bip|helm,coral,shield,trident,cape|Drowned three centuries ago, still on patrol, still polite.
Maelvorn, the Endless Maw|M|S|oct|crown,eye1,spikes,glowcore,halo|The whirlpool at the edge of the world is simply Maelvorn, breathing in.`,
star: `Moonhare|C|A|qd|ears,tail|Leaps so high it once came back with moon dust on its paws.
Stardust Mote|C|M|flt|shards|A speck of fallen star, still trying to get home.
Lumen Novice|C|H|bip|hood,staff,halo|Still learning to glow on purpose.
Comet Pup|C|S|qd|ears,tail,flames|Chases its own tail of light in endless circles.
Twinkle Swarm|C|R|swm|glowcore|A handful of tiny stars who agreed to stick together.
Dawnguard Initiate|C|D|bip|helm,shield,spear|Stands watch all night so the sunrise arrives safely.
Nightjar Courier|C|R|avi|crest|Carries messages between the stars, and occasionally drops one.
Crescent Owl|C|M|avi|ears,crest|Every hoot sounds like a small, sleepy spell.
Meteor Tortoise|C|D|qd|shell,shards|Fell from the sky a thousand years ago and has never hurried since.
Celestine Archer|U|R|bip|halo,bow,cape|Her arrows are made of light and always find their way home.
Starmane Courser|U|S|qd|mane,unihorn|Gallops across the night sky, leaving constellations in its wake.
Orbit Sentinel|U|D|flt|shards,halo|Its shields circle it like small, loyal moons.
Nebula Ray|U|M|ray|glowcore|Glides through the void trailing colours nobody has named yet.
Moonveil Fox|U|A|qd|ears,tail,glowcore|Appears only in moonlight, and only to those already lost.
Hymnwing Choirling|U|H|bip|fwings,halo|Sings one note so pure it mends broken shields.
Orrery Golem|U|D|gol|halo,shards|A clockwork of brass rings, each one holding a tiny world.
Sunmane Lion|R|S|qd|mane,halo|Its mane holds the light of a hundred noon suns.
Starhorn Stag|R|H|qd|antlers,glowcore|Its antlers map every star that has ever fallen.
Eclipse Blade|R|A|bip|blades,mask,cape|Strikes in the instant between light and dark.
Astral Serpent|R|M|srp|crest,halo|Coils through the constellations, rearranging them for fun.
Wardwing Sentinel|R|D|bip|fwings,helm,shield,sword|Has guarded the gate of dawn for nine thousand mornings.
Pulsar Drifter|R|R|oct|glowcore|Flashes with a rhythm that unsettles the hearts of its foes.
Archon of Dawn|E|S|bip|fwings,halo,spear,plates|Descends at sunrise with a spear of gathered light.
Silvercrescent Wyrm|E|M|drk|horns,wings,halo|Its scales wax and wane with the phases of the moon.
Cometstrider|E|R|qd|unihorn,mane,flames|Leaves a burning trail across the sky on its yearly visit.
Starweaver Oracle|E|H|flt|halo,shards,crown|Weaves fate from starlight, and always leaves one thread loose.
Valestra of the Seventh Sky|L|H|bip|fwings,halo,crown,staff|Each beat of her wings lifts a fallen soldier back to their feet.
Orionyx, the Star Hunter|L|R|bip|bow,cape,crown,halo|Hunts comets for sport and keeps their tails as trophies.
Lunaroth, Moon-Devourer|L|A|qd|ears,tail,spikes,halo|Every eclipse is just Lunaroth taking a bite.
Aethelion, the Living Constellation|M|M|drk|wings,horns4,halo,crown,shards,glowcore|Look up on a clear night and you will see Aethelion, watching back.`,
gloom: `Rattlebones|C|S|bip|skull,sword|Lost most of its ribs in a card game, but kept its sense of humour.
Bog Wisp|C|M|flt|eye1|Leads travellers into the marsh, then apologises, sincerely.
Gravemite Swarm|C|A|swm|ears|They gnaw through coffins, gates, and patience.
Hexling Witch|C|M|bip|hat,staff|Her first curse turned her teacher into a toad. Her second turned him back.
Mire Ghoul|C|S|bip|claws,hood|Smells like a swamp, fights like a swamp, is mostly swamp.
Lantern Shade|C|H|spc|lantern|Carries a little light for anyone lost in the dark.
Hollowbow Archer|C|R|bip|skull,bow|Hasn't had eyes in a century and still never misses.
Crypt Bat|C|A|avi|wings,ears|Hangs in the belfry, waiting for the bells to stop.
Shroud Sentinel|C|D|bip|helm,shield,skull|Guards the tomb doors, though the tomb has long forgotten why.
Wailing Veil|U|M|spc|hood|Its scream rattles shields and loosens teeth.
Blightcroak Toad|U|D|qd|spikes,eye3|One croak curdles milk for a mile.
Grave Knight|U|D|bip|helm,shield,sword,cape|Still keeps the oath it swore, long after the king forgot it.
Shadow Hound|U|A|qd|ears,spikes,tail|You only see it when it is already too late.
Cauldron Crone|U|H|bip|hat,staff,cape|Her stew can raise the dead, or at least make them feel better.
Gloomweaver Spider|U|R|crw|eye3,spikes|Spins webs of shadow that catch light, sound and soldiers.
Headstone Brute|U|S|gol|chains|A graveyard wall that shambled off to settle old scores.
Lady Vesperine|R|A|bip|cape,blades,crown|Arrives at every party at dusk and leaves before anyone wakes.
Bonecaller|R|M|bip|hood,staff,skull,glowcore|Whistles a tune that every skeleton in earshot knows by heart.
Dreadmare|R|S|qd|mane,flames,horns|Gallops through nightmares and tracks the mud into morning.
Wraith Reaper|R|A|spc|scythe,hood|Harvests fear the way farmers harvest wheat.
Mother Murkwell|R|H|bip|hat,staff,cape,eye3|Brews remedies from things you would rather not know about.
Bone Serpent|R|R|srp|skull,spikes|A thousand vertebrae rattling in perfect, terrible rhythm.
Stitchgut Horror|E|D|bru|chains,spikes|Sewn together from seven heroes, it argues with itself constantly.
Umbral Wyvern|E|S|drk|wings,horns,tail,spikes|Its wings are made from the shadows of every place it has burned.
Matron Grimsbane|E|M|bip|hat,staff,cape,crown|Head of the Hushmarsh coven, and the reason the frogs stay quiet.
The Lamplighter|E|H|spc|lantern,crown|Lights a lantern for every soul it guides, and has run out of shelves.
Morvanthe, the Lich Queen|L|M|spc|crown,staff,skull,glowcore|She traded her heartbeat for eternity, and considers it a bargain.
Grimhollow Dreadknight|L|D|bip|helm,shield,sword,cape,flames,plates|Rides out every new moon to challenge anyone brave enough to answer.
Nyxshade, Devourer of Lanterns|L|A|qd|eye3,spikes,flames,tail|Every light it swallows makes its shadow a little longer.
Oblivora, the Last Night|M|M|oct|eye1,crown,halo,chains,spikes|When the last star goes out, Oblivora will open its eye.`
};

/* ---------- abilities: a library of effect kinds; each character gets one active (and rarer ones a passive) ---------- */
const ACT = {
  strike: { n: ['Strike', 'Rend', 'Smite', 'Fang', 'Lunge'], m: 2.2, d: m => `Hits the target for ${p(m)} damage.` },
  cleave: { n: ['Sweep', 'Whirl', 'Cleave', 'Rampage'], m: 1.5, d: m => `Hits all nearby enemies for ${p(m)} damage.` },
  blast: { n: ['Burst', 'Nova', 'Bomb', 'Flare'], m: 1.6, d: m => `Hurls a blast that hits enemies around the target for ${p(m)}.` },
  volley: { n: ['Volley', 'Barrage', 'Hail', 'Storm'], m: 0.85, d: m => `Fires 4 shots at random enemies, ${p(m)} each.` },
  snipe: { n: ['Shot', 'Lance', 'Needle', 'Bolt'], m: 2.4, d: m => `Strikes the weakest enemy anywhere for ${p(m)}.` },
  heal: { n: ['Mend', 'Blessing', 'Balm', 'Bloom'], m: 2.8, d: m => `Heals the most wounded ally for ${p(m)} of attack.` },
  mend: { n: ['Chorus', 'Rain', 'Renewal', 'Tide'], m: 0.95, d: m => `Heals every ally for ${p(m)} of attack.` },
  shield: { n: ['Ward', 'Aegis', 'Bulwark', 'Shell'], m: 3.0, d: m => `Shields the most wounded ally for ${p(m)} of attack.` },
  ward: { n: ['Dome', 'Sanctum', 'Circle', 'Veil'], m: 1.1, d: m => `Shields every ally for ${p(m)} of attack.` },
  rally: { n: ['Warcry', 'Anthem', 'Banner', 'Rally'], m: 0.25, d: m => `Allies gain +${p(m)} attack for 6s.` },
  taunt: { n: ['Challenge', 'Bellow', 'Roar', 'Stand'], m: 0.4, d: m => `Taunts nearby enemies and takes ${p(m)} less damage for 4s.` },
  stun: { n: ['Slam', 'Hex', 'Crush', 'Shock'], m: 1.4, d: m => `Hits for ${p(m)} and stuns the target for 1.6s.` },
  quake: { n: ['Quake', 'Stomp', 'Tremor'], m: 1.0, d: m => `Hits nearby enemies for ${p(m)} and stuns them for 1s.` },
  drain: { n: ['Drain', 'Siphon', 'Feast', 'Bite'], m: 1.8, d: m => `Hits for ${p(m)} and heals itself for 60% of it.` },
  leap: { n: ['Pounce', 'Leap', 'Ambush', 'Dive'], m: 2.0, d: m => `Leaps onto the weakest enemy and hits for ${p(m)}.` },
  dot: { n: ['Venom', 'Blight', 'Sting', 'Wound'], m: 3.0, d: m => `Afflicts the target for ${p(m)} damage over 5s.` },
  burn: { n: ['Field', 'Pyre', 'Ring', 'Pool'], m: 1.6, d: m => `Scorches the area around the target for ${p(m)} over 4s.` },
  slow: { n: ['Snare', 'Grasp', 'Tide', 'Frost'], m: 1.2, d: m => `Hits around the target for ${p(m)} and slows them for 3s.` }
};
const PAS = {
  thorns: { n: ['Hide', 'Spines', 'Bark'], m: 0.2, d: m => `Reflects ${p(m)} of melee damage taken.` },
  lifesteal: { n: ['Hunger', 'Thirst', 'Appetite'], m: 0.18, d: m => `Heals for ${p(m)} of damage dealt.` },
  regen: { n: ['Vigor', 'Renewal', 'Heart'], m: 0.02, d: m => `Regenerates ${p(m)} of max HP each second.` },
  dodge: { n: ['Step', 'Blur', 'Veil'], m: 0.18, d: m => `${p(m)} chance to dodge attacks.` },
  crit: { n: ['Edge', 'Focus', 'Eye'], m: 0.22, d: m => `${p(m)} chance to land a critical hit.` },
  swift: { n: ['Spark', 'Haste', 'Quickening'], m: 0.6, d: m => `Starts battle with ${Math.round(m * 100)} energy.` },
  fury: { n: ['Fury', 'Rage', 'Temper'], m: 0.4, d: m => `+${p(m)} attack speed below half HP.` },
  bulwark: { n: ['Plating', 'Guard', 'Carapace'], m: 0.25, d: m => `Starts battle with a shield of ${p(m)} max HP.` }
};
function p(m) { return Math.round(m * 100) + '%'; }
const ROLE_ACT = { D: ['taunt', 'shield', 'quake', 'stun'], S: ['cleave', 'strike', 'drain', 'stun'], R: ['volley', 'snipe', 'dot', 'slow'],
  M: ['blast', 'burn', 'stun', 'slow', 'drain'], H: ['heal', 'mend', 'ward', 'rally'], A: ['leap', 'strike', 'dot'] };
const ROLE_PAS = { D: ['thorns', 'bulwark', 'regen'], S: ['crit', 'lifesteal', 'fury'], R: ['crit', 'swift'], M: ['swift', 'crit'],
  H: ['regen', 'swift'], A: ['dodge', 'crit', 'lifesteal'] };

const CHARS = [];
const CHAR = {};
(function buildChars() {
  let num = 0;
  for (const f of FACTIONS) {
    const rows = CHAR_ROWS[f.id].trim().split('\n');
    rows.forEach((row, i) => {
      const [name, rr, role, body, parts, flavour] = row.split('|');
      const id = ({ ember: 'em', wild: 'wi', stone: 'sn', tide: 'ti', star: 'sr', gloom: 'gl' })[f.id] + String(i + 1).padStart(2, '0');
      const r = RIDX[rr], seed = hashStr(id + name), R = rng(seed);
      const ro = ROLES[role], bm = BODY_MOD[body] || {};
      const jit = () => 0.92 + R() * 0.16;
      const mult = RAR[r].mult;
      const c = {
        id, num: ++num, name, short: name.split(',')[0], fac: f.id, r, role, body, parts: new Set(parts ? parts.split(',') : []), flavour, seed,
        hp: Math.round(ro.hp * mult * (bm.hp || 1) * jit() / 10) * 10,
        atk: Math.round(ro.atk * mult * (bm.atk || 1) * jit()),
        def: Math.round(ro.def * mult * (bm.def || 1) * jit()),
        spd: clamp(ro.spd + (bm.spd || 0) + (R() < 0.3 ? 1 : 0) - (R() < 0.2 ? 1 : 0), 1, 10),
        rng: ro.rng + (ro.rng > 2 ? Math.round((R() - 0.5) * 2) * 0.5 : 0)
      };
      const words = f.words, kind = pick(R, ROLE_ACT[role]), A = ACT[kind];
      const am = A.m * (1 + 0.1 * r) * (0.95 + R() * 0.1);
      c.act = { k: kind, m: am, name: pick(R, words) + ' ' + pick(R, A.n) };
      if (r >= 2 && (r >= 3 || R() < 0.7)) {
        const pk = pick(R, ROLE_PAS[role]), P = PAS[pk];
        const pm = P.m * (1 + 0.15 * (r - 2));
        let pw = pick(R, words);
        if (c.act.name.startsWith(pw)) pw = words[(words.indexOf(pw) + 3) % words.length];
        c.pas = { k: pk, m: pm, name: pw + ' ' + pick(R, P.n) };
      }
      CHARS.push(c); CHAR[id] = c;
    });
  }
})();
function actDesc(a) { return ACT[a.k].d(a.m); }
function pasDesc(a) { return PAS[a.k].d(a.m); }
const BY_FR = {};
for (const c of CHARS) { const k = c.fac + c.r; (BY_FR[k] = BY_FR[k] || []).push(c); }
const PLANNED_TOTAL = '1,000+';

/* ---------- pack families (each pool is weighted to its home faction) ---------- */
const FAMILIES = [
  { id: 'dragonfire', name: 'Dragonfire', fac: 'ember', fx: 'embers', tag: 'Embers and dragon flame' },
  { id: 'wildheart', name: 'Wildheart', fac: 'wild', fx: 'leaves', tag: 'Leaves and forest light' },
  { id: 'stoneforge', name: 'Stoneforge', fac: 'stone', fx: 'sparks', tag: 'Dust and forge sparks' },
  { id: 'deeptide', name: 'Deeptide', fac: 'tide', fx: 'bubbles', tag: 'Bubbles and sea spray' },
  { id: 'starfall', name: 'Starfall', fac: 'star', fx: 'stars', tag: 'Stars and glowing motes' },
  { id: 'gloomveil', name: 'Gloomveil', fac: 'gloom', fx: 'wisps', tag: 'Ghostly wisps' }
];
const FAMILY = {}; FAMILIES.forEach(f => { FAMILY[f.id] = f; });
const HOME_WEIGHT = 0.7;
