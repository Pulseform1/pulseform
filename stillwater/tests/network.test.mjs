import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createGameServer } from '../server.mjs';
import { InputSequence, socketURL, wrapYaw } from '../public/transport.js';
import { WORLD_VERSION, MONSTER_PHYSICS, MONSTERS } from '../shared/simulation.js';

async function connect(port) {
  const ws=new WebSocket(socketURL({protocol:'http:',host:`127.0.0.1:${port}`})),messages=[];
  ws.on('message',bytes=>messages.push(JSON.parse(bytes.toString())));
  await once(ws,'open');
  return {ws,messages,mark:()=>messages.length,send:msg=>{if(msg.type==='input'&&!('lifeId'in msg)){const id=messages.find(m=>m.type==='welcome')?.id,snapshot=[...messages].reverse().find(m=>m.type==='state'||m.type==='start');msg={...msg,lifeId:(snapshot?.state||snapshot)?.players?.find(p=>p.id===id)?.lifeId};}ws.send(JSON.stringify(['create','join'].includes(msg.type)?{...msg,worldVersion:WORLD_VERSION}:msg));},
    wait(predicate,after=0,timeout=2500){
      return new Promise((resolve,reject)=>{
        const inspect=()=>{const result=messages.slice(after).find(predicate);if(result){clearTimeout(timer);ws.off('message',inspect);resolve(result);}};
        const timer=setTimeout(()=>{ws.off('message',inspect);reject(new Error(`Network message timed out. Recent messages: ${JSON.stringify(messages.slice(-3))}`));},timeout);
        ws.on('message',inspect);inspect();
      });
    }
  };
}
async function withServer(t,options={}) {
  const app=createGameServer(options),address=await app.start(0);
  t.after(()=>app.close());return {app,port:address.port};
}
async function party(port){
  const a=await connect(port),b=await connect(port);
  a.send({type:'create',name:'Host',mode:'party',difficulty:'normal'});
  const wa=await a.wait(m=>m.type==='welcome');
  b.send({type:'join',code:wa.code,name:'Friend'});
  const wb=await b.wait(m=>m.type==='welcome');
  const la=await a.wait(m=>m.type==='lobby' && m.room.players.length===2);
  const lb=await b.wait(m=>m.type==='lobby' && m.room.players.length===2);
  return {a,b,wa,wb,room:la.room,other:lb.room};
}

test('two real clients synchronize cards, vote, authoritative inputs, restart, and distinct next hand',async t=>{
  const {app,port}=await withServer(t);
  const {a,b,wa,wb,room,other}=await party(port);
  assert.equal(room.cards.length,3);assert.equal(new Set(room.cards).size,3);
  assert.deepEqual(room.cards,other.cards);assert.equal(room.seed,other.seed);
  const errorMark=a.mark();a.send({type:'begin'});
  await a.wait(m=>m.type==='error' && /ready/.test(m.message),errorMark);
  b.send({type:'ready',ready:true});
  await a.wait(m=>m.type==='lobby' && m.room.players.length===2 && m.room.players.every(p=>p.ready));
  a.send({type:'begin'});await b.wait(m=>m.type==='lobby' && m.room.phase==='voting');
  const startA=a.mark(),startB=b.mark();
  a.send({type:'vote',monsterId:room.cards[0]});b.send({type:'vote',monsterId:room.cards[1]});
  const sa=await a.wait(m=>m.type==='start',startA),sb=await b.wait(m=>m.type==='start',startB);
  assert.equal(sa.monsterId,room.cards[0],'host wins a tied vote');
  assert.equal(sa.monsterId,sb.monsterId);assert.equal(sa.seed,sb.seed);
  assert.equal(sa.state.worldVersion,WORLD_VERSION);assert.equal(sb.state.worldVersion,WORLD_VERSION);assert.equal(sa.state.monster.radius,MONSTER_PHYSICS[sa.monsterId].radius);
  assert.deepEqual(sa.state.players.map(p=>p.id).sort(),[wa.id,wb.id].sort());
  const before=sa.state.players.find(p=>p.id===wa.id);
  const stateMark=b.mark();
  a.send({type:'input',seq:1,forward:1,strafe:0,yaw:0,pitch:0,jump:false,sprint:false,x:999999,y:999999,z:999999});
  const authoritative=await b.wait(m=>m.type==='state' && m.players.find(p=>p.id===wa.id)?.ackSeq===1,stateMark);
  const moved=authoritative.players.find(p=>p.id===wa.id);
  assert.ok(Math.abs(moved.x-before.x)<5 && Math.abs(moved.z-before.z)<5,'client supplied positions are ignored');
  assert.ok(Number.isFinite(moved.x) && Number.isFinite(moved.y));
  const turnMark=a.mark(),manyTurns=Math.PI*40000+.72;
  a.send({type:'input',seq:2,forward:0,strafe:0,yaw:manyTurns,pitch:0,jump:false,sprint:false});
  const turned=await b.wait(m=>m.type==='state'&&m.players.find(p=>p.id===wa.id)?.ackSeq===2,turnMark);
  assert.ok(Math.abs(turned.players.find(p=>p.id===wa.id).yaw-wrapYaw(manyTurns))<1e-8,'continuous turns preserve heading past former clamp');
  const roundMark=a.mark();a.send({type:'restart'});
  const pending=await a.wait(m=>m.type==='lobby' && m.room.restartVotes.length===1,roundMark);
  assert.equal(pending.room.phase,'playing','one vote does not interrupt friend');
  b.send({type:'restart'});
  const next=await a.wait(m=>m.type==='lobby' && m.room.phase==='lobby',roundMark);
  assert.equal(new Set([...room.cards,...next.room.cards]).size,6);
  assert.deepEqual(next.room.faced,[sa.monsterId]);
  assert.equal(app.rooms.get(wa.code).sim,null);
});

test('late joins spectate, reconnect preserves death, and disconnect transfers host',async t=>{
  const {app,port}=await withServer(t);
  const {a,b,wa,wb,room}=await party(port);
  b.send({type:'ready',ready:true});await a.wait(m=>m.type==='lobby' && m.room.players.length===2 && m.room.players.every(p=>p.ready));
  a.send({type:'begin'});await b.wait(m=>m.type==='lobby' && m.room.phase==='voting');
  a.send({type:'vote',monsterId:room.cards[0]});b.send({type:'vote',monsterId:room.cards[0]});
  await a.wait(m=>m.type==='start');
  const c=await connect(port);c.send({type:'join',code:wa.code,name:'Late friend'});
  const wc=await c.wait(m=>m.type==='welcome'),sc=await c.wait(m=>m.type==='start');
  assert.equal(sc.state.players.find(p=>p.id===wc.id).alive,false);
  assert.equal(sc.state.players.find(p=>p.id===wc.id).spectator,true);
  app.rooms.get(wa.code).sim.players[wb.id].alive=false;
  b.ws.close();await once(b.ws,'close');
  const reconnect=await connect(port);reconnect.send({type:'join',code:wa.code,token:wb.token,name:'Attempted resurrection'});
  const wr=await reconnect.wait(m=>m.type==='welcome'),sr=await reconnect.wait(m=>m.type==='start');
  assert.equal(wr.id,wb.id);assert.equal(sr.state.players.find(p=>p.id===wb.id).alive,false);
  const mark=c.mark();a.ws.close();await once(a.ws,'close');
  const transfer=await c.wait(m=>m.type==='lobby' && m.room.hostId!==wa.id,mark);
  assert.ok([wb.id,wc.id].includes(transfer.room.hostId));
});

test('solo selection requires confirmation and rejects invalid actions and static traversal',async t=>{
  const {app,port}=await withServer(t),a=await connect(port);
  a.send({type:'join',code:'ABCDEF',name:'Test'});await a.wait(m=>m.type==='error' && /not found/.test(m.message));
  a.send({type:'create',name:'Solo',mode:'solo',difficulty:'chill'});
  const l=await a.wait(m=>m.type==='lobby');assert.equal(l.room.phase,'voting');
  a.send({type:'start'});await a.wait(m=>m.type==='error' && /Select a creature/.test(m.message));
  a.send({type:'vote',monsterId:'not-real'});await a.wait(m=>m.type==='error' && /three current/.test(m.message));
  a.send({type:'vote',monsterId:l.room.cards[1]});await a.wait(m=>m.type==='lobby' && Object.values(m.room.votes).includes(l.room.cards[1]));
  assert.ok(!a.messages.some(m=>m.type==='start'));
  a.send({type:'start'});const started=await a.wait(m=>m.type==='start');assert.equal(started.monsterId,l.room.cards[1]);
  const pauseMark=a.mark();a.send({type:'pause',paused:true});
  const paused=await a.wait(m=>m.type==='state' && m.paused===true,pauseMark);
  await new Promise(resolve=>setTimeout(resolve,80));
  assert.equal(app.rooms.get(l.room.code).sim.time,paused.time,'solo pause freezes authoritative time');
  const resumeMark=a.mark();a.send({type:'pause',paused:false});
  await a.wait(m=>m.type==='state' && m.time>paused.time,resumeMark);
  assert.equal((await fetch(`http://127.0.0.1:${port}/health`)).status,200);
  const blocked=await fetch(`http://127.0.0.1:${port}/shared/%2e%2e%2fpackage.json`);
  assert.ok([403,404].includes(blocked.status));
  assert.equal((await fetch(`http://127.0.0.1:${port}/server.mjs`)).status,404);
});

test('voting timeout starts a shared run with a valid creature',async t=>{
  const {port}=await withServer(t,{voteDuration:100});const {a,b,room}=await party(port);
  b.send({type:'ready',ready:true});await a.wait(m=>m.type==='lobby' && m.room.players.length===2 && m.room.players.every(p=>p.ready));
  a.send({type:'begin'});const start=await a.wait(m=>m.type==='start');
  assert.ok(room.cards.includes(start.monsterId));
  const other=await b.wait(m=>m.type==='start');assert.equal(start.monsterId,other.monsterId);
});

test('browser transport keeps input accepted after restarting on the same socket',async t=>{
  const {port}=await withServer(t),a=await connect(port),sequence=new InputSequence();
  a.send({type:'create',name:'Retry tester',mode:'solo'});
  const welcome=await a.wait(m=>m.type==='welcome');let lobby=await a.wait(m=>m.type==='lobby');
  for(let round=0;round<2;round++){
    const startMark=a.mark();a.send({type:'vote',monsterId:lobby.room.cards[0]});a.send({type:'start'});
    const start=await a.wait(m=>m.type==='start',startMark),before=start.state.players.find(p=>p.id===welcome.id);
    for(let i=0;i<100;i++)sequence.next();const seq=sequence.next(),mark=a.mark();
    a.send({type:'input',seq,forward:1,strafe:0,yaw:0,pitch:0,jump:false,sprint:false});
    const state=await a.wait(m=>m.type==='state'&&m.players.find(p=>p.id===welcome.id)?.ackSeq===seq,mark);
    assert.ok(state.players.find(p=>p.id===welcome.id).z<before.z,'forward input moves immediately in each run');
    const restartMark=a.mark();a.send({type:'restart'});lobby=await a.wait(m=>m.type==='lobby'&&m.room.phase==='voting',restartMark);
  }
});


test('twenty-one creatures rotate in seven unique three-card hands and selected new forms are authoritative',async t=>{
  const {app,port}=await withServer(t),a=await connect(port);a.send({type:'create',name:'Roster tester',mode:'solo'});
  const welcome=await a.wait(m=>m.type==='welcome');let lobby=await a.wait(m=>m.type==='lobby');const faced=new Set(),newIds=new Set(MONSTERS.slice(11).map(m=>m.id));let newSelections=0;
  for(let cycle=0;cycle<2;cycle++){
    const offered=new Set();
    for(let round=0;round<7;round++){
      assert.equal(lobby.room.cards.length,3);assert.equal(new Set(lobby.room.cards).size,3);
      for(const id of lobby.room.cards){assert.ok(!offered.has(id),'a bag never repeats a creature before all 21 are offered');offered.add(id);}
      const pick=lobby.room.cards.find(id=>newIds.has(id))||lobby.room.cards[round%3],mark=a.mark();
      a.send({type:'vote',monsterId:pick});a.send({type:'start'});const started=await a.wait(m=>m.type==='start',mark);
      assert.equal(started.monsterId,pick);assert.equal(started.state.monsterId,pick);assert.equal(started.state.monster.id,pick);assert.equal(started.state.monster.radius,MONSTER_PHYSICS[pick].radius);assert.equal(started.state.worldVersion,WORLD_VERSION);
      if(newIds.has(pick))newSelections++;faced.add(pick);
      const restart=a.mark();a.send({type:'restart'});lobby=await a.wait(m=>m.type==='lobby'&&m.room.phase==='voting',restart);
    }
    assert.deepEqual([...offered].sort(),MONSTERS.map(m=>m.id).sort());
  }
  assert.ok(newSelections>=8,'each complete bag must select several of the ten new creatures');
  const authoritative=app.rooms.get(welcome.code);assert.deepEqual([...authoritative.faced].sort(),[...faced].sort());assert.equal(authoritative.offered.size,21);assert.ok(faced.size<21,'offered and actually encountered remain different records');
});


test('a stale loaded client must refresh instead of joining a mismatched course',async t=>{
  const {port}=await withServer(t),a=await connect(port);
  a.ws.send(JSON.stringify({type:'create',mode:'solo',name:'Old page'}));await a.wait(m=>m.type==='error'&&/Refresh/.test(m.message));assert.ok(!a.messages.some(m=>m.type==='welcome'));
  const mark=a.mark();a.send({type:'create',mode:'solo',name:'Fresh page'});const welcome=await a.wait(m=>m.type==='welcome',mark);assert.ok(welcome.id);
});
