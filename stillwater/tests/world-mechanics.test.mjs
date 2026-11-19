import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, MONSTER_PHYSICS, createSimulation, addPlayer, getRoom, getPlatformPose,
  clonePlatformStates, advancePredictionWorld, stepPlayer, stepSimulation, respawnPlayer,
  serializeSimulation, roomIndexAt } from '../shared/simulation.js';

const dt=1/60;
function point(p,x,z){const c=Math.cos(p.yaw||0),s=Math.sin(p.yaw||0);return{x:p.x+c*x+s*z,z:p.z-s*x+c*z};}
function clearance(p,x,z){const c=Math.cos(p.yaw||0),s=Math.sin(p.yaw||0),dx=x-p.x,dz=z-p.z;return Math.hypot(Math.max(0,Math.abs(c*dx-s*dz)-p.w/2),Math.max(0,Math.abs(s*dx+c*dz)-p.d/2));}
function place(sim,p,def,localX=0,localZ=0){const pose=getPlatformPose(sim,def),q=point(pose,localX,localZ);Object.assign(p,{...q,y:pose.y,vx:0,vy:0,vz:0,grounded:true,safe:true,exposed:false,inWater:false,supportId:pose.id,supportLocalX:localX,supportLocalZ:localZ,supportSampleTime:sim.time,supportVelocityX:0,supportVelocityZ:0,time:sim.time});}
function controllerTick(sim,players){advancePredictionWorld(sim,dt);for(const p of players)stepPlayer(p,{},dt,sim);}
function coreClear(sim,m){const radius=MONSTER_PHYSICS[m.typeId].coreClearance;for(let i=Math.max(0,roomIndexAt(m.z)-1);i<=roomIndexAt(m.z)+1;i++){const room=getRoom(sim.seed,i,sim.difficulty);for(const def of [...room.platforms,...room.obstacles]){const pose=def.safe?getPlatformPose(sim,def):def;if(pose.active===false)continue;assert.ok(clearance(pose,m.x,m.z)>=radius-.015,`${m.uid} intersects ${pose.id}`);}}}

test('generated large rooms retain real hazards, checkpoints, distinct tiles and full spinner placement clearance',()=>{
 let spins=0,sinks=0;const templates=new Set();
 for(const seed of ['hazard-a','hazard-b'])for(let index=1;index<=18;index++){
  const room=getRoom(seed,index);assert.equal(room.fallback,undefined);assert.ok(room.width>=95&&room.height>=10);assert.equal(room.startZ-room.endZ,72);templates.add(room.template);
  assert.ok(room.platforms.filter(p=>p.checkpoint).length>=2);
  for(const p of room.platforms){if(p.kind==='sink'){sinks++;assert.equal(p.tileShade,'ochre');assert.ok(p.sink.warning>=.8);assert.ok(!p.checkpoint);}if(p.kind==='spinner'){spins++;assert.ok(p.w/p.d>2.5);assert.notEqual(p.motion.angularVelocity,0);for(const other of room.platforms)if(other!==p)assert.ok(Math.hypot(other.x-p.x,other.z-p.z)>=Math.hypot(p.w,p.d)/2+Math.hypot(other.w,other.d)/2+.119);}}
 }
 assert.ok(spins>=24);assert.ok(sinks>=50);assert.ok(templates.size>=12);
});

test('rotating support carries local contacts once, predicts identically and transfers tangent velocity on takeoff',()=>{
 const sim=createSimulation({seed:'rider-review'}),p=addPlayer(sim,'p'),beam=getRoom(sim.seed,1).platforms.find(p=>p.kind==='spinner');assert.ok(beam);place(sim,p,beam,1.8,0);
 const predicted={...sim,players:{p:structuredClone(p)},platformStates:clonePlatformStates(sim.platformStates),events:null},q=predicted.players.p;
 for(let i=0;i<90;i++){stepSimulation(sim,{},dt);advancePredictionWorld(predicted,dt);stepPlayer(q,{},dt,predicted);const expected=point(getPlatformPose(sim,beam),1.8,0);assert.ok(Math.hypot(p.x-expected.x,p.z-expected.z)<1e-8);assert.ok(Math.hypot(p.x-q.x,p.z-q.z)<1e-8);assert.ok(p.safe&&q.safe);}
 const before={x:p.x,z:p.z};stepPlayer(p,{},dt,sim);assert.ok(Math.hypot(p.x-before.x,p.z-before.z)<1e-8,'same world timestamp cannot apply carry twice');
 advancePredictionWorld(sim,dt);stepPlayer(p,{jump:true},dt,sim);assert.equal(p.grounded,false);assert.ok(p.vy>0);assert.ok(Math.abs(Math.hypot(p.vx,p.vz)-Math.abs(beam.motion.angularVelocity*1.8))<.001);assert.ok(Math.hypot(p.vx-p.supportVelocityX,p.vz-p.supportVelocityZ)<1e-8);
});

test('two riders share sink epoch, lose dry support, delay occupied reset and reconcile the same lifecycle',()=>{
 const sim=createSimulation({seed:'sink-review'}),p=addPlayer(sim,'p'),friend=addPlayer(sim,'friend'),sink=getRoom(sim.seed,0).platforms.find(p=>p.kind==='sink');place(sim,p,sink);place(sim,friend,sink,.4,0);controllerTick(sim,[p,friend]);
 const first={...sim.platformStates[sink.id]};assert.equal(first.epoch,1);assert.equal(sim.platformEpoch,1);assert.equal(getPlatformPose(sim,sink).state,'warning');
 const predicted={...sim,players:{p:structuredClone(p),friend:structuredClone(friend)},platformStates:clonePlatformStates(sim.platformStates),events:null};const states=new Set();
 while(sim.time<7){controllerTick(sim,[p,friend]);controllerTick(predicted,Object.values(predicted.players));const pose=getPlatformPose(sim,sink),other=getPlatformPose(predicted,sink);states.add(pose.state);assert.equal(pose.state,other.state);assert.ok(Math.abs(pose.y-other.y)<1e-9);assert.equal(sim.platformStates[sink.id].triggeredAt,first.triggeredAt);}
 assert.ok(states.has('warning')&&states.has('sinking')&&states.has('sunken'));assert.ok(p.exposed&&friend.exposed);assert.equal(p.safe,false);assert.equal(sim.platformStates[sink.id].resetStartedAt,null);
 const start=getRoom(sim.seed,0).platforms.find(p=>p.checkpoint);for(const v of[p,friend])place(sim,v,start);let resetting=false;for(let i=0;i<60;i++){controllerTick(sim,[p,friend]);resetting||=getPlatformPose(sim,sink).state==='resetting';}
 assert.ok(resetting);assert.equal(getPlatformPose(sim,sink).state,'ready');assert.equal(sim.platformStates[sink.id],undefined);
});

test('a resting enlarged monster physically clears a collapsed sink before it can reset',()=>{
 const sim=createSimulation({seed:'reset-core-review'}),p=addPlayer(sim,'p'),sink=getRoom(sim.seed,1).platforms.find(p=>p.kind==='sink'),m=sim.monsters.find(m=>m.roomIndex===1&&m.typeId==='leech')||sim.monsters.find(m=>m.roomIndex===1);
 assert.ok(sink);sim.time=10;sim.platformStates[sink.id]={triggeredAt:0,resetAt:9,resetStartedAt:null,epoch:1};sim.platformEpoch=1;Object.assign(m,{x:sink.x,z:sink.z-1.25,state:'dormant',targetId:null,homeX:sink.x+8,homeZ:sink.z});coreClear(sim,m);const initial={x:m.x,z:m.z};
 stepSimulation(sim,{},dt);assert.equal(sim.platformStates[sink.id].resetStartedAt,null,'core blocks upward reset');assert.ok(m.clearPlatformId);
 let reset=false;for(let i=0;i<240;i++){const old={x:m.x,z:m.z};stepSimulation(sim,{},dt);assert.ok(Math.hypot(m.x-old.x,m.z-old.z)<=CONFIG.maxMonsterSpeed*dt+.001);const pose=getPlatformPose(sim,sink);if(pose.active)assert.ok(clearance(pose,m.x,m.z)>=MONSTER_PHYSICS[m.typeId].coreClearance-.015);if(pose.state==='ready'){reset=true;break;}}
 assert.ok(reset,'resting monster cannot permanently suppress reset');assert.ok(Math.hypot(m.x-initial.x,m.z-initial.z)>2);assert.ok(p.alive&&p.safe);
});

test('100 seeded residents cover separated friends and checkpoint rollback with stable room-slot identity',()=>{
 const sim=createSimulation({seed:'residency-review'}),a=addPlayer(sim,'a'),b=addPlayer(sim,'b');const original=new Map(sim.monsters.map(m=>[m.uid,{id:m.id,homeX:m.homeX,homeZ:m.homeZ}]));
 function residents(){const snap=serializeSimulation(sim);assert.equal(snap.monsters.length,100);assert.equal(new Set(snap.monsters.map(m=>m.uid)).size,100);assert.equal(snap.population.rooms.length,10);for(const room of snap.population.rooms){const group=snap.monsters.filter(m=>m.roomIndex===room);assert.equal(group.length,10);assert.deepEqual(group.map(m=>m.slot),[0,1,2,3,4,5,6,7,8,9]);for(const m of group){assert.equal(m.uid,`m:${room}:${m.slot}`);assert.ok(!('path' in m));}}}
 for(const [p,index]of[[a,20],[b,22]]){const deck=getRoom(sim.seed,index).platforms.find(p=>p.checkpoint);place(sim,p,deck);stepPlayer(p,{},dt,sim);}stepSimulation(sim,{},dt);residents();assert.ok(!sim.populationRooms.includes(0));
 const start=getRoom(sim.seed,0).platforms.find(p=>p.checkpoint);a.checkpoint={id:start.id,roomIndex:0,order:0,x:start.x,y:start.y,z:start.z,yaw:0};a.alive=false;a.respawnReadyAt=sim.time;const survivor={x:b.x,z:b.z,lifeId:b.lifeId};assert.ok(respawnPlayer(sim,a.id));residents();assert.ok(sim.populationRooms.includes(0)&&sim.populationRooms.includes(22));assert.deepEqual({x:b.x,z:b.z,lifeId:b.lifeId},survivor);
 for(const m of sim.monsters.filter(m=>m.roomIndex===0)){assert.deepEqual({id:m.id,homeX:m.homeX,homeZ:m.homeZ},original.get(m.uid));assert.ok(Math.abs(m.homeX)<getRoom(sim.seed,0).width/2);}
 assert.equal(a.lifeId,1);assert.ok(a.safe&&a.alive&&!a.exposed);assert.equal(a.supportId,start.id);assert.equal(sim.finished,false);
});

test('bounded four-player hunters use physical contact and attach life IDs to every targeted cue',()=>{
 const sim=createSimulation({seed:'v16-timing'});for(let i=0;i<4;i++){const p=addPlayer(sim,`p${i}`),pad=getRoom(sim.seed,[0,0,1,2][i]).platforms.find(v=>v.checkpoint);Object.assign(p,{x:pad.x+pad.w/2+CONFIG.playerRadius+.15,z:pad.z,y:0,safe:false,inWater:true,supportId:null});if(i===1)p.x=-p.x;}
 for(let i=0;i<240&&Object.values(sim.players).some(p=>p.alive);i++){stepSimulation(sim,{},dt);assert.equal(sim.monsters.length,100);assert.ok(sim.activeHunterCount<=4);assert.ok(sim.pathSearchesThisStep<=2);}
 assert.ok(Object.values(sim.players).every(p=>!p.alive));for(const event of sim.events.filter(e=>e.playerId)){assert.equal(event.lifeId,sim.players[event.playerId].lifeId);if(event.type==='death'){const m=sim.monsters.find(m=>m.uid===event.monsterUid);assert.ok(m);assert.ok(Math.hypot(m.x-event.x,m.z-event.z)<MONSTER_PHYSICS[m.typeId].attackReach+.3);}}
});

test('wet space beside the actual thin spinner is catchable and later rotation never clips stationary cores',()=>{
 const sim=createSimulation({seed:'v16-timing'}),p=addPlayer(sim,'p');let beam;for(let i=0;i<8&&!beam;i++)beam=getRoom(sim.seed,i).platforms.find(v=>v.kind==='spinner');const pose=getPlatformPose(sim,beam),wet=point(pose,0,1.45);Object.assign(p,{...wet,y:0,grounded:true,safe:false,exposed:false,inWater:true,supportId:null});
 for(let i=0;i<240&&p.alive;i++){stepSimulation(sim,{},dt);for(const m of sim.monsters)if(Math.hypot(m.x-beam.x,m.z-beam.z)<12)coreClear(sim,m);}
 assert.equal(p.alive,false);assert.ok(sim.time<3,'no permanently safe water pocket inside the swept footprint');
 for(let i=0;i<900;i++){stepSimulation(sim,{},dt);for(const m of sim.monsters)if(Math.hypot(m.x-beam.x,m.z-beam.z)<12)coreClear(sim,m);}
});

test('safe landing cancels damage immediately while the actual hunter completes its shore approach',()=>{
 const sim=createSimulation({seed:'shore-review',monsterId:'dredge'}),p=addPlayer(sim,'p'),deck=getRoom(sim.seed,0).platforms.find(v=>v.id===p.supportId);Object.assign(p,{x:deck.x+deck.w/2+CONFIG.playerRadius+.15,y:0,z:deck.z,grounded:true,safe:false,exposed:false,inWater:true,supportId:null});for(let i=0;i<18;i++)stepSimulation(sim,{},dt);const m=sim.monsters.find(m=>m.targetId===p.id);assert.ok(m);const before={x:m.x,z:m.z};place(sim,p,deck,deck.w/2-.4);stepSimulation(sim,{},dt);assert.equal(m.targetId,null);assert.equal(m.state,'shore');
 for(let i=0;i<240&&m.state!=='guard';i++){stepSimulation(sim,{},dt);assert.ok(p.alive&&p.safe);coreClear(sim,m);}assert.equal(m.state,'guard');assert.ok(clearance(deck,m.x,m.z)<=MONSTER_PHYSICS[m.typeId].coreClearance+.17);assert.ok(Math.hypot(m.x-before.x,m.z-before.z)>.25);assert.ok(p.alive&&p.safe);
});


test('higher normal jump has measured extra height and airtime while water jumping stays limited',t=>{
 const measurements=[];
 for(const hz of [30,60,120]) {
  const sim=createSimulation({seed:'jump-measure'}),p=addPlayer(sim,'p'),start=p.y,dt=1/hz;let peak=start,frames=0;
  do {advancePredictionWorld(sim,dt);stepPlayer(p,{jump:true},dt,sim);peak=Math.max(peak,p.y);frames++;assert.equal(p.exposed,false);assert.ok(p.y+CONFIG.playerHeight<getRoom(sim.seed,0).height);}while(!p.grounded&&frames<hz*2);
  const rise=peak-start;assert.ok(rise>=2.90&&rise<=3.06);assert.ok(Math.abs(frames*dt-1.08)<.02);assert.equal(p.supportId,'0:route:0');assert.ok(p.safe);for(let i=0;i<hz;i++){advancePredictionWorld(sim,dt);stepPlayer(p,{jump:true},dt,sim);}assert.equal(sim.events.filter(e=>e.type==='jump').length,1,'held key cannot add a second takeoff');measurements.push({hz,rise,airtime:frames*dt});
 }
 for(const index of [0,1,35,79]) {const room=getRoom('jump-measure',index);for(const p of room.platforms)assert.ok(p.y+CONFIG.jumpSpeed**2/(2*CONFIG.gravity)+CONFIG.playerHeight<room.height-.3,'authored ceiling clears the taller jump');}
 const sim=createSimulation({seed:'water-jump-limit'}),p=addPlayer(sim,'wet');Object.assign(p,{x:35,z:-12,y:0,grounded:true,safe:false,supportId:null});let peak=0;for(let frame=0;frame<90;frame++){advancePredictionWorld(sim,1/60);stepPlayer(p,{jump:true},1/60,sim);peak=Math.max(peak,p.y);assert.ok(p.exposed);assert.equal(p.safe,false);}assert.ok(peak<.45);assert.equal(sim.events.filter(e=>e.type==='jump').length,1);t.diagnostic(JSON.stringify(measurements));
});

test('fork and rejoin water openings remain catchable beside all three shared checkpoint choices',()=>{
 for(const [seed,point]of[['fork-water-a',{x:0,z:-5}],['fork-water-a',{x:0,z:-6}],['fork-water-a',{x:4,z:-7}],['fork-water-b',{x:-4,z:-7}],['fork-water-b',{x:0,z:-41}],['fork-water-b',{x:0,z:-42}]]){
  const sim=createSimulation({seed}),p=addPlayer(sim,'wet');for(const def of getRoom(seed,0).platforms)assert.ok(clearance(getPlatformPose(sim,def),point.x,point.z)>.30,'fixture must begin in real water');Object.assign(p,{...point,y:0,grounded:true,safe:false,exposed:false,supportId:null});
  for(let frame=0;frame<600&&p.alive;frame++){stepSimulation(sim,{},dt);const hunter=sim.monsters.find(m=>m.targetId===p.id);if(hunter)coreClear(sim,hunter);assert.ok(sim.pathSearchesThisStep<=2);}
  assert.equal(p.alive,false,`${seed} wet fork (${point.x},${point.z}) must have a physical approach`);const killer=sim.monsters.find(m=>m.uid===p.killerMonsterUid);assert.ok(killer);assert.ok(Math.hypot(p.x-killer.x,p.z-killer.z)<MONSTER_PHYSICS[killer.typeId].attackReach+.2);
 }
});
