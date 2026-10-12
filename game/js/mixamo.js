// Retargets Mixamo FBX animations onto VRM characters.
// Based on the approach in pixiv/three-vrm's "humanoidAnimation" example (MIT).
import * as THREE from '../vendor/three.module.min.js';

const RIG = {
  mixamorigHips:'hips', mixamorigSpine:'spine', mixamorigSpine1:'chest', mixamorigSpine2:'upperChest',
  mixamorigNeck:'neck', mixamorigHead:'head',
  mixamorigLeftShoulder:'leftShoulder', mixamorigLeftArm:'leftUpperArm', mixamorigLeftForeArm:'leftLowerArm', mixamorigLeftHand:'leftHand',
  mixamorigLeftHandThumb1:'leftThumbMetacarpal', mixamorigLeftHandThumb2:'leftThumbProximal', mixamorigLeftHandThumb3:'leftThumbDistal',
  mixamorigLeftHandIndex1:'leftIndexProximal', mixamorigLeftHandIndex2:'leftIndexIntermediate', mixamorigLeftHandIndex3:'leftIndexDistal',
  mixamorigLeftHandMiddle1:'leftMiddleProximal', mixamorigLeftHandMiddle2:'leftMiddleIntermediate', mixamorigLeftHandMiddle3:'leftMiddleDistal',
  mixamorigLeftHandRing1:'leftRingProximal', mixamorigLeftHandRing2:'leftRingIntermediate', mixamorigLeftHandRing3:'leftRingDistal',
  mixamorigLeftHandPinky1:'leftLittleProximal', mixamorigLeftHandPinky2:'leftLittleIntermediate', mixamorigLeftHandPinky3:'leftLittleDistal',
  mixamorigRightShoulder:'rightShoulder', mixamorigRightArm:'rightUpperArm', mixamorigRightForeArm:'rightLowerArm', mixamorigRightHand:'rightHand',
  mixamorigRightHandThumb1:'rightThumbMetacarpal', mixamorigRightHandThumb2:'rightThumbProximal', mixamorigRightHandThumb3:'rightThumbDistal',
  mixamorigRightHandIndex1:'rightIndexProximal', mixamorigRightHandIndex2:'rightIndexIntermediate', mixamorigRightHandIndex3:'rightIndexDistal',
  mixamorigRightHandMiddle1:'rightMiddleProximal', mixamorigRightHandMiddle2:'rightMiddleIntermediate', mixamorigRightHandMiddle3:'rightMiddleDistal',
  mixamorigRightHandRing1:'rightRingProximal', mixamorigRightHandRing2:'rightRingIntermediate', mixamorigRightHandRing3:'rightRingDistal',
  mixamorigRightHandPinky1:'rightLittleProximal', mixamorigRightHandPinky2:'rightLittleIntermediate', mixamorigRightHandPinky3:'rightLittleDistal',
  mixamorigLeftUpLeg:'leftUpperLeg', mixamorigLeftLeg:'leftLowerLeg', mixamorigLeftFoot:'leftFoot', mixamorigLeftToeBase:'leftToes',
  mixamorigRightUpLeg:'rightUpperLeg', mixamorigRightLeg:'rightLowerLeg', mixamorigRightFoot:'rightFoot', mixamorigRightToeBase:'rightToes',
};

const _q = new THREE.Quaternion(), _restInv = new THREE.Quaternion(), _parentRest = new THREE.Quaternion(), _v = new THREE.Vector3();

// fbx: the parsed FBX group (shared between characters; never mutated here)
export function retarget(fbx, vrm, name){
  const src = THREE.AnimationClip.findByName(fbx.animations, 'mixamo.com') || fbx.animations[0];
  const hipsNode = fbx.getObjectByName('mixamorigHips');
  const motionHipsHeight = hipsNode.position.y;
  const vrmHipsY = vrm.humanoid.getNormalizedBoneNode('hips').getWorldPosition(_v).y;
  const vrmRootY = vrm.scene.getWorldPosition(_v).y;
  const hipsScale = Math.abs(vrmHipsY - vrmRootY) / motionHipsHeight;
  const isV0 = vrm.meta?.metaVersion === '0';
  const tracks = [];

  for(const track of src.tracks){
    const [rigName, prop] = track.name.split('.');
    const boneName = RIG[rigName];
    const node = boneName && vrm.humanoid.getNormalizedBoneNode(boneName);
    if(!node) continue;
    const rigNode = fbx.getObjectByName(rigName);
    rigNode.getWorldQuaternion(_restInv).invert();
    rigNode.parent.getWorldQuaternion(_parentRest);

    if(prop === 'quaternion'){
      const values = new Float32Array(track.values.length);
      for(let i=0;i<track.values.length;i+=4){
        _q.fromArray(track.values, i).premultiply(_parentRest).multiply(_restInv);
        values[i]   = isV0 ? -_q.x : _q.x;
        values[i+1] = _q.y;
        values[i+2] = isV0 ? -_q.z : _q.z;
        values[i+3] = _q.w;
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(`${node.name}.quaternion`, track.times, values));
    } else if(prop === 'position' && boneName === 'hips'){
      const values = new Float32Array(track.values.length);
      for(let i=0;i<track.values.length;i++){
        const v = track.values[i] * hipsScale;
        values[i] = isV0 && i%3!==1 ? -v : v;
      }
      tracks.push(new THREE.VectorKeyframeTrack(`${node.name}.position`, track.times, values));
    }
  }
  return new THREE.AnimationClip(name, src.duration, tracks);
}
