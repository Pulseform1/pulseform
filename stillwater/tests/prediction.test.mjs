import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSimulation,addPlayer,getRoom,getPlatformPose,stepPlayer,advancePredictionWorld,serializeSimulation} from '../shared/simulation.js';
const source=readFileSync(new URL('../public/prediction.js',import.meta.url),'utf8').replace("'/shared/simulation.js'",JSON.stringify(new URL('../shared/simulation.js',import.meta.url).href));
const {makePredictionWorld,predictStep}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('real prediction helper advances moving-support time identically through replay and later ticks',()=>{
 const sim=createSimulation({seed:'prediction-support'}),p=addPlayer(sim,'me');let pad;
 for(let i=0;i<8&&!pad;i++)pad=getRoom(sim.seed,i,sim.difficulty).platforms.find(p=>p.kind==='spinner');assert.ok(pad,'authored spinner exists');
 const pose=getPlatformPose(sim,pad);Object.assign(p,{x:pose.x+.3,y:pose.y,z:pose.z,grounded:true,safe:true,exposed:false,inWater:false,supportId:pad.id,supportLocalX:.3,supportLocalZ:0,supportSampleTime:sim.time,vx:0,vz:0,vy:0});
 const snapshot=serializeSimulation(sim),predicted=structuredClone(snapshot.players.find(p=>p.id==='me')),world=makePredictionWorld(snapshot,predicted),reference=structuredClone(p);
 const referenceWorld={...sim,players:{me:reference},platformStates:{...sim.platformStates},events:null};
 for(let n=0;n<90;n++){const input={seq:n,forward:0,strafe:0,yaw:0,jump:false};predictStep(world,predicted,input,1/60);advancePredictionWorld(referenceWorld,1/60);stepPlayer(reference,input,1/60,referenceWorld);}
 assert.ok(Math.abs(world.time-(snapshot.time+1.5))<1e-9);assert.ok(Math.hypot(predicted.x-reference.x,predicted.z-reference.z)<1e-8);assert.equal(predicted.supportSampleTime,reference.supportSampleTime);assert.equal(snapshot.time,sim.time);
});
test('predicted sink touches cannot mutate authoritative snapshots or another player state',()=>{
 const sim=createSimulation(),p=addPlayer(sim,'me'),friend=addPlayer(sim,'friend'),sink=getRoom(sim.seed,0).platforms.find(p=>p.kind==='sink');assert.ok(sink);
 const snapshot=serializeSimulation(sim),predicted=structuredClone(p),world=makePredictionWorld(snapshot,predicted);
 Object.assign(predicted,{x:sink.x,y:sink.y,z:sink.z,supportId:null,vx:0,vy:0,vz:0});predictStep(world,predicted,{seq:1},1/60);
 assert.ok(world.platformStates[sink.id]);assert.ok(Number.isFinite(world.platformStates[sink.id].epoch));assert.equal(snapshot.platformStates[sink.id],undefined);assert.equal(snapshot.players.find(p=>p.id==='me').x,p.x);assert.equal(world.players.me,predicted);assert.equal(world.players.friend.id,friend.id);assert.notEqual(world.time,snapshot.time);
});
