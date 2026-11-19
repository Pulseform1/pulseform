import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {DeathSequence} from '../public/death-sequence.js';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),start=source.indexOf('function onMessage(m){'),end=source.indexOf('\nfunction footer()',start);
function app(screen){
 const alive={id:'me',alive:true,maxRoom:0},deathSequence=new DeathSequence();deathSequence.reset(alive);let scares=0,released=0;
 const c={screen,menuOpen:true,versionMismatch:false,WORLD_VERSION:'test',state:{players:[alive]},playerId:'me',pending:[],eventQueue:[],best:0,room:{phase:'playing',mode:'party'},deathSequence,softScare:()=>false,performance:{now:()=>100},structuredClone,controls:{suspend(){}},predictionWorld:()=>({}),stepPlayer(){},render(){},releaseInput(){released++;},showScare(){scares++;}};
 c.localPlayer=()=>c.state.players.find(p=>p.id==='me');vm.runInNewContext(source.slice(start,end)+'\nglobalThis.receive=onMessage;',c);
 return{c,get scares(){return scares;},get released(){return released;},receive(players,finished=false){c.receive({type:'state',worldVersion:'test',players,finished,monsterId:'crown',events:[]});}};
}
test('actual authoritative party death leaves pause/settings and enters spectator flow',()=>{
 for(const screen of ['pause','settings']){const s=app(screen);s.receive([{id:'me',alive:false},{id:'friend',alive:true}]);assert.equal(s.c.screen,'playing');assert.equal(s.c.menuOpen,false);assert.equal(s.scares,1);assert.equal(s.released,1);s.receive([{id:'me',alive:false},{id:'friend',alive:true}]);assert.equal(s.scares,1);}
});
test('actual finished-run death preserves results while still presenting one local scare',()=>{const s=app('settings');s.receive([{id:'me',alive:false}],true);assert.equal(s.c.screen,'results');assert.equal(s.c.menuOpen,false);assert.equal(s.scares,1);});
test('another player dying or a supported living player cannot trigger the local presentation',()=>{const s=app('pause');s.receive([{id:'me',alive:true,safe:true},{id:'friend',alive:false}]);assert.equal(s.scares,0);assert.equal(s.c.screen,'pause');});

function playback(){const heard=[];const overlay={dataset:{}};const c={deathSequence:{frame:()=>({start:0,monsterId:'crown',reduced:false})},scene:{renderScare(t){return {phase:t<.035?'anticipation':t<.22?'breach':t<.34?'impact':t<.78?'recoil':'settle',done:false};}},scareSoundStage:0,settings:{shake:true},softScare:()=>false,audio:{jumpScare:(id,reduced,phase)=>heard.push(phase)},$:()=>overlay,clearScare(){}};const a=source.indexOf('function updateScare(now){'),b=source.indexOf('let eventQueue=',a);vm.runInNewContext(source.slice(a,b)+'\nglobalThis.update=updateScare;',c);return{c,heard};}
test('live scare audio follows the rendered stage and never catches up a skipped impact',()=>{const normal=playback();for(const t of [0,40,70,220,300,340,600,780])normal.c.update(t);assert.deepEqual(normal.heard,['breach','impact','recoil']);const hitch=playback();hitch.c.update(450);hitch.c.update(470);assert.deepEqual(hitch.heard,['recoil']);const late=playback();late.c.update(900);late.c.update(1000);assert.deepEqual(late.heard,[]);});

test('checkpoint resurrection clears old prediction and cannot repeat an earlier-life death',()=>{
 const s=app('playing');Object.assign(s.c,{scene:null,clearScare(){},toast(){},settings:{lookMode:'capture'},predictStep(){},respawnSentAt:100,mouseYaw:5,mousePitch:1,lock(){throw Error('capture needs a gesture');}});
 s.c.pending=[{input:{seq:2},dt:1/60}];s.receive([{id:'me',alive:true,lifeId:2,ackSeq:1,yaw:.3,pitch:0}]);
 assert.equal(s.c.pending.length,0);assert.equal(s.c.screen,'playing');assert.equal(s.c.menuOpen,false);assert.equal(s.c.mouseYaw,.3);assert.equal(s.scares,0);s.receive([{id:'me',alive:false,lifeId:1}]);assert.equal(s.c.state.players[0].alive,true);
 s.receive([{id:'me',alive:false,lifeId:2,killerMonsterId:'leech'}]);assert.equal(s.scares,1);assert.equal(s.c.deathSequence.current.monsterId,'leech');
});

test('failed continuous attack still prepares the actual killer portrait for gentle fallback',()=>{
 const current={monsterId:'siphon',reduced:false,start:0},overlay={className:'',innerHTML:'',querySelector:()=>({focus(){}})},made=[];
 const c={performance:{now:()=>20},deathSequence:{current},resetThreat(){},localPlayer:()=>({killerMonsterUid:'m:0:2'}),state:{monsters:[{uid:'m:0:2'}]},prepareScare(){},scareReady:true,scene:{beginScare:()=>false,renderReducedScareBackdrop(){}},ensurePortraits(ids){made.push(...ids);for(const id of ids)c.portraits[id]='data:image/png;base64,TEST';},portraits:{},document:{body:{classList:{add(){}}}},$:()=>overlay,monster:()=>({name:'Siphon'}),esc:v=>v,audio:{jumpScare(){}},updateScare(){}};
 const a=source.indexOf('function showScare(){'),b=source.indexOf('function updateScare(',a);vm.runInNewContext(source.slice(a,b)+'\nglobalThis.show=showScare;',c);c.show();assert.deepEqual(made,['siphon']);assert.equal(current.reduced,true);assert.match(overlay.innerHTML,/data:image\/png/);assert.doesNotMatch(overlay.innerHTML,/src="undefined"/);
});
