import * as THREE from '/vendor/three.module.js';
// Entire creature is volumetric geometry. No planes, sprites, image cutouts or camera-facing cards.
export function createCreatureRig(skinMaterial,level=0){
 const bones=[],make=(name,parent,x,y,z=0)=>{const bone=new THREE.Bone();bone.name=name;bone.position.set(x,y,z);if(parent)parent.add(bone);bones.push(bone);return bone};
 const root=make('hips',null,0,1.2),spine=make('spine',root,0,.5),head=make('head',spine,0,.69),jaw=make('jaw',head,0,-.13,.04);
 const leftArm=make('leftUpperArm',spine,-.34,.29),leftForearm=make('leftForearm',leftArm,-.09,-.57),leftHand=make('leftHand',leftForearm,-.03,-.58,.04);
 const rightArm=make('rightUpperArm',spine,.34,.29),rightForearm=make('rightForearm',rightArm,.09,-.57),rightHand=make('rightHand',rightForearm,.03,-.58,.04);
 const leftLeg=make('leftThigh',root,-.145,-.03),leftShin=make('leftShin',leftLeg,0,-.57,.035),rightLeg=make('rightThigh',root,.145,-.03),rightShin=make('rightShin',rightLeg,0,-.57,.035);
 root.updateMatrixWorld(true);
 const skin=skinMaterial.clone();skin.transparent=false;skin.alphaTest=0;skin.side=THREE.FrontSide;skin.color.setHex([0x939384,0x605c62,0x8a9690,0xb29b88,0x80716b][level]);skin.roughness=.78;
 const materials=[skin,new THREE.MeshStandardMaterial({color:0x170c09,roughness:.6}),new THREE.MeshStandardMaterial({color:0xbab19a,roughness:.48}),new THREE.MeshStandardMaterial({color:0x9ba995,roughness:.13,emissive:0x263526,emissiveIntensity:.12}),new THREE.MeshStandardMaterial({color:0x4b4c47,metalness:.8,roughness:.42}),new THREE.MeshStandardMaterial({color:0x582324,roughness:.42})];
 const positions=[],normals=[],uvs=[],indices=[],weights=[],groups=[];let vertex=0;
 function add(geometry,bone,material=0){geometry.computeVertexNormals();geometry.applyMatrix4(bone.matrixWorld);const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv,index=geometry.index;const begin=positions.length/3;for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));uvs.push(uv?.getX(i)||0,uv?.getY(i)||0);indices.push(bones.indexOf(bone),0,0,0);weights.push(1,0,0,0)}const triangles=index?Array.from(index.array):Array.from({length:p.count},(_,i)=>i);groups.push({start:vertex,count:triangles.length,material});for(const i of triangles)renderIndices.push(begin+i);vertex+=triangles.length;geometry.dispose()}
 const renderIndices=[];
 function form(bone,size,at,material=0,rotation=[0,0,0],carve=false){const g=new THREE.SphereGeometry(1,24,18),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),rough=1+.018*Math.sin(x*21+y*31+z*17)+.008*Math.sin(x*57-z*43);p.setXYZ(i,x*rough,y*rough,z*rough)}g.scale(...size);g.rotateX(rotation[0]);g.rotateY(rotation[1]);g.rotateZ(rotation[2]);g.translate(...at);if(carve){const old=g.index.array,keep=[];for(let i=0;i<old.length;i+=3){const a=old[i],b=old[i+1],c=old[i+2],x=(p.getX(a)+p.getX(b)+p.getX(c))/3,y=(p.getY(a)+p.getY(b)+p.getY(c))/3,z=(p.getZ(a)+p.getZ(b)+p.getZ(c))/3;const mouth=(x/.105)**2+((y+.065)/.125)**2<1;const eye=[-1,1].some(side=>((x-side*.091)/.058)**2+((y-.181)/.04)**2<1);if(!(z>.1&&(mouth||eye)))keep.push(a,b,c)}g.setIndex(keep)}add(g,bone,material)}
 function link(bone,a,b,r1,r2=r1*.7,material=0){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),d=end.clone().sub(start),g=new THREE.CylinderGeometry(r2,r1,d.length(),12,3);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());add(g,bone,material)}
 function point(bone,at,radius,length,down=false,material=2){const g=new THREE.ConeGeometry(radius,length,8);if(down)g.rotateZ(Math.PI);g.translate(...at);add(g,bone,material)}
 // Chest, pelvis, abdomen and shoulder girdle have depth and visible back surfaces.
 const bulk=level===4?1.45:level===3?1.32:1;
 form(root,[.21*bulk,.19,.16*bulk],[0,0,0]);form(spine,[.285*bulk,.43,.175*bulk],[0,.02,0]);form(root,[.155*bulk,.26,.12],[0,.22,-.015]);
 if(level===3)form(spine,[.33,.38,.27],[0,-.08,.06]);
 for(const side of [-1,1]){form(spine,[.13,.22,.055],[side*.13,.16,.14]);link(spine,[0,.27,0],[side*.35,.26,0],.047,.057);for(let i=0;i<6;i++){const path=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.035,.22-i*.085,.165),new THREE.Vector3(side*.16,.20-i*.085,.19),new THREE.Vector3(side*(.265-i*.012),.17-i*.075,.08)]);add(new THREE.TubeGeometry(path,10,.016,5,false),spine,0)}}
 for(let i=0;i<9;i++)form(spine,[.031,.033,.04],[0,-.36+i*.077,-.178],2);
 link(spine,[0,.3,0],[0,.63,.01],.085,.065);for(const side of [-1,1])link(spine,[side*.085,.28,.08],[side*.06,.62,.055],.018,.012);
 // Skull has real mouth and eye openings; sockets, teeth and jaw sit inside them.
 form(head,[level===1?.19:.205,level===1?.4:.325,.215],[0,.12,-.005],0,[.08,0,.045],true);
 form(head,[.105,.127,.055],[0,-.065,.125],1);
 for(const side of [-1,1]){form(head,[.059,.043,.04],[side*.091,.181,.156],1);if(level!==1){form(head,[.009,.011,.009],[side*.091,.179,.198],3);form(head,[.003,.007,.003],[side*.091,.179,.208],1)}form(head,[.072,.017,.043],[side*.09,.226,.167],0,[0,side*.12,-side*.19]);form(head,[.039,.105,.035],[side*.145,-.005,.10]);form(head,[.024,.052,.028],[side*.202,.13,-.005]);}
 form(head,[.024,.073,.038],[0,.108,.187]);for(const side of [-1,1])form(head,[.01,.013,.01],[side*.017,.063,.215],1);
 form(jaw,[.125,.053,.095],[0,-.1,.085]);form(jaw,[.09,.03,.07],[0,-.075,.12],5);
 for(const side of [-1,1])link(jaw,[side*.14,.08,-.015],[side*.11,-.105,.08],.025,.017);
 for(let i=0;i<11;i++){const x=(i-5)*.018,z=.178-Math.abs(x)*.26;point(head,[x,.025-Math.abs(x)*.14,z],.008,.044+(i%3)*.008,true);point(jaw,[x,-.035,z-.025],.008,.04+(i%2)*.014)}
 for(const [side,upper,lower,hand] of [[-1,leftArm,leftForearm,leftHand],[1,rightArm,rightForearm,rightHand]]){
  form(upper,[.105*bulk,.13,.11],[0,0,0]);link(upper,[0,-.05,0],[side*.09,-.54,0],.073*bulk,.043);form(lower,[.05,.062,.057],[0,0,0]);link(lower,[0,-.025,0],[side*.03,-.55,.04],.048*bulk,.028);form(hand,[.062,.105,.038],[0,-.045,.014]);
  for(let i=0;i<4;i++){const x=(i-1.5)*.034,len=.18+(i%3)*.024;link(hand,[x,-.105,.02],[x+side*.015,-.105-len,.045],.012,.008);link(hand,[x+side*.015,-.105-len,.045],[x+side*.012,-.17-len,.105],.008,.002,2)}link(hand,[side*.055,-.03,0],[side*.105,-.15,.075],.018,.009);
 }
 for(const [side,upper,shin] of [[-1,leftLeg,leftShin],[1,rightLeg,rightShin]]){link(upper,[0,-.015,0],[0,-.54,.035],.095*bulk,.054);form(shin,[.057,.063,.069],[0,0,0]);link(shin,[0,-.03,0],[0,-.48,-.015],.047,.027);form(shin,[.066,.043,.14],[0,-.51,.07]);for(let i=0;i<3;i++){form(shin,[.019,.022,.065],[(i-1)*.038,-.515,.18]);point(shin,[(i-1)*.038,-.51,.235],.009,.045,false,2)}}
 for(let i=0;i<11;i++){const x=(i-5)*.019;const path=new THREE.CatmullRomCurve3([new THREE.Vector3(x,.416,-.04),new THREE.Vector3(x*1.3,.36,-.16),new THREE.Vector3(x*1.45,.17-(i%3)*.04,-.19)]);add(new THREE.TubeGeometry(path,8,.0025,4,false),head,1)}
 for(const side of [-1,1])for(let i=0;i<3;i++)link(head,[side*.08,.02-i*.035,.167],[side*.14,-.025-i*.035,.11],.005,.003,5);
 if(level===4){for(const side of [-1,1]){form(spine,[.14,.2,.045],[side*.19,.08,.22],4,[0,side*.25,0]);for(let i=0;i<4;i++)form(spine,[.015,.015,.012],[side*.25,.2-i*.09,.252],4);form(side<0?leftForearm:rightForearm,[.085,.15,.07],[0,-.26,.01],4)}}
 if(level===1){for(let i=0;i<7;i++)link(head,[i%2?.06:-.06,-.15+i*.06,.185],[i%2?-.06:.06,-.12+i*.06,.19],.007,.005,5)}
 if(level===3){const ring=new THREE.TorusGeometry(.11,.023,9,24);ring.scale(1,1.3,1);ring.translate(0,-.06,.19);add(ring,head,5)}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));const mergedIndices=[];for(let material=0;material<materials.length;material++){const start=mergedIndices.length;for(const group of groups)if(group.material===material)for(let i=group.start;i<group.start+group.count;i++)mergedIndices.push(renderIndices[i]);if(mergedIndices.length>start)geometry.addGroup(start,mergedIndices.length-start,material)}geometry.setIndex(mergedIndices);geometry.computeBoundingSphere();
 const mesh=new THREE.SkinnedMesh(geometry,materials);mesh.name='creature-model';mesh.add(root);mesh.bind(new THREE.Skeleton(bones));mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;
 mesh.creatureRig={root,spine,head,jaw,leftArm,leftForearm,leftHand,rightArm,rightForearm,rightHand,leftLeg,leftShin,rightLeg,rightShin};mesh.animationPhase=0;mesh.userData.level=level;return mesh;
}
export function animateCreatureRig(mesh,dt,movement=0,level=0,attack=0){
 const r=mesh?.creatureRig;if(!r)return;const run=THREE.MathUtils.clamp(movement,0,1.3),phase=mesh.animationPhase+(1.1+run*7.4)*dt;mesh.animationPhase=phase;
 const a=Math.sin(phase),b=Math.sin(phase+Math.PI),idle=Math.sin(phase*.39);
 r.root.position.y=(level===2?.9:1.2)+Math.abs(a)*.042*run+idle*.009;r.root.rotation.z=a*.045*run;
 r.spine.rotation.x=(level===2?.72:.04)+run*.11;r.spine.rotation.z=-a*.05*run;
 r.head.rotation.set(-.045+Math.sin(phase*.54)*.04,Math.sin(phase*.3)*.16,idle*.055-a*.035*run);
 r.jaw.rotation.x=.06+Math.max(0,Math.sin(phase*.9))*.16+attack*.24;
 r.leftArm.rotation.set(b*.6*run-attack*1.3,0,-.1);r.rightArm.rotation.set(a*.6*run-attack*1.3,0,.1);
 r.leftForearm.rotation.x=-.14-Math.max(0,a)*.45*run-attack*.25;r.rightForearm.rotation.x=-.14-Math.max(0,b)*.45*run-attack*.25;
 r.leftHand.rotation.z=idle*.09;r.rightHand.rotation.z=-idle*.09;
 r.leftLeg.rotation.x=a*.59*run;r.rightLeg.rotation.x=b*.59*run;r.leftShin.rotation.x=Math.max(0,-a)*.83*run;r.rightShin.rotation.x=Math.max(0,-b)*.83*run;
 if(level===2){r.leftLeg.rotation.x-=.9;r.rightLeg.rotation.x-=.9;r.leftShin.rotation.x+=1.35;r.rightShin.rotation.x+=1.35;r.leftArm.rotation.x-=.72;r.rightArm.rotation.x-=.72}
 mesh.updateMatrixWorld(true);mesh.skeleton.update();
}
