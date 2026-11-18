import * as THREE from './vendor/three.module.js';
// Shared original architectural primitives for the expanded building catalog.
const palette={cream:0xe8dbc0,white:0xf8f0db,stone:0xc2c3ad,slate:0x485c61,roof:0x51676a,terracotta:0xb77154,red:0xa85c49,wood:0x947052,darkwood:0x644d3b,lightwood:0xb9986c,bark:0x6e5841,glass:0x8bb6b1,darkglass:0x3e6668,iron:0x3f5353,leaf:0x638b58,leafLight:0x8baa68,leafDark:0x416f55,flower:0xdca28e,yellow:0xe7c87b,sand:0xceb995,water:0x6fafb2};
const materials=new Map(),geometryCache=new Map();
function mat(key,opts={}){ const color=typeof key==='string'?(palette[key]??key):key; const id=`${color}/${JSON.stringify(opts)}`; if(!materials.has(id)) materials.set(id,new THREE.MeshStandardMaterial({color,roughness:.82,...opts})); return materials.get(id); }
function geo(id,fn){if(!geometryCache.has(id))geometryCache.set(id,fn());return geometryCache.get(id);}
const BOX=()=>geo('box',()=>new THREE.BoxGeometry(1,1,1));
const SPHERE=()=>geo('sphere',()=>new THREE.SphereGeometry(1,12,8));
function mesh(g,geometry,material,x=0,y=0,z=0,sx=1,sy=1,sz=1){const m=new THREE.Mesh(geometry,typeof material==='object'?material:mat(material));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function box(g,w,h,d,x,y,z,m,rx=0,ry=0,rz=0){const a=mesh(g,BOX(),m,x,y,z,w,h,d);a.rotation.set(rx,ry,rz);return a;}
function ell(g,x,y,z,sx,sy,sz,m){return mesh(g,SPHERE(),m,x,y,z,sx,sy,sz);}
function petal(g,x,y,z,sx,sy,sz,m){return mesh(g,geo('small-leaf',()=>new THREE.SphereGeometry(1,6,4)),m,x,y,z,sx,sy,sz);}
function cyl(g,rt,rb,h,x,y,z,m,n=12){return mesh(g,geo(`cyl${rt},${rb},${h},${n}`,()=>new THREE.CylinderGeometry(rt,rb,h,n)),m,x,y,z);}
function cone(g,r,h,x,y,z,m,n=10){return cyl(g,0,r,h,x,y,z,m,n);}
function beam(g,a,b,r,m,square=false){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);const p=av.clone().add(bv).multiplyScalar(.5);const q=square?box(g,r,d.length(),r,p.x,p.y,p.z,m):cyl(g,r,r,d.length(),p.x,p.y,p.z,m,7);q.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return q;}
function tube(g,points,r,m){const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(g,new THREE.TubeGeometry(c,16,r,7,false),m);}
function gable(g,w,d,h,y,m='roof',x=0,z=0){const sh=new THREE.Shape();sh.moveTo(-w/2,0);sh.lineTo(w/2,0);sh.lineTo(0,h);sh.closePath();const ge=geo(`gable${w}/${d}/${h}`,()=>new THREE.ExtrudeGeometry(sh,{depth:d,bevelEnabled:false}));mesh(g,ge,m,x,y,z-d/2);for(const zz of [z-d/2-.025,z+d/2+.025]){beam(g,[x-w/2,y,zz],[x,y+h,zz],.13,'cream',true);beam(g,[x,y+h,zz],[x+w/2,y,zz],.13,'cream',true);}for(let i=0;i<=8;i++){const zz=z-d/2+d*i/8;beam(g,[x-w/2+.06,y+.06,zz],[x,y+h+.06,zz],.035,m,true);beam(g,[x,y+h+.06,zz],[x+w/2-.06,y+.06,zz],.035,m,true);}return ge;}
function windowFront(g,x,y,z,w=1,h=1.3,frame='white',balcony=false){box(g,w+.18,h+.18,.14,x,y,z,frame);box(g,w,h,.06,x,y,z+.09,'darkglass');box(g,.055,h,.08,x,y,z+.14,frame);box(g,w,.055,.08,x,y,z+.14,frame);box(g,w+.32,.12,.28,x,y-h/2-.08,z+.05,'stone');if(balcony){box(g,w+.7,.16,.85,x,y-h/2-.15,z+.35,'stone');for(let j=-2;j<=2;j++)box(g,.045,.63,.045,x+j*(w+.45)/4,y-h/2+.22,z+.76,'iron');box(g,w+.7,.05,.05,x,y-h/2+.54,z+.76,'iron');}}
function windowSide(g,x,y,z,w=.85,h=1.2){const sub=new THREE.Group();windowFront(sub,0,0,0,w,h);sub.position.set(x,y,z);sub.rotation.y=x<0?-Math.PI/2:Math.PI/2;g.add(sub);}
function door(g,x,z,y=.28,w=.95,h=1.85,color='darkwood'){box(g,w+.22,h+.13,.15,x,y+h/2,z,'white');box(g,w,h,.1,x,y+h/2,z+.1,color);box(g,w*.64,h*.29,.025,x,y+h*.73,z+.16,'darkglass');ell(g,x+w*.3,y+h*.44,z+.18,.055,.055,.055,'yellow');box(g,w+.5,.18,.55,x,y-.03,z+.2,'stone');}
function chimney(g,x,y,z,h=1.8){box(g,.64,h,.7,x,y+h/2,z,'stone');for(let k=0;k<Math.ceil(h/.22);k++)box(g,.67,.035,.73,x,y+k*.22,z,0xa5a38d);box(g,.82,.18,.9,x,y+h,z,'cream');box(g,.5,.05,.55,x,y+h+.1,z,'darkwood');}
function porch(g,w,z,y=.25,roofY=2.75,cols=4){box(g,w,.24,1.5,0,y,z,'lightwood');for(let i=0;i<=Math.floor(w/.25);i++)box(g,.025,.025,1.47,-w/2+i*.25,y+.13,z,'wood');for(let i=0;i<cols;i++){const x=-w/2+.18+i*(w-.36)/(cols-1);box(g,.14,roofY-y,.14,x,(roofY+y)/2,z+.5,'white');}box(g,w+.3,.18,1.75,0,roofY,z,'roof',-.08);for(let s=0;s<3;s++)box(g,1.6,.12,1.1-s*.24,0,.06+s*.11,z+.8+s*.1,'stone');}
function flowerbox(g,x,y,z,w=1.2){box(g,w,.26,.37,x,y,z,'wood');for(let i=0;i<4;i++){const xx=x-w*.35+i*w*.23;ell(g,xx,y+.2,z,.19,.19,.18,'leaf');ell(g,xx,y+.32,z+.05,.1,.1,.1,i%2?'flower':'yellow');}}
function foundation(g,w,d){box(g,w+.24,.28,d+.24,0,.14,0,'stone');box(g,w+.12,.08,d+.12,0,.32,0,'cream');}

function facade(g,w,d,base,floors,spacing=2.1,tone='white') {
  for(let floor=0;floor<floors;floor++) {
    const y=base+floor*spacing;
    for(const side of [-1,1]) {
      const face=new THREE.Group();face.rotation.y=side<0?Math.PI:0;
      for(let x=-w/2+.85;x<w/2-.3;x+=1.45)windowFront(face,x,y,d/2+.03,.92,1.3,tone);
      g.add(face);
    }
    for(const x of [-w/2-.03,w/2+.03])for(let z=-d/2+.85;z<d/2-.3;z+=1.45)windowSide(g,x,y,z,.92,1.3);
  }
}
function planter(g,x,y,z,w=1.1,d=1.1) {
  box(g,w,.38,d,x,y+.19,z,'cream');
  ell(g,x,y+.65,z,w*.56,.48,d*.56,'leaf');
}

function building(id,name,description,{width,depth,height,tags='',group='Homes'}={}) {
 return {id,name,description,category:'Buildings',kind:'building',tags:`building architecture ${group.toLowerCase()} ${tags}`,radius:Math.hypot(width/2,depth/2),height,footprint:{halfX:width/2,halfZ:depth/2},buildingGroup:group,expansion:true};
}
export {THREE,building,mat,mesh,box,ell,petal,cyl,cone,beam,tube,gable,windowFront,windowSide,door,chimney,porch,flowerbox,foundation,facade,planter};
