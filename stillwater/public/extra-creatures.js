import * as THREE from 'three';

export const EXTRA_FORMS=Object.freeze({
  siphon:{bodyPlan:'pitcher-quadruped',walkingLegs:4,arms:0,radialLimbs:0,floating:false},
  sawtooth:{bodyPlan:'hammerhead-quadruped',walkingLegs:4,arms:0,radialLimbs:0,floating:false},
  gutter:{bodyPlan:'segmented-quadruped',walkingLegs:4,arms:0,radialLimbs:0,floating:false},
  cradle:{bodyPlan:'hollow-rib-quadruped',walkingLegs:4,arms:0,radialLimbs:0,floating:false},
  raker:{bodyPlan:'four-finger-palm-crawler',walkingLegs:4,arms:0,radialLimbs:0,floating:false},
  knot:{bodyPlan:'ring-backed-quadruped',walkingLegs:4,arms:0,radialLimbs:0,floating:false},
  drifter:{bodyPlan:'sail-backed-quadruped',walkingLegs:4,arms:0,radialLimbs:0,floating:false},
  hermit:{bodyPlan:'conch-quadruped',walkingLegs:4,arms:1,radialLimbs:0,floating:false},
  urchin:{bodyPlan:'spined-shell-quadruped',walkingLegs:4,arms:0,radialLimbs:0,floating:false},
  scissor:{bodyPlan:'blade-foreleg-quadruped',walkingLegs:4,arms:0,radialLimbs:0,floating:false}
});
export const EXTRA_COLORS=[0x7a887d,0x596c6f,0x625d50,0xa1a294,0x9a9783,0x656d65,0x758e8d,0x777663,0x657873,0x74816b];
function sheet(points,material,name){const g=new THREE.BufferGeometry(),a=[],indices=[];for(const p of points)a.push(...p);for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);g.setAttribute('position',new THREE.Float32BufferAttribute(a,3));g.setIndex(indices);g.computeVertexNormals();const m=new THREE.Mesh(g,material);m.name=name;m.castShadow=true;return m;}
const group=(root,name)=>{const g=new THREE.Group();g.name=name;root.add(g);return g;};

export function buildExtraCreature(id,root,m,k){
  const{V,mesh,sculpt,sweep,add,eyes,ringMouth}=k;
  if(id==='siphon'){
    const throat=group(root,'tripod-pitcher-throat');throat.add(sweep([[0,0,.15],[0,.24,.08],[0,.56,-.04],[0,.74,-.22]],[.22,.31,.46,.52],m.skin,'pitcher-organ',28,14));const maw=ringMouth(throat,m,{y:.64,z:-.55,w:.42,h:.35,teeth:17});eyes(throat,m,[[-.28,.87,-.33],[.28,.87,-.33]],.033);
    return{throat,maw,waterlineOffset:1.10,portraitDirection:V(3,2.4,-6)};
  }
  if(id==='sawtooth'){
    const fish=group(root,'hammerhead-fish');add(fish,sculpt([.63,.40,.85],m.skin,111,.03,'powerful-fish-trunk'),0,.73,.10);const head=group(fish,'hammer-skull');head.position.set(0,.78,-.69);add(head,sculpt([1.43,.23,.31],m.skin,112,.035,'wide-hammer-head'));eyes(head,m,[[-1.18,.10,-.24],[1.18,.10,-.24]],.055);const maw=ringMouth(head,m,{y:-.05,z:-.32,w:.35,h:.16,teeth:15});
    const fins=[];for(const side of [-1,1]){const fin=sheet([[side*.35,.70,0],[side*1.55,.58,.43],[side*.73,.60,.78]],m.membrane,'pectoral-paddle');fish.add(fin);fins.push({mesh:fin,side});}fish.add(sheet([[0,.95,-.05],[0,1.73,.29],[0,.96,.72]],m.membrane,'dorsal-blade'));
    const tail=group(fish,'forked-tail');tail.position.set(0,.7,.83);tail.add(sweep([[0,0,0],[0,-.02,.34],[0,0,.65]],[.23,.12,.04],m.skin,'tail-peduncle',16,8));tail.add(sheet([[0,0,.45],[-.43,.42,.82],[0,.03,.72],[.43,-.32,.82]],m.membrane,'forked-caudal-fin'));
    return{fish,head,maw,fins,tail,waterlineOffset:1.19,portraitDirection:V(3,2,-6)};
  }
  if(id==='gutter'){
    const segments=[];for(let i=0;i<9;i++){const segment=group(root,'crawler-segment-'+i);add(segment,sculpt([.36,.25,.27],i%2?m.skin:m.ridge,120+i,.045,'segment-carapace',0));segments.push(segment);}

    const head=group(root,'centipede-head');add(head,sculpt([.31,.28,.36],m.skin,130,.04,'split-crawler-skull'));eyes(head,m,[[-.16,.11,-.29],[.16,.11,-.29]],.03);const maw=ringMouth(head,m,{y:-.08,z:-.34,w:.20,h:.12,teeth:11});for(const side of [-1,1])head.add(sweep([[side*.20,.15,-.15],[side*.39,.33,-.31],[side*.47,.27,-.44]],[.025,.018,.005],m.ridge,'feeler',14,7));
    return{segments,head,maw,waterlineOffset:1.05,portraitDirection:V(4,3,-6)};
  }
  if(id==='cradle'){
    const cage=group(root,'hollow-rib-cradle');for(let i=0;i<7;i++){const z=-.95+i*.31;cage.add(sweep([[-.82,.38,z],[-.87,1.14,z],[0,1.72+Math.sin(i)*.06,z],[.87,1.14,z],[.82,.38,z]],[.075,.09,.11,.09,.075],i%2?m.ridge:m.skin,'arched-rib-'+i,26,9));}for(const side of [-1,1])cage.add(sweep([[side*.78,.36,-1.0],[side*.91,.34,0],[side*.78,.36,1.0]],[.12,.15,.10],m.skin,'lower-cage-rail',24,10));
    const eye=group(cage,'suspended-cage-eye');eye.position.set(0,1.05,-.78);add(eye,sculpt([.19,.24,.19],m.dark,131,.03,'hanging-eye-socket',0));eyes(eye,m,[[0,.03,-.17]],.08);cage.add(sweep([[0,1.72,-.70],[.05,1.45,-.72],[0,1.18,-.78]],[.045,.029,.022],m.ridge,'suspension-tendon',16,7));
    return{cage,eye,waterlineOffset:1.10,portraitDirection:V(4,2.4,-6)};
  }
  if(id==='raker'){
    const palm=group(root,'asymmetric-hand-palm');add(palm,sculpt([.68,.27,.72],m.skin,141,.05,'huge-palm'),0,.66,0);const maw=ringMouth(palm,m,{y:.70,z:-.60,w:.32,h:.16,teeth:13});eyes(palm,m,[[-.18,.90,-.28],[.18,.90,-.28]],.03);
    return{palm,maw,waterlineOffset:.97,portraitDirection:V(3,3.8,-6)};
  }
  if(id==='knot'){
    const loop=group(root,'living-loop');loop.position.y=1.27;const geometry=new THREE.TorusGeometry(1.00,.22,14,64),a=geometry.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),angle=Math.atan2(y,x),fold=1+.035*Math.sin(angle*7);a.setXYZ(i,x*fold,y*(1+.025*Math.sin(angle*5)),z*(1+.12*Math.sin(angle*9)));}geometry.computeVertexNormals();const body=mesh(geometry,m.skin,'unbroken-living-ring');loop.add(body);
    for(let i=0;i<22;i++){const angle=i/22*Math.PI*2,tooth=mesh(new THREE.ConeGeometry(.042,.18,7),m.tooth,'inward-tooth');tooth.position.set(Math.cos(angle)*.78,Math.sin(angle)*.78,-.025);tooth.rotation.z=angle+Math.PI/2;loop.add(tooth);}return{loop,body,waterlineOffset:1.14,portraitDirection:V(2,1.7,-6)};
  }
  if(id==='drifter'){
    const sail=group(root,'asymmetric-sail');const positions=[],uv=[],indices=[],rows=24,cols=16;
    for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const v=i/rows,u=j/cols,span=.45+Math.sin(v*Math.PI)*.85;positions.push((u-.5)*2.5*span+.2*v,.30+v*2.75,Math.sin(u*Math.PI)*.34+Math.sin(v*5)*.13);uv.push(u,v);}for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const q=i*(cols+1)+j;indices.push(q,q+1,q+cols+1,q+1,q+cols+2,q+cols+1);}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();const membrane=mesh(geometry,m.membrane,'vertical-billowing-sail');sail.add(membrane);
    sail.add(sweep([[0,.25,0],[.10,1.2,.08],[.17,2.1,.02],[.20,3.13,-.02]],[.055,.075,.05,.014],m.ridge,'sail-spine',32,8));const eyesGroup=group(sail,'weighted-eye-lobes');for(let i=0;i<3;i++){const lobe=group(eyesGroup,'eye-lobe-'+i);lobe.position.set((i-1)*.55,.55+i*.25,-.12);add(lobe,sculpt([.18,.24,.20],m.skin,151+i,.04,'weighted-lobe',0));eyes(lobe,m,[[0,.03,-.18]],.06);sail.add(sweep([[(i-1)*.55,1.40+i*.2,.08],[(i-1)*.54,.91+i*.22,-.05],[(i-1)*.55,.74+i*.25,-.12]],[.027,.02,.016],m.ridge,'hanging-lobe-tendon',18,7));}
    return{sail,membrane,membraneRest:new Float32Array(positions),eyesGroup,waterlineOffset:.42,portraitDirection:V(3,2,-6)};
  }
  if(id==='hermit'){
    const conch=group(root,'spiral-conch');const points=[];for(let i=0;i<=52;i++){const t=i/52,a=t*Math.PI*4.9,r=.89*(1-t)+.08;points.push(new THREE.Vector3(Math.cos(a)*r,.94+Math.sin(a)*r,.28+t*.25));}
    // Arc-length centers and tangent frames must agree on a tightly coiled path.
    const curve=new THREE.CatmullRomCurve3(points),shellGeometry=new THREE.TubeGeometry(curve,96,1,12,false),shellPositions=shellGeometry.attributes.position,center=new THREE.Vector3();
    for(let i=0;i<=96;i++){curve.getPointAt(i/96,center);const radius=Math.min(.13,Math.hypot(center.x,center.y-.94)*.18+.01);for(let j=0;j<=12;j++){const n=i*13+j;shellPositions.setXYZ(n,center.x+(shellPositions.getX(n)-center.x)*radius,center.y+(shellPositions.getY(n)-center.y)*radius,center.z+(shellPositions.getZ(n)-center.z)*radius);}}shellGeometry.computeVertexNormals();shellGeometry.userData={surface:'tapered-sweep',rings:96,sectors:12};conch.add(mesh(shellGeometry,m.ridge,'coiled-conch-shell'));add(conch,sculpt([.87,.87,.29],m.skin,159,.035,'solid-conch-back'),0,.94,.52);add(conch,sculpt([.61,.28,.64],m.skin,160,.04,'hermit-body',0),0,.46,-.05);
    const pincer=group(root,'single-giant-pincer');pincer.position.set(-.69,.66,-.61);const upper=group(pincer,'pincer-upper'),lower=group(pincer,'pincer-lower');upper.add(sweep([[0,0,0],[-.26,.30,-.24],[.03,.33,-.62],[.17,.13,-.68]],[.19,.18,.11,.016],m.ridge,'upper-pincer',24,10));lower.add(sweep([[0,0,0],[-.21,-.17,-.28],[.05,-.17,-.61],[.17,.05,-.68]],[.17,.15,.09,.012],m.skin,'lower-pincer',24,10));eyes(conch,m,[[.20,.75,-.58],[.49,.75,-.50]],.035);
    return{conch,pincer,upper,lower,waterlineOffset:1.08,portraitDirection:V(4,2.6,-6)};
  }
  if(id==='urchin'){
    const orb=group(root,'spined-orb');orb.position.y=.96;const upper=group(orb,'upper-hemisphere'),lower=group(orb,'lower-hemisphere');upper.add(mesh(new THREE.SphereGeometry(.77,28,16,0,Math.PI*2,0,Math.PI/2),m.skin,'upper-shell'));lower.add(mesh(new THREE.SphereGeometry(.77,28,16,0,Math.PI*2,Math.PI/2,Math.PI/2),m.skin,'lower-shell'));
    const seam=ringMouth(orb,m,{y:.04,z:-.72,w:.37,h:.12,teeth:15});for(let i=0;i<24;i++){const angle=i/8*Math.PI*2,elevation=[-.15,.25,.60][Math.floor(i/8)],r=Math.sqrt(1-elevation*elevation),x=Math.cos(angle)*r,z=Math.sin(angle)*r;const spine=sweep([[x*.66,elevation*.66,z*.66],[x*1.05,elevation*1.15+.10,z*1.05],[x*1.53,elevation*1.3+.20,z*1.53]],[.11,.06,.006],m.ridge,'curved-spine-'+i,13,7);(elevation>0?upper:lower).add(spine);}eyes(orb,m,[[-.25,.26,-.63],[.25,.26,-.63]],.033);return{orb,upper,lower,seam,waterlineOffset:1.09,portraitDirection:V(3,2,-6)};
  }
  const trunk=group(root,'mantis-wedge');add(trunk,sculpt([.40,.43,.68],m.skin,180,.035,'mantis-trunk'),0,.85,.12);const head=group(trunk,'triangular-mantis-head');head.position.set(0,1.20,-.48);const headMesh=mesh(new THREE.ConeGeometry(.43,.58,3),m.skin,'wedge-skull');headMesh.rotation.x=Math.PI/2;head.add(headMesh);eyes(head,m,[[-.27,.12,-.30],[.27,.12,-.30]],.045);const maw=ringMouth(head,m,{y:-.12,z:-.21,w:.17,h:.11,teeth:9});
  return{trunk,head,maw,waterlineOffset:1.12,portraitDirection:V(3,2.6,-6)};
}

export function applyExtraScare(d,energy,k){
  switch(d.id){
    case'siphon':d.throat.rotation.x+=energy*.16;d.maw.scale.y*=1+energy*.30;break;
    case'sawtooth':d.head.rotation.x+=energy*.11;d.maw.scale.y*=1+energy*.7;for(const fin of d.fins)fin.mesh.rotation.z+=fin.side*energy*.28;break;
    case'gutter':d.head.position.y+=energy*.25;d.head.rotation.x+=energy*.18;d.maw.scale.y*=1+energy*.65;break;
    case'cradle':d.cage.rotation.x-=energy*.18;d.eye.position.z-=energy*.22;break;
    case'raker':d.palm.rotation.x+=energy*.20;d.maw.position.z-=energy*.30;d.maw.scale.y*=1+energy*.60;break;
    case'knot':d.loop.rotation.y=energy*.30;d.loop.scale.z*=1+energy*.40;break;
    case'drifter':d.sail.rotation.y=energy*.16;d.eyesGroup.position.z-=energy*.32;break;
    case'hermit':d.pincer.position.z-=energy*.32;d.upper.rotation.x-=energy*.25;d.lower.rotation.x-=energy*.35;break;
    case'urchin':d.upper.rotation.x+=energy*.85;d.lower.rotation.x-=energy*.65;d.upper.position.y+=energy*.13;d.lower.position.y-=energy*.09;d.seam.position.z-=energy*.38;d.seam.scale.y*=1+energy*.8;break;
    case'scissor':d.head.rotation.x+=energy*.15;d.maw.scale.y*=1+energy*.65;break;
  }
}
