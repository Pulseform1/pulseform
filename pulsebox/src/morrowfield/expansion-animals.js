import {THREE,mat,mesh,ell,cyl,cone,beam,tube} from './building-kit.js';

// Original stylized wildlife. Species vary in anatomy as well as markings.
const profiles=[
 ['red-panda','Red panda','small',1.1,2.1,1.1,0xa96642,{tail:'rings',ears:'round',mask:true,leg:.36,body:.53}],
 ['raccoon','Raccoon','small',1,1.8,.95,0x928e7c,{tail:'rings',ears:'round',mask:true,leg:.29,body:.49}],
 ['badger','European badger','small',1.15,1.7,.85,0x777e78,{tail:'short',stripe:true,head:.43,leg:.22,body:.55}],
 ['otter','River otter','small',.8,2.25,.75,0x80664c,{tail:'taper',ears:'small',leg:.2,body:.34,long:true}],
 ['beaver','North American beaver','small',1.1,1.9,.95,0x826344,{tail:'paddle',ears:'round',teeth:true,leg:.2,body:.58}],
 ['capybara','Capybara','small',1.4,2.1,1.2,0x9b815b,{tail:'none',ears:'small',head:.47,leg:.31,body:.64}],
 ['guinea-pig','Guinea pig','small',.65,.85,.55,0xad8662,{tail:'none',ears:'round',patch:true,leg:.13,body:.56}],
 ['hedgehog','Woodland hedgehog','small',.7,.9,.55,0xa28b68,{tail:'none',spines:true,leg:.12,body:.5}],
 ['porcupine','Crested porcupine','small',1.1,1.7,1.05,0x8c7a62,{tail:'short',spines:true,crest:true,leg:.21,body:.6}],
 ['squirrel','Red squirrel','small',.6,1.2,.95,0xb67847,{tail:'curl',ears:'tuft',leg:.25,body:.35}],
 ['chipmunk','Eastern chipmunk','small',.5,.85,.6,0xb79b6d,{tail:'curl',stripe:true,ears:'small',leg:.18,body:.34}],
 ['prairie-dog','Prairie dog','upright',.65,.9,1.1,0xb6a078,{ears:'small',tail:'short',body:.43}],
 ['marmot','Alpine marmot','small',.95,1.4,.95,0x9a8d74,{tail:'thick',ears:'small',body:.63,leg:.22}],
 ['wombat','Common wombat','small',1.4,1.9,1.25,0x969182,{tail:'none',ears:'round',body:.69,head:.46,leg:.25}],
 ['koala','Koala','upright',1.1,.95,1.3,0x9aaba4,{ears:'large-round',nose:true,tail:'none',body:.59}],
 ['kangaroo','Red kangaroo','hopper',1.35,3.1,2.8,0xb88e61,{ears:'long',tail:'taper',body:.53}],
 ['wallaby','Swamp wallaby','hopper',.95,2.05,1.65,0x827b61,{ears:'long',tail:'taper',body:.57}],
 ['lemur','Ring-tailed lemur','primate',.8,2.6,1.4,0xa6aaa0,{tail:'rings-high',mask:true,ears:'round',leg:.65}],
 ['chimpanzee','Chimpanzee','primate',1.35,1.6,1.85,0x4d5750,{tail:'none',arms:true,face:0xba987c,body:.55}],
 ['gorilla','Western gorilla','primate',2.1,1.7,2.4,0x545d57,{tail:'none',arms:true,face:0x64706a,body:.79,crest:true}],
 ['orangutan','Orangutan','primate',1.9,1.6,2.3,0xa8663e,{tail:'none',arms:true,face:0x907459,body:.65,longArms:true}],
 ['mandrill','Mandrill','primate',1.25,1.6,1.55,0x6c7966,{tail:'short',arms:true,face:0xa4b4ae,mandrill:true,body:.61}],
 ['meerkat','Meerkat','upright',.55,.8,1.35,0xb8a27b,{tail:'taper',mask:true,ears:'small',body:.34}],
 ['honey-badger','Honey badger','small',1,1.7,.75,0x535d57,{tail:'thick',saddle:true,leg:.21,body:.48}],
 ['polar-bear','Polar bear','bear',2.3,3.3,2.2,0xe3e2cd,{ears:'small',head:.38,body:.78,leg:.58,long:true}],
 ['brown-bear','Brown bear','bear',2.25,3,2.3,0x856b4b,{ears:'round',body:.84,leg:.55,hump:1}],
 ['giant-panda','Giant panda','bear',2.1,2.7,2,0xe3e1cc,{ears:'round',panda:true,body:.85,leg:.46}],
 ['sun-bear','Sun bear','bear',1.45,2.15,1.65,0x514f42,{ears:'small',chest:true,body:.68,leg:.49}],
 ['lion','African lion','cat',1.75,3.8,2,0xc5a063,{mane:true,tail:'tuft',ears:'round',body:.57,leg:.67}],
 ['tiger','Bengal tiger','cat',1.65,4.1,1.8,0xc48b4e,{stripes:true,tail:'taper',ears:'round',body:.61,leg:.57}],
 ['snow-leopard','Snow leopard','cat',1.35,3.4,1.35,0xc6c6b4,{spots:true,tail:'thick',ears:'small',body:.48,leg:.5}],
 ['cheetah','Cheetah','cat',1.15,3.5,1.65,0xc8b175,{spots:true,mask:true,tail:'taper',ears:'small',body:.41,leg:.79}],
 ['lynx','Eurasian lynx','cat',1.05,1.9,1.55,0xb8a381,{spots:true,tail:'short',ears:'tuft',body:.49,leg:.7}],
 ['caracal','Caracal','cat',1,2.25,1.45,0xbb9468,{tail:'taper',ears:'tuft',body:.43,leg:.67}],
 ['wolf','Gray wolf','canid',1.25,3.1,1.75,0x8c978d,{tail:'thick',ears:'point',body:.51,leg:.68}],
 ['coyote','Coyote','canid',1.05,2.6,1.45,0xb0a384,{tail:'thick',ears:'large-point',body:.43,leg:.63}],
 ['wild-dog','African painted dog','canid',1.1,2.6,1.6,0xb79b6a,{tail:'taper',ears:'large-round',patch:true,body:.44,leg:.75}],
 ['fennec','Fennec fox','canid',.7,1.6,1.05,0xd5c59b,{tail:'thick',ears:'huge',body:.36,leg:.4}],
 ['arctic-fox','Arctic fox','canid',1,2,.95,0xe4e6d6,{tail:'thick',ears:'small',body:.55,leg:.3}],
 ['hyena','Spotted hyena','canid',1.35,2.8,1.75,0xb2a17b,{spots:true,tail:'short',ears:'round',body:.64,leg:.63,hump:1}],
 ['bison','American bison','bovine',2.4,3.6,2.6,0x816648,{horn:'short',hump:1,beard:true,body:.9,leg:.54}],
 ['water-buffalo','Water buffalo','bovine',2.6,3.7,2.3,0x75817b,{horn:'wide',body:.81,leg:.6}],
 ['yak','Domestic yak','bovine',2.3,3.3,2.3,0x6a6754,{horn:'up',shaggy:true,body:.85,leg:.42}],
 ['musk-ox','Musk ox','bovine',2.2,2.9,2,0x7a6b53,{horn:'down',shaggy:true,body:.88,leg:.36}],
 ['highland-cow','Highland cow','bovine',2.6,3.3,2.3,0xb28251,{horn:'wide',shaggy:true,fringe:true,body:.78,leg:.5}],
 ['goat','Alpine goat','hoof',1.05,2.1,1.6,0xc0b9a0,{horn:'back',beard:true,body:.49,leg:.7}],
 ['ibex','Alpine ibex','hoof',1.3,2.6,2.4,0xb39b76,{horn:'ibex',beard:true,body:.55,leg:.72}],
 ['bighorn','Bighorn sheep','hoof',1.45,2.5,1.9,0xa89778,{horn:'curl',body:.63,leg:.6}],
 ['alpaca','Alpaca','longneck',1.15,2.1,2.5,0xdfd6ba,{ears:'long',wool:true,body:.57,neck:1.05,leg:.68}],
 ['dromedary','Dromedary camel','longneck',1.9,3.8,3.4,0xc4a777,{hump:1,neck:1,body:.62,leg:.98}],
 ['bactrian','Bactrian camel','longneck',2.15,4.1,3.5,0xb19a70,{hump:2,neck:.95,shaggy:true,body:.69,leg:.85}],
 ['moose','Moose','hoof',2.4,3.7,3.2,0x8b7759,{horn:'palm',beard:true,neck:.5,head:.49,body:.64,leg:1.05,tail:'short'}],
 ['reindeer','Reindeer','hoof',1.85,3,2.65,0xa49d83,{horn:'antlers',neck:.4,body:.59,leg:.86}],
 ['pronghorn','Pronghorn','hoof',1.1,2.25,1.95,0xc3a579,{horn:'fork',bib:true,body:.43,leg:.9}],
 ['okapi','Okapi','longneck',1.4,2.9,2.55,0x876c55,{stripedLegs:true,ears:'large-point',neck:.65,body:.54,leg:.91}],
 ['rhinoceros','White rhinoceros','heavy',2.6,4.2,2.25,0xa1aaa0,{rhino:true,ears:'point',body:.95,leg:.38}],
 ['hippopotamus','Hippopotamus','heavy',2.8,4,2.05,0xa6a59b,{hippo:true,ears:'small',body:.98,head:.64,leg:.28}],
 ['crocodile','Nile crocodile','reptile',1.65,4.6,.9,0x829375,{croc:true,body:.44,leg:.18}],
 ['iguana','Green iguana','reptile',1,2.8,.85,0x78a07b,{crest:true,body:.29,leg:.2}],
 ['dart-frog','Golden dart frog','frog',.65,.8,.55,0xd5bc61,{spots:true,body:.4}]
];

export const ANIMAL_EXPANSION=profiles.map(([slug,name,family,w,d,h,color,features])=>({id:'fauna-'+slug,name,category:'Animals',kind:'animal',tags:`animal wildlife ${family} ${name.toLowerCase()} ${['hoof','bovine','longneck'].includes(family)?'herbivore grazing zoo':'zoo habitat'}`,description:`${name}: ${describe(family,features)} Original miniature wildlife.`,radius:Math.hypot(w/2,d/2)+.03,height:h+.03,speed:family==='reptile'?.38:family==='heavy'?.42:family==='hopper'?1.1:.65,habitat:family==='heavy'||family==='bovine'?'savanna':family==='reptile'||family==='frog'?'waterside':'woodland',waterFriendly:['otter','beaver','capybara','water-buffalo','hippopotamus','crocodile','dart-frog'].includes(slug),space:Math.ceil(w*d*14),collection:'world-expansion'}));
function describe(f,p){return p.horn?`a ${p.shaggy?'shaggy':'sure-footed'} silhouette with ${p.horn==='antlers'?'branching antlers':p.horn==='palm'?'broad palmate antlers':'sculpted horns'}`:p.mane?'a full mane, strong shoulders and a tufted tail':p.rhino?'a broad armored body and two tapered nose horns':p.hippo?'a barrel-shaped body, wide muzzle and tiny high-set ears':p.spines?'a low rounded body with a distinct coat of quills':f==='frog'?'splayed toes, folded hind legs and bright raised eyes':f==='hopper'?'powerful hindquarters, long feet and a balancing tail':p.neck?'a long arched neck and carefully shaped head':p.tail==='paddle'?'a broad paddle tail, rounded ears and small incisors':p.tail?.includes('rings')?'a long banded tail, expressive face and soft fur':p.ears==='huge'?'oversized desert ears and a sweeping brush tail':`${p.spots?'spotted':p.stripes?'striped':p.shaggy?'shaggy':'rounded'} body forms with species-specific ears, muzzle and proportions`;}

export function creature(id){const g=new THREE.Group();g.name=id;g.userData={animated:true,species:id,legs:[],wings:[],arms:[]};return g;}
export function eye(g,x,y,z,r=.035){ell(g,x,y,z,r,r,r,0x344b46);}
export function fitCreature(g,w,d,h,{ground=true}={}){
  g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(g),s=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3()),scale=Math.min(w/s.x,d/s.z,h/s.y),shift=new THREE.Vector3(-c.x*scale,(ground?-b.min.y:-c.y)*scale,-c.z*scale);
  for(const child of g.children){child.position.multiplyScalar(scale).add(shift);child.scale.multiplyScalar(scale);}return g;
}
export function leg(g,x,y,z,length,r,color,footColor=color){const p=new THREE.Group();p.name='leg-'+g.userData.legs.length;p.position.set(x,y,z);cyl(p,r,r*.84,length,0,-length/2,0,color,8);ell(p,0,-length+.035,.055,r*1.32,.085,r*1.6,footColor);g.add(p);g.userData.legs.push(p);return p;}
function ear(g,x,y,z,type,color){const round=['round','large-round','small'].includes(type),large=type==='huge'?2.5:type?.startsWith('large')?1.5:1;const size=type==='small'?.64:large;const e=ell(g,x,y,z,(round?.13:.075)*size,(round?.14:type==='long'?.28:.23)*size,.075*size,color);e.rotation.z=x<0?.25:-.25;if(type==='tuft')cone(g,.045,.24,x,y+.27,z,0x46534b,6);if(round&&size>1)ell(g,x,y,z+.065*size,.085*size,.095*size,.018,0xc5aa94);}
function tail(g,style,color,bodyY,bodyZ){if(style==='none')return;const p=new THREE.Group();p.position.set(0,bodyY,-bodyZ);let end;
  if(style==='short'){ell(p,0,-.04,-.15,.075,.09,.2,color);}
  else if(style==='paddle'){ell(p,0,-.19,-.45,.26,.07,.6,0x6b6753);for(let i=0;i<5;i++)beam(p,[-.2,-.12,-.15-i*.16],[.2,-.12,-.15-i*.16],.01,'wood');}
  else if(style==='curl'){tube(p,[[0,0,0],[.08,.2,-.45],[.1,.8,-.6],[.08,1.13,-.27]],.18,color);}
  else{const high=style==='rings-high',thick=style==='thick'||style==='rings';const points=[[0,0,0],[.08,high?.3:-.12,-.4],[.13,high?.8:-.14,-.9],[.18,high?1.2:-.02,-1.22]];tube(p,points,thick?.13:.065,color);end=points.at(-1);if(style==='tuft')ell(p,...end,.13,.15,.19,0x65533c);if(style?.startsWith('rings'))for(let i=0;i<7;i++){const t=(i+.5)/7;ell(p,.18*t,high?1.2*t:-.1,-1.22*t,.14,.12,.13,i%2?0xe0d7bd:0x51584c);}}
  g.add(p);g.userData.tail=p;
}
function hornPair(g,type,y,z){for(const side of [-1,1]){
  const x=side*.22;
  if(type==='curl'){const points=[];for(let i=0;i<16;i++){const a=i/15*Math.PI*1.8;points.push([side*(.26+Math.sin(a)*.25),y+.2+Math.cos(a)*.28,z-Math.sin(a)*.18]);}tube(g,points,.065,'sand');}
  else if(type==='wide'||type==='down'||type==='up'){tube(g,[[x,y,z],[side*.48,y+(type==='down'?-.12:.06),z],[side*.82,y+(type==='up'?.6:.25),z-.12],[side*.94,y+.48,z-.25]],.065,'cream');}
  else if(type==='palm'){beam(g,[x,y,z],[side*.58,y+.45,z-.05],.07,'wood');ell(g,side*.7,y+.5,z-.06,.3,.16,.07,'lightwood');for(let i=0;i<5;i++)beam(g,[side*(.45+i*.11),y+.5,z-.06],[side*(.49+i*.15),y+.78+Math.sin(i)*.07,z-.06],.035,'lightwood');}
  else if(type==='antlers'){beam(g,[x,y,z],[side*.55,y+.85,z-.3],.045,'lightwood');for(let i=0;i<3;i++)beam(g,[side*(.29+i*.09),y+.25+i*.2,z-i*.08],[side*(.55+i*.11),y+.45+i*.23,z+.08-i*.08],.03,'lightwood');}
  else{const long=type==='ibex'?.95:type==='back'?.55:.35;tube(g,[[x,y,z],[side*.3,y+long*.55,z-.08],[side*.36,y+long,z-.38],[side*.35,y+long*.85,z-.65]],.055,'sand');if(type==='fork')beam(g,[side*.3,y+.25,z-.08],[side*.48,y+.4,z+.08],.035,'sand');}
}}
function markings(g,p,color,by,ry,rz){
  if(p.spots||p.patch)for(let i=0;i<(p.patch?8:16);i++){const z=-rz*.75+(i%5)*rz*.34,y=by-.12+Math.floor(i/5)*ry*.26;for(const side of [-1,1])ell(g,side*(ry*.92),y,z,.025,p.patch?.14:.055,p.patch?.19:.07,p.patch&&i%3===0?'cream':0x535b4c);}
  if(p.stripes||p.stripe)for(let i=0;i<7;i++){const z=-rz*.8+i*rz*.26;for(const side of [-1,1])beam(g,[side*ry*.8,by+ry*.3,z],[side*ry*.95,by-ry*.35,z+.12],.045,0x4a5145);}
  if(p.saddle)ell(g,0,by+ry*.72,-.05,ry*.86,ry*.3,rz*.86,0xbfc5b8);
}
function quadruped(g,family,color,p){
  const ry=p.body||.52,rx=ry*(family==='heavy'?1.04:.86),rz=p.long?1.08:family==='heavy'?1.05:.86,legH=p.leg||.5,by=legH+ry*.7;
  ell(g,0,by,0,rx,ry,rz,color);const limbColor=p.panda?0x46534c:color;
  for(const x of [-rx*.62,rx*.62])for(const z of [-rz*.62,rz*.62]){const l=leg(g,x,legH+.12,z,legH,.09+(family==='heavy'?.09:family==='bear'?.035:0),limbColor,['hoof','bovine','longneck'].includes(family)?0x5b5d4d:limbColor);if(p.stripedLegs)for(let i=0;i<5;i++)cyl(l,.098,.098,.055,0,-.1-i*.13,0,i%2?'cream':0x4f5547,8);}
  const neck=p.neck||0,headY=by+ry*.45+neck,headZ=rz*.88+(neck?.12:.1),head=p.head||(family==='canid'?.27:family==='heavy'?.47:.3);
  if(neck)beam(g,[0,by,rz*.5],[0,headY-.05,headZ],family==='longneck'?.18:.23,color);
  if(p.mane)ell(g,0,headY,headZ,.5,.58,.44,0x947144);
  ell(g,0,headY,headZ,head,head*.94,head*(p.hippo?1.22:1),color);
  const muzzle=family==='canid'?.37:p.hippo?.42:family==='bovine'?.28:p.rhino?.31:.2;
  ell(g,0,headY-head*.27,headZ+head*.8,head*.75,head*.48,muzzle,p.bib||p.mask||p.panda?'cream':color);
  ell(g,0,headY-head*.2,headZ+head*.75+muzzle*.9,head*.35,head*.22,.055,p.hippo?0x868e83:0x4e584d);
  for(const side of [-1,1]){ear(g,side*head*.8,headY+head*.8,headZ-.02,p.ears||'point',p.panda?0x46534c:color);if(p.mask||p.panda)ell(g,side*head*.66,headY+.04,headZ+head*.71,head*.27,head*.24,.025,0x4d5b51);eye(g,side*head*.69,headY+.06,headZ+head*.78,.035);}
  if(p.horn)hornPair(g,p.horn,headY+head*.8,headZ-.05);
  if(p.rhino){cone(g,.14,.7,0,headY+.39,headZ+.56,'cream',9);cone(g,.09,.42,0,headY+.4,headZ+.27,'sand',8);}
  if(p.hump)for(let i=0;i<p.hump;i++)ell(g,0,by+ry*.63,(i-(p.hump-1)/2)*.65,rx*.7,ry*(family==='longneck'?.85:.58),.48,color);
  if(p.beard)cone(g,.13,.43,0,headY-head*.9,headZ+.1,'darkwood',7).rotation.z=Math.PI;
  if(p.fringe||p.shaggy)for(let i=0;i<8;i++)ell(g,Math.sin(i*2.4)*rx*.75,by-.24,-.65+(i%4)*.42,.16,.25,.19,color);
  if(p.wool)for(let i=0;i<10;i++)ell(g,Math.cos(i*2.4)*rx*.8,by+Math.sin(i*2.4)*ry*.5,-.6+(i%4)*.4,.21,.22,.23,'cream');
  if(p.chest)ell(g,0,by+.04,rz*.97,.29,.2,.035,'sand');
  if(p.bib)ell(g,0,headY-.18,headZ+.02,.24,.38,.12,'cream');
  if(p.teeth)for(const x of [-.055,.055])boxTooth(g,x,headY-head*.65,headZ+head*.8+muzzle*.8);
  if(p.spines)for(let i=0;i<24;i++){const a=i*2.4,x=Math.cos(a)*rx*.75,z=-.65+(i%7)*.21,y=by+Math.sqrt(Math.max(0,1-(x/rx)**2))*ry*.8;beam(g,[x,y,z],[x*1.35,y+(p.crest?.4:.22),z-.15],.022,i%2?'cream':'darkwood');}
  markings(g,p,color,by,rx,rz);tail(g,p.tail??(['hoof','bovine','longneck','heavy'].includes(family)?'tuft':family==='bear'?'short':'taper'),color,by,rz);
}
function boxTooth(g,x,y,z){const t=mesh(g,new THREE.BoxGeometry(.075,.16,.045),'cream',x,y,z);return t;}
function upright(g,family,color,p){
  const ry=p.body||.5;ell(g,0,.88,0,ry*.72,.65,ry*.66,color);ell(g,0,.85,.2,ry*.57,.48,.11,'cream');
  const headY=1.5,head=family==='primate'?.34:.29;ell(g,0,headY,.08,head,head*.96,head*.85,color);
  if(p.face)ell(g,0,headY-.06,.3,.25,.27,.1,p.face);
  for(const side of [-1,1]){ear(g,side*head*.85,headY+.12,.05,p.ears||'round',color);eye(g,side*.105,headY+.04,.33,.034);}
  ell(g,0,headY-.05,.35,p.nose?.12:.075,p.nose?.15:.06,.07,0x435149);
  if(p.mandrill){ell(g,0,1.48,.41,.045,.16,.025,0xb07168);for(const x of [-.1,.1])ell(g,x,1.47,.4,.06,.14,.035,0x769aa0);}
  if(p.crest)cone(g,.17,.34,0,1.88,0,color,9);
  for(const side of [-1,1]){leg(g,side*.25,.42,-.04,.35,.11,color);const arm=new THREE.Group();arm.position.set(side*ry*.68,1.22,.02);const len=p.longArms?.95:p.arms?.73:.43;beam(arm,[0,0,0],[side*.08,-len,.15],p.arms?.12:.075,color);ell(arm,side*.08,-len,.15,.1,.1,.13,color);g.add(arm);g.userData.arms.push(arm);}
  tail(g,p.tail||'none',color,.7,.25);
}
function hopper(g,color,p){
  ell(g,0,.9,-.1,.37,.66,.44,color);ell(g,0,1.55,.25,.19,.3,.23,color);ell(g,0,1.43,.46,.15,.15,.23,'sand');
  for(const side of [-1,1]){ear(g,side*.14,1.86,.23,'long',color);eye(g,side*.16,1.6,.42,.03);const l=leg(g,side*.32,.55,-.08,.43,.11,color);ell(l,0,-.35,.25,.12,.09,.39,color);ell(g,side*.29,.58,-.12,.2,.35,.26,color);beam(g,[side*.2,1.17,.1],[side*.18,.84,.38],.055,color);}
  tail(g,'taper',color,.55,.45);
}
function reptile(g,color,p){
  const croc=p.croc;ell(g,0,.28,0,croc?.35:.22,croc?.25:.18,croc?1:.65,color);ell(g,0,.3,croc?1.08:.72,croc?.29:.17,.14,croc?.56:.24,color);
  const points=[[0,.28,-.6],[.05,.22,-1.25],[.12,.15,-1.85],[.22,.1,-2.3]];const t=tube(g,points,croc?.14:.075,color);g.userData.tail=t;
  for(const side of [-1,1])for(const z of [-.45,.45]){const l=new THREE.Group();l.position.set(side*.2,.25,z);beam(l,[0,0,0],[side*.3,-.09,.12],.075,color);beam(l,[side*.3,-.09,.12],[side*.38,-.19,-.02],.055,color);for(let k=0;k<3;k++)beam(l,[side*.37,-.19,-.02],[side*(.43+k*.04),-.2,.08+k*.03],.015,'sand');g.add(l);g.userData.legs.push(l);}
  for(const side of [-1,1]){ell(g,side*.15,.43,croc?1.05:.77,.085,.085,.1,color);eye(g,side*.16,.46,croc?1.1:.81,.035);}
  for(let i=0;i<(croc?14:18);i++){const z=-1.65+i*.19;cone(g,croc?.07:.06,croc?.11:.18,0,croc?.47:.43,z,croc?'leafDark':'leafLight',5);}
  if(croc)for(const side of [-1,1])for(let i=0;i<5;i++)cone(g,.025,.06,side*.25,.27,.93+i*.12,'cream',4);
}
function frog(g,color){
  ell(g,0,.22,0,.32,.22,.43,color);ell(g,0,.3,.32,.3,.17,.22,color);
  for(const side of [-1,1]){ell(g,side*.21,.47,.35,.11,.12,.1,color);eye(g,side*.21,.5,.42,.05);for(const front of [false,true]){const l=new THREE.Group();l.position.set(side*.22,.22,front?.25:-.3);ell(l,side*.12,-.02,-.02,front?.09:.17,.12,front?.13:.2,color);beam(l,[side*.13,-.03,0],[side*.31,-.2,.15],.035,color);for(let i=0;i<3;i++)beam(l,[side*.31,-.2,.15],[side*(.3+i*.055),-.22,.31],.017,color);g.add(l);g.userData.legs.push(l);}}
  for(let i=0;i<9;i++)ell(g,Math.cos(i*2.4)*.23,.4+Math.sin(i)*.02,-.2+(i%3)*.2,.055,.018,.07,0x485e51);
}
const byId=new Map(profiles.map(p=>['fauna-'+p[0],p]));
export function createExpandedAnimal(id){const p=byId.get(id);if(!p)return null;const [,,family,w,d,h,color,features]=p,g=creature(id);if(family==='upright'||family==='primate')upright(g,family,color,features);else if(family==='hopper')hopper(g,color,features);else if(family==='reptile')reptile(g,color,features);else if(family==='frog')frog(g,color);else quadruped(g,family,color,features);return fitCreature(g,w,d,h);}
