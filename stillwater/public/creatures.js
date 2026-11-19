import * as THREE from 'three';
import {LIVE_ATTACK_KEYS,LIVE_SCARE_DURATION,LIVE_SCARE_IMPACT} from './scare-presentation.js';
import {EXTRA_FORMS,EXTRA_COLORS,buildExtraCreature,applyExtraScare} from './extra-creatures.js';

// Independent authored anatomy, used unchanged by world renders and portraits.
export const CREATURE_FORMS = Object.freeze({
  dredge:{bodyPlan:'amorphous-blob',walkingLegs:0,arms:0,radialLimbs:0,floating:false},
  wader:{bodyPlan:'stilt-crawler',walkingLegs:4,arms:0,radialLimbs:0,floating:false},
  mirehound:{bodyPlan:'long-faced-quadruped',walkingLegs:4,arms:0,radialLimbs:0,floating:false},
  glassjaw:{bodyPlan:'veil-backed-quadruped',walkingLegs:4,arms:0,radialLimbs:0,floating:false},
  gloomfin:{bodyPlan:'serpentine-eel',walkingLegs:0,arms:0,radialLimbs:0,floating:false},
  hush:{bodyPlan:'radial-disk-quadruped',walkingLegs:4,arms:0,radialLimbs:0,floating:false},
  carapace:{bodyPlan:'armored-crocodilian',walkingLegs:4,arms:0,radialLimbs:0,floating:false},
  lantern:{bodyPlan:'wing-mantled-quadruped',walkingLegs:4,arms:0,radialLimbs:0,floating:false},
  leech:{bodyPlan:'telescoping-suction-worm',walkingLegs:0,arms:0,radialLimbs:0,floating:false},
  knuckle:{bodyPlan:'knuckle-walking-quadruped',walkingLegs:4,arms:0,radialLimbs:0,floating:false},
  crown:{bodyPlan:'split-shell-quadruped',walkingLegs:4,arms:0,radialLimbs:0,floating:false},...EXTRA_FORMS
});
let vectorPool=null,vectorCursor=0,animationRoot=null;
const V=(x=0,y=0,z=0)=>{if(vectorPool){const point=vectorPool[vectorCursor]||(vectorPool[vectorCursor]=new THREE.Vector3());vectorCursor++;return point.set(x,y,z);}return new THREE.Vector3(x,y,z);},UP=V(0,1,0),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const GAIT_TRAVEL={wader:.16,mirehound:.18,hush:.14,carapace:.16,knuckle:.15,crown:.12,siphon:.17,gutter:.15,cradle:.14,raker:.16,hermit:.12,scissor:.17};
// Conservative envelopes include every articulated limb, digit and lunge pose.
// The world supplies actual free-water clearance; portraits retain native scale.
const CLEARANCE_RADII=Object.freeze({dredge:2.85,wader:2.65,mirehound:2.30,glassjaw:1.35,hush:2.85,carapace:4.1,lantern:3.3,leech:1.2,knuckle:2.35,crown:2.1,...Object.fromEntries(Object.keys(EXTRA_FORMS).map(id=>[id,2]))});
const textures=new Map();
function skinTexture(style){
  if(textures.has(style))return textures.get(style);
  const n=128,data=new Uint8Array(n*n*4);let seed=713+style*381;
  const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const vein=Math.sin(x*.16+Math.sin(y*.11)*3+style)*Math.sin(y*.23+x*.031),scales=style===4?Math.sin(x*.8+Math.floor(y/5)*1.6)*Math.sin(y*.63):0,pores=rnd(),shade=clamp(180+vein*24+scales*19+(pores-.5)*35-(pores>.965?50:0),60,230),i=(y*n+x)*4;
    data[i]=data[i+1]=data[i+2]=shade;data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,n,n,THREE.RGBAFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;textures.set(style,texture);return texture;
}
function materials(id){
  const index=Object.keys(CREATURE_FORMS).indexOf(id),colors=[0x4c5850,0xadb0a0,0x5a6461,0x929d98,0x354b49,0x70746c,0x4c5b51,0x4e6769,0x847f70,0x555b57,0x9c9988,...EXTRA_COLORS],map=skinTexture(index);
  return{skin:new THREE.MeshStandardMaterial({color:colors[index],map,bumpMap:map,bumpScale:.055,roughness:id==='dredge'?.23:.36,metalness:.025}),ridge:new THREE.MeshStandardMaterial({color:id==='wader'?0xc0beab:0x8a998a,map,bumpMap:map,bumpScale:.025,roughness:.4}),dark:new THREE.MeshStandardMaterial({color:0x071419,roughness:.25}),tooth:new THREE.MeshStandardMaterial({color:0xc6c6aa,roughness:.42}),eye:new THREE.MeshStandardMaterial({color:0xe0dfbf,emissive:0x98a78a,emissiveIntensity:.12,roughness:.08}),membrane:new THREE.MeshStandardMaterial({color:0x9dada7,map,transparent:true,opacity:id==='glassjaw'?.57:.74,side:THREE.DoubleSide,roughness:.45,depthWrite:false})};
}
function mesh(geometry,material,name=''){const m=new THREE.Mesh(geometry,material);m.name=name;m.castShadow=true;m.receiveShadow=true;return m;}
function sculpt(scale,material,seed=1,distort=.025,name='',detail=1){
  const g=new THREE.SphereGeometry(1,detail?32:16,detail?24:12),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),w=1+distort*Math.sin(x*17+seed)*Math.sin(y*13-z*9)+distort*.45*Math.sin(y*37+z*21);p.setXYZ(i,x*scale[0]*w,y*scale[1]*w,z*scale[2]*w);}
  g.computeVertexNormals();return mesh(g,material,name);
}
function sweep(points,radii,material,name='',segments=32,radial=10){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>Array.isArray(p)?V(...p):p)),frames=curve.computeFrenetFrames(segments,false),positions=[],uvs=[],indices=[];
  for(let i=0;i<=segments;i++){
    const t=i/segments,center=curve.getPoint(t),u=t*(radii.length-1),k=Math.min(radii.length-2,Math.floor(u)),radius=THREE.MathUtils.lerp(radii[k],radii[k+1],u-k);
    for(let j=0;j<=radial;j++){const a=j/radial*Math.PI*2,point=center.clone().addScaledVector(frames.normals[i],Math.cos(a)*radius).addScaledVector(frames.binormals[i],Math.sin(a)*radius);positions.push(point.x,point.y,point.z);uvs.push(j/radial,t*2);}
  }
  for(let i=0;i<segments;i++)for(let j=0;j<radial;j++){let a=i*(radial+1)+j,b=a+radial+1;indices.push(a,a+1,b,b,a+1,b+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();g.userData={surface:'tapered-sweep',rings:segments,sectors:radial};return mesh(g,material,name);
}
function add(parent,object,x=0,y=0,z=0){object.position.set(x,y,z);parent.add(object);return object;}
function eyes(parent,m,positions,size=.055){
  const pairs=parent.userData.eyePairs||(parent.userData.eyePairs=[]);
  for(const [x,y,z]of positions){const socket=add(parent,sculpt([size*1.65,size*1.35,size*.8],m.dark,1,.01,'eye-socket',0),x,y,z),eye=add(parent,sculpt([size*.45,size*.72,size*.35],m.eye,1,0,'eye',0),x,y,z-size*.65);pairs.push({socket,eye,depth:size*.8});}
}
function ringMouth(parent,m,{x=0,y=0,z=0,w=.5,h=.5,teeth=12,rotation=0}={}){
  const group=new THREE.Group();group.name='mouth';group.userData.mouthHeight=h;group.userData.mouthWidth=w;group.userData.toothCount=teeth;group.userData.inverted=parent.name==='inverted-lantern-face';group.position.set(x,y,z);group.rotation.z=rotation;parent.add(group);add(group,sculpt([w,h,.035],m.dark,2,.025,'mouth-void',0),0,0,.025);
  const lip=mesh(new THREE.TorusGeometry(1,.09,9,48),m.ridge,'mouth-rim');lip.scale.set(w,h,.48);group.add(lip);
  for(let i=0;i<teeth;i++){const a=i/teeth*Math.PI*2,t=mesh(new THREE.ConeGeometry(.028,.15+(i%3)*.025,7),m.tooth,'tooth');t.position.set(Math.cos(a)*w*.81,Math.sin(a)*h*.80,-.025);t.rotation.z=a+Math.PI/2;group.add(t);}return group;
}
function segment(material,r1,r2,name){return mesh(new THREE.CylinderGeometry(r2,r1,1,9,6),material,name);}
function aimSegment(object,a,b){const d=V().copy(b).sub(a);object.position.copy(a).addScaledVector(d,.5);object.scale.y=d.length();object.quaternion.setFromUnitVectors(UP,d.normalize());}
function makeLeg(parent,m,name,radius=.07,detail=1){
  const group=new THREE.Group();group.name=name;parent.add(group);
  const upper=segment(m.skin,radius*1.15,radius*.70,'upper-segment'),lower=segment(m.skin,radius*.70,radius*.38,'lower-segment'),joint=sculpt([radius*1.8,radius*1.65,radius*1.65],m.ridge,2,.03,'covered-joint',detail);group.add(upper,lower,joint);
  const foot=new THREE.Group();foot.name='foot';group.add(foot);for(let i=detail?0:1;i<(detail?3:2);i++)foot.add(sweep([[0,0,0],[(i-1)*.08,-.035,-.12],[(i-1)*.14,-.01,-.30]],[radius*.58,radius*.4,.009],m.ridge,'digit',10,7));return{group,upper,lower,joint,foot};
}
function poseLeg(leg,hip,foot,bendDir,length1=1.4,length2=1.3){
  if(animationRoot)plantWorldFoot(animationRoot,leg,foot);
  (leg.hipPose||(leg.hipPose=new THREE.Vector3())).copy(hip);
  const dir=V().copy(foot).sub(hip),dist=clamp(dir.length(),.01,length1+length2-.01);dir.normalize();
  const bend=V().copy(bendDir).addScaledVector(dir,-bendDir.dot(dir)).normalize(),along=(length1*length1-length2*length2+dist*dist)/(2*dist),away=Math.sqrt(Math.max(0,length1*length1-along*along)),knee=V().copy(hip).addScaledVector(dir,along).addScaledVector(bend,away);
  aimSegment(leg.upper,hip,knee);aimSegment(leg.lower,knee,foot);leg.joint.position.copy(knee);leg.foot.position.copy(foot);
}
function plantWorldFoot(root,leg,foot){
  const d=root.userData,step=leg.contactPose,context=d.motionContext;
  if(!d.worldProfile||!Number.isFinite(context?.distanceTravelled)||!step||(d.animationState!=='patrol'&&d.animationState!=='pursue')){if(leg.worldContact)leg.worldContact.locked=false;return;}
  const contact=leg.worldContact||(leg.worldContact={x:0,z:0,locked:false}),scale=root.scale.x,c=Math.cos(root.rotation.y),s=Math.sin(root.rotation.y),offset=d.worldRig?.position.z||0;
  if(!step.planted){contact.locked=false;return;}
  if(!contact.locked){contact.x=root.position.x+c*foot.x*scale+s*(foot.z+offset)*scale;contact.z=root.position.z-s*foot.x*scale+c*(foot.z+offset)*scale;contact.locked=true;}
  const dx=contact.x-root.position.x,dz=contact.z-root.position.z,x=(c*dx-s*dz)/scale,z=(s*dx+c*dz)/scale-offset,limit=d.worldProfile.radius/scale-.32;
  if(Math.hypot(x,z)>limit){contact.locked=false;return;} // Early release at a physical reach limit.
  foot.x=x;foot.z=z;
}
const revealState=state=>state==='portrait'||state==='lunge'?1:state==='windup'?.48:0;
function advanceGait(d,time,moving,rate,state){
  if(state==='portrait')return 0;
  if(Number.isFinite(d.motionContext?.distanceTravelled)){
    const distance=d.motionContext.distanceTravelled,last=d.gaitDistance??distance,delta=Math.max(0,distance-last),base=d.quadruped?.stride||GAIT_TRAVEL[d.id]||.16,duty=d.quadruped?.duty||.72,travel=base*Math.max(.1,moving),scale=d.worldProfile?.worldScale||1;
    if(distance<last)d.gaitPhase=0;d.gaitPhase=((d.gaitPhase||0)+delta*Math.PI*duty/(travel*scale))%(Math.PI*2);d.gaitDistance=distance;d.gaitTime=time;return d.gaitPhase;
  }
  const elapsed=clamp(time-(d.gaitTime??time),0,.1);d.gaitTime=time;
  d.gaitPhase=((d.gaitPhase||0)+elapsed*rate*Math.min(1,moving*2))%(Math.PI*2);return d.gaitPhase;
}
const CREATURE_KIT={V,mesh,sculpt,sweep,add,eyes,ringMouth,makeLeg,poseLeg,advanceGait,footCycle};
function footCycle(leg,phase,travel,height,duty=.72){
  const q=((phase/(Math.PI*2))%1+1)%1,p=leg.contactPose||(leg.contactPose={z:0,lift:0,planted:true});
  if(q<duty){p.z=travel*(-1+2*q/duty);p.lift=0;p.planted=true;}
  else{const u=(q-duty)/(1-duty),ease=u*u*(3-2*u);p.z=travel*(1-2*ease);p.lift=Math.sin(u*Math.PI)**2*height;p.planted=false;}return p;
}

// DREDGE: an asymmetrical heavy mound, not a head attached to a shared torso.
function buildDredge(root,m){
  const massGroup=new THREE.Group();massGroup.name='blob-mass';root.add(massGroup);
  const g=new THREE.SphereGeometry(1,64,40),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),lower=1.15-.23*y,fold=1+.065*Math.sin(a*7+y*5)+.035*Math.sin(a*13-y*9);p.setXYZ(i,x*1.85*lower*fold+.15*(1-y*y),.94+y*.98+Math.sin(a*5)*.06*(1-y*y),z*1.45*lower*fold);}
  g.computeVertexNormals();const body=mesh(g,m.skin,'amorphous-body');massGroup.add(body);const folds=[];
  for(let i=0;i<5;i++){const z=-.6+i*.32,arch=sweep([[-1.42,.75,z],[-.8,1.66,z-.12],[0,1.88,z-.03],[.85,1.58,z+.12],[1.55,.7,z]],[.045,.08,.08,.07,.025],m.ridge,'raised-fold',36,8);massGroup.add(arch);folds.push(arch);}
  const maw=ringMouth(massGroup,m,{y:.79,z:-1.83,w:.72,h:.62,teeth:23,rotation:.09});eyes(massGroup,m,[[-.91,1.46,-1.22],[.78,1.57,-1.17]],.052);
  for(const side of [-1,1])massGroup.add(sweep([[side*.85,.2,-.7],[side*1.66,.13,-.45],[side*2.07,.09,.25],[side*1.65,.13,.8]],[.2,.22,.16,.03],m.skin,'dragging-skirt',28,12));
  return{massGroup,body,maw,folds,tissueRest:new Float32Array(g.attributes.position.array),tissueNormals:new Float32Array(g.attributes.normal.array),waterlineOffset:1.79,portraitDirection:V(3.5,2.5,-5.7)};
}
// THE WADER: four incredibly thin articulated stilts and a tiny head.
function buildWader(root,m){
  const thorax=new THREE.Group();thorax.name='crawler-thorax';root.add(thorax);thorax.add(sweep([[0,.02,.81],[0,.16,.35],[0,.11,-.25],[0,.19,-.7]],[.13,.21,.19,.10],m.skin,'narrow-ridged-torso',40,12));
  for(let i=0;i<7;i++){const z=.5-i*.17;thorax.add(sweep([[-.19,-.07,z],[-.13,.18,z-.035],[0,.24,z],[.13,.18,z+.035],[.19,-.07,z]],[.018,.022,.025,.022,.018],m.ridge,'covered-rib',18,7));}
  thorax.add(sweep([[0,.12,-.5],[0,.3,-.85],[0,.19,-1.18]],[.11,.08,.10],m.skin,'thin-neck',24,10));
  const head=new THREE.Group();head.name='small-crawler-head';head.position.set(0,.17,-1.23);thorax.add(head);add(head,sculpt([.19,.24,.33],m.skin,17,.035,'narrow-mask'));eyes(head,m,[[-.105,.1,-.28],[.105,.1,-.28]],.026);const jaw=ringMouth(head,m,{y:-.085,z:-.29,w:.085,h:.11,teeth:7});
  return{thorax,head,jaw,waterlineOffset:1.16,portraitDirection:V(4,2.4,-6)};
}
// MIREHOUND: an extended stalker spine, hunched shoulders and long skull.
function buildBiped(root,m){
  const pelvis=new THREE.Group();pelvis.name='biped-pelvis';root.add(pelvis);add(pelvis,sculpt([.35,.23,.24],m.skin,8,.035,'pelvic-mass'));
  const spine=new THREE.Group();spine.name='upright-spine';pelvis.add(spine);spine.add(sweep([[0,.05,0],[0,.35,.03],[0,.7,.06],[0,1.0,.07]],[.24,.22,.36,.26],m.skin,'tall-thorax',34,16));
  for(const side of [-1,1]){spine.add(sweep([[side*.20,.40,.1],[side*.40,.78,.14],[side*.48,1.02,.10]],[.07,.14,.06],m.ridge,'shoulder-blade',20,10));for(let i=0;i<4;i++)spine.add(sweep([[side*.035,.48+i*.12,-.20],[side*.22,.48+i*.12,-.18],[side*.32,.44+i*.12,-.04]],[.019,.025,.012],m.ridge,'skin-ridge',12,7));}
  spine.add(sweep([[0,.95,.06],[0,1.16,-.01],[0,1.30,-.13]],[.13,.1,.12],m.skin,'bent-neck',20,10));
  const head=new THREE.Group();head.name='long-stalker-head';head.position.set(0,1.42,-.17);head.rotation.z=-.13;spine.add(head);add(head,sculpt([.24,.43,.27],m.skin,29,.035,'long-face'));eyes(head,m,[[-.095,.15,-.235],[.095,.15,-.235]],.028);const jaw=ringMouth(head,m,{y:-.13,z:-.25,w:.12,h:.22,teeth:11});
  return{pelvis,spine,head,jaw,waterlineOffset:1.17,portraitDirection:V(3.5,1.9,-6)};
}
// GLASSJAW: a heavy bell carried over a sternum, with seven trailing veils.
function buildFloat(root,m){
  const hover=new THREE.Group();hover.name='floating-bell';root.add(hover);const rings=30,sectors=56,pos=[],uv=[],ind=[];
  for(let i=0;i<=rings;i++)for(let j=0;j<=sectors;j++){const t=i/rings,a=j/sectors*Math.PI*2,r=(.1+.83*Math.sin(t*Math.PI*.72))*(1+.1*Math.cos(a*5+t*5));pos.push(Math.cos(a)*r,1.9-t*1.12+Math.sin(a*5)*.055*t,Math.sin(a)*r*.85);uv.push(j/sectors,t);}
  for(let i=0;i<rings;i++)for(let j=0;j<sectors;j++){const a=i*(sectors+1)+j,b=a+sectors+1;ind.push(a,a+1,b,b,a+1,b+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ind);g.computeVertexNormals();hover.add(mesh(g,m.skin,'hollow-hovering-bell'));
  const voidMouth=ringMouth(hover,m,{y:1.17,z:-.78,w:.25,h:.40,teeth:0});voidMouth.rotation.z=.08;eyes(hover,m,[[-.29,1.52,-.58],[.29,1.52,-.58]],.03);
  const veils=[];for(let k=0;k<7;k++){
    const a=k/7*Math.PI*2,geometry=new THREE.BufferGeometry(),verts=[],coords=[],indices=[];
    for(let i=0;i<=12;i++)for(let j=0;j<=5;j++){const t=i/12,s=j/5-.5,r=.64+Math.sin(t*2.8+k)*.13,angle=a+s*.63*(1-t*.5);verts.push(Math.cos(angle)*r,1.0-t*(.95+(k%3)*.10),Math.sin(angle)*r);coords.push(j/5,t);}
    for(let i=0;i<12;i++)for(let j=0;j<5;j++){let q=i*6+j;indices.push(q,q+6,q+1,q+1,q+6,q+7);}geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(coords,2));geometry.setIndex(indices);geometry.computeVertexNormals();const veil=mesh(geometry,m.membrane,'hanging-veil-'+k);hover.add(veil);veils.push(veil);
  }
  const tendrils=[];for(let i=0;i<8;i++){const a=i/8*Math.PI*2,x=Math.cos(a)*.62,z=Math.sin(a)*.62,t=sweep([[x,.9,z],[x*1.1,.43,z*1.1],[x*.8,-.18,z*.8],[x*.5,-.26,z*.7]],[.035,.025,.018,.003],m.ridge,'hanging-tendril-'+i,24,7);hover.add(t);tendrils.push(t);}return{hover,veils,tendrils,voidMouth,waterlineOffset:.48,portraitDirection:V(3,1.5,-6)};
}
function serpentSurface(t,angle,time,reveal,speed,out=V()){
  const z=-2.1+t*7.2,amp=.30+reveal*.24,wave=z*.96-time*(1.25+speed*.3),radius=(.34*(1-t)**.62+.018)*(1+.12*Math.sin(t*26)),x=Math.sin(wave)*amp*(.45+t*.8),lift=reveal*Math.exp(-t*7)*1.04;
  return out.set(x+Math.cos(angle)*radius,.49+Math.sin(angle)*radius*.75+Math.sin(wave*.8)*.035+lift,z);
}
// GLOOMFIN: a continuous long eel whose full body carries a travelling wave.
function buildSerpent(root,m){
  const rings=92,sectors=14,positions=[],uv=[],ind=[];
  for(let i=0;i<=rings;i++)for(let j=0;j<=sectors;j++){const p=serpentSurface(i/rings,j/sectors*Math.PI*2,0,0,0);positions.push(p.x,p.y,p.z);uv.push(j/sectors,i/rings*5);}for(let i=0;i<rings;i++)for(let j=0;j<sectors;j++){const q=i*(sectors+1)+j;ind.push(q,q+1,q+sectors+1,q+1,q+sectors+2,q+sectors+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ind);g.computeVertexNormals();g.userData={surface:'serpent',rings,sectors};const body=mesh(g,m.skin,'continuous-serpent-body');root.add(body);
  const head=new THREE.Group();head.name='eel-head';root.add(head);add(head,sculpt([.36,.28,.72],m.skin,13,.035,'long-eel-skull'),0,0,-.31);const jaw=ringMouth(head,m,{y:-.045,z:-1.045,w:.25,h:.17,teeth:18});eyes(head,m,[[-.235,.13,-.78],[.235,.13,-.78]],.035);
  // A fixed conservative culling envelope avoids a bounds traversal every frame.
  g.boundingBox=new THREE.Box3();g.boundingSphere=new THREE.Sphere(V(0,1,0),11);
  const fins=[];for(let i=0;i<13;i++){const fin=mesh(new THREE.ConeGeometry(.18,.48,3),m.membrane,'dorsal-fin-'+i);fin.scale.z=.16;fin.rotation.x=.18;root.add(fin);fins.push(fin);}return{body,head,jaw,fins,rings,sectors,surfacePoint:V(),trailPoints:[],trailDistances:[],trailSample:{x:0,z:0,tx:0,tz:1},waterlineOffset:.79,portraitDirection:V(4.8,4.4,-5.5)};
}
// THE HUSH: a low six-lobed sensory disk supported at four muscular girdles.
function buildRadial(root,m){
  const disk=new THREE.Group();disk.name='radial-disk';root.add(disk);const g=new THREE.SphereGeometry(1,60,28),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),r=1+.16*Math.cos(a*6)*(1-y*y);p.setXYZ(i,x*.93*r,.73+y*.28+Math.cos(a*6)*.03,z*.93*r);}g.computeVertexNormals();disk.add(mesh(g,m.skin,'six-lobed-disk'));
  for(let k=0;k<6;k++){const a=k/6*Math.PI*2;disk.add(sweep([[Math.cos(a)*.12,.99,Math.sin(a)*.12],[Math.cos(a)*.55,1.02,Math.sin(a)*.55],[Math.cos(a)*.96,.75,Math.sin(a)*.96]],[.023,.045,.012],m.ridge,'radial-ridge',20,8));}
  const maw=ringMouth(disk,m,{y:.72,z:-.96,w:.29,h:.22,teeth:15});eyes(disk,m,[[-.24,.93,-.64],[0,.99,-.74],[.24,.93,-.64]],.025);
  return{disk,maw,waterlineOffset:.93,portraitDirection:V(3,4,-5)};
}

// LOCKJAW: a low plated hide, broad hinged skull and heavy steering tail.
function buildCarapace(root,m){
  const armor=new THREE.Group();armor.name='armored-crawl';root.add(armor);add(armor,sculpt([.88,.39,1.08],m.skin,47,.035,'low-armored-body'),0,.57,0);
  for(let row=0;row<3;row++)for(let col=0;col<3;col++){
    const plate=sculpt([.29,.14,.32],m.ridge,row+col,.035,'overlapping-scute',0);plate.rotation.z=(col-1)*.19;add(armor,plate,(col-1)*.47,.84-Math.abs(col-1)*.09,-.62+row*.5);
  }
  const tail=new THREE.Group();tail.name='plated-steering-tail';tail.position.set(0,.57,.73);armor.add(tail);tail.add(sweep([[0,0,0],[.08,-.06,.7],[.18,-.2,1.55],[.12,-.30,2.6]],[.38,.29,.16,.012],m.skin,'thick-tapered-tail',32,12));
  for(let i=0;i<6;i++)add(tail,sculpt([.20-i*.023,.13-i*.012,.22],m.ridge,i,.015,'tail-scute',0),.04+i*.018,.24-i*.065,.25+i*.36);
  const head=new THREE.Group();head.name='broad-hinged-skull';head.position.set(0,.66,-1.11);armor.add(head);add(head,sculpt([.89,.26,.74],m.skin,51,.04,'wide-upper-skull'));add(head,sculpt([.75,.10,.61],m.dark,1,0,'black-gape',0),0,-.16,-.10);
  eyes(head,m,[[-.57,.24,-.43],[.57,.24,-.43]],.05);
  const jaw=new THREE.Group();jaw.name='hinged-lower-jaw';jaw.position.set(0,-.16,.39);head.add(jaw);add(jaw,sculpt([.84,.12,.67],m.skin,52,.035,'broad-lower-jaw'),0,-.05,-.44);
  for(const side of [-1,1])for(let i=0;i<8;i++){const tooth=mesh(new THREE.ConeGeometry(.045,.17,7),m.tooth,'interlocking-tooth');tooth.position.set(side*(.60-i*.025),.10,-.95+i*.15);jaw.add(tooth);}
  return{armor,tail,head,jaw,waterlineOffset:.72,portraitDirection:V(4,3,-6)};
}
// THE LANTERN: a wide wing-shaped carrier and an inverted hanging face.
function buildLantern(root,m){
  const carrier=new THREE.Group();carrier.name='manta-carrier';root.add(carrier);add(carrier,sculpt([.29,.25,.63],m.skin,62,.035,'central-keel'),0,1.59,0);
  const wings=[];
  for(const side of [-1,1]){
    const wing=new THREE.Group();wing.name='pectoral-wing-'+side;wing.position.y=1.54;carrier.add(wing);const positions=[],uv=[],indices=[],rows=20,cols=12;
    for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const u=i/rows,v=j/cols,chord=.91*(1-u**1.45)+.13;positions.push(side*(.12+u*2.72),Math.sin(u*Math.PI)*.12-Math.abs(v-.5)*.40*u,(v-.5)*2*chord+.55*u*u);uv.push(u,v);}
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const q=i*(cols+1)+j;indices.push(q,q+cols+1,q+1,q+1,q+cols+1,q+cols+2);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();wing.add(mesh(geometry,m.membrane,'broad-wing-membrane'));
    for(const z of [-.72,0,.70])wing.add(sweep([[side*.12,.01,z],[side*.95,.10,z*.72],[side*1.9,.06,z*.34+.24],[side*2.82,-.05,.55]],[.055,.04,.023,.006],m.ridge,'wing-ray',22,7));wings.push({group:wing,side});
  }
  const face=new THREE.Group();face.name='inverted-lantern-face';face.position.set(0,1.02,-.22);carrier.add(face);add(face,sculpt([.28,.43,.24],m.skin,63,.035,'hanging-inverted-mask'));eyes(face,m,[[-.12,-.14,-.22],[.12,-.14,-.22]],.035);const jaw=ringMouth(face,m,{y:.16,z:-.22,w:.12,h:.13,teeth:8});
  carrier.add(sweep([[0,1.51,.47],[.06,1.27,1.04],[-.13,.98,1.69],[0,.75,2.18]],[.11,.06,.025,.004],m.ridge,'single-ribbon-tail',28,8));
  return{carrier,wings,face,jaw,waterlineOffset:.23,portraitDirection:V(2.5,3.8,-6)};
}
// SINKMAW: no legs or head-neck division, just a telescoping suction column.
function buildLeech(root,m){
  const column=new THREE.Group();column.name='telescoping-column';root.add(column);const core=mesh(new THREE.CylinderGeometry(.40,.59,2.45,24,12),m.skin,'continuous-worm-column');core.position.y=1.25;column.add(core);const rings=[];
  for(let i=0;i<9;i++){const radius=.59-i*.019,ring=mesh(new THREE.TorusGeometry(radius,.105,9,28),i%3?m.skin:m.ridge,'annular-muscle-'+i);ring.rotation.x=Math.PI/2;ring.position.y=.16+i*.265;column.add(ring);rings.push(ring);}
  const crown=new THREE.Group();crown.name='suction-crown';crown.position.set(0,2.70,-.04);column.add(crown);add(crown,sculpt([.51,.43,.43],m.skin,71,.045,'mouth-collar'));const maw=ringMouth(crown,m,{y:.07,z:-.43,w:.39,h:.37,teeth:19});
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;crown.add(sweep([[Math.cos(a)*.43,Math.sin(a)*.41,-.22],[Math.cos(a)*.51,Math.sin(a)*.48,-.33],[Math.cos(a)*.45,Math.sin(a)*.43,-.48]],[.032,.038,.012],m.ridge,'sensory-fringe',10,6));}
  return{column,rings,crown,maw,wormCore:core,wormRest:new Float32Array(core.geometry.attributes.position.array),wormNormals:new Float32Array(core.geometry.attributes.normal.array),waterlineOffset:1.88,portraitDirection:V(3,2,-6)};
}
// KNUCKLEBACK: enormous shoulders over two knuckled forelegs and compact hindlegs.
function buildKnuckle(root,m){
  const trunk=new THREE.Group();trunk.name='massive-forequarter';root.add(trunk);add(trunk,sculpt([.79,.70,.60],m.skin,83,.045,'shoulder-hump'),0,1.11,-.28);add(trunk,sculpt([.40,.40,.64],m.skin,84,.04,'small-hindquarter'),0,.65,.45);
  for(const side of [-1,1])add(trunk,sculpt([.39,.48,.45],m.ridge,84,.025,'shoulder-muscle',0),side*.62,1.16,-.35);
  const head=new THREE.Group();head.name='recessed-knuckle-face';head.position.set(0,1.1,-.88);trunk.add(head);add(head,sculpt([.32,.33,.35],m.skin,85,.045,'compressed-face'));eyes(head,m,[[-.13,.10,-.29],[.13,.10,-.29]],.028);const jaw=ringMouth(head,m,{y:-.11,z:-.32,w:.20,h:.13,teeth:10});
  return{trunk,head,jaw,waterlineOffset:1.58,portraitDirection:V(4,2.4,-6)};
}
// THE CROWN: a four-legged bivalve with a vertical opening and muscular sternum.
function buildCrown(root,m){
  const mantle=new THREE.Group();mantle.name='bivalve-mantle';root.add(mantle);const foot=add(mantle,sculpt([.76,.17,1.10],m.skin,91,.035,'muscular-crawling-foot'),0,.17,.15);const shells=[];
  add(mantle,sculpt([.27,.99,.48],m.dark,92,.02,'unlit-inner-cavity'),0,1.35,-.01);
  for(const side of [-1,1]){
    const shell=new THREE.Group();shell.name='hinged-shell-'+side;shell.position.y=.20;mantle.add(shell);const positions=[],uv=[],indices=[],rows=32,cols=22;
    for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const a=i/rows*Math.PI,b=j/cols*Math.PI,r=1+.035*Math.cos(a*19);positions.push(side*(.08+Math.sin(a)*Math.sin(b)*.83*r),1.18+Math.cos(a)*1.18,Math.sin(a)*Math.cos(b)*.72*r);uv.push(j/cols,i/rows);}
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const q=i*(cols+1)+j;if(side<0)indices.push(q,q+1,q+cols+1,q+1,q+cols+2,q+cols+1);else indices.push(q,q+cols+1,q+1,q+1,q+cols+1,q+cols+2);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();shell.add(mesh(geometry,m.ridge,'fluted-bivalve-shell'));
    for(let k=0;k<5;k++){const a=.32+k*.55;shell.add(sweep([[side*.11,.05,0],[side*Math.sin(a)*.60,.55,Math.cos(a)*.55],[side*Math.sin(a)*.81,1.23,Math.cos(a)*.72],[side*Math.sin(a)*.58,1.98,Math.cos(a)*.52],[side*.10,2.35,0]],[.016,.025,.032,.025,.010],m.tooth,'shell-rib',22,7));}shells.push({group:shell,side});
  }
  return{mantle,foot,shells,waterlineOffset:2.33,portraitDirection:V(3.2,2.2,-6)};
}

// Species-specific load paths: shoulder/hip locations, real bone lengths and
// substantial fore/hind musculature. The signature organ is carried by this
// skeleton, not translated over ornamental feet. Coordinates remain native;
// only the authoritative fixed world scale is applied to the completed animal.
const QUADRUPED_SPECS=Object.freeze({
  wader:{hip:[.17,1.10,-.50,.56],stance:[.78,-.67,.72],bone:[1.02,.97],radius:.075,rise:.69,stride:.16,duty:.74},
  mirehound:{hip:[.34,.78,-.53,.49],stance:[.60,-.66,.69],bone:[.61,.64],radius:.16,rise:.31,stride:.18,duty:.72},
  glassjaw:{hip:[.43,.85,-.36,.38],stance:[.75,-.53,.60],bone:[.63,.64],radius:.12,rise:.32,stride:.15,duty:.76},
  hush:{hip:[.57,.74,-.48,.48],stance:[1.02,-.87,.87],bone:[.68,.66],radius:.12,rise:.28,stride:.14,duty:.72},
  carapace:{hip:[.65,.56,-.58,.61],stance:[1.04,-.76,.86],bone:[.50,.49],radius:.16,rise:.24,stride:.16,duty:.76},
  lantern:{hip:[.30,1.13,-.42,.48],stance:[.83,-.66,.78],bone:[.76,.76],radius:.15,rise:.28,stride:.16,duty:.76},
  knuckle:{hip:[.61,1.24,-.38,.57],stance:[.68,-.57,.71],bone:[.76,.75],radius:.25,hindRadius:.14,rise:.22,stride:.15,duty:.78},
  crown:{hip:[.48,.57,-.38,.52],stance:[.88,-.66,.76],bone:[.47,.50],radius:.17,rise:.23,stride:.12,duty:.80},
  siphon:{hip:[.33,.83,-.37,.43],stance:[.87,-.76,.86],bone:[.73,.70],radius:.16,rise:.40,stride:.17,duty:.74},
  sawtooth:{hip:[.46,.73,-.43,.60],stance:[.98,-.70,.93],bone:[.57,.62],radius:.18,rise:.23,stride:.16,duty:.74},
  gutter:{hip:[.31,.68,-.81,.91],stance:[.90,-.91,1.02],bone:[.59,.58],radius:.14,rise:.22,stride:.15,duty:.74},
  cradle:{hip:[.77,.47,-.77,.77],stance:[1.02,-.85,.87],bone:[.42,.43],radius:.17,rise:.27,stride:.14,duty:.78},
  raker:{hip:[.42,.70,-.40,.43],stance:[.98,-.93,.90],bone:[.66,.65],radius:.145,rise:.26,stride:.16,duty:.74},
  knot:{hip:[.51,.73,-.16,.60],stance:[.97,-.68,.91],bone:[.62,.63],radius:.18,rise:.27,stride:.16,duty:.76},
  drifter:{hip:[.36,.78,-.35,.51],stance:[.91,-.73,.88],bone:[.67,.65],radius:.16,rise:.26,stride:.16,duty:.76},
  hermit:{hip:[.43,.51,-.40,.48],stance:[.98,-.62,.77],bone:[.48,.48],radius:.14,rise:.22,stride:.12,duty:.78},
  urchin:{hip:[.46,.70,-.37,.42],stance:[.96,-.74,.86],bone:[.58,.60],radius:.18,rise:.27,stride:.15,duty:.76},
  scissor:{hip:[.32,.80,-.34,.53],stance:[.93,-.74,.84],bone:[.65,.63],radius:.13,rise:.30,stride:.17,duty:.72}
});
function buildQuadruped(root,m,d,id){
  const spec=QUADRUPED_SPECS[id],retired=new Set();
  for(const key of ['legs','limbs','fingers','forelegs','hindlegs','arms','claws'])for(const part of d[key]||[])retired.add(part.group);
  for(const object of retired){object.removeFromParent();object.traverse(o=>o.geometry?.dispose());}
  for(const key of ['legs','limbs','fingers','forelegs','hindlegs','arms','claws'])delete d[key];
  const body=new THREE.Group();body.name='articulated-load-bearing-body';for(const object of [...root.children])body.add(object);root.add(body);
  // Remodel the central anatomy so fore/hind girdles join an actual torso.
  if(id==='wader'){d.thorax.position.y=1.10;d.head.position.z=-1.13;}
  if(id==='mirehound'){d.pelvis.position.set(0,.77,.48);d.spine.rotation.x=-1.16;d.head.scale.set(1.12,1.06,1.10);}
  if(id==='glassjaw'){d.hover.position.y=.26;for(const tendril of d.tendrils)tendril.scale.y=.83;}
  if(id==='lantern'){d.carrier.position.y=.12;d.face.position.z=-.65;}
  if(id==='crown'){d.foot.name='bivalve-supporting-sternum';d.foot.position.y=.38;d.foot.scale.set(.75,1.45,.65);}
  if(id==='siphon')d.throat.position.y=.45;
  if(id==='gutter'){for(let i=0;i<d.segments.length;i++)d.segments[i].position.set(0,.68,-1.10+i*.29);d.head.position.set(0,.79,-1.37);}
  if(id==='knot'){d.loop.position.y=1.33;add(body,sculpt([.54,.29,.57],m.skin,204,.045,'ring-supporting-haunch'),0,.68,.41);}
  if(id==='drifter'){d.sail.position.y=.08;add(body,sculpt([.43,.32,.70],m.skin,205,.04,'sail-bearing-thorax'),0,.76,.16);}
  if(id==='glassjaw')add(body,sculpt([.47,.27,.56],m.skin,203,.04,'bell-bearing-sternum'),0,.85,0);
  if(id==='lantern')add(body,sculpt([.38,.34,.68],m.skin,206,.04,'manta-shoulder-keel'),0,1.15,.30);
  if(id==='raker')body.add(sweep([[-.47,.71,.20],[-.91,.85,.26],[-1.08,.76,.06],[-.90,.68,-.12]],[.16,.14,.10,.035],m.skin,'curled-nonwalking-thumb',20,9));
  const legs=[];
  for(let i=0;i<4;i++){
    const side=i<2?-1:1,front=i%2===0,r=front?spec.radius:spec.hindRadius||spec.radius*.91,leg=makeLeg(root,m,`walking-leg-${i+1}`,r,0),h=spec.hip,hipY=id==='knuckle'&&!front?.68:h[1];
    const hip=V(side*h[0]*(front?1:.88),hipY,front?h[2]:h[3]);
    const girdle=add(body,sculpt([r*1.85,r*2.1,r*2.05],m.skin,210+i,.045,front?'load-bearing-shoulder':'load-bearing-haunch',0),...hip.toArray());
    const tendon=sweep([[hip.x,hip.y,hip.z],[hip.x*.52,hip.y+.11,hip.z*.78],[0,hip.y+.09,hip.z*.65]],[r*.75,r*.60,r*.28],m.ridge,'girdle-tendon',12,7);body.add(tendon);
    leg.foot.add(sculpt([r*1.23,r*.67,r*1.7],m.skin,220+i,.035,id==='knuckle'&&front?'weight-bearing-fist':'weight-bearing-pad',0));
    if(id==='scissor'&&front){for(let j=0;j<4;j++){const spur=mesh(new THREE.ConeGeometry(.038,.14,5),m.tooth,'foreleg-saw-tooth');spur.position.set(side*.08,(j-1.5)*.16,-.06);spur.rotation.z=side*.7;leg.lower.add(spur);}}
    if(id==='urchin'){leg.upper.add(sweep([[0,-.22,0],[side*.14,-.03,.01],[side*.27,.13,.03]],[.06,.04,.004],m.ridge,'leg-thorn',10,6));}
    legs.push({...leg,side,front,phase:front?(side<0?0:Math.PI):(side<0?Math.PI:0),hipRest:hip,girdle,tendon,radius:r});
  }
  d.legs=legs;d.quadruped={...spec,body,waterline:.90};
  // Native portraits and world animals share the same supported stance.
  d.waterlineOffset=.90;
}
function animateQuadruped(root,t,state,moving,reveal,floorFoot){
  const d=root.userData,q=d.quadruped,world=Boolean(d.worldProfile),anticipate=state==='windup',phase=advanceGait(d,t,moving,1.8+moving*1.7,state),rise=reveal*q.rise-(anticipate?.055:0)+(d.id==='carapace'?.055:0),sway=Math.sin(phase),bob=-Math.abs(Math.sin(phase*2))*.018*moving;
  // Body movement is transferred to the hip sockets before solving each leg.
  q.body.position.set(sway*.012*moving,rise+bob,0);q.body.rotation.set(Math.sin(phase*2)*.014*moving-(anticipate?.035:0),0,sway*.018*moving);q.body.updateMatrix();
  for(const leg of d.legs){
    const step=footCycle(leg,phase+leg.phase,q.stride*moving,.12*moving,q.duty),hip=V().copy(leg.hipRest).applyMatrix4(q.body.matrix),foot=V(leg.side*q.stance[0],(world&&state!=='lunge'?(.04-root.position.y)/root.scale.y+Math.max(.055,leg.radius*.74):.09+leg.radius*.35)+step.lift,(leg.front?q.stance[1]:q.stance[2])+step.z),bend=V(leg.side*.12,d.id==='cradle'?1:.35,leg.front?1:-1),short=idIsShortHind(d.id,leg);
    poseLeg(leg,hip,foot,bend,q.bone[0]*short,q.bone[1]*short);leg.foot.rotation.y=leg.side*(leg.front?-.10:.12);
  }
  switch(d.id){
    case'wader':d.thorax.rotation.x=-reveal*.07;d.head.rotation.z=Math.sin(t*.7)*.04;d.jaw.scale.y=1+reveal*.7;break;
    case'mirehound':d.spine.rotation.x=-1.16+reveal*.16;d.head.rotation.x=1.16-reveal*.16;d.head.rotation.z=-.13+Math.sin(t*.8)*.035;d.jaw.scale.y=1+reveal*.65;break;
    case'glassjaw':d.hover.rotation.x=-reveal*.10;for(let i=0;i<d.veils.length;i++){d.veils[i].rotation.y=Math.sin(t*1.9+i)*.055;d.veils[i].scale.y=1+Math.sin(t*2.1+i)*.035;}for(let i=0;i<d.tendrils.length;i++){d.tendrils[i].rotation.x=Math.sin(t*2+i)*.045;d.tendrils[i].rotation.z=Math.cos(t*1.7+i)*.035;}d.voidMouth.scale.set(1+reveal*.25,1+reveal*.5,1);break;
    case'hush':d.disk.rotation.z=Math.sin(phase-.3)*.012*moving;d.maw.scale.y=1+reveal*.7;break;
    case'carapace':d.tail.rotation.y=Math.sin(phase*.6)*(world?.055:.14)*moving;d.head.rotation.x=-reveal*.14;d.jaw.rotation.x=-.035-reveal*.65;break;
    case'lantern':for(const wing of d.wings)wing.group.rotation.z=wing.side*((world?1.11:.10)+Math.sin(t*1.4-wing.side*.3)*.035);d.face.rotation.x=Math.sin(t*1.2)*.045-reveal*.12;d.face.rotation.z=Math.sin(t*1.5)*.055;d.jaw.scale.y=1+reveal*.7;break;
    case'knuckle':d.head.rotation.x=-reveal*.13;d.jaw.scale.y=1+reveal*.8;break;
    case'crown':for(const shell of d.shells)shell.group.rotation.z=-shell.side*(.025+reveal*(world?.18:.28)+Math.sin(t*1.2)*.006);break;
    case'siphon':d.throat.rotation.x=-reveal*.13;d.throat.scale.x=1+Math.sin(t*2)*.025;d.maw.scale.y=1+reveal*.65;break;
    case'sawtooth':d.tail.rotation.y=Math.sin(phase*1.5)*.19*moving;for(const fin of d.fins)fin.mesh.rotation.z=fin.side*(.34+Math.sin(phase+.6)*.05*moving);d.maw.scale.y=1+reveal*.8;break;
    case'gutter':for(let i=0;i<d.segments.length;i++){const wave=phase-i*.65;d.segments[i].position.x=Math.sin(wave)*.045*moving;d.segments[i].position.y=.68+Math.cos(wave)*.016*moving;d.segments[i].rotation.y=Math.cos(wave)*.065*moving;}d.head.rotation.y=Math.cos(phase+.4)*.05*moving;d.maw.scale.y=1+reveal*.65;break;
    case'cradle':d.eye.rotation.x=Math.sin(t*1.6)*.10;d.eye.rotation.z=Math.sin(t*1.3)*.045;break;
    case'raker':d.maw.scale.y=1+reveal*.75;break;
    case'knot':d.loop.rotation.z=Math.sin(phase-.3)*.035*moving;d.loop.rotation.x=Math.sin(t*1.8)*.045;d.loop.scale.set(1+Math.sin(t*2)*.018,1-Math.sin(t*2)*.025,1+reveal*.12);break;
    case'drifter':{const a=d.membrane.geometry.attributes.position,rest=d.membraneRest;for(let i=0;i<a.count;i++){const x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2];a.setXYZ(i,x,y,z+Math.sin(t*2-y*2+x)*.085*(.3+Math.abs(x)));}a.needsUpdate=true;d.eyesGroup.rotation.y=Math.sin(t*1.2)*.07;break;}
    case'hermit':d.pincer.rotation.y=Math.sin(phase*.6)*.06;d.upper.rotation.x=-reveal*.30;d.lower.rotation.x=-.05-reveal*.55;break;
    case'urchin':d.orb.position.y=.99;d.upper.rotation.x=-reveal*.16;d.lower.rotation.x=reveal*.10;d.seam.scale.y=1+reveal*1.6;break;
    case'scissor':d.head.rotation.z=Math.sin(t*.9)*.035;d.maw.scale.y=1+reveal*.7;break;
  }
}
function idIsShortHind(id,leg){return id==='knuckle'&&!leg.front?.63:1;}
function reachQuadruped(d,energy,time){
  const q=d.quadruped;
  for(const leg of d.legs){
    const hip=V().copy(leg.hipPose),foot=V().copy(leg.foot.position),reach=leg.front?energy:energy*.12;
    foot.y+=reach*(leg.front?.52:.14);foot.z-=reach*.48;foot.x*=1-reach*.12;
    const short=idIsShortHind(d.id,leg);poseLeg(leg,hip,foot,V(leg.side*.18,.18,leg.front?1:-1),q.bone[0]*short,q.bone[1]*short);
  }
}

const builders={dredge:buildDredge,wader:buildWader,mirehound:buildBiped,glassjaw:buildFloat,gloomfin:buildSerpent,hush:buildRadial,carapace:buildCarapace,lantern:buildLantern,leech:buildLeech,knuckle:buildKnuckle,crown:buildCrown,...Object.fromEntries(Object.keys(EXTRA_FORMS).map(id=>[id,(root,m)=>buildExtraCreature(id,root,m,CREATURE_KIT)]))};
export function createCreature(id='dredge'){
  if(!builders[id])id='dredge';const root=new THREE.Group();root.name='creature-'+id;const m=materials(id),rig=builders[id](root,m);if(CREATURE_FORMS[id].walkingLegs===4)buildQuadruped(root,m,rig,id);root.userData={id,anatomy:CREATURE_FORMS[id],clearanceRadius:CLEARANCE_RADII[id]??null,baseWaterlineOffset:rig.waterlineOffset,...rig};animateCreature(root,0,'patrol',0);root.updateMatrixWorld(true);return root;
}
// Fixed authored world dimensions, shared with the authoritative navigation
// profile. Narrow passages fold limbs; they never shrink the whole creature.
export function applyCreatureWorldScale(root,profile){
  const d=root.userData,s=Number.isFinite(profile?.worldScale)?Math.max(.1,profile.worldScale):1,sy=Number.isFinite(profile?.worldYScale)?Math.max(.1,profile.worldYScale):s;
  d.worldProfile={...profile,worldScale:s,worldYScale:sy};root.scale.set(s,sy,s);
  const waterAdjustment={dredge:-.17,mirehound:.40,gloomfin:.085,hush:.15,leech:-.84,knuckle:-.33,crown:-1.26}[d.id]||0;d.waterlineOffset=d.quadruped?(profile.surfaceY??1.728)-.08:(d.baseWaterlineOffset+waterAdjustment)*sy;
  if(!d.worldRig){const group=new THREE.Group();group.name='fixed-world-anatomy';for(const child of [...root.children])group.add(child);root.add(group);d.worldRig=group;}
  d.worldRig.position.z=0;
  if(d.id==='carapace'&&!d.curledTail){
    const body=d.tail.getObjectByName('thick-tapered-tail'),replacement=sweep([[0,0,0],[.69,-.06,.30],[1.19,-.17,.66],[.92,-.30,1.12],[.25,-.35,1.20]],[.38,.29,.19,.10,.012],body.material,'curled-tail',32,12);body.geometry.dispose();body.geometry=replacement.geometry;
    const plates=[[.22,.23,.10],[.56,.14,.24],[.86,.02,.41],[1.06,-.04,.64],[1.01,-.13,.89],[.70,-.21,1.10]];let i=0;for(const child of d.tail.children)if(child.name==='tail-scute'){child.position.set(...plates[i++]);child.rotation.y=-.45-i*.14;}d.curledTail=true;
  }
  if(d.id==='lantern'&&!d.curledRibbon){const ribbon=d.carrier.getObjectByName('single-ribbon-tail'),replacement=sweep([[0,1.51,.47],[.45,1.27,1.0],[.69,.98,1.30],[.22,.75,1.45]],[.11,.06,.025,.004],ribbon.material,'curled-ribbon',28,8);ribbon.geometry.dispose();ribbon.geometry=replacement.geometry;d.curledRibbon=true;}
  if(d.id==='knuckle')d.trunk.getObjectByName('small-hindquarter').position.y=.675;
  root.updateMatrixWorld(true);return d.waterlineOffset;
}
// Deprecated compatibility export. Physical dimensions are now fixed by the
// shared profile; all passage accommodation happens in articulated poses.
export function fitCreatureClearance(root){return root.scale.x;}
// Reuse path/sample storage. The input contains validated world-space movement
// history, newest first; no straight continuation is invented beyond that trail.
function prepareSerpentTrail(root,trail){
  const d=root.userData,points=d.trailPoints,distances=d.trailDistances,c=Math.cos(root.rotation.y),s=Math.sin(root.rotation.y),scale=root.scale.x;let count=1,total=0;
  if(!points[0])points[0]={x:0,z:0};points[0].x=points[0].z=0;distances[0]=0;
  for(let i=0;i<trail.length&&count<512;i++){
    const p=trail[i];if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))continue;
    const dx=p.x-root.position.x,dz=p.z-root.position.z,x=(c*dx-s*dz)/scale,z=(s*dx+c*dz)/scale,last=points[count-1],length=Math.hypot(x-last.x,z-last.z);
    if(length<.00001)continue;const next=points[count]||(points[count]={x:0,z:0});next.x=x;next.z=z;total+=length;distances[count]=total;count++;if(total>=8.2)break;
  }
  d.trailCount=count;d.trailLength=total;return Math.min(8,total);
}
function sampleSerpentTrail(d,distance){
  const count=d.trailCount,points=d.trailPoints,ds=d.trailDistances,out=d.trailSample;
  if(count<2){out.x=out.z=0;out.tx=0;out.tz=1;return out;}
  let index=1;while(index<count-1&&ds[index]<distance)index++;
  const a=points[index-1],b=points[index],length=ds[index]-ds[index-1],fraction=clamp((distance-ds[index-1])/length,0,1);
  out.x=a.x+(b.x-a.x)*fraction;out.z=a.z+(b.z-a.z)*fraction;out.tx=(b.x-a.x)/length;out.tz=(b.z-a.z)/length;return out;
}
function animateSerpentTrail(root,time,reveal,moving,context){
  const d=root.userData,length=prepareSerpentTrail(root,context.trail),available=(Number.isFinite(context.availableRadius)?Math.max(0,context.availableRadius):d.worldProfile?.radius??.40)/root.scale.x;
  const width=Math.min(d.worldProfile?.55:.33,available*.8),vertical=d.worldProfile?.42:.75,baseY=d.worldProfile?.495:.49,attr=d.body.geometry.attributes.position,normals=d.body.geometry.attributes.normal,box=d.body.geometry.boundingBox;box.makeEmpty();
  // Head remains inside the head collision corridor. Its forward tip is within
  // 0.34m of the authoritative center, even on a tight corner or zero-length trail.
  const first=sampleSerpentTrail(d,0),headScale=Math.min(d.worldProfile?1.8:1,available/.40),headYaw=Math.atan2(first.tx,first.tz);
  d.head.scale.set(.60*headScale,1,.40*headScale);d.head.rotation.set(0,headYaw,0);d.head.position.set(first.tx*.12*headScale,.68+reveal*.75,first.tz*.12*headScale);
  for(let i=0;i<=d.rings;i++){
    const u=i/d.rings,p=sampleSerpentTrail(d,u*length),radius=width*((1-u)**.62*.94+.06),lift=reveal*Math.exp(-u*7)*.75,verticalWave=Math.sin(time*(1.25+moving*.3)-u*9)*.018,lateral=Math.sin(time*2.1+(context.distanceTravelled||0)*.3-u*12)*Math.sin(u*Math.PI)*(d.worldProfile?.035:.010);
    for(let j=0;j<=d.sectors;j++){
      const a=j/d.sectors*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a),index=i*(d.sectors+1)+j;
      const x=p.x+p.tz*(ca*radius+lateral),y=baseY+sa*radius*vertical+lift+verticalWave,z=p.z-p.tx*(ca*radius+lateral);attr.setXYZ(index,x,y,z);d.surfacePoint.set(x,y,z);box.expandByPoint(d.surfacePoint);
      // Elliptical cross-section normal; no mesh-wide normal reconstruction.
      const inv=1/Math.hypot(ca,sa/vertical);normals.setXYZ(index,p.tz*ca*inv,sa/vertical*inv,-p.tx*ca*inv);
    }
  }
  attr.needsUpdate=normals.needsUpdate=true;
  for(let i=0;i<d.fins.length;i++){const u=.12+i*.062,p=sampleSerpentTrail(d,u*length),radius=width*((1-u)**.62*.94+.06),lateral=Math.sin(time*2.1+(context.distanceTravelled||0)*.3-u*12)*Math.sin(u*Math.PI)*(d.worldProfile?.035:.010);d.fins[i].position.set(p.x+p.tz*lateral,baseY+radius*vertical+(d.worldProfile?.06:.16)+reveal*Math.exp(-u*7)*.75,p.z-p.tx*lateral);d.fins[i].rotation.set(.18,Math.atan2(p.tx,p.tz),0);d.fins[i].scale.x=Math.min(1,available/.4);d.fins[i].scale.y=d.worldProfile?.3:1;}
  d.jaw.scale.y=1+reveal*.7;
}
export function animateCreature(root,time,state='patrol',speed=1,context){
  const d=root.userData;if(!d.id)return;const reveal=Number.isFinite(context?.revealOverride)?clamp(context.revealOverride,0,1):revealState(state),moving=clamp(Number.isFinite(speed)?speed:0,0,1.5),t=Number.isFinite(time)?time:0,anticipate=state==='windup',world=Boolean(d.worldProfile);
  const previousPool=vectorPool,previousCursor=vectorCursor,previousRoot=animationRoot;vectorPool=d.vectorPool||(d.vectorPool=[]);vectorCursor=0;animationRoot=root;d.motionContext=context;d.animationState=state;
  const floorFoot=world?Math.max(0,(.04-root.position.y)/root.scale.y)+.07:0;
  if(d.quadruped)animateQuadruped(root,t,state,moving,reveal,floorFoot);else switch(d.id){
    case 'dredge':{const surge=Math.sin(t*(1.3+moving))*moving;d.massGroup.scale.set(1+.025*surge,1-.05*surge+reveal*.10-(anticipate?.07:0),1+.035*surge);d.massGroup.rotation.z=Math.sin(t*.9)*.025*(state==='portrait'?1:Math.min(1,moving));d.massGroup.position.y=Math.sin(t*1.2)*(state==='portrait'?.022:.009+moving*.008);d.maw.scale.set(1+reveal*.16,1+reveal*.40,1);
      const a=d.body.geometry.attributes.position,n=d.body.geometry.attributes.normal,rest=d.tissueRest,nr=d.tissueNormals,impulse=clamp(Math.abs(context?.acceleration||0)*.004,0,.025),amplitude=.12+moving*.06+impulse;
      for(let i=0;i<a.count;i++){const j=i*3,x=rest[j],y=rest[j+1],z=rest[j+2],weight=clamp((y-.25)*1.6,0,1)*clamp((2.1-y)*1.4,0,1),phase=t*3.1+x*2.2+z*1.7,dy=Math.sin(phase)*weight*amplitude,squeeze=1-(.02+.02*Math.sin(phase+.8))*weight;a.setXYZ(i,x*squeeze,y+dy,z*squeeze);let nx=nr[j]-Math.cos(phase)*2.2*weight*amplitude*nr[j+1],ny=nr[j+1],nz=nr[j+2]-Math.cos(phase)*1.7*weight*amplitude*nr[j+1];if(Math.hypot(nx,ny,nz)<1e-8)ny=1;const inverse=1/Math.hypot(nx,ny,nz);n.setXYZ(i,nx*inverse,ny*inverse,nz*inverse);}a.needsUpdate=n.needsUpdate=true;d.maw.position.y=.79+Math.sin(t*3.1-3.06)*amplitude*.55;for(let i=0;i<d.folds.length;i++)d.folds[i].position.y=Math.sin(t*3.1-i*.57)*amplitude*.13;break;}
    case 'gloomfin':{
      if(Array.isArray(context?.trail)&&state!=='portrait'){animateSerpentTrail(root,t,reveal,moving,context);break;}
      d.head.scale.set(1,1,1);const attr=d.body.geometry.attributes.position,box=d.body.geometry.boundingBox;box.makeEmpty();for(let i=0;i<=d.rings;i++)for(let j=0;j<=d.sectors;j++){const p=serpentSurface(i/d.rings,j/d.sectors*Math.PI*2,t,reveal,moving,d.surfacePoint);attr.setXYZ(i*(d.sectors+1)+j,p.x,p.y,p.z);box.expandByPoint(p);}attr.needsUpdate=true;d.body.geometry.computeVertexNormals();
      const front=serpentSurface(0,Math.PI/2,t,reveal,moving,d.surfacePoint);d.head.position.set(front.x,front.y-.06,front.z-.08);d.head.rotation.y=-Math.cos(-2.1*.96-t*(1.25+moving*.3))*.14;d.head.rotation.x=-reveal*.28;for(let i=0;i<d.fins.length;i++){const u=.12+i*.062,p=serpentSurface(u,Math.PI/2,t,reveal,moving,d.surfacePoint);d.fins[i].position.copy(p);d.fins[i].position.y+=.16;d.fins[i].rotation.set(.18,0,Math.sin(t*1.5+i*.4)*.15);d.fins[i].scale.x=d.fins[i].scale.y=1;}d.jaw.scale.y=1+reveal*.7;break;
    }
    case 'leech':{
      const extension=anticipate?(world?.37:.59):(world?.39:.65)+reveal*(world?.58:.32);d.column.scale.y=extension;d.column.position.y=world?.07:0;d.column.rotation.z=Math.sin(t*.80)*.035;d.column.rotation.x=Math.sin(t*.61)*.025;
      const wormPhase=t*2.3+(context?.distanceTravelled||0)*.5,turn=clamp(context?.turnRate||0,-2,2)*.018;for(let i=0;i<d.rings.length;i++){const h=.16+i*.265,pulse=Math.sin(wormPhase-h*2.3);d.rings[i].scale.set(1+pulse*.07,1+pulse*.07,1);d.rings[i].position.set(Math.sin(wormPhase-h*2.3)*.16+turn*h*.3,h+Math.sin(t*1.1-i*.5)*.018,Math.cos(wormPhase-h*2.1)*.11);}
      const a=d.wormCore.geometry.attributes.position,n=d.wormCore.geometry.attributes.normal,r=d.wormRest,nr=d.wormNormals;for(let i=0;i<a.count;i++){const j=i*3,h=r[j+1]+1.25,phase=wormPhase-h*2.3;a.setXYZ(i,r[j]+Math.sin(phase)*.16+turn*h*.3,r[j+1],r[j+2]+Math.cos(wormPhase-h*2.1)*.11);let nx=nr[j],ny=nr[j+1]+Math.cos(phase)*.368*nx-Math.sin(wormPhase-h*2.1)*.231*nr[j+2],nz=nr[j+2],inv=1/Math.hypot(nx,ny,nz);n.setXYZ(i,nx*inv,ny*inv,nz*inv);}a.needsUpdate=n.needsUpdate=true;d.crown.position.x=Math.sin(wormPhase-2.7*2.3)*.16+turn*.81;d.crown.position.z=-.04+Math.cos(wormPhase-2.7*2.1)*.11;
      d.crown.rotation.y=Math.sin(t*.55)*.055;d.crown.rotation.z=Math.cos(wormPhase-6.21)*.12;d.maw.scale.set(1+reveal*.16,1+reveal*.24,1);break;
    }
  }
  if(!context?.deferMatrixUpdate)root.updateMatrixWorld(true);
  vectorPool=previousPool;vectorCursor=previousCursor;animationRoot=previousRoot;
}

// Compute a portrait camera from the full posed bounds; tall or long forms are not cropped.
export function getPortraitFraming(root,{aspect=4/3,fov=35,padding=1.12,direction:viewDirection}={}){
  root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root),center=box.getCenter(V()),size=box.getSize(V()),direction=(viewDirection||root.userData.portraitDirection||V(3,2,-5)).clone().normalize(),right=V().crossVectors(UP,direction).normalize(),up=V().crossVectors(direction,right).normalize(),tanV=Math.tan(THREE.MathUtils.degToRad(fov/2)),tanH=tanV*aspect;let distance=.5;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const offset=V(x,y,z).sub(center),required=offset.dot(direction)+Math.max(Math.abs(offset.dot(right))/tanH,Math.abs(offset.dot(up))/tanV)*padding;distance=Math.max(distance,required);}
  const radius=size.length()*.5;return{box,center,size,position:center.clone().addScaledVector(direction,distance),distance,fov,aspect,near:Math.max(.02,distance-radius*1.8),far:distance+radius*3+10};
}
/** Extra close-range detail belongs only to the selected cinematic copy. The
 * native world rigs, their fixed cores, portraits and limb counts stay intact. */
function prepareAttackDetails(root){
  const d=root.userData;if(d.attackDetails)return;d.attackDetails=true;
  const mouths=[],eyes=[];root.traverse(o=>{if(o.userData.mouthHeight)mouths.push(o);if(o.name==='eye')eyes.push(o);});
  for(const mouth of mouths){
    const {mouthWidth:w,mouthHeight:h,toothCount:count}=mouth.userData,old=[...mouth.children],rim=old.find(o=>o.name==='mouth-rim'),tooth=old.find(o=>o.name==='tooth'),depth=Math.max(.055,Math.min(w,h)*.72),steps=48,profile=[[1.03,-.03],[1.01,-.73],[.90,-1],[.77,-.82],[.53,-.43],[.24,-.12],[.025,.03]],positions=[],colors=[],indices=[];
    const tissue=rim.material.clone();tissue.vertexColors=true;tissue.color.setHex(0xffffff);tissue.roughness=.33;tissue.side=THREE.DoubleSide;
    for(let row=0;row<profile.length;row++)for(let j=0;j<=steps;j++){
      const a=j/steps*Math.PI*2,[radius,z]=profile[row],wrinkle=1+.035*Math.sin(a*7+d.id.length)+.018*Math.sin(a*13),corrugation=row>2?1+.08*Math.sin(a*12):1;
      positions.push(Math.cos(a)*w*radius*wrinkle,Math.sin(a)*h*radius*wrinkle,z*depth*corrugation);
      const shade=[.38,.32,.40,.18,.085,.028,.009][row]*(1+.12*Math.sin(a*9));colors.push(shade*.68,shade,shade*.91);
    }
    for(let row=0;row<profile.length-1;row++)for(let j=0;j<steps;j++){const a=row*(steps+1)+j,b=a+steps+1;indices.push(a,b,a+1,a+1,b,b+1);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();mouth.add(mesh(geometry,tissue,'recessed-muscular-throat'));
    // Hooks grow inward from two staggered depths. Their length follows the
    // species' mouth dimensions; the old fixed .15m cones crossed tiny faces.
    if(count)for(let row=0;row<2;row++)for(let i=0;i<count;i++){
      const a=(i+(row?.45:0))/count*Math.PI*2,c=Math.cos(a),s=Math.sin(a),r=row?.66:.87,length=(row?.17:.29)*(1+.24*Math.sin(i*2.3+d.id.length)),tip=r-length,base=[c*w*r,s*h*r,-depth*(row?.48:.88)],mid=[c*w*(r-length*.48),s*h*(r-length*.48),base[2]-depth*.22],end=[c*w*tip,s*h*tip,base[2]+depth*.11],radius=Math.min(w,h)*(row?.043:.062);
      mouth.add(sweep([base,mid,end],[radius,radius*.62,.0008],tooth.material,row?'inner-hooked-tooth':'outer-hooked-tooth',6,5));
    }
    for(const o of old){mouth.remove(o);o.geometry?.dispose();}
    mouth.userData.throatDepth=depth;
  }
  const replacedEyeMaterials=new Set(eyes.map(eye=>eye.material));
  for(const eye of eyes){
    const geometry=eye.geometry,position=geometry.attributes.position,box=new THREE.Box3().setFromBufferAttribute(position),size=box.getSize(V()),colors=[];geometry.scale(1.65,1.27,1.45);
    for(let i=0;i<position.count;i++){const x=position.getX(i)/(size.x*.825),y=position.getY(i)/(size.y*.635),z=position.getZ(i),radius=Math.hypot(x*.93,y),pupil=z<0&&radius<.28,iris=z<0&&radius<.62,color=pupil?new THREE.Color(0x071416):iris?new THREE.Color(0x677e71):new THREE.Color(0xd5d9bf);colors.push(color.r,color.g,color.b);}
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();const material=eye.material.clone();material.color.setHex(0xffffff);material.emissive.setHex(0x000000);material.vertexColors=true;material.roughness=.14;eye.material=material;eye.position.z-=size.z*.19;
  }
  for(const material of replacedEyeMaterials)material.dispose();
}

/** Native-model cinematic posing only; never mutate the authoritative world actor. */
function poseAttack(root,time,energy,reveal,yaw=0,frameState='lunge'){
  if(root.userData.worldProfile)throw new Error('Scare media requires a separate native creature.');
  time=time>LIVE_SCARE_IMPACT?Math.max(LIVE_SCARE_IMPACT,time-.10):time;
  const d=root.userData,e=energy,breach=clamp(time/.18,0,1),lift=breach*breach*(3-2*breach);
  if(!d.scareRest){d.scareRest=[];d.scareMouths=[];d.scareEyes=[];root.traverse(object=>{d.scareRest.push({object,position:object.position.clone(),quaternion:object.quaternion.clone(),scale:object.scale.clone()});if(object.userData.mouthHeight)d.scareMouths.push(object);if(object.userData.eyePairs)d.scareEyes.push(...object.userData.eyePairs);});}
  for(const rest of d.scareRest){rest.object.position.copy(rest.position);rest.object.quaternion.copy(rest.quaternion);rest.object.scale.copy(rest.scale);}
  d.gaitPhase=0;d.gaitTime=time-.08;d.gaitDistance=0;const attackContext=d.attackContext||(d.attackContext={});attackContext.revealOverride=reveal;attackContext.distanceTravelled=time*(.25+e);attackContext.deferMatrixUpdate=true;animateCreature(root,time,frameState,.25+e,attackContext);
  const previousPool=vectorPool,previousCursor=vectorCursor;vectorPool=d.vectorPool;vectorCursor=0;
  root.rotation.y=yaw;root.rotation.x=-e*.045;root.position.y=(d.scareRise||.5)*lift;
  const recoil=Math.sin(Math.max(0,time-LIVE_SCARE_IMPACT)*19)*Math.exp(-Math.max(0,time-LIVE_SCARE_IMPACT)*8)*.06;if(time>LIVE_SCARE_IMPACT)root.rotation.z=recoil;
  switch(d.id){
    case 'dredge':d.massGroup.scale.y*=1+e*.12;d.maw.scale.y*=1+e*.24;d.maw.scale.x*=1+e*.12;break;
    case 'wader':d.head.rotation.x+=e*.22;d.head.rotation.z=-e*.13;d.jaw.scale.y*=1+e*.46;d.thorax.rotation.x-=e*.04;break;
    case 'mirehound':d.head.rotation.z=-.13+e*.29;d.head.rotation.y=-e*.12;d.jaw.scale.y*=1+e*.3;break;
    case 'glassjaw':d.hover.rotation.x+=e*.16;for(let i=0;i<d.tendrils.length;i++){d.tendrils[i].rotation.x+=e*.42;d.tendrils[i].rotation.z+=(i%2?1:-1)*e*.10;}d.voidMouth.scale.y*=1+e*.26;break;
    case 'gloomfin':d.head.rotation.x+=e*.18;d.head.rotation.y-=e*.09;d.jaw.scale.y*=1+e*.47;break;
    case 'hush':d.disk.rotation.x=-e*.15;d.maw.scale.y*=1+e*.52;break;
    case 'carapace':d.jaw.rotation.x=-.18-e*.78;d.head.rotation.x=-e*.11;d.tail.rotation.y+=e*.14;break;
    case 'lantern':d.face.rotation.x=-e*.18;d.face.rotation.z+=e*.12;for(const wing of d.wings)wing.group.rotation.z=wing.side*(-.12+e*.35);d.carrier.rotation.x=e*.12;d.jaw.scale.y*=1+e*.48;break;
    case 'leech':d.column.scale.y*=1+e*.10;d.crown.rotation.x=-e*.10;d.maw.scale.set(1+e*.34,1+e*.39,1);break;
    case 'knuckle':d.head.rotation.z=e*.09;d.jaw.scale.y*=1+e*.52;break;
    case 'crown':for(const shell of d.shells)shell.group.rotation.z=-shell.side*(.08+e*.48);d.mantle.rotation.x=-e*.13;break;
    default:applyExtraScare(d,e,CREATURE_KIT);break;
  }
  // An expanding jaw opens away from its eyes; scaling around its center would
  // cover them with the upper lip. The inverted Lantern opens upward instead.
  for(const mouth of d.scareMouths)mouth.position.y+=(mouth.userData.inverted?1:-1)*Math.max(0,mouth.scale.y-1)*mouth.userData.mouthHeight*.92;
  const sensoryReach=({hush:.41,siphon:.32,raker:.77,urchin:.58})[d.id]||0;
  for(const pair of d.scareEyes){const reach=sensoryReach*e;pair.socket.position.z-=reach*.5;pair.socket.scale.z+=reach/(pair.depth*2);pair.eye.position.z-=reach;if(d.id==='urchin'){pair.eye.position.y-=e*.20;pair.socket.position.y-=e*.20;}}
  if(d.quadruped)reachQuadruped(d,e,time);
  root.updateMatrixWorld(true);vectorPool=previousPool;vectorCursor=previousCursor;
}
function scareFocus(root){const d=root.userData;return({dredge:d.maw,wader:d.head,mirehound:d.head,glassjaw:d.voidMouth,gloomfin:d.head,hush:d.maw,carapace:d.head,lantern:d.face,leech:d.crown,knuckle:d.head,crown:root.getObjectByName('unlit-inner-cavity'),siphon:d.maw,sawtooth:d.head,gutter:d.head,cradle:d.eye,raker:d.maw,knot:d.loop,drifter:d.eyesGroup,hermit:d.pincer,urchin:d.seam,scissor:d.head})[d.id]||root;}
function attackFraming(root,shot,aspect){
  const direction=V(root.userData.id==='lantern'?.10:.16,root.userData.id==='lantern'?-.10:.08,-1).normalize(),wide=getPortraitFraming(root,{aspect,fov:shot.fov,padding:1.06,direction}),focus=scareFocus(root),close=getPortraitFraming(focus,{aspect,fov:shot.fov,padding:1.12,direction}),center=wide.center.clone().lerp(close.center,shot.focus);
  // Slender pincers and the open ring need a closer focal shot than solid heads.
  // This affects only the isolated cinematic camera, never the world actor.
  const focalTightness=({hermit:.72,knot:.72,carapace:.88,cradle:.86,drifter:.90})[root.userData.id]||1;
  let distance=THREE.MathUtils.lerp(wide.distance*shot.tightness,close.distance*shot.tightness*(1-(1-focalTightness)*shot.energy),shot.focus),front=-Infinity;
  for(const x of [close.box.min.x,close.box.max.x])for(const y of [close.box.min.y,close.box.max.y])for(const z of [close.box.min.z,close.box.max.z])front=Math.max(front,V(x,y,z).sub(center).dot(direction));
  distance=Math.max(distance,front+.18);
  return{center,position:center.clone().addScaledVector(direction,distance),distance,fov:shot.fov,aspect,near:.025,far:distance+wide.size.length()*3+10,roll:shot.roll,focusBox:close.box,bodyBox:wide.box};
}

/** Prepare once on a selected native model. Owns no renderer or GPU resources. */
export function createLiveScareState(root,{aspect=4/3,variant=0}={}){
  if(root.userData.worldProfile)throw new Error('Live scare requires a separate native creature.');
  prepareAttackDetails(root);variant=Number.isFinite(variant)?((Math.trunc(variant)%3)+3)%3:0;
  poseAttack(root,0,.08,.22);const initialBody=new THREE.Box3().setFromObject(root),initialFocus=new THREE.Box3().setFromObject(scareFocus(root)),size=initialBody.getSize(V()),focusSize=initialFocus.getSize(V());
  root.userData.scareRise=clamp(size.y*.30,.40,.95);
  const waterY=Math.min(initialFocus.getCenter(V()).y-focusSize.y*.13,initialBody.min.y+size.y*.49),waterRadius=clamp(size.x*.34,.55,1.45);
  const frames=[];let far=30;
  for(const key of LIVE_ATTACK_KEYS){
    const approach=Math.max(0,1-key.at/LIVE_SCARE_IMPACT),yaw=variant===1?-.20*approach:variant===2?.09*approach:.028*Math.sin(key.at*4);
    poseAttack(root,key.at,key.energy,key.reveal,yaw,key.at<.07?'windup':'lunge');const framing=attackFraming(root,key,aspect);frames.push({position:framing.position,target:framing.center,translation:V(),approach});far=Math.max(far,framing.far);
  }
  // A stationary lens and stationary room: the creature crosses the distance.
  // Cache this conversion once; playback never auto-fits bounds or zooms FOV.
  const cameraAnchor=frames[0].position.clone();
  for(const frame of frames){
    frame.translation.copy(cameraAnchor).sub(frame.position);frame.target.add(frame.translation);frame.position.copy(cameraAnchor);
    if(variant===1)frame.translation.x+=size.x*.17*frame.approach;
    if(variant===2)frame.translation.y-=size.y*.12*frame.approach;
  }
  const state={cameraPosition:V(),target:V(),rootTranslation:V(),variant,focalAnatomy:scareFocus(root),fov:52,near:.025,far,roll:0,exposure:.84,phase:'anticipation',impactAt:LIVE_SCARE_IMPACT,duration:LIVE_SCARE_DURATION,done:false,baseAspect:aspect,frames,elapsed:0,waterY,waterRadius,waterOpacity:0,clipY:waterY,breach:0};
  updateLiveScare(root,state,0,aspect);return state;
}
/** Continuous live geometry and physical approach. Reuses all state vectors;
 * creates no meshes, materials, bounds or image data during playback. */
export function updateLiveScare(root,state,elapsedSeconds,aspect=state.baseAspect){
  const elapsed=Number.isFinite(elapsedSeconds)?Math.max(0,elapsedSeconds):0,t=Math.min(elapsed,LIVE_SCARE_DURATION);let index=0;
  while(index<LIVE_ATTACK_KEYS.length-2&&t>LIVE_ATTACK_KEYS[index+1].at)index++;
  const a=LIVE_ATTACK_KEYS[index],b=LIVE_ATTACK_KEYS[index+1],raw=clamp((t-a.at)/(b.at-a.at),0,1),u=raw*raw*(3-2*raw),energy=a.energy+(b.energy-a.energy)*u,reveal=a.reveal+(b.reveal-a.reveal)*u,approach=Math.max(0,1-t/LIVE_SCARE_IMPACT),yaw=state.variant===1?-.20*approach:state.variant===2?.09*approach:.028*Math.sin(t*4);
  poseAttack(root,t,energy,reveal,yaw,t<.07?'windup':'lunge');
  state.rootTranslation.lerpVectors(state.frames[index].translation,state.frames[index+1].translation,u);root.position.add(state.rootTranslation);root.updateMatrixWorld(true);
  state.cameraPosition.copy(state.frames[0].position);state.target.lerpVectors(state.frames[index].target,state.frames[index+1].target,u);
  const adjust=Math.max(1,Math.min(2.4,state.baseAspect/Math.max(.35,aspect)));if(adjust>1)state.cameraPosition.sub(state.target).multiplyScalar(adjust).add(state.target);
  state.fov=a.fov+(b.fov-a.fov)*u;state.roll=0;state.exposure=a.exposure+(b.exposure-a.exposure)*u;state.elapsed=elapsed;state.done=elapsed>=LIVE_SCARE_DURATION;
  state.breach=clamp(t/.18,0,1);const clearWater=clamp((t-.02)/.15,0,1);state.clipY=state.waterY-clearWater*clearWater*20;state.waterOpacity=t<.18?.11+Math.sin(Math.min(1,t/.18)*Math.PI)*.12:0;
  state.waterX=state.frames[0].translation.x;state.waterZ=state.frames[0].translation.z;
  state.phase=t<.035?'anticipation':t<.07?'breach':t<LIVE_SCARE_IMPACT?'lunge':t<.34?'impact':t<.78?'recoil':'settle';return state;
}

/** One disposable renderer for a requested batch. The optional factory supports
 * CPU contract/resource tests; production uses the same Three.js WebGL path. */
export function makeCreatureMedia(ids=[],{rendererFactory=options=>new THREE.WebGLRenderer(options)}={}){
  const renderer=rendererFactory({alpha:false,antialias:true,preserveDrawingBuffer:true}),scene=new THREE.Scene(),ambient=new THREE.HemisphereLight(0xc7e5dc,0x0c1520,2.5),key=new THREE.DirectionalLight(0xe1e8d4,3.5),rim=new THREE.DirectionalLight(0x88b4c4,2.6);
  key.position.set(-3,5,-5);rim.position.set(4,2,3);scene.add(ambient,key,rim);
  const camera=new THREE.PerspectiveCamera(35,4/3,.05,100),floor=mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshStandardMaterial({color:0x1b393e,roughness:.36,metalness:.05}));floor.rotation.x=-Math.PI/2;scene.add(floor);
  const models=new Map(),portraits={};
  const modelFor=id=>{if(!models.has(id))models.set(id,createCreature(id));return models.get(id);};
  const frameCamera=frame=>{camera.fov=frame.fov;camera.aspect=frame.aspect;camera.near=frame.near;camera.far=frame.far;camera.position.copy(frame.position);camera.lookAt(frame.center);if(frame.roll)camera.rotateZ(frame.roll);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);};
  try{
    renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;renderer.setSize(440,330);scene.background=new THREE.Color(0x142f36);
    for(const id of new Set(ids)){const model=modelFor(id);animateCreature(model,.7,'portrait',0);const frame=getPortraitFraming(model);scene.add(model);frameCamera(frame);floor.position.y=frame.box.min.y-.04;scene.fog=new THREE.Fog(0x142f36,frame.distance+frame.size.length(),frame.distance+frame.size.length()*3+10);renderer.render(scene,camera);portraits[id]=renderer.domElement.toDataURL('image/webp',.90);scene.remove(model);}
    return{portraits};
  }finally{for(const model of models.values()){scene.remove(model);disposeCreature(model);}floor.geometry.dispose();floor.material.dispose();try{renderer.dispose();}finally{renderer.forceContextLoss?.();}}
}
export function makePortraits(ids){return makeCreatureMedia(ids).portraits;}
export function disposeCreature(root){const geometries=new Set(),mats=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const mat of Array.isArray(o.material)?o.material:[o.material])mats.add(mat);});for(const g of geometries)g.dispose();for(const m of mats)m.dispose();}
