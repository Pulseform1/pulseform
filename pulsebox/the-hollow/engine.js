import {createStamina,stepStamina} from './player-mechanics.js';
import {planHaunt} from './horror-director.js';
import {walkable,pathTo,clearSight} from './world.js';
import {LEVELS,getLevel,chooseMonsterSpawn,getHidingSpots} from './levels.js';
export function createSession(){return {players:new Map(),chaseTarget:null,level:0,levelAge:0,stage:0,monster:chooseMonsterSpawn(getLevel(0)),age:0,hunt:0,ended:false,hide:new Map()}}
export function addPlayer(r,id){const spawn=getLevel(r.level).spawn;r.players.set(id,{x:spawn.x,z:spawn.z,yaw:0,noise:0,light:true,down:false,active:false,hidden:null,moving:false,crouch:false,...createStamina()})}
export function applyMessage(r,id,m,emit){
  const level=getLevel(r.level),map=level.map;const p=r.players.get(id);if(!p||!m||typeof m!=='object')return;
  if(m.type==='active'){p.active=!!m.active;p.noise=0;p.moving=false;if(!p.active)p.sprintWanted=false;return}
  if(m.type==='sprint'&&!p.down&&!r.ended&&p.active){p.sprintWanted=!!m.enabled&&!p.exhausted&&!p.hidden;return}
  if(m.type==='hide'&&!p.down&&!r.ended&&p.active){
    if(p.hidden){p.hidden=null;p.noise=0;emit(id,{type:'hidden',spot:null});return}
    const spot=getHidingSpots(level).find(h=>Math.hypot(h.x-p.x,h.z-p.z)<1.15);
    if(!spot)return emit(id,{type:'notice',message:'Move beside a blue hiding locker and press H.'});
    if([...r.players.values()].some(q=>q!==p&&q.hidden===spot.id))return emit(id,{type:'notice',message:'That locker is occupied. Find another hiding spot.'});
    Object.assign(p,{x:spot.x,z:spot.z,hidden:spot.id,light:false,noise:0,moving:false,sprintWanted:false});
    if(r.chaseTarget===id){r.chaseTarget=null;r.goal=null;r.waypoint=null;r.memory=0;r.hunt=0}
    emit(id,{type:'hidden',spot:spot.id,x:p.x,z:p.z});return;
  }
  if(m.type==='move'&&!p.down&&!r.ended&&p.active&&!p.hidden){
    if(Number.isFinite(m.x)&&Number.isFinite(m.z)&&walkable(m.x,m.z,map)&&Math.hypot(m.x-p.x,m.z-p.z)<1.2){p.moving=Math.hypot(m.x-p.x,m.z-p.z)>.002;p.x=m.x;p.z=m.z}else emit(id,{type:'correction',x:p.x,z:p.z});
    p.yaw=Number(m.yaw)||0;p.noise=Math.min(1,Math.max(0,Number(m.noise)||0));p.light=!!m.light;p.crouch=!!m.crouch;
  }
  if(m.type!=='interact'||p.down||r.ended||!p.active||p.hidden)return;
  const o=level.objectives[r.stage];
  if(!o||Math.hypot(p.x-o.x,p.z-o.z)>=1.6)return emit(id,{type:'notice',message:'Move closer to the marked control panel. Use MAP to find it.'});
  if(r.stage===1&&m.answer!==level.answer)return emit(id,{type:'notice',message:'Invalid frequency. Read the note beside the channels.'});
  if(r.stage===3){
    if(r.level===LEVELS.length-1){r.stage=4;r.ended=true;emit(null,{type:'win'});return}
    r.level++;r.chaseTarget=null;r.stage=0;r.levelAge=0;r.hunt=0;r.hide.clear();r.waypoint=null;r.goal=null;r.memory=0;r.nextHaunt=r.age+14+Math.random()*7;r.blackoutUntil=0;
    const next=getLevel(r.level);r.monster=chooseMonsterSpawn(next);
    for(const player of r.players.values()){Object.assign(player,next.spawn,{down:false,noise:0,light:true,active:true,hidden:null,moving:false,crouch:false,...createStamina()})}
    emit(null,{type:'level',level:r.level});emit(null,snapshot(r));return;
  }
  r.stage++;r.hunt=12;r.goal={x:o.x,z:o.z};r.memory=8;emit(null,{type:'event',stage:r.stage});
}
export function snapshot(r){return {type:'state',chaseTarget:r.chaseTarget,level:r.level,levelAge:r.levelAge,stage:r.stage,age:r.age,monster:{...r.monster},players:[...r.players].map(([id,p])=>({id,...p})),ended:r.ended,blackout:r.age<(r.blackoutUntil||0),paused:[...r.players.values()].every(p=>!p.active||p.down)}}
export function tick(r,emit,dt=.1){
  if(r.ended||[...r.players.values()].every(p=>!p.active||p.down))return;
  for(const p of r.players.values())if(p.active&&!p.down)stepStamina(p,dt,p.moving&&!p.hidden);
  r.age+=dt;r.levelAge+=dt;const level=getLevel(r.level),map=level.map;
  r.nextHaunt??=14+Math.random()*7;
  if(r.age>=r.nextHaunt){
    const plan=planHaunt(r.lastHaunt,r.age);const kind=plan.kind,duration=kind==='blackout'?3+Math.random()*3:2;r.lastHaunt=kind;
    if(kind==='blackout')r.blackoutUntil=r.age+duration;
    emit(null,{type:'haunt',kind,duration});r.nextHaunt=r.age+plan.delay;
  }
  r.hunt=Math.max(0,r.hunt-dt);let target,score=-Infinity;
  for(const p of r.players.values()){
    if(p.down||p.hidden||!p.active)continue;
    const d=Math.hypot(p.x-r.monster.x,p.z-r.monster.z),key=Math.round(p.x)+','+Math.round(p.z);
    if(p.noise<.08)r.hide.set(key,(r.hide.get(key)||0)+dt*.02);
    const visible=level.sight>0&&d<(p.light?10:3)*level.sight&&clearSight(r.monster,p,map),audible=p.noise>.1&&d<2+p.noise*14*level.hearing;
    const s=(audible?p.noise*15*level.hearing:0)+(visible?9*level.sight:0)+(r.hide.get(key)||0)-d*.7;
    if(!r.chaseTarget&&(visible||audible)){r.chaseTarget=[...r.players].find(([,v])=>v===p)[0];r.waypoint=null;emit(r.chaseTarget,{type:'notice',message:'IT SPOTTED YOU. Sprint to a blue locker and press H.'})}if(s>score){score=s;target=p}
  }
  const chased=r.players.get(r.chaseTarget);if(chased&&!chased.down&&!chased.hidden){target=chased;score=20}else if(r.chaseTarget){r.chaseTarget=null;r.goal=null;r.waypoint=null}
  if(!target)return;
  // Opening grace pauses patrol only: seeing or hearing a player always starts pursuit.
  if(r.levelAge<25&&!r.chaseTarget)return;
  if(r.chaseTarget||score>1||Math.hypot(target.x-r.monster.x,target.z-r.monster.z)<1.5){r.goal={x:target.x,z:target.z};r.memory=6}
  else{r.memory=Math.max(0,(r.memory||0)-dt);if(!r.goal||(!r.memory&&Math.hypot(r.goal.x-r.monster.x,r.goal.z-r.monster.z)<.3)){const patrol=[];for(let z=1;z<map.length-1;z++)for(let x=1;x<map[z].length-1;x++)if(walkable(x,z,map))patrol.push({x,z});r.goal=patrol[Math.floor(Math.random()*patrol.length)]}}
  if(!r.waypoint||Math.hypot(r.waypoint[0]-r.monster.x,r.waypoint[1]-r.monster.z)<.02)r.waypoint=pathTo(r.monster,r.goal,map);
  const dx=r.waypoint[0]-r.monster.x,dz=r.waypoint[1]-r.monster.z,d=Math.hypot(dx,dz);
  if(d>.001){const speed=(r.chaseTarget?Math.min(1.48,level.speed+.32):r.hunt>0||score>4?level.speed:.48)*dt;r.monster.x+=dx/d*Math.min(d,speed);r.monster.z+=dz/d*Math.min(d,speed)}
  const caught=[...r.players.entries()].find(([,p])=>!p.down&&!p.hidden&&Math.hypot(p.x-r.monster.x,p.z-r.monster.z)<.48);
  if(caught){caught[1].down=true;caught[1].moving=false;caught[1].sprintWanted=false;r.chaseTarget=null;emit(caught[0],{type:'caught'});r.monster=chooseMonsterSpawn(level,[...r.players.values()]);r.waypoint=null;r.goal=null;if([...r.players.values()].every(p=>p.down)){r.ended=true;emit(null,{type:'lost'})}}
}
