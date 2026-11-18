// All positions are metres. Item y is relative to its floor, not absolute height.
const departments=[
 {id:'grocery',name:'Fresh Market',floor:0,x:-30,z:-22,w:28,d:24,color:0x7fa87b},
 {id:'cleaning',name:'Clean & Care',floor:0,x:-30,z:14,w:28,d:24,color:0x72b2c3},
 {id:'toys',name:'Wonder Toys',floor:0,x:30,z:-22,w:28,d:24,color:0xdc9ab7},
 {id:'electronics',name:'Signal Electronics',floor:0,x:30,z:14,w:28,d:24,color:0x789bbe},
 {id:'seasonal',name:'Seasonal Finds',floor:0,x:0,z:-28,w:24,d:12,color:0xcaaa68},
 {id:'furniture',name:'Living Studio',floor:1,x:-30,z:-22,w:28,d:24,color:0xb89677},
 {id:'clothing',name:'Thread & Form',floor:1,x:30,z:-22,w:28,d:24,color:0xc494a7},
 {id:'homegoods',name:'Everyday Home',floor:1,x:-30,z:14,w:28,d:24,color:0x8ab2aa},
 {id:'kitchen',name:'Kitchen Works',floor:1,x:30,z:14,w:28,d:24,color:0xb5b3a0},
 {id:'sporting',name:'Outdoor & Sport',floor:1,x:0,z:-28,w:24,d:12,color:0x86a1a2},
];
const ramps=[{id:'ramp-left',x:-4,z:0,w:4,d:28,minX:-6,maxX:-2,lowZ:14,highZ:-14,lowY:0,highY:8},{id:'ramp-right',x:4,z:0,w:4,d:28,minX:2,maxX:6,lowZ:14,highZ:-14,lowY:0,highY:8}];
const obstacles=[],items=[],decor=[];
const kinds={grocery:['shelf','produce','shelf','freezer','shelf','produce'],cleaning:['shelf','pallet','shelf','display','shelf','pallet'],toys:['round-display','shelf','display','shelf','round-display','shelf'],electronics:['counter','tv-wall','counter','counter','display','counter'],seasonal:['display','round-display','display','pallet','display','round-display'],furniture:['sofa','bed','armchair','desk','bookshelf','dining-table'],clothing:['rack','shoe-rack','rack','round-display','rack','mannequin'],homegoods:['display','shelf','counter','shelf','display','counter'],kitchen:['island','shelf','island','counter','island','shelf'],sporting:['rack','display','shelf','display','rack','shelf']};
const merchandise={
 grocery:[['Red Apples','fruit'],['Golden Bananas','fruit'],['Oat Cereal','box'],['Pasta Shells','box'],['Tomato Soup','can'],['Peach Slices','can'],['Sparkling Lemon','bottle'],['Olive Oil','bottle'],['Garden Pears','fruit'],['Market Oranges','fruit'],['Dark Coffee','box'],['Wildflower Honey','jar']],
 cleaning:[['Citrus Cleaner','bottle'],['Ocean Detergent','bottle'],['Sponge Pack','box'],['Dust Cloths','towel'],['Mint Hand Soap','bottle'],['Window Spray','bottle'],['Laundry Pods','jar'],['Fresh Linens','towel'],['Scrub Brush','brush'],['Paper Towels','towel'],['Lemon Polish','can'],['Dish Tablets','box']],
 toys:[['Rocket Plush','plush'],['Sleepy Bear','plush'],['Rainbow Ball','ball'],['Tiny Football','ball'],['Block Castle','box'],['Puzzle Planet','box'],['Yellow Duck','duck'],['Wind-up Robot','robot'],['Plush Fox','plush'],['Mini Racer','toy-car'],['Moon Marbles','jar'],['Adventure Kite','kite']],
 electronics:[['Studio Headphones','headphones'],['Pocket Speaker','speaker'],['Night Radio','radio'],['Compact Camera','camera'],['Smart Display','tv'],['Game Controller','controller'],['USB Battery','battery'],['Wireless Mouse','mouse'],['Retro Handset','phone'],['Mini Projector','box'],['Desk Microphone','microphone'],['Travel Headphones','headphones']],
 seasonal:[['Festive Lantern','lamp'],['Gift Ribbon','box'],['Sunflower Pot','plant'],['Camping Flask','bottle'],['Picnic Ball','ball'],['Party Lights','box'],['Autumn Wreath','wreath'],['Holiday Candle','jar'],['Garden Pinwheel','pinwheel'],['Beach Towel','towel'],['Winter Mittens','gloves'],['Celebration Star','star']],
 furniture:[['Reading Lamp','lamp'],['Velvet Cushion','cushion'],['Ceramic Plant','plant'],['Oak Photo Frame','frame'],['Table Clock','clock'],['Wicker Basket','basket'],['Bedside Book','book'],['Accent Vase','vase'],['Folded Throw','towel'],['Desk Organizer','box'],['Desk Lamp','lamp'],['Soft Cushion','cushion']],
 clothing:[['Coral Shirt','shirt'],['Denim Shirt','shirt'],['Classic Sneakers','shoe'],['Trail Sneakers','shoe'],['Sun Hat','hat'],['Winter Scarf','scarf'],['Mint Hoodie','shirt'],['Striped Top','shirt'],['Canvas Shoes','shoe'],['Plum Beanie','hat'],['Linen Tote','bag'],['Leather Belt','belt']],
 homegoods:[['Glass Vase','vase'],['Patterned Towel','towel'],['White Candle','jar'],['Small Fern','plant'],['Woven Basket','basket'],['Round Clock','clock'],['Family Frame','frame'],['Cotton Cushion','cushion'],['Travel Mug','cup'],['Desk Planter','plant'],['Bedside Lamp','lamp'],['Ceramic Bowl','bowl']],
 kitchen:[['Copper Frying Pan','pan'],['Steel Saucepan','pot'],['Morning Mug','cup'],['Soup Bowl','bowl'],['Teal Kettle','kettle'],['Dinner Plate','plate'],['Glass Pitcher','bottle'],['Spice Tin','can'],['Bamboo Board','board'],['Mixing Bowl','bowl'],['Coffee Press','jar'],['Kitchen Timer','clock']],
 sporting:[['Training Ball','ball'],['Running Bottle','bottle'],['Trail Backpack','bag'],['Yoga Roll','mat'],['Tennis Racket','racket'],['Swim Goggles','goggles'],['Skipping Rope','rope'],['Camp Lantern','lamp'],['Trail Flask','bottle'],['Practice Cone','cone'],['Sports Cap','hat'],['Climbing Gloves','gloves']],
};
const palette=[0xdf936e,0x80ac91,0xe3c580,0x8aafd1,0xc68bb5,0xb6c3b3,0xd0ac90,0x8595b1];
const layouts={
 grocery:[[-10,-7],[0,-7],[10,-7],[-10,5],[0,5],[10,5]],
 cleaning:[[-10,-7],[0,-5],[10,-8],[-9,5],[1,7],[10,4]],
 toys:[[-10,-8],[0,-5],[10,-8],[-9,5],[1,7],[10,3]],
 electronics:[[-10,-7],[0,-8],[10,-6],[-10,5],[0,3],[10,6]],
 furniture:[[-10,-7],[0,-7],[10,-5],[-10,5],[0,7],[10,5]],
 clothing:[[-10,-8],[0,-6],[10,-8],[-10,6],[0,4],[10,7]],
 homegoods:[[-10,-7],[-1,-5],[10,-8],[-10,4],[0,7],[10,5]],
 kitchen:[[-10,-7],[0,-8],[10,-5],[-9,6],[1,5],[10,7]],
};
function addObstacle(o){obstacles.push(o);return o;}
for(const [di,dept]of departments.entries()){
 const narrow=dept.w===24,columns=narrow?[-8,0,8]:[-10,0,10],rows=narrow?[-3,4]:[-7,5];
 for(let n=0;n<6;n++){
  const offset=layouts[dept.id]?.[n]||[columns[n%3],rows[Math.floor(n/3)]];
  const kind=kinds[dept.id][n],x=dept.x+offset[0],z=dept.z+offset[1],wide=kind==='bed'?4.7:kind==='sofa'?5:kind==='armchair'?2.6:kind==='mannequin'?2.5:kind==='round-display'?3.3:kind==='pallet'?3.3:4.3;
  const depth=kind==='bed'?3.5:kind==='sofa'?2.5:kind==='dining-table'?3:kind==='armchair'?2.4:kind==='round-display'?2.8:kind==='island'?2.1:kind==='mannequin'?2:kind==='rack'?1.25:kind==='shelf'||kind==='bookshelf'||kind==='tv-wall'?1.2:1.8;
  const height=kind==='shelf'||kind==='bookshelf'||kind==='rack'||kind==='tv-wall'?2.2:kind==='bed'?.75:kind==='sofa'?.95:kind==='mannequin'?1.7:1.05;
  const support=addObstacle({id:dept.id+'-support-'+n,floor:dept.floor,x,z,w:wide,d:depth,height,kind,color:n%2?dept.color:palette[(di+n)%palette.length],department:dept.id});
  for(let j=0;j<2;j++){
   const [name,type]=merchandise[dept.id][n*2+j],ix=x+(j?1:-1)*Math.min(.75,wide*.23),front=z+depth/2;
   items.push({id:dept.id+'-'+String(n*2+j+1).padStart(2,'0'),name,type,department:dept.id,floor:dept.floor,x:ix,z:front-.12,y:Math.min(height,1.4)+.22,approach:{x:ix,z:front+1.35},supportId:support.id,color:palette[(di*2+n+j)%palette.length]});
  }
 }
 decor.push({id:dept.id+'-sign',kind:'department-sign',floor:dept.floor,x:dept.x,z:dept.z-dept.d/2+1,y:3.7,w:Math.min(dept.w-2,16),text:dept.name,color:dept.color});
}
// Checkout tills and customer-service desks leave the central entry and cart bay clear.
for(const sign of [-1,1])for(let i=0;i<3;i++)addObstacle({id:'checkout-'+sign+'-'+i,floor:0,x:sign*(13+i*7),z:33,w:4.5,d:3,height:1.1,kind:'checkout',color:0x80a7a6,department:'checkout'});
addObstacle({id:'service-desk',floor:0,x:40,z:35,w:8,d:3,height:1.1,kind:'service-desk',color:0x819ab0});
for(const x of [-36,-12,12,36])for(const z of [-28,0,28]){
 if(Math.abs(x)===12&&z===0)continue;
 addObstacle({id:'column-'+x+'-'+z,floor:0,bothFloors:true,x,z,w:.65,d:.65,height:16,kind:'column',color:0xf1f1e6});
}
// These rail footprints apply on both floors; the renderer slopes them along their ramp.
for(const r of ramps)for(const sign of [-1,1])addObstacle({id:r.id+'-rail-'+sign,floor:0,bothFloors:true,x:r.x+sign*(r.w/2+.08),z:0,w:.18,d:28,height:.7,kind:'ramp-rail',ramp:r.id,color:0xb4c4c7});
// A segmented mezzanine rail leaves both high landings open, with no invisible blockers.
for(const sign of [-1,1])addObstacle({id:'atrium-side-'+sign,floor:1,x:sign*12,z:0,w:.24,d:28,height:1.2,kind:'railing',color:0xb4c4c7});
for(const z of [-14,14])for(const [x,w]of [[-9,6],[0,4],[9,6]])addObstacle({id:'atrium-edge-'+z+'-'+x,floor:1,x,z,w,d:.24,height:1.2,kind:'railing',color:0xb4c4c7});
for(const sign of [-1,1])decor.push({id:'entry-planter-'+sign,kind:'plant',floor:0,x:sign*7,z:37,y:0,color:0x789a79},{id:'banner-'+sign,kind:'banner',floor:1,x:sign*13,z:0,y:3.5,text:sign<0?'STYLE / LIVING':'PLAY / EXPLORE',color:sign<0?0xcfa09b:0x8aaac4});
const checkouts=obstacles.filter(o=>o.kind==='checkout').map(o=>({id:o.id,x:o.x,z:o.z-o.d/2-1.3,floor:0,radius:2.4,supportId:o.id}));
export const WORLD={bounds:{minX:-48,maxX:48,minZ:-40,maxZ:40},floorHeight:8,spawn:{x:0,z:32,floor:0},checkout:checkouts.find(c=>c.x===13),checkouts,departments,ramps,holes:[{floor:1,minX:-12,maxX:12,minZ:-14,maxZ:14}],obstacles,decor,items,patrols:[{floor:0,x:0,z:24},{floor:0,x:-15,z:-15},{floor:0,x:15,z:-15},{floor:0,x:-15,z:14},{floor:0,x:15,z:14},{floor:0,x:0,z:-20},{floor:1,x:-15,z:-15},{floor:1,x:15,z:-15},{floor:1,x:-15,z:14},{floor:1,x:15,z:14},{floor:1,x:0,z:-20}]};
const byFloor=[obstacles.filter(o=>o.floor===0||o.bothFloors),obstacles.filter(o=>o.floor===1||o.bothFloors)];
function onRamp(x,z,r=0){return ramps.find(a=>x>a.minX+r&&x<a.maxX-r&&z>=a.highZ&&z<=a.lowZ)||null;}
export function canStand(x,z,floor=0,radius=.6){
 if(!Number.isFinite(x)||!Number.isFinite(z)||![0,1].includes(floor)||x<WORLD.bounds.minX+radius||x>WORLD.bounds.maxX-radius||z<WORLD.bounds.minZ+radius||z>WORLD.bounds.maxZ-radius)return false;
 const rampLanding=ramps.some(r=>x>r.minX+radius&&x<r.maxX-radius&&z>=r.highZ-radius-.02&&z<=r.lowZ+radius+.02);
 if(floor===1&&Math.abs(x)<12+radius&&Math.abs(z)<14+radius&&!rampLanding)return false;
 return !byFloor[floor].some(o=>Math.abs(x-o.x)<o.w/2+radius&&Math.abs(z-o.z)<o.d/2+radius);
}
function segmentRect(ax,az,bx,bz,o){let lo=0,hi=1;for(const [a,b,min,max]of [[ax,bx,o.x-o.w/2,o.x+o.w/2],[az,bz,o.z-o.d/2,o.z+o.d/2]]){const d=b-a;if(Math.abs(d)<1e-9){if(a<min||a>max)return false;}else{let t0=(min-a)/d,t1=(max-a)/d;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);if(lo>hi)return false;}}return hi>=0&&lo<=1;}
export function clearSight(ax,az,bx,bz,floor=0,ignoreId=null){if(typeof ax==='object'){const a=ax,b=az,level=bx??a.floor??0,ignore=bz??null;return clearSight(a.x,a.z,b.x,b.z,level,ignore);}if(!byFloor[floor])return false;return !byFloor[floor].some(o=>o.id!==ignoreId&&o.kind!=='railing'&&o.kind!=='ramp-rail'&&segmentRect(ax,az,bx,bz,o));}
export function surfaceAt(x,z,previousFloor=0,previousRamp=null){
 const ramp=onRamp(x,z);if(ramp){const tracked=previousRamp===ramp.id||previousRamp?.id===ramp.id,entry=previousFloor===0?z>12.4:z< -12.4;if(!tracked&&!entry)return {y:previousFloor*8,floor:previousFloor,ramp:null,blocked:true};return {y:(14-z)*8/28,floor:previousFloor,ramp:ramp.id,blocked:false};}
 if(previousRamp){if(z<=-14)return {y:8,floor:1,ramp:null,blocked:false};if(z>=14)return {y:0,floor:0,ramp:null,blocked:false};return {y:previousFloor*8,floor:previousFloor,ramp:typeof previousRamp==='string'?previousRamp:previousRamp.id,blocked:true};}
 return {y:previousFloor*8,floor:previousFloor,ramp:null,blocked:previousFloor===1&&Math.abs(x)<12&&Math.abs(z)<14};
}
const GRID=1.5;
function gridPath(from,to,floor){
 if(!canStand(from.x,from.z,floor)||!canStand(to.x,to.z,floor))return [];
 const nearest=p=>{let best=null,d=Infinity;const cx=Math.round(p.x/GRID),cz=Math.round(p.z/GRID);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const q={x:(cx+dx)*GRID,z:(cz+dz)*GRID};if(canStand(q.x,q.z,floor)&&clearSight(p.x,p.z,q.x,q.z,floor)){const n=Math.hypot(q.x-p.x,q.z-p.z);if(n<d){best=q;d=n;}}}return best;};
 const start=nearest(from),end=nearest(to);if(!start||!end)return [];const key=p=>p.x+','+p.z,queue=[{p:start,cost:0}],costs=new Map([[key(start),0]]),prev=new Map(),nodes=new Map([[key(start),start]]);let goal=null;
 while(queue.length){let best=0;for(let i=1;i<queue.length;i++)if(queue[i].cost+Math.hypot(queue[i].p.x-end.x,queue[i].p.z-end.z)<queue[best].cost+Math.hypot(queue[best].p.x-end.x,queue[best].p.z-end.z))best=i;const {p,cost}=queue.splice(best,1)[0],k=key(p);if(cost>costs.get(k))continue;if(k===key(end)){goal=k;break;}
 for(const [dx,dz]of [[GRID,0],[-GRID,0],[0,GRID],[0,-GRID]]){const n={x:p.x+dx,z:p.z+dz},nk=key(n);if(!canStand(n.x,n.z,floor)||!clearSight(p.x,p.z,n.x,n.z,floor))continue;
 // Ordinary floor paths never traverse a ramp footprint: cross-floor travel uses
 // explicit continuous ramp links below, preventing guards from walking on air.
 if(onRamp(n.x,n.z,.1))continue;const next=cost+GRID;if(next<(costs.get(nk)??Infinity)){costs.set(nk,next);prev.set(nk,k);nodes.set(nk,n);queue.push({p:n,cost:next});}}
 }
 if(!goal)return [];const path=[];for(let k=goal;k;k=prev.get(k))path.unshift({...nodes.get(k),floor});if(Math.hypot(path[0].x-from.x,path[0].z-from.z)>.05)path.unshift({...from,floor});if(Math.hypot(path.at(-1).x-to.x,path.at(-1).z-to.z)>.05)path.push({...to,floor});return path;
}
function basePath(from,to){
 if(!from||!to||![0,1].includes(from.floor)||![0,1].includes(to.floor))return [];
 if(from.floor===to.floor)return gridPath(from,to,from.floor);
 let best=[],length=Infinity;for(const r of ramps){const low={x:r.x,z:15.5,floor:0},high={x:r.x,z:-15.5,floor:1},entry=from.floor===0?low:high,exit=from.floor===0?high:low,a=gridPath(from,entry,from.floor),b=gridPath(exit,to,to.floor);if(!a.length||!b.length)continue;const crossing=[];const start=from.floor===0?14:-14,end=-start,dir=from.floor===0?-1:1;for(let z=start;dir<0?z>=end:z<=end;z+=dir*1.4)crossing.push({x:r.x,z,floor:from.floor,ramp:r.id,y:(14-z)*8/28});const path=[...a,...crossing,{...exit,y:exit.floor*8},...b.slice(1)],n=path.reduce((d,p,i)=>i?d+Math.hypot(p.x-path[i-1].x,p.z-path[i-1].z):0,0);if(n<length){length=n;best=path;}}
 return best;
}

// Mid-ramp endpoints may legitimately be at either nominal floor. Route through
// actual landings, rather than asking a flat navigation grid to walk on the slope.
function rampSegment(r,from,to,nominalFloor){
 const out=[{x:from.x,z:from.z,floor:nominalFloor,ramp:from.z>=-14&&from.z<=14?r.id:null,y:(14-Math.max(-14,Math.min(14,from.z)))*8/28}],n=Math.max(1,Math.ceil(Math.abs(to.z-from.z)/1.2));
 for(let i=1;i<=n;i++){const t=i/n,z=from.z+(to.z-from.z)*t;out.push({x:from.x+(to.x-from.x)*t,z,floor:nominalFloor,ramp:z>=-14&&z<=14?r.id:null,y:(14-Math.max(-14,Math.min(14,z)))*8/28});}
 const last=out.at(-1);if(to.z<=-14.5)last.floor=1;else if(to.z>=14.5)last.floor=0;return out;
}
export function findPath(from,to){
 if(!from||!to||![0,1].includes(from.floor)||![0,1].includes(to.floor))return [];
 if(!canStand(from.x,from.z,from.floor)||!canStand(to.x,to.z,to.floor))return [];
 const ra=onRamp(from.x,from.z),rb=onRamp(to.x,to.z);
 if(!ra&&!rb)return basePath(from,to);
 if(ra&&rb&&ra.id===rb.id)return rampSegment(ra,from,to,from.floor);
 const origins=ra?[{anchor:{x:ra.x,z:15.5,floor:0},segment:rampSegment(ra,from,{x:ra.x,z:15.5},from.floor)},{anchor:{x:ra.x,z:-15.5,floor:1},segment:rampSegment(ra,from,{x:ra.x,z:-15.5},from.floor)}]:[{anchor:from,segment:[]}];
 const destinations=rb?[{anchor:{x:rb.x,z:15.5,floor:0},segment:rampSegment(rb,{x:rb.x,z:15.5},to,0)},{anchor:{x:rb.x,z:-15.5,floor:1},segment:rampSegment(rb,{x:rb.x,z:-15.5},to,1)}]:[{anchor:to,segment:[]}];
 let best=[],length=Infinity;for(const a of origins)for(const b of destinations){const middle=basePath(a.anchor,b.anchor);if(!middle.length)continue;const path=[...a.segment,...middle.slice(a.segment.length?1:0),...b.segment.slice(1)],n=path.reduce((d,p,i)=>i?d+Math.hypot(p.x-path[i-1].x,p.z-path[i-1].z,(p.y??p.floor*8)-(path[i-1].y??path[i-1].floor*8)):0,0);if(n<length){best=path;length=n;}}
 return best;
}
