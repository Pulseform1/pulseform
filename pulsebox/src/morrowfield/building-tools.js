// Shared, deterministic layout used by the drag preview and final placement.
import {isFenceType,segmentLength,ROAD_LINE_IDS} from './placement-types.js';
export {isFenceType,segmentLength};
export const LINE_TYPES = new Set(['road', 'stone-path', 'fence', 'gate',...ROAD_LINE_IDS]);
export function planLine(start, end, {type='road', scale=1, snap=true, rotation=0, maxSegments=120}={}) {
  if (!LINE_TYPES.has(type)&&!isFenceType(type)) return [];
  const length = segmentLength(type) * scale;
  const fence = isFenceType(type);
  const grid = snap ? (!fence&&type!=='stone-path' ? length : 2) : 0;
  const round = value => grid ? Math.round(value/grid)*grid : value;
  const origin = {x:round(start.x),z:round(start.z)};
  let dx=end.x-origin.x,dz=end.z-origin.z;
  if(snap){if(Math.abs(dx)>=Math.abs(dz))dz=0;else dx=0;}
  const distance=Math.hypot(dx,dz);
  if(distance<length*.35)return [{...origin,rotation,scale,type}];
  const angle=fence?Math.atan2(-dz,dx):Math.atan2(dx,dz);
  const count=Math.min(maxSegments,Math.max(1,Math.round(distance/length)+1));
  return Array.from({length:count},(_,i)=>({type,scale,rotation:angle,x:origin.x+dx/distance*length*i,z:origin.z+dz/distance*length*i}));
}

// Unlike road rows, a fence follows every corner and fits the final span exactly.
export function planFence(points,{type='fence',scale=1,close=false,maxSegments=400,tolerance=.35}={}) {
  if(!isFenceType(type)||points.length<2||!Number.isFinite(scale)||scale<=0)return [];
  const clean=points.filter((p,i)=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&(i===0||Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z)>.1));
  function simplify(a){if(a.length<3)return a;const first=a[0],last=a.at(-1),dx=last.x-first.x,dz=last.z-first.z,l2=dx*dx+dz*dz;let max=0,index=0;for(let i=1;i<a.length-1;i++){const t=l2?Math.max(0,Math.min(1,((a[i].x-first.x)*dx+(a[i].z-first.z)*dz)/l2)):0;const d=Math.hypot(a[i].x-first.x-t*dx,a[i].z-first.z-t*dz);if(d>max){max=d;index=i;}}return max>tolerance?[...simplify(a.slice(0,index+1)).slice(0,-1),...simplify(a.slice(index))]:[first,last];}
  const path=simplify(clean);if(close&&path.length>2)path.push({...path[0]});const output=[];
  for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d<.25*scale)continue;const count=Math.ceil(d/(segmentLength(type)*scale)),length=d/count/scale;for(let j=0;j<count;j++){if(output.length>=maxSegments){const rejected=[];rejected.error='This fence is too long for one stroke. Draw shorter sections (up to 400 pieces each).';return rejected;}const t=(j+.5)/count;output.push({type,x:a.x+dx*t,z:a.z+dz*t,rotation:Math.atan2(-dz,dx),scale,length});}}
  return output;
}
