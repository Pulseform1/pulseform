import {getRoom,roomIndexAt,CONFIG,getPlatformPose} from '../shared/simulation.js';
const distanceToRect=(x,z,r)=>Math.hypot(x-Math.max(r.x-r.w/2,Math.min(r.x+r.w/2,x)),z-Math.max(r.z-r.d/2,Math.min(r.z+r.d/2,z)));
/** Actual free-water space for articulated poses and validated serpent trails. */
export class CreatureSpace {
  constructor(){this.reset();}
  reset(){this.key='';this.index=-1;this.rectangles=[];this.width=20;this.trail=[];this.context={availableRadius:0,trail:this.trail};this.lastTime=-1;this.motionSample=null;this.distanceTravelled=0;}
  prepare(seed,difficulty,z,world=null){
    const key=String(seed)+'/'+difficulty,index=roomIndexAt(z);
    if(key===this.key&&index===this.index){this.refreshDynamic(world);return;}
    if(key!==this.key){this.trail.length=0;this.lastTime=-1;}
    this.key=key;this.index=index;this.rectangles=[];this.dynamic=[];this.width=getRoom(seed,index,difficulty).width;
    for(let i=Math.max(0,index-1);i<=index+1;i++){const room=getRoom(seed,i,difficulty);for(const p of room.platforms){if(p.motion||p.kind==='sink'||p.kind==='spinner'){const bounds={...p};this.dynamic.push({definition:p,bounds});this.rectangles.push(bounds);}else this.rectangles.push(p);}for(const o of room.obstacles)this.rectangles.push(o);for(const side of [-1,1])this.rectangles.push({x:side*(room.width/2+3),z:(room.startZ+room.endZ)/2,w:6,d:CONFIG.roomLength});}
    this.refreshDynamic(world);
  }
  refreshDynamic(world){for(const entry of this.dynamic||[]){const pose=getPlatformPose(world||{seed:this.key.split('/')[0],difficulty:'normal',time:0,platformStates:{}},entry.definition,world?.platformTime??world?.time??0);const c=Math.abs(Math.cos(pose.yaw||0)),s=Math.abs(Math.sin(pose.yaw||0));Object.assign(entry.bounds,{x:pose.x,z:pose.z,w:pose.w*c+pose.d*s,d:pose.d*c+pose.w*s,active:pose.active!==false&&pose.y>0});}}
  clearance(x,z){
    let radius=Math.min(this.width/2-Math.abs(x),1.85-z,6);
    for(const r of this.rectangles)if(r.active!==false)radius=Math.min(radius,distanceToRect(x,z,r));
    return Math.max(.01,radius-.065);
  }
  sample(m,seed,difficulty,time=0,physics={radius:.44},world=null){
    this.prepare(seed,difficulty,m.z,world);const trail=this.trail,old=trail[0];
    const c=this.context,previous=this.motionSample,maxSpeed=CONFIG.maxMonsterSpeed||44,continuity=previous?maxSpeed*Math.max(0,Math.min(.3,time-previous.t))+.12:0;c.sampleDt=0;
    if(!previous||time<previous.t||Math.hypot(m.x-previous.x,m.z-previous.z)>continuity){this.motionSample={x:m.x,z:m.z,t:time,yaw:m.yaw||0,speed:0};this.distanceTravelled=0;c.motionSpeed=c.turnRate=c.acceleration=0;}
    else if(time>previous.t){const elapsed=time-previous.t,travel=Math.hypot(m.x-previous.x,m.z-previous.z),speed=elapsed<.5?Math.min(maxSpeed,travel/elapsed):0;this.distanceTravelled+=elapsed<.5?travel:0;c.motionSpeed=speed;c.sampleDt=elapsed;c.acceleration=Math.max(-30,Math.min(30,(speed-previous.speed)/elapsed));const turn=Math.atan2(Math.sin((m.yaw||0)-previous.yaw),Math.cos((m.yaw||0)-previous.yaw));c.turnRate=Math.max(-4,Math.min(4,turn/elapsed));Object.assign(previous,{x:m.x,z:m.z,t:time,yaw:m.yaw||0,speed});}
    c.distanceTravelled=this.distanceTravelled;
    if(time<this.lastTime||old&&Math.hypot(m.x-old.x,m.z-old.z)>maxSpeed*Math.max(0,Math.min(.3,time-this.lastTime))+.12)trail.length=0;
    this.lastTime=time;
    if(!trail.length)trail.push({x:m.x,z:m.z});
    else if(Math.hypot(m.x-trail[0].x,m.z-trail[0].z)>.025){
      const previous=trail[0],distance=Math.hypot(m.x-previous.x,m.z-previous.z),steps=Math.ceil(distance/.08);let safe=true;
      for(let i=1;i<=steps;i++){const t=i/steps;if(this.clearance(previous.x+(m.x-previous.x)*t,previous.z+(m.z-previous.z)*t)<Math.max(.335,physics.radius||.44)){safe=false;break;}}
      if(!safe)trail.length=0;
      trail.unshift({x:m.x,z:m.z});
      let total=0;for(let i=1;i<trail.length;i++){total+=Math.hypot(trail[i].x-trail[i-1].x,trail[i].z-trail[i-1].z);if(total>20.2){trail.length=i+1;break;}}
      if(trail.length>600)trail.length=600;
    }
    this.context.availableRadius=this.clearance(m.x,m.z);return this.context;
  }
}
