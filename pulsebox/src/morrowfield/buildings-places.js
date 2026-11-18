import {THREE,building,mat,mesh,box,ell,cyl,cone,beam,gable,windowFront,windowSide,door,chimney,foundation,planter} from './building-kit.js';

// Original, locally generated civic architecture. These are scenery buildings;
// doors, vehicles, machinery and public services are not simulated by the art.
export const PLACE_BUILDINGS = [
  building('place-townhall','Briar town hall','A welcoming civic hall with a copper clock tower, a broad portico and warm stone trim.',{width:14,depth:12,height:14,tags:'town hall civic government clock tower',group:'Civic'}),
  building('place-museum','Sunstone museum','Interlocking limestone galleries, a glass pyramid and a sculptural entry court.',{width:15.5,depth:12,height:9,tags:'museum art gallery contemporary sculpture',group:'Civic'}),
  building('place-postoffice','Maple post office','A small brick post office with a stepped parapet, envelope emblem and a blue letter box.',{width:12,depth:10,height:6.7,tags:'post office mail letters postal brick',group:'Civic'}),
  building('place-policestation','Harbor police station','A pale civic station with blue trim, a shield crest and a glazed corner lookout.',{width:12,depth:10,height:9.7,tags:'police station civic shield blue',group:'Civic'}),
  building('place-clinic','Sage neighborhood clinic','A low cream clinic with green sunshades, a medical cross and a planted waiting terrace.',{width:13,depth:11,height:5.8,tags:'clinic medical health community cross',group:'Civic'}),
  building('place-university','Rowan university hall','Brick academic wings frame a columned entrance beneath a slender bell tower.',{width:17.5,depth:13,height:12,tags:'university college campus education academic bell',group:'Civic'}),
  building('place-courthouse','Laurel courthouse','A classical courthouse with six stone columns, a triangular pediment and a copper dome.',{width:15,depth:13,height:10.8,tags:'courthouse classical civic columns dome justice',group:'Civic'}),
  building('place-trainstation','Orchard railway station','A clock-fronted brick station with a long timber platform canopy and short display rails. Static scenery.',{width:17,depth:13,height:9,tags:'train railway station transit platform canopy transport',group:'Civic'}),
  building('place-busdepot','Clover bus depot','Three broad depot bays sit below ribbed roofs beside a glazed dispatch office. Static scenery.',{width:17,depth:12,height:7,tags:'bus depot transit garage transport bays',group:'Industry'}),
  building('place-airportterminal','Cloudbank air terminal','A curved-roof glass terminal with a compact control tower and a sheltered entry. Static scenery.',{width:18,depth:13,height:13,tags:'airport terminal aviation control tower transport',group:'Civic'}),
  building('place-warehouse','Foundry warehouse','A weathered metal warehouse with a curved roof, raised loading dock and stacked timber crates.',{width:16,depth:14,height:8.6,tags:'warehouse storage industrial loading dock logistics',group:'Industry'}),
  building('place-factory','Copperworks factory','A brick workshop with sawtooth roof lights, tall banded chimneys and exposed copper pipework.',{width:17,depth:13,height:14,tags:'factory workshop industrial sawtooth chimneys machinery',group:'Industry'}),
  building('place-watermill','Willow watermill','A half-timbered mill with a stone base, roof dormer and a large detailed wooden waterwheel. Static scenery.',{width:14,depth:12,height:9.5,tags:'watermill mill wheel river timber rural historic',group:'Industry'}),
  building('place-lighthouse','Rosepoint lighthouse','A striped coastal tower with a lantern gallery and a little keeper’s cottage.',{width:12,depth:11,height:20,tags:'lighthouse coastal beacon tower keeper sea',group:'Landmarks'}),
  building('place-observatory','Starlight observatory','A round stone observatory with a slit copper dome and a visible telescope above its terrace.',{width:14,depth:13,height:11.6,tags:'observatory telescope astronomy science dome',group:'Landmarks'}),
  building('place-botanicaldome','Fern conservatory','A ribbed glass dome shelters broad tropical foliage, with a timber entry vestibule.',{width:15,depth:16,height:9.5,tags:'botanical dome conservatory garden glasshouse tropical',group:'Landmarks'}),
  building('place-sportsarena','Meadow sports arena','An open oval arena with tiered seating, a tiny marked field and a scalloped canopy.',{width:18,depth:15.5,height:7.5,tags:'sports arena stadium field seating recreation',group:'Landmarks'}),
  building('place-communitypool','Juniper community pool','A tiled outdoor pool with lane markings, a diving platform, changing pavilion and shade pergola. Static scenery.',{width:17,depth:15,height:5.8,tags:'community pool swimming recreation water pavilion',group:'Civic'}),
  building('place-templepavilion','Lotus temple pavilion','An open timber sanctuary with layered green roofs, lifted eaves and a golden finial.',{width:14,depth:13,height:11,tags:'temple pavilion sanctuary layered roof timber lotus',group:'Landmarks'}),
  building('place-fortressgate','Alder fortress gate','Twin crenellated stone towers flank an arched gate, timber doors and a raised central gallery.',{width:17,depth:12,height:12,tags:'fortress gate castle medieval stone towers arch',group:'Landmarks'}),
];

const makeGroup = id => {const g=new THREE.Group();g.name=id;return g;};
const glass=()=>mat('glass',{roughness:.2,metalness:.15,transparent:true,opacity:.76,side:THREE.DoubleSide});
function steps(g,width,z,count=4,rise=.15,run=.3,y=0){
  for(let i=0;i<count;i++)box(g,width,rise*(i+1),run*(count-i),0,y+rise*(i+1)/2,z-run*i/2,'stone');
}
function parapet(g,w,d,y,x=0,z=0,tone='cream'){
  for(const zz of [-1,1])box(g,w,.36,.24,x,y,z+zz*d/2,tone);
  for(const xx of [-1,1])box(g,.24,.36,d,x+xx*w/2,y,z,tone);
}
function windows(g,xs,ys,z,w=.95,h=1.35,tone='white'){
  for(const x of xs)for(const y of ys)windowFront(g,x,y,z,w,h,tone);
}
function columns(g,xs,y,height,z,tone='cream'){
  for(const x of xs){cyl(g,.2,.23,height,x,y+height/2,z,tone,12);box(g,.58,.18,.58,x,y+.09,z,'stone');box(g,.6,.18,.6,x,y+height-.09,z,tone);}
}
function flag(g,x,y,z,tone='terracotta'){
  cyl(g,.035,.035,2,x,y+1,z,'iron',8);box(g,.95,.55,.035,x+.48,y+1.55,z,tone);ell(g,x,y+2.05,z,.09,.09,.09,'yellow');
}
function clock(g,x,y,z,r=.62){
  const disk=cyl(g,r,r,.1,x,y,z,'cream',24);disk.rotation.x=Math.PI/2;
  for(let i=0;i<12;i++){const a=i*Math.PI/6;box(g,.055,.12,.045,x+Math.sin(a)*r*.8,y+Math.cos(a)*r*.8,z+.07,'iron',0,0,-a);}
  box(g,.065,r*.6,.04,x,y+r*.15,z+.1,'iron');box(g,r*.52,.065,.045,x+r*.18,y,z+.12,'iron');
}
function arch(g,x,y,z,r,thickness=.22,depth=.35,tone='cream'){
  // A real opening: a half-ring with two legs, never a painted black rectangle.
  const shape=new THREE.Shape();shape.absarc(0,0,r,0,Math.PI,false);shape.lineTo(-r+thickness,0);shape.absarc(0,0,r-thickness,Math.PI,0,true);shape.closePath();
  mesh(g,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:12}),tone,x,y,z-depth/2);
}
function dome(g,r,y,x=0,z=0,tone='roof',segments=24){
  return mesh(g,new THREE.SphereGeometry(r,segments,12,0,Math.PI*2,0,Math.PI/2),tone,x,y,z);
}
function barrel(g,r,length,y,x=0,z=0,tone='roof'){
  const geometry=new THREE.CylinderGeometry(r,r,length,24,1,true,Math.PI/2,Math.PI);
  geometry.rotateX(Math.PI/2);return mesh(g,geometry,tone,x,y,z);
}
function cross(g,x,y,z,size=1,tone='leafDark'){
  box(g,size*.34,size,.11,x,y,z,tone);box(g,size,size*.34,.12,x,y,z+.01,tone);
}
function louvers(g,x,y,z,w,h,count=6){
  box(g,w,h,.08,x,y,z,'darkglass');for(let i=0;i<count;i++)box(g,w+.08,.05,.12,x,y-h/2+(i+.5)*h/count,z+.05,'slate');
}
function crate(g,x,y,z,size=.85){
  box(g,size,size,size,x,y+size/2,z,'lightwood');
  for(const xx of [-.38,.38])box(g,.08,size+.03,.07,x+xx*size,y+size/2,z+size/2,'wood');
  for(const yy of [.13,.87])box(g,size+.04,.08,.07,x,y+yy*size,z+size/2,'wood');
  beam(g,[x-size*.4,y+size*.14,z+size/2+.04],[x+size*.4,y+size*.86,z+size/2+.04],.075,'wood',true);
}
function railing(g,x1,x2,y,z,tone='iron',spacing=.65){
  for(let x=x1;x<=x2+.01;x+=spacing)box(g,.06,.8,.06,x,y+.4,z,tone);
  box(g,x2-x1,.07,.07,(x1+x2)/2,y+.8,z,tone);
}

function townhall(){
  const g=makeGroup('place-townhall');foundation(g,11.7,8);box(g,11.4,5.2,6.8,0,2.95,-.6,'cream');
  for(const x of [-5.3,5.3]){box(g,.42,5.6,7,x,3,-.6,'stone');box(g,1.1,.3,7.2,x,5.9,-.6,'white');}
  windows(g,[-4,-2,2,4],[2,4.3],2.85,.95,1.4);for(const x of [-5.76,5.76])for(const z of [-2.5,0])windowSide(g,x,3.8,z);
  gable(g,12,7.3,2,5.6,'terracotta',0,-.6);box(g,3.15,5.3,3,0,8.5,-.6,'cream');
  for(const x of [-1.4,1.4])box(g,.18,5.5,3.15,x,8.5,-.6,'white');
  clock(g,0,9.2,1,.8);louvers(g,0,11,1,1.35,1.1,5);box(g,3.7,.25,3.5,0,11.8,-.6,'stone');
  cone(g,2.7,1.7,0,12.75,-.6,'roof',4);ell(g,0,13.7,-.6,.14,.14,.14,'yellow');
  box(g,6,.38,2.4,0,.49,3.7,'stone');columns(g,[-2.45,-.85,.85,2.45],.68,3.3,4.15);
  box(g,6.5,.35,2.5,0,4.13,3.7,'white');gable(g,6.6,2.6,.85,4.3,'terracotta',0,3.7);door(g,0,2.9,.65,1.65,2.55);
  steps(g,4.6,5.2,4,.16,.3);for(const x of [-4.7,4.7])planter(g,x,.36,4.1,1.2,1.2);return g;
}
function museum(){
  const g=makeGroup('place-museum');foundation(g,14,9.7);
  box(g,5,6,6,-4,3.4,-1.1,'cream');box(g,8.2,3.8,7.8,2.1,2.3,-.2,'white');box(g,5.5,.28,6.5,-4,6.5,-1.1,'stone');
  box(g,.18,4.9,5.8,-6.58,3.4,-1.1,'terracotta');for(const y of [1.4,2.2,3,3.8,4.6,5.4])box(g,4.6,.035,.12,-4,y,1.95,'sand');
  for(const x of [-5.5,-4,-2.5])windowFront(g,x,4.7,1.96,.8,1.7,'stone');
  box(g,6.3,2.9,.12,1.5,2.1,3.76,'darkglass');for(let x=-1.6;x<=4.6;x+=1.05)box(g,.09,3,.22,x,2.1,3.81,'white');
  box(g,8.5,.24,8.1,2.1,4.32,-.2,'cream');cone(g,3.7,3.8,1.6,6.25,-.5,glass(),4);
  for(const a of [Math.PI/4,3*Math.PI/4,5*Math.PI/4,7*Math.PI/4])beam(g,[1.6+Math.sin(a)*3.7,4.35,-.5+Math.cos(a)*3.7],[1.6,8.15,-.5],.085,'white',true);
  door(g,1.5,3.9,.4,1.6,2.3,'glass');steps(g,4.4,4.85,3,.13,.3);
  cyl(g,.8,.95,.35,5.7,.55,4,'stone',16);const ring=mesh(g,new THREE.TorusGeometry(.78,.13,8,20),'terracotta',5.7,1.85,4);ring.rotation.y=.45;beam(g,[5.25,.75,4],[6.1,2.85,4],.12,'iron');return g;
}
function postoffice(){
  const g=makeGroup('place-postoffice');foundation(g,10.4,7.3);box(g,10,3.9,5.8,0,2.3,-.7,'red');
  for(let y=.8;y<4.1;y+=.48)box(g,10.05,.035,.08,0,y,2.25,'terracotta');
  parapet(g,10.25,6,4.4,0,-.7);box(g,4.6,.9,.45,0,4.9,2.3,'red');box(g,2.6,.65,.45,0,5.65,2.3,'red');
  for(const [w,y] of [[10.5,4.55],[4.9,5.4],[2.9,6.02]])box(g,w,.16,.64,0,y,2.3,'cream');
  windows(g,[-3.65,-2.05,2.05,3.65],[2.25],2.26,1.1,1.8,'cream');door(g,0,2.28,.4,1.45,2.55);
  box(g,2.6,.12,1.25,0,3.55,2.9,'roof',-.08);for(const x of [-1.15,1.15])beam(g,[x,2.75,2.4],[x,3.5,3.35],.07,'iron');
  box(g,1.2,.65,.13,0,4.85,2.58,'cream');beam(g,[-.55,5.1,2.67],[0,4.76,2.67],.035,'terracotta',true);beam(g,[0,4.76,2.67],[.55,5.1,2.67],.035,'terracotta',true);
  box(g,.65,1.2,.55,3.8,1,4.1,0x547b8b);box(g,.57,.08,.035,3.8,1.36,4.4,'darkwood');box(g,.45,.25,.04,3.8,1,4.4,'cream');box(g,.18,.4,.18,3.8,.25,4.1,'iron');
  steps(g,3.4,4,3,.13,.32);flag(g,-4.9,3.7,2.5,'yellow');return g;
}
function police(){
  const g=makeGroup('place-policestation');foundation(g,10.6,7.7);box(g,10,5.4,6.1,0,3.05,-.6,'cream');box(g,10.2,.55,6.2,0,1,-.6,0x527786);
  windows(g,[-3.75,-2.1,.1],[2.2,4.5],2.48,1.15,1.3);for(const x of [-5.06,5.06])for(const z of [-2,0])windowSide(g,x,4.4,z);
  box(g,3,7.5,3.2,3.35,4.1,-.4,'stone');box(g,3.2,1.35,3.4,3.35,7.5,-.4,'darkglass');for(const x of [1.83,3.35,4.87])box(g,.09,1.5,.12,x,7.5,1.35,'cream');box(g,3.6,.3,3.8,3.35,8.35,-.4,'roof');
  cyl(g,.04,.04,1,3.35,9,-.4,'iron',8);box(g,.7,.055,.055,3.35,9.3,-.4,'iron');
  parapet(g,10.3,6.4,5.95,0,-.6);door(g,-.9,2.5,.4,1.55,2.45,'darkglass');box(g,4.6,.22,1.5,-.9,3.4,3.05,0x527786);
  const shield=new THREE.Shape();shield.moveTo(-.6,.48);shield.lineTo(.6,.48);shield.lineTo(.5,-.15);shield.lineTo(0,-.65);shield.lineTo(-.5,-.15);shield.closePath();mesh(g,new THREE.ExtrudeGeometry(shield,{depth:.1,bevelEnabled:false}),'yellow',-.9,4.8,2.54);ell(g,-.9,4.85,2.69,.2,.2,.035,'cream');
  steps(g,3.7,4.25,3,.13,.3);planter(g,-4.1,.36,3.9,1.3,1.3);return g;
}
function clinic(){
  const g=makeGroup('place-clinic');foundation(g,11.8,8.5);box(g,8,3.6,6.4,-1.7,2.15,-.5,'white');box(g,3.5,3,4.8,4.05,1.85,-.2,'cream');
  box(g,8.4,.24,6.8,-1.7,4.05,-.5,'leafDark');box(g,3.9,.2,5.2,4.05,3.5,-.2,'roof');
  box(g,3.2,2.25,.12,4.05,2,2.25,'glass');for(const x of [2.5,3.55,4.6,5.6])box(g,.08,2.4,.16,x,2,2.35,'white');
  windows(g,[-4.4,-2.7],[2.15],2.73,1.15,1.6,'stone');door(g,.15,2.75,.4,1.65,2.45,'glass');box(g,3.1,.15,1.4,.15,3.5,3.2,'leafDark');
  box(g,1.55,1.6,.25,-.2,4.65,1.4,'white');cross(g,-.2,4.65,1.57,1.1);
  for(const x of [-4.9,-4.35,-3.8,-3.25,-2.7,-2.15])box(g,.12,.2,1,x,3.25,3.05,'leafDark',.12);
  steps(g,3.4,4.35,3,.13,.3);for(const x of [3,5])planter(g,x,.35,3.9,1.2,1.2);box(g,1.6,.16,.5,4,.9,4.2,'lightwood');for(const x of [3.4,4.6])box(g,.1,.55,.4,x,.58,4.2,'iron');return g;
}
function university(){
  const g=makeGroup('place-university');foundation(g,16.2,9.6);
  for(const x of [-5.3,5.3]){box(g,5.1,5.9,7.8,x,3.3,-.6,'red');gable(g,5.7,8.3,1.8,6.25,'roof',x,-.6);windows(g,[x-1.45,x,x+1.45],[2.15,4.65],3.35,.8,1.55,'cream');for(const z of [-2.7,0,2])windowSide(g,x+Math.sign(x)*2.62,4.5,z);}
  box(g,5.3,6.65,7.4,0,3.7,-.3,'cream');windows(g,[-1.65,1.65],[4.75],3.45,.85,1.6);door(g,0,3.48,.5,1.6,2.65);
  box(g,6.2,.35,2,0,.55,3.8,'stone');columns(g,[-2.25,-.75,.75,2.25],.72,3.4,4.25);box(g,6.4,.3,2.2,0,4.25,3.85,'cream');gable(g,6.6,2.3,1.2,4.4,'roof',0,3.85);
  box(g,3.1,2.7,3.1,0,8.2,-.6,'cream');for(const x of [-1.4,1.4])box(g,.15,2.8,3.2,x,8.25,-.6,'white');louvers(g,0,8.5,1,1.5,1.5);cone(g,2.45,2,0,10.55,-.6,'roof',4);ell(g,0,11.65,-.6,.12,.12,.12,'yellow');
  steps(g,4.8,5.35,4,.14,.3);for(const x of [-7.1,7.1])planter(g,x,.35,4.5,1.25,1.25);return g;
}
function courthouse(){
  const g=makeGroup('place-courthouse');foundation(g,12.8,9);box(g,12,5.35,7,0,3,-1,'cream');
  for(const x of [-5.7,-4.1,4.1,5.7]){box(g,.28,5.3,7.1,x,3,-1,'stone');}windows(g,[-4.95,4.95],[2.7],2.55,1.2,2.5,'stone');
  for(const x of [-6.05,6.05])for(const z of [-3,-.4,1.8])windowSide(g,x,3,z,1.25,2.4);
  box(g,10.6,.55,3.1,0,.62,3.3,'stone');columns(g,[-4.3,-2.58,-.86,.86,2.58,4.3],.9,4.5,4.15);
  box(g,11.25,.4,3.4,0,5.45,3.3,'cream');gable(g,11.5,3.6,1.75,5.65,'cream',0,3.3);gable(g,9.4,.12,1.25,5.88,'stone',0,5.17);
  door(g,0,2.57,.9,2,3.1);box(g,12.6,.3,7.6,0,5.85,-1,'stone');cyl(g,2.45,2.45,1.2,0,6.6,-1,'cream',24);dome(g,2.5,7.2,0,-1,'roof');cyl(g,.22,.32,.6,0,10,-1,'yellow',10);
  steps(g,9,5.55,5,.18,.32);return g;
}
function trainstation(){
  const g=makeGroup('place-trainstation');foundation(g,16,10);box(g,8,4.3,5,0,2.5,1,'red');gable(g,8.6,5.6,2.2,4.7,'roof',0,1);
  for(const x of [-5.6,5.6]){box(g,3.1,3,4.5,x,1.85,1.1,'cream');gable(g,3.5,5,1.15,3.4,'terracotta',x,1.1);windowFront(g,x,2,3.4,1.6,1.7);}
  windows(g,[-2.7,2.7],[2.6],3.56,1.2,2.2);door(g,0,3.56,.4,1.7,2.65);clock(g,0,5.7,3.83,.66);
  box(g,2,.3,1.6,0,6.8,1,'cream');box(g,1.5,1.1,1.1,0,7.45,1,'cream');cone(g,1.25,.7,0,8.35,1,'roof',4);
  box(g,16,.5,3.4,0,.5,-3.5,'stone');for(const x of [-7,-3.5,0,3.5,7]){box(g,.15,3.2,.15,x,2.35,-3.2,'iron');beam(g,[x,2.7,-3.2],[x,3.9,-4.5],.08,'iron',true);beam(g,[x,2.7,-3.2],[x,3.9,-1.9],.08,'iron',true);}
  box(g,16.3,.18,3.6,0,4,-3.2,'roof');for(let x=-7.6;x<=7.6;x+=.6)box(g,.05,.05,3.6,x,4.12,-3.2,'cream');
  for(const z of [-5.6,-6.05])box(g,15.8,.09,.09,0,.28,z,'iron');for(let x=-7.7;x<8;x+=.6)box(g,.14,.12,1.05,x,.17,-5.82,'wood');
  for(const x of [-5.5,5.5]){box(g,1.8,.14,.48,x,1,-3.25,'wood');box(g,1.8,.5,.1,x,1.27,-3.47,'wood');}steps(g,4,4.7,3,.13,.3);return g;
}
function busdepot(){
  const g=makeGroup('place-busdepot');foundation(g,15.7,10.4);
  for(const x of [-5,0,5]){box(g,4.7,4.3,7.4,x,2.5,-1,'stone');gable(g,4.95,7.85,1.25,4.7,'roof',x,-1);box(g,3.65,3.55,.12,x,2.15,2.76,'darkglass');for(let y=.65;y<3.8;y+=.38)box(g,3.7,.055,.12,x,y,2.85,'slate');box(g,1.25,.55,.06,x,2.95,2.94,'glass');box(g,4.1,.18,.3,x,4.07,2.88,'yellow');}
  box(g,15.4,.18,1.8,0,4.1,3.35,'roof');for(const x of [-7.3,-2.5,2.5,7.3])box(g,.12,3.7,.12,x,2.05,4.1,'iron');
  for(let x=-6.7;x<=6.7;x+=.42)box(g,.04,.045,1.8,x,4.23,3.35,'cream');
  box(g,3.3,1.4,2.5,-4.8,5.6,-1.3,'glass');box(g,3.65,.2,2.85,-4.8,6.4,-1.3,'cream');for(const x of [-6.35,-4.8,-3.25])box(g,.1,1.4,.1,x,5.6,0,'cream');
  for(const x of [-5,0,5]){box(g,1.8,.035,.09,x,.4,4.7,'yellow');for(const xx of [-1.4,1.4])box(g,.08,.035,1.4,x+xx,.4,4.5,'yellow');}return g;
}
function airport(){
  const g=makeGroup('place-airportterminal');foundation(g,17.2,10.7);box(g,16.5,3.3,6.2,0,2.05,.1,'glass');
  for(let x=-8;x<=8;x+=1.15){box(g,.1,3.4,.18,x,2.05,3.25,'cream');box(g,.1,3.4,.18,x,2.05,-3.05,'cream');}
  box(g,16.8,.2,6.5,0,3.85,.1,'white');const roof=barrel(g,3.8,17.2,3.8,0,.1,'cream');roof.rotation.y=Math.PI/2;roof.scale.y=.45;
  // Front cantilever and a detached, visibly elevated control cab.
  box(g,10,.16,2.8,-1,3.25,3.7,'roof',-.06);for(const x of [-5.5,3.5])beam(g,[x,.4,4.8],[x,3.3,3.1],.12,'white');
  box(g,2.6,7.2,2.6,5.9,4,-3.2,'stone');box(g,3.6,1.7,3.5,5.9,8.45,-3.2,'darkglass');box(g,4,.25,3.9,5.9,9.5,-3.2,'cream');
  for(const x of [4.15,5.9,7.65])box(g,.1,1.75,.12,x,8.45,-1.4,'cream');cyl(g,.05,.07,2.4,5.9,10.85,-3.2,'iron',8);box(g,1.7,.13,.1,5.9,11.8,-3.2,'white');ell(g,5.9,12.13,-3.2,.1,.1,.1,'terracotta');
  for(const x of [-2.5,-.3,1.9])door(g,x,3.32,.4,1.4,2.3,'darkglass');for(const x of [-7,7])planter(g,x,.36,4.6,1.5,1.2);return g;
}
function warehouse(){
  const g=makeGroup('place-warehouse');foundation(g,13.6,10.5);box(g,12.6,4.5,8.8,0,2.65,-1,'slate');barrel(g,6.6,9.4,4.9,0,-1,'roof').scale.y=.48;
  for(let x=-6;x<=6;x+=.55)box(g,.045,4.5,.08,x,2.65,3.45,'stone');for(const x of [-6.35,6.35])for(let z=-5;z<3.5;z+=.55)box(g,.08,4.5,.045,x,2.65,z,'stone');
  box(g,5.4,3.3,.16,0,2.4,3.5,'darkwood');for(let y=1;y<4;y+=.35)box(g,5.4,.055,.12,0,y,3.62,'lightwood');
  box(g,11.4,.8,2.5,0,.8,4.4,'stone');box(g,11.6,.16,2.6,0,1.27,4.4,'cream');box(g,11.9,.18,2.9,0,4.65,4.5,'roof',-.1);
  for(const x of [-5.3,5.3])beam(g,[x,3.3,3.55],[x,4.6,5.65],.09,'iron');for(const x of [-4.5,4.5])windowFront(g,x,3.45,3.6,1.35,.8,'stone');
  crate(g,-4.5,1.35,4.6);crate(g,-3.5,1.35,4.5);crate(g,-4,2.2,4.55);crate(g,4.4,1.35,4.6,1.15);steps(g,3.7,6.05,5,.25,.32);return g;
}
function factory(){
  const g=makeGroup('place-factory');foundation(g,14.6,10.5);box(g,14,4.5,8,0,2.6,0,'red');
  for(const x of [-4.65,0,4.65]){gable(g,4.7,8.4,1.8,4.9,'roof',x,0);box(g,3.8,.9,.12,x,5.5,4.23,'glass');for(const xx of [-1.3,0,1.3])box(g,.08,.95,.15,x+xx,5.5,4.3,'cream');}
  windows(g,[-5.6,-3.9,3.9,5.6],[2.7],4.06,1.1,1.9,'stone');box(g,3.3,3.4,.14,0,2.1,4.1,'darkwood');for(const x of [-1.1,0,1.1])box(g,.07,3.4,.1,x,2.1,4.21,'iron');
  for(const [x,h] of [[-5.3,12.5],[-2.9,10]]){cyl(g,.5,.82,h,x,h/2+.35,-4.65,'terracotta',14);for(let y=1.6;y<h;y+=2)cyl(g,.58+.22*(1-y/h),.58+.22*(1-y/h),.14,x,y,-4.65,'cream',14);cyl(g,.68,.68,.3,x,h+.35,-4.65,'slate',14);cyl(g,.47,.47,.04,x,h+.52,-4.65,'darkwood',14);}
  for(const x of [5.8,7.4]){cyl(g,.5,.5,2.4,x,1.6,-3.5,'stone',12);cone(g,.5,.6,x,3.1,-3.5,'roof',12);}
  beam(g,[5.8,3.3,-3.5],[5.8,3.3,3],.13,'terracotta');beam(g,[5.8,3.3,3],[7.2,3.3,3],.13,'terracotta');beam(g,[7.2,3.3,3],[7.2,1,3],.13,'terracotta');crate(g,-5.5,.4,4.9,1);crate(g,-4.3,.4,4.9,1);return g;
}
function watermill(){
  const g=makeGroup('place-watermill');foundation(g,8.6,8.6);box(g,7.8,2.1,7.8,-1,1.4,-.2,'stone');box(g,7.8,3.4,7.8,-1,4.15,-.2,'cream');
  for(const y of [2.5,5.7])box(g,7.9,.17,.15,-1,y,3.77,'darkwood');for(const x of [-4.8,-2.9,-1,.9,2.8])box(g,.14,3.4,.15,x,4.15,3.77,'darkwood');
  for(const x of [-3.8,-1.9,0,1.9])beam(g,[x-.75,2.7,3.8],[x+.75,5.55,3.8],.12,'darkwood',true);
  gable(g,8.6,8.5,2.4,5.9,'terracotta',-1,-.2);windows(g,[-3.3,1.3],[4.2],3.87,.95,1.4,'wood');door(g,-1,3.86,.4,1.4,1.9);
  box(g,2,1.2,1.5,-1,6.9,2.8,'cream');gable(g,2.4,1.8,.8,7.5,'roof',-1,2.8);windowFront(g,-1,7,3.62,.85,.85,'wood');chimney(g,-3.4,6.4,-2,2.1);
  const wheel=new THREE.Group();wheel.position.set(4.65,2.9,-.5);wheel.rotation.y=Math.PI/2;g.add(wheel);
  for(const z of [-.65,.65]){mesh(wheel,new THREE.TorusGeometry(2.5,.14,6,24),'darkwood',0,0,z);mesh(wheel,new THREE.TorusGeometry(1.7,.11,6,24),'wood',0,0,z);for(let i=0;i<8;i++){const a=i*Math.PI/4;beam(wheel,[0,0,z],[Math.sin(a)*2.45,Math.cos(a)*2.45,z],.16,'wood',true);}}
  for(let i=0;i<20;i++){const a=i*Math.PI/10;box(wheel,.52,.12,1.6,Math.sin(a)*2.5,Math.cos(a)*2.5,0,'lightwood',0,0,-a);}const axle=cyl(g,.28,.28,3,3.8,2.9,-.5,'darkwood',12);axle.rotation.z=Math.PI/2;
  box(g,3.6,.3,6.7,4.7,.2,-.5,'stone');steps(g,2.7,4.8,3,.13,.3);return g;
}
function lighthouse(){
  const g=makeGroup('place-lighthouse');foundation(g,9.9,8.6);const x=-1.6,z=-.7;
  for(let i=0;i<6;i++){const rb=2.2-i*.145,rt=rb-.145;cyl(g,rt,rb,2.15,x,1.425+i*2.15,z,i%2?'terracotta':'white',24);}
  for(const y of [3,7.4,11.8])windowFront(g,x,y,z+2.15-(y/2.15)*.145,.55,.95,'stone');door(g,x,z+2.17,.4,.9,1.9);
  cyl(g,2,2.2,.3,x,13.5,z,'stone',24);cyl(g,1.3,1.3,2.2,x,14.75,z,'glass',16);for(let i=0;i<8;i++){const a=i*Math.PI/4;box(g,.1,2.2,.1,x+Math.sin(a)*1.3,14.75,z+Math.cos(a)*1.3,'iron');}
  cyl(g,.4,.5,.6,x,14.65,z,'yellow',12);cone(g,1.85,1.45,x,16.7,z,'roof',16);cyl(g,.06,.06,1.8,x,18.25,z,'iron',8);ell(g,x,19.2,z,.14,.14,.14,'yellow');
  for(let i=0;i<20;i++){const a=i*Math.PI/10;box(g,.055,.8,.055,x+Math.sin(a)*1.95,14,z+Math.cos(a)*1.95,'iron');}const ring=mesh(g,new THREE.TorusGeometry(1.96,.06,6,24),'iron',x,14.42,z);ring.rotation.x=Math.PI/2;
  box(g,3.6,2.8,4,3.2,1.8,.7,'cream');gable(g,4.1,4.5,1.35,3.25,'terracotta',3.2,.7);door(g,3.2,2.75,.4,.9,1.9);windowSide(g,5.04,2.1,.7);chimney(g,4.2,3.4,-.5,1);return g;
}
function observatory(){
  const g=makeGroup('place-observatory');cyl(g,5.8,5.8,.4,0,.2,0,'stone',32);cyl(g,4.8,4.8,3.8,0,2.3,-.5,'cream',32);cyl(g,5,5,.28,0,4.35,-.5,'stone',32);
  // Two dome sectors leave an actual observing slit facing the entrance.
  for(const [start,length] of [[.16,Math.PI-.32],[Math.PI+.16,Math.PI-.32]])mesh(g,new THREE.SphereGeometry(4.65,18,10,start,length,0,Math.PI/2),'roof',0,4.5,-.5);
  for(const angle of [.16,-.16]){const points=[];for(let i=0;i<=16;i++){const a=i*Math.PI/32;points.push(new THREE.Vector3(Math.sin(angle)*Math.sin(a)*4.7,4.5+Math.cos(a)*4.7,-.5+Math.cos(angle)*Math.sin(a)*4.7));}mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),18,.08,6,false),'cream');}
  beam(g,[0,4.8,-.5],[0,8.1,2.1],.48,'cream');beam(g,[0,8.1,2.1],[0,8.8,2.65],.65,'slate');const lens=cyl(g,.5,.5,.1,0,8.86,2.71,'darkglass',16);lens.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(0,3.3,2.6).normalize());
  for(const a of [-1.1,-.55,.55,1.1,2.2,-2.2]){const sub=new THREE.Group();sub.rotation.y=a;windowFront(sub,0,2.5,4.83,1,1.4,'stone');sub.position.z=-.5;g.add(sub);}
  box(g,3.4,2.8,2.6,0,1.8,4.1,'cream');gable(g,3.8,3,1.1,3.25,'roof',0,4.1);door(g,0,5.44,.4,1.2,2.15);steps(g,3.4,5.9,3,.13,.3);return g;
}
function botanical(){
  const g=makeGroup('place-botanicaldome');cyl(g,6.7,6.7,.45,0,.225,-.65,'stone',32);cyl(g,6.35,6.35,1.2,0,1.05,-.65,glass(),32);dome(g,6.35,1.65,0,-.65,glass(),32);
  for(let i=0;i<16;i++){const a=i*Math.PI/8,points=[];for(let k=0;k<=16;k++){const t=k*Math.PI/32;points.push(new THREE.Vector3(Math.cos(a)*Math.sin(t)*6.4,1.65+Math.cos(t)*6.4,-.65+Math.sin(a)*Math.sin(t)*6.4));}mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,.055,5,false),'cream');box(g,.09,1.25,.09,Math.cos(a)*6.4,1.05,-.65+Math.sin(a)*6.4,'cream');}
  for(const [r,y] of [[6.4,1.65],[5.54,4.85],[3.2,7.2]]){const ring=mesh(g,new THREE.TorusGeometry(r,.065,6,40),'cream',0,y,-.65);ring.rotation.x=Math.PI/2;}
  for(const [x,z,h] of [[-2.8,-1,4.5],[2.7,-2.1,3.6],[0,-3.7,4.8],[-3.5,1.3,2.6],[2.7,1.3,2.8]]){cyl(g,.12,.2,h,x,.45+h/2,z,'wood',8);for(let i=0;i<6;i++){const a=i*Math.PI/3;const leaf=ell(g,x+Math.cos(a)*.75,h+.3,z+Math.sin(a)*.75,1.25,.2,.42,i%2?'leaf':'leafDark');leaf.rotation.y=-a;leaf.rotation.z=.18*Math.cos(a);}box(g,1.4,.5,1.4,x,.7,z,'terracotta');}
  box(g,3.4,2.6,2.6,0,1.75,5.5,'wood');box(g,2.9,2.1,.15,0,1.8,6.84,'glass');gable(g,3.8,2.9,1.2,3.1,'roof',0,5.5);door(g,0,6.95,.45,1.3,2.05,'darkglass');steps(g,3.5,7.45,3,.14,.2);return g;
}
function arena(){
  const g=makeGroup('place-sportsarena');const oval=(geometry,tone,y,sx=1,sz=.76)=>{const m=mesh(g,geometry,tone,0,y,0);m.scale.set(sx,1,sz);return m;};
  oval(new THREE.CylinderGeometry(8.3,8.6,.45,32),'stone',.225);oval(new THREE.CylinderGeometry(8.15,8.15,2.5,32,1,true),'cream',1.65);
  for(let i=0;i<24;i++){const a=i*Math.PI/12;const x=Math.sin(a)*8.2,z=Math.cos(a)*6.23;box(g,.22,3.5,.25,x,2.05,z,'stone',0,a);if(i%3===0){const p=new THREE.Group();p.position.set(x*.99,0,z*.99);p.rotation.y=a;windowFront(p,0,1.65,0,.8,1.5,'stone');g.add(p);}}
  // Concentric, open-center seating rings preserve a clear view of the field.
  for(let i=0;i<4;i++){const r=5.8+i*.55,y=.65+i*.52;oval(new THREE.CylinderGeometry(r,r,.25,32,1,true),i%2?'terracotta':'sand',y);const ring=oval(new THREE.TorusGeometry(r,.3,4,32),'terracotta',y);ring.rotation.x=Math.PI/2;ring.scale.set(1,.76,1);}
  box(g,8.6,.08,5.3,0,.52,0,'leaf');for(const x of [-4.1,0,4.1])box(g,.05,.02,5,x,.57,0,'white');for(const z of [-2.5,2.5])box(g,8.25,.02,.05,0,.57,z,'white');const center=mesh(g,new THREE.TorusGeometry(.9,.025,4,24),'white',0,.58,0);center.rotation.x=Math.PI/2;
  for(let i=0;i<24;i++){const a=i*Math.PI/12;const roof=box(g,2.12,.18,1.35,Math.sin(a)*7.75,4.1,Math.cos(a)*5.9,i%2?'roof':'cream',-.1,a);roof.rotateZ(.08);beam(g,[Math.sin(a)*8.2,2.9,Math.cos(a)*6.23],[Math.sin(a)*7.4,4.1,Math.cos(a)*5.65],.09,'iron');}
  for(const x of [-3.9,3.9]){box(g,.08,1.2,.08,x,1.2,-1,'white');box(g,.08,1.2,.08,x,1.2,1,'white');box(g,.08,.08,2,x,1.8,0,'white');}
  box(g,3,1.2,.15,0,4.9,-6.4,'darkwood');box(g,2.6,.7,.04,0,4.95,-6.3,'yellow');for(const x of [-6.4,6.4])flag(g,x,4.2,-3.8,x<0?'terracotta':'leafDark');return g;
}
function pool(){
  const g=makeGroup('place-communitypool');foundation(g,16,13.6);box(g,10,.24,7.5,-1.7,.47,1,'white');box(g,9.2,.12,6.7,-1.7,.6,1,'water');
  for(const x of [-4.5,-2.7,-.9,.9])box(g,.07,.015,5.7,x,.67,1,'cream');for(const z of [-1.9,3.9])box(g,8.4,.015,.07,-1.7,.67,z,'cream');
  for(const x of [-6.6,3.2])box(g,.28,.15,7.7,x,.76,1,'stone');for(const z of [-2.85,4.85])box(g,10.1,.15,.28,-1.7,.76,z,'stone');
  box(g,14.6,2.55,3,0,1.64,-4.9,'cream');gable(g,15,3.4,1.05,2.95,'terracotta',0,-4.9);for(const x of [-5.5,-3.4,3.4,5.5])door(g,x,-3.36,.4,.9,1.85,'leafDark');windowFront(g,0,1.9,-3.32,2.3,1,'white');
  for(const x of [4.8,7.1])for(const z of [-1.8,4.7])box(g,.16,2.8,.16,x,1.8,z,'wood');for(let z=-2;z<=4.9;z+=.55)box(g,2.8,.16,.12,5.95,3.25,z,'lightwood');
  for(const z of [-.8,1.2,3.2]){box(g,1.6,.16,.65,5.9,.85,z,'cream');box(g,.4,.5,.65,5.15,1.06,z,'cream',0,0,.35);}
  box(g,1.2,1.8,1.2,1.7,1.4,4.5,'stone');box(g,1.4,.16,2.3,1.7,2.4,4,'white');for(const x of [1.15,2.25]){box(g,.07,1,.07,x,2.9,4.65,'iron');box(g,.07,.07,1.2,x,3.4,4.1,'iron');}
  for(const x of [-5.6,-4.95]){beam(g,[x,.8,-2.8],[x,1.5,-2.8],.045,'iron');beam(g,[x,1.5,-2.8],[x,1.5,-2.2],.045,'iron');beam(g,[x,1.5,-2.2],[x,.65,-2.2],.045,'iron');}return g;
}
function temple(){
  const g=makeGroup('place-templepavilion');foundation(g,11.2,9.7);box(g,9.7,.4,8.2,0,.55,0,'stone');
  for(const x of [-4,-1.35,1.35,4])for(const z of [-3.2,3.2]){box(g,.65,.23,.65,x,.88,z,'stone');cyl(g,.2,.23,3.8,x,2.85,z,'red',12);box(g,.7,.22,.7,x,4.7,z,'yellow');}
  for(const z of [-3.2,3.2])box(g,9.2,.35,.28,0,4.8,z,'darkwood');for(const x of [-4,4])box(g,.28,.35,7.5,x,4.8,0,'darkwood');
  for(const [w,d,y,h] of [[12.3,10.9,4.75,2.3],[7.7,6.9,7.05,1.7],[4.5,4.1,8.7,1.25]]){
    const geometry=new THREE.ConeGeometry(1,h,4);geometry.rotateY(Math.PI/4);
    mesh(g,geometry,'leafDark',0,y+h/2,0,w/Math.SQRT2,1,d/Math.SQRT2);
    for(const x of [-w/2,w/2])for(const z of [-d/2,d/2]){beam(g,[x*.68,y+.1,z*.68],[x,y+.6,z],.13,'roof',true);ell(g,x,y+.61,z,.14,.14,.14,'yellow');}
    for(const z of [-d/2,d/2])beam(g,[-w/2,y+.6,z],[0,y+.12,z*.9],.1,'roof',true);for(const z of [-d/2,d/2])beam(g,[0,y+.12,z*.9],[w/2,y+.6,z],.1,'roof',true);
  }
  cyl(g,.13,.18,.55,0,10.15,0,'yellow',10);ell(g,0,10.55,0,.19,.25,.19,'yellow');
  for(const x of [-4,4])railing(g,-2.7,2.7,.9,x,'darkwood',.6);box(g,2.4,.45,1.3,0,1.05,-2.4,'darkwood');cyl(g,.42,.55,.65,0,1.6,-2.4,'yellow',12);
  steps(g,5,5.6,5,.15,.25);return g;
}
function fortress(){
  const g=makeGroup('place-fortressgate');foundation(g,15.7,9.7);
  for(const x of [-5.6,5.6]){box(g,4.3,8.7,6.7,x,4.7,-.3,'stone');box(g,4.7,.5,7.1,x,8.9,-.3,'cream');
    for(const y of [1.5,3,4.5,6,7.5]){box(g,4.34,.055,.08,x,y,3.1,'sand');for(const z of [-2.6,0,2.5])box(g,.08,.055,1.1,x+Math.sign(x)*2.18,y,z,'sand');}
    for(const y of [3.7,6.5]){box(g,.35,1.35,.09,x,y,3.12,'darkglass');box(g,.12,1.5,.1,x-.28,y,3.15,'cream');box(g,.12,1.5,.1,x+.28,y,3.15,'cream');}
    for(const xx of [-1.7,-.55,.55,1.7])for(const z of [-3.55,2.95])box(g,.65,1,.65,x+xx,9.65,z,'stone');for(const z of [-2.3,-1.1,.1,1.3])for(const xx of [-2.05,2.05])box(g,.65,1,.65,x+xx,9.65,z,'stone');
    flag(g,x,9.4,-.3,x<0?'terracotta':'leafDark');
  }
  box(g,7.1,2.6,5.4,0,7.55,-.3,'stone');box(g,7.4,.35,5.8,0,9.05,-.3,'cream');
  // Arch and separated piers leave the gate opening visible in three dimensions.
  for(const x of [-3.1,3.1])box(g,1.1,4.9,5.5,x,2.8,-.3,'stone');arch(g,0,3.6,2.48,2.65,.5,.55,'cream');arch(g,0,3.6,-3.03,2.65,.5,.55,'cream');
  for(const x of [-1.22,1.22]){box(g,2.32,3.5,.24,x,2.1,1.85,'darkwood');for(const y of [1.1,2.9])box(g,2.3,.13,.13,x,y,2.05,'iron');ell(g,x+Math.sign(x)*-.65,2,2.16,.12,.15,.04,'iron');}
  for(let x=-2.2;x<=2.3;x+=.45)box(g,.09,1.5,.1,x,4.6,2.05,'iron');for(const y of [4,4.65,5.25])box(g,4.6,.08,.1,0,y,2.05,'iron');
  windows(g,[-2,0,2],[7.6],2.45,.5,1.1,'cream');for(let x=-3;x<=3;x+=1)box(g,.65,.8,.65,x,9.6,2.45,'stone');steps(g,5.4,4.9,3,.13,.4);return g;
}

const factories={
  'place-townhall':townhall,'place-museum':museum,'place-postoffice':postoffice,'place-policestation':police,
  'place-clinic':clinic,'place-university':university,'place-courthouse':courthouse,'place-trainstation':trainstation,
  'place-busdepot':busdepot,'place-airportterminal':airport,'place-warehouse':warehouse,'place-factory':factory,
  'place-watermill':watermill,'place-lighthouse':lighthouse,'place-observatory':observatory,'place-botanicaldome':botanical,
  'place-sportsarena':arena,'place-communitypool':pool,'place-templepavilion':temple,'place-fortressgate':fortress,
};

export function createPlaceBuilding(id){return Object.hasOwn(factories,id)?factories[id]():null;}
