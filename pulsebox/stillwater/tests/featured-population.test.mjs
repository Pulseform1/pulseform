import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation,addPlayer,stepSimulation,primaryMonsterForPlayer,MONSTERS,getRoom,CONFIG} from '../shared/simulation.js';
test('every voted archetype is the first local hunter beside the starting checkpoint',()=>{
 for(const chosen of MONSTERS){const sim=createSimulation({seed:'featured-entrance',monsterId:chosen.id}),p=addPlayer(sim,'me'),start=getRoom(sim.seed,0).platforms.find(v=>v.id===p.supportId);
 Object.assign(p,{x:start.x+start.w/2+CONFIG.playerRadius+.12,y:0,z:start.z,grounded:true,safe:false,inWater:true,exposed:false,supportId:null});stepSimulation(sim,{},1/60);
 const hunter=primaryMonsterForPlayer(sim,p);assert.equal(hunter.typeId,chosen.id,chosen.id+' selected opening hunter');assert.equal(hunter.targetId,p.id);assert.equal(sim.monsters.length,100);
 }
});
