import {THREE,box,ell,petal,cyl,cone,beam,mesh,mat} from './building-kit.js';

// Each citizen has a distinct everyday role and a carried or worn object.
// The four independent limb pivots use the same contract as the original people.
const roles=[
 ['architect','Neighborhood architect','coat','none','clipboard','An architect carrying a drawing board and a rolled plan.'],
 ['baker','Morning baker','apron','chef','bread','A baker with a flour-colored apron and a basket of fresh bread.'],
 ['barista','Coffee barista','apron','cap','tray','A barista carrying a little tray of steaming cups.'],
 ['botanist','Field botanist','vest','straw','plant','A field botanist studying a potted leafy specimen.'],
 ['carpenter','Timber carpenter','overalls','cap','hammer','A carpenter in work overalls with a wooden-handled hammer.'],
 ['chef','Community chef','coat','chef','pan','A chef in a double-buttoned coat holding a copper pan.'],
 ['courier','Parcel courier','vest','helmet','parcel','A bicycle courier with a strapped parcel and a compact backpack.'],
 ['electrician','Village electrician','overalls','hardhat','toolbox','An electrician carrying a metal toolbox.'],
 ['firefighter','Off-duty firefighter','coat','helmet','radio','A firefighter in reflective workwear with a handheld radio.'],
 ['florist','Flower seller','apron','none','flowers','A florist carrying a colorful wrapped bouquet.'],
 ['forester','Woodland forester','vest','cap','binoculars','A forester with binoculars and a weatherproof field jacket.'],
 ['geologist','Rock collector','vest','hardhat','rock','A geologist examining a pale rock sample.'],
 ['grocer','Produce grocer','apron','cap','produce','A grocer carrying a basket of apples and squash.'],
 ['guide','Town walking guide','coat','beret','flag','A walking guide holding a small coral meeting flag.'],
 ['librarian','Traveling librarian','cardigan','none','books','A librarian holding a stack of differently sized books.'],
 ['mechanic','Workshop mechanic','overalls','beanie','wrench','A mechanic with a broad wrench and a practical tool belt.'],
 ['messenger','Neighborhood messenger','vest','cap','mail','A messenger carrying a shoulder bag full of letters.'],
 ['nurse','Community nurse','tunic','none','medical','A nurse in comfortable scrubs carrying a first-aid case.'],
 ['painter','House painter','overalls','cap','roller','A house painter with a long-handled roller and a paint-spattered apron.'],
 ['photographer','Street photographer','vest','none','camera','A photographer with a hanging camera and a small equipment bag.'],
 ['potter','Studio potter','apron','headscarf','pot','A potter carrying a freshly shaped terracotta bowl.'],
 ['researcher','Field researcher','coat','none','tablet','A researcher reading a tablet beneath round spectacles.'],
 ['sailor','Harbor sailor','tunic','sailor','rope','A sailor holding a neat coil of dock rope.'],
 ['tailor','Village tailor','vest','none','fabric','A tailor carrying bright fabric rolls and a measuring tape.'],
 ['teacher','Neighborhood teacher','cardigan','none','chalkboard','A teacher with a portable slate and a pencil case.'],
 ['beekeeper','Garden beekeeper','coat','veil','honey','A beekeeper in a broad veiled hat holding a honey jar.'],
 ['groundskeeper','Park groundskeeper','overalls','straw','rake','A groundskeeper carrying a wooden rake.'],
 ['fisher','Pond fisher','vest','bucket','fishing','A fisher with a long rod and a small tackle pouch.'],
 ['astronomer','Backyard astronomer','coat','beanie','telescope','An astronomer carrying a small brass telescope.'],
 ['cartographer','Trail cartographer','vest','bucket','map','A cartographer unfolding a map of the neighborhood.'],
 ['violinist','String musician','coat','none','violin','A violinist carrying a small instrument and a slim bow.'],
 ['guitarist','Acoustic guitarist','casual','beanie','guitar','A guitarist with a warm wooden acoustic guitar.'],
 ['flutist','Park flutist','cardigan','beret','flute','A flutist carrying a silver flute in the afternoon light.'],
 ['drummer','Street percussionist','vest','headphones','drum','A percussionist wearing a small marching drum.'],
 ['artist','Garden sketcher','apron','beret','palette','An artist with a paint palette and a brush tucked behind the ear.'],
 ['sculptor','Clay sculptor','apron','headscarf','sculpture','A sculptor carrying a small abstract clay figure.'],
 ['reader','Quiet reader','cardigan','none','open-book','A reader strolling with an open book.'],
 ['knitter','Park knitter','cardigan','none','yarn','A knitter holding a basket of yarn and two needles.'],
 ['birdwatcher','Patient birdwatcher','vest','bucket','binoculars','A birdwatcher with field binoculars and a small bird notebook.'],
 ['hiker','Day-trail hiker','sport','cap','walking-stick','A hiker with a walking stick and a full daypack.'],
 ['runner','Morning marathoner','sport','visor','bottle','A runner in shorts with a race bib and a water bottle.'],
 ['tennis-player','Tennis club player','sport','visor','racket','A tennis player carrying an oval racket and a yellow ball.'],
 ['basketball-player','Courtyard basketballer','sport','headband','basketball','A tall basketball player carrying a textured orange ball.'],
 ['football-player','Meadow footballer','sport','none','football','A football player with long socks and a patterned football.'],
 ['yoga-walker','Yoga class neighbor','sport','headband','mat','A neighbor on the way to yoga with a rolled mat.'],
 ['skater','Neighborhood skateboarder','casual','helmet','skateboard','A skateboarder carrying a board with visible wheels.'],
 ['surfer','Beach-day surfer','sport','none','surfboard','A surfer with a long pastel board and a light beach towel.'],
 ['cyclist','Commuter cyclist','sport','helmet','cycling-helmet','A cyclist with fitted clothing, gloves and a spare helmet.'],
 ['dog-walker','Park dog walker','casual','cap','leash','A park walker holding a coiled lead and a little treat pouch.'],
 ['picnicker','Afternoon picnicker','dress','straw','picnic','A picnicker carrying a woven basket and a checked blanket.'],
 ['rain-walker','Rainy-day neighbor','coat','hood','umbrella','A neighbor in a raincoat holding a broad open umbrella.'],
 ['traveler','Railway traveler','coat','none','suitcase','A traveler pulling a compact suitcase with a raised handle.'],
 ['student','Campus student','casual','headphones','notebooks','A student carrying notebooks with a roomy backpack.'],
 ['shopper','Market-day shopper','casual','none','shopping','A shopper with two paper bags of groceries.'],
 ['festival-visitor','Festival visitor','dress','flower-crown','lantern','A festival visitor carrying a warm paper lantern.'],
 ['icecream-vendor','Ice-cream seller','apron','cap','icecream','An ice-cream seller holding a waffle cone with three scoops.'],
 ['newspaper-reader','Morning news reader','coat','cap','newspaper','A neighbor reading a folded newspaper on a morning walk.'],
 ['grandparent','Village grandparent','cardigan','none','cane','A grandparent with silver hair, spectacles and a curved cane.'],
 ['young-explorer','Young explorer','casual','cap','magnifier','A smaller explorer studying the world with a magnifying glass.'],
 ['volunteer','Community volunteer','vest','none','seedling','A volunteer carrying a young tree ready to plant.'],
];
const skinTones=[0x6c4738,0x98664e,0xbe8862,0xdfad85,0xf0c7a0,0x82543d];
const shirts=[0x5e8275,0xc07860,0x8093a1,0xc7a26f,0x657484,0xa48a9b,0x8d9c6d,0xd2b58a];
const pants=[0x526774,0x7e765f,0x766253,0x435953,0x8f7768];
const hairColors=[0x392f28,0x78543a,0x4c3b30,0xba9a67,0xc3c3b5,0x9d634a];
const configs=roles.map((r,i)=>({id:'citizen-'+r[0],name:r[1],outfit:r[2],hat:r[3],prop:r[4],description:r[5],index:i,scale:r[0]==='young-explorer'?.76:r[0]==='basketball-player'?1.16:.89+(i%7)*.035,build:.9+(i%5)*.045,hair:i%8}));
export const PEOPLE_EXPANSION=configs.map(c=>({id:c.id,name:c.name,category:'People',kind:'person',description:c.description,tags:`person people human citizen ${c.id.slice(8).replaceAll('-',' ')} ${c.outfit} ${c.hat} ${c.prop} neighborhood everyday`,radius:1.15*c.scale,height:(c.prop==='umbrella'?2.75:3.55)*c.scale,speed:c.outfit==='sport'?1.2+c.index%3*.15:.55+c.index%5*.07,habitat:'town',collection:'world-expansion'}));
const lookup=new Map(configs.map(c=>[c.id,c]));
const sphere=(g,x,y,z,a,b,c,tone)=>petal(g,x,y,z,a,b,c,tone);
function ring(g,x,y,z,r,tone,axis='z',th=.025){const m=mesh(g,new THREE.TorusGeometry(r,th,5,12),tone,x,y,z);if(axis==='x')m.rotation.y=Math.PI/2;if(axis==='y')m.rotation.x=Math.PI/2;return m;}
function eyes(g,c,z=.185){for(const x of [-.07,.07])sphere(g,x,1.705,z,.016,.018,.014,'iron');if([5,21,24,36,57].includes(c.index)){for(const x of [-.075,.075])ring(g,x,1.71,.2,.067,'iron','z',.01);box(g,.04,.013,.02,0,1.71,.2,'iron');}}
function hair(g,c){const h=hairColors[c.index%hairColors.length];if(c.hair===7){ell(g,0,1.77,-.075,.19,.12,.15,h);return;}ell(g,0,1.82,-.015,.2,.135,.19,h);if(c.hair===1){for(const x of [-.17,.17])ell(g,x,1.64,-.03,.08,.2,.13,h);}if(c.hair===2)ell(g,0,1.88,-.17,.12,.12,.13,h);if(c.hair===3){for(let i=0;i<7;i++)sphere(g,Math.cos(i)*.15,1.84+(i%2)*.055,Math.sin(i)*.13,.09,.09,.09,h);}if(c.hair===4){for(const x of [-.15,.15])for(let j=0;j<4;j++)sphere(g,x,1.7-j*.1,-.11,.055,.075,.055,h);}if(c.hair===5)ell(g,0,1.72,-.24,.09,.13,.23,h);if(c.hair===6)box(g,.35,.065,.1,0,1.83,.15,h,0,0,.13);}
function headwear(g,c){const tone=c.index%2?'leafDark':'terracotta',h=c.hat;if(h==='none')return;
 if(['cap','visor'].includes(h)){if(h==='cap')ell(g,0,1.9,-.01,.22,.12,.2,tone);box(g,.31,.035,.25,0,1.88,.2,tone);}
 else if(['hardhat','helmet'].includes(h)){ell(g,0,1.91,0,.23,.16,.22,h==='hardhat'?'yellow':tone);box(g,.09,.08,.4,0,2.02,0,h==='hardhat'?'yellow':'cream');cyl(g,.245,.245,.04,0,1.89,0,h==='hardhat'?'yellow':tone,12);}
 else if(h==='chef'){cyl(g,.2,.21,.23,0,1.99,0,'white',10);for(const x of [-.13,0,.13])ell(g,x,2.15,0,.15,.14,.17,'white');}
 else if(['straw','bucket','sailor','veil'].includes(h)){cyl(g,h==='straw'||h==='veil'?.35:.27,h==='straw'||h==='veil'?.35:.27,.04,0,1.9,0,h==='sailor'?'white':'sand',16);cyl(g,.18,.23,.19,0,2,0,h==='sailor'?'white':'sand',12);if(h==='veil'){for(const x of [-.27,.27])box(g,.015,.43,.42,x,1.68,0,'cream');for(let i=0;i<5;i++)box(g,.55,.018,.015,0,1.5+i*.075,.22,'cream');}}
 else if(h==='beanie'){ell(g,0,1.94,0,.23,.2,.22,tone);cyl(g,.23,.23,.08,0,1.88,0,tone,12);sphere(g,0,2.13,0,.075,.075,.075,'cream');}
 else if(h==='beret'){ell(g,.035,1.94,0,.27,.095,.23,tone);cyl(g,.025,.025,.08,.08,2.04,0,tone,6);}
 else if(h==='headscarf'){ell(g,0,1.88,-.02,.22,.13,.21,tone);cone(g,.1,.25,0,1.67,-.24,tone,5);}
 else if(h==='hood'){ell(g,0,1.73,-.065,.25,.3,.21,shirts[c.index%shirts.length]);ell(g,0,1.69,.075,.18,.22,.15,skinTones[c.index%6]);eyes(g,c,.23);}
 else if(h==='headphones'){for(const x of [-.215,.215])ell(g,x,1.73,0,.055,.11,.1,'iron');ring(g,0,1.8,0,.22,'iron','z',.025);}
 else if(h==='headband'){box(g,.37,.06,.03,0,1.81,.17,'cream');}
 else if(h==='flower-crown'){for(let i=0;i<8;i++){const a=i*Math.PI/4;sphere(g,Math.cos(a)*.2,1.88,Math.sin(a)*.2,.075,.06,.075,i%2?'flower':'yellow');}}
}
function basket(g,fruit=true){box(g,.46,.26,.32,0,-.04,0,'wood');for(let i=0;i<3;i++)box(g,.48,.025,.34,0,-.13+i*.09,0,'sand');ring(g,0,.15,0,.18,'wood','z',.02);if(fruit)for(let i=0;i<4;i++)sphere(g,-.15+(i%2)*.3,.11,-.07+Math.floor(i/2)*.14,.1,.08,.08,i%2?'yellow':'red');}
function book(g,x,y,z,w=.3,h=.4,tone='red'){box(g,w,h,.065,x,y,z,tone);box(g,w-.035,h-.035,.07,x+.012,y,z,'cream');box(g,.035,h,.085,x-w/2,y,z,tone);}
function accessory(g,type,c){
 const tan='wood',metal='iron';
 if(['clipboard','chalkboard','tablet','map','newspaper','notebooks','books','open-book'].includes(type)){
  if(type==='books'||type==='notebooks'){for(let i=0;i<3;i++){box(g,.4+i*.015,.075,.3,0,-.02+i*.085,.04,i%2?'leafDark':'red');box(g,.37,.045,.305,.01,-.02+i*.085,.04,'cream');}}
  else if(type==='open-book'){book(g,-.15,.07,0,.29,.4,'leafDark');book(g,.15,.07,0,.29,.4,'leafDark');g.children.at(-1).rotation.y=.15;}
  else{const color=type==='tablet'?'darkglass':type==='chalkboard'?'leafDark':type==='clipboard'?'wood':'cream';box(g,.42,.5,.05,0,.1,0,color);if(type==='clipboard')box(g,.13,.06,.07,0,.33,0,'iron');for(let j=0;j<4;j++)box(g,.25-j*.025,.012,.02,0,.23-j*.07,.035,type==='chalkboard'?'white':'slate');if(type==='map')box(g,.025,.33,.025,.09,.08,.035,'terracotta',0,0,-.25);}
 }
 else if(['parcel','medical','toolbox','suitcase','mail','shopping','picnic','produce','bread'].includes(type)){
  if(['picnic','produce','bread'].includes(type)){basket(g,type!=='bread');if(type==='bread')for(let i=0;i<3;i++)ell(g,-.14+i*.14,.18,0,.065,.23,.07,'yellow');}
  else{const tone=type==='parcel'?'sand':type==='medical'?'white':type==='toolbox'?'iron':type==='shopping'?'cream':'wood';box(g,.43,.42,.26,0,-.1,0,tone);ring(g,0,.17,0,.12,'iron','z',.02);if(type==='parcel'){box(g,.06,.43,.27,0,-.1,0,'cream');box(g,.44,.06,.27,0,-.1,0,'cream');}if(type==='medical'){box(g,.2,.06,.02,0,-.1,.14,'terracotta');box(g,.06,.2,.025,0,-.1,.14,'terracotta');}if(type==='suitcase'){for(const x of [-.15,.15])cyl(g,.045,.045,.08,x,-.34,0,'iron',8);box(g,.25,.025,.025,0,.43,0,'iron');for(const x of [-.12,.12])box(g,.025,.32,.025,x,.28,0,'iron');}if(type==='shopping')for(const x of [-.11,.11])petal(g,x,.2,0,.12,.17,.1,'leaf');}
 }
 else if(['plant','seedling','flowers'].includes(type)){cyl(g,.18,.12,.27,0,-.05,0,type==='flowers'?'cream':'terracotta',10);for(let i=0;i<5;i++){const a=i*2.4;beam(g,[0,.08,0],[Math.cos(a)*.2,.45+i*.03,Math.sin(a)*.16],.018,'leaf');petal(g,Math.cos(a)*.2,.42+i*.03,Math.sin(a)*.16,.17,.09,.12,type==='flowers'?(i%2?'flower':'yellow'):'leaf');}}
 else if(['hammer','wrench','rake','roller','walking-stick','cane','fishing','flag'].includes(type)){
  const long=['rake','roller','walking-stick','cane','fishing','flag'].includes(type),length=long?1.55:.55;beam(g,[0,-.55,0],[0,length-.55,0],.025,type==='wrench'?'iron':'wood');
  if(type==='hammer')box(g,.35,.13,.14,0,.07,0,'iron');if(type==='wrench'){ring(g,0,.09,0,.1,'iron','z',.035);box(g,.12,.28,.06,0,-.08,0,'iron');}if(type==='rake'){box(g,.5,.045,.05,0,-.5,0,'iron');for(let i=0;i<6;i++)box(g,.025,.15,.025,-.22+i*.09,-.56,0,'iron');}if(type==='roller'){beam(g,[0,.8,0],[.15,.9,0],.02,'iron');const r=cyl(g,.08,.08,.32,.25,.9,0,'cream',8);r.rotation.z=Math.PI/2;}if(type==='cane')ring(g,.065,.97,0,.075,'wood','z',.02);if(type==='fishing')beam(g,[0,1,0],[.55,.15,0],.008,'cream');if(type==='flag')box(g,.46,.29,.025,.23,.87,0,'terracotta');
 }
 else if(['camera','binoculars','radio','telescope','magnifier','cycling-helmet'].includes(type)){
  if(type==='camera'){box(g,.34,.23,.18,0,.04,0,'iron');const l=cyl(g,.09,.1,.13,0,.04,.14,'darkglass',10);l.rotation.x=Math.PI/2;box(g,.11,.06,.12,.12,.19,0,'iron');}
  if(type==='binoculars'){for(const x of [-.1,.1]){const l=cyl(g,.07,.1,.28,x,.06,.06,'iron',10);l.rotation.x=Math.PI/2;}box(g,.15,.08,.08,0,.06,0,'iron');}
  if(type==='radio'){box(g,.16,.3,.1,0,.04,0,'iron');box(g,.025,.2,.025,.05,.27,0,'iron');for(let i=0;i<3;i++)box(g,.12,.02,.02,0,.04-i*.05,.06,'cream');}
  if(type==='telescope'){const t=cyl(g,.08,.12,.55,0,.15,0,'yellow',10);t.rotation.z=-.5;ring(g,.13,.39,0,.09,'iron','y',.018);}
  if(type==='magnifier'){ring(g,0,.25,0,.15,'iron','z',.025);box(g,.04,.3,.04,0,-.05,0,'wood');}
  if(type==='cycling-helmet'){ell(g,0,.05,0,.24,.16,.21,'terracotta');for(const x of [-.1,0,.1])box(g,.035,.035,.32,x,.19,0,'cream');}
 }
 else if(['guitar','violin','flute','drum'].includes(type)){
  if(type==='flute'){const flute=cyl(g,.025,.025,.55,0,.15,0,'stone',8);flute.rotation.z=.4;for(let i=0;i<5;i++)sphere(g,-.07+i*.025,.28-i*.06,.025,.015,.015,.015,'iron');}
  else if(type==='drum'){const d=cyl(g,.24,.24,.25,0,.05,0,'cream',12);d.rotation.x=Math.PI/2;for(const x of [-.22,.22])beam(g,[x,-.12,-.13],[x,.22,.13],.025,'terracotta');}
  else{const r=type==='guitar'?.23:.15;ell(g,0,-.08,0,r,.25,.08,'wood');ell(g,0,.12,0,r*.8,.18,.075,'wood');box(g,.07,.55,.06,0,.47,0,'darkwood');sphere(g,0,.02,.075,r*.35,r*.35,.015,'iron');for(let i=0;i<3;i++)box(g,.008,.7,.012,-.022+i*.022,.23,.088,'cream');if(type==='violin')beam(g,[.2,-.2,0],[.2,.65,0],.013,'wood');}
 }
 else if(['basketball','football','yarn','rock','sculpture','honey','pot','pan','rope','leash','bottle','icecream','tray','palette','fabric','mat','skateboard','surfboard','umbrella','lantern'].includes(type)){
  if(['basketball','football','yarn','rock'].includes(type)){ell(g,0,.04,0,.23,.23,.23,type==='basketball'?'terracotta':type==='football'?'cream':type==='yarn'?'flower':'stone');if(type==='basketball'||type==='yarn'){for(const a of [0,Math.PI/2]){const r=ring(g,0,.04,0,.232,type==='yarn'?'cream':'iron','z',.012);r.rotation.y=a;}}if(type==='football')for(const x of [-.12,.12])sphere(g,x,.12,.18,.085,.085,.025,'iron');}
  if(type==='sculpture'){box(g,.35,.08,.3,0,-.17,0,'wood');ell(g,0,.05,0,.12,.18,.1,'terracotta');ell(g,0,.28,0,.09,.1,.09,'terracotta');}
  if(type==='honey'){cyl(g,.14,.14,.28,0,.02,0,'yellow',10);cyl(g,.15,.15,.04,0,.18,0,'wood',10);box(g,.16,.1,.02,0,.04,.145,'cream');}
  if(type==='pot'||type==='pan'){cyl(g,.24,type==='pan'?.21:.15,type==='pan'?.1:.25,0,.03,0,'terracotta',14);cyl(g,.21,.21,.012,0,type==='pan'?.085:.16,0,'darkwood',14);if(type==='pan')box(g,.08,.05,.4,0,.03,-.35,'wood');}
  if(type==='rope'||type==='leash'){for(let i=0;i<4;i++)ring(g,0,.05,0,.12+i*.026,type==='rope'?'sand':'terracotta','z',.018);}
  if(type==='bottle'){cyl(g,.075,.085,.32,0,.05,0,'glass',10);cyl(g,.04,.04,.06,0,.24,0,'cream',8);}
  if(type==='icecream'){cone(g,.11,.3,0,-.02,0,'sand',10);for(let i=0;i<3;i++)ell(g,0,.17+i*.14,0,.12,.11,.12,['cream','flower','yellow'][i]);}
  if(type==='tray'){box(g,.5,.04,.36,0,0,0,'wood');for(const x of [-.14,.14]){cyl(g,.075,.06,.15,x,.1,0,'cream',10);ring(g,x+.08,.1,0,.04,'cream','z',.012);}}
  if(type==='palette'){ell(g,0,.03,0,.27,.04,.18,'wood');for(let i=0;i<4;i++)sphere(g,-.15+i*.1,.075,.06,.035,.01,.035,['red','yellow','leafDark','glass'][i]);beam(g,[.13,0,-.1],[.13,.5,-.1],.014,'wood');}
  if(type==='fabric'||type==='mat'){for(let i=0;i<(type==='fabric'?3:1);i++)cyl(g,.1,.1,.55,-.16+i*.16,.1,0,['flower','leaf','glass'][i],10);}
  if(type==='skateboard'||type==='surfboard'){const length=type==='surfboard'?1.6:.8;ell(g,0,.2,0,.16,length/2,.045,type==='surfboard'?'glass':'wood');box(g,.035,length*.82,.015,0,.2,.05,'cream');if(type==='skateboard')for(const y of [-.08,.48])for(const x of [-.12,.12])sphere(g,x,y,-.065,.04,.04,.04,'iron');}
  if(type==='umbrella'){beam(g,[0,-.35,0],[0,1.6,0],.018,'iron');cone(g,.67,.3,0,1.59,0,'leafDark',12);for(let i=0;i<6;i++){const a=i*Math.PI/3;beam(g,[0,1.74,0],[Math.cos(a)*.65,1.45,Math.sin(a)*.65],.014,'cream');}}
  if(type==='lantern'){cyl(g,.2,.2,.38,0,-.02,0,'yellow',12);for(const y of [-.23,.19])cyl(g,.21,.21,.05,0,y,0,'terracotta',12);ring(g,0,.31,0,.12,'iron','z',.015);}
 }
}
export function createExpandedPerson(id){const c=lookup.get(id);if(!c)return null;const g=new THREE.Group();g.name=id;g.userData={animated:true,species:id,legs:[],arms:[],wings:[]};const skin=skinTones[c.index%6],shirt=shirts[c.index%shirts.length],trousers=pants[c.index%pants.length];
 ell(g,0,1.14,0,.235*c.build,.33,.17,shirt);cyl(g,.075,.085,.13,0,1.46,.015,skin,8);ell(g,0,1.68,.015,.195,.23,.185,skin);for(const x of [-.185,.185])sphere(g,x,1.67,.015,.035,.065,.045,skin);sphere(g,0,1.65,.2,.033,.035,.035,skin);hair(g,c);eyes(g,c);
 for(const side of [-1,1]){const leg=new THREE.Group();leg.name=side<0?'leg-left':'leg-right';leg.position.set(side*.112*c.build,.84,0);if(c.outfit==='sport'){cyl(leg,.08,.075,.3,0,-.13,0,trousers,8);cyl(leg,.052,.062,.36,0,-.46,0,skin,8);cyl(leg,.064,.064,.13,0,-.65,0,'cream',8);}else cyl(leg,.075,.07,.69,0,-.34,0,trousers,8);ell(leg,0,-.765,.05,.083,.075,.14,c.outfit==='sport'?'cream':'darkwood');g.add(leg);g.userData.legs.push(leg);
  const arm=new THREE.Group();arm.name=side<0?'arm-left':'arm-right';arm.position.set(side*.24*c.build,1.34,0);cyl(arm,.068,.06,.4,side*.02,-.19,0,shirt,8);cyl(arm,.052,.05,.17,side*.025,-.48,0,skin,8);sphere(arm,side*.025,-.58,.015,.06,.075,.065,skin);g.add(arm);g.userData.arms.push(arm);}
 if(['coat','cardigan','vest'].includes(c.outfit)){box(g,.025,.57,.025,0,1.1,.17,'cream');for(const x of [-.11,.11])box(g,.12,.13,.035,x,1.01,.18,c.outfit==='vest'?'yellow':'stone');if(c.outfit==='coat')box(g,.42,.25,.3,0,.84,0,shirt);}
 if(['apron','overalls'].includes(c.outfit)){box(g,.32,.47,.045,0,1.04,.18,c.outfit==='apron'?'cream':trousers);for(const x of [-.1,.1])box(g,.055,.32,.04,x,1.35,.17,c.outfit==='apron'?'cream':trousers);box(g,.19,.13,.025,0,1.08,.215,'wood');}
 if(c.outfit==='dress'){cone(g,.29,.55,0,.91,0,shirt,12);box(g,.43,.04,.29,0,1.1,0,'cream');}
 if(c.outfit==='sport'){box(g,.16,.14,.025,0,1.15,.18,'cream');box(g,.05,.08,.03,0,1.15,.2,'slate');}
 if(['courier','hiker','student','young-explorer','birdwatcher'].includes(c.id.slice(8))){box(g,.35,.46,.19,0,1.15,-.24,'wood');for(const x of [-.15,.15])box(g,.045,.5,.05,x,1.17,.16,'wood');}
 if(c.index%6===0)box(g,.44,.08,.33,0,1.34,0,'sand');headwear(g,c);
 const prop=new THREE.Group();prop.name='carried-'+c.prop;prop.position.set(.035,-.53,.15);accessory(prop,c.prop,c);g.userData.arms[1].add(prop);g.scale.setScalar(c.scale);return g;
}
