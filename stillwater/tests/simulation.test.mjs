import test from 'node:test';
import assert from 'node:assert/strict';
import * as mechanics from '../shared/simulation.js';
const s=mechanics;
const roomLookup=room=>new Map([...room.platforms,...Object.values(room.routeEndpoints||{})].map(p=>[p.id,p]));
import { CONFIG, MONSTERS, MONSTER_PHYSICS, WORLD_VERSION, DIFFICULTIES, getRoom, validateRoom, validateOrRepairRoom, jumpReachable, jumpGap, createSimulation, addPlayer, stepPlayer, stepSimulation, serializeSimulation, worldStats } from '../shared/simulation.js';

const tick = (sim, n = 1, inputs = {}) => { for (let i=0;i<n;i++) stepSimulation(sim,inputs,1/60); };
function waterPlayer(sim,id='a',x=4,z=-3) {const p=addPlayer(sim,id,id);Object.assign(p,{x,z,y:0,safe:false,grounded:true,exposed:false});tick(sim);return p;}

// Use real inputs: accelerate along the takeoff deck, jump before its edge,
// and release forward to brake over the landing. Long marked gaps need sprint.
function posePlace(sim,p,def){const q=s.getPlatformPose(sim,def);Object.assign(p,{x:q.x,y:q.y,z:q.z,vx:0,vy:0,vz:0,safe:true,grounded:true,inWater:false,exposed:false,exposureSince:-1,jumpHeld:false,jumpBuffer:0,mantle:null,coyote:s.CONFIG.coyoteTime,supportId:q.id,supportLocalX:0,supportLocalZ:0,supportSampleTime:sim.time,supportVelocityX:0,supportVelocityZ:0,time:sim.time});}
function playerTick(sim,p,input){s.advancePredictionWorld(sim,1/60);s.stepPlayer(p,input,1/60,sim);}
function traverseLink(sim,p,from,to){sim.platformStates={};posePlace(sim,p,from);for(let frame=0;frame<180;frame++){const q=s.getPlatformPose(sim,from),dx=to.x-p.x,dz=to.z-p.z,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,c=Math.cos(q.yaw),sn=Math.sin(q.yaw),lx=c*(p.x-q.x)-sn*(p.z-q.z),lz=sn*(p.x-q.x)+c*(p.z-q.z),ldx=c*ux-sn*uz,ldz=sn*ux+c*uz;const tx=Math.abs(ldx)>.001?((ldx>0?q.w/2:-q.w/2)-lx)/ldx:Infinity,tz=Math.abs(ldz)>.001?((ldz>0?q.d/2:-q.d/2)-lz)/ldz:Infinity;if(Math.min(tx,tz)<s.CONFIG.playerRadius+.18||!p.grounded)break;playerTick(sim,p,{forward:1,sprint:true,yaw:Math.atan2(-dx,-dz)});}
for(let frame=0;frame<150;frame++){const distance=Math.hypot(to.x-p.x,to.z-p.z),speed=Math.hypot(p.vx,p.vz);playerTick(sim,p,{forward:distance>speed/10+.13?1:0,sprint:true,jump:frame===0,yaw:Math.atan2(-(to.x-p.x),-(to.z-p.z))});if(frame>3&&p.grounded)break;}return p;}
test('all seed/difficulty room paths and adjacent portals remain reachable', () => {
  for(const difficulty of Object.keys(DIFFICULTIES)) for(let seed=0;seed<10;seed++) {
    let previous=null;
    for(let index=0;index<80;index++) {
      const room=getRoom(`test-${seed}`,index,difficulty);
      assert.ok(validateRoom(room),`${difficulty} ${seed} ${index}`);
      const path=room.platforms.filter(p=>p.route);
      if(previous) assert.ok(jumpReachable(previous,path[0]),'cross-room jump');
      for(const p of path) {assert.ok(p.y>=CONFIG.waterY+.25); assert.ok(p.w>=1.75);}
      assert.equal(room.platforms.filter(p=>p.kind==='escape').length,14);
      previous=path.at(-1);
    }
  }
});
test('room generation is seeded, changes layouts, and bounds its cache', () => {
  const a=JSON.stringify(getRoom('repeatable',13,'normal'));
  for(let i=0;i<300;i++) getRoom('streaming',i,'normal');
  assert.equal(JSON.stringify(getRoom('repeatable',13,'normal')),a);
  assert.notEqual(JSON.stringify(getRoom('different',13,'normal')),a);
  assert.ok(worldStats().cachedRooms<=CONFIG.roomCacheLimit);
  assert.equal(new Set(Array.from({length:20},(_,i)=>getRoom('variety',i).family)).size,9);
});
test('actual controller traverses main-route links and long connectors with real runup inputs', () => {
  for(const difficulty of Object.keys(DIFFICULTIES)) for(const seed of ['route-a','route-b']) for(const index of [0,1,2,3,4,5,6,7,8,35,79]) {
    const sim=createSimulation({seed,difficulty});const p=addPlayer(sim,'runner','Runner');
    const path=getRoom(seed,index,difficulty).platforms.filter(p=>p.route);
    path.push(getRoom(seed,index+1,difficulty).platforms.find(p=>p.route));
    for(let j=0;j<path.length-1;j++) {
      const from=path[j],to=path[j+1];
      traverseLink(sim,p,from,to);
      assert.equal(p.supportId,to.id,`${difficulty} ${seed} room ${index} from ${from.id}: ended ${p.x},${p.y},${p.z}`);
      assert.equal(p.exposed,false);
    }
  }
});
test('every checkpoint section has three independent playable paths with common fork and rejoin decks', () => {
 for(const difficulty of Object.keys(DIFFICULTIES))for(const seed of ['branch-a','branch-b','branch-c'])for(let index=0;index<20;index++) {
  const room=getRoom(seed,index,difficulty),lookup=roomLookup(room);assert.equal(room.fallback,undefined);assert.equal(room.routeSections.length,2);assert.equal(room.paths.length,6);assert.equal(room.platforms.filter(p=>p.checkpoint).length,2);
  for(const section of room.routeSections){const paths=room.paths.filter(p=>p.sectionId===section.id),internal=new Set();assert.deepEqual(paths.map(p=>p.routeId),['steady','timed','leap']);assert.equal(lookup.get(section.fromId).routeChoices.length,3);
   for(const path of paths){assert.equal(path.nodes[0],section.fromId);assert.equal(path.nodes.at(-1),section.toId);assert.ok(path.nodes.length>=4);const nodes=path.nodes.map(id=>lookup.get(id));
    for(const p of nodes.slice(1,-1)){assert.ok(!internal.has(p.id));internal.add(p.id);assert.ok(!p.checkpoint);assert.equal(p.routeId,path.routeId);assert.equal(p.routeColor,path.color);assert.equal(p.branch,true===path.optional?true:undefined);assert.equal(p.checkpointEndId,section.toId);
     for(const other of room.platforms)if(other.id!==p.id&&!p.motion&&!other.motion)assert.ok(Math.abs(p.x-other.x)>=(p.w+other.w)/2+.035 || Math.abs(p.z-other.z)>=(p.d+other.d)/2+.035,`${p.id} overlaps ${other.id}`);
    }
    for(let i=1;i<nodes.length;i++){const a=nodes[i-1],b=nodes[i];assert.ok(jumpReachable(a,b));assert.ok(Math.max(a.y,b.y)+CONFIG.jumpSpeed**2/(2*CONFIG.gravity)+CONFIG.playerHeight+.035<=room.height);for(let sample=0;sample<=30;sample++){const x=a.x+(b.x-a.x)*sample/30,z=a.z+(b.z-a.z)*sample/30;for(const o of room.obstacles){const ox=Math.max(o.x-o.w/2,Math.min(o.x+o.w/2,x)),oz=Math.max(o.z-o.d/2,Math.min(o.z+o.d/2,z));assert.ok(Math.hypot(x-ox,z-oz)>=CONFIG.playerRadius+.1);}}}
   }
  }
  assert.equal(room.routeSections[0].toId,room.routeSections[1].fromId);const end=lookup.get(room.routeSections[1].toId);assert.ok(!room.platforms.some(p=>p.id===end.id));assert.deepEqual([end.x,end.y,end.z],(()=>{const p=getRoom(seed,index+1,difficulty).platforms.find(p=>p.id===end.id);return[p.x,p.y,p.z];})());
 }
});
test('actual controller traverses optional links across seeds, difficulties, and late rooms', t => {
  let links=0,branches=0;
  for(const difficulty of Object.keys(DIFFICULTIES))for(const seed of ['branch-a','branch-b','branch-c'])for(const index of [1,2,3,4,5,6,7,8,9,35,79,1000]) {
    const sim=createSimulation({seed,difficulty}),p=addPlayer(sim,'runner','Runner'),room=getRoom(seed,index,difficulty);
    for(const path of room.paths.filter(path=>path.optional)) {
      branches++;
      for(let j=1;j<path.nodes.length;j++) {
        const from=roomLookup(room).get(path.nodes[j-1]),to=roomLookup(room).get(path.nodes[j]);
        traverseLink(sim,p,from,to);
        assert.equal(p.supportId,to.id,`${seed} ${difficulty} ${room.layout}: ${from.id} -> ${to.id}`);
        assert.equal(p.exposed,false);links++;
      }
    }
  }
  assert.ok(links>120);assert.ok(branches>40);t.diagnostic(`${links} controller jumps across ${branches} optional branches`);
});
test('three route rhythms occupy distinct broad regions while architectural families vary', () => {
 const layouts=new Set();let sideways=0;
 for(let index=1;index<33;index++){const room=getRoom('turn-review',index),lookup=roomLookup(room);layouts.add(room.layout);
  for(const section of room.routeSections){const paths=room.paths.filter(p=>p.sectionId===section.id),steady=paths.find(p=>p.routeId==='steady').nodes.slice(1,-1).map(id=>lookup.get(id)),leap=paths.find(p=>p.routeId==='leap').nodes.slice(1,-1).map(id=>lookup.get(id)),timed=paths.find(p=>p.routeId==='timed').nodes.slice(1,-1).map(id=>lookup.get(id));assert.ok(steady.every(p=>Math.sign(p.x)===Math.sign(steady[0].x)));assert.ok(leap.every(p=>Math.sign(p.x)===-Math.sign(steady[0].x)));assert.ok(Math.max(...[...steady,...leap].map(p=>p.x))-Math.min(...[...steady,...leap].map(p=>p.x))>room.width*.57);assert.ok(timed.every(p=>Math.abs(p.x)<=6.01));for(let i=1;i<steady.length;i++)if(Math.abs(steady[i].x-steady[i-1].x)>3)sideways++;}
 }assert.ok(layouts.size>=10);assert.ok(sideways>100);
});
test('challenge pads have reachable water-edge mantles without changing safe-state rules', () => {
  for(let index=1;index<12;index++) {
    const room=getRoom('branch-escape',index,'nightmare');
    for(const pad of room.platforms.filter(p=>p.branch&&!p.motion))for(const side of [-1,1]) {
      const sim=createSimulation({seed:'branch-escape',difficulty:'nightmare'}),p=addPlayer(sim,'wet','Wet');
      Object.assign(p,{x:pad.x+side*(pad.w/2+.42),y:0,z:pad.z,vx:0,vy:0,vz:0,grounded:true,safe:false,exposed:false,jumpHeld:false});
      const yaw=side>0?Math.PI/2:-Math.PI/2;
      stepPlayer(p,{forward:1,jump:true,yaw},1/60,sim);
      if(!p.mantle){for(let frame=0;frame<7;frame++)stepPlayer(p,{jump:true,yaw},1/60,sim);stepPlayer(p,{jump:false,yaw},1/60,sim);stepPlayer(p,{forward:1,jump:true,yaw},1/60,sim);}
      assert.equal(p.mantle?.supportId,pad.id);assert.equal(p.safe,false);assert.equal(p.exposed,true);
      for(let frame=0;frame<20;frame++)stepPlayer(p,{jump:true,yaw},1/60,sim);
      assert.equal(p.safe,true);assert.equal(p.exposed,false);assert.equal(p.supportId,pad.id);
    }
  }
});
test('invalid generated sections use a deterministic known-good fallback that retains all three routes', () => {
  const room=structuredClone(getRoom('fallback-review',1,'normal'));
  room.platforms.find(p=>p.route).x=100;
  assert.equal(validateRoom(room),false);
  const recovered=validateOrRepairRoom(room);
  assert.equal(recovered.fallback,true);assert.equal(validateRoom(recovered),true);
  assert.equal(recovered.paths.filter(path=>path.optional).length,4);
  assert.ok(recovered.platforms.filter(p=>p.branch).length>=20);assert.equal(recovered.routeSections.length,2);
  assert.equal(recovered.platforms.filter(p=>p.kind==='escape').length,14);
  assert.deepEqual(recovered,validateOrRepairRoom(room));
  assert.equal(room.platforms.find(p=>p.route).x,100,'validation must not mutate original geometry');
});
test('standing on a dry platform stays safe and never attracts the creature', () => {
  const sim=createSimulation();const p=addPlayer(sim,'a','A');tick(sim,180);
  assert.equal(p.safe,true);assert.equal(p.exposed,false);assert.equal(p.alive,true);assert.equal(sim.monster.targetId,null);
});
test('normal dry-platform jump is not exposure and input hold cannot double-jump', () => {
  const sim=createSimulation();const p=addPlayer(sim,'a','A');const start=p.y;
  tick(sim,1,{a:{jump:true}});assert.ok(p.vy>0);assert.equal(p.safe,false);assert.equal(p.exposed,false);
  tick(sim,120,{a:{jump:true}});assert.equal(p.y,start);assert.equal(p.exposed,false);
  assert.equal(sim.events.filter(e=>e.type==='jump').length,1);
});
test('entering water triggers exposure, but hopping and standing still do not clear it', () => {
  const sim=createSimulation();const p=waterPlayer(sim);
  assert.equal(p.inWater,true);assert.equal(p.exposed,true);const since=p.exposureSince;
  tick(sim,15,{a:{jump:true}});assert.ok(p.y>0);assert.equal(p.exposed,true);assert.equal(p.exposureSince,since);
  tick(sim,30);assert.equal(p.exposed,true);assert.equal(p.exposureSince,since);
  assert.equal(sim.events.filter(e=>e.type==='splash').length,1);
});
test('a landing in the damage tick cancels an active lunge', () => {
  const sim=createSimulation();const p=waterPlayer(sim);
  Object.assign(p,{x:0,z:-2,y:1.56,vy:-2,safe:false,grounded:false,exposed:true});
  Object.assign(sim.monster,{x:3.1,z:-2,state:'lunge',stateTime:.2,targetId:p.id});
  tick(sim);
  assert.equal(p.alive,true);assert.equal(p.safe,true);assert.equal(p.exposed,false);assert.equal(sim.monster.targetId,null);
  tick(sim,30);assert.equal(p.alive,true);
});
test('nearby jump-and-mantle reaches a ledge and ends exposure only on completion', () => {
  const sim=createSimulation();const p=waterPlayer(sim,'a',3,-2);
  tick(sim,1,{a:{strafe:-1,jump:true,yaw:0}});
  assert.ok(p.mantle);assert.equal(p.safe,false);assert.equal(p.exposed,true);
  tick(sim,24,{a:{strafe:-1,jump:true,yaw:0}});
  assert.equal(p.mantle,null);assert.equal(p.safe,true);assert.equal(p.exposed,false);assert.equal(p.y,1.55);
});
test('the controller cannot mantle distant platforms or through columns', () => {
  const sim=createSimulation();const p=waterPlayer(sim,'a',4.8,-2);
  tick(sim,1,{a:{strafe:-1,jump:true}});assert.equal(p.mantle,null);
  const room=getRoom(sim.seed,0);const obstacle=room.obstacles[0];
  assert.ok(obstacle);
  p.x=obstacle.x;p.z=obstacle.z+1;p.y=0;p.vx=p.vz=0;p.jumpHeld=false;
  tick(sim,1,{a:{forward:1,jump:true}});assert.equal(p.mantle,null);
});
test('water pursuit has a real recovery window, then can eliminate a stranded player', () => {
  const sim=createSimulation({difficulty:'nightmare',monsterId:'mirehound'});const p=waterPlayer(sim,'a',5,-11);
  Object.assign(sim.monster,{x:5,z:-12,state:'pursue',targetId:p.id,stateTime:1});
  tick(sim,8);assert.equal(p.alive,true,'must retain initial recovery cue');
  tick(sim,200);assert.equal(p.alive,false);assert.equal(sim.finished,false);assert.ok(p.respawnReadyAt>p.deathTime);
  assert.ok(sim.events.some(e=>e.type==='death'));
});
test('the creature redirects from a safe player toward an exposed friend', () => {
  const sim=createSimulation();const safe=addPlayer(sim,'safe','Safe');const wet=waterPlayer(sim,'wet',5,-10);
  Object.assign(sim.monster,{state:'lunge',stateTime:.25,targetId:'safe',x:4,z:-3});
  tick(sim,5);
  assert.equal(safe.alive,true);assert.equal(safe.safe,true);assert.equal(sim.monster.targetId,wet.id);
});
test('monster navigation never moves through platform or column colliders', () => {
  const sim=createSimulation();const p=waterPlayer(sim,'a',-5,-15);
  Object.assign(sim.monster,{x:5,z:-4,state:'pursue',targetId:p.id});
  for(let i=0;i<330;i++) {
    tick(sim);
    const m=sim.monster;
    for(let index=0;index<2;index++) for(const o of [...getRoom(sim.seed,index).platforms,...getRoom(sim.seed,index).obstacles]) {
      const cx=Math.max(o.x-o.w/2,Math.min(o.x+o.w/2,m.x)),cz=Math.max(o.z-o.d/2,Math.min(o.z+o.d/2,m.z));
      assert.ok(Math.hypot(m.x-cx,m.z-cz)>=.43,`${m.state} at ${m.x},${m.z} collides ${o.id}`);
    }
  }
  assert.ok(sim.monster.x<1,'should route around the central platforms toward target');
});
test('monster can navigate across every branched room family without passing through solids', () => {
  const seed='branch-navigation';
  const free=(room,x,z,r=.65)=>[...room.platforms,...room.obstacles].every(o=>Math.hypot(x-Math.max(o.x-o.w/2,Math.min(o.x+o.w/2,x)),z-Math.max(o.z-o.d/2,Math.min(o.z+o.d/2,z)))>=r);
  for(let family=0;family<8;family++) {
    let room;
    for(let index=1;index<40;index++){const candidate=getRoom(seed,index);if(candidate.family===family){room=candidate;break;}}
    const positions=[{x:-room.navigation.laneX,z:room.startZ-12},{x:room.navigation.laneX,z:room.startZ-12}];
    const sim=createSimulation({seed,monsterId:'siphon'}),p=addPlayer(sim,'target','Target');
    Object.assign(p,{...positions[1],y:0,safe:false,grounded:true});
    Object.assign(sim.monster,{...positions[0],state:'pursue',targetId:p.id});
    for(let frame=0;frame<900&&p.alive;frame++) {
      tick(sim);
      const index=Math.max(0,Math.floor(-sim.monster.z/CONFIG.roomLength));
      for(let nearby=Math.max(0,index-1);nearby<=index+1;nearby++)assert.ok(free(getRoom(seed,nearby),sim.monster.x,sim.monster.z,MONSTER_PHYSICS[sim.monsterId].coreClearance-.01),`${room.layout} creature overlaps a solid`);
    }
    assert.equal(p.alive,false,`${room.layout} creature must reach a stationary exposed target`);
  }
});
test('frame-rate-independent movement stays close at 30, 60, and 120Hz', () => {
  const samples=[30,60,120].map(hz=>{
    const sim=createSimulation();const p=addPlayer(sim,'a','A');
    for(let i=0;i<hz*.3;i++) stepPlayer(p,{forward:1,sprint:true},1/hz,sim);
    return p.z;
  });
  assert.ok(Math.max(...samples)-Math.min(...samples)<.14,samples.join(','));
});
test('jump buffer is consumed on landing and coyote time permits a late edge jump', () => {
  const sim=createSimulation();const p=addPlayer(sim,'a','A');
  Object.assign(p,{y:1.8,vy:-3,grounded:false,safe:false,coyote:0});
  stepPlayer(p,{jump:true},1/60,sim);
  for(let i=0;i<5;i++)stepPlayer(p,{jump:true},1/60,sim);
  assert.ok(p.vy>0,'buffered jump fires on landing');
  const edge=addPlayer(sim,'b','B');Object.assign(edge,{x:2.6,y:1.55,grounded:false,safe:false,coyote:.08});
  stepPlayer(edge,{jump:true},1/60,sim);assert.ok(edge.vy>6);
});
test('party separation is bounded without teleporting anyone backwards', () => {
  const sim=createSimulation();const a=addPlayer(sim,'a','A');const b=addPlayer(sim,'b','B');
  Object.assign(a,{z:b.z-CONFIG.maxPartySeparation,y:5,grounded:false,safe:false});
  tick(sim,30,{a:{forward:1,sprint:true}});
  assert.ok(a.z>=b.z-CONFIG.maxPartySeparation-.001);assert.equal(a.regroup,true);
});
test('serialization is JSON-safe, includes prediction state, and excludes pathfinding internals', () => {
  const sim=createSimulation();addPlayer(sim,'a','A');tick(sim,1,{a:{seq:7}});
  const state=JSON.parse(JSON.stringify(serializeSimulation(sim)));
  assert.equal(state.players[0].ackSeq,7);assert.ok('jumpHeld' in state.players[0]);assert.ok('exposureSince' in state.players[0]);
  assert.equal('path' in state.monster,false);assert.equal(state.seed,'stillwater');assert.deepEqual(state.roomRange,{min:0,max:2});
  assert.equal(MONSTERS.length,21);
});

test('normal pursuit catches clear-water targets in about one second through a real windup and lunge',()=>{
  for(const monsterId of MONSTERS.map(m=>m.id)){
    const {sim,p,m}=openWaterFixture(monsterId);let windup=null;
    for(let frame=0;frame<180&&p.alive;frame++){const old={x:m.x,z:m.z};tick(sim);assert.ok(Math.hypot(m.x-old.x,m.z-old.z)<=CONFIG.maxMonsterSpeed/60+.001);assertCoreClear(sim,MONSTER_PHYSICS[monsterId].coreClearance,m);if(m.state==='windup'&&windup===null)windup=sim.time;if(sim.time<.25)assert.equal(p.alive,true);}
    assert.equal(p.alive,false);assert.ok(sim.time>=.65&&sim.time<=1.12,`${monsterId} died at${sim.time}`);assert.ok(windup>=p.exposureGrace);assert.ok(sim.time-windup>=.20);assert.equal(p.killerMonsterUid,m.uid);
  }
});

test('getting dry during the faster approach cancels the target immediately',()=>{
  const sim=createSimulation(),p=waterPlayer(sim,'wet',3,-2);Object.assign(sim.monster,{x:6,z:-13});tick(sim,30);assert.equal(p.alive,true);tick(sim,1,{wet:{strafe:-1,jump:true}});assert.ok(p.mantle);tick(sim,24,{wet:{strafe:-1,jump:true}});assert.equal(p.safe,true);assert.equal(sim.monster.targetId,null);tick(sim,120);assert.equal(p.alive,true);
});

test('large-creature profiles expose fixed scale, real core clearance, and coherent world version',()=>{
  assert.equal(WORLD_VERSION,'abyss-18');
  assert.deepEqual(Object.keys(MONSTER_PHYSICS).sort(),MONSTERS.map(m=>m.id).sort());
  for(const monsterId of MONSTERS.map(m=>m.id)){
    const profile=MONSTER_PHYSICS[monsterId];
    assert.ok(profile.radius>=2.025&&profile.radius<=2.7);
    assert.ok(profile.coreClearance>=profile.radius+.099);
    if(MONSTERS.findIndex(m=>m.id===monsterId)>=11){assert.equal(profile.radius,2.7);assert.equal(profile.worldScale,1.35);}
    assert.ok(profile.worldScale>=.7);assert.equal(profile.worldYScale,profile.worldScale);
    assert.ok(profile.attackReach>profile.radius);
    const sim=createSimulation({monsterId});assert.equal(sim.monster.radius,profile.radius);
    assert.equal(serializeSimulation(sim).worldVersion,WORLD_VERSION);
  }
});

test('three physical routes retain farther marked high jumps, varied heights and broad recovery checkpoints',()=>{
 for(const difficulty of Object.keys(DIFFICULTIES))for(const seed of ['gap-a','gap-b','gap-c']){
  const early=getRoom(seed,0,difficulty),late=getRoom(seed,90,difficulty),lookup=roomLookup(late),earlyLookup=roomLookup(early),earlyPath=early.paths.find(p=>p.routeId==='steady').nodes.map(id=>earlyLookup.get(id)),latePath=late.paths.find(p=>p.routeId==='leap').nodes.map(id=>lookup.get(id)),earlyGaps=earlyPath.slice(1).map((p,i)=>jumpGap(earlyPath[i],p)),lateGaps=latePath.slice(1).map((p,i)=>jumpGap(latePath[i],p));
  assert.ok(Math.min(...earlyGaps)<3);assert.ok(Math.max(...lateGaps)>6&&Math.max(...lateGaps)<7.5);assert.ok(new Set(latePath.map(p=>p.y)).size>=3);assert.ok(latePath.some(p=>p.checkpoint&&p.w>=4.8));
  const choices=lateGaps.map((gap,index)=>({gap,index})).filter(({index})=>!latePath[index].checkpoint),{index}=choices.sort((a,b)=>b.gap-a.gap)[0],from=latePath[index],to=latePath[index+1];assert.equal(from.jumpType,'long');assert.equal(from.longJumpToId,to.id);assert.equal(from.jumpTargetId,to.id);assert.deepEqual(from.jumpTo,{x:to.x,z:to.z});assert.ok(jumpReachable(from,to));const sim=createSimulation({seed,difficulty}),p=addPlayer(sim,'runner');traverseLink(sim,p,from,to);assert.equal(p.supportId,to.id);assert.equal(p.exposed,false);
 }
});

function openWaterFixture(monsterId='dredge',difficulty='normal',seed='stillwater',index=0){
 const sim=createSimulation({seed,difficulty,monsterId}),p=addPlayer(sim,'wet'),room=getRoom(seed,index,difficulty);Object.assign(p,{x:-room.width*.4,z:room.startZ-8,y:0,safe:false,grounded:true,supportId:null});const m=sim.monsters.find(m=>m.uid===`m:${index}:0`),profile=MONSTER_PHYSICS[monsterId];Object.assign(m,{typeId:monsterId,id:monsterId,radius:profile.radius,x:p.x,z:p.z-10,y:profile.surfaceY,state:'patrol',targetId:null,homeX:p.x,homeZ:p.z-10});sim.monster=m;return{sim,p,m};
}
function assertCoreClear(sim,radius,actor=sim.monster){
 const m=actor,index=mechanics.roomIndexAt(m.z);radius??=MONSTER_PHYSICS[m.typeId].coreClearance;
 for(let i=Math.max(0,index-1);i<=index+1;i++){const room=getRoom(sim.seed,i,sim.difficulty);if(m.z+radius>room.endZ&&m.z-radius<room.startZ)assert.ok(Math.abs(m.x)<=room.width/2-radius+.015,'core crosses a room wall');for(const raw of [...room.platforms,...room.obstacles]){const o=raw.safe?mechanics.getPlatformPose(sim,raw):raw;if(o.active===false)continue;const c=Math.cos(o.yaw||0),sn=Math.sin(o.yaw||0),dx=m.x-o.x,dz=m.z-o.z,x=c*dx-sn*dz,z=sn*dx+c*dz,ox=Math.max(0,Math.abs(x)-o.w/2),oz=Math.max(0,Math.abs(z)-o.d/2);assert.ok(Math.hypot(ox,oz)>=radius-.015,`${m.typeId} overlaps${o.id} at${m.x},${m.z}`);}}
}
test('wide side lanes and side portals fit the largest enlarged core across seeded rooms',()=>{
 for(const seed of ['lanes-a','lanes-b'])for(const difficulty of Object.keys(DIFFICULTIES))for(let index=0;index<12;index++){const room=getRoom(seed,index,difficulty),sim=createSimulation({seed,difficulty}),radius=CONFIG.maxMonsterClearance;assert.ok(room.height>=10);for(const side of[-1,1])for(let depth=radius+.2;depth<=CONFIG.roomLength-radius-.2;depth+=3){Object.assign(sim.monster,{x:side*room.navigation.laneX,z:room.startZ-depth});assertCoreClear(sim,radius);}if(index>0){const previous=getRoom(seed,index-1,difficulty),lane=Math.min(room.navigation.laneX,previous.navigation.laneX);for(const side of[-1,1])for(let z=room.startZ-radius;z<=room.startZ+radius;z+=.4){Object.assign(sim.monster,{x:side*lane,z});assertCoreClear(sim,radius);}}}
});

test('all twenty-one enlarged cores navigate open lanes and require a physical attack',()=>{
 for(const monsterId of MONSTERS.map(m=>m.id))for(const seed of ['giant-nav-a','giant-nav-b']){const{sim,p,m}=openWaterFixture(monsterId,'normal',seed,4);for(let frame=0;frame<180&&p.alive;frame++){tick(sim);assertCoreClear(sim,MONSTER_PHYSICS[monsterId].coreClearance,m);}assert.equal(p.alive,false);assert.equal(p.killerMonsterUid,m.uid);assert.ok(Math.hypot(p.x-m.x,p.z-m.z)<=MONSTER_PHYSICS[monsterId].attackReach+.2);}
});

test('every enlarged creature cancels damage on a same-tick dry landing and continues to shore',()=>{
 for(const monsterId of MONSTERS.map(m=>m.id)){const sim=createSimulation({monsterId}),p=addPlayer(sim,'wet'),profile=MONSTER_PHYSICS[monsterId],m=sim.monster;Object.assign(p,{x:2.1,z:-2,y:1.56,vy:-2,safe:false,grounded:false,exposed:true});Object.assign(m,{typeId:monsterId,id:monsterId,radius:profile.radius,x:2.4+profile.coreClearance+.12,z:-2,state:'lunge',stateTime:.2,targetId:p.id});tick(sim);assert.equal(p.safe,true);assert.equal(p.alive,true);assert.equal(m.targetId,null);assert.ok(['shore','guard'].includes(m.state));assertCoreClear(sim,profile.coreClearance,m);}
});

test('difficulty changes real approach and attack timing without teleporting or deadline damage',()=>{
  const timings={};
  for(const difficulty of Object.keys(DIFFICULTIES)){
    const sim=createSimulation({difficulty}),p=addPlayer(sim,'wet'),x=getRoom(sim.seed,0,difficulty).navigation.laneX;
    Object.assign(p,{x,z:-3,y:0,safe:false,grounded:true});Object.assign(sim.monster,{x,z:-13});
    let close=null,windup=null,previous={x:sim.monster.x,z:sim.monster.z};
    for(let frame=0;frame<300&&p.alive;frame++){
      tick(sim);const m=sim.monster,travel=Math.hypot(m.x-previous.x,m.z-previous.z);assert.ok(travel<=CONFIG.maxMonsterSpeed/60+.0001,'speed cap bounds each physical step');previous={x:m.x,z:m.z};
      if(close===null&&Math.hypot(p.x-m.x,p.z-m.z)<MONSTER_PHYSICS.dredge.attackReach+.1)close=sim.time;
      if(windup===null&&m.state==='windup')windup=sim.time;
      if(sim.time<=DIFFICULTIES[difficulty].approach)assert.equal(p.alive,true,'arrival deadline cannot deal damage');
    }
    assert.equal(p.alive,false);assert.ok(windup>=p.exposureGrace);timings[difficulty]={close,death:sim.time};
  }
  assert.ok(timings.nightmare.close<timings.normal.close&&timings.normal.close<timings.chill.close);
  assert.ok(timings.nightmare.death<timings.normal.death&&timings.normal.death<timings.chill.death);
});

test('a prompt mantle still reaches dry support before a nearby attack in every difficulty',()=>{
 for(const difficulty of Object.keys(DIFFICULTIES))for(const monsterId of MONSTERS.map(m=>m.id)){const sim=createSimulation({difficulty,monsterId}),p=waterPlayer(sim,'wet',3,-2),m=sim.monster,profile=MONSTER_PHYSICS[monsterId];Object.assign(m,{typeId:monsterId,id:monsterId,radius:profile.radius,x:2.4+profile.coreClearance+.4,z:-2,state:'pursue',targetId:p.id,arrivalDeadline:sim.time+DIFFICULTIES[difficulty].approach});tick(sim,6);for(let frame=0;frame<90&&p.alive&&!p.safe;frame++)tick(sim,1,{wet:{strafe:-1,yaw:0,jump:frame%8===0}});assert.equal(p.safe,true,`${difficulty}/${monsterId}`);assert.equal(p.alive,true);assert.equal(m.targetId,null);tick(sim,30);assert.equal(p.alive,true);}
});

test('seeded architecture and route schedules vary substantially without adjacent repeats or dry branch shortcuts',t=>{
  const architectures=new Set(),layouts=new Set(),combinations=new Set(),widths=new Set(),heights=new Set();let totalTime=0,maxTime=0;
  for(const seed of ['variety-a','variety-b','variety-c']){
    let previous=getRoom(seed,0);
    for(let i=1;i<=36;i++){
      const before=performance.now(),room=getRoom(seed,i),elapsed=performance.now()-before;totalTime+=elapsed;maxTime=Math.max(maxTime,elapsed);
      assert.notEqual(room.family,previous.family);assert.notEqual(room.template,previous.template);previous=room;
      architectures.add(room.architecture.id);layouts.add(room.layout);combinations.add(room.architecture.id+':'+room.template);widths.add(room.width);heights.add(room.height);
      assert.equal(room.fallback,undefined);
      for(const structure of room.structures)if(structure.kind!=='light')assert.ok(structure.y-structure.h/2>=6.4);
      for(const obstacle of room.obstacles)assert.ok(Math.abs(obstacle.x)+obstacle.w/2>=room.width/2-.001,'architecture joins the outer wall, leaving no flooded slot behind');
      const routeIds=new Set(room.paths.flatMap(path=>path.nodes));
      for(const p of room.platforms.filter(p=>p.kind==='infill'))assert.ok((p.connects||[]).filter(id=>routeIds.has(id)).length<=1,'dry infill cannot join authored jump pairs');
      for(const path of room.paths){let wetLinks=0;for(let j=1;j<path.nodes.length;j++){
        const a=roomLookup(room).get(path.nodes[j-1]),b=roomLookup(room).get(path.nodes[j]);
        for(let sample=1;sample<20;sample++){const f=sample/20,x=a.x+(b.x-a.x)*f,z=a.z+(b.z-a.z)*f;if(!room.platforms.some(p=>Math.abs(x-p.x)<=p.w/2+.02&&Math.abs(z-p.z)<=p.d/2+.02)){wetLinks++;break;}}
      }assert.ok(wetLinks>=2,`${room.layout}/${path.id} retains real water jumps`);}
    }
  }
  assert.equal(architectures.size,9);assert.equal(layouts.size,18);assert.equal(combinations.size,18);assert.ok(widths.size>=5&&heights.size>=8);
  t.diagnostic(`9 expanded architectures and18 mirrored route templates; ${widths.size} widths/${heights.size} heights; cold generation mean ${(totalTime/108).toFixed(2)}ms, max ${maxTime.toFixed(2)}ms (informational host timing)`);
});

test('representative wet gaps across every expanded architecture remain physically catchable',t=>{
 let captures=0;for(const seed of['pocket-a','pocket-b']){const seen=new Set();for(let index=1;index<30&&seen.size<9;index++){const room=getRoom(seed,index);if(seen.has(room.family))continue;seen.add(room.family);const route=room.platforms.filter(p=>p.route),candidates=[];for(let i=2;i<route.length-1;i++){if(route[i].motion||route[i+1].motion)continue;const point={x:(route[i].x+route[i+1].x)/2,z:(route[i].z+route[i+1].z)/2};if(room.platforms.every(o=>Math.hypot(Math.max(0,Math.abs(point.x-o.x)-o.w/2),Math.max(0,Math.abs(point.z-o.z)-o.d/2))>.30))candidates.push(point);}assert.ok(candidates.length>=3);
  for(const point of[candidates[0],candidates[Math.floor(candidates.length/2)],candidates.at(-1)]){const sim=createSimulation({seed}),p=addPlayer(sim,'wet');Object.assign(p,{...point,y:0,safe:false,grounded:true,supportId:null});for(let frame=0;frame<600&&p.alive;frame++){const previous=new Map(sim.monsters.map(m=>[m.uid,{x:m.x,z:m.z}]));tick(sim);const m=mechanics.primaryMonsterForPlayer(sim,p);assertCoreClear(sim,MONSTER_PHYSICS[m.typeId].coreClearance,m);const old=previous.get(m.uid);if(old)assert.ok(Math.hypot(m.x-old.x,m.z-old.z)<=CONFIG.maxMonsterSpeed/60+.001);}assert.equal(p.alive,false,`${seed}/${room.layout} stuck at${point.x},${point.z}`);captures++;}
 }assert.equal(seen.size,9);}assert.equal(captures,54);t.diagnostic('54 current-geometry wet gaps: two seeds × nine architectures × three route locations');
});

test('fractional off-grid water targets beside current platforms remain catchable',()=>{
 for(const seed of['pocket-a','pocket-b'])for(const index of[1,3,4]){const room=getRoom(seed,index),route=room.platforms.filter(p=>p.route),a=route[2],b=route[3],sim=createSimulation({seed}),p=addPlayer(sim,'wet');Object.assign(p,{x:(a.x+b.x)/2+.11,z:(a.z+b.z)/2+.07,y:0,safe:false,grounded:true,supportId:null});for(let i=0;i<600&&p.alive;i++){tick(sim);const m=mechanics.primaryMonsterForPlayer(sim,p);assertCoreClear(sim,MONSTER_PHYSICS[m.typeId].coreClearance,m);}assert.equal(p.alive,false,`${seed}/${index}`);}
});

test('landing on a visible stable checkpoint bank cancels a pending attack immediately',()=>{
 for(const monsterId of['leech','dredge','siphon']){const sim=createSimulation({monsterId}),bank=getRoom(sim.seed,0).platforms.find(p=>p.checkpoint),p=addPlayer(sim,'wet'),m=sim.monster,profile=MONSTER_PHYSICS[monsterId];Object.assign(p,{x:bank.x,z:bank.z,y:bank.y+.01,vy:-2,safe:false,grounded:false,exposed:true});Object.assign(m,{x:bank.x+bank.w/2+profile.coreClearance+.2,z:bank.z,state:'lunge',stateTime:.2,targetId:p.id});tick(sim);assert.equal(p.supportId,bank.id);assert.equal(p.alive,true);assert.equal(p.safe,true);assert.equal(p.exposed,false);assert.equal(m.targetId,null);}
});


test('higher jumps reach both sides of real spinners throughout the rotation cycle', t => {
 let crossings=0;
 for(const seed of ['phase-a','phase-b'])for(const index of [1,35,79]) {
  const room=getRoom(seed,index),route=room.paths.find(path=>path.routeId==='timed').nodes.map(id=>roomLookup(room).get(id)),k=route.findIndex(p=>p.kind==='spinner');assert.ok(k>0,'authored route retains a rotating beam');const beam=route[k],period=Math.PI*2/Math.abs(beam.motion.angularVelocity);
  for(const phase of [0,.125,.25,.375,.5,.625,.75,.875])for(const [a,b] of [[route[k-1],beam],[beam,route[k+1]]]) {
   const sim=createSimulation({seed}),p=addPlayer(sim,'runner');sim.time=period*phase;traverseLink(sim,p,a,b);assert.equal(p.supportId,b.id,`${seed}/${index}/${phase}: ${a.id} -> ${b.id}`);assert.equal(p.exposed,false);crossings++;
  }
 }
 assert.equal(crossings,96);t.diagnostic(`${crossings} real incoming/outgoing controller jumps across eight spinner phases`);
});
