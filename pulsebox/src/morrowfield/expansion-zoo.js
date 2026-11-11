import {THREE,mesh,box,ell,cyl,cone,beam,gable,windowFront,door} from './building-kit.js';

const fences=[
 ['splitrail','Split-rail fence',1.65],['crossedrail','Cross-braced paddock fence',1.85],['picket','Pointed garden fence',1.65],['scalloped','Scalloped picket fence',1.85],['ranch','Four-rail ranch fence',1.85],['willow','Woven willow screen',2.3],['bamboo','Bamboo screen fence',2.6],['glass','Glass viewing barrier',1.8],['ironbar','Iron bar fence',2.25],['ironarch','Arched iron fence',2.7],['chainlink','Chain-link fence',2.5],['wildlife','Fine wildlife mesh',2.8],['stone','Dry-stone wall',1.65],['brick','Brick boundary wall',1.85],['gabion','Gabion stone barrier',1.65],['rope','Roped timber barrier',1.4],['palisade','Log palisade',2.6],['hedge','Living hedge fence',2.05],
];
const gates=[
 ['timbercross','Cross-braced timber gate',2],['doublefarm','Double farm gate',2],['picketarch','Arched picket gateway',3.25],['ironarch','Iron arch gateway',3.2],['bamboo','Bamboo garden gate',2.6],['stonearch','Stone arch gateway',3.7],['steel','Modern steel gate',2.4],['glass','Glazed habitat gate',2.5],['logportal','Log portal gate',3],['rope','Rope-and-timber gate',2],['lattice','Latticed garden gate',2.7],['ornate','Ornate conservatory gate',3.4],
];
const fixtures=[
 ['shelter-meadow','Open meadow shelter','shelter',0,6.6,5.4,4.5],['shelter-thatch','Thatched habitat hut','shelter',1,6.5,6.5,5.4],['shelter-cave','Stone den shelter','shelter',2,6.2,5.3,3.9],['shelter-penguin','Penguin nesting lodge','shelter',3,5.8,5.8,3.9],['shelter-reptile','Reptile basking house','shelter',4,5.5,4.5,3.5],['shelter-giraffe','Tall browsing shelter','shelter',5,7.4,6.4,8.4],['shelter-elephant','Broad savanna shelter','shelter',6,9,7.4,6.5],['shelter-roost','Elevated bird roost','shelter',7,5.4,5.2,6.5],['shelter-aviary','Mesh aviary pavilion','shelter',8,7,7,6.4],['shelter-kennel','Timber animal den','shelter',9,4.2,4.6,3.8],
 ['feeder-hay','Raised hay rack','food',0,3.4,2.8,2.5],['feeder-fruit','Fruit feeding table','food',1,3.2,2.8,2.3],['feeder-hopper','Grain hopper feeder','food',2,3,2.8,3.6],['feeder-hanging','Suspended browse basket','food',3,3.8,3,4],['feeder-trough','Long feeding trough','food',4,4.4,2.4,1.8],['feeder-bird','Roofed bird table','food',5,3,3,3.6],
 ['water-stone','Carved stone trough','water',0,4.3,2.8,1.7],['water-log','Hollow log trough','water',1,4.5,2.8,1.6],['water-basin','Raised drinking basin','water',2,3.6,3.6,2.2],['water-pool','Shallow habitat pool','water',3,5.6,4.7,1.2],['water-bottle','Small-animal water station','water',4,2.7,2.7,2.8],['water-fountain','Rock drinking fountain','water',5,4.3,3.6,2.7],
 ['enrichment-logs','Climbing log arrangement','enrichment',0,6.6,5.4,3.9],['enrichment-ropes','Rope climbing tower','enrichment',1,6.6,6,6],['enrichment-scratch','Scratching post cluster','enrichment',2,4.5,4.5,3.6],['enrichment-barrel','Rolling barrel platform','enrichment',3,4.5,3.6,2.6],
 ['viewing-hide','Timber wildlife hide','support',0,6.6,5.8,4.7],['viewing-platform','Raised viewing platform','support',1,6.8,6,3.7],['keeper-store','Habitat keeper store','support',2,5.5,5.2,4.5],['weigh-station','Animal weighing platform','support',3,5.5,4.8,3.2],
];
function ring(g,r,t,x,y,z,tone='iron',horizontal=false){const m=mesh(g,new THREE.TorusGeometry(r,t,6,18),tone,x,y,z);if(horizontal)m.rotation.x=Math.PI/2;return m;}
function posts(g,length,h,tone='wood',cap=true){for(const x of [-length/2+.12,length/2-.12]){box(g,.22,h,.22,x,h/2,0,tone);if(cap)cone(g,.2,.2,x,h+.1,0,tone,4);}}
function rails(g,length,h,n=3,tone='wood',z=0){for(let i=0;i<n;i++)box(g,length-.2,.13,.12,0,.35+i*(h-.55)/Math.max(1,n-1),z,tone);}
function pickets(g,length,h,n,scallop=false,tone='white'){for(let i=0;i<n;i++){const x=-length/2+.3+i*(length-.6)/(n-1),hh=h-(scallop?.45*Math.cos(x/length*Math.PI):0);box(g,.16,hh,.12,x,hh/2,0,tone);cone(g,.115,.22,x,hh+.1,0,tone,4);}}
function meshgrid(g,length,h,spacing=.45,diagonal=false){
 if(diagonal){for(let s=-h;s<=length;s+=spacing){const a=Math.max(0,s),b=Math.min(length,s+h),x1=-length/2+a,x2=-length/2+b;if(b-a<.001)continue;beam(g,[x1,.12+Math.max(0,-s),0],[x2,.12+Math.min(h,length-s),0],.012,'iron');beam(g,[-x1,.12+Math.max(0,-s),.025],[-x2,.12+Math.min(h,length-s),.025],.012,'iron');}}
 else {for(let x=-length/2;x<=length/2;x+=spacing)box(g,.018,h,.025,x,h/2+.1,0,'iron');for(let y=.1;y<=h+.1;y+=spacing)box(g,length,.018,.025,0,y,0,'iron');}
}
function fence(g,v,h){const l=4;
 if(v<5){posts(g,l,h);rails(g,l,h,v===4?4:2,v>1&&v<4?'white':'wood',.045);if(v===0)box(g,3.8,.18,.16,0,h*.52,0,'lightwood',0,0,.06);if(v===1)for(const s of [-1,1])beam(g,[-1.8*s,.3,0],[1.8*s,h-.25,0],.11,'wood',true);if(v===2||v===3)pickets(g,l,h-.3,12,v===3);return;}
 if(v===5){posts(g,l,h,'darkwood');for(let y=.18;y<h;y+=.15)for(let i=0;i<6;i++){const x=-1.85+i*.62;beam(g,[x,y,i%2?.04:-.04],[x+.6,y,i%2?-.04:.04],.035,'wood');}for(const x of [-1.6,-.8,0,.8,1.6])box(g,.06,h,.08,x,h/2,0,'darkwood');}
 if(v===6){for(let i=0;i<18;i++){const x=-1.9+i*.223,hh=h-.15+(i%3)*.05;cyl(g,.075,.09,hh,x,hh/2,0,i%2?'lightwood':'wood',7);for(let y=.4;y< hh;y+=.6)cyl(g,.093,.093,.035,x,y,0,'sand',7);}rails(g,l,h,2,'darkwood',.12);}
 if(v===7){posts(g,l,h,'iron',false);box(g,3.65,h-.25,.06,0,h/2,0,'glass');box(g,4,.08,.1,0,h-.04,0,'iron');}
 if(v===8||v===9){posts(g,l,h-.15,'iron');rails(g,l,h-.2,2,'iron');for(let i=0;i<13;i++){const x=-1.7+i*.283,hh=v===9?h-.2-.55*Math.abs(x)/1.7:h-.35;box(g,.055,hh,.06,x,hh/2,0,'iron');cone(g,.085,.18,x,hh+.08,0,'iron',4);if(v===9&&i%2===0)ring(g,.18,.025,x,.8,0,'iron');}}
 if(v===10||v===11){posts(g,l,h,'iron',false);rails(g,l,h,2,'iron');meshgrid(g,3.7,h-.2,v===10?.45:.28,v===10);if(v===11)for(const x of [-1.88,1.88])beam(g,[x,h-.15,0],[x,h+.25,-.3],.04,'iron');}
 if(v===12){for(let y=0;y<4;y++)for(let i=0;i<7;i++){const x=-1.7+i*.56+(y%2?.08:0);ell(g,x,.23+y*.35,0,.32,.23,.3,(i+y)%3?'stone':'sand');}}
 if(v===13){for(let y=0;y<6;y++)for(let i=0;i<8;i++)box(g,.46,.23,.38,-1.76+i*.5+(y%2?.06:0),.13+y*.25,0,(i+y)%3?'terracotta':'red');box(g,4.1,.16,.5,0,1.62,0,'cream');}
 if(v===14){box(g,4,.1,.7,0,.05,0,'iron');for(let i=0;i<16;i++)ell(g,-1.75+(i%8)*.5,.3+Math.floor(i/8)*.55,.1*Math.sin(i),.25,.28,.28,i%2?'stone':'sand');for(const z of [-.37,.37]){const sub=new THREE.Group();sub.position.z=z;meshgrid(sub,4,1.35,.3);g.add(sub);}for(const y of [.1,1.45])box(g,4,.05,.75,0,y,0,'iron');}
 if(v===15){posts(g,l,h-.15);for(const y of [.5,1.05])for(const [a,b] of [[-1.85,0],[0,1.85]]){beam(g,[a,y,0],[(a+b)/2,y-.18,0],.035,'sand');beam(g,[(a+b)/2,y-.18,0],[b,y,0],.035,'sand');}}
 if(v===16){for(let i=0;i<13;i++){const x=-1.85+i*.31,hh=h-.25+(i%3)*.1;cyl(g,.13,.16,hh,x,hh/2,0,'wood',8);cone(g,.13,.3,x,hh+.15,0,'lightwood',8);}rails(g,l,2,2,'darkwood',.18);}
 if(v===17){box(g,4,.3,.7,0,.15,0,'stone');for(let i=0;i<9;i++)ell(g,-1.75+i*.44,1.02,0,.35,.8,.4,i%2?'leaf':'leafDark');posts(g,l,1.5,'wood');}
}
function gate(g,v,h){const l=3;posts(g,l,v===2||v===3||v===5||v===8||v===11?2.3:h-.15,v===3||v===6||v===7||v===11?'iron':v===5?'stone':'wood');
 if(v===0||v===1){rails(g,l,1.65,v===1?4:3);for(const x of v===1?[-.67,.67]:[0]){const w=v===1?1.25:2.5;beam(g,[x-w/2,.35,.08],[x+w/2,1.65,.08],.09,'wood',true);if(v===0)beam(g,[x+w/2,.35,.08],[x-w/2,1.65,.08],.09,'wood',true);}if(v===1)box(g,.12,1.7,.15,0,.85,0,'wood');}
 if(v===2){pickets(g,l,1.7,9,true);rails(g,l,1.6,2,'white');const a=mesh(g,new THREE.TorusGeometry(1.38,.08,6,20,Math.PI),'white',0,2,0);box(g,.25,.08,.25,0,3.38,0,'white');}
 if(v===3||v===11){for(let i=0;i<9;i++){const x=-1.12+i*.28,hh=1.9+.5*Math.cos(x);box(g,.055,hh,.06,x,hh/2,0,'iron');cone(g,.07,.18,x,hh+.1,0,v===11?'yellow':'iron',4);if(v===11)for(const y of [.6,1.3])ring(g,.12,.025,x,y,0,'yellow');}rails(g,l,2,2,'iron');mesh(g,new THREE.TorusGeometry(1.38,.07,6,20,Math.PI),v===11?'yellow':'iron',0,1.8,0);}
 if(v===4){for(let i=0;i<12;i++){const x=-1.2+i*.218;cyl(g,.07,.08,2.1,x,1.05,0,'lightwood',7);for(const y of [.4,1,1.6])cyl(g,.085,.085,.04,x,y,0,'sand',7);}for(const y of [.3,1.8])box(g,2.6,.1,.15,0,y,.1,'darkwood');box(g,3.2,.2,.3,0,2.4,0,'wood');}
 if(v===5){for(const x of [-1.35,1.35])box(g,.45,2.25,.7,x,1.125,0,'stone');const outer=new THREE.Shape();outer.absarc(0,0,1.6,0,Math.PI,false);outer.lineTo(-1.17,0);outer.absarc(0,0,1.17,Math.PI,0,true);outer.closePath();mesh(g,new THREE.ExtrudeGeometry(outer,{depth:.7,bevelEnabled:false,curveSegments:12}),'stone',0,2,-.35);for(let i=0;i<9;i++)box(g,.2,1.9,.14,-1.05+i*.263,.95,0,'darkwood');}
 if(v===6){for(let i=0;i<8;i++)box(g,.25,1.95,.12,-1.08+i*.31,.975,0,'slate');box(g,2.7,.12,.16,0,2.05,0,'iron');box(g,.3,.12,.08,.85,1.05,.12,'cream');}
 if(v===7){box(g,2.4,1.85,.07,0,1.05,0,'glass');for(const x of [-1.2,0,1.2])box(g,.07,2,.1,x,1.05,0,'iron');box(g,2.55,.08,.1,0,2.08,0,'iron');box(g,.1,.5,.12,.15,1,.1,'cream');}
 if(v===8){for(const x of [-1.4,1.4])cyl(g,.16,.21,2.7,x,1.35,0,'bark',9);const lintel=cyl(g,.15,.18,3.25,0,2.65,0,'bark',9);lintel.rotation.z=Math.PI/2;rails(g,l,1.7,3,'wood');for(const x of [-.9,-.45,0,.45,.9])box(g,.11,1.6,.14,x,.8,0,'wood');}
 if(v===9){rails(g,l,1.65,2,'wood');for(const x of [-1,-.5,0,.5,1])beam(g,[x,.35,0],[-x,1.45,0],.035,'sand');box(g,2.5,.08,.12,0,.9,0,'wood');}
 if(v===10){rails(g,l,2.15,2,'white');meshgrid(g,2.45,2,.36,true);box(g,2.7,.15,.18,0,2.25,0,'white');for(const x of [-1.35,1.35])ell(g,x,2.5,0,.15,.18,.15,'yellow');}
 for(const x of [-1.22,1.22])for(const y of [.45,1.4])box(g,.22,.1,.08,x,y,.15,'iron');
}
function shelter(g,v){
 if(v===2){for(const x of [-1.9,1.9])ell(g,x,1.15,0,.95,1.15,1.85,'stone');ell(g,0,2.45,0,2.35,.85,1.95,'stone');for(const x of [-1.2,1.1])ell(g,x,.25,1.7,.65,.25,.5,'sand');return;}
 if(v===3){cyl(g,2.15,2.3,1.1,0,.55,0,'stone',16);const d=mesh(g,new THREE.SphereGeometry(2.15,16,8,0,Math.PI*2,0,Math.PI/2),'cream',0,1.1,0);box(g,1.3,1.3,1.6,0,.65,1.6,'stone');box(g,.85,1,.04,0,.5,2.42,'darkwood');for(let i=0;i<8;i++)box(g,.3,.12,.1,-1.4+i*.4,1.4,1.7,'stone');return;}
 if(v===8){cyl(g,2.7,2.7,.2,0,.1,0,'stone',12);for(let i=0;i<12;i++){const a=i*Math.PI/6;box(g,.07,3.5,.07,Math.cos(a)*2.6,1.85,Math.sin(a)*2.6,'iron');beam(g,[Math.cos(a)*2.6,3.6,Math.sin(a)*2.6],[0,5.4,0],.055,'iron');}for(const y of [.8,1.6,2.4,3.2])ring(g,2.6,.025,0,y,0,'iron',true);cone(g,2.9,1.8,0,4.5,0,'glass',12);beam(g,[-1.5,2,0],[1.5,2.8,0],.08,'wood');return;}
 if(v===1){cyl(g,2.3,2.4,2,0,1,0,'wood',12);for(let i=0;i<14;i++){const a=i*Math.PI/7;box(g,.07,2,.07,Math.cos(a)*2.35,1,Math.sin(a)*2.35,'lightwood');}cone(g,3,2.4,0,3.2,0,'sand',12);door(g,0,2.38,.15,1.1,1.85,'darkwood');return;}
 const tall=v===5,w=v===6?7:v===5?5.8:v===9?3:4.6,d=v===6?5.4:v===9?3.2:3.8,h=tall?6.3:v===6?4.1:v===7?3.5:2.6,y=v===7?1.4:0;
 box(g,w,.18,d,0,.09+y,0,'wood');for(const x of [-w/2+.15,w/2-.15])for(const z of [-d/2+.15,d/2-.15])box(g,.18,h+y,.18,x,(h+y)/2,z,'wood');
 if(v!==0&&v!==5&&v!==6){box(g,w,h*.75,.14,0,y+h*.4,-d/2,'wood');for(const x of [-w/2,w/2])box(g,.14,h*.75,d,x,y+h*.4,0,'wood');}
 if(v===4){box(g,w,.16,d,0,y+h,0,'glass',-.15);for(let i=0;i<6;i++)box(g,.08,.08,d,-w/2+i*w/5,y+h+.1,0,'wood',-.15);box(g,w*.7,.35,d*.65,0,y+.35,0,'sand');}
 else gable(g,w+.55,d+.55,v===9?.9:1.2,y+h,v===9?'terracotta':'roof');
 if(v===7){for(const z of [-1,0,1])beam(g,[-1.6,2.9,z],[1.6,3.15,z],.06,'wood');for(let i=0;i<5;i++)box(g,1.1,.1,.32,0,.2+i*.28,2.35-i*.22,'wood');}
 if(v===9){box(g,2.9,2.4,.12,0,1.2,1.62,'wood');box(g,1.15,1.7,.04,0,.85,1.7,'darkwood');}
}
function food(g,v){
 if(v===3){for(const x of [-1.4,1.4])box(g,.14,3.3,.14,x,1.65,0,'wood');box(g,3,.16,.16,0,3.3,0,'wood');for(const x of [-.6,.6])beam(g,[x,3.25,0],[x,1.65,0],.025,'iron');cyl(g,.75,.45,.7,0,1.3,0,'wood',10);for(let i=0;i<7;i++)ell(g,Math.sin(i)*.4,1.75,Math.cos(i)*.4,.2,.18,.2,'leaf');return;}
 if(v===5){cyl(g,.1,.2,2,0,1,0,'wood',8);box(g,1.7,.15,1.5,0,2,0,'wood');for(const x of [-.65,.65])box(g,.07,.7,.07,x,2.4,0,'wood');gable(g,2.1,1.9,.65,2.7,'terracotta');for(let i=0;i<7;i++)ell(g,Math.sin(i)*.45,2.12,Math.cos(i)*.4,.055,.035,.055,'yellow');return;}
 const w=v===4?3.4:2.3;for(const x of [-w/2+.2,w/2-.2])for(const z of [-.6,.6])box(g,.1,.8,.1,x,.4,z,'wood');box(g,w,.18,1.5,0,.82,0,'wood');
 if(v===0){for(const z of [-.65,.65])for(let i=0;i<7;i++)beam(g,[-w/2+.15+i*(w-.3)/6,.85,z*.55],[-w/2+.15+i*(w-.3)/6,1.75,z],.055,'wood');ell(g,0,1.15,0,.9,.4,.45,'sand');}
 if(v===1){for(let i=0;i<9;i++)ell(g,-.75+(i%3)*.7,1.1,Math.floor(i/3)*.45-.45,.2,.16,.18,i%2?'yellow':'terracotta');}
 if(v===2){cyl(g,.85,.35,1.4,0,1.65,0,'stone',8);cone(g,1,.6,0,2.65,0,'roof',8);box(g,1.1,.12,.4,0,.98,.65,'sand');}
 if(v===4){for(const z of [-.65,.65])box(g,w,.45,.12,0,1,z,'wood');for(const x of [-w/2,w/2])box(g,.12,.45,1.4,x,1,0,'wood');box(g,w-.2,.1,1.2,0,1.15,0,'sand');}
}
function water(g,v){
 if(v===0||v===1){const w=v===0?3.4:3.6;box(g,w,.35,1.7,0,.175,0,v===0?'stone':'wood');for(const z of [-.75,.75])box(g,w,.55,.2,0,.55,z,v===0?'stone':'bark');for(const x of [-w/2+.1,w/2-.1])box(g,.2,.55,1.7,x,.55,0,v===0?'stone':'wood');box(g,w-.35,.035,1.3,0,.65,0,'water');if(v===1)for(const x of [-1.3,1.3]){const m=cyl(g,.32,.32,1.9,x,.33,0,'bark',10);m.rotation.x=Math.PI/2;}return;}
 if(v===2){cyl(g,.35,.65,1,0,.5,0,'stone',12);cyl(g,1.25,.65,.45,0,1.2,0,'cream',16);cyl(g,1.1,1.1,.04,0,1.45,0,'water',16);return;}
 if(v===3){ell(g,0,.18,0,2.3,.18,1.8,'stone');ell(g,0,.27,0,2.05,.06,1.55,'water');for(let i=0;i<10;i++){const a=i*Math.PI/5;ell(g,Math.cos(a)*2.2,.35,Math.sin(a)*1.7,.3,.25,.26,'sand');}return;}
 if(v===4){box(g,.15,2.1,.15,0,1.05,0,'wood');cyl(g,.3,.3,.8,0,1.55,.2,'glass',12);cone(g,.3,.3,0,1,.2,'iron',12);beam(g,[0,.9,.2],[0,.75,.6],.055,'iron');cyl(g,.5,.5,.12,0,.06,.5,'stone',12);return;}
 if(v===5){ell(g,0,.7,-.35,1.25,.7,.8,'stone');ell(g,0,1.35,-.45,.8,.55,.6,'stone');box(g,.65,.045,1.1,0,1.1,.5,'water');cyl(g,1.2,1.25,.25,0,.125,.35,'stone',16);cyl(g,1.05,1.05,.04,0,.28,.35,'water',16);}
}
function enrichment(g,v){
 if(v===0){for(const [x,z,h] of [[-2,-1,1.8],[1.6,-1,2.7],[0,1.6,1.4]])cyl(g,.2,.28,h,x,h/2,z,'bark',9);beam(g,[-2,1.8,-1],[1.6,2.7,-1],.22,'bark');beam(g,[1.6,2.7,-1],[0,1.4,1.6],.18,'bark');beam(g,[0,1.4,1.6],[-2,.5,-1],.15,'bark');return;}
 if(v===1){for(const [x,z,h] of [[-2,-1.6,4.4],[2,-1.6,3.6],[0,1.8,4.8]]){cyl(g,.14,.23,h,x,h/2,z,'wood',9);box(g,1.4,.15,1.4,x,h-.35,z,'wood');}for(let i=0;i<6;i++){const t=i/5;beam(g,[-2+4*t,3.8-t*.65,-1.6],[-1+2*t,2.4+.3*Math.sin(t*Math.PI),.1],.025,'sand');}for(const y of [1.2,2,2.8])beam(g,[-2,y,-1.6],[0,y+.4,1.8],.035,'sand');return;}
 if(v===2){for(let i=0;i<3;i++){const a=i*2.1,x=Math.cos(a)*1,z=Math.sin(a)*1,h=1.7+i*.4;cyl(g,.15,.22,h,x,h/2,z,'wood',8);for(let y=.2;y<h;y+=.14)ring(g,.2,.035,x,y,z,'sand',true);box(g,.5,.13,.5,x,h,z,'wood');}return;}
 if(v===3){box(g,3.5,.2,2.6,0,.1,0,'wood');const m=cyl(g,.65,.65,2.1,0,.9,0,'wood',14);m.rotation.z=Math.PI/2;for(const x of [-.8,.8])ring(g,.67,.07,x,.9,0,'iron').rotation.y=Math.PI/2;for(const z of [-1.05,1.05])box(g,3.3,.15,.15,0,.32,z,'wood');}
}
function support(g,v){
 if(v===1){box(g,5.5,.25,4.4,0,1,0,'wood');for(const x of [-2.4,2.4])for(const z of [-1.8,1.8])box(g,.2,1,.2,x,.5,z,'wood');for(const z of [-2.05,2.05]){for(let x=-2.5;x<=2.5;x+=.5)box(g,.06,.9,.06,x,1.55,z,'wood');box(g,5.3,.08,.08,0,2,z,'wood');}for(let i=0;i<4;i++)box(g,1.7,.22*(i+1),.45,0,.11*(i+1),2.75-i*.3,'stone');return;}
 if(v===3){box(g,4.2,.25,3.5,0,.125,0,'iron');box(g,3.9,.04,3.2,0,.28,0,'stone');for(const x of [-2,2]){box(g,.1,2,.1,x,1,0,'iron');box(g,.1,.1,3.2,x,1.8,0,'iron');}box(g,.15,2.3,.15,1.9,1.15,-1.4,'iron');box(g,.6,.45,.2,1.9,2.4,-1.4,'darkglass');return;}
 const w=v===0?5:4,d=v===0?4:3.8;box(g,w,2.6,d,0,1.3,0,'wood');gable(g,w+.6,d+.6,1.1,2.7,'roof');
 if(v===0){for(const x of [-1.65,0,1.65])box(g,1.2,.65,.05,x,1.8,d/2+.03,'darkglass');box(g,w+.2,.15,.6,0,1.35,d/2+.15,'lightwood');for(let i=0;i<5;i++)box(g,w,.035,.04,0,.3+i*.45,d/2+.04,'darkwood');}
 else {door(g,-.7,d/2+.02,.15,1,2);windowFront(g,.9,1.5,d/2+.02,.8,.9);box(g,1,.75,.9,1.8,.375,1.9,'lightwood');}
}
const lookup=new Map();
export const ZOO_EXPANSION=[];
for(let i=0;i<fences.length;i++){const [slug,name,h]=fences[i],id=`zoo-fence-${slug}`;lookup.set(id,{family:'fence',v:i,h});ZOO_EXPANSION.push({id,name,category:'Zoo',kind:'decoration',tags:`fence barrier habitat individual segment ${slug}`,description:`A four-meter ${name.toLowerCase()} segment for drawing custom habitat boundaries.`,radius:2.35,height:h+.6,footprint:{halfX:2.2,halfZ:.65},collection:'world-expansion',lineKind:'fence',segmentLength:4,passable:false,obstacle:true});}
for(let i=0;i<gates.length;i++){const [slug,name,h]=gates[i],id=`zoo-gate-${slug}`;lookup.set(id,{family:'gate',v:i,h});ZOO_EXPANSION.push({id,name,category:'Zoo',kind:'decoration',tags:`gate fence closed habitat individual segment ${slug}`,description:`A three-meter ${name.toLowerCase()}, modeled closed for a custom habitat boundary.`,radius:1.95,height:h+.6,footprint:{halfX:1.75,halfZ:.65},collection:'world-expansion',lineKind:'fence',segmentLength:3,passable:false,obstacle:true});}
for(const [slug,name,family,v,w,d,h] of fixtures){const id=`zoo-${slug}`;lookup.set(id,{family,v,h});ZOO_EXPANSION.push({id,name,category:'Zoo',kind:'decoration',tags:`zoo habitat animal ${family} ${slug.replaceAll('-',' ')}`,description:`${name}, built from original detailed geometry for furnishing animal habitats.`,radius:Math.hypot(w/2,d/2),height:h,footprint:{halfX:w/2,halfZ:d/2},collection:'world-expansion',passable:false,...(family==='shelter'?{structure:true,shelter:true}:{}),...(family==='support'&&v!==3?{structure:true}:{}),...(['food','water'].includes(family)?{attracts:family}:{}),...(family==='water'?{waterFriendly:true}:{}),obstacle:true});}
export function createExpandedZoo(id){const s=lookup.get(id);if(!s)return null;const g=new THREE.Group();g.name=id;({fence,gate,shelter,food,water,enrichment,support})[s.family](g,s.v,s.h);return g;}
