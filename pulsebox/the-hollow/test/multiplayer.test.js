import {test} from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import WebSocket from 'ws';import {pathTo} from '../world.js';import {LEVELS,getHidingSpots} from '../levels.js';
test('four players synchronize a five-level campaign and reject a fifth connection',async()=>{
 const proc=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3099'},stdio:'pipe'}),clients=[];
 try{
  await new Promise((resolve,reject)=>{let attempts=0;const poll=async()=>{try{await fetch('http://127.0.0.1:3099/health');resolve()}catch{if(attempts++>70)return reject(Error('startup timeout'));setTimeout(poll,50)}};poll()});
  async function connect(code){const ws=new WebSocket('ws://127.0.0.1:3099');clients.push(ws);const inbox=[];ws.on('message',r=>inbox.push(JSON.parse(r)));await new Promise(r=>ws.on('open',r));ws.send(JSON.stringify({type:'join',code}));async function wait(type){for(let n=0;n<150;n++){const i=inbox.findIndex(m=>m.type===type);if(i>=0)return inbox.splice(i,1)[0];await new Promise(r=>setTimeout(r,10))}throw Error('missing '+type)}return {ws,wait,pos:{x:2,z:1}}}
  const a=await connect(''),joined=await a.wait('joined'),players=[a];
  for(let n=0;n<3;n++){const p=await connect(joined.code);await p.wait('joined');players.push(p)}
  const fifth=await connect(joined.code);assert.match((await fifth.wait('error')).message,/four survivors/);
  for(const p of players)p.ws.send(JSON.stringify({type:'active',active:true}));
  function move(target,l,who=a){for(let n=0;n<400&&(who.pos.x!==target.x||who.pos.z!==target.z);n++){const [x,z]=pathTo(who.pos,target,l.map);who.pos={x,z};who.ws.send(JSON.stringify({type:'move',x,z,noise:0,light:false}))}assert.deepEqual(who.pos,{x:target.x,z:target.z})}
  const locker=getHidingSpots(LEVELS[0])[0];move(locker,LEVELS[0]);a.ws.send(JSON.stringify({type:'hide'}));assert.equal((await a.wait('hidden')).spot,locker.id);
  move(locker,LEVELS[0],players[1]);players[1].ws.send(JSON.stringify({type:'hide'}));assert.match((await players[1].wait('notice')).message,/occupied/);
  a.ws.send(JSON.stringify({type:'hide'}));assert.equal((await a.wait('hidden')).spot,null);
  for(let i=0;i<5;i++){
    const l=LEVELS[i];
    for(let j=0;j<4;j++){move(l.objectives[j],l);a.ws.send(JSON.stringify({type:'interact',answer:l.answer}));if(j<3){for(const p of players)assert.equal((await p.wait('event')).stage,j+1)}}
    if(i<4){for(const p of players){const m=await p.wait('level');assert.equal(m.level,i+1);p.pos={...LEVELS[i+1].spawn}}}
  }
  for(const p of players)await p.wait('win');
 }finally{clients.forEach(c=>c.close());proc.kill()}
});
