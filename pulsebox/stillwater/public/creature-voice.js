import {CREATURE_ACOUSTICS} from './creature-audio.js';
/** Original nonverbal creature vocal, prepared once for the selected species. */
export function synthesizeCreatureVocal(id,sampleRate=24000){
  const profile=CREATURE_ACOUSTICS[id]||CREATURE_ACOUSTICS.dredge;
  let seed=2166136261;for(const c of id)seed=Math.imul(seed^c.charCodeAt(0),16777619);
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
  const duration=.74,samples=new Float32Array(Math.ceil(duration*sampleRate)),base=75+profile.tone*.63,character=(seed>>>0)%7;
  let phase=0,air=0,sum=0;
  for(let i=0;i<samples.length;i++){
    const t=i/sampleRate,u=t/duration,bend=.70+Math.sin(Math.min(1,u*2)*Math.PI)*.68-u*.24;
    const f0=base*bend*(1+.026*Math.sin(t*(31+character*4))+.012*(random()-.5));phase+=f0/sampleRate;
    const formant1=390+profile.tone*1.45+180*Math.sin(u*Math.PI),formant2=1150+character*105-u*330;
    let throat=0;
    for(let h=1;h<=17;h++){
      const frequency=f0*h,band=.10/h+Math.exp(-(((frequency-formant1)/210)**2))*.48+Math.exp(-(((frequency-formant2)/380)**2))*.23;
      throat+=Math.sin(phase*Math.PI*2*h+Math.sin(t*49)*.08*h)*band;
    }
    air=air*.68+(random()*2-1)*.32;
    const rough=(.82+.18*Math.sin(t*(43+character*9)))*(.88+.12*Math.sin(t*133));
    const envelope=Math.min(1,t/.024)*Math.max(0,1-u)**.72;
    const value=Math.tanh(throat*1.25)*rough*envelope+air*.22*envelope;samples[i]=value;sum+=value;
  }
  const mean=sum/samples.length;let peak=0;for(let i=0;i<samples.length;i++){samples[i]-=mean;peak=Math.max(peak,Math.abs(samples[i]));}
  if(peak)for(let i=0;i<samples.length;i++)samples[i]*=.82/peak;
  return {samples,sampleRate,duration};
}
