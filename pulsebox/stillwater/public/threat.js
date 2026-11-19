import {CONFIG} from '../shared/simulation.js';
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:0));
/** Presentation only. A single local threat clock drives both sound and camera. */
export class ThreatFeedback {
  constructor(){this.output={active:false,intensity:0,bpm:0,pulse:0,beat:0,distance:Infinity,tremorPhase:0,motion:1};this.reset();}
  reset(){this.intensity=0;this.phase=0;this.beatAge=10;this.second=false;this.last=null;this.actorUid=null;this.motionUntil=0;this.clock=0;this.tremorPhase=0;Object.assign(this.output,{active:false,intensity:0,bpm:0,pulse:0,beat:0,distance:Infinity,tremorPhase:0,motion:1});return this.output;}
  update({player,monster,active=false,dt=0,sampleTime=0,reduced=false}={}){
    dt=clamp(dt,0,.05);this.clock+=dt;const out=this.output;out.beat=0;
    const eligible=active&&player?.alive&&player.exposed&&!player.safe&&monster?.targetId===player.id&&['pursue','windup','lunge'].includes(monster.state);
    if(!eligible)return this.reset();
    const uid=monster.uid||monster.id||'single';if(this.actorUid!==uid){this.reset();this.actorUid=uid;}
    const distance=Math.hypot(monster.x-player.x,monster.z-player.z),reach=(monster.radius||1.8)+1.05;
    if(this.last&&sampleTime!==this.last.t){
      const elapsed=sampleTime-this.last.t,dx=monster.x-this.last.x,dz=monster.z-this.last.z;
      if(elapsed>0&&elapsed<.5&&Math.hypot(dx,dz)<(CONFIG.maxMonsterSpeed||44)*elapsed+.12){
        const toward=dx*(player.x-monster.x)+dz*(player.z-monster.z);
        if(toward>.001)this.motionUntil=this.clock+.25;
      }else this.motionUntil=0;
    }
    if(!this.last)this.last={x:monster.x,z:monster.z,t:sampleTime};
    if(sampleTime!==this.last.t){this.last.x=monster.x;this.last.z=monster.z;this.last.t=sampleTime;}
    const closing=this.motionUntil>this.clock||monster.state==='windup'||monster.state==='lunge';
    const target=closing?clamp((15-distance)/(15-reach)):0;
    this.intensity+=(target-this.intensity)*(1-Math.exp(-dt*(target>this.intensity?12:18)));
    if(distance>18||this.intensity<.025){out.active=false;out.intensity=out.bpm=out.pulse=0;this.phase=0;this.beatAge=10;return out;}
    if(!out.active){this.phase=1;this.second=false;}
    this.tremorPhase=(this.tremorPhase+dt*(15+this.intensity*24))%(Math.PI*200);out.tremorPhase=this.tremorPhase;out.motion=reduced?.28:1;out.active=true;out.intensity=this.intensity;out.distance=distance;out.bpm=72+122*this.intensity;
    this.phase+=dt*out.bpm/60;this.beatAge+=dt;
    if(this.phase>=1){this.phase%=1;this.beatAge=0;this.second=false;out.beat=1;}
    else if(!this.second&&this.beatAge>=.12){this.second=true;out.beat=.5;}
    out.pulse=(Math.exp(-this.beatAge/ .065)+.42*Math.exp(-Math.abs(this.beatAge-.12)/.04))*this.intensity*(reduced?.28:1);
    return out;
  }
}
