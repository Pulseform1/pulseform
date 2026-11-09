import {CITY_BUILDINGS,CITY_SPAWNS,buildCityCollision} from './city.js';
import {CITY_BLOCKS,buildCityColliders} from './dead-city.js';
import {getArena,ARENA_SPAWNS,arenaObstacles,arenaTrees,arenaExtraCover,arenaFortifications} from './arenas.js';
export const MAP_SIZE=112;
export const SPAWNS={alpha:[{x:-4,z:41},{x:3,z:41},{x:-6,z:37},{x:6,z:37}],bravo:[{x:4,z:-40},{x:-3,z:-40},{x:6,z:-36},{x:-6,z:-36}]};
export const OBJECTIVES=[{x:-21,y:1.1,z:23,label:'SEARCH THE COMMAND POST',detail:'Locate the field intelligence inside the western command post.'},{x:21,y:1.1,z:-23,label:'TRANSMIT THE INTELLIGENCE',detail:'Activate the radio in the eastern signal house with E, then stay nearby for 8 seconds.'},{x:6,y:.2,z:36.5,label:'REACH EXTRACTION',detail:'Return to the truck at the southern checkpoint.'}];
export const DEPLOYMENT_POINTS=[
{id:'south',label:'South checkpoint',description:'A sheltered approach near the extraction truck.',x:0,z:44,yaw:0},
{id:'west',label:'Western lane',description:'Approach the command post through the western alley.',x:-33,z:13,yaw:-Math.PI/2},
{id:'east',label:'Eastern lane',description:'A side approach near the signal house.',x:33,z:-14,yaw:Math.PI/2},
{id:'north',label:'North gate',description:'Enter from the northern edge of Saint-Clair.',x:3,z:-45,yaw:Math.PI},
{id:'market',label:'Market courtyard',description:'A central deployment with quick access to both objectives.',x:-6,z:5,yaw:0}
];
export function deploymentPoint(id){return DEPLOYMENT_POINTS.find(p=>p.id===id)}
export const BUILDINGS=[{x:-22,z:24,w:13,d:13,h:7.3,tone:0,name:'COMMAND POST'},{x:22,z:24,w:13,d:14,h:7.3,tone:1,name:'MAISON DUBOIS'},{x:-22,z:3,w:13,d:13,h:7.3,tone:2,name:'HÔTEL DE VILLE',roof:true},{x:22,z:3,w:13,d:13,h:7.3,tone:0,name:'BOULANGERIE'},{x:-22,z:-23,w:13,d:14,h:7.3,tone:1,name:'CAFÉ DES HALLES'},{x:22,z:-23,w:13,d:14,h:7.3,tone:2,name:'SIGNAL HOUSE'},{x:-43,z:23,w:12,d:16,h:10.5,tone:2},{x:43,z:24,w:12,d:15,h:9.2,tone:0},{x:-43,z:-3,w:12,d:16,h:8.8,tone:1},{x:43,z:-4,w:12,d:16,h:8.8,tone:1},{x:-43,z:-29,w:12,d:15,h:10.2,tone:0},{x:43,z:-30,w:12,d:15,h:10.5,tone:2}];
export const COLLIDERS=[];
function box(x,y,z,w,h,d,kind='wall',tone=0){COLLIDERS.push({x,y,z,w,h,d,kind,tone,minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2})}
for(const b of BUILDINGS){if(!b.roof)b.h+=3;const {x,z,w,d,h,tone}=b,front=x<0?x+w/2:x-w/2,back=x<0?x-w/2:x+w/2;box(x,.05,z,w,.1,d,'floor',tone);box(back,h/2,z,.6,h,d,'wall',tone);box(x,h/2,z-d/2,w,h,.6,'wall',tone);box(x,h/2,z+d/2,w,h,.6,'wall',tone);
// A genuine open doorway and window openings on the street-facing facade.
box(front,1.25,z-d/2+(d-2.5)/4,.55,2.5,(d-2.5)/2,'wall',tone);box(front,1.25,z+d/2-(d-2.5)/4,.55,2.5,(d-2.5)/2,'wall',tone);box(front,2.9,z,.55,.8,d,'wall',tone);for(let offset=-d/2;offset<d/2;offset+=3){box(front,4.65,z+offset+.35,.55,2.7,.65,'wall',tone)}box(front,3.65,z,.55,.7,d,'wall',tone);box(front,6.45,z,.55,1.1,d,'wall',tone);box(x,3.45,z,w,.24,d,'ceiling',tone);box(x,h,z,w+.7,.25,d+.7,'roof',tone);if(h>7.3)box(front,(7+h)/2,z,.55,h-7,d,'wall',tone);
// Ground-floor furnishings are physical cover.
box(x-2,.7,z-2,2.2,1.4,1,'crate',tone);box(x+3,.45,z+3,2.4,.9,1.2,'table',tone);
}
for(const o of OBJECTIVES.slice(0,2))box(o.x,.45,o.z,1.3,.9,.8,'table');
// Stairway to the hotel roof. Each tread is a collision surface.
for(let i=0;i<26;i++)box(-13,.14+i*.14,-12+i*.62,2.1,.28+i*.28,.66,'stair');box(-14.6,7.28,4.35,3.6,.25,2.1,'roof');
box(0,1.1,-3,6,2.2,3,'monument');box(0,2.7,-3,1.9,1,1.9,'monument');box(0,4.35,-3,.9,2.3,.9,'monument');
for(const [x,z]of [[-7,17],[7,12],[-6,-19],[8,-12],[-31,38],[31,-38]]){box(x,.65,z,2.8,1.3,1.1,'sandbag');box(x+1.9,.45,z+.8,1.2,.9,1.1,'crate')}
// Two abandoned trucks. Their silhouette and collision agree.
for(const [x,z,rot]of [[6,31,0],[-6,-31,0]]){box(x,.9,z,2.7,1.5,6,'truck');box(x,2.1,z-1.8,2.6,1.2,2,'truckCab')}
for(const [x,z,w,d]of [[-55,0,2,112],[55,0,2,112],[0,-55,112,2],[0,55,112,2]])box(x,2,z,w,4,d,'boundary');
export function rand(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

// Upper-floor posts sit behind actual, unobstructed street-facing window openings.
export const WINDOW_POSTS=BUILDINGS.slice(0,6).map((b,i)=>{const west=b.x<0,front=b.x+(west?b.w/2:-b.w/2);return {id:'window-'+i,x:front+(west?-.90:.90),y:3.57,z:b.z-b.d/2+(b.roof?10.8:4.8),yaw:west?-Math.PI/2:Math.PI/2,building:b.name}});

for(const c of [...arenaExtraCover('town'),...arenaFortifications('town')])box(c.x,c.y,c.z,c.w,c.h,c.d,c.kind,c.tone);
const ORIGINAL={buildings:BUILDINGS.map(b=>({...b})),colliders:COLLIDERS.map(b=>({...b})),deployments:DEPLOYMENT_POINTS.map(p=>({...p})),posts:WINDOW_POSTS.map(p=>({...p}))};
export let ACTIVE_ARENA='town';export let WORLD_REVISION=0;
export function configureArena(id='town'){const arena=getArena(id);if(ACTIVE_ARENA===arena.id)return;ACTIVE_ARENA=arena.id;WORLD_REVISION++;if(arena.id==='city'){BUILDINGS.splice(0,BUILDINGS.length,...CITY_BUILDINGS.map(b=>({...b})));COLLIDERS.length=0;WINDOW_POSTS.length=0;DEPLOYMENT_POINTS.splice(0,5,...CITY_SPAWNS.map(p=>({...p})));buildCityCollision(box);return}if(arena.id==='town'){BUILDINGS.splice(0,BUILDINGS.length,...ORIGINAL.buildings.map(b=>({...b})));COLLIDERS.splice(0,COLLIDERS.length,...ORIGINAL.colliders.map(b=>({...b})));DEPLOYMENT_POINTS.splice(0,5,...ORIGINAL.deployments.map(p=>({...p})));WINDOW_POSTS.splice(0,WINDOW_POSTS.length,...ORIGINAL.posts.map(p=>({...p})));return}
if(arena.id==='dead-city'){BUILDINGS.splice(0,BUILDINGS.length,...CITY_BLOCKS.map(b=>({...b})));COLLIDERS.length=0;WINDOW_POSTS.length=0;DEPLOYMENT_POINTS.splice(0,5,...ARENA_SPAWNS.map(p=>({...p})));buildCityColliders(box);return}
BUILDINGS.splice(0,BUILDINGS.length,...arena.buildings.map(([x,z,w,d,name],i)=>({x,z,w,d,h:6.5+(i%3)*1.5,tone:i%3,name})));COLLIDERS.length=0;WINDOW_POSTS.length=0;DEPLOYMENT_POINTS.splice(0,5,...ARENA_SPAWNS.map(p=>({...p,description:'Helicopter zip-line insertion at '+p.label.toLowerCase()+'.'})));
for(const b of BUILDINGS){const {x,z,w,d,h,tone}=b,front=x+(x<0?w/2:-w/2),back=x+(x<0?-w/2:w/2);box(x,.05,z,w,.1,d,'floor',tone);box(back,h/2,z,.4,h,d,'wall',tone);for(const sign of [-1,1])box(x,h/2,z+sign*d/2,w,h,.4,'wall',tone);for(const sign of [-1,1])box(front,h/2,z+sign*(d/4+.65),.4,h,d/2-1.3,'wall',tone);box(front,(h+2.5)/2,z,.4,h-2.5,2.6,'wall',tone);box(x,h+.08,z,w+.4,.16,d+.4,'roof',tone)}
for(const o of arenaObstacles(arena.id))box(o.x,o.y,o.z,o.w,o.h,o.d,o.kind,o.tone);
for(const c of [...arenaExtraCover(arena.id),...arenaFortifications(arena.id)])box(c.x,c.y,c.z,c.w,c.h,c.d,c.kind,c.tone);
for(const tree of arenaTrees(arena.id))box(tree.x,tree.h/2,tree.z,.68*tree.s,tree.h,.68*tree.s,'tree');
if(arena.id==='jungle'){for(const x of [-8,8])box(x,1.8,-3,1.6,3.6,1.6,'rock');box(0,3.9,-3,17,.6,1.5,'rock')}
for(const [x,z,w,d]of [[-55,0,2,112],[55,0,2,112],[0,-55,112,2],[0,55,112,2]])box(x,2,z,w,4,d,'boundary');
}
