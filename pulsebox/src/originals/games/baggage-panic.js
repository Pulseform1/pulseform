// 1. Baggage Panic: exact-cover packing, generated from a known valid tiling. Suitcases grow and new belongings
// turn up as you go; a suitcase packed without taking anything back out earns three stars.
const luggage=[{name:'Camera',c:'#e9ae64',icon:'📷'},{name:'Boots',c:'#a3c9bc',icon:'🥾'},{name:'Sweater',c:'#d79fa3',icon:'🧶'},{name:'Book',c:'#a7b5db',icon:'📘'},{name:'Toy',c:'#d8d28c',icon:'🎲'},{name:'Umbrella',c:'#b9a3cc',icon:'☂️'},{name:'Laptop',c:'#8fc3e8',icon:'💻'},{name:'Teddy',c:'#e2b48c',icon:'🧸'},{name:'Skates',c:'#9fd38a',icon:'🛼'}];
const packShapes=[[[0,0],[1,0],[0,1],[1,1]],[[0,0],[0,1],[0,2],[1,2]],[[0,0],[1,0],[2,0]],[[0,0],[1,0],[0,1]],[[0,0],[1,0]],[[0,0],[0,1],[0,2],[0,3]],[[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]],[[0,0],[1,0],[2,0],[1,1]],[[0,0],[1,0],[1,1],[2,1]]];
function packShape(i){return packShapes[i].map(a=>a.slice())}
function rotateShape(cells){let a=cells.map(([x,y])=>[-y,x]),minX=Math.min(...a.map(a=>a[0])),minY=Math.min(...a.map(a=>a[1]));return a.map(([x,y])=>[x-minX,y-minY])}
// how big each suitcase is, and how many belongings go in it
function packSpec(level){return level<4?{w:7,h:6,n:6}:level<8?{w:8,h:6,n:7}:level<12?{w:8,h:7,n:8}:{w:9,h:7,n:9}}
function packNew(level,salt=0){
  const spec=packSpec(level),random=rng(level*91+7+salt*7919),kinds=[];
  // the first suitcases use the classic six; later ones mix in the new belongings
  const pool=level<4?[0,1,2,3,4,5]:[0,1,2,3,4,5,6,7,8];
  while(kinds.length<spec.n){const k=pool[Math.floor(random()*pool.length)];if(!kinds.includes(k)||kinds.length>=pool.length)kinds.push(k)}
  const grid=Array.from({length:spec.h},()=>Array(spec.w).fill(-1)),parts=[];let attempts=0;
  while(parts.length<spec.n&&attempts++<3000){const i=parts.length,k=kinds[i];let shape=packShape(k);for(let j=0;j<Math.floor(random()*4);j++)shape=rotateShape(shape);
    const x=Math.floor(random()*spec.w),y=Math.floor(random()*spec.h);
    if(shape.every(([a,b])=>x+a<spec.w&&y+b<spec.h&&grid[y+b][x+a]===-1)){shape.forEach(([a,b])=>grid[y+b][x+a]=i);parts.push({...luggage[k],kind:k,cells:rotateShape(shape),placed:null,solution:{x,y,shape}})}}
  if(parts.length<spec.n)return packNew(level,salt+1);
  return {level,w:spec.w,h:spec.h,parts,grid:grid.map(row=>row.map(x=>x<0?-2:-1)),selected:0,won:false,unpacks:0,order:0,msg:level===4?'Bigger suitcase! New belongings: laptop, teddy and skates.':level===8||level===12?'An even bigger suitcase this time.':'Choose an item, then tap a suitcase square.'}
}
function packLayout(){const sz=Math.min(64,Math.floor(460/state.w),Math.floor(400/state.h));return {sz,ox:Math.round(281-state.w*sz/2),oy:Math.round(317-state.h*sz/2)}}
const packSave=loadSave({level:1,stars:{}});
GAMES['baggage-panic']={
  init(){return packNew(packSave.level)},
  ui(){controls(action('Rotate ↻','rotate')+action('Undo last','undo')+action(state.won?'Next suitcase →':'Skip suitcase','next',state.won));status(state.msg);metric(state.parts.filter(x=>x.placed).length+' / '+state.parts.length+' packed')},
  action(a){
    if(a==='rotate'&&state.selected>=0&&!state.parts[state.selected].placed){state.parts[state.selected].cells=rotateShape(state.parts[state.selected].cells);beep(330)}
    if(a==='undo'){const placed=state.parts.map((p,i)=>[p.placed?.n??-1,i]).filter(x=>x[0]>=0).sort((a,b)=>b[0]-a[0]);if(placed.length)this.remove(placed[0][1])}
    if(a==='next'){const level=state.level+1;if(state.won){packSave.level=Math.max(packSave.level,level);storeSave(packSave)}state=packNew(level);this.ui()}
  },
  key(k){if(k==='r')this.action('rotate');if(k==='z'||k==='backspace')this.action('undo')},
  remove(i){state.grid.forEach(r=>r.forEach((v,x)=>{if(v===i)r[x]=-1}));state.parts[i].placed=null;state.selected=i;state.won=false;state.unpacks++;state.msg='Item unpacked. Rotate it or choose a different spot.';this.ui()},
  pointer(type,p){if(type!=='down'||state.won)return;const L=packLayout();let x=Math.floor((p.x-L.ox)/L.sz),y=Math.floor((p.y-L.oy)/L.sz);
    if(x>=0&&x<state.w&&y>=0&&y<state.h){let v=state.grid[y][x];let i=state.selected,item=state.parts[i];if(!item||item.placed){if(v>=0)this.remove(v);return}
      if(item.cells.every(([a,b])=>y+b<state.h&&x+a<state.w&&state.grid[y+b][x+a]===-1)){item.cells.forEach(([a,b])=>state.grid[y+b][x+a]=i);item.placed={x:x+item.cells[0][0],y:y+item.cells[0][1],n:++state.order};beep(640);
        state.selected=state.parts.findIndex(x=>!x.placed);state.won=state.selected<0;
        if(state.won){const s=state.unpacks===0?3:state.unpacks<=2?2:1;state.starsWon=s;packSave.stars[state.level]=Math.max(packSave.stars[state.level]||0,s);packSave.level=Math.max(packSave.level,state.level+1);storeSave(packSave);saveBest(state.level);state.msg=s===3?'Perfect pack! Three stars.':'Everything fits. Pack it without taking anything out for three stars.'}
        else state.msg='Nice fit. Choose the next item.';this.ui()}
      else{if(v>=0){this.remove(v);return}state.msg='That spot overlaps an item or a crossed-out square.';status(state.msg);beep(150)}}},
  draw(){board('#242b34');const total=Object.values(packSave.stars).reduce((a,b)=>a+b,0);
    heading('DEPARTURES / SUITCASE '+state.level+'  •  '+state.w+'×'+state.h,'★ '+total+'  •  R ROTATE  •  Z UNDO','#f6b765');
    const L=packLayout(),bw=state.w*L.sz+34,bh=state.h*L.sz+34,bx=L.ox-19,by=L.oy-19;ctx.strokeStyle='#4a3020';ctx.lineWidth=9;ctx.beginPath();ctx.roundRect(bx+bw/2-62,by-34,124,40,14);ctx.stroke();ctx.strokeStyle='#8a5c3c';ctx.lineWidth=4;ctx.stroke();rr(bx,by,bw,bh,24,'#8a5c3e','#5a3a24');ctx.setLineDash([7,6]);ctx.strokeStyle='#e8c89a99';ctx.lineWidth=1.6;ctx.beginPath();ctx.roundRect(bx+8,by+8,bw-16,bh-16,18);ctx.stroke();ctx.setLineDash([]);for(const [cx,cy] of [[bx,by],[bx+bw,by],[bx,by+bh],[bx+bw,by+bh]])circle(cx+(cx===bx?10:-10),cy+(cy===by?10:-10),8,'#c8c0b0');rr(bx+bw*.25-14,by-6,28,14,3,'#d8cfa8','#6a5a3a');rr(bx+bw*.75-14,by-6,28,14,3,'#d8cfa8','#6a5a3a');
    for(let y=0;y<state.h;y++)for(let x=0;x<state.w;x++){const v=state.grid[y][x],px=L.ox+x*L.sz,py=L.oy+y*L.sz,s=L.sz-4;rr(px,py,s,s,7,v===-2?'#443c37':v===-1?'#2a2422':state.parts[v].c);if(v>=0){const it=state.parts[v];if(it.placed&&it.placed.x===x&&it.placed.y===y)text(it.icon,px+s/2,py+s/2+1,s*.5,'#000','center')}if(v===-2){line(px+s*.22,py+s*.22,px+s*.78,py+s*.78,'#69574a',2);line(px+s*.78,py+s*.22,px+s*.22,py+s*.78,'#69574a',2)}}
    const n=state.parts.length,rows=Math.ceil(n/2),ch=Math.min(125,Math.floor((440-(rows-1)*8)/rows));
    state.parts.forEach((item,i)=>{let x=565+(i%2)*177,y=96+Math.floor(i/2)*(ch+8);rr(x,y,162,ch,12,item.placed?'#283d37':i===state.selected?'#53505a':'#303844',i===state.selected?'#f6b765':null);text(item.name,x+14,y+17,15,item.placed?'#90cfaa':'#efe5d5');text(item.icon,x+146,y+18,17,'#000','center');
      const hh=Math.max(...item.cells.map(c=>c[1]))+1,cs=Math.min(19,Math.floor((ch-38)/hh));item.cells.forEach(([a,b])=>rr(x+18+a*(cs+4),y+34+b*cs,cs+2,cs-2,3,item.placed?'#527363':item.c));
      if(item.placed)text('PACKED',x+148,y+ch-14,10,'#a3dfb7','right');else buttons.push({x,y,w:162,h:ch,fn:()=>{state.selected=i;beep(420)}})});
    text('Crossed-out squares stay empty',58,572,13,'#cbb49b');stars(packSave.stars[state.level]||0,470,572,16);
    metric(state.parts.filter(x=>x.placed).length+' / '+n+' packed');
    if(state.won){rr(L.ox+state.w*L.sz/2-175,252,350,140,16,'#192e29f5','#a3cf99');text('ALL PACKED',L.ox+state.w*L.sz/2,286,30,'#c6e9ad','center',850);stars(state.starsWon,L.ox+state.w*L.sz/2,326,28);text('Tap Next suitcase for the next trip.',L.ox+state.w*L.sz/2,364,15,'#d6ddd3','center')}}
};
