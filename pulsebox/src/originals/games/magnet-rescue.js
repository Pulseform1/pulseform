// 5. Magnet Rescue: a driven pendulum, pickup constraints, and delivery zones. Six docks: presses (one that slides),
// crate stacks that knock cargo loose, crosswinds, and a dock where the bay is on the left.
function robot(x,y,c='#8dd2ce',happy=false){rr(x-15,y-16,30,29,6,c,'#274750');rr(x-10,y-10,20,12,4,'#203c48');circle(x-5,y-5,2,'#d3f3d9');circle(x+5,y-5,2,'#d3f3d9');line(x-7,y+14,x-7,y+20,'#729491',5);line(x+7,y+14,x+7,y+20,'#729491',5);line(x,y-17,x,y-23,'#7aa7a6',2);circle(x,y-24,3,happy?'#e5d384':'#ed9c7f')}
const DOCKS=[
  {name:'DOCK 07 / FIRST SHIFT',robots:[180,270,365,455,550],hazards:[{x:610,w:90,h:98}],crates:[],bay:[732,910],wind:0,crane:210},
  {name:'DOCK 09 / TWIN PRESSES',robots:[110,190,270,350,430],hazards:[{x:500,w:70,h:112},{x:640,w:70,h:150}],crates:[],bay:[750,910],wind:0,crane:150},
  {name:'DOCK 12 / CRATE STACKS',robots:[120,200,270,390,470],hazards:[{x:655,w:70,h:90}],crates:[{x:315,w:44,h:125},{x:540,w:80,h:175}],bay:[755,910],wind:0,crane:160},
  {name:'DOCK 15 / SHUTTLE PRESS',robots:[120,200,280,360,440],hazards:[{x:520,w:80,h:115,move:[505,655,55]}],crates:[],bay:[760,910],wind:0,crane:160},
  {name:'DOCK 21 / CROSSWIND',robots:[110,190,270,350,450],hazards:[{x:590,w:90,h:120}],crates:[{x:510,w:40,h:90}],bay:[755,910],wind:1,crane:150},
  {name:'DOCK 30 / BACKWARDS',robots:[500,580,660,740,840],hazards:[{x:300,w:80,h:130}],crates:[{x:420,w:46,h:150}],bay:[50,215],wind:.6,crane:800}];
const magSave=loadSave({unlocked:1,stars:[]});
const GROUND=513;
GAMES['magnet-rescue']={
  init(){return state&&state.mode==='play'&&state.dock!==undefined?this.dock(state.dock):this.dock(0,true)},   // Play again replays the dock
  dock(i,menu=false){const D=DOCKS[i];return {mode:menu?'menu':'play',dock:i,crane:D.crane,vx:0,length:220,angle:.15,omega:0,magnet:false,held:null,
    robots:D.robots.map(x=>({x,y:this.floorAt(D,x)})),hazards:D.hazards.map(h=>({...h})),rescued:0,lives:3,over:false,won:false,target:null,flash:0,gust:0,t:0,msg:'Lower the magnet near a robot, then switch it on.'}},
  floorAt(D,x){for(const c of D.crates)if(x>c.x-4&&x<c.x+c.w+4)return GROUND-c.h-15;return 498},
  ui(){if(state.mode==='menu'){controls('');status('Choose a dock. Rescue all five robots to unlock the next.');metric('Magnet Rescue');return}
    controls(action('← Crane','left')+action('Crane →','right')+action('Raise cable','up')+action('Lower cable','down')+action(state.magnet?'Magnet ON • release':'Magnet OFF • attach','magnet',true)+action('Docks','menu'));status(state.msg);metric(state.rescued+' / 5 rescued')},
  pos(){return {x:state.crane+Math.sin(state.angle)*state.length,y:83+Math.cos(state.angle)*state.length}},
  action(a){if(a==='menu'){state=this.dock(state.dock,true);this.ui();return}if(a==='nextdock'){state=this.dock(Math.min(DOCKS.length-1,state.dock+1));this.ui();return}
    if(state.mode!=='play'||state.over||state.won)return;
    if(a==='left')state.target=clamp(state.crane-55,50,900);if(a==='right')state.target=clamp(state.crane+55,50,900);if(a==='up')state.length=clamp(state.length-25,100,383);if(a==='down')state.length=clamp(state.length+25,100,383);
    if(a==='magnet'){state.magnet=!state.magnet;beep(state.magnet?600:320);if(!state.magnet&&state.held!==null)this.drop(state.omega*Math.cos(state.angle)*state.length,-state.omega*Math.sin(state.angle)*state.length,'Cargo released. Aim inside the striped bay.');this.ui()}},
  drop(vx,vy,msg){const r=state.robots[state.held],p=this.pos();r.x=p.x;r.y=p.y+31;r.vx=vx;r.vy=vy;r.falling=true;state.held=null;state.msg=msg;status(msg)},
  key(k){if(state.mode==='menu'){const n=Number(k)-1;if(n>=0&&n<magSave.unlocked){state=this.dock(n);this.ui()}return}if(k===' ')this.action('magnet')},
  pointer(type,p){if(state.mode==='play'&&(type==='down'||pointer.down))state.target=clamp(p.x,50,900)},
  update(dt){if(state.mode!=='play'||state.over||state.won)return;const D=DOCKS[state.dock];state.t+=dt;state.flash=Math.max(0,state.flash-dt);
    for(const h of state.hazards)if(h.move){const [a,b,s]=h.move;h.x=a+(b-a)*(.5-.5*Math.cos(state.t*s/(b-a)*Math.PI))}
    let old=state.vx;let direction=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
    if(direction){state.target=null;state.vx=lerp(state.vx,direction*220,dt*6)}else if(state.target!==null)state.vx=clamp((state.target-state.crane)*4,-220,220);else state.vx*=Math.exp(-dt*7);
    state.crane=clamp(state.crane+state.vx*dt,50,900);if(keys.w||keys.arrowup)state.length=clamp(state.length-95*dt,100,383);if(keys.s||keys.arrowdown)state.length=clamp(state.length+95*dt,100,383);
    let acc=(state.vx-old)/Math.max(.001,dt);state.gust=D.wind*(Math.sin(state.t*.9)*.6+Math.sin(state.t*2.3)*.4);
    state.omega+=(-800/state.length*Math.sin(state.angle)-acc/state.length*Math.cos(state.angle)-state.omega*.8+state.gust*.55*Math.cos(state.angle))*dt;state.angle=clamp(state.angle+state.omega*dt,-1.1,1.1);
    const p=this.pos();
    if(state.magnet&&state.held===null){let i=state.robots.findIndex(r=>!r.saved&&!r.lost&&!r.falling&&Math.hypot(r.x-p.x,r.y-(p.y+32))<38);if(i>=0){state.held=i;state.msg='Robot attached. Carry it to the striped rescue bay.';status(state.msg);beep(850)}}
    state.robots.forEach((r,i)=>{if(r.saved||r.lost)return;if(i===state.held){r.x=p.x;r.y=p.y+32;
        for(const c of D.crates)if(r.x>c.x-15&&r.x<c.x+c.w+15&&r.y+20>GROUND-c.h&&r.y<GROUND){this.drop(r.x<c.x+c.w/2?-90:90,-60,'Bumped a crate stack! Lift higher before crossing.');beep(200);shake(5);break}}
      if(r.falling){r.vy+=550*dt;r.x+=r.vx*dt;r.y+=r.vy*dt;const fl=this.floorAt(D,r.x);
        if(r.y>=fl){r.y=fl;r.falling=false;const inBay=fl===498&&r.x>D.bay[0]&&r.x<D.bay[1];
          if(inBay&&Math.abs(r.vx)<220){r.saved=true;state.rescued++;state.msg='Robot safe! '+state.rescued+' of 5 rescued.';status(state.msg);saveBest(state.rescued+state.dock*5);popText(r.x,r.y-40,'SAVED!','#c7e5b4');beep(950)}
          else if(r.x<30||r.x>930){r.lost=true;state.lives--;state.msg='Robot fell outside the work area.';status(state.msg)}
          else{r.vx=0;state.msg=inBay?'Too fast! It bounced off the bay floor. Pick it up and set it down gently.':'Robot landed outside the bay. Pick it up and try again.';status(state.msg)}}}
      for(const h of state.hazards)if(r.x>h.x-8&&r.x<h.x+h.w+8&&r.y>GROUND-h.h-30){r.lost=true;state.lives--;if(i===state.held)state.held=null;state.flash=.4;state.msg='Robot damaged by a red press. Lift higher before crossing.';status(state.msg);burst(r.x,r.y,['#ff7a5a','#ffd23f','#ffffff'],18,260);shake(8);beep(120,.2);break}});
    state.lives=Math.max(0,state.lives);state.over=state.lives<=0||state.robots.every(r=>r.saved||r.lost);state.won=state.rescued===state.robots.length;
    if(state.over||state.won){if(state.rescued>=3){const s=state.won?state.lives:1;magSave.stars[state.dock]=Math.max(magSave.stars[state.dock]||0,s)}if(state.won)magSave.unlocked=Math.max(magSave.unlocked,Math.min(DOCKS.length,state.dock+2));storeSave(magSave)}
    metric(state.rescued+' / 5 rescued')},
  drawMenu(){board('#1c303a');const tot=magSave.stars.reduce((a,b)=>a+(b||0),0);heading('ROBOT RECOVERY / CHOOSE A DOCK','★ '+tot+' / '+DOCKS.length*3,'#64d6dd');
    text('MAGNET RESCUE',480,118,42,'#e3f6f3','center',900);text('Rescue all five robots on a dock to unlock the next one.',480,156,16,'#9bb8bc','center');
    DOCKS.forEach((D,i)=>{const x=72+(i%3)*280,y=190+Math.floor(i/3)*180,open=i<magSave.unlocked;rr(x,y,256,160,14,open?'#24414b':'#1d2a30',open?'#64d6dd':null);
      const [code,...rest]=D.name.split(' / ');text(code,x+18,y+28,13,open?'#64d6dd':'#4d6870');text(rest.join(' / '),x+18,y+56,19,open?'#e3f6f3':'#5b737a','left',850);
      stars(magSave.stars[i]||0,x+70,y+92,18);if(open)btn(magSave.stars[i]?'Play again':'Start',x+150,y+106,90,38,()=>{state=this.dock(i);this.ui();beep(660)},'#2f6a72');else text('🔒 Locked',x+195,y+125,13,'#5b737a','center')})},
  draw(){if(state.mode==='menu')return this.drawMenu();const D=DOCKS[state.dock];board(state.flash>0?'#4b2d32':'#1c303a');heading(D.name,state.lives+' HULL LIVES • A/D MOVE • W/S CABLE','#64d6dd');
    for(let x=0;x<960;x+=120){rr(x+14,120,92,250,4,'#1f3943');for(let wy=136;wy<350;wy+=36)for(let wx=x+24;wx<x+96;wx+=24)rect(wx,wy,16,24,(wx*7+wy)%5===0?'#3f6a73':'#2a4a54')}for(let x=30;x<960;x+=80)rr(x-8,390,37,110,3,'#243e47');rect(0,519,960,81,'#15252c');const fg=ctx.createLinearGradient(0,513,0,600);fg.addColorStop(0,'#2a3e44');fg.addColorStop(1,'#101c22');ctx.fillStyle=fg;ctx.fillRect(0,519,960,81);rect(0,511,960,9,'#9aaaa0');for(let x=0;x<960;x+=40)line(x,512,x+20,519,'#7a8a82',2);line(30,72,930,72,'#5a7a7a',4);line(30,94,930,94,'#5a7a7a',4);ctx.strokeStyle='#4a6a6a';ctx.lineWidth=2;ctx.beginPath();for(let x=30;x<930;x+=30){ctx.moveTo(x,72);ctx.lineTo(x+15,94);ctx.lineTo(x+30,72)}ctx.stroke();
    if(D.wind){const g=state.gust;for(let n=0;n<14;n++){const y=120+n*26,x=((state.t*140*Math.sign(g||1)+n*97)%1000+1000)%1000-20;line(x,y,x+30*Math.sign(g||1)*Math.min(1,Math.abs(g)+.3),y,'#9fd6e0'+(Math.abs(g)>.4?'66':'33'),2)}text('WIND '+(g>0?'→':'←')+' '+Math.round(Math.abs(g)*10),900,104,12,'#9fd6e0','right',800)}
    for(const c of D.crates){rr(c.x,GROUND-c.h,c.w,c.h,4,'#8a6a42','#c49a62');for(let y=GROUND-c.h+20;y<GROUND;y+=34)line(c.x+4,y,c.x+c.w-4,y,'#6a4e2e',3)}
    rr(state.crane-36,58,72,44,6,'#e0b048','#7a5a18');rr(state.crane-26,64,24,18,3,'#bfe6ee');for(let k=0;k<4;k++)line(state.crane+6+k*7,66,state.crane+6+k*7,94,'#b08a30',3);circle(state.crane-22,98,7,'#2a2a2a');circle(state.crane+22,98,7,'#2a2a2a');const p=this.pos();ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-state.angle);line(0,0,0,0,'#000',1);ctx.restore();line(state.crane,102,p.x,p.y-12,'#2a2a2a',4);line(state.crane,102,p.x,p.y-12,'#c8d4cc',1.5);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-state.angle);rr(-6,-16,12,10,2,'#5a5a5a');ctx.lineCap='butt';ctx.strokeStyle=state.magnet?'#e8433a':'#a83a34';ctx.lineWidth=13;ctx.beginPath();ctx.arc(0,0,17,Math.PI,0);ctx.lineTo(17,14);ctx.moveTo(-17,0);ctx.lineTo(-17,14);ctx.stroke();rect(-24,12,14,8,'#dfe6ea');rect(10,12,14,8,'#dfe6ea');if(state.magnet){for(let k=0;k<3;k++){const ph=(totalTime*1.5+k/3)%1;ctx.globalAlpha=1-ph;ctx.strokeStyle='#7ae4ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,24,10+ph*30,.15*Math.PI,.85*Math.PI);ctx.stroke()}ctx.globalAlpha=1}ctx.restore();
    for(const h of state.hazards){rr(h.x,GROUND-h.h,h.w,h.h,9,'#7a3f3c','#d99078');for(let n=0;n<Math.floor(h.w/25);n++){line(h.x+10+n*25,GROUND-h.h+16,h.x+26+n*25,GROUND-h.h+33,'#eda285',5);line(h.x+26+n*25,GROUND-h.h+16,h.x+10+n*25,GROUND-h.h+33,'#eda285',5)}text('DANGER',h.x+h.w/2,GROUND-22,11,'#f9c6a7','center');if(h.move)text('◄ ►',h.x+h.w/2,GROUND-h.h-12,13,'#f9c6a7','center')}
    rect(D.bay[0],501,D.bay[1]-D.bay[0],12,'#d5c27c');for(let x=D.bay[0]+3;x<D.bay[1]-10;x+=20)line(x,501,x+10,513,'#384b48',5);const bx=(D.bay[0]+D.bay[1])/2;rr(bx-84,364,168,49,7,'#35544d','#789d83');text('RESCUE BAY',bx,388,19,'#c7e5b4','center',850);
    state.robots.forEach(r=>{if(!r.saved&&!r.lost)robot(r.x,r.y)});for(let i=0;i<state.rescued;i++)robot(D.bay[0]+22+i*33,481,'#aecb92',true);
    text(D.wind?'Gusts push the cable. Wait for a lull before you let go.':D.crates.length?'Crates knock cargo loose. Red presses wreck it.':'Keep the cargo above the red machines.',40,560,16,'#9bb8bc');
    if(state.won||state.over){const last=state.dock===DOCKS.length-1;done(state.won?(last?'Every dock is clear!':'Dock clear!'):'Shift over',state.rescued+' of 5 robots rescued. '+(state.won?(last?'You finished all six docks.':'The next dock is unlocked.'):'Keep the magnet high when crossing hazards.'));
      if(state.won&&!last)btn('Next dock →',365,352,230,46,()=>this.action('nextdock'),'#2f6a72');stars(state.won?state.lives:0,480,208,20)}}
};
