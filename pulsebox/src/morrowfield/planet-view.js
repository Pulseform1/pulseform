import * as THREE from './vendor/three.module.js';
import {REGION_DEFS} from './world-state.js';

// Original geography, generated locally. Regions are separate finite building
// areas; the globe is their navigable overview, not a continuous planet mesh.
const RADIUS = 32;
const RAD = Math.PI / 180;
const CONTINENTS = [
  [40,-108,31,25,1.12],[12,-96,13,19,.78],[-18,-60,18,32,1.1],
  [41,13,29,19,1.02],[-3,24,23,35,1.08],[44,77,57,25,1.16],
  [14,110,21,20,.83],[-27,131,20,15,1.08],[-17,48,5,10,.72],
  [-9,148,7,5,.78],[-42,172,5,11,.74],[69,-40,15,18,.92]
];
const color = hex => new THREE.Color(hex);
const landGreen=color('#79995b'), jungle=color('#34654b'), sand=color('#d9c389');
const mountain=color('#8b9183'), snow=color('#e5eee2');
const seaDeep=color('#285d7b'), seaShallow=color('#64b5b0'), seaPolar=color('#91c4cf');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export function planetPosition(lat,lon,radius=RADIUS) {
  const phi=lat*RAD,theta=lon*RAD;
  return new THREE.Vector3(Math.cos(phi)*Math.sin(theta)*radius,Math.sin(phi)*radius,Math.cos(phi)*Math.cos(theta)*radius);
}
function angularLongitude(lon,center){return Math.atan2(Math.sin((lon-center)*RAD),Math.cos((lon-center)*RAD))/RAD;}
function oval(lat,lon,clat,clon,wx,wy){const dx=angularLongitude(lon,clon)/wx,dz=(lat-clat)/wy;return Math.exp(-(dx*dx+dz*dz));}
function field(n){
  const lat=Math.asin(clamp(n.y,-1,1))/RAD,lon=Math.atan2(n.x,n.z)/RAD;
  let continent=0;for(const [a,b,c,d,e]of CONTINENTS)continent=Math.max(continent,oval(lat,lon,a,b,c,d)*e);
  const detail=Math.sin(n.x*23+n.z*11)*Math.cos(n.y*19-n.x*8)*.052+Math.sin(n.z*57+n.y*31)*.024;
  let land=continent-.45+detail;
  if(lat<-73)land=Math.max(land,.12+(-lat-73)*.025);
  const ridge=oval(lat,lon,43,78,21,10)+oval(lat,lon,43,-113,8,23)+oval(lat,lon,-18,-70,4,25);
  return {lat,lon,land,ridge};
}
function surfaceGeometry() {
  const geometry=new THREE.SphereGeometry(RADIUS,160,96),positions=geometry.attributes.position;
  const colors=new Float32Array(positions.count*3),n=new THREE.Vector3();
  for(let i=0;i<positions.count;i++){
    n.fromBufferAttribute(positions,i).normalize();const f=field(n);
    const elevation=f.land>0?Math.min(1.7,.12+f.land*.9+f.ridge*.85):-.16;
    positions.setXYZ(i,n.x*(RADIUS+elevation),n.y*(RADIUS+elevation),n.z*(RADIUS+elevation));
    const c=landGreen.clone();
    if(Math.abs(f.lat)<19)c.lerp(jungle,.78);
    const desert=Math.max(oval(f.lat,f.lon,24,18,28,13),oval(f.lat,f.lon,-27,131,21,15));
    c.lerp(sand,clamp(desert*1.3,0,1));
    if(f.land<.06)c.lerp(sand,.8);
    c.lerp(mountain,clamp(f.ridge*.6,0,.75));
    if(Math.abs(f.lat)>63)c.lerp(snow,clamp((Math.abs(f.lat)-63)/15,0,1));
    if(elevation>1.3)c.lerp(snow,clamp((elevation-1.3)*2,0,.75));
    c.multiplyScalar(.95+.05*Math.sin(n.x*91+n.z*53));
    colors.set([c.r,c.g,c.b],i*3);
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}
function oceanGeometry(){
  const geometry=new THREE.SphereGeometry(RADIUS,128,80),p=geometry.attributes.position,colors=new Float32Array(p.count*3),n=new THREE.Vector3();
  for(let i=0;i<p.count;i++){
    n.fromBufferAttribute(p,i).normalize();const f=field(n),c=seaDeep.clone();
    c.lerp(seaShallow,clamp((f.land+.24)/.27,0,1)*.8);
    if(Math.abs(f.lat)>62)c.lerp(seaPolar,clamp((Math.abs(f.lat)-62)/28,0,.85));
    c.multiplyScalar(.96+.04*Math.sin(n.x*12+n.y*9));colors.set([c.r,c.g,c.b],i*3);
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry;
}
function clouds(){
  const geometry=new THREE.SphereGeometry(RADIUS+1.05,112,72),p=geometry.attributes.position,opacity=new Float32Array(p.count),n=new THREE.Vector3();
  for(let i=0;i<p.count;i++){
    n.fromBufferAttribute(p,i).normalize();
    opacity[i]=.5+Math.sin(n.x*14+n.z*9)*Math.cos(n.y*16-n.x*5)*.24+Math.sin(n.z*31+n.y*18)*.11+Math.cos(n.x*43-n.z*26)*.08;
  }
  geometry.setAttribute('cloudOpacity',new THREE.BufferAttribute(opacity,1));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.FrontSide,
    vertexShader:'attribute float cloudOpacity; varying float density; varying vec3 normalView; void main(){density=cloudOpacity;normalView=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying float density; varying vec3 normalView; void main(){float alpha=smoothstep(.61,.81,density)*.72;float light=.75+.25*max(dot(normalize(normalView),normalize(vec3(-.5,.8,1.))),0.);gl_FragColor=vec4(vec3(.98,.99,.96)*light,alpha);}'
  });
  const mesh=new THREE.Mesh(geometry,material);mesh.name='planet-clouds';mesh.renderOrder=2;return mesh;
}
function atmosphere(){
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.FrontSide,blending:THREE.AdditiveBlending,
    vertexShader:'varying vec3 normalView; varying vec3 eye; void main(){vec4 p=modelViewMatrix*vec4(position,1.);normalView=normalize(normalMatrix*normal);eye=-p.xyz;gl_Position=projectionMatrix*p;}',
    fragmentShader:'varying vec3 normalView;varying vec3 eye;void main(){float rim=pow(1.-abs(dot(normalize(normalView),normalize(eye))),2.8);gl_FragColor=vec4(.43,.72,.83,rim*.36);}'
  });
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(RADIUS+2,96,64),material);mesh.name='planet-atmosphere';mesh.renderOrder=3;return mesh;
}

export function createPlanetView(){
  const group=new THREE.Group();group.name='MorrowfieldPlanet';group.userData.radius=RADIUS;
  const land=new THREE.Mesh(surfaceGeometry(),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,metalness:0}));
  land.name='planet-land';land.castShadow=true;land.receiveShadow=true;
  const ocean=new THREE.Mesh(oceanGeometry(),new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.26,metalness:.12,clearcoat:.6,clearcoatRoughness:.18}));
  ocean.name='planet-ocean';ocean.receiveShadow=true;
  const cloud=clouds(),halo=atmosphere();group.add(land,ocean,cloud,halo);
  const markers=new THREE.Group();markers.name='planet-regions';group.add(markers);
  const markerGeometries={stem:new THREE.CylinderGeometry(.075,.11,.75,8),cap:new THREE.SphereGeometry(.37,16,10),ring:new THREE.RingGeometry(.6,.78,32),hit:new THREE.SphereGeometry(1.25,12,8)};
  const stemMaterial=new THREE.MeshStandardMaterial({color:'#eee7ca',roughness:.55});
  const hitMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,color:'#ffffff'});
  const picks=[],regionVectors=new Map(),regionMarkers=new Map();
  for(const region of REGION_DEFS){
    const normal=planetPosition(region.lat,region.lon,1),f=field(normal),elevation=f.land>0?Math.min(1.7,.12+f.land*.9+f.ridge*.85):0;
    regionVectors.set(region.id,normal);
    const marker=new THREE.Group();marker.name=`region-${region.id}`;marker.userData.region=region;marker.position.copy(normal).multiplyScalar(RADIUS+elevation+.18);marker.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
    const stem=new THREE.Mesh(markerGeometries.stem,stemMaterial);stem.position.y=.38;
    const cap=new THREE.Mesh(markerGeometries.cap,new THREE.MeshStandardMaterial({color:region.color,emissive:region.color,emissiveIntensity:.35,roughness:.3}));cap.position.y=.88;
    const ring=new THREE.Mesh(markerGeometries.ring,new THREE.MeshBasicMaterial({color:'#fff1c5',transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.09;
    const hit=new THREE.Mesh(markerGeometries.hit,hitMaterial);hit.position.y=.65;hit.userData.regionId=region.id;
    marker.add(stem,cap,ring,hit);markers.add(marker);picks.push(hit);regionMarkers.set(region.id,marker);
  }
  let disposed=false;
  group.updateMatrixWorld(true);
  const visible=object=>{for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;};
  return {
    group,
    regionMarkers,
    radius:RADIUS,
    /** Local globe position: +Y north, longitude 0 faces +Z, east faces +X. */
    positionFor(regionId,altitude=2){const def=REGION_DEFS.find(r=>r.id===regionId);return def?planetPosition(def.lat,def.lon,RADIUS+altitude):null;},
    pick(raycaster){
      if(disposed||!visible(group))return null;
      group.updateWorldMatrix(true,true);
      const surface=raycaster.intersectObjects([land,ocean],false)[0];
      const hit=raycaster.intersectObjects(picks,false).find(h=>visible(h.object)&&(!surface||h.distance<surface.distance+1));
      if(hit)return REGION_DEFS.find(region=>region.id===hit.object.userData.regionId)||null;
      if(!surface)return null;
      const direction=group.worldToLocal(surface.point.clone()).normalize();
      let nearest=null,best=-Infinity;
      for(const region of REGION_DEFS){const dot=direction.dot(regionVectors.get(region.id));if(dot>best){best=dot;nearest=region;}}
      return nearest;
    },
    update(time=0){if(disposed)return;cloud.rotation.y=time*.006;cloud.rotation.z=.035*Math.sin(time*.01);},
    dispose(){
      if(disposed)return;disposed=true;
      const geometries=new Set(),materials=new Set();group.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)for(const mat of Array.isArray(object.material)?object.material:[object.material])materials.add(mat);});
      geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());group.removeFromParent();group.clear();regionMarkers.clear();
    }
  };
}
