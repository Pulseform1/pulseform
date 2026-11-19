import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import * as THREE from 'three';
const counters={created:0,disposed:0,prepared:0};
globalThis.ScareTestCreatures={createCreature(id){counters.created++;const root=new THREE.Group();root.userData.id=id;root.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()));return root;},disposeCreature(root){counters.disposed++;root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});},createLiveScareState(root,{aspect,variant=0}={}){counters.prepared++;return{baseAspect:aspect,variant,cameraPosition:new THREE.Vector3(0,1,-4),target:new THREE.Vector3(),fov:50,impactAt:.48,duration:1.4,phase:'anticipation'};},updateLiveScare(root,state,t){root.rotation.y=t*.2;state.cameraPosition.z=-4+t*2;state.phase=t<.48?'anticipation':t<.73?'impact':'recoil';return state;}};
let source=await readFile(new URL('../public/live-scare.js',import.meta.url),'utf8');source=source.replace("'three'",JSON.stringify(pathToFileURL(fileURLToPath(new URL('../node_modules/three/build/three.module.js',import.meta.url))).href)).replace("import * as Creatures from './creatures.js';",'const Creatures=globalThis.ScareTestCreatures;');
const {LiveScareStage}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function existingRenderer(){return{shadowMap:{enabled:true},toneMappingExposure:.88,calls:[],render(scene,camera){this.calls.push({scene,position:camera.position.clone()});}};}
test('live attack draws through the existing renderer and only retains the selected rig',()=>{const renderer=existingRenderer(),s=new LiveScareStage(renderer),before=counters.created;s.prepare('crown',1.6);s.prepare('crown',1.6);assert.equal(counters.created-before,1);assert.equal(s.begin('other'),false);assert.equal(s.begin('crown'),true);const first=renderer.calls.at(-1).position.clone();s.render(.51,1.6,true);assert.notDeepEqual(renderer.calls.at(-1).position.toArray(),first.toArray());assert.ok(renderer.calls.every(c=>c.scene===s.scene));assert.equal(renderer.shadowMap.enabled,false);s.end();assert.equal(renderer.shadowMap.enabled,true);assert.equal(renderer.toneMappingExposure,.88);const disposed=counters.disposed;s.prepare('siphon');assert.equal(counters.disposed-disposed,1);assert.equal(s.id,'siphon');s.dispose();assert.equal(s.model,null);assert.equal(s.active,false);});
test('skip/replacement restores render settings and an inactive stage cannot render again',()=>{const r=existingRenderer(),s=new LiveScareStage(r);s.prepare('a');s.begin('a');s.render(.52,1.4);s.end();const count=r.calls.length;assert.equal(s.render(.6,1.4),null);assert.equal(r.calls.length,count);s.begin('a');s.prepare('b');assert.equal(s.active,false);assert.equal(r.toneMappingExposure,.88);assert.equal(r.shadowMap.enabled,true);s.dispose();});

function backdropRenderer(){
  return{...existingRenderer(),autoClear:true,toneMapping:THREE.ACESFilmicToneMapping,target:null,viewport:new THREE.Vector4(3,4,1920,1080),scissor:new THREE.Vector4(5,6,1700,900),scissorTest:true,depthClears:0,extensions:{has:()=>true},
    getRenderTarget(){return this.target;},setRenderTarget(t){this.target=t;},getViewport(v){return v.copy(this.viewport);},setViewport(x,y,z,w){if(x.isVector4)this.viewport.copy(x);else this.viewport.set(x,y,z,w);},getScissor(v){return v.copy(this.scissor);},setScissor(v){this.scissor.copy(v);},getScissorTest(){return this.scissorTest;},setScissorTest(v){this.scissorTest=v;},getDrawingBufferSize(v){return v.set(1920,1080);},clearDepth(){this.depthClears++;},
    render(scene,camera){this.calls.push({scene,camera,position:camera.position.clone(),target:this.target,exposure:this.toneMappingExposure,toneMapping:this.toneMapping,autoClear:this.autoClear,hidden:scene.children.map(o=>[o,o.visible])});if(this.fail?.(scene,this.target))throw new Error('render failure');}
  };
}
function realRoom(){const scene=new THREE.Scene(),actor=new THREE.Group(),alreadyHidden=new THREE.Group(),camera=new THREE.PerspectiveCamera(67,16/9,.1,100);actor.name='world-creature';alreadyHidden.visible=false;scene.add(actor,alreadyHidden,new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial()));camera.position.set(3,1.62,-18);camera.rotation.y=.6;return{scene,camera,hide:[actor,alreadyHidden],actor,alreadyHidden};}

test('death location is captured once in linear HDR and composited behind every actual attack frame',()=>{
  const r=backdropRenderer(),s=new LiveScareStage(r),world=realRoom(),viewport=r.viewport.clone(),scissor=r.scissor.clone();s.prepare('a',16/9);assert.equal(s.begin('a',16/9,world),true);
  const target=s.backdrop;let disposed=0;target.addEventListener('dispose',()=>disposed++);
  assert.equal(s.backdropMode,'captured');assert.equal(target.width,1280);assert.equal(target.height,720);assert.equal(target.texture.type,THREE.HalfFloatType);assert.equal(target.texture.colorSpace,THREE.LinearSRGBColorSpace);
  const capture=r.calls[0];assert.equal(capture.scene,world.scene);assert.notEqual(capture.camera,world.camera);assert.deepEqual(capture.position.toArray(),world.camera.position.toArray());assert.equal(capture.target,target);assert.equal(capture.toneMapping,THREE.NoToneMapping);assert.equal(capture.hidden.find(([o])=>o===world.actor)[1],false);assert.equal(world.actor.visible,true);assert.equal(world.alreadyHidden.visible,false);
  assert.equal(r.target,null);assert.deepEqual(r.viewport.toArray(),viewport.toArray());assert.deepEqual(r.scissor.toArray(),scissor.toArray());assert.equal(r.scissorTest,true);
  world.camera.position.x=99;for(const t of [.21,.5,.8,1.3])s.render(t,16/9,true);
  assert.equal(r.calls.filter(c=>c.scene===world.scene).length,1,'world is not rendered again during retained backdrop');
  for(let i=1;i<r.calls.length;i+=2){const background=r.calls[i],creature=r.calls[i+1];assert.equal(background.scene,s.backdropScene);assert.equal(background.exposure,.88);assert.equal(background.toneMapping,THREE.ACESFilmicToneMapping);assert.equal(background.autoClear,true);assert.equal(creature.scene,s.scene);assert.equal(creature.autoClear,false);assert.equal(s.scene.background,null);}
  assert.equal(r.depthClears,5);assert.equal(s.backdropMaterial.toneMapped,true);assert.equal(s.backdropMaterial.map,target.texture);assert.equal(r.autoClear,true);
  s.end();assert.equal(disposed,1);assert.equal(s.backdrop,null);assert.equal(s.world,null);assert.equal(s.backdropMaterial.map,null);assert.equal(r.toneMappingExposure,.88);assert.equal(r.toneMapping,THREE.ACESFilmicToneMapping);assert.equal(r.shadowMap.enabled,true);s.end();assert.equal(disposed,1);s.dispose();
});

test('capture failure preserves actual room fallback, visibility and renderer state, then retries cleanly',()=>{
  const r=backdropRenderer(),s=new LiveScareStage(r),world=realRoom();let failedTarget,disposed=0;r.fail=(scene,target)=>{if(target){failedTarget=target;target.addEventListener('dispose',()=>disposed++);return true;}return false;};s.prepare('a');assert.equal(s.begin('a',16/9,world),true);
  assert.ok(failedTarget);assert.equal(disposed,1);assert.equal(s.backdropMode,'live');assert.match(s.captureError,/render failure/);assert.equal(world.actor.visible,true);assert.equal(world.alreadyHidden.visible,false);assert.equal(r.target,null);
  s.render(.5,16/9);assert.equal(r.calls.at(-2).scene,world.scene);assert.equal(r.calls.at(-2).target,null);assert.equal(r.calls.at(-1).scene,s.scene);s.end();assert.equal(r.autoClear,true);assert.equal(r.toneMappingExposure,.88);
  r.fail=null;assert.equal(s.begin('a',16/9,world),true);assert.equal(s.backdropMode,'captured');assert.equal(s.captureError,null);s.dispose();
});

test('foreground failure or skip frees retained image and disposed stage can prepare a later run',()=>{
  const r=backdropRenderer(),s=new LiveScareStage(r),world=realRoom();s.prepare('a');s.begin('a',16/9,world);let freed=0;s.backdrop.addEventListener('dispose',()=>freed++);r.fail=scene=>scene===s.scene;assert.throws(()=>s.render(.5,16/9),/render failure/);assert.equal(freed,1);assert.equal(s.active,false);assert.equal(world.actor.visible,true);assert.equal(r.autoClear,true);assert.equal(r.shadowMap.enabled,true);assert.equal(r.toneMappingExposure,.88);
  r.fail=null;s.dispose();s.prepare('b');s.begin('b',16/9,world);assert.equal(s.backdropMode,'captured');assert.ok(s.backdropQuad);s.dispose();
});

test('retained death camera preserves a parented first-person view and never follows later camera motion',()=>{
  const r=backdropRenderer(),s=new LiveScareStage(r),world=realRoom(),parent=new THREE.Group();parent.position.set(10,2,3);parent.rotation.y=.8;parent.add(world.camera);s.prepare('a');s.begin('a',16/9,world);world.camera.updateWorldMatrix(true,false);const expected=world.camera.matrixWorld.clone();assert.ok(s.world.camera.matrixWorld.elements.every((v,i)=>Math.abs(v-expected.elements[i])<1e-12));const captured=s.world.camera.matrixWorld.clone();parent.position.x+=20;world.camera.rotation.y+=1;world.camera.updateWorldMatrix(true,false);s.render(.5,16/9);assert.deepEqual(s.world.camera.matrixWorld.elements,captured.elements);s.dispose();
});

test('missing HDR render support uses real poolrooms directly without allocating a retained target',()=>{
  const r=backdropRenderer(),s=new LiveScareStage(r),world=realRoom();r.extensions.has=()=>false;s.prepare('a');s.begin('a',16/9,world);assert.equal(s.backdrop,null);assert.equal(s.backdropMode,'live');assert.match(s.captureError,/HDR backdrop capture unavailable/);assert.ok(r.calls.every(call=>call.target===null));assert.equal(r.calls[0].scene,world.scene);assert.equal(world.actor.visible,true);s.dispose();
});

test('capture viewport uses target pixels at fractional and high renderer pixel ratios',()=>{
  for(const pixelRatio of [.76,1.5]){
    const r=backdropRenderer(),s=new LiveScareStage(r),world=realRoom(),gpuViewport=new THREE.Vector4();
    const setViewport=r.setViewport,render=r.render;
    // Match installed Three.js: setViewport scales logical pixels, whereas
    // setRenderTarget applies the target's physical-pixel viewport directly.
    r.setViewport=function(...args){setViewport.apply(this,args);gpuViewport.copy(this.viewport).multiplyScalar(pixelRatio).round();};
    r.setRenderTarget=function(target){this.target=target;if(target)gpuViewport.copy(target.viewport);else gpuViewport.copy(this.viewport).multiplyScalar(pixelRatio).floor();};
    r.getDrawingBufferSize=v=>v.set(Math.floor(1920*pixelRatio),Math.floor(1080*pixelRatio));
    r.render=function(scene,camera){render.call(this,scene,camera);this.calls.at(-1).gpuViewport=gpuViewport.clone();};
    s.prepare('a');s.begin('a',16/9,world);const capture=r.calls[0];assert.deepEqual(capture.gpuViewport.toArray(),[0,0,s.backdrop.width,s.backdrop.height]);
    assert.deepEqual(gpuViewport.toArray(),r.viewport.clone().multiplyScalar(pixelRatio).floor().toArray());assert.equal(s.backdropMode,'captured');s.end();assert.equal(s.world,null);assert.equal(world.actor.visible,true);s.dispose();
  }
});

test('waterline breach clips only the selected rig and restores clipping and transient water resources',()=>{
  const r=backdropRenderer();r.localClippingEnabled=false;const s=new LiveScareStage(r),world=realRoom();s.prepare('a');
  const modelMesh=s.model.children[0];assert.deepEqual(modelMesh.material.clippingPlanes,[s.waterPlane]);assert.equal(world.scene.children.at(-1).material.clippingPlanes,null);
  s.begin('a',16/9,world);Object.assign(s.motion,{clipY:.62,waterY:.62,waterRadius:1.2,waterOpacity:.18,breach:.4});s.render(.4,16/9);
  assert.equal(s.waterPlane.constant,-.62);assert.equal(s.water.position.y,.62);assert.equal(s.water.visible,true);assert.equal(r.localClippingEnabled,true);assert.ok(s.drops.some(o=>o.position.y>.1));assert.equal(s.scene.background,null);
  const arrays=[s.wakeGeometry,s.dropGeometry,s.waterMaterial],disposed=arrays.map(()=>0);arrays.forEach((v,i)=>v.addEventListener('dispose',()=>disposed[i]++));
  s.end();assert.equal(r.localClippingEnabled,false);assert.equal(s.water.visible,false);s.dispose();assert.deepEqual(disposed,[1,1,1]);s.dispose();assert.deepEqual(disposed,[1,1,1]);s.prepare('b');assert.ok(s.water);assert.notEqual(s.wakeGeometry,arrays[0]);s.begin('b',16/9,world);s.dispose();assert.equal(r.localClippingEnabled,false);
});


test('same-killer variants reuse one rig, recache only on changes, and begin accepts a late variant',()=>{
  const renderer=existingRenderer(),stage=new LiveScareStage(renderer),created=counters.created;stage.prepare('a',16/9,{variant:0});const model=stage.model,prepared=counters.prepared;stage.prepare('a',16/9,{variant:0});assert.equal(counters.prepared,prepared);stage.prepare('a',16/9,{variant:1});assert.equal(stage.model,model);assert.equal(stage.motion.variant,1);assert.equal(counters.created,created+1);stage.begin('a',16/9,null,{variant:2});assert.equal(stage.motion.variant,2);stage.end();stage.prepare('a',16/9,{variant:0});assert.equal(stage.motion.variant,0);assert.equal(stage.model,model);stage.dispose();
});
