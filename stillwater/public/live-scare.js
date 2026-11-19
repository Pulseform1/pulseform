import * as THREE from 'three';
import * as Creatures from './creatures.js';

/** Selected native rig plus the actual death-location view, on the game's one renderer. */
export class LiveScareStage {
  constructor(renderer){
    this.renderer=renderer;this.scene=new THREE.Scene();this.scene.background=null;
    this.camera=new THREE.PerspectiveCamera(50,1,.025,100);this.camera.rotation.order='YXZ';
    this.scene.add(new THREE.HemisphereLight(0xa3c9bc,0x050c12,.75));
    this.key=new THREE.DirectionalLight(0xd0d6b7,3.9);this.key.position.set(-2.5,3,-4);this.scene.add(this.key);
    this.rim=new THREE.DirectionalLight(0x598c94,2.25);this.rim.position.set(3,2,3);this.scene.add(this.rim);
    this.backdropScene=new THREE.Scene();this.backdropCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.createBackdropQuad();
    this.createWaterSurface();
    this.model=null;this.id=null;this.motion=null;this.active=false;this.backdrop=null;this.world=null;this.backdropMode='none';this.captureError=null;
  }
  createWaterSurface(){
    this.waterPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);this.water=new THREE.Group();this.water.name='breach-waterline';this.scene.add(this.water);
    this.waterMaterial=new THREE.MeshBasicMaterial({color:0xa2cfca,transparent:true,opacity:0,depthWrite:false,toneMapped:true});
    this.wakeGeometry=new THREE.TorusGeometry(1,.016,5,56);this.wakes=[];for(let i=0;i<3;i++){const wake=new THREE.Mesh(this.wakeGeometry,this.waterMaterial);wake.rotation.x=Math.PI/2;wake.scale.setScalar(1+i*.18);this.water.add(wake);this.wakes.push(wake);}
    this.dropGeometry=new THREE.IcosahedronGeometry(.035,0);this.drops=[];for(let i=0;i<12;i++){const drop=new THREE.Mesh(this.dropGeometry,this.waterMaterial);this.water.add(drop);this.drops.push(drop);}
  }
  createBackdropQuad(){this.backdropMaterial=new THREE.MeshBasicMaterial({depthTest:false,depthWrite:false,toneMapped:true});this.backdropQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.backdropMaterial);this.backdropQuad.frustumCulled=false;this.backdropScene.add(this.backdropQuad);}
  prepare(id,aspect=1,{variant=0}={}){
    if(!this.backdropQuad)this.createBackdropQuad();if(!this.water)this.createWaterSurface();
    if(this.id===id&&this.model){if(this.motion.variant!==variant||this.motion.baseAspect!==aspect){this.end();this.motion=Creatures.createLiveScareState(this.model,{aspect,variant});}return;}
    this.end();if(this.model){this.scene.remove(this.model);Creatures.disposeCreature(this.model);}
    this.model=Creatures.createCreature(id);this.id=id;this.scene.add(this.model);this.motion=Creatures.createLiveScareState(this.model,{aspect,variant});
    this.model.traverse(object=>{if(!object.material)return;for(const material of Array.isArray(object.material)?object.material:[object.material])material.clippingPlanes=[this.waterPlane];});
  }
  /** `world` supplies the actual poolrooms scene/camera and world actors to hide.
   * The retained photograph is linear HDR; only its final fullscreen pass is
   * tone mapped, at the original world exposure, independently of the creature. */
  begin(id,aspect=1,world=null,{variant=this.motion?.variant??0}={}){
    if(!this.model||this.id!==id)return false;
    this.end();if(this.motion.variant!==variant||this.motion.baseAspect!==aspect)this.motion=Creatures.createLiveScareState(this.model,{aspect,variant});const r=this.renderer;this.saved={exposure:r.toneMappingExposure,shadows:r.shadowMap.enabled,autoClear:r.autoClear,toneMapping:r.toneMapping,localClippingEnabled:r.localClippingEnabled};
    this.captureError=null;
    if(world?.scene&&world?.camera){
      world.camera.updateWorldMatrix(true,false);this.world={scene:world.scene,camera:world.camera.clone(),hide:[...new Set((world.hide||[]).filter(Boolean))]};
      world.camera.matrixWorld.decompose(this.world.camera.position,this.world.camera.quaternion,this.world.camera.scale);this.world.camera.updateMatrixWorld(true);
      this.captureBackdrop();
    }
    r.shadowMap.enabled=false;r.localClippingEnabled=true;this.active=true;
    try{this.render(0,aspect,false);}catch(error){this.end();throw error;}
    return true;
  }
  withWorldHidden(draw){
    const hidden=this.world.hide.map(object=>[object,object.visible]);
    try{for(const [object]of hidden)object.visible=false;return draw();}
    finally{for(const [object,visible]of hidden)object.visible=visible;}
  }
  captureBackdrop(){
    const r=this.renderer,target=r.getRenderTarget(),viewport=r.getViewport(new THREE.Vector4()),scissor=r.getScissor(new THREE.Vector4()),scissorTest=r.getScissorTest(),autoClear=r.autoClear,toneMapping=r.toneMapping,size=r.getDrawingBufferSize(new THREE.Vector2());
    const scale=Math.min(1,1280/Math.max(1,size.x),720/Math.max(1,size.y));
    let buffer=null;
    try{
      if(r.extensions&&!r.extensions.has('EXT_color_buffer_float'))throw new Error('HDR backdrop capture unavailable; using the real room view directly.');
      buffer=new THREE.WebGLRenderTarget(Math.max(1,Math.round(size.x*scale)),Math.max(1,Math.round(size.y*scale)),{type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true,stencilBuffer:false});
      buffer.texture.colorSpace=THREE.LinearSRGBColorSpace;buffer.texture.name='stillwater-death-location';
      // Target viewports already use physical pixels. Renderer.setViewport
      // accepts logical pixels and would multiply these dimensions by DPR.
      buffer.viewport.set(0,0,buffer.width,buffer.height);r.setRenderTarget(buffer);r.setScissorTest(false);r.autoClear=true;r.toneMapping=THREE.NoToneMapping;
      this.withWorldHidden(()=>r.render(this.world.scene,this.world.camera));
      this.backdrop=buffer;this.backdropMaterial.map=buffer.texture;this.backdropMaterial.needsUpdate=true;this.backdropMode='captured';
    }catch(error){
      buffer?.dispose();this.captureError=error instanceof Error?error.message:String(error);this.backdropMode='live';
    }finally{
      r.toneMapping=toneMapping;r.autoClear=autoClear;r.setViewport(viewport);r.setScissor(scissor);r.setScissorTest(scissorTest);r.setRenderTarget(target);
    }
  }
  render(elapsed,aspect,shake=false){
    if(!this.active||!this.model)return null;
    const r=this.renderer,shot=Creatures.updateLiveScare(this.model,this.motion,elapsed,aspect);
    this.camera.position.copy(shot.cameraPosition);this.camera.up.set(0,1,0);this.camera.lookAt(shot.target);
    this.camera.aspect=aspect;this.camera.fov=shot.fov;this.camera.near=shot.near||.025;this.camera.far=shot.far||100;
    if(shake&&shot.phase==='impact'){const decay=Math.max(0,1-(elapsed-shot.impactAt)/.18);this.camera.rotateZ(Math.sin(elapsed*67)*.012*decay);}
    this.camera.updateProjectionMatrix();
    this.waterPlane.constant=-(shot.clipY??-100);this.water.visible=Boolean(shot.waterOpacity>0);
    if(this.water.visible){
      this.water.position.set(shot.waterX||0,shot.waterY,shot.waterZ||0);this.waterMaterial.opacity=shot.waterOpacity;const radius=shot.waterRadius||1,progress=shot.breach||0;
      for(let i=0;i<this.wakes.length;i++)this.wakes[i].scale.setScalar(radius*(.72+i*.19+progress*.35));
      for(let i=0;i<this.drops.length;i++){const a=i/this.drops.length*Math.PI*2,r=radius*(.65+progress*.46),height=Math.sin(Math.min(1,progress)*Math.PI)*(i%3*.13+.25);this.drops[i].position.set(Math.cos(a)*r,height,Math.sin(a)*r);this.drops[i].scale.set(.55,1.5+height*3,.55);}
    }
    try{
      if(this.world){
        r.autoClear=true;r.toneMapping=this.saved.toneMapping;r.toneMappingExposure=this.saved.exposure;
        if(this.backdrop)r.render(this.backdropScene,this.backdropCamera);
        else this.withWorldHidden(()=>r.render(this.world.scene,this.world.camera));
        // The attack is a foreground cinematic. Its native-model depth must not
        // intersect a room captured from a different first-person camera.
        r.autoClear=false;r.clearDepth();
      }
      r.toneMappingExposure=shot.exposure??.92;r.render(this.scene,this.camera);return shot;
    }catch(error){this.end();throw error;}
    finally{if(this.saved)r.autoClear=this.saved.autoClear;}
  }
  end(){
    if(this.saved){const r=this.renderer;r.toneMappingExposure=this.saved.exposure;r.shadowMap.enabled=this.saved.shadows;r.autoClear=this.saved.autoClear;r.toneMapping=this.saved.toneMapping;r.localClippingEnabled=this.saved.localClippingEnabled;}
    if(this.backdropMaterial)this.backdropMaterial.map=null;if(this.backdrop){this.backdrop.dispose();this.backdrop=null;}this.world=null;if(this.water)this.water.visible=false;this.backdropMode='none';this.active=false;this.saved=null;
  }
  dispose(){this.end();if(this.model){this.scene.remove(this.model);Creatures.disposeCreature(this.model);}this.model=null;this.id=null;this.motion=null;if(this.backdropQuad){this.backdropQuad.geometry.dispose();this.backdropMaterial.dispose();this.backdropScene.remove(this.backdropQuad);}this.backdropQuad=null;this.backdropMaterial=null;if(this.water){this.scene.remove(this.water);this.wakeGeometry.dispose();this.dropGeometry.dispose();this.waterMaterial.dispose();this.water=null;}}
}
