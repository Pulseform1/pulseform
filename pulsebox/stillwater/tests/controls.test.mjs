import test from 'node:test';
import assert from 'node:assert/strict';
import {BrowserControls} from '../public/controls.js';

class Surface extends EventTarget {
  constructor(){super();this.style={};this.focused=false;}
  focus(){this.focused=true;}
  fire(type,props={}){const e=new Event(type,{cancelable:true});for(const [k,v]of Object.entries(props))Object.defineProperty(e,k,{value:v});this.dispatchEvent(e);return e;}
}
function setup(request){
  const canvas=new Surface(),document=new Surface(),changes=[],looks=[],hints=[];let pauses=0;
  document.pointerLockElement=null;document.exitPointerLock=()=>{document.pointerLockElement=null;document.fire('pointerlockchange');};
  if(request)canvas.requestPointerLock=()=>request({canvas,document});
  const controls=new BrowserControls({canvas,document,onChange:m=>changes.push(m),onLook:(x,y)=>looks.push([x,y]),onHint:m=>hints.push(m),onPause:()=>pauses++,fallbackDelay:15});
  return{canvas,document,controls,changes,looks,hints,get pauses(){return pauses;}};
}

test('embedded browser without pointer lock latches mouse movement with no button hold',()=>{
  const s=setup();s.controls.enter();assert.equal(s.controls.active,true);assert.equal(s.controls.mode,'hover');assert.equal(s.canvas.focused,true);assert.deepEqual(s.changes,['hover']);
  s.canvas.fire('pointermove',{clientX:20,clientY:30});s.canvas.fire('pointermove',{clientX:60,clientY:22});assert.deepEqual(s.looks,[[40,-8]]);
  s.canvas.fire('pointerup');s.canvas.fire('pointermove',{clientX:80,clientY:25});assert.deepEqual(s.looks.at(-1),[20,3]);assert.match(s.hints[0],/does not provide mouse capture/);s.controls.dispose();
});
test('rejected or throwing pointer lock never leaves the play gate blocked',async()=>{
  for(const request of [()=>{throw Error('Unsupported');},()=>Promise.reject(Error('Denied'))]){
    const s=setup(request);s.controls.enter();await Promise.resolve();assert.equal(s.controls.active,true);assert.equal(s.controls.mode,'hover');assert.equal(s.hints.length,1);s.controls.dispose();
  }
});
test('silent pointer lock failure times out into playable fallback',async()=>{
  const s=setup(()=>undefined);s.controls.enter();await new Promise(r=>setTimeout(r,25));assert.equal(s.controls.active,true);assert.equal(s.controls.mode,'hover');s.controls.dispose();
});
test('successful pointer lock preserves relative mouse look and Escape pauses',()=>{
  const s=setup(({canvas,document})=>{document.pointerLockElement=canvas;document.fire('pointerlockchange');});s.controls.enter();assert.equal(s.controls.mode,'locked');
  s.document.fire('mousemove',{movementX:8,movementY:-3});assert.deepEqual(s.looks,[[8,-3]]);s.document.exitPointerLock();assert.equal(s.controls.active,false);assert.equal(s.pauses,1);s.controls.dispose();
});
test('pause cancels pending fallback and ignores subsequent drag input',async()=>{
  const s=setup(()=>undefined);s.controls.enter();s.controls.suspend();await new Promise(r=>setTimeout(r,25));assert.equal(s.controls.active,false);assert.deepEqual(s.changes,[]);
  s.canvas.fire('pointerdown',{button:0,clientX:0,clientY:0});s.canvas.fire('pointermove',{clientX:50,clientY:50});assert.deepEqual(s.looks,[]);s.controls.dispose();
});

test('outside-canvas release clears dragging even when pointer capture is unavailable',()=>{
  const s=setup();s.controls.enter(true);s.canvas.fire('pointerdown',{button:0,clientX:10,clientY:10});s.document.fire('pointerup');
  s.canvas.fire('pointermove',{clientX:40,clientY:50});assert.deepEqual(s.looks,[]);assert.equal(s.controls.active,true);s.controls.dispose();
});
test('delayed pointer-lock success after pause cannot resume the run',()=>{
  const s=setup(()=>undefined);s.controls.enter();s.controls.suspend();s.document.pointerLockElement=s.canvas;s.document.fire('pointerlockchange');
  assert.equal(s.document.pointerLockElement,null);assert.equal(s.controls.active,false);assert.deepEqual(s.changes,[]);s.controls.dispose();
});

test('explicit mouse-movement mode looks without a held button and resets at window edges',()=>{
  const s=setup();s.controls.enter('hover');assert.equal(s.controls.mode,'hover');assert.equal(s.controls.active,true);
  s.canvas.fire('pointermove',{clientX:100,clientY:50});s.canvas.fire('pointermove',{clientX:112,clientY:47});assert.deepEqual(s.looks,[[12,-3]]);
  s.canvas.fire('pointerleave');s.canvas.fire('pointermove',{clientX:10,clientY:10});assert.equal(s.looks.length,1);
  s.controls.suspend();s.canvas.fire('pointermove',{clientX:20,clientY:30});assert.equal(s.looks.length,1);s.controls.dispose();
});
test('late capture cannot override an explicit no-capture mouse choice',()=>{
  const s=setup(()=>undefined);s.controls.enter('capture');s.controls.enter('hover');s.document.pointerLockElement=s.canvas;s.document.fire('pointerlockchange');
  assert.equal(s.controls.mode,'hover');assert.equal(s.controls.active,true);assert.equal(s.document.pointerLockElement,null);s.controls.dispose();
});


test('latched fallback keeps turning at an edge without a held button and stops on leave or pause',()=>{
  const s=setup();s.canvas.getBoundingClientRect=()=>({left:0,top:0,width:800,height:600});s.controls.enter();
  s.canvas.fire('pointermove',{clientX:799,clientY:300});s.controls.update(1/60);assert.ok(s.looks.at(-1)[0]>0);const count=s.looks.length;
  s.canvas.fire('pointerleave');s.controls.update(1/60);assert.equal(s.looks.length,count);
  s.canvas.fire('pointermove',{clientX:1,clientY:300});s.controls.update(1/60);assert.ok(s.looks.at(-1)[0]<0);s.controls.suspend();const stopped=s.looks.length;s.controls.update(1/60);assert.equal(s.looks.length,stopped);s.controls.dispose();
});
test('clicking again can upgrade active fallback to genuine captured mouse look',()=>{
  let requests=0;const s=setup(({canvas,document})=>{requests++;if(requests===1)throw Error('Not yet');document.pointerLockElement=canvas;document.fire('pointerlockchange');});
  s.controls.enter('capture');assert.equal(s.controls.mode,'hover');s.controls.enter('capture');assert.equal(s.controls.mode,'locked');s.document.fire('mousemove',{movementX:15,movementY:-5});assert.deepEqual(s.looks,[[15,-5]]);assert.match(s.hints.at(-1),/Mouse locked/);s.controls.dispose();
});
test('slow successful capture may replace automatic fallback but never a later explicit choice',async()=>{
  const s=setup(()=>undefined);s.controls.enter('capture');await new Promise(r=>setTimeout(r,25));assert.equal(s.controls.mode,'hover');s.document.pointerLockElement=s.canvas;s.document.fire('pointerlockchange');assert.equal(s.controls.mode,'locked');s.controls.dispose();
});

test('keyboard-only entry never requests capture or responds to pointer motion',()=>{
  let requests=0;const s=setup(()=>{requests++;});s.controls.enter('keyboard');
  assert.equal(requests,0);assert.equal(s.controls.active,true);assert.equal(s.controls.mode,'keyboard');assert.equal(s.canvas.focused,true);
  s.document.fire('mousemove',{movementX:50,movementY:20});s.canvas.fire('pointermove',{clientX:100,clientY:40});s.controls.update(1/60);assert.deepEqual(s.looks,[]);
  s.controls.suspend();assert.equal(s.controls.active,false);s.controls.dispose();
});
test('choosing keyboard while capture is pending rejects late permission success',()=>{
 const s=setup(()=>undefined);s.controls.enter('capture');s.controls.enter('keyboard');s.document.pointerLockElement=s.canvas;s.document.fire('pointerlockchange');
 assert.equal(s.controls.mode,'keyboard');assert.equal(s.controls.active,true);assert.equal(s.document.pointerLockElement,null);s.controls.dispose();
});

test('captured mode is truthful and cannot consume mouse deltas after capture silently disappears',()=>{const s=setup(({canvas,document})=>{document.pointerLockElement=canvas;document.fire('pointerlockchange');});s.controls.enter('capture');assert.equal(s.controls.captured,true);for(let i=0;i<20;i++)s.document.fire('mousemove',{movementX:1000,movementY:0});assert.equal(s.looks.reduce((n,p)=>n+p[0],0),20000);s.document.pointerLockElement=null;assert.equal(s.controls.captured,false);s.document.fire('mousemove',{movementX:1000,movementY:0});assert.equal(s.looks.length,20);s.controls.update(1/60);assert.equal(s.controls.active,false);assert.equal(s.pauses,1);s.controls.dispose();});
test('a spurious locked activation cannot display a false captured state',()=>{const s=setup();s.controls.activate('locked');assert.equal(s.controls.mode,'hover');assert.equal(s.controls.captured,false);assert.ok(s.hints.every(text=>!text.startsWith('Mouse locked.')));s.controls.dispose();});

test('capture diagnostics distinguish missing API, rejection and timeout without falsely claiming capture',async()=>{
 const missing=setup();missing.controls.enter();assert.equal(missing.controls.captureStatus.reason,'unsupported');assert.equal(missing.controls.captureStatus.supported,false);missing.controls.dispose();
 const error=Object.assign(new Error('User gesture was denied'),{name:'NotAllowedError'}),denied=setup(()=>Promise.reject(error));denied.document.defaultView={navigator:{userActivation:{isActive:true,hasBeenActive:true}}};denied.controls.enter();await Promise.resolve();const detail=denied.controls.captureStatus;assert.equal(detail.errorName,'NotAllowedError');assert.equal(detail.errorMessage,error.message);assert.equal(detail.userActivation.isActive,true);assert.equal(detail.actualLocked,false);detail.userActivation.isActive=false;assert.equal(denied.controls.captureStatus.userActivation.isActive,true);denied.controls.dispose();
 const silent=setup(()=>undefined);silent.controls.enter();await new Promise(r=>setTimeout(r,25));assert.equal(silent.controls.captureStatus.reason,'timeout');silent.controls.dispose();
});
test('late rejection refines a timed-out diagnostic but cannot overwrite a later keyboard choice',async()=>{
 let reject;const s=setup(()=>new Promise((_,r)=>reject=r));s.controls.enter();await new Promise(r=>setTimeout(r,25));reject(Object.assign(new Error('Policy refused'),{name:'SecurityError'}));await Promise.resolve();assert.equal(s.controls.captureStatus.errorName,'SecurityError');s.controls.enter('capture');s.controls.enter('keyboard');reject(new Error('old request'));await Promise.resolve();assert.equal(s.controls.mode,'keyboard');assert.equal(s.controls.captureStatus.state,'keyboard');s.controls.dispose();
});

test('opening pause preserves the last capture outcome for copyable diagnosis',async()=>{
 const s=setup(()=>undefined);s.controls.enter();await new Promise(r=>setTimeout(r,25));s.controls.suspend();
 assert.equal(s.controls.captureStatus.reason,'paused');assert.equal(s.controls.captureStatus.lastAttempt.reason,'timeout');assert.equal(s.controls.captureStatus.actualLocked,false);s.controls.dispose();
 const pending=setup(()=>undefined);pending.controls.enter();pending.controls.suspend();assert.equal(pending.controls.captureStatus.lastAttempt.state,'cancelled');pending.document.pointerLockElement=pending.canvas;pending.document.fire('pointerlockchange');assert.equal(pending.controls.captured,false);assert.equal(pending.document.pointerLockElement,null);pending.controls.dispose();
});

test('diagnostics distinguish raw browser grant, callback cancellation and late app-rejected grants',()=>{
 const records=[];const s=setup(({canvas,document})=>{document.pointerLockElement=canvas;document.fire('pointerlockchange');});s.controls.onDiagnostic=r=>records.push(r);s.controls.onChange=()=>s.controls.suspend('menu-open');s.controls.enter();
 assert.equal(records[0].event,'request');assert.ok(records.some(r=>r.event==='grant'&&r.actualLocked&&!r.controlsCaptured));assert.ok(records.some(r=>r.event==='release-requested'&&r.reason==='menu-open'&&r.actualLocked));assert.equal(s.controls.captured,false);
 s.document.pointerLockElement=s.canvas;s.document.fire('pointerlockchange');assert.ok(records.some(r=>r.event==='late-grant'&&r.actualLocked&&r.reason==='app-cancelled'));assert.equal(s.document.pointerLockElement,null);s.controls.dispose();
});
test('a fulfilled pointer-lock promise without an actual grant stays unconfirmed',async()=>{const s=setup(()=>Promise.resolve()),records=[];s.controls.onDiagnostic=r=>records.push(r);s.controls.enter();await Promise.resolve();assert.equal(s.controls.captured,false);assert.ok(records.some(r=>r.event==='resolved-unconfirmed'&&!r.actualLocked));s.controls.dispose();});
test('native release consumes its trailing Escape key but permits a deliberate later resume',()=>{const s=setup(({canvas,document})=>{document.pointerLockElement=canvas;document.fire('pointerlockchange');});s.controls.enter();s.document.exitPointerLock();assert.equal(s.controls.consumeReleaseGesture('Escape'),true);s.controls.releaseKey('Escape');assert.equal(s.controls.consumeReleaseGesture('Escape'),false);s.controls.dispose();});

test('intentional release reports request separately from the observed unlocked element',()=>{const s=setup(({canvas,document})=>{document.pointerLockElement=canvas;document.fire('pointerlockchange');}),records=[];s.controls.onDiagnostic=r=>records.push(r);s.controls.enter();s.controls.suspend('tab');assert.ok(records.some(r=>r.event==='release-requested'&&r.actualLocked));assert.ok(records.some(r=>r.event==='released'&&!r.actualLocked&&!r.controlsCaptured));s.controls.dispose();});
test('a guarded click has a fresh clean report without mutating the real request lifecycle',()=>{const s=setup(()=>{throw Object.assign(new Error('blocked old request'),{name:'NotAllowedError'});}),records=[];s.controls.onDiagnostic=r=>records.push(r);s.controls.enter();const original=s.controls.captureStatus;s.controls.guardedAttempt('player-not-alive');const guarded=records.at(-1);assert.equal(guarded.event,'guarded');assert.ok(guarded.attempt>original.attempt);assert.equal(guarded.errorName,'');assert.equal(guarded.errorMessage,'');assert.equal(s.controls.captureStatus.attempt,original.attempt);assert.equal(s.controls.captureStatus.errorName,'NotAllowedError');s.controls.dispose();});
