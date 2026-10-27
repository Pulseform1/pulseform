import {createCreatureRig,animateCreatureRig} from './creature-rig.js';
import {movementInput} from './controls.js';
import {LocalSession} from './local-session.js';
import * as THREE from '/vendor/three.module.js';
import {MAP as BASE_MAP,objectives as BASE_OBJECTIVES,walkable as gridWalkable,clearSight as gridSight} from '/world.js';
import {createStamina,canSprint,toggleSprint,stepStamina} from '/player-mechanics.js';
import {LEVELS,getLevel,getHidingSpots} from '/levels.js';
let MAP=BASE_MAP,objectives=BASE_OBJECTIVES,currentLevel=0;
const walkable=(x,z)=>gridWalkable(x,z,MAP),clearSight=(a,b)=>gridSight(a,b,MAP);
const DEATH_DURATION=1.25;
const $=id=>document.getElementById(id),S=3.5;let renderer;
const touchMode=matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0;
try{renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:!touchMode,powerPreference:'high-performance'});}catch(e){$('error').textContent='WebGL is required. Please enable hardware acceleration.';throw e}
renderer.setPixelRatio(Math.min(devicePixelRatio,touchMode?1.2:1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();scene.background=new THREE.Color('#080e0c');scene.fog=new THREE.FogExp2('#0c1712',.045);const camera=new THREE.PerspectiveCamera(67,innerWidth/innerHeight,.08,95);camera.rotation.order='YXZ';scene.add(camera);
const ambient=new THREE.HemisphereLight(0x829e86,0x131913,.36);scene.add(ambient);
function concrete(base){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,256,256);for(let i=0;i<15000;i++){const n=Math.random()*60;ctx.fillStyle=`rgba(${n},${n+5},${n},${Math.random()*.4})`;ctx.fillRect(Math.random()*256,Math.random()*256,Math.random()*3+1,Math.random()*4+1)}for(let i=0;i<20;i++){ctx.fillStyle='#0d180b18';ctx.fillRect(Math.random()*256,0,Math.random()*8,256)}const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;return tex}
const wallMat=new THREE.MeshStandardMaterial({map:concrete('#515a4b'),roughness:.96});const floorMat=new THREE.MeshStandardMaterial({map:concrete('#303b32'),roughness:.85});const metal=new THREE.MeshStandardMaterial({color:0x26352e,roughness:.65,metalness:.6});const black=new THREE.MeshStandardMaterial({color:0x101813,roughness:.8});
const facility=new THREE.Group();scene.add(facility);
function box(w,h,d,mat,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;facility.add(m);return m}
let lights=[],panels=[],exit;
function buildFacility(){
  facility.traverse(obj=>{if(obj.isMesh){obj.geometry.dispose();if(![wallMat,floorMat,metal,black].includes(obj.material)){obj.material.map?.dispose();obj.material.dispose()}}});facility.clear();lights=[];
  const config=getLevel(currentLevel);wallMat.color.set(config.wall);floorMat.color.set(currentLevel===2?'#294b50':'#8c9587');floorMat.roughness=currentLevel===2?.18:.85;scene.fog.color.set(config.fog);scene.background.set(config.fog);

const floor=box(74,.2,43,floorMat,35,-.12,19);box(74,.2,43,wallMat,35,3.6,19);
const walls=new THREE.InstancedMesh(new THREE.BoxGeometry(S,3.6,S),wallMat,MAP.join('').split('').filter(c=>c==='#').length);walls.castShadow=walls.receiveShadow=true;facility.add(walls);let wallIndex=0;const wallTransform=new THREE.Object3D();
for(let z=0;z<MAP.length;z++)for(let x=0;x<MAP[z].length;x++){if(MAP[z][x]==='#'){wallTransform.position.set(x*S,1.7,z*S);wallTransform.updateMatrix();walls.setMatrixAt(wallIndex++,wallTransform.matrix);if(z<11&&MAP[z+1]?.[x]==='.')box(S,.12,.05,metal,x*S,.85,z*S+S/2+.03)}else{if((x+z)%7===0){const fixture=box(1.5,.06,.18,new THREE.MeshStandardMaterial({color:0xbacdb7,emissive:0x8bac86,emissiveIntensity:2}),x*S,3.35,z*S);const l=new THREE.PointLight(config.light,8,12,2);l.position.set(x*S,3.1,z*S);facility.add(l);lights.push(l)}if((x*17+z*11)%13===0){box(.8,.75,.55,metal,x*S+.7,.36,z*S+.5);box(.6,.05,.4,black,x*S+.7,.77,z*S+.5)}if((x+z*7)%19===0){for(let i=0;i<3;i++)box(.06,.04,2.7,metal,x*S-.3+i*.2,3.28,z*S)}}}
// Long exposed service pipes and hanging cable runs.
for(const z of [4,8])for(let i=0;i<3;i++){const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,63,8),metal);pipe.rotation.z=Math.PI/2;pipe.position.set(35,3.05-i*.16,z*S-1.2);facility.add(pipe)}
function label(text,color='#b5bfa8'){const c=document.createElement('canvas');c.width=512;c.height=128;const t=c.getContext('2d');t.fillStyle='#18251d';t.fillRect(0,0,512,128);t.strokeStyle=color;t.strokeRect(8,8,496,112);t.fillStyle=color;t.font='bold 32px monospace';t.textAlign='center';t.fillText(text,256,75);return new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)})}
box(2.4,.6,.04,label(`SECTOR 0${currentLevel+1}`),8*S,2.7,3*S+1.78);box(2.4,.6,.04,label('CONTAINMENT'),13*S,2.6,5*S-1.78);
panels=objectives.map((o,i)=>{const m=box(.65,1,.45,new THREE.MeshStandardMaterial({color:0x27392c,emissive:0xe16026,emissiveIntensity:.3}),o.x*S,1,o.z*S);box(.5,.25,.02,label(['POWER','CALIBRATE','LOCKS','LIFT'][i],'#e7ac61'),o.x*S,1.2,o.z*S+.24);const l=new THREE.PointLight(i===3?0x68bda2:0xff7e38,3,5);l.position.set(o.x*S,1.8,o.z*S);facility.add(l);return m});
for(const h of getHidingSpots(config)){
  const cabinet=new THREE.Group();cabinet.position.set(h.cabinetX*S,0,h.cabinetZ*S);cabinet.rotation.y=h.yaw;facility.add(cabinet);
  const cabinetMetal=metal.clone();cabinetMetal.color.setHex(0x263e47);
  const part=(w,height,d,x,y,z,mat=cabinetMetal)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,height,d),mat);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;cabinet.add(mesh)};
  part(.94,1.95,.06,0,.975,.28);part(.055,1.95,.58,-.46,.975,0);part(.055,1.95,.58,.46,.975,0);part(.94,.05,.58,0,1.95,0);part(.94,.05,.58,0,.025,0);
  part(.84,1.1,.055,0,.58,-.28);part(.84,.43,.055,0,1.715,-.28);for(let i=0;i<4;i++)part(.84,.025,.06,0,1.16+i*.08,-.285);
  part(.5,.12,.02,0,1.78,-.318,label('HIDE [H]','#76b9d7'));part(.025,.13,.04,.32,.92,-.32);
}
const end=objectives[3];exit=box(2.4,3,.18,metal,end.x*S,1.5,end.z*S+1.5);box(2,.4,.03,label(currentLevel===4?'SURFACE':'NEXT SECTOR','#92cfb0'),end.x*S,2.8,end.z*S+1.62);
}
buildFacility();
const flashlight=new THREE.SpotLight(0xe8edd8,28,32,.48,.65,1.2);flashlight.castShadow=true;flashlight.shadow.mapSize.set(1024,1024);flashlight.shadow.bias=-.0003;scene.add(flashlight,flashlight.target);const spill=new THREE.PointLight(0xb9d3ac,.7,4);scene.add(spill);
// Sculpted procedural creature: irregular skin, articulated bones and individual teeth.
function creatureSkin(){const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');g.fillStyle='#6d7060';g.fillRect(0,0,512,512);for(let i=0;i<28000;i++){const v=35+Math.random()*95;g.fillStyle=`rgba(${v+15},${v},${v-9},${Math.random()*.3})`;g.fillRect(Math.random()*512,Math.random()*512,2+Math.random()*7,1+Math.random()*5)}for(let i=0;i<95;i++){let x=Math.random()*512,y=Math.random()*512;g.beginPath();g.moveTo(x,y);for(let j=0;j<8;j++){x+=(Math.random()-.5)*40;y+=Math.random()*20;g.lineTo(x,y)}g.strokeStyle=i%3?'#302d2940':'#671d1b70';g.lineWidth=.4+Math.random()*2;g.stroke()}for(let i=0;i<25;i++){g.fillStyle='#561c1b45';g.beginPath();g.ellipse(Math.random()*512,Math.random()*512,3+Math.random()*16,8+Math.random()*30,Math.random()*6,0,Math.PI*2);g.fill()}return new THREE.CanvasTexture(c)}
const skinTexture=creatureSkin(),flesh=new THREE.MeshStandardMaterial({map:skinTexture,color:0x9a9b84,roughness:.85,bumpMap:skinTexture,bumpScale:.07});
const monster=new THREE.Group();scene.add(monster);monster.position.set(63,0,3.5);
let creatureArt=createCreatureRig(flesh,0);monster.add(creatureArt);
const modelReady=true;
function cloneCreature(){const group=new THREE.Group();group.add(createCreatureRig(flesh,currentLevel));return group}
function configureCreature(index){
  for(const group of [monster,apparition,attacker]){
    const old=group.getObjectByName('creature-model');if(old){group.remove(old);old.geometry.dispose();old.material.forEach(material=>material.dispose())}
    const model=createCreatureRig(flesh,index);group.add(model);if(group===monster)creatureArt=model;
  }
}
const partner=new THREE.Group();const suit=new THREE.MeshStandardMaterial({color:0xb78f54});const body=new THREE.Mesh(new THREE.CapsuleGeometry(.25,.65,4,8),suit);body.position.y=1;partner.add(body);const helmet=new THREE.Mesh(new THREE.SphereGeometry(.23,12,8),metal);helmet.position.y=1.7;partner.add(helmet);const partnerLamp=new THREE.PointLight(0xc7d6ae,2,6);partnerLamp.position.y=1.5;partner.add(partnerLamp);scene.add(partner);partner.visible=false;
const partners=[partner,...Array.from({length:2},()=>{const clone=partner.clone(true);scene.add(clone);clone.visible=false;return clone})];
const dustGeo=new THREE.BufferGeometry(),dustPos=new Float32Array(1500);for(let i=0;i<dustPos.length;i+=3){dustPos[i]=Math.random()*70;dustPos[i+1]=Math.random()*3.5;dustPos[i+2]=Math.random()*39}dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));scene.add(new THREE.Points(dustGeo,new THREE.PointsMaterial({size:.025,color:0xacc09c,transparent:true,opacity:.27})));
let endurance=createStamina(),hiddenSpot=null,chased=false;
let socket,id,code,started=false,down=false,ended=false,stage=0,pos={x:2,z:1},yaw=Math.PI,pitch=0,light=true,muted=false,micLevel=0,micStream,micAnalyser,audio,master,age=0,near=100,hasMonsterState=false,keys={},lastSend=0,stepClock=0,lastScare=0,locked=false,controls=false,partnerState=null,teammates=[],spectateIndex=0,mapOpen=true,keyboardMode=true,releasingPointer=false,turnVelocity=0,pitchVelocity=0;
document.body.classList.toggle('touch-mode',touchMode);
if(touchMode){$('resume').textContent='PLAY WITH TOUCH';$('resumeMouse').hidden=true;$('mapButton').textContent='MAP';$('interactButton').textContent='USE';$('menuButton').textContent='MENU';$('hideButton').textContent='HIDE';}
const titleText=['Restore auxiliary power','Recover the research data','Release containment locks','Reach the freight elevator'];const hints=['Find the amber panel in the west laboratory.','Search the northern research wing.','Find the override in the southwest storage room.','Regroup at the southeast elevator. Both survivors must be present.'];
function sound(freq=70,duration=.3,volume=.1,type='sine',pan=0){if(!audio||muted)return;const o=audio.createOscillator(),g=audio.createGain(),p=audio.createStereoPanner();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(10,freq*.4),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);p.pan.value=pan;o.connect(g).connect(p).connect(master);o.start();o.stop(audio.currentTime+duration)}
function initAudio(){if(audio){audio.resume();return}audio=new (window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=.65;const limiter=audio.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=6;limiter.ratio.value=12;limiter.attack.value=.003;limiter.release.value=.2;master.connect(limiter).connect(audio.destination);const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=37;g.gain.value=.055;ambientDrone=g;o.connect(g).connect(master);o.start();setInterval(()=>{if(started&&!ended&&horrorClock>=hushUntil){sound(35+Math.random()*45,2,.04,'sine',Math.random()*2-1);if(Math.random()<.2)sound(140,.15,.04,'triangle',Math.random()*2-1)}},2500)}
function notice(t){$('notice').textContent=t;clearTimeout(notice.timer);notice.timer=setTimeout(()=>$('notice').textContent='',4500)}
function setActive(active){controls=active;if(!active){endurance.sprintWanted=false;}if(!active){turnVelocity=0;pitchVelocity=0;}if(socket?.readyState===1)socket.send(JSON.stringify({type:'active',active}));keys={}}
function requestLock(keyboardOnly=keyboardMode){
  keyboardMode=keyboardOnly;
  if(down||ended)return;
  setActive(true);$('pause').hidden=true;
  if(touchMode||keyboardOnly)return;
  try{const result=renderer.domElement.requestPointerLock?.();result?.catch(()=>notice('Mouse capture unavailable. Drag the scene to look; WASD still moves.'))}
  catch{notice('Drag the scene to look; use WASD to move.')}
}
function releaseMouse(){if(document.pointerLockElement){releasingPointer=true;document.exitPointerLock?.()}}
function pauseGame(){setActive(false);releaseMouse();if(!down&&!ended)$('pause').hidden=false}
function interact(){if(!controls||down||ended)return;if(hiddenSpot){requestHide();return;}if(stage===1&&Math.hypot(pos.x-objectives[1].x,pos.z-objectives[1].z)<1.6){$('puzzle').hidden=false;updateDials();releaseMouse();$('pause').hidden=true;keys={}}else socket?.send(JSON.stringify({type:'interact'}))}
function requestHide(){if(controls&&!down&&!ended&&socket?.readyState===1)socket.send(JSON.stringify({type:'hide'}))}
function switchSprint(){if(!controls||hiddenSpot||down||ended)return;if(endurance.exhausted){notice('Out of breath. Wait for stamina to recover.');return}toggleSprint(endurance);socket?.send(JSON.stringify({type:'sprint',enabled:endurance.sprintWanted}))}
function setHidden(spotId){
  if(hiddenSpot===spotId)return;hiddenSpot=spotId||null;endurance.hidden=hiddenSpot;endurance.sprintWanted=false;keys={};document.body.classList.toggle('hiding',!!hiddenSpot);
  if(hiddenSpot){const h=getHidingSpots(getLevel(currentLevel)).find(s=>s.id===hiddenSpot);if(h){pos={x:h.x,z:h.z};yaw=h.yaw;pitch=0}light=false;$('puzzle').hidden=true;notice('HIDDEN · Chase broken. H or E to step out.')}else notice('You left the locker. Stay quiet.');
}
function updateStaminaHUD(){const value=Math.round(endurance.stamina);$('staminaFill').style.width=`${value}%`;$('staminaBar').setAttribute('aria-valuenow',String(value));$('staminaValue').textContent=`${value}%`;$('sprintToggle').textContent=endurance.exhausted?'EXHAUSTED':endurance.sprintWanted?'SPRINT ON [SHIFT]':'SPRINT OFF [SHIFT]';$('staminaBar').classList.toggle('low',value<25);}
function toggleMap(){mapOpen=!mapOpen;$('navigation').hidden=!mapOpen;$('mapButton').setAttribute('aria-pressed',String(mapOpen))}

function updateObjective(config,step){
  const o=config.objectives[step];let title=o?.name||'Escape complete';
  if(o&&!/^(restore|recover|release|reach|isolate|calibrate|open|break|energize|decode|unlock|drain|sequence)/i.test(title))title=['Restore','Calibrate','Activate','Reach'][step]+' '+title.charAt(0).toLowerCase()+title.slice(1);
  if($('objective').textContent!==title)$('objective').textContent=title;$('objectiveStep').textContent=o?`${step+1} / 4`:'COMPLETE';
  $('hint').textContent=step===3?'Reach the elevator and press E. Your team advances and dead teammates respawn.':step===1?'Find the orange terminal. Press E, then use its note to solve the three channels.':'Find the orange control panel on your map. Move close and press E.';
  if(!o)$('bearing').textContent='All objectives complete';
}
function loadLevel(index){
  hiddenSpot=null;chased=false;endurance=createStamina();document.body.classList.remove('hiding');currentLevel=index;const config=getLevel(index);hasMonsterState=false;near=100;monster.visible=false;const spawn=config.monsterSpawn;lastCreaturePosition.set(spawn.x*S,0,spawn.z*S);monster.rotation.y=Math.PI;monsterTarget.copy(lastCreaturePosition);monster.position.copy(monsterTarget);creatureSpeed=0;MAP=config.map;objectives=config.objectives;stage=0;pos={...config.spawn};yaw=Math.PI;pitch=0;down=false;attackTime=0;visionTime=0;pendingScare=null;hushUntil=0;stalkerLife=0;apparitionLife=0;apparition.visible=false;
  document.body.classList.remove('bloodied','attacking','startled','spectating');$('blood').getContext('2d').clearRect(0,0,$('blood').width,$('blood').height);$('scare').hidden=true;$('puzzle').hidden=true;
  dials.fill(0);puzzleChannel=0;$('puzzleNote').textContent=config.note;$('levelTitle').textContent=`LEVEL ${index+1} / 5 — ${config.name}`;$('monsterRule').textContent=`${config.monster}: ${config.rule}`;
  updateObjective(config,0);buildFacility();configureCreature(index);setActive(false);releaseMouse();$('pause').hidden=false;notice(`Sector ${index+1}: ${config.name}. All teammates have respawned.`);
}
function join(room='',solo=false){
  if(socket&&socket.readyState<2)return;initAudio();$('error').textContent='Establishing connection…';socket=solo?new LocalSession():new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}`);
  socket.onopen=()=>socket.send(JSON.stringify({type:'join',code:room}));socket.onerror=()=>$('error').textContent='Connection failed. Check the server and try again.';
  socket.onclose=()=>{if(started&&!ended){setActive(false);releaseMouse();$('pause').hidden=false;notice('Connection lost. Reload to reconnect.')}};
  socket.onmessage=e=>{
    const m=JSON.parse(e.data);
    if(m.type==='error'){$('error').textContent=m.message;socket.close()}
    if(m.type==='joined'){id=m.id;code=m.code;started=true;$('menu').hidden=$('facility').hidden=$('footer').hidden=true;$('hud').hidden=false;document.body.classList.add('playing');$('session').textContent=code==='SOLO'?'3D BUILD 7 · SOLO':`EXPEDITION ${code}`;loadLevel(0)}
    if(m.type==='level'&&m.level!==currentLevel)loadLevel(m.level);
    if(m.type==='hidden'){setHidden(m.spot);if(Number.isFinite(m.x)){pos.x=m.x;pos.z=m.z}}
    if(m.type==='correction'){pos.x=m.x;pos.z=m.z}
    if(m.type==='state'){
      if(m.level!==currentLevel)loadLevel(m.level);
      const me=m.players.find(p=>p.id===id);if(me){setHidden(me.hidden||null);endurance.stamina=me.stamina??100;endurance.exhausted=!!me.exhausted;endurance.recoveryDelay=me.recoveryDelay||0;if(me.exhausted)endurance.sprintWanted=false;}chased=m.chaseTarget===id;stage=m.stage;age=m.age;facilityBlackout=!!m.blackout;monsterTarget.set(m.monster.x*S,0,m.monster.z*S);if(!hasMonsterState){monster.position.copy(monsterTarget);lastCreaturePosition.copy(monsterTarget);hasMonsterState=true}near=Math.hypot(pos.x-m.monster.x,pos.z-m.monster.z)*S;
      teammates=m.players.filter(p=>p.id!==id);partnerState=teammates.find(p=>!p.down)||teammates[0];
      partners.forEach((model,i)=>{const p=teammates[i];model.visible=!!p&&!p.hidden;if(p){model.position.set(p.x*S,0,p.z*S);model.rotation.set(0,p.yaw,p.down?Math.PI/2:0)}});
      $('partner').textContent=code==='SOLO'?'SOLO · FIVE-SECTOR CAMPAIGN':`TEAM ${m.players.filter(p=>!p.down).length}/${m.players.length} ALIVE · ROOM ${code}`;
      const config=getLevel(currentLevel);updateObjective(config,stage);panels.forEach((p,i)=>p.material.emissive.setHex(i<stage?0x398b61:0xe16026));
    }
    if(m.type==='haunt')haunt(m.kind,m.duration);if(m.type==='notice')notice(m.message);
    if(m.type==='event'){sound(55,1.5,.3,'sawtooth');notice(['','POWER RESTORED. Something heard that.','DATA RECOVERED. Containment is failing.','LIFT RELEASED. Reach the next sector.'][m.stage]||'')}
    if(m.type==='caught'){setHidden(null);setActive(false);down=true;$('puzzle').hidden=true;scare();releaseMouse();$('status').textContent='DEAD — TEAMMATES CAN RESCUE YOU BY ADVANCING';$('pause').hidden=true;notice('Your teammate must reach the next level to bring you back.')}
    if(m.type==='lost'||m.type==='win'){
      setActive(false);ended=true;$('puzzle').hidden=true;releaseMouse();$('pause').hidden=true;$('end').hidden=attackTime>0;
      const deathLevel=currentLevel;if(attackTime>0)setTimeout(()=>{if(ended&&currentLevel===deathLevel)$('end').hidden=false},(DEATH_DURATION+.05)*1000);
      $('endLabel').textContent=m.type==='win'?'ALL FIVE SECTORS CLEARED':'EXPEDITION LOST';$('endTitle').textContent=m.type==='win'?'YOU MADE IT OUT.':'THE HOLLOW REMAINS.';
      $('endText').textContent=m.type==='win'?`Your team survived all five monsters in ${Math.floor(age/60)}m ${Math.floor(age%60)}s.`:'Every survivor is dead. Start a new expedition and stay together.';
    }
  }
}

function scare(){lastScare=performance.now();attackTime=DEATH_DURATION;attackEndsAt=performance.now()+DEATH_DURATION*1000;document.body.classList.add('attacking');$('scare').hidden=false;document.body.style.setProperty('--blood-opacity','0');jumpScareSound();setTimeout(()=>{$('scare').hidden=true;document.body.classList.remove('attacking')},(DEATH_DURATION+.1)*1000)}
$('host').onclick=()=>join('',true);$('hostCoop').onclick=()=>join();$('join').onclick=()=>{$('joinForm').hidden=!$('joinForm').hidden;$('roomInput').focus()};$('connect').onclick=()=>{const c=$('roomInput').value.trim();if(c.length!==6){$('error').textContent='Enter the 6-character room code.';return}join(c)};$('roomInput').onkeydown=e=>{if(e.key==='Enter')$('connect').click()};$('resume').onclick=()=>{initAudio();requestLock(true)};$('resumeMouse').onclick=()=>{initAudio();requestLock(false)};$('leave').onclick=()=>location.reload();$('sound').onclick=()=>{initAudio();muted=!muted;master.gain.value=muted?0:.65;$('sound').textContent=muted?'◖ SOUND OFF':'◖ SOUND ON'};
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===renderer.domElement;if(!locked&&releasingPointer){releasingPointer=false;keys={};return}if(locked){setActive(true);$('pause').hidden=true}else if(started&&!down&&!ended&&$('puzzle').hidden&&controls){setActive(false);$('pause').hidden=false}keys={}});document.addEventListener('mousemove',e=>{if(locked){yaw-=e.movementX*.002;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.002,-1.4,1.4)}});
async function toggleMic(){if(micStream){micStream.getTracks().forEach(t=>t.stop());micStream=null;micAnalyser=null;micLevel=0;$('mic').textContent='MIC OFF';return}try{initAudio();micStream=await navigator.mediaDevices.getUserMedia({audio:true});micAnalyser=audio.createAnalyser();micAnalyser.fftSize=256;audio.createMediaStreamSource(micStream).connect(micAnalyser);$('mic').textContent='MIC ON · IT CAN HEAR YOU';notice('Microphone detects local volume only. Voice audio is never recorded or transmitted.')}catch{notice('Microphone unavailable. Footstep and flashlight detection remain active.')}}
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT')return;
  if(e.code==='Enter'&&!started&&$('joinForm').hidden&&e.target.tagName!=='BUTTON'){e.preventDefault();$('host').click();return}
  if(started&&!$('pause').hidden&&e.code==='Enter'&&e.target!==$('leave')&&e.target!==$('resumeMouse')){e.preventDefault();initAudio();requestLock(true);return}
  if(ended&&e.code==='Enter'){e.preventDefault();location.reload();return}
  if(!started)return;
  if(down&&!ended&&['ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();spectateIndex+=e.code==='ArrowRight'?1:-1;return}
  if(!$('puzzle').hidden){
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Escape'].includes(e.code)||/^Digit[0-9]$/.test(e.code)){
      e.preventDefault();if(e.repeat)return;
      if(e.code==='ArrowLeft')puzzleChannel=(puzzleChannel+2)%3;
      if(e.code==='ArrowRight')puzzleChannel=(puzzleChannel+1)%3;
      if(e.code==='ArrowUp')dials[puzzleChannel]=(dials[puzzleChannel]+1)%10;
      if(e.code==='ArrowDown')dials[puzzleChannel]=(dials[puzzleChannel]+9)%10;
      if(/^Digit[0-9]$/.test(e.code))dials[puzzleChannel]=Number(e.code.slice(-1));
      updateDials();if(e.code==='Enter')$('submitPuzzle').click();if(e.code==='Escape')$('closePuzzle').click();
    }return;
  }
  if(e.code==='Escape'&&controls){e.preventDefault();pauseGame();return}
  if(!controls)return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyI','KeyJ','KeyK','KeyL','KeyE','KeyF','KeyM','Space','ControlLeft','Tab'].includes(e.code))e.preventDefault();
  keys[e.code]=true;
  if(e.repeat)return;
  if(e.code==='ShiftLeft'||e.code==='ShiftRight')switchSprint();if(e.code==='KeyH')requestHide();if(e.code==='Tab')toggleMap();if(e.code==='KeyF'&&!hiddenSpot){light=!light;sound(170,.06,.04,'square')}
  if(e.code==='KeyR'){pitch=0;pitchVelocity=0;}if(e.code==='KeyE')interact();if(e.code==='KeyM')toggleMic();
});document.addEventListener('keyup',e=>keys[e.code]=false);window.addEventListener('blur',()=>{keys={};if(started&&controls&&$('puzzle').hidden)pauseGame()});
function canMove(x,z){return [[-.18,-.18],[.18,-.18],[-.18,.18],[.18,.18]].every(([a,b])=>walkable(x+a,z+b))}
let prev=performance.now(),time=0,creatureSpeed=0;const lastCreaturePosition=new THREE.Vector3(63,0,3.5),monsterTarget=new THREE.Vector3(63,0,3.5);
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-prev)/1000,.05);prev=now;time+=dt;
if(!started){camera.position.set(8*S+Math.sin(time*.08)*.4,1.6,4*S);camera.rotation.set(-.025,Math.PI/2+.13+Math.sin(time*.06)*.025,0);flashlight.intensity=0;spill.intensity=0;monster.visible=false}else{monster.visible=hasMonsterState;let moving=false,crouch=keys.ControlLeft||keys.KeyC,run=canSprint(endurance)&&!crouch;endurance.crouch=!!crouch;let noise=0;if(controls&&$('puzzle').hidden&&!down&&!ended){const input=movementInput(keys);turnVelocity=THREE.MathUtils.damp(turnVelocity,input.turn*1.7,14,dt);pitchVelocity=THREE.MathUtils.damp(pitchVelocity,input.look*1.15,14,dt);yaw-=turnVelocity*dt;pitch=THREE.MathUtils.clamp(pitch+pitchVelocity*dt,-1.4,1.4);const {forward,side}=input;const len=1,speed=hiddenSpot?0:(crouch?.56:run?1.65:1.0)*dt;const previousX=pos.x,previousZ=pos.z;const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)/len*speed,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)/len*speed;if(canMove(pos.x+dx,pos.z))pos.x+=dx;if(canMove(pos.x,pos.z+dz))pos.z+=dz;moving=Math.hypot(pos.x-previousX,pos.z-previousZ)>.0001;stepStamina(endurance,dt,moving);run=canSprint(endurance)&&!crouch;noise=moving?(crouch?.035:run?1:.36):0;if(moving){stepClock+=dt*(run?2:1);if(stepClock>.48){stepClock=0;sound(85,.13,crouch?.015:run?.13:.055,'triangle')}}}if(micAnalyser&&!hiddenSpot){const data=new Uint8Array(256);micAnalyser.getByteTimeDomainData(data);micLevel=Math.sqrt(data.reduce((a,b)=>a+(b-128)**2,0)/256)/50;noise=Math.max(noise,micLevel)}
camera.position.set(pos.x*S,(down?.45:crouch?1.03:1.65)+(moving?Math.sin(time*(run?15:10))*.035:Math.sin(time*1.3)*.008),pos.z*S);camera.rotation.set(pitch,yaw,moving?Math.sin(time*5)*.005:0);if(hiddenSpot){const h=getHidingSpots(getLevel(currentLevel)).find(s=>s.id===hiddenSpot);if(h)camera.position.set(h.cabinetX*S,1.3,h.cabinetZ*S);}if(down&&!ended&&attackTime<=0){const alive=teammates.filter(p=>!p.down);if(alive.length){const followed=alive[((spectateIndex%alive.length)+alive.length)%alive.length];camera.position.set(followed.x*S,1.65,followed.z*S);camera.rotation.set(0,followed.yaw,0)}}document.body.classList.toggle('spectating',down&&!ended&&attackTime<=0);flashlight.visible=light&&!down;flashlight.intensity=28;spill.intensity=light?.6:.08;flashlight.position.copy(camera.position);flashlight.position.y-=.12;const dir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);flashlight.target.position.copy(camera.position).addScaledVector(dir,12);spill.position.copy(camera.position);if(now-lastSend>70&&socket?.readyState===1){lastSend=now;socket.send(JSON.stringify({type:'move',x:pos.x,z:pos.z,yaw,noise,light,crouch:!!crouch}))}
const o=objectives[stage],locker=getHidingSpots(getLevel(currentLevel)).find(h=>Math.hypot(pos.x-h.x,pos.z-h.z)<1.15);updateStaminaHUD();$('prompt').textContent=hiddenSpot?'HIDDEN · [H] OR [E] TO EXIT':locker?'[H] HIDE IN LOCKER':down&&!ended?'SPECTATING · ← / → SWITCH SURVIVOR':!down&&o&&Math.hypot(o.x-pos.x,o.z-pos.z)<1.5?`[ E ] ${stage===3?'CALL ELEVATOR':o.name.toUpperCase()}`:'';if(!down)$('status').textContent=hiddenSpot?'● HIDDEN — SAFE FROM PURSUIT':chased?'⚠ YOU ARE BEING CHASED — FIND A LOCKER':near<8?'△ HEART RATE ELEVATED':crouch?'● MOVING QUIETLY':'● VITALS STABLE';if(near<10&&!down&&!ended){if(near<5&&now-lastScare>22000){notice('DON’T TURN AROUND.');lastScare=now;sound(220,.6,.16,'sawtooth')}}exit.position.y=THREE.MathUtils.lerp(exit.position.y,stage>=3?4.3:1.5,dt*1.2);}
const closestLights=[...lights].sort((a,b)=>a.position.distanceToSquared(camera.position)-b.position.distanceToSquared(camera.position)).slice(0,5);lights.forEach((l,i)=>{l.visible=started?closestLights.includes(l):Math.abs(l.position.z-4*S)<1;l.intensity=(started?5:9)*(Math.sin(time*9+i*27)>.97?.08:1);if(started&&facilityBlackout)l.intensity=.015});updateHorror(dt);if(started){monster.position.lerp(monsterTarget,1-Math.exp(-dt*14));const velocity=monster.position.distanceTo(lastCreaturePosition)/Math.max(dt,.001);const travel=monster.position.clone().sub(lastCreaturePosition);if(travel.lengthSq()>.00001){const targetYaw=Math.atan2(travel.x,travel.z),delta=Math.atan2(Math.sin(targetYaw-monster.rotation.y),Math.cos(targetYaw-monster.rotation.y));monster.rotation.y+=delta*(1-Math.exp(-dt*8))}else if(near<8){const targetYaw=Math.atan2(camera.position.x-monster.position.x,camera.position.z-monster.position.z),delta=Math.atan2(Math.sin(targetYaw-monster.rotation.y),Math.cos(targetYaw-monster.rotation.y));monster.rotation.y+=delta*(1-Math.exp(-dt*3))}lastCreaturePosition.copy(monster.position);creatureSpeed=THREE.MathUtils.damp(creatureSpeed,Math.min(1.3,velocity/3.2),5,dt);animateCreatureRig(creatureArt,dt,creatureSpeed,currentLevel);animateCreatureRig(apparition.getObjectByName('creature-model'),dt,0,currentLevel);drawMap();if(oForBearing())updateBearing()}if(attackTime>0){attackTime=Math.max(0,(attackEndsAt-now)/1000);renderAttack(dt)}else if(visionTime>0){visionTime=Math.max(0,visionTime-dt);renderAttack(dt,true);if(!visionTime)document.body.classList.remove('startled')}else renderer.render(scene,camera)}requestAnimationFrame(frame);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});

let puzzleChannel=0;const dials=[0,0,0];function updateDials(){document.querySelectorAll('[data-dial]').forEach((b,i)=>{b.textContent=dials[i];b.classList.toggle('selected',i===puzzleChannel)})}document.querySelectorAll('[data-dial]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.dial);puzzleChannel=i;dials[i]=(dials[i]+1)%10;updateDials();sound(220+dials[i]*60,.08,.03,'triangle')});$('submitPuzzle').onclick=()=>{socket?.send(JSON.stringify({type:'interact',answer:dials.join('')}));if(dials.join('')===getLevel(currentLevel).answer){$('puzzle').hidden=true;requestLock()}};$('closePuzzle').onclick=()=>{$('puzzle').hidden=true;requestLock()};

$('mapButton').onclick=toggleMap;$('menuButton').onclick=pauseGame;$('interactButton').onclick=interact;
$('sprintToggle').onclick=switchSprint;$('touchSprint').onclick=switchSprint;$('hideButton').onclick=requestHide;
$('touchLight').onclick=()=>{if(controls&&!hiddenSpot)light=!light};
let lookPointer=null,lookX=0,lookY=0;
renderer.domElement.addEventListener('pointerdown',e=>{if(!controls||locked||!$('puzzle').hidden)return;if(touchMode&&e.clientX<innerWidth*.35)return;lookPointer=e.pointerId;lookX=e.clientX;lookY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)});
renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer||locked||!controls)return;yaw-=(e.clientX-lookX)*.004;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-lookY)*.004,-1.4,1.4);lookX=e.clientX;lookY=e.clientY});
for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,e=>{if(e.pointerId===lookPointer)lookPointer=null});
window.addEventListener('blur',()=>{keys={};lookPointer=null});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&controls)pauseGame()});
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(controls)keys[b.dataset.key]=true};for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>keys[b.dataset.key]=false)});
function oForBearing(){return objectives[stage]}
function updateBearing(){const o=oForBearing(),angle=Math.atan2(o.x-pos.x,-(o.z-pos.z))+yaw;const a=Math.atan2(Math.sin(angle),Math.cos(angle));const arrow=Math.abs(a)<.35?'↑':Math.abs(a)>2.6?'↓':a>0?'→':'←';$('bearing').textContent=`${arrow} ${o.name.toUpperCase()} · ${Math.round(Math.hypot(o.x-pos.x,o.z-pos.z)*S)} M`}
function drawMap(){if(!mapOpen)return;const c=$('mapCanvas').getContext('2d'),cell=14;c.fillStyle='#09120e';c.fillRect(0,0,294,168);for(let z=0;z<MAP.length;z++)for(let x=0;x<MAP[z].length;x++){c.fillStyle=MAP[z][x]==='#'?'#1a2a20':'#405143';c.fillRect(x*cell,z*cell,cell-1,cell-1)}getHidingSpots(getLevel(currentLevel)).forEach(h=>{c.fillStyle='#79c5e1';c.fillRect(h.x*cell+4,h.z*cell+4,5,5)});objectives.forEach((o,i)=>{if(i>stage)return;c.fillStyle=i<stage?'#87bca0':'#ed7945';c.fillRect(o.x*cell+3,o.z*cell+3,7,7)});for(const p of teammates){c.fillStyle=p.down?'#ed5545':'#8dceba';c.beginPath();c.arc((p.x+.5)*cell,(p.z+.5)*cell,3,0,Math.PI*2);c.fill()}c.save();c.translate((pos.x+.5)*cell,(pos.z+.5)*cell);c.rotate(yaw);c.fillStyle='#f4efce';c.beginPath();c.moveTo(0,-6);c.lineTo(-4,4);c.lineTo(4,4);c.closePath();c.fill();c.restore()}

// Environmental scares never move the real creature or damage the player.
let facilityBlackout=false,horrorClock=0,nextBreath=0,nextHeart=0,apparitionLife=0,ambientDrone=null,hushUntil=0,pendingScare=null,visionTime=0,lastVision=-100,stalkerLife=0;
const apparition=cloneCreature(monster);apparition.traverse(m=>{if(m.isMesh){m.material=Array.isArray(m.material)?m.material.map(mat=>mat.clone()):m.material.clone();for(const mat of (Array.isArray(m.material)?m.material:[m.material])){mat.transparent=true;mat.opacity=.65}m.castShadow=true}});apparition.visible=false;scene.add(apparition);
function noiseSound(duration=.8,volume=.1,pan=0,frequency=900,attack=.12){
  if(!audio||muted)return;
  const length=Math.ceil(audio.sampleRate*duration),buffer=audio.createBuffer(1,length,audio.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(.55+.45*Math.sin(i/audio.sampleRate*19));
  const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain(),stereo=audio.createStereoPanner();source.buffer=buffer;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.9;stereo.pan.value=pan;
  gain.gain.setValueAtTime(.001,audio.currentTime);gain.gain.exponentialRampToValueAtTime(volume,audio.currentTime+Math.min(attack,duration*.4));gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);
  source.connect(filter).connect(gain).connect(stereo).connect(master);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();stereo.disconnect()};
}
// One synchronized impact: a near-instant transient, tearing rasp, and falling growl.
// Every layer uses the existing mute control and master compressor.
function jumpScareSound(){
  noiseSound(.12,.24,0,2400,.003);
  noiseSound(.62,.19,0,780,.004);
  sound(94,.82,.19,'sawtooth');
  sound(43,.95,.17,'triangle');
  sound(1320,.18,.045,'triangle');
}
function haunt(kind,duration){
  if(!started||ended||down||hiddenSpot)return;
  const pan=Math.random()<.5?-.85:.85;
  if(kind==='ambush'||kind==='falsealarm'){if(pendingScare||horrorClock-lastVision<24)return;hushUntil=horrorClock+3+Math.random()*2;pendingScare={at:hushUntil,real:kind==='ambush',pan};return}
  if(kind==='stalker'){placeStalker();return}
  if(kind==='blackout'){sound(42,1,.2,'sawtooth');noiseSound(.35,.13,pan,260);notice('EMERGENCY LIGHTING FAILURE. Stay close.');return}
  if(kind==='whisper'){noiseSound(2,.13,pan,1300);sound(187,1.7,.035,'sine',-pan);return}
  if(kind==='footsteps'){for(let i=0;i<4;i++)setTimeout(()=>{if(controls&&!ended){sound(58+i*4,.18,.1,'triangle',pan);noiseSound(.13,.08,pan,350)}},i*420);return}
  if(kind==='impact'){sound(32,.9,.18,'triangle',pan);noiseSound(.4,.2,pan,480);return}
  if(kind==='apparition'){
    // Only place a silhouette in reachable, unobstructed nearby floor space.
    for(const offset of [.8,-.8,0,1.4,-1.4]){const angle=yaw+offset,d=2.3,x=pos.x-Math.sin(angle)*d,z=pos.z-Math.cos(angle)*d;if(walkable(x,z)&&clearSight(pos,{x,z})){apparition.position.set(x*S,0,z*S);apparition.lookAt(camera.position.x,0,camera.position.z);apparition.visible=true;apparitionLife=1.2;noiseSound(1.2,.11,Math.sin(offset),750);break}}
  }
}
function updateHorror(dt){
  const active=started&&controls&&!down&&!ended;
  if(!active){document.body.style.setProperty('--dread','0');document.body.style.setProperty('--danger-strength','0');$('proximityWarning').hidden=true;return}
  horrorClock+=dt;
  if(ambientDrone)ambientDrone.gain.setTargetAtTime(horrorClock<hushUntil?.003:.055,audio.currentTime,.35);
  if(pendingScare&&horrorClock>=pendingScare.at){const event=pendingScare;pendingScare=null;if(event.real)startLunge();else{noiseSound(.15,.08,event.pan,310);sound(62,.2,.065,'triangle',event.pan)}}
  if(stalkerLife>0){stalkerLife-=dt;const to=apparition.position.clone().sub(camera.position);const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);if(forward.dot(to.normalize())>.84){startLunge();stalkerLife=0;apparitionLife=0;apparition.visible=false}else if(stalkerLife<=0){apparitionLife=0;apparition.visible=false}}
  const threat=THREE.MathUtils.clamp((18-near)/15,0,1);const warning=hiddenSpot?'HIDDEN — PURSUIT LOST':chased?'IT IS CHASING YOU — HIDE IN A BLUE LOCKER':near<8?'IT IS VERY CLOSE':near<18?'SOMETHING IS NEAR':'';if($('proximityWarning').textContent!==warning)$('proximityWarning').textContent=warning;$('proximityWarning').hidden=!warning;$('proximityWarning').classList.toggle('urgent',near<8);document.body.style.setProperty('--danger-strength',String(hiddenSpot?0:threat*.65));document.body.style.setProperty('--danger-period',`${1.55-threat*.8}s`);document.body.style.setProperty('--dread',String(threat*.6));
  if(!hiddenSpot&&threat>.1&&horrorClock>nextHeart){nextHeart=horrorClock+1.1-threat*.65;sound(43,.15,.035+threat*.09);setTimeout(()=>{if(controls&&!ended)sound(36,.14,.02+threat*.05)},130)}
  if(!hiddenSpot&&horrorClock>=hushUntil&&threat>.05&&horrorClock>nextBreath){nextBreath=horrorClock+2+Math.random()*2;const direction=Math.atan2(monster.position.x-camera.position.x,-(monster.position.z-camera.position.z))+yaw;noiseSound(1.25,.035+threat*.09,Math.sin(direction),420+threat*500)}
  if(apparitionLife>0){apparitionLife-=dt;apparition.visible=apparitionLife>0}
}

// Attack uses the actual sculpted creature, lit and animated close to the lens.
let attackTime=0,attackEndsAt=0;
const attackScene=new THREE.Scene();attackScene.background=new THREE.Color(0x080202);
const attackCamera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.05,20),attacker=cloneCreature(monster);attacker.position.set(0,0,0);attacker.rotation.set(0,0,0);attackScene.add(attacker);
const deathAmbient=new THREE.HemisphereLight(0x8e9b8d,0x210200,.9);attackScene.add(deathAmbient);
const deathKey=new THREE.PointLight(0xc6c0a7,13,8);deathKey.position.set(-1,2.9,2);attackScene.add(deathKey);
const deathRim=new THREE.PointLight(0x9e1a12,22,6);deathRim.position.set(1,2,-1);attackScene.add(deathRim);
function renderAttack(dt,vision=false){
  const duration=vision?.85:DEATH_DURATION,t=vision?duration-visionTime:duration-attackTime,model=attacker.getObjectByName('creature-model');
  const rise=THREE.MathUtils.smoothstep(t,0,.065),recoil=THREE.MathUtils.smoothstep(t,.6,duration);
  animateCreatureRig(model,dt,.5,currentLevel,1.1);
  const headPosition=new THREE.Vector3();model.creatureRig.head.getWorldPosition(headPosition);
  attackCamera.aspect=innerWidth/innerHeight;attackCamera.fov=58-rise*6;attackCamera.updateProjectionMatrix();
  attackCamera.position.set(Math.sin(t*49)*.025,headPosition.y+.05+Math.sin(t*37)*.02,1.35-rise*.76+recoil*.2);
  attackCamera.lookAt(headPosition.x,headPosition.y+.07,headPosition.z);
  attacker.rotation.y=Math.sin(t*5)*.12;attacker.rotation.z=Math.sin(t*8)*.055;deathKey.intensity=12;
  renderer.render(attackScene,attackCamera);
}

function startLunge(){
  if(!controls||hiddenSpot||ended||down||attackTime>0||horrorClock-lastVision<24||!$('puzzle').hidden)return;
  lastVision=horrorClock;visionTime=.85;document.body.classList.add('startled');
  jumpScareSound();
}
function placeStalker(){
  if(!controls||hiddenSpot||!$('puzzle').hidden||horrorClock-lastVision<24)return;
  // A false creature waits at the edge of vision; looking toward it triggers the lunge.
  for(const offset of [1.9,-1.9,2.6,-2.6]){const angle=yaw+offset,d=1.8,x=pos.x-Math.sin(angle)*d,z=pos.z-Math.cos(angle)*d;if(walkable(x,z)&&clearSight(pos,{x,z})){apparition.position.set(x*S,0,z*S);apparition.lookAt(camera.position.x,0,camera.position.z);apparition.visible=true;apparitionLife=7;stalkerLife=7;noiseSound(1,.075,Math.sin(offset),900);break}}
}

