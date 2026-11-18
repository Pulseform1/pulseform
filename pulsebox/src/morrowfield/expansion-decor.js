import {THREE,mesh,box,ell,cyl,cone,beam,gable,windowFront,door,planter} from './building-kit.js';

const specs=[
 ['slat-bench','Slatted garden bench','seating',0,3.2,1.6,1.8],['crescent-bench','Crescent stone bench','seating',1,3.6,3.1,1.4],['picnic-table','Family picnic table','seating',2,3.4,3.3,1.7],['park-chair','Timber park chair','seating',3,1.9,1.9,1.8],['swing-seat','Porch swing seat','seating',4,3.6,2.4,3.4],['sun-lounger','Reclining sun lounger','seating',5,1.9,3.4,1.6],
 ['twin-lantern','Twin village lantern','lighting',0,3.4,1.4,5.8],['arc-streetlight','Curved street lamp','lighting',1,3.8,1.6,6.3],['garden-bollards','Garden bollard trio','lighting',2,3.4,2.4,1.6],['three-arm-light','Three-arm plaza lamp','lighting',3,3.8,3.8,5.8],['courtyard-lamp','Courtyard lantern pillar','lighting',4,1.9,1.9,3.6],['solar-lamp','Solar path light','lighting',5,2.7,2.7,5.4],
 ['obelisk','Sunstone obelisk','sculpture',0,2.7,2.7,5.8],['spiral-sculpture','Copper spiral sculpture','sculpture',1,3.5,3.5,4.5],['stone-heron','Carved heron','sculpture',2,3,3,3.8],['armillary','Garden armillary sphere','sculpture',3,3.6,3.6,4.4],['abstract-arch','Modern arch sculpture','sculpture',4,4.4,2.6,4.6],['cairn','Balanced stone cairn','sculpture',5,3,3,3.6],
 ['bowl-fountain','Round bowl fountain','fountain',0,4.6,4.6,2.7],['wall-cascade','Stepped water wall','fountain',1,4.6,4.6,4.2],['bubbler-stones','Bubbler stone trio','fountain',2,4.4,4.4,2.4],['lotus-fountain','Lotus fountain','fountain',3,4.6,4.6,3.9],['wishing-well','Timber wishing well','fountain',4,4,4,4.3],['rill','Garden water rill','fountain',5,2.8,5.6,1.9],
 ['rose-arch','Climbing rose arch','garden',0,4,2.7,4.5],['pergola','Garden pergola','garden',1,5.8,4.8,4.4],['fan-trellis','Fan garden trellis','garden',2,3.6,1.8,3.8],['tiered-planter','Tiered herb planter','garden',3,3.6,3.2,2.8],['wind-chimes','Bamboo wind chimes','garden',4,2.8,2.8,3.8],['sundial','Stone sundial','garden',5,2.8,2.8,2.4],
 ['swings','Double playground swings','play',0,5.4,3.6,4.4],['seesaw','Timber seesaw','play',1,5.3,2.4,2.5],['slide','Curved playground slide','play',2,3.6,5.2,3.9],['climbing-frame','Geometric climbing frame','play',3,4.8,4.8,3.8],['sandbox','Covered sandpit','play',4,4.8,4.8,3.8],['roundabout','Playground roundabout','play',5,4.8,4.8,2.4],
 ['street-clock','Village street clock','street',0,2.7,2.4,5.3],['mail-pillar','Postal pillar box','street',1,1.6,1.6,2.3],['newspaper-kiosk','Newspaper kiosk','street',2,3.9,3.5,3.8],['drinking-tap','Public drinking fountain','street',3,2.2,1.9,1.8],['phone-box','Vintage telephone box','street',4,2.3,2.3,3.5],['bus-stop','Sheltered bus stop','street',5,5.8,2.9,3.8],
 ['produce-cart','Vegetable handcart','market',0,3.8,3.2,2.5],['flower-cart','Flower seller’s cart','market',1,3.8,3.2,3.6],['fish-stall','Harbor fish stall','market',2,4.4,3.4,3.7],['canvas-stall','Striped market canopy','market',3,4.8,3.8,4.1],['bread-stall','Bakery market stall','market',4,4.4,3.4,3.8],['barrel-rack','Cooper’s barrel rack','market',5,3.8,3.3,2.7],
 ['bicycle-rack','Loop bicycle rack','utility',0,4,2.4,1.7],['recycling-bins','Recycling bin station','utility',1,4.1,2.1,2.1],['tool-chest','Garden tool chest','utility',2,3.8,2.6,2.6],['pallet-stack','Timber pallet stack','utility',3,3.8,3.4,2.7],['cable-spool','Wooden cable spool','utility',4,3,3,2.7],['hand-pump','Cast-iron hand pump','utility',5,2.3,2.3,2.9],
 ['harbor-buoys','Harbor buoy cluster','coastal',0,3.8,3.8,3.4],['life-ring','Life ring station','coastal',1,2.4,2.2,3.1],['beach-umbrella','Striped beach parasol','coastal',2,4.6,4.6,3.6],['mooring-posts','Roped mooring posts','coastal',3,4.4,2.5,2.1],['lifeguard-chair','Lifeguard lookout chair','coastal',4,3.6,3.6,4.5],['rowboat','Moored wooden rowboat','coastal',5,3.8,5.8,2.1],
];
function ring(g,r,t,x,y,z,tone='iron',horizontal=false){const m=mesh(g,new THREE.TorusGeometry(r,t,6,20),tone,x,y,z);if(horizontal)m.rotation.x=Math.PI/2;return m;}
function slats(g,w,d,x,y,z,tone='wood',n=6){for(let i=0;i<n;i++)box(g,w,.12,d/n*.82,x,y,z-d/2+(i+.5)*d/n,tone);}
function legs(g,w,d,h,y=0,tone='iron'){for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])box(g,.12,h,.12,x,y+h/2,z,tone);}
function lantern(g,x,y,z,size=.5){box(g,size,.75,size,x,y,z,'glass');for(const xx of [-size/2,size/2])for(const zz of [-size/2,size/2])box(g,.055,.8,.055,x+xx,y,z+zz,'iron');cone(g,size*.85,.38,x,y+.57,z,'roof',4);box(g,size+.15,.12,size+.15,x,y-.42,z,'iron');}
function barrel(g,x,y,z,s=1){cyl(g,.4*s,.4*s,.9*s,x,y+.45*s,z,'wood',12);ell(g,x,y+.45*s,z,.47*s,.43*s,.47*s,'wood');for(const yy of [.16,.73])cyl(g,.455*s,.455*s,.065*s,x,y+yy*s,z,'iron',12);}
function plant(g,x,y,z,s=.5,tone='leaf'){cyl(g,s*.7,s*.5,s*.65,x,y+s*.325,z,'terracotta',8);ell(g,x,y+s,z,s,.55*s,s,tone);}
function seating(g,v){
 if(v===1){for(let i=0;i<7;i++){const a=(i-3)*.24,x=Math.sin(a)*1.35,z=Math.cos(a)*1.35-.75;box(g,.48,.25,.55,x,.72,z,'stone',0,a);box(g,.26,.6,.3,x,.3,z,'stone');}return;}
 if(v===2){legs(g,2,1.3,1.1);slats(g,2.8,1.4,0,1.15,0,'lightwood',6);for(const z of [-1.1,1.1]){slats(g,2.8,.4,0,.64,z,'wood',3);for(const x of [-.9,.9])beam(g,[x,.06,z],[x,1.1,0],.09,'wood',true);}return;}
 if(v===5){legs(g,.85,2.05,.45);slats(g,1.2,2.4,0,.52,0,'cream',9);for(let i=0;i<4;i++)box(g,1.2,.12,.22,0,.65+i*.18,-1.1-i*.12,'cream',-.7);return;}
 const w=v===3?1.05:2.5;legs(g,w-.3,.65,.65);slats(g,w,.9,0,.72,0,'wood',5);for(let i=0;i<3;i++)box(g,w,.17,.12,0,1+i*.22,-.43,'wood');for(const x of [-w/2,w/2]){box(g,.12,.5,.12,x,.95,.13,'iron');box(g,.14,.1,.8,x,1.2,0,'wood');}
 if(v===4){for(const x of [-1.5,1.5])for(const z of [-.8,.8])beam(g,[x,.06,z],[x,2.8,0],.09,'wood');box(g,3.3,.16,.16,0,2.85,0,'wood');for(const x of [-1,1])for(const z of [-.3,.3])beam(g,[x,.78,z],[x,2.8,0],.025,'iron');}
}
function lighting(g,v){
 if(v===2){for(let i=0;i<3;i++){const x=(i-1)*1.05,z=i%2*.6,h=.65+i*.23;cyl(g,.15,.19,h,x,h/2,z,'stone',10);box(g,.33,.18,.33,x,h+.09,z,'glass');cone(g,.27,.17,x,h+.26,z,'roof',8);}return;}
 if(v===4){box(g,.8,2,.8,0,1,0,'stone');box(g,1.1,.18,1.1,0,2.05,0,'cream');lantern(g,0,2.65,0,.65);return;}
 const h=v===1?4.8:4.15;cyl(g,.065,.16,h,0,h/2,0,'iron',10);cyl(g,.32,.4,.2,0,.1,0,'stone',12);
 if(v===0){box(g,2.4,.1,.1,0,h-.25,0,'iron');for(const x of [-1.1,1.1])lantern(g,x,h-.55,0,.46);}
 else if(v===1){beam(g,[0,h-.9,0],[.5,h+.2,0],.07,'iron');beam(g,[.5,h+.2,0],[1.45,h+.4,0],.07,'iron');box(g,.75,.16,.42,1.45,h+.22,0,'cream');}
 else if(v===3){for(let i=0;i<3;i++){const a=i*2.094,x=Math.sin(a)*1.2,z=Math.cos(a)*1.2;beam(g,[0,h-.6,0],[x,h, z],.055,'iron');lantern(g,x,h-.4,z,.4);}}
 else {box(g,1.8,.12,1.2,0,h+.1,0,'darkglass',.2);for(const x of [-.8,-.4,0,.4,.8])box(g,.025,.03,1.18,x,h+.18,0,'cream',.2);box(g,.6,.14,.5,.5,h-.6,0,'cream');}
}
function sculpture(g,v){cyl(g,1,1.15,.35,0,.175,0,'stone',12);
 if(v===0){cyl(g,.36,.75,4.1,0,2.4,0,'cream',4);cone(g,.51,.9,0,4.9,0,'cream',4);}
 if(v===1){for(let i=0;i<14;i++){const a=i*.5,r=.85-i*.025;ell(g,Math.cos(a)*r,.55+i*.22,Math.sin(a)*r,.26,.18,.26,'terracotta');if(i)beam(g,[Math.cos(a-.5)*(r+.025),.33+i*.22,Math.sin(a-.5)*(r+.025)],[Math.cos(a)*r,.55+i*.22,Math.sin(a)*r],.11,'terracotta');}}
 if(v===2){for(const x of [-.2,.2])beam(g,[x,.35,0],[x,1.6,.05],.065,'stone');ell(g,0,1.85,0,.5,.55,.75,'cream');beam(g,[0,2.1,-.35],[0,2.7,-.6],.16,'cream');ell(g,0,2.85,-.6,.2,.23,.3,'cream');beam(g,[0,2.84,-.8],[0,2.8,-1.15],.075,'sand');}
 if(v===3){cyl(g,.2,.35,1.5,0,1.1,0,'stone',10);for(const a of [0,Math.PI/2])ring(g,1,.055,0,2.65,0,'yellow').rotation.y=a;ring(g,1.05,.06,0,2.65,0,'yellow',true);beam(g,[-.6,1.65,0],[.6,3.65,0],.035,'iron');ell(g,0,2.65,0,.24,.24,.24,'yellow');}
 if(v===4){for(const x of [-1.25,1.25])box(g,.5,2.2,.7,x,1.45,0,'terracotta');const a=mesh(g,new THREE.TorusGeometry(1.25,.27,8,20,Math.PI),'terracotta',0,2.55,0);a.rotation.z=0;}
 if(v===5){for(let i=0;i<6;i++){const s=.95-i*.12;ell(g,Math.sin(i)*.12,.58+i*.4,0,s,.25,s*.75,i%2?'stone':'sand');}}
}
function fountain(g,v){
 if(v===5){box(g,2,.4,4.8,0,.2,0,'stone');box(g,1.55,.04,4.35,0,.43,0,'water');box(g,1.7,.9,.6,0,.9,-1.9,'stone');box(g,.45,.05,3.5,0,.6,0,'water');return;}
 cyl(g,1.8,2,.35,0,.175,0,'stone',20);cyl(g,1.65,1.65,.06,0,.37,0,'water',20);ring(g,1.8,.15,0,.46,0,'cream',true);
 if(v===0){cyl(g,.22,.4,.8,0,.8,0,'stone',12);cyl(g,.95,.35,.45,0,1.35,0,'cream',20);cyl(g,.85,.85,.04,0,1.6,0,'water',20);ell(g,0,1.9,0,.12,.32,.12,'water');}
 if(v===1){for(let i=0;i<3;i++){const z=-.8+i*.4;box(g,2.8-i*.4,2.8-i*.7,.45,0,1.75-i*.35,z,'stone');box(g,2.3-i*.35,.04,.55,0,3.15-i*.7,z,'water');}}
 if(v===2){for(let i=0;i<3;i++){const a=i*2.1,x=Math.cos(a)*.8,z=Math.sin(a)*.8;ell(g,x,.6+i*.12,z,.6,.6+i*.12,.5,'stone');ell(g,x,1.2+i*.25,z,.08,.2,.08,'water');}}
 if(v===3){cyl(g,.25,.4,1.25,0,1,0,'stone',12);for(let i=0;i<8;i++){const a=i*Math.PI/4,m=ell(g,Math.cos(a)*.55,1.85,Math.sin(a)*.55,.55,.15,.3,'cream');m.rotation.set(0,-a,.3);}cone(g,.3,.8,0,2.5,0,'water',12);}
 if(v===4){cyl(g,1,1,1.2,0,.85,0,'stone',16);cyl(g,.8,.8,.04,0,1.47,0,'darkglass',16);for(const x of [-1.2,1.2])box(g,.15,2.9,.15,x,1.8,0,'wood');gable(g,3.1,2.5,.9,3,'roof');const axle=cyl(g,.1,.1,2.5,0,2.5,0,'wood',8);axle.rotation.z=Math.PI/2;beam(g,[0,2.5,0],[0,1.6,0],.025,'sand');}
}
function garden(g,v){
 if(v===0){for(const x of [-1.35,1.35]){box(g,.17,2.8,.17,x,1.4,0,'white');plant(g,x,0,.1,.55);for(let i=0;i<5;i++)ell(g,x+.12*Math.sin(i),1+i*.4,.08,.25,.25,.2,i%2?'flower':'leaf');}const a=ring(g,1.35,.1,0,2.8,0,'white');a.geometry=new THREE.TorusGeometry(1.35,.1,6,18,Math.PI);}
 if(v===1){for(const x of [-2.2,2.2])for(const z of [-1.7,1.7])box(g,.18,3.3,.18,x,1.65,z,'wood');for(let z=-1.9;z<=2;z+=.5)box(g,5.1,.18,.12,0,3.4,z,'lightwood');for(const x of [-2.2,2.2])box(g,.15,.2,4.1,x,3.15,0,'wood');plant(g,-1.9,0,-1.5,.6);}
 if(v===2){box(g,2,.4,.8,0,.2,0,'wood');for(let i=0;i<7;i++)beam(g,[0,.4,0],[(i-3)*.4,3,0],.045,'lightwood',true);for(const y of [1.2,1.9,2.6])box(g,y*.9,.05,.06,0,y,0,'wood');for(let i=0;i<7;i++)ell(g,Math.sin(i)*.6,.8+i*.28,.1,.3,.25,.2,i%3?'leaf':'flower');}
 if(v===3){for(let i=0;i<3;i++){box(g,2.8-i*.65,.5,2-i*.35,0,.25+i*.65,-i*.25,'wood');for(let k=0;k<3;k++)plant(g,(k-1)*(.65-i*.12),.5+i*.65,-i*.25,.24);}}
 if(v===4){cyl(g,.08,.12,3,0,1.5,0,'wood',8);box(g,1.8,.1,.15,0,2.9,0,'wood');for(let i=0;i<7;i++){const x=(i-3)*.23,h=.5+(i%3)*.22;beam(g,[x,2.9,0],[x,2.35,0],.013,'iron');cyl(g,.06,.06,h,x,2.35-h/2,0,'lightwood',8);}ring(g,.75,.045,0,2.9,0,'wood',true);}
 if(v===5){cyl(g,.3,.6,1.1,0,.55,0,'stone',12);cyl(g,1.05,.75,.15,0,1.18,0,'cream',20);for(let i=0;i<12;i++){const a=i*Math.PI/6;box(g,.06,.025,.15,Math.sin(a)*.85,1.27,Math.cos(a)*.85,'darkwood',0,a);}beam(g,[0,1.27,0],[0,1.95,-.55],.04,'iron');}
}
function play(g,v){
 if(v===0){for(const x of [-2,2])for(const z of [-1.3,1.3])beam(g,[x,.08,z],[x,3.5,0],.09,'wood');box(g,4.5,.2,.2,0,3.5,0,'wood');for(const x of [-.9,.9]){box(g,.85,.12,.5,x,.65,0,'terracotta');for(const dx of [-.35,.35])beam(g,[x+dx,.7,0],[x+dx,3.45,0],.025,'iron');}}
 if(v===1){cone(g,.6,1,0,.5,0,'stone',4);box(g,4.5,.17,.55,0,1.05,0,'wood',0,0,.13);for(const x of [-1.9,1.9]){box(g,.6,.12,.65,x,1.05+x*.13,0,'terracotta');box(g,.07,.55,.07,x*.8,1.4+x*.13,0,'iron');}}
 if(v===2){box(g,1.4,.2,1.2,0,2.4,-1.3,'wood');legs(g,1.1,1,2.3);for(const x of [-.65,.65])beam(g,[x,.1,-2],[x,2.4,-1.3],.06,'iron');for(let i=0;i<6;i++)box(g,1.2,.06,.1,0,.3+i*.35,-1.95+i*.1,'wood');beam(g,[-.65,2.4,-.7],[-.65,.3,1.9],.07,'iron');beam(g,[.65,2.4,-.7],[.65,.3,1.9],.07,'iron');box(g,1.2,.08,3.35,0,1.35,.6,'yellow',.68);}
 if(v===3){for(const x of [-1.6,1.6])for(const z of [-1.6,1.6])box(g,.09,2.8,.09,x,1.4,z,'iron');for(let i=0;i<5;i++){const y=.4+i*.55;for(const z of [-1.6,1.6])box(g,3.2,.065,.065,0,y,z,'terracotta');for(const x of [-1.6,1.6])box(g,.065,.065,3.2,x,y,0,'yellow');}for(let x=-1.6;x<=1.6;x+=.55)box(g,.065,.065,3.2,x,2.8,0,'iron');}
 if(v===4){box(g,3.8,.25,3.8,0,.125,0,'wood');box(g,3.4,.04,3.4,0,.28,0,'sand');for(const x of [-1.7,1.7])for(const z of [-1.7,1.7])box(g,.12,2.9,.12,x,1.45,z,'wood');mesh(g,new THREE.ConeGeometry(2.75,.75,4).rotateY(Math.PI/4),'cream',0,3.1,0);}
 if(v===5){cyl(g,1.8,1.8,.16,0,.38,0,'terracotta',24);cyl(g,.2,.35,.3,0,.15,0,'iron',12);for(let i=0;i<4;i++){const a=i*Math.PI/2;beam(g,[Math.cos(a)*1.4,.45,Math.sin(a)*1.4],[Math.cos(a)*1.4,1.3,Math.sin(a)*1.4],.045,'iron');beam(g,[0,1.3,0],[Math.cos(a)*1.4,1.3,Math.sin(a)*1.4],.045,'iron');}}
}
function street(g,v){
 if(v===0){cyl(g,.09,.2,3.8,0,1.9,0,'iron',10);box(g,1.45,1.45,.35,0,4,0,'roof');const face=cyl(g,.6,.6,.04,0,4,.2,'cream',20);face.rotation.x=Math.PI/2;box(g,.04,.42,.035,0,4.12,.24,'iron');box(g,.32,.04,.035,.13,4,.25,'iron');cone(g,1.1,.5,0,4.95,0,'roof',4);}
 if(v===1){cyl(g,.46,.5,1.5,0,.75,0,'terracotta',16);ell(g,0,1.52,0,.48,.2,.48,'terracotta');box(g,.5,.1,.08,0,1.28,.48,'darkwood');box(g,.36,.32,.06,0,.86,.49,'cream');cyl(g,.56,.56,.12,0,.06,0,'iron',16);}
 if(v===2){box(g,2.8,2.4,2.1,0,1.2,0,'leafDark');box(g,2.25,1,.08,0,1.8,1.08,'darkglass');box(g,3,.15,.5,0,1.12,1.2,'wood');gable(g,3.4,2.6,.65,2.6,'roof');for(let i=0;i<6;i++)box(g,.3,.46,.05,-1+i*.4,.62,1.1,i%2?'cream':'sand');}
 if(v===3){box(g,.55,.95,.55,0,.475,0,'stone');ell(g,0,1.02,0,.65,.14,.47,'cream');cyl(g,.06,.06,.3,.25,1.2,0,'iron',8);beam(g,[.25,1.3,0],[0,1.3,0],.04,'iron');}
 if(v===4){box(g,1.6,2.6,1.6,0,1.3,0,'terracotta');for(const x of [-.53,0,.53])for(const y of [.8,1.35,1.9])box(g,.43,.43,.04,x,y,.82,'glass');box(g,1.3,.3,.06,0,2.38,.84,'cream');gable(g,1.95,1.95,.35,2.75,'terracotta');}
 if(v===5){for(const x of [-2.2,2.2])for(const z of [-.75,.75])box(g,.1,2.8,.1,x,1.4,z,'iron');box(g,4.5,2.4,.06,0,1.4,-.8,'glass');box(g,4.9,.18,2.1,0,2.9,0,'roof');box(g,3,.12,.6,0,.7,-.3,'wood');for(const x of [-1.1,1.1])box(g,.12,.65,.35,x,.325,-.3,'iron');box(g,.65,1,.08,1.65,1.65,-.7,'cream');}
}
function market(g,v){
 if(v===5){for(const x of [-1,0,1]){barrel(g,x,.12,0,1);if(x===0)barrel(g,x,1.1,0,.8);}box(g,3.1,.2,1.5,0,.1,0,'darkwood');return;}
 box(g,2.6,.45,1.7,0,.9,0,'wood');legs(g,2.2,1.3,.75);if(v<2){for(const x of [-1.25,1.25]){const wheel=cyl(g,.4,.4,.15,x,.45,.4,'darkwood',12);wheel.rotation.z=Math.PI/2;}for(const x of [-.8,.8])beam(g,[x,.8,.65],[x,1.15,1.45],.07,'wood');}
 if(v>0){for(const x of [-1.3,1.3])for(const z of [-.8,.8])box(g,.08,2.6,.08,x,1.5,z,'wood');for(let i=0;i<7;i++)box(g,.45,.12,2.4,-1.35+i*.45,2.9,0,i%2?'cream':v===1?'leafDark':'terracotta',-.08);}
 if(v===0)for(let i=0;i<12;i++)ell(g,-.9+(i%4)*.6,1.22,-.5+Math.floor(i/4)*.45,.22,.16,.18,i%2?'leafLight':'terracotta');
 if(v===1)for(const x of [-.8,0,.8])plant(g,x,1.15,0,.35,'flower');
 if(v===2){box(g,2.1,.08,1.3,0,1.18,0,'cream');for(let i=0;i<5;i++){ell(g,-.8+i*.4,1.32,0,.15,.08,.42,'glass');cone(g,.16,.28,-.8+i*.4,1.32,-.45,'slate',3).rotation.x=Math.PI/2;}}
 if(v===3){for(const x of [-.8,0,.8])box(g,.6,.6,.6,x,1.45,0,'sand');}
 if(v===4)for(let i=0;i<6;i++)ell(g,-.8+(i%3)*.8,1.32,Math.floor(i/3)*.5-.3,.3,.14,.18,'sand');
}
function utility(g,v){
 if(v===0){box(g,3.2,.12,1.1,0,.06,0,'stone');for(let i=0;i<5;i++){const m=ring(g,.45,.055,-1.2+i*.6,.8,0,'iron');m.scale.y=1.4;}}
 if(v===1)for(let i=0;i<3;i++){box(g,.8,1.25,.8,(i-1)*1.05,.625,0,i===0?'leafDark':i===1?'glass':'yellow');box(g,.9,.14,.9,(i-1)*1.05,1.32,0,'slate');box(g,.35,.13,.035,(i-1)*1.05,1.1,.42,'darkwood');}
 if(v===2){box(g,2.6,.95,1.4,0,.475,0,'wood');gable(g,2.9,1.65,.45,1,'roof');for(const x of [-.7,.7])box(g,.04,.08,.04,x,.7,.75,'iron');for(let i=0;i<3;i++){beam(g,[1.35,.1,(i-1)*.4],[1.35,2.05,(i-1)*.4],.035,'wood');box(g,.3,.35,.08,1.35,2.15,(i-1)*.4,'iron');}}
 if(v===3)for(let k=0;k<4;k++){for(const x of [-1.1,1.1])box(g,.18,.18,2.2,x,.15+k*.4,0,'wood');for(let i=0;i<7;i++)box(g,.3,.12,2.3,-1.2+i*.4,.31+k*.4,0,'lightwood');}
 if(v===4){cyl(g,.7,.7,1.4,0,.85,0,'darkwood',16);for(const y of [.15,1.6])cyl(g,1.15,1.15,.2,0,y,0,'lightwood',20);for(let y=.3;y<1.45;y+=.12)ring(g,.75,.045,0,y,0,'iron',true);}
 if(v===5){cyl(g,.18,.3,1.6,0,.8,0,'leafDark',12);beam(g,[0,1.4,0],[.6,1.4,0],.08,'leafDark');beam(g,[.6,1.4,0],[.6,1.1,0],.07,'leafDark');beam(g,[0,1.5,0],[-.55,2.2,0],.055,'iron');cyl(g,.75,.75,.16,0,.08,0,'stone',16);}
}
function coastal(g,v){
 if(v===0)for(let i=0;i<3;i++){const x=(i-1)*.9,z=i%2*.65;ell(g,x,.55,z,.48,.55,.48,i%2?'white':'terracotta');cyl(g,.07,.12,.8,x,1.3,z,'iron',8);ring(g,.15,.035,x,1.78,z,'iron');}
 if(v===1){box(g,.12,2.4,.12,0,1.2,0,'wood');ring(g,.65,.16,0,1.8,.15,'cream');for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5])box(g,.3,.16,.35,Math.sin(a)*.65,1.8+Math.cos(a)*.65,.15,'terracotta',0,0,-a);}
 if(v===2){cyl(g,.045,.08,2.7,0,1.35,0,'wood',8);for(let i=0;i<8;i++){const geom=new THREE.ConeGeometry(2,.75,1,1,true,i*Math.PI/4,Math.PI/4);mesh(g,geom,i%2?'cream':'terracotta',0,2.8,0);}cyl(g,.32,.5,.12,0,.06,0,'stone',12);}
 if(v===3){for(const x of [-1.5,0,1.5]){cyl(g,.18,.22,1.5,x,.75,0,'wood',10);for(const y of [1.1,1.25])ring(g,.23,.035,x,y,0,'sand',true);}for(const [a,b] of [[-1.5,0],[0,1.5]]){beam(g,[a,1.3,0],[(a+b)/2,.9,0],.045,'sand');beam(g,[(a+b)/2,.9,0],[b,1.3,0],.045,'sand');}}
 if(v===4){for(const x of [-.8,.8])for(const z of [-.7,.7])beam(g,[x*1.3,.06,z*1.3],[x,2.5,z],.08,'white');box(g,2,.15,1.7,0,2.5,0,'lightwood');box(g,1.1,.15,.8,0,2.9,0,'white');box(g,1.1,.8,.12,0,3.35,-.35,'white');for(let i=0;i<6;i++)box(g,1.3,.07,.15,0,.3+i*.4,1-i*.07,'white');}
 if(v===5){const hull=ell(g,0,.55,0,1.35,.5,2.4,'wood');box(g,1.75,.16,3.5,0,.88,0,'darkwood');for(const z of [-1,0,1])box(g,2,.12,.32,0,1.04,z,'lightwood');for(const x of [-1.15,1.15])beam(g,[x,1.05,-1.8],[x,1.05,1.8],.1,'wood');beam(g,[-1.5,.85,-1.8],[1.4,1.25,1.5],.04,'cream');}
}
const factories={seating,lighting,sculpture,fountain,garden,play,street,market,utility,coastal};
const lookup=new Map(specs.map(s=>[`decor-${s[0]}`,s]));
export const DECOR_EXPANSION=specs.map(([id,name,family,v,w,d,h])=>({id:`decor-${id}`,name,category:'Decorations',kind:'decoration',tags:`decoration ${family} ${id.replaceAll('-',' ')}`,description:`${name}, an original detailed ${family==='play'?'playground fixture':family==='coastal'?'coastal prop':family==='market'?'market fixture':family==='fountain'?'ornamental water feature':'outdoor furnishing'}. Static scenery.`,radius:Math.hypot(w/2,d/2),height:h,footprint:{halfX:w/2,halfZ:d/2},collection:'world-expansion',obstacle:!['lighting','garden'].includes(family),...(family==='coastal'&&[0,5].includes(v)?{waterFriendly:true,waterSurface:true}:{} )}));
export function createExpandedDecor(id){const s=lookup.get(id);if(!s)return null;const g=new THREE.Group();g.name=id;factories[s[2]](g,s[3]);return g;}
