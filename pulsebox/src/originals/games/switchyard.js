// 2. Switchyard: trains move along an explicit branch graph. Three shifts (and an endless one) add express trains
// (fast, worth 2) and long freight trains (slow, worth 3). Trains queue behind each other, and signals hold a train
// short of a merge while the upper line is busy, so the challenge is routing every train to its own station.
const syStations=[{name:'ORCHARD',c:'#e8bc70',y:195},{name:'HARBOR',c:'#78c8da',y:410}];
const SY_SHIFTS=[
  {name:'MORNING',sub:'Two colors. Learn the junctions.',time:150,spawn:[5,2.6],speed:50,express:0,freight:0,bg:'#1f302b'},
  {name:'AFTERNOON',sub:'Express trains: fast, worth 2.',time:180,spawn:[4.6,2.3],speed:54,express:.28,freight:0,bg:'#2b2a22'},
  {name:'NIGHT',sub:'Freight trains: long, slow, worth 3.',time:210,spawn:[4.3,2.1],speed:57,express:.25,freight:.22,bg:'#141b24'},
  {name:'ENDLESS',sub:'Three lives. How long can you last?',time:Infinity,spawn:[4.2,1.7],speed:56,express:.25,freight:.2,bg:'#221a2b'}];
// scenery and rolling stock
function syTree(x,y,s,night){rect(x-3*s,y,6*s,14*s,night?'#2a2018':'#5a3e26');circle(x,y-6*s,14*s,night?'#1d3a2c':'#3f7a4a');circle(x-9*s,y+1*s,10*s,night?'#18301f':'#356a3f');circle(x+9*s,y,11*s,night?'#204234':'#4a8a55')}
function syTrack(x,y,a,b,night){const len=Math.hypot(a-x,b-y),ux=(a-x)/len,uy=(b-y)/len,nx=-uy,ny=ux;ctx.strokeStyle=night?'#2a2420':'#5a4030';ctx.lineWidth=4;ctx.lineCap='butt';ctx.beginPath();for(let d=6;d<len;d+=13){const px=x+ux*d,py=y+uy*d;ctx.moveTo(px+nx*9,py+ny*9);ctx.lineTo(px-nx*9,py-ny*9)}ctx.stroke();
  for(const k of [-5,5]){line(x+nx*k,y+ny*k,a+nx*k,b+ny*k,'#1a1a1a',4);line(x+nx*k,y+ny*k-.8,a+nx*k,b+ny*k-.8,night?'#8a96a6':'#b9c2c8',1.6)}}
function syTrain(t,c,night){const x=t.x,y=t.y;
  if(t.kind==='freight'){rr(x-80,y-14,48,26,4,'#6f6a5e','#2a2a2a');for(let k=0;k<4;k++)line(x-74+k*12,y-10,x-74+k*12,y+8,'#58544a',2);circle(x-70,y+15,5,'#222');circle(x-42,y+15,5,'#222');line(x-32,y+4,x-26,y+4,'#222',3)}
  if(night){const g=ctx.createRadialGradient(x+34,y,2,x+40,y,80);g.addColorStop(0,'rgba(255,240,180,.45)');g.addColorStop(1,'rgba(255,240,180,0)');ctx.fillStyle=g;ctx.fillRect(x+20,y-60,110,120)}
  for(let k=0;k<4;k++){const ph=(totalTime*1.6+k/4+t.id*.37)%1;ctx.globalAlpha=(1-ph)*.55;circle(x+14-ph*46,y-26-ph*30,5+ph*11,night?'#8890a0':'#e8e8e8');ctx.globalAlpha=1}
  rr(x-27,y-12,40,26,5,c,'#2a2a2a');rr(x-30,y-22,20,36,4,shadeHex(c,-.2),'#2a2a2a');rr(x-26,y-17,12,10,2,'#cfe8f0');
  rr(x+8,y-9,22,20,8,shadeHex(c,-.1),'#2a2a2a');rr(x+12,y-22,8,13,2,'#3a3a3a');circle(x+31,y+1,4,'#fff6c0');
  if(t.kind==='express'){line(x-26,y+5,x+28,y+5,'#ffffff',3);line(x-26,y+9,x+28,y+9,'#ffffff88',2)}
  for(const wx of [-20,-4,14]){circle(x+wx,y+15,6,'#2a2a2a');circle(x+wx,y+15,2.5,'#9a9a9a')}line(x-20,y+15,x+14,y+15,'#8a8a8a',2);
  text(t.id,x-7,y+1,10,'#1b2a2c','center',900)}
const shadeHex=(h,k)=>shade(h,k);
const sySave=loadSave({unlocked:1,stars:[0,0,0],best:0});
GAMES.switchyard={
  init(){const again=state&&state.mode==='play'&&state.shift!==undefined;   // Play again replays the same shift
    return {mode:again?'play':'menu',shift:again?state.shift:0,fast:false,switches:[0,1,0],trains:[],clock:0,spawn:1,delivered:0,points:0,lives:3,over:false,serial:0}},
  begin(i){Object.assign(state,{mode:'play',shift:i,switches:[0,1,0],trains:[],clock:0,spawn:1,delivered:0,points:0,lives:3,over:false,serial:0,fast:false});this.ui();beep(660)},
  ui(){if(state.mode==='menu'){controls('');status('Pick a shift. Finish one to unlock the next.');metric('Switchyard');return}
    controls(action('Junction 1','0')+action('Junction 2','1')+action('Junction 3','2')+action(state.fast?'Normal speed':'Fast forward','fast')+action('Shifts','menu'));status('Follow the train’s color. Set every junction before it arrives. Signals hold trains at merges.');metric(state.points+' points')},
  action(a){if(a==='menu'){state=this.init();this.ui();return}if(state.mode!=='play')return;if(a==='fast'){state.fast=!state.fast;this.ui();return}const n=Number(a);if(n>=0&&n<3&&!state.over){state.switches[n]^=1;beep(440+n*90)}},
  key(k){if(state.mode==='menu'){const n=Number(k)-1;if(n>=0&&n<Math.min(4,sySave.unlocked))this.begin(n);return}if('123'.includes(k))this.action(String(Number(k)-1))},
  update(dt){if(state.mode!=='play'||state.over)return;const S=SY_SHIFTS[state.shift];dt*=state.fast?2:1;state.clock+=dt;state.spawn-=dt;
    if(state.spawn<=0){let random=rng(++state.serial*914+17+state.shift*31);const r=random(),kind=r<S.freight?'freight':r<S.freight+S.express?'express':'local';
      if(!state.trains.some(t=>t.route===null&&t.x<70))state.trains.push({x:-55,y:302,target:random()>.5?1:0,route:null,junction:0,id:state.serial,kind});
      state.spawn=Math.max(S.spawn[1],S.spawn[0]-state.clock/60)}
    const base=S.speed+state.clock*(state.shift===3?.12:.15);
    // furthest-along trains move first so the ones behind can queue
    state.trains.sort((a,b)=>b.x-a.x);
    for(const t of state.trains){const mul=t.kind==='express'?1.45:t.kind==='freight'?.72:1;let nx=t.x+base*mul*dt;
      const len=t.kind==='freight'?96:56;
      for(const u of state.trains){if(u===t||u.x<=t.x)continue;const gap=(u.kind==='freight'?48:28)+len/2+10;if(this.same(t,u)&&u.x-nx<gap)nx=Math.max(t.x,u.x-gap)}
      // signals: a train joining the upper line waits short of the merge while traffic on that line goes by
      if(t.route===0&&(t.junction===2||t.junction===3)){const mx=t.junction===2?600:820;if(t.x<=mx-70&&nx>mx-70&&state.trains.some(u=>u!==t&&u.y<=196&&u.x>mx-130&&u.x<mx+60+(u.kind==='freight'?60:0))){nx=mx-70;t.waiting=true}else t.waiting=false}
      t.x=nx;
      if(t.x>=245&&t.route===null){t.route=state.switches[0]===0?0:2;t.junction=1}
      if(t.route===2&&t.x>=490){t.route=state.switches[1]===0?0:3;t.junction=2}
      if(t.route===3&&t.x>=710){t.route=state.switches[2]===0?0:1;t.junction=3}
      t.y=this.y(t);
      if(t.x>899+(t.kind==='freight'?20:0)){const worth=t.kind==='freight'?3:t.kind==='express'?2:1;
        if(t.route===t.target){state.delivered++;state.points+=worth;popText(880,t.y-30,'+'+worth,syStations[t.target].c);beep(780)}else{state.lives--;popText(880,t.y-30,'WRONG',  '#ff8a7a');beep(140,.2)}t.remove=true}}
    for(let i=0;i<state.trains.length;i++)for(let j=i+1;j<state.trains.length;j++){let a=state.trains[i],b=state.trains[j];
      const r=(a.kind==='freight'?30:0)+(b.kind==='freight'?30:0)+40;
      if(!a.remove&&!b.remove&&!this.same(a,b)&&dist(a,b)<r){a.remove=b.remove=true;state.lives--;burst((a.x+b.x)/2,(a.y+b.y)/2,['#ffb36e','#ff5a3a','#fff'],26,300);shake(9);status('Collision where two lines merge! Leave a gap before switching a train onto a busy line.');beep(130,.2)}}
    state.trains=state.trains.filter(t=>!t.remove);state.lives=Math.max(0,state.lives);
    state.over=state.lives<=0||state.clock>=S.time;
    if(state.over){if(state.shift<3&&state.lives>0){sySave.stars[state.shift]=Math.max(sySave.stars[state.shift],state.lives);sySave.unlocked=Math.max(sySave.unlocked,state.shift+2)}
      if(state.shift===3)sySave.best=Math.max(sySave.best,state.points);storeSave(sySave);saveBest(state.points)}
    metric(state.points+' points')},
  // on the same stretch of track: level with each other, or sent the same way at the same junction (sloped track)
  same(a,b){if(Math.abs(a.y-b.y)<6||(a.route===b.route&&a.junction===b.junction))return true;
    // a train that just turned off still blocks the junction with its tail until it has fully cleared it
    const [back,front]=a.x<b.x?[a,b]:[b,a],jx=[0,245,490,710][front.junction]||0;return front.junction>0&&back.x<jx&&front.x-jx<(front.kind==='freight'?150:90)},
  y(t){if(t.route===null)return 302;if(t.route===0){let start=t.junction===1?245:t.junction===2?490:710;return lerp(302,195,clamp((t.x-start)/110,0,1))}if(t.route===1)return lerp(302,410,clamp((t.x-710)/110,0,1));return 302},
  drawMenu(){board('#1f302b');heading('WESTFIELD RAIL / CHOOSE A SHIFT','★ '+sySave.stars.reduce((a,b)=>a+b,0)+' / 9','#b7df94');
    text('SWITCHYARD',480,120,44,'#e8f2d8','center',900);text('Route every train to the station of its color.',480,160,17,'#a9bfa9','center');
    SY_SHIFTS.forEach((S,i)=>{const x=60+i*215,y=200,open=i<sySave.unlocked;rr(x,y,195,300,16,open?'#2c4236':'#232a27',open?'#b7df94':null);
      text(S.name,x+97,y+40,20,open?'#e8f2d8':'#6b7a70','center',900);wrap(S.sub,x+18,y+82,160,14,open?'#bcd0bc':'#5d6b62',20);
      if(i<3)text(S.time/60+' min shift',x+97,y+170,14,'#8da996','center');else text('Best: '+sySave.best+' pts',x+97,y+170,14,'#8da996','center');
      if(i<3)stars(sySave.stars[i],x+97,y+206,22);
      if(open)btn(i<3&&sySave.stars[i]?'Play again':'Start',x+32,y+236,131,42,()=>this.begin(i),'#3e5644');else text('🔒 Finish the shift before',x+97,y+256,12,'#6b7a70','center')})},
  draw(){if(state.mode==='menu')return this.drawMenu();const S=SY_SHIFTS[state.shift],night=state.shift===2;board(S.bg);
    heading('WESTFIELD RAIL / '+S.name+' SHIFT',(S.time===Infinity?Math.floor(state.clock)+'s':Math.ceil(Math.max(0,S.time-state.clock))+'s LEFT')+'  •  '+state.lives+' SIGNAL LIVES','#b7df94');
    for(let x=60;x<900;x+=120){syTree(x,104,.9,night);syTree(x+40,540,1.15,night)}
    const track=(x,y,a,b)=>syTrack(x,y,a,b,night);track(0,302,710,302);track(245,302,355,195);track(355,195,900,195);track(490,302,600,195);track(710,302,820,195);track(710,302,820,410);track(820,410,900,410);
    [245,490,710].forEach((x,i)=>{circle(x,302,19,'#d2cfaa');line(x-10,302,x+12,state.switches[i]===0?292:312,'#293c32',5);btn(String(i+1)+' '+(state.switches[i]===0?'UP':'DOWN'),x-51,350,102,37,()=>this.action(String(i)),'#3e5644')});
    syStations.forEach(s=>{rr(846,s.y-62,96,44,4,'#e8dcc4','#5a4a3a');ctx.fillStyle=shade(s.c,-.25);ctx.beginPath();ctx.moveTo(838,s.y-60);ctx.lineTo(894,s.y-84);ctx.lineTo(950,s.y-60);ctx.fill();rr(852,s.y-52,84,18,4,s.c);text(s.name,894,s.y-43,11,'#1b302c','center',900);rr(872,s.y-32,12,14,2,night?'#ffd27a':'#6a8aa0');rr(904,s.y-32,12,14,2,night?'#ffd27a':'#6a8aa0');rr(894,s.y-11,54,20,3,'#bdb69b')});
    state.trains.forEach(t=>syTrain(t,syStations[t.target].c,night));
    text('MAIN LINE',52,269,12,'#8da996');state.trains.forEach(t=>{if(t.waiting)circle(t.x+30,t.y-24,6,'#ff5a4a')});[600,820].forEach(mx=>circle(mx-60,180,5,state.trains.some(t=>t.waiting&&Math.abs(t.x-(mx-70))<4)?'#ff5a4a':'#5fe08a'));text('Upper exit → ORCHARD     Lower exit → next junction',480,480,15,'#b4c3b3','center');text(state.shift===0?'At junction 3, the lower exit leads to HARBOR.':'» express = 2 points   •   long freight = 3 points',480,512,14,'#8da996','center');
    if(state.over){const win=state.lives>0;done(win?(S.name[0]+S.name.slice(1).toLowerCase()+' shift complete'):'Shift interrupted',state.points+' points from '+state.delivered+' trains. '+(win?(state.shift<2?'The next shift is unlocked.':state.shift===2?'Endless mode is unlocked.':''):'Plan your switches one train ahead.'))}}
};
