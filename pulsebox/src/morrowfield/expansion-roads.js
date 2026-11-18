import {THREE,box,ell,cyl,beam,mat,tube} from './building-kit.js';
import {ROAD_STYLES,ROAD_EXPANSION} from './road-definitions.js';
export {ROAD_EXPANSION};
const definitions=new Map(ROAD_EXPANSION.map(item=>[item.id,item]));
const styles=new Map(ROAD_STYLES.map(style=>[style.id,style]));
function surface(g,s,x,z,w,d,walk=false,connections=null){
 box(g,w,.08,d,x,.04,z,s.surface);
 const color=new THREE.Color(s.surface),light=mat(color.clone().multiplyScalar(1.09).getHex()),dark=mat(color.clone().multiplyScalar(.88).getHex());
 const pattern=s.pattern;
 if(['cobble','tiles','brick','mosaic','slabs'].includes(pattern)){
  const step=pattern==='cobble'?.54:pattern==='brick'?.45:pattern==='slabs'?1.1:.78;
  const nx=Math.max(1,Math.floor(w/step)),nz=Math.max(1,Math.floor(d/(pattern==='brick'?.3:step))),tw=w/nx,tz=d/nz;
  for(let ix=0;ix<nx;ix++)for(let iz=0;iz<nz;iz++){
   const xx=x-w/2+(ix+.5)*tw,zz=z-d/2+(iz+.5)*tz;
   const tile=box(g,tw-.035,.012,tz-.035,xx,.087,zz,(ix+iz+s.detail)%3===0?light:dark);
   if(pattern==='mosaic')cyl(g,Math.min(tw,tz)*.21,Math.min(tw,tz)*.21,.009,xx,.098,zz,'cream',4);
   if(pattern==='cobble')tile.rotation.y=Math.sin(ix*4+iz*7)*.025;
  }
 }else if(pattern==='planks'){
  const n=Math.ceil(d/.28);for(let i=0;i<n;i++)box(g,w-.03,.018,d/n-.03,x,.089,z-d/2+(i+.5)*d/n,i%3?light:dark);
  for(const xx of [x-w*.37,x+w*.37])for(let i=0;i<n;i+=2)cyl(g,.025,.025,.015,xx,.105,z-d/2+(i+.5)*d/n,'iron',6);
 }else if(pattern==='waves'){
  for(let i=0;i<Math.floor(d/.6);i++)for(let j=0;j<3;j++)box(g,w/3-.012,.012,.04,x-w/3+j*w/3,.087,z-d/2+.35+i*.6+Math.sin(j)*.12,light,0,j===1?.08:-.08);
 }else if(pattern==='tram'){
  for(let i=0;i<Math.floor(d/.7);i++)box(g,w*.6,.016,.10,x,.088,z-d/2+.35+i*.7,'wood');
  const offset=s.width*.19,arms=new Set(connections||['north','south']);
  if(arms.size===2&&arms.has('north')&&arms.has('east')){
   for(const sign of [-1,1]){const r=w/2+sign*offset,points=[];for(let i=0;i<=12;i++){const a=Math.PI-i*Math.PI/24;points.push([x+w/2+Math.cos(a)*r,.108,z-d/2+Math.sin(a)*r]);}tube(g,points,.028,'iron');}
  }else{
   if(arms.has('north')||arms.has('south'))for(const xx of [x-offset,x+offset]){const length=arms.has('north')&&arms.has('south')?d:d/2;box(g,.055,.03,length,xx,.105,z+(arms.has('north')&&arms.has('south')?0:arms.has('south')?d/4:-d/4),'iron');}
   if(arms.has('east')||arms.has('west'))for(const zz of [z-offset,z+offset])box(g,w,.03,.055,x,.105,zz,'iron');
  }
 }else if((!walk||pattern==='cycle')&&d>1){
  for(let i=0;i<Math.floor(d/1.3);i++)box(g,.085,.009,.56,x,.085,z-d/2+.65+i*1.3,'cream');
  if(pattern==='cycle')for(const xx of [x-w*.35,x+w*.35])box(g,.045,.01,d,xx,.086,z,'white');
 }
}
export function createExpandedRoad(id){
 const def=definitions.get(id);if(!def)return null;const s=styles.get(def.style),g=new THREE.Group();
 if(def.layout==='walkway'){
  box(g,3,.06,4,0,.03,0,s.edge);surface(g,s,0,0,2.55,4,true);
  for(const x of [-1.45,1.45])box(g,.1,.15,4,x,.075,0,s.edge);
 }else if(def.layout==='square'){
  box(g,6,.08,6,0,.04,0,s.edge);surface(g,s,0,0,5.5,5.5,true);
  const ring=new THREE.Group();ring.rotation.y=Math.PI/4;box(ring,1.6,.018,1.6,0,.11,0,s.edge);box(ring,1.18,.02,1.18,0,.13,0,s.surface);g.add(ring);
  cyl(g,.3,.3,.035,0,.16,0,'cream',5+s.detail);
  for(const sign of [-1,1]){box(g,6,.12,.16,0,.06,sign*2.92,s.edge);box(g,.16,.12,6,sign*2.92,.06,0,s.edge);}
 }else{
  const h=s.width/2,edge=3-h,parts=[[-3,-h],[-h,h],[h,3]],arms=new Set(def.connections);
  for(let ix=0;ix<3;ix++)for(let iz=0;iz<3;iz++){
   const [x0,x1]=parts[ix],[z0,z1]=parts[iz],x=(x0+x1)/2,z=(z0+z1)/2,w=x1-x0,d=z1-z0;
   const road=ix===1&&iz===1||ix===1&&(iz===0&&arms.has('north')||iz===2&&arms.has('south'))||iz===1&&(ix===0&&arms.has('west')||ix===2&&arms.has('east'));
   if(road){if(iz===1&&ix!==1){const horizontal=new THREE.Group();surface(horizontal,s,0,0,d,w);horizontal.rotation.y=Math.PI/2;horizontal.position.set(x,0,z);g.add(horizontal);}else surface(g,s,x,z,w,d,false,ix===1&&iz===1?def.connections:null);}else{box(g,w,.16,d,x,.08,z,s.edge);if(w>.5&&d>.5)box(g,Math.max(.08,w-.12),.01,Math.max(.08,d-.12),x,.165,z,0xd9d5c4);}
  }
  // Crossing stripes and inset curb markers distinguish connected tile layouts.
  if(def.layout==='junction'||def.layout==='crossroads')for(let x=-h+.2;x<h-.1;x+=.45)box(g,.22,.012,.6,x,.102,2.45,'cream');
  if(def.layout==='corner')for(let i=0;i<3;i++)box(g,.12,.015,.18,-h-edge*.5,.18,1.5+i*.45,s.surface);
 }
 return g;
}
