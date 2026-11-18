import {COLLIDERS,WINDOW_POSTS} from './world.js';
import {ARENA_PATROLS} from './arenas.js';
import {createBot,createWindowGuard,findPath} from './ai.js';
import {overlaps,visible} from './physics.js';
export const HOSTILE_CAP=18;
export const REINFORCEMENT_INTERVAL={easy:12,normal:9,hard:7};
// Spawn only in traversable, concealed positions, away from all living players.
export function spawnReinforcements(sim,count=2,reason='patrol'){
 const humans=[...sim.players.values()].filter(p=>p.alive&&!p.deploying);if(!humans.length||sim.finished)return 0;
 const room=Math.max(0,HOSTILE_CAP-sim.bots.filter(b=>b.alive).length);count=Math.min(count,room);let spawned=0;
 const candidates=[...ARENA_PATROLS];for(const edge of [-50,50])for(let n=-45;n<=45;n+=9){candidates.push({x:edge,z:n},{x:n,z:edge})}
 const safe=p=>humans.every(h=>Math.hypot(p.x-h.x,p.z-h.z)>=24&&!visible(h,p))&&!COLLIDERS.some(b=>overlaps({...p,height:1.72},b))&&!sim.bots.some(b=>b.alive&&Math.hypot(b.x-p.x,b.z-p.z)<2.5);
 const ordered=candidates.map((p,i)=>({...p,y:.1,order:(i+sim.nextBot*17)%candidates.length})).sort((a,b)=>a.order-b.order);
 for(let i=0;i<count;i++){const post=WINDOW_POSTS.find(p=>safe(p)&&!sim.bots.some(b=>b.alive&&b.guardPost?.id===p.id));let bot;
 if(post&&sim.nextBot%4===0)bot=createWindowGuard(++sim.nextBot,post);
 else{const point=ordered.find(p=>safe(p)&&humans.some(h=>findPath(p,h).length>0));if(!point)break;bot=createBot(++sim.nextBot);bot.x=point.x;bot.z=point.z;const nearest=[...humans].sort((a,b)=>Math.hypot(a.x-bot.x,a.z-bot.z)-Math.hypot(b.x-bot.x,b.z-bot.z))[0];bot.brain.target={x:nearest.x,z:nearest.z};bot.brain.state='investigate'}
 bot.spawnedAt=sim.time;sim.bots.push(bot);spawned++;
 }
 if(spawned)sim.events.push({kind:'reinforcements',reason,count:spawned});return spawned;
}
export function updateReinforcements(sim){
 if(sim.mode!=='campaign')return;
 sim.bots=sim.bots.filter(b=>b.alive||sim.time-(b.diedAt??sim.time)<20);
 if(![...sim.players.values()].some(p=>p.alive&&!p.deploying))return;
 if(sim.time<sim.nextReinforcementAt)return;
 sim.nextReinforcementAt=sim.time+(REINFORCEMENT_INTERVAL[sim.difficulty]||9);
 spawnReinforcements(sim,sim.difficulty==='hard'?3:2);
}
