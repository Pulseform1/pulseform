// 3D side of Ninth Bell: renderer, characters, Shadows, the Tower, the battle stage and effects.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {VRMLoaderPlugin, VRMUtils} from '@pixiv/three-vrm';
import {retarget} from './mixamo.js';
import {ANIMS, CAST, COLORS, EL_COLOR, LOOKS} from './data.js';

// ───────────────────────── RENDERER & LOOP ─────────────────────────
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
const MOBILE = matchMedia('(pointer:coarse)').matches;
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
export const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(new THREE.Scene(), camera);
const bloom = new UnrealBloomPass(new THREE.Vector2(256,256), 0.6, 0.45, 1.0);
composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(new OutputPass());

function resize(){
  const w=innerWidth, h=innerHeight;
  renderer.setSize(w,h,false); composer.setSize(w,h);
  camera.aspect=w/h; camera.fov = camera.aspect<1 ? 68 : 50; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

let view = null;
export function setView(v){ view = v; renderPass.scene = v.scene; v.onShow?.(); }
const clock = new THREE.Clock();
let shake = 0;
const tweens = [], fxList = [];
function frame(){
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  for(let i=tweens.length-1;i>=0;i--){
    const tw=tweens[i]; tw.t+=dt; const k=Math.min(1, tw.t/tw.dur);
    tw.fn(tw.ease(k)); if(k>=1){ tweens.splice(i,1); tw.res(); }
  }
  if(!view) return;
  view.update(dt);
  for(let i=fxList.length-1;i>=0;i--){
    const f=fxList[i];
    if(!f.update(dt)){ fxList.splice(i,1); f.obj?.parent?.remove(f.obj); f.dispose?.(); }
  }
  if(shake>0){
    camera.position.x += (Math.random()-.5)*shake; camera.position.y += (Math.random()-.5)*shake;
    shake = Math.max(0, shake - dt*2.5);
  }
  composer.render();
}
requestAnimationFrame(frame);

const easeInOut = k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
const easeOut = k=>1-Math.pow(1-k,3);
export function tween(dur, fn, ease=easeInOut){ return new Promise(res=>tweens.push({t:0,dur:Math.max(dur,1e-3),fn,ease,res})); }
export const wait = s=>tween(s,()=>{});
export function shakeCam(a=0.25){ shake=Math.max(shake,a); }
function addFx(f){ if(f.obj) view.scene.add(f.obj); fxList.push(f); return f; }
const glow = (hex,k=2.5)=>new THREE.Color(hex).multiplyScalar(k);
const rnd = (a,b)=>a+Math.random()*(b-a);

// ───────────────────────── TEXTURES ─────────────────────────
function canvasTex(w,h,draw,repeat){
  const c=document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4;
  if(repeat){ t.wrapS=t.wrapT=THREE.RepeatWrapping; }
  return t;
}
const DOT = canvasTex(64,64,(g)=>{ const r=g.createRadialGradient(32,32,0,32,32,32); r.addColorStop(0,'#fff'); r.addColorStop(.35,'rgba(255,255,255,.6)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=r; g.fillRect(0,0,64,64); });
const PUFF = canvasTex(64,64,(g)=>{ const r=g.createRadialGradient(32,32,4,32,32,32); r.addColorStop(0,'rgba(235,230,245,1)'); r.addColorStop(.6,'rgba(180,170,200,.8)'); r.addColorStop(1,'rgba(120,110,140,0)'); g.fillStyle=r; g.fillRect(0,0,64,64); });

// ───────────────────────── CHARACTERS ─────────────────────────
class Char {
  constructor(id, vrm, clips){
    this.id=id; this.vrm=vrm;
    this.root=new THREE.Group(); this.root.add(vrm.scene);
    this.mixer=new THREE.AnimationMixer(vrm.scene);
    this.actions={}; for(const k in clips) this.actions[k]=this.mixer.clipAction(clips[k]);
    this.pending=new Map(); this.cur=null;
    this.mixer.addEventListener('finished', e=>{ const r=this.pending.get(e.action); if(r){ this.pending.delete(e.action); r(); } });
    const ring=new THREE.Mesh(new THREE.RingGeometry(0.42,0.52,40), new THREE.MeshBasicMaterial({color:glow(COLORS[id]||'#fff',1.1), transparent:true, opacity:.6, blending:THREE.AdditiveBlending, depthWrite:false}));
    ring.rotation.x=-Math.PI/2; ring.position.y=0.02; this.ring=ring; this.root.add(ring);
    this.root.add(blobShadow(0.5));
    const h=vrm.humanoid.getNormalizedBoneNode('head').getWorldPosition(new THREE.Vector3()).y;
    this.height = h + 0.25;
  }
  play(name, {once=false, fade=0.22, speed=1}={}){
    const a=this.actions[name]; if(!a) return Promise.resolve();
    for(const [act,res] of this.pending) if(act!==a){ this.pending.delete(act); res(); }
    if(this.cur===a && !once){ a.setEffectiveTimeScale(speed); return Promise.resolve(); }
    a.reset(); a.enabled=true; a.setEffectiveTimeScale(speed); a.setEffectiveWeight(1);
    a.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat, Infinity); a.clampWhenFinished=once;
    if(this.cur && this.cur!==a) a.crossFadeFrom(this.cur, fade, false);
    a.play(); this.cur=a;
    if(!once) return Promise.resolve();
    return new Promise(res=>{
      this.pending.set(a,res);
      setTimeout(()=>{ if(this.pending.get(a)===res){ this.pending.delete(a); res(); } }, (a.getClip().duration/speed)*1000+600);
    });
  }
  async oneShot(name, back='battle_idle', opts={}){ await this.play(name,{once:true,...opts}); if(back) this.play(back); }
  update(dt){ this.mixer.update(dt); this.vrm.update(dt); }
  face(x,z){ this.root.rotation.y=Math.atan2(x-this.root.position.x, z-this.root.position.z); }
}
function blobShadow(r){
  const m=new THREE.Mesh(new THREE.CircleGeometry(r,24), new THREE.MeshBasicMaterial({color:0x000000, transparent:true, opacity:.5, depthWrite:false}));
  m.rotation.x=-Math.PI/2; m.position.y=0.01; return m;
}

export const chars = {};
export const customModels = {};
async function charUrl(id){
  const url=`assets/characters/${id}.vrm`;
  try{
    const r=await fetch(url,{method:'HEAD'});
    if(r.ok && !(r.headers.get('content-type')||'').includes('html')) return url;
  }catch(e){}
  return null;
}
export async function loadAll(progress){
  THREE.Cache.enabled = true;
  const fbxLoader=new FBXLoader();
  const gltf=new GLTFLoader(); gltf.register(p=>new VRMLoaderPlugin(p));
  const urls={};
  for(const id of CAST){ urls[id]=await charUrl(id); customModels[id]=!!urls[id]; }
  const ids=CAST.filter(id=>id!=='mira' || urls[id]);   // Mira only appears in 3D once she has her own model
  const total=ANIMS.length+ids.length; let done=0;
  const step=(label)=>progress(++done/total, label);
  const fbx={};
  for(const a of ANIMS){ fbx[a]=await fbxLoader.loadAsync(`assets/anims/${a}.fbx`); step(`Animation: ${a}`); }
  for(const id of ids){
    const g=await gltf.loadAsync(urls[id]||'assets/characters/placeholder.vrm');
    const vrm=g.userData.vrm;
    VRMUtils.removeUnnecessaryVertices(g.scene);
    VRMUtils.combineSkeletons(g.scene);
    VRMUtils.rotateVRM0(vrm);
    vrm.scene.traverse(o=>{ o.frustumCulled=false; });
    vrm.scene.updateMatrixWorld(true);
    const clips={}; for(const a of ANIMS) clips[a]=retarget(fbx[a], vrm, a);
    chars[id]=new Char(id, vrm, clips);
    step(`Character: ${id}`);
  }
}

// ───────────────────────── SHADOWS (ENEMIES) ─────────────────────────
export function makeShadow(name){
  const L = LOOKS[name] || LOOKS['Gloom Slime'];
  const g=new THREE.Group(), body=new THREE.Group(); g.add(body);
  const mat=new THREE.MeshStandardMaterial({color:0x020104, roughness:.3, metalness:.4, emissive:new THREE.Color(L.aura), emissiveIntensity:.22});
  const geo=new THREE.IcosahedronGeometry(0.7,3);
  const blob=new THREE.Mesh(geo,mat); blob.scale.set(1,L.stretch,1); blob.position.y=0.7*L.stretch; body.add(blob);
  const base=geo.attributes.position.array.slice();
  const maskY=0.75*L.stretch+0.25;
  const mask=new THREE.Mesh(new THREE.SphereGeometry(0.4,24,12,0,Math.PI*2,0,Math.PI*.5),
    new THREE.MeshStandardMaterial({color:L.mask, roughness:.3, metalness:.1, side:THREE.DoubleSide}));
  mask.rotation.x=Math.PI/2; mask.scale.set(1.15,0.45,1.4); mask.position.set(0,maskY,0.5); body.add(mask);
  const eyeMat=new THREE.MeshBasicMaterial({color:glow(L.eye,4)});
  for(const s of [-1,1]){
    const eye=new THREE.Mesh(new THREE.SphereGeometry(0.065,10,8), eyeMat); eye.scale.set(1.5,0.7,0.6);
    eye.position.set(0.13*s, maskY+0.06, 0.66); body.add(eye);
  }
  for(let i=0;i<L.horns;i++){
    const a=(i/(L.horns))*Math.PI*2 + (L.horns%2? Math.PI/2:0);
    const horn=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.45,8), mat);
    horn.position.set(Math.cos(a)*0.35, 1.35*L.stretch, Math.sin(a)*0.25); horn.rotation.z=-Math.cos(a)*0.5; horn.rotation.x=Math.sin(a)*0.5;
    body.add(horn);
  }
  const tendrils=[];
  for(let i=0;i<6;i++){
    const t=new THREE.Mesh(new THREE.SphereGeometry(0.16,10,8), mat);
    t.userData={a:i/6*Math.PI*2, r:0.75+Math.random()*.15, s:0.8+Math.random()*.6, y:0.15+Math.random()*.25};
    body.add(t); tendrils.push(t);
  }
  // rising aura
  const N=28, pg=new THREE.BufferGeometry(), pp=new Float32Array(N*3), life=new Float32Array(N);
  for(let i=0;i<N;i++){ life[i]=Math.random(); }
  pg.setAttribute('position', new THREE.BufferAttribute(pp,3));
  const aura=new THREE.Points(pg,new THREE.PointsMaterial({map:DOT,color:glow(L.aura,3),size:0.28,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  body.add(aura);
  g.add(blobShadow(0.7));
  g.scale.setScalar(L.scale);
  let t=Math.random()*10, flash=0;
  g.userData={
    height:(1.5*L.stretch+0.3)*L.scale, mat, body,
    flash(){ flash=1; },
    update(dt){
      t+=dt;
      const p=geo.attributes.position.array;
      for(let i=0;i<p.length;i+=3){
        const k=1+0.07*Math.sin(t*3+base[i]*5+base[i+1]*4)+0.05*Math.sin(t*5+base[i+2]*6);
        p[i]=base[i]*k; p[i+1]=base[i+1]*k; p[i+2]=base[i+2]*k;
      }
      geo.attributes.position.needsUpdate=true;
      body.position.y = L.float ? 0.25+Math.sin(t*2)*0.12 : 0;
      for(const td of tendrils){ const u=td.userData; const a=u.a+t*u.s; td.position.set(Math.cos(a)*u.r, u.y+Math.sin(t*3+u.a)*.1, Math.sin(a)*u.r); }
      for(let i=0;i<N;i++){
        life[i]+=dt*0.6; if(life[i]>1){ life[i]=0; pp[i*3]=rnd(-.5,.5); pp[i*3+2]=rnd(-.5,.5); }
        pp[i*3+1]=life[i]*1.8*L.stretch;
      }
      pg.attributes.position.needsUpdate=true;
      if(flash>0){ flash=Math.max(0,flash-dt*4); mat.emissive.set(L.aura).lerp(new THREE.Color('#ffffff'), flash); mat.emissiveIntensity=.22+flash*3; }
    },
  };
  return g;
}

// ───────────────────────── EFFECTS ─────────────────────────
export function burst({pos, color='#fff', count=40, speed=4, up=0, life=0.8, size=0.3, gravity=0, spread=0.3, tex=DOT, additive=true, k=2.5}){
  const geo=new THREE.BufferGeometry(), p=new Float32Array(count*3), v=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    p[i*3]=pos.x+rnd(-spread,spread); p[i*3+1]=pos.y+rnd(-spread,spread); p[i*3+2]=pos.z+rnd(-spread,spread);
    const d=new THREE.Vector3(rnd(-1,1),rnd(-1,1),rnd(-1,1)).normalize().multiplyScalar(speed*rnd(.3,1));
    v[i*3]=d.x; v[i*3+1]=d.y+up; v[i*3+2]=d.z;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(p,3));
  const mat=new THREE.PointsMaterial({map:tex,color:additive?glow(color,k):new THREE.Color(color),size,transparent:true,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending});
  let t=0;
  return addFx({obj:new THREE.Points(geo,mat), update(dt){
    t+=dt;
    for(let i=0;i<count;i++){ v[i*3+1]-=gravity*dt; p[i*3]+=v[i*3]*dt; p[i*3+1]+=v[i*3+1]*dt; p[i*3+2]+=v[i*3+2]*dt; v[i*3]*=.97; v[i*3+2]*=.97; }
    geo.attributes.position.needsUpdate=true; mat.opacity=Math.max(0,1-t/life);
    return t<life;
  }, dispose(){ geo.dispose(); mat.dispose(); }});
}
function meshFx(mesh, life, fn){
  let t=0;
  return addFx({obj:mesh, update(dt){ t+=dt; fn(Math.min(1,t/life), mesh); return t<life; }, dispose(){ mesh.geometry?.dispose(); mesh.material?.dispose?.(); }});
}
function addMat(color,k=2.5){ return new THREE.MeshBasicMaterial({color:glow(color,k), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide}); }

export function elementFx(el, pos, scale=1){
  const c=EL_COLOR[el]||'#fff';
  if(el==='phys'){
    const arc=new THREE.Mesh(new THREE.RingGeometry(0.9*scale,1.08*scale,32,1,0,Math.PI*.95), addMat('#fff4d6',3));
    arc.position.copy(pos); arc.rotation.set(rnd(-.4,.4), rnd(-.6,.6), rnd(0,Math.PI*2));
    meshFx(arc, .28, (k,m)=>{ m.scale.setScalar(.6+k*.8); m.material.opacity=1-k; });
    burst({pos, color:c, count:24, speed:6, life:.35, size:.18});
  } else if(el==='fire'){
    const ball=new THREE.Mesh(new THREE.SphereGeometry(0.5*scale,20,14), addMat('#ff5a0f',1.15));
    ball.position.copy(pos); meshFx(ball, .5, (k,m)=>{ m.scale.setScalar(.4+k*2.4); m.material.opacity=1-k; });
    burst({pos, color:'#ff6a1f', count:70, speed:3.5*scale, up:2.5, life:.9, size:.4, k:1.6});
    burst({pos, color:'#ffb02f', count:30, speed:5, life:.5, size:.18, k:1.8});
  } else if(el==='ice'){
    for(let i=0;i<7;i++){
      const a=i/7*Math.PI*2, r=rnd(.2,.8)*scale;
      const cr=new THREE.Mesh(new THREE.ConeGeometry(.16*scale,rnd(1,1.7)*scale,6), new THREE.MeshStandardMaterial({color:'#bff6ff', emissive:new THREE.Color('#3ee6ff'), emissiveIntensity:1.6, transparent:true, roughness:.1}));
      cr.position.set(pos.x+Math.cos(a)*r, 0, pos.z+Math.sin(a)*r); cr.rotation.set(rnd(-.4,.4),0,rnd(-.4,.4));
      meshFx(cr, .9, (k,m)=>{ m.scale.set(1, k<.25? k/.25 : 1, 1); m.position.y = (k<.25? k/.25:1)*0.4*scale; m.material.opacity = k>.7 ? 1-(k-.7)/.3 : 1; });
    }
    burst({pos, color:'#bff6ff', count:50, speed:4, life:.7, size:.22});
  } else if(el==='elec'){
    const pts=12, geo=new THREE.BufferGeometry(), arr=new Float32Array(pts*3);
    geo.setAttribute('position', new THREE.BufferAttribute(arr,3));
    const line=new THREE.Line(geo, new THREE.LineBasicMaterial({color:glow('#fff7a0',5), transparent:true}));
    let acc=0;
    const zap=()=>{ for(let i=0;i<pts;i++){ const k=i/(pts-1); arr[i*3]=pos.x+(i&&i<pts-1?rnd(-.5,.5):0); arr[i*3+1]=pos.y+(1-k)*9; arr[i*3+2]=pos.z+(i&&i<pts-1?rnd(-.5,.5):0); } geo.attributes.position.needsUpdate=true; };
    zap();
    let t=0; addFx({obj:line, update(dt){ t+=dt; acc+=dt; if(acc>.04){acc=0; zap();} line.material.opacity=t<.35?1:Math.max(0,1-(t-.35)/.2); return t<.55; }, dispose(){ geo.dispose(); line.material.dispose(); }});
    burst({pos, color:'#ffe14d', count:50, speed:6, life:.5, size:.22});
  } else if(el==='wind'){
    for(let i=0;i<3;i++){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(0.7*scale,.035,6,40), addMat('#9dffc8',2.2));
      ring.rotation.x=Math.PI/2; ring.position.copy(pos); ring.position.y=0.2;
      meshFx(ring, .9, (k,m)=>{ m.position.y=0.2+k*2.2*scale+i*.3; m.scale.setScalar(1+k*(1+i*.4)); m.rotation.z+=.3; m.material.opacity=1-k; });
    }
    burst({pos, color:'#7dffb0', count:50, speed:3, up:2, life:.8, size:.25});
  } else if(el==='heal'){
    const ring=new THREE.Mesh(new THREE.RingGeometry(.5,.6,40), addMat('#6dff9e',2));
    ring.rotation.x=-Math.PI/2; ring.position.set(pos.x,0.05,pos.z);
    meshFx(ring, .8, (k,m)=>{ m.scale.setScalar(1+k*1.5); m.material.opacity=1-k; });
    burst({pos:new THREE.Vector3(pos.x,0.3,pos.z), color:'#6dff9e', count:40, speed:.6, up:2.2, life:1.1, size:.25, spread:.5});
  }
}

function cardTexture(title, sub, color){
  return canvasTex(256,420,(g,w,h)=>{
    const gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#0b0617'); gr.addColorStop(1,color);
    g.fillStyle=gr; g.fillRect(0,0,w,h);
    g.strokeStyle='#ffffff'; g.lineWidth=8; g.strokeRect(12,12,w-24,h-24);
    g.strokeStyle=color; g.lineWidth=3; g.strokeRect(26,26,w-52,h-52);
    g.fillStyle='#fff'; g.textAlign='center';
    g.font='bold 30px system-ui,sans-serif'; g.fillText(sub.toUpperCase(), w/2, 72);
    g.beginPath(); g.arc(w/2, h/2, 70, 0, Math.PI*2); g.lineWidth=5; g.strokeStyle='#fff'; g.stroke();
    g.beginPath(); for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; g.moveTo(w/2,h/2); g.lineTo(w/2+Math.cos(a)*100,h/2+Math.sin(a)*100); } g.stroke();
    g.font='italic 900 34px system-ui,sans-serif'; g.fillText(title.toUpperCase(), w/2, h-60);
  });
}
// Tarot card spins in over the summoner, then shatters into light.
export async function summonFx(pos, title, sub, color){
  const mat=new THREE.MeshBasicMaterial({map:cardTexture(title,sub,color), transparent:true, side:THREE.DoubleSide, depthWrite:false});
  const card=new THREE.Mesh(new THREE.PlaneGeometry(.8,1.3), mat);
  mat.side=THREE.FrontSide;
  const back=new THREE.Mesh(card.geometry, new THREE.MeshBasicMaterial({color:glow(color,1.2), side:THREE.FrontSide}));
  back.rotation.y=Math.PI; card.add(back);   // plain back face so the text never shows mirrored mid-spin
  card.position.set(pos.x, pos.y+2.3, pos.z);
  view.scene.add(card);
  await tween(.45, k=>{ card.rotation.y=(1-k)*Math.PI*4; card.scale.setScalar(.2+k*.8); card.lookAt(camera.position.x, card.position.y, camera.position.z); card.rotateY((1-k)*Math.PI*4); }, easeOut);
  await wait(.15);
  card.parent.remove(card); mat.map.dispose(); mat.dispose(); back.material.dispose(); card.geometry.dispose();
  burst({pos:card.position, color:'#9fd8ff', count:90, speed:5, life:.8, size:.22});
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.6,.9,9,24,1,true), addMat(color,2));
  beam.position.set(pos.x, 4.5, pos.z);
  meshFx(beam, .7, (k,m)=>{ m.scale.set(1-k*.7,1,1-k*.7); m.material.opacity=(1-k)*.8; });
  shakeCam(.12);
}
export function dustCloud(center, dur=1.6){
  const N=60, geo=new THREE.BufferGeometry(), p=new Float32Array(N*3), seed=[];
  for(let i=0;i<N;i++) seed.push([rnd(0,Math.PI*2), rnd(.5,2.6), rnd(.2,2.4), rnd(1,3)]);
  geo.setAttribute('position', new THREE.BufferAttribute(p,3));
  const mat=new THREE.PointsMaterial({map:PUFF, size:1.8, transparent:true, depthWrite:false, color:'#d9d2e6'});
  let t=0, acc=0;
  addFx({obj:new THREE.Points(geo,mat), update(dt){
    t+=dt; acc+=dt;
    for(let i=0;i<N;i++){ const s=seed[i]; const a=s[0]+t*s[3]; p[i*3]=center.x+Math.cos(a)*s[1]; p[i*3+1]=s[2]+Math.sin(t*4+i)*.2; p[i*3+2]=center.z+Math.sin(a)*s[1]*.6; }
    geo.attributes.position.needsUpdate=true;
    mat.opacity = t>dur-.3 ? Math.max(0,(dur-t)/.3) : 1;
    if(acc>.12){ acc=0; const q=new THREE.Vector3(center.x+rnd(-2,2), rnd(.5,2.5), center.z+rnd(-1,1));
      if(Math.random()<.5) elementFx('phys', q, .8); else burst({pos:q, color:'#ffd23f', count:14, speed:5, life:.35, size:.3}); }
    return t<dur;
  }, dispose(){ geo.dispose(); mat.dispose(); }});
}

// ───────────────────────── DOM OVERLAYS ─────────────────────────
const fxLayer=document.getElementById('fx');
export function toScreen(v){
  const p=v.clone().project(camera);
  return {x:(p.x+1)/2*innerWidth, y:(1-p.y)/2*innerHeight, behind:p.z>1};
}
export function popup(text, worldPos, cls=''){
  const s=toScreen(worldPos); if(s.behind) return;
  const d=document.createElement('div'); d.className='pop '+cls; d.textContent=text;
  d.style.left=s.x+'px'; d.style.top=s.y+'px';
  fxLayer.append(d); setTimeout(()=>d.remove(), 1300);
}
export function cutIn(name, color, sub='ONE MORE!'){
  const d=document.createElement('div'); d.className='cutin';
  d.style.setProperty('--c', color);
  d.innerHTML=`<div class="stripe"></div><div class="who">${name}</div><div class="sub">${sub}</div>`;
  fxLayer.append(d);
  return new Promise(r=>setTimeout(()=>{ d.remove(); r(); }, 1100));
}
export function banner(text, cls='', ms=1200){
  const d=document.createElement('div'); d.className='banner '+cls; d.innerHTML=`<span>${text}</span>`;
  fxLayer.append(d);
  return new Promise(r=>setTimeout(()=>{ d.remove(); r(); }, ms));
}

// ───────────────────────── SKY / ENVIRONMENT HELPERS ─────────────────────────
function skyDome(top, bottom){
  const mat=new THREE.ShaderMaterial({side:THREE.BackSide, depthWrite:false, fog:false,
    uniforms:{top:{value:new THREE.Color(top)}, bottom:{value:new THREE.Color(bottom)}},
    vertexShader:'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader:'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float k=smoothstep(-.1,.6,vP.y); gl_FragColor=vec4(mix(bottom,top,k),1.); }'});
  const m=new THREE.Mesh(new THREE.SphereGeometry(300,32,16), mat); return m;
}
function moon(pos, r=8){
  const m=new THREE.Mesh(new THREE.SphereGeometry(r,32,16), new THREE.MeshBasicMaterial({color:glow('#f4f0ff',1.08), fog:false}));
  m.position.copy(pos);
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:DOT, color:glow('#b9a8ff',1.2), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false}));
  halo.material.opacity=.35; halo.scale.setScalar(r*5); m.add(halo); return m;
}
function starfield(n=500){
  const g=new THREE.BufferGeometry(), p=new Float32Array(n*3);
  for(let i=0;i<n;i++){ const v=new THREE.Vector3(rnd(-1,1),rnd(.05,1),rnd(-1,1)).normalize().multiplyScalar(250); p.set([v.x,v.y,v.z],i*3); }
  g.setAttribute('position', new THREE.BufferAttribute(p,3));
  return new THREE.Points(g, new THREE.PointsMaterial({color:0xffffff, size:1.2, sizeAttenuation:false, fog:false}));
}
function city(){
  const grp=new THREE.Group(), N=70;
  const boxes=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color:0x0d0920, roughness:.9}), N);
  const win=[], m=new THREE.Matrix4();
  for(let i=0;i<N;i++){
    const a=i/N*Math.PI*2+rnd(-.03,.03), r=rnd(40,70), w=rnd(4,9), h=rnd(6,30);
    const x=Math.cos(a)*r, z=Math.sin(a)*r;
    m.compose(new THREE.Vector3(x,h/2-2,z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-a), new THREE.Vector3(w,h,w));
    boxes.setMatrixAt(i,m);
    for(let j=0;j<h*1.2;j++) if(Math.random()<.5){ const fa=a+rnd(-.04,.04); win.push(Math.cos(fa)*(r-w/2-.1), rnd(0,h-2), Math.sin(fa)*(r-w/2-.1)); }
  }
  grp.add(boxes);
  const g=new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(win),3));
  grp.add(new THREE.Points(g, new THREE.PointsMaterial({color:glow('#ffd27a',2), size:.35})));
  return grp;
}

// ───────────────────────── HUB BACKDROP ─────────────────────────
export const hub = (()=>{
  const scene=new THREE.Scene();
  const skyDay=skyDome('#2b1b4f','#ff7a59'), skyNight=skyDome('#04020c','#2a1150');
  scene.add(skyDay, skyNight, starfield(), city());
  const theMoon=moon(new THREE.Vector3(30,28,-120),7); scene.add(theMoon);
  scene.fog=new THREE.Fog(0x1a0d33, 30, 140);
  const hemi=new THREE.HemisphereLight(0xb9a8ff, 0x1a0d33, .7); scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffc2a0, 2.2); sun.position.set(-3,5,4); scene.add(sun);
  const rim=new THREE.DirectionalLight(0x3ee6ff, 1.5); rim.position.set(4,3,-5); scene.add(rim);
  // rooftop
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30), new THREE.MeshStandardMaterial({color:0x1c1830, roughness:.95}));
  floor.rotation.x=-Math.PI/2; scene.add(floor);
  const fence=new THREE.Group(); const rail=new THREE.MeshStandardMaterial({color:0x5a5470, metalness:.6, roughness:.4});
  for(let i=-12;i<=12;i++){ const p=new THREE.Mesh(new THREE.BoxGeometry(.06,1.4,.06), rail); p.position.set(i*.7,.7,-3.5); fence.add(p); }
  const top=new THREE.Mesh(new THREE.BoxGeometry(17,.08,.08), rail); top.position.set(0,1.4,-3.5); fence.add(top);
  scene.add(fence);
  let who=null, t=0;
  return {
    scene,
    set(time, id){
      const night = time!=='day';
      skyDay.visible=!night; skyNight.visible=night; theMoon.visible=night;
      sun.color.set(night?0xe0dcff:0xffc2a0); sun.intensity=night?1.7:2.2; hemi.intensity=night?.45:.7;
      scene.fog.color.set(night?0x0b0617:0x4a2a50);
      if(who) scene.remove(who.root);
      who = chars[id] || chars.mc;
      who.root.position.set(0,0,0); who.root.rotation.set(0,0,0); who.ring.visible=false;
      scene.add(who.root); who.play('idle');
    },
    update(dt){
      t+=dt; who?.update(dt);
      const wide = camera.aspect>1.1, tall = camera.aspect<1;
      const a=Math.sin(t*.15)*.35 - (wide?.35:0);
      // portrait: menus fill the lower half, so keep the character in the top half of the screen
      const target=new THREE.Vector3(wide?-.55:0, wide?1.15:tall?-.25:1.3, 0);
      const dist=tall?3.6:3.4;
      camera.position.set(target.x+Math.sin(a)*dist, tall?.95:1.45, Math.cos(a)*dist);
      camera.lookAt(target);
    },
  };
})();

// ───────────────────────── INPUT ─────────────────────────
const keys=new Set();
addEventListener('keydown', e=>{ if(e.target.tagName==='INPUT') return; keys.add(e.code); if(e.code==='Space' && view===tower) e.preventDefault(); });
addEventListener('keyup', e=>keys.delete(e.code));
addEventListener('blur', ()=>keys.clear());
const joy={x:0,y:0,id:null,ox:0,oy:0}, drag={id:null,x:0};
const joyEl=document.getElementById('joy'), knob=document.getElementById('knob');
canvas.addEventListener('pointerdown', e=>{
  if(view!==tower) return;
  if(e.pointerType==='touch' && e.clientX<innerWidth/2 && joy.id===null){
    joy.id=e.pointerId; joy.ox=e.clientX; joy.oy=e.clientY;
    joyEl.style.display='block'; joyEl.style.left=e.clientX+'px'; joyEl.style.top=e.clientY+'px'; knob.style.transform='translate(-50%,-50%)';
  } else if(drag.id===null){ drag.id=e.pointerId; drag.x=e.clientX; }
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e=>{
  if(e.pointerId===joy.id){
    let dx=e.clientX-joy.ox, dy=e.clientY-joy.oy; const d=Math.hypot(dx,dy), R=55;
    if(d>R){ dx*=R/d; dy*=R/d; }
    joy.x=dx/R; joy.y=-dy/R; knob.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  } else if(e.pointerId===drag.id){ tower.yaw -= (e.clientX-drag.x)*0.008; drag.x=e.clientX; }
});
const endPointer=e=>{
  if(e.pointerId===joy.id){ joy.id=null; joy.x=joy.y=0; joyEl.style.display='none'; }
  if(e.pointerId===drag.id) drag.id=null;
};
canvas.addEventListener('pointerup', endPointer); canvas.addEventListener('pointercancel', endPointer);

// ───────────────────────── THE TOWER ─────────────────────────
const T=4, WALL_H=2.6;
function genMaze(n){
  const W=2*n+1, g=Array.from({length:W},()=>Array(W).fill(1));
  const stack=[[1,1]]; g[1][1]=0;
  while(stack.length){
    const [x,y]=stack[stack.length-1];
    const nb=[[2,0],[-2,0],[0,2],[0,-2]].map(([dx,dy])=>[x+dx,y+dy,dx,dy]).filter(([a,b])=>a>0&&b>0&&a<W-1&&b<W-1&&g[b][a]===1);
    if(!nb.length){ stack.pop(); continue; }
    const [a,b,dx,dy]=nb[Math.floor(Math.random()*nb.length)];
    g[y+dy/2][x+dx/2]=0; g[b][a]=0; stack.push([a,b]);
  }
  for(let i=0;i<n*1.5;i++){ // loops
    const x=1+Math.floor(Math.random()*(W-2)), y=1+Math.floor(Math.random()*(W-2));
    if(g[y][x]===1 && ((g[y][x-1]===0&&g[y][x+1]===0)||(g[y-1][x]===0&&g[y+1][x]===0))) g[y][x]=0;
  }
  for(let r=0;r<2;r++){ // rooms
    const x=2+Math.floor(Math.random()*(W-5)), y=2+Math.floor(Math.random()*(W-5));
    for(let j=y;j<y+3;j++) for(let i=x;i<x+3;i++) g[j][i]=0;
  }
  return g;
}
function bfs(g, sx, sy){
  const W=g.length, d=Array.from({length:W},()=>Array(W).fill(-1)); d[sy][sx]=0; const q=[[sx,sy]];
  while(q.length){ const [x,y]=q.shift(); for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const a=x+dx,b=y+dy; if(g[b]?.[a]===0 && d[b][a]<0){ d[b][a]=d[y][x]+1; q.push([a,b]); } } }
  return d;
}
const wallSide = canvasTex(256,256,(g,w,h)=>{
  g.fillStyle='#140b26'; g.fillRect(0,0,w,h);
  for(let y=0;y<4;y++) for(let x=0;x<4;x++){ g.fillStyle=`hsl(${265+Math.random()*15},35%,${9+Math.random()*6}%)`; g.fillRect(x*64+(y%2)*32+3,y*64+3,58,58); }
  g.fillStyle='#3ee6ff'; g.fillRect(0,0,w,5); g.fillRect(0,h-5,w,5);
},true);
const wallSideE = canvasTex(256,256,(g,w,h)=>{ g.fillStyle='#000'; g.fillRect(0,0,w,h); g.fillStyle='#3ee6ff'; g.fillRect(0,0,w,5); g.fillStyle='#7a2fff'; g.fillRect(0,h-5,w,5); });
const wallTop = canvasTex(128,128,(g,w,h)=>{ g.fillStyle='#090512'; g.fillRect(0,0,w,h); g.strokeStyle='#3ee6ff'; g.lineWidth=4; g.strokeRect(2,2,w-4,h-4); });
const floorTex = canvasTex(256,256,(g,w,h)=>{
  g.fillStyle='#0d0819'; g.fillRect(0,0,w,h);
  g.strokeStyle='#2a1a4a'; g.lineWidth=2; for(let i=0;i<=4;i++){ g.beginPath(); g.moveTo(i*64,0); g.lineTo(i*64,h); g.moveTo(0,i*64); g.lineTo(w,i*64); g.stroke(); }
  g.strokeStyle='#b66bff'; g.lineWidth=3; g.strokeRect(1,1,w-2,h-2);
},true);
const floorTexE = canvasTex(256,256,(g,w,h)=>{ g.fillStyle='#000'; g.fillRect(0,0,w,h); g.strokeStyle='#7a2fff'; g.lineWidth=3; g.strokeRect(1,1,w-2,h-2); },true);

export const tower = (()=>{
  let scene, grid, W, player, followers=[], shadows=[], stairs=null, chests=[], crumbs=[], seen, cb={}, paused=false;
  let heading=0, lock=0, mapAcc=0, stairsArmed=true;
  const api = {scene:null, yaw:0};
  const mm=document.getElementById('minimap'), mctx=mm.getContext('2d');

  const tileAt=(x,z)=>[Math.floor(x/T), Math.floor(z/T)];
  const isWall=(i,j)=>grid[j]?.[i]!==0;
  function blocked(x,z,r=.45){
    const [a,b]=tileAt(x-r,z-r), [c,d]=tileAt(x+r,z+r);
    for(let j=b;j<=d;j++) for(let i=a;i<=c;i++) if(isWall(i,j)) return true;
    return false;
  }
  function moveWithCollide(obj, dx, dz, r){
    const p=obj.position;
    if(!blocked(p.x+dx,p.z,r)) p.x+=dx;
    if(!blocked(p.x,p.z+dz,r)) p.z+=dz;
  }
  const center=(i,j)=>new THREE.Vector3((i+.5)*T,0,(j+.5)*T);

  function makeStairs(pos){
    const g=new THREE.Group(); g.position.copy(pos);
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.5,.2,6), new THREE.MeshStandardMaterial({color:0x1a0d33, emissive:new THREE.Color('#3ee6ff'), emissiveIntensity:.8}));
    pad.position.y=.1; g.add(pad);
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(1,1.2,14,6,1,true), addMat('#3ee6ff',1.2)); beam.material.opacity=.25; beam.position.y=7; g.add(beam);
    const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.45), new THREE.MeshBasicMaterial({color:glow('#ffd23f',3)})); gem.position.y=2; g.add(gem);
    g.userData.update=(dt)=>{ gem.rotation.y+=dt*1.5; gem.position.y=2+Math.sin(performance.now()/400)*.2; };
    return g;
  }
  function makeChest(pos){
    const g=new THREE.Group(); g.position.copy(pos);
    const wood=new THREE.MeshStandardMaterial({color:0x3a1d5a, roughness:.6});
    const gold=new THREE.MeshStandardMaterial({color:0xffd23f, emissive:new THREE.Color('#ffb02f'), emissiveIntensity:1.4, metalness:.8, roughness:.3});
    const b=new THREE.Mesh(new THREE.BoxGeometry(1,.6,.7), wood); b.position.y=.3; g.add(b);
    const lid=new THREE.Mesh(new THREE.BoxGeometry(1.04,.25,.74), gold); lid.position.y=.72; g.add(lid);
    g.add(blobShadow(.7));
    g.userData.update=(dt)=>{ lid.material.emissiveIntensity=1+Math.sin(performance.now()/300)*.5; };
    return g;
  }
  function makeBossDoor(pos){
    const g=new THREE.Group(); g.position.copy(pos);
    const m=new THREE.Mesh(new THREE.BoxGeometry(3.2,3,.4), new THREE.MeshStandardMaterial({color:0x0b0617, emissive:new THREE.Color('#ff3d7f'), emissiveIntensity:.5}));
    m.position.y=1.5; g.add(m); return g;
  }

  api.build = function(floor, opts={}){
    cb=opts.callbacks||{};
    scene=new THREE.Scene(); api.scene=scene;
    scene.background=new THREE.Color(0x05030c);
    scene.fog=new THREE.FogExp2(0x05030c, 0.045);
    scene.add(new THREE.HemisphereLight(0x8a7aff, 0x0a0518, 1.3));
    const ml=new THREE.DirectionalLight(0x9fb4ff, 1.2); ml.position.set(10,30,5); scene.add(ml);
    const plight=new THREE.PointLight(0xc9a2ff, 14, 20, 1.6); plight.position.y=4; scene.add(plight); api.plight=plight;
    const arena = opts.arena;   // boss floors are one big room
    if(arena){
      W=11; grid=Array.from({length:W},(_,j)=>Array.from({length:W},(_,i)=>(i===0||j===0||i===W-1||j===W-1)?1:0));
    } else grid=genMaze(5+Math.floor(floor/3)), W=grid.length;
    seen=Array.from({length:W},()=>Array(W).fill(false));
    // floor
    floorTex.repeat.set(W,W); floorTexE.repeat.set(W,W);
    const fl=new THREE.Mesh(new THREE.PlaneGeometry(W*T,W*T), new THREE.MeshStandardMaterial({map:floorTex, emissiveMap:floorTexE, emissive:new THREE.Color('#ffffff'), emissiveIntensity:.9, roughness:.8}));
    fl.rotation.x=-Math.PI/2; fl.position.set(W*T/2,0,W*T/2); scene.add(fl);
    // walls
    const walls=[]; for(let j=0;j<W;j++) for(let i=0;i<W;i++) if(grid[j][i]===1) walls.push([i,j]);
    const side=new THREE.MeshStandardMaterial({map:wallSide, emissiveMap:wallSideE, emissive:new THREE.Color('#ffffff'), emissiveIntensity:.7, roughness:.85});
    const topM=new THREE.MeshStandardMaterial({map:wallTop, emissiveMap:wallTop, emissive:new THREE.Color('#ffffff'), emissiveIntensity:.45});
    const im=new THREE.InstancedMesh(new THREE.BoxGeometry(T,WALL_H,T), [side,side,topM,side,side,side], walls.length);
    const m=new THREE.Matrix4();
    walls.forEach(([i,j],k)=>{ m.makeTranslation((i+.5)*T, WALL_H/2, (j+.5)*T); im.setMatrixAt(k,m); });
    scene.add(im);
    // drifting motes
    const mg=new THREE.BufferGeometry(), mp=new Float32Array(300*3);
    for(let i=0;i<300;i++){ mp[i*3]=rnd(0,W*T); mp[i*3+1]=rnd(0,5); mp[i*3+2]=rnd(0,W*T); }
    mg.setAttribute('position', new THREE.BufferAttribute(mp,3));
    const motes=new THREE.Points(mg,new THREE.PointsMaterial({map:DOT,color:glow('#b66bff',1.5),size:.15,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
    scene.add(motes); api.motes=motes;

    // placement
    const start=arena?[5,W-2]:[1,1];
    const dist=bfs(grid,start[0],start[1]);
    let far=[start[0],start[1]], fd=0;
    for(let j=0;j<W;j++) for(let i=0;i<W;i++) if(dist[j][i]>fd){ fd=dist[j][i]; far=[i,j]; }
    stairs=null; chests=[]; shadows=[];
    if(arena){
      if(opts.bossCleared){ stairs=makeStairs(center(5,3)); scene.add(stairs); }
      else {
        const boss=makeShadow(opts.bossName); boss.position.copy(center(5,4)); boss.userData.boss=true;
        boss.scale.multiplyScalar(.75); boss.rotation.y=0; scene.add(boss); shadows.push(boss);
      }
    } else {
      if(opts.sealed){ const d=makeBossDoor(center(...far)); scene.add(d); d.userData.sealed=true; stairs=d; }
      else { stairs=makeStairs(center(...far)); scene.add(stairs); }
      const dead=[];
      for(let j=1;j<W-1;j++) for(let i=1;i<W-1;i++) if(grid[j][i]===0 && (i!==far[0]||j!==far[1]) && dist[j][i]>3){
        const walls=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>grid[j+dy][i+dx]===1).length;
        if(walls===3) dead.push([i,j]);
      }
      dead.sort(()=>Math.random()-.5).slice(0,2).forEach(([i,j])=>{ const c=makeChest(center(i,j)); c.userData.tile=[i,j]; scene.add(c); chests.push(c); });
      const open=[]; for(let j=0;j<W;j++) for(let i=0;i<W;i++) if(dist[j][i]>4) open.push([i,j]);
      const n=Math.min(open.length, 3+Math.floor(floor/3));
      open.sort(()=>Math.random()-.5).slice(0,n).forEach(([i,j])=>{
        const s=makeShadow('Gloom Slime'); s.position.copy(center(i,j)); s.userData.wander=null; scene.add(s); shadows.push(s);
      });
    }
    // party
    player=chars.mc; player.root.position.copy(center(...start)); player.root.rotation.set(0,0,0); player.ring.visible=true;
    heading = arena ? Math.PI : 0; api.yaw = heading+Math.PI;
    scene.add(player.root); player.play('idle');
    followers=['rin','kaito'].map(id=>chars[id]).filter(Boolean);
    followers.forEach((f,k)=>{ f.root.position.copy(player.root.position).add(new THREE.Vector3((k?1:-1)*.8,0,-.8)); f.ring.visible=true; scene.add(f.root); f.play('idle'); });
    crumbs=[player.root.position.clone()];
    paused=false; lock=0; stairsArmed=true;
    camera.position.copy(player.root.position).add(new THREE.Vector3(0,8,7));
  };
  api.resume = function(){
    paused=false; lock=.3;
    scene.add(player.root); player.play('idle'); player.ring.visible=true;
    followers.forEach(f=>{ scene.add(f.root); f.play('idle'); f.ring.visible=true; });
  };
  api.pause = ()=>{ paused=true; };
  api.removeShadow = (s)=>{ scene.remove(s); shadows=shadows.filter(x=>x!==s); };
  api.armStairs = ()=>{ stairsArmed=false; };
  api.debug = ()=>({stairs:stairs?.position, chests:chests.map(c=>c.position)});   // used by automated tests

  function strike(){
    if(lock>0) return;
    lock=.55; player.play('attack',{once:true, speed:1.6}).then(()=>{ if(!paused) player.play('idle'); });
    const f=new THREE.Vector3(Math.sin(heading),0,Math.cos(heading));
    for(const s of shadows){
      const d=s.position.clone().sub(player.root.position); d.y=0;
      if(d.length()<2.6 && d.normalize().dot(f)>.4){ elementFx('phys', s.position.clone().setY(1), .8); encounter(s,'player'); return; }
    }
  }
  api.strike = strike;
  function encounter(s, adv){
    if(paused) return; paused=true;
    player.play('battle_idle');
    cb.onEncounter?.(s, adv, !!s.userData.boss);
  }

  api.update = function(dt){
    for(const s of shadows) s.userData.update(dt);
    stairs?.userData.update?.(dt); chests.forEach(c=>c.userData.update(dt));
    player.update(dt); followers.forEach(f=>f.update(dt));
    api.motes.rotation.y+=dt*.01;
    if(paused){ followCam(dt); return; }
    lock=Math.max(0,lock-dt);
    // input
    let ix=joy.x, iz=joy.y;
    if(keys.has('KeyW')||keys.has('ArrowUp')) iz+=1;
    if(keys.has('KeyS')||keys.has('ArrowDown')) iz-=1;
    if(keys.has('KeyA')||keys.has('ArrowLeft')) ix-=1;
    if(keys.has('KeyD')||keys.has('ArrowRight')) ix+=1;
    if(keys.has('KeyQ')) api.yaw+=dt*2; if(keys.has('KeyE')) api.yaw-=dt*2;
    if(keys.has('Space')){ keys.delete('Space'); strike(); }
    const mag=Math.min(1,Math.hypot(ix,iz));
    const p=player.root.position;
    if(mag>.1 && lock<=0){
      const fx=-Math.sin(api.yaw), fz=-Math.cos(api.yaw), rx=Math.cos(api.yaw), rz=-Math.sin(api.yaw);
      let mx=fx*iz+rx*ix, mz=fz*iz+rz*ix; const l=Math.hypot(mx,mz); mx/=l; mz/=l;
      const walking = keys.has('ShiftLeft') || (joy.id!==null && mag<.6);
      const speed = walking?2.2:6;
      moveWithCollide(player.root, mx*speed*dt, mz*speed*dt, .45);
      const target=Math.atan2(mx,mz); let d=target-heading; d=Math.atan2(Math.sin(d),Math.cos(d)); heading+=d*Math.min(1,dt*12);
      player.root.rotation.y=heading;
      player.play(walking?'walk':'run');
      if(p.distanceTo(crumbs[crumbs.length-1])>.25){ crumbs.push(p.clone()); if(crumbs.length>60) crumbs.shift(); }
    } else if(lock<=0) player.play('idle');
    // followers trail the breadcrumbs
    followers.forEach((f,k)=>{
      const tgt=crumbs[Math.max(0,crumbs.length-1-(k+1)*6)];
      const d=tgt.clone().sub(f.root.position); d.y=0; const len=d.length();
      const crowd=f.root.position.distanceTo(p)<1.1+k*.6 || (k && f.root.position.distanceTo(followers[0].root.position)<.9);
      if(len>.35 && !crowd){ const sp=Math.min(len*3,7); f.root.position.addScaledVector(d.normalize(), sp*dt); f.root.rotation.y=Math.atan2(d.x,d.z); f.play(sp>3?'run':'walk'); }
      else f.play('idle');
    });
    // shadows wander and chase
    const fwd=new THREE.Vector3(Math.sin(heading),0,Math.cos(heading));
    for(const s of shadows){
      if(s.userData.boss){ s.lookAt(p.x, s.position.y, p.z); if(s.position.distanceTo(p)<3.4) return encounter(s, null); continue; }
      const to=p.clone().sub(s.position); to.y=0; const dist=to.length();
      let dir, sp;
      if(dist<8){ dir=to.normalize(); sp=3.3; }
      else {
        if(!s.userData.wander || s.position.distanceTo(s.userData.wander)<.5 || Math.random()<.005){
          const [i,j]=tileAt(s.position.x,s.position.z);
          const opts=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>grid[j+dy]?.[i+dx]===0);
          const [dx,dy]=opts[Math.floor(Math.random()*opts.length)]||[0,0];
          s.userData.wander=center(i+dx,j+dy);
        }
        dir=s.userData.wander.clone().sub(s.position); dir.y=0; dir.normalize(); sp=1.4;
      }
      moveWithCollide(s, dir.x*sp*dt, dir.z*sp*dt, .5);
      s.rotation.y=Math.atan2(dir.x,dir.z);
      if(dist<1.25){ const back=to.clone().normalize().dot(fwd) < -.3; return encounter(s, back?'enemy':null); }
    }
    // stairs and chests
    if(stairs){
      const d=stairs.position.distanceTo(p);
      if(d<1.8 && stairsArmed){ stairsArmed=false; paused=true; player.play('idle'); cb.onStairs?.(!!stairs.userData.sealed); }
      if(d>3) stairsArmed=true;
    }
    for(const c of chests){
      if(c.position.distanceTo(p)<1.3){
        chests=chests.filter(x=>x!==c); scene.remove(c);
        burst({pos:c.position.clone().setY(.8), color:'#ffd23f', count:50, speed:4, up:2, life:.8, size:.25});
        cb.onChest?.();
      }
    }
    // explored tiles
    const [ti,tj]=tileAt(p.x,p.z);
    for(let j=tj-2;j<=tj+2;j++) for(let i=ti-2;i<=ti+2;i++) if(seen[j]?.[i]!==undefined) seen[j][i]=true;
    mapAcc+=dt; if(mapAcc>.15){ mapAcc=0; drawMap(); }
    followCam(dt);
  };
  function followCam(dt){
    const p=player.root.position;
    const want=new THREE.Vector3(p.x+Math.sin(api.yaw)*6, 6.5, p.z+Math.cos(api.yaw)*6);
    camera.position.lerp(want, Math.min(1,dt*5));
    camera.lookAt(p.x, 1.2, p.z);
    api.plight.position.set(p.x, 3, p.z);
  }
  function drawMap(){
    const S=mm.width, c=S/W; mctx.clearRect(0,0,S,S);
    mctx.fillStyle='rgba(11,6,23,.75)'; mctx.fillRect(0,0,S,S);
    for(let j=0;j<W;j++) for(let i=0;i<W;i++) if(seen[j][i] && grid[j][i]===0){ mctx.fillStyle='#3a2a66'; mctx.fillRect(i*c,j*c,c+.5,c+.5); }
    const dot=(v,col,r)=>{ const [i,j]=[v.x/T,v.z/T]; if(!seen[Math.floor(j)]?.[Math.floor(i)]) return; mctx.fillStyle=col; mctx.beginPath(); mctx.arc(i*c,j*c,r,0,7); mctx.fill(); };
    if(stairs) dot(stairs.position, stairs.userData.sealed?'#ff3d7f':'#3ee6ff', c*.45);
    chests.forEach(ch=>dot(ch.position,'#ffd23f',c*.3));
    const p=player.root.position;
    shadows.forEach(s=>{ if(s.position.distanceTo(p)<10) dot(s.position,'#ff2a4f',c*.3); });
    mctx.save(); mctx.translate(p.x/T*c, p.z/T*c); mctx.rotate(-heading); mctx.fillStyle='#fff';
    mctx.beginPath(); mctx.moveTo(0,c*.6); mctx.lineTo(c*.4,-c*.35); mctx.lineTo(-c*.4,-c*.35); mctx.fill(); mctx.restore();
  }
  return api;
})();

// ───────────────────────── BATTLE STAGE ─────────────────────────
export const stage = (()=>{
  const scene=new THREE.Scene();
  scene.add(skyDome('#04020c','#1d0b3a'), starfield(700));
  scene.add(moon(new THREE.Vector3(55,48,-160),8));
  scene.fog=new THREE.Fog(0x0b0617, 25, 90);
  scene.add(new THREE.HemisphereLight(0x9a8aff, 0x150a2a, 1.4));
  const key=new THREE.DirectionalLight(0xdfe4ff, 2); key.position.set(-4,8,6); scene.add(key);
  const rim=new THREE.DirectionalLight(0xff3d7f, 1.4); rim.position.set(5,4,-6); scene.add(rim);
  const arenaTex=canvasTex(512,512,(g,w,h)=>{
    g.fillStyle='#0d0819'; g.fillRect(0,0,w,h);
    for(let r=40;r<256;r+=36){ g.strokeStyle=r%72?'#2a1a4a':'#7a2fff'; g.lineWidth=r%72?2:4; g.beginPath(); g.arc(256,256,r,0,7); g.stroke(); }
    g.strokeStyle='#3ee6ff'; g.lineWidth=6; g.beginPath(); g.arc(256,256,250,0,7); g.stroke();
    for(let i=0;i<12;i++){ const a=i/12*Math.PI*2; g.strokeStyle='#2a1a4a'; g.lineWidth=2; g.beginPath(); g.moveTo(256,256); g.lineTo(256+Math.cos(a)*250,256+Math.sin(a)*250); g.stroke(); }
  });
  const arena=new THREE.Mesh(new THREE.CircleGeometry(14,64), new THREE.MeshStandardMaterial({map:arenaTex, emissiveMap:arenaTex, emissive:new THREE.Color('#ffffff'), emissiveIntensity:.8, roughness:.8}));
  arena.rotation.x=-Math.PI/2; scene.add(arena);
  // floating motes
  const mg=new THREE.BufferGeometry(), mp=new Float32Array(200*3);
  for(let i=0;i<200;i++){ mp[i*3]=rnd(-14,14); mp[i*3+1]=rnd(0,8); mp[i*3+2]=rnd(-14,14); }
  mg.setAttribute('position', new THREE.BufferAttribute(mp,3));
  const motes=new THREE.Points(mg,new THREE.PointsMaterial({map:DOT,color:glow('#7a2fff',1.6),size:.2,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  scene.add(motes);

  const SLOTS={mc:new THREE.Vector3(0,0,3.4), rin:new THREE.Vector3(-2.5,0,4), kaito:new THREE.Vector3(2.5,0,4)};
  const actors={};      // key -> {obj, home, kind:'party'|'enemy', char?, ref?}
  const labels=document.getElementById('labels');
  let camPos=new THREE.Vector3(0,4.5,10), camLook=new THREE.Vector3(0,1,-2), labelCb=null, guards={};
  const api={scene};

  api.enter = function(party, enemies){
    for(const k in actors){ scene.remove(actors[k].obj); delete actors[k]; }
    labels.replaceChildren(); guards={};
    for(const id of party){
      const c=chars[id]; if(!c) continue;
      c.root.position.copy(SLOTS[id]); c.root.rotation.set(0,Math.PI,0); c.ring.visible=true;
      scene.add(c.root); c.play('battle_idle');
      actors[id]={obj:c.root, home:SLOTS[id].clone(), kind:'party', char:c};
    }
    const n=enemies.length, gap=n>1?Math.min(3.2, 8/(n-1)):0;
    enemies.forEach((e,i)=>{
      const s=makeShadow(e.look);
      const home=new THREE.Vector3((i-(n-1)/2)*gap, 0, e.boss?-5.5:-3.2);
      s.position.copy(home); s.rotation.y=0; scene.add(s);
      const lab=document.createElement('div'); lab.className='elabel';
      labels.append(lab);
      lab.addEventListener('click', ()=>labelCb?.(e));
      actors['e'+i]={obj:s, home, kind:'enemy', ref:e, label:lab};
    });
    camPos.set(0,4.5,10); camLook.set(0,1,-2);
    camera.position.copy(camPos).add(new THREE.Vector3(0,3,8)); camera.lookAt(camLook);
  };
  api.exit = function(){ labels.replaceChildren(); labelCb=null; };
  api.setTargeting = function(fn, info){ labelCb=fn; api.info=info; labels.classList.toggle('picking', !!fn); };

  api.update = function(dt){
    motes.rotation.y+=dt*.02;
    for(const k in actors){
      const a=actors[k];
      if(a.kind==='party') a.char.update(dt);
      else {
        a.obj.userData.update(dt);
        const e=a.ref, lab=a.label;
        if(e.hp<=0){ lab.style.display='none'; continue; }
        const s=toScreen(a.obj.position.clone().setY(a.obj.userData.height+.25));
        lab.style.display=s.behind?'none':'';
        lab.style.left=s.x+'px'; lab.style.top=s.y+'px';
        const html=`<b>${e.name}</b>${e.down?'<i class="down">DOWN</i>':''}<div class="bar en"><i style="width:${Math.max(0,e.hp/e.max*100)}%"></i></div>${labelCb&&api.info?api.info(e):''}`;
        if(lab._h!==html){ lab.innerHTML=html; lab._h=html; }
      }
    }
    camera.position.lerp(camPos, Math.min(1,dt*4));
    camera.lookAt(camLook);
  };
  function shot(pos, look){ camPos.copy(pos); camLook.copy(look); }
  const enemyCenter=()=>{ const v=new THREE.Vector3(); let n=0; for(const k in actors) if(actors[k].kind==='enemy' && actors[k].ref.hp>0){ v.add(actors[k].home); n++; } return n?v.divideScalar(n):new THREE.Vector3(0,0,-3); };
  api.overview = ()=>shot(new THREE.Vector3(0,4.8,10.5), new THREE.Vector3(0,1,-2));
  api.focus = (key)=>{
    const a=actors[key]; if(!a) return api.overview();
    if(a.kind==='party'){ const h=a.home; shot(new THREE.Vector3(h.x+1.8, 2.3, h.z+3.2), enemyCenter().setY(1)); }
    else { const h=a.home; shot(new THREE.Vector3(h.x*.4+2.5, 2.6, 1.5), h.clone().setY(1.2)); }
  };
  const posOf=(key,y=1)=>{ const a=actors[key]; return a.obj.position.clone().setY(a.kind==='enemy'? a.obj.userData.height*.55 : y); };

  function react(key, r){
    const a=actors[key]; if(!a) return;
    const at=posOf(key, 1.2);
    if(r.heal){ popup('+'+r.heal, at, 'heal'); return; }
    const txt = r.tag==='NULL' ? 'NULL' : String(r.dmg);
    popup(txt, at, r.tag==='NULL'?'null':'');
    if(r.tag==='WEAK!') popup('WEAK!', at.clone().add(new THREE.Vector3(0,.7,0)), 'weak');
    else if(r.tag==='CRITICAL!') popup('CRITICAL!', at.clone().add(new THREE.Vector3(0,.7,0)), 'crit');
    else if(r.tag==='resist') popup('RESIST', at.clone().add(new THREE.Vector3(0,.7,0)), 'res');
    if(r.tag==='NULL') return;
    if(r.knock || r.tag==='WEAK!' || r.tag==='CRITICAL!') shakeCam(.25);
    if(a.kind==='enemy'){
      a.obj.userData.flash();
      if(r.dead){
        burst({pos:at, color:'#7a2fff', count:80, speed:4, up:1, life:1, size:.4});
        const s0=a.obj.scale.x;
        tween(.5, k=>{ a.obj.scale.setScalar(s0*(1-k)); a.obj.position.y=k*1.5; }).then(()=>{ a.obj.visible=false; });
      } else if(r.knock){
        tween(.3, k=>{ a.obj.rotation.x=-k*1.1; }, easeOut);
      } else {
        const h=a.home; tween(.3, k=>{ a.obj.position.x=h.x+Math.sin(k*30)*.12*(1-k); });
      }
    } else {
      const c=a.char;
      if(r.dead || r.knock) c.play('knockdown',{once:true});
      else c.oneShot('hit');
    }
  }
  api.react = react;

  async function lunge(key, toward, dist){
    const a=actors[key], from=a.obj.position.clone();
    const dir=toward.clone().sub(from); dir.y=0; const len=dir.length();
    const to=from.clone().addScaledVector(dir.normalize(), Math.max(0,len-dist));
    await tween(.28, k=>a.obj.position.lerpVectors(from,to,k), easeOut);
    return ()=>tween(.3, k=>a.obj.position.lerpVectors(to,a.home,k));
  }

  // Physical attack. results: [{key, r}]
  api.attack = async function(key, results){
    const a=actors[key]; const t=results[0];
    if(a.kind==='party'){
      shot(a.home.clone().add(new THREE.Vector3(3,2.4,1)), actors[t.key].home.clone().setY(1));
      a.char.play('run');
      const back=await lunge(key, actors[t.key].obj.position, 1.3);
      const anim=a.char.play('attack',{once:true, speed:1.3});
      await wait(.35);
      for(const x of results){ elementFx('phys', posOf(x.key,1.2)); react(x.key, x.r); }
      await anim; a.char.play('run'); a.char.face(a.home.x, a.home.z);
      await back(); a.obj.rotation.y=Math.PI; a.char.play('battle_idle');
    } else {
      api.focus(key); await wait(.35);
      const tgt=actors[t.key];
      const back=await lunge(key, tgt.obj.position, 1.6);
      for(const x of results){ elementFx('phys', posOf(x.key,1.1)); react(x.key, x.r); }
      await wait(.35); await back();
    }
    await wait(.35);
  };
  // Magic skill on enemies or party.
  api.cast = async function(key, el, results, card){
    const a=actors[key];
    if(a.kind==='party'){
      shot(a.home.clone().add(new THREE.Vector3(-2.2,2.2,3.4)), a.home.clone().setY(1.6));
      const anim=a.char.play('cast',{once:true, speed:1.2});
      if(card) await summonFx(a.home, card.title, card.sub, card.color); else await wait(.5);
      api.overview(); await wait(.25);
      for(const x of results){ elementFx(el, posOf(x.key,1), results.length>1?.9:1.1); }
      await wait(.25);
      for(const x of results) react(x.key, x.r);
      await anim; a.char.play('battle_idle');
    } else {
      api.focus(key);
      a.obj.userData.flash(); burst({pos:posOf(key), color:EL_COLOR[el], count:40, speed:2, up:2, life:.6, size:.3});
      await wait(.5);
      shot(new THREE.Vector3(0,3.2,9), new THREE.Vector3(0,1,3.5));
      await wait(.2);
      for(const x of results) elementFx(el, posOf(x.key,1));
      await wait(.25);
      for(const x of results) react(x.key, x.r);
    }
    await wait(.6);
  };
  api.heal = async function(key, results, card){
    const a=actors[key];
    shot(a.home.clone().add(new THREE.Vector3(-2.2,2.2,3.4)), a.home.clone().setY(1.6));
    const anim=a.char.play('cast',{once:true, speed:1.2});
    if(card) await summonFx(a.home, card.title, card.sub, card.color); else await wait(.4);
    api.overview(); await wait(.2);
    for(const x of results){ elementFx('heal', posOf(x.key)); react(x.key, x.r); if(x.revive) actors[x.key].char.play('battle_idle'); }
    await anim; a.char.play('battle_idle'); await wait(.5);
  };
  api.setGuard = function(key, on){
    const a=actors[key]; if(!a) return;
    if(on && !guards[key]){
      const g=new THREE.Mesh(new THREE.CircleGeometry(.9,6), addMat('#3b8bff',1.5)); g.material.opacity=.35;
      g.position.set(0,1.1,.7); a.obj.add(g); guards[key]=g;
    } else if(!on && guards[key]){ a.obj.remove(guards[key]); guards[key].geometry.dispose(); delete guards[key]; }
  };
  api.getUp = async function(key){
    const a=actors[key]; if(!a) return;
    if(a.kind==='enemy'){ await tween(.3, k=>{ a.obj.rotation.x=-(1-k)*1.1; }); }
    else { a.char.play('battle_idle',{fade:.5}); await wait(.4); }
  };
  api.allOut = async function(results){
    await banner('ALL-OUT ATTACK!', 'allout', 900);
    const c=enemyCenter();
    shot(new THREE.Vector3(0,5,9.5), c.clone().setY(1));
    const party=Object.keys(actors).filter(k=>actors[k].kind==='party' && actors[k].char);
    await Promise.all(party.map(k=>{ const a=actors[k]; a.char.play('run'); const from=a.obj.position.clone(); return tween(.3, t=>a.obj.position.lerpVectors(from, c, t)).then(()=>{ a.obj.visible=false; }); }));
    dustCloud(c, 1.6); shakeCam(.35);
    await wait(1.5);
    for(const x of results) react(x.key, x.r);
    party.forEach(k=>{ const a=actors[k]; a.obj.visible=true; a.obj.position.copy(a.home); a.obj.rotation.y=Math.PI; a.char.play('battle_idle'); });
    await wait(.8);
  };
  api.victory = async function(){
    labels.replaceChildren();
    const party=Object.keys(actors).filter(k=>actors[k].kind==='party');
    party.forEach(k=>{ const a=actors[k]; a.obj.rotation.y=0; if(a.char.vrm) a.char.play('victory',{once:true}); });
    const c=new THREE.Vector3(0,1.1,3.7);
    await tween(2.4, k=>{ const ang=-.45+k*.9; shot(new THREE.Vector3(c.x+Math.sin(ang)*6.2, 1.6+k*.4, c.z+Math.cos(ang)*6.2), c); camera.position.copy(camPos); }, k=>k);
  };
  api.defeat = async function(){ api.overview(); await wait(1); };
  return api;
})();
