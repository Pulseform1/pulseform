const COURSE=[
 [0,0,0,3.3],[0,0,-6,2.1],[3,.5,-11,2],[-1,.5,-16,2.1],[-4,1,-21,2],[0,1,-27,3,1],
 [4,1.5,-33,2],[1,1.5,-39,2,0,1],[-3,2,-44,2],[-5,2,-50,2],[0,2.5,-55,2],[3,2.5,-61,3,2],
 [0,3,-67,2],[-4,3,-73,2,0,1],[-1,3.5,-79,2],[4,3.5,-84,2],[2,4,-90,2],[-2,4,-96,3,3],[0,4,-103,3.4]
];
export function platformAt(p,time){return {x:p.x+(p.moving?Math.sin(time*.75+p.id)*1.35:0),y:p.y,z:p.z};}
export function initial(seed=1){return {players:{},time:0,status:'playing',message:'Reach the first beacon. Jump across the islands; dash in midair.',progress:0,checkpoint:0,checkpointIsland:0,falls:0,seed,platforms:COURSE.map(([x,y,z,r,checkpoint=0,moving=0],id)=>({id,x,y,z,r,checkpoint,moving})),shards:COURSE.slice(1,-1).map((p,i)=>({id:i,x:p[0],y:p[1]+1.1,z:p[2],platform:i+1,collected:false})),collected:0,total:17};}
export function join(s,id,index=0){const home=s.platforms[s.checkpointIsland];s.players[id]={x:home.x+(index%2? .65:-.65),y:home.y,z:home.z+(index>1?.65:0),yaw:0,hp:100,vx:0,vy:0,vz:0,grounded:true,ground:s.checkpointIsland,coyote:.12,jumpHeld:false,actionHeld:false,dashReady:true,dashTime:0,cooldown:0,trail:0,respawns:0};}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function step(s,inputs,dt){if(s.status!=='playing')return;dt=clamp(dt,0,.05);const previous=s.time;s.time+=dt;
 for(const [id,p] of Object.entries(s.players)){
  const input=inputs[id]||{},ix=Number(input.x)||0,iz=Number(input.z)||0,len=Math.hypot(ix,iz),x=len>1?ix/len:ix,z=len>1?iz/len:iz;
  p.cooldown=Math.max(0,p.cooldown-dt);p.trail=Math.max(0,p.trail-dt);p.coyote=p.grounded?.12:Math.max(0,p.coyote-dt);
  if(p.grounded&&p.ground!==null){const platform=s.platforms[p.ground],a=platformAt(platform,previous),b=platformAt(platform,s.time);p.x+=b.x-a.x;}
  if(input.jump&&!p.jumpHeld&&p.coyote>0){p.vy=9.2;p.grounded=false;p.ground=null;p.coyote=0;}
  if(input.action&&!p.actionHeld&&p.dashReady&&p.cooldown<=0){const d=Math.hypot(x,z)||1;p.vx=(len?x/d:0)*15;p.vz=(len?z/d:-1)*15;p.vy=Math.max(p.vy,1.6);p.dashTime=.17;p.trail=.35;p.dashReady=false;p.cooldown=.75;}
  p.jumpHeld=!!input.jump;p.actionHeld=!!input.action;
  if(p.dashTime>0){p.dashTime=Math.max(0,p.dashTime-dt);}else{const speed=input.sprint?7:5.5,blend=1-Math.exp(-dt*(p.grounded?15:6));p.vx+=(x*speed-p.vx)*blend;p.vz+=(z*speed-p.vz)*blend;p.vy-=22*dt;}
  const oldY=p.y;p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;p.grounded=false;p.ground=null;
  for(const platform of s.platforms){const at=platformAt(platform,s.time);if(p.vy<=0&&oldY>=at.y-.08&&p.y<=at.y&&Math.hypot(p.x-at.x,p.z-at.z)<platform.r+.16){p.y=at.y;p.vy=0;p.grounded=true;p.ground=platform.id;p.dashReady=true;
   if(platform.checkpoint>s.checkpoint){s.checkpoint=platform.checkpoint;s.checkpointIsland=platform.id;s.message=`BEACON ${s.checkpoint} LIT — your whole team can respawn here.`;s.alert=s.time;}
   break;}}
  if(len>.1)p.yaw=Math.atan2(-p.vx,-p.vz);
  for(const shard of s.shards){if(shard.collected)continue;const platform=s.platforms[shard.platform],at=platformAt(platform,s.time);if(Math.hypot(p.x-at.x,p.z-at.z)<1.1&&Math.abs(p.y-platform.y)<2.2){shard.collected=true;s.collected++;}}
  if(p.y<-10){const home=s.platforms[s.checkpointIsland];Object.assign(p,{x:home.x,y:home.y+.1,z:home.z,vx:0,vy:0,vz:0,grounded:false,ground:null,dashReady:true,dashTime:0});p.respawns++;s.falls++;}
  const last=s.platforms.at(-1);if(s.checkpoint>=3&&p.grounded&&p.ground===last.id&&Math.hypot(p.x-last.x,p.z-last.z)<1.8){s.status='won';s.progress=1;s.message=`SUMMIT REACHED · ${s.collected}/${s.total} sky crystals · ${s.falls} team falls`;s.alert=s.time;}
 }
 if(s.status==='playing'){const furthest=Math.max(0,...Object.values(s.players).map(p=>-p.z));s.progress=clamp(furthest/103,0,.98);const objective=s.checkpoint===3?'Reach the summit gate':`Reach beacon ${s.checkpoint+1} / 3`;s.message=`${objective} · ${s.collected}/${s.total} crystals · ACTION: air dash`;}
}
