import {initial,platformAt} from '../sim/sky.js';
export const instructions='ARROWS / WASD move · SPACE jump · E / ACTION air dash · SHIFT run. Reach three shared beacons, then the summit gate. Falling returns you to the latest beacon.';
export function createView(T,scene,camera){
 scene.background=new T.Color('#a3ccdc');scene.fog=new T.Fog('#c9dfe2',28,132);
 scene.add(new T.HemisphereLight(0xd9f5ff,0x6b627c,2.1));const sun=new T.DirectionalLight(0xffe4b4,3.8);sun.position.set(-18,40,15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-24;sun.shadow.camera.right=24;sun.shadow.camera.top=24;sun.shadow.camera.bottom=-24;sun.shadow.camera.far=130;sun.shadow.bias=-.001;scene.add(sun,sun.target);
 function wornSurface(moss=false){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.fillStyle=moss?'#a5b5a0':'#c4bca7';c.fillRect(0,0,256,256);let n=7;const random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};for(let i=0;i<7500;i++){const a=random();c.fillStyle=`rgba(${moss?'45,74,53':'70,62,50'},${a*.16})`;c.fillRect(random()*256,random()*256,1+random()*6,1+random()*3);}c.strokeStyle='#53605925';c.lineWidth=2;for(let y=0;y<256;y+=64){c.beginPath();c.moveTo(0,y);c.lineTo(256,y);c.stroke();for(let x=(y%128?32:0);x<256;x+=64){c.beginPath();c.moveTo(x,y);c.lineTo(x,y+64);c.stroke();}}if(moss){for(let i=0;i<55;i++){c.fillStyle='#386a4435';c.beginPath();c.ellipse(random()*256,random()*256,random()*13,random()*5,0,0,Math.PI*2);c.fill();}}const texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=4;texture.colorSpace=T.SRGBColorSpace;return texture;}
 const stone=new T.MeshStandardMaterial({color:0xe3dbc4,map:wornSurface(),roughness:.95}),rock=new T.MeshStandardMaterial({color:0x687c81,roughness:1,flatShading:true}),grass=new T.MeshStandardMaterial({color:0xd4debf,map:wornSurface(true),roughness:.95}),gold=new T.MeshStandardMaterial({color:0xe9bf67,metalness:.65,roughness:.28}),energy=new T.MeshStandardMaterial({color:0x86ffe7,emissive:0x35e9bb,emissiveIntensity:2,roughness:.2}),dark=new T.MeshStandardMaterial({color:0x314b5c,roughness:.8}),cloudMat=new T.MeshStandardMaterial({color:0xf6f3e7,roughness:1,transparent:true,opacity:.62,depthWrite:false});
 const boxGeo=new T.BoxGeometry(1,1,1),sphereGeo=new T.SphereGeometry(1,10,8),postGeo=new T.CylinderGeometry(.17,.24,1,8),crystalGeo=new T.OctahedronGeometry(.27),ringGeo=new T.TorusGeometry(1,.055,6,36);
 function mesh(geo,mat,x,y,z,sx=1,sy=1,sz=1,parent=scene){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const stage=initial(),islands=[],beacons=[],shards=[];
 for(const p of stage.platforms){const group=new T.Group();group.position.set(p.x,p.y,p.z);scene.add(group);mesh(new T.CylinderGeometry(p.r,p.r*.94,.4,10),stone,0,-.2,0,1,1,1,group);mesh(new T.ConeGeometry(p.r*.94,3.4,8),rock,0,-1.95,0,1,-1,1,group);mesh(new T.CylinderGeometry(p.r*.85,p.r*.85,.07,10),grass,0,.04,0,1,1,1,group);
  if(p.id%3===0&&p.id>0){mesh(boxGeo,stone,-p.r*.6,.9,.4,.42,1.8,.5,group);mesh(boxGeo,stone,p.r*.6,.6,.4,.42,1.2,.5,group);mesh(boxGeo,stone,0,.12,.5,1.8,.16,.65,group);}
  if(p.moving){const trim=mesh(new T.TorusGeometry(p.r+.04,.045,4,32),energy,0,.08,0,1,1,1,group);trim.rotation.x=Math.PI/2;}
  if(p.checkpoint){const ring=mesh(ringGeo,gold,0,1.65,-1.3,1.55,1.55,1.55,group);mesh(boxGeo,stone,-1.6,1,-1.3,.4,2,.5,group);mesh(boxGeo,stone,1.6,1,-1.3,.4,2,.5,group);const core=mesh(sphereGeo,energy,0,.3,0,.38,.16,.38,group);const beam=mesh(new T.CylinderGeometry(.04,.11,9,6),new T.MeshBasicMaterial({color:0xbaffde,transparent:true,opacity:.35}),0,4.6,0,1,1,1,group);beacons.push({checkpoint:p.checkpoint,ring,core,beam});}
  islands.push(group);
 }
 const finish=new T.Group();finish.position.set(0,4,-103);scene.add(finish);mesh(boxGeo,stone,-1.65,2,-.3,.6,4,.7,finish);mesh(boxGeo,stone,1.65,2,-.3,.6,4,.7,finish);mesh(boxGeo,stone,0,4,-.3,3.8,.6,.7,finish);const portal=mesh(new T.TorusGeometry(1.35,.12,8,36),gold,0,2,-.25,1,1,1,finish);const veil=mesh(new T.CircleGeometry(1.28,32),new T.MeshBasicMaterial({color:0x83ffee,transparent:true,opacity:.65,side:T.DoubleSide}),0,2,-.27,1,1,1,finish);
 for(const shard of stage.shards){const m=mesh(crystalGeo,energy,shard.x,shard.y,shard.z);shards.push(m);}
 let seed=92;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;},dummy=new T.Object3D();
 const clouds=new T.InstancedMesh(sphereGeo,cloudMat,90);clouds.castShadow=false;for(let i=0;i<90;i++){dummy.position.set((rand()-.5)*140,-12-rand()*18,-15-rand()*160);dummy.scale.set(4+rand()*7,.8+rand()*1.5,2+rand()*4);dummy.updateMatrix();clouds.setMatrixAt(i,dummy.matrix);}scene.add(clouds);
 const distantMaterial=new T.MeshStandardMaterial({color:0x9daeb9,roughness:1,flatShading:true});
 const distant=new T.InstancedMesh(new T.ConeGeometry(1,3,7),distantMaterial,20);for(let i=0;i<20;i++){const side=i%2?1:-1;dummy.position.set(side*(38+rand()*50),-3+rand()*8,-35-rand()*145);dummy.scale.set(1.5+rand()*2,-1.5-rand()*2,1.5+rand()*2);dummy.updateMatrix();distant.setMatrixAt(i,dummy.matrix);}scene.add(distant);
 // Repeated carved cornices, rim studs and temple steps are instanced in two draws.
 const carvings=[],inlays=[];for(const p of stage.platforms){if(p.moving)continue;for(let i=0;i<8;i++){const a=i*Math.PI/4;carvings.push({x:p.x+Math.cos(a)*(p.r-.08),y:p.y-.12,z:p.z+Math.sin(a)*(p.r-.08),sx:.26,sy:.19,sz:.19,ry:-a});}if(p.id%3===0){for(let i=0;i<3;i++)carvings.push({x:p.x,y:p.y+.04+i*.035,z:p.z+.65+i*.3,sx:1.5-i*.12,sy:.1,sz:.28,ry:0});}for(let i=0;i<4;i++){const a=i*Math.PI/2;inlays.push({x:p.x+Math.cos(a)*(p.r*.7),y:p.y+.092,z:p.z+Math.sin(a)*(p.r*.7),sx:.08,sy:.018,sz:.4,ry:-a});}}
 function instances(items,material){const m=new T.InstancedMesh(boxGeo,material,items.length);for(let i=0;i<items.length;i++){const v=items[i];dummy.position.set(v.x,v.y,v.z);dummy.rotation.set(0,v.ry,0);dummy.scale.set(v.sx,v.sy,v.sz);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);}m.receiveShadow=true;scene.add(m);}instances(carvings,stone);instances(inlays,gold);
 const sunDisc=mesh(sphereGeo,new T.MeshBasicMaterial({color:0xffefcb}),-55,30,-135,10,10,10);sunDisc.castShadow=false;
 // Ancient sky markers point down the course, making every next landing readable.
 const markers=new T.InstancedMesh(crystalGeo,gold,stage.platforms.length-1);for(let i=1;i<stage.platforms.length;i++){const a=stage.platforms[i-1],b=stage.platforms[i];dummy.position.set((a.x+b.x)/2,Math.max(a.y,b.y)+1.6,(a.z+b.z)/2);dummy.scale.set(.4,.4,1.1);dummy.rotation.set(0,Math.atan2(b.x-a.x,b.z-a.z),0);dummy.updateMatrix();markers.setMatrixAt(i-1,dummy.matrix);}scene.add(markers);
 const avatars=new Map(),palette=[0x2d7189,0xc66d53,0x8e6ac0,0xd4a743];
 function avatar(id,index){
  const group=new T.Group(),body=new T.Group(),bodyMat=new T.MeshStandardMaterial({color:palette[index%4],roughness:.78}),cloth=new T.MeshStandardMaterial({color:0xe5d8b5,roughness:.95}),leather=new T.MeshStandardMaterial({color:0x5e493a,roughness:.85}),glass=new T.MeshStandardMaterial({color:0x9bf3f0,metalness:.7,roughness:.13,emissive:0x2a8f8c,emissiveIntensity:.35}),skin=new T.MeshStandardMaterial({color:0xe8b48f,roughness:.7}),eye=new T.MeshStandardMaterial({color:0x1d1a22,roughness:.3}),blush=new T.MeshStandardMaterial({color:0xe58f7f,roughness:.8}),trim=new T.MeshStandardMaterial({color:0xf3cf6e,metalness:.55,roughness:.35});scene.add(group);group.add(body);
  const ball=new T.SphereGeometry(1,20,14);
  // Torso: tunic in the player's colour, cream undershirt collar, belt with a gold buckle and a side pouch.
  mesh(new T.CapsuleGeometry(.23,.31,6,18),bodyMat,0,.76,0,1,1,.8,body);
  mesh(new T.CylinderGeometry(.255,.255,.08,20),leather,0,.56,0,1,1,.84,body);mesh(boxGeo,trim,0,.56,-.215,.1,.07,.03,body);
  mesh(new T.CapsuleGeometry(.06,.08,4,10),leather,-.24,.52,-.02,1,1,.9,body);
  mesh(new T.CylinderGeometry(.16,.2,.12,18),cloth,0,1.13,0,1,1,1,body);
  // Head: face with eyes and cheeks, leather aviator cap, goggles pushed up on the forehead, a tuft of hair at the back.
  const head=new T.Group();head.position.set(0,1.36,-.025);body.add(head);
  mesh(ball,skin,0,0,0,.2,.22,.19,head);
  for(const x of [-.075,.075]){mesh(ball,eye,x,.005,-.17,.032,.042,.02,head);mesh(ball,cloth,x+.01,.018,-.183,.009,.011,.005,head);mesh(ball,blush,x*1.45,-.055,-.15,.035,.022,.012,head);}
  mesh(ball,skin,0,-.03,-.19,.025,.025,.02,head);
  mesh(new T.SphereGeometry(.212,20,12,0,Math.PI*2,0,Math.PI*.55),leather,0,.035,0,1,1,.98,head);
  mesh(boxGeo,leather,0,.08,-.168,.38,.06,.04,head);
  for(const x of [-.085,.085]){const g=mesh(new T.TorusGeometry(.055,.016,8,16),trim,x,.1,-.19,1,1,1,head);g.rotation.x=-.35;mesh(ball,glass,x,.1,-.19,.05,.045,.015,head);}
  mesh(ball,leather,-.2,-.02,0,.05,.09,.07,head);mesh(ball,leather,.2,-.02,0,.05,.09,.07,head);
  // Shoulder and hip pivots animate full limbs; elbows-free capsules with gloves and chunky boots keep a readable silhouette.
  function limb(x,y,length,leg=false){const pivot=new T.Group();pivot.position.set(x,y,0);body.add(pivot);mesh(new T.CapsuleGeometry(leg?.085:.07,length-.14,5,12),leg?dark:bodyMat,0,-length*.48,0,1,1,1,pivot);
   if(leg){mesh(new T.CylinderGeometry(.1,.095,.13,14),leather,0,-length+.09,0,1,1,1,pivot);mesh(ball,leather,0,-length+.02,-.06,.12,.085,.18,pivot);}
   else{mesh(ball,leather,0,-length+.035,0,.09,.09,.09,pivot);mesh(new T.CylinderGeometry(.085,.08,.06,12),cloth,0,-length+.12,0,1,1,1,pivot);}
   return pivot;}
  const larm=limb(-.31,1,.51),rarm=limb(.31,1,.51),lleg=limb(-.13,.54,.45,true),rleg=limb(.13,.54,.45,true);
  // Cape in two hinged halves so it bends as it streams behind, with a gold hem.
  const capePivot=new T.Group();capePivot.position.set(0,1.08,.16);body.add(capePivot);
  const half=(w0,w1,h)=>{const sh=new T.Shape();sh.moveTo(-w0,0);sh.lineTo(w0,0);sh.lineTo(w1,-h);sh.lineTo(-w1,-h);sh.closePath();return new T.ExtrudeGeometry(sh,{depth:.03,bevelEnabled:true,bevelSize:.012,bevelThickness:.008,bevelSegments:2});};
  mesh(half(.19,.3,.42),bodyMat,0,0,0,1,1,1,capePivot);
  const capeLow=new T.Group();capeLow.position.set(0,-.42,0);capePivot.add(capeLow);
  const lowShape=new T.Shape();lowShape.moveTo(-.3,0);lowShape.lineTo(.3,0);lowShape.lineTo(.38,-.36);lowShape.lineTo(.13,-.27);lowShape.lineTo(0,-.4);lowShape.lineTo(-.13,-.27);lowShape.lineTo(-.38,-.36);lowShape.closePath();
  mesh(new T.ExtrudeGeometry(lowShape,{depth:.03,bevelEnabled:true,bevelSize:.012,bevelThickness:.008,bevelSegments:2}),bodyMat,0,0,0,1,1,1,capeLow);
  mesh(boxGeo,trim,0,-.3,.02,.62,.025,.045,capeLow);
  // Backpack with a rolled blanket on top and shoulder straps, plus the gold scarf.
  mesh(new T.CapsuleGeometry(.13,.2,5,12),leather,0,.88,.23,1.3,1,.75,body);mesh(boxGeo,trim,0,.86,.335,.1,.05,.03,body);
  const roll=mesh(new T.CylinderGeometry(.075,.075,.38,14),cloth,0,1.06,.25,1,1,1,body);roll.rotation.z=Math.PI/2;
  for(const x of [-.13,.13]){const strap=mesh(boxGeo,leather,x,.86,-.02,.045,.42,.4,body);strap.rotation.x=.08;}
  const scarf=mesh(new T.TorusGeometry(.19,.065,10,24),gold,0,1.13,0,1,1,1,body);scarf.rotation.x=Math.PI/2;
  const tail=mesh(new T.CapsuleGeometry(.045,.22,4,8),gold,.1,1.03,.18,1,1,.6,body);tail.rotation.set(.5,0,-.3);
  return {group,body,head,larm,rarm,lleg,rleg,cape:capePivot,capeLow,tail,land:0,wasGrounded:true,last:new T.Vector3()};}
 // Poses: running stride, arms up and legs tucked in the air, arms swept back on a dash, a squash on landing, breathing at rest.
 function animate(a,p,time,dt){
  const movement=Math.hypot(p.vx,p.vz),run=Math.min(1,movement*.12),stride=Math.sin(time*12)*.75*run,air=!p.grounded,dash=p.trail>0,k=1-Math.exp(-dt*14);
  if(p.grounded&&!a.wasGrounded)a.land=1;a.wasGrounded=p.grounded;a.land=Math.max(0,a.land-dt*5);
  const goal=dash?{la:1.3,ra:1.3,ll:.5,rl:.35,lz:-.25,rz:.25}:air?(p.vy>0?{la:-2.6,ra:-2.4,ll:-.9,rl:.25,lz:-.35,rz:.35}:{la:-1.4,ra:-1.5,ll:-.35,rl:.4,lz:-.7,rz:.7}):{la:stride,ra:-stride,ll:-stride,rl:stride,lz:-.06,rz:.06};
  a.larm.rotation.x+=(goal.la-a.larm.rotation.x)*k;a.rarm.rotation.x+=(goal.ra-a.rarm.rotation.x)*k;a.lleg.rotation.x+=(goal.ll-a.lleg.rotation.x)*k;a.rleg.rotation.x+=(goal.rl-a.rleg.rotation.x)*k;
  a.larm.rotation.z+=(goal.lz-a.larm.rotation.z)*k;a.rarm.rotation.z+=(goal.rz-a.rarm.rotation.z)*k;
  const breathe=Math.sin(time*2.4)*.012*(1-run),bob=p.grounded?Math.abs(Math.sin(time*12))*.05*run:0,squash=a.land*.18+(dash?.08:0);
  a.body.position.y=bob;a.body.scale.set(1+squash*.5,1-squash+breathe,1+squash*.5);a.body.rotation.x=dash?-.35:air?-.08:-run*.12;
  a.head.rotation.x=dash?.25:air&&p.vy<0?.15:0;a.head.rotation.y=Math.sin(time*.7)*.12*(1-run);
  const wind=Math.min(1,movement*.08+(air?.5:0)+(dash?.6:0));
  a.cape.rotation.x=-(.12+wind*.75+Math.sin(time*8)*.05*(.3+wind));a.capeLow.rotation.x=-(.08+wind*.45+Math.sin(time*9.5+1)*.12*(.3+wind));
  a.tail.rotation.x=.5-wind*.8+Math.sin(time*11)*.15*wind;}
 const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=32;const glowContext=glowCanvas.getContext('2d'),glowGradient=glowContext.createRadialGradient(16,16,0,16,16,16);glowGradient.addColorStop(0,'rgba(255,255,232,1)');glowGradient.addColorStop(.22,'rgba(255,223,145,.65)');glowGradient.addColorStop(1,'rgba(255,210,100,0)');glowContext.fillStyle=glowGradient;glowContext.fillRect(0,0,32,32);const glowMap=new T.CanvasTexture(glowCanvas);
 const sparkleCount=130,sparklePositions=new Float32Array(sparkleCount*3),sparkleGeo=new T.BufferGeometry();sparkleGeo.setAttribute('position',new T.BufferAttribute(sparklePositions,3));const sparkles=new T.Points(sparkleGeo,new T.PointsMaterial({color:0xffdf99,map:glowMap,size:.13,transparent:true,opacity:.65,depthWrite:false,blending:T.AdditiveBlending}));scene.add(sparkles);
 let ready=false;
 return {update(state,localId,dt,input){
  for(let i=0;i<islands.length;i++){const at=platformAt(state.platforms[i],state.time);islands[i].position.x=at.x;}
  for(let i=0;i<shards.length;i++){const shard=state.shards[i],m=shards[i],at=platformAt(state.platforms[shard.platform],state.time);m.visible=!shard.collected;m.position.set(at.x,shard.y+Math.sin(state.time*2+i)*.12,at.z);m.rotation.set(state.time*.6,state.time+i,0);}
  for(const b of beacons){const on=state.checkpoint>=b.checkpoint;b.beam.visible=on;b.core.scale.set(.38*(on?1.25:1),.16,.38*(on?1.25:1));b.ring.rotation.z=state.time*.1;b.core.material=on?energy:gold;}
  portal.rotation.z=-state.time*.13;veil.visible=state.checkpoint>=3;veil.scale.setScalar(1+Math.sin(state.time*3)*.025);
  let index=0;for(const [id,p] of Object.entries(state.players)){let a=avatars.get(id);if(!a){a=avatar(id,index);avatars.set(id,a);a.group.position.set(p.x,p.y,p.z);}index++;const goal=new T.Vector3(p.x,p.y,p.z);a.group.position.lerp(goal,1-Math.exp(-dt*18));a.group.rotation.y=p.yaw;animate(a,p,state.time,dt);}
  for(const [id,a] of avatars)if(!state.players[id]){scene.remove(a.group);avatars.delete(id);}
  const p=state.players[localId]||Object.values(state.players)[0];if(p){
   for(let i=0;i<sparkleCount;i++){const t=state.time*.25+i*1.927;const radius=i<35&&p.trail>0?.65:5;const decay=(state.time*1.1+i*.197)%1;sparklePositions[i*3]=p.x+Math.sin(t*2.7)*radius;sparklePositions[i*3+1]=p.y-.2+decay*3.5;sparklePositions[i*3+2]=p.z+Math.cos(t*1.3)*radius;}sparkleGeo.attributes.position.needsUpdate=true;
const desired=new T.Vector3(p.x,p.y+5.4,p.z+8.1);if(!ready){camera.position.copy(desired);ready=true;}else camera.position.lerp(desired,1-Math.exp(-dt*5));camera.fov=59+Math.min(7,Math.hypot(p.vx,p.vz)*.45);camera.updateProjectionMatrix();camera.lookAt(p.x,p.y+.7,p.z-3.1);sun.position.set(p.x-18,p.y+40,p.z+15);sun.target.position.set(p.x,0,p.z);}
 }};
}
