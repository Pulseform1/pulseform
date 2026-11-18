import {MAP,objectives,walkable,clearSight} from './world.js';
function maze(seed){let value=seed;const random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296};const map=Array.from({length:12},()=>Array(21).fill('#')),stack=[[1,1]];map[1][1]='.';while(stack.length){const [x,z]=stack.at(-1),next=[[2,0],[-2,0],[0,2],[0,-2]].map(([a,b])=>[x+a,z+b,a,b]).filter(([a,b])=>a>0&&a<20&&b>0&&b<11&&map[b][a]==='#');if(!next.length){stack.pop();continue}const [a,b,dx,dz]=next[Math.floor(random()*next.length)];map[z+dz/2][x+dx/2]='.';map[b][a]='.';stack.push([a,b])}map[1][2]='.';for(let i=0;i<17;i++){const x=1+Math.floor(random()*19),z=1+Math.floor(random()*9);if((x%2)!==(z%2))map[z][x]='.'}return map.map(row=>row.join(''))}
const locations=[{x:3,z:1},{x:11,z:3},{x:3,z:9},{x:19,z:9}];
const configs=[
 {name:'Intake Laboratories',monster:'The Hollow',rule:'It hears running. Move quietly and watch your light.',fog:'#0c1712',wall:'#657260',light:0xa6bea0,color:0x9a9b84,answer:'314',note:'Third specimen. First trial. Fourth survivor.',speed:.92,hearing:1,sight:1},
 {name:'The Surgical Wing',monster:'The Listener',rule:'It is blind. Running and microphone noise give you away.',fog:'#16101b',wall:'#726b79',light:0xc2aacd,color:0x51414b,answer:'271',note:'Second incision. Seventh suture. First patient.',speed:1.02,hearing:1.6,sight:0},
 {name:'Flooded Maintenance',monster:'The Crawler',rule:'It moves fast. Crouch, keep quiet, and do not linger.',fog:'#07171c',wall:'#426d73',light:0x8cc6cd,color:0x82979a,answer:'608',note:'Six valves. Zero pressure. Eight missing.',speed:1.18,hearing:1.1,sight:.7},
 {name:'Organic Containment',monster:'The Maw',rule:'Its eyes follow flashlights. Darkness is your cover.',fog:'#1a0e09',wall:'#7c6151',light:0xd8a275,color:0xb59b7b,answer:'425',note:'Fourth cage. Second feeding. Fifth escape.',speed:.95,hearing:.7,sight:1.7},
 {name:'The Core',monster:'The Warden',rule:'It remembers hiding places and reacts to every system you restore.',fog:'#1b0809',wall:'#69575b',light:0xcf7573,color:0x69504b,answer:'986',note:'Nine locks. Eight casualties. Six minutes left.',speed:1.13,hearing:1.25,sight:1.3}
];
export const LEVELS=configs.map((c,i)=>({...c,id:i,map:i===0?MAP:maze(430+i*157),spawn:{x:2,z:1},monsterSpawn:{x:18+(i?1:0),z:1},objectives:i===0?objectives:locations.map((p,j)=>({...p,name:[['Isolate surgical power','Recover patient records','Release the ward','Service lift'],['Drain pump controls','Calibrate pressure','Open the sluice','Maintenance lift'],['Restore air scrubbers','Sequence the samples','Break containment','Containment lift'],['Energize the core','Decode evacuation signal','Unlock surface access','Surface elevator']][i-1][j],type:['power','terminal','override','exit'][j]}))}));
export function getLevel(index){return LEVELS[Math.max(0,Math.min(LEVELS.length-1,index||0))]}

export function chooseMonsterSpawn(level,players=[],random=Math.random){
 const anchors=players.filter(p=>!p.down);if(!anchors.length)anchors.push(level.spawn);
 const candidates=[];for(let z=1;z<level.map.length-1;z++)for(let x=1;x<level.map[z].length-1;x++)if(walkable(x,z,level.map)&&anchors.every(p=>Math.hypot(p.x-x,p.z-z)>=7))candidates.push({x,z});
 const hidden=candidates.filter(c=>anchors.every(p=>!clearSight(c,p,level.map))),pool=hidden.length?hidden:candidates;
 if(pool.length)return {...pool[Math.min(pool.length-1,Math.floor(random()*pool.length))]};
 // If survivors cover the map, choose the floor cell farthest from the nearest living player.
 let best={...level.monsterSpawn},distance=-1;for(let z=1;z<level.map.length-1;z++)for(let x=1;x<level.map[z].length-1;x++)if(walkable(x,z,level.map)){const d=Math.min(...anchors.map(p=>Math.hypot(p.x-x,p.z-z)));if(d>distance){distance=d;best={x,z}}}return best;
}

const lockerCache=new Map();
export function getHidingSpots(level){
 if(lockerCache.has(level.id))return lockerCache.get(level.id);
 const candidates=[];
 for(let z=1;z<level.map.length-1;z++)for(let x=1;x<level.map[z].length-1;x++){
  if(!walkable(x,z,level.map)||Math.hypot(x-level.spawn.x,z-level.spawn.z)<1.5||level.objectives.some(o=>Math.hypot(x-o.x,z-o.z)<1.4))continue;
  const wall=[[1,0],[-1,0],[0,1],[0,-1]].find(([a,b])=>!walkable(x+a,z+b,level.map));if(wall)candidates.push({x,z,wallX:wall[0],wallZ:wall[1]});
 }
 const chosen=[];while(chosen.length<7&&candidates.length){let best=0,score=-Infinity;for(let i=0;i<candidates.length;i++){const c=candidates[i],d=chosen.length?Math.min(...chosen.map(p=>Math.hypot(p.x-c.x,p.z-c.z))):-Math.hypot(c.x-level.spawn.x,c.z-level.spawn.z);if(d>score){score=d;best=i}}const c=candidates.splice(best,1)[0];chosen.push({...c,id:`${level.id}-locker-${chosen.length}`,cabinetX:c.x+c.wallX*.31,cabinetZ:c.z+c.wallZ*.31,yaw:Math.atan2(c.wallX,c.wallZ)})}
 lockerCache.set(level.id,chosen);return chosen;
}
