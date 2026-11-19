import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {createGameServer} from '../server.mjs';
import {WORLD_VERSION} from '../shared/simulation.js';
async function peer(port){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`),messages=[];ws.on('message',b=>messages.push(JSON.parse(b)));await once(ws,'open');return {ws,messages,send:o=>ws.send(JSON.stringify(o)),wait(predicate,start=0){return new Promise((resolve,reject)=>{const check=()=>{const m=messages.slice(start).find(predicate);if(m){clearTimeout(timer);ws.off('message',check);resolve(m);}};const timer=setTimeout(()=>{ws.off('message',check);reject(Error('Checkpoint network response timed out'));},5000);ws.on('message',check);check();});}};}
test('real party checkpoint respawn preserves survivors, ignores stale lives, and resumes all-dead room',async t=>{
 const game=createGameServer();const address=await game.start(0);t.after(()=>game.close());const a=await peer(address.port),b=await peer(address.port);
 a.send({type:'create',worldVersion:WORLD_VERSION,name:'A',mode:'party',difficulty:'normal'});const wa=await a.wait(m=>m.type==='welcome');
 b.send({type:'join',worldVersion:WORLD_VERSION,name:'B',code:wa.code});const wb=await b.wait(m=>m.type==='welcome');b.send({type:'ready',ready:true});await a.wait(m=>m.type==='lobby'&&m.room.players.length===2&&m.room.players.every(p=>p.ready));a.send({type:'begin'});const vote=await a.wait(m=>m.type==='lobby'&&m.room.phase==='voting');a.send({type:'vote',monsterId:vote.room.cards[0]});b.send({type:'vote',monsterId:vote.room.cards[0]});const start=await a.wait(m=>m.type==='start');
 assert.equal(start.state.monsters.length,100);assert.equal(new Set(start.state.monsters.map(m=>m.uid)).size,100);assert.equal(start.state.worldVersion,WORLD_VERSION);
 const room=game.rooms.get(wa.code),p=room.sim.players[wa.id],friend=room.sim.players[wb.id],oldLife=p.lifeId,friendLife=friend.lifeId,friendZ=friend.z;
 // Arrange a confirmed death; test the actual socket authorization and simulation respawn path.
 Object.assign(p,{alive:false,safe:false,exposed:true,respawnReadyAt:room.sim.time});const mark=a.messages.length;
 a.send({type:'respawn',lifeId:oldLife});const respawn=await a.wait(m=>m.type==='state'&&m.players.find(p=>p.id===wa.id)?.lifeId>oldLife,mark),newLife=respawn.players.find(p=>p.id===wa.id).lifeId;
 assert.equal(p.alive,true);assert.equal(p.safe,true);assert.equal(friend.alive,true);assert.equal(friend.lifeId,friendLife);assert.equal(friend.z,friendZ);assert.equal(room.phase,'playing');
 a.send({type:'input',seq:99,lifeId:oldLife,forward:1,yaw:0});await new Promise(r=>setTimeout(r,80));assert.notEqual(p.ackSeq,99);
 a.send({type:'input',seq:100,lifeId:newLife,forward:0,yaw:0});await a.wait(m=>m.type==='state'&&m.players.find(p=>p.id===wa.id)?.ackSeq===100,mark);
 Object.assign(p,{alive:false,respawnReadyAt:room.sim.time});Object.assign(friend,{alive:false,respawnReadyAt:room.sim.time});await new Promise(r=>setTimeout(r,60));assert.equal(room.phase,'playing');
 const mark2=a.messages.length;a.send({type:'respawn',lifeId:newLife});await a.wait(m=>m.type==='state'&&m.players.find(p=>p.id===wa.id)?.alive,mark2);assert.equal(friend.alive,false);assert.equal(room.phase,'playing');
 const c=await peer(address.port);c.send({type:'join',worldVersion:WORLD_VERSION,name:'Late',code:wa.code});const wc=await c.wait(m=>m.type==='welcome'),sc=await c.wait(m=>m.type==='start');const late=sc.state.players.find(p=>p.id===wc.id);assert.equal(late.alive,false);assert.ok(Number.isFinite(late.respawnReadyAt));c.send({type:'respawn',lifeId:late.lifeId});await c.wait(m=>m.type==='state'&&m.players.find(p=>p.id===wc.id)?.alive);c.ws.close();
 a.ws.close();b.ws.close();await new Promise(r=>setTimeout(r,80));const reconnect=await peer(address.port);reconnect.send({type:'join',worldVersion:WORLD_VERSION,name:'A',code:wa.code,token:wa.token});await reconnect.wait(m=>m.type==='welcome');const rs=await reconnect.wait(m=>m.type==='start');assert.equal(rs.state.finished,false);assert.equal(room.phase,'playing');const returning=rs.state.players.find(p=>p.id===wa.id);reconnect.send({type:'respawn',lifeId:returning.lifeId});await reconnect.wait(m=>m.type==='state'&&m.players.find(p=>p.id===wa.id)?.alive);reconnect.ws.close();
});
