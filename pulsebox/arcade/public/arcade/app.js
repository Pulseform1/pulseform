import * as THREE from '/vendor/three.module.js';
import {GAMES,gameInfo} from './catalog.js';
import {createSession,addPlayer,setInput,advance} from './session.js';
import * as neon from './games/neon.js';
import * as deep from './games/deep.js';
import * as ash from './games/ash.js';
import * as sky from './games/sky.js';
import * as chamber from './games/chamber.js';
const views={neon,deep,ash,sky,chamber};
const $=id=>document.getElementById(id),touch=matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0;
document.body.classList.toggle('touch-mode',touch);
let selected=GAMES[0],game=null,localId='solo',session=null,state=null,ws=null,online=false,hostId=null,roomCode='',running=false,paused=false,inLobby=false,ended=false,connectionAttempt=0;
let renderer=null,scene=null,camera=null,view=null,renderState=null,lastTick=performance.now(),accumulator=0,inputClock=0,lastProgress=0,lastHp=100,lastCue=0;
let keys={},held={},yaw=0,pitch=0,lookPointer=null,lookX=0,lookY=0,sprintToggle=false,noticeTimer=0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
let records={};try{records=JSON.parse(localStorage.getItem('afterhours-records')||'{}')||{}}catch{}
const formatTime=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
for(const [i,g] of GAMES.entries()){
 const card=document.createElement('button');card.className='game-card';card.dataset.game=g.id;card.style.setProperty('--card-color',g.color);card.style.setProperty('--cover-position',`${i*25}%`);
 const words=g.title.split(' '),first=words.shift();
 card.innerHTML=`<div class="card-art"><span class="card-number">0${i+1}</span><span class="card-tag">1–4 PLAYER CO-OP</span><div class="card-title">${first}<span>${words.join(' ')||' '}</span></div><span class="card-tagline">${g.tag}</span></div><div class="card-meta"><div><h3>${g.short}</h3><p>${g.genre} · ${g.duration}</p></div><span class="card-arrow">↗</span></div>`;
 card.addEventListener('click',()=>showDetail(g));$('gameGrid').append(card);if(records[g.id])card.querySelector('.card-meta p').textContent=`BEST ${formatTime(records[g.id])} · ${g.genre}`;
}
function showDetail(g){selected=g;$('detailTitle').textContent=g.title;$('detailGenre').textContent=`${g.genre} / AFTERHOURS ORIGINAL`;$('detailDescription').textContent=g.description;$('detailDuration').textContent=g.duration;$('detailControls').textContent=views[g.id].instructions||g.controls;$('detailArt').style.setProperty('--cover-position',`${GAMES.indexOf(g)*25}%`);$('detailError').textContent='';$('detail').hidden=false;$('soloPlay').focus()}
$('featurePlay').onclick=()=>showDetail(GAMES[0]);$('closeDetail').onclick=()=>$('detail').hidden=true;
function joinDialog(){ $('joinError').textContent='';$('joinModal').hidden=false;setTimeout(()=>$('roomCode').focus(),0)}
$('joinOpen').onclick=joinDialog;$('crewJoin').onclick=joinDialog;$('closeJoin').onclick=()=>$('joinModal').hidden=true;
for(const id of ['detail','joinModal'])$(id).addEventListener('click',e=>{if(e.target===$(id))$(id).hidden=true});
// Web Audio is created only by a player gesture; all sounds share a limiter and mute.
let audio=null,master=null,drone=null,motor=null,motorGain=null,muted=false,lastActionSound=0,lastBreath=0;
function initAudio(){try{if(!audio){audio=new (window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=.42;const limiter=audio.createDynamicsCompressor();limiter.threshold.value=-14;limiter.ratio.value=12;master.connect(limiter).connect(audio.destination);drone=audio.createOscillator();const g=audio.createGain();g.gain.value=.015;drone.type='sine';drone.frequency.value=42;drone.connect(g).connect(master);drone.start();motor=audio.createOscillator();motor.type='sawtooth';motorGain=audio.createGain();motorGain.gain.value=0;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;motor.connect(filter).connect(motorGain).connect(master);motor.start()}audio.resume();master.gain.setTargetAtTime(muted?0:.42,audio.currentTime,.04)}catch{}}
function tone(f=220,length=.12,volume=.08,type='sine',end=f*.6){if(!audio||muted)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(18,end),audio.currentTime+length);g.gain.setValueAtTime(.001,audio.currentTime);g.gain.linearRampToValueAtTime(volume,audio.currentTime+.006);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);o.connect(g).connect(master);o.start();o.stop(audio.currentTime+length);o.onended=()=>{o.disconnect();g.disconnect()}}
function soundCue(type){if(type==='win'){tone(330,.45,.13,'triangle',660);tone(495,.8,.09,'sine',990)}else if(type==='damage'){tone(62,.3,.12,'sawtooth',24)}else if(type==='progress'){tone(420,.2,.08,'triangle',700);tone(630,.4,.05,'sine',900)}else if(type==='jump'){tone(180,.15,.045,'triangle',360)}else if(type==='action'){if(game?.id==='deep')tone(950,1,.05,'sine',650);else if(game?.id==='ash')tone(170,.065,.055,'sawtooth',45);else tone(300,.13,.035,'triangle',160)}}
$('muteButton').onclick=()=>{muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:.42,audio.currentTime,.03);$('muteButton').textContent=muted?'SOUND OFF':'SOUND ON ♪'};
function notice(message){$('gameNotice').textContent=message;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('gameNotice').textContent='',2400)}
function clearInput(){keys={};held={};lookPointer=null;sprintToggle=false;if(session)setInput(session,localId,readInput());if(online&&ws?.readyState===1)ws.send(JSON.stringify({type:'input',input:readInput()}))}
function readInput(){let x=(keys.KeyD||keys.ArrowRight||held.right?1:0)-(keys.KeyA||keys.ArrowLeft||held.left?1:0),z=(keys.KeyS||keys.ArrowDown||held.backward?1:0)-(keys.KeyW||keys.ArrowUp||held.forward?1:0);return {x,z,yaw,pitch,jump:!!(keys.Space||held.jump),action:!!(keys.KeyE||held.action),sprint:!!(keys.ShiftLeft||keys.ShiftRight||held.sprint||sprintToggle)}}
function ensureRenderer(){if(renderer)return;renderer=new THREE.WebGLRenderer({canvas:$('gameCanvas'),antialias:!touch,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,touch?1.15:1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=!touch;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1}
function disposeScene(){view?.dispose?.();if(scene){const geo=new Set(),mats=new Set(),tex=new Set();scene.traverse(o=>{if(o.geometry)geo.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m)mats.add(m)});for(const m of mats){for(const v of Object.values(m))if(v?.isTexture)tex.add(v);m.dispose()}for(const t of tex)t.dispose();for(const g of geo)g.dispose()}view=null;scene=null;renderState=null;renderer?.renderLists.dispose()}
function prepareGame(id,nextState){game=gameInfo(id);selected=game;state=nextState;ended=false;paused=false;inLobby=false;yaw=0;pitch=0;clearInput();disposeScene();ensureRenderer();scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.08,500);view=views[id].createView(THREE,scene,camera);lastProgress=state.progress||0;lastHp=state.players[localId]?.hp??100;lastCue=state.event||0;renderState=structuredClone(state);document.body.style.setProperty('--game-color',game.color);$('gameTitle').textContent=game.title;$('gameGenre').textContent=game.genre;$('controlHint').textContent=views[id].instructions||game.controls;$('touchAction').textContent=game.action;$('touchJump').textContent=game.jump;$('touchSprint').textContent=id==='neon'?'BOOST':'SPRINT';$('crosshair').hidden=!['deep','chamber'].includes(id);$('hub').hidden=true;$('playScreen').hidden=false;document.body.classList.add('playing');for(const id of ['detail','joinModal','endModal','pauseModal','lobby'])$(id).hidden=true;running=true;lastTick=performance.now();accumulator=0;inputClock=0;updateHud();initAudio();if(drone)drone.frequency.setTargetAtTime(id==='deep'?37:id==='neon'?57:id==='ash'?46:65,audio.currentTime,.5)}
function startSolo(){disconnect();online=false;localId='solo';session=createSession(selected.id,Math.floor(Math.random()*1e6));addPlayer(session,localId);try{prepareGame(selected.id,session.state)}catch(e){fatal(e)}}
$('soloPlay').onclick=startSolo;
function fatal(e){console.error(e);running=false;$('detailError').textContent=`Unable to start: ${e.message}. A browser with WebGL 2 is required.`;$('detail').hidden=false;document.body.classList.remove('playing');$('playScreen').hidden=true}
function disconnect(){connectionAttempt++;if(ws){const old=ws;ws=null;old.onclose=null;old.onmessage=null;old.close()}online=false;inLobby=false}
function connect(code=''){
 initAudio();if(location.protocol==='file:'){const text='Online co-op needs a hosted game server. Play solo here, or run npm start and open the website URL.';$('detailError').textContent=text;$('joinError').textContent=text;return}
 disconnect();const attempt=connectionAttempt;online=true;session=null;hostId=null;let joined=false;const socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/arcade/socket`);ws=socket;
 const timer=setTimeout(()=>{if(!joined&&ws===socket){$('detailError').textContent='The co-op server did not respond. Start the included Node server, or choose solo play.';$('joinError').textContent=$('detailError').textContent;disconnect()}},9000);
 socket.onopen=()=>socket.send(JSON.stringify({type:'join',code,game:selected.id}));
 socket.onerror=()=>{if(attempt!==connectionAttempt)return;const m='Could not reach the co-op server. The website must run the included Node/WebSocket server.';$('detailError').textContent=m;$('joinError').textContent=m};
 socket.onmessage=e=>{if(attempt!==connectionAttempt)return;let m;try{m=JSON.parse(e.data)}catch{return}
  if(m.type==='error'){clearTimeout(timer);$('detailError').textContent=m.message;$('joinError').textContent=m.message;disconnect();return}
  if(m.type==='joined'){clearTimeout(timer);joined=true;localId=m.id;hostId=m.host;roomCode=m.code;game=gameInfo(m.game);state=m.state;selected=game;inLobby=!m.started;for(const id of ['joinModal','detail'])$(id).hidden=true;if(m.started){try{prepareGame(m.game,m.state)}catch(e){fatal(e)}}else showLobby();return}
  if(m.type==='reset'){ended=false;state=null;return}
  if(m.type==='state'){hostId=m.host;if(!m.started){state=m.state;showLobby();return}if(!running||inLobby||!state||state.status!=='playing'&&m.state.status==='playing'){try{prepareGame(m.game,m.state)}catch(e){fatal(e)}}state=m.state;if(renderState)syncRenderState();updateHud()}
 };
 socket.onclose=()=>{clearTimeout(timer);if(attempt!==connectionAttempt)return;clearInput();if(running){paused=true;$('pauseHint').textContent='Connection lost. Return to the arcade and create or join a new room.';$('pauseModal').hidden=false;$('resumeGame').hidden=true}else{$('joinError').textContent='Connection closed. Try joining again.';$('detailError').textContent='Connection closed. Try hosting again.';$('lobby').hidden=true}ws=null};
}
$('hostPlay').onclick=()=>connect();$('joinForm').onsubmit=e=>{e.preventDefault();connect($('roomCode').value.trim())};
function showLobby(){inLobby=true;running=false;$('lobby').hidden=false;$('lobbyGame').textContent=game.title;$('copyCode').textContent=roomCode;const count=Object.keys(state.players).length;$('lobbyPlayers').textContent=`${count} / 4 PLAYERS CONNECTED`;$('startTogether').hidden=localId!==hostId;$('lobbyHint').textContent=localId===hostId?'Start when your crew is ready. You can also play alone.':'Waiting for the host to start…'}
$('copyCode').onclick=async()=>{try{await navigator.clipboard.writeText(roomCode);$('lobbyHint').textContent='Room code copied.'}catch{$('lobbyHint').textContent=`Share this code: ${roomCode}`}};
$('startTogether').onclick=()=>{initAudio();ws?.send(JSON.stringify({type:'start'}))};$('leaveLobby').onclick=quit;
function quit(){disconnect();running=false;paused=false;ended=false;session=null;state=null;clearInput();disposeScene();for(const id of ['playScreen','pauseModal','endModal','lobby'])$(id).hidden=true;document.body.classList.remove('playing');$('hub').hidden=false;$('resumeGame').hidden=false;if(master)master.gain.setTargetAtTime(0,audio.currentTime,.1);window.scrollTo({top:0})}
for(const id of ['backToHub','quitGame','endBack'])$(id).onclick=quit;
function pause(){if(!running||ended)return;paused=true;clearInput();$('pauseHint').textContent=online?'Your controls are paused. The online session continues for your crew.':'Solo play is paused. Your next adventure can wait.';$('resumeGame').hidden=false;$('pauseModal').hidden=false}
function resume(){if(!running||ended||online&&ws?.readyState!==1)return;paused=false;clearInput();$('pauseModal').hidden=true;initAudio();if(master)master.gain.setTargetAtTime(muted?0:.42,audio.currentTime,.1);lastTick=performance.now()}
$('pauseButton').onclick=pause;$('resumeGame').onclick=resume;
$('replayGame').onclick=()=>{initAudio();if(online){if(hostId===localId)ws?.send(JSON.stringify({type:'restart'}));else notice('Your host can restart the game.')}else startSolo()};
function updateHud(){if(!state||!game)return;const p=state.players[localId];$('objectiveText').textContent=state.message||game.detail;$('progressFill').style.width=`${clamp(state.progress||0,0,1)*100}%`;
 const count=Object.keys(state.players).length;$('teamInfo').textContent=online?`ROOM ${roomCode}\nCREW ${count}/4`:'SOLO RUN';$('teamInfo').style.whiteSpace='pre-line';
 const hp=Math.max(0,Math.round(p?.hp??100));let vitals=`VITALS ${hp}%`;
 if(game.id==='deep')vitals+=` · O₂ ${Math.ceil(p?.oxygen??100)}%`;
 if(game.id==='neon')vitals=`${Math.round(Math.abs(p?.speed||0)*5)} KM/H · LAP ${Math.min(3,(p?.lap||0)+1)}/3 · BOOST ${Math.round(p?.boost||0)}%`;
 if(game.id==='sky')vitals=`CHECKPOINT ${state.checkpoint??p?.checkpoint??0} · CRYSTALS ${state.collected??0}/${state.total??17}`;
 if(game.id==='chamber')vitals=`CHAMBER ${Math.min(3,(state.chamber??state.stage??0)+1)} / 3`;
 if(game.id==='ash')vitals+=` · WAVE ${Math.max(1,state.wave??1)}/5`;
 $('vitals').textContent=vitals;$('contextHint').textContent=p?.hint||'';
 if((state.progress||0)>lastProgress+.01){soundCue('progress');lastProgress=state.progress}
 if(hp<lastHp-2)soundCue('damage');lastHp=hp;
 if(state.event&&state.event!==lastCue){lastCue=state.event;if(['shot','damage','dodge','win'].includes(state.cue))soundCue(state.cue==='shot'?'action':state.cue==='dodge'?'jump':state.cue)}
 if(state.status!=='playing'&&!ended){ended=true;paused=false;clearInput();$('pauseModal').hidden=true;const won=state.status==='won';$('endLabel').textContent=won?'MISSION COMPLETE':'THE NIGHT ISN’T OVER';$('endTitle').textContent=won?'What a night.':'One more run?';$('endText').textContent=state.message||(won?'Your crew made it.':'Try again with a different approach.');$('replayGame').textContent=online&&hostId!==localId?'WAITING FOR HOST TO RESTART':'PLAY AGAIN ↗';$('replayGame').disabled=online&&hostId!==localId;$('endModal').hidden=false;if(won){soundCue('win');const time=state.time||0;if(!records[game.id]||time<records[game.id]){records[game.id]=time;try{localStorage.setItem('afterhours-records',JSON.stringify(records))}catch{}const meta=document.querySelector(`[data-game="${game.id}"] .card-meta p`);if(meta)meta.textContent=`BEST ${formatTime(time)} · ${game.genre}`}$('endText').textContent+=` Finished in ${formatTime(time)}.`}else soundCue('damage')}
}
function syncRenderState(){const previous=renderState;renderState=structuredClone(state);for(const [id,p] of Object.entries(renderState.players)){const old=previous?.players[id];if(old&&Math.hypot(p.x-old.x,p.z-old.z,(p.y||0)-(old.y||0))<8){p.x=old.x;p.z=old.z;p.y=old.y}}}
const gameplayCodes=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyW','KeyA','KeyS','KeyD','KeyE','KeyJ','KeyL','KeyI','KeyK','ShiftLeft','ShiftRight']);
window.addEventListener('keydown',e=>{if(e.target.matches('input,textarea'))return;if(e.code==='Escape'){if(running)paused?resume():pause();else{ $('detail').hidden=true;$('joinModal').hidden=true}return}if(e.code==='Enter'&&paused){resume();return}if(!running||paused||ended)return;if(gameplayCodes.has(e.code))e.preventDefault();keys[e.code]=true});window.addEventListener('keyup',e=>{keys[e.code]=false});
window.addEventListener('blur',()=>{clearInput();if(running&&!ended)pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(running&&!ended)pause()}});
$('gameCanvas').addEventListener('pointerdown',e=>{if(!running||paused||ended||touch&&e.clientX<innerWidth*.35)return;lookPointer=e.pointerId;lookX=e.clientX;lookY=e.clientY;e.currentTarget.setPointerCapture(e.pointerId)});
$('gameCanvas').addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer||paused)return;yaw-=(e.clientX-lookX)*.004;pitch=clamp(pitch-(e.clientY-lookY)*.004,-1.2,1.2);lookX=e.clientX;lookY=e.clientY});for(const event of ['pointerup','pointercancel','lostpointercapture'])$('gameCanvas').addEventListener(event,e=>{if(lookPointer===e.pointerId)lookPointer=null});
for(const b of document.querySelectorAll('[data-input]')){b.addEventListener('pointerdown',e=>{e.preventDefault();if(!running||paused||ended)return;b.setPointerCapture(e.pointerId);held[b.dataset.input]=true;if(b.dataset.input==='jump')soundCue('jump')});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>held[b.dataset.input]=false)}
window.addEventListener('resize',()=>{if(renderer){renderer.setSize(innerWidth,innerHeight);if(camera){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}}});
function frame(now){const dt=Math.min((now-lastTick)/1000,.08);lastTick=now;
 if(motorGain&&audio){const driving=running&&!paused&&!ended&&game?.id==='neon';motorGain.gain.setTargetAtTime(driving?.022:0,audio.currentTime,.12);if(driving)motor.frequency.setTargetAtTime(38+Math.abs(state?.players[localId]?.speed||0)*4,audio.currentTime,.08)}
 if(running&&state&&view){
  if(!paused&&!ended){const turn=(keys.KeyL?1:0)-(keys.KeyJ?1:0),tilt=(keys.KeyI?1:0)-(keys.KeyK?1:0);yaw-=turn*dt*1.8;pitch=clamp(pitch+tilt*dt*1.5,-1.2,1.2);
   const input=readInput();if(game.id==='deep'&&now-lastBreath>2600){lastBreath=now;tone(65,.55,.025,'triangle',42)}if(input.action&&now-lastActionSound>(game.id==='ash'?180:game.id==='deep'?1500:450)){soundCue('action');lastActionSound=now}
   if(online){inputClock+=dt;if(inputClock>=1/30){inputClock=0;if(ws?.readyState===1)ws.send(JSON.stringify({type:'input',input}))}}
   else{setInput(session,localId,input);accumulator+=dt;while(accumulator>=1/30){advance(session,1/30);accumulator-=1/30}state=session.state;renderState=state;updateHud()}
  }
  if(online&&renderState){for(const [id,p] of Object.entries(renderState.players)){const target=state.players[id];if(target){const k=1-Math.exp(-dt*18);p.x=THREE.MathUtils.lerp(p.x,target.x,k);p.z=THREE.MathUtils.lerp(p.z,target.z,k);p.y=THREE.MathUtils.lerp(p.y||0,target.y||0,k)}}}
  try{view.update(renderState||state,localId,paused?0:dt,readInput());renderer.render(scene,camera)}catch(e){fatal(e)}
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if(document.body.dataset.startGame)showDetail(gameInfo(document.body.dataset.startGame));
if(new URLSearchParams(location.search).has('game'))showDetail(gameInfo(new URLSearchParams(location.search).get('game')));
