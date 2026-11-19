import {CONFIG} from '../shared/simulation.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
/** Fixed storage, world-space droplets. Only actual snapshot travel creates a chase wake. */
export class CreatureWake {
  constructor(capacity=192,waterY=1.28){
    this.capacity=capacity;this.waterY=waterY;
    this.positions=new Float32Array(capacity*3);this.velocities=new Float32Array(capacity*3);
    this.life=new Float32Array(capacity);this.duration=new Float32Array(capacity);
    this.sizes=new Float32Array(capacity);this.opacity=new Float32Array(capacity);
    this.seed=417;this.reset();
  }
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  reset(){this.life.fill(0);this.opacity.fill(0);this.active=0;this.cursor=0;this.accumulator=0;this.clock=0;this.sampleTime=null;this.sampleX=this.sampleZ=0;this.speed=0;this.dx=0;this.dz=1;this.motionAge=10;this.nextRipple=0;this.ripple=0;this.wasIntense=false;this.rippleX=this.rippleZ=this.rippleYaw=0;}
  update(dt,monster,sampleTime,limit=96){
    dt=clamp(Number.isFinite(dt)?dt:0,0,.08);limit=clamp(limit|0,1,this.capacity);this.clock+=dt;this.motionAge+=dt;this.ripple=0;
    let teleported=false;
    if(monster&&Number.isFinite(sampleTime)&&sampleTime!==this.sampleTime){
      if(this.sampleTime!==null){
        const elapsed=sampleTime-this.sampleTime,dx=monster.x-this.sampleX,dz=monster.z-this.sampleZ,travel=Math.hypot(dx,dz);
        if(elapsed>0&&elapsed<=.3&&travel<=(CONFIG.maxMonsterSpeed||44)*elapsed+.12){this.speed=travel/elapsed;if(travel>.0001){this.dx=dx/travel;this.dz=dz/travel;}this.motionAge=0;}
        else{this.speed=0;this.motionAge=10;teleported=elapsed<0||travel>(CONFIG.maxMonsterSpeed||44)*.3+.12;}
      }
      this.sampleTime=sampleTime;this.sampleX=monster.x;this.sampleZ=monster.z;
    }
    if(!monster){this.speed=0;this.sampleTime=null;this.accumulator=0;}
    if(teleported){this.life.fill(0);this.opacity.fill(0);this.accumulator=0;}
    const fresh=this.motionAge<.16,speed=fresh?this.speed:0,charging=fresh&&monster?.targetId!=null&&monster.state==='windup',lunging=fresh&&monster?.targetId!=null&&monster.state==='lunge',chasing=(monster?.targetId!=null||monster?.shorePlayerId!=null)&&['pursue','shore'].includes(monster.state)&&speed>.3;
    const intense=chasing||lunging,intensity=clamp(speed/10,.35,1);
    if(intense&&!this.wasIntense)this.nextRipple=this.clock;this.wasIntense=intense;
    if(intense||charging){
      this.accumulator+=dt*(charging?18:(48+52*intensity)*(limit/96)**.25);
      const count=Math.min(16,Math.floor(this.accumulator));this.accumulator-=count;
      for(let n=0;n<count;n++){
        const i=this.cursor++%limit,j=i*3,side=(this.random()-.5)*2,spread=(monster.radius||1.8)*(.24+this.random()*.22),back=.22+this.random()*.65,force=charging?.45:1;
        this.positions[j]=monster.x-this.dx*back-this.dz*side*spread;this.positions[j+1]=this.waterY+.04;this.positions[j+2]=monster.z-this.dz*back+this.dx*side*spread;
        this.velocities[j]=-this.dx*(.9+intensity*1.5)-this.dz*side*1.2;this.velocities[j+1]=(3.2+intensity*1.8+this.random()*1.3)*force;this.velocities[j+2]=-this.dz*(.9+intensity*1.5)+this.dx*side*1.2;
        this.duration[i]=this.life[i]=charging?.34:.52+this.random()*.30;this.sizes[i]=charging?.045:.065+this.random()*.085;
      }
    }else this.accumulator=0;
    if(monster&&this.clock>=this.nextRipple){
      this.ripple=intense?2:charging?1:fresh&&monster.state==='patrol'&&speed<4?1:0;
      if(this.ripple){this.rippleX=monster.x-this.dx*(intense?.4:0);this.rippleZ=monster.z-this.dz*(intense?.4:0);this.rippleYaw=Math.atan2(-this.dx,-this.dz);this.nextRipple=this.clock+(intense?.15:charging?.65:2.6);}
    }
    this.active=0;
    for(let i=0;i<this.capacity;i++){
      if(i>=limit){this.life[i]=this.opacity[i]=0;continue;}
      if(this.life[i]<=0){this.opacity[i]=0;continue;}
      const j=i*3;this.life[i]-=dt;this.velocities[j+1]-=9.8*dt;this.positions[j]+=this.velocities[j]*dt;this.positions[j+1]+=this.velocities[j+1]*dt;this.positions[j+2]+=this.velocities[j+2]*dt;
      if(this.life[i]<=0||this.positions[j+1]<this.waterY){this.life[i]=this.opacity[i]=0;continue;}
      this.opacity[i]=Math.min(1,this.life[i]/.18)*.80;this.active++;
    }
    return this;
  }
}
