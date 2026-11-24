/* ---------- world data: rarity tiers, card categories and the card table ---------- */

const RAR = [
  { id: 'C', name: 'Common', col: '#c3cad6', deep: '#4a5260', base: 2 },
  { id: 'U', name: 'Uncommon', col: '#5fe29a', deep: '#14583a', base: 6 },
  { id: 'R', name: 'Rare', col: '#55b6ff', deep: '#123f7a', base: 22 },
  { id: 'E', name: 'Epic', col: '#c27cff', deep: '#43207a', base: 80 },
  { id: 'L', name: 'Legendary', col: '#ffc53d', deep: '#7a4a08', base: 320 },
  { id: 'M', name: 'Mythic', col: '#ff6fd8', deep: '#5a1050', base: 1400 },
  { id: 'S', name: 'Singularity', col: '#9ff7ff', deep: '#120a40', base: 7500 }
];
const RIDX = { C: 0, U: 1, R: 2, E: 3, L: 4, M: 5, S: 6 };
const TOP = 6;

/* Each category: theme colours, default backdrop for its art, and the particle effect its packs burst with. */
const CATS = [
  { id: 'animals', name: 'Animals', icon: 'beast', bg: 'meadow', fx: 'leaves', col: '#ffb24a', dark: '#3a2208' },
  { id: 'sea', name: 'Sea Life', icon: 'fish', bg: 'under', fx: 'bubbles', col: '#3cc7e0', dark: '#03141f' },
  { id: 'dinos', name: 'Dinosaurs', icon: 'dino', bg: 'prehist', fx: 'embers', col: '#8ad04a', dark: '#14200a' },
  { id: 'space', name: 'Space', icon: 'planet', bg: 'space', fx: 'stars', col: '#a9b6ff', dark: '#080a24' },
  { id: 'food', name: 'Food & Sweets', icon: 'donut', bg: 'kitchen', fx: 'confetti', col: '#ff8ac8', dark: '#2a0a1e' },
  { id: 'vehicles', name: 'Vehicles', icon: 'car', bg: 'road', fx: 'sparks', col: '#ff6a3a', dark: '#1e0c06' },
  { id: 'sports', name: 'Sports', icon: 'ball', bg: 'stadium', fx: 'confetti', col: '#4ae08a', dark: '#06200f' },
  { id: 'lands', name: 'Landscapes', icon: 'scene', bg: 'none', fx: 'leaves', col: '#6ad0a0', dark: '#06201a' },
  { id: 'weather', name: 'Weather', icon: 'scene', bg: 'none', fx: 'snow', col: '#8ad8ff', dark: '#06182a' },
  { id: 'gems', name: 'Gems & Treasure', icon: 'gem', bg: 'vault', fx: 'sparks', col: '#ffd24a', dark: '#201804' },
  { id: 'robots', name: 'Robots', icon: 'robot', bg: 'lab', fx: 'sparks', col: '#7ae0ff', dark: '#061a22' },
  { id: 'music', name: 'Music', icon: 'guitar', bg: 'stage', fx: 'confetti', col: '#ff5ad0', dark: '#1e0620' },
  { id: 'build', name: 'Buildings', icon: 'castle', bg: 'town', fx: 'sparks', col: '#e8c08a', dark: '#1e160c' },
  { id: 'fantasy', name: 'Fantasy', icon: 'dragon', bg: 'magic', fx: 'stars', col: '#c08aff', dark: '#140a26' },
  { id: 'spooky', name: 'Spooky', icon: 'pumpkin', bg: 'grave', fx: 'wisps', col: '#ff9a3a', dark: '#0c0614' }
];
const CAT = {}; CATS.forEach((c, i) => { c.i = i; CAT[c.id] = c; });

/* One row per card: name | rarity | art template | parameters. Everything else (value, art, effects) derives from the row,
   so the table scales to thousands of cards without per-card code. */
const CARD_ROWS = {
animals: `Bunny|C|critter|kind=bunny;col=#e8dccc
Hedgehog|C|critter|kind=hog;col=#9a7452
Tree Frog|C|critter|kind=frog;col=#62d05a
Field Mouse|C|critter|kind=mouse;col=#b4a8a4
Duckling|C|bird|kind=duck;col=#ffd84a
Piglet|C|beast|kind=pig;col=#f6a8b4
Red Fox|U|beast|kind=fox;col=#e8762c
Snowy Owl|U|bird|kind=owl;col=#f2f2f6
Panda|U|beast|kind=panda;col=#f6f6f6
Raccoon|U|beast|kind=raccoon;col=#8e8e96
Tiger|R|beast|kind=tiger;col=#f2902c
Peacock|R|bird|kind=peacock;col=#2a8ae8
Zebra|R|beast|kind=zebra;col=#f8f8f8
Elephant|E|beast|kind=elephant;col=#a2a8b2
Lion|E|beast|kind=lion;col=#e8b452
Snow Leopard|L|beast|kind=leopard;col=#e8eaf2;bg=snow
Golden Stag|M|beast|kind=stag;col=#f2c84e;bg=magic
Aurora Wolf|S|beast|kind=wolf;col=#a4ecff`,
sea: `Clownfish|C|fish|kind=clown;col=#ff8a2a
Starfish|C|starfish|col=#ff7a5a
Hermit Crab|C|crab|col=#e8503a
Blue Tang|C|fish|kind=tang;col=#2e6ce8
Spiral Shell|C|shell|col=#f2c8a2
Pufferfish|C|fish|kind=puffer;col=#ecd274
Moon Jelly|U|jelly|col=#c8a2ff
Seahorse|U|seahorse|col=#ffb03a
Octopus|U|octo|col=#e85a8e
Angelfish|U|fish|kind=angel;col=#ffe070
Sea Turtle|R|turtle|col=#5aa85a
Manta Ray|R|ray|col=#3e4e72;bg=deep
Swordfish|R|fish|kind=sword;col=#4a7ab4
Dolphin|E|whale|kind=dolphin;col=#7aaad4
Hammerhead|E|fish|kind=hammer;col=#7c8c9e;bg=deep
Orca|L|whale|kind=orca;col=#1c1c26
Lantern Angler|M|fish|kind=angler;col=#3e2e62;bg=deep
Leviathan of Light|S|whale|kind=whale;col=#7af0ff`,
dinos: `Little Compy|C|dino|kind=raptor;col=#8ac45a;size=0.75
Dino Egg|C|egg|col=#ece0c4;spots=#8ab05a
Raptor|C|dino|kind=raptor;col=#a87e4e
Pterodactyl|C|dino|kind=flyer;col=#c88e5e
Crested Hadro|C|dino|kind=crest;col=#6a9ec4
Ammonite Fossil|C|fossil|col=#c8a87c
Triceratops|U|dino|kind=horned;col=#8aa46a
Stegosaurus|U|dino|kind=plated;col=#6a8e5a
Ankylosaurus|U|dino|kind=armored;col=#a88e6a
Plesiosaur|U|dino|kind=swimmer;col=#4a7e9e;bg=under
T-Rex|R|dino|kind=rex;col=#5e7e4a
Brachiosaurus|R|dino|kind=longneck;col=#8ab4a4
Spinosaurus|R|dino|kind=sail;col=#a8623a
Fossil Skull|E|skullfossil|col=#ece0c4;bg=cave
Sky King Ptero|E|dino|kind=flyer;col=#e8623a;size=1.3
Volcano Rex|L|dino|kind=rex;col=#3a2a2e;lava=1
Amber Raptor|M|dino|kind=raptor;col=#ffb030;amber=1
Crystal Titan|S|dino|kind=longneck;col=#c8f2ff`,
space: `Red Planet|C|planet|kind=rocky;col=#d0643a
Full Moon|C|moon|col=#d4d4dc
Comet|C|comet|col=#8ae4ff
Satellite|C|satellite|col=#ccd0d8
Asteroid|C|planet|kind=asteroid;col=#8e7e6e
Shooting Star|C|comet|col=#fff0a0;star=1
Ringed Giant|U|planet|kind=ringed;col=#e8b472
Rocket|U|rocket|col=#eeeef4;acc=#e8403a
Astronaut|U|astronaut|col=#f4f4f4
Ice World|U|planet|kind=ice;col=#a4e4ff
Spiral Galaxy|R|galaxy|col=#a88eff
Lava World|R|planet|kind=lava;col=#e85e2a
Flying Saucer|R|ufo|col=#a8d4c4
Space Station|E|station|col=#d4d8e0
Ocean Planet|E|planet|kind=earth;col=#3a8ee8
Nebula Nursery|L|nebula|col=#ff7ad8
Black Hole|M|blackhole|col=#ffb050
Starborn Core|S|star|col=#fff2a8`,
food: `Red Apple|C|fruit|kind=apple;col=#e8403a
Choc Chip Cookie|C|cookie|col=#cc944e
Strawberry|C|fruit|kind=strawberry;col=#f23a4a
Watermelon Slice|C|fruit|kind=melon;col=#f2465a
Swirl Lollipop|C|lollipop|col=#ff6ab4
Sushi Roll|C|sushi|col=#f2f2ee
Glazed Donut|U|donut|col=#ff8ac8
Cupcake|U|cupcake|col=#a8e4ff
Pizza Slice|U|pizza|col=#f2c25a
Taco|U|taco|col=#f2c05a
Triple Scoop|R|icecream|col=#ffb4d4
Pancake Stack|R|pancakes|col=#e8a85a
Burger Deluxe|R|burger|col=#c87a3a
Rainbow Cake|E|cake|layers=6;col=#ffffff
Macaron Tower|E|macaron|col=#ffc4e0
Golden Milkshake|L|shake|col=#ffd860
Royal Wedding Cake|M|cake|layers=3;tiers=3;col=#fff6ee
Galaxy Gelato|S|icecream|col=#9a7aff`,
vehicles: `Bicycle|C|bike|kind=bicycle;col=#3ac4e8
City Bus|C|bus|col=#ffc83a
Sailboat|C|boat|kind=sail;col=#ffffff;bg=seaside
Delivery Van|C|car|kind=van;col=#eeeeee
Tractor|C|car|kind=tractor;col=#5aa83a;bg=farm
Hot Air Balloon|C|balloon|col=#ff6a4a;bg=sky
Steam Train|U|train|kind=steam;col=#2e2e38
Propeller Plane|U|plane|kind=prop;col=#e8403a;bg=sky
Motorbike|U|bike|kind=motor;col=#2e5ee8
Helicopter|U|heli|col=#ffb030;bg=sky
Sports Car|R|car|kind=sports;col=#e82e3e
Speedboat|R|boat|kind=speed;col=#ffffff;acc=#2a8ae8;bg=seaside
Monster Truck|R|car|kind=monster;col=#5ae05a
Bullet Train|E|train|kind=bullet;col=#f2f6fa
Sky Jet|E|plane|kind=jet;col=#8e9eae;bg=sky
Race Car|L|car|kind=race;col=#ffd030
Brass Airship|M|balloon|kind=airship;col=#c8904a;bg=sky
Lightspeed Racer|S|car|kind=race;col=#c8a8ff`,
sports: `Soccer Ball|C|ball|kind=soccer
Basketball|C|ball|kind=basket
Tennis Ball|C|ball|kind=tennis
Baseball|C|ball|kind=base
Coach Whistle|C|whistle|col=#d4d8e0
Volleyball|C|ball|kind=volley
Bowling Ball|U|ball|kind=bowling;col=#5a2ae8
Skateboard|U|skate|col=#ff5a3a
Tennis Racket|U|racket|col=#3ae0a8
Boxing Glove|U|glove|col=#e8303a
Surfboard|R|surf|col=#3ac8ff;bg=seaside
Running Shoe|R|shoe|col=#ff6a2a
Gold Medal|R|medal|col=#ffd040
Champion Helmet|E|helmet|col=#2a4ae8
Silver Cup|E|trophy|col=#d4d8e0
Golden Trophy|L|trophy|col=#ffd040
Crystal Match Ball|M|ball|kind=soccer;crystal=1
Galaxy Cup|S|trophy|col=#c8b8ff`,
lands: `Green Hills|C|scene|sky=day;hills=#5ab84a;sun=1
Pine Forest|C|scene|sky=day;trees=pine;hills=#3a7a3a
Sandy Beach|C|scene|sky=day;sea=1;sand=1;palms=1
Calm Lake|C|scene|sky=dawn;lake=1;mtn=#7a8ab0;trees=pine
Desert Dunes|C|scene|sky=hot;dunes=1;sun=1
Flower Field|C|scene|sky=day;hills=#6ac45a;flowers=1
Snowy Peak|U|scene|sky=day;mtn=#8a9ab8;snowcap=1
Red Canyon|U|scene|sky=hot;canyon=1
Tropical Island|U|scene|sky=day;sea=1;island=1;palms=1
Waterfall|U|scene|sky=day;falls=1;mtn=#5a7a5a;trees=round
Glacier Bay|R|scene|sky=cold;sea=1;ice=1;mtn=#b8d0e8;snowcap=1
Blossom Valley|R|scene|sky=dawn;hills=#7ac46a;blossom=1;mtn=#9a8ab8
Volcano Isle|R|scene|sky=dusk;sea=1;volcano=1
Northern Lights|E|scene|sky=night;aurora=1;mtn=#2a3a5a;snowcap=1;trees=pine
Crystal Cave|E|scene|cave=1
Floating Isles|L|scene|sky=day;floating=1
Rainbow Falls|M|scene|sky=day;falls=1;rainbow=1;mtn=#4a8a6a;trees=round
Edge of the World|S|scene|sky=cosmic;floating=1;falls=1`,
weather: `Sunny Day|C|scene|sky=day;sun=2;hills=#6ac45a
Fluffy Clouds|C|scene|sky=day;clouds=3;hills=#5ab84a
Rain Shower|C|scene|sky=grey;clouds=3;rain=1;hills=#4a8a4a
Snowfall|C|scene|sky=cold;snow=1;hills=#e8f0f8;trees=pine
Foggy Morning|C|scene|sky=dawn;fog=1;trees=pine;hills=#5a7a6a
Windy Day|C|scene|sky=day;wind=1;hills=#7ac45a;clouds=2
Thunderstorm|U|scene|sky=storm;clouds=4;rain=1;bolt=1
Rainbow|U|scene|sky=day;rainbow=1;clouds=2;hills=#5ab84a
Hailstorm|U|scene|sky=grey;clouds=4;hail=1;hills=#5a8a5a
Golden Sunset|U|scene|sky=sunset;sun=1;sea=1
Tornado|R|scene|sky=storm;tornado=1;hills=#8a9a5a
Blizzard|R|scene|sky=cold;snow=2;wind=1;trees=pine;hills=#e8f0f8
Heatwave|R|scene|sky=hot;sun=3;dunes=1
Ball Lightning|E|scene|sky=night;orb=1;clouds=2;hills=#2a3a4a
Double Rainbow|E|scene|sky=day;rainbow=2;falls=0;hills=#5ab84a;clouds=1
Solar Eclipse|L|scene|sky=eclipse;eclipse=1;mtn=#1a1a2a
Supercell|M|scene|sky=storm;supercell=1;bolt=2;hills=#5a6a4a
Storm of Stars|S|scene|sky=cosmic;clouds=3;bolt=3`,
gems: `Quartz Crystal|C|cluster|col=#eceef6
Copper Coins|C|coins|col=#cc7a3a
Amethyst|C|gem|cut=round;col=#a45ee8
Old Key|C|key|col=#cca452
Pearl|C|pearl|col=#f6eef2
Silver Ring|C|ring|col=#d4d8e0;stone=#8ae0ff
Ruby Heart|U|gem|cut=heart;col=#e82a4e
Emerald|U|gem|cut=emerald;col=#2ac46e
Gold Bars|U|goldbar|col=#ffcc40
Sapphire|U|gem|cut=pear;col=#2e5ee8
Treasure Chest|R|chest|col=#a8642e
Jeweled Amulet|R|amulet|col=#ff5a8e
Topaz Cluster|R|cluster|col=#ffb030
Royal Crown|E|crown|col=#ffcc40
Diamond|E|gem|cut=princess;col=#e8f8ff
Dragon's Hoard|L|coins|col=#ffcc40;pile=1
Jeweled Egg|M|egg|col=#3a5ae8;jewel=1;bg=velvet
Star Diamond|S|gem|cut=round;col=#dcfaff`,
robots: `Toaster Bot|C|robot|head=box;eyes=2;body=box;base=legs;col=#c8ccd4;acc=#ff6a3a
Sweeper Bot|C|robot|head=dome;eyes=1;body=barrel;base=wheels;col=#5ab0e8;acc=#ffd040
Bolt|C|robot|head=round;eyes=2;body=round;base=hover;col=#ffb030;acc=#3ae0ff
Beep|C|robot|head=tv;eyes=2;body=box;base=treads;col=#8ae05a;acc=#ff5ab0
Rusty|C|robot|head=box;eyes=2;body=barrel;base=legs;col=#c8783a;acc=#5ae0c8
Gizmo|C|robot|head=dome;eyes=3;body=round;base=wheels;col=#e85a8a;acc=#fff04a
Chef Bot|U|robot|head=box;eyes=2;body=box;base=wheels;col=#f2f2f6;acc=#e8403a;hat=chef
Garden Bot|U|robot|head=round;eyes=2;body=barrel;base=treads;col=#5ac46a;acc=#ffd040;flower=1
Delivery Drone|U|drone|col=#e8e8ee;acc=#3a8ae8
Tin Knight|U|robot|head=helm;eyes=visor;body=box;base=legs;col=#b8c0cc;acc=#e8403a;arms=sword
Mech Walker|R|robot|head=box;eyes=visor;body=box;base=legs;col=#4a5a6a;acc=#ffb030;big=1
Scout Drone|R|drone|col=#2a2e3a;acc=#3ae08a
Builder Bot|R|robot|head=dome;eyes=2;body=box;base=treads;col=#ffc83a;acc=#2a2a32;arms=claw
Titan Mech|E|robot|head=helm;eyes=visor;body=box;base=legs;col=#e8403a;acc=#f2f2f6;big=1;arms=claw
Android Pilot|E|robot|head=round;eyes=visor;body=round;base=legs;col=#f2f4f8;acc=#3ae0ff;slim=1
Gold Sentinel|L|robot|head=helm;eyes=visor;body=box;base=hover;col=#ffcc40;acc=#3ae0ff;big=1
Quantum Core|M|orbbot|col=#8a5aff
Omega Mind|S|orbbot|col=#c8f8ff`,
music: `Music Notes|C|notes|col=#ff5ad0
Maracas|C|maracas|col=#ff8a3a
Tambourine|C|tamb|col=#e8c07a
Wooden Flute|C|flute|col=#c8904a
Triangle|C|triangle|col=#d4d8e0
Vinyl Record|C|record|col=#2a2a32;acc=#ff5a5a
Acoustic Guitar|U|guitar|kind=acoustic;col=#d49a5a
Drum|U|drum|col=#e8403a
Microphone|U|mic|col=#c8ccd4
Headphones|U|headphones|col=#3a3a4a;acc=#5ae0ff
Electric Guitar|R|guitar|kind=electric;col=#e82a8a
Trumpet|R|trumpet|col=#ffcc40
Violin|R|violin|col=#a8542a
Grand Piano|E|piano|col=#1e1e26
Saxophone|E|sax|col=#ffc040
Golden Harp|L|harp|col=#ffcc40
Neon Boombox|M|boombox|col=#2a2a3a;acc=#ff5ad0
Infinite Vinyl|S|record|col=#1a1a3a;acc=#9ff7ff`,
build: `Cottage|C|house|col=#f2e2c4;roof=#c8543a
Red Barn|C|barn|col=#c8403a;bg=farm
Igloo|C|igloo|col=#eef4fa;bg=snow
Circus Tent|C|tent|col=#e8403a
Treehouse|C|treehouse|col=#a8743a;bg=forest
Windmill|C|windmill|col=#f2e8d4;bg=farm
Lighthouse|U|lighthouse|col=#f2f2f2;acc=#e8403a;bg=seaside
Clock Tower|U|tower|kind=clock;col=#c8a87a
City Tower|U|skyscraper|col=#7ab4e8
Stone Bridge|U|bridge|col=#a89a8a
Castle|R|castle|col=#c8c0b4
Observatory|R|observatory|col=#e8e4f0;bg=night
Columned Temple|R|temple|col=#f2ece0
Glass Palace|E|palace|col=#a8e8ff
Sky Spire|E|skyscraper|col=#c8d8ff;tall=1;bg=night
Golden Pyramid|L|pyramid|col=#ffcc50;bg=desert
Cloud Castle|M|castle|col=#ffffff;cloud=1;bg=sky
Tower of Infinity|S|tower|kind=spire;col=#d4c8ff`,
fantasy: `Green Slime|C|slime|col=#5ae08a
Magic Mushroom|C|mushroom|col=#e84a5a
Love Potion|C|potion|col=#ff4ab4
Star Wand|C|wand|col=#ffd040
Forest Wisp|C|wisp|col=#9affc8
Spellbook|C|book|col=#7a3ac8
Pixie|U|fairy|col=#ffb4f0
Crystal Ball|U|orb|col=#a8c8ff
Unicorn Foal|U|unicorn|col=#ffffff;size=0.8
Enchanted Sword|U|sword|col=#c8d8ff
Griffin|R|griffin|col=#c8a46a
Unicorn|R|unicorn|col=#ffffff
Baby Dragon|R|dragon|col=#6ad05a;size=0.8
Phoenix|E|phoenix|col=#ff7a2a
Frost Dragon|E|dragon|col=#9ae4ff
Fire Dragon|L|dragon|col=#e8402a;big=1
Rainbow Unicorn|M|unicorn|col=#ffffff;rainbow=1
Cosmic Dragon|S|dragon|col=#b89aff;big=1`,
spooky: `Jack-o'-Lantern|C|pumpkin|col=#ff8a1a
Little Ghost|C|ghost|col=#f4f4ff
Bat|C|bat|col=#4a3a5a
Spooky Candle|C|candle|col=#f2ead4
Web Spider|C|spider|col=#2a2a32
Tombstone|C|tomb|col=#8a8a96
Black Cat|U|cat|col=#26222e
Witch Hat|U|hat|col=#3a2a5a
Bubbling Cauldron|U|cauldron|col=#2a2a32;brew=#7aff5a
Grinning Skull|U|skull|col=#ece6d4
Haunted House|R|haunted|col=#5a4a6a
Mummy|R|mummy|col=#e8dcc0
Night Crow|R|bird|kind=crow;col=#22222e
Ghost Ship|E|ghostship|col=#7ae0c8
Vampire Bat King|E|bat|col=#5a2a4a;big=1
Pumpkin King|L|pumpkin|col=#ff7a10;crown=1
Phantom Queen|M|ghost|col=#d8c8ff;crown=1
The Void Lantern|S|candle|col=#c8b8ff;lantern=1`
};

const CARDS = [], CARD = {};
(function buildCards() {
  let num = 0;
  for (const cat of CATS) {
    CARD_ROWS[cat.id].trim().split('\n').forEach((row, i) => {
      const [name, rr, tpl, ps] = row.split('|');
      const p = {};
      for (const kv of (ps || '').split(';')) { if (!kv) continue; const [k, v] = kv.split('='); p[k] = v === undefined ? '1' : v; }
      const id = cat.id.slice(0, 3) + String(i + 1).padStart(2, '0');
      const r = RIDX[rr], seed = hashStr(id + name), R = rng(seed);
      const c = { id, num: ++num, name, cat: cat.id, r, tpl, p, seed, mult: 0.8 + R() * 0.5 };
      c.base = Math.max(1, Math.round(RAR[r].base * c.mult));
      CARDS.push(c); CARD[id] = c;
    });
  }
})();
const BY_CR = {};
for (const c of CARDS) { const k = c.cat + c.r; (BY_CR[k] = BY_CR[k] || []).push(c); }
const BY_R = [[], [], [], [], [], [], []];
for (const c of CARDS) BY_R[c.r].push(c);
