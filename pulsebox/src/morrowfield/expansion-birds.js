import {THREE,mat,mesh,ell,cone,beam,tube} from './building-kit.js';
import {creature,fitCreature,eye} from './expansion-animals.js';

// Original flight silhouettes; measurements include the fully extended wings.
const profiles=[
 ['bald-eagle','Bald eagle','raptor',3.3,1.8,.8,0x635b47,{head:0xe8e4cd,tail:0xe8e4cd,beak:0xd7b860,span:1.35,fingers:6}],
 ['golden-eagle','Golden eagle','raptor',3.5,2,.9,0x726349,{nape:0xb29a62,span:1.45,fingers:7,tailLength:.55}],
 ['osprey','Osprey','raptor',2.8,1.65,.7,0x7e8174,{head:0xe6e6d6,breast:0xe3e1c9,mask:true,span:1.33,sweep:.25}],
 ['red-tailed-hawk','Red-tailed hawk','raptor',2.4,1.5,.8,0x917c59,{breast:0xcebb8e,tail:0xb47850,span:1.12,fingers:5}],
 ['peregrine-falcon','Peregrine falcon','falcon',2.1,1.45,.65,0x687c80,{breast:0xe1d9bb,mask:true,span:1.35,bars:4,tailLength:.48}],
 ['kestrel','Common kestrel','falcon',1.65,1.25,.6,0xaf8e60,{head:0x899b99,spots:true,span:1.14,tailLength:.61}],
 ['harpy-eagle','Harpy eagle','raptor',3,1.9,1.1,0x61716a,{head:0xafb7aa,breast:0xe1dfcc,crest:3,span:1.4,fingers:7}],
 ['secretarybird','Secretarybird','raptor',3.2,2.9,1,0xb4bdb2,{wing:0x4d6259,crest:5,longLegs:1.15,tailLength:.9,span:1.3,face:0xc29265}],
 ['red-kite','Red kite','raptor',2.8,2,.8,0xa17b55,{head:0xadb6aa,fork:true,tailLength:.8,span:1.4,wingPatch:0xe2d8b9}],
 ['griffon-vulture','Griffon vulture','vulture',3.6,1.8,.95,0x9c8b6a,{head:0xd7cfb2,ruff:true,span:1.58,fingers:8,neck:.22}],
 ['andean-condor','Andean condor','vulture',4,2.2,1.1,0x45554e,{head:0xa88e77,ruff:true,comb:true,span:1.7,fingers:9,wingPatch:0xd2d8c9}],
 ['bearded-vulture','Bearded vulture','vulture',3.7,2.45,.9,0x586a64,{head:0xc7ae7a,breast:0xc9a46e,beard:true,tailLength:.85,span:1.64}],
 ['barn-owl','Barn owl','owl',1.9,1.2,.7,0xc7b58e,{face:0xede7d3,span:1.12,heart:true,spots:true}],
 ['snowy-owl','Snowy owl','owl',2.25,1.4,.85,0xe5e5d6,{face:0xf0ecda,span:1.23,bars:5}],
 ['great-horned-owl','Great horned owl','owl',2.2,1.4,.95,0xa3987a,{face:0xcec3a0,tufts:true,span:1.2,bars:4}],
 ['burrowing-owl','Burrowing owl','owl',1.25,.9,.6,0xb7ac8a,{face:0xded4b6,span:.95,spots:true,legs:.3}],
 ['eagle-owl','Eurasian eagle owl','owl',2.6,1.65,1.15,0xa18f69,{face:0xc9af7c,tufts:true,span:1.36,eyeColor:0xd7a45d,bars:6}],
 ['saw-whet-owl','Northern saw-whet owl','owl',1.1,.85,.65,0xb29a72,{face:0xe5dabd,span:.9,spots:true,headScale:1.2}],
 ['mute-swan','Mute swan','swan',3.5,3.2,1.25,0xe8e7d5,{beak:0xc99564,neck:1.15,span:1.55,knob:true}],
 ['black-swan','Black swan','swan',3.2,3.1,1.3,0x475c54,{beak:0xb8776d,neck:1.23,span:1.45,wingPatch:0xdddac7}],
 ['canada-goose','Canada goose','goose',2.7,2.1,.9,0x958f73,{head:0x40554e,cheek:0xe5e2ca,neck:.58,span:1.3}],
 ['bar-headed-goose','Bar-headed goose','goose',2.45,2,.85,0xbbbfae,{head:0xe2dfc9,bars:2,headBars:true,neck:.5,span:1.2}],
 ['white-pelican','American white pelican','pelican',3.8,2.7,1.05,0xe6e2c9,{wing:0x59665b,beak:0xd5b76a,span:1.65,bill:.85,pouch:.2}],
 ['brown-pelican','Brown pelican','pelican',3.2,2.4,.95,0x909685,{head:0xd9cc9e,beak:0xbcb39b,span:1.47,bill:.75,pouch:.27}],
 ['great-blue-heron','Great blue heron','heron',3,2.8,1.05,0x8daba7,{head:0xc6d2c5,crest:2,neck:.85,longLegs:1.15,span:1.38}],
 ['grey-heron','Grey heron','heron',2.8,2.6,.95,0xa8b9b3,{head:0xe2e1cb,crest:1,neck:.72,longLegs:.98,span:1.3}],
 ['sandhill-crane','Sandhill crane','crane',3.15,3,.85,0xa1aaa0,{crown:0xb57c6d,neck:.9,longLegs:1.1,span:1.4}],
 ['red-crowned-crane','Red-crowned crane','crane',3.4,3.2,.95,0xe6e5d3,{head:0x52655d,crown:0xb76a5e,wing:0x53675b,neck:1.04,longLegs:1.2,span:1.48}],
 ['white-stork','White stork','stork',3.05,2.8,.8,0xe4e1cd,{wing:0x56665b,beak:0xb98264,neck:.75,longLegs:1,span:1.4}],
 ['scarlet-ibis','Scarlet ibis','ibis',1.9,1.7,.7,0xc87965,{beak:0x695f50,neck:.45,longLegs:.58,span:1.1,bill:.58}],
 ['spoonbill','Roseate spoonbill','spoonbill',2.4,2.2,.85,0xd6a18e,{head:0xccd2b8,neck:.55,longLegs:.8,span:1.25,bill:.65}],
 ['avocet','Pied avocet','avocet',1.6,1.5,.65,0xe8e3cb,{head:0x506458,wing:0x536b5c,neck:.32,longLegs:.66,span:.98,bill:.52}],
 ['scarlet-macaw','Scarlet macaw','parrot',2.1,2.4,.8,0xc67a63,{wing:0x648e9e,wingPatch:0xd6b86d,face:0xe0dac2,beak:0xc9c1a5,tailLength:1.22,span:1.17}],
 ['blue-gold-macaw','Blue-and-gold macaw','parrot',2.05,2.35,.85,0x5a97ad,{breast:0xd4b66d,face:0xe5dfca,beak:0x4f6056,tailLength:1.18,span:1.14}],
 ['hyacinth-macaw','Hyacinth macaw','parrot',2.25,2.5,.9,0x6685b1,{cheek:0xd7bd73,beak:0x53625e,tailLength:1.3,span:1.23}],
 ['african-grey','African grey parrot','parrot',1.25,1.15,.65,0xa5b1a8,{face:0xd0d4c6,tail:0xb77966,tailLength:.36,span:.92,bars:3}],
 ['cockatoo','Sulphur-crested cockatoo','parrot',1.65,1.5,.95,0xe7e3cc,{crest:6,crestColor:0xd7c379,beak:0x68756a,tailLength:.5,span:1.04}],
 ['cockatiel','Cockatiel','parrot',.95,1.3,.65,0xa7b1a4,{crest:4,crestColor:0xd9c77c,head:0xded28c,cheek:0xc38d65,tailLength:.83,span:.83}],
 ['budgerigar','Budgerigar','parrot',.75,.9,.48,0x99b77c,{head:0xe0d38b,wing:0x7b9980,bars:5,tailLength:.63,span:.75}],
 ['kea','Kea','parrot',1.65,1.6,.75,0x8b9b68,{wingPatch:0xc09a68,beak:0x667563,tailLength:.57,span:1.12,longBill:true}],
 ['toco-toucan','Toco toucan','toucan',1.65,1.9,.85,0x405c52,{breast:0xe6dec0,beak:0xd1ab60,bill:.83,tailLength:.5,span:1.05}],
 ['keel-billed-toucan','Keel-billed toucan','toucan',1.5,1.7,.8,0x486355,{breast:0xd9ca7e,beak:0x9abb79,bill:.7,billTip:0xc48a65,tailLength:.47,span:.98}],
 ['great-hornbill','Great hornbill','toucan',2.4,2.5,1.05,0x526758,{breast:0xdedac1,beak:0xd2b66c,bill:.8,casque:true,tailLength:.75,span:1.3}],
 ['european-robin','European robin','songbird',.7,.75,.45,0x9a9c80,{breast:0xc68f6d,span:.72,tailLength:.3,round:true}],
 ['blue-jay','Blue jay','songbird',1,.95,.6,0x7a9eac,{breast:0xcfd6c7,crest:2,bars:3,tailLength:.48,span:.84}],
 ['northern-cardinal','Northern cardinal','songbird',.88,.95,.63,0xbf7868,{crest:3,mask:true,beak:0xd1a06b,tailLength:.52,span:.78}],
 ['goldfinch','American goldfinch','songbird',.72,.7,.45,0xd3c16d,{head:0x52675a,wing:0x596f5d,tailLength:.29,span:.73}],
 ['barn-swallow','Barn swallow','swallow',1,.95,.4,0x688e9a,{breast:0xe2d3ac,cheek:0xb88b6e,fork:true,tailLength:.67,span:1.05}],
 ['kingfisher','Common kingfisher','songbird',.75,.95,.47,0x5e9ca7,{breast:0xc99d69,bill:.44,tailLength:.23,span:.78,headScale:1.08}],
 ['hoopoe','Eurasian hoopoe','songbird',1.1,1.1,.7,0xc49f76,{crest:7,crestColor:0xc5a078,bars:4,bill:.42,tailLength:.4,span:.9}],
 ['woodpecker','Great spotted woodpecker','songbird',1,.95,.55,0x5f7465,{breast:0xe2ddc5,crown:0xba7c68,wingPatch:0xd5ddc9,bill:.23,tailLength:.39,span:.85}],
 ['bee-eater','European bee-eater','songbird',.95,1.1,.5,0x85b2a0,{head:0xab9672,breast:0xd5bf72,mask:true,bill:.27,tailLength:.66,streamers:true,span:.87}],
 ['hummingbird','Ruby-throated hummingbird','hummingbird',.62,.7,.37,0x80a18a,{breast:0xc0cfb0,cheek:0xb88078,bill:.43,tailLength:.2,span:.85}],
 ['raven','Common raven','songbird',1.8,1.8,.8,0x465e58,{beak:0x40584f,tailLength:.65,span:1.15,beard:true,bill:.24}],
 ['magpie','Eurasian magpie','songbird',1.1,1.7,.6,0x4b6e67,{breast:0xe2dfc8,wingPatch:0xdadfc8,tailLength:1.12,span:.91}],
 ['starling','European starling','songbird',.85,.87,.5,0x6e8a79,{spots:true,beak:0xcdb473,tailLength:.34,span:.8}],
 ['cormorant','Great cormorant','goose',2.55,2.5,.8,0x4f6a5f,{cheek:0xcfb975,neck:.67,tailLength:.73,span:1.28,longBill:true}],
 ['seagull','Herring gull','gull',2.35,1.7,.65,0xd7ddce,{wing:0xa5b5b0,head:0xe8e7d4,beak:0xd3bb72,span:1.3,sweep:.35}],
 ['peacock','Indian peafowl','gamebird',2.8,4.1,1.3,0x5b93a3,{crest:4,wing:0xabaa7a,train:true,neck:.37,span:1.27}],
 ['pheasant','Ring-necked pheasant','gamebird',1.75,2.9,.8,0xaf946e,{head:0x648f7a,cheek:0xba8271,ruff:true,tailLength:1.8,span:1.08,bars:4}]
];

const waterFamilies=new Set(['swan','goose','pelican','heron','crane','stork','ibis','spoonbill','avocet','gull']);
export const BIRD_EXPANSION=profiles.map(([slug,name,family,w,d,h,color,p])=>({id:'avian-'+slug,name,category:'Birds',kind:'bird',tags:`bird flying ${family} ${name.toLowerCase()} ${waterFamilies.has(family)?'waterside waterbird':'woodland aviary'}`,description:`${name} with ${description(family,p)}, individually shaped feathered wings and an animated flight pose.`,radius:Math.hypot(w/2,d/2)+.03,height:h+.03,speed:family==='hummingbird'?1.8:family==='falcon'?2.2:waterFamilies.has(family)?1.05:1.4,habitat:waterFamilies.has(family)?'waterside':family==='parrot'||family==='toucan'?'tropical':'woodland',space:Math.ceil(w*d*8),collection:'world-expansion'}));
function description(f,p){return p.train?'a layered eye-spotted trailing train':f==='owl'?`${p.tufts?'tall ear tufts and ':''}a rounded facial disc`:f==='toucan'?`${p.casque?'a raised casque and ':''}a large curved bill`:f==='pelican'?'a long bill and sculpted throat pouch':f==='spoonbill'?'a flattened spoon-shaped bill':p.neck?'a graceful extended neck':p.fork?'a distinctive forked tail':p.crest?'a raised feather crest':p.head?'contrasting head plumage':p.tailLength>.8?'long layered tail feathers':'a species-specific beak and body profile';}

function bill(g,x,y,z,length,r,color,curve=0){
 if(curve){tube(g,[[x,y,z],[x,y+.015,z+length*.5],[x,y-curve,z+length]],r,color);return;}
 const m=cone(g,r,length,x,y,z+length/2,color,8);m.rotation.x=Math.PI/2;
}
function wings(g,color,p,family){const broad=['raptor','vulture','owl','gamebird'].includes(family),pointed=['falcon','swallow','hummingbird'].includes(family),span=p.span||1.1;
 for(const side of [-1,1]){const wing=new THREE.Group();wing.name=side<0?'left-wing':'right-wing';wing.position.set(side*.17,.04,.03);const length=span;
  const base=ell(wing,side*length*.42,0,-.09,length*.52,.055,broad?.29:.21,p.wing||color);base.rotation.y=side*(p.sweep??(pointed?.35:.15));
  const n=p.fingers|| (broad?6:5);
  for(let i=0;i<n;i++){const t=i/(n-1),xx=side*length*(.57+t*.4),zz=-.03-t*(pointed?.42:.3);const feather=ell(wing,xx,-.012,zz,pointed?.29:.24,.025,broad?.085:.055,p.wing||color);feather.rotation.y=side*(.08+t*(pointed?.7:.5));}
  if(p.wingPatch){const patch=ell(wing,side*length*.52,.054,-.03,length*.26,.018,.12,p.wingPatch);patch.rotation.y=side*.14;}
  if(p.bars)for(let i=0;i<p.bars;i++)ell(wing,side*length*(.28+i*.095),.06,-.08,.023,.014,.16,0xe0dcc0);
  if(p.spots)for(let i=0;i<6;i++)ell(wing,side*length*(.25+(i%3)*.22),.06,-.08-Math.floor(i/3)*.1,.025,.012,.025,0xded7b9);
  g.add(wing);g.userData.wings.push(wing);
 }
}
function tail(g,color,p,family){const t=new THREE.Group();t.name='tail';t.position.set(0,-.025,-.38);const length=p.tailLength??(family==='owl'?.3:.42),tailColor=p.tail||color;
 if(p.train){for(let i=0;i<11;i++){const x=(i-5)*.12,z=-1.05-Math.sqrt(1-((i-5)/5.1)**2)*.43;const f=ell(t,x,.01,z*.52,.095,.035,-z*.59,0x87a377);const angle=(i-5)*-.075;f.rotation.y=angle;const along=z*.41,ex=x+Math.sin(angle)*along,ez=z*.52+Math.cos(angle)*along;ell(t,ex,.047,ez,.072,.018,.1,0xc4b475).rotation.y=angle;ell(t,ex,.061,ez,.044,.013,.065,0x5b9692).rotation.y=angle;ell(t,ex,.072,ez,.024,.009,.035,0x426d70).rotation.y=angle;}}
 else if(p.fork){for(const s of [-1,1]){const f=ell(t,s*.13,-.01,-length*.53,.08,.028,length*.59,tailColor);f.rotation.y=s*-.2;}}
 else{const count=family==='parrot'||family==='gamebird'?5:4;for(let i=0;i<count;i++){const x=(i-(count-1)/2)*.065;const f=ell(t,x,0,-length*.45,.066,.027,length*(1-Math.abs(x)*.45)*.65,tailColor);f.rotation.y=-x*.35;}}
 if(p.streamers)for(const s of [-1,1])beam(t,[s*.045,0,-length*.5],[s*.055,0,-length*1.5],.018,tailColor);
 g.add(t);g.userData.tail=t;
}
function legs(g,p,family){for(const s of [-1,1]){const l=new THREE.Group();l.name='leg-'+g.userData.legs.length;l.position.set(s*.1,-.12,-.15);const len=p.longLegs||(waterFamilies.has(family)?.32:p.legs||.18);const color=family==='stork'?0xb68b66:0x988c68;beam(l,[0,0,0],[0,-.07,-len],.018,color);for(let i=-1;i<=1;i++)beam(l,[0,-.07,-len],[i*.038,-.09,-len-.1],.012,color);g.add(l);g.userData.legs.push(l);}}
function decorateHead(g,p,family,color,hy,hz,hs){
 const beak=p.beak||(['parrot','raptor','vulture','falcon','owl'].includes(family)?0xa49a79:0xbca477);
 if(family==='owl'){
  for(const s of [-1,1]){ell(g,s*.09,hy,hz+.15,.13,.145,.045,p.face||0xd5ceb3);ell(g,s*.095,hy+.015,hz+.192,.058,.06,.016,p.eyeColor||0xd4bd7c);eye(g,s*.095,hy+.015,hz+.21,.025);}
  bill(g,0,hy-.065,hz+.18,.105,.04,beak);if(p.tufts)for(const s of [-1,1])cone(g,.065,.22,s*.15,hy+.24,hz-.03,color,6);
 }else{
  for(const s of [-1,1]){if(p.face)ell(g,s*hs*.84,hy-.01,hz+.055,.022,.13,.13,p.face);if(p.mask)ell(g,s*hs*.86,hy+.015,hz+.07,.027,.06,.11,0x435c50);eye(g,s*hs*.83,hy+.045,hz+.1,.027);if(p.cheek)ell(g,s*hs*.87,hy-.065,hz+.08,.025,.065,.07,p.cheek);}
  if(family==='parrot'){ell(g,0,hy-.025,hz+hs*.78,.075,p.longBill?.12:.09,.11,beak);bill(g,0,hy-.07,hz+hs,.12,.035,beak,.1);}
  else if(family==='toucan'){ell(g,0,hy-.015,hz+.2+p.bill*.4,.105,.15,p.bill*.56,beak);ell(g,0,hy-.025,hz+.2+p.bill*.86,.078,.1,.09,p.billTip||0x65735b);if(p.casque)ell(g,0,hy+.17,hz+.38,.1,.1,.29,beak);}
  else if(family==='pelican'){bill(g,0,hy-.035,hz+.15,p.bill,.055,beak);ell(g,0,hy-.12,hz+.14+p.bill*.4,.075,p.pouch,p.bill*.43,0xc5b98b);}
  else if(family==='spoonbill'){bill(g,0,hy-.035,hz+.15,p.bill,.025,0x9aab92);ell(g,0,hy-.04,hz+.15+p.bill,.1,.026,.11,0x9aab92);}
  else if(family==='ibis')bill(g,0,hy-.02,hz+.15,p.bill,.025,beak,.15);
  else if(family==='avocet')bill(g,0,hy-.02,hz+.15,p.bill,.018,0x50695b,-.14);
  else bill(g,0,hy-.035,hz+hs*.78,p.bill||(family==='heron'||family==='stork'||family==='crane'?.4:family==='hummingbird'?.43:.16),family==='hummingbird'?.013:family==='heron'?.037:.05,beak,['raptor','vulture','falcon'].includes(family)?.07:0);
 }
 if(p.crown)ell(g,0,hy+hs*.8,hz,.11,.035,.13,p.crown);
 if(p.nape)ell(g,0,hy+.1,hz-.12,.18,.12,.09,p.nape);
 if(p.knob)ell(g,0,hy+.015,hz+.2,.065,.065,.06,0x4a5f53);
 if(p.comb)ell(g,0,hy+.19,hz-.01,.035,.12,.13,0x9a8570);
 if(p.beard)for(let i=-1;i<=1;i++)beam(g,[i*.03,hy-.11,hz+.09],[i*.04,hy-.22,hz+.13],.018,0x43594f);
 if(p.headBars)for(let i=0;i<2;i++)ell(g,0,hy+.1-i*.08,hz-.13,.17,.025,.055,0x5c7060);
 if(p.crest)for(let i=0;i<p.crest;i++){const a=(i-(p.crest-1)/2)*.22;beam(g,[0,hy+hs*.65,hz-.03],[Math.sin(a)*.13,hy+hs+.17+Math.cos(a)*.08,hz-.12-i*.018],.025,p.crestColor||color);}
}
function makeBird(g,family,color,p){
 const bulky=['owl','gamebird','pelican'].includes(family),bodyX=bulky?.27:.2,bodyY=bulky?.24:.18,bodyZ=family==='hummingbird'?.32:.47;
 ell(g,0,0,0,bodyX,bodyY,bodyZ,color);
 if(p.breast)ell(g,0,-bodyY*.6,.13,bodyX*.83,bodyY*.55,bodyZ*.65,p.breast);
 let hy=.12,hz=.48,hs=(family==='owl'?.24:family==='toucan'?.2:.165)*(p.headScale||1);
 const neck=p.neck||0;
 if(neck){hz+=neck;hy+=family==='swan'?.21:family==='heron'?.25:.08;
  const points=family==='heron'?[[0,.04,.33],[0,.22,.43],[0,.12,.6],[0,hy,hz]]:family==='swan'?[[0,.04,.34],[0,.25,.55],[0,.19,hz-.3],[0,hy,hz]]:[[0,.04,.3],[0,hy*.8,.5],[0,hy,hz]];tube(g,points,family==='swan'?.095:family==='goose'?.1:.07,p.head||color);
 }
 ell(g,0,hy,hz,hs,hs*(family==='owl'?1:.88),hs*.95,p.head||color);
 if(p.ruff){for(let i=0;i<8;i++){const a=i*Math.PI/4;ell(g,Math.cos(a)*.17,.08+Math.sin(a)*.17,.33,.075,.065,.08,0xe1d9b9);}}
 decorateHead(g,p,family,color,hy,hz,hs);wings(g,color,p,family);tail(g,color,p,family);legs(g,p,family);
 if(p.spots&&family==='songbird')for(let i=0;i<9;i++)ell(g,Math.cos(i*2.4)*.13,.16,-.25+(i%3)*.2,.018,.012,.025,0xdad3ae);
}
const byId=new Map(profiles.map(p=>['avian-'+p[0],p]));
export function createExpandedBird(id){const p=byId.get(id);if(!p)return null;const [,,family,w,d,h,color,features]=p,g=creature(id);g.userData.flight=true;makeBird(g,family,color,features);return fitCreature(g,w,d,h,{ground:false});}
