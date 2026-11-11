import {THREE,mat,mesh,ell,cone,beam,tube} from './building-kit.js';
import {creature,fitCreature,eye} from './expansion-animals.js';

// Original aquatic miniatures, facing +Z. Widths include fins and appendages.
const profiles=[
 ['clownfish','Clownfish','fish',.65,1.1,.65,0xd29159,{body:'deep',bands:3,bandColor:0xe8e3ce,tail:'round',fin:0xbb8551}],
 ['blue-tang','Blue tang','fish',.6,1.3,.85,0x6e9fbd,{body:'disk',saddle:0x506c91,tail:'fork',tailColor:0xd9c271}],
 ['yellow-tang','Yellow tang','fish',.55,1.05,.85,0xd9c471,{body:'disk',snout:.14,tail:'fan',dorsal:.52}],
 ['regal-angelfish','Regal angelfish','fish',.6,1.25,1.05,0x91b4ae,{body:'tall',bands:7,bandColor:0xd3c584,tail:'round',dorsal:.53}],
 ['emperor-angelfish','Emperor angelfish','fish',.7,1.45,1,0x759fa9,{body:'deep',lines:6,lineColor:0xd7ca82,mask:true,tail:'fan'}],
 ['bannerfish','Longfin bannerfish','fish',.55,1.3,1.35,0xe2ddc3,{body:'disk',bands:2,bandColor:0x536d63,banner:1.05,tailColor:0xd5c37d}],
 ['moorish-idol','Moorish idol','fish',.55,1.2,1.5,0xd9c87d,{body:'tall',bands:3,bandColor:0x566d63,banner:1.35,snout:.18}],
 ['mandarinfish','Mandarinfish','fish',.6,1,.65,0x87ad9b,{body:'stocky',rings:true,head:.28,tail:'round',fin:0xc7a36c}],
 ['lionfish','Red lionfish','fish',1.25,1.55,1.3,0xb79877,{body:'stocky',bands:6,bandColor:0xddd1b3,lion:true,tail:'round'}],
 ['pufferfish','Spotted pufferfish','fish',1,1.2,1,0xc2bb91,{body:'puff',spots:true,tail:'small',fin:0xb3ab84}],
 ['porcupinefish','Porcupinefish','fish',1.1,1.3,1.1,0xbdb293,{body:'puff',spines:true,spots:true,tail:'small'}],
 ['triggerfish','Picasso triggerfish','fish',.65,1.3,.95,0xc3bda1,{body:'diamond',mask:true,cheek:0x7e9e9c,trigger:true,tail:'fork'}],
 ['parrotfish','Stoplight parrotfish','fish',.85,1.65,1,0x82b5a6,{body:'stocky',parrot:true,scales:true,tail:'fan',fin:0xa7c18f}],
 ['wrasse','Moon wrasse','fish',.6,1.7,.75,0x88b4a0,{body:'slender',snout:.13,lines:3,lineColor:0xc6b686,dorsal:.24,tail:'crescent'}],
 ['clown-triggerfish','Clown triggerfish','fish',.7,1.4,1,0x607b6d,{body:'diamond',spots:true,spotColor:0xe4ddc2,trigger:true,cheek:0xd5bc73,tail:'fan'}],
 ['butterflyfish','Raccoon butterflyfish','fish',.6,1.2,1,0xcfbd7c,{body:'disk',mask:true,bandColor:0xe8dfc2,bands:1,tail:'round',snout:.12}],
 ['copperband-butterflyfish','Copperband butterflyfish','fish',.55,1.35,1.1,0xe1dcc3,{body:'disk',bands:4,bandColor:0xbb9d70,snout:.36,tail:'fan'}],
 ['discus','Blue discus','fish',.5,1.05,1.05,0x95b6b0,{body:'round',lines:7,lineColor:0xc1c497,tail:'small',fresh:true}],
 ['neon-tetra','Neon tetra','fish',.24,.65,.32,0xa6bab1,{body:'slender',neon:true,tail:'fork',fresh:true,fin:0xbdc7b4}],
 ['cardinal-tetra','Cardinal tetra','fish',.27,.72,.35,0xb4c2b2,{body:'slender',neon:true,redBelly:true,tail:'fan',fresh:true,fin:0xb7c2a6}],
 ['betta','Siamese fighting fish','fish',1.05,1.4,1.2,0x799fad,{body:'deep',flowing:true,tail:'veil',fin:0xb08c98,fresh:true}],
 ['guppy','Fancy guppy','fish',.5,.95,.75,0xa7b99a,{body:'slender',tail:'sail',spots:true,tailColor:0xc6a479,fresh:true}],
 ['freshwater-angelfish','Freshwater angelfish','fish',.55,1.15,1.5,0xc1c7b1,{body:'tall',bands:4,bandColor:0x667e6c,dorsal:.85,feelers:true,tail:'fork',fresh:true}],
 ['arowana','Silver arowana','fish',.8,2.8,.9,0xb7c4b5,{body:'long',scales:true,jaw:true,dorsal:.2,tail:'round',fresh:true}],
 ['arapaima','Arapaima','fish',1.3,4,1.35,0x819888,{body:'long',scales:true,tail:'round',tailColor:0xb7836c,dorsal:.17,fresh:true}],
 ['catfish','Channel catfish','fish',1,2.3,.95,0x9bac9e,{body:'stocky',barbels:true,head:.38,tail:'fork',dorsal:.4,fresh:true}],
 ['rainbow-trout','Rainbow trout','fish',.8,2.1,.85,0xa9bc9f,{body:'slender',spots:true,lateral:0xc2a398,tail:'fork',adipose:true,fresh:true}],
 ['atlantic-salmon','Atlantic salmon','fish',.95,2.6,1,0xb3c4b4,{body:'long',spots:true,tail:'crescent',adipose:true,jaw:true,fresh:true}],
 ['northern-pike','Northern pike','fish',.8,2.8,.8,0x99ab86,{body:'long',snout:.42,spots:true,spotColor:0xd2cf9c,dorsal:.2,tail:'fork',fresh:true}],
 ['sturgeon','Lake sturgeon','fish',1.1,3.3,1.1,0x9eafa0,{body:'long',scutes:true,snout:.38,barbels:true,tail:'shark',fresh:true}],
 ['reef-shark','Blacktip reef shark','shark',2.1,3.5,1.4,0x9db5b0,{blacktips:true,dorsal:.65,tail:.75}],
 ['hammerhead','Scalloped hammerhead','shark',2.5,4.5,1.6,0xa5b6ad,{hammer:true,dorsal:.78,tail:.9}],
 ['whale-shark','Whale shark','shark',3.4,6.5,2.25,0x809f9f,{whale:true,spots:true,dorsal:.5,tail:.8}],
 ['great-white','Great white shark','shark',2.6,4.8,1.9,0x9caaa5,{white:true,dorsal:.85,tail:.9}],
 ['leopard-shark','Leopard shark','shark',1.65,3.7,1.05,0xaaa88d,{spots:true,slender:true,dorsal:.42,tail:1.35}],
 ['manta','Oceanic manta ray','ray',5.5,3.8,.95,0x647e7b,{manta:true,wing:1.9,tail:1.5}],
 ['stingray','Southern stingray','ray',2.7,3.5,.65,0xaaa98c,{wing:1.25,tail:2.3}],
 ['eagle-ray','Spotted eagle ray','ray',3.8,4.1,.8,0x829d98,{wing:1.65,tail:2.6,spots:true,snout:.3}],
 ['dolphin','Bottlenose dolphin','mammal',2.1,3.8,1.35,0x9fb9b4,{dolphin:true,dorsal:.55,snout:.4}],
 ['orca','Orca','mammal',3,5.4,2.3,0x496761,{orca:true,dorsal:1.12}],
 ['beluga','Beluga whale','mammal',2.45,4.4,1.6,0xe1e5d5,{beluga:true,dorsal:0}],
 ['manatee','West Indian manatee','mammal',2.1,3.9,1.6,0xaeb9a7,{manatee:true,dorsal:0}],
 ['harbor-seal','Harbor seal','mammal',1.6,2.9,1.15,0xadb8a5,{seal:true,spots:true,dorsal:0}],
 ['green-sea-turtle','Green sea turtle','turtle',2.7,2.7,.9,0xa5ad85,{shell:0x8f9c75,flipper:1.1}],
 ['leatherback','Leatherback sea turtle','turtle',3.2,3.4,1.15,0x748d83,{shell:0x657e77,flipper:1.35,ridges:true}],
 ['reef-octopus','Reef octopus','octopus',2.3,2.4,1,0xb69e85,{arms:8,curl:.48}],
 ['blue-ring-octopus','Blue-ringed octopus','octopus',1.15,1.35,.65,0xc5ba87,{arms:8,curl:.62,rings:true}],
 ['cuttlefish','Common cuttlefish','cephalopod',1.1,1.9,.65,0xbcba9e,{cuttle:true,arms:8}],
 ['squid','Reef squid','cephalopod',1.2,2.6,.75,0xb6c3b3,{arms:10,squid:true}],
 ['blue-crab','Blue crab','crab',1.8,1.3,.6,0x91b4ae,{blue:true,claws:.6}],
 ['hermit-crab','Hermit crab','crab',1.1,1.35,.95,0xc0a281,{hermit:true,claws:.35}],
 ['lobster','European lobster','crustacean',1.4,2.4,.7,0x789699,{lobster:true,claws:.7}],
 ['cleaner-shrimp','Cleaner shrimp','crustacean',1,1.8,.7,0xc7aa87,{shrimp:true,lines:true,antenna:1.2}],
 ['mantis-shrimp','Peacock mantis shrimp','crustacean',1.1,2,.8,0x8ba98d,{mantis:true,antenna:.55}],
 ['moon-jelly','Moon jellyfish','jelly',1.25,1.25,1.55,0xc4d9cb,{short:true,radius:.54}],
 ['sea-nettle','Pacific sea nettle','jelly',1.55,1.55,2.8,0xcbb795,{radius:.6,striped:true}],
 ['seahorse','Lined seahorse','seahorse',.55,.9,1.5,0xc8b58a,{spines:true,neck:.4}],
 ['leafy-seadragon','Leafy seadragon','seahorse',1.2,1.6,1.6,0xb3c297,{leaves:true,neck:.55}],
 ['starfish','Ochre sea star','starfish',1.3,1.3,.3,0xc09c7c,{arms:5}],
 ['nautilus','Chambered nautilus','nautilus',.75,1.8,1.15,0xd5c5a3,{bands:9}]
];

export const AQUATIC_EXPANSION=profiles.map(([slug,name,family,w,d,h,color,p])=>({id:'aqua-'+slug,name,category:'Aquatic',kind:'aquatic',tags:`aquatic ${family} ${name.toLowerCase()} ${p.fresh?'freshwater river pond':'ocean marine water'}`,description:`${name}: ${describe(family,p)}. An original animated miniature for deep enough water.`,radius:Math.hypot(w/2,d/2)+.03,height:h+.03,speed:['crab','crustacean','starfish'].includes(family)?.25:family==='jelly'?.22:family==='shark'||family==='mammal'?.9:.55,habitat:p.fresh?'freshwater':'marine',minimumDepth:h+.25,swimOffset:h/2+.12,space:Math.ceil(w*d*12),collection:'world-expansion'}));
function describe(f,p){return p.hammer?'a broad hammer-shaped head, tall dorsal fin and swept tail':p.whale?'a wide head, spotted back and powerful tail':f==='ray'?'broad sculpted wings, raised eyes and a slender trailing tail':p.orca?'a tall dorsal fin, broad flukes and distinct pale eye patches':p.manatee?'a rounded muzzle, paddle flippers and a broad rounded tail':f==='turtle'?`${p.ridges?'a ridged':'a patterned'} shell and long sea-going flippers`:f==='octopus'?'a rounded mantle and eight curled arms with small suckers':f==='jelly'?'a domed bell, radial details and flowing tentacles':f==='seahorse'?`${p.leaves?'leaf-shaped appendages, ':'a ridged body, '}an arched neck and curled tail`:f==='crab'?'a sculpted carapace, jointed legs and paired pincers':f==='starfish'?'five tapered textured arms around a low central disc':f==='nautilus'?'a striped spiral shell, small hood and a crown of tentacles':p.lion?'long striped fin rays and broad fan-shaped pectoral fins':p.flowing?'flowing layered fins and a broad veil tail':p.barbels?'a streamlined body and a distinct crown of barbels':p.banner?'a tall dorsal pennant and a narrow disk-shaped body':p.spines?'a rounded body with individual short spines':p.squid?'a pointed mantle, side fins and a crown of arms':p.cuttle?'a broad mantle with a ruffled fin edge and short arms':p.lobster?'a segmented body, broad claws and long antennae':p.shrimp||p.mantis?'a segmented abdomen, jointed appendages and stalked eyes':'carefully shaped fins, species-specific proportions and surface markings';}

const finGeometries=new Map();
function finGeometry(shape){if(finGeometries.has(shape))return finGeometries.get(shape);const shapes={swept:[[0,0],[.8,.65],[1,.07],[.3,-.08]],round:[[0,0],[.35,.35],[.8,.38],[1,.1],[.75,-.2],[.3,-.17]],tail:[[0,0],[.85,.55],[.67,.13],[.67,-.13],[.85,-.55]],fan:[[0,0],[.8,.5],[1,.25],[1,-.25],[.8,-.5]],sail:[[0,0],[1,.8],[.95,-.8]],shark:[[0,0],[1.1,.85],[.72,.1],[.55,-.45]],ray:[[0,0],[.4,.65],[1.1,.26],[.9,-.23],[.3,-.5]]},points=shapes[shape]||shapes.swept,s=new THREE.Shape();s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:.035,bevelEnabled:false});geo.translate(0,0,-.0175);finGeometries.set(shape,geo);return geo;}
function fin(g,x,y,z,sx,sy,sz,color,shape='swept',rotation=[0,0,0]){const f=mesh(g,finGeometry(shape),mat(color,{side:THREE.DoubleSide}),x,y,z,sx,sy,sz);f.rotation.set(...rotation);return f;}
function sideFins(g,rx,ry,rz,color,scale=.55){for(const s of [-1,1])fin(g,s*rx*.65,-ry*.2,rz*.2,s*scale,scale*.65,1,color,'swept',[Math.PI/2,0,0]);}
function fishTail(g,z,color,type='fork',scale=.7){const t=new THREE.Group();t.name='tail';t.position.z=z;let shape=type==='round'||type==='small'?'round':type==='fan'?'fan':type==='sail'||type==='veil'?'sail':type==='shark'?'shark':'tail';fin(t,0,0,0,scale,type==='small'?scale*.55:type==='veil'?scale*1.6:scale,1,color,shape,[0,Math.PI/2,0]);if(type==='veil')for(let i=0;i<6;i++)beam(t,[0,0,0],[0,(i-2.5)*scale*.4,-scale*.95],.012,0xd3c5b4);g.add(t);g.userData.tail=t;return t;}
function markings(g,p,rx,ry,rz,color){
 if(p.bands)for(const side of [-1,1])for(let i=0;i<p.bands;i++){const z=-rz*.65+i*rz*1.3/Math.max(1,p.bands-1);ell(g,side*rx*.94,0,z,.024,ry*.87,.035+(p.bands<4?.03:0),p.bandColor||0x607d6d);}
 if(p.lines)for(const side of [-1,1])for(let i=0;i<p.lines;i++){const y=(i-(p.lines-1)/2)*ry*1.5/p.lines;ell(g,side*rx*.95,y,0,.022,.018,rz*.84,p.lineColor||0xe2d8b6);}
 if(p.spots||p.scales)for(const side of [-1,1])for(let i=0;i<(p.scales?20:15);i++){const z=-rz*.7+(i%5)*rz*.33,y=(Math.floor(i/5)-1)*ry*.4;ell(g,side*rx*Math.sqrt(Math.max(.1,1-(y/ry)**2))*.96,y,z,.014,p.scales?.035:.027,p.scales?.07:.035,p.spotColor|| (p.scales?0xbec9ac:0x637e6b));}
 if(p.lateral)for(const side of [-1,1])ell(g,side*rx*.98,0,0,.018,.035,rz*.85,p.lateral);
 if(p.neon)for(const side of [-1,1]){ell(g,side*rx*.98,.035,0,.018,.025,rz*.9,0x80bbc2);ell(g,side*rx*.96,-.055,p.redBelly?0:-rz*.3,.018,.04,p.redBelly?rz*.8:rz*.43,0xbc8b80);}
 if(p.saddle)ell(g,0,ry*.7,-.1,rx*.88,ry*.3,rz*.7,p.saddle);
 if(p.rings)for(const side of [-1,1])for(let i=0;i<6;i++){const z=-rz*.55+(i%3)*rz*.52,y=(i>2?.16:-.11)*ry*2;ell(g,side*rx*.97,y,z,.02,.08,.095,0x779fac);ell(g,side*rx*1.02,y,z,.012,.047,.06,color);}
}
function fish(g,color,p){
 const body=p.body||'deep',rx=body==='puff'?.47:body==='stocky'?.31:body==='slender'||body==='long'?.18:.21,ry=body==='puff'?.47:body==='tall'?.55:body==='disk'||body==='round'?.49:body==='diamond'?.43:body==='slender'||body==='long'?.21:.35,rz=body==='long'?1.18:body==='slender'?.85:body==='puff'?.5:body==='round'?.48:.65;
 ell(g,0,0,0,rx,ry,rz,color);ell(g,0,-ry*.45,rz*.16,rx*.84,ry*.42,rz*.65,0xd5d7bb);
 const head=p.head||rx*.85;ell(g,0,-.005,rz*.8,head,ry*.59,rx*.8,color);
 if(p.snout)ell(g,0,-ry*.17,rz+.04,rx*.48,ry*.27,p.snout,color);
 if(p.jaw)ell(g,0,-ry*.39,rz*.95,rx*.8,.07,.27,color);
 if(p.parrot)ell(g,0,-.04,rz+.13,.13,.12,.13,0xd2ccac);
 else ell(g,0,-.025,rz+(p.snout||.08)*.8,.045,.045,.025,0x7d8c72);
 for(const s of [-1,1]){if(p.mask)ell(g,s*rx*.82,ry*.15,rz*.57,.025,ry*.42,.1,0x50695d);eye(g,s*rx*.85,ry*.24,rz*.67,.032);if(p.cheek)ell(g,s*rx*.88,-ry*.1,rz*.58,.025,.12,.12,p.cheek);}
 const fc=p.fin||color;sideFins(g,rx,ry,rz,fc,p.lion?.72:body==='puff'?.28:.42);
 fin(g,0,ry*.69,rz*.12,rz*.95,p.dorsal||ry*.7,1,fc,'swept',[0,Math.PI/2,0]);
 fin(g,0,-ry*.69,rz*.05,rz*.72,-(p.flowing?.63:ry*.52),1,fc,'swept',[0,Math.PI/2,0]);
 if(p.adipose)fin(g,0,ry*.72,-rz*.62,.2,.12,1,fc,'round',[0,Math.PI/2,0]);
 fishTail(g,-rz*.86,p.tailColor||fc,p.tail,body==='long'?.55:body==='puff'?.3:p.flowing?.74:.51);
 markings(g,p,rx,ry,rz,color);
 if(p.trigger)fin(g,0,ry*.8,rz*.28,.16,.35,1,fc,'swept',[0,Math.PI/2,0]);
 if(p.banner)tube(g,[[0,ry*.65,.15],[0,ry+.3,-.05],[0,ry+p.banner,-.4],[0,ry+p.banner*.9,-.7]],.022,0xe1ddc0);
 if(p.lion){for(let i=0;i<9;i++){const z=-.55+i*.13;beam(g,[0,ry*.7,z],[0,ry+.38+Math.sin(i*.45)*.2,z-.21],.018,i%2?0x795e4b:0xe6d4ad);}for(const s of [-1,1])for(let i=0;i<6;i++)beam(g,[s*rx*.6,-.02,.16],[s*(.42+i*.1),-.05,-.14-i*.08],.015,0xe2cc9f);}
 if(p.spines)for(let i=0;i<28;i++){const a=i*2.4,y=(i%7-3)/3*.4,x=Math.cos(a)*Math.sqrt(Math.max(0,.47*.47-y*y)),z=Math.sin(a)*Math.sqrt(Math.max(0,.47*.47-y*y));beam(g,[x,y,z],[x*1.23,y*1.23,z*1.23],.016,0xd6c8a3);}
 if(p.flowing)for(let i=0;i<7;i++){fin(g,0,-ry*.7,-.15-i*.075,.25,-.3-i*.055,1,i%2?fc:0xc2a3a3,'round',[0,Math.PI/2,0]);}
 if(p.feelers)for(const s of [-1,1])tube(g,[[s*.07,-.26,.18],[s*.09,-.65,.09],[s*.1,-.9,-.08]],.012,color);
 if(p.barbels)for(const s of [-1,1])for(let i=0;i<3;i++)tube(g,[[s*rx*.5,-ry*.25,rz*.85],[s*(.28+i*.08),-ry*.4,rz+.07],[s*(.43+i*.08),-ry*.6,rz-.12-i*.08]],.013,0xd7d1b1);
 if(p.scutes)for(let i=0;i<9;i++)for(const s of [-1,0,1]){const q=cone(g,.065,.1,s*rx*.82,s===0?ry:0,-rz*.7+i*rz*.17,0xc6ccb0,5);if(s)q.rotation.z=-s*Math.PI/2;}
}
function shark(g,color,p){const rx=p.whale?.47:p.slender?.23:.32,ry=p.whale?.37:p.slender?.22:.3,rz=p.whale?1.35:1.15;
 ell(g,0,0,0,rx,ry,rz,color);ell(g,0,-ry*.57,.13,rx*.84,ry*.4,rz*.9,0xdce1cb);
 ell(g,0,0,rz*.68,p.hammer?.63:rx*.93,ry*.76,p.hammer?.15:.45,color);
 if(p.hammer){for(const s of [-1,1]){ell(g,s*.6,0,rz*.73,.13,.11,.21,color);eye(g,s*.68,.035,rz*.82,.03);}}
 else for(const s of [-1,1])eye(g,s*rx*.85,.055,rz*.88,.031);
 for(const s of [-1,1]){fin(g,s*rx*.52,-.07,.25,s*(p.whale?.9:.82),.6,1,color,'swept',[Math.PI/2,0,0]);for(let i=0;i<4;i++)beam(g,[s*rx*.96,.09,.38-i*.07],[s*rx*.98,-.1,.35-i*.07],.012,0x6b8980);}
 fin(g,0,ry*.6,0,.6,p.dorsal,1,color,'swept',[0,Math.PI/2,0]);fin(g,0,ry*.6,-.64,.24,.21,1,color,'swept',[0,Math.PI/2,0]);
 fishTail(g,-rz*.88,color,'shark',p.tail);if(p.blacktips)fin(g,0,ry*.65+p.dorsal*.45,-.34,.19,.15,1,0x5d7970,'swept',[0,Math.PI/2,0]);
 if(p.spots)for(let i=0;i<35;i++){const z=-rz*.8+(i%7)*rz*.25,x=(Math.floor(i/7)-2)*rx*.35;ell(g,x,ry*Math.sqrt(Math.max(0,1-(x/rx)**2))*.98,z,.022,.015,.035,p.whale?0xd2ddc4:0x637f6d);}
 if(p.whale)beam(g,[-.29,-.09,rz*.98],[.29,-.09,rz*.98],.017,0x546f65);
}
function ray(g,color,p){ell(g,0,0,.07,.44,.12,.61,color);for(const s of [-1,1]){fin(g,s*.11,0,0,s*p.wing,1.03,1,color,'ray',[Math.PI/2,0,0]);ell(g,s*.16,.12,.42,.075,.08,.09,color);eye(g,s*.18,.16,.48,.025);if(p.manta)tube(g,[[s*.15,0,.52],[s*.25,-.04,.73],[s*.31,.02,.79]],.055,color);}
 if(p.snout)ell(g,0,0,.58,.2,.08,p.snout,color);
 const t=new THREE.Group();t.position.z=-.47;tube(t,[[0,0,0],[0,.01,-p.tail*.45],[.04,.02,-p.tail]],p.manta?.035:.021,color);g.add(t);g.userData.tail=t;
 if(p.spots)for(let i=0;i<30;i++){const x=(i%6-2.5)*.3,z=(Math.floor(i/6)-2)*.16;if(Math.abs(x)<p.wing*(.85-Math.abs(z)*.6))ell(g,x,.04,z,.035,.015,.045,0xd0d7be);}
}
function mammal(g,color,p){const rx=p.manatee?.48:p.orca?.4:.32,ry=p.manatee?.4:.31,rz=p.orca?1.3:1.12;
 ell(g,0,0,0,rx,ry,rz,color);if(p.orca||p.dolphin)ell(g,0,-ry*.6,.16,rx*.75,ry*.45,rz*.8,0xd9e1cd);
 ell(g,0,.025,rz*.72,p.beluga?.34:p.manatee?.41:rx*.85,ry*.87,.37,color);
 if(p.snout)ell(g,0,-.07,rz*.99,.115,.1,p.snout,color);
 if(p.manatee)for(const s of [-1,1])ell(g,s*.13,-.08,rz*.98,.18,.16,.15,color);
 for(const s of [-1,1]){eye(g,s*rx*.78,.07,rz*.84,.029);if(p.orca)ell(g,s*rx*.9,.1,rz*.59,.025,.09,.19,0xe4e6d0);fin(g,s*rx*.65,-ry*.25,.28,s*(p.manatee?.48:.66),p.manatee?.48:.45,1,color,'round',[Math.PI/2,0,0]);}
 if(p.dorsal)fin(g,0,ry*.63,-.1,.6,p.dorsal,1,color,'swept',[0,Math.PI/2,0]);
 const t=new THREE.Group();t.position.z=-rz*.82;ell(t,0,0,-.16,.16,.14,.35,color);
 if(p.manatee)ell(t,0,0,-.49,.47,.07,.39,color);
 else for(const s of [-1,1])fin(t,0,0,-.33,s*(p.seal?.26:.62),p.seal?.5:.42,1,color,p.seal?'round':'swept',[Math.PI/2,0,0]);
 g.add(t);g.userData.tail=t;
 if(p.seal){for(const s of [-1,1])for(let i=0;i<4;i++)beam(g,[s*.09,-.05,rz*.98],[s*(.3+i*.025),-.08+i*.035,rz*.97],.007,0xe0ddc4);markings(g,p,rx,ry,rz,color);}
 if(p.beluga)ell(g,0,.17,rz*.72,.29,.22,.3,color);
}
function turtle(g,color,p){ell(g,0,0,0,.53,.24,.68,p.shell);ell(g,0,-.14,0,.49,.1,.64,0xc4c6a2);ell(g,0,-.03,.7,.17,.15,.27,color);for(const s of [-1,1]){eye(g,s*.12,.035,.87,.025);fin(g,s*.35,-.05,.31,s*p.flipper,.52,1,color,'round',[Math.PI/2,0,0]);fin(g,s*.32,-.08,-.42,s*.52,-.39,1,color,'round',[Math.PI/2,0,0]);}
 if(p.ridges)for(let i=-2;i<=2;i++)tube(g,[[i*.16,.08,-.52],[i*.19,.22,0],[i*.16,.12,.53]],.025,0xa3b4a0);
 else{for(const side of [-1,1])for(let i=0;i<4;i++)beam(g,[0,.24,-.42+i*.25],[side*.43,.12,-.5+i*.3],.014,0x667e61);beam(g,[0,.24,-.55],[0,.24,.55],.014,0x667e61);}
 const t=new THREE.Group();t.position.z=-.58;beam(t,[0,0,0],[0,-.02,-.28],.045,color);g.add(t);g.userData.tail=t;
}
function octopus(g,color,p){ell(g,0,.21,-.13,.35,.36,.39,color);ell(g,0,.04,.16,.28,.18,.3,color);for(const s of [-1,1]){ell(g,s*.25,.15,.24,.09,.1,.08,0xd0c6a5);eye(g,s*.28,.17,.29,.04);}
 const arms=new THREE.Group();arms.name='arms';for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a),z=Math.sin(a),points=[[x*.18,0,z*.18],[x*.51,-.11,z*.51],[x*.78,-.1,z*.78],[x*.88+Math.sin(a)*p.curl*.3,-.02,z*.88-Math.cos(a)*p.curl*.3],[x*.74+Math.sin(a)*p.curl*.5,.03,z*.74-Math.cos(a)*p.curl*.5]];tube(arms,points,.065,color);for(let j=0;j<3;j++)ell(arms,x*(.34+j*.15),-.15,z*(.34+j*.15),.032,.02,.034,0xdbcfb1);}
 g.add(arms);g.userData.tail=arms;if(p.rings)for(let i=0;i<12;i++){const a=i*2.4,x=Math.cos(a)*.3,y=.1+(i%3)*.11,z=-.1+Math.sin(a)*.3;ell(g,x,y,z,.062,.057,.024,0x6f9ba7);ell(g,x,y,z+.019,.032,.03,.012,color);}
}
function cephalopod(g,color,p){ell(g,0,0,-.18,p.cuttle?.32:.22,.2,p.cuttle?.66:.83,color);ell(g,0,-.015,.44,.23,.17,.25,color);for(const s of [-1,1]){eye(g,s*.22,.06,.45,.047);if(p.cuttle){for(let i=0;i<9;i++)ell(g,s*.3,Math.sin(i)*.025,-.68+i*.13,.1,.025,.1,i%2?color:0xd0cbb0);}else fin(g,s*.08,0,-.56,s*.45,.52,1,color,'swept',[Math.PI/2,0,Math.PI]);}
 const arms=new THREE.Group();arms.position.z=.55;for(let i=0;i<p.arms;i++){const a=i/p.arms*Math.PI*2,len=i<2&&p.squid?1.05:.5+(i%3)*.08;tube(arms,[[Math.cos(a)*.12,Math.sin(a)*.08,0],[Math.cos(a)*.22,Math.sin(a)*.1,len*.55],[Math.cos(a)*.28,Math.sin(a)*.12,len]],.025,color);}g.add(arms);g.userData.tail=arms;
}
function claw(g,x,y,z,side,size,color){const arm=new THREE.Group();arm.position.set(x,y,z);beam(arm,[0,0,0],[side*size*.55,0,size*.25],.055,color);ell(arm,side*size*.7,0,size*.42,.11,.08,size*.23,color);for(const q of [-1,1])beam(arm,[side*size*.7+q*.055,0,size*.5],[side*size*.7+q*.04,0,size*.76],.035,color);g.add(arm);g.userData.arms.push(arm);}
function crab(g,color,p){ell(g,0,.04,0,p.hermit?.3:.5,.18,.36,color);for(const s of [-1,1]){beam(g,[s*.13,.12,.23],[s*.17,.24,.31],.025,color);eye(g,s*.17,.26,.32,.035);claw(g,s*.24,-.03,.15,s,p.claws,color);for(let i=0;i<4;i++){const l=new THREE.Group();l.position.set(s*.27,-.05,.12-i*.15);beam(l,[0,0,0],[s*.37,-.02,-.08],.028,color);beam(l,[s*.37,-.02,-.08],[s*.53,-.16,.01],.022,p.blue?0x719dac:color);g.add(l);g.userData.legs.push(l);}}
 if(p.hermit){ell(g,0,.27,-.27,.35,.37,.43,0xccbb98);const pts=[];for(let i=0;i<30;i++){const a=i/29*Math.PI*4.4,r=.25*(1-i/36);pts.push([Math.cos(a)*r,.3+Math.sin(a)*r,-.64+i*.004]);}tube(g,pts,.035,0x9b8d6e);}
 else for(let i=-3;i<=3;i++)cone(g,.055,.1,i*.12,.12,-.31,color,5).rotation.x=-.7;
}
function crustacean(g,color,p){for(let i=0;i<7;i++)ell(g,0,.04+Math.sin(i*.6)*.07,-.6+i*.16,.18+Math.sin(i*.5)*.035,.15,.13,i%2?color:0xa4b8a0);ell(g,0,.12,.42,.22,.2,.3,color);
 for(const s of [-1,1]){beam(g,[s*.12,.2,.48],[s*.18,.3,.61],.022,color);eye(g,s*.18,.32,.63,p.mantis?.045:.028);tube(g,[[s*.13,.18,.6],[s*.3,.28,.9],[s*.49,.25,.75+(p.antenna||.6)]],.013,0xd1c6a4);for(let i=0;i<5;i++){const l=new THREE.Group();l.position.set(s*.16,-.06,.22-i*.15);beam(l,[0,0,0],[s*.2,-.11,.1],.018,color);beam(l,[s*.2,-.11,.1],[s*.37,-.17,.13],.014,color);g.add(l);g.userData.legs.push(l);}if(p.lobster)claw(g,s*.18,.04,.36,s,p.claws,color);if(p.mantis){beam(g,[s*.16,.03,.5],[s*.3,-.06,.7],.055,color);ell(g,s*.27,-.02,.73,.09,.08,.12,0xc2aa79);}}
 const t=new THREE.Group();t.position.z=-.7;for(let i=-2;i<=2;i++){const e=ell(t,i*.08,0,-.1,.075,.035,.21,color);e.rotation.y=-i*.3;}g.add(t);g.userData.tail=t;
 if(p.lines)for(const s of [-1,1])tube(g,[[s*.05,.22,.54],[s*.06,.22,.12],[s*.05,.16,-.62]],.022,0xe4dfc7);
}
let bellGeometry;
function jelly(g,color,p){bellGeometry??=new THREE.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2);mesh(g,bellGeometry,mat(color),0,.1,0,p.radius,.38,p.radius);ell(g,0,.1,0,p.radius,.035,p.radius,0xdbe0c9);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;ell(g,Math.cos(a)*p.radius*.9,.075,Math.sin(a)*p.radius*.9,.11,.065,.11,color);if(p.striped)tube(g,[[Math.cos(a)*p.radius,.12,Math.sin(a)*p.radius],[Math.cos(a)*p.radius*.72,.35,Math.sin(a)*p.radius*.72],[0,.48,0]],.02,0xb69d7a);}
 const tendrils=new THREE.Group();for(let i=0;i<10;i++){const a=i*2.4,r=i<4?.15:p.radius*.65,len=p.short?.65+(i%3)*.12:1.5+(i%3)*.23;const pts=[];for(let j=0;j<6;j++)pts.push([Math.cos(a)*r+Math.sin(j*1.5+i)*.06,-j/5*len,Math.sin(a)*r+Math.cos(j*1.2+i)*.06]);tube(tendrils,pts,i<4?.037:.014,i<4?color:0xd9d8bc);}g.add(tendrils);g.userData.tail=tendrils;
 for(let i=0;i<4;i++){const a=i*Math.PI/2;ell(g,Math.cos(a)*.12,.16,Math.sin(a)*.12,.09,.04,.1,0xb4cabb);}
}
function seahorse(g,color,p){ell(g,0,0,0,.15,.34,.22,color);tube(g,[[0,.1,.08],[0,.36,-.03],[0,.57,.1],[0,.62,.3]],.1,color);ell(g,0,.6,.24,.13,.13,.17,color);ell(g,0,.55,.41,.065,.06,.2,color);for(const s of [-1,1])eye(g,s*.115,.63,.3,.025);
 const t=new THREE.Group();t.position.y=-.23;const pts=[];for(let i=0;i<26;i++){const a=i/25*Math.PI*2.1,r=.26*(1-i/34);pts.push([0,-.14-Math.sin(a)*r,-.08-Math.cos(a)*r]);}tube(t,pts,.055,color);g.add(t);g.userData.tail=t;
 fin(g,0,.02,-.19,.2,.3,1,0xc7cdb0,'round',[0,Math.PI/2,0]);for(let i=0;i<8;i++){const y=-.2+i*.095;cone(g,.035,.085,0,y,-.18,color,5).rotation.x=-Math.PI/2;}
 if(p.leaves)for(let i=0;i<10;i++){const s=i%2?1:-1,y=-.15+i*.08,z=i<6?-.12:.04;beam(g,[0,y,z],[s*.22,y+.06,z-.08],.018,color);const e=ell(g,s*.3,y+.09,z-.12,.18,.045,.09,0xc3cba0);e.rotation.z=s*.28;}
}
function starfish(g,color,p){ell(g,0,.03,0,.25,.09,.25,color);for(let i=0;i<p.arms;i++){const a=i*Math.PI*2/p.arms;const arm=ell(g,Math.sin(a)*.35,.02,Math.cos(a)*.35,.13,.065,.42,color);arm.rotation.y=a;for(let j=0;j<5;j++)ell(g,Math.sin(a)*(.18+j*.1),.085-j*.003,Math.cos(a)*(.18+j*.1),.025,.018,.025,0xd3b896);}}
function nautilus(g,color,p){ell(g,0,.1,-.2,.25,.49,.5,color);for(const s of [-1,1]){const pts=[];for(let i=0;i<34;i++){const a=i/33*Math.PI*4.6,r=.43*(1-i/40);pts.push([s*.235,.1+Math.cos(a)*r,-.2+Math.sin(a)*r]);}tube(g,pts,.023,0x9f8d6d);for(let i=0;i<p.bands;i++){const a=i/p.bands*Math.PI*2;beam(g,[s*.2,.1+Math.cos(a)*.25,-.2+Math.sin(a)*.25],[s*.12,.1+Math.cos(a)*.46,-.2+Math.sin(a)*.46],.027,0xb39a76);}}
 ell(g,0,-.16,.35,.21,.16,.27,color);for(const s of [-1,1])eye(g,s*.19,-.1,.43,.032);const arms=new THREE.Group();arms.position.set(0,-.17,.52);for(let i=0;i<12;i++){const a=i*Math.PI/6;tube(arms,[[Math.cos(a)*.1,Math.sin(a)*.08,0],[Math.cos(a)*.2,Math.sin(a)*.14,.26],[Math.cos(a)*.25,Math.sin(a)*.18,.4]],.015,0xc4b897);}g.add(arms);g.userData.tail=arms;
}
const byId=new Map(profiles.map(p=>['aqua-'+p[0],p]));
export function createExpandedAquatic(id){const p=byId.get(id);if(!p)return null;const [,,family,w,d,h,color,features]=p,g=creature(id);({fish,shark,ray,mammal,turtle,octopus,cephalopod,crab,crustacean,jelly,seahorse,starfish,nautilus})[family](g,color,features);g.userData.swimming=true;return fitCreature(g,w,d,h,{ground:false});}
