import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const start=source.indexOf("window.addEventListener('keydown',e=>{"),end=source.indexOf("window.addEventListener('keyup'",start);
function handler(){
 let keydown,pauses=0,resumes=0,skips=0,selection=null,focus=null;
 const cards=[0,1,2].map(i=>({focus(){focus=i;},click(){selection=i;}}));
 const context={screen:'playing',controls:{active:true},showingScare:false,localPlayer:()=>({alive:true}),keys:new Set(),keyboardLook:{reset(){}},mousePitch:0,mouseYaw:0,document:{activeElement:null},hud:{querySelectorAll:()=>[]},nextFocus:()=>null};
 context.window={addEventListener:(name,fn)=>{if(name==='keydown')keydown=fn;}};
 context.pause=()=>{pauses++;context.screen='pause';context.controls.active=false;};
 context.clearScare=()=>{skips++;context.showingScare=false;};
 context.app={querySelector:s=>s.includes('resume')?{click(){resumes++;context.screen='playing';context.controls.active=true;}}:null,querySelectorAll:()=>cards};
 context.$=()=>({focus(){}});vm.runInNewContext(source.slice(start,end),context);
 const key=(code,repeat=false,tagName='CANVAS')=>{let prevented=false;keydown({code,repeat,target:{tagName},preventDefault(){prevented=true;}});return prevented;};
 return{key,context,get pauses(){return pauses;},get resumes(){return resumes;},get skips(){return skips;},get selection(){return selection;},get focus(){return focus;}};
}
test('actual app Escape/Tab actions are edge-triggered rather than repeat toggles',()=>{
 const s=handler();assert.equal(s.key('Escape'),true);assert.equal(s.context.screen,'pause');
 for(let i=0;i<5;i++)assert.equal(s.key('Escape',true),true);assert.equal(s.pauses,1);assert.equal(s.resumes,0);
 s.key('Escape');assert.equal(s.resumes,0);s.context.screen='playing';s.context.controls.active=true;s.key('Tab');s.key('Tab',true);assert.equal(s.pauses,2);assert.equal(s.context.screen,'pause');
});
test('held jump cannot skip a newly confirmed death but fresh Space immediately can',()=>{
 const s=handler();s.context.showingScare=true;s.key('Space',true);assert.equal(s.skips,0);s.key('Space');assert.equal(s.skips,1);
});
test('actual numeric card selection focuses its selected card and leaves text input untouched',()=>{
 const s=handler();s.context.screen='voting';s.context.controls.active=false;s.key('Digit2');assert.equal(s.selection,1);assert.equal(s.focus,1);
 s.key('Digit3',false,'INPUT');assert.equal(s.selection,1);
});
test('actual keyboard gameplay prevents arrow scroll and supports edge-triggered turns/leveling',()=>{
 const s=handler();assert.equal(s.key('ArrowLeft'),true);assert.ok(s.context.keys.has('ArrowLeft'));
 s.key('KeyE');const yaw=s.context.mouseYaw;s.key('KeyE',true);assert.equal(s.context.mouseYaw,yaw);assert.equal(yaw,-Math.PI/4);
 s.context.mousePitch=1;s.key('KeyC');assert.equal(s.context.mousePitch,0);
});

test('actual trusted canvas click retries genuine capture even after stored keyboard or drag mode',()=>{let handler;const a=source.indexOf("canvas.addEventListener('click',e=>{"),b=source.indexOf('\n\nfunction predictionWorld',a);for(const mode of ['keyboard','drag','hover']){const calls=[],context={screen:'playing',settings:{lookMode:mode},localPlayer:()=>({alive:true}),menuOpen:false,controls:{pending:false,captured:false},storage:{set(){}},lock:value=>calls.push(value),canvas:{addEventListener:(name,fn)=>{handler=fn;}}};vm.runInNewContext(source.slice(a,b),context);handler({detail:1});assert.deepEqual(calls,['capture']);assert.equal(context.settings.lookMode,'capture');calls.length=0;handler({detail:0});assert.deepEqual(calls,[]);}});

test('Tab releases a pending capture and remains native on the paused menu',()=>{
 const s=handler();s.context.controls.active=false;s.context.controls.pending=true;
 assert.equal(s.key('Tab'),true);assert.equal(s.pauses,1);assert.equal(s.context.screen,'pause');
 assert.equal(s.key('Tab'),false);assert.equal(s.pauses,1);assert.equal(s.key('Tab',true),true);assert.equal(s.resumes,0);
});

test('native release before Escape keydown does not resume from the pause menu',()=>{const s=handler();s.context.screen='pause';s.context.controls.active=false;let pending=true;s.context.controls.consumeReleaseGesture=code=>code==='Escape'&&pending?(pending=false,true):false;s.key('Escape');assert.equal(s.resumes,0);s.key('Escape');assert.equal(s.resumes,0);});

test('physical play-area click after Escape explicitly requests capture while Escape alone never does',()=>{let handler;const a=source.indexOf("canvas.addEventListener('click',e=>{"),b=source.indexOf('\n\nfunction predictionWorld',a),calls=[],context={screen:'pause',settings:{lookMode:'keyboard'},localPlayer:()=>({alive:true}),menuOpen:true,controls:{pending:false,captured:false},storage:{set(){}},lock:value=>calls.push(value),canvas:{addEventListener:(name,fn)=>{handler=fn;}}};vm.runInNewContext(source.slice(a,b),context);handler({detail:1});assert.equal(context.screen,'playing');assert.equal(context.menuOpen,false);assert.deepEqual(calls,['capture']);});
