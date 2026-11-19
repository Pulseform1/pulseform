import test from 'node:test';
import assert from 'node:assert/strict';
import {KeyboardLook,focusIdentity,matchingFocus,nextFocus} from '../public/keyboard.js';
test('keyboard camera ramps predictably, releases instantly and reverses without inertia',()=>{
 const k=new KeyboardLook(),keys=new Set(['ArrowLeft']);const first=k.update(keys,1/60).yaw;
 let turn;for(let n=0;n<30;n++)turn=k.update(keys,1/60);assert.ok(turn.yaw>first*2);
 assert.deepEqual(k.update(new Set(),1/60),{yaw:0,pitch:0});
 assert.ok(k.update(new Set(['ArrowRight']),1/60).yaw<0);k.reset();assert.equal(k.heldX,0);
});
test('look speed is frame-rate stable, bounded and independently tunable',()=>{
 const angle=hz=>{const k=new KeyboardLook(),keys=new Set(['ArrowUp','ArrowLeft']);let yaw=0;for(let i=0;i<hz;i++)yaw+=k.update(keys,1/hz,1).yaw;return yaw;};
 assert.ok(Math.abs(angle(60)-angle(120))<.02);
 const a=new KeyboardLook().update(new Set(['ArrowLeft']),1/60,.5),b=new KeyboardLook().update(new Set(['ArrowLeft']),1/60,2);assert.equal(b.yaw,a.yaw*4);
 assert.ok(new KeyboardLook().update(new Set(['ArrowLeft']),10,100).yaw<.1);
});
test('menu focus survives rebuilt voting nodes by identity and disabled controls can be omitted',()=>{
 const old={dataset:{monster:'crown'}},card={dataset:{monster:'crown'}},start={dataset:{action:'start'}};
 assert.equal(matchingFocus([card,start],focusIdentity(old)),card);
 assert.equal(nextFocus([card,start],card,1),start);assert.equal(nextFocus([card,start],start,1),card);
 assert.equal(nextFocus([card,start],card,-1),start);assert.equal(nextFocus([],null,1),null);
 assert.equal(matchingFocus([start],focusIdentity({id:'name'})),null);
});
