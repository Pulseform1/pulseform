import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CREATURE_FORMS,createCreature,disposeCreature,createLiveScareState,updateLiveScare} from '../public/creatures.js';
import {LIVE_SCARE_DURATION,LIVE_SCARE_IMPACT} from '../public/scare-presentation.js';
function signature(root){let sum=0;root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position,p=new THREE.Vector3();for(let i=0;i<a.count;i+=Math.max(1,Math.floor(a.count/31))){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);sum+=p.x*.31+p.y*.67+p.z*.43;}});return sum;}

test('all21 live attacks update actual mesh continuously at arbitrary times and replay exactly',()=>{
  for(const id of Object.keys(CREATURE_FORMS)){
    const root=createCreature(id),state=createLiveScareState(root,{aspect:16/9}),camera=state.cameraPosition,target=state.target;
    const atStart=signature(root),startPosition=camera.toArray();const values=[];
    for(const time of [.123,.127,.333,.337,.487,.493,.681,.685,1.099]){const out=updateLiveScare(root,state,time,16/9);assert.equal(out,state);assert.equal(state.cameraPosition,camera);assert.equal(state.target,target);assert.ok(Number.isFinite(signature(root)),id+' finite actual mesh');values.push(signature(root));for(const n of [...camera.toArray(),...target.toArray(),state.fov,state.near,state.far])assert.ok(Number.isFinite(n));}
    assert.ok(Math.abs(values[0]-values[1])>1e-5,id+' moves between arbitrary anticipation times');assert.ok(Math.abs(values[2]-values[3])>1e-5,id+' continuous lunge');assert.ok(Math.abs(values[6]-values[7])>1e-5,id+' continuous recoil');
    updateLiveScare(root,state,0,16/9);assert.ok(Math.abs(signature(root)-atStart)<1e-7,id+' repeated-run pose reset');assert.deepEqual(camera.toArray(),startPosition);assert.equal(state.done,false);assert.equal(state.duration,LIVE_SCARE_DURATION);assert.equal(state.impactAt,LIVE_SCARE_IMPACT);
    updateLiveScare(root,state,LIVE_SCARE_DURATION,9/16);assert.equal(state.done,true);disposeCreature(root);
  }
});

test('live playback reuses geometry, attributes, pooled vectors and cached camera frames without bounds calls',()=>{
  const root=createCreature('gutter'),state=createLiveScareState(root),objects=[];root.traverse(o=>{if(o.geometry)objects.push([o,o.geometry,o.geometry.attributes.position.array]);});const poolLength=root.userData.vectorPool.length,frames=state.frames;
  const original=THREE.Box3.prototype.setFromObject;let calls=0;THREE.Box3.prototype.setFromObject=function(...args){calls++;return original.apply(this,args);};
  try{for(let i=0;i<180;i++)updateLiveScare(root,state,i/120);}finally{THREE.Box3.prototype.setFromObject=original;}
  assert.equal(calls,0);assert.equal(state.frames,frames);assert.equal(root.userData.vectorPool.length,poolLength);for(const [o,g,a]of objects){assert.equal(o.geometry,g);assert.equal(g.attributes.position.array,a);}disposeCreature(root);
});

function focalProjection(root,shot){
  const camera=new THREE.PerspectiveCamera(shot.fov,16/9,shot.near,shot.far);camera.position.copy(shot.cameraPosition);camera.lookAt(shot.target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  const focus=shot.focalAnatomy,v=new THREE.Vector3(),bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minDepth:Infinity};
  focus.traverseVisible(o=>{if(!o.isMesh)return;for(let i=0;i<o.geometry.attributes.position.count;i++){o.getVertexPosition(i,v).applyMatrix4(o.matrixWorld);const z=v.clone().applyMatrix4(camera.matrixWorldInverse).z;bounds.minDepth=Math.min(bounds.minDepth,-z);v.project(camera);bounds.minX=Math.min(bounds.minX,v.x);bounds.maxX=Math.max(bounds.maxX,v.x);bounds.minY=Math.min(bounds.minY,v.y);bounds.maxY=Math.max(bounds.maxY,v.y);}});
  const isFocal=o=>{for(;o;o=o.parent)if(o===focus)return true;return false;};
  const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(),camera);const centerHit=ray.intersectObject(root,true)[0];let focalSamples=0;
  for(let y=0;y<9;y++)for(let x=0;x<9;x++){ray.setFromCamera(new THREE.Vector2(bounds.minX+(bounds.maxX-bounds.minX)*(x+.5)/9,bounds.minY+(bounds.maxY-bounds.minY)*(y+.5)/9),camera);const hit=ray.intersectObject(root,true)[0];if(hit&&isFocal(hit.object)){assert.ok(hit.distance>camera.near,'camera outside visible focal surface');focalSamples++;}}
  return{...bounds,height:(bounds.maxY-bounds.minY)/2,width:(bounds.maxX-bounds.minX)/2,centerVisible:isFocal(centerHit?.object),focalSamples};
}

test('live impact frames actual focal anatomy up close without mouth occlusion or near clipping',()=>{
  for(const id of Object.keys(CREATURE_FORMS)){
    const root=createCreature(id),state=createLiveScareState(root,{aspect:16/9}),focus=state.focalAnatomy;updateLiveScare(root,state,LIVE_SCARE_IMPACT,16/9);const actual=focalProjection(root,state);
    assert.equal(state.focalAnatomy,focus);assert.ok(actual.minDepth>state.near+.08,id+' actual focal vertices remain in front of near plane');assert.ok(actual.height>=.60,id+' close actual anatomy coverage: '+actual.height);assert.ok(actual.focalSamples>0,id+' actual feature visible through model');
    if(['raker','urchin','hermit'].includes(id))assert.ok(actual.centerVisible,id+' focal center must hit mouth/pincer before body shell');
    if(id==='hermit')assert.ok(actual.height>=.74&&actual.width>=.28,'pincer fills attack composition');
    if(id==='knot')assert.ok(actual.height>=.80&&actual.width>=.43,'open ring frames the view');
    if(['raker','urchin'].includes(id)){for(const t of [.22,.27,.32]){updateLiveScare(root,state,t,16/9);assert.ok(focalProjection(root,state).centerVisible,id+' mouth remains exposed throughout impact at '+t);}}
    disposeCreature(root);
  }
});

test('immediate waterline reveal, 150ms rush and recoil leave room around the actual rig',()=>{
  const camera=new THREE.PerspectiveCamera(),ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
  for(const id of Object.keys(CREATURE_FORMS)){
    const root=createCreature(id),state=createLiveScareState(root,{aspect:16/9}),setupY=root.position.y;
    assert.ok(state.duration<=1.2);assert.ok(state.impactAt<=.25);assert.equal(state.phase,'anticipation');assert.ok(state.clipY>new THREE.Box3().setFromObject(root).min.y,'starts at a genuine waterline');assert.ok(state.waterOpacity>0&&state.waterOpacity<.3);
    updateLiveScare(root,state,.035,16/9);assert.equal(state.phase,'breach');const setup=focalProjection(root,state).height;
    updateLiveScare(root,state,.16,16/9);assert.equal(state.phase,'lunge');assert.ok(root.position.y-state.rootTranslation.y>setupY+.3,id+' physically breaches upward before the forward dive');
    updateLiveScare(root,state,LIVE_SCARE_IMPACT,16/9);assert.equal(state.phase,'impact');assert.ok(focalProjection(root,state).height>setup*(id==='crown'?1.6:1.8),id+' sudden focal expansion');assert.equal(state.waterOpacity,0);assert.ok(state.clipY<new THREE.Box3().setFromObject(root).min.y,'strike emerges completely');
    for(const t of [0,.035,.78,1.08]){updateLiveScare(root,state,t,16/9);camera.position.copy(state.cameraPosition);camera.fov=state.fov;camera.aspect=16/9;camera.near=state.near;camera.far=state.far;camera.lookAt(state.target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);let clear=0;
      for(const x of [-.94,0,.94])for(const y of [-.94,.94]){ray.setFromCamera(ndc.set(x,y),camera);if(!ray.intersectObject(root,true).length)clear++;}assert.ok(clear>=5,`${id} leaves room border visible at ${t}: ${clear}/6`);
    }
    disposeCreature(root);
  }
});

test('strikes expose real eyes and preserve focal near-plane clearance throughout the rush and recoil',()=>{
  const camera=new THREE.PerspectiveCamera(),ray=new THREE.Raycaster(),v=new THREE.Vector3(),ndc=new THREE.Vector2();
  const cameraFor=shot=>{camera.position.copy(shot.cameraPosition);camera.fov=shot.fov;camera.aspect=16/9;camera.near=shot.near;camera.far=shot.far;camera.lookAt(shot.target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);};
  for(const id of Object.keys(CREATURE_FORMS)){
    const root=createCreature(id),state=createLiveScareState(root,{aspect:16/9});
    for(let t=.07;t<.56;t+=.02){updateLiveScare(root,state,t,16/9);cameraFor(state);state.focalAnatomy.traverseVisible(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){o.getVertexPosition(i,v).applyMatrix4(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse);assert.ok(-v.z>state.near+.08,`${id} focal near plane at ${t}`);}});}
    updateLiveScare(root,state,LIVE_SCARE_IMPACT,16/9);cameraFor(state);let eyes=0,visible=0;
    root.traverse(o=>{if(o.name!=='eye')return;eyes++;o.getWorldPosition(v).project(camera);if(Math.abs(v.x)>1||Math.abs(v.y)>1)return;ray.setFromCamera(ndc.set(v.x,v.y),camera);if(ray.intersectObject(root,true)[0]?.object===o)visible++;});
    if(eyes)assert.ok(visible>0,id+' has an unobstructed actual-eye ray');disposeCreature(root);
  }
});

test('three rapid attack paths physically advance the killer under one stationary lens and replay on the same rig',()=>{
  for(const id of Object.keys(CREATURE_FORMS)){
    const root=createCreature(id),paths=[];let geometryCount;
    for(const variant of [0,1,2,0]){
      const state=createLiveScareState(root,{aspect:16/9,variant}),start=root.position.clone(),camera=state.cameraPosition.clone(),frames=state.frames,resources=[];
      root.traverse(o=>{if(o.geometry)resources.push([o,o.geometry,o.geometry.attributes.position.array]);});geometryCount??=resources.length;assert.equal(resources.length,geometryCount,id+' switching attack does not rebuild anatomy');
      updateLiveScare(root,state,.07,16/9);const approach=root.position.clone();updateLiveScare(root,state,LIVE_SCARE_IMPACT,16/9);
      assert.equal(state.phase,'impact');assert.equal(state.fov,52);assert.deepEqual(state.cameraPosition.toArray(),camera.toArray(),id+' stationary camera');assert.ok(root.position.distanceTo(start)>.6,id+' actual source body travels toward player');
      assert.equal(state.frames,frames);for(const[o,g,a]of resources){assert.equal(o.geometry,g);assert.equal(g.attributes.position.array,a);}
      paths.push({start:start.toArray(),approach:approach.toArray(),impact:root.position.toArray()});updateLiveScare(root,state,0,16/9);assert.deepEqual(root.position.toArray(),start.toArray(),id+' restart removes previous translation');
    }
    assert.notDeepEqual(paths[0].start,paths[1].start,id+' lateral approach differs');assert.notDeepEqual(paths[1].approach,paths[2].approach,id+' low approach differs');assert.deepEqual(paths[0],paths[3],id+' native reused rig exactly replays prior variant');disposeCreature(root);
  }
});

test('cinematic mouth inserts have true recesses and scaled hooks without changing untouched native models',()=>{
  for(const id of Object.keys(CREATURE_FORMS)){
    const native=createCreature(id),attack=createCreature(id),before=signature(native);createLiveScareState(attack);let throats=0;
    native.traverse(o=>assert.notEqual(o.name,'recessed-muscular-throat'));
    attack.traverse(o=>{if(o.name!=='recessed-muscular-throat')return;throats++;o.geometry.computeBoundingBox();const depth=o.geometry.boundingBox.max.z-o.geometry.boundingBox.min.z;assert.ok(depth>.05,id+' real recessed mouth geometry');assert.ok(o.parent.userData.throatDepth>0);assert.ok(o.geometry.attributes.color,'throat darkens inward');let front=0,back=0;for(const child of o.parent.children){if(child.name==='outer-hooked-tooth')front++;if(child.name==='inner-hooked-tooth')back++;}assert.equal(front,back,id+' staggered tooth rows');assert.equal(front,o.parent.userData.toothCount);});
    assert.equal(signature(native),before,id+' original native geometry unchanged');if(native.getObjectByName('mouth'))assert.ok(throats>0,id+' actual mouth upgraded');disposeCreature(native);disposeCreature(attack);
  }
});

test('every killer and approach leaves actual room rays open at the fast contact',()=>{
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),camera=new THREE.PerspectiveCamera();
  for(const id of Object.keys(CREATURE_FORMS)){
    const root=createCreature(id);
    for(const variant of [0,1,2]){
      const state=createLiveScareState(root,{aspect:16/9,variant});updateLiveScare(root,state,LIVE_SCARE_IMPACT,16/9);camera.position.copy(state.cameraPosition);camera.fov=state.fov;camera.aspect=16/9;camera.near=state.near;camera.far=state.far;camera.lookAt(state.target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);let clear=0,outerClear=0,outer=0;
      for(let y=0;y<8;y++)for(let x=0;x<12;x++){
        ndc.set((x+.5)/12*2-1,(y+.5)/8*2-1);ray.setFromCamera(ndc,camera);const blocked=ray.intersectObject(root,true).some(hit=>hit.point.y>=state.clipY&&hit.object.material.opacity>.3);if(!blocked)clear++;if(Math.abs(ndc.x)>.65||Math.abs(ndc.y)>.65){outer++;if(!blocked)outerClear++;}
      }
      assert.ok(clear/96>=.12,`${id}/${variant} actual room occupies open screen rays: ${clear}/96`);assert.ok(outerClear/outer>=.16,`${id}/${variant} room remains around impact periphery: ${outerClear}/${outer}`);
    }
    disposeCreature(root);
  }
});
