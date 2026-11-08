// 3. Potion Protocol: Mastermind with positional and unordered feedback. Three ranks: Apprentice (3 slots, 6
// ingredients), Alchemist (4 slots, 8 ingredients) and Archmage (4 slots, ingredients may repeat). The recipe book
// remembers how many recipes you've cracked at each rank and your fewest tests.
const ingredients=[{name:'Mooncap',c:'#c2a1fa'},{name:'Sunleaf',c:'#ecbc62'},{name:'Dewdrop',c:'#8ad8e7'},{name:'Ember',c:'#ed8b7b'},{name:'Fern',c:'#9acb99'},{name:'Pearl',c:'#eee0c1'},{name:'Thornroot',c:'#c98a5a'},{name:'Frostmint',c:'#7fe0c0'}];
const RANKS=[{name:'Apprentice',slots:3,kinds:6,tests:8,repeat:false},{name:'Alchemist',slots:4,kinds:8,tests:10,repeat:false},{name:'Archmage',slots:4,kinds:8,tests:10,repeat:true}];
const potSave=loadSave({rank:0,book:[{n:0,best:0},{n:0,best:0},{n:0,best:0}]});
function potionNew(daily=false,rank=potSave.rank){const R=RANKS[rank],random=daily?rng(dailySeed()*7+rank):Math.random,pool=[...Array(R.kinds).keys()],secret=[];
  while(secret.length<R.slots){if(R.repeat)secret.push(Math.floor(random()*R.kinds));else secret.push(pool.splice(Math.floor(random()*pool.length),1)[0])}
  return {rank,secret,guess:[],history:[],over:false,won:false,daily,msg:R.repeat?'Archmage: an ingredient may appear more than once.':'Select '+R.slots+' different ingredients in order.'}}
// solid dots: right ingredient, right slot; hollow: right ingredient, wrong slot (repeats counted properly)
function potionScore(g,s){let exact=0;const cg={},cs={};g.forEach((v,i)=>{if(v===s[i])exact++;else{cg[v]=(cg[v]||0)+1;cs[s[i]]=(cs[s[i]]||0)+1}});let near=0;for(const k in cg)near+=Math.min(cg[k],cs[k]||0);return {exact,near}}
GAMES['potion-protocol']={
  init(){return potionNew()},
  ui(){const R=RANKS[state.rank];controls(action('Test recipe','test',true)+action('Remove last','back')+action('Rank: '+R.name,'rank')+action('Daily recipe','daily')+action('New recipe','practice'));status(state.msg);metric(state.history.length+' / '+R.tests+' tests')},
  action(a){const R=RANKS[state.rank];
    if(a==='rank'){potSave.rank=(state.rank+1)%3;storeSave(potSave);state=potionNew(state.daily,potSave.rank);this.ui();return}
    if(a==='daily'||a==='practice'){state=potionNew(a==='daily',state.rank);this.ui();return}
    if(state.over)return;if(a==='back')state.guess.pop();
    if(a.startsWith('pick')){let i=Number(a.slice(4));if(i<R.kinds&&state.guess.length<R.slots&&(R.repeat||!state.guess.includes(i))){state.guess.push(i);beep(370+i*40)}}
    if(a==='test'){if(state.guess.length!==R.slots){state.msg='Choose exactly '+R.slots+(R.repeat?'':' different')+' ingredients.';this.ui();return}
      const {exact,near}=potionScore(state.guess,state.secret);state.history.push({guess:state.guess.slice(),exact,near});state.guess=[];state.won=exact===R.slots;state.over=state.won||state.history.length>=R.tests;
      state.msg=state.won?'Recipe verified! A very good day for science.':state.over?'Recipe revealed. Start a new experiment.':exact+' in the right slot; '+near+' right ingredient in another slot.';
      if(state.won){const b=potSave.book[state.rank];b.n++;b.best=b.best?Math.min(b.best,state.history.length):state.history.length;storeSave(potSave);saveBest(potSave.book.reduce((a,x)=>a+x.n,0))}beep(state.won?900:430)}
    this.ui()},
  key(k){const n=Number(k);if(n>=1&&n<=8)this.action('pick'+(n-1));if(k==='enter')this.action('test');if(k==='backspace')this.action('back')},
  draw(){const R=RANKS[state.rank];board('#292438');heading('NO. 03 / APOTHECARY LAB / '+R.name.toUpperCase(),state.daily?'DAILY RECIPE / '+new Date().toISOString().slice(0,10):'PRACTICE EXPERIMENT','#c6a7ff');
    rr(40,91,520,467,16,'#1e1c2c','#4c435c');text('EXPERIMENT LOG',64,114,12,'#a79bb7');text('POSITION / ELSEWHERE',527,114,11,'#a79bb7','right');
    const rh=Math.min(49,Math.floor(420/R.tests)),sp=R.slots===3?70:56;
    for(let row=0;row<R.tests;row++){const y=148+row*rh;rr(58,y-rh/2+4,482,rh-8,7,row%2?'#2d293d':'#262235');text(String(row+1).padStart(2,'0'),78,y,13,'#7f748d');
      for(let n=0;n<R.slots;n++){let item=state.history[row]?.guess[n];circle(135+n*sp,y,Math.min(14,rh/2-6),item===undefined?'#40394e':ingredients[item].c);if(item!==undefined)text(String(item+1),135+n*sp,y,11,'#2a2435','center')}
      const h=state.history[row];if(h){for(let n=0;n<h.exact;n++)circle(372+n*14,y,4,'#e8d7ff');for(let n=0;n<h.near;n++)circle(450+n*14,y,4,null,'#e8d7ff')}}
    text('SELECT INGREDIENTS',602,108,13,'#b8a5d1');
    const cols=R.kinds>6?4:3,cw=cols===4?70:90,cx=cols===4?78:104;
    ingredients.slice(0,R.kinds).forEach((i,n)=>{let x=602+n%cols*cx,y=126+Math.floor(n/cols)*104,used=state.guess.includes(n);rr(x,y,cw,94,11,used?'#514264':'#342c44',used?i.c:null);rr(x+cw/2-17,y+17,34,44,10,i.c);rr(x+cw/2-8,y+9,16,13,3,'#b1a28e');circle(x+cw/2-5,y+33,5,'#ffffff66');text(i.name,x+cw/2,y+78,cols===4?10:11,'#e4d8ed','center');text(n+1,x+10,y+12,10,'#9a8aae','center');buttons.push({x,y,w:cw,h:94,fn:()=>this.action('pick'+n)})});
    text('YOUR NEXT RECIPE',602,357,13,'#b8a5d1');const gs=R.slots===3?101:76;
    for(let n=0;n<R.slots;n++){const x=639+n*gs;circle(x,404,R.slots===3?29:25,state.guess[n]===undefined?'#40354f':ingredients[state.guess[n]].c);text(state.guess[n]===undefined?'?':n+1,x,404,18,'#c5b8d5','center')}
    btn('TEST RECIPE',601,450,299,43,()=>this.action('test'),'#70558e');
    const b=potSave.book;text('RECIPE BOOK  •  '+RANKS.map((r,i)=>r.name.slice(0,4)+' '+b[i].n).join('  •  '),602,522,11,'#a79bb7');text(b[state.rank].best?'Fewest tests at this rank: '+b[state.rank].best:'Crack one to start this page of the book.',602,542,11,'#8d82a0');
    if(state.over){rr(190,195,580,205,18,'#20192ff5','#a486cd');text(state.won?'EUREKA!':'RECIPE REVEALED',480,238,30,'#d4bbf4','center',850);text(state.secret.map(x=>ingredients[x].name).join('  →  '),480,290,17,'#eee0fc','center');btn('New experiment',360,335,240,40,()=>{state=potionNew(false,state.rank);this.ui()},'#70558e')}}
};
