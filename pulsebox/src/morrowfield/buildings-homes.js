import {THREE,building,mat,mesh,box,ell,cyl,cone,beam,gable,windowFront,windowSide,door,chimney,porch,flowerbox,foundation,planter} from './building-kit.js';

export const HOME_BUILDINGS=[
  building('home-bungalow','Clover bungalow','A low, broad bungalow with a stone porch, an offset bay window and a generous hipped roof.',{width:9.5,depth:9.5,height:6.5,tags:'small house home bungalow single story suburban porch'}),
  building('home-duplex','Hearthside duplex','Two homes under neighboring gables, each with its own recessed entrance and small front garden.',{width:11,depth:9.5,height:7.2,tags:'house home duplex two family paired suburban'}),
  building('home-victorian','Rosewood Victorian','A tall, decorative home with an octagonal turret, wraparound veranda and delicate spindle trim.',{width:10,depth:11,height:12,tags:'house home victorian turret historic ornate porch'}),
  building('home-tudor','Hazel timber house','Steep cross-gables, dark timber bracing and an overhanging upper story give this home a storybook silhouette.',{width:9.5,depth:10,height:10,tags:'house home tudor half timber historic medieval cottage'}),
  building('home-stilt','Dune stilt house','An elevated seaside home with cross-braced timber piles, a sunny deck and a long stairway.',{width:9,depth:13.8,height:8.4,tags:'house home beach seaside coastal tropical stilts raised'}),
  building('home-aframe','Needle A-frame','A true triangular timber home with a full-height glazed front, standing-seam roof and a little deck.',{width:8.6,depth:9,height:7.4,tags:'small house home a-frame aframe triangle cabin forest mountain'}),
  building('home-adobe','Sunstone adobe','A low desert home with rounded parapets, a domed side room, inset arches and a shaded entrance.',{width:10.5,depth:9.2,height:5.8,tags:'house home adobe desert clay dome southwest sand'}),
  building('home-yurt','Wandering yurt','A round canvas dwelling with timber lattice, a conical roof, central skylight and circular deck.',{width:8.8,depth:10,height:5.7,tags:'small house home yurt round tent canvas nomad'}),
  building('home-riad','Fig courtyard home','Three terraced wings surround an open tiled courtyard, with arched windows, potted greenery and a little fountain.',{width:10,depth:9.4,height:6,tags:'house home riad courtyard desert arch terrace'}),
  building('home-container','Crossbeam container home','Two corrugated shipping-container volumes cross above a planted terrace and an exterior steel stair.',{width:11.5,depth:10,height:7.2,tags:'house home modern container industrial recycled metal'}),
  building('home-tiny','Acorn tiny house','A compact timber home on a low trailer, with a loft dormer, folding-size porch and carefully framed windows.',{width:5.7,depth:9.6,height:5.8,tags:'small house home tiny portable trailer wooden loft'}),
  building('home-boathouse','Reedbank boathouse','A waterside cabin with broad boat doors, a timber dock, mooring posts and a small rowboat.',{width:10,depth:12.5,height:7,tags:'house home boathouse lake water dock boat coastal'}),
  building('home-loft','Foundry loft','An old brick workshop converted into a home, with sawtooth skylights, tall arched windows and a steel access stair.',{width:12,depth:10,height:9.3,tags:'house home loft converted industrial brick modern sawtooth'}),
  building('home-chalet','Edelstone chalet','A stone-and-timber mountain home with a deep roof, full-width balcony and a substantial masonry chimney.',{width:11,depth:10,height:10,tags:'house home chalet alpine mountain stone timber balcony'}),
  building('home-canal','Copper canal house','A slender four-level home with a stepped gable, tall sash windows and a raised front stoop.',{width:6.2,depth:10.2,height:12.5,tags:'house home canal narrow stepped gable urban brick'}),
  building('home-row','Mulberry terrace','Three adjoining town homes, with alternating rooflines, individual doorways, front steps and planted window boxes.',{width:13.5,depth:10,height:9.2,tags:'house home row terrace terraced townhouse neighborhood urban'}),
  building('home-earth','Mossbank earth home','A curved, planted roof shelters an arched stone front, round windows and a deep circular doorway.',{width:10.2,depth:9.6,height:6.2,tags:'house home earth eco green planted roof curved hobbit'}),
  building('home-pavilion','Lantern pavilion home','A timber residence with two tiers of gently lifted eaves, screened windows and a wide raised veranda.',{width:10.4,depth:10.2,height:10,tags:'house home pavilion asian inspired tiered roof pagoda timber'}),
  building('home-manor','Ashgrove manor','A formal limestone manor with a mansard roof, two dormers, paired chimneys and a columned entrance.',{width:12,depth:12,height:11,tags:'house home manor mansion estate classical stone dormer'}),
  building('home-lodge','Stillwater lodge','A broad lakeside lodge with a great glazed hall, exposed timber trusses and a long viewing deck.',{width:14.5,depth:12,height:9.5,tags:'house home lodge lake large timber glass vacation retreat'})
];

const shapes=new Map();
function shapeGeometry(key,make){if(!shapes.has(key))shapes.set(key,make());return shapes.get(key);}
function archShape(w,h){const s=new THREE.Shape(),r=w/2;s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h-r);s.absarc(0,h-r,r,0,Math.PI,false);s.lineTo(-r,0);return s;}
function arch(g,x,y,z,w,h,{frame='cream',panel='darkglass',isDoor=false,mullions=true}={}){
  const back=shapeGeometry(`arch-${w+.22}-${h+.14}`,()=>new THREE.ExtrudeGeometry(archShape(w+.22,h+.14),{depth:.13,bevelEnabled:false,curveSegments:12}));
  const front=shapeGeometry(`arch-${w}-${h}`,()=>new THREE.ExtrudeGeometry(archShape(w,h),{depth:.035,bevelEnabled:false,curveSegments:12}));
  mesh(g,back,frame,x,y-.05,z);mesh(g,front,panel,x,y,z+.14);
  if(mullions){box(g,.065,h-.2,.06,x,y+h/2-.08,z+.2,frame);if(!isDoor)box(g,w,.065,.06,x,y+h*.48,z+.2,frame);}
  if(isDoor){ell(g,x+w*.28,y+h*.42,z+.22,.045,.045,.045,'yellow');box(g,w+.4,.14,.45,x,y-.05,z+.15,'stone');}
}
function roundWindow(g,x,y,z,r=.45){const frame=cyl(g,r,r,.11,x,y,z,'cream',24);frame.rotation.x=Math.PI/2;const glass=cyl(g,r*.8,r*.8,.07,x,y,z+.08,'darkglass',24);glass.rotation.x=Math.PI/2;box(g,r*1.6,.055,.08,x,y,z+.13,'cream');box(g,.055,r*1.6,.08,x,y,z+.13,'cream');}
function railing(g,x1,z1,x2,z2,y,h=.8){const length=Math.hypot(x2-x1,z2-z1),n=Math.max(1,Math.ceil(length/.55));for(let i=0;i<=n;i++)box(g,.07,h,.07,x1+(x2-x1)*i/n,y+h/2,z1+(z2-z1)*i/n,'wood');beam(g,[x1,y+h,z1],[x2,y+h,z2],.09,'lightwood',true);}
function stairs(g,x,z,width,count,rise=.18,run=.3,base=0){for(let i=0;i<count;i++)box(g,width,rise*(i+1),run,x,base+rise*(i+1)/2,z-i*run,'stone');}
function plankDeck(g,w,d,x=0,y=.3,z=0){box(g,w,.2,d,x,y,z,'wood');for(let i=0;i<Math.floor(w/.3);i++)box(g,.27,.035,d-.06,x-w/2+.16+i*.3,y+.12,z,'lightwood');}
function hip(g,w,d,h,y,color='roof',x=0,z=0){const ge=shapeGeometry(`hip-${w}-${d}-${h}`,()=>{const p=[-w/2,0,-d/2,w/2,0,-d/2,w/2,0,d/2,-w/2,0,d/2,-w*.22,h,0,w*.22,h,0];const a=new THREE.BufferGeometry();a.setAttribute('position',new THREE.Float32BufferAttribute(p,3));a.setIndex([0,4,1,1,4,5,1,5,2,2,5,3,3,5,4,3,4,0,0,1,2,0,2,3]);a.computeVertexNormals();return a.toNonIndexed();});mesh(g,ge,color,x,y,z);box(g,w+.12,.12,d+.12,x,y-.03,z,'cream');beam(g,[x-w*.22,y+h+.025,z],[x+w*.22,y+h+.025,z],.1,color,true);}
function slatWalls(g,w,d,h,y,color='lightwood',x=0,z=0){for(let yy=y-h/2+.15;yy<y+h/2;yy+=.27){for(const zz of [z-d/2-.02,z+d/2+.02])box(g,w,.055,.06,x,yy,zz,color);}}
function centered(g,id){g.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(g),center=bounds.getCenter(new THREE.Vector3());g.position.x-=center.x;g.position.z-=center.z;const result=new THREE.Group();result.name=id;result.add(g);return result;}

function bungalow(g){
  foundation(g,7.3,5.5);box(g,7.1,2.8,5.3,0,1.75,0,'cream');hip(g,8.2,6.35,1.7,3.2,'terracotta');
  box(g,2.3,2,.9,1.8,1.55,2.95,'stone');windowFront(g,1.8,1.75,3.43,1.85,1.35);hip(g,2.65,1.2,.55,2.6,'terracotta',1.8,3.06);
  door(g,-1.7,2.71,.35,1.05,2);windowFront(g,-.2,1.8,2.72,.9,1.3);porch(g,3.5,3.4,.3,2.8,3);
  for(const x of [-3.6,3.6])for(const z of [-1.5,.2])windowSide(g,x,1.8,z,1.15,1.3);
  chimney(g,-2.4,3.5,-1.25,1.7);flowerbox(g,1.8,.98,3.65,1.9);planter(g,-3.1,.3,3.45,.75,.75);
}
function duplex(g){
  foundation(g,9.4,5.7);box(g,9.2,3.7,5.5,0,2.2,0,'stone');
  for(const x of [-2.3,2.3]){
    box(g,4.35,1.2,5.5,x,4.05,0,'cream');gable(g,4.8,6.1,1.7,4.7,'roof',x,0);
    door(g,x-.75,2.83,.35,.9,2.1);windowFront(g,x+.8,1.8,2.83,1.1,1.35);roundWindow(g,x,4.65,2.83,.5);
    box(g,3.7,.18,1.4,x,2.8,3.3,'terracotta',-.12);for(const xx of [x-1.7,x+1.7])box(g,.13,2.45,.13,xx,1.6,3.8,'white');
    stairs(g,x-.75,4.2,1.4,2);flowerbox(g,x+.8,.95,3.06,1.15);
  }
  box(g,.18,4.1,5.65,0,2.4,0,'white');chimney(g,0,4.1,-1.2,2.2);
  for(const x of [-4.65,4.65])for(const z of [-1.6,.8])windowSide(g,x,2.05,z,1.15,1.6);
}
function victorian(g){
  foundation(g,6.8,6.2);box(g,6.55,5.7,5.95,-.3,3.2,0,0xd2b7a6);gable(g,7.2,6.7,2.2,6.1,'slate',-.3,0);
  cyl(g,1.22,1.3,7.8,2.6,4.2,1.5,'cream',8);cyl(g,1.35,1.35,.17,2.6,3.3,1.5,'white',8);cyl(g,1.4,1.4,.2,2.6,7.95,1.5,'white',8);cone(g,1.7,2.6,2.6,9.35,1.5,'slate',8);cyl(g,.07,.1,.55,2.6,10.85,1.5,'yellow',8);
  plankDeck(g,7.7,2,0,.32,3.35);plankDeck(g,1.6,5.4,-3.5,.32,.7);
  for(const x of [-3.55,-2.1,-.6,.9]){box(g,.13,2.8,.13,x,1.8,4.2,'white');for(const dx of [-.24,.24])beam(g,[x,2.72,4.2],[x+dx,3.1,4.2],.055,'white',true);}
  box(g,7.9,.2,2.2,0,3.22,3.35,'roof',-.06);railing(g,-3.6,4.2,-1.1,4.2,.48);railing(g,.6,4.2,3.65,4.2,.48);
  door(g,-.25,3.01,.38,1.05,2.1);for(const x of [-2.1,.85])for(const y of [1.9,4.7])arch(g,x,y-.85,3.04,.95,1.8);
  for(const y of [2.1,5.5]){windowFront(g,2.6,y,2.77,.7,1.35);windowSide(g,3.87,y,1.5,.7,1.35);}
  for(const x of [-3.62,3.03])windowSide(g,x,4.7,-1.4,1,1.65);stairs(g,-.25,5.1,1.7,3);chimney(g,-2,6.5,-1.6,2.1);
}
function tudor(g){
  foundation(g,6.8,5.9);box(g,6.5,2.6,5.6,0,1.65,0,'stone');box(g,7,2.7,6,0,4.3,0,'cream');gable(g,7.6,6.6,2.7,5.7,'slate');
  box(g,3,4.8,1.65,-.5,2.8,3.1,'cream');gable(g,3.7,2.1,1.7,5.2,'slate',-.5,3.1);
  for(const z of [-3.07,3.07]){for(const y of [3.05,4.25,5.65])box(g,7.05,.17,.12,0,y,z,'darkwood');for(const x of [-3.35,-1.7,0,1.7,3.35])box(g,.16,2.65,.12,x,4.3,z,'darkwood');for(const x of [-2.5,.8])beam(g,[x-.65,3.2,z],[x+.65,4.2,z],.12,'darkwood',true);}
  for(const x of [-1.95,.95])box(g,.16,4.8,.12,x,2.8,3.97,'darkwood');box(g,3,.17,.13,-.5,3.25,3.97,'darkwood');
  beam(g,[-2.15,5.25,4.18],[-.5,6.75,4.18],.13,'darkwood',true);beam(g,[-.5,6.75,4.18],[1.15,5.25,4.18],.13,'darkwood',true);
  door(g,-.5,3.99,.35,1,2.1);windowFront(g,-.5,4.25,4.02,1.5,1.2,'lightwood');for(const x of [-2.55,2.55])for(const y of [1.8,4.6])windowFront(g,x,y,3.13,1,1.25,'lightwood');
  for(const x of [-3.54,3.54])windowSide(g,x,4.5,-.9,1.4,1.3);chimney(g,2.4,5.9,-1.55,2.4);flowerbox(g,-.5,3.52,4.23,1.5);
}
function stilt(g){
  for(const x of [-3.25,0,3.25])for(const z of [-2.5,2.5])box(g,.2,2.6,.2,x,1.3,z,'darkwood');
  for(const z of [-2.5,2.5]){beam(g,[-3.25,.15,z],[0,2.4,z],.13,'wood',true);beam(g,[0,.15,z],[3.25,2.4,z],.13,'wood',true);}
  plankDeck(g,7.4,6.7,0,2.55,.55);box(g,6.2,2.6,4.5,0,3.98,-.15,0xb8d0c2);slatWalls(g,6.2,4.5,2.6,3.98,'white',0,-.15);hip(g,7.15,5.4,1.6,5.4,'terracotta',0,-.15);
  door(g,0,2.17,2.72,1,2.05,'glass');for(const x of [-1.9,1.9])windowFront(g,x,4.05,2.17,1.25,1.4);for(const x of [-3.15,3.15])windowSide(g,x,4.05,-.5,1.25,1.4);
  railing(g,-3.5,3.7,.9,3.7,2.7);railing(g,2.8,3.7,3.5,3.7,2.7);railing(g,-3.5,-2.6,-3.5,3.7,2.7);railing(g,3.5,-2.6,3.5,3.7,2.7);
  for(let i=0;i<8;i++)box(g,1.6,.13,.42,1.85,.19+i*.34,6.85-i*.42,'lightwood');
  for(const x of [1.05,2.65])beam(g,[x,.8,6.9],[x,3.55,3.55],.065,'white',true);
}
function aframe(g){
  foundation(g,6.4,5.7);gable(g,6.3,5.5,5.8,.4,'wood');
  const angle=Math.atan2(6,3.35),length=Math.hypot(6,3.35);for(const side of [-1,1]){box(g,length,.16,6.3,side*1.675,3.42,0,'slate',0,0,-side*angle);for(let z=-3;z<=3;z+=.6)beam(g,[side*3.35,.43,z],[0,6.43,z],.035,'roof',true);}
  const glassShape=new THREE.Shape();glassShape.moveTo(-2.8,.5);glassShape.lineTo(2.8,.5);glassShape.lineTo(0,5.8);glassShape.closePath();mesh(g,new THREE.ExtrudeGeometry(glassShape,{depth:.055,bevelEnabled:false}),'darkglass',0,0,2.79);
  for(const y of [1.8,3.2,4.45]){const half=2.8*(1-(y-.5)/5.3);box(g,half*2,.1,.1,0,y,2.89,'lightwood');}box(g,.12,5.4,.1,0,3.1,2.89,'lightwood');
  door(g,0,2.92,.4,1,2,'wood');plankDeck(g,6.5,1.8,0,.3,3.5);stairs(g,0,4.7,1.6,2);flowerbox(g,-2.1,.65,3.7,.85);flowerbox(g,2.1,.65,3.7,.85);
}
function adobe(g){
  foundation(g,7.7,5.8);const clay=mat(0xd3b18f);box(g,7.3,2.85,5.4,0,1.8,0,clay);box(g,7.7,.22,5.8,0,3.35,0,clay);
  for(const x of [-3.65,3.65])box(g,.23,.55,5.5,x,3.67,0,clay);for(const z of [-2.7,2.7])box(g,7.3,.55,.23,0,3.67,z,clay);
  cyl(g,1.65,1.65,2.7,2.55,1.7,-.6,clay,24);const dome=shapeGeometry('adobe-dome',()=>new THREE.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI/2));mesh(g,dome,'sand',2.55,3.05,-.6,1.8,1.35,1.8);
  arch(g,-.8,.35,2.76,1.4,2.35,{frame:'sand',panel:'wood',isDoor:true});for(const x of [-2.7,1.5])arch(g,x,1.1,2.78,.95,1.35,{frame:'sand'});
  for(let x=-3.1;x<3.3;x+=.65)cyl(g,.075,.075,.5,x,3.03,2.93,'darkwood',8).rotation.x=Math.PI/2;
  for(const x of [-1.85,.25])box(g,.13,2.45,.13,x,1.6,4,'wood');box(g,2.5,.13,1.6,-.8,2.85,3.4,'lightwood',-.09);
  for(const x of [-3,2.8]){cyl(g,.32,.43,.65,x,.65,3.4,'terracotta');ell(g,x,1.15,3.4,.45,.6,.45,'leaf');}
}
function yurt(g){
  cyl(g,3.55,3.65,.3,0,.15,0,'wood',32);cyl(g,3.1,3.15,2.4,0,1.55,0,'cream',32);cone(g,3.5,1.7,0,3.55,0,'sand',32);
  for(let i=0;i<20;i++){const a=i*Math.PI/10,x=Math.sin(a),z=Math.cos(a);beam(g,[x*3.16,.45,z*3.16],[x*3.11,2.73,z*3.11],.045,'lightwood');beam(g,[x*3.49,2.72,z*3.49],[x*.3,4.28,z*.3],.028,'wood');}
  for(const y of [.6,2.35]){const torus=new THREE.Mesh(shapeGeometry('yurt-ring',()=>new THREE.TorusGeometry(3.16,.035,5,40)),mat('wood'));torus.rotation.x=Math.PI/2;torus.position.y=y;g.add(torus);}
  cyl(g,.4,.48,.2,0,4.43,0,'darkwood',20);cyl(g,.32,.32,.035,0,4.55,0,'glass',20);
  door(g,0,3.17,.3,1.15,2.1,'wood');for(const x of [-1.8,1.8]){const sub=new THREE.Group();roundWindow(sub,0,1.7,0,.4);sub.position.set(x,0,2.62);sub.rotation.y=x<0?-.6:.6;g.add(sub);}
  stairs(g,0,4.45,1.8,2);box(g,1.8,.12,1.1,0,.31,3.7,'lightwood');
}
function riad(g){
  foundation(g,8.4,7.1);box(g,7.9,.06,6.6,0,.4,0,'sand');for(let x=-2;x<=2;x+=.8)for(let z=-1.5;z<=2;z+=.8)box(g,.72,.02,.72,x,.445,z,(Math.round((x+z)*10)%2)?'cream':'stone');
  for(const x of [-3.1,3.1]){box(g,2.1,3.7,6.7,x,2.25,0,'cream');box(g,2.3,.18,7,x,4.22,0,'terracotta');for(const side of [-1,1])box(g,.16,.6,6.8,x+side*1.05,4.6,0,'sand');arch(g,x,.8,3.41,1.1,2.6);}
  box(g,6.2,3.7,2,0,2.25,-2.5,'cream');box(g,6.4,.18,2.25,0,4.22,-2.5,'terracotta');box(g,6.4,.6,.16,0,4.6,-3.52,'sand');
  for(const x of [-1.9,0,1.9])arch(g,x,.65,-1.43,1.15,2.9);box(g,4.3,2.65,.22,0,1.75,3.35,'sand');arch(g,0,.4,3.48,1.5,2.2,{panel:'wood',isDoor:true});
  cyl(g,.84,.94,.25,0,.57,.1,'stone',16);cyl(g,.7,.7,.055,0,.73,.1,'water',20);cyl(g,.13,.22,.55,0,.95,.1,'cream');
  for(const x of [-1.5,1.5])planter(g,x,.45,1.5,.85,.85);
}
function containerHome(g){
  foundation(g,8.5,4.1);box(g,8.2,2.7,3.5,0,1.75,-.6,'leafDark');box(g,3.3,2.7,6.7,1.65,4.55,.35,'cream');
  for(let x=-4;x<4.1;x+=.28){for(const z of [-2.4,1.2])box(g,.055,2.65,.045,x,1.75,z,'leaf');}
  for(let z=-2.9;z<3.7;z+=.28)for(const x of [-.03,3.33])box(g,.045,2.65,.055,x,4.55,z,'stone');
  box(g,8.4,.14,3.7,0,3.18,-.6,'slate');box(g,3.5,.15,6.9,1.65,5.99,.35,'slate');
  for(const x of [-2.7,-.9])windowFront(g,x,1.75,1.23,1.4,1.8);door(g,1.65,1.23,.35,1.15,2.1,'glass');windowFront(g,1.65,4.6,3.74,2.45,1.85);
  for(const z of [-1.8,.3,2.3])windowSide(g,3.37,4.6,z,1.15,1.7);for(const x of [.2,3.05])box(g,.12,3.15,.12,x,1.58,3.5,'iron');
  plankDeck(g,3.8,2.5,-2.05,3.25,1.6);railing(g,-3.9,2.8,-.2,2.8,3.39);for(let i=0;i<10;i++)box(g,.36,.1,1,-4.7+i*.35,.2+i*.34,2.2,'iron');
  planter(g,-2.6,3.4,1.4,.8,.8);planter(g,-1.2,3.4,1.4,.8,.8);
}
function tiny(g){
  box(g,3.6,.3,5.7,0,.35,0,'iron');for(const x of [-1.63,1.63])for(const z of [-1.45,1.45]){const wheel=cyl(g,.36,.36,.22,x,.36,z,'iron',16);wheel.rotation.z=Math.PI/2;}
  box(g,3.25,2.5,5.2,0,1.85,0,'wood');slatWalls(g,3.25,5.2,2.5,1.85);gable(g,3.85,5.8,1.4,3.18,'leafDark');
  door(g,-.55,2.64,.6,.8,1.9);windowFront(g,.8,1.95,2.65,.8,1.1);for(const x of [-1.67,1.67])for(const z of [-1.55,.8])windowSide(g,x,1.95,z,1.1,1.2);
  box(g,1.65,.8,1.5,0,3.6,1.2,'cream');gable(g,1.95,1.8,.65,4.02,'leafDark',0,1.2);windowFront(g,0,3.62,1.98,1.1,.55);
  plankDeck(g,3.5,1.3,0,.45,3.18);stairs(g,-.55,4.1,1.2,3);beam(g,[-1,.37,-2.8],[0,.37,-3.8],.1,'iron',true);beam(g,[1,.37,-2.8],[0,.37,-3.8],.1,'iron',true);
}
function boathouse(g){
  plankDeck(g,7.6,5.6,0,.4,-1.35);for(const x of [-3.7,3.7]){plankDeck(g,1.25,9.7,x,.4,1.25);for(const z of [-3,0,3.5,5.6])box(g,.18,1.2,.18,x,.6,z,'darkwood');}
  box(g,6.3,3.6,4.6,0,2.3,-1.3,'wood');slatWalls(g,6.3,4.6,3.6,2.3,'lightwood',0,-1.3);gable(g,7,5.3,2,4.2,'roof',0,-1.3);
  box(g,3.4,2.85,.15,0,2.05,1.04,'darkwood');for(const x of [-1.75,1.75])box(g,.18,3.1,.16,x,2.05,1.17,'cream');box(g,3.7,.17,.16,0,3.6,1.17,'cream');
  for(const x of [-.9,.9]){box(g,1.65,2.85,.08,x,2.05,1.16,'wood');beam(g,[x-.73,.7,1.22],[x+.73,3.35,1.22],.09,'cream',true);}
  roundWindow(g,0,4.6,1.1,.55);for(const x of [-3.2,3.2])for(const z of [-2.4,-.4])windowSide(g,x,2.4,z,1.1,1.3);
  ell(g,0,.75,3.3,.85,.4,1.9,'darkglass');ell(g,0,.95,3.3,.73,.22,1.67,'lightwood');for(const z of [2.5,3.7])box(g,1.3,.08,.3,0,1.08,z,'wood');beam(g,[-.6,1.15,2.2],[.7,1.15,4.4],.045,'cream');
}
function loft(g){
  foundation(g,8.5,6.2);box(g,8.2,6.2,5.9,0,3.45,0,'red');
  for(const x of [-2.8,0,2.8]){gable(g,2.85,6.4,1.4,6.65,'slate',x,0);box(g,2.3,.07,3.7,x,7.22,0,'glass',0,0,-.48);}
  for(const x of [-2.7,0,2.7]){arch(g,x,.7,3,1.7,3);windowFront(g,x,5.25,3.02,1.6,1.55,'iron');}
  for(const x of [-4.16,4.16])for(const z of [-1.8,.8])windowSide(g,x,4.65,z,1.5,2.2);
  box(g,8.4,.2,.3,0,3.9,3.1,'stone');for(const x of [-4.05,4.05])box(g,.25,6.4,.2,x,3.5,3.05,'stone');
  for(let i=0;i<12;i++)box(g,1.2,.12,.34,4.9,.2+i*.31,3.5-i*.34,'iron');beam(g,[5.48,.95,3.65],[5.48,4.4,-.4],.055,'iron');box(g,1.4,.14,1.5,4.85,3.9,-.9,'iron');
  chimney(g,-2.8,6.6,-1.9,1.9);
}
function chalet(g){
  foundation(g,7.8,6.2);box(g,7.5,2.85,5.9,0,1.78,0,'stone');box(g,7.7,2.7,6.05,0,4.58,0,'wood');slatWalls(g,7.7,6.05,2.7,4.58);
  gable(g,9.2,7.1,2.4,6,'slate');for(const x of [-2.4,0,2.4])windowFront(g,x,4.65,3.08,1.35,1.55,'cream');
  plankDeck(g,8.4,1.8,0,3.2,3.45);railing(g,-4.05,4.23,4.05,4.23,3.35);for(const x of [-3.7,3.7]){box(g,.2,3.2,.2,x,1.6,4.1,'darkwood');beam(g,[x,3.3,4.1],[x*.8,4.4,3.15],.16,'darkwood',true);}
  door(g,0,3.05,.35,1.2,2.2);for(const x of [-2.4,2.4])windowFront(g,x,1.85,3.05,1.3,1.4);for(const side of [-3.9,3.9])windowSide(g,side,4.7,-.8,1.5,1.55);
  box(g,1.1,6.9,1.25,-3.35,3.6,-1.75,'stone');box(g,1.35,.25,1.5,-3.35,7.12,-1.75,'cream');chimney(g,-3.35,7.2,-1.75,1.9);flowerbox(g,-2.4,3.95,4.42,1.35);flowerbox(g,2.4,3.95,4.42,1.35);
}
function canal(g){
  foundation(g,4.5,6.7);box(g,4.25,8.4,6.4,0,4.55,0,0x9d6857);gable(g,4.55,6.7,2.2,8.85,'slate');
  for(const [w,y]of [[4.6,8.9],[3.6,9.65],[2.65,10.4],[1.5,11.15]]){box(g,w,.75,.3,0,y,3.35,'red');box(g,w+.15,.13,.4,0,y+.42,3.35,'cream');}
  for(const x of [-1.1,1.1])for(const y of [2.2,4.5,6.8])windowFront(g,x,y,3.25,.95,1.6,'cream');roundWindow(g,0,9.2,3.56,.45);
  for(const y of [3.4,5.7,8])box(g,4.45,.12,.2,0,y,3.37,'cream');door(g,0,3.29,.85,.95,2.1);stairs(g,0,5,1.8,5,.17,.3);
  for(const x of [-2.18,2.18])for(const z of [-1.5,1.2])windowSide(g,x,5.5,z,1,1.65);beam(g,[0,10.5,3.6],[0,10.5,4.25],.1,'darkwood',true);cyl(g,.055,.055,.3,0,10.3,4.2,'iron');
}
function row(g){
  foundation(g,11.3,6.1);
  for(let i=0;i<3;i++){
    const x=(i-1)*3.65,z=i===1?.35:0,h=i===1?6.1:5.6;
    box(g,3.55,h,5.75,x,.35+h/2,z,i===1?'cream':'red');gable(g,3.9,6.25,1.7,h+.4,'roof',x,z);
    door(g,x-.75,z+2.93,.45,.86,2);for(const y of [1.85,4.2])windowFront(g,x+.75,y,z+2.93,1.05,1.3);windowFront(g,x-.75,4.2,z+2.93,.95,1.3);
    for(const side of [-1,1])box(g,.14,h,.18,x+side*1.74,.35+h/2,z+2.96,'cream');box(g,3.55,.14,.2,x,3.1,z+3,'cream');stairs(g,x-.75,z+4.05,1.25,3);
    flowerbox(g,x+.75,1.05,z+3.17,1.05);if(i<2)chimney(g,x+1.7,h+.45,-1.65,1.6);
  }
}
function earth(g){
  foundation(g,8.5,5.7);const shell=shapeGeometry('earth-vault',()=>{const s=new THREE.Shape();s.moveTo(-4.2,0);s.lineTo(4.2,0);s.absellipse(0,0,4.2,4.2,0,Math.PI,false,0);s.closePath();return new THREE.ExtrudeGeometry(s,{depth:5.5,bevelEnabled:false,curveSegments:24});});mesh(g,shell,'leafDark',0,.35,-2.75);
  arch(g,0,.35,2.83,7.65,4.1,{frame:'leaf',panel:'stone',mullions:false});roundWindow(g,-2.35,1.9,3.04,.63);roundWindow(g,2.35,1.9,3.04,.63);
  const outer=cyl(g,1.05,1.05,.16,0,1.5,3.09,'darkwood',32);outer.rotation.x=Math.PI/2;const inner=cyl(g,.85,.85,.06,0,1.5,3.2,'wood',32);inner.rotation.x=Math.PI/2;ell(g,.46,1.42,3.26,.07,.07,.07,'yellow');
  for(const x of [-2.8,-1.4,1.4,2.8]){const y=.35+Math.sqrt(4.2**2-x*x);ell(g,x,y-.02,-.9,.65,.3,.85,'leaf');}
  for(const z of [-1.6,0]){box(g,1.1,.12,.85,0,4.62,z,'darkwood');box(g,.9,.06,.65,0,4.71,z,'glass');}
  stairs(g,0,4.35,2.2,2);for(const x of [-3.2,3.2])flowerbox(g,x,.55,3.2,1.2);
}
function liftedRoof(g,w,d,h,y,color='roof'){
  const ge=shapeGeometry(`lifted-${w}-${d}-${h}`,()=>{const ring=[[-w/2,.23,-d/2],[0,0,-d/2],[w/2,.23,-d/2],[w/2,0,0],[w/2,.23,d/2],[0,0,d/2],[-w/2,.23,d/2],[-w/2,0,0]],positions=[...ring.flat(),0,h,0,...ring.map(p=>[p[0],p[1]-.16,p[2]]).flat(),0,h-.16,0],indices=[];for(let i=0;i<8;i++){const j=(i+1)%8;indices.push(i,8,j,9+i,9+j,17,i,j,9+j,i,9+j,9+i);}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry.toNonIndexed();});mesh(g,ge,color,0,y,0);
  const ring=[[-w/2,.23,-d/2],[0,0,-d/2],[w/2,.23,-d/2],[w/2,0,0],[w/2,.23,d/2],[0,0,d/2],[-w/2,.23,d/2],[-w/2,0,0]];for(let i=0;i<8;i++)beam(g,ring[i].map((n,j)=>j===1?n+y:n),ring[(i+1)%8].map((n,j)=>j===1?n+y:n),.09,'darkwood',true);
}
function pavilion(g){
  foundation(g,7.5,6.8);plankDeck(g,7.4,6.7,0,.45,0);box(g,5.7,3,4.85,0,2.1,0,'cream');
  for(const x of [-2.8,0,2.8])for(const z of [-2.45,2.45])box(g,.17,3.2,.17,x,2.1,z,'darkwood');
  for(const x of [-1.8,1.8]){windowFront(g,x,2,2.49,1.5,1.85,'wood');for(let dx=-.55;dx<=.6;dx+=.28)box(g,.035,1.85,.045,x+dx,2,2.67,'lightwood');}
  door(g,0,2.48,.6,1.05,2.25,'wood');liftedRoof(g,8.4,7.6,1.55,3.68,'leafDark');
  box(g,3.9,2.4,3.65,0,5.9,0,'cream');for(const x of [-1.95,1.95])for(const z of [-1.83,1.83])box(g,.15,2.5,.15,x,5.9,z,'darkwood');
  for(const x of [-.95,.95])windowFront(g,x,5.9,1.87,1.15,1.55,'wood');for(const x of [-2,2])windowSide(g,x,5.9,0,1.65,1.5);
  liftedRoof(g,5.7,5.35,1.5,7.18,'leafDark');cyl(g,.07,.13,.5,0,8.9,0,'yellow',8);stairs(g,0,4.3,2.4,3);railing(g,-3.5,3.15,-1.3,3.15,.6);railing(g,1.3,3.15,3.5,3.15,.6);
}
function manor(g){
  foundation(g,9.4,6.7);box(g,9.1,5.9,6.4,0,3.3,0,'cream');
  for(const x of [-4.5,4.5])box(g,.22,5.9,6.5,x,3.3,0,'stone');for(const y of [3.2,6.3])box(g,9.5,.2,6.75,0,y,0,'stone');
  const roof=shapeGeometry('manor-mansard',()=>{const p=[-4.9,0,-3.6,4.9,0,-3.6,4.9,0,3.6,-4.9,0,3.6,-3.7,2.3,-2.4,3.7,2.3,-2.4,3.7,2.3,2.4,-3.7,2.3,2.4];const ge=new THREE.BufferGeometry();ge.setAttribute('position',new THREE.Float32BufferAttribute(p,3));ge.setIndex([0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0,4,7,6,4,6,5]);ge.computeVertexNormals();return ge.toNonIndexed();});mesh(g,roof,'slate',0,6.45,0);box(g,7.5,.13,4.9,0,8.82,0,'roof');
  for(const x of [-2.9,-1.1,1.1,2.9])for(const y of [1.9,4.65])arch(g,x,y-.85,3.25,1.12,1.9);
  for(const x of [-2.3,2.3]){box(g,1.5,1.35,1.25,x,7.6,2.7,'cream');gable(g,1.9,1.6,.7,8.3,'slate',x,2.7);windowFront(g,x,7.65,3.36,1,1.1);chimney(g,x,8.8,-1.4,1.55);}
  door(g,0,3.29,.65,1.4,2.5);for(const x of [-1.3,1.3]){cyl(g,.17,.23,3.1,x,2.2,4.35,'white');cyl(g,.32,.32,.18,x,.67,4.35,'stone');cyl(g,.3,.3,.18,x,3.8,4.35,'stone');}
  box(g,3.4,.2,1.9,0,3.95,4.05,'cream');gable(g,3.8,2.2,.9,4.1,'sand',0,4.05);stairs(g,0,6,3.2,4,.16,.35);
}
function lodge(g){
  foundation(g,11.6,6.1);box(g,11.3,3.65,5.8,0,2.2,0,'wood');slatWalls(g,11.3,5.8,3.65,2.2);gable(g,12.4,6.7,2.1,4.1,'roof');
  box(g,3.3,4.9,1.1,0,2.85,3.05,'stone');gable(g,4.2,2,1.65,5.4,'roof',0,3.05);door(g,0,3.66,.45,1.3,2.25);roundWindow(g,0,4.25,3.68,.65);
  for(const x of [-4.15,4.15]){windowFront(g,x,2.25,2.97,2.35,2.5,'darkwood');for(const dx of [-1.2,0,1.2])box(g,.12,2.7,.12,x+dx,2.3,3.1,'darkwood');}
  plankDeck(g,12.6,2.7,0,.35,4.3);railing(g,-6.15,5.52,-1.1,5.52,.5);railing(g,1.1,5.52,6.15,5.52,.5);for(const x of [-5.8,-3.1,3.1,5.8]){box(g,.19,3.8,.19,x,2.3,4.8,'darkwood');beam(g,[x,4.1,4.8],[x*.75,4.1,3],.13,'darkwood',true);}
  box(g,12.6,.15,1.9,0,4.18,4.1,'roof',-.12);box(g,1.4,5.5,1.25,-3.9,2.9,-2.35,'stone');chimney(g,-3.9,5.6,-2.35,2.1);stairs(g,0,6.4,1.9,3);for(const side of [-5.7,5.7])windowSide(g,side,2.35,-.5,2,1.9);
}

const builders={'home-bungalow':bungalow,'home-duplex':duplex,'home-victorian':victorian,'home-tudor':tudor,'home-stilt':stilt,'home-aframe':aframe,'home-adobe':adobe,'home-yurt':yurt,'home-riad':riad,'home-container':containerHome,'home-tiny':tiny,'home-boathouse':boathouse,'home-loft':loft,'home-chalet':chalet,'home-canal':canal,'home-row':row,'home-earth':earth,'home-pavilion':pavilion,'home-manor':manor,'home-lodge':lodge};
export function createHomeBuilding(id){const build=builders[id];if(!build)return null;const group=new THREE.Group();build(group);return centered(group,id);}
