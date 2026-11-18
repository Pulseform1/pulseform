// Shared, deterministic puzzle simulation used by solo play and the co-op server.
export const instructions='Move with arrows/WASD. Drag to look. USE picks up/drops cubes and rotates prisms. Match the floor socket, redirect the laser, then reverse the magnetic lift.';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const gates=[-10,-30,-50];
export function initial(seed=1){return {
 seed,time:0,status:'playing',progress:0,stage:0,message:'01 / MASS: carry the amber cube onto the illuminated floor socket.',
 players:{},gravity:false,mirrors:[1,1],beam:[],beamActive:true,event:0,
 cubes:[{id:'mass',x:-4,y:.65,z:-2,vy:0,owner:null},{id:'lift',x:-4,y:.65,z:-39,vy:0,owner:null}],
 solved:[false,false,false],door:[0,0,0]
}}
export function join(s,id,index=0){const z=[5,-12,-32,-51][Math.min(s.stage,3)];s.players[id]={x:(index%4-1.5)*1.1,y:0,z,yaw:0,pitch:0,vy:0,hp:100,dead:false,carrying:null,actionHeld:false,jumpHeld:false,invulnerable:0,hint:'',steps:0}}
function project(a,b,p){const x=b.x-a.x,z=b.z-a.z,t=clamp(((p.x-a.x)*x+(p.z-a.z)*z)/(x*x+z*z||1),0,1);return Math.hypot(p.x-a.x-x*t,p.z-a.z-z*t)}
function laser(s){
 const a={x:-7,y:1.2,z:-20},m1={x:0,y:1.2,z:-20},direction1=s.mirrors[0]===0?-1:1;
 const segments=[[a,m1]];
 if(direction1===1)segments.push([m1,{x:0,y:1.2,z:-11}]);
 else{const m2={x:0,y:1.2,z:-26};segments.push([m1,m2]);segments.push([m2,{x:s.mirrors[1]===0?7:-8.3,y:1.2,z:-26}])}
 s.beam=segments;s.beamActive=!s.solved[1];
 if(s.mirrors[0]===0&&s.mirrors[1]===0)s.solved[1]=true;
}
function blocked(s,x,z,r=.36){
 if(x< -8.5+r||x>8.5-r||z>7.5-r||z< -55.5+r)return true;
 return gates.some((g,i)=>Math.abs(z-g)<r+.16&&(!s.solved[i]||Math.abs(x)>2.05-r));
}
function move(s,p,dx,dz,r=.36){if(!blocked(s,p.x+dx,p.z,r))p.x+=dx;if(!blocked(s,p.x,p.z+dz,r))p.z+=dz}
function release(s,p,id){const cube=s.cubes.find(c=>c.owner===id);if(cube){cube.owner=null;cube.vy=0;p.carrying=null}}
export function step(s,inputs,dt){
 if(s.status!=='playing')return;dt=clamp(dt,0,.1);s.time+=dt;
 for(const c of s.cubes)if(c.owner&&!s.players[c.owner])c.owner=null;
 for(const [id,p]of Object.entries(s.players)){
  const i=inputs[id]||{};p.yaw=Number.isFinite(i.yaw)?i.yaw:p.yaw;p.pitch=Number.isFinite(i.pitch)?i.pitch:0;
  p.invulnerable=Math.max(0,p.invulnerable-dt);const x=clamp(Number(i.x)||0,-1,1),z=clamp(Number(i.z)||0,-1,1),n=Math.max(1,Math.hypot(x,z)),speed=i.sprint?5.2:3.5;
  const dx=(x*Math.cos(p.yaw)+z*Math.sin(p.yaw))/n*speed*dt,dz=(-x*Math.sin(p.yaw)+z*Math.cos(p.yaw))/n*speed*dt;
  move(s,p,dx,dz);p.steps+=Math.hypot(dx,dz);
  if(i.jump&&!p.jumpHeld&&p.y===0)p.vy=4.8;p.jumpHeld=!!i.jump;p.vy-=15*dt;p.y=Math.max(0,p.y+p.vy*dt);if(!p.y)p.vy=0;
  p.hint='';let nearby=[];
  for(const c of s.cubes)if(!c.owner&&Math.abs(c.y-(p.y+.65))<1.6)nearby.push({kind:'cube',item:c,d:distance(p,c)});
  [{x:0,z:-20},{x:0,z:-26}].forEach((m,j)=>nearby.push({kind:'mirror',index:j,d:distance(p,m)}));
  nearby.push({kind:'gravity',d:distance(p,{x:-4,z:-44})});nearby=nearby.filter(a=>a.d<2.25).sort((a,b)=>a.d-b.d);const target=nearby[0];
  if(p.carrying)p.hint='USE — drop cube onto its illuminated socket';
  else if(target)p.hint=target.kind==='cube'?'USE — pick up '+(target.item.id==='mass'?'amber mass':'magnetic')+' cube':target.kind==='mirror'?'USE — rotate laser prism':'USE — '+(s.gravity?'restore normal gravity':'reverse magnetic gravity');
  if(i.action&&!p.actionHeld){
   if(p.carrying)release(s,p,id);
   else if(target?.kind==='cube'){target.item.owner=id;target.item.vy=0;p.carrying=target.item.id;s.event++}
   else if(target?.kind==='mirror'&&!s.solved[1]){s.mirrors[target.index]=1-s.mirrors[target.index];s.event++}
   else if(target?.kind==='gravity'){s.gravity=!s.gravity;s.event++}
  }
  p.actionHeld=!!i.action;
 }
 for(const c of s.cubes){
  if(c.owner){const p=s.players[c.owner];const x=p.x-Math.sin(p.yaw)*1.25,z=p.z-Math.cos(p.yaw)*1.25;if(!blocked(s,x,z,.65)){c.x=x;c.z=z}c.y=p.y+1.35;c.vy=0}
  else{const reverse=c.id==='lift'&&s.gravity;c.vy+=(reverse?8:-12)*dt;c.y=clamp(c.y+c.vy*dt,.65,5.35);if(c.y===.65||c.y===5.35)c.vy=0}
 }
 const mass=s.cubes[0],lift=s.cubes[1];
 if(!mass.owner&&mass.y<.8&&distance(mass,{x:4,z:-5})<1.45)s.solved[0]=true;
 laser(s);
 if(!lift.owner&&lift.y>5.1&&distance(lift,{x:4,z:-45})<1.45)s.solved[2]=true;
 for(let j=0;j<3;j++)s.door[j]=clamp(s.door[j]+(s.solved[j]?dt*1.4:0),0,1);
 s.stage=s.solved[0]?(s.solved[1]?(s.solved[2]?3:2):1):0;s.progress=s.solved.filter(Boolean).length/3;
 s.message=[
  '01 / MASS: carry the amber cube onto the illuminated floor socket.',
  '02 / REFRACTION: rotate BOTH prisms. Route the red beam through the north prism into the green receiver.',
  '03 / INVERSION: drop the magnetic cube beneath the ceiling socket, then use the polarity console.',
  'ALL SYSTEMS ALIGNED. Follow the green light into the final exit.'
 ][s.stage];
 for(const [id,p]of Object.entries(s.players)){
  if(s.beamActive&&p.y<1.5&&!p.invulnerable&&s.beam.some(([a,b])=>project(a,b,p)<.35)){
   p.hp-=18;p.invulnerable=1;s.event++;
   if(p.hp<=0){release(s,p,id);p.x=0;p.z=s.solved[0]?-12:5;p.y=0;p.hp=100;p.invulnerable=3}
  }
  if(s.stage===3&&p.z< -52){s.status='won';s.message='CHAMBER ZERO COMPLETE — every experiment has an exit.';s.progress=1;break}
 }
}
