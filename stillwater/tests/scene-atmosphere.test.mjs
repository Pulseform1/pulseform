import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as THREE from 'three';
import {CONFIG,MONSTER_PHYSICS,getPlatformPose,roomIndexAt} from '../shared/simulation.js';

// Exercise the actual scene/material/streaming code. Only the browser's canvas
// and GPU renderer are replaced; these are CPU checks, not rendered-image QA.
const root=fileURLToPath(new URL('../',import.meta.url));
globalThis.innerWidth=1920;globalThis.innerHeight=1080;globalThis.devicePixelRatio=2;
globalThis.window={addEventListener(){}};
globalThis.document={createElement(){return {width:0,height:0,getContext(){return new Proxy({},{get:(o,key)=>o[key]??(()=>{}),set:(o,key,value)=>(o[key]=value,true)});}};}};
globalThis.AtmosphereTestRenderer=class {constructor(){this.shadowMap={};this.info={render:{calls:0,triangles:0},memory:{geometries:0,textures:0}};}setPixelRatio(v){this.ratio=v;}getPixelRatio(){return this.ratio;}setSize(w,h){this.width=w;this.height=h;}render(){}};
let source=await fs.readFile(new URL('../public/scene.js',import.meta.url),'utf8');
const paths={'/vendor/three.module.js':'node_modules/three/build/three.module.js','/vendor/RoundedBoxGeometry.js':'node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js','/shared/simulation.js':'shared/simulation.js','./creatures.js':'public/creatures.js','./live-scare.js':'public/live-scare.js','./creature-wake.js':'public/creature-wake.js','./creature-space.js':'public/creature-space.js','./lib/BufferGeometryUtils.js':'public/lib/BufferGeometryUtils.js'};
for(const [from,to] of Object.entries(paths))source=source.replaceAll(`'${from}'`,JSON.stringify(pathToFileURL(root+to).href));
source=source.replace('new THREE.WebGLRenderer(','new globalThis.AtmosphereTestRenderer(');
const {GameScene}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

function resources(scene){let meshes=0,staticMeshes=0,points=0,shadowLights=0;for(const room of scene.rooms.values()){staticMeshes+=room.children.filter(o=>o.isMesh).length;room.traverse(o=>{if(o.isMesh)meshes++;});}scene.scene.traverse(o=>{if(o.isPointLight&&o.visible)points++;if(o.isLight&&o.castShadow)shadowLights++;});return {meshes,staticMeshes,dynamicMeshes:meshes-staticMeshes,points,shadowLights};}

test('brightness adjusts room exposure and water together without rebuilding geometry',()=>{
  const scene=new GameScene({});assert.equal(scene.brightness,1);assert.equal(scene.renderer.toneMappingExposure,.88);
  const rooms=[...scene.rooms.entries()],rootScale=scene.monster.scale.toArray();
  for(const [setting,expected] of [[.75,.75],[1,1],[1.4,1.4],[.01,.75],[5,1.4]]){
    scene.setSettings({brightness:setting});assert.equal(scene.brightness,expected);assert.equal(scene.renderer.toneMappingExposure,.88*expected);assert.equal(scene.waterMaterial.uniforms.uBrightness.value,expected);assert.deepEqual([...scene.rooms.entries()],rooms);assert.deepEqual(scene.monster.scale.toArray(),rootScale);
  }
  scene.setSettings({brightness:NaN});assert.equal(scene.brightness,1.4);
  assert.ok(scene.ambient.intensity<1&&scene.sun.intensity<2);
});

test('dimmer scene preserves Low resource limits and all quality pixel caps',()=>{
  const scene=new GameScene({});for(const id of [...scene.rooms.keys()])scene.removeRoom(id);scene.seed='performance-audit';for(let i=0;i<8;i++)scene.makeRoom(i);
  const before=resources(scene);assert.equal(before.points,0);assert.equal(before.shadowLights,0);assert.ok(before.staticMeshes<=128,`eight static room meshes ${before.staticMeshes}`);assert.ok(before.dynamicMeshes<=scene.dynamicPlatforms.size*6,`bounded dynamic room meshes ${before.dynamicMeshes}`);assert.equal(scene.renderer.shadowMap.enabled,false);
  for(const [quality,cap] of [['low',1_200_000],['medium',2_000_000],['high',3_000_000]]){
    scene.setSettings({quality,brightness:1});assert.ok(innerWidth*innerHeight*scene.renderer.getPixelRatio()**2<=cap+.1);assert.equal(scene.torch.visible,true);assert.equal(scene.renderer.shadowMap.enabled,false);
  }
  scene.setSettings({quality:'low'});for(let n=0;n<50;n++)scene.addRipple(0,0);assert.equal(scene.ripples.length,16);assert.equal(new Set(scene.ripples.map(r=>r.mesh.geometry)).size,1);
});

test('fluorescent wash uses actual standard shader hooks while route cues bypass exposure',()=>{
  const scene=new GameScene({});for(const material of [scene.tile,scene.darkTile,scene.challengeTile]){
    const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);
    assert.match(shader.vertexShader,/vPoolPosition=\(modelMatrix\*vec4\(transformed,1\.0\)\)/);
    assert.match(shader.fragmentShader,/totalEmissiveRadiance\+=vec3/);
    assert.match(shader.fragmentShader,/#include <emissivemap_fragment>/);
  }
  for(const material of [scene.routeMarker,scene.challengeMarker,scene.longJumpLabel,scene.detourLabel,scene.lamp])assert.equal(material.toneMapped,false);
  assert.ok(scene.darkTile.emissiveIntensity>0&&scene.trim.emissiveIntensity>0);
  assert.match(scene.waterMaterial.fragmentShader,/col\*uBrightness/);assert.match(scene.waterMaterial.fragmentShader,/uTorchDirection/);
});

test('threat camera offset never feeds back into follow position and safety clears it on first frame',()=>{const scene=new GameScene({}),p={id:'me',x:0,y:2,z:-3,yaw:.7,pitch:.2,vx:0,vz:0,exposed:true,alive:true},state={seed:scene.seed,difficulty:'normal',time:1,monsterId:'dredge',roomRange:{min:0,max:0},players:[],monster:{x:10,y:1.3,z:-13,yaw:0,speed:0,state:'patrol'}};const threat={active:true,intensity:1,motion:1,pulse:1,tremorPhase:1};scene.update(1/60,1,state,p,{shake:true},true,1/60,threat);const base=scene.baseCameraPosition.clone();assert.notDeepEqual(scene.camera.position.toArray(),base.toArray());for(let i=0;i<30;i++)scene.update(1/60,1+i/60,state,p,{shake:true},true,1/60,threat);assert.deepEqual(scene.baseCameraPosition.toArray(),base.toArray());scene.update(1/60,2,state,p,{shake:true},true,1/60,{active:false});assert.deepEqual(scene.camera.position.toArray(),base.toArray());assert.equal(p.yaw,.7);assert.equal(p.pitch,.2);scene.update(1/60,3,state,p,{shake:false},true,1/60,threat);assert.deepEqual(scene.camera.position.toArray(),base.toArray());});

test('actual scene wake reuses its one spray draw and preallocated rings through chase, safety and replacement',()=>{
  const scene=new GameScene({}),p={id:'me',x:0,y:2,z:-3,yaw:0,pitch:0,vx:0,vz:0,alive:true},state={seed:scene.seed,difficulty:'normal',time:0,monsterId:'dredge',roomRange:{min:0,max:0},players:[],monster:{x:9,y:1.28,z:-4,yaw:0,speed:99,state:'pursue',targetId:'me',radius:1.8}};
  const spray=scene.spray,geometry=scene.sprayGeometry,material=scene.sprayMaterial,positions=geometry.attributes.position.array,rings=new Set(scene.ripplePool.map(r=>r.mesh));let peak=0;
  for(let i=0;i<120;i++){state.time=i/60;state.monster.z=-4-i*4/60;scene.update(1/60,state.time,state,p,{},true);peak=Math.max(peak,scene.wake.active);}
  assert.ok(peak>20);assert.equal(scene.spray,spray);assert.equal(scene.sprayGeometry,geometry);assert.equal(scene.sprayMaterial,material);assert.equal(geometry.attributes.position.array,positions);assert.equal(geometry.drawRange.count,96);
  assert.ok([...scene.ripplePool,...scene.ripples].every(r=>rings.has(r.mesh)));assert.equal(scene.ripplePool.length+scene.ripples.length,35);assert.ok(scene.ripples.length<=16);
  state.monster.state='patrol';state.monster.targetId=null;
  for(let i=120;i<220;i++){state.time=i/60;scene.update(1/60,state.time,state,p,{},true);}
  assert.equal(scene.wake.active,0);assert.equal(scene.spray.visible,false);assert.ok(scene.ripples.every(r=>r.opacity===.07));
  scene.setMonster('wader');assert.equal(scene.wake.active,0);assert.equal(scene.sprayGeometry,geometry);assert.equal(scene.renderer.shadowMap.enabled,false);assert.equal(resources(scene).points,0);
});

test('authored architecture and any dry connections render at their authoritative bounds',()=>{
 const scene=new GameScene({}),records=[],original=scene.box.bind(scene);scene.box=(group,w,h,d,x,y,z,material,round)=>{records.push({w,h,d,x,y,z,material,round});return original(group,w,h,d,x,y,z,material,round);};
 const families=new Set(),palettes=new Set();let fixtures=0,obstacles=0,infill=0;
 for(let i=1;i<=18;i++){
  records.length=0;scene.makeRoom(i);const room=scene.rooms.get(i).userData.room;families.add(room.architecture.id);palettes.add(room.architecture.palette);
  const matches=(v,y)=>records.some(r=>['w','h','d','x','z'].every(k=>Math.abs(r[k]-v[k])<1e-8)&&Math.abs(r.y-y)<1e-8);
  for(const o of room.obstacles){assert.ok(matches(o,o.y+o.h/2),`obstacle ${o.id}`);obstacles++;}
  for(const f of room.structures){assert.ok(matches(f,f.y),`fixture ${room.index} ${f.kind}`);assert.ok(f.y-f.h/2>=6.4);fixtures++;}
  for(const p of room.platforms.filter(p=>p.kind==='infill')){assert.ok(matches(p,p.y-p.h/2),`infill ${p.id}`);assert.ok(records.some(r=>r.x===p.x&&r.z===p.z&&r.w===p.w&&r.d===p.d&&r.round===0));infill++;}
  scene.removeRoom(i);
 }
 assert.equal(families.size,9);assert.equal(palettes.size,3);assert.ok(fixtures>40&&obstacles>10,JSON.stringify({fixtures,obstacles,infill}));
 for(const palette of Object.values(scene.palettes)){const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};palette.tile.onBeforeCompile(shader);assert.match(shader.fragmentShader,/totalEmissiveRadiance/);}
});

test('death backdrop uses the actual room at local death position with a level attack-facing view',()=>{
 const scene=new GameScene({}),cameraBefore=scene.camera.matrixWorld.clone(),positionBefore=scene.camera.position.clone();scene.camera.rotation.x=1.4;let received;
 scene.scareStage={begin:(id,aspect,view)=>(received=view,true)};
 const death={player:{x:3,y:0,z:-8},monster:{x:0,z:-11}};assert.equal(scene.beginScare('dredge',death),true);assert.equal(received.scene,scene.scene);assert.notEqual(received.camera,scene.camera);assert.deepEqual(received.camera.position.toArray(),[3,1.55,-8]);assert.ok(Math.abs(received.camera.rotation.x)<.1);assert.ok(received.hide.includes(scene.monster));assert.deepEqual(scene.camera.position.toArray(),positionBefore.toArray());
 let hidden=false;scene.renderer.render=(world,camera)=>{hidden=!scene.monster.visible;assert.equal(world,scene.scene);assert.equal(camera.position.y,1.55);};scene.monster.visible=true;scene.renderReducedScareBackdrop(death);assert.equal(hidden,true);assert.equal(scene.monster.visible,true);
});

test('handheld torch follows camera aim, toggles water and light together, and never enables shadow or point lights',()=>{
  const scene=new GameScene({}),p={id:'me',x:1,y:2,z:-3,yaw:.8,pitch:-.2,vx:0,vz:0,alive:true},state={seed:scene.seed,difficulty:'normal',time:1,players:[],monsters:[],monster:null};
  scene.update(1/60,1,state,p,{torch:true},true);const direction=new THREE.Vector3();scene.camera.getWorldDirection(direction);
  assert.ok(direction.dot(scene.torchDirection)>.995);assert.ok(scene.torchWorldPosition.distanceTo(scene.camera.position)<.4);assert.equal(scene.torch.parent,scene.camera);assert.equal(scene.torch.target,scene.torchTarget);assert.equal(scene.waterMaterial.uniforms.uTorchPosition.value,scene.torchWorldPosition);assert.equal(scene.waterMaterial.uniforms.uTorchDirection.value,scene.torchDirection);
  assert.ok(scene.scene.fog.density>=.06);assert.ok(scene.ambient.intensity<=.2&&scene.sun.intensity<=.25);
  scene.setSettings({torch:false});assert.equal(scene.torch.visible,false);assert.equal(scene.torchLens.visible,false);assert.equal(scene.waterMaterial.uniforms.uTorchOn.value,0);
  const material=scene.waterMaterial;scene.update(1/60,2,state,p,{torch:true},true);assert.equal(scene.waterMaterial,material);assert.equal(scene.torch.visible,true);assert.equal(material.uniforms.uTorchOn.value,1);
  let pointLights=0,spotLights=0;scene.scene.traverse(o=>{if(o.isPointLight)pointLights++;if(o.isSpotLight)spotLights++;if(o.isLight)assert.equal(o.castShadow,false);});assert.equal(pointLights,0);assert.equal(spotLights,1);scene.dispose();
});

test('a hundred authoritative actors retain only quality-capped distinct stable rigs and animate distant rigs less often',()=>{
  const scene=new GameScene({});scene.camera.position.set(0,3,0);scene.camera.rotation.set(0,0,0);const monsters=Array.from({length:100},(_,i)=>({uid:`m:0:${i}`,id:'dredge',typeId:'dredge',x:0,y:1.3,z:-20-i*.1,yaw:0,speed:0,state:'patrol'})),state={seed:scene.seed,difficulty:'normal',time:0,monsters,monster:monsters[0],primaryMonsterId:monsters[0].uid};
  scene.updateActors(state,0);assert.equal(scene.actorSlots.size,4);assert.equal(scene.populationCount,100);assert.equal(scene.monster.userData.actorId,monsters[0].uid);assert.equal(new Set([...scene.actorSlots.values()].map(s=>s.space)).size,4);
  const initial=new Map([...scene.actorSlots].map(([id,s])=>[id,{root:s.root,space:s.space,scale:s.root.scale.clone()}]));
  for(let i=1;i<=60;i++){state.time=i/60;scene.updateActors(state,state.time);}
  for(const [id,value]of initial){const slot=scene.actorSlots.get(id);assert.equal(slot.root,value.root);assert.equal(slot.space,value.space);assert.deepEqual(slot.root.scale.toArray(),value.scale.toArray());}
  assert.equal(scene.actorSlots.get(monsters[0].uid).animationCount,61);const secondary=[...scene.actorSlots.values()].find(s=>s.id!==monsters[0].uid);assert.ok(secondary.animationCount<=15&&secondary.animationCount>=10);
  for(const [quality,cap]of [['medium',6],['high',8],['low',4]]){scene.setSettings({quality});scene.updateActors(state,2);assert.equal(scene.actorSlots.size,cap);assert.equal(scene.stats().monsterCap,cap);}
  let disposals=0;const departed=scene.actorSlots.get(monsters[1].uid);departed.root.traverse(o=>o.geometry?.addEventListener('dispose',()=>disposals++));monsters[1].z=500;scene.updateActors(state,3);assert.equal(scene.actorSlots.has(monsters[1].uid),false);assert.ok(disposals>0);assert.equal(scene.actorSlots.size,4);
  const retained=new Set(scene.actorSlots.keys());scene.camera.rotation.y=Math.PI;scene.updateActors(state,4);assert.equal(scene.actorSlots.size,1);assert.equal(scene.primaryActorId,monsters[0].uid);assert.ok(retained.has(scene.primaryActorId));scene.dispose();assert.equal(scene.actorSlots.size,0);
});

test('all world actor roots are hidden and independently restored during real-room death backdrop',()=>{
  const scene=new GameScene({});scene.camera.position.set(0,3,0);scene.camera.rotation.set(0,0,0);const monsters=Array.from({length:6},(_,i)=>({uid:`actor:${i}`,id:'dredge',typeId:'dredge',x:i,y:1.3,z:-10-i,yaw:0,state:'patrol'})),state={time:1,monsters,monster:monsters[0],primaryMonsterId:monsters[0].uid};scene.updateActors(state,1);
  const roots=[...scene.actorSlots.values()].map(s=>s.root);roots[1].visible=false;const before=roots.map(r=>r.visible);let calls=0;scene.renderer.render=()=>{calls++;for(const root of roots)assert.equal(root.visible,false);assert.equal(scene.torchProp.visible,false);};scene.renderReducedScareBackdrop({player:{x:0,y:0,z:-3},monster:monsters[0]});assert.equal(calls,1);assert.deepEqual(roots.map(r=>r.visible),before);assert.equal(scene.torchProp.visible,true);scene.dispose();
});

test('long room bounds, stable checkpoint cues and retained moving platforms use authoritative geometry and time',()=>{
  const scene=new GameScene({});for(let i=0;i<8;i++)if(!scene.rooms.has(i))scene.makeRoom(i);
  const spinner=[...scene.dynamicPlatforms.values()].find(e=>e.definition.kind==='spinner'),sink=[...scene.dynamicPlatforms.values()].find(e=>e.definition.kind==='sink');assert.ok(spinner&&sink,'authored spinner and sinking tile are rendered');
  assert.equal(CONFIG.roomLength,72);assert.equal(roomIndexAt(-73),1);
  let checkpoints=0;for(const room of scene.rooms.values()){
    const definition=room.userData.room,water=room.children.find(o=>o.material===scene.waterMaterial);assert.equal(water.geometry.parameters.height,Math.abs(definition.startZ-definition.endZ));assert.equal(water.geometry.parameters.width,definition.width);assert.ok(definition.width>=90);
    for(const p of definition.platforms.filter(p=>p.checkpoint||p.kind==='checkpoint')){assert.equal(scene.dynamicPlatforms.has(p.id),false);checkpoints++;}
    assert.ok(room.children.some(o=>o.material===scene.checkpointLabel));
  }assert.ok(checkpoints>=8);assert.equal(scene.checkpointTrim.toneMapped,false);assert.equal(scene.checkpointLabel.toneMapped,false);
  const state={seed:scene.seed,difficulty:scene.difficulty,time:0,platformStates:{[sink.definition.id]:{triggeredAt:10,resetAt:20,epoch:1}}},spinnerRoot=spinner.group,sinkRoot=sink.group,geometries=new Set();for(const e of [spinner,sink])e.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});
  const states=new Set();let minY=Infinity,maxY=-Infinity,minYaw=Infinity,maxYaw=-Infinity;
  for(const time of [0,10,10.1,10.3,10.6,11,12,14,19,20,22]){
    scene.updatePlatforms(state,time);for(const entry of [spinner,sink]){const pose=getPlatformPose(state,entry.definition,time);assert.deepEqual(entry.group.position.toArray(),[pose.x,pose.y,pose.z]);assert.equal(entry.group.rotation.y,pose.yaw||0);assert.equal(entry.group.visible,pose.active!==false);assert.equal(entry.group.userData.poseState,pose.state);assert.equal(entry.group.parent,scene.rooms.get(entry.room));entry.group.traverse(o=>{if(o.geometry)assert.ok(geometries.has(o.geometry));});}
    const pose=getPlatformPose(state,sink.definition,time);states.add(pose.state);minY=Math.min(minY,pose.y);maxY=Math.max(maxY,pose.y);minYaw=Math.min(minYaw,spinner.group.rotation.y);maxYaw=Math.max(maxYaw,spinner.group.rotation.y);
  }
  assert.equal(spinner.group,spinnerRoot);assert.equal(sink.group,sinkRoot);assert.ok(maxYaw-minYaw>.2);assert.ok(maxY-minY>.5);assert.ok(states.size>=3);assert.ok(sink.warningMaterial);
  const tileMap=scene.tile.map;let sharedMapDisposed=0,ownedDisposed=0;tileMap.addEventListener('dispose',()=>sharedMapDisposed++);sink.warningMaterial.addEventListener('dispose',()=>ownedDisposed++);scene.removeRoom(sink.room);assert.equal(scene.dynamicPlatforms.has(sink.definition.id),false);assert.equal(ownedDisposed,1);assert.equal(sharedMapDisposed,0);scene.dispose();assert.equal(sharedMapDisposed,1);
});

test('world scale is applied once per stable actor from enlarged authoritative profiles',()=>{
  const scene=new GameScene({});scene.camera.position.set(0,3,0);scene.camera.rotation.set(0,0,0);const m={uid:'large-wader',id:'wader',typeId:'wader',x:0,y:1.3,z:-12,state:'patrol',yaw:0},state={monsters:[m],monster:m,primaryMonsterId:m.uid,time:0};scene.updateActors(state,0);const root=scene.monster,profile=MONSTER_PHYSICS.wader;
  assert.ok(profile.radius>1.8);assert.ok(profile.worldScale>1.15);assert.deepEqual(root.scale.toArray(),[profile.worldScale,profile.worldYScale,profile.worldScale]);
  for(let i=1;i<=40;i++){state.time=i/60;scene.updateActors(state,state.time);}assert.equal(scene.monster,root);assert.deepEqual(root.scale.toArray(),[profile.worldScale,profile.worldYScale,profile.worldScale]);assert.equal(root.position.y,m.y-root.userData.waterlineOffset);scene.dispose();
});

test('three checkpoint choices render distinct route arrows and cross-room endpoints without duplicate supports',()=>{
 const scene=new GameScene({});scene.setWorld('three-route-visual','normal');for(let i=0;i<4;i++)if(!scene.rooms.has(i))scene.makeRoom(i);
 let endpointMarkers=0;
 for(const group of scene.rooms.values()){
  const room=group.userData.room,lookup=new Map([...Object.values(room.routeEndpoints||{}),...room.platforms].map(p=>[p.id,p]));assert.equal(room.paths.length,6);assert.equal(room.routeSections.length,2);
  for(const section of room.routeSections){const paths=room.paths.filter(p=>p.sectionId===section.id),labels=group.userData.routeLabels.filter(p=>p.fromId===section.fromId);assert.equal(paths.length,3);assert.equal(labels.length,3);assert.equal(new Set(labels.map(p=>p.routeId)).size,3);assert.equal(new Set(labels.map(p=>p.x)).size,3);}
  for(const marker of group.userData.routeMarkers){const from=lookup.get(marker.fromId),to=lookup.get(marker.toId);assert.ok(from&&to);assert.ok(Math.abs(marker.x-from.x)+.4<=from.w/2+.001);assert.ok(Math.abs(marker.z-from.z)+.4<=from.d/2+.001);assert.equal(marker.angle,Math.atan2(-(to.x-from.x),-(to.z-from.z)));if(!room.platforms.some(p=>p.id===to.id))endpointMarkers++;}
  for(const id of Object.keys(room.routeEndpoints)){assert.ok(room.platforms.filter(p=>p.id===id).length<=1);}
 }
 assert.equal(endpointMarkers,scene.rooms.size*3);assert.equal(scene.routeMaterials.steady.arrow,scene.routeMaterials.timed.arrow);assert.notEqual(scene.routeMaterials.steady.color.getHex(),scene.routeMaterials.timed.color.getHex());assert.notEqual(scene.routeMaterials.timed.trim,scene.sinkTile);assert.notEqual(scene.routeMaterials.timed.label,scene.sinkLabel);
 for(const entry of scene.dynamicPlatforms.values()){const route=scene.routeMaterials[entry.definition.routeId];assert.ok(route);assert.ok(entry.group.children.some(child=>child.material===route.arrow));}
 const material=scene.routeMaterials.steady.label,texture=material.map;let md=0,td=0;material.addEventListener('dispose',()=>md++);texture.addEventListener('dispose',()=>td++);scene.dispose();assert.equal(md,1);assert.equal(td,1);
});
