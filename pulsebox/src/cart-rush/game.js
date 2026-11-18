/** Deterministic single-player shopping and security simulation. No DOM or rendering. */
import {WORLD,canStand,clearSight,findPath,surfaceAt} from './world.js';
export const DIFFICULTIES=Object.freeze({
 easy:{label:'Easy',minItems:5,maxItems:7,guards:1,warnings:2,range:18,chaseSpeed:4.8,cone:80},
 medium:{label:'Medium',minItems:8,maxItems:12,guards:2,warnings:1,range:22,chaseSpeed:5.3,cone:90},
 hard:{label:'Hard',minItems:13,maxItems:18,guards:3,range:26,chaseSpeed:5.7,cone:100},
 insane:{label:'Insane',minItems:19,maxItems:25,guards:3,range:30,chaseSpeed:6.1,cone:110}
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),HEIGHT=8,GRACE=5;   // security ignores you for the first few seconds of a run
function random(g){g.rng=(Math.imul(g.rng,1664525)+1013904223)>>>0;return g.rng/4294967296;}
function shuffle(g,values){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(random(g)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function emit(g,type,extra={}){g.events.push({id:++g.eventId,type,time:g.elapsed,...extra});if(g.events.length>40)g.events.shift();}
function seedValue(seed){if(Number.isFinite(seed))return Math.floor(seed)>>>0;const data=new Uint32Array(1);if(globalThis.crypto?.getRandomValues){crypto.getRandomValues(data);return data[0];}return Math.floor(Math.random()*0xffffffff)>>>0;}
const itemFloor=item=>item.floor||0;
function makeList(g,previousList){
 const all=WORLD.items||[],config=DIFFICULTIES[g.difficulty],count=config.minItems+Math.floor(random(g)*(config.maxItems-config.minItems+1));
 const departments=[...new Set(all.map(item=>item.department||item.dept||'store'))];let chosen;
 if(g.difficulty==='easy'){const half=random(g)<.5?['grocery','cleaning','seasonal']:['toys','electronics','seasonal'];chosen=shuffle(g,half.filter(id=>departments.includes(id))).slice(0,random(g)<.5?2:3);}
 else if(g.difficulty==='medium')chosen=shuffle(g,departments).slice(0,5+Math.floor(random(g)*3));
 else if(g.difficulty==='hard')chosen=shuffle(g,departments).slice(0,7+Math.floor(random(g)*4));
 else chosen=departments;
 const pool=all.filter(item=>(g.difficulty!=='easy'||itemFloor(item)===0)&&(!chosen?.length||chosen.includes(item.department||item.dept||'store')));
 const remaining=shuffle(g,pool),selected=[];
 if(['hard','insane'].includes(g.difficulty))for(const floor of [0,1]){const item=remaining.find(a=>itemFloor(a)===floor);if(item){selected.push(item);remaining.splice(remaining.indexOf(item),1);}}
 // Spread the list among departments before filling with a seeded random draw.
 const covered=new Set(selected.map(item=>item.department||item.dept||'store'));
 for(const item of [...remaining]){const department=item.department||item.dept||'store';if(selected.length<count&&!covered.has(department)){selected.push(item);covered.add(department);remaining.splice(remaining.indexOf(item),1);}}
 selected.push(...remaining.slice(0,Math.max(0,count-selected.length)));
 if(Array.isArray(previousList)){const previous=previousList.map(a=>typeof a==='string'?a:a?.id).sort().join('|'),current=selected.map(a=>a.id).sort().join('|');if(previous===current){const replacement=pool.find(a=>!selected.some(item=>item.id===a.id)&&(!['hard','insane'].includes(g.difficulty)||itemFloor(a)===itemFloor(selected[0])));if(replacement)selected[0]=replacement;}}
 return selected.map(item=>({...item,collected:false}));
}
function patrolPoints(){
 const points=[];for(const floor of [0,1])for(let x=-42;x<=42;x+=7)for(let z=-32;z<=24;z+=8)if(canStand(x,z,floor,.6)){const at=surfaceAt(x,z,floor,null);if(at.floor===floor&&!at.ramp&&!at.blocked)points.push({x,z,y:floor*HEIGHT,floor,ramp:null});}
 return points;
}
export function createGame({difficulty='medium',seed,previousList}={}){
 if(!DIFFICULTIES[difficulty])difficulty='medium';const actualSeed=seedValue(seed),spawn=WORLD.spawn||{x:0,z:32,floor:0};
 const g={status:'playing',difficulty,seed:actualSeed,rng:actualSeed,elapsed:0,player:{x:spawn.x,z:spawn.z,y:(spawn.floor||0)*HEIGHT,floor:spawn.floor||0,ramp:null,yaw:0,stamina:100,sprinting:false,exhausted:false,moving:false,recoveryDelay:0},list:[],guards:[],collected:0,total:0,nearbyItemId:null,checkoutReady:false,nearCheckout:false,events:[],eventId:0,caughtBy:null,patrols:[],warnings:DIFFICULTIES[difficulty]?.warnings||0,safeUntil:GRACE};
 g.list=makeList(g,previousList);g.total=g.list.length;g.patrols=patrolPoints();const config=DIFFICULTIES[difficulty];
 for(let i=0;i<config.guards;i++){const floor=i===2?1:0,spread=g.patrols.filter(p=>p.floor===floor&&distance(p,spawn)>18&&g.guards.every(q=>q.floor!==p.floor||distance(q,p)>10)),hidden=spread.filter(p=>floor!==(spawn.floor||0)||!clearSight(p.x,p.z,spawn.x,spawn.z,floor)),candidates=shuffle(g,hidden.length?hidden:spread);const p=candidates[0]||g.patrols.find(p=>p.floor===floor)||{x:0,z:-30,y:floor*HEIGHT,floor,ramp:null};g.guards.push({id:'security-'+(i+1),...p,yaw:Math.atan2(spawn.x-p.x,spawn.z-p.z),state:'patrol',alertTime:0,lostSight:0,searchTime:0,lastSeen:null,patrolTarget:null,path:[],repath:0});}
 updateNearby(g);return g;
}
function support(x,z,body,r=.48){
 const at=surfaceAt(x,z,body.floor,body.ramp||null);if(!at||at.blocked||!Number.isFinite(at.y)||!canStand(x,z,at.floor,r))return null;
 if(Math.abs(at.y-body.y)>.6)return null;
 if(body.ramp&&!at.ramp&&body.y>.55&&body.y<HEIGHT-.55)return null;
 return at;
}
function canPose(body,x,z,yaw,withCart){
 const at=support(x,z,body);if(!at)return null;
 if(withCart){const cx=x-Math.sin(yaw)*1.05,cz=z-Math.cos(yaw)*1.05,cart=support(cx,cz,{...body,...at},.54);if(!cart||Math.abs(cart.y-at.y)>.55)return null;}
 return at;
}
function moveBody(body,dx,dz,yaw,withCart=false){
 let moved=false;const whole=canPose(body,body.x+dx,body.z+dz,yaw,withCart);
 if(whole){body.x+=dx;body.z+=dz;Object.assign(body,whole);return Math.hypot(dx,dz)>.00001;}
 for(const [x,z]of [[dx,0],[0,dz]]){if(!x&&!z)continue;const at=canPose(body,body.x+x,body.z+z,yaw,withCart);if(at){body.x+=x;body.z+=z;Object.assign(body,at);moved=true;}}
 return moved;
}
function carryOnRamp(body,dt,withCart=false){
 const ramp=WORLD.ramps.find(r=>r.id===body.ramp);
 if(ramp)moveBody(body,0,(ramp.id==='ramp-left'?-.9:.9)*dt,body.yaw,withCart);
}
function turn(body,yaw,dt,withCart=false){const delta=Math.atan2(Math.sin(yaw-body.yaw),Math.cos(yaw-body.yaw)),next=body.yaw+delta*(1-Math.exp(-dt*15));if(canPose(body,body.x,body.z,next,withCart))body.yaw=next;}
function visibleItem(g,item,limit=2.2){const p=g.player;return !item.collected&&itemFloor(item)===p.floor&&Math.abs(p.y-itemFloor(item)*HEIGHT)<1.15&&distance(p,item)<=limit&&(!item.approach||clearSight(p.x,p.z,item.approach.x,item.approach.z,p.floor))&&clearSight(p.x,p.z,item.x,item.z,p.floor,item.supportId||item.obstacleId||item.shelfId);}
function checkoutSpot(g){const p=g.player;if(p.floor!==0||Math.abs(p.y)>1.1)return null;return (WORLD.checkouts||[WORLD.checkout]).filter(Boolean).find(spot=>distance(p,spot)<(spot.radius||2.4)&&canStand(p.x,p.z,0,.48)&&clearSight(p.x,p.z,spot.x,spot.z,0))||null;}
function updateNearby(g){const item=g.list.filter(item=>visibleItem(g,item)).sort((a,b)=>distance(a,g.player)-distance(b,g.player))[0];g.nearbyItemId=item?.id||null;g.checkoutReady=g.collected===g.total;g.nearCheckout=!!checkoutSpot(g);}
function guardSees(g,guard){const p=g.player,d=distance(p,guard);if(Math.abs(p.y-guard.y)>1.5||p.floor!==guard.floor||d>DIFFICULTIES[g.difficulty].range)return false;if(!clearSight(guard.x,guard.z,p.x,p.z,guard.floor))return false;if(d<2)return true;const dot=((p.x-guard.x)*(-Math.sin(guard.yaw))+(p.z-guard.z)*(-Math.cos(guard.yaw)))/Math.max(d,.00001);return dot>=Math.cos(DIFFICULTIES[g.difficulty].cone*Math.PI/360);}
function pickPatrol(g,guard){const options=g.patrols.filter(p=>p.floor===guard.floor&&distance(p,guard)>7);guard.patrolTarget=options[Math.floor(random(g)*options.length)]||g.patrols[0]||{...guard};guard.path=[];guard.repath=0;}
function follow(g,guard,target,speed,dt){
 if(!target)return;guard.repath-=dt;
 if(!guard.path.length||guard.repath<=0&&!guard.ramp){guard.path=findPath({x:guard.x,z:guard.z,floor:guard.floor,ramp:guard.ramp},target)||[];guard.repath=guard.state==='chase'?.45:1.1;}
 while(guard.path.length&&distance(guard,guard.path[0])<.18)guard.path.shift();const node=guard.path[0]||target,dx=node.x-guard.x,dz=node.z-guard.z,d=Math.hypot(dx,dz);if(d<.001)return;
 const yaw=Math.atan2(-dx,-dz);turn(guard,yaw,dt);const amount=Math.min(d,speed*dt);if(!moveBody(guard,dx/d*amount,dz/d*amount,guard.yaw)){guard.path=[];guard.repath=0;}
}
function updateGuards(g,dt){const config=DIFFICULTIES[g.difficulty],p=g.player;
 for(const guard of g.guards){guard.alertTime=Math.max(0,guard.alertTime-dt);if(guard.stun>0){guard.stun-=dt;continue;}const sees=g.elapsed>=g.safeUntil&&guardSees(g,guard),d=distance(p,guard);
  if(sees){if(guard.state!=='chase'){guard.state='chase';guard.alertTime=1;guard.path=[];guard.repath=0;emit(g,'alert',{guardId:guard.id,message:'Security spotted you! Sprint and break line of sight.'});}guard.lostSight=0;guard.lastSeen={x:p.x,z:p.z,y:p.y,floor:p.floor,ramp:p.ramp};}
  else if(guard.state==='chase'){guard.lostSight+=dt;if(guard.lostSight>=4&&d>8){guard.state='search';guard.searchTime=5;guard.path=[];guard.repath=0;emit(g,'lost',{guardId:guard.id,message:'Line of sight broken. Stay out of sight.'});}}
  if(guard.state==='chase')follow(g,guard,sees?p:guard.lastSeen,config.chaseSpeed,dt);
  else if(guard.state==='search'){guard.searchTime-=dt;follow(g,guard,guard.lastSeen,2.5,dt);if(guard.searchTime<=0){guard.state='patrol';guard.lastSeen=null;pickPatrol(g,guard);}}
  else{if(!guard.patrolTarget||distance(guard,guard.patrolTarget)<.8)pickPatrol(g,guard);follow(g,guard,guard.patrolTarget,2.1+(g.difficulty==='insane'?.4:0),dt);}
  carryOnRamp(guard,dt);
  if(g.elapsed>=g.safeUntil&&Math.abs(p.y-guard.y)<1.15&&p.floor===guard.floor&&distance(p,guard)<1.05&&clearSight(guard.x,guard.z,p.x,p.z,guard.floor)){
   // Easy and Medium let you off with a warning: +10 seconds, every guard stands down for a moment.
   if(g.warnings>0){g.warnings--;g.elapsed+=10;g.safeUntil=g.elapsed+4;for(const q of g.guards){if(q.state!=='patrol'){q.state='patrol';q.lastSeen=null;pickPatrol(g,q);}q.stun=q===guard?3:1;}emit(g,'warned',{guardId:guard.id,left:g.warnings,message:g.warnings?`Let off with a warning! +10 seconds. ${g.warnings} warning left.`:'Final warning! +10 seconds. Next time you’re out.'});return;}
   g.status='caught';g.caughtBy=guard.id;p.sprinting=false;p.moving=false;emit(g,'caught',{guardId:guard.id,message:'Caught by security. Your shopping spree is over.'});return;}
 }
}
export function step(g,input={},dt=1/60){
 if(g.status!=='playing'||input.paused)return;dt=Number.isFinite(dt)?clamp(dt,0,.05):0;if(!dt)return;g.elapsed+=dt;
 const p=g.player;let x=clamp(Number(input.x)||0,-1,1),z=clamp(Number(input.z)||0,-1,1),length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}
 const wantsSprint=input.sprint===true&&!p.exhausted&&p.stamina>0&&length>.01,speed=wantsSprint?8:4.5;
 if(length>.01)turn(p,Math.atan2(-x,-z),dt,true);const before={x:p.x,z:p.z};moveBody(p,x*speed*dt,z*speed*dt,p.yaw,true);carryOnRamp(p,dt,true);p.moving=distance(before,p)>.0001;p.sprinting=wantsSprint&&p.moving;
 if(p.sprinting){p.stamina=Math.max(0,p.stamina-25*dt);p.recoveryDelay=1;if(p.stamina===0){p.exhausted=true;p.sprinting=false;}}
 else{const recovery=Math.max(0,dt-p.recoveryDelay);p.recoveryDelay=Math.max(0,p.recoveryDelay-dt);p.stamina=Math.min(100,p.stamina+18*recovery);if(p.stamina>=20)p.exhausted=false;}
 updateNearby(g);updateGuards(g,dt);
}
export function interact(g){
 if(g.status!=='playing')return {ok:false,type:'nothing'};updateNearby(g);const p=g.player;
 if(g.nearCheckout){
  if(g.collected===g.total){g.status='won';p.sprinting=false;p.moving=false;emit(g,'won',{message:'CHECKOUT COMPLETE! Every item secured.'});return {ok:true,type:'won'};}
  const remaining=g.total-g.collected;emit(g,'checkout',{remaining,message:`Find ${remaining} more item${remaining===1?'':'s'} before checking out.`});return {ok:false,type:'checkout',remaining};
 }
 const item=g.list.find(a=>a.id===g.nearbyItemId);if(item){item.collected=true;g.collected++;emit(g,'collect',{itemId:item.id,message:`Collected ${item.name||item.label||'shopping item'}.`});updateNearby(g);return {ok:true,type:'collect',itemId:item.id};}
 emit(g,'notice',{message:'Move beside an item on your shopping list and press E.'});return {ok:false,type:'nothing'};
}
