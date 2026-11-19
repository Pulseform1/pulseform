import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_DEFAULTS, CREATURE_ACOUSTICS, createAcousticState, planAcoustics, spatialSound, GameAudio } from '../public/audio.js';

function timeline({ seconds=40, monsterId='dredge', settings=AUDIO_DEFAULTS, frame, seed=31, hz=60 }={}) {
  const planner=createAcousticState(seed), cues=[];
  for(let n=0;n<=seconds*hz;n++) {
    const time=n/hz;
    const input=frame?.(time)||{monster:{x:6,z:-10,state:'patrol',speed:0},listener:{x:0,z:0,yaw:0},playing:true};
    for(const cue of planAcoustics(planner,{...input,time,monsterId},settings))cues.push({...cue,time});
    assert.ok(planner.pending.length<=3,'queued strokes must remain bounded');
  }
  return {planner,cues};
}
const movingFrame=time=>({listener:{id:'me',x:0,z:0,yaw:0},monster:{x:5+Math.sin(time*.6)*2,z:-9+Math.cos(time*.6)*2,state:'pursue',targetId:'me',speed:2},exposed:true,playing:true});

test('default soundscape has sparse drips, long silences, and no music or stationary threat drone',()=>{
  assert.equal(AUDIO_DEFAULTS.music,0);
  assert.equal(new GameAudio().settings.music,0);
  const {cues}=timeline({seconds:120});
  assert.ok(cues.length>=7&&cues.length<=17);
  assert.ok(cues.every(cue=>cue.kind==='drip'&&cue.bus==='effects'));
  for(let i=1;i<cues.length;i++)assert.ok(cues[i].time-cues[i-1].time>=7);
  assert.ok(cues.every(cue=>cue.gain<=.051));
});

test('music is opt-in while drips remain available with music muted',()=>{
  const quiet=timeline({seconds:70,settings:{...AUDIO_DEFAULTS,music:0}}).cues;
  const music=timeline({seconds:70,settings:{...AUDIO_DEFAULTS,music:.5,effects:0}}).cues;
  assert.ok(quiet.some(cue=>cue.kind==='drip'));
  assert.ok(!quiet.some(cue=>cue.bus==='music'));
  assert.ok(music.some(cue=>cue.kind==='music'));
  assert.ok(music.every(cue=>cue.bus==='music'));
});

test('stale pursuit/speed fields never generate fake movement sounds',()=>{
  const {cues}=timeline({seconds:18,frame:()=>({listener:{x:0,z:0},monster:{x:3,z:-4,state:'pursue',targetId:'me',speed:7},exposed:true})});
  assert.equal(cues.filter(cue=>cue.kind.startsWith('creature')).length,0);
});

test('all twenty-one moving forms have distinct strokes and intermittent signatures',()=>{
  const variants=new Set(),signatures=new Set();
  for(const monsterId of Object.keys(CREATURE_ACOUSTICS)) {
    const {cues}=timeline({seconds:24,monsterId,frame:movingFrame});
    const strokes=cues.filter(cue=>cue.kind==='creature-stroke'),signature=cues.filter(cue=>cue.kind==='creature-signature');
    assert.ok(strokes.length>5,monsterId);
    assert.ok(signature.length>=1&&signature.length<9,monsterId);
    variants.add(strokes[0].variant);signatures.add(signature[0].variant);
    assert.ok(strokes.every(cue=>cue.bus==='effects'&&cue.position));
    if(monsterId==='mirehound') {
      const first=strokes.findIndex(cue=>cue.beat===0),second=strokes[first+1];
      assert.equal(second.beat,1);assert.ok(second.time-strokes[first].time>=.25&&second.time-strokes[first].time<.3);
    }
    if(monsterId==='hush')assert.ok(strokes.some(cue=>cue.beat===1)&&strokes.every(cue=>cue.beat<2));
    if(monsterId==='glassjaw')assert.ok(strokes.every(cue=>cue.variant==='veil')&&strokes.some(cue=>cue.beat===1));
    if(monsterId==='gloomfin')assert.ok(strokes.every(cue=>cue.variant==='serpent'&&cue.beat===0));
  }
  assert.equal(variants.size,21);assert.equal(signatures.size,21);
});

test('approach sounds settle when player reaches safety and stop when pursuit ends',()=>{
  const {cues}=timeline({seconds:12,monsterId:'hush',frame:time=>{
    const base=movingFrame(time);
    if(time>=5) {base.exposed=false;base.monster.state='retreat';base.monster.targetId=null;}
    return base;
  }});
  assert.ok(cues.some(cue=>cue.kind==='creature-stroke'&&cue.time<5));
  assert.ok(!cues.some(cue=>cue.kind.startsWith('creature')&&cue.time>=5));
});

test('safe friends hear a quieter actual pursuit and reduced scare preserves approach cues',()=>{
  const exposed=timeline({seconds:8,frame:movingFrame,settings:{...AUDIO_DEFAULTS,scare:0}}).cues.find(cue=>cue.kind==='creature-stroke');
  const safe=timeline({seconds:8,frame:time=>({...movingFrame(time),exposed:false,monster:{...movingFrame(time).monster,targetId:'friend'}})}).cues.find(cue=>cue.kind==='creature-stroke');
  assert.ok(exposed&&safe);assert.ok(safe.gain<exposed.gain*.5);assert.ok(exposed.gain>0);
});

test('stopped movement and distant creatures do not keep paddling audibly',()=>{
  const stopped=timeline({seconds:10,frame:time=>movingFrame(Math.min(time,3))}).cues;
  assert.ok(stopped.some(cue=>cue.kind==='creature-stroke'&&cue.time<3));
  assert.ok(!stopped.some(cue=>cue.kind.startsWith('creature')&&cue.time>3.2));
  const distant=timeline({seconds:12,frame:time=>({...movingFrame(time),monster:{...movingFrame(time).monster,z:-50+time*.1}})}).cues;
  assert.ok(!distant.some(cue=>cue.kind.startsWith('creature')));
});

test('solo pause and non-playing screens emit nothing and do not accumulate catch-up bursts',()=>{
  for(const flag of [{paused:true},{playing:false}]) {
    const {cues}=timeline({seconds:90,frame:time=>({...movingFrame(time),...flag})});
    assert.deepEqual(cues,[]);
  }
  const planner=createAcousticState(32);
  for(let i=0;i<100;i++)planAcoustics(planner,{...movingFrame(i/60),time:i/60,monsterId:'hush'});
  assert.deepEqual(planAcoustics(planner,{...movingFrame(300),time:300,playing:false}),[]);
  assert.equal(planner.pending.length,0);
  const resumed=planAcoustics(planner,{...movingFrame(301),time:301,playing:true});
  assert.deepEqual(resumed,[]);
});

test('clock resets and teleports reset scheduling rather than flooding a new round',()=>{
  const planner=createAcousticState(31);
  for(let i=0;i<300;i++)planAcoustics(planner,{...movingFrame(i/60),time:i/60});
  assert.deepEqual(planAcoustics(planner,{...movingFrame(0),time:0}),[]);
  assert.equal(planner.pending.length,0);
  const teleported=planAcoustics(planner,{...movingFrame(.1),time:.1,monster:{x:100,z:-100,state:'pursue',targetId:'me',speed:8}});
  assert.ok(!teleported.some(cue=>cue.kind.startsWith('creature')));
  assert.deepEqual(planAcoustics(planner,{...movingFrame(800),time:800}),[]);
});

test('acoustic scheduling is deterministic and emits bounded per-update work',()=>{
  const a=timeline({seconds:45,monsterId:'hush',frame:movingFrame,seed:71});
  const b=timeline({seconds:45,monsterId:'hush',frame:movingFrame,seed:71});
  assert.deepEqual(a.cues,b.cues);
  const counts=new Map();for(const cue of a.cues)counts.set(cue.time,(counts.get(cue.time)||0)+1);
  assert.ok([...counts.values()].every(count=>count<=5));
});

test('spatial cues reverse with head direction and decay with distance',()=>{
  const right=spatialSound({x:0,z:0,yaw:0},{x:4,z:0});
  const left=spatialSound({x:0,z:0,yaw:Math.PI},{x:4,z:0});
  const far=spatialSound({x:0,z:0,yaw:0},{x:20,z:0});
  assert.ok(right.pan>.99);assert.ok(left.pan<-.99);assert.ok(far.gain<right.gain);
  assert.equal(spatialSound({x:0,z:0,yaw:0},null).gain,1);
});


test('death attack layers a species vocal, transient, water impact and body tone under bounded gains',()=>{
 const sound=new GameAudio();sound.running=true;sound.context={createBuffer(ch,length,rate){const samples=new Float32Array(length);return{getChannelData:()=>samples,duration:length/rate};}};sound.active=false;const calls=[];sound.voice=o=>calls.push(o);sound.stopGroup=()=>{};
 sound.jumpScare('crown',false);assert.equal(calls.length,5);assert.ok(calls.some(c=>c.buffer));assert.ok(calls.some(c=>c.frequency===CREATURE_ACOUSTICS.crown.tone*1.3));assert.equal(sound.active,false);assert.ok(calls.every(c=>c.gain<=.18&&c.group==='scare'));calls.length=0;sound.jumpScare('crown',true);assert.equal(calls.length,1);assert.equal(calls[0].gain,.045);assert.ok(!calls[0].buffer);
});
test('death sound follows anticipation, impact and recoil with no delayed timer queue',()=>{const a=new GameAudio();a.running=true;a.context={};a.settings.scare=1;const calls=[];a.voice=o=>calls.push(o);a.stopGroup=()=>{};a.jumpScare('gloomfin',false,'anticipation');assert.equal(calls.length,2);assert.ok(calls.every(c=>c.gain<=.045&&c.duration<=.17));a.jumpScare('gloomfin',false,'impact');assert.equal(calls.length,6);a.jumpScare('gloomfin',false,'recoil');assert.equal(calls.length,7);assert.ok(calls.every(c=>c.gain<=.18&&c.group==='scare'));calls.length=0;a.jumpScare('gloomfin',true,'anticipation');a.jumpScare('gloomfin',true,'impact');a.jumpScare('gloomfin',true,'recoil');assert.equal(calls.length,1);});

test('faster legitimate creature movement retains audible approach cues',()=>{const {cues}=timeline({seconds:1,hz:60,frame:t=>({listener:{x:0,z:0,yaw:0},monster:{x:-9+t*18,z:-6,state:'pursue',targetId:'me'},exposed:true,playing:true})});assert.ok(cues.some(c=>c.kind==='creature-stroke'));});

test('heartbeat shares effects routing, has bounded double-beat envelopes and can be disabled',()=>{const a=new GameAudio(),calls=[];a.voice=o=>calls.push(o);a.stopGroup=()=>{};a.heartbeat(1,1);a.heartbeat(.5,1);assert.ok(calls[0].gain<=.085&&calls[1].gain<calls[0].gain);assert.ok(calls.every(v=>v.group==='heartbeat'&&v.duration<=.12));a.setSettings({heartbeat:false});a.heartbeat(1,1);assert.equal(calls.length,2);});

test('water-breach cue is short, quieter than impact and absent in reduced presentation',()=>{const a=new GameAudio(),calls=[];a.running=true;a.context={};a.settings.scare=true;a.voice=o=>calls.push(o);a.stopGroup=()=>{};a.jumpScare('raker',false,'breach');assert.equal(calls.length,2);assert.ok(calls.every(c=>c.gain<=.065&&c.duration<=.24&&c.group==='scare'));calls.length=0;a.jumpScare('raker',true,'breach');assert.equal(calls.length,0);});
