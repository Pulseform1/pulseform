import test from 'node:test';
import assert from 'node:assert/strict';
import {CreatureWake} from '../public/creature-wake.js';
const dt=1/60;
function monster(state='pursue'){return {x:0,z:0,state,targetId:'me',radius:2,speed:99};}
function advance(w,m,time,speed=4,dx=0,dz=-1){m.x+=dx*speed*dt;m.z+=dz*speed*dt;return w.update(dt,m,time,96);}

test('patrol water stays nearly still and an unchanging speed field cannot fabricate a chase plume',()=>{
  const w=new CreatureWake(),m=monster('patrol');let rings=0;
  for(let i=0;i<240;i++){advance(w,m,i*dt,2);rings+=w.ripple?1:0;assert.equal(w.active,0);}
  assert.ok(rings<=2,'sparse faint patrol rings');m.state='pursue';
  for(let i=240;i<360;i++){w.update(dt,m,i*dt,96);assert.equal(w.active,0);assert.notEqual(w.ripple,2);}
});

test('actual pursuit throws water upward and behind, while world-space droplets preserve a turning trail',()=>{
  const w=new CreatureWake(),m=monster();let top=0,peak=0,chaseRings=0;
  for(let i=0;i<45;i++){advance(w,m,i*dt);peak=Math.max(peak,w.active);chaseRings+=w.ripple===2?1:0;for(let j=0;j<w.capacity;j++)if(w.life[j]>0)top=Math.max(top,w.positions[j*3+1]);}
  assert.ok(top>2.0,'plume rises visibly above1.28m water');assert.ok(peak>20);assert.ok(chaseRings>=3);
  const old=[];for(let i=0;i<w.capacity;i++)if(w.life[i]>.18)old.push([i,w.velocities[i*3],w.velocities[i*3+2]]);
  for(let i=45;i<49;i++)advance(w,m,i*dt,4,1,0);
  assert.ok(old.some(([i,vx,vz])=>w.life[i]>0&&w.velocities[i*3]===vx&&w.velocities[i*3+2]===vz),'earlier droplets retain their original world direction');
  assert.ok([...w.life].some((life,i)=>life>0&&w.velocities[i*3]<-1),'new spray trails opposite the new turn');
});

test('safety cancellation and stale snapshots cease emission and release every live droplet promptly',()=>{
  for(const stale of [false,true]){const w=new CreatureWake(),m=monster();for(let i=0;i<40;i++)advance(w,m,i*dt);assert.ok(w.active>0);m.state=stale?'pursue':'patrol';m.targetId=stale?'me':null;
    for(let i=40;i<130;i++)w.update(dt,m,stale?39*dt:i*dt,96);assert.equal(w.active,0);assert.equal(w.accumulator,0);
  }
});

test('particle and ring requests remain bounded across quality, long chases, idle, reset and teleport',()=>{
  const w=new CreatureWake(),m=monster(),arrays=[w.positions,w.velocities,w.life,w.duration,w.sizes,w.opacity];
  for(let i=0;i<1200;i++){advance(w,m,i*dt,12);assert.ok(w.active<=96);assert.ok([...w.positions].every(Number.isFinite));}
  for(let i=1200;i<1300;i++){m.z-=12*dt;w.update(dt,m,i*dt,192);assert.ok(w.active<=192);}
  w.update(dt,m,1300*dt,96);for(let i=96;i<192;i++)assert.equal(w.life[i],0);
  m.x+=100;w.update(dt,m,1301*dt,96);assert.equal(w.active,0);
  w.reset();assert.equal(w.active,0);assert.equal(w.ripple,0);assert.deepEqual([w.positions,w.velocities,w.life,w.duration,w.sizes,w.opacity],arrays);
});

test('a legal 44m/s rush and nonlethal shore approach remain visible rather than treated as teleports',()=>{
 const w=new CreatureWake(),m={x:0,z:0,yaw:0,radius:2.5,targetId:'me',state:'pursue'};w.update(.05,m,0);m.z=-2.2;w.update(.05,m,.05);assert.ok(w.active>0);assert.ok(w.speed>43);
 m.state='shore';m.targetId=null;m.shorePlayerId='me';m.z=-4.4;w.update(.05,m,.1);assert.ok(w.active>0);assert.equal(w.wasIntense,true);
});
