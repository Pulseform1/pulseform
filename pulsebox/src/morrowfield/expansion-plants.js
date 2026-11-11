import {THREE,box,ell,petal,cyl,cone,beam} from './building-kit.js';

// Original botanical models. Species use different branching, leaf arrangements,
// growth habits and flowers; color is only one part of each configuration.
const specs=[
 ['sycamore','Spreading sycamore','tree',{h:9,r:3.6,n:7,leaf:0x77945d}],
 ['elm','Arching elm','tree',{h:10,r:3.2,n:8,arch:true,leaf:0x66865a}],
 ['beech','Copper beech','tree',{h:8.5,r:3.1,n:6,low:true,leaf:0x9a725d}],
 ['maple','Autumn maple','tree',{h:8,r:3.4,n:7,tiers:2,leaf:0xc08b4d}],
 ['willow','Weeping willow','tree',{h:8.5,r:3.8,n:8,droop:true,leaf:0x8ba665}],
 ['poplar','Lombardy poplar','tree',{h:12,r:1.5,n:7,column:true,leaf:0x7c9d62}],
 ['aspen','Quaking aspen','tree',{h:9.5,r:2.2,n:5,column:true,pale:true,leaf:0x9db779}],
 ['cypress','Mediterranean cypress','conifer',{h:11,r:1.1,tiers:5,thin:true}],
 ['cedar','Blue cedar','conifer',{h:8.5,r:3.2,tiers:4,flat:true,tone:0x668b83}],
 ['spruce','Silver spruce','conifer',{h:9,r:2.6,tiers:6,tone:0x739d8b}],
 ['fir','Mountain fir','conifer',{h:10.5,r:2.8,tiers:5,tone:0x547763}],
 ['redwood','Young redwood','conifer',{h:15,r:3,tiers:7,tone:0x4c765e}],
 ['juniper','Twisted juniper','tree',{h:4.5,r:2.6,n:5,bent:true,leaf:0x668478}],
 ['olive','Old olive tree','tree',{h:5.8,r:3,n:6,bent:true,fruit:0x555b35,leaf:0x8e9f77}],
 ['orange','Orange orchard tree','tree',{h:5.1,r:2.25,n:5,fruit:0xe2a24e,leaf:0x688753}],
 ['lemon','Espalier lemon','tree',{h:4.4,r:2.6,n:6,espalier:true,fruit:0xe5cd66,leaf:0x7b9858}],
 ['magnolia','Blooming magnolia','tree',{h:6.4,r:2.9,n:6,bloom:0xf2dacb,leaf:0x8d9973}],
 ['jacaranda','Lilac jacaranda','tree',{h:7.2,r:3.4,n:8,bloom:0xa899be,leaf:0x9887ac}],
 ['baobab','Bottle-trunk baobab','tree',{h:9,r:3.5,n:6,bottle:true,leaf:0x829467}],
 ['bamboo','Golden bamboo stand','bamboo',{h:6.5,r:1.3,n:7}],
 ['boxwood-round','Rounded boxwood','shrub',{h:1.8,r:1.3,n:3}],
 ['boxwood-spiral','Spiral topiary','topiary',{h:3.7,r:.85,n:9}],
 ['lavender','Lavender mound','herb',{h:1.15,r:1.3,n:17,flower:0xa798be}],
 ['mint','Wild mint','herb',{h:.85,r:1,n:13,broad:true}],
 ['rosemary','Rosemary shrub','herb',{h:1.35,r:1.15,n:19,needle:true}],
 ['hydrangea','Hydrangea bush','shrub',{h:1.8,r:1.55,n:6,bloom:0xb3a1c6}],
 ['azalea','Coral azalea','shrub',{h:1.3,r:1.55,n:8,bloom:0xd89486}],
 ['heather','Heather cushion','herb',{h:.75,r:1.4,n:21,flower:0xb08b9e}],
 ['fern','Unfurling fern','fern',{h:1.65,r:1.4,n:9}],
 ['agave','Blue agave','rosette',{h:1.7,r:1.65,n:11,tone:0x83a2a0}],
 ['sunflower','Sunflower trio','flowers',{h:2.4,r:1.2,n:3,style:'sun',tone:0xe2bd63}],
 ['tulip','Spring tulip bed','flowers',{h:.9,r:1.2,n:9,style:'cup',tone:0xd99c8e}],
 ['daisy','Oxeye daisies','flowers',{h:.7,r:1.2,n:11,style:'daisy',tone:0xf0e6cf}],
 ['poppy','Field poppies','flowers',{h:1.05,r:1.4,n:9,style:'poppy',tone:0xc97964}],
 ['bluebell','Woodland bluebells','flowers',{h:.8,r:1.1,n:8,style:'bells',tone:0x899dbb}],
 ['iris','Waterside irises','flowers',{h:1.35,r:1.25,n:5,style:'iris',tone:0x9e96b8,water:true}],
 ['lupine','Mountain lupines','flowers',{h:1.5,r:1.2,n:7,style:'spike',tone:0xae91b1}],
 ['lotus','Pink lotus','waterflower',{h:.75,r:1.25,n:1,tone:0xe2b2ae,water:true}],
 ['waterlily','White water lily','waterflower',{h:.38,r:1.5,n:3,tone:0xd9d0bc,center:0xb58d45,water:true}],
 ['bird-of-paradise','Bird-of-paradise flower','flowers',{h:2.1,r:1.4,n:3,style:'bird',tone:0xe2a356}],
 ['moss-bed','Velvet moss stones','ground',{h:.45,r:1.8,n:8,style:'moss'}],
 ['clover-patch','Clover patch','ground',{h:.35,r:1.6,n:15,style:'clover'}],
 ['fern-carpet','Woodland fern carpet','ground',{h:.85,r:2,n:5,style:'fern'}],
 ['lavender-row','Lavender border','ground',{h:.95,r:2.1,n:9,style:'lavender'}],
 ['marsh-grass','Tall marsh grass','grass',{h:2.5,r:1.7,n:18,seed:true,water:true}],
 ['sedge','Golden sedge','grass',{h:1.1,r:1.5,n:20,tone:0xb0b577,water:true}],
 ['rushes','Spiral rushes','grass',{h:1.7,r:1.25,n:15,curve:true,water:true}],
 ['lotus-cluster','Lotus colony','waterflower',{h:.85,r:2.2,n:7,tone:0xd9a3a0,water:true}],
 ['bamboo-grove','Dwarf bamboo grove','bamboo',{h:3.6,r:2,n:12}],
 ['fallen-log','Mossy fallen log','log',{h:1.2,r:2.5}],
 ['barrel-cactus','Golden barrel cactus','cactus',{h:1.55,r:1.1,style:'barrel',n:1}],
 ['prickly-pear','Prickly pear','cactus',{h:2.8,r:1.55,style:'pads',n:7}],
 ['organ-pipe','Organ-pipe cactus','cactus',{h:4.2,r:1.5,style:'pipes',n:7}],
 ['ocotillo','Flowering ocotillo','cactus',{h:3.4,r:1.6,style:'ocotillo',n:9}],
 ['aloe','Aloe clump','rosette',{h:1.2,r:1.4,n:9,spike:true,tone:0x8ca77a}],
 ['yucca','Desert yucca','rosette',{h:3.6,r:1.65,n:13,trunk:true,tone:0x99a37b}],
 ['red-coral','Branching red coral','coral',{h:2,r:1.4,n:7,tone:0xc3836e,water:true}],
 ['fan-coral','Sea-fan coral','coral',{h:2.1,r:1.8,n:13,fan:true,tone:0xc5a276,water:true}],
 ['kelp','Sea kelp cluster','kelp',{h:3.8,r:1.5,n:7,water:true}],
 ['mangrove','Stilt-root mangrove','mangrove',{h:6,r:2.8,n:7,water:true}],
];
const golden=2.3999632297;
function at(i,n,r){const a=i*golden;return [Math.cos(a)*r*Math.sqrt((i+.5)/n),Math.sin(a)*r*Math.sqrt((i+.5)/n)];}
function leaf(g,x,y,z,s=.4,tone='leaf',angle=0){const m=petal(g,x,y,z,s,.12*s,s*.38,tone);m.rotation.set(.2,angle,.2);return m;}
function flower(g,x,y,z,r,tone,style='daisy'){
 const petals=style==='poppy'?4:style==='cup'?5:style==='iris'?3:7;
 for(let i=0;i<petals;i++){const a=i*Math.PI*2/petals,m=petal(g,x+Math.cos(a)*r*.6,y+(style==='cup'?.09:0),z+Math.sin(a)*r*.6,r*.56,style==='cup'?r*.7:r*.2,r*.3,tone);m.rotation.y=-a;}
 ell(g,x,y+.03,z,r*.24,r*.15,r*.24,style==='sun'?'darkwood':'yellow');
}
function fern(g,c,ox=0,oz=0){for(let i=0;i<c.n;i++){const a=i*Math.PI*2/c.n,reach=c.r*(.75+(i%3)*.1),end=[ox+Math.cos(a)*reach,c.h*.6,oz+Math.sin(a)*reach];beam(g,[ox,.06,oz],[ox+Math.cos(a)*reach*.55,c.h,oz+Math.sin(a)*reach*.55],.025,'leafDark');beam(g,[ox+Math.cos(a)*reach*.55,c.h,oz+Math.sin(a)*reach*.55],end,.025,'leafDark');for(let j=1;j<=4;j++){const t=j/5,x=ox+Math.cos(a)*reach*t,z=oz+Math.sin(a)*reach*t,y=Math.sin(t*Math.PI)*c.h*.85;for(const side of [-1,1])leaf(g,x+Math.cos(a+side*1.2)*.16,y,z+Math.sin(a+side*1.2)*.16,.36*(1-t*.45),'leaf',-a+side*.55);}}}
function tree(g,c){
 const trunk=c.bottle?c.h*.18:c.h*.035,bend=c.bent?.55:0;
 cyl(g,trunk*.55,trunk,c.h*.63,0,c.h*.315,0,c.pale?'cream':'bark',10);
 if(c.bottle)ell(g,0,c.h*.35,0,trunk,c.h*.32,trunk,'bark');
 for(let i=0;i<c.n;i++){
  const a=i*golden,y=c.column?c.h*(.35+i/c.n*.55):c.h*(.54+(i%3)*.11),r=c.column?c.r*.35:c.r*.63;
  let x=Math.cos(a)*r+bend,z=Math.sin(a)*r;if(c.espalier){x=(i-(c.n-1)/2)*c.r*.38;z=0;}
  beam(g,[0,c.h*.3,0],[x,y,z],trunk*.38,'bark');
  const sx=c.column?c.r*.68:c.r*.52,sy=c.column?c.h*.17:c.r*(c.arch?.45:.52),sz=c.espalier?.55:sx;
  ell(g,x,y+c.r*.22,z,sx,sy,sz,c.leaf);
  if(c.droop)for(let k=0;k<3;k++){const aa=a+k*.8,xx=x+Math.cos(aa)*sx*.6,zz=z+Math.sin(aa)*sx*.6;ell(g,xx,y-.8,zz,.3,1.35,.3,c.leaf);}
  if(c.fruit)for(let k=0;k<3;k++)ell(g,x+Math.cos(k*2.1)*sx*.6,y+.1,z+Math.sin(k*2.1)*sz*.7,.14,.15,.14,c.fruit);
  if(c.bloom)for(let k=0;k<3;k++)flower(g,x+Math.cos(k*2.1)*sx*.6,y+sy*.55,z+Math.sin(k*2.1)*sz*.6,.22,c.bloom);
 }
 if(c.pale)for(let y=.7;y<c.h*.55;y+=.65)box(g,trunk*1.5,.06,.035,.02,y,trunk*.67,'darkwood');
 if(c.espalier){for(const x of [-c.r*.95,c.r*.95])box(g,.09,c.h,.09,x,c.h/2,.35,'wood');for(const y of [1.4,2.8,4])box(g,c.r*2,.06,.06,0,y,.35,'wood');}
}
function conifer(g,c){cyl(g,c.h*.013,c.h*.035,c.h*.84,0,c.h*.42,0,'bark',9);for(let i=0;i<c.tiers;i++){const t=i/(c.tiers-1),r=c.r*(1-t*.76),h=c.flat?c.h*.13:c.h*.36,y=c.h*(.23+t*.61);cone(g,r,h,0,y+h/2,0,c.tone||'leafDark',c.thin?10:9);if(c.flat)for(let k=0;k<5;k++){const a=k*1.257;beam(g,[0,y,0],[Math.cos(a)*r*.85,y-.12,Math.sin(a)*r*.85],.06,'wood');}}}
function bamboo(g,c){for(let i=0;i<c.n;i++){const [x,z]=at(i,c.n,c.r*.75),h=c.h*(.65+(i%4)*.1);cyl(g,.065,.09,h,x,h/2,z,'leaf',8);for(let y=.5;y<h;y+=.6)cyl(g,.087,.087,.065,x,y,z,'yellow',8);for(let k=0;k<3;k++){const a=i+k*2.1,y=h*(.55+k*.17);beam(g,[x,y,z],[x+Math.cos(a)*.65,y+.25,z+Math.sin(a)*.65],.025,'leafDark');leaf(g,x+Math.cos(a)*.55,y+.28,z+Math.sin(a)*.55,.6,'leafLight',-a);}}}
function shrub(g,c){for(let i=0;i<c.n;i++){const [x,z]=at(i,c.n,c.r*.55),s=c.r*(.45+(i%2)*.1);ell(g,x,c.h*.48,z,s,c.h*.47,s,i%2?'leaf':'leafDark');if(c.bloom)for(let j=0;j<3;j++){const a=j*2.1;ell(g,x+Math.cos(a)*s*.6,c.h*.8,z+Math.sin(a)*s*.6,.28,.25,.28,c.bloom);}}}
function herb(g,c){for(let i=0;i<c.n;i++){const [x,z]=at(i,c.n,c.r*.75),h=c.h*(.6+(i%4)*.1);beam(g,[x,.04,z],[x*.9,h,z*.9],.018,'leafDark');if(c.flower)ell(g,x*.9,h,z*.9,.1,.22,.1,c.flower);for(let k=1;k<=2;k++)leaf(g,x+(k%2?.12:-.12),h*k/3,z,.22,c.needle?'leafDark':'leaf',i);}}
function rosette(g,c){const base=c.trunk?c.h*.62:0;if(c.trunk)cyl(g,.23,.4,base,0,base/2,0,'bark',10);for(let i=0;i<c.n;i++){const a=i*Math.PI*2/c.n,tip=[Math.cos(a)*c.r,base+c.h*(c.trunk?.22:.5)+.13*(i%3),Math.sin(a)*c.r];const p=leaf(g,tip[0]*.48,base+(tip[1]-base)*.55+(c.trunk?0:.45),tip[2]*.48,c.r*.7,c.tone,-a);p.rotation.z=.45;beam(g,[0,base+.1,0],tip,.025,c.tone);}if(c.spike){beam(g,[0,.1,0],[0,c.h*1.5,0],.04,'leafDark');for(let i=0;i<4;i++)ell(g,.1*Math.sin(i),c.h*1.05+i*.12,0,.13,.1,.13,'terracotta');}}
function flowers(g,c){for(let i=0;i<c.n;i++){const [x,z]=at(i,c.n,c.r*.72),h=c.h*(.65+(i%4)*.1);beam(g,[x,.02,z],[x,h,z],.022,'leafDark');leaf(g,x+.16,h*.35+.08,z,.37,'leaf',i);leaf(g,x-.15,h*.6+.08,z,.3,'leafLight',-i);
 if(c.style==='spike'||c.style==='bells'){for(let k=0;k<5;k++){const a=k*golden;ell(g,x+Math.cos(a)*.09,h-.35+k*.09,z+Math.sin(a)*.09,.1,c.style==='bells'?.11:.075,.1,c.tone);}}
 else if(c.style==='bird'){beam(g,[x,h,z],[x+.38,h+.2,z],.07,'leafDark');for(let k=0;k<3;k++){const p=petal(g,x+.1+k*.1,h+.23+k*.08,z,.1,.3,.07,c.tone);p.rotation.z=-.6;}leaf(g,x-.2,h*.45,z,.7,'leafDark',i);}
 else flower(g,x,h,z,c.style==='sun'?.38:c.style==='iris'?.3:.22,c.tone,c.style);
 }}
function waterflower(g,c){for(let i=0;i<c.n;i++){const [x,z]=at(i,c.n,c.r*.65);ell(g,x,.08,z,.52,.045,.42,'leaf');if(i%2===0||c.n===1){beam(g,[x,.07,z],[x,c.h*.65,z],.025,'leafDark');flower(g,x,c.h*.65,z,.36,c.tone,'cup');if(c.center)ell(g,x,c.h*.65+.3,z,.11,.08,.11,c.center);}}}
function ground(g,c){for(let i=0;i<c.n;i++){let [x,z]=at(i,c.n,c.r*.8);if(c.style==='lavender'){const sub=new THREE.Group();sub.position.x=(i-(c.n-1)/2)*.4;g.add(sub);herb(sub,{h:c.h,r:.28,n:3,flower:0xa798be});continue;}if(c.style==='moss'){ell(g,x,.18,z,.55,.18,.48,'stone');ell(g,x,.28,z,.52,.14,.45,i%2?'leaf':'leafLight');}else if(c.style==='fern')fern(g,{h:c.h,r:.65,n:4},x,z);else for(let j=0;j<3;j++){const a=j*2.1;petal(g,x+Math.cos(a)*.12,.14+(i%3)*.025,z+Math.sin(a)*.12,.16,.035,.12,'leaf');}}}
function grass(g,c){for(let i=0;i<c.n;i++){const [x,z]=at(i,c.n,c.r*.55),h=c.h*(.55+(i%5)*.09),lean=.3*Math.sin(i);beam(g,[x,.02,z],[x+lean*.45,h*.6,z],.025,c.tone||'leaf');beam(g,[x+lean*.45,h*.6,z],[x+lean,h,z+.15],.018,c.tone||'leafLight');if(c.seed)ell(g,x+lean,h+.08,z+.15,.07,.22,.07,'sand');if(c.curve)leaf(g,x+lean,h*.7,z,.22,'leaf',i);}}
function cactus(g,c){if(c.style==='barrel'){ell(g,0,c.h*.49,0,c.r*.75,c.h*.49,c.r*.75,'leaf');for(let i=0;i<12;i++){const a=i*Math.PI/6;beam(g,[Math.cos(a)*c.r*.65,.3,Math.sin(a)*c.r*.65],[Math.cos(a)*c.r*.65,c.h*.75,Math.sin(a)*c.r*.65],.025,'yellow');}flower(g,0,c.h*.98,0,.25,'flower');}
 else if(c.style==='pads'){for(let i=0;i<c.n;i++){const x=(i%3-1)*.65,y=.65+Math.floor(i/3)*.75,z=.2*Math.sin(i);ell(g,x,y,z,.43,.64,.16,'leaf');for(let k=0;k<3;k++)ell(g,x-.2+k*.2,y,.17+z,.018,.035,.018,'cream');if(i>3)ell(g,x,y+.57,z,.11,.16,.11,'flower');}}
 else if(c.style==='pipes'){for(let i=0;i<c.n;i++){const [x,z]=at(i,c.n,c.r*.65),h=c.h*(.45+(i%4)*.15);cyl(g,.19,.24,h,x,h/2,z,'leaf',10);ell(g,x,h,z,.19,.19,.19,'leaf');for(const a of [0,2.1,4.2])beam(g,[x+Math.cos(a)*.21,.2,z+Math.sin(a)*.21],[x+Math.cos(a)*.18,h-.1,z+Math.sin(a)*.18],.015,'leafLight');}}
 else for(let i=0;i<c.n;i++){const a=i*golden,x=Math.cos(a)*c.r*.65,z=Math.sin(a)*c.r*.65,h=c.h*(.7+(i%3)*.1);beam(g,[0,.06,0],[x,h,z],.045,'wood');for(let k=1;k<5;k++)leaf(g,x*k/5,h*k/5,z*k/5,.13,'leaf',a);ell(g,x,h,z,.09,.25,.09,'terracotta');}}
function coral(g,c){for(let i=0;i<c.n;i++){const a=c.fan?Math.PI*(i/(c.n-1)-.5):i*golden,x=Math.sin(a)*c.r*.8,z=c.fan?0:Math.cos(a)*c.r*.55,h=c.h*(c.fan?Math.cos(a)*.65+.3:.6+(i%3)*.13);beam(g,[0,.07,0],[x,h,z],.055,c.tone);for(const side of [-1,1]){const tip=[x+side*.22,h+.25,z+(c.fan?0:side*.15)];beam(g,[x*.65,h*.65,z*.65],tip,.04,c.tone);ell(g,...tip,.06,.08,.06,c.tone);}}}
function kelp(g,c){for(let i=0;i<c.n;i++){const [x,z]=at(i,c.n,c.r*.5),h=c.h*(.55+(i%4)*.14);for(let k=0;k<5;k++){const t=k/5,a=[x+.25*Math.sin(k),h*t+.03,z],b=[x+.25*Math.sin(k+1),h*(t+.2)+.03,z];beam(g,a,b,.025,'leafDark');leaf(g,b[0]+(k%2?.2:-.2),b[1],b[2],.5,k%2?'leaf':'leafLight',i);}}}
function mangrove(g,c){for(let i=0;i<c.n;i++){const a=i*golden;beam(g,[Math.cos(a)*c.r*.7,.12,Math.sin(a)*c.r*.7],[0,2.3,0],.09,'bark');}tree(g,{h:c.h,r:c.r,n:5,leaf:0x608773});}
function make(spec){const [id,,family,c]=spec,g=new THREE.Group();g.name=`flora-${id}`;
 const factories={tree,conifer,bamboo,shrub,herb,rosette,flowers,waterflower,ground,grass,cactus,coral,kelp,mangrove,fern};
 if(factories[family])factories[family](g,c);
 else if(family==='topiary'){cyl(g,.12,.2,c.h,0,c.h/2,0,'wood',8);for(let i=0;i<c.n;i++){const a=i*1.1,r=c.r*(1-i/c.n*.6);ell(g,Math.cos(a)*r*.4,.4+i*c.h/c.n,Math.sin(a)*r*.4,r*.7,.3,r*.7,'leafDark');}}
 else if(family==='log'){const log=cyl(g,.4,.52,4.3,0,.55,0,'bark',12);log.rotation.z=Math.PI/2;for(const x of [-2.16,2.16]){const end=cyl(g,.37,.37,.025,x,.55,0,'lightwood',12);end.rotation.z=Math.PI/2;}for(let i=0;i<5;i++)ell(g,-1.5+i*.7,.91,.08,.45,.16,.3,'leaf');beam(g,[.4,.6,0],[.9,1.2,.5],.12,'bark');}
 return g;
}
const byId=new Map(specs.map(s=>[`flora-${s[0]}`,s]));
export const PLANT_EXPANSION=specs.map(([id,name,family,c])=>({id:`flora-${id}`,name,category:'Plants',kind:'plant',tags:`plant botanical nature ${family} ${id.replaceAll('-',' ')}`,description:`${name}, with individually modeled ${['tree','conifer','mangrove'].includes(family)?'branches and foliage':family==='waterflower'?'floating leaves and blossoms':family==='cactus'?'stems and surface details':'stems, leaves and natural forms'}.`,radius:c.r*1.65,height:c.h*1.65+1,footprint:{halfX:c.r*1.65,halfZ:c.r*1.65},collection:'world-expansion',obstacle:['tree','conifer','mangrove','log'].includes(family),passable:['ground','grass','waterflower','flowers','herb'].includes(family),...(c.water?{waterFriendly:true}:{} ),...(family==='waterflower'?{waterSurface:true}:{} )}));
export function createExpandedPlant(id){const spec=byId.get(id);return spec?make(spec):null;}
