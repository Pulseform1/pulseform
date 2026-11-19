import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CREATURE_FORMS,createCreature,animateCreature,getPortraitFraming,disposeCreature,fitCreatureClearance,applyCreatureWorldScale} from '../public/creatures.js';
import {MONSTER_PHYSICS} from '../shared/simulation.js';

const ids=Object.keys(CREATURE_FORMS),exceptions=['dredge','gloomfin','leech'],quadrupeds=ids.filter(id=>!exceptions.includes(id)),V=(...a)=>new THREE.Vector3(...a);
function objects(root,pattern){const found=[];root.traverse(o=>{if(pattern.test(o.name))found.push(o);});return found;}
function cameraFor(root){const f=getPortraitFraming(root),c=new THREE.PerspectiveCamera(f.fov,f.aspect,f.near,f.far);c.position.copy(f.position);c.lookAt(f.center);c.updateMatrixWorld(true);return{f,c};}

// A CPU geometry-projection mask, ignoring every material/color. This is a
// structural silhouette check, not a WebGL screenshot or visual-quality claim.
function silhouette(root){
  const {c}=cameraFor(root),n=64,mask=new Uint8Array(n*n),point=V();
  root.traverse(o=>{
    if(!o.isMesh)return;const p=o.geometry.attributes.position,idx=o.geometry.index,projected=[];
    for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).project(c);projected.push([(point.x*.5+.5)*(n-1),(1-(point.y*.5+.5))*(n-1)]);}
    const length=idx?idx.count:p.count;
    for(let i=0;i<length;i+=3){
      const a=projected[idx?idx.getX(i):i],b=projected[idx?idx.getX(i+1):i+1],d=projected[idx?idx.getX(i+2):i+2];if(!a||!b||!d)continue;
      const lowX=Math.max(0,Math.floor(Math.min(a[0],b[0],d[0]))),highX=Math.min(n-1,Math.ceil(Math.max(a[0],b[0],d[0]))),lowY=Math.max(0,Math.floor(Math.min(a[1],b[1],d[1]))),highY=Math.min(n-1,Math.ceil(Math.max(a[1],b[1],d[1])));
      const cross=(p,q,x,y)=>(q[0]-p[0])*(y-p[1])-(q[1]-p[1])*(x-p[0]);
      for(let y=lowY;y<=highY;y++)for(let x=lowX;x<=highX;x++){const ca=cross(a,b,x+.5,y+.5),cb=cross(b,d,x+.5,y+.5),cc=cross(d,a,x+.5,y+.5);if((ca>=0&&cb>=0&&cc>=0)||(ca<=0&&cb<=0&&cc<=0))mask[y*n+x]=1;}
    }
  });return mask;
}
function vertexSignature(root){let total=0;root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,v=V();for(let i=0;i<p.count;i+=Math.max(1,Math.floor(p.count/13))){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);total+=v.x*.31+v.y*.73+v.z*.47;}});return total;}

test('exactly eighteen complete four-legged rigs retain twenty-one distinct signature anatomies',()=>{
  const roots=Object.fromEntries(ids.map(id=>[id,createCreature(id)]));
  assert.equal(ids.length,21);assert.equal(quadrupeds.length,18);
  for(const id of quadrupeds){const root=roots[id],d=root.userData;
    assert.equal(d.anatomy.walkingLegs,4,id);assert.equal(d.anatomy.floating,false,id);
    assert.equal(d.legs.length,4,id+' four independent articulated legs');assert.equal(objects(root,/^walking-leg-/).length,4,id+' four visible leg groups');
    assert.equal(new Set(d.legs.map(leg=>leg.group)).size,4,id+' no repeated references');
    assert.equal(objects(root,/^upper-segment$/).length,4,id+' four upper bones');assert.equal(objects(root,/^lower-segment$/).length,4,id+' four lower bones');
    assert.equal(objects(root,/^covered-joint$/).length,4,id+' four joint surfaces');assert.equal(objects(root,/^foot$/).length,4,id+' four feet');
    assert.equal(objects(root,/^load-bearing-shoulder$/).length,2,id+' forequarter mass');assert.equal(objects(root,/^load-bearing-haunch$/).length,2,id+' hindquarter mass');
    assert.equal(objects(root,/^girdle-tendon$/).length,4,id+' muscles connect limbs to torso');
    assert.equal(d.legs.filter(leg=>leg.front).length,2);assert.equal(d.legs.filter(leg=>!leg.front).length,2);
    for(const leg of d.legs){const upperSize=new THREE.Box3().setFromObject(leg.upper).getSize(V()),girdleSize=new THREE.Box3().setFromObject(leg.girdle).getSize(V());
      assert.ok(leg.upper.isMesh&&leg.lower.isMesh&&leg.joint.isMesh,id+' real linked mesh anatomy');
      assert.ok(leg.foot.getObjectByName('weight-bearing-pad')||leg.foot.getObjectByName('weight-bearing-fist'),id+' substantial foot support');
      assert.ok(girdleSize.x>.20&&girdleSize.y>.24,id+' substantial girdle geometry');assert.ok(upperSize.length()>.40,id+' functional limb length');
    }
  }
  for(const id of exceptions){assert.equal(objects(roots[id],/^walking-leg-|^radial-limb-/).length,0,id+' intentional non-quadruped');assert.equal(roots[id].userData.anatomy.walkingLegs,0);}
  const signature={dredge:'amorphous-body',wader:'narrow-ridged-torso',mirehound:'long-face',glassjaw:'hollow-hovering-bell',gloomfin:'continuous-serpent-body',hush:'six-lobed-disk',carapace:'hinged-lower-jaw',lantern:'inverted-lantern-face',leech:'suction-crown',knuckle:'shoulder-hump',crown:'fluted-bivalve-shell',siphon:'pitcher-organ',sawtooth:'wide-hammer-head',gutter:'crawler-segment-8',cradle:'hollow-rib-cradle',raker:'curled-nonwalking-thumb',knot:'unbroken-living-ring',drifter:'vertical-billowing-sail',hermit:'coiled-conch-shell',urchin:'upper-hemisphere',scissor:'foreleg-saw-tooth'};
  for(const [id,name]of Object.entries(signature))assert.ok(roots[id].getObjectByName(name),id+' preserved signature '+name);
  assert.equal(objects(roots.lantern,/^pectoral-wing-/).length,2);assert.equal(objects(roots.leech,/^annular-muscle-/).length,9);assert.equal(objects(roots.crown,/^hinged-shell-/).length,2);
  assert.equal(objects(roots.mirehound,/^arm-/).length,0,'old dangling arms retired');assert.equal(objects(roots.hush,/^radial-limb-/).length,0,'old six spokes retired');assert.equal(objects(roots.scissor,/^folding-foreclaw-/).length,0,'blades now belong to supporting forelegs');
  assert.equal(new Set(ids.map(id=>roots[id].userData.anatomy.bodyPlan)).size,21);
  Object.values(roots).forEach(disposeCreature);
});

test('geometry remains finite throughout each distinct locomotion and emergence pose',()=>{
  for(const id of ids){const root=createCreature(id);for(const state of ['patrol','pursue','windup','lunge','portrait'])for(const t of [0,.35,1.3]){
    animateCreature(root,t,state,.9);let vertices=0;
    root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,n=o.geometry.attributes.normal;vertices+=p.count;for(const value of p.array)assert.ok(Number.isFinite(value),`${id} position`);for(const value of n.array)assert.ok(Number.isFinite(value),`${id} normal`);});
    assert.ok(vertices>1500,id+' has complete geometry');const bounds=new THREE.Box3().setFromObject(root);assert.ok(bounds.min.isVector3&&Number.isFinite(bounds.max.y));
  }disposeCreature(root);}
});

test('supported bodies preserve broad, winged, long, flat and tall species proportions',()=>{
  const sizes={};for(const id of ids){const root=createCreature(id);animateCreature(root,.7,'portrait',0);sizes[id]=new THREE.Box3().setFromObject(root).getSize(V());disposeCreature(root);}
  assert.ok(sizes.dredge.x>sizes.mirehound.x*1.8,'blob remains much broader than stalker');
  assert.ok(sizes.gloomfin.z>sizes.gloomfin.x*4,'serpent retains continuous long body');
  assert.ok(sizes.lantern.x>sizes.lantern.y*2,'wing mantle remains a wide silhouette');
  assert.ok(sizes.hush.x>sizes.hush.y*1.6&&sizes.hush.z>sizes.hush.y*1.5,'disk remains broad and low');
  assert.ok(sizes.raker.x>sizes.raker.y*1.7,'palm remains flat over its finger legs');
  assert.ok(sizes.drifter.y>sizes.mirehound.y*1.4,'dorsal sail retains tall silhouette');
  assert.ok(sizes.gutter.z>sizes.gutter.y*2.3,'segmented back retains elongated silhouette');
});

test('portraits include complete posed bounds for all twenty-one body plans',()=>{
  for(const id of ids){const root=createCreature(id);animateCreature(root,.7,'portrait',0);const {f,c}=cameraFor(root);
    for(const x of [f.box.min.x,f.box.max.x])for(const y of [f.box.min.y,f.box.max.y])for(const z of [f.box.min.z,f.box.max.z]){const ndc=V(x,y,z).project(c);assert.ok(Math.abs(ndc.x)<.96&&Math.abs(ndc.y)<.96,`${id}: ${ndc.toArray()}`);assert.ok(ndc.z>-1&&ndc.z<1);}
    disposeCreature(root);
  }
});

test('grayscale projected silhouettes are not recolors of one shared body',t=>{
  const masks={};for(const id of ids){const root=createCreature(id);animateCreature(root,.7,'portrait',0);masks[id]=silhouette(root);disposeCreature(root);}
  let maximum=0,pair='';for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++){
    let intersection=0,union=0;for(let i=0;i<masks[ids[a]].length;i++){const x=masks[ids[a]][i],y=masks[ids[b]][i];intersection+=x&&y?1:0;union+=x||y?1:0;}const overlap=intersection/union;if(overlap>maximum){maximum=overlap;pair=ids[a]+'/'+ids[b];}assert.ok(overlap<.82,`${ids[a]} and ${ids[b]} silhouette overlap ${overlap}`);
  }t.diagnostic(`Largest pair silhouette overlap: ${(maximum*100).toFixed(1)}% (${pair}), material colors ignored`);
});

test('each locomotion changes the actual posed geometry without moving the authoritative root',()=>{
  for(const id of ids){const root=createCreature(id);root.position.set(7,2,-8);root.rotation.y=.4;animateCreature(root,0,'pursue',1);const before=vertexSignature(root);animateCreature(root,.6,'pursue',1);const after=vertexSignature(root);assert.ok(Math.abs(before-after)>.01,id+' has animated geometry');assert.deepEqual(root.position.toArray(),[7,2,-8]);assert.equal(root.rotation.y,.4);disposeCreature(root);}
});

test('all eighteen world quadrupeds carry their torso on four floor-level foot pads',()=>{
  for(const id of quadrupeds){const root=createCreature(id),profile=MONSTER_PHYSICS[id];applyCreatureWorldScale(root,profile);root.position.y=profile.surfaceY-root.userData.waterlineOffset;animateCreature(root,.4,'patrol',0,{distanceTravelled:0,availableRadius:profile.radius});
    for(const leg of root.userData.legs){const bounds=new THREE.Box3().setFromObject(leg.foot),hip=leg.girdle.getWorldPosition(V()),foot=leg.foot.getWorldPosition(V());
      assert.ok(bounds.min.y>=.02&&bounds.min.y<=.20,`${id} supported foot bottom ${bounds.min.y}`);assert.ok(hip.y>foot.y+.25,id+' torso rests above supporting limb');
      const footprint=bounds.getSize(V());assert.ok(footprint.x>.13&&footprint.z>.25,id+' weight-bearing pad and digits have real area');
    }disposeCreature(root);
  }
});

test('custom sweep and serpent triangles face outward instead of disappearing under backface culling',()=>{
  for(const id of ids){const root=createCreature(id);root.traverse(o=>{
    const info=o.geometry?.userData;if(!info?.surface)return;
    const p=o.geometry.attributes.position,n=o.geometry.attributes.normal,{rings,sectors}=info;let outward=0,total=0;
    for(let ring=1;ring<rings;ring+=3){const center=V();for(let j=0;j<sectors;j++)center.add(V().fromBufferAttribute(p,ring*(sectors+1)+j));center.multiplyScalar(1/sectors);
      for(let j=0;j<sectors;j++){const i=ring*(sectors+1)+j,radial=V().fromBufferAttribute(p,i).sub(center),normal=V().fromBufferAttribute(n,i);if(radial.dot(normal)>0)outward++;total++;}
    }
    assert.ok(outward/total>.90,`${id} ${o.name}: ${outward}/${total} outward normals`);
  });disposeCreature(root);}
});

test('full world emergence remains above floor and below ten-metre ceiling at authoritative lunge peak',()=>{
  for(const id of ids){const root=createCreature(id),profile=MONSTER_PHYSICS[id];applyCreatureWorldScale(root,profile);root.position.y=profile.surfaceY+1.65-root.userData.waterlineOffset;for(let t=0;t<2;t+=.1){animateCreature(root,t,'lunge',1.5,{availableRadius:profile.radius,trail:[{x:0,z:0}]});const bounds=new THREE.Box3().setFromObject(root);assert.ok(bounds.min.y>=0,`${id} lunge floor ${bounds.min.y}`);assert.ok(bounds.max.y<10,`${id} lunge ceiling ${bounds.max.y}`);}disposeCreature(root);}
});

test('fixed enlarged world forms fit authoritative cores in real floor and emergence poses',()=>{
  for(const id of ids.filter(id=>id!=='gloomfin')){
    const root=createCreature(id),profile=MONSTER_PHYSICS[id];applyCreatureWorldScale(root,profile);root.rotation.y=.71;
    for(const state of ['patrol','pursue','windup','lunge'])for(let time=0;time<6;time+=.13){
      const y=profile.surfaceY+Math.sin(time*1.8)*.025+(state==='lunge'?1.65:0)-root.userData.waterlineOffset;root.position.set(7,y,-3);
      animateCreature(root,time,state,1.5,{availableRadius:profile.radius});let maxRadius=0,top=-Infinity,floor=Infinity;
      root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position,p=V();for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);maxRadius=Math.max(maxRadius,Math.hypot(p.x-7,p.z+3));top=Math.max(top,p.y);floor=Math.min(floor,p.y);}});
      assert.ok(maxRadius<=profile.radius+.0001,`${id} ${state} radius ${maxRadius}>${profile.radius}`);assert.ok(top<10,`${id} ${state} ceiling ${top}`);assert.ok(floor>=0,`${id} ${state} floor ${floor}`);
      assert.deepEqual(root.position.toArray(),[7,y,-3]);assert.equal(root.rotation.y,.71);assert.deepEqual(root.scale.toArray(),[profile.worldScale,profile.worldYScale,profile.worldScale]);
    }
    fitCreatureClearance(root,.4);assert.equal(root.scale.x,profile.worldScale,'legacy fitter cannot shrink the fixed body');disposeCreature(root);
  }
});

function distanceToTrail(x,z,trail){
  let best=Infinity;for(let i=1;i<trail.length;i++){const a=trail[i-1],b=trail[i],dx=b.x-a.x,dz=b.z-a.z,u=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));best=Math.min(best,Math.hypot(x-a.x-u*dx,z-a.z-u*dz));}return best;
}

test('serpent body follows the validated bent world trail with a narrow collision corridor',()=>{
  const root=createCreature('gloomfin');root.position.set(7,1.2,-3);root.rotation.y=.81;
  const trail=[{x:7,z:-3},{x:7,z:-1},{x:10,z:-1},{x:10,z:2}];
  for(const state of ['patrol','windup','lunge']){
    animateCreature(root,.7,state,1.5,{trail,availableRadius:.4});const d=root.userData,a=d.body.geometry.attributes.position,p=V();
    for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(d.body.matrixWorld);assert.ok(distanceToTrail(p.x,p.z,trail)<=.35001,`body outside narrow trail: ${p.toArray()}`);}
    // The tail reaches the real last trail point instead of rotating as an8m rod.
    const center=V();for(let j=0;j<d.sectors;j++)center.add(V().fromBufferAttribute(a,d.rings*(d.sectors+1)+j).applyMatrix4(d.body.matrixWorld));center.multiplyScalar(1/d.sectors);assert.ok(Math.hypot(center.x-10,center.z-2)<.001);
    d.head.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);assert.ok(Math.hypot(p.x-7,p.z+3)<=.4001,`head outside center corridor ${Math.hypot(p.x-7,p.z+3)}`);}});
    assert.deepEqual(root.position.toArray(),[7,1.2,-3]);assert.equal(root.rotation.y,.81);assert.deepEqual(root.scale.toArray(),[1,1,1]);
  }disposeCreature(root);
});

test('empty and short serpent trails stay finite and do not invent a tail through nearby walls',()=>{
  const root=createCreature('gloomfin');root.position.set(2,1.2,-4);root.rotation.y=-.7;
  for(const trail of [[],[{x:2,z:-4}],[{x:2,z:-4},{x:2.12,z:-4.08}],[{x:NaN,z:5},{x:2,z:-4}]]){
    animateCreature(root,1.1,'lunge',1.2,{trail,availableRadius:.4});let extent=0;
    root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position,n=o.geometry.attributes.normal,p=V();for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);assert.ok(Number.isFinite(p.x+p.y+p.z));extent=Math.max(extent,Math.hypot(p.x-2,p.z+4));}for(const v of n.array)assert.ok(Number.isFinite(v));});
    assert.ok(extent<.56,`short-trail extent ${extent}`);
  }
  const native=createCreature('gloomfin');animateCreature(native,.7,'portrait',0);animateCreature(root,.7,'portrait',0,{trail:[],availableRadius:.4});root.position.set(0,0,0);root.rotation.set(0,0,0);root.updateMatrixWorld(true);
  assert.ok(Math.abs(vertexSignature(native)-vertexSignature(root))<.00001,'portrait/native pose is independent of gameplay trail');disposeCreature(root);disposeCreature(native);
});

test('server catch-up speed cannot drive rigs outside their bounded gait, including invalid speed input',()=>{
  for(const id of ids){const root=createCreature(id);animateCreature(root,.7,'lunge',1.5);const bounded=vertexSignature(root);animateCreature(root,.7,'lunge',4.5);assert.equal(vertexSignature(root),bounded,id+' speed clamps');animateCreature(root,.7,'lunge',NaN);assert.ok(Number.isFinite(vertexSignature(root)),id+' invalid speed stays finite');disposeCreature(root);}
});

test('added body plans use bounded mesh budgets and bivalve outer faces point outward',()=>{
  for(const id of ['carapace','lantern','leech','knuckle','crown']){
    const root=createCreature(id);let vertices=0;root.traverse(o=>{if(o.isMesh)vertices+=o.geometry.attributes.position.count;});assert.ok(vertices<15000,`${id} vertex budget ${vertices}`);
    if(id==='crown')root.traverse(o=>{if(o.name!=='fluted-bivalve-shell')return;const a=o.geometry.attributes.position,n=o.geometry.attributes.normal;let outward=0,total=0;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i)-1.18,z=a.getZ(i);if(Math.abs(x)<.11)continue;total++;if(x*n.getX(i)+y*n.getY(i)+z*n.getZ(i)>0)outward++;}assert.ok(outward/total>.95,'shell outward surface');});
    disposeCreature(root);
  }
});

test('all eighteen articulated quadrupeds show stance, lift, joint bending and stationary feet',()=>{
  for(const id of quadrupeds){
    const root=createCreature(id),legs=root.userData.legs,observed=legs.map(()=>({planted:0,swing:0,knees:[],footMin:Infinity,footMax:-Infinity}));
    for(let frame=0;frame<240;frame++){animateCreature(root,frame/40,'pursue',1.2);for(let i=0;i<legs.length;i++){const leg=legs[i],pose=leg.contactPose,o=observed[i];if(pose.planted){o.planted++;assert.equal(pose.lift,0);}else{o.swing++;assert.ok(pose.lift>=0&&pose.lift<=.15);}
      o.footMin=Math.min(o.footMin,leg.foot.position.y);o.footMax=Math.max(o.footMax,leg.foot.position.y);o.knees.push(leg.joint.position.clone());
      const hip=leg.hipPose,knee=leg.joint.position,foot=leg.foot.position,axis=foot.clone().sub(hip),along=knee.clone().sub(hip).dot(axis)/axis.lengthSq(),offAxis=knee.clone().sub(hip).addScaledVector(axis,-along).length();
      assert.ok(offAxis>.025,`${id} limb ${i} bends at a visible joint`);
      const upperStart=leg.upper.localToWorld(V(0,-.5,0)),upperEnd=leg.upper.localToWorld(V(0,.5,0)),lowerStart=leg.lower.localToWorld(V(0,-.5,0)),lowerEnd=leg.lower.localToWorld(V(0,.5,0));
      assert.ok(upperStart.distanceTo(leg.girdle.getWorldPosition(V()))<1e-7,id+' upper bone meets shoulder');assert.ok(upperEnd.distanceTo(leg.joint.getWorldPosition(V()))<1e-7,id+' upper bone meets joint');assert.ok(lowerStart.distanceTo(upperEnd)<1e-7,id+' linked bones meet');assert.ok(lowerEnd.distanceTo(leg.foot.getWorldPosition(V()))<1e-7,id+' lower bone meets foot');
    }}
    for(const o of observed){assert.ok(o.planted/(o.planted+o.swing)>.57,id+' majority stance');assert.ok(o.swing>10,id+' each limb has swing');assert.ok(o.footMax-o.footMin>.10,id+' actual lifted foot geometry');assert.ok(o.knees.some(knee=>knee.distanceTo(o.knees[0])>.10),id+' actual joint changes position');}
    animateCreature(root,7,'patrol',0);const stopped=legs.map(leg=>leg.foot.position.toArray());animateCreature(root,8,'patrol',0);assert.deepEqual(legs.map(leg=>leg.foot.position.toArray()),stopped,id+' feet stay planted while stationary');disposeCreature(root);
  }
});

test('articulated silhouettes stay inside fixed cores even when more passage space is available',()=>{
  for(const id of quadrupeds){const root=createCreature(id),profile=MONSTER_PHYSICS[id];applyCreatureWorldScale(root,profile);root.position.y=profile.surfaceY+1.65-root.userData.waterlineOffset;
    for(const availableRadius of [profile.radius,profile.radius*3])for(let frame=0;frame<20;frame++){animateCreature(root,frame*.07,'lunge',1.5,{availableRadius});let radius=0;root.traverse(o=>{if(!o.isMesh)return;const p=V(),a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);radius=Math.max(radius,Math.hypot(p.x,p.z));}});assert.ok(radius<=profile.radius+.0001,`${id} fixed appendage envelope ${radius}>${profile.radius}`);}
    assert.deepEqual(root.scale.toArray(),[profile.worldScale,profile.worldYScale,profile.worldScale]);assert.equal(root.userData.worldProfile.radius,profile.radius);disposeCreature(root);
  }
});

test('large world serpent follows sixteen metres of actual history and its head peeks above water',()=>{
  const root=createCreature('gloomfin'),profile=MONSTER_PHYSICS.gloomfin;applyCreatureWorldScale(root,profile);root.position.set(7,profile.surfaceY-root.userData.waterlineOffset,-3);root.rotation.y=.81;
  const trail=[{x:7,z:-3},{x:7,z:2},{x:13,z:2},{x:13,z:7}],context={trail,availableRadius:profile.radius};animateCreature(root,.7,'patrol',1.5,context);
  const d=root.userData,headBounds=new THREE.Box3().setFromObject(d.head);assert.ok(headBounds.max.y>profile.surfaceY&&headBounds.max.y<profile.surfaceY+.5,`real trail-mode skull top ${headBounds.max.y}`);
  const a=d.body.geometry.attributes.position,p=V(),center=V();for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(d.body.matrixWorld);assert.ok(distanceToTrail(p.x,p.z,trail)<profile.coreClearance,'wriggling body fits thick corridor');}
  for(let j=0;j<d.sectors;j++)center.add(V().fromBufferAttribute(a,d.rings*(d.sectors+1)+j).applyMatrix4(d.body.matrixWorld));center.multiplyScalar(1/d.sectors);assert.ok(Math.hypot(center.x-13,center.z-7)<.001,'scaled tail reaches16m history');
  d.head.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);assert.ok(Math.hypot(p.x-7,p.z+3)<=profile.radius,'large skull fits authoritative head core');}});
  root.position.y=profile.surfaceY+1.65-root.userData.waterlineOffset;animateCreature(root,1,'lunge',1.5,context);assert.ok(new THREE.Box3().setFromObject(root).max.y<10);disposeCreature(root);
});

test('fixed blob retains more than three metres of mass instead of shrinking to a water channel',()=>{
  const root=createCreature('dredge');applyCreatureWorldScale(root,MONSTER_PHYSICS.dredge);animateCreature(root,.7,'patrol',1);const size=new THREE.Box3().setFromObject(root).getSize(V());assert.ok(size.x>3&&size.z>2.4);fitCreatureClearance(root,.4);assert.equal(root.scale.x,MONSTER_PHYSICS.dredge.worldScale);disposeCreature(root);
});

test('actual world stalking poses stay above the pool floor with limbs folded inside navigation cores',t=>{
  for(const id of ids){
    const root=createCreature(id),profile=MONSTER_PHYSICS[id];applyCreatureWorldScale(root,profile);root.position.y=profile.surfaceY-root.userData.waterlineOffset;let min=Infinity,max=0,top=0;
    for(let time=0;time<10;time+=.17){root.position.y=profile.surfaceY+Math.sin(time*1.8)*.025-root.userData.waterlineOffset;animateCreature(root,time,'patrol',1.5,{trail:[{x:0,z:0}],availableRadius:profile.radius});root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position,p=V();for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);min=Math.min(min,p.y);max=Math.max(max,Math.hypot(p.x,p.z));top=Math.max(top,p.y);}});}
    assert.ok(min>=0,`${id} floor min ${min}`);assert.ok(max<=profile.radius+.0001,`${id} real stalk core ${max}`);t.diagnostic(`${id}: floor ${min.toFixed(3)}m; core ${max.toFixed(3)}m; top ${top.toFixed(3)}m`);disposeCreature(root);
  }
});

test('Knuckleback world windup crouch stays above floor without changing its fixed core',()=>{
  const root=createCreature('knuckle'),profile=MONSTER_PHYSICS.knuckle;applyCreatureWorldScale(root,profile);root.position.y=profile.surfaceY-root.userData.waterlineOffset;
  for(let time=0;time<3;time+=.07){animateCreature(root,time,'windup',1.5,{availableRadius:profile.radius});root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position,p=V();for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);assert.ok(p.y>=0,`${o.name} windup floor ${p.y}`);assert.ok(Math.hypot(p.x,p.z)<=profile.radius,`${o.name} windup core`);}});}
  assert.deepEqual(root.scale.toArray(),[profile.worldScale,profile.worldYScale,profile.worldScale]);disposeCreature(root);
});

test('blob tissue and worm vertices visibly deform nonuniformly while geometry and fixed scale stay stable',()=>{
  for(const id of ['dredge','leech']){const root=createCreature(id);applyCreatureWorldScale(root,MONSTER_PHYSICS[id]);root.position.y=MONSTER_PHYSICS[id]?.surfaceY-root.userData.waterlineOffset;const geometry=id==='dredge'?root.userData.body.geometry:root.userData.wormCore.geometry,a=geometry.attributes.position,array=a.array;
    animateCreature(root,.10,'pursue',1,{distanceTravelled:.4,acceleration:0,motionSpeed:4});const before=new Float32Array(array);animateCreature(root,.72,'pursue',1,{distanceTravelled:2.88,acceleration:0,motionSpeed:4});let max=0,positive=0,negative=0;const axis=id==='dredge'?1:0;
    for(let i=axis;i<array.length;i+=3){const delta=array[i]-before[i];max=Math.max(max,Math.abs(delta));if(delta>.02)positive++;if(delta<-.02)negative++;}assert.ok(max>.14,`${id} material deformation ${max}`);assert.ok(positive>30&&negative>30,id+' travelling/nonuniform displacement');assert.equal(a.array,array);assert.equal(root.scale.x,MONSTER_PHYSICS[id].worldScale);disposeCreature(root);
  }
});

test('planted feet remain fixed in world space while articulated creatures translate and turn',()=>{
  for(const id of quadrupeds){
    const root=createCreature(id);applyCreatureWorldScale(root,MONSTER_PHYSICS[id]);const d=root.userData,legs=d.legs,previous=new Map(),point=V();let held=0,swing=0;const context={motionSpeed:2,turnRate:.1,acceleration:0,sampleDt:1/60,distanceTravelled:0,availableRadius:MONSTER_PHYSICS[id].radius};
    for(let frame=0;frame<150;frame++){const t=frame/60,angle=t*.1;root.position.set(-20*(1-Math.cos(angle)),MONSTER_PHYSICS[id].surfaceY-d.waterlineOffset,-20*Math.sin(angle));root.rotation.y=angle;context.distanceTravelled=t*2;animateCreature(root,t,'pursue',.5,context);
      for(const leg of legs){leg.foot.getWorldPosition(point);const contact=leg.worldContact,old=previous.get(leg);if(contact?.locked&&old?.locked&&contact.x===old.x&&contact.z===old.z){assert.ok(Math.hypot(point.x-old.px,point.z-old.pz)<1e-7,id+' planted world-foot slip');held++;}if(leg.contactPose&&!leg.contactPose.planted)swing++;previous.set(leg,{locked:contact?.locked,x:contact?.x,z:contact?.z,px:point.x,pz:point.z});}
      if(frame%10===0)root.traverse(object=>{if(!object.isMesh)return;const vertices=object.geometry.attributes.position;for(let i=0;i<vertices.count;i++){point.fromBufferAttribute(vertices,i).applyMatrix4(object.matrixWorld);assert.ok(point.y>=0,`${id} translating ${object.name} stays above floor`);assert.ok(Math.hypot(point.x-root.position.x,point.z-root.position.z)<=MONSTER_PHYSICS[id].radius+.0001,`${id} translating ${object.name} stays in fixed core`);}});
    }assert.ok(held>20,id+' sustained planted contacts');assert.ok(swing>0,id+' actual swing intervals');disposeCreature(root);
  }
});


test('all eighteen gait poses advance with travelled distance instead of render elapsed time',()=>{
  for(const id of quadrupeds){const fastClock=createCreature(id),slowClock=createCreature(id),context={distanceTravelled:0};
    for(let frame=0;frame<80;frame++){context.distanceTravelled=frame*.05;animateCreature(fastClock,frame*.012,'pursue',.8,context);animateCreature(slowClock,frame*.23,'pursue',.8,context);}
    const positions=fastClock.userData.legs.map(leg=>leg.foot.position.toArray());assert.deepEqual(slowClock.userData.legs.map(leg=>leg.foot.position.toArray()),positions,id+' same distance means same foot phase');
    animateCreature(fastClock,50,'pursue',.8,context);assert.deepEqual(fastClock.userData.legs.map(leg=>leg.foot.position.toArray()),positions,id+' elapsed clock alone cannot slide feet');
    disposeCreature(fastClock);disposeCreature(slowClock);
  }
});

test('all eighteen quadrupeds increase actual swing height with movement speed and reuse geometry',()=>{
  for(const id of quadrupeds){const ranges=[];
    for(const speed of [.35,1.2]){const root=createCreature(id),resources=[];root.traverse(o=>{if(o.geometry)resources.push([o,o.geometry,o.geometry.attributes.position.array]);});const extrema=root.userData.legs.map(()=>({min:Infinity,max:-Infinity}));
      for(let frame=0;frame<260;frame++){animateCreature(root,frame/113,'pursue',speed,{distanceTravelled:frame/113*speed*4});for(let i=0;i<4;i++){const y=root.userData.legs[i].foot.getWorldPosition(V()).y;extrema[i].min=Math.min(extrema[i].min,y);extrema[i].max=Math.max(extrema[i].max,y);}}
      ranges.push(extrema.map(({min,max})=>max-min));for(const [o,geometry,array]of resources){assert.equal(o.geometry,geometry,id+' gait does not rebuild meshes');assert.equal(geometry.attributes.position.array,array,id+' gait reuses attribute storage');}disposeCreature(root);
    }
    for(let leg=0;leg<4;leg++){assert.ok(ranges[0][leg]>.03,id+' slow gait still lifts every foot');assert.ok(ranges[1][leg]>ranges[0][leg]*2.7,id+' faster movement raises actual swing '+leg);}
  }
});
