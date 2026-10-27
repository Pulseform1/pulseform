// The same deterministic vehicle simulation drives local play and the co-op server.
export const instructions='Steer with A/D or arrows. W/↑ accelerates; S/↓ brakes/reverses. Shift boosts, Space drifts. E returns your car to the road. Finish three laps before the city locks down.';
export const TRACK={rx:58,rz:38,width:7.2,laps:3,timeLimit:165};
const TAU=Math.PI*2,START=-Math.PI/2;
export function pointAt(a,offset=0){return {x:(TRACK.rx+offset)*Math.cos(a),z:(TRACK.rz+offset)*Math.sin(a),yaw:Math.atan2(-TRACK.rx*Math.sin(a),TRACK.rz*Math.cos(a))}}
export function initial(seed=1){return {seed,players:{},time:0,status:'playing',message:'Finish 3 laps. Charge boost by drifting through the corners.',progress:0,remaining:TRACK.timeLimit,teamLaps:0}}
export function join(s,id,index=0){const a=START-index*.045,p=pointAt(a,index%2?2:-2);s.players[id]={...p,y:.35,hp:100,speed:0,boost:100,distance:0,angle:a,lap:0,checkpoint:0,finished:false,hitUntil:0,resetAt:0,drifting:false,boosting:false,index}}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function trafficAt(time,index){const a=START+.65+index*TAU/6+time*(index%2?.115:.14);return {...pointAt(a,index%2?2.4:-2.4),angle:a}}
export function step(s,inputs,dt){
 if(s.status!=='playing')return;dt=clamp(dt,0,.08);s.time+=dt;s.remaining=Math.max(0,TRACK.timeLimit-s.time);let complete=0,total=0;
 for(const [id,p] of Object.entries(s.players)){
  const i=inputs[id]||{};if(p.finished){complete++;total+=1;continue;}
  const throttle=clamp(-(i.z||0),-1,1),steer=clamp(i.x||0,-1,1),oldAngle=p.angle;
  if(i.action&&s.time>=p.resetAt){const a=START+p.distance,q=pointAt(a,p.index%2?2:-2);p.x=q.x;p.z=q.z;p.yaw=q.yaw;p.speed=0;p.angle=a;p.resetAt=s.time+2;p.hp=Math.max(25,p.hp-8);}
  p.drifting=!!i.jump&&Math.abs(p.speed)>8&&Math.abs(steer)>.15;
  p.boosting=!!i.sprint&&p.boost>1&&p.speed>4;
  p.boost=clamp(p.boost+(p.boosting?-31:p.drifting?24:7)*dt,0,100);
  const acceleration=throttle>0?throttle*(p.boosting?21:14):throttle*21;
  p.speed+=acceleration*dt;p.speed*=Math.exp(-(throttle===0?.58:.17)*dt);p.speed=clamp(p.speed,-7,p.boosting?34:24);
  // Speed-dependent steering gives the cars weight while retaining touch-friendly handling.
  p.yaw-=steer*(.44+Math.min(Math.abs(p.speed),25)*.029)*(p.drifting?1.42:1)*dt*Math.sign(p.speed||1);
  p.x+=Math.sin(p.yaw)*p.speed*dt;p.z+=Math.cos(p.yaw)*p.speed*dt;
  const angle=Math.atan2(p.z/TRACK.rz,p.x/TRACK.rx),center=pointAt(angle),nx=Math.cos(angle),nz=Math.sin(angle),off=(p.x-center.x)*nx+(p.z-center.z)*nz;
  if(Math.abs(off)>TRACK.width-1){const edge=Math.sign(off)*(TRACK.width-1);p.x=center.x+nx*edge;p.z=center.z+nz*edge;p.speed*=Math.exp(-3.2*dt);if(s.time>p.hitUntil){p.hp=Math.max(10,p.hp-5);p.hitUntil=s.time+.55;}}
  p.angle=angle;let da=angle-oldAngle;while(da>Math.PI)da-=TAU;while(da<-Math.PI)da+=TAU;
  if(Math.abs(da)<.2)p.distance=clamp(p.distance+da,0,TRACK.laps*TAU);
  const lap=Math.floor(p.distance/TAU);if(lap>p.lap){p.hp=clamp(p.hp+20,0,100);p.boost=100;}p.lap=lap;p.checkpoint=Math.floor(p.distance/(Math.PI/2));
  // AI delivery traffic is solid, predictable, and shared by every client.
  for(let n=0;n<6;n++){const t=trafficAt(s.time,n);if(Math.hypot(p.x-t.x,p.z-t.z)<2.3&&s.time>p.hitUntil){p.speed*=.4;p.hp=Math.max(10,p.hp-10);p.hitUntil=s.time+.8;}}
  if(p.distance>=TRACK.laps*TAU-.025){p.finished=true;p.speed=0;complete++;}
  total+=Math.min(1,p.distance/(TAU*TRACK.laps));
 }
 const count=Object.keys(s.players).length;s.progress=count?total/count:0;s.teamLaps=Object.values(s.players).reduce((a,p)=>a+Math.min(3,p.lap),0);
 if(count&&complete===count){s.status='won';s.message='CITY CIRCUIT CLEARED — every driver made it home.';s.progress=1;}
 else if(s.remaining<=0){s.status='lost';s.message='CITY LOCKDOWN. Restart together and beat the clock.';}
 else s.message=complete?`${complete}/${count} drivers home. Bring the whole crew across the finish.`:'Finish 3 laps · Drift to recharge boost · Stay inside the glowing rails';
}
