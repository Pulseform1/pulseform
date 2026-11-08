// 2. Switchyard: trains move along an explicit branch graph. Three shifts (and an endless one) add express trains
// (fast, worth 2) and long freight trains (slow, worth 3). Trains queue behind each other, and signals hold a train
// short of a merge while the upper line is busy, so the challenge is routing every train to its own station.
const syStations=[{name:'ORCHARD',c:'#e8bc70',y:195},{name:'HARBOR',c:'#78c8da',y:410}];
const SY_SHIFTS=[
  {name:'MORNING',sub:'Two colors. Learn the junctions.',time:150,spawn:[5,2.6],speed:50,express:0,freight:0,bg:'#1f302b'},
  {name:'AFTERNOON',sub:'Express trains: fast, worth 2.',time:180,spawn:[4.6,2.3],speed:54,express:.28,freight:0,bg:'#2b2a22'},
  {name:'NIGHT',sub:'Freight trains: long, slow, worth 3.',time:210,spawn:[4.3,2.1],speed:57,express:.25,freight:.22,bg:'#141b24'},
  {name:'ENDLESS',sub:'Three lives. How long can you last?',time:Infinity,spawn:[4.2,1.7],speed:56,express:.25,freight:.2,bg:'#221a2b'}];
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
    for(let x=60;x<900;x+=120){circle(x,112,12,night?'#1d2633':'#344638');circle(x+32,530,19,night?'#1d2633':'#344638')}
    const track=(x,y,a,b)=>{line(x,y,a,b,'#111e1a',15);line(x,y,a,b,night?'#5d6a7a':'#7c8d7d',4)};track(0,302,710,302);track(245,302,355,195);track(355,195,900,195);track(490,302,600,195);track(710,302,820,195);track(710,302,820,410);track(820,410,900,410);
    [245,490,710].forEach((x,i)=>{circle(x,302,19,'#d2cfaa');line(x-10,302,x+12,state.switches[i]===0?292:312,'#293c32',5);btn(String(i+1)+' '+(state.switches[i]===0?'UP':'DOWN'),x-51,350,102,37,()=>this.action(String(i)),'#3e5644')});
    syStations.forEach(s=>{rr(841,s.y-48,104,35,6,s.c);text(s.name,893,s.y-31,11,'#1b302c','center',850);rr(894,s.y-9,54,18,3,'#bdb69b')});
    state.trains.forEach(t=>{const c=syStations[t.target].c;if(night){const g=ctx.createRadialGradient(t.x+34,t.y,2,t.x+34,t.y,70);g.addColorStop(0,'rgba(255,240,180,.35)');g.addColorStop(1,'rgba(255,240,180,0)');ctx.fillStyle=g;ctx.fillRect(t.x,t.y-70,110,140)}
      if(t.kind==='freight'){rr(t.x-74,t.y-13,44,26,4,'#6f6a5e','#c9c1a8');line(t.x-30,t.y,t.x-24,t.y,'#222',3)}
      rr(t.x-27,t.y-15,55,30,6,c,t.kind==='express'?'#ffffff':'#f3e7cb');if(t.kind==='express'){line(t.x-24,t.y+6,t.x+24,t.y+6,'#ffffff',3);text('»',t.x-30,t.y-1,16,'#ffffff','center',900)}
      rr(t.x+10,t.y-10,10,11,2,'#263f44');circle(t.x-14,t.y+16,4,'#111');circle(t.x+15,t.y+16,4,'#111');text(t.id,t.x-9,t.y,11,'#263b37','center')});
    text('MAIN LINE',52,269,12,'#8da996');state.trains.forEach(t=>{if(t.waiting)circle(t.x+30,t.y-24,6,'#ff5a4a')});[600,820].forEach(mx=>circle(mx-60,180,5,state.trains.some(t=>t.waiting&&Math.abs(t.x-(mx-70))<4)?'#ff5a4a':'#5fe08a'));text('Upper exit → ORCHARD     Lower exit → next junction',480,480,15,'#b4c3b3','center');text(state.shift===0?'At junction 3, the lower exit leads to HARBOR.':'» express = 2 points   •   long freight = 3 points',480,512,14,'#8da996','center');
    if(state.over){const win=state.lives>0;done(win?(S.name[0]+S.name.slice(1).toLowerCase()+' shift complete'):'Shift interrupted',state.points+' points from '+state.delivered+' trains. '+(win?(state.shift<2?'The next shift is unlocked.':state.shift===2?'Endless mode is unlocked.':''):'Plan your switches one train ahead.'))}}
};
