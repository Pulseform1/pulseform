// Game data shared by the 3D game. (classic.html keeps its own copy.)
export const ELEMENTS = ['phys','fire','ice','elec','wind'];
export const EL_NAME = {phys:'Phys',fire:'Fire',ice:'Ice',elec:'Elec',wind:'Wind'};

export const SKILLS = {
  cleave:   {name:'Cleave',      el:'phys', pow:24, hp:8,  target:'one'},
  rampage:  {name:'Rampage',     el:'phys', pow:20, hp:16, target:'all'},
  ember:    {name:'Ember',       el:'fire', pow:22, sp:4,  target:'one'},
  blaze:    {name:'Blaze',       el:'fire', pow:18, sp:10, target:'all'},
  inferno:  {name:'Inferno',     el:'fire', pow:48, sp:14, target:'one'},
  frost:    {name:'Frost',       el:'ice',  pow:22, sp:4,  target:'one'},
  blizzard: {name:'Blizzard',    el:'ice',  pow:18, sp:10, target:'all'},
  spark:    {name:'Spark',       el:'elec', pow:22, sp:4,  target:'one'},
  thunder:  {name:'Thunderclap', el:'elec', pow:18, sp:10, target:'all'},
  gust:     {name:'Gust',        el:'wind', pow:22, sp:4,  target:'one'},
  gale:     {name:'Gale',        el:'wind', pow:18, sp:10, target:'all'},
  mend:     {name:'Mend',        heal:40,   sp:5,  target:'ally'},
  mendall:  {name:'Mend All',    heal:32,   sp:12, target:'allies'},
};

export const PERSONAS = {
  lantern: {name:'Lantern',  arcana:'Fool',      str:5,  mag:5,  weak:['ice'],  res:[],              skills:['cleave','ember','mend']},
  mistral: {name:'Mistral',  arcana:'Fool',      str:3,  mag:6,  weak:['elec'], res:['wind'],        skills:['gust','frost']},
  valkyr:  {name:'Valkyr',   arcana:'Chariot',   str:9,  mag:3,  weak:['wind'], res:['phys'],        skills:['cleave','rampage','spark']},
  brunhild:{name:'Brunhild', arcana:'Chariot',   str:14, mag:6,  weak:['ice'],  res:['phys','fire'], skills:['rampage','blaze','inferno']},
  tinker:  {name:'Tinker',   arcana:'Magician',  str:4,  mag:9,  weak:['fire'], res:['elec'],        skills:['spark','thunder','gust']},
  daedal:  {name:'Daedal',   arcana:'Magician',  str:6,  mag:14, weak:['fire'], res:['elec','wind'], skills:['thunder','gale','mendall']},
  sibyl:   {name:'Sibyl',    arcana:'Priestess', str:3,  mag:9,  weak:['phys'], res:['ice'],         skills:['frost','blizzard','mend']},
  seraph:  {name:'Seraph',   arcana:'Priestess', str:5,  mag:15, weak:[],       res:['ice','wind'],  skills:['blizzard','gale','mendall']},
  ferryman:{name:'Ferryman', arcana:'Hermit',    str:8,  mag:8,  weak:['wind'], res:['fire','ice'],  skills:['inferno','gale','mend']},
  anchor:  {name:'Anchor',   arcana:'Hermit',    str:13, mag:13, weak:['wind'], res:['phys','elec','ice'], skills:['rampage','blizzard','thunder','mendall']},
};

export const ALLIES = {
  rin:   {name:'Rin',   str:7, mag:3, hpBonus:15, weak:['ice'],  res:['fire'],
          learn:[['cleave',1],['ember',1],['blaze',4],['rampage',7],['inferno',10]]},
  kaito: {name:'Kaito', str:3, mag:7, hpBonus:0,  weak:['wind'], res:['elec'],
          learn:[['spark',1],['mend',1],['gust',3],['thunder',5],['mendall',8]]},
};

// days: 0=Mon … 6=Sun
export const LINKS = {
  rin: {name:'Rin Asakura', arcana:'Chariot', color:'#FF3D7F', days:[0,2,4,6], req:null, unlock:{3:'valkyr',5:'brunhild'},
    blurb:'Track team ace. Fights alongside you.',
    scenes:[
      {lines:['Hey, transfer student! You were in the Tower last night too, right?','I saw you swing that thing. Not bad. Want to train together sometime?'],
       choices:[['"Only if you can keep up."',2],['"Sure, I guess."',1]]},
      {lines:['Coach says my form is off. I keep thinking about the Tower instead of the track.','Is it weird that the fighting feels more real than racing?'],
       choices:[['"Both are part of you."',2],['"Kind of weird, yeah."',1]]},
      {lines:['I bombed the qualifier. Three tenths of a second. Three!','...Sorry. I don\'t usually vent like this.'],
       choices:[['"Vent all you want. I\'m here."',2],['"There\'s always next time."',1]]},
      {lines:['I\'ve decided. I\'m running the regional, and I\'m clearing the Tower. Both.','You\'ll be at the finish line, right?'],
       choices:[['"Front row."',2],['"If I\'m not busy."',0]]},
      {lines:['Personal best. And you were there, yelling louder than anyone.','Whatever\'s at the top of that Tower — we take it down together. Promise.'],
       choices:[['"Promise."',2],['*fist bump*',2]]},
    ]},
  kaito: {name:'Kaito Mori', arcana:'Magician', color:'#3EE6FF', days:[1,3,5], req:['courage',2], unlock:{3:'tinker',5:'daedal'},
    blurb:'Class clown who hides how scared he is. Fights alongside you.',
    scenes:[
      {lines:['Duuude. You actually went back into that creepy Tower? On purpose?','Okay, okay, I\'m in. Somebody has to keep you entertained.'],
       choices:[['"Glad to have you."',2],['"Try not to scream."',1]]},
      {lines:['Real talk... my hands shook the whole time last night.','Don\'t tell Rin, okay? She already thinks I\'m a joke.'],
       choices:[['"Being scared and going anyway is brave."',2],['"Your secret\'s safe."',1]]},
      {lines:['My dad called. First time in a year. He wants me to "get serious."','Maybe he\'s right. Maybe I\'m just the funny guy and that\'s it.'],
       choices:[['"You\'re a lot more than that."',2],['"Ignore him."',1]]},
      {lines:['I\'ve been studying the Tower\'s patterns. Look — the bell rings exactly at 12:09.','Pretty smart for a clown, huh?'],
       choices:[['"Smartest guy I know."',2],['"Huh. Neat."',1]]},
      {lines:['I told my dad about the stuff I care about. He actually listened.','Thanks, partner. Let\'s ring that Ninth Bell for good.'],
       choices:[['"Partner."',2],['"Let\'s go."',2]]},
    ]},
  mira: {name:'Mira Hoshino', arcana:'Priestess', color:'#B66BFF', days:[2,5,6], req:['knowledge',2], unlock:{3:'sibyl',5:'seraph'},
    blurb:'Student council president. Knows more than she says.',
    scenes:[
      {lines:['You\'re the one asking about the Ninth Bell. The library has a record of it.','It\'s rung before. Thirty years ago. Nobody who heard it remembers why.'],
       choices:[['"Will you help me find out?"',2],['"Creepy."',1]]},
      {lines:['My grandmother was a student here thirty years ago.','She kept a diary. Half the pages are torn out.'],
       choices:[['"Let\'s read it together."',2],['"Maybe leave it alone."',0]]},
      {lines:['Everyone expects the council president to have every answer.','I don\'t. I\'m terrified of being wrong.'],
       choices:[['"Nobody has every answer."',2],['"You seem fine to me."',1]]},
      {lines:['The diary mentions a "Pale Monarch" who wakes when the moon is full.','The next full moon is... on the 30th day.'],
       choices:[['"Then we\'ll be ready."',2],['"That\'s soon..."',1]]},
      {lines:['I finally let someone else lead for once. It felt... freeing.','Take this — Grandma\'s charm. I think it was meant for you.'],
       choices:[['"I\'ll keep it close."',2],['"Thank you, Mira."',2]]},
    ]},
  gen: {name:'Old Gen', arcana:'Hermit', color:'#FFD23F', days:[0,1,2,3,4,5,6], req:['charm',2], unlock:{3:'ferryman',5:'anchor'},
    blurb:'Runs the corner shop. Ranks give shop discounts.',
    scenes:[
      {lines:['Hm. You buy a lot of medicine for a high schooler.','...I won\'t ask. Want some tea?'],
       choices:[['"I\'d love some."',2],['"I\'m in a hurry."',0]]},
      {lines:['This shop\'s been here forty years. Kids come and go.','You remind me of someone. Same eyes. Same trouble.'],
       choices:[['"Who?"',2],['"Lots of people have my eyes."',1]]},
      {lines:['My old friend climbed a tower like yours once. Came back different.','Never told anyone what he saw up there.'],
       choices:[['"Tell me about him."',2],['"Sounds made up."',0]]},
      {lines:['I\'m old. Can\'t climb anything anymore.','But I can make sure you never run out of supplies. Discount\'s on me.'],
       choices:[['"Thank you, Gen."',2],['"Bigger discount?"',1]]},
      {lines:['Here. My friend\'s old pocket watch. Stopped at 12:09.','Finish what he couldn\'t, kid.'],
       choices:[['"I will."',2],['*bow deeply*',2]]},
    ]},
};

export const ENEMIES = [
  {name:'Gloom Slime',   hp:45, str:3, mag:3, weak:['fire'],  res:['phys'], nul:[],      xp:8,  yen:40, f:[1,4],
    skills:[['Ooze','phys',12,'one'],['Chill','ice',14,'one']]},
  {name:'Wailing Mask',  hp:40, str:2, mag:5, weak:['elec'],  res:['wind'], nul:[],      xp:9,  yen:45, f:[1,5],
    skills:[['Shriek','wind',14,'one'],['Spark','elec',13,'one']]},
  {name:'Iron Hound',    hp:55, str:5, mag:2, weak:['wind'],  res:['phys'], nul:[],      xp:10, yen:50, f:[2,7],
    skills:[['Maul','phys',16,'one'],['Ember','fire',12,'one']]},
  {name:'Frost Wisp',    hp:42, str:2, mag:6, weak:['fire'],  res:[],       nul:['ice'], xp:11, yen:55, f:[3,8],
    skills:[['Frost','ice',16,'one'],['Blizzard','ice',11,'all']]},
  {name:'Static Idol',   hp:60, str:3, mag:7, weak:['ice'],   res:['elec'], nul:[],      xp:14, yen:70, f:[5,10],
    skills:[['Thunderclap','elec',12,'all'],['Gust','wind',17,'one']]},
  {name:'Choir Knight',  hp:75, str:8, mag:4, weak:['elec'],  res:['phys','fire'], nul:[], xp:18, yen:90, f:[6,10],
    skills:[['Cleave','phys',20,'one'],['Blaze','fire',12,'all']]},
  {name:'Hollow Moth',   hp:58, str:4, mag:8, weak:['fire','phys'], res:['wind'], nul:[], xp:16, yen:80, f:[7,10],
    skills:[['Gale','wind',13,'all'],['Frost','ice',18,'one']]},
];
export const BOSSES = {
  5:  {name:'Gatekeeper', hp:460, str:9, mag:9, weak:['wind'], res:['phys','fire'], nul:[], xp:120, yen:1500, acts:2, boss:true,
       skills:[['Crush','phys',22,'one'],['Pyre','fire',14,'all'],['Shock','elec',22,'one']]},
  10: {name:'Pale Monarch', hp:1300, str:15, mag:15, weak:['fire'], res:['ice','elec'], nul:[], xp:0, yen:0, acts:2, boss:true, final:true,
       skills:[['Dread Blade','phys',30,'one'],['Frozen Requiem','ice',18,'all'],['Storm Crown','elec',18,'all'],['Annihilate','wind',40,'one']]},
};

export const ITEMS = {
  medicine:{name:'Medicine',     desc:'Restore 60 HP to one ally', price:200, use:(m)=>m.hp>0&&m.hp<m.max, fx:(m)=>{m.hp=Math.min(m.max,m.hp+60)}},
  soul:    {name:'Soul Drop',    desc:'Restore 25 SP to one ally', price:400, use:(m)=>m.hp>0&&m.sp<m.maxsp, fx:(m)=>{m.sp=Math.min(m.maxsp,m.sp+25)}},
  bead:    {name:'Revival Bead', desc:'Revive a fallen ally at half HP', price:800, use:(m)=>m.hp<=0, fx:(m)=>{m.hp=Math.ceil(m.max/2)}},
};

export const SOCIAL = {courage:'Courage', knowledge:'Knowledge', charm:'Charm'};
export const SOCIAL_NEXT = [0,3,4,5,6];            // points needed to go from rank r to r+1
export const LAST_DAY = 30;
export const SAVE_KEY = 'ninth-bell-save';
export const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
export const PARTY = ['mc','rin','kaito'];

// ── 3D presentation ──
export const CAST = ['mc','rin','kaito','mira'];            // characters with VRM models (assets/characters/<id>.vrm)
export const ANIMS = ['idle','battle_idle','walk','run','attack','cast','hit','knockdown','victory'];
export const COLORS = {mc:'#B66BFF', rin:'#FF3D7F', kaito:'#3EE6FF', mira:'#C9A2FF', gen:'#FFD23F'};
export const EL_COLOR = {phys:'#ffe9b0', fire:'#ff7a2f', ice:'#7fe8ff', elec:'#ffe14d', wind:'#7dffb0', heal:'#6dff9e'};

// How each Shadow looks: body scale, height stretch, mask colour, eye colour, aura colour, horns
export const LOOKS = {
  'Gloom Slime':  {scale:0.9, stretch:0.7, mask:'#e9e2cf', eye:'#ff2a4f', aura:'#5b1a8a', horns:0},
  'Wailing Mask': {scale:0.8, stretch:1.2, mask:'#f4f0ff', eye:'#6ff3ff', aura:'#2a3a9a', horns:0, float:true},
  'Iron Hound':   {scale:1.0, stretch:0.8, mask:'#c9cdd6', eye:'#ff4a1f', aura:'#7a1d1d', horns:2},
  'Frost Wisp':   {scale:0.7, stretch:1.0, mask:'#d9fbff', eye:'#3ee6ff', aura:'#1d6a8a', horns:0, float:true},
  'Static Idol':  {scale:1.0, stretch:1.5, mask:'#ffe9a8', eye:'#ffe14d', aura:'#7a6a1d', horns:3},
  'Choir Knight': {scale:1.2, stretch:1.6, mask:'#e8e8e8', eye:'#ff2a4f', aura:'#4a1d6a', horns:2},
  'Hollow Moth':  {scale:1.0, stretch:1.1, mask:'#f0d9ff', eye:'#ff7aff', aura:'#6a1d5a', horns:2, float:true},
  'Gatekeeper':   {scale:2.6, stretch:1.3, mask:'#d8c9a8', eye:'#ff2a1f', aura:'#8a1d1d', horns:4},
  'Pale Monarch': {scale:3.2, stretch:1.5, mask:'#ffffff', eye:'#ff2a4f', aura:'#c9c9ff', horns:6, float:true},
};

// Colours used to dye the stand-in model until each character has their own VRM file
export const STAND_IN = {
  mc:    {hair:'#2b3157', top:'#272b47', bottom:'#15141c', eye:'#9a8cff'},
  rin:   {hair:'#ff3d6e', top:'#e8364f', bottom:'#1a1820', eye:'#ff6a8a'},
  kaito: {hair:'#35d8f2', top:'#2f6bff', bottom:'#24263a', eye:'#3ee6ff'},
  mira:  {hair:'#6b45d9', top:'#efe6ff', bottom:'#3a2a5a', eye:'#c9a2ff'},
};
