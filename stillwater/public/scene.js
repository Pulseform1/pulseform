import * as THREE from '/vendor/three.module.js';
import {RoundedBoxGeometry} from '/vendor/RoundedBoxGeometry.js';
import {mergeGeometries} from './lib/BufferGeometryUtils.js';
import {getRoom,getPlatformPose,roomIndexAt,CONFIG,MONSTER_PHYSICS,ROUTE_STYLES} from '/shared/simulation.js';
import {createCreature,animateCreature,disposeCreature,applyCreatureWorldScale} from './creatures.js';
import {CreatureSpace} from './creature-space.js';
import {LiveScareStage} from './live-scare.js';
import {CreatureWake} from './creature-wake.js';

function tileTexture(size=256){
  const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');x.fillStyle='#c5d6d0';x.fillRect(0,0,size,size);
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){
    let v=226+((i*7+j*11)%14);x.fillStyle=`rgb(${v},${Math.min(v+7,255)},${Math.min(v+3,255)})`;x.fillRect(i*64+2,j*64+2,60,60);
    x.fillStyle='rgba(255,255,255,.6)';x.fillRect(i*64+3,j*64+3,58,1);x.fillRect(i*64+3,j*64+3,1,58);
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function labelTexture(text,small='POOL ACCESS'){
  const c=document.createElement('canvas');c.width=512;c.height=192;let x=c.getContext('2d');x.fillStyle='#204d54';x.fillRect(0,0,512,192);x.strokeStyle='#7eb8b5';x.lineWidth=4;x.strokeRect(9,9,494,174);x.fillStyle='#d9eeeb';x.textAlign='center';x.font='bold 22px system-ui';x.fillText(small,256,56);x.font='bold 42px system-ui';x.fillText(text.toUpperCase(),256,119);return new THREE.CanvasTexture(c);
}
function routeLabelAtlas(){
  const c=document.createElement('canvas');c.width=512;c.height=576;const x=c.getContext('2d');
  Object.values(ROUTE_STYLES).forEach((style,index)=>{const y=index*192;x.fillStyle='#142a30';x.fillRect(0,y,512,192);x.strokeStyle=style.color;x.lineWidth=5;x.strokeRect(8,y+8,496,176);x.fillStyle=style.color;x.textAlign='center';x.font='bold 24px system-ui';x.fillText(style.rhythm==='timed'?'MOVING PLATFORMS':style.rhythm==='long'?'SPRINT JUMPS':'BROAD LANDINGS',256,y+57);x.font='bold 36px system-ui';x.fillText(`${index+1} · ${style.label}`,256,y+121);});
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function colorGeometry(geometry,color){const count=geometry.attributes.position.count,values=new Float32Array(count*3);for(let i=0;i<count;i++){values[i*3]=color.r;values[i*3+1]=color.g;values[i*3+2]=color.b;}geometry.setAttribute('color',new THREE.BufferAttribute(values,3));}
function routeMarkerTexture(color){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  x.fillStyle=color;x.beginPath();x.moveTo(64,12);x.lineTo(111,63);x.lineTo(82,63);x.lineTo(82,108);x.lineTo(46,108);x.lineTo(46,63);x.lineTo(17,63);x.closePath();x.fill();
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
// A static fluorescent wash follows the authored ceiling fixtures. It changes
// material shading only: no extra lights, meshes, textures, shadows or frame work.
function fluorescentWash(material){
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vPoolPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvPoolPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader='varying vec3 vPoolPosition;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      float fixtureCell=mod(-vPoolPosition.z,${Number(CONFIG.roomLength).toFixed(1)});
      vec2 lightA=vec2((vPoolPosition.x+2.7)/4.6,(fixtureCell-4.0)/3.5);
      vec2 lightB=vec2((vPoolPosition.x-2.7)/4.6,(fixtureCell-12.0)/3.5);
      vec2 lightC=vec2((vPoolPosition.x+2.7)/4.6,(fixtureCell-20.0)/3.5);
      vec3 pools=max(vec3(0.0),vec3(1.0)-vec3(dot(lightA,lightA),dot(lightB,lightB),dot(lightC,lightC)));
      float wash=dot(pools,pools)*clamp((8.0-vPoolPosition.y)*.18,.20,1.0);
      totalEmissiveRadiance+=vec3(.010,.016,.013)*wash;`);
  };
  material.customProgramCacheKey=()=> 'stillwater-fluorescent-wash-2';
  return material;
}

const waterVertex=`varying vec3 vWorld; varying vec3 vNormal; varying vec2 vUv; uniform float uTime;
void main(){vec3 p=position; p.z+=sin(p.x*1.7+uTime*.8)*.018+cos(p.y*1.3+uTime*.6)*.012;vec4 world=modelMatrix*vec4(p,1.);vWorld=world.xyz;vNormal=normalize(normalMatrix*normal);vUv=uv;gl_Position=projectionMatrix*viewMatrix*world;}`;
const waterFragment=`varying vec3 vWorld; varying vec3 vNormal; varying vec2 vUv; uniform float uTime;uniform vec3 uEye;uniform float uDetail;uniform float uBrightness;uniform float uTorchOn;uniform vec3 uTorchDirection;uniform vec3 uTorchPosition;
void main(){
  vec2 q=vWorld.xz;
  float w=sin(q.x*2.8+uTime*.8)*cos(q.y*2.1-uTime*.7);
  float r=sin(q.x*6.1+q.y*4.2+uTime)*.5;
  vec3 n=normalize(vec3(w*.055,1.,r*.045));
  vec3 v=normalize(uEye-vWorld);
  float f=pow(1.-max(dot(n,v),0.),3.);
  float spec=pow(max(dot(reflect(normalize(vec3(-.3,-1.,-.2)),n),v),0.),90.);
  // Slow suspended haze mutes the view into the pool, without flattening wakes.
  float cloud=.5+.5*sin(q.x*.31+q.y*.17+uTime*.025)*cos(q.y*.24-q.x*.11);
  vec3 col=mix(vec3(.012,.035,.030),vec3(.055,.085,.071),f*.64);
  col=mix(col,vec3(.018,.036,.027),.08+cloud*.14);
  if(uDetail>.5){float caustic=pow(abs(sin(q.x*2.+sin(q.y*2.+uTime*.25))+cos(q.y*1.7+sin(q.x*1.8-uTime*.2)))*.5,9.);col+=caustic*.016;}
  float torchDistance=distance(uTorchPosition,vWorld);
  float cone=smoothstep(.85,.96,dot(normalize(vWorld-uTorchPosition),uTorchDirection))*uTorchOn;
  float torch=cone*pow(max(0.,1.-torchDistance/34.),2.);
  col+=vec3(.30,.23,.13)*torch+spec*(.025+torch*.32);
  float fog=smoothstep(10.,38.,torchDistance);
  col=mix(col,vec3(.012,.023,.019),fog*.92);
  gl_FragColor=vec4(col*uBrightness,.89);
}`;

const QUALITY={
  low:{dpr:1,pixels:1_200_000,ahead:1,waterX:2,waterZ:4,ripples:16,spray:96,actors:4,actorDistance:36,animationHz:12},
  medium:{dpr:1.25,pixels:2_000_000,ahead:2,waterX:12,waterZ:16,ripples:24,spray:144,actors:6,actorDistance:44,animationHz:18},
  high:{dpr:1.5,pixels:3_000_000,ahead:3,waterX:20,waterZ:24,ripples:35,spray:192,actors:8,actorDistance:52,animationHz:24}
};
const UP=new THREE.Vector3(0,1,0);

export class GameScene{
  constructor(canvas){
    this.canvas=canvas;this.scareStage=null;this.quality='low';this.renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.brightness=1;this.renderer.toneMappingExposure=.88;this.renderer.shadowMap.enabled=false;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x030605);this.scene.fog=new THREE.FogExp2(0x07110d,.072);
    this.camera=new THREE.PerspectiveCamera(78,innerWidth/innerHeight,.08,100);this.camera.rotation.order='YXZ';this.scene.add(this.camera);
    this.ambient=new THREE.HemisphereLight(0x749686,0x08110c,.18);this.scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight(0xa5b19a,.22);this.sun.position.set(-8,14,0);this.sun.castShadow=false;this.sun.shadow.mapSize.set(1024,1024);Object.assign(this.sun.shadow.camera,{left:-22,right:22,top:30,bottom:-30,near:.5,far:60});this.sun.shadow.bias=-.0005;this.scene.add(this.sun,this.sun.target);
    // The handheld light is the only local light. No point lights or shadow maps.
    this.torchEnabled=true;this.torchDirection=new THREE.Vector3(0,0,-1);this.torchWorldPosition=new THREE.Vector3();this.torchWorldTarget=new THREE.Vector3();
    this.torch=new THREE.SpotLight(0xffd5a0,30,34,.56,.62,1.55);this.torch.castShadow=false;this.torch.position.set(.22,-.17,-.16);
    this.torchTarget=new THREE.Object3D();this.torchTarget.position.set(0,0,-8);this.torch.target=this.torchTarget;this.camera.add(this.torch,this.torchTarget);
    this.torchProp=new THREE.Group();this.torchProp.position.set(.27,-.28,-.44);this.torchProp.rotation.x=Math.PI/2;
    const handle=new THREE.Mesh(new THREE.CylinderGeometry(.043,.035,.21,8),new THREE.MeshStandardMaterial({color:0x26302d,roughness:.62}));this.torchProp.add(handle);
    this.torchLens=new THREE.Mesh(new THREE.CircleGeometry(.042,12),new THREE.MeshBasicMaterial({color:0xffd29b,toneMapped:false}));this.torchLens.rotation.x=-Math.PI/2;this.torchLens.position.y=.108;this.torchProp.add(this.torchLens);this.camera.add(this.torchProp);
    const tile=tileTexture();
    this.tile=fluorescentWash(new THREE.MeshStandardMaterial({map:tile,color:0xc6d7cd,roughness:.39,metalness:.03,emissive:0x182f26,emissiveIntensity:.16}));
    this.darkTile=fluorescentWash(new THREE.MeshStandardMaterial({map:tile,color:0x85a99d,roughness:.40,emissive:0x315446,emissiveIntensity:.22}));
    this.palettes={cool:{tile:this.tile,dark:this.darkTile}};
    for(const [name,colors] of Object.entries({warm:[0xcbbba5,0x9d8b71],sickly:[0xb7c293,0x829667]})){const tileMaterial=fluorescentWash(this.tile.clone()),darkMaterial=fluorescentWash(this.darkTile.clone());tileMaterial.color.setHex(colors[0]);darkMaterial.color.setHex(colors[1]);this.palettes[name]={tile:tileMaterial,dark:darkMaterial};}
    this.trim=new THREE.MeshStandardMaterial({color:0x648f7e,roughness:.38,emissive:0x274f3e,emissiveIntensity:.32});
    this.challengeTile=fluorescentWash(new THREE.MeshStandardMaterial({map:tile,color:0xbab6d0,roughness:.38,emissive:0x31283f,emissiveIntensity:.18}));
    this.challengeTrim=new THREE.MeshStandardMaterial({color:0x9e8cbe,roughness:.36,emissive:0x4c385f,emissiveIntensity:.27});
    this.lamp=new THREE.MeshBasicMaterial({color:0xcbe8c2,toneMapped:false});this.warmLamp=new THREE.MeshBasicMaterial({color:0xeacb8d,toneMapped:false});
    this.routeMarker=new THREE.MeshBasicMaterial({map:routeMarkerTexture('#8faf9e'),transparent:true,opacity:.85,toneMapped:false,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});this.challengeMarker=new THREE.MeshBasicMaterial({map:routeMarkerTexture('#baacd6'),transparent:true,opacity:.95,toneMapped:false,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
    const routeTrim=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}),routeArrow=new THREE.MeshBasicMaterial({map:routeMarkerTexture('#ffffff'),vertexColors:true,transparent:true,opacity:.96,toneMapped:false,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),routeLabel=new THREE.MeshBasicMaterial({map:routeLabelAtlas(),toneMapped:false});
    this.routeMaterials=Object.fromEntries(Object.entries(ROUTE_STYLES).map(([id,style],index)=>[id,{trim:routeTrim,arrow:routeArrow,label:routeLabel,color:new THREE.Color(style.color),index}]));
    this.detourLabel=new THREE.MeshBasicMaterial({map:labelTexture('DETOUR','OPTIONAL ROUTE'),toneMapped:false});this.longJumpLabel=new THREE.MeshBasicMaterial({map:labelTexture('LONG JUMP','HOLD SHIFT / TAP SPACE'),toneMapped:false});
    this.checkpointTrim=new THREE.MeshBasicMaterial({color:0x73b9a0,toneMapped:false});this.checkpointLabel=new THREE.MeshBasicMaterial({map:labelTexture('CHECKPOINT','STABLE GROUND'),toneMapped:false});
    this.sinkTile=new THREE.MeshStandardMaterial({map:tile,color:0x74654f,roughness:.7,emissive:0x684321,emissiveIntensity:.2});this.sinkLabel=new THREE.MeshBasicMaterial({map:labelTexture('SINKING TILE','KEEP MOVING'),toneMapped:false});this.spinnerLabel=new THREE.MeshBasicMaterial({map:labelTexture('ROTATING','WAIT FOR ALIGNMENT'),toneMapped:false});
    this.waterMaterial=new THREE.ShaderMaterial({vertexShader:waterVertex,fragmentShader:waterFragment,uniforms:{uTime:{value:0},uEye:{value:this.camera.position},uDetail:{value:0},uBrightness:{value:1},uTorchOn:{value:1},uTorchDirection:{value:this.torchDirection},uTorchPosition:{value:this.torchWorldPosition}},transparent:true,depthWrite:false,side:THREE.DoubleSide});
    this.rooms=new Map();this.dynamicPlatforms=new Map();this.avatars=new Map();this.ripples=[];this.ripplePool=[];this.rippleGeometry=new THREE.RingGeometry(.15,.20,24);this.monster=null;this.monsterId=null;this.seed='stillwater';this.difficulty='normal';this.frameStats=new Float32Array(120);this.frameIndex=0;this.frameCount=0;this.frameTotal=0;this.spectateId=null;this.cameraReady=false;this.targetPosition=new THREE.Vector3();this.baseCameraPosition=new THREE.Vector3();this.avatarIds=new Set();this.roomWindow={min:0,max:0};this.creatureSpace=new CreatureSpace();this.actorSlots=new Map();this.actorCandidates=[];this.actorSelected=new Set();this.actorFrustum=new THREE.Frustum();this.actorProjection=new THREE.Matrix4();this.actorSphere=new THREE.Sphere();this.primaryActorId=null;this.populationCount=0;
    // Fixed pool: one Points draw for spray, and reusable water rings.
    this.wake=new CreatureWake(192,CONFIG.waterY);this.sprayGeometry=new THREE.BufferGeometry();
    this.sprayGeometry.setAttribute('position',new THREE.BufferAttribute(this.wake.positions,3).setUsage(THREE.DynamicDrawUsage));this.sprayGeometry.setAttribute('aSize',new THREE.BufferAttribute(this.wake.sizes,1).setUsage(THREE.DynamicDrawUsage));this.sprayGeometry.setAttribute('aAlpha',new THREE.BufferAttribute(this.wake.opacity,1).setUsage(THREE.DynamicDrawUsage));
    this.sprayMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms:{uScale:{value:600}},vertexShader:`attribute float aSize;attribute float aAlpha;uniform float uScale;varying float vAlpha;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=aAlpha>0.0?clamp(aSize*uScale/max(.1,-p.z),1.0,28.0):0.0;vAlpha=aAlpha*(1.0-smoothstep(14.0,42.0,-p.z));}`,fragmentShader:`varying float vAlpha;void main(){vec2 p=gl_PointCoord*2.0-1.0;float d=dot(p,p);if(d>1.0||vAlpha<.01)discard;gl_FragColor=vec4(.66,.91,.85,(1.0-smoothstep(.35,1.0,d))*vAlpha);}`});
    this.sprayGeometry.setDrawRange(0,QUALITY.low.spray);
    this.spray=new THREE.Points(this.sprayGeometry,this.sprayMaterial);this.spray.frustumCulled=false;this.spray.visible=false;this.spray.renderOrder=4;this.scene.add(this.spray);
    for(let i=0;i<35;i++){const mesh=new THREE.Mesh(this.rippleGeometry,new THREE.MeshBasicMaterial({color:0xc8f7e7,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));mesh.rotation.x=-Math.PI/2;mesh.renderOrder=3;this.ripplePool.push({mesh,age:0,big:false,opacity:.65,stretch:1});}
    this.resize=()=>{const q=QUALITY[this.quality],w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,q.dpr,Math.sqrt(q.pixels/(w*h))));this.renderer.setSize(w,h);this.sprayMaterial.uniforms.uScale.value=h*this.renderer.getPixelRatio()*.65;};window.addEventListener('resize',this.resize);this.resize();
    this.setWorld('welcome','normal');this.setMonster('dredge');
  }
  box(group,w,h,d,x,y,z,mat=this.tile,round=.055){
    // Thin rim bevels are subpixel at play distance; keep rounded platform bodies.
    if(this.quality!=='high'&&Math.min(w,h,d)<.12)round=0;
    const geo=round?new RoundedBoxGeometry(w,h,d,1,Math.min(round,w/4,h/4,d/4)):new THREE.BoxGeometry(w,h,d);
    if(mat.map){const p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv;for(let i=0;i<p.count;i++){const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));uv.setXY(i,(ax>ay&&ax>az?p.getZ(i):p.getX(i))/3.2,(ay>ax&&ay>az?p.getZ(i):p.getY(i))/3.2);}}
    const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.receiveShadow=true;mesh.castShadow=h<12;group.add(mesh);return mesh;
  }
  setWorld(seed,difficulty){if(this.seed===seed&&this.difficulty===difficulty&&this.rooms.size)return;for(const [i]of this.rooms)this.removeRoom(i);while(this.ripples.length)this.retireRipple(this.ripples.length-1);this.wake.reset();this.spray.visible=false;this.seed=seed;this.difficulty=difficulty;this.cameraReady=false;for(const slot of this.actorSlots.values())slot.space.reset();this.creatureSpace.reset();this.updateRooms(0,1);}
  makeRoom(i){
    const r=getRoom(this.seed,i,this.difficulty),g=new THREE.Group();g.userData.room=r;const length=Math.abs(r.endZ-r.startZ)||CONFIG.roomLength,mid=(r.startZ+r.endZ)/2,{tile,dark}=this.palettes[r.architecture?.palette]||this.palettes.cool;
    this.box(g,r.width,.3,length,0,-.2,mid,tile,0);
    this.box(g,.32,r.height,length,-r.width/2-.16,r.height/2,mid,tile,0);this.box(g,.32,r.height,length,r.width/2+.16,r.height/2,mid,tile,0);
    this.box(g,r.width,.3,length,0,r.height+.15,mid,tile,0);
    for(const s of [-1,1]){
      this.box(g,.05,.19,length,s*(r.width/2-.02),1.47,mid,this.trim,0);
      this.box(g,.06,.08,length,s*(r.width/2-.025),2.05,mid,dark,0);
    }
    // Open portal rings divide rooms without placing invisible barriers in the course.
    for(const z of [r.endZ]){
      // Portal trim stays outside the playable wall/ceiling bounds; decoration
      // must not introduce an unmodelled overhead collision on a valid jump.
      this.box(g,.32,r.height,.6,-r.width/2-.16,r.height/2,z,dark);this.box(g,.32,r.height,.6,r.width/2+.16,r.height/2,z,dark);this.box(g,r.width,.20,.6,0,r.height+.10,z,dark);
    }
    if(i===0){this.box(g,r.width,r.height,.4,0,r.height/2,2.1,tile);}
    for(const p of r.platforms){
      const dynamic=p.kind==='spinner'||p.kind==='sink'||p.motion?.type==='rotate',challenge=p.kind==='challenge'||p.branch,checkpoint=p.checkpoint||p.kind==='checkpoint';
      let parent=g,x=p.x,y=p.y,z=p.z,surface=checkpoint?dark:tile;
      if(dynamic){
        parent=new THREE.Group();parent.name='moving-platform-'+p.id;parent.userData.platformId=p.id;parent.position.set(p.x,p.y,p.z);g.add(parent);x=y=z=0;
        const entry={definition:p,group:parent,room:i,warningMaterial:null,state:null};this.dynamicPlatforms.set(p.id,entry);
        if(p.kind==='sink'){surface=this.sinkTile.clone();surface.userData.platformOwned=true;entry.warningMaterial=surface;}
      }
      // The group origin is the authoritative support surface; moving bodies,
      // trim, arrows and labels all inherit the same pose and top elevation.
      this.box(parent,p.w,p.h,p.d,x,y-p.h/2,z,p.kind==='sink'?surface:p.kind==='escape'?dark:challenge&&!p.routeId?this.challengeTile:surface,p.kind==='infill'?0:.09);
      if(p.kind!=='infill'){
        const routeTrim=this.box(parent,p.w+.025,.085,p.d+.025,x,y-.075,z,checkpoint?this.checkpointTrim:this.routeMaterials[p.routeId]?.trim|| (challenge?this.challengeTrim:p.kind==='escape'?this.trim:dark),.04);if(!checkpoint&&this.routeMaterials[p.routeId])colorGeometry(routeTrim.geometry,this.routeMaterials[p.routeId].color);
        this.box(parent,Math.max(.02,p.w-.11),.035,Math.max(.02,p.d-.11),x,y+.006,z,surface,.045);
      }
      if(p.jumpType==='long'){const plaque=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(1.7,p.w*.7),.64),this.longJumpLabel);plaque.rotation.x=-Math.PI/2;plaque.position.set(x,y+.032,z+Math.min(.6,p.d*.15));parent.add(plaque);}
      if(checkpoint||p.kind==='sink'||p.kind==='spinner'){
        const material=checkpoint?this.checkpointLabel:p.kind==='sink'?this.sinkLabel:this.spinnerLabel,plaque=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(2.8,p.w*.78),Math.min(1.05,p.d*.45)),material);plaque.rotation.x=-Math.PI/2;plaque.position.set(x,y+.037,z);parent.add(plaque);
      }
      if(p.kind==='escape'){
        for(const dx of [-.26,.26]){const rail=new THREE.Mesh(new THREE.CylinderGeometry(.027,.027,.7,8),this.trim);rail.position.set(x+dx,1.25,z+p.d/2+.03);parent.add(rail);}
        for(let k=0;k<3;k++)this.box(parent,.55,.035,.04,x,.75+k*.19,z+p.d/2+.03,this.trim,0);
      }
    }
    const main=r.platforms.filter(p=>p.route),paths=r.paths||[{id:'main',optional:false,nodes:main.map(p=>p.id)}];
    const lookup=new Map([...Object.values(r.routeEndpoints||{}),...r.platforms].map(p=>[p.id,p]));g.userData.routeMarkers=[];g.userData.routeLabels=[];
    for(const path of paths){
      const style=this.routeMaterials[path.routeId],routeIndex=Object.keys(ROUTE_STYLES).indexOf(path.routeId);
      for(let j=0;j<path.nodes.length-1;j++){
        const p=lookup.get(path.nodes[j]),next=lookup.get(path.nodes[j+1]);if(!p||!next)continue;
        const fork=Boolean(p.routeChoices&&style),dx=next.x-p.x,dz=next.z-p.z,dist=Math.hypot(dx,dz)||1;
        const arrow=new THREE.Mesh(new THREE.PlaneGeometry(fork?.48:.40,fork?.66:.55),style?.arrow||(path.optional?this.challengeMarker:this.routeMarker));
        if(style)colorGeometry(arrow.geometry,style.color);
        const x=fork?p.x+(routeIndex-1)*Math.min(1.8,p.w*.28):p.x+dx/dist*Math.min(.48,p.w*.2),z=fork?p.z-p.d*.34:p.z+dz/dist*Math.min(.48,p.d*.2);
        arrow.position.set(x,p.y+.043,z);arrow.rotation.x=-Math.PI/2;arrow.rotateOnWorldAxis(UP,Math.atan2(-dx,-dz));this.mountPlatformDetail(g,p,arrow);
        g.userData.routeMarkers.push({routeId:path.routeId,pathId:path.id,fromId:p.id,toId:next.id,x,z,y:p.y+.043,angle:Math.atan2(-dx,-dz),fork});
        if(fork){const width=Math.min(1.6,p.w/3-.18),plaque=new THREE.Mesh(new THREE.PlaneGeometry(width,.36),style.label);const uv=plaque.geometry.attributes.uv;for(let k=0;k<uv.count;k++)uv.setY(k,(uv.getY(k)+2-style.index)/3);plaque.rotation.x=-Math.PI/2;plaque.position.set(x,p.y+.045,z+.60);this.mountPlatformDetail(g,p,plaque);g.userData.routeLabels.push({routeId:path.routeId,fromId:p.id,toId:next.id,x,z:z+.60,width});}
      }
      if(path.optional&&!style){const split=lookup.get(path.nodes[0]);if(split){const plaque=new THREE.Mesh(new THREE.PlaneGeometry(.8,.3),this.detourLabel);plaque.rotation.x=-Math.PI/2;plaque.position.set(split.x,split.y+.03,split.z+Math.min(.55,split.d*.25));this.mountPlatformDetail(g,split,plaque);}}
    }
    for(const o of r.obstacles){
      // Obstacle y is its bottom; roof structure y below is its center.
      this.box(g,o.w,o.h,o.d,o.x,o.y+o.h/2,o.z,tile,o.kind==='column'?.10:.035);
      if(o.h>1.7)this.box(g,o.w+.08,.12,o.d+.08,o.x,o.y+1.50,o.z,dark,.02);
      this.box(g,o.w+.08,.14,o.d+.08,o.x,o.y+o.h-.07,o.z,dark,.02);
    }
    if(r.structures?.length){for(const fixture of r.structures){
      const material=fixture.material==='warmLamp'?this.warmLamp:fixture.material==='lamp'?this.lamp:fixture.material==='dark'?dark:tile;
      this.box(g,fixture.w,fixture.h,fixture.d,fixture.x,fixture.y,fixture.z,material,fixture.kind==='light'?.025:0);
    }}else for(let j=0;j<3;j++){
      const z=r.startZ-4-j*8;
      this.box(g,3.4,.07,.26,j%2?2.7:-2.7,r.height-.16,z,r.light==='warm'?this.warmLamp:this.lamp,.025);
    }
    // Arched wall recesses, pool rails, and architectural details vary with each family.
    if([2,4,6,8].includes(r.family))for(let j=0;j<2;j++){
      const arch=new THREE.Mesh(new THREE.TorusGeometry(1.9,.16,8,28,Math.PI),dark);arch.position.set(-r.width/2+.05,3.4,r.startZ-6-j*10);arch.rotation.y=Math.PI/2;g.add(arch);
      this.box(g,.15,2,.25,-r.width/2+.05,2.4,r.startZ-6-j*10-1.9,dark);this.box(g,.15,2,.25,-r.width/2+.05,2.4,r.startZ-6-j*10+1.9,dark);
    }
    const signMaterial=new THREE.MeshBasicMaterial({map:labelTexture(String(i+1).padStart(2,'0'),r.name.toUpperCase())});signMaterial.userData.roomOwned=true;
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.5,.94),signMaterial);sign.position.set(r.width/2-.04,3.1,r.startZ-4);sign.rotation.y=-Math.PI/2;g.add(sign);
    const q=QUALITY[this.quality],water=new THREE.Mesh(new THREE.PlaneGeometry(r.width,length,q.waterX,q.waterZ),this.waterMaterial);water.rotation.x=-Math.PI/2;water.position.set(0,CONFIG.waterY,mid);water.renderOrder=2;g.add(water);
    for(const entry of this.dynamicPlatforms.values())if(entry.room===i)this.batchRoom(entry.group);
    this.batchRoom(g);
    this.scene.add(g);this.rooms.set(i,g);
  }
  batchRoom(group){
    // Keep room-sized culling, route markings, UVs and shadow flags, but submit
    // static tile/trim geometry once per material rather than once per piece.
    const batches=new Map();
    for(const mesh of group.children){
      if(!mesh.isMesh||mesh.material===this.waterMaterial)continue;
      const key=`${mesh.material.uuid}/${mesh.castShadow}/${mesh.receiveShadow}/${mesh.renderOrder}`;
      if(!batches.has(key))batches.set(key,[]);batches.get(key).push(mesh);
    }
    for(const meshes of batches.values()){
      if(meshes.length<2)continue;
      const geometries=meshes.map(mesh=>{mesh.updateMatrix();const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geometry.applyMatrix4(mesh.matrix);return geometry;});
      const geometry=mergeGeometries(geometries,false);for(const part of geometries)part.dispose();
      if(!geometry)continue;
      geometry.computeBoundingBox();geometry.computeBoundingSphere();
      const source=meshes[0],batch=new THREE.Mesh(geometry,source.material);batch.castShadow=source.castShadow;batch.receiveShadow=source.receiveShadow;batch.renderOrder=source.renderOrder;
      for(const mesh of meshes){group.remove(mesh);mesh.geometry.dispose();}group.add(batch);
    }
  }
  mountPlatformDetail(room,p,mesh){const entry=this.dynamicPlatforms.get(p.id);if(entry){mesh.position.x-=p.x;mesh.position.y-=p.y;mesh.position.z-=p.z;entry.group.add(mesh);}else room.add(mesh);}
  updatePlatforms(state,time=state?.time||0){
    const world=state||{seed:this.seed,difficulty:this.difficulty,time,platformStates:{}};
    for(const entry of this.dynamicPlatforms.values()){
      const pose=getPlatformPose(world,entry.definition,time),group=entry.group;group.position.set(pose.x,pose.y,pose.z);group.rotation.y=pose.yaw||0;group.userData.poseState=pose.state;group.visible=pose.active!==false;
      if(entry.warningMaterial&&entry.state!==pose.state){
        const warning=pose.state==='warning',sinking=pose.state==='sinking'||pose.state==='sunken';entry.warningMaterial.color.setHex(warning?0xa36b28:sinking?0x754839:0x74654f);entry.warningMaterial.emissive.setHex(warning?0xac5614:sinking?0x682915:0x684321);entry.warningMaterial.emissiveIntensity=warning?.52:.2;entry.state=pose.state;
      }
    }
  }
  removeRoom(i){
    const g=this.rooms.get(i);if(!g)return;const materials=new Set();g.traverse(o=>{o.geometry?.dispose();if(o.material?.userData.roomOwned||o.material?.userData.platformOwned)materials.add(o.material);});
    for(const material of materials){if(material.userData.roomOwned)material.map?.dispose();material.dispose();}for(const [id,entry]of this.dynamicPlatforms)if(entry.room===i)this.dynamicPlatforms.delete(id);this.scene.remove(g);this.rooms.delete(i);
  }
  updateRooms(min,max){const ahead=QUALITY[this.quality].ahead;min=Math.max(0,min);max=Math.max(min,max);this.roomWindow.min=min;this.roomWindow.max=max;for(let i=min;i<=max+ahead;i++)if(!this.rooms.has(i))this.makeRoom(i);for(const [i]of this.rooms)if(i<min||i>max+ahead)this.removeRoom(i);}
  releaseActor(id){const slot=this.actorSlots.get(id);if(!slot)return;this.scene.remove(slot.root);disposeCreature(slot.root);this.actorSlots.delete(id);if(this.monster===slot.root)this.monster=null;}
  createActor(id,typeId){
    const root=createCreature(typeId);applyCreatureWorldScale(root,MONSTER_PHYSICS[typeId]);root.userData.actorId=id;
    const slot={id,typeId,root,space:new CreatureSpace(),nextAnimation:-Infinity,nextRipple:0,animationCount:0};this.actorSlots.set(id,slot);this.scene.add(root);return slot;
  }
  setMonster(id){
    if(this.monsterId===id&&this.monster)return;
    for(const key of this.actorSlots.keys())this.releaseActor(key);
    const slot=this.createActor('@preview',id);this.monster=slot.root;this.monsterId=id;this.primaryActorId=slot.id;this.creatureSpace=slot.space;this.wake.reset();this.spray.visible=false;
  }
  setTorch(enabled){this.torchEnabled=enabled!==false;this.torch.visible=this.torchEnabled;this.torchLens.visible=this.torchEnabled;this.waterMaterial.uniforms.uTorchOn.value=this.torchEnabled?1:0;}
  updateActors(state,time,settings={}){
    const population=state.monsters?.length?state.monsters:state.monster?[state.monster]:[],q=QUALITY[this.quality],candidates=this.actorCandidates,selected=this.actorSelected;
    const actorId=m=>String(m.uid??m.actorId??m.id??'@legacy'),typeId=m=>m.typeId||m.monsterId||(MONSTER_PHYSICS[m.id]?m.id:null)||state.monsterId||this.monsterId;
    const primaryId=state.primaryMonsterId!=null?String(state.primaryMonsterId):state.monster?actorId(state.monster):null;
    this.populationCount=population.length;candidates.length=0;selected.clear();this.camera.updateMatrixWorld(true);this.actorProjection.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse);this.actorFrustum.setFromProjectionMatrix(this.actorProjection);
    for(const m of population){
      const id=actorId(m),type=typeId(m),distance=Math.hypot(m.x-this.camera.position.x,m.z-this.camera.position.z),primary=id===primaryId;
      if(!primary&&distance>q.actorDistance)continue;
      this.actorSphere.center.set(m.x,m.y+1.5,m.z);this.actorSphere.radius=Math.max(4,(MONSTER_PHYSICS[type]?.radius||2)*2);
      const visible=primary||this.actorFrustum.intersectsSphere(this.actorSphere);if(!visible)continue;
      candidates.push({m,id,type,distance,primary,score:primary?-Infinity:distance*(this.actorSlots.has(id)?.85:1)});
    }
    candidates.sort((a,b)=>a.score-b.score||a.id.localeCompare(b.id));candidates.length=Math.min(candidates.length,q.actors);
    for(const c of candidates)selected.add(c.id);for(const id of this.actorSlots.keys())if(!selected.has(id))this.releaseActor(id);
    for(const c of candidates){
      let slot=this.actorSlots.get(c.id);if(slot&&slot.typeId!==c.type){this.releaseActor(c.id);slot=null;}if(!slot)slot=this.createActor(c.id,c.type);
      const {root,space}=slot,m=c.m;root.visible=true;root.position.set(m.x,m.y-root.userData.waterlineOffset,m.z);root.rotation.y=m.yaw||0;
      if(c.primary||c.distance<14||time>=slot.nextAnimation||time<slot.lastAnimation){
        const context=space.sample(m,this.seed,this.difficulty,state.time,MONSTER_PHYSICS[c.type],state);animateCreature(root,time,m.state==='shore'?'pursue':m.state,Math.min(1.5,Math.max(0,context.motionSpeed/4)),context);slot.animationCount++;slot.lastAnimation=time;slot.nextAnimation=time+1/q.animationHz;
      }
      // Secondary actors share the existing ring pool; only the primary owns spray.
      if(!c.primary&&m.speed>.3&&(m.state==='pursue'||m.state==='shore')&&time>=slot.nextRipple){this.addRipple(m.x,m.z,false,.12,1.25,m.yaw||0);slot.nextRipple=time+.85;}
    }
    const primary=candidates.find(c=>c.primary)||candidates[0],slot=primary&&this.actorSlots.get(primary.id);this.primaryActorId=slot?.id??null;this.monster=slot?.root??null;
    if(slot){this.monsterId=slot.typeId;this.creatureSpace=slot.space;}
  }
  prepareScare(id,options={}){if(!this.scareStage)this.scareStage=new LiveScareStage(this.renderer);this.scareStage.prepare(id,this.camera.aspect,options);}
  scareView(death=null){
    const camera=this.camera.clone(),p=death?.player,m=death?.monster;
    if(p)camera.position.set(p.x,p.y+CONFIG.eyeHeight,p.z);
    if(m&&Math.hypot(m.x-camera.position.x,m.z-camera.position.z)>.1)camera.lookAt(m.x,camera.position.y-.12,m.z);
    else camera.rotation.x=Math.max(-.08,Math.min(.08,camera.rotation.x));
    camera.rotation.z=0;camera.updateMatrixWorld(true);
    return {scene:this.scene,camera,hide:[...Array.from(this.actorSlots.values(),slot=>slot.root),this.spray,this.torchProp,...this.avatars.values()]};
  }
  beginScare(id,death=null,options={}){return this.scareStage?.begin(id,this.camera.aspect,this.scareView(death),options)||false;}
  renderReducedScareBackdrop(death){const view=this.scareView(death),visible=view.hide.map(o=>o?.visible);try{for(const o of view.hide)if(o)o.visible=false;this.renderer.render(view.scene,view.camera);}finally{view.hide.forEach((o,i)=>{if(o)o.visible=visible[i];});}}

  renderScare(elapsed,shake){return this.scareStage?.render(elapsed,this.camera.aspect,shake);}
  endScare(){this.scareStage?.end();}
  clearScareAssets(){this.scareStage?.dispose();}
  setSettings(s){
    const next=QUALITY[s.quality]?s.quality:this.quality,changed=next!==this.quality;this.quality=next;this.camera.fov=+s.fov||78;this.resize();
    // Brightness changes exposure and water together; it never rebuilds rooms.
    this.brightness=Number.isFinite(+s.brightness)?Math.max(.75,Math.min(1.4,+s.brightness)):this.brightness;
    this.renderer.toneMappingExposure=.88*this.brightness;this.waterMaterial.uniforms.uBrightness.value=this.brightness;
    this.renderer.shadowMap.enabled=false;this.waterMaterial.uniforms.uDetail.value=next==='low'?0:1;this.scene.fog.density=next==='low'?.072:next==='medium'?.068:.064;this.setTorch(s.torch??this.torchEnabled);
    for(const id of [...this.actorSlots.keys()].filter(id=>id!==this.primaryActorId).reverse())if(this.actorSlots.size>QUALITY[next].actors)this.releaseActor(id);
    this.sprayGeometry.setDrawRange(0,QUALITY[next].spray);
    if(changed){const {min,max}=this.roomWindow;for(const [i]of this.rooms)this.removeRoom(i);this.updateRooms(min,max);if(next!=='high'&&this.sun.shadow.map){this.sun.shadow.map.dispose();this.sun.shadow.map=null;}}
  }
  avatar(p){
    const group=new THREE.Group(),color=new THREE.Color().setHSL((p.id.charCodeAt(0)%16)/16,.42,.55);const suit=new THREE.MeshStandardMaterial({color,roughness:.65});
    const torso=new THREE.Mesh(new RoundedBoxGeometry(.56,.73,.32,2,.12),suit);torso.position.y=1.02;group.add(torso);
    const skin=new THREE.MeshStandardMaterial({color:0xe9cba7,roughness:.7});const head=new THREE.Mesh(new THREE.SphereGeometry(.235,16,12),skin);head.scale.set(.92,1.1,.92);head.position.y=1.58;group.add(head);
    const limbs=[];for(const side of [-1,1]){
      for(const arm of [true,false]){let limb=new THREE.Mesh(new RoundedBoxGeometry(arm?.18:.21,arm?.64:.67,.23,2,.08),arm?suit:new THREE.MeshStandardMaterial({color:0x254651,roughness:.7}));limb.position.set(side*(arm?.38:.15),arm?1.02:.36,0);group.add(limb);limbs.push(limb);}
    }
    group.userData.limbs=limbs;this.scene.add(group);this.avatars.set(p.id,group);return group;
  }
  retireRipple(index){const ripple=this.ripples[index];this.scene.remove(ripple.mesh);this.ripples[index]=this.ripples[this.ripples.length-1];this.ripples.pop();this.ripplePool.push(ripple);}
  addRipple(x,z,big=false,opacity=.65,stretch=1,yaw=0){
    if(this.ripples.length>=QUALITY[this.quality].ripples)this.retireRipple(0);
    const ripple=this.ripplePool.pop();if(!ripple)return;
    ripple.age=0;ripple.big=big;ripple.opacity=opacity;ripple.stretch=stretch;ripple.mesh.scale.set(1,stretch,1);ripple.mesh.rotation.z=yaw;ripple.mesh.material.opacity=opacity;ripple.mesh.position.set(x,CONFIG.waterY+.045,z);this.scene.add(ripple.mesh);this.ripples.push(ripple);
  }
  update(dt,time,state,player,settings={},playing=false,frameDt=dt,threat=null){
    this.waterMaterial.uniforms.uTime.value=time;
    if(playing&&state){
      const idx=roomIndexAt(player?.z||0);this.updateRooms(Math.max(0,idx-1),idx);this.updatePlatforms(state,state.platformTime??state.time);
      if(player){
        const bob=settings.bob&&player.grounded&&Math.hypot(player.vx,player.vz)>.5?Math.sin(time*10)*.025:0;
        const target=this.targetPosition.set(player.x,player.y+CONFIG.eyeHeight+bob,player.z);
        if(!this.cameraReady){this.baseCameraPosition.copy(target);this.cameraReady=true;}else this.baseCameraPosition.lerp(target,1-Math.exp(-dt*40));
        this.camera.position.copy(this.baseCameraPosition);
        this.camera.rotation.set(player.pitch||0,player.yaw||0,0,'YXZ');
        if(settings.shake&&threat?.active){const strength=threat.intensity*threat.motion,beat=threat.pulse,phase=threat.tremorPhase;this.camera.position.x+=Math.sin(phase*1.17)*.009*strength;this.camera.position.y+=Math.sin(phase*.91)*.007*strength+beat*.012;this.camera.rotation.z=Math.sin(phase)*.010*strength+Math.sin(phase*.57)*beat*.003;}
        this.sun.position.set(player.x-8,14,player.z+4);this.sun.target.position.set(player.x,0,player.z-12);
      }
      const ids=this.avatarIds;ids.clear();for(const p of state.players||[]){if(p.id===player?.id)continue;ids.add(p.id);const a=this.avatars.get(p.id)||this.avatar(p);a.visible=p.alive;a.position.lerp(this.targetPosition.set(p.x,p.y,p.z),1-Math.exp(-dt*15));a.rotation.y=p.yaw||0;for(let k=0;k<a.userData.limbs.length;k++)a.userData.limbs[k].rotation.x=Math.sin(time*9+k*Math.PI)*Math.min(Math.hypot(p.vx,p.vz)*.065,.35);}
      for(const [id,a]of this.avatars)if(!ids.has(id)){this.scene.remove(a);a.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});this.avatars.delete(id);}
      this.updateActors(state,time,settings);
    }else{
      this.updatePlatforms(null,time);
      const angle=Math.sin(time*.035)*.08;this.camera.position.set(7.6+angle,2.55,1.8);this.camera.lookAt(1.4,1.45,-11.5);this.sun.position.set(-8,14,0);this.sun.target.position.set(0,0,-12);
      for(const slot of this.actorSlots.values())slot.root.visible=slot.root===this.monster;
      if(!this.monster)this.setMonster(this.monsterId||'dredge');
      if(this.monster){this.monster.visible=true;if(this.monster.visible){const m=this.monster.position.set(4.5+Math.sin(time*.2)*.4,(MONSTER_PHYSICS[this.monsterId]?.surfaceY??1.28)-this.monster.userData.waterlineOffset,-12),context=this.creatureSpace.sample(m,this.seed,this.difficulty,time,MONSTER_PHYSICS[this.monsterId]);this.monster.rotation.y=.25;animateCreature(this.monster,time,'patrol',.15,context);}}
      for(const a of this.avatars.values())a.visible=false;
    }
    if(settings.torch!==undefined&&settings.torch!==this.torchEnabled)this.setTorch(settings.torch);this.camera.updateMatrixWorld(true);this.torch.getWorldPosition(this.torchWorldPosition);this.torchTarget.getWorldPosition(this.torchWorldTarget);this.torchDirection.subVectors(this.torchWorldTarget,this.torchWorldPosition).normalize();
    const wake=this.wake.update(dt,playing?state?.monster:null,state?.time,QUALITY[this.quality].spray);this.spray.visible=wake.active>0;
    if(wake.ripple)this.addRipple(wake.rippleX,wake.rippleZ,wake.ripple===2,wake.ripple===2?.43:.07,wake.ripple===2?1.65:1,wake.rippleYaw);
    if(this.spray.visible){this.sprayGeometry.attributes.position.needsUpdate=true;this.sprayGeometry.attributes.aAlpha.needsUpdate=true;this.sprayGeometry.attributes.aSize.needsUpdate=true;}
    for(let i=this.ripples.length-1;i>=0;i--){let r=this.ripples[i];r.age+=dt;const scale=1+r.age*(r.big?8:5);r.mesh.scale.set(scale,scale*r.stretch,1);r.mesh.material.opacity=Math.max(0,r.opacity*(1-r.age/1.5));if(r.age>1.5)this.retireRipple(i);}
    this.renderer.render(this.scene,this.camera);
    this.frameTotal-=this.frameStats[this.frameIndex];this.frameStats[this.frameIndex]=Number.isFinite(frameDt)?Math.max(0,frameDt):0;this.frameTotal+=this.frameStats[this.frameIndex];this.frameIndex=(this.frameIndex+1)%this.frameStats.length;this.frameCount=Math.min(this.frameCount+1,this.frameStats.length);
  }
  dispose(){
    this.scareStage?.dispose();for(const id of this.actorSlots.keys())this.releaseActor(id);for(const id of this.rooms.keys())this.removeRoom(id);
    const geometries=new Set(),materials=new Set(),textures=new Set();this.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])materials.add(m);});
    for(const r of [...this.ripples,...this.ripplePool])materials.add(r.mesh.material);geometries.add(this.rippleGeometry);
    for(const route of Object.values(this.routeMaterials))for(const m of Object.values(route))if(m?.isMaterial)materials.add(m);
    for(const palette of Object.values(this.palettes))for(const m of Object.values(palette))materials.add(m);
    for(const key of ['trim','challengeTile','challengeTrim','lamp','warmLamp','routeMarker','challengeMarker','detourLabel','longJumpLabel','waterMaterial','sprayMaterial','checkpointTrim','checkpointLabel','sinkTile','sinkLabel','spinnerLabel'])materials.add(this[key]);
    for(const m of materials){if(m.map)textures.add(m.map);m.dispose();}for(const g of geometries)g.dispose();for(const t of textures)t.dispose();window.removeEventListener?.('resize',this.resize);this.renderer.dispose?.();this.scene.clear();this.avatars.clear();this.ripples.length=this.ripplePool.length=0;
  }
  stats(){return {fps:this.frameTotal>0?Math.round(this.frameCount/this.frameTotal):0,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,rooms:this.rooms.size,pixelRatio:this.renderer.getPixelRatio(),quality:this.quality,worldMonsters:this.populationCount,renderedMonsters:this.actorSlots.size,monsterCap:QUALITY[this.quality].actors,dynamicPlatforms:this.dynamicPlatforms.size,spotLights:this.torch.visible?1:0,pointLights:0};}
}
