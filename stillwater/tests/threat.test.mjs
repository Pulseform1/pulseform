import test from 'node:test';
import assert from 'node:assert/strict';
import {ThreatFeedback} from '../public/threat.js';
const player={id:'me',alive:true,exposed:true,safe:false,x:0,z:0};
const monster={targetId:'me',state:'pursue',x:0,z:-12,radius:1.8};
function frame(f,t,extra={}){return f.update({player,monster:{...monster,z:-12+t*5},active:true,dt:1/60,sampleTime:t,...extra});}
test('actual approach increases rate and intensity and one clock produces bounded double beats',()=>{
 const f=new ThreatFeedback();let early,late,beats=0;for(let i=0;i<100;i++){const t=i/60,o=frame(f,t);if(i===25)early={...o};if(i===95)late={...o};if(o.beat)beats++;assert.ok(o.pulse<1.3);}
 assert.ok(late.bpm>early.bpm+35);assert.ok(late.intensity>early.intensity);assert.ok(beats>=3&&beats<=9);
});
test('safe ground, dead/spectating, menus, unrelated target and retreat reset immediately',()=>{
 for(const change of [{player:{...player,safe:true}},{player:{...player,alive:false}},{active:false},{monster:{...monster,targetId:'friend'}},{monster:{...monster,state:'retreat'}}]){
 const f=new ThreatFeedback();for(let i=0;i<60;i++)frame(f,i/60);const o=frame(f,1,change);assert.deepEqual([o.active,o.intensity,o.pulse,o.beat],[false,0,0,0]);}
});
test('stale speed fields and motion away cannot manufacture a proximity heartbeat',()=>{
 for(const away of [false,true]){const f=new ThreatFeedback();for(let i=0;i<120;i++){const o=frame(f,i/60,{monster:{...monster,speed:18,z:-6-(away?i*.02:0)}});assert.equal(o.active,false);}}
});
test('reduced motion lowers visible pulse without removing threat level or sound timing',()=>{
 const a=new ThreatFeedback(),b=new ThreatFeedback();for(let i=0;i<80;i++){const x={...frame(a,i/60)},y=frame(b,i/60,{reduced:true});assert.equal(x.beat,y.beat);assert.equal(x.bpm,y.bpm);assert.ok(y.pulse<=x.pulse*.281+.0001);}
});
test('windup still reads as imminent pressure and pauses do not accumulate heartbeat bursts',()=>{
 const f=new ThreatFeedback();for(let i=0;i<60;i++)frame(f,i/60,{monster:{...monster,state:'windup',z:-3}});assert.ok(f.output.active);frame(f,2,{active:false});const o=frame(f,500,{monster:{...monster,state:'pursue',z:-3}});assert.equal(o.beat,0);assert.equal(o.active,false);
});

test('closer pressure also accelerates a continuous tremor clock without mutating player aim',()=>{const p={...player,yaw:.7,pitch:.2};const f=new ThreatFeedback();let early,late,last=0;for(let i=0;i<110;i++){const o=frame(f,i/60,{player:p});const delta=o.tremorPhase-last;last=o.tremorPhase;if(i===30)early=delta;if(i===100)late=delta;}assert.ok(late>early);assert.equal(p.yaw,.7);assert.equal(p.pitch,.2);assert.equal(p.x,0);});
