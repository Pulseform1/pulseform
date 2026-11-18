import {TRACK,pointAt,trafficAt} from '../sim/neon.js';
export {instructions} from '../sim/neon.js';
export function createView(T,scene,camera){
 scene.background=new T.Color('#283954');scene.fog=new T.FogExp2('#34425d',.0048);
 scene.add(new T.HemisphereLight(0xd7e8ff,0x62608a,2.1),new T.AmbientLight(0x759bd5,.55));
 const sun=new T.DirectionalLight(0xffd7c0,3.1);sun.position.set(-40,75,-25);scene.add(sun);
 const fill=new T.DirectionalLight(0x5fbfff,1.5);fill.position.set(40,20,30);scene.add(fill);
 const group=new T.Group();scene.add(group);
 let seed=472;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 function canvasTexture(draw,size=512){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;}
 const asphalt=canvasTexture((ctx,n)=>{ctx.fillStyle='#3d495a';ctx.fillRect(0,0,n,n);for(let i=0;i<18000;i++){const b=45+rand()*70;ctx.fillStyle=`rgba(${b},${b+6},${b+13},${.2+rand()*.4})`;ctx.fillRect(rand()*n,rand()*n,1+rand()*2,1+rand()*3);}for(let i=0;i<48;i++){ctx.fillStyle=i%2?'#7c9eaa19':'#080f231a';ctx.fillRect(rand()*n,rand()*n,2+rand()*17,30+rand()*150);}});asphalt.wrapS=asphalt.wrapT=T.RepeatWrapping;asphalt.repeat.set(32,2);
 const materials={road:new T.MeshStandardMaterial({color:0xa2b3c7,map:asphalt,roughness:.3,metalness:.12}),ground:new T.MeshStandardMaterial({color:0x26364d,roughness:.7}),white:new T.MeshStandardMaterial({color:0xbad9ed,roughness:.55}),cyan:new T.MeshBasicMaterial({color:0x36eaff}),pink:new T.MeshBasicMaterial({color:0xff35ab}),gold:new T.MeshBasicMaterial({color:0xffd472}),glass:new T.MeshStandardMaterial({color:0x355b7a,emissive:0x142740,emissiveIntensity:.2,metalness:.18,roughness:.22}),black:new T.MeshStandardMaterial({color:0x1c2632,roughness:.85}),rim:new T.MeshStandardMaterial({color:0xb5c5d9,metalness:.35,roughness:.25}),red:new T.MeshBasicMaterial({color:0xff4369}),lamp:new T.MeshBasicMaterial({color:0xc7f6ff})};
 const cube=new T.BoxGeometry(1,1,1),wheelGeo=new T.CylinderGeometry(.37,.37,.3,12),rimGeo=new T.CylinderGeometry(.235,.235,.315,10);
 function box(w,h,d,m,x,y,z,parent=group){const o=new T.Mesh(cube,m);o.scale.set(w,h,d);o.position.set(x,y,z);parent.add(o);return o;}
 function ribbon(offset,width,mat,y=.02){const vertices=[],uv=[],indices=[];for(let n=0;n<=240;n++){const a=n/240*Math.PI*2;for(const side of [-1,1]){const p=pointAt(a,offset+side*width/2);vertices.push(p.x,y,p.z);uv.push(n/240,(side+1)/2);}if(n<240){const k=n*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const o=new T.Mesh(g,mat);group.add(o);return o;}
 box(650,.1,650,materials.ground,0,-.13,0);ribbon(0,TRACK.width*2,materials.road);ribbon(-TRACK.width,.16,materials.cyan,.08);ribbon(TRACK.width,.16,materials.pink,.08);
 ribbon(-TRACK.width-.22,.3,materials.glass,.32);ribbon(TRACK.width+.22,.3,materials.glass,.32);ribbon(-TRACK.width-.22,.055,materials.cyan,.49);ribbon(TRACK.width+.22,.055,materials.pink,.49);
 // A single wide transparent ribbon simulates neon reflecting across wet asphalt.
 ribbon(-TRACK.width+1.15,2.2,new T.MeshBasicMaterial({color:0x32bed2,transparent:true,opacity:.085,depthWrite:false}),.035);ribbon(TRACK.width-1.15,2.2,new T.MeshBasicMaterial({color:0xe245ab,transparent:true,opacity:.075,depthWrite:false}),.035);
 const matrix=new T.Matrix4(),q=new T.Quaternion(),scale=new T.Vector3(),v=new T.Vector3(),yAxis=new T.Vector3(0,1,0);
 function instanceBoxes(count,mat,place,parent=group){const mesh=new T.InstancedMesh(cube,mat,count);for(let n=0;n<count;n++){const p=place(n);v.set(p.x,p.y,p.z);scale.set(p.w,p.h,p.d);q.setFromAxisAngle(yAxis,p.yaw||0);matrix.compose(v,q,scale);mesh.setMatrixAt(n,matrix);}mesh.instanceMatrix.needsUpdate=true;parent.add(mesh);return mesh;}
 instanceBoxes(100,materials.white,n=>{const p=pointAt(n/100*Math.PI*2);return {...p,y:.055,w:.15,h:.025,d:1.1};});
 instanceBoxes(160,materials.gold,n=>{const a=n/160*Math.PI*2,p=pointAt(a,n%2?TRACK.width-.4:-TRACK.width+.4);return {...p,y:.055,w:.5,h:.025,d:.85};});
 const buildingMat=new T.MeshStandardMaterial({color:0x57708a,emissive:0x1b2942,emissiveIntensity:.27,roughness:.65,metalness:.08});
 const towerSpecs=Array.from({length:70},(_,n)=>{const a=n*.61803398875*Math.PI*2,offset=(n<36?17:32)+(n%5)*3,p=pointAt(a,offset),h=12+(n%7)*5.6;return {...p,yaw:0,y:h/2,w:5+n%4*1.4,h,d:5+(n%3)*2};});
 const towers=instanceBoxes(towerSpecs.length,buildingMat,n=>towerSpecs[n]);for(let n=0;n<towerSpecs.length;n++)towers.setColorAt(n,new T.Color().setHSL(.59+(n%3)*.025,.22,.38+(n%5)*.035));
 // Thousands of small lit windows on all four walls cost only three draw calls.
 const windows=[[],[],[]];towerSpecs.forEach((b,id)=>{for(let floor=0;floor<Math.floor((b.h-2)/2.2);floor++)for(let column=0;column<4;column++)for(let side=0;side<4;side++){
  if(rand()<.27)continue;const u=(column+.5)/4-.5,front=side<2;
  windows[(id+floor+column)%3].push({x:b.x+(front?u*b.w:(side===2?-1:1)*(b.w/2+.025)),y:2+floor*2.2,z:b.z+(front?(side===0?-1:1)*(b.d/2+.025):u*b.d),w:front?b.w*.12:.035,h:.6+rand()*.35,d:front?.035:b.d*.12});
 }});
 const windowMats=[new T.MeshBasicMaterial({color:0xffd6a0}),new T.MeshBasicMaterial({color:0x83c8ff}),new T.MeshBasicMaterial({color:0xbfa8ed})];windows.forEach((items,i)=>instanceBoxes(items.length,windowMats[i],n=>items[n]));
 instanceBoxes(70,materials.glass,n=>{const b=towerSpecs[n];return {x:b.x,y:b.h+.15,z:b.z,w:b.w+.1,h:.3,d:b.d+.1};});
 function sign(text,width,height,color){const c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d');x.fillStyle='#142237';x.fillRect(0,0,1024,256);x.strokeStyle=color;x.lineWidth=12;x.strokeRect(6,6,1012,244);x.font='bold 88px Arial';x.textAlign='center';x.textBaseline='middle';x.fillStyle=color;x.fillText(text,512,130);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const mat=new T.MeshBasicMaterial({map:tex,side:T.DoubleSide});return new T.Mesh(new T.PlaneGeometry(width,height),mat);}
 const gate=new T.Group();gate.position.set(0,0,-TRACK.rz);gate.rotation.y=Math.PI/2;group.add(gate);box(.5,8,.5,materials.glass,-8,4,0,gate);box(.5,8,.5,materials.glass,8,4,0,gate);box(17,.35,.5,materials.cyan,0,8,0,gate);const banner=sign('NEON OVERDRIVE',16,2.2,'#58f2ff');banner.position.set(0,6.7,0);gate.add(banner);
 // Quarter-circuit gates make the racing line readable far down the road.
 const arches=[];for(let n=1;n<=3;n++){const p=pointAt(-Math.PI/2+n*Math.PI/2),arch=new T.Group();arch.position.set(p.x,0,p.z);arch.rotation.y=p.yaw;group.add(arch);const m=n%2?materials.pink:materials.cyan;box(.35,5,.5,materials.glass,-7,2.5,0,arch);box(.35,5,.5,materials.glass,7,2.5,0,arch);box(.12,5.1,.12,m,-6.8,2.6,.3,arch);box(.12,5.1,.12,m,6.8,2.6,.3,arch);box(14,.18,.28,m,0,5.2,.3,arch);const label=sign(`SECTOR 0${n}`,6,1,n%2?'#ff80cf':'#82f5ff');label.position.set(0,4.6,0);arch.add(label);arches.push(arch);}
 for(let n=0;n<12;n++){const p=pointAt(n/12*Math.PI*2,TRACK.width+1.3);box(.15,6,.15,materials.glass,p.x,3,p.z);box(.28,1.8,.28,n%2?materials.cyan:materials.pink,p.x,5,p.z);}
 instanceBoxes(32,materials.white,n=>({x:(n%2)*.65-.32,y:.07,z:-TRACK.rz-TRACK.width+(Math.floor(n/2)+.5)*TRACK.width/8,w:.6,h:.025,d:TRACK.width/8*.8}));
 // A low sun and mountain silhouettes give the city a twilight horizon.
 const moon=new T.Mesh(new T.SphereGeometry(11,20,12),new T.MeshBasicMaterial({color:0xf0afc4}));moon.position.set(170,54,-210);group.add(moon);
 const haze=new T.MeshBasicMaterial({color:0x6f6a9d,transparent:true,opacity:.2,depthWrite:false});const halo=new T.Mesh(new T.SphereGeometry(15,16,10),haze);halo.position.copy(moon.position);group.add(halo);
 const mountainMat=new T.MeshStandardMaterial({color:0x52647e,roughness:1});for(let n=0;n<6;n++){const m=new T.Mesh(new T.ConeGeometry(65,85,5),mountainMat);m.position.set(-230+n*85,4,-250-(n%2)*40);group.add(m);}
 function mergeGeometries(parts){const p=[],n=[],uv=[];for(const g of parts){const a=g.index?g.toNonIndexed():g;p.push(...a.attributes.position.array);n.push(...a.attributes.normal.array);if(a.attributes.uv)uv.push(...a.attributes.uv.array);else uv.push(...Array(a.attributes.position.count*2).fill(0));if(a!==g)a.dispose();g.dispose();}const out=new T.BufferGeometry();out.setAttribute('position',new T.Float32BufferAttribute(p,3));out.setAttribute('normal',new T.Float32BufferAttribute(n,3));out.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return out;}
 function part(w,h,d,x,y,z,rx=0,rz=0){const g=new T.BoxGeometry(w,h,d),m=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,0,rz)),new T.Vector3(1,1,1));return g.applyMatrix4(m);}
 // Sculpted cross-sections create tapered bodywork instead of stacked rectangular boxes.
 function loft(sections){const verts=[],idx=[];for(const [z,width,bottom,top] of sections)verts.push(-width,bottom,z,-width*.98,top-.11,z,-width*.69,top,z,width*.69,top,z,width*.98,top-.11,z,width,bottom,z);for(let s=0;s<sections.length-1;s++)for(let j=0;j<6;j++){const k=s*6+j,l=s*6+(j+1)%6;idx.push(k,l,k+6,l,l+6,k+6);}for(let j=1;j<5;j++){idx.push(0,j+1,j);const k=(sections.length-1)*6;idx.push(k,k+j,k+j+1);}for(let i=0;i<idx.length;i+=3)[idx[i+1],idx[i+2]]=[idx[i+2],idx[i+1]];const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();return g;}
 const bodyGeometry=mergeGeometries([loft([[-1.78,.79,.30,.69],[-1.28,.96,.26,.81],[.55,.92,.24,.69],[1.52,.88,.27,.51],[1.86,.72,.32,.43]]),part(1.06,.055,.72,0,1.22,-.25),part(1.95,.09,.35,0,1.03,-1.53),part(.07,.33,.1,-.66,.84,-1.5),part(.07,.33,.1,.66,.84,-1.5),part(.16,.12,.25,-1.01,.85,.4),part(.16,.12,.25,1.01,.85,.4)]);
 const cabinGeometry=loft([[-1,.73,.70,.78],[-.56,.62,.70,1.23],[.18,.61,.66,1.23],[.94,.73,.60,.70]]);
 const trimGeometry=mergeGeometries([part(1.45,.16,.1,0,.36,-1.8),part(1.38,.11,.12,0,.34,1.83),part(.09,.09,2.4,-.94,.27,-.05),part(.09,.09,2.4,.94,.27,-.05),part(.06,.055,.95,-.61,1.24,-.17),part(.06,.055,.95,.61,1.24,-.17),part(.06,.7,.04,-.56,.9,.55,-.85),part(.06,.7,.04,.56,.9,.55,-.85)]);
 const tailGeometry=mergeGeometries([part(.51,.12,.06,-.54,.61,-1.805),part(.51,.12,.06,.54,.61,-1.805),part(.12,.1,.06,-.19,.61,-1.805),part(.12,.1,.06,.19,.61,-1.805)]);
 const headGeometry=mergeGeometries([part(.38,.09,.1,-.51,.47,1.76),part(.38,.09,.1,.51,.47,1.76)]);
 const shadowTex=canvasTexture((ctx,n)=>{const grad=ctx.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);grad.addColorStop(0,'#000000ad');grad.addColorStop(.65,'#00000088');grad.addColorStop(1,'#00000000');ctx.fillStyle=grad;ctx.fillRect(0,0,n,n);},64);
 const shadowMat=new T.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false,opacity:.7});const shadowGeo=new T.PlaneGeometry(3.1,4.9);shadowGeo.rotateX(-Math.PI/2);
 const beamGeometry=new T.BufferGeometry();beamGeometry.setAttribute('position',new T.Float32BufferAttribute([-.55,.06,1.9,-1.9,.06,7.5,.2,.06,7.5,.55,.06,1.9,-.2,.06,7.5,1.9,.06,7.5],3));beamGeometry.computeVertexNormals();const beamMat=new T.MeshBasicMaterial({color:0xb1e9ff,transparent:true,opacity:.065,side:T.DoubleSide,depthWrite:false});
 const colors=[0x43cde7,0xff69b9,0xffc75d,0xa8f67a],cars=new Map(),traffic=[];
 function car(color){const g=new T.Group(),paint=new T.MeshStandardMaterial({color,metalness:.22,roughness:.25,emissive:color,emissiveIntensity:.11});
  for(const [geo,mat] of [[bodyGeometry,paint],[cabinGeometry,materials.glass],[trimGeometry,materials.black],[tailGeometry,materials.red],[headGeometry,materials.lamp],[shadowGeo,shadowMat],[beamGeometry,beamMat]]){const mesh=new T.Mesh(geo,mat);if(geo===shadowGeo)mesh.position.y=.045;g.add(mesh);}
  const wheels=new T.InstancedMesh(wheelGeo,materials.black,4),rims=new T.InstancedMesh(rimGeo,materials.rim,4);let index=0;for(const x of [-.89,.89])for(const z of [-1.04,1.08]){const m=new T.Matrix4().compose(new T.Vector3(x,.38,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),Math.PI/2),new T.Vector3(1,1,1));wheels.setMatrixAt(index,m);rims.setMatrixAt(index++,m);}g.add(wheels,rims);
  const exhaust=box(.55,.1,.8,materials.cyan,0,.34,-2,g);exhaust.visible=false;g.userData.exhaust=exhaust;group.add(g);return g;
 }
 for(let n=0;n<6;n++)traffic.push(car(n%2?0x8f829c:0x617c9f));
 const rainGeometry=new T.BufferGeometry(),rain=new Float32Array(900*3);for(let n=0;n<rain.length;n+=3){rain[n]=(rand()-.5)*180;rain[n+1]=rand()*65;rain[n+2]=(rand()-.5)*140;}rainGeometry.setAttribute('position',new T.BufferAttribute(rain,3));const rainMesh=new T.Points(rainGeometry,new T.PointsMaterial({color:0xd5e9ff,size:.065,transparent:true,opacity:.36}));group.add(rainMesh);
 let ready=false;const cameraGoal=new T.Vector3(),look=new T.Vector3();
 return {update(s,id,dt,input){
  for(const [key,p] of Object.entries(s.players)){if(!cars.has(key))cars.set(key,car(colors[p.index%4]));const c=cars.get(key);c.position.set(p.x,.02,p.z);c.rotation.y=p.yaw;c.rotation.z=(p.drifting?.055:0)*Math.sin(s.time*12);c.userData.exhaust.visible=p.boosting;c.userData.exhaust.scale.z=.8+Math.sin(s.time*55)*.4;}
  for(const [key,c] of cars)if(!s.players[key]){group.remove(c);cars.delete(key);}
  traffic.forEach((c,n)=>{const p=trafficAt(s.time,n);c.position.set(p.x,0,p.z);c.rotation.y=p.yaw;});
  const p=s.players[id]||Object.values(s.players)[0];if(p){const speed=Math.max(0,p.speed),rear=6.3+speed*.06;cameraGoal.set(p.x-Math.sin(p.yaw)*rear,3.1+speed*.018,p.z-Math.cos(p.yaw)*rear);if(!ready){camera.position.copy(cameraGoal);ready=true;}else camera.position.lerp(cameraGoal,1-Math.exp(-dt*7));look.set(p.x+Math.sin(p.yaw)*5,1.0,p.z+Math.cos(p.yaw)*5);camera.lookAt(look);camera.fov=63+speed*.34;camera.updateProjectionMatrix();}
  for(let n=1;n<rain.length;n+=3){rain[n]-=dt*28;if(rain[n]<0)rain[n]=65;}rainGeometry.attributes.position.needsUpdate=true;
 },dispose(){}};
}
