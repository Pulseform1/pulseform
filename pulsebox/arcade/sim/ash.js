/** ASHFALL ARENA — shared deterministic 1–4 player combat simulation. */
export const instructions = 'Move with arrows / WASD. Hold USE to fire at the closest enemy. JUMP dodges. Stand near a fallen teammate and hold USE to revive. Survive five waves; upgrade at the central forge between waves.';
export const PILLARS = [{x:-7,z:-5,r:1.1},{x:7,z:-5,r:1.1},{x:-7,z:5,r:1.1},{x:7,z:5,r:1.1}];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function event(s,cue){s.event=(s.event||0)+1;s.cue=cue;}
function burst(s,x,z,color='orange',amount=1){s.fx.push({id:++s.serial,x,z,color,t:.45,amount});if(s.fx.length>24)s.fx.shift();}
export function initial(seed=1){return {seed:seed>>>0,players:{},time:0,status:'playing',phase:'intermission',wave:0,countdown:3,enemies:[],bullets:[],pickups:[],fx:[],serial:0,kills:0,message:'THE FORGE AWAKENS · Move, hold USE to fire, JUMP to dodge.',progress:0,event:0,cue:'',vents:[{x:-3,z:3},{x:3,z:-3}]};}
export function join(s,id,index=0){const a=index*Math.PI*.5;s.players[id]={x:Math.cos(a)*2,z:Math.sin(a)*2,y:0,yaw:0,hp:100,maxHp:100,color:index%4,dead:false,fire:0,dodge:0,dodgeCooldown:0,dx:0,dz:-1,damage:20,upgrade:0,revive:0,hit:0,shot:0};}
function solid(p,r=.5){let d=Math.hypot(p.x,p.z);if(d>17){p.x*=17/d;p.z*=17/d;}for(const b of PILLARS){const x=p.x-b.x,z=p.z-b.z,l=Math.hypot(x,z),min=b.r+r;if(l<min){p.x=b.x+(l?x/l:1)*min;p.z=b.z+(l?z/l:0)*min;}}}
function spawnWave(s){s.wave++;s.phase='combat';const n=Object.keys(s.players).length,counts=[5,7,9,11,9],count=counts[s.wave-1]+Math.max(0,n-1)*2;for(let i=0;i<count;i++){const a=(i/count)*Math.PI*2+random(s)*.3;const kind=s.wave===5&&i===0?'boss':s.wave>1&&i%3===0?'brute':'ember';const hp=kind==='boss'?650+200*(n-1):kind==='brute'?90+18*s.wave:32+9*s.wave;const r=15.6;s.enemies.push({id:++s.serial,kind,x:Math.cos(a)*r,z:Math.sin(a)*r,hp,maxHp:hp,yaw:0,cooldown:1,hit:0,charge:0,slam:5});}event(s,'wave');}
function wound(s,p,damage){if(p.dodge>0||p.dead)return;p.hp=Math.max(0,p.hp-damage);p.hit=.25;event(s,'damage');if(!p.hp){p.dead=true;p.revive=0;burst(s,p.x,p.z,'blue',1.5);}}
function movePlayer(s,p,input,dt){let x=clamp(Number(input.x)||0,-1,1),z=clamp(Number(input.z)||0,-1,1),d=Math.hypot(x,z);if(d>1){x/=d;z/=d;}if(d>.05){p.dx=x;p.dz=z;p.yaw=Math.atan2(x,z);}
 p.dodgeCooldown=Math.max(0,p.dodgeCooldown-dt);p.dodge=Math.max(0,p.dodge-dt);p.hit=Math.max(0,p.hit-dt);p.shot=Math.max(0,p.shot-dt);p.fire=Math.max(0,p.fire-dt);
 if(input.jump&&p.dodgeCooldown<=0){p.dodge=.24;p.dodgeCooldown=1.7;event(s,'dodge');}
 const speed=p.dodge>0?14:input.sprint?6:4.7;p.x+=(p.dodge>0?p.dx:x)*speed*dt;p.z+=(p.dodge>0?p.dz:z)*speed*dt;solid(p);p.y=p.dodge>0?.1:0;
 if(input.action&&s.phase==='combat'&&p.fire<=0){let target,dist=Infinity;for(const e of s.enemies){const d=Math.hypot(e.x-p.x,e.z-p.z);if(d<dist){dist=d;target=e;}}if(target){const dx=target.x-p.x,dz=target.z-p.z,l=Math.hypot(dx,dz)||1;p.yaw=Math.atan2(dx,dz);p.fire=Math.max(.14,.27-p.upgrade*.025);p.shot=.08;s.bullets.push({id:++s.serial,x:p.x,z:p.z,vx:dx/l*27,vz:dz/l*27,damage:p.damage,life:1.4,owner:p.color});if(s.time-(s.lastShot||0)>.12){s.lastShot=s.time;event(s,'shot');}}}
 if(input.action&&s.phase==='intermission'&&Math.hypot(p.x,p.z)<2.5&&p.upgradedWave!==s.wave){p.upgradedWave=s.wave;p.upgrade++;p.damage+=6;p.hp=p.maxHp;p.maxHp+=5;burst(s,p.x,p.z,'blue',1.2);event(s,'upgrade');}
}
export function step(s,inputs={},dt=1/30){if(s.status!=='playing')return;dt=clamp(dt,0,.1);s.time+=dt;for(const fx of s.fx)fx.t-=dt;s.fx=s.fx.filter(f=>f.t>0);for(const p of Object.values(s.players)){if(!p.dead)movePlayer(s,p,inputs[Object.keys(s.players).find(id=>s.players[id]===p)]||{},dt);}
 const alive=Object.entries(s.players).filter(([,p])=>!p.dead);if(!alive.length&&Object.keys(s.players).length){s.status='lost';s.message='THE FIRE CLAIMED YOUR TEAM · Retry the run.';return;}
 // Revive in combat requires a living partner within reach and a sustained USE hold.
 for(const [id,p] of Object.entries(s.players)){if(!p.dead)continue;const helper=alive.find(([other,q])=>inputs[other]?.action&&Math.hypot(q.x-p.x,q.z-p.z)<2);p.revive=helper?p.revive+dt:Math.max(0,p.revive-dt*.5);if(p.revive>=2.5){p.dead=false;p.hp=55;p.revive=0;p.dodge=.9;burst(s,p.x,p.z,'blue',1.7);event(s,'revive');}}
 if(s.phase==='intermission'){s.countdown-=dt;s.message=s.wave===0?'WAVE 1 APPROACHING · Hold USE to fire. JUMP to dodge.':`WAVE ${s.wave} CLEARED · ${Math.ceil(s.countdown)}s · Hold USE at the blue forge for an upgrade.`;if(s.countdown<=0)spawnWave(s);return;}
 for(const e of s.enemies){e.hit=Math.max(0,e.hit-dt);e.cooldown-=dt;const target=alive.reduce((best,[,p])=>!best||Math.hypot(p.x-e.x,p.z-e.z)<Math.hypot(best.x-e.x,best.z-e.z)?p:best,null);if(!target)continue;let dx=target.x-e.x,dz=target.z-e.z,d=Math.hypot(dx,dz)||1;e.yaw=Math.atan2(dx,dz);const speed=e.kind==='boss'?1.75:e.kind==='brute'?1.55:2.15+s.wave*.13;
 // A circular tangent steers enemies around the ruined columns.
 let vx=dx/d,vz=dz/d;for(const b of PILLARS){const bx=e.x-b.x,bz=e.z-b.z,bd=Math.hypot(bx,bz);if(bd<2.7){vx+=bx/(bd||1)*1.4;vz+=bz/(bd||1)*1.4;}}
 const v=Math.hypot(vx,vz)||1;e.x+=vx/v*speed*dt;e.z+=vz/v*speed*dt;solid(e,e.kind==='boss'?1.2:.55);
 if(d<(e.kind==='boss'?2:1.05)&&e.cooldown<=0){wound(s,target,e.kind==='boss'?28:e.kind==='brute'?18:10);e.cooldown=e.kind==='boss'?1:.8;burst(s,target.x,target.z,'orange');}
 if(e.kind==='boss'){e.slam-=dt;if(e.slam<=0){for(const [,p]of alive)if(Math.hypot(p.x-e.x,p.z-e.z)<5)wound(s,p,28);burst(s,e.x,e.z,'orange',3);e.slam=7;event(s,'slam');}}
 }
 for(const b of s.bullets){b.x+=b.vx*dt;b.z+=b.vz*dt;b.life-=dt;const enemy=s.enemies.find(e=>e.hp>0&&Math.hypot(e.x-b.x,e.z-b.z)<(e.kind==='boss'?1.4:.8));if(enemy){enemy.hp-=b.damage;enemy.hit=.12;b.life=0;burst(s,b.x,b.z,'orange',.5);}if(PILLARS.some(p=>Math.hypot(p.x-b.x,p.z-b.z)<p.r))b.life=0;}
 s.bullets=s.bullets.filter(b=>b.life>0&&Math.hypot(b.x,b.z)<19);
 for(const e of s.enemies)if(e.hp<=0){s.kills++;burst(s,e.x,e.z,'orange',e.kind==='boss'?3:1);if(random(s)<.35)s.pickups.push({id:++s.serial,x:e.x,z:e.z,t:18});}
 s.enemies=s.enemies.filter(e=>e.hp>0);for(const item of s.pickups){item.t-=dt;const p=alive.find(([,p])=>p.hp<p.maxHp&&Math.hypot(p.x-item.x,p.z-item.z)<1.2)?.[1];if(p){p.hp=Math.min(p.maxHp,p.hp+25);item.t=0;event(s,'heal');}}s.pickups=s.pickups.filter(p=>p.t>0);
 const ventPhase=s.time%8;for(const [,p]of alive)if(ventPhase>6&&ventPhase<6+dt*1.2&&s.vents.some(v=>Math.hypot(p.x-v.x,p.z-v.z)<2.3))wound(s,p,18);
 s.progress=clamp((s.wave-1+(1-s.enemies.length/(s.wave===1?5:s.wave===2?7:s.wave===3?9:11)))/5,0,.99);
 s.message=`WAVE ${s.wave} / 5 · ${s.enemies.length} HOSTILES · ${s.kills} ELIMINATED${s.wave===5?' · DESTROY THE CINDER KING':''}`;
 if(!s.enemies.length){s.bullets=[];if(s.wave>=5){s.status='won';s.progress=1;s.message='THE CINDER KING HAS FALLEN · Your team owns the arena.';event(s,'win');}else{s.phase='intermission';s.countdown=8;for(const p of Object.values(s.players)){p.dead=false;p.hp=Math.min(p.maxHp,p.hp+35);p.revive=0;}event(s,'clear');}}
}
