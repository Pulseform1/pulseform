// Lakes and rivers share one water line (y = 0): a large sheet that follows the player. Two scrolling ripple normal
// maps, sky reflections through the environment map, a sun glint, and more see-through when looking straight down.
import * as THREE from 'three';
import { patch, U } from './fx.js';
import { tiler } from './texgen.js';

function rippleNormals() {
  const T = tiler(83), W = 256, h = new Float32Array(W * W), px = new Uint8Array(W * W * 4);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) h[y * W + x] = T.fbm(x / W, y / W, 4, 4, .55) + .4 * Math.abs(T.noise(x / W * 16, y / W * 16, 16));
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const dx = (h[y * W + (x + 1) % W] - h[y * W + (x - 1 + W) % W]) * 6, dy = (h[((y + 1) % W) * W + x] - h[((y - 1 + W) % W) * W + x]) * 6, l = Math.hypot(dx, dy, 1), o = (y * W + x) * 4;
    px[o] = (-dx / l * .5 + .5) * 255; px[o + 1] = (-dy / l * .5 + .5) * 255; px[o + 2] = (1 / l * .5 + .5) * 255; px[o + 3] = 255;
  }
  const t = new THREE.DataTexture(px, W, W, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 8; t.needsUpdate = true;
  return t;
}

export class Water {
  constructor(scene) {
    const nm = rippleNormals();
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.035, 0.07, 0.065), roughness: 0.06, metalness: 0.0, transparent: true, opacity: 0.9, envMapIntensity: 1.25 });
    this.mat = patch(mat, 'water', sh => {
      Object.assign(sh.uniforms, { uRip: { value: nm }, uTime: U.uTime, uWind: U.uWind });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uRip; uniform float uTime; uniform vec4 uWind; varying vec3 vWP;')
        .replace('#include <normal_fragment_maps>', `{
  vec2 w = uWind.xy * ( 0.4 + uWind.z );
  vec2 p = vWP.xz;
  vec3 n1 = texture2D( uRip, p * 0.03 + w * uTime * 0.01 ).xyz * 2.0 - 1.0;
  vec3 n2 = texture2D( uRip, p * 0.075 * mat2( 0.8, 0.6, -0.6, 0.8 ) - w * uTime * 0.017 ).xyz * 2.0 - 1.0;
  vec3 n3 = texture2D( uRip, p * 0.013 + vec2( uTime * 0.004, 0.0 ) ).xyz * 2.0 - 1.0;
  float d = distance( vWP, cameraPosition ), k = ( 0.22 + 0.3 * uWind.z ) * mix( 1.0, 0.25, smoothstep( 20.0, 300.0, d ) );
  vec2 t = ( n1.xy + n2.xy * 0.7 + n3.xy * 0.8 ) * k;
  vec3 pn = normalize( vec3( t.x, 1.0, t.y ) );
  normal = normalize( ( viewMatrix * vec4( pn, 0.0 ) ).xyz );
}`)
        .replace('#include <opaque_fragment>', `{
  vec3 vd = normalize( cameraPosition - vWP );
  float fr = pow( 1.0 - max( vd.y, 0.0 ), 4.0 );
  diffuseColor.a = mix( 0.62, 0.97, fr );
}
#include <opaque_fragment>`);
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.mat);
    this.mesh.scale.set(9000, 1, 9000); this.mesh.renderOrder = 2; this.mesh.frustumCulled = false; this.mesh.receiveShadow = true;
    scene.add(this.mesh);
  }
  update(cam) { this.mesh.position.set(Math.round(cam.x / 64) * 64, 0, Math.round(cam.z / 64) * 64); }
}
