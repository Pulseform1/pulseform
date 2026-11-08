// 4. Safecracker: clue-driven dial manipulation with a proximity signal. Ten handmade vaults (from vault 6 the
// signal only wakes up when you're close), then endless vaults with freshly made clues.
const vaultClues=[{clue:'One quarter of a full turn.',n:25},{clue:'The number of hours in two days.',n:48},{clue:'Seven squared.',n:49},{clue:'Half a dozen, multiplied by ten.',n:60},{clue:'The smallest two-digit prime.',n:11},{clue:'A perfect square between 60 and 70.',n:64},{clue:'Three quarters of a full turn.',n:75},{clue:'The number of sides on eight triangles.',n:24},{clue:'Double the number of cards in one suit.',n:26},{clue:'The only even prime, times forty.',n:80},{clue:'A dozen dozens, less one hundred.',n:44},{clue:'Nine squared, minus one.',n:80},{clue:'A century, less seventeen.',n:83},{clue:'The number of minutes in half an hour.',n:30},{clue:'Five cubed, minus fifty.',n:75},
{clue:'The degrees in a right angle, minus one.',n:89},{clue:'Three score and seven (a score is twenty).',n:67},{clue:'The days in four weeks, plus the days in one more.',n:35},
{clue:'Eleven times six.',n:66},{clue:'The largest two-digit number that both 4 and 6 divide.',n:96},{clue:'The sum of the first two primes above fifteen.',n:36},
{clue:'The minutes in an hour and a half, minus thirty-three.',n:57},{clue:'Half the seconds in a minute and a half.',n:45},{clue:'A gross (twelve dozen) divided by six.',n:24},
{clue:'Nine squared plus three squared.',n:90},{clue:'The legs on a dozen spiders, minus a dozen.',n:84},{clue:'The smallest two-digit cube, plus one.',n:28},
{clue:'Seven times seven, plus seven.',n:56},{clue:'The hours in a week, less one hundred.',n:68},{clue:'The largest prime below one hundred.',n:97}];
const VAULTS=vaultClues.length/3;
const WORDS=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
const say=n=>n<=20?WORDS[n]:String(n);
// endless clues: small arithmetic riddles whose answer is always 0 to 99
function makeClue(r){const I=(a,b)=>a+Math.floor(r()*(b-a+1));for(;;){const k=I(0,6);let c,n;
  if(k===0){const a=I(3,12),b=I(3,9);n=a*b;c=say(a)[0].toUpperCase()+say(a).slice(1)+' times '+say(b)+'.'}
  if(k===1){const a=I(4,9),b=I(1,20);n=a*a+b;c=say(a)[0].toUpperCase()+say(a).slice(1)+' squared, plus '+say(b)+'.'}
  if(k===2){const w=I(2,13),d=I(0,6);n=w*7+d;c='The days in '+say(w)+' weeks'+(d?', plus '+say(d):'')+'.'}
  if(k===3){const h=I(1,11);n=h*5;c='The minutes it takes the minute hand to travel from 12 to the '+say(h)+'.'}
  if(k===4){const a=I(30,99),b=I(5,40);n=a-b;c='A dozen less than '+(n+12)+'.'}
  if(k===5){const d=I(2,8);n=d*12;c=say(d)[0].toUpperCase()+say(d).slice(1)+' dozen.'}
  if(k===6){const a=I(11,60),b=I(11,39);n=a+b;c='The sum of '+a+' and '+b+'.'}
  if(n>=0&&n<=99)return {clue:c,n}}}
const safeSave=loadSave({vault:0,endless:0});
GAMES.safecracker={
  init(){return {mode:'story',vault:Math.min(safeSave.vault,VAULTS-1),step:0,dial:0,mistakes:0,score:0,over:false,won:false,clues:null,msg:'Find the number in the clue, then set the tumbler.'}},
  ui(){const fin=state.mode==='story'&&state.won&&state.vault===VAULTS-1;controls(action('−10','-10')+action('−1','-1')+action('Set tumbler','set',true)+action('+1','1')+action('+10','10')+(fin?action('Endless vaults →','endless',true):action('Next vault','next')));status(state.msg);metric(state.score+' points')},
  target(){return state.mode==='endless'?state.clues[state.step]:vaultClues[state.vault*3+state.step]},
  newEndless(){const r=rng(Date.now()%100000+state.vault*77);state.clues=[makeClue(r),makeClue(r),makeClue(r)]},
  action(a){
    if(a==='endless'){Object.assign(state,{mode:'endless',vault:0,step:0,mistakes:0,won:false,over:false,dial:0,msg:'Endless vaults: three mistakes ends the run.'});this.newEndless();this.ui();return}
    if(a==='next'){if(state.won&&(state.mode==='endless'||state.vault<VAULTS-1)){state.vault++;state.step=0;state.won=false;state.msg='New vault, new combination.';if(state.mode==='endless')this.newEndless();else state.mistakes=0}this.ui();return}
    if(state.over||state.won)return;
    if(a==='set'){if(state.dial===this.target().n){state.step++;state.score+=100;beep(700);state.msg='Tumbler engaged. Read the next clue.';
        if(state.step===3){state.won=true;state.score+=100*(3-state.mistakes);
          if(state.mode==='story'){safeSave.vault=Math.max(safeSave.vault,Math.min(VAULTS-1,state.vault+1));state.msg=state.vault===VAULTS-1?'All ten vaults opened. Master locksmith! Try the endless vaults.':'Vault open. Tap Next vault to continue.'}
          else{safeSave.endless=Math.max(safeSave.endless,state.vault+1);state.msg='Vault '+(state.vault+1)+' open. Next vault keeps the run going.'}
          storeSave(safeSave);saveBest(state.score)}}
      else{state.mistakes++;state.msg='Wrong number. Check the clue and the signal.';beep(110,.17);if(state.mistakes>=3){state.over=true;state.msg=state.mode==='endless'?'Run over after '+state.vault+' endless vaults.':'Vault locked. Restart to try again.';saveBest(state.score)}}}
    else{state.dial=(state.dial+Number(a)+100)%100;let gap=this.gap();beep(gap===0?1000:250+Math.max(0,10-gap)*50,.025)}
    this.ui()},
  gap(){const d=Math.abs(state.dial-this.target().n);return Math.min(d,100-d)},
  hard(){return state.mode==='endless'||state.vault>=5},
  key(k){if(k==='arrowleft')this.action('-1');if(k==='arrowright')this.action('1');if(k==='arrowdown')this.action('-10');if(k==='arrowup')this.action('10');if(k===' '||k==='enter')this.action('set')},
  pointer(type,p){const r=Math.hypot(p.x-305,p.y-325);if((type==='down'||pointer.down)&&!state.won&&!state.over&&r<205&&r>(type==='down'?105:40)){const angle=Math.atan2(p.x-305,-(p.y-325));let value=Math.round((angle/(Math.PI*2)*100+100)%100);if(value!==state.dial)this.action(String(((value-state.dial+150)%100)-50))}},
  draw(){board(state.mode==='endless'?'#271f30':'#202930');
    heading(state.mode==='endless'?'ENDLESS VAULTS / VAULT '+(state.vault+1)+'  •  BEST '+safeSave.endless:'LOCKSMITH’S NOTEBOOK / VAULT '+(state.vault+1)+' OF '+VAULTS,'3 TUMBLERS • '+(3-state.mistakes)+' ATTEMPTS LEFT','#edcb78');
    rr(53,99,502,453,24,'#38434b','#5b6870');for(const x of [78,530])for(const y of [125,527]){circle(x,y,7,'#8c9695');line(x-3,y-3,x+3,y+3,'#344148',2)}
    circle(305,325,187,'#182026','#8c938b');circle(305,325,155,'#414b4d','#adb09a');
    for(let i=0;i<100;i++){const a=i/100*Math.PI*2;line(305+Math.sin(a)*167,325-Math.cos(a)*167,305+Math.sin(a)*(i%5?172:179),325-Math.cos(a)*(i%5?172:179),'#b8bea9',i%5?1:2);if(i%10===0)text(i,305+Math.sin(a)*143,325-Math.cos(a)*143,14,'#d7d7bf','center')}
    ctx.save();ctx.translate(305,325);ctx.rotate(state.dial/100*Math.PI*2);circle(0,0,102,'#66716b','#9da58e');line(0,-82,0,-50,'#eccc7d',8);line(-55,33,55,33,'#333f3f',20);ctx.restore();
    text(String(state.dial).padStart(2,'0'),305,325,46,'#eee1b2','center',850);text('▲',305,121,21,'#edcb78','center');
    text('TUMBLER '+Math.min(3,state.step+1),603,128,13,'#d7c28d');for(let n=0;n<3;n++){rr(605+n*89,158,72,57,10,n<state.step?'#859869':'#35424a');text(n<state.step?'✓':'—',641+n*89,187,24,'#e4dfc4','center')}
    text('THE CLUE',605,259,12,'#a5afa9');wrap(state.won?'Every tumbler has clicked into place.':this.target().clue,605,299,277,22,'#ede3c9',32);
    text(this.hard()?'PROXIMITY SIGNAL  •  WEAK: ONLY WAKES UP CLOSE':'PROXIMITY SIGNAL',605,412,12,this.hard()?'#e3a88c':'#a5afa9');
    let gap=state.won?0:this.gap(),lit=this.hard()?(gap<=5?12-gap*2:0):12-gap;for(let n=0;n<12;n++)rr(606+n*23,456-n*2,16,17+n*2,3,n<lit?'#d8bd70':'#39464a');
    text('Arrows ←/→ by 1, ↑/↓ by 10 • Enter sets',605,510,12,'#9ca99f');
    if(state.won||state.over){rr(124,240,358,169,15,'#1c2725f5','#a9b885');text(state.won?'VAULT OPEN':state.mode==='endless'?'RUN OVER':'VAULT LOCKED',303,285,28,state.won?'#d4e7a4':'#efa28c','center',850);
      text(state.won?(state.mode==='story'&&state.vault===VAULTS-1?'All ten vaults complete!':'Use Next vault to continue.'):state.mode==='endless'?state.vault+' vaults cracked. Best: '+safeSave.endless:'Three wrong entries. Try again.',303,330,15,'#dde0cc','center');
      if(state.over)btn('Start again',212,358,182,36,()=>reset());else if(state.mode==='story'&&state.vault===VAULTS-1)btn('Endless vaults →',202,358,202,36,()=>this.action('endless'))}}
};
