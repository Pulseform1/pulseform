// CHAMBER ZERO — real-time volumetric laboratory, no external model or texture requests.
export function createView(T,scene,camera){
 scene.background=new T.Color('#071019');scene.fog=new T.FogExp2('#071019',.023);
 camera.fov=69;camera.near=.05;camera.far=130;camera.updateProjectionMatrix();
 const colors=[0x55deef,0xb190ff,0x7cf5bb],white=0xd6e7e8;
 const matte=new T.MeshStandardMaterial({color:0x293743,metalness:.6,roughness:.5});
 const dark=new T.MeshStandardMaterial({color:0x0b1822,metalness:.62,roughness:.4});
 const pale=new T.MeshStandardMaterial({color:0xb0c3c9,metalness:.3,roughness:.44});
 const glass=new T.MeshStandardMaterial({color:0x42819b,transparent:true,opacity:.19,metalness:.8,roughness:.13,depthWrite:false});
 const gold=new T.MeshStandardMaterial({color:0xe0a638,metalness:.65,roughness:.32});
 const cubeGeo=new T.BoxGeometry(1,1,1),cylGeo=new T.CylinderGeometry(1,1,1,12);
 const makeGlow=(color,power=2)=>new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:power,roughness:.4,metalness:.3});
 const glows=colors.map(c=>makeGlow(c,2)),red=makeGlow(0xff3658,3),green=makeGlow(0x64f7b3,3),amber=makeGlow(0xffbd47,2.2);
 const root=new T.Group();scene.add(root);
 function box(w,h,d,mat,x=0,y=0,z=0,parent=root){const m=new T.Mesh(cubeGeo,mat);m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;if(parent===root)m.userData.staticBox=true;parent.add(m);return m}
 function cylinder(r,h,mat,x,y,z,parent=root){const m=new T.Mesh(cylGeo,mat);m.scale.set(r,h,r);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 const ambient=new T.HemisphereLight(0x9dccf3,0x111c23,1.25);scene.add(ambient);
 const key=new T.DirectionalLight(0xc5e8fa,2.1);key.position.set(6,12,7);scene.add(key);
 const roomCenters=[-1,-20,-40];
 const roomLights=roomCenters.map((z,i)=>{const l=new T.PointLight(colors[i],30,23,1.7);l.position.set(0,4.9,z);scene.add(l);return l});
 // One instanced floor grid, wall ribs, lamp strips, and ceiling cables keep draw calls low.
 function instances(items,mat){const mesh=new T.InstancedMesh(cubeGeo,mat,items.length),obj=new T.Object3D();items.forEach((v,i)=>{obj.position.set(v[0],v[1],v[2]);obj.scale.set(v[3],v[4],v[5]);obj.rotation.set(0,0,0);obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix)});mesh.receiveShadow=true;mesh.castShadow=true;root.add(mesh);return mesh}
 const tiles=[],ribs=[],cables=[],strips=[[],[],[]],warnings=[];
 for(let z=6;z>=-54;z-=2)for(let x=-7.5;x<=7.5;x+=3){tiles.push([x,-.035,z,2.92,.09,1.92]);}
 instances(tiles,matte);
 for(let j=0;j<3;j++){
  const z=roomCenters[j],depth=j===0?18:20;
  box(18,.3,depth,dark,0,-.22,z);box(18,.3,depth,dark,0,6.2,z);
  box(.4,6,depth,pale,-8.8,3,z);box(.4,6,depth,pale,8.8,3,z);
  // Recessed observation windows and the abyss beyond them.
  for(const side of [-1,1]){
   for(let k=0;k<3;k++){
    const zz=z-5+k*5;
    box(.5,2.8,3.8,dark,side*8.51,3.3,zz);
    box(.08,2.5,3.5,glass,side*8.23,3.3,zz);
    box(.08,.06,3.7,glows[j],side*8.19,2,zz);
    ribs.push([side*8.25,3,zz+2.3,.25,6,.2]);
   }
   box(.14,.12,depth-.4,glows[j],side*7.9,.3,z);
  }
  for(let k=0;k<5;k++){
   const zz=z-7+k*3.5;
   strips[j].push([-3.4,5.94,zz,2.1,.06,.3],[3.4,5.94,zz,2.1,.06,.3]);
   cables.push([-6.8,5.65,zz,.2,.2,3.5],[6.8,5.65,zz,.2,.2,3.5]);
  }
 }
 instances(ribs,dark);instances(cables,matte);strips.forEach((s,i)=>instances(s,glows[i]));
 // Bulkhead doors split three independently readable puzzle spaces.
 const doors=[];
 for(let j=0;j<3;j++){
  const z=[-10,-30,-50][j];box(6.6,6,.4,pale,-5.3,3,z);box(6.6,6,.4,pale,5.3,3,z);box(4.3,.6,.5,dark,0,5.75,z);
  box(.14,5.5,.16,glows[j],-2.13,2.75,z+.28);box(.14,5.5,.16,glows[j],2.13,2.75,z+.28);
  const g=new T.Group();root.add(g);g.position.set(0,0,z);box(3.98,5.45,.35,matte,0,2.72,0,g);
  box(.07,4.6,.04,glows[j],0,2.5,.2,g);box(2.8,.16,.04,pale,0,4.8,.2,g);
  for(let k=0;k<4;k++)box(.7,.05,.06,dark,0,1.4+k*.22,.2,g);doors.push(g);
  for(let k=0;k<7;k++)warnings.push([-1.8+k*.6,.025,z+.7,.3,.035,.28]);
 }
 instances(warnings,gold);
 box(18,6,.4,dark,0,3,7.7);box(18,6,.4,pale,0,3,-55.7);
 // Caption textures are generated locally; only signage is flat, all gameplay objects are solid.
 function sign(text,sub,x,y,z,width=4,color='#8ff1fb',rotation=0){
  const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#08121c';ctx.fillRect(0,0,768,192);ctx.fillStyle=color;ctx.fillRect(0,0,8,192);ctx.font='bold 58px Arial';ctx.fillText(text,30,82);ctx.font='22px monospace';ctx.fillStyle='#9cb2c2';ctx.fillText(sub,30,140);
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const mat=new T.MeshBasicMaterial({map:tex});const m=new T.Mesh(new T.PlaneGeometry(width,width*.25),mat);m.position.set(x,y,z);m.rotation.y=rotation;root.add(m);return m;
 }
 sign('CHAMBER ZERO','APERTURE 09 / EXPERIMENTAL TRANSIT',0,4.7,7.42,7,'#8ff1fb',Math.PI);
 sign('01 — MASS','PLACE AMBER CUBE ON FLOOR SOCKET',0,4.8,-9.72,5.8);
 sign('02 — REFRACTION','ROTATE BOTH PRISMS / FOLLOW THE BEAM',0,4.8,-29.72,5.8,'#c2a6ff');
 sign('03 — INVERSION','ALIGN CUBE / REVERSE MAGNETIC GRAVITY',0,4.8,-49.72,5.8,'#8bffd1');
 sign('EXIT / SURFACE','ALL EXPERIMENTS COMPLETE',0,3.2,-55.43,5,'#8bffd1');
 // Raised docking sockets and concentric rings communicate destination in the world itself.
 function socket(x,y,z,material,ceiling=false){
  const g=new T.Group();g.position.set(x,y,z);root.add(g);cylinder(1.42,.09,matte,0,0,0,g);const ring=new T.Mesh(new T.TorusGeometry(1.12,.045,5,32),material);ring.rotation.x=Math.PI/2;g.add(ring);
  box(1.7,.07,1.7,dark,0,ceiling?-.08:.08,0,g);
  for(const a of [-1,1])for(const b of [-1,1])box(.22,.09,.22,material,a*.81,ceiling?-.14:.14,b*.81,g);return {g,ring};
 }
 const massSocket=socket(4,.05,-5,amber),liftSocket=socket(4,5.96,-45,green,true),floorTarget=socket(4,.05,-45,green);
 sign('MASS SOCKET','DROP CUBE HERE',4,.9,-6.45,2.6,'#ffc666');
 sign('CEILING SOCKET','POSITION CUBE BELOW',4,4.8,-47,3,'#8bffd1');
 // Solid weighted cubes: shell, inset core, and illuminated edge outlines.
 function cubeModel(material){
  const g=new T.Group();root.add(g);box(1.28,1.28,1.28,pale,0,0,0,g);box(1.33,.58,.58,material,0,0,0,g);box(.58,1.33,.58,material,0,0,0,g);box(.58,.58,1.33,material,0,0,0,g);
  const edge=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1.31,1.31,1.31)),new T.LineBasicMaterial({color:material.color}));g.add(edge);return g;
 }
 const cubes=[cubeModel(amber),cubeModel(green)];
 // Laser pedestals: physical crystal reflectors with a recognisable diagonal face.
 const prisms=[];
 for(const z of [-20,-26]){
  cylinder(1.1,.22,matte,0,.11,z);cylinder(.22,.6,pale,0,.5,z);
  const g=new T.Group();g.position.set(0,1.2,z);root.add(g);
  box(1.65,.9,.16,glows[1],0,0,0,g);box(1.4,.68,.19,pale,0,0,0,g);const core=box(1.3,.5,.2,glass,0,0,0,g);g.rotation.y=Math.PI/4;prisms.push(g);
 }
 sign('PRISM A','USE TO ROTATE',0,2.8,-20,2.8,'#c2a6ff');sign('PRISM B','USE TO ROTATE',0,2.8,-26,2.8,'#c2a6ff');
 box(.4,2.1,1.4,matte,-7.5,1.1,-20);box(.2,.45,.45,red,-7.25,1.2,-20);
 box(.35,2.5,1.3,matte,7.4,1.25,-26);const receiver=box(.2,.7,.7,red,7.17,1.2,-26);
 const beams=[];
 for(let j=0;j<3;j++){
  const m=new T.Mesh(new T.CylinderGeometry(.035,.035,1,8),red),halo=new T.Mesh(new T.CylinderGeometry(.095,.095,1,8),new T.MeshBasicMaterial({color:0xff2758,transparent:true,opacity:.13,depthWrite:false}));root.add(m,halo);beams.push([m,halo]);
 }
 // Magnetic inversion console and containment field.
 box(1.45,.75,1,matte,-4,.5,-44);const consoleTop=box(1.25,.12,.9,glows[2],-4,.96,-44);consoleTop.rotation.x=.25;
 sign('POLARITY','USE: REVERSE GRAVITY',-4,2,-44.25,3,'#8bffd1');
 const polarityBall=new T.Mesh(new T.IcosahedronGeometry(.3,1),glows[2]);polarityBall.position.set(-4,1.6,-44);root.add(polarityBall);
 const field=new T.Mesh(new T.CylinderGeometry(1.42,1.42,5.7,24,1,true),new T.MeshBasicMaterial({color:0x65ffb4,transparent:true,opacity:.035,side:T.DoubleSide,depthWrite:false}));field.position.set(4,3,-45);root.add(field);
 // Small utility stacks and numbered service equipment add scale without obscuring play.
 for(const [x,z] of [[-7,-6],[7,4],[-7,-15],[7,-34],[-7,-47]]){
  box(1.3,2.2,1.1,matte,x,1.1,z);box(1.1,1.1,.05,dark,x,1.4,z+.58);
  for(let k=0;k<3;k++)box(.06,.07,.06,glows[0],x-.35+k*.25,1.5,z+.62);
 }
 const exitRing=new T.Mesh(new T.TorusGeometry(1.6,.12,8,48),green);exitRing.position.set(0,2,-53.9);root.add(exitRing);
 const starsGeo=new T.BufferGeometry(),points=new Float32Array(300*3);let seed=91;for(let j=0;j<points.length;j++){seed=(seed*1664525+1013904223)>>>0;points[j]=((seed/4294967296)-.5)*(j%3===1?24:120)}starsGeo.setAttribute('position',new T.BufferAttribute(points,3));const motes=new T.Points(starsGeo,new T.PointsMaterial({size:.025,color:0xa8e6ff,transparent:true,opacity:.4}));root.add(motes);
 // Batch fixed laboratory shells by material. Interactive meshes stay independent.
 receiver.userData.staticBox=false;consoleTop.userData.staticBox=false;
 const batches=new Map();for(const object of [...root.children])if(object.userData.staticBox){const list=batches.get(object.material)||[];list.push(object);batches.set(object.material,list)}
 for(const [material,objects]of batches){const batch=new T.InstancedMesh(cubeGeo,material,objects.length);objects.forEach((object,index)=>{object.updateMatrix();batch.setMatrixAt(index,object.matrix);root.remove(object)});batch.castShadow=true;batch.receiveShadow=true;root.add(batch)}
 const avatars=new Map(),teamColors=[0x58e1f5,0xffbd61,0xbd9aff,0x7fffbe];
 function avatar(index){
  const g=new T.Group(),suit=new T.MeshStandardMaterial({color:teamColors[index%4],metalness:.45,roughness:.45});root.add(g);
  box(.52,.65,.32,suit,0,.98,0,g);const helmet=new T.Mesh(new T.SphereGeometry(.25,12,8),pale);helmet.position.y=1.57;g.add(helmet);box(.38,.16,.08,dark,0,1.6,-.2,g);
  const arms=[],legs=[];for(const side of [-1,1]){arms.push(box(.16,.65,.18,suit,side*.38,1.02,0,g));legs.push(box(.2,.68,.24,matte,side*.16,.35,0,g))}return {g,arms,legs};
 }
 const vector=new T.Vector3(),up=new T.Vector3(0,1,0);let elapsed=0;
 return {update(s,localId,dt,input={}){
  elapsed+=dt;const p=s.players[localId]||Object.values(s.players)[0];if(!p)return;
  const yaw=Number.isFinite(input.yaw)?input.yaw:p.yaw,pitch=Number.isFinite(input.pitch)?input.pitch:p.pitch||0;
  camera.position.set(p.x,p.y+1.65+Math.sin(p.steps*3.1)*.025,p.z);camera.rotation.set(pitch,yaw,0,'YXZ');
  doors.forEach((g,j)=>g.position.y=s.door[j]*5.6);
  cubes.forEach((g,j)=>{const c=s.cubes[j];g.position.set(c.x,c.y,c.z);g.rotation.y=j===1&&s.gravity?Math.sin(elapsed*.8)*.2:0});
  prisms.forEach((g,j)=>{const target=s.mirrors[j]===0?Math.PI/4:-Math.PI/4;g.rotation.y=T.MathUtils.damp(g.rotation.y,target,9,dt)});
  beams.forEach((pair,j)=>{const seg=s.beam[j];for(const mesh of pair){mesh.visible=!!seg;if(!seg)continue;const a=new T.Vector3(seg[0].x,seg[0].y,seg[0].z),b=new T.Vector3(seg[1].x,seg[1].y,seg[1].z);vector.subVectors(b,a);mesh.position.copy(a).addScaledVector(vector,.5);mesh.scale.y=vector.length();mesh.quaternion.setFromUnitVectors(up,vector.normalize());mesh.material=s.solved[1]?(mesh===pair[0]?green:mesh.material):(mesh===pair[0]?red:mesh.material)}});
  receiver.material=s.solved[1]?green:red;massSocket.ring.material=s.solved[0]?green:amber;
  floorTarget.ring.material=s.solved[2]?green:glows[2];liftSocket.ring.rotation.z=elapsed*.3;
  polarityBall.position.y=1.6+Math.sin(elapsed*2)*.13;polarityBall.rotation.set(elapsed*.2,elapsed*.6,0);consoleTop.material=s.gravity?green:glows[2];field.material.opacity=s.gravity?.08:.025;
  exitRing.visible=s.stage===3;exitRing.rotation.z=elapsed*.12;
  roomLights.forEach((l,j)=>l.intensity=30+Math.sin(elapsed*.8+j)*1.5);motes.rotation.y=elapsed*.004;
  let index=0;for(const [id,q]of Object.entries(s.players)){
   let a=avatars.get(id);if(!a){a=avatar(index);avatars.set(id,a)}index++;a.g.visible=id!==localId;
   a.g.position.set(q.x,q.y,q.z);a.g.rotation.y=q.yaw;const swing=Math.sin(q.steps*3.2)*.45;a.arms.forEach((m,k)=>m.rotation.x=(k?1:-1)*swing);a.legs.forEach((m,k)=>m.rotation.x=(k?-1:1)*swing);
  }
  for(const [id,a]of avatars)if(!s.players[id]){a.g.visible=false}
 }};
}
