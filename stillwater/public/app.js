import {GameScene} from './scene.js';
import {makePortraits} from './creatures.js';
import {ThreatFeedback} from './threat.js';
import {GameAudio} from './audio.js';
import {MONSTERS,CONFIG,WORLD_VERSION,getRoom,stepPlayer,roomIndexAt,primaryMonsterForPlayer} from '/shared/simulation.js';
import {makePredictionWorld,predictStep} from './prediction.js';
import {InputSequence,socketURL,wrapYaw} from './transport.js';
import {BrowserControls,captureMessage} from './controls.js';
import {createCaptureReporter} from './capture-report.js';
import {increasedMouseSensitivity} from './control-settings.js';
import {DeathSequence} from './death-sequence.js';
import {KeyboardLook,focusIdentity,matchingFocus,nextFocus} from './keyboard.js';

const $=s=>document.querySelector(s),app=$('#app'),hud=$('#hud'),canvas=$('#world');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storage={get(key){try{return localStorage.getItem(key);}catch{return null;}},set(key,value){try{localStorage.setItem(key,value);}catch{}}};
const defaults={quality:'low',torch:true,lookMode:'capture',keyboardSpeed:1,brightness:1,fov:78,sensitivity:1,music:0,effects:.65,invert:false,bob:false,shake:true,heartbeat:true,scare:true,dot:true,audioProfile:'quiet-water-v2'};
let settings;try{settings={...defaults,...JSON.parse(storage.get('stillwater.settings')||'{}')};}catch{settings={...defaults};}
if(!storage.get('stillwater.turning-v18')){settings.sensitivity=increasedMouseSensitivity(settings.sensitivity);storage.set('stillwater.settings',JSON.stringify(settings));storage.set('stillwater.turning-v18','1');}
if(!storage.get('stillwater.quiet-audio')){settings.music=0;storage.set('stillwater.quiet-audio','1');storage.set('stillwater.settings',JSON.stringify(settings));}
if(!storage.get('stillwater.capture-default-v14')){if(settings.lookMode!=='keyboard')settings.lookMode='capture';storage.set('stillwater.capture-default-v14','1');storage.set('stillwater.settings',JSON.stringify(settings));}
if(!storage.get('stillwater.smooth-default')){settings.quality='low';storage.set('stillwater.smooth-default','1');storage.set('stillwater.settings',JSON.stringify(settings));}
const launchURL=new URL(location.href);if(launchURL.searchParams.get('look')==='capture'){settings.lookMode='capture';storage.set('stillwater.settings',JSON.stringify(settings));launchURL.searchParams.delete('look');history.replaceState(null,'',launchURL);}
let best=+storage.get('stillwater.best')||0,screen='home',returnScreen='home',connection=null,connected=false,room=null,playerId=null,token=null,state=null,predicted=null,pending=[],prediction=null,respawnSentAt=0,selected=null,portraits={},scene,audio=new GameAudio(),mouseYaw=0,mousePitch=0,keys=new Set(),menuOpen=false,lastEvent=0,lastFoot=0,spectator=0,lastFrame=performance.now(),accumulator=0,uiTimer=0,toastTimer,name=storage.get('stillwater.name')||'',difficulty='normal';
const inputSequence=new InputSequence(),deathSequence=new DeathSequence(),keyboardLook=new KeyboardLook(),threatFeedback=new ThreatFeedback();
let renderBudget=0,hadThreat=false;
let lastRenderedScreen=null;
let showingScare=false,versionMismatch=false,scareReady=false,scareSoundStage=0;
const motionPreference=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
const softScare=()=>!settings.scare||motionPreference?.matches;
function prepareScare(id,variant=0){audio.prepareCreature(id);scareReady=false;if(softScare())return;try{scene.prepareScare(id,{variant});scareReady=true;}catch(error){console.warn('Live creature presentation unavailable; using the gentle fallback.',error);}}
function resetThreat(){hadThreat=false;threatFeedback.reset();audio.stopGroup('heartbeat');const pulse=$('#threat-pulse');pulse?.classList.add('hidden');}
function clearScare(){
  const wasShowing=showingScare;deathSequence.skip();showingScare=false;scene?.endScare();audio.stopGroup('scare');document.body.classList.remove('scaring');
  $('#death-scare').className='hidden';$('#death-scare').replaceChildren();
  if(wasShowing)render();
}
function showScare(){
  const current=deathSequence.current;if(!current)return;
  resetThreat();
  const death={player:localPlayer(),monster:state?.monsters?.find(m=>m.uid===localPlayer()?.killerMonsterUid)||state?.monster};
  if(!current.reduced)prepareScare(current.monsterId,current.variant||0);
  if(!current.reduced){let started=false;try{started=scareReady&&scene.beginScare(current.monsterId,death,{variant:current.variant||0});}catch(error){console.warn('Creature presentation unavailable.',error);}if(!started){current.reduced=true;current.duration=440;}}
  if(current.reduced){ensurePortraits([current.monsterId]);scene.renderReducedScareBackdrop(death);}
  if(!current.reduced)current.duration=(scene.scareStage.motion.duration||1.4)*1000;
  current.start=performance.now(); // Preparation time must not skip the first attack frames.
  showingScare=true;scareSoundStage=0;document.body.classList.add('scaring');
  const overlay=$('#death-scare');overlay.className=`death-scare ${current.reduced?'reduced':'live'}`;
  overlay.innerHTML=`${current.reduced?`<img class="scare-front" src="${portraits[current.monsterId]}" alt="${esc(monster(current.monsterId).name)}">`:''}<div class="scare-waterline"></div><div class="scare-caption"><strong>${current.reduced?'CAUGHT':monster(current.monsterId).name}</strong><button class="quiet small" data-action="skip-scare">Continue · Space / Escape</button></div>`;
  audio.jumpScare(current.monsterId,current.reduced,current.reduced?'impact':'anticipation');
  overlay.querySelector('button').focus({preventScroll:true});updateScare(current.start);
}
function updateScare(now){
  const current=deathSequence.frame(now);if(!current){clearScare();return;}
  if(current.reduced)return;
  const elapsed=(now-current.start)/1000,shot=scene.renderScare(elapsed,settings.shake&&!softScare());
  if(!shot||shot.done){clearScare();return;}
  $('#death-scare').dataset.phase=shot.phase;
  if(['breach','lunge'].includes(shot.phase)&&scareSoundStage<1){audio.jumpScare(current.monsterId,false,'breach');scareSoundStage=1;}
  else if(shot.phase==='impact'&&scareSoundStage<2){audio.jumpScare(current.monsterId,false,'impact');scareSoundStage=2;}
  else if(shot.phase==='recoil'&&scareSoundStage<3){audio.jumpScare(current.monsterId,false,'recoil');scareSoundStage=3;}
  else if(shot.phase==='settle')scareSoundStage=3;
}
let eventQueue=[],lastHUD='',lastCaptureNotice='',openingBrowser=false;
const reportCapture=createCaptureReporter(WORLD_VERSION);
const controls=new BrowserControls({canvas,onDiagnostic:reportCapture,onChange:()=>{
  if(!state||state.finished||!localPlayer()?.alive||room?.phase!=='playing'){controls.suspend();return;}
  menuOpen=false;screen='playing';if(room.mode==='solo')send({type:'pause',paused:false});render();
},onPause:()=>{if(screen==='playing'&&localPlayer()?.alive)pause(true);},onLook:(dx,dy)=>{
  if(screen!=='playing'||menuOpen)return;mouseYaw-=dx*.002*settings.sensitivity;mousePitch=Math.max(-1.5,Math.min(1.5,mousePitch-dy*.002*settings.sensitivity*(settings.invert?-1:1)));
},onHint:toast});
const wave=`<svg viewBox="0 0 40 30" aria-hidden="true"><path d="M2 10 Q10 1 20 10 T38 10 M2 22 Q10 13 20 22 T38 22"/></svg>`;
const brand=`<div class="brand">${wave}<div>STILLWATER<small>THE POOLROOMS</small></div></div>`;
const topbar=()=>`<header class="topbar">${brand}<div class="top-right"><span class="pill"><span class="dot"></span> STAY ABOVE THE SURFACE</span><button class="icon-btn" data-action="settings" aria-label="Settings">⚙</button></div></header>`;
function ensurePortraits(ids){const keep=new Set([...ids,...(state?.monsterId?[state.monsterId]:[])]);for(const id of Object.keys(portraits))if(!keep.has(id))delete portraits[id];const missing=ids.filter(id=>!portraits[id]);if(missing.length)Object.assign(portraits,makePortraits(missing));}
const monster=id=>MONSTERS.find(m=>m.id===id)||MONSTERS[0];
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4000);}
function saveSettings(){storage.set('stillwater.settings',JSON.stringify(settings));scene?.setSettings(settings);audio.setSettings(settings);}
function roomPlayer(){return room?.players.find(p=>p.id===playerId);}
function localPlayer(){return state?.players?.find(p=>p.id===playerId);}
function send(o){if(connection?.readyState===WebSocket.OPEN)connection.send(JSON.stringify(o));else toast('Connection is not ready. Please try again.');}
function releaseInput(){resetThreat();keys.clear();keyboardLook.reset();if(connected&&state)send({type:'input',lifeId:localPlayer()?.lifeId,seq:inputSequence.next(),forward:0,strafe:0,yaw:wrapYaw(mouseYaw),pitch:mousePitch,jump:false,sprint:false});}
function pause(open){menuOpen=open;releaseInput();if(room?.mode==='solo'&&room.phase==='playing')send({type:'pause',paused:open});if(open){controls.suspend();screen='pause';render();}else{screen='playing';render();lock();}}
function lock(mode=settings.lookMode){if(!state||state.finished||!localPlayer()?.alive){if(mode==='capture')controls.guardedAttempt(!state?'no-run':state.finished?'run-finished':'player-not-alive');return;}audio.unlock();controls.enter(mode);}
function leave(){versionMismatch=false;clearScare();deathSequence.reset(null);controls.suspend();audio.stop();releaseInput();if(connected)send({type:'leave'});connection?.close();connection=null;connected=false;room=null;state=null;predicted=null;playerId=null;scareReady=false;scene?.clearScareAssets();pending=[];prediction=null;eventQueue=[];menuOpen=false;lastEvent=0;scene?.setWorld('welcome','normal');scene?.setMonster('dredge');screen='home';render();}

function connect(payload){
  versionMismatch=false;
  if(connection)connection.close();screen='connecting';render();
  const ws=new WebSocket(socketURL(location));connection=ws;
  ws.addEventListener('open',()=>{connected=true;ws.send(JSON.stringify({...payload,worldVersion:WORLD_VERSION}));});
  ws.addEventListener('message',e=>{if(connection!==ws)return;let msg;try{msg=JSON.parse(e.data);}catch{return;}onMessage(msg);});
  ws.addEventListener('close',()=>{if(connection!==ws)return;connected=false;controls.suspend();clearScare();if(room){releaseInput();screen='disconnected';render();}else if(screen==='connecting'){screen='home';render();toast('Could not connect. Start the local game server and try again.');}});
  ws.addEventListener('error',()=>{if(screen==='connecting')toast('Could not reach the game server.');});
}
function onMessage(m){
  if(versionMismatch)return;
  if((m.type==='start'||m.type==='state')&&(m.state?.worldVersion||m.worldVersion)!==WORLD_VERSION){versionMismatch=true;releaseInput();controls.suspend();audio.stop();clearScare();keys.clear();pending=[];connection?.close();connection=null;connected=false;state=null;predicted=null;screen='update-required';render();return;}
  if(m.type==='error'){toast(m.message);if(screen==='connecting'){screen='home';render();}return;}
  if(m.type==='welcome'){playerId=m.id;token=m.token;return;}
  if(m.type==='lobby'){
    const previous=room?.phase;room=m.room;difficulty=room.difficulty;
    if(room.phase==='voting'){ensurePortraits(room.cards);if(previous!=='voting'){clearScare();deathSequence.reset(null);selected=null;menuOpen=false;controls.suspend();keys.clear();}screen='voting';render();}
    else if(room.phase==='lobby'){controls.suspend();keys.clear();screen='lobby';render();}
    else if(room.phase==='results'){controls.suspend();keys.clear();screen='results';menuOpen=false;render();}
    else if(room.phase==='playing'&&!state){screen='connecting';render();}
    else if(room.phase==='playing'&&screen==='lobby'){screen='playing';render();}
    return;
  }
  if(m.type==='start'){
    controls.suspend();keys.clear();
    clearScare();state=m.state;deathSequence.reset(state.players.find(p=>p.id===playerId));selected=m.monsterId;ensurePortraits([m.monsterId]);scene.setWorld(m.seed,m.difficulty);scene.setMonster(m.monsterId);prepareScare(m.monsterId);lastEvent=0;pending=[];eventQueue=[...(m.state.events||[])];menuOpen=false;spectator=0;
    predicted=structuredClone(state.players.find(p=>p.id===playerId)||null);prediction=predicted?predictionWorld(state):null;respawnSentAt=0;mouseYaw=predicted?.yaw||0;mousePitch=predicted?.pitch||0;screen=state.finished||room?.phase==='results'?'results':'playing';render();
    if(screen==='playing'&&settings.lookMode==='keyboard'&&localPlayer()?.alive)lock('keyboard');
    toast(`${monster(m.monsterId).name} guards the entrance. Reach teal checkpoints and stay above the water.`);return;
  }
  if(m.type==='state'){
    const previousPlayer=localPlayer(),incomingPlayer=m.players.find(p=>p.id===playerId),wasAlive=previousPlayer?.alive;if(incomingPlayer&&(incomingPlayer.lifeId??0)<(previousPlayer?.lifeId??0))return;state=m;eventQueue.push(...(m.events||[]));if(eventQueue.length>256)eventQueue.splice(0,eventQueue.length-256);
    const auth=localPlayer(),lifeChanged=auth&&(auth.lifeId??0)!==(previousPlayer?.lifeId??0);if(auth){pending=lifeChanged?[]:pending.filter(p=>p.input.seq>(auth.ackSeq||0));predicted=structuredClone(auth);prediction=predictionWorld(m);for(const p of pending)predictStep(prediction,predicted,p.input,p.dt);}
    if(lifeChanged){if(scene)scene.cameraReady=false;clearScare();releaseInput();deathSequence.reset(auth);respawnSentAt=0;mouseYaw=auth.yaw||0;mousePitch=auth.pitch||0;menuOpen=false;screen='playing';render();if(auth.alive&&settings.lookMode==='keyboard')lock('keyboard');toast('Back at your checkpoint. Your run continues.');}
    if(auth?.maxRoom>best){best=auth.maxRoom;storage.set('stillwater.best',String(best));}
    if(wasAlive&&auth&&!auth.alive){releaseInput();controls.suspend();menuOpen=false;screen=state.finished||room?.phase==='results'?'results':'playing';if(deathSequence.observe(auth,performance.now(),{monsterId:auth.killerMonsterId||state.monsterId,reduced:softScare()}))showScare();render();}else deathSequence.observe(auth,performance.now());
    if(screen==='results')render();
  }
}

function footer(){return `<footer class="menu-footer"><div class="footer-tip"><span class="number">01</span><span>One wrong jump.<br>Something hears you.</span></div><span class="footer-tag">1—4 PLAYERS &nbsp; · &nbsp; 100 RESIDENTS &nbsp; · &nbsp; CHECKPOINTS</span><span>BEST &nbsp;<b>${best} ROOMS</b></span></footer>`;}
function render(){
  const focused=document.activeElement,identity=app.contains(focused)?focusIdentity(focused):null,changed=lastRenderedScreen!==screen;
  renderView();lastRenderedScreen=screen;
  if(showingScare||screen==='playing'&&controls.active)return;
  const items=[...app.querySelectorAll('button:not(:disabled),input,select'),...(screen==='playing'&&!localPlayer()?.alive?hud.querySelectorAll('button:not(:disabled)'):[])];
  let next=matchingFocus(items,identity);
  if(!next&&(changed||focused===document.body)){const preferred=screen==='home'?'[data-action=solo]':['setup','friends','join'].includes(screen)?'#name':screen==='voting'?'[data-monster]':screen==='playing'?'[data-action=keyboard-controls]':'.primary:not(:disabled)';next=app.querySelector(preferred)||items[0];}
  next?.focus({preventScroll:true});
}
function renderView(){
  $('#capture-notice')?.classList.add('hidden');
  const inGame=screen==='playing'&&state;document.body.classList.toggle('playing',!!inGame);document.body.classList.toggle('title-screen',screen==='home');hud.classList.toggle('hidden',!inGame);$('#crosshair').classList.toggle('hidden',!inGame||!settings.dot||!localPlayer()?.alive||!controls.active);
  if(screen==='home')app.innerHTML=`${topbar()}<main class="hero horror-title"><div class="eyebrow">POOL ACCESS · AFTER HOURS</div><div class="title-rule"></div><p class="title-whisper">You are not alone in here.</p><h1>STILL<span>WATER</span></h1><p class="title-warning">The lights are dying.<br>The water is listening.<br><strong>Stay on the platforms.</strong></p><div class="actions"><button class="primary" data-action="solo">Enter alone <span>↗</span></button><button class="secondary" data-action="friends">Bring friends <span>+</span></button></div><button class="quiet small keyboard-launch" data-action="keyboard-solo">Play solo · keyboard only</button><p class="keyboard-note">Tab / arrows navigate · Enter selects</p></main><aside class="water-note horror-note"><span class="warning-mark">!</span><b>DO NOT DISTURB THE WATER</b><span>If something moves beneath you,<br>do not wait to see its face.</span></aside><div class="title-grain" aria-hidden="true"></div>${footer()}`;
  else if(screen==='setup'||screen==='friends'||screen==='join'){
    const friends=screen==='friends',joining=screen==='join';app.innerHTML=`${topbar()}<main class="center-screen"><section class="panel"><button class="back" data-action="home">← Back to the pools</button><h2>${joining?'Find your friends.':friends?'Don’t go alone.':'Take the first jump.'}</h2><p>${joining?'Enter the room code your friend shared.':friends?'Create a private room for up to four explorers.':'Choose your pace. The water gets less forgiving as you go.'}</p><label for="name">Your name</label><input id="name" maxlength="24" value="${esc(name)}" placeholder="Explorer" autocomplete="nickname">${joining?'<label for="code">Room code</label><input id="code" maxlength="8" placeholder="ABCDEF" autocomplete="off" style="text-transform:uppercase;letter-spacing:.16em">':`<label for="difficulty">Starting difficulty</label><select id="difficulty"><option value="chill" ${difficulty==='chill'?'selected':''}>Chill — more room to breathe</option><option value="normal" ${difficulty==='normal'?'selected':''}>Normal — keep your footing</option><option value="nightmare" ${difficulty==='nightmare'?'selected':''}>Nightmare — the water is impatient</option></select>`}<div class="actions"><button class="primary" data-action="${joining?'join-room':friends?'create-party':'create-solo'}">${joining?'Join room':friends?'Create room':'Choose a creature'} <span>→</span></button></div>${friends?'<button class="quiet wide small" data-action="join" style="margin-top:14px">I have a room code</button>':''}</section></main>`;
  }else if(screen==='lobby'){
    const me=roomPlayer(),host=room.hostId===playerId;app.innerHTML=`${topbar()}<main class="center-screen"><section class="panel"><button class="back" data-action="leave">← Leave room</button><h2>Your pool party.</h2><p>Share this code. Only your friends can join.</p><div class="lobby-code">${esc(room.code)}</div><button class="quiet small" data-action="copy">Copy invite link ↗</button><div class="players">${room.players.map(p=>`<div class="player-row"><span class="avatar-badge">${esc(p.name.slice(0,1).toUpperCase())}</span><span>${esc(p.name)}${p.id===room.hostId?' ♛':''}</span><span class="status">${!p.connected?'OFFLINE':p.ready?'READY':'GETTING READY'}</span></div>`).join('')}</div><p>${room.players.length}/4 explorers · ${esc(difficulty)} difficulty</p><div class="actions"><button class="${me?.ready?'quiet':'secondary'}" data-action="ready">${me?.ready?'Not ready':'I’m ready ✓'}</button>${host?'<button class="primary" data-action="begin">Pick a creature →</button>':''}</div><p>Everyone needs to be ready before the host starts.</p></section></main>`;
  }else if(screen==='voting'){
    const mine=room.votes?.[playerId]||selected;app.innerHTML=`${topbar()}<main class="selection"><div class="eyebrow">${room.mode==='solo'?'YOUR NEXT ENCOUNTER':'THE PARTY DECIDES'}</div><h2>Who’s in the water?</h2><p class="intro">${room.mode==='solo'?'Pick your nightmare. All three would love to meet you.':'Choose together. Most votes wins; the host breaks ties.'}</p><p class="keyboard-note">Press 1 / 2 / 3 to choose · Tab to Enter the pools</p><div class="monster-grid">${room.cards.map((id,i)=>{let m=monster(id),votes=Object.entries(room.votes||{}).filter(([p,v])=>v===id);return `<button class="monster-card ${mine===id?'selected':''}" data-monster="${id}" aria-pressed="${mine===id}"><img src="${portraits[id]}" alt="${esc(m.name)} creature portrait"><span class="card-number">${i+1} · SPECIMEN ${String(MONSTERS.indexOf(m)+1).padStart(2,'0')}</span>${mine===id?'<span class="card-check">✓</span>':''}<div class="monster-copy"><h3>${m.name}</h3><span class="creature-form">${m.form}</span><p>${m.tagline}</p><div class="votes">${votes.map(([pid])=>{let p=room.players.find(v=>v.id===pid);return `<span class="vote-dot" title="${esc(p?.name)}">${esc(p?.name?.slice(0,1)||'?')}</span>`;}).join('')}</div></div></button>`;}).join('')}</div><div class="selection-bottom">${room.mode==='solo'?`<button class="primary" data-action="start" ${mine?'':'disabled'}>Enter the pools <span>→</span></button>`:'<span class="pill" id="vote-clock">Waiting for votes…</span>'}<span class="selection-note">Your choice guards the entrance.<br>Other creatures wait deeper in the pools.</span></div><div class="roster">${MONSTERS.map(m=>`<span class="${room.faced?.includes(m.id)?'faced':''}">${room.faced?.includes(m.id)?'✓ ':''}${m.name}</span>`).join('')}</div><button class="back" data-action="leave" style="margin-top:17px">Leave room</button></main>`;
  }else if(screen==='playing'){
    const alive=localPlayer()?.alive;
    app.innerHTML=!controls.active&&alive?`<main class="center-screen play-entry"><section class="panel"><div class="eyebrow">CLICK ONCE TO LOOK</div><h2>Click the game. Look freely.</h2><p>WASD to move · Mouse to look<br>Space to jump or climb · Shift to sprint</p><p>Teal checkpoint decks save your progress. Amber tiles sink after a warning; spinning beams carry you. Press F for your torch. Dry platforms are always safe. If you fall in, move toward a ledge and press Space to climb out.</p><p>Each checkpoint has three marked ways: blue WIDE WAY, amber SHIFTING WAY and lavender HIGH WAY. All three reach the next checkpoint. Route stripes identify the way; tiles explicitly labeled SINKING TILE warn before falling. LONG JUMP decks need a run-up: hold Shift, then tap Space near the edge.</p><button class="primary wide" data-action="mouse-controls">Click to lock mouse →</button><div class="control-choices"><button class="quiet small" data-action="keyboard-controls">Keyboard only · Enter</button><button class="quiet small" data-action="hover-controls">Cursor not locked · fallback</button><button class="quiet small" data-action="drag-controls">Play with drag-to-look</button></div><p>Click any exposed part of the game to lock the pointer. You do not need to hold a button. If this browser blocks capture, use Open in Chrome for a normal browser window. The cursor fallback does not confine your pointer; keyboard-only play is always available.<br>No mouse: press Enter for keyboard-only play. Arrows look, Q/E turn 45°, C levels the view. Escape releases the mouse and opens your menu. Click Resume or the play area to capture again. Tab also opens the menu; it remains normal focus navigation inside menus.</p></section></main>`:'';
    updateHUD();
  }else if(screen==='pause')app.innerHTML=`${topbar()}<main class="center-screen pause-entry"><section class="panel"><div class="eyebrow">TAKE A BREATH</div><h2>${room?.mode==='solo'?'Run paused.':'Still in the pools.'}</h2><p>${room?.mode==='solo'?'Your solo run is paused.':'Your friends and the creature keep moving while this menu is open.'}</p><button class="primary wide" data-action="resume">Resume →</button><div class="control-choices"><button class="quiet small" data-action="keyboard-controls">Keyboard only</button><button class="quiet small" data-action="mouse-controls">Captured mouse</button><button class="quiet small" data-action="hover-controls">Cursor fallback · not locked</button><button class="quiet small" data-action="drag-controls">Drag to look</button></div><button class="quiet wide" data-action="settings" style="margin-top:14px">Settings</button><button class="quiet wide small" data-action="restart" style="margin-top:14px">${room?.mode==='solo'?'Start another run':'Vote to restart'}</button><button class="quiet wide small" data-action="open-browser" style="margin-top:14px">Open in Chrome</button><button class="quiet wide small" data-action="capture-details" style="margin-top:14px">Copy mouse-capture details</button><button class="quiet wide small" data-action="browser-link" style="margin-top:14px">Copy browser link</button><button class="back" data-action="leave" style="margin-top:25px">Leave the pools</button></section></main>`;
  else if(screen==='results'){
    const p=localPlayer(),depth=Math.max(0,...(state?.players||[]).map(x=>x.maxRoom||0));app.innerHTML=`${topbar()}<main class="center-screen"><section class="panel"><div class="eyebrow">THE WATER WINS. THIS TIME.</div><h2>One more jump?</h2><p>${monster(state?.monsterId||selected).name} heard you coming. Your next creature choices are waiting.</p><div class="stat-row"><div class="stat"><b>${depth}</b><span>ROOMS CLEARED</span></div><div class="stat"><b>${Math.round(p?.distance||0)}m</b><span>FARTHEST REACHED</span></div><div class="stat"><b>${best}</b><span>PERSONAL BEST</span></div></div><button class="primary wide" data-action="restart">Choose the next creature →</button><button class="quiet wide small" data-action="leave" style="margin-top:16px">Back to menu</button></section></main>`;
  }else if(screen==='settings'){
    const range=(id,label,min,max,step)=>`<div class="setting-row"><label for="${id}">${label}<span id="${id}-value">${settings[id]}</span></label><input data-setting="${id}" id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${settings[id]}"></div>`;
    const toggle=(id,label)=>`<label class="toggle-row" for="${id}">${label}<input data-setting="${id}" id="${id}" type="checkbox" ${settings[id]?'checked':''}></label>`;
    app.innerHTML=`${topbar()}<main class="center-screen"><section class="panel settings-panel"><button class="back" data-action="settings-back">← Back</button><h2>Make yourself at home.</h2><div class="settings-grid"><label for="lookMode">Look controls</label><select id="lookMode" data-setting="lookMode"><option value="keyboard" ${settings.lookMode==='keyboard'?'selected':''}>Keyboard only — arrows + Q/E turns</option><option value="capture" ${settings.lookMode==='capture'?'selected':''}>Click to lock — free FPS turning</option><option value="hover" ${settings.lookMode==='hover'?'selected':''}>Latched mouse + edge turn — no capture</option><option value="drag" ${settings.lookMode==='drag'?'selected':''}>Hold and drag — embedded browser</option></select><p>Capture falls back to latched mouse movement if your browser declines. No holding is needed; keep the pointer at an edge to continue turning. Arrow keys always look during play.</p><label for="quality">Graphics quality</label><select id="quality" data-setting="quality"><option value="low" ${settings.quality==='low'?'selected':''}>Low — lighter rendering</option><option value="medium" ${settings.quality==='medium'?'selected':''}>Medium — balanced</option><option value="high" ${settings.quality==='high'?'selected':''}>High — richer lighting</option></select>${range('fov','Field of view',60,105,1)}${range('sensitivity','Mouse sensitivity',.3,4,.1)}${range('keyboardSpeed','Keyboard look speed',.35,2,.05)}${range('brightness','Scene visibility',.75,1.4,.05)}${range('music','Optional music (off by default)',0,1,.05)}${range('effects','Sound effects',0,1,.05)}${toggle('torch','Handheld torch · F')}${toggle('invert','Invert mouse look')}${toggle('bob','Camera bob')}${toggle('shake','Camera shake')}${toggle('heartbeat','Proximity heartbeat sound')}${toggle('scare','Full scare intensity')}${toggle('dot','Center dot')}</div><button class="primary wide" data-action="settings-back" style="margin-top:20px">Done ✓</button></section></main>`;
  }else if(screen==='update-required')app.innerHTML=`${topbar()}<main class="center-screen"><section class="panel"><h2>The course has changed.</h2><p>Refresh to load the matching game and server update before entering a run.</p><button class="primary wide" onclick="location.reload()">Refresh the game →</button></section></main>`;
  else if(screen==='disconnected')app.innerHTML=`${topbar()}<main class="center-screen"><section class="panel"><h2>Lost in the mist.</h2><p>The connection to your room closed. Reconnecting preserves your identity; a fallen player can return to their checkpoint.</p><button class="primary wide" data-action="reconnect">Reconnect →</button><button class="quiet wide small" data-action="leave" style="margin-top:14px">Back to menu</button></section></main>`;
  else if(screen==='connecting')app.innerHTML=`${topbar()}<main class="center-screen"><section class="panel"><div class="eyebrow">FINDING YOUR POOL</div><h2>Just a moment…</h2><p class="connection">Connecting to your private session.</p><button class="quiet small" data-action="leave">Cancel</button></section></main>`;
}

function updateCaptureNotice(){
  const notice=$('#capture-notice');if(!notice)return;
  const visible=screen==='playing'&&localPlayer()?.alive&&controls.active&&!controls.captured&&controls.mode!=='keyboard'&&!menuOpen&&!showingScare;
  notice.classList.toggle('hidden',!visible);if(!visible)return;
  const status=controls.captureStatus,message=captureMessage(status),internal=status.errorName==='UnknownError'&&/bug.*chromium/i.test(status.errorMessage||'');
  const markup=`<strong>CURSOR NOT LOCKED</strong><p>${esc(message)}</p>${internal?`<p>Open Chrome or Safari yourself, paste this local address, then start a run and click the game:</p><code>${esc(location.origin+'/?v=18&look=capture')}</code>`:''}<div>${internal?'<button class="primary small" data-action="browser-link">Copy browser link</button><button class="quiet small" data-action="mouse-controls">Retry here</button>':'<button class="primary small" data-action="mouse-controls">Retry capture</button><button class="quiet small" data-action="browser-link">Copy browser link</button>'}<button class="quiet small" data-action="open-browser">Try opening Chrome</button><button class="quiet small" data-action="keyboard-controls">Keyboard only</button></div>`;
  if(markup!==lastCaptureNotice){notice.innerHTML=markup;lastCaptureNotice=markup;}
}
async function openBrowser(){
  if(openingBrowser)return;openingBrowser=true;if(state&&localPlayer()?.alive)pause(true);
  try{const response=await fetch('/open-browser',{method:'POST',headers:{'X-Stillwater-Launch':'1'}}),result=await response.json();if(!response.ok)throw Error(result.message||'Could not open the browser.');toast(`${result.browser} opened. Start a run there, then click the game to lock the mouse.`);}
  catch(error){toast(`${error.message} Use Copy browser link and paste it into Chrome.`);}finally{openingBrowser=false;}
}
function updateHUD(){updateCaptureNotice();if(screen!=='playing'||!state)return;const me=localPlayer(),alive=me?.alive,p=alive?predicted||me:state.players.filter(p=>p.alive)[spectator%Math.max(1,state.players.filter(p=>p.alive).length)];
  const roomData=getRoom(state.seed,roomIndexAt(p?.z||0),state.difficulty),danger=alive&&p?.exposed,longJump=p?.safe&&roomData.platforms.find(deck=>deck.id===p.supportId)?.jumpType==='long';hud.classList.toggle('danger-flash',!!danger);
  const html=`<div class="hud-top"><div class="progress-chip"><small>ROOM ${String(roomData.index+1).padStart(2,'0')} · ${esc(state.difficulty).toUpperCase()}</small><strong>${roomData.name}</strong></div><div class="hud-status ${danger?'danger':''}">${danger?'◉ IT HEARD YOU':p?.safe?'✓ SAFE ON DRY GROUND':'↗ KEEP MOVING'}</div><div class="progress-chip"><small>CHECKPOINT ${String(Math.floor((me?.checkpoint?.order||0)/500)+1)} · ${state.population?.total||100} RESIDENTS</small><strong style="font-size:13px">${monster(primaryMonsterForPlayer(state,p)?.typeId||state.monsterId).name}</strong></div></div><div class="hud-bottom"><div class="key-hints"><span class="key">WASD</span> Move &nbsp; <span class="key">SPACE</span> Jump / climb<br><span class="key">SHIFT</span> Sprint &nbsp; <span class="key">ESC</span> Release / menu &nbsp; <span class="key">F</span> Torch${controls.mode==='keyboard'?'<br><span class="key">↑↓←→</span> Look · Q / E turn 45° · C level':controls.mode==='drag'?'<br><span class="key">DRAG / ↑↓←→</span> Look around':controls.mode==='hover'?'<br><span class="key">CURSOR NOT LOCKED</span> Click to retry · Esc for browser link':controls.captured?'<br><span class="key">MOUSE LOCKED</span> Unlimited turning':controls.pending?'<br><span class="key">REQUESTING CAPTURE</span>':'<br><span class="key">CLICK TO LOCK MOUSE</span>'}</div><div class="threat-note"><b>${danger?'FIND A LEDGE':p?.regroup?'WAIT FOR YOUR FRIENDS':longJump?'SPRINT JUMP AHEAD':'THE WATER IS LISTENING'}</b>${danger?'Move toward a platform. Release and press Space to climb.':p?.regroup?'The party needs to stay within reach.':longJump?'Hold Shift to build speed. Press Space at the edge.':'Reach dry ground. Every time.'}</div></div>${!alive?`<div class="spectator">${p?`Watching ${esc(p.name)}`:'Return to your checkpoint'} <button class="quiet small" data-action="spectate">Next friend</button><button class="primary small" data-action="respawn">Return to checkpoint</button><button class="quiet small" data-action="leave">Leave</button></div>`:''}`;
  if(html!==lastHUD){const identity=hud.contains(document.activeElement)?focusIdentity(document.activeElement):null;hud.innerHTML=html;lastHUD=html;matchingFocus([...hud.querySelectorAll('button')],identity)?.focus({preventScroll:true});}
}

document.addEventListener('click',async e=>{
  const card=e.target.closest('[data-monster]');if(card){selected=card.dataset.monster;send({type:'vote',monsterId:selected});render();audio.unlock();return;}
  const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;
  if(action==='keyboard-solo'){settings.lookMode='keyboard';saveSettings();screen='setup';render();}
  else if(action==='home'){screen='home';render();}else if(action==='solo'){screen='setup';render();}else if(action==='friends'){screen='friends';render();}else if(action==='join'){screen='join';render();}
  else if(action==='create-solo'||action==='create-party'||action==='join-room'){
    name=($('#name')?.value.trim()||'Explorer').slice(0,24);storage.set('stillwater.name',name);difficulty=$('#difficulty')?.value||difficulty;audio.unlock();
    connect(action==='join-room'?{type:'join',name,code:$('#code').value.trim().toUpperCase()}:{type:'create',name,mode:action==='create-solo'?'solo':'party',difficulty});
  }else if(action==='ready')send({type:'ready',ready:!roomPlayer()?.ready});
  else if(action==='begin')send({type:'begin'});
  else if(action==='start'){send({type:'start'});audio.unlock();}
  else if(['resume','keyboard-controls','mouse-controls','hover-controls','drag-controls'].includes(action)){const mode=action==='keyboard-controls'?'keyboard':action==='mouse-controls'?'capture':action==='hover-controls'?'hover':action==='drag-controls'?'drag':settings.lookMode;settings.lookMode=mode;storage.set('stillwater.settings',JSON.stringify(settings));menuOpen=false;screen='playing';render();lock(mode);}
  else if(action==='skip-scare')clearScare();
  else if(action==='respawn'){if(!showingScare){respawnSentAt=performance.now();send({type:'respawn',lifeId:localPlayer()?.lifeId});}}
  else if(action==='leave')leave();
  else if(action==='restart'){send({type:'restart'});toast(room?.mode==='party'?'Restart requested. Your friends can vote to restart.':'Preparing your next encounter…');}
  else if(action==='spectate'){spectator++;updateHUD();}
  else if(action==='reconnect'){const code=room?.code;connect({type:'join',name,code,token});}
  else if(action==='open-browser'&&e.isTrusted){await openBrowser();}
  else if(action==='capture-details'){const details=JSON.stringify({capture:controls.captureStatus,browser:navigator.userAgent,worldVersion:WORLD_VERSION},null,2);try{await navigator.clipboard.writeText(details);toast('Mouse-capture details copied.');}catch{let field=document.createElement('textarea');field.readOnly=true;field.value=details;field.setAttribute('aria-label','Mouse-capture details: copy this text');field.style.cssText='width:100%;height:180px;margin-top:12px;font:12px monospace';e.target.closest('section')?.append(field);field.focus();field.select();toast('Select and copy the details shown below.');}}
  else if(action==='browser-link'){try{await navigator.clipboard.writeText(location.origin+'/?v=18&look=capture');toast('Game link copied. Paste it into Chrome, Safari, Firefox or Edge, then click the game to capture the mouse.');}catch{toast(`Open ${location.origin} in your regular browser for mouse capture.`);}}
  else if(action==='copy'){const url=new URL(location.href);url.searchParams.set('room',room.code);try{await navigator.clipboard.writeText(url.href);toast('Invite link copied. Friends must be able to reach this server.');}catch{toast(`Room code: ${room.code}`);}}
  else if(action==='settings'){if(screen==='settings')return;if(screen==='playing'){pause(true);returnScreen='pause';}else returnScreen=screen;screen='settings';render();}
  else if(action==='settings-back'){saveSettings();if(state?.monsterId&&!softScare()&&!scareReady)prepareScare(state.monsterId);screen=returnScreen;render();}
});
document.addEventListener('input',e=>{let key=e.target.dataset.setting;if(!key)return;settings[key]=e.target.type==='checkbox'?e.target.checked:e.target.type==='range'?+e.target.value:e.target.value;const v=$(`#${key}-value`);if(v)v.textContent=settings[key];audio.setSettings(settings);});
window.addEventListener('keydown',e=>{
  if(controls.consumeReleaseGesture?.(e.code)){e.preventDefault();return;}
  if(e.repeat&&['Escape','Tab'].includes(e.code)){e.preventDefault();return;}
  if(showingScare){if(['Escape','Space','Enter'].includes(e.code)){e.preventDefault();if(!e.repeat)clearScare();}else if(e.code==='Tab'){e.preventDefault();$('#death-scare button')?.focus();}return;}
  const editing=['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName);
  if(screen==='playing'&&localPlayer()?.alive&&(controls.active||controls.pending||controls.captured)&&['Escape','Tab'].includes(e.code)){e.preventDefault();pause(true);return;}
  if(screen==='playing'&&controls.active&&localPlayer()?.alive){
    if(editing)return;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    if(!e.repeat&&e.code==='KeyF'){settings.torch=!settings.torch;saveSettings();toast(settings.torch?'Torch on':'Torch off');}
    if(!e.repeat&&e.code==='KeyC'){mousePitch=0;keyboardLook.reset();}
    if(!e.repeat&&['KeyQ','KeyE'].includes(e.code))mouseYaw+=(e.code==='KeyQ'?1:-1)*Math.PI/4;
    keys.add(e.code);return;
  }
  if(e.code==='Escape'){
    e.preventDefault();
    if(screen==='settings')app.querySelector('[data-action="settings-back"]')?.click();
    else if(screen==='pause')return; // Escape releases; only an explicit Resume/canvas action can recapture.
    else if(['setup','friends','join'].includes(screen))app.querySelector('[data-action="home"]')?.click();
    return;
  }
  if(screen==='playing'&&!controls.active&&localPlayer()?.alive&&e.code==='Enter'){
    e.preventDefault();app.querySelector('[data-action="keyboard-controls"]')?.click();return;
  }
  if(editing){
    if(e.code==='Enter'&&['setup','friends','join'].includes(screen)&&e.target.tagName==='INPUT'){e.preventDefault();app.querySelector('.primary')?.click();}
    return;
  }
  if(screen==='voting'&&/^Digit[123]$/.test(e.code)){e.preventDefault();const card=app.querySelectorAll('[data-monster]')[+e.code.at(-1)-1];card?.focus();card?.click();return;}
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){
    e.preventDefault();const cards=[...app.querySelectorAll('[data-monster]')],items=cards.includes(document.activeElement)?cards:[...app.querySelectorAll('button:not(:disabled),input,select'),...(screen==='playing'&&!localPlayer()?.alive?hud.querySelectorAll('button:not(:disabled)'):[])];
    nextFocus(items,document.activeElement,['ArrowUp','ArrowLeft'].includes(e.code)?-1:1)?.focus();
  }
});
window.addEventListener('keyup',e=>{keys.delete(e.code);controls.releaseKey?.(e.code);});window.addEventListener('blur',()=>{if(showingScare)clearScare();releaseInput();if(screen==='playing'&&localPlayer()?.alive)pause(true);});
canvas.addEventListener('click',e=>{if(e.detail===0)return;if(screen==='pause'&&localPlayer()?.alive){menuOpen=false;screen='playing';}if(screen!=='playing'||!localPlayer()?.alive||menuOpen){controls.guardedAttempt?.(screen!=='playing'?'not-playing':menuOpen?'menu-open':'player-not-alive');return;}if(screen==='playing'&&localPlayer()?.alive&&!menuOpen&&!controls.pending&&!controls.captured){settings.lookMode='capture';storage.set('stillwater.settings',JSON.stringify(settings));lock('capture');}});

function predictionWorld(snapshot){return makePredictionWorld(snapshot,predicted);}
function input(){return {lifeId:predicted?.lifeId,seq:inputSequence.next(),forward:(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),strafe:(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),yaw:wrapYaw(mouseYaw),pitch:mousePitch,jump:keys.has('Space'),sprint:keys.has('ShiftLeft')||keys.has('ShiftRight')};}
function animate(now){requestAnimationFrame(animate);if(showingScare)updateScare(now);const frameDt=Math.max(.001,(now-lastFrame)/1000),dt=Math.min(.08,frameDt);lastFrame=now;controls.update(dt);const active=connected&&room?.phase==='playing'&&state;accumulator=Math.min(.12,accumulator+dt);
  while(accumulator>=1/60){accumulator-=1/60;if(active&&predicted?.alive&&!menuOpen){if(controls.active){const turn=keyboardLook.update(keys,1/60,settings.keyboardSpeed);mouseYaw+=turn.yaw;mousePitch=Math.max(-1.5,Math.min(1.5,mousePitch+turn.pitch));}const i=input();if(!controls.active){i.forward=i.strafe=0;i.jump=i.sprint=false;}if(!prediction)prediction=predictionWorld(state);predictStep(prediction,predicted,i,1/60);pending.push({input:i,dt:1/60});if(pending.length>120)pending.shift();if(connected)send({type:'input',...i});}}
  let p=predicted||localPlayer();if(active&&!localPlayer()?.alive){const living=state.players.filter(p=>p.alive);p=living[spectator%Math.max(1,living.length)]||p;}
  const primary=state?primaryMonsterForPlayer(state,predicted||localPlayer()):null,viewState=state?{...state,monster:primary||state.monster,primaryMonsterId:primary?.uid,monsterId:primary?.typeId||primary?.id||state.monsterId,platformStates:prediction?.platformStates||state.platformStates,platformTime:prediction?.time??state.time}:null;
  const threat=threatFeedback.update({player:predicted||localPlayer(),monster:primary,active:!!active&&screen==='playing'&&controls.active&&!menuOpen&&!showingScare,dt,sampleTime:state?.time||0,reduced:softScare()});
  if(hadThreat&&!threat.active)audio.stopGroup('heartbeat');hadThreat=threat.active;
  const pulse=$('#threat-pulse');pulse.classList.toggle('hidden',!threat.active);if(threat.active){pulse.style.setProperty('--threat-beat',String(threat.pulse));pulse.style.setProperty('--threat-level',String(threat.intensity));pulse.querySelector('span').textContent=threat.intensity>.72?'IT IS RIGHT HERE':threat.intensity>.38?'IT IS GETTING CLOSER':'SOMETHING IS COMING';}
  renderBudget+=frameDt;const livePlay=!!active&&screen==='playing'&&controls.active;if(!showingScare&&(livePlay||renderBudget>=1/30)){scene.update(Math.min(.08,renderBudget),now/1000,viewState,p,settings,!!active||screen==='results',renderBudget,threat);renderBudget=0;}
  if(state){audio.update({listener:p||{x:0,y:0,z:0,yaw:0},monster:primary,monsterId:primary?.typeId||primary?.id||state.monsterId,exposed:!!p?.exposed,time:state.time,playing:!!active,paused:menuOpen&&room?.mode==='solo'});if(threat.beat&&settings.heartbeat)audio.heartbeat(threat.beat,threat.intensity,softScare());for(const event of eventQueue.splice(0)){if(event.id<=lastEvent)continue;lastEvent=event.id;if(event.playerId===playerId&&event.lifeId!=null&&event.lifeId!==localPlayer()?.lifeId)continue;audio.event(event,playerId);if(event.type==='checkpoint'&&event.playerId===playerId)toast('Checkpoint saved. You will return here.');if(event.type==='splash'||event.type==='land')scene.addRipple(event.x,event.z,event.type==='splash');}if(active&&!(menuOpen&&room?.mode==='solo')&&p?.alive&&Math.hypot(p.vx,p.vz)>1&&p.grounded&&now-lastFoot>(p.inWater?450:330)){lastFoot=now;audio.footstep(p.inWater);if(p.inWater)scene.addRipple(p.x,p.z);}}
  if(active&&!localPlayer()?.alive&&!showingScare&&state.time>=(localPlayer()?.respawnReadyAt||0)&&now-respawnSentAt>650){respawnSentAt=now;send({type:'respawn',lifeId:localPlayer()?.lifeId});}
  uiTimer+=dt;if(uiTimer>.15){uiTimer=0;updateHUD();const clock=$('#vote-clock');if(clock&&room?.deadline)clock.textContent=`${Math.max(0,Math.ceil((room.deadline-Date.now())/1000))}s · CAST YOUR VOTE`;}
}

try{
  scene=new GameScene(canvas);scene.setSettings(settings);audio.setSettings(settings);render();requestAnimationFrame(animate);
  const code=new URL(location.href).searchParams.get('room');if(code){screen='join';render();$('#code').value=code.toUpperCase();}
  // Read-only diagnostics for local verification and performance inspection.
  window.stillwater={get state(){return state;},get room(){return room;},get player(){return predicted;},get screen(){return screen;},get controlMode(){return controls.mode;},get captureStatus(){return controls.captureStatus;},worldVersion:WORLD_VERSION,stats:()=>scene.stats()};
}catch(error){console.error(error);app.innerHTML=`<main class="center-screen"><section class="panel"><h2>The pools couldn’t open.</h2><p>This game needs a desktop browser with WebGL2, hardware acceleration, and a keyboard (mouse optional). Try a current Chrome, Edge, Firefox, or Safari browser.</p><p>${esc(error.message)}</p><button class="primary" onclick="location.reload()">Try again</button></section></main>`;}
