/* ODD CROWD on Pulsebox: online rooms without a game server.
   The original game ran its room service in Node (server.mjs). Here the host's browser runs that same service
   on top of the Pulsebox Rooms relay (/api/room/CODE, a Durable Object that forwards JSON between the people in a room):
   - the host creates the game, keeps each member's seat token, applies every join, resume and action with the shared
     rules engine (game.mjs), and sends each person only their own view (viewFor), addressed { to: peer }.
   - players broadcast their join or resume once; the host answers them directly, and after that they talk only to the host.
   - if the host's tab drops and comes back (REJOIN YOUR ROOM), it announces itself and every player re-sends their seat token.
   House guests are small bots the host can add in the lobby so two people (or one) can still play. */
const WSHOST=/^https?:/.test(location.protocol)&&!/^(localhost|127\.)/.test(location.hostname)?location.host:'box.pulseform.org';
const API_ORIGIN=/^https?:/.test(location.protocol)&&!/^(localhost|127\.)/.test(location.hostname)?'':'https://box.pulseform.org';
const CODE_LETTERS='ABCDEFGHJKLMNPQRSTUVWXYZ';
let srv=null,hostPeer=null,clockOffset=0,presetCode='',joinTimer=null;
const randomBytes=n=>{const a=new Uint8Array(n);crypto.getRandomValues(a);return a};
const newId=()=>Array.from(randomBytes(12),b=>b.toString(16).padStart(2,'0')).join('');
const newToken=()=>btoa(String.fromCharCode(...randomBytes(24))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const newCode=()=>Array.from(randomBytes(4),n=>CODE_LETTERS[n%CODE_LETTERS.length]).join('');
const cleanCode=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4);
const savedName=()=>{try{return localStorage.getItem('pbx-mp-name')||''}catch{return ''}};
function saveName(n){const short=n.replace(/[^\w .'-]/g,'').trim().slice(0,12);if(short)try{localStorage.setItem('pbx-mp-name',short)}catch{}}
async function roomInfo(code){try{return await(await fetch(API_ORIGIN+'/api/room/'+code,{cache:'no-store'})).json()}catch{return null}}
function relaySend(m){if(ws?.readyState===1&&ws.bufferedAmount<512000)ws.send(JSON.stringify(m))}
function online(){return srv?true:ws?.readyState===1&&!!hostPeer}

/* ---------- one relay connection, shared by hosts and players ---------- */
function connectRelay(code,errorId,onHello){
 const generation=connectionGeneration;let socket;
 try{socket=new WebSocket(`wss://${WSHOST}/api/room/${code}?n=oc&g=odd-crowd`)}catch(e){$(errorId).textContent='Couldn’t reach the rooms server. Try again, or choose Pass & play.';return}
 ws=socket;$('connectionStatus').textContent=reconnectAttempt?'RECONNECTING…':'CONNECTING…';
 const timeout=setTimeout(()=>{if(socket===ws&&socket.readyState!==1){$(errorId).textContent='Couldn’t reach the rooms server. Try again, or choose Pass & play.';socket.close()}},10000);
 socket.onmessage=e=>{if(generation!==connectionGeneration||socket!==ws)return;let m;try{m=JSON.parse(e.data)}catch{return}if(!m||typeof m!=='object')return;
  if(m.t==='hello'){clearTimeout(timeout);reconnectAttempt=0;$('connectionStatus').textContent='CONNECTED';onHello(m);return}
  if(m.t==='full'){$(errorId).textContent='That room is full.';return}
  if(srv)hostMessage(m);else playerMessage(m,errorId);
 };
 socket.onclose=()=>{clearTimeout(timeout);if(generation!==connectionGeneration||socket!==ws)return;ws=null;pending=false;$('connectionStatus').textContent='CONNECTION LOST';
  if((srv||identity?.token)&&reconnectAttempt<8){reconnectAttempt++;reconnectTimer=setTimeout(()=>{if(generation===connectionGeneration)reconnect(errorId)},500+reconnectAttempt*900)}
  else if(state)roomNotice('Connection lost. Use REJOIN YOUR ROOM from the title screen when you’re online again.');
  if(state)renderRoom();
 };
}
function reconnect(errorId){
 if(srv)connectRelay(srv.code,errorId,()=>relaySend({t:'oc-host'}));
 else if(identity?.token)connectRelay(identity.code,errorId,()=>relaySend({t:'oc',msg:{type:'resume',code:identity.code,token:identity.token}}));
}

/* ---------- player side ---------- */
function joinRoom(message,errorId){
 clearOnline();mode='online';hostPeer=null;$(errorId).textContent='';
 const code=cleanCode(message.code);if(code.length!==4){$(errorId).textContent='Enter the four-letter room code.';mode=null;return}
 connectRelay(code,errorId,hello=>{
  if(hello.players.length<2){fail('Room '+code+' isn’t open. Check the code on the host’s screen.');return}
  relaySend({t:'oc',msg:message});
  clearTimeout(joinTimer);joinTimer=setTimeout(()=>{if(!identity)fail('Room '+code+' didn’t answer. Check the code, or ask your host to reopen the room.')},6000);
 });
 function fail(text){clearTimeout(joinTimer);if(message.type==='resume')forgetRoom();clearOnline();mode=null;identity=null;state=null;stageKey='';$(errorId).textContent=text;showScreen('joinScreen')}
}
function playerMessage(m,errorId){
 if(m.t==='oc-host'){if(identity?.token){hostPeer=m.from;relaySend({t:'oc',to:m.from,msg:{type:'resume',code:identity.code,token:identity.token}})}return}
 if(m.t==='oc-closed'&&m.from===hostPeer){forgetRoom();hostPeer=null;roomNotice('The host closed this room. Thanks for playing!');$('connectionStatus').textContent='ROOM CLOSED';return}
 if(m.t==='leave'&&m.id===hostPeer){$('connectionStatus').textContent='HOST RECONNECTING…';roomNotice('The host dropped out. Hang tight: the game carries on if they come back.');return}
 if(m.t!=='oc'||!m.msg||typeof m.msg!=='object')return;const d=m.msg;
 if(d.type==='welcome'){if(hostPeer&&m.from!==hostPeer&&identity)return;hostPeer=m.from;clearTimeout(joinTimer)}
 else if(m.from!==hostPeer)return;
 deliver(d,errorId);
}
// What the room service tells this screen (from the relay, or straight from this tab when it is the host)
function deliver(d,errorId='joinError'){
 if(d.type==='welcome'){identity={id:d.id,token:d.token,code:d.code,role:d.role};rememberRoom();$('connectionStatus').textContent='CONNECTED';return}
 if(d.type==='state'&&d.state&&typeof d.state==='object'){if(Number.isFinite(d.now))clockOffset=d.now-Date.now();state=d.state;rememberRoom();pending=false;renderOnline();return}
 if(d.type==='error'){pending=false;const text=String(d.message||'Something went wrong.').slice(0,200);if(!identity){clearTimeout(joinTimer);clearOnline();mode=null;state=null;stageKey='';$(errorId).textContent=text;showScreen(errorId==='hostError'?'hostScreen':'joinScreen');return}roomNotice(text);const submit=$('answerSubmit');if(submit)submit.disabled=false;renderOnline()}
}

/* ---------- host side: the room service ---------- */
async function hostRoom(){
 const errorId='hostError',name=$('hostName').value.trim();$(errorId).textContent='';
 if(name&&[...name].length>20){$(errorId).textContent='Choose a name between 1 and 20 characters.';return}
 const submit=$('hostForm').querySelector('button[type=submit]');submit.disabled=true;$(errorId).textContent='Finding you a room…';
 let code=presetCode;presetCode='';
 if(code){const info=await roomInfo(code);if(info&&info.players)code=''}
 for(let tries=0;!code&&tries<6;tries++){const c=newCode(),info=await roomInfo(c);if(!info){submit.disabled=false;$(errorId).textContent='Couldn’t reach the rooms server. Check your connection, or choose Pass & play.';return}if(!info.players)code=c}
 submit.disabled=false;if(!code){$(errorId).textContent='Every table is busy. Try again in a moment.';return}
 clearOnline();mode='online';const now=Date.now(),hostId=newId(),token=newToken();
 const game=createGame({code,hostId,seed:new Uint32Array(randomBytes(4).buffer)[0],now,writeSeconds:Number($('writeSeconds').value),voteSeconds:Number($('voteSeconds').value)});
 if(name){const r=addPlayer(game,{id:hostId,name},now);if(!r.ok){$(errorId).textContent=r.error;mode=null;return}saveName(name)}
 srv={code,game,members:new Map([[hostId,{id:hostId,token,role:'host',peer:'self'}]]),sent:-1,bots:{},lines:[],rate:new Map(),loop:null};
 $(errorId).textContent='';startService();
 deliver({type:'welcome',id:hostId,token,code,role:'host'});broadcast();
 connectRelay(code,errorId,()=>relaySend({t:'oc-host'}));
}
function resumeHost(saved){
 let data;try{data=JSON.parse(sessionStorage.getItem('odd-crowd-host')||'null')}catch{}
 if(!data||data.code!==saved.code||!data.game){forgetRoom();return false}
 clearOnline();mode='online';const now=Date.now();
 srv={code:data.code,game:data.game,members:new Map(),sent:-1,bots:{},lines:data.lines||[],rate:new Map(),loop:null};
 for(const m of data.members||[])srv.members.set(m.id,{id:m.id,token:m.token,role:m.role,peer:m.role==='host'?'self':null,gone:now+6000});
 startService();deliver({type:'welcome',id:saved.id,token:saved.token,code:saved.code,role:'host'});broadcast();
 connectRelay(srv.code,'joinError',()=>relaySend({t:'oc-host'}));return true;
}
function startService(){clearInterval(srv.loop);srv.loop=setInterval(serviceTick,200)}
function stopService(sayGoodbye){if(!srv)return;clearInterval(srv.loop);if(sayGoodbye)relaySend({t:'oc-closed'});try{sessionStorage.removeItem('odd-crowd-host')}catch{}srv=null}
function sendTo(peer,data){if(peer==='self')deliver(data,'hostError');else if(peer)relaySend({t:'oc',to:peer,msg:data})}
function broadcast(){if(!srv)return;const g=srv.game,now=Date.now();for(const m of srv.members.values())if(m.peer)sendTo(m.peer,{type:'state',state:viewFor(g,m.id),now});srv.sent=g.revision;saveHost()}
function saveHost(){try{sessionStorage.setItem('odd-crowd-host',JSON.stringify({code:srv.code,game:srv.game,lines:srv.lines,members:[...srv.members.values()].map(m=>({id:m.id,token:m.token,role:m.role}))}))}catch{}}
function memberByPeer(peer){for(const m of srv.members.values())if(m.peer===peer)return m;return null}
function serviceTick(){
 if(!srv)return;const g=srv.game,now=Date.now();
 // a player whose connection dropped keeps their seat for a few seconds before the house writes for them
 for(const m of srv.members.values())if(!m.peer&&m.gone&&now>=m.gone){m.gone=0;if(g.players[m.id]?.connected)setConnected(g,m.id,false,now)}
 botTick(now);advance(g,now);if(srv.sent!==g.revision)broadcast();
}
function hostMessage(m){
 if(m.t==='leave'){const member=memberByPeer(m.id);if(member){member.peer=null;member.gone=Date.now()+6000}return}
 if(m.t!=='oc'||!m.msg||typeof m.msg!=='object'||Array.isArray(m.msg)||!m.from)return;
 handleRequest(m.from,m.msg);
}
function handleRequest(peer,message){
 const g=srv.game,at=Date.now(),error=text=>sendTo(peer,{type:'error',message:text});
 let rate=srv.rate.get(peer);if(!rate||at-rate.window>10000)srv.rate.set(peer,rate={window:at,count:0});if(++rate.count>100)return error('Too many requests. Please slow down.');
 if(message.type==='action'){
  const member=memberByPeer(peer);if(!member)return error('Join a room first.');
  if(!message.action||typeof message.action!=='object'||Array.isArray(message.action))return error('Invalid game action.');
  const before=g.revision;advance(g,at);const result=dispatch(g,member.id,message.action,at);
  if(!result?.ok)error(result?.error||'That action is unavailable.');
  if(message.action.type==='restart'&&result?.ok){srv.bots={};srv.lines=[]}
  if(g.revision!==before||!result?.ok)broadcast();return;
 }
 if(message.type!=='join'&&message.type!=='resume')return;
 if(cleanCode(message.code)!==srv.code)return;   // meant for some other room service; stay quiet
 if(message.type==='resume'||message.token){
  const token=typeof message.token==='string'&&message.token.length<100?message.token:'';
  const seat=token?[...srv.members.values()].find(m=>m.role!=='host'&&m.token===token):null;
  if(!seat)return error('This saved seat has expired. Join again from the lobby.');
  const old=seat.peer;seat.peer=peer;seat.gone=0;
  if(old&&old!==peer&&old!=='self')relaySend({t:'oc',to:old,msg:{type:'error',message:'Your seat opened in another tab.'}});
  setConnected(g,seat.id,true,at);
  sendTo(peer,{type:'welcome',id:seat.id,token:seat.token,code:srv.code,role:seat.role});broadcast();return;
 }
 if(memberByPeer(peer))return error('You are already in this room.');
 if(g.phase!=='lobby')return error('This game is already in progress. Wait for the next one, or reconnect from your original tab.');
 const name=typeof message.name==='string'?message.name.replace(/[\u0000-\u001f\u007f]/g,'').trim().replace(/\s+/g,' '):'';
 if(!name||[...name].length>20)return error('Choose a name between 1 and 20 characters.');
 if(Object.values(g.players).some(p=>p.name.toLocaleLowerCase()===name.toLocaleLowerCase()))return error('That name is taken at this table. Try another.');
 const id=newId(),token=newToken(),result=addPlayer(g,{id,name},at);
 if(!result?.ok)return error(result?.error||'This room cannot accept more players.');
 srv.members.set(id,{id,token,role:'player',peer});
 sendTo(peer,{type:'welcome',id,token,code:srv.code,role:'player'});broadcast();
}

/* ---------- house guests ---------- */
const GUEST_NAMES=['Gary From Accounts','A Haunted Lamp','Professor Waffles','Big Linda','The Neighbor’s Cat','Mysterious Steve','Grandma Turbo','A Polite Ghost','Captain Noodle','Doug (Probably)','Sir Reginald','The Intern'];
const GUEST_LINES=['A raccoon with a clipboard and a dream.','Seventeen ducks and a strongly worded letter.','My uncle’s secret soup recipe.','Absolutely nothing, and that’s the scary part.','A trampoline made of lasagna.','Interpretive dance, but competitive.','The world’s most confident pigeon.','A suspiciously warm doorknob.','An apology written in glitter.','Three goats in a business suit.','A candle that smells like Tuesday.','The loudest whisper ever recorded.','Free samples of regret.','A haunted fanny pack.','Mild disappointment, gift-wrapped.','A sandwich with a five-year plan.','Bees. Just a lot of bees.','A motivational speech from a damp sock.','The emergency backup llama.','One extremely dramatic potato.','A spreadsheet that cries at night.','Tiny hats for very serious frogs.','The vibe of an empty bowling alley.','A sword, but it’s mostly a spoon.','Crocs with spurs.','A podcast hosted by two pigeons.','An unsupervised leaf blower.','Grandma’s forbidden casserole.','A wizard who only does taxes.','The forbidden snack drawer.','A haircut that knows too much.','A smoothie with a criminal record.','Soup. Always soup.','A golden retriever running for mayor.','Four raccoons in one big coat.','The sound a fridge makes at 3 a.m.','A treasure map to the nearest gas station.','Extremely loud jazz.','A cursed rubber duck.','A pamphlet titled “So You’ve Angered a Swan”.'];
function addGuest(){
 if(!srv||srv.game.phase!=='lobby')return;const g=srv.game;if(g.playerOrder.length>=10)return roomNotice('The room is full.');
 const taken=new Set(Object.values(g.players).map(p=>p.name.toLocaleLowerCase())),name=GUEST_NAMES.find(n=>!taken.has(n.toLocaleLowerCase()));if(!name)return;
 const result=addPlayer(g,{id:'bot-'+newId().slice(0,8),name},Date.now());if(!result.ok)return roomNotice(result.error);cue('start');broadcast();
}
function removeGuest(id){
 if(!srv||srv.game.phase!=='lobby'||!id.startsWith('bot-'))return;const g=srv.game;if(!g.players[id])return;
 delete g.players[id];g.playerOrder=g.playerOrder.filter(p=>p!==id);g.revision++;broadcast();
}
function guestLine(){const free=GUEST_LINES.filter(l=>!srv.lines.includes(l)),pick=(free.length?free:GUEST_LINES)[Math.floor(Math.random()*(free.length||GUEST_LINES.length))];srv.lines.push(pick);if(srv.lines.length>=GUEST_LINES.length)srv.lines=[];return pick}
function botTick(now){
 const g=srv.game;if(g.phase!=='writing'&&g.phase!=='voting')return;
 for(const id of g.playerOrder){if(!id.startsWith('bot-'))continue;const plan=srv.bots[id]||(srv.bots[id]={}),view=viewFor(g,id),left=Math.max(0,(g.deadline||now)-now);
  if(g.phase==='writing'){const task=view.assignments.find(a=>!a.answered);if(!task)continue;const key='w'+task.id;
   if(!plan[key])plan[key]=now+3000+Math.random()*Math.max(1000,Math.min(30000,left*.5));else if(now>=plan[key])dispatch(g,id,{type:'answer',promptId:task.id,text:guestLine()},now)}
  else if(view.ballot?.eligible&&!view.voted&&view.ballot.answers.length){const key='v'+view.ballot.promptId;
   if(!plan[key])plan[key]=now+2500+Math.random()*Math.max(500,Math.min(7000,left*.5));
   else if(now>=plan[key]){const pick=view.ballot.answers[Math.floor(Math.random()*view.ballot.answers.length)],me=view.players.find(p=>p.id===id);dispatch(g,id,{type:'vote',answerId:pick.id,bold:!!me?.boldAvailable&&Math.random()<.2},now)}}
 }
}

/* ---------- wire it into the screens ---------- */
$('hostForm').onsubmit=e=>{e.preventDefault();initAudio();hostRoom()};
$('joinForm').onsubmit=e=>{e.preventDefault();initAudio();const name=$('playerName').value.trim();saveName(name);joinRoom({type:'join',code:$('joinCode').value,name},'joinError')};
$('resumeRoom').onclick=()=>{const saved=storedRoom();if(!saved)return;initAudio();if(saved.role==='host'){if(!resumeHost(saved)){showScreen('hostScreen');$('hostError').textContent='That room has closed. Make a new one.'}return}showScreen('joinScreen');$('joinCode').value=saved.code;joinRoom({type:'resume',code:saved.code,token:saved.token},'joinError')};
$('joinCode').addEventListener('input',e=>{e.target.value=cleanCode(e.target.value)});
$('hostName').value=savedName();$('playerName').value=savedName();
// ?room=CODE from Pulsebox's Play with friends: an empty room means you're opening it, otherwise you're joining it
try{const query=new URLSearchParams(location.search),code=cleanCode(query.get('room')||query.get('code'));
 const saved=storedRoom();
 if(code.length===4&&saved?.code===code){$('resumeRoom').click()}   // a refresh inside the hub keeps ?room=: take your own seat back
 else if(code.length===4){$('joinCode').value=code;roomInfo(code).then(info=>{
  if(info&&!info.players){presetCode=code;$('hostCodeNote').textContent='ROOM '+code+' IS READY FOR YOU';$('hostCodeNote').hidden=false;showScreen('hostScreen')}
  else{showScreen('joinScreen');if($('playerName').value.trim())$('joinForm').requestSubmit();else $('playerName').focus()}
 })}}catch{}

/* ---------- a little celebration ---------- */
function confetti(count){
 if(!motionOn)return;let c=$('confetti');if(!c){c=document.createElement('canvas');c.id='confetti';document.body.append(c)}
 const ctx=c.getContext('2d'),dpr=Math.min(2,devicePixelRatio||1),W=innerWidth,H=innerHeight;c.width=W*dpr;c.height=H*dpr;c.style.width=W+'px';c.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
 const colors=['#caeb76','#bca7df','#edba83','#e9b3c4','#1b2723','#faf8ef'],bits=[];
 for(let i=0;i<count;i++){const left=i%2===0;bits.push({x:left?-10:W+10,y:H*(.35+Math.random()*.4),vx:(left?1:-1)*(4+Math.random()*9),vy:-(7+Math.random()*10),r:Math.random()*6.3,vr:(Math.random()-.5)*.4,w:6+Math.random()*7,h:4+Math.random()*5,c:colors[i%colors.length],shape:i%5})}
 let last=performance.now(),life=0;cancelAnimationFrame(confetti.raf);
 (function frame(t){const dt=Math.min(40,t-last)/16.7;last=t;life+=dt;ctx.clearRect(0,0,W,H);let alive=0;
  for(const b of bits){b.vy+=.32*dt;b.vx*=Math.pow(.985,dt);b.x+=b.vx*dt;b.y+=b.vy*dt;b.r+=b.vr*dt;if(b.y>H+20)continue;alive++;
   ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.r);ctx.fillStyle=b.c;ctx.strokeStyle='#1b2723';ctx.lineWidth=1;
   if(b.shape===0){ctx.beginPath();ctx.arc(0,0,b.h*.7,0,7);ctx.fill();ctx.stroke()}else{ctx.scale(1,Math.cos(life*.15+b.r));ctx.fillRect(-b.w/2,-b.h/2,b.w,b.h);ctx.strokeRect(-b.w/2,-b.h/2,b.w,b.h)}ctx.restore()}
  if(alive&&life<400)confetti.raf=requestAnimationFrame(frame);else ctx.clearRect(0,0,W,H)})(last);
}
