/** Opaque, volumetric models and a cinematic volcanic arena. No image sprites. */
import {PILLARS} from '../sim/ash.js';
export const instructions='Move: arrows / WASD · Hold USE: fire · JUMP: dodge · Hold USE beside a teammate: revive';
export function createView(T,scene,camera){
 scene.background=new T.Color('#170d17');scene.fog=new T.FogExp2('#23101a',.021);
 const root=new T.Group();scene.add(root);let now=0;
 const basalt=new T.MeshStandardMaterial({color:0x39323e,roughness:.9,metalness:.16});
 const dark=new T.MeshStandardMaterial({color:0x171923,roughness:.8,metalness:.35});
 const bronze=new T.MeshStandardMaterial({color:0x9a6754,metalness:.7,roughness:.34});
 const ember=new T.MeshStandardMaterial({color:0xff8d36,emissive:0xff3b08,emissiveIntensity:3,roughness:.4});
 const cyan=new T.MeshStandardMaterial({color:0xb3f6ff,emissive:0x38c9ff,emissiveIntensity:2});
 const blood=new T.MeshStandardMaterial({color:0x74363b,emissive:0x7c1b11,emissiveIntensity:.2,roughness:.65});
 const bone=new T.MeshStandardMaterial({color:0xe4bfa0,roughness:.7});
 const dummy=new T.Object3D(),v=new T.Vector3();
 function mesh(g,m,x=0,y=0,z=0,parent=root){const o=new T.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;}
 function box(w,h,d,m,x=0,y=0,z=0,parent=root){return mesh(new T.BoxGeometry(w,h,d),m,x,y,z,parent);}
 function tube(r1,r2,h,m,x=0,y=0,z=0,parent=root,n=8){return mesh(new T.CylinderGeometry(r1,r2,h,n),m,x,y,z,parent);}
 function ring(radius,width,m,y){const o=mesh(new T.TorusGeometry(radius,width,6,96),m,0,y,0);o.rotation.x=Math.PI/2;return o;}
 const hemi=new T.HemisphereLight(0xb3b9df,0x4d170a,1.9);scene.add(hemi);
 const moon=new T.DirectionalLight(0xd3d1ec,2.8);moon.position.set(-10,24,12);moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);Object.assign(moon.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:1,far:65});moon.shadow.bias=-.001;scene.add(moon);
 const fireLight=new T.PointLight(0xff5a1c,42,40,2);fireLight.position.set(0,4,-10);scene.add(fireLight);
 const forgeLight=new T.PointLight(0x39cfff,18,18,2);forgeLight.position.set(0,3,0);scene.add(forgeLight);
 const lava=mesh(new T.CircleGeometry(60,96),new T.MeshStandardMaterial({color:0xc2320a,emissive:0xff3e08,emissiveIntensity:1.2,roughness:.5}),0,-1,0);lava.rotation.x=-Math.PI/2;
 tube(18.25,19.4,1.4,basalt,0,-.65,0,root,64).receiveShadow=true;
 // Etched stone tiles, cracks and soot are baked into a local procedural texture.
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#342f37';ctx.fillRect(0,0,512,512);let seed=92;const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);for(let i=0;i<16000;i++){const b=40+rnd()*40;ctx.fillStyle=`rgba(${b},${b*.9},${b*1.03},.25)`;ctx.fillRect(rnd()*512,rnd()*512,2,2);}ctx.strokeStyle='#15141b';ctx.lineWidth=3;for(let i=0;i<=8;i++){ctx.beginPath();ctx.moveTo(i*64,0);ctx.lineTo(i*64,512);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i*64);ctx.lineTo(512,i*64);ctx.stroke();}for(let i=0;i<24;i++){ctx.beginPath();let x=rnd()*512,y=rnd()*512;ctx.moveTo(x,y);for(let j=0;j<4;j++){x+=rnd()*35-17;y+=rnd()*35;ctx.lineTo(x,y);}ctx.strokeStyle='#814d34';ctx.lineWidth=1;ctx.stroke();}const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(3,3);tex.colorSpace=T.SRGBColorSpace;
 const floor=mesh(new T.CircleGeometry(18.05,96),new T.MeshStandardMaterial({map:tex,color:0xc0b6c8,roughness:.88,metalness:.12}),0,.065,0);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;
 ring(17.4,.1,bronze,.12);ring(17.8,.06,ember,.12);ring(9,.035,bronze,.1);
 const obsidian=new T.InstancedMesh(new T.CylinderGeometry(.7,1,6,6),dark,48);root.add(obsidian);for(let i=0;i<48;i++){const a=i/48*Math.PI*2,r=23+rnd()*12;dummy.position.set(Math.sin(a)*r,-2+rnd()*3,Math.cos(a)*r);dummy.rotation.set(rnd()*.2,a,rnd()*.2);dummy.scale.set(1+rnd()*2,.5+rnd()*2,1+rnd()*2);dummy.updateMatrix();obsidian.setMatrixAt(i,dummy.matrix);}
 const debris=new T.InstancedMesh(new T.DodecahedronGeometry(.4,0),basalt,50);root.add(debris);for(let i=0;i<50;i++){const a=rnd()*Math.PI*2,r=14+rnd()*3;dummy.position.set(Math.cos(a)*r,.2,Math.sin(a)*r);dummy.rotation.set(rnd()*3,rnd()*3,rnd()*3);dummy.scale.setScalar(.5+rnd());dummy.updateMatrix();debris.setMatrixAt(i,dummy.matrix);}
 for(const p of PILLARS){tube(1.25,1.5,.4,dark,p.x,.2,p.z);const pillar=tube(1,1.12,4.3,basalt,p.x,2.5,p.z);pillar.castShadow=true;tube(1.22,1.15,.45,bronze,p.x,4.8,p.z);tube(.8,1,.2,dark,p.x,5.1,p.z);const flame=mesh(new T.IcosahedronGeometry(.65,0),ember,p.x,5.6,p.z);flame.scale.y=1.6;}
 // Broken monumental arches frame the far side of the arena.
 for(const sign of [-1,1]){box(2.1,8,2.1,basalt,sign*10,4,-14);box(2.5,.5,2.5,bronze,sign*10,7.8,-14);box(5.2,1.2,2,basalt,sign*7.7,8.6,-14).rotation.z=sign*.16;}
 const forge=new T.Group();root.add(forge);tube(1.8,2,.28,dark,0,.2,0,forge,12);tube(1.35,1.6,.25,bronze,0,.45,0,forge,12);const forgeCore=ring(1.1,.07,cyan,.63);const core=mesh(new T.OctahedronGeometry(.45,0),cyan,0,1.25,0);
 const ventRings=[];for(const p of [{x:-3,z:3},{x:3,z:-3}]){tube(1.3,1.4,.12,dark,p.x,.14,p.z);const o=mesh(new T.TorusGeometry(1.15,.055,5,32),ember,p.x,.25,p.z);o.rotation.x=Math.PI/2;ventRings.push(o);for(let i=-1;i<=1;i++)box(2,.06,.13,bronze,p.x,.24,p.z+i*.55);}
 // Suspended ash adds depth without per-particle draw calls.
 const ashCount=160,points=new Float32Array(ashCount*3);for(let i=0;i<ashCount;i++){points[i*3]=(rnd()-.5)*48;points[i*3+1]=rnd()*15;points[i*3+2]=(rnd()-.5)*48;}const ashGeo=new T.BufferGeometry();ashGeo.setAttribute('position',new T.BufferAttribute(points,3));const ash=new T.Points(ashGeo,new T.PointsMaterial({color:0xff9d59,size:.06,transparent:true,opacity:.65,depthWrite:false}));root.add(ash);
 const players=new Map(),enemies=new Map();const colors=[0x6bdcff,0xffd477,0xb5ff80,0xc5a0ff];
 function playerModel(index){const g=new T.Group(),armor=new T.MeshStandardMaterial({color:colors[index%4],metalness:.55,roughness:.36}),light=new T.MeshStandardMaterial({color:0xeeffff,emissive:colors[index%4],emissiveIntensity:1.8});root.add(g);const torso=box(.75,.9,.5,armor,0,1.05,0,g);const head=box(.5,.44,.48,dark,0,1.75,0,g);box(.4,.13,.03,light,0,1.78,.25,g);const legs=[];for(const side of [-1,1])legs.push(box(.24,.7,.28,dark,side*.24,.38,0,g));box(.22,.58,.24,armor,-.54,1.1,0,g);const gun=box(.22,.2,.7,dark,.52,1.15,.27,g);const barrel=box(.16,.13,.1,light,.52,1.15,.67,g);torso.castShadow=true;head.castShadow=true;return {g,legs,torso,barrel,lastX:0,lastZ:0};}
 function enemyModel(kind){const boss=kind==='boss',brute=kind==='brute',g=new T.Group();root.add(g);const mat=boss?bronze:blood,s=boss?2.4:brute?1.35:1;g.scale.setScalar(s);const torso=mesh(new T.IcosahedronGeometry(.68,1),mat,0,1.1,0,g);torso.scale.set(1,.95,.65);const head=mesh(new T.DodecahedronGeometry(.4,0),bone,0,1.85,.05,g);head.scale.set(.8,1,1);box(.5,.08,.08,ember,0,1.9,.33,g);const limbs=[];for(const side of [-1,1]){const arm=tube(.12,.2,.85,mat,side*.72,1.05,0,g,5);arm.rotation.z=side*.25;limbs.push(arm);limbs.push(tube(.14,.23,.8,dark,side*.3,.4,0,g,5));}if(boss){for(const side of [-1,1]){const horn=mesh(new T.ConeGeometry(.23,.95,5),bone,side*.36,2.37,0,g);horn.rotation.z=-side*.5;}torso.castShadow=true;}return {g,limbs,torso,head,kind};}
 const bolt=new T.InstancedMesh(new T.SphereGeometry(.11,5,4),cyan,128);root.add(bolt);bolt.count=0;
 const pickup=new T.InstancedMesh(new T.OctahedronGeometry(.35,0),cyan,50);root.add(pickup);pickup.count=0;
 const sparks=new T.InstancedMesh(new T.IcosahedronGeometry(.1,0),ember,240);root.add(sparks);sparks.count=0;
 const bossShock=ring(4.9,.07,ember,.14);bossShock.visible=false;
 const bossBar=new T.Group();root.add(bossBar);const bg=box(5,.15,.1,dark,0,0,0,bossBar),fill=box(4.9,.11,.12,ember,0,0,.01,bossBar);bossBar.visible=false;
 function instances(mesh,items,set){mesh.count=Math.min(items.length,mesh.instanceMatrix.count);for(let i=0;i<mesh.count;i++){dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);set(dummy,items[i],i);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}mesh.instanceMatrix.needsUpdate=true;}
 return {update(state,localId,dt,input={}){now+=dt;const local=state.players[localId]||Object.values(state.players)[0];if(!local)return;
 for(const [id,p]of Object.entries(state.players)){let model=players.get(id);if(!model){model=playerModel(p.color||0);players.set(id,model);}const speed=Math.hypot(p.x-model.lastX,p.z-model.lastZ)/Math.max(dt,.001);model.lastX=p.x;model.lastZ=p.z;model.g.position.set(p.x,p.dead?.18:0,p.z);model.g.rotation.set(p.dead?Math.PI/2:0,p.yaw||0,p.dodge>0?Math.sin(now*25)*.22:0);model.g.visible=true;const gait=Math.sin(now*13)*Math.min(speed/6,1)*.5;model.legs[0].rotation.x=gait;model.legs[1].rotation.x=-gait;model.torso.material.emissive.setHex(p.hit>0?0xff6c38:0);model.barrel.visible=p.shot>0;}
 for(const [id,m]of players)if(!state.players[id]){root.remove(m.g);players.delete(id);}
 const present=new Set();bossBar.visible=false;bossShock.visible=false;for(const e of state.enemies){present.add(e.id);let m=enemies.get(e.id);if(!m){m=enemyModel(e.kind);enemies.set(e.id,m);}m.g.position.set(e.x,Math.sin(now*8+e.id)*.04,e.z);m.g.rotation.y=e.yaw||0;for(let i=0;i<m.limbs.length;i++)m.limbs[i].rotation.x=Math.sin(now*(e.kind==='boss'?5:9)+e.id+(i%2)*Math.PI)*.45;m.head.rotation.z=Math.sin(now*3+e.id)*.12;m.torso.material=e.hit>0?ember:e.kind==='boss'?bronze:blood;if(e.kind==='boss'){bossShock.visible=e.slam<.85;bossShock.position.set(e.x,.14,e.z);bossShock.scale.setScalar(.92+Math.sin(now*18)*.08);bossBar.visible=true;bossBar.position.set(e.x,6.5,e.z);bossBar.quaternion.copy(camera.quaternion);fill.scale.x=Math.max(.001,e.hp/e.maxHp);fill.position.x=-2.45*(1-e.hp/e.maxHp);}}
 for(const [id,m]of enemies)if(!present.has(id)){root.remove(m.g);enemies.delete(id);}
 instances(bolt,state.bullets,(o,b)=>{o.position.set(b.x,1.15,b.z);o.scale.set(.8,.8,2);o.rotation.y=Math.atan2(b.vx,b.vz);});instances(pickup,state.pickups,(o,p)=>{o.position.set(p.x,.65+Math.sin(now*4+p.id)*.14,p.z);o.rotation.y=now*2;});
 const particles=[];for(const f of state.fx)for(let i=0;i<7;i++){const life=.45-f.t,a=i/7*Math.PI*2+f.id;particles.push({x:f.x+Math.cos(a)*life*6*f.amount,y:.7+Math.sin(life*Math.PI*2)*.7,z:f.z+Math.sin(a)*life*6*f.amount,s:f.t*.55});}instances(sparks,particles,(o,p)=>{o.position.set(p.x,p.y,p.z);o.scale.setScalar(p.s);});
 const phase=state.time%8;for(const r of ventRings){r.scale.setScalar(phase>4?1+Math.sin(now*14)*.13:1);r.visible=phase>4;}forge.visible=state.phase==='intermission';forgeCore.visible=core.visible=state.phase==='intermission';core.rotation.y=now;core.position.y=1.25+Math.sin(now*2)*.15;forgeLight.intensity=state.phase==='intermission'?22:3;fireLight.intensity=38+Math.sin(now*6)*5;
 ash.rotation.y=now*.006;const pos=ashGeo.attributes.position;for(let i=0;i<ashCount;i++){pos.array[i*3+1]+=dt*(.25+i%3*.2);if(pos.array[i*3+1]>15)pos.array[i*3+1]=0;}pos.needsUpdate=true;
 const shake=local.hit>0?.06:0;v.set(local.x*.35+Math.sin(now*63)*shake,23,local.z*.35+22);camera.position.lerp(v,1-Math.exp(-dt*7));if(camera.position.y<15)camera.position.copy(v);camera.fov=52;camera.near=.1;camera.far=160;camera.updateProjectionMatrix();camera.lookAt(local.x*.45,0,local.z*.45-1.5);
 },dispose(){tex.dispose();}};
}
