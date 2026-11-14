import * as THREE from './vendor/three.module.js';
import {WORLD_EXPANSION,worldFactories} from './world-expansion.js';
import {HOME_BUILDINGS,createHomeBuilding} from './buildings-homes.js';
import {CITY_EXPANSION,createCityBuilding} from './buildings-city.js';
import {PLACE_BUILDINGS,createPlaceBuilding} from './buildings-places.js';

// Original procedural art for Morrowfield. Every asset is generated locally.
const entry = (id, name, category, tags, radius, height, description, extra={}) => ({id,name,category,tags,radius,height,description,kind:id==='enclosure'?'enclosure':category==='Buildings'?'building':category==='People'?'person':category==='Animals'?'animal':category==='Birds'?'bird':category==='Aquatic'?'aquatic':category==='Plants'?'plant':category==='Roads'?'road':'decoration',...extra});
export const CATALOG = [
  entry('cottage','Willow cottage','Buildings','small house cozy stone gabled home rural',3.6,5.2,'A limestone cottage, with a slate roof and flower-filled windows.'),
  entry('cabin','Woodland cabin','Buildings','small house wooden timber log forest home',3.6,4.7,'A cedar cabin with deep eaves, a porch and a stone chimney.'),
  entry('suburban','Garden home','Buildings','suburban house family brick neighborhood',4.1,6.2,'A welcoming two-story home with a front porch and bay window.'),
  entry('townhouse','Juniper townhouse','Buildings','house urban town narrow brick building',3,8.3,'Three stories of warm brick, tall windows and a little balcony.'),
  entry('villa','Courtyard villa','Buildings','modern building house white luxury glass flat roof',4.9,5.4,'An airy modern home with broad glazing and a shaded terrace.'),
  entry('apartment','Parkside apartments','Buildings','modern building apartment urban town housing',4.6,10.2,'Four stories, individual balconies and a planted roof terrace.'),
  entry('farmhouse','Meadow farmhouse','Buildings','house farm rural country white porch',4.7,6.3,'An extended farmhouse with a wraparound veranda.'),
  entry('cafe','The Fern café','Buildings','shop cafe coffee restaurant town awning',3.7,5,'A corner café with a striped canopy and outdoor tables.'),
  entry('shop','Village market','Buildings','store shop grocery market town commercial',3.7,4.6,'A cheerful market with timber displays and a striped awning.'),
  entry('school','Little schoolhouse','Buildings','school community brick education bell',4.6,7.1,'A brick schoolhouse with a central doorway and bell tower.'),
  entry('barn','Redwood barn','Buildings','farm barn rural wooden red agriculture',4.9,6.8,'A tall red barn with cross-braced double doors and a hay loft.'),
  entry('greenhouse','Glasshouse','Buildings','farm greenhouse glass garden plants growing',4.2,4.6,'Fine timber framing, translucent glass and planted beds.'),
  entry('bridge','Timber footbridge','Buildings','bridge wooden river crossing path water',4.7,2.3,'A gently arched wooden crossing with rails and individual planks.'),
  entry('gazebo','Garden pavilion','Buildings','park gazebo structure shelter garden wood',3.3,5.3,'An open octagonal pavilion with a copper-colored roof.'),
  entry('oak','Meadow oak','Plants','tree deciduous woodland forest temperate broadleaf',2.5,7.7,'A spreading oak with a twisting trunk and soft, rounded foliage.'),
  entry('birch','Silver birch','Plants','tree forest white trunk slender deciduous',1.9,8.8,'Pale bark, dark markings and an airy spring canopy.'),
  entry('pine','Alpine pine','Plants','tree forest evergreen conifer mountain snow',2.3,9.4,'A tall evergreen with layered needles and a warm bark trunk.'),
  entry('palm','Fan palm','Plants','tropical tree palm beach exotic jungle',3,8.3,'A curved palm with broad, gently drooping fronds.'),
  entry('flowers','Wildflower patch','Plants','flower colorful garden meadow pink yellow',1.5,.85,'A small patch of daisies and warm pink meadow flowers.'),
  entry('bush','Garden shrub','Plants','bush shrub hedge green garden foliage',1.3,1.8,'A leafy, rounded shrub with a few tiny blossoms.'),
  entry('grass','Meadow grasses','Plants','grass reeds tall wild meadow ground',1.2,1,'A tuft of tall, sunlit grass.'),
  entry('rock','River boulders','Plants','rock stone boulder nature mountain landscape',1.7,1.5,'A weathered cluster of rounded river stones.'),
  entry('reeds','Waterside reeds','Plants','aquatic plants water pond reeds cattail',1.4,2,'Slender cattails for the edges of ponds and streams.'),
  entry('road','Village road','Roads','road street asphalt paved transport neighborhood sidewalk',4.25,.16,'A six-meter road segment with a four-meter carriageway, sidewalks and a dashed centerline.',{footprint:{halfX:3,halfZ:3},connections:['north','south']}),
  entry('stone-path','Garden path','Roads','path road stone walkway cobble visitor park',2.1,.12,'A four-meter segment of irregular pale paving stones.',{footprint:{halfX:1.25,halfZ:2}}),
  entry('enclosure','Meadow enclosure','Zoo','fence wooden fence enclosure habitat pen zoo gate animal',10,2.1,'A complete 16 × 12 m wooden enclosure, including a closed gate.',{enclosure:{halfX:8,halfZ:6},passable:true}),
  entry('fence','Timber fence','Zoo','wooden fence zoo enclosure farm wood barrier',2.1,1.8,'A four-meter fence segment with three rails.',{footprint:{halfX:2.1,halfZ:.2}}),
  entry('gate','Habitat gate','Zoo','wooden gate fence enclosure zoo farm entrance',1.7,2,'A closed, cross-braced timber gate.',{footprint:{halfX:1.7,halfZ:.25}}),
  entry('shelter','Animal shelter','Zoo','shelter zoo animal barn habitat wood shade',3,3.7,'An open-front timber shelter with a moss-colored roof.'),
  entry('food','Feeding station','Zoo','food feeding feeder habitat zoo farm hay',1.5,1.5,'A timber feeder with fresh hay for grazing animals.'),
  entry('water-trough','Water trough','Zoo','water drink trough pond animal zoo farm habitat',1.6,.9,'A stone trough filled with clear water.'),
  entry('viewing-deck','Viewing deck','Zoo','visitor viewing platform deck zoo path',3.5,1.8,'A raised timber deck with a railing and three broad steps.'),
  entry('deer','Fallow deer','Animals','deer woodland herbivore forest animal native wildlife',.9,2.8,'A gentle spotted deer with branching antlers.',{speed:.65,habitat:'woodland',space:42}),
  entry('rabbit','Meadow rabbit','Animals','rabbit bunny small animal woodland farm wildlife',.5,.85,'Long ears, a cotton tail and a lively hopping gait.',{speed:.8,habitat:'meadow',space:12}),
  entry('fox','Red fox','Animals','fox forest woodland wildlife animal red',.8,1.1,'A rust-colored fox with a white-tipped, sweeping tail.',{speed:.85,habitat:'woodland',space:38}),
  entry('horse','Bay horse','Animals','farm animal horse equine domestic meadow',1.2,3.1,'A bay horse with a dark mane and tail.',{speed:.72,habitat:'meadow',space:60}),
  entry('elephant','Savanna elephant','Animals','elephant zoo safari savanna large wildlife animal',2,4.2,'A sturdy elephant with broad ears, curved tusks and a long trunk.',{speed:.4,habitat:'savanna',space:120}),
  entry('giraffe','Reticulated giraffe','Animals','giraffe zoo safari savanna tall wildlife animal',1.35,6.2,'A tall, patterned giraffe with a long neck and little ossicones.',{speed:.5,habitat:'savanna',space:100}),
  entry('penguin','Gentoo penguin','Animals','penguin zoo polar bird flightless aquatic animal',.55,1.25,'A tiny waddling penguin with orange feet and white belly.',{speed:.45,habitat:'waterside',space:20}),
  entry('flamingo','Rose flamingo','Animals','flamingo zoo bird wetland tropical pink animal',.65,2.8,'A graceful pink flamingo with a curved neck and slender legs.',{speed:.4,habitat:'waterside',space:25}),
  entry('bird','Meadow swallow','Birds','bird swallow flying sky wildlife wings',.5,.4,'A little swallow that circles and glides over your world.',{speed:3.8,habitat:'sky'}),
  entry('fish','Golden carp','Aquatic','fish koi carp aquatic pond water swimming',.5,.4,'A golden fish for a pond or lake.',{speed:.8,habitat:'water'}),
  entry('bench','Park bench','Decorations','bench seat park furniture wood',1.6,1.3,'A slatted timber bench on dark metal legs.'),
  entry('streetlight','Village lantern','Decorations','light lamp streetlight road park lantern',.65,4.7,'A warm glass lantern on an iron post.'),
  entry('fountain','Courtyard fountain','Decorations','fountain water plaza park decoration stone',2,2.3,'A carved two-tier fountain with pale blue water.'),
  entry('garden','Kitchen garden','Decorations','garden vegetables farm agriculture raised bed plants',2.7,.9,'Four raised growing beds filled with leafy vegetables.'),
  entry('windmill','Meadow windmill','Decorations','windmill farm rural landmark wind',2.7,8.1,'A whitewashed tower and four gently turning sails.'),
  entry('hay-bale','Hay bales','Decorations','hay farm food straw agriculture',1.5,1.5,'A small stack of tightly wrapped golden hay bales.'),
  entry('sign','Trail sign','Decorations','sign post direction path park zoo',.8,2.5,'A little timber signpost for your favorite paths.'),
  entry('glass-tower','Aster glass tower','Buildings','skyscraper tall modern building office glass city downtown tower',4.7,28,'A slender blue-green office tower, with silver mullions and an illuminated crown.',{footprint:{halfX:3.3,halfZ:3.3}}),
  entry('art-deco','Solstice tower','Buildings','skyscraper tall art deco stone building office city downtown tower',5,27.5,'A stepped limestone tower with bronze fins and a sculpted sunburst crown.',{footprint:{halfX:3.6,halfZ:3.6}}),
  entry('round-tower','Halo residences','Buildings','skyscraper tall modern building residential apartment round city tower',4.5,23,'A rounded apartment tower with deep circular balconies and a garden on the roof.',{footprint:{halfX:3.6,halfZ:3.6}}),
  entry('green-tower','Terrace garden tower','Buildings','skyscraper tall green modern building sustainable city apartment rooftop garden tower',5.2,22,'Stacked living spaces, timber sunshades and planted roof terraces.',{footprint:{halfX:3.6,halfZ:3.7}}),
  entry('hospital','Morrowfield hospital','Buildings','hospital clinic city community medical health building',6.3,9.1,'A bright community hospital with a glazed entrance and a green medical cross.',{footprint:{halfX:4.9,halfZ:3.8}}),
  entry('fire-station','Ember fire station','Buildings','fire station city community emergency brick building garage',6.2,7.8,'A brick firehouse with three engine bays, clerestory windows and a hose tower.',{footprint:{halfX:4.9,halfZ:3.7}}),
  entry('library','Atrium library','Buildings','library city community civic books classical stone building',5.9,7.5,'A limestone library with a columned portico, tall windows and broad entrance steps.',{footprint:{halfX:4.6,halfZ:3.8}}),
  entry('walker','Neighborhood walker','People','person people human pedestrian walker citizen resident visitor',.42,1.85,'A strolling neighbor in a sage jacket, carrying a little satchel.',{speed:.75,habitat:'town'}),
  entry('jogger','Park jogger','People','person people human pedestrian jogger runner citizen visitor sport',.42,1.83,'An energetic runner in coral sportswear and bright sneakers.',{speed:1.5,habitat:'town'}),
  entry('gardener','Community gardener','People','person people human gardener worker citizen resident farmer garden',.45,2.1,'A gardener in blue overalls and a broad straw hat.',{speed:.55,habitat:'town'}),
  entry('road-corner','Street corner','Roads','road street corner bend turn city asphalt sidewalk',4.25,.16,'A 6 × 6 m corner: the road connects its north and east edges.',{footprint:{halfX:3,halfZ:3},connections:['north','east']}),
  entry('road-t','T junction','Roads','road street intersection junction t city asphalt sidewalk',4.25,.16,'A 6 × 6 m junction connecting west, east and south, with a pedestrian crossing.',{footprint:{halfX:3,halfZ:3},connections:['west','east','south']}),
  entry('road-cross','Crossroads','Roads','road street intersection cross junction city asphalt sidewalk',4.25,.16,'A 6 × 6 m four-way intersection with marked pedestrian crossings.',{footprint:{halfX:3,halfZ:3},connections:['north','east','south','west']}),
  entry('parking','Small parking court','Roads','parking lot car city asphalt spaces curb street',6.8,.24,'A 10 × 9 m paved court with six marked spaces and wheel stops.',{footprint:{halfX:5,halfZ:4.5}}),
  entry('plaza','Civic plaza','Roads','plaza square paved stone city park pedestrian walkway',4.3,.2,'A 6 × 6 m pedestrian square with warm stone paving and an inset compass motif.',{footprint:{halfX:3,halfZ:3}}),
  entry('cactus','Desert saguaro','Plants','cactus desert dry succulent plant arid',1.2,3.8,'A ribbed saguaro cactus with branching arms and tiny ivory blooms.'),
  entry('acacia','Savanna acacia','Plants','tree savanna safari acacia umbrella africa shade',3.4,7.3,'A branching acacia with an open trunk and a wide, flat canopy.'),
  entry('cherry','Blossom cherry','Plants','tree cherry blossom pink flowering spring garden park',2.9,6.3,'A rounded cherry tree covered in soft pink blossoms.'),
  entry('zebra','Plains zebra','Animals','zebra zoo safari savanna striped horse wildlife animal',1.2,2.8,'A striped plains zebra with an upright mane and dark muzzle.',{speed:.8,habitat:'savanna',space:70}),
  entry('tortoise','Garden tortoise','Animals','tortoise turtle reptile slow zoo wildlife animal',.7,.75,'A slow little tortoise with a domed, patterned shell.',{speed:.18,habitat:'meadow',space:16}),
  entry('sheep','Woolly sheep','Animals','sheep farm animal wool domestic meadow flock',.9,1.45,'A round woolly sheep with a charcoal face and soft cream fleece.',{speed:.52,habitat:'meadow',space:30}),
  entry('duck','Mallard duck','Animals','duck bird water wetland pond farm animal wildlife',.6,.85,'A green-headed mallard with a curled tail and orange webbed feet.',{speed:.5,habitat:'waterside',space:15}),
  entry('traffic-light','Street signal','Decorations','traffic light signal street city road intersection',.55,3.6,'A static red street signal on an iron post; decorative, with no traffic simulation.'),
  entry('car','Parked hatchback','Decorations','car vehicle parked automobile city transport static scenery',2,1.55,'A parked teal hatchback with glazed windows, lamps and detailed wheels. Static scenery.'),
  entry('bus','Parked city bus','Decorations','bus vehicle parked city transport transit static scenery',3.5,2.65,'A cream-and-sage city bus with passenger windows and double doors. Static scenery.'),
  entry('bicycle','Parked bicycle','Decorations','bicycle bike cycle parked city transport static scenery',1.2,1.3,'A coral bicycle on a small stand, with wire wheels and a leather saddle. Static scenery.'),
  ...HOME_BUILDINGS,...CITY_EXPANSION,...PLACE_BUILDINGS,...WORLD_EXPANSION,
];
const expandedBuildings=new Map([...HOME_BUILDINGS.map(item=>[item.id,createHomeBuilding]),...CITY_EXPANSION.map(item=>[item.id,createCityBuilding]),...PLACE_BUILDINGS.map(item=>[item.id,createPlaceBuilding])]);

const palette={cream:0xe8dbc0,white:0xf8f0db,stone:0xc2c3ad,slate:0x485c61,roof:0x51676a,terracotta:0xb77154,red:0xa85c49,wood:0x947052,darkwood:0x644d3b,lightwood:0xb9986c,bark:0x6e5841,glass:0x8bb6b1,darkglass:0x3e6668,iron:0x3f5353,leaf:0x638b58,leafLight:0x8baa68,leafDark:0x416f55,flower:0xdca28e,yellow:0xe7c87b,sand:0xceb995,water:0x6fafb2};
const materials=new Map(),geometryCache=new Map(),templates=new Map();
function mat(key,opts={}){ const color=typeof key==='string'?(palette[key]??key):key; const id=`${color}/${JSON.stringify(opts)}`; if(!materials.has(id)) materials.set(id,new THREE.MeshStandardMaterial({color,roughness:.82,...opts})); return materials.get(id); }
function geo(id,fn){if(!geometryCache.has(id))geometryCache.set(id,fn());return geometryCache.get(id);}
const BOX=()=>geo('box',()=>new THREE.BoxGeometry(1,1,1));
const SPHERE=()=>geo('sphere',()=>new THREE.SphereGeometry(1,12,8));
function mesh(g,geometry,material,x=0,y=0,z=0,sx=1,sy=1,sz=1){const m=new THREE.Mesh(geometry,typeof material==='object'?material:mat(material));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function box(g,w,h,d,x,y,z,m,rx=0,ry=0,rz=0){const a=mesh(g,BOX(),m,x,y,z,w,h,d);a.rotation.set(rx,ry,rz);return a;}
function ell(g,x,y,z,sx,sy,sz,m){return mesh(g,SPHERE(),m,x,y,z,sx,sy,sz);}
function petal(g,x,y,z,sx,sy,sz,m){return mesh(g,geo('small-leaf',()=>new THREE.SphereGeometry(1,6,4)),m,x,y,z,sx,sy,sz);}
function cyl(g,rt,rb,h,x,y,z,m,n=12){return mesh(g,geo(`cyl${rt},${rb},${h},${n}`,()=>new THREE.CylinderGeometry(rt,rb,h,n)),m,x,y,z);}
function cone(g,r,h,x,y,z,m,n=10){return cyl(g,0,r,h,x,y,z,m,n);}
function beam(g,a,b,r,m,square=false){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);const p=av.clone().add(bv).multiplyScalar(.5);const q=square?box(g,r,d.length(),r,p.x,p.y,p.z,m):cyl(g,r,r,d.length(),p.x,p.y,p.z,m,7);q.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return q;}
function tube(g,points,r,m){const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(g,new THREE.TubeGeometry(c,16,r,7,false),m);}
function gable(g,w,d,h,y,m='roof',x=0,z=0){const sh=new THREE.Shape();sh.moveTo(-w/2,0);sh.lineTo(w/2,0);sh.lineTo(0,h);sh.closePath();const ge=geo(`gable${w}/${d}/${h}`,()=>new THREE.ExtrudeGeometry(sh,{depth:d,bevelEnabled:false}));mesh(g,ge,m,x,y,z-d/2);for(const zz of [z-d/2-.025,z+d/2+.025]){beam(g,[x-w/2,y,zz],[x,y+h,zz],.13,'cream',true);beam(g,[x,y+h,zz],[x+w/2,y,zz],.13,'cream',true);}for(let i=0;i<=8;i++){const zz=z-d/2+d*i/8;beam(g,[x-w/2+.06,y+.06,zz],[x,y+h+.06,zz],.035,m,true);beam(g,[x,y+h+.06,zz],[x+w/2-.06,y+.06,zz],.035,m,true);}return ge;}
function windowFront(g,x,y,z,w=1,h=1.3,frame='white',balcony=false){box(g,w+.18,h+.18,.14,x,y,z,frame);box(g,w,h,.06,x,y,z+.09,'darkglass');box(g,.055,h,.08,x,y,z+.14,frame);box(g,w,.055,.08,x,y,z+.14,frame);box(g,w+.32,.12,.28,x,y-h/2-.08,z+.05,'stone');if(balcony){box(g,w+.7,.16,.85,x,y-h/2-.15,z+.35,'stone');for(let j=-2;j<=2;j++)box(g,.045,.63,.045,x+j*(w+.45)/4,y-h/2+.22,z+.76,'iron');box(g,w+.7,.05,.05,x,y-h/2+.54,z+.76,'iron');}}
function windowSide(g,x,y,z,w=.85,h=1.2){const sub=new THREE.Group();windowFront(sub,0,0,0,w,h);sub.position.set(x,y,z);sub.rotation.y=x<0?-Math.PI/2:Math.PI/2;g.add(sub);}
function door(g,x,z,y=.28,w=.95,h=1.85,color='darkwood'){box(g,w+.22,h+.13,.15,x,y+h/2,z,'white');box(g,w,h,.1,x,y+h/2,z+.1,color);box(g,w*.64,h*.29,.025,x,y+h*.73,z+.16,'darkglass');ell(g,x+w*.3,y+h*.44,z+.18,.055,.055,.055,'yellow');box(g,w+.5,.18,.55,x,y-.03,z+.2,'stone');}
function chimney(g,x,y,z,h=1.8){box(g,.64,h,.7,x,y+h/2,z,'stone');for(let k=0;k<Math.ceil(h/.22);k++)box(g,.67,.035,.73,x,y+k*.22,z,0xa5a38d);box(g,.82,.18,.9,x,y+h,z,'cream');box(g,.5,.05,.55,x,y+h+.1,z,'darkwood');}
function porch(g,w,z,y=.25,roofY=2.75,cols=4){box(g,w,.24,1.5,0,y,z,'lightwood');for(let i=0;i<=Math.floor(w/.25);i++)box(g,.025,.025,1.47,-w/2+i*.25,y+.13,z,'wood');for(let i=0;i<cols;i++){const x=-w/2+.18+i*(w-.36)/(cols-1);box(g,.14,roofY-y,.14,x,(roofY+y)/2,z+.5,'white');}box(g,w+.3,.18,1.75,0,roofY,z,'roof',-.08);for(let s=0;s<3;s++)box(g,1.6,.12,1.1-s*.24,0,.06+s*.11,z+.8+s*.1,'stone');}
function flowerbox(g,x,y,z,w=1.2){box(g,w,.26,.37,x,y,z,'wood');for(let i=0;i<4;i++){const xx=x-w*.35+i*w*.23;ell(g,xx,y+.2,z,.19,.19,.18,'leaf');ell(g,xx,y+.32,z+.05,.1,.1,.1,i%2?'flower':'yellow');}}
function foundation(g,w,d){box(g,w+.24,.28,d+.24,0,.14,0,'stone');box(g,w+.12,.08,d+.12,0,.32,0,'cream');}

const CITY_BUILDINGS=new Set(['glass-tower','art-deco','round-tower','green-tower','hospital','fire-station','library']);
function facade(g,w,d,base,floors,spacing=2.1,tone='white') {
  for(let floor=0;floor<floors;floor++) {
    const y=base+floor*spacing;
    for(const side of [-1,1]) {
      const face=new THREE.Group();face.rotation.y=side<0?Math.PI:0;
      for(let x=-w/2+.85;x<w/2-.3;x+=1.45)windowFront(face,x,y,d/2+.03,.92,1.3,tone);
      g.add(face);
    }
    for(const x of [-w/2-.03,w/2+.03])for(let z=-d/2+.85;z<d/2-.3;z+=1.45)windowSide(g,x,y,z,.92,1.3);
  }
}
function planter(g,x,y,z,w=1.1,d=1.1) {
  box(g,w,.38,d,x,y+.19,z,'cream');
  ell(g,x,y+.65,z,w*.56,.48,d*.56,'leaf');
}
function cityArchitecture(id) {
  const g=new THREE.Group();
  if(id==='glass-tower') {
    foundation(g,6.4,6.4);
    box(g,6.2,2.5,6.2,0,1.6,0,'darkglass');
    box(g,6.5,.24,6.5,0,2.9,0,'white');
    const glass=mat(0x78a6ad,{roughness:.22,metalness:.46});
    box(g,5.1,22.1,5.1,0,14.1,0,glass);
    // Slightly different window tones make the curtain wall feel reflective.
    for(let f=0;f<11;f++)for(let i=-2;i<=2;i++) {
      const y=4.1+f*2,x=i*.96;
      for(const sign of [-1,1]) {
        box(g,.9,1.75,.035,x,y,sign*2.57,(f+i+9)%4===0?0x9dbec0:glass);
        box(g,.035,1.75,.9,sign*2.57,y,x,(f-i+7)%4===0?0x9dbec0:glass);
      }
    }
    for(let x=-2.6;x<2.7;x+=1.04) {
      for(const z of [-2.61,2.61])box(g,.065,22.7,.065,x,14.05,z,'white');
      for(const z of [-2.61,2.61])box(g,.065,22.7,.065,z,14.05,x,'white');
    }
    for(let y=3;y<=25.1;y+=2)box(g,5.35,.1,5.35,0,y,0,'stone');
    box(g,5.5,.25,5.5,0,25.5,0,'white');
    box(g,3.8,1.2,3.8,0,26.2,0,'darkglass');
    for(const x of [-1.85,1.85])for(const z of [-1.85,1.85])box(g,.1,2,.1,x,26.6,z,'white');
    box(g,4,.12,4,0,27.55,0,mat(0xd8e9dc,{emissive:0x88ad9e,emissiveIntensity:.12}));
    door(g,0,3.15,.35,1.5,2.2,'glass');
    box(g,3.6,.12,1.25,0,2.55,3.5,'glass');
    planter(g,-2.4,.35,2.6,.8,.7);planter(g,2.4,.35,2.6,.8,.7);
  } else if(id==='art-deco') {
    foundation(g,7,7);box(g,6.8,3,6.8,0,1.85,0,'stone');
    box(g,6,13.5,6,0,10.1,0,'cream');
    box(g,5.1,4.7,5.1,0,19.2,0,'cream');
    box(g,3.8,2.9,3.8,0,22.95,0,'cream');
    for(const [w,y] of [[7,3.45],[6.3,16.9],[5.4,21.65],[4.2,24.5]])box(g,w,.22,w,0,y,0,'sand');
    facade(g,6,6,4.9,6,2.03,'sand');facade(g,5.1,5.1,18.1,2,2.05,'sand');
    const bronze=mat(0x9b845a,{metalness:.42,roughness:.43});
    for(const x of [-2.75,-1.35,0,1.35,2.75])for(const z of [-3.08,3.08])box(g,.18,14.1,.22,x,10,z,bronze);
    for(const x of [-3.08,3.08])for(const z of [-2.75,0,2.75])box(g,.22,14.1,.18,x,10,z,bronze);
    for(let i=-2;i<=2;i++)box(g,.18,2.1+(.8-Math.abs(i)*.32),.2,i*.55,24.9,1.95,bronze);
    for(const x of [-1.8,1.8])for(const z of [-1.8,1.8])box(g,.2,2.3,.2,x,24.55,z,bronze);
    cyl(g,.12,.28,2.4,0,25.5,0,bronze,8);cone(g,.3,.75,0,27.05,0,bronze,8);
    door(g,0,3.45,.35,1.6,2.4,'darkglass');for(const x of [-1.35,1.35])box(g,.22,2.7,.3,x,1.8,3.54,bronze);
  } else if(id==='round-tower') {
    cyl(g,3.45,3.55,.32,0,.16,0,'stone',32);
    cyl(g,2.9,2.9,20.8,0,10.8,0,mat(0x699391,{roughness:.32,metalness:.25}),32);
    for(let f=0;f<10;f++) {
      const y=.5+f*2.1;
      cyl(g,3.38,3.38,.2,0,y,0,'white',32);
      cyl(g,3.35,3.35,.06,0,y+.8,0,'stone',32);
      for(let i=0;i<16;i++) {
        const a=i*Math.PI/8,x=Math.sin(a),z=Math.cos(a);
        box(g,.055,1.85,.065,x*2.94,y+1.05,z*2.94,'white',0,a);
        box(g,.04,.72,.045,x*3.29,y+.4,z*3.29,'iron',0,a);
      }
    }
    cyl(g,3.45,3.45,.25,0,21.5,0,'white',32);cyl(g,2.7,2.7,.12,0,21.68,0,'lightwood',24);
    for(let i=0;i<7;i++){const a=i*Math.PI*2/7;planter(g,Math.sin(a)*2.25,21.73,Math.cos(a)*2.25,.7,.7);}
    cyl(g,1.2,1.2,1,0,22.1,0,'white',24);cyl(g,1.4,1.4,.15,0,22.68,0,'slate',24);
    door(g,0,2.95,.32,1.3,1.9,'glass');
  } else if(id==='green-tower') {
    foundation(g,7,7);box(g,6.8,3,6.8,0,1.85,0,'darkglass');
    const blocks=[[-.55,6.3,0,5.8,6,5.9],[.65,12,0,5.6,5.4,5.5],[-.35,17.2,-.25,4.6,4.8,4.8]];
    for(const [x,y,z,w,h,d] of blocks) {
      box(g,w,h,d,x,y,z,'cream');
      for(let yy=y-h/2+1.1;yy<y+h/2;yy+=1.7){for(let xx=x-w/2+.75;xx<x+w/2-.2;xx+=1.3)windowFront(g,xx,yy,z+d/2+.04,.87,1.15,'white');}
      for(const side of [-1,1])for(let zz=z-d/2+.7;zz<z+d/2-.2;zz+=.65)box(g,.16,h+.2,.1,x+side*w/2, y,zz,'lightwood');
      box(g,w+.4,.22,d+.4,x,y+h/2+.08,z,'white');
      for(let i=0;i<4;i++)planter(g,x-w/2+.7+i*(w-1.4)/3,y+h/2+.2,z+d/2-.35,.8,.65);
      for(const zz of [z-d/2+.6,z+d/2-.6])planter(g,x-w/2+.35,y+h/2+.2,zz,.65,.8);
    }
    box(g,2.5,.15,2.5,-.3,20.8,-.6,'lightwood');
    for(const x of [-1.4,.8])box(g,.12,1.2,.12,x,20.25,-1.65,'wood');
    door(g,0,3.45,.35,1.4,2.3,'glass');
  } else if(id==='hospital') {
    foundation(g,9.4,6.7);box(g,9.1,6.5,6.4,0,3.6,0,'white');
    box(g,2.8,8,6.6,0,4.35,0,'glass');box(g,3.1,.22,6.9,0,8.48,0,'white');
    for(const x of [-3.3,-1.9,1.9,3.3])for(const y of [1.8,4,6])windowFront(g,x,y,3.25,1.05,1.3);
    for(const side of [-4.6,4.6])for(const z of [-1.8,0,1.8])for(const y of [1.8,4,6])windowSide(g,side,y,z,1.1,1.3);
    for(const y of [2.8,4.9,7])box(g,9.5,.15,6.7,0,y,0,'stone');
    const green=mat(0x3f8d73);box(g,.35,1.55,.12,0,7.1,3.42,green);box(g,1.55,.35,.12,0,7.1,3.42,green);
    door(g,0,3.4,.35,1.6,2.2,'glass');box(g,4.1,.19,1.8,0,2.8,3.7,'glass');
    for(const x of [-1.9,1.9])cyl(g,.06,.06,2.5,x,1.6,4.4,'iron');
    for(const x of [-3.4,3.4])planter(g,x,.35,3.7,1.35,.7);
  } else if(id==='fire-station') {
    foundation(g,9.3,6.2);box(g,9.1,4.2,6,0,2.45,0,'red');
    box(g,9.5,.25,6.4,0,4.65,0,'cream');box(g,2.1,7,2.3,3.25,3.85,-1.8,'red');box(g,2.4,.23,2.6,3.25,7.46,-1.8,'cream');
    for(const x of [-3,0,3]) {
      box(g,2.5,2.9,.15,x,1.85,3.08,'cream');box(g,2.16,2.65,.12,x,1.82,3.18,'slate');
      for(let y=.7;y<3.1;y+=.28)box(g,2.16,.035,.035,x,y,3.27,0x9eaaa4);
      for(const dx of [-.66,0,.66])box(g,.51,.5,.04,x+dx,2.62,3.28,'glass');
      box(g,2.4,.45,.2,x,3.75,3.12,'cream');
      for(let n=0;n<(x===-3?1:x===0?2:3);n++)box(g,.12,.24,.035,x+(n-(x===-3?0:x===0?.5:1))*.22,3.76,3.24,'red');
    }
    for(const y of [5.5,6.6])windowFront(g,3.25,y,-.62,.7,.65);
    for(const x of [-4.58,4.58])for(const z of [-1.8,0,1.8])windowSide(g,x,2.5,z,.85,1.4);
    for(const x of [-4.35,4.35])box(g,.18,4.25,.2,x,2.4,3.1,'cream');
  } else if(id==='library') {
    foundation(g,8.6,5.8);box(g,8.35,4.5,5.5,0,2.6,0,'cream');
    box(g,8.7,.3,5.9,0,4.95,0,'stone');gable(g,8.95,6.1,1.6,5.12,'slate');
    for(const x of [-3.15,-1.65,1.65,3.15])windowFront(g,x,2.6,2.8,1.04,2.4,'white');
    for(const x of [-4.2,4.2])for(const z of [-1.5,.2,1.8])windowSide(g,x,2.6,z,.95,2.4);
    for(let i=0;i<4;i++)box(g,4.1,.15,1.6-i*.3,0,.09+i*.15,3.35+i*.12,'stone');
    for(const x of [-1.75,1.75]){cyl(g,.2,.24,3.5,x,2.35,3.45,'white',12);cyl(g,.34,.34,.2,x,.65,3.45,'stone',12);cyl(g,.34,.34,.2,x,4.12,3.45,'stone',12);}
    box(g,4.1,.26,1.7,0,4.35,3.2,'cream');gable(g,4.35,1.9,.95,4.5,'sand',0,3.15);
    door(g,0,2.85,.6,1.5,2.7,'darkwood');
    // A simple open-book relief over the portico, built from solid geometry.
    box(g,.48,.08,.72,-.24,5.05,4.15,'white',0,0,.14);box(g,.48,.08,.72,.24,5.05,4.15,'white',0,0,-.14);
  }
  return g;
}

function architecture(id){const g=new THREE.Group();
  if(CITY_BUILDINGS.has(id))return cityArchitecture(id);
  if(id==='bridge'){for(let i=0;i<25;i++){const z=-4+i/3,y=.4+Math.sin(i/24*Math.PI)*.65;box(g,2.8,.2,.32,0,y,z,'lightwood');if(i%4===0)for(const x of [-1.4,1.4])box(g,.15,1.2,.15,x,y+.6,z,'wood');}for(let i=0;i<24;i++)for(const x of [-1.4,1.4])beam(g,[x,1.6+Math.sin(i/24*Math.PI)*.65,-4+i/3],[x,1.6+Math.sin((i+1)/24*Math.PI)*.65,-4+(i+1)/3],.07,'wood',true);return g;}
  if(id==='gazebo'){cyl(g,2.7,2.8,.35,0,.18,0,'stone',8);cyl(g,2.5,2.5,.15,0,.44,0,'lightwood',8);for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a)*2.24,z=Math.sin(a)*2.24;box(g,.17,3.2,.17,x,2.05,z,'white');if(i!==2){const b=(i+1)*Math.PI/4;beam(g,[x,1.2,z],[Math.cos(b)*2.24,1.2,Math.sin(b)*2.24],.1,'wood',true);}}cone(g,3,1.65,0,4.4,0,'terracotta',8);cyl(g,.15,.2,.4,0,5.3,0,'white',8);return g;}
  if(id==='greenhouse'){foundation(g,5.6,5.5);box(g,5.4,2.7,5.3,0,1.65,0,mat('glass',{transparent:true,opacity:.45,roughness:.18,metalness:.12}));gable(g,5.5,5.5,1.7,3,mat('glass',{transparent:true,opacity:.45,roughness:.18,metalness:.12}));for(let x=-2.8;x<=2.81;x+=1.4){for(const z of [-2.8,2.8]){box(g,.1,2.8,.1,x,1.75,z,'white');}beam(g,[-2.8,3.05,x],[0,4.75,x],.07,'white',true);beam(g, [0,4.75,x],[2.8,3.05,x],.07,'white',true);}for(const x of [-2.8,2.8])for(let z=-2.8;z<=2.81;z+=1.4)box(g,.1,2.8,.1,x,1.75,z,'white');for(const y of [1,2,3]){for(const x of [-2.8,2.8])box(g,.1,.09,5.7,x,y,0,'white');for(const z of [-2.8,2.8])box(g,5.7,.09,.1,0,y,z,'white');}for(const x of [-1.7,1.7]){box(g,1.5,.45,4.5,x,.6,0,'wood');for(let z=-1.8;z<2;z+=.6)ell(g,x,1,z,.5,.45,.4,'leaf');}door(g,0,2.84,.33,1.1,2.2,'glass');return g;}
  if(id==='villa'){foundation(g,7.8,5.5);box(g,7.5,2.7,5.2,0,1.7,0,'white');box(g,4,2.2,4,-1.7,4.1,-.5,'cream');box(g,4.35,.24,4.3,-1.7,5.32,-.5,'white');box(g,7.9,.22,5.6,0,3.15,0,'white');for(let x=-2.5;x<3;x+=1.35)windowFront(g,x,1.8,2.64,1.12,2.05);for(const x of [-2.7,-.9])windowFront(g,x,4.15,1.52,1.5,1.45);box(g,3.1,.2,3.2,2.25,.38,3.6,'lightwood');for(let x=.8;x<=3.71;x+=.4)box(g,.13,.13,3.3,x,2.95,3.6,'wood');for(const x of [.8,3.7])box(g,.14,2.6,.14,x,1.6,5.08,'darkwood');for(let i=0;i<3;i++)flowerbox(g,2.1+i*.55,3.4,-2.3,.5);return g;}
  if(id==='apartment'){foundation(g,6.6,5.4);box(g,6.4,8.5,5.2,0,4.55,0,'cream');box(g,2.2,8.5,5.3,-1.9,4.55,0,'red');for(let y=1.6;y<=8;y+=2.05){for(const x of [-1.8,1.65])windowFront(g,x,y,2.66,1.5,1.45,'white',true);for(const side of [-3.25,3.25])for(const z of [-1.4,1.4])windowSide(g,side,y,z,.9,1.35);box(g,6.65,.12,5.55,0,y+.94,0,'white');}door(g,0,2.7,.3,1,2.1);box(g,6.8,.26,5.7,0,8.96,0,'slate');for(const x of [-3.1,3.1])box(g,.15,.65,5.4,x,9.3,0,'white');for(const z of [-2.55,2.55])box(g,6.25,.65,.15,0,9.3,z,'white');for(const x of [-2,2])for(const z of [-1.7,1.7]){box(g,.9,.5,.9,x,9.3,z,'stone');ell(g,x,9.9,z,.65,.65,.65,'leaf');}return g;}
  if(id==='townhouse'){foundation(g,3.8,4.5);box(g,3.6,6.6,4.3,0,3.65,0,'red');for(const x of [-1.85,1.85])box(g,.2,6.7,4.5,x,3.65,0,'cream');for(const y of [2.7,4.8,6.9])box(g,3.9,.14,4.55,0,y,0,'cream');for(const y of [3.7,5.8])for(const x of [-.9,.9])windowFront(g,x,y,2.2,.9,1.45,'white',y===3.7);door(g,-.7,2.22,.3,.9,2.1);windowFront(g,.95,1.55,2.2,.85,1.4);gable(g,4.05,4.7,1.4,7,'slate');chimney(g,1.15,7.4,-1.2,1.3);return g;}
  if(id==='barn'){foundation(g,7.4,6.4);box(g,7.2,3.8,6.2,0,2.2,0,'red');for(let x=-3.6;x<3.7;x+=.4)box(g,.06,3.8,.08,x,2.2,3.15,'terracotta');gable(g,7.9,6.9,2.5,4.15,'slate');for(const x of [-3.55,3.55])box(g,.2,3.9,6.3,x,2.2,0,'white');box(g,3.4,2.9,.15,0,1.78,3.23,'darkwood');for(const x of [-1.7,0,1.7])box(g,.13,3,.15,x,1.8,3.35,'white');for(const y of [.35,3.2])box(g,3.5,.13,.15,0,y,3.35,'white');for(const x of [-.85,.85]){beam(g,[x-.8,.4,3.42],[x+.8,3.1,3.42],.11,'white',true);beam(g,[x+.8,.4,3.42],[x-.8,3.1,3.42],.11,'white',true);}windowFront(g,0,4.7,3.2,1.25,1.05);for(const side of [-3.65,3.65])for(const z of [-1.6,1.6])windowSide(g,side,2.3,z,1.1,1.2);return g;}
  if(id==='school'){foundation(g,7.8,5.8);box(g,7.6,3.6,5.6,0,2.1,0,'red');gable(g,8.2,6.2,2,3.9,'slate');for(const x of [-2.6,2.6])windowFront(g,x,2.15,2.85,1.5,1.9);door(g,0,2.85,.3,1.5,2.3);box(g,2.5,.18,1.35,0,2.95,3.15,'white');for(const x of [-1.1,1.1])box(g,.16,2.5,.16,x,1.65,3.65,'white');box(g,1.2,1.3,1.2,0,5.9,0,'cream');for(const x of [-.43,.43])for(const z of [-.43,.43])box(g,.12,1.1,.12,x,6.3,z,'white');cyl(g,.2,.36,.45,0,6.28,0,'yellow');cone(g,1,.9,0,7,0,'slate',4);return g;}
  const isCabin=id==='cabin',isFarm=id==='farmhouse',isSub=id==='suburban',isShop=id==='shop',isCafe=id==='cafe';
  const w=isFarm?6.8:isSub?5.8:5.2,d=isFarm?5.3:4.5,h=isSub?4.2:isFarm?3.7:2.8;
  foundation(g,w,d);box(g,w,h,d,0,.35+h/2,0,isCabin?'wood':isShop?'leafLight':isCafe?'cream':isSub?'red':'cream');
  if(isCabin){for(let y=.55;y<h+.35;y+=.24){for(const z of [-d/2-.04,d/2+.04])box(g,w+.25,.1,.12,0,y,z,'lightwood');for(const x of [-w/2-.04,w/2+.04])box(g,.12,.1,d+.25,x,y,0,'lightwood');}}
  for(const x of [-w/2+.07,w/2-.07])box(g,.19,h+.1,d+.1,x,h/2+.35,0,isCabin?'darkwood':'white');
  gable(g,w+.65,d+.7,isSub?1.9:1.65,h+.4,isCabin?'leafDark':isShop?'terracotta':'roof');
  chimney(g,w*.28,h+1.1,-d*.2,isSub?1.7:1.5);
  if(isSub){for(const x of [-1.65,1.65])windowFront(g,x,3.4,d/2+.05,1.15,1.3);porch(g,w*.8,d/2+.65,.3,2.65,4);door(g,-.8,d/2+.05,.35,1.05,1.9);windowFront(g,1.4,1.55,d/2+.07,1.4,1.5);box(g,1.5,1.4,.6,1.45,1.5,d/2+.18,'cream');windowFront(g,1.45,1.55,d/2+.52,1.3,1.15);}
  else if(isShop||isCafe){door(g,-1.55,d/2+.05,.35,.95,2);windowFront(g,1,1.65,d/2+.05,2.3,1.6);box(g,4.8,.5,.2,0,2.95,d/2+.16,isCafe?'leafDark':'wood');for(let i=0;i<10;i++){box(g,.48,.13,1.35,-2.16+i*.48,2.55,d/2+.65,i%2?'white':isCafe?'leaf':'terracotta',-.15);box(g,.48,.28,.1,-2.16+i*.48,2.35,d/2+1.25,i%2?'white':isCafe?'leaf':'terracotta');}for(const x of [-2.35,2.35])box(g,.07,2.3,.07,x,1.35,d/2+1.2,'iron');if(isCafe){for(const x of [-1.45,1.3]){cyl(g,.57,.57,.1,x,.9,d/2+2,'lightwood');cyl(g,.06,.08,.8,x,.45,d/2+2,'iron');for(const z of [d/2+1.4,d/2+2.6]){box(g,.5,.1,.5,x,.55,z,'wood');for(const dx of [-.2,.2])box(g,.05,.5,.05,x+dx,.27,z,'iron');}}}else{for(const x of [.4,1.5]){box(g,.9,.65,.7,x,.65,d/2+1.55,'wood');for(let i=0;i<6;i++)ell(g,x-.3+(i%3)*.3,1,d/2+1.4+Math.floor(i/3)*.25,.13,.12,.13,i%2?'red':'leafLight');}}}
  else{door(g,0,d/2+.06,.35,1,1.9);for(const x of [-1.65,1.65]){windowFront(g,x,1.75,d/2+.08,1,1.25);flowerbox(g,x,1,d/2+.28);}if(isCabin||isFarm)porch(g,w+.2,d/2+.65,.3,2.65,isFarm?5:4);else{gable(g,1.9,1.25,.6,2.5,'roof',0,d/2+.45);for(const x of [-.8,.8])box(g,.12,2.2,.12,x,1.4,d/2+.95,'white');}}
  for(const side of [-w/2-.07,w/2+.07])for(const z of [-1.2,1.1])windowSide(g,side,1.8,z,1,1.25);
  if(isFarm){box(g,2.8,2.9,3.5,-w/2-1,1.8,-.6,'white');gable(g,3.2,3.9,1.2,3.3,'roof',-w/2-1,-.6);windowFront(g,-w/2-1,1.8,1.2,1.2,1.2);}
  return g;
}

function extraPlant(id) {
  const g=new THREE.Group();g.userData.sway=id!=='cactus';
  if(id==='cactus') {
    const green=mat(0x72956b),rib=mat(0x8fa578);
    cyl(g,.26,.32,3.1,0,1.55,0,green,12);ell(g,0,3.1,0,.26,.28,.26,green);
    tube(g,[[-.1,1.35,0],[-.65,1.35,0],[-.82,1.75,0],[-.82,2.55,0]],.18,green);
    tube(g,[[.1,1.95,0],[.62,1.95,0],[.78,2.3,0],[.78,2.9,0]],.16,green);
    ell(g,-.82,2.55,0,.18,.19,.18,green);ell(g,.78,2.9,0,.16,.18,.16,green);
    for(let i=0;i<10;i++){const a=i*Math.PI/5;beam(g,[Math.sin(a)*.29,.15,Math.cos(a)*.29],[Math.sin(a)*.25,3.12,Math.cos(a)*.25],.018,rib);}
    for(const [x,y] of [[0,3.35],[-.82,2.73]])for(let i=0;i<5;i++){const a=i*Math.PI*2/5;petal(g,x+Math.cos(a)*.09,y,Math.sin(a)*.09,.09,.045,.07,'white');}
    for(let i=0;i<18;i++){const a=i*2.4,y=.5+(i%7)*.36;beam(g,[Math.sin(a)*.29,y,Math.cos(a)*.29],[Math.sin(a)*.36,y+.03,Math.cos(a)*.36],.008,'cream');}
  } else if(id==='acacia') {
    beam(g,[0,0,0],[.25,3.7,0],.25,'bark');
    for(const [x,y,z] of [[-2,5.7,.4],[1.8,5.8,.25],[-.5,6.1,-1.6],[.8,6.3,1.3]]) {
      beam(g,[.25,2.7,0],[x*.65,4.9,z*.65],.12,'bark');beam(g,[x*.65,4.9,z*.65],[x,y,z],.07,'bark');
      ell(g,x,y,z,1.75,.65,1.55,(x<0?'leafDark':'leaf'));
    }
    ell(g,0,6.45,0,2.3,.66,1.8,'leafLight');
  } else if(id==='cherry') {
    cyl(g,.19,.34,3.8,0,1.9,0,'bark',9);
    for(const [x,y,z] of [[-1.6,3.8,.1],[1.5,4.2,.4],[.2,4.3,-1.35]])beam(g,[0,2.3,0],[x,y,z],.13,'bark');
    const pinks=[0xe8b5b3,0xefc7c0,0xd89fa8];
    const crowns=[[-1.35,4.25,.1,1.5],[1.2,4.6,.35,1.5],[.1,4.5,-1.25,1.3],[0,5.25,0,1.6]];
    crowns.forEach(([x,y,z,r],i)=>ell(g,x,y,z,r,r*.78,r,pinks[i%3]));
    for(let i=0;i<18;i++){const a=i*2.4,y=3.85+(i%4)*.5,r=1.7-Math.max(0,y-4.5)*.7;petal(g,Math.cos(a)*r,y,Math.sin(a)*r,.27,.23,.25,pinks[(i+1)%3]);}
    for(let i=0;i<7;i++)petal(g,Math.cos(i*2.4)*1.1,.025,Math.sin(i*2.4)*1.1,.12,.02,.1,pinks[i%3]);
  }
  return g;
}

function plant(id){const g=new THREE.Group();g.userData.sway=['oak','birch','pine','palm','grass','reeds'].includes(id);
  if(['cactus','acacia','cherry'].includes(id))return extraPlant(id);
  if(id==='oak'){cyl(g,.23,.47,4.2,0,2.1,0,'bark',9);for(const [x,y,z] of [[-1.5,4.4,.2],[1.3,4.9,.6],[.4,5,-1.2]])beam(g,[0,2.9,0],[x,y,z],.16,'bark');for(const [x,y,z,r,c] of [[0,6,0,1.9,'leaf'],[-1.45,5.3,.1,1.45,'leafDark'],[1.3,5.7,.55,1.45,'leafLight'],[.1,5.7,-1.4,1.3,'leaf'],[.35,7,0,1.25,'leafLight']])ell(g,x,y,z,r,r*.8,r,c);}
  if(id==='birch'){cyl(g,.12,.25,7,0,3.5,0,'white',9);for(let i=0;i<11;i++)box(g,.28,.08,.08,0,.5+i*.5,.21-i*.008,'darkwood',0,i*.65);for(const [x,y,z] of [[-1,5.5,.2],[1,6.2,.5],[-.5,7.2,-.5]]){beam(g,[0,3.4,0],[x,y,z],.07,'white');ell(g,x,y,z,1.2,1.7,.95,'leafLight');}ell(g,0,7.5,0,1,1.6,1,'leaf');}
  if(id==='pine'){cyl(g,.16,.32,7.6,0,3.8,0,'bark');for(let i=0;i<5;i++){const y=3+i*1.18,r=2.2-i*.34;cone(g,r,3.3-i*.15,0,y,0,i%2?'leaf':'leafDark',11);} }
  if(id==='palm'){tube(g,[[0,0,0],[.1,2,0],[.5,4,.05],[.8,6.2,.1]],.2,'wood');for(let i=0;i<12;i++)cyl(g,.23,.23,.05,.8*Math.pow(i/12,1.5),i*.5,0,'darkwood',8);for(let i=0;i<9;i++){const a=i*Math.PI*2/9;const points=[];for(let j=0;j<7;j++){const r=j*.48;points.push([.8+Math.cos(a)*r,6.35+Math.sin(j/6*Math.PI)*.75-j*.06,.1+Math.sin(a)*r]);}tube(g,points,.055,'leafDark');for(let j=1;j<6;j++){const p=points[j];for(const s of [-1,1]){const le=petal(g,p[0]+Math.cos(a+s*1.1)*.35,p[1]-.12,p[2]+Math.sin(a+s*1.1)*.35,.18,.045,.7,i%2?'leaf':'leafLight');le.rotation.y=-a+s*.6;le.rotation.z=.12;}}}ell(g,.8,6.2,.1,.42,.35,.42,'darkwood');}
  if(id==='bush'){for(let i=0;i<5;i++){const a=i*2.4;ell(g,Math.sin(a)*.55,.8+Math.cos(a)*.15,Math.cos(a)*.5,.7,.8,.7,i%2?'leaf':'leafLight');}for(const [x,z]of [[-.4,.6],[.6,.4],[.1,-.5]])ell(g,x,1.3,z,.1,.1,.1,'flower');}
  if(id==='rock'){for(const [x,z,s]of [[-.6,.1,.8],[.5,-.25,1],[.7,.7,.5]]){const m=mesh(g,geo('rock',()=>new THREE.IcosahedronGeometry(1,1)),mat(0xa2a69b),x,s*.5,z,s*.9,s*.68,s);m.rotation.set(.2+x,x,.1);}}
  if(['flowers','grass','reeds'].includes(id)){for(let i=0;i<(id==='grass'?22:14);i++){const a=i*2.4,r=.2+Math.sqrt(i/14)*.9,x=Math.cos(a)*r,z=Math.sin(a)*r,h=(id==='reeds'?1.3:id==='grass'?.5:.35)+(Math.sin(i*1.7)+1)*.18;beam(g,[x,0,z],[x+.12,h,z+.05],id==='reeds'?.025:.015,'leaf');if(id==='flowers'){for(let j=0;j<5;j++){const b=j*Math.PI*2/5;petal(g,x+.12+Math.cos(b)*.1,h,z+.05+Math.sin(b)*.1,.095,.035,.095,i%3===0?'flower':'white');}petal(g,x+.12,h+.025,z+.05,.06,.04,.06,'yellow');}else if(id==='reeds'){cyl(g,.07,.065,.37,x+.12,h+.12,z+.05,'darkwood',7);const b=box(g,.1,h*.7,.025,x-.05,h*.35,z,'leafLight');b.rotation.z=-.24;}else{const b=cone(g,.09,h,0,0,0,'leafLight',3);b.position.set(x,h/2,z);b.rotation.z=Math.sin(i)*.23;}}}
  return g;
}

function legs(g,positions,length,r,color,hoof='darkwood'){const out=[];for(const [x,y,z]of positions){const p=new THREE.Group();p.position.set(x,y,z);cyl(p,r,r*.8,length,0,-length/2,0,color,8);ell(p,0,-length+.02,.035,r*1.2,.1,r*1.5,hoof);p.name=`leg-${out.length}`;g.add(p);out.push(p);}g.userData.legs=out;}
function eye(g,x,y,z,s=.045){ell(g,x,y,z,s,s,s,'iron');}
function person(id) {
  const g=new THREE.Group();g.userData={animated:true,species:id,legs:[],arms:[],wings:[]};
  const jog=id==='jogger',garden=id==='gardener';
  const skin=garden?0xb67f60:jog?0xcf9c76:0xe1b28e;
  const shirt=garden?0xf0dfbb:jog?0xd98673:0x6f8b78;
  const trousers=garden?0x577e8b:jog?0x435c68:0x9c8c70;
  ell(g,0,1.14,0,.24,.34,.17,shirt);cyl(g,.075,.085,.13,0,1.46,.015,skin,8);
  ell(g,0,1.68,.015,.195,.23,.185,skin);
  ell(g,0,1.81,-.015,.2,.13,.19,garden?0x6b4e37:jog?0x503f35:0x76513c);
  for(const x of [-.075,.075])eye(g,x,1.71,.176,.017);
  ell(g,0,1.65,.2,.034,.035,.035,skin);
  for(const x of [-.185,.185])ell(g,x,1.67,.02,.035,.065,.045,skin);
  for(const side of [-1,1]) {
    const leg=new THREE.Group();leg.name=`leg-${side}`;leg.position.set(side*.115,.84,0);
    if(jog){cyl(leg,.085,.078,.28,0,-.12,0,trousers,8);cyl(leg,.058,.065,.43,0,-.46,0,skin,8);cyl(leg,.064,.064,.12,0,-.66,0,'white',8);}
    else cyl(leg,.078,.07,.69,0,-.34,0,trousers,8);
    ell(leg,0,-.765,.045,.083,.075,.14,jog?'cream':'darkwood');
    if(jog)box(leg,.16,.035,.24,0,-.805,.04,'terracotta');
    g.add(leg);g.userData.legs.push(leg);
    const arm=new THREE.Group();arm.name=`arm-${side}`;arm.position.set(side*.245,1.34,0);
    if(jog){beam(arm,[0,0,0],[side*.035,-.27,-.04],.06,shirt);beam(arm,[side*.035,-.27,-.04],[side*.03,-.3,.18],.045,skin);ell(arm,side*.03,-.3,.2,.055,.06,.065,skin);}
    else{cyl(arm,.07,.06,.42,side*.02,-.2,0,shirt,8);cyl(arm,.052,.05,.16,side*.025,-.48,0,skin,8);ell(arm,side*.025,-.58,.015,.06,.075,.065,skin);}
    g.add(arm);g.userData.arms.push(arm);
  }
  if(garden) {
    box(g,.3,.4,.05,0,1.15,.16,trousers);
    for(const x of [-.105,.105])box(g,.065,.36,.045,x,1.35,.165,trousers,0,0,x<0?-.13:.13);
    box(g,.18,.14,.025,0,1.1,.2,'glass');
    cyl(g,.38,.38,.035,0,1.87,0,'sand',20);cyl(g,.22,.25,.19,0,1.97,0,'yellow',16);cyl(g,.252,.255,.055,0,1.92,0,'wood',16);
  } else if(jog) {
    ell(g,0,1.79,-.23,.09,.1,.16,0x503f35);box(g,.29,.045,.025,0,1.28,.172,'cream');
    box(g,.115,.09,.025,-.02,1.12,.175,'white');
  } else {
    box(g,.025,.5,.025,0,1.16,.173,'cream');
    for(const x of [-.12,.12])box(g,.1,.08,.035,x,1.02,.17,'leafDark');
    beam(g,[-.16,1.4,.18],[.29,.98,.18],.03,'darkwood',true);
    box(g,.23,.25,.15,.29,.94,.09,'wood');box(g,.24,.055,.16,.29,1.06,.09,'darkwood');
  }
  return g;
}

function extraAnimal(id) {
  const g=new THREE.Group();g.userData={animated:true,species:id,legs:[],wings:[]};
  if(id==='zebra') {
    ell(g,0,1.48,0,.43,.51,.91,'white');legs(g,[[-.3,1.32,-.55],[.3,1.32,-.55],[-.3,1.32,.56],[.3,1.32,.56]],1.24,.085,'white','iron');
    beam(g,[0,1.58,.5],[0,2.22,.83],.23,'white');ell(g,0,2.34,.9,.22,.31,.36,'white');ell(g,0,2.22,1.18,.2,.17,.23,'iron');
    for(const x of [-.16,.16]){ell(g,x,2.67,.79,.075,.18,.07,'white');ell(g,x,2.7,.84,.03,.11,.025,'iron');eye(g,x*1.2,2.4,1.12,.035);}
    // Curved stripes follow the surface instead of projecting away from it.
    for(let i=0;i<9;i++) {
      const z=-.72+i*.18,scale=Math.sqrt(Math.max(.12,1-(z/.94)**2));
      const pts=[];for(let j=0;j<=12;j++){const a=j*Math.PI/12;pts.push([Math.cos(a)*.438*scale,1.48+Math.sin(a)*.515*scale,z]);}
      tube(g,pts,.035,'iron');
      for(const s of [-1,1])beam(g,[s*.39*scale,1.48,z],[s*.34*scale,1.18,z+.05],.035,'iron');
    }
    for(let i=0;i<6;i++){const y=1.8+i*.12;box(g,.43,.045,.035,0,y,.58+(y-1.8)*.43,'iron');}
    for(let i=0;i<8;i++)box(g,.065,.19,.13,0,1.9+i*.1,.45+i*.035,'iron',-.3);
    tube(g,[[0,1.55,-.88],[.06,1.18,-1.16],[.07,.65,-1.2]],.045,'iron');ell(g,.07,.63,-1.2,.07,.13,.08,'iron');
  } else if(id==='tortoise') {
    ell(g,0,.32,0,.52,.38,.64,0x697758);ell(g,0,.16,0,.52,.13,.64,'sand');
    legs(g,[[-.37,.22,-.38],[.37,.22,-.38],[-.37,.22,.36],[.37,.22,.36]],.15,.08,0x8d986b,0x8d986b);
    ell(g,0,.25,.66,.16,.14,.23,0x9ca679);for(const x of [-.11,.11])eye(g,x,.31,.81,.025);
    // Dark hexagonal scutes sit close to the dome of the shell.
    for(let i=0;i<7;i++){const a=i*Math.PI/3,r=i===6?0:.32,x=Math.cos(a)*r,z=Math.sin(a)*r;const y=.32+Math.sqrt(Math.max(0,1-(x/.52)**2-(z/.64)**2))*.38;
      const patch=cyl(g,.13,.16,.025,x,y+.014,z,0xa2a978,6);patch.rotation.z=-x*.55;patch.rotation.x=z*.4;}
    cone(g,.07,.22,0,.14,-.69,0x9ca679,6).rotation.x=-Math.PI/2;
  } else if(id==='sheep') {
    ell(g,0,.9,0,.42,.45,.65,'cream');
    for(let i=0;i<15;i++){const a=i*2.4,z=-.43+(i%5)*.215;petal(g,Math.cos(a)*.3,.89+Math.sin(a)*.27,z,.22,.24,.24,i%2?'white':'cream');}
    legs(g,[[-.25,.6,-.38],[.25,.6,-.38],[-.25,.6,.35],[.25,.6,.35]],.52,.07,'iron','iron');
    ell(g,0,1.08,.64,.22,.25,.28,'iron');ell(g,0,.96,.82,.19,.13,.16,'iron');
    for(const x of [-.27,.27]){const e=ell(g,x,1.17,.65,.17,.075,.1,'iron');e.rotation.z=x<0?.3:-.3;eye(g,x*.62,1.14,.83,.034);}
    petal(g,0,1.27,.58,.23,.14,.19,'white');ell(g,0,.94,-.7,.14,.15,.14,'cream');
  } else if(id==='duck') {
    ell(g,0,.35,0,.3,.27,.45,0xa5937b);ell(g,0,.28,.2,.25,.18,.3,0xc4c5ae);
    cyl(g,.1,.13,.28,0,.58,.3,0x427d65,10);ell(g,0,.74,.34,.17,.18,.18,0x3f7e66);
    cyl(g,.13,.13,.04,0,.56,.3,'white',10);ell(g,0,.71,.55,.13,.045,.19,'yellow');for(const x of [-.13,.13])eye(g,x,.79,.43,.024);
    for(const x of [-.17,.17]){const leg=new THREE.Group();leg.position.set(x,.18,.05);cyl(leg,.025,.025,.12,0,-.06,0,'terracotta',6);ell(leg,0,-.15,.07,.1,.025,.14,'terracotta');g.add(leg);g.userData.legs.push(leg);}
    for(const x of [-.27,.27]){const wing=ell(g,x,.41,-.06,.06,.15,.3,0x887b69);g.userData.wings.push(wing);box(g,.027,.09,.15,x*1.13,.43,-.1,0x3a6878);}
    tube(g,[[0,.43,-.37],[0,.52,-.53],[0,.62,-.51]],.035,'iron');
  }
  return g;
}
function animal(id){const g=new THREE.Group();g.userData.animated=true;g.userData.species=id;g.userData.legs=[];g.userData.wings=[];
  if(['zebra','tortoise','sheep','duck'].includes(id))return extraAnimal(id);
  if(id==='deer'||id==='horse'||id==='giraffe'||id==='fox'){const giraffe=id==='giraffe',horse=id==='horse',fox=id==='fox';const color=giraffe?0xcda65e:horse?0x8c5b3c:fox?0xbf7046:0xb08a61;const bodyY=giraffe?2.5:horse?1.55:fox?.58:1.3,s=giraffe?1.2:horse?1.2:fox?.7:1;ell(g,0,bodyY,0,.42*s,.48*s,.85*s,color);const legLen=giraffe?2.27:horse?1.32:fox?.35:1.07;legs(g,[[-.3*s,bodyY-.15,-.5*s],[.3*s,bodyY-.15,-.5*s],[-.3*s,bodyY-.15,.5*s],[.3*s,bodyY-.15,.5*s]],legLen,fox?.06:.09*s,color);
    const headY=giraffe?5.25:horse?2.6:fox?.92:2.08,headZ=giraffe?.8:horse?.85:fox?.7:.65;beam(g,[0,bodyY,.5*s],[0,headY-.15,headZ],giraffe?.24:horse?.27:fox?.14:.18,color);ell(g,0,headY,headZ,.23*s,.3*s,.35*s,color);ell(g,0,headY-.08,headZ+.27*s,.19*s,.17*s,.32*s,fox?'cream':color);for(const x of [-.18*s,.18*s]){const e=ell(g,x,headY+.32*s,headZ-.06,.09*s,.22*s,.1*s,color);e.rotation.z=x<0?.35:-.35;eye(g,x*1.22,headY+.03,headZ+.22*s,.045*s);}ell(g,0,headY-.04,headZ+.55*s,.12*s,.08*s,.06*s,'darkwood');
    if(giraffe){for(let k=0;k<13;k++){const y=2.8+k*.16,z=.5+(y-2.5)*.11;for(const x of [-.205,.205])ell(g,x,y,z,.025,.095,.1,0x8f6739);}for(let k=0;k<16;k++){const z=-.7+(k%5)*.32,y=2.2+Math.floor(k/5)*.26;for(const x of [-.45,.45])ell(g,x,y,z,.035,.11,.13,0x8f6739);}for(const x of [-.13,.13]){cyl(g,.035,.04,.25,x,5.66,.72,'wood',7);ell(g,x,5.8,.72,.075,.07,.075,'darkwood');}}
    else if(id==='deer'){for(const sgn of [-1,1]){beam(g,[sgn*.13,2.32,.53],[sgn*.35,2.88,.3],.035,'lightwood');beam(g,[sgn*.23,2.6,.43],[sgn*.5,2.7,.4],.03,'lightwood');beam(g,[sgn*.29,2.76,.35],[sgn*.18,2.91,.17],.025,'lightwood');}for(let k=0;k<12;k++)for(const sign of [-1,1])ell(g,sign*.395,1.27+(k%3)*.12,-.55+Math.floor(k/3)*.3,.028,.04,.05,'cream');}
    if(horse){tube(g,[[0,2.85,.65],[0,2.55,.5],[0,2.15,.35],[0,1.85,.3]],.09,'darkwood');tube(g,[[0,1.6,-1],[0,1.2,-1.25],[0,.6,-1.35]],.12,'darkwood');}else if(fox){const tail=ell(g,.05,.58,-.9,.24,.23,.65,color);tail.rotation.x=-.17;ell(g,.05,.68,-1.4,.19,.18,.25,'white');}else tube(g,[[0,bodyY,-.75*s],[.06,bodyY-.3,-.95*s],[.1,bodyY-.65,-1*s]],.045,'darkwood');
  }else if(id==='rabbit'){ell(g,0,.37,-.1,.28,.32,.44,0xb8a38a);ell(g,0,.55,.29,.23,.24,.23,0xc4b09a);for(const x of [-.12,.12]){ell(g,x,.9,.25,.065,.29,.09,0xc4b09a);ell(g,x,.93,.31,.028,.2,.025,'flower');eye(g,x*1.55,.6,.4,.028);}ell(g,0,.48,.5,.05,.04,.04,'flower');ell(g,0,.39,-.48,.16,.16,.16,'white');legs(g,[[-.18,.18,-.25],[.18,.18,-.25],[-.15,.18,.23],[.15,.18,.23]],.15,.07,0xc4b09a,0xc4b09a);
  }else if(id==='elephant'){ell(g,0,2,0,1.05,1.15,1.4,0x9eaaa0);legs(g,[[-.65,1.4,-.8],[.65,1.4,-.8],[-.65,1.4,.75],[.65,1.4,.75]],1.35,.28,0x9eaaa0,0xc4c6b7);ell(g,0,2.8,1.15,.75,.88,.75,0xaab4a8);for(const x of [-.85,.85]){const e=ell(g,x,2.75,1.1,.65,.86,.16,0x98a497);e.rotation.y=x<0?-.25:.25;eye(g,x*.6,2.98,1.76,.07);}tube(g,[[0,2.8,1.72],[0,2.1,2.02],[0,1.3,2.13],[.2,.95,2.37]],.19,0xaab4a8);for(const x of [-.4,.4])tube(g,[[x,2.2,1.66],[x,1.99,2],[x,2.08,2.35]],.065,'white');tube(g,[[0,2,-1.4],[.15,1.4,-1.7],[.2,1.05,-1.7]],.06,0x8e998d);
  }else if(id==='penguin'){ell(g,0,.67,0,.32,.53,.3,'iron');ell(g,0,.63,.22,.25,.38,.1,'white');ell(g,0,1.11,.06,.24,.24,.23,'iron');box(g,.32,.07,.05,0,1.21,.24,'white');for(const x of [-.12,.12])eye(g,x,1.14,.25,.035);const beak=cone(g,.09,.27,0,1.06,.35,'terracotta',5);beak.rotation.x=Math.PI/2;for(const x of [-.17,.17])ell(g,x,.08,.15,.14,.06,.22,'terracotta');for(const x of [-.31,.31]){const wing=ell(g,x,.7,-.01,.08,.34,.15,'iron');wing.rotation.z=x<0?-.3:.3;g.userData.wings.push(wing);}
  }else if(id==='flamingo'){ell(g,0,1.52,0,.28,.32,.48,0xe5a0a0);legs(g,[[-.1,1.4,0],[.1,1.4,0]],1.35,.025,0xb97871,0xb97871);tube(g,[[0,1.65,.25],[0,2,.46],[0,2.25,.3],[0,2.58,.38]],.075,0xe5a0a0);ell(g,0,2.58,.45,.14,.15,.18,0xedb3ad);tube(g,[[0,2.6,.6],[0,2.55,.76],[0,2.42,.78]],.065,'cream');ell(g,0,2.4,.78,.06,.07,.06,'iron');for(const x of [-.115,.115])eye(g,x,2.63,.52,.028);for(const x of [-.25,.25])ell(g,x,1.56,-.06,.07,.22,.32,0xd78c91);
  }else if(id==='bird'){ell(g,0,.1,0,.13,.12,.3,'slate');ell(g,0,.2,.26,.12,.11,.13,'slate');const beak=cone(g,.04,.16,0,.2,.39,'yellow',5);beak.rotation.x=Math.PI/2;for(const x of [-1,1]){const wing=new THREE.Group();wing.position.set(x*.08,.16,-.03);const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(x*.63,-.16);sh.lineTo(x*.4,.09);sh.lineTo(0,.21);sh.closePath();const me=new THREE.Mesh(new THREE.ShapeGeometry(sh),mat('slate',{side:THREE.DoubleSide}));me.rotation.x=-Math.PI/2;wing.add(me);g.add(wing);g.userData.wings.push(wing);}const tail=cone(g,.16,.4,0,.07,-.38,'slate',3);tail.rotation.x=-Math.PI/2;g.userData.flight=true;
  }else if(id==='fish'){ell(g,0,0,0,.18,.27,.52,0xe0ad65);ell(g,0,-.06,.24,.17,.15,.28,'cream');const tail=cone(g,.29,.33,0,0,-.57,0xd38554,3);tail.rotation.x=-Math.PI/2;tail.scale.z=.2;g.userData.tail=tail;for(const x of [-.145,.145])eye(g,x,.07,.35,.04);const fin=cone(g,.16,.3,0,.26,-.02,0xd38554,3);fin.scale.x=.18;for(const x of [-.17,.17]){const f=ell(g,x,-.03,0,.23,.025,.15,0xdca85e);f.rotation.z=x<0?-.3:.3;}}
  return g;
}

function fence(g,x1,z1,x2,z2,gate=false){const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz),n=Math.max(1,Math.ceil(len/2));for(let i=0;i<=n;i++){const x=x1+dx*i/n,z=z1+dz*i/n;box(g,.18,1.8,.18,x,.9,z,'wood');cone(g,.16,.18,x,1.88,z,'lightwood',4);}for(const y of [.5,1.05,1.55])beam(g,[x1,y,z1],[x2,y,z2],.1,'lightwood',true);if(gate){beam(g,[x1,.35,z1],[x2,1.6,z2],.1,'wood',true);box(g,.2,.08,.25,(x1+x2)/2,1.1,(z1+z2)/2,'iron');}}
function streetTile(id) {
  const g=new THREE.Group(),asphalt=mat(0x87918b);
  if(id==='plaza') {
    box(g,6,.11,6,0,.055,0,'stone');
    for(let x=0;x<6;x++)for(let z=0;z<6;z++)box(g,.95,.03,.95,x-2.5,.125,z-2.5,(x+z)%2?'cream':'sand');
    const motif=new THREE.Group();motif.rotation.y=Math.PI/4;
    box(motif,1.2,.012,1.2,0,.15,0,'slate');box(motif,.7,.014,.7,0,.157,0,'cream');g.add(motif);
    for(const x of [-2.9,2.9])box(g,.14,.08,6,x,.15,0,'cream');for(const z of [-2.9,2.9])box(g,6,.08,.14,0,.15,z,'cream');
    return g;
  }
  if(id==='parking') {
    box(g,10,.08,9,0,.04,0,asphalt);
    for(const x of [-4.9,4.9])box(g,.2,.15,9,x,.075,0,'stone');box(g,10,.15,.2,0,.075,-4.4,'stone');
    for(const side of [-1,1])for(let i=0;i<4;i++)box(g,3.3,.012,.07,side*3.25,.087,-4.2+i*2.8,'cream');
    for(const side of [-1,1])for(let i=0;i<3;i++){box(g,.13,.17,1.2,side*4.5,.1,-2.8+i*2.8,'stone');}
    box(g,.08,.01,1.15,0,.086,3.3,'cream');
    return g;
  }
  // A 3 × 3 decomposition gives every arm an exact four-meter width and
  // avoids overlapping coplanar road surfaces at the middle of a junction.
  const cells=[[-2.5,1],[0,4],[2.5,1]];
  const armN=id==='road'||id==='road-cross'||id==='road-corner';
  const armS=id==='road'||id==='road-cross'||id==='road-t';
  const armE=id!=='road',armW=id==='road-t'||id==='road-cross';
  for(let ix=0;ix<3;ix++)for(let iz=0;iz<3;iz++) {
    const [x,w]=cells[ix],[z,d]=cells[iz];
    const paved=(ix===1&&iz===1)||(ix===1&&iz===0&&armN)||(ix===1&&iz===2&&armS)||(iz===1&&ix===0&&armW)||(iz===1&&ix===2&&armE);
    box(g,w,paved?.08:.15,d,x,paved?.04:.075,z,paved?asphalt:'stone');
    if(!paved){for(let step=-d/2+.55;step<d/2;step+=1)box(g,w,.008,.025,x,.154,z+step,'sand');}
  }
  if(id==='road') {
    for(const x of [-2.025,2.025])box(g,.08,.16,6,x,.08,0,'cream');
    for(let z=-2;z<3;z+=2)box(g,.085,.008,.8,0,.084,z,'cream');
  } else if(id==='road-corner') {
    // L-shaped center markings make this piece easy to orient from above.
    box(g,.085,.008,1.2,0,.084,-1.8,'cream');box(g,1.2,.008,.085,1.8,.084,0,'cream');
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.086,-1),new THREE.Vector3(.2,.086,-.2),new THREE.Vector3(1,.086,0)]);
    mesh(g,new THREE.TubeGeometry(curve,10,.033,4,false),mat('cream'));
  } else {
    for(const side of [-1,1])for(let i=0;i<5;i++)box(g,.16,.009,.44,side*2.36,.085,-1.35+i*.67,'cream');
    if(id==='road-cross')for(let i=0;i<5;i++)box(g,.44,.009,.16,-1.35+i*.67,.085,-2.36,'cream');
    for(let i=0;i<5;i++)box(g,.44,.009,.16,-1.35+i*.67,.085,2.36,'cream');
  }
  return g;
}

function wheel(g,x,y,z,r=.31,w=.16) {
  const tire=cyl(g,r,r,w,x,y,z,0x3b4544,16);tire.rotation.z=Math.PI/2;
  const hub=cyl(g,r*.53,r*.53,w+.012,x,y,z,'stone',12);hub.rotation.z=Math.PI/2;
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;beam(g,[x+Math.sign(x)*w*.55,y,z],[x+Math.sign(x)*w*.55,y+Math.sin(a)*r*.42,z+Math.cos(a)*r*.42],.022,'iron');}
}
function extrudedProfile(g,points,width,material) {
  const shape=new THREE.Shape();points.forEach(([z,y],i)=>i?shape.lineTo(-z,y):shape.moveTo(-z,y));shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSize:.04,bevelThickness:.04,bevelSegments:2,steps:1});
  geometry.translate(0,0,-width/2);const model=mesh(g,geometry,material);model.rotation.y=Math.PI/2;return model;
}
function cityProp(id) {
  if(['road','road-corner','road-t','road-cross','parking','plaza'].includes(id))return streetTile(id);
  const g=new THREE.Group();
  if(id==='traffic-light') {
    cyl(g,.055,.085,3,0,1.5,0,'iron');cyl(g,.18,.23,.14,0,.07,0,'stone');
    box(g,.43,1.05,.28,0,3.02,0,'iron');
    for(let i=0;i<3;i++){
      const y=3.35-i*.32,c=i===0?mat(0xcf5f53,{emissive:0xa94037,emissiveIntensity:.45}):i===1?mat(0x7c7050):mat(0x496b5a);
      const lamp=cyl(g,.105,.105,.05,0,y,.17,c,14);lamp.rotation.x=Math.PI/2;
      box(g,.24,.055,.23,0,y+.12,.17,'iron');
    }
  } else if(id==='car') {
    const teal=mat(0x638f8c,{roughness:.34,metalness:.2});
    extrudedProfile(g,[[-1.7,.36],[-1.72,.73],[-1.42,.94],[.95,.88],[1.65,.73],[1.72,.39]],1.55,teal);
    extrudedProfile(g,[[-1.2,.84],[-.95,1.42],[.35,1.42],[.92,.88]],1.34,'darkglass');
    box(g,1.4,.08,1.38,0,1.43,-.3,teal);
    for(const x of [-.69,.69]) {
      beam(g,[x,.9,.88],[x,1.43,.33],.045,teal,true);beam(g,[x,.89,-1.2],[x,1.43,-.96],.045,teal,true);
      box(g,.055,.52,.065,x,1.16,-.28,teal);box(g,.045,.055,2,x,.9,-.18,teal);
      box(g,.055,.04,.2,x*1.05,1,-.51,'iron');ell(g,x*1.2,1.07,.58,.12,.07,.08,teal);
    }
    for(const x of [-.79,.79])for(const z of [-1.05,1.05])wheel(g,x,.31,z);
    for(const x of [-.52,.52]){box(g,.3,.15,.06,x,.65,1.69,'cream');box(g,.23,.14,.05,x,.68,-1.73,'terracotta');}
    box(g,.68,.12,.055,0,.49,1.74,'iron');box(g,.4,.09,.02,0,.49,-1.77,'white');
  } else if(id==='bus') {
    const sage=mat(0x728f79,{roughness:.4,metalness:.15});
    extrudedProfile(g,[[-3.15,.43],[-3.15,2.35],[-2.95,2.54],[2.9,2.54],[3.15,2.3],[3.15,.43]],2.05,'cream');
    box(g,2.13,.62,6.3,0,.77,0,sage);box(g,2.12,.11,6.3,0,1.21,0,'lightwood');
    for(const x of [-1.075,1.075]) {
      for(let z=-2.55;z<2.8;z+=.93)box(g,.035,.84,.77,x,1.88,z,'darkglass');
      for(let z=-2.99;z<3;z+=.93)box(g,.04,1,.055,x,1.86,z,'white');
    }
    box(g,1.8,1,.055,0,1.89,3.18,'darkglass');box(g,1.5,.68,.055,0,1.92,-3.19,'darkglass');
    box(g,1.2,.19,.06,0,2.38,3.2,'iron');for(let i=0;i<5;i++)box(g,.11,.055,.015,-.4+i*.2,2.38,3.24,'yellow');
    for(const z of [1.75,2.3]){box(g,.05,1.63,.49,1.09,1.28,z,'iron');box(g,.02,1.16,.38,1.13,1.43,z,'glass');}
    for(const x of [-1.07,1.07])for(const z of [-1.9,1.9])wheel(g,x,.42,z,.42,.18);
    for(const x of [-.74,.74]){box(g,.28,.17,.06,x,.86,3.2,'white');box(g,.18,.18,.06,x,.89,-3.2,'red');}
    box(g,2.18,.14,.16,0,.5,3.19,'iron');box(g,1.15,.12,1.6,0,2.64,-.6,'stone');
  } else if(id==='bicycle') {
    const coral=mat(0xc47c69,{metalness:.25,roughness:.4});
    for(const z of [-.76,.76]) {
      const tire=new THREE.Mesh(geo('bike-tire',()=>new THREE.TorusGeometry(.37,.035,6,24)),mat('iron'));tire.rotation.y=Math.PI/2;tire.position.set(0,.4,z);g.add(tire);
      const rim=new THREE.Mesh(geo('bike-rim',()=>new THREE.TorusGeometry(.335,.015,5,24)),mat('stone'));rim.rotation.y=Math.PI/2;rim.position.set(0,.4,z);g.add(rim);
      for(let i=0;i<10;i++){const a=i*Math.PI/5;beam(g,[0,.4,z],[0,.4+Math.sin(a)*.32,z+Math.cos(a)*.32],.009,'stone');}
    }
    const a=[0,.4,-.76],b=[0,.42,-.1],c=[0,1.03,-.32],d=[0,1.02,.52],e=[0,.4,.76];
    for(const [p,q] of [[a,b],[a,c],[b,c],[b,d],[c,d],[d,e]])beam(g,p,q,.035,coral);
    beam(g,[0,1.02,.52],[0,1.22,.5],.028,'iron');beam(g,[-.26,1.22,.5],[.26,1.22,.5],.026,'iron');
    for(const x of [-.25,.25])beam(g,[x,1.22,.5],[x,1.2,.35],.03,'darkwood');
    beam(g,[0,.92,-.3],[0,1.14,-.35],.026,'iron');ell(g,0,1.15,-.36,.14,.045,.19,'darkwood');
    for(const side of [-1,1]){beam(g,[0,.43,-.1],[side*.15,.43+side*.1,-.1],.02,'iron');box(g,.12,.035,.09,side*.19,.43+side*.1,-.1,'iron');}
    beam(g,[0,.45,-.25],[.25,.025,-.35],.02,'iron');
  }
  return g;
}

function props(id){const g=new THREE.Group();
  if(['road','road-corner','road-t','road-cross','parking','plaza','traffic-light','car','bus','bicycle'].includes(id))return cityProp(id);
  if(id==='enclosure'){fence(g,-8,-6,8,-6);fence(g,-8,-6,-8,6);fence(g,8,-6,8,6);fence(g,-8,6,-1.5,6);fence(g,1.5,6,8,6);fence(g,-1.5,6,1.5,6,true);g.userData.enclosure={halfX:8,halfZ:6};}
  if(id==='fence')fence(g,-2,0,2,0);
  if(id==='gate')fence(g,-1.5,0,1.5,0,true);
  if(id==='shelter'){box(g,4.5,.2,3.6,0,.1,0,'sand');box(g,4.4,2.6,.15,0,1.4,-1.7,'wood');for(const x of [-2.15,2.15]){box(g,.15,2.6,3.5,x,1.4,0,'wood');box(g,.18,2.8,.18,x,1.5,1.7,'darkwood');}gable(g,5,4.1,1,2.8,'leafDark');box(g,3,.13,2,0,.25,0,'yellow');for(let x=-2;x<2.1;x+=.4)box(g,.06,2.6,.1,x,1.4,-1.6,'lightwood');}
  if(id==='food'){box(g,2.5,.25,1.5,0,.65,0,'wood');for(const x of [-1.1,1.1])for(const z of [-.6,.6])box(g,.12,1.3,.12,x,.65,z,'darkwood');for(const z of [-.75,.75])for(let x=-1.2;x<1.3;x+=.3)box(g,.07,.7,.06,x,1,z,'lightwood');ell(g,0,.95,0,1.15,.3,.6,'yellow');}
  if(id==='water-trough'){box(g,2.7,.65,1.3,0,.33,0,'stone');box(g,2.25,.07,.9,0,.68,0,mat('water',{roughness:.15,metalness:.3}));for(const z of [-.59,.59])box(g,2.8,.16,.2,0,.73,z,'cream');for(const x of [-1.3,1.3])box(g,.2,.16,1.2,x,.73,0,'cream');}
  if(id==='viewing-deck'){box(g,5.5,.24,4,0,.65,0,'wood');for(let x=-2.5;x<=2.6;x+=.26)box(g,.23,.03,3.96,x,.79,0,'lightwood');for(const x of [-2.6,2.6])for(const z of [-1.8,1.8])box(g,.18,1.8,.18,x,.9,z,'darkwood');for(const z of [-1.9,1.9])beam(g,[-2.7,1.65,z],[2.7,1.65,z],.08,'wood',true);for(let i=0;i<3;i++)box(g,2,.18,.45,0,.15+i*.19,2.9-i*.42,'lightwood');}
  if(id==='road'){box(g,4,.08,6,0,.04,0,0x87918b);for(const x of [-2.1,2.1])box(g,.22,.13,6,x,.065,0,'stone');for(let z=-2;z<3;z+=2)box(g,.09,.006,.8,0,.084,z,'cream');}
  if(id==='stone-path'){for(let iz=0;iz<6;iz++)for(let ix=0;ix<3;ix++){const x=(ix-1)*.78+(iz%2?.12:0),z=(iz-2.5)*.64;const b=box(g,.72,.09,.58,x,.045,z,ix%2?'stone':'sand');b.rotation.y=Math.sin(ix+iz)*.035;}}
  if(id==='bench'){for(let i=0;i<5;i++)box(g,2.4,.1,.14,0,.66,-.3+i*.16,'wood');for(let i=0;i<3;i++)box(g,2.4,.16,.08,0,.88+i*.18,-.37,'lightwood');for(const x of [-.9,.9]){box(g,.08,.65,.08,x,.34,-.25,'iron');box(g,.08,.65,.08,x,.34,.28,'iron');box(g,.08,1.1,.08,x,.61,-.4,'iron');beam(g,[x,.7,-.35],[x,.7,.37],.05,'iron',true);}}
  if(id==='streetlight'){cyl(g,.08,.13,3.9,0,1.95,0,'iron');cyl(g,.25,.3,.25,0,.12,0,'iron');box(g,.65,.12,.65,0,3.93,0,'iron');box(g,.46,.63,.46,0,4.25,0,mat(0xffdc9d,{emissive:0xeab568,emissiveIntensity:.4,roughness:.35}));for(const x of [-.24,.24])for(const z of [-.24,.24])box(g,.035,.7,.035,x,4.25,z,'iron');cone(g,.5,.35,0,4.72,0,'iron',4);}
  if(id==='fountain'){cyl(g,1.85,1.95,.3,0,.15,0,'stone',24);cyl(g,1.65,1.7,.2,0,.34,0,'cream',24);cyl(g,1.55,1.55,.04,0,.46,0,mat('water',{roughness:.18,metalness:.3}),24);cyl(g,.22,.45,1.1,0,.9,0,'stone');cyl(g,.8,.35,.25,0,1.48,0,'cream',20);cyl(g,.72,.72,.03,0,1.61,0,'water',20);ell(g,0,1.88,0,.2,.35,.2,'stone');}
  if(id==='garden'){for(const x of [-1.25,1.25])for(const z of [-1.25,1.25]){box(g,2,.28,2,x,.14,z,'wood');box(g,1.8,.03,1.8,x,.3,z,'darkwood');for(let j=0;j<6;j++){const xx=x-.55+(j%2)*1.1,zz=z-.6+Math.floor(j/2)*.6;ell(g,xx,.5,zz,.33,.24,.3,j%2?'leaf':'leafLight');}}}
  if(id==='windmill'){cyl(g,1,1.55,5.6,0,2.8,0,'cream',12);cone(g,1.75,1.8,0,6.5,0,'terracotta',12);door(g,0,1.45,.03,.8,1.65);windowFront(g,0,3.4,1.16,.65,.9);const sails=new THREE.Group();sails.position.set(0,5.2,1.15);for(let i=0;i<4;i++){const s=new THREE.Group();s.rotation.z=i*Math.PI/2;box(s,.13,3,.12,0,1.5,0,'darkwood');box(s,.5,2.1,.07,.2,1.85,.07,'lightwood');for(let j=0;j<7;j++)box(s,.57,.05,.1,.2,.95+j*.28,.13,'white');sails.add(s);}cyl(sails,.22,.22,.4,0,0,0,'iron').rotation.x=Math.PI/2;g.add(sails);g.userData.rotor=sails;g.userData.animated=true;}
  if(id==='hay-bale'){for(const [x,y]of [[-.6,.5],[.6,.5],[0,1.3]]){const h=cyl(g,.5,.5,1.1,x,y,0,'yellow',16);h.rotation.x=Math.PI/2;for(const z of [-.35,.35]){const r=new THREE.Mesh(geo('hayring',()=>new THREE.TorusGeometry(.505,.018,5,20)),mat('wood'));r.position.set(x,y,z);g.add(r);}}}
  if(id==='sign'){box(g,.15,2.5,.15,0,1.25,0,'darkwood');box(g,1.6,.42,.15,.15,2.15,0,'lightwood');box(g,1.25,.38,.15,-.1,1.65,0,'wood');for(const y of [1.65,2.15])ell(g,0,y,.09,.025,.025,.025,'iron');}
  return g;
}

// Merge the static details into one geometry per material, dramatically reducing
// draw calls while retaining their real geometry and cast shadows.
function consolidate(group){group.updateMatrixWorld(true);const buckets=new Map();group.traverse(o=>{if(!o.isMesh)return;const source=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();source.applyMatrix4(o.matrixWorld);const key=o.material.uuid;let b=buckets.get(key);if(!b){b={material:o.material,positions:[],normals:[],uvs:[],count:0};buckets.set(key,b);}b.positions.push(source.attributes.position.array);b.normals.push(source.attributes.normal.array);b.uvs.push(source.attributes.uv?.array||new Float32Array(source.attributes.position.count*2));b.count+=source.attributes.position.count;source.dispose();});const result=new THREE.Group();result.userData={...group.userData};for(const b of buckets.values()){const ge=new THREE.BufferGeometry();for(const [name,arrays,size]of [['position',b.positions,3],['normal',b.normals,3],['uv',b.uvs,2]]){const data=new Float32Array(b.count*size);let offset=0;for(const a of arrays){data.set(a,offset);offset+=a.length;}ge.setAttribute(name,new THREE.BufferAttribute(data,size));}ge.userData.generated=true;ge.computeBoundingSphere();const m=new THREE.Mesh(ge,b.material);m.castShadow=true;m.receiveShadow=true;result.add(m);}return result;}

function consolidateAnimated(group){
  const moving=[...(group.userData.legs||[]),...(group.userData.arms||[]),...(group.userData.wings||[]),group.userData.tail,group.userData.rotor].filter(Boolean);
  group.updateMatrix();
  for(const part of moving){group.remove(part);part.applyMatrix4(group.matrix);}
  const result=consolidate(group);
  for(const part of moving)result.add(part);
  return result;
}

export function createModel(id,{preview=false}={}){
  const item=CATALOG.find(o=>o.id===id);if(!item)throw new Error(`Unknown Morrowfield asset: ${id}`);
  let g;if(worldFactories.has(id)&&['person','animal','bird','aquatic'].includes(item.kind)){g=consolidateAnimated(worldFactories.get(id)(id));}else if(item.kind==='person'){g=consolidateAnimated(person(id));}else if(['animal','bird','aquatic'].includes(item.kind)){g=consolidateAnimated(animal(id));}else if(id==='windmill'){g=consolidateAnimated(props(id));}else{
    if(!templates.has(id)){const raw=worldFactories.has(id)?worldFactories.get(id)(id):expandedBuildings.has(id)?expandedBuildings.get(id)(id):item.category==='Buildings'?architecture(id):item.category==='Plants'?plant(id):props(id);templates.set(id,consolidate(raw));}
    g=templates.get(id).clone(true);
  }
  g.name=id;g.userData.assetId=id;g.userData.radius=item.radius;g.userData.kind=item.kind;
  if(item.enclosure)g.userData.enclosure={...item.enclosure};
  if(preview)g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return g;
}
