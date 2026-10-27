export const MAP = [
'#####################',
'#.....#.......#.....#',
'#.....#.......#.....#',
'###.#####.#####.###.#',
'#...................#',
'#.###.#######.###.#.#',
'#...#.......#...#...#',
'#...#.#####.#...###.#',
'###.#.....#.........#',
'#.....###.#####.###.#',
'#.....#.......#.....#',
'#####################'];
export const objectives=[{x:3,z:2,name:'Auxiliary power',type:'power'},{x:11,z:2,name:'Research terminal',type:'terminal'},{x:3,z:10,name:'Containment override',type:'override'},{x:18,z:10,name:'Freight elevator',type:'exit'}];
export function walkable(x,z,map=MAP){return map[Math.round(z)]?.[Math.round(x)]==='.'}
export function pathTo(a,b,map=MAP){const start=[Math.round(a.x),Math.round(a.z)],end=[Math.round(b.x),Math.round(b.z)],q=[start],seen=new Set([start.join(',')]),prev=new Map(); for(let i=0;i<q.length;i++){const p=q[i];if(p[0]===end[0]&&p[1]===end[1]){let k=p.join(','),steps=[];while(prev.has(k)){steps.unshift(k.split(',').map(Number));k=prev.get(k)}return steps[0]||start}for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=[p[0]+dx,p[1]+dz],k=n.join(',');if(walkable(n[0],n[1],map)&&!seen.has(k)){seen.add(k);prev.set(k,p.join(','));q.push(n)}}}return start}

export function clearSight(a,b,map=MAP){const length=Math.hypot(a.x-b.x,a.z-b.z),steps=Math.ceil(length*5);for(let i=1;i<steps;i++){const t=i/steps;if(!walkable(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,map))return false}return true}
